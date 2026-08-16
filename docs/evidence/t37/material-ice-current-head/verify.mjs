// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTH, BASE, BYTE_CONTRACT, CLIENT, CONTRACT, HUMAN_STATUS, ICE, ITEMS, MATRIX_CASES,
  MATRIX_PNG, OUTPUT, PRE_REPORT, PRODUCT_BINDINGS, PROFILE, SEMANTIC_PNG, SOURCE,
  STAGES, SEEDS, STAGE_E_ANCHORS, TERMINAL, prefix, repo, root,
} from './evidence-contract.mjs';
import { assertItemSnapshot } from './product-fixture.mjs';

/** @param {import('node:crypto').BinaryLike} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {...string} args */
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
/** @param {...string} args */
const gitRaw = (...args) => execFileSync('git', args, { cwd: repo });
/** @param {string} head @param {string} path */
const blob = (head, path) => gitRaw('show', `${head}:${path}`);
/** @param {readonly string[]} values */
const sorted = (values) => [...values].sort();
/** @param {any} left @param {any} right */
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
/** @param {readonly string[]} left @param {readonly string[]} right */
const equalSet = (left, right) => deepEqual(sorted(left), sorted(right));
/** @type {Array<{label: string, passed: boolean, detail: any}>} */
const checks = [];
/** @type {string[]} */
const failures = [];
/** @param {unknown} passed @param {string} label @param {any} [detail] */
const check = (passed, label, detail = null) => { checks.push({ label, passed: Boolean(passed), detail }); if (!passed) failures.push(label); };
const sourcePaths = SOURCE.map((path) => prefix + path);
const outputPaths = OUTPUT.map((path) => prefix + path);
const preReportPaths = PRE_REPORT.map((path) => prefix + path);
const terminalPaths = TERMINAL.map((path) => prefix + path);

/** @param {Buffer} bytes @param {string} label */
function text(bytes, label) {
  let value = '';
  try { value = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { check(false, `${label}: valid UTF-8`); return ''; }
  check(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), `${label}: no BOM`);
  check(!value.includes('\r'), `${label}: LF-only`);
  check(value.endsWith('\n'), `${label}: final LF`);
  return value;
}

