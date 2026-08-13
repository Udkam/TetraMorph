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
  const visibleOrigins = [...new Set(originCells
    .map((cell) => cell.y)
    .filter((row) => row >= VISIBLE_START_ROW && row < BOARD_HEIGHT))]
    .sort((left, right) => left - right);
  const distanceFor = visibleOrigins.length > 0
    ? (row: number) => Math.min(...visibleOrigins.map((origin) => Math.abs(row - origin)))
    : (row: number) => row - VISIBLE_START_ROW;
  const revealMs = reducedMotion ? 50 : 140;
  const beatMs = reducedMotion ? 12 : 34;
  const fadeMs = reducedMotion ? 70 : 150;
  const rowBeats = Object.freeze(Array.from(
    { length: BOARD_HEIGHT - VISIBLE_START_ROW },
    (_, index) => {
      const row = VISIBLE_START_ROW + index;
      const distance = distanceFor(row);
      return Object.freeze({ row, distance, startMs: revealMs + distance * beatMs });
    },
  ));
  const distanceBeats = Object.freeze([...new Set(rowBeats.map(({ distance }) => distance))]
    .sort((left, right) => left - right));
  const farthest = distanceBeats.at(-1) ?? 0;
  return Object.freeze({
    originVisible: visibleOrigins.length > 0,
    rowBeats,
    distanceBeats,
    revealMs,
    beatMs,
    fadeMs,
    durationMs: revealMs + farthest * beatMs + fadeMs,
  });
}
