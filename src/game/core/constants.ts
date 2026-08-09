import type { GameMode } from './types';

export const BOARD_WIDTH = 10;
export const VISIBLE_HEIGHT = 20;
export const BUFFER_HEIGHT = 20;
export const BOARD_HEIGHT = VISIBLE_HEIGHT + BUFFER_HEIGHT;
export const VISIBLE_START_ROW = BUFFER_HEIGHT;

export const LOCK_DELAY_TICKS = 18;
export const MAX_LOCK_RESETS = 15;
export const ENTRY_DELAY_TICKS = 3;
export const LINE_CLEAR_DELAY_TICKS = 12;

export const NEXT_QUEUE_SIZE = 5;

export const STANDARD_GRAVITY_TICKS = 48;
/** Player-selectable Classic opening gravity, expressed at the canonical 60 Hz. */
export const CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS = 48;
/** Default fastest Classic gravity: 0.1 seconds per cell. */
export const CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS = 6;
export const CLASSIC_STARTING_GRAVITY_MIN_TICKS = 6;
export const CLASSIC_STARTING_GRAVITY_MAX_TICKS = 60;
export const CLASSIC_GRAVITY_STEP_TICKS = 6;
export const INITIAL_SURVIVAL_BEDROCK_ROWS = 3;
export const SURVIVAL_LINES_PER_BEDROCK = 3;
export const TICKS_PER_SECOND = 60;
export const SURVIVAL_INITIAL_INTERVAL_SECONDS = 13;
export const SURVIVAL_INTERVAL_STEP_SECONDS = 1;
export const SURVIVAL_MIN_INTERVAL_SECONDS = 6;
/** Survival stays brisk but never accelerates as lines increase. */
export const SURVIVAL_GRAVITY_TICKS = 38;
/** Every fourth resolved natural pressure rise is a two-row Aftershock. */
export const SURVIVAL_RISES_PER_AFTERSHOCK = 4;
/** Survival rockfall is paced by locked player pieces, not wall-clock time. */
export const SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES = 8;
export const SURVIVAL_DEBRIS_MIN_INTERVAL_PIECES = 4;
export const SURVIVAL_DEBRIS_EVENTS_PER_INTERVAL_STEP = 4;
/** Minimum visible warning lead: 48 playing ticks are exactly 800 ms at 60 Hz. */
export const SURVIVAL_DEBRIS_WARNING_TICKS = 48;
/** Exactly 7× normal Survival gravity, represented with an integer accumulator. */
export const SURVIVAL_DEBRIS_FALL_PROGRESS_PER_TICK = 7;
export const SURVIVAL_DEBRIS_FALL_PROGRESS_THRESHOLD = SURVIVAL_GRAVITY_TICKS;
/** Keeps the debris stream independent from the ordinary seven-bag randomizer. */
export const SURVIVAL_DEBRIS_RANDOM_SALT = 0xa3c5_9ac3;
/** 异变 accelerates on a more frequent, six-line cadence than Classic. */
export const MUTATION_LINES_PER_SPEED = 6;
export const MUTATION_EFFECT_TICKS = 10 * TICKS_PER_SECOND;
/** Each Supergravity award refreshes coverage for this many future tetrominoes. */
export const MUTATION_SUPERGRAVITY_PIECES = 5;
export const MUTATION_RESULT_TICKS = 2 * TICKS_PER_SECOND;
export const MUTATION_CARRIER_CHANCE = 0.32;
export const MUTATION_BOMB_SCORE = 300;
export const MUTATION_BOMB_ROWS = 3;
/** Keeps item attachments deterministic without perturbing the ordinary seven-bag. */
export const MUTATION_RANDOM_SALT = 0x4d55_5441;
/** Ice slows automatic gravity to exactly one board cell per playing second. */
export const MUTATION_FREEZE_GRAVITY_TICKS = TICKS_PER_SECOND;

/** Default 0.8-second Classic opening pace, accelerating by 0.1 seconds every ten lines. */
export const PROGRESSIVE_GRAVITY_TICKS = [48, 42, 36, 30, 24, 18, 12, 6] as const;
/** Mutation alone caps at 0.1 seconds per cell so late-game item play stays responsive. */
export const MUTATION_GRAVITY_TICKS = [48, 43, 38, 33, 28, 23, 18, 13, 10, 8, 6] as const;

export function speedTierForLines(lines: number): number {
  return Math.min(PROGRESSIVE_GRAVITY_TICKS.length - 1, Math.max(0, Math.floor(lines / 10)));
}

export function normalizeClassicStartingGravityTicks(ticks: number): number {
  if (!Number.isFinite(ticks)) return CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS;
  const stepped = Math.round(ticks / CLASSIC_GRAVITY_STEP_TICKS) * CLASSIC_GRAVITY_STEP_TICKS;
  return Math.min(CLASSIC_STARTING_GRAVITY_MAX_TICKS, Math.max(CLASSIC_STARTING_GRAVITY_MIN_TICKS, stepped));
}

export function normalizeClassicGravityFloorTicks(
  ticks: number,
  startingTicks = CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
): number {
  const normalizedStart = normalizeClassicStartingGravityTicks(startingTicks);
  const normalizedFloor = Number.isFinite(ticks)
    ? normalizeClassicStartingGravityTicks(ticks)
    : CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS;
  return Math.min(normalizedStart, normalizedFloor);
}

export function classicGravityTicks(startingTicks: number, floorTicks: number, lines: number): number {
  const tiers = Math.max(0, Math.floor(lines / 10));
  const normalizedStart = normalizeClassicStartingGravityTicks(startingTicks);
  const normalizedFloor = normalizeClassicGravityFloorTicks(floorTicks, normalizedStart);
  return Math.max(
    normalizedFloor,
    normalizedStart - tiers * CLASSIC_GRAVITY_STEP_TICKS,
  );
}

export function mutationSpeedTierForLines(lines: number): number {
  return Math.min(MUTATION_GRAVITY_TICKS.length - 1, Math.max(0, Math.floor(lines / MUTATION_LINES_PER_SPEED)));
}

export function survivalIntervalSeconds(lines: number): number {
  return Math.max(
    SURVIVAL_MIN_INTERVAL_SECONDS,
    SURVIVAL_INITIAL_INTERVAL_SECONDS - SURVIVAL_INTERVAL_STEP_SECONDS * Math.floor(Math.max(0, lines) / SURVIVAL_LINES_PER_BEDROCK),
  );
}

export function survivalIntervalTicks(lines: number): number {
  return survivalIntervalSeconds(lines) * TICKS_PER_SECOND;
}

/** @deprecated Survival has one fixed cadence; retained as a zero-tier compatibility helper. */
export function raceSpeedTier(pieceCount: number, lines: number): number {
  void pieceCount;
  void lines;
  return 0;
}

export function gravityForMode(
  mode: GameMode,
  level: number,
  pieceCount: number,
  lines: number,
  classicStartingGravityTicks = CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
  classicGravityFloorTicks = CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
): number {
  void level;
  void pieceCount;
  if (mode === 'puzzle') return STANDARD_GRAVITY_TICKS;
  if (mode === 'race') return SURVIVAL_GRAVITY_TICKS;
  if (mode === 'sprint') return MUTATION_GRAVITY_TICKS[mutationSpeedTierForLines(lines)]!;
  return classicGravityTicks(classicStartingGravityTicks, classicGravityFloorTicks, lines);
}

export const LINE_CLEAR_BASE_SCORE = [0, 40, 100, 300, 1200] as const;
