import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  activeUsesSupergravityLanding,
  cellsForPiece,
  dropDistance,
  settleSupergravityPiece,
  type Cell,
  type GameState,
  type PieceType,
  type SurvivalDebris,
} from '../core';

export interface PresentationPoint {
  x: number;
  y: number;
}

export type CellEdge = 'top' | 'right' | 'bottom' | 'left';

export interface ExposedCellEdges {
  cell: Cell;
  exposed: Record<CellEdge, boolean>;
}

export interface InternalCellSeam {
  orientation: 'horizontal' | 'vertical';
  start: Cell;
  end: Cell;
}

export type BoardShiftDirection = 'up' | 'down';

export const LINE_CLEAR_SWEEP_TICKS = 9;
export const REDUCED_LINE_CLEAR_TICKS = 6;
export const ORDINARY_LINE_CLEAR_TAIL_LIMIT = 4;

export type OrdinaryLineClearCount = 1 | 2 | 3 | 4;
export type OrdinaryLineClearProfileId =
  | 'precision-cut'
  | 'dual-resonance'
  | 'cascade-fracture'
  | 'tetramorph';

export interface OrdinaryLineClearProfile {
  count: OrdinaryLineClearCount;
  id: OrdinaryLineClearProfileId;
  normalTicks: number;
  reducedTicks: number;
  /** Renderer-owned residue after Core's fixed 200 ms line-clear commit. */
  postCommitTailMs: number;
  faceAlpha: number;
  fragmentCeiling: number;
  rowStagger: number;
}

export interface OrdinaryLineClearFragment {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  driftX: number;
  driftY: number;
}

const ORDINARY_LINE_CLEAR_PROFILES = Object.freeze({
  1: Object.freeze({
    count: 1,
    id: 'precision-cut',
    normalTicks: 9,
    reducedTicks: 6,
    postCommitTailMs: 0,
    faceAlpha: 0.15,
    fragmentCeiling: 8,
    rowStagger: 0,
  }),
  2: Object.freeze({
    count: 2,
    id: 'dual-resonance',
    normalTicks: 11,
    reducedTicks: 7,
    postCommitTailMs: 20,
    faceAlpha: 0.18,
    fragmentCeiling: 16,
    rowStagger: 0,
  }),
  3: Object.freeze({
    count: 3,
    id: 'cascade-fracture',
    normalTicks: 12,
    reducedTicks: 8,
    postCommitTailMs: 80,
    faceAlpha: 0.21,
    fragmentCeiling: 32,
    rowStagger: 0.1,
  }),
  4: Object.freeze({
    count: 4,
    id: 'tetramorph',
    normalTicks: 12,
    reducedTicks: 8,
    postCommitTailMs: 220,
    faceAlpha: 0.24,
    fragmentCeiling: 48,
    rowStagger: 0.07,
  }),
} satisfies Record<OrdinaryLineClearCount, OrdinaryLineClearProfile>);

/** Invalid or synthetic counts fail closed instead of borrowing another profile. */
export function ordinaryLineClearProfile(count: number): Readonly<OrdinaryLineClearProfile> | null {
  if (!Number.isInteger(count) || count < 1 || count > 4) return null;
  return ORDINARY_LINE_CLEAR_PROFILES[count as OrdinaryLineClearCount];
}

export function ordinaryLineClearPresentationProgress(
  phaseTicks: number,
  count: number,
  reducedMotion: boolean,
): number {
  const profile = ordinaryLineClearProfile(count);
  if (!profile) return 0;
  const duration = reducedMotion ? profile.reducedTicks : profile.normalTicks;
  return Math.max(0, Math.min(1, phaseTicks / duration));
}

/**
 * Three and four-line profiles resolve bottom-to-top. Reduced motion and Puzzle
 * pass rowOrder=0 so every row remains simultaneous and stationary.
 */
export function ordinaryLineClearCellProgress(
  phaseProgress: number,
  column: number,
  width: number,
  rowOrder: number,
  count: number,
  reducedMotion: boolean,
): number {
  const profile = ordinaryLineClearProfile(count);
  if (!profile) return 0;
  if (reducedMotion) return Math.max(0, Math.min(1, phaseProgress));
  const delay = Math.max(0, rowOrder) * profile.rowStagger;
  if (phaseProgress <= delay) return 0;
  const rowProgress = Math.min(1, (phaseProgress - delay) / Math.max(0.001, 1 - delay));
  return lineClearCellProgress(rowProgress, column, width);
}

/**
 * Stateless chip geometry derived only from canonical clear inputs. Returning
 * null is part of the bounded profile: a caller never needs an RNG or a pool.
 */
