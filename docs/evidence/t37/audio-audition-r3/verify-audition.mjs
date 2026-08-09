import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = dirname(fileURLToPath(import.meta.url))
const HOST = '127.0.0.1'
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
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

async function walkFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(current, entry.name)
    if (entry.isDirectory()) files.push(...await walkFiles(root, path))
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
    const consoleErrors = []
    const pageErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__AUDITION_READY__ === true, null, { timeout: 20_000 })

    const initial = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(initial.ready === true, 'Audition did not report ready state.')
    assert(initial.playbackMode === 'buffer', `Unexpected playback mode: ${initial.playbackMode}`)

    await page.click('[data-family="studio"][data-action="move-left"]')
    await page.waitForTimeout(140)
    const moveState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(moveState.currentFamily === 'studio' && moveState.currentAction === '左移', 'Move mapping did not update visible state.')

    await page.click('[data-family="mechanical"][data-action="rotate"]')
    await page.waitForTimeout(140)
    const rotateState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(rotateState.currentFamily === 'mechanical' && rotateState.currentAction === '旋转', 'Rotate mapping did not update visible state.')

    await page.click('[data-family="scifi"][data-action="clear-4"]')
    await page.waitForTimeout(110)
    const activeRows = await page.locator('#clear-rows .is-clearing').count()
    assert(activeRows >= 2, `Four-line clear exposed only ${activeRows} active row(s) at the sampled frame.`)
    await page.waitForTimeout(360)

    await page.click('[data-family="glass"][data-action="ice"]')
    await page.waitForTimeout(150)
    const iceState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(iceState.currentFamily === 'glass' && iceState.currentAction === '冰冻激活', 'Ice mapping did not update visible state.')
    assert(await page.locator('#ice-field.is-active').count() === 1, 'Ice field was not visible during shard release.')

    await page.screenshot({ path: join(ROOT, 'audition-r3-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__AUDITION_READY__ === true, null, { timeout: 20_000 })
    await page.click('[data-family="scifi"][data-action="hard-drop"]')
    await page.waitForTimeout(100)
    await page.screenshot({ path: join(ROOT, 'audition-r3-mobile.png'), fullPage: true })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.click('[data-family="studio"][data-action="rotate"]')
    await page.waitForTimeout(40)
    const reducedState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(reducedState.currentAction === '旋转', 'Reduced-motion action mapping failed.')

    const report = await page.evaluate(() => window.__AUDITION_API__.getReport())
    assert(report.assetCount === 23, `Expected 23 assets, received ${report.assetCount}.`)
    assert(Object.keys(report.assets).length === 23, `Expected 23 decoded metrics, received ${Object.keys(report.assets).length}.`)
    for (const [path, metric] of Object.entries(report.assets)) {
      assert(metric.finite === true, `${path} contains a non-finite sample.`)
      assert(metric.peak > 0.015, `${path} is effectively silent (peak ${metric.peak}).`)
      assert(metric.peak <= 1.001, `${path} exceeds decoded full scale (peak ${metric.peak}).`)
      assert(metric.rms > 0.001, `${path} has insufficient RMS (${metric.rms}).`)
      assert(metric.durationSeconds > 0.05 && metric.durationSeconds < 1.5, `${path} has unexpected duration ${metric.durationSeconds}s.`)
    }
    assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(' | ')}`)
    assert(pageErrors.length === 0, `Page errors: ${pageErrors.join(' | ')}`)

    const artifactFiles = (await walkFiles(ROOT)).filter((path) => {
      const name = relative(ROOT, path).replaceAll('\\', '/')
      return !['signal-report.json', 'browser-report.json', 'audition-r3-desktop.png', 'audition-r3-mobile.png'].includes(name)
    })
    const hashes = Object.fromEntries(await Promise.all(artifactFiles.sort().map(async (path) => [
      relative(ROOT, path).replaceAll('\\', '/'),
      await sha256(path),
    ])))

    const signalReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: {
        package: 'uisfx@0.4.0',
        sourceCommit: '2001f3dac2d1cf86ad99cbad5cef222c3a8b9082',
        tarballIntegrity: 'sha512-W891N75C09cvpaNeChP+7BiP0Yp5VSbrIcRgZvzpFUT3o/2DxZqROmUcX50oxeyMnY4Hqxu4jEfjndVUpmheEQ==',
        audioLicense: 'CC0-1.0',
      },
      actionMap: report.actionMap,
      assets: report.assets,
      sha256: hashes,
      assertions: {
        expectedAssets: 23,
        decodedAssets: Object.keys(report.assets).length,
        allFinite: true,
        allAudibleByPeakAndRmsFloor: true,
        noDecodedFullScaleOverflow: true,
      },
    }
    const browserReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      viewports: [
        { width: 1440, height: 1100, screenshot: 'audition-r3-desktop.png' },
        { width: 390, height: 844, screenshot: 'audition-r3-mobile.png' },
      ],
      checkedActions: ['studio move-left', 'mechanical rotate', 'scifi clear-4', 'glass ice', 'scifi mobile hard-drop', 'studio reduced-motion rotate'],
      consoleErrors,
      pageErrors,
      playbackMode: report.playbackMode,
      result: 'PASS',
    }
    await writeFile(join(ROOT, 'signal-report.json'), `${JSON.stringify(signalReport, null, 2)}\n`, 'utf8')
    await writeFile(join(ROOT, 'browser-report.json'), `${JSON.stringify(browserReport, null, 2)}\n`, 'utf8')

    process.stdout.write(`PASS assets=${report.assetCount} consoleErrors=0 pageErrors=0 port=${address.port}\n`)
  } finally {
    await browser?.close()
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.exitCode = 1
})
