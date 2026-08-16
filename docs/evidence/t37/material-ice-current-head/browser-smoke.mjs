// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, utimesSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { AUTH, BASE, HUMAN_STATUS, ICE, SEEDS, repo, root } from './evidence-contract.mjs';
import { advanceToActive, loadScenarios, openMutation, runActions, scenarioFor, snapshot } from './product-fixture.mjs';

const origin = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:5193';
const normalizedOrigin = new URL(origin).origin;
const icePathname = new URL(`/${ICE.path.replace(/^\/+/u, '')}`, `${normalizedOrigin}/`).pathname;
const appPathname = '/src/App.tsx';
const catalogPath = 'src/game/audio/audioAssetCatalog.ts';
/** @type {string[]} */
const failures = [];
/** @param {unknown} value @param {string} label */
const check = (value, label) => { if (!value) failures.push(label); };
/** @param {import('node:crypto').BinaryLike} bytes */
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {...string} args */
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
/** @param {string} head @param {string} path */
const gitBytes = (head, path) => execFileSync('git', ['show', `${head}:${path}`], { cwd: repo });
/** @param {any} tracker */
const relevantListeners = (tracker) => {
  const counts = tracker?.listenerCounts ?? {};
  return Object.fromEntries(Object.keys(counts)
    .filter((key) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key))
    .sort()
    .map((key) => [key, Number(counts[key])]));
};
/** @param {any} before @param {any} after */
const sameRelevantListeners = (before, after) => Boolean(before?.listenerCounts && after?.listenerCounts)
  && JSON.stringify(relevantListeners(before)) === JSON.stringify(relevantListeners(after));
/** @param {any} tracker */
const noRelevantListeners = (tracker) => Boolean(tracker?.listenerCounts)
  && Object.values(relevantListeners(tracker)).every((count) => count === 0);
/** @param {any} tracker */
const activeRafs = (tracker) => Number.isInteger(tracker?.activeRafs) ? Number(tracker.activeRafs) : -1;
/** @param {any} left @param {any} right */
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
/** @param {any} value @returns {{epoch: number, id: number}|null} */
const identityRecord = (value) => Number.isInteger(value?.epoch) && Number(value.epoch) >= 1 && Number.isInteger(value?.id) && Number(value.id) >= 1
  ? { epoch: Number(value.epoch), id: Number(value.id) } : null;
/** @param {any} left @param {any} right */
const sameIdentity = (left, right) => identityRecord(left) !== null && deepEqual(identityRecord(left), identityRecord(right));
/** @param {any} left @param {any} right */
const differentIdentity = (left, right) => identityRecord(left) !== null && identityRecord(right) !== null && !sameIdentity(left, right);
/** @param {any} tracker @returns {Array<{id: {epoch: number, id: number}|null, closed: boolean, closeCalls: number, state: string|null}>|null} */
const contextRecords = (tracker) => Array.isArray(tracker?.contexts) ? tracker.contexts.map((/** @type {any} */ entry) => ({
  id: identityRecord(entry?.id),
  closed: entry?.closed === true,
  closeCalls: Number.isInteger(entry?.closeCalls) ? Number(entry.closeCalls) : -1,
  state: typeof entry?.state === 'string' ? entry.state : null,
})) : null;
/** @param {any} tracker */
const contextEvents = (tracker) => Array.isArray(tracker?.contextEvents) ? tracker.contextEvents.map((/** @type {any} */ entry) => ({
  sequence: Number.isInteger(entry?.sequence) ? Number(entry.sequence) : -1,
  kind: typeof entry?.kind === 'string' ? entry.kind : null,
  id: identityRecord(entry?.id),
  ...(entry?.kind === 'close-call' || entry?.kind === 'close-resolve' || entry?.kind === 'close-reject'
    ? { call: Number.isInteger(entry?.call) ? Number(entry.call) : -1 } : {}),
  ...(entry?.kind === 'close-resolve' ? { state: typeof entry?.state === 'string' ? entry.state : null } : {}),
  ...(entry?.kind === 'close-reject' ? { error: typeof entry?.error === 'string' ? entry.error : null } : {}),
})) : null;
/** @param {any} tracker */
function validContextSnapshot(tracker) {
  const records = contextRecords(tracker); const events = contextEvents(tracker);
  const epoch = Number(tracker?.documentEpoch);
  if (!Number.isInteger(epoch) || epoch < 1 || records === null || events === null
    || tracker?.contextEventCursor !== events.length || tracker?.liveContexts !== records.filter((entry) => !entry.closed && entry.state !== 'closed').length) return false;
  const replay = new Map();
  for (const [index, event] of events.entries()) {
    if (event.sequence !== index + 1 || event.id === null || event.id.epoch !== epoch) return false;
    const key = `${event.id.epoch}:${event.id.id}`;
    if (event.kind === 'create') {
      if (replay.has(key)) return false;
      replay.set(key, { id: event.id, closeCalls: 0, closed: false });
    } else if (event.kind === 'close-call') {
      const value = replay.get(key);
      if (!value || value.closed || event.call !== value.closeCalls + 1 || event.call !== 1) return false;
      value.closeCalls = event.call;
    } else if (event.kind === 'close-resolve') {
      const value = replay.get(key);
      if (!value || value.closed || event.call !== value.closeCalls || event.call !== 1 || event.state !== 'closed') return false;
      value.closed = true;
    } else return false;
  }
  if (replay.size !== records.length) return false;
  return records.every((record) => {
    if (record.id === null || record.id.epoch !== epoch) return false;
    const value = replay.get(`${record.id.epoch}:${record.id.id}`);
    return value && value.closeCalls === record.closeCalls && value.closed === record.closed
      && (record.closed ? record.state === 'closed' : record.state !== null && record.state !== 'closed');
  });
}
/** @param {any} before @param {any} after */
const sameContextRecords = (before, after) => validContextSnapshot(before) && validContextSnapshot(after)
  && deepEqual(contextRecords(before), contextRecords(after)) && deepEqual(contextEvents(before), contextEvents(after));
/** @param {any} reentry @param {any} beforeHmr */
const exactPreHmrContextContinuity = (reentry, beforeHmr) => reentry?.liveContexts === 1 && beforeHmr?.liveContexts === 1
  && sameContextRecords(reentry, beforeHmr);