export function ordinaryLineClearFragment(
  count: number,
  row: number,
  column: number,
  index = 0,
): Readonly<OrdinaryLineClearFragment> | null {
  const profile = ordinaryLineClearProfile(count);
  if (!profile || index < 0 || !Number.isInteger(index)) return null;
  const ordinal = Math.abs(row * 31 + column * 17 + index * 13 + count * 7);
  const eligible = count === 1
    ? index === 0 && ordinal % 4 === 0
    : count === 2
      ? index === 0 && ordinal % 2 === 0
      : count === 3
        ? index === 0
        : index === 0 || (index === 1 && ordinal % 5 === 0);
  if (!eligible) return null;
  const parity = ordinal % 2 === 0 ? 1 : -1;
  return Object.freeze({
    offsetX: 0.18 + ((ordinal * 37) % 59) / 100,
    offsetY: 0.2 + ((ordinal * 23) % 47) / 100,
    width: 0.08 + (ordinal % 3) * 0.025,
    height: 0.035 + (ordinal % 2) * 0.018,
    driftX: parity * (0.08 + (ordinal % 4) * 0.025),
    driftY: -0.08 - (ordinal % 3) * 0.035,
  });
}

const EDGE_OFFSETS: ReadonlyArray<{ edge: CellEdge; dx: number; dy: number }> = [
  { edge: 'top', dx: 0, dy: -1 },
  { edge: 'right', dx: 1, dy: 0 },
  { edge: 'bottom', dx: 0, dy: 1 },
  { edge: 'left', dx: -1, dy: 0 },
];

const cellKey = (cell: Cell): string => `${cell.x},${cell.y}`;

/**
 * Projects the cells shown by the landing ghost. Supergravity first performs the
 * ordinary rigid hard drop, then settles only that piece's occupied columns against
 * the unchanged board, matching Core without mutating state or consuming RNG.
 */
export function projectedLandingCells(state: GameState): readonly Cell[] {
  if (!state.active) return [];
  const rigidLanding = cellsForPiece(state.active).map((cell) => ({
    x: cell.x,
    y: cell.y + dropDistance(state),
  }));
  const usesSupergravityLanding = activeUsesSupergravityLanding(state);
  if (!usesSupergravityLanding) return rigidLanding;
  if (rigidLanding.some(({ x, y }) => x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT)) {
    return rigidLanding;
  }

  return settleSupergravityPiece(state.board, rigidLanding, state.active.type).cells;
}

/** Derives the immutable one- or two-cell geometry of one Survival rock event. */
export function survivalDebrisCells(
  debris: Pick<SurvivalDebris, 'x' | 'y' | 'height'>,
): readonly Cell[] {
  return Object.freeze(Array.from(
    { length: debris.height },
    (_, offset) => ({ x: debris.x, y: debris.y + offset }),
  ));
}

const orderedCells = (cells: readonly Cell[]): Cell[] => (
  [...new Map(cells.map((cell) => [cellKey(cell), cell])).values()]
    .sort((a, b) => a.y - b.y || a.x - b.x)
);

/** Groups cells by presentation-only orthogonal adjacency; it never adds Core ownership. */
export function orthogonalCellComponents(cells: readonly Cell[]): Cell[][] {
  const remaining = new Map(orderedCells(cells).map((cell) => [cellKey(cell), cell]));
  const components: Cell[][] = [];

  while (remaining.size) {
    const seed = remaining.values().next().value as Cell;
    const queue = [seed];
    const component: Cell[] = [];
    remaining.delete(cellKey(seed));

    for (let index = 0; index < queue.length; index += 1) {
      const cell = queue[index]!;
      component.push(cell);
      for (const { dx, dy } of EDGE_OFFSETS) {
        const key = `${cell.x + dx},${cell.y + dy}`;
        const neighbour = remaining.get(key);
        if (!neighbour) continue;
        remaining.delete(key);
        queue.push(neighbour);
      }
    }

    components.push(component.sort((a, b) => a.y - b.y || a.x - b.x));
  }

  return components;
}

/** Returns only component-perimeter edges, suppressing every shared internal cell edge. */
export function exposedCellEdges(cells: readonly Cell[]): ExposedCellEdges[] {
  const ordered = orderedCells(cells);
  const occupied = new Set(ordered.map(cellKey));
  return ordered.map((cell) => ({
    cell,
    exposed: Object.fromEntries(EDGE_OFFSETS.map(({ edge, dx, dy }) => (
      [edge, !occupied.has(`${cell.x + dx},${cell.y + dy}`)]
    ))) as Record<CellEdge, boolean>,
  }));
}

/** Lists every shared unit boundary exactly once for presentation-only engraving. */
export function internalCellSeams(cells: readonly Cell[]): InternalCellSeam[] {
  const ordered = orderedCells(cells);
  const occupied = new Set(ordered.map(cellKey));
  const seams: InternalCellSeam[] = [];

  for (const cell of ordered) {
    if (occupied.has(`${cell.x + 1},${cell.y}`)) {
      seams.push({
        orientation: 'vertical',
        start: { x: cell.x + 1, y: cell.y },
        end: { x: cell.x + 1, y: cell.y + 1 },
      });
    }
    if (occupied.has(`${cell.x},${cell.y + 1}`)) {
      seams.push({
        orientation: 'horizontal',
        start: { x: cell.x, y: cell.y + 1 },
        end: { x: cell.x + 1, y: cell.y + 1 },
      });
    }
  }

  return seams;
}

