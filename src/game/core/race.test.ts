import { describe, expect, it } from 'vitest';
import {
  BOARD_HEIGHT,
  ENTRY_DELAY_TICKS,
  INITIAL_SURVIVAL_BEDROCK_ROWS,
  LINE_CLEAR_DELAY_TICKS,
  PROGRESSIVE_GRAVITY_TICKS,
  STANDARD_GRAVITY_TICKS,
  SURVIVAL_GRAVITY_TICKS,
  SURVIVAL_DEBRIS_EVENTS_PER_INTERVAL_STEP,
  SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES,
  SURVIVAL_DEBRIS_MIN_INTERVAL_PIECES,
  SURVIVAL_DEBRIS_WARNING_TICKS,
  SURVIVAL_LINES_PER_BEDROCK,
  SURVIVAL_RISES_PER_AFTERSHOCK,
  TICKS_PER_SECOND,
  VISIBLE_START_ROW,
  gravityForMode,
  survivalIntervalSeconds,
  survivalIntervalTicks,
} from './constants';
import { canPlace, clearRows, createBoard, fullRows, lowerBedrock, setCell } from './board';
import { createInitialState, dispatch, dropDistance, replay, stateHash } from './engine';
import { BEDROCK_CELL, SURVIVAL_STONE_CELL, type Board, type GameCommand, type GameState } from './types';

function start(seed: number, mode: 'marathon' | 'race' | 'endgame' = 'marathon'): GameState {
  return dispatch(createInitialState(seed, mode), { type: 'start' }).state;
}

function advance(state: GameState, ticks: number): GameState {
  let next = state;
  for (let index = 0; index < ticks; index += 1) next = dispatch(next, { type: 'tick' }).state;
  return next;
}

function singleClearBoard(bedrockRows = 0): { board: Board; active: GameState['active'] } {
  let board = createBoard();
  for (let offset = 0; offset < bedrockRows; offset += 1) {
    for (let x = 0; x < 10; x += 1) board = setCell(board, x, BOARD_HEIGHT - 1 - offset, BEDROCK_CELL);
  }
  const row = BOARD_HEIGHT - 1 - bedrockRows;
  for (let x = 0; x < 8; x += 1) board = setCell(board, x, row, 'J');
  return { board, active: { type: 'O', rotation: 0, x: 8, y: row - 1 } };
}

function resolveClear(state: GameState) {
  let transition = dispatch(state, { type: 'hard-drop' });
  expect(transition.state.phase).toBe('line-clear');
  for (let index = 0; index < LINE_CLEAR_DELAY_TICKS; index += 1) {
    transition = dispatch(transition.state, { type: 'tick' });
  }
  return transition;
}

describe('progressive gravity and Survival intervals', () => {
  it('uses ten-line Classic tiers and a faster fixed Survival cadence', () => {
    PROGRESSIVE_GRAVITY_TICKS.forEach((ticks, tier) => {
      expect(gravityForMode('marathon', 0, 0, tier * 10)).toBe(ticks);
    });
    expect(gravityForMode('marathon', 0, 0, 10_000)).toBe(4.8);
    expect(gravityForMode('race', 0, 0, 0)).toBe(SURVIVAL_GRAVITY_TICKS);
    expect(gravityForMode('race', 0, 50_000, 10_000)).toBe(SURVIVAL_GRAVITY_TICKS);
    expect(SURVIVAL_GRAVITY_TICKS).toBe(38);
    expect(gravityForMode('endgame', 99, 50_000, 10_000)).toBe(STANDARD_GRAVITY_TICKS);
  });

  it('starts at thirteen seconds, drops one second every three lines, and caps at six', () => {
    expect(survivalIntervalSeconds(0)).toBe(13);
    expect(survivalIntervalSeconds(2)).toBe(13);
    expect(survivalIntervalSeconds(3)).toBe(12);
    expect(survivalIntervalSeconds(21)).toBe(6);
    expect(survivalIntervalSeconds(10_000)).toBe(6);
    expect(survivalIntervalTicks(3)).toBe(12 * TICKS_PER_SECOND);
  });
});