/** @param {any} before @param {any} after */
function closedContextSuccessors(before, after) {
  const baseline = contextRecords(before); const closed = contextRecords(after);
  const beforeEvents = contextEvents(before); const afterEvents = contextEvents(after);
  return validContextSnapshot(before) && validContextSnapshot(after) && baseline !== null && closed !== null
    && beforeEvents !== null && afterEvents !== null && closed.length === baseline.length
    && closed.every((entry, index) => sameIdentity(entry.id, baseline[index]?.id) && baseline[index]?.closed === false
      && baseline[index]?.state !== null && baseline[index]?.state !== 'closed' && baseline[index]?.closeCalls === 0
      && entry.closed && entry.state === 'closed' && entry.closeCalls === 1)
    && deepEqual(afterEvents.slice(0, beforeEvents.length), beforeEvents)
    && afterEvents.slice(beforeEvents.length).length === baseline.length * 2
    && baseline.every((entry) => {
      const delta = afterEvents.slice(beforeEvents.length).filter((/** @type {any} */ event) => sameIdentity(event.id, entry.id));
      return delta.length === 2 && delta[0]?.kind === 'close-call' && delta[1]?.kind === 'close-resolve';
    });
}
/** @param {any} before @param {any} after */
function exactReentryContexts(before, after) {
  const baseline = contextRecords(before); const reentry = contextRecords(after);
  const beforeEvents = contextEvents(before); const afterEvents = contextEvents(after);
  if (!validContextSnapshot(before) || !validContextSnapshot(after) || baseline === null || reentry === null
    || beforeEvents === null || afterEvents === null || reentry.length !== baseline.length + 1
    || !deepEqual(afterEvents.slice(0, beforeEvents.length), beforeEvents)) return false;
  const oldClosed = reentry.slice(0, baseline.length).every((entry, index) => sameIdentity(entry.id, baseline[index]?.id)
    && baseline[index]?.closed === false && baseline[index]?.state !== null && baseline[index]?.state !== 'closed' && baseline[index]?.closeCalls === 0
    && entry.closed && entry.state === 'closed' && entry.closeCalls === 1);
  const fresh = reentry.at(-1);
  const delta = afterEvents.slice(beforeEvents.length);
  return oldClosed && fresh !== undefined && fresh.id !== null && !baseline.some(({ id }) => sameIdentity(id, fresh.id))
    && !fresh.closed && fresh.state !== null && fresh.state !== 'closed' && fresh.closeCalls === 0
    && delta.length === 3 && delta[0]?.kind === 'close-call' && sameIdentity(delta[0]?.id, baseline.at(-1)?.id)
    && delta.some((/** @type {any} */ event) => event.kind === 'close-resolve' && sameIdentity(event.id, baseline.at(-1)?.id))
    && delta.some((/** @type {any} */ event) => event.kind === 'create' && sameIdentity(event.id, fresh.id));
}
/** @param {any} before @param {any} after @param {'same-owner'|'same-realm-replacement'|'document-reload'|'invalid'} branch */
function exactHmrContexts(before, after, branch) {
  const baseline = contextRecords(before); const result = contextRecords(after);
  const beforeEvents = contextEvents(before); const afterEvents = contextEvents(after);
  if (!validContextSnapshot(before) || !validContextSnapshot(after) || baseline === null || result === null
    || beforeEvents === null || afterEvents === null || before?.liveContexts !== 1 || after?.liveContexts !== 1) return false;
  if (branch === 'same-owner') return deepEqual(baseline, result) && deepEqual(beforeEvents, afterEvents);
  if (branch === 'document-reload') {
    const fresh = result[0];
    return after.documentEpoch === before.documentEpoch + 1 && baseline.filter((entry) => !entry.closed && entry.state !== 'closed').length === 1
      && baseline.filter((entry) => entry.closed).every((entry) => entry.closeCalls === 1 && entry.state === 'closed')
      && result.length === 1 && fresh?.id?.epoch === after.documentEpoch && !fresh.closed && fresh.closeCalls === 0 && fresh.state !== null && fresh.state !== 'closed'
      && afterEvents.length === 1 && afterEvents[0]?.kind === 'create' && sameIdentity(afterEvents[0]?.id, fresh.id);
  }
  if (branch !== 'same-realm-replacement' || baseline.length < 1 || result.length !== baseline.length + 1
    || !deepEqual(afterEvents.slice(0, beforeEvents.length), beforeEvents)) return false;
  const oldLive = baseline.at(-1); const retired = result[baseline.length - 1]; const fresh = result.at(-1);
  const unchangedPrefix = deepEqual(baseline.slice(0, -1), result.slice(0, baseline.length - 1));
  const baselineLive = oldLive !== undefined && oldLive.id !== null && !oldLive.closed && oldLive.state !== null
    && oldLive.state !== 'closed' && oldLive.closeCalls === 0
    && baseline.filter((entry) => !entry.closed && entry.state !== 'closed').length === 1;
  const oldClosed = retired !== undefined && sameIdentity(retired.id, oldLive?.id) && retired.closed && retired.state === 'closed' && retired.closeCalls === 1;
  const freshLive = fresh !== undefined && fresh.id !== null && !baseline.some(({ id }) => sameIdentity(id, fresh.id))
    && !fresh.closed && fresh.state !== null && fresh.state !== 'closed' && fresh.closeCalls === 0
    && result.filter((entry) => !entry.closed && entry.state !== 'closed').length === 1;
  const delta = afterEvents.slice(beforeEvents.length);
  const deltaExact = delta.length === 3 && delta[0]?.kind === 'close-call' && sameIdentity(delta[0]?.id, oldLive?.id)
    && delta.filter((/** @type {any} */ event) => event.kind === 'close-resolve' && sameIdentity(event.id, oldLive?.id)).length === 1
    && delta.filter((/** @type {any} */ event) => event.kind === 'create' && sameIdentity(event.id, fresh?.id)).length === 1;
  return unchangedPrefix && baselineLive && oldClosed && freshLive && deltaExact;
}
/** @param {any} afterHmr @param {any} terminal */
function exactTerminalContexts(afterHmr, terminal) {
  const baseline = contextRecords(afterHmr); const result = contextRecords(terminal);
  const baselineEvents = contextEvents(afterHmr); const terminalEvents = contextEvents(terminal);
  if (!validContextSnapshot(afterHmr) || !validContextSnapshot(terminal) || baseline === null || result === null
    || baselineEvents === null || terminalEvents === null || baseline.length < 1 || result.length !== baseline.length
    || afterHmr?.liveContexts !== 1 || terminal?.liveContexts !== 0) return false;
  const live = baseline.at(-1); const closed = result.at(-1);
  const uniqueLastLive = live !== undefined && live.id !== null && !live.closed && live.state !== null && live.state !== 'closed'
    && live.closeCalls === 0 && baseline.filter((entry) => !entry.closed && entry.state !== 'closed').length === 1;
  const exactClose = closed !== undefined && sameIdentity(closed.id, live?.id) && closed.closed && closed.state === 'closed' && closed.closeCalls === 1;
  const delta = terminalEvents.slice(baselineEvents.length);
  return uniqueLastLive && exactClose && deepEqual(baseline.slice(0, -1), result.slice(0, -1))
    && deepEqual(terminalEvents.slice(0, baselineEvents.length), baselineEvents)
    && delta.length === 2 && delta[0]?.kind === 'close-call' && delta[1]?.kind === 'close-resolve'
    && sameIdentity(delta[0]?.id, live?.id) && sameIdentity(delta[1]?.id, live?.id);
}

/** @param {any} value */
const contentTypeEssence = (value) => typeof value === 'string' ? value.split(';', 1)[0].trim().toLowerCase() : null;
/** @param {any} value @returns {Buffer|null} */
function canonicalBase64(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) return null;
  const bytes = Buffer.from(value, 'base64');
  return bytes.toString('base64') === value ? bytes : null;
}
/** @param {Buffer|null} bytes @param {string} expectedPath */
function exactModuleExport(bytes, expectedPath) {
  if (bytes === null) return null;
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; }
  const markers = source.match(/\/\/# sourceMappingURL=data:/gu) ?? [];
  if (markers.length > 1) return null;
  if (markers.length === 1) {
    const map = /(?:\r?\n)?\/\/# sourceMappingURL=data:application\/json(?:;charset=utf-8)?;base64,[A-Za-z0-9+/=]+\s*$/u.exec(source);
    if (!map) return null;
    source = source.slice(0, map.index);
  }
  const value = source.trim();
  return value === `export default "${expectedPath}"` || value === `export default '${expectedPath}'` ? expectedPath : null;
}
/** @param {any[]} rawResponses @param {string} expectedOrigin */
function classifyIceResponses(rawResponses, expectedOrigin) {
  const originValue = new URL(expectedOrigin).origin;
  const expectedPath = new URL(`/${ICE.path}`, `${originValue}/`).pathname;
  let previousSequence = 0;
  const entries = (Array.isArray(rawResponses) ? rawResponses : []).map((raw, index) => {
    let parsed = null;
    try { parsed = new URL(raw?.url); } catch { parsed = null; }
    const bytes = canonicalBase64(raw?.body);
    const moduleExport = exactModuleExport(bytes, expectedPath);
    const sequenceOrdered = Number.isInteger(raw?.sequence) && raw.sequence > previousSequence;
    if (Number.isInteger(raw?.sequence)) previousSequence = raw.sequence;
    const redirectShape = raw?.redirectedFrom === null || (typeof raw?.redirectedFrom?.url === 'string' && typeof raw?.redirectedFrom?.method === 'string');
    const noBodyError = !Object.prototype.hasOwnProperty.call(raw ?? {}, 'bodyError');
    const common = parsed !== null && parsed.origin === originValue && parsed.pathname === expectedPath && parsed.hash === ''
      && sequenceOrdered && redirectShape && noBodyError && raw?.bodyEncoding === 'base64' && bytes !== null;
    const moduleMetadata = common && parsed?.search === '?import&url' && raw?.method === 'GET' && raw?.resourceType === 'script'
      && raw?.status === 200 && raw?.redirectedFrom === null && ['text/javascript', 'application/javascript'].includes(contentTypeEssence(raw?.contentType) ?? '');
    const assetMetadata = common && parsed?.search === '' && raw?.method === 'GET' && raw?.resourceType === 'fetch'
      && raw?.status === 200 && raw?.redirectedFrom === null && contentTypeEssence(raw?.contentType) === 'audio/ogg';
    const kind = moduleMetadata && moduleExport === expectedPath ? 'module' : assetMetadata ? 'asset' : 'invalid';
    return {
      index, sequence: Number.isInteger(raw?.sequence) ? raw.sequence : null, kind,
      checks: {
        sequenceOrdered, urlValid: parsed !== null, sameOrigin: parsed?.origin === originValue, exactPath: parsed?.pathname === expectedPath,
        noHash: parsed?.hash === '', redirectShape, noRedirect: raw?.redirectedFrom === null, noBodyError,
        canonicalBase64: bytes !== null, moduleMetadata, moduleExportExact: moduleExport === expectedPath, assetMetadata,
      },
      body: { bytes: bytes?.length ?? null, sha256: bytes ? hash(bytes) : null, moduleExport },
    };
  });
  const counts = {
    total: entries.length,
    module: entries.filter(({ kind }) => kind === 'module').length,
    asset: entries.filter(({ kind }) => kind === 'asset').length,
    invalid: entries.filter(({ kind }) => kind === 'invalid').length,
  };
  const asset = entries.find(({ kind }) => kind === 'asset');
  const moduleEntry = entries.find(({ kind }) => kind === 'module');
  const assetBytesExact = asset?.body.bytes === ICE.bytes && asset?.body.sha256 === ICE.sha256;
  const moduleExportExact = moduleEntry?.body.moduleExport === expectedPath;
  return {
    expected: { origin: originValue, pathname: expectedPath, moduleSearch: '?import&url', assetSearch: '', assetBytes: ICE.bytes, assetSha256: ICE.sha256 },
    counts, assetBytesExact, moduleExportExact, entries,
    passed: counts.total === 2 && counts.module === 1 && counts.asset === 1 && counts.invalid === 0 && assetBytesExact && moduleExportExact,
  };
}

