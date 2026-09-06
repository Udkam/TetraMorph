import type { BrowserPlatform, PlatformStorageRead } from './platform/browserPlatform';
import {
  RETIRED_ENDGAME_IDS,
  type EndgameId,
  type RetiredEndgameId,
} from './game/core/types';
import { ENDGAME_PROGRESS_KEY, ENDGAME_PROGRESS_V6_KEY } from './endgameProgress';

const CANONICAL_INTROS_KEY = 'tetramorph:mode-rule-intros:v2';

const PROGRESS_SOURCE_KEYS = Object.freeze([
  ENDGAME_PROGRESS_KEY,
  ENDGAME_PROGRESS_V6_KEY,
  'tetramorph:puzzle-completion:v5',
  'qingliu:puzzle-completion:v5',
  'qingliu:puzzle-completion:v4',
  'qingliu:puzzle-completion:v3',
  'qingliu:puzzle-completion:v2',
  'tetris:puzzle-progress:v1',
]);

const INTRO_SOURCE_KEYS = Object.freeze([
  CANONICAL_INTROS_KEY,
  'tetramorph:mode-rule-intros:v1',
  'tetris:mode-rule-intros:v1',
]);

/** The pre-F5 order is retained solely to validate revision-2 persistence. */
const NATURAL_V6_IDS = [
  't3r-shaft-01', 't3r-shaft-02', 't3r-shaft-03', 't3r-shaft-04',
  't3r-cascade-05', 't3r-cascade-06', 't5r-delta-07', 't5r-drift-08',
  't5r-lattice-09', 't5r-rift-10', 't5r-prism-11', 't5r-current-12',
  't5r-arc-13', 't5r-pulse-14', 't5r-horizon-15', 't6r-veil-16',
  't6r-cairn-17', 't6r-terrace-18', 't6r-bastion-19', 't6r-keystone-20',
] as const satisfies readonly EndgameId[];

type V6StoredEndgameId = EndgameId | RetiredEndgameId;

const V6_LEVEL_IDS: readonly V6StoredEndgameId[] = Object.freeze([
  ...NATURAL_V6_IDS,
  ...Array.from({ length: 30 }, (_, index) => `tm-endgame-${index + 21}` as V6StoredEndgameId),
]);

/** The sole active revision-3 course order. */
const V7_LEVEL_IDS: readonly EndgameId[] = Object.freeze([
  't3r-shaft-01', 't3r-shaft-02', 't3r-shaft-03', 't3r-cascade-06', 't3r-shaft-04',
  't3r-cascade-05', 't5r-delta-07', 't5r-lattice-09', 't5r-rift-10', 't5r-drift-08',
  't5r-pulse-14', 't5r-arc-13', 't5r-current-12', 't5r-prism-11', 't5r-horizon-15',
  't6r-cairn-17', 't6r-terrace-18', 't6r-keystone-20', 't6r-bastion-19', 't6r-veil-16',
  ...Array.from({ length: 13 }, (_, index) => `tm-endgame-${index + 21}` as EndgameId),
  'tm-endgame-35', 'tm-endgame-36', 'tm-endgame-37', 'tm-endgame-38', 'tm-endgame-39',
  'tm-endgame-41', 'tm-endgame-44', 'tm-endgame-45', 'tm-endgame-46', 'tm-endgame-47',
  'tm-endgame-48', 'tm-endgame-49', 'tm-endgame-50',
]);

const V6_ID_SET = new Set<V6StoredEndgameId>(V6_LEVEL_IDS);
const V7_ID_SET = new Set<EndgameId>(V7_LEVEL_IDS);
const NATURAL_V6_ID_SET: ReadonlySet<string> = new Set(NATURAL_V6_IDS);
const RETIRED_ENDGAME_ID_SET = new Set<RetiredEndgameId>(RETIRED_ENDGAME_IDS);

/** Five rebuilt Intro boards plus three rebuilt Hard boards transfer no v6 completion. */
export const ENDGAME_V7_REBUILT_IDS: readonly EndgameId[] = Object.freeze([
  't3r-shaft-01',
  't3r-shaft-02',
  't3r-shaft-03',
  't3r-cascade-06',
  't3r-shaft-04',
  'tm-endgame-32',
  'tm-endgame-39',
  'tm-endgame-46',
]);

