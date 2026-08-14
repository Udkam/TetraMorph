export const SAMPLE_RATE = 48_000
export const RECIPE_VERSION = 'bomb-block-burst-r3-v1'
export const ACCEPTED_OUTPUT_GAIN = 0.78
export const HARD_DROP_REFERENCE = Object.freeze({
  masterGain: 1.85,
  compressor: Object.freeze({ thresholdDb: -4, kneeDb: 6 }),
  tones: Object.freeze([
    Object.freeze({ frequency: 174.61, duration: 0.072, gain: 0.1, attack: 0.006 }),
    Object.freeze({ frequency: 349.23, duration: 0.038, gain: 0.03, delay: 0.004, attack: 0.004 }),
  ]),
  voiceGainBoost: 1.45,
  voiceGainCeiling: 0.5,
})
export const CHAIN_BEAT_SECONDS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => (index + 1) * 0.056),
)

export const CANDIDATES = Object.freeze([
  Object.freeze({
    id: 'A',
    label: '软质闷崩',
    summary: '圆润块体先压下，再带出一小撮低亮度尘屑。',
    normalDuration: 0.32,
    chainDuration: 0.92,
    targetPeak: 0.50,
    seed: 0x37a11,
    tones: Object.freeze([
      Object.freeze({ waveform: 'sine', startHz: 148, endHz: 96, duration: 0.190, attack: 0.009, gain: 0.190 }),
      Object.freeze({ waveform: 'triangle', startHz: 222, endHz: 144, delay: 0.007, duration: 0.095, attack: 0.007, gain: 0.058 }),
    ]),
    noise: Object.freeze({ lowHz: 140, highHz: 850, delay: 0.004, duration: 0.115, attack: 0.010, gain: 0.066 }),
    chainBand: Object.freeze({ lowHz: 180, highHz: 760, relativeDb: -19.0 }),
  }),
  Object.freeze({
    id: 'B',
    label: '颗粒碎崩',
    summary: '更干的方块碎裂纹理，但所有颗粒仍包在一个连续声体里。',
    normalDuration: 0.34,
    chainDuration: 0.98,
    targetPeak: 0.52,
    seed: 0x37b22,
    tones: Object.freeze([
      Object.freeze({ waveform: 'triangle', startHz: 132, endHz: 84, duration: 0.220, attack: 0.010, gain: 0.170 }),
      Object.freeze({ waveform: 'sine', startHz: 198, endHz: 126, delay: 0.011, duration: 0.125, attack: 0.008, gain: 0.055 }),
    ]),
    noise: Object.freeze({ lowHz: 180, highHz: 1450, duration: 0.135, attack: 0.010, gain: 0.082, lobes: Object.freeze([0, 0.016, 0.033]) }),
    chainBand: Object.freeze({ lowHz: 240, highHz: 1320, relativeDb: -20.0 }),
  }),
  Object.freeze({
    id: 'C',
    label: '弹性卡崩',
    summary: '沿用硬降的音高血缘，像一组软质方块同时脱扣。',
    normalDuration: 0.30,
    chainDuration: 0.88,
    targetPeak: 0.48,
    seed: 0x37c33,
    tones: Object.freeze([
      Object.freeze({ waveform: 'sine', startHz: 174.61, endHz: 123.47, duration: 0.155, attack: 0.008, gain: 0.160 }),
      Object.freeze({ waveform: 'sine', startHz: 349.23, endHz: 246.94, delay: 0.005, duration: 0.072, attack: 0.005, gain: 0.038 }),
    ]),
    noise: Object.freeze({ lowHz: 260, highHz: 1800, delay: 0.010, duration: 0.105, attack: 0.012, gain: 0.052 }),
    chainBand: Object.freeze({ lowHz: 320, highHz: 1500, relativeDb: -21.0 }),
  }),
])

function seededNoise(seed) {
  let state = seed >>> 0
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) / 0x80000000) - 1
  }
}

