const FAMILIES = [
  {
    id: 'studio',
    index: 'A',
    title: 'Studio',
    description: '暖、精确、克制。保留触感与重量，但不会把每次操作都做成强提示。',
  },
  {
    id: 'mechanical',
    index: 'B',
    title: 'Mechanical',
    description: '卡榫与落位最明确。动作辨识度高，需重点判断连续操作是否疲劳。',
  },
  {
    id: 'scifi',
    index: 'C',
    title: 'Sci-fi',
    description: '允许电子层后的克制方案。轮廓清楚、有数字质感，但不采用街机哔声。',
  },
]

const FAMILY_NAMES = Object.fromEntries([
  ...FAMILIES.map((family) => [family.id, `${family.index} · ${family.title}`]),
  ['glass', 'Mutation · Glass'],
])

const FAMILY_CUES = ['swipe', 'reorder', 'lock', 'drop', 'progress-step', 'complete', 'start']
const ASSET_PATHS = [
  ...FAMILIES.flatMap(({ id }) => FAMILY_CUES.map((cue) => `./assets/${id}/${cue}.ogg`)),
  './assets/glass/lock.ogg',
  './assets/glass/snap.ogg',
]

const EMBEDDED_ASSETS = window.__T37_EMBEDDED_AUDIO__ ?? {}

const ACTIONS = [
  ['move-left', '左移'],
  ['move-right', '右移'],
  ['rotate', '旋转'],
  ['lock', '自然落位'],
  ['hard-drop', '硬降'],
  ['clear-1', '消 1 行'],
  ['clear-2', '消 2 行'],
  ['clear-3', '消 3 行'],
  ['clear-4', '消 4 行'],
  ['countdown', '3 · 2 · 1'],
]

const ACTION_MAP = Object.freeze({
  move: { cue: 'swipe', visualMs: 56 },
  rotate: { cue: 'reorder', visualMs: 74 },
  lock: { cue: 'lock', visualMs: 90 },
  hardDrop: { cue: 'drop', visualMs: 50 },
  clear: { cue: 'progress-step', visualMs: 200 },
  fourLineResolve: { cue: 'complete', startsAtMs: 190 },
  countdown: { cue: 'progress-step', stepMs: 500, resolveCue: 'start' },
  ice: { cues: ['lock', 'snap'], shardReleaseAtMs: 109, visualMs: 320 },
})

const elements = {
  families: document.querySelector('#families'),
  loadStatus: document.querySelector('#load-status'),
  volume: document.querySelector('#volume'),
  volumeValue: document.querySelector('#volume-value'),
  stopAll: document.querySelector('#stop-all'),
  stage: document.querySelector('#stage'),
  stageFamily: document.querySelector('#stage-family'),
  stageEvent: document.querySelector('#stage-event'),
  stageDetail: document.querySelector('#stage-detail'),
  piece: document.querySelector('#piece'),
  clearRows: [...document.querySelectorAll('#clear-rows span')],
  impactRing: document.querySelector('#impact-ring'),
  countdown: document.querySelector('#countdown'),
  iceField: document.querySelector('#ice-field'),
}

const state = {
  ready: false,
  mode: 'buffer',
  currentFamily: null,
  currentAction: null,
  volume: Number(elements.volume.value) / 100,
  error: null,
}

let audioContext = null
let compressor = null
let masterGain = null
const buffers = new Map()
const signalMetrics = new Map()
const activeSources = new Set()
const groupedSources = new Map()
const actionTimers = new Set()

function renderFamilies() {
  elements.families.innerHTML = FAMILIES.map((family) => `
    <article class="family-card" data-family="${family.id}">
      <span class="family-index">${family.index} · SOUND FAMILY</span>
      <h3>${family.title}</h3>
      <p>${family.description}</p>
      <button class="primary-action" type="button" data-family="${family.id}" data-action="showcase" disabled>
        试听完整动作链
      </button>
      <div class="cue-grid">
        ${ACTIONS.map(([action, label]) => `
          <button class="cue-button" type="button" data-family="${family.id}" data-action="${action}" disabled>
            ${label}
          </button>
        `).join('')}
        <button class="cue-button wide" type="button" data-family="${family.id}" data-action="repeat" disabled>
          连续移动 × 12
        </button>
      </div>
    </article>
  `).join('')
}

