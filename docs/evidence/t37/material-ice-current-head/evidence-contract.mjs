// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = dirname(fileURLToPath(import.meta.url));
export const repo = join(root, '..', '..', '..', '..');
export const prefix = 'docs/evidence/t37/material-ice-current-head/';
export const BASE = '171181228c0408cfa1bfb1259eb98c29a63efae3';
export const AUTH = '3eb110f546e84c5003c9d2eaa73dfa0f8f9986e9';
export const HUMAN_STATUS = 'OPEN / NOT ACCEPTED — final consolidated human review only';
export const BYTE_CONTRACT = Object.freeze({
  text: 'UTF-8 no-BOM LF-only',
  png: 'binary-unfiltered',
  committedDomain: 'git blob',
  precommitDomain: 'validated raw worktree bytes',
  manifestSelfHash: 'excluded',
});

export const ITEMS = Object.freeze(['freeze', 'bomb', 'multiplier', 'collapse']);
export const STAGES = Object.freeze(['next', 'active-ghost', 'settled', 'clear', 'activation']);
export const SEEDS = Object.freeze({ freeze: 49, bomb: 90, multiplier: 11, collapse: 163 });
export const PROFILE = Object.freeze({ freeze: 'freeze', bomb: 'bomb', multiplier: 'multiplier', collapse: 'freeze' });
export const EXPECTED_COPY = Object.freeze({
  freeze: ['冰晶', '冰冻'], bomb: ['熔岩', '炸弹'],
  multiplier: ['金辉', '加倍'], collapse: ['重力紫晶', '超重'],
});

export const MATRIX_CASES = Object.freeze([
  { name: 'deep-normal-desktop-freeze', item: 'freeze', seed: 49, profile: 'freeze', theme: 'deep-tide', reduced: false, language: 'zh-CN', viewport: { width: 1440, height: 900 } },
  { name: 'deep-reduced-mobile-collapse', item: 'collapse', seed: 163, profile: 'freeze', theme: 'deep-tide', reduced: true, language: 'en', viewport: { width: 390, height: 844 } },
  { name: 'mineral-normal-portrait-multiplier', item: 'multiplier', seed: 11, profile: 'multiplier', theme: 'mineral-mist', reduced: false, language: 'en', viewport: { width: 1125, height: 1196 } },
  { name: 'mineral-reduced-mobile-bomb', item: 'bomb', seed: 90, profile: 'bomb', theme: 'mineral-mist', reduced: true, language: 'zh-CN', viewport: { width: 390, height: 844 } },
  { name: 'sunstone-normal-desktop-collapse', item: 'collapse', seed: 163, profile: 'freeze', theme: 'sunstone', reduced: false, language: 'zh-CN', viewport: { width: 1440, height: 900 } },
  { name: 'sunstone-reduced-portrait-freeze', item: 'freeze', seed: 49, profile: 'freeze', theme: 'sunstone', reduced: true, language: 'en', viewport: { width: 1125, height: 1196 } },
]);

export const SOURCE = Object.freeze([
  '.gitattributes', 'README.md', 'evidence-contract.mjs', 'product-fixture.mjs',
  'capture-semantic.mjs', 'capture-matrix.mjs', 'browser-smoke.mjs',
  'client-actions.json', 'write-manifest.mjs', 'verify.mjs',
]);
export const SEMANTIC_PNG = Object.freeze(ITEMS.flatMap((item) => STAGES.map((stage) => `${item}-${stage}.png`)));
export const MATRIX_PNG = Object.freeze(MATRIX_CASES.map(({ name }) => `${name}.png`));
export const CLIENT = Object.freeze([
  'client-smoke/shot-0.png', 'client-smoke/shot-1.png', 'client-smoke/shot-2.png',
  'client-smoke/state-0.json', 'client-smoke/state-1.json', 'client-smoke/state-2.json',
]);
export const OUTPUT = Object.freeze([
  ...SEMANTIC_PNG, ...MATRIX_PNG,
  'material-semantic-audit.json', 'material-matrix-audit.json',
  'browser-report.json', 'ice-provenance-audit.json', ...CLIENT,
]);
export const PRE_REPORT = Object.freeze([...OUTPUT, 'manifest.json']);
export const TERMINAL = Object.freeze(['verification-report.json']);
export const CONTRACT = Object.freeze(['docs/DESIGN.md', 'docs/CURRENT_TASK.md']);
export const PRODUCT_BINDINGS = Object.freeze([
  { kind: 'tree', path: 'src' },
  { kind: 'blob', path: 'src/App.tsx' },
  { kind: 'blob', path: 'src/game/runtime/GameRuntime.ts' },
  { kind: 'blob', path: 'src/game/render/TetrisRenderer.ts' },
  { kind: 'blob', path: 'src/game/render/theme.ts' },
  { kind: 'blob', path: 'src/game/audio/AudioEngine.ts' },
  { kind: 'blob', path: 'src/game/audio/audioAssetCatalog.ts' },
  { kind: 'blob', path: 'src/game/audio/acceptedPlayback.ts' },
  { kind: 'blob', path: 'src/assets/audio/t37/freeze-ice-cubes-hq.ogg' },
  { kind: 'blob', path: 'docs/evidence/t26/phase-d/mutation-scenarios.json' },
  { kind: 'blob', path: 'docs/evidence/t37/bomb-familiar-language-chain-audition-r5b/verification-report.json' },
]);