function oscillatorSample(waveform, phase) {
  if (waveform === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase))
  return Math.sin(phase)
}

function bodyEnvelope(time, duration, attack) {
  if (time < 0 || time >= duration) return 0
  if (time < attack) {
    const progress = time / Math.max(attack, 1 / SAMPLE_RATE)
    return Math.sin(progress * Math.PI * 0.5) ** 2
  }
  const release = (time - attack) / Math.max(duration - attack, 1 / SAMPLE_RATE)
  return Math.cos(Math.min(1, release) * Math.PI * 0.5) ** 2.8
}

function mixTone(target, tone) {
  const delay = tone.delay ?? 0
  const start = Math.round(delay * SAMPLE_RATE)
  const count = Math.round(tone.duration * SAMPLE_RATE)
  let phase = 0
  for (let index = 0; index < count && start + index < target.length; index += 1) {
    const progress = index / Math.max(1, count - 1)
    const frequency = tone.startHz * ((tone.endHz / tone.startHz) ** progress)
    phase += (Math.PI * 2 * frequency) / SAMPLE_RATE
    const time = index / SAMPLE_RATE
    target[start + index] += oscillatorSample(tone.waveform, phase)
      * bodyEnvelope(time, tone.duration, tone.attack)
      * tone.gain
  }
}

function lobeEnvelope(time, lobes) {
  if (!lobes?.length) return 1
  let value = 0.34
  for (const center of lobes) {
    const distance = Math.abs(time - center)
    if (distance < 0.018) value += 0.66 * (0.5 + 0.5 * Math.cos(Math.PI * distance / 0.018))
  }
  return Math.min(1, value)
}

function bandLimitedNoise(length, seed, lowHz, highHz) {
  const output = new Float64Array(length)
  const random = seededNoise(seed)
  const highAlpha = 1 - Math.exp((-2 * Math.PI * highHz) / SAMPLE_RATE)
  const lowAlpha = 1 - Math.exp((-2 * Math.PI * lowHz) / SAMPLE_RATE)
  let highLowPassA = 0
  let highLowPassB = 0
  let lowLowPassA = 0
  let lowLowPassB = 0
  for (let index = 0; index < length; index += 1) {
    const white = random()
    highLowPassA += highAlpha * (white - highLowPassA)
    highLowPassB += highAlpha * (highLowPassA - highLowPassB)
    lowLowPassA += lowAlpha * (white - lowLowPassA)
    lowLowPassB += lowAlpha * (lowLowPassA - lowLowPassB)
    output[index] = highLowPassB - lowLowPassB
  }
  return output
}

function mixNoise(target, noise, seed) {
  const delay = noise.delay ?? 0
  const start = Math.round(delay * SAMPLE_RATE)
  const count = Math.round(noise.duration * SAMPLE_RATE)
  const band = bandLimitedNoise(count, seed, noise.lowHz, noise.highHz)
  for (let index = 0; index < count && start + index < target.length; index += 1) {
    const time = index / SAMPLE_RATE
    target[start + index] += band[index]
      * bodyEnvelope(time, noise.duration, noise.attack)
      * lobeEnvelope(time, noise.lobes)
      * noise.gain
  }
}

function peakOf(samples, start = 0, end = samples.length) {
  let peak = 0
  for (let index = start; index < Math.min(end, samples.length); index += 1) {
    peak = Math.max(peak, Math.abs(samples[index]))
  }
  return peak
}

function rmsOf(samples, start = 0, end = samples.length) {
  const boundedEnd = Math.min(end, samples.length)
  let squareSum = 0
  for (let index = start; index < boundedEnd; index += 1) squareSum += samples[index] * samples[index]
  return Math.sqrt(squareSum / Math.max(1, boundedEnd - start))
}

function scaleToPeak(samples, targetPeak) {
  const peak = peakOf(samples)
  const scale = peak > 0 ? targetPeak / peak : 1
  for (let index = 0; index < samples.length; index += 1) samples[index] *= scale
}

