import { describe, expect, it } from 'vitest';
import intro04Fixture from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-04.json';
import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';
import { createInitialState, dispatch, stateHash } from './engine';
import { ENDGAME_V3_INTRO_DRAFTS } from './endgameV3IntroDefinitions';
import { getEndgameDefinition, type EndgameDefinition } from './endgames';
import {
  ENDGAME_PROOF_FRONTIER_TESTING,
  certifyOptimalEndgameRouteForDefinition,
  decodeEndgameRoute,
  encodeEndgameRoute,
  endgameRouteLockLowerBound,
  endgameRouteStateKey,
  exhaustiveEndgameLandings,
  type EndgameOptimalRouteDepthRecord,
} from './endgameRouteSearch';
import { cellsForPiece } from './pieces';
import type { GameState } from './types';

type FieldExpectation = 'encoded' | 'invariant' | 'quotient' | 'canonical-decision';

const FIELD_EXPECTATIONS = {
  board: 'encoded',
  active: 'encoded',
  queue: 'encoded',
  score: 'quotient',
  lines: 'quotient',
  combo: 'quotient',
  level: 'quotient',
  mode: 'invariant',
  classicStartingGravityTicks: 'invariant',
  classicGravityFloorTicks: 'invariant',
  endgameId: 'invariant',
  endgameTargetLines: 'quotient',
  endgameTargetCells: 'encoded',
  endgameInitialTargetCount: 'invariant',
  endgameAnchorSupportedCells: 'encoded',
  endgameBoardRows: 'invariant',
  endgameQueue: 'quotient',
  endgameQueueIndex: 'quotient',
  endgameSpawnCount: 'encoded',
  endgameGoal: 'invariant',
  endgameCompletion: 'invariant',
  endgameUndoHistory: 'canonical-decision',
  endgameActiveSpawnCheckpoint: 'canonical-decision',
  completedLevelId: 'quotient',
  nextUnlockedLevelId: 'quotient',
  pieceCount: 'encoded',
  survivalBedrockRows: 'invariant',
  survivalPressureTicks: 'invariant',
  survivalRisePending: 'invariant',
  survivalRiseCount: 'invariant',
  survivalDebris: 'invariant',
  survivalDebrisNextId: 'invariant',
  survivalDebrisPiecesRemaining: 'invariant',
  survivalDebrisPieceInterval: 'invariant',
  survivalDebrisSpawnCount: 'invariant',
  survivalDebrisWarningColumns: 'invariant',
  survivalDebrisWarningHeight: 'invariant',
  survivalDebrisWarningTicks: 'invariant',
  survivalDebrisFallProgress: 'invariant',
  survivalDebrisRandomizer: 'invariant',
  mutationActiveCarrier: 'invariant',
  mutationRandomizer: 'invariant',
  mutationCarriers: 'invariant',
  mutationNextCarrierId: 'invariant',
  mutationFreezeTicks: 'invariant',
  mutationCollapsePiecesRemaining: 'invariant',
  mutationCollapseLandingLatched: 'invariant',
  mutationMultiplierTicks: 'invariant',
  mutationMultiplierFactor: 'invariant',
  mutationLastItem: 'invariant',
  mutationLastItemTicks: 'invariant',
  status: 'encoded',
  phase: 'encoded',
  phaseTicks: 'canonical-decision',
  pendingClearRows: 'canonical-decision',
  gravityTicks: 'canonical-decision',
  gravitySubtickRemainder: 'canonical-decision',
  lockTicks: 'canonical-decision',
  lockResets: 'canonical-decision',
  elapsedTicks: 'quotient',
  randomizer: 'encoded',
  seed: 'invariant',
} as const satisfies Readonly<Record<keyof GameState, FieldExpectation>>;

const draft = ENDGAME_V3_INTRO_DRAFTS[3]!;
const fixture = intro04Fixture as {
  optimalLockedPieces: number;
  optimalRoute: string;
  proof: { exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[] };
};

