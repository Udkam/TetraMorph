import { describe, expect, it } from 'vitest';
import { BOARD_WIDTH } from './constants';
import { clearRows, createBoard, fullRows, mapCellsAfterClear, setCell } from './board';
import { ANCHOR_CELL, type Cell } from './types';

describe('anchor-aware row resolution', () => {
  it('keeps an anchor fixed when a lower row clears and only drops cells inside their own segment', () => {
    const anchorY = 29;
    const clearY = 33;
    let board = createBoard();
    board = setCell(board, 4, anchorY, ANCHOR_CELL);
    board = setCell(board, 4, anchorY - 1, 'J');
    board = setCell(board, 3, anchorY - 1, 'L');
    for (let x = 0; x < BOARD_WIDTH; x += 1) board = setCell(board, x, clearY, 'I');

    const rows = fullRows(board);
    const cleared = clearRows(board, rows);
    const targets = mapCellsAfterClear(board, rows, [{ x: 4, y: anchorY - 1 }, { x: 3, y: anchorY - 1 }]);

    expect(rows).toEqual([clearY]);
    expect(cleared[anchorY]?.[4]).toBe(ANCHOR_CELL);
    expect(cleared[anchorY - 1]?.[4]).toBe('J');
    expect(cleared[anchorY]?.[3]).toBe('L');
    expect(targets).toEqual([{ x: 4, y: anchorY - 1 }, { x: 3, y: anchorY }]);
  });

  it('keeps only the explicitly tracked anchored placement fixed when a same-color cell touches it', () => {
    const anchorY = 29;
    const clearY = 33;
    let board = createBoard();
    board = setCell(board, 4, anchorY, ANCHOR_CELL);
    const supportedPiece = [
      { x: 4, y: anchorY - 1 },
      { x: 3, y: anchorY - 1 },
      { x: 2, y: anchorY - 1 },
      { x: 4, y: anchorY - 2 },
    ];
    for (const { x, y } of supportedPiece) {
      board = setCell(board, x, y, 'J');
    }
    board = setCell(board, 1, anchorY - 1, 'J');
    board = setCell(board, 7, anchorY - 1, 'L');
    board = setCell(board, 3, anchorY - 3, 'S');
    for (let x = 0; x < BOARD_WIDTH; x += 1) board = setCell(board, x, clearY, 'I');

    const rows = fullRows(board);
    const tracked = [
      ...supportedPiece,
      { x: 1, y: anchorY - 1 },
      { x: 7, y: anchorY - 1 },
      { x: 3, y: anchorY - 3 },
    ];
    const cleared = clearRows(board, rows, supportedPiece);
    const targets = mapCellsAfterClear(board, rows, tracked, supportedPiece);

    for (const { x, y } of supportedPiece) expect(cleared[y]?.[x]).toBe('J');
    expect(cleared[anchorY]?.[1]).toBe('J');
    expect(cleared[anchorY]?.[7]).toBe('L');
    expect(cleared[anchorY - 3]?.[3]).toBe('S');
    expect(targets).toEqual([
      ...supportedPiece,
      { x: 1, y: anchorY },
      { x: 7, y: anchorY },
      { x: 3, y: anchorY - 3 },
    ]);
  });

  it('does not use a supported cell from the cleared row as a lingering collision boundary', () => {
    const anchorY = 29;
    const clearY = anchorY - 1;
    let board = createBoard();
    board = setCell(board, 4, anchorY, ANCHOR_CELL);
    for (let x = 0; x < BOARD_WIDTH; x += 1) board = setCell(board, x, clearY, 'I');
    board = setCell(board, 4, clearY, 'J');
    board = setCell(board, 4, clearY - 1, 'L');
    const supported = [{ x: 4, y: clearY }];

    const rows = fullRows(board);
    const cleared = clearRows(board, rows, supported);
    const targets = mapCellsAfterClear(board, rows, [...supported, { x: 4, y: clearY - 1 }], supported);

    expect(cleared[clearY]?.[4]).toBe('L');
    expect(targets).toEqual([{ x: 4, y: clearY }]);
  });

  it('removes the ordinary cells from an anchor row without moving the anchor itself', () => {
    const anchorY = 31;
    let board = createBoard();
    for (let x = 0; x < BOARD_WIDTH; x += 1) board = setCell(board, x, anchorY, 'T');
    board = setCell(board, 4, anchorY, ANCHOR_CELL);
    board = setCell(board, 4, anchorY - 1, 'S');

    const rows = fullRows(board);
    const cleared = clearRows(board, rows);
    const targets = mapCellsAfterClear(board, rows, [{ x: 3, y: anchorY }]);

    expect(rows).toEqual([anchorY]);
    expect(cleared[anchorY]?.[4]).toBe(ANCHOR_CELL);
    expect(cleared[anchorY]?.[3]).toBeNull();
    expect(cleared[anchorY - 1]?.[4]).toBe('S');
    expect(targets).toEqual([]);
  });

  it('keeps four anchors and maps target and support ownership through two clears', () => {
    const anchors: readonly Cell[] = [
      { x: 1, y: 29 },
      { x: 3, y: 30 },
      { x: 6, y: 29 },
      { x: 8, y: 30 },
    ];
    const supported: readonly Cell[] = anchors.map(({ x, y }) => ({ x, y: y - 1 }));
    const drifting: readonly Cell[] = [
      { x: 0, y: 27 },
      { x: 4, y: 28 },
      { x: 9, y: 31 },
    ];
    const removedTarget = { x: 2, y: 30 };
    let board = createBoard();
    for (const { x, y } of anchors) board = setCell(board, x, y, ANCHOR_CELL);
    for (const { x, y } of supported) board = setCell(board, x, y, 'J');
    board = setCell(board, drifting[0]!.x, drifting[0]!.y, 'L');
    board = setCell(board, drifting[1]!.x, drifting[1]!.y, 'S');
    board = setCell(board, drifting[2]!.x, drifting[2]!.y, 'Z');
    for (const y of [30, 36]) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (board[y]![x] === null) board = setCell(board, x, y, 'I');
      }
    }

    const rows = fullRows(board);
    const targets = [...supported, ...drifting, removedTarget];
    const cleared = clearRows(board, rows, supported);
    const mappedTargets = mapCellsAfterClear(board, rows, targets, supported);
    const mappedSupported = mapCellsAfterClear(board, rows, supported, supported);

    expect(rows).toEqual([30, 36]);
    for (const { x, y } of anchors) expect(cleared[y]?.[x]).toBe(ANCHOR_CELL);
    for (const { x, y } of supported) expect(cleared[y]?.[x]).toBe('J');
    expect(cleared[29]?.[0]).toBe('L');
    expect(cleared[30]?.[4]).toBe('S');
    expect(cleared[32]?.[9]).toBe('Z');
    expect(cleared.flat().filter((cell) => cell === 'I')).toHaveLength(0);
    expect(mappedTargets).toEqual([
      ...supported,
      { x: 0, y: 29 },
      { x: 4, y: 30 },
      { x: 9, y: 32 },
    ]);
    expect(mappedSupported).toEqual(supported);
  });
});
