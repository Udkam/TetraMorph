import { describe, expect, it } from 'vitest';
import { ENDGAME_DEFINITIONS, createInitialState, type EndgameId, type GameState } from './game/core';
import {
  CAMPAIGN_LEVELS,
  ENDGAME_CAMPAIGN_REVISION,
  ENDGAME_CATEGORIES,
  INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT,
  defaultEndgameProgress,
  endgameBestPieceCount,
  endgameMasteryGateStatus,
  isEndgameComplete,
  isEndgameUnlocked,
  nextLockedEndgameLevel,
  parseEndgameProgress,
  recordCanonicalEndgameCompletion,
  type EndgameProgress,
  unlockedEndgameLevelCount,
} from './endgameProgress';
import { ENDGAME_HARD_MASTERY_GROUPS, ENDGAME_OPTIMAL_CERTIFICATES } from './endgameMastery';

function finishedEndgameState(levelId: EndgameId, pieceCount: number): GameState {
  return {
    ...createInitialState(0x51a1f00d, 'endgame', levelId),
    status: 'finished',
    endgameCompletion: 'finished',
    completedLevelId: levelId,
    pieceCount,
  };
}

function progressWith(
  completedLevelIds: readonly EndgameId[],
  bestLockedPieceCounts: Partial<Record<EndgameId, number>> = {},
): EndgameProgress {
  return parseEndgameProgress(JSON.stringify({
    version: 7,
    campaignRevision: ENDGAME_CAMPAIGN_REVISION,
    completedLevelIds,
    bestLockedPieceCounts,
  }));
}

function unlockedIds(progress = defaultEndgameProgress()): EndgameId[] {
  return CAMPAIGN_LEVELS.filter((level) => isEndgameUnlocked(progress, level.id)).map((level) => level.id);
}

function orderedCampaignIds(...ids: EndgameId[]): EndgameId[] {
  const completed = new Set(ids);
  return CAMPAIGN_LEVELS.filter((level) => completed.has(level.id)).map((level) => level.id);
}

