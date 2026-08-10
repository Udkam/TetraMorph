import { describe, expect, it } from 'vitest';
import phase7Batch2File from '../../../docs/workstreams/tetris-t15-puzzle/puzzle-levels-11-20.json';
import t32Changed01To03File from '../../../docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-01-03.json';
import t32Changed10File from '../../../docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-10.json';
import t32Changed46To50File from '../../../docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-46-50-r2.json';
import { createInitialState, dispatch, stateHash } from './engine';
import { getPuzzleDefinition, type PuzzleDefinition } from './puzzles';
import {
  decodePuzzleRoute,
  encodePuzzleRoute,
  exhaustivePuzzleLandings,
  findPuzzleAlternativeRoute,
  findPuzzleRoute,
  metricsForPuzzleRoute,
  puzzleLandings,
  puzzleRouteLockLowerBound,
  puzzleRouteStateKey,
  replayPuzzleRoute,
  replayPuzzleRouteForDefinition,
} from './puzzleRouteSearch';
import type { GameCommand, GameState, PuzzleId } from './types';

type RecordedRoute = {
  id: 'primary' | 'alternate';
  commandStream: string;
  locks: number;
};

type RecordedLevel = {
  id: PuzzleId;
  firstDivergenceLock: number;
  routes: readonly [RecordedRoute, RecordedRoute];
};

const phase7Batch2 = phase7Batch2File as unknown as { levels: readonly RecordedLevel[] };
const t32Changed01To03 = t32Changed01To03File as unknown as { levels: readonly RecordedLevel[] };
const t32Changed10 = t32Changed10File as unknown as { levels: readonly RecordedLevel[] };
const t32Changed46To50 = t32Changed46To50File as unknown as { levels: readonly RecordedLevel[] };

function startedPuzzle(levelId: PuzzleId): GameState {
  return dispatch(createInitialState(0x51a1f00d, 'puzzle', levelId), { type: 'start' }).state;
}

function startedPuzzleDefinition(definition: PuzzleDefinition): GameState {
  return dispatch(createInitialState(
    0x51a1f00d,
    'puzzle',
    definition.id,
    undefined,
    undefined,
    definition,
  ), { type: 'start' }).state;
}

