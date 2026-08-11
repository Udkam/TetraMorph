# T37 Endgame workstream log

## N0 — canonical namespace contract

- Task ID: `T37-N0-ENDGAME-NAMESPACE`
- Base SHA: `227fc14217d836698f1a498d3959260459337a2e`
- Status: N0 accepted; canonical Intro-05 docs contract next.
- Canonical names: Chinese `残局`, English `Endgame`, code `endgame` / `Endgame`.

The player retired the active Chinese label and every active `puzzle` identifier. This is a
deterministic namespace migration, not UI copy. The current F4E proof shards are stopped and
marked non-proof because mode/state/ID renaming changes state hashes. Historical T37 Puzzle
workstream files are frozen provenance; new work is owned here.

### Authorized atomic namespace manifest

The canonical checkpoint may change the following 82 current tracked paths and deterministic
renamed targets for filenames containing `puzzle` / `Puzzle`. No other product, test, script,
or tool path is authorized by this exception. Canonical authoring fixtures are separate.

```text
README.md
scripts/capture-tetris-t3-evidence.py
src/App.test.ts
src/App.tsx
src/design/tokens/colors.ts
src/design/tokens/tokens.test.ts
src/game/audio/AudioEngine.test.ts
src/game/audio/AudioEngine.ts
src/game/audio/audioPalette.test.ts
src/game/audio/audioPalette.ts
src/game/core/board.ts
src/game/core/constants.ts
src/game/core/engine.ts
src/game/core/index.ts
src/game/core/puzzleCampaign.test.ts
src/game/core/puzzleFingerprints.test.ts
src/game/core/puzzleFingerprints.ts
src/game/core/puzzleFlow.test.ts
src/game/core/puzzleHardWitnesses.test.ts
src/game/core/puzzleMasteryAuthoring.test.ts
src/game/core/puzzleMasteryExact.test.ts
src/game/core/puzzleRouteSearch.test.ts
src/game/core/puzzleRouteSearch.ts
src/game/core/puzzles.test.ts
src/game/core/puzzles.ts
src/game/core/puzzleSolverResults.test.ts
src/game/core/puzzleT32EasyMasteryAlternates.ts
src/game/core/puzzleT32EasyMasteryArtifactAuthoring.test.ts
src/game/core/puzzleT32HardArtifactAuthoring.test.ts
src/game/core/puzzleT32HardRebuildRoutes.ts
src/game/core/puzzleUndo.test.ts
src/game/core/puzzleV3AnchorEvidence.test.ts
src/game/core/puzzleV3BehaviorBaseline.test.ts
src/game/core/puzzleV3Intro01Exact.test.ts
src/game/core/puzzleV3Intro02Exact.test.ts
src/game/core/puzzleV3Intro03Exact.test.ts
src/game/core/puzzleV3Intro04Exact.test.ts
src/game/core/puzzleV3IntroDefinitions.ts
src/game/core/puzzleV3PrototypeExact.test.ts
src/game/core/race.test.ts
src/game/core/rules.test.ts
src/game/core/sprint.test.ts
src/game/core/types.ts
src/game/render/TetrisRenderer.test.ts
src/game/render/TetrisRenderer.ts
src/game/render/presentation.test.ts
src/game/render/presentation.ts
src/game/render/theme.test.ts
src/game/render/theme.ts
src/game/runtime/GameRuntime.test.ts
src/game/runtime/GameRuntime.ts
src/game/runtime/qaScenario.test.ts
src/game/runtime/qaScenario.ts
src/main.tsx
src/navigation/appRoute.test.ts
src/navigation/appRoute.ts
src/puzzleLessons.test.ts
src/puzzleLessons.ts
src/puzzleMastery.test.ts
src/puzzleMastery.ts
src/puzzleProgress.test.ts
src/puzzleProgress.ts
src/styles.css
src/styles/hud.css
src/styles/hud.test.ts
src/styles/navigation.css
src/styles/navigation.test.ts
src/styles/puzzle-library.css
src/styles/puzzle-library.test.ts
src/styles/result.css
src/styles/result.test.ts
src/styles/themes.css
src/styles/tokens.css
src/ui/localization.ts
tools/generate-puzzle-walkthroughs.mjs
tools/search-puzzle-v3-prototype-reverse.test.mjs
tools/search-puzzle-v3-prototype.mjs
tools/search-puzzle-v3-tiling-first-v2.mjs
tools/search-puzzle-v3-tiling-first-v2.test.mjs
tools/search-puzzle-v3-tiling-first.mjs
tools/search-puzzle-v3-tiling-first.test.mjs
tools/solve-puzzle-campaign.cpp
```

