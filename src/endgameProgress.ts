import { ENDGAME_DEFINITIONS, type GameState, type EndgameId } from './game/core';
import {
  ENDGAME_HARD_MASTERY_GROUPS,
  endgameHardMasteryGroup,
  endgameOptimalCertificate,
  type EndgameHardMasteryGroup,
} from './endgameMastery';

/** Revision-3 is a 46-board published Endgame campaign. V6 remains a rollback source. */
export const ENDGAME_PROGRESS_KEY = 'tetramorph:endgame-completion:v7';
export const ENDGAME_PROGRESS_V6_KEY = 'tetramorph:endgame-completion:v6';
const PROGRESS_VERSION = 7;
export const ENDGAME_CAMPAIGN_REVISION = 3;

/** Intro and Easy are exploration space; only Hard is mastery-gated. */
export const INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT = 30;

export interface EndgameProgress {
  version: typeof PROGRESS_VERSION;
  campaignRevision: typeof ENDGAME_CAMPAIGN_REVISION;
  /** Active revision-3 IDs only; completion history derives the access frontier. */
  completedLevelIds: EndgameId[];
  /** Lowest locked-piece count from a real completed attempt, by active level. */
  bestLockedPieceCounts: Partial<Record<EndgameId, number>>;
}

export interface CampaignLevel {
  id: EndgameId;
  name: string;
  index: number;
  total: number;
  difficulty: number;
}

export type EndgameCategoryId = 'intro' | 'easy' | 'hard';

export interface EndgameCategory {
  id: EndgameCategoryId;
  levels: readonly CampaignLevel[];
}

export const CAMPAIGN_LEVELS: readonly CampaignLevel[] = Object.freeze(
  ENDGAME_DEFINITIONS.map((level, index) => Object.freeze({
    id: level.id,
    name: level.name,
    index: index + 1,
    total: ENDGAME_DEFINITIONS.length,
    difficulty: level.difficulty,
  })),
);

export const ENDGAME_CATEGORIES: readonly EndgameCategory[] = Object.freeze([
  Object.freeze({ id: 'intro', levels: Object.freeze(CAMPAIGN_LEVELS.slice(0, 5)) }),
  Object.freeze({ id: 'easy', levels: Object.freeze(CAMPAIGN_LEVELS.slice(5, 30)) }),
  Object.freeze({ id: 'hard', levels: Object.freeze(CAMPAIGN_LEVELS.slice(30)) }),
]);

const LEVEL_IDS = new Set<EndgameId>(CAMPAIGN_LEVELS.map((level) => level.id));

export function defaultEndgameProgress(): EndgameProgress {
  return {
    version: PROGRESS_VERSION,
    campaignRevision: ENDGAME_CAMPAIGN_REVISION,
    completedLevelIds: [],
    bestLockedPieceCounts: {},
  };
}

function isEndgameId(value: unknown): value is EndgameId {
  return typeof value === 'string' && LEVEL_IDS.has(value as EndgameId);
}

/** Normalizes persisted IDs to the active revision-3 campaign order. */
function orderedUnique(ids: readonly EndgameId[]): EndgameId[] {
  const completed = new Set(ids);
  return CAMPAIGN_LEVELS.filter((level) => completed.has(level.id)).map((level) => level.id);
}

function isBestLockedPieceCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function orderedBestLockedPieceCounts(
  value: unknown,
  completedIds: readonly EndgameId[],
): Partial<Record<EndgameId, number>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const completed = new Set(completedIds);
  const entries = Object.entries(raw);
  if (!entries.every(([levelId, count]) => (
    isEndgameId(levelId) && completed.has(levelId) && isBestLockedPieceCount(count)
  ))) return null;
  const ordered: Partial<Record<EndgameId, number>> = {};
  for (const level of CAMPAIGN_LEVELS) {
    const count = raw[level.id];
    if (count !== undefined) ordered[level.id] = count as number;
  }
  return ordered;
}

function completedIdsFrom(progress: EndgameProgress | null | undefined): EndgameId[] | null {
  if (
    !progress
    || progress.version !== PROGRESS_VERSION
    || progress.campaignRevision !== ENDGAME_CAMPAIGN_REVISION
    || !Array.isArray(progress.completedLevelIds)
    || !progress.completedLevelIds.every(isEndgameId)
  ) return null;
  return orderedUnique(progress.completedLevelIds);
}

function bestLockedPieceCountsFrom(
  progress: EndgameProgress,
  completedIds: readonly EndgameId[],
): Partial<Record<EndgameId, number>> | null {
  return orderedBestLockedPieceCounts(progress.bestLockedPieceCounts, completedIds);
}

function completedIdSetFrom(progress: EndgameProgress): ReadonlySet<EndgameId> {
  const completedIds = completedIdsFrom(progress);
  if (completedIds === null || bestLockedPieceCountsFrom(progress, completedIds) === null) return new Set();
  return new Set(completedIds);
}

function unlockedLevelIdsFrom(progress: EndgameProgress): ReadonlySet<EndgameId> {
  const completed = completedIdSetFrom(progress);
  const completedIds = completedIdsFrom(progress) ?? [];
  const bestLockedPieceCounts = bestLockedPieceCountsFrom(progress, completedIds) ?? {};
  const unlocked = new Set<EndgameId>(completed);
  for (const level of CAMPAIGN_LEVELS.slice(0, INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT)) unlocked.add(level.id);
  for (const group of ENDGAME_HARD_MASTERY_GROUPS) {
    const certificate = endgameOptimalCertificate(group.prerequisiteId)!;
    const best = bestLockedPieceCounts[group.prerequisiteId];
    if (best === undefined || best > certificate.masteryOperations) continue;
    for (const levelId of group.hardLevelIds) unlocked.add(levelId);
  }
  return unlocked;
}

