import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PROJECT = resolve(ROOT, '..', '..', '..', '..')
const HOST = '127.0.0.1'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const provenance = JSON.parse(await readFile(join(ROOT, 'provenance.json'), 'utf8'))
  const auditionSource = await readFile(join(ROOT, 'audition.ts'), 'utf8')
  execFileSync('git', ['cat-file', '-e', `${provenance.candidateSourceCommit}^{commit}`], {
    cwd: PROJECT,
    stdio: 'ignore',
  })
  execFileSync('git', ['cat-file', '-e', `${provenance.softRecovery.audioCommit}^{commit}`], {
    cwd: PROJECT,
    stdio: 'ignore',
  })
  execFileSync('git', ['cat-file', '-e', provenance.softRecovery.audioEngineBlob], {
    cwd: PROJECT,
    stdio: 'ignore',
  })
  execFileSync('git', ['diff', '--quiet', provenance.candidateSourceCommit, '--', 'src/game/audio'], {
    cwd: PROJECT,
    stdio: 'ignore',
  })
  assert(
    auditionSource.includes("import { AudioEngine } from '../../../../src/game/audio/AudioEngine'"),
    'Listening page does not import the production AudioEngine.',
  )
  assert(!/createOscillator|createBufferSource|frequency\s*:|gain\s*:/.test(auditionSource),
    'Listening page copied a Web Audio recipe instead of calling production.')

  const server = await createViteServer({
    root: PROJECT,
    appType: 'mpa',
    logLevel: 'error',
    server: { host: HOST, port: 0, strictPort: false },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert(address && typeof address === 'object', 'Vite did not expose a listening port.')
  const url = `http://${HOST}:${address.port}/docs/evidence/t37/audio-stage-c-listening/index.html`

  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
    const consoleErrors = []
    const pageErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__T37_STAGE_C_READY__ === true)

    const initial = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(initial.sourceCommit === provenance.candidateSourceCommit, 'Page source binding changed.')
    assert(initial.productionEngine === true && initial.playCount === 0, 'Page did not start idle on production.')
    assert(await page.locator('[data-cue]').count() === 28, 'Listening control count changed.')
    assert(await page.locator('[data-cue="freeze"]').count() === 1, 'Ice 2 is not a single frozen reference.')

    await page.click('[data-cue="move-left"]')
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).primed === true)
    await page.click('[data-cue="clear-4"]')
    await page.click('[data-cue="freeze"]')
    await page.click('[data-cue="bomb"]')
    await page.click('[data-cue="mutation-sequence"]')
    await page.waitForTimeout(120)
    const played = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(played.playCount === 5, 'Production listening controls did not dispatch exactly five actions.')
    assert(played.currentCue.includes('同帧完整序列'), 'Serialized Mutation control did not become current.')

    const desktop = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      buttonHeights: [...document.querySelectorAll('button')].map((button) => button.getBoundingClientRect().height),
    }))
    assert(desktop.scrollWidth <= desktop.clientWidth, 'Desktop listening page overflows horizontally.')
    assert(desktop.buttonHeights.every((height) => height >= 44), 'A listening control is below 44 px.')
    await page.screenshot({ path: join(ROOT, 'stage-c-desktop.png'), fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.click('[data-cue="supergravity"]')
    await page.waitForTimeout(80)
    const mobile = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    assert(mobile.scrollWidth <= mobile.clientWidth, 'Mobile listening page overflows horizontally.')
    await page.screenshot({ path: join(ROOT, 'stage-c-mobile.png'), fullPage: true })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = await page.locator('[data-cue="pause"]').evaluate((button) => (
      getComputedStyle(button).transitionDuration
    ))
    assert(reduced.includes('1e-06s') || reduced.includes('0.000001s'), 'Reduced motion did not collapse transitions.')
    assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(' | ')}`)
    assert(pageErrors.length === 0, `Page errors: ${pageErrors.join(' | ')}`)

    const report = {
      schemaVersion: 1,
      candidateSourceCommit: provenance.candidateSourceCommit,
      productionEngineImported: true,
      controlCount: 28,
      dispatchedControls: 6,
      desktop,
      mobile,
      reducedTransitionDuration: reduced,
      consoleErrors,
      pageErrors,
      humanListeningStatus: 'required-for-candidates',
    }
    await writeFile(join(ROOT, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    process.stdout.write(`PASS source=${provenance.candidateSourceCommit.slice(0, 7)} controls=28 errors=0\n`)
  } finally {
    await browser?.close()
    await server.close()
  }
}

await main()
