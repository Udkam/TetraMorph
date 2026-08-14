import { NormalBombRendererSession } from './fixture';

declare global {
  interface Window {
    __R4A_FIXTURE_RESULT__?: unknown;
    __R4A_FIXTURE_ERROR__?: string;
    __R4A_FIXTURE_SESSION__?: {
      advance(ms: number): void;
      play(reducedMotion: boolean): void;
      pause(): void;
      state(): unknown;
      dispose(): void;
    };
  }
}

const host = document.querySelector<HTMLElement>('#fixture-host');
if (!host) throw new Error('Fixture host is missing.');
const session = new NormalBombRendererSession(host, () => {});
window.__R4A_FIXTURE_SESSION__ = {
  advance: (ms) => session.advance(ms),
  play: (reducedMotion) => session.play('X', reducedMotion),
  pause: () => session.pause(),
  state: () => session.state(),
  dispose: () => session.dispose(),
};
window.addEventListener('pagehide', () => session.dispose(), { once: true });
session.init()
  .then(() => {
    session.play('X', false);
    session.pause();
    session.advance(220.01);
    window.__R4A_FIXTURE_RESULT__ = { fixture: session.fixtureState(), renderer: session.state() };
  })
  .catch((error) => { window.__R4A_FIXTURE_ERROR__ = error instanceof Error ? error.message : String(error); });
