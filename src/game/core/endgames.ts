import { BOARD_WIDTH, VISIBLE_HEIGHT, VISIBLE_START_ROW } from './constants';
import { canPlace, createBoard, fullRows, mergePiece } from './board';
import { cellsForPiece, createSpawnPiece } from './pieces';
import { createRandomizer, drawPiece } from './random';
import { ANCHOR_CELL, PIECE_TYPES, type Board, type Cell, type PieceType, type EndgameId, type Rotation } from './types';

export interface EndgameCell {
  x: number;
  /** Visible-board coordinate, where 0 is the top and 19 is the floor. */
  y: number;
  type: PieceType;
}

/** A visible, fixed-world-coordinate Endgame obstacle that never counts as a target. */
export interface EndgameAnchorCell {
  x: number;
  /** Visible-board coordinate, where 0 is the top and 19 is the floor. */
  y: number;
}

/** One legal hard-drop in the empty-board history that authored a Endgame start. */
export interface EndgameSetupPlacement {
  type: PieceType;
  rotation: Rotation;
  x: number;
}

/** Stable separate seven-bag source for a visible authored endgame. */
export interface EndgameSetupHistory {
  seed: number;
  placements: readonly EndgameSetupPlacement[];
}

export interface EndgameDefinition {
  id: EndgameId;
  name: string;
  /** Stable-ID-preserving teaching order used by the current gated curriculum. */
  difficulty: number;
  /** Explicit authored height of the contiguous original-target band at the floor. */
  targetRows: number;
  /** Stable level-owned seed for the normal deterministic gameplay seven-bag. */
  seed: number;
  /** Legal zero-clear setup replay that owns every ordinary original target. */
  setup: EndgameSetupHistory;
  /** Exactly twenty visible rows derived from `setup`; never a hand-excavated mask. */
  boardRows: readonly string[];
  /** Always empty: every authored target begins inside the visible well. */
  hiddenCells: readonly EndgameCell[];
  /** Zero to four fixed pegs inside the bottom twelve visible rows. */
  anchorCells: readonly EndgameAnchorCell[];
}

const EMPTY_ROW = '.'.repeat(BOARD_WIDTH);
const EMPTY_HIDDEN_CELLS: readonly EndgameCell[] = Object.freeze([]);
const EMPTY_ANCHOR_CELLS: readonly EndgameAnchorCell[] = Object.freeze([]);
const PIECE_TYPE_SET = new Set<string>(PIECE_TYPES);
const ENDGAME_TARGET_ROWS: Readonly<Record<EndgameId, number>> = Object.freeze({
  't3r-shaft-01': 3,
  't3r-shaft-02': 3,
  't3r-shaft-03': 3,
  't3r-shaft-04': 3,
  't3r-cascade-05': 3,
  't3r-cascade-06': 3,
  't5r-delta-07': 3,
  't5r-drift-08': 3,
  't5r-lattice-09': 3,
  't5r-rift-10': 3,
  't5r-prism-11': 4,
  't5r-current-12': 4,
  't5r-arc-13': 4,
  't5r-pulse-14': 4,
  't5r-horizon-15': 4,
  't6r-veil-16': 4,
  't6r-cairn-17': 4,
  't6r-terrace-18': 4,
  't6r-bastion-19': 4,
  't6r-keystone-20': 4,
  'tm-endgame-21': 5,
  'tm-endgame-22': 5,
  'tm-endgame-23': 5,
  'tm-endgame-24': 5,
  'tm-endgame-25': 5,
  'tm-endgame-26': 5,
  'tm-endgame-27': 5,
  'tm-endgame-28': 5,
  'tm-endgame-29': 5,
  'tm-endgame-30': 5,
  'tm-endgame-31': 6,
  'tm-endgame-32': 6,
  'tm-endgame-33': 6,
  'tm-endgame-34': 6,
  'tm-endgame-35': 6,
  'tm-endgame-36': 6,
  'tm-endgame-37': 6,
  'tm-endgame-38': 6,
  'tm-endgame-39': 6,
  'tm-endgame-40': 6,
  'tm-endgame-41': 7,
  'tm-endgame-42': 7,
  'tm-endgame-43': 7,
  'tm-endgame-44': 7,
  'tm-endgame-45': 7,
  'tm-endgame-46': 6,
  'tm-endgame-47': 7,
  'tm-endgame-48': 6,
  'tm-endgame-49': 6,
  'tm-endgame-50': 6,
});

function setup(seed: number, placements: readonly EndgameSetupPlacement[]): EndgameSetupHistory {
  return Object.freeze({
    seed,
    placements: Object.freeze(placements.map((placement) => Object.freeze({ ...placement }))),
  });
}

function anchors(cells: readonly EndgameAnchorCell[] = EMPTY_ANCHOR_CELLS): readonly EndgameAnchorCell[] {
  return Object.freeze(cells.map((cell) => Object.freeze({ ...cell })));
}

