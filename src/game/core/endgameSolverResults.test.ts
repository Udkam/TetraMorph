import { describe, expect, it } from 'vitest';
import phase7Batch1File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-01-10.json';
import phase7Batch2File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-11-20.json';
import phase7Batch3File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-21-30.json';
import phase7Batch4File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-31-40.json';
import phase7Batch5File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-41-50.json';
import t32Changed01To03File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-01-03.json';
import t32Changed04To06File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-04-06.json';
import t32Changed07To09File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-07-09.json';
import t32Changed10File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-10.json';
import t32ChangedEasyMasteryFile from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-easy-mastery.json';
import t32Changed36File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-36.json';
import t32Changed38File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-38.json';
import t32Changed47File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-47.json';
import t32ChangedHardR2File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-46-50-r2.json';
import { VISIBLE_START_ROW } from './constants';
import { createInitialState, dispatch } from './engine';
import {
  ENDGAME_DEFINITIONS,
  createEndgameBoard,
  getEndgameDefinition,
  replayEndgameSetup,
  type EndgameAnchorCell,
} from './endgames';
import { metricsForEndgameRoute, replayEndgameRoute } from './endgameRouteSearch';
import { ANCHOR_CELL, type GameCommand, type EndgameId } from './types';

type CommandToken = 'S' | 'T' | 'L' | 'R' | 'H' | 'C' | 'D';

type VerifiedRoute = {
  id: 'primary' | 'alternate';
  commandStream: string;
  commandCount: number;
  locks: number;
  rotationCount: number;
  moveCount: number;
};

type Phase7VerifiedRoute = VerifiedRoute & {
  clearDistribution: readonly number[];
  maximumHeight: number;
  peakHoles: number;
  branchWidths: readonly number[];
  minimumBranchWidth: number;
  maximumBranchWidth: number;
  averageBranchWidth: number;
  anchorCount: number;
};

type VerifiedLevel = {
  id: EndgameId;
  curriculumPosition: number;
  targetRowCount: number;
  setup: { seed: number; placementCount: number };
  anchorCells: readonly EndgameAnchorCell[];
  routes: readonly [VerifiedRoute, VerifiedRoute];
  firstDivergenceLock: number;
};

type Phase7VerifiedLevel = Omit<VerifiedLevel, 'routes'> & {
  shorterRouteLocks: number;
  routes: readonly [Phase7VerifiedRoute, Phase7VerifiedRoute];
};

type Phase7Artifact = {
  schemaVersion: 7;
  claim: string;
  batch: { from: number; to: number };
  commandEncoding: Record<CommandToken, GameCommand>;
  difficultyTuple: readonly string[];
  campaignOrder: readonly EndgameId[];
  levels: readonly Phase7VerifiedLevel[];
  searchBounds: { maxLocks: number; primaryBeam: number; alternateBeam: number };
};

const phase7Batch1 = phase7Batch1File as unknown as Phase7Artifact;
const phase7Batch2 = phase7Batch2File as unknown as Phase7Artifact;
const phase7Batch3 = phase7Batch3File as unknown as Phase7Artifact;
const phase7Batch4 = phase7Batch4File as unknown as Phase7Artifact;
const phase7Batch5 = phase7Batch5File as unknown as Phase7Artifact;
const t32Changed01To03 = t32Changed01To03File as unknown as Phase7Artifact;
const t32Changed04To06 = t32Changed04To06File as unknown as Phase7Artifact;
const t32Changed07To09 = t32Changed07To09File as unknown as Phase7Artifact;
const t32Changed10 = t32Changed10File as unknown as Phase7Artifact;
const t32ChangedEasyMastery = t32ChangedEasyMasteryFile as unknown as Phase7Artifact;
const t32Changed36 = t32Changed36File as unknown as Phase7Artifact;
const t32Changed38 = t32Changed38File as unknown as Phase7Artifact;
const t32Changed47 = t32Changed47File as unknown as Phase7Artifact;
const t32ChangedHardR2 = t32ChangedHardR2File as unknown as Phase7Artifact;
const phase7Artifacts = Object.freeze([
  phase7Batch1,
  phase7Batch2,
  phase7Batch3,
  phase7Batch4,
  phase7Batch5,
]);
const historicalLevels: readonly Phase7VerifiedLevel[] = Object.freeze([
  ...phase7Batch1.levels,
  ...phase7Batch2.levels,
  ...phase7Batch3.levels,
  ...phase7Batch4.levels,
  ...phase7Batch5.levels,
]);
const t32ChangedById = new Map(
  [
    ...t32Changed01To03.levels,
    ...t32Changed04To06.levels,
    ...t32Changed07To09.levels,
    ...t32Changed10.levels,
    ...t32ChangedEasyMastery.levels,
    ...t32Changed36.levels,
    ...t32Changed38.levels,
    ...t32Changed47.levels,
    ...t32ChangedHardR2.levels,
  ].map((level) => [level.id, level]),
);
const historicalById = new Map(historicalLevels.map((level) => [level.id, level]));
const activeLevels: readonly Phase7VerifiedLevel[] = Object.freeze(
  ENDGAME_DEFINITIONS.map((definition) => {
    const level = t32ChangedById.get(definition.id) ?? historicalById.get(definition.id);
    if (!level) throw new Error(`Missing route evidence for ${definition.id}`);
    return level.curriculumPosition === definition.difficulty
      ? level
      : { ...level, curriculumPosition: definition.difficulty };
  }),
);

