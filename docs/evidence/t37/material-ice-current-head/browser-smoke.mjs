// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync, statSync, utimesSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import {
  AUTH, BASE, HUMAN_STATUS, ICE, SEEDS, assertRuntimeInputBinding, cleanGitObject,
  repo, runGitBytes, runGitText, root,
} from './evidence-contract.mjs';
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
const git = (...args) => runGitText(...args);
/** @param {string} head @param {string} path */
const gitBytes = (head, path) => runGitBytes('show', `${head}:${path}`);
/** @param {Buffer} bytes */
const cleanAppBlob = (bytes) => cleanGitObject(bytes, 'src/App.tsx');
/** @param {Buffer} bytes */
function canonicalAppBytes(bytes) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error('src/App.tsx checkout has a UTF-8 BOM.');
  const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/\r(?!\n)/u.test(value)) throw new Error('src/App.tsx checkout has a bare CR.');
  return Buffer.from(value.replace(/\r\n/gu, '\n'), 'utf8');
}
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
    && delta[1]?.kind === 'close-resolve' && sameIdentity(delta[1]?.id, baseline.at(-1)?.id)
    && delta[2]?.kind === 'create' && sameIdentity(delta[2]?.id, fresh.id);
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
    && delta[1]?.kind === 'close-resolve' && sameIdentity(delta[1]?.id, oldLive?.id)
    && delta[2]?.kind === 'create' && sameIdentity(delta[2]?.id, fresh?.id);
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
  if (bytes === null || (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) return null;
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; }
  const markers = source.match(/\/\/# sourceMappingURL=data:/gu) ?? [];
  if (markers.length > 1) return null;
  if (markers.length === 1) {
    const map = /\r?\n\/\/# sourceMappingURL=data:application\/json(?:;charset=utf-8)?;base64,([A-Za-z0-9+/]+={0,2})(?:\r?\n)?$/u.exec(source);
    if (!map) return null;
    const mapBytes = canonicalBase64(map[1]);
    if (mapBytes === null) return null;
    let parsedMap;
    try { parsedMap = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mapBytes)); } catch { return null; }
    if (parsedMap === null || typeof parsedMap !== 'object' || Array.isArray(parsedMap) || parsedMap.version !== 3
      || !Array.isArray(parsedMap.sources) || parsedMap.sources.length === 0 || !parsedMap.sources.every((/** @type {any} */ value) => typeof value === 'string')
      || !Array.isArray(parsedMap.names) || !parsedMap.names.every((/** @type {any} */ value) => typeof value === 'string') || typeof parsedMap.mappings !== 'string'
      || (Object.prototype.hasOwnProperty.call(parsedMap, 'sourcesContent') && (!Array.isArray(parsedMap.sourcesContent)
        || parsedMap.sourcesContent.length !== parsedMap.sources.length || !parsedMap.sourcesContent.every((/** @type {any} */ value) => value === null || typeof value === 'string')))) return null;
    source = source.slice(0, map.index);
  }
  if (source.endsWith('\r\n')) source = source.slice(0, -2);
  else if (source.endsWith('\n')) source = source.slice(0, -1);
  return source === `export default "${expectedPath}"` ? expectedPath : null;
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
const appEventKinds = new Set(['request', 'response', 'requestfinished', 'requestfailed', 'app-response', 'app-requestfinished', 'app-requestfailed']);
/** @param {any} value @param {string[]} expected */
function plainExactKeys(value, expected) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.every((key) => typeof key === 'string') && deepEqual(keys.map(String).sort(), [...expected].sort());
}
/** @param {any} event */
function isAppNamespaceEvent(event) {
  if (!appEventKinds.has(event?.kind) || typeof event?.url !== 'string') return false;
  try { return new URL(event.url).pathname === appPathname; } catch { return event.url.includes(appPathname); }
}
/** @param {any} event @param {string} expectedOrigin */
const isAppEvent = (event, expectedOrigin) => isAppNamespaceEvent(event) && Number.isInteger(event?.requestId) && event.requestId > 0
  && event?.method === 'GET' && event?.resourceType === 'script' && event?.mainFrame === true && event?.navigationRequest === false
  && (event?.ifNoneMatch === null || (typeof event?.ifNoneMatch === 'string' && event.ifNoneMatch.length > 0))
  && eventUrl(event)?.origin === new URL(expectedOrigin).origin && eventUrl(event)?.pathname === appPathname;
/** @param {any} event @param {string} expectedOrigin */
const isAppRequest = (event, expectedOrigin) => event?.kind === 'request' && isAppEvent(event, expectedOrigin)
  && plainExactKeys(event, ['sequence', 'kind', 'requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch']);
/** @param {Buffer} body */
const viteWeakEtag = (body) => `W/"${body.length.toString(16)}-${createHash('sha1').update(body).digest('base64').substring(0, 27)}"`;
const viteInlineSourceMapMarker = Buffer.from('\n//# sourceMappingURL=data:application/json;base64,', 'utf8');
/** @param {Buffer} body @param {unknown} etag @returns {Buffer|null} */
function exactViteEtagEntity(body, etag) {
  if (!Buffer.isBuffer(body) || typeof etag !== 'string') return null;
  const match = /^W\/"([1-9a-f][0-9a-f]*)-([A-Za-z0-9+/]{27})"$/u.exec(etag);
  if (!match) return null;
  const entityLength = Number.parseInt(match[1], 16);
  if (!Number.isSafeInteger(entityLength) || entityLength <= 0 || entityLength >= body.length) return null;
  const entity = body.subarray(0, entityLength);
  if (!body.subarray(entityLength, entityLength + viteInlineSourceMapMarker.length).equals(viteInlineSourceMapMarker)) return null;
  let encodedMap;
  try { encodedMap = new TextDecoder('utf-8', { fatal: true }).decode(body.subarray(entityLength + viteInlineSourceMapMarker.length)); } catch { return null; }
  const mapBytes = canonicalBase64(encodedMap);
  if (mapBytes === null) return null;
  let sourceMap;
  try { sourceMap = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mapBytes)); } catch { return null; }
  if (!plainExactKeys(sourceMap, ['mappings', 'names', 'sources', 'version', 'sourcesContent'])
    || sourceMap.version !== 3 || !deepEqual(sourceMap.sources, ['App.tsx'])
    || !Array.isArray(sourceMap.names) || sourceMap.names.length !== 0
    || typeof sourceMap.mappings !== 'string' || sourceMap.mappings.length === 0
    || !Array.isArray(sourceMap.sourcesContent) || sourceMap.sourcesContent.length !== 1
    || typeof sourceMap.sourcesContent[0] !== 'string') return null;
  return viteWeakEtag(entity) === etag ? entity : null;
}
/** @param {any} event @param {string} expectedOrigin */
function isFreshAppResponse(event, expectedOrigin) {
  const body = canonicalBase64(event?.bodyBase64);
  return event?.kind === 'app-response' && isAppEvent(event, expectedOrigin)
    && plainExactKeys(event, ['sequence', 'kind', 'requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch',
      'status', 'contentType', 'etag', 'bodyDisposition', 'bodyEncoding', 'bodyBase64'])
    && event?.status === 200 && ['text/javascript', 'application/javascript'].includes(contentTypeEssence(event?.contentType) ?? '')
    && body !== null && exactViteEtagEntity(body, event?.etag) !== null && event?.bodyDisposition === 'captured'
    && event?.bodyEncoding === 'base64' && !Object.prototype.hasOwnProperty.call(event ?? {}, 'bodyUnavailable')
    && !Object.prototype.hasOwnProperty.call(event ?? {}, 'bodyError');
}
/** @param {any} event @param {string} expectedOrigin */
const isNotModifiedAppResponse = (event, expectedOrigin) => event?.kind === 'app-response' && isAppEvent(event, expectedOrigin)
  && plainExactKeys(event, ['sequence', 'kind', 'requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch',
    'status', 'contentType', 'etag', 'bodyDisposition', 'bodyEncoding', 'bodyBase64'])
  && event?.status === 304 && event?.contentType === null
  && typeof event?.ifNoneMatch === 'string' && event.ifNoneMatch.length > 0
  && event?.etag === null
  && event?.bodyDisposition === 'not-modified' && event?.bodyEncoding === null && event?.bodyBase64 === null
  && !Object.prototype.hasOwnProperty.call(event ?? {}, 'bodyError');
/** @param {any} event @param {string} expectedOrigin */
const isAppResponse = (event, expectedOrigin) => isFreshAppResponse(event, expectedOrigin) || isNotModifiedAppResponse(event, expectedOrigin);
/** @param {any} event @param {string} expectedOrigin */
const isAppFinished = (event, expectedOrigin) => event?.kind === 'app-requestfinished' && isAppEvent(event, expectedOrigin)
  && plainExactKeys(event, ['sequence', 'kind', 'requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch']);
/** @param {any} event @param {string} expectedOrigin */
const isAppFailed = (event, expectedOrigin) => event?.kind === 'app-requestfailed' && isAppEvent(event, expectedOrigin)
  && plainExactKeys(event, ['sequence', 'kind', 'requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch', 'errorText'])
  && typeof event?.errorText === 'string' && event.errorText.length > 0;
/** @param {any} event @param {string} expectedOrigin */
function isValidAppNamespaceEvent(event, expectedOrigin) {
  if (event?.kind === 'request') return isAppRequest(event, expectedOrigin);
  if (event?.kind === 'app-response') return isAppResponse(event, expectedOrigin);
  if (event?.kind === 'app-requestfinished') return isAppFinished(event, expectedOrigin);
  if (event?.kind === 'app-requestfailed') return isAppFailed(event, expectedOrigin);
  return false;
}
/** @param {any} event */
const isDocumentRequest = (event) => event?.kind === 'request' && event?.method === 'GET' && event?.resourceType === 'document'
  && event?.mainFrame === true && event?.navigationRequest === true;
/** @param {any} event */
const isDocumentNavigation = (event) => event?.kind === 'document-navigation' && event?.mainFrame === true
  && plainExactKeys(event, ['sequence', 'kind', 'url', 'mainFrame', 'documentRequestId', 'documentRequestSequence'])
  && Number.isInteger(event?.documentRequestId) && event.documentRequestId > 0
  && Number.isInteger(event?.documentRequestSequence) && event.documentRequestSequence > 0 && typeof event?.url === 'string';
/** @param {any} event */
const isSameDocumentNavigation = (event) => event?.kind === 'same-document-navigation' && event?.mainFrame === true
  && plainExactKeys(event, ['sequence', 'kind', 'url', 'mainFrame']) && typeof event?.url === 'string';
/** @param {any} event */
const isUnboundNavigation = (event) => event?.kind === 'unbound-navigation' && event?.mainFrame === true
  && plainExactKeys(event, ['sequence', 'kind', 'url', 'mainFrame', 'pendingDocumentRequests'])
  && typeof event?.url === 'string' && Array.isArray(event?.pendingDocumentRequests) && event.pendingDocumentRequests.length > 0;
/** @param {any} event */
const isHistoryCall = (event) => event?.kind === 'history-call'
  && plainExactKeys(event, ['sequence', 'kind', 'documentEpoch', 'callId', 'method', 'beforeUrl', 'afterUrl', 'urlArgument', 'cause', 'causeTransport'])
  && Number.isInteger(event?.documentEpoch) && event.documentEpoch > 0 && Number.isInteger(event?.callId) && event.callId > 0
  && ['replaceState', 'pushState'].includes(event?.method) && typeof event?.beforeUrl === 'string' && typeof event?.afterUrl === 'string'
  && (event?.urlArgument === null || typeof event?.urlArgument === 'string')
  && ((event?.cause === null && event?.causeTransport === null)
    || (event?.cause === 'ui-exit-confirm-click' && ['direct-event', 'view-transition-callback'].includes(event?.causeTransport)));
