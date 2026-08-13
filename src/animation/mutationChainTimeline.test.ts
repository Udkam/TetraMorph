import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from '../game/core';
import { mutationChainPresentationPlan } from './mutationChainTimeline';

describe('Mutation chain presentation plan', () => {
  it('groups equal-distance rows on one beat and reaches both visible edges', () => {
    const origin = VISIBLE_START_ROW + 7;
    const plan = mutationChainPresentationPlan([origin]);
    const byRow = new Map(plan.rowBeats.map((beat) => [beat.row, beat]));
    expect(byRow.get(origin)).toMatchObject({ distance: 0, startMs: 220 });
    expect(byRow.get(origin - 1)?.startMs).toBe(byRow.get(origin + 1)?.startMs);
    expect(plan.rowBeats[0]?.row).toBe(VISIBLE_START_ROW);
    expect(plan.rowBeats.at(-1)?.row).toBe(VISIBLE_START_ROW + 19);
    expect(plan.durationMs).toBe(1_112);
  });

  it('clamps a hidden trigger to the nearest visible boundary with no hidden delay', () => {
    const plan = mutationChainPresentationPlan([3]);
    expect(plan.originVisible).toBe(false);
    expect(plan.rowBeats[0]).toEqual({ row: VISIBLE_START_ROW, distance: 0, startMs: 220 });
    expect(plan.distanceBeats).toEqual(Array.from({ length: 20 }, (_, index) => index));
    expect(plan.beatStartsMs[0]).toBe(220);
    expect(plan.durationMs).toBe(1_504);
  });

  it('keeps reduced motion causal while shortening every beat', () => {
    const plan = mutationChainPresentationPlan([VISIBLE_START_ROW + 5], true);
    expect(plan.rowBeats.find(({ distance }) => distance === 0)?.startMs).toBe(50);
    expect(plan.rowBeats.find(({ distance }) => distance === 1)?.startMs).toBe(70);
    expect(plan.durationMs).toBe(420);
  });

  it('sorts and deduplicates multiple trigger rows before sharing distance beats', () => {
    const plan = mutationChainPresentationPlan([
      VISIBLE_START_ROW + 15,
      VISIBLE_START_ROW + 3,
      VISIBLE_START_ROW + 15,
    ]);
    const byRow = new Map(plan.rowBeats.map((beat) => [beat.row, beat]));
    expect(byRow.get(VISIBLE_START_ROW + 3)).toMatchObject({ distance: 0, startMs: 220 });
    expect(byRow.get(VISIBLE_START_ROW + 15)).toMatchObject({ distance: 0, startMs: 220 });
    expect(byRow.get(VISIBLE_START_ROW + 2)?.startMs).toBe(byRow.get(VISIBLE_START_ROW + 4)?.startMs);
    expect(plan.distanceBeats[0]).toBe(0);
    expect(plan.durationMs).toBe(776);
  });

  it('uses the exact trigger row even when the carrier geometry crosses another row', () => {
    const trigger = VISIBLE_START_ROW + 8;
    const plan = mutationChainPresentationPlan([trigger]);
    const byRow = new Map(plan.rowBeats.map((beat) => [beat.row, beat]));
    expect(byRow.get(trigger)).toMatchObject({ distance: 0, startMs: 220 });
    expect(byRow.get(trigger - 1)).toMatchObject({ distance: 1, startMs: 276 });
    expect(byRow.get(trigger + 1)).toMatchObject({ distance: 1, startMs: 276 });
  });
});
