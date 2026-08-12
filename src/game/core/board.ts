import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';
import { cellsForPiece } from './pieces';
import { ANCHOR_CELL, BEDROCK_CELL, type ActivePiece, type Board, type BoardCell, type Cell } from './types';

export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array.from({ length: BOARD_WIDTH }, () => null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function isInside(cell: Cell): boolean {
  return cell.x >= 0 && cell.x < BOARD_WIDTH && cell.y >= 0 && cell.y < BOARD_HEIGHT;
}

export function canPlace(board: Board, piece: ActivePiece): boolean {
  return cellsForPiece(piece).every((cell) => isInside(cell) && board[cell.y]?.[cell.x] === null);
}

export function isGrounded(board: Board, piece: ActivePiece): boolean {
  return !canPlace(board, { ...piece, y: piece.y + 1 });
}

export function mergePiece(board: Board, piece: ActivePiece): Board {
  const next = cloneBoard(board);
  for (const cell of cellsForPiece(piece)) {
    if (!isInside(cell)) throw new Error('Cannot merge a piece outside the canonical board.');
    next[cell.y]![cell.x] = piece.type;
  }
  return next;
}

export function fullRows(board: Board): number[] {
  const rows: number[] = [];
  board.forEach((row, index) => {
    if (row.every((cell) => cell !== null && cell !== BEDROCK_CELL)) rows.push(index);
  });
  return rows;
}

function removableRows(board: Board, rows: readonly number[]): ReadonlySet<number> {
  return new Set(rows.filter((index) => !board[index]?.includes(BEDROCK_CELL)));
}

function nearestFixedSupportBelow(
  board: Board,
  supported: ReadonlySet<number>,
  x: number,
  y: number,
): number {
  for (let nextY = y + 1; nextY < BOARD_HEIGHT; nextY += 1) {
    if (board[nextY]![x] === ANCHOR_CELL || supported.has(cellKey(x, nextY))) return nextY;
  }
  return BOARD_HEIGHT;
}

function cellKey(x: number, y: number): number {
  return y * BOARD_WIDTH + x;
}

function supportedKeys(cells: readonly Cell[], removed: ReadonlySet<number>): ReadonlySet<number> {
  return new Set(cells.filter((cell) => !removed.has(cell.y)).map((cell) => cellKey(cell.x, cell.y)));
}

/**
 * Returns the coordinate after a line clear while treating Endgame anchors as fixed
 * world coordinates. A clear below an anchor cannot pull a cell through that anchor.
 */
function destinationAfterClear(
  board: Board,
  removed: ReadonlySet<number>,
  supported: ReadonlySet<number>,
  cell: Cell,
): Cell {
  if (supported.has(cellKey(cell.x, cell.y))) return cell;
  const floor = nearestFixedSupportBelow(board, supported, cell.x, cell.y);
  let shift = 0;
  for (const row of removed) if (row > cell.y && row < floor) shift += 1;
  return { x: cell.x, y: cell.y + shift };
}

/** Maps tracked canonical Endgame cells through the exact anchor-aware line-clear rule. */
export function mapCellsAfterClear(
  board: Board,
  rows: readonly number[],
  cells: readonly Cell[],
  supportedCells: readonly Cell[] = [],
): readonly Cell[] {
  const removed = removableRows(board, rows);
  const supported = supportedKeys(supportedCells, removed);
  return Object.freeze(cells.flatMap((cell) => (
    removed.has(cell.y) ? [] : [Object.freeze(destinationAfterClear(board, removed, supported, cell))]
  )));
}

export function clearRows(board: Board, rows: readonly number[], supportedCells: readonly Cell[] = []): Board {
  const removed = removableRows(board, rows);
  if (removed.size === 0) return cloneBoard(board);
  const supported = supportedKeys(supportedCells, removed);
  const settled = createBoard();

  // Anchors are obstacles tied to their original world coordinates. Lay them down
  // first, then resolve every ordinary cell against its own anchor-bounded segment.
  for (let y = 0; y < BOARD_HEIGHT; y += 1) for (let x = 0; x < BOARD_WIDTH; x += 1) {
    if (board[y]![x] === ANCHOR_CELL) settled[y]![x] = ANCHOR_CELL;
  }
  for (let y = 0; y < BOARD_HEIGHT; y += 1) for (let x = 0; x < BOARD_WIDTH; x += 1) {
    const material = board[y]![x];
    if (material === null || material === ANCHOR_CELL || removed.has(y)) continue;
    const destination = destinationAfterClear(board, removed, supported, { x, y });
    if (settled[destination.y]![destination.x] !== null) {
      throw new Error('Line clear attempted to move a cell through a fixed anchor.');
    }
    settled[destination.y]![destination.x] = material;
  }
  return settled;
}

export function raiseBedrock(board: Board, count: number): { board: Board; added: number; overflow: boolean } {
  let next = cloneBoard(board);
  let added = 0;
  let overflow = false;
  const requested = Math.max(0, Math.floor(count));
  while (added < requested) {
    overflow ||= next[0]!.some((cell) => cell !== null);
    next = [
      ...next.slice(1).map((row) => [...row]),
      Array.from({ length: BOARD_WIDTH }, () => BEDROCK_CELL),
    ];
    added += 1;
  }
  return { board: next, added, overflow };
}

export function lowerBedrock(board: Board, count: number): { board: Board; removed: number } {
  let next = cloneBoard(board);
  let removed = 0;
  const requested = Math.max(0, Math.floor(count));
  while (removed < requested && next.at(-1)?.every((cell) => cell === BEDROCK_CELL)) {
    next = [
      Array.from({ length: BOARD_WIDTH }, () => null),
      ...next.slice(0, -1).map((row) => [...row]),
    ];
    removed += 1;
  }
  return { board: next, removed };
}

export function setCell(board: Board, x: number, y: number, value: BoardCell): Board {
  const next = cloneBoard(board);
  if (!next[y] || x < 0 || x >= BOARD_WIDTH) throw new Error('Test cell is outside the canonical board.');
  next[y]![x] = value;
  return next;
}
