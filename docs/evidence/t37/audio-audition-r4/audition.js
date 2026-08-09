const PROFILE_NAMES = Object.freeze({
  accepted: 'Accepted · Studio',
  soft: 'Soft · 圆润动作触感',
  'ice-frost': 'Ice 1 · 霜封',
  'ice-layered': 'Ice 2 · 霜封 + 碎片',
  'ice-balanced': 'Ice 3 · 柔碎冰基线',
})

const ACCEPTED_CONTRACT = Object.freeze({
  clear: {
    asset: './assets/accepted-studio/progress-step.ogg',
    onePulsePerRow: true,
    fourLinePulseTimesMs: [0, 60, 120, 180],
    fourLineResolveCue: null,
    rate: 1.18,
    maxDurationSeconds: 0.2,
  },
  countdown: {
    stepAsset: './assets/accepted-studio/progress-step.ogg',
    resolveAsset: './assets/accepted-studio/start.ogg',
    stepTimesMs: [0, 500, 1000],
    resolveAtMs: 1500,
  },
})

const RECIPES = Object.freeze({
  moveLeft: {
    label: '左移',
    asset: './assets/soft/back.ogg',
    rate: 1,
    maxDuration: 0.16,
    lowpassHz: 2600,
    filterQ: 0.65,
    attackMs: 12,
    releaseMs: 18,
    targetPeak: 0.5,
  },
  moveRight: {
    label: '右移',
    asset: './assets/soft/forward.ogg',
    rate: 1,
    maxDuration: 0.16,
    lowpassHz: 2600,
    filterQ: 0.65,
    attackMs: 12,
    releaseMs: 18,
    targetPeak: 0.5,
  },
  rotate: {
    label: '旋转',
    asset: './assets/soft/reorder.ogg',
    rate: 1.05,
    maxDuration: 0.3,
    lowpassHz: 2300,
    filterQ: 0.65,
    attackMs: 16,
    releaseMs: 24,
    targetPeak: 0.57,
  },
  lock: {
    label: '自然落位',
    asset: './assets/soft/lock.ogg',
    rate: 0.92,
    maxDuration: 0.3,
    lowpassHz: 1900,
    filterQ: 0.65,
    attackMs: 18,
    releaseMs: 28,
    targetPeak: 0.61,
  },
  hardDrop: {
    label: '硬降',
    asset: './assets/soft/drop.ogg',
    rate: 0.88,
    maxDuration: 0.34,
    lowpassHz: 1600,
    filterQ: 0.65,
    bodyHz: 160,
    bodyDb: 2.5,
    bodyQ: 0.8,
    attackMs: 14,
    releaseMs: 36,
    targetPeak: 0.7,
  },
  iceFrost: {
    label: '霜封主体',
    asset: './assets/ice/freeze.wav',
    offset: 0.69,
    rate: 1,
    maxDuration: 0.45,
    highpassHz: 100,
    highShelfHz: 5000,
    highShelfDb: -2,
    lowpassHz: 8500,
    filterQ: 0.707,
    attackMs: 20,
    releaseMs: 95,
    targetPeak: 0.56,
    compressor: { threshold: -16, knee: 16, ratio: 2.5, attack: 0.003, release: 0.11 },
  },
  iceLayered: {
    label: '霜封 + 碎片',
    asset: './assets/ice/freeze-shard-composite.wav',
    offset: 0,
    rate: 1,
    maxDuration: 0.58,
    lowpassHz: 8500,
    filterQ: 0.707,
    attackMs: 10,
    releaseMs: 50,
    targetPeak: 0.6,
    bakedInternalAttackMs: 24,
    bakedShardAtMs: 250,
    bakedReleasePeakMs: 327,
  },
  iceBalanced: {
    label: '柔碎冰基线',
    asset: './assets/ice/ledas-luzta-4.ogg',
    offset: 0.025,
    rate: 0.83,
    maxDuration: 0.596,
    highpassHz: 100,
    highShelfHz: 4200,
    highShelfDb: -5,
    lowpassHz: 7000,
    filterQ: 0.707,
    attackMs: 14,
    releaseMs: 110,
    targetPeak: 0.63,
    compressor: { threshold: -18, knee: 18, ratio: 3.5, attack: 0.001, release: 0.1 },
  },
})

