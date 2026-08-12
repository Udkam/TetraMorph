import { describe, expect, it } from 'vitest';
import t32Changed10File from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-10.json';
import { BEDROCK_CELL, BOARD_WIDTH, INITIAL_SURVIVAL_BEDROCK_ROWS, TICKS_PER_SECOND, stateHash, survivalIntervalSeconds } from '../core';
import { encodeEndgameRoute } from '../core/endgameRouteSearch';
import { replayEndgameChallenge, replaySurvivalBedrock } from './qaScenario';

const phase7EndgameQaRoute = t32Changed10File.levels
  .find(({ id }) => id === 't5r-drift-08')!
  .routes.find(({ id }) => id === 'primary')!
  .commandStream;

describe('Survival bedrock browser QA replay', () => {
  it('reaches the first deterministic timed rise through ordinary gravity and public commands only', () => {
    const first = replaySurvivalBedrock(5);
    const second = replaySurvivalBedrock(5);

    expect(first.replay.commands[0]).toEqual({ type: 'start' });
    expect(first.replay.commands.some((command) => command.type === 'move')).toBe(true);
    expect(first.replay.commands.some((command) => command.type === 'hard-drop')).toBe(true);
    expect(first.replay.commands.some((command) => command.type === 'tick')).toBe(true);
    expect(first.replay.firstRiseCommandCount).toBeLessThan(first.replay.removalCommandCount);
    expect(first.state.mode).toBe('race');
    expect(first.state.status).toBe('playing');
    expect(first.riseState.elapsedTicks).toBeGreaterThanOrEqual(13 * TICKS_PER_SECOND);
    expect(first.riseState.survivalBedrockRows).toBe(INITIAL_SURVIVAL_BEDROCK_ROWS + 1);
    expect(first.riseState.lines).toBeLessThan(3);
    expect(first.riseState.board.at(-1)).toEqual(Array.from({ length: BOARD_WIDTH }, () => BEDROCK_CELL));
    expect(first.state.active).not.toBeNull();
    expect(first.state.lines).toBeGreaterThanOrEqual(3);
    expect(first.state.survivalBedrockRows).toBe(INITIAL_SURVIVAL_BEDROCK_ROWS);
    expect(first.state.survivalPressureTicks).toBe(0);
    expect(survivalIntervalSeconds(first.state.lines)).toBe(12);
    expect(stateHash(first.state)).toBe(stateHash(second.state));
    expect(first.replay).toEqual(second.replay);
  }, 30_000);
});

describe('T5 endgame browser QA replay', () => {
  it('completes the full first challenge through public commands only', () => {
    const first = replayEndgameChallenge(0x51a1f00d);
    const second = replayEndgameChallenge(0x51a1f00d);

    expect(first.commands[0]).toEqual({ type: 'start' });
    expect(first.commands.some((command) => command.type === 'rotate')).toBe(true);
    expect(first.commands.filter((command) => command.type === 'hard-drop').length).toBeGreaterThan(0);
    expect(first.state.status).toBe('finished');
    expect(first.state.endgameId).toBe('t5r-drift-08');
    expect(first.state.endgameCompletion).toBe('finished');
    expect(first.state.completedLevelId).toBe('t5r-drift-08');
    expect(first.state.nextUnlockedLevelId).toBe('t5r-pulse-14');
    expect(first.state.endgameTargetCells).toEqual([]);
    expect(encodeEndgameRoute(first.commands)).toBe(phase7EndgameQaRoute);
    expect(first.hash).toBe(second.hash);
    expect(first.commands).toEqual(second.commands);
  });
});
