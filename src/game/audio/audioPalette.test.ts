import { describe, expect, it } from 'vitest';
import { AUDIO_CUE_IDS, audioCue, cueEnergy, type AudioCueId } from './audioPalette';
import { gestureDuration } from './audioGesture';

describe('T37 material audition palette', () => {
  it('defines a bounded buffered recipe for every public cue', () => {
    expect(AUDIO_CUE_IDS).toHaveLength(27);
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

  it('keeps repeated controls concise and below contact cues', () => {
    for (const id of ['move', 'rotate', 'soft-drop'] satisfies AudioCueId[]) {
      expect(gestureDuration(audioCue(id)), id).toBeLessThan(0.1);
      expect(cueEnergy(id), id).toBeLessThan(cueEnergy('lock'));
    }
    expect(cueEnergy('lock')).toBeLessThan(cueEnergy('hard-drop'));
    expect(cueEnergy('hard-drop')).toBeLessThan(cueEnergy('clear-1'));
  });

  it('escalates all clear sizes by energy and temporal width', () => {
    const ids = ['clear-1', 'clear-2', 'clear-3', 'clear-4'] satisfies AudioCueId[];
    const energies = ids.map(cueEnergy);
    const durations = ids.map((id) => gestureDuration(audioCue(id)));
    expect(energies[0]).toBeLessThan(energies[1] ?? 0);
    expect(energies[1]).toBeLessThan(energies[2] ?? 0);
    expect(energies[2]).toBeLessThan(energies[3] ?? 0);
    expect(durations).toEqual([...durations].sort((left, right) => left - right));
    expect(audioCue('clear-4').layers.some((layer) => (
      layer.kind === 'procedural' && layer.instrument === 'stone'
    ))).toBe(true);
  });

  it('gives each Mutation a unique one-shot fingerprint without sustained ownership', () => {
    const mutationIds = ['freeze', 'supergravity', 'bomb', 'multiplier-2', 'multiplier-4'] satisfies AudioCueId[];
    const signatures = mutationIds.map((id) => audioCue(id).layers.map((layer) => (
      layer.kind === 'procedural'
        ? `${layer.instrument}:${layer.frequency}:${layer.endFrequency}:${layer.seed}`
        : layer.kind
    )).join('|'));
    expect(new Set(signatures).size).toBe(mutationIds.length);
    for (const id of mutationIds) {
      expect(audioCue(id).mutationOwned).toBe(true);
      expect(gestureDuration(audioCue(id)), id).toBeLessThan(0.8);
      expect(cueEnergy(id), id).toBeLessThan(cueEnergy('clear-4'));
    }
  });

  it('uses a physical core audition vocabulary without legacy electronic gestures', () => {
    const auditionIds = [
      'move', 'rotate', 'lock', 'hard-drop',
      'clear-1', 'clear-2', 'clear-3', 'clear-4',
      'countdown-tick', 'countdown-resolve', 'freeze',
    ] satisfies AudioCueId[];
    const physical = new Set([
      'soft-contact', 'wood', 'ceramic', 'stone', 'crystal-grain', 'air-brush',
    ]);
    for (const id of auditionIds) {
      expect(audioCue(id).layers.every((layer) => (
        layer.kind === 'procedural' && physical.has(layer.instrument)
      )), id).toBe(true);
    }
  });

  it('uses an exact three-beat cadence with a longer resolving final wood strike', () => {
    expect(gestureDuration(audioCue('countdown-resolve'))).toBeGreaterThan(gestureDuration(audioCue('countdown-tick')));
    expect(cueEnergy('countdown-resolve')).toBeGreaterThan(cueEnergy('countdown-tick'));
    expect(audioCue('countdown-tick').layers[0]).toMatchObject({
      kind: 'procedural', instrument: 'wood', frequency: 224,
    });
    expect(audioCue('countdown-resolve').layers[0]).toMatchObject({
      kind: 'procedural', instrument: 'wood', frequency: 196,
    });
  });
});