function createAudioGraph() {
  if (audioContext) return audioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) throw new Error('当前浏览器不支持 Web Audio API。')
  audioContext = new AudioContextClass()
  compressor = audioContext.createDynamicsCompressor()
  compressor.threshold.value = -10
  compressor.knee.value = 10
  compressor.ratio.value = 4
  compressor.attack.value = 0.003
  compressor.release.value = 0.12
  masterGain = audioContext.createGain()
  masterGain.gain.value = state.volume
  compressor.connect(masterGain)
  masterGain.connect(audioContext.destination)
  return audioContext
}

function analyzeBuffer(buffer) {
  let peak = 0
  let sumSquares = 0
  let sampleCount = 0
  let finite = true
  let tailPeak = 0
  const tailFrames = Math.min(Math.round(buffer.sampleRate * 0.01), buffer.length)
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex)
    for (let index = 0; index < channel.length; index += 1) {
      const sample = channel[index]
      if (!Number.isFinite(sample)) finite = false
      const magnitude = Math.abs(sample)
      peak = Math.max(peak, magnitude)
      sumSquares += sample * sample
      sampleCount += 1
      if (index >= channel.length - tailFrames) tailPeak = Math.max(tailPeak, magnitude)
    }
  }
  return {
    channels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
    durationSeconds: Number(buffer.duration.toFixed(6)),
    peak: Number(peak.toFixed(7)),
    rms: Number(Math.sqrt(sumSquares / Math.max(1, sampleCount)).toFixed(7)),
    tailPeak: Number(tailPeak.toFixed(7)),
    finite,
  }
}

async function loadAssets() {
  const context = createAudioGraph()
  let loaded = 0
  try {
    for (const path of ASSET_PATHS) {
      let encoded
      if (window.location.protocol === 'file:') {
        const base64 = EMBEDDED_ASSETS[path]
        if (!base64) throw new Error(`${path}: 缺少内嵌音频`)
        const binary = window.atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
        encoded = bytes.buffer
        state.mode = 'embedded-buffer'
      } else {
        const response = await fetch(path)
        if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
        encoded = await response.arrayBuffer()
      }
      const buffer = await context.decodeAudioData(encoded.slice(0))
      buffers.set(path, buffer)
      signalMetrics.set(path, analyzeBuffer(buffer))
      loaded += 1
      elements.loadStatus.textContent = `正在载入 ${loaded} / ${ASSET_PATHS.length}…`
    }
    markReady('23 个候选已在本地解码；点击任一按钮开始试听。')
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
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.disabled = false
  })
  window.__AUDITION_READY__ = true
  window.dispatchEvent(new CustomEvent('audition-ready'))
}

async function unlockAudio() {
  const context = createAudioGraph()
  if (context.state !== 'running') await context.resume()
}

function resolveAsset(pack, cue) {
  return `./assets/${pack}/${cue}.ogg`
}

function sourceTargetGain(path, targetPeak) {
  const metric = signalMetrics.get(path)
  if (!metric || metric.peak <= 0) return 1
  return Math.min(2.4, targetPeak / metric.peak)
}

function removeGroupedSource(group, source) {
  if (!group) return
  const sources = groupedSources.get(group)
  sources?.delete(source)
  if (sources?.size === 0) groupedSources.delete(group)
}

function stopGroup(group) {
  const sources = groupedSources.get(group)
  if (!sources) return
  for (const source of sources) {
    try { source.stop() } catch { /* already ended */ }
    activeSources.delete(source)
  }
  groupedSources.delete(group)
}