/** @param {import('node:crypto').BinaryLike} value */
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
/** @param {...string} args */
const gitText = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
/** @param {...string} args */
const gitBytes = (...args) => execFileSync('git', args, { cwd: repo });
/** @param {Buffer} bytes @param {string} path */
const cleanObject = (bytes, path) => execFileSync('git', ['hash-object', '--stdin', `--path=${path}`], {
  cwd: repo, input: bytes, encoding: 'utf8',
}).trim();
/** @param {...string} args */
function gitQuiet(...args) {
  try {
    execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
    return true;
  } catch { return false; }
}

/**
 * Fail closed unless the exact evidence sources and every product input used by
 * the browser are represented by committed Git objects. Generated outputs are
 * deliberately outside this scope so a pre-manifest run can remain untracked.
 * @param {string} [expectedSourceHead]
 * @param {{allowDescendantExecutionHead?: boolean}} [options]
 */
export function assertRuntimeInputBinding(expectedSourceHead, options = {}) {
  const executionHead = gitText('rev-parse', 'HEAD');
  const evidenceSourceHead = expectedSourceHead ?? executionHead;
  if (!/^[0-9a-f]{40}$/u.test(evidenceSourceHead)
    || (options.allowDescendantExecutionHead === true
      ? !gitQuiet('merge-base', '--is-ancestor', evidenceSourceHead, executionHead)
      : executionHead !== evidenceSourceHead)) {
    throw new Error(`Runtime execution HEAD ${executionHead} does not satisfy evidence source ${evidenceSourceHead}.`);
  }

  const sourcePaths = SOURCE.map((path) => `${prefix}${path}`);
  const productFilePaths = PRODUCT_BINDINGS.filter(({ kind, path }) => kind === 'blob' && !path.startsWith('src/')).map(({ path }) => path);
  const statusScope = [...new Set(['src', ...sourcePaths, ...productFilePaths])].sort();
  if (!gitQuiet('diff-index', '--cached', '--quiet', executionHead, '--', ...statusScope)) throw new Error('Runtime input index differs from execution HEAD.');
  if (!gitQuiet('diff-files', '--quiet', '--', ...statusScope)) throw new Error('Runtime tracked worktree differs from the index.');
  const dirty = gitBytes('status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...statusScope);
  if (dirty.length !== 0) {
    throw new Error(`Runtime input scope is dirty: ${dirty.toString('utf8').replace(/\0/gu, '\n').trim()}`);
  }
  const untrackedSrc = gitBytes('ls-files', '--others', '--exclude-standard', '-z', '--', 'src');
  const ignoredSrc = gitBytes('ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', 'src');
  if (untrackedSrc.length !== 0 || ignoredSrc.length !== 0) throw new Error('Runtime src contains untracked or ignored inputs.');

  const sourceBindings = sourcePaths.map((path) => {
    const worktree = readFileSync(join(repo, ...path.split('/')));
    const committed = gitBytes('show', `${evidenceSourceHead}:${path}`);
    const gitObject = gitText('rev-parse', `${evidenceSourceHead}:${path}`);
    const executionObject = gitText('rev-parse', `${executionHead}:${path}`);
    if (!worktree.equals(committed) || executionObject !== gitObject || cleanObject(worktree, path) !== gitObject) {
      throw new Error(`Runtime source does not match ${evidenceSourceHead}:${path}.`);
    }
    const mode = gitText('ls-tree', evidenceSourceHead, '--', path).split(/\s+/u)[0];
    return { path, mode, gitObject, sha256: sha256(worktree), bytes: worktree.length };
  });

  const productTree = gitText('rev-parse', `${BASE}:src`);
  const sourceProductTree = gitText('rev-parse', `${evidenceSourceHead}:src`);
  const executionProductTree = gitText('rev-parse', `${executionHead}:src`);
  if (sourceProductTree !== productTree || executionProductTree !== productTree) {
    throw new Error('Runtime src tree differs from the frozen product tree.');
  }
  const trackedSrc = gitBytes('ls-tree', '-r', '--name-only', '-z', evidenceSourceHead, '--', 'src').toString('utf8').split('\0').filter(Boolean);
  const cleanDigest = createHash('sha256');
  const rawDigest = createHash('sha256');
  for (const path of trackedSrc) {
    const bytes = readFileSync(join(repo, ...path.split('/')));
    const expectedObject = gitText('rev-parse', `${evidenceSourceHead}:${path}`);
    const actualObject = cleanObject(bytes, path);
    if (actualObject !== expectedObject) throw new Error(`Runtime product input does not match ${evidenceSourceHead}:${path}.`);
    cleanDigest.update(path).update('\0').update(actualObject).update('\0');
    rawDigest.update(path).update('\0').update(sha256(bytes)).update('\0');
  }

  const externalProductBindings = productFilePaths.map((path) => {
    const bytes = readFileSync(join(repo, ...path.split('/')));
    const committed = gitBytes('show', `${BASE}:${path}`);
    const gitObject = gitText('rev-parse', `${BASE}:${path}`);
    if (!bytes.equals(committed) || gitText('rev-parse', `${evidenceSourceHead}:${path}`) !== gitObject || cleanObject(bytes, path) !== gitObject) {
      throw new Error(`Runtime product input does not match ${BASE}:${path}.`);
    }
    const mode = gitText('ls-tree', BASE, '--', path).split(/\s+/u)[0];
    return { path, mode, gitObject, sha256: sha256(bytes), bytes: bytes.length };
  });

  return {
    schema: 'tetramorph.t37.material-runtime-input.v2',
    evidenceSourceHead,
    executionHead: evidenceSourceHead,
    executionTree: gitText('rev-parse', `${evidenceSourceHead}^{tree}`),
    productHead: BASE,
    statusScope,
    indexAndWorktree: 'clean',
    sourceBindings,
    product: {
      path: 'src', gitTree: productTree, trackedFiles: trackedSrc.length,
      cleanObjectDigest: cleanDigest.digest('hex'), rawByteDigest: rawDigest.digest('hex'),
      externalBindings: externalProductBindings,
    },
    assertions: {
      executionHeadExact: true,
      sourceAncestorVerified: true,
      indexMatchesHead: true,
      trackedWorktreeMatchesIndex: true,
      sourceRawBytesMatchGit: true,
      srcTreeMatchesProductHead: true,
      noUntrackedOrIgnoredSrc: true,
    },
  };
}

export const STAGE_E_ANCHORS = Object.freeze(['fa3a70e', '581c004', 'ba3b0e3', 'a184952', '1058dbd', '731bf6f', '8e336fe']);
export const ICE = Object.freeze({
  path: 'src/assets/audio/t37/freeze-ice-cubes-hq.ogg',
  sha256: '5a68425717de348ba3d10767618fa4c428a97f26c2e85abc96f45b7bfb35a450',
  bytes: 54564,
  gitBlob: '12e767d2157f3ed2150a743ac2c161f8f99207f1',
  publisher: 'Freesound', pageUrl: 'https://freesound.org/people/sbml/sounds/819779/',
  soundId: 819779, author: 'sbml', title: 'Ice cubes', license: 'CC0',
  runtimeFileKind: 'Freesound-generated HQ Ogg preview',
  windowStartSeconds: 0.19375, windowDurationSeconds: 0.44, windowEndSeconds: 0.63375,
  gain: 0.78, attackSeconds: 0.003, releaseSeconds: 0.012,
  originalFilename: '819779__sbml__ice-cubes.wav', originalSha256: null,
  originalStatus: 'OPEN / login required', substitutionAllowed: false,
});

if (SOURCE.length !== 10 || SEMANTIC_PNG.length !== 20 || MATRIX_PNG.length !== 6
  || OUTPUT.length !== 36 || PRE_REPORT.length !== 37 || TERMINAL.length !== 1) {
  throw new Error('Frozen path-count contract drifted.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--preflight')) {
  const sourceArgument = process.argv.find((value) => value.startsWith('--source-head='));
  const sourceHead = sourceArgument?.slice('--source-head='.length);
  console.log(JSON.stringify(assertRuntimeInputBinding(sourceHead)));
}
