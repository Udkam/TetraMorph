import {
  TICKS_PER_SECOND,
  isClassicGravityChoiceTicks,
  normalizeClassicGravityFloorTicks,
  normalizeClassicStartingGravityTicks,
} from './game/core/constants';

const LEGACY_CLASSIC_STARTING_GRAVITY_TICKS = 48;
const LEGACY_CLASSIC_GRAVITY_FLOOR_TICKS = 6;

export type RunMode = 'marathon' | 'race' | 'sprint';
export type RunOutcome = 'top-out';
export type ClassicDifficultyGrade = 'relaxed' | 'standard' | 'challenge';

export const CLASSIC_DIFFICULTY_GRADES = ['relaxed', 'standard', 'challenge'] as const;

interface ScoreRecordBase {
  version: 9;
  lines: number;
  elapsedTicks: number;
  outcome: RunOutcome;
  completedAt: string;
}

interface ScoredRunRecord extends ScoreRecordBase {
  score: number;
  pieces: number;
  /** Reserved compatibility field; 异变 and Classic currently store zero. */
  chain: number;
}

export interface ClassicScoreRecord extends ScoredRunRecord {
  mode: 'marathon';
  classicStartingGravityTicks: number;
  classicGravityFloorTicks: number;
  classicGrade: ClassicDifficultyGrade;
}

export interface MutationScoreRecord extends ScoredRunRecord {
  mode: 'sprint';
}

export type StandardScoreRecord = ClassicScoreRecord | MutationScoreRecord;

export interface SurvivalScoreRecord extends ScoreRecordBase {
  mode: 'race';
}

export type ScoreRecord = StandardScoreRecord | SurvivalScoreRecord;

export interface Leaderboard {
  version: 9;
  marathon: ClassicScoreRecord[];
  race: SurvivalScoreRecord[];
  sprint: MutationScoreRecord[];
}

export const LEADERBOARD_KEY = 'tetramorph:leaderboard:v9';
export const LEGACY_LEADERBOARD_KEYS = ['tetramorph:leaderboard:v8', 'tetris:leaderboard:v8', 'tetris:leaderboard:v7', 'tetris:leaderboard:v6', 'tetris:leaderboard:v5', 'tetris:leaderboard:v4', 'tetris:leaderboard:v3', 'stack-order:leaderboard:v2', 'stack-order:leaderboard:v1'] as const;
export const LEADERBOARD_LIMIT = 5;
export const MUTATION_LEADERBOARD_LIMIT = LEADERBOARD_LIMIT;

export function leaderboardLimit(mode: RunMode): number {
  return mode === 'sprint' ? MUTATION_LEADERBOARD_LIMIT : LEADERBOARD_LIMIT;
}

export function emptyLeaderboard(): Leaderboard {
  return { version: 9, marathon: [], race: [], sprint: [] };
}

export function classicDifficultyGrade(
  startingTicks: number,
  floorTicks: number,
): ClassicDifficultyGrade {
  const normalizedStartingTicks = normalizeClassicStartingGravityTicks(startingTicks);
  const normalizedFloorTicks = normalizeClassicGravityFloorTicks(floorTicks, normalizedStartingTicks);
  const midpointSeconds = (normalizedStartingTicks + normalizedFloorTicks) / (2 * TICKS_PER_SECOND);
  if (midpointSeconds >= 0.65) return 'relaxed';
  if (midpointSeconds >= 0.35) return 'standard';
  return 'challenge';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(record).every((key) => allowedKeys.has(key))
    && allowed.every((key) => key in record);
}

function isClassicGravityTicks(value: unknown): value is number {
  return typeof value === 'number' && isClassicGravityChoiceTicks(value);
}

function isClassicDifficultyGrade(value: unknown): value is ClassicDifficultyGrade {
  return CLASSIC_DIFFICULTY_GRADES.includes(value as ClassicDifficultyGrade);
}