describe('timed Survival pressure and three-line reward', () => {
  it('opens and restarts with the configured three unbreakable bedrock rows', () => {
    const opened = createInitialState(0x5000, 'race');
    expect(opened.survivalBedrockRows).toBe(INITIAL_SURVIVAL_BEDROCK_ROWS);
    expect(opened.survivalRiseCount).toBe(0);
    expect(opened.board.slice(-INITIAL_SURVIVAL_BEDROCK_ROWS).every((row) => row.every((cell) => cell === BEDROCK_CELL))).toBe(true);

    const restarted = dispatch({ ...opened, survivalBedrockRows: 1, board: createBoard() }, { type: 'restart' }).state;
    expect(restarted.survivalBedrockRows).toBe(INITIAL_SURVIVAL_BEDROCK_ROWS);
    expect(restarted.survivalRiseCount).toBe(0);
    expect(restarted.board.slice(-INITIAL_SURVIVAL_BEDROCK_ROWS).every((row) => row.every((cell) => cell === BEDROCK_CELL))).toBe(true);
  });
  it('advances only while playing, becomes pending exactly at zero, and then stops', () => {
    const ready = createInitialState(0x5040, 'race');
    expect(dispatch(ready, { type: 'tick' }).state.survivalPressureTicks).toBe(0);

    let state = dispatch(ready, { type: 'start' }).state;
    state = advance(state, survivalIntervalTicks(0) - 1);
    expect(state.survivalPressureTicks).toBe(survivalIntervalTicks(0) - 1);
    expect(state.survivalRisePending).toBe(false);
    state = dispatch(state, { type: 'tick' }).state;
    expect(state.survivalPressureTicks).toBe(survivalIntervalTicks(0));
    expect(state.survivalRisePending).toBe(true);
    expect(dispatch(state, { type: 'tick' }).state.survivalPressureTicks).toBe(survivalIntervalTicks(0));

    const paused = dispatch(state, { type: 'pause' }).state;
    expect(dispatch(paused, { type: 'tick' }).state).toEqual(paused);
  });

  it('raises one row at the next non-clearing lock, resets the timer, and waits to spawn', () => {
    const transition = dispatch({
      ...start(0x5001, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 38 },
      survivalPressureTicks: survivalIntervalTicks(0),
      survivalRisePending: true,
    }, { type: 'hard-drop' });

    expect(transition.state.phase).toBe('entry');
    expect(transition.state.active).toBeNull();
    expect(transition.state.survivalBedrockRows).toBe(1);
    expect(transition.state.survivalPressureTicks).toBe(0);
    expect(transition.state.survivalRisePending).toBe(false);
    expect(transition.state.survivalRiseCount).toBe(1);
    expect(transition.state.board.at(-1)).toEqual(Array(10).fill(BEDROCK_CELL));
    expect(transition.events.at(-1)).toEqual({ type: 'bedrock-raised', count: 1, height: 1 });

    const spawned = advance(transition.state, ENTRY_DELAY_TICKS);
    expect(spawned.active).not.toBeNull();
  });

  it('turns every fourth natural rise into a deterministic two-row Aftershock', () => {
    const transition = dispatch({
      ...start(0x50a4, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      survivalRiseCount: SURVIVAL_RISES_PER_AFTERSHOCK - 1,
      active: { type: 'O', rotation: 0, x: 4, y: 38 },
      survivalPressureTicks: survivalIntervalTicks(0),
      survivalRisePending: true,
    }, { type: 'hard-drop' });

    expect(transition.state.survivalRiseCount).toBe(SURVIVAL_RISES_PER_AFTERSHOCK);
    expect(transition.state.survivalBedrockRows).toBe(2);
    expect(transition.state.board.slice(-2).every((row) => row.every((cell) => cell === BEDROCK_CELL))).toBe(true);
    expect(transition.events).toContainEqual({ type: 'bedrock-raised', count: 2, height: 2 });
  });

  it('resolves a pressure row that becomes pending during entry before spawning', () => {
    const state: GameState = {
      ...start(0x5002, 'race'),
      active: null,
      phase: 'entry',
      phaseTicks: ENTRY_DELAY_TICKS - 1,
      survivalPressureTicks: survivalIntervalTicks(0) - 1,
    };
    const transition = dispatch(state, { type: 'tick' });
    expect(transition.state.active).not.toBeNull();
    expect(transition.state.survivalBedrockRows).toBe(INITIAL_SURVIVAL_BEDROCK_ROWS + 1);
    expect(transition.state.survivalPressureTicks).toBe(0);
    expect(transition.events).toContainEqual({ type: 'bedrock-raised', count: 1, height: INITIAL_SURVIVAL_BEDROCK_ROWS + 1 });
  });

  it('settles a pending rise and earned relief atomically without phantom motion', () => {
    const setup = singleClearBoard(1);
    const transition = resolveClear({
      ...start(0x5005, 'race'),
      ...setup,
      lines: SURVIVAL_LINES_PER_BEDROCK - 1,
      survivalBedrockRows: 1,
      survivalPressureTicks: survivalIntervalTicks(2),
      survivalRisePending: true,
      score: 0,
    });

    expect(transition.state.lines).toBe(3);
    expect(transition.state.score).toBe(40);
    expect(transition.state.survivalBedrockRows).toBe(1);
    expect(transition.state.survivalPressureTicks).toBe(0);
    expect(transition.state.board.at(-1)).toEqual(Array(10).fill(BEDROCK_CELL));
    expect(transition.events.map((event) => event.type)).toEqual([
      'lines-cleared',
    ]);
  });

  it('preserves top cells when Aftershock plus relief produces only one net rise', () => {
    const setup = singleClearBoard(1);
    const transition = resolveClear({
      ...start(0x5039, 'race'),
      ...setup,
      board: setCell(setup.board, 0, 0, 'T'),
      lines: 2,
      survivalBedrockRows: 1,
      survivalRiseCount: 3,
      survivalRisePending: true,
    });
    // The ordinary clear moves the sentinel to row 1; net rise returns it to 0.
    expect(transition.state.board[0]![0]).toBe('T');
    expect(transition.state.status).toBe('playing');
    expect(transition.state.survivalBedrockRows).toBe(2);
    expect(transition.state.survivalRiseCount).toBe(4);
    expect(transition.events).toContainEqual({ type: 'bedrock-raised', count: 1, height: 2 });
    expect(transition.events.some((event) => event.type === 'bedrock-lowered')).toBe(false);
  });

  it('does not waive final mover overflow merely because relief was earned', () => {
    const setup = singleClearBoard(1);
    let state: GameState = {
      ...start(0x5041, 'race'), ...setup,
      phase: 'line-clear', phaseTicks: LINE_CLEAR_DELAY_TICKS - 1,
      pendingClearRows: [BOARD_HEIGHT - 2],
      active: { type: 'O', rotation: 0, x: 4, y: -1 },
      lines: 2, survivalBedrockRows: 1, survivalRiseCount: 3,
      survivalRisePending: true,
    };
    // A stone can trigger a clear while the player piece is still entering.
    state = { ...state, board: setCell(setCell(state.board, 8, BOARD_HEIGHT - 2, 'J'), 9, BOARD_HEIGHT - 2, 'J') };
    const transition = dispatch(state, { type: 'tick' });
    expect(transition.state.status).toBe('game-over');
    expect(transition.events).toContainEqual({ type: 'game-over', reason: 'bedrock-overflow' });
  });

  it('resets under the shorter interval at three lines even when no bedrock exists', () => {
    const setup = singleClearBoard();
    const transition = resolveClear({
      ...start(0x5038, 'race'),
      ...setup,
      lines: 2,
      survivalBedrockRows: 0,
      survivalPressureTicks: 0,
    });
    expect(transition.state.lines).toBe(3);
    expect(transition.state.survivalBedrockRows).toBe(0);
    expect(transition.state.survivalPressureTicks).toBe(0);
    expect(transition.events.some((event) => event.type === 'bedrock-lowered')).toBe(false);
    expect(survivalIntervalTicks(transition.state.lines)).toBe(12 * TICKS_PER_SECOND);
  });

  it('fails closed on pressure overflow before the next spawn', () => {
    let board = createBoard();
    board = setCell(board, 0, 0, 'T');
    const transition = dispatch({
      ...start(0x50ff, 'race'),
      board,
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 38 },
      survivalPressureTicks: survivalIntervalTicks(0),
      survivalRisePending: true,
    }, { type: 'hard-drop' });

    expect(transition.state.status).toBe('game-over');
    expect(transition.state.active).toBeNull();
    expect(transition.state.survivalBedrockRows).toBe(1);
    expect(transition.events).toContainEqual({ type: 'bedrock-raised', count: 1, height: 1 });
    expect(transition.events).toContainEqual({ type: 'game-over', reason: 'bedrock-overflow' });
  });

  it('keeps replay deterministic, hashes pressure state, and restart restores the configured three-row opening', () => {
    const commands: GameCommand[] = [
      { type: 'start' },
      ...Array.from({ length: 30 }, () => ({ type: 'tick' } as const)),
      { type: 'hard-drop' },
      ...Array.from({ length: ENTRY_DELAY_TICKS }, () => ({ type: 'tick' } as const)),
    ];
    const first = replay(0x5150, commands, 'race');
    const second = replay(0x5150, commands, 'race');
    expect(stateHash(first)).toBe(stateHash(second));
    expect(stateHash(first)).not.toBe(stateHash({ ...first, survivalPressureTicks: first.survivalPressureTicks + 1 }));
    expect(stateHash(first)).not.toBe(stateHash({ ...first, survivalRisePending: !first.survivalRisePending }));
    expect(stateHash(first)).not.toBe(stateHash({ ...first, survivalRiseCount: first.survivalRiseCount + 1 }));

    const withBedrock = {
      ...first,
      survivalBedrockRows: 1,
      survivalPressureTicks: 999,
      survivalRisePending: true,
      survivalRiseCount: 3,
      board: Array.from({ length: BOARD_HEIGHT }, (_, row) => row === BOARD_HEIGHT - 1
        ? Array(10).fill(BEDROCK_CELL)
        : Array(10).fill(null)) as Board,
    };
    const restarted = dispatch(withBedrock, { type: 'restart' }).state;
    expect(restarted.mode).toBe('race');
    expect(restarted.survivalBedrockRows).toBe(INITIAL_SURVIVAL_BEDROCK_ROWS);
    expect(restarted.survivalPressureTicks).toBe(0);
    expect(restarted.survivalRisePending).toBe(false);
    expect(restarted.survivalRiseCount).toBe(0);
    expect(restarted.board.slice(-INITIAL_SURVIVAL_BEDROCK_ROWS).every((row) => row.every((cell) => cell === BEDROCK_CELL))).toBe(true);
  });
});