/** @param {any} runtime */
function exactRuntimeCatalog(runtime) {
  const value = {
    url: `/${ICE.path}`, sha256: ICE.sha256, license: 'CC0-1.0', licenseFile: 'licenses/audio/CC0-1.0.txt', uses: ['freeze-activation'],
    source: { publisher: ICE.publisher, pageUrl: ICE.pageUrl, soundId: ICE.soundId, author: ICE.author, title: ICE.title,
      runtimeFileKind: ICE.runtimeFileKind, originalFormat: 'WAV, 1.723 seconds, 96 kHz, 32-bit, stereo' },
    windowStartSeconds: ICE.windowStartSeconds, windowDurationSeconds: ICE.windowDurationSeconds, gain: ICE.gain,
    attack: ICE.attackSeconds, release: ICE.releaseSeconds, originalFilename: ICE.originalFilename, originalSha256: null, status: 'pending',
  };
  const descriptor = { configurable: true, enumerable: true, writable: true, get: false, set: false, value };
  return deepEqual(runtime, {
    modulePath: '/src/game/audio/audioAssetCatalog.ts',
    catalogOwnKeys: ['studioProgress', 'studioStart', 'freezeIce', 'bombFamiliarA', 'bombFamiliarB', 'bombFamiliarC'],
    freezeKeyCount: 1,
    freezeOwnKeys: ['url', 'sha256', 'license', 'licenseFile', 'uses', 'source', 'windowStartSeconds', 'windowDurationSeconds', 'gain', 'attack', 'release', 'originalFilename', 'originalSha256', 'status'],
    descriptor, value,
  });
}

/** @param {any} event */
function eventUrl(event) { try { return new URL(event?.url); } catch { return null; } }
/** @param {any} event */
const isAppRequest = (event) => event?.kind === 'request' && event?.method === 'GET' && event?.resourceType === 'script'
  && event?.mainFrame === true && event?.navigationRequest === false && eventUrl(event)?.origin === normalizedOrigin && eventUrl(event)?.pathname === appPathname;
/** @param {any} event */
const isDocumentRequest = (event) => event?.kind === 'request' && event?.method === 'GET' && event?.resourceType === 'document'
  && event?.mainFrame === true && event?.navigationRequest === true;