describe('revision-3 Endgame campaign persistence', () => {
  it('binds every authored board to the frozen 5/25/16 curriculum', () => {
    expect(CAMPAIGN_LEVELS.map((level) => [level.id, level.name])).toEqual(
      ENDGAME_DEFINITIONS.map((level) => [level.id, level.name]),
    );
    expect(CAMPAIGN_LEVELS.map((level) => level.index)).toEqual(
      ENDGAME_DEFINITIONS.map((_, index) => index + 1),
    );
    expect(CAMPAIGN_LEVELS.every((level) => level.total === 46)).toBe(true);
    expect(ENDGAME_CATEGORIES.map(({ id, levels }) => [id, levels.length])).toEqual([
      ['intro', 5], ['easy', 25], ['hard', 16],
    ]);
    expect(ENDGAME_CATEGORIES.flatMap(({ levels }) => levels.map(({ id }) => id)))
      .toEqual(CAMPAIGN_LEVELS.map(({ id }) => id));
    expect(CAMPAIGN_LEVELS.map(({ id }) => id)).not.toContain('tm-endgame-34');
    expect(CAMPAIGN_LEVELS.map(({ id }) => id)).not.toContain('tm-endgame-40');
    expect(CAMPAIGN_LEVELS.map(({ id }) => id)).not.toContain('tm-endgame-42');
    expect(CAMPAIGN_LEVELS.map(({ id }) => id)).not.toContain('tm-endgame-43');
  });

  it('opens every Intro and Easy board immediately while keeping Hard mastery-only', () => {
    const progress = defaultEndgameProgress();
    expect(INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT).toBe(30);
    expect(unlockedEndgameLevelCount(progress)).toBe(30);
    expect(unlockedIds(progress)).toEqual(CAMPAIGN_LEVELS.slice(0, 30).map((level) => level.id));
    expect(nextLockedEndgameLevel(progress)).toBe(CAMPAIGN_LEVELS[30]);
  });

  it('opens each Hard group only at its certified optimum-plus-five boundary', () => {
    const easyIds = CAMPAIGN_LEVELS.slice(0, 30).map(({ id }) => id);
    const atThreshold = Object.fromEntries(ENDGAME_OPTIMAL_CERTIFICATES.map((certificate) => (
      [certificate.levelId, certificate.masteryOperations]
    ))) as Partial<Record<EndgameId, number>>;
    const mastered = progressWith(easyIds, atThreshold);
    expect(unlockedIds(mastered)).toEqual(CAMPAIGN_LEVELS.map(({ id }) => id));
    expect(unlockedEndgameLevelCount(mastered)).toBe(46);
    expect(nextLockedEndgameLevel(mastered)).toBeNull();

    for (const certificate of ENDGAME_OPTIMAL_CERTIFICATES) {
      const group = ENDGAME_HARD_MASTERY_GROUPS.find(({ prerequisiteId }) => prerequisiteId === certificate.levelId);
      expect(group, certificate.levelId).toBeDefined();
      const aboveThreshold = progressWith(easyIds, {
        ...atThreshold,
        [certificate.levelId]: certificate.masteryOperations + 1,
      });
      for (const hardLevelId of group!.hardLevelIds) {
        expect(isEndgameUnlocked(aboveThreshold, hardLevelId), `${certificate.levelId} -> ${hardLevelId}`).toBe(false);
        expect(endgameMasteryGateStatus(aboveThreshold, hardLevelId)).toMatchObject({
          bestOperations: certificate.masteryOperations + 1,
          requiredOperations: certificate.masteryOperations,
          unlocked: false,
        });
      }
      expect(unlockedEndgameLevelCount(aboveThreshold)).toBe(46 - group!.hardLevelIds.length);
    }
  });

  it('keeps a completed Hard board replayable without unlocking unrelated groups', () => {
    const hard = CAMPAIGN_LEVELS[30]!.id;
    const progress = progressWith([hard]);
    expect(isEndgameComplete(progress, hard)).toBe(true);
    expect(isEndgameUnlocked(progress, hard)).toBe(true);
    expect(unlockedEndgameLevelCount(progress)).toBe(31);
    expect(nextLockedEndgameLevel(progress)).toBe(CAMPAIGN_LEVELS[31]);
  });

  it('records canonical wins and retains only the lowest locked-piece count', () => {
    const first = CAMPAIGN_LEVELS[0]!.id;
    const late = CAMPAIGN_LEVELS.at(-1)!.id;
    let progress = defaultEndgameProgress();

    progress = recordCanonicalEndgameCompletion(progress, finishedEndgameState(late, 12), late);
    progress = recordCanonicalEndgameCompletion(progress, finishedEndgameState(first, 7), first);
    expect(progress.completedLevelIds).toEqual([first, late]);
    expect(endgameBestPieceCount(progress, first)).toBe(7);
    expect(endgameBestPieceCount(progress, late)).toBe(12);
    expect(recordCanonicalEndgameCompletion(progress, finishedEndgameState(first, 8))).toBe(progress);

    progress = recordCanonicalEndgameCompletion(progress, finishedEndgameState(first, 5));
    expect(endgameBestPieceCount(progress, first)).toBe(5);
    expect(endgameBestPieceCount(progress, CAMPAIGN_LEVELS[1]!.id)).toBeNull();
  });

  it('accepts only matching finished Endgame snapshots', () => {
    const first = CAMPAIGN_LEVELS[0]!.id;
    const second = CAMPAIGN_LEVELS[1]!.id;
    const fallback = { ...finishedEndgameState(first, 6), completedLevelId: null };
    const recorded = recordCanonicalEndgameCompletion(defaultEndgameProgress(), fallback, first);
    expect(recorded.completedLevelIds).toEqual([first]);
    const mismatch = { ...finishedEndgameState(first, 5), completedLevelId: second };
    expect(recordCanonicalEndgameCompletion(recorded, mismatch, first)).toBe(recorded);
    expect(recordCanonicalEndgameCompletion(recorded, finishedEndgameState(first, 5), second)).toBe(recorded);
  });

  it('parses only canonical v7 fields and campaign ordering', () => {
    const first = CAMPAIGN_LEVELS[0]!.id;
    const third = CAMPAIGN_LEVELS[2]!.id;
    expect(progressWith([first, third], { [first]: 5, [third]: 8 })).toEqual({
      version: 7,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: orderedCampaignIds(first, third),
      bestLockedPieceCounts: { [first]: 5, [third]: 8 },
    });
  });

  it('fails closed on malformed or obsolete persisted records', () => {
    const baseline = defaultEndgameProgress();
    const first = CAMPAIGN_LEVELS[0]!.id;
    const malformed = [
      null,
      '{',
      '[]',
      '{"version":6,"campaignRevision":2,"completedLevelIds":[],"bestPieceCounts":{}}',
      '{"version":7,"completedLevelIds":[],"bestLockedPieceCounts":{}}',
      '{"version":7,"campaignRevision":2,"completedLevelIds":[],"bestLockedPieceCounts":{}}',
      `{"version":7,"campaignRevision":3,"completedLevelIds":["${first}","${first}"],"bestLockedPieceCounts":{}}`,
      `{"version":7,"campaignRevision":3,"completedLevelIds":["tm-endgame-34"],"bestLockedPieceCounts":{}}`,
      `{"version":7,"campaignRevision":3,"completedLevelIds":["${first}"],"bestPieceCounts":{"${first}":4}}`,
      `{"version":7,"campaignRevision":3,"completedLevelIds":["${first}"],"bestLockedPieceCounts":{"${first}":0}}`,
      '{"version":7,"campaignRevision":3,"completedLevelIds":[],"bestLockedPieceCounts":{},"extra":true}',
    ];
    for (const raw of malformed) {
      expect(parseEndgameProgress(raw)).toEqual(baseline);
    }
  });

  it('fails the access frontier closed for malformed in-memory best counts', () => {
    const completed = progressWith(CAMPAIGN_LEVELS.slice(0, 3).map(({ id }) => id));
    for (const bestLockedPieceCounts of [null, { [CAMPAIGN_LEVELS[0]!.id]: 0 }, { unknown: 4 }]) {
      const malformed = { ...completed, bestLockedPieceCounts } as unknown as EndgameProgress;
      expect(unlockedIds(malformed)).toEqual(CAMPAIGN_LEVELS.slice(0, 30).map(({ id }) => id));
      expect(unlockedEndgameLevelCount(malformed)).toBe(30);
    }
  });
});