/** @param {any} event */
function historyUrlExact(event) {
  try {
    return event.urlArgument === null ? event.beforeUrl === event.afterUrl : new URL(event.urlArgument, event.beforeUrl).href === event.afterUrl;
  } catch { return false; }
}
/** @param {any} event */
function rawWebsocketPayload(event) {
  if (event?.kind !== 'websocket-frame' || event?.direction !== 'received' || event?.encoding !== 'utf8' || typeof event?.body !== 'string') return null;
  try { return JSON.parse(event.body); } catch { return null; }
}
/** @param {any} event @param {string} expectedOrigin */
function exactViteWebsocketEndpoint(event, expectedOrigin) {
  const parsed = eventUrl(event); const http = new URL(expectedOrigin);
  return parsed !== null && parsed.protocol === (http.protocol === 'https:' ? 'wss:' : 'ws:')
    && parsed.host === http.host && parsed.pathname === '/' && parsed.hash === '';
}
/** @param {any} event @param {string} expectedOrigin */
function isAppUpdateFrame(event, expectedOrigin) {
  const payload = rawWebsocketPayload(event);
  if (!exactViteWebsocketEndpoint(event, expectedOrigin)) return false;
  return payload?.type === 'update' && Array.isArray(payload.updates) && payload.updates.some((/** @type {any} */ update) => {
    if (update?.type !== 'js-update') return false;
    return [update.path, update.acceptedPath].some((value) => {
      if (typeof value !== 'string') return false;
      try { return new URL(value, `${new URL(expectedOrigin).origin}/`).pathname === appPathname; } catch { return false; }
    });
  });
}
/** @param {any} event @param {string} expectedOrigin */
const isFullReloadFrame = (event, expectedOrigin) => exactViteWebsocketEndpoint(event, expectedOrigin) && rawWebsocketPayload(event)?.type === 'full-reload';
/** @param {any} value */
const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
/** @param {any} value */
const positiveInteger = (value) => Number.isInteger(value) && value > 0;
/** @param {any} snapshotValue */
function validBoardProbe(snapshotValue) {
  const probe = snapshotValue?.boardProbe;
  if (!plainExactKeys(probe, ['frame', 'resolution', 'outputPixels', 'pixelProbe'])
    || !plainExactKeys(probe.frame, ['x', 'y', 'width', 'height'])
    || !plainExactKeys(probe.outputPixels, ['width', 'height'])
    || !plainExactKeys(probe.pixelProbe, ['samples', 'nonTransparentSamples', 'distinctBuckets'])) return false;
  const { frame, resolution, outputPixels, pixelProbe } = probe;
  return finiteNumber(frame.x) && finiteNumber(frame.y) && finiteNumber(frame.width) && frame.width > 0
    && finiteNumber(frame.height) && frame.height > 0 && finiteNumber(resolution) && resolution > 0
    && positiveInteger(outputPixels.width) && positiveInteger(outputPixels.height)
    && positiveInteger(pixelProbe.samples) && positiveInteger(pixelProbe.nonTransparentSamples)
    && pixelProbe.nonTransparentSamples <= pixelProbe.samples && positiveInteger(pixelProbe.distinctBuckets)
    && pixelProbe.distinctBuckets <= pixelProbe.samples;
}
/** @param {any} left @param {any} right */
function sameAppRequestMetadata(left, right) {
  return ['requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch']
    .every((field) => deepEqual(left?.[field], right?.[field]));
}
/** @param {any} request @param {any[]} responses @param {any[]} finished @param {any[]} failed */
function appTransfer(request, responses, finished, failed) {
  const matchingResponses = responses.filter((event) => event.requestId === request.requestId);
  const matchingFinished = finished.filter((event) => event.requestId === request.requestId);
  const matchingFailed = failed.filter((event) => event.requestId === request.requestId);
  const response = matchingResponses[0]; const completion = matchingFinished[0];
  return {
    request, response, finished: completion,
    exact: matchingResponses.length === 1 && matchingFinished.length === 1 && matchingFailed.length === 0
      && sameAppRequestMetadata(request, response) && sameAppRequestMetadata(request, completion)
      && request.sequence < response?.sequence && response?.sequence < completion?.sequence,
  };
}
/** @param {any} event @param {string} expectedOrigin */
function isRelevantHmrEvent(event, expectedOrigin) {
  const payload = rawWebsocketPayload(event);
  return isAppNamespaceEvent(event) || isDocumentRequest(event)
    || isDocumentNavigation(event) || isUnboundNavigation(event)
    || payload?.type === 'update' || payload?.type === 'full-reload';
}
/** @param {any} event */
const isHistoryBoundaryEvent = (event) => event?.kind === 'history-call' || event?.kind === 'same-document-navigation';
/** @param {any[]} all @param {any} hmr @param {string} expectedOrigin */
function exactHmrEventWindow(all, hmr, expectedOrigin) {
  const marker = hmr?.marker;
  const uiExitArm = marker?.uiExitArm;
  if (!Array.isArray(all) || !plainExactKeys(marker, ['eventIndex', 'eventSequence', 'navigationArm', 'endEventIndex', 'endEventSequence', 'uiExitArm'])
    || !plainExactKeys(marker.navigationArm, ['eventIndex', 'eventSequence', 'url']) || !plainExactKeys(uiExitArm, ['eventIndex', 'eventSequence'])
    || !Number.isInteger(marker.eventIndex) || !Number.isInteger(marker.endEventIndex) || !Number.isInteger(uiExitArm.eventIndex)
    || marker.eventIndex < 0 || marker.endEventIndex <= marker.eventIndex || uiExitArm.eventIndex < marker.endEventIndex || uiExitArm.eventIndex > all.length) return false;
  const beforeSequence = marker.eventIndex === 0 ? 0 : all[marker.eventIndex - 1]?.sequence;
  const endSequence = all[marker.endEventIndex - 1]?.sequence;
  const uiExitArmSequence = uiExitArm.eventIndex === 0 ? 0 : all[uiExitArm.eventIndex - 1]?.sequence;
  const arm = marker.navigationArm;
  return all.every((event, index) => event?.sequence === index + 1)
    && marker.eventSequence === beforeSequence && marker.endEventSequence === endSequence
    && uiExitArm.eventSequence === uiExitArmSequence
    && arm?.eventIndex === marker.eventIndex && arm?.eventSequence === marker.eventSequence && arm?.url === hmr?.before?.navigation?.url
    && deepEqual(all.slice(marker.eventIndex, marker.endEventIndex), hmr?.events)
    && all.slice(marker.endEventIndex, uiExitArm.eventIndex).every((event) => !isHistoryBoundaryEvent(event))
    && all.slice(marker.endEventIndex).every((event) => !isRelevantHmrEvent(event, expectedOrigin));
}
/** @param {any[]} all @param {any} hmr @param {string} expectedOrigin */
function exactUiExitHistory(all, hmr, expectedOrigin) {
  const armIndex = hmr?.marker?.uiExitArm?.eventIndex;
  if (!Array.isArray(all) || !Number.isInteger(armIndex) || armIndex < 0 || armIndex > all.length) return false;
  const tail = all.slice(armIndex);
  const historyNamespace = tail.filter((event) => event?.kind === 'history-call');
  const sameDocumentNamespace = tail.filter((event) => event?.kind === 'same-document-navigation');
  const historyCalls = historyNamespace.filter(isHistoryCall);
  const sameDocumentNavigations = sameDocumentNamespace.filter(isSameDocumentNavigation);
  if (historyCalls.length !== 1 || historyCalls.length !== historyNamespace.length
    || sameDocumentNavigations.length !== 1 || sameDocumentNavigations.length !== sameDocumentNamespace.length) return false;
  const call = historyCalls[0]; const navigation = sameDocumentNavigations[0];
  let homeUrlExact = false;
  try {
    const parsed = new URL(call.afterUrl);
    homeUrlExact = parsed.origin === new URL(expectedOrigin).origin && parsed.pathname === '/' && parsed.search === '' && parsed.hash === '';
  } catch { return false; }
  return call.method === 'pushState' && call.urlArgument === '/'
    && call.cause === 'ui-exit-confirm-click' && call.causeTransport === 'view-transition-callback'
    && call.documentEpoch === hmr?.after?.navigation?.epoch && call.callId === 2
    && call.beforeUrl === hmr?.after?.navigation?.url && historyUrlExact(call) && homeUrlExact
    && navigation.sequence + 1 === call.sequence
    && navigation.url === call.afterUrl && navigation.mainFrame === true;
}
/** @param {any} marker */
const exactPhaseMarker = (marker) => plainExactKeys(marker, ['eventIndex', 'eventSequence'])
  && Number.isInteger(marker.eventIndex) && marker.eventIndex >= 0
  && Number.isInteger(marker.eventSequence) && marker.eventSequence >= 0 && marker.eventIndex === marker.eventSequence;
