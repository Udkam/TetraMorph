import { NormalBombRendererSession } from './fixture';

declare global {
  interface Window {
    __R4A_FIXTURE_RESULT__?: unknown;
    __R4A_FIXTURE_ERROR__?: string;
  }
}

const host = document.querySelector<HTMLElement>('#fixture-host');
if (!host) throw new Error('Fixture host is missing.');
const session = new NormalBombRendererSession(host, () => {});
session.init()
  .then(() => {
    session.play('X', false);
    session.advance(220);
    window.__R4A_FIXTURE_RESULT__ = { fixture: session.fixtureState(), renderer: session.state() };
  })
  .catch((error) => { window.__R4A_FIXTURE_ERROR__ = error instanceof Error ? error.message : String(error); });
