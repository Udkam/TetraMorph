const ACCEPTED = Object.freeze({
  clearOneToThreeAssetSha256: 'f3f02d93d22fc0d1d046674510cfff98235f4df8cc839b13c6da23bf6ea97b0c',
  countdownStartAssetSha256: 'b85abe167750922700a1aa7f5d2f5e5162facfdc6782c298b9c825375bdfb388',
  compressor: Object.freeze({ threshold: -10, knee: 10, ratio: 4, attack: 0.003, release: 0.12 }),
  clearFourPulseTimesMs: Object.freeze([0, 60, 120, 180]),
  clearFourResolveCue: null,
  reviewControls: false,
})

const PROFILES = Object.freeze({
  t28: Object.freeze({
    id: 't28',
    label: 'A · T28 柔和版',
    sourceCommit: '35509a7',
    sourceBlob: 'c43a68701fc1a7d39e31094422617214b359a001',
    description: '44–72 ms 短正弦；精确恢复旧柔和触点，不做峰值归一。',
    masterGain: 1.85,
    voiceGainBoost: 1.45,
    voiceGainCeiling: 0.5,
    compressor: Object.freeze({ threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12 }),
    recipes: Object.freeze({
      move: Object.freeze([
        Object.freeze({ frequency: 220, duration: 0.044, gain: 0.062, attack: 0.006, type: 'sine' }),
      ]),
      rotate: Object.freeze([
        Object.freeze({ frequency: 293.66, duration: 0.065, gain: 0.09, attack: 0.006, type: 'sine' }),
        Object.freeze({ frequency: 440, duration: 0.038, gain: 0.024, delay: 0.004, attack: 0.004, type: 'sine' }),
      ]),
      lock: Object.freeze([
        Object.freeze({ frequency: 246.94, duration: 0.048, gain: 0.06, attack: 0.007, type: 'sine' }),
      ]),
      hardDrop: Object.freeze([
        Object.freeze({ frequency: 174.61, duration: 0.072, gain: 0.1, attack: 0.006, type: 'sine' }),
        Object.freeze({ frequency: 349.23, duration: 0.038, gain: 0.03, delay: 0.004, attack: 0.004, type: 'sine' }),
      ]),
    }),
  }),
  t29: Object.freeze({
    id: 't29',
    label: 'B · T29 历史接受版',
    sourceCommit: 'ca5da48',
    sourceBlob: 'f470e8942fed47da0c10c3d0debbb41580b49bf1',
    description: '46–90 ms 圆润主体；旧人工接受版，比 T28 更有存在感。',
    masterGain: 1.5,
    voiceGainBoost: 1.6,
    voiceGainCeiling: 0.46,
    compressor: Object.freeze({ threshold: -2, knee: 4, ratio: 2.4, attack: 0.006, release: 0.16 }),
    recipes: Object.freeze({
      move: Object.freeze([
        Object.freeze({ frequency: 196, duration: 0.046, gain: 0.068, attack: 0.003, body: 0.46, bodyGain: 0.46, type: 'triangle' }),
      ]),
      rotate: Object.freeze([
        Object.freeze({ frequency: 261.63, duration: 0.08, gain: 0.105, attack: 0.004, body: 0.5, bodyGain: 0.52, type: 'triangle' }),
        Object.freeze({ frequency: 392, duration: 0.055, gain: 0.045, delay: 0.012, attack: 0.003, body: 0.42, bodyGain: 0.44, type: 'sine' }),
      ]),
      lock: Object.freeze([
        Object.freeze({ frequency: 220, duration: 0.055, gain: 0.07, attack: 0.004, body: 0.48, bodyGain: 0.48, type: 'triangle' }),
      ]),
      hardDrop: Object.freeze([
        Object.freeze({ frequency: 146.83, endFrequency: 130.81, duration: 0.09, gain: 0.13, attack: 0.004, body: 0.5, bodyGain: 0.54, type: 'triangle' }),
        Object.freeze({ frequency: 293.66, duration: 0.05, gain: 0.045, delay: 0.006, attack: 0.003, body: 0.42, bodyGain: 0.42, type: 'sine' }),
      ]),
    }),
  }),
})