function started(definition: EndgameDefinition): GameState {
  const state = dispatch(createInitialState(
    0x51a1f00d,
    'endgame',
    definition.id,
    undefined,
    undefined,
    definition,
  ), { type: 'start' }).state;
  return {
    ...state,
    endgameUndoHistory: Object.freeze([]),
    endgameActiveSpawnCheckpoint: null,
  };
}

function active(state: GameState): boolean {
  return state.status === 'playing' && state.phase === 'active' && state.active !== null;
}

function observation(state: GameState) {
  const replayLock = (commands: Parameters<typeof encodeEndgameRoute>[0]) => {
    let replayed = state;
    const locks = [] as { piece: string; cells: readonly { x: number; y: number }[] }[];
    for (const command of commands) {
      const transition = dispatch(replayed, command);
      locks.push(...transition.events.filter((event) => event.type === 'piece-locked').map((event) => ({
        piece: event.piece,
        cells: [...event.cells].sort((left, right) => left.y - right.y || left.x - right.x),
      })));
      replayed = transition.state;
    }
    return { locks, successorKey: endgameRouteStateKey(replayed) };
  };
  return {
    lowerBound: endgameRouteLockLowerBound(state),
    landings: exhaustiveEndgameLandings(state).map((landing) => {
      const replayed = replayLock(landing.commands);
      expect(replayed.locks).toEqual([{ piece: landing.lock.piece, cells: landing.lock.cells }]);
      expect(replayed.successorKey).toBe(endgameRouteStateKey(landing.state));
      return {
        commands: encodeEndgameRoute(landing.commands),
        finished: landing.state.status === 'finished',
        pieceLocked: replayed.locks[0],
        signature: landing.lock.signature,
        successorKey: replayed.successorKey,
      };
    }).sort((left, right) => left.signature.localeCompare(right.signature)
      || left.commands.localeCompare(right.commands)),
  };
}

function differentValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value];
  if (value === null) return Object.freeze({ proofMutation: true });
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return value + 1;
  if (typeof value === 'string') return `${value}-changed`;
  if (typeof value === 'object') return { ...value };
  throw new Error('Unhandled proof field value.');
}

function referenceBfs(
  initial: GameState,
  optimalLocks: number,
  representation: 'object' | 'key',
): { depths: readonly EndgameOptimalRouteDepthRecord[]; shorterWin: boolean } {
  const template = initial;
  let frontier: (GameState | string)[] = [
    representation === 'key'
      ? ENDGAME_PROOF_FRONTIER_TESTING.encode(template, template)
      : template,
  ];
  const depths: EndgameOptimalRouteDepthRecord[] = [];
  for (let depth = 0; depth < optimalLocks - 1 && frontier.length > 0; depth += 1) {
    const next = new Map<string, GameState | string>();
    let transitions = 0;
    let boundPrunes = 0;
    for (const stored of frontier) {
      const parent = typeof stored === 'string'
        ? ENDGAME_PROOF_FRONTIER_TESTING.decode(stored, template)
        : stored;
      if (depth + endgameRouteLockLowerBound(parent) >= optimalLocks) {
        boundPrunes += 1;
        continue;
      }
      for (const landing of exhaustiveEndgameLandings(parent)) {
        transitions += 1;
        if (landing.state.status === 'finished') return { depths, shorterWin: true };
        if (!active(landing.state)) continue;
        const nextDepth = depth + 1;
        if (nextDepth >= optimalLocks - 1) continue;
        if (nextDepth + endgameRouteLockLowerBound(landing.state) >= optimalLocks) {
          boundPrunes += 1;
          continue;
        }
        const key = ENDGAME_PROOF_FRONTIER_TESTING.encode(landing.state, template);
        if (!next.has(key)) next.set(key, representation === 'key' ? key : landing.state);
      }
    }
    depths.push(Object.freeze({
      lockedPieces: depth,
      frontierStates: frontier.length,
      transitions,
      boundPrunes,
    }));
    frontier = [...next.values()];
  }
  return { depths: Object.freeze(depths), shorterWin: false };
}

