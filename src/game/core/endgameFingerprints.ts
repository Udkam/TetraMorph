import type { EndgameDefinition } from './endgames';

type FingerprintSource = Pick<
  EndgameDefinition,
  'id' | 'targetRows' | 'boardRows' | 'anchorCells' | 'setup'
>;

type CellKind = 'anchor' | 'ordinary';

interface FingerprintCell {
  kind: CellKind;
  x: number;
  y: number;
}

export interface EndgameTopologyProfile {
  ordinaryCells: number;
  anchorCells: number;
  connectedComponents: number;
  enclosedCavities: number;
  rowCounts: readonly number[];
  columnCounts: readonly number[];
}

export interface EndgameTopologyComparison {
  exactMatch: boolean;
  topologyMatch: boolean;
  nearTopology: boolean;
  minimumCellDelta: number;
  profileDelta: number;
}

export interface EndgameFingerprintPair {
  leftId: EndgameDefinition['id'];
  rightId: EndgameDefinition['id'];
  minimumCellDelta: number;
  profileDelta: number;
}

export interface EndgameFingerprintAudit {
  exactConflicts: readonly EndgameFingerprintPair[];
  topologyConflicts: readonly EndgameFingerprintPair[];
  nearCandidates: readonly EndgameFingerprintPair[];
}

function cellsFor(source: FingerprintSource): FingerprintCell[] {
  const cells: FingerprintCell[] = [];
  source.boardRows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== '.') cells.push({ kind: 'ordinary', x, y });
    });
  });
  for (const anchor of source.anchorCells) {
    cells.push({ kind: 'anchor', x: anchor.x, y: anchor.y });
  }
  return cells;
}

function compareCells(left: FingerprintCell, right: FingerprintCell): number {
  return left.y - right.y || left.x - right.x || left.kind.localeCompare(right.kind);
}

function serializeCells(cells: readonly FingerprintCell[]): string {
  return [...cells]
    .sort(compareCells)
    .map(({ kind, x, y }) => `${kind === 'anchor' ? 'A' : 'O'}:${x},${y}`)
    .join(';');
}

function normalizeCells(cells: readonly FingerprintCell[], reflected: boolean): FingerprintCell[] {
  if (cells.length === 0) return [];
  const xs = cells.map(({ x }) => x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return cells.map(({ kind, x, y }) => ({
    kind,
    x: reflected ? maxX - x : x - minX,
    y,
  }));
}

function topologyVariants(source: FingerprintSource): readonly [string, string] {
  const cells = cellsFor(source);
  return [
    serializeCells(normalizeCells(cells, false)),
    serializeCells(normalizeCells(cells, true)),
  ];
}

function setupGeometry(source: FingerprintSource): string {
  return source.setup.placements
    .map(({ type, rotation, x }) => `${type}${rotation}@${x}`)
    .join(';');
}

/**
 * Color-independent exact structure. Setup seed is intentionally excluded: the legal
 * placement geometry, rather than a randomizer implementation detail, owns the board.
 */
export function createEndgameExactFingerprint(source: FingerprintSource): string {
  return [
    'endgame-exact-v1',
    `target:${source.targetRows}`,
    `cells:${serializeCells(cellsFor(source))}`,
    `setup:${setupGeometry(source)}`,
  ].join('|');
}

/** Translation- and horizontal-reflection-normalized occupied topology. */
export function createEndgameTopologyFingerprint(source: FingerprintSource): string {
  const variants = topologyVariants(source);
  return `endgame-topology-v1|target:${source.targetRows}|cells:${[...variants].sort()[0] ?? ''}`;
}

function coordinateKey(x: number, y: number): string {
  return `${x},${y}`;
}

function connectedComponentCount(cells: readonly FingerprintCell[]): number {
  const occupied = new Set(cells.map(({ x, y }) => coordinateKey(x, y)));
  const visited = new Set<string>();
  let components = 0;

  for (const start of occupied) {
    if (visited.has(start)) continue;
    components += 1;
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) continue;
      const [xText, yText] = current.split(',');
      const x = Number(xText);
      const y = Number(yText);
      for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const next = coordinateKey(nextX, nextY);
        if (occupied.has(next) && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  return components;
}

function enclosedCavityCount(cells: readonly FingerprintCell[]): number {
  if (cells.length === 0) return 0;
  const minX = Math.min(...cells.map(({ x }) => x));
  const maxX = Math.max(...cells.map(({ x }) => x));
  const minY = Math.min(...cells.map(({ y }) => y));
  const maxY = Math.max(...cells.map(({ y }) => y));
  const occupied = new Set(cells.map(({ x, y }) => coordinateKey(x, y)));
  const exterior = new Set<string>();
  const queue: Array<readonly [number, number]> = [];

  for (let x = minX; x <= maxX; x += 1) {
    queue.push([x, minY], [x, maxY]);
  }
  for (let y = minY; y <= maxY; y += 1) {
    queue.push([minX, y], [maxX, y]);
  }

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const [x, y] = current;
    const key = coordinateKey(x, y);
    if (x < minX || x > maxX || y < minY || y > maxY || occupied.has(key) || exterior.has(key)) continue;
    exterior.add(key);
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }

  let cavities = 0;
  const cavityVisited = new Set<string>();
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const start = coordinateKey(x, y);
      if (occupied.has(start) || exterior.has(start) || cavityVisited.has(start)) continue;
      cavities += 1;
      const cavityQueue: Array<readonly [number, number]> = [[x, y]];
      cavityVisited.add(start);
      while (cavityQueue.length > 0) {
        const nextCell = cavityQueue.pop();
        if (!nextCell) continue;
        const [cellX, cellY] = nextCell;
        for (const [nextX, nextY] of [[cellX - 1, cellY], [cellX + 1, cellY], [cellX, cellY - 1], [cellX, cellY + 1]]) {
          const next = coordinateKey(nextX, nextY);
          if (
            nextX >= minX && nextX <= maxX && nextY >= minY && nextY <= maxY
            && !occupied.has(next) && !exterior.has(next) && !cavityVisited.has(next)
          ) {
            cavityVisited.add(next);
            cavityQueue.push([nextX, nextY]);
          }
        }
      }
    }
  }
  return cavities;
}