const ICE_CANDIDATES = Object.freeze([
  Object.freeze({
    id: 'ice-break',
    number: 1,
    label: '短裂冰块',
    detail: '0.374 秒真实裂冰；完整短样本，清脆后立即收束。',
    author: 'giwake',
    sourceTitle: 'Ice Breaking 1',
    page: 'https://freesound.org/people/giwake/sounds/666478/',
    asset: './assets/ice/giwake-ice-breaking-1-hq.ogg',
    sha256: 'e392c9ba8724513c2e7b5c3ccaec4ce241c32eeabb5d4f060a074911cb53f81b',
    maxWindowSeconds: 0.42,
  }),
  Object.freeze({
    id: 'ice-cubes',
    number: 2,
    label: '冰块轻碰',
    detail: '真实冰块倒入玻璃；只取最强单次碰撞窗口，用来判断冰块的清亮触点。',
    author: 'sbml',
    sourceTitle: 'Ice cubes',
    page: 'https://freesound.org/people/sbml/sounds/819779/',
    asset: './assets/ice/sbml-ice-cubes-hq.ogg',
    sha256: '5a68425717de348ba3d10767618fa4c428a97f26c2e85abc96f45b7bfb35a450',
    maxWindowSeconds: 0.44,
  }),
  Object.freeze({
    id: 'ice-crack',
    number: 3,
    label: '短促裂冰',
    detail: '真实 Ice Foley；只取最强裂响附近，不播放两秒完整尾音。',
    author: 'ecfike',
    sourceTitle: 'Ice Crack 9.wav',
    page: 'https://freesound.org/people/ecfike/sounds/177223/',
    asset: './assets/ice/ecfike-ice-crack-9-hq.ogg',
    sha256: 'bdce4701e8fbfb36ce39931b56a7f4226265225b7529631c232aae15abc1fd4c',
    maxWindowSeconds: 0.44,
  }),
])

const elements = {
  volume: document.querySelector('#volume'),
  volumeValue: document.querySelector('#volume-value'),
  stop: document.querySelector('#stop-all'),
  profileButtons: [...document.querySelectorAll('[data-profile-select]')],
  actionButtons: [...document.querySelectorAll('[data-action]')],
  stageProfile: document.querySelector('#stage-profile'),
  stageAction: document.querySelector('#stage-action'),
  stageDetail: document.querySelector('#stage-detail'),
  piece: document.querySelector('#piece'),
  iceField: document.querySelector('#ice-field'),
  iceCandidates: document.querySelector('#ice-candidates'),
}

const iceBuffers = new Map()
const iceMetrics = new Map()
const liveVoices = new Set()
const scheduledTimers = new Set()

let audioContext = null
let auditionVolume = null
let actionEffects = null
let actionMaster = null
let actionCompressor = null
let currentProfileId = 't28'
let currentAction = null
let playbackMode = 'loading'

function schedule(callback, delayMs) {
  const timer = window.setTimeout(() => {
    scheduledTimers.delete(timer)
    callback()
  }, delayMs)
  scheduledTimers.add(timer)
  return timer
}

function clearSchedule() {
  for (const timer of scheduledTimers) window.clearTimeout(timer)
  scheduledTimers.clear()
}

function currentProfile() {
  return PROFILES[currentProfileId]
}

function setStage(action, detail = currentProfile().description) {
  currentAction = action
  elements.stageProfile.textContent = currentProfile().label
  elements.stageAction.textContent = action
  elements.stageDetail.textContent = detail
}

function applyProfileMixer() {
  if (!audioContext || !actionMaster || !actionCompressor) return
  const profile = currentProfile()
  const now = audioContext.currentTime
  actionMaster.gain.setTargetAtTime(profile.masterGain, now, 0.012)
  actionCompressor.threshold.setValueAtTime(profile.compressor.threshold, now)
  actionCompressor.knee.setValueAtTime(profile.compressor.knee, now)
  actionCompressor.ratio.setValueAtTime(profile.compressor.ratio, now)
  actionCompressor.attack.setValueAtTime(profile.compressor.attack, now)
  actionCompressor.release.setValueAtTime(profile.compressor.release, now)
}

