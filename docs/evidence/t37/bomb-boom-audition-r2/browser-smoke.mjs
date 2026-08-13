import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] ?? pathToFileURL(join(root, 'index.html')).href;
const evidenceLabel = process.argv[3] ?? 'file';
if (!/^[a-z0-9-]+$/.test(evidenceLabel)) throw new Error(`Unsafe evidence label: ${evidenceLabel}`);
const screenshotName = `audition-page-${evidenceLabel}.png`;
const reportName = `browser-report-${evidenceLabel}.json`;
const screenshotPath = join(root, screenshotName);
const consoleErrors = [];
const pageErrors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.BOMB_R2_TEST));
const initial = await page.evaluate(() => window.BOMB_R2_TEST.getState());
const normalDefaults = await page.locator('input[name="normal-verdict"]:checked').getAttribute('value');
const chainDefaults = await page.locator('input[name="chain-verdict"]:checked').getAttribute('value');
await page.evaluate(() => window.BOMB_R2_TEST.play('A', 'normal'));
await page.waitForFunction(() => window.BOMB_R2_TEST.getState().active === true);
await page.waitForTimeout(140);
const playingNormal = await page.evaluate(() => window.BOMB_R2_TEST.getState());
await page.click('#stop-all');
await page.evaluate(() => window.BOMB_R2_TEST.play('B', 'chain'));
await page.waitForFunction(() => window.BOMB_R2_TEST.getState().active === true);
await page.waitForTimeout(140);
const playingChain = await page.evaluate(() => window.BOMB_R2_TEST.getState());
await page.click('#stop-all');
await page.check('input[name="normal-verdict"][value="B"]');
await page.check('input[name="chain-verdict"][value="B"]');
await page.check('#boom-check');
await page.check('#chain-check');
await page.click('#record-verdict');
const compared = await page.evaluate(() => window.BOMB_R2_TEST.getState());
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.BOMB_R2_TEST));
const screenshotDefaults = {
  normal: await page.locator('input[name="normal-verdict"]:checked').getAttribute('value'),
  chain: await page.locator('input[name="chain-verdict"]:checked').getAttribute('value'),
  gate: await page.locator('#gate-status').innerText(),
};
await page.screenshot({ path: screenshotPath, fullPage: true });
const screenshot = await readFile(screenshotPath);

const report = {
  generatedAt: new Date().toISOString(),
  url,
  passed:
    initial.candidateCount === 3 &&
    initial.listeningButtons === 6 &&
    normalDefaults === 'none' &&
    chainDefaults === 'none' &&
    playingNormal.active &&
    playingChain.active &&
    Math.abs(playingNormal.decoded.deep.duration - 2.6398125) < 0.02 &&
    Math.abs(playingNormal.decoded.muffled.duration - 5.142854) < 0.02 &&
    compared.gate.includes('生产接入仍关闭') &&
    screenshotDefaults.normal === 'none' &&
    screenshotDefaults.chain === 'none' &&
    screenshotDefaults.gate.includes('未通过') &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0,
  initial,
  normalDefaults,
  chainDefaults,
  playingNormal,
  playingChain,
  compared,
  screenshotDefaults,
  consoleErrors,
  pageErrors,
  screenshot: {
    path: screenshotName,
    bytes: screenshot.length,
    sha256: createHash('sha256').update(screenshot).digest('hex'),
  },
};
await writeFile(join(root, reportName), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ passed: report.passed, consoleErrors: consoleErrors.length, pageErrors: pageErrors.length, screenshotBytes: screenshot.length }));
await browser.close();
if (!report.passed) process.exitCode = 1;
