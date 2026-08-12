import { describe, expect, it } from 'vitest';
import { ENTRY_DELAY_TICKS, LINE_CLEAR_DELAY_TICKS, LOCK_DELAY_TICKS, VISIBLE_HEIGHT, VISIBLE_START_ROW } from './constants';
import { clearRows, createBoard, fullRows, mapCellsAfterClear, setCell } from './board';
import { createInitialState, dispatch } from './engine';
import { getEndgameDefinition } from './endgames';
import { ANCHOR_CELL, type Cell, type GameState, type PieceType } from './types';

function advance(state: GameState, ticks: number): GameState {
  let next = state;
  for (let index = 0; index < ticks; index += 1) next = dispatch(next, { type: 'tick' }).state;
  return next;
}

function resolveToActive(state: GameState): GameState {
  let next = state;
  for (let guard = 0; next.status === 'playing' && (!next.active || next.phase !== 'active') && guard < 64; guard += 1) {
    next = dispatch(next, { type: 'tick' }).state;
  }
  return next;
}

describe('T13 Endgame ordinary consecutive-piece flow', () => {
  it('applies automatic gravity, shared grounded lock delay, and ordinary entry after a non-clearing lock', () => {
    let state = dispatch(createInitialState(0x51a1f00d, 'endgame', 't3r-shaft-02'), { type: 'start' }).state;
    // Deliberately deviate from the replayed composition; the test exercises normal
    // continuation rather than a curriculum walkthrough.
    state = dispatch(state, { type: 'move', dx: -1 }).state;
    const spawnY = state.active!.y;
    state = advance(state, 48);
    expect(state.active?.y).toBe(spawnY + 1);

    while (true) {
      const beforeY = state.active?.y;
      const moved = dispatch(state, { type: 'soft-drop' }).state;
      if (moved.active?.y === beforeY) break;
      state = moved;
    }

    const expectedNext = state.queue[0];
    state = advance(state, LOCK_DELAY_TICKS - 1);
    expect(state.pieceCount).toBe(0);
    expect(state.active).not.toBeNull();

    state = advance(state, 1);
    expect(state.pieceCount).toBe(1);
    expect(state.active).toBeNull();
    expect(state.phase).toBe('entry');

    state = resolveToActive(state);
    expect(state.status).toBe('playing');
    expect(state.active?.type).toBe(expectedNext);
    expect(state.queue).toHaveLength(5);
    expect(state.endgameQueue).toEqual(state.queue);
    expect(state.endgameQueueIndex).toBe(0);
    expect(state.elapsedTicks).toBeGreaterThanOrEqual(48 + LOCK_DELAY_TICKS + ENTRY_DELAY_TICKS);
  });

  it('keeps replenishing after multiple public hard-drop locks without a queue or budget stop', () => {
    let state = dispatch(createInitialState(1, 'endgame', 't5r-current-12'), { type: 'start' }).state;
    const lockedTypes: PieceType[] = [];

    for (let lock = 0; lock < 3; lock += 1) {
      expect(state.status).toBe('playing');
      expect(state.active).not.toBeNull();
      lockedTypes.push(state.active!.type);
      state = dispatch(state, { type: 'hard-drop' }).state;
      state = resolveToActive(state);
    }

    expect(lockedTypes).toHaveLength(3);
    expect(state.pieceCount).toBe(3);
    expect(state.status).toBe('playing');
    expect(state.active).not.toBeNull();
    expect(state.queue).toHaveLength(5);
    expect(state.endgameCompletion).toBe('active');
  });

  it.each([
    't3r-shaft-01', 't5r-lattice-09', 't5r-prism-11', 't5r-horizon-15', 't6r-bastion-19',
  ] as const)('keeps %s as a layered teaching board with only its authored fixed anchors', (id) => {
    const definition = getEndgameDefinition(id);
    const state = createInitialState(1, 'endgame', id);
    const occupiedRows = definition.boardRows.filter((row) => row !== '..........');

    expect(occupiedRows).toHaveLength(definition.targetRows);
    expect(definition.boardRows.slice(0, VISIBLE_HEIGHT - occupiedRows.length)).toEqual(
      Array.from({ length: VISIBLE_HEIGHT - occupiedRows.length }, () => '..........'),
    );
    expect(state.endgameGoal).toBe('original-targets-cleared');
    expect(state.board.flat().filter((cell) => cell === ANCHOR_CELL)).toHaveLength(definition.anchorCells.length);
    for (const anchor of definition.anchorCells) {
      expect(state.board[VISIBLE_START_ROW + anchor.y]?.[anchor.x]).toBe(ANCHOR_CELL);
    }
  });

  it('tracks only original targets through a normal cleared row', () => {
    let state = dispatch(createInitialState(1, 'endgame', 't3r-shaft-02'), { type: 'start' }).state;
    const row = state.endgameTargetCells[0]!.y;
    const clearedTargetCount = state.endgameTargetCells.filter((cell) => cell.y === row).length;
    let board = createBoard();
    for (let x = 0; x < 10; x += 1) board = setCell(board, x, row, 'J');
    state = {
      ...state,
      board,
      active: null,
      phase: 'line-clear',
      phaseTicks: LINE_CLEAR_DELAY_TICKS - 1,
      pendingClearRows: [row],
    };
    state = dispatch(state, { type: 'tick' }).state;
    expect(state.endgameTargetCells).toHaveLength(state.endgameInitialTargetCount - clearedTargetCount);
  });
});

