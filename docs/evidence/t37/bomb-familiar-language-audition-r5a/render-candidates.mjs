import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const repository = join(root, '..', '..', '..', '..');
const rel = (path) => relative(repository, path).replaceAll('\\', '/');
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const AUTHORIZATION_SHA = '265b697a1707b89a128fdfe9f15b22076b02d587';
const PINNED_PLAYWRIGHT_VERSION = '1.61.1';
const PINNED_CHROMIUM_VERSION = '149.0.7827.55';
const CANDIDATES = ['A', 'B', 'C'];

function assertSourceRange() {
  git('merge-base', '--is-ancestor', AUTHORIZATION_SHA, 'HEAD');
  const prefix = 'docs/evidence/t37/bomb-familiar-language-audition-r5a/';
  const paths = git('diff', '--name-only', `${AUTHORIZATION_SHA}..HEAD`).split(/\r?\n/u).filter(Boolean);
  const escaped = paths.filter((path) => !path.startsWith(prefix));
  if (escaped.length) throw new Error(`R5A source range escaped its directory: ${escaped.join(', ')}`);
}

export async function renderCandidatesInPinnedBrowser(url) {
  assertSourceRange();
  const playwrightVersion = require('playwright/package.json').version;
  if (playwrightVersion !== PINNED_PLAYWRIGHT_VERSION) {
    throw new Error(`Expected Playwright ${PINNED_PLAYWRIGHT_VERSION}; found ${playwrightVersion}.`);
  }
  const browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  if (browserVersion !== PINNED_CHROMIUM_VERSION) {
    await browser.close();
    throw new Error(`Expected Chromium ${PINNED_CHROMIUM_VERSION}; found ${browserVersion}.`);
  }
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__R5A_RENDER_READY__ === true, null, { timeout: 20_000 });
    const report = await page.evaluate(() => window.__R5A_RENDER__.renderAll());
    if (errors.length) throw new Error(`R5A render harness browser errors: ${errors.join(' | ')}`);
    if (report.sampleRate !== 48_000 || report.preRollFrames !== 24_000 || report.analysisFrames !== 8_640) {
      throw new Error('R5A render harness window drifted.');
    }
    const stems = {};
    for (const id of CANDIDATES) {
      const candidate = report.candidates[id];
      const bytes = Buffer.from(candidate.wavBase64, 'base64');
      if (!candidate.deterministic || !candidate.leftRightIdentical) throw new Error(`${id} is not deterministic mono.`);
      if (candidate.runHashes[0] !== candidate.runHashes[1] || candidate.runHashes[0] !== sha256(bytes)) {
        throw new Error(`${id} render hashes do not bind the returned bytes.`);
      }
      if (candidate.runByteLengths[0] !== 17_324 || candidate.runByteLengths[1] !== 17_324) {
        throw new Error(`${id} WAV byte length drifted.`);
      }
      if (candidate.reservedSources !== ({ A: 4, B: 3, C: 1 })[id]
        || candidate.scheduledSources !== candidate.reservedSources) {
        throw new Error(`${id} atomic source reservation drifted.`);
      }
      stems[id] = { bytes, ...candidate, wavBase64: undefined };
    }
    return { playwrightVersion, browserVersion, errors, report, stems };
  } finally {
    await browser.close();
  }
}

async function main() {
  const url = process.argv[2]
    ?? 'http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/render-harness.html';
  const result = await renderCandidatesInPinnedBrowser(url);
  const assets = join(root, 'assets');
  await mkdir(assets, { recursive: true });
  await Promise.all(CANDIDATES.map((id) => writeFile(join(assets, `${id}.wav`), result.stems[id].bytes)));
  console.log(JSON.stringify({
    wrote: CANDIDATES.map((id) => rel(join(assets, `${id}.wav`))),
    playwrightVersion: result.playwrightVersion,
    browserVersion: result.browserVersion,
    candidates: Object.fromEntries(CANDIDATES.map((id) => [id, {
      sha256: result.stems[id].wavSha256,
      deterministic: result.stems[id].deterministic,
      leftRightIdentical: result.stems[id].leftRightIdentical,
      sourceCount: result.stems[id].scheduledSources,
    }])),
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
