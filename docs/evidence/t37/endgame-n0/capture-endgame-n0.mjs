import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const output = path.resolve('docs/evidence/t37/endgame-n0');
const origin = 'http://127.0.0.1:4217';
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.mkdirSync(output, { recursive: true });

const serverCommand = process.platform === 'win32'
  ? {
      executable: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd run dev -- --host 127.0.0.1 --port 4217 --strictPort'],
    }
  : {
      executable: 'npm',
      args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4217', '--strictPort'],
    };
const server = spawn(serverCommand.executable, serverCommand.args, {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Vite exited before readiness.\n${serverLog}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The owned Vite process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(`Vite did not become ready.\n${serverLog}`);
}

function observe(page, errors) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
}

async function captureLanguage(language, expected) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  observe(page, errors);
  await page.addInitScript((selectedLanguage) => {
    localStorage.clear();
    localStorage.setItem('tetramorph:language:v1', selectedLanguage);
    localStorage.setItem('tetramorph:visual-theme:v1', 'deep-tide');
    localStorage.setItem('tetramorph:reduced-motion:v1', 'off');
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['marathon', 'race', 'sprint', 'endgame']));
  }, language);

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('mode-list').waitFor({ state: 'visible' });
  const home = await page.evaluate(() => ({
    path: location.pathname,
    documentLanguage: document.documentElement.lang,
    modeLabels: [...document.querySelectorAll('[data-testid^="enter-"] strong')].map((node) => node.textContent?.trim()),
    canvasCount: document.querySelectorAll('canvas').length,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }));
  await page.screenshot({ path: path.join(output, expected.homeScreenshot), fullPage: true });

  await page.getByTestId('enter-endgame').click();
  await page.waitForURL(`${origin}/endgames`);
  await page.getByTestId('endgame-library').waitFor({ state: 'visible' });
  await page.locator('.app[data-route-transition="idle"]').waitFor({ state: 'visible' });
  await page.mouse.move(1, 1);
  await page.waitForTimeout(50);
  const library = await page.evaluate(() => ({
    path: location.pathname,
    historyState: history.state,
    titleText: document.querySelector('#library-title')?.textContent ?? null,
    categoryLabels: [...document.querySelectorAll('[role="tab"]')].map((node) => node.textContent?.trim()),
    levelCount: document.querySelectorAll('[data-testid="level-row"]').length,
    selectedLevelId: document.querySelector('[data-testid="level-row"][aria-pressed="true"]')?.getAttribute('data-level-id') ?? null,
    levelListLabel: document.querySelector('[data-testid="level-list"]')?.getAttribute('aria-label') ?? null,
    canvasCount: document.querySelectorAll('canvas').length,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }));
  await page.screenshot({ path: path.join(output, expected.libraryScreenshot), fullPage: true });
  await context.close();

  const canonicalHistory = library.historyState?.tetramorphRoute?.version === 2
    && library.historyState?.tetramorphRoute?.navigation?.screen === 'endgame-library'
    && library.historyState?.tetramorphRoute?.navigation?.mode === 'endgame';
  const passed = home.path === '/'
    && home.documentLanguage === expected.documentLanguage
    && JSON.stringify(home.modeLabels) === JSON.stringify(expected.modeLabels)
    && home.canvasCount === 0
    && !home.horizontalOverflow
    && library.path === '/endgames'
    && library.titleText === expected.title
    && JSON.stringify(library.categoryLabels) === JSON.stringify(expected.categories)
    && library.levelCount === 10
    && library.selectedLevelId === 't3r-shaft-01'
    && library.levelListLabel === expected.levelListLabel
    && library.canvasCount === 0
    && !library.horizontalOverflow
    && canonicalHistory
    && errors.length === 0;
  return { home, library, errors, passed };
}

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const chinese = await captureLanguage('zh-CN', {
    documentLanguage: 'zh-CN',
    modeLabels: ['经典', '生存', '异变', '残局'],
    title: '残局',
    categories: ['入门', '简单', '困难'],
    levelListLabel: '共 50 个残局',
    homeScreenshot: 'home-zh-1440x900.png',
    libraryScreenshot: 'endgame-library-zh-1440x900.png',
  });
  const english = await captureLanguage('en', {
    documentLanguage: 'en',
    modeLabels: ['Classic', 'Survival', 'Mutation', 'Endgame'],
    title: 'Endgame',
    categories: ['Intro', 'Easy', 'Hard'],
    levelListLabel: '50 Endgame levels',
    homeScreenshot: 'home-en-1440x900.png',
    libraryScreenshot: 'endgame-library-en-1440x900.png',
  });
  const report = {
    sourceSha,
    capturedAt: new Date().toISOString(),
    chinese,
    english,
    passed: chinese.passed && english.passed,
  };
  fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(JSON.stringify({ passed: report.passed, sourceSha }));
  if (!report.passed) process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server.exitCode === null) {
    try {
      execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      server.kill();
    }
  }
}