async function ensureAudio(resume = true) {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    audioContext = new AudioContextClass()
    auditionVolume = audioContext.createGain()
    actionEffects = audioContext.createGain()
    actionMaster = audioContext.createGain()
    actionCompressor = audioContext.createDynamicsCompressor()
    actionEffects.connect(actionMaster)
    actionMaster.connect(actionCompressor)
    actionCompressor.connect(auditionVolume)
    auditionVolume.connect(audioContext.destination)
    auditionVolume.gain.value = Number(elements.volume.value)
    applyProfileMixer()
  }
  if (resume && audioContext.state === 'suspended') await audioContext.resume()
  return audioContext
}

function removeVoice(voice) {
  liveVoices.delete(voice)
  for (const node of voice.nodes) {
    try { node.disconnect() } catch {}
  }
}

function releaseVoice(voice, releaseSeconds = 0.012) {
  if (!audioContext || voice.released) return
  voice.released = true
  const now = audioContext.currentTime
  try {
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now)
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds)
    voice.source.stop(now + releaseSeconds + 0.008)
  } catch {}
}

function stopAll(updateStage = true) {
  clearSchedule()
  for (const voice of [...liveVoices]) releaseVoice(voice, 0.012)
  elements.piece.className = 'piece'
  elements.iceField.classList.remove('is-active')
  if (updateStage) setStage('已停止', '所有当前声音在 12 ms 内退出，不让停止动作制造点击。')
}

function tone(options, pan = 0) {
  if (!audioContext || !actionEffects || liveVoices.size >= 16) return
  const profile = currentProfile()
  const start = audioContext.currentTime + (options.delay ?? 0)
  const end = start + options.duration
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const panner = typeof audioContext.createStereoPanner === 'function' ? audioContext.createStereoPanner() : null
  oscillator.type = options.type ?? 'sine'
  oscillator.frequency.setValueAtTime(options.frequency, start)
  if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), end)
  gain.gain.setValueAtTime(0.0001, start)
  const peak = Math.max(0.0001, Math.min(profile.voiceGainCeiling, options.gain * profile.voiceGainBoost))
  const attackEnd = start + Math.min(options.attack ?? 0.012, options.duration * 0.25)
  gain.gain.exponentialRampToValueAtTime(peak, attackEnd)
  if (options.body) {
    const bodyEnd = Math.min(
      end - 0.004,
      Math.max(attackEnd + 0.003, start + options.duration * Math.min(0.82, Math.max(0.28, options.body))),
    )
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * Math.min(0.9, Math.max(0.18, options.bodyGain ?? 0.5))),
      bodyEnd,
    )
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  oscillator.connect(gain)
  const nodes = [oscillator, gain]
  if (panner) {
    panner.pan.setValueAtTime(pan, start)
    gain.connect(panner)
    panner.connect(actionEffects)
    nodes.push(panner)
  } else {
    gain.connect(actionEffects)
  }
  const voice = { source: oscillator, gain, nodes, released: false }
  liveVoices.add(voice)
  oscillator.start(start)
  oscillator.stop(end + 0.01)
  oscillator.onended = () => removeVoice(voice)
}

function playRecipe(recipeName, pan = 0) {
  for (const option of currentProfile().recipes[recipeName]) tone(option, pan)
}

function animatePiece(className) {
  elements.piece.className = 'piece'
  void elements.piece.offsetWidth
  elements.piece.classList.add(className)
}

async function playMove(direction) {
  await ensureAudio()
  playRecipe('move', direction < 0 ? -0.28 : 0.28)
  animatePiece(direction < 0 ? 'is-left' : 'is-right')
  setStage(direction < 0 ? '左移' : '右移', `${currentProfile().description} 仅新增 ${direction < 0 ? '-0.28' : '+0.28'} 声像。`)
}

async function playRotate() {
  await ensureAudio()
  playRecipe('rotate')
  animatePiece('is-rotate')
  setStage('旋转')
}

async function playLock() {
  await ensureAudio()
  playRecipe('lock')
  animatePiece('is-lock')
  setStage('自然落位')
}

