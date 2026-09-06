import { FIXTURES, ProductRendererSession, reviewDurationMs, type Scene } from './fixture';
import { ProductAudioSession } from './productAudioSession';

declare global {
  interface Window {
    __R5C_READY__?: boolean;
    __R5C_TEST__?: typeof api;
    render_game_to_text?: () => string;
    advanceTime?: (milliseconds: number) => void;
  }
}

await window.__R5C_TEST__?.dispose('hmr-replace');

function need<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}.`);
  return element;
}

const host = need<HTMLElement>('#canvas-host');
const status = need<HTMLElement>('#status');
const time = need<HTMLOutputElement>('#time');
const title = need<HTMLElement>('#scene-title');
const technical = need<HTMLElement>('#technical');
const listeners: Array<() => void> = [];
const timers = new Map<number, (completed: boolean) => void>();
const instanceId = Math.round(performance.timeOrigin + performance.now());
const renderer = new ProductRendererSession(host, update);
const audio = new ProductAudioSession(update);

let ready = false;
let enabled = true;
let disposed = false;
let disposing = false;
let domRetired = false;
let error: string | null = null;
let epoch = 0;
let playCount = 0;
let sequenceCount = 0;
let sequencePhase: 'idle' | 'normal' | 'chain' | 'settled' = 'idle';

function listen(target: EventTarget, type: string, handler: EventListener): void {
  target.addEventListener(type, handler);
  listeners.push(() => target.removeEventListener(type, handler));
}

function clearTimers(): void {
  for (const [id, resolve] of timers) {
    clearTimeout(id);
    resolve(false);
  }
  timers.clear();
}

function waitFor(milliseconds: number, expectedEpoch: number): Promise<boolean> {
  return new Promise((resolve) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      resolve(expectedEpoch === epoch && enabled && !disposed && !disposing);
      update();
    }, milliseconds);
    timers.set(id, resolve);
  });
}

function current(expectedEpoch: number): boolean {
  return expectedEpoch === epoch && enabled && !disposed && !disposing;
}

function invalidate(reason: string): number {
  epoch += 1;
  clearTimers();
  audio.stopReusable();
  renderer.stop();
  sequencePhase = 'idle';
  void reason;
  return epoch;
}

function activation(scene: Scene) {
  return FIXTURES[scene].activation;
}

async function dispatchEvent(
  expectedEpoch: number,
  scene: Scene,
  reducedMotion = false,
  deterministic = false,
): Promise<boolean> {
  if (!current(expectedEpoch)) return false;
  const started = await audio.play(scene, reducedMotion, activation(scene), () => {
    if (current(expectedEpoch)) renderer.play(scene, reducedMotion, deterministic);
  });
  if (!started || !current(expectedEpoch)) return false;
  playCount += 1;
  update();
  return true;
}

async function playEvent(scene: Scene, reducedMotion = false, deterministic = false): Promise<boolean> {
  const expectedEpoch = invalidate('new-event');
  return dispatchEvent(expectedEpoch, scene, reducedMotion, deterministic);
}

async function playSequence(route: 'pointer' | 'keyboard' = 'pointer'): Promise<boolean> {
  const expectedEpoch = invalidate(`sequence-${route}`);
  sequencePhase = 'normal';
  update();
  if (!await dispatchEvent(expectedEpoch, 'normal')) return false;
  if (!await waitFor(reviewDurationMs('normal', false) + 50, expectedEpoch)) return false;
  sequencePhase = 'chain';
  update();
  if (!await dispatchEvent(expectedEpoch, 'chain')) return false;
  if (!await waitFor(reviewDurationMs('chain', false) + 50, expectedEpoch)) return false;
  if (!current(expectedEpoch)) return false;
  renderer.stop();
  audio.stopReusable();
  sequencePhase = 'settled';
  sequenceCount += 1;
  update();
  return true;
}

function stop(): void {
  invalidate('stop');
  update();
}

async function restart(): Promise<boolean> {
  return playSequence('pointer');
}

function toggleEnabled(): void {
  if (enabled) {
    epoch += 1;
    clearTimers();
    enabled = false;
    audio.disable();
    renderer.stop();
    sequencePhase = 'idle';
  } else {
    epoch += 1;
    enabled = true;
    audio.enable();
  }
  need<HTMLButtonElement>('#disable').textContent = enabled ? '禁用声音' : '重新启用';
  update();
}

function fail(value: unknown): void {
  error = value instanceof Error ? value.message : String(value);
  stop();
  console.error(value);
}

function update(): void {
  if (domRetired || (window.__R5C_TEST__ !== undefined && window.__R5C_TEST__ !== api)) return;
  const rendererState = renderer.state();
  const audioState = audio.state();
  time.value = `${Math.round(rendererState.elapsedMs)} ms`;
  title.textContent = rendererState.scene === 'chain'
    ? '真实 Core · row-39 连锁清屏'
    : '真实 Core · 正常 Bomb';
  status.textContent = disposed
    ? '实例已终止'
    : error
      ? `已停止：${error}`
      : ready
        ? '当前生产 Renderer / AudioEngine 已就绪'
        : '正在准备生产 Renderer…';
  technical.textContent = `Instance ${instanceId} · Canvas ${rendererState.canvasCount} · Context ${audioState.liveContexts} · Source ${audioState.activeEventSources} · Timer ${timers.size}`;
  document.body.dataset.ready = String(ready && !disposed && !disposing);
}

listen(document, 'click', ((event: MouseEvent) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!button) return;
  const route = event.detail === 0 ? 'keyboard' as const : 'pointer' as const;
  if (button.id === 'sequence') void playSequence(route).catch(fail);
  else if (button.id === 'normal') void playEvent('normal').catch(fail);
  else if (button.id === 'chain') void playEvent('chain').catch(fail);
  else if (button.id === 'reduced') void playEvent('chain', true, true).catch(fail);
  else if (button.id === 'stop') stop();
  else if (button.id === 'restart') void restart().catch(fail);
  else if (button.id === 'disable') toggleEnabled();
}) as EventListener);

function liveState() {
  return Object.freeze({
    instanceId,
    ready: ready && !disposed && !disposing,
    disposed,
    disposing,
    domRetired,
    enabled,
    epoch,
    playCount,
    sequenceCount,
    sequencePhase,
    pendingTimers: timers.size,
    listenerCount: listeners.length,
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-cell]').length,
    qaGlobals: window.__R5C_TEST__ === api,
    renderer: renderer.state(),
    audio: audio.state(),
    fixture: renderer.fixtureState(),
    error,
  });
}

type AuditionState = ReturnType<typeof liveState>;
let terminalSnapshot: AuditionState | null = null;

function state(): AuditionState {
  return terminalSnapshot ?? liveState();
}

let disposePromise: Promise<void> | null = null;

function dispose(_reason = 'destroy'): Promise<void> {
  if (disposePromise) return disposePromise;
  epoch += 1;
  disposePromise = (async () => {
    disposing = true;
    ready = false;
    clearTimers();
    for (const remove of listeners.splice(0)) remove();
    renderer.dispose();
    await audio.dispose();
    disposed = true;
    disposing = false;
    update();
    domRetired = true;
    if (window.__R5C_TEST__ === api) {
      delete window.__R5C_TEST__;
      delete window.__R5C_READY__;
      delete window.render_game_to_text;
      delete window.advanceTime;
    }
    terminalSnapshot = liveState();
  })();
  return disposePromise;
}

const api = Object.freeze({
  getState: state,
  playEvent,
  playSequence,
  stop,
  restart,
  disable: () => { if (enabled) toggleEnabled(); },
  enable: () => { if (!enabled) toggleEnabled(); },
  dispose,
  hotDispose: () => dispose('vite-hmr'),
});

window.__R5C_TEST__ = api;
window.render_game_to_text = () => JSON.stringify(state());
window.advanceTime = (milliseconds: number) => renderer.advance(Math.max(0, milliseconds));
listen(window, 'pagehide', (() => void dispose('pagehide')) as EventListener);
import.meta.hot?.dispose(() => dispose('vite-hmr'));

renderer.init().then(() => {
  if (disposed) return;
  ready = true;
  window.__R5C_READY__ = true;
  update();
}).catch(fail);