function isRotation(value: number): value is Rotation {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function coordinateKey(x: number, y: number): string {
  return `${x}:${y}`;
}

/**
 * Replays one authoring history without the engine or renderer. This intentionally uses
 * the same bag, spawn, collision, hard-drop, and merge primitives as normal play while
 * rejecting setup clears, hidden cells, malformed rotations, and merged same-type owners.
 */
export function replayEndgameSetup(history: EndgameSetupHistory): Board {
  if (!Number.isSafeInteger(history.seed) || history.seed <= 0 || history.seed > 0xffff_ffff) {
    throw new Error('Endgame setup history needs a nonzero uint32 seed.');
  }
  if (!Array.isArray(history.placements) || history.placements.length < 5 || history.placements.length > 20) {
    throw new Error('Endgame setup history must contain five through twenty legal drops.');
  }

  let board = createBoard();
  let randomizer = createRandomizer(history.seed);
  const owners = new Map<string, string>();
  for (const [index, placement] of history.placements.entries()) {
    if (!PIECE_TYPE_SET.has(placement.type) || !isRotation(placement.rotation) || !Number.isSafeInteger(placement.x)) {
      throw new Error(`Endgame setup placement ${index + 1} is malformed.`);
    }
    const draw = drawPiece(randomizer);
    randomizer = draw.randomizer;
    if (draw.piece !== placement.type) {
      throw new Error(`Endgame setup placement ${index + 1} does not match its seeded seven-bag draw.`);
    }

    let piece = { ...createSpawnPiece(placement.type), rotation: placement.rotation, x: placement.x };
    if (!canPlace(board, piece)) throw new Error(`Endgame setup placement ${index + 1} cannot spawn legally.`);
    while (canPlace(board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 };

    const owner = `${placement.type}:${index}`;
    const cells = [...new Set(cellsForPiece(piece).map((cell) => coordinateKey(cell.x, cell.y)))];
    if (cells.length !== 4) throw new Error(`Endgame setup placement ${index + 1} must own exactly four cells.`);
    for (const key of cells) {
      const [xText, yText] = key.split(':');
      const x = Number(xText);
      const y = Number(yText);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const neighbor = owners.get(coordinateKey(x + dx, y + dy));
        if (neighbor && neighbor !== owner && neighbor.startsWith(`${placement.type}:`)) {
          throw new Error(`Endgame setup placement ${index + 1} merges two same-type source tetrominoes.`);
        }
      }
      owners.set(key, owner);
    }
    board = mergePiece(board, piece);
    if (fullRows(board).length > 0) throw new Error(`Endgame setup placement ${index + 1} clears a row.`);
  }

  if (board.slice(0, VISIBLE_START_ROW).some((row) => row.some((cell) => cell !== null))) {
    throw new Error('Endgame setup may not leave cells in the hidden buffer.');
  }
  return board;
}

function rowsForSetup(history: EndgameSetupHistory): readonly string[] {
  const board = replayEndgameSetup(history);
  return Object.freeze(board.slice(VISIBLE_START_ROW).map((row) => row.map((cell) => cell ?? '.').join('')));
}

function endgame(
  id: EndgameId,
  name: string,
  difficulty: number,
  seed: number,
  history: EndgameSetupHistory,
  anchorCells: readonly EndgameAnchorCell[] = EMPTY_ANCHOR_CELLS,
): EndgameDefinition {
  return Object.freeze({
    id,
    name,
    difficulty,
    targetRows: ENDGAME_TARGET_ROWS[id],
    seed,
    setup: history,
    boardRows: rowsForSetup(history),
    hiddenCells: EMPTY_HIDDEN_CELLS,
    anchorCells: anchors(anchorCells),
  });
}

/**
 * T13's all-open legal endgame workshop. Each board below is derived at module load
 * from its own deterministic setup history; gameplay has a separate stable seed and
 * continues normally after any non-winning lock.
 */
const ENDGAME_LIBRARY: readonly EndgameDefinition[] = Object.freeze([
  // 01–06: three rows — isolate one transferable idea before combining them.
  endgame('t3r-shaft-01', '补行', 1, 1073741827, setup(5200002, [{ type: 'L', rotation: 0, x: 2 }, { type: 'T', rotation: 0, x: 7 }, { type: 'O', rotation: 3, x: 0 }, { type: 'J', rotation: 0, x: 5 }, { type: 'S', rotation: 2, x: 2 }, { type: 'I', rotation: 2, x: 6 }])),
  endgame('t3r-shaft-02', '留井', 2, 1618033988, setup(5200006, [{ type: 'O', rotation: 3, x: 8 }, { type: 'T', rotation: 0, x: 4 }, { type: 'S', rotation: 1, x: -1 }, { type: 'L', rotation: 3, x: 1 }, { type: 'J', rotation: 1, x: 2 }, { type: 'Z', rotation: 0, x: 5 }])),
  endgame('t3r-shaft-03', '托台', 3, 994121443, setup(5200007, [{ type: 'T', rotation: 0, x: 1 }, { type: 'Z', rotation: 0, x: 3 }, { type: 'O', rotation: 3, x: 8 }, { type: 'J', rotation: 1, x: -1 }, { type: 'I', rotation: 0, x: 2 }, { type: 'S', rotation: 1, x: 5 }])),
  endgame('t3r-shaft-04', '后手', 5, 2309737967, setup(5200006, [{ type: 'O', rotation: 2, x: 1 }, { type: 'T', rotation: 0, x: 4 }, { type: 'S', rotation: 0, x: 7 }, { type: 'L', rotation: 2, x: 0 }, { type: 'J', rotation: 1, x: 2 }, { type: 'Z', rotation: 0, x: 5 }])),
  endgame('t3r-cascade-05', '避坑', 6, 3141592653, setup(5200005, [{ type: 'L', rotation: 0, x: 3 }, { type: 'S', rotation: 2, x: 7 }, { type: 'Z', rotation: 2, x: 5 }, { type: 'J', rotation: 0, x: 0 }, { type: 'T', rotation: 2, x: 0 }, { type: 'O', rotation: 3, x: 3 }])),

  // 07–10: combine the opening ideas, then introduce one immutable edge anchor.
  endgame('t3r-cascade-06', '留口', 4, 1717986918, setup(5200003, [{ type: 'Z', rotation: 2, x: 5 }, { type: 'O', rotation: 1, x: 0 }, { type: 'T', rotation: 0, x: 2 }, { type: 'L', rotation: 2, x: 4 }, { type: 'I', rotation: 0, x: 0 }, { type: 'J', rotation: 2, x: 7 }])),
  endgame('t5r-delta-07', '归心', 7, 452198731, setup(5200002, [{ type: 'L', rotation: 0, x: 5 }, { type: 'T', rotation: 2, x: 3 }, { type: 'O', rotation: 0, x: 8 }, { type: 'J', rotation: 2, x: 4 }, { type: 'S', rotation: 2, x: 0 }, { type: 'I', rotation: 0, x: 0 }])),
  endgame('t5r-drift-08', '侧隙', 10, 2004318071, setup(5200002, [{ type: 'L', rotation: 0, x: 2 }, { type: 'T', rotation: 0, x: 7 }, { type: 'O', rotation: 3, x: 0 }, { type: 'J', rotation: 0, x: 5 }, { type: 'S', rotation: 2, x: 2 }, { type: 'I', rotation: 2, x: 6 }]), [{ x: 1, y: 15 }]),
  endgame('t5r-lattice-09', '分流', 8, 2718281828, setup(5200011, [{ type: 'T', rotation: 0, x: 7 }, { type: 'S', rotation: 3, x: 4 }, { type: 'L', rotation: 3, x: 5 }, { type: 'O', rotation: 3, x: 0 }, { type: 'Z', rotation: 3, x: 2 }, { type: 'J', rotation: 2, x: 7 }])),
  endgame('t5r-rift-10', '择门', 9, 1311768467, setup(5200007, [{ type: 'T', rotation: 0, x: 4 }, { type: 'Z', rotation: 2, x: 1 }, { type: 'O', rotation: 1, x: 8 }, { type: 'J', rotation: 1, x: -1 }, { type: 'I', rotation: 2, x: 2 }, { type: 'S', rotation: 3, x: 6 }])),

  // 11–15: four rows — introduce platforms, wells, overhangs, stairs, and paired lanes.
  endgame('t5r-prism-11', '侧门', 14, 2813, setup(156544, [{ type: 'I', rotation: 0, x: 0 }, { type: 'J', rotation: 0, x: 1 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'T', rotation: 0, x: 2 }, { type: 'O', rotation: 0, x: 7 }, { type: 'L', rotation: 2, x: 6 }])),
  endgame('t5r-current-12', '留槽', 13, 3471557507, setup(156544, [{ type: 'I', rotation: 0, x: 1 }, { type: 'J', rotation: 0, x: 1 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'T', rotation: 0, x: 3 }, { type: 'O', rotation: 0, x: 7 }, { type: 'L', rotation: 2, x: 6 }])),
  endgame('t5r-arc-13', '塔基', 12, 3177056438, setup(156544, [{ type: 'I', rotation: 0, x: 1 }, { type: 'J', rotation: 0, x: 1 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'T', rotation: 0, x: 2 }, { type: 'O', rotation: 0, x: 7 }, { type: 'L', rotation: 2, x: 6 }])),
  endgame('t5r-pulse-14', '平台', 11, 3735928559, setup(3141593013, [{ type: 'O', rotation: 2, x: 5 }, { type: 'L', rotation: 3, x: 6 }, { type: 'Z', rotation: 1, x: 7 }, { type: 'J', rotation: 0, x: 0 }, { type: 'S', rotation: 0, x: 3 }, { type: 'T', rotation: 2, x: 7 }, { type: 'I', rotation: 2, x: 3 }]), [{ x: 5, y: 15 }]),
  endgame('t5r-horizon-15', '双井', 15, 324508639, setup(2718282021, [{ type: 'Z', rotation: 2, x: 7 }, { type: 'I', rotation: 2, x: 0 }, { type: 'O', rotation: 2, x: 5 }, { type: 'S', rotation: 1, x: 2 }, { type: 'T', rotation: 2, x: 0 }, { type: 'J', rotation: 2, x: 2 }, { type: 'L', rotation: 2, x: 5 }, { type: 'S', rotation: 1, x: 7 }])),

  // 16–20: four rows — add recovery, shelves, bridges, and two sparse headroom pegs.
  endgame('t6r-veil-16', '交汇', 20, 5783321, setup(3141593028, [{ type: 'I', rotation: 0, x: 1 }, { type: 'L', rotation: 2, x: 0 }, { type: 'S', rotation: 2, x: 5 }, { type: 'T', rotation: 3, x: 8 }, { type: 'O', rotation: 1, x: 3 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'J', rotation: 2, x: 6 }])),
  endgame('t6r-cairn-17', '回填', 16, 1832906719, setup(3141593017, [{ type: 'S', rotation: 3, x: 5 }, { type: 'T', rotation: 0, x: 1 }, { type: 'Z', rotation: 0, x: 2 }, { type: 'J', rotation: 0, x: 7 }, { type: 'O', rotation: 0, x: 0 }, { type: 'I', rotation: 0, x: 0 }, { type: 'L', rotation: 2, x: 4 }]), [{ x: 1, y: 15 }]),
  endgame('t6r-terrace-18', '侧台', 17, 2596069104, setup(3141593031, [{ type: 'L', rotation: 0, x: 4 }, { type: 'Z', rotation: 2, x: 0 }, { type: 'T', rotation: 2, x: 2 }, { type: 'S', rotation: 0, x: 7 }, { type: 'I', rotation: 0, x: 3 }, { type: 'O', rotation: 0, x: 8 }, { type: 'J', rotation: 2, x: 5 }])),
  endgame('t6r-bastion-19', '窄门', 19, 521288629, setup(2718282009, [{ type: 'O', rotation: 3, x: 8 }, { type: 'J', rotation: 0, x: 0 }, { type: 'Z', rotation: 1, x: 5 }, { type: 'S', rotation: 0, x: 3 }, { type: 'L', rotation: 2, x: 3 }, { type: 'T', rotation: 2, x: 7 }, { type: 'I', rotation: 0, x: 3 }, { type: 'Z', rotation: 1, x: 0 }])),
  endgame('t6r-keystone-20', '横桥', 18, 19088743, setup(2718282013, [{ type: 'I', rotation: 0, x: 0 }, { type: 'J', rotation: 0, x: 4 }, { type: 'L', rotation: 2, x: 3 }, { type: 'S', rotation: 1, x: 5 }, { type: 'Z', rotation: 1, x: 7 }, { type: 'T', rotation: 2, x: 7 }, { type: 'O', rotation: 3, x: 1 }, { type: 'I', rotation: 0, x: 0 }])),

  // 21–30: five rows — combine delayed wells, layered recovery, and local route choices.
  endgame('tm-endgame-21', '门柱', 21, 2532094312, setup(1618034012, [{ type: 'O', rotation: 1, x: 6 }, { type: 'T', rotation: 1, x: 7 }, { type: 'J', rotation: 0, x: 0 }, { type: 'S', rotation: 2, x: 3 }, { type: 'Z', rotation: 0, x: 0 }, { type: 'I', rotation: 2, x: 4 }, { type: 'L', rotation: 2, x: 2 }, { type: 'T', rotation: 2, x: 0 }, { type: 'S', rotation: 2, x: 5 }, { type: 'L', rotation: 3, x: 8 }])),
  endgame('tm-endgame-22', '回廊', 22, 1414213569, setup(1414213568, [{ type: 'S', rotation: 2, x: 7 }, { type: 'I', rotation: 2, x: 1 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'L', rotation: 2, x: 2 }, { type: 'J', rotation: 1, x: -1 }, { type: 'T', rotation: 2, x: 5 }, { type: 'O', rotation: 1, x: 0 }]), [{ x: 0, y: 14 }]),
  endgame('tm-endgame-23', '中柱', 23, 1878816283, setup(1618033988, [{ type: 'T', rotation: 0, x: 7 }, { type: 'I', rotation: 2, x: 3 }, { type: 'J', rotation: 2, x: 7 }, { type: 'L', rotation: 2, x: 2 }, { type: 'S', rotation: 3, x: 0 }, { type: 'O', rotation: 0, x: 5 }, { type: 'Z', rotation: 0, x: 0 }, { type: 'S', rotation: 0, x: 2 }, { type: 'Z', rotation: 0, x: 5 }, { type: 'T', rotation: 2, x: 7 }])),
  endgame('tm-endgame-24', '斜坡', 24, 3817237208, setup(1618034008, [{ type: 'J', rotation: 2, x: 0 }, { type: 'O', rotation: 2, x: 3 }, { type: 'T', rotation: 0, x: 7 }, { type: 'S', rotation: 0, x: 5 }, { type: 'I', rotation: 0, x: 3 }, { type: 'Z', rotation: 0, x: 6 }, { type: 'L', rotation: 3, x: 8 }, { type: 'L', rotation: 3, x: 0 }, { type: 'T', rotation: 2, x: 4 }, { type: 'O', rotation: 2, x: 2 }])),
  endgame('tm-endgame-25', '夹井', 25, 798487160, setup(1618033999, [{ type: 'L', rotation: 0, x: 0 }, { type: 'O', rotation: 3, x: 3 }, { type: 'T', rotation: 3, x: 8 }, { type: 'J', rotation: 1, x: 6 }, { type: 'S', rotation: 3, x: 5 }, { type: 'I', rotation: 0, x: 6 }, { type: 'Z', rotation: 0, x: 2 }, { type: 'L', rotation: 2, x: 4 }, { type: 'S', rotation: 1, x: -1 }, { type: 'I', rotation: 2, x: 0 }])),
  endgame('tm-endgame-26', '错台', 26, 3939223572, setup(1414213589, [{ type: 'S', rotation: 0, x: 1 }, { type: 'T', rotation: 2, x: 0 }, { type: 'O', rotation: 0, x: 4 }, { type: 'I', rotation: 0, x: 6 }, { type: 'J', rotation: 2, x: 4 }, { type: 'L', rotation: 2, x: 3 }, { type: 'Z', rotation: 2, x: 0 }]), [{ x: 1, y: 14 }]),
  endgame('tm-endgame-27', '缓坡', 27, 1414213588, setup(1414213585, [{ type: 'J', rotation: 0, x: 7 }, { type: 'L', rotation: 0, x: 4 }, { type: 'O', rotation: 2, x: 8 }, { type: 'Z', rotation: 0, x: 0 }, { type: 'I', rotation: 0, x: 4 }, { type: 'T', rotation: 3, x: 2 }, { type: 'S', rotation: 0, x: 7 }]), [{ x: 8, y: 14 }]),
  endgame('tm-endgame-28', '侧桥', 28, 3335763460, setup(1618034014, [{ type: 'J', rotation: 0, x: 4 }, { type: 'L', rotation: 2, x: 7 }, { type: 'I', rotation: 2, x: 0 }, { type: 'O', rotation: 2, x: 2 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'T', rotation: 2, x: 5 }, { type: 'S', rotation: 2, x: 0 }, { type: 'O', rotation: 3, x: 8 }, { type: 'I', rotation: 2, x: 3 }, { type: 'L', rotation: 2, x: 0 }])),
  endgame('tm-endgame-29', '双层', 29, 3941154800, setup(1618034019, [{ type: 'J', rotation: 0, x: 7 }, { type: 'S', rotation: 0, x: 2 }, { type: 'Z', rotation: 1, x: 4 }, { type: 'T', rotation: 2, x: 7 }, { type: 'O', rotation: 1, x: 0 }, { type: 'I', rotation: 0, x: 6 }, { type: 'L', rotation: 3, x: 1 }, { type: 'O', rotation: 1, x: 3 }, { type: 'I', rotation: 0, x: 0 }, { type: 'T', rotation: 2, x: 4 }])),
  endgame('tm-endgame-30', '断台', 30, 4117941110, setup(1618034013, [{ type: 'T', rotation: 0, x: 6 }, { type: 'S', rotation: 3, x: 4 }, { type: 'Z', rotation: 0, x: 7 }, { type: 'I', rotation: 2, x: 0 }, { type: 'L', rotation: 0, x: 1 }, { type: 'O', rotation: 2, x: 5 }, { type: 'J', rotation: 2, x: 7 }, { type: 'S', rotation: 0, x: 0 }, { type: 'I', rotation: 2, x: 0 }, { type: 'L', rotation: 2, x: 4 }])),

  // 31–40: six rows — combine wells, bridges, recovery lanes, and sparse headroom gates.
  endgame('tm-endgame-31', '曲井', 31, 2654435761, setup(1732050808, [{ type: 'I', rotation: 2, x: 5 }, { type: 'Z', rotation: 3, x: 1 }, { type: 'T', rotation: 2, x: 3 }, { type: 'J', rotation: 1, x: -1 }, { type: 'O', rotation: 0, x: 6 }, { type: 'L', rotation: 3, x: 8 }, { type: 'S', rotation: 2, x: 7 }, { type: 'S', rotation: 3, x: 4 }, { type: 'L', rotation: 0, x: 1 }, { type: 'T', rotation: 2, x: 5 }, { type: 'J', rotation: 2, x: 0 }, { type: 'I', rotation: 0, x: 3 }])),
  endgame('tm-endgame-32', '左闸', 32, 358294691, setup(2236068021, [{ type: 'J', rotation: 0, x: 6 }, { type: 'I', rotation: 0, x: 0 }, { type: 'L', rotation: 0, x: 7 }, { type: 'O', rotation: 1, x: 0 }, { type: 'T', rotation: 2, x: 3 }, { type: 'Z', rotation: 0, x: 6 }, { type: 'S', rotation: 2, x: 3 }, { type: 'I', rotation: 0, x: 0 }, { type: 'O', rotation: 3, x: 0 }]), [{ x: 0, y: 13 }]),
  endgame('tm-endgame-33', '错桥', 33, 3428279691, setup(1732050845, [{ type: 'O', rotation: 3, x: 8 }, { type: 'T', rotation: 0, x: 0 }, { type: 'J', rotation: 2, x: 2 }, { type: 'S', rotation: 2, x: 5 }, { type: 'L', rotation: 2, x: 0 }, { type: 'I', rotation: 2, x: 4 }, { type: 'Z', rotation: 1, x: 7 }, { type: 'Z', rotation: 0, x: 0 }, { type: 'L', rotation: 2, x: 6 }, { type: 'O', rotation: 0, x: 3 }, { type: 'T', rotation: 2, x: 4 }, { type: 'I', rotation: 0, x: 0 }])),
  endgame('tm-endgame-34', '阶井', 34, 1831565813, setup(1732050849, [{ type: 'L', rotation: 0, x: 0 }, { type: 'T', rotation: 2, x: 7 }, { type: 'I', rotation: 2, x: 3 }, { type: 'S', rotation: 0, x: 5 }, { type: 'J', rotation: 2, x: 2 }, { type: 'O', rotation: 2, x: 8 }, { type: 'Z', rotation: 3, x: 0 }, { type: 'L', rotation: 2, x: 0 }, { type: 'T', rotation: 2, x: 6 }, { type: 'Z', rotation: 0, x: 3 }, { type: 'J', rotation: 2, x: 7 }, { type: 'I', rotation: 2, x: 3 }])),
  endgame('tm-endgame-35', '悬台', 35, 374761393, setup(1732050832, [{ type: 'I', rotation: 2, x: 5 }, { type: 'S', rotation: 0, x: 2 }, { type: 'L', rotation: 1, x: -1 }, { type: 'T', rotation: 2, x: 1 }, { type: 'O', rotation: 3, x: 5 }, { type: 'J', rotation: 2, x: 7 }, { type: 'Z', rotation: 2, x: 7 }, { type: 'S', rotation: 0, x: 4 }, { type: 'J', rotation: 2, x: 7 }, { type: 'L', rotation: 0, x: 1 }, { type: 'T', rotation: 2, x: 0 }, { type: 'I', rotation: 0, x: 3 }])),
  endgame('tm-endgame-36', '斜阶', 36, 197830471, setup(142658, [{ type: 'T', rotation: 0, x: 1 }, { type: 'S', rotation: 1, x: 1 }, { type: 'Z', rotation: 1, x: -1 }, { type: 'I', rotation: 1, x: -2 }, { type: 'L', rotation: 1, x: 3 }, { type: 'J', rotation: 3, x: 6 }, { type: 'O', rotation: 0, x: 5 }, { type: 'T', rotation: 1, x: 0 }, { type: 'J', rotation: 0, x: 3 }])),
  endgame('tm-endgame-37', '双廊', 37, 668265263, setup(1732050830, [{ type: 'S', rotation: 3, x: 7 }, { type: 'T', rotation: 0, x: 0 }, { type: 'O', rotation: 3, x: 5 }, { type: 'L', rotation: 3, x: 8 }, { type: 'J', rotation: 2, x: 2 }, { type: 'I', rotation: 0, x: 0 }, { type: 'Z', rotation: 0, x: 0 }, { type: 'T', rotation: 2, x: 3 }, { type: 'J', rotation: 0, x: 6 }, { type: 'S', rotation: 2, x: 2 }, { type: 'L', rotation: 0, x: 7 }, { type: 'I', rotation: 2, x: 5 }])),
  endgame('tm-endgame-38', '层塔', 38, 1431374977, setup(156544, [{ type: 'I', rotation: 0, x: 1 }, { type: 'J', rotation: 0, x: 1 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'T', rotation: 0, x: 2 }, { type: 'O', rotation: 0, x: 7 }, { type: 'L', rotation: 2, x: 6 }, { type: 'S', rotation: 1, x: 3 }, { type: 'Z', rotation: 1, x: 1 }, { type: 'O', rotation: 0, x: 6 }, { type: 'T', rotation: 2, x: 4 }])),
  endgame('tm-endgame-39', '边塔', 39, 41326521, setup(3236068023, [{ type: 'J', rotation: 0, x: 0 }, { type: 'O', rotation: 3, x: 8 }, { type: 'L', rotation: 0, x: 5 }, { type: 'T', rotation: 2, x: 0 }, { type: 'S', rotation: 1, x: 2 }, { type: 'Z', rotation: 1, x: 4 }, { type: 'I', rotation: 2, x: 2 }, { type: 'J', rotation: 2, x: 7 }, { type: 'O', rotation: 2, x: 8 }]), [{ x: 9, y: 13 }]),
  endgame('tm-endgame-40', '折桥', 40, 3266489917, setup(1732050833, [{ type: 'J', rotation: 0, x: 3 }, { type: 'L', rotation: 2, x: 0 }, { type: 'I', rotation: 2, x: 6 }, { type: 'O', rotation: 3, x: 8 }, { type: 'S', rotation: 0, x: 5 }, { type: 'T', rotation: 2, x: 3 }, { type: 'Z', rotation: 0, x: 5 }, { type: 'J', rotation: 2, x: 7 }, { type: 'Z', rotation: 2, x: 0 }, { type: 'S', rotation: 0, x: 2 }, { type: 'L', rotation: 2, x: 0 }, { type: 'I', rotation: 2, x: 3 }])),

  // 41–50: seven rows — synthesize layered wells, channels, and recovery space with multiple routes.
  endgame('tm-endgame-41', '横沟', 41, 2007309471, setup(4101007, [{ type: 'O', rotation: 2, x: 1 }, { type: 'I', rotation: 0, x: 4 }, { type: 'J', rotation: 1, x: -1 }, { type: 'Z', rotation: 3, x: 8 }, { type: 'L', rotation: 0, x: 3 }, { type: 'T', rotation: 2, x: 6 }, { type: 'S', rotation: 2, x: 3 }, { type: 'T', rotation: 2, x: 2 }, { type: 'O', rotation: 2, x: 0 }, { type: 'S', rotation: 2, x: 7 }, { type: 'Z', rotation: 0, x: 4 }, { type: 'I', rotation: 2, x: 6 }, { type: 'J', rotation: 2, x: 0 }, { type: 'L', rotation: 2, x: 3 }])),
  endgame('tm-endgame-42', '中阶', 42, 1534458359, setup(4101010, [{ type: 'J', rotation: 0, x: 3 }, { type: 'O', rotation: 0, x: 8 }, { type: 'S', rotation: 1, x: -1 }, { type: 'L', rotation: 3, x: 1 }, { type: 'Z', rotation: 3, x: 6 }, { type: 'T', rotation: 2, x: 4 }, { type: 'I', rotation: 2, x: 0 }, { type: 'O', rotation: 0, x: 7 }, { type: 'S', rotation: 2, x: 4 }, { type: 'J', rotation: 2, x: 7 }, { type: 'L', rotation: 0, x: 2 }, { type: 'T', rotation: 2, x: 0 }, { type: 'Z', rotation: 2, x: 4 }, { type: 'I', rotation: 0, x: 0 }])),
  endgame('tm-endgame-43', '分廊', 43, 1786354125, setup(4101023, [{ type: 'J', rotation: 0, x: 4 }, { type: 'L', rotation: 0, x: 7 }, { type: 'T', rotation: 2, x: 4 }, { type: 'O', rotation: 1, x: 7 }, { type: 'Z', rotation: 1, x: 1 }, { type: 'S', rotation: 3, x: 0 }, { type: 'I', rotation: 0, x: 6 }, { type: 'J', rotation: 2, x: 0 }, { type: 'S', rotation: 0, x: 7 }, { type: 'O', rotation: 0, x: 0 }, { type: 'I', rotation: 0, x: 2 }, { type: 'Z', rotation: 1, x: 5 }, { type: 'T', rotation: 2, x: 1 }, { type: 'L', rotation: 2, x: 4 }])),
  endgame('tm-endgame-44', '双塔', 44, 2076461737, setup(4101018, [{ type: 'S', rotation: 0, x: 2 }, { type: 'O', rotation: 2, x: 0 }, { type: 'I', rotation: 2, x: 0 }, { type: 'J', rotation: 3, x: 8 }, { type: 'L', rotation: 3, x: 4 }, { type: 'T', rotation: 0, x: 6 }, { type: 'Z', rotation: 1, x: 7 }, { type: 'Z', rotation: 0, x: 0 }, { type: 'S', rotation: 0, x: 6 }, { type: 'T', rotation: 2, x: 4 }, { type: 'L', rotation: 3, x: 2 }, { type: 'I', rotation: 0, x: 4 }, { type: 'J', rotation: 2, x: 7 }, { type: 'O', rotation: 0, x: 0 }])),
  endgame('tm-endgame-45', '斜廊', 45, 3438853325, setup(4101005, [{ type: 'J', rotation: 0, x: 7 }, { type: 'T', rotation: 0, x: 3 }, { type: 'S', rotation: 0, x: 2 }, { type: 'O', rotation: 0, x: 8 }, { type: 'L', rotation: 3, x: 5 }, { type: 'Z', rotation: 3, x: 0 }, { type: 'I', rotation: 2, x: 4 }, { type: 'O', rotation: 2, x: 0 }, { type: 'T', rotation: 2, x: 7 }, { type: 'I', rotation: 0, x: 6 }, { type: 'J', rotation: 1, x: 1 }, { type: 'Z', rotation: 3, x: 4 }, { type: 'S', rotation: 0, x: 2 }, { type: 'L', rotation: 2, x: 0 }])),
  endgame('tm-endgame-46', '边井', 46, 746220617, setup(4101001, [{ type: 'S', rotation: 0, x: 2 }, { type: 'J', rotation: 0, x: 7 }, { type: 'T', rotation: 1, x: 4 }, { type: 'O', rotation: 2, x: 0 }, { type: 'L', rotation: 2, x: 2 }, { type: 'Z', rotation: 1, x: 7 }, { type: 'I', rotation: 2, x: 5 }, { type: 'S', rotation: 2, x: 3 }, { type: 'L', rotation: 2, x: 1 }, { type: 'O', rotation: 0, x: 8 }])),
  endgame('tm-endgame-47', '悬廊', 47, 3709961825, setup(373965, [{ type: 'O', rotation: 0, x: 0 }, { type: 'L', rotation: 3, x: 1 }, { type: 'T', rotation: 1, x: -1 }, { type: 'J', rotation: 0, x: 7 }, { type: 'Z', rotation: 0, x: 7 }, { type: 'S', rotation: 1, x: 6 }, { type: 'I', rotation: 1, x: 7 }, { type: 'J', rotation: 3, x: 1 }, { type: 'O', rotation: 0, x: 0 }, { type: 'T', rotation: 2, x: 7 }])),
  endgame('tm-endgame-48', '断槽', 48, 2845894523, setup(4101024, [{ type: 'L', rotation: 0, x: 0 }, { type: 'J', rotation: 0, x: 6 }, { type: 'T', rotation: 2, x: 3 }, { type: 'I', rotation: 2, x: 2 }, { type: 'S', rotation: 1, x: 7 }, { type: 'O', rotation: 0, x: 0 }, { type: 'Z', rotation: 0, x: 5 }, { type: 'J', rotation: 2, x: 0 }, { type: 'O', rotation: 3, x: 3 }, { type: 'Z', rotation: 0, x: 7 }, { type: 'T', rotation: 2, x: 5 }])),
  endgame('tm-endgame-49', '叠井', 49, 1489293365, setup(4101019, [{ type: 'L', rotation: 0, x: 7 }, { type: 'S', rotation: 2, x: 5 }, { type: 'T', rotation: 2, x: 7 }, { type: 'Z', rotation: 0, x: 0 }, { type: 'J', rotation: 1, x: 3 }, { type: 'O', rotation: 3, x: 2 }, { type: 'I', rotation: 2, x: 6 }, { type: 'T', rotation: 2, x: 0 }, { type: 'I', rotation: 2, x: 0 }, { type: 'S', rotation: 0, x: 4 }, { type: 'J', rotation: 2, x: 7 }])),
  endgame('tm-endgame-50', '岔口', 50, 3487329389, setup(4101002, [{ type: 'S', rotation: 0, x: 6 }, { type: 'Z', rotation: 1, x: 4 }, { type: 'J', rotation: 2, x: 7 }, { type: 'I', rotation: 2, x: 0 }, { type: 'T', rotation: 0, x: 2 }, { type: 'L', rotation: 2, x: 0 }, { type: 'O', rotation: 3, x: 0 }, { type: 'T', rotation: 2, x: 4 }, { type: 'Z', rotation: 2, x: 7 }, { type: 'S', rotation: 3, x: 2 }, { type: 'O', rotation: 1, x: 5 }])),
]);

/** The visible order follows authored teaching progression, not either legacy save order. */
export const ENDGAME_DEFINITIONS: readonly EndgameDefinition[] = Object.freeze(
  [...ENDGAME_LIBRARY].sort((left, right) => left.difficulty - right.difficulty || left.id.localeCompare(right.id)),
);

const ENDGAME_ID_SET = new Set<string>(ENDGAME_LIBRARY.map((candidate) => candidate.id));
const ENDGAME_SEED_SET = new Set<number>(ENDGAME_LIBRARY.map((candidate) => candidate.seed));

function validateSeedBags(definition: EndgameDefinition): void {
  let randomizer = createRandomizer(definition.seed);
  for (let bagIndex = 0; bagIndex < 12; bagIndex += 1) {
    const bag = new Set<PieceType>();
    for (let pieceIndex = 0; pieceIndex < PIECE_TYPES.length; pieceIndex += 1) {
      const draw = drawPiece(randomizer);
      randomizer = draw.randomizer;
      bag.add(draw.piece);
    }
    if (bag.size !== PIECE_TYPES.length) throw new Error(`Endgame ${definition.id} seed does not produce complete seven-bags.`);
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Validates derived, legal three-through-ten-row Endgame boards. */
export function validateEndgameDefinition(definition: EndgameDefinition, requireCanonical = true): void {
  if (!ENDGAME_ID_SET.has(definition.id)) throw new Error(`Unknown endgame id: ${definition.id}`);
  const canonical = ENDGAME_LIBRARY.find((candidate) => candidate.id === definition.id)!;
  if (!Number.isSafeInteger(definition.seed) || definition.seed <= 0 || definition.seed > 0xffff_ffff) {
    throw new Error(`Endgame ${definition.id} has an invalid level seed.`);
  }
  if (requireCanonical && definition.seed !== canonical.seed) throw new Error(`Endgame ${definition.id} must retain its stable level seed.`);
  if (ENDGAME_SEED_SET.size !== ENDGAME_LIBRARY.length) throw new Error('Endgame level seeds must be unique.');
  if (!Number.isSafeInteger(definition.difficulty) || definition.difficulty < 1
    || definition.difficulty > ENDGAME_LIBRARY.length || (requireCanonical && definition.difficulty !== canonical.difficulty)) {
    throw new Error(`Endgame ${definition.id} must retain its authored campaign difficulty.`);
  }
  if (!Number.isSafeInteger(definition.targetRows) || definition.targetRows < 3 || definition.targetRows > 10
    || (requireCanonical && definition.targetRows !== canonical.targetRows)) {
    throw new Error(`Endgame ${definition.id} must retain its explicit authored target-row count.`);
  }
  if (requireCanonical && definition.name !== canonical.name) throw new Error(`Endgame ${definition.id} must retain its authored name.`);
  if (requireCanonical && !sameJson(definition.setup, canonical.setup)) throw new Error(`Endgame ${definition.id} must retain its legal setup history.`);
  if (!Array.isArray(definition.hiddenCells) || definition.hiddenCells.length !== 0) {
    throw new Error(`Endgame ${definition.id} must begin with an empty hidden buffer.`);
  }
  if (!Array.isArray(definition.boardRows) || definition.boardRows.length !== VISIBLE_HEIGHT) {
    throw new Error(`Endgame ${definition.id} requires exactly ${VISIBLE_HEIGHT} visible board rows.`);
  }
  const derivedRows = rowsForSetup(definition.setup);
  if (!sameJson(definition.boardRows, derivedRows) || (requireCanonical && !sameJson(definition.boardRows, canonical.boardRows))) {
    throw new Error(`Endgame ${definition.id} board must be derived exactly from its legal setup history.`);
  }

  let occupied = 0;
  const nonEmptyRows: number[] = [];
  const ordinaryCellsByRow: number[] = [];
  for (const [y, row] of definition.boardRows.entries()) {
    if (typeof row !== 'string' || row.length !== BOARD_WIDTH) throw new Error(`Endgame ${definition.id} contains a malformed board row.`);
    if ([...row].some((cell) => cell !== '.' && !PIECE_TYPE_SET.has(cell))) throw new Error(`Endgame ${definition.id} contains an illegal board cell.`);
    const rowOccupied = [...row].filter((cell) => cell !== '.').length;
    ordinaryCellsByRow.push(rowOccupied);
    if (rowOccupied === BOARD_WIDTH) throw new Error(`Endgame ${definition.id} contains an initially full visible row.`);
    if (rowOccupied > 0) {
      nonEmptyRows.push(y);
      occupied += rowOccupied;
    }
  }

  if (occupied !== definition.setup.placements.length * 4) {
    throw new Error(`Endgame ${definition.id} must preserve every source tetromino as four ordinary targets.`);
  }
  const expectedRows = definition.targetRows;
  if (nonEmptyRows.length !== expectedRows) {
    throw new Error(`Endgame ${definition.id} requires exactly ${expectedRows} visible endgame rows for its campaign band.`);
  }
  const expectedStart = VISIBLE_HEIGHT - expectedRows;
  if (nonEmptyRows.some((y, index) => y !== expectedStart + index)) {
    throw new Error(`Endgame ${definition.id} must remain a contiguous visible endgame band at the floor.`);
  }
  if (definition.boardRows.slice(0, expectedStart).some((row) => row !== EMPTY_ROW)) {
    throw new Error(`Endgame ${definition.id} may not hide targets above its visible endgame band.`);
  }
  if (!Array.isArray(definition.anchorCells) || definition.anchorCells.length > 4) {
    throw new Error(`Endgame ${definition.id} may contain zero through four immutable anchors.`);
  }
  const anchorKeys = new Set<string>();
  const anchorsByRow = new Map<number, number>();
  const anchorStart = VISIBLE_HEIGHT - 12;
  for (const anchor of definition.anchorCells) {
    if (anchor === null || typeof anchor !== 'object'
      || !Number.isSafeInteger(anchor.x) || !Number.isSafeInteger(anchor.y)
      || anchor.x < 0 || anchor.x >= BOARD_WIDTH || anchor.y < anchorStart || anchor.y >= VISIBLE_HEIGHT) {
      throw new Error(`Endgame ${definition.id} anchor must remain inside the bottom twelve visible rows.`);
    }
    if (definition.boardRows[anchor.y]![anchor.x] !== '.') {
      throw new Error(`Endgame ${definition.id} anchor may not occupy an original target cell.`);
    }
    const key = coordinateKey(anchor.x, anchor.y);
    if (anchorKeys.has(key)) throw new Error(`Endgame ${definition.id} contains duplicate immutable anchors.`);
    anchorKeys.add(key);
    anchorsByRow.set(anchor.y, (anchorsByRow.get(anchor.y) ?? 0) + 1);
  }
  for (const [y, rowOccupied] of ordinaryCellsByRow.entries()) {
    if (rowOccupied + (anchorsByRow.get(y) ?? 0) === BOARD_WIDTH) {
      throw new Error(`Endgame ${definition.id} ordinary cells plus immutable anchors form an initially full visible row.`);
    }
  }
  if (requireCanonical && !sameJson(definition.anchorCells, canonical.anchorCells)) {
    throw new Error(`Endgame ${definition.id} must retain its authored immutable-anchor distribution.`);
  }
  validateSeedBags(definition);
}

export function getEndgameDefinition(id: EndgameId): EndgameDefinition {
  const selected = ENDGAME_LIBRARY.find((candidate) => candidate.id === id);
  if (!selected) throw new Error(`Unknown endgame id: ${id}`);
  validateEndgameDefinition(selected);
  return selected;
}

export function createEndgameBoard(definition: EndgameDefinition, includeAnchors = true, requireCanonical = true): Board {
  validateEndgameDefinition(definition, requireCanonical);
  const board = replayEndgameSetup(definition.setup);
  if (!includeAnchors) return board;
  for (const anchor of definition.anchorCells) board[VISIBLE_START_ROW + anchor.y]![anchor.x] = ANCHOR_CELL;
  return board;
}

/** Canonical coordinates for all authored ordinary cells that must be cleared. */
export function originalTargetCells(definition: EndgameDefinition, requireCanonical = true): readonly Cell[] {
  validateEndgameDefinition(definition, requireCanonical);
  return Object.freeze(definition.boardRows.flatMap((row, y) => [...row].flatMap((cell, x) => (
    cell === '.' ? [] : [Object.freeze({ x, y: VISIBLE_START_ROW + y })]
  ))));
}

export function defaultEndgameId(): EndgameId {
  return ENDGAME_DEFINITIONS[0]!.id;
}

export function nextEndgameId(id: EndgameId): EndgameId | null {
  const index = ENDGAME_DEFINITIONS.findIndex((candidate) => candidate.id === id);
  return index >= 0 ? ENDGAME_DEFINITIONS[index + 1]?.id ?? null : null;
}
