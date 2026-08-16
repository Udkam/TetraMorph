// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTH, BASE, BYTE_CONTRACT, CONTRACT, HUMAN_STATUS, ICE, OUTPUT, PRE_REPORT,
  PRODUCT_BINDINGS, SOURCE, STAGE_E_ANCHORS, TERMINAL, prefix, repo, root,
} from './evidence-contract.mjs';

/** @param {import('node:crypto').BinaryLike} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {...string} args */
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
/** @param {...string} args */
const gitRaw = (...args) => execFileSync('git', args, { cwd: repo });
/** @param {string} head @param {string} path */
const blob = (head, path) => gitRaw('show', `${head}:${path}`);
/** @param {string[]} values */
const sorted = (values) => [...values].sort();
/** @param {string[]} left @param {string[]} right */
const equalSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
const sourcePaths = SOURCE.map((path) => prefix + path);
const outputPaths = OUTPUT.map((path) => prefix + path);
const preReportPaths = PRE_REPORT.map((path) => prefix + path);
const terminalPaths = TERMINAL.map((path) => prefix + path);

/** @param {Buffer} bytes @param {string} label */
function text(bytes, label) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error(`${label}: UTF-8 BOM`);
  const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (value.includes('\r')) throw new Error(`${label}: CR byte`);
  if (!value.endsWith('\n')) throw new Error(`${label}: missing final LF`);
  return value;
}

/** @param {string} directory @param {string} [base] @returns {Promise<string[]>} */
async function files(directory, base = '') {
  /** @type {string[]} */
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await files(join(directory, entry.name), relative));
    else found.push(relative);
  }
  return found;
}

