import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PROJECT = resolve(ROOT, '..', '..', '..', '..')
const HOST = '127.0.0.1'
const PRODUCTION_AUDIO_PATHS = [
  'src/animation/mutationChainTimeline.ts',
  'src/design/mutationTokens.ts',
  'src/game/audio/AudioEngine.ts',
  'src/game/audio/acceptedPlayback.ts',
  'src/game/audio/audioGesture.ts',
  'src/game/audio/candidatePlayback.ts',
  'src/game/audio/audioPalette.ts',
  'src/game/audio/audioAssetCatalog.ts',
  'src/assets/audio/t37',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const provenance = JSON.parse(await readFile(join(ROOT, 'provenance.json'), 'utf8'))
  const auditionSource = await readFile(join(ROOT, 'audition.ts'), 'utf8')
  const listeningHtml = await readFile(join(ROOT, 'index.html'), 'utf8')
  const audioEngineSource = execFileSync('git', [
    'show', `${provenance.candidateSourceCommit}:src/game/audio/AudioEngine.ts`,
  ], { cwd: PROJECT, encoding: 'utf8' })
  const chainTimelineSource = execFileSync('git', [
    'show', `${provenance.candidateSourceCommit}:src/animation/mutationChainTimeline.ts`,
  ], { cwd: PROJECT, encoding: 'utf8' })
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
  execFileSync('git', ['diff', '--quiet', provenance.candidateSourceCommit, '--', ...PRODUCTION_AUDIO_PATHS], {
    cwd: PROJECT,
    stdio: 'ignore',
  })
  assert(
    auditionSource.includes("import { AudioEngine } from '../../../../src/game/audio/AudioEngine'"),
    'Listening page does not import the production AudioEngine.',
  )
  assert(!/createOscillator|createBufferSource|frequency\s*:|gain\s*:/.test(auditionSource),
    'Listening page copied a Web Audio recipe instead of calling production.')
  assert(
    audioEngineSource.includes("from '../../animation/mutationChainTimeline'")
      && audioEngineSource.includes('mutationChainPresentationPlan(event.chainOriginCells)')
      && audioEngineSource.includes('plan.beatStartsMs.map')
      && audioEngineSource.includes('mutationChainPresentationPlan(event.chainOriginCells).durationMs'),
    'Candidate AudioEngine is not bound to the shared chain presentation plan.',
  )
  assert(chainTimelineSource.includes('beatStartsMs') && chainTimelineSource.includes('durationMs'),
    'Candidate chain timeline does not expose shared beats and duration.')
  const accepted = provenance.humanStatus?.accepted ?? []
  const listeningRequired = provenance.humanStatus?.listeningRequired ?? []
  assert(!accepted.includes('Bomb normal') && !accepted.includes('Bomb chain-clear'),
    'Bomb listening candidates were incorrectly marked accepted.')
  assert(listeningRequired.includes('Bomb normal') && listeningRequired.includes('Bomb chain-clear'),
    'Both Bomb outcomes must remain fail-closed listening candidates.')
  assert(listeningHtml.includes('自动 PASS 只能证明映射和页面正确，不代表听感通过。')
    && listeningHtml.includes('这些只能由人工听感确认。'),
  'Visible page copy does not preserve the fail-closed human listening gate.')
  for (const required of [
    "'bomb-normal'",
    "'bomb-chain'",
    "bombOutcome: 'blast'",
    "bombOutcome: 'chain-clear'",
    'blastRows:',
    'participatingBombCount:',
    'chainOriginCarrierId:',
    'chainOriginCells,',
    "audio.play([{ type: 'restarted' }])",
  ]) {
    assert(auditionSource.includes(required), `Bomb production-event binding is missing: ${required}`)
  }

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
    const cueIds = await page.locator('[data-cue]').evaluateAll((buttons) => (
      buttons.map((button) => button.dataset.cue)
    ))
    assert(cueIds.length > 0, 'Listening page has no production controls.')
    assert(new Set(cueIds).size === cueIds.length, 'Listening cue IDs are not unique.')
    assert(await page.locator('[data-cue="freeze"]').count() === 1, 'Ice 2 is not a single frozen reference.')
    assert(await page.locator('[data-cue="bomb-normal"]').count() === 1,
      'Normal Bomb must have exactly one listening control.')
    assert(await page.locator('[data-cue="bomb-chain"]').count() === 1,
      'Chain-clear Bomb must have exactly one listening control.')
    assert(await page.locator('[data-cue="bomb"]').count() === 0,
      'Legacy undifferentiated Bomb control is still present.')
    const automaticGate = page.locator('[data-listening-gate="automatic"]')
    const humanGate = page.locator('[data-listening-gate="human"]')
    assert(await automaticGate.count() === 1 && await automaticGate.isVisible(),
      'Automatic-PASS listening warning is not uniquely visible.')
    assert(await humanGate.count() === 1 && await humanGate.isVisible(),
      'Human-only listening warning is not uniquely visible.')
    assert((await automaticGate.textContent())?.includes('不代表听感通过'),
      'Visible automatic warning no longer says that PASS cannot accept listening.')
    assert((await humanGate.textContent())?.includes('只能由人工听感确认'),
      'Visible human warning no longer keeps listening fail-closed.')

    const bombResults = {}
    for (let index = 0; index < cueIds.length; index += 1) {
      const cueId = cueIds[index]
      assert(typeof cueId === 'string' && cueId.length > 0, `Listening cue ${index} has no ID.`)
      await page.click(`[data-cue="${cueId}"]`)
      await page.waitForFunction((expected) => (
        JSON.parse(window.render_game_to_text()).playCount === expected
      ), index + 1)
      if (cueId === 'bomb-normal' || cueId === 'bomb-chain') {
        const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
        const expectedOutcome = cueId === 'bomb-normal' ? 'blast' : 'chain-clear'
        assert(state.currentCueId === cueId, `${cueId} did not become the current production cue.`)
        assert(state.lastBombOutcome === expectedOutcome,
          `${cueId} dispatched ${state.lastBombOutcome} instead of ${expectedOutcome}.`)
        assert(JSON.stringify(state.lastEventTypes) === JSON.stringify(['clear-started', 'mutation-activated']),
          `${cueId} did not dispatch the complete clear-started + mutation-activated path.`)
        assert(JSON.stringify(state.lastDispatchSequence)
          === JSON.stringify(['restarted', 'clear-started', 'mutation-activated']),
        `${cueId} did not dispatch restarted before the complete Bomb path.`)
        if (cueId === 'bomb-chain') {
          const expectedOrigin = [
            { x: 4, y: 29 }, { x: 5, y: 29 }, { x: 4, y: 30 }, { x: 5, y: 30 },
          ]
          assert(JSON.stringify(state.lastChainOriginCells) === JSON.stringify(expectedOrigin),
            'Chain-clear control did not dispatch the complete production-plan origin carrier.')
        } else {
          assert(Array.isArray(state.lastChainOriginCells) && state.lastChainOriginCells.length === 0,
            'Normal Bomb incorrectly exposed chain origin geometry.')
        }
        bombResults[cueId] = {
          outcome: state.lastBombOutcome,
          eventTypes: state.lastEventTypes,
          dispatchSequence: state.lastDispatchSequence,
          chainOriginCells: state.lastChainOriginCells,
        }
      }
    }
    await page.waitForTimeout(120)
    const played = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
    assert(played.playCount === cueIds.length, 'Not every production listening control dispatched.')
    assert(played.currentCueId === 'mutation-sequence', 'Serialized Mutation control did not become current.')
    assert(played.bombDispatches?.blast === 1 && played.bombDispatches?.['chain-clear'] === 1,
      'Both Bomb outcomes were not dispatched exactly once.')
    assert(Object.keys(bombResults).length === 2, 'Both Bomb controls were not observed by the verifier.')

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
      schemaVersion: 2,
      candidateSourceCommit: provenance.candidateSourceCommit,
      productionEngineImported: true,
      productionSourcePathsVerified: PRODUCTION_AUDIO_PATHS,
      controlCount: cueIds.length,
      dispatchedControls: cueIds.length + 1,
      bombControls: ['bomb-normal', 'bomb-chain'],
      bombOutcomesDispatched: bombResults,
      chainPlanBinding: {
        audioEngineImportVerified: true,
        productionCallVerified: 'mutationChainPresentationPlan(event.chainOriginCells)',
        beatStartsConsumerVerified: 'plan.beatStartsMs.map',
        durationConsumerVerified: 'mutationChainPresentationPlan(event.chainOriginCells).durationMs',
      },
      desktop,
      mobile,
      reducedTransitionDuration: reduced,
      consoleErrors,
      pageErrors,
      humanListeningStatus: {
        value: 'required',
        derivedFromProvenance: ['Bomb normal', 'Bomb chain-clear'],
        visibleWarningVerified: true,
      },
    }
    await writeFile(join(ROOT, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    process.stdout.write(
      `PASS source=${provenance.candidateSourceCommit.slice(0, 7)} controls=${cueIds.length} bombs=2 errors=0 human=required\n`,
    )
  } finally {
    await browser?.close()
    await server.close()
  }
}

await main()