/** @param {any[]} events @param {any[]} responses @param {any} phaseMarkers */
function exactInitialIceEventBinding(events, responses, phaseMarkers) {
  const initial = events.filter((event) => event?.kind === 'ice-response');
  const initialEnd = phaseMarkers?.initialEnd;
  const fields = ['requestId', 'url', 'status', 'method', 'resourceType', 'contentType', 'redirectedFrom', 'captureWindow', 'bodyEncoding', 'body'];
  return exactPhaseMarker(initialEnd) && initial.length === 2 && responses.length === 2 && initial.every((event, index) => event.sequence === responses[index]?.sequence
    && Number.isInteger(event?.requestId) && event.requestId > 0
    && Number.isInteger(responses[index]?.requestId) && responses[index].requestId > 0
    && fields.every((field) => deepEqual(event?.[field], responses[index]?.[field]))
    && Object.prototype.hasOwnProperty.call(event, 'bodyError') === Object.prototype.hasOwnProperty.call(responses[index] ?? {}, 'bodyError')
    && (!Object.prototype.hasOwnProperty.call(event, 'bodyError') || event.bodyError === responses[index]?.bodyError)
    && event.captureWindow === 'initial-freeze' && event.sequence <= initialEnd.eventSequence);
}
/** @param {any[]} events @param {any} phaseMarkers */
function exactIcePhaseClassification(events, phaseMarkers) {
  const { initialEnd, hmrArm, hmrEnd } = phaseMarkers ?? {};
  if (!plainExactKeys(phaseMarkers, ['initialEnd', 'hmrArm', 'hmrEnd'])
    || !exactPhaseMarker(initialEnd) || !exactPhaseMarker(hmrArm) || !exactPhaseMarker(hmrEnd)
    || initialEnd.eventSequence > hmrArm.eventSequence || hmrArm.eventSequence >= hmrEnd.eventSequence) return false;
  const definitions = [
    ['ice-response', 'initial-freeze', (/** @type {number} */ sequence) => sequence <= initialEnd.eventSequence],
    ['ice-response-pre-hmr', 'pre-hmr', (/** @type {number} */ sequence) => sequence > initialEnd.eventSequence && sequence <= hmrArm.eventSequence],
    ['ice-response-hmr', 'hmr', (/** @type {number} */ sequence) => sequence > hmrArm.eventSequence && sequence <= hmrEnd.eventSequence],
    ['ice-response-post-hmr', 'post-hmr', (/** @type {number} */ sequence) => sequence > hmrEnd.eventSequence],
  ];
  const iceEvents = events.filter((event) => typeof event?.kind === 'string' && event.kind.startsWith('ice-response'));
  return iceEvents.every((event) => {
    const definition = definitions.find(([kind]) => event.kind === kind);
    return definition !== undefined && Number.isInteger(event?.sequence) && Number.isInteger(event?.requestId) && event.requestId > 0
      && event.captureWindow === definition[1] && /** @type {(sequence: number) => boolean} */ (definition[2])(event.sequence);
  });
}
/** @param {any} phaseMarkers @param {any} hmrMarker */
function exactIceHmrMarkerBinding(phaseMarkers, hmrMarker) {
  return plainExactKeys(phaseMarkers, ['initialEnd', 'hmrArm', 'hmrEnd'])
    && exactPhaseMarker(phaseMarkers.initialEnd) && exactPhaseMarker(phaseMarkers.hmrArm) && exactPhaseMarker(phaseMarkers.hmrEnd)
    && Number.isInteger(hmrMarker?.eventIndex) && Number.isInteger(hmrMarker?.eventSequence)
    && Number.isInteger(hmrMarker?.endEventIndex) && Number.isInteger(hmrMarker?.endEventSequence)
    && deepEqual(phaseMarkers.hmrArm, { eventIndex: hmrMarker.eventIndex, eventSequence: hmrMarker.eventSequence })
    && deepEqual(phaseMarkers.hmrEnd, { eventIndex: hmrMarker.endEventIndex, eventSequence: hmrMarker.endEventSequence });
}
/** @param {any} hmr @param {string} expectedOrigin */
function deriveHmrProof(hmr, expectedOrigin) {
  const events = Array.isArray(hmr?.events) ? hmr.events : [];
  const markerSequence = Number(hmr?.marker?.eventSequence ?? 0);
  const sequencesValid = events.length > 0 && events.every((/** @type {any} */ event, /** @type {number} */ index) => Number.isInteger(event?.sequence)
    && event.sequence === markerSequence + index + 1);
  const documentRequests = events.filter(isDocumentRequest);
  const documentNavigations = events.filter(isDocumentNavigation);
  const sameDocumentNavigations = events.filter(isSameDocumentNavigation);
  const unboundNavigations = events.filter(isUnboundNavigation);
  const historyNamespaceEvents = events.filter((/** @type {any} */ event) => event?.kind === 'history-call');
  const historyCalls = historyNamespaceEvents.filter(isHistoryCall);
  const historyNamespaceExact = historyCalls.length === historyNamespaceEvents.length;
  const appNamespaceEvents = events.filter(isAppNamespaceEvent);
  const appRequests = appNamespaceEvents.filter((/** @type {any} */ event) => isAppRequest(event, expectedOrigin));
  const appResponses = appNamespaceEvents.filter((/** @type {any} */ event) => isAppResponse(event, expectedOrigin));
  const appFinished = appNamespaceEvents.filter((/** @type {any} */ event) => isAppFinished(event, expectedOrigin));
  const appFailed = appNamespaceEvents.filter((/** @type {any} */ event) => isAppFailed(event, expectedOrigin));
  const appNamespaceExact = appNamespaceEvents.every((/** @type {any} */ event) => isValidAppNamespaceEvent(event, expectedOrigin))
    && appNamespaceEvents.length === appRequests.length + appResponses.length + appFinished.length + appFailed.length;
  const updateFrames = events.filter((/** @type {any} */ event) => isAppUpdateFrame(event, expectedOrigin));
  const fullReloadFrames = events.filter((/** @type {any} */ event) => isFullReloadFrame(event, expectedOrigin));
  const hmrFrames = events.filter((/** @type {any} */ event) => ['update', 'full-reload'].includes(rawWebsocketPayload(event)?.type));
  const websocketEndpointsValid = hmrFrames.length > 0 && hmrFrames.every((/** @type {any} */ event) => exactViteWebsocketEndpoint(event, expectedOrigin));
  const navigationSequence = documentNavigations[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const documentSequence = documentRequests[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const preNavigationApps = appRequests.filter((/** @type {any} */ event) => event.sequence < documentSequence);
  const bootstrapApps = appRequests.filter((/** @type {any} */ event) => event.sequence > navigationSequence);
  const transfers = appRequests.map((/** @type {any} */ request) => appTransfer(request, appResponses, appFinished, appFailed));
  const requestIdsUnique = new Set(appRequests.map((/** @type {any} */ request) => request.requestId)).size === appRequests.length;
  const requestIdsMonotonic = appRequests.every((/** @type {any} */ request, /** @type {number} */ index) => index === 0 || appRequests[index - 1].requestId < request.requestId);
  const appTransfersExact = appNamespaceExact && requestIdsUnique && requestIdsMonotonic && transfers.length > 0
    && transfers.every((/** @type {any} */ transfer) => transfer.exact)
    && appResponses.length === appRequests.length && appFinished.length === appRequests.length && appFailed.length === 0;
  const documentNavigationBindingExact = documentRequests.length === 1 && documentNavigations.length === 1 && unboundNavigations.length === 0
    && documentNavigations[0]?.documentRequestId === documentRequests[0]?.requestId
    && documentNavigations[0]?.documentRequestSequence === documentRequests[0]?.sequence
    && documentNavigations[0]?.url === documentRequests[0]?.url
    && documentRequests[0]?.sequence < documentNavigations[0]?.sequence;
  const beforeEpoch = Number(hmr?.before?.navigation?.epoch); const afterEpoch = Number(hmr?.after?.navigation?.epoch);
  const owner = hmr?.oldOwner ?? {};
  let branch = 'invalid';
  if (sequencesValid && beforeEpoch === afterEpoch && documentRequests.length === 0 && documentNavigations.length === 0 && unboundNavigations.length === 0) {
    if (owner.ownerPresent === true && owner.sameOwner === true && owner.oldRenderer === 'active') branch = 'same-owner';
    else if (owner.ownerPresent === true && owner.sameOwner === false && owner.oldRenderer === 'retired') branch = 'same-realm-replacement';
  } else if (sequencesValid && afterEpoch === beforeEpoch + 1 && documentNavigationBindingExact
    && owner.ownerPresent === false && owner.sameOwner === false && owner.oldRenderer === 'unavailable') branch = 'document-reload';
  let delivery = 'invalid';
  if (branch === 'same-owner' || branch === 'same-realm-replacement') delivery = 'hot-update';
  else if (branch === 'document-reload' && preNavigationApps.length > 0) delivery = 'update-fallback-reload';
  else if (branch === 'document-reload' && preNavigationApps.length === 0 && fullReloadFrames.length > 0) delivery = 'direct-full-reload';
  const firstUpdate = updateFrames[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const firstFull = fullReloadFrames[0]?.sequence ?? null;
  const sameUrlReload = documentNavigationBindingExact
    && documentRequests[0]?.url === hmr?.before?.navigation?.url && documentNavigations[0]?.url === hmr?.before?.navigation?.url
    && hmr?.after?.navigation?.url === hmr?.before?.navigation?.url;
  let eventOrderValid = false;
  const preTransfer = transfers.find((/** @type {any} */ transfer) => transfer.request === preNavigationApps[0]);
  const bootstrapTransfer = transfers.find((/** @type {any} */ transfer) => transfer.request === bootstrapApps[0]);
  const cacheBridgeExact = preTransfer?.exact === true && bootstrapTransfer?.exact === true
    && isFreshAppResponse(preTransfer.response, expectedOrigin)
    && preTransfer.request.url === bootstrapTransfer.request.url
    && (isFreshAppResponse(bootstrapTransfer.response, expectedOrigin)
      || (isNotModifiedAppResponse(bootstrapTransfer.response, expectedOrigin)
        && typeof preTransfer.response?.etag === 'string' && preTransfer.response.etag.length > 0
        && bootstrapTransfer.request.ifNoneMatch === preTransfer.response.etag));
  const sameDocumentNavigationExact = branch === 'document-reload'
    ? historyNamespaceExact && historyCalls.length === 1 && historyCalls[0]?.method === 'replaceState'
      && historyCalls[0]?.documentEpoch === afterEpoch && historyCalls[0]?.callId === 1
      && historyCalls[0]?.cause === null && historyCalls[0]?.causeTransport === null && historyUrlExact(historyCalls[0])
      && historyCalls[0]?.beforeUrl === hmr?.after?.navigation?.url && historyCalls[0]?.afterUrl === hmr?.after?.navigation?.url
      && sameDocumentNavigations.length === 1 && bootstrapTransfer?.finished?.sequence < historyCalls[0]?.sequence
      && bootstrapTransfer?.finished?.sequence < sameDocumentNavigations[0]?.sequence
      && sameDocumentNavigations[0]?.sequence + 1 === historyCalls[0]?.sequence
      && sameDocumentNavigations[0]?.url === historyCalls[0]?.afterUrl
    : historyNamespaceExact && historyCalls.length === 0 && sameDocumentNavigations.length === 0;
  if (delivery === 'hot-update') {
    const transfer = transfers[0];
    eventOrderValid = updateFrames.length === 1 && fullReloadFrames.length === 0 && documentRequests.length === 0 && documentNavigations.length === 0
      && unboundNavigations.length === 0 && transfers.length === 1 && firstUpdate < transfer?.request?.sequence && transfer?.exact === true
      && isFreshAppResponse(transfer?.response, expectedOrigin) && sameDocumentNavigationExact;
  } else if (delivery === 'update-fallback-reload') {
    eventOrderValid = updateFrames.length === 1 && fullReloadFrames.length <= 1 && preNavigationApps.length === 1 && bootstrapApps.length === 1
      && transfers.length === 2 && firstUpdate < preTransfer?.request?.sequence && preTransfer?.exact === true
      && preTransfer.finished.sequence < (firstFull ?? documentSequence) && (firstFull === null || firstFull < documentSequence)
      && documentSequence < navigationSequence && navigationSequence < bootstrapTransfer?.request?.sequence && bootstrapTransfer?.exact === true
      && cacheBridgeExact && sameDocumentNavigationExact;
  } else if (delivery === 'direct-full-reload') {
    eventOrderValid = updateFrames.length === 0 && fullReloadFrames.length === 1 && preNavigationApps.length === 0 && bootstrapApps.length === 1
      && transfers.length === 1 && firstFull !== null && firstFull < documentSequence && documentSequence < navigationSequence
      && navigationSequence < bootstrapTransfer?.request?.sequence && bootstrapTransfer?.exact === true
      && isFreshAppResponse(bootstrapTransfer?.response, expectedOrigin) && sameDocumentNavigationExact;
  }
  const beforeQa = identityRecord(hmr?.before?.tracker?.qaId); const afterQa = identityRecord(hmr?.after?.tracker?.qaId);
  const ownerProbeBound = owner.ownerPresent === true
    ? owner.probe?.target === '__MATERIAL_HMR_QA__' && sameIdentity(owner.probe?.targetIdentity, owner.ownerIdentity)
    : owner.ownerPresent === false && owner.probe?.target === null && owner.probe?.targetIdentity === null && owner.probe?.outcome === 'unavailable';
  const ownerIdentitiesValid = beforeQa !== null && afterQa !== null && sameIdentity(owner.beforeIdentity, beforeQa)
    && sameIdentity(owner.currentIdentity, afterQa) && ownerProbeBound && (branch === 'same-owner'
      ? sameIdentity(owner.beforeIdentity, owner.ownerIdentity) && sameIdentity(owner.beforeIdentity, owner.currentIdentity)
        && owner.probe?.outcome === 'success' && owner.oldRenderer === 'active'
      : branch === 'same-realm-replacement'
        ? sameIdentity(owner.beforeIdentity, owner.ownerIdentity) && differentIdentity(owner.beforeIdentity, owner.currentIdentity)
          && owner.probe?.outcome === 'throws' && owner.oldRenderer === 'retired'
        : branch === 'document-reload' && identityRecord(owner.beforeIdentity)?.epoch === beforeEpoch
          && identityRecord(owner.currentIdentity)?.epoch === afterEpoch && owner.oldRenderer === 'unavailable');
  const beforeCanvas = identityRecord(hmr?.before?.tracker?.canvasId); const afterCanvas = identityRecord(hmr?.after?.tracker?.canvasId);
  const canvasIdentitiesValid = beforeCanvas !== null && afterCanvas !== null && (branch === 'same-owner'
    ? sameIdentity(beforeCanvas, afterCanvas) : (branch === 'same-realm-replacement' || branch === 'document-reload') && differentIdentity(beforeCanvas, afterCanvas));
  const contextsExact = exactHmrContexts(hmr?.before?.tracker, hmr?.after?.tracker, /** @type {any} */ (branch));
  const preferencesStable = deepEqual(hmr?.before?.root, hmr?.after?.root)
    && deepEqual(hmr?.before?.root, { language: 'zh-CN', theme: 'mineral-mist', reducedMotion: 'true' });
  const boardProbesValid = validBoardProbe(hmr?.before) && validBoardProbe(hmr?.after);
  const reloadExact = branch !== 'document-reload' || (sameUrlReload && hmr?.after?.navigation?.type === 'reload'
    && bootstrapApps.length === 1 && hmr?.after?.canvasCount === 1 && hmr?.after?.tracker?.canvases === 1
    && activeRafs(hmr?.after?.tracker) === activeRafs(hmr?.before?.tracker)
    && sameRelevantListeners(hmr?.before?.tracker, hmr?.after?.tracker) && preferencesStable);
  const passed = branch !== 'invalid' && delivery !== 'invalid' && sequencesValid && websocketEndpointsValid && appTransfersExact
    && historyNamespaceExact && documentNavigationBindingExact === (branch === 'document-reload') && eventOrderValid && ownerIdentitiesValid
    && canvasIdentitiesValid && contextsExact && preferencesStable && boardProbesValid && reloadExact;
  return {
    branch, delivery, sequencesValid,
    epoch: { before: Number.isInteger(beforeEpoch) ? beforeEpoch : null, after: Number.isInteger(afterEpoch) ? afterEpoch : null },
    counts: { events: events.length, appNamespaceEvents: appNamespaceEvents.length,
      invalidAppNamespaceEvents: appNamespaceEvents.length - appRequests.length - appResponses.length - appFinished.length - appFailed.length,
      appRequests: appRequests.length, preNavigationAppRequests: preNavigationApps.length,
      bootstrapAppRequests: bootstrapApps.length, appResponses: appResponses.length, appFinished: appFinished.length, appFailed: appFailed.length,
      documentRequests: documentRequests.length, documentNavigations: documentNavigations.length,
      sameDocumentNavigations: sameDocumentNavigations.length, unboundNavigations: unboundNavigations.length,
      historyCalls: historyCalls.length, invalidHistoryCalls: historyNamespaceEvents.length - historyCalls.length,
      appUpdateFrames: updateFrames.length, fullReloadFrames: fullReloadFrames.length },
    sequence: { firstUpdate: Number.isFinite(firstUpdate) ? firstUpdate : null, firstFullReload: firstFull,
      documentRequest: Number.isFinite(documentSequence) ? documentSequence : null, navigation: Number.isFinite(navigationSequence) ? navigationSequence : null },
    binding: { beforeQa, afterQa, beforeCanvas, afterCanvas,
      beforeContextEventCursor: Number.isInteger(hmr?.before?.tracker?.contextEventCursor) ? hmr.before.tracker.contextEventCursor : null,
      afterContextEventCursor: Number.isInteger(hmr?.after?.tracker?.contextEventCursor) ? hmr.after.tracker.contextEventCursor : null },
    sameUrlReload, websocketEndpointsValid, appNamespaceExact, requestIdsUnique, requestIdsMonotonic, appTransfersExact,
    historyNamespaceExact, documentNavigationBindingExact, cacheBridgeExact, sameDocumentNavigationExact, eventOrderValid, ownerIdentitiesValid, canvasIdentitiesValid,
    contextsExact, preferencesStable, boardProbesValid, reloadExact, passed,
  };
}

/** @param {any} hmr */
function exactAppTouch(hmr) {
  const bytes = gitBytes(BASE, 'src/App.tsx'); const expectedSha = hash(bytes); const expectedBlob = git('rev-parse', `${BASE}:src/App.tsx`);
  const touch = hmr?.appTouch;
  const raw = touch?.raw; const canonical = touch?.canonical; const base = touch?.base;
  const cleanGitBlob = touch?.cleanGitBlob; const mtime = touch?.mtime;
  return plainExactKeys(touch, ['path', 'raw', 'canonical', 'base', 'cleanGitBlob', 'mtime']) && touch.path === 'src/App.tsx'
    && plainExactKeys(raw, ['beforeBytes', 'afterBytes', 'beforeSha256', 'afterSha256'])
    && Number.isInteger(raw.beforeBytes) && raw.beforeBytes > 0 && raw.afterBytes === raw.beforeBytes
    && typeof raw.beforeSha256 === 'string' && /^[0-9a-f]{64}$/u.test(raw.beforeSha256) && raw.afterSha256 === raw.beforeSha256
    && plainExactKeys(canonical, ['beforeBytes', 'afterBytes', 'beforeSha256', 'afterSha256'])
    && canonical.beforeBytes === bytes.length && canonical.afterBytes === bytes.length
    && canonical.beforeSha256 === expectedSha && canonical.afterSha256 === expectedSha
    && plainExactKeys(base, ['bytes', 'sha256', 'gitBlob'])
    && base.bytes === bytes.length && base.sha256 === expectedSha && base.gitBlob === expectedBlob
    && plainExactKeys(cleanGitBlob, ['before', 'after']) && cleanGitBlob.before === expectedBlob && cleanGitBlob.after === expectedBlob
    && plainExactKeys(mtime, ['beforeMs', 'requestedMs', 'afterMs'])
    && Number.isFinite(mtime.beforeMs) && Number.isFinite(mtime.requestedMs) && Number.isFinite(mtime.afterMs)
    && mtime.requestedMs - mtime.beforeMs >= 1000 && Math.abs(mtime.afterMs - mtime.requestedMs) <= 1;
}

const terminalOwnKeys = ['schema', 'generatedAt', 'passed', 'failures', 'checks', 'manifestSha256', 'evidenceSourceHead',
  'generatedInputHead', 'r5bTerminalBase', 'pathContracts', 'runtimeInput', 'humanStatus'];
/** @param {any} value */
const canonicalIso = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
/** @param {any} committed @param {any} expectedWithoutTimestamp */
function exactCommittedTerminal(committed, expectedWithoutTimestamp) {
  const expected = { ...expectedWithoutTimestamp, generatedAt: committed?.generatedAt };
  return committed !== null && typeof committed === 'object' && !Array.isArray(committed)
    && deepEqual(Object.keys(committed).sort(), [...terminalOwnKeys].sort()) && canonicalIso(committed.generatedAt)
    && Array.isArray(committed.checks) && committed.checks.length > 0
    && terminalOwnKeys.every((key) => deepEqual(committed[key], expected[key]));
}


/** @param {Buffer} assetBytes */
function runContractFixtures(assetBytes) {
  const clone = (/** @type {any} */ value) => structuredClone(value);
  const assertFixture = (/** @type {unknown} */ value, /** @type {string} */ label) => {
    if (!value) throw new Error(`contract fixture failed: ${label}`);
  };
  const iceUrl = `${normalizedOrigin}/${ICE.path}`;
  const moduleSource = `export default "/${ICE.path}"`;
  const sourceMap = { version: 3, sources: [`/${ICE.path}`], names: [], mappings: '', sourcesContent: [moduleSource] };
  const sourceMapBase64 = Buffer.from(JSON.stringify(sourceMap)).toString('base64');
  /** @type {any[]} */
  const goodIce = [
    { sequence: 1, requestId: 1, url: `${iceUrl}?import&url`, status: 200, method: 'GET', resourceType: 'script', contentType: 'text/javascript; charset=utf-8',
      redirectedFrom: null, captureWindow: 'initial-freeze', bodyEncoding: 'base64', body: Buffer.from(moduleSource).toString('base64') },
    { sequence: 2, requestId: 2, url: iceUrl, status: 200, method: 'GET', resourceType: 'fetch', contentType: 'audio/ogg; charset=binary',
      redirectedFrom: null, captureWindow: 'initial-freeze', bodyEncoding: 'base64', body: assetBytes.toString('base64') },
  ];
  assertFixture(classifyIceResponses(goodIce, normalizedOrigin).passed, 'valid Ice pair');
  const mapped = clone(goodIce);
  mapped[0].body = Buffer.from(`${moduleSource}\n//# sourceMappingURL=data:application/json;base64,${sourceMapBase64}`).toString('base64');
  assertFixture(classifyIceResponses(mapped, normalizedOrigin).passed, 'valid canonical EOF sourcemap');
  /** @type {Array<[string, (raw: any[]) => void]>} */
  const iceRejects = [
    ['duplicate asset', (raw) => raw.push({ ...clone(raw[1]), sequence: 3 })],
    ['wrong asset', (raw) => { const bytes = Buffer.from(assetBytes); bytes[0] ^= 0xff; raw[1].body = bytes.toString('base64'); }],
    ['missing module', (raw) => { raw.shift(); }],
    ['missing asset', (raw) => { raw.pop(); }],
    ['duplicate module', (raw) => raw.splice(1, 0, { ...clone(raw[0]), sequence: 2 })],
    ['query order', (raw) => { raw[0].url = `${iceUrl}?url&import`; }],
    ['query extra', (raw) => { raw[0].url = `${iceUrl}?import&url&x=1`; }],
    ['bare JS', (raw) => { raw[0].url = iceUrl; }],
    ['query Ogg', (raw) => { raw[1].url = `${iceUrl}?t=1`; }],
    ['cross origin', (raw) => { raw[1].url = `http://localhost:${new URL(normalizedOrigin).port}/${ICE.path}`; }],
    ['wrong path', (raw) => { raw[1].url = `${normalizedOrigin}/wrong/freeze-ice-cubes-hq.ogg`; }],
    ['non-200', (raw) => { raw[1].status = 206; }],
    ['redirect', (raw) => { raw[1].redirectedFrom = { url: `${normalizedOrigin}/old.ogg`, method: 'GET' }; }],
    ['POST', (raw) => { raw[1].method = 'POST'; }],
    ['wrong type', (raw) => { raw[1].resourceType = 'media'; }],
    ['wrong MIME', (raw) => { raw[1].contentType = 'application/octet-stream'; }],
    ['body error', (raw) => { raw[1].body = null; raw[1].bodyError = 'failed'; }],
    ['module semicolon', (raw) => { raw[0].body = Buffer.from(`${moduleSource};`).toString('base64'); }],
    ['module extra comment', (raw) => { raw[0].body = Buffer.from(`${moduleSource}\n// extra`).toString('base64'); }],
    ['module single quote', (raw) => { raw[0].body = Buffer.from(`export default '/${ICE.path}'`).toString('base64'); }],
    ['module UTF-8 BOM', (raw) => { raw[0].body = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(moduleSource)]).toString('base64'); }],
    ['noncanonical sourcemap', (raw) => {
      const invalid = sourceMapBase64.endsWith('=') ? sourceMapBase64.slice(0, -1) : `${sourceMapBase64}=`;
      raw[0].body = Buffer.from(`${moduleSource}\n//# sourceMappingURL=data:application/json;base64,${invalid}`).toString('base64');
    }],
    ['invalid sourcemap JSON', (raw) => {
      raw[0].body = Buffer.from(`${moduleSource}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from('{').toString('base64')}`).toString('base64');
    }],
    ['invalid sourcemap shape', (raw) => {
      raw[0].body = Buffer.from(`${moduleSource}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from('{}').toString('base64')}`).toString('base64');
    }],
    ['duplicate sourcemap', (raw) => {
      raw[0].body = Buffer.from(`${moduleSource}\n//# sourceMappingURL=data:application/json;base64,${sourceMapBase64}\n//# sourceMappingURL=data:application/json;base64,${sourceMapBase64}`).toString('base64');
    }],
  ];
  for (const [label, mutate] of iceRejects) {
    const raw = clone(goodIce); mutate(raw);
    assertFixture(!classifyIceResponses(raw, normalizedOrigin).passed, `reject Ice ${label}`);
  }
  const forged = clone(classifyIceResponses(goodIce, normalizedOrigin)); forged.entries[0].checks = {};
  assertFixture(!deepEqual(forged, classifyIceResponses(goodIce, normalizedOrigin)), 'reject forged Ice checks');
  const phaseMarkers = {
    initialEnd: { eventIndex: 2, eventSequence: 2 }, hmrArm: { eventIndex: 3, eventSequence: 3 }, hmrEnd: { eventIndex: 4, eventSequence: 4 },
  };
  const iceEvents = [
    ...goodIce.map((entry) => ({ kind: 'ice-response', ...clone(entry) })),
    { ...clone(goodIce[1]), sequence: 3, requestId: 3, kind: 'ice-response-pre-hmr', captureWindow: 'pre-hmr' },
    { ...clone(goodIce[1]), sequence: 4, requestId: 4, kind: 'ice-response-hmr', captureWindow: 'hmr' },
    { ...clone(goodIce[1]), sequence: 5, requestId: 5, kind: 'ice-response-post-hmr', captureWindow: 'post-hmr' },
  ];
  assertFixture(exactInitialIceEventBinding(iceEvents, goodIce, phaseMarkers), 'valid Ice event binding');
  assertFixture(exactIcePhaseClassification(iceEvents, phaseMarkers), 'valid Ice phase classification');
  const hmrPhaseMarker = { eventIndex: 3, eventSequence: 3, endEventIndex: 4, endEventSequence: 4 };
  assertFixture(exactIceHmrMarkerBinding(phaseMarkers, hmrPhaseMarker), 'valid Ice/HMR marker binding');
  const contradictoryIce = clone(iceEvents); contradictoryIce[0].contentType = 'audio/ogg';
  assertFixture(!exactInitialIceEventBinding(contradictoryIce, goodIce, phaseMarkers), 'reject Ice event metadata contradiction');
  const contradictoryIceRequestId = clone(iceEvents); contradictoryIceRequestId[0].requestId = 999;
  assertFixture(!exactInitialIceEventBinding(contradictoryIceRequestId, goodIce, phaseMarkers), 'reject Ice event requestId contradiction');
  /** @type {Array<[string, {events: any[], markers: any}]>} */
  const phaseRejects = [
    ['pre-HMR mislabeled HMR', { events: clone(iceEvents).map((/** @type {any} */ event) => event.sequence === 3 ? { ...event, kind: 'ice-response-hmr', captureWindow: 'hmr' } : event), markers: clone(phaseMarkers) }],
    ['HMR at arm boundary', { events: clone(iceEvents).map((/** @type {any} */ event) => event.sequence === 4 ? { ...event, sequence: 3 } : event), markers: clone(phaseMarkers) }],
    ['post-HMR inside HMR boundary', { events: clone(iceEvents).map((/** @type {any} */ event) => event.sequence === 5 ? { ...event, sequence: 4 } : event), markers: clone(phaseMarkers) }],
    ['marker order', { events: clone(iceEvents), markers: { ...clone(phaseMarkers), hmrEnd: clone(phaseMarkers.hmrArm) } }],
    ['marker extra key', { events: clone(iceEvents), markers: { ...clone(phaseMarkers), hmrArm: { ...clone(phaseMarkers.hmrArm), forged: true } } }],
    ['unknown Ice response phase', { events: [...clone(iceEvents), { ...clone(iceEvents[4]), sequence: 6, kind: 'ice-response-limbo' }], markers: clone(phaseMarkers) }],
  ];
  for (const [label, value] of phaseRejects) {
    assertFixture(!exactIcePhaseClassification(value.events, value.markers), `reject Ice phase ${label}`);
  }
  const markerBindingRejects = [
    ['HMR eventIndex drift', { ...hmrPhaseMarker, eventIndex: 2 }],
    ['HMR eventSequence drift', { ...hmrPhaseMarker, eventSequence: 2 }],
    ['HMR endEventIndex drift', { ...hmrPhaseMarker, endEventIndex: 5 }],
    ['HMR endEventSequence drift', { ...hmrPhaseMarker, endEventSequence: 5 }],
    ['internally valid shifted Ice window', { ...hmrPhaseMarker, eventIndex: 4, eventSequence: 4, endEventIndex: 5, endEventSequence: 5 }],
  ];
  for (const [label, marker] of markerBindingRejects) assertFixture(!exactIceHmrMarkerBinding(phaseMarkers, marker), `reject Ice/HMR marker ${label}`);

  const id = (/** @type {number} */ epoch, /** @type {number} */ value) => ({ epoch, id: value });
  const tracker = (/** @type {number} */ epoch, /** @type {any[]} */ contexts, /** @type {any[]} */ events, qa = 10, canvas = 20) => ({
    documentEpoch: epoch, qaId: id(epoch, qa), canvasId: id(epoch, canvas), canvases: 1, activeRafs: 1,
    listenerCounts: { 'window:keydown': 1, 'window:keyup': 1, 'window:blur': 1, 'document:visibilitychange': 1 },
    contexts, liveContexts: contexts.filter((entry) => !entry.closed && entry.state !== 'closed').length,
    contextEventCursor: events.length, contextEvents: events,
  });
  const live = (/** @type {number} */ epoch, qa = 10, canvas = 20) => tracker(epoch,
    [{ id: id(epoch, 1), closed: false, closeCalls: 0, state: 'suspended' }],
    [{ sequence: 1, kind: 'create', id: id(epoch, 1) }], qa, canvas);
  const replaced = tracker(1,
    [{ id: id(1, 1), closed: true, closeCalls: 1, state: 'closed' }, { id: id(1, 2), closed: false, closeCalls: 0, state: 'suspended' }],
    [{ sequence: 1, kind: 'create', id: id(1, 1) }, { sequence: 2, kind: 'close-call', id: id(1, 1), call: 1 },
      { sequence: 3, kind: 'close-resolve', id: id(1, 1), call: 1, state: 'closed' }, { sequence: 4, kind: 'create', id: id(1, 2) }], 11, 21);
  const route = `${normalizedOrigin}/play/mutation`;
  const validBoardCapture = {
    frame: { x: 24, y: 16, width: 250, height: 500 }, resolution: 2,
    outputPixels: { width: 500, height: 1000 },
    pixelProbe: { samples: 32, nonTransparentSamples: 32, distinctBuckets: 4 },
  };
  const snap = (/** @type {number} */ epoch, /** @type {any} */ value, type = 'navigate') => ({
    navigation: { epoch, type, url: route }, tracker: value,
    root: { language: 'zh-CN', theme: 'mineral-mist', reducedMotion: 'true' }, canvasCount: 1,
    boardProbe: clone(validBoardCapture),
  });
  const wsUrl = `${new URL(normalizedOrigin).protocol === 'https:' ? 'wss:' : 'ws:'}//${new URL(normalizedOrigin).host}/`;
  const update = (sequence = 11) => ({ sequence, kind: 'websocket-frame', direction: 'received', encoding: 'utf8', url: wsUrl,
    body: JSON.stringify({ type: 'update', updates: [{ type: 'js-update', path: '/src/App.tsx', acceptedPath: '/src/App.tsx' }] }) });
  const full = (sequence = 11) => ({ sequence, kind: 'websocket-frame', direction: 'received', encoding: 'utf8', url: wsUrl,
    body: JSON.stringify({ type: 'full-reload', path: '*' }) });
  const appEntity = Buffer.from('transformed App module');
  const appSourceMap = Buffer.from(JSON.stringify({ mappings: 'AAAA', names: [], sources: ['App.tsx'], version: 3, sourcesContent: ['export const app = true;'] }), 'utf8');
  const appBody = Buffer.concat([appEntity, viteInlineSourceMapMarker, Buffer.from(appSourceMap.toString('base64'), 'utf8')]);
  const appEtag = viteWeakEtag(appEntity);
  const app = (/** @type {number} */ sequence, requestId = 101, suffix = '?t=shared', /** @type {string|null} */ ifNoneMatch = null) => ({
    sequence, kind: 'request', requestId, url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false, ifNoneMatch,
  });
  const response = (/** @type {number} */ sequence, requestId = 101, suffix = '?t=shared', /** @type {string|null} */ ifNoneMatch = null) => ({
    sequence, kind: 'app-response', requestId, url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false, ifNoneMatch,
    status: 200, contentType: 'text/javascript; charset=utf-8', etag: appEtag, bodyDisposition: 'captured',
    bodyEncoding: 'base64', bodyBase64: appBody.toString('base64'),
  });
  const notModified = (/** @type {number} */ sequence, requestId = 102, suffix = '?t=shared', ifNoneMatch = appEtag) => ({
    sequence, kind: 'app-response', requestId, url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false, ifNoneMatch,
    status: 304, contentType: null, etag: null, bodyDisposition: 'not-modified', bodyEncoding: null, bodyBase64: null,
  });
  const finished = (/** @type {number} */ sequence, requestId = 101, suffix = '?t=shared', /** @type {string|null} */ ifNoneMatch = null) => ({
    sequence, kind: 'app-requestfinished', requestId, url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false, ifNoneMatch,
  });
  const doc = (/** @type {number} */ sequence, requestId = 201) => ({ sequence, kind: 'request', requestId, url: route, method: 'GET',
    resourceType: 'document', mainFrame: true, navigationRequest: true, ifNoneMatch: null });
  const nav = (/** @type {number} */ sequence, requestId = 201) => ({ sequence, kind: 'document-navigation', url: route, mainFrame: true,
    documentRequestId: requestId, documentRequestSequence: sequence - 1 });
  const history = (/** @type {number} */ sequence, method = 'replaceState', documentEpoch = 2, callId = 1, urlArgument = '/play/mutation', cause = null, causeTransport = null) => ({
    sequence, kind: 'history-call', documentEpoch, callId, method, beforeUrl: route, afterUrl: route, urlArgument, cause, causeTransport,
  });
  const sameNav = (/** @type {number} */ sequence, url = route) => ({ sequence, kind: 'same-document-navigation', url, mainFrame: true });
  const home = `${normalizedOrigin}/`;
  const exitHistory = (/** @type {number} */ sequence = 23) => ({
    sequence, kind: 'history-call', documentEpoch: 2, callId: 2, method: 'pushState', beforeUrl: route, afterUrl: home, urlArgument: '/',
    cause: 'ui-exit-confirm-click', causeTransport: 'view-transition-callback',
  });
  const before = snap(1, live(1));
  const same = {
    marker: { eventSequence: 10 }, events: [update(11), app(12), response(13), finished(14)], before, after: snap(1, live(1)),
    oldOwner: { ownerPresent: true, sameOwner: true, oldRenderer: 'active', beforeIdentity: id(1, 10), ownerIdentity: id(1, 10),
      currentIdentity: id(1, 10), probe: { target: '__MATERIAL_HMR_QA__', targetIdentity: id(1, 10), outcome: 'success' } },
  };
  const replacement = {
    ...clone(same), after: snap(1, replaced),
    oldOwner: { ownerPresent: true, sameOwner: false, oldRenderer: 'retired', beforeIdentity: id(1, 10), ownerIdentity: id(1, 10),
      currentIdentity: id(1, 11), probe: { target: '__MATERIAL_HMR_QA__', targetIdentity: id(1, 10), outcome: 'throws' } },
  };
  const reload = {
    marker: { eventSequence: 10 },
    events: [update(11), app(12, 101), response(13, 101), finished(14, 101), full(15), doc(16), nav(17),
      app(18, 102, '?t=shared', appEtag), notModified(19, 102), finished(20, 102, '?t=shared', appEtag), sameNav(21), history(22)],
    before, after: snap(2, live(2), 'reload'),
    oldOwner: { ownerPresent: false, sameOwner: false, oldRenderer: 'unavailable', beforeIdentity: id(1, 10), ownerIdentity: null,
      currentIdentity: id(2, 10), probe: { target: null, targetIdentity: null, outcome: 'unavailable' } },
  };
  const direct = { ...clone(reload), events: [full(11), doc(12), nav(13), app(14, 102), response(15, 102), finished(16, 102), sameNav(17), history(18)] };
  for (const [label, value] of [['same owner', same], ['replacement', replacement], ['fallback reload', reload], ['direct reload', direct]]) {
    assertFixture(deriveHmrProof(value, normalizedOrigin).passed, `valid HMR ${label}`);
  }

  const doubleClose = clone(replacement);
  doubleClose.after.tracker.contexts[0].closeCalls = 2;
  doubleClose.after.tracker.contextEvents.splice(2, 0, { sequence: 3, kind: 'close-call', id: id(1, 1), call: 2 });
  doubleClose.after.tracker.contextEvents[3].sequence = 4; doubleClose.after.tracker.contextEvents[4].sequence = 5;
  doubleClose.after.tracker.contextEventCursor = 5;
  const extraCreate = clone(replacement);
  extraCreate.after.tracker.contexts.push({ id: id(1, 3), closed: false, closeCalls: 0, state: 'suspended' });
  extraCreate.after.tracker.contextEvents.push({ sequence: 5, kind: 'create', id: id(1, 3) });
  extraCreate.after.tracker.contextEventCursor = 5; extraCreate.after.tracker.liveContexts = 2;
  const twoLive = clone(reload);
  twoLive.after.tracker = tracker(2,
    [{ id: id(2, 1), closed: false, closeCalls: 0, state: 'suspended' }, { id: id(2, 2), closed: false, closeCalls: 0, state: 'suspended' }],
    [{ sequence: 1, kind: 'create', id: id(2, 1) }, { sequence: 2, kind: 'create', id: id(2, 2) }]);
  const createBeforeClose = clone(replacement);
  createBeforeClose.after.tracker.contextEvents = [
    { sequence: 1, kind: 'create', id: id(1, 1) }, { sequence: 2, kind: 'create', id: id(1, 2) },
    { sequence: 3, kind: 'close-call', id: id(1, 1), call: 1 }, { sequence: 4, kind: 'close-resolve', id: id(1, 1), call: 1, state: 'closed' },
  ];
  const noResponse = clone(reload);
  noResponse.events = noResponse.events.filter((/** @type {any} */ event) => !(event.kind === 'app-response' && event.requestId === 101));
  const failedResponse = clone(reload);
  failedResponse.events[2] = { ...finished(13, 101), kind: 'app-requestfailed', errorText: 'net::ERR_FAILED' };
  const thirdApp = clone(reload);
  thirdApp.events.push(app(23, 103, '?t=third'), response(24, 103, '?t=third'), finished(25, 103, '?t=third'));
  const duplicateRequestId = clone(reload);
  duplicateRequestId.events = duplicateRequestId.events.map((/** @type {any} */ event) => event.requestId === 102 ? { ...event, requestId: 101 } : event);
  const wrongResponseId = clone(reload);
  wrongResponseId.events[2] = { ...wrongResponseId.events[2], requestId: 999 };
  const danglingResponse = clone(reload);
  danglingResponse.events.push(response(21, 999));
  const extraResponse = clone(reload);
  extraResponse.events.push(response(21, 101));
  const invalidOrigin = clone(reload);
  invalidOrigin.events[1] = { ...invalidOrigin.events[1], url: 'https://invalid.example/src/App.tsx?t=shared' };
  const invalidMethod = clone(reload);
  invalidMethod.events[1] = { ...invalidMethod.events[1], method: 'POST' };
  const invalidResourceType = clone(reload);
  invalidResourceType.events[2] = { ...invalidResourceType.events[2], resourceType: 'fetch' };
  const malformedAppUrl = clone(reload);
  malformedAppUrl.events[1] = { ...malformedAppUrl.events[1], url: 'not-a-url:/src/App.tsx' };
  const rawResponseKind = clone(reload);
  rawResponseKind.events[2] = { ...rawResponseKind.events[2], kind: 'response' };
  const freshBodyMismatch = clone(reload);
  freshBodyMismatch.events[2].bodyBase64 = Buffer.from('different transformed App module').toString('base64');
  const fullWireEtag = clone(reload);
  fullWireEtag.events[2].etag = viteWeakEtag(appBody);
  const tamperedAppEntity = clone(reload);
  { const bytes = Buffer.from(tamperedAppEntity.events[2].bodyBase64, 'base64'); bytes[0] ^= 1; tamperedAppEntity.events[2].bodyBase64 = bytes.toString('base64'); }
  const wrongEtagBoundary = clone(reload);
  wrongEtagBoundary.events[2].etag = viteWeakEtag(appBody.subarray(0, appEntity.length + 1));
  const malformedAppMap = clone(reload);
  malformedAppMap.events[2].bodyBase64 = Buffer.concat([appEntity, viteInlineSourceMapMarker, Buffer.from('bm90LWpzb24=', 'utf8')]).toString('base64');
  const initialNotModified = clone(reload);
  initialNotModified.events[1] = app(12, 101, '?t=shared', appEtag);
  initialNotModified.events[2] = notModified(13, 101);
  initialNotModified.events[3] = finished(14, 101, '?t=shared', appEtag);
  const bootstrapBody = clone(reload);
  bootstrapBody.events[8] = { ...bootstrapBody.events[8], bodyDisposition: 'captured', bodyEncoding: 'base64', bodyBase64: 'YQ==' };
  const bootstrapForgedEtag = clone(reload);
  bootstrapForgedEtag.events[8].etag = appEtag;
  const bootstrapWrongCacheBridge = clone(reload);
  bootstrapWrongCacheBridge.events = bootstrapWrongCacheBridge.events.map((/** @type {any} */ event) => event.requestId === 102
    ? { ...event, ifNoneMatch: 'W/"1-AAAAAAAAAAAAAAAAAAAAAAAAAAA"' } : event);
  const bootstrapWrongUrl = clone(reload);
  bootstrapWrongUrl.events = bootstrapWrongUrl.events.map((/** @type {any} */ event) => event.requestId === 102
    ? { ...event, url: `${normalizedOrigin}/src/App.tsx?t=different` } : event);
  const missingBootstrapFinished = clone(reload);
  missingBootstrapFinished.events.splice(9, 1); missingBootstrapFinished.events[9].sequence = 20; missingBootstrapFinished.events[10].sequence = 21;
  const missingSameDocument = clone(reload); missingSameDocument.events.splice(10, 1); missingSameDocument.events[10].sequence = 21;
  const extraSameDocument = clone(reload); extraSameDocument.events.push(sameNav(23));
  const wrongDocumentBinding = clone(reload); wrongDocumentBinding.events[6].documentRequestId = 999;
  const unboundDocumentNavigation = clone(reload);
  unboundDocumentNavigation.events[6] = { sequence: 17, kind: 'unbound-navigation', url: route, mainFrame: true,
    pendingDocumentRequests: [{ requestId: 201, sequence: 16, url: route }] };
  const earlySameDocument = clone(reload);
  const bootstrapFinished = earlySameDocument.events[9]; const historyNavigation = earlySameDocument.events[10]; const mountHistory = earlySameDocument.events[11];
  earlySameDocument.events.splice(9, 3, { ...historyNavigation, sequence: 20 }, { ...bootstrapFinished, sequence: 21 }, { ...mountHistory, sequence: 22 });
  const missingHistory = clone(reload); missingHistory.events.pop();
  const pushHistory = clone(reload); pushHistory.events[11].method = 'pushState';
  const wrongHistoryEpoch = clone(reload); wrongHistoryEpoch.events[11].documentEpoch = 1;
  const wrongHistoryArgument = clone(reload); wrongHistoryArgument.events[11].urlArgument = '/wrong';
  const reversedMountHistory = clone(reload);
  reversedMountHistory.events.splice(10, 2, { ...reversedMountHistory.events[11], sequence: 21 }, { ...reversedMountHistory.events[10], sequence: 22 });
  const extraHistory = clone(reload); extraHistory.events.push(history(23, 'replaceState', 2, 2));
  const pollutedMountCause = clone(reload);
  Object.assign(pollutedMountCause.events.find((/** @type {any} */ event) => event.kind === 'history-call'), {
    cause: 'ui-exit-confirm-click', causeTransport: 'direct-event',
  });
  /** @param {any} boardProbe */
  const withBoardProbe = (boardProbe) => {
    const value = clone(reload);
    value.before.boardProbe = boardProbe;
    return value;
  };
  const nanBoard = clone(validBoardCapture); nanBoard.frame.width = Number.NaN;
  const zeroBoard = clone(validBoardCapture); zeroBoard.resolution = 0;
  const outputZeroBoard = clone(validBoardCapture); outputZeroBoard.outputPixels.width = 0;
  const fractionalBoard = clone(validBoardCapture); fractionalBoard.pixelProbe.samples = 1.5;
  const alphaBoundsBoard = clone(validBoardCapture); alphaBoundsBoard.pixelProbe.nonTransparentSamples = 33;
  const bucketBoundsBoard = clone(validBoardCapture); bucketBoundsBoard.pixelProbe.distinctBuckets = 33;
  /** @type {Array<[string, any]>} */
  const hmrRejects = [
    ['missing owner called retired', { ...clone(same), oldOwner: { ...clone(same.oldOwner), ownerPresent: false, sameOwner: false, oldRenderer: 'retired' } }],
    ['same epoch navigation', { ...clone(reload), after: snap(1, live(1), 'reload') }],
    ['epoch change no navigation', { ...clone(same), after: snap(2, live(2), 'reload'), oldOwner: clone(reload.oldOwner) }],
    ['multiple navigation', { ...clone(reload), events: [...clone(reload.events), doc(23), nav(24)] }],
    ['wrong reload path', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) => event.sequence === 16 ? { ...event, url: `${normalizedOrigin}/wrong` } : event) }],
    ['non-document request', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) => event.sequence === 16 ? { ...event, resourceType: 'fetch', navigationRequest: false } : event) }],
    ['cross epoch owner id', { ...clone(reload), oldOwner: { ...clone(reload.oldOwner), currentIdentity: id(1, 10) } }],
    ['same owner context changed', { ...clone(same), after: snap(1, replaced) }],
    ['replacement no close', { ...clone(replacement), after: snap(1, live(1, 11, 21)) }],
    ['replacement double close', doubleClose],
    ['replacement extra create', extraCreate],
    ['reload zero live', { ...clone(reload), after: snap(2, tracker(2, [], []), 'reload') }],
    ['reload two live', twoLive],
    ['bad request order', { ...clone(reload), events: [doc(11), nav(12), update(13), app(14, 101), response(15, 101), finished(16, 101),
      app(17, 102), response(18, 102), finished(19, 102)] }],
    ['App response missing', noResponse],
    ['App request failed', failedResponse],
    ['third App transfer', thirdApp],
    ['duplicate App requestId', duplicateRequestId],
    ['wrong App response requestId', wrongResponseId],
    ['dangling App response requestId', danglingResponse],
    ['extra App response', extraResponse],
    ['App namespace invalid origin', invalidOrigin],
    ['App namespace invalid method', invalidMethod],
    ['App namespace invalid resource type', invalidResourceType],
    ['App namespace malformed raw URL', malformedAppUrl],
    ['App namespace raw response kind', rawResponseKind],
    ['fresh App body does not match ETag', freshBodyMismatch],
    ['fresh App ETag incorrectly binds the full wire body', fullWireEtag],
    ['fresh App entity is tampered under the original ETag', tamperedAppEntity],
    ['fresh App ETag length does not end at the source-map boundary', wrongEtagBoundary],
    ['fresh App inline source map is not valid JSON', malformedAppMap],
    ['initial App response is 304', initialNotModified],
    ['bootstrap 304 carries a body', bootstrapBody],
    ['bootstrap 304 forges the cached ETag response header', bootstrapForgedEtag],
    ['bootstrap If-None-Match does not bridge the fresh response ETag', bootstrapWrongCacheBridge],
    ['bootstrap 304 URL differs', bootstrapWrongUrl],
    ['bootstrap request missing finished', missingBootstrapFinished],
    ['missing mount same-document navigation', missingSameDocument],
    ['extra mount same-document navigation', extraSameDocument],
    ['wrong document-navigation request binding', wrongDocumentBinding],
    ['unbound document navigation', unboundDocumentNavigation],
    ['mount same-document navigation before bootstrap finish', earlySameDocument],
    ['missing replaceState record', missingHistory],
    ['pushState substituted for replaceState', pushHistory],
    ['replaceState wrong document epoch', wrongHistoryEpoch],
    ['replaceState argument does not resolve to observed URL', wrongHistoryArgument],
    ['mount History binding precedes same-document navigation', reversedMountHistory],
    ['extra history call', extraHistory],
    ['mount replaceState carries UI-exit cause', pollutedMountCause],
    ['owner snapshot forged', { ...clone(reload), oldOwner: { ...clone(reload.oldOwner), beforeIdentity: id(1, 99) } }],
    ['same renderer failed probe', { ...clone(same), oldOwner: { ...clone(same.oldOwner), oldRenderer: 'invalid',
      probe: { ...clone(same.oldOwner.probe), outcome: 'throws' } } }],
    ['preference language drift', { ...clone(reload), after: { ...clone(reload.after), root: { ...clone(reload.after.root), language: 'en-US' } } }],
    ['canvas identity mismatch', { ...clone(reload), after: { ...clone(reload.after), tracker: { ...clone(reload.after.tracker), canvasId: id(1, 20) } } }],
    ['replacement create before close', createBeforeClose],
    ['cross-origin websocket', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) =>
      event.kind === 'websocket-frame' ? { ...event, url: 'ws://localhost:5193/' } : event) }],
    ['board probe array', withBoardProbe([])],
    ['board probe empty', withBoardProbe({})],
    ['board probe extra key', withBoardProbe({ ...clone(validBoardCapture), extra: true })],
    ['board probe error key', withBoardProbe({ ...clone(validBoardCapture), error: 'capture failed' })],
    ['board probe null', withBoardProbe(null)],
    ['board probe NaN', withBoardProbe(nanBoard)],
    ['board probe zero resolution', withBoardProbe(zeroBoard)],
    ['board probe zero output dimension', withBoardProbe(outputZeroBoard)],
    ['board probe fractional samples', withBoardProbe(fractionalBoard)],
    ['board probe alpha bounds', withBoardProbe(alphaBoundsBoard)],
    ['board probe bucket bounds', withBoardProbe(bucketBoundsBoard)],
  ];
  for (const [label, value] of hmrRejects) {
    assertFixture(!deriveHmrProof(value, normalizedOrigin).passed, `reject HMR ${label}`);
  }
  const filler = Array.from({ length: 10 }, (_, index) => ({ sequence: index + 1, kind: 'fixture' }));
  const windowed = clone(reload);
  windowed.marker = { eventIndex: 10, eventSequence: 10, navigationArm: { eventIndex: 10, eventSequence: 10, url: route },
    endEventIndex: 22, endEventSequence: 22, uiExitArm: { eventIndex: 22, eventSequence: 22 } };
  const exactEvents = [...filler, ...clone(reload.events)];
  const exitEvents = [...exactEvents, sameNav(23, home), exitHistory(24)];
  assertFixture(exactHmrEventWindow(exactEvents, windowed, normalizedOrigin), 'valid HMR eventEnd window');
  assertFixture(exactHmrEventWindow(exitEvents, windowed, normalizedOrigin),
    'allow normal route History after the frozen HMR History guard');
  assertFixture(exactUiExitHistory(exitEvents, windowed, normalizedOrigin), 'valid exact UI-exit History pair');
  assertFixture(!exactUiExitHistory(exactEvents, windowed, normalizedOrigin), 'reject missing UI-exit History pair');
  const wrongExitMethod = clone(exitEvents); wrongExitMethod[23].method = 'replaceState';
  const wrongExitCallId = clone(exitEvents); wrongExitCallId[23].callId = 3;
  const wrongExitUrl = clone(exitEvents); wrongExitUrl[23].afterUrl = `${normalizedOrigin}/wrong`;
  const wrongExitCause = clone(exitEvents); wrongExitCause[23].cause = null;
  const wrongExitTransport = clone(exitEvents); wrongExitTransport[23].causeTransport = 'direct-event';
  const wrongExitArgument = clone(exitEvents); wrongExitArgument[23].urlArgument = './';
  const reversedExitPair = [...exactEvents, exitHistory(23), sameNav(24, home)];
  const separatedExitPair = [...exactEvents, sameNav(23, home), { sequence: 24, kind: 'fixture' }, exitHistory(25)];
  assertFixture(!exactUiExitHistory(wrongExitMethod, windowed, normalizedOrigin), 'reject UI-exit replaceState');
  assertFixture(!exactUiExitHistory(wrongExitCallId, windowed, normalizedOrigin), 'reject UI-exit callId drift');
  assertFixture(!exactUiExitHistory(wrongExitUrl, windowed, normalizedOrigin), 'reject UI-exit URL drift');
  assertFixture(!exactUiExitHistory(wrongExitCause, windowed, normalizedOrigin), 'reject UI-exit without trusted click cause');
  assertFixture(!exactUiExitHistory(wrongExitTransport, windowed, normalizedOrigin), 'reject UI-exit outside View Transition callback');
  assertFixture(!exactUiExitHistory(wrongExitArgument, windowed, normalizedOrigin), 'reject equivalent but noncanonical UI-exit URL argument');
  assertFixture(!exactUiExitHistory(reversedExitPair, windowed, normalizedOrigin), 'reject reversed UI-exit History delivery order');
  assertFixture(!exactUiExitHistory(separatedExitPair, windowed, normalizedOrigin), 'reject nonadjacent UI-exit History delivery');
  assertFixture(!exactHmrEventWindow([...exactEvents, doc(23)], windowed, normalizedOrigin), 'reject slow late reload after eventEnd');
  const lateMalformedApp = { ...response(23, 999), url: 'not-a-url:/src/App.tsx' };
  assertFixture(!exactHmrEventWindow([...exactEvents, lateMalformedApp], windowed, normalizedOrigin), 'reject late malformed App namespace event after eventEnd');
  const missingExitArm = clone(windowed); delete missingExitArm.marker.uiExitArm;
  const extraMarkerKey = clone(windowed); extraMarkerKey.marker.forged = true;
  const earlyExitArm = clone(windowed); earlyExitArm.marker.uiExitArm = { eventIndex: 21, eventSequence: 21 };
  const overflowExitArm = clone(windowed); overflowExitArm.marker.uiExitArm = { eventIndex: 23, eventSequence: 23 };
  const driftedExitArm = clone(windowed); driftedExitArm.marker.uiExitArm = { eventIndex: 22, eventSequence: 21 };
  const lateHistory = clone(windowed); lateHistory.marker.uiExitArm = { eventIndex: 23, eventSequence: 23 };
  assertFixture(!exactHmrEventWindow(exactEvents, missingExitArm, normalizedOrigin), 'reject missing UI-exit arm');
  assertFixture(!exactHmrEventWindow(exactEvents, extraMarkerKey, normalizedOrigin), 'reject extra HMR marker key');
  assertFixture(!exactHmrEventWindow(exactEvents, earlyExitArm, normalizedOrigin), 'reject UI-exit arm before HMR end');
  assertFixture(!exactHmrEventWindow(exactEvents, overflowExitArm, normalizedOrigin), 'reject UI-exit arm beyond event array');
  assertFixture(!exactHmrEventWindow(exactEvents, driftedExitArm, normalizedOrigin), 'reject UI-exit arm sequence drift');
  assertFixture(!exactHmrEventWindow([...exactEvents, history(23, 'replaceState', 2, 2)], lateHistory, normalizedOrigin), 'reject replaceState after HMR end before History guard');
  assertFixture(!exactHmrEventWindow([...exactEvents, history(23, 'pushState', 2, 2)], lateHistory, normalizedOrigin), 'reject pushState after HMR end before History guard');
  assertFixture(!exactHmrEventWindow([...exactEvents, sameNav(23)], lateHistory, normalizedOrigin), 'reject same-document navigation after HMR end before History guard');
  assertFixture(!exactHmrEventWindow([...exactEvents, { sequence: 23, kind: 'history-call' }], lateHistory, normalizedOrigin), 'reject malformed History namespace event before UI exit');
  assertFixture(!exactHmrEventWindow([...exactEvents, { sequence: 23, kind: 'same-document-navigation' }], lateHistory, normalizedOrigin), 'reject malformed same-document namespace event before UI exit');

  const committedApp = gitBytes(BASE, 'src/App.tsx'); const committedAppSha = hash(committedApp); const committedAppBlob = git('rev-parse', `${BASE}:src/App.tsx`);
  let newline = 0;
  const mixedApp = Buffer.from(new TextDecoder('utf-8', { fatal: true }).decode(committedApp).replace(/\n/gu, () => (++newline % 2 === 0 ? '\r\n' : '\n')), 'utf8');
  assertFixture(canonicalAppBytes(committedApp).equals(committedApp) && canonicalAppBytes(mixedApp).equals(committedApp)
    && cleanAppBlob(mixedApp) === committedAppBlob, 'valid LF and mixed-EOL App canonicalization');
  let bareCrRejected = false;
  try { canonicalAppBytes(Buffer.from('x\ry', 'utf8')); } catch { bareCrRejected = true; }
  assertFixture(bareCrRejected, 'reject bare CR App checkout');
  const validTouch = {
    path: 'src/App.tsx',
    raw: { beforeBytes: mixedApp.length, afterBytes: mixedApp.length, beforeSha256: hash(mixedApp), afterSha256: hash(mixedApp) },
    canonical: { beforeBytes: committedApp.length, afterBytes: committedApp.length, beforeSha256: committedAppSha, afterSha256: committedAppSha },
    base: { bytes: committedApp.length, sha256: committedAppSha, gitBlob: committedAppBlob },
    cleanGitBlob: { before: committedAppBlob, after: committedAppBlob },
    mtime: { beforeMs: 1000, requestedMs: 2100, afterMs: 2100 },
  };
  assertFixture(exactAppTouch({ appTouch: validTouch }), 'valid exact App touch envelope');
  const touchRejects = [
    ['raw drift', { ...clone(validTouch), raw: { ...clone(validTouch.raw), afterSha256: '0'.repeat(64) } }],
    ['canonical drift', { ...clone(validTouch), canonical: { ...clone(validTouch.canonical), afterSha256: '0'.repeat(64) } }],
    ['clean-filter drift', { ...clone(validTouch), cleanGitBlob: { ...clone(validTouch.cleanGitBlob), after: '0'.repeat(40) } }],
    ['base drift', { ...clone(validTouch), base: { ...clone(validTouch.base), bytes: validTouch.base.bytes + 1 } }],
    ['mtime not realized', { ...clone(validTouch), mtime: { ...clone(validTouch.mtime), afterMs: 2090 } }],
    ['extra key', { ...clone(validTouch), forged: true }],
  ];
  for (const [label, value] of touchRejects) assertFixture(!exactAppTouch({ appTouch: value }), `reject App touch ${label}`);

  const terminalTracker = tracker(1, [{ id: id(1, 1), closed: true, closeCalls: 1, state: 'closed' }],
    [{ sequence: 1, kind: 'create', id: id(1, 1) }, { sequence: 2, kind: 'close-call', id: id(1, 1), call: 1 },
      { sequence: 3, kind: 'close-resolve', id: id(1, 1), call: 1, state: 'closed' }]);
  assertFixture(exactTerminalContexts(live(1), terminalTracker), 'valid terminal context close');
  const imprecise = clone(terminalTracker); imprecise.contexts[0].closeCalls = 0;
  assertFixture(!exactTerminalContexts(live(1), imprecise), 'reject imprecise terminal context close');

  const terminalExpected = {
    schema: 'tetramorph.t37.material-ice-verification.v2', passed: true, failures: [],
    checks: [{ label: 'fixture', passed: true, detail: null }], manifestSha256: 'a'.repeat(64),
    evidenceSourceHead: 'b'.repeat(40), generatedInputHead: 'c'.repeat(40), r5bTerminalBase: BASE,
    pathContracts: { source: [], outputs: [], preReport: [], terminal: [] }, runtimeInput: { schema: 'fixture' }, humanStatus: HUMAN_STATUS,
  };
  const committed = {
    schema: terminalExpected.schema, generatedAt: '2026-08-16T00:00:00.000Z', passed: terminalExpected.passed,
    failures: clone(terminalExpected.failures), checks: clone(terminalExpected.checks), manifestSha256: terminalExpected.manifestSha256,
    evidenceSourceHead: terminalExpected.evidenceSourceHead, generatedInputHead: terminalExpected.generatedInputHead,
    r5bTerminalBase: terminalExpected.r5bTerminalBase, pathContracts: clone(terminalExpected.pathContracts),
    runtimeInput: clone(terminalExpected.runtimeInput), humanStatus: terminalExpected.humanStatus,
  };
  assertFixture(exactCommittedTerminal(committed, terminalExpected), 'valid committed terminal exact envelope');
  const emptyChecks = clone(committed); emptyChecks.checks = [];
  const extraKey = { ...clone(committed), stable: true };
  const badTimestamp = clone(committed); badTimestamp.generatedAt = '2026-08-16';
  for (const [label, value] of [['empty checks', emptyChecks], ['extra key', extraKey], ['bad generatedAt', badTimestamp]]) {
    assertFixture(!exactCommittedTerminal(value, terminalExpected), `reject terminal ${label}`);
  }
  const phaseDriftExpected = clone(terminalExpected);
  phaseDriftExpected.checks.push({ label: 'rerun-only terminal chain', passed: true, detail: null });
  assertFixture(!exactCommittedTerminal(committed, phaseDriftExpected), 'reject terminal expectation polluted by rerun-only checks');
  const manifestKeys = ['schema', 'generatedAt', 'provenance', 'runtimeInput', 'humanStatus', 'pathContracts', 'countContracts',
    'byteContract', 'stageEAnchors', 'iceContract', 'sourceBindings', 'outputBindings', 'contractBindings', 'productBindings', 'auditSummary'];
  const clientKeys = ['schema', 'generatedAt', 'passed', 'origin', 'startedAt', 'finishedAt', 'invocation', 'runtimeInputBefore', 'runtimeInputAfter', 'outputs'];
  const manifestEnvelope = Object.fromEntries(manifestKeys.map((key) => [key, null]));
  const clientEnvelope = Object.fromEntries(clientKeys.map((key) => [key, null]));
  assertFixture(plainExactKeys(manifestEnvelope, manifestKeys), 'valid manifest exact-key envelope');
  assertFixture(plainExactKeys(clientEnvelope, clientKeys), 'valid client exact-key envelope');
  assertFixture(!plainExactKeys({ ...manifestEnvelope, forged: true }, manifestKeys), 'reject manifest extra key');
  assertFixture(!plainExactKeys({ ...clientEnvelope, failures: [] }, clientKeys), 'reject client contradictory extra key');
  const orderedTimes = ['2026-08-16T00:00:00.000Z', '2026-08-16T00:00:01.000Z', '2026-08-16T00:00:02.000Z'];
  assertFixture(orderedTimes.every(canonicalIso) && Date.parse(orderedTimes[0]) <= Date.parse(orderedTimes[1])
    && Date.parse(orderedTimes[1]) <= Date.parse(orderedTimes[2]), 'valid client timestamp order');
  assertFixture(!(Date.parse(orderedTimes[2]) <= Date.parse(orderedTimes[1])), 'reject client timestamp inversion');
  return {
    iceAccepted: 2, iceRejected: iceRejects.length + phaseRejects.length + markerBindingRejects.length + 3,
    hmrAccepted: 4, hmrRejected: hmrRejects.length + 22,
    terminalAccepted: 1, terminalRejected: 4, envelopeAccepted: 3, envelopeRejected: 3,
  };
}