export function approachPresentationPoint(
  current: PresentationPoint,
  target: PresentationPoint,
  deltaMs: number,
  settleMs: number,
): PresentationPoint {
  if (settleMs <= 0 || deltaMs <= 0) return deltaMs <= 0 ? current : target;
  const boundedDelta = Math.min(50, deltaMs);
  const factor = 1 - Math.exp((-3 * boundedDelta) / settleMs);
  const x = current.x + (target.x - current.x) * factor;
  const y = current.y + (target.y - current.y) * factor;
  return {
    x: Math.abs(target.x - x) < 0.001 ? target.x : x,
    y: Math.abs(target.y - y) < 0.001 ? target.y : y,
  };
}

/** Keeps renderer-only active-piece interpolation inside the visible well without touching Core coordinates. */
export function clampActivePresentationOffsetY(
  requestedOffsetY: number,
  visibleCells: readonly Cell[],
  unit: number,
  visibleHeight: number,
): number {
  if (!Number.isFinite(requestedOffsetY) || !visibleCells.length || unit <= 0 || visibleHeight <= 0) return 0;
  const minY = Math.min(...visibleCells.map((cell) => cell.y));
  const maxY = Math.max(...visibleCells.map((cell) => cell.y));
  const minimumOffsetY = -Math.max(0, minY) * unit;
  const maximumOffsetY = Math.max(0, visibleHeight - Math.min(visibleHeight - 1, maxY) - 1) * unit;
  const clampedOffsetY = Math.min(maximumOffsetY, Math.max(minimumOffsetY, requestedOffsetY));
  return clampedOffsetY === 0 ? 0 : clampedOffsetY;
}

/**
 * Returns only the active cells that have actually crossed the visible board mouth.
 * Core owns the row-by-row arrival cadence: a spawn row below the mouth is visible
 * first, then higher rows enter after the next gravity step. Renderer coordinates are
 * never shifted to make the whole tetromino appear early.
 */
export function activeCellsInsideVisibleRows(
  cells: readonly Cell[],
  visibleStartRow: number,
  visibleHeight: number,
): Cell[] {
  if (!cells.length || !Number.isInteger(visibleStartRow) || !Number.isInteger(visibleHeight) || visibleHeight <= 0) return [];
  const visibleEndRow = visibleStartRow + visibleHeight;
  return cells
    .filter((cell) => cell.y >= visibleStartRow && cell.y < visibleEndRow)
    .map((cell) => ({ ...cell }));
}

/** Verifies that a component-centered active-piece scale remains inside the visible well. */
export function activePresentationScaleFitsVisibleWell(
  visibleCells: readonly Cell[],
  offsetY: number,
  unit: number,
  visibleHeight: number,
  scale: number,
): boolean {
  if (!visibleCells.length || !Number.isFinite(offsetY) || unit <= 0 || visibleHeight <= 0 || scale < 1) return false;
  const minY = Math.min(...visibleCells.map((cell) => cell.y));
  const maxY = Math.max(...visibleCells.map((cell) => cell.y));
  const centerY = ((minY + maxY + 1) * unit) / 2;
  const scaledTop = centerY + (minY * unit - centerY) * scale + offsetY;
  const scaledBottom = centerY + ((maxY + 1) * unit - centerY) * scale + offsetY;
  return scaledTop > 0 && scaledBottom < visibleHeight * unit;
}

export function lineClearCellProgress(phaseProgress: number, column: number, width: number): number {
  if (width <= 1) return Math.max(0, Math.min(1, phaseProgress));
  const centerDistance = Math.abs(column - (width - 1) / 2) / ((width - 1) / 2);
  return Math.max(0, Math.min(1, phaseProgress * 1.5 - centerDistance * 0.5));
}

/**
 * Caps the visual seam at nine 60 Hz ticks (150 ms). Reduced motion retains a
 * simultaneous stationary seam for six ticks instead of deleting clear feedback.
 */
export function lineClearPresentationProgress(phaseTicks: number, reducedMotion: boolean): number {
  return ordinaryLineClearPresentationProgress(phaseTicks, 1, reducedMotion);
}

/** Briefly preserves the stack's previous visual position while Core applies a bedrock shift. */
export function boardShiftPresentationOffset(
  direction: BoardShiftDirection,
  elapsedMs: number,
  durationMs: number,
  unit: number,
): number {
  if (durationMs <= 0 || elapsedMs >= durationMs || unit <= 0) return 0;
  const progress = Math.max(0, Math.min(1, elapsedMs / durationMs));
  const remaining = Math.pow(1 - progress, 3);
  const distance = unit * 0.34 * remaining;
  return direction === 'up' ? distance : -distance;
}

/**
 * The queue remains the canonical source in every mode. Puzzle exposes the
 * first two authored inputs; Classic and Survival retain their focused single
 * preview. This presentation helper never consumes or mutates that queue.
 */
export function nextPreviewPieces(state: GameState): PieceType[] {
  if (state.status === 'ready' || state.status === 'finished' || state.status === 'game-over') return [];
  return state.mode === 'puzzle' ? state.queue.slice(0, 2) : state.queue.slice(0, 1);
}

/** Compatibility wrapper for integrations that only need the first preview. */
export function nextPreviewPiece(state: GameState): PieceType | null {
  return nextPreviewPieces(state)[0] ?? null;
}
