import { describe, expect, it } from 'vitest';
import {
  AUDIO_CUE_IDS,
  audioCue,
  cueEnergy,
  type LegacyAudioCueId,
} from './audioPalette';
import { gestureDuration } from './audioGesture';

describe('T37 not-yet-frozen extension palette', () => {
  it('keeps every remaining cue bounded and explicitly separate from accepted playback', () => {
    expect(AUDIO_CUE_IDS).toHaveLength(16);
    expect(AUDIO_CUE_IDS).not.toEqual(expect.arrayContaining([
      'move', 'rotate', 'lock', 'hard-drop',
      'clear-1', 'clear-2', 'clear-3', 'clear-4',
      'countdown-tick', 'countdown-resolve', 'freeze',
    ]));
    for (const id of AUDIO_CUE_IDS) {
      const cue = audioCue(id);
      expect(cue.layers.length, id).toBeGreaterThan(0);
      expect(cue.layers.length, id).toBeLessThanOrEqual(4);
      expect(gestureDuration(cue), id).toBeGreaterThan(0);
      expect(gestureDuration(cue), id).toBeLessThanOrEqual(0.8);
      for (const layer of cue.layers) {
        expect(layer.kind, id).toBe('procedural');
        expect(Number.isFinite(layer.duration), id).toBe(true);
        expect(Number.isFinite(layer.gain), id).toBe(true);
        expect(layer.duration, id).toBeGreaterThan(0);
        expect(layer.gain, id).toBeGreaterThan(0);
      }
    }
  });

  it('keeps repeated soft drop concise while Survival warnings remain two bounded pulses', () => {
    expect(gestureDuration(audioCue('soft-drop'))).toBeLessThan(0.1);
    expect(cueEnergy('soft-drop')).toBeLessThan(cueEnergy('stone-land'));
    expect(audioCue('stone-warning').layers).toHaveLength(2);
    expect(gestureDuration(audioCue('stone-warning'))).toBeLessThan(0.3);
  });

  it('gives each remaining Mutation a unique one-shot fingerprint', () => {
    const mutationIds = [
      'supergravity', 'bomb', 'multiplier-2', 'multiplier-4',
    ] satisfies LegacyAudioCueId[];
    const signatures = mutationIds.map((id) => audioCue(id).layers.map((layer) => (
      layer.kind === 'procedural'
        ? `${layer.instrument}:${layer.frequency}:${layer.endFrequency}:${layer.seed}`
        : layer.kind
    )).join('|'));
    expect(new Set(signatures).size).toBe(mutationIds.length);
    for (const id of mutationIds) {
      expect(audioCue(id).mutationOwned).toBe(true);
      expect(gestureDuration(audioCue(id)), id).toBeLessThan(0.8);
    }
  });

  it('keeps all reward, Puzzle, Survival, and UI extension events represented', () => {
    const expected = [
      'soft-drop', 'puzzle-undo',
      'bedrock-rise', 'bedrock-lower', 'stone-warning', 'stone-spawn', 'stone-land',
      'level-up', 'finished', 'game-over', 'pause', 'resume',
      'supergravity', 'bomb', 'multiplier-2', 'multiplier-4',
    ] satisfies LegacyAudioCueId[];
    expect(AUDIO_CUE_IDS).toEqual(expected);
  });
});