/** @param {string} from @param {string} to */
function range(from, to) { return git('diff', '--name-only', `${from}..${to}`).split(/\r?\n/u).filter(Boolean); }
/** @param {string} head */
function tree(head) { return git('ls-tree', '-r', '--name-only', head, '--', prefix).split(/\r?\n/u).filter(Boolean); }
/** @param {string} head @param {string} path */
function exists(head, path) { try { git('cat-file', '-e', `${head}:${path}`); return true; } catch { return false; } }
const FROZEN_C050 = Object.freeze({
  commit: 'bcdfe9a94ba0b59141d09a5654ca56c6de787b5c',
  parent: '3eb110f546e84c5003c9d2eaa73dfa0f8f9986e9',
  status: 'C050',
  fromPath: 'docs/evidence/t37/bomb-familiar-language-audition-r5a/.gitattributes',
  fromBlob: '3eacc44b940401abb0899ee8c74833d35f56df1c',
  toPath: 'docs/evidence/t37/material-ice-current-head/.gitattributes',
  toBlob: '94afc642601372e041806b12a5fcea82dac719b7',
});
/** @param {string} commit @param {string} parent @param {string} status @param {string} fromPath @param {string} toPath */
function isFrozenC050(commit, parent, status, fromPath, toPath) {
  return commit === FROZEN_C050.commit && parent === FROZEN_C050.parent && status === FROZEN_C050.status
    && fromPath === FROZEN_C050.fromPath && toPath === FROZEN_C050.toPath
    && git('rev-parse', `${parent}:${fromPath}`) === FROZEN_C050.fromBlob
    && git('rev-parse', `${commit}:${toPath}`) === FROZEN_C050.toBlob;
}
/** @param {string} from @param {string} to @param {string[]} allowed @param {string} label */
function linearHistory(from, to, allowed, label) {
  const commits = git('rev-list', '--reverse', '--ancestry-path', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
  const touched = new Set(); const allowedSet = new Set(allowed); const historyErrors = [];
  let expectedParent = from; let frozenCopyCount = 0;
  if (commits.length === 0) historyErrors.push('empty range');
  for (const commit of commits) {
    const parents = git('rev-list', '--parents', '-n', '1', commit).split(/\s+/u);
    if (parents.length !== 2 || parents[1] !== expectedParent) {
      historyErrors.push(`non-linear ${commit}`);
      continue;
    }
    const fields = gitRaw(
      'diff-tree', '--no-commit-id', '--name-status', '-r', '-z',
      '--find-renames=50%', '--find-copies=50%', '--find-copies-harder', parents[1], commit,
    ).toString('utf8').split('\0');
    if (fields.pop() !== '' || fields.length === 0) {
      historyErrors.push(`empty or malformed commit ${commit}`);
      expectedParent = commit;
      continue;
    }
    let index = 0;
    while (index < fields.length) {
      const status = fields[index++];
      if (/^[RC]\d+$/u.test(status)) {
        const fromPath = fields[index++]; const toPath = fields[index++];
        if (!fromPath || !toPath) historyErrors.push(`malformed ${status} ${commit}`);
        else if (isFrozenC050(commit, parents[1], status, fromPath, toPath)) {
          frozenCopyCount += 1;
          if (frozenCopyCount !== 1 || !allowedSet.has(toPath)) historyErrors.push('invalid frozen C050 normalization');
          touched.add(toPath);
        } else historyErrors.push(`forbidden ${status} ${fromPath} -> ${toPath}`);
        continue;
      }
      const path = fields[index++];
      if (!path) { historyErrors.push(`missing path after ${status} in ${commit}`); break; }
      if (status !== 'A' && status !== 'M') historyErrors.push(`forbidden status ${status} ${path}`);
      if (!allowedSet.has(path)) historyErrors.push(`out-of-set path ${commit} ${path}`);
      touched.add(path);
    }
    expectedParent = commit;
  }
  const expectedFrozenCopyCount = commits.includes(FROZEN_C050.commit) ? 1 : 0;
  if (frozenCopyCount !== expectedFrozenCopyCount) historyErrors.push(`frozen C050 count ${frozenCopyCount} != ${expectedFrozenCopyCount}`);
  if (expectedParent !== to) historyErrors.push(`endpoint ${expectedParent} != ${to}`);
  if (!equalSet([...touched], allowed)) historyErrors.push(`touched ${sorted([...touched]).join(',')}`);
  check(historyErrors.length === 0, label, { commits, touched: sorted([...touched]), historyErrors });
  return commits;
}
/** @param {string} head @param {{kind: string, path: string}} entry */
function bind(head, entry) {
  const object = git('rev-parse', `${head}:${entry.path}`);
  if (entry.kind === 'tree') return { ...entry, gitObject: object };
  const bytes = blob(head, entry.path);
  return { ...entry, gitObject: object, sha256: sha(bytes), bytes: bytes.length };
}
/** @param {Buffer} bytes @param {string} label */
function png(bytes, label) {
  const signature = '89504e470d0a1a0a';
  const valid = bytes.length > 1000 && bytes.subarray(0, 8).toString('hex') === signature;
  const width = valid ? bytes.readUInt32BE(16) : 0; const height = valid ? bytes.readUInt32BE(20) : 0;
  check(valid && width >= 300 && height >= 300, `${label}: real PNG dimensions`, { bytes: bytes.length, width, height });
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
  && deepEqual(relevantListeners(before), relevantListeners(after));
/** @param {any} tracker */
const noRelevantListeners = (tracker) => Boolean(tracker?.listenerCounts)
  && Object.values(relevantListeners(tracker)).every((count) => count === 0);
/** @param {any} tracker */
const activeRafs = (tracker) => Number.isInteger(tracker?.activeRafs) ? Number(tracker.activeRafs) : -1;
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
  const records = contextRecords(tracker); const events = contextEvents(tracker); const epoch = Number(tracker?.documentEpoch);
  if (!Number.isInteger(epoch) || epoch < 1 || records === null || events === null
    || tracker?.contextEventCursor !== events.length || tracker?.liveContexts !== records.filter((entry) => !entry.closed && entry.state !== 'closed').length) return false;
  const replay = new Map();
  for (const [index, event] of events.entries()) {
    if (event.sequence !== index + 1 || event.id === null || event.id.epoch !== epoch) return false;
    const key = `${event.id.epoch}:${event.id.id}`;
    if (event.kind === 'create') {
      if (replay.has(key)) return false;
      replay.set(key, { closeCalls: 0, closed: false });
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
  const bytes = Buffer.from(value, 'base64'); return bytes.toString('base64') === value ? bytes : null;
}
/** @param {Buffer|null} bytes @param {string} expectedPath */
function exactModuleExport(bytes, expectedPath) {
  if (bytes === null || (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) return null;
  let source; try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; }
  const markers = source.match(/\/\/# sourceMappingURL=data:/gu) ?? [];
  if (markers.length > 1) return null;
  if (markers.length === 1) {
    const map = /\r?\n\/\/# sourceMappingURL=data:application\/json(?:;charset=utf-8)?;base64,([A-Za-z0-9+/]+={0,2})(?:\r?\n)?$/u.exec(source);
    if (!map) return null;
    const mapBytes = canonicalBase64(map[1]); if (mapBytes === null) return null;
    let parsedMap; try { parsedMap = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mapBytes)); } catch { return null; }
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
  const originValue = new URL(expectedOrigin).origin; const expectedPath = new URL(`/${ICE.path}`, `${originValue}/`).pathname;
  let previousSequence = 0;
  const entries = (Array.isArray(rawResponses) ? rawResponses : []).map((raw, index) => {
    let parsed = null; try { parsed = new URL(raw?.url); } catch { parsed = null; }
    const bytes = canonicalBase64(raw?.body); const moduleExport = exactModuleExport(bytes, expectedPath);
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
    return { index, sequence: Number.isInteger(raw?.sequence) ? raw.sequence : null, kind,
      checks: { sequenceOrdered, urlValid: parsed !== null, sameOrigin: parsed?.origin === originValue, exactPath: parsed?.pathname === expectedPath,
        noHash: parsed?.hash === '', redirectShape, noRedirect: raw?.redirectedFrom === null, noBodyError,
        canonicalBase64: bytes !== null, moduleMetadata, moduleExportExact: moduleExport === expectedPath, assetMetadata },
      body: { bytes: bytes?.length ?? null, sha256: bytes ? sha(bytes) : null, moduleExport } };
  });
  const counts = { total: entries.length, module: entries.filter(({ kind }) => kind === 'module').length,
    asset: entries.filter(({ kind }) => kind === 'asset').length, invalid: entries.filter(({ kind }) => kind === 'invalid').length };
  const asset = entries.find(({ kind }) => kind === 'asset'); const moduleEntry = entries.find(({ kind }) => kind === 'module');
  const assetBytesExact = asset?.body.bytes === ICE.bytes && asset?.body.sha256 === ICE.sha256;
  const moduleExportExact = moduleEntry?.body.moduleExport === expectedPath;
  return { expected: { origin: originValue, pathname: expectedPath, moduleSearch: '?import&url', assetSearch: '', assetBytes: ICE.bytes, assetSha256: ICE.sha256 },
    counts, assetBytesExact, moduleExportExact, entries,
    passed: counts.total === 2 && counts.module === 1 && counts.asset === 1 && counts.invalid === 0 && assetBytesExact && moduleExportExact };
}
/** @param {any} runtime */
function exactRuntimeCatalog(runtime) {
  const value = { url: `/${ICE.path}`, sha256: ICE.sha256, license: 'CC0-1.0', licenseFile: 'licenses/audio/CC0-1.0.txt', uses: ['freeze-activation'],
    source: { publisher: ICE.publisher, pageUrl: ICE.pageUrl, soundId: ICE.soundId, author: ICE.author, title: ICE.title,
      runtimeFileKind: ICE.runtimeFileKind, originalFormat: 'WAV, 1.723 seconds, 96 kHz, 32-bit, stereo' },
    windowStartSeconds: ICE.windowStartSeconds, windowDurationSeconds: ICE.windowDurationSeconds, gain: ICE.gain,
    attack: ICE.attackSeconds, release: ICE.releaseSeconds, originalFilename: ICE.originalFilename, originalSha256: null, status: 'pending' };
  return deepEqual(runtime, { modulePath: '/src/game/audio/audioAssetCatalog.ts',
    catalogOwnKeys: ['studioProgress', 'studioStart', 'freezeIce', 'bombFamiliarA', 'bombFamiliarB', 'bombFamiliarC'], freezeKeyCount: 1,
    freezeOwnKeys: ['url', 'sha256', 'license', 'licenseFile', 'uses', 'source', 'windowStartSeconds', 'windowDurationSeconds', 'gain', 'attack', 'release', 'originalFilename', 'originalSha256', 'status'],
    descriptor: { configurable: true, enumerable: true, writable: true, get: false, set: false, value }, value });
}

/** @param {any} event */
function eventUrl(event) { try { return new URL(event?.url); } catch { return null; } }
const appPathname = '/src/App.tsx';
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
/** @param {any} event @param {string} expectedOrigin */
function isFreshAppResponse(event, expectedOrigin) {
  const body = canonicalBase64(event?.bodyBase64);
  return event?.kind === 'app-response' && isAppEvent(event, expectedOrigin)
    && plainExactKeys(event, ['sequence', 'kind', 'requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch',
      'status', 'contentType', 'etag', 'bodyDisposition', 'bodyEncoding', 'bodyBase64'])
    && event?.status === 200 && ['text/javascript', 'application/javascript'].includes(contentTypeEssence(event?.contentType) ?? '')
    && body !== null && body.length > 0 && event?.etag === viteWeakEtag(body) && event?.bodyDisposition === 'captured'
    && event?.bodyEncoding === 'base64' && !Object.prototype.hasOwnProperty.call(event ?? {}, 'bodyUnavailable')
    && !Object.prototype.hasOwnProperty.call(event ?? {}, 'bodyError');
}
/** @param {any} event @param {string} expectedOrigin */
const isNotModifiedAppResponse = (event, expectedOrigin) => event?.kind === 'app-response' && isAppEvent(event, expectedOrigin)
  && plainExactKeys(event, ['sequence', 'kind', 'requestId', 'url', 'method', 'resourceType', 'mainFrame', 'navigationRequest', 'ifNoneMatch',
    'status', 'contentType', 'etag', 'bodyDisposition', 'bodyEncoding', 'bodyBase64'])
  && event?.status === 304 && event?.contentType === null
  && typeof event?.ifNoneMatch === 'string' && event.ifNoneMatch.length > 0
  && typeof event?.etag === 'string' && event.etag === event.ifNoneMatch
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
  && plainExactKeys(event, ['sequence', 'kind', 'documentEpoch', 'callId', 'method', 'beforeUrl', 'afterUrl', 'urlArgument'])
  && Number.isInteger(event?.documentEpoch) && event.documentEpoch > 0 && Number.isInteger(event?.callId) && event.callId > 0
  && ['replaceState', 'pushState'].includes(event?.method) && typeof event?.beforeUrl === 'string' && typeof event?.afterUrl === 'string'
  && (event?.urlArgument === null || typeof event?.urlArgument === 'string');
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
  return payload?.type === 'update' && Array.isArray(payload.updates) && payload.updates.some((/** @type {any} */ update) => update?.type === 'js-update'
    && [update.path, update.acceptedPath].some((value) => {
      if (typeof value !== 'string') return false;
      try { return new URL(value, `${new URL(expectedOrigin).origin}/`).pathname === '/src/App.tsx'; } catch { return false; }
    }));
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
  return { request, response, finished: completion,
    exact: matchingResponses.length === 1 && matchingFinished.length === 1 && matchingFailed.length === 0
      && sameAppRequestMetadata(request, response) && sameAppRequestMetadata(request, completion)
      && request.sequence < response?.sequence && response?.sequence < completion?.sequence };
}
/** @param {any} event @param {string} expectedOrigin */
function isRelevantHmrEvent(event, expectedOrigin) {
  const payload = rawWebsocketPayload(event);
  return isAppNamespaceEvent(event) || isDocumentRequest(event) || isDocumentNavigation(event) || isUnboundNavigation(event)
    || payload?.type === 'update' || payload?.type === 'full-reload';
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
  const sequencesValid = events.length > 0 && events.every((/** @type {any} */ event, /** @type {number} */ index) =>
    Number.isInteger(event?.sequence) && event.sequence === markerSequence + index + 1);
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
  const sameUrlReload = documentNavigationBindingExact && documentRequests[0]?.url === hmr?.before?.navigation?.url
    && documentNavigations[0]?.url === hmr?.before?.navigation?.url && hmr?.after?.navigation?.url === hmr?.before?.navigation?.url;
  const preTransfer = transfers.find((/** @type {any} */ transfer) => transfer.request === preNavigationApps[0]);
  const bootstrapTransfer = transfers.find((/** @type {any} */ transfer) => transfer.request === bootstrapApps[0]);
  const cacheBridgeExact = preTransfer?.exact === true && bootstrapTransfer?.exact === true
    && isFreshAppResponse(preTransfer.response, expectedOrigin)
    && preTransfer.request.url === bootstrapTransfer.request.url
    && (isFreshAppResponse(bootstrapTransfer.response, expectedOrigin)
      || (isNotModifiedAppResponse(bootstrapTransfer.response, expectedOrigin)
        && typeof preTransfer.response?.etag === 'string' && preTransfer.response.etag.length > 0
        && bootstrapTransfer.request.ifNoneMatch === preTransfer.response.etag
        && bootstrapTransfer.response.etag === preTransfer.response.etag));
  const sameDocumentNavigationExact = branch === 'document-reload'
    ? historyNamespaceExact && historyCalls.length === 1 && historyCalls[0]?.method === 'replaceState'
      && historyCalls[0]?.documentEpoch === afterEpoch && historyCalls[0]?.callId === 1 && historyUrlExact(historyCalls[0])
      && historyCalls[0]?.beforeUrl === hmr?.after?.navigation?.url && historyCalls[0]?.afterUrl === hmr?.after?.navigation?.url
      && sameDocumentNavigations.length === 1 && bootstrapTransfer?.finished?.sequence < historyCalls[0]?.sequence
      && bootstrapTransfer?.finished?.sequence < sameDocumentNavigations[0]?.sequence
      && sameDocumentNavigations[0]?.url === historyCalls[0]?.afterUrl
    : historyNamespaceExact && historyCalls.length === 0 && sameDocumentNavigations.length === 0;
  let eventOrderValid = false;
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
  const reloadExact = branch !== 'document-reload' || (sameUrlReload && hmr?.after?.navigation?.type === 'reload' && bootstrapApps.length === 1
    && hmr?.after?.canvasCount === 1 && hmr?.after?.tracker?.canvases === 1 && activeRafs(hmr?.after?.tracker) === activeRafs(hmr?.before?.tracker)
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
/** @param {any} browser */
function exactHmrEventWindow(browser) {
  const all = browser?.observations?.events; const marker = browser?.hmr?.marker; const expectedOrigin = String(browser?.origin);
  if (!Array.isArray(all) || !Number.isInteger(marker?.eventIndex) || !Number.isInteger(marker?.endEventIndex)
    || marker.eventIndex < 0 || marker.endEventIndex <= marker.eventIndex || marker.endEventIndex > all.length) return false;
  const beforeSequence = marker.eventIndex === 0 ? 0 : all[marker.eventIndex - 1]?.sequence;
  const endSequence = all[marker.endEventIndex - 1]?.sequence;
  const arm = marker.navigationArm;
  return all.every((/** @type {any} */ event, /** @type {number} */ index) => event?.sequence === index + 1)
    && marker.eventSequence === beforeSequence && marker.endEventSequence === endSequence
    && arm?.eventIndex === marker.eventIndex && arm?.eventSequence === marker.eventSequence && arm?.url === browser?.hmr?.before?.navigation?.url
    && deepEqual(all.slice(marker.eventIndex, marker.endEventIndex), browser?.hmr?.events)
    && all.slice(marker.endEventIndex).every((/** @type {any} */ event) => !isRelevantHmrEvent(event, expectedOrigin));
}
/** @param {any} hmr */
function exactAppTouch(hmr) {
  const bytes = blob(BASE, 'src/App.tsx'); const expectedSha = sha(bytes); const expectedBlob = git('rev-parse', `${BASE}:src/App.tsx`);
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
  'generatedInputHead', 'r5bTerminalBase', 'pathContracts', 'humanStatus'];
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


/** Independent adversarial contract fixtures. */
function runIndependentContractFixtures() {
  const normalizedOrigin = 'http://127.0.0.1:5193';
  const assetBytes = blob(BASE, ICE.path);
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
  for (const [label, value] of phaseRejects) assertFixture(!exactIcePhaseClassification(value.events, value.markers), `reject Ice phase ${label}`);
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
  const appBody = Buffer.from('transformed App module');
  const appEtag = viteWeakEtag(appBody);
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
    status: 304, contentType: null, etag: appEtag, bodyDisposition: 'not-modified', bodyEncoding: null, bodyBase64: null,
  });
  const finished = (/** @type {number} */ sequence, requestId = 101, suffix = '?t=shared', /** @type {string|null} */ ifNoneMatch = null) => ({
    sequence, kind: 'app-requestfinished', requestId, url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false, ifNoneMatch,
  });
  const doc = (/** @type {number} */ sequence, requestId = 201) => ({ sequence, kind: 'request', requestId, url: route, method: 'GET',
    resourceType: 'document', mainFrame: true, navigationRequest: true, ifNoneMatch: null });
  const nav = (/** @type {number} */ sequence, requestId = 201) => ({ sequence, kind: 'document-navigation', url: route, mainFrame: true,
    documentRequestId: requestId, documentRequestSequence: sequence - 1 });
  const history = (/** @type {number} */ sequence, method = 'replaceState', documentEpoch = 2, callId = 1, urlArgument = '/play/mutation') => ({
    sequence, kind: 'history-call', documentEpoch, callId, method, beforeUrl: route, afterUrl: route, urlArgument,
  });
  const sameNav = (/** @type {number} */ sequence, url = route) => ({ sequence, kind: 'same-document-navigation', url, mainFrame: true });
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
      app(18, 102, '?t=shared', appEtag), notModified(19, 102), finished(20, 102, '?t=shared', appEtag), history(21), sameNav(22)],
    before, after: snap(2, live(2), 'reload'),
    oldOwner: { ownerPresent: false, sameOwner: false, oldRenderer: 'unavailable', beforeIdentity: id(1, 10), ownerIdentity: null,
      currentIdentity: id(2, 10), probe: { target: null, targetIdentity: null, outcome: 'unavailable' } },
  };
  const direct = { ...clone(reload), events: [full(11), doc(12), nav(13), app(14, 102), response(15, 102), finished(16, 102), history(17), sameNav(18)] };
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
  const initialNotModified = clone(reload);
  initialNotModified.events[1] = app(12, 101, '?t=shared', appEtag);
  initialNotModified.events[2] = notModified(13, 101);
  initialNotModified.events[3] = finished(14, 101, '?t=shared', appEtag);
  const bootstrapBody = clone(reload);
  bootstrapBody.events[8] = { ...bootstrapBody.events[8], bodyDisposition: 'captured', bodyEncoding: 'base64', bodyBase64: 'YQ==' };
  const bootstrapWrongUrl = clone(reload);
  bootstrapWrongUrl.events = bootstrapWrongUrl.events.map((/** @type {any} */ event) => event.requestId === 102
    ? { ...event, url: `${normalizedOrigin}/src/App.tsx?t=different` } : event);
  const missingBootstrapFinished = clone(reload);
  missingBootstrapFinished.events.splice(9, 1); missingBootstrapFinished.events[9].sequence = 20; missingBootstrapFinished.events[10].sequence = 21;
  const missingSameDocument = clone(reload); missingSameDocument.events.pop();
  const extraSameDocument = clone(reload); extraSameDocument.events.push(sameNav(23));
  const wrongDocumentBinding = clone(reload); wrongDocumentBinding.events[6].documentRequestId = 999;
  const unboundDocumentNavigation = clone(reload);
  unboundDocumentNavigation.events[6] = { sequence: 17, kind: 'unbound-navigation', url: route, mainFrame: true,
    pendingDocumentRequests: [{ requestId: 201, sequence: 16, url: route }] };
  const earlySameDocument = clone(reload);
  const bootstrapFinished = earlySameDocument.events[9]; const mountHistory = earlySameDocument.events[10]; const historyNavigation = earlySameDocument.events[11];
  earlySameDocument.events.splice(9, 3, { ...historyNavigation, sequence: 20 }, { ...bootstrapFinished, sequence: 21 }, { ...mountHistory, sequence: 22 });
  const missingHistory = clone(reload); missingHistory.events.splice(10, 1); missingHistory.events[10].sequence = 21;
  const pushHistory = clone(reload); pushHistory.events[10].method = 'pushState';
  const wrongHistoryEpoch = clone(reload); wrongHistoryEpoch.events[10].documentEpoch = 1;
  const wrongHistoryArgument = clone(reload); wrongHistoryArgument.events[10].urlArgument = '/wrong';
  const extraHistory = clone(reload); extraHistory.events.push(history(23, 'replaceState', 2, 2));
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
    ['initial App response is 304', initialNotModified],
    ['bootstrap 304 carries a body', bootstrapBody],
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
    ['extra history call', extraHistory],
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
    endEventIndex: 22, endEventSequence: 22 };
  const exactEvents = [...filler, ...clone(reload.events)];
  assertFixture(exactHmrEventWindow({ origin: normalizedOrigin, observations: { events: exactEvents }, hmr: windowed }), 'valid HMR eventEnd window');
  assertFixture(!exactHmrEventWindow({ origin: normalizedOrigin, observations: { events: [...exactEvents, doc(23)] }, hmr: windowed }), 'reject slow late reload after eventEnd');
  const lateMalformedApp = { ...response(23, 999), url: 'not-a-url:/src/App.tsx' };
  assertFixture(!exactHmrEventWindow({ origin: normalizedOrigin, observations: { events: [...exactEvents, lateMalformedApp] }, hmr: windowed }), 'reject late malformed App namespace event after eventEnd');

  const committedApp = blob(BASE, 'src/App.tsx'); const committedAppSha = sha(committedApp); const committedAppBlob = git('rev-parse', `${BASE}:src/App.tsx`);
  const validTouch = {
    path: 'src/App.tsx', raw: { beforeBytes: committedApp.length + 12, afterBytes: committedApp.length + 12, beforeSha256: 'a'.repeat(64), afterSha256: 'a'.repeat(64) },
    canonical: { beforeBytes: committedApp.length, afterBytes: committedApp.length, beforeSha256: committedAppSha, afterSha256: committedAppSha },
    base: { bytes: committedApp.length, sha256: committedAppSha, gitBlob: committedAppBlob },
    cleanGitBlob: { before: committedAppBlob, after: committedAppBlob }, mtime: { beforeMs: 1000, requestedMs: 2100, afterMs: 2100 },
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
    schema: 'tetramorph.t37.material-ice-verification.v1', passed: true, failures: [],
    checks: [{ label: 'fixture', passed: true, detail: null }], manifestSha256: 'a'.repeat(64),
    evidenceSourceHead: 'b'.repeat(40), generatedInputHead: 'c'.repeat(40), r5bTerminalBase: BASE,
    pathContracts: { source: [], outputs: [], preReport: [], terminal: [] }, humanStatus: HUMAN_STATUS,
  };
  const committed = {
    schema: terminalExpected.schema, generatedAt: '2026-08-16T00:00:00.000Z', passed: terminalExpected.passed,
    failures: clone(terminalExpected.failures), checks: clone(terminalExpected.checks), manifestSha256: terminalExpected.manifestSha256,
    evidenceSourceHead: terminalExpected.evidenceSourceHead, generatedInputHead: terminalExpected.generatedInputHead,
    r5bTerminalBase: terminalExpected.r5bTerminalBase, pathContracts: clone(terminalExpected.pathContracts), humanStatus: terminalExpected.humanStatus,
  };
  assertFixture(exactCommittedTerminal(committed, terminalExpected), 'valid committed terminal exact envelope');
  const emptyChecks = clone(committed); emptyChecks.checks = [];
  const extraKey = { ...clone(committed), stable: true };
  const badTimestamp = clone(committed); badTimestamp.generatedAt = '2026-08-16';
  for (const [label, value] of [['empty checks', emptyChecks], ['extra key', extraKey], ['bad generatedAt', badTimestamp]]) {
    assertFixture(!exactCommittedTerminal(value, terminalExpected), `reject terminal ${label}`);
  }
  return {
    iceAccepted: 2, iceRejected: iceRejects.length + phaseRejects.length + markerBindingRejects.length + 3,
    hmrAccepted: 4, hmrRejected: hmrRejects.length + 3,
    terminalAccepted: 1, terminalRejected: 3,
  };
}

