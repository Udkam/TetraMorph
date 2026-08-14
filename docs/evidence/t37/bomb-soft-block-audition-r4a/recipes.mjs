export const SAMPLE_RATE = 48_000;
export const FILE_DURATION_SECONDS = 0.18;
export const VOICE_GAIN_BOOST = 1.45;
export const VOICE_GAIN_CEILING = 0.5;

const contact = ({ frequency, gain, delayMs, durationMs, attackMs, partial = null }) => Object.freeze({
  frequency,
  gain,
  delayMs,
  durationMs,
  attackMs,
  partial,
});

/**
 * R4A is intentionally sparse: fixed damped modes only. There is no noise source,
 * frequency sweep, reverb, sub layer, or imported R2/R3 material.
 */
export const R4A_RECIPES = Object.freeze({
  X: Object.freeze({
    id: 'X',
    contacts: Object.freeze([
      contact({ frequency: 196, gain: 0.082, delayMs: 0, durationMs: 146, attackMs: 11 }),
      contact({ frequency: 302.7, gain: 0.0202, delayMs: 7, durationMs: 125, attackMs: 8 }),
    ]),
  }),
  Y: Object.freeze({
    id: 'Y',
    contacts: Object.freeze([
      contact({
        frequency: 246.94,
        gain: 0.073,
        delayMs: 0,
        durationMs: 132,
        attackMs: 10,
        partial: Object.freeze({ frequency: 930, relativeDb: -14.5, durationMs: 34 }),
      }),
      contact({ frequency: 220, gain: 0.0461, delayMs: 22, durationMs: 112, attackMs: 8 }),
      contact({ frequency: 196, gain: 0.0326, delayMs: 45, durationMs: 104, attackMs: 7 }),
    ]),
  }),
  Z: Object.freeze({
    id: 'Z',
    contacts: Object.freeze([
      contact({ frequency: 174.61, gain: 0.061, delayMs: 0, durationMs: 148, attackMs: 12 }),
      contact({ frequency: 239.7, gain: 0.047, delayMs: 6, durationMs: 142, attackMs: 10 }),
      contact({ frequency: 326.9, gain: 0.031, delayMs: 13, durationMs: 135, attackMs: 8 }),
    ]),
  }),
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function dampedEnvelope(ageSeconds, durationSeconds, attackSeconds) {
  if (ageSeconds <= 0 || ageSeconds >= durationSeconds) return 0;
  const attackProgress = clamp(ageSeconds / attackSeconds, 0, 1);
  const attack = Math.sin(attackProgress * Math.PI * 0.5) ** 2;
  const decayAge = Math.max(0, ageSeconds - attackSeconds);
  const decayWindow = Math.max(0.001, durationSeconds - attackSeconds);
  const body = Math.exp(-4.9 * decayAge / decayWindow);
  const releaseStart = durationSeconds - 0.024;
  const release = ageSeconds < releaseStart
    ? 1
    : Math.cos(clamp((ageSeconds - releaseStart) / 0.024, 0, 1) * Math.PI * 0.5) ** 2;
  return attack * body * release;
}

function partialEnvelope(ageSeconds, durationSeconds, attackSeconds) {
  if (ageSeconds <= 0 || ageSeconds >= durationSeconds) return 0;
  const attack = Math.sin(clamp(ageSeconds / attackSeconds, 0, 1) * Math.PI * 0.5) ** 2;
  const release = Math.cos(clamp(ageSeconds / durationSeconds, 0, 1) * Math.PI * 0.5) ** 2;
  return attack * release * Math.exp(-2.2 * ageSeconds / durationSeconds);
}

export function validateRecipes() {
  const errors = [];
  const expected = {
    X: [196, 302.7],
    Y: [246.94, 220, 196],
    Z: [174.61, 239.7, 326.9],
  };
  for (const [id, recipe] of Object.entries(R4A_RECIPES)) {
    if (recipe.contacts.length > 3) errors.push(`${id}: more than three contact voices`);
    const frequencies = recipe.contacts.map((voice) => voice.frequency);
    if (JSON.stringify(frequencies) !== JSON.stringify(expected[id])) {
      errors.push(`${id}: contracted frequencies drifted`);
    }
    for (const voice of recipe.contacts) {
      const boosted = Math.min(VOICE_GAIN_CEILING, voice.gain * VOICE_GAIN_BOOST);
      if (!(boosted > 0 && boosted <= VOICE_GAIN_CEILING)) errors.push(`${id}: invalid boosted gain`);
      if (voice.partial) {
        if (voice.partial.frequency < 900 || voice.partial.frequency > 1_800) errors.push(`${id}: partial frequency out of bounds`);
        if (voice.partial.durationMs < 24 || voice.partial.durationMs > 45) errors.push(`${id}: partial duration out of bounds`);
        if (voice.partial.relativeDb < -18 || voice.partial.relativeDb > -14) errors.push(`${id}: partial level out of bounds`);
      }
    }
  }
  if (Math.abs(R4A_RECIPES.X.contacts[1].delayMs - 7) > 0.001) errors.push('X: stagger is not 7 ms');
  const xRatioDb = 20 * Math.log10(R4A_RECIPES.X.contacts[1].gain / R4A_RECIPES.X.contacts[0].gain);
  if (xRatioDb > -12) errors.push('X: second mode is not at least 12 dB quieter');
  const yDelays = R4A_RECIPES.Y.contacts.map((voice) => voice.delayMs);
  if (JSON.stringify(yDelays) !== '[0,22,45]') errors.push('Y: detent timing drifted');
  const yRelative = R4A_RECIPES.Y.contacts.map((voice) => 20 * Math.log10(voice.gain / R4A_RECIPES.Y.contacts[0].gain));
  if (Math.abs(yRelative[1] + 4) > 0.1 || Math.abs(yRelative[2] + 7) > 0.1) errors.push('Y: detent level spacing drifted');
  const z = R4A_RECIPES.Z.contacts.map((voice) => voice.frequency);
  if (Math.abs(z[1] / z[0] - 1.373) > 0.002 || Math.abs(z[2] / z[0] - 1.872) > 0.002) errors.push('Z: inharmonic ratios drifted');
  return errors;
}

export function renderCandidate(id) {
  const recipe = R4A_RECIPES[id];
  if (!recipe) throw new Error(`Unknown R4A candidate: ${id}`);
  const frameCount = Math.round(SAMPLE_RATE * FILE_DURATION_SECONDS);
  const output = new Float32Array(frameCount);
  for (const voice of recipe.contacts) {
    const delayFrames = Math.round(SAMPLE_RATE * voice.delayMs / 1_000);
    const durationSeconds = voice.durationMs / 1_000;
    const attackSeconds = voice.attackMs / 1_000;
    const boostedGain = Math.min(VOICE_GAIN_CEILING, voice.gain * VOICE_GAIN_BOOST);
    let bodyPhase = 0;
    let partialPhase = 0;
    const partialGain = voice.partial ? 10 ** (voice.partial.relativeDb / 20) : 0;
    for (let frame = delayFrames; frame < frameCount; frame += 1) {
      const ageSeconds = (frame - delayFrames) / SAMPLE_RATE;
      if (ageSeconds >= durationSeconds) break;
      bodyPhase += 2 * Math.PI * voice.frequency / SAMPLE_RATE;
      const body = Math.sin(bodyPhase) * dampedEnvelope(ageSeconds, durationSeconds, attackSeconds);
      let detail = 0;
      if (voice.partial && ageSeconds < voice.partial.durationMs / 1_000) {
        partialPhase += 2 * Math.PI * voice.partial.frequency / SAMPLE_RATE;
        detail = Math.sin(partialPhase + 0.37)
          * partialEnvelope(ageSeconds, voice.partial.durationMs / 1_000, Math.min(0.006, attackSeconds))
          * partialGain;
      }
      output[frame] += (body + detail) * boostedGain;
    }
  }
  output[0] = 0;
  output[output.length - 1] = 0;
  return output;
}

export function encodeMonoPcm16Wav(samples, sampleRate = SAMPLE_RATE) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = clamp(samples[index] ?? 0, -1, 1);
    buffer.writeInt16LE(Math.round(sample * (sample < 0 ? 32768 : 32767)), 44 + index * 2);
  }
  return buffer;
}