if (process.argv.includes('--self-test')) {
  console.log(JSON.stringify({ passed: true, ...runContractFixtures(gitBytes(BASE, ICE.path)) }));
  process.exit(0);
}

check(git('rev-parse', AUTH) === AUTH, 'authorization head missing');
check(git('rev-parse', BASE) === BASE, 'R5B terminal base missing');
check(git('merge-base', '--is-ancestor', BASE, 'HEAD') === '', 'R5B terminal is not ancestor');

const runtimeInput = assertRuntimeInputBinding();
const browser = await chromium.launch({ headless: true });
/** @type {import('playwright').BrowserContext|null} */
let ownedContext = null;
/** @type {{path: string, atime: Date, mtime: Date}|null} */
let appTimesToRestore = null;
/** @type {unknown} */
let primaryError = null;
/** @type {unknown[]} */
const cleanupErrors = [];
try {
  const scenarios = await loadScenarios();
  const opened = await openMutation(browser, origin, {
    label: 'lifecycle', item: 'freeze', seed: SEEDS.freeze,
    theme: 'deep-tide', reduced: false, language: 'zh-CN', viewport: { width: 1440, height: 900 },
  });
  const { page, context, observed } = opened;
  ownedContext = context;

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
const eventMarker = observed.armHmrIceWindow();
const navigationArm = { ...eventMarker, url: beforeHmr.navigation.url };
const reloadNavigationPromise = page.waitForEvent('framenavigated', {
  predicate: (frame) => frame === page.mainFrame() && frame.url() === navigationArm.url,
  timeout: 12_000,
});
const appPath = join(repo, 'src/App.tsx');
const beforeStat = statSync(appPath);
appTimesToRestore = { path: appPath, atime: beforeStat.atime, mtime: beforeStat.mtime };
const beforeAppBytes = readFileSync(appPath);
const beforeCanonicalAppBytes = canonicalAppBytes(beforeAppBytes);
const baseAppBytes = gitBytes(BASE, 'src/App.tsx');
const baseAppBlob = git('rev-parse', `${BASE}:src/App.tsx`);
const beforeAppBlob = cleanAppBlob(beforeAppBytes);
const touch = new Date(Math.max(Date.now(), beforeStat.mtimeMs + 1100));
utimesSync(appPath, beforeStat.atime, touch);
const afterStat = statSync(appPath);
const afterAppBytes = readFileSync(appPath);
const afterCanonicalAppBytes = canonicalAppBytes(afterAppBytes);
const afterAppBlob = cleanAppBlob(afterAppBytes);
check(afterStat.mtimeMs - touch.getTime() <= 1 && touch.getTime() - afterStat.mtimeMs <= 1
  && touch.getTime() - beforeStat.mtimeMs >= 1000 && beforeAppBytes.equals(afterAppBytes)
  && beforeCanonicalAppBytes.equals(baseAppBytes) && afterCanonicalAppBytes.equals(baseAppBytes)
  && beforeAppBlob === afterAppBlob && beforeAppBlob === baseAppBlob,
  'HMR touch changes only monotonic App mtime across raw, canonical, and clean-filter domains');
await reloadNavigationPromise;
await page.waitForLoadState('domcontentloaded', { timeout: 12_000 });
await page.waitForLoadState('load', { timeout: 12_000 });
await page.waitForLoadState('networkidle', { timeout: 12_000 });
await page.getByTestId('game-screen').waitFor({ state: 'visible', timeout: 12_000 });
await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
await page.waitForFunction((epoch) => {
  const w = /** @type {any} */ (window);
  return w.__MATERIAL_TRACKER__?.snapshot().documentEpoch === epoch + 1
    && Boolean(w.__TETRAMORPH_QA__ && w.__TETRAMORPH_LAYOUT_QA__ && w.render_game_to_text)
    && document.querySelectorAll('canvas').length === 1;
}, beforeHmr.navigation.epoch, { timeout: 12_000 });
await observed.settleAppNetwork();
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
    probe: { target: null, targetIdentity: null, outcome: 'unavailable' },
  };
  const sameOwner = w.__MATERIAL_HMR_QA__ === w.__TETRAMORPH_QA__;
  let outcome = 'success';
  try { w.__MATERIAL_HMR_QA__.captureBoardPng(); } catch { outcome = 'throws'; }
  const oldRenderer = sameOwner ? (outcome === 'success' ? 'active' : 'invalid') : (outcome === 'throws' ? 'retired' : 'invalid');
  const ownerIdentity = w.__MATERIAL_TRACKER__.identity(w.__MATERIAL_HMR_QA__);
  return {
    ownerPresent: true, sameOwner, oldRenderer,
    ownerIdentity,
    currentIdentity: w.__MATERIAL_TRACKER__.identity(w.__TETRAMORPH_QA__),
    probe: { target: '__MATERIAL_HMR_QA__', targetIdentity: ownerIdentity, outcome },
  };
});
const oldHmrOwner = { ...beforeHmrOwner, ...afterHmrOwner };
await page.evaluate(() => /** @type {any} */ (window).__MATERIAL_TRACKER__.drainHistory());
const eventEnd = observed.endHmrIceWindow();
const hmrEvents = observed.events.slice(eventMarker.eventIndex, eventEnd.eventIndex);
/** @type {any} */
const hmr = {
  before: beforeHmr,
  marker: {
    ...eventMarker, navigationArm, endEventIndex: eventEnd.eventIndex, endEventSequence: eventEnd.eventSequence,
  },
  events: hmrEvents,
  appTouch: {
    path: 'src/App.tsx',
    raw: { beforeBytes: beforeAppBytes.length, afterBytes: afterAppBytes.length, beforeSha256: hash(beforeAppBytes), afterSha256: hash(afterAppBytes) },
    canonical: {
      beforeBytes: beforeCanonicalAppBytes.length, afterBytes: afterCanonicalAppBytes.length,
      beforeSha256: hash(beforeCanonicalAppBytes), afterSha256: hash(afterCanonicalAppBytes),
    },
    base: { bytes: baseAppBytes.length, sha256: hash(baseAppBytes), gitBlob: baseAppBlob },
    cleanGitBlob: { before: beforeAppBlob, after: afterAppBlob },
    mtime: { beforeMs: beforeStat.mtimeMs, requestedMs: touch.getTime(), afterMs: afterStat.mtimeMs },
  },
  after: afterHmr,
  oldOwner: oldHmrOwner,
};
const hmrProof = deriveHmrProof(hmr, normalizedOrigin);
hmr.proof = hmrProof;
const hmrContextBranch = /** @type {'same-owner'|'same-realm-replacement'|'document-reload'|'invalid'} */ (hmrProof.branch);
check(deepEqual(hmrEvents, observed.events.slice(eventMarker.eventIndex, eventEnd.eventIndex)), 'HMR exact unified event window');
check(hmrProof.passed && hmrProof.branch === 'document-reload' && hmrProof.delivery === 'update-fallback-reload', 'Vite exact update-fallback-reload proof');
check(afterHmr.canvasCount === 1 && afterHmr.tracker?.liveContexts === 1, 'HMR leaves one Canvas and AudioContext');
check(activeRafs(beforeHmr.tracker) >= 1 && activeRafs(afterHmr.tracker) === activeRafs(beforeHmr.tracker), 'HMR active RAFs exactly equal the live baseline');
check(sameRelevantListeners(beforeHmr.tracker, afterHmr.tracker), 'HMR relevant listener set is exactly stable');
check(hmrContextBranch !== 'invalid', 'HMR old renderer disposition is internally consistent');
check(hmrContextBranch !== 'invalid' && exactHmrContexts(beforeHmr.tracker, afterHmr.tracker, hmrContextBranch), 'HMR exact branch-specific AudioContext history');

