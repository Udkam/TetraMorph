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
  const observed = {
    label, consoleErrors: [], pageErrors: [], requestErrors: [], requests: [], events: [],
    icePhaseMarkers: { initialEnd: null, hmrArm: null, hmrEnd: null },
  };
  let sequence = 0;
  let requestSequence = 0;
  /** @type {'initial-freeze'|'pre-hmr'|'hmr'|'post-hmr'} */
  let icePhase = 'initial-freeze';
  let uiExitBoundaryArmed = false;
  /** @param {string} kind @param {Record<string, any>} detail @returns {Record<string, any>} */
  const record = (kind, detail) => {
    const event = { sequence: ++sequence, kind, ...detail };
    observed.events.push(event);
    return event;
  };
  /** @param {string} value */
  const isAppUrl = (value) => {
    try { return new URL(value).pathname === '/src/App.tsx'; } catch { return false; }
  };
  /** @type {WeakMap<import('playwright').Request, number>} */
  const requestIds = new WeakMap();
  /** @param {import('playwright').Request} request */
  const requestId = (request) => {
    const existing = requestIds.get(request);
    if (existing !== undefined) return existing;
    const allocated = ++requestSequence;
    requestIds.set(request, allocated);
    return allocated;
  };
  /** @param {import('playwright').Request} request */
  const requestDetail = (request) => {
    let mainFrame = false;
    try { mainFrame = request.frame() === page.mainFrame(); } catch { mainFrame = false; }
    return {
      requestId: requestId(request), url: request.url(), method: request.method(), resourceType: request.resourceType(),
      mainFrame, navigationRequest: request.isNavigationRequest(),
      ifNoneMatch: request.headers()['if-none-match'] ?? null,
    };
  };
  const phaseMarker = () => ({ eventIndex: observed.events.length, eventSequence: observed.events.at(-1)?.sequence ?? 0 });
  /** @type {WeakMap<import('playwright').Request, () => void>} */
  const appRequestSettlers = new WeakMap();
  /** @type {Array<Record<string, any>>} */
  const pendingDocumentRequests = [];
  Object.defineProperty(observed, 'iceResponsePromises', { value: [], enumerable: false });
  Object.defineProperty(observed, 'appResponsePromises', { value: [], enumerable: false });
  Object.defineProperty(observed, 'appRequestFinishedPromises', { value: [], enumerable: false });
  Object.defineProperty(observed, 'settleAppNetwork', {
    enumerable: false,
    value: async () => {
      let priorCount = -1;
      while (priorCount !== observed.appResponsePromises.length + observed.appRequestFinishedPromises.length) {
        priorCount = observed.appResponsePromises.length + observed.appRequestFinishedPromises.length;
        await Promise.all([...observed.appResponsePromises, ...observed.appRequestFinishedPromises]);
      }
    },
  });
  Object.defineProperty(observed, 'freezeIceResponseWindow', {
    enumerable: false,
    value: async () => {
      if (icePhase !== 'initial-freeze') throw new Error(`Cannot close Ice initial window from ${icePhase}.`);
      icePhase = 'pre-hmr';
      observed.icePhaseMarkers.initialEnd = phaseMarker();
      const responses = await Promise.all([...observed.iceResponsePromises]);
      responses.sort((left, right) => left.sequence - right.sequence);
      observed.iceResponses = responses;
      return responses;
    },
  });
  Object.defineProperty(observed, 'armHmrIceWindow', {
    enumerable: false,
    value: () => {
      if (icePhase !== 'pre-hmr') throw new Error(`Cannot arm Ice HMR window from ${icePhase}.`);
      icePhase = 'hmr';
      const marker = phaseMarker();
      observed.icePhaseMarkers.hmrArm = marker;
      return { ...marker };
    },
  });
  Object.defineProperty(observed, 'endHmrIceWindow', {
    enumerable: false,
    value: () => {
      if (icePhase !== 'hmr') throw new Error(`Cannot close Ice HMR window from ${icePhase}.`);
      icePhase = 'post-hmr';
      const marker = phaseMarker();
      observed.icePhaseMarkers.hmrEnd = marker;
      return { ...marker };
    },
  });
  Object.defineProperty(observed, 'armUiExitBoundary', {
    enumerable: false,
    value: () => {
      if (icePhase !== 'post-hmr' || uiExitBoundaryArmed) throw new Error('Cannot arm the UI-exit boundary twice or before HMR ends.');
      uiExitBoundaryArmed = true;
      return phaseMarker();
    },
  });
  Object.defineProperty(observed, 'recordHistoryCall', {
    enumerable: false,
    value: (/** @type {Record<string, any>} */ detail) => record('history-call', detail),
  });
  page.on('console', (message) => { if (message.type() === 'error') observed.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => observed.pageErrors.push(error.message));
  page.on('request', (request) => {
    const detail = requestDetail(request);
    const requestEvent = record('request', detail);
    observed.requests.push(requestEvent);
    if (detail.mainFrame === true && detail.navigationRequest === true && detail.resourceType === 'document') {
      pendingDocumentRequests.push(requestEvent);
    }
    if (isAppUrl(request.url())) {
      observed.appRequestFinishedPromises.push(new Promise((resolve) => appRequestSettlers.set(request, () => resolve(undefined))));
    }
  });
  page.on('requestfinished', (request) => {
    if (!isAppUrl(request.url())) return;
    record('app-requestfinished', requestDetail(request));
    appRequestSettlers.get(request)?.();
    appRequestSettlers.delete(request);
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? 'failed';
    observed.requestErrors.push(`${request.method()} ${request.url()}: ${errorText}`);
    const failedRequestId = requestId(request);
    const pendingIndex = pendingDocumentRequests.findIndex((event) => event.requestId === failedRequestId);
    if (pendingIndex >= 0) pendingDocumentRequests.splice(pendingIndex, 1);
    if (!isAppUrl(request.url())) return;
    record('app-requestfailed', { ...requestDetail(request), errorText });
    appRequestSettlers.get(request)?.();
    appRequestSettlers.delete(request);
  });
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    const matchIndex = pendingDocumentRequests.findIndex((event) => event.url === url);
    if (matchIndex >= 0) {
      const [requestEvent] = pendingDocumentRequests.splice(matchIndex, 1);
      record('document-navigation', {
        url, mainFrame: true, documentRequestId: requestEvent.requestId, documentRequestSequence: requestEvent.sequence,
      });
    } else if (pendingDocumentRequests.length > 0) {
      record('unbound-navigation', {
        url, mainFrame: true,
        pendingDocumentRequests: pendingDocumentRequests.map((event) => ({
          requestId: event.requestId, sequence: event.sequence, url: event.url,
        })),
      });
    } else {
      record('same-document-navigation', { url, mainFrame: true });
    }
  });
  page.on('websocket', (socket) => {
    record('websocket-open', { url: socket.url() });
    socket.on('framereceived', ({ payload }) => record('websocket-frame', {
      url: socket.url(), direction: 'received', encoding: typeof payload === 'string' ? 'utf8' : 'base64',
      body: typeof payload === 'string' ? payload : Buffer.from(payload).toString('base64'),
    }));
    socket.on('framesent', ({ payload }) => record('websocket-frame', {
      url: socket.url(), direction: 'sent', encoding: typeof payload === 'string' ? 'utf8' : 'base64',
      body: typeof payload === 'string' ? payload : Buffer.from(payload).toString('base64'),
    }));
  });
  page.on('response', (response) => {
    const request = response.request();
    if (isAppUrl(response.url())) {
      const status = response.status();
      const responseHeaders = response.headers();
      const appEvent = record('app-response', {
        ...requestDetail(request), status, contentType: responseHeaders['content-type'] ?? null,
        etag: responseHeaders.etag ?? null,
        bodyDisposition: status === 304 ? 'not-modified' : 'captured',
        bodyEncoding: status === 304 ? null : 'base64', bodyBase64: null,
      });
      observed.appResponsePromises.push(status === 304 ? Promise.resolve(appEvent) : response.body().then((bytes) => {
          appEvent.bodyBase64 = bytes.toString('base64');
          return appEvent;
        }).catch((error) => {
          appEvent.bodyError = String(error);
          return appEvent;
        }));
    }
    let parsed;
    try { parsed = new URL(response.url()); } catch { return; }
    if (parsed.pathname.split('/').at(-1) !== 'freeze-ice-cubes-hq.ogg') return;
    const redirectedFrom = request.redirectedFrom();
    const captureWindow = icePhase;
    const metadata = {
      requestId: requestId(request), url: response.url(), status: response.status(), method: request.method(), resourceType: request.resourceType(),
      contentType: response.headers()['content-type'] ?? null,
      redirectedFrom: redirectedFrom ? { url: redirectedFrom.url(), method: redirectedFrom.method() } : null,
      captureWindow, bodyEncoding: 'base64', body: null,
    };
    const responseKind = icePhase === 'initial-freeze' ? 'ice-response'
      : icePhase === 'pre-hmr' ? 'ice-response-pre-hmr'
        : icePhase === 'hmr' ? 'ice-response-hmr' : 'ice-response-post-hmr';
    const responseEvent = record(responseKind, metadata);
    if (icePhase !== 'initial-freeze') return;
    observed.iceResponsePromises.push(response.body().then((bytes) => {
      responseEvent.body = bytes.toString('base64');
      return { sequence: responseEvent.sequence, ...metadata, body: responseEvent.body };
    }).catch((error) => {
      responseEvent.bodyError = String(error);
      return { sequence: responseEvent.sequence, ...metadata, bodyError: responseEvent.bodyError };
    }));
  });
  return observed;
}

