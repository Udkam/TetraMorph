(() => {
  'use strict';

  const candidates = [
    {
      id: 'A',
      name: '直接冲击',
      accent: '#ff7a3d',
      description: '最直接、最紧凑；保留深沉爆炸的正面冲击，尾部收得最快。',
      normal: {
        duration: 0.92,
        recipe: 'Deep 0.00–0.92 s · 0.94× · 90–6200 Hz · 末端 160 ms 收束',
        tracks: [
          { source: 'deep', start: 0, offset: 0, duration: 0.92, rate: 1, gain: 0.94, highpass: 90, lowpass: 6200, fadeIn: 0.006, fadeOut: 0.16 },
        ],
      },
      chain: {
        duration: 2.74,
        recipe: '同一 Deep 起爆 + 低音 Muffled 长尾 · 56 ms 网格对齐三个克制传播触点',
        tracks: [
          { source: 'deep', start: 0, offset: 0, duration: 1.42, rate: 1, gain: 0.88, highpass: 82, lowpass: 5600, fadeIn: 0.006, fadeOut: 0.42 },
          { source: 'muffled', start: 0.045, offset: 0, duration: 2.69, rate: 0.93, gain: 0.39, highpass: 52, lowpass: 980, fadeIn: 0.018, fadeOut: 0.82 },
          { source: 'muffled', start: 0.224, offset: 0.08, duration: 0.19, rate: 0.88, gain: 0.065, highpass: 70, lowpass: 520, fadeIn: 0.008, fadeOut: 0.12 },
          { source: 'muffled', start: 0.336, offset: 0.08, duration: 0.17, rate: 0.84, gain: 0.052, highpass: 65, lowpass: 470, fadeIn: 0.008, fadeOut: 0.11 },
          { source: 'muffled', start: 0.448, offset: 0.08, duration: 0.16, rate: 0.81, gain: 0.042, highpass: 60, lowpass: 430, fadeIn: 0.008, fadeOut: 0.1 },
        ],
      },
    },
    {
      id: 'B',
      name: '圆润厚身',
      accent: '#ffad52',
      description: '在相同冲击下叠入很轻的低频身体，圆一点、少一点锐边。',
      normal: {
        duration: 1.08,
        recipe: 'Deep 主体 + Muffled 低频 18% · 80–5400 Hz · 210 ms 收束',
        tracks: [
          { source: 'deep', start: 0, offset: 0, duration: 1.08, rate: 0.99, gain: 0.84, highpass: 80, lowpass: 5400, fadeIn: 0.006, fadeOut: 0.21 },
          { source: 'muffled', start: 0.018, offset: 0, duration: 1.03, rate: 0.98, gain: 0.18, highpass: 58, lowpass: 820, fadeIn: 0.012, fadeOut: 0.32 },
        ],
      },
      chain: {
        duration: 2.96,
        recipe: '圆润 Boom 起爆 + 较长低频反射 · 56 ms 网格对齐四个衰减触点',
        tracks: [
          { source: 'deep', start: 0, offset: 0, duration: 1.56, rate: 0.98, gain: 0.8, highpass: 76, lowpass: 5000, fadeIn: 0.006, fadeOut: 0.5 },
          { source: 'muffled', start: 0.016, offset: 0, duration: 2.92, rate: 0.88, gain: 0.48, highpass: 48, lowpass: 850, fadeIn: 0.014, fadeOut: 1.05 },
          { source: 'muffled', start: 0.168, offset: 0.04, duration: 0.24, rate: 0.86, gain: 0.07, highpass: 55, lowpass: 440, fadeIn: 0.008, fadeOut: 0.16 },
          { source: 'muffled', start: 0.28, offset: 0.04, duration: 0.22, rate: 0.82, gain: 0.058, highpass: 52, lowpass: 400, fadeIn: 0.008, fadeOut: 0.15 },
          { source: 'muffled', start: 0.392, offset: 0.04, duration: 0.2, rate: 0.79, gain: 0.047, highpass: 48, lowpass: 370, fadeIn: 0.008, fadeOut: 0.14 },
          { source: 'muffled', start: 0.504, offset: 0.04, duration: 0.18, rate: 0.76, gain: 0.037, highpass: 45, lowpass: 340, fadeIn: 0.008, fadeOut: 0.13 },
        ],
      },
    },
    {
      id: 'C',
      name: '低沉远压',
      accent: '#e96836',
      description: '高频最克制，重心更低更远；清屏尾部最宽，但首击仍保持清楚。',
      normal: {
        duration: 1.16,
        recipe: 'Deep 降速 0.96× + 低通 3900 Hz · Muffled 低身 · 240 ms 收束',
        tracks: [
          { source: 'deep', start: 0, offset: 0, duration: 1.16, rate: 0.96, gain: 0.8, highpass: 70, lowpass: 3900, fadeIn: 0.006, fadeOut: 0.24 },
          { source: 'muffled', start: 0.024, offset: 0, duration: 1.11, rate: 0.9, gain: 0.25, highpass: 45, lowpass: 680, fadeIn: 0.012, fadeOut: 0.38 },
        ],
      },
      chain: {
        duration: 2.86,
        recipe: '低沉 Boom 起爆 + 宽而软的 Muffled 尾 · 56 ms 网格对齐三个更疏触点',
        tracks: [
          { source: 'deep', start: 0, offset: 0, duration: 1.5, rate: 0.95, gain: 0.77, highpass: 68, lowpass: 3800, fadeIn: 0.006, fadeOut: 0.5 },
          { source: 'muffled', start: 0.02, offset: 0, duration: 2.81, rate: 0.84, gain: 0.51, highpass: 42, lowpass: 700, fadeIn: 0.014, fadeOut: 0.98 },
          { source: 'muffled', start: 0.224, offset: 0.06, duration: 0.26, rate: 0.76, gain: 0.061, highpass: 42, lowpass: 330, fadeIn: 0.009, fadeOut: 0.18 },
          { source: 'muffled', start: 0.392, offset: 0.06, duration: 0.23, rate: 0.72, gain: 0.046, highpass: 40, lowpass: 300, fadeIn: 0.009, fadeOut: 0.16 },
          { source: 'muffled', start: 0.56, offset: 0.06, duration: 0.2, rate: 0.69, gain: 0.035, highpass: 38, lowpass: 280, fadeIn: 0.009, fadeOut: 0.14 },
        ],
      },
    },
  ];

  const sourceDefinitions = window.BOMB_R2_EMBEDDED;
  const grid = document.querySelector('#candidate-grid');
  const volume = document.querySelector('#master-volume');
  const volumeOutput = document.querySelector('#volume-output');
  const stopButton = document.querySelector('#stop-all');
  const playStatus = document.querySelector('#play-status');
  const gateStatus = document.querySelector('#gate-status');
  let context;
  let master;
  let decodedSources;
  let activeNodes = [];
  let activeButton;
  let completionTimer;

  const audioData = Object.freeze({
    sources: sourceDefinitions,
    candidates,
  });
  window.BOMB_R2_AUDITION = audioData;

  function renderCards() {
    grid.innerHTML = candidates.map((candidate) => `
      <article class="candidate" style="--accent: ${candidate.accent}" data-candidate="${candidate.id}">
        <header class="candidate-head">
          <span class="candidate-id">方案 ${candidate.id}</span>
          <h3>${candidate.name}</h3>
          <p>${candidate.description}</p>
        </header>
        ${renderCue(candidate, 'normal', '单炸弹 Boom')}
        ${renderCue(candidate, 'chain', '双炸弹清屏')}
      </article>
    `).join('');

    for (const button of document.querySelectorAll('.listen')) {
      button.addEventListener('click', () => playCue(button.dataset.candidate, button.dataset.kind, button));
    }
  }

  function renderCue(candidate, kind, label) {
    const cue = candidate[kind];
    return `
      <div class="cue">
        <div class="cue-label"><strong>${label}</strong><span class="duration">${cue.duration.toFixed(2)} s</span></div>
        <p class="recipe">${cue.recipe}</p>
        <button class="listen" type="button" data-candidate="${candidate.id}" data-kind="${kind}" aria-pressed="false">
          试听方案 ${candidate.id} · ${kind === 'normal' ? '单炸弹' : '清屏'}
        </button>
      </div>
    `;
  }

  function renderVerdicts(containerSelector, name) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = [
      ...candidates.map((candidate) => `<label><input type="radio" name="${name}" value="${candidate.id}" />方案 ${candidate.id}</label>`),
      `<label><input type="radio" name="${name}" value="none" checked />均不通过</label>`,
    ].join('');
  }

  async function ensureAudio() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -5;
      compressor.knee.value = 8;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.16;
      master.connect(compressor).connect(context.destination);
      updateVolume();
    }
    if (context.state === 'suspended') await context.resume();
    if (!decodedSources) {
      playStatus.textContent = '正在解码两份 CC0 录音…';
      decodedSources = Object.fromEntries(await Promise.all(Object.entries(sourceDefinitions).map(async ([id, definition]) => {
        const response = await fetch(definition.dataUri);
        const bytes = await response.arrayBuffer();
        return [id, await context.decodeAudioData(bytes)];
      })));
    }
  }

  function stopAll(message = '已停止') {
    clearTimeout(completionTimer);
    for (const node of activeNodes) {
      try { node.stop(); } catch { /* already stopped */ }
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    activeNodes = [];
    if (activeButton) activeButton.setAttribute('aria-pressed', 'false');
    activeButton = undefined;
    playStatus.textContent = message;
  }

  async function playCue(candidateId, kind, button) {
    const candidate = candidates.find((entry) => entry.id === candidateId);
    const cue = candidate?.[kind];
    if (!candidate || !cue) return;
    await ensureAudio();
    stopAll('准备播放');
    const startAt = context.currentTime + 0.035;
    activeButton = button;
    button.setAttribute('aria-pressed', 'true');

    for (const track of cue.tracks) {
      const source = context.createBufferSource();
      const highpass = context.createBiquadFilter();
      const lowpass = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = decodedSources[track.source];
      source.playbackRate.value = track.rate;
      highpass.type = 'highpass';
      highpass.frequency.value = track.highpass;
      highpass.Q.value = 0.55;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = track.lowpass;
      lowpass.Q.value = 0.55;
      source.connect(highpass).connect(lowpass).connect(gain).connect(master);

      const trackStart = startAt + track.start;
      const sustainEnd = trackStart + Math.max(track.fadeIn, track.duration - track.fadeOut);
      const trackEnd = trackStart + track.duration;
      gain.gain.setValueAtTime(0.0001, trackStart);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, track.gain), trackStart + track.fadeIn);
      gain.gain.setValueAtTime(Math.max(0.0001, track.gain), sustainEnd);
      gain.gain.exponentialRampToValueAtTime(0.0001, trackEnd);
      source.start(trackStart, track.offset, track.duration * track.rate);
      source.stop(trackEnd + 0.015);
      activeNodes.push(source, highpass, lowpass, gain);
    }

    playStatus.textContent = `正在播放：方案 ${candidate.id} · ${kind === 'normal' ? '单炸弹 Boom' : '双炸弹清屏'} · ${cue.duration.toFixed(2)} s`;
    completionTimer = window.setTimeout(() => stopAll('播放完成'), (cue.duration + 0.12) * 1000);
  }

  function updateVolume() {
    const value = Number(volume.value);
    volumeOutput.value = `${value}%`;
    if (master && context) {
      const normalized = value / 100;
      master.gain.setTargetAtTime(normalized, context.currentTime, 0.015);
    }
  }

  function recordComparison() {
    const normal = document.querySelector('input[name="normal-verdict"]:checked')?.value ?? 'none';
    const chain = document.querySelector('input[name="chain-verdict"]:checked')?.value ?? 'none';
    const boomChecked = document.querySelector('#boom-check').checked;
    const chainChecked = document.querySelector('#chain-check').checked;
    gateStatus.dataset.state = 'compared';
    gateStatus.innerHTML = `<strong>仅记录比较</strong> — 单炸弹：${normal === 'none' ? '均不通过' : `方案 ${normal}`}；清屏：${chain === 'none' ? '均不通过' : `方案 ${chain}`}；检查项：${Number(boomChecked) + Number(chainChecked)}/2。生产接入仍关闭，需在任务中由玩家明确接受。`;
  }

  renderCards();
  renderVerdicts('#normal-verdicts', 'normal-verdict');
  renderVerdicts('#chain-verdicts', 'chain-verdict');
  volume.addEventListener('input', updateVolume);
  stopButton.addEventListener('click', () => stopAll());
  document.querySelector('#record-verdict').addEventListener('click', recordComparison);
  window.addEventListener('pagehide', () => {
    stopAll('页面已释放');
    context?.close();
  }, { once: true });

  window.BOMB_R2_TEST = Object.freeze({
    play: (candidateId, kind) => playCue(candidateId, kind, document.querySelector(`[data-candidate="${candidateId}"][data-kind="${kind}"]`)),
    stop: () => stopAll(),
    getState: () => ({
      candidateCount: candidates.length,
      listeningButtons: document.querySelectorAll('.listen').length,
      active: Boolean(activeButton),
      status: playStatus.textContent,
      gate: gateStatus.textContent.trim(),
      sourceIds: Object.keys(sourceDefinitions),
      decoded: decodedSources ? Object.fromEntries(Object.entries(decodedSources).map(([id, buffer]) => [id, {
        duration: buffer.duration,
        channels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate,
      }])) : undefined,
    }),
  });
})();
