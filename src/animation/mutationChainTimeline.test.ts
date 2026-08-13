import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from '../game/core';
import { mutationChainPresentationPlan } from './mutationChainTimeline';

describe('Mutation chain presentation plan', () => {
  it('groups equal-distance rows on one beat and reaches both visible edges', () => {
    const origin = VISIBLE_START_ROW + 7;
    const plan = mutationChainPresentationPlan([{ x: 4, y: origin }]);
    const byRow = new Map(plan.rowBeats.map((beat) => [beat.row, beat]));
    expect(byRow.get(origin)).toMatchObject({ distance: 0, startMs: 140 });
    expect(byRow.get(origin - 1)?.startMs).toBe(byRow.get(origin + 1)?.startMs);
    expect(plan.rowBeats[0]?.row).toBe(VISIBLE_START_ROW);
    expect(plan.rowBeats.at(-1)?.row).toBe(VISIBLE_START_ROW + 19);
    expect(plan.durationMs).toBe(698);
  });

  it('starts a hidden origin at the nearest visible boundary with no hidden delay', () => {
    const plan = mutationChainPresentationPlan([{ x: 4, y: 3 }]);
    expect(plan.originVisible).toBe(false);
    expect(plan.rowBeats[0]).toEqual({ row: VISIBLE_START_ROW, distance: 17, startMs: 140 });
    expect(plan.distanceBeats).toEqual(Array.from({ length: 20 }, (_, index) => index + 17));
    expect(plan.beatStartsMs[0]).toBe(140);
    expect(plan.durationMs).toBe(936);
  });

  it('keeps reduced motion causal while shortening every beat', () => {
    const plan = mutationChainPresentationPlan([{ x: 4, y: VISIBLE_START_ROW + 5 }], true);
    expect(plan.rowBeats.find(({ distance }) => distance === 0)?.startMs).toBe(50);
    expect(plan.rowBeats.find(({ distance }) => distance === 1)?.startMs).toBe(62);
    expect(plan.durationMs).toBe(288);
  });

  it('uses complete split carrier geometry while skipping hidden-only holds', () => {
    const plan = mutationChainPresentationPlan([
      { x: 2, y: VISIBLE_START_ROW - 1 },
      { x: 7, y: VISIBLE_START_ROW + 15 },
    ]);
    const byRow = new Map(plan.rowBeats.map((beat) => [beat.row, beat]));
    expect(byRow.get(VISIBLE_START_ROW)).toMatchObject({ distance: 1, startMs: 174 });
    expect(byRow.get(VISIBLE_START_ROW + 15)).toMatchObject({ distance: 0, startMs: 140 });
    expect(plan.distanceBeats[0]).toBe(0);
    expect(plan.durationMs).toBe(562);
  });
});
