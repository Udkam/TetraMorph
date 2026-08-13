import { BOARD_HEIGHT, VISIBLE_START_ROW, type Cell } from '../game/core';

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
  originCells: readonly Cell[],
  reducedMotion = false,
): Readonly<MutationChainPresentationPlan> {
  const canonicalOrigins = [...new Set(originCells
    .map((cell) => cell.y)
    .filter((row) => row >= 0 && row < BOARD_HEIGHT))]
    .sort((left, right) => left - right);
  const visibleOrigins = canonicalOrigins.filter((row) => row >= VISIBLE_START_ROW);
  const rawDistanceFor = canonicalOrigins.length > 0
    ? (row: number) => Math.min(...canonicalOrigins.map((origin) => Math.abs(row - origin)))
    : (row: number) => row - VISIBLE_START_ROW;
  const visibleRows = Array.from(
    { length: BOARD_HEIGHT - VISIBLE_START_ROW },
    (_, index) => VISIBLE_START_ROW + index,
  );
  const visibleDistances = [...new Set(visibleRows.map(rawDistanceFor))]
    .sort((left, right) => left - right);
  const beatIndexByDistance = new Map(visibleDistances.map((distance, index) => [distance, index]));
  const revealMs = reducedMotion ? 50 : 140;
  const beatMs = reducedMotion ? 12 : 34;
  const fadeMs = reducedMotion ? 70 : 150;
  const rowBeats = Object.freeze(visibleRows.map((row) => {
    const distance = rawDistanceFor(row);
    const beatIndex = beatIndexByDistance.get(distance) ?? 0;
    return Object.freeze({ row, distance, startMs: revealMs + beatIndex * beatMs });
  }));
  const distanceBeats = Object.freeze([...new Set(rowBeats.map(({ distance }) => distance))]
    .sort((left, right) => left - right));
  const beatStartsMs = Object.freeze([...new Set(rowBeats.map(({ startMs }) => startMs))]
    .sort((left, right) => left - right));
  const lastBeatStart = beatStartsMs.at(-1) ?? revealMs;
  return Object.freeze({
    originVisible: visibleOrigins.length > 0,
    rowBeats,
    distanceBeats,
    beatStartsMs,
    revealMs,
    beatMs,
    fadeMs,
    durationMs: lastBeatStart + fadeMs,
  });
}