const ICE_CANDIDATES = Object.freeze([
  {
    id: 'ice-frost',
    number: '1',
    title: '霜封主体',
    description: '更像冷气迅速包裹方块，晶体冲击最少；重点判断它是否有足够的冻结确认感。',
    source: 'OpenGameArt · Freeze Spell · artisticdude',
    recipe: 'iceFrost',
  },
  {
    id: 'ice-layered',
    number: '2',
    title: '霜封 + 碎片',
    description: '先用低比例霜气包裹，250 ms 引入碎片层，主释放落在约 327 ms；完整对应冻结过程。',
    source: 'OpenGameArt · Freeze Spell + IceShatters #4 · 离线合成',
    recipe: 'iceLayered',
  },
  {
    id: 'ice-balanced',
    number: '3',
    title: '柔碎冰基线',
    description: '85 ms 结霜、约 320 ms 碎片释放；降调并压住高架频段，反馈最直接。',
    source: 'OpenGameArt · IceShatters · IgnasD · #4',
    recipe: 'iceBalanced',
  },
])

const ASSET_PATHS = [...new Set([
  ACCEPTED_CONTRACT.clear.asset,
  ACCEPTED_CONTRACT.countdown.resolveAsset,
  ...Object.values(RECIPES).map(({ asset }) => asset),
])]

const EMBEDDED_ASSETS = window.__T37_R4_EMBEDDED_AUDIO__ ?? {}
const elements = {
  loadStatus: document.querySelector('#load-status'),
  volume: document.querySelector('#volume'),
  volumeValue: document.querySelector('#volume-value'),
  stopAll: document.querySelector('#stop-all'),
  stage: document.querySelector('#stage'),
  stageProfile: document.querySelector('#stage-profile'),
  stageEvent: document.querySelector('#stage-event'),
  stageDetail: document.querySelector('#stage-detail'),
  stageSpec: document.querySelector('#stage-spec'),
  piece: document.querySelector('#piece'),
  clearRows: [...document.querySelectorAll('#clear-rows span')],
  impactRing: document.querySelector('#impact-ring'),
  countdown: document.querySelector('#countdown'),
  iceField: document.querySelector('#ice-field'),
  iceCandidates: document.querySelector('#ice-candidates'),
}

const state = {
  ready: false,
  playbackMode: 'buffer',
  currentProfile: null,
  currentAction: null,
  currentRecipe: null,
  volume: Number(elements.volume.value) / 100,
  error: null,
}

let audioContext = null
let masterGain = null
let safetyCompressor = null
const buffers = new Map()
const sourceMetrics = new Map()
const recipeMetrics = new Map()
const recipeCalibration = new Map()
const activeVoices = new Set()
const groupedVoices = new Map()
const actionTimers = new Set()

function renderIceCandidates() {
  elements.iceCandidates.innerHTML = ICE_CANDIDATES.map((candidate) => `
    <article class="ice-card">
      <span class="ice-number">ICE ${candidate.number}</span>
      <h3>${candidate.title}</h3>
      <p>${candidate.description}</p>
      <span class="ice-source">${candidate.source}</span>
      <button class="primary-action" type="button" data-profile="${candidate.id}" data-action="ice" disabled>
        试听冰冻 ${candidate.number}
      </button>
    </article>
  `).join('')
}

function createAudioGraph() {
  if (audioContext) return audioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) throw new Error('当前浏览器不支持 Web Audio API。')
  audioContext = new AudioContextClass()
  safetyCompressor = audioContext.createDynamicsCompressor()
  safetyCompressor.threshold.value = -4
  safetyCompressor.knee.value = 8
  safetyCompressor.ratio.value = 3
  safetyCompressor.attack.value = 0.008
  safetyCompressor.release.value = 0.16
  masterGain = audioContext.createGain()
  masterGain.gain.value = state.volume
  safetyCompressor.connect(masterGain)
  masterGain.connect(audioContext.destination)
  return audioContext
}

