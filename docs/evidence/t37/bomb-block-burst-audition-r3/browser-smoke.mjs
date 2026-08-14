import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = dirname(fileURLToPath(import.meta.url))
const url = process.argv[2] ?? pathToFileURL(join(root, 'index.html')).href
const label = process.argv[3] ?? 'file'
const errors = []
const pageErrors = []

function observe(page) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
}

async function waitReady(page) {
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__BOMB_R3_READY__ === true, null, { timeout: 20_000 })
}

const browser = await chromium.launch({ headless: true })
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
observe(desktop)
await waitReady(desktop)
const initial = await desktop.evaluate(() => window.BOMB_R3_TEST.getState())

for (const button of await desktop.locator('[data-play]').all()) {
  await button.click()
  await desktop.waitForTimeout(70)
  await desktop.locator('#stop-all').click()
}
for (const button of await desktop.locator('[data-reference]').all()) {
  await button.click()
  await desktop.waitForTimeout(70)
  await desktop.locator('#stop-all').click()
}
for (const button of await desktop.locator('[data-context]').all()) {
  await button.click()
  await desktop.waitForTimeout(70)
  await desktop.locator('#stop-all').click()
}

await desktop.locator('input[name="normal-verdict"][value="A"]').check()
await desktop.locator('input[name="chain-verdict"][value="A"]').check()
await desktop.locator('#record-verdict').click()
const matchingPair = await desktop.evaluate(() => window.BOMB_R3_TEST.getState())
await desktop.locator('input[name="chain-verdict"][value="B"]').check()
await desktop.locator('#record-verdict').click()
const crossPair = await desktop.evaluate(() => window.BOMB_R3_TEST.getState())
await desktop.locator('input[name="normal-verdict"][value="reject"]').check()
await desktop.locator('input[name="chain-verdict"][value="reject"]').check()
await desktop.locator('#record-verdict').click()

for (let index = 0; index < 12; index += 1) {
  await desktop.locator('[data-play]').nth(index % 6).click()
}
await desktop.locator('#stop-all').click()
await desktop.waitForTimeout(120)
const stopped = await desktop.evaluate(() => window.BOMB_R3_TEST.getState())
const desktopControls = await desktop.locator('button, input[type="range"], fieldset label').evaluateAll((elements) => elements.map((element) => {
  const box = element.getBoundingClientRect()
  return { tag: element.tagName, width: box.width, height: box.height }
}))
const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
await desktop.screenshot({ path: join(root, `audition-${label}-desktop.png`), fullPage: true })
const desktopScreenshot = await readFile(join(root, `audition-${label}-desktop.png`))
await desktop.evaluate(() => window.BOMB_R3_TEST.dispose())
const disposed = await desktop.evaluate(() => window.BOMB_R3_TEST.getState())

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
observe(mobile)
await waitReady(mobile)
const mobileInitial = await mobile.evaluate(() => window.BOMB_R3_TEST.getState())
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
const mobileControls = await mobile.locator('button, input[type="range"], fieldset label').evaluateAll((elements) => elements.map((element) => {
  const box = element.getBoundingClientRect()
  return { tag: element.tagName, width: box.width, height: box.height }
}))
await mobile.screenshot({ path: join(root, `audition-${label}-mobile.png`), fullPage: true })
const mobileScreenshot = await readFile(join(root, `audition-${label}-mobile.png`))
await mobile.evaluate(() => window.BOMB_R3_TEST.dispose())
await browser.close()

const report = {
  url,
  label,
  generatedAt: new Date().toISOString(),
  initial,
  matchingPair,
  crossPair,
  stopped,
  disposed,
  mobileInitial,
  layout: {
    desktopOverflow,
    mobileOverflow,
    desktopMinimumControlHeight: Math.min(...desktopControls.map((item) => item.height)),
    mobileMinimumControlHeight: Math.min(...mobileControls.map((item) => item.height)),
  },
  screenshots: {
    desktop: { file: `audition-${label}-desktop.png`, bytes: desktopScreenshot.length },
    mobile: { file: `audition-${label}-mobile.png`, bytes: mobileScreenshot.length },
  },
  consoleErrors: errors,
  pageErrors,
}
report.passed = (
  initial.ready && initial.candidateCount === 3
  && initial.normalVerdict === 'reject' && initial.chainVerdict === 'reject'
  && matchingPair.gateMode === 'pair'
  && crossPair.gateMode === 'recompose'
  && stopped.activeSources === 0 && stopped.pendingTimers === 0
  && disposed.contextClosed && disposed.activeSources === 0
  && mobileInitial.ready && mobileInitial.normalVerdict === 'reject' && mobileInitial.chainVerdict === 'reject'
  && !desktopOverflow && !mobileOverflow
  && report.layout.desktopMinimumControlHeight >= 44
  && report.layout.mobileMinimumControlHeight >= 44
  && desktopScreenshot.length > 20_000 && mobileScreenshot.length > 20_000
  && errors.length === 0 && pageErrors.length === 0
)
await writeFile(join(root, `browser-report-${label}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ passed: report.passed, errors: errors.length, pageErrors: pageErrors.length, layout: report.layout, screenshots: report.screenshots }))
if (!report.passed) process.exitCode = 1
