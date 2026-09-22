import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = Number(process.env.T38_PREVIEW_PORT ?? 4195);
const origin = `http://127.0.0.1:${port}`;
const output = process.env.T38_SMOKE_OUTPUT ?? '.local/t38-release-smoke';
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk.toString('utf8'); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString('utf8'); });
const report = { scenes: [], errors: [] };
let browser;
try {
  for (let attempt = 0; ; attempt += 1) {
    assert(server.exitCode === null && attempt < 100, `Preview did not start: ${serverLog}`);
    if (serverLog.includes(origin)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  for (const [name, viewport, reducedMotion] of [
    ['desktop', { width: 1440, height: 900 }, 'no-preference'],
    ['mobile', { width: 390, height: 844 }, 'reduce'],
    ['landscape', { width: 844, height: 390 }, 'no-preference'],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion, hasTouch: name !== 'desktop' });
    await context.addInitScript(() => {
      localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['marathon', 'race', 'sprint', 'endgame']));
      localStorage.setItem('tetramorph:language:v1', 'en');
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.errors.push(`${name}: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') report.errors.push(`${name}: ${message.text()}`); });
    for (const mode of ['classic', 'survival', 'mutation', 'endgame/t3r-shaft-01']) {
      await page.goto(`${origin}/play/${mode}`, { waitUntil: 'networkidle' });
      await page.getByTestId('game-screen').waitFor();
      await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 10000 });
      assert.equal(await page.locator('canvas').count(), 1);
      assert.equal(await page.evaluate(() => Boolean(window.__TETRAMORPH_QA__)), false, 'DEV hooks leaked to production');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Space');
      if (name !== 'desktop') {
        const board = await page.locator('.board-frame').boundingBox();
        assert(board);
        await page.touchscreen.tap(board.x + board.width / 2, board.y + board.height / 2);
      }
      await page.getByTestId('open-settings').click();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByTestId('action-sheet-backdrop').waitFor({ state: 'detached' });
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert(dimensions.scroll <= dimensions.width + 1, `${name}/${mode}: horizontal overflow`);
      const slug = `${name}-${mode.replaceAll('/', '-')}`;
      await page.screenshot({ path: `${output}/${slug}.png`, fullPage: true });
      report.scenes.push({ name, mode, canvas: 1, ...dimensions });
      const documentTimeOrigin = await page.evaluate(() => performance.timeOrigin);
      await page.getByTestId('exit-game').click();
      await page.getByRole('dialog').locator('.primary-action').click();
      await page.getByTestId('game-screen').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => performance.timeOrigin), documentTimeOrigin, 'Expected SPA exit, not document reload');
      assert.equal(await page.locator('canvas').count(), 0, 'Gameplay canvas survived SPA exit');
    }
    await page.goto(`${origin}/endgames`, { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('canvas').count(), 0);
    await context.close();
  }
  // Storage-denied browsing still boots and discloses its limitation.
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(`storage-denied: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push(`storage-denied: ${message.text()}`); });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.locator('.storage-notice').waitFor();
  await page.screenshot({ path: `${output}/storage-denied.png`, fullPage: true });
  await context.close();
  assert.deepEqual(report.errors, []);
} finally {
  await browser?.close();
  server.kill();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2), 'utf8');
}
console.log(JSON.stringify(report));
