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

## F4E-R3 — key-frontier proof recovery contract

- Recovery checkpoint: `5a31411`.
- Coordinator observation: preflight passed at heap `8.1875 GiB`, free physical
  `13.6352 GiB`, and free virtual `9.2452 GiB`; the validator then exited `134` after
  819.5 seconds with V8 reporting approximately `8152.1 / 8160.7 MiB`. These historical
  numbers lack a separately readable transcript and are not an acceptance premise.
- Postcondition: validator process count zero; final output absent; matching staging count
  zero; Core tree `e86bacb4f2595b1b1d0109509c14d87429e3c0f5`; Core worktree clean.
- Disposition: the 26,059-byte validator is retired. No rerun, larger heap, beam, cap,
  route swap, or domain reduction is authorized.
- Diagnosis: exact BFS holds full `GameState` frontiers and next-layer key-plus-state maps;
  representative state/key payloads are approximately 4.3/0.6 KiB before object overhead.
- Repair boundary: complete current 11-segment keys only in the frontier; strict canonical
  proof-equivalence representative at expansion; unchanged exhaustive landings, lower bound,
  layer dedupe, win rejection, and telemetry. Omitted score/line/clock history is explicitly
  varied in equivalence tests; real routes remain the only final-evidence source. Focused
  equivalence/reference tests plus existing exact fixtures are mandatory. An exhaustive
  `GameState` field policy with one primary storage class plus orthogonal modifiers, strict
  grammar, `B`/`R` and invariant rejection, proof-observed `piece-locked` projection, and
  per-field reject-or-equivalence coverage close the review findings.
- Source boundary: `endgameRouteSearch.ts`, `endgameRouteSearch.test.ts`, and one new
  `endgameRouteKeyFrontier.test.ts`; the proof-only wrapper does not narrow the general key.
- Verification: two independent read-only reviews both report
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. One covers field taxonomy, modifiers,
  strict grammar, lock-event observation, and historical evidence; the other confirms
  the contract against current Core lower-bound, landing, completion, telemetry, and
  replay semantics.
- Blocker: none at the contract boundary.
- Next action: commit this docs-only contract, then open only the exact certifier and
  its two focused test paths. No validator run or Intro-05 integration is authorized.

## F4E-R3-H1 — current-namespace certificate hash-sync contract

- Base/candidate inspected: `e09526b..a38fdbd`.
- F4E-R3 source checkpoints: `46a1efd` and `a38fdbd`.
- Exact-gate observation: Intro-01 through Intro-04 and the ten-row prototype pass;
  the five mastery cases retain every non-hash proof/replay literal and fail only their
  pre-namespace `initialStateHash` values.
- Causal check: the inspected range does not touch state-hash inputs, definitions,
  engine, board, pieces, or constants. Baseline already hashes the real started state
  before proof quotienting. `d623ef9` introduced the serialized `endgame*` names and
  current ordinary anchor assertions while missing the mastery literals.
- Proposed correction boundary: five literal replacements across only
  `src/endgameMastery.ts` and `src/game/core/endgameMasteryExact.test.ts`.
- Historical hashes remain provenance. Current replacements are `b9d99302`,
  `a5cb7240`, `845c1bd0`, `9aff892c`, and `79e3ebac` in the mappings frozen by the
  contract docs.
- Verification required: independent contract/drift review; focused mastery exact;
  complete six-file exact gate; typecheck; complete suite; build; exact-path diff check;
  independent QA of `e09526b..candidate`.
- Blocker: source remains closed until the contract review is all-zero.
- Sole next action: review and commit this four-document contract addendum.

## F4E-R3 — accepted candidate

- Accepted range: `e09526b..d467744`.
- Ordered checkpoints: `e09526b` contract; `46a1efd` key-frontier implementation;
  `a38fdbd` independent equivalence/reference tests; `c46e727` hash-sync contract;
  `d467744` five current-namespace hash literals.
- Gates: key-frontier `16/16`; registry `4/4`; mastery exact `5/5`; all six exact files
  `29/29`; typecheck; ordinary suite `492 passed / 15 skipped`; 768-module build;
  range diff-check clean.
- Independent final QA: `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` with no candidate drift.
- Browser evidence: not applicable to this renderer-independent Core/data repair.
- Protected worktree: inherited T27, T27-R1-follow-up, and `progress.md` remain outside
  every accepted commit.
- Blocker: Intro-05 source remains closed by design.
- Sole next action: author a docs-first successor-validator contract pinned to the new
  accepted Core tree, then obtain exact-byte independent review before one execution.

## F4E-R4A — successor-validator generation contract candidate

- Base: HEAD `7d81d4974ce8fb777ea105c5ef98d156cd1807cc`; Core tree
  `96688eca803a335790d65b41db0ace4df7d2f9b5`.
- Clue: unchanged 633 bytes / `959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42`.
- Initial state: v2 validator/output/staging absent; old real v1 output absent; Core clean.
- Proposed sole external write after contract acceptance:
  `t37-f4e-endgame-canonical-validate-v2.mjs` in the user Temp directory.
- V2 preserves the reviewed v1 semantic proof and fail-closed publication gates while
  changing only current pins, a fixed full-SHA `--expect-repo-base`, captured actual-HEAD
  stability, the exact four active-document allowlist, v2 identity, and public-seam
  isolation assertion.
- Generation and execution are separate capabilities. This checkpoint authorizes neither.
  After commit, generation may occur once; only bytes/hash plus syntax/help checks follow.
- Blocker: independent generation-contract QA.
- Sole next action: review this four-document contract; do not generate or run v2 yet.

### F4E-R4A first v2 byte review

- Rejected: 26,441 bytes / `3741327B110C8C9BD1D5F14C566BCDF1867DFF9A9A71DDEB4ED2E60213213B9B`.
- No validator execution occurred; syntax/help passed; output/staging/process counts are zero.
- Two independent reviews identify one P1: literal `--expect-head` in a future committed
  command is an impossible commit-hash self-reference.
- Repair: bind known repository base `4172a79620cda33e167d291d38c69f0ed64fec89`,
  require ancestry plus exact four-doc descendants, capture actual HEAD pre-proof, and
  require that captured value unchanged post-proof and in output.
- Blocker: repaired contract/bytes require fresh all-zero review.
- Sole next action: review and commit this four-document repair; do not run rejected bytes.

## F4E-R4B — repaired v2 bytes with rejected command

- Accepted external bytes: 26,928 / SHA-256
  `9EA5177E0D589431EAC393951FD78F1F6015CB8D37EF28E27566BE8623BBA762`.
- Static checks: UTF-8/LF/no BOM, exact v1 delta, syntax/help, output/staging/process zero.
- Two independent exact-byte/semantic reviews: P0–P3/GAP all zero; no proof run.
- Pins: Core base `7d81d4974ce8fb777ea105c5ef98d156cd1807cc`; repository
  base `4172a79620cda33e167d291d38c69f0ed64fec89`; Core tree
  `96688eca803a335790d65b41db0ace4df7d2f9b5`; clue 633 bytes / `959053...`.
- The DESIGN command is rejected history. Absence of an explicit heap flag does not bind
  `NODE_OPTIONS` or `process.execArgv`, and failure leaves no persistent attempt evidence.
- Blocker: successor fail-closed contract and fresh independent review.
- Sole next action: review the successor contract; do not execute these bytes.

### F4E-R4B adversarial command rejection

- Rejected validator: 26,928 bytes /
  `9EA5177E0D589431EAC393951FD78F1F6015CB8D37EF28E27566BE8623BBA762`.
- Governing verdict: `P1 1 / P2 1`; no execution occurred and output/staging/process are zero.
- Missing gates: committed exact-byte/argument manifest; per-commit rather than net history
  audit; exact-four changed union; clean committed contract paths.
- Repair boundary: runtime-derived committed manifest and per-doc validator marker;
  linear single-parent per-edge M-only no-rename audit; exact-four union; pre/post HEAD,
  committed blobs, and scoped worktree equality; audited chain in sourcePin.
- All clue/Core/route/causal/admission/proof/Vite/publication checks remain unchanged.
- Blocker: repaired docs/bytes need fresh dual all-zero review.
- Sole next action: review and commit this repair contract; do not run rejected bytes.

### F4E-R4B governing rejection R2 / fail-closed successor

- Governing review: `P0 0 / P1 2 / P2 1 / P3 0 / GAP 0`.
- Exact fixed receipt:
  `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v2.json`.
  Add required `--attempt`; require absent; after cheap pins and before project/Vite/proof,
  create canonical bytes with `open('wx')` + write + `sync`, keep the same handle through
  proof/publication, and require handle/path double reads plus identity before/after proof;
  only post-publication best-effort close is allowed. Never delete/replace; partial crash
  residue blocks restart, and successful output binds its hash/identity.
- Launcher gate: empty `process.execArgv`, no case-insensitive `NODE_OPTIONS` key, and
  manifest/receipt/output pins for real Node path/versions, executable bytes/SHA and
  default heap limit, all rechecked before publication. Exact PowerShell rejects
  `NODE_OPTIONS` before spawning absolute `E:\Nodejs\node.exe`.
- History gate: raw `diff-tree --name-status -z`; fatal UTF-8; terminal NUL; nonempty even
  `status,path` pairs; only literal `M` and the four authorized ASCII paths.
- Current output/attempt are absent and no proof has run. Current 26,928 / `9EA517...`
  bytes remain non-executable.
- Git subprocesses use a sanitized environment and replace suppression; exact toplevel,
  absent replace/graft/alternates, and raw NUL-safe scoped porcelain are mandatory.
  Direct backend `E:\Git\mingw64\bin\git.exe` is path/bytes/SHA/version-pinned; the
  `cmd\git.exe` launcher is not used.
- Two independent final reviews report `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` after the
  Git-backend and held-handle repairs. No proof or external-byte change occurred.
- Sole next action: exact four-doc contract commit; then modify/refreeze only the external
  validator. Execution remains closed.

### F4E-R4C implementation-domain clarification

- Receipt stays immutable: post-create dev/ino is retained for handle/path checks and
  successful output only, never written back into receipt.
- Random same-directory stage has exact enumerable `<output basename>.tmp-` prefix;
  prefix is empty before claim and the chosen path is bound in receipt/output.
- Manifest hash domain is exact line+LF; receipt payload hash domain is exact JSON+LF.
- Sole next action: commit this four-doc clarification, then resume external bytes only.

### F4E-R4D post-publication tail precedence

- P1/GAP found: R4A's post-link unlink-only tail conflicts with R4B's required
  post-publication receipt check/close and does not authorize final-path byte validation.
- Receipt-bearing v2 supersedes only that R4A tail. Exact order: verify final-path
  canonical bytes; repeat held-handle/fixed-path receipt byte/hash/identity equality;
  best-effort close the held handle; then exactly one best-effort owned-staging unlink
  attempt, which is terminal.