function analyzeAudioBuffer(buffer) {
  let peak = 0
  let sumSquares = 0
  let sampleCount = 0
  let finite = true
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex)
    for (let index = 0; index < channel.length; index += 1) {
      const sample = channel[index]
      if (!Number.isFinite(sample)) finite = false
      peak = Math.max(peak, Math.abs(sample))
      sumSquares += sample * sample
      sampleCount += 1
    }
  }
  return {
    channels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
    durationSeconds: Number(buffer.duration.toFixed(6)),
    peak: Number(peak.toFixed(7)),
    rms: Number(Math.sqrt(sumSquares / Math.max(1, sampleCount)).toFixed(7)),
    finite,
  }
}

function recipeDuration(recipe, buffer) {
  const offset = recipe.offset ?? 0
  const available = Math.max(0.01, (buffer.duration - offset) / recipe.rate)
  return Math.min(recipe.maxDuration, available)
}

function connectRecipeChain(context, source, recipe, envelope, destination) {
  let lastNode = source
  if (recipe.highpassHz) {
    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = recipe.highpassHz
    highpass.Q.value = 0.707
    lastNode.connect(highpass)
    lastNode = highpass
  }
  if (recipe.highShelfHz) {
    const shelf = context.createBiquadFilter()
    shelf.type = 'highshelf'
    shelf.frequency.value = recipe.highShelfHz
    shelf.gain.value = recipe.highShelfDb
    lastNode.connect(shelf)
    lastNode = shelf
  }
  const lowpass = context.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = recipe.lowpassHz
  lowpass.Q.value = recipe.filterQ
  lastNode.connect(lowpass)
  lastNode = lowpass
  if (recipe.bodyHz) {
    const body = context.createBiquadFilter()
    body.type = 'peaking'
    body.frequency.value = recipe.bodyHz
    body.Q.value = recipe.bodyQ
    body.gain.value = recipe.bodyDb
    lastNode.connect(body)
    lastNode = body
  }
  if (recipe.compressor) {
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = recipe.compressor.threshold
    compressor.knee.value = recipe.compressor.knee
    compressor.ratio.value = recipe.compressor.ratio
    compressor.attack.value = recipe.compressor.attack
    compressor.release.value = recipe.compressor.release
    lastNode.connect(compressor)
    lastNode = compressor
  }
  lastNode.connect(envelope)
  envelope.connect(destination)
}

function applyEnvelope(gainParam, startAt, duration, recipe, level) {
  const attack = Math.min(recipe.attackMs / 1000, duration * 0.32)
  const release = Math.min(recipe.releaseMs / 1000, duration * 0.42)
  const endAt = startAt + duration
  gainParam.setValueAtTime(0.0001, startAt)
  gainParam.linearRampToValueAtTime(level, startAt + attack)
  gainParam.setValueAtTime(level, Math.max(startAt + attack, endAt - release))
  gainParam.linearRampToValueAtTime(0.0001, endAt)
}

async function calibrateRecipe(key, recipe) {
  const buffer = buffers.get(recipe.asset)
  if (!buffer) throw new Error(`校准缺少音频：${recipe.asset}`)
  const duration = recipeDuration(recipe, buffer)
  const sampleRate = 48000
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels))
  const offline = new OfflineAudioContext(channels, Math.ceil((duration + 0.02) * sampleRate), sampleRate)
  const source = offline.createBufferSource()
  const envelope = offline.createGain()
  source.buffer = buffer
  source.playbackRate.value = recipe.rate
  applyEnvelope(envelope.gain, 0, duration, recipe, 1)
  connectRecipeChain(offline, source, recipe, envelope, offline.destination)
  source.start(0, recipe.offset ?? 0)
  source.stop(duration)
  const rendered = await offline.startRendering()
  const unscaled = analyzeAudioBuffer(rendered)
  if (!unscaled.finite || unscaled.peak <= 0.0001) throw new Error(`${key} 滤波后无有效信号。`)
  const makeup = Math.min(8, recipe.targetPeak / unscaled.peak)
  const metric = {
    ...unscaled,
    peak: Number((unscaled.peak * makeup).toFixed(7)),
    rms: Number((unscaled.rms * makeup).toFixed(7)),
    durationSeconds: Number(duration.toFixed(6)),
    makeup: Number(makeup.toFixed(6)),
    targetPeak: recipe.targetPeak,
  }
  recipeCalibration.set(key, makeup)
  recipeMetrics.set(key, metric)
}

