import { describe, expect, it } from 'vitest';
import {
  LINE_CLEAR_FIXED_STEP_MS,
  LINE_CLEAR_RELEASE_TICKS,
  STUDIO_LINE_CLEAR_OFFSETS_MS,
  lineClearReleaseAgeMs,
  lineClearReleaseSnapshot,
  lineClearRowReleaseProgress,
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

  it('bounds each multi-line row pulse and carries its pre-commit release age', () => {
    expect(lineClearRowReleaseProgress(3, 4, 1)).toBe(0);
    expect(lineClearRowReleaseProgress(4, 4, 1)).toBeGreaterThan(0);
    expect(lineClearRowReleaseProgress(7, 4, 1)).toBe(1);
    expect(lineClearRowReleaseProgress(11, 4, 3)).toBe(0.5);
    expect(lineClearRowReleaseProgress(11, 1, 0)).toBe(0);

    const ages = [0, 1, 2, 3].map((rowOrder) => lineClearReleaseAgeMs(4, rowOrder));
    expect(ages).toEqual([
      12 * LINE_CLEAR_FIXED_STEP_MS,
      8 * LINE_CLEAR_FIXED_STEP_MS,
      5 * LINE_CLEAR_FIXED_STEP_MS,
      LINE_CLEAR_FIXED_STEP_MS,
    ]);
    expect(ages.every((age, index) => index === 0 || age < ages[index - 1]!)).toBe(true);
  });
});
