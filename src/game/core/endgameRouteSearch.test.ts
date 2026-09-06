import { describe, expect, it } from 'vitest';
import phase7Batch2File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-11-20.json';
import t32Changed01To03File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-01-03.json';
import t32Changed10File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-10.json';
import t32Changed46To50File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-46-50-r2.json';
import { createInitialState, dispatch, stateHash } from './engine';
import { getEndgameDefinition, type EndgameDefinition } from './endgames';
import {
  ENDGAME_PROOF_INTERVAL_BOUND_TESTING,
  ENDGAME_PROOF_FRONTIER_TESTING,
  decodeEndgameRoute,
  encodeEndgameRoute,
  exhaustiveEndgameLandings,
  findEndgameAlternativeRoute,
  findEndgameRoute,
  metricsForEndgameRoute,
  endgameLandings,
  endgameRouteLockLowerBound,
  endgameRouteStateKey,
  replayEndgameRoute,
  replayEndgameRouteForDefinition,
} from './endgameRouteSearch';
import {
  BEDROCK_CELL,
  SURVIVAL_STONE_CELL,
  type Board,
  type GameCommand,
  type GameState,
  type EndgameId,
} from './types';

type RecordedRoute = {
  id: 'primary' | 'alternate';
  commandStream: string;
  locks: number;
};

type RecordedLevel = {
  id: EndgameId;
  firstDivergenceLock: number;
  routes: readonly [RecordedRoute, RecordedRoute];
};

const phase7Batch2 = phase7Batch2File as unknown as { levels: readonly RecordedLevel[] };
const t32Changed01To03 = t32Changed01To03File as unknown as { levels: readonly RecordedLevel[] };
const t32Changed10 = t32Changed10File as unknown as { levels: readonly RecordedLevel[] };
const t32Changed46To50 = t32Changed46To50File as unknown as { levels: readonly RecordedLevel[] };

function startedEndgame(levelId: EndgameId): GameState {
  return dispatch(createInitialState(0x51a1f00d, 'endgame', levelId), { type: 'start' }).state;
}