function playAsset(pack, cue, options = {}) {
  const path = resolveAsset(pack, cue)
  const {
    delayMs = 0,
    targetPeak = 0.62,
    rate = 1,
    pan = 0,
    maxDuration = null,
    group = null,
    replaceGroup = false,
  } = options

  if (replaceGroup && group) stopGroup(group)
  const context = createAudioGraph()
  const buffer = buffers.get(path)
  if (!buffer) throw new Error(`尚未载入音频：${path}`)

  const source = context.createBufferSource()
  const panner = context.createStereoPanner()
  const gain = context.createGain()
  const startAt = context.currentTime + delayMs / 1000
  const sourceDuration = buffer.duration / rate
  const duration = Math.min(sourceDuration, maxDuration ?? sourceDuration)
  const endAt = startAt + duration
  const fade = Math.min(0.024, duration * 0.18)
  const normalizedGain = sourceTargetGain(path, targetPeak)

  source.buffer = buffer
  source.playbackRate.value = rate
  panner.pan.value = pan
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.linearRampToValueAtTime(normalizedGain, startAt + Math.min(0.004, duration * 0.1))
  gain.gain.setValueAtTime(normalizedGain, Math.max(startAt, endAt - fade))
  gain.gain.linearRampToValueAtTime(0.0001, endAt)
  source.connect(panner)
  panner.connect(gain)
  gain.connect(compressor)

  activeSources.add(source)
  if (group) {
    const sources = groupedSources.get(group) ?? new Set()
    sources.add(source)
    groupedSources.set(group, sources)
  }
  source.addEventListener('ended', () => {
    activeSources.delete(source)
    removeGroupedSource(group, source)
    source.disconnect()
    panner.disconnect()
    gain.disconnect()
  }, { once: true })
  source.start(startAt)
  source.stop(endAt + 0.006)
  return source
}

function schedule(callback, delayMs) {
  const timer = window.setTimeout(() => {
    actionTimers.delete(timer)
    callback()
  }, delayMs)
  actionTimers.add(timer)
  return timer
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

function setStage(family, action, detail) {
  state.currentFamily = family
  state.currentAction = action
  elements.stageFamily.textContent = FAMILY_NAMES[family] ?? family
  elements.stageEvent.textContent = action
  elements.stageDetail.textContent = detail
}

function animatePiece(kind) {
  elements.piece.getAnimations().forEach((animation) => animation.cancel())
  const base = 'translate(-50%, -50%)'
  const keyframes = {
    left: [
      { transform: `${base} translateX(0)` },
      { transform: `${base} translateX(-19px)`, offset: 0.72 },
      { transform: `${base} translateX(-16px)` },
    ],
    right: [
      { transform: `${base} translateX(0)` },
      { transform: `${base} translateX(19px)`, offset: 0.72 },
      { transform: `${base} translateX(16px)` },
    ],
    rotate: [
      { transform: `${base} rotate(0deg)` },
      { transform: `${base} rotate(96deg)`, offset: 0.78 },
      { transform: `${base} rotate(90deg)` },
    ],
    lock: [
      { transform: `${base} translateY(-8px) scale(1.02)` },
      { transform: `${base} translateY(0) scale(0.97)`, offset: 0.72 },
      { transform: `${base} translateY(0) scale(1)` },
    ],
    drop: [
      { transform: `${base} translateY(-64px) scaleY(0.97)` },
      { transform: `${base} translateY(0) scaleY(1.04)`, offset: 0.76 },
      { transform: `${base} translateY(0) scaleY(1)` },
    ],
  }
  const duration = kind === 'drop' ? 150 : kind === 'rotate' ? 110 : kind === 'lock' ? 120 : 90
  elements.piece.animate(keyframes[kind], {
    duration,
    easing: 'cubic-bezier(0.2, 0.78, 0.25, 1)',
  })
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
    }, Math.round(index * (180 / Math.max(1, lines - 1))))
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
    { transform: 'translate(-50%, -50%) scale(1.04)', filter: 'brightness(1.45)', offset: 0.34 },
    { transform: 'translate(-50%, -50%) scale(0.99)', filter: 'brightness(1.12)' },
  ], { duration: 320, easing: 'cubic-bezier(0.2, 0.72, 0.22, 1)' })
  schedule(() => elements.stage.classList.remove('is-ice'), 360)
}

