import { describe, expect, it } from 'vitest';
import { ENDGAME_DEFINITIONS, createInitialState, type GameState, type EndgameId } from './game/core';
import {
  CAMPAIGN_LEVELS,
  CAMPAIGN_TIERS,
  INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT,
  ENDGAME_CATEGORIES,
  ENDGAME_CAMPAIGN_REVISION,
  ENDGAME_ROW_BANDS,
  defaultEndgameProgress,
  isEndgameComplete,
  isEndgameUnlocked,
  nextLockedEndgameLevel,
  nextEndgameTierGate,
  parseEndgameProgress,
  endgameBestPieceCount,
  endgameMasteryGateStatus,
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

function progressWith(...completedLevelIds: EndgameId[]) {
  return parseEndgameProgress(JSON.stringify({
    version: 6,
    campaignRevision: ENDGAME_CAMPAIGN_REVISION,
    completedLevelIds,
    bestPieceCounts: {},
  }));
}

function progressWithBests(
  completedLevelIds: readonly EndgameId[],
  bestPieceCounts: Partial<Record<EndgameId, number>>,
) {
  return parseEndgameProgress(JSON.stringify({
    version: 6,
    campaignRevision: ENDGAME_CAMPAIGN_REVISION,
    completedLevelIds,
    bestPieceCounts,
  }));
}

function unlockedIds(progress = defaultEndgameProgress()): EndgameId[] {
  return CAMPAIGN_LEVELS.filter((level) => isEndgameUnlocked(progress, level.id)).map((level) => level.id);
}

describe('revisioned progressive Endgame campaign persistence', () => {
  it('binds every authored level to the frozen 10/20/20 curriculum', () => {
    expect(CAMPAIGN_LEVELS.map((level) => [level.id, level.name])).toEqual(
      ENDGAME_DEFINITIONS.map((level) => [level.id, level.name]),
    );
    expect(CAMPAIGN_LEVELS.map((level) => level.index)).toEqual(
      ENDGAME_DEFINITIONS.map((_, index) => index + 1),
    );
    expect(CAMPAIGN_LEVELS.map((level) => level.difficulty)).toEqual(
      ENDGAME_DEFINITIONS.map((level) => level.difficulty),
    );
    expect(CAMPAIGN_LEVELS.every((level) => level.total === CAMPAIGN_LEVELS.length)).toBe(true);
    expect(ENDGAME_ROW_BANDS.map((band) => band.length)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(ENDGAME_ROW_BANDS.flat().map((level) => level.id)).toEqual(CAMPAIGN_LEVELS.map((level) => level.id));
    expect(CAMPAIGN_TIERS).toBe(ENDGAME_ROW_BANDS);
    expect(ENDGAME_CATEGORIES.map(({ id, levels }) => [id, levels.length])).toEqual([
      ['intro', 10], ['easy', 20], ['hard', 20],
    ]);
    expect(ENDGAME_CATEGORIES.flatMap(({ levels }) => levels.map(({ id }) => id)))
      .toEqual(CAMPAIGN_LEVELS.map(({ id }) => id));
  });

  it('opens every Intro and Easy level immediately while keeping Hard mastery-only', () => {
    const progress = defaultEndgameProgress();
    expect(INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT).toBe(30);
    expect(unlockedEndgameLevelCount(progress)).toBe(30);
    expect(unlockedIds(progress)).toEqual(CAMPAIGN_LEVELS.slice(0, 30).map((level) => level.id));
    expect(nextLockedEndgameLevel(progress)).toBe(CAMPAIGN_LEVELS[30]);
    expect(nextEndgameTierGate(progress)).toBeNull();
  });

  it('unlocks related Hard groups only at each strictly certified optimum-plus-five boundary', () => {
    const completed = new Set<EndgameId>(CAMPAIGN_LEVELS.slice(0, 30).map(({ id }) => id));
    const atThreshold = Object.fromEntries(ENDGAME_OPTIMAL_CERTIFICATES.map((certificate) => (
      [certificate.levelId, certificate.masteryOperations]
    ))) as Partial<Record<EndgameId, number>>;
    const mastered = progressWithBests([...completed], atThreshold);
    expect(unlockedIds(mastered)).toEqual(CAMPAIGN_LEVELS.map(({ id }) => id));
    expect(unlockedEndgameLevelCount(mastered)).toBe(50);
    expect(nextLockedEndgameLevel(mastered)).toBeNull();

    for (const certificate of ENDGAME_OPTIMAL_CERTIFICATES) {
      const aboveThreshold = progressWithBests([...completed], {
        ...atThreshold,
        [certificate.levelId]: certificate.masteryOperations + 1,
      });
      const group = ENDGAME_HARD_MASTERY_GROUPS.find(({ prerequisiteId }) => prerequisiteId === certificate.levelId)!;
      for (const hardLevelId of group.hardLevelIds) {
        expect(isEndgameUnlocked(aboveThreshold, hardLevelId), `${certificate.levelId} -> ${hardLevelId}`).toBe(false);
        expect(endgameMasteryGateStatus(aboveThreshold, hardLevelId)).toMatchObject({
          bestOperations: certificate.masteryOperations + 1,
          requiredOperations: certificate.masteryOperations,
          unlocked: false,
        });
      }
      expect(unlockedEndgameLevelCount(aboveThreshold)).toBe(50 - group.hardLevelIds.length);
    }
  });

  it('keeps migrated Hard completions replayable without unlocking unrelated Hard levels', () => {
    const historic = progressWith(CAMPAIGN_LEVELS[31]!.id, CAMPAIGN_LEVELS[32]!.id);
    expect(unlockedEndgameLevelCount(historic)).toBe(32);
    expect(unlockedIds(historic)).toEqual([
      ...CAMPAIGN_LEVELS.slice(0, 30).map((level) => level.id),
      CAMPAIGN_LEVELS[31]!.id,
      CAMPAIGN_LEVELS[32]!.id,
    ]);
    expect(isEndgameComplete(historic, CAMPAIGN_LEVELS[31]!.id)).toBe(true);
    expect(isEndgameUnlocked(historic, CAMPAIGN_LEVELS[31]!.id)).toBe(true);
    expect(nextLockedEndgameLevel(historic)).toBe(CAMPAIGN_LEVELS[30]);
    expect(nextEndgameTierGate(historic)).toBeNull();
  });

  it('does not let unrelated Intro or Easy completions bypass a Hard mastery gate', () => {
    const progress = progressWith(...CAMPAIGN_LEVELS.slice(0, 30).map(({ id }) => id));
    expect(unlockedIds(progress)).toEqual(CAMPAIGN_LEVELS.slice(0, 30).map(({ id }) => id));
    expect(isEndgameUnlocked(progress, CAMPAIGN_LEVELS[30]!.id)).toBe(false);
    expect(nextEndgameTierGate(progress)).toBeNull();
  });

  it('records every selectable canonical win and retains the lowest successful count', () => {
    const late = CAMPAIGN_LEVELS.at(-1)!;
    const first = CAMPAIGN_LEVELS[0]!;
    let progress = defaultEndgameProgress();

    progress = recordCanonicalEndgameCompletion(progress, finishedEndgameState(late.id, 12), late.id);
    expect(progress.completedLevelIds).toEqual([late.id]);
    expect(endgameBestPieceCount(progress, late.id)).toBe(12);
    progress = recordCanonicalEndgameCompletion(progress, finishedEndgameState(first.id, 7));
    expect(progress.completedLevelIds).toEqual([first.id, late.id]);
    expect(endgameBestPieceCount(progress, first.id)).toBe(7);
    expect(recordCanonicalEndgameCompletion(progress, finishedEndgameState(first.id, 8))).toBe(progress);
    progress = recordCanonicalEndgameCompletion(progress, finishedEndgameState(first.id, 5));
    expect(endgameBestPieceCount(progress, first.id)).toBe(5);
    expect(endgameBestPieceCount(progress, CAMPAIGN_LEVELS[1]!.id)).toBeNull();
    expect(unlockedEndgameLevelCount(progress)).toBe(31);

    const migratedLate = progressWith(late.id);
    const replayedLate = recordCanonicalEndgameCompletion(migratedLate, finishedEndgameState(late.id, 11));
    expect(replayedLate.completedLevelIds).toContain(late.id);
    expect(endgameBestPieceCount(replayedLate, late.id)).toBe(11);
    expect(unlockedEndgameLevelCount(replayedLate)).toBe(31);
  });

  it('accepts the canonical Endgame identity fallback but rejects mismatched snapshots', () => {
    const first = CAMPAIGN_LEVELS[0]!;
    const second = CAMPAIGN_LEVELS[1]!;
    const missingCompletionId = {
      ...finishedEndgameState(first.id, 6),
      completedLevelId: null,
    };
    const recorded = recordCanonicalEndgameCompletion(defaultEndgameProgress(), missingCompletionId, first.id);
    expect(recorded.completedLevelIds).toEqual([first.id]);
    expect(endgameBestPieceCount(recorded, first.id)).toBe(6);

    const mismatchedSnapshot = {
      ...finishedEndgameState(first.id, 5),
      completedLevelId: second.id,
    };
    expect(recordCanonicalEndgameCompletion(recorded, mismatchedSnapshot, first.id)).toBe(recorded);
    expect(recordCanonicalEndgameCompletion(recorded, finishedEndgameState(first.id, 5), second.id)).toBe(recorded);
  });

  it('parses only canonical v6 records and restores canonical campaign ordering', () => {
    const first = CAMPAIGN_LEVELS[0]!.id;
    const third = CAMPAIGN_LEVELS[2]!.id;
    const current = parseEndgameProgress(JSON.stringify({
      version: 6,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: [first, third],
      bestPieceCounts: { [first]: 5, [third]: 8 },
    }));
    expect(current).toEqual({
      version: 6,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: orderedCampaignIds(first, third),
      bestPieceCounts: { [first]: 5, [third]: 8 },
    });
  });

  it('fails closed on malformed persisted values while preserving only the fresh frontier', () => {
    const baseline = defaultEndgameProgress();
    const malformed = [
      null,
      '{',
      '[]',
      '{"version":1,"completedLevelIds":[]}',
      '{"version":2,"completedLevelIds":"t3r-shaft-01"}',
      '{"version":3,"completedLevelIds":["offset-01"]}',
      '{"version":3,"completedLevelIds":["t3r-shaft-01",42]}',
      '{"version":4,"completedLevelIds":[],"bestPieceCounts":{}}',
      '{"version":5,"campaignRevision":2,"completedLevelIds":[],"bestPieceCounts":{}}',
      '{"version":6,"completedLevelIds":[],"bestPieceCounts":{}}',
      '{"version":6,"campaignRevision":0,"completedLevelIds":[],"bestPieceCounts":{}}',
      '{"version":6,"campaignRevision":1,"completedLevelIds":["t3r-shaft-01"],"bestPieceCounts":{"t3r-shaft-01":4}}',
      '{"version":6,"campaignRevision":2,"completedLevelIds":["t3r-shaft-01"],"bestPieceCounts":{"offset-01":4}}',
      '{"version":6,"campaignRevision":2,"completedLevelIds":["t3r-shaft-01"],"bestPieceCounts":{"t3r-shaft-01":0}}',
      '{"version":6,"campaignRevision":2,"completedLevelIds":["t3r-shaft-01","t3r-shaft-01"],"bestPieceCounts":{}}',
      '{"version":6,"campaignRevision":2,"completedLevelIds":["t3r-shaft-03","t3r-shaft-01"],"bestPieceCounts":{}}',
      '{"version":6,"campaignRevision":2,"completedLevelIds":[],"bestPieceCounts":{},"extra":true}',
    ];

    for (const raw of malformed) {
      const parsed = parseEndgameProgress(raw);
      expect(parsed).toEqual(baseline);
      expect(unlockedEndgameLevelCount(parsed)).toBe(INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT);
    }

  });

  it('fails frontier queries closed for malformed in-memory best records', () => {
    const completed = progressWith(
      CAMPAIGN_LEVELS[0]!.id,
      CAMPAIGN_LEVELS[1]!.id,
      CAMPAIGN_LEVELS[2]!.id,
    );
    const malformedBests: unknown[] = [
      null,
      { [CAMPAIGN_LEVELS[0]!.id]: 0 },
      { 'offset-01': 4 },
    ];

    for (const bestPieceCounts of malformedBests) {
      const malformed = { ...completed, bestPieceCounts } as unknown as EndgameProgress;
      expect(unlockedIds(malformed)).toEqual(CAMPAIGN_LEVELS.slice(0, 30).map((level) => level.id));
      expect(unlockedEndgameLevelCount(malformed)).toBe(30);
      expect(nextLockedEndgameLevel(malformed)).toBe(CAMPAIGN_LEVELS[30]);
      expect(nextEndgameTierGate(malformed)).toBeNull();
    }
  });
});

function orderedCampaignIds(...ids: EndgameId[]): EndgameId[] {
  const completed = new Set(ids);
  return CAMPAIGN_LEVELS.filter((level) => completed.has(level.id)).map((level) => level.id);
}