async function readAsset(path) {
  if (window.location.protocol === 'file:') {
    const base64 = EMBEDDED_ASSETS[path]
    if (!base64) throw new Error(`${path}: 缺少内嵌音频`)
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    state.playbackMode = 'embedded-buffer'
    return bytes.buffer
  }
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return await response.arrayBuffer()
}

async function loadAssets() {
  const context = createAudioGraph()
  try {
    let loaded = 0
    for (const path of ASSET_PATHS) {
      const encoded = await readAsset(path)
      const buffer = await context.decodeAudioData(encoded.slice(0))
      buffers.set(path, buffer)
      sourceMetrics.set(path, analyzeAudioBuffer(buffer))
      loaded += 1
      elements.loadStatus.textContent = `正在解码 ${loaded} / ${ASSET_PATHS.length}…`
    }
    let calibrated = 0
    for (const [key, recipe] of Object.entries(RECIPES)) {
      await calibrateRecipe(key, recipe)
      calibrated += 1
      elements.loadStatus.textContent = `正在校准 ${calibrated} / ${Object.keys(RECIPES).length}…`
    }
    markReady(`${ASSET_PATHS.length} 个来源已解码，${Object.keys(RECIPES).length} 个处理配方已按滤波后峰值校准。`)
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error)
    elements.loadStatus.textContent = `载入失败：${state.error}`
    elements.loadStatus.classList.add('error')
    window.__AUDITION_READY__ = false
    throw error
  }
}

function markReady(message) {
  state.ready = true
  elements.loadStatus.textContent = message
  elements.loadStatus.classList.add('ready')
  document.querySelectorAll('[data-action]').forEach((button) => { button.disabled = false })
  window.__AUDITION_READY__ = true
  window.dispatchEvent(new CustomEvent('audition-ready'))
}

async function unlockAudio() {
  const context = createAudioGraph()
  if (context.state !== 'running') await context.resume()
}

function removeVoice(voice) {
  activeVoices.delete(voice)
  const voices = groupedVoices.get(voice.group)
  voices?.delete(voice)
  if (voices?.size === 0) groupedVoices.delete(voice.group)
}

function releaseVoice(voice, releaseMs = 16) {
  if (voice.released) return
  voice.released = true
  const now = audioContext?.currentTime ?? 0
  if (voice.startAt > now + 0.01) {
    try { voice.source.stop() } catch { /* already stopped */ }
    return
  }
  const endAt = now + releaseMs / 1000
  if (typeof voice.envelope.gain.cancelAndHoldAtTime === 'function') {
    voice.envelope.gain.cancelAndHoldAtTime(now)
  } else {
    voice.envelope.gain.cancelScheduledValues(now)
    voice.envelope.gain.setValueAtTime(Math.max(0.0001, voice.envelope.gain.value), now)
  }
  voice.envelope.gain.linearRampToValueAtTime(0.0001, endAt)
  try { voice.source.stop(endAt + 0.004) } catch { /* already stopped */ }
}

function releaseGroup(group, releaseMs = 16) {
  for (const voice of groupedVoices.get(group) ?? []) releaseVoice(voice, releaseMs)
}

function releaseAll(releaseMs = 20) {
  for (const voice of activeVoices) releaseVoice(voice, releaseMs)
}

