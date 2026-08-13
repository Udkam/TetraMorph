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
