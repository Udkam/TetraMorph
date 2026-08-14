(() => {
  'use strict'

  const manifest = window.BOMB_R3_MANIFEST
  const embedded = window.BOMB_R3_EMBEDDED
  const candidateBuffers = new Map()
  const activeVoices = new Set()
  const pendingTimers = new Set()
  const playableButtons = [...document.querySelectorAll('[data-play], [data-reference], [data-context]')]
  const volume = document.querySelector('#master-volume')
  const volumeOutput = document.querySelector('#volume-output')
  const stopButton = document.querySelector('#stop-all')
  const playStatus = document.querySelector('#play-status')
  const recordButton = document.querySelector('#record-verdict')
  const gateStatus = document.querySelector('#gate-status')

  let context = null
  let output = null
  let actionMaster = null
  let actionCompressor = null
  let studioCompressor = null
  let studioBuffer = null
  let ready = false
  let contextClosed = false
  let currentCue = null
  let playCount = 0
  let gateMode = 'reject'
  let initializationPromise = null

  const actionContract = Object.freeze({
    masterGain: 1.85,
    voiceGainBoost: 1.45,
    voiceGainCeiling: 0.5,
    compressor: Object.freeze({ threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12 }),
    hardDrop: Object.freeze([
      Object.freeze({ frequency: 174.61, duration: 0.072, gain: 0.1, attack: 0.006, waveform: 'sine' }),
      Object.freeze({ frequency: 349.23, duration: 0.038, gain: 0.03, delay: 0.004, attack: 0.004, waveform: 'sine' }),
    ]),
  })
  const studioContract = Object.freeze({
    compressor: Object.freeze({ threshold: -10, knee: 10, ratio: 4, attack: 0.003, release: 0.12 }),
    rate: 1.18,
    maxDuration: 0.2,
    offsets: Object.freeze([0, 0.06, 0.12, 0.18]),
  })

  function configureCompressor(node, contract) {
    node.threshold.value = contract.threshold
    node.knee.value = contract.knee
    node.ratio.value = contract.ratio
    node.attack.value = contract.attack
    node.release.value = contract.release
  }

  function bytesFromDataUri(dataUri) {
    const raw = atob(dataUri.slice(dataUri.indexOf(',') + 1))
    const bytes = new Uint8Array(raw.length)
    for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
    return bytes.buffer
  }

  function scheduleTimer(callback, delayMs) {
    const timer = window.setTimeout(() => {
      pendingTimers.delete(timer)
      callback()
    }, delayMs)
    pendingTimers.add(timer)
    return timer
  }

  function clearTimers() {
    for (const timer of pendingTimers) window.clearTimeout(timer)
    pendingTimers.clear()
  }

  function removeVoice(voice) {
    if (!activeVoices.delete(voice)) return
    for (const node of voice.nodes) {
      try { node.disconnect() } catch {}
    }
  }

  function trackVoice(source, nodes) {
    const voice = { source, nodes, stopped: false }
    activeVoices.add(voice)
    source.onended = () => removeVoice(voice)
    return voice
  }

  function stopAll(message = '已停止全部声音') {
    clearTimers()
    for (const voice of [...activeVoices]) {
      if (!voice.stopped) {
        voice.stopped = true
        try { voice.source.stop() } catch {}
      }
      removeVoice(voice)
    }
    for (const button of playableButtons) delete button.dataset.playing
    currentCue = null
    if (message) playStatus.textContent = message
  }

  function createGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) throw new Error('当前浏览器不支持 Web Audio。')
    context = new AudioContextClass()
    output = context.createGain()
    output.gain.value = Number(volume.value) / 100
    actionMaster = context.createGain()
    actionMaster.gain.value = actionContract.masterGain
    actionCompressor = context.createDynamicsCompressor()
    configureCompressor(actionCompressor, actionContract.compressor)
    studioCompressor = context.createDynamicsCompressor()
    configureCompressor(studioCompressor, studioContract.compressor)
    actionMaster.connect(actionCompressor)
    actionCompressor.connect(output)
    studioCompressor.connect(output)
    output.connect(context.destination)
  }

  async function initializeAudio() {
    if (initializationPromise) return initializationPromise
    initializationPromise = (async () => {
      createGraph()
      const entries = Object.entries(embedded).filter(([id]) => id !== 'reference-studio-clear')
      await Promise.all(entries.map(async ([id, item]) => {
        const buffer = await context.decodeAudioData(bytesFromDataUri(item.dataUri))
        candidateBuffers.set(id, buffer)
      }))
      studioBuffer = await context.decodeAudioData(bytesFromDataUri(embedded['reference-studio-clear'].dataUri))
      ready = true
      for (const button of playableButtons) button.disabled = false
      playStatus.textContent = '本地音频已就绪；请先听现有硬降'
      window.__BOMB_R3_READY__ = true
    })().catch((error) => {
      playStatus.textContent = '音频载入失败；请刷新后重试'
      console.error('Bomb R3 initialization failed', error)
      throw error
    })
    return initializationPromise
  }

  async function ensureAudio() {
    await initializeAudio()
    if (context.state === 'suspended') await context.resume()
    return context
  }

  function scheduleBuffer(buffer, destination, startAt, options = {}) {
    const source = context.createBufferSource()
    const gain = context.createGain()
    const panner = options.pan && typeof context.createStereoPanner === 'function'
      ? context.createStereoPanner()
      : null
    source.buffer = buffer
    source.playbackRate.value = options.rate ?? 1
    const duration = options.duration ?? (buffer.duration / source.playbackRate.value)
    const end = startAt + duration
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.linearRampToValueAtTime(options.gain ?? 1, startAt + Math.min(0.006, duration * 0.12))
    gain.gain.setValueAtTime(options.gain ?? 1, Math.max(startAt + 0.007, end - 0.018))
    gain.gain.linearRampToValueAtTime(0.0001, end)
    source.connect(gain)
    const nodes = [source, gain]
    if (panner) {
      panner.pan.value = options.pan
      gain.connect(panner)
      panner.connect(destination)
      nodes.push(panner)
    } else {
      gain.connect(destination)
    }
    trackVoice(source, nodes)
    source.start(startAt, 0, Math.min(buffer.duration, duration * source.playbackRate.value))
    source.stop(end + 0.01)
    return duration
  }

  function scheduleCandidate(id, startAt) {
    const buffer = candidateBuffers.get(id)
    if (!buffer) throw new Error(`Candidate ${id} is not decoded.`)
    return scheduleBuffer(buffer, output, startAt)
  }

  function scheduleHardDrop(startAt) {
    for (const tone of actionContract.hardDrop) {
      const start = startAt + (tone.delay ?? 0)
      const end = start + tone.duration
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = tone.waveform
      oscillator.frequency.setValueAtTime(tone.frequency, start)
      const peak = Math.min(actionContract.voiceGainCeiling, tone.gain * actionContract.voiceGainBoost)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + tone.attack)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(gain)
      gain.connect(actionMaster)
      trackVoice(oscillator, [oscillator, gain])
      oscillator.start(start)
      oscillator.stop(end + 0.01)
    }
    return 0.072
  }

  function bufferPeak(buffer) {
    let peak = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      for (const sample of buffer.getChannelData(channel)) peak = Math.max(peak, Math.abs(sample))
    }
    return peak
  }

  function scheduleStudioClear(lines, startAt) {
    if (!studioBuffer) throw new Error('Studio reference is not decoded.')
    const targetPeak = lines === 4 ? 0.54 : 0.5
    const sourcePeak = bufferPeak(studioBuffer)
    const normalizedGain = sourcePeak > 0 ? Math.min(2.4, targetPeak / sourcePeak) : 1
    const duration = Math.min(studioBuffer.duration / studioContract.rate, studioContract.maxDuration)
    const offsets = lines === 4 ? studioContract.offsets : [0]
    offsets.forEach((offset, index) => {
      scheduleBuffer(studioBuffer, studioCompressor, startAt + offset, {
        duration,
        rate: studioContract.rate,
        gain: normalizedGain,
        pan: lines === 4 ? [-0.24, -0.08, 0.08, 0.24][index] : 0,
      })
    })
    return duration + offsets[offsets.length - 1]
  }

  function markButton(button, durationSeconds) {
    for (const item of playableButtons) delete item.dataset.playing
    button.dataset.playing = 'true'
    scheduleTimer(() => { delete button.dataset.playing }, Math.ceil((durationSeconds + 0.08) * 1000))
  }

  async function playCandidate(button) {
    await ensureAudio()
    stopAll('')
    const id = button.dataset.play
    const duration = scheduleCandidate(id, context.currentTime + 0.02)
    markButton(button, duration)
    currentCue = id
    playCount += 1
    const [letter, kind] = id.split('-')
    playStatus.textContent = `正在播放：${letter} · ${kind === 'normal' ? '正常 Bomb' : '连锁清屏'} · ${duration.toFixed(2)} s`
  }

  async function playReference(button) {
    await ensureAudio()
    stopAll('')
    const id = button.dataset.reference
    const startAt = context.currentTime + 0.02
    const duration = id === 'hard-drop'
      ? scheduleHardDrop(startAt)
      : scheduleStudioClear(id === 'clear-4' ? 4 : 1, startAt)
    markButton(button, duration)
    currentCue = `reference-${id}`
    playCount += 1
    playStatus.textContent = `正在播放参照：${id === 'hard-drop' ? '现有硬降' : id === 'clear-4' ? '现有四行消除' : '现有单行消除'}`
  }

  async function playContext(button) {
    await ensureAudio()
    stopAll('')
    const letter = button.dataset.context
    const candidate = manifest.candidates.find((item) => item.id === letter)
    const start = context.currentTime + 0.03
    scheduleHardDrop(start)
    scheduleCandidate(`${letter}-normal`, start + 0.42)
    scheduleStudioClear(1, start + 0.98)
    scheduleCandidate(`${letter}-chain`, start + 1.42)
    const finalStart = start + 1.42 + candidate.chainDuration + 0.32
    scheduleStudioClear(4, finalStart)
    const duration = finalStart - start + 0.42
    markButton(button, duration)
    currentCue = `context-${letter}`
    playCount += 1
    playStatus.textContent = `上下文 ${letter}：硬降 → 正常崩裂 → 单行消除 → 连锁崩落 → 四行消除`
  }

  function selectedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value ?? 'reject'
  }

  function recordVerdict() {
    const normal = selectedValue('normal-verdict')
    const chain = selectedValue('chain-verdict')
    if (normal === 'reject' || chain === 'reject') {
      gateMode = 'reject'
      gateStatus.dataset.mode = 'reject'
      gateStatus.innerHTML = `<strong>未通过</strong> — 正常：${normal === 'reject' ? '全部不通过' : normal}；连锁：${chain === 'reject' ? '全部不通过' : chain}。请把判断回复到任务中。`
    } else if (normal !== chain) {
      gateMode = 'recompose'
      gateStatus.dataset.mode = 'recompose'
      gateStatus.innerHTML = `<strong>需要重组再试听</strong> — 正常 ${normal} + 连锁 ${chain} 不是同一字色；不能直接接入产品。`
    } else {
      gateMode = 'pair'
      gateStatus.dataset.mode = 'pair'
      gateStatus.innerHTML = `<strong>本页偏好：配对 ${normal}</strong> — 两项同组，但仍需你在任务中明确确认后才可打开产品接入。`
    }
  }

  async function dispose() {
    stopAll('')
    if (context && context.state !== 'closed') await context.close()
    contextClosed = true
    ready = false
  }

  for (const button of playableButtons) button.disabled = true
  for (const button of document.querySelectorAll('[data-play]')) button.addEventListener('click', () => { void playCandidate(button) })
  for (const button of document.querySelectorAll('[data-reference]')) button.addEventListener('click', () => { void playReference(button) })
  for (const button of document.querySelectorAll('[data-context]')) button.addEventListener('click', () => { void playContext(button) })
  stopButton.addEventListener('click', () => stopAll())
  recordButton.addEventListener('click', recordVerdict)
  volume.addEventListener('input', () => {
    const value = Number(volume.value) / 100
    volumeOutput.value = `${volume.value}%`
    if (context && output && context.state !== 'closed') output.gain.setTargetAtTime(value, context.currentTime, 0.012)
  })

  window.addEventListener('pagehide', () => { void dispose() }, { once: true })
  window.render_game_to_text = () => JSON.stringify({
    surface: 'T37 Bomb R3 stylized block-burst audition',
    ready,
    sourceCommit: manifest.sourceCommit,
    recipeVersion: manifest.recipeVersion,
    candidateCount: manifest.candidates.length,
    candidates: manifest.candidates.map((candidate) => ({ id: candidate.id, label: candidate.label, normalDuration: candidate.normalDuration, chainDuration: candidate.chainDuration })),
    currentCue,
    playCount,
    activeSources: activeVoices.size,
    pendingTimers: pendingTimers.size,
    volume: Number(volume.value) / 100,
    normalVerdict: selectedValue('normal-verdict'),
    chainVerdict: selectedValue('chain-verdict'),
    gateMode,
    contextState: context?.state ?? 'not-created',
    contextClosed,
    humanListeningRequired: true,
    productIntegrated: false,
  })
  window.advanceTime = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, milliseconds)))
  window.BOMB_R3_TEST = Object.freeze({
    getState: () => JSON.parse(window.render_game_to_text()),
    stopAll: () => stopAll(''),
    dispose,
    manifest,
  })

  void initializeAudio()
})()
