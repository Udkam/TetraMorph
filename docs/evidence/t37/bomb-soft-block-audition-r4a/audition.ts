import { measureCompleteGraphs, R4AAudioSession, type CandidateId } from './audioGraph';
import {
  NORMAL_BOMB_DURATION_MS,
  NORMAL_BOMB_IMPACT_MS,
  NormalBombRendererSession,
} from './fixture';

interface ScheduleEvidence {
  candidate: CandidateId;
  reducedMotion: boolean;
  visualStartedAtMs: number;
  visualAudioClockSeconds: number;
  scheduledFromSeconds: number;
  audioStartAtSeconds: number;
  audioOffsetMs: number;
}

declare global {
  interface Window {
    __R4A_READY__: boolean;
    __R4A_TEST__: {
      getState(): ReturnType<typeof getState>;
      playCandidate(id: CandidateId): Promise<void>;
      runReducedTechnical(id: CandidateId, atMs?: number): Promise<ReturnType<typeof getState>>;
      measureCompleteGraphs: typeof measureCompleteGraphs;
      stop(): void;
      dispose(): Promise<void>;
    };
    render_game_to_text(): string;
    advanceTime(ms: number): void;
  }
}

await window.__R4A_TEST__?.dispose?.();

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`R4A page is missing ${selector}`);
  return element;
};
const host = required<HTMLElement>('#canvas-host');
const renderStatus = required<HTMLElement>('#render-status');
const livePill = required<HTMLElement>('.live-pill');
const phaseLabel = required<HTMLElement>('#phase-label');
const timeValue = required<HTMLOutputElement>('#time-value');
const timelineFill = required<HTMLElement>('#timeline-fill');
const technicalStatus = required<HTMLElement>('#technical-status');
const verdictForm = required<HTMLFormElement>('#verdict-form');
const verdictOutput = required<HTMLOutputElement>('#verdict-output');
const interactiveButtons = [...document.querySelectorAll<HTMLButtonElement>('button')];

const audio = new R4AAudioSession();
const eventController = new AbortController();
const pendingTimers = new Set<number>();
let lastSchedule: ScheduleEvidence | null = null;
let lastCue: string | null = null;
let playCount = 0;
let disposed = false;
let lastError: string | null = null;
let hostWidth = 0;

const updateUi = (): void => {
  const state = renderer.state();
  const active = state.activeCandidate;
  const productElapsed = state.elapsedMs;
  timelineFill.style.width = `${Math.min(100, productElapsed / NORMAL_BOMB_DURATION_MS * 100)}%`;
  timeValue.value = `${Math.round(productElapsed)} ms`;
  for (const card of document.querySelectorAll<HTMLElement>('[data-candidate-card]')) {
    card.classList.toggle('active', card.dataset.candidateCard === active);
  }
  if (!state.ready) phaseLabel.textContent = disposed ? '页面已释放' : '正在准备生产 Renderer…';
  else if (state.cleanupComplete) phaseLabel.textContent = '动画与粒子已完全清理。';
  else if (!active) phaseLabel.textContent = lastCue ? `已停止：${lastCue}` : '请选择 X、Y 或 Z 开始';
  else if (productElapsed < NORMAL_BOMB_IMPACT_MS) phaseLabel.textContent = `候选 ${active} · 方块蓄力中，220 ms 触发声音`;
  else if (productElapsed < 360) phaseLabel.textContent = `候选 ${active} · 崩裂接触`;
  else if (productElapsed < NORMAL_BOMB_DURATION_MS) phaseLabel.textContent = `候选 ${active} · 局部余波`;
  else phaseLabel.textContent = `候选 ${active} · 正在排空粒子`;
  technicalStatus.textContent = `Canvas ${state.canvasCount} · Sources ${audio.state().activeSources} · Timers ${pendingTimers.size}`;
  renderStatus.textContent = state.ready ? '生产 Renderer 就绪' : '正在准备';
  livePill.classList.toggle('ready', state.ready && !lastError);
  document.body.dataset.reviewState = lastError ? 'error' : active ? 'running' : state.cleanupComplete ? 'complete' : 'idle';
};

const renderer = new NormalBombRendererSession(host, updateUi);
const resizeObserver = new ResizeObserver(([entry]) => {
  hostWidth = Math.round(entry?.contentRect.width ?? host.clientWidth);
  updateUi();
});
resizeObserver.observe(host);

const clearTimers = (): void => {
  for (const timer of pendingTimers) window.clearTimeout(timer);
  pendingTimers.clear();
};

const setTaskTimer = (callback: () => void, delay: number): void => {
  const timer = window.setTimeout(() => {
    pendingTimers.delete(timer);
    callback();
    updateUi();
  }, delay);
  pendingTimers.add(timer);
};

const setBusy = (busy: boolean): void => {
  for (const button of interactiveButtons) button.disabled = busy;
};

const fail = (error: unknown): void => {
  lastError = error instanceof Error ? error.message : String(error);
  document.body.dataset.reviewState = 'error';
  phaseLabel.textContent = `试听已停止：${lastError}`;
  console.error(error);
  setBusy(true);
  updateUi();
};

