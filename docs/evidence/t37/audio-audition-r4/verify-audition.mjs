import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const ROOT = dirname(fileURLToPath(import.meta.url))
const HOST = '127.0.0.1'
const EXPECTED_ASSETS = 10
const EXPECTED_RECIPES = 8
const GENERATED = new Set([
  'signal-report.json',
  'browser-report.json',
  'audition-r4-desktop.png',
  'audition-r4-mobile.png',
])
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.ogg', 'audio/ogg'],
  ['.wav', 'audio/wav'],
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

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walkFiles(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
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

async function main() {
  const embeddedSource = await readFile(join(ROOT, 'embedded-assets.js'), 'utf8')
  const embeddedMatch = embeddedSource.match(/^window\.__T37_R4_EMBEDDED_AUDIO__ = Object\.freeze\((\{.*\})\)\s*$/s)
  assert(embeddedMatch, 'embedded-assets.js does not match its generated R4 contract.')
  const embeddedAssets = JSON.parse(embeddedMatch[1])
  assert(Object.keys(embeddedAssets).length === EXPECTED_ASSETS, `Expected ${EXPECTED_ASSETS} embedded assets, received ${Object.keys(embeddedAssets).length}.`)
  for (const [path, base64] of Object.entries(embeddedAssets)) {
    const diskPath = join(ROOT, path.replace(/^\.\//, ''))
    const embeddedHash = createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex')
    assert(embeddedHash === await sha256(diskPath), `${path} embedded bytes differ from the source file.`)
  }

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
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1440, height: 1120 }, deviceScaleFactor: 1 })
    const consoleErrors = []
    const pageErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__AUDITION_READY__ === true, null, { timeout: 30_000 })
    const initial = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(initial.ready === true, 'R4 audition did not report ready state.')
    assert(initial.playbackMode === 'buffer', `Unexpected HTTP playback mode: ${initial.playbackMode}`)
    assert(initial.accepted.clear.fourLineResolveCue === null, 'Four-line clear still declares a resolve cue.')
    assert(JSON.stringify(initial.accepted.clear.fourLinePulseTimesMs) === JSON.stringify([0, 60, 120, 180]), 'Four-line clear pulse times changed.')
    assert(initial.actionRecipes.moveLeft.asset.endsWith('/soft/back.ogg'), 'Move-left is not mapped to soft/back.ogg.')
    assert(initial.actionRecipes.moveRight.asset.endsWith('/soft/forward.ogg'), 'Move-right is not mapped to soft/forward.ogg.')

    await page.click('[data-profile="soft"][data-action="move-left"]')
    await page.waitForTimeout(100)
    let visibleState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(visibleState.currentProfile === 'soft' && visibleState.currentAction === '左移', 'Soft move-left mapping failed.')

    await page.click('[data-profile="soft"][data-action="move-right"]')
    await page.waitForTimeout(100)
    visibleState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(visibleState.currentRecipe === 'moveRight', 'Soft move-right did not use its directional recipe.')

    await page.click('[data-profile="soft"][data-action="rotate"]')
    await page.waitForTimeout(120)
    visibleState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(visibleState.currentRecipe === 'rotate', 'Soft rotate mapping failed.')

    await page.click('[data-profile="soft"][data-action="lock"]')
    await page.waitForTimeout(120)
    visibleState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(visibleState.currentRecipe === 'lock', 'Soft natural-lock mapping failed.')

    await page.click('[data-profile="soft"][data-action="hard-drop"]')
    await page.waitForTimeout(120)
    visibleState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(visibleState.currentRecipe === 'hardDrop', 'Soft hard-drop mapping failed.')

    await page.click('[data-profile="accepted"][data-action="clear-4"]')
    await page.waitForTimeout(225)
    const activeRows = await page.locator('#clear-rows .is-clearing').count()
    assert(activeRows === 4, `Four-line clear exposed ${activeRows} active row(s), expected 4.`)

    await page.click('[data-profile="ice-layered"][data-action="ice"]')
    await page.waitForTimeout(300)
    const iceState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(iceState.currentProfile === 'ice-layered' && iceState.currentRecipe === 'iceLayered', 'Layered Ice mapping failed.')
    assert(await page.locator('#ice-field.is-active').count() === 1, 'Ice field was not active near the shard release.')
    await page.screenshot({ path: join(ROOT, 'audition-r4-desktop.png'), fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__AUDITION_READY__ === true, null, { timeout: 30_000 })
    await page.click('[data-profile="soft"][data-action="hard-drop"]')
    await page.waitForTimeout(120)
    await page.screenshot({ path: join(ROOT, 'audition-r4-mobile.png'), fullPage: true })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.click('[data-profile="soft"][data-action="rotate"]')
    await page.waitForTimeout(30)
    const reducedState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(reducedState.currentRecipe === 'rotate', 'Reduced-motion action mapping failed.')

    const filePage = await browser.newPage({ viewport: { width: 1000, height: 760 } })
    filePage.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`file: ${message.text()}`)
    })
    filePage.on('pageerror', (error) => pageErrors.push(`file: ${error.message}`))
    await filePage.goto(pathToFileURL(join(ROOT, 'index.html')).href, { waitUntil: 'load' })
    await filePage.waitForFunction(() => window.__AUDITION_READY__ === true, null, { timeout: 30_000 })
    await filePage.click('[data-profile="ice-frost"][data-action="ice"]')
    await filePage.waitForTimeout(120)
    const fileState = JSON.parse(await filePage.evaluate(() => window.render_game_to_text()))
    assert(fileState.playbackMode === 'embedded-buffer', `Direct-file playback used ${fileState.playbackMode}.`)
    assert(fileState.currentRecipe === 'iceFrost', 'Direct-file Ice mapping failed.')
    await filePage.close()

    const report = await page.evaluate(() => window.__AUDITION_API__.getReport())
    assert(report.assetCount === EXPECTED_ASSETS, `Expected ${EXPECTED_ASSETS} decoded assets, received ${report.assetCount}.`)
    assert(Object.keys(report.sourceMetrics).length === EXPECTED_ASSETS, 'Decoded source metric count differs from asset count.')
    assert(report.recipeCount === EXPECTED_RECIPES, `Expected ${EXPECTED_RECIPES} recipes, received ${report.recipeCount}.`)
    assert(Object.keys(report.recipeMetrics).length === EXPECTED_RECIPES, 'Processed recipe metric count differs from recipe count.')

    for (const [path, metric] of Object.entries(report.sourceMetrics)) {
      assert(metric.finite === true, `${path} contains a non-finite sample.`)
      assert(metric.peak > 0.015, `${path} is effectively silent (peak ${metric.peak}).`)
      assert(metric.peak < 1.25, `${path} has unsafe decoded overshoot (peak ${metric.peak}).`)
      assert(metric.rms > 0.001, `${path} has insufficient RMS (${metric.rms}).`)
      assert(metric.durationSeconds > 0.05 && metric.durationSeconds < 3, `${path} has unexpected duration ${metric.durationSeconds}s.`)
    }

    for (const [key, metric] of Object.entries(report.recipeMetrics)) {
      const recipe = report.recipes[key]
      assert(metric.finite === true, `${key} processed output contains a non-finite sample.`)
      assert(Math.abs(metric.peak - recipe.targetPeak) <= 0.002, `${key} peak ${metric.peak} missed target ${recipe.targetPeak}.`)
      assert(metric.rms > 0.004, `${key} processed output has insufficient RMS (${metric.rms}).`)
      assert(metric.peak <= 0.71, `${key} exceeds the R4 processed peak ceiling (${metric.peak}).`)
    }

    const actionKeys = ['moveLeft', 'moveRight', 'rotate', 'lock', 'hardDrop']
    for (const key of actionKeys) {
      const recipe = report.recipes[key]
      assert(recipe.rate >= 0.88 && recipe.rate <= 1.05, `${key} reintroduced a sharp pitch-up rate (${recipe.rate}).`)
      assert(recipe.attackMs >= 12, `${key} attack is too sharp (${recipe.attackMs} ms).`)
      assert(recipe.lowpassHz <= 2600, `${key} low-pass ceiling is too high (${recipe.lowpassHz} Hz).`)
      assert(recipe.targetPeak >= 0.5, `${key} is softened by low level instead of contour (${recipe.targetPeak}).`)
    }
    assert(report.recipes.hardDrop.bodyHz === 160 && report.recipes.hardDrop.bodyDb === 2.5, 'Hard-drop body reinforcement changed.')
    assert(report.recipes.hardDrop.targetPeak > report.recipes.lock.targetPeak, 'Hard drop is not stronger than natural lock.')
    for (const key of ['iceFrost', 'iceLayered', 'iceBalanced']) {
      const recipe = report.recipes[key]
      assert(recipe.lowpassHz <= 8500, `${key} Ice low-pass ceiling is too high (${recipe.lowpassHz} Hz).`)
      assert(recipe.targetPeak >= 0.56, `${key} Ice candidate is too quiet (${recipe.targetPeak}).`)
    }

    assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(' | ')}`)
    assert(pageErrors.length === 0, `Page errors: ${pageErrors.join(' | ')}`)

    const artifactFiles = (await walkFiles(ROOT)).filter((path) => !GENERATED.has(relative(ROOT, path).replaceAll('\\', '/')))
    const hashes = Object.fromEntries(await Promise.all(artifactFiles.sort().map(async (path) => [
      relative(ROOT, path).replaceAll('\\', '/'),
      await sha256(path),
    ])))
    const signalReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      accepted: report.accepted,
      sources: {
        uiSfx: {
          package: 'uisfx@0.4.0',
          sourceCommit: '2001f3dac2d1cf86ad99cbad5cef222c3a8b9082',
          audioLicense: 'CC0-1.0',
        },
        freezeSpell: {
          page: 'https://opengameart.org/content/freeze-spell-0',
          author: 'artisticdude',
          license: 'CC0-1.0',
          sourceSha256: 'dc16da845f18f88885db4584205a4ad9b84a8da6e377b79d4511b366cc8631f1',
        },
        iceShatters: {
          page: 'https://opengameart.org/content/ice-breakingshattering',
          author: 'IgnasD',
          license: 'CC0-1.0',
          archiveSha256: 'b84ea396fac1af183dd2cb205a01edaa94b493ffb36965eafe59912e41cf9eb7',
          selectedSourceSha256: '81558c035953d4e595640be7ba1a645c47c6f4b72f38de43a44d36fa70d52b8c',
        },
      },
      recipes: report.recipes,
      sourceMetrics: report.sourceMetrics,
      recipeMetrics: report.recipeMetrics,
      sha256: hashes,
      assertions: {
        expectedAssets: EXPECTED_ASSETS,
        decodedAssets: Object.keys(report.sourceMetrics).length,
        embeddedAssets: Object.keys(embeddedAssets).length,
        expectedRecipes: EXPECTED_RECIPES,
        calibratedRecipes: Object.keys(report.recipeMetrics).length,
        embeddedBytesMatchSourceSha256: true,
        acceptedClearFourUsesFourPulsesAndNoTail: true,
        actionSofteningUsesContourNotLowVolume: true,
        processedPeaksMatchDeclaredTargets: true,
        allFinite: true,
      },
    }
    const browserReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      viewports: [
        { width: 1440, height: 1120, screenshot: 'audition-r4-desktop.png' },
        { width: 390, height: 844, screenshot: 'audition-r4-mobile.png' },
      ],
      checkedActions: [
        'soft move-left',
        'soft move-right',
        'soft rotate',
        'soft natural-lock',
        'soft hard-drop',
        'accepted clear-4',
        'ice layered',
        'mobile soft hard-drop',
        'reduced-motion soft rotate',
        'direct-file ice frost',
      ],
      consoleErrors,
      pageErrors,
      playbackModes: { http: report.playbackMode, directFile: 'embedded-buffer' },
      result: 'PASS',
    }
    await writeFile(join(ROOT, 'signal-report.json'), `${JSON.stringify(signalReport, null, 2)}\n`, 'utf8')
    await writeFile(join(ROOT, 'browser-report.json'), `${JSON.stringify(browserReport, null, 2)}\n`, 'utf8')
    process.stdout.write(`PASS assets=${EXPECTED_ASSETS} recipes=${EXPECTED_RECIPES} consoleErrors=0 pageErrors=0 port=${address.port}\n`)
  } finally {
    await browser?.close()
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.exitCode = 1
})
