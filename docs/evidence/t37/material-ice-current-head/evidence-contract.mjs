// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  closeSync, existsSync, lstatSync, openSync, readdirSync, readFileSync, readlinkSync, readSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = dirname(fileURLToPath(import.meta.url));
export const repo = join(root, '..', '..', '..', '..');
export const prefix = 'docs/evidence/t37/material-ice-current-head/';
export const BASE = '171181228c0408cfa1bfb1259eb98c29a63efae3';
export const LEGACY_AUTH = '3eb110f546e84c5003c9d2eaa73dfa0f8f9986e9';
export const LEGACY_SOURCE_HEAD = 'c49d0eb9bf4c87ec0c5a0d1e7481a233b861bb41';
export const AUTH = 'f9ce885c654056208f595846907642553488dcea';
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
  'capture-client.mjs', 'client-actions.json', 'write-manifest.mjs', 'verify.mjs',
]);
export const LEGACY_SOURCE = Object.freeze(SOURCE.filter((path) => path !== 'capture-client.mjs'));
export const SOURCE_DELTA = Object.freeze([
  'README.md', 'browser-smoke.mjs', 'evidence-contract.mjs', 'product-fixture.mjs',
  'verify.mjs', 'write-manifest.mjs', 'capture-client.mjs',
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
  'browser-report.json', 'ice-provenance-audit.json', ...CLIENT, 'client-attestation.json',
]);
export const PRE_REPORT = Object.freeze([...OUTPUT, 'manifest.json']);
export const TERMINAL = Object.freeze(['verification-report.json']);
export const CONTRACT = Object.freeze(['docs/DESIGN.md', 'docs/CURRENT_TASK.md']);
export const PRODUCT_BINDINGS = Object.freeze([
  { kind: 'tree', path: 'src' },
  { kind: 'blob', path: '.gitattributes' },
  { kind: 'blob', path: 'index.html' },
  { kind: 'blob', path: 'package.json' },
  { kind: 'blob', path: 'package-lock.json' },
  { kind: 'blob', path: 'vite.config.ts' },
  { kind: 'blob', path: 'tsconfig.json' },
  { kind: 'blob', path: 'tsconfig.app.json' },
  { kind: 'blob', path: 'tsconfig.node.json' },
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

const EXPECTED_RUNTIME_ENVIRONMENT = Object.freeze({
  node: Object.freeze({ locator: 'process.execPath', version: 'v24.12.0', platform: 'win32', arch: 'x64', bytes: 89_935_872, sha256: '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8' }),
  git: Object.freeze({ locator: 'PATH:git.exe (byte-verified)', version: 'git version 2.51.0.windows.2', launcher: Object.freeze({ bytes: 46_480, sha256: 'ee3d2a38093c3680745a5c973488f5bb78a16f010145d5cdc7470a7395c9e7e8' }), runtime: Object.freeze({ bytes: 4_284_816, sha256: 'e996432581a70df2e7aaac5db71e3811ec0daa7f93a8ba73fe6db6f9941f4bf9' }) }),
  repositoryModules: Object.freeze({ locator: 'repository:node_modules', excludedRootEntries: Object.freeze(['.bin', '.cache', '.vite*']), files: 9_453, directories: 704, symlinks: 0, bytes: 274_520_862, sha256: '823bd6ae44ea3e9a2304dae725db6b007bab18e8f7a850efea3320d5d0212a60' }),
  prescribedClient: Object.freeze({ locator: 'codex-home:skills/develop-web-game/scripts/web_game_playwright_client.js', bytes: 9_963, sha256: 'e95c3bcbdc0d15eb08fd3a6021283ec32f715b51f1e5847d3db20df526be5996' }),
  prescribedClientModules: Object.freeze({ locator: 'codex-home:skills/develop-web-game/node_modules', excludedRootEntries: Object.freeze(['.bin', '.cache', '.vite*']), files: 169, directories: 36, symlinks: 0, bytes: 17_577_700, sha256: '14a12c88915605fbb3ff6df60e70ad771e189516b262c144433a9ee9a77a32d3' }),
  chromium: Object.freeze({ locator: 'playwright:chromium-1228/chrome-win64', executableLocator: 'playwright.chromium.executablePath()', revision: '1228', version: '149.0.7827.55', files: 310, directories: 9, symlinks: 0, bytes: 436_026_456, sha256: 'fea0ab3c989305aa358a97bd8b32fa37d16115c52baa42629443b7f88c0690d1' }),
  versions: Object.freeze({ vite: '8.1.4', playwright: '1.61.1', prescribedClientPlaywright: '1.61.1' }),
});
const POSTCSS_CONFIG_NAMES = Object.freeze([
  'postcss.config.js', 'postcss.config.mjs', 'postcss.config.cjs', 'postcss.config.ts', 'postcss.config.mts', 'postcss.config.cts',
  '.postcssrc', '.postcssrc.json', '.postcssrc.yaml', '.postcssrc.yml', '.postcssrc.ts', '.postcssrc.cts', '.postcssrc.mts',
  '.postcssrc.js', '.postcssrc.cjs', '.postcssrc.mjs',
]);
const ABSENT_RUNTIME_ROOT_INPUTS = Object.freeze([
  '.env', '.env.local', '.env.development', '.env.development.local',
  'vite.config.js', 'vite.config.mjs', 'vite.config.cjs', 'vite.config.mts', 'vite.config.cts',
  ...POSTCSS_CONFIG_NAMES, 'public',
]);
const ABSENT_RUNTIME_ANCESTOR_INPUTS = Object.freeze(['package.json', ...POSTCSS_CONFIG_NAMES]);
const prescribedClientPath = join(homedir(), '.codex', 'skills', 'develop-web-game', 'scripts', 'web_game_playwright_client.js');
const prescribedClientModulesPath = join(homedir(), '.codex', 'skills', 'develop-web-game', 'node_modules');
/** @type {string | null} */
let verifiedGitExecutable = null;
// The committed semantic and browser audits intentionally retain exact DOM and
// network observations and can exceed Node's 1 MiB child-process default.
const GIT_OUTPUT_MAX_BUFFER = 64 * 1024 * 1024;

/** @param {import('node:crypto').BinaryLike} value */
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function requireVerifiedGit() {
  if (verifiedGitExecutable === null) assertRuntimeEnvironment();
  if (verifiedGitExecutable === null) throw new Error('Git executable was not verified.');
  return verifiedGitExecutable;
}
/** @param {...string} args */
export const runGitText = (...args) => execFileSync(requireVerifiedGit(), args, {
  cwd: repo, encoding: 'utf8', maxBuffer: GIT_OUTPUT_MAX_BUFFER,
}).trim();
/** @param {...string} args */
export const runGitBytes = (...args) => execFileSync(requireVerifiedGit(), args, {
  cwd: repo, maxBuffer: GIT_OUTPUT_MAX_BUFFER,
});
/** @param {Buffer} bytes @param {string} path */
export const cleanGitObject = (bytes, path) => execFileSync(requireVerifiedGit(), ['hash-object', '--stdin', `--path=${path}`], {
  cwd: repo, input: bytes, encoding: 'utf8',
}).trim();
const PRODUCT_TEXT_EXTENSIONS = new Set(['.css', '.html', '.json', '.ts', '.tsx']);
const PRODUCT_BINARY_EXTENSIONS = new Set(['.ogg', '.wav']);
/** @param {Buffer} bytes */
function canonicalCrlf(bytes) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error('Committed product text is not valid UTF-8.');
  return Buffer.from(text.replace(/(?<!\r)\n/gu, '\r\n'), 'utf8');
}
/** @param {Buffer} worktree @param {Buffer} committed @param {string} path */
function exactProductRawForm(worktree, committed, path) {
  const extension = extname(path).toLowerCase();
  if (PRODUCT_BINARY_EXTENSIONS.has(extension)) return worktree.equals(committed) ? 'git-blob' : null;
  if (!PRODUCT_TEXT_EXTENSIONS.has(extension) && path !== '.gitattributes') throw new Error(`Unclassified frozen product input extension: ${path}.`);
  if (worktree.equals(committed)) return 'git-blob';
  if (worktree.equals(canonicalCrlf(committed))) return 'canonical-crlf';
  const text = worktree.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(worktree) || text.charCodeAt(0) === 0xfeff || /\r(?!\n)/u.test(text)) return null;
  const normalized = Buffer.from(text.replace(/\r\n/gu, '\n'), 'utf8');
  return normalized.equals(committed) && text.includes('\r\n') && /(?<!\r)\n/u.test(text) ? 'mixed-lf-crlf' : null;
}
/** @param {ReturnType<typeof createHash>} digest @param {string} path @param {number} size */
function updateDigestWithFile(digest, path, size) {
  const descriptor = openSync(path, 'r');
  const chunk = Buffer.allocUnsafe(1024 * 1024);
  try {
    let offset = 0;
    while (offset < size) {
      const length = readSync(descriptor, chunk, 0, Math.min(chunk.length, size - offset), offset);
      if (length <= 0) throw new Error(`Unexpected EOF while binding ${path}.`);
      digest.update(chunk.subarray(0, length));
      offset += length;
    }
  } finally { closeSync(descriptor); }
}
/** @param {string} path */
function sha256File(path) {
  const stat = lstatSync(path);
  if (!stat.isFile()) throw new Error(`Runtime binding is not a file: ${path}.`);
  const digest = createHash('sha256');
  updateDigestWithFile(digest, path, stat.size);
  return { path, bytes: stat.size, sha256: digest.digest('hex') };
}
/** @param {string} directory @param {boolean} excludeMutableRootCaches */
function directoryDigest(directory, excludeMutableRootCaches) {
  const digest = createHash('sha256');
  let files = 0; let directories = 0; let symlinks = 0; let bytes = 0;
  /** @param {string} absolute @param {string} relative */
  const visit = (absolute, relative) => {
    const entries = readdirSync(absolute, { withFileTypes: true }).sort((left, right) => (
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    ));
    for (const entry of entries) {
      if (excludeMutableRootCaches && relative === ''
        && (entry.name === '.bin' || entry.name === '.cache' || entry.name.startsWith('.vite'))) continue;
      const childRelative = relative === '' ? entry.name : `${relative}/${entry.name}`;
      const childAbsolute = join(absolute, entry.name);
      const stat = lstatSync(childAbsolute);
      if (stat.isSymbolicLink()) {
        digest.update('L\0').update(childRelative).update('\0').update(readlinkSync(childAbsolute, 'utf8')).update('\0');
        symlinks += 1;
      } else if (stat.isDirectory()) {
        digest.update('D\0').update(childRelative).update('\0');
        directories += 1;
        visit(childAbsolute, childRelative);
      } else if (stat.isFile()) {
        digest.update('F\0').update(childRelative).update('\0').update(String(stat.size)).update('\0');
        updateDigestWithFile(digest, childAbsolute, stat.size);
        digest.update('\0');
        files += 1; bytes += stat.size;
      } else throw new Error(`Unsupported runtime binding entry: ${childAbsolute}.`);
    }
  };
  visit(directory, '');
  return { path: directory, files, directories, symlinks, bytes, sha256: digest.digest('hex') };
}
/** @param {Record<string, any>} actual @param {Record<string, any>} expected @param {string} label */
function assertExactBinding(actual, expected, label) {
  for (const key of ['files', 'directories', 'symlinks', 'bytes', 'sha256']) {
    if (actual[key] !== expected[key]) throw new Error(`${label} ${key} differs from the frozen runtime environment.`);
  }
}
function discoverGitExecutable() {
  const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
  if (typeof systemRoot !== 'string' || systemRoot.length === 0) throw new Error('SystemRoot is unavailable for Git discovery.');
  const whereExecutable = join(systemRoot, 'System32', 'where.exe');
  const candidates = execFileSync(whereExecutable, ['git.exe'], { cwd: repo, encoding: 'utf8' })
    .split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
  for (const candidate of candidates) {
    try {
      const launcher = sha256File(candidate);
      if (launcher.bytes !== EXPECTED_RUNTIME_ENVIRONMENT.git.launcher.bytes
        || launcher.sha256 !== EXPECTED_RUNTIME_ENVIRONMENT.git.launcher.sha256) continue;
      const version = execFileSync(candidate, ['--version'], { cwd: repo, encoding: 'utf8' }).trim();
      const execPath = execFileSync(candidate, ['--exec-path'], { cwd: repo, encoding: 'utf8' }).trim();
      const runtimePath = resolve(execPath, '..', '..', 'bin', 'git.exe');
      const runtime = sha256File(runtimePath);
      if (version !== EXPECTED_RUNTIME_ENVIRONMENT.git.version
        || runtime.bytes !== EXPECTED_RUNTIME_ENVIRONMENT.git.runtime.bytes
        || runtime.sha256 !== EXPECTED_RUNTIME_ENVIRONMENT.git.runtime.sha256) continue;
      return { executable: resolve(candidate), version, launcher, runtime };
    } catch { /* reject this PATH candidate */ }
  }
  throw new Error('No PATH Git executable matches the frozen byte/version identity.');
}
export function assertRuntimeEnvironment() {
  const restrictedEnvironment = Object.keys(process.env).filter((key) => (
    key.toUpperCase() === 'NODE_OPTIONS' || key.toUpperCase() === 'NODE_PATH' || key.toUpperCase() === 'NODE_ENV'
      || key.toUpperCase() === 'VP_RUN_NODE_CLIENT_PATH'
      || key.toUpperCase().startsWith('GIT_') || key.toUpperCase().startsWith('PLAYWRIGHT_') || key.toUpperCase().startsWith('VITE_')
  )).sort();
  if (process.execArgv.length !== 0 || restrictedEnvironment.length !== 0) {
    throw new Error(`Runtime process injection surface is not empty: ${[...process.execArgv, ...restrictedEnvironment].join(',')}.`);
  }
  for (const relative of ABSENT_RUNTIME_ROOT_INPUTS) {
    if (existsSync(join(repo, relative))) throw new Error(`Unexpected Vite root input exists: ${relative}.`);
  }
  const ancestorRoots = [];
  for (let ancestor = dirname(repo); ; ancestor = dirname(ancestor)) {
    ancestorRoots.push(ancestor);
    if (dirname(ancestor) === ancestor) break;
  }
  const absentAncestorInputs = [];
  for (const [index, ancestor] of ancestorRoots.entries()) {
    for (const relative of ABSENT_RUNTIME_ANCESTOR_INPUTS) {
      if (existsSync(join(ancestor, relative))) throw new Error(`Unexpected ancestor PostCSS input exists at level ${index + 1}: ${relative}.`);
      absentAncestorInputs.push(`repository-ancestor-${index + 1}:${relative}`);
    }
  }
  const node = sha256File(process.execPath);
  if (process.version !== EXPECTED_RUNTIME_ENVIRONMENT.node.version || process.platform !== EXPECTED_RUNTIME_ENVIRONMENT.node.platform
    || process.arch !== EXPECTED_RUNTIME_ENVIRONMENT.node.arch || node.bytes !== EXPECTED_RUNTIME_ENVIRONMENT.node.bytes
    || node.sha256 !== EXPECTED_RUNTIME_ENVIRONMENT.node.sha256) throw new Error('Node runtime differs from the frozen environment.');
  const verifiedGit = discoverGitExecutable();
  verifiedGitExecutable = verifiedGit.executable;
  const repositoryModules = directoryDigest(join(repo, 'node_modules'), true);
  assertExactBinding(repositoryModules, EXPECTED_RUNTIME_ENVIRONMENT.repositoryModules, 'Repository node_modules');
  const prescribedClient = sha256File(prescribedClientPath);
  if (prescribedClient.bytes !== EXPECTED_RUNTIME_ENVIRONMENT.prescribedClient.bytes
    || prescribedClient.sha256 !== EXPECTED_RUNTIME_ENVIRONMENT.prescribedClient.sha256) throw new Error('Prescribed client script differs from the frozen environment.');
  const prescribedClientModules = directoryDigest(prescribedClientModulesPath, true);
  assertExactBinding(prescribedClientModules, EXPECTED_RUNTIME_ENVIRONMENT.prescribedClientModules, 'Prescribed-client node_modules');
  const repositoryRequire = createRequire(import.meta.url);
  const clientRequire = createRequire(prescribedClientPath);
  const repositoryPlaywright = repositoryRequire('playwright');
  const clientPlaywright = clientRequire('playwright');
  const repositoryChromiumExecutable = repositoryPlaywright.chromium.executablePath();
  const clientChromiumExecutable = clientPlaywright.chromium.executablePath();
  if (resolve(repositoryChromiumExecutable).toLowerCase() !== resolve(clientChromiumExecutable).toLowerCase()) {
    throw new Error('Repository and prescribed-client Playwright resolve different Chromium executables.');
  }
  const chromium = directoryDigest(dirname(repositoryChromiumExecutable), false);
  assertExactBinding(chromium, EXPECTED_RUNTIME_ENVIRONMENT.chromium, 'Chromium runtime');
  const versions = {
    vite: repositoryRequire('vite/package.json').version,
    playwright: repositoryRequire('playwright/package.json').version,
    prescribedClientPlaywright: clientRequire('playwright/package.json').version,
  };
  if (JSON.stringify(versions) !== JSON.stringify(EXPECTED_RUNTIME_ENVIRONMENT.versions)
    ) throw new Error('Vite or Playwright resolution differs from the frozen environment.');
  const browsers = JSON.parse(readFileSync(join(repo, 'node_modules', 'playwright-core', 'browsers.json'), 'utf8')).browsers;
  const chromiumDescriptor = browsers.find((/** @type {any} */ entry) => entry?.name === 'chromium');
  if (chromiumDescriptor?.revision !== EXPECTED_RUNTIME_ENVIRONMENT.chromium.revision
    || chromiumDescriptor?.browserVersion !== EXPECTED_RUNTIME_ENVIRONMENT.chromium.version) {
    throw new Error('Chromium revision/version differs from the frozen Playwright descriptor.');
  }
  return {
    node: { locator: EXPECTED_RUNTIME_ENVIRONMENT.node.locator, bytes: node.bytes, sha256: node.sha256, version: process.version, platform: process.platform, arch: process.arch },
    git: { locator: EXPECTED_RUNTIME_ENVIRONMENT.git.locator, version: verifiedGit.version,
      launcher: { bytes: verifiedGit.launcher.bytes, sha256: verifiedGit.launcher.sha256 },
      runtime: { bytes: verifiedGit.runtime.bytes, sha256: verifiedGit.runtime.sha256 } },
    repositoryModules: { locator: EXPECTED_RUNTIME_ENVIRONMENT.repositoryModules.locator, files: repositoryModules.files, directories: repositoryModules.directories,
      symlinks: repositoryModules.symlinks, bytes: repositoryModules.bytes, sha256: repositoryModules.sha256,
      excludedRootEntries: [...EXPECTED_RUNTIME_ENVIRONMENT.repositoryModules.excludedRootEntries] },
    prescribedClient: { locator: EXPECTED_RUNTIME_ENVIRONMENT.prescribedClient.locator, bytes: prescribedClient.bytes, sha256: prescribedClient.sha256 },
    prescribedClientModules: { locator: EXPECTED_RUNTIME_ENVIRONMENT.prescribedClientModules.locator, files: prescribedClientModules.files,
      directories: prescribedClientModules.directories, symlinks: prescribedClientModules.symlinks, bytes: prescribedClientModules.bytes,
      sha256: prescribedClientModules.sha256, excludedRootEntries: [...EXPECTED_RUNTIME_ENVIRONMENT.prescribedClientModules.excludedRootEntries] },
    chromium: { locator: EXPECTED_RUNTIME_ENVIRONMENT.chromium.locator, executableLocator: EXPECTED_RUNTIME_ENVIRONMENT.chromium.executableLocator,
      files: chromium.files, directories: chromium.directories, symlinks: chromium.symlinks, bytes: chromium.bytes, sha256: chromium.sha256,
      revision: chromiumDescriptor.revision, version: chromiumDescriptor.browserVersion },
    versions,
    processInjection: { execArgv: [], restrictedEnvironment: [] },
    absentRootInputs: [...ABSENT_RUNTIME_ROOT_INPUTS],
    absentAncestorInputs,
    viteOptimizerPolicy: { force: true, mutableCacheExcludedFromIdentity: true },
  };
}
export function getPrescribedClientPath() { return prescribedClientPath; }
/** @param {...string} args */
function gitQuiet(...args) {
  try {
    execFileSync(requireVerifiedGit(), args, { cwd: repo, stdio: 'ignore' });
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
  const environment = assertRuntimeEnvironment();
  const executionHead = runGitText('rev-parse', 'HEAD');
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
  const dirty = runGitBytes('status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...statusScope);
  if (dirty.length !== 0) {
    throw new Error(`Runtime input scope is dirty: ${dirty.toString('utf8').replace(/\0/gu, '\n').trim()}`);
  }
  const untrackedSrc = runGitBytes('ls-files', '--others', '--exclude-standard', '-z', '--', 'src');
  const ignoredSrc = runGitBytes('ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', 'src');
  if (untrackedSrc.length !== 0 || ignoredSrc.length !== 0) throw new Error('Runtime src contains untracked or ignored inputs.');

  const sourceBindings = sourcePaths.map((path) => {
    const worktree = readFileSync(join(repo, ...path.split('/')));
    const committed = runGitBytes('show', `${evidenceSourceHead}:${path}`);
    const gitObject = runGitText('rev-parse', `${evidenceSourceHead}:${path}`);
    const executionObject = runGitText('rev-parse', `${executionHead}:${path}`);
    if (!worktree.equals(committed) || executionObject !== gitObject || cleanGitObject(worktree, path) !== gitObject) {
      throw new Error(`Runtime source does not match ${evidenceSourceHead}:${path}.`);
    }
    const mode = runGitText('ls-tree', evidenceSourceHead, '--', path).split(/\s+/u)[0];
    return { path, mode, gitObject, sha256: sha256(worktree), bytes: worktree.length };
  });

  const productTree = runGitText('rev-parse', `${BASE}:src`);
  const sourceProductTree = runGitText('rev-parse', `${evidenceSourceHead}:src`);
  const executionProductTree = runGitText('rev-parse', `${executionHead}:src`);
  if (sourceProductTree !== productTree || executionProductTree !== productTree) {
    throw new Error('Runtime src tree differs from the frozen product tree.');
  }
  const trackedSrc = runGitBytes('ls-tree', '-r', '--name-only', '-z', evidenceSourceHead, '--', 'src').toString('utf8').split('\0').filter(Boolean);
  const cleanDigest = createHash('sha256');
  const rawDigest = createHash('sha256');
  const rawForms = { gitBlob: 0, canonicalCrlf: 0, mixedLfCrlf: 0 };
  for (const path of trackedSrc) {
    const bytes = readFileSync(join(repo, ...path.split('/')));
    const committed = runGitBytes('show', `${evidenceSourceHead}:${path}`);
    const expectedObject = runGitText('rev-parse', `${evidenceSourceHead}:${path}`);
    const actualObject = cleanGitObject(bytes, path);
    const rawForm = exactProductRawForm(bytes, committed, path);
    if (rawForm === null || actualObject !== expectedObject) throw new Error(`Runtime product input does not match ${evidenceSourceHead}:${path}.`);
    if (rawForm === 'git-blob') rawForms.gitBlob += 1;
    else if (rawForm === 'canonical-crlf') rawForms.canonicalCrlf += 1;
    else rawForms.mixedLfCrlf += 1;
    cleanDigest.update(path).update('\0').update(actualObject).update('\0');
    rawDigest.update(path).update('\0').update(sha256(bytes)).update('\0');
  }

  const externalProductBindings = productFilePaths.map((path) => {
    const bytes = readFileSync(join(repo, ...path.split('/')));
    const committed = runGitBytes('show', `${BASE}:${path}`);
    const gitObject = runGitText('rev-parse', `${BASE}:${path}`);
    const rawForm = exactProductRawForm(bytes, committed, path);
    if (rawForm === null || runGitText('rev-parse', `${evidenceSourceHead}:${path}`) !== gitObject || cleanGitObject(bytes, path) !== gitObject) {
      throw new Error(`Runtime product input does not match ${BASE}:${path}.`);
    }
    const mode = runGitText('ls-tree', BASE, '--', path).split(/\s+/u)[0];
    return { path, mode, gitObject, rawForm, sha256: sha256(bytes), bytes: bytes.length };
  });

  return {
    schema: 'tetramorph.t37.material-runtime-input.v3',
    evidenceSourceHead,
    validatedSourceTree: runGitText('rev-parse', `${evidenceSourceHead}^{tree}`),
    executionPolicy: 'source HEAD or a verified linear descendant; containing audit binds its actual phase HEAD',
    productHead: BASE,
    statusScope,
    indexAndWorktree: 'clean',
    sourceBindings,
    product: {
      path: 'src', gitTree: productTree, trackedFiles: trackedSrc.length,
      cleanObjectDigest: cleanDigest.digest('hex'), rawByteDigest: rawDigest.digest('hex'), rawForms,
      externalBindings: externalProductBindings,
    },
    environment,
    assertions: {
      sourceHeadIsExecutionAncestor: true,
      sourceObjectsExact: true,
      indexMatchesHead: true,
      trackedWorktreeMatchesIndex: true,
      sourceRawBytesMatchGit: true,
      productRawBytesMatchGitOrCanonicalEol: true,
      srcTreeMatchesProductHead: true,
      noUntrackedOrIgnoredSrc: true,
      productRootInputsExact: true,
      runtimeEnvironmentExact: true,
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

if (SOURCE.length !== 11 || SEMANTIC_PNG.length !== 20 || MATRIX_PNG.length !== 6
  || OUTPUT.length !== 37 || PRE_REPORT.length !== 38 || TERMINAL.length !== 1) {
  throw new Error('Frozen path-count contract drifted.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--environment-only')) console.log(JSON.stringify(assertRuntimeEnvironment()));
  else if (process.argv.includes('--preflight')) {
    const sourceArgument = process.argv.find((value) => value.startsWith('--source-head='));
    const sourceHead = sourceArgument?.slice('--source-head='.length);
    console.log(JSON.stringify(assertRuntimeInputBinding(sourceHead)));
  }
}
