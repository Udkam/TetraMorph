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
/** @param {any} event @param {string} expectedOrigin */
const isAppEvent = (event, expectedOrigin) => ['request', 'app-response', 'app-requestfinished', 'app-requestfailed'].includes(event?.kind)
  && event?.method === 'GET' && event?.resourceType === 'script' && event?.mainFrame === true && event?.navigationRequest === false
  && eventUrl(event)?.origin === new URL(expectedOrigin).origin && eventUrl(event)?.pathname === '/src/App.tsx';
/** @param {any} event @param {string} expectedOrigin */
const isAppRequest = (event, expectedOrigin) => event?.kind === 'request' && isAppEvent(event, expectedOrigin);
/** @param {any} event @param {string} expectedOrigin */
const isAppResponse = (event, expectedOrigin) => event?.kind === 'app-response' && isAppEvent(event, expectedOrigin)
  && event?.status === 200 && ['text/javascript', 'application/javascript'].includes(contentTypeEssence(event?.contentType) ?? '')
  && event?.bodyEncoding === 'base64' && canonicalBase64(event?.bodyBase64) !== null
  && !Object.prototype.hasOwnProperty.call(event ?? {}, 'bodyError');
/** @param {any} event @param {string} expectedOrigin */
const isAppFinished = (event, expectedOrigin) => event?.kind === 'app-requestfinished' && isAppEvent(event, expectedOrigin);
/** @param {any} event @param {string} expectedOrigin */
const isAppFailed = (event, expectedOrigin) => event?.kind === 'app-requestfailed' && isAppEvent(event, expectedOrigin)
  && typeof event?.errorText === 'string' && event.errorText.length > 0;
/** @param {any} event */
const isDocumentRequest = (event) => event?.kind === 'request' && event?.method === 'GET' && event?.resourceType === 'document'
  && event?.mainFrame === true && event?.navigationRequest === true;
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
/** @param {any} snapshotValue */
const validBoardProbe = (snapshotValue) => snapshotValue?.boardProbe !== null && typeof snapshotValue?.boardProbe === 'object'
  && !Object.prototype.hasOwnProperty.call(snapshotValue.boardProbe, 'error');
