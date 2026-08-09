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

/**
 * One-line clear remains on its accepted renderer path. Only multi-line clears
 * expose released rows before Core's unchanged twelve-tick atomic commit.
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
  const releasedRows = count === 1
    ? []
    : orderedRows.filter((_, index) => canonicalTick >= releaseTicks[index]!);
  return Object.freeze({
    count,
    orderedRows,
    releaseTicks,
    releasedRows: Object.freeze(releasedRows),
  });
}

/** A compact row-local release pulse; it never extends Core's clear interval. */
export function lineClearRowReleaseProgress(
  phaseTicks: number,
  count: number,
  rowOrder: number,
): number {
  if (!isLineClearCount(count) || count === 1 || !Number.isInteger(rowOrder)) return 0;
  const releaseTick = LINE_CLEAR_RELEASE_TICKS[count][rowOrder];
  if (releaseTick === undefined || phaseTicks < releaseTick) return 0;
  const availableTicks = Math.max(1, Math.min(3, LINE_CLEAR_DELAY_TICKS - releaseTick));
  return Math.max(0, Math.min(1, (phaseTicks - releaseTick + 0.5) / availableTicks));
}

/** Age already accrued when Core commits, so earlier rows never respawn as fresh tails. */
export function lineClearReleaseAgeMs(count: number, rowOrder: number): number {
  if (!isLineClearCount(count) || count === 1 || !Number.isInteger(rowOrder)) return 0;
  const releaseTick = LINE_CLEAR_RELEASE_TICKS[count][rowOrder];
  if (releaseTick === undefined) return 0;
  return Math.max(0, LINE_CLEAR_DELAY_TICKS - releaseTick) * LINE_CLEAR_FIXED_STEP_MS;
}