Filename targets replace case-preserving `puzzle` / `Puzzle` with `endgame` / `Endgame`.
Content-only paths keep their filenames. The isolated legacy migration module/test and
canonical fixture paths are authorized in their own prior checkpoints and are not bundled
into this exception.

### Migration invariants

- Canonical URLs are `/endgames` and `/play/endgame/:id`; the isolated parser returns a
  canonical navigation/path pair and the React owner performs exactly one `replaceState`.
- N0 canonical storage is `tetramorph:endgame-completion:v6`, schema 6 and campaign
  revision 2. It preserves the current 50 boards and maps every current generic ordinal
  21–50; neutral IDs remain unchanged. The later 46-board publication alone uses
  v7/revision 3 and retires canonical ordinals 34, 40, 42, and 43.
- Storage reads are `value` / `missing` / `failed`. The canonical or first-present
  higher-priority key blocks fallback when unreadable/invalid, preventing stale snapshots
  from replacing newer data. Removal starts only after successful
  write plus parsed-equivalent readback, then proceeds per key. A failed removal is retained
  and retried; multi-key cleanup is explicitly not atomic.
- Canonical rule-introduction storage is `tetramorph:mode-rule-intros:v2`. Canonical history
  is `tetramorphRoute.version=2`, screen `endgame-library`, mode `endgame`, and field
  `selectedEndgameId`. Path wins on path/history disagreement; legacy normalization uses
  exactly one `replaceState`.
- Gameplay geometry, seeds, route tokens, locks, releases, targets, and progression are
  checked by a namespace-neutral mechanical fingerprint; naming-domain hashes and proofs
  are regenerated and never compared as canonical proof.
- No active aliases, dual state fields, compatibility exports, selectors, filenames, or
  normal route/storage writers retain the retired namespace.

### Pre-atomic checkpoints

1. Storage capability: `src/platform/browserPlatform.ts` and
   `src/platform/browserPlatform.test.ts`. Add tri-state reads and idempotent removal with
   unavailable/get/set/readback/remove failure injection. These paths contain no retired
   domain literal.
2. Isolated decoder: `src/legacyEndgameMigration.ts` and
   `src/legacyEndgameMigration.test.ts`. These are the only active paths allowed to contain
   retired input literals after the atomic switch. They emit canonical data or structured
   failure only.
3. Canonical fixtures use root `docs/workstreams/tetris-t37-endgame/fixtures/`. Historical
   originals remain byte-immutable and are not staged with the active namespace switch.
   Exact source → target ownership is:

```text
docs/workstreams/tetris-t13-core/puzzle-endgame-results.json
  -> fixtures/t13/endgame-results.json
docs/workstreams/tetris-t15-puzzle/puzzle-levels-01-10.json
  -> fixtures/t15/endgame-levels-01-10.json
docs/workstreams/tetris-t15-puzzle/puzzle-levels-11-20.json
  -> fixtures/t15/endgame-levels-11-20.json
docs/workstreams/tetris-t15-puzzle/puzzle-levels-21-30.json
  -> fixtures/t15/endgame-levels-21-30.json
docs/workstreams/tetris-t15-puzzle/puzzle-levels-31-40.json
  -> fixtures/t15/endgame-levels-31-40.json
docs/workstreams/tetris-t15-puzzle/puzzle-levels-41-50.json
  -> fixtures/t15/endgame-levels-41-50.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-01-03.json
  -> fixtures/t32/endgame-levels-changed-01-03.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-04-06.json
  -> fixtures/t32/endgame-levels-changed-04-06.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-07-09.json
  -> fixtures/t32/endgame-levels-changed-07-09.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-10.json
  -> fixtures/t32/endgame-levels-changed-10.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-easy-mastery.json
  -> fixtures/t32/endgame-levels-changed-easy-mastery.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-36.json
  -> fixtures/t32/endgame-levels-changed-36.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-38.json
  -> fixtures/t32/endgame-levels-changed-38.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-47.json
  -> fixtures/t32/endgame-levels-changed-47.json
docs/workstreams/tetris-t32-puzzle/puzzle-levels-changed-46-50-r2.json
  -> fixtures/t32/endgame-levels-changed-46-50-r2.json
docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-01.json
  -> fixtures/t37/endgame-v3-intro-01.json
docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-02.json
  -> fixtures/t37/endgame-v3-intro-02.json
docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-03.json
  -> fixtures/t37/endgame-v3-intro-03.json
docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-04.json
  -> fixtures/t37/endgame-v3-intro-04.json
docs/workstreams/tetris-t37-puzzle/puzzle-v3-ten-row-prototype.json
  -> fixtures/t37/endgame-v3-ten-row-prototype.json
```