function startedEndgameDefinition(definition: EndgameDefinition): GameState {
  return dispatch(createInitialState(
    0x51a1f00d,
    'endgame',
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

describe('Phase-7 Endgame route search', () => {
  it('finds a legal Core path for a deep current endgame without introducing a product-side lock budget', () => {
    const level = phase7Batch2.levels.find(({ id }) => id === 't6r-keystone-20')!;
    const result = findEndgameRoute(level.id, { maxLocks: 30, beamWidth: 900 });

    expect(result?.state.status).toBe('finished');
    expect(result?.state.endgameCompletion).toBe('finished');
    expect(result?.locks.length).toBeGreaterThan(0);
    expect(result?.locks.length).toBeLessThanOrEqual(30);
  }, 120_000);

  it('can exclude the primary opening landing and recover a distinct first-lock solution through the same public move domain', () => {
    const level = t32Changed01To03.levels.find(({ id }) => id === 't3r-shaft-01')!;
    const primary = level.routes.find((route) => route.id === 'primary')!;
    const result = findEndgameAlternativeRoute(level.id, primary.commandStream, {
      maxLocks: primary.locks + 8,
      beamWidth: 900,
    });
    const stream = result.alternative ? encodeEndgameRoute(result.alternative.commands) : '';

    expect(result.firstDivergenceLock).toBe(1);
    expect(result.alternative?.state.endgameCompletion).toBe('finished');
    expect(metricsForEndgameRoute(stream).locks).toBeLessThanOrEqual(primary.locks + 8);
    expect(result.canonical.locks[0]?.signature).not.toBe(result.alternative?.locks[0]?.signature);
  }, 120_000);

  it('round-trips the recorded alternate through compact public tokens without changing its landing count', () => {
    const level = t32Changed46To50.levels.find(({ id }) => id === 'tm-endgame-50')!;
    const alternate = level.routes.find((route) => route.id === 'alternate')!;
    const replay = replayEndgameRoute(level.id, alternate.commandStream);
    expect(encodeEndgameRoute(replay.commands)).toBe(alternate.commandStream);
    expect(replay.locks).toHaveLength(alternate.locks);
    expect(replay.state.endgameCompletion).toBe('finished');
  });

  it('keeps legacy route tokens stable and adds an explicit counter-clockwise token', () => {
    const legacy = 'STLRCDH';
    expect(encodeEndgameRoute(decodeEndgameRoute(legacy))).toBe(legacy);
    expect(decodeEndgameRoute('Q')).toEqual([{ type: 'rotate', direction: -1 }]);
    expect(encodeEndgameRoute([{ type: 'rotate', direction: -1 }])).toBe('Q');
    expect(metricsForEndgameRoute('SCQQH')).toMatchObject({ locks: 1, rotationCount: 3 });
    expect(() => decodeEndgameRoute('X')).toThrow('Unknown Endgame route token');
  });

  it('covers a counter-clockwise SRS landing that the clockwise-only public domain cannot reach', () => {
    let lowered = startedEndgame('t5r-drift-08');
    for (let index = 0; index < 16; index += 1) {
      lowered = dispatch(lowered, { type: 'soft-drop' }).state;
    }
    const compact = endgameLandings(lowered);
    expect(compact.some((landing) => (
      landing.commands.some((command) => command.type === 'rotate' && command.direction === -1)
    ))).toBe(true);

    const exhaustive = exhaustiveEndgameLandings(lowered);
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
    const base = startedEndgame('t5r-arc-13');
    const support = Object.freeze([{ x: 1, y: 10 }, { x: 9, y: 2 }]);
    const reversed = Object.freeze([...support].reverse());
    const different = Object.freeze([{ x: 1, y: 10 }, { x: 8, y: 2 }]);

    expect(endgameRouteStateKey({ ...base, endgameAnchorSupportedCells: support }))
      .toBe(endgameRouteStateKey({ ...base, endgameAnchorSupportedCells: reversed }));
    expect(endgameRouteStateKey({ ...base, endgameAnchorSupportedCells: support }).split('~')[2])
      .toBe('9,2|1,10');
    expect(endgameRouteStateKey({ ...base, endgameAnchorSupportedCells: support }))
      .not.toBe(endgameRouteStateKey({ ...base, endgameAnchorSupportedCells: different }));
  });

  it('uses the deficit bound only for states without anchors or supported cells', () => {
    const ordinary = startedEndgame('t5r-arc-13');
    const anchored = startedEndgame('t5r-drift-08');
    const supported = {
      ...ordinary,
      endgameAnchorSupportedCells: Object.freeze([{ x: 2, y: 30 }]),
    };

    expect(endgameRouteLockLowerBound(ordinary)).toBeGreaterThan(0);
    expect(endgameRouteLockLowerBound(anchored)).toBe(0);
    expect(endgameRouteLockLowerBound(supported)).toBe(0);
  });

  it('uses future-piece interval capacity only as a conservative long-proof deficit bound', () => {
    const ordinary = startedEndgame('t5r-arc-13');
    const board = ordinary.board.map((row) => row.map(() => null as null | 'T'));
    const targets: { x: number; y: number }[] = [];
    for (let y = 36; y < 40; y += 1) {
      for (let x = 1; x < 10; x += 1) {
        board[y]![x] = 'T';
        targets.push({ x, y });
      }
    }
    const constrained: GameState = {
      ...ordinary,
      board,
      active: { type: 'O', rotation: 0, x: 4, y: 19 },
      queue: ['O', 'O', 'O', 'O', 'O'],
      endgameTargetCells: Object.freeze(targets),
      endgameAnchorSupportedCells: Object.freeze([]),
    };

    expect(endgameRouteLockLowerBound(constrained)).toBe(1);
    expect(ENDGAME_PROOF_INTERVAL_BOUND_TESTING.cannotFinishWithin(constrained, 1)).toBe(true);
    expect(ENDGAME_PROOF_INTERVAL_BOUND_TESTING.cannotFinishWithin({
      ...constrained,
      active: { type: 'I', rotation: 0, x: 3, y: 19 },
    }, 1)).toBe(false);

    const sparseBoard = ordinary.board.map((row) => row.map(() => null as null | 'T'));
    const sparseTargets: { x: number; y: number }[] = [];
    for (let y = 36; y < 40; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        if ((x === 0 && y < 38) || (x === 9 && y >= 38)) continue;
        sparseBoard[y]![x] = 'T';
        sparseTargets.push({ x, y });
      }
    }
    const sparse: GameState = {
      ...constrained,
      board: sparseBoard,
      endgameTargetCells: Object.freeze(sparseTargets),
    };
    expect(endgameRouteLockLowerBound(sparse)).toBe(1);
    expect(ENDGAME_PROOF_INTERVAL_BOUND_TESTING.cannotFinishWithin(sparse, 1)).toBe(true);
  });

  it('round-trips only canonical proof decisions and rejects lossy board materials', () => {
    const raw = startedEndgame('t5r-arc-13');
    const started = {
      ...raw,
      endgameUndoHistory: Object.freeze([]),
      endgameActiveSpawnCheckpoint: null,
    };
    const key = ENDGAME_PROOF_FRONTIER_TESTING.encode(started, started);
    const decoded = ENDGAME_PROOF_FRONTIER_TESTING.decode(key, started);
    expect(key).toMatch(/^p1\.[A-Za-z0-9_-]+$/);
    expect(key.length).toBeLessThan(endgameRouteStateKey(started).length);
    expect(Math.max(...started.endgameTargetCells.map((cell) => cell.y * 10 + cell.x))).toBeGreaterThan(0xff);
    expect(ENDGAME_PROOF_FRONTIER_TESTING.encode(decoded, started)).toBe(key);
    expect(Object.keys(ENDGAME_PROOF_FRONTIER_TESTING.fieldPolicy).sort())
      .toEqual(Object.keys(started).sort());

    const recoloredBoard = started.board.map((row) => [...row]);
    const recolored = started.endgameTargetCells[0]!;
    recoloredBoard[recolored.y]![recolored.x] = 'Z';
    expect(ENDGAME_PROOF_FRONTIER_TESTING.encode({
      ...started,
      board: recoloredBoard,
      endgameTargetCells: Object.freeze([...started.endgameTargetCells].reverse()),
      endgameAnchorSupportedCells: Object.freeze([...started.endgameAnchorSupportedCells].reverse()),
    }, started)).toBe(key);

    const multiBytePieceCount = { ...started, pieceCount: 130, endgameSpawnCount: 131 };
    const multiByteKey = ENDGAME_PROOF_FRONTIER_TESTING.encode(multiBytePieceCount, started);
    expect(ENDGAME_PROOF_FRONTIER_TESTING.decode(multiByteKey, started)).toMatchObject({
      pieceCount: 130,
      endgameSpawnCount: 131,
    });

    const bitmapBoard: Board = started.board.map((row) => row.map((cell) => (cell === 'A' ? cell : null)));
    const bitmapTargets: { x: number; y: number }[] = [];
    for (let y = bitmapBoard.length - 4; y < bitmapBoard.length; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        if (bitmapBoard[y]![x] !== null) continue;
        bitmapBoard[y]![x] = 'T';
        bitmapTargets.push({ x, y });
      }
    }
    expect(bitmapTargets).toHaveLength(32);
    const bitmapState = {
      ...started,
      board: bitmapBoard,
      endgameTargetCells: Object.freeze(bitmapTargets),
      endgameAnchorSupportedCells: Object.freeze([]),
    };
    const bitmapKey = ENDGAME_PROOF_FRONTIER_TESTING.encode(bitmapState, started);
    const bitmapDecoded = ENDGAME_PROOF_FRONTIER_TESTING.decode(bitmapKey, started);
    expect(bitmapKey.length).toBeLessThan(200);
    expect(bitmapDecoded.endgameTargetCells).toEqual(bitmapTargets);

    const occupied = started.endgameTargetCells[0]!;
    for (const material of [BEDROCK_CELL, SURVIVAL_STONE_CELL]) {
      const board = started.board.map((row) => [...row]);
      board[occupied.y]![occupied.x] = material;
      expect(() => ENDGAME_PROOF_FRONTIER_TESTING.encode({ ...started, board }, started))
        .toThrow('Bedrock, Survival stone, or unknown material');
    }
    expect(() => ENDGAME_PROOF_FRONTIER_TESTING.decode(`${key}~extra`, started))
      .toThrow('non-Base64URL character');
    expect(() => ENDGAME_PROOF_FRONTIER_TESTING.decode(key.replace(/^p1\./, 'p2.'), started))
      .toThrow('unknown compact codec prefix');
    expect(() => ENDGAME_PROOF_FRONTIER_TESTING.decode(key.slice(0, -1), started)).toThrow();
  });

  it('replays one- and two-anchor definitions through the same six-lock public route', () => {
    const level = t32Changed10.levels.find(({ id }) => id === 't5r-drift-08')!;
    const route = level.routes.find(({ id }) => id === 'primary')!.commandStream;
    const oneAnchor = getEndgameDefinition(level.id);
    const twoAnchors: EndgameDefinition = Object.freeze({
      ...oneAnchor,
      anchorCells: Object.freeze([...oneAnchor.anchorCells, { x: 4, y: 16 }]),
    });

    expect(stateHash(startedEndgameDefinition(oneAnchor))).toBe('9aff892c');
    expect(stateHash(startedEndgameDefinition(twoAnchors))).toBe('79e3ebac');
    for (const definition of [oneAnchor, twoAnchors]) {
      const replay = replayEndgameRouteForDefinition(definition, route);
      expect(replay.locks).toHaveLength(6);
      expect(replay.state.status).toBe('finished');
      expect(replay.state.endgameCompletion).toBe('finished');
      expect(replay.state.endgameTargetCells).toHaveLength(0);
      expect(replay.state.endgameAnchorSupportedCells).toHaveLength(4);
    }
  });
});
