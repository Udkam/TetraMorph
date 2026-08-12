import { ENDGAME_DEFINITIONS, type GameState, type EndgameId } from './game/core';
import {
  ENDGAME_HARD_MASTERY_GROUPS,
  endgameHardMasteryGroup,
  endgameOptimalCertificate,
  type EndgameHardMasteryGroup,
} from './endgameMastery';

/** Canonical 50-board Endgame namespace record. Legacy input lives in one isolated decoder. */
export const ENDGAME_PROGRESS_KEY = 'tetramorph:endgame-completion:v6';
const PROGRESS_VERSION = 6;
export const ENDGAME_CAMPAIGN_REVISION = 2;

/** Intro and Easy are exploration space; only Hard is mastery-gated. */
export const INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT = 30;

export interface EndgameProgress {
  version: typeof PROGRESS_VERSION;
  campaignRevision: typeof ENDGAME_CAMPAIGN_REVISION;
  /** Canonical IDs only; completion history derives the current access frontier. */
  completedLevelIds: EndgameId[];
  /** Lowest number of locked pieces from a real completed attempt, by canonical level. */
  bestPieceCounts: Partial<Record<EndgameId, number>>;
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
  Object.freeze({ id: 'intro', levels: Object.freeze(CAMPAIGN_LEVELS.slice(0, 10)) }),
  Object.freeze({ id: 'easy', levels: Object.freeze(CAMPAIGN_LEVELS.slice(10, 30)) }),
  Object.freeze({ id: 'hard', levels: Object.freeze(CAMPAIGN_LEVELS.slice(30)) }),
]);

const ROW_BAND_LENGTH = 5;

function buildRowBands(levels: readonly CampaignLevel[]): readonly (readonly CampaignLevel[])[] {
  if (levels.length === 0 || levels.length % ROW_BAND_LENGTH !== 0) {
    throw new Error('Endgame row bands require a non-empty campaign divisible into five-level groups.');
  }
  const tiers: (readonly CampaignLevel[])[] = [];
  for (let cursor = 0; cursor < levels.length; cursor += ROW_BAND_LENGTH) {
    const tier = levels.slice(cursor, cursor + ROW_BAND_LENGTH);
    if (tier.length !== ROW_BAND_LENGTH) throw new Error('Endgame row band is incomplete.');
    tiers.push(Object.freeze(tier));
  }
  return Object.freeze(tiers);
}

/** Legacy five-level grouping retained for save-order compatibility and diagnostics only. */
export const ENDGAME_ROW_BANDS = buildRowBands(CAMPAIGN_LEVELS);
/** @deprecated Compatibility export for the same canonical five-level bands. */
export const CAMPAIGN_TIERS = ENDGAME_ROW_BANDS;

export interface EndgameTierGate {
  /** The already-open tier whose completions are counted. */
  prerequisiteTier: readonly CampaignLevel[];
  /** The next closed tier this gate will unlock. */
  unlocksTier: readonly CampaignLevel[];
  completedCount: number;
  requiredCount: number;
}

interface EndgameTierGateDefinition {
  prerequisiteTier: readonly CampaignLevel[];
  unlocksTier: readonly CampaignLevel[];
  requiredCount: number;
}

const ENDGAME_TIER_GATES: readonly EndgameTierGateDefinition[] = Object.freeze([]);

const LEVEL_IDS = new Set<EndgameId>(CAMPAIGN_LEVELS.map((level) => level.id));
export function defaultEndgameProgress(): EndgameProgress {
  return {
    version: PROGRESS_VERSION,
    campaignRevision: ENDGAME_CAMPAIGN_REVISION,
    completedLevelIds: [],
    bestPieceCounts: {},
  };
}

function isEndgameId(value: unknown): value is EndgameId {
  return typeof value === 'string' && LEVEL_IDS.has(value as EndgameId);
}

/** Normalizes persisted IDs to the *current* campaign order after migration. */
function orderedUnique(ids: readonly EndgameId[]): EndgameId[] {
  const completed = new Set(ids);
  return CAMPAIGN_LEVELS.filter((level) => completed.has(level.id)).map((level) => level.id);
}

function isBestPieceCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function orderedBestPieceCounts(
  value: unknown,
  completedIds: readonly EndgameId[],
): Partial<Record<EndgameId, number>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const completed = new Set(completedIds);
  const entries = Object.entries(raw);
  if (!entries.every(([levelId, count]) => isEndgameId(levelId) && completed.has(levelId) && isBestPieceCount(count))) {
    return null;
  }
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

function bestPieceCountsFrom(progress: EndgameProgress, completedIds: readonly EndgameId[]): Partial<Record<EndgameId, number>> | null {
  return orderedBestPieceCounts(progress.bestPieceCounts, completedIds);
}

function completedIdSetFrom(progress: EndgameProgress): ReadonlySet<EndgameId> {
  const completedIds = completedIdsFrom(progress);
  if (completedIds === null || bestPieceCountsFrom(progress, completedIds) === null) {
    return new Set();
  }
  return new Set(completedIds);
}

