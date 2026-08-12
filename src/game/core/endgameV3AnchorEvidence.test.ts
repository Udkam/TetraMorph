import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from './constants';
import { createInitialState } from './engine';
import {
  getEndgameDefinition,
  validateEndgameDefinition,
  type EndgameAnchorCell,
  type EndgameDefinition,
} from './endgames';
import { encodeEndgameRoute, replayEndgameRouteForDefinition } from './endgameRouteSearch';
import { ANCHOR_CELL, type Cell } from './types';

const F3B_ANCHORS: readonly EndgameAnchorCell[] = Object.freeze([
  Object.freeze({ x: 3, y: 8 }),
  Object.freeze({ x: 4, y: 8 }),
  Object.freeze({ x: 7, y: 8 }),
  Object.freeze({ x: 8, y: 8 }),
]);

const EXPECTED_BOTTOM_TWELVE = [
  '...AA..AA.',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '...SSJIIII',
  'OOSSLJJJT.',
  'OOLLL..TTT',
] as const;

const EXPECTED_TARGETS: readonly Cell[] = Object.freeze([
  { x: 3, y: 37 }, { x: 4, y: 37 }, { x: 5, y: 37 }, { x: 6, y: 37 },
  { x: 7, y: 37 }, { x: 8, y: 37 }, { x: 9, y: 37 },
  { x: 0, y: 38 }, { x: 1, y: 38 }, { x: 2, y: 38 }, { x: 3, y: 38 },
  { x: 4, y: 38 }, { x: 5, y: 38 }, { x: 6, y: 38 }, { x: 7, y: 38 },
  { x: 8, y: 38 },
  { x: 0, y: 39 }, { x: 1, y: 39 }, { x: 2, y: 39 }, { x: 3, y: 39 },
  { x: 4, y: 39 }, { x: 7, y: 39 }, { x: 8, y: 39 }, { x: 9, y: 39 },
].map((cell) => Object.freeze(cell)));

const L_SEGMENT = 'LLLHTTTTTTTTTTTT';
const T_SEGMENT = 'CRDDDDDDDDCRRCHTTTTTTTTTTTT';
const J_SEGMENT = 'QRRHTTTTTTTTTTTT';
const COMMON_SUFFIX = `${L_SEGMENT}${T_SEGMENT}${J_SEGMENT}`;
const COMMON_FULL_LOCKS = [
  'L:2,36|0,37|1,37|2,37',
  'T:9,36|8,37|9,37|9,38',
  'J:6,37|6,38|5,39|6,39',
] as const;

type AnchorWitness = Readonly<{
  anchor: EndgameAnchorCell;
  firstSegment: string;
  fullFirstLock: string;
  removedFirstLock: string;
  removedLocks: readonly string[];
  removedStatus: 'playing' | 'finished';
  removedTargets: number;
  removedLines: number;
}>;

