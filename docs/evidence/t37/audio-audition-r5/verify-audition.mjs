import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const ROOT = dirname(fileURLToPath(import.meta.url))
const HOST = '127.0.0.1'
const EXPECTED_ICE = 3
const GENERATED = new Set([
  'signal-report.json',
  'browser-report.json',
  'audition-r5-desktop.png',
  'audition-r5-mobile.png',
])
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.ogg', 'audio/ogg'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
])

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function sha256(path) {
  return await new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${HOST}`).pathname)
      const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
      let path = resolve(ROOT, requested)
      if (path !== ROOT && !path.startsWith(`${ROOT}${sep}`)) {
        response.writeHead(403).end('Forbidden')
        return
      }
      const metadata = await stat(path)
      if (metadata.isDirectory()) path = join(path, 'index.html')
      const body = await readFile(path)
      response.writeHead(200, {
        'Content-Type': MIME.get(extname(path)) ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      response.end(body)
    } catch {
      response.writeHead(404).end('Not found')
    }
  })
}

function maxRecipeEnd(recipe) {
  return Math.max(...recipe.map((voice) => (voice.delay ?? 0) + voice.duration))
}

async function main() {
  const provenance = JSON.parse(await readFile(join(ROOT, 'provenance.json'), 'utf8'))
  const embeddedSource = await readFile(join(ROOT, 'embedded-assets.js'), 'utf8')
  const embeddedMatch = embeddedSource.match(/^window\.__T37_R5_EMBEDDED_AUDIO__ = Object\.freeze\((\{.*\})\)\s*$/s)
  assert(embeddedMatch, 'embedded-assets.js does not match the R5 generated contract.')
  const embeddedAssets = JSON.parse(embeddedMatch[1])
  assert(Object.keys(embeddedAssets).length === EXPECTED_ICE, `Expected ${EXPECTED_ICE} embedded Ice assets.`)
  assert(provenance.iceSources.length === EXPECTED_ICE, `Expected ${EXPECTED_ICE} provenance records.`)

  const assetHashes = {}
  for (const source of provenance.iceSources) {
    const diskPath = join(ROOT, source.auditionFile)
    const hash = await sha256(diskPath)
    assert(hash === source.auditionSha256, `${source.auditionFile} differs from its provenance hash.`)
    const embedded = embeddedAssets[`./${source.auditionFile}`]
    assert(embedded, `${source.auditionFile} is missing from embedded-assets.js.`)
    const embeddedHash = createHash('sha256').update(Buffer.from(embedded, 'base64')).digest('hex')
    assert(embeddedHash === hash, `${source.auditionFile} embedded bytes differ.`)
    assetHashes[source.auditionFile] = hash
  }

  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
  const auditionSource = await readFile(join(ROOT, 'audition.js'), 'utf8')
  assert(!auditionSource.includes('/assets/soft/'), 'R5 reintroduced an R4 soft-pack asset.')
  assert(!auditionSource.includes('iceFrost') && !auditionSource.includes('iceLayered') && !auditionSource.includes('iceBalanced'), 'R5 reintroduced an R4 Ice recipe.')

  const server = createStaticServer()
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, HOST, resolveListen)
  })
  const address = server.address()
  assert(address && typeof address === 'object', 'Static server did not expose an address.')
  const url = `http://${HOST}:${address.port}`

  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 })
    const consoleErrors = []
    const pageErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__T37_R5_READY__ === true)

    const initial = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(initial.currentProfile === 't28', 'R5 does not open on the T28 soft recovery.')
    assert(Object.keys(initial.profiles).length === 2, 'R5 must expose exactly two historical action profiles.')
    assert(initial.profiles.t28.sourceCommit === '35509a7', 'T28 source commit changed.')
    assert(initial.profiles.t28.sourceBlob === 'c43a68701fc1a7d39e31094422617214b359a001', 'T28 source blob changed.')
    assert(initial.profiles.t29.sourceCommit === 'ca5da48', 'T29 source commit changed.')
    assert(initial.profiles.t29.sourceBlob === 'f470e8942fed47da0c10c3d0debbb41580b49bf1', 'T29 source blob changed.')
    assert(initial.accepted.reviewControls === false, 'Accepted sounds were reopened for selection.')
    assert(initial.accepted.clearFourResolveCue === null, 'Clear 4 reintroduced a completion tail.')
    assert(JSON.stringify(initial.accepted.clearFourPulseTimesMs) === JSON.stringify([0, 60, 120, 180]), 'Clear 4 pulse cadence changed.')
    assert(await page.locator('.frozen-panel button').count() === 0, 'Frozen accepted sounds have review controls.')

    const t28 = initial.profiles.t28
    const t29 = initial.profiles.t29
    assert(maxRecipeEnd(t28.recipes.move) === 0.044, 'T28 movement duration changed.')
    assert(maxRecipeEnd(t28.recipes.rotate) === 0.065, 'T28 rotation duration changed.')
    assert(maxRecipeEnd(t28.recipes.lock) === 0.048, 'T28 natural-lock duration changed.')
    assert(maxRecipeEnd(t28.recipes.hardDrop) === 0.072, 'T28 hard-drop duration changed.')
    assert(maxRecipeEnd(t29.recipes.move) === 0.046, 'T29 movement duration changed.')
    assert(maxRecipeEnd(t29.recipes.rotate) === 0.08, 'T29 rotation duration changed.')
    assert(maxRecipeEnd(t29.recipes.lock) === 0.055, 'T29 natural-lock duration changed.')
    assert(maxRecipeEnd(t29.recipes.hardDrop) === 0.09, 'T29 hard-drop duration changed.')
    assert(t28.masterGain === 1.85 && t28.voiceGainBoost === 1.45, 'T28 historical mixer changed.')
    assert(t29.masterGain === 1.5 && t29.voiceGainBoost === 1.6, 'T29 historical mixer changed.')

    await page.click('[data-action="move-left"]')
    await page.waitForTimeout(110)
    let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(state.currentAction === '左移', 'T28 move-left mapping failed.')
    await page.click('[data-action="move-right"]')
    await page.click('[data-action="rotate"]')
    await page.click('[data-action="lock"]')
    await page.click('[data-action="hard-drop"]')
    await page.waitForTimeout(220)
    await page.click('[data-action="repeat"]')
    await page.waitForTimeout(1250)
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(state.currentAction === '连续移动完成', 'T28 repetition audit did not complete.')

    await page.click('[data-profile-select="t29"]')
    await page.click('[data-action="showcase"]')
    await page.waitForTimeout(1500)
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(state.currentProfile === 't29', 'T29 profile selection failed.')

    for (const candidate of initial.ice) {
      await page.click(`[data-ice-id="${candidate.id}"]`)
      await page.waitForTimeout(520)
    }
    const iceMetrics = await page.evaluate(() => window.__T37_R5_AUDIT__.getIceMetrics())
    assert(Object.keys(iceMetrics).length === EXPECTED_ICE, 'Not all Ice assets decoded.')
    for (const [id, metric] of Object.entries(iceMetrics)) {
      assert(metric.finite === true, `${id} contains non-finite samples.`)
      assert(metric.durationSeconds > 0.3 && metric.durationSeconds < 2.2, `${id} has unexpected duration ${metric.durationSeconds}.`)
      assert(metric.peak > 0.04 && metric.peak <= 1.1, `${id} has invalid decoded peak ${metric.peak}.`)
      assert(metric.peak * 0.78 <= 0.86, `${id} exceeds the bounded audition output peak.`)
      assert(metric.rms > 0.002, `${id} has insufficient RMS ${metric.rms}.`)
      assert(metric.windowDurationSeconds <= 0.441, `${id} audition window is too long.`)
      assert(metric.peakResponseMs <= 36, `${id} crisp response arrives too late (${metric.peakResponseMs} ms).`)
    }

    const desktopLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      buttons: [...document.querySelectorAll('button')].map((button) => {
        const rect = button.getBoundingClientRect()
        return { width: rect.width, height: rect.height, disabled: button.disabled }
      }),
    }))
    assert(desktopLayout.scrollWidth <= desktopLayout.clientWidth, 'Desktop page has horizontal overflow.')
    assert(desktopLayout.buttons.filter((button) => !button.disabled).every((button) => button.height >= 44), 'An enabled desktop button is shorter than 44px.')
    await page.screenshot({ path: join(ROOT, 'audition-r5-desktop.png'), fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.click('[data-profile-select="t28"]')
    await page.click('[data-ice-id="ice-break"]')
    await page.waitForTimeout(180)
    const mobileLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    assert(mobileLayout.scrollWidth <= mobileLayout.clientWidth, 'Mobile page has horizontal overflow.')
    await page.screenshot({ path: join(ROOT, 'audition-r5-mobile.png'), fullPage: true })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.click('[data-action="rotate"]')
    await page.waitForTimeout(100)
    const reducedMotionDuration = await page.locator('#piece').evaluate((node) => getComputedStyle(node).animationDuration)
    assert(reducedMotionDuration === '0.001s', `Reduced-motion duration is ${reducedMotionDuration}.`)

    const filePage = await browser.newPage({ viewport: { width: 900, height: 820 } })
    const fileErrors = []
    filePage.on('console', (message) => {
      if (message.type() === 'error') fileErrors.push(message.text())
    })
    filePage.on('pageerror', (error) => fileErrors.push(error.message))
    await filePage.goto(pathToFileURL(join(ROOT, 'index.html')).href, { waitUntil: 'domcontentloaded' })
    await filePage.waitForFunction(() => window.__T37_R5_READY__ === true)
    await filePage.click('[data-ice-id="ice-break"]')
    await filePage.waitForTimeout(450)
    const fileState = JSON.parse(await filePage.evaluate(() => window.render_game_to_text()))
    assert(fileState.playbackMode === 'embedded-buffer', 'Direct-file playback did not use embedded audio bytes.')
    assert(fileErrors.length === 0, `Direct-file errors: ${fileErrors.join(' | ')}`)

    assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(' | ')}`)
    assert(pageErrors.length === 0, `Page errors: ${pageErrors.join(' | ')}`)

    const artifactPaths = [
      'index.html',
      'styles.css',
      'audition.js',
      'embedded-assets.js',
      'build-embedded-assets.mjs',
      'verify-audition.mjs',
      'provenance.json',
      'README.md',
      ...provenance.iceSources.map((source) => source.auditionFile),
    ].filter((path) => !GENERATED.has(path))
    const hashes = Object.fromEntries(await Promise.all(artifactPaths.map(async (path) => [path, await sha256(join(ROOT, path))])))
    const signalReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sourceSha,
      actionProfiles: initial.profiles,
      accepted: initial.accepted,
      iceSources: provenance.iceSources,
      iceMetrics,
      sha256: hashes,
      assertions: {
        r4RecipesExcluded: true,
        exactHistoricalProfiles: 2,
        acceptedSoundsNotReopened: true,
        clearFourHasFourPulsesAndNoTail: true,
        embeddedBytesMatchDownloadedPreviews: true,
        iceAtOriginalRate: true,
        peakCentredIceWindowsAtMost441Ms: true,
        allIceFinite: true,
      },
    }
    const browserReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sourceSha,
      viewports: [
        { width: 1440, height: 1080, screenshot: 'audition-r5-desktop.png' },
        { width: 390, height: 844, screenshot: 'audition-r5-mobile.png' },
      ],
      checkedActions: [
        'T28 left/right/rotate/lock/hard-drop/repeat',
        'T29 full action chain',
        'Ice 1/2/3',
        'mobile Ice 1',
        'reduced-motion rotate',
        'direct-file embedded Ice 1',
      ],
      consoleErrors,
      pageErrors,
      directFileErrors: fileErrors,
      desktopLayout,
      mobileLayout,
      result: 'PASS',
    }
    await writeFile(join(ROOT, 'signal-report.json'), `${JSON.stringify(signalReport, null, 2)}\n`, 'utf8')
    await writeFile(join(ROOT, 'browser-report.json'), `${JSON.stringify(browserReport, null, 2)}\n`, 'utf8')
    process.stdout.write(`PASS profiles=2 ice=3 consoleErrors=0 pageErrors=0 port=${address.port}\n`)
  } finally {
    await browser?.close()
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.exitCode = 1
})