const V7_REBUILT_ID_SET = new Set<EndgameId>(ENDGAME_V7_REBUILT_IDS);
export const ENDGAME_V7_BEHAVIOR_STABLE_IDS: readonly EndgameId[] = Object.freeze(
  V7_LEVEL_IDS.filter((id) => !V7_REBUILT_ID_SET.has(id)),
);
const V7_BEHAVIOR_STABLE_ID_SET = new Set<EndgameId>(ENDGAME_V7_BEHAVIOR_STABLE_IDS);

/** Revision-2 invalidations remain relevant only while decoding the older legacy formats. */
const REVISION_2_CHANGED_ID_SET = new Set<V6StoredEndgameId>([
  ...NATURAL_V6_IDS.slice(0, 10),
  ...NATURAL_V6_IDS.slice(11, 14),
  'tm-endgame-36',
  'tm-endgame-38',
  'tm-endgame-46',
  'tm-endgame-47',
  'tm-endgame-48',
  'tm-endgame-49',
  'tm-endgame-50',
]);

const CANONICAL_MODES = Object.freeze(['marathon', 'race', 'sprint', 'endgame'] as const);
const CANONICAL_MODE_SET = new Set<string>(CANONICAL_MODES);

export type CanonicalGameMode = (typeof CANONICAL_MODES)[number];

export interface EndgameProgressV6 {
  readonly version: 6;
  readonly campaignRevision: 2;
  readonly completedLevelIds: readonly V6StoredEndgameId[];
  readonly bestPieceCounts: Readonly<Partial<Record<V6StoredEndgameId, number>>>;
}

export interface EndgameProgressV7 {
  readonly version: 7;
  readonly campaignRevision: 3;
  readonly completedLevelIds: readonly EndgameId[];
  readonly bestLockedPieceCounts: Readonly<Partial<Record<EndgameId, number>>>;
}

export interface EndgameNavigation {
  readonly screen: 'home' | 'endgame-library' | 'game';
  readonly mode: CanonicalGameMode;
  readonly selectedEndgameId: EndgameId;
}

export interface EndgameRouteHistoryV2 {
  readonly tetramorphRoute: Readonly<{
    readonly version: 2;
    readonly navigation: EndgameNavigation;
  }>;
}

export interface StorageMigrationCleanup {
  readonly removedSourceRanks: readonly number[];
  readonly retainedSourceRanks: readonly number[];
}

export type StorageMigrationResult<T> =
  | { readonly status: 'missing' }
  | { readonly status: 'blocked'; readonly reason: 'read-failed' | 'invalid'; readonly sourceRank: number }
  | {
      readonly status: 'available';
      readonly data: T;
      readonly persistence: 'verified' | 'write-failed' | 'readback-missing' | 'readback-failed' | 'readback-invalid' | 'readback-mismatch';
      readonly sourceRank: number;
      readonly cleanup: StorageMigrationCleanup;
    };

export type EndgameRouteNormalization =
  | { readonly status: 'unhandled'; readonly needsReplace: false }
  | {
      readonly status: 'normalized';
      readonly navigation: EndgameNavigation;
      readonly path: string;
      readonly historyState: EndgameRouteHistoryV2;
      readonly needsReplace: true;
      readonly historyAccepted: boolean;
      readonly archivedEndgameId: RetiredEndgameId | null;
    };

type StoragePort = Pick<BrowserPlatform, 'readStorageState' | 'writeStorage' | 'removeStorage'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function storedV6Id(value: unknown, source: 'canonical' | 'legacy'): V6StoredEndgameId | null {
  if (typeof value !== 'string') return null;
  if (NATURAL_V6_ID_SET.has(value)) return value as EndgameId;
  const direct = source === 'canonical' ? /^tm-endgame-(\d+)$/.exec(value) : /^tm-puzzle-(\d+)$/.exec(value);
  if (!direct) return null;
  const ordinal = Number(direct[1]);
  if (ordinal < 21 || ordinal > 50) return null;
  const id = `tm-endgame-${ordinal}` as V6StoredEndgameId;
  return V6_ID_SET.has(id) ? id : null;
}

function activeV7Id(value: unknown): EndgameId | null {
  return typeof value === 'string' && V7_ID_SET.has(value as EndgameId) ? value as EndgameId : null;
}

function retiredId(value: V6StoredEndgameId | null): RetiredEndgameId | null {
  return value !== null && RETIRED_ENDGAME_ID_SET.has(value as RetiredEndgameId)
    ? value as RetiredEndgameId
    : null;
}