await page.getByTestId('open-settings').click();
await page.getByTestId('reduced-motion-toggle').click();
const exitSettingsSheet = page.getByTestId('settings-sheet');
await exitSettingsSheet.waitFor({ state: 'visible' });
await exitSettingsSheet.locator('.settings-console__actions > .primary-action').click();
await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-reduced-motion') === 'false');
const exitPreparation = await snapshot(page);
hmr.exitPreparation = exitPreparation;
check(exitPreparation.root?.reducedMotion === 'false' && exitPreparation.root?.theme === afterHmr.root?.theme
  && exitPreparation.root?.language === afterHmr.root?.language, 'final exit restores full motion without changing theme or language');
check(sameIdentity(exitPreparation.tracker?.qaId, afterHmr.tracker?.qaId)
  && sameIdentity(exitPreparation.tracker?.canvasId, afterHmr.tracker?.canvasId)
  && exitPreparation.canvasCount === 1 && exitPreparation.tracker?.canvases === 1
  && activeRafs(exitPreparation.tracker) === activeRafs(afterHmr.tracker)
  && sameContextRecords(exitPreparation.tracker, afterHmr.tracker)
  && sameRelevantListeners(exitPreparation.tracker, afterHmr.tracker), 'full-motion exit preparation preserves the live owner set');

