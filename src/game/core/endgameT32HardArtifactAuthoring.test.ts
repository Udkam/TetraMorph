// @ts-expect-error Vitest runs this authoring test in Node while product types omit Node.
import { readFileSync, writeFileSync } from 'node:fs';
// @ts-expect-error Vitest runs this authoring test in Node while product types omit Node.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from './constants';
import { createInitialState, dispatch } from './engine';
import { getEndgameDefinition } from './endgames';
import { metricsForEndgameRoute, endgameLandings } from './endgameRouteSearch';
import { T32_HARD_REBUILD_WITNESSES } from './endgameT32HardRebuildRoutes';
import type { Board, GameCommand, GameState, EndgameId } from './types';

const OUTPUT_PATH = fileURLToPath(new URL(
  '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-46-50-r2.json',
  import.meta.url,
));

type CommandToken = 'S' | 'T' | 'L' | 'R' | 'H' | 'C';

function commandFor(token: CommandToken): GameCommand {
  switch (token) {
    case 'S': return { type: 'start' };
    case 'T': return { type: 'tick' };
    case 'L': return { type: 'move', dx: -1 };
    case 'R': return { type: 'move', dx: 1 };
    case 'H': return { type: 'hard-drop' };
    case 'C': return { type: 'rotate', direction: 1 };
  }
}

function visibleBoardMetrics(board: Board): { height: number; holes: number } {
  const visible = board.slice(VISIBLE_START_ROW);
  const firstOccupiedRow = visible.findIndex((row) => row.some((cell) => cell !== null));
  const height = firstOccupiedRow === -1 ? 0 : visible.length - firstOccupiedRow;
  let holes = 0;
  for (let x = 0; x < (visible[0]?.length ?? 0); x += 1) {
    let occupiedSeen = false;
    for (const row of visible) {
      if (row[x] !== null) occupiedSeen = true;
      else if (occupiedSeen) holes += 1;
    }
  }
  return { height, holes };
}

function routeEvidence(levelId: EndgameId, id: 'primary' | 'alternate', commandStream: string) {
  let state: GameState = createInitialState(0x51a1f00d, 'endgame', levelId);
  const clearDistribution: number[] = [];
  const branchWidths: number[] = [];
  let { height: maximumHeight, holes: peakHoles } = visibleBoardMetrics(state.board);

  for (const token of commandStream as Iterable<CommandToken>) {
    if (token === 'H') branchWidths.push(endgameLandings(state).length);
    const transition = dispatch(state, commandFor(token));
    for (const event of transition.events) {
      if (event.type === 'lines-cleared') clearDistribution.push(event.rows.length);
    }
    state = transition.state;
    if (token === 'H') {
      const metrics = visibleBoardMetrics(state.board);
      maximumHeight = Math.max(maximumHeight, metrics.height);
      peakHoles = Math.max(peakHoles, metrics.holes);
    }
  }

  expect(state.endgameCompletion, `${levelId}/${id}`).toBe('finished');
  const metrics = metricsForEndgameRoute(commandStream);
  const minimumBranchWidth = Math.min(...branchWidths);
  const maximumBranchWidth = Math.max(...branchWidths);
  return {
    id,
    commandStream,
    ...metrics,
    clearDistribution,
    maximumHeight,
    peakHoles,
    branchWidths,
    minimumBranchWidth,
    maximumBranchWidth,
    averageBranchWidth: Number((
      branchWidths.reduce((sum, width) => sum + width, 0) / branchWidths.length
    ).toFixed(2)),
    anchorCount: 0,
  };
}

function buildArtifact() {
  return {
    schemaVersion: 7,
    claim: 'T32 revision-2 Hard routes prove non-unique replayable completion; they are not an optimality proof.',
    batch: { from: 46, to: 50 },
    commandEncoding: {
      S: { type: 'start' },
      T: { type: 'tick' },
      L: { type: 'move', dx: -1 },
      R: { type: 'move', dx: 1 },
      H: { type: 'hard-drop' },
      C: { type: 'rotate', direction: 1 },
    },
    difficultyTuple: [
      'targetRowCount', 'lockedPieces', 'rotationPlanning', 'horizontalPlanning', 'clearDistribution',
      'maximumHeight', 'peakHoles', 'branchWidth', 'firstDivergenceLock', 'anchorCount',
    ],
    campaignOrder: T32_HARD_REBUILD_WITNESSES.map(({ id }) => id),
    levels: T32_HARD_REBUILD_WITNESSES.map((witness) => {
      const definition = getEndgameDefinition(witness.id);
      return {
        id: witness.id,
        curriculumPosition: definition.difficulty,
        targetRowCount: definition.targetRows,
        setup: { seed: definition.setup.seed, placementCount: definition.setup.placements.length },
        anchorCells: definition.anchorCells,
        firstDivergenceLock: witness.firstDivergenceLock,
        shorterRouteLocks: Math.min(witness.primary.locks, witness.alternate.locks),
        routes: [
          routeEvidence(witness.id, 'primary', witness.primary.commandStream),
          routeEvidence(witness.id, 'alternate', witness.alternate.commandStream),
        ],
      };
    }),
    searchBounds: { maxLocks: 22, primaryBeam: 720, alternateBeam: 560 },
  } as const;
}

describe('T32 Hard revision-2 route artifact', () => {
  it('matches the replay-derived evidence for 46, 48, 49, and 50', () => {
    const expected = buildArtifact();
    // @ts-expect-error Node environment variables are available to Vitest but not product types.
    if (process.env.ENDGAME_WRITE_T32_HARD_ARTIFACT === '1') {
      writeFileSync(OUTPUT_PATH, `${JSON.stringify(expected, null, 2)}\n`, 'utf8');
    }
    const persisted = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')) as unknown;
    expect(persisted).toEqual(expected);
  });
});