/** @param {any} event */
function websocketPayload(event) {
  if (event?.kind !== 'websocket-frame' || event?.direction !== 'received' || event?.encoding !== 'utf8' || typeof event?.body !== 'string') return null;
  try { return JSON.parse(event.body); } catch { return null; }
}
/** @param {any} event */
function isAppUpdateFrame(event) {
  const payload = websocketPayload(event);
  return payload?.type === 'update' && Array.isArray(payload.updates) && payload.updates.some((/** @type {any} */ update) => {
    if (update?.type !== 'js-update') return false;
    return [update.path, update.acceptedPath].some((value) => {
      if (typeof value !== 'string') return false;
      try { return new URL(value, `${normalizedOrigin}/`).pathname === appPathname; } catch { return false; }
    });
  });
}
/** @param {any} hmr */
function deriveHmrProof(hmr) {
  const events = Array.isArray(hmr?.events) ? hmr.events : [];
  const markerSequence = Number(hmr?.marker?.eventSequence ?? 0);
  const sequencesValid = events.length > 0 && events.every((/** @type {any} */ event, /** @type {number} */ index) => Number.isInteger(event?.sequence)
    && event.sequence === markerSequence + index + 1);
  const documentRequests = events.filter(isDocumentRequest);
  const navigations = events.filter((/** @type {any} */ event) => event?.kind === 'navigation' && event?.mainFrame === true);
  const appRequests = events.filter(isAppRequest);
  const updateFrames = events.filter(isAppUpdateFrame);
  const fullReloadFrames = events.filter((/** @type {any} */ event) => websocketPayload(event)?.type === 'full-reload');
  const navigationSequence = navigations[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const documentSequence = documentRequests[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const preNavigationApps = appRequests.filter((/** @type {any} */ event) => event.sequence < documentSequence);
  const bootstrapApps = appRequests.filter((/** @type {any} */ event) => event.sequence > navigationSequence);
  const beforeEpoch = Number(hmr?.before?.navigation?.epoch); const afterEpoch = Number(hmr?.after?.navigation?.epoch);
  const owner = hmr?.oldOwner ?? {};
  let branch = 'invalid';
  if (sequencesValid && beforeEpoch === afterEpoch && documentRequests.length === 0 && navigations.length === 0) {
    if (owner.ownerPresent === true && owner.sameOwner === true && owner.oldRenderer === 'active') branch = 'same-owner';
    else if (owner.ownerPresent === true && owner.sameOwner === false && owner.oldRenderer === 'retired') branch = 'same-realm-replacement';
  } else if (sequencesValid && afterEpoch === beforeEpoch + 1 && documentRequests.length === 1 && navigations.length === 1
    && owner.ownerPresent === false && owner.sameOwner === false && owner.oldRenderer === 'unavailable') branch = 'document-reload';
  let delivery = 'invalid';
  if (branch === 'same-owner' || branch === 'same-realm-replacement') delivery = 'hot-update';
  else if (branch === 'document-reload' && preNavigationApps.length > 0) delivery = 'update-fallback-reload';
  else if (branch === 'document-reload' && preNavigationApps.length === 0 && fullReloadFrames.length > 0) delivery = 'direct-full-reload';
  const firstUpdate = updateFrames[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const firstApp = appRequests[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const firstFull = fullReloadFrames[0]?.sequence ?? null;
  const firstBootstrap = bootstrapApps[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const sameUrlReload = documentRequests.length === 1 && navigations.length === 1
    && documentRequests[0]?.url === hmr?.before?.navigation?.url && navigations[0]?.url === hmr?.before?.navigation?.url
    && hmr?.after?.navigation?.url === hmr?.before?.navigation?.url;
  let eventOrderValid = false;
  if (delivery === 'hot-update') eventOrderValid = updateFrames.length === 1 && appRequests.length === 1 && fullReloadFrames.length === 0 && firstUpdate < firstApp;
  else if (delivery === 'update-fallback-reload') eventOrderValid = updateFrames.length === 1 && preNavigationApps.length === 1
    && bootstrapApps.length === 1 && fullReloadFrames.length <= 1 && firstUpdate < preNavigationApps[0].sequence
    && preNavigationApps.at(-1).sequence < documentSequence && documentSequence < navigationSequence && navigationSequence < firstBootstrap
    && (firstFull === null || (preNavigationApps[0].sequence < firstFull && firstFull < documentSequence));
  else if (delivery === 'direct-full-reload') eventOrderValid = updateFrames.length === 0 && fullReloadFrames.length === 1 && bootstrapApps.length === 1 && firstFull !== null
    && firstFull < documentSequence && documentSequence < navigationSequence && navigationSequence < firstBootstrap;
  const ownerIdentitiesValid = branch === 'same-owner'
    ? sameIdentity(owner.beforeIdentity, owner.ownerIdentity) && sameIdentity(owner.beforeIdentity, owner.currentIdentity)
    : branch === 'same-realm-replacement'
      ? sameIdentity(owner.beforeIdentity, owner.ownerIdentity) && differentIdentity(owner.beforeIdentity, owner.currentIdentity)
      : branch === 'document-reload'
        ? identityRecord(owner.beforeIdentity)?.epoch === beforeEpoch && identityRecord(owner.currentIdentity)?.epoch === afterEpoch
        : false;
  const contextsExact = exactHmrContexts(hmr?.before?.tracker, hmr?.after?.tracker, /** @type {any} */ (branch));
  const preferencesStable = hmr?.after?.root?.theme === 'mineral-mist' && hmr?.after?.root?.reducedMotion === 'true';
  const reloadExact = branch !== 'document-reload' || (sameUrlReload && hmr?.after?.navigation?.type === 'reload'
    && bootstrapApps.length >= 1 && hmr?.after?.canvasCount === 1 && hmr?.after?.tracker?.canvases === 1
    && activeRafs(hmr?.after?.tracker) === activeRafs(hmr?.before?.tracker)
    && sameRelevantListeners(hmr?.before?.tracker, hmr?.after?.tracker) && preferencesStable);
  const passed = branch !== 'invalid' && delivery !== 'invalid' && eventOrderValid && ownerIdentitiesValid && contextsExact && reloadExact;
  return {
    branch, delivery, sequencesValid,
    epoch: { before: Number.isInteger(beforeEpoch) ? beforeEpoch : null, after: Number.isInteger(afterEpoch) ? afterEpoch : null },
    counts: { events: events.length, appRequests: appRequests.length, preNavigationAppRequests: preNavigationApps.length,
      bootstrapAppRequests: bootstrapApps.length, documentRequests: documentRequests.length, navigations: navigations.length,
      appUpdateFrames: updateFrames.length, fullReloadFrames: fullReloadFrames.length },
    sequence: { firstUpdate: Number.isFinite(firstUpdate) ? firstUpdate : null, firstApp: Number.isFinite(firstApp) ? firstApp : null,
      firstFullReload: firstFull, documentRequest: Number.isFinite(documentSequence) ? documentSequence : null,
      navigation: Number.isFinite(navigationSequence) ? navigationSequence : null, firstBootstrapApp: Number.isFinite(firstBootstrap) ? firstBootstrap : null },
    sameUrlReload, eventOrderValid, ownerIdentitiesValid, contextsExact, preferencesStable, reloadExact, passed,
  };
}

/** @param {Buffer} assetBytes */
function runContractFixtures(assetBytes) {
  const clone = (/** @type {any} */ value) => structuredClone(value);
  const assertFixture = (/** @type {unknown} */ value, /** @type {string} */ label) => { if (!value) throw new Error(`contract fixture failed: ${label}`); };
  const iceUrl = `${normalizedOrigin}/${ICE.path}`;
  /** @type {any[]} */
  const goodIce = [
    { sequence: 1, url: `${iceUrl}?import&url`, status: 200, method: 'GET', resourceType: 'script', contentType: 'text/javascript; charset=utf-8',
      redirectedFrom: null, bodyEncoding: 'base64', body: Buffer.from(`export default "/${ICE.path}"`).toString('base64') },
    { sequence: 2, url: iceUrl, status: 200, method: 'GET', resourceType: 'fetch', contentType: 'audio/ogg; charset=binary',
      redirectedFrom: null, bodyEncoding: 'base64', body: assetBytes.toString('base64') },
  ];
  assertFixture(classifyIceResponses(goodIce, normalizedOrigin).passed, 'valid Ice pair');
  const sourceMapIce = clone(goodIce);
  sourceMapIce[0].body = Buffer.from(`export default "/${ICE.path}"\n//# sourceMappingURL=data:application/json;base64,e30=`).toString('base64');
  assertFixture(classifyIceResponses(sourceMapIce, normalizedOrigin).passed, 'one EOF data sourcemap');
  /** @type {Array<[string, (raw: any[]) => void]>} */
  const iceRejects = [
    ['duplicate asset', (raw) => raw.push({ ...clone(raw[1]), sequence: 3 })],
    ['wrong asset', (raw) => { const bytes = Buffer.from(assetBytes); bytes[0] ^= 0xff; raw[1].body = bytes.toString('base64'); }],
    ['missing module', (raw) => { raw.splice(0, 1); }], ['missing asset', (raw) => { raw.splice(1, 1); }],
    ['duplicate module', (raw) => raw.splice(1, 0, { ...clone(raw[0]), sequence: 2 })],
    ['query order variant', (raw) => { raw[0].url = `${iceUrl}?url&import`; }],
    ['query extra key', (raw) => { raw[0].url = `${iceUrl}?import&url&x=1`; }],
    ['bare JS', (raw) => { raw[0].url = iceUrl; }], ['query Ogg', (raw) => { raw[1].url = `${iceUrl}?t=1`; }],
    ['cross origin', (raw) => { raw[1].url = `http://localhost:${new URL(normalizedOrigin).port}/${ICE.path}`; }],
    ['wrong path', (raw) => { raw[1].url = `${normalizedOrigin}/other/freeze-ice-cubes-hq.ogg`; }],
    ['non-200', (raw) => { raw[1].status = 206; }],
    ['redirect', (raw) => { raw[1].redirectedFrom = { url: `${normalizedOrigin}/old.ogg`, method: 'GET' }; }],
    ['POST', (raw) => { raw[1].method = 'POST'; }], ['wrong type', (raw) => { raw[1].resourceType = 'media'; }],
    ['wrong MIME', (raw) => { raw[1].contentType = 'application/octet-stream'; }],
    ['body error', (raw) => { raw[1].body = null; raw[1].bodyError = 'failed'; }],
    ['module semicolon', (raw) => { raw[0].body = Buffer.from(`export default "/${ICE.path}";`).toString('base64'); }],
    ['module extra comment', (raw) => { raw[0].body = Buffer.from(`export default "/${ICE.path}"\n// extra`).toString('base64'); }],
  ];
  for (const [label, mutate] of iceRejects) { const raw = clone(goodIce); mutate(raw); assertFixture(!classifyIceResponses(raw, normalizedOrigin).passed, `reject Ice ${label}`); }
  const forgedClassification = clone(classifyIceResponses(goodIce, normalizedOrigin)); forgedClassification.entries[0].checks = {};
  assertFixture(!deepEqual(forgedClassification, classifyIceResponses(goodIce, normalizedOrigin)), 'reject empty forged checks');

  const id = (/** @type {number} */ epoch, /** @type {number} */ value) => ({ epoch, id: value });
  const tracker = (/** @type {number} */ epoch, /** @type {any[]} */ contexts, /** @type {any[]} */ events) => ({
    documentEpoch: epoch, qaId: id(epoch, 20), canvasId: id(epoch, 21), canvases: 1, activeRafs: 1,
    listenerCounts: { 'window:keydown': 1, 'window:keyup': 1, 'window:blur': 1, 'document:visibilitychange': 1 },
    contexts, liveContexts: contexts.filter((entry) => !entry.closed && entry.state !== 'closed').length,
    contextEventCursor: events.length, contextEvents: events,
  });
  const liveTracker = (/** @type {number} */ epoch) => tracker(epoch,
    [{ id: id(epoch, 1), closed: false, closeCalls: 0, state: 'suspended' }], [{ sequence: 1, kind: 'create', id: id(epoch, 1) }]);
  const replacementTracker = (/** @type {number} */ epoch) => tracker(epoch,
    [{ id: id(epoch, 1), closed: true, closeCalls: 1, state: 'closed' }, { id: id(epoch, 2), closed: false, closeCalls: 0, state: 'suspended' }],
    [{ sequence: 1, kind: 'create', id: id(epoch, 1) }, { sequence: 2, kind: 'close-call', id: id(epoch, 1), call: 1 },
      { sequence: 3, kind: 'close-resolve', id: id(epoch, 1), call: 1, state: 'closed' }, { sequence: 4, kind: 'create', id: id(epoch, 2) }]);
  const pageUrl = `${normalizedOrigin}/play/mutation`;
  const snap = (/** @type {number} */ epoch, /** @type {any} */ value, type = 'navigate') => ({
    navigation: { epoch, type, url: pageUrl }, tracker: value, root: { theme: 'mineral-mist', reducedMotion: 'true' }, canvasCount: 1,
  });
  const updateFrame = (sequence = 11) => ({ sequence, kind: 'websocket-frame', direction: 'received', encoding: 'utf8', url: `ws://${new URL(normalizedOrigin).host}`,
    body: JSON.stringify({ type: 'update', updates: [{ type: 'js-update', path: '/src/App.tsx', acceptedPath: '/src/App.tsx' }] }) });
  const fullFrame = (sequence = 11) => ({ sequence, kind: 'websocket-frame', direction: 'received', encoding: 'utf8', url: `ws://${new URL(normalizedOrigin).host}`,
    body: JSON.stringify({ type: 'full-reload', path: '*' }) });
  const appRequest = (/** @type {number} */ sequence, suffix = '?t=1') => ({ sequence, kind: 'request', url: `${normalizedOrigin}/src/App.tsx${suffix}`, method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false });
  const documentRequest = (/** @type {number} */ sequence) => ({ sequence, kind: 'request', url: pageUrl, method: 'GET', resourceType: 'document', mainFrame: true, navigationRequest: true });
  const navigation = (/** @type {number} */ sequence) => ({ sequence, kind: 'navigation', url: pageUrl, mainFrame: true });
  const before = snap(1, liveTracker(1));
  const same = { marker: { eventSequence: 10 }, events: [updateFrame(11), appRequest(12)], before, after: snap(1, liveTracker(1)),
    oldOwner: { ownerPresent: true, sameOwner: true, oldRenderer: 'active', beforeIdentity: id(1, 10), ownerIdentity: id(1, 10), currentIdentity: id(1, 10) } };
  const replacement = { ...clone(same), after: snap(1, replacementTracker(1)),
    oldOwner: { ownerPresent: true, sameOwner: false, oldRenderer: 'retired', beforeIdentity: id(1, 10), ownerIdentity: id(1, 10), currentIdentity: id(1, 11) } };
  const reload = { marker: { eventSequence: 10 }, events: [updateFrame(11), appRequest(12), documentRequest(13), navigation(14), appRequest(15, '')],
    before, after: snap(2, liveTracker(2), 'reload'), oldOwner: { ownerPresent: false, sameOwner: false, oldRenderer: 'unavailable', beforeIdentity: id(1, 10), ownerIdentity: null, currentIdentity: id(2, 10) } };
  const directReload = { ...clone(reload), events: [fullFrame(11), documentRequest(12), navigation(13), appRequest(14, '')] };
  for (const [label, value] of [['same-owner', same], ['same-realm replacement', replacement], ['update fallback reload', reload], ['direct full reload', directReload]]) {
    assertFixture(deriveHmrProof(value).passed, `valid HMR ${label}`);
  }
  const doubleCloseReplacement = clone(replacement);
  doubleCloseReplacement.after.tracker.contexts[0].closeCalls = 2;
  doubleCloseReplacement.after.tracker.contextEvents.splice(2, 0, { sequence: 3, kind: 'close-call', id: id(1, 1), call: 2 });
  doubleCloseReplacement.after.tracker.contextEvents[3].sequence = 4;
  doubleCloseReplacement.after.tracker.contextEvents[4].sequence = 5;
  doubleCloseReplacement.after.tracker.contextEventCursor = 5;
  const extraCreateReplacement = clone(replacement);
  extraCreateReplacement.after.tracker.contexts.push({ id: id(1, 3), closed: false, closeCalls: 0, state: 'suspended' });
  extraCreateReplacement.after.tracker.contextEvents.push({ sequence: 5, kind: 'create', id: id(1, 3) });
  extraCreateReplacement.after.tracker.contextEventCursor = 5;
  extraCreateReplacement.after.tracker.liveContexts = 2;
  const reloadTwoLive = clone(reload);
  reloadTwoLive.after.tracker = tracker(2,
    [{ id: id(2, 1), closed: false, closeCalls: 0, state: 'suspended' }, { id: id(2, 2), closed: false, closeCalls: 0, state: 'suspended' }],
    [{ sequence: 1, kind: 'create', id: id(2, 1) }, { sequence: 2, kind: 'create', id: id(2, 2) }]);
  /** @type {Array<[string, any]>} */
  const hmrRejects = [
    ['missing owner called retired', { ...clone(same), oldOwner: { ...clone(same.oldOwner), ownerPresent: false, sameOwner: false, oldRenderer: 'retired' } }],
    ['same epoch navigation', { ...clone(reload), after: snap(1, liveTracker(1), 'reload') }],
    ['epoch change no navigation', { ...clone(same), after: snap(2, liveTracker(2), 'reload'), oldOwner: clone(reload.oldOwner) }],
    ['multiple reload navigation', { ...clone(reload), events: [...clone(reload.events), documentRequest(16), navigation(17)] }],
    ['wrong reload path', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) => event.sequence === 13 ? { ...event, url: `${normalizedOrigin}/wrong` } : event) }],
    ['non-document navigation request', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) => event.sequence === 13 ? { ...event, resourceType: 'fetch', navigationRequest: false } : event) }],
    ['cross epoch bare id', { ...clone(reload), oldOwner: { ...clone(reload.oldOwner), currentIdentity: id(1, 10) } }],
    ['same owner context changed', { ...clone(same), after: snap(1, replacementTracker(1)) }],
    ['replacement no close', { ...clone(replacement), after: snap(1, tracker(1, [{ id: id(1, 1), closed: false, closeCalls: 0, state: 'suspended' }, { id: id(1, 2), closed: false, closeCalls: 0, state: 'suspended' }], [{ sequence: 1, kind: 'create', id: id(1, 1) }, { sequence: 2, kind: 'create', id: id(1, 2) }])) }],
    ['replacement double close', doubleCloseReplacement],
    ['replacement extra create', extraCreateReplacement],
    ['replacement id reuse', { ...clone(replacement), after: snap(1, tracker(1, [{ id: id(1, 1), closed: false, closeCalls: 0, state: 'suspended' }], [{ sequence: 1, kind: 'create', id: id(1, 1) }, { sequence: 2, kind: 'create', id: id(1, 1) }])) }],
    ['reload zero live', { ...clone(reload), after: snap(2, tracker(2, [{ id: id(2, 1), closed: true, closeCalls: 1, state: 'closed' }], [{ sequence: 1, kind: 'create', id: id(2, 1) }, { sequence: 2, kind: 'close-call', id: id(2, 1), call: 1 }, { sequence: 3, kind: 'close-resolve', id: id(2, 1), call: 1, state: 'closed' }]), 'reload') }],
    ['reload two live', reloadTwoLive],
    ['bad request order', { ...clone(reload), events: [documentRequest(11), navigation(12), updateFrame(13), appRequest(14), appRequest(15, '')] }],
  ];
  for (const [label, value] of hmrRejects) assertFixture(!deriveHmrProof(value).passed, `reject HMR ${label}`);
  const terminal = tracker(1, [{ id: id(1, 1), closed: true, closeCalls: 1, state: 'closed' }],
    [{ sequence: 1, kind: 'create', id: id(1, 1) }, { sequence: 2, kind: 'close-call', id: id(1, 1), call: 1 }, { sequence: 3, kind: 'close-resolve', id: id(1, 1), call: 1, state: 'closed' }]);
  assertFixture(exactTerminalContexts(liveTracker(1), terminal), 'valid terminal close');
  const impreciseTerminal = clone(terminal); impreciseTerminal.contexts[0].closeCalls = 0;
  assertFixture(!exactTerminalContexts(liveTracker(1), impreciseTerminal), 'reject imprecise terminal close');
  return { iceAccepted: 2, iceRejected: iceRejects.length + 1, hmrAccepted: 4, hmrRejected: hmrRejects.length + 1 };
}

