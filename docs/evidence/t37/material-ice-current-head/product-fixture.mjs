// @ts-check
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXPECTED_COPY, PROFILE, SEEDS, repo } from './evidence-contract.mjs';

const scenarioPath = join(repo, 'docs/evidence/t26/phase-d/mutation-scenarios.json');

export async function loadScenarios() {
  /** @type {any} */
  const parsed = JSON.parse(await readFile(scenarioPath, 'utf8'));
  for (const name of /** @type {Array<'freeze'|'bomb'|'multiplier'>} */ (['freeze', 'bomb', 'multiplier'])) {
    if (parsed[name]?.seed !== SEEDS[name]) throw new Error(`Fixture seed drift: ${name}.`);
    if (!Array.isArray(parsed[name]?.actions) || parsed[name].actions.length !== 3) {
      throw new Error(`Fixture action drift: ${name}.`);
    }
  }
  return parsed;
}

/** @param {any} scenarios @param {'freeze'|'bomb'|'multiplier'|'collapse'} item */
export function scenarioFor(scenarios, item) {
  const scenario = scenarios[PROFILE[item]];
  if (!scenario) throw new Error(`Missing fixture profile for ${item}.`);
  return scenario;
}

/** @param {import('playwright').Page} page @param {string} [label] */
export function attachObservers(page, label = 'page') {
  /** @type {any} */
  const observed = { label, consoleErrors: [], pageErrors: [], requestErrors: [], requests: [] };
  Object.defineProperty(observed, 'iceResponsePromises', { value: [], enumerable: false });
  page.on('console', (message) => { if (message.type() === 'error') observed.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => observed.pageErrors.push(error.message));
  page.on('requestfailed', (request) => observed.requestErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`));
  page.on('request', (request) => observed.requests.push(request.url()));
  page.on('response', (response) => {
    if (!response.url().includes('freeze-ice-cubes-hq.ogg')) return;
    observed.iceResponsePromises.push(response.body().then((bytes) => ({ url: response.url(), status: response.status(), body: bytes })));
  });
  return observed;
}

/** @param {import('playwright').Page} page */
export async function installInstrumentation(page) {
  await page.addInitScript(() => {
    const originalRandom = Crypto.prototype.getRandomValues;
    const cryptoOwner = globalThis.crypto;
    Crypto.prototype.getRandomValues = /** @type {Crypto['getRandomValues']} */ (function deterministicQaSeed(array) {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = Number(globalThis.localStorage?.getItem('tetramorph:qa-seed') ?? 49) >>> 0;
        return array;
      }
      return originalRandom.call(cryptoOwner, array);
    });

    const identities = new WeakMap(); let nextIdentity = 1;
    /** @param {any} value */
    const identity = (value) => {
      if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return null;
      if (!identities.has(value)) identities.set(value, nextIdentity++);
      return identities.get(value);
    };
    /** @type {Array<{context: AudioContext, record: {id: number|null, closed: boolean, closeCalls: number}}>} */
    const contexts = [];
    const browserWindow = /** @type {any} */ (window);
    const NativeAudioContext = window.AudioContext ?? browserWindow.webkitAudioContext;
    if (NativeAudioContext) {
      const Wrapped = new Proxy(NativeAudioContext, {
        construct(target, args) {
          const context = Reflect.construct(target, args, target);
          const record = { id: identity(context), closed: false, closeCalls: 0 };
          contexts.push({ context, record });
          const close = context.close.bind(context);
          context.close = async () => {
            record.closeCalls += 1;
            const result = await close();
            record.closed = true;
            return result;
          };
          return context;
        },
      });
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: Wrapped });
      if (browserWindow.webkitAudioContext) Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: Wrapped });
    }

    /** @type {WeakMap<object, number>} */
    const listenerIds = new WeakMap(); let nextListener = 1;
    /** @type {Map<string, {owner: string, type: string}>} */
    const activeListeners = new Map();
    /** @param {EventTarget} target */
    const targetName = (target) => target === window ? 'window' : target === document ? 'document' : null;
    /** @param {EventListenerOrEventListenerObject} listener */
    const listenerId = (listener) => {
      if (!listenerIds.has(listener)) listenerIds.set(listener, nextListener++);
      return listenerIds.get(listener);
    };
    /** @param {boolean|AddEventListenerOptions|EventListenerOptions|undefined} options */
    const capture = (options) => typeof options === 'boolean' ? options : Boolean(options?.capture);
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function trackedAdd(type, listener, options) {
      const owner = targetName(this);
      if (owner && listener) activeListeners.set(`${owner}:${type}:${capture(options)}:${listenerId(listener)}`, { owner, type });
      return nativeAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function trackedRemove(type, listener, options) {
      const owner = targetName(this);
      if (owner && listener) activeListeners.delete(`${owner}:${type}:${capture(options)}:${listenerId(listener)}`);
      return nativeRemove.call(this, type, listener, options);
    };

    const nativeRaf = window.requestAnimationFrame.bind(window);
    const nativeCancelRaf = window.cancelAnimationFrame.bind(window);
    const rafs = new Set();
    window.requestAnimationFrame = (callback) => {
      let handle = 0;
      handle = nativeRaf((time) => { rafs.delete(handle); callback(time); });
      rafs.add(handle);
      return handle;
    };
    window.cancelAnimationFrame = (handle) => { rafs.delete(handle); nativeCancelRaf(handle); };

    /** @type {any} */ (window).__MATERIAL_TRACKER__ = {
      identity,
      snapshot: () => {
        /** @type {Record<string, number>} */
        const listenerCounts = {};
        for (const { owner, type } of activeListeners.values()) {
          const key = `${owner}:${type}`; listenerCounts[key] = (listenerCounts[key] ?? 0) + 1;
        }
        return {
          qaId: identity(/** @type {any} */ (window).__TETRAMORPH_QA__),
          canvasId: identity(document.querySelector('canvas')),
          canvases: document.querySelectorAll('canvas').length,
          activeRafs: rafs.size,
          listenerCounts,
          contexts: contexts.map(({ context, record }) => ({ ...record, state: context.state })),
          liveContexts: contexts.filter(({ context, record }) => !record.closed && context.state !== 'closed').length,
        };
      },
    };
  });
}

/** @param {import('playwright').Browser} browser @param {string} origin @param {any} settings */
export async function openMutation(browser, origin, settings) {
  const context = await browser.newContext({ viewport: settings.viewport, deviceScaleFactor: 1, reducedMotion: settings.reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const observed = attachObservers(page, settings.label ?? settings.item ?? 'mutation');
  await installInstrumentation(page);
  await page.addInitScript((values) => {
    localStorage.clear();
    localStorage.setItem('tetramorph:qa-seed', String(values.seed));
    localStorage.setItem('tetramorph:language:v1', values.language);
    localStorage.setItem('tetramorph:visual-theme:v1', values.theme);
    localStorage.setItem('tetramorph:reduced-motion:v1', values.reduced ? 'on' : 'off');
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['marathon', 'race', 'sprint', 'endgame']));
  }, settings);
  await page.goto(`${origin.replace(/\/$/u, '')}/play/mutation`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('game-screen').waitFor({ state: 'visible' });
  await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
  await page.waitForFunction(() => { const w = /** @type {any} */ (window); return Boolean(w.__TETRAMORPH_QA__ && w.__TETRAMORPH_LAYOUT_QA__ && w.render_game_to_text); });
  await page.evaluate(() => /** @type {any} */ (window).__TETRAMORPH_QA__.setFrozen(true));
  return { context, page, observed };
}

/** @param {import('playwright').Page} page @param {string[]} actions */
export const runActions = (page, actions) => page.evaluate((requested) => {
  const qa = /** @type {any} */ (window).__TETRAMORPH_QA__;
  if (!qa) throw new Error('Missing product DEV QA surface.');
  for (const action of requested) qa.action(action);
}, actions);

/** @param {import('playwright').Page} page */
export const advanceToActive = (page) => page.evaluate(() => {
  const qa = /** @type {any} */ (window).__TETRAMORPH_QA__;
  if (!qa) throw new Error('Missing product DEV QA surface.');
  for (let tick = 0; tick <= 120; tick += 1) {
    const state = qa.getState();
    if (state.active !== null && state.status === 'playing' && state.phase === 'active') return tick;
    qa.advanceTicks(1);
  }
  throw new Error('The next active piece did not spawn within 120 ticks.');
});

/** @param {import('playwright').Page} page */
export async function snapshot(page) {
  return page.evaluate(() => {
    const w = /** @type {any} */ (window);
    const state = w.__TETRAMORPH_QA__?.getState() ?? null;
    const renderer = w.__TETRAMORPH_QA__?.getRendererSnapshot() ?? null;
    const layout = w.__TETRAMORPH_LAYOUT_QA__?.collect() ?? null;
    let boardProbe = null;
    try {
      const captured = w.__TETRAMORPH_QA__?.captureBoardPng();
      if (captured) boardProbe = { frame: captured.frame, resolution: captured.resolution, outputPixels: captured.outputPixels, pixelProbe: captured.pixelProbe };
    } catch (error) { boardProbe = { error: String(error) }; }
    return {
      state, renderer, layout, boardProbe,
      textState: w.render_game_to_text?.() ?? null,
      tracker: w.__MATERIAL_TRACKER__?.snapshot() ?? null,
      canvasCount: document.querySelectorAll('canvas').length,
      domCellCount: document.querySelectorAll('[data-game-cell], [data-cell], .board-cell').length,
      nextAria: document.querySelector('[data-testid="next-slot"]')?.getAttribute('aria-label') ?? null,
      root: {
        language: document.querySelector('.app')?.getAttribute('lang') ?? null,
        theme: document.querySelector('.app')?.getAttribute('data-theme') ?? null,
        reducedMotion: document.querySelector('.app')?.getAttribute('data-reduced-motion') ?? null,
      },
    };
  });
}

/** @param {any} value @param {string[]} errors @param {string} label */
export function assertLayout(value, errors, label) {
  const assertions = value.layout?.assertions;
  if (value.canvasCount !== 1 || assertions?.canvasCount !== 1) errors.push(`${label}: expected one Canvas`);
  if (value.domCellCount !== 0 || assertions?.domCellCount !== 0) errors.push(`${label}: expected zero DOM cells`);
  if (!assertions?.noHorizontalOverflow || !assertions?.noVerticalOverflow) errors.push(`${label}: page overflow`);
  if ((assertions?.minButtonWidth ?? 44) < 44 || (assertions?.minButtonHeight ?? 44) < 44) errors.push(`${label}: target below 44px`);
}

/** @param {any} value @param {'freeze'|'bomb'|'multiplier'|'collapse'} item @param {string} stage @param {string[]} errors */
export function assertItemSnapshot(value, item, stage, errors) {
  assertLayout(value, errors, `${item}/${stage}`);
  if (stage === 'next') {
    if (value.renderer?.previewMutationItem !== item) errors.push(`${item}/next: preview item mismatch`);
    for (const term of EXPECTED_COPY[item]) if (!value.nextAria?.includes(term)) errors.push(`${item}/next: aria misses ${term}`);
    if (/核心|携带/u.test(value.nextAria ?? '')) errors.push(`${item}/next: retired carrier language`);
  } else if (stage === 'active-ghost') {
    if (value.state?.mutationActiveCarrier?.item !== item) errors.push(`${item}/active: item mismatch`);
    if (value.renderer?.activeCells?.length !== 4 || value.renderer?.ghostCells?.length !== 4) errors.push(`${item}/active: four-cell identity missing`);
  } else if (stage === 'settled') {
    if (!value.state?.mutationCarriers?.some((/** @type {any} */ entry) => entry.item === item)) errors.push(`${item}/settled: material missing`);
    if (value.renderer?.mutationActivation !== null) errors.push(`${item}/settled: unexpected activation`);
  } else if (stage === 'clear') {
    if (value.state?.phase !== 'line-clear') errors.push(`${item}/clear: phase mismatch`);
    if (!value.state?.mutationCarriers?.some((/** @type {any} */ entry) => entry.item === item)) errors.push(`${item}/clear: captured material missing`);
    if (!value.renderer?.ordinaryLineClear) errors.push(`${item}/clear: renderer timeline missing`);
  } else if (stage === 'activation') {
    if (value.state?.mutationLastItem !== item) errors.push(`${item}/activation: Core item mismatch`);
    if (value.renderer?.mutationActivation?.item !== item) errors.push(`${item}/activation: renderer item mismatch`);
    if (!value.renderer?.ordinaryMultiLineClearCues?.some((/** @type {any} */ cue) => cue.committed && cue.visibleCellCount > 0)) errors.push(`${item}/activation: committed clear tail missing`);
  }
}
