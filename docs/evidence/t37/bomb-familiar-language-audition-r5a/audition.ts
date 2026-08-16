import { R5AAudioSession } from './audioSession';
import type { CandidateId } from './candidateContract';
import {
  NORMAL_BOMB_DURATION_MS,
  NORMAL_BOMB_IMPACT_MS,
  NormalBombRendererSession,
} from './fixture';

type ReferenceId = 'hard-drop' | 'studio';

interface ScheduleEvidence {
  candidate: CandidateId;
  reducedMotion: boolean;
  visualStartedAtMs: number;
  visualAudioClockSeconds: number;
  scheduledFromSeconds: number;
  audioStartAtSeconds: number;
  audioOffsetMs: number;
}

interface TerminalAudit {
  instanceId: number;
  reason: string;
  before: ReturnType<typeof getState>;
  after: ReturnType<typeof getState>;
}

declare global {
  interface Window {
    __R5A_READY__: boolean;
    __R5A_INSTANCE_COUNTER__?: number;
    __R5A_TERMINAL_AUDIT__?: TerminalAudit[];
    __R5A_TEST__: {
      getState(): ReturnType<typeof getState>;
      prime(): Promise<void>;
      playCandidate(id: CandidateId): Promise<void>;
      runReducedTechnical(id: CandidateId, atMs?: number): Promise<ReturnType<typeof getState>>;
      playReference(id: ReferenceId): Promise<void>;
      compare(reference: ReferenceId, id: CandidateId): Promise<void>;
      stop(): void;
      dispose(reason?: string): Promise<void>;
    };
    render_game_to_text(): string;
    advanceTime(ms: number): void;
  }
}

await window.__R5A_TEST__?.dispose?.('hmr-replace');

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`R5A page is missing ${selector}`);
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
const startButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-starts-audio]')];

const instanceId = (window.__R5A_INSTANCE_COUNTER__ ?? 0) + 1;
window.__R5A_INSTANCE_COUNTER__ = instanceId;
window.__R5A_TERMINAL_AUDIT__ ??= [];
window.__R5A_READY__ = false;

const eventController = new AbortController();
const pendingTimers = new Set<number>();
let requestEpoch = 0;
let lastSchedule: ScheduleEvidence | null = null;
let lastCue: string | null = null;
let playCount = 0;
let disposed = false;
let disposing = false;
let pageReady = false;
let lastError: string | null = null;
let hostWidth = 0;

const audio = new R5AAudioSession(() => updateUi());
const renderer = new NormalBombRendererSession(host, () => updateUi());

const resizeObserver = new ResizeObserver(([entry]) => {
  hostWidth = Math.round(entry?.contentRect.width ?? host.clientWidth);
  updateUi();
});
resizeObserver.observe(host);

function clearTimers(): void {
  for (const timer of pendingTimers) window.clearTimeout(timer);
  pendingTimers.clear();
}

function setTaskTimer(callback: () => void, delayMs: number): void {
  const timer = window.setTimeout(() => {
    pendingTimers.delete(timer);
    callback();
    updateUi();
  }, delayMs);
  pendingTimers.add(timer);
}

function setBusy(busy: boolean): void {
  for (const button of startButtons) button.disabled = busy;
}

function fail(error: unknown): void {
  if (disposed) return;
  lastError = error instanceof Error ? error.message : String(error);
  requestEpoch += 1;
  clearTimers();
  audio.stopReusable('page-error');
  renderer.stop();
  console.error(error);
  updateUi();
}