if (process.argv.includes('--self-test')) {
  console.log(JSON.stringify({ passed: true, ...runContractFixtures(gitBytes(BASE, ICE.path)) }));
  process.exit(0);
}

check(git('rev-parse', AUTH) === AUTH, 'authorization head missing');
check(git('rev-parse', BASE) === BASE, 'R5B terminal base missing');
check(git('merge-base', '--is-ancestor', BASE, 'HEAD') === '', 'R5B terminal is not ancestor');

const browser = await chromium.launch({ headless: true });
const scenarios = await loadScenarios();
const opened = await openMutation(browser, origin, {
  label: 'lifecycle', item: 'freeze', seed: SEEDS.freeze,
  theme: 'deep-tide', reduced: false, language: 'zh-CN', viewport: { width: 1440, height: 900 },
});
const { page, context, observed } = opened;

await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(100);
const initial = await snapshot(page);
check(initial.canvasCount === 1 && initial.tracker?.canvases === 1 && initial.domCellCount === 0, 'initial product ownership');
check(validContextSnapshot(initial.tracker) && initial.tracker?.liveContexts === 1 && contextRecords(initial.tracker)?.length === 1
  && contextRecords(initial.tracker)?.[0]?.closed === false && contextRecords(initial.tracker)?.[0]?.closeCalls === 0, 'initial exact AudioContext record');
check(initial.tracker?.activeRafs >= 1, 'initial renderer/ticker frame activity');

const runtimeCatalog = await page.evaluate(async (modulePath) => {
  /** @type {any} */
  const loaded = await import(/* @vite-ignore */ modulePath);
  const assets = loaded.T37_AUDIO_ASSETS;
  const descriptor = Object.getOwnPropertyDescriptor(assets, 'freezeIce');
  const clone = (/** @type {any} */ value) => JSON.parse(JSON.stringify(value));
  const keys = (/** @type {any} */ value) => Reflect.ownKeys(value).map((key) => typeof key === 'symbol' ? `symbol:${String(key.description)}` : key);
  return {
    modulePath,
    catalogOwnKeys: keys(assets),
    freezeKeyCount: keys(assets).filter((key) => key === 'freezeIce').length,
    freezeOwnKeys: keys(descriptor?.value ?? {}),
    descriptor: descriptor ? {
      configurable: descriptor.configurable, enumerable: descriptor.enumerable, writable: descriptor.writable,
      get: typeof descriptor.get === 'function', set: typeof descriptor.set === 'function', value: clone(descriptor.value),
    } : null,
    value: descriptor ? clone(descriptor.value) : null,
  };
}, '/src/game/audio/audioAssetCatalog.ts');
check(exactRuntimeCatalog(runtimeCatalog), 'runtime catalog exact own freezeIce descriptor and value');