await page.getByTestId('exit-game').click();
const exitConfirmation = page.locator('.action-sheet__actions > .primary-action');
await exitConfirmation.waitFor({ state: 'visible' });
await exitConfirmation.evaluate((element) => /** @type {any} */ (window).__MATERIAL_TRACKER__.armUiExitClick(element));
await page.evaluate(() => /** @type {any} */ (window).__MATERIAL_TRACKER__.drainHistory());
hmr.marker.uiExitArm = observed.armUiExitBoundary();
const exitNavigationPromise = page.waitForEvent('framenavigated', {
  predicate: (frame) => {
    if (frame !== page.mainFrame()) return false;
    try { const url = new URL(frame.url()); return url.origin === normalizedOrigin && url.pathname === '/'; } catch { return false; }
  },
  timeout: 12_000,
});
await exitConfirmation.click();
await exitNavigationPromise;
await page.getByTestId('mode-home').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const tracker = /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot();
  const relevant = Object.entries(tracker.listenerCounts).filter(([key]) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key));
  const currentEpochRecords = tracker.contexts.filter((/** @type {any} */ entry) => entry.id?.epoch === tracker.documentEpoch);
  return document.querySelectorAll('canvas').length === 0 && tracker.liveContexts === 0
    && tracker.activeRafs === 0 && relevant.every(([, count]) => Number(count) === 0)
    && currentEpochRecords.length >= 1 && currentEpochRecords.every((/** @type {any} */ entry) => entry.closed && entry.closeCalls === 1 && entry.state === 'closed');
});
await observed.settleAppNetwork();
await page.evaluate(() => /** @type {any} */ (window).__MATERIAL_TRACKER__.drainHistory());
const terminal = await page.evaluate(() => /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot());
check(terminal.canvases === 0 && terminal.liveContexts === 0 && activeRafs(terminal) === 0 && noRelevantListeners(terminal), 'post-HMR terminal cleanup');
check(exactTerminalContexts(afterHmr.tracker, terminal), 'post-HMR terminal exact AudioContext closure');
check(exactHmrEventWindow(observed.events, hmr, normalizedOrigin), 'no late App/HMR/reload/navigation event after the frozen HMR eventEnd');
check(exactUiExitHistory(observed.events, hmr, normalizedOrigin), 'UI exit owns one exact pushState and same-document navigation after uiExitArm');
check(exactInitialIceEventBinding(observed.events, rawIceResponses, observed.icePhaseMarkers), 'Ice raw responses bind every initial event metadata field');
check(exactIcePhaseClassification(observed.events, observed.icePhaseMarkers), 'Ice response events obey the explicit initial/pre-HMR/HMR/post-HMR windows');
check(exactIceHmrMarkerBinding(observed.icePhaseMarkers, hmr.marker), 'Ice HMR phase markers bind the unified HMR event window');

