import { describe, expect, it } from 'vitest';
import {
  AUDIO_CUE_IDS,
  audioCue,
  cueDuration,
  cueEnergy,
  type CandidateAudioCueId,
} from './audioPalette';
import { MUTATION_VFX_TOKENS } from '../../design/mutationTokens';

describe('T37 recovered soft support palette', () => {
  it('keeps all seventeen candidate cues bounded and separate from accepted playback', () => {
    expect(AUDIO_CUE_IDS).toHaveLength(17);
    expect(AUDIO_CUE_IDS).not.toEqual(expect.arrayContaining([
      'move', 'rotate', 'lock', 'hard-drop',
      'clear-1', 'clear-2', 'clear-3', 'clear-4',
      'countdown-tick', 'countdown-resolve', 'freeze',
    ]));
    for (const id of AUDIO_CUE_IDS) {
      const cue = audioCue(id);
      const voiceCount = cue.tones.length + (cue.air?.length ?? 0);
      expect(voiceCount, id).toBeGreaterThan(0);
      expect(voiceCount, id).toBeLessThanOrEqual(6);
      expect(cueDuration(cue), id).toBeGreaterThan(0);
      expect(cueDuration(cue), id).toBeLessThanOrEqual(0.5);
      for (const layer of cue.tones) {
        expect(Number.isFinite(layer.frequency), id).toBe(true);
        expect(Number.isFinite(layer.duration), id).toBe(true);
        expect(Number.isFinite(layer.gain), id).toBe(true);
        expect(layer.duration, id).toBeGreaterThan(0);
        expect(layer.gain, id).toBeGreaterThan(0);
        expect(layer.waveform === 'sine' || layer.waveform === 'triangle', id).toBe(true);
      }
    }
  });

  it('restores the intact T28 soft-drop, undo, and Survival contours exactly', () => {
    expect(audioCue('soft-drop').tones).toEqual([
      expect.objectContaining({
        frequency: 196, endFrequency: 185, duration: 0.036, gain: 0.078,
        attack: 0.007, waveform: 'sine',
      }),
    ]);
    expect(audioCue('endgame-undo').tones).toEqual([
      expect.objectContaining({
        frequency: 392, endFrequency: 293.66, duration: 0.09, gain: 0.095,
        attack: 0.006,
      }),
    ]);
    expect(audioCue('stone-warning').tones.map((layer) => ({
      frequency: layer.frequency,
      endFrequency: layer.endFrequency,
      delay: layer.delay ?? 0,
    }))).toEqual([
      { frequency: 392, endFrequency: 523.25, delay: 0 },
      { frequency: 523.25, endFrequency: 659.25, delay: 0.085 },
    ]);
    expect(cueDuration(audioCue('stone-warning'))).toBeCloseTo(0.155);
    expect(cueEnergy('soft-drop')).toBeLessThan(cueEnergy('stone-land'));
  });

  it('restores concise T28 UI contours while collapsing rewards into non-melodic gestures', () => {
    expect(audioCue('pause').tones.map((layer) => layer.frequency)).toEqual([293.66, 220]);
    expect(audioCue('resume').tones.map((layer) => layer.frequency)).toEqual([349.23, 523.25]);
    expect(audioCue('level-up').tones.map((layer) => layer.delay ?? 0)).toEqual([0, 0.018]);
    expect(audioCue('finished').tones.map((layer) => layer.delay ?? 0)).toEqual([0, 0.012, 0.024]);
    expect(audioCue('game-over').tones.map((layer) => ({
      frequency: layer.frequency,
      endFrequency: layer.endFrequency,
      delay: layer.delay ?? 0,
    }))).toEqual([
      { frequency: 196, endFrequency: 130.81, delay: 0 },
      { frequency: 98, endFrequency: 65.41, delay: 0.018 },
    ]);
    expect(cueDuration(audioCue('level-up'))).toBeLessThan(0.2);
    expect(cueDuration(audioCue('finished'))).toBeLessThan(0.25);
    expect(cueDuration(audioCue('game-over'))).toBeLessThan(0.3);
  });

  it('gives every remaining Mutation a distinct material-bound one-shot', () => {
    expect(audioCue('supergravity').tones.map((layer) => layer.frequency)).toEqual([148, 93]);
    const bombImpactSeconds = (
      MUTATION_VFX_TOKENS.bomb.animation.enterMs
      + MUTATION_VFX_TOKENS.bomb.animation.pulseMs
    ) / 1_000;
    expect(bombImpactSeconds).toBe(0.22);
    expect(audioCue('bomb').tones).toEqual([
      expect.objectContaining({
        frequency: 74, duration: 0.22, gain: 0.16, attack: 0.035, waveform: 'sine',
      }),
      expect.objectContaining({
        frequency: 111, endFrequency: 48, delay: bombImpactSeconds,
        duration: 0.22, gain: 0.34, attack: 0.006, waveform: 'sine',
      }),
      expect.objectContaining({
        frequency: 55, endFrequency: 42, delay: 0.235,
        duration: 0.255, gain: 0.105, attack: 0.014, waveform: 'sine',
      }),
    ]);
    expect(audioCue('bomb').air).toEqual([
      expect.objectContaining({
        cutoff: 880, q: 0.55, attack: 0.004,
        duration: 0.12, gain: 0.17, delay: bombImpactSeconds,
      }),
    ]);
    expect(cueDuration(audioCue('bomb'))).toBeCloseTo(0.49);
    expect(cueDuration(audioCue('bomb'))).toBeLessThan(
      MUTATION_VFX_TOKENS.bomb.animation.activationMs / 1_000,
    );
    expect(audioCue('multiplier-2').tones).toHaveLength(4);
    expect(audioCue('multiplier-4').tones).toHaveLength(6);
    expect(audioCue('multiplier-2').tones.map((layer) => layer.waveform)).toEqual([
      'triangle', 'sine', 'triangle', 'sine',
    ]);
    for (const id of [
      'supergravity', 'multiplier-2', 'multiplier-4',
    ] satisfies CandidateAudioCueId[]) {
      expect(audioCue(id).mutationOwned).toBe(true);
      expect(cueDuration(audioCue(id)), id).toBeLessThan(0.3);
    }
    expect(audioCue('bomb').mutationOwned).toBe(true);
    expect(audioCue('bomb-chain').mutationOwned).toBe(true);
    expect(cueDuration(audioCue('bomb-chain'))).toBeCloseTo(.49);
  });

  it('keeps all gameplay, reward, Endgame, Survival, and UI candidates represented', () => {
    const expected = [
      'soft-drop', 'endgame-undo',
      'bedrock-rise', 'bedrock-lower', 'stone-warning', 'stone-spawn', 'stone-land',
      'level-up', 'finished', 'game-over', 'pause', 'resume',
      'supergravity', 'bomb', 'bomb-chain', 'multiplier-2', 'multiplier-4',
    ] satisfies CandidateAudioCueId[];
    expect(AUDIO_CUE_IDS).toEqual(expected);
  });
});
