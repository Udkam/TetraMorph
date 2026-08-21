import { LINE_CLEAR_DELAY_TICKS, TICKS_PER_SECOND } from '../game/core/constants';

export type LineClearCount = 1 | 2 | 3 | 4;

/** Human-accepted Studio row offsets, shared by audio scheduling and visual release. */
export const STUDIO_LINE_CLEAR_OFFSETS_MS = Object.freeze({
  1: Object.freeze([0]),
  2: Object.freeze([0, 180]),
  3: Object.freeze([0, 90, 180]),
  4: Object.freeze([0, 60, 120, 180]),
} satisfies Record<LineClearCount, readonly number[]>);

export const LINE_CLEAR_FIXED_STEP_MS = 1_000 / TICKS_PER_SECOND;

/** Continuous R3 presentation timing; Core still commits atomically after twelve ticks. */
export const CLASSIC_LINE_CLEAR_SEQUENCE_MS = 300;
export const CLASSIC_LINE_CLEAR_ROW_MIN_MS = 120;
export const CLASSIC_LINE_CLEAR_HANDOFF_MS = 30;
export const LINE_CLEAR_CORE_COMMIT_MS = LINE_CLEAR_DELAY_TICKS * LINE_CLEAR_FIXED_STEP_MS;
export const CLASSIC_LINE_CLEAR_TAIL_MS = Math.max(
  0,
  CLASSIC_LINE_CLEAR_SEQUENCE_MS - LINE_CLEAR_CORE_COMMIT_MS,
);

/** Count-owned reward residue begins only after the accepted 300 ms material erase. */
export const LINE_CLEAR_FULL_REWARD_TAIL_MS = Object.freeze({
  1: 120,
  2: 240,
  3: 360,
  4: 480,
} satisfies Record<LineClearCount, number>);

/** Reduced motion keeps the same erase, followed by a shorter stationary afterimage. */
export const LINE_CLEAR_REDUCED_REWARD_TAIL_MS = Object.freeze({
  1: 80,
  2: 100,
  3: 120,
  4: 140,
} satisfies Record<LineClearCount, number>);

/** Nearest canonical 60 Hz presentation tick for every accepted Studio pulse. */
export const LINE_CLEAR_RELEASE_TICKS = Object.freeze({
  1: Object.freeze([0]),
  2: Object.freeze([0, 11]),
  3: Object.freeze([0, 5, 11]),
  4: Object.freeze([0, 4, 7, 11]),
} satisfies Record<LineClearCount, readonly number[]>);

export interface LineClearReleaseSnapshot {
  readonly count: LineClearCount;
  readonly orderedRows: readonly number[];
  readonly releaseTicks: readonly number[];
  readonly releasedRows: readonly number[];
}

export function isLineClearCount(count: number): count is LineClearCount {
  return Number.isInteger(count) && count >= 1 && count <= 4;
}

export function orderedLineClearRows(rows: readonly number[]): readonly number[] {
  return Object.freeze([...new Set(rows.filter(Number.isInteger))].sort((left, right) => left - right));
}

export function lineClearReleaseTicks(count: number): readonly number[] {
  if (!isLineClearCount(count)) return Object.freeze([]);
  return LINE_CLEAR_RELEASE_TICKS[count];
}

/** Integer/fractional ticks elapsed since one row's accepted Studio beat. */
export function lineClearRowElapsedTicks(
  phaseTicks: number,
  count: number,
  rowOrder: number,
): number | null {
  if (!isLineClearCount(count) || !Number.isInteger(rowOrder)) return null;
  const releaseTick = LINE_CLEAR_RELEASE_TICKS[count][rowOrder];
  if (releaseTick === undefined || !Number.isFinite(phaseTicks) || phaseTicks < releaseTick) return null;
  return Math.max(0, phaseTicks - releaseTick);
}

/** Exact renderer time since one row's frozen Studio start; negative time stays inactive. */
export function lineClearRowElapsedMs(
  elapsedMs: number,
  count: number,
  rowOrder: number,
): number | null {
  if (!isLineClearCount(count) || !Number.isInteger(rowOrder)) return null;
  const releaseMs = STUDIO_LINE_CLEAR_OFFSETS_MS[count][rowOrder];
  if (releaseMs === undefined || !Number.isFinite(elapsedMs) || elapsedMs < releaseMs) return null;
  return Math.max(0, elapsedMs - releaseMs);
}

/**
 * Every handoff overlaps by at least 30 ms. The long first double-clear row bridges
 * the accepted 180 ms audio interval without changing either Studio start.
 */
export function lineClearRowDurationMs(count: number, rowOrder: number): number {
  if (!isLineClearCount(count) || !Number.isInteger(rowOrder)) return 0;
  const offsets = STUDIO_LINE_CLEAR_OFFSETS_MS[count];
  const current = offsets[rowOrder];
  if (current === undefined) return 0;
  if (count === 1) return CLASSIC_LINE_CLEAR_SEQUENCE_MS;
  const next = offsets[rowOrder + 1];
  return next === undefined
    ? CLASSIC_LINE_CLEAR_ROW_MIN_MS
    : Math.max(CLASSIC_LINE_CLEAR_ROW_MIN_MS, next - current + CLASSIC_LINE_CLEAR_HANDOFF_MS);
}

/** Duration of the frozen centre-out material erase, excluding its new reward residue. */
export function lineClearEraseDurationMs(count: number): number {
  if (!isLineClearCount(count)) return 0;
  const offsets = STUDIO_LINE_CLEAR_OFFSETS_MS[count];
  const lastOrder = offsets.length - 1;
  return offsets[lastOrder]! + lineClearRowDurationMs(count, lastOrder);
}

export function lineClearRewardTailDurationMs(count: number, reducedMotion: boolean): number {
  if (!isLineClearCount(count)) return 0;
  return reducedMotion
    ? LINE_CLEAR_REDUCED_REWARD_TAIL_MS[count]
    : LINE_CLEAR_FULL_REWARD_TAIL_MS[count];
}

/** Complete non-blocking renderer lifetime; Core still commits at its unchanged 200 ms. */
export function lineClearVisualDurationMs(count: number, reducedMotion = false): number {
  if (!isLineClearCount(count)) return 0;
  return lineClearEraseDurationMs(count) + lineClearRewardTailDurationMs(count, reducedMotion);
}

/**
 * All accepted Studio starts are exposed to the shared renderer track before Core's
 * unchanged twelve-tick atomic commit. `releasedRows` means presentation has started;
 * it never authorizes Core mutation or direct row removal.
 */
export function lineClearReleaseSnapshot(
  rows: readonly number[],
  phaseTicks: number,
): Readonly<LineClearReleaseSnapshot> | null {
  const orderedRows = orderedLineClearRows(rows);
  const count = orderedRows.length;
  if (!isLineClearCount(count)) return null;
  const releaseTicks = LINE_CLEAR_RELEASE_TICKS[count];
  const canonicalTick = Math.max(0, Math.floor(Number.isFinite(phaseTicks) ? phaseTicks : 0));
  const releasedRows = orderedRows.filter((_, index) => canonicalTick >= releaseTicks[index]!);
  return Object.freeze({
    count,
    orderedRows,
    releaseTicks,
    releasedRows: Object.freeze(releasedRows),
  });
}
