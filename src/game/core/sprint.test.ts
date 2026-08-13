import { describe, expect, it } from 'vitest';
import {
  ENTRY_DELAY_TICKS,
  LINE_CLEAR_DELAY_TICKS,
  MUTATION_BOMB_SCORE,
  MUTATION_EFFECT_TICKS,
  MUTATION_FREEZE_GRAVITY_TICKS,
  MUTATION_GRAVITY_TICKS,
  MUTATION_SUPERGRAVITY_PIECES,
  TICKS_PER_SECOND,
  gravityForMode,
} from './constants';
import { createBoard, setCell } from './board';
import { createInitialState, dispatch, nextMutationPreviewItem, stateHash } from './engine';
import { cellsForPiece } from './pieces';
import { createRandomizer } from './random';
import { settleSupergravityPiece } from './sprint';
import type { GameEvent, GameState, MutationItem } from './types';

type MutationActivationEvent = Extract<GameEvent, { type: 'mutation-activated' }>;

function mutationActivations(transition: ReturnType<typeof dispatch>): MutationActivationEvent[] {
  return transition.events.filter((event): event is MutationActivationEvent => event.type === 'mutation-activated');
}

function playingMutation(seed = 0x5a71): GameState {
  return dispatch(createInitialState(seed, 'sprint'), { type: 'start' }).state;
}

function resolveLineClear(state: GameState): ReturnType<typeof dispatch> {
  let transition = dispatch(state, { type: 'hard-drop' });
  for (let tick = 0; tick < LINE_CLEAR_DELAY_TICKS; tick += 1) transition = dispatch(transition.state, { type: 'tick' });
  return transition;
}

function lockAndSpawn(state: GameState): GameState {
  let next = dispatch(state, { type: 'hard-drop' }).state;
  for (let tick = 0; tick < ENTRY_DELAY_TICKS; tick += 1) next = dispatch(next, { type: 'tick' }).state;
  return next;
}

function carrierClearState(item: MutationItem): GameState {
  let board = createBoard();
  for (let x = 0; x < 8; x += 1) board = setCell(board, x, 39, 'J');
  return {
    ...playingMutation(),
    board,
    active: { type: 'O', rotation: 0, x: 8, y: 38 },
    mutationActiveCarrier: { id: 9, item },
    mutationNextCarrierId: 10,
    score: 0,
  };
}

function fullyClearedCarrierState(item: MutationItem): GameState {
  let board = createBoard();
  for (const y of [38, 39]) for (let x = 0; x < 8; x += 1) board = setCell(board, x, y, 'J');
  return {
    ...playingMutation(),
    board,
    active: { type: 'O', rotation: 0, x: 8, y: 38 },
    mutationActiveCarrier: { id: 9, item },
    mutationNextCarrierId: 10,
    score: 0,
  };
}