function publicLandingSignatures(
  state: GameState,
  plannerCommands: readonly GameCommand[],
): ReadonlySet<string> {
  const queue: GameState[] = [state];
  const activeKey = (candidate: GameState) => {
    const active = candidate.active;
    return active ? `${active.type}:${active.rotation}:${active.x}:${active.y}` : 'none';
  };
  const seen = new Set([activeKey(state)]);
  const signatures = new Set<string>();

  for (let index = 0; index < queue.length; index += 1) {
    const parent = queue[index]!;
    const dropped = dispatch(parent, { type: 'hard-drop' });
    for (const event of dropped.events) {
      if (event.type !== 'piece-locked') continue;
      signatures.add(`${event.piece}:${[...event.cells]
        .sort((left, right) => left.y - right.y || left.x - right.x)
        .map((cell) => `${cell.x},${cell.y}`)
        .join('|')}`);
      break;
    }

    for (const command of plannerCommands) {
      const transition = dispatch(parent, command);
      if (
        transition.state === parent
        || transition.state.status !== 'playing'
        || transition.state.phase !== 'active'
        || transition.state.active === null
      ) continue;
      const key = activeKey(transition.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(transition.state);
    }
  }
  return signatures;
}

describe('Phase-7 Puzzle route search', () => {
  it('finds a legal Core path for a deep current endgame without introducing a product-side lock budget', () => {
    const level = phase7Batch2.levels.find(({ id }) => id === 't6r-keystone-20')!;
    const result = findPuzzleRoute(level.id, { maxLocks: 30, beamWidth: 900 });

    expect(result?.state.status).toBe('finished');
    expect(result?.state.puzzleCompletion).toBe('finished');
    expect(result?.locks.length).toBeGreaterThan(0);
    expect(result?.locks.length).toBeLessThanOrEqual(30);
  }, 120_000);

  it('can exclude the primary opening landing and recover a distinct first-lock solution through the same public move domain', () => {
    const level = t32Changed01To03.levels.find(({ id }) => id === 't3r-shaft-01')!;
    const primary = level.routes.find((route) => route.id === 'primary')!;
    const result = findPuzzleAlternativeRoute(level.id, primary.commandStream, {
      maxLocks: primary.locks + 8,
      beamWidth: 900,
    });
    const stream = result.alternative ? encodePuzzleRoute(result.alternative.commands) : '';

    expect(result.firstDivergenceLock).toBe(1);
    expect(result.alternative?.state.puzzleCompletion).toBe('finished');
    expect(metricsForPuzzleRoute(stream).locks).toBeLessThanOrEqual(primary.locks + 8);
    expect(result.canonical.locks[0]?.signature).not.toBe(result.alternative?.locks[0]?.signature);
  }, 120_000);

  it('round-trips the recorded alternate through compact public tokens without changing its landing count', () => {
    const level = t32Changed46To50.levels.find(({ id }) => id === 'tm-puzzle-50')!;
    const alternate = level.routes.find((route) => route.id === 'alternate')!;
    const replay = replayPuzzleRoute(level.id, alternate.commandStream);
    expect(encodePuzzleRoute(replay.commands)).toBe(alternate.commandStream);
    expect(replay.locks).toHaveLength(alternate.locks);
    expect(replay.state.puzzleCompletion).toBe('finished');
  });

  it('keeps legacy route tokens stable and adds an explicit counter-clockwise token', () => {
    const legacy = 'STLRCDH';
    expect(encodePuzzleRoute(decodePuzzleRoute(legacy))).toBe(legacy);
    expect(decodePuzzleRoute('Q')).toEqual([{ type: 'rotate', direction: -1 }]);
    expect(encodePuzzleRoute([{ type: 'rotate', direction: -1 }])).toBe('Q');
    expect(metricsForPuzzleRoute('SCQQH')).toMatchObject({ locks: 1, rotationCount: 3 });
    expect(() => decodePuzzleRoute('X')).toThrow('Unknown Puzzle route token');
  });

  it('covers a counter-clockwise SRS landing that the clockwise-only public domain cannot reach', () => {
    let lowered = startedPuzzle('t5r-drift-08');
    for (let index = 0; index < 16; index += 1) {
      lowered = dispatch(lowered, { type: 'soft-drop' }).state;
    }
    const compact = puzzleLandings(lowered);
    expect(compact.some((landing) => (
      landing.commands.some((command) => command.type === 'rotate' && command.direction === -1)
    ))).toBe(true);

    const exhaustive = exhaustivePuzzleLandings(lowered);
    const signature = 'S:0,32|0,33|1,33|1,34';
    const matches = exhaustive.filter((landing) => landing.lock.signature === signature);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((landing) => (
      landing.commands.some((command) => command.type === 'rotate' && command.direction === -1)
    ))).toBe(true);

    const completeDomain = publicLandingSignatures(lowered, [
      { type: 'rotate', direction: 1 },
      { type: 'rotate', direction: -1 },
      { type: 'move', dx: -1 },
      { type: 'move', dx: 1 },
      { type: 'soft-drop' },
    ]);
    const clockwiseOnlyDomain = publicLandingSignatures(lowered, [
      { type: 'rotate', direction: 1 },
      { type: 'move', dx: -1 },
      { type: 'move', dx: 1 },
      { type: 'soft-drop' },
    ]);
    expect(completeDomain).toContain(signature);
    expect(clockwiseOnlyDomain).not.toContain(signature);
    expect(completeDomain.size).toBe(clockwiseOnlyDomain.size + 1);
  });

  it('canonicalizes anchor support in proof identity without merging distinct masks', () => {
    const base = startedPuzzle('t5r-arc-13');
    const support = Object.freeze([{ x: 1, y: 10 }, { x: 9, y: 2 }]);
    const reversed = Object.freeze([...support].reverse());
    const different = Object.freeze([{ x: 1, y: 10 }, { x: 8, y: 2 }]);

    expect(puzzleRouteStateKey({ ...base, puzzleAnchorSupportedCells: support }))
      .toBe(puzzleRouteStateKey({ ...base, puzzleAnchorSupportedCells: reversed }));
    expect(puzzleRouteStateKey({ ...base, puzzleAnchorSupportedCells: support }).split('~')[2])
      .toBe('9,2|1,10');
    expect(puzzleRouteStateKey({ ...base, puzzleAnchorSupportedCells: support }))
      .not.toBe(puzzleRouteStateKey({ ...base, puzzleAnchorSupportedCells: different }));
  });

  it('uses the deficit bound only for states without anchors or supported cells', () => {
    const ordinary = startedPuzzle('t5r-arc-13');
    const anchored = startedPuzzle('t5r-drift-08');
    const supported = {
      ...ordinary,
      puzzleAnchorSupportedCells: Object.freeze([{ x: 2, y: 30 }]),
    };

    expect(puzzleRouteLockLowerBound(ordinary)).toBeGreaterThan(0);
    expect(puzzleRouteLockLowerBound(anchored)).toBe(0);
    expect(puzzleRouteLockLowerBound(supported)).toBe(0);
  });

  it('replays one- and two-anchor definitions through the same six-lock public route', () => {
    const level = t32Changed10.levels.find(({ id }) => id === 't5r-drift-08')!;
    const route = level.routes.find(({ id }) => id === 'primary')!.commandStream;
    const oneAnchor = getPuzzleDefinition(level.id);
    const twoAnchors: PuzzleDefinition = Object.freeze({
      ...oneAnchor,
      anchorCells: Object.freeze([...oneAnchor.anchorCells, { x: 4, y: 16 }]),
    });

    expect(stateHash(startedPuzzleDefinition(oneAnchor))).toBe('e9b71c20');
    expect(stateHash(startedPuzzleDefinition(twoAnchors))).toBe('696f86a0');
    for (const definition of [oneAnchor, twoAnchors]) {
      const replay = replayPuzzleRouteForDefinition(definition, route);
      expect(replay.locks).toHaveLength(6);
      expect(replay.state.status).toBe('finished');
      expect(replay.state.puzzleCompletion).toBe('finished');
      expect(replay.state.puzzleTargetCells).toHaveLength(0);
      expect(replay.state.puzzleAnchorSupportedCells).toHaveLength(4);
    }
  });
});