const freeze = scenarioFor(scenarios, 'freeze');
await runActions(page, freeze.actions[0]); await advanceToActive(page);
await runActions(page, freeze.actions[1]); await advanceToActive(page);
await runActions(page, freeze.actions[2]); await advanceToActive(page);
await page.waitForTimeout(520);
const afterFreeze = await snapshot(page);
const iceDeadline = Date.now() + 5_000;
while (observed.iceResponsePromises.length < 2 && Date.now() < iceDeadline) await page.waitForTimeout(50);
const rawIceResponses = await observed.freezeIceResponseWindow();
const runtimeIceClassification = classifyIceResponses(rawIceResponses, normalizedOrigin);
check(runtimeIceClassification.passed, 'runtime Ice exact module-plus-asset response pair');

const restarted = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  const tracked = () => ({ ...w.__MATERIAL_TRACKER__.snapshot(), canvasCount: document.querySelectorAll('canvas').length });
  const before = tracked();
  w.__TETRAMORPH_QA__.restart();
  w.__TETRAMORPH_QA__.start();
  w.__TETRAMORPH_QA__.setFrozen(true);
  return { before, after: tracked(), state: w.__TETRAMORPH_QA__.getState() };
});
check(sameIdentity(restarted.before.qaId, restarted.after.qaId) && sameIdentity(restarted.before.canvasId, restarted.after.canvasId), 'restart reuses runtime and Canvas');
check(restarted.before.canvasCount === 1 && restarted.before.canvases === 1
  && restarted.after.canvasCount === 1 && restarted.after.canvases === 1, 'restart exact Canvas ownership');
check(activeRafs(restarted.before) >= 1 && activeRafs(restarted.after) === activeRafs(restarted.before), 'restart active RAFs exactly match baseline');
check(restarted.after.liveContexts === 1 && sameContextRecords(restarted.before, restarted.after), 'restart creates no AudioContext and preserves closed records');
check(sameRelevantListeners(restarted.before, restarted.after), 'restart relevant listener set is exactly stable');

await page.getByTestId('open-settings').click();
await page.getByTestId('theme-mineral-mist').click();
await page.getByTestId('reduced-motion-toggle').click();
const settingsSheet = page.getByTestId('settings-sheet');
check(await settingsSheet.count() === 1, 'one settings sheet owns preference dismissal');
await settingsSheet.waitFor({ state: 'visible' });
const settingsDismiss = settingsSheet.locator('.settings-console__actions > .primary-action');
check(await settingsDismiss.count() === 1, 'one settings-sheet primary dismissal action');
await settingsDismiss.click();
await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-theme') === 'mineral-mist'
  && document.querySelector('.app')?.getAttribute('data-reduced-motion') === 'true');
const changedPreferences = await snapshot(page);
check(sameIdentity(changedPreferences.tracker?.qaId, initial.tracker?.qaId) && sameIdentity(changedPreferences.tracker?.canvasId, initial.tracker?.canvasId), 'theme/motion reuse runtime and Canvas');
check(changedPreferences.canvasCount === 1 && changedPreferences.tracker?.canvases === 1, 'theme/motion exact Canvas ownership');
check(activeRafs(changedPreferences.tracker) === activeRafs(restarted.after)
  && activeRafs(changedPreferences.tracker) === activeRafs(initial.tracker), 'theme/motion active RAFs exactly match baseline');
check(changedPreferences.tracker?.liveContexts === 1 && sameContextRecords(restarted.after, changedPreferences.tracker)
  && sameContextRecords(initial.tracker, changedPreferences.tracker), 'theme/motion creates no AudioContext and preserves closed records');
check(sameRelevantListeners(initial.tracker, changedPreferences.tracker), 'theme/motion relevant listener set is exactly stable');

await page.evaluate(() => { const w = /** @type {any} */ (window); w.__MATERIAL_EXIT_QA__ = w.__TETRAMORPH_QA__; });
await page.getByTestId('exit-game').click();
await page.locator('.action-sheet__actions > .primary-action').click();
await page.getByTestId('mode-home').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const w = /** @type {any} */ (window);
  const tracker = w.__MATERIAL_TRACKER__.snapshot();
  const relevant = Object.entries(tracker.listenerCounts).filter(([key]) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key));
  return !w.__TETRAMORPH_QA__ && document.querySelectorAll('canvas').length === 0
    && tracker.liveContexts === 0 && tracker.activeRafs === 0
    && relevant.every(([, count]) => Number(count) === 0);
});
const exited = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  let oldRendererRetired = false;
  try { w.__MATERIAL_EXIT_QA__.captureBoardPng(); } catch { oldRendererRetired = true; }
  return { tracker: w.__MATERIAL_TRACKER__.snapshot(), oldRendererRetired, qaPresent: Boolean(w.__TETRAMORPH_QA__), textHook: Boolean(w.render_game_to_text) };
});
check(exited.tracker.canvases === 0 && exited.tracker.liveContexts === 0 && exited.oldRendererRetired, 'UI exit retires Canvas/renderer/audio');
check(!exited.qaPresent && !exited.textHook, 'UI exit retires QA hooks');
check(activeRafs(exited.tracker) === 0, 'UI exit retires every tracked RAF');
check(noRelevantListeners(exited.tracker), 'UI exit retires every relevant listener');
check(closedContextSuccessors(changedPreferences.tracker, exited.tracker), 'UI exit closes each baseline AudioContext exactly once');

await page.getByTestId('enter-sprint').click();
await page.getByTestId('game-screen').waitFor({ state: 'visible' });
await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
await page.waitForFunction(() => Boolean(/** @type {any} */ (window).__TETRAMORPH_QA__));
await page.evaluate(() => /** @type {any} */ (window).__TETRAMORPH_QA__.setFrozen(true));
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(100);
const reentered = await snapshot(page);
check(differentIdentity(reentered.tracker?.qaId, initial.tracker?.qaId) && differentIdentity(reentered.tracker?.canvasId, initial.tracker?.canvasId), 're-entry owns fresh runtime and Canvas');
check(reentered.canvasCount === 1 && reentered.tracker?.canvases === 1, 're-entry exact Canvas ownership');
check(activeRafs(reentered.tracker) === activeRafs(changedPreferences.tracker), 're-entry active RAFs exactly match baseline');
check(reentered.tracker?.liveContexts === 1 && exactReentryContexts(changedPreferences.tracker, reentered.tracker), 're-entry adds exactly one AudioContext after exact old-context closure');
check(sameRelevantListeners(reentered.tracker, changedPreferences.tracker), 're-entry restores the exact relevant listener set');

const beforeHmrOwner = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  w.__MATERIAL_HMR_QA__ = w.__TETRAMORPH_QA__;
  return { beforeIdentity: w.__MATERIAL_TRACKER__.identity(w.__MATERIAL_HMR_QA__) };
});
const beforeHmr = await snapshot(page);
check(exactPreHmrContextContinuity(reentered.tracker, beforeHmr.tracker), 're-entry to HMR-before exact AudioContext continuity');
const eventMarker = { eventIndex: observed.events.length, eventSequence: observed.events.at(-1)?.sequence ?? 0 };
const appPath = join(repo, 'src/App.tsx');
const beforeStat = statSync(appPath);
const beforeAppBytes = readFileSync(appPath);
const touch = new Date(Math.max(Date.now(), beforeStat.mtimeMs + 1100));
utimesSync(appPath, beforeStat.atime, touch);
const afterStat = statSync(appPath);
const afterAppBytes = readFileSync(appPath);
check(afterStat.mtimeMs > beforeStat.mtimeMs && beforeAppBytes.length === afterAppBytes.length
  && hash(beforeAppBytes) === hash(afterAppBytes), 'HMR touch changes only monotonic App mtime');
let hmrSignal = false;
const hmrDeadline = Date.now() + 10_000;
while (!hmrSignal && Date.now() < hmrDeadline) {
  const delta = observed.events.slice(eventMarker.eventIndex);
  hmrSignal = delta.some((/** @type {any} */ event) => isAppRequest(event) || isDocumentRequest(event)
    || (event?.kind === 'navigation' && event?.mainFrame === true) || websocketPayload(event)?.type === 'full-reload');
  if (!hmrSignal) await page.waitForTimeout(50);
}
check(hmrSignal, 'Vite emitted a post-touch App update or reload signal');
await page.waitForTimeout(1800);
const interimEvents = observed.events.slice(eventMarker.eventIndex);
const documentReloadObserved = interimEvents.some(isDocumentRequest)
  || interimEvents.some((/** @type {any} */ event) => event?.kind === 'navigation' && event?.mainFrame === true);