function playRecipe(key, options = {}) {
  const recipe = RECIPES[key]
  if (!recipe) throw new Error(`未知处理配方：${key}`)
  const context = createAudioGraph()
  const buffer = buffers.get(recipe.asset)
  if (!buffer) throw new Error(`尚未载入音频：${recipe.asset}`)
  const {
    delayMs = 0,
    group = key,
    replaceGroup = false,
    replacementReleaseMs = 16,
  } = options
  if (replaceGroup) releaseGroup(group, replacementReleaseMs)

  const source = context.createBufferSource()
  const envelope = context.createGain()
  const panner = context.createStereoPanner()
  const startAt = context.currentTime + delayMs / 1000
  const duration = recipeDuration(recipe, buffer)
  const endAt = startAt + duration
  const makeup = recipeCalibration.get(key)
  if (!makeup) throw new Error(`${key} 尚未完成音量校准。`)
  source.buffer = buffer
  source.playbackRate.value = recipe.rate
  panner.pan.value = 0
  applyEnvelope(envelope.gain, startAt, duration, recipe, makeup)
  connectRecipeChain(context, source, recipe, envelope, panner)
  panner.connect(safetyCompressor)

  const voice = { source, envelope, panner, group, startAt, released: false }
  activeVoices.add(voice)
  const groupVoices = groupedVoices.get(group) ?? new Set()
  groupVoices.add(voice)
  groupedVoices.set(group, groupVoices)
  source.addEventListener('ended', () => {
    removeVoice(voice)
    try { source.disconnect(); envelope.disconnect(); panner.disconnect() } catch { /* disconnected */ }
  }, { once: true })
  source.start(startAt, recipe.offset ?? 0)
  source.stop(endAt + 0.006)
  return voice
}

function sourceTargetGain(path, targetPeak) {
  const metric = sourceMetrics.get(path)
  if (!metric || metric.peak <= 0) return 1
  return Math.min(3, targetPeak / metric.peak)
}

function playAcceptedAsset(path, options = {}) {
  const context = createAudioGraph()
  const buffer = buffers.get(path)
  if (!buffer) throw new Error(`尚未载入音频：${path}`)
  const {
    delayMs = 0,
    targetPeak = 0.54,
    rate = 1,
    pan = 0,
    maxDuration = buffer.duration,
    group = 'accepted',
  } = options
  const source = context.createBufferSource()
  const envelope = context.createGain()
  const panner = context.createStereoPanner()
  const startAt = context.currentTime + delayMs / 1000
  const duration = Math.min(buffer.duration / rate, maxDuration)
  const endAt = startAt + duration
  const level = sourceTargetGain(path, targetPeak)
  source.buffer = buffer
  source.playbackRate.value = rate
  panner.pan.value = pan
  envelope.gain.setValueAtTime(0.0001, startAt)
  envelope.gain.linearRampToValueAtTime(level, startAt + Math.min(0.004, duration * 0.1))
  envelope.gain.setValueAtTime(level, Math.max(startAt, endAt - Math.min(0.024, duration * 0.18)))
  envelope.gain.linearRampToValueAtTime(0.0001, endAt)
  source.connect(panner)
  panner.connect(envelope)
  envelope.connect(safetyCompressor)
  const voice = { source, envelope, panner, group, startAt, released: false }
  activeVoices.add(voice)
  const voices = groupedVoices.get(group) ?? new Set()
  voices.add(voice)
  groupedVoices.set(group, voices)
  source.addEventListener('ended', () => {
    removeVoice(voice)
    try { source.disconnect(); panner.disconnect(); envelope.disconnect() } catch { /* disconnected */ }
  }, { once: true })
  source.start(startAt)
  source.stop(endAt + 0.006)
}

function schedule(callback, delayMs) {
  const timer = window.setTimeout(() => {
    actionTimers.delete(timer)
    callback()
  }, delayMs)
  actionTimers.add(timer)
  return timer
}