function unlockedLevelIdsFrom(progress: EndgameProgress): ReadonlySet<EndgameId> {
  const completed = completedIdSetFrom(progress);
  const completedIds = completedIdsFrom(progress) ?? [];
  const bestPieceCounts = bestPieceCountsFrom(progress, completedIds) ?? {};
  const unlocked = new Set<EndgameId>(completed);
  for (const level of CAMPAIGN_LEVELS.slice(0, INITIAL_AVAILABLE_ENDGAME_LEVEL_COUNT)) {
    unlocked.add(level.id);
  }

  for (const gate of ENDGAME_TIER_GATES) {
    const completedCount = gate.prerequisiteTier.reduce(
      (count, level) => count + Number(completed.has(level.id)),
      0,
    );
    if (completedCount < gate.requiredCount) break;
    for (const level of gate.unlocksTier) unlocked.add(level.id);
  }
  for (const group of ENDGAME_HARD_MASTERY_GROUPS) {
    const certificate = endgameOptimalCertificate(group.prerequisiteId)!;
    const best = bestPieceCounts[group.prerequisiteId];
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

/** Returns the first unsatisfied gate on the canonical, already-open frontier. */
export function nextEndgameTierGate(progress: EndgameProgress): EndgameTierGate | null {
  const completed = completedIdSetFrom(progress);
  for (const gate of ENDGAME_TIER_GATES) {
    const completedCount = gate.prerequisiteTier.reduce(
      (count, level) => count + Number(completed.has(level.id)),
      0,
    );
    if (completedCount < gate.requiredCount) {
      return {
        prerequisiteTier: gate.prerequisiteTier,
        unlocksTier: gate.unlocksTier,
        completedCount,
        requiredCount: gate.requiredCount,
      };
    }
  }
  return null;
}

export function parseEndgameProgress(raw: string | null): EndgameProgress {
  if (raw === null) return defaultEndgameProgress();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultEndgameProgress();
    if (!hasExactKeys(value as Record<string, unknown>, [
      'version', 'campaignRevision', 'completedLevelIds', 'bestPieceCounts',
    ])) return defaultEndgameProgress();
    const candidate = value as {
      version?: unknown;
      campaignRevision?: unknown;
      completedLevelIds?: unknown;
      bestPieceCounts?: unknown;
    };
    if (candidate.version !== PROGRESS_VERSION || !Array.isArray(candidate.completedLevelIds)) {
      return defaultEndgameProgress();
    }
    if (candidate.campaignRevision !== ENDGAME_CAMPAIGN_REVISION) {
      return defaultEndgameProgress();
    }
    if (!candidate.completedLevelIds.every(isEndgameId)) return defaultEndgameProgress();
    const persistedCompletedLevelIds = candidate.completedLevelIds as EndgameId[];
    const completedLevelIds = orderedUnique(persistedCompletedLevelIds);
    if (
      completedLevelIds.length !== persistedCompletedLevelIds.length
      || completedLevelIds.some((id, index) => id !== persistedCompletedLevelIds[index])
    ) return defaultEndgameProgress();
    const bestPieceCounts = orderedBestPieceCounts(candidate.bestPieceCounts, completedLevelIds);
    if (bestPieceCounts === null) return defaultEndgameProgress();
    return {
      version: PROGRESS_VERSION,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds,
      bestPieceCounts,
    };
  } catch {
    return defaultEndgameProgress();
  }
}

export function isEndgameComplete(progress: EndgameProgress, levelId: EndgameId): boolean {
  return completedIdsFrom(progress)?.includes(levelId) ?? false;
}

/** The selector only exposes a value after a real canonical successful run. */
export function endgameBestPieceCount(progress: EndgameProgress, levelId: EndgameId): number | null {
  const completedIds = completedIdsFrom(progress);
  if (completedIds === null || !completedIds.includes(levelId)) return null;
  return bestPieceCountsFrom(progress, completedIds)?.[levelId] ?? null;
}

/** Counts the canonical frontier plus individually replayable historical completions. */
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
 * Records one canonical Endgame completion. UI access is gated separately; this
 * persistence boundary requires canonical identity and a genuine finished Core state.
 */
export function recordCanonicalEndgameCompletion(
  progress: EndgameProgress,
  state: GameState,
  expectedLevelId?: EndgameId,
): EndgameProgress {
  const completedIds = completedIdsFrom(progress);
  const bestPieceCounts = completedIds === null ? null : bestPieceCountsFrom(progress, completedIds);
  const levelId = state.completedLevelId ?? state.endgameId ?? expectedLevelId ?? null;
  const snapshotIdentityMismatch = (
    state.completedLevelId !== null
    && state.endgameId !== null
    && state.completedLevelId !== state.endgameId
  );
  if (
    completedIds === null
    || bestPieceCounts === null
    || state.mode !== 'endgame'
    || state.endgameCompletion !== 'finished'
    || levelId === null
    || !LEVEL_IDS.has(levelId)
    || snapshotIdentityMismatch
    || (expectedLevelId !== undefined && levelId !== expectedLevelId)
    || !isBestPieceCount(state.pieceCount)
  ) return progress;

  const existingBest = bestPieceCounts[levelId];
  if (completedIds.includes(levelId) && existingBest !== undefined && state.pieceCount >= existingBest) return progress;

  return {
    version: PROGRESS_VERSION,
    campaignRevision: ENDGAME_CAMPAIGN_REVISION,
    completedLevelIds: orderedUnique([...completedIds, levelId]),
    bestPieceCounts: {
      ...bestPieceCounts,
      [levelId]: existingBest === undefined ? state.pieceCount : Math.min(existingBest, state.pieceCount),
    },
  };
}