/** @param {any} request @param {any[]} responses @param {any[]} finished @param {any[]} failed */
function appTransfer(request, responses, finished, failed) {
  const matchingResponses = responses.filter((event) => event.url === request.url);
  const matchingFinished = finished.filter((event) => event.url === request.url);
  const matchingFailed = failed.filter((event) => event.url === request.url);
  const response = matchingResponses[0]; const completion = matchingFinished[0];
  return { request, response, finished: completion,
    exact: matchingResponses.length === 1 && matchingFinished.length === 1 && matchingFailed.length === 0
      && request.sequence < response?.sequence && response?.sequence < completion?.sequence };
}
/** @param {any} event @param {string} expectedOrigin */
function isRelevantHmrEvent(event, expectedOrigin) {
  const payload = rawWebsocketPayload(event);
  return isAppEvent(event, expectedOrigin) || isDocumentRequest(event) || (event?.kind === 'navigation' && event?.mainFrame === true)
    || payload?.type === 'update' || payload?.type === 'full-reload';
}
/** @param {any[]} events @param {any[]} responses @param {number} markerSequence */
function exactInitialIceEventBinding(events, responses, markerSequence) {
  const initial = events.filter((event) => event?.kind === 'ice-response');
  const late = events.filter((event) => event?.kind === 'ice-response-hmr');
  const fields = ['url', 'status', 'method', 'resourceType', 'contentType', 'redirectedFrom', 'captureWindow', 'bodyEncoding', 'body'];
  return initial.length === 2 && responses.length === 2 && initial.every((event, index) => event.sequence === responses[index]?.sequence
    && fields.every((field) => deepEqual(event?.[field], responses[index]?.[field]))
    && Object.prototype.hasOwnProperty.call(event, 'bodyError') === Object.prototype.hasOwnProperty.call(responses[index] ?? {}, 'bodyError')
    && (!Object.prototype.hasOwnProperty.call(event, 'bodyError') || event.bodyError === responses[index]?.bodyError)
    && event.captureWindow === 'initial-freeze' && event.sequence <= markerSequence)
    && late.every((event) => event.captureWindow === 'hmr' && event.sequence > markerSequence);
}
/** @param {any} hmr @param {string} expectedOrigin */
function deriveHmrProof(hmr, expectedOrigin) {
  const events = Array.isArray(hmr?.events) ? hmr.events : [];
  const markerSequence = Number(hmr?.marker?.eventSequence ?? 0);
  const sequencesValid = events.length > 0 && events.every((/** @type {any} */ event, /** @type {number} */ index) =>
    Number.isInteger(event?.sequence) && event.sequence === markerSequence + index + 1);
  const documentRequests = events.filter(isDocumentRequest);
  const navigations = events.filter((/** @type {any} */ event) => event?.kind === 'navigation' && event?.mainFrame === true);
  const appRequests = events.filter((/** @type {any} */ event) => isAppRequest(event, expectedOrigin));
  const appResponses = events.filter((/** @type {any} */ event) => isAppResponse(event, expectedOrigin));
  const appFinished = events.filter((/** @type {any} */ event) => isAppFinished(event, expectedOrigin));
  const appFailed = events.filter((/** @type {any} */ event) => isAppFailed(event, expectedOrigin));
  const updateFrames = events.filter((/** @type {any} */ event) => isAppUpdateFrame(event, expectedOrigin));
  const fullReloadFrames = events.filter((/** @type {any} */ event) => isFullReloadFrame(event, expectedOrigin));
  const hmrFrames = events.filter((/** @type {any} */ event) => ['update', 'full-reload'].includes(rawWebsocketPayload(event)?.type));
  const websocketEndpointsValid = hmrFrames.length > 0 && hmrFrames.every((/** @type {any} */ event) => exactViteWebsocketEndpoint(event, expectedOrigin));
  const navigationSequence = navigations[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const documentSequence = documentRequests[0]?.sequence ?? Number.POSITIVE_INFINITY;
  const preNavigationApps = appRequests.filter((/** @type {any} */ event) => event.sequence < documentSequence);
  const bootstrapApps = appRequests.filter((/** @type {any} */ event) => event.sequence > navigationSequence);
  const transfers = appRequests.map((/** @type {any} */ request) => appTransfer(request, appResponses, appFinished, appFailed));
  const appTransfersExact = transfers.length > 0 && transfers.every((/** @type {any} */ transfer) => transfer.exact)
    && appResponses.length === appRequests.length && appFinished.length === appRequests.length && appFailed.length === 0;
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
  const firstFull = fullReloadFrames[0]?.sequence ?? null;
  const sameUrlReload = documentRequests.length === 1 && navigations.length === 1 && documentRequests[0]?.url === hmr?.before?.navigation?.url
    && navigations[0]?.url === hmr?.before?.navigation?.url && hmr?.after?.navigation?.url === hmr?.before?.navigation?.url;
  const preTransfer = transfers.find((/** @type {any} */ transfer) => transfer.request === preNavigationApps[0]);
  const bootstrapTransfer = transfers.find((/** @type {any} */ transfer) => transfer.request === bootstrapApps[0]);
  let eventOrderValid = false;
  if (delivery === 'hot-update') {
    const transfer = transfers[0];
    eventOrderValid = updateFrames.length === 1 && fullReloadFrames.length === 0 && documentRequests.length === 0 && navigations.length === 0
      && transfers.length === 1 && firstUpdate < transfer?.request?.sequence && transfer?.exact === true;
  } else if (delivery === 'update-fallback-reload') {
    eventOrderValid = updateFrames.length === 1 && fullReloadFrames.length <= 1 && preNavigationApps.length === 1 && bootstrapApps.length === 1
      && transfers.length === 2 && firstUpdate < preTransfer?.request?.sequence && preTransfer?.exact === true
      && preTransfer.finished.sequence < (firstFull ?? documentSequence) && (firstFull === null || firstFull < documentSequence)
      && documentSequence < navigationSequence && navigationSequence < bootstrapTransfer?.request?.sequence && bootstrapTransfer?.exact === true;
  } else if (delivery === 'direct-full-reload') {
    eventOrderValid = updateFrames.length === 0 && fullReloadFrames.length === 1 && preNavigationApps.length === 0 && bootstrapApps.length === 1
      && transfers.length === 1 && firstFull !== null && firstFull < documentSequence && documentSequence < navigationSequence
      && navigationSequence < bootstrapTransfer?.request?.sequence && bootstrapTransfer?.exact === true;
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
    && eventOrderValid && ownerIdentitiesValid && canvasIdentitiesValid && contextsExact && preferencesStable && boardProbesValid && reloadExact;
  return {
    branch, delivery, sequencesValid,
    epoch: { before: Number.isInteger(beforeEpoch) ? beforeEpoch : null, after: Number.isInteger(afterEpoch) ? afterEpoch : null },
    counts: { events: events.length, appRequests: appRequests.length, preNavigationAppRequests: preNavigationApps.length,
      bootstrapAppRequests: bootstrapApps.length, appResponses: appResponses.length, appFinished: appFinished.length, appFailed: appFailed.length,
      documentRequests: documentRequests.length, navigations: navigations.length, appUpdateFrames: updateFrames.length, fullReloadFrames: fullReloadFrames.length },
    sequence: { firstUpdate: Number.isFinite(firstUpdate) ? firstUpdate : null, firstFullReload: firstFull,
      documentRequest: Number.isFinite(documentSequence) ? documentSequence : null, navigation: Number.isFinite(navigationSequence) ? navigationSequence : null },
    binding: { beforeQa, afterQa, beforeCanvas, afterCanvas,
      beforeContextEventCursor: Number.isInteger(hmr?.before?.tracker?.contextEventCursor) ? hmr.before.tracker.contextEventCursor : null,
      afterContextEventCursor: Number.isInteger(hmr?.after?.tracker?.contextEventCursor) ? hmr.after.tracker.contextEventCursor : null },
    sameUrlReload, websocketEndpointsValid, appTransfersExact, eventOrderValid, ownerIdentitiesValid, canvasIdentitiesValid,
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
  return touch?.path === 'src/App.tsx' && touch.beforeBytes === bytes.length && touch.afterBytes === bytes.length && touch.baseBytes === bytes.length
    && touch.beforeSha256 === expectedSha && touch.afterSha256 === expectedSha && touch.baseSha256 === expectedSha
    && touch.beforeGitBlob === expectedBlob && touch.afterGitBlob === expectedBlob && touch.baseGitBlob === expectedBlob
    && Number.isFinite(touch.beforeMtimeMs) && Number.isFinite(touch.requestedMtimeMs) && Number.isFinite(touch.afterMtimeMs)
    && touch.requestedMtimeMs > touch.beforeMtimeMs && touch.afterMtimeMs > touch.beforeMtimeMs;
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
    { sequence: 1, url: `${iceUrl}?import&url`, status: 200, method: 'GET', resourceType: 'script', contentType: 'text/javascript; charset=utf-8',
      redirectedFrom: null, captureWindow: 'initial-freeze', bodyEncoding: 'base64', body: Buffer.from(moduleSource).toString('base64') },
    { sequence: 2, url: iceUrl, status: 200, method: 'GET', resourceType: 'fetch', contentType: 'audio/ogg; charset=binary',
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
  const iceEvents = goodIce.map((entry) => ({ kind: 'ice-response', ...clone(entry) }));
  assertFixture(exactInitialIceEventBinding(iceEvents, goodIce, 50), 'valid Ice event binding');
  const contradictoryIce = clone(iceEvents); contradictoryIce[0].contentType = 'audio/ogg';
  assertFixture(!exactInitialIceEventBinding(contradictoryIce, goodIce, 50), 'reject Ice event metadata contradiction');

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
  const snap = (/** @type {number} */ epoch, /** @type {any} */ value, type = 'navigate') => ({
    navigation: { epoch, type, url: route }, tracker: value,
    root: { language: 'zh-CN', theme: 'mineral-mist', reducedMotion: 'true' }, canvasCount: 1,
    boardProbe: { frame: 1, resolution: 1, outputPixels: 4, pixelProbe: { alpha: 255 } },
  });
  const wsUrl = `${new URL(normalizedOrigin).protocol === 'https:' ? 'wss:' : 'ws:'}//${new URL(normalizedOrigin).host}/`;
  const update = (sequence = 11) => ({ sequence, kind: 'websocket-frame', direction: 'received', encoding: 'utf8', url: wsUrl,
    body: JSON.stringify({ type: 'update', updates: [{ type: 'js-update', path: '/src/App.tsx', acceptedPath: '/src/App.tsx' }] }) });
  const full = (sequence = 11) => ({ sequence, kind: 'websocket-frame', direction: 'received', encoding: 'utf8', url: wsUrl,
    body: JSON.stringify({ type: 'full-reload', path: '*' }) });
  const app = (/** @type {number} */ sequence, suffix = '?t=1') => ({ sequence, kind: 'request', url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false });
  const response = (/** @type {number} */ sequence, suffix = '?t=1') => ({ sequence, kind: 'app-response', url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false, status: 200,
    contentType: 'text/javascript; charset=utf-8', bodyEncoding: 'base64', bodyBase64: Buffer.from('transformed App module').toString('base64') });
  const finished = (/** @type {number} */ sequence, suffix = '?t=1') => ({ sequence, kind: 'app-requestfinished', url: `${normalizedOrigin}/src/App.tsx${suffix}`,
    method: 'GET', resourceType: 'script', mainFrame: true, navigationRequest: false });
  const doc = (/** @type {number} */ sequence) => ({ sequence, kind: 'request', url: route, method: 'GET', resourceType: 'document', mainFrame: true, navigationRequest: true });
  const nav = (/** @type {number} */ sequence) => ({ sequence, kind: 'navigation', url: route, mainFrame: true });
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
    events: [update(11), app(12), response(13), finished(14), full(15), doc(16), nav(17), app(18, ''), response(19, ''), finished(20, '')],
    before, after: snap(2, live(2), 'reload'),
    oldOwner: { ownerPresent: false, sameOwner: false, oldRenderer: 'unavailable', beforeIdentity: id(1, 10), ownerIdentity: null,
      currentIdentity: id(2, 10), probe: { target: null, targetIdentity: null, outcome: 'unavailable' } },
  };
  const direct = { ...clone(reload), events: [full(11), doc(12), nav(13), app(14, ''), response(15, ''), finished(16, '')] };
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
  noResponse.events = noResponse.events.filter((/** @type {any} */ event) => !(event.kind === 'app-response' && event.url.includes('?t=1')));
  const failedResponse = clone(reload);
  failedResponse.events[2] = { ...finished(13), kind: 'app-requestfailed', errorText: 'net::ERR_FAILED' };
  const thirdApp = clone(reload);
  thirdApp.events.push(app(21, '?t=third'), response(22, '?t=third'), finished(23, '?t=third'));
  /** @type {Array<[string, any]>} */
  const hmrRejects = [
    ['missing owner called retired', { ...clone(same), oldOwner: { ...clone(same.oldOwner), ownerPresent: false, sameOwner: false, oldRenderer: 'retired' } }],
    ['same epoch navigation', { ...clone(reload), after: snap(1, live(1), 'reload') }],
    ['epoch change no navigation', { ...clone(same), after: snap(2, live(2), 'reload'), oldOwner: clone(reload.oldOwner) }],
    ['multiple navigation', { ...clone(reload), events: [...clone(reload.events), doc(21), nav(22)] }],
    ['wrong reload path', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) => event.sequence === 16 ? { ...event, url: `${normalizedOrigin}/wrong` } : event) }],
    ['non-document request', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) => event.sequence === 16 ? { ...event, resourceType: 'fetch', navigationRequest: false } : event) }],
    ['cross epoch owner id', { ...clone(reload), oldOwner: { ...clone(reload.oldOwner), currentIdentity: id(1, 10) } }],
    ['same owner context changed', { ...clone(same), after: snap(1, replaced) }],
    ['replacement no close', { ...clone(replacement), after: snap(1, live(1, 11, 21)) }],
    ['replacement double close', doubleClose],
    ['replacement extra create', extraCreate],
    ['reload zero live', { ...clone(reload), after: snap(2, tracker(2, [], []), 'reload') }],
    ['reload two live', twoLive],
    ['bad request order', { ...clone(reload), events: [doc(11), nav(12), update(13), app(14), response(15), finished(16), app(17, ''), response(18, ''), finished(19, '')] }],
    ['App response missing', noResponse],
    ['App request failed', failedResponse],
    ['third App transfer', thirdApp],
    ['owner snapshot forged', { ...clone(reload), oldOwner: { ...clone(reload.oldOwner), beforeIdentity: id(1, 99) } }],
    ['same renderer failed probe', { ...clone(same), oldOwner: { ...clone(same.oldOwner), oldRenderer: 'invalid',
      probe: { ...clone(same.oldOwner.probe), outcome: 'throws' } } }],
    ['preference language drift', { ...clone(reload), after: { ...clone(reload.after), root: { ...clone(reload.after.root), language: 'en-US' } } }],
    ['canvas identity mismatch', { ...clone(reload), after: { ...clone(reload.after), tracker: { ...clone(reload.after.tracker), canvasId: id(1, 20) } } }],
    ['replacement create before close', createBeforeClose],
    ['cross-origin websocket', { ...clone(reload), events: clone(reload.events).map((/** @type {any} */ event) =>
      event.kind === 'websocket-frame' ? { ...event, url: 'ws://localhost:5193/' } : event) }],
  ];
  for (const [label, value] of hmrRejects) {
    assertFixture(!deriveHmrProof(value, normalizedOrigin).passed, `reject HMR ${label}`);
  }
  const filler = Array.from({ length: 10 }, (_, index) => ({ sequence: index + 1, kind: 'fixture' }));
  const windowed = clone(reload);
  windowed.marker = { eventIndex: 10, eventSequence: 10, navigationArm: { eventIndex: 10, eventSequence: 10, url: route },
    endEventIndex: 20, endEventSequence: 20 };
  const exactEvents = [...filler, ...clone(reload.events)];
  assertFixture(exactHmrEventWindow({ origin: normalizedOrigin, observations: { events: exactEvents }, hmr: windowed }), 'valid HMR eventEnd window');
  assertFixture(!exactHmrEventWindow({ origin: normalizedOrigin, observations: { events: [...exactEvents, doc(21)] }, hmr: windowed }), 'reject slow late reload after eventEnd');

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
    iceAccepted: 2, iceRejected: iceRejects.length + 2,
    hmrAccepted: 4, hmrRejected: hmrRejects.length + 2,
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
check(exactInitialIceEventBinding(browser.observations?.events ?? [], ice.runtimeResponses, browser.hmr?.marker?.eventSequence),
  'Ice initial events bind every materialized response metadata field');
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
  { label: 'runtime Ice events bind materialized response metadata', passed: exactInitialIceEventBinding(browser.observations?.events ?? [], ice.runtimeResponses, browser.hmr?.marker?.eventSequence) },
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