The eight byte-neutral inputs (T13; T15 01–20; T32 01–10 and Easy mastery) retain
source SHA-256 exactly. T15 21–50 and T32 36/38/47/46–50 receive only exact generic-ID
conversion, deterministic UTF-8/LF serialization, structural equality after masking that
field, and full route replay. The five T37 targets are regenerated after canonical Core;
their historical SHA values are provenance only and every schema/behavior/state/route/proof
hash is recomputed. `fixture-migration-manifest.json` records source path/hash, transform
version, target path/hash, and verification disposition. The unused T12 comment fixture is
not copied. README waits for a real new canonical browser frame rather than relabelling the
old screenshot.

- Verification: focused independent re-review closes every prior contract finding with
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
- Blocker: none for checkpoint 1.
- Next action at that checkpoint was the two-path BrowserPlatform capability implementation.

## N0 — canonical namespace acceptance

- Final source: `1a348c29c877981d960a78ed52507eff4f8f0a4f`.
- Browser evidence: `9a68dda`, bound to source `1a348c2`.
- Product names: Chinese `残局`, English `Endgame`, code `endgame` / `Endgame`.
- Active retired-literal and retired-filename gates: zero outside
  `src/legacyEndgameMigration.ts` and its direct test.
- Verification: typecheck; 52 passed / 2 skipped test files, 484 passed / 15 skipped tests;
  768-module build; five explicit canonical exact-certificate files, 24/24 tests.
- Evidence: four full 1440 x 900 Chromium frames, passing bilingual audit, canonical
  history v2, no extra Canvas or overflow, no console/page errors, 7/7 SHA-256 manifest,
  and released port 4217.
- Independent QA: `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
- Protected inherited T27/follow-up and `progress.md` paths remained outside every commit.
- Next action: create and independently review a canonical Intro-05 authoring contract.
  The stopped pre-N0 proof shards remain abandoned and may supply discovery clues only.

## F4E-R1 — canonical Intro-05 recovery contract candidate

- Task: `TETRIS-T37-F4E-ENDGAME-INTRO05-RECOVERY-001`.
- Base: `33ac2eb02e8828d25749229b2a5233abf6faae17`.
- Frozen Core tree: `e86bacb4f2595b1b1d0109509c14d87429e3c0f5`.
- Repository changes: docs contract/status only; no Core, fixture, product, evidence, or
  protected local path is opened.
- External clue: 633 bytes /
  `959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42`.
- External validator: 26,059 bytes /
  `6237614A8B1AB729E52E3AB466E9EA1DDF444321FDB7C1E3510A8DE468A9E773`;
  `node --check` and `--help` pass.
- Repair: the first review rejected `A5703556...2A875`; the current bytes add input/self
  pins, tracked/untracked Core isolation, `configFile:false`, post-proof reconciliation,
  Vite close-before-publish ordering, and quoted Windows command paths.
- Repair 2: review rejected `DD795484...D34B4`; the current bytes enforce a five-document
  committed-descendant allowlist and perform no I/O after atomic publication.
- Repair 3: publication-tail review rejected `5237C9A5...E67DB`; the current bytes mark
  staging ownership only after exclusive creation, use a random staging name, and publish
  through same-volume hard-link no-replace semantics with best-effort staging cleanup.
- Candidate output: absent; discovery and proof have not run.
- Boundary: stopped outputs supply setup/route clues only. The new validator rebuilds every
  board, route, support, admission, state/hash, and uncapped certificate result through the
  current canonical Core and writes only after all gates pass.
- Verification: two independent final-byte contract/validator reviews report
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`; the candidate was not run during review.
- Blocker: none; source remains closed by design.
- Next action: commit only the five contract documents, then run exactly the one candidate
  command frozen in `docs/DESIGN.md`. Failure is a stop condition, not retry authorization.

## F4E-R2 — default-heap exact-run stop

- Contract checkpoint: `fbcff2e`.
- Command: exact accepted command; validator, clue, Core tree, and output pins all matched.
- Coordinator observation: terminal reported exit `134`, 398.7 seconds, and default old-space
  exhaustion near 4,050 / 4,062 MiB in the uncapped current-Core certificate search. The exact
  historical telemetry is not independently recoverable and is not an acceptance premise.
- Independently reproducible facts: neither final output nor staging exists;
  validator/clue/Core are unchanged; the machine has 31.84 GiB physical memory; and Node
  exposes an 8.19 GiB heap with the proposed flag. Free physical and virtual memory are
  dynamic; both must exceed that heap limit in the immediate execution preflight.
- Recovery candidate: add only `--max-old-space-size=8192`, which local Node reports as an
  8.19 GiB heap limit. Do not change any validator byte, argument, proof domain, or route.
- Verification: independent resource-recovery review accepts with
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`, including the dynamic execution preflight.
- Next action: commit the docs-only recovery and execute exactly once if that preflight passes.