/** @param {string} from @param {string} to @param {string[]} expected @param {string} label */
function exactRange(from, to, expected, label) {
  const actual = git('diff', '--name-only', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
  if (!equalSet(actual, expected)) throw new Error(`${label}: ${actual.join(',')}`);
}

/** @param {string} head @param {string[]} expected @param {string} label */
function exactTree(head, expected, label) {
  const actual = git('ls-tree', '-r', '--name-only', head, '--', prefix).split(/\r?\n/u).filter(Boolean);
  if (!equalSet(actual, expected)) throw new Error(`${label}: ${actual.join(',')}`);
}

/** @param {string} from @param {string} to @param {string[]} allowed @param {string} label */
function linearHistory(from, to, allowed, label) {
  const commits = git('rev-list', '--reverse', '--ancestry-path', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
  if (commits.length === 0) throw new Error(`${label}: empty`);
  const touched = new Set();
  for (const commit of commits) {
    const line = git('rev-list', '--parents', '-n', '1', commit).split(/\s+/u);
    if (line.length !== 2) throw new Error(`${label}: non-linear ${commit}`);
    const changes = gitRaw('diff-tree', '--no-commit-id', '--name-status', '-r', '-z', line[1], commit).toString('utf8').split('\0').filter(Boolean);
    if (changes.length % 2 !== 0) throw new Error(`${label}: rename/copy/parse ${commit}`);
    for (let index = 0; index < changes.length; index += 2) {
      const status = changes[index]; const path = changes[index + 1];
      if (!['A', 'M', 'D'].includes(status) || !allowed.includes(path)) throw new Error(`${label}: ${commit} ${status} ${path}`);
      touched.add(path);
    }
  }
  if (!equalSet([...touched], allowed)) throw new Error(`${label}: touched ${[...touched].join(',')}`);
  return commits;
}

/** @param {string} head @param {{kind: string, path: string}} entry */
function bind(head, entry) {
  const object = git('rev-parse', `${head}:${entry.path}`);
  if (entry.kind === 'tree') return { ...entry, gitObject: object };
  const bytes = blob(head, entry.path);
  return { ...entry, gitObject: object, sha256: sha(bytes), bytes: bytes.length };
}

const head = git('rev-parse', 'HEAD');
if (git('merge-base', '--is-ancestor', BASE, AUTH) !== '') throw new Error('R5B terminal is not the authorization parent.');
if (git('merge-base', '--is-ancestor', AUTH, head) !== '') throw new Error('Authorization is not source ancestor.');
exactRange(AUTH, head, sourcePaths, 'authorization-to-source exact range');
const sourceCommits = linearHistory(AUTH, head, sourcePaths, 'authorization-to-source history');
exactTree(head, sourcePaths, 'source exact tree');

const actual = await files(root);
if (!equalSet(actual, [...SOURCE, ...OUTPUT])) throw new Error(`Pre-manifest directory drift: ${actual.join(',')}`);
const sourceBindings = sourcePaths.map((path) => {
  const bytes = blob(head, path); if (!path.endsWith('.png')) text(bytes, path);
  return { path, gitObject: git('rev-parse', `${head}:${path}`), sha256: sha(bytes), bytes: bytes.length };
});
/** @type {any[]} */
const outputBindings = [];
for (const relative of OUTPUT) {
  const bytes = await readFile(join(root, relative));
  if (!relative.endsWith('.png')) text(bytes, relative);
  outputBindings.push({ path: prefix + relative, sha256: sha(bytes), bytes: bytes.length });
}
const contractBindings = CONTRACT.map((path) => {
  const bytes = blob(AUTH, path); text(bytes, `${AUTH}:${path}`);
  return { path, gitObject: git('rev-parse', `${AUTH}:${path}`), sha256: sha(bytes), bytes: bytes.length };
});
const productBindings = PRODUCT_BINDINGS.map((entry) => bind(BASE, entry));
for (const anchor of STAGE_E_ANCHORS) if (git('merge-base', '--is-ancestor', anchor, BASE) !== '') throw new Error(`Missing Stage E anchor ${anchor}.`);

const semantic = JSON.parse(await readFile(join(root, 'material-semantic-audit.json'), 'utf8'));
const matrix = JSON.parse(await readFile(join(root, 'material-matrix-audit.json'), 'utf8'));
const browser = JSON.parse(await readFile(join(root, 'browser-report.json'), 'utf8'));
const ice = JSON.parse(await readFile(join(root, 'ice-provenance-audit.json'), 'utf8'));
for (const [label, value, schema] of [
  ['semantic', semantic, 'tetramorph.t37.material-semantic.v1'],
  ['matrix', matrix, 'tetramorph.t37.material-matrix.v1'],
  ['browser', browser, 'tetramorph.t37.material-browser.v1'],
  ['ice', ice, 'tetramorph.t37.ice-provenance.v1'],
]) {
  if (value.schema !== schema || value.passed !== true || value.errors?.length > 0 || value.failures?.length > 0) throw new Error(`${label} audit is not fail-closed green.`);
  if (new Date(value.generatedAt).toISOString() !== value.generatedAt) throw new Error(`${label} generatedAt is not canonical ISO.`);
}

const manifest = {
  schema: 'tetramorph.t37.material-ice-manifest.v1', generatedAt: new Date().toISOString(),
  provenance: { r5bTerminalBase: BASE, authorizationHead: AUTH, evidenceSourceHead: head, sourceCommits, productHead: BASE, writerBoundary: `${prefix}**` },
  humanStatus: HUMAN_STATUS,
  pathContracts: { source: sourcePaths, outputs: outputPaths, preReport: preReportPaths, terminal: terminalPaths, contract: CONTRACT, product: PRODUCT_BINDINGS },
  countContracts: { source: 10, semanticPng: 20, matrixPng: 6, outputsBeforeManifest: 36, preReport: 37, terminal: 1 },
  byteContract: BYTE_CONTRACT,
  stageEAnchors: STAGE_E_ANCHORS,
  iceContract: ICE,
  sourceBindings, outputBindings, contractBindings, productBindings,
  auditSummary: {
    semantic: { schema: semantic.schema, generatedAt: semantic.generatedAt, passed: semantic.passed, cases: Object.keys(semantic.cases).sort() },
    matrix: { schema: matrix.schema, generatedAt: matrix.generatedAt, passed: matrix.passed, cases: Object.keys(matrix.cases).sort(), coverage: matrix.coverage },
    browser: { schema: browser.schema, generatedAt: browser.generatedAt, passed: browser.passed, assertions: browser.assertions },
    ice: { schema: ice.schema, generatedAt: ice.generatedAt, passed: ice.passed, originalAcquisition: ice.originalAcquisition },
  },
};
await writeFile(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