function orderedIds<T extends string>(
  values: readonly unknown[],
  source: 'canonical' | 'legacy',
  orderedIdsForSource: readonly T[],
): T[] | null {
  const mapped: T[] = [];
  const allowed = new Set<T>(orderedIdsForSource);
  for (const value of values) {
    const id = source === 'canonical' ? storedV6Id(value, 'canonical') : storedV6Id(value, 'legacy');
    if (id === null || !allowed.has(id as T)) return null;
    mapped.push(id as T);
  }
  const present = new Set(mapped);
  return orderedIdsForSource.filter((id) => present.has(id));
}

function orderedV6Ids(values: readonly unknown[], source: 'canonical' | 'legacy'): V6StoredEndgameId[] | null {
  return orderedIds(values, source, V6_LEVEL_IDS);
}

function orderedV7Ids(values: readonly unknown[]): EndgameId[] | null {
  if (!values.every((value) => activeV7Id(value) !== null)) return null;
  const present = new Set(values as EndgameId[]);
  return V7_LEVEL_IDS.filter((id) => present.has(id));
}

function isBestCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function orderedV6BestCounts(
  value: unknown,
  completed: readonly V6StoredEndgameId[],
  source: 'canonical' | 'legacy',
): Partial<Record<V6StoredEndgameId, number>> | null {
  if (!isRecord(value)) return null;
  const completedSet = new Set(completed);
  const mapped = new Map<V6StoredEndgameId, number>();
  for (const [rawId, count] of Object.entries(value)) {
    const id = storedV6Id(rawId, source);
    if (id === null || !completedSet.has(id) || !isBestCount(count) || mapped.has(id)) return null;
    mapped.set(id, count);
  }
  return Object.fromEntries(
    V6_LEVEL_IDS.flatMap((id) => mapped.has(id) ? [[id, mapped.get(id)!]] : []),
  ) as Partial<Record<V6StoredEndgameId, number>>;
}

function orderedV7BestCounts(
  value: unknown,
  completed: readonly EndgameId[],
): Partial<Record<EndgameId, number>> | null {
  if (!isRecord(value)) return null;
  const completedSet = new Set(completed);
  const mapped = new Map<EndgameId, number>();
  for (const [rawId, count] of Object.entries(value)) {
    const id = activeV7Id(rawId);
    if (id === null || !completedSet.has(id) || !isBestCount(count) || mapped.has(id)) return null;
    mapped.set(id, count);
  }
  return Object.fromEntries(
    V7_LEVEL_IDS.flatMap((id) => mapped.has(id) ? [[id, mapped.get(id)!]] : []),
  ) as Partial<Record<EndgameId, number>>;
}

function v6Progress(
  completedLevelIds: readonly V6StoredEndgameId[],
  bestPieceCounts: Partial<Record<V6StoredEndgameId, number>>,
): EndgameProgressV6 {
  return { version: 6, campaignRevision: 2, completedLevelIds, bestPieceCounts };
}

function v7Progress(
  completedLevelIds: readonly EndgameId[],
  bestLockedPieceCounts: Partial<Record<EndgameId, number>>,
): EndgameProgressV7 {
  return { version: 7, campaignRevision: 3, completedLevelIds, bestLockedPieceCounts };
}

function parseV7Progress(raw: string): EndgameProgressV7 | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value)
    || !hasExactKeys(value, ['version', 'campaignRevision', 'completedLevelIds', 'bestLockedPieceCounts'])
    || value.version !== 7
    || value.campaignRevision !== 3
    || !Array.isArray(value.completedLevelIds)) return null;
  const completed = orderedV7Ids(value.completedLevelIds);
  const best = completed === null ? null : orderedV7BestCounts(value.bestLockedPieceCounts, completed);
  if (completed === null || best === null || !semanticJsonEqual(value.completedLevelIds, completed)) return null;
  return v7Progress(completed, best);
}

function parseV6Progress(raw: string): EndgameProgressV6 | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value)
    || !hasExactKeys(value, ['version', 'campaignRevision', 'completedLevelIds', 'bestPieceCounts'])
    || value.version !== 6
    || value.campaignRevision !== 2
    || !Array.isArray(value.completedLevelIds)) return null;
  const completed = orderedV6Ids(value.completedLevelIds, 'canonical');
  const best = completed === null ? null : orderedV6BestCounts(value.bestPieceCounts, completed, 'canonical');
  if (completed === null || best === null || !semanticJsonEqual(value.completedLevelIds, completed)) return null;
  return v6Progress(completed, best);
}