const WITNESSES: readonly AnchorWitness[] = Object.freeze([
  {
    anchor: F3B_ANCHORS[0]!,
    firstSegment: 'SQLHTTT',
    fullFirstLock: 'I:3,24|3,25|3,26|3,27',
    removedFirstLock: 'I:3,33|3,34|3,35|3,36',
    removedLocks: [
      'I:3,33|3,34|3,35|3,36',
      ...COMMON_FULL_LOCKS,
    ],
    removedStatus: 'finished',
    removedTargets: 0,
    removedLines: 3,
  },
  {
    anchor: F3B_ANCHORS[1]!,
    firstSegment: 'SQHTTT',
    fullFirstLock: 'I:4,24|4,25|4,26|4,27',
    removedFirstLock: 'I:4,33|4,34|4,35|4,36',
    removedLocks: [
      'I:4,33|4,34|4,35|4,36',
      COMMON_FULL_LOCKS[0],
      'T:5,32|4,33|5,33|5,34',
      'J:6,29|6,30|5,31|6,31',
    ],
    removedStatus: 'playing',
    removedTargets: 17,
    removedLines: 1,
  },
  {
    anchor: F3B_ANCHORS[2]!,
    firstSegment: 'SCRRHTTT',
    fullFirstLock: 'I:7,24|7,25|7,26|7,27',
    removedFirstLock: 'I:7,33|7,34|7,35|7,36',
    removedLocks: [
      'I:7,33|7,34|7,35|7,36',
      COMMON_FULL_LOCKS[0],
      'T:6,35|5,36|6,36|6,37',
      'J:6,32|6,33|5,34|6,34',
    ],
    removedStatus: 'playing',
    removedTargets: 17,
    removedLines: 1,
  },
  {
    anchor: F3B_ANCHORS[3]!,
    firstSegment: 'SCRRRHTTT',
    fullFirstLock: 'I:8,24|8,25|8,26|8,27',
    removedFirstLock: 'I:8,33|8,34|8,35|8,36',
    removedLocks: [
      'I:8,33|8,34|8,35|8,36',
      COMMON_FULL_LOCKS[0],
      'T:8,31|7,32|8,32|8,33',
      'J:6,35|6,36|5,37|6,37',
    ],
    removedStatus: 'playing',
    removedTargets: 17,
    removedLines: 1,
  },
]);

function fourAnchorDefinition(): EndgameDefinition {
  const source = getEndgameDefinition('t3r-shaft-01');
  return Object.freeze({
    ...source,
    name: 'F3B four-anchor fixture',
    seed: 49,
    anchorCells: F3B_ANCHORS,
  });
}

function withoutAnchor(definition: EndgameDefinition, removed: EndgameAnchorCell): EndgameDefinition {
  return Object.freeze({
    ...definition,
    anchorCells: Object.freeze(definition.anchorCells.filter((anchor) => (
      anchor.x !== removed.x || anchor.y !== removed.y
    ))),
  });
}

function injectedInitialState(definition: EndgameDefinition) {
  return createInitialState(
    0x51a1f00d,
    'endgame',
    definition.id,
    undefined,
    undefined,
    definition,
  );
}

function visibleRows(definition: EndgameDefinition): string[] {
  return injectedInitialState(definition).board.slice(-12).map((row) => row.map((cell) => (
    cell === ANCHOR_CELL ? 'A' : cell ?? '.'
  )).join(''));
}

