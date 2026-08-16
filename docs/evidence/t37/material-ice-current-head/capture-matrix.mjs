// @ts-check
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { MATRIX_CASES, assertRuntimeInputBinding, root } from './evidence-contract.mjs';
import { advanceToActive, assertItemSnapshot, loadScenarios, openMutation, runActions, scenarioFor, snapshot } from './product-fixture.mjs';

const origin = process.argv[2] ?? 'http://127.0.0.1:5193';
const runtimeInput = assertRuntimeInputBinding();
const scenarios = await loadScenarios();
const browser = await chromium.launch({ headless: true });
/** @type {any} */
const audit = { schema: 'tetramorph.t37.material-matrix.v2', generatedAt: new Date().toISOString(), origin, browser: await browser.version(), runtimeInput, cases: {}, errors: [] };

try {
  for (const entry of MATRIX_CASES) {
    const opened = await openMutation(browser, origin, { ...entry, label: entry.name });
    try {
      const scenario = scenarioFor(scenarios, /** @type {'freeze'|'bomb'|'multiplier'|'collapse'} */ (entry.item));
      await runActions(opened.page, scenario.actions[0]); await advanceToActive(opened.page);
      await runActions(opened.page, scenario.actions[1]); await advanceToActive(opened.page);
      await runActions(opened.page, [...scenario.actions[2].slice(0, -1), 'soft-drop']);
      const value = await snapshot(opened.page);
      assertItemSnapshot(value, /** @type {'freeze'|'bomb'|'multiplier'|'collapse'} */ (entry.item), 'active-ghost', audit.errors);
      if (value.root.language !== entry.language || value.root.theme !== entry.theme || value.root.reducedMotion !== String(entry.reduced)) {
        audit.errors.push(`${entry.name}: root settings mismatch`);
      }
      const file = `${entry.name}.png`;
      const bytes = await opened.page.screenshot({ path: join(root, file), fullPage: true });
      audit.cases[entry.name] = { contract: entry, file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, value, observations: opened.observed };
      audit.errors.push(...opened.observed.consoleErrors.map((/** @type {string} */ item) => `${entry.name}: console: ${item}`));
      audit.errors.push(...opened.observed.pageErrors.map((/** @type {string} */ item) => `${entry.name}: page: ${item}`));
      audit.errors.push(...opened.observed.requestErrors.map((/** @type {string} */ item) => `${entry.name}: request: ${item}`));
    } finally { await opened.context.close(); }
  }

  audit.coverage = {
    themes: [...new Set(MATRIX_CASES.map(({ theme }) => theme))].sort(),
    motion: [...new Set(MATRIX_CASES.map(({ reduced }) => reduced ? 'reduced' : 'full'))].sort(),
    languages: [...new Set(MATRIX_CASES.map(({ language }) => language))].sort(),
    viewports: [...new Set(MATRIX_CASES.map(({ viewport }) => `${viewport.width}x${viewport.height}`))].sort(),
    items: [...new Set(MATRIX_CASES.map(({ item }) => item))].sort(),
  };
  const runtimeInputAfter = assertRuntimeInputBinding(runtimeInput.evidenceSourceHead);
  if (JSON.stringify(runtimeInputAfter) !== JSON.stringify(runtimeInput)) throw new Error('Runtime input binding changed during matrix capture.');
  audit.passed = audit.errors.length === 0;
  await writeFile(join(root, 'material-matrix-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (!audit.passed) throw new Error(audit.errors.join('\n'));
} finally { await browser.close(); }