export interface EndgameMasteryGateStatus {
  group: EndgameHardMasteryGroup;
  optimalOperations: number;
  requiredOperations: number;
  bestOperations: number | null;
  unlocked: boolean;
}

export function endgameMasteryGateStatus(
  progress: EndgameProgress,
  levelId: EndgameId,
): EndgameMasteryGateStatus | null {
  const group = endgameHardMasteryGroup(levelId);
  if (!group) return null;
  const certificate = endgameOptimalCertificate(group.prerequisiteId)!;
  const bestOperations = endgameBestPieceCount(progress, group.prerequisiteId);
  return {
    group,
    optimalOperations: certificate.optimalOperations,
    requiredOperations: certificate.masteryOperations,
    bestOperations,
    unlocked: isEndgameComplete(progress, levelId)
      || (bestOperations !== null && bestOperations <= certificate.masteryOperations),
  };
}

export function parseEndgameProgress(raw: string | null): EndgameProgress {
  if (raw === null) return defaultEndgameProgress();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultEndgameProgress();
    if (!hasExactKeys(value as Record<string, unknown>, [
      'version', 'campaignRevision', 'completedLevelIds', 'bestLockedPieceCounts',
    ])) return defaultEndgameProgress();
    const candidate = value as {
      version?: unknown;
      campaignRevision?: unknown;
      completedLevelIds?: unknown;
      bestLockedPieceCounts?: unknown;
    };
    if (
      candidate.version !== PROGRESS_VERSION
      || candidate.campaignRevision !== ENDGAME_CAMPAIGN_REVISION
      || !Array.isArray(candidate.completedLevelIds)
      || !candidate.completedLevelIds.every(isEndgameId)
    ) return defaultEndgameProgress();
    const persistedCompletedLevelIds = candidate.completedLevelIds as EndgameId[];
    const completedLevelIds = orderedUnique(persistedCompletedLevelIds);
    if (
      completedLevelIds.length !== persistedCompletedLevelIds.length
      || completedLevelIds.some((id, index) => id !== persistedCompletedLevelIds[index])
    ) return defaultEndgameProgress();
    const bestLockedPieceCounts = orderedBestLockedPieceCounts(
      candidate.bestLockedPieceCounts,
      completedLevelIds,
    );
    if (bestLockedPieceCounts === null) return defaultEndgameProgress();
    return {
      version: PROGRESS_VERSION,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds,
      bestLockedPieceCounts,
    };
  } catch {
    return defaultEndgameProgress();
  }
}

export function isEndgameComplete(progress: EndgameProgress, levelId: EndgameId): boolean {
  return completedIdsFrom(progress)?.includes(levelId) ?? false;
}

/** The selector only exposes a value after a real active-campaign successful run. */
export function endgameBestPieceCount(progress: EndgameProgress, levelId: EndgameId): number | null {
  const completedIds = completedIdsFrom(progress);
  if (completedIds === null || !completedIds.includes(levelId)) return null;
  return bestLockedPieceCountsFrom(progress, completedIds)?.[levelId] ?? null;
}

/** Counts the open course plus individually replayable historical completions. */
export function unlockedEndgameLevelCount(progress: EndgameProgress): number {
  return unlockedLevelIdsFrom(progress).size;
}

export function isEndgameUnlocked(progress: EndgameProgress, levelId: EndgameId): boolean {
  return unlockedLevelIdsFrom(progress).has(levelId);
}

export function nextLockedEndgameLevel(progress: EndgameProgress): CampaignLevel | null {
  const unlocked = unlockedLevelIdsFrom(progress);
  return CAMPAIGN_LEVELS.find((level) => !unlocked.has(level.id)) ?? null;
}

/**
 * Records one active revision-3 completion. UI access is gated separately; this
 * persistence boundary requires canonical identity and a genuine finished Core state.
 */
export function recordCanonicalEndgameCompletion(
  progress: EndgameProgress,
  state: GameState,
  expectedLevelId?: EndgameId,
): EndgameProgress {
  const completedIds = completedIdsFrom(progress);
  const bestLockedPieceCounts = completedIds === null
    ? null
    : bestLockedPieceCountsFrom(progress, completedIds);
  const levelId = state.completedLevelId ?? state.endgameId ?? expectedLevelId ?? null;
  const snapshotIdentityMismatch = (
    state.completedLevelId !== null
    && state.endgameId !== null
    && state.completedLevelId !== state.endgameId
  );
  if (
    completedIds === null
    || bestLockedPieceCounts === null
    || state.mode !== 'endgame'
    || state.endgameCompletion !== 'finished'
    || levelId === null
    || !LEVEL_IDS.has(levelId)
    || snapshotIdentityMismatch
    || (expectedLevelId !== undefined && levelId !== expectedLevelId)
    || !isBestLockedPieceCount(state.pieceCount)
  ) return progress;

  const existingBest = bestLockedPieceCounts[levelId];
  if (completedIds.includes(levelId) && existingBest !== undefined && state.pieceCount >= existingBest) return progress;

  return {
    version: PROGRESS_VERSION,
    campaignRevision: ENDGAME_CAMPAIGN_REVISION,
    completedLevelIds: orderedUnique([...completedIds, levelId]),
    bestLockedPieceCounts: {
      ...bestLockedPieceCounts,
      [levelId]: existingBest === undefined ? state.pieceCount : Math.min(existingBest, state.pieceCount),
    },
  };
}