function clearTimers() {
  for (const timer of actionTimers) window.clearTimeout(timer)
  actionTimers.clear()
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function cancelVisuals() {
  elements.piece.getAnimations().forEach((animation) => animation.cancel())
  elements.stage.classList.remove('is-ice')
  elements.clearRows.forEach((row) => row.classList.remove('is-clearing'))
  elements.impactRing.classList.remove('is-active')
  elements.countdown.classList.remove('is-active')
  elements.countdown.textContent = ''
  elements.iceField.classList.remove('is-active')
}

function setStage(profile, action, detail, recipeKey = null) {
  state.currentProfile = profile
  state.currentAction = action
  state.currentRecipe = recipeKey
  elements.stageProfile.textContent = PROFILE_NAMES[profile] ?? profile
  elements.stageEvent.textContent = action
  elements.stageDetail.textContent = detail
  if (!recipeKey) {
    elements.stageSpec.textContent = profile === 'accepted' ? '已冻结配方 · 不参与本轮重新选择' : ''
    return
  }
  const recipe = RECIPES[recipeKey]
  const metric = recipeMetrics.get(recipeKey)
  const attackLabel = recipe.bakedInternalAttackMs
    ? `内部 ${recipe.bakedInternalAttackMs}/${recipe.attackMs} ms`
    : `${recipe.attackMs} ms`
  elements.stageSpec.textContent = `起音 ${attackLabel} · 低通 ${Number(recipe.lowpassHz / 1000).toFixed(1)} kHz · 滤波后峰值 ${metric?.peak.toFixed(2) ?? '—'}`
}

function animatePiece(kind) {
  elements.piece.getAnimations().forEach((animation) => animation.cancel())
  const base = 'translate(-50%, -50%)'
  const keyframes = {
    left: [
      { transform: `${base} translateX(0)` },
      { transform: `${base} translateX(-17px)`, offset: 0.76 },
      { transform: `${base} translateX(-16px)` },
    ],
    right: [
      { transform: `${base} translateX(0)` },
      { transform: `${base} translateX(17px)`, offset: 0.76 },
      { transform: `${base} translateX(16px)` },
    ],
    rotate: [
      { transform: `${base} rotate(0deg)` },
      { transform: `${base} rotate(92deg)`, offset: 0.82 },
      { transform: `${base} rotate(90deg)` },
    ],
    lock: [
      { transform: `${base} translateY(-7px) scale(1.01)` },
      { transform: `${base} translateY(0) scale(0.985)`, offset: 0.78 },
      { transform: `${base} translateY(0) scale(1)` },
    ],
    drop: [
      { transform: `${base} translateY(-62px) scaleY(0.985)` },
      { transform: `${base} translateY(0) scaleY(1.025)`, offset: 0.8 },
      { transform: `${base} translateY(0) scaleY(1)` },
    ],
  }
  const duration = reducedMotion() ? 1 : kind === 'drop' ? 170 : kind === 'rotate' ? 130 : kind === 'lock' ? 145 : 110
  elements.piece.animate(keyframes[kind], { duration, easing: 'cubic-bezier(0.22, 0.72, 0.24, 1)' })
  if (kind === 'drop' || kind === 'lock') {
    elements.impactRing.classList.remove('is-active')
    void elements.impactRing.offsetWidth
    elements.impactRing.classList.add('is-active')
  }
}

function animateClear(lines) {
  elements.clearRows.forEach((row) => row.classList.remove('is-clearing'))
  const selected = elements.clearRows.slice(-lines)
  selected.forEach((row, index) => {
    schedule(() => {
      row.classList.remove('is-clearing')
      void row.offsetWidth
      row.classList.add('is-clearing')
    }, reducedMotion() ? 0 : index * 60)
  })
}

function showCountdown(value) {
  elements.countdown.classList.remove('is-active')
  elements.countdown.textContent = value
  void elements.countdown.offsetWidth
  elements.countdown.classList.add('is-active')
}

function animateIce() {
  elements.stage.classList.add('is-ice')
  elements.iceField.classList.remove('is-active')
  void elements.iceField.offsetWidth
  elements.iceField.classList.add('is-active')
  elements.piece.animate([
    { transform: 'translate(-50%, -50%) scale(1)', filter: 'brightness(1)' },
    { transform: 'translate(-50%, -50%) scale(1.035)', filter: 'brightness(1.42)', offset: 0.36 },
    { transform: 'translate(-50%, -50%) scale(0.995)', filter: 'brightness(1.1)' },
  ], { duration: reducedMotion() ? 1 : 420, easing: 'cubic-bezier(0.2, 0.72, 0.22, 1)' })
  schedule(() => elements.stage.classList.remove('is-ice'), reducedMotion() ? 20 : 480)
}

function playMove(direction) {
  const key = direction < 0 ? 'moveLeft' : 'moveRight'
  setStage('soft', RECIPES[key].label, '方向声音与 56 ms 横向位移一致；旧声以 12 ms 退出，不硬切。', key)
  animatePiece(direction < 0 ? 'left' : 'right')
  playRecipe(key, { group: 'move', replaceGroup: true, replacementReleaseMs: 12 })
}

function playRotate() {
  setStage('soft', '旋转', '三段下降卡榫绑定转向结束，音高不再被上版高倍加速抬升。', 'rotate')
  animatePiece('rotate')
  playRecipe('rotate', { group: 'action', replaceGroup: true, replacementReleaseMs: 18 })
}

function playLock() {
  setStage('soft', '自然落位', '低频两段接触确认；强度低于硬降，尾部柔和退出。', 'lock')
  animatePiece('lock')
  playRecipe('lock', { group: 'contact', replaceGroup: true, replacementReleaseMs: 20 })
}

function playHardDrop() {
  setStage('soft', '硬降', '下降轮廓与 160 Hz 宽体感绑定快速接触；比自然落位更强但不做尖击。', 'hardDrop')
  animatePiece('drop')
  playRecipe('hardDrop', { group: 'contact', replaceGroup: true, replacementReleaseMs: 20 })
}

function playClearFour() {
  releaseGroup('accepted', 14)
  setStage('accepted', '消除 4 行', '沿用已接受的消行声纹，0 / 60 / 120 / 180 ms 共四次；没有 complete 尾音。')
  animateClear(4)
  ACCEPTED_CONTRACT.clear.fourLinePulseTimesMs.forEach((delayMs, index) => {
    playAcceptedAsset(ACCEPTED_CONTRACT.clear.asset, {
      delayMs,
      targetPeak: 0.54,
      rate: 1.18,
      maxDuration: 0.2,
      pan: -0.35 + (0.7 * index) / 3,
      group: 'accepted',
    })
  })
}

function playCountdown() {
  releaseGroup('accepted', 14)
  setStage('accepted', '3 · 2 · 1', '完整保留已接受的三个步骤与 GO 释放音。')
  ;['3', '2', '1'].forEach((value, index) => {
    schedule(() => showCountdown(value), index * 500)
    playAcceptedAsset(ACCEPTED_CONTRACT.countdown.stepAsset, {
      delayMs: index * 500,
      targetPeak: 0.56 + index * 0.035,
      rate: 1.04 + index * 0.04,
      maxDuration: 0.22,
      group: 'accepted',
    })
  })
  schedule(() => showCountdown('GO'), 1500)
  playAcceptedAsset(ACCEPTED_CONTRACT.countdown.resolveAsset, {
    delayMs: 1500,
    targetPeak: 0.72,
    rate: 1.08,
    maxDuration: 0.42,
    group: 'accepted',
  })
}

function playIce(profile) {
  const candidate = ICE_CANDIDATES.find(({ id }) => id === profile)
  if (!candidate) throw new Error(`未知冰冻候选：${profile}`)
  releaseGroup('ice', 22)
  setStage(profile, '冰冻激活', `${candidate.title}：声音主反馈与冰晶封锁 / 碎片释放同步。`, candidate.recipe)
  animateIce()
  playRecipe(candidate.recipe, { group: 'ice', replaceGroup: true, replacementReleaseMs: 22 })
}

function playRepeat() {
  clearTimers()
  releaseGroup('move', 12)
  setStage('soft', '连续移动 × 12', '95 ms 间隔交替左右；专门检查重复疲劳、点击与音量。', 'moveLeft')
  for (let index = 0; index < 12; index += 1) {
    schedule(() => playMove(index % 2 === 0 ? -1 : 1), index * 95)
  }
  schedule(() => setStage('soft', '连续移动完成', '重点判断：是否仍尖、是否太轻、是否像页面导航而不像方块位移。', 'moveLeft'), 1240)
}

function playShowcase() {
  stopAll(false)
  const sequence = [
    [0, () => playMove(-1)],
    [330, () => playMove(1)],
    [700, playRotate],
    [1160, playLock],
    [1690, playHardDrop],
  ]
  sequence.forEach(([delayMs, action]) => schedule(action, delayMs))
}

async function performAction(profile, action) {
  if (!state.ready) return
  await unlockAudio()
  if (!['repeat', 'showcase'].includes(action)) clearTimers()
  cancelVisuals()
  if (profile === 'accepted' && action === 'clear-4') playClearFour()
  else if (profile === 'accepted' && action === 'countdown') playCountdown()
  else if (profile === 'soft' && action === 'move-left') playMove(-1)
  else if (profile === 'soft' && action === 'move-right') playMove(1)
  else if (profile === 'soft' && action === 'rotate') playRotate()
  else if (profile === 'soft' && action === 'lock') playLock()
  else if (profile === 'soft' && action === 'hard-drop') playHardDrop()
  else if (profile === 'soft' && action === 'repeat') playRepeat()
  else if (profile === 'soft' && action === 'showcase') playShowcase()
  else if (action === 'ice') playIce(profile)
}

function stopAll(updateStage = true) {
  clearTimers()
  releaseAll(20)
  cancelVisuals()
  if (updateStage) setStage('soft', '已停止', '所有声音以 20 ms 淡出，避免停止动作自身产生点击。')
}

elements.volume.addEventListener('input', () => {
  state.volume = Number(elements.volume.value) / 100
  elements.volumeValue.textContent = `${elements.volume.value}%`
  if (masterGain && audioContext) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime)
    masterGain.gain.linearRampToValueAtTime(state.volume, audioContext.currentTime + 0.025)
  }
})