function decisionAfterLocks(definition: EndgameDefinition, route: string, locksWanted: number): GameState {
  let state = started(definition);
  let locks = 0;
  for (const command of decodeEndgameRoute(route).slice(1)) {
    const transition = dispatch(state, command);
    locks += transition.events.filter((event) => event.type === 'piece-locked').length;
    state = transition.state;
    if (locks === locksWanted && active(state)) return {
      ...state,
      endgameUndoHistory: Object.freeze([]),
      endgameActiveSpawnCheckpoint: null,
    };
  }
  throw new Error(`Route never reached an active decision after ${locksWanted} locks.`);
}

describe('Endgame exact key-frontier proof codec', () => {
  it('classifies every GameState field and rejects every template-invariant mutation', () => {
    const base = started(draft);
    const productionPolicy = ENDGAME_PROOF_FRONTIER_TESTING.fieldPolicy;
    expect(Object.keys(FIELD_EXPECTATIONS).sort()).toEqual(Object.keys(base).sort());
    expect(Object.keys(productionPolicy).sort()).toEqual(Object.keys(FIELD_EXPECTATIONS).sort());
    for (const field of Object.keys(FIELD_EXPECTATIONS) as (keyof GameState)[]) {
      const expected = FIELD_EXPECTATIONS[field];
      expect(productionPolicy[field], field).toBe(
        expected === 'invariant'
          ? 'template-invariant'
          : expected === 'encoded'
            ? 'encoded'
            : 'proof-quotiented',
      );
    }
    const invariantFields = Object.entries(FIELD_EXPECTATIONS)
      .filter(([, storage]) => storage === 'invariant')
      .map(([field]) => field as keyof GameState);

    for (const field of invariantFields) {
      const mutated = { ...base, [field]: differentValue(base[field]) } as GameState;
      expect(
        () => ENDGAME_PROOF_FRONTIER_TESTING.encode(mutated, base),
        `template-invariant ${field}`,
      ).toThrow();
    }
  });

  it('quotients every permitted history field without changing proof observations', () => {
    const base = started(draft);
    const baseKey = ENDGAME_PROOF_FRONTIER_TESTING.encode(base, base);
    const expected = observation(base);
    const freeMutations: readonly (readonly [keyof GameState, unknown])[] = [
      ['score', 12_345],
      ['lines', 9],
      ['combo', 8],
      ['level', 17],
      ['endgameTargetLines', 99],
      ['endgameQueue', Object.freeze([...base.queue].reverse())],
      ['endgameQueueIndex', 44],
      ['completedLevelId', 't3r-shaft-01'],
      ['nextUnlockedLevelId', 't3r-shaft-02'],
      ['elapsedTicks', 54_321],
    ];
    const constrained = {
      endgameUndoHistory: Object.freeze([{}]),
      endgameActiveSpawnCheckpoint: {},
      phaseTicks: 1,
      pendingClearRows: [BOARD_HEIGHT - 1],
      gravityTicks: 1,
      gravitySubtickRemainder: 1,
      lockTicks: 1,
      lockResets: 1,
    } as const;
    const quotientFields = Object.entries(FIELD_EXPECTATIONS)
      .filter(([, storage]) => storage === 'quotient' || storage === 'canonical-decision')
      .map(([field]) => field)
      .sort();
    expect(quotientFields).toEqual([
      ...freeMutations.map(([field]) => field),
      ...Object.keys(constrained),
    ].sort());

    for (const [field, value] of freeMutations) {
      const variant = { ...base, [field]: value } as GameState;
      expect(ENDGAME_PROOF_FRONTIER_TESTING.encode(variant, base), `quotient ${field}`).toBe(baseKey);
      expect(observation(variant), `proof observation ${field}`).toEqual(expected);
    }
    expect(stateHash({ ...base, score: 12_345, elapsedTicks: 54_321 })).not.toBe(stateHash(base));
    for (const [field, value] of Object.entries(constrained)) {
      expect(
        () => ENDGAME_PROOF_FRONTIER_TESTING.encode({ ...base, [field]: value } as GameState, base),
        `decision modifier ${field}`,
      ).toThrow();
    }
  });

  it('keeps every encoded field mutation-sensitive in the general key and proof domain', () => {
    const base = started(draft);
    const key = ENDGAME_PROOF_FRONTIER_TESTING.encode(base, base);
    const board = base.board.map((row) => [...row]);
    const empty = board.flatMap((row, y) => row.flatMap((cell, x) => (
      cell === null && !cellsForPiece(base.active!).some((candidate) => candidate.x === x && candidate.y === y)
        ? [{ x, y }]
        : []
    )))[0]!;
    board[empty.y]![empty.x] = 'I';
    const encodedVariants: readonly (readonly [keyof GameState, GameState])[] = [
      ['board', { ...base, board }],
      ['active', { ...base, active: { ...base.active!, x: base.active!.x - 1 } }],
      ['queue', { ...base, queue: Object.freeze([...base.queue].reverse()) as GameState['queue'] }],
      ['endgameTargetCells', { ...base, endgameTargetCells: Object.freeze(base.endgameTargetCells.slice(1)) }],
      ['randomizer', { ...base, randomizer: { ...base.randomizer, seed: (base.randomizer.seed + 1) >>> 0 || 1 } }],
    ];
    for (const [field, variant] of encodedVariants) {
      expect(ENDGAME_PROOF_FRONTIER_TESTING.encode(variant, base), field).not.toBe(key);
    }
    for (const [field, value] of [
      ['status', 'paused'],
      ['phase', 'entry'],
    ] as const) {
      expect(endgameRouteStateKey({ ...base, [field]: value }), field)
        .not.toBe(endgameRouteStateKey(base));
      expect(() => ENDGAME_PROOF_FRONTIER_TESTING.encode({ ...base, [field]: value }, base), field).toThrow();
    }
    for (const field of ['pieceCount', 'endgameSpawnCount'] as const) {
      const variant = { ...base, [field]: base[field] + 1 };
      expect(endgameRouteStateKey(variant), field).not.toBe(key);
      expect(() => ENDGAME_PROOF_FRONTIER_TESTING.encode(variant, base), field).toThrow('piece counts');
    }
    const anchored = started(getEndgameDefinition('t5r-drift-08'));
    const supportedLanding = exhaustiveEndgameLandings(anchored).find((landing) => (
      active(landing.state) && landing.state.endgameAnchorSupportedCells.length > 0
    ))!;
    expect(supportedLanding).toBeDefined();
    expect(ENDGAME_PROOF_FRONTIER_TESTING.encode(supportedLanding.state, anchored))
      .not.toBe(ENDGAME_PROOF_FRONTIER_TESTING.encode(anchored, anchored));
    expect(new Set(encodedVariants.map(([field]) => field)).size + 5).toBe(
      Object.values(FIELD_EXPECTATIONS).filter((storage) => storage === 'encoded').length,
    );
    expect(key).toMatch(/^p1\.[A-Za-z0-9_-]+$/);
  });

  it('canonicalizes ordinary colours while preserving locks, commands, successors, and wins', () => {
    const base = started(draft);
    const recoloured: GameState = {
      ...base,
      board: base.board.map((row) => row.map((cell) => (
        cell === null || cell === 'A' ? cell : cell === 'I' ? 'T' : 'I'
      ))),
    };
    expect(ENDGAME_PROOF_FRONTIER_TESTING.encode(recoloured, base))
      .toBe(ENDGAME_PROOF_FRONTIER_TESTING.encode(base, base));
    expect(observation(recoloured)).toEqual(observation(base));
  });

  it('round-trips real ordinary and anchored decisions byte-for-byte', () => {
    for (const definition of [draft, getEndgameDefinition('t5r-drift-08')]) {
      const base = started(definition);
      const activeLanding = exhaustiveEndgameLandings(base).find((landing) => active(landing.state));
      expect(activeLanding).toBeDefined();
      const decisions = [base, activeLanding!.state];
      if (definition.anchorCells.length > 0) {
        const supported = exhaustiveEndgameLandings(base).find((landing) => (
          active(landing.state) && landing.state.endgameAnchorSupportedCells.length > 0
        ));
        expect(supported).toBeDefined();
        decisions.push(supported!.state);
      }
      for (const decision of decisions) {
        const key = ENDGAME_PROOF_FRONTIER_TESTING.encode(decision, base);
        const decoded = ENDGAME_PROOF_FRONTIER_TESTING.decode(key, base);
        expect(ENDGAME_PROOF_FRONTIER_TESTING.encode(decoded, base)).toBe(key);
        expect(observation(decoded)).toEqual(observation(decision));
      }
    }
  });

  it('rejects malformed grammar, noncanonical decisions, and cross-domain materials', () => {
    const base = started(draft);
    const key = ENDGAME_PROOF_FRONTIER_TESTING.encode(base, base);
    const malformed = [
      `${key}~extra`,
      key.replace(/^p1\./, 'p2.'),
      'p1.',
      `${key}=`,
      key.slice(0, -1),
      key.slice(0, -2),
      `${key}A`,
    ];
    for (const candidate of malformed) {
      expect(() => ENDGAME_PROOF_FRONTIER_TESTING.decode(candidate, base), candidate).toThrow();
    }

    const fullBoard = base.board.map((row) => [...row]);
    fullBoard[BOARD_HEIGHT - 1] = Array.from({ length: BOARD_WIDTH }, () => 'I');
    expect(() => ENDGAME_PROOF_FRONTIER_TESTING.encode({ ...base, board: fullBoard }, base)).toThrow('full row');

    const empty = base.board.flatMap((row, y) => row.flatMap((cell, x) => (
      cell === null && !cellsForPiece(base.active!).some((activeCell) => activeCell.x === x && activeCell.y === y)
        ? [{ x, y }]
        : []
    )))[0]!;
    expect(() => ENDGAME_PROOF_FRONTIER_TESTING.encode({
      ...base,
      endgameTargetCells: Object.freeze([empty]),
    }, base)).toThrow('ordinary occupied cells');
    expect(() => ENDGAME_PROOF_FRONTIER_TESTING.encode({
      ...base,
      endgameAnchorSupportedCells: Object.freeze([base.endgameTargetCells[0]!]),
    }, base)).toThrow('require an immutable anchor');

    const anchored = started(getEndgameDefinition('t5r-drift-08'));
    const anchorBoard = anchored.board.map((row) => row.map((cell) => cell === 'A' ? 'I' : cell));
    expect(() => ENDGAME_PROOF_FRONTIER_TESTING.encode({ ...anchored, board: anchorBoard }, anchored))
      .toThrow('anchor coordinates');
  });

  it('matches the old full-object BFS and frozen Intro-04 telemetry exactly', () => {
    const initial = started(draft);
    const reference = referenceBfs(initial, fixture.optimalLockedPieces, 'object');
    const keyReference = referenceBfs(initial, fixture.optimalLockedPieces, 'key');
    expect(reference.shorterWin).toBe(false);
    expect(reference.depths).toEqual(fixture.proof.exhaustedDepths);
    expect(keyReference).toEqual(reference);

    const preFinal = decisionAfterLocks(draft, fixture.optimalRoute, fixture.optimalLockedPieces - 1);
    const shorterObject = referenceBfs(preFinal, 2, 'object');
    const shorterKey = referenceBfs(preFinal, 2, 'key');
    expect(shorterObject.shorterWin).toBe(true);
    expect(shorterKey).toEqual(shorterObject);

    const certificate = certifyOptimalEndgameRouteForDefinition(draft, fixture.optimalRoute);
    expect(certificate?.exhaustedDepths).toEqual(reference.depths);
    expect(certificate?.exhaustedDepths).toEqual(fixture.proof.exhaustedDepths);
    expect(certificate && encodeEndgameRoute(certificate.replay.commands)).toBe(fixture.optimalRoute);
  }, 120_000);
});