const sealedPageUrl = page.url();
const sealedBrowserVersion = browser.version();
await ownedContext.close();
ownedContext = null;
await new Promise((resolveSeal) => setImmediate(resolveSeal));
if (appTimesToRestore !== null) {
  utimesSync(appTimesToRestore.path, appTimesToRestore.atime, appTimesToRestore.mtime);
  appTimesToRestore = null;
}
const sealedObservationJson = JSON.stringify(observed);
const runtimeInputAfter = assertRuntimeInputBinding(runtimeInput.evidenceSourceHead);
if (JSON.stringify(runtimeInputAfter) !== JSON.stringify(runtimeInput)) throw new Error('Runtime input binding changed during browser capture.');
await new Promise((resolvePreflightQueue) => setImmediate(resolvePreflightQueue));
if (JSON.stringify(observed) !== sealedObservationJson) throw new Error('Browser observations changed after context close and final runtime preflight.');
const sealedObservations = JSON.parse(sealedObservationJson);

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
  { label: 'runtime Ice events bind materialized response metadata', passed: exactInitialIceEventBinding(sealedObservations.events, rawIceResponses, sealedObservations.icePhaseMarkers) },
  { label: 'runtime Ice response phases are exact', passed: exactIcePhaseClassification(sealedObservations.events, sealedObservations.icePhaseMarkers) },
  { label: 'runtime Ice phase markers bind HMR event window', passed: exactIceHmrMarkerBinding(sealedObservations.icePhaseMarkers, hmr.marker) },
];
const iceProvenance = {
  schema: 'tetramorph.t37.ice-provenance.v2', generatedAt: new Date().toISOString(),
  productHead: BASE, authorizationHead: AUTH, origin: normalizedOrigin, runtimeInput,
  passed: provenanceChecks.length > 0 && provenanceChecks.every(({ passed }) => passed),
  failures: provenanceChecks.filter(({ passed }) => !passed).map(({ label }) => label), checks: provenanceChecks,
  product: { ...ICE, observedGitBlob: lsTree[2] ?? null, observedBytes: iceBytes.length, observedSha256: hash(iceBytes) },
  catalog: { path: catalogPath, gitBlob: catalogGitBlob, bytes: catalogBytes.length, sha256: hash(catalogBytes), runtime: runtimeCatalog },
  runtimeResponses: rawIceResponses,
  runtimePhaseMarkers: sealedObservations.icePhaseMarkers,
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
  realProductRoute: sealedPageUrl.startsWith(origin.replace(/\/$/u, '')),
  observationsClean: sealedObservations.consoleErrors.length === 0 && sealedObservations.pageErrors.length === 0 && sealedObservations.requestErrors.length === 0,
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
  hmrEventWindowExact: exactHmrEventWindow(sealedObservations.events, hmr, normalizedOrigin),
  uiExitHistoryExact: exactUiExitHistory(sealedObservations.events, hmr, normalizedOrigin),
  fullMotionExitPreparationExact: hmr.exitPreparation?.root?.reducedMotion === 'false'
    && hmr.exitPreparation?.root?.theme === hmr.after?.root?.theme && hmr.exitPreparation?.root?.language === hmr.after?.root?.language
    && sameIdentity(hmr.exitPreparation?.tracker?.qaId, hmr.after?.tracker?.qaId)
    && sameIdentity(hmr.exitPreparation?.tracker?.canvasId, hmr.after?.tracker?.canvasId)
    && hmr.exitPreparation?.canvasCount === 1 && hmr.exitPreparation?.tracker?.canvases === 1
    && activeRafs(hmr.exitPreparation?.tracker) === activeRafs(hmr.after?.tracker)
    && sameContextRecords(hmr.exitPreparation?.tracker, hmr.after?.tracker)
    && sameRelevantListeners(hmr.exitPreparation?.tracker, hmr.after?.tracker),
  iceHmrMarkerBindingExact: exactIceHmrMarkerBinding(sealedObservations.icePhaseMarkers, hmr.marker),
  hmrAppTouchExact: exactAppTouch(hmr),
  hmrProofExact: deepEqual(hmr.proof, deriveHmrProof(hmr, normalizedOrigin)),
  hmrDelivered: hmrProof.passed && hmrProof.branch === 'document-reload' && hmrProof.delivery === 'update-fallback-reload'
    && hmrProof.counts.appRequests === 2 && hmrProof.counts.appResponses === 2 && hmrProof.counts.appFinished === 2 && hmrProof.counts.appFailed === 0,
  hmrOwnersBound: afterHmr.canvasCount === 1 && afterHmr.tracker?.liveContexts === 1 && hmrProof.ownerIdentitiesValid,
  hmrCanvasOwnersExact: hmrProof.canvasIdentitiesValid,
  hmrPreferencesExact: hmrProof.preferencesStable,
  hmrBoardProbesExact: hmrProof.boardProbesValid,
  hmrRafBaselineActive: activeRafs(beforeHmr.tracker) >= 1,
  hmrRafsExact: activeRafs(afterHmr.tracker) === activeRafs(beforeHmr.tracker),
  hmrRafsNotDoubled: activeRafs(afterHmr.tracker) <= activeRafs(beforeHmr.tracker),
  hmrListenersExact: sameRelevantListeners(beforeHmr.tracker, afterHmr.tracker),
  preHmrContextsExact: exactPreHmrContextContinuity(reentered.tracker, beforeHmr.tracker),
  hmrContextBranchValid: hmrProof.passed && hmrContextBranch === 'document-reload',
  hmrContextsExact: exactHmrContexts(beforeHmr.tracker, afterHmr.tracker, hmrContextBranch),
  terminalOwnersClean: terminal.canvases === 0 && terminal.liveContexts === 0,
  terminalRafsZero: activeRafs(terminal) === 0,
  terminalListenersZero: noRelevantListeners(terminal),
  terminalContextsExact: exactTerminalContexts(afterHmr.tracker, terminal),
};
for (const [label, passed] of Object.entries(lifecycleAssertions)) check(passed, `lifecycle assertion: ${label}`);