async function playHardDrop() {
  await ensureAudio()
  animatePiece('is-drop')
  setStage('硬降', '先显示 50 ms 下坠，再播放旧版接触配方；没有 R4 的长 drop 素材。')
  schedule(() => playRecipe('hardDrop'), 50)
}

async function playRepeat() {
  await ensureAudio()
  clearSchedule()
  setStage('连续移动 × 12', '95 ms 间隔交替左右，用来判断重复疲劳、方向感和音量。')
  for (let index = 0; index < 12; index += 1) {
    schedule(() => { void playMove(index % 2 === 0 ? -1 : 1) }, index * 95)
  }
  schedule(() => setStage('连续移动完成', '请判断它是否确实比 R4 更短、更柔和，同时仍能读出移动。'), 1190)
}

async function playShowcase() {
  await ensureAudio()
  clearSchedule()
  setStage('完整动作链', '左移 → 右移 → 旋转 → 自然落位 → 硬降。')
  schedule(() => { void playMove(-1) }, 0)
  schedule(() => { void playMove(1) }, 260)
  schedule(() => { void playRotate() }, 540)
  schedule(() => { void playLock() }, 860)
  schedule(() => { void playHardDrop() }, 1190)
}

function bytesFromBase64(value) {
  const raw = atob(value)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes.buffer
}

async function loadAsset(candidate) {
  const embedded = window.__T37_R5_EMBEDDED_AUDIO__?.[candidate.asset]
  const bytes = embedded
    ? bytesFromBase64(embedded)
    : await (await fetch(candidate.asset, { cache: 'no-store' })).arrayBuffer()
  playbackMode = embedded ? 'embedded-buffer' : 'http-fetch'
  const context = await ensureAudio(false)
  const buffer = await context.decodeAudioData(bytes.slice(0))
  const metrics = measureBuffer(buffer, candidate.maxWindowSeconds)
  iceBuffers.set(candidate.id, buffer)
  iceMetrics.set(candidate.id, metrics)
  return metrics
}

function measureBuffer(buffer, maxWindowSeconds) {
  let peak = 0
  let peakFrame = 0
  let squareSum = 0
  let sampleCount = 0
  let finite = true
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let frame = 0; frame < data.length; frame += 1) {
      const sample = data[frame]
      if (!Number.isFinite(sample)) finite = false
      const absolute = Math.abs(sample)
      if (absolute > peak) {
        peak = absolute
        peakFrame = frame
      }
      squareSum += sample * sample
      sampleCount += 1
    }
  }
  const peakSeconds = peakFrame / buffer.sampleRate
  const preRollSeconds = 0.035
  const windowStartSeconds = Math.max(0, peakSeconds - preRollSeconds)
  const windowDurationSeconds = Math.min(maxWindowSeconds, buffer.duration - windowStartSeconds)
  return Object.freeze({
    durationSeconds: buffer.duration,
    channels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
    peak,
    rms: Math.sqrt(squareSum / Math.max(1, sampleCount)),
    finite,
    peakSeconds,
    windowStartSeconds,
    windowDurationSeconds,
    peakResponseMs: Math.round((peakSeconds - windowStartSeconds) * 1000),
  })
}

async function playIce(candidate) {
  const context = await ensureAudio()
  const buffer = iceBuffers.get(candidate.id)
  const metrics = iceMetrics.get(candidate.id)
  if (!buffer || !metrics || !auditionVolume) return
  clearSchedule()
  const source = context.createBufferSource()
  const gain = context.createGain()
  const start = context.currentTime
  const end = start + metrics.windowDurationSeconds
  source.buffer = buffer
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.78, start + 0.003)
  gain.gain.setValueAtTime(0.78, Math.max(start + 0.004, end - 0.012))
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  source.connect(gain)
  gain.connect(auditionVolume)
  const voice = { source, gain, nodes: [source, gain], released: false }
  liveVoices.add(voice)
  source.start(start, metrics.windowStartSeconds, metrics.windowDurationSeconds)
  source.stop(end + 0.01)
  source.onended = () => removeVoice(voice)
  elements.iceField.classList.remove('is-active')
  void elements.iceField.offsetWidth
  elements.iceField.classList.add('is-active')
  schedule(() => elements.iceField.classList.remove('is-active'), Math.ceil(metrics.windowDurationSeconds * 1000) + 80)
  setStage(
    `冰冻 ${candidate.number} · ${candidate.label}`,
    `${candidate.sourceTitle} / ${candidate.author}；原速窗口 ${metrics.windowStartSeconds.toFixed(3)}–${(metrics.windowStartSeconds + metrics.windowDurationSeconds).toFixed(3)} s，最强冰块响应在 ${metrics.peakResponseMs} ms。`,
  )
}

