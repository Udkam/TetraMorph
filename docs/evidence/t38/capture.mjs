import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { openMutation, loadScenarios, scenarioFor, runActions, advanceToActive, snapshot, assertLayout } from '../t37/material-ice-current-head/product-fixture.mjs';

const origin = process.env.T38_ORIGIN ?? 'http://127.0.0.1:4194';
const out = process.env.T38_OUTPUT ?? 'docs/evidence/t38/final';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const scenarios = await loadScenarios();
const report = { source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), scenes: [], errors: [] };
try {
  for (const item of ['freeze', 'collapse', 'bomb', 'multiplier']) {
    const scenario = scenarioFor(scenarios, item);
    const settings = { item, seed: { freeze: 49, collapse: 163, bomb: 90, multiplier: 11 }[item], viewport: { width: 1440, height: 900 }, reduced: false, language: 'zh-CN', theme: 'deep-tide' };
    const { page, context } = await openMutation(browser, origin, settings);
    // Stop presentation time as well as Core time: short frost/gravity cues must
    // not expire while Playwright waits for the screenshot's compositor frame.
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 500));
    page.on('pageerror', (error) => report.errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') report.errors.push(message.text()); });
    try {
      await runActions(page, scenario.actions[0]);
      await advanceToActive(page);
      await runActions(page, scenario.actions[1]);
      await advanceToActive(page);
      await runActions(page, [...scenario.actions[2].slice(0, -1), 'soft-drop']);
      const value = await snapshot(page);
      assertLayout(value, report.errors, item);
      if (value.state?.mutationActiveCarrier?.item !== item) report.errors.push(`${item}: wrong active carrier`);
      await page.screenshot({ path: `${out}/${item}-active.png` });
      report.scenes.push({ item, stage: 'active', state: value.textState, renderer: value.renderer });
      await runActions(page, ['hard-drop']);
      await advanceToActive(page);
      await page.clock.runFor(item === 'bomb' ? 240 : 100);
      await page.screenshot({ path: `${out}/${item}-effect.png` });
      const effect = await snapshot(page);
      if (effect.renderer?.mutationActivation?.item !== item) report.errors.push(`${item}: activation frame missing`);
      report.scenes.push({ item, stage: 'effect', state: effect.textState, renderer: effect.renderer });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ source: report.source, scenes: report.scenes.length, errors: report.errors }));
if (report.errors.length) process.exitCode = 1;