const stop = (): void => {
  clearTimers();
  audio.stopAll();
  renderer.stop();
  lastCue = lastCue ? `${lastCue}（已停止）` : '已停止';
  updateUi();
};

const startCandidate = async (id: CandidateId, reducedMotion = false, deterministic = false): Promise<void> => {
  clearTimers();
  setBusy(true);
  try {
    await audio.prime();
    audio.stopAll();
    const visualAudioClockSeconds = audio.currentTime();
    const visualStartedAtMs = performance.now();
    renderer.play(id, reducedMotion);
    if (deterministic) renderer.pause();
    const schedule = audio.scheduleCandidateAt(
      id,
      visualAudioClockSeconds,
      visualAudioClockSeconds + NORMAL_BOMB_IMPACT_MS / 1_000,
    );
    lastSchedule = {
      candidate: id,
      reducedMotion,
      visualStartedAtMs,
      visualAudioClockSeconds,
      scheduledFromSeconds: schedule.scheduledFrom,
      audioStartAtSeconds: schedule.startAt,
      audioOffsetMs: schedule.offsetMs,
    };
    lastCue = `候选 ${id}${reducedMotion ? ' · reduced technical' : ''}`;
    playCount += 1;
    updateUi();
  } finally {
    setBusy(false);
  }
};

const playReference = async (kind: 'hard-drop' | 'studio'): Promise<void> => {
  clearTimers();
  renderer.stop();
  setBusy(true);
  try {
    if (kind === 'hard-drop') await audio.playHardDrop();
    else await audio.playStudioOneLine();
    lastCue = kind === 'hard-drop' ? '参照 · 硬降' : '参照 · Studio 单行';
    playCount += 1;
    updateUi();
  } finally {
    setBusy(false);
  }
};

const compare = async (id: CandidateId): Promise<void> => {
  await playReference('hard-drop');
  lastCue = `参照硬降 → 候选 ${id}`;
  setTaskTimer(() => { void startCandidate(id).catch(fail); }, 430);
  updateUi();
};

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-play]')) {
  button.addEventListener('click', () => { void startCandidate(button.dataset.play as CandidateId).catch(fail); }, { signal: eventController.signal });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-compare]')) {
  button.addEventListener('click', () => { void compare(button.dataset.compare as CandidateId).catch(fail); }, { signal: eventController.signal });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reference]')) {
  button.addEventListener('click', () => { void playReference(button.dataset.reference as 'hard-drop' | 'studio').catch(fail); }, { signal: eventController.signal });
}
required<HTMLButtonElement>('#stop-all').addEventListener('click', stop, { signal: eventController.signal });

verdictForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const verdict = new FormData(verdictForm).get('verdict')?.toString() ?? 'reject';
  const reasons = new FormData(verdictForm).getAll('reason').map(String);
  const suffix = reasons.length ? `；原因标签 ${reasons.join(' / ')}` : '';
  verdictOutput.value = verdict === 'reject'
    ? `已记录：全部不通过${suffix}。请把结论告诉总控。`
    : `已记录：候选 ${verdict}${suffix}。这仍不是自动接受，请把选择告诉总控。`;
}, { signal: eventController.signal });

for (const input of document.querySelectorAll<HTMLInputElement>('.reason-group input')) input.name = 'reason';

function getState() {
  const verdict = required<HTMLInputElement>('input[name="verdict"]:checked').value;
  const reasons = [...document.querySelectorAll<HTMLInputElement>('.reason-group input:checked')].map((input) => input.value);
  return {
    ready: window.__R4A_READY__,
    disposed,
    reviewState: document.body.dataset.reviewState,
    lastCue,
    playCount,
    verdict,
    reasons,
    pendingTimers: pendingTimers.size,
    hostWidth,
    lastSchedule,
    renderer: renderer.state(),
    fixture: renderer.fixtureState(),
    audio: audio.state(),
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-cell]').length,
    error: lastError,
  };
}

const dispose = async (): Promise<void> => {
  if (disposed) return;
  disposed = true;
  eventController.abort();
  clearTimers();
  resizeObserver.disconnect();
  renderer.dispose();
  await audio.dispose();
  updateUi();
};

window.__R4A_READY__ = false;
window.__R4A_TEST__ = Object.freeze({
  getState,
  playCandidate: (id) => startCandidate(id),
  runReducedTechnical: async (id, atMs = NORMAL_BOMB_IMPACT_MS + 0.01) => {
    await startCandidate(id, true, true);
    renderer.advance(Math.max(0, atMs));
    return getState();
  },
  measureCompleteGraphs,
  stop,
  dispose,
});
window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: 'board x=0..9 left-to-right; visible y=20..39 top-to-bottom; playback time begins at warning onset',
  ...getState(),
});
window.advanceTime = (ms) => { renderer.pause(); renderer.advance(Math.max(0, ms)); updateUi(); };
window.addEventListener('pagehide', () => { void dispose(); }, { once: true, signal: eventController.signal });
import.meta.hot?.dispose(() => { void dispose(); });

renderer.init()
  .then(() => {
    if (disposed) return;
    window.__R4A_READY__ = true;
    document.body.dataset.ready = 'true';
    updateUi();
  })
  .catch(fail);