elements.stopAll.addEventListener('click', () => stopAll(true))
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-profile][data-action]')
  if (!button || button.disabled) return
  performAction(button.dataset.profile, button.dataset.action).catch((error) => {
    state.error = error instanceof Error ? error.message : String(error)
    elements.loadStatus.textContent = `播放失败：${state.error}`
    elements.loadStatus.classList.add('error')
  })
})

window.render_game_to_text = () => JSON.stringify({
  ready: state.ready,
  playbackMode: state.playbackMode,
  currentProfile: state.currentProfile,
  currentAction: state.currentAction,
  currentRecipe: state.currentRecipe,
  volumePercent: Math.round(state.volume * 100),
  accepted: ACCEPTED_CONTRACT,
  actionRecipes: Object.fromEntries(['moveLeft', 'moveRight', 'rotate', 'lock', 'hardDrop'].map((key) => [key, RECIPES[key]])),
  iceCandidates: ICE_CANDIDATES,
  error: state.error,
})

window.advanceTime = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))
window.__AUDITION_API__ = Object.freeze({
  getReport: () => ({
    ready: state.ready,
    playbackMode: state.playbackMode,
    assetCount: ASSET_PATHS.length,
    recipeCount: Object.keys(RECIPES).length,
    accepted: ACCEPTED_CONTRACT,
    recipes: RECIPES,
    sourceMetrics: Object.fromEntries(sourceMetrics),
    recipeMetrics: Object.fromEntries(recipeMetrics),
  }),
  stopAll,
})

renderIceCandidates()
document.querySelectorAll('[data-action]').forEach((button) => { button.disabled = true })
loadAssets()