describe('异变 mode', () => {
  it('keeps floating settled cells fixed and prevents a Supergravity-assisted false clear', () => {
    let board = createBoard();
    for (let x = 0; x < 8; x += 1) board = setCell(board, x, 39, 'T');
    board = setCell(board, 8, 34, 'J');
    const transition = dispatch({
      ...playingMutation(),
      board,
      active: { type: 'O', rotation: 0, x: 8, y: 0 },
      mutationCollapseLandingLatched: true,
      mutationCarriers: [{ id: 4, item: 'freeze', cells: [{ x: 8, y: 34 }] }],
      mutationActiveCarrier: { id: 5, item: 'bomb' },
    }, { type: 'hard-drop' });

    expect(transition.events).toContainEqual({ type: 'hard-dropped', piece: 'O', distance: 32 });
    expect(transition.events.some((event) => event.type === 'clear-started')).toBe(false);
    expect(transition.events.find((event) => event.type === 'piece-locked')).toEqual({
      type: 'piece-locked',
      piece: 'O',
      cells: [
        { x: 8, y: 32 },
        { x: 9, y: 38 },
        { x: 8, y: 33 },
        { x: 9, y: 39 },
      ],
    });
    expect(transition.state.board[34]?.[8]).toBe('J');
    expect(transition.state.board[39]?.[8]).toBeNull();
    expect(transition.state.board[39]?.[9]).toBe('O');
    expect(transition.state.mutationCarriers).toEqual([
      { id: 4, item: 'freeze', cells: [{ x: 8, y: 34 }] },
      {
        id: 5,
        item: 'bomb',
        cells: [
          { x: 8, y: 32 },
          { x: 9, y: 38 },
          { x: 8, y: 33 },
          { x: 9, y: 39 },
        ],
      },
    ]);
  });

  it('covers exactly the next five spawned pieces and keeps the fifth latched at quota zero', () => {
    let next: GameState = {
      ...playingMutation(),
      board: createBoard(),
      active: null,
      phase: 'entry',
      phaseTicks: ENTRY_DELAY_TICKS - 1,
      mutationCollapsePiecesRemaining: MUTATION_SUPERGRAVITY_PIECES,
      mutationCollapseLandingLatched: false,
    };

    for (let index = 0; index < MUTATION_SUPERGRAVITY_PIECES; index += 1) {
      next = dispatch(next, { type: 'tick' }).state;
      expect(next.active).not.toBeNull();
      expect(next.mutationCollapsePiecesRemaining).toBe(MUTATION_SUPERGRAVITY_PIECES - index - 1);
      expect(next.mutationCollapseLandingLatched).toBe(true);

      const moved = dispatch(next, { type: 'move', dx: -1 }).state;
      const rotated = dispatch(moved, { type: 'rotate', direction: 1 }).state;
      expect(moved.mutationCollapsePiecesRemaining).toBe(next.mutationCollapsePiecesRemaining);
      expect(rotated.mutationCollapseLandingLatched).toBe(true);
      if (index === MUTATION_SUPERGRAVITY_PIECES - 1) {
        expect(stateHash(rotated)).not.toBe(stateHash({
          ...rotated,
          mutationCollapseLandingLatched: false,
        }));
      }

      next = dispatch(rotated, { type: 'hard-drop' }).state;
      expect(next.mutationCollapseLandingLatched).toBe(false);
      next = {
        ...next,
        board: createBoard(),
        phase: 'entry',
        phaseTicks: ENTRY_DELAY_TICKS - 1,
      };
    }

    const sixth = dispatch(next, { type: 'tick' }).state;
    expect(sixth.mutationCollapsePiecesRemaining).toBe(0);
    expect(sixth.mutationCollapseLandingLatched).toBe(false);
  });

  it('emits the final independent-column cells for a latched Supergravity lock', () => {
    let board = createBoard();
    board = setCell(board, 8, 39, 'J');
    const transition = dispatch({
      ...playingMutation(),
      board,
      active: { type: 'O', rotation: 0, x: 8, y: 0 },
      mutationCollapsePiecesRemaining: 0,
      mutationCollapseLandingLatched: true,
    }, { type: 'hard-drop' });

    const locked = transition.events.find((event) => event.type === 'piece-locked');
    expect(locked?.cells).toEqual([
      { x: 8, y: 37 },
      { x: 9, y: 38 },
      { x: 8, y: 38 },
      { x: 9, y: 39 },
    ]);
    expect(transition.state.board[37]?.[8]).toBe('O');
    expect(transition.state.board[38]?.[8]).toBe('O');
    expect(transition.state.board[38]?.[9]).toBe('O');
    expect(transition.state.board[39]?.[9]).toBe('O');
    expect(transition.state.mutationCollapseLandingLatched).toBe(false);
  });

  it('treats floating settled cells as collision support during lock-out evaluation', () => {
    let board = createBoard();
    board = setCell(board, 4, 20, 'J');
    board = setCell(board, 5, 20, 'L');
    const transition = dispatch({
      ...playingMutation(),
      board,
      active: { type: 'O', rotation: 0, x: 4, y: 0 },
      mutationCollapsePiecesRemaining: 0,
      mutationCollapseLandingLatched: true,
    }, { type: 'hard-drop' });

    expect(transition.state.status).toBe('game-over');
    expect(transition.events).toContainEqual({ type: 'game-over', reason: 'lock-out' });
    const locked = transition.events.find((event) => event.type === 'piece-locked');
    expect(locked?.cells).toEqual([
      { x: 4, y: 18 },
      { x: 5, y: 18 },
      { x: 4, y: 19 },
      { x: 5, y: 19 },
    ]);
    expect(transition.state.board[20]?.[4]).toBe('J');
    expect(transition.state.board[20]?.[5]).toBe('L');
  });

  it('starts with no carrier, schedules one only after two locks, and remains seeded', () => {
    const candidates = Array.from({ length: 128 }, (_, index) => index + 1).map((seed) => {
      let state = playingMutation(seed);
      state = lockAndSpawn(state);
      state = lockAndSpawn(state);
      return state;
    });
    const carrierState = candidates.find((state) => state.mutationActiveCarrier !== null);
    expect(carrierState).toBeDefined();
    expect(playingMutation(1).mutationActiveCarrier).toBeNull();
    if (!carrierState) return;

    const replayed = lockAndSpawn(lockAndSpawn(playingMutation(carrierState.seed)));
    expect(replayed.mutationActiveCarrier).toEqual(carrierState.mutationActiveCarrier);
    expect(stateHash(replayed)).toBe(stateHash(carrierState));
  });

  it('predicts the immediate Next carrier without changing the deterministic state', () => {
    for (let seed = 1; seed <= 32; seed += 1) {
      const state = lockAndSpawn(playingMutation(seed));
      const beforeHash = stateHash(state);
      const predicted = {
        body: state.queue[0],
        item: nextMutationPreviewItem(state),
      };
      const spawned = lockAndSpawn(state);
      expect(predicted).toEqual({
        body: spawned.active?.type,
        item: spawned.mutationActiveCarrier?.item ?? null,
      });
      expect(stateHash(state)).toBe(beforeHash);
    }
  });

  it('keeps the body-and-item forecast exact through entry and line-clear delays', () => {
    const active = {
      ...lockAndSpawn(lockAndSpawn(playingMutation(0x7a15))),
      mutationRandomizer: createRandomizer(1),
    };
    const entry = dispatch(active, { type: 'hard-drop' }).state;
    const lineClear = dispatch({
      ...carrierClearState('freeze'),
      pieceCount: 2,
      mutationActiveCarrier: null,
      mutationRandomizer: createRandomizer(1),
    }, { type: 'hard-drop' }).state;

    expect(entry).toMatchObject({ phase: 'entry', active: null });
    expect(lineClear).toMatchObject({ phase: 'line-clear', active: null });

    for (const delayed of [entry, lineClear]) {
      const beforeHash = stateHash(delayed);
      const predicted = {
        body: delayed.queue[0],
        item: nextMutationPreviewItem(delayed),
      };
      expect(predicted.item).not.toBeNull();
      let spawned = delayed;
      for (
        let tick = 0;
        tick < LINE_CLEAR_DELAY_TICKS + ENTRY_DELAY_TICKS + 2 && spawned.active === null;
        tick += 1
      ) {
        spawned = dispatch(spawned, { type: 'tick' }).state;
      }
      expect(predicted).toEqual({
        body: spawned.active?.type,
        item: spawned.mutationActiveCarrier?.item ?? null,
      });
      expect(stateHash(delayed)).toBe(beforeHash);
    }
  });

  it('keeps item draws isolated from the ordinary seven-bag stream', () => {
    const beforeSpawn = lockAndSpawn(playingMutation(0x4217));
    const withCarrierDraw = lockAndSpawn({
      ...beforeSpawn,
      mutationRandomizer: createRandomizer(1),
    });
    const withoutCarrierDraw = lockAndSpawn({
      ...beforeSpawn,
      mode: 'marathon',
      mutationRandomizer: createRandomizer(0xfedc_ba98),
    });

    expect(withCarrierDraw.active?.type).toBe(withoutCarrierDraw.active?.type);
    expect(withCarrierDraw.queue).toEqual(withoutCarrierDraw.queue);
    expect(withCarrierDraw.randomizer).toEqual(withoutCarrierDraw.randomizer);
    expect(withCarrierDraw.mutationRandomizer).not.toEqual(createRandomizer(1));
  });

  it('keeps the item stream outside every non-Mutation replay and hash domain', () => {
    const cases = [
      { mode: 'marathon' as const, endgameId: undefined },
      { mode: 'race' as const, endgameId: undefined },
      { mode: 'endgame' as const, endgameId: 't3r-shaft-01' as const },
    ];
    const commands = [
      { type: 'start' as const },
      { type: 'move' as const, dx: -1 as const },
      { type: 'hard-drop' as const },
      ...Array.from({ length: ENTRY_DELAY_TICKS }, () => ({ type: 'tick' as const })),
    ];

    for (const fixture of cases) {
      let baseline = createInitialState(0x6e71, fixture.mode, fixture.endgameId);
      let isolated = {
        ...baseline,
        mutationRandomizer: createRandomizer(0xdead_beef),
      };

      expect(isolated.mutationRandomizer).not.toEqual(baseline.mutationRandomizer);
      expect(stateHash(isolated)).toBe(stateHash(baseline));

      for (const command of commands) {
        baseline = dispatch(baseline, command).state;
        isolated = dispatch(isolated, command).state;
      }
      expect(isolated.active).toEqual(baseline.active);
      expect(isolated.queue).toEqual(baseline.queue);
      expect(isolated.randomizer).toEqual(baseline.randomizer);
      expect(stateHash(isolated)).toBe(stateHash(baseline));
    }

    const mutation = createInitialState(0x6e71, 'sprint');
    expect(stateHash({
      ...mutation,
      mutationRandomizer: createRandomizer(0xdead_beef),
    })).not.toBe(stateHash(mutation));
  });

  it('lets every ordinary tetromino body carry every Mutation item independently', () => {
    const bodies = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
    const items = ['freeze', 'collapse', 'bomb', 'multiplier'] as const;
    const expected = new Set(bodies.flatMap((body) => items.map((item) => `${body}:${item}`)));
    const observed = new Set<string>();

    // The deterministic sweep samples the real seven-bag and the separate
    // carrier stream after each actual spawn. It protects the product rule
    // that an item is an attachment, never a substitute mapping from one
    // tetromino shape.
    for (let seed = 1; seed <= 4_096 && observed.size < expected.size; seed += 1) {
      let state = playingMutation(seed);
      for (let spawn = 0; spawn < 4 && observed.size < expected.size; spawn += 1) {
        state = lockAndSpawn(state);
        const body = state.active?.type;
        const item = state.mutationActiveCarrier?.item;
        if (body && item) observed.add(`${body}:${item}`);
      }
    }

    expect(observed).toEqual(expected);
  });

  it('caps Mutation and default Classic gravity at 0.08 seconds per cell', () => {
    expect(gravityForMode('sprint', 0, 0, Number.MAX_SAFE_INTEGER)).toBe(MUTATION_GRAVITY_TICKS.at(-1));
    expect(MUTATION_GRAVITY_TICKS.at(-1)).toBe(TICKS_PER_SECOND * 0.08);
    expect(gravityForMode('marathon', 0, 0, Number.MAX_SAFE_INTEGER)).toBe(TICKS_PER_SECOND * 0.08);
  });

  it('lets any of four marked cells activate one shared carrier identity exactly once', () => {
    const state = carrierClearState('freeze');
    const expectedCarrierCells = cellsForPiece(state.active!);
    const transition = resolveLineClear(state);
    const [activation] = mutationActivations(transition);
    expect(transition.state.mutationFreezeTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(transition.state.mutationCarriers).toEqual([]);
    expect(mutationActivations(transition)).toHaveLength(1);
    expect(activation).toMatchObject({
      type: 'mutation-activated',
      item: 'freeze',
      durationTicks: MUTATION_EFFECT_TICKS,
      score: 0,
      rowsRemoved: 0,
    });
    expect(activation?.triggerCells).toEqual(expectedCarrierCells);
  });

  it('aggregates repeated item cues in first-seen order while applying every timer and multiplier carrier', () => {
    const transition = resolveLineClear({
      ...carrierClearState('collapse'),
      mutationCarriers: [
        { id: 1, item: 'freeze', cells: [{ x: 0, y: 39 }] },
        { id: 2, item: 'freeze', cells: [{ x: 1, y: 39 }] },
        { id: 3, item: 'multiplier', cells: [{ x: 2, y: 39 }] },
        { id: 4, item: 'multiplier', cells: [{ x: 3, y: 39 }] },
      ],
    });
    const activations = mutationActivations(transition);

    expect(activations.map((event) => event.item)).toEqual(['freeze', 'multiplier', 'collapse']);
    expect(activations.filter((event) => event.item === 'freeze')).toHaveLength(1);
    expect(activations.filter((event) => event.item === 'multiplier')).toHaveLength(1);
    expect(transition.state.mutationFreezeTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(transition.state.mutationCollapsePiecesRemaining).toBe(MUTATION_SUPERGRAVITY_PIECES - 1);
    expect(transition.state.mutationCollapseLandingLatched).toBe(true);
    expect(activations.find((event) => event.item === 'collapse')).toMatchObject({
      durationTicks: 0,
      coveredPieces: MUTATION_SUPERGRAVITY_PIECES,
    });
    expect(transition.state.mutationMultiplierTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(transition.state.mutationMultiplierFactor).toBe(4);

    const freeze = activations[0]!;
    expect(freeze.triggerCells).toEqual([{ x: 0, y: 39 }, { x: 1, y: 39 }]);
    expect(Object.isFrozen(freeze.triggerCells)).toBe(true);
    expect(freeze.triggerCells?.every((cell) => Object.isFrozen(cell))).toBe(true);
    expect(activations[1]?.multiplierFactor).toBe(4);
  });

  it('resolves and presents Bomb before simultaneous timed effects', () => {
    const transition = resolveLineClear({
      ...carrierClearState('collapse'),
      mutationCarriers: [
        { id: 1, item: 'freeze', cells: [{ x: 0, y: 39 }] },
        { id: 2, item: 'bomb', cells: [{ x: 1, y: 39 }] },
        { id: 3, item: 'multiplier', cells: [{ x: 2, y: 39 }] },
      ],
    });

    expect(mutationActivations(transition).map((event) => event.item)).toEqual([
      'bomb',
      'freeze',
      'multiplier',
      'collapse',
    ]);
    expect(transition.events.find((event) => event.type === 'mutation-activated')).toMatchObject({ item: 'bomb' });
    expect(transition.state.lines).toBe(4);
    expect(transition.state.mutationFreezeTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(transition.state.mutationCollapsePiecesRemaining).toBe(MUTATION_SUPERGRAVITY_PIECES - 1);
    expect(transition.state.mutationCollapseLandingLatched).toBe(true);
  });

  it('executes every repeated Bomb mechanically but emits one combined Bomb presentation cue', () => {
    const transition = resolveLineClear({
      ...carrierClearState('freeze'),
      mutationCarriers: [
        { id: 1, item: 'bomb', cells: [{ x: 0, y: 39 }] },
        { id: 2, item: 'bomb', cells: [{ x: 1, y: 39 }] },
      ],
    });
    const activations = mutationActivations(transition);
    const bomb = activations.find((event) => event.item === 'bomb');
    const bombClears = transition.events.filter((event) => (
      event.type === 'lines-cleared'
      && event.rows.length === 3
      && event.rows[0] === 37
    ));

    expect(bombClears).toHaveLength(2);
    expect(transition.state.lines).toBe(7);
    expect(transition.state.score).toBe(40 + MUTATION_BOMB_SCORE * 2);
    expect(activations.filter((event) => event.item === 'bomb')).toHaveLength(1);
    expect(bomb).toMatchObject({
      durationTicks: 0,
      score: MUTATION_BOMB_SCORE * 2,
      rowsRemoved: 6,
      triggerCells: [{ x: 0, y: 39 }, { x: 1, y: 39 }],
    });
  });

  it('retains a pre-clear carrier snapshot when every marked cell disappears', () => {
    const state = fullyClearedCarrierState('freeze');
    const expectedTriggerCells = cellsForPiece(state.active!);
    const transition = resolveLineClear(state);
    const [activation] = mutationActivations(transition);

    expect(transition.state.mutationFreezeTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(transition.state.mutationCarriers).toEqual([]);
    expect(mutationActivations(transition)).toHaveLength(1);
    expect(activation).toMatchObject({
      type: 'mutation-activated',
      item: 'freeze',
      durationTicks: MUTATION_EFFECT_TICKS,
      score: 0,
      rowsRemoved: 0,
    });
    expect(activation?.triggerCells).toEqual(expectedTriggerCells);
    expect(Object.isFrozen(activation?.triggerCells)).toBe(true);
    expect(activation?.triggerCells?.every((cell) => Object.isFrozen(cell))).toBe(true);
  });

  it('queues nested Bomb clears from pre-clear snapshots and removes sibling metadata', () => {
    let state = fullyClearedCarrierState('bomb');
    let board = state.board;
    board = setCell(board, 0, 37, 'L');
    board = setCell(board, 1, 37, 'L');
    state = {
      ...state,
      board,
      mutationCarriers: [{
        id: 4,
        item: 'freeze',
        cells: [{ x: 0, y: 37 }, { x: 1, y: 37 }],
      }],
    };

    const transition = resolveLineClear(state);
    const activations = mutationActivations(transition);

    expect(transition.state.mutationFreezeTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(transition.state.mutationCarriers).toEqual([]);
    expect(activations.filter((event) => event.item === 'bomb')).toHaveLength(1);
    expect(activations.filter((event) => event.item === 'freeze')).toHaveLength(1);
  });

  it('slows Ice gravity to one cell per second and leaves every manual control available', () => {
    const state: GameState = {
      ...playingMutation(),
      mutationFreezeTicks: MUTATION_EFFECT_TICKS,
      gravityTicks: 0,
      gravitySubtickRemainder: 0,
    };
    const initialY = state.active?.y;
    let frozen = state;
    for (let tick = 1; tick < MUTATION_FREEZE_GRAVITY_TICKS; tick += 1) {
      frozen = dispatch(frozen, { type: 'tick' }).state;
    }
    expect(frozen.active?.y).toBe(initialY);
    expect(frozen.gravityTicks).toBe(MUTATION_FREEZE_GRAVITY_TICKS - 1);
    expect(frozen.gravitySubtickRemainder).toBe(0);

    const gravityStep = dispatch(frozen, { type: 'tick' });
    expect(gravityStep.state.active?.y).toBe((initialY ?? 0) + 1);
    expect(gravityStep.state.gravityTicks).toBe(0);
    expect(gravityStep.state.gravitySubtickRemainder).toBe(0);
    expect(gravityStep.events).toContainEqual({
      type: 'piece-moved',
      piece: state.active?.type,
      dx: 0,
      dy: 1,
      cause: 'gravity',
    });

    expect(dispatch(state, { type: 'move', dx: -1 }).state.active?.x).toBe((state.active?.x ?? 0) - 1);
    expect(dispatch(state, { type: 'rotate', direction: 1 }).state.active?.rotation).not.toBe(state.active?.rotation);
    expect(dispatch(state, { type: 'soft-drop' }).state.active?.y).toBe((initialY ?? 0) + 1);
    expect(dispatch(state, { type: 'hard-drop' }).events.some((event) => event.type === 'hard-dropped')).toBe(true);
  });

  it('uses Ice on its final tick, then restores the current Mutation cadence', () => {
    const start: GameState = {
      ...playingMutation(),
      lines: Number.MAX_SAFE_INTEGER,
      mutationFreezeTicks: 1,
      gravityTicks: MUTATION_FREEZE_GRAVITY_TICKS - 1,
      gravitySubtickRemainder: 0,
    };
    const finalIceTick = dispatch(start, { type: 'tick' }).state;
    expect(finalIceTick.active?.y).toBe((start.active?.y ?? 0) + 1);
    expect(finalIceTick.mutationFreezeTicks).toBe(0);
    expect(finalIceTick.gravityTicks).toBe(0);
    expect(finalIceTick.gravitySubtickRemainder).toBe(0);

    let restored = finalIceTick;
    for (let tick = 1; tick < 5; tick += 1) {
      restored = dispatch(restored, { type: 'tick' }).state;
    }
    expect(restored.active?.y).toBe(finalIceTick.active?.y);
    restored = dispatch(restored, { type: 'tick' }).state;
    expect(restored.active?.y).toBe((finalIceTick.active?.y ?? 0) + 1);
    expect(restored.gravitySubtickRemainder).toBe(2);
  });

  it('refreshes Ice while the next post-clear spawn claims one existing Supergravity slot', () => {
    const transition = resolveLineClear({
      ...carrierClearState('freeze'),
      mutationFreezeTicks: 17,
      mutationCollapsePiecesRemaining: 3,
      mutationMultiplierTicks: 321,
      mutationMultiplierFactor: 2,
    });
    expect(transition.state.mutationFreezeTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(transition.state.mutationCollapsePiecesRemaining).toBe(2);
    expect(transition.state.mutationCollapseLandingLatched).toBe(true);
    expect(transition.state.mutationMultiplierTicks).toBe(321 - LINE_CLEAR_DELAY_TICKS);
    expect(transition.state.mutationMultiplierFactor).toBe(2);
  });

  it('refreshes Supergravity to five pieces before the first post-clear spawn claims one', () => {
    const transition = resolveLineClear({
      ...carrierClearState('collapse'),
      mutationCollapsePiecesRemaining: 2,
      mutationFreezeTicks: 123,
      mutationMultiplierTicks: 321,
      mutationMultiplierFactor: 2,
    });
    expect(transition.state.mutationCollapsePiecesRemaining).toBe(MUTATION_SUPERGRAVITY_PIECES - 1);
    expect(transition.state.mutationCollapseLandingLatched).toBe(true);
    expect(transition.state.mutationFreezeTicks).toBe(123 - LINE_CLEAR_DELAY_TICKS);
    expect(transition.state.mutationMultiplierTicks).toBe(321 - LINE_CLEAR_DELAY_TICKS);
    expect(transition.state.mutationMultiplierFactor).toBe(2);
    expect(mutationActivations(transition)).toContainEqual(expect.objectContaining({
      item: 'collapse',
      durationTicks: 0,
      coveredPieces: MUTATION_SUPERGRAVITY_PIECES,
    }));
  });

  it('uses a bomb to remove the bottom three rows, award points, and advance speed progress', () => {
    let state = carrierClearState('bomb');
    let board = state.board;
    board = setCell(board, 0, 37, 'L');
    board = setCell(board, 1, 38, 'S');
    state = { ...state, board };
    const transition = resolveLineClear(state);

    expect(transition.state.lines).toBe(4);
    expect(transition.state.score).toBe(40 + MUTATION_BOMB_SCORE);
    expect(transition.state.board.flat().every((cell) => cell === null)).toBe(true);
    expect(transition.events).toContainEqual({ type: 'lines-cleared', rows: [37, 38, 39], count: 3, score: MUTATION_BOMB_SCORE });
    expect(mutationActivations(transition).find((event) => event.item === 'bomb')).toMatchObject({
      type: 'mutation-activated',
      item: 'bomb',
      durationTicks: 0,
      score: MUTATION_BOMB_SCORE,
      rowsRemoved: 3,
    });
  });

  it('promotes multiplier from Double to Super Double, refreshes it, and restores normal scoring on expiry', () => {
    const first = resolveLineClear(carrierClearState('multiplier'));
    expect(first.state.mutationMultiplierFactor).toBe(2);
    expect(first.state.mutationMultiplierTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(mutationActivations(first)[0]?.multiplierFactor).toBe(2);

    const promoted = resolveLineClear({
      ...carrierClearState('multiplier'),
      mutationMultiplierTicks: MUTATION_EFFECT_TICKS,
      mutationMultiplierFactor: 2,
    });
    expect(promoted.state.score).toBe(80);
    expect(promoted.state.mutationMultiplierFactor).toBe(4);
    expect(promoted.state.mutationMultiplierTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(mutationActivations(promoted)[0]?.multiplierFactor).toBe(4);

    const extended = resolveLineClear({
      ...carrierClearState('multiplier'),
      mutationMultiplierTicks: MUTATION_EFFECT_TICKS,
      mutationMultiplierFactor: 4,
    });
    expect(extended.state.score).toBe(160);
    expect(extended.state.mutationMultiplierFactor).toBe(4);
    expect(extended.state.mutationMultiplierTicks).toBe(MUTATION_EFFECT_TICKS);
    expect(mutationActivations(extended)[0]?.multiplierFactor).toBe(4);

    const expired = dispatch({
      ...playingMutation(),
      mutationMultiplierTicks: 1,
      mutationMultiplierFactor: 4,
    }, { type: 'tick' }).state;
    expect(expired.mutationMultiplierTicks).toBe(0);
    expect(expired.mutationMultiplierFactor).toBe(1);
  });

  it('applies Super Double to ordinary and Bomb item-clear points and includes the factor in the hash', () => {
    const transition = resolveLineClear({
      ...carrierClearState('freeze'),
      mutationMultiplierTicks: MUTATION_EFFECT_TICKS,
      mutationMultiplierFactor: 2,
    });
    expect(transition.state.score).toBe(80);
    expect(stateHash(transition.state)).not.toBe(stateHash({
      ...transition.state,
      mutationMultiplierFactor: 4,
    }));

    let bombState = carrierClearState('bomb');
    let board = bombState.board;
    board = setCell(board, 0, 37, 'L');
    board = setCell(board, 1, 38, 'S');
    bombState = {
      ...bombState,
      board,
      mutationMultiplierTicks: MUTATION_EFFECT_TICKS,
      mutationMultiplierFactor: 4,
    };
    const bomb = resolveLineClear(bombState);
    expect(bomb.state.score).toBe((40 + MUTATION_BOMB_SCORE) * 4);
  });

  it('settles only the supplied Supergravity piece columns against fixed support', () => {
    let board = createBoard();
    board = setCell(board, 0, 34, 'T');
    board = setCell(board, 8, 34, 'J');
    const before = board.map((row) => [...row]);
    const sourceCells = [
      { x: 8, y: 32 },
      { x: 9, y: 32 },
      { x: 8, y: 33 },
      { x: 9, y: 33 },
    ];

    const first = settleSupergravityPiece(board, sourceCells, 'O');
    const second = settleSupergravityPiece(board, sourceCells, 'O');
    expect(first).toEqual(second);
    expect(board).toEqual(before);
    expect(first.cells).toEqual([
      { x: 8, y: 32 },
      { x: 9, y: 38 },
      { x: 8, y: 33 },
      { x: 9, y: 39 },
    ]);
    expect(first.board[34]?.[0]).toBe('T');
    expect(first.board[34]?.[8]).toBe('J');
    expect(first.board[39]?.[8]).toBeNull();
    expect(first.board[39]?.[9]).toBe('O');
  });

  it('rejects Supergravity overlap or out-of-bounds input without changing the board', () => {
    const board = setCell(createBoard(), 4, 20, 'T');
    const before = board.map((row) => [...row]);
    expect(() => settleSupergravityPiece(board, [{ x: 4, y: 20 }], 'O'))
      .toThrow('through an occupied board cell');
    expect(() => settleSupergravityPiece(board, [{ x: -1, y: 20 }], 'O'))
      .toThrow('outside the canonical board');
    expect(board).toEqual(before);
  });
});