export function createEndgameTopologyProfile(source: FingerprintSource): EndgameTopologyProfile {
  const cells = cellsFor(source);
  const ordinaryCells = cells.filter(({ kind }) => kind === 'ordinary').length;
  const anchorCells = cells.length - ordinaryCells;
  const rowCounts = source.boardRows.map((row, y) => (
    [...row].filter((cell) => cell !== '.').length
      + source.anchorCells.filter((anchor) => anchor.y === y).length
  ));
  const columnCounts = Array.from({ length: source.boardRows[0]?.length ?? 0 }, (_, x) => (
    cells.filter((cell) => cell.x === x).length
  ));
  const firstOccupiedColumn = columnCounts.findIndex((count) => count > 0);
  let lastOccupiedColumn = -1;
  for (let index = columnCounts.length - 1; index >= 0; index -= 1) {
    if ((columnCounts[index] ?? 0) > 0) {
      lastOccupiedColumn = index;
      break;
    }
  }
  const trimmedColumns = firstOccupiedColumn < 0
    ? []
    : columnCounts.slice(firstOccupiedColumn, lastOccupiedColumn + 1);
  const reflectedColumns = [...trimmedColumns].reverse();
  const canonicalColumns = JSON.stringify(trimmedColumns) <= JSON.stringify(reflectedColumns)
    ? trimmedColumns
    : reflectedColumns;

  return {
    ordinaryCells,
    anchorCells,
    connectedComponents: connectedComponentCount(cells),
    enclosedCavities: enclosedCavityCount(cells),
    rowCounts,
    columnCounts: canonicalColumns,
  };
}

function symmetricDifference(left: string, right: string): number {
  const leftCells = new Set(left.split(';').filter(Boolean));
  const rightCells = new Set(right.split(';').filter(Boolean));
  let delta = 0;
  for (const cell of leftCells) if (!rightCells.has(cell)) delta += 1;
  for (const cell of rightCells) if (!leftCells.has(cell)) delta += 1;
  return delta;
}

function minimumCellDelta(left: FingerprintSource, right: FingerprintSource): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (const leftVariant of topologyVariants(left)) {
    for (const rightVariant of topologyVariants(right)) {
      minimum = Math.min(minimum, symmetricDifference(leftVariant, rightVariant));
    }
  }
  return Number.isFinite(minimum) ? minimum : 0;
}

function numericArrayDelta(left: readonly number[], right: readonly number[]): number {
  const length = Math.max(left.length, right.length);
  let delta = 0;
  for (let index = 0; index < length; index += 1) {
    delta += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
  }
  return delta;
}

function profileDelta(left: EndgameTopologyProfile, right: EndgameTopologyProfile): number {
  return Math.abs(left.ordinaryCells - right.ordinaryCells)
    + Math.abs(left.anchorCells - right.anchorCells) * 2
    + Math.abs(left.connectedComponents - right.connectedComponents) * 2
    + Math.abs(left.enclosedCavities - right.enclosedCavities) * 2
    + numericArrayDelta(left.rowCounts, right.rowCounts)
    + numericArrayDelta(left.columnCounts, right.columnCounts);
}

export function compareEndgameTopologies(
  left: FingerprintSource,
  right: FingerprintSource,
): EndgameTopologyComparison {
  const exactMatch = createEndgameExactFingerprint(left) === createEndgameExactFingerprint(right);
  const topologyMatch = createEndgameTopologyFingerprint(left) === createEndgameTopologyFingerprint(right);
  const cellDelta = minimumCellDelta(left, right);
  const profilesDelta = profileDelta(createEndgameTopologyProfile(left), createEndgameTopologyProfile(right));
  const nearTopology = !topologyMatch
    && left.targetRows === right.targetRows
    && left.anchorCells.length === right.anchorCells.length
    && (cellDelta <= 2 || profilesDelta <= 4);
  return {
    exactMatch,
    topologyMatch,
    nearTopology,
    minimumCellDelta: cellDelta,
    profileDelta: profilesDelta,
  };
}

export function auditEndgameFingerprints(
  definitions: readonly EndgameDefinition[],
): EndgameFingerprintAudit {
  const exactConflicts: EndgameFingerprintPair[] = [];
  const topologyConflicts: EndgameFingerprintPair[] = [];
  const nearCandidates: EndgameFingerprintPair[] = [];

  for (let leftIndex = 0; leftIndex < definitions.length; leftIndex += 1) {
    const left = definitions[leftIndex];
    if (!left) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < definitions.length; rightIndex += 1) {
      const right = definitions[rightIndex];
      if (!right) continue;
      const comparison = compareEndgameTopologies(left, right);
      const pair = {
        leftId: left.id,
        rightId: right.id,
        minimumCellDelta: comparison.minimumCellDelta,
        profileDelta: comparison.profileDelta,
      };
      if (comparison.exactMatch) exactConflicts.push(pair);
      else if (comparison.topologyMatch) topologyConflicts.push(pair);
      else if (comparison.nearTopology) nearCandidates.push(pair);
    }
  }

  return { exactConflicts, topologyConflicts, nearCandidates };
}