function propagationShape(delta) {
  if (delta < 0 || delta >= 0.072) return 0
  if (delta < 0.012) return Math.sin((delta / 0.012) * Math.PI * 0.5) ** 2
  return Math.cos(((delta - 0.012) / 0.060) * Math.PI * 0.5) ** 2
}

function exponentialRamp(startValue, endValue, progress) {
  return startValue * ((endValue / startValue) ** Math.max(0, Math.min(1, progress)))
}

export function renderHardDropReference() {
  const duration = Math.max(...HARD_DROP_REFERENCE.tones.map((tone) => (tone.delay ?? 0) + tone.duration))
  const samples = new Float64Array(Math.round(duration * SAMPLE_RATE))
  for (const tone of HARD_DROP_REFERENCE.tones) {
    const delay = tone.delay ?? 0
    const start = Math.round(delay * SAMPLE_RATE)
    const count = Math.round(tone.duration * SAMPLE_RATE)
    const peak = Math.min(
      HARD_DROP_REFERENCE.voiceGainCeiling,
      tone.gain * HARD_DROP_REFERENCE.voiceGainBoost,
    )
    for (let index = 0; index < count && start + index < samples.length; index += 1) {
      const time = index / SAMPLE_RATE
      const envelope = time <= tone.attack
        ? exponentialRamp(0.0001, peak, time / tone.attack)
        : exponentialRamp(peak, 0.0001, (time - tone.attack) / (tone.duration - tone.attack))
      samples[start + index] += Math.sin(Math.PI * 2 * tone.frequency * time)
        * envelope
        * HARD_DROP_REFERENCE.masterGain
    }
  }
  samples[0] = 0
  samples[samples.length - 1] = 0
  return samples
}

function renderNormal(candidate) {
  const samples = new Float64Array(Math.round(candidate.normalDuration * SAMPLE_RATE))
  for (const tone of candidate.tones) mixTone(samples, tone)
  mixNoise(samples, candidate.noise, candidate.seed)
  scaleToPeak(samples, candidate.targetPeak)
  samples[0] = 0
  samples[samples.length - 1] = 0
  return samples
}

function renderChain(candidate, normal) {
  const samples = new Float64Array(Math.round(candidate.chainDuration * SAMPLE_RATE))
  samples.set(normal)
  const texture = bandLimitedNoise(samples.length, candidate.seed ^ 0x5f3759df, candidate.chainBand.lowHz, candidate.chainBand.highHz)
  const envelope = new Float64Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE
    let value = 0
    for (let beatIndex = 0; beatIndex < CHAIN_BEAT_SECONDS.length; beatIndex += 1) {
      const attenuation = 10 ** ((-1.3 * beatIndex) / 20)
      value += propagationShape(time - CHAIN_BEAT_SECONDS[beatIndex]) * attenuation
    }
    envelope[index] = Math.min(1.18, value)
  }
  const firstStart = Math.round(CHAIN_BEAT_SECONDS[0] * SAMPLE_RATE)
  const firstEnd = Math.round((CHAIN_BEAT_SECONDS[0] + 0.072) * SAMPLE_RATE)
  let firstRawPeak = 0
  for (let index = firstStart; index < firstEnd; index += 1) {
    firstRawPeak = Math.max(firstRawPeak, Math.abs(texture[index] * envelope[index]))
  }
  const targetTexturePeak = candidate.targetPeak * (10 ** (candidate.chainBand.relativeDb / 20))
  const textureScale = firstRawPeak > 0 ? targetTexturePeak / firstRawPeak : 0
  for (let index = firstStart; index < samples.length; index += 1) {
    samples[index] += texture[index] * envelope[index] * textureScale
  }
  samples[0] = 0
  samples[samples.length - 1] = 0
  return samples
}

