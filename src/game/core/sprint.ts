import { cloneBoard } from './board';
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';
import type { Board, Cell, PieceType } from './types';

export interface SupergravityPieceSettlement {
  board: Board;
  cells: Cell[];
}

/**
 * Settles only the covered tetromino's occupied columns against the immutable board.
 * Existing cells are support: they never move and the covered cells never tunnel
 * through them. Cells from one piece column share a drop so their vertical spacing is
 * preserved while other piece columns may continue farther.
 */
export function settleSupergravityPiece(
  board: Board,
  sourceCells: readonly Cell[],
  material: PieceType,
): SupergravityPieceSettlement {
  const columns = new Map<number, Cell[]>();
  for (const cell of sourceCells) {
    if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y < 0 || cell.y >= BOARD_HEIGHT) {
      throw new Error('Cannot settle a Supergravity piece outside the canonical board.');
    }
    if (board[cell.y]![cell.x] !== null) {
      throw new Error('Cannot settle a Supergravity piece through an occupied board cell.');
    }
    const column = columns.get(cell.x) ?? [];
    column.push(cell);
    columns.set(cell.x, column);
  }

  const dropByColumn = new Map<number, number>();
  for (const [x, cells] of columns) {
    let columnDrop = BOARD_HEIGHT;
    for (const cell of cells) {
      let supportY = BOARD_HEIGHT;
      for (let y = cell.y + 1; y < BOARD_HEIGHT; y += 1) {
        if (board[y]![x] !== null) {
          supportY = y;
          break;
        }
      }
      columnDrop = Math.min(columnDrop, supportY - cell.y - 1);
    }
    dropByColumn.set(x, columnDrop);
  }

  const cells = sourceCells.map((cell) => ({
    x: cell.x,
    y: cell.y + (dropByColumn.get(cell.x) ?? 0),
  }));
  const settled = cloneBoard(board);
  for (const cell of cells) settled[cell.y]![cell.x] = material;
  return { board: settled, cells };
}