- Verification failure preserves output, receipt, and staging for audit; close/unlink
  failure is swallowed. No other post-link operation is admitted.
- Sole next action: independent all-zero contract review, exact four-doc commit, then
  external-byte static repair/review only. Production execution remains closed.

### F4E-R4E authenticated proof-loader repair

- Rejected external candidate: 46,755 bytes /
  `7FE655B13B741ABD3141FBB11B12A562BB3CE8D964CD567D444CE75026461766`.
- P1: ignored/unpinned Vite and its transform environment can execute forged exports
  despite clean Core blobs. P1: pre-link failure cleanup erases post-claim staging evidence.
- Contract repair removes Vite/createRequire/node_modules and uses pinned Node 24.12.0
  `stripTypeScriptTypes` over the exact 16 non-test Core HEAD blobs. Raw/transformed
  hashes and Git ids form a receipt/output-bound manifest reproduced after proof.
- Private Core-tree/Git-path URLs, raw-ASCII-path ordering, fixed fields, and UTF-8
  `JSON.stringify(entries)+LF` remove URL and manifest ambiguity.
- A no-delegation/no-I/O hook accepts four fixed-order entries and only strict
  `^\./[A-Za-z][A-Za-z0-9]*$` map targets; it remains through proof/post-proof checks and
  deregisters before staging. Exact two-key `NODE_*` byte/hash pins reject all other
  loader/cache/path/coverage/warning variables.
- Post-claim staging is never failure-cleaned; only R4D's terminal successful cleanup is
  allowed. Execution remains closed.
- Sole next action: independent contract review, four-doc commit, then external-byte
  repair and two fresh static reviews.

### F4E-R4F exact command materialization candidate

- External candidate freezes at 51,909 bytes / SHA-256
  `17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A`.
- UTF-8/LF, syntax, help, and zero-output checks pass. Three independent exact-byte,
  loader, and state-machine reviews each report P0-P3/GAP all zero; no proof ran.
- Independent Core transform manifest SHA-256 is
  `812F68F7642859B5EFCA8EC8FB0062E63F7A06942A118FDE150A92E325044CD4`.

F4E-R4B-COMMAND-CONTRACT-V1 validator=17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A

- DESIGN materializes the sole exact command manifest and fail-closed PowerShell wrapper;
  line+LF is 1,824 UTF-8 bytes / SHA-256
  `29BA027DA237B62BB7AC1459053C37299BC85B76F37A2A6416E9F2F71DBDA139`.
- Output/attempt/stage/process remain zero. Execution stays closed pending four-doc
  independent review and exact commit.
- Initial wrapper P1: a literal long-path regex missed forward-slash, relative, and 8.3
  aliases. Repair binds the actual CIM short basename `T312A0~1.MJS`, fails closed on
  unreadable Node command lines, and rejects either basename case-insensitively. The
  seven-case alias/null matrix passes; final diff review remains pending.

### F4E-R4G v2 consumed before claim; v3 contract candidate

- Committed R4F gate `4d297149fab5b4e4c1f510a96b8b4b7e464155ce` spawned v2 once.
  It rejected legal mixed-CRLF checkout bytes against LF HEAD at the pre-receipt scoped
  check. Git scoped diff/status was clean; no certificate search ran.
- Output/receipt/stage/process are zero, but v2 authorization is consumed. The exact v2
  file stays intact for audit and must never run again.
- v3 uses new validator/output/attempt/stage, marker/manifest, schemas, hashes, aliases,
  command schema `t37-f4e-r4g-command-contract-v1`, and one-spawn authority.
  `head-blob-eol-equivalent-v1` keeps Git clean gates, requires one-handle pre/post identity,
  separator-aware realpath containment, regular non-link files, strict UTF-8/no BOM, only
  CRLF-to-LF normalization, normalized equality to captured HEAD, and recursive Core
  extra/link/path-escape rejection.
- Proof continues to execute only transformed captured HEAD blobs. The new clean policy
  runs before receipt and publication and is bound in manifest/receipt/output.
- V3 inherits every other R4A–R4E loader/receipt/stage/hard-link/verification/tail/pin
  invariant. R4G changes only identity, one-shot authority, and the EOL-safe clean policy.
- Next: independent R4G contract QA and four-doc commit, then external v3 static repair
  and exact-byte review only. Its later exact wrapper checkpoint needs post-commit
  independent byte/hash, alias/null, AST single-spawn, and preflight all-zero QA before
  one production spawn. Production execution remains closed.

### F4E-R4H exact v3 command candidate

- V3 freezes at 57,181 bytes /
  `25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF`.
  Syntax/help, final 18-case 8,038-byte matrix, and three exact-byte reviews are green;
  no production arguments ran.

F4E-R4G-COMMAND-CONTRACT-V1 validator=25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF

- DESIGN contains the sole 1,874-byte manifest line+LF, SHA-256
  `8A30A76938B8CA9E148631AAAD97DDE68CB1F762BD29F803E56876CCE6BDA3AA`,
  and one-spawn wrapper. It pins intact v2/v3 and their 8.3 aliases, rejects either
  process namespace, requires both artifact namespaces absent, and rechecks all gates.
- Next: exact four-doc QA/commit, then post-commit bytes/manifest/alias/null/AST/preflight
  all-zero QA. Production remains closed until that successor review is green.

### F4E-R4I v3 receipt failure and v4 successor boundary

- R4I supersedes every R4H present-tense zero-state, execution, and next-action line;
  the earlier block is retained only as the pre-run log.
- R4H committed at `8911a9cf5e9356c3e8beb099f7db53aeb4944e51`; three pre-commit
  and three post-commit reviews, committed preflight, alias/AST gates, and the 18-case
  clean matrix were green. The coordinator then invoked the exact wrapper once.
- V3 wrote/synced an 8,729-byte receipt and failed before Core loader/proof because `wx`
  created a write-only handle which `verifyReceipt` immediately read (`EBADF`). V3 is
  consumed and may never run again.
- Receipt SHA is `06E9EACE16C6665FF4220D0753F0DFD5875C742FC1F56C9767771B1CB5A53E44`;
  payload SHA is `E1B6669502DE6055157347A83116053EAF9621D74993038A3A882F9F06C5448B`.
  Output/stage/process are zero. Preserve the receipt path and exact physical identity.
- Independent root-cause reviews report the expected P1 and agree on a new v4 generation.
  `wx+` retains exclusive create while adding held-handle read; the current runtime probe
  confirms same-handle/path equality and second-open `EEXIST` with zero residue.
- V4 must use fresh validator/output/attempt/stage, R4I marker/manifest and schemas, pin
  the consumed v3 receipt, expand identity through mode/nlink/times, and inherit every
  other R4A-R4G loader/clean/receipt/stage/link/tail invariant.
- V3 receipt checks occur at wrapper, v4 preclaim, post-proof/pre-stage, and immediate
  pre-link only. Windows wrapper owns the explicit `ReparsePoint` gate; Node does not
  overclaim arbitrary vendor-tag detection.
- Failure after a v4 claim performs no recovery/tail action; process exit owns OS-handle
  release and receipt/output/stage remain. Fault injection exists only in a hash-bound
  in-memory matrix derivative guarded
  by a separator-aware fixture-root mutation capability; production v4 exposes no seam.
- Next: independent review and exact commit of this four-doc R4I behavior contract only.
  External v4 syntax/help and receipt/clean/alias matrices follow; production is closed.

### F4E-R4K rejected R4J launcher and lease-runner recovery contract

- Base remains `50c757f7a2b53369ab9429379428fa8e039a2d63`. R4J never committed
  and no v4 production parameters ran; v4 attempt/output/stage/process remain zero.
- Frozen v4 and its 40-case receipt matrix retain their independent all-zero reviews.
  The rejected wrapper left a Node/Git executable hash-to-launch TOCTOU.
- Runner v1 is retired at 33,556 bytes /
  `4693199A84376488F66467BEACE6FCA3850C567E1F885B103EEF884876A6DE37`.
  Independent QA: `P0 0 / P1 1 / P2 2 / P3 0 / GAP 1` for final-component reparse
  following, image-query truncation, and pump deadlock/cleanup. It never ran production.

F4E-R4I-COMMAND-CONTRACT-V1 validator=93952536898D055B793E52A7957C821A51C26C78B0A87B5379D35B551349EC60

- DESIGN keeps the unchanged validator-argument manifest but removes the rejected
  wrapper. The manifest alone grants no execution authority.
- Fresh runner v2 must use an inline committed bootstrap plus root-to-leaf no-follow
  leases, held executable/input identities, suspended/image-bound Node, kill-on-close
  Job, continuously draining bounded pumps, and deterministic failure cleanup.
- This normal-budget correction prospectively authorizes a later coordinator-owned
  four-doc materialization up to 1,200 added/modified lines with whole-range verification.
- Execution is closed. Sole next action: freeze, fixture-test, and independently review
  runner v2; do not run v4 production parameters.

### F4E-R4L exact v4 command materialization candidate

- Base is `b5663ad0f5d1a6143eb209988ba04b6a72e77be2`. Only the four prospectively
  authorized command-contract documents are in this atomic candidate.