if (process.argv.includes('--self-test')) {
  console.log(JSON.stringify({ passed: true, ...runIndependentContractFixtures() }));
  process.exit(0);
}
/** @param {any} value @param {string} label @param {string[]} errors */
function assertTextState(value, label, errors) {
  if (typeof value?.textState !== 'string') { errors.push(`${label}: missing textState`); return; }
  try {
    const state = JSON.parse(value.textState);
    if (state.mode !== 'sprint' || state.screen !== 'game') errors.push(`${label}: textState route mismatch`);
  } catch { errors.push(`${label}: invalid textState JSON`); }
}

/** @param {any} observed @param {string} label @param {string[]} errors */
function assertCleanObservations(observed, label, errors) {
  if (!observed || typeof observed !== 'object') { errors.push(`${label}: missing observations`); return; }
  for (const key of ['consoleErrors', 'pageErrors', 'requestErrors']) {
    if (!Array.isArray(observed[key])) errors.push(`${label}: ${key} is not an array`);
    else if (observed[key].length > 0) errors.push(`${label}: ${key} is not empty`);
  }
}

/** @param {any} browser */
function browserLifecycleProof(browser) {
  const hmrProof = deriveHmrProof(browser.hmr, String(browser.origin));
  const hmrContextBranch = /** @type {'same-owner'|'same-realm-replacement'|'document-reload'|'invalid'} */ (hmrProof.branch);
  return {
    hmr: hmrProof,
    canvasOwners: {
      initial: { canvasCount: browser.initial?.canvasCount, canvases: browser.initial?.tracker?.canvases },
      restartBefore: { canvasCount: browser.restarted?.before?.canvasCount, canvases: browser.restarted?.before?.canvases },
      restartAfter: { canvasCount: browser.restarted?.after?.canvasCount, canvases: browser.restarted?.after?.canvases },
      preferences: { canvasCount: browser.changedPreferences?.canvasCount, canvases: browser.changedPreferences?.tracker?.canvases },
      exit: { canvases: browser.exited?.tracker?.canvases },
      reentry: { canvasCount: browser.reentered?.canvasCount, canvases: browser.reentered?.tracker?.canvases },
      hmrBaseline: { canvasCount: browser.hmr?.before?.canvasCount, canvases: browser.hmr?.before?.tracker?.canvases },
      hmrAfter: { canvasCount: browser.hmr?.after?.canvasCount, canvases: browser.hmr?.after?.tracker?.canvases },
      terminal: { canvases: browser.terminal?.canvases },
    },
    activeRafs: {
      initial: activeRafs(browser.initial?.tracker), restartBefore: activeRafs(browser.restarted?.before), restartAfter: activeRafs(browser.restarted?.after),
      preferences: activeRafs(browser.changedPreferences?.tracker), exit: activeRafs(browser.exited?.tracker), reentry: activeRafs(browser.reentered?.tracker),
      hmrBaseline: activeRafs(browser.hmr?.before?.tracker), hmrAfter: activeRafs(browser.hmr?.after?.tracker), terminal: activeRafs(browser.terminal),
    },
    relevantListeners: {
      initial: relevantListeners(browser.initial?.tracker), restartBefore: relevantListeners(browser.restarted?.before), restartAfter: relevantListeners(browser.restarted?.after),
      preferences: relevantListeners(browser.changedPreferences?.tracker), exit: relevantListeners(browser.exited?.tracker), reentry: relevantListeners(browser.reentered?.tracker),
      hmrBaseline: relevantListeners(browser.hmr?.before?.tracker), hmrAfter: relevantListeners(browser.hmr?.after?.tracker), terminal: relevantListeners(browser.terminal),
    },
    contexts: {
      initial: contextRecords(browser.initial?.tracker), restartBefore: contextRecords(browser.restarted?.before), restartAfter: contextRecords(browser.restarted?.after),
      preferences: contextRecords(browser.changedPreferences?.tracker), exit: contextRecords(browser.exited?.tracker), reentry: contextRecords(browser.reentered?.tracker),
      hmrBaseline: contextRecords(browser.hmr?.before?.tracker), hmrAfter: contextRecords(browser.hmr?.after?.tracker), terminal: contextRecords(browser.terminal),
    },
    contextEvents: {
      initial: contextEvents(browser.initial?.tracker), restartBefore: contextEvents(browser.restarted?.before), restartAfter: contextEvents(browser.restarted?.after),
      preferences: contextEvents(browser.changedPreferences?.tracker), exit: contextEvents(browser.exited?.tracker), reentry: contextEvents(browser.reentered?.tracker),
      hmrBaseline: contextEvents(browser.hmr?.before?.tracker), hmrAfter: contextEvents(browser.hmr?.after?.tracker), terminal: contextEvents(browser.terminal),
    },
    hmrContexts: {
      branch: hmrContextBranch, before: contextRecords(browser.hmr?.before?.tracker), after: contextRecords(browser.hmr?.after?.tracker),
      beforeLiveContexts: browser.hmr?.before?.tracker?.liveContexts, afterLiveContexts: browser.hmr?.after?.tracker?.liveContexts,
    },
    preHmrContexts: {
      reentry: contextRecords(browser.reentered?.tracker), beforeHmr: contextRecords(browser.hmr?.before?.tracker),
      reentryLiveContexts: browser.reentered?.tracker?.liveContexts, beforeHmrLiveContexts: browser.hmr?.before?.tracker?.liveContexts,
    },
    terminalContexts: {
      afterHmr: contextRecords(browser.hmr?.after?.tracker), terminal: contextRecords(browser.terminal),
      afterHmrLiveContexts: browser.hmr?.after?.tracker?.liveContexts, terminalLiveContexts: browser.terminal?.liveContexts,
    },
  };
}

