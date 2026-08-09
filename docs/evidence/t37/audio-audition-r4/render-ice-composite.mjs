import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = dirname(fileURLToPath(import.meta.url))
const freezeBytes = await readFile(join(ROOT, 'assets', 'ice', 'freeze.wav'))
const shatterBytes = await readFile(join(ROOT, 'assets', 'ice', 'ledas-luzta-4.ogg'))

let browser
try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const result = await page.evaluate(async ({ freezeBase64, shatterBase64 }) => {
    const fromBase64 = (base64) => {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
      return bytes.buffer
    }
    const decoder = new AudioContext()
    const freeze = await decoder.decodeAudioData(fromBase64(freezeBase64))
    const shatter = await decoder.decodeAudioData(fromBase64(shatterBase64))
    await decoder.close()

    const sampleRate = 48000
    const duration = 0.58
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate)

    const connectLayer = ({
      buffer,
      startAt,
      offset,
      sourceDuration,
      attack,
      release,
      level,
      highpass,
      shelfHz,
      shelfDb,
      lowpass,
      compressor,
    }) => {
      const source = offline.createBufferSource()
      const hp = offline.createBiquadFilter()
      const shelf = offline.createBiquadFilter()
      const lp = offline.createBiquadFilter()
      const dynamics = offline.createDynamicsCompressor()
      const gain = offline.createGain()
      source.buffer = buffer
      hp.type = 'highpass'
      hp.frequency.value = highpass
      hp.Q.value = 0.707
      shelf.type = 'highshelf'
      shelf.frequency.value = shelfHz
      shelf.gain.value = shelfDb
      lp.type = 'lowpass'
      lp.frequency.value = lowpass
      lp.Q.value = 0.707
      dynamics.threshold.value = compressor.threshold
      dynamics.knee.value = compressor.knee
      dynamics.ratio.value = compressor.ratio
      dynamics.attack.value = compressor.attack
      dynamics.release.value = compressor.release
      const endAt = startAt + sourceDuration
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.linearRampToValueAtTime(level, startAt + attack)
      gain.gain.setValueAtTime(level, endAt - release)
      gain.gain.linearRampToValueAtTime(0.0001, endAt)
      source.connect(hp)
      hp.connect(shelf)
      shelf.connect(lp)
      lp.connect(dynamics)
      dynamics.connect(gain)
      gain.connect(offline.destination)
      source.start(startAt, offset)
      source.stop(endAt)
    }

    connectLayer({
      buffer: freeze,
      startAt: 0,
      offset: 0.48,
      sourceDuration: 0.32,
      attack: 0.024,
      release: 0.07,
      level: 0.55,
      highpass: 100,
      shelfHz: 4600,
      shelfDb: -3,
      lowpass: 7500,
      compressor: { threshold: -16, knee: 16, ratio: 2.5, attack: 0.003, release: 0.11 },
    })
    connectLayer({
      buffer: shatter,
      startAt: 0.25,
      offset: 0.22,
      sourceDuration: 0.3,
      attack: 0.01,
      release: 0.09,
      level: 0.8,
      highpass: 120,
      shelfHz: 4700,
      shelfDb: -4,
      lowpass: 7200,
      compressor: { threshold: -18, knee: 18, ratio: 3.5, attack: 0.001, release: 0.1 },
    })

    const rendered = await offline.startRendering()
    let peak = 0
    let sumSquares = 0
    let sampleCount = 0
    for (let channelIndex = 0; channelIndex < rendered.numberOfChannels; channelIndex += 1) {
      const channel = rendered.getChannelData(channelIndex)
      for (const sample of channel) {
        peak = Math.max(peak, Math.abs(sample))
        sumSquares += sample * sample
        sampleCount += 1
      }
    }
    const targetPeak = 10 ** (-8.75 / 20)
    const scale = targetPeak / Math.max(peak, 0.000001)
    const channels = Array.from({ length: rendered.numberOfChannels }, (_, channelIndex) => {
      const source = rendered.getChannelData(channelIndex)
      const output = new Float32Array(source.length)
      for (let index = 0; index < source.length; index += 1) output[index] = source[index] * scale
      return output
    })

    const frameCount = channels[0].length
    const wav = new ArrayBuffer(44 + frameCount * channels.length * 2)
    const view = new DataView(wav)
    const writeText = (offset, value) => {
      for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index))
    }
    writeText(0, 'RIFF')
    view.setUint32(4, wav.byteLength - 8, true)
    writeText(8, 'WAVE')
    writeText(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channels.length, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels.length * 2, true)
    view.setUint16(32, channels.length * 2, true)
    view.setUint16(34, 16, true)
    writeText(36, 'data')
    view.setUint32(40, frameCount * channels.length * 2, true)
    let byteOffset = 44
    for (let frame = 0; frame < frameCount; frame += 1) {
      for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
        const sample = Math.max(-1, Math.min(1, channels[channelIndex][frame]))
        view.setInt16(byteOffset, Math.round(sample * (sample < 0 ? 32768 : 32767)), true)
        byteOffset += 2
      }
    }
    const bytes = new Uint8Array(wav)
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
    }
    return {
      base64: btoa(binary),
      sourcePeak: peak,
      targetPeak,
      sourceRms: Math.sqrt(sumSquares / Math.max(1, sampleCount)),
      scale,
      duration,
      sampleRate,
    }
  }, {
    freezeBase64: freezeBytes.toString('base64'),
    shatterBase64: shatterBytes.toString('base64'),
  })
  await writeFile(join(ROOT, 'assets', 'ice', 'freeze-shard-composite.wav'), Buffer.from(result.base64, 'base64'))
  delete result.base64
  process.stdout.write(`${JSON.stringify(result)}\n`)
} finally {
  await browser?.close()
}
