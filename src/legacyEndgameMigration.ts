import type { BrowserPlatform, PlatformStorageRead } from './platform/browserPlatform';

const CANONICAL_PROGRESS_KEY = 'tetramorph:endgame-completion:v6';
const CANONICAL_INTROS_KEY = 'tetramorph:mode-rule-intros:v2';

const PROGRESS_SOURCE_KEYS = Object.freeze([
  CANONICAL_PROGRESS_KEY,
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

const NATURAL_NEUTRAL_IDS = [
  't3r-shaft-01', 't3r-shaft-02', 't3r-shaft-03', 't3r-shaft-04',
  't3r-cascade-05', 't3r-cascade-06', 't5r-delta-07', 't5r-drift-08',
  't5r-lattice-09', 't5r-rift-10', 't5r-prism-11', 't5r-current-12',
  't5r-arc-13', 't5r-pulse-14', 't5r-horizon-15', 't6r-veil-16',
  't6r-cairn-17', 't6r-terrace-18', 't6r-bastion-19', 't6r-keystone-20',
] as const;

type GenericEndgameOrdinal =
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40
  | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50;

export type EndgameId = (typeof NATURAL_NEUTRAL_IDS)[number] | `tm-endgame-${GenericEndgameOrdinal}`;

const CANONICAL_LEVEL_IDS: readonly EndgameId[] = Object.freeze([
  ...NATURAL_NEUTRAL_IDS,
  ...Array.from({ length: 30 }, (_, index) => `tm-endgame-${index + 21}` as EndgameId),
]);
const CANONICAL_LEVEL_ID_SET = new Set(CANONICAL_LEVEL_IDS);
const NEUTRAL_LEVEL_ID_SET: ReadonlySet<string> = new Set(NATURAL_NEUTRAL_IDS);
const REVISION_2_CHANGED_ID_SET = new Set([
  ...NATURAL_NEUTRAL_IDS.slice(0, 10),
  ...NATURAL_NEUTRAL_IDS.slice(11, 14),
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
  readonly completedLevelIds: readonly EndgameId[];
  readonly bestPieceCounts: Readonly<Partial<Record<EndgameId, number>>>;
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

function canonicalId(value: unknown, source: 'canonical' | 'legacy'): EndgameId | null {
  if (typeof value !== 'string') return null;
  if (NEUTRAL_LEVEL_ID_SET.has(value)) return value as EndgameId;
  if (source === 'legacy') {
    const match = /^tm-puzzle-(\d+)$/.exec(value);
    if (match) {
      const ordinal = Number(match[1]);
      return ordinal >= 21 && ordinal <= 50 ? `tm-endgame-${ordinal}` as EndgameId : null;
    }
    return null;
  }
  return CANONICAL_LEVEL_ID_SET.has(value as EndgameId) ? value as EndgameId : null;
}

function orderedIds(values: readonly unknown[], source: 'canonical' | 'legacy'): EndgameId[] | null {
  const mapped: EndgameId[] = [];
  for (const value of values) {
    const id = canonicalId(value, source);
    if (id === null) return null;
    mapped.push(id);
  }
  const present = new Set(mapped);
  return CANONICAL_LEVEL_IDS.filter((id) => present.has(id));
}

function bestCounts(
  value: unknown,
  completed: readonly EndgameId[],
  source: 'canonical' | 'legacy',
): Partial<Record<EndgameId, number>> | null {
  if (!isRecord(value)) return null;
  const completedSet = new Set(completed);
  const mapped = new Map<EndgameId, number>();
  for (const [rawId, count] of Object.entries(value)) {
    const id = canonicalId(rawId, source);
    if (id === null || !completedSet.has(id) || !Number.isSafeInteger(count) || (count as number) <= 0 || mapped.has(id)) {
      return null;
    }
    mapped.set(id, count as number);
  }
  return Object.fromEntries(
    CANONICAL_LEVEL_IDS.flatMap((id) => mapped.has(id) ? [[id, mapped.get(id)!]] : []),
  ) as Partial<Record<EndgameId, number>>;
}

function progress(
  completedLevelIds: readonly EndgameId[],
  bestPieceCounts: Partial<Record<EndgameId, number>>,
): EndgameProgressV6 {
  return { version: 6, campaignRevision: 2, completedLevelIds, bestPieceCounts };
}

function parseProgress(raw: string, sourceRank: number): EndgameProgressV6 | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value)) return null;

  if (sourceRank === 0) {
    if (!hasExactKeys(value, ['version', 'campaignRevision', 'completedLevelIds', 'bestPieceCounts'])
      || value.version !== 6 || value.campaignRevision !== 2 || !Array.isArray(value.completedLevelIds)) return null;
    const completed = orderedIds(value.completedLevelIds, 'canonical');
    const best = completed === null ? null : bestCounts(value.bestPieceCounts, completed, 'canonical');
    if (completed === null || best === null || !semanticJsonEqual(value.completedLevelIds, completed)) return null;
    return progress(completed, best);
  }

  const expectedVersion = sourceRank <= 2 ? 5 : sourceRank === 3 ? 4 : sourceRank === 4 ? 3 : sourceRank === 5 ? 2 : 1;
  if (value.version !== expectedVersion) return null;
  if (expectedVersion === 1) {
    if (!hasExactKeys(value, ['version', 'nextUnlockedLevelId'])) return null;
    const nextId = canonicalId(value.nextUnlockedLevelId, 'legacy');
    if (nextId === null || !NEUTRAL_LEVEL_ID_SET.has(value.nextUnlockedLevelId as string)) return null;
    const frontier = NATURAL_NEUTRAL_IDS.indexOf(value.nextUnlockedLevelId as (typeof NATURAL_NEUTRAL_IDS)[number]);
    const completed = (orderedIds(NATURAL_NEUTRAL_IDS.slice(0, frontier), 'legacy') ?? [])
      .filter((id) => !REVISION_2_CHANGED_ID_SET.has(id));
    return progress(completed, {});
  }

  const keys = expectedVersion >= 4
    ? (expectedVersion === 5 ? ['version', 'campaignRevision', 'completedLevelIds', 'bestPieceCounts'] : ['version', 'completedLevelIds', 'bestPieceCounts'])
    : ['version', 'completedLevelIds'];
  if (!hasExactKeys(value, keys) || !Array.isArray(value.completedLevelIds)) return null;
  if (expectedVersion === 5 && value.campaignRevision !== 1 && value.campaignRevision !== 2) return null;
  if (expectedVersion <= 4 && !value.completedLevelIds.every(
    (id) => typeof id === 'string' && NEUTRAL_LEVEL_ID_SET.has(id),
  )) {
    return null;
  }
  const priorCompleted = orderedIds(value.completedLevelIds, 'legacy');
  if (priorCompleted === null) return null;
  const validatedBest: Partial<Record<EndgameId, number>> | null = expectedVersion >= 4
    ? bestCounts(value.bestPieceCounts, priorCompleted, 'legacy')
    : {};
  if (validatedBest === null) return null;
  const completed = expectedVersion === 5 && value.campaignRevision === 2
    ? priorCompleted
    : priorCompleted.filter((id) => !REVISION_2_CHANGED_ID_SET.has(id));
  if (expectedVersion === 4) return progress(completed, {});
  const best = Object.fromEntries(
    Object.entries(validatedBest).filter(([id]) => completed.includes(id as EndgameId)),
  ) as Partial<Record<EndgameId, number>>;
  return progress(completed, best);
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

function cleanupSources(platform: StoragePort, keys: readonly string[]): StorageMigrationCleanup {
  const removedSourceRanks: number[] = [];
  const retainedSourceRanks: number[] = [];
  for (let sourceRank = 1; sourceRank < keys.length; sourceRank += 1) {
    const source = platform.readStorageState(keys[sourceRank]!);
    if (source.status === 'missing') continue;
    if (source.status === 'failed' || !platform.removeStorage(keys[sourceRank]!)) retainedSourceRanks.push(sourceRank);
    else removedSourceRanks.push(sourceRank);
  }
  return { removedSourceRanks, retainedSourceRanks };
}

function migrateStorage<T>(
  platform: StoragePort,
  keys: readonly string[],
  parse: (raw: string, sourceRank: number) => T | null,
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
      cleanup: cleanupSources(platform, keys),
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
    cleanup: cleanupSources(platform, keys),
  };
}

export function migrateEndgameProgressStorage(platform: StoragePort): StorageMigrationResult<EndgameProgressV6> {
  return migrateStorage(platform, PROGRESS_SOURCE_KEYS, parseProgress);
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
  const id = canonicalId(navigation.selectedPuzzleId, 'legacy');
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

function normalized(navigation: EndgameNavigation, path: string, historyAccepted: boolean): EndgameRouteNormalization {
  return {
    status: 'normalized', navigation, path, needsReplace: true, historyAccepted,
    historyState: { tetramorphRoute: { version: 2, navigation } },
  };
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
    const selectedEndgameId = accepted ? history.selectedEndgameId : CANONICAL_LEVEL_IDS[0]!;
    const navigation: EndgameNavigation = { screen: 'endgame-library', mode: 'endgame', selectedEndgameId };
    return normalized(navigation, '/endgames', accepted);
  }
  if (path === '/endgames') {
    if (history?.screen !== 'endgame-library') return { status: 'unhandled', needsReplace: false };
    return normalized(history, path, true);
  }
  const canonicalPlayMatch = /^\/play\/endgame\/([^/]+)$/.exec(path);
  if (canonicalPlayMatch) {
    let id: EndgameId | null = null;
    try { id = canonicalId(decodeURIComponent(canonicalPlayMatch[1]!), 'canonical'); } catch { id = null; }
    if (id === null || history?.screen !== 'game' || history.mode !== 'endgame') {
      return { status: 'unhandled', needsReplace: false };
    }
    const navigation: EndgameNavigation = { screen: 'game', mode: 'endgame', selectedEndgameId: id };
    return normalized(navigation, `/play/endgame/${encodeURIComponent(id)}`, history.selectedEndgameId === id);
  }
  if (!path.startsWith('/play/puzzle/')) return { status: 'unhandled', needsReplace: false };
  const encodedId = path.slice('/play/puzzle/'.length);
  let id: EndgameId | null = null;
  try { id = canonicalId(decodeURIComponent(encodedId), 'legacy'); } catch { id = null; }
  if (id === null) {
    const navigation: EndgameNavigation = {
      screen: 'endgame-library', mode: 'endgame', selectedEndgameId: CANONICAL_LEVEL_IDS[0]!,
    };
    return normalized(navigation, '/endgames', false);
  }
  const navigation: EndgameNavigation = { screen: 'game', mode: 'endgame', selectedEndgameId: id };
  const historyAccepted = history?.screen === 'game' && history.selectedEndgameId === id;
  return normalized(navigation, `/play/endgame/${encodeURIComponent(id)}`, historyAccepted);
}