/** @param {any} browser */
function browserLifecycleAssertions(browser) {
  const observations = browser.observations ?? {};
  const hmrProof = deriveHmrProof(browser.hmr, String(browser.origin));
  const hmrContextBranch = /** @type {'same-owner'|'same-realm-replacement'|'document-reload'|'invalid'} */ (hmrProof.branch);
  return {
    realProductRoute: typeof browser.pageUrl === 'string' && browser.pageUrl.startsWith(String(browser.origin).replace(/\/$/u, '')),
    observationsClean: Array.isArray(observations.consoleErrors) && observations.consoleErrors.length === 0
      && Array.isArray(observations.pageErrors) && observations.pageErrors.length === 0
      && Array.isArray(observations.requestErrors) && observations.requestErrors.length === 0,
    initialOwners: browser.initial?.canvasCount === 1 && browser.initial?.tracker?.canvases === 1 && browser.initial?.domCellCount === 0
      && browser.initial?.tracker?.liveContexts === 1 && activeRafs(browser.initial?.tracker) >= 1,
    initialContextRecordExact: validContextSnapshot(browser.initial?.tracker) && contextRecords(browser.initial?.tracker)?.length === 1 && contextRecords(browser.initial?.tracker)?.[0]?.id !== null
      && contextRecords(browser.initial?.tracker)?.[0]?.closed === false && contextRecords(browser.initial?.tracker)?.[0]?.closeCalls === 0,
    restartOwnersExact: sameIdentity(browser.restarted?.before?.qaId, browser.restarted?.after?.qaId) && sameIdentity(browser.restarted?.before?.canvasId, browser.restarted?.after?.canvasId)
      && browser.restarted?.after?.liveContexts === 1,
    restartCanvasesExact: browser.restarted?.before?.canvasCount === 1 && browser.restarted?.before?.canvases === 1
      && browser.restarted?.after?.canvasCount === 1 && browser.restarted?.after?.canvases === 1,
    restartRafsExact: activeRafs(browser.restarted?.before) >= 1 && activeRafs(browser.restarted?.after) === activeRafs(browser.restarted?.before),
    restartContextsExact: sameContextRecords(browser.restarted?.before, browser.restarted?.after),
    restartListenersExact: sameRelevantListeners(browser.restarted?.before, browser.restarted?.after),
    preferencesOwnersExact: sameIdentity(browser.changedPreferences?.tracker?.qaId, browser.initial?.tracker?.qaId) && sameIdentity(browser.changedPreferences?.tracker?.canvasId, browser.initial?.tracker?.canvasId)
      && browser.changedPreferences?.tracker?.liveContexts === 1,
    preferencesCanvasesExact: browser.changedPreferences?.canvasCount === 1 && browser.changedPreferences?.tracker?.canvases === 1,
    preferencesRafsExact: activeRafs(browser.changedPreferences?.tracker) === activeRafs(browser.restarted?.after)
      && activeRafs(browser.changedPreferences?.tracker) === activeRafs(browser.initial?.tracker),
    preferencesContextsExact: sameContextRecords(browser.restarted?.after, browser.changedPreferences?.tracker)
      && sameContextRecords(browser.initial?.tracker, browser.changedPreferences?.tracker),
    preferencesListenersExact: sameRelevantListeners(browser.initial?.tracker, browser.changedPreferences?.tracker),
    exitOwnersClean: browser.exited?.oldRendererRetired === true && browser.exited?.tracker?.canvases === 0 && browser.exited?.tracker?.liveContexts === 0
      && browser.exited?.qaPresent === false && browser.exited?.textHook === false,
    exitRafsZero: activeRafs(browser.exited?.tracker) === 0,
    exitListenersZero: noRelevantListeners(browser.exited?.tracker),
    exitContextsClosedExact: closedContextSuccessors(browser.changedPreferences?.tracker, browser.exited?.tracker),
    reentryOwnersFresh: differentIdentity(browser.reentered?.tracker?.qaId, browser.initial?.tracker?.qaId) && differentIdentity(browser.reentered?.tracker?.canvasId, browser.initial?.tracker?.canvasId)
      && browser.reentered?.tracker?.liveContexts === 1,
    reentryCanvasesExact: browser.reentered?.canvasCount === 1 && browser.reentered?.tracker?.canvases === 1,
    reentryRafsExact: activeRafs(browser.reentered?.tracker) === activeRafs(browser.changedPreferences?.tracker),
    reentryContextsExact: exactReentryContexts(browser.changedPreferences?.tracker, browser.reentered?.tracker),
    reentryListenersExact: sameRelevantListeners(browser.changedPreferences?.tracker, browser.reentered?.tracker),
    hmrEventWindowExact: exactHmrEventWindow(browser),
    iceHmrMarkerBindingExact: exactIceHmrMarkerBinding(browser.observations?.icePhaseMarkers, browser.hmr?.marker),
    hmrAppTouchExact: exactAppTouch(browser.hmr),
    hmrProofExact: deepEqual(browser.hmr?.proof, hmrProof),
    hmrDelivered: hmrProof.passed && hmrProof.branch === 'document-reload' && hmrProof.delivery === 'update-fallback-reload'
      && hmrProof.counts.appRequests === 2 && hmrProof.counts.appResponses === 2 && hmrProof.counts.appFinished === 2 && hmrProof.counts.appFailed === 0,
    hmrOwnersBound: browser.hmr?.after?.canvasCount === 1 && browser.hmr?.after?.tracker?.liveContexts === 1 && hmrProof.ownerIdentitiesValid,
    hmrCanvasOwnersExact: hmrProof.canvasIdentitiesValid,
    hmrPreferencesExact: hmrProof.preferencesStable,
    hmrBoardProbesExact: hmrProof.boardProbesValid,
    hmrRafBaselineActive: activeRafs(browser.hmr?.before?.tracker) >= 1,
    hmrRafsExact: activeRafs(browser.hmr?.after?.tracker) === activeRafs(browser.hmr?.before?.tracker),
    hmrRafsNotDoubled: activeRafs(browser.hmr?.after?.tracker) <= activeRafs(browser.hmr?.before?.tracker),
    hmrListenersExact: sameRelevantListeners(browser.hmr?.before?.tracker, browser.hmr?.after?.tracker),
    preHmrContextsExact: exactPreHmrContextContinuity(browser.reentered?.tracker, browser.hmr?.before?.tracker),
    hmrContextBranchValid: hmrProof.passed && hmrContextBranch === 'document-reload',
    hmrContextsExact: exactHmrContexts(browser.hmr?.before?.tracker, browser.hmr?.after?.tracker, hmrContextBranch),
    terminalOwnersClean: browser.terminal?.canvases === 0 && browser.terminal?.liveContexts === 0,
    terminalRafsZero: activeRafs(browser.terminal) === 0,
    terminalListenersZero: noRelevantListeners(browser.terminal),
    terminalContextsExact: exactTerminalContexts(browser.hmr?.after?.tracker, browser.terminal),
  };
}
/** @param {string} directory @param {string} [base] @returns {Promise<string[]>} */
async function files(directory, base = '') {
  /** @type {string[]} */
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await files(join(directory, entry.name), relative)); else found.push(relative);
  }
  return found;
}

