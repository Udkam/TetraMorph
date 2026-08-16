import { FIXTURES, ProductRendererSession, reviewDurationMs, type Scene, type Variant } from './fixture';
import { ProductAudioSession } from './productAudioSession';

declare global {
  interface Window {
    __R5B_READY__?: boolean;
    __R5B_TEST__?: typeof api;
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

await window.__R5B_TEST__?.dispose('hmr-replace');
const need = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
};
const host = need<HTMLElement>('#canvas-host');
const status = need<HTMLElement>('#status');
const time = need<HTMLOutputElement>('#time');
const title = need<HTMLElement>('#scene-title');
const technical = need<HTMLElement>('#technical');
const form = need<HTMLFormElement>('#verdict');
const verdictOut = need<HTMLOutputElement>('#verdict-output');
const instanceId = Math.round(performance.timeOrigin + performance.now());
const timers = new Map<number, (completed: boolean) => void>();
const listeners: Array<() => void> = [];
const interactionLog: Array<{ variant: Variant; route: 'pointer' | 'keyboard'; at: number }> = [];
let ready = false;
let disposed = false;
let disposing = false;
let enabled = true;
let lastVariant: Variant = 'A';
let pageEpoch = 0;
let playCount = 0;
let pairSettledCount = 0;
let pairPhase: 'idle' | 'normal' | 'chain' | 'settled' = 'idle';
let error: string | null = null;
const renderer = new ProductRendererSession(host, update);
const audio = new ProductAudioSession(update);

function listen(target: EventTarget, type: string, handler: EventListener) {
  target.addEventListener(type, handler);
  listeners.push(() => target.removeEventListener(type, handler));
}
function clearTimers() {
  for (const [id, resolve] of timers) { clearTimeout(id); resolve(false); }
  timers.clear();
}
function waitFor(ms: number, epoch: number): Promise<boolean> {
  return new Promise((resolve) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      resolve(epoch === pageEpoch && !disposed && enabled);
      update();
    }, ms);
    timers.set(id, resolve);
  });
}
const activation = (scene: Scene) => FIXTURES[scene].activation;
function isCurrent(epoch: number): boolean { return epoch === pageEpoch && !disposed && !disposing && enabled; }
function invalidate(reason: string) {
  pageEpoch += 1;
  clearTimers();
  audio.stopReusable(reason);
  renderer.stop();
  pairPhase = 'idle';
  return pageEpoch;
}
async function runEvent(epoch: number, scene: Scene, variant: Variant, reduced = false, deterministic = false): Promise<boolean> {
  if (!isCurrent(epoch)) return false;
  const result = await audio.play(scene, variant, reduced, activation(scene), () => {
    if (isCurrent(epoch)) renderer.play(scene, reduced, deterministic);
  });
  if (!result.started || !isCurrent(epoch)) return false;
  playCount += 1;
  update();
  return true;
}
async function playEvent(scene: Scene, variant: Variant, reduced = false, deterministic = false): Promise<boolean> {
  const epoch = invalidate('new-event');
  lastVariant = variant;
  return runEvent(epoch, scene, variant, reduced, deterministic);
}
async function playPair(variant: Variant, route: 'pointer' | 'keyboard' = 'pointer'): Promise<boolean> {
  const epoch = invalidate('new-pair');
  lastVariant = variant;
  interactionLog.push({ variant, route, at: performance.now() });
  pairPhase = 'normal';
  update();
  if (!await runEvent(epoch, 'normal', variant, false, false)) return false;
  if (!await waitFor(reviewDurationMs('normal', false) + 50, epoch)) return false;
  pairPhase = 'chain';
  update();
  if (!await runEvent(epoch, 'chain', variant, false, false)) return false;
  if (!await waitFor(reviewDurationMs('chain', false) + 50, epoch)) return false;
  if (!isCurrent(epoch)) return false;
  renderer.stop();
  audio.stopReusable('pair-settled');
  pairPhase = 'settled';
  pairSettledCount += 1;
  update();
  return true;
}
function stop() { invalidate('stop'); update(); }
async function restart() { return playPair(lastVariant, 'pointer'); }
function toggle() {
  if (enabled) {
    pageEpoch += 1;
    clearTimers();
    enabled = false;
    audio.disable();
    renderer.stop();
    pairPhase = 'idle';
  } else {
    pageEpoch += 1;
    enabled = true;
    audio.enable();
  }
  need<HTMLButtonElement>('#disable').textContent = enabled ? '禁用声音' : '重新启用';
  update();
}
function fail(value: unknown) {
  error = value instanceof Error ? value.message : String(value);
  stop();
  console.error(value);
}
function update() {
  const rendererState = renderer.state();
  const audioState = audio.state();
  time.value = `${Math.round(rendererState.elapsedMs)} ms`;
  title.textContent = `真实 Core · ${rendererState.scene === 'chain' ? 'row-39 连锁' : '正常 Bomb'}`;
  status.textContent = disposed ? '实例已终止' : error ? `已停止：${error}` : ready ? '生产 Renderer / AudioEngine 证据页就绪' : '正在准备生产 Renderer…';
  technical.textContent = `Instance ${instanceId} · Canvas ${rendererState.canvasCount} · Context ${audioState.liveContexts} · Source ${audioState.eventSources} · Timer ${timers.size}`;
  document.body.dataset.ready = String(ready && !disposed && !disposing);
}