function updateUi(): void {
  const render = renderer.state();
  const sound = audio.state();
  const productElapsed = render.elapsedMs;
  timelineFill.style.width = `${Math.min(100, productElapsed / NORMAL_BOMB_DURATION_MS * 100)}%`;
  timeValue.value = `${Math.round(productElapsed)} ms`;
  for (const card of document.querySelectorAll<HTMLElement>('[data-candidate-card]')) {
    card.classList.toggle('active', card.dataset.candidateCard === render.activeCandidate);
  }
  if (disposed) phaseLabel.textContent = '页面实例已终止并释放';
  else if (lastError) phaseLabel.textContent = `试听已停止：${lastError}`;
  else if (!pageReady) phaseLabel.textContent = '正在准备生产 Renderer…';
  else if (render.cleanupComplete) phaseLabel.textContent = '完整动画、粒子与回调已清理；可继续试听';
  else if (sound.phase === 'priming') phaseLabel.textContent = '正在由本次操作解锁并加载试听音频…';
  else if (!render.activeCandidate) phaseLabel.textContent = lastCue ? `已就绪：${lastCue}` : '请选择 A、B 或 C 开始';
  else if (productElapsed < NORMAL_BOMB_IMPACT_MS) phaseLabel.textContent = `候选 ${render.activeCandidate} · 220 ms 时声音与冲击同步`;
  else if (productElapsed < 360) phaseLabel.textContent = `候选 ${render.activeCandidate} · 方块冲击`;
  else if (productElapsed < NORMAL_BOMB_DURATION_MS) phaseLabel.textContent = `候选 ${render.activeCandidate} · 局部余波`;
  else phaseLabel.textContent = `候选 ${render.activeCandidate} · 正在排空粒子`;
  technicalStatus.textContent = [
    `Instance ${instanceId}`,
    `Canvas ${render.canvasCount}`,
    `Audio ${sound.phase}`,
    `Sources ${sound.activeSources}`,
    `Timers ${sound.timers + pendingTimers.size}`,
    `Frame ${render.frameCallbackActive ? 1 : 0}`,
  ].join(' · ');
  renderStatus.textContent = pageReady && !disposed ? '生产 Renderer 就绪' : disposed ? '已释放' : '正在准备';
  livePill.classList.toggle('ready', pageReady && !disposed && !lastError);
  document.body.dataset.ready = String(pageReady && !disposed);
  document.body.dataset.reviewState = lastError
    ? 'error'
    : disposed
      ? 'disposed'
      : render.activeCandidate
        ? 'running'
        : render.cleanupComplete
          ? 'complete'
          : sound.phase;
}

async function startCandidate(
  id: CandidateId,
  options: { reducedMotion?: boolean; deterministic?: boolean } = {},
): Promise<void> {
  if (disposed) throw new Error('R5A page is disposed.');
  const operationEpoch = ++requestEpoch;
  clearTimers();
  setBusy(true);
  try {
    await audio.prime();
    if (disposed || operationEpoch !== requestEpoch) return;
    const visualAudioClockSeconds = audio.currentTime();
    const visualStartedAtMs = performance.now();
    renderer.play(id, options.reducedMotion ?? false);
    if (options.deterministic) renderer.pause();
    const schedule = audio.scheduleCandidateAt(
      id,
      visualAudioClockSeconds,
      visualAudioClockSeconds + NORMAL_BOMB_IMPACT_MS / 1_000,
    );
    lastSchedule = {
      candidate: id,
      reducedMotion: options.reducedMotion ?? false,
      visualStartedAtMs,
      visualAudioClockSeconds,
      scheduledFromSeconds: schedule.scheduledFrom,
      audioStartAtSeconds: schedule.startAt,
      audioOffsetMs: schedule.offsetMs,
    };
    lastCue = `候选 ${id}${options.reducedMotion ? ' · reduced technical' : ''}`;
    playCount += 1;
    updateUi();
  } finally {
    if (operationEpoch === requestEpoch && !disposed) setBusy(false);
  }
}

async function playReference(id: ReferenceId): Promise<void> {
  if (disposed) throw new Error('R5A page is disposed.');
  const operationEpoch = ++requestEpoch;
  clearTimers();
  renderer.stop();
  setBusy(true);
  try {
    await audio.playReference(id);
    if (disposed || operationEpoch !== requestEpoch) return;
    lastCue = id === 'hard-drop' ? '参照 · Action A 硬降' : '参照 · Studio 完整单行';
    playCount += 1;
    updateUi();
  } finally {
    if (operationEpoch === requestEpoch && !disposed) setBusy(false);
  }
}