const head = git('rev-parse', 'HEAD');
let terminalCommitted = exists(head, prefix + TERMINAL[0]);
/** @type {any} */
let committedTerminal = null;
let generated = head;
if (terminalCommitted) {
  committedTerminal = JSON.parse(text(blob(head, prefix + TERMINAL[0]), 'committed terminal report'));
  generated = committedTerminal.generatedInputHead;
}
check(git('merge-base', '--is-ancestor', BASE, AUTH) === '', 'R5B terminal precedes authorization');
check(git('merge-base', '--is-ancestor', AUTH, generated) === '', 'authorization precedes generated input');

const manifestBytes = blob(generated, prefix + 'manifest.json');
const manifest = JSON.parse(text(manifestBytes, 'manifest'));
const sourceHead = manifest.provenance.evidenceSourceHead;
check(equalSet(range(AUTH, sourceHead), sourcePaths), 'authorization-to-source exact endpoint');
linearHistory(AUTH, sourceHead, sourcePaths, 'authorization-to-source exact linear history');
check(equalSet(range(sourceHead, generated), preReportPaths), 'source-to-generated exact endpoint');
linearHistory(sourceHead, generated, preReportPaths, 'source-to-generated exact linear history');
check(equalSet(tree(sourceHead), sourcePaths), 'source exact tree');
check(equalSet(tree(generated), [...sourcePaths, ...preReportPaths]), 'generated exact tree');
if (terminalCommitted) {
  check(equalSet(range(generated, head), terminalPaths), 'generated-to-terminal exact endpoint');
  linearHistory(generated, head, terminalPaths, 'generated-to-terminal exact linear history');
  check(equalSet(tree(head), [...sourcePaths, ...preReportPaths, ...terminalPaths]), 'terminal exact tree');
}