function projectV6ToV7(source: EndgameProgressV6): EndgameProgressV7 {
  const completed = new Set(source.completedLevelIds);
  const completedLevelIds = V7_LEVEL_IDS.filter((id) => (
    V7_BEHAVIOR_STABLE_ID_SET.has(id) && completed.has(id)
  ));
  const bestLockedPieceCounts: Partial<Record<EndgameId, number>> = {};
  for (const id of completedLevelIds) {
    const count = source.bestPieceCounts[id];
    if (count !== undefined) bestLockedPieceCounts[id] = count;
  }
  return v7Progress(completedLevelIds, bestLockedPieceCounts);
}

function parseLegacyProgress(raw: string, legacySourceRank: number): EndgameProgressV6 | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value)) return null;

  const expectedVersion = legacySourceRank <= 2 ? 5 : legacySourceRank === 3 ? 4 : legacySourceRank === 4 ? 3 : legacySourceRank === 5 ? 2 : 1;
  if (value.version !== expectedVersion) return null;
  if (expectedVersion === 1) {
    if (!hasExactKeys(value, ['version', 'nextUnlockedLevelId'])) return null;
    const nextId = storedV6Id(value.nextUnlockedLevelId, 'legacy');
    if (nextId === null || !NATURAL_V6_ID_SET.has(value.nextUnlockedLevelId as string)) return null;
    const frontier = NATURAL_V6_IDS.indexOf(value.nextUnlockedLevelId as (typeof NATURAL_V6_IDS)[number]);
    const completed = (orderedV6Ids(NATURAL_V6_IDS.slice(0, frontier), 'legacy') ?? [])
      .filter((id) => !REVISION_2_CHANGED_ID_SET.has(id));
    return v6Progress(completed, {});
  }

  const keys = expectedVersion >= 4
    ? (expectedVersion === 5 ? ['version', 'campaignRevision', 'completedLevelIds', 'bestPieceCounts'] : ['version', 'completedLevelIds', 'bestPieceCounts'])
    : ['version', 'completedLevelIds'];
  if (!hasExactKeys(value, keys) || !Array.isArray(value.completedLevelIds)) return null;
  if (expectedVersion === 5 && value.campaignRevision !== 1 && value.campaignRevision !== 2) return null;
  if (expectedVersion <= 4 && !value.completedLevelIds.every(
    (id) => typeof id === 'string' && NATURAL_V6_ID_SET.has(id),
  )) return null;

  const priorCompleted = orderedV6Ids(value.completedLevelIds, 'legacy');
  if (priorCompleted === null) return null;
  const validatedBest = expectedVersion >= 4
    ? orderedV6BestCounts(value.bestPieceCounts, priorCompleted, 'legacy')
    : {};
  if (validatedBest === null) return null;
  const completed = expectedVersion === 5 && value.campaignRevision === 2
    ? priorCompleted
    : priorCompleted.filter((id) => !REVISION_2_CHANGED_ID_SET.has(id));
  if (expectedVersion === 4) return v6Progress(completed, {});
  const best = Object.fromEntries(
    Object.entries(validatedBest).filter(([id]) => completed.includes(id as V6StoredEndgameId)),
  ) as Partial<Record<V6StoredEndgameId, number>>;
  return v6Progress(completed, best);
}

function parseProgress(raw: string, sourceRank: number): EndgameProgressV7 | null {
  if (sourceRank === 0) return parseV7Progress(raw);
  if (sourceRank === 1) {
    const v6 = parseV6Progress(raw);
    return v6 === null ? null : projectV6ToV7(v6);
  }
  const legacy = parseLegacyProgress(raw, sourceRank - 1);
  return legacy === null ? null : projectV6ToV7(legacy);
}

function canonicalIntros(raw: string, sourceRank: number): readonly CanonicalGameMode[] | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(value)) return null;
  if (sourceRank === 0) {
    if (!value.every((item) => typeof item === 'string' && CANONICAL_MODE_SET.has(item))) return null;
    const ordered = CANONICAL_MODES.filter((mode) => value.includes(mode));
    return semanticJsonEqual(value, ordered) ? ordered : null;
  }
  const modes = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    if (sourceRank > 0 && item === 'puzzle') modes.add('endgame');
    else if (CANONICAL_MODE_SET.has(item)) modes.add(item);
  }
  return CANONICAL_MODES.filter((mode) => modes.has(mode));
}

function emptyCleanup(): StorageMigrationCleanup {
  return { removedSourceRanks: [], retainedSourceRanks: [] };
}

function semanticJsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cleanupSources(
  platform: StoragePort,
  keys: readonly string[],
  preservedSourceRanks: ReadonlySet<number>,
): StorageMigrationCleanup {
  const removedSourceRanks: number[] = [];
  const retainedSourceRanks: number[] = [];
  for (let sourceRank = 1; sourceRank < keys.length; sourceRank += 1) {
    const source = platform.readStorageState(keys[sourceRank]!);
    if (source.status === 'missing') continue;
    if (preservedSourceRanks.has(sourceRank) || source.status === 'failed' || !platform.removeStorage(keys[sourceRank]!)) {
      retainedSourceRanks.push(sourceRank);
    } else {
      removedSourceRanks.push(sourceRank);
    }
  }
  return { removedSourceRanks, retainedSourceRanks };
}

function migrateStorage<T>(
  platform: StoragePort,
  keys: readonly string[],
  parse: (raw: string, sourceRank: number) => T | null,
  preservedSourceRanks: ReadonlySet<number> = new Set(),
): StorageMigrationResult<T> {
  let selected: { data: T; sourceRank: number } | null = null;
  for (let sourceRank = 0; sourceRank < keys.length; sourceRank += 1) {
    const read: PlatformStorageRead = platform.readStorageState(keys[sourceRank]!);
    if (read.status === 'missing') continue;
    if (read.status === 'failed') return { status: 'blocked', reason: 'read-failed', sourceRank };
    const data = parse(read.value, sourceRank);
    if (data === null) return { status: 'blocked', reason: 'invalid', sourceRank };
    selected = { data, sourceRank };
    break;
  }
  if (selected === null) return { status: 'missing' };

  if (selected.sourceRank === 0) {
    return {
      status: 'available', data: selected.data, persistence: 'verified', sourceRank: 0,
      cleanup: cleanupSources(platform, keys, preservedSourceRanks),
    };
  }

  const serialized = JSON.stringify(selected.data);
  if (!platform.writeStorage(keys[0]!, serialized)) {
    return { status: 'available', data: selected.data, persistence: 'write-failed', sourceRank: selected.sourceRank, cleanup: emptyCleanup() };
  }
  const readback = platform.readStorageState(keys[0]!);
  if (readback.status === 'missing') {
    return { status: 'available', data: selected.data, persistence: 'readback-missing', sourceRank: selected.sourceRank, cleanup: emptyCleanup() };
  }
  if (readback.status === 'failed') {
    return { status: 'available', data: selected.data, persistence: 'readback-failed', sourceRank: selected.sourceRank, cleanup: emptyCleanup() };
  }
  const parsedReadback = parse(readback.value, 0);
  if (parsedReadback === null) {
    return { status: 'available', data: selected.data, persistence: 'readback-invalid', sourceRank: selected.sourceRank, cleanup: emptyCleanup() };
  }
  if (!semanticJsonEqual(parsedReadback, selected.data)) {
    return { status: 'available', data: selected.data, persistence: 'readback-mismatch', sourceRank: selected.sourceRank, cleanup: emptyCleanup() };
  }

  return {
    status: 'available', data: parsedReadback, persistence: 'verified', sourceRank: selected.sourceRank,
    cleanup: cleanupSources(platform, keys, preservedSourceRanks),
  };
}

/** V7 always retains v6 locally as its explicit rollback source. */
export function migrateEndgameProgressStorage(platform: StoragePort): StorageMigrationResult<EndgameProgressV7> {
  return migrateStorage(platform, PROGRESS_SOURCE_KEYS, parseProgress, new Set([1]));
}

export function migrateEndgameRuleIntrosStorage(platform: StoragePort): StorageMigrationResult<readonly CanonicalGameMode[]> {
  return migrateStorage(platform, INTRO_SOURCE_KEYS, canonicalIntros);
}

function cleanPath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function historyNavigation(value: unknown): EndgameNavigation | null {
  if (!isRecord(value) || !hasExactKeys(value, ['tetramorphRoute'])) return null;
  const payload = value.tetramorphRoute;
  if (!isRecord(payload) || !hasExactKeys(payload, ['version', 'navigation']) || payload.version !== 1) return null;
  const navigation = payload.navigation;
  if (!isRecord(navigation)
    || !hasExactKeys(navigation, ['screen', 'mode', 'selectedPuzzleId'])) return null;
  const storedId = storedV6Id(navigation.selectedPuzzleId, 'legacy');
  const id = activeV7Id(storedId);
  if (id === null) return null;
  if (navigation.screen === 'home' && navigation.mode === 'marathon') {
    return { screen: 'home', mode: 'marathon', selectedEndgameId: id };
  }
  if (navigation.screen === 'puzzle-library' && navigation.mode === 'puzzle') {
    return { screen: 'endgame-library', mode: 'endgame', selectedEndgameId: id };
  }
  if (navigation.screen === 'game' && navigation.mode === 'puzzle') {
    return { screen: 'game', mode: 'endgame', selectedEndgameId: id };
  }
  if (navigation.screen === 'game'
    && (navigation.mode === 'marathon' || navigation.mode === 'race' || navigation.mode === 'sprint')) {
    return { screen: 'game', mode: navigation.mode, selectedEndgameId: id };
  }
  return null;
}