async function compare(reference: ReferenceId, id: CandidateId): Promise<void> {
  await playReference(reference);
  if (disposed) return;
  const label = reference === 'hard-drop' ? '硬降' : 'Studio';
  lastCue = `${label} → 候选 ${id}`;
  const delay = reference === 'hard-drop' ? 280 : 360;
  setTaskTimer(() => { void startCandidate(id).catch(fail); }, delay);
  updateUi();
}

function stop(): void {
  if (disposed) return;
  requestEpoch += 1;
  clearTimers();
  audio.stopReusable('page-stop');
  renderer.stop();
  lastCue = lastCue ? `${lastCue}（已停止）` : '已停止';
  setBusy(false);
  updateUi();
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-play]')) {
  button.addEventListener('click', () => {
    void startCandidate(button.dataset.play as CandidateId).catch(fail);
  }, { signal: eventController.signal });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-compare]')) {
  button.addEventListener('click', () => {
    void compare(button.dataset.reference as ReferenceId, button.dataset.compare as CandidateId).catch(fail);
  }, { signal: eventController.signal });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reference]')) {
  button.addEventListener('click', () => {
    void playReference(button.dataset.reference as ReferenceId).catch(fail);
  }, { signal: eventController.signal });
}
required<HTMLButtonElement>('#stop-all').addEventListener('click', stop, { signal: eventController.signal });

verdictForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(verdictForm);
  const verdict = form.get('verdict')?.toString() ?? 'reject';
  const reasons = form.getAll('reason').map(String);
  const suffix = reasons.length ? `；原因标签 ${reasons.join(' / ')}` : '';
  verdictOutput.value = verdict === 'reject'
    ? `已记录：全部不通过${suffix}。本页不会自动改变项目状态。`
    : `已记录：候选 ${verdict}${suffix}。这是待汇总的人耳输入，不是自动接受。`;
}, { signal: eventController.signal });

function getState() {
  const selected = document.querySelector<HTMLInputElement>('input[name="verdict"]:checked');
  const reasons = [...document.querySelectorAll<HTMLInputElement>('.reason-group input:checked')].map((input) => input.value);
  return {
    instanceId,
    ready: pageReady && !disposed,
    disposed,
    disposing,
    reviewState: document.body.dataset.reviewState,
    lastCue,
    playCount,
    verdict: selected?.value ?? 'reject',
    reasons,
    pendingTimers: pendingTimers.size,
    hostWidth,
    lastSchedule,
    renderer: renderer.state(),
    fixture: renderer.fixtureState(),
    audio: audio.state(),
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-cell]').length,
    terminalAuditCount: window.__R5A_TERMINAL_AUDIT__?.length ?? 0,
    error: lastError,
  };
}

async function dispose(reason = 'dispose'): Promise<void> {
  if (disposed || disposing) return;
  disposing = true;
  const before = getState();
  requestEpoch += 1;
  eventController.abort();
  clearTimers();
  resizeObserver.disconnect();
  renderer.dispose();
  await audio.dispose(reason);
  disposed = true;
  disposing = false;
  pageReady = false;
  window.__R5A_READY__ = false;
  setBusy(true);
  updateUi();
  window.__R5A_TERMINAL_AUDIT__?.push({ instanceId, reason, before, after: getState() });
}

window.__R5A_TEST__ = Object.freeze({
  getState,
  prime: () => audio.prime(),
  playCandidate: (id) => startCandidate(id),
  runReducedTechnical: async (id, atMs = NORMAL_BOMB_IMPACT_MS + 0.01) => {
    await startCandidate(id, { reducedMotion: true, deterministic: true });
    renderer.advance(Math.max(0, atMs));
    return getState();
  },
  playReference,
  compare,
  stop,
  dispose,
});
window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: 'board x=0..9 left-to-right; visible y=20..39 top-to-bottom; playback begins at warning onset',
  ...getState(),
});
window.advanceTime = (ms) => {
  renderer.pause();
  renderer.advance(Math.max(0, ms));
  updateUi();
};
window.addEventListener('pagehide', () => { void dispose('pagehide'); }, { once: true, signal: eventController.signal });
import.meta.hot?.dispose(() => { void dispose('vite-hmr'); });

renderer.init().then(() => {
  if (disposed) return;
  pageReady = true;
  window.__R5A_READY__ = true;
  updateUi();
}).catch(fail);
