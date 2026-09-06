import { describe, expect, it } from 'vitest';
import {
  CLASSIC_PACE_IDS,
  CLASSIC_PACES,
  classicPaceForGravityRange,
  classicPaceForId,
  defaultClassicPace,
} from './classicPace';

describe('Classic fixed pace presets', () => {
  it('publishes exactly five fixed opening-to-floor cadence pairs', () => {
    expect(CLASSIC_PACE_IDS).toEqual(['calm', 'relaxed', 'standard', 'swift', 'expert']);
    expect(CLASSIC_PACES).toEqual([
      { id: 'calm', startingTicks: 60, floorTicks: 18 },
      { id: 'relaxed', startingTicks: 48, floorTicks: 12 },
      { id: 'standard', startingTicks: 36, floorTicks: 4.8 },
      { id: 'swift', startingTicks: 24, floorTicks: 4.8 },
      { id: 'expert', startingTicks: 12, floorTicks: 4.8 },
    ]);
    expect(defaultClassicPace()).toEqual(classicPaceForId('standard'));
  });

  it('migrates arbitrary historical pairs by choice-index Manhattan distance with slower ties', () => {
    expect(classicPaceForGravityRange(36, 4.8).id).toBe('standard');
    expect(classicPaceForGravityRange(48, 6).id).toBe('relaxed');
    expect(classicPaceForGravityRange(30, 4.8).id).toBe('standard');
    expect(classicPaceForGravityRange(18, 4.8).id).toBe('swift');
    expect(classicPaceForGravityRange(42, 9).id).toBe('relaxed');
  });
});