check(manifest.schema === 'tetramorph.t37.material-ice-manifest.v1', 'manifest schema');
check(manifest.provenance.r5bTerminalBase === BASE && manifest.provenance.authorizationHead === AUTH
  && manifest.provenance.productHead === BASE, 'manifest exact heads');
check(manifest.humanStatus === HUMAN_STATUS, 'manifest human status open');
check(deepEqual(manifest.byteContract, BYTE_CONTRACT), 'manifest byte contract');
check(deepEqual(manifest.pathContracts, { source: sourcePaths, outputs: outputPaths, preReport: preReportPaths, terminal: terminalPaths, contract: CONTRACT, product: PRODUCT_BINDINGS }), 'manifest path contracts');
check(deepEqual(manifest.countContracts, { source: 10, semanticPng: 20, matrixPng: 6, outputsBeforeManifest: 36, preReport: 37, terminal: 1 }), 'manifest count contracts');
check(deepEqual(manifest.stageEAnchors, STAGE_E_ANCHORS), 'manifest Stage E anchors');
check(deepEqual(manifest.iceContract, ICE), 'manifest Ice contract');

const expectedSourceBindings = sourcePaths.map((path) => { const bytes = blob(sourceHead, path); text(bytes, path); return { path, gitObject: git('rev-parse', `${sourceHead}:${path}`), sha256: sha(bytes), bytes: bytes.length }; });
const expectedContractBindings = CONTRACT.map((path) => { const bytes = blob(AUTH, path); text(bytes, `${AUTH}:${path}`); return { path, gitObject: git('rev-parse', `${AUTH}:${path}`), sha256: sha(bytes), bytes: bytes.length }; });
const expectedProductBindings = PRODUCT_BINDINGS.map((entry) => bind(BASE, entry));
const expectedOutputBindings = OUTPUT.map((relative) => {
  const bytes = blob(generated, prefix + relative);
  if (relative.endsWith('.png')) png(bytes, relative); else text(bytes, relative);
  return { path: prefix + relative, sha256: sha(bytes), bytes: bytes.length };
});
check(deepEqual(manifest.sourceBindings, expectedSourceBindings), 'source Git-blob bindings');
check(deepEqual(manifest.contractBindings, expectedContractBindings), 'contract Git-blob bindings');
check(deepEqual(manifest.productBindings, expectedProductBindings), 'product Git-object bindings');
check(deepEqual(manifest.outputBindings, expectedOutputBindings), 'output Git-blob bindings');
for (const anchor of STAGE_E_ANCHORS) check(git('merge-base', '--is-ancestor', anchor, BASE) === '', `Stage E ancestor ${anchor}`);