function normalized(
  navigation: EndgameNavigation,
  path: string,
  historyAccepted: boolean,
  archivedEndgameId: RetiredEndgameId | null = null,
): EndgameRouteNormalization {
  return {
    status: 'normalized', navigation, path, needsReplace: true, historyAccepted, archivedEndgameId,
    historyState: { tetramorphRoute: { version: 2, navigation } },
  };
}

function archivedLibraryRoute(id: RetiredEndgameId): EndgameRouteNormalization {
  const navigation: EndgameNavigation = {
    screen: 'endgame-library', mode: 'endgame', selectedEndgameId: V7_LEVEL_IDS[0]!,
  };
  return normalized(navigation, '/endgames', false, id);
}

export function normalizeEndgameRoute(pathname: string, historyState: unknown): EndgameRouteNormalization {
  const path = cleanPath(pathname || '/');
  const history = historyNavigation(historyState);
  const unchangedRoute = path === '/'
    ? { screen: 'home', mode: 'marathon' } as const
    : path === '/play/classic'
      ? { screen: 'game', mode: 'marathon' } as const
      : path === '/play/survival'
        ? { screen: 'game', mode: 'race' } as const
        : path === '/play/mutation'
          ? { screen: 'game', mode: 'sprint' } as const
          : null;
  if (unchangedRoute) {
    if (!history || history.screen !== unchangedRoute.screen || history.mode !== unchangedRoute.mode) {
      return { status: 'unhandled', needsReplace: false };
    }
    return normalized({ ...unchangedRoute, selectedEndgameId: history.selectedEndgameId }, path, true);
  }
  if (path === '/puzzles') {
    const accepted = history?.screen === 'endgame-library';
    const selectedEndgameId = accepted ? history.selectedEndgameId : V7_LEVEL_IDS[0]!;
    return normalized({ screen: 'endgame-library', mode: 'endgame', selectedEndgameId }, '/endgames', accepted);
  }
  if (path === '/endgames') {
    if (history?.screen !== 'endgame-library') return { status: 'unhandled', needsReplace: false };
    return normalized(history, path, true);
  }
  const canonicalPlayMatch = /^\/play\/endgame\/([^/]+)$/.exec(path);
  if (canonicalPlayMatch) {
    let stored: V6StoredEndgameId | null = null;
    try { stored = storedV6Id(decodeURIComponent(canonicalPlayMatch[1]!), 'canonical'); } catch { stored = null; }
    const archived = retiredId(stored);
    if (archived) return archivedLibraryRoute(archived);
    const id = activeV7Id(stored);
    if (id === null || history?.screen !== 'game' || history.mode !== 'endgame') {
      return { status: 'unhandled', needsReplace: false };
    }
    return normalized(
      { screen: 'game', mode: 'endgame', selectedEndgameId: id },
      `/play/endgame/${encodeURIComponent(id)}`,
      history.selectedEndgameId === id,
    );
  }
  if (!path.startsWith('/play/puzzle/')) return { status: 'unhandled', needsReplace: false };
  const encodedId = path.slice('/play/puzzle/'.length);
  let stored: V6StoredEndgameId | null = null;
  try { stored = storedV6Id(decodeURIComponent(encodedId), 'legacy'); } catch { stored = null; }
  const archived = retiredId(stored);
  if (archived) return archivedLibraryRoute(archived);
  const id = activeV7Id(stored);
  if (id === null) {
    return normalized({ screen: 'endgame-library', mode: 'endgame', selectedEndgameId: V7_LEVEL_IDS[0]! }, '/endgames', false);
  }
  const navigation: EndgameNavigation = { screen: 'game', mode: 'endgame', selectedEndgameId: id };
  const historyAccepted = history?.screen === 'game' && history.selectedEndgameId === id;
  return normalized(navigation, `/play/endgame/${encodeURIComponent(id)}`, historyAccepted);
}