export function isScoreRecord(value: unknown): value is ScoreRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 9
    || !isNonNegativeInteger(record.lines)
    || !isNonNegativeInteger(record.elapsedTicks)
    || (record.mode !== 'marathon' && record.mode !== 'race' && record.mode !== 'sprint')
    || record.outcome !== 'top-out'
    || !isIsoDate(record.completedAt)
  ) return false;
  if (record.mode === 'race') {
    return hasOnlyKeys(record, ['version', 'mode', 'outcome', 'lines', 'elapsedTicks', 'completedAt']);
  }
  const scoredRunIsValid = isNonNegativeInteger(record.score)
    && isNonNegativeInteger(record.pieces)
    && record.chain === 0;
  if (!scoredRunIsValid) return false;
  if (record.mode === 'marathon') {
    return isClassicGravityTicks(record.classicStartingGravityTicks)
      && isClassicGravityTicks(record.classicGravityFloorTicks)
      && record.classicGravityFloorTicks <= record.classicStartingGravityTicks
      && isClassicDifficultyGrade(record.classicGrade)
      && record.classicGrade === classicDifficultyGrade(
        record.classicStartingGravityTicks,
        record.classicGravityFloorTicks,
      )
      && hasOnlyKeys(record, [
        'version',
        'mode',
        'outcome',
        'score',
        'lines',
        'pieces',
        'elapsedTicks',
        'chain',
        'completedAt',
        'classicStartingGravityTicks',
        'classicGravityFloorTicks',
        'classicGrade',
      ]);
  }
  return hasOnlyKeys(record, [
      'version',
      'mode',
      'outcome',
      'score',
      'lines',
      'pieces',
      'elapsedTicks',
      'chain',
      'completedAt',
    ]);
}

/** Negative means left ranks above right without using the timestamp tiebreaker. */
function compareRecordRank(mode: RunMode, left: ScoreRecord, right: ScoreRecord): number {
  if (mode === 'race') {
    return right.elapsedTicks - left.elapsedTicks
      || right.lines - left.lines;
  }
  const standardLeft = left as StandardScoreRecord;
  const standardRight = right as StandardScoreRecord;
  return mode === 'marathon'
    ? right.lines - left.lines
      || standardRight.score - standardLeft.score
      || standardRight.pieces - standardLeft.pieces
      || left.elapsedTicks - right.elapsedTicks
    : standardRight.score - standardLeft.score
      || right.lines - left.lines
      || standardLeft.pieces - standardRight.pieces
      || left.elapsedTicks - right.elapsedTicks;
}

export function sortRecords(mode: RunMode, records: readonly ScoreRecord[]): ScoreRecord[] {
  return [...records].sort((left, right) => (
    compareRecordRank(mode, left, right) || compareText(left.completedAt, right.completedAt)
  ));
}

function recordsAreValid(mode: RunMode, records: unknown): boolean {
  return Array.isArray(records)
    && records.every((record) => isScoreRecord(record) && record.mode === mode);
}

function limitClassicRecords(records: readonly ClassicScoreRecord[]): ClassicScoreRecord[] {
  return CLASSIC_DIFFICULTY_GRADES.flatMap((grade) => (
    sortRecords('marathon', records.filter((record) => record.classicGrade === grade))
      .slice(0, LEADERBOARD_LIMIT) as ClassicScoreRecord[]
  ));
}

function isLeaderboard(value: unknown): value is Leaderboard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const board = value as Partial<Leaderboard>;
  return board.version === 9
    && recordsAreValid('marathon', board.marathon)
    && recordsAreValid('race', board.race)
    && recordsAreValid('sprint', board.sprint);
}

export function parseLeaderboard(raw: string | null): Leaderboard {
  if (raw === null) return emptyLeaderboard();
  try {
    const value: unknown = JSON.parse(raw);
    if (!isLeaderboard(value)) {
      return migrateLegacyLeaderboard(raw);
    }
    return {
      version: 9,
      marathon: limitClassicRecords(value.marathon),
      race: sortRecords('race', value.race).slice(0, leaderboardLimit('race')) as SurvivalScoreRecord[],
      sprint: sortRecords('sprint', value.sprint).slice(0, leaderboardLimit('sprint')) as MutationScoreRecord[],
    };
  } catch {
    return emptyLeaderboard();
  }
}

interface LegacyRecordFields {
  score: number;
  lines: number;
  pieces: number;
  elapsedTicks: number;
  completedAt: string;
}

interface LegacyV8StandardScoreRecord extends LegacyRecordFields {
  version: 8;
  chain: number;
  mode: 'marathon' | 'sprint';
  outcome: 'top-out';
}

interface LegacyV8SurvivalScoreRecord {
  version: 8;
  lines: number;
  elapsedTicks: number;
  mode: 'race';
  outcome: 'top-out';
  completedAt: string;
}