function fftEnergy(samples) {
  let size = 1
  while (size < samples.length) size *= 2
  size = Math.min(size, 65_536)
  const real = new Float64Array(size)
  const imag = new Float64Array(size)
  const count = Math.min(samples.length, size)
  for (let index = 0; index < count; index += 1) {
    const window = count > 1 ? 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (count - 1)) : 1
    real[index] = samples[index] * window
  }
  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1
    for (; reversed & bit; bit >>= 1) reversed ^= bit
    reversed ^= bit
    if (index < reversed) {
      ;[real[index], real[reversed]] = [real[reversed], real[index]]
      ;[imag[index], imag[reversed]] = [imag[reversed], imag[index]]
    }
  }
  for (let width = 2; width <= size; width *= 2) {
    const angle = (-2 * Math.PI) / width
    const stepReal = Math.cos(angle)
    const stepImag = Math.sin(angle)
    for (let offset = 0; offset < size; offset += width) {
      let twiddleReal = 1
      let twiddleImag = 0
      for (let index = 0; index < width / 2; index += 1) {
        const even = offset + index
        const odd = even + width / 2
        const oddReal = real[odd] * twiddleReal - imag[odd] * twiddleImag
        const oddImag = real[odd] * twiddleImag + imag[odd] * twiddleReal
        real[odd] = real[even] - oddReal
        imag[odd] = imag[even] - oddImag
        real[even] += oddReal
        imag[even] += oddImag
        const nextReal = twiddleReal * stepReal - twiddleImag * stepImag
        twiddleImag = twiddleReal * stepImag + twiddleImag * stepReal
        twiddleReal = nextReal
      }
    }
  }
  const bands = { under70: 0, lowMid: 0, presence: 0, high: 0 }
  let total = 0
  for (let bin = 1; bin < size / 2; bin += 1) {
    const frequency = (bin * SAMPLE_RATE) / size
    const energy = real[bin] ** 2 + imag[bin] ** 2
    total += energy
    if (frequency < 70) bands.under70 += energy
    else if (frequency < 2000) bands.lowMid += energy
    else if (frequency < 6000) bands.presence += energy
    else bands.high += energy
  }
  return Object.fromEntries(Object.entries(bands).map(([key, value]) => [key, total > 0 ? value / total : 0]))
}

export function analyzeSamples(samples) {
  let peak = 0
  let sum = 0
  let squareSum = 0
  let clippedSamples = 0
  let finiteSamples = true
  for (const sample of samples) {
    if (!Number.isFinite(sample)) finiteSamples = false
    peak = Math.max(peak, Math.abs(sample))
    sum += sample
    squareSum += sample * sample
    if (Math.abs(sample) >= 0.999) clippedSamples += 1
  }
  const rms = Math.sqrt(squareSum / Math.max(1, samples.length))
  return {
    durationSeconds: samples.length / SAMPLE_RATE,
    peak,
    rms,
    crestFactor: rms > 0 ? peak / rms : 0,
    dcOffset: sum / Math.max(1, samples.length),
    clippedSamples,
    finiteSamples,
    zeroEndpoints: samples[0] === 0 && samples[samples.length - 1] === 0,
    spectralEnergy: fftEnergy(samples),
  }
}

export function rmsForSeconds(samples, seconds) {
  return rmsOf(samples, 0, Math.round(seconds * SAMPLE_RATE))
}

export function renderCandidates() {
  return CANDIDATES.flatMap((candidate) => {
    const normal = renderNormal(candidate)
    const chain = renderChain(candidate, normal)
    return [
      { candidate, kind: 'normal', samples: normal, metrics: analyzeSamples(normal) },
      { candidate, kind: 'chain', samples: chain, metrics: analyzeSamples(chain) },
    ]
  })
}

export function encodePcm16Wav(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeText = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index))
  }
  writeText(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(44 + index * 2, Math.round(value < 0 ? value * 32768 : value * 32767), true)
  }
  return Buffer.from(buffer)
}