function renderIceCards() {
  elements.iceCandidates.innerHTML = ICE_CANDIDATES.map((candidate) => `
    <article class="ice-card">
      <span class="ice-number">ICE ${candidate.number}</span>
      <h3>${candidate.label}</h3>
      <p>${candidate.detail}</p>
      <p><a href="${candidate.page}" target="_blank" rel="noreferrer">${candidate.sourceTitle} · ${candidate.author} · CC0</a></p>
      <button type="button" data-ice-id="${candidate.id}" disabled>加载中…</button>
    </article>
  `).join('')
}

async function initializeIce() {
  renderIceCards()
  await Promise.all(ICE_CANDIDATES.map(async (candidate) => {
    const button = document.querySelector(`[data-ice-id="${candidate.id}"]`)
    try {
      await loadAsset(candidate)
      button.disabled = false
      button.textContent = `试听冰冻 ${candidate.number}`
    } catch (error) {
      button.textContent = '加载失败'
      console.error(`Failed to load ${candidate.id}`, error)
    }
  }))
}

elements.volume.addEventListener('input', () => {
  const value = Number(elements.volume.value)
  elements.volumeValue.value = `${Math.round(value * 100)}%`
  if (audioContext && auditionVolume) auditionVolume.gain.setTargetAtTime(value, audioContext.currentTime, 0.012)
})

elements.stop.addEventListener('click', () => stopAll(true))

for (const button of elements.profileButtons) {
  button.addEventListener('click', async () => {
    stopAll(false)
    currentProfileId = button.dataset.profileSelect
    for (const candidate of elements.profileButtons) candidate.setAttribute('aria-pressed', String(candidate === button))
    await ensureAudio()
    applyProfileMixer()
    setStage('已切换历史版本', currentProfile().description)
  })
}

for (const button of elements.actionButtons) {
  button.addEventListener('click', async () => {
    const action = button.dataset.action
    if (action === 'move-left') await playMove(-1)
    else if (action === 'move-right') await playMove(1)
    else if (action === 'rotate') await playRotate()
    else if (action === 'lock') await playLock()
    else if (action === 'hard-drop') await playHardDrop()
    else if (action === 'repeat') await playRepeat()
    else if (action === 'showcase') await playShowcase()
  })
}

elements.iceCandidates.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-ice-id]')
  if (!button || button.disabled) return
  const candidate = ICE_CANDIDATES.find((item) => item.id === button.dataset.iceId)
  if (candidate) await playIce(candidate)
})

window.render_game_to_text = () => JSON.stringify({
  surface: 'T37 audio audition R5',
  currentProfile: currentProfileId,
  currentAction,
  playbackMode,
  accepted: ACCEPTED,
  profiles: PROFILES,
  ice: ICE_CANDIDATES.map((candidate) => ({
    ...candidate,
    loaded: iceBuffers.has(candidate.id),
    metrics: iceMetrics.get(candidate.id) ?? null,
  })),
})

window.advanceTime = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, milliseconds)))

window.__T37_R5_AUDIT__ = Object.freeze({
  accepted: ACCEPTED,
  profiles: PROFILES,
  iceCandidates: ICE_CANDIDATES,
  getIceMetrics: () => Object.fromEntries(iceMetrics),
  stopAll: () => stopAll(false),
})

initializeIce().then(() => {
  window.__T37_R5_READY__ = true
}).catch((error) => {
  console.error('R5 initialization failed', error)
})