if (documentReloadObserved) {
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 });
  await page.getByTestId('game-screen').waitFor({ state: 'visible', timeout: 12_000 });
  await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
  await page.waitForFunction((epoch) => {
    const w = /** @type {any} */ (window);
    return w.__MATERIAL_TRACKER__?.snapshot().documentEpoch === epoch + 1
      && Boolean(w.__TETRAMORPH_QA__ && w.__TETRAMORPH_LAYOUT_QA__ && w.render_game_to_text)
      && document.querySelectorAll('canvas').length === 1;
  }, beforeHmr.navigation.epoch, { timeout: 12_000 });
} else {
  await page.waitForFunction((epoch) => {
    const w = /** @type {any} */ (window);
    return w.__MATERIAL_TRACKER__?.snapshot().documentEpoch === epoch
      && Boolean(w.__TETRAMORPH_QA__ && w.__TETRAMORPH_LAYOUT_QA__ && w.render_game_to_text)
      && document.querySelectorAll('canvas').length === 1;
  }, beforeHmr.navigation.epoch, { timeout: 10_000 });
}
await page.evaluate(() => /** @type {any} */ (window).__TETRAMORPH_QA__.setFrozen(true));
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(100);
const afterHmr = await snapshot(page);
const afterHmrOwner = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  const ownerPresent = Object.prototype.hasOwnProperty.call(w, '__MATERIAL_HMR_QA__') && Boolean(w.__MATERIAL_HMR_QA__);
  if (!ownerPresent) return {
    ownerPresent: false, sameOwner: false, oldRenderer: 'unavailable', ownerIdentity: null,
    currentIdentity: w.__MATERIAL_TRACKER__.identity(w.__TETRAMORPH_QA__),
  };
  const sameOwner = w.__MATERIAL_HMR_QA__ === w.__TETRAMORPH_QA__;
  let oldRenderer = 'active';
  if (!sameOwner) { try { w.__MATERIAL_HMR_QA__.captureBoardPng(); } catch { oldRenderer = 'retired'; } }
  return {
    ownerPresent: true, sameOwner, oldRenderer,
    ownerIdentity: w.__MATERIAL_TRACKER__.identity(w.__MATERIAL_HMR_QA__),
    currentIdentity: w.__MATERIAL_TRACKER__.identity(w.__TETRAMORPH_QA__),
  };
});
const oldHmrOwner = { ...beforeHmrOwner, ...afterHmrOwner };
const eventEnd = { eventIndex: observed.events.length, eventSequence: observed.events.at(-1)?.sequence ?? eventMarker.eventSequence };
const hmrEvents = observed.events.slice(eventMarker.eventIndex, eventEnd.eventIndex);
/** @type {any} */
const hmr = {
  before: beforeHmr,
  marker: { ...eventMarker, endEventIndex: eventEnd.eventIndex, endEventSequence: eventEnd.eventSequence },
  events: hmrEvents,
  appTouch: {
    path: 'src/App.tsx', beforeMtimeMs: beforeStat.mtimeMs, requestedMtimeMs: touch.getTime(), afterMtimeMs: afterStat.mtimeMs,
    beforeBytes: beforeAppBytes.length, afterBytes: afterAppBytes.length, beforeSha256: hash(beforeAppBytes), afterSha256: hash(afterAppBytes),
  },
  after: afterHmr,
  oldOwner: oldHmrOwner,
};
const hmrProof = deriveHmrProof(hmr);
hmr.proof = hmrProof;
const hmrContextBranch = /** @type {'same-owner'|'same-realm-replacement'|'document-reload'|'invalid'} */ (hmrProof.branch);
check(deepEqual(hmrEvents, observed.events.slice(eventMarker.eventIndex, eventEnd.eventIndex)), 'HMR exact unified event window');
check(hmrProof.passed, 'Vite HMR/reload strict branch proof');
check(afterHmr.canvasCount === 1 && afterHmr.tracker?.liveContexts === 1, 'HMR leaves one Canvas and AudioContext');
check(activeRafs(beforeHmr.tracker) >= 1 && activeRafs(afterHmr.tracker) === activeRafs(beforeHmr.tracker), 'HMR active RAFs exactly equal the live baseline');
check(sameRelevantListeners(beforeHmr.tracker, afterHmr.tracker), 'HMR relevant listener set is exactly stable');
check(hmrContextBranch !== 'invalid', 'HMR old renderer disposition is internally consistent');
check(hmrContextBranch !== 'invalid' && exactHmrContexts(beforeHmr.tracker, afterHmr.tracker, hmrContextBranch), 'HMR exact branch-specific AudioContext history');

await page.getByTestId('exit-game').click();
await page.locator('.action-sheet__actions > .primary-action').click();
await page.getByTestId('mode-home').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const tracker = /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot();
  const relevant = Object.entries(tracker.listenerCounts).filter(([key]) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key));
  const currentEpochRecords = tracker.contexts.filter((/** @type {any} */ entry) => entry.id?.epoch === tracker.documentEpoch);
  return document.querySelectorAll('canvas').length === 0 && tracker.liveContexts === 0
    && tracker.activeRafs === 0 && relevant.every(([, count]) => Number(count) === 0)
    && currentEpochRecords.length >= 1 && currentEpochRecords.every((/** @type {any} */ entry) => entry.closed && entry.closeCalls === 1 && entry.state === 'closed');
});
const terminal = await page.evaluate(() => /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot());
check(terminal.canvases === 0 && terminal.liveContexts === 0 && activeRafs(terminal) === 0 && noRelevantListeners(terminal), 'post-HMR terminal cleanup');
check(exactTerminalContexts(afterHmr.tracker, terminal), 'post-HMR terminal exact AudioContext closure');

const iceBytes = gitBytes(BASE, ICE.path);
const catalogBytes = gitBytes(BASE, catalogPath);
const catalogGitBlob = git('rev-parse', `${BASE}:${catalogPath}`);
const lsTree = git('ls-tree', BASE, '--', ICE.path).split(/\s+/u);
const provenanceChecks = [
  { label: 'product Ogg bytes/hash/blob', passed: iceBytes.length === ICE.bytes && hash(iceBytes) === ICE.sha256 && lsTree[2] === ICE.gitBlob },
  { label: 'full catalog Git blob/bytes/hash', passed: catalogGitBlob.length === 40 && git('cat-file', '-t', catalogGitBlob) === 'blob'
    && Number(git('cat-file', '-s', catalogGitBlob)) === catalogBytes.length && hash(catalogBytes).length === 64 },
  { label: 'runtime catalog own freezeIce descriptor/value', passed: exactRuntimeCatalog(runtimeCatalog) },
  { label: 'no original substitution', passed: ICE.originalSha256 === null && ICE.originalStatus === 'OPEN / login required' && ICE.substitutionAllowed === false },
  { label: 'runtime exact module-plus-asset pair', passed: runtimeIceClassification.passed },
];
const iceProvenance = {
  schema: 'tetramorph.t37.ice-provenance.v1', generatedAt: new Date().toISOString(),
  productHead: BASE, authorizationHead: AUTH, origin: normalizedOrigin, passed: provenanceChecks.length > 0 && provenanceChecks.every(({ passed }) => passed),
  failures: provenanceChecks.filter(({ passed }) => !passed).map(({ label }) => label), checks: provenanceChecks,
  product: { ...ICE, observedGitBlob: lsTree[2] ?? null, observedBytes: iceBytes.length, observedSha256: hash(iceBytes) },
  catalog: { path: catalogPath, gitBlob: catalogGitBlob, bytes: catalogBytes.length, sha256: hash(catalogBytes), runtime: runtimeCatalog },
  runtimeResponses: rawIceResponses,
  runtimeClassification: runtimeIceClassification,
  originalAcquisition: { filename: ICE.originalFilename, sha256: null, status: 'OPEN / login required', productOggIsOriginal: false, previewSubstitutionAllowed: false },
  humanStatus: HUMAN_STATUS,
};
if (!iceProvenance.passed) failures.push(...iceProvenance.failures.map((value) => `Ice provenance: ${value}`));