function commandFor(token: CommandToken): GameCommand {
  switch (token) {
    case 'S': return { type: 'start' };
    case 'T': return { type: 'tick' };
    case 'L': return { type: 'move', dx: -1 };
    case 'R': return { type: 'move', dx: 1 };
    case 'H': return { type: 'hard-drop' };
    case 'C': return { type: 'rotate', direction: 1 };
    case 'D': return { type: 'soft-drop' };
  }
}

function decode(stream: string): GameCommand[] {
  return [...stream].map((token) => {
    if (!['S', 'T', 'L', 'R', 'H', 'C', 'D'].includes(token)) throw new Error(`Unknown compact public command: ${token}`);
    return commandFor(token as CommandToken);
  });
}

describe('Phase-7 source-bound multi-route Endgame curriculum', () => {
  it('overlays the admitted T32 definitions without rewriting the historical T15 evidence', () => {
    expect(t32Changed01To03.schemaVersion).toBe(7);
    expect(t32Changed01To03.batch).toEqual({ from: 1, to: 3 });
    expect(t32Changed01To03.campaignOrder).toEqual(t32Changed01To03.levels.map(({ id }) => id));
    expect(t32Changed01To03.levels).toHaveLength(3);
    expect(t32Changed01To03.searchBounds).toEqual({
      maxLocks: 14,
      primaryBeam: 900,
      alternateBeam: 750,
    });
    expect(activeLevels.slice(0, 3)).toEqual(t32Changed01To03.levels);
    expect(t32Changed04To06.schemaVersion).toBe(7);
    expect(t32Changed04To06.batch).toEqual({ from: 4, to: 6 });
    expect(t32Changed04To06.campaignOrder).toEqual(t32Changed04To06.levels.map(({ id }) => id));
    expect(t32Changed04To06.levels).toHaveLength(3);
    expect(t32Changed04To06.searchBounds).toEqual({
      maxLocks: 14,
      primaryBeam: 900,
      alternateBeam: 750,
    });
    expect(activeLevels.slice(3, 6)).toEqual(t32Changed04To06.levels);
    expect(t32Changed07To09.schemaVersion).toBe(7);
    expect(t32Changed07To09.batch).toEqual({ from: 7, to: 9 });
    expect(t32Changed07To09.campaignOrder).toEqual(t32Changed07To09.levels.map(({ id }) => id));
    expect(t32Changed07To09.levels).toHaveLength(3);
    expect(t32Changed07To09.searchBounds).toEqual({
      maxLocks: 14,
      primaryBeam: 900,
      alternateBeam: 750,
    });
    expect(activeLevels.slice(6, 9)).toEqual(t32Changed07To09.levels);
    expect(t32Changed10.schemaVersion).toBe(7);
    expect(t32Changed10.batch).toEqual({ from: 10, to: 10 });
    expect(t32Changed10.campaignOrder).toEqual(['t5r-drift-08']);
    expect(t32Changed10.levels).toHaveLength(1);
    expect(t32Changed10.searchBounds).toEqual({
      maxLocks: 14,
      primaryBeam: 1600,
      alternateBeam: 1600,
    });
    expect(activeLevels.slice(9, 10)).toEqual(t32Changed10.levels);
    expect(t32ChangedEasyMastery.schemaVersion).toBe(7);
    expect(t32ChangedEasyMastery.batch).toEqual({ from: 12, to: 14 });
    expect(t32ChangedEasyMastery.campaignOrder).toEqual([
      't5r-arc-13', 't5r-current-12', 't5r-prism-11',
    ]);
    expect(t32ChangedEasyMastery.levels).toHaveLength(3);
    expect(t32ChangedEasyMastery.searchBounds).toEqual({
      maxLocks: 12,
      primaryBeam: 900,
      alternateBeam: 900,
    });
    expect(activeLevels.slice(11, 14)).toEqual(t32ChangedEasyMastery.levels);
    for (const [position, artifact] of [
      [36, t32Changed36],
      [38, t32Changed38],
      [47, t32Changed47],
    ] as const) {
      expect(artifact.schemaVersion).toBe(7);
      expect(artifact.batch).toEqual({ from: position, to: position });
      expect(artifact.campaignOrder).toEqual([ENDGAME_DEFINITIONS[position - 1]?.id]);
      expect(artifact.levels).toHaveLength(1);
      expect(artifact.searchBounds).toEqual({
        maxLocks: 36,
        primaryBeam: 720,
        alternateBeam: 560,
      });
      expect(activeLevels.slice(position - 1, position)).toEqual(artifact.levels);
    }
    expect(t32ChangedHardR2.schemaVersion).toBe(7);
    expect(t32ChangedHardR2.batch).toEqual({ from: 46, to: 50 });
    expect(t32ChangedHardR2.campaignOrder).toEqual([
      'tm-endgame-46', 'tm-endgame-48', 'tm-endgame-49', 'tm-endgame-50',
    ]);
    expect(t32ChangedHardR2.levels).toHaveLength(4);
    expect(t32ChangedHardR2.searchBounds).toEqual({
      maxLocks: 22,
      primaryBeam: 720,
      alternateBeam: 560,
    });
    for (const level of t32ChangedHardR2.levels) {
      expect(activeLevels[level.curriculumPosition - 1]).toEqual(level);
    }
    expect(historicalLevels.slice(0, 3)).toEqual(phase7Batch1.levels.slice(0, 3));
  });

  it('binds all five re-authored ten-level batches to real Core route families', () => {
    for (const [index, artifact] of phase7Artifacts.entries()) {
      const from = index * 10 + 1;
      const to = from + 9;
      expect(artifact.schemaVersion).toBe(7);
      expect(artifact.claim).toContain('non-unique');
      expect(artifact.claim).toContain('not an optimality proof');
      expect(artifact.batch).toEqual({ from, to });
      expect(artifact.searchBounds).toEqual([
        { maxLocks: 18, primaryBeam: 900, alternateBeam: 700 },
        { maxLocks: 18, primaryBeam: 600, alternateBeam: 480 },
        { maxLocks: 24, primaryBeam: 600, alternateBeam: 480 },
        { maxLocks: 30, primaryBeam: 600, alternateBeam: 480 },
        { maxLocks: 36, primaryBeam: 720, alternateBeam: 560 },
      ][index]);
      expect(Object.keys(artifact.commandEncoding).sort()).toEqual(['C', 'H', 'L', 'R', 'S', 'T']);
      expect(artifact.difficultyTuple).toEqual([
        'targetRowCount', 'lockedPieces', 'rotationPlanning', 'horizontalPlanning', 'clearDistribution',
        'maximumHeight', 'peakHoles', 'branchWidth', 'firstDivergenceLock', 'anchorCount',
      ]);
      expect(artifact.levels).toHaveLength(10);
      expect(artifact.campaignOrder).toEqual(artifact.levels.map(({ id }) => id));
    }
    for (const artifact of phase7Artifacts.slice(0, 3)) {
      expect(artifact.levels.map(({ shorterRouteLocks }) => shorterRouteLocks)).toEqual(
        [...artifact.levels.map(({ shorterRouteLocks }) => shorterRouteLocks)].sort((left, right) => left - right),
      );
    }
    expect(phase7Batch1.levels.slice(0, 5).every(({ anchorCells }) => anchorCells.length === 0)).toBe(true);
    expect(phase7Batch1.levels.reduce((count, { anchorCells }) => count + anchorCells.length, 0)).toBe(1);
    expect(phase7Batch2.levels.reduce((count, { anchorCells }) => count + anchorCells.length, 0)).toBe(2);
    expect(phase7Batch3.levels.reduce((count, { anchorCells }) => count + anchorCells.length, 0)).toBe(3);
    expect(phase7Batch3.levels.filter(({ anchorCells }) => anchorCells.length > 0)
      .every(({ setup }) => setup.placementCount === 7)).toBe(true);
    expect(phase7Batch3.levels.filter(({ anchorCells }) => anchorCells.length === 0)
      .every(({ setup }) => setup.placementCount === 10)).toBe(true);
    expect(phase7Batch4.levels.reduce((count, { anchorCells }) => count + anchorCells.length, 0)).toBe(3);
    expect(phase7Batch4.levels.filter(({ anchorCells }) => anchorCells.length > 0)
      .map(({ curriculumPosition }) => curriculumPosition)).toEqual([32, 36, 39]);
    expect(phase7Batch4.levels.filter(({ anchorCells }) => anchorCells.length > 0)
      .every(({ setup }) => setup.placementCount === 9)).toBe(true);
    expect(phase7Batch4.levels.filter(({ anchorCells }) => anchorCells.length === 0)
      .every(({ setup }) => setup.placementCount === 12)).toBe(true);
    expect(phase7Batch4.levels.filter(({ anchorCells }) => anchorCells.length === 0)
      .map(({ shorterRouteLocks }) => shorterRouteLocks)).toEqual([11, 15, 16, 18, 19, 19, 21]);
    expect(phase7Batch5.levels.reduce((count, { anchorCells }) => count + anchorCells.length, 0)).toBe(0);
    expect(phase7Batch5.levels.map(({ setup }) => setup.placementCount))
      .toEqual([14, 14, 14, 14, 14, 14, 15, 14, 14, 14]);
    expect(phase7Batch5.levels.map(({ routes }) => routes.map(({ locks }) => locks)))
      .toEqual([
        [16, 16], [17, 20], [17, 20], [19, 21], [22, 26],
        [23, 24], [27, 23], [24, 24], [25, 25], [25, 29],
      ]);
    expect(activeLevels).toHaveLength(50);
    expect(new Set(activeLevels.map(({ id }) => id)).size).toBe(50);
    expect(new Set(ENDGAME_DEFINITIONS.map(({ id }) => id))).toEqual(new Set(activeLevels.map(({ id }) => id)));
    expect(ENDGAME_DEFINITIONS.map(({ difficulty }) => difficulty))
      .toEqual(Array.from({ length: 50 }, (_, index) => index + 1));

    for (const [index, level] of activeLevels.entries()) {
      const definition = getEndgameDefinition(level.id);
      expect(level.curriculumPosition, level.id).toBe(index + 1);
      expect(level.targetRowCount, level.id).toBe(definition.targetRows);
      expect(level.setup, level.id).toEqual({
        seed: definition.setup.seed,
        placementCount: definition.setup.placements.length,
      });
      expect(level.anchorCells, level.id).toEqual(definition.anchorCells);
      expect(createEndgameBoard(definition, false), level.id).toEqual(replayEndgameSetup(definition.setup));
      expect(level.routes.map((route) => route.id), level.id).toEqual(['primary', 'alternate']);
      expect(level.firstDivergenceLock, level.id).toBeGreaterThanOrEqual(1);
      expect(level.firstDivergenceLock, level.id).toBeLessThanOrEqual(
        Math.min(level.routes[0].locks, level.routes[1].locks),
      );
      expect(level.firstDivergenceLock, level.id).toBeLessThanOrEqual(4);
      for (const route of level.routes) {
        expect(metricsForEndgameRoute(route.commandStream), `${level.id}/${route.id}`).toEqual({
          commandCount: route.commandCount,
          locks: route.locks,
          rotationCount: route.rotationCount,
          moveCount: route.moveCount,
        });
        expect(route.commandStream, `${level.id}/${route.id}`).toMatch(/^S[STLRHCD]+$/);
        expect(route.locks, `${level.id}/${route.id}`).toBeGreaterThanOrEqual(level.targetRowCount);
      }
    }

    for (const level of activeLevels) {
      const definition = getEndgameDefinition(level.id);
      expect(level.targetRowCount, level.id).toBe(
        t32ChangedHardR2.campaignOrder.includes(definition.id) ? 6
          : definition.difficulty <= 10 ? 3
          : definition.difficulty <= 20 ? 4
            : definition.difficulty <= 30 ? 5
              : definition.difficulty <= 40 ? 6 : 7,
      );
      expect(level.setup.placementCount, level.id).toBeGreaterThanOrEqual(5);
      expect(level.setup.placementCount, level.id).toBeLessThanOrEqual(
        definition.difficulty <= 10 ? 6
          : definition.difficulty <= 20 ? 8
            : definition.difficulty <= 30 ? 10
              : definition.difficulty <= 40 ? 12 : 15,
      );
      expect(level.shorterRouteLocks, level.id).toBe(
        Math.min(level.routes[0].locks, level.routes[1].locks),
      );
      for (const route of level.routes) {
        expect(route.clearDistribution.reduce((sum, count) => sum + count, 0), `${level.id}/${route.id}`)
          .toBeGreaterThanOrEqual(level.targetRowCount);
        expect(route.maximumHeight, `${level.id}/${route.id}`).toBeGreaterThanOrEqual(level.targetRowCount);
        expect(route.peakHoles, `${level.id}/${route.id}`).toBeGreaterThanOrEqual(0);
        expect(route.branchWidths, `${level.id}/${route.id}`).toHaveLength(route.locks);
        expect(route.minimumBranchWidth, `${level.id}/${route.id}`).toBeGreaterThan(0);
        expect(route.maximumBranchWidth, `${level.id}/${route.id}`).toBeGreaterThanOrEqual(route.minimumBranchWidth);
        expect(route.averageBranchWidth, `${level.id}/${route.id}`).toBeGreaterThan(0);
        expect(route.anchorCount, `${level.id}/${route.id}`).toBe(definition.anchorCells.length);
      }
    }
  });

  it('replays both documented choices through public Core commands, with no post-win inputs and a genuine early landing branch', () => {
    for (const level of activeLevels) {
      const definition = getEndgameDefinition(level.id);
      const anchorRows = new Set(
        definition.anchorCells.map(({ y }) => VISIBLE_START_ROW + y),
      );
      const routeReplays = level.routes.map((route) => {
        const commands = decode(route.commandStream);
        let state = createInitialState(0x51a1f00d, 'endgame', level.id);
        let terminalIndex = -1;
        for (const [index, command] of commands.entries()) {
          const transition = dispatch(state, command);
          for (const event of transition.events) {
            if (event.type !== 'lines-cleared') continue;
            for (const row of event.rows) {
              expect(anchorRows.has(row), `${level.id}/${route.id} cleared anchor row ${row}`).toBe(false);
            }
          }
          state = transition.state;
          if (state.status !== 'playing' && terminalIndex === -1) terminalIndex = index;
        }

        expect(terminalIndex, `${level.id}/${route.id} terminal command`).toBe(commands.length - 1);
        expect(state.status, `${level.id}/${route.id}`).toBe('finished');
        expect(state.endgameCompletion, `${level.id}/${route.id}`).toBe('finished');
        expect(state.endgameTargetCells, `${level.id}/${route.id}`).toHaveLength(0);
        expect(state.pieceCount, `${level.id}/${route.id}`).toBe(route.locks);
        expect(state.board.flat().filter((cell) => cell === ANCHOR_CELL), `${level.id}/${route.id}`)
          .toHaveLength(definition.anchorCells.length);
        for (const anchor of definition.anchorCells) {
          expect(state.board[VISIBLE_START_ROW + anchor.y]?.[anchor.x], `${level.id}/${route.id}`).toBe(ANCHOR_CELL);
        }
        return replayEndgameRoute(level.id, route.commandStream);
      });

      const [primary, alternate] = routeReplays;
      const divergenceIndex = level.firstDivergenceLock - 1;
      expect(primary.locks[divergenceIndex]?.signature, `${level.id} primary landing`)
        .not.toBe(alternate.locks[divergenceIndex]?.signature);
      expect(primary.state.endgameCompletion, level.id).toBe('finished');
      expect(alternate.state.endgameCompletion, level.id).toBe('finished');
    }
  });
});