describe('independent Survival stone stream', () => {
  function isolatedStoneState(seed = 0x5a0e): GameState {
    return {
      ...start(seed, 'race'),
      // Keep the player piece stationary while this suite isolates the
      // independent stone clock; it must not change the normal seven-bag.
      active: { type: 'O', rotation: 0, x: 4, y: 24 },
      gravityTicks: -10_000,
      survivalRisePending: true,
    };
  }

  function enterWithDueRockfall(
    seed: number,
    overrides: Partial<GameState> = {},
  ) {
    const base = start(seed, 'race');
    return dispatch({
      ...base,
      board: createBoard(),
      survivalBedrockRows: 0,
      active: null,
      phase: 'entry',
      phaseTicks: ENTRY_DELAY_TICKS - 1,
      queue: ['O', ...base.queue],
      survivalDebrisPiecesRemaining: 0,
      survivalDebrisWarningColumns: [],
      survivalDebrisWarningHeight: null,
      ...overrides,
    }, { type: 'tick' });
  }

  it('uses locked-piece cadence without consuming the ordinary piece stream', () => {
    const initial = isolatedStoneState();
    const bag = initial.randomizer;
    const elapsed = advance(initial, 30 * TICKS_PER_SECOND);
    expect(elapsed.survivalDebrisPiecesRemaining).toBe(SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES);
    expect(elapsed.survivalDebrisPieceInterval).toBe(SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES);
    expect(elapsed.survivalDebrisSpawnCount).toBe(0);
    expect(elapsed.survivalDebris).toEqual([]);
    expect(elapsed.randomizer).toEqual(bag);

    const paused = dispatch(initial, { type: 'pause' }).state;
    expect(dispatch(paused, { type: 'tick' }).state).toEqual(paused);
    const restarted = dispatch(paused, { type: 'restart' }).state;
    expect(restarted.survivalDebrisPiecesRemaining).toBe(SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES);
    expect(restarted.survivalDebrisWarningColumns).toEqual([]);
    expect(restarted.survivalDebrisWarningTicks).toBe(0);
  });

  it('guarantees the warned column 800 ms before an immediate following entry', () => {
    const base = start(0x5a09, 'race');
    let transition = dispatch({
      ...base,
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 },
      survivalDebrisPiecesRemaining: 2,
    }, { type: 'hard-drop' });

    for (let index = 0; index < ENTRY_DELAY_TICKS; index += 1) {
      transition = dispatch(transition.state, { type: 'tick' });
    }
    expect(transition.events).toContainEqual(expect.objectContaining({
      type: 'survival-stones-warned',
      leadPieces: 1,
    }));
    expect(transition.state.survivalDebrisWarningTicks).toBe(SURVIVAL_DEBRIS_WARNING_TICKS);
    expect(transition.state.survivalDebrisWarningColumns).toHaveLength(1);

    const warnedHash = stateHash(transition.state);
    const paused = dispatch(transition.state, { type: 'pause' }).state;
    expect(dispatch(paused, { type: 'tick' }).state.survivalDebrisWarningTicks)
      .toBe(SURVIVAL_DEBRIS_WARNING_TICKS);

    transition = dispatch(transition.state, { type: 'hard-drop' });
    expect(transition.state).toMatchObject({ active: null, phase: 'entry' });
    for (let index = 0; index < SURVIVAL_DEBRIS_WARNING_TICKS - 1; index += 1) {
      transition = dispatch(transition.state, { type: 'tick' });
    }
    expect(transition.state).toMatchObject({
      active: null,
      phase: 'entry',
      survivalDebrisWarningTicks: 1,
    });
    expect(transition.state.survivalDebris).toEqual([]);

    transition = dispatch(transition.state, { type: 'tick' });
    expect(transition.state.active).not.toBeNull();
    expect(transition.state.survivalDebrisWarningTicks).toBe(0);
    expect(transition.events).toContainEqual(expect.objectContaining({ type: 'survival-stones-spawned' }));
    expect(stateHash(transition.state)).not.toBe(warnedHash);
  });

  it('hashes the warning clock only for Survival state', () => {
    const survival = start(0x5a0b, 'race');
    const classic = start(0x5a0b, 'marathon');

    expect(stateHash({ ...survival, survivalDebrisWarningTicks: 17 }))
      .not.toBe(stateHash(survival));
    expect(stateHash({ ...classic, survivalDebrisWarningTicks: 17 }))
      .toBe(stateHash(classic));
  });

  it('adds no entry wait after ordinary play already consumes the warning floor', () => {
    const base = start(0x5a0a, 'race');
    let transition = dispatch({
      ...base,
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 },
      survivalDebrisPiecesRemaining: 2,
    }, { type: 'hard-drop' });
    for (let index = 0; index < ENTRY_DELAY_TICKS; index += 1) {
      transition = dispatch(transition.state, { type: 'tick' });
    }
    transition = { state: advance(transition.state, SURVIVAL_DEBRIS_WARNING_TICKS), events: [] };
    expect(transition.state.survivalDebrisWarningTicks).toBe(0);

    transition = dispatch(transition.state, { type: 'hard-drop' });
    for (let index = 0; index < ENTRY_DELAY_TICKS; index += 1) {
      transition = dispatch(transition.state, { type: 'tick' });
    }
    expect(transition.state.active).not.toBeNull();
    expect(transition.state.survivalDebris).toHaveLength(1);
    expect(transition.events).toContainEqual(expect.objectContaining({ type: 'survival-stones-spawned' }));
  });

  it('spawns one or two joined rocks wholly visible and outside the accompanying piece columns', () => {
    const heights = new Set<number>();
    for (let seed = 1; seed <= 32; seed += 1) {
      const entered = enterWithDueRockfall(seed);
      const event = entered.events.find((candidate) => candidate.type === 'survival-stones-spawned');
      expect(event).toEqual(expect.objectContaining({
        type: 'survival-stones-spawned',
        intervalPieces: SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES,
        nextIntervalPieces: SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES,
      }));
      expect(entered.state.active).toMatchObject({ type: 'O' });
      expect(entered.state.survivalDebris).toHaveLength(1);
      const rock = entered.state.survivalDebris[0]!;
      expect([4, 5]).not.toContain(rock.x);
      expect(rock.y).toBe(VISIBLE_START_ROW);
      expect(event && event.type === 'survival-stones-spawned' ? event.cells : []).toEqual(
        Array.from({ length: rock.height }, (_, offset) => ({ x: rock.x, y: VISIBLE_START_ROW + offset })),
      );
      heights.add(rock.height);
    }
    expect([...heights].sort()).toEqual([1, 2]);
  });

  it('shortens the interval after every fourth event and floors it at four pieces', () => {
    const fourth = enterWithDueRockfall(0x5a10, {
      survivalDebrisSpawnCount: SURVIVAL_DEBRIS_EVENTS_PER_INTERVAL_STEP - 1,
    });
    expect(fourth.state.survivalDebrisSpawnCount).toBe(4);
    expect(fourth.state.survivalDebrisPieceInterval).toBe(7);
    expect(fourth.state.survivalDebrisPiecesRemaining).toBe(7);

    const floor = enterWithDueRockfall(0x5a11, {
      survivalDebrisSpawnCount: 4 * SURVIVAL_DEBRIS_EVENTS_PER_INTERVAL_STEP - 1,
      survivalDebrisPieceInterval: SURVIVAL_DEBRIS_MIN_INTERVAL_PIECES,
    });
    expect(floor.state.survivalDebrisSpawnCount).toBe(16);
    expect(floor.state.survivalDebrisPieceInterval).toBe(SURVIVAL_DEBRIS_MIN_INTERVAL_PIECES);
    expect(floor.state.survivalDebrisPiecesRemaining).toBe(SURVIVAL_DEBRIS_MIN_INTERVAL_PIECES);
    expect(stateHash(fourth.state)).not.toBe(stateHash({
      ...fourth.state,
      survivalDebrisPiecesRemaining: fourth.state.survivalDebrisPiecesRemaining - 1,
    }));
  });

  it('keeps a blocked warned event due until both visible entry cells open', () => {
    let board = createBoard();
    board = setCell(board, 0, VISIBLE_START_ROW, 'J');
    const blocked = enterWithDueRockfall(0x5a12, {
      board,
      survivalDebrisWarningColumns: [0],
      survivalDebrisWarningHeight: 2,
    });
    expect(blocked.state.survivalDebris).toEqual([]);
    expect(blocked.state.survivalDebrisPiecesRemaining).toBe(0);
    expect(blocked.state.survivalDebrisWarningColumns).toEqual([0]);

    const opened = dispatch({
      ...blocked.state,
      board: createBoard(),
      active: null,
      phase: 'entry',
      phaseTicks: ENTRY_DELAY_TICKS - 1,
    }, { type: 'tick' });
    expect(opened.state.survivalDebris).toEqual([{
      id: 1,
      x: 0,
      y: VISIBLE_START_ROW,
      height: 2,
    }]);
    expect(opened.state.survivalDebrisWarningColumns).toEqual([]);
    expect(opened.state.survivalDebrisPiecesRemaining).toBe(SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES);
  });

  it('falls at exactly seven times the fixed Survival cadence while preserving the rigid pair', () => {
    const state: GameState = {
      ...start(0x5a0f, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 24 },
      survivalDebris: [{ id: 1, x: 0, y: VISIBLE_START_ROW, height: 2 }],
      survivalDebrisFallProgress: 0,
    };
    const firstStoneStep = advance(state, Math.ceil(SURVIVAL_GRAVITY_TICKS / 7));
    expect(firstStoneStep.active).toMatchObject({ y: 24 });
    expect(firstStoneStep.survivalDebris).toEqual([{
      id: 1,
      x: 0,
      y: VISIBLE_START_ROW + 1,
      height: 2,
    }]);

    const advanced = advance(state, SURVIVAL_GRAVITY_TICKS);
    expect(advanced.active).toMatchObject({ y: 25 });
    expect(advanced.survivalDebris).toEqual([{
      id: 1,
      x: 0,
      y: VISIBLE_START_ROW + 7,
      height: 2,
    }]);
  });

  it('keeps a due rockfall out of the new ordinary piece columns without false block-out', () => {
    const base = start(0x5a1a, 'race');
    const entered = dispatch({
      ...base,
      board: createBoard(),
      survivalBedrockRows: 0,
      active: null,
      phase: 'entry',
      phaseTicks: ENTRY_DELAY_TICKS - 1,
      queue: ['O', ...base.queue],
      survivalDebrisWarningColumns: [4],
      survivalDebrisWarningHeight: 2,
      survivalDebrisPiecesRemaining: 0,
      survivalDebrisFallProgress: 0,
    }, { type: 'tick' });

    expect(entered.state.status).toBe('playing');
    expect(entered.state.active).toMatchObject({ type: 'O', x: 4, y: VISIBLE_START_ROW - 1 });
    expect(entered.state.survivalDebris).toHaveLength(1);
    expect([4, 5]).not.toContain(entered.state.survivalDebris[0]!.x);
    expect(entered.state.survivalDebris[0]).toMatchObject({ id: 1, y: VISIBLE_START_ROW });
    expect(entered.events.some((event) => event.type === 'game-over')).toBe(false);
    expect(dropDistance(entered.state)).toBeGreaterThan(0);
  });

  it('lets a faster falling stone leave a supported ordinary piece in place without locking it', () => {
    const state: GameState = {
      ...start(0x5a1b, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 28 },
      survivalDebris: [{ id: 7, x: 4, y: 30, height: 1 }],
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
      gravityTicks: 17,
      lockTicks: 12,
    };

    const first = dispatch(state, { type: 'tick' }).state;
    const repeated = dispatch(state, { type: 'tick' }).state;
    expect(first.active).toMatchObject({ type: 'O', x: 4, y: 28 });
    expect(first.survivalDebris).toEqual([{ id: 7, x: 4, y: 31, height: 1 }]);
    expect(first.gravityTicks).toBe(18);
    expect(first.lockTicks).toBe(0);
    expect(stateHash(first)).toBe(stateHash(repeated));

    const betweenStoneSteps = dispatch(first, { type: 'tick' }).state;
    expect(betweenStoneSteps.active).toEqual(first.active);
    expect(betweenStoneSteps.survivalDebris).toEqual(first.survivalDebris);
    expect(betweenStoneSteps.lockTicks).toBe(0);

    const second = dispatch({
      ...first,
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
    }, { type: 'tick' }).state;
    expect(second.active).toMatchObject({ type: 'O', x: 4, y: 28 });
    expect(second.survivalDebris).toEqual([{ id: 7, x: 4, y: 32, height: 1 }]);
  });

  it('pushes the active piece one row at stone cadence when the stone is directly above it', () => {
    const state: GameState = {
      ...start(0x5a1c, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 30 },
      survivalDebris: [{ id: 3, x: 4, y: 29, height: 1 }],
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
    };

    const firstPush = dispatch(state, { type: 'tick' }).state;
    expect(firstPush.active).toMatchObject({ type: 'O', x: 4, y: 31 });
    expect(firstPush.survivalDebris).toEqual([{ id: 3, x: 4, y: 30, height: 1 }]);
    expect(firstPush.gravityTicks).toBe(0);
    expect(firstPush.lockTicks).toBe(0);
    expect(firstPush.status).toBe('playing');

    const secondPush = dispatch({
      ...firstPush,
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
    }, { type: 'tick' }).state;
    expect(secondPush.active).toMatchObject({ type: 'O', x: 4, y: 32 });
    expect(secondPush.survivalDebris).toEqual([{ id: 3, x: 4, y: 31, height: 1 }]);

    const escaped = dispatch(secondPush, { type: 'move', dx: 1 }).state;
    const clearedRelation = dispatch({
      ...escaped,
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
    }, { type: 'tick' }).state;
    expect(clearedRelation.active).toMatchObject({ type: 'O', x: 5, y: 32 });
    expect(clearedRelation.survivalDebris).toEqual([{ id: 3, x: 4, y: 32, height: 1 }]);
  });

  it('waits without locking when downward stone pressure cannot push the active piece', () => {
    const state: GameState = {
      ...start(0x5a1f, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 },
      survivalDebris: [{ id: 4, x: 4, y: BOARD_HEIGHT - 3, height: 1 }],
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
      gravityTicks: 0,
      lockTicks: 29,
    };

    const waited = dispatch(state, { type: 'tick' }).state;
    expect(waited.active).toEqual(state.active);
    expect(waited.survivalDebris).toEqual(state.survivalDebris);
    expect(waited.lockTicks).toBe(0);
    expect(waited.status).toBe('playing');
  });

  it('treats a falling stone as a real collision while it is still in the air', () => {
    const state: GameState = {
      ...start(0x5a10, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 28 },
      survivalDebris: [{ id: 1, x: 4, y: 30, height: 2 }],
      survivalRisePending: true,
    };
    const attempted = dispatch(state, { type: 'soft-drop' });
    expect(attempted.state.active).toEqual(state.active);
    expect(attempted.events).toEqual([]);
    expect(dropDistance(state)).toBe(0);
  });

  it('hard-drops onto dynamic stone support without locking the ordinary piece', () => {
    const state: GameState = {
      ...start(0x5a1d, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 24 },
      survivalDebris: [{ id: 8, x: 4, y: 34, height: 1 }],
      pieceCount: 0,
      lockTicks: 17,
    };

    const dropped = dispatch(state, { type: 'hard-drop' });
    expect(dropped.state.active).toMatchObject({ type: 'O', x: 4, y: 32 });
    expect(dropped.state.survivalDebris).toEqual(state.survivalDebris);
    expect(dropped.state.pieceCount).toBe(0);
    expect(dropped.state.lockTicks).toBe(0);
    expect(dropped.events).toEqual([{
      type: 'piece-moved',
      piece: 'O',
      dx: 0,
      dy: 8,
      cause: 'hard-drop',
    }]);
    expect(dropped.events.some((event) => event.type === 'hard-dropped')).toBe(false);
  });

  it('starts ordinary lock delay only after the stone settles and normal gravity reaches it', () => {
    const base: GameState = {
      ...start(0x5a1e, 'race'),
      board: createBoard(),
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 4, y: 36 },
      survivalDebris: [{ id: 9, x: 4, y: 38, height: 1 }],
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
      lockTicks: 21,
    };

    const clearedSupport = dispatch(base, { type: 'tick' }).state;
    expect(clearedSupport.active).toMatchObject({ type: 'O', y: 36 });
    expect(clearedSupport.survivalDebris).toEqual([{ id: 9, x: 4, y: 39, height: 1 }]);
    expect(clearedSupport.lockTicks).toBe(0);

    const settled = dispatch({
      ...clearedSupport,
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
    }, { type: 'tick' }).state;
    expect(settled.survivalDebris).toEqual([]);
    expect(settled.board[39]![4]).toBe(SURVIVAL_STONE_CELL);
    expect(settled.active).toMatchObject({ type: 'O', y: 36 });
    expect(settled.lockTicks).toBe(0);

    const descended = dispatch(settled, { type: 'soft-drop' }).state;
    expect(descended.active).toMatchObject({ type: 'O', y: 37 });
    expect(descended.lockTicks).toBe(0);
    const grounded = dispatch(descended, { type: 'tick' }).state;
    expect(grounded.active).toMatchObject({ type: 'O', y: 37 });
    expect(grounded.lockTicks).toBe(1);
  });

  it('locks a stone as a clearable cell, scores its clear, and preserves the active player piece', () => {
    let board = createBoard();
    for (let x = 0; x < 9; x += 1) board = setCell(board, x, BOARD_HEIGHT - 1, 'J');
    let transition = dispatch({
      ...start(0x5a11, 'race'),
      board,
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 3, y: 30 },
      survivalDebris: [{ id: 1, x: 9, y: BOARD_HEIGHT - 1, height: 1 }],
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
      pieceCount: 0,
    }, { type: 'tick' });

    expect(transition.state.phase).toBe('line-clear');
    expect(transition.state.board[BOARD_HEIGHT - 1]![9]).toBe(SURVIVAL_STONE_CELL);
    expect(transition.events).toContainEqual({
      type: 'survival-stones-landed',
      cells: [
        { x: 9, y: BOARD_HEIGHT - 1 },
      ],
    });
    expect(transition.events).toContainEqual({ type: 'clear-started', rows: [BOARD_HEIGHT - 1] });

    for (let index = 0; index < LINE_CLEAR_DELAY_TICKS; index += 1) transition = dispatch(transition.state, { type: 'tick' });
    expect(transition.state.phase).toBe('active');
    expect(transition.state.lines).toBe(1);
    expect(transition.state.score).toBe(40);
    expect(transition.events).toContainEqual({
      type: 'lines-cleared',
      rows: [BOARD_HEIGHT - 1],
      count: 1,
      score: 40,
    });
    expect(transition.state.pieceCount).toBe(0);
    expect(transition.state.active).toMatchObject({ type: 'O', x: 3, y: 31 });
    expect(transition.state.board[BOARD_HEIGHT - 1]![9]).toBe(null);
    expect(transition.state.board[BOARD_HEIGHT - 2]![9]).toBe(null);
  });

  it('settles both cells together and can complete two ordinary rows in one impact', () => {
    let board = createBoard();
    for (let y = BOARD_HEIGHT - 2; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < 9; x += 1) board = setCell(board, x, y, 'S');
    }
    let transition = dispatch({
      ...start(0x5a13, 'race'),
      board,
      survivalBedrockRows: 0,
      active: { type: 'O', rotation: 0, x: 3, y: 30 },
      survivalDebris: [{ id: 1, x: 9, y: BOARD_HEIGHT - 2, height: 2 }],
      survivalDebrisFallProgress: SURVIVAL_GRAVITY_TICKS - 4,
      pieceCount: 0,
    }, { type: 'tick' });

    expect(transition.state.pendingClearRows).toEqual([BOARD_HEIGHT - 2, BOARD_HEIGHT - 1]);
    expect(transition.events).toContainEqual({
      type: 'survival-stones-landed',
      cells: [
        { x: 9, y: BOARD_HEIGHT - 2 },
        { x: 9, y: BOARD_HEIGHT - 1 },
      ],
    });
    expect(transition.events).toContainEqual({
      type: 'clear-started',
      rows: [BOARD_HEIGHT - 2, BOARD_HEIGHT - 1],
    });

    for (let index = 0; index < LINE_CLEAR_DELAY_TICKS; index += 1) {
      transition = dispatch(transition.state, { type: 'tick' });
    }
    expect(transition.state.lines).toBe(2);
    expect(transition.state.score).toBe(100);
    expect(transition.state.board.slice(-2)).toEqual([
      Array(10).fill(null),
      Array(10).fill(null),
    ]);
  });
});

describe('bedrock board invariants', () => {
  it('never clears bedrock normally, blocks placement, and lowers only the bottom stratum', () => {
    let board = createBoard();
    for (let x = 0; x < 10; x += 1) board = setCell(board, x, BOARD_HEIGHT - 1, BEDROCK_CELL);
    board = setCell(board, 2, BOARD_HEIGHT - 2, 'T');

    expect(fullRows(board)).toEqual([]);
    expect(clearRows(board, [BOARD_HEIGHT - 1])).toEqual(board);
    expect(canPlace(board, { type: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 })).toBe(false);

    const lowered = lowerBedrock(board, 1);
    expect(lowered.removed).toBe(1);
    expect(lowered.board[0]).toEqual(Array(10).fill(null));
    expect(lowered.board.at(-1)?.[2]).toBe('T');
    expect(lowerBedrock(lowered.board, 1).removed).toBe(0);
  });

  it('keeps Endgame on base scoring with no Classic combo', () => {
    const setup = singleClearBoard();
    const transition = resolveClear({
      ...start(0x5151, 'endgame'),
      ...setup,
      score: 0,
      combo: 7,
    });
    expect(transition.state.combo).toBe(0);
    expect(transition.state.score).toBe(40);
  });
});
