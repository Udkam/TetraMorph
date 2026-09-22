import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
const errors = [];
const out = '.local/t38-review-check';
await mkdir(out, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto('http://127.0.0.1:4194/docs/evidence/t38/', { waitUntil: 'networkidle' });
  for (const cue of ['drop', 'bomb', 'chain', 'freeze', 'collapse', 'multiplier', 'four']) {
    await page.locator(`[data-cue="${cue}"]`).click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('正在播放'));
    await page.locator('#stop').click();
  }
  assert(await page.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)));
  await page.screenshot({ path: `${out}/review.png`, fullPage: true });
  await page.goto('http://127.0.0.1:4194/docs/evidence/t37/bomb-block-r5c-product-audition/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__R5C_READY__);
  await page.locator('#normal').click();
  await page.waitForTimeout(800);
  await page.locator('#chain').click();
  await page.waitForTimeout(1000);
  await page.locator('#stop').click();
  assert.equal(await page.locator('canvas').count(), 1);
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
await writeFile(`${out}/report.json`, JSON.stringify({ cues: 7, productBombScenes: 2, errors }, null, 2), 'utf8');
console.log(JSON.stringify({ cues: 7, productBombScenes: 2, errors }));