type LegacyV8ScoreRecord = LegacyV8StandardScoreRecord | LegacyV8SurvivalScoreRecord;

interface LegacyV8Leaderboard {
  version: 8;
  marathon: LegacyV8StandardScoreRecord[];
  race: LegacyV8SurvivalScoreRecord[];
  sprint: LegacyV8StandardScoreRecord[];
}

interface LegacyV7ScoreRecord extends LegacyRecordFields {
  version: 7;
  chain: number;
  mode: RunMode;
  outcome: 'top-out';
}

interface LegacyV7Leaderboard {
  version: 7;
  marathon: LegacyV7ScoreRecord[];
  race: LegacyV7ScoreRecord[];
  sprint: LegacyV7ScoreRecord[];
}

interface LegacyV5ScoreRecord extends LegacyRecordFields {
  version: 5;
  chain: number;
  mode: RunMode;
  outcome: 'top-out' | 'finished';
}

interface LegacyV6ScoreRecord extends LegacyRecordFields {
  version: 6;
  chain: number;
  mode: RunMode;
  outcome: 'top-out';
}

interface LegacyV6Leaderboard {
  version: 6;
  marathon: LegacyV6ScoreRecord[];
  race: LegacyV6ScoreRecord[];
  sprint: LegacyV6ScoreRecord[];
}

interface LegacyV5Leaderboard {
  version: 5;
  marathon: LegacyV5ScoreRecord[];
  race: LegacyV5ScoreRecord[];
  sprint: LegacyV5ScoreRecord[];
}

interface LegacyV4ScoreRecord extends LegacyRecordFields {
  version: 4;
  mode: RunMode;
  outcome: 'top-out' | 'finished';
}

interface LegacyV4Leaderboard {
  version: 4;
  marathon: LegacyV4ScoreRecord[];
  race: LegacyV4ScoreRecord[];
  sprint: LegacyV4ScoreRecord[];
}

interface LegacyV3ScoreRecord extends LegacyRecordFields {
  version: 3;
  mode: 'marathon' | 'race';
  outcome: 'top-out';
}

interface LegacyV3Leaderboard {
  version: 3;
  marathon: LegacyV3ScoreRecord[];
  race: LegacyV3ScoreRecord[];
}

function hasLegacyFields(record: Partial<LegacyRecordFields>): boolean {
  return isNonNegativeInteger(record.score)
    && isNonNegativeInteger(record.lines)
    && isNonNegativeInteger(record.pieces)
    && isNonNegativeInteger(record.elapsedTicks)
    && isIsoDate(record.completedAt);
}

function isLegacyV5Record(value: unknown): value is LegacyV5ScoreRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<LegacyV5ScoreRecord>;
  if (
    record.version !== 5
    || !hasLegacyFields(record)
    || !isNonNegativeInteger(record.chain)
    || (record.mode !== 'marathon' && record.mode !== 'race' && record.mode !== 'sprint')
  ) return false;
  return record.mode === 'sprint'
    ? record.outcome === 'finished'
    : record.outcome === 'top-out' && record.chain === 0;
}

function isLegacyV8Record(value: unknown): value is LegacyV8ScoreRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 8
    || (record.mode !== 'marathon' && record.mode !== 'race' && record.mode !== 'sprint')
    || record.outcome !== 'top-out'
    || !isNonNegativeInteger(record.lines)
    || !isNonNegativeInteger(record.elapsedTicks)
    || !isIsoDate(record.completedAt)
  ) return false;
  if (record.mode === 'race') {
    return hasOnlyKeys(record, ['version', 'mode', 'outcome', 'lines', 'elapsedTicks', 'completedAt']);
  }
  return isNonNegativeInteger(record.score)
    && isNonNegativeInteger(record.pieces)
    && record.chain === 0
    && hasOnlyKeys(record, [
      'version', 'mode', 'outcome', 'score', 'lines', 'pieces', 'elapsedTicks', 'chain', 'completedAt',
    ]);
}

function isLegacyV8Leaderboard(value: unknown): value is LegacyV8Leaderboard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const board = value as Partial<LegacyV8Leaderboard>;
  return board.version === 8
    && Array.isArray(board.marathon)
    && board.marathon.every((record) => isLegacyV8Record(record) && record.mode === 'marathon')
    && Array.isArray(board.race)
    && board.race.every((record) => isLegacyV8Record(record) && record.mode === 'race')
    && Array.isArray(board.sprint)
    && board.sprint.every((record) => isLegacyV8Record(record) && record.mode === 'sprint');
}

