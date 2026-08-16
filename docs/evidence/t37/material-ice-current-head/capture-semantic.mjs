// @ts-check
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { ITEMS, SEEDS, root } from './evidence-contract.mjs';
import { advanceToActive, assertItemSnapshot, loadScenarios, openMutation, runActions, scenarioFor, snapshot } from './product-fixture.mjs';

const origin = process.argv[2] ?? 'http://127.0.0.1:5193';
const scenarios = await loadScenarios();
const browser = await chromium.launch({ headless: true });
/** @type {any} */
const audit = { schema: 'tetramorph.t37.material-semantic.v1', generatedAt: new Date().toISOString(), origin, browser: await browser.version(), cases: {}, errors: [] };

/** @param {import('playwright').Page} page @param {'freeze'|'bomb'|'multiplier'|'collapse'} item @param {string} stage */
async function capture(page, item, stage) {
  const value = await snapshot(page);
  assertItemSnapshot(value, item, stage, audit.errors);
  const file = `${item}-${stage}.png`;
  const bytes = await page.screenshot({ path: join(root, file), fullPage: true });
  return { file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, value };
}

for (const item of /** @type {Array<'freeze'|'bomb'|'multiplier'|'collapse'>} */ (ITEMS)) {
  const scenario = scenarioFor(scenarios, item);
  const settings = { item, seed: SEEDS[item], theme: 'deep-tide', reduced: false, language: 'zh-CN', viewport: { width: 1440, height: 900 } };
  /** @type {any} */
  const itemAudit = { seed: settings.seed, profile: item === 'collapse' ? 'freeze' : item, stages: {}, observations: [] };
  audit.cases[item] = itemAudit;

  const material = await openMutation(browser, origin, { ...settings, label: `${item}-material` });
  await runActions(material.page, scenario.actions[0]); await advanceToActive(material.page);
  itemAudit.stages.next = await capture(material.page, item, 'next');
  await runActions(material.page, scenario.actions[1]); await advanceToActive(material.page);
  await runActions(material.page, [...scenario.actions[2].slice(0, -1), 'soft-drop']);
  itemAudit.stages['active-ghost'] = await capture(material.page, item, 'active-ghost');
  await runActions(material.page, ['left', 'left', 'hard-drop']); await advanceToActive(material.page);
  itemAudit.stages.settled = await capture(material.page, item, 'settled');
  itemAudit.observations.push(material.observed);
  await material.context.close();

  const clearing = await openMutation(browser, origin, { ...settings, label: `${item}-clear` });
  await runActions(clearing.page, scenario.actions[0]); await advanceToActive(clearing.page);
  await runActions(clearing.page, scenario.actions[1]); await advanceToActive(clearing.page);
  await runActions(clearing.page, [...scenario.actions[2].slice(0, -1), 'soft-drop', 'hard-drop']);
  itemAudit.stages.clear = await capture(clearing.page, item, 'clear');
  itemAudit.observations.push(clearing.observed);
  await clearing.context.close();

  const activated = await openMutation(browser, origin, { ...settings, label: `${item}-activation` });
  await runActions(activated.page, scenario.actions[0]); await advanceToActive(activated.page);
  await runActions(activated.page, scenario.actions[1]); await advanceToActive(activated.page);
  await runActions(activated.page, [...scenario.actions[2].slice(0, -1), 'soft-drop', 'hard-drop']);
  await advanceToActive(activated.page);
  itemAudit.stages.activation = await capture(activated.page, item, 'activation');
  itemAudit.observations.push(activated.observed);
  await activated.context.close();

  for (const observed of itemAudit.observations) {
    audit.errors.push(...observed.consoleErrors.map((/** @type {string} */ value) => `${observed.label}: console: ${value}`));
    audit.errors.push(...observed.pageErrors.map((/** @type {string} */ value) => `${observed.label}: page: ${value}`));
    audit.errors.push(...observed.requestErrors.map((/** @type {string} */ value) => `${observed.label}: request: ${value}`));
  }
}

audit.passed = audit.errors.length === 0;
await writeFile(join(root, 'material-semantic-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
await browser.close();
if (!audit.passed) throw new Error(audit.errors.join('\n'));