/** @param {import('playwright').Page} page @param {any} settings @param {any} observed */
export async function installInstrumentation(page, settings, observed) {
  const historyBinding = '__T37_MATERIAL_HISTORY_QA_RECORD__';
  await page.exposeBinding(historyBinding, (source, detail) => {
    if (source.page !== page || source.frame !== page.mainFrame()) return;
    observed.recordHistoryCall(detail);
  });
  await page.addInitScript((values) => {
    if (window.top !== window) return;
    const epochKey = 'tetramorph:t37-document-epoch';
    const previousEpoch = Number(sessionStorage.getItem(epochKey) ?? '0');
    const documentEpoch = Number.isSafeInteger(previousEpoch) && previousEpoch >= 0 ? previousEpoch + 1 : 1;
    sessionStorage.setItem(epochKey, String(documentEpoch));
    const initializedKey = 'tetramorph:t37-fixture-initialized';
    if (sessionStorage.getItem(initializedKey) !== 'yes') {
      localStorage.clear();
      localStorage.setItem('tetramorph:qa-seed', String(values.seed));
      localStorage.setItem('tetramorph:language:v1', values.language);
      localStorage.setItem('tetramorph:visual-theme:v1', values.theme);
      localStorage.setItem('tetramorph:reduced-motion:v1', values.reduced ? 'on' : 'off');
      localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['marathon', 'race', 'sprint', 'endgame']));
      sessionStorage.setItem(initializedKey, 'yes');
    }
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
    /** @param {any} value */
    const scopedIdentity = (value) => {
      const id = identity(value);
      return id === null ? null : { epoch: documentEpoch, id };
    };
    /** @type {Array<{context: AudioContext, record: {id: {epoch: number, id: number}|null, closed: boolean, closeCalls: number}}>} */
    const contexts = [];
    /** @type {Array<Record<string, any>>} */
    const contextEvents = [];
    let contextEventSequence = 0;
    /** @param {'create'|'close-call'|'close-resolve'|'close-reject'} kind @param {{epoch: number, id: number}|null} id @param {Record<string, any>} [detail] */
    const recordContextEvent = (kind, id, detail = {}) => {
      contextEvents.push({ sequence: ++contextEventSequence, kind, id, ...detail });
    };
    const browserWindow = /** @type {any} */ (window);
    let historyCallId = 0;
    let historyBindingTail = Promise.resolve();
    /** @type {string|null} */
    let historyBindingError = null;
    /** @type {{cause: string, transport: 'direct-event'|'view-transition-callback'}|null} */
    let activeHistoryCause = null;
    let uiExitClickArmed = false;
    /** @type {Event|null} */
    let uiExitClickEvent = null;
    let uiExitTransitionClaimCount = 0;
    let uiExitRootReleaseCount = 0;
    const uiExitHistoryCause = 'ui-exit-confirm-click';
    const nativeReplaceState = History.prototype.replaceState;
    const nativePushState = History.prototype.pushState;
    /** @param {'replaceState'|'pushState'} method @param {number} callId @param {string} beforeUrl @param {string} afterUrl @param {string|null} urlArgument */
    const emitHistoryCall = (method, callId, beforeUrl, afterUrl, urlArgument) => {
      const binding = browserWindow[values.historyBinding];
      if (typeof binding !== 'function') {
        historyBindingError = 'History QA binding is unavailable.';
        return;
      }
      const cause = activeHistoryCause?.cause ?? null;
      const causeTransport = activeHistoryCause?.transport ?? null;
      historyBindingTail = historyBindingTail.then(() => binding({ documentEpoch, callId, method, beforeUrl, afterUrl, urlArgument, cause, causeTransport }))
        .catch((error) => { historyBindingError = String(error); });
    };
    History.prototype.replaceState = function trackedReplaceState(data, unused, url) {
      const callId = ++historyCallId; const beforeUrl = window.location.href;
      const result = nativeReplaceState.call(this, data, unused, url);
      emitHistoryCall('replaceState', callId, beforeUrl, window.location.href, url === undefined ? null : String(url));
      return result;
    };
    History.prototype.pushState = function trackedPushState(data, unused, url) {
      const callId = ++historyCallId; const beforeUrl = window.location.href;
      const result = nativePushState.call(this, data, unused, url);
      emitHistoryCall('pushState', callId, beforeUrl, window.location.href, url === undefined ? null : String(url));
      return result;
    };
    const documentPrototype = /** @type {any} */ (Document.prototype);
    const nativeStartViewTransition = documentPrototype.startViewTransition;
    if (typeof nativeStartViewTransition === 'function') {
      documentPrototype.startViewTransition = function trackedStartViewTransition(/** @type {any} */ callback) {
        const transitionCause = activeHistoryCause;
        if (transitionCause?.cause === uiExitHistoryCause && transitionCause.transport === 'direct-event') {
          uiExitTransitionClaimCount += 1;
          if (uiExitTransitionClaimCount !== 1) {
            historyBindingError = 'UI-exit click causality was claimed by more than one View Transition.';
          }
          activeHistoryCause = null;
        }
        if (typeof callback !== 'function') return nativeStartViewTransition.call(this, callback);
        return nativeStartViewTransition.call(this, () => {
          const previousCause = activeHistoryCause;
          activeHistoryCause = transitionCause === null ? null : { cause: transitionCause.cause, transport: 'view-transition-callback' };
          try { return callback(); } finally { activeHistoryCause = previousCause; }
        });
      };
    }
    const NativeAudioContext = window.AudioContext ?? browserWindow.webkitAudioContext;
    if (NativeAudioContext) {
      const Wrapped = new Proxy(NativeAudioContext, {
        construct(target, args) {
          const context = Reflect.construct(target, args, target);
          const record = { id: scopedIdentity(context), closed: false, closeCalls: 0 };
          contexts.push({ context, record });
          recordContextEvent('create', record.id);
          const close = context.close.bind(context);
          context.close = async () => {
            record.closeCalls += 1;
            recordContextEvent('close-call', record.id, { call: record.closeCalls });
            try {
              const result = await close();
              record.closed = context.state === 'closed';
              recordContextEvent('close-resolve', record.id, { call: record.closeCalls, state: context.state });
              return result;
            } catch (error) {
              recordContextEvent('close-reject', record.id, { call: record.closeCalls, error: String(error) });
              throw error;
            }
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
      identity: scopedIdentity,
      drainHistory: async () => {
        while (true) {
          const tail = historyBindingTail;
          await tail;
          if (tail === historyBindingTail) break;
        }
        if (uiExitClickEvent !== null && (uiExitTransitionClaimCount !== 1 || uiExitRootReleaseCount !== 1 || activeHistoryCause !== null)) {
          historyBindingError = 'UI-exit click causality did not close its exact capture, View Transition, and root-bubble lifecycle.';
        }
        if (historyBindingError !== null) throw new Error(historyBindingError);
      },
      armUiExitClick: (/** @type {any} */ element) => {
        const root = element instanceof HTMLElement ? element.closest('#root') : null;
        if (uiExitClickArmed || !(element instanceof HTMLElement)
          || !element.matches('.action-sheet__actions > .primary-action')
          || !(root instanceof HTMLElement) || root !== document.getElementById('root')) {
          throw new Error('UI-exit click causality may only be armed once on the visible primary confirmation.');
        }
        uiExitClickArmed = true;
        const releaseAtRoot = (/** @type {Event} */ event) => {
          root.removeEventListener('click', releaseAtRoot);
          uiExitRootReleaseCount += 1;
          if (event !== uiExitClickEvent || uiExitRootReleaseCount !== 1
            || uiExitTransitionClaimCount !== 1 || activeHistoryCause !== null) {
            historyBindingError = 'UI-exit click causality was not released by the exact post-React root bubble.';
          }
        };
        const captureAtTarget = (/** @type {Event} */ event) => {
          element.removeEventListener('click', captureAtTarget, true);
          if (!event.isTrusted || uiExitClickEvent !== null || activeHistoryCause !== null) {
            historyBindingError = 'UI-exit click causality was not a unique trusted browser event.';
            return;
          }
          uiExitClickEvent = event;
          const directCause = { cause: uiExitHistoryCause, transport: /** @type {'direct-event'} */ ('direct-event') };
          activeHistoryCause = directCause;
        };
        root.addEventListener('click', releaseAtRoot);
        element.addEventListener('click', captureAtTarget, true);
      },
      snapshot: () => {
        /** @type {Record<string, number>} */
        const listenerCounts = {};
        for (const { owner, type } of activeListeners.values()) {
          const key = `${owner}:${type}`; listenerCounts[key] = (listenerCounts[key] ?? 0) + 1;
        }
        return {
          documentEpoch,
          qaId: scopedIdentity(/** @type {any} */ (window).__TETRAMORPH_QA__),
          canvasId: scopedIdentity(document.querySelector('canvas')),
          canvases: document.querySelectorAll('canvas').length,
          activeRafs: rafs.size,
          listenerCounts,
          contexts: contexts.map(({ context, record }) => ({ ...record, state: context.state })),
          liveContexts: contexts.filter(({ context, record }) => !record.closed && context.state !== 'closed').length,
          contextEventCursor: contextEvents.length,
          contextEvents: contextEvents.map((event) => ({ ...event, id: event.id ? { ...event.id } : null })),
        };
      },
    };
  }, { ...settings, historyBinding });
}

/** @param {import('playwright').Browser} browser @param {string} origin @param {any} settings */
export async function openMutation(browser, origin, settings) {
  const context = await browser.newContext({ viewport: settings.viewport, deviceScaleFactor: 1, reducedMotion: settings.reduced ? 'reduce' : 'no-preference' });
  try {
    const page = await context.newPage();
    const observed = attachObservers(page, settings.label ?? settings.item ?? 'mutation');
    await installInstrumentation(page, settings, observed);
    await page.goto(`${origin.replace(/\/$/u, '')}/play/mutation`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.getByTestId('game-screen').waitFor({ state: 'visible' });
    await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
    await page.waitForFunction(() => { const w = /** @type {any} */ (window); return Boolean(w.__TETRAMORPH_QA__ && w.__TETRAMORPH_LAYOUT_QA__ && w.render_game_to_text); });
    await page.evaluate(() => /** @type {any} */ (window).__TETRAMORPH_QA__.setFrozen(true));
    return { context, page, observed };
  } catch (error) {
    try { await context.close(); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Mutation page setup and context cleanup failed.'); }
    throw error;
  }
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
    const tracker = w.__MATERIAL_TRACKER__?.snapshot() ?? null;
    const navigationEntry = /** @type {PerformanceNavigationTiming|undefined} */ (performance.getEntriesByType('navigation').at(-1));
    let boardProbe = null;
    try {
      const captured = w.__TETRAMORPH_QA__?.captureBoardPng();
      if (captured) boardProbe = { frame: captured.frame, resolution: captured.resolution, outputPixels: captured.outputPixels, pixelProbe: captured.pixelProbe };
    } catch (error) { boardProbe = { error: String(error) }; }
    return {
      state, renderer, layout, boardProbe,
      textState: w.render_game_to_text?.() ?? null,
      tracker,
      navigation: { epoch: tracker?.documentEpoch ?? null, type: navigationEntry?.type ?? null, url: location.href },
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