function isLegacyV7Record(value: unknown): value is LegacyV7ScoreRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<LegacyV7ScoreRecord>;
  return record.version === 7
    && hasLegacyFields(record)
    && isNonNegativeInteger(record.chain)
    && (record.mode === 'marathon' || record.mode === 'race' || record.mode === 'sprint')
    && record.outcome === 'top-out'
    && record.chain === 0;
}

function isLegacyV7Leaderboard(value: unknown): value is LegacyV7Leaderboard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const board = value as Partial<LegacyV7Leaderboard>;
  return board.version === 7
    && Array.isArray(board.marathon)
    && board.marathon.every((record) => isLegacyV7Record(record) && record.mode === 'marathon')
    && Array.isArray(board.race)
    && board.race.every((record) => isLegacyV7Record(record) && record.mode === 'race')
    && Array.isArray(board.sprint)
    && board.sprint.every((record) => isLegacyV7Record(record) && record.mode === 'sprint');
}

function isLegacyV6Record(value: unknown): value is LegacyV6ScoreRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<LegacyV6ScoreRecord>;
  return record.version === 6
    && hasLegacyFields(record)
    && isNonNegativeInteger(record.chain)
    && (record.mode === 'marathon' || record.mode === 'race' || record.mode === 'sprint')
    && record.outcome === 'top-out'
    && (record.mode === 'sprint' || record.chain === 0);
}

function isLegacyV6Leaderboard(value: unknown): value is LegacyV6Leaderboard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const board = value as Partial<LegacyV6Leaderboard>;
  return board.version === 6
    && Array.isArray(board.marathon)
    && board.marathon.every((record) => isLegacyV6Record(record) && record.mode === 'marathon')
    && Array.isArray(board.race)
    && board.race.every((record) => isLegacyV6Record(record) && record.mode === 'race')
    && Array.isArray(board.sprint)
    && board.sprint.every((record) => isLegacyV6Record(record) && record.mode === 'sprint');
}

function isLegacyV5Leaderboard(value: unknown): value is LegacyV5Leaderboard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const board = value as Partial<LegacyV5Leaderboard>;
  return board.version === 5
    && Array.isArray(board.marathon)
    && board.marathon.every((record) => isLegacyV5Record(record) && record.mode === 'marathon')
    && Array.isArray(board.race)
    && board.race.every((record) => isLegacyV5Record(record) && record.mode === 'race')
    && Array.isArray(board.sprint)
    && board.sprint.every((record) => isLegacyV5Record(record) && record.mode === 'sprint');
}

function isLegacyV4Record(value: unknown): value is LegacyV4ScoreRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<LegacyV4ScoreRecord>;
  if (
    record.version !== 4
    || !hasLegacyFields(record)
    || (record.mode !== 'marathon' && record.mode !== 'race' && record.mode !== 'sprint')
  ) return false;
  return record.mode === 'sprint' ? record.outcome === 'finished' : record.outcome === 'top-out';
}

function isLegacyV4Leaderboard(value: unknown): value is LegacyV4Leaderboard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const board = value as Partial<LegacyV4Leaderboard>;
  return board.version === 4
    && Array.isArray(board.marathon)
    && board.marathon.every((record) => isLegacyV4Record(record) && record.mode === 'marathon')
    && Array.isArray(board.race)
    && board.race.every((record) => isLegacyV4Record(record) && record.mode === 'race')
    && Array.isArray(board.sprint)
    && board.sprint.every((record) => isLegacyV4Record(record) && record.mode === 'sprint');
}

function isLegacyV3Record(value: unknown): value is LegacyV3ScoreRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<LegacyV3ScoreRecord>;
  return record.version === 3
    && hasLegacyFields(record)
    && (record.mode === 'marathon' || record.mode === 'race')
    && record.outcome === 'top-out';
}

function isLegacyV3Leaderboard(value: unknown): value is LegacyV3Leaderboard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const board = value as Partial<LegacyV3Leaderboard>;
  return board.version === 3
    && Array.isArray(board.marathon)
    && board.marathon.every((record) => isLegacyV3Record(record) && record.mode === 'marathon')
    && Array.isArray(board.race)
    && board.race.every((record) => isLegacyV3Record(record) && record.mode === 'race');
}