const semantic = JSON.parse(text(blob(generated, prefix + 'material-semantic-audit.json'), 'semantic audit'));
check(semantic.schema === 'tetramorph.t37.material-semantic.v1' && semantic.passed === true
  && Array.isArray(semantic.errors) && semantic.errors.length === 0, 'semantic audit declared green');
check(equalSet(Object.keys(semantic.cases), ITEMS), 'semantic four items');
for (const item of /** @type {Array<'freeze'|'bomb'|'multiplier'|'collapse'>} */ (ITEMS)) {
  const entry = semantic.cases[item];
  check(entry.seed === SEEDS[item] && entry.profile === PROFILE[item], `${item}: exact fixture contract`);
  check(equalSet(Object.keys(entry.stages), STAGES), `${item}: five stages`);
  for (const stage of STAGES) {
    const proof = entry.stages[stage];
    check(proof.file === `${item}-${stage}.png`, `${item}/${stage}: filename`);
    const screenshot = blob(generated, prefix + proof.file);
    check(proof.sha256 === sha(screenshot) && proof.bytes === screenshot.length, `${item}/${stage}: screenshot byte binding`);
    /** @type {string[]} */
    const snapshotErrors = [];
    assertItemSnapshot(proof.value, item, stage, snapshotErrors);
    check(snapshotErrors.length === 0, `${item}/${stage}: independent item snapshot semantics`, snapshotErrors);
    check(proof.value.root?.language === 'zh-CN' && proof.value.root?.theme === 'deep-tide'
      && proof.value.root?.reducedMotion === 'false', `${item}/${stage}: semantic settings`);
    /** @type {string[]} */
    const textErrors = [];
    assertTextState(proof.value, `${item}/${stage}`, textErrors);
    check(textErrors.length === 0, `${item}/${stage}: textState`, textErrors);
  }
  check(Array.isArray(entry.observations) && entry.observations.length === 3, `${item}: three observation groups`);
  for (const [index, observed] of entry.observations.entries()) {
    /** @type {string[]} */
    const observationErrors = [];
    assertCleanObservations(observed, `${item}/observations-${index}`, observationErrors);
    check(observationErrors.length === 0, `${item}/observations-${index}: zero browser errors`, observationErrors);
  }
}
check(equalSet(SEMANTIC_PNG, ITEMS.flatMap((item) => STAGES.map((stage) => `${item}-${stage}.png`))), 'semantic filename contract');

const matrix = JSON.parse(text(blob(generated, prefix + 'material-matrix-audit.json'), 'matrix audit'));
check(matrix.schema === 'tetramorph.t37.material-matrix.v1' && matrix.passed === true
  && Array.isArray(matrix.errors) && matrix.errors.length === 0, 'matrix audit declared green');
check(equalSet(Object.keys(matrix.cases), MATRIX_CASES.map(({ name }) => name)), 'matrix six cases');
check(deepEqual(matrix.coverage, { themes: ['deep-tide', 'mineral-mist', 'sunstone'], motion: ['full', 'reduced'], languages: ['en', 'zh-CN'], viewports: ['1125x1196', '1440x900', '390x844'], items: ['bomb', 'collapse', 'freeze', 'multiplier'] }), 'matrix exact coverage');
for (const entry of MATRIX_CASES) {
  const proof = matrix.cases[entry.name];
  check(deepEqual(proof.contract, entry) && proof.file === `${entry.name}.png`, `${entry.name}: contract`);
  const screenshot = blob(generated, prefix + `${entry.name}.png`);
  check(proof.sha256 === sha(screenshot) && proof.bytes === screenshot.length, `${entry.name}: screenshot byte binding`);
  /** @type {string[]} */
  const snapshotErrors = [];
  assertItemSnapshot(proof.value, /** @type {'freeze'|'bomb'|'multiplier'|'collapse'} */ (entry.item), 'active-ghost', snapshotErrors);
  check(snapshotErrors.length === 0, `${entry.name}: independent item snapshot semantics`, snapshotErrors);
  check(proof.value.root.language === entry.language && proof.value.root.theme === entry.theme && proof.value.root.reducedMotion === String(entry.reduced), `${entry.name}: root state`);
  /** @type {string[]} */
  const textErrors = [];
  assertTextState(proof.value, entry.name, textErrors);
  check(textErrors.length === 0, `${entry.name}: textState`, textErrors);
  /** @type {string[]} */
  const observationErrors = [];
  assertCleanObservations(proof.observations, `${entry.name}/observations`, observationErrors);
  check(observationErrors.length === 0, `${entry.name}: zero browser errors`, observationErrors);
}
check(equalSet(MATRIX_PNG, MATRIX_CASES.map(({ name }) => `${name}.png`)), 'matrix filename contract');