const report = {
  schema: 'tetramorph.t37.material-browser.v2', generatedAt: new Date().toISOString(),
  origin, pageUrl: sealedPageUrl, browser: sealedBrowserVersion, runtimeInput, passed: failures.length === 0, failures,
  initial, afterFreeze, restarted, changedPreferences, exited, reentered,
  hmr,
  terminal, observations: sealedObservations, lifecycleProof, assertions: lifecycleAssertions,
  humanStatus: HUMAN_STATUS,
};

await writeFile(join(root, 'ice-provenance-audit.json'), `${JSON.stringify(iceProvenance, null, 2)}\n`, 'utf8');
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (!report.passed) throw new Error(failures.join('\n'));
} catch (error) {
  primaryError = error;
} finally {
  if (ownedContext !== null) {
    try { await ownedContext.close(); } catch (error) { cleanupErrors.push(error); }
  }
  try { await browser.close(); } catch (error) { cleanupErrors.push(error); }
  if (appTimesToRestore !== null) {
    try { utimesSync(appTimesToRestore.path, appTimesToRestore.atime, appTimesToRestore.mtime); }
    catch (error) { cleanupErrors.push(error); }
  }
}
if (primaryError !== null || cleanupErrors.length > 0) {
  throw new AggregateError([...(primaryError === null ? [] : [primaryError]), ...cleanupErrors], 'Material browser capture or cleanup failed.');
}