- Final wrapper: 64,125 UTF-8/LF/no-BOM bytes / SHA-256
  `278563AC435C57577DC1AD7F15FE1A99AD788DF2E187CE0ACFF1148C0D3FB9F6`.
  Final external static review reports `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
- Three earlier no-spawn runs failed closed before the sentinel and exposed only
  PowerShell array, automatic-variable, and ScriptBlock-scope defects. Every run left
  v4 output/attempt/stage/process zero and preserved the consumed-v3 receipt.
- The corrected 11,018-byte harness
  (`901C723726FC49322696109B9170F276F2BD06A612BD4C42CC4D65DD8811F5F9`)
  completed in 52.5 seconds with the sole expected PASS and unchanged sentinels.
- Blocker: production remains closed. Next: exact commit, independent committed-byte/
  AST/no-spawn QA, a QA-only THREAD_LOG checkpoint, then a fresh final-HEAD binding.

### F4E-R4M committed-command QA disposition

- Candidate `8416e9f6f094d70567f3a335dd534d4556f86563` is the sole child of
  `b5663ad0f5d1a6143eb209988ba04b6a72e77be2` and changes only the four authorized
  command-contract documents. Its 1,161 added-or-modified lines, exact path set, Core
  tree, strict UTF-8/LF Git blobs, four markers, unique 2,948-byte manifest, embedded
  wrapper bytes, PowerShell AST, two preflights, two lease-bound runner calls, and sole
  302-byte production block all passed two independent read-only reviews with
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
- After those approvals, the hash-bound no-spawn harness ran once against candidate
  HEAD and completed in 48.937 seconds with the sole output
  `T37-R4L-NO-SPAWN-PREFLIGHT-PASS`. V4 output, attempt, stage, and matching process
  remained zero; the consumed-v3 receipt remained 8,729 bytes with SHA-256
  `06E9EACE16C6665FF4220D0753F0DFD5875C742FC1F56C9767771B1CB5A53E44`.
- This is QA evidence only, not a production run. Production remains closed until this
  THREAD_LOG-only checkpoint is committed, its final HEAD/history/blob state receives
  fresh independent all-zero review, and one final no-spawn binding passes unchanged.

### F4E-R4N v4 consumed without candidate

- Final HEAD `917673c8147a2ed6dc110208e1e5c34bba57ae33` passed two independent
  all-zero static reviews and one final no-spawn run in 49.562 seconds with the sole PASS.
- The exact production wrapper was then invoked once. The command transport timed out with
  exit 124 at about 64 seconds while the wrapper and sole validator child were still live;
  later observation found both exited, candidate absent, staging absent, and no matching
  process. No second production invocation occurred or is allowed.
- The resulting v4 attempt receipt is 9,803 bytes / SHA-256
  `5620C50C50859FFE6225C0D5A97D9DD43B029F30D552525A0A0CDCC250D581F1`.
  Its canonical payload+LF hash is
  `09E5A163A9F5CFC8928B1A5B05FFC33D7A1CF71D4C5A7EAC1AEE8C9FE4A0176D` and binds
  schema `t37-f4e-r4i-attempt-v1`, final HEAD, inputs, runtime, Core tree, and intended
  stage path. It has no result/error tail and cannot support an Intro-05 certificate claim.
- V4 is permanently consumed. Preserve every v3/v4 receipt and namespace. A later Endgame
  recovery requires a fresh successor contract; it may not reuse or replay this command.
- The player next opens precise `0.60 -> 0.08 s/cell` Classic/Mutation gravity, `0.80`
  Ice, row-causal Bomb bands, and Bomb-on-Bomb chain clear. Survival is design-output only.

### F4E-R5 v5 generation contract

- Base is Material terminal `b177b206db3729ae37351c287b18afa35b7df54c`; Core tree is
  unchanged at `e9b3a3ed0d001072f5291a8fc841c1849e4db44f`.
- Material/Ice technical proof is closed at `407/407` with independent
  `P0/P1/P2/P3 = 0/0/0/0`; subjective review remains deferred.
- Validator/candidate/attempt/terminal v5 are a fresh four-path external namespace and are
  all absent. V1-v4 remain consumed or rejected and are not proof or execution inputs.
- The candidate geometry and two seven-lock route strings are frozen only as clue data. V5
  must rederive every setup, admission, replay, two-hop support, hash, and uncapped certificate
  result through current Core.
- One non-writing preflight precedes one exclusive production attempt. Two independent
  byte/AST/no-spawn reviews must be all-zero before that attempt. Failure consumes v5.
- Next: commit this four-document contract, create/freeze only external validator-v5, review
  exact bytes and command, then run the sole attempt. The four Intro-05 source paths remain
  closed until independent candidate audit succeeds.

### F4E-R5 R1 rejection and R2 command candidate

- R1 docs `61bd33b` and validator 26,911 bytes / `0F4CA8...D543` are rejected without any
  preflight or production run. Docs QA is `P0/P1/P2/P3/GAP = 0/5/2/0/0`; byte QA is
  `0/2/2/0/1`. Attempt/candidate/terminal remain absent.
- R2 validator is 35,284 bytes / SHA-256
  `4BFCCB919DDD8C17D639293B9439E22F79B9840C8BB1E36985D8CCCBBFCBD950`.
  It replaces Vite with a fixed Node built-in transform/private loader over 16 captured HEAD
  Core blobs, pins direct Git and linear four-doc authority, corrects the fixture to 19 keys,
  and moves terminal ownership outside the validator after process exit.
- Any attempt/candidate without a valid success terminal is consumed failure. Integration
  also requires a committed `F4E-R5-CONSUMED-V1` receipt after independent output audit.
- Next: commit the corrected four docs, obtain two all-zero byte/AST reviews and one all-zero
  no-write preflight. Production remains closed.

### F4E-R5 R2 rejection and R3 exact-byte candidate

- R2 `4BFCCB...D950` is rejected at `P0/P1/P2/P3/GAP = 0/1/1/0/1`: it lacked a
  frozen outer terminal owner, allowed non-local loader delegation, and drifted during review.
  It never ran preflight or production; all three output/receipt paths remain absent.
- R3 validator is 43,058 bytes / SHA-256
  `888EF45F638DB072A0EFBA06869B1FA10BD31EAA8D0E323E3593F809F46A083B`.
  One audited outer process owns attempt/worker/terminal; one same-byte worker owns captured
  Core proof/candidate only. Both use exact `--expect-head`; the private loader rejects every
  non-`./` and unbound Core import.
- Next: commit these four R3 docs, obtain two new all-zero static reviews, then create and
  audit a THREAD_LOG-only final binding head. Production remains closed.

### F4E-R5 R3 rejection and R4 command candidate

- R3 `43,058 / 888EF45F...083B` is rejected before any preflight/production invocation.
  Independent totals are `P0/P1/P2/P3/GAP = 0/1/2/0/0` and `0/2/0/0/0`: close/reap could
  be bypassed by transport error, pipe retention was unbounded after overflow, exact Node
  values were not frozen, direct-worker continuity was insufficient, and Git replace/helper
  execution was open. All persistent v5 paths and stages remain absent.
- R4 is 55,930 UTF-8/LF/no-BOM bytes / SHA-256
  `02439F7DC439CFEDD521719E06AC2930E101CE8E28BA1F0B3D893FBA15B48A4A`.
  Syntax passes. It freezes exact Node values; closes/rechecks Git replace, helper, config,
  metadata, shallow/partial-clone, Core and authority-doc domains; and retains the sole private
  captured-Core loader, worker spawn, and exact-certificate call.
- Production attempt is now nine-key canonical receipt plus stdin-only 32-byte capability,
  complete pre/post receipt verification, bounded incremental streams, error-safe close/reap,
  and derived residual-process state. The capability provides honest-coordinator continuity,
  not same-permission identity. Active same-user artifact/executable/history forgery is an
  explicit governance violation recorded in source pin; candidate without the audited outer
  success terminal remains integration-invalid.
- Next: exact four-doc commit and two fresh independent all-zero static reviews. Only after a
  subsequent THREAD_LOG-only binding commit and exact-HEAD command audit may preflight run.
  Production remains closed.

### F4E-R5 R4 committed static-QA disposition and final-binding candidate

- Exact command-contract candidate `29a75980ab5b92afc654f750a5039122683521f9` changes only
  the four authorized governing documents from parent `d767c7c`; Core remains
  `e9b3a3ed0d001072f5291a8fc841c1849e4db44f`. Validator remains exact at 55,930 bytes /
  `02439F7DC439CFEDD521719E06AC2930E101CE8E28BA1F0B3D893FBA15B48A4A`.
- Two fresh independent read-only reviews of that committed HEAD and exact external bytes each
  report `P0/P1/P2/P3/GAP = 0/0/0/0/0`. They independently bind linear four-doc authority,
  marker/hash, Node/Git/environment, captured-Core loader, geometry/admission/routes/support,
  schema-8 output, capability/attempt, truly bounded streams, close/reap, publication, and the
  honest-coordinator governance boundary. Neither review ran any validator mode.
- Fail-closed boundary checks are explicit: synchronous pre-child spawn failure leaves an
  attempt-only consumed state; terminal link followed by failed stage removal yields nonzero
  outer exit plus real stage residue, so complete output audit rejects it regardless of the
  terminal payload. Final audit must always rescan the actual namespace and process exit.
- Candidate, attempt, terminal, both stage prefixes, and matching validator/worker processes
  remain zero. The commit containing this section is the sole final-binding candidate. It must
  receive fresh exact-HEAD/history/blob/command review before one no-write preflight; production
  remains closed until that preflight result and post-state are independently accepted.

### F4E-R5 v5 consumed resource-failure receipt

F4E-R5-CONSUMED-V1 {"head":"d5a95ff765f2a018da8c7409e2a923fb69ad1110","validator":{"path":"t37-f4e-endgame-canonical-validate-v5.mjs","bytes":55930,"sha256":"02439F7DC439CFEDD521719E06AC2930E101CE8E28BA1F0B3D893FBA15B48A4A"},"attempt":{"path":"t37-f4e-endgame-canonical-attempt-v5.json","bytes":5209,"sha256":"2A9CA91B23CAA5AB0E03C83B62B9F251F28761C887C2B798AC9943A5EC28A1A8","runId":"9cc9e97fae7c4fc3c1223195"},"candidate":{"path":"t37-f4e-endgame-canonical-candidate-v5.json","present":false},"terminal":{"path":"t37-f4e-endgame-canonical-terminal-v5.json","bytes":6873,"sha256":"EDF1BB238647604DB5965FC68AC78CB001D36957BA9233106BC9AD3ACD9796AB","status":"failed","passed":false,"workerExitCode":134,"signal":null},"outerExitCode":1,"stagingFiles":[],"matchingProcesses":[],"failureClass":"node-default-heap-oom","stderr":{"bytes":1389,"sha256":"2ECC09B0935CEA7DE16F9E60695D0A9936D8C77C51B9C1A11617460879D4F285"},"audit":"P0/P1/P2/P3/GAP=0/0/0/0/0+0/0/0/0/0"}

- The sole production invocation ran from `2026-08-16T18:29:33.473Z` through
  `2026-08-16T19:06:32.252Z` (`2,218,779 ms`). Its worker was observed closed and reaped,
  all transport-error fields are null, stdout is empty, and the complete 1,389-byte stderr
  records V8 allocation failure and `JavaScript heap out of memory` near the default
  `4,115.1 MB` heap limit.
- This is a fail-closed resource exhaustion after the exclusive attempt receipt was durably
  claimed. It permanently consumes v5. The validator, attempt, and terminal remain immutable;
  candidate absence, zero stage files, and zero matching processes are part of the receipt.
  V5 must not be rerun, renamed, repaired in place, or presented as an Intro-05 certificate.
- The failure does not prove the definition unsatisfiable or the supplied seven-lock route
  non-optimal: the exact traversal never completed and produced no negative certificate.
- Two fresh independent read-only output audits each report
  `P0/P1/P2/P3/GAP = 0/0/0/0/0` for this consumed-failure claim. They do not accept product
  integration.
- Next action: independently review this THREAD_LOG-only receipt, then author a docs-first
  successor contract in a fresh v6 namespace. Any v6 attempt must pin its explicit heap
  execution domain and pass new static reviews, final-HEAD binding, and a no-write preflight;
  it is a new attempt, never a v5 retry. Intro-05 source remains closed.

### F4E-R6A memory-bounded exact frontier contract candidate

- Base is consumed-v5 receipt commit `77e2427`. V5 validator, attempt, and terminal stay
  immutable; candidate is absent. This slice neither reruns v5 nor opens v6.
- Current Core retains a whole current frontier plus a whole next-layer string `Set`; the
  default-heap failure shows that representation is not a viable 46-certificate foundation.
- The candidate contract opens exactly `src/game/core/endgameRouteSearch.ts`, one focused
  Core test, `scripts/endgame-disk-frontier.mjs`, and one focused adapter test. Core receives
  an optional store and keeps an in-memory default; browser/product behavior remains unchanged.
- The authoring adapter writes complete canonical ASCII keys under an exact empty staging
  directory, uses a 64 MiB raw-key chunk budget, deterministic sort/full-key dedupe, and
  bounded k-way merge. Hash-only or lossy identity is forbidden.
- Equality covers Intro-01 through Intro-04 and synthetic domains, including proof telemetry.
  Fault matrices cover all I/O/finalize/dispose paths and require no certificate on failure.
  Intro-05 and every partial or sampled variant remain prohibited during infrastructure QA.
- Next: commit these four governing documents, obtain independent all-zero contract review,
  implement the four-path infrastructure candidate, run focused plus final gates, and obtain
  independent source QA. A separate docs-first v6 contract is the only later proof authority.

### F4E-R6A R1 rejection and R2 contract candidate

- R1 `c1b598d` independent reviews reject implementation at
  `P0/P1/P2/P3/GAP = 0/2/1/0/0` and `0/2/3/0/1`. No source implementation began.
- R2 names the exact synchronous Store API and the two previously missing test paths. Existing
  certifiers remain synchronous/source-compatible and Core never imports Node or the adapter.
- Full-key storage now has precise ASCII/LF/2048-byte framing, 64 MiB and 131072-record chunk
  limits, 32-way deterministic multi-pass merge, 64 KiB reader and 1 MiB writer limits, strict
  output revalidation, descriptor recount, and complete-byte comparison.
- Exact created-file registry cleanup closes handles before unlink, refuses foreign entries,
  aggregates primary/cleanup failures, exposes residue, and is tested through injection plus
  the real Windows filesystem. The honest-caller/same-permission staging boundary is explicit;
  a later v6 terminal owner must bind and rescan its own namespace.
- Next: commit only this four-document R2 correction and obtain two fresh all-zero reviews.
  The four source paths and all proof execution remain closed meanwhile.

### F4E-R6A R2 split verdict and R3 contract candidate

- R2 `731ba8c` receives one all-zero review and one rejection at `0/1/3/0/1`. The blocking
  issue is proof completeness: a high-level Store could omit a next-layer key while reporting
  a self-consistent size. Tail groups, metadata bounds, and residue observation also drifted.
- R3 changes the seam to immutable run persistence. Core owns every emitted-key chunk, sort,
  full-key dedupe, deterministic 32-way pass, merge, count, and exact post-write/recomputed-
  merge byte comparison before input disposal. Arbitrary Store code is not trusted proof input.
- Empty/one/31/32/33 groups and the 4097th-chunk failure are exact. At most 4098 active
  descriptors/registry/residue/errors are retained; diagnostics has explicit truncation and
  remains callable after dispose. Same-size omit/add/replace faults must all fail closed.
- Next: commit this four-doc R3 correction and obtain two fresh all-zero reviews. No source or
  proof execution is open before that result.

### F4E-R6A R3 split verdict and R4 wording correction

- R3 review A is all-zero; review B reports only `P2 1`: cleanup errors were both promised in
  full and capped at 4098. R4 retains at most 4098 normalized errors plus one mandatory
  omitted-count truncation sentinel. The sentinel and diagnostic flag are fatal and observable.
- Next: commit this four-doc wording correction and obtain fresh all-zero confirmation. Source
  and proof execution remain closed.

### F4E-R6A accepted source and evidence receipt

- Contract terminal commit is `076d5b9`. Implementation `510f287` changes only the four
  authorized source/test paths; `858fa88` adds only the two authorized test files needed to
  physically prove the default 64 MiB/131072-record limits, real 4098-entry diagnostics, and
  Intro-01 through Intro-04 memory-versus-disk equality.
- Final coordinator results are focused `44 passed / 2 exact skipped`, typecheck, complete
  suite `588 passed / 17 skipped` in `58 passed / 2 skipped` files, production build,
  Node syntax, and diff check. The opt-in candidate run passes `46/46`.
- Independent QA-1 and QA-2 each report `P0/P1/P2/P3/GAP = 0/0/0/0/0`. QA-2 independently
  reran the exact disk suite at `46/46` in 142 seconds. Neither review executed Intro-05.
- R6A is accepted and frozen. It does not authorize v6 production. Next is a separate
  docs-first v6 contract binding these exact blobs and a fresh external namespace.

### F4E-R6B v6 proof contract candidate

- Base is accepted R6A receipt `7dc6b74`. The contract freezes Core/src trees, route and
  disk-adapter blobs/hashes, the exact five-path v6 namespace, R5 clue semantics, schema-8
  candidate, and immutable consumed-v5 predecessor descriptors.
- Runtime is Node v24.12.0 with ordered `--disable-warning=ExperimentalWarning` and
  `--max-old-space-size=6144`; observed heap limit is `6643777536` bytes. The worker must
  call the exact certifier with the accepted `{ runStore }` and cannot fall back.
- The sole preflight is no-write/no-spawn and forbids all Intro-05 exact/partial work. Outer
  owns attempt/terminal; worker owns proof stage/candidate; both inspect real residue.
  Attempt existence consumes v6 on all outcomes.
- Next: commit and obtain two independent all-zero reviews of this four-doc contract. No v6
  artifact, stage, validator execution, or Intro-05 source edit is authorized yet.

### F4E-R6B R1 rejection and R2 executable contract

- R1 `e72c2e3` is rejected by three reviews at `0/2/1/0/0`, `0/4/3/0/0`, and
  `0/4/2/0/0`. No v6 path was created and no validator mode or Intro-05 search ran.
- R2 separates the exact validator control path from the absent mutable namespace, freezes
  absolute paths, ordered CLI/worker argv, complete source checks before attempt/around proof,
  durable attempt claim, no-replace candidate/terminal, bounded transport, exact schema and
  receipt shapes, controlled success cleanup, and immutable failure evidence.
- The source pin explicitly records the honest-coordinator/no-same-permission-forgery boundary.
  Correct source integration remains exactly definitions, Intro-05 fixture/test, and the
  Intro-04 accepted-prefix assertion.
- Next: commit R2 and obtain two fresh all-zero contract reviews. Validator authoring and all
  proof execution remain closed.

### F4E-R6B R2 rejection and R3 closure candidate

- Decisive R2 reviews are both `P0/P1/P2/P3/GAP = 0/2/2/0/0`. No validator or v6 mutable
  artifact exists; no proof ran.
- R3 fixes role-local process exclusion, all missing list truncation flags, receipt descriptor
  shapes, line-anchored canonical markers, and the zero-artifact preclaim-abort authority.
- Later integration is exactly six paths: the prior four plus the Core and real-disk R6A
  equality tests. Those two may only pin/iterate the accepted first-four prefix and remain
  prohibited from fixture/proof 05.
- Next: commit and obtain two fresh all-zero R3 reviews. Authoring and execution stay closed.

### F4E-R6B R3 split verdict and R4 process candidate

- R3 reviews are `0/0/0/0/0`, `0/0/0/0/0`, and `0/1/1/0/0`. The remaining issue is the
  unavailable global-process API under the validator's subprocess allowlist.
- R4 records only the validator-owned worker internally and binds worker `process.ppid` through
  attempt `outerPid`. A pinned, read-only PowerShell/CIM EncodedCommand is the coordinator's
  bounded global scan before/after preflight and production.
- The preclaim-abort marker now has exact anchored keys and replacement-HEAD validation.
- Next: commit and independently review R4. Validator and every v6 runtime path remain absent.

### F4E-R6B R4 split verdict and R5 governance candidate

- R4 reviews are `0/0/0/0/0`, `0/0/0/0/0`, and `0/1/0/0/0`. The validator cannot detect
  reuse of a HEAD after a deliberately zero-artifact preclaim abort.
- R5 records per-HEAD single invocation as honest-coordinator governance, while retaining
  audited strict-ancestor abort markers for replacement bindings and durable attempt as the
  only technical consumption boundary.
- Next: commit and obtain two all-zero R5 reviews. Authoring/execution remain closed.

### F4E-R6B frozen validator static-QA and command-pin candidate

- R5 governing HEAD is 27d1fff0d0540f584fc33ada77dc83705579eed6.
- Validator
  C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v6.mjs is
  89,769 bytes / SHA-256
  7F843B3BB22BF40881C25310B8D0881B172E828F46E468FBCD956CBE1677A311,
  UTF-8 without BOM, LF-only, and one trailing LF. Its sole syntax check passed.
- QA-A and QA-B independently read the complete 2,020-line source and each report
  P0/P1/P2/P3/GAP = 0/0/0/0/0. They close ordered CLI, frozen source/runtime/predecessor,
  linear authority, private loaders, forced disk Store injection, candidate reconstruction,
  bounded transport, close/reap, atomic publication, stage/residue, and R5 governance.
- Neither review invoked Node/import, any validator mode, Store creation, Intro-05, or exact
  search. Mutable v6 state and publication residue remain absent.
- This four-doc candidate pins the one validator marker, the exact public CLI, and exact
  PowerShell/CIM encoded process gate. Commit and review the exact range twice. Only then may
  one THREAD_LOG-only final-HEAD binding be added and reviewed twice; execution remains closed.

### F4E-R6B command-pin accepted and final-binding candidate

- Command-pin commit b5c1ecf9496fef6e71452e8896fb71e75439edea changes exactly the four
  authority documents from parent 27d1fff0d0540f584fc33ada77dc83705579eed6.
- Validator remains frozen at 89,769 bytes / SHA-256
  7F843B3BB22BF40881C25310B8D0881B172E828F46E468FBCD956CBE1677A311.
  The command marker is exactly one; consumed and preclaim-abort markers are zero.
- Fresh command QA-A and QA-B each report P0/P1/P2/P3/GAP = 0/0/0/0/0. They independently
  bind the linear four-document authority, validator identity, 13 ordered CLI pairs, Node
  flags, v5 predecessor, R5 governance, and the 2,832-character Base64 payload. The payload
  decodes to the exact 1,062-byte ASCII/LF source with SHA-256
  06645CCADA1DD038E4CF78A6DD4FEBD169DE4AE51076880EDF1F383B51F1556A.
- Both reviews confirm attempt/candidate/terminal/frontier and both publication prefixes are
  absent. Neither executed Node/import, process gate, validator mode, Store, or Intro-05.
- The commit containing this section is the sole final-binding candidate. Its exact resulting
  HEAD replaces FINAL_QA_BINDING_HEAD in the frozen public arguments only after two fresh
  exact-HEAD/history/blob/command reviews each return all-zero. Until then, process gate,
  preflight, worker, production, Store, and Intro-05 remain closed.

### F4E-R6B post-attempt interruption reporting candidate

- Final binding `8776bb8` opened the accepted one-use v6 command. Its no-write preflight
  passed, and the sole production invocation durably claimed canonical attempt run
  `b091b231d8ba8f7c68e5a92b` before the coordinating turn was interrupted.
- Recovery binds the exact validator and source pin, the 7,227-byte attempt at SHA-256
  `5B1F18B8601CA57FD9BA8C977008C1F7B55B5CACEE606A6D20239522BEF2F132`,
  absent candidate and terminal, empty publication residue, and one retained frontier entry.
  `d0005-p0002-g0000.run` is 9,151,727,935 bytes at stable SHA-256
  `1C9993ABAC88255AAEC924C7696F444C640AF9A701F9B20653E229793C896DCC`.
- The original execution cell and outer-exit observation are permanently unavailable.
  Contemporary Windows logs do not establish a Node crash, OOM, shutdown, restart, signal,
  or terminating actor. No lifecycle result will be invented.
- The exact 32-byte empty process result is the first retained recovery scan, not the lost
  immediate post-exit gate. It establishes no matching process at recovery only and does not
  retroactively prove orderly worker close/reap.
- This four-document candidate clarifies that a consumed-attempt receipt may use JSON `null`
  for `outerExitCode` only in this externally interrupted, permanently unobservable branch.
  It always denotes failure after authority consumption; strings and guessed integers are
  forbidden. The frozen canonical key order remains unchanged.
- No consumed marker is written in this candidate. First obtain two independent all-zero
  contract reviews and two independent output audits. Only then may one THREAD_LOG-only
  canonical receipt be committed and reviewed twice. V6 residue remains immutable; retry,
  resume, cleanup, Intro-05 source integration, and successor proof execution stay closed.

### F4E-R6B consumed v6 interruption receipt

- Contract commit `7e4dfae790817918637bd6b3998c5581b3036e79` received two independent
  `P0/P1/P2/P3/GAP = 0/0/0/0/0` reviews. They accept only the narrow JSON `null`
  exit-observation branch and confirm one command marker plus zero consumed/preclaim markers.
- Two later independent read-only output audits each report
  `P0/P1/P2/P3/GAP = 0/0/0/0/0`. Both bind production HEAD `8776bb8`, the exact source and
  predecessor pins, canonical attempt and run-ID reconstruction, absent candidate/terminal,
  empty publication residue, the retained frontier identity, and the frozen recovery gate.
- The retained frontier has exactly `d0005-p0002-g0000.run`, 9,151,727,935 bytes, created
  `2026-08-17T00:12:33.2840720Z`, last written `2026-08-17T00:16:32.5609195Z`, SHA-256
  `1C9993ABAC88255AAEC924C7696F444C640AF9A701F9B20653E229793C896DCC`, and stable Windows
  File ID `0x0000000000000000008600000000d63c`. Both audits fully recomputed the SHA;
  audit A's read ran from `2026-08-21T00:50:37.1827294Z` to `00:50:46.6175207Z`, with
  unchanged path, length, timestamps, attributes, link target, and File ID.
- The lost immediate post-exit scan is not reconstructed. The first retained recovery scan
  occurred during 2026-08-21 coordinator recovery before this receipt sequence; its original
  capture did not retain a wall-clock field but did retain the exact 32-byte canonical output
  `{"entries":[],"truncated":false}`. Fresh audit-bound scans at
  `2026-08-21T00:57:30.3033238Z` and `2026-08-21T01:01:48.2160173Z` each exited zero with
  the same stdout SHA-256
  `EF295A612DED67CBBE2F7B9E1B0F42C9C80F74AD3EFA5FFF2E5CBA6021CEFDB6` and zero-byte
  stderr. These are recovery observations only and prove no orderly close/reap or empty gap.
- For planning only, the most specific supported failure class is
  `external-lifecycle-interruption-after-depth-5-merge`. It is an inference from the live
  observation and stable stage chronology, not a validator terminal result and not evidence
  of OOM, a Node crash, a signal, or a specific terminating actor.

F4E-R6-CONSUMED-V1 {"head":"8776bb8adf9f5042266966a4cebaef63e25ea526","srcTree":"6115144d171aa6305de1fdaca8abd7b145e2ca13","coreTree":"9628592aed3c66de1386bc45efdd4766fc5c29db","validator":{"path":"t37-f4e-endgame-canonical-validate-v6.mjs","bytes":89769,"sha256":"7F843B3BB22BF40881C25310B8D0881B172E828F46E468FBCD956CBE1677A311"},"attempt":{"path":"t37-f4e-endgame-canonical-attempt-v6.json","present":true,"bytes":7227,"sha256":"5B1F18B8601CA57FD9BA8C977008C1F7B55B5CACEE606A6D20239522BEF2F132","runId":"b091b231d8ba8f7c68e5a92b"},"candidate":{"path":"t37-f4e-endgame-canonical-candidate-v6.json","present":false,"bytes":null,"sha256":null,"passed":null},"terminal":{"path":"t37-f4e-endgame-canonical-terminal-v6.json","present":false,"bytes":null,"sha256":null,"status":null,"passed":null},"outerExitCode":null,"frontierStage":{"path":"t37-f4e-endgame-canonical-frontier-stage-v6","present":true,"entries":["d0005-p0002-g0000.run"],"entriesTruncated":false},"publicationStages":[],"publicationStagesTruncated":false,"matchingProcesses":[],"matchingProcessesTruncated":false,"audit":"P0/P1/P2/P3/GAP=0/0/0/0/0+0/0/0/0/0"}

- Receipt disposition: v6 is permanently consumed and failed closed. Candidate and terminal
  are absent; `outerExitCode:null` records only the permanently unavailable observation. Do
  not retry, resume, rename, repair, clean, or use the retained run as successor proof input.
  This marker opens no Intro-05 source. Two exact-marker/commit reviews must accept this sole
  receipt before a fresh docs-first successor can open.

### F4E-R7A fresh resumable infrastructure contract candidate

- Receipt `109f785` received two independent all-zero exact-marker reviews and permanently
  closes v6. The retained frontier is immutable failure evidence and a capacity clue only;
  every R7 source/runtime path is forbidden from opening or deriving proof data from it.
- The six reserved R7 external paths are absent. R7A creates none and authorizes no
  validator, scheduled task, runner, attempt, checkpoint, production Store, or Intro-05.
- The exact source boundary is `endgameRouteSearch.ts`, its frontier Store test,
  `endgame-disk-frontier.mjs`, and its authoring test. Existing certifiers stay compatible.
- Core gains a separate exact advance/checkpoint path with 65,536-parent units, range and
  cursor validation, complete coverage, deterministic merge, final-depth no-output
  exhaustion, safe counters, and canonical certificate/telemetry equality.
- The Node adapter persists Core-produced generations through owner-bound run/index hashes,
  exact ordinal offsets, manifest-last atomic publication, stable identity, suspend without
  deletion, and bounded diagnostics. Unknown or ambiguous residue fails closed.
- Next: commit these four authority docs and obtain two independent all-zero contract reviews.
  Then one writer may implement only the four source/test paths, run all named gates, and
  produce a bounded candidate for two source reviews. External R7B authority remains closed.

### F4E-R7A R1/R2/R3/R4 rejected and R5 contract candidate

- R1 `b697625` is rejected at `0/3/2/0/0`. No source, Store, external path, or proof ran.
- R2 closes indexed late-range complexity, early-empty completion, parent-bound ordering,
  separate last-unit/layer commits, seed/unit/merge ID collision, exact inclusive byte/unit
  limits, and the mismatch between Core's 4,098 active metadata and persistent files.
- The persistent store now has a 32,768-manifest hash chain, 49,152-entry inventory, explicit
  96/96/192 GiB active/working/physical run accounting, and 1 GiB auxiliary accounting.
  Superseded cleanup residue is recognized but blocks further advance until later authority.
- R2 `09da746` is independently rejected twice at `0/1/0/0/0`: unspecified full snapshots
  could repeat accumulated descriptors quadratically and consume 1 GiB before 4,096 units.
- R3 uses immutable constant-shape deltas with a previous-byte hash, at most one added run,
  hash-selected removals, reconstructed checkpoint hash, one-pass replay, and five-digit
  generation IDs. Manifests are capped at 16 KiB each/512 MiB aggregate; owner plus every
  index uses a separate 512 MiB aggregate/64 KiB per-file cap.
- The default-limit test must serialize/replay 32,768 retained deltas including a 4,096-unit
  layer and prove linear reconstruction plus both auxiliary halves without production proof.
- R3 `c0c03f2` is rejected at `0/4/1/0/0`, `0/2/0/0/0`, and `0/2/2/0/1`. It lacked a
  deletion-free release path under 4,098 slots, incremental hashes, exact nested/API schemas,
  unique working IDs, no-replace commit, complete part recovery, and real maximal merge QA.
- R4 freezes all of those: logical committed-run release/deferred reclamation, constant-size
  accumulator state, exact binding/checkpoint/descriptor/hash shapes, exact Store/advance
  signatures, disjoint final/working ID coordinates, hard-link commit, and three residue
  classes with `advanceAllowed:false`.
- The maximal matrix now executes a synthetic 4,096-input 32-way merge and proves metadata,
  byte-retention, working-ID, no-replace, and residue invariants without production proof.
- R4 `fdb815b` is rejected at `0/2/2/0/0`, `0/2/0/0/0`, and `0/2/2/0/1` for the one-lock,
  max-unit, tip, alias-count, incomplete-part, suspend, depth, and owner-identity edges.
- R5 defines zero-decision completion, exact-max unit release/rehydration, authenticated
  nullable tips, per-name alias accounting, all incomplete owned subsets, nonthrowing suspend,
  five-digit depths, and same-open owner validation. Its maximal QA covers both unit and layer.
- The former R5 review next action is superseded by the R6 disposition below. The four source
  paths remain closed meanwhile.

### F4E-R7A R5 rejected and R6 contract candidate

- R5 `be35aa9` is reviewed independently at `0/0/0/0/0`, `0/2/1/0/0`, and `0/1/1/0/1`;
  reproducible findings reject it despite one all-zero review.
- R6 replaces the retained next-run object array and released descriptor tokens with an opaque
  adapter-owned collection that consumes zero Core slots and opens one exact batch of at most
  32. Unit publication carries only previous tip, scalar delta, and at most one new run; layer
  merging releases the frontier and every bounded batch before opening the next.
- Nonnull expected-tip authentication now precedes all residue classification. Exact empty and
  owner-part stages are blocked only for a null expected tip; invalid owner finals and any
  missing/short/mismatching nonnull tip are fatal rollback.
- Index bytes are deterministic from run size and both future names/byte aliases are admitted
  before `.idx.part` creation. A new resume Store performs one full authentication scan;
  repeated same-Store loads use cached authenticated inventory, and range data begins at the
  indexed offset. I/O-count, empty-stage, and pre-part quota tests are mandatory.
- The former R6 review next action is superseded by R7 below. Core, adapter, external R7
  paths, proof execution, and Intro-05 remain closed.

### F4E-R7A R6 rejected and R7 contract candidate

- R6 `67091e4` is rejected independently at `0/1/4/0/1` and `0/1/1/0/1`.
- R7 exports the binding alias, requires safe collection coordinates, and fails invalid opens
  before any reader/slot. Committed view disposal is an idempotent logical release with no
  unlink; publication or terminal suspend consumes the only view and invalidates every object.
- Owner-final-only/null-tip is the clean advanceable pre-seed state; the nonnull-tip branch is
  rollback. Precommit residue is nonempty. Postcommit cleanup may leave any exact bounded
  historical data/index half subset, alone or with a manifest alias, while retaining the
  highest tip and blocking advance.
- I/O assertions are per identity/phase: new publication files still receive prescribed full
  verification, but old identities are not rescanned in the same Store. Range reads are wholly
  bounded by both authenticated offsets and empty ranges read no data.
- The former R7 review next action is superseded by R8 below. Source, external paths, proof
  execution, and Intro-05 remain closed.

### F4E-R7A R7 rejected and R8 contract candidate

- R7 `c4db79d` receives two `0/0/0/0/0` reviews but is rejected at `0/1/0/0/1` because its
  pre-open index admission did not explicitly include the 65,536-byte individual-file cap.
- R8 requires the individual cap, two future namespace names, and twice-index-byte aggregate
  capacity to pass as one gate before `.idx.part` opens or writes. Failure leaves zero new
  names/bytes.
- Focused QA covers index size minus one/equal/plus one; plus one leaves no part or residue.
- The former R8 review next action is superseded by R9 below. Source, external paths, proof
  execution, and Intro-05 remain closed.

### F4E-R7A R8 rejected and R9 contract candidate

- R8 `d74d832` is rejected by three `0/1/0/0/1` reviews: 65,535/65,537 are unreachable and
  exact run size may be known only after an admitted working run part exists.
- R9 uses exact reachable byte/run-size vectors 65,528/536,477,697;
  65,536/536,543,233; and 65,544/536,608,769 without allocating records.
- Metadata rejection leaves full inventory byte-identical. Integration keeps `.run.part`
  unfinalized through the index gate; rejection creates no run final/index path and either
  cleans the part or reports blocked precommit residue, with index inventory unchanged.
- The former R9 review next action is superseded by R10 below. Source, external paths, proof
  execution, and Intro-05 remain closed.

### F4E-R7A R9 rejected and R10 contract candidate

- R9 `f176a5b` receives two `0/1/0/0/1` rejections: overlapping run/index aliases can reach
  49,153 names, and complete-checkpoint result loss had no zero-transition recovery.
- R10 reserves an added-run generation's four-name peak before run part creation, with a
  three-name run/index subpeak, and forces run-final alias contraction before index part.
  49,148 reaches 49,152; 49,149 rejects before any run path; no-run transitions reserve two.
- Loaded-complete recovery returns the existing certificate/generation/tip with no publication
  or write; caller suspend consumes the view. A postcommit lost-result test proves no new
  manifest.
- The former R10 review next action is superseded by R11 below. Source, external paths, proof
  execution, and Intro-05 remain closed.

### F4E-R7A R10 rejected and R11 contract candidate

- R10 `042d9c8` receives two `0/0/0/0/0` reviews but is rejected at `0/1/0/0/1`: complete
  authority could still be downgraded by the broad recognized-residue rule.
- R11 makes recognized postcommit residue complete-aware. Complete returns the same proof/tip
  with `advanceAllowed:false` and zero writes; null/searching remains blocked.
- Lost-result QA crosses manifest alias, data-only, index-only, mixed halves, and combined
  residue, then caller suspend; every case preserves tip and creates no generation.
- R11 `a8607fd` receives three independent `0/0/0/0/0` reviews and is accepted.
- Next: authorize disjoint Core/test and adapter/test writers for only the four named R7A
  source paths. External paths, production Store/proof, R7B, and Intro-05 remain closed.

### F4E-R7B fresh v7 authority contract candidate

- R7A source receipt `9258acb` opens only a four-document contract. It freezes the current
  Core and adapter blobs, excludes consumed v6 artifacts, reserves a fresh v7 namespace, and
  specifies canonical attempt/candidate/terminal schemas plus one detached Task Scheduler
  worker per durable run ID.
- A restart may resume only the same recorded attempt, task action, source pin, owner, and
  checkpoint tip; it cannot start a second attempt or adopt residue. Preflight is no-write and
  no-task; a successful audited production terminal is the sole future source-integration
  authority.
- Next: commit and independently review this contract twice. Validator/runner authoring is not
  yet open, and no task, validator, Store, candidate search, or Intro-05 source work ran.

### F4E-R7B R1 rejection and R2 executable correction

- Contract QA rejects `6c9dfec`: a task-name template and named schemas cannot authenticate
  resume or immutable outcome. R2 fixes canonical field order/cross-hash rules, Temp/part
  grammar, no-replace publication, and literal Task Scheduler action/query identity.
- Same-attempt is now monitor-only reconnect to the exact already-running task; it cannot
  relaunch an interrupted worker, create another attempt, or adopt an ambiguous stage.
- Next: commit and re-review this four-document correction. External authoring/execution and
  all Intro-05 source remain closed.

### F4E-R7B R2 rejection and R3 schema correction

- R2 remains non-authoritative: its canonical byte order and nested payload/null rules were
  ambiguous. R3 freezes ordinal JSON only, strict validator/input/diagnostic/stage/residue
  schemas, source-validated base64 candidate payloads, and all terminal outcomes.
- Capability is a visible action-bound correlation nonce, not an unimplementable Scheduler
  stdin secret. No external file, task, Store, or proof action occurred.
- Next: commit and obtain two fresh all-zero reviews before static runner authoring opens.

### F4E-R7B R3 rejection and R4 publication-graph correction

- R3's passed result/candidate cross-hashes were cyclic and attempt/terminal coexistence was
  contradicted. R4 makes the only success order candidate, result, terminal; it keeps the
  immutable attempt, fixes strict Base64, and treats checkpointTip as observed highest tip.
- No v7 external object or Intro-05 work ran. Next: commit and re-review this correction.

### F4E-R7B R4/R5/R6/R7/R8 lifecycle rejection and R9 correction

- R4 `d9e85f6` removes the hash cycle but does not give a non-destructive terminal shape for a
  candidate final left durable before worker-result publication. R5 requires a
  `candidate-unacknowledged` terminal with `candidateSha256:null` and exact non-authoritative
  `orphanCandidate` `{path,bytes,sha256}`; no later action may integrate, delete, resume, or
  retry that candidate. Both R5 reviews find one adjacent gap: a failed/interrupted result may
  publish after the candidate; R6 carries the same descriptor whenever no passed result binds
  that exact candidate SHA-256.
- `stageAudit` now has an exact absent tuple (`[]`, `false`, `null`) and an authenticated
  present-tip relation; result-bearing terminals must reproduce the result audit. `residue`
  inventories only unexpected/part/foreign names, excluding only valid separately
  authenticated canonical finals; a malformed/unbound named final is residue.
- R6 review finds the legitimate owner-only pre-seed null-tip state and names-only malformed
  residuals insufficient for byte evidence. R7 allows null tip only for authenticated
  `entries:["owner.json"]`, classifies pre-owner creation as residue, and freezes full
  untruncated `unexpectedFiles` `{path,bytes,sha256,kind}` for every residual file.
- R7 review finds zero-byte/nonregular/reparse residue cannot fit that regular-file-only shape.
  R8 freezes a no-follow lstat matrix: regular files permit zero bytes plus hash; directories,
  reparse points, and other nodes use lexical path/type/lstat identity with null byte/hash and
  are always failure-only, with no open, resolve, traversal, or deletion.
- R8 review finds a malformed attempt/terminal final collision cannot be placed into a new
  canonical no-replace terminal. R9 freezes a distinct return-only claim-collision: retain
  no-follow evidence, write/register/start/resume nothing, never replace/delete/rename/integrate,
  and permanently block the run namespace rather than claim a terminal.
- Base is `d9e85f6`; changed paths are exactly the four R7B authority documents. No validator,
  task, Temp artifact, Store/proof, Intro-05 source, or player-acceptance action occurred.
- Integrity and lifecycle R9 reviews both report `P0/P1/P2/P3/GAP = 0/0/0/0/0`; contract
  `7f34272` is accepted. Static authoring is now open to one writer for the external
  validator/worker source only; no validator mode, task, Temp artifact, Store/proof, Intro-05
  source, or player-acceptance action is authorized.
- Sole next action: static source authoring followed by independent review; do not execute it.

### F4E-R7B R10 outer-mode grammar correction

- Static authoring stops before source creation: R9's CLI descriptor lacks the outer mode that
  owns attempt/task registration. R10 adds the explicit mutually-exclusive `--outer` mode,
  shared ordered input arguments, and task-only worker grammar; static authoring cannot invoke
  any mode.
- Changed paths remain exactly the four R7B authority docs. No external source/artifact, task,
  Store/proof, Intro-05 source, or player-acceptance action occurred.
- Sole next action: commit and independently review R10 twice; only then reopen static runner
  source authoring.

### F4E-R7B R11 worker-origin correction

- R10 lifecycle review correctly rejects an impossible claim: visible Task action capability
  cannot distinguish Scheduler worker launch from a direct matching process. R11 freezes the
  real boundary: outer never calls worker directly and starts only XML/query-verified Task
  action; worker validates immutable attempt/action/run/capability fields without origin claim.
- Changed paths are exactly the four R7B authority docs. No source/artifact, mode, task,
  Store/proof, Intro-05 source, or player-acceptance action occurred.
- Sole next action: commit and independently review R11 twice, then reopen static source only.

- R11 `95d23d5` receives two independent `P0/P1/P2/P3/GAP = 0/0/0/0/0` reviews and is
  accepted. Static authoring now opens to one writer for only the external validator/worker
  source; no mode execution, Task Scheduler action, other v7 artifact, Store/proof, Intro-05
  source, or player acceptance is authorized.
- Sole next action: create that source and request independent static review without execution.

### F4E-R7B R12 explicit proof-input correction

- Static implementation stops before source creation: R11 leaves input payload and candidate
  selection author-chosen. R12 admits exactly one canonical definition/route proposal and only
  public-checkpoint captured-Core certification; it excludes implicit generation, alternatives,
  and memory/one-shot proof.
- Changed paths are exactly the four R7B authority docs. No source/artifact/mode/task/proof,
  Intro-05 source, curriculum, or player-acceptance action occurred.
- Sole next action: commit and independently review R12 twice, then reopen static source only.

### F4E-R7B R13 input-byte-and-route correction

- R12 review finds the immutable route/input not fully chained. R13 pins complete input SHA in
  command/attempt/candidate reconstruction; worker rereads it before Store work and calls public
  proof only with the literal input stream, whose replay/lock count must match certificate.
- Changed paths are exactly four authority docs; no source/artifact/mode/task/proof occurred.
- Sole next action: commit and independently review R13 twice, then reopen static source only.

### F4E-R7B R14 replay-encoding correction

- Self-audit catches R13 type mismatch: certificate replay is an object. R14 requires the
  captured Core encoder over `certificate.replay.commands` for complete-stream equality and
  canonical input reconstruction.
- Changed paths are exactly four authority docs; no source/artifact/mode/task/proof occurred.
- Sole next action: commit and independently review R14 twice, then reopen static source only.

### F4E-R7B R15 input-path correction

- R14 lifecycle review finds detached worker cannot perform its required reread from hash alone.
  R15 freezes the outer-verified canonical `inputPath` inside immutable attempt parameters;
  worker reads only this no-follow regular path and verifies hash before Store work.
- Changed paths are exactly four authority docs; no source/artifact/mode/task/proof occurred.
- Sole next action: commit and independently review R15 twice, then reopen static source only.

- R15 `86a3cec` receives two independent `P0/P1/P2/P3/GAP = 0/0/0/0/0` reviews and is
  accepted. Static source authoring opens only for the external validator/worker; no mode,
  Task/other artifact, proof, product, or player-acceptance action is authorized.
- Sole next action: create static source and request independent review without execution.

### F4E-R7B static validator acceptance

- External source only: `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-
  validate-r7.mjs`, 69,752 UTF-8 no-BOM/LF-only bytes, SHA-256
  `A76341A00FDA8ADDE7EF6EA7CBF83F2E6A1530E751A86F9BDB2CFD05F9191FB8`.
- Parser-only syntax check and independent integrity/lifecycle static reviews are each
  `P0/P1/P2/P3/GAP = 0/0/0/0/0`. No mode, Task, mutable artifact, proof, or product work ran.
- Sole next action: commit these four authority docs, then freeze one command/final HEAD for a
  no-write preflight. Source authoring is closed.

### F4E-R7B R16 static-schema rejection and correction contract

- Static source/Core reconciliation rejects `A76341A00FDA8ADDE7EF6EA7CBF83F2E6A1530E751A86F9BDB2CFD05F9191FB8`
  before execution: its input parser treats `definition.setup` as an array, while the captured
  Core replays an `EndgameDefinition.setup` object `{ seed, placements }`.
- No mode, task, Store, proof, candidate/result/terminal/stage, input artifact, or product/player
  action occurred. This is not a consumed proof attempt and v6 remains excluded.
- Exact opened path: the existing external static source only. Replace that type mismatch with
  strict `{ seed, placements }` validation and `placements.length === setupDropCount`, without
  widening fields or invoking a mode. Require syntax and two independent all-zero static reviews
  before any new four-document command/final-HEAD pin. All other paths stay closed.

- R16 corrected static source is accepted at 69,932 UTF-8 no-BOM/LF-only bytes /
  `50BA9B1BD5B621F90D0DF9AB95D39803941330C0661A2023367240B44B809AD8`.
  Parser-only syntax plus independent integrity and lifecycle reviews are all-zero. The narrowed
  setup object/count correction is the only source change; no mode, artifact, task, Store/proof,
  or product action ran.
- Static source is closed. Sole next action: author and independently review a four-document
  canonical input/command/final-HEAD pin before making one input artifact or preflight.

### F4E-R7B R17 canonical input and no-write preflight contract

- After commit plus two all-zero reviews only, create exactly one absent external input:
  `C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-r7-intro05-input.json`, 1,182 canonical
  UTF-8/no-BOM/LF bytes / `572AD3D04E14C47765A9544119911FF214B04CAA9C1BD9F9F5B510EC855C8CF4`.
  It binds the sole `t3r-shaft-04` primary route and 682-byte definition payload
  `DB814FF9DB1E83A967541A35C91CF749A08E45DE5AF47AAB38FE4DBE2AC80A16`.
- Frozen domain: 191 bytes / `537C4995054430B238F6252CE7675304E2CD32571FAE759A38698E9B553681F8`, Base64
  `eyJiYXNlTGV2ZWxJZCI6InQzci1zaGFmdC0wNCIsImNhbmRpZGF0ZUNvdW50TGltaXQiOjEsImNvbW1hbmRBbHBoYWJldCI6IlNRTEhUQ1IiLCJtYXhpbXVtTG9ja3MiOjcsIm1pbmltdW1Mb2NrcyI6NSwic2NoZW1hIjoidDM3LWY0ZS1yNy1pbnRybzA1LWRvbWFpbi12MSIsInNldHVwRHJvcENvdW50Ijo4LCJ0YXJnZXRSb3dzIjo0fQo=`.
- Then run exactly one corrected-runner `--preflight` with literal current checkpoint HEAD,
  root/input/domain/input-SHA pins and pre/post hash/absence audit. It creates no task, Store,
  proof, candidate, terminal, stage, or product artifact. Any failure stops rather than retries.

### F4E-R7B R18 input-materialization mismatch and path correction

- The R17 input is retained (no overwrite/delete) as non-proof evidence: 1,182 UTF-8/no-BOM/LF
  bytes / `A76A137B263E1CC7C6E681C806CCA09A17D71C2D9B35F8B45D09853D648548A7`; its decoded definition
  is `A3BF286299B8E3FA2F485A8D84243A59595E2FE4B4F8139751D9E92048A1E365`, so it fails both R17 pins.
  No mode/task/Store/proof/mutable v7 or product action occurred.
- After this contract is reviewed, only a fresh absent `...-input-r2.json` path may be created
  from locally recomputed canonical R17 bytes, with exact input pin `572AD3D04E14C47765A9544119911FF214B04CAA9C1BD9F9F5B510EC855C8CF4`
  and definition pin `DB814FF9DB1E83A967541A35C91CF749A08E45DE5AF47AAB38FE4DBE2AC80A16` before an R18
  literal-HEAD no-write preflight. The mismatch remains excluded; it is not a retry.

### F4E-R7B R19 consumed preflight and fresh R8 source contract

- R18 preflight ran once at `6564ab7c0763e0d0b6be55ff540917948b349bd7` and failed before
  mutation on CRLF worktree versus LF Git-blob equality for `src/game/core/types.ts`; Git diff is
  clean and the runner imports the pinned Git blob closure. No attempt/candidate/result/terminal/
  stage/task/Store/proof/product action was created. R7 is closed; do not rerun or reuse R7 input.
- Post-review only open new R8 external static runner and fresh r8 namespace. It may change only
  R7-to-R8 names and remove the two raw worktree byte comparisons, preserving no-follow,
  Git blob/hash/closure, Git-clean/untracked, CLI, and lifecycle guards. R8 modes/input/task/
  Store/proof/product remain closed until later static and command contracts.

### F4E-R7B R20 execution-model correction

- Integrity review rejects R19 at `0/1/0/0/0`: `git cat-file` bytes pin/verify closure, but
  Vite/adapter execute Git-clean working-tree modules. EOL diagnosis/R7 closure remain valid.
- R20 keeps blob/hash/closure and tracked/untracked `src`/`scripts` clean gates before module
  loading; only the two raw byte equality checks may be removed. Re-review docs before any R8
  source. All R8 modes/artifacts remain closed.

### F4E-R8 R21 static-review rejection and repair boundary

- R8 static `AC47F93D...C257A8` receives independent `0/1/0/0/0` twice before execution: it
  removes no-follow reads as well as comparisons, and broad prefix namespace checks classify the
  retained R7 runner as foreign R8 residue.
- Reopen only same R8 source: restore no-follow reads (unused result is allowed), remove only
  equality decisions, and limit matcher to `-r8` canonical/part names while R7/R1-R6 stay out;
  unknown r8 remains fatal. No flow/schema/mode change. Syntax plus two all-zero reviews required.

- Corrected R8 source accepted: 69,812 UTF-8/no-BOM/LF bytes /
  `144612A92173096413E7DC6D6C35F935E4BA06FC7B35F259284000F8DB22F300`; syntax and independent
  static reviews all-zero. Source immutable.
- R22 post-review authority: create only absent `...t37-f4e-endgame-r8-intro05-input.json`,
  1,182 bytes / `8154EAC8B47DE46193A40C033A0DC7EC9B6DDF0F1CA1B0323A3077D71313209D`; definition 682 /
  `DB814FF9DB1E83A967541A35C91CF749A08E45DE5AF47AAB38FE4DBE2AC80A16`; domain 191 /
  `CC9046EF8954FF932D0170F00BB12D919DE6425F2C18582AD4B07A0C4AF60AB4`.
- Then one literal-HEAD R8 no-write preflight only. No outer/worker/task/Store/proof/product action.

### F4E-R8 R23 malformed preflight and R9 static contract

- R8 preflight was invoked once with a too-short input SHA and rejected during argument parsing,
  before `preflight()`/any mutable action. Correct retained R8 input and R8 are closed; no retry.
- Post-review only create fresh `...validate-r9.mjs` plus r9 namespace through mechanical R8-to-R9
  identity/schema replacement. Preserve all behavior/boundaries; no R9 mode/input/task/Store/
  proof/product action opens.

### F4E-R9 R24 static-source acceptance

- Task: `TETRIS-T37-F4E-ENDGAME-INTRO05-R9-STATIC-001`.
- Base: `670c214`.
- Exact external source: `C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-validate-r9.mjs`,
  69,812 UTF-8/no-BOM/LF bytes / SHA-256
  `D9176D30DF2955604E8D5A752E50BB0001C0435F25FAFE17ED61AF2D8C805726`.
- Commands actually run: parser-only `E:\\Nodejs\\node.exe --check` and static hash/text
  inspection; neither QA invoked a validator mode, Task Scheduler, Store, proof, or product path.
- Independent integrity and lifecycle QA each return `P0/P1/P2/P3/GAP = 0/0/0/0/0`. They verify
  the exact mechanical R8-to-R9 identity/schema/namespace transform, retained no-follow and Git
  blob/hash/closure plus Git-clean-before-load guards, strict mode grammar, R9-only inventory,
  and the intentional absence of the EOL-sensitive raw working-tree/blob equality decision.
- Status: accepted and immutable. No R9 input, attempt, candidate, result, terminal, stage, task,
  Store, proof, curriculum/UI, sensory/browser, or player-acceptance action ran.
- Next action: author and independently review a four-document R9 input/literal-command contract;
  only after acceptance may it create one fresh input and invoke the one no-write preflight.

### F4E-R9 R25 canonical input and preflight command contract

- Task: `TETRIS-T37-F4E-ENDGAME-INTRO05-R9-INPUT-001`.
- Base: `4bcef64`.
- Post-review only create one absent plain no-follow input at
  `C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-r9-intro05-input.json`: 1,182
  UTF-8/no-BOM/LF bytes / SHA-256 `4FF9DA912F0FD89F4F5A5C6A63CB44ABB4F7D06AEC98DD8C647E89E032B90AAA`,
  schema `t37-f4e-r9-intro05-input-v1`, fixed R17 primary route, and 682-byte definition
  `DB814FF9DB1E83A967541A35C91CF749A08E45DE5AF47AAB38FE4DBE2AC80A16`.
- Frozen domain is 191 bytes / `BD1D5BED276C7CD5713CD74E0A6C487D17B6784294E9701446A5B2A2E53A1723`, Base64 in DESIGN,
  for one `t3r-shaft-04` candidate, `SQLHTCR`, eight drops, four rows, and 5..7 locks.
- Only after two independent all-zero contract reviews: verify fresh input hash/no-follow identity
  and no R9 mutable residue, record the committed checkpoint's exact lowercase HEAD as a literal,
  and invoke one ordered R9 `--preflight`. No shell substitution, outer/worker, task, Store,
  proof, candidate, terminal, stage, source integration, curriculum/UI, sensory/browser, or
  player-acceptance action is permitted. A nonzero result consumes R9 and permits no retry.

### F4E-R9 R26 successful no-write preflight receipt

- Command executed once at `d7d36f9b37e2299f455abe0335789a49e2a2144a`: R9 `--preflight` with
  literal absolute root/input, frozen domain Base64, literal lowercase HEAD, and input SHA.
- Result: exit 0 with no output. Postflight confirms input 1,182 bytes /
  `4FF9DA912F0FD89F4F5A5C6A63CB44ABB4F7D06AEC98DD8C647E89E032B90AAA`, zero R9
  attempt/candidate/worker-result/terminal/stage residue, and zero non-self R9 runner processes.
- No task, Store, proof, candidate, terminal, source, curriculum/UI, sensory/browser, or player
  action ran. Preflight is permanently consumed; do not rerun it.
- Next action: one audited R9 outer attempt only, using a fresh literal current-HEAD pin and this
  immutable input/domain; its terminal decides whether source integration opens.

### F4E-R9 R27 consumed outer interruption / R10 static successor

- After a local wrong HEAD was rejected before Node, the sole R9 outer at
  `349ab5e473777105dba19ffe528da854b812d77a` failed closed `Task Scheduler XML shape differs`
  before task start, worker, Store or proof.
- Immutable attempt: 2,973 bytes / `29612CAC102B4F197AF82A409CA24049E5155E8ED0A1D90DA2843E87661993B8`,
  run `r9-8041f201c649c194836b8309`; task
  `\\TetraMorph\\F4E-R9-Intro05-r9-8041f201c649c194836b8309` remains Disabled. Candidate/result/
  terminal/stage/owned parts/non-self process are absent. Do not retry, resume or alter R9.
- Scheduler's export omits explicit safe-default RunLevel and AllowStartOnDemand fields. R10 may
  only accept each as absent or exactly the safe value; any present mismatch stays fatal.
- Next: two contract reviews, then fresh R10 static source/new r10 namespace through mechanical
identity/schema replacement plus that verifier correction. No R10 mode/input/task/Store/proof/
product path is open.

### F4E-R10 R28 empty-trigger contract correction

- Independent integrity QA rejects R27 at `P0/P1/P2/P3/GAP = 0/1/0/0/0`: Scheduler export also
  includes a single empty `<Triggers />`, while the source's pre-field shape test rejects every
  trigger token. No R10 source/artifact/task/mode ran.
- Fresh R10 source authority adds only this exact compatibility: zero trigger containers or one
  byte-exact `<Triggers />` is acceptable; multiple, attributed, nonempty, opening/closing or
  child-trigger forms are fatal. Keep both omitted-or-exact-safe-default field rules and every
  other XML/source/lifecycle guard exact.
- Next: commit and obtain two fresh all-zero R28 reviews before creating R10 source; no execution
  or product path is open.

### F4E-R10 R29 static-source acceptance

- Task: `TETRIS-T37-F4E-ENDGAME-INTRO05-R10-STATIC-001`.
- Source: `C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-validate-r10.mjs`,
  70,469 UTF-8/no-BOM/LF bytes / SHA-256
  `0CFE2C3185B2AD512ED00606D8B010BC7E1353D5E76ADFBB60ECE4F07FEF7D9C`.
- Parser-only syntax and independent integrity/lifecycle QA each report
  `P0/P1/P2/P3/GAP = 0/0/0/0/0`; neither review invoked a mode or modified file/Scheduler state.
  Identity-normalized source is byte-identical to accepted R9 outside `assertTaskXml`.
- Accepted delta is only R28: absent-or-exact-safe defaults plus zero or unique exact `<Triggers />`;
  all other trigger forms and every other guard remain fatal. Status immutable.
- Next: author/review a four-document fresh R10 input and one no-write preflight contract.

### F4E-R10 R30 canonical input/preflight contract

- Post-review only create absent `...t37-f4e-endgame-r10-intro05-input.json`: 1,183 UTF-8/no-BOM/
  LF bytes / `AB80185F0710F9FCCD7F41D074A8451DCA15EB6AAEB35697E05A45CD831AA332`, schema
  `t37-f4e-r10-intro05-input-v1`, fixed primary route and 682-byte definition `DB814FF9…0A16`.
- Domain: 192 bytes / `2F7F954D792C5DF5E3B69DE203BB5323F58304895B8DBAFF6EFBC714CD301FE0`, Base64 in DESIGN;
  count one, `SQLHTCR`, 8 drops, 4 rows, 5..7 locks.
- After two all-zero reviews, inspect fresh input/no-follow identity/hash and empty R10 mutable
  names, then run one literal-current-HEAD R10 preflight only. Nonzero consumes R10; all outer/
  worker/task/Store/proof/product paths remain closed.

### F4E-R10 R31 successful no-write preflight receipt

- R10 `--preflight` ran once at literal HEAD `7364a9fd41b8e271920244a955e4d417df3425df` with
  frozen absolute root/input/domain/SHA arguments and exited 0 without output.
- Postflight: immutable input 1,183 bytes /
  `AB80185F0710F9FCCD7F41D074A8451DCA15EB6AAEB35697E05A45CD831AA332`; zero R10 attempt/
  candidate/result/terminal/stage/non-self process. No task, Store, proof or product action ran.
- Preflight is consumed. Next is one audited R10 outer only, with fresh literal current HEAD and
  this immutable input/domain.

### F4E-R10 R32 consumed outer identity interruption / R11 contract

- R10 outer at `50ab6549c2f520d819ae1ccca3e5d8823092d4b1` published immutable 2,988-byte
  `CB77CE5175F4719D1B305B41E73DF308700FFA2E10B46F94A20AF25F833E2BD4` attempt /
  `r10-8640d169caba21aabb062c4f`, registered a Disabled task, then fail-closed before start/
  worker/Store/proof on XML field round trip. Candidate/result/terminal/stage/process absent.
- Cause: action record `runAs` is username while Scheduler exports current interactive token SID.
  Retain R10 task/input/attempt unchanged; no retry/resume/delete/repair.
- R11 source after review may only replace identity/schema/namespace plus bind task action/UserId
  to strict current-token SID read through the existing PowerShell transport. No loose username or
  SID acceptance; retain all other guards and all execution/product closure.

### F4E-R11 R33 static-source acceptance

- Task: `TETRIS-T37-F4E-ENDGAME-INTRO05-R11-STATIC-001`.
- Source: `C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-validate-r11.mjs`,
  70,756 UTF-8/no-BOM/LF bytes / SHA-256
  `5616C5813D039D35E4CCDD2277B240A5FF75FC2ADE852F0C2FC3BA7E37288537`.
- Commands actually run: parser-only `E:\\Nodejs\\node.exe --check` and static text/hash checks.
  Independent integrity and lifecycle QA each report `P0/P1/P2/P3/GAP = 0/0/0/0/0`; neither
  invoked any mode, wrote a mutable R11 artifact, or touched Scheduler/Store/proof/product state.
- Acceptance: R11 is an R10-normalized mechanical identity/schema/namespace replacement plus only
  strict current-token SID task/action/XML UserId binding (`^S-\d+(?:-\d+)+$`). R10 XML default and
  unique empty-trigger checks and the remaining fail-closed lifecycle are retained unchanged.
- Status: immutable static source; R11 input, attempt, candidate, result, terminal, stage, task,
  Store/proof and product action are absent. Next action is a separate reviewed input/preflight
  contract only.

### F4E-R11 R34 canonical input and preflight command contract

- Task: `TETRIS-T37-F4E-ENDGAME-INTRO05-R11-INPUT-001`.
- After two independent all-zero contract reviews only, create one absent plain no-follow input at
  `C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-r11-intro05-input.json`: 1,183
  UTF-8/no-BOM/LF bytes / SHA-256 `607C0FF51CA5522D66664D693C8607CCE885D9D491BD3D294B8443FF5272A5B2`,
  schema `t37-f4e-r11-intro05-input-v1`, fixed route, and 682-byte definition
  `DB814FF9DB1E83A967541A35C91CF749A08E45DE5AF47AAB38FE4DBE2AC80A16`.
- Frozen R11 domain: 192 bytes / `06E363774089C0369924E523AED4C10D183A06BD8C2B68F7C649DD726E0728B8`,
  Base64 in DESIGN, with count one / `SQLHTCR` / eight drops / four rows / five-to-seven locks.
- Only after review: verify no-follow/hash and no R11 mutable residue, use this committed
  checkpoint's exact lowercase HEAD in one ordered no-write preflight. No shell substitution,
  outer/worker, Task Scheduler, Store, proof, source integration or product path is allowed;
  nonzero consumes R11.

### F4E-R11 R35 malformed materialization / R12 static successor

- Task: `TETRIS-T37-F4E-ENDGAME-INTRO05-R11-INPUT-001` stopped locally before validator launch.
  Created R11 input is 1,184 UTF-8/no-BOM/LF bytes / SHA-256
  `F7FC29289513F1DB38BC4AA5649F73A18004F7817CD933C2A90BBC1C76865505`, with one extra terminal
  LF over the frozen 1,183-byte `607C0FF51CA5522D66664D693C8607CCE885D9D491BD3D294B8443FF5272A5B2`.
- Commands actually run: hash/head preconditions only. Hash mismatch stopped before Node; no R11
  preflight/mode, Task Scheduler, Store, proof, candidate/result/terminal/stage or product action.
- Status: malformed R11 input retained immutable; do not modify/delete/reuse/retry. R12 opens only
  after review for a mechanical R11-to-R12 static source/namespace successor preserving all
  accepted guards. No R12 input or execution/product path is open.