const browser = JSON.parse(text(blob(generated, prefix + 'browser-report.json'), 'browser report'));
check(browser.schema === 'tetramorph.t37.material-browser.v1' && browser.passed === true
  && Array.isArray(browser.failures) && browser.failures.length === 0, 'browser report declared green');
const recomputedLifecycleProof = browserLifecycleProof(browser);
const recomputedLifecycleAssertions = browserLifecycleAssertions(browser);
for (const [label, passed] of Object.entries(recomputedLifecycleAssertions)) check(passed, `browser lifecycle: ${label}`);
check(deepEqual(browser.lifecycleProof, recomputedLifecycleProof), 'browser lifecycle proof matches raw tracker data', { expected: recomputedLifecycleProof, actual: browser.lifecycleProof });
check(deepEqual(browser.assertions, recomputedLifecycleAssertions), 'browser assertions match independent recomputation', { expected: recomputedLifecycleAssertions, actual: browser.assertions });

const ice = JSON.parse(text(blob(generated, prefix + 'ice-provenance-audit.json'), 'Ice provenance'));
const expectedOrigin = new URL(String(browser.origin)).origin;
const recomputedIceClassification = classifyIceResponses(ice.runtimeResponses, expectedOrigin);
check(ice.schema === 'tetramorph.t37.ice-provenance.v1' && ice.passed === true && Array.isArray(ice.failures) && ice.failures.length === 0,
  'Ice provenance declared green');
check(recomputedIceClassification.passed, 'Ice raw response strict module-plus-asset classification', recomputedIceClassification);
check(deepEqual(ice.runtimeClassification, recomputedIceClassification), 'Ice persisted classification matches independent raw recomputation');
check(deepEqual(browser.observations?.iceResponses, ice.runtimeResponses), 'Ice browser/provenance raw response records identical');
check(deepEqual(browser.observations?.icePhaseMarkers, ice.runtimePhaseMarkers), 'Ice browser/provenance phase markers identical');
check(exactIceHmrMarkerBinding(ice.runtimePhaseMarkers, browser.hmr?.marker), 'Ice HMR phase markers bind the unified HMR event window');
check(exactInitialIceEventBinding(browser.observations?.events ?? [], ice.runtimeResponses, ice.runtimePhaseMarkers),
  'Ice initial events bind every materialized response metadata field');
check(exactIcePhaseClassification(browser.observations?.events ?? [], ice.runtimePhaseMarkers), 'Ice response phase classification exact');
const catalogPath = 'src/game/audio/audioAssetCatalog.ts';
const catalogBytes = blob(BASE, catalogPath);
const expectedCatalog = { path: catalogPath, gitBlob: git('rev-parse', `${BASE}:${catalogPath}`), bytes: catalogBytes.length,
  sha256: sha(catalogBytes), runtime: ice.catalog?.runtime };
check(exactRuntimeCatalog(ice.catalog?.runtime) && deepEqual(ice.catalog, expectedCatalog), 'Ice full catalog Git identity and runtime descriptor');
check(ice.productHead === BASE && ice.authorizationHead === AUTH && ice.origin === expectedOrigin, 'Ice exact heads and runtime origin');
check(deepEqual(ice.product, { ...ICE, observedGitBlob: ICE.gitBlob, observedBytes: ICE.bytes, observedSha256: ICE.sha256 }), 'Ice exact product identity');
check(deepEqual(ice.originalAcquisition, { filename: ICE.originalFilename, sha256: null, status: 'OPEN / login required', productOggIsOriginal: false, previewSubstitutionAllowed: false }), 'Ice original gap remains open');
const recomputedIceChecks = [
  { label: 'product Ogg bytes/hash/blob', passed: true },
  { label: 'full catalog Git blob/bytes/hash', passed: expectedCatalog.gitBlob.length === 40 && git('cat-file', '-t', expectedCatalog.gitBlob) === 'blob'
    && Number(git('cat-file', '-s', expectedCatalog.gitBlob)) === expectedCatalog.bytes && expectedCatalog.sha256.length === 64 },
  { label: 'runtime catalog own freezeIce descriptor/value', passed: exactRuntimeCatalog(ice.catalog?.runtime) },
  { label: 'no original substitution', passed: ICE.originalSha256 === null && ICE.originalStatus === 'OPEN / login required' && ICE.substitutionAllowed === false },
  { label: 'runtime exact module-plus-asset pair', passed: recomputedIceClassification.passed },
  { label: 'runtime Ice events bind materialized response metadata', passed: exactInitialIceEventBinding(browser.observations?.events ?? [], ice.runtimeResponses, ice.runtimePhaseMarkers) },
  { label: 'runtime Ice response phases are exact', passed: exactIcePhaseClassification(browser.observations?.events ?? [], ice.runtimePhaseMarkers) },
  { label: 'runtime Ice phase markers bind HMR event window', passed: exactIceHmrMarkerBinding(ice.runtimePhaseMarkers, browser.hmr?.marker) },
];
check(recomputedIceChecks.length > 0 && deepEqual(ice.checks, recomputedIceChecks)
  && ice.checks.every((/** @type {any} */ entry) => entry?.passed === true), 'Ice checks non-empty and independently exact');
check(deepEqual(manifest.auditSummary?.ice, { schema: ice.schema, generatedAt: ice.generatedAt, passed: ice.passed,
  originalAcquisition: ice.originalAcquisition, runtimeClassification: recomputedIceClassification, catalog: expectedCatalog }), 'manifest Ice recomputation summary');

for (const statePath of CLIENT.filter((path) => path.endsWith('.json'))) {
  const state = JSON.parse(text(blob(generated, prefix + statePath), statePath));
  check(state.mode === 'sprint' && state.screen === 'game', `${statePath}: prescribed real product state`);
}

const expectedDirectory = terminalCommitted ? [...SOURCE, ...PRE_REPORT, ...TERMINAL] : [...SOURCE, ...PRE_REPORT];
check(equalSet(await files(root), expectedDirectory), 'worktree exact directory');
const manifestSha256 = sha(manifestBytes);
const report = {
  schema: 'tetramorph.t37.material-ice-verification.v1', generatedAt: new Date().toISOString(),
  passed: failures.length === 0, failures, checks,
  manifestSha256, evidenceSourceHead: sourceHead, generatedInputHead: generated,
  r5bTerminalBase: BASE,
  pathContracts: { source: sourcePaths, outputs: outputPaths, preReport: preReportPaths, terminal: terminalPaths },
  humanStatus: HUMAN_STATUS,
};

if (terminalCommitted) {
  const expectedCommittedTerminal = {
    schema: report.schema,
    passed: failures.length === 0,
    failures: structuredClone(failures),
    checks: structuredClone(checks),
    manifestSha256: report.manifestSha256,
    evidenceSourceHead: report.evidenceSourceHead,
    generatedInputHead: report.generatedInputHead,
    r5bTerminalBase: report.r5bTerminalBase,
    pathContracts: structuredClone(report.pathContracts),
    humanStatus: report.humanStatus,
  };
  check(exactCommittedTerminal(committedTerminal, expectedCommittedTerminal), 'committed terminal report exact envelope');
} else {
  await writeFile(join(root, TERMINAL[0]), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
report.passed = failures.length === 0;
console.log(JSON.stringify({ passed: report.passed, checks: checks.length, failures, generatedInputHead: generated, humanStatus: HUMAN_STATUS }));
if (!report.passed) process.exitCode = 1;