function playMove(family, direction) {
  setStage(family, direction < 0 ? '左移' : '右移', '56 ms 横向落位；声像与移动方向一致。')
  animatePiece(direction < 0 ? 'left' : 'right')
  playAsset(family, 'swipe', {
    targetPeak: 0.52,
    rate: 1.75,
    pan: direction * 0.48,
    maxDuration: 0.18,
    group: 'move',
    replaceGroup: true,
  })
}

function playRotate(family) {
  setStage(family, '旋转', '转向后以短促卡榫确认，不与横向移动共用轮廓。')
  animatePiece('rotate')
  playAsset(family, 'reorder', {
    targetPeak: 0.6,
    rate: 1.45,
    maxDuration: 0.23,
    group: 'rotate',
    replaceGroup: true,
  })
}

function playLock(family) {
  setStage(family, '自然落位', '低速接触与网格锁定；强度低于硬降。')
  animatePiece('lock')
  playAsset(family, 'lock', {
    targetPeak: 0.63,
    rate: 1.18,
    maxDuration: 0.28,
    group: 'contact',
    replaceGroup: true,
  })
}

function playHardDrop(family) {
  setStage(family, '硬降', '50 ms 快速下坠后接触；目标峰值高于自然落位。')
  animatePiece('drop')
  playAsset(family, 'drop', {
    targetPeak: 0.8,
    rate: 1,
    maxDuration: 0.4,
    group: 'contact',
    replaceGroup: true,
  })
}

function playClear(family, lines) {
  stopGroup('clear')
  setStage(family, `消除 ${lines} 行`, `从 clear-started 开始，在 200 ms 内按实际行数释放 ${lines} 个脉冲。`)
  animateClear(lines)
  const spacing = lines === 1 ? 0 : Math.round(180 / (lines - 1))
  for (let index = 0; index < lines; index += 1) {
    playAsset(family, 'progress-step', {
      delayMs: index * spacing,
      targetPeak: lines >= 3 ? 0.54 : 0.5,
      rate: 1.18,
      maxDuration: 0.2,
      pan: lines === 1 ? 0 : -0.35 + (0.7 * index) / (lines - 1),
      group: 'clear',
    })
  }
  if (lines === 4) {
    playAsset(family, 'complete', {
      delayMs: 190,
      targetPeak: 0.62,
      rate: 1.08,
      maxDuration: 0.52,
      group: 'clear',
    })
  }
}

function playCountdown(family) {
  stopGroup('countdown')
  setStage(family, '3 · 2 · 1', '三个等距步骤保持同一材质，开始时使用方向不同的释放音。')
  ;['3', '2', '1'].forEach((value, index) => {
    schedule(() => showCountdown(value), index * 500)
    playAsset(family, 'progress-step', {
      delayMs: index * 500,
      targetPeak: 0.56 + index * 0.035,
      rate: 1.04 + index * 0.04,
      maxDuration: 0.22,
      group: 'countdown',
    })
  })
  schedule(() => showCountdown('GO'), 1500)
  playAsset(family, 'start', {
    delayMs: 1500,
    targetPeak: 0.72,
    rate: 1.08,
    maxDuration: 0.42,
    group: 'countdown',
  })
}

function playIce() {
  stopGroup('mutation')
  setStage('glass', '冰冻激活', '0 ms 晶体锁定；109 ms 碎片释放；视觉总长 320 ms。')
  animateIce()
  playAsset('glass', 'lock', {
    targetPeak: 0.68,
    rate: 1.22,
    maxDuration: 0.32,
    group: 'mutation',
  })
  playAsset('glass', 'snap', {
    delayMs: 109,
    targetPeak: 0.62,
    rate: 1.28,
    maxDuration: 0.2,
    pan: 0.18,
    group: 'mutation',
  })
}