const lifecycleProof = {
  hmr: hmrProof,
  canvasOwners: {
    initial: { canvasCount: initial.canvasCount, canvases: initial.tracker?.canvases },
    restartBefore: { canvasCount: restarted.before.canvasCount, canvases: restarted.before.canvases },
    restartAfter: { canvasCount: restarted.after.canvasCount, canvases: restarted.after.canvases },
    preferences: { canvasCount: changedPreferences.canvasCount, canvases: changedPreferences.tracker?.canvases },
    exit: { canvases: exited.tracker.canvases },
    reentry: { canvasCount: reentered.canvasCount, canvases: reentered.tracker?.canvases },
    hmrBaseline: { canvasCount: beforeHmr.canvasCount, canvases: beforeHmr.tracker?.canvases },
    hmrAfter: { canvasCount: afterHmr.canvasCount, canvases: afterHmr.tracker?.canvases },
    terminal: { canvases: terminal.canvases },
  },
  activeRafs: {
    initial: activeRafs(initial.tracker), restartBefore: activeRafs(restarted.before), restartAfter: activeRafs(restarted.after),
    preferences: activeRafs(changedPreferences.tracker), exit: activeRafs(exited.tracker), reentry: activeRafs(reentered.tracker),
    hmrBaseline: activeRafs(beforeHmr.tracker), hmrAfter: activeRafs(afterHmr.tracker), terminal: activeRafs(terminal),
  },
  relevantListeners: {
    initial: relevantListeners(initial.tracker), restartBefore: relevantListeners(restarted.before), restartAfter: relevantListeners(restarted.after),
    preferences: relevantListeners(changedPreferences.tracker), exit: relevantListeners(exited.tracker), reentry: relevantListeners(reentered.tracker),
    hmrBaseline: relevantListeners(beforeHmr.tracker), hmrAfter: relevantListeners(afterHmr.tracker), terminal: relevantListeners(terminal),
  },
  contexts: {
    initial: contextRecords(initial.tracker), restartBefore: contextRecords(restarted.before), restartAfter: contextRecords(restarted.after),
    preferences: contextRecords(changedPreferences.tracker), exit: contextRecords(exited.tracker), reentry: contextRecords(reentered.tracker),
    hmrBaseline: contextRecords(beforeHmr.tracker), hmrAfter: contextRecords(afterHmr.tracker), terminal: contextRecords(terminal),
  },
  contextEvents: {
    initial: contextEvents(initial.tracker), restartBefore: contextEvents(restarted.before), restartAfter: contextEvents(restarted.after),
    preferences: contextEvents(changedPreferences.tracker), exit: contextEvents(exited.tracker), reentry: contextEvents(reentered.tracker),
    hmrBaseline: contextEvents(beforeHmr.tracker), hmrAfter: contextEvents(afterHmr.tracker), terminal: contextEvents(terminal),
  },
  hmrContexts: {
    branch: hmrContextBranch, before: contextRecords(beforeHmr.tracker), after: contextRecords(afterHmr.tracker),
    beforeLiveContexts: beforeHmr.tracker?.liveContexts, afterLiveContexts: afterHmr.tracker?.liveContexts,
  },
  preHmrContexts: {
    reentry: contextRecords(reentered.tracker), beforeHmr: contextRecords(beforeHmr.tracker),
    reentryLiveContexts: reentered.tracker?.liveContexts, beforeHmrLiveContexts: beforeHmr.tracker?.liveContexts,
  },
  terminalContexts: {
    afterHmr: contextRecords(afterHmr.tracker), terminal: contextRecords(terminal),
    afterHmrLiveContexts: afterHmr.tracker?.liveContexts, terminalLiveContexts: terminal.liveContexts,
  },
};
const lifecycleAssertions = {
  realProductRoute: page.url().startsWith(origin.replace(/\/$/u, '')),
  observationsClean: observed.consoleErrors.length === 0 && observed.pageErrors.length === 0 && observed.requestErrors.length === 0,
  initialOwners: initial.canvasCount === 1 && initial.tracker?.canvases === 1 && initial.domCellCount === 0 && initial.tracker?.liveContexts === 1 && activeRafs(initial.tracker) >= 1,
  initialContextRecordExact: validContextSnapshot(initial.tracker) && contextRecords(initial.tracker)?.length === 1 && contextRecords(initial.tracker)?.[0]?.id !== null
    && contextRecords(initial.tracker)?.[0]?.closed === false && contextRecords(initial.tracker)?.[0]?.closeCalls === 0,
  restartOwnersExact: sameIdentity(restarted.before.qaId, restarted.after.qaId) && sameIdentity(restarted.before.canvasId, restarted.after.canvasId)
    && restarted.after.liveContexts === 1,
  restartCanvasesExact: restarted.before.canvasCount === 1 && restarted.before.canvases === 1
    && restarted.after.canvasCount === 1 && restarted.after.canvases === 1,
  restartRafsExact: activeRafs(restarted.before) >= 1 && activeRafs(restarted.after) === activeRafs(restarted.before),
  restartContextsExact: sameContextRecords(restarted.before, restarted.after),
  restartListenersExact: sameRelevantListeners(restarted.before, restarted.after),
  preferencesOwnersExact: sameIdentity(changedPreferences.tracker?.qaId, initial.tracker?.qaId) && sameIdentity(changedPreferences.tracker?.canvasId, initial.tracker?.canvasId)
    && changedPreferences.tracker?.liveContexts === 1,
  preferencesCanvasesExact: changedPreferences.canvasCount === 1 && changedPreferences.tracker?.canvases === 1,
  preferencesRafsExact: activeRafs(changedPreferences.tracker) === activeRafs(restarted.after)
    && activeRafs(changedPreferences.tracker) === activeRafs(initial.tracker),
  preferencesContextsExact: sameContextRecords(restarted.after, changedPreferences.tracker)
    && sameContextRecords(initial.tracker, changedPreferences.tracker),
  preferencesListenersExact: sameRelevantListeners(initial.tracker, changedPreferences.tracker),
  exitOwnersClean: exited.oldRendererRetired && exited.tracker.canvases === 0 && exited.tracker.liveContexts === 0 && !exited.qaPresent && !exited.textHook,
  exitRafsZero: activeRafs(exited.tracker) === 0,
  exitListenersZero: noRelevantListeners(exited.tracker),
  exitContextsClosedExact: closedContextSuccessors(changedPreferences.tracker, exited.tracker),
  reentryOwnersFresh: differentIdentity(reentered.tracker?.qaId, initial.tracker?.qaId) && differentIdentity(reentered.tracker?.canvasId, initial.tracker?.canvasId)
    && reentered.tracker?.liveContexts === 1,
  reentryCanvasesExact: reentered.canvasCount === 1 && reentered.tracker?.canvases === 1,
  reentryRafsExact: activeRafs(reentered.tracker) === activeRafs(changedPreferences.tracker),
  reentryContextsExact: exactReentryContexts(changedPreferences.tracker, reentered.tracker),
  reentryListenersExact: sameRelevantListeners(changedPreferences.tracker, reentered.tracker),
  hmrEventWindowExact: observed.events.every((/** @type {any} */ event, /** @type {number} */ index) => event?.sequence === index + 1)
    && eventMarker.eventSequence === (eventMarker.eventIndex === 0 ? 0 : observed.events[eventMarker.eventIndex - 1]?.sequence)
    && eventEnd.eventSequence === observed.events[eventEnd.eventIndex - 1]?.sequence
    && deepEqual(hmrEvents, observed.events.slice(eventMarker.eventIndex, eventEnd.eventIndex)),
  hmrAppTouchExact: hmr.appTouch.beforeBytes === hmr.appTouch.afterBytes && hmr.appTouch.beforeSha256 === hmr.appTouch.afterSha256
    && hmr.appTouch.requestedMtimeMs > hmr.appTouch.beforeMtimeMs && hmr.appTouch.afterMtimeMs > hmr.appTouch.beforeMtimeMs,
  hmrProofExact: deepEqual(hmr.proof, deriveHmrProof(hmr)),
  hmrDelivered: hmrProof.eventOrderValid && hmrProof.counts.appRequests + hmrProof.counts.fullReloadFrames >= 1,
  hmrOwnersBound: afterHmr.canvasCount === 1 && afterHmr.tracker?.liveContexts === 1 && hmrProof.ownerIdentitiesValid,
  hmrRafBaselineActive: activeRafs(beforeHmr.tracker) >= 1,
  hmrRafsExact: activeRafs(afterHmr.tracker) === activeRafs(beforeHmr.tracker),
  hmrRafsNotDoubled: activeRafs(afterHmr.tracker) <= activeRafs(beforeHmr.tracker),
  hmrListenersExact: sameRelevantListeners(beforeHmr.tracker, afterHmr.tracker),
  preHmrContextsExact: exactPreHmrContextContinuity(reentered.tracker, beforeHmr.tracker),
  hmrContextBranchValid: hmrProof.passed && hmrContextBranch !== 'invalid',
  hmrContextsExact: exactHmrContexts(beforeHmr.tracker, afterHmr.tracker, hmrContextBranch),
  terminalOwnersClean: terminal.canvases === 0 && terminal.liveContexts === 0,
  terminalRafsZero: activeRafs(terminal) === 0,
  terminalListenersZero: noRelevantListeners(terminal),
  terminalContextsExact: exactTerminalContexts(afterHmr.tracker, terminal),
};
for (const [label, passed] of Object.entries(lifecycleAssertions)) check(passed, `lifecycle assertion: ${label}`);

const report = {
  schema: 'tetramorph.t37.material-browser.v1', generatedAt: new Date().toISOString(),
  origin, pageUrl: page.url(), browser: await browser.version(), passed: failures.length === 0, failures,
  initial, afterFreeze, restarted, changedPreferences, exited, reentered,
  hmr,
  terminal, observations: observed, lifecycleProof, assertions: lifecycleAssertions,
  humanStatus: HUMAN_STATUS,
};

await writeFile(join(root, 'ice-provenance-audit.json'), `${JSON.stringify(iceProvenance, null, 2)}\n`, 'utf8');
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await context.close();
await browser.close();
if (!report.passed) throw new Error(failures.join('\n'));
