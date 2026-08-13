import { BOARD_HEIGHT, VISIBLE_START_ROW } from '../game/core';

export interface MutationChainRowBeat {
  readonly row: number;
  readonly distance: number;
  readonly startMs: number;
}

export interface MutationChainPresentationPlan {
  readonly originVisible: boolean;
  readonly rowBeats: readonly MutationChainRowBeat[];
  readonly distanceBeats: readonly number[];
  readonly beatStartsMs: readonly number[];
  readonly revealMs: number;
  readonly beatMs: number;
  readonly fadeMs: number;
  readonly durationMs: number;
}

/** Shared causal beat plan for renderer and audio. Hidden rows never add a beat. */
export function mutationChainPresentationPlan(
  chainTriggerRows: readonly number[],
  reducedMotion = false,
): Readonly<MutationChainPresentationPlan> {
  const canonicalTriggers = [...new Set(chainTriggerRows
    .filter(Number.isFinite)
    .map((row) => Math.max(VISIBLE_START_ROW, Math.min(BOARD_HEIGHT - 1, Math.trunc(row)))))]
    .sort((left, right) => left - right);
  const visibleTriggers = canonicalTriggers.length > 0
    ? canonicalTriggers
    : [VISIBLE_START_ROW];
  const rawDistanceFor = (row: number): number => Math.min(
    ...visibleTriggers.map((triggerRow) => Math.abs(row - triggerRow)),
  );
  const visibleRows = Array.from(
    { length: BOARD_HEIGHT - VISIBLE_START_ROW },
    (_, index) => VISIBLE_START_ROW + index,
  );
  const revealMs = reducedMotion ? 50 : 220;
  const beatMs = reducedMotion ? 20 : 56;
  const fadeMs = reducedMotion ? 90 : 220;
  const rowBeats = Object.freeze(visibleRows.map((row) => {
    const distance = rawDistanceFor(row);
    return Object.freeze({ row, distance, startMs: revealMs + distance * beatMs });
  }));
  const distanceBeats = Object.freeze([...new Set(rowBeats.map(({ distance }) => distance))]
    .sort((left, right) => left - right));
  const beatStartsMs = Object.freeze([...new Set(rowBeats.map(({ startMs }) => startMs))]
    .sort((left, right) => left - right));
  const lastBeatStart = beatStartsMs.at(-1) ?? revealMs;
  return Object.freeze({
    originVisible: chainTriggerRows.some((row) => (
      Number.isFinite(row) && row >= VISIBLE_START_ROW && row < BOARD_HEIGHT
    )),
    rowBeats,
    distanceBeats,
    beatStartsMs,
    revealMs,
    beatMs,
    fadeMs,
    durationMs: lastBeatStart + fadeMs,
  });
}