function playRepeat(family) {
  stopGroup('move')
  setStage(family, '连续移动 × 12', '按 80 ms 输入间隔交替左右移动，用于判断重复疲劳与糊声。')
  for (let index = 0; index < 12; index += 1) {
    schedule(() => playMove(family, index % 2 === 0 ? -1 : 1), index * 80)
  }
  schedule(() => setStage(family, '连续移动完成', '如果这段已经刺耳、太小或糊成一片，该声族应直接淘汰。'), 1040)
}

function playShowcase(family) {
  stopAll(false)
  const sequence = [
    [0, () => playMove(family, -1)],
    [300, () => playMove(family, 1)],
    [610, () => playRotate(family)],
    [1010, () => playLock(family)],
    [1450, () => playHardDrop(family)],
    [2050, () => playClear(family, 1)],
    [2580, () => playClear(family, 2)],
    [3200, () => playClear(family, 3)],
    [3920, () => playClear(family, 4)],
  ]
  sequence.forEach(([delay, action]) => schedule(action, delay))
}

async function performAction(family, action) {
  if (!state.ready) return
  await unlockAudio()
  cancelVisuals()
  switch (action) {
    case 'move-left': playMove(family, -1); break
    case 'move-right': playMove(family, 1); break
    case 'rotate': playRotate(family); break
    case 'lock': playLock(family); break
    case 'hard-drop': playHardDrop(family); break
    case 'clear-1': playClear(family, 1); break
    case 'clear-2': playClear(family, 2); break
    case 'clear-3': playClear(family, 3); break
    case 'clear-4': playClear(family, 4); break
    case 'countdown': playCountdown(family); break
    case 'repeat': playRepeat(family); break
    case 'showcase': playShowcase(family); break
    case 'ice': playIce(); break
    default: throw new Error(`未知试听动作：${action}`)
  }
}

function stopAll(resetStage = true) {
  for (const timer of actionTimers) window.clearTimeout(timer)
  actionTimers.clear()
  for (const source of activeSources) {
    try { source.stop() } catch { /* already ended */ }
  }
  activeSources.clear()
  groupedSources.clear()
  cancelVisuals()
  if (resetStage) setStage('—', '已停止', '可以从任意声族重新开始。')
}

function buildReport() {
  return {
    schemaVersion: 1,
    status: state.ready ? 'ready' : 'loading',
    playbackMode: state.mode,
    assetCount: ASSET_PATHS.length,
    actionMap: ACTION_MAP,
    assets: Object.fromEntries([...signalMetrics.entries()].sort(([a], [b]) => a.localeCompare(b))),
    state: { ...state },
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]')
  if (!button || button.disabled) return
  performAction(button.dataset.family, button.dataset.action).catch((error) => {
    state.error = error instanceof Error ? error.message : String(error)
    elements.loadStatus.textContent = `播放失败：${state.error}`
    elements.loadStatus.classList.add('error')
  })
})

elements.volume.addEventListener('input', () => {
  state.volume = Number(elements.volume.value) / 100
  elements.volumeValue.value = `${elements.volume.value}%`
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(state.volume, audioContext.currentTime, 0.012)
  }
})

elements.stopAll.addEventListener('click', () => stopAll())

window.__AUDITION_READY__ = false
window.__AUDITION_API__ = {
  performAction,
  stopAll,
  getReport: buildReport,
}
window.render_game_to_text = () => JSON.stringify({
  screen: 't37-audio-audition-r3',
  ready: state.ready,
  playbackMode: state.mode,
  volumePercent: Math.round(state.volume * 100),
  currentFamily: state.currentFamily,
  currentAction: state.currentAction,
  coordinateSystem: 'audition stage; visuals are illustrative and not gameplay geometry',
})

renderFamilies()
loadAssets().catch(() => {})