function migrateStandardRecords(
  records: readonly LegacyRecordFields[],
  mode: 'marathon' | 'sprint',
): StandardScoreRecord[] {
  if (mode === 'marathon') {
    return limitClassicRecords(records.map((record): ClassicScoreRecord => ({
      version: 9,
      score: record.score,
      lines: record.lines,
      pieces: record.pieces,
      elapsedTicks: record.elapsedTicks,
      chain: 0,
      mode,
      outcome: 'top-out',
      completedAt: record.completedAt,
      classicStartingGravityTicks: LEGACY_CLASSIC_STARTING_GRAVITY_TICKS,
      classicGravityFloorTicks: LEGACY_CLASSIC_GRAVITY_FLOOR_TICKS,
      classicGrade: 'standard',
    })));
  }
  return sortRecords(mode, records.map((record): MutationScoreRecord => ({
    version: 9,
    score: record.score,
    lines: record.lines,
    pieces: record.pieces,
    elapsedTicks: record.elapsedTicks,
    chain: 0,
    mode,
    outcome: 'top-out',
    completedAt: record.completedAt,
  }))).slice(0, leaderboardLimit(mode)) as MutationScoreRecord[];
}

function migrateSurvivalRecords(
  records: readonly Pick<LegacyRecordFields, 'lines' | 'elapsedTicks' | 'completedAt'>[],
): SurvivalScoreRecord[] {
  return sortRecords('race', records.map((record) => ({
    version: 9 as const,
    lines: record.lines,
    elapsedTicks: record.elapsedTicks,
    mode: 'race' as const,
    outcome: 'top-out' as const,
    completedAt: record.completedAt,
  }))).slice(0, leaderboardLimit('race')) as SurvivalScoreRecord[];
}

/** Preserves valid Classic/Survival rows while clearing incompatible fourth-mode rows. */
export function migrateLegacyLeaderboard(raw: string | null): Leaderboard {
  if (raw === null) return emptyLeaderboard();
  try {
    const value: unknown = JSON.parse(raw);
    if (isLegacyV8Leaderboard(value)) {
      return {
        version: 9,
        marathon: migrateStandardRecords(value.marathon, 'marathon') as ClassicScoreRecord[],
        race: migrateSurvivalRecords(value.race),
        sprint: migrateStandardRecords(value.sprint, 'sprint') as MutationScoreRecord[],
      };
    }
    if (isLegacyV7Leaderboard(value)) {
      return {
        version: 9,
        marathon: migrateStandardRecords(value.marathon, 'marathon') as ClassicScoreRecord[],
        race: migrateSurvivalRecords(value.race),
        sprint: migrateStandardRecords(value.sprint, 'sprint') as MutationScoreRecord[],
      };
    }
    if (isLegacyV6Leaderboard(value) || isLegacyV5Leaderboard(value) || isLegacyV4Leaderboard(value)) {
      return {
        version: 9,
        marathon: migrateStandardRecords(value.marathon, 'marathon') as ClassicScoreRecord[],
        race: migrateSurvivalRecords(value.race),
        // All prior fourth-mode rows predate the item rule and cannot be compared.
        sprint: [],
      };
    }
    if (!isLegacyV3Leaderboard(value)) return emptyLeaderboard();
    return {
      version: 9,
      marathon: migrateStandardRecords(value.marathon, 'marathon') as ClassicScoreRecord[],
      race: migrateSurvivalRecords(value.race),
      sprint: [],
    };
  } catch {
    return emptyLeaderboard();
  }
}

export function recordsForMode(leaderboard: Leaderboard, mode: RunMode): ScoreRecord[] {
  return leaderboard[mode] as ScoreRecord[];
}

export function insertScoreRecord(leaderboard: Leaderboard, record: ScoreRecord): Leaderboard {
  if (!isLeaderboard(leaderboard) || !isScoreRecord(record)) return emptyLeaderboard();
  const current = leaderboard[record.mode];
  const next = record.mode === 'marathon'
    ? limitClassicRecords([...(current as ClassicScoreRecord[]), record])
    : sortRecords(record.mode, [...current, record]).slice(0, leaderboardLimit(record.mode));
  if (record.mode === 'race') return { ...leaderboard, race: next as SurvivalScoreRecord[] };
  if (record.mode === 'sprint') return { ...leaderboard, sprint: next as MutationScoreRecord[] };
  return { ...leaderboard, marathon: next as ClassicScoreRecord[] };
}
