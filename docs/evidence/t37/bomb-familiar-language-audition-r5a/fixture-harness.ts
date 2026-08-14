import { NORMAL_BOMB_IMPACT_MS, NORMAL_BOMB_REVIEW_MS, NormalBombRendererSession } from './fixture';

declare global {
  interface Window {
    __R5A_FIXTURE_READY__: boolean;
    __R5A_FIXTURE_ERROR__: string | null;
    __R5A_FIXTURE__: {
      play(reducedMotion?: boolean): void;
      pause(): void;
      advance(ms: number): void;
      stop(): void;
      state(): unknown;
      fixture(): unknown;
      dispose(): void;
    };
  }
}

const host = document.querySelector<HTMLElement>('#fixture-host');
const status = document.querySelector<HTMLOutputElement>('#status');
if (!host || !status) throw new Error('R5A fixture harness nodes are missing.');
const session = new NormalBombRendererSession(host, () => {});
window.__R5A_FIXTURE_READY__ = false;
window.__R5A_FIXTURE_ERROR__ = null;
window.__R5A_FIXTURE__ = Object.freeze({
  play: (reducedMotion = false) => session.play('A', reducedMotion),
  pause: () => session.pause(),
  advance: (ms: number) => session.advance(ms),
  stop: () => session.stop(),
  state: () => session.state(),
  fixture: () => session.fixtureState(),
  dispose: () => session.dispose(),
});
window.addEventListener('pagehide', () => session.dispose(), { once: true });
session.init().then(() => {
  session.play('A', false);
  session.pause();
  session.advance(NORMAL_BOMB_IMPACT_MS + 0.01);
  const impact = session.state();
  if (impact.activeParticles <= 0) throw new Error('R5A production Renderer emitted no impact particles.');
  session.advance(NORMAL_BOMB_REVIEW_MS);
  const completed = session.state();
  if (!completed.cleanupComplete || completed.frameCallbackActive) throw new Error('R5A Renderer did not clean natural completion.');
  session.stop();
  window.__R5A_FIXTURE_READY__ = true;
  status.value = 'ready';
}).catch((error) => {
  window.__R5A_FIXTURE_ERROR__ = error instanceof Error ? error.message : String(error);
  status.value = window.__R5A_FIXTURE_ERROR__;
});