describe('Endgame v3 four-anchor evidence', () => {
  it('owns the exact initial board, targets, anchors, and bottom-twelve preview projection', () => {
    const definition = fourAnchorDefinition();
    const state = injectedInitialState(definition);

    expect(() => validateEndgameDefinition(definition, false)).not.toThrow();
    expect(visibleRows(definition)).toEqual(EXPECTED_BOTTOM_TWELVE);
    expect(state.endgameBoardRows).toEqual(definition.boardRows);
    expect(state.endgameBoardRows?.some((row) => row.includes('A'))).toBe(false);
    expect(state.endgameTargetCells).toEqual(EXPECTED_TARGETS);
    expect(state.endgameInitialTargetCount).toBe(definition.setup.placements.length * 4);
    expect(state.endgameInitialTargetCount).toBe(24);
    expect(state.endgameAnchorSupportedCells).toEqual([]);
    expect(state.board.flat().filter((cell) => cell === ANCHOR_CELL)).toHaveLength(4);
    for (const anchor of F3B_ANCHORS) {
      const absolute = { x: anchor.x, y: VISIBLE_START_ROW + anchor.y };
      expect(state.board[absolute.y]?.[absolute.x]).toBe(ANCHOR_CELL);
      expect(state.endgameTargetCells).not.toContainEqual(absolute);
    }
  });

  it('keeps target and support ownership exact through three real public clears', () => {
    const definition = fourAnchorDefinition();
    const support = [
      { x: 3, y: 24 }, { x: 3, y: 25 }, { x: 3, y: 26 }, { x: 3, y: 27 },
    ];
    const checkpoints = [
      { route: 'S', locks: 0, targets: 24, lines: 0, supported: [] },
      { route: WITNESSES[0]!.firstSegment, locks: 1, targets: 24, lines: 0, supported: support },
      { route: `${WITNESSES[0]!.firstSegment}${L_SEGMENT}`, locks: 2, targets: 17, lines: 1, supported: support },
      { route: `${WITNESSES[0]!.firstSegment}${L_SEGMENT}${T_SEGMENT}`, locks: 3, targets: 8, lines: 2, supported: support },
      { route: `${WITNESSES[0]!.firstSegment}${COMMON_SUFFIX}`, locks: 4, targets: 0, lines: 3, supported: support },
    ] as const;

    for (const checkpoint of checkpoints) {
      const replay = replayEndgameRouteForDefinition(definition, checkpoint.route);
      expect(replay.locks, checkpoint.route).toHaveLength(checkpoint.locks);
      expect(replay.state.endgameTargetCells, checkpoint.route).toHaveLength(checkpoint.targets);
      expect(replay.state.lines, checkpoint.route).toBe(checkpoint.lines);
      expect(replay.state.endgameAnchorSupportedCells, checkpoint.route).toEqual(checkpoint.supported);
    }
  });

  it('owns four distinct public completion witnesses', () => {
    expect(new Set(WITNESSES.map(({ firstSegment }) => firstSegment)).size).toBe(4);
    expect(new Set(WITNESSES.map(({ anchor }) => `${anchor.x}:${anchor.y}`)).size).toBe(4);
  });

  it.each(WITNESSES)(
    'proves anchor $anchor.x:$anchor.y with a completed route and a remove-only comparison',
    (witness) => {
      const definition = fourAnchorDefinition();
      const reduced = withoutAnchor(definition, witness.anchor);
      const route = `${witness.firstSegment}${COMMON_SUFFIX}`;
      const fullReplay = replayEndgameRouteForDefinition(definition, route);
      const reducedReplay = replayEndgameRouteForDefinition(reduced, route);
      const expectedSupport = Array.from({ length: 4 }, (_, index) => ({
        x: witness.anchor.x,
        y: 24 + index,
      }));

      expect(() => validateEndgameDefinition(reduced, false)).not.toThrow();
      expect(reduced.anchorCells).toHaveLength(3);
      expect(reduced.anchorCells).toEqual(F3B_ANCHORS.filter((anchor) => anchor !== witness.anchor));
      expect(encodeEndgameRoute(fullReplay.commands)).toBe(route);
      expect(fullReplay.state.status).toBe('finished');
      expect(fullReplay.state.endgameCompletion).toBe('finished');
      expect(fullReplay.state.endgameTargetCells).toHaveLength(0);
      expect(fullReplay.state.lines).toBe(3);
      expect(fullReplay.state.pieceCount).toBe(4);
      expect(fullReplay.locks.map(({ signature }) => signature)).toEqual([
        witness.fullFirstLock,
        ...COMMON_FULL_LOCKS,
      ]);
      expect(fullReplay.state.endgameAnchorSupportedCells).toEqual(expectedSupport);

      expect(reducedReplay.locks).toHaveLength(4);
      expect(reducedReplay.locks[0]?.signature).toBe(witness.removedFirstLock);
      expect(reducedReplay.locks[0]?.signature).not.toBe(fullReplay.locks[0]?.signature);
      expect(reducedReplay.locks.map(({ signature }) => signature)).toEqual(witness.removedLocks);
      expect(reducedReplay.state.endgameAnchorSupportedCells).toEqual([]);
      expect(reducedReplay.state.status).toBe(witness.removedStatus);
      expect(reducedReplay.state.endgameTargetCells).toHaveLength(witness.removedTargets);
      expect(reducedReplay.state.lines).toBe(witness.removedLines);
      expect(reducedReplay.state.pieceCount).toBe(4);
    },
  );
});