listen(document, 'click', ((event: MouseEvent) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!button) return;
  const variant = button.dataset.pair as Variant | undefined;
  if (variant) void playPair(variant, event.detail === 0 ? 'keyboard' : 'pointer').catch(fail);
  else if (button.id === 'stop') stop();
  else if (button.id === 'restart') void restart().catch(fail);
  else if (button.id === 'disable') toggle();
  else if (button.id === 'reduced') void playEvent('chain', 'A', true, true).catch(fail);
}) as EventListener);
listen(form, 'submit', ((event: SubmitEvent) => {
  event.preventDefault();
  const value = new FormData(form).get('verdict') ?? 'reject';
  verdictOut.value = `本页临时记录：${value}；未持久化，也不构成接受。`;
}) as EventListener);

function state() {
  const selected = document.querySelector<HTMLInputElement>('input[name=verdict]:checked');
  return { instanceId, ready: ready && !disposed && !disposing, disposed, disposing, enabled, pageEpoch, playCount, pairPhase, pairSettledCount, interactionLog: [...interactionLog], verdict: selected?.value ?? 'reject', pendingTimers: timers.size, listenerCount: listeners.length, renderer: renderer.state(), audio: audio.state(), fixture: renderer.fixtureState(), canvasCount: document.querySelectorAll('canvas').length, domCellCount: document.querySelectorAll('[data-cell]').length, qaGlobals: window.__R5B_TEST__ === api, error };
}
let disposePromise: Promise<void> | null = null;
function dispose(_reason = 'destroy') {
  if (disposePromise) return disposePromise;
  pageEpoch += 1;
  disposePromise = (async () => {
    disposing = true;
    ready = false;
    clearTimers();
    for (const remove of listeners.splice(0)) remove();
    renderer.dispose();
    await audio.dispose();
    disposed = true;
    disposing = false;
    if (window.__R5B_TEST__ === api) {
      delete window.__R5B_TEST__;
      delete window.__R5B_READY__;
      delete window.render_game_to_text;
      delete window.advanceTime;
    }
    update();
  })();
  return disposePromise;
}
const api = Object.freeze({ getState: state, prime: (variant: Variant = 'A') => audio.prime(variant), playEvent, playPair, stop, restart, disable: () => { if (enabled) toggle(); }, enable: () => { if (!enabled) toggle(); }, dispose, hotDispose: () => dispose('vite-hmr') });
window.__R5B_TEST__ = api;
window.render_game_to_text = () => JSON.stringify(state());
window.advanceTime = (ms) => renderer.advance(Math.max(0, ms));
listen(window, 'pagehide', (() => void dispose('pagehide')) as EventListener);
import.meta.hot?.dispose(() => dispose('vite-hmr'));
renderer.init().then(() => {
  if (disposed) return;
  ready = true;
  window.__R5B_READY__ = true;
  update();
}).catch(fail);
