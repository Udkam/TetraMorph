import { describe, expect, it } from 'vitest';
import {
  CLASSIC_LINE_CLEAR_HANDOFF_MS,
  CLASSIC_LINE_CLEAR_ROW_MIN_MS,
  CLASSIC_LINE_CLEAR_SEQUENCE_MS,
  CLASSIC_LINE_CLEAR_TAIL_MS,
  LINE_CLEAR_FIXED_STEP_MS,
  LINE_CLEAR_RELEASE_TICKS,
  STUDIO_LINE_CLEAR_OFFSETS_MS,
  lineClearReleaseSnapshot,
  lineClearRowDurationMs,
  lineClearRowElapsedMs,
  lineClearRowElapsedTicks,
  lineClearVisualDurationMs,
  orderedLineClearRows,
} from './lineClearTimeline';

describe('line-clear timeline', () => {
  it('maps the accepted Studio offsets to the nearest canonical 60 Hz ticks', () => {
    expect(STUDIO_LINE_CLEAR_OFFSETS_MS).toEqual({
      1: [0],
      2: [0, 180],
      3: [0, 90, 180],
      4: [0, 60, 120, 180],
    });
    expect(LINE_CLEAR_RELEASE_TICKS).toEqual({
      1: [0],
      2: [0, 11],
      3: [0, 5, 11],
      4: [0, 4, 7, 11],
    });
    for (const count of [1, 2, 3, 4] as const) {
      LINE_CLEAR_RELEASE_TICKS[count].forEach((tick, index) => {
        expect(Math.abs(tick * LINE_CLEAR_FIXED_STEP_MS - STUDIO_LINE_CLEAR_OFFSETS_MS[count][index]!))
          .toBeLessThanOrEqual(LINE_CLEAR_FIXED_STEP_MS / 2);
      });
    }
  });

  it('sorts arbitrary row input top-to-bottom and releases only multi-line rows', () => {
    expect(orderedLineClearRows([39, 36, 38, 37, 38])).toEqual([36, 37, 38, 39]);
    expect(lineClearReleaseSnapshot([39], 11)).toEqual({
      count: 1,
      orderedRows: [39],
      releaseTicks: [0],
      releasedRows: [],
    });
    expect(lineClearReleaseSnapshot([39, 36, 38, 37], 0)?.releasedRows).toEqual([36]);
    expect(lineClearReleaseSnapshot([39, 36, 38, 37], 4)?.releasedRows).toEqual([36, 37]);
    expect(lineClearReleaseSnapshot([39, 36, 38, 37], 7)?.releasedRows).toEqual([36, 37, 38]);
    expect(lineClearReleaseSnapshot([39, 36, 38, 37], 11)?.releasedRows).toEqual([36, 37, 38, 39]);
    expect(lineClearReleaseSnapshot([], 0)).toBeNull();
    expect(lineClearReleaseSnapshot([1, 2, 3, 4, 5], 0)).toBeNull();
  });

  it('keeps frozen starts while every R3 row handoff overlaps on a 300 ms track', () => {
    expect(CLASSIC_LINE_CLEAR_ROW_MIN_MS).toBe(120);
    expect(CLASSIC_LINE_CLEAR_HANDOFF_MS).toBe(30);
    expect(CLASSIC_LINE_CLEAR_SEQUENCE_MS).toBe(300);
    expect(CLASSIC_LINE_CLEAR_TAIL_MS).toBeCloseTo(100);
    expect(lineClearRowElapsedTicks(3, 4, 1)).toBeNull();
    expect(lineClearRowElapsedTicks(4, 4, 1)).toBe(0);
    expect(lineClearRowElapsedTicks(6.5, 4, 1)).toBe(2.5);
    expect(lineClearRowElapsedMs(59.9, 4, 1)).toBeNull();
    expect(lineClearRowElapsedMs(60, 4, 1)).toBe(0);
    expect(lineClearRowElapsedMs(92.5, 4, 1)).toBe(32.5);

    expect([0, 1].map((rowOrder) => lineClearRowDurationMs(2, rowOrder))).toEqual([210, 120]);
    expect([0, 1, 2].map((rowOrder) => lineClearRowDurationMs(3, rowOrder))).toEqual([120, 120, 120]);
    expect([0, 1, 2, 3].map((rowOrder) => lineClearRowDurationMs(4, rowOrder))).toEqual([120, 120, 120, 120]);
    expect([2, 3, 4].map(lineClearVisualDurationMs)).toEqual([300, 300, 300]);

    for (const count of [2, 3, 4] as const) {
      const offsets = STUDIO_LINE_CLEAR_OFFSETS_MS[count];
      for (let rowOrder = 0; rowOrder < offsets.length - 1; rowOrder += 1) {
        const rowEnd = offsets[rowOrder]! + lineClearRowDurationMs(count, rowOrder);
        expect(rowEnd - offsets[rowOrder + 1]!).toBeGreaterThanOrEqual(CLASSIC_LINE_CLEAR_HANDOFF_MS);
      }
    }
  });
});