describe('Endgame anchor-supported placement identity', () => {
  it('records all four cells of the exact piece that locks on an anchor', () => {
    let board = createBoard();
    board = setCell(board, 3, 10, ANCHOR_CELL);
    const state: GameState = {
      ...createInitialState(0x51a1f00d, 'endgame', 't3r-shaft-02'),
      status: 'playing',
      phase: 'active',
      phaseTicks: 0,
      lockTicks: 0,
      board,
      active: { type: 'O', rotation: 0, x: 3, y: 8 },
      pendingClearRows: [],
      endgameAnchorSupportedCells: Object.freeze([]),
    };

    const locked = dispatch(state, { type: 'hard-drop' }).state;

    expect(locked.endgameAnchorSupportedCells).toEqual([
      { x: 3, y: 8 },
      { x: 4, y: 8 },
      { x: 3, y: 9 },
      { x: 4, y: 9 },
    ]);
  });

  it('maps one four-anchor board, its targets, and its support identities through the same clears', () => {
    const anchors: readonly Cell[] = [
      { x: 1, y: 29 },
      { x: 3, y: 30 },
      { x: 6, y: 29 },
      { x: 8, y: 30 },
    ];
    const supported: readonly Cell[] = anchors.map(({ x, y }) => ({ x, y: y - 1 }));
    const targets: readonly Cell[] = [
      { x: 0, y: 27 },
      { x: 4, y: 28 },
      { x: 9, y: 31 },
      { x: 2, y: 30 },
    ];
    let board = createBoard();
    for (const { x, y } of anchors) board = setCell(board, x, y, ANCHOR_CELL);
    for (const { x, y } of supported) board = setCell(board, x, y, 'J');
    board = setCell(board, targets[0]!.x, targets[0]!.y, 'L');
    board = setCell(board, targets[1]!.x, targets[1]!.y, 'S');
    board = setCell(board, targets[2]!.x, targets[2]!.y, 'Z');
    for (const y of [30, 36]) {
      for (let x = 0; x < 10; x += 1) {
        if (board[y]![x] === null) board = setCell(board, x, y, 'I');
      }
    }
    const rows = fullRows(board);
    const expectedBoard = clearRows(board, rows, supported);
    const expectedTargets = mapCellsAfterClear(board, rows, targets, supported);
    const expectedSupported = mapCellsAfterClear(board, rows, supported, supported);
    const started = dispatch(createInitialState(1, 'endgame', 't3r-shaft-02'), { type: 'start' }).state;
    const resolving: GameState = {
      ...started,
      board,
      active: null,
      phase: 'line-clear',
      phaseTicks: LINE_CLEAR_DELAY_TICKS - 1,
      pendingClearRows: rows,
      endgameTargetCells: targets,
      endgameInitialTargetCount: targets.length,
      endgameAnchorSupportedCells: supported,
    };

    const resolved = dispatch(resolving, { type: 'tick' }).state;

    expect(rows).toEqual([30, 36]);
    expect(resolved.board).toEqual(expectedBoard);
    expect(resolved.endgameTargetCells).toEqual(expectedTargets);
    expect(resolved.endgameAnchorSupportedCells).toEqual(expectedSupported);
    expect(resolved.endgameTargetCells).toHaveLength(3);
    expect(resolved.board.flat().filter((cell) => cell === ANCHOR_CELL)).toHaveLength(4);
    for (const { x, y } of anchors) expect(resolved.board[y]?.[x]).toBe(ANCHOR_CELL);
    expect(resolved.status).toBe('playing');
    expect(resolved.phase).toBe('active');
    expect(resolved.active).not.toBeNull();
  });
});
