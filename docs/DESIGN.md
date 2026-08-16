# TetraMorph — Product Design Contract

> The current page-facing identity is the plain-text `TetraMorph`. Older `Tetra` and
> `Tetris` headings below are retained only as historical contract provenance.

## 2026-08-16 T37 — Completion-first supersession

This section is the current product authority and supersedes every older T37 status,
gate, resume instruction, and next action below. The player requests implementation of
the complete bounded curriculum before one consolidated acceptance review. This removes
interim human gates only: it does not remove acceptance. Every new or switchable choice
remains provisional, automated QA is not human acceptance, and subjective work must not
be described as accepted before the final review.

### Adopted recovery head and R5A result

- Recovery binds to repository head `4ce7ba3562459809158958b3178dd31a68c5cabd` and Core
  tree `e9b3a3ed0d001072f5291a8fc841c1849e4db44f`.
- R5A's final linear record is source fix `54a3277`, source-only invalidation `9d30894`,
  fourteen final outputs `99b47be`, and report-only proof `4ce7ba3`.
- Final automated evidence is `204/204` verification checks, `537 passed / 15 skipped`, a
  `770`-module build, UI QA `P0/P1/P2/P3 = 0/0/0/0`, and audio QA
  `P0/P1/P2/P3 = 0/0/0/0` with human listening as the sole GAP. Port `4192` is clean.
- Product keeps provisional default `A`. Tests may force `A`, `B`, or `C`; the product
  exposes no UI or persistence choice. None of A/B/C is human accepted.

### R5B — one frozen familiar-language Bomb contract

R5B is first. It uses the three exact vendor stems already proved by R5A:

- A: `be2b68b51e29ac0a040491b9f7e4b5f1633907cd6075cfe421a8e722380ea254`.
- B: `b9ffeee9ec38007e5d3e8aa86997b62da939af968cec3f5bd83892337641f3fc`.
- C: `ed866e4e50e39a2292d99c175c3be04881d6fe7720f32508afd4c7ebf7c5bcc6`.

Normal Bomb plays one full stem at `220 ms`. Bomb-chain scheduling uses the frozen
`mutationChainPresentationPlan` distinct beat starts: depth `0` plays one full stem and
depth `> 0` plays one onset grain from that same stem. Full presentation is
`84 ms / fade 28 ms / gain 0.11`; reduced presentation is
`36 ms / fade 16 ms / gain 0.055`. Each event owns exactly one mono buffer and one source.
There is no clamp, normalization, compression, preview transcode, old `bomb` /
`bomb-chain` recipe, noise layer, or fixed pulse. Renderer ownership, the presentation
timeline, and Core stay frozen. Default A remains provisional rather than human accepted.

R5B evidence hashes committed text from Git blob bytes, not checkout-dependent working-tree
bytes. Every authored/generated text file is UTF-8 without BOM and LF-only; generation
fails before commit on CRLF, BOM, or invalid UTF-8, while PNG is raw binary. Reusable stop,
restart, and disable paths retain one ready AudioContext/Renderer/Canvas but must remove all
event sources, timers, and frame callbacks without multiplying listeners. Terminal destroy,
pagehide, and HMR close the old AudioContext, remove listeners, destroy the Renderer ticker,
and remove its Canvas. HMR then proves exactly one fresh owner/context/Renderer/Canvas.

### Material and Ice current-HEAD proof

R5B terminal evidence closes at repository head
`171181228c0408cfa1bfb1259eb98c29a63efae3`. The next evidence-only slice binds that exact
head and re-proves the already implemented Stage E whole-piece material system on the real
product root. It changes no product, renderer, Core, audio, UI, storage, or accepted timing.
Historical Stage E PNGs and audits are inputs neither to the verdict nor to the new hashes;
only the old deterministic scenario algorithm and fixture data may be reused, and every
current frame, state, audit, and binding is recomputed.

The proof directory is exactly `docs/evidence/t37/material-ice-current-head/**`. Its eleven
authored source files are `.gitattributes`, `README.md`, `evidence-contract.mjs`,
`product-fixture.mjs`, `capture-semantic.mjs`, `capture-matrix.mjs`, `browser-smoke.mjs`,
`capture-client.mjs`, `client-actions.json`, `write-manifest.mjs`, and `verify.mjs`. The real
Mutation entry and DEV QA surfaces run from the product root on strict port `5193`.
Deterministic item seeds are Freeze `49`, Bomb `90`, Multiplier `11`, and
Supergravity/Collapse `163`.

The pre-report set is exactly 38 files: twenty full-page semantic frames for
`freeze/bomb/multiplier/collapse` across `next`, `active-ghost`, `settled`, `clear`, and
`activation`; six named theme/motion/viewport matrix frames; semantic, matrix, browser, and
Ice-provenance JSON audits; three prescribed-client screenshots plus three text states;
`client-attestation.json`; and `manifest.json`. The wrapper requires the client output
directory and attestation to be absent before capture, then persists exact start/end runtime
bindings and output hashes. The only terminal file is `verification-report.json`. Source,
output, and terminal commits are separate. Git-blob SHA-256, exact tree/range/history, strict
UTF-8 no-BOM LF text, raw PNG bytes, real one-Canvas layout, zero DOM
cells/overflow/errors, and semantic state-to-frame agreement are fail-closed.

Lifecycle proof exercises restart plus live theme and motion changes while reusing the same
runtime Canvas, renderer/ticker owner, listener set, and AudioContext; then an actual
full-motion trusted UI exit must propagate its cause through the native View Transition
callback, retire those owners, and precede a real Mutation re-entry with one fresh owner. A
Vite HMR pass must neither multiply nor leak Canvas, renderer/ticker activity, audio contexts,
frame callbacks, or window/document listeners. Browser instrumentation is observational and
may not replace the production lifecycle or inject product state. Generation uses a forced
Vite dependency re-optimization and rejects effective unbound root/public/PostCSS inputs,
Git/Node/Vite/Playwright injection variables, and runtime/toolchain drift. Persisted evidence
uses portable locators plus byte/version identities rather than personal absolute paths.

Ice 2 remains the accepted runtime material: use the locally proven Ogg and local
provenance. The original uploader WAV on the official page still requires login and is
explicitly **OPEN**; it is not replaced with a preview transcode and does not block the
rest of the curriculum. Disclose it in the final report.

The current Ice binding is
`src/assets/audio/t37/freeze-ice-cubes-hq.ogg`, `54564` bytes, Git blob
`12e767d2157f3ed2150a743ac2c161f8f99207f1`, and SHA-256
`5a68425717de348ba3d10767618fa4c428a97f26c2e85abc96f45b7bfb35a450`.
Its catalog provenance is the official Freesound record `819779`, uploader `sbml`, title
`Ice cubes`, CC0, using source window `0.19375–0.63375 s`, gain `0.78`, attack `3 ms`, and
release `12 ms`. The uploader-original filename is known, but its SHA remains `null` and
status `OPEN / login required`; neither the product Ogg nor a preview may impersonate it.
Automated material eligibility and Ice byte/provenance integrity join the final consolidated
human visual/listening review and do not claim a new subjective acceptance here.

### Material terminal disposition and F4E-R5 v5 generation contract

The current-head material proof is technically closed. Recovery source `da8ded9`, fresh
pre-report output `3a0078a`, and report-only terminal commit
`b177b206db3729ae37351c287b18afa35b7df54c` form the accepted linear record. The terminal
verifier passes `407/407`; independent terminal review reports
`P0/P1/P2/P3 = 0/0/0/0`. The product `src` tree and Core tree remain unchanged from the
R5B terminal. Human material judgment and the login-gated uploader-original Ice WAV remain
`OPEN / NOT ACCEPTED` for the final consolidated review.

F4E-R5 therefore adopts repository base `b177b206db3729ae37351c287b18afa35b7df54c`
and Core tree `e9b3a3ed0d001072f5291a8fc841c1849e4db44f`. All v1-v4 validator,
candidate, attempt, terminal, wrapper, and production-search authorities remain consumed or
rejected and may not be read as proof, executed, patched, or copied into v5. V5 is a fresh,
self-contained external implementation with exactly these persistent paths:

- `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v5.mjs`;
- `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v5.json`;
- `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v5.json`;
- `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-terminal-v5.json`.

The reviewed 633-byte clue is re-frozen as data, not as proof: `t3r-shaft-04` / `后手` /
difficulty `5`, target rows `4`, gameplay seed `3887`, setup seed `37220`, placements
`I0@5,T0@2,S0@4,L0@0,J2@7,Z0@2,O0@0,L2@7`, primary route
`SQLHTTTQLHTTTCLLHTTTRHTTTTTTTTTTTTCRRRRHTTTTTTTTTTTTCRHTTTTTTTTTTTTLLLLHTTTTTTTTTTTT`,
and alternative route
`SQLHTTTQLHTTTQLHTTTRHTTTTTTTTTTTTCRRRRHTTTTTTTTTTTTCRHTTTTTTTTTTTTLLLLHTTTTTTTTTTTT`.
The new validator embeds those values and does not load an old clue, validator, receipt, or
candidate at runtime.

V5 has a read-only `--preflight` mode and one production mode. Both bind their own exact
UTF-8/LF bytes and SHA-256, fixed Node and direct Git executable byte identities, a frozen
warning-only `execArgv`, and exactly two permitted `NODE_*` variables including their values'
byte lengths and SHA-256. They also bind literal external paths and initially absent v5
candidate/attempt/terminal/staging namespaces. Preflight uses only the pinned Git binary with
fixed argument arrays and a sanitized allowlist environment. Production's outer validator
additionally starts exactly one same-path, same-hash Node worker with a fixed argument array,
bounded stdout/stderr, no shell, and the same frozen environment; that worker may use only the
pinned Git binary. There is no network, search-tool, old-validator, or other proof subprocess.
The exact environment records are
`NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S` = 129 bytes /
`36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1` and
`NODE_REPL_TRUSTED_CODE_PATHS` = 25 bytes /
`C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D`.

Repository authority is fail-closed: base `b177b20..captured HEAD` must be a single-parent
chain whose every edge is non-renaming `M` on only the four governing documents and whose
union is exactly those four paths. Current Core and all four governing documents must be
clean before proof and again before publication. Git runs with replacement objects disabled
in both arguments and environment, no pager or inherited `PATH`, fsmonitor/untracked-cache/
hooks/external-diff disabled, and `--no-ext-diff --no-textconv` on every show/diff family
command. A real in-root `.git` directory, identical common directory, no replace refs,
grafts, alternates, shallow state/lock, partial clone/promisor, include, executable diff/
filter, or helper-bearing local/worktree config are mandatory and rechecked after proof.
Current Core must retain the frozen tree.
The captured HEAD must contain exactly one command marker matching the validator's actual
bytes/hash and no `F4E-R5-CONSUMED-V1` marker. The validator captures all 16 non-test Core
Git blobs at that HEAD, rejects BOM/CR/extra imports, records each Git blob/raw hash and
Node-built-in transformed hash, and executes them through a private `registerHooks` loader
after `stripTypeScriptTypes`. Vite, repository config, `node_modules`, and working-tree Core
bytes are outside the executed proof domain.

F4E-R5-COMMAND-MARKER-V1 validatorBytes=55930 validatorSha256=02439F7DC439CFEDD521719E06AC2930E101CE8E28BA1F0B3D893FBA15B48A4A base=b177b206db3729ae37351c287b18afa35b7df54c coreTree=e9b3a3ed0d001072f5291a8fc841c1849e4db44f

Preflight may load captured Core and run bounded geometry/replay/admission checks, but it
creates no persistent file and never invokes the uncapped certificate. Production repeats
the cheap pins, then exclusively creates and fsyncs the attempt receipt before capturing or
loading Core. Any post-claim failure consumes v5; no retry, replacement, cleanup, or recovery
run is permitted. The fixed production validator invocation is:

```powershell
& 'E:\Nodejs\node.exe' --disable-warning=ExperimentalWarning `
  'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v5.mjs' `
  --root 'E:\Proj\reproduction-tetris' `
  --output 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v5.json' `
  --attempt 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v5.json' `
  --terminal 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-terminal-v5.json' `
  --expect-repo-base 'b177b206db3729ae37351c287b18afa35b7df54c' `
  --expect-core-tree 'e9b3a3ed0d001072f5291a8fc841c1849e4db44f' `
  --expect-validator-sha '02439F7DC439CFEDD521719E06AC2930E101CE8E28BA1F0B3D893FBA15B48A4A' `
  --expect-head '<FINAL_QA_BINDING_HEAD>'
```

The exact preflight adds `--preflight` and is otherwise byte-for-byte the same. Static review
requires UTF-8/LF, `node --check`, exact byte/hash review, one production certificate-call
site, one same-byte worker spawn site, no old family or other non-Git spawn API, and no
production invocation. The final QA-only THREAD_LOG checkpoint supplies
`FINAL_QA_BINDING_HEAD`; preflight and production both require exact equality to it, so any
later commit fails before claim. Two independent
reviews and the later no-write preflight must each report
`P0/P1/P2/P3/GAP = 0/0/0/0/0` before the sole production command is authorized.

Production rebuilds `boardRows` exactly through `replayEndgameSetup`, with empty
`hiddenCells` and `anchorCells`, eight legal zero-clear setup drops, and exactly 32 targets in
rows 36-39; each row gap count is in `1..3` and total gaps are `8`. It rejects exact, topology, and
near-topology matches against all 50 live definitions plus the four frozen drafts and requires
the gameplay seed to be unique across those 54 comparisons. Each route is reconstructed
lock-by-lock through a unique `exhaustiveEndgameLandings` result. Both use literal
Current/Next-1/Next-2 for their first three locks with releases `[0,0,0]`, share lock 1,
first diverge at lock 2 or 3, and each route separately proves the complete nonempty
lock-1-to-2 and lock-2-to-3 blocker sets plus owner-only remove-then-descend counterfactuals.
Later releases contain at least two positive events, total four, and end
with zero target cells. Primary length is 5-7 and the alternative is at most two locks longer.

Only `certifyOptimalEndgameRouteForDefinition` over the complete public landing domain may
produce the primary certificate. On success, candidate v5 contains the deterministic
schema-8 fixture plus source, validator, geometry, admission, causal, replay, and certificate
bindings. Its 19 fixture keys are exactly `schemaVersion`, `campaignRevision`,
`rulesetRevision`, `routeTokenVersion`, `searchStateKeyVersion`, `operationMetric`, `levelId`,
`authoringDefinitionHash`, `behaviorHash`, `initialStateHash`, `optimalLockedPieces`,
`optimalRoute`, `routeHash`, `lockSignatures`, `finalStateHash`, `solutionMultiplicity`,
`proof`, `alternatives`, and `techniqueEvidenceId`; proof has exactly `kind`,
`lowerBoundVersion`, `exhaustedDepths`, `exploredStateCount`, and `transitionCount`.

Candidate publication uses an exclusive same-directory stage, file fsync, no-replace hard
link, byte re-read, and mandatory successful stage removal. The proof worker never writes the
terminal. The same audited validator's outer owner creates and fsyncs the nine-key attempt,
including a SHA-256 commitment to a random 32-byte capability. Its run ID binds HEAD,
validator, timestamp, and capability commitment. The raw capability exists only in outer
memory and the anonymous worker stdin pipe; it never enters arguments, environment, receipt,
candidate, terminal, or disk. Worker stdin must reach EOF at exactly 32 bytes, and both worker
and outer verify the complete canonical attempt before accepting output.
Attempt keys are exactly
`schema,runId,claimedAt,sourcePin,clue,parameters,outputPath,terminalPath,workerCapabilitySha256`
in that order.

The outer waits for the worker's `close`; ChildProcess and all three stdio errors are recorded
without settling that wait. Stdout and stderr each retain at most 4 MiB for parsing, while
incremental byte count/SHA-256 and only the last 4096 bytes continue after overflow; overflow
requests one kill and successful output may not be truncated. Terminal publication is
forbidden until `closeObserved=true` and `reaped=true`. It then atomically publishes terminal
v5 through an exclusive same-directory staged fsync, no-replace hard link, byte re-read, and
successful stage removal. Terminal keys are exactly
`schema,status,passed,startedAt,finishedAt,exitCode,signal,sourcePin,attempt,candidate,workerLifecycle,stdout,stderr,stagingFiles,residualProcesses,reason`.
Each stream record is exactly
`bytes,sha256,boundedTailBase64,truncated,exceededOutputLimit`; lifecycle is exactly
`pid,spawnError,stdinError,stdoutError,stderrError,killRequested,killResult,killError,closeObserved,reaped`.

Only a reaped worker with `exitCode=0`, a valid complete candidate, zero staging residue, and
terminal `status='succeeded' / passed=true` form an admissible success. A post-claim failure
yields a failed terminal when the outer can publish it; `attempt` alone, `attempt+stage`, or
`attempt+candidate` without a valid success terminal are consumed failure states and never
open integration.

The capability is an honest-coordinator continuity/replay guard for the unchanged outer-owned
receipt, not same-user origin authentication. Same-permission creation, deletion, replacement,
manual `--worker`, forged terminal, executable/path rebind, nested metadata reparse, or Git
history rewrite is an explicit governance violation outside the claimed filesystem threat
model. Such a process could deny the run but cannot create an admissible result without also
forging the required outer success terminal. This exact boundary is recorded in `sourcePin` as
`honest-coordinator-no-same-permission-artifact-forgery-v1`; an OS-authenticated adversarial
same-user claim would require a separately privileged broker and is not asserted here.
Immediately after output audit, the coordinator commits one `F4E-R5-CONSUMED-V1` hash receipt
in THREAD_LOG; the validator rejects that durable marker on every later invocation.

Only after attempt, candidate, valid success terminal, process exit, and the committed
consumption receipt receive independent byte, schema, replay, causal, admission, certificate,
and state-machine review may integration change the four authorized Intro-05 paths.
No live roster, persistence, UI, transition, sensory, icon, or Classic path opens in F4E-R5.

#### R3 rejection and R4 exact-byte candidate

R3 at 43,058 bytes / `888EF45F...083B` is rejected before preflight. One independent review
reports `P0/P1/P2/P3/GAP = 0/1/2/0/0`: an error event could reach terminal before observed
close/reap, pipe retention was not actually bounded after overflow, and `NODE_*` values were
not frozen. The other reports `0/2/0/0/0`: direct worker replay/forged receipt was not bounded,
and Git replacement/helper execution remained open. No v5 persistent path exists.

R4 is frozen at 55,930 UTF-8/LF/no-BOM bytes with SHA-256
`02439F7DC439CFEDD521719E06AC2930E101CE8E28BA1F0B3D893FBA15B48A4A`.
It implements the exact Node-value pins, hardened/rechecked Git proof domain, full nine-key
attempt and governance boundary, stdin-only capability continuity, bounded incremental pipe
records, error-safe close/reap wait, derived residual-process state, and pre-publication
attempt re-read described above. `node --check` passes; the exact certificate and worker spawn
remain one site each. This is not yet execution authority: commit these four documents, obtain
two fresh exact-byte all-zero reviews, create and audit a THREAD_LOG-only final binding HEAD,
then and only then run the non-writing preflight.

### Remaining material, curriculum, and presentation contract

1. **D2B motion.** After the final 46-level library is live, category release is
   `120 ms`, settle is `180 ms`, and travel is at most `4 px`; detail transition is
   `120 ms` and at most `3 px`. Reduced motion is at most `32 ms`, transform-free. D1
   and D2A remain frozen. Preserve `44 px` targets, focus and history behavior, and
   exactly one gameplay Canvas.
2. **F4E-R5 Intro 05.** Run only the new external v5 validator/candidate/attempt/terminal
   family, once. Old v1-v4 artifacts and old production search tools are banned. Two
   independent byte/AST/no-spawn QA passes and a green preflight are required before the
   one production attempt; failure consumes it. The schema-8 candidate must satisfy all
   Intro-05 geometry, admission, route, release, and certificate invariants before the
   four authorized source paths may change.
3. **F5 curriculum.** Publish exactly `5 Intro / 25 Easy / 16 Hard`. Persistence v7 has
   exactly `version`, `campaignRevision`, `completedLevelIds`, and
   `bestLockedPieceCounts`. Canonical v7 has priority over v6 and a present but invalid or
   failed source stops fallback. Preserve 38 compatible records, rebuild 8 with clear
   progress, transfer nothing from the 4 retired levels, retain v6 for rollback, and
   unlock Hard at certified optimum plus five. Certificates and codecs are proven while
   non-live, followed by one atomic campaign flip and a retired-deep-link notice.
4. **Line clear.** Core's `200 ms` rule, `300 ms` erase point, score ownership, and the
   accepted Studio language stay frozen. Full-motion post-commit tails are
   `+120/+240/+360/+480 ms`, producing totals `420/540/660/780 ms` for one through four
   lines. Reduced tails are `+80/+100/+120/+140 ms`. Reward derives only from line count
   and never changes score.
5. **Falling Fold icon.** Create a connected, asymmetric, falling folded-surface
   silhouette in deep blue with one warm seam, and ship actual favicon and Apple mask
   assets. Do not use four quadrants, letters, commercial trade dress, or a logo imitation.
   Final review may adjust this provisional direction.
6. **Classic presets.** Implement last among product changes: Calm `1.00 -> 0.30`,
   Relaxed `0.80 -> 0.20`, Standard `0.60 -> 0.08` as default, Swift
   `0.40 -> 0.08`, and Expert `0.20 -> 0.08` seconds per cell. Cover all five ranking
   domains plus keyboard, touch, copy, and storage. Migrate a legacy start/end pair to the
   nearest preset by choice-index Manhattan distance, resolving ties toward the slower
   preset.
7. **Survival.** Produce an audit-only proposal. Survival is explicitly **NOT
   IMPLEMENTED** and causes no product change in this slice.

The eight F5 technique mappings are: `preserve-well / t5r-horizon-15` to Endgame
31/45/46/49; `anchor-side-slip / t5r-drift-08` to 32/39;
`build-support / t6r-keystone-20` to 33/35/44;
`edge-to-centre / t5r-delta-07` to 36/38; `split-lanes / t5r-lattice-09` to 37;
`avoid-hole / t3r-cascade-05` to 47; `clear-order / t6r-terrace-18` to 41/48; and
`choose-gate / t5r-rift-10` to 50.

### Completion and acceptance order

The sole current order is R5B, Ice/material current-head proof, F4E/F5, D2B, line/icon,
Classic as the last product change, Survival proposal, one final gate/browser/independent-QA
pass, one consolidated human review, fixes, then push. No interim subjective result opens
or closes a later stage. R5B product source is now frozen at `94957fd`; its next action is
product-backed technical evidence under the separately authorized R5B directory. That page
remains fail-closed and joins the final consolidated review rather than opening an interim
listening gate.

## 2026-08-12 T37 — Canonical Endgame namespace

The product domain is now **残局** in Chinese and **Endgame** in English. The retired
Chinese label and active `puzzle` namespace are not aliases: Core uses mode `'endgame'`,
types/files/symbols use `Endgame` / `endgame`, the library uses `/endgames`, play uses
`/play/endgame/:id`, and the currently live generic ordinals 21–50 move to the
`tm-endgame-*` family. Neutral level IDs remain stable.

N0 is name-only at the campaign layer: all 50 live boards and campaign revision 2 remain.
It writes `tetramorph:endgame-completion:v6` with schema version 6/revision 2. The later
5/25/16 publication alone writes v7/revision 3 and retires canonical ordinals 34, 40, 42,
and 43. A namespace change must not pre-apply that curriculum projection.

One isolated legacy migration boundary may recognize retired input values solely to preserve
existing progress and deep links. Storage reads distinguish value, absence, and failure;
uncertain data suppresses an empty canonical write. Conversion verifies a canonical write
through parse/equality readback, then removes old keys independently and idempotently.
Failed cleanup retains only the affected keys for a later retry. Normal product APIs never
expose or emit the old domain. Historical documentation and evidence retain their original
wording as provenance.

Because the domain literal, private state fields, IDs, and schema strings participate in
deterministic hashes, all Endgame behavior hashes and exact certificates are regenerated.
Gameplay geometry, fixed queues, public commands, lock outcomes, and progression semantics
must otherwise remain equivalent. The old F4E search checkpoints are explicitly non-proof.

Visible mode names follow the selected language: the Chinese home uses `残局`, while the
English home uses `Endgame`. Campaign-count accessibility copy reports the total number of
levels without claiming that every Hard level is already unlocked. Real App boot coverage
must exercise the isolated legacy route and storage boundary; retired input literals remain
confined to that boundary and its direct test rather than being reconstructed in normal App
tests.

The rename is intentionally atomic across active Core, runtime, rendering, audio, UI,
navigation, persistence, authoring, QA, DOM/CSS, tests, tools, and filenames. A temporary
dual-field `GameState` is forbidden: object spread and independent mutation would make one
alias stale and corrupt state identity. The exact exception and final zero-retired-name gate
are authoritative in `docs/CURRENT_TASK.md` and the Endgame workstream log.

## 2026-08-15 T37 — Bomb R5A familiar-language audition

The player rejects R4A X/Y/Z in full without a more specific subjective explanation.
The only human finding is therefore **all three rejected**; do not invent whether they
were too tonal, dull, weak, or otherwise wrong. R4A evidence `56a2381..b11b7b5` remains
immutable history and cannot authorize R4B or product source.

The post-verdict evidence audit found one P1, one P2, and one P3 that must be disclosed
rather than repaired. Under the stricter decoded-PCM interpretation, Y contains only
`107.896 ms` of first-to-last PCM16 nonzero activity, below `110 ms`, while the verifier
reported the scheduled recipe span `149 ms`. The old contract did not define which
activity measure owned the limit; that measurement-definition gap is the historical
defect, not a retroactive assertion that the declared recipe-span check was dishonest.
Lifecycle proof did not run pagehide/HMR during prime, pending, or active playback and
terminal dispose left `ready=true`. Manifest provenance made the contract and authorization
chain recoverable but did not name accepted contract `15801d6` separately from authorization
`56a2381`. None of these findings overrides the valid player listening experience or the
human rejection; they prevent a zero-finding machine claim.

R5A no longer invents an independent Bomb material. It asks whether a larger block-removal
action can be expressed by the already familiar TetraMorph language. The visible controls
stay neutral `A/B/C`, but the frozen implementation structures are:

- `A`, Action stack: accepted Action A hard-drop at `0 ms`, lock at exactly `+9 ms`, and
  move at exactly `+18 ms`, all at neutral `pan=0`. Four oscillators share the unchanged
  Action master/compressor; neutral pan is accepted recipe/graph reuse, not a claim that a
  directional move atom is reproduced.
- `B`, Clear collision: accepted Action A hard-drop at `0 ms` plus a new candidate-local
  Studio-derived excerpt at exactly `+12 ms`. The unmodified Studio scheduler uses frozen
  source bytes, `rate=1.18`, `targetPeak=0.5`, `pan=0`, its own compressor, and the new
  `maxDuration=117 ms`; fade is `21.06 ms`, stop is `end+6 ms`. This is not the frozen
  complete `200 ms` Studio cue and does not alter or relabel it.
- `C`, Compact block knock: exactly one procedural layer
  `{instrument:'countdown-knock', duration:.070, gain:.250, attack:.006, release:.240,
  frequency:440, brightness:.20, spread:1, seed:0x544d3336}`, with `endFrequency`
  omitted. One body and two non-integer-ratio partials share one fast-decay envelope; no
  glide is present and contact texture is onset-only. Existing synthesis code is
  provenance, not human acceptance.

Candidate bytes are generated once through the production graphs, not rebuilt differently
for listening. Playwright `1.61.1` Chromium `149.0.7827.55` stereo 48 kHz
OfflineAudioContext renders twice after a `500 ms` silent pre-roll. A's four oscillators
share `master 1.85` and the Action
compressor. B's hard-drop Action branch and Studio panner/gain/compressor branch sum only
after their compressors. C uses `mutation 0.96 -> candidateEffects 1 -> master 1.85 ->
Action compressor`. Each candidate then has one source-fixed group trim: A
`0.9793104026564039`, B `0.4452`, C `0.8625147192924494`; no earlier trim,
per-atom normalization, or new sum compressor is permitted. Generator reservations are
`4/3/1` sources and fail atomically.

Left/right renders must be sample-identical; channel 0 becomes a deterministic mono 48 kHz
PCM16 stem. Both renders must be byte-identical. The stem ends after candidate trim but
before the global `enabledGate` and `output volume*0.78`. The audition and any later
accepted product integration play those same bytes as one BufferSource through only that
gate/output, so internal compression/trim never runs twice.

All candidates start at the current production normal-Bomb visual impact (`220 ms`) in
the already accepted full-motion `1x` Renderer animation. The page exposes exact isolated
hard-drop and complete one-line Studio references—not B's excerpt—and reference-to-
candidate comparisons, has no autoplay, defaults to reject-all, and hides design names.
Reduced motion reuses the identical stem/gate/output only as static technical evidence.

Metrics decode the committed stem through the same gate/output. Same-pass references use
the production graph, pinned Chromium, pre-roll, and a fixed `180 ms` onset window. At
`volume=1`, candidates satisfy peak `0.165–0.196` (`<=0.200` absolute), peak spread
`<=0.5 dB`, 10 ms max RMS `0.075–0.105`, and 50 ms max RMS `0.042–0.060`.
Energy obeys `hardDrop <= candidate <= min(hardDrop*10^(3.1/10), Studio)`; this is not a
fixed Studio ratio claim. Attack is `>=4 ms`; decoded-stem activity is `60–135 ms`;
last nonzero and 99% energy end are `<=135 ms`; `<120 Hz <=3%`; and `>=2 kHz <=1%`.

Metric semantics are frozen. Pre-output samples clamp to `[-1,1]` and encode Int16 as
`round(x*(x<0?32768:32767))`; first/last nonzero codes own activity and times. Chromium
decodes the stem through gate `1`/gain `.78`; candidates analyze its 8640 Float32 frames,
and references analyze `[24000,32640)` after pre-roll. Peak uses the first strict absolute
maximum; attack runs from the first pre-peak sample at least 10% of peak to the peak.
Energy is sum of squares; t99 ends on the first sample reaching 99% cumulative energy.
RMS scans all complete 480/2400-frame windows. A symmetric 8640-sample Hann
`0.5-0.5*cos(2*pi*i/8639)` is zero-padded to an unnormalized 16384-point FFT; band
percentages divide by every positive non-DC bin through Nyquist, with `0<f<120` and
`f>=2000`. Numeric gate endpoints are inclusive. Recipe duration is never substituted;
metrics establish safe scale only.

R5A may not reuse or transform R2 recorded explosions, current product Bomb low bodies
or air layers, R3 WAVs/sweeps/noise/lobes/chain beats, or R4A WAVs/contact layouts/damped
modes. Action pitches are legal only as complete frozen Action A atoms. No external Foley,
realistic explosive crack, pressure prelude, sub-bass, long tail, continuous noise,
reverb, stereo exaggeration, or chain cue is admitted.

The first writer boundary is docs-only: `docs/DESIGN.md`, `docs/CURRENT_TASK.md`, the T37
phase document, and T37 `STATE.md`. After independent contract and metric-feasibility QA,
one evidence writer may own only
`docs/evidence/t37/bomb-familiar-language-audition-r5a/**`. The manifest binds exact review
and product snapshot `b11b7b552f1504094a94ccc5e21410a694bf2881`, the later accepted
four-doc contract, separate authorization, and evidence source-only head, then verifies
linear ancestry. Base-to-contract is limited to the four contract docs; contract-to-
authorization is limited to CURRENT_TASK, T37 STATE, and CHANGELOG; authorization-to-
source-head is limited to the exact new-directory source allowlist in CURRENT_TASK; later
generated commits are limited to its three WAVs, manifest/report/browser outputs,
client-smoke tree, and three named screenshots. Any source correction creates a new source
head and invalidates every output. It hashes sources/outputs except itself/final report;
the report hashes and recomputes the manifest without recursive self-hashing.

Completion/switch/stop are reusable: old cue sources/timers/callbacks reach zero while the
context, Renderer, one Canvas, and `ready=true` remain. Dispose/pagehide from priming,
pending, active, and idle terminally close the context, destroy Renderer, remove Canvas,
and set `ready=false`. HMR proves the same old-instance cleanup and then one fresh ready
instance with one Canvas.

Only explicit player acceptance of one normal A/B/C opens a new docs-first R5B chain
contract. R5A does not authorize product audio. Accepted Bomb visual/reduced-motion and D1
transition, plus Action A, Studio, and Ice 2, remain frozen.

## 2026-08-15 T37 — Bomb R4A normal-cue calibration (human rejected)

The player rejects every R3 cue: normal A/B/C and chain A/B/C are all **HUMAN
REJECTED**. R3's `99/99` signal and browser report remains valid technical history but
cannot authorize product integration. The complete R3 directory and hashes are frozen;
R4 may not reuse its WAV bytes, low downward sweeps, continuous seeded-noise bands,
fixed ten-beat chain, labels, or recipes, and may not present a gain/filter-only variant
as new work. The player's concise rejection does not identify one subjective cause, so
the following measurements are a contract diagnosis rather than an invented taste quote.

R3's final-output peaks were `0.374–0.406`, versus `0.197` for accepted hard-drop and
`0.196` for accepted one-line Studio clear. Its 50 ms maximum RMS was roughly
`11.5–12.5 dB` above hard-drop, total energy was `13.1–14.0 dB` above hard-drop, and all
three normal cues concentrated more than 97% of their energy below `250 Hz` (with B also
excessive below `120 Hz`). The R4 gate therefore removes the former
`+5–7 dB` peak window and explicitly bounds short-window loudness, energy, and midrange
detail. Metrics can reject another oversized candidate; only the player can decide
whether the result is a friendly, block-like **崩**.

R4 is split into two human gates. **R4A owns only the normal Bomb cue.** Its target is a
small group of game blocks simultaneously releasing and collapsing in one short tactile
gesture. Scale comes from two or three rounded contact voices, not sub-bass pressure,
realistic explosion impact, continuous noise, long decay, reverberation, or a higher
peak. R4A is original procedural synthesis only: no R2/R3 media, external Foley,
commercial-game samples, laser/chiptune gesture, sharp crack, or independent low-pressure
layer. Visible choices use neutral identifiers `X/Y/Z` so descriptive names do not prime
the verdict:

- `X`: two simultaneous fixed damped modes at `196 / 302.7 Hz`, the second starting
  about `7 ms` later and at least `12 dB` quieter; no glide and no noise/texture bed.
- `Y`: three damped Action-family detents at `246.94 / 220 / 196 Hz`, staggered roughly
  `0 / 22 / 45 ms` and decaying `0 / -4 / -7 dB`, with no continuous bed.
- `Z`: a deliberately nonmusical fixed modal cluster at `174.61 / 239.7 / 326.9 Hz`
  (ratios approximately `1 : 1.373 : 1.872`) with staggered attacks and one shared
  decay, no noise bed and no low downward glide.

Each X/Y/Z contact may include at most one internal `0.9–1.8 kHz`, `24–45 ms` damped
partial at `-18–-14 dB`; it is part of that contact voice rather than an added texture
layer. This is the only authorized bright detail and keeps the simultaneous-voice ceiling
at three.

Every candidate is scheduled at the accepted normal Bomb visual impact (`220 ms` after
the warning begins), never at event time zero. At fixed measurement `volume=1`, the
audition reproduces the complete future candidate route: recipe oscillator, per-voice
`min(0.5, gain * 1.45)`, `mutation bus 0.96`, neutral `candidateEffects 1`,
`candidateMaster 1.85`, Action compressor `-4 dB / knee 6 / 3:1 / 3 ms / 120 ms`,
`enabledGate 1`, then output `volume * 0.78`. It also reproduces the exact accepted
hard-drop and one-line Studio graphs. It must run the current production renderer rather
than an audio-only approximation. Candidate activity is
`110–160 ms`; file duration is `0.14–0.22 s`, with 95% energy ended by `140 ms` and 99%
by `180 ms`. After the complete graph, each candidate must satisfy:

- peak `0.205–0.250`, absolute maximum `0.260`, and candidate-to-candidate peak spread
  at most `0.5 dB`;
- full-file RMS `0.035–0.055`, maximum 10 ms RMS `0.080–0.130`, and maximum 50 ms RMS
  `0.050–0.075`;
- total energy `+1.5–+6 dB` relative to hard-drop and crest factor `12–17 dB`;
- peak time `8–22 ms` after impact, attack `6–14 ms`, spectral centroid `190–420 Hz`,
  `<70 Hz <= 0.5%`, `70–120 Hz <= 20%`, `250 Hz–1 kHz = 3–20%`,
  `1–2 kHz <= 8%`, `2–4 kHz <= 4%`, and `>4 kHz <= 1%`.

The `250 Hz–1 kHz` floor is deliberately modest: it remains compatible with the quiet
upper contact in the accepted Action family while still excluding R3's greater-than-97%
concentration below `250 Hz`. It does not authorize an extra bright layer or stronger
harmonics outside the X/Y/Z structures above.

R4A's sole writer boundary is the new
`docs/evidence/t37/bomb-soft-block-audition-r4a/**` directory. Its page provides exact
hard-drop and one-line-clear references, `reference -> candidate` comparison, three
normal-Bomb `1x` animation controls, no autoplay, reject-all default, and optional
nonbinding reason tags (`too loud / too dull / too sharp / too long / too note-like /
timing wrong`). Deterministic bytes, graph measurements, hashes, timing, responsive 44 px
controls, cleanup, one Canvas, and zero browser errors are automatic gates. The manifest
must bind the contract base/current product SHA plus the imported renderer, Mutation
timeline/token, recipe, renderer harness, and verifier hashes, and must recompute the
`220 ms` normal-impact invariant from those current modules. Full-motion `1x` is the sole
human taste surface. A separate reduced-motion technical pass uses the same candidate
bytes and current normal-Bomb timeline, proves audio alignment to its renderer-reported
impact, static/no-particle presentation, cleanup, and zero errors, and does not reopen
visual taste. No automatic check may claim sound acceptance. `progress.md` remains an inherited dirty path, so the
required iteration record lives in the T37 `STATE.md` instead.

Only an explicit player choice `X`, `Y`, or `Z` opens a separate docs-first **R4B** chain
contract and new `bomb-soft-chain-audition-r4b/**` boundary. R4B must preserve the chosen
normal atom exactly at the first real chain impact, derive duration from the production
`chainTriggerRows` propagation plan, and use only two or three progressively quieter
macro-collapse clusters rather than a fixed pulse train or continuous noise. R4A does not
authorize R4B evidence or any `src/game/audio/**` edit. Product integration remains a
third, later docs-first slice after both human gates pass.

## 2026-08-14 T37 — Bomb R3 stylized block-burst audition (human rejected 2026-08-15)

This section supersedes only the R2 Bomb audio identity and listening direction below.
The R2 causal visual source `8de0cb7`, source-bound evidence `7eb1d44`, and live review
helper `70ce61f` are now **HUMAN ACCEPTED** at full-motion `1x`. The D1 Settled Handoff
route transition, including its current-HEAD revalidation at `aa2c9fd`, is also
**HUMAN ACCEPTED**. Neither accepted visual system is reopened by this audio redesign;
Bomb rules, scoring, `chainTriggerRows`, row-front timing, route ownership, focus/history
behavior, and reduced-motion behavior stay frozen.

Human listening rejects every R2 recorded-sample option: normal A/B/C and chain A/B/C.
Their realistic explosion identity and loud, startling presentation are the defect, so
lowering their gain, shortening their tails, or filtering the same bytes is not a valid
R3 repair. `Deep Explosion`, `Muffled Distant Explosion`, cinematic sub-bass pressure,
long reverberation, sharp explosive cracks, and any copied commercial-game sound are
prohibited. The complete R2 directory remains immutable historical rejection evidence.

R3 is an isolated, deterministic, procedural audition for a stylized block-collapse
**崩**: it should make the player feel that a TetraMorph piece has broken apart without
suggesting real explosives. The normal cue is dry, rounded, tactile, clearly audible,
and approximately `0.28–0.55 s`. Its weight lives in the low-mid body and controlled
granular fracture rather than sub-bass or a hard high-frequency spike. It must remain in
the same concise, non-musical family as the accepted hard-drop and Studio clear cues and
must not startle at equal listening volume.

The chain cue begins with the same candidate motif and extends it with low-gain block
crumbles aligned to the already-frozen causal row beats. Its larger scale comes from
duration and spatial/temporal spread, not a higher initial peak or repeated full-strength
blasts. Target duration is `0.85–1.25 s`, with no tail beyond `1.40 s`; rapid identical
pulses, machine-gun rhythm, noise wash, and long rumble are prohibited. Three candidates
must differ by material character, not merely gain. Normal and chain may be compared
separately, but only a same-letter pair can pass directly into product integration. If the
player prefers a normal cue and chain texture from different letters, that exact
recomposition must be rendered and human-auditioned as a new pair before integration.

All R3 work before human selection is evidence-only under
`docs/evidence/t37/bomb-block-burst-audition-r3/**`. The page provides current hard-drop
and clear context references, six independent normal/chain controls, no autoplay, and
default reject-all verdicts. Automated checks may prove deterministic mono 48 kHz WAV
bytes, finite samples, bounded peak/RMS and frequency energy, timing, hashes, responsive
layout, playback cleanup, and zero browser errors. They cannot prove that a cue feels
gentle, block-like, or related to the game. Product palette, engine, and assets remain
closed until the player explicitly accepts both cues of one same-letter normal/chain pair;
a cross-letter preference requires exact-pair re-audition, and another reject-all verdict
opens a new audition contract rather than product integration.

## 2026-08-14 T37 — Bomb R2 causal Boom correction

This section supersedes only the Bomb audio and chain-clear presentation paragraphs in the
2026-08-13 contract below. Mechanical removal, scoring, carrier activation, settlement,
and deterministic state remain accepted and unchanged. The previous procedural Bomb cues
and scan-bar/full-board-outline chain visual are human rejected.

### One causal origin shared by Core, picture, and sound

A `chain-clear` activation carries immutable `chainTriggerRows`: the sorted exact
pre-clear ordinary full rows that caused the Bomb resolution. These rows come from the
same Core plan as `clear-started.rows`; they do not include an extra row merely because the
first Bomb carrier spans it. `chainOriginCarrierId` and complete `chainOriginCells` remain
the identity and horizontal-art anchor for the first primary Bomb, but no longer determine
vertical propagation distance.

Presentation first maps every `chainTriggerRow` through
`clamp(row, VISIBLE_START_ROW, BOARD_HEIGHT - 1)`, then sorts and deduplicates the result as
`visibleTriggerRows`. For visible presentation row `r`,
`distance(r) = min(abs(r - visibleTriggerRow))`. Every derived visible trigger row is
distance zero; equal-distance rows above and below all sources share one beat. Hidden rows
settle in Core without creating a hold, so a hidden-only source starts at the nearest
visible boundary. Core's original rows remain unclamped evidence. Renderer and audio
consume the activation's same frozen row list through this same pure projection rather
than independently remembering a prior event.

The pure projection is already imported by the production audio scheduler. Its two
existing duration/propagation call sites therefore pass `chainTriggerRows` in the same
source checkpoint as the renderer migration. This is a compile and causal-origin repair
only: it does not authorize a new sample, synthesis recipe, gain, palette entry, voice
policy, queue policy, or listening-acceptance claim.
Its direct audio test may update only the numeric beat/start assertions invalidated by
those two call-site arguments and the already-frozen `220 / 56 / 220 ms` plan. The test
must remain a behavioral gate and may not relax any qualitative sound distinction.

### Explosion visual language and timing

The normal Bomb and every reached chain row share one local explosion motif: an irregular
heat ridge, a contained hot core, short broken ember fragments, and a local impact ring.
Full motion warns and compresses for `220 ms`, explodes distance zero, then advances one
distance group every `56 ms`; each reached row lives for `220 ms`. Unreached rows retain
their immutable pre-clear cells and emit no fragments. The first impact may create one
bounded board impulse; later rows do not repeatedly shake the camera.

Reduced motion keeps causality with a `50 ms` static prelude, `20 ms` distance beats, and
`90 ms` static row blasts. It has no moving fragments, expanding ring, camera shake, or
full-screen flash. A motion preference change preserves normalized progress and never
replays an already reached distance group.

The former full-width row rectangles, horizontal scan strips, permanent alpha floor,
whole-board tail border, and first-impact emission from every occupied board cell are
prohibited. No chain frame may degrade into a full-board color wash. Completion leaves no
blast primitive or stale cell behind.

### Boom audio identity and human gate

Bomb audio is sample-based and audition-first. Candidate sources must be verified for
redistribution and archived with provenance; commercial-game sounds and imitated trade
dress are prohibited. The preferred verified CC0 sources are Kodack's recorded/edited
`Deep Explosion` for a low physical Boom body and NenadSimic's low log-drum/reflection
`Muffled Distant Explosion` for the rounded chain tail.

The normal cue is one compact and clearly audible Boom, aligned to the normal visual impact.
It has a firm transient and low-mid body without a laser rise, stable musical pitch,
chiptune grain, or piercing upper-mid crack. The chain cue begins with that same Boom at
the distance-zero visual impact, then adds restrained low impacts on the shared distance
beats and a coherent rounded tail for `2.2–3.0 s`. It is not a volume boost or a rapid
sequence of identical blasts. Automated peak, duration, dispatch, and license checks are
necessary but cannot accept taste. The product asset catalog stays closed until the player
explicitly accepts one isolated normal/chain A/B pair.

### Live player-review boundary

The visual player gate uses a live deterministic Core-to-production-renderer page under
`docs/evidence/t37/bomb-row-causal-review-r2/`; a CSS reconstruction, interpolated image
sequence, or edited video cannot stand in for the actual effect. The page dispatches the
same public hard-drop fixture as the source-bound evidence, fails closed unless
`clear-started.rows=[30]`, `chainTriggerRows=[30]`, origin rows `29/30`, and the committed
board clears completely, then sends those real events to `TetrisRenderer`. Full motion
defaults to the product's actual `1x` timing; an explicitly labelled `0.5x` inspection
speed and the production reduced-motion plan are review aids only. Replay must replace the
previous renderer cleanly, keep exactly one Canvas, expose no product audio, and show the
current causal phase without drawing explanatory art over the board. This helper may make
the already-frozen visual candidate easier to judge, but it cannot claim a natural App
reach or player acceptance.

The renderer/audio foreground queue advances after the final reached visible row finishes
its `220 ms` local blast (`90 ms` reduced), not after the long reverberation file ends. At
that exact visual completion, the next carrier triggered by the same clear may begin. If
that later Ice, Supergravity, or Multiplier cue starts while the chain tail is alive, a
dedicated chain-tail gain ramps to no more than `25%` of its then-current value within
`40 ms`; the successor cue is not attenuated. If there is no successor, the tail keeps its
natural envelope. Row-propagation impacts stop at the visual front and may not continue
under the successor. This preserves the long clear identity without delaying or masking
the feedback for carriers that the clear also activates.

## 2026-08-13 T37 — precise gravity and causal Bomb outcomes

### Gravity contract

- Public speed values are fall intervals in seconds per cell; lower means faster.
- Mutation uses one tier per six cleared lines:
  `0.60, 0.50, 0.40, 0.30, 0.20, 0.15, 0.12, 0.10, 0.09, 0.08`.
- Ice is exactly `0.80 s/cell`. Its final tick is still frozen; expiry resets all gravity
  progress before ordinary Mutation gravity resumes.
- Classic defaults to `0.60` opening and `0.08` fastest. Both endpoints remain selectable
  for the next run from the shared slow-to-fast choices
  `1.00, 0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.15, 0.12, 0.10, 0.09, 0.08`.
  Each ten cleared lines advances one available choice toward the selected fastest bound.
- Core uses integer fixed-point progress, not floating elapsed time or rounded tick
  thresholds. At 60 Hz, ten sub-ticks per simulation tick give exact thresholds
  `360, 300, 240, 180, 120, 90, 72, 60, 54, 48` for the Mutation ladder and `480` for
  Ice. The accumulator subtracts one threshold on an automatic fall and keeps its
  remainder; the minimum threshold remains greater than one simulation tick.
- Classic/Mutation hashes include the bounded remainder because it changes the next fall.
  Survival and Endgame keep a zero remainder invariant and their existing hash domains.
  Settings, HUD, and accessibility copy render the exact selected interval, including two
  decimals below `0.20`, instead of rounding `0.15` to `0.2` or `0.12` to `0.1`.

### Bomb contract

For a Bomb carrier removed by an ordinary full-row clear, `triggerRows` are the pre-clear
rows occupied by that carrier and present in the ordinary clear set. For every trigger row
`r`, the blast contributes `{r - 1, r, r + 1}` clipped to `[0, BOARD_HEIGHT - 1]`; all
contributions are sorted and deduplicated. Thus row `BOARD_HEIGHT - 1` produces exactly the
last two rows. Normal full rows and every Bomb plan are resolved from one immutable board
and carrier snapshot, and their union is applied once.

The outcome is `chain-clear` only when a primary Bomb band intersects at least one cell of
a different Bomb carrier. Merely triggering two distant Bombs together is not a chain.
A chain clears every visible and hidden board cell and every carrier record, and activates
every locked carrier in the immutable pre-clear snapshot exactly once. Non-Bomb carriers
apply their normal Freeze, Collapse, or Multiplier effect even when they lie outside the
ordinary rows and primary bands. Every pre-clear Bomb becomes a participant and earns one
Bomb bonus under the multiplier captured before this settlement. Triggered carriers do
not recursively produce another clear or another activation. `primaryIds` are the Bomb
carrier IDs intersected by the ordinary rows. `directHitIds` are all different Bomb IDs
intersected by any primary band. For `blast`, `participantIds` is their unique union; for
`chain-clear`, it is every pre-clear Bomb ID.
Two primary Bombs on the same row chain because each band intersects the other carrier;
two distant primary Bombs do not.

Bomb score, removal, and its summarized activation resolve first from the captured
pre-clear multiplier. Activated non-Bombs then apply in ascending carrier ID. Repeated Ice
and Supergravity carriers refresh their normal windows; repeated Multiplier carriers fold
deterministically through `1x -> 2x -> 4x` and remain capped at `4x`. Non-Bomb summarized
events follow the first appearance of each item type in that ID order. The final processed
carrier supplies `mutationLastItem`; Bomb supplies it only when no non-Bomb activates.

For `blast`, the one settlement removes the sorted unique union of `ordinaryRows` and
`blastRows`; for `chain-clear`, it removes all canonical rows. In either outcome,
`progressRows` is the subset of that removal set that was non-empty in the immutable
pre-clear board, and `state.lines` increases by `progressRows.length`. An ordinary row that
also belongs to a blast band counts once, while an empty adjacent row moves the board but
adds no progress. For `blast`, `activationIds` contains every non-Bomb carrier hit by
`ordinaryRows ∪ blastRows`; for `chain-clear`, it contains every pre-clear non-Bomb
carrier. Both sets are deduplicated by carrier ID.

The single summarized Bomb activation requires immutable `bombOutcome`, `blastRows`, and
`participatingBombCount` evidence. A `chain-clear` additionally requires immutable
`chainOriginCarrierId` and `chainOriginCells`, copied from the smallest-ID primary Bomb's
complete pre-clear carrier record. Those fields are absent for `blast`. The count is
exactly `participantIds.size`, while `blastRows` remains the primary-band union even when
the outcome is `chain-clear`.
`lines-cleared` continues to describe only the ordinary full rows, preventing the classic
row-clear animation/audio from masquerading as an explosion.
Normal Bomb presentation follows the real blast band instead of the old fixed floor rows.
`chain-clear` receives a separate full-board material collapse and cue, remains distinct
under reduced motion, emits only once through Runtime, and suppresses overlapping ordinary
clear/normal-Bomb audio. Its Bomb summary is delivered before the triggered non-Bomb
summaries, so the causal full-board beat remains legible. Human listening remains required
for the new chain cue.

The chain-clear wave originates at the primary Bomb with the smallest carrier ID. Its
entire carrier geometry illuminates first; clearing then spreads in two deterministic
fronts, one row at a time upward and downward from the carrier's origin rows until each
front reaches its board edge. Rows equidistant from the origin share one beat. If the
carrier occupies more than one row, every unique row in its complete pre-clear geometry is
an origin row, including rows that were not ordinary full rows. For any canonical row
`r`, `distance(r) = min(abs(r - originRow))`; this also resolves split/non-contiguous
origin geometry. Core removes all 40 canonical rows atomically, while presentation groups
only rows `[VISIBLE_START_ROW, BOARD_HEIGHT - 1]` by that distance. Hidden rows and
hidden-only distance groups consume no animation hold and no wave-audio beat. If every
origin cell is hidden, the closest visible boundary row becomes the first visible group.
The reduced-motion path keeps the same visible origin and row order with shorter holds and
opacity changes, never an originless simultaneous whole-board flash.

### Preserved boundaries

Survival receives no implementation change in this slice; only a final-report proposal is
requested. Endgame v4 may not be retried, line-clear reward/duration stays last, and icon
work stays last.

## 2026-08-09 T37 — Historical pre-N0 material/curriculum contract

> This section records the names and checkpoints that existed before the canonical Endgame
> decision above. Any former namespace shown below is provenance, not a current product,
> code, route, persistence, or authoring alias. Current implementation follows the Endgame
> phase document and N0 contract.

**Status: IN PROGRESS.** T36 was technically safe but failed human listening. Repeated
isolated redesigns also left transitions, ordinary pieces, Mutation materials, and
Puzzle progression without one shared world rule. T37 defines that rule as **gravity
reveals material**: motion is calm and precise; contact, clearing, and transformation
produce short physical responses; exceptional states change material rather than
adding unrelated badges or ornamental effects.

### Player-directed Mutation rules correction

- Mutation's ordinary gravity ladder again ends at **0.1 seconds per cell** (6 fixed
  ticks at 60 Hz). It keeps the established six-cleared-line tier cadence and restores
  the complete late-game `0.8 → … → 0.1` ladder; Ice still overrides the live cadence
  with 1.0 second per cell while active.
- Supergravity changes only the covered tetromino's settlement. After its ordinary
  rigid descent, each occupied column of that tetromino may continue downward against
  the immutable pre-lock board; cells in one piece column keep their vertical spacing.
  Already-settled board cells are collision support and never move, get pushed, or get
  compacted by this lock. The covered cells cannot tunnel through them.
- The landing ghost, final `piece-locked` coordinates, stored carrier geometry, and
  line-clear decision all use that same piece-only settlement. A floating settled cell
  therefore remains where it was and can stop a covered column; unrelated columns can
  still descend farther. This explicitly supersedes the older whole-board column
  compaction inherited from the historical Collapse mode.
- Accepted implementation is source `646b865` plus bilingual copy `ae75f1e`; browser
  evidence `c691d54` binds to that product source and reproduces the reported floating
  support without movement, tunnelling, or a false clear. Final typecheck, the complete
  suite (`381 passed / 8 skipped`), build, and final independent read-only QA pass. This
  bounded acceptance returns T37 to the R5 listening gate; it does not accept audio.

### Feedback and sound language

- The mix is semantic first: a listener must be able to distinguish lateral movement,
  rotation, landing, hard drop, row release, countdown, and Mutation activation from
  contour and timing rather than volume alone. Physical, synthesized, and restrained
  electronic layers are all permitted. Exposed piercing tones, interchangeable arcade
  bleeps, melody, notification-pack language, and loud cinematic trailer treatment are
  still rejected.
- Perceived emphasis remains `move < rotate < lock < hard drop < 1/2/3 clear < Mutation
  < four-line clear/completion`, but the differences come from mass, duration, texture,
  and space rather than sharpness or raw loudness. Rapid movement and rotation must
  remain comfortable; line clears must provide unmistakable positive feedback.
- Clean-room references may inform cadence, response hierarchy, semantic mapping, and
  material category; commercial game recordings, pitch sequences, timing fingerprints,
  and trade dress remain prohibited. A minimal external asset may enter an audition
  only from its primary publisher with verified redistribution terms, a pinned version
  or commit, a local provenance/license record, and no runtime network dependency.
  Music and continuous state loops remain out of scope.
- Before rebuilding all cues, T37 publishes a compact audition matrix generated from
  production recipes. Human acceptance of that matrix is the expansion gate. Peak,
  RMS, clipping, determinism, and repetition-density measurements remain rejection
  tools, not taste approval.
- The first T37 audition (`0bebf8a` / `2ff0bb6`) is **REJECTED BY HUMAN LISTENING**.
  It was quieter, less connected to the matching action/effect, and worse than the
  earliest gameplay sound design. Replacing electronic notes with generic wood,
  ceramic, and stone objects did not create functional feedback.
- R2 source `06bd7ea` corrected event timing but was not presented as a listening
  candidate before the player removed the blanket non-electronic restriction. It is
  superseded by a resource-informed R3 audition rather than incrementally amplified.
- The primary R3 reference is UI SFX `0.4.0` / source commit
  `2001f3dac2d1cf86ad99cbad5cef222c3a8b9082`: it separates stable semantic cues from
  switchable sound families, publishes generated audio under CC0-1.0, and publishes
  its implementation under MIT. The audition may vendor only the exact CC0 candidate
  files it exposes for listening; production adoption still requires explicit human
  acceptance and an asset manifest. Kenney Interface Sounds and omgaudio are verified
  CC0 reserves, not mixed into R3, so provenance and sonic identity stay unambiguous.
- R3 compares the same event map across three coherent families: `studio` for warm
  restraint, `mechanical` for firm detents, and `scifi` for controlled electronic
  articulation. Ice adds one separately labelled `glass` candidate. It does not mix
  families invisibly or claim that signal measurements prove taste.
- Human listening accepts only the R3 `studio` one-, two-, and three-line releases and
  `3 / 2 / 1` countdown. Freeze those exact assets, cadence, mix, and original R3
  compressor. Four-line clear uses the same row-release grammar with four pulses; it
  must not append R3's rejected `complete` tail or introduce a separate sharp
  celebration.
- R3 movement, rotation, natural lock, and hard drop are all rejected across the
  presented families because their attacks are too pointed and the actions do not feel
  soft enough. R4 may change their source cues and use attack shaping, low-pass
  filtering, rate, pan, and bounded low body, but it must not solve sharpness by making
  them inaudible. Each action remains distinguishable by motion contour and weight.
- The R3 `glass` Ice pair is rejected as unpleasant. R4 replaces it completely with a
  separately sourced or original crystal-freeze candidate synchronized to the same
  320 ms bind/release visual contract; no R3 Glass layer is retained by default.
- R4 uses one coherent `soft` action set from the same pinned UI SFX release instead
  of another broad family comparison. Left/right use native directional `back` and
  `forward`; rotate uses `reorder`; natural lock uses `lock`; hard drop uses `drop`.
  Playback stays between `0.88×` and `1.05×`, attacks stay between 12 and 18 ms, and
  post-filter peaks are recalibrated so low-pass softening does not become a hidden
  volume cut. Repeated move voices release over 12 ms before stopping.
- R4 Ice candidates come only from primary-page CC0 OpenGameArt sources: Freeze Spell
  by `artisticdude` and Ice breaking/shattering by `IgnasD`. The comparison is a
  freeze-only slice whose main response lands at 320 ms, an offline-baked
  freeze-plus-shard cue, and a lowered/filtered shard baseline. The old high-frequency
  Ice spells pair and the 1 ms high-pitched omgaudio zap are explicitly excluded.
- Human listening rejects the complete R4 candidate. Its `soft` action set is not a
  recovery baseline, and none of its three Ice recipes may enter production or be
  rescued by another gain/filter-only pass. Automated signal and browser checks remain
  technical evidence only and do not weaken this rejection.
- R5 is recovery-first. Before authoring another action family, inspect the repository's
  audible history and expose at most two exact, commit-identified earlier directions
  that genuinely sounded softer. Do not rely on names such as `soft`; the audition must
  identify the original bytes/recipe and make any new processing explicit.
- R5 Ice is a short, crisp **real ice-cube** response: a small hard frozen object makes
  contact and/or a concise crack. Reject spell casting, wind beds, glass sparkle,
  avalanche-sized shattering, long crystalline tails, and piercing zap transients.
  Compare at most three primary-source candidates with verified redistribution terms.
  Preserve the accepted Studio clear 1/2/3, countdown, and four-pulse clear 4 exactly;
  they are status-only and are not reopened for voting.
- The R5 audition restores the exact T28 `35509a7` and T29 `ca5da48` recipes and each
  historical mixer. Only lateral movement gains the disclosed `-0.28 / +0.28` stereo
  pan; every centred action bypasses `StereoPannerNode` so browser equal-power panning
  cannot silently reduce its historical level. Its three Ice options are independent
  CC0 real-Ice recordings played at original rate as one short peak-centred window,
  without filters, pitch changes, spell layers, or synthetic sparkle. Freesound HQ Ogg
  previews are sufficient for this human gate; production adoption still requires the
  selected uploader's original WAV and a pinned SHA-256.
- Repaired source `f241488` and evidence `05b28ff` pass the signal, browser, direct-file,
  responsive, reduced-motion, full project, and independent read-only gates. This only
  establishes an auditable R5 listening candidate; the player's listening verdict is
  still the sole authority for expansion.
- Human listening now accepts **Action A** and **Ice 2**. Action A is the exact T28
  `35509a7` recipe/mixer recovered by R5: `1.85` action master, `1.45` voice boost,
  `0.50` ceiling, and compressor `-4 dB / knee 6 / 3:1 / 3 ms / 120 ms`, followed by
  the audition's `0.78` output reference. Left/right alone use `-0.28 / +0.28` pan;
  rotate, natural lock, and hard drop stay on the direct centred route. Move is the
  short `220 Hz` settle; rotate is the `293.66 + 440 Hz` pivot/detent; lock is the
  `246.94 Hz` contact; hard drop is the `174.61 + 349.23 Hz` mass/contact pair and its
  audible contact begins after the renderer's 50 ms descent trail when distance is
  non-zero. These accepted cues must be reproduced exactly before any additional cue
  is presented as part of the same language.
- Ice 2 is Freesound sound `819779`, uploader `sbml`, title `Ice cubes`, licensed CC0.
  Runtime must use the exact accepted HQ Ogg byte
  `5a68425717de348ba3d10767618fa4c428a97f26c2e85abc96f45b7bfb35a450` at original
  rate, window `0.19375–0.63375 s`, with a 3 ms rise to `0.78` and 12 ms release,
  routed directly to the `0.78` output reference without the Action A compressor. The
  uploader-original `819779__sbml__ice-cubes.wav` remains a mandatory provenance
  archive with a pinned SHA-256 before the production asset gate can close; the
  accepted Ogg remains the runtime byte so no unreviewed transcode changes the sound.
- The already accepted Studio files are also byte-frozen: `progress-step.ogg`
  `f3f02d93d22fc0d1d046674510cfff98235f4df8cc839b13c6da23bf6ea97b0c` and
  `start.ogg` `b85abe167750922700a1aa7f5d2f5e5162facfdc6782c298b9c825375bdfb388`.
  Clear 1–4 uses one through four progress pulses and never the rejected completion
  tail. Countdown uses progress at `0 / 500 / 1000 ms` and start at `1500 ms`; the
  visible entry digits adopt the same 500 ms cadence so accepted audio and animation
  do not drift. Studio samples retain their exact stereo-panner and
  `-10 dB / knee 10 / 4:1 / 3 ms / 120 ms` compressor route.
- Stage C may extend this accepted grammar to the remaining events, but every new
  soft-drop, Survival, UI, Bomb, Multiplier, and Supergravity cue remains a production
  candidate until focused listening and automated gates pass. Mutation audio must use
  the renderer's serialized effect order and visual start time; a fixed 35 ms audio
  stagger is not sufficient when an earlier Bomb delays a later Ice animation.
- The remaining-cue candidate is recovery-first rather than another timbre experiment.
  Its baseline is the last intact pre-T29 T28 audio snapshot `2c4e4ae`: compact sine
  contours for soft drop, undo, Survival pressure, pause/resume, and terminal feedback;
  a rounded `148 + 93 Hz` two-part weight for Supergravity; a contained `74 Hz` body
  plus deterministic `640 Hz` low-pass air crack for Bomb; and the short T28
  fundamental/bright-partial marimba dyads for Multiplier ×2/×4. Freeze is excluded
  from this recovery because the accepted Ice 2 sample owns it.
- These restored support cues use a separate clone of the Action A gain/ceiling/
  compressor contract so their mix can be rolled back without changing the accepted
  Action A route. They remain candidates: historical provenance is evidence of the
  earlier softer direction, not a new human acceptance verdict. No sustained Mutation
  loop returns, and every cue stays under the shared sixteen-voice ceiling.
- Production candidate `95978eb` implements that boundary. It preserves the established
  five bus gains, then routes candidates through a separate Action-A-equivalent
  master/compressor so candidate pressure cannot alter the accepted action chain.
  Soft drop restores the historical `> 52 ms` throttle. The deterministic Bomb pressure
  voice reproduces the earlier sine formula, `640 Hz` low-pass, `Q 0.7`, and 9 ms attack.
  T28's sequential level/finish/failure arpeggios are deliberately not restored; compact
  overlapping lift, chord, and descending-mass gestures keep terminal feedback readable
  without becoming melody.
- Listening evidence `006a936` plus coverage repair `94fffb9` imports the production
  `AudioEngine` rather than copying
  recipes. Its browser verifier passes 28 controls, source binding, desktop/mobile
  overflow and 44 px targets, reduced motion, and zero console/page errors. These are
  technical gates only. Follow-up test `2766a55` jointly freezes the complete production
  Bomb body/pressure route, while the repaired browser pass actually dispatches all 28
  listening controls and removes stale multi-button playback highlights. Utility,
  Survival, outcome, Bomb, Multiplier, and Supergravity remained candidates at that
  checkpoint. The player later accepted all preceding modifications, including the
  strengthened Bomb join and this remaining cue set. The R5 provenance record uses the real
  full T28 commit `35509a70c35cebf16b942387229ca880756a61cd`.
- The 2026-08-10 live-play verdict reopens two bounded Stage-C details. Bomb pressure
  is audible but does not read as an explosion because its complete `0–160 ms` cue
  ends before the renderer's `220 ms` impact. Two-, three-, and four-line clears are
  also rejected as an audio/visual pair: Studio already emits distinct row pulses,
  while the locked board still removes every pending row together at Core commit.
  Action A, Ice 2, countdown, the Studio sample bytes/mixer, and the one-line clear
  remain frozen.
- The Bomb correction keeps the existing `620 ms` visual sequence and sixteen-voice
  ceiling. A restrained `74 Hz` warning pressure begins at activation; the actual
  explosion begins at the renderer's exact `220 ms` impact with a `111 → 48 Hz` body,
  a short `880 Hz / Q 0.55` low-passed deterministic crack, and one quiet low tail.
  The cue ends by `490 ms`, before the next serialized Mutation may start at `620 ms`.
  This is a human-listening candidate, not an accepted replacement.
- A normal one-line clear keeps its current profile and timing. Counts two through four
  use Core's existing twelve-tick / `200 ms` line-clear phase as the requested brief
  gameplay hold; no simulation duration changes. Rows start by ascending board `y`
  (top to bottom), independent of event ordering, on the accepted Studio relative
  beats: `0 / 180 ms`, `0 / 90 / 180 ms`, and `0 / 60 / 120 / 180 ms`. Presentation
  quantizes those beats to the nearest 60 Hz tick (at most `6.67 ms` error).
- The prior correction that hid a complete row as soon as its beat started is rejected
  by live play. A started row now remains materially readable for a short confirmation
  flash, then uses the classic console centre-out order `[4,5] → [3,6] → [2,7] →
  [1,8] → [0,9]`. The sequence is an original TetraMorph treatment: restrained inset
  whitening and cell-pair erasure, not copied sprites, palette, exact legacy timing,
  broad screen flash, contraction, debris, or fracture chips. Core still collapses all
  resolved rows once at `200 ms`; only the final row may finish through a bounded,
  translucent renderer-owned tail after that commit, and that tail must not cover the
  settled board as an opaque old row. Reduced motion and Puzzle keep the same discrete
  top-to-bottom audio beats but replace column travel with one stationary row flash and
  no post-commit motion.
- The implemented candidate at `d1063b8` compresses the ordered centre-out grammar into
  three readable 60 Hz erase stages per row: centre two, centre six, then complete.
  Its final beat crosses the unchanged Core commit through an `8 → 4 → 0` translucent
  two-tick bridge. Evidence `354c465`, final gates, and independent QA are technically
  green with P0–P3 all zero; this remains a player-facing motion candidate until normal-
  speed play accepts its cadence and continuity.
- Normal-speed play rejects that candidate: `50 ms` per row and a `33 ms` grey tail are
  too fast to read, integer visibility steps still look like direct deletion, and the
  accepted row beats are separated by empty or hard-cut intervals. R3 therefore samples
  a renderer-owned millisecond track rather than deriving existence from integer Core
  ticks. The complete visual sequence ends at `300 ms`; starts remain the frozen Studio
  offsets, with row windows `210/120 ms` for a double and `120 ms` for every triple or
  quadruple row. Adjacent rows overlap by at least `30 ms`.
- A normal cell pair keeps its full material, receives a restrained local highlight,
  briefly reaches at most `1.035×`, then eases toward `0.78×` while alpha reaches zero.
  It may be culled only after the continuous sample completes. Core still commits once
  at `200 ms`; captured original-material samples continue unchanged to `300 ms`, drawn
  beneath the current board/piece with only low-alpha highlights above. Reduced motion
  and Puzzle keep geometry fixed and use opacity only. No fragments, broad flash,
  copied legacy palette/timing, audio reschedule, or input delay is introduced.
- The player accepts that R3 treatment for two through four rows and explicitly reopens
  one-line presentation. A one-line clear now uses the same `0–300 ms` centre-out
  material track from its existing `0 ms` Studio start: the same symmetric pair order,
  highlight/scale/alpha sample, `200 ms` Core commit, at-most-`100 ms` captured-material
  continuation, stationary Puzzle/reduced-motion form, Mutation/target alpha agreement,
  exclusions, cue cap, and lifecycle cleanup. Its accepted audio byte/mix is unchanged;
  the old one-line precision-cut/chip overlay is retired rather than layered underneath.
- The player's subsequent “前面的修改全通过” verdict accepts this bounded one-line
  reuse and the preceding Stage-C corrections. All one-through-four-line presentation
  and joined audio behavior are therefore human accepted. The missing Ice 2
  uploader-original WAV/hash remains an evidence-provenance follow-up only; it is not
  silently treated as present.
- The replacement audition restores the earliest design's readable motion contours:
  move follows the 56 ms lateral settle;
  rotate owns a curved pivot and detent; hard drop follows the 50 ms descent trail into
  contact; a normal clear starts with `clear-started`, crosses Core's 200 ms clear
  interval, and audibly releases one through four rows; Ice follows its 320 ms
  `frost-bind` / `shard-release` visual timeline. At normal listening volume each cue
  must be unmistakable before measurements or hierarchy tests matter.

### Transition language

- The T37 route grammar is **Settled Handoff**. The old page releases for `120 ms`; the
  destination begins at opacity `.985`, moves no more than `6 px` horizontally and
  `2 px` downward, and settles over `200 ms` with
  `cubic-bezier(.16, 1, .3, 1)`. Forward/back reverse only the horizontal sign; a
  neutral same-depth change uses no invented hierarchy. Scale, blur, flashes, wipes,
  springs, child cascades, theme-specific timing, and entry from full transparency are
  forbidden.
- One stable named route viewport owns the browser snapshot; differently sized Home,
  Library, and Game `<main>` elements do not each claim the same transition name. At
  most one React route and one live Canvas exist. Old visuals may persist only as a UA
  compositor snapshot, never as a second mounted page/runtime. The named viewport
  carries the active theme's opaque `--page` background so transparent gaps in Game
  panels cannot reveal Home or Library content beneath the destination snapshot.
- `App` owns one monotonic navigation epoch. A new intent invalidates and skips older
  native work; only the latest callback may update History and React state. Completion,
  rejection, synchronous failure, interruption, and unmount clean only their own epoch
  and return the current owner to idle. Browser-provided back/forward gestures must not
  receive a second application animation.
- Entering Game cannot declare the native destination snapshot ready until Pixi has
  appended and rendered its single Canvas. A bounded failure path must still settle
  without hanging. Fallback keeps the destination continuously visible and applies only
  its small settle motion; it does not hard-cut to a page starting at opacity zero.
- History stores enough validated route context to restore the selected Puzzle. Route
  commit restores the Home/Library landmark or selected row during the first frame;
  Puzzle Game retains runtime-ready Canvas focus and ordinary Game retains its existing
  countdown/input boundary. Visual completion never gates ready input.
- The application's resolved `data-reduced-motion` value is the route-motion authority.
  Reduced motion performs a no-translation opacity handoff and is stable within `32 ms`;
  a bare media query may not contradict an explicit in-app override.
- Game start/restart/countdown remains owned by the board cover. Mode intro/results are
  a later in-page slice with the board fixed, not part of the first URL-route rewrite.

### Piece and Mutation material language

- Ordinary tetrominoes remain the multicolour baseline and receive only a coherent
  surface/edge/light polish. They must stay quieter than item materials and legible in
  all three themes.
- A Mutation item is the whole tetromino, not a normal piece carrying a badge. **Ice**
  is faceted cyan crystal with a cold internal edge; **Bomb** is dark contained rock
  with lava seams; **Multiplier** is warm gold with sparse glints; **Supergravity** is
  dense bright violet with a controlled inward falloff. Glows are local and bounded.
- The player-supplied 2026-08-09 material board is a direction reference, not a
  production asset or layout to copy. Its adopted principles are triangular internal
  facets on every cell, one continuous material family across the complete tetromino,
  and one sparse secondary motif per item. Ice may carry edge frost and a brief mist;
  Bomb carries ember seams and a contained core; Multiplier carries occasional star
  glints; Supergravity carries a small number of dark gravity wells rather than a badge
  on every cell. The project keeps the `Supergravity` name and mechanic rather than the
  reference image's `Collapse` label.
- Glow strength is state-aware: active piece and Next may show the strongest material
  read, ghost is silhouette-safe and translucent, and settled board cells reduce bloom
  enough that several adjacent pieces remain individually readable. The reference's
  column layout, labels, exact facet network, and heavy full-time bloom are not copied.
- The material identity appears consistently on spawn, board, Next, ghost/landing
  guide, activation, and clear. Colour is reinforced by silhouette-safe surface motifs
  so item identity does not depend on hue alone.
- Any of the four cells may be cleared to activate the item, but the item owns one
  piece-level activation latch. Multiple cleared cells never duplicate its effect.
  Reshape remains removed.

### Puzzle learning contract

- The published curriculum is exactly **5 Intro / 25 Easy / 16 Hard**. Intro uses
  3–4-row boards to teach one visible idea per level without trivial one-drop answers.
  Easy is fully open, mixes ordinary residual boards with reusable techniques, and
  names the technique relationship used for Hard unlocks. Hard contains sixteen
  deliberately authored applications, including tall trick boards, multiple anchors,
  suspended/two-wall cavities, downward triangles, pyramids, and bounded board-shape
  variations when those shapes improve the puzzle rather than decoration.
- Duplicate or near-duplicate residual states are rejected by canonical board/anchor
  fingerprints plus a human technique review. Reordering uses stable IDs and an
  explicit progress migration.
- Every level ships with a fixed queue, initial-state hash, deterministic ruleset,
  exact optimal operation count, and at least two replayable legal solutions when the
  state permits non-unique play. A Hard level may unlock only through a declared related
  Easy level completed within `optimum + 5` operations.
- Guidance teaches observable technique, not solver statistics: complete a row before
  building above it, preserve a safe landing surface, use late horizontal movement to
  route around anchors, plan cavities from the fixed two-piece preview, and control
  extra material introduced by a clear. The UI may reveal these ideas progressively
  but may not expose a full solution by default.
- Stage F1 freezes the active stable-ID roster in
  `docs/phases/t37-puzzle-curriculum-v3.md`. Current positions 1–5 become the five
  rebuilt Intro levels; current positions 6–30 remain definition-preserved as the 25
  Easy levels. Hard retires `tm-puzzle-34`, `tm-puzzle-40`, `tm-puzzle-42`, and
  `tm-puzzle-43`; it retains sixteen other IDs, including the accepted lower triangle,
  pyramid, and suspended-roof silhouettes at old positions 36, 38, and 47.
- Exactly eight unchanged Easy levels act as technique keys. Every Hard level has one
  visible Easy prerequisite, while one Easy may unlock several Hard levels only when
  replay evidence proves the same decision. The threshold is derived, never copied:
  strict optimum plus five locked tetrominoes.
- One operation means one real `piece-locked` tetromino. Movement, either rotation
  direction, soft-drop steps, hard-drop input, settlement ticks, and undone placements
  are not extra operations. Player copy uses `落子数 / Pieces placed` instead of the
  ambiguous `步 / Moves`.
- Strict proof covers both clockwise and counter-clockwise SRS, horizontal movement,
  soft drop, and hard drop. State deduplication includes anchor-supported placement
  identity. Beam search, a timeout, or a best-known route is never an optimum proof;
  anchored proof initially disables the unproven target-deficit prune.
- Stage F2 accepts that proof domain after complete ordinary, one-anchor, and two-anchor
  shorter-depth searches. A direction-specific regression must compare the full C/Q
  landing domain with a Q-removed domain; the retained representative route alone is
  not proof that counter-clockwise SRS is necessary.
- Campaign revision 3 migrates through an explicit 50-ID table into a new v6 storage
  key. Only definition-preserved behavior carries completion and best placement count;
  rebuilt and retired IDs cannot award a new clear. The old v5 key remains untouched
  for rollback.
- The first v3 pass keeps the unified 10 × 20 well. Definition capability may expand to
  3–10 bottom target rows, 5–20 legal setup placements, and at most four mechanically
  relevant anchors inside the visible bottom twelve rows. Real variable board
  dimensions remain a separate unopened contract.
- Stage F3 separates structural legality from gameplay evidence. The definition
  validator checks bounds, legal zero-clear setup replay, contiguous target ownership,
  anchor uniqueness, anchor/target separation, and absence of any row completed by the
  combined ordinary cells and anchors. Mechanical relevance is instead a schema-8
  authoring obligation: every anchor needs an independent successful public replay
  compared with a definition removing only that anchor, proving a changed real landing
  or direct support effect. A test-only ten-row prototype must obtain a complete strict
  certificate before any published Hard definition adopts that shape.
- Capability work shares a source module with the canonical library, so structural
  tests alone are insufficient preservation evidence. Every validator checkpoint also
  reruns the F1 canonical serializer against the 38 literal revision-2 behavior hashes;
  expected values are never regenerated from the edited definitions.
- Independent read-only review accepts the bounded F3 contract range
  `628f66d..dc035a3` with P0–P3 all zero. F3A may therefore open only the structural
  validator and its literal preservation test; content, migration, progression, and UI
  remain closed until their later checkpoints.
- F3A source `a1e37f1` admits the frozen structural bounds without changing any live
  definition. Independent read-only QA accepts `da264f4..b30ee1f` with P0–P3 all zero
  after reproducing typecheck, 16/16 focused tests, and all 38 literal hashes. F3B may
  now prove injected four-anchor mechanics; published content remains closed.
- F3B test checkpoint `308233c` proves exact injected-board ownership, two-clear
  target/support remapping, the bottom-twelve preview projection, and four independent
  remove-only anchor witnesses without changing production Core or published content.
  Independent read-only QA accepts `3aa6766..6c3286c` with P0–P3 all zero after
  reproducing typecheck and all 36 focused tests. F3C may now open only its non-published
  ten-row fixture and exact certificate test.
- F3C discovery rejects reuse of the F3A twenty-drop fixture: its target-column deficit
  is separated into non-tetromino-divisible regions, and the sole profile-compatible
  one-placement variant has no solution in the complete `I/J/L/O/T` order domain.
  The contract-authorized `tools/search-puzzle-v3-prototype.mjs` checkpoint is therefore
  open to recover a seeded legal setup for one fixed, reversibly constructed ten-row
  mask. Tool output remains authoring input only; Core replay and exact proof still own
  admission.
- Standalone tool `8e86207` implements that fixed-mask search without opening
  product data. Its explicit seed, node, RSS, and output guards, seven-bag prefix trie,
  and source-piece adjacency state reproduce byte-identical small-smoke output
  (`1869CAD02860106A349064BD3D0B7265E8F40FED7C1303B39DBDFB6082B2097A`). Independent
  QA accepts its five-path candidate range with P0–P3 all zero. One bounded substantive
  batch may now run; a successful tool result would still be only authoring input for
  the Core-owned replay/route/certificate gate.
- The accepted first batch over seeds `1..20000` reached its 10,000,000-landing limit
  without a candidate (`289,828` accepted placements; `289,654` memoized failures;
  267,472 trie nodes). Because the depth-first trie order does not give every seed equal
  work before a global budget stop, this is containment evidence, not a negative result.
  Any continuation must first specify deterministic non-overlapping shards or a compact
  resumable frontier for the same range; it may not silently skip to new seeds.
- F3C keeps forward replay rather than replacing it with exact-cover, MITM, or reverse
  peeling: the accepted implementation already matches Core, while the three-bag type
  space is about `5040^3` and a JS middle-state table would add unmeasured 900 MiB risk.
  The revision partitions the frozen seed range by contiguous offset floor boundaries.
  Each shard owns an independent deterministic DFS and an absolute completed-probe
  cursor; continuation replays the prefix to reconstruct memo state, then spends an
  equal incremental landing budget. This trades repeated CPU for small, auditable
  output and no serialized DFS stack.
- Shard output schema 2 binds a stable domain hash over the mask, shapes/types, seed
  domain, sequence length, shard count, and traversal order. It records selected seed
  bounds plus replay/new cursor coverage. Only natural shard exhaustion is `not-found`;
  budget or RSS stops remain incomplete. Equal-budget rounds visit shard indices in
  ascending order before any shard receives its next increment.
- The domain identity additionally materializes the actual queue mapping. Ascending
  seeds contribute exact UTF-8 lines `<decimal-seed>:<20-piece-type-string>\n` to an
  uppercase SHA-256 `queueSequenceDigest`; the ordered domain payload names the
  xorshift32/Fisher–Yates generator and setup-rule versions and is hashed as UTF-8
  `JSON.stringify(payload) + "\n"`. Any queue mapping change must bump its version and
  necessarily changes the materialized digest.
- Cursor proof is behavioral, not numeric. Each executed probe contributes its complete
  pre-probe semantic state plus type/rotation/x to an ordered SHA-256 `probeHash`; every
  fully exhausted memo key contributes, after ordinal sorting, to `memoHash`. A one-shot
  run to absolute cursor `A+B` and a resumed run replaying `A` then doing `B` new probes
  must match both hashes, status/setup, and next cursor. The replay-to-new transition is
  inline in one DFS; it never stops/unwinds at `A` or imports serialized memo.
- Independent repair QA accepts `a1bcf15..1ccc04a` with P0–P3 all zero. The accepted
  design opens only the standalone tool implementation; no authoring candidate, product
  definition, or proof fixture inherits acceptance from the scheduling contract.
- Standalone candidate `1a9c9da` implements schema 2 without changing the accepted
  fixed-mask/Core-equivalent landing rules. Its small-domain union, exact pre-probe
  budget, one-shot/resumed probe+memo identity, separate byte determinism, fail-closed
  inputs, and RSS cursor preservation pass locally. It remains unaccepted until an
  independent review reproduces those claims.
- Independent QA accepts `8ff907a..4ad42ba` with P0–P3 all zero after independently
  reconstructing the domain bytes and replay evidence. The shard tool is accepted for
  its frozen first fair round; its outputs remain authoring discovery only.
- The first 32-shard round spends exactly 10,000,000 new probes with no candidate,
  completion, or memory stop. All shards reach the same cursor 312,500, so fairness is
  established but no seed range is excluded. The next round may give every incomplete
  shard the same 312,500-probe increment after deterministic replay; it cannot privilege
  one shard or advance the seed domain.
- The second equal round preserves the same domain and order. Every shard replays
  cursor 312,500, adds exactly 312,500 new probes, and stops budget-bound at cursor
  625,000 with no candidate, natural completion, or memory stop. Its invocation performs
  10,000,000 replay plus 10,000,000 new probes; cumulative new fair coverage is now
  20,000,000. This remains prefix evidence, so the only admissible continuation is the
  same increment for every incomplete shard from cursor 625,000 after a fresh resource
  check; product and final fixture/test paths stay closed until a candidate passes Core
  replay and exact proof.
- The third equal round again keeps every shard synchronized: 20,000,000 replay probes
  plus 10,000,000 new probes place all 32 at cursor 937,500 with no candidate, natural
  completion, or memory stop. Cumulative new fair coverage is 30,000,000. This is still
  prefix evidence, so a fourth round may only apply the same 312,500-probe increment to
  every incomplete shard from cursor 937,500 after the resource gate; no product path
  opens.
- The fourth equal round reaches cursor 1,250,000 on every shard with no candidate,
  completion, or memory stop. It adds the same 10,000,000 new probes but now requires
  30,000,000 replay probes, making the deterministic replay cost explicit while keeping
  memory bounded. Cumulative new fair coverage is 40,000,000. Until a separately frozen
  algorithm revision is reviewed, only the same fifth-round increment may continue;
  no product path opens.
- The fifth equal round reaches cursor 1,562,500 on every shard with no candidate,
  completion, or memory stop. Its 40,000,000 replay probes purchase 10,000,000 new
  probes; cumulative new coverage is 50,000,000. A sixth round would require 50,000,000
  replay probes before the same increment, so the forward path now pauses for the
  previously reserved reverse-peeling design review. The review must keep seeds
  `1..20000`, the exact queue generator, hard-drop geometry, no-clear/hidden/touch
  rules, deterministic ordering, explicit bounds, and Core replay as the admission
  gate. It may not edit the accepted tool or open product paths before a separately
  reviewed contract exists.
- Independent design review now accepts freezing that contract with P0–P3 all zero.
  Seeded reverse search is complete for this bounded setup language only when each
  peeled piece, replayed from Core spawn onto the remaining board, hard-drops to the
  exact removed cells; the reversed trie supplies the corresponding type from piece 20
  back to piece 1. Same-type ownership is preserved by seven forbidden masks equal to
  the fixed-mask-clipped orthogonal neighborhood of already peeled cells of each type.
- Reverse v1 must be resumable without prefix replay. Its cursor binds algorithm/mask/
  queue/trie/shard/order identity and serializes the full DFS stack, placement path,
  failed memo, and a block-based resumable probe digest. Memo keys include depth, trie
  node, remaining occupancy, and all seven forbidden masks. No interrupted frame enters
  the failed memo; only real stack exhaustion yields complete-not-found. This contract
  remains a docs candidate until an exact-range QA accepts it.
- Exact-range QA rejects `155b82a` with one P1 and one P2: the Merkle/token/cursor bytes
  and the boundary priority between descriptor filtering, probe counting, unwind,
  budget, RSS, candidate, and completion were not frozen tightly enough. The repair
  defines fixed integer/mask encodings, hash domain labels, trie/catalog records,
  canonical JSON, a six-outcome probe token, and a deterministic advance state machine.
  All other contract dimensions pass; implementation remains closed until repair QA.
- Repair QA rejects `9737663` with three P1s and one stale-status P3. The second repair
  makes the full queue global but the reverse trie shard-local, pins every domain integer
  and version literal, enumerates every nested output/cursor/result field, and defines a
  total status/null matrix including trie-build RSS. Probe accounting and STOP priority
  already pass. Tool implementation remains closed until this schema repair is accepted.
- Closure QA accepts `89ae4ad..09e90c5` with P0–P3 and GAP all zero. This opens only
  the existing authoring tool plus its new standalone reverse-contract test; it does not
  accept a generated setup, final F3C fixture, published level, Core change, or UI work.
- Candidate `1f85a0a..da2c67d` implements that contract in three budgeted checkpoints.
  Its standalone suite covers forward byte preservation, reverse identity/hash bytes,
  lossless no-replay cursor state, fail-closed tamper checks, STOP/null priorities, small
  reverse candidates, and actual Core replay. The offline tool changes no page/canvas,
  so browser evidence from the web-game loop does not apply to this candidate.
- Formal QA rejects that range with `P1 2`, and adversarial QA rejects it with
  `P1 1 / P2 2`. The four distinct blockers are cumulative probe-ceiling overflow after
  resume, an unbound partial-token candidate index/descriptor, resume/output NTFS
  hard-link aliasing, and a tautological forward/reverse set test that never executes
  reverse traversal. A bounded repair may reopen only the same tool and standalone test;
  production search, the final fixture/Core test, published content, migration, and UI
  remain closed until independent repair QA accepts the complete implementation range.
- Candidate `77bc7fc` implements that bounded repair. Historical partial tokens rebuild
  their own frame before index/descriptor comparison; cumulative budget admission uses
  subtraction against the absolute ceiling; existing resume/output files compare native
  device/inode identity; and the replacement differential test compares an independent
  small-board forward enumerator with real reverse runs for mixed and both same-type
  orders. Direct tamper, hard-link, exact-ceiling, no-output, full-gate, scope, and cleanup
  checks pass locally. No search execution or browser evidence is part of this candidate.
- Independent QA rejects the differential proof with `P2 1`: each run returns only the
  first candidate from a catalog pre-restricted to oracle-selected descriptors, and
  hand-swapping that catalog does not prove one canonical reverse traversal's complete
  history set. The next repair is test-only. It must continue one state after each leaf,
  enumerate to `complete-not-found`, and compare its exact canonical-catalog result set
  with an independent forward oracle across same-type, mixed, support, upper-obstruction,
  and spawn-domain scenarios. The three production hardening changes remain candidates,
  not accepted source, until the repaired proof and five deferred live reproductions pass.
- Test checkpoint `1686963` now performs that complete enumeration with one canonical
  catalog/state per target and resumes after every candidate through natural completion.
  Exact sets match an independent physical-drop oracle across both O/O orders and
  contact rejection, opposite mixed queues, piece support, and a floating upper negative.
  Separate domain assertions agree with production floor/upper/spawn blocking without
  encoding hidden row-20 cells into the ten-row reverse mask. Final local gates pass;
  fresh read-only QA still controls production-search admission.
- Formal QA reproduces the whole chain with no finding or GAP, but adversarial QA rejects
  it with `P2 1 / GAP 1`: all exact-set fixtures contain only I/O pieces, so a regression
  that filters the helper's canonical catalog to I/O would evade them. The next repair is
  test-only and must independently bind catalog completeness plus exercise a non-I/O
  exact history set. Production source and reverse-search admission remain closed.
- That non-I/O fixture exposes a production traversal defect rather than only a test hole:
  three separated vertical T placements have six forward permutations, while one real
  reverse state emits three and then completes. Exhausted frames are currently memoized
  as failed even after their subtree emitted a candidate, which prunes the complementary
  orders. The authoring tool and standalone test may reopen together. The fix must affect
  only in-memory enumeration after a candidate; pre-candidate memoization, all serialized
  cursor fields/hashes, candidate `continuation: null`, probe bytes, and first-candidate
  production behavior remain frozen.
- Candidate `77fe380` implements that boundary with an internal state-level candidate
  marker. Normal DFS memoization is byte-identical until the first result; bounded
  in-memory enumeration then stops adding false failed states. Candidate-bearing states
  cannot serialize a cursor or a later non-candidate output, and resumable partial tokens
  reject candidate outcome 5. The independent seven-type catalog oracle plus a three-T
  fixture proves three descriptors and all six history orders. Final local gates pass;
  fresh independent QA still controls search admission.
- Formal and adversarial QA both accept with P0–P3/GAP all zero. The latter also obtains
  120/120 histories for five separated I pieces and catches type-filtered, fixture-filtered,
  and post-assertion-filtered catalogs. This freezes the repair and opens only the first
  fair reverse round: 32 serial 625-seed shards, 1,000,000 new probes and 900 MiB RSS per
  shard, repository-external outputs, one increment for every incomplete shard before any
  second increment. Content, Core fixture, migration, UI, and later search rounds stay
  closed.
- The first reverse round completes all 32 first increments with 32,000,000 total probes
  and no candidate; all outputs are resumable `paused-budget`, not negative certificates.
  Independent output QA reproduces the contiguous 1..20000 domain, schema/hashes, 342,213
  failed states, 338,728 trie nodes, 81,077,752 bytes, and ordered manifest
  `2FEE9131...873F25` with no finding or GAP. Those files are the unique continuation
  inputs, so they must remain intact until distinct successor outputs have passed review;
  cleanup-before-resume is invalid and would force a 32,000,000-probe replay.
- The bounded performance review may change only internal candidate lookup while keeping
  descriptor order and every formal token/hash/cursor byte invariant. Candidate lists
  depend solely on the trie node's seven-type availability mask, so at most 128 ordered
  lists may be cached instead of filtering all 662 descriptors at least twice per probe.
  A fresh source candidate, equivalence tests, full gates, and independent QA are required
  before any second increment. Resume input and output remain distinct external paths;
  old files are deleted only after all new files are independently accepted.
- Candidate `8317373` proves byte equivalence and a credible 6.70× sample speedup, but its
  first independent QA is `P3 1 / GAP 2`: replacing a context's catalog can leave stale
  candidates, the mask oracle is not independent, and array identity alone does not prove
  one filter per cached mask. The repair must bind each context cache to catalog identity,
  enumerate all 128 masks from raw child arrays, and use a counting catalog across same-
  mask and cross-context calls. Production search remains closed until fresh all-zero QA.
- Repair `0b744b6` closes all three findings: catalog replacement resets the context cache,
  an independent raw-child oracle covers all 128 masks, and a Proxy proves one filter per
  context/mask. Real resume bytes remain fixed and the 100,000-probe sample is 6.41× faster
  than baseline. Final gates and fresh QA pass with P0–P3/GAP all zero. Only the second
  equal increment now opens, with old inputs read-only and distinct new outputs retained
  together until successor QA authorizes rotation.
- The second equal increment reaches 2,000,000 probes per shard with no candidate or other
  terminal status. Independent output QA accepts all canonical bytes, formal restores,
  hashes, lineage, and distinct files with P0–P3/GAP all zero. Round two supersedes round
  one as the sole required continuation. A third increment is not automatic: review
  depth/progress, memo reuse, storage growth, and the fixed-mask feasibility boundary
  before allocating more probes or changing semantics.
- That review halts `seeded-reverse-v1`: roots remain in the first I-type descriptor band,
  memo/storage growth is near-linear, and three nominal depth-19 states leave disconnected
  four-cell residues. A third equal round is not authorized. This does not prove the mask
  impossible: deterministic diagnostics find both an unconstrained 20-piece exact cover
  and a `[3,3,3,3,2,3,3]` seven-bag-count cover with no same-type contact. The first such
  constrained tiling has no compatible seed/hard-drop order in `1..20000`.
- The replacement authoring direction is tiling-first, then order: enumerate canonical
  exact-cover certificates under bag-count/contact rules; for each certificate, search
  only its finite hard-drop orders through the unchanged reversed seed trie; accept only a
  candidate that current Core replays to the exact mask with zero setup clears. This is a
  new algorithm/output identity and may not restore or rewrite reverse-v1 continuation.
- `tiling-first-v1` searches all seven seed-derived count profiles, ordered by the type
  whose count is two. Its cover state is uncovered mask, remaining counts, and seven
  forbidden masks. It picks the live-descriptor-minimum uncovered cell (lowest bit tie),
  branches in catalog order, and uses no uncontracted heuristic pruning.
- Each complete tiling is identified by 20 sorted catalog indices. Its order search uses
  only `(remainingSet, trieNodeId)` memo state, reconstructs the board from the remaining
  set, tries local pieces in catalog order, and writes failed memo only after full unwind.
  Each tiling owns an isolated memo. The first valid trie leaf uses its minimum seed and
  reverses the peel order into forward placements.
- The canonical first-tiling oracle follows global profile order and is therefore profile 0,
  not the earlier profile-4 feasibility certificate. It takes 1,542 cover probes and its
  exhaustive no-seed order check takes 443 states / 5,982 piece probes. The profile-4
  704-state result remains noncanonical diagnostic provenance.
- Budget counts only admitted cover branches and order piece attempts. Natural unwind and
  candidate resolution precede budget, budget precedes RSS, and no STOP state memoizes.
  Domain/profile/trace/tiling/memo/result hashes plus canonical LF output make repeated
  runs auditable. V1 is single-run and nonresumable by design.
- The accepted v1 production output exhausts all seven profiles and 373 strong tilings for
  seeds `1..20000` with no candidate. Its `complete-not-found` result closes that domain;
  neither a larger v1 work budget nor a repeated v1 run can add evidence.
- `tiling-first-sharded-v2` changes only seed membership. The target mask, public five-lock
  `I → O → T → J → L` route, 20-drop setup length, zero setup clears, visible hard-drop
  physics, and no-same-type orthogonal-contact rule remain unchanged. The contact rule is
  mandatory because current `replayPuzzleSetup` rejects merged same-type owners.
- V2 owns the contiguous new seed series `20001..200000`, partitioned into exactly nine
  20,000-seed shards. Shard `i` (`0..8`) is
  `[20001 + i*20000, 20001 + (i+1)*20000)`. The formula admits no user-selected range,
  gap, overlap, wrap, reordering, or tenth shard.
- Each shard reuses the accepted cover/order implementation but has a new schema and hash
  identity. Static series identity, actual per-profile seed membership, queue bytes, trie,
  domain, traversal, memo, and result are bound inside the shard result. The shard file does
  not self-bind its own SHA-256; independent QA computes that after publication and the
  series manifest binds it.
  Profile-shape hash alone is insufficient; a membership hash binds every concrete seed.
- Only natural `complete-not-found` permits the next shard. Budget, RSS, exception,
  malformed output, or incomplete QA stops the series. A candidate stops the series and
  remains authoring-only until current Core setup replay, the fixed route, lock/state
  hashes, and the no-beam exact certificate pass.
- If all nine shards complete without a candidate, `1..200000` is closed and the next
  design review changes the mask/route rather than silently extending seeds or weakening
  setup legality. A canonical `T37-TSERIES-v2` prefix/full manifest binds ordered shard
  index, file SHA-256, result hash, and terminal status.
- V2 uses v1 canonical JSON (UTF-8 byte-sorted object keys, safe integers only) and
  `canonicalHash(label,value) = SHA-256(UTF8(label + NUL + canonicalJson(value)))` in
  uppercase hex. Series identity uses `T37-TSERIES-ID-v2`; concrete profile membership
  uses `T37-TPROFILE-MEMBERSHIP-v2`; domain, result, and manifest use the already named
  `T37-TDOMAIN-v2`, `T37-TRESULT-v2`, and `T37-TSERIES-v2` labels.
- The immutable `coverReference` records the accepted full-domain cover totals. Runtime
  `coverage` is a separate prefix: a candidate stops the interleaved cover callback and
  therefore never claims full cover. Only natural noncandidate completion must equal the
  reference totals and full strong-tiling hash.
- Trust is split across process boundaries. Shard publication requires the module-private
  production result registry and an unexported capability. Manifest input records bind the
  independently QA-accepted expected file and result hashes, then re-read current bytes.
  Candidate records additionally replay their seed queue, 20 physical hard drops, mask,
  no-touch ownership, and board rows before manifest acceptance.
- Pure formatter/validator seams may accept synthetic test data to cover candidate schemas
  and manifest termination, but they never receive the production publication capability
  and cannot write an accepted shard or manifest. Independent QA remains a workflow gate,
  not a claim inferred from an unkeyed hash.
- The accepted series stops at shard 4 with authoring seed `106933`. That seed belongs only
  to the 20-drop setup. The non-published Core prototype uses the smallest positive gameplay
  seed whose first bag begins `I,O,T,J,L`: `4091` (`I,O,T,J,L,S,Z`). After `start`, Core
  exposes active `I`, the five-item Next queue `O,T,J,L,S`, and the remaining bag `[Z]`;
  the public queue is deliberately not a six-item copy of the whole residual bag. The
  fixed route locks
  `I:3,30|4,30|5,30|6,30`, `O:0,31|1,31|0,32|1,32`,
  `T:4,33|5,33|6,33|5,34`, `J:0,35|1,35|2,35|2,36`, and
  `L:6,37|7,37|7,38|7,39`, releasing `1/2/2/2/3` target rows.
- Final F3C publication remains a two-path non-product proof:
  `docs/workstreams/tetris-t37-puzzle/puzzle-v3-ten-row-prototype.json` and
  `src/game/core/puzzleV3PrototypeExact.test.ts`. The canonical JSON has exact top keys
  `artifactVersion,certificate,claim,definition,provenance,route,schemaVersion`.
  Scalar literals are `artifactVersion="t37-puzzle-v3-ten-row-prototype-v1"`,
  `schemaVersion=1`, and
  `claim="T37 F3C non-published ten-row prototype; current-Core replay and no-beam exact certificate are mandatory."`.
  Definition exact keys are `anchorCells,baseId,boardRows,gameplaySeed,hiddenCells,setup,`
  `targetRows`; setup exact keys are `placements,seed`. `baseId` is the literal
  `t3r-shaft-01`, used only as an injected non-published validation host because
  `validatePuzzleDefinition(..., false)` still requires a registered ID. The canonical
  product definition must remain byte-identical. Provenance exact keys are
  `algorithmVersion,candidateIdentitySha256,manifestFileSha256,manifestHash,`
  `manifestInputFileSha256,placementSha256,profileIndex,rawFileSha256,rawResultHash,`
  `seriesVersion,shardIndex,targetMask,tilingOrdinal,typedBoardSha256`.
  Route exact keys are `commandStream,cumulativeClears,finalStateHash,initialStateHash,`
  `lockSignatures,lowerBounds,metrics,remainingTargetCounts,rowReleaseCounts`; metrics exact
  keys are `commandCount,locks,moveCount,rotationCount`. Certificate exact keys are
  `deficitBoundPrunes,exhaustedFrontierWidths,exploredStateCount,initialStateHash,`
  `optimalLocks,transitionCount`.
- Frozen route literals are command stream
  `SHTTTTTTTTTTTTLLLLHTTTTTTTTTTTTCCRHTTTTTTTTTTTTCCLLLHTTTTTTTTTTTTQRRRHTTTTTTTTTTTT`,
  metrics `82 commands / 5 locks / 5 rotations / 11 moves`, cumulative clears
  `[1,3,5,7,10]`, remaining targets `[74,58,42,26,0]`, and hashes
  `bec0ea65 → 8e34e0c8`. The expected exact certificate is five locks, exhausted frontier
  `[1]`, one explored state, zero landing transitions, and one deficit-bound prune.
- The fixture stores literals only. Its direct opt-in test must rebuild setup, route, state
  hashes, and `certifyOptimalPuzzleRouteForDefinition` from current Core without reading Temp,
  generating expected values, using a beam as proof, or applying a time/state cap.
  Independent pre-implementation replay accepts every frozen literal with P0–P3/GAP zero;
  canonical `t3r-shaft-01` remains byte-identical with SHA-256
  `7678C0321BC76CEED6971BD644AB6BBC21134540706F71BBE7FA1BAE91AC1FA1`.
- The final two-path proof is accepted at `b2c3bc5`. Independent candidate QA reports
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`; the normal direct test passes three tests with the
  exact certificate skipped, and the opt-in run passes all four. Final typecheck, the full
  `433 passed / 11 skipped` suite, and the 767-module production build pass. This closes F3C
  authoring proof only; publishing or altering product Puzzle definitions requires the next
  curriculum slice and its own bounded contract.
- Post-F3C inventory confirms the live campaign remains 50 levels and exposes one schema-8
  prerequisite: exact certificates need per-exhausted-depth transition and bound-prune
  counts, while current Core retains only their aggregates. F3D adds immutable records with
  keys `lockedPieces,frontierStates,transitions,boundPrunes` without changing the search
  domain or any result. Legacy widths/totals are derived from these records. Product content
  remains closed until this telemetry passes existing mastery and F3C exact proofs.
- F3D is accepted at `7f31802` with independent P0–P3/GAP all zero and unchanged proof
  results. F4A next authors one non-published `t3r-shaft-01` draft: a readable three-row,
  exactly-six-drop board, exact four-or-five-lock optimum, two-stage `[1,2]` row release,
  and one divergent replay. Exact/topology/near fingerprint conflicts with all live levels
  are rejected; changing only the gameplay seed is not a rebuild. It remains outside the
  live library until the complete 46-level corpus and migration are ready for an atomic
  product switch.
- A post-acceptance probe corrects the F4A fingerprint gate before source creation. The live
  50 definitions already yield ten historical near-candidate pairs, so a globally empty
  combined audit is impossible. The repaired gate compares the draft against every live
  definition and rejects any exact, normalized-topology, or near-topology match. Fresh
  independent HEAD verification accepts this rule with P0–P3/GAP all zero and confirms the
  comparison is ID-independent. Discovery is open again. A beam result remains discovery
  only; acceptance still requires literal replay, exhaustive proof, an early-divergent
  alternative, and the structural/teaching review.
- F4A selects a `[2,2,2]` three-row board whose exact four-lock route releases rows in two
  readable stages: one row on lock 2, then two rows on lock 4, with the puzzle still holding
  sixteen original targets between them. A second four-lock route diverges immediately but
  preserves the same lesson. Current-Core strict proof exhausts every shorter depth, and
  pairwise structure review finds no exact, normalized, or near match against the live 50.
  This is a non-published authoring candidate only.
- F4A source `cfbcab4` is accepted with independent P0–P3/GAP all zero, complete replay and
  hash reconstruction, typecheck, `437 passed / 12 skipped`, and a 767-module build. The
  candidate remains non-published. Intro-02 begins only after a new contract freezes its
  distinct well-preservation lesson and rejects structural/route duplication with Intro-01.
- Intro-02 teaches preservation rather than immediate completion. Its three target rows share
  one unique empty column; every pre-final lock must avoid clearing or filling those three
  well targets, and the final vertical I must occupy the well and release all three rows.
  A second early-divergent route must exhibit the same invariant. This makes the lesson
  mechanically testable instead of inferring “well play” from board appearance.
- The well is tested as empty Core board cells at world rows 37–39, not as original target
  cells. F4B may update the accepted Intro-01 test only to tolerate later draft-array appends;
  its index-0 identity and bytes remain pinned. Certificate multiplicity continues to mean
  distinct completing routes, while strict optimality belongs to the primary route.
- F4B selects a `[4,1,1]` board with one centre-right well at x=6. Two exact four-lock routes
  branch immediately, fill only the three non-well gaps during their first three locks, then
  use the same vertical I to clear all three rows. Pairwise review rejects every live and
  Intro-01 structural or near match, so the lesson is distinct and mechanically explicit.
- F4B source `c571f54` is accepted with a 621-byte serialized draft definition and a
  canonical 1,421-byte schema-8 certificate, independent
  P0–P3/GAP all zero, full setup/route/hash/proof reconstruction, typecheck,
  `441 passed / 13 skipped`, and a 767-module build. The live 50-level library remains
  unchanged. Intro-03 may begin only as a docs-first contract that converts “four-row
  support before bridge” into literal board coordinates and route events; a visual label or
  target-row count alone is not evidence that the player actually builds support and uses it.
- F4C resolves the legacy-row conflict explicitly: live `t3r-shaft-03` remains a pinned
  three-row product definition, while its isolated v3 rebuild uses four target rows through
  noncanonical validation. The first route lock creates support on cells empty in setup; the
  second owns a horizontal bridge whose complete one-cell downward displacement is blocked
  only by that first lock. An interior horizontal-run source cell maps to a shifted blocker
  one row below, and source cells on both sides map to empty shifted destinations. Both routes
  must prove that coordinate mapping. In each route the first two locks clear zero, and at
  least two later positive events clear all four rows while strictly reducing original
  targets; the two routes need not share the same exact release array.
- Final contract HEAD `3e9811a` passes two independent reviews with P0–P3/GAP all zero.
  F4C now permits only repository-external heuristic discovery. It does not authorize a
  draft append, certificate file, or test until a complete candidate survives current-Core
  replay, pairwise admission, route-invariant checks, and strict shorter-depth proof.
- F4C source `95f3316` is accepted outside product after focused, exact, typecheck, full-suite,
  build, and three independent all-zero reviews. The live 50 remain unchanged.
- F4D makes “local clear that retains the only opening” causal and coordinate-verifiable.
  A four-row draft begins with one unique top-to-target corridor and exactly 28 targets from
  seven legal zero-clear setup drops. Lock 1 fills the exact contiguous two-cell bottom-row
  gap including that corridor, clears only the bottom row, leaves a non-corridor survivor,
  and restores the same sole corridor after Core row mapping. A zero-clear Z staging lock
  preserves it; the shared J then uses that corridor to clear one or two rows and migrate
  the only opening to the side, where the final T clears the remaining two or one. Both
  stored routes first diverge at lock 2 and must prove this full sequence, not
  infer it from a name, screenshot, hole count, or final solvability. The live three-row
  definition and all prior draft bytes remain pinned until the atomic campaign switch.
- Independent review accepts exact R2 docs range `16570db..a09b64f` with
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. Only repository-external candidate discovery is
  open; the three-path draft/certificate/test source boundary remains closed until every
  setup, route, admission, hash, and exact-proof literal is independently frozen.
- R3 freezes the qualifying setup-49/gameplay-83 candidate rather than forcing the rejected
  terminal-I shape. Its exact gap vector is `[5,2,3,2]`; releases are `[1,0,2,1]` and
  `[1,0,1,2]`, both routes are strictly optimal in four locks, and seven optimal geometries
  exist in the complete four-lock landing domain. Contract QA precedes the bounded three-path
  implementation, while live product data stays unchanged.
- Intro-04 source `d3aafc0` is accepted outside product after focused, exact, typecheck,
  clean full-suite, build, and two independent P0–P3/GAP-zero reviews. Intro-05 remains
  docs-first; its source boundary must include or precede the minimum append-compatible repair
  to Intro-04's fixed four-draft assertion.
- F4E makes “Current/Next-1/Next-2 planning” causal. Both routes must place the first three
  deterministic draws without a clear: every occupied one-row-down blocker for lock 2 belongs
  to lock 1, with at least one blocker, and the same complete-set rule binds lock 3 to lock 2.
  The original pose must be unable to descend; removing the immediately previous lock must
  make every shifted cell empty and let that exact pose descend. Queue labels
  or three correctly ordered piece types alone are insufficient. Later positive releases
  sum to the four target rows and finish in stages. The non-published append remains closed
  until contract QA and a complete candidate pass.
- Formal and adversarial F4E contract reviews report `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
  Repository-external candidate discovery is open; all four source paths remain closed.

## 2026-08-07 T36 — Kinetic harmonic audio recomposition

**Status: CANDIDATE / LISTENING REQUIRED.** T35 was technically valid but failed human listening. Its
resonator-and-filtered-air palette still behaved like a collection of designed sound
objects instead of one playable instrument. T36 therefore replaces the audible model,
not merely its frequencies, envelopes, or gain values. Stable routing, ownership,
volume, safety, and teardown remain infrastructure only.

The new world rule is **motion excites a body; the body opens, then resolves into
space**. Every cue has three perceptual stages even when it lasts only a few
milliseconds: kinetic onset, material response, spatial release. This gives all sounds
one grammar without making them identical.

### Procedural instrument contract

- Production cues are short deterministic AudioBuffers generated from reusable
  instruments rather than exposed note stacks. The permitted vocabulary is **felt**
  (soft tactile excitation), **impact** (rounded low body), **ribbon** (filtered motion
  through air), **glass** (sparse inharmonic partials), **shimmer** (reward bloom), and
  **pulse** (restrained countdown/UI cadence).
- A procedural layer owns one AudioBufferSource and one gain path. Internally generated
  partials, noise, pitch motion, and envelope stages are mixed into that buffer before
  playback. The sixteen-voice ceiling therefore remains meaningful under rapid input.
- Determinism includes sample values, duration, cue identity, and seeded texture.
  Generated buffers must start and end at or near zero, contain finite samples, avoid
  hard discontinuities, and be reusable without persistent services or external files.
- Default continuous ambience is removed. The Ambient bus remains part of the stable
  mixer contract for future ownership, but T36 starts no background bed, drone, loop,
  or music.

### Event language

- Move is a rounded felt impulse that remains readable without producing a rapid-fire
  click train. Rotate adds a short curved ribbon. Soft drop is mostly motion; lock is a
  compact settle; hard drop adds controlled mass and a brief spatial release without a
  bass explosion.
- Line clears share a branded upward-opening contour, not a scale or chord. One line is
  narrow and dry; two adds width; three adds a broader spatial fold; four adds the only
  long low body and a soft high resolution. Duration, spectral area, and perceived mass
  increase monotonically.
- Ice is a cold glass-and-air crystallisation. Supergravity is one descending mass
  impulse with no loop and no landing sound. Bomb is a contained pressure release, not
  a gunshot. x2 and x4 are compact energy folds whose repetition count and bandwidth
  communicate escalation without coin or reward-jingle language.
- Survival stone and bedrock use low, damped mass with minimal brittle texture. UI
  feedback is quiet but legible. Countdown owns exactly three related pulses: beats 3
  and 2 establish cadence; beat 1 is longer and resolving. There is no separate
  cover-exit sound.
- The Mutation-status heading carries no decorative glow, halo, spotlight, or luminous
  background. Theme-appropriate text contrast and the active-state lines remain; this
  cleanup does not alter status behavior or layout.

### Hierarchy and listening acceptance

- Perceived feedback obeys `move < rotate < lock < hard drop < 1/2/3 clear < Mutation
  < four-line clear/completion`. Loudness is only one factor; contour, duration,
  bandwidth, low-body energy, and spatial release carry the hierarchy.
- The evidence renderer uses production recipes and mixer topology to create playable
  48 kHz WAV suites. Its manifest records source SHA, peak, RMS, clipped samples,
  cue boundaries, and rapid-repetition density. Measurements reject unsafe candidates
  but cannot approve timbre.
- Final typecheck, full tests, build, browser evidence, and independent read-only QA are
  mandatory. T36 remains **CANDIDATE / LISTENING REQUIRED** until explicit human
  acceptance.
- Candidate `4433aaf` satisfies those automated and independent-QA gates. Six
  source-bound 48 kHz WAV suites remain the authoritative human audition surface;
  neither their measurements nor the clean browser audit assert subjective acceptance.

## 2026-08-07 T35 — Audition-led material gesture audio rebuild

**Status: IN PROGRESS.** Human listening rejected T34 even though its routing,
scheduling, lifecycle, browser, and test evidence passed. T34 proved engineering
correctness but not sound quality: most cues were still recognisable oscillator notes
or note stacks, so the game sounded like a generic notification bank rather than one
coherent physical instrument. T35 supersedes that palette completely; existing buses,
event ownership, safety limits, and cleanup remain only as infrastructure.

The new world rule is **gravity excites material**. A gameplay event is rendered as an
excitation, a short inharmonic response, and a controlled decay. Tonal oscillators may
act as damped resonators, but exposed melodies, triads, chromatic success jingles, and
continuous pitched drones may not carry the design. The audible blend targets soft
ceramic, felted mechanism, pressurised air, and restrained low-frequency mass.

### Sound construction contract

- Preserve the five buses (Gameplay, Reward, Mutation, Ambient, UI), user volume and
  enable controls, deterministic sources, compressor safety path, transient voice
  ceiling, event priority, and exact teardown. Do not add licensed samples, music,
  external runtime services, or a persistent audio process.
- Replace the generic `tone + harmonic + noise puff` vocabulary with reusable physical
  gestures: **modal tap** (brief impulse exciting inharmonic modes), **air sweep**
  (band-limited noise with a moving filter), **damped impact** (low membrane body plus
  short material contact), **pressure release** (reverse air into contained impact),
  and **spatial bloom** (several non-synchronous, fast-decaying resonances).
- High-frequency controls must be tactile but non-pitched. Move is a felt tick, rotate
  is a brushed orbit, soft drop is an air ribbon, lock is a small settle, and hard drop
  adds mass without a bass explosion. Repetition at normal play speed must remain
  comfortable and must not produce clicks or machine-gun transients.
- Clear rewards share one family and grow by width, decay, and spectral opening rather
  than musical chord count. One line is a clean material release; two crosses two
  resonant bands; three adds a wider bloom; four adds the only long low-pressure body
  and a bright but soft tail. Clear size must remain identifiable at moderate volume.
- Mutation activation is a physical state change, never a sustained tone: Ice is a
  cool air crystallisation with sparse snow-grain taps; Supergravity is pressure
  compression and a downward mass impulse; Bomb is contained pressure rupture;
  Multiplier is two or three compact energy folds. Survival cues use stone mass and
  cavity air without alarm-like pitches. UI uses dry, low-energy ticks and swells.
- Remove the two-oscillator theme drone. Theme ambience, if audible at all, is a very
  low deterministic filtered-air bed with no stable pitch and must remain below all
  gameplay cues. Disabling audio or destroying the runtime must silence it exactly.

### Audible acceptance boundary

- Structural unit tests still prove routing, ownership, bounded voices, deterministic
  scheduling, and cleanup, but they cannot accept timbre.
- The candidate must generate short, directly playable WAV references for every cue
  family from the same gesture recipes used by the game, plus a manifest containing
  duration, peak, RMS, and zero-crossing measurements. Screenshots are not audio proof.
- A browser pass must exercise representative gameplay, reward, Mutation, Survival,
  countdown, pause/resume, and teardown flows with one Canvas and zero console errors.
- T35 remains **CANDIDATE / LISTENING REQUIRED** after automated gates and independent
  QA. Only explicit human listening acceptance may mark the palette accepted.

## 2026-08-06 T34 — Responsive gravity instrument audio

**Status: REJECTED BY HUMAN LISTENING; SUPERSEDED BY T35.** Contract `26c7956`, audio
foundation `74bdb96`, priority palette `aadf593`, secondary palette/runtime bridge
`a99a934`, browser evidence `67325a9`, and independent read-only QA all passed, but the
resulting timbre did not pass subjective acceptance. T34 replaced the accumulated per-effect audio
styling with one original world rule: **TetraMorph is a calm, responsive gravity
instrument.** Sound answers every meaningful action, but it never becomes a mineral
striking demo, a hard-sci-fi alarm bank, an arcade explosion reel, or background music.

The mix language is approximately 40% ambient electronic tone, 30% soft acoustic
texture, 20% crystal/glass resonance, and 10% restrained mechanism. Perceived emphasis
is monotonic: move < rotate < lock < clear < Mutation < four-line clear / completion.
Loudness alone may not create that hierarchy; duration, harmonic width, low-frequency
body, spatial tail, and temporary voice ownership carry the larger rewards.

### Synthesis and routing contract

- Keep the existing Web Audio implementation, deterministic sources, volume setting,
  sixteen transient-voice ceiling, and close-on-destroy lifecycle. Do not add licensed
  music, external samples, a sample pack, or a persistent browser/server dependency.
- Replace the single undifferentiated effect path with five explicit buses:
  **Gameplay**, **Reward**, **Mutation**, **Ambient**, and **UI**. Every cue names one
  owner bus, and the master compressor remains the final safety boundary.
- A designed cue may layer two oscillators, a small deterministic filtered-noise
  texture, and a quiet delayed spatial tail. Layers share one semantic cue and must not
  each masquerade as a separate gameplay event.
- High-frequency controls stay concise and rate-limited. Resolution cues may suppress
  same-frame lock/drop transients; a Mutation activation plays once per unique item in
  the existing canonical event order. No active Mutation owns a sustained loop.
- The Ambient bus is a barely audible procedural room tone, not music: Deep Tide is a
  low-passed deep-sea/instrument breath, Mineral Mist is an airy crystalline haze, and
  Sunstone is a warm, slow harmonic bed. It starts only after audio is primed, follows
  the selected visual theme, obeys enable/volume, and stops without leaks.

### Cue grammar

- Move: a roughly 40 ms soft pluck with a trace of air around 220–280 Hz. Rotate: a
  roughly 70 ms upward sweep with a muted click. Soft drop: a roughly 30 ms descending
  air cue. These remain quieter than physical contact.
- Hard drop: restrained 80 Hz body, soft 150 Hz impact, and a quiet upper spatial tail,
  roughly 180 ms total. Ordinary lock is a shorter settle resonance and cannot sound
  heavier than hard drop.
- Clear rewards are distinct compositions rather than one chord transposed upward:
  single is a soft crystal sweep, double adds a stable fifth, triple opens into a short
  ascending pad and bell, and four-line clear becomes the branded 0.8–1.0 second
  “space unfolding” moment with low body, open C/G harmony, and a glass tail. The
  player must identify the clear size by contour even at modest volume.
- Ice blooms with a few soft glass/snow particles and a slow pad, then ends with a
  quiet thaw crack. Supergravity is one deep soft pulse with a 200→80 Hz descent and a
  restrained reverse release; its five-piece gameplay ownership does not create a
  sustained tone. Bomb uses pressure build, soft impact, and space tail rather than a
  gunshot. Multiplier uses harmonic expansion: two notes for x2, three for x4.
- Survival bedrock rise is a one-second low pad and movement texture, stone warning is
  a natural low pulse rather than an alarm, and stone landing has more body than an
  ordinary lock without becoming harsh.
- UI hover remains silent. Confirmation is a very light tick; a modal transition is a
  low soft swell. Entry countdown retains its accepted three-part cadence and is not
  broadened by this phase.

### Acceptance boundary

Direct tests prove bus routing, deterministic layered schedules, hierarchy, same-frame
suppression, theme ambience ownership, enable/volume behavior, the sixteen-voice
transient cap, and complete cleanup. Typecheck, the complete `391 passed / 8 skipped`
suite, and production build pass. The bounded browser audit records enabled 100% audio,
mute/restore, a live 64% volume change, all three theme selections, one Canvas, zero DOM
board cells, and zero console/page errors; lifecycle teardown remains directly proven by
the unit boundary rather than inferred from a screenshot. Existing T27 evidence and
`progress.md` remain untouched and unstaged. Cross-device loudness and timbre preference
remain a human listening boundary, not an automated acceptance claim.

## 2026-08-06 T33 — Supergravity covers five pieces

**Status: ACCEPTED.** Product source `60c3fdd`, rule-copy repair `909f904`, final
browser evidence `b887994`, and independent read-only QA all pass. Mutation
Supergravity changes from elapsed-time ownership to a deterministic five-piece budget.
Clearing a Supergravity carrier sets the number of future covered spawns to five. A
spawn atomically consumes one unit and copies the effect into that active piece's
immutable landing latch.

The remaining budget and the active-piece latch are deliberately different state:

- the budget answers how many *future* pieces will receive Supergravity;
- the latch answers whether the *current* piece uses independent-column projection and
  settlement;
- timer ticks, pause duration, input rate, render frames, and row-wise entry do not
  affect either claim;
- after the fifth spawn consumes the last unit, its latch remains true until that piece
  locks, so preview and settlement cannot diverge at the boundary;
- another Supergravity award refreshes the future budget to five rather than adding
  five, while an already-airborne latched piece remains latched.

The status ledger communicates discrete ownership, not time: it shows the remaining
piece count and has no seconds label or continuously draining time meter. Activation
feedback may remain short-lived presentation, but it must not imply that gameplay
ownership expires by time.

## 2026-08-06 T32 — accepted Puzzle curriculum rebuild

Accepted source `9092402`; browser evidence `75cc2f9`; final independent QA PASS.

### 2026-08-07 certificate-fingerprint maintenance

Anchor-supported Puzzle cells now participate in the canonical Puzzle state hash
because they affect later clear transforms. This deliberately changes the initial
fingerprint even for the three unanchored mastery prerequisites, whose support set is
empty, while leaving their legal search graph unchanged. The frozen certificate may
refresh `initialStateHash` only when an exhaustive re-run reproduces every other proof
field exactly; route, optimum, frontier, exploration, transition, and prune evidence
must remain byte-for-byte equivalent.

Accepted maintenance commits are contract `d31a84b` and source/test `3d69132`. The
three canonical initial fingerprints are now `1c4d5e6a` (`t5r-arc-13`), `04b7f198`
(`t5r-current-12`), and `3be8a7b4` (`t5r-prism-11`). The opt-in exhaustive suite passed
`3/3` with every non-hash proof field unchanged; focused T31/T32 tests passed `212/212`,
and the final typecheck, complete suite (`380 passed / 8 skipped`), and build passed.
Because the delta changes certificate metadata only, accepted browser evidence remains
authoritative and was audited without regeneration.

Puzzle anchors are fixed world obstacles and physical supports. During a line clear,
an already-settled connected piece resting on an anchor retains its complete geometry
and world coordinates; the clear may move unsupported cells, but may not split or pull
the supported piece around its anchor. Target-cell tracking uses this same mapping.

**Status: ACTIVE / BOARD AUTHORING ADMITTED.** T31-R2 is accepted on product/test source
`432fde4` with browser evidence through `f859d68` and an independent P0/P1/P2/P3-zero
verdict for exact range `c291afb..532e636`. The renewed audit proves the live campaign is
still 3/27/20, later Easy access is tier-gated, the three existing exact certificates
will be invalidated by the Intro rebuild, and no gating certificate is directly
reusable. The isolated structural / symmetry / near-topology fingerprint foundation is
green at `da8e2b9`, and the roster/technique contract is committed. Board authoring is
therefore admitted under the exact-proof and duplicate-rejection boundary below.

T32 replaces the current Puzzle curriculum without changing the total
campaign size: **50 levels = 10 Intro + 20 Easy + 20 Hard**. The ten Intro boards are
all rebuilt as authored teaching puzzles; Intro remains immediately available. All
twenty Easy levels are immediately available and never depend on prior completion or
operation-count gates. The twenty Hard levels are mastery-gated: each Hard puzzle names
one certified Easy prerequisite whose route demonstrates the same technique and the
same decisive board-reading problem.

### Curriculum and duplicate policy

- Difficulty is assigned from replay evidence and board decisions, not from the old
  row band or historical position alone. Intro isolates one teachable decision, Easy
  asks the player to apply it without a forced sequence, and Hard combines it with a
  materially tighter or misleading continuation.
- Exact duplicate boards are forbidden. Near-duplicates are compared through a
  symmetry-normalized occupancy/anchor fingerprint plus route-critical decisions;
  renaming, mirroring, changing colors, or moving one non-decisive cell is not a new
  puzzle.
- The near-repeated boards currently occupying campaign positions 36, 38, and 47 are
  replaced, respectively, by an authored **lower-triangle**, **pyramid**, and
  **two-sided suspended-roof with a hollow middle** residue. Their geometry must remain
  legal under the existing deterministic setup contract rather than being painted or
  injected directly into runtime state.
- Strict public-Core replay probes also reject the legacy tails at positions 46, 48,
  49, and 50: none completes within the frozen twenty-two-lock proof ceiling. Those
  positions retain their deterministic setup prefixes but are rebuilt as distinct
  six-row residues with registered successful replay witnesses.
- Names, ordering, categories, lesson copy, and unlock relations are derived only after
  the final boards and replay evidence are frozen. A stable ID may be retained for a
  replaced slot only with an explicit campaign-revision migration; stale best counts
  may not masquerade as records for a different board.
- Stable positions 01-10 remain the rebuilt Intro IDs, 11-30 remain the Easy IDs, and
  31-50 remain the Hard IDs. The changed set is exactly 01-10, 12-14, 36, 38, and 46-50;
  campaign revision 2 preserves records only for unchanged geometry and clears
  completion/best data for those twenty changed IDs. Easy positions 12-14 are the
  rebuilt strict-mastery boards whose exact certificates drive the Hard unlock graph.
- The directly supported anchor-free mastery candidate pool is positions 12-15, 17-21,
  23-25, and 28-30. A final Easy-to-Hard map is not design truth until exact optimum
  certificates and three-part replay signatures are checked; the contract does not
  invent optimum numbers or relationships in advance.
- The authoritative authoring roster, Intro decision matrix, Easy technique families,
  candidate Hard proof map, first exact-certificate set, and revision-2 artifact fields
  are frozen in `docs/phases/t32-puzzle-curriculum-rebuild.md`. A candidate relation is
  not an unlock until exhaustive optimum and replay-signature checks pass.

### T31-R2 regression gate before board authoring

The player review superseded the visual sufficiency of the older T31 evidence
for three bounded claims. Mutation status must be more prominent while remaining a
frameless signal/name/thin-line ledger; Next must be visibly populated in both Classic
and Mutation active play; and a piece that latched Supergravity while airborne must
retain independent-column lock and the same complete projected landing after the global
timer expires. Source `432fde4`, responsive evidence through `f859d68`, recorded final
gates, resource teardown, and independent QA close these claims. No Reshape, new item,
status cards, or broader Mutation redesign was admitted.

Prominence is carried by hierarchy, not another container: concurrent rows use a
stronger heading, larger item signal and name, clearer row spacing, and a still-thin
item-colored lifetime line. Next is a Canvas-rendered instrument whose transparent DOM
anchor is resolved inside the current gameplay arena and clamped to that arena's live
Canvas geometry; a global first-match query is not authoritative. Acceptance records
actual preview pixels in Classic and Mutation at 1440 × 900 and 1125 × 1196, not only a
queue value or renderer visibility flag. The Supergravity latch is bound to the active
piece generation, so row-wise entry, movement, rotation, timer expiry, complete ghost
projection, and independent-column lock all consult the same retained decision until
that piece locks. The next generation begins rigid when no global timer remains.

### Solvability and mastery evidence

- Every new or changed board has at least **two distinct successful routes** replayed
  from the registered initial state through public Core commands only: move, rotate,
  soft drop, and hard drop. Direct state mutation, private landing injection, renderer
  coordinates, and solver-only commands are invalid evidence.
- Both routes must clear every original ordinary cell while preserving anchor rules,
  fixed queue order, collision, line-clear timing, and ordinary lock semantics. A
  route is evidence only after deterministic Core replay reaches the canonical Puzzle
  completion state.
- Any Easy puzzle used as a Hard unlock prerequisite additionally carries an exhaustive
  **strict minimum placed-piece certificate**. Its mastery threshold is exactly
  `optimal placed pieces + 5`; a bounded beam-search result or best route found so far
  cannot set this threshold.
- Mastery prerequisites form a small technique curriculum rather than a one-off gate per
  Hard board. Each prerequisite is a deliberate at-most-seven-piece teaching puzzle and
  may unlock multiple Hard boards that reuse its certified decision pattern.
- An auditable technique signature links each certified Easy puzzle to its dependent
  Hard puzzle(s). The signature includes measurable initial-board preconditions, the
  route's decisive placement/clear event, and the post-decision invariant that makes
  the continuation work. Tests must derive or verify those facts against replayed
  states. A handwritten technique label without matching board and route assertions
  cannot unlock a Hard level.
- Each Hard level has exactly one visible mastery prerequisite and cannot be unlocked
  by generic completion totals. One certified Easy level may unlock several Hard
  levels only when every dependent level proves the same technique signature and
  strengthens the same key decision rather than sharing a broad topic name.

### T32 acceptance boundary

T32 acceptance requires campaign validators for the 10/20/20 split, duplicate and
near-duplicate rejection, all-open Intro/Easy access, mastery-only Hard access, two
Core-replayed routes for every changed board, exhaustive optimality for every mastery
prerequisite, and technique-signature correspondence. Final typecheck, complete suite,
production build, one bounded browser pass across all three pages/categories, migrated
progress behavior, one Canvas, zero browser errors, and independent read-only QA are
required before the coordinator may call the rebuild complete. This queued contract is
not implementation or verification evidence.

## 2026-08-05 T31 — Mutation gravity, ice, and status clarity

**Status: ACCEPTED / CLOSED.** Product/test source `7c4a9a1`, evidence `735effe`,
final gates, and independent read-only QA pass with no P0-P3 findings.

T31 is a bounded correction to Mutation mode. It removes the Reshape carrier from the
live product, makes Supergravity landing guidance obey the same per-piece latch as Core,
and replaces the rejected Supergravity/Ice feedback with shorter, local, readable
effects. Scoring, Bomb, Multiplier, ordinary clears, themes, layout, navigation, Puzzle,
Survival, persistence, and the single-Canvas boundary remain unchanged.

T31 also carries one direct clarification into the already accepted T30 arrival
presentation: a newly spawned tetromino enters **row by row**, not cell by cell. This is
real board-mouth travel, not an opacity/scale reveal. Core keeps its canonical hidden
spawn rows; the lower occupied row appears first in visible board row 1, then higher
rows cross the board mouth on the configured gravity beat while lower rows advance.
Rendering clips at the board mouth and does not shift the whole piece into view. Spawn
coordinates, collision, queue, gravity timing, and deterministic state remain unchanged.

### Four-item live contract

- The live Mutation pool contains exactly Ice, Supergravity, Bomb, and Multiplier.
  Reshape is removed from the type, deterministic pool, activation logic, renderer,
  audio, tokens, theme material map, localization, rules, and active tests. Historical
  documentation may retain the name only as provenance.
- A carrier still activates at most once even when several of its cells clear together.
  Multiple different carriers resolved in one batch retain deterministic priority.
- Supergravity still lasts five seconds for newly active pieces. A piece that was
  airborne while Supergravity was active keeps independent-column landing semantics
  until that piece locks, even if the global timer expires first. Both the ghost guide
  and the final lock use `timer active OR piece latch`; the settled board cells,
  `piece-locked` event, lock pulse, and hard-drop trail all use the same final per-column
  coordinates. The next piece does not inherit an expired effect.

### Activation, clear, and sustained feedback

- Ice activation/clear uses a board-local burst of four small six-arm snowflakes released
  from the consumed carrier cells. It must not recolor the whole board, create scan
  lines, or mask the ordinary playfield.
- Supergravity activation/clear uses five compact gravity-factor particles released from
  the consumed carrier columns. Each has a dense purple kite and a short downward
  chevron tail; it must not read as a symbol, explosion, screen flash, pressure ribbon,
  or full-width bar.
- While an airborne piece is Supergravity-latched, the rejected spike trail is replaced
  by two or three soft, clipped rectangular afterimages behind its moving cells. The
  trail never survives a lock and does not render in reduced motion.
- Supergravity has no sustained oscillator, expiry tone, or special landing sound/VFX.
  Its short activation cue remains distinct; ordinary locking keeps the ordinary lock
  contract. Reduced motion renders one local static activation endpoint and omits
  travelling shards, pressure streaks, and trails.

### Mutation status ledger

- The left rail keeps the established heading, item signal, localized name, and one
  one-pixel remaining-time line. Visible `生效中` / `Active` and seconds are removed;
  remaining time stays in the row's accessible label. Active effects are rows in one visual ledger, not separate
  cards: no row background, outline, radius, inset stripe, or shadow.
- Idle state remains intentionally empty beneath the heading; no placeholder sentence,
  decorative rule, or disabled-state box is shown. Simultaneous effects remain legible
  through their item color, signal, name, and thin time line only, with enough fixed row
  spacing that concurrent effects never overlap.
- Frameless does not mean faint: the heading, signal, and item name use a stronger
  typographic hierarchy, and the one-pixel item-colored meter may use a restrained glow.
  No background card, visible countdown, pill, or separator is added.

### T31-R1 correction

- Row arrival must expose the canonical lower occupied row first at visible board row 1.
  A higher occupied row then crosses the clipped board mouth only after the current
  gravity interval while the lower slice advances. The complete final landing guide is
  available as soon as the lower slice is visible; it does not wait for the higher row.
  Fixed reveal timers, row opacity/scale staging, and whole-piece clamping are rejected.
- Ice activation uses four small carrier-local snowflakes. Supergravity uses five local
  gravity factors that separate and fall from the consumed columns. Neither may use a
  whole-board recolor, hard scan line, central symbol, pressure ribbon, full-width bar,
  or screen flash.
- Next is rendered by Pixi on a dedicated unmasked plane anchored to the transparent DOM
  slot. The active-piece board-mouth mask cannot clip it. It remains visible through
  board-local pause/restart/leave interruptions and is hidden only before play, after a
  terminal state, or during actual route teardown.
- When the global Supergravity timer reaches zero, an already latched airborne piece
  retains the same independent-column ghost and final settlement until lock. Expiry
  removes only the global status; the next piece is the first rigid piece.
- The correction contract and evidence boundary are frozen in
  `docs/phases/t31-r1-status-and-arrival-correction.md`.

### T31 acceptance

Focused Core/presentation tests must prove the four-item pool and latched Supergravity
ghost/lock agreement. Renderer tests must freeze the new Ice and Supergravity activation
geometry, the clipped non-spike trail, reduced-motion endpoint, and absence of Reshape.
Audio tests must prove Supergravity state sync creates no sustained voice and that no
Reshape cue remains. UI/style tests must prove frameless status rows with no visible
active-state copy or seconds. After the final
source edit, run one typecheck, the complete suite, one production build, and one bounded
browser pass covering Ice activation, Supergravity before/after timer expiry, status
layout, row-grouped active-piece arrival, one Canvas, zero DOM board cells, zero console
errors, and teardown.

## 2026-08-04 T30 — in-well piece arrival and route transitions

T30 adds two bounded motion contracts without changing Core simulation, input timing,
randomization, scoring, layouts, themes, audio, or the single-Canvas boundary. A newly
active tetromino must read as entering the playfield instead of appearing fully formed
in one frame, while page changes must have a short spatial handoff instead of a hard
cut. Both effects are presentation-only and must remain safe under reduced motion.

### Active-piece arrival

- Core remains authoritative: the piece still spawns in the same hidden rows with the
  same coordinates and collision state. Rendering continues to project all four cells
  wholly inside the visible well before any arrival effect is applied.
- A new active generation is identified by the run's placed-piece count plus the active
  piece identity. Its occupied rows assemble in a deterministic top-to-bottom stagger
  over no more than 210 ms. Every cell in one row shares the same reveal progress, so a
  row enters as one readable slice before the next row begins. Each cell grows and gains
  opacity at its already-safe in-well position; no cell travels through, clips against,
  or appears outside the board frame.
- The ghost landing guide remains hidden until the materialisation is substantially
  readable, then joins quietly. Movement and rotation interpolation continue from the
  canonical active piece and must not restart the arrival.
- Restart, Puzzle undo, terminal state, unmount, and reduced-motion changes clear the
  renderer-owned arrival state. Reduced motion presents the complete legal endpoint
  immediately, with no stagger or scale travel.

### Page handoff

- Home, Puzzle library, and game URLs remain the navigation authority. Every actual
  route change through push, replace, or browser history uses one shared transition
  boundary; selection changes that do not change the URL do not animate the page.
- Supporting browsers receive a restrained 180 ms old-page fade/settle and 220 ms
  new-page fade/rise. The fallback remounts only the route surface and applies a short
  entry fade, without delaying history or changing focus ownership.
- Reduced motion suppresses translation and collapses the handoff to an effectively
  immediate opacity change. Transitions may not create a second Canvas, preserve a
  hidden gameplay runtime, intercept controls after navigation, or start a persistent
  timer/service.

## 2026-08-14 T37-D2A — settled in-page overlays

D1 remains the sole owner of URL-route transitions. D2A covers only board-fixed in-page
layers: first-entry rules, Settings, leave confirmation, run results, and the board-local
pause/restart curtains. The gameplay board, Next, HUD, Runtime, and sole Canvas remain in
place; this slice changes no Core timing, input result, persistence, route commit, score,
audio, or Endgame content. Endgame-library selection and category swaps are reserved for
a later D2B slice.

- A shared ActionSheet owns an explicit `enter -> steady -> exit -> unmounted` presence
  lifecycle for same-page dismissal: Settings close, leave cancel, result replay, and
  first-entry Back. Opening fades the backdrop over `120 ms` and settles the complete
  panel over `180 ms` from `opacity .94` and at most `translateY(4px)`, using
  `cubic-bezier(.16, 1, .3, 1)`. Scale, blur, spring motion, wipes, and child cascades are
  forbidden.
- Same-page closing commits its product action immediately, then freezes the last complete
  React presentation as a non-interactive shell for `120 ms`: the panel releases toward
  `opacity .96` and at most `translateY(-2px)` while the backdrop fades. Live Runtime,
  record, celebration, form, or callback values may not replace that snapshot. The shell
  is `aria-hidden`, inert, has no dialog role, cannot receive focus/pointer input, and
  captures events before retired child callbacks. It then unmounts.
- Leave-confirm and result-leave replace GameSession immediately and belong exclusively to
  D1: they promise no D2A DOM release, and D1 owns their snapshot and destination focus.
  First-entry confirm is the one App-level exception: its frozen inert shell must release
  outside the named route viewport while D1 commits (`120 ms`, or at most `32 ms` reduced),
  but it never owns the route snapshot, focus, or input and may not delay History,
  Canvas-ready, destination focus, or ready gameplay. App unmount removes it immediately.
- Presence is latest-request-owned across the complete ActionSheet family. Reopening the
  same instance cancels its older release; opening a different accessible sheet terminates
  every older release shell immediately. An old timer may never unmount a newer layer.
  Unmount cancels every timer/frame, and at most one accessible dialog exists at any time.
- The release timer never owns focus restoration. Semantic close removes the sheet's
  document-key listener in the same commit. D1 owns route focus; existing Settings,
  replay, pause, and restart callbacks own board/countdown focus. Only when no explicit
  owner has moved focus may ActionSheet restore its prior target on the next frame. Before
  inert/aria-hidden is committed, the close request synchronously records whether focus
  was inside the exiting subtree and the closing epoch. Restoration requires that epoch
  still own presence, the sample was true, no successor dialog exists, the prior target
  remains connected, and current focus is either still inside the retired subtree or is
  only the document/body vacancy caused by inert. Any real focus outside the subtree wins.
  Finishing the later `120 ms` release may never move focus.
- Settings no longer disables the shared entrance. Its tab content changes in the same
  layer over `150 ms`, with opacity and at most `2px` vertical settling; only one panel is
  accessible and mounted as current product content. Tab motion never implies route
  direction and does not use the View Transition API.
- Pause and restart keep their existing `180 ms` board-local cover entrance. Pause resume
  and restart cancel commit immediately while an inert copy releases over `120 ms`.
  Pause to Settings/leave may release below the new z-100 modal backdrop; pause to restart
  terminates the old curtain before the new curtain enters. Restart confirm never retains
  the old curtain: a new 3-2-1 cover, or Endgame's immediate run endpoint, owns the first
  post-confirm frame. Route/unmount removes every curtain immediately. No second dialog or
  Canvas is created. Results enter/release as one ledger; metrics never cascade.
- Reduced motion uses opacity only, no transform, and completes any presence phase within
  `32 ms`. A runtime full-to-reduced switch shortens the active phase and invalidates its
  old timer. Reduced-to-full never restarts or lengthens an active phase and affects only
  the next presence epoch. Presentation never delays gameplay input, countdown, Runtime
  restart, storage, focus ownership, or route navigation.
- `src/styles/in-page-transitions.css` is the final D2A motion authority and loads after
  result/settings/theme styles. Its full-motion selectors explicitly override Settings'
  older `animation: none !important`; its final reduced selector remains authoritative.
  Tests freeze import order, phase selectors/tokens, focus non-interference, route-owned
  close, mandatory first-entry-confirm shell, frozen result replay, cross-sheet latest
  ownership, pre-inert focus sampling/body-vacancy recovery, pause outcomes, both runtime
  motion-toggle directions, restart-confirm first frame, and unmount cleanup. Browser
  evidence covers first-entry confirm/Back, Settings and tabs, leave confirm/cancel,
  pause-to-Settings, pause resume, restart cancel/confirm, real terminal result replay and
  leave at desktop/mobile/full/reduced motion, with one Canvas, zero DOM cells, zero double
  dialogs, zero overflow, and zero console errors.
- D2A may use two ordinary source checkpoints within the same six authorized paths: D2A1
  establishes ActionSheet presence, final CSS authority/import, and focused integration;
  D2A2 adds the separately tested pause/restart curtain outcomes. Each checkpoint, not
  their combined range, stays within the normal ten-path/500-line source budget.

### D2A Settings mobile safe area

The viewport sheet backdrop is the responsive containing block. On screens at or below
680 px, Settings sizes against that block's `100%` content width rather than recomputing
from `100vw`; otherwise its own viewport subtraction can exceed the already padded grid
area. At 390 x 844 the complete dialog must remain within both horizontal viewport edges
with symmetric backdrop margins, without shrinking copy below the existing readable
floor or altering the 120/180/150/120/32 ms presence contract.

### D2A acceptance disposition

Product source closes at `27d319428701708d892961de4cb5aa1fbbe522b2` after the two
ActionSheet/curtain checkpoints, latest-owner repair, and the bounded Settings safe-area
fix. Its post-source typecheck, complete suite (`532 passed / 15 skipped` in `55 passed /
2 skipped` files), and production build pass. Evidence checkpoint `696d32d` binds fourteen
real Chromium frames and the full/reduced motion audit to that source. The audit has zero
failures or browser errors and preserves one Canvas, zero DOM board cells, at most one
modal owner, legal result provenance, and contained 390 x 844 geometry. Independent
review recomputes all 17 manifest hashes and reports `P0 0 / P1 0 / P2 0 / P3 0 / GAP
0`. Reopen D2A only if its bound source changes.

### T30 acceptance

Focused renderer tests must freeze generation identity, cell staggering, ghost delay,
in-well bounds, restart/undo cleanup, and the reduced-motion endpoint. Navigation tests
must freeze URL behavior, browser-history transitions, fallback behavior, and the CSS
reduced-motion contract. After the last source edit, run one typecheck, the complete
suite, one production build, and one bounded browser pass showing the arrival sequence
and two route changes with one Canvas and zero browser errors.

### T30 acceptance disposition

Product source `19a17e6` and evidence `2da8a37` satisfy the frozen contract. The
renderer stages each new generation at already-safe visible coordinates over 204 ms,
delays the ghost, and clears its presentation state across lifecycle boundaries. Home,
Puzzle library, and gameplay use one route surface with native View Transitions where
available, a CSS entry fallback, and a transform-free reduced-motion endpoint. Final
typecheck, `372 passed / 3 skipped`, the production build, and the Chromium audit pass
with one Canvas, zero DOM board cells, zero browser errors, and zero audit failures.
Independent read-only QA accepts `dc2aaad..2da8a37` with P0–P3 all zero.

## 2026-08-04 T29 — complete SFX remaster

T29 is one bounded procedural-audio remaster. Player review rejects the accepted T28
mix as globally too soft: increasing the master alone is not an acceptable repair,
because it would make repeated input abrasive while leaving event hierarchy unclear.
This slice therefore supersedes T28's literal "soft-edged" balance for audio only with
**defined, responsive, and non-fatiguing** feedback. It does not change gameplay,
visuals, timing, scoring, localization, themes, music, or the single-Canvas boundary.

### Dynamic hierarchy and material language

The mix uses one shared procedural instrument family with three intentionally separate
roles. Each role is audible at the default 100% setting, and higher-priority feedback
must remain identifiable when events share a frame.

1. **Controls** — horizontal move and soft drop stay single-voice, short, and
   rate-limited. Rotation gains a rounded two-part turn rather than a sharp click.
   Gravity lock remains quieter than hard drop, and hard drop uses a compact body/contact
   pair without a sub-bass tail.
2. **State and hazard** — undo, pause/resume, bedrock motion, rock warning/spawn/landing,
   and level-up receive distinct direction, register, and duration. Repetition must not
   create an alarm, burst, electrical buzz, or explosive transient.
3. **Reward and resolution** — one through four cleared lines form an ascending family
   with progressively more harmonic body, stereo-independent temporal spread, and a
   longer resolved tail. Four lines are the strongest repeatable gameplay reward.
   Mutation activation, Puzzle completion, and terminal results retain higher semantic
   priority and must not be mistaken for ordinary clears.

At 100% volume, presence comes from cue-specific midrange fundamentals, a restrained
triangle body where useful, 3–8 ms attacks, and deliberate 70–300 ms envelopes. It must
not come from clipping, a full-band noise wash, a global gain jump, or a large persistent
loop. The master path preserves transient contrast with a bounded ceiling and compressor;
every individual voice stays below the fixed gain ceiling and total live voices remain
at or below sixteen.

### Event contracts

- One/two/three/four-line clears schedule 2/3/4/5 voices respectively, are materially
  stronger than a move tick, and increase monotonically in aggregate peak energy.
- The same-batch resolution order remains Mutation activation, completion/game-over/
  level-up, ordinary clear, hard drop, gravity lock. A lower item cannot mask or double
  the event that owns the resolution.
- Ice is a short crystalline confirmation without a persistent tone; Supergravity is
  a weight-and-settle pair with only its already-bounded low ambience; Bomb is a compact
  low body plus filtered air; Reshape is a fast three-facet rewrite; Double and Super
  Double use distinct two- and three-step mallet signatures. Duplicate same-item events
  still trigger once.
- Countdown remains three unmistakable transport beats: `3` and `2` repeat, `1` is
  higher and longer. `started` and `restarted` remain silent so the first countdown beat
  is never doubled.
- SFX enablement, volume, suspend, restart, Mutation expiry, and destroy retain strict
  ownership. No sample asset, music loop, new dependency, timer queue, AudioContext, or
  persistent background service is introduced.

### T29 acceptance

Direct scheduling tests must freeze each event family's voice count, contour, ordering,
relative peak hierarchy, rate limit, invalid-input refusal, same-frame suppression,
sixteen-voice ceiling, and lifecycle cleanup. After the final source edit, run one
typecheck, the complete test suite, one production build, and one source-bound browser
runtime audit proving SFX enable/volume routing, countdown ownership, one Canvas, zero
browser errors, and complete teardown. Perceptual acceptance is based on the declared
hierarchy and real playback; a higher numeric gain alone is not evidence of completion.

### T29 accepted evidence

The accepted product source is `ca5da48`, with source-bound browser evidence at
`abce548`. Direct audio coverage passes `29/29`; final typecheck, the complete suite
(`365 passed / 3 skipped`), and the 759-module production build pass. The browser audit
proves 2/3/4/5-voice clear tiers, a bounded 12-voice dense Mutation batch, real
enable/volume/suspend routing, 31 AudioContexts each closed exactly once, one Canvas,
zero DOM board cells, and zero browser errors or audit failures. Independent read-only
QA accepts exact range `dfb9fbb7..abce548` with P0 0 / P1 0 / P2 0 / P3 0.

## 2026-08-04 T28 — ordinary line-clear release polish

T28 is one bounded Release Polish slice for the shared ordinary clear. It supersedes
the 2026-07-30 ordinary-clear rollback only for the feedback described here; it does
not reopen gameplay rules, Puzzle boards, scoring, themes, layout, branding, or the
single-Canvas architecture. Core still owns the same deterministic twelve-tick /
200 ms `line-clear` phase and row removal. Presentation may read that phase and the
existing terminal events, but may not delay, advance, or reproduce the simulation.

### Four related profiles

The family is theme-led rather than rainbow-coded by line count. Every profile keeps
the locked cells legible and uses the material/theme accent already attached to the
cleared cells. More lines increase spatial coverage, layer count, and the length of a
quiet tail; they do not increase page brightness or introduce giant text.

1. **Precision Cut / 精准切割** — one restrained centre-out face release, a narrow
   inner cut, and at most a few tiny horizontal chips. It has no board impulse, page
   flash, or post-commit tail.
2. **Dual Resonance / 双层共振** — both rows answer as one event with a short paired
   face pulse and one quiet connecting echo. Its post-commit residue is no longer than
   20 ms and cannot cover the next active piece.
3. **Cascade Fracture / 级联裂解** — three rows resolve bottom-to-top with a bounded
   stagger, slightly stronger face separation, and a sparse mineral-chip field. Its
   low-alpha residue ends within 280 ms of `clear-started`.
4. **TetraMorph / 四线重构** — four rows form the only signature clear: four local
   diagonal glints and a denser but still board-local chip field. The Core-facing
   portion still ends at 200 ms; only a low-alpha, non-blocking afterglow may continue,
   and the complete presentation ends within 420 ms of `clear-started`.

The profile table is pure and clamps only valid counts `1..4`; malformed counts fail
closed and create neither visual nor audio work. Normal-motion core durations are
150/183/200/200 ms. Reduced-motion durations are 100/117/133/133 ms and contain only
simultaneous stationary face brightness. Reduced motion removes fragments, stagger,
travel, and post-commit tails while preserving the 1/2/3/4 brightness/layer hierarchy.

No ordinary profile translates or scales the board, flashes the page/HUD, adds blur or
bloom, creates a DOM cell, or instantiates a Pixi filter. All fragment placement is a
stable presentation-only function of count, row, column, and phase. The renderer uses
one bounded ordinary-tail queue, clears it on restart, Puzzle undo, and destruction,
and never lets it grow beyond four cues. Anchors are not ordinary clear participants
and must never receive a clear face or fragment.

### Mode and conflict policy

- **Classic** uses the canonical profile unchanged.
- **Survival** uses 95% face intensity and 90% chip intensity. Clearable falling stone
  cells may emit the same bounded chips in their own cold mineral material; permanent
  bedrock never fractures as part of an ordinary clear.
- **Mutation** uses 105% face intensity. If the same clear activates an item, generic
  face intensity is reduced to 65%, no generic tail is queued, and the item activation
  keeps visual and audio priority.
- **Puzzle** uses 78% face intensity, no chips or tail, and reduced-motion geometry even
  when full motion is enabled. Completion begins only after Core commits the clear.
- **Bomb** removal is not a generic three-line profile. A batch containing Bomb or any
  other Mutation activation suppresses the generic terminal tail and clear chord;
  Bomb, Mutation activation, Puzzle completion, quad, triple, double, and single form
  that descending priority order.

### Clear-forward procedural audio and supporting mix

The existing AudioContext, effects bus, compressor, master volume, and 16-voice ceiling
remain authoritative. The first T28 audio pass was too quiet and tonally sparse in player
review. The accepted direction is **soft-edged but unmistakable**: keep rounded envelopes,
consonant intervals, and bounded gain, while giving each clear enough onset, harmonic body,
and release to read as the positive resolution of the placement. Presence comes from
layering and duration, not a global volume jump, noise burst, sub-boom, metallic click,
distortion, alarm contour, or combo-driven gain.

- one line: two compact voices form one clean confirmation, approximately 85–120 ms;
- two lines: three voices form one consonant answer with a short 18–22 ms spread;
- three lines: four voices rise in a 20–22 ms cascade and settle without a bass impact;
- four lines: five bounded voices form the sole signature cadence, with a smooth bright
  release ending within 240 ms and no piercing upper partial.

A gameplay batch has one audible resolution hierarchy. Mutation activation remains above
ordinary clear. Otherwise an ordinary clear suppresses the routine hard-drop or lock tap
from the same batch so the positive clear cue cannot be masked. Invalid counts schedule no
oscillator. Repeated movement remains rate-limited; rotation stays one unbent mid-low voice;
hard drop remains one rounded contact; soft drop, pause/resume, countdown, Survival warnings,
bedrock motion, level/finish/game-over, and Mutation activations retain distinct contours but
must be rebalanced against the clearer line-resolution family. No supporting cue may become
sharper, more explosive, or more prominent than a same-frame clear or item activation.

Disable, restart, hidden-state suspend, and destroy retain the existing lifecycle rules;
every scheduled source disconnects through its normal `onended` path. No new AudioContext,
sample asset, background loop, dependency, or persistent voice is introduced.

### Acceptance evidence

Focused tests must prove profile mapping, invalid-count refusal, count-specific normal
and reduced timing, deterministic fragments, anchor exclusion, bounded tail cleanup,
and Mutation/Bomb priority. Audio tests must prove oscillator count, frequencies,
delays, low gain, Mutation suppression, and cleanup. After the last source edit, one
typecheck, one complete suite, one production build, and one source-bound browser pass
must inspect 1/2/3/4 clears in full and reduced motion plus Survival, Mutation/Bomb, and
Puzzle conflict frames. Evidence must retain one Canvas, zero DOM board cells, zero
console/page errors, and no project-owned server or browser residue.

## 2026-08-03 T27-R1 — axis-symmetric board stage and visual-theme system

The gameplay page is now a stage rather than a dashboard. Its visual centre is the
board, not the combined width of a board and one asymmetric dock. Desktop uses equal
left and right instrument columns around one fixed central board column. The board's
centre therefore remains invariant when mode-specific instruments change. The left
rail owns Next; Mutation places its timed-state ledger beneath Next. The right rail
owns the four statistics. Narrow layouts retain the same semantic order while moving
the instruments into a compact band around the board.

Only the board is framed inside the live gameplay field. The arena and play surface
are transparent layout planes. Statistics are four aligned text rows with restrained
rules, not four cards and not one rounded card. Next is a label plus a Pixi-drawn piece
on open space; Pixi does not paint a preview well or rounded preview border for this
surface. Mutation states use item color, a short timer rule, and type hierarchy without
an enclosing status card. This removal does not apply to real controls or modal sheets,
whose visible boundaries remain necessary for affordance, focus, and accessibility.
The open Next forecast uses a larger tetromino scale but never regains a DOM outline,
Canvas backing well, rounded rectangle, shadow, or empty placeholder frame. Right-rail
numeric values use a stronger desktop scale and theme-owned high-contrast value color;
their labels remain subordinate. The `Next` and `异变状态 / Mutation status` headings
share the left rail's horizontal centreline, and the forecast geometry sits directly
beneath its heading rather than preserving the dead vertical centre of the removed card.

Three coherent themes share geometry and semantic roles:

- **Mineral Mist / 雾昼矿物** is the bright alternative. Cool paper-blue space, pale stone
  surfaces, slate ink, teal actions, and a navy well express the established precise
  mineral workshop.
- **Deep Tide / 深潮夜航** is the default composition for a fresh profile. Blue-black
  space, desaturated
  mineral text, teal/blue/violet signals, and a deeper well create night navigation
  without neon bloom, translucent glass cards, or decorative telemetry.
- **Sunstone / 暖砂日晷** is the warm alternative. Bone and sand space, graphite text,
  copper/olive actions, and a charcoal-brown well use etched separators and dry mineral
  contrast rather than gradients, gloss, or nostalgic trade dress.

Every theme defines the complete semantic token set: page, surface, raised surface,
ink, muted ink, structural line, strong edge, board well, action/focus, success/danger,
and four mode accents. Home, Puzzle library, gameplay, Settings, action sheets, results,
and the Canvas board shell consume those semantic roles. Canonical tetromino hues remain
recognisable across themes; renderer well and frame values follow the selected theme so
the Canvas never looks pasted onto the page. The current theme is a persisted UI
preference and may update a mounted runtime presentation, but it never enters Core,
replay hashes, scoring, or saved game state.

Home and Puzzle library are complete theme surfaces rather than bright pages placed on a
themed backdrop. Their page field, primary and raised surfaces, navigation controls,
selection states, preview/detail regions, structural lines, ink, and focus treatment all
resolve through the active semantic tokens. Mode identity colors and tetromino identity
remain recognisable without forcing a light card. The visible Back control uses the same
theme-owned filled action color, foreground, border, hover, and focus treatment as the
Settings control.

Home's wordmark panel uses a single solid field resolved from the active theme. That field
comes from a brighter brand-surface token rather than the near-black board-well token. It has no
radial glow painted into the panel, no gradient, and no split-tone texture. Light belongs
to the wordmark itself: one restrained, static theme-colored halo improves presence
without pulsing, flashing, or reducing contrast; reduced motion removes any entrance
interpolation. Mode tiles use the active theme's surface, edge, ink, and mode accent for
hover and keyboard focus. Pointer hover is transient and clears on pointer exit, while
keyboard focus remains visibly themed without falling back to the generic action blue.

Settings presents the three choices as one labelled, arrow-key navigable theme rail.
No option uses a circle, segmented chip, detached color sample, or checkmark. All options
use the currently active theme's shared control surface; they do not preview three separate
theme palettes inside one Settings page. A visible selected outline, localized
selected-state text, and `aria-pressed` keep selection from depending on hue. Enter activates
the focused option, focus remains visible, and reduced motion removes theme cross-fades.
The Motion choice uses the same filled, theme-owned button construction as Language and
Sound in both states; `Full motion` must never look disabled merely because the reduced-
motion boolean is false. Full motion retains bounded cover fades, value-settle cues,
theme/surface interpolation, and the renderer's short particles and trails. Reduced motion
shows the same informative endpoints without cover interpolation, continuous breathing,
value translation, particles, or trails; deterministic timers and game state remain
unchanged. Changing between the two states must not flash or repaint the entire page as an
intermediate frame.

Pause and Restart are board-cover states, not floating white dialogs. Pause uses the
opening cue's full-board composition with `暂停 / Paused` and `回车继续 / Press Enter to
continue`; Enter is the only resume path. Pressing `P` again and pointer clicks on the
cover do nothing.
Restart uses the same composition with `重新开始 / Restart` and `回车确认，按 R 取消 /
Enter to confirm; R to cancel`; Enter restarts through the normal countdown and R returns
directly to the interrupted run. Escape opens the established leave flow from either
Pause or Restart without resuming the run. Neither cover may hide or clear the external Next forecast. The
top-bar Back and Settings controls remain live above both covers. Invoking either control
keeps gameplay paused and replaces the board-local interruption with the existing leave
or Settings transaction.
Theme names and accessible descriptions are localized; identifiers and storage values
remain stable English keys.

Gameplay interruption remains board-local. Pause is not a white dialog: it reuses the
opening cue's board-cover language, with a large localized Pause label and one quieter
instruction line. Only Enter resumes the same run; pointer input and a repeated `P` are
inert while paused. Restart confirmation uses the same board-cover composition and a
wider, more comfortable text measure than the earlier undersized card. Its dim layer
preserves readable Next content on the left. Next itself is an open Pixi forecast with no
DOM border, outline, Canvas backdrop, preview-well geometry, or neutral host rectangle in
populated, empty, paused, restart, or loading states, and idle Mutation state contains no
placeholder dash or rule.

The mirrored instruments are deliberately larger than the first T27-R1 pass and begin
in the upper portion of the stage rather than floating around its vertical midpoint.
Next gains enough drawing area to read at a glance; statistics use a stronger label/value
scale on the right. A value change may settle upward over roughly 180 ms with opacity,
but may not resize the rail, flash, pulse continuously, or move the centred board.
Reduced motion removes this cue.

The entry cover presents only `3`, `2`, and `1`. It never adds a trailing `开始 / Start`
word or hold. After the `1` beat, the veil and its board-local light treatment leave via
one short opacity transition; the first piece begins falling when that exit completes.
The cover uses a corresponding short entrance rather than appearing as a hard cut.
Its illumination begins with one low-contrast luminous base that visibly fills the complete
board, then adds only broad four-direction edge falloff. It must read as one continuous soft
field rather than four isolated edge lobes or a mostly unlit board; no central circle, ring,
hard hotspot, or single-axis beam may remain visible.
Reduced motion keeps the same timing boundary but removes interpolation. Each digit owns
one stronger, short procedural SFX accent on the runtime AudioContext; the cues remain
volume-controlled and leave no persistent voice.

Mutation's ordinary acceleration ladder now clamps at `0.2` seconds per cell. Ice still
overrides the live display and automatic fall to `1.0` second per cell, and the latched
Supergravity landing rule is unchanged. This Mutation-only floor does not modify Classic's
saved two-handle interval or Survival's independent cadence.

### Inner-page navigation

The application uses the browser History API without a router dependency. Canonical
paths are `/` for Home, `/puzzles` for the Puzzle library, `/play/classic`,
`/play/survival`, `/play/mutation`, and `/play/puzzle/:stablePuzzleId`. Initial render
parses the current path, direct links enter the same canonical React state as visible
controls, and `popstate` restores screen, mode, and selected Puzzle. Invalid modes or
Puzzle IDs replace to `/`. First-entry rules are still a modal gate: confirming pushes
the destination path, cancelling leaves the current path unchanged. Core and replay
state never read URL values.

## 2026-08-03 T27 — personalised Classic pace and restrained feedback

T27 is a bounded post-RC polish slice. It does not add a mode or replace the renderer;
it makes the accepted game easier to personalise and makes time-critical feedback more
legible without increasing visual noise.

### Typography and Home

The wordmark remains the only Playwrite NZ Basic text. Ordinary English interface copy
uses the locally packaged Metal regular face at its real 400 weight with one controlled
optical size adjustment so its compact authored metrics remain as legible as the Chinese
UI without substituting another family. Chinese keeps
Noto Sans SC and numeric/data roles keep Geist Mono, so applying Metal never changes
score digits, timers, dates, keycaps, or board indices. A cadence metric has a stable
two-row rhythm: the complete localized label occupies the first row, then the Geist Mono
value and localized unit share one no-wrap baseline on the second. The unit uses
Metal for English and Noto Sans SC for Chinese at the label's visual weight. Metal is
loaded only at its authored 400 weight; the cascade does not invent a bold face and does
not touch the wordmark or data glyphs. Home removes its positioning line in both
languages and collapses that line from layout. Every
fallback remains local/system-safe for offline Steam packaging.

### Gameplay side rail

The ordinary desktop rail is one vertical instrument stack. One enclosing statistics
surface forms a `4 x 1` reading order; it is explicitly neither a `2 x 2` dashboard nor
four independent cards. Its four rows share one border, radius, background, and shadow,
with only quiet horizontal separators between adjacent rows. The Next module follows
immediately below at the same width and surface rhythm. React owns that grouping and
label hierarchy while Pixi remains the sole owner of the actual preview well and piece
drawing. The combined group is vertically centred in the available rail height, so
changing the Next frame cannot strand a large structural gap above or below it. Puzzle
preserves its two-item preview and active Mutation status may join the stack, but
responsive reflow, paused-state visibility, and the one-canvas boundary remain
unchanged.

Mutation adds one stable state instrument before the shared statistics surface. It is
present in both idle and active play so activating or expiring an item never shifts the
statistics or Next preview. Idle state retains only the instrument heading and empty
reserved body; it shows neither a standby sentence nor a decorative spectrum. The
containing surface keeps the same raised hardware family but receives a restrained cool
violet-grey tint and coordinated border, visibly separating Mutation state from the
neutral statistics and Next modules without becoming a yellow warning card. Idle keeps
only that quiet shell tint. Active Freeze, Supergravity, and multiplier rows remain the
primary cyan, violet, and amber signals inside it. The DOM/source order is status,
statistics, then Next on every viewport, even when compact CSS turns that column into a
horizontal strip. Idle and one active row share one reserved ledger height. On desktop,
the instrument is lower-edge anchored above statistics, so simultaneous rows expand
upward while statistics and Next retain invariant coordinates; the empty state does not
need a tall three-row placeholder to achieve that stability.

### Classic gravity interval

Classic owns two player preferences measured in seconds per cell: the opening speed and
the fastest speed. Each is selectable from `1.0, 0.9, ... 0.1`; a fresh profile uses
`0.8` and `0.1` respectively. The fastest value cannot be numerically greater (slower)
than the opening value. The Core stores both tick counts inside a Classic run so seeded
replay and state hashing include all future-affecting state. Every ten cleared lines
advances one 0.1-second tier until the selected fastest bound. Settings may change the
next-run interval while a run exists, but it cannot mutate that run; the runtime injects
both new values only when it constructs or restarts the next Classic state. Invalid or
stale storage falls back to the `0.8` through `0.1` interval rather than entering Core.
The two bounds share one discrete speed rail running from `1.0` (slower) to `0.1`
(faster). Opening and fastest are named above the rail with their live values, while a
single localized unit and the highlighted interval remove repeated labels. Two handles
remain independently focusable and move in `0.1` steps; pointer selection chooses the
nearest handle. The rail, interval, handles, and focus treatment share the Settings
control blue; browser-default colors are not part of the component. The active thumb
owns the focus ring. Pointer drag, click selection, and keyboard adjustment never place
a rectangular focus outline around the full rail.

Classic ranking has three deliberately broad difficulty grades rather than one board
per possible pair of handles. Convert the opening and fastest tick bounds back to
seconds per cell, take their arithmetic midpoint, and classify that midpoint as
`relaxed` at `0.65` seconds or slower, `standard` from `0.35` through `0.60`, or
`challenge` at `0.30` seconds or faster. Because each bound moves in 0.1-second steps,
the midpoint moves in 0.05-second steps and there is no unclassified gap. The Settings
rail displays the localized grade next to the pending interval so the consequence is
known before the next run.

The v9 Classic record stores `classicDifficulty`, `classicStartingGravityTicks`, and
`classicGravityFloorTicks` with the score. A run is therefore compared only with the
top five rows that used the same derived grade, even if the player changes Settings
before opening the result. Settings and results expose one compact three-choice grade
filter, defaulting to the pending or completed run's grade respectively. The underlying
Classic collection retains at most five rows per grade; Survival and Mutation retain
their existing independent top-five collections. Valid v8 Classic records cannot prove
their historical interval, so migration assigns them to Standard while preserving their
score, line, piece, date, and ordering data. The old key remains readable for rollback
and is never destructively rewritten in place.

### Survival pace feedback

The independent falling-rock accumulator advances seven units for every one simulation
tick and resolves at the unchanged Survival gravity threshold. This gives exactly 7x
ordinary gravity without browser-time fractions. No other rockfall rule changes.
`距离落石 / Until rockfall` shares the bedrock countdown's urgent color and restrained
pulse at its existing piece threshold. The complete card surface performs a quiet,
uniform background breath while the border stays stable; no left inset rail or local
stripe is introduced. Reduced motion keeps the color/state change but removes the
pulse. The visual parity is not a second countdown source.

### Supergravity and entry audio

Supergravity is the one five-second timed Mutation. Re-triggering refreshes it to five
seconds; the currently airborne piece keeps the accepted landing latch if the timer
expires. Its persistent cue is the complete top horizontal boundary moving vertically
with a clearly visible irregular two-frequency tremor. All points share the dominant
up/down displacement, with only a minute local variation so it reads as a gravity
boundary rather than a decorative wave. One low-opacity stationary reference echo makes
the travel legible. The board, active piece, and stack never shake with it. There is no
falling stripe, large icon, screen flash, rain language, or board-wide displacement.
Reduced motion keeps one static compressed top edge and its reference echo. The HUD meter
divides by the five-second maximum while other timed items continue to divide by ten
seconds.

Double and Super Double abandon the fixed upper-right star emblem. Their sustained
language is a shallow upper-field score-glint field: independent amber four-point glints
drift from varied top positions and dissolve before reaching the lower playfield. Each
mark is assembled from a faint outer star, a crisp inner star, and no more than two
detached dust motes. There is no circular backing disc, connected stem, line tail, comet
trail, or pulsing halo: those shapes resemble hanging lamps, rain, or UI markers instead
of natural light. This keeps the timed state readable without a screen flash or board-wide
tint. The ×4 tier increases count and warmth, not the footprint of any one mark. The
pattern is ambient state feedback, never an input target or score burst, and it remains
behind active/ghost pieces. Reduced motion retains a clearly visible static top-edge glint
field without drifting animation.

The entry countdown uses an original transport-style procedural cue on the
runtime-owned effects bus. `3` and `2` repeat one short electronic pulse built from a
warm sine body and a very quiet octave partial. `1` repeats that same material at a
clearly higher pitch with an approximately 240 ms body so the final beat reads as a
deliberate countdown resolution; it does not carry a separate quiet envelope
through the remaining hold. The cover then exits silently in 120 ms and input opens. There is no
second onset at the visual boundary: the runtime's `started` event is silent. The three
discrete beats remain rhythmically legible without a detached release sound, pitch
sweep, chord, noise burst, external sample, unrelated Start jingle, extra timer, or
persistent voice. The pulses respect mute and volume, share the runtime AudioContext,
and are released by the existing teardown boundary. Pause/resume cover feedback uses
separate low-gain, short sine taps without sharp pitch sweeps so these interruptions stay
softer than the entry countdown.
Confirming a restart must not layer the generic `restarted` event cue underneath digit
`3`: every restart path hands audible ownership to this one countdown sequence, so its
first beat is exactly one pulse rather than a restart flourish plus a countdown pulse.

Puzzle is the sole entry exception. Because a Puzzle run begins from an authored,
deterministic board and fixed queue, opening, replaying, or restarting it skips the
entry veil, its `3 / 2 / 1` audio, and the veil-exit delay. React enables input and
starts the first fixed piece as soon as the runtime mounts or resets. Classic,
Survival, and Mutation keep the shared countdown; Survival also keeps its staged
bedrock-rise presentation.

Fast horizontal repeat uses one separate soft sine voice with no frequency sweep and a
minimum 60 ms accepted-voice interval. The interval suppresses stacked attacks rather
than delaying input or creating a queued audio stream; gameplay timing remains wholly
unchanged. The movement voice is intentionally quieter than landing, clearing, and
countdown feedback.

Rotation uses one short mid-low sine voice with no second partial and no pitch sweep.
It remains distinguishable from horizontal movement through register and duration, but
must not produce the sharp two-voice chirp of the former triangle-plus-sine cue.

Landing uses a compact mid-low sine contact rather than a bass-heavy impact. A gravity
lock is the quietest form; a hard drop is only modestly stronger and still owns one
short voice. Neither path stacks a second transient, sweeps into sub-bass, or lingers
long enough to read as a thud or electrical tone. Line clears remain the stronger
resolution event.

The Settings sheet does not repeat its page name as a visible top-left heading. Its
dialog keeps the same programmatic name through a visually hidden heading, preserving
screen-reader and focus semantics. Deep Tide Settings tabs use the theme's raised and
action surfaces with near-white text for a clear idle/selected hierarchy. Restart from
Settings is a direct command: it closes the sheet, resets the runtime, and starts a new
countdown. The board-level R shortcut remains the deliberate confirmation flow.

Reshape is an instantaneous Mutation and therefore does not occupy the persistent timed
status ledger. Its activation instead owns a concise three-beat Pixi cue: four displaced
cell facets gather, lock into an I silhouette, and release one restrained confirmation
ripple. A very low-opacity teal field response and corner alignment marks make the event
legible against a busy stack without becoming a full-screen flash. Reduced motion renders
the assembled I plus a static confirmation frame. The cue uses Reshape's teal palette,
never Double's star language, and completes quickly enough to preserve input cadence.

Mutation carriers return to the pre-plate, pre-charm material language. The underlying
tetromino keeps its ordinary body, while every one of its four cells receives the same
fine item-specific surface mark and the connected carrier receives one compact core plus
a restrained perimeter accent. There is no neutral key plate, crate frame, detached
socket, or single-cell charm implying that only one mino owns the item. The same material
language is rendered on the falling piece, locked carrier, and Next preview. All four
cells retain one carrier identity: clearing any one triggers the item, removes that
identity from every surviving sibling, and emits one activation only. Reduced motion
keeps the marks static; clearing or replacing the carrier removes every overlay.

### Portrait result hierarchy

The ranked Classic, Survival, and Mutation result sheet becomes a narrow vertical game
scorecard instead of a wide dashboard. Its desktop measure is `30–32rem`. The sheet
title is the principal ranking metric itself—`消行 / Lines`, `生存时间 / Survival time`,
or `得分 / Score`—rather than `经典结果`, `生存结果`, `异变结果`, or their English
equivalents. The same metric's unboxed hero number follows directly, framed only by
restrained mode color and whitespace, so the label is not duplicated beneath it. The
number keeps the complete Geist Mono glyph box: its container remains overflow-visible,
uses a safe line box, and does not tighten tracking enough to clip counters, terminals,
or the baseline. The contextual metric is one compact supporting row; the top-five
history reads down a
low-noise list; and the actions finish the same axis. A giant bordered hero card and a
second dashboard card are explicitly excluded. Width may collapse to the viewport but
does not expand to fill board space. The current run is still identified inside its
real list row; no duplicate rank sentence, decorative subtitle, or empty side column
is introduced.

Puzzle uses the same portrait rhythm without becoming a ranked-mode ledger. Its title
continues to communicate the actual outcome: first clear, new personal record, or solved
replay. The outcome title leads directly into one central best-step number with the
localized `当前最优步数 / Current best` label and step unit. No emblem, prism, orbiting
particle, or other decorative figure may sit between the title and that number; the
former constellation card, generic completion statistics, level metadata, and
explanatory paragraph are absent.

## 2026-08-03 T26 — v1.0 Release Candidate convergence

TetraMorph now follows a release-candidate convergence programme rather than another
feature cycle. The accepted deterministic Core, single Pixi canvas, four modes, local
audio, replay model, and React composition remain authoritative. Product work is split
into project cleanup, first experience, visual unification, bounded mode polish,
engineering closure, and showcase evidence. Each phase produces a green rollback point.

Phase A separates identity from compatibility. Public metadata, README, active QA
surfaces, and all new persistence writes use `TetraMorph` / `tetramorph`. Historical
`qingliu:*`, `tetris:*`, and `stack-order:*` storage keys remain named migration inputs;
they are not user-facing brand and must not be bulk-deleted. A valid old value is parsed,
written once under the current `tetramorph:*` key, and left intact for rollback.

**Verified Phase-A implementation.** Package metadata and the public README now lead
with TetraMorph. Current rule-intro, leaderboard, and Puzzle-progress writes use
`tetramorph:*`; every former key remains a tested migration input. Maintained runtime
and layout automation now use explicitly branded TetraMorph QA globals. The complete
nonvisual gate passes without starting a development server or browser.

The final typography contract intentionally supersedes T24/T25 experimentation:
Playwrite NZ Basic is the brand face, Space Grotesk is the English/UI face, Geist Mono
is the data face, and Noto Sans SC is the Chinese face. That change belongs to
Phase C and must not be mixed into Phase A.

### Phase B — one-sentence promise, concise rules, immediate Start

The Home keeps its existing four-mode matrix and single `TetraMorph` wordmark. A single
positioning line sits with that brand, never inside the mode cards and never expands
into marketing prose: `Transform the way blocks fall.` in English and
`重新定义下落方块` in Chinese.

First-entry guidance is a separate information layer from Settings. Every mode uses
exactly three facts—Goal / Mechanic / Challenge—written for a first run; Settings keeps
the complete operational rules. The Chinese values for each mode total fewer than 100
characters. This separation prevents a concise onboarding edit from deleting precise
rules players may revisit later.

The entry overlay presents `3`, `2`, `1`, `Start`. `Start` is a short visual handoff,
not another countdown second: the runtime and controls enable at the same boundary at
which the former overlay disappeared. The cue ignores pointer input, clears on every
restart or mode reset, and honors reduced motion without changing deterministic time.

**Verified Phase-B implementation.** Product source `2198b92` keeps one wordmark and
one positioning line, separates three concise first-entry facts from the complete
Settings rules, and makes the final Start cue visually authoritative without adding a
fourth blocking interval. Source-bound evidence `96b8854` proves the desktop, narrow,
short-landscape, and reduced-motion compositions; the Start frame already owns the
single gameplay Canvas and populated Next forecast. No Core, renderer, persistence,
Puzzle ordering, ranking, or mode mechanic changed.

### Phase C — semantic type, progressive Settings disclosure, and responsive presentation

The player-facing type system now has four non-overlapping roles. Playwrite NZ Basic
belongs only to the `TetraMorph` wordmark. Space Grotesk owns ordinary English UI and
must keep translated prose within the same measured regions as Chinese. Noto Sans SC
owns Chinese UI and headings without a separate novelty display face. Geist Mono owns
numeric/data content, keycaps, ranks, dates, percentages, countdowns, and compact units;
its open counters and balanced width must remain readable at HUD size without the
rejected narrow technical tone. A player-facing English selector resolving to
Playwrite, or a data selector resolving to JetBrains Mono / IBM Plex Mono, is a
regression.

Settings is no longer a poster containing four simultaneous sections. The enclosing
sheet owns one compact tab rail and one content viewport:

- **Settings** presents language, SFX, volume, one reduced-motion preference, and the
  restart/continue pair;
- **Controls** presents gameplay controls first, global shortcuts second, and one
  compact visible touch-gesture note beneath those keyboard groups;
- **Rules** presents the current mode's concise rule facts followed by its Puzzle best
  record or non-Puzzle top-five table.

Only the active panel is in the document layout. This is progressive disclosure, not
three nested cards: tab color and a single lower rule identify state, while the content
uses one connected surface and consistent vertical rhythm. Arrow Left/Right changes
tabs; Arrow Up/Down moves between rows inside a panel; Enter activates the focused
control. Desktop, portrait, and 844 x 390 must have no collision, clipped copy,
unintentional two-line action, or empty quadrant retained for content on another tab.

Reduced motion is a player preference with an operating-system default. With no saved
choice, the app follows `prefers-reduced-motion` and continues to react to later system
changes. The first explicit player toggle writes `tetramorph:reduced-motion:v1` as
`on` or `off`; that choice then owns both CSS presentation and the existing Pixi
`setReducedMotion` path. It never changes countdown, gravity, scoring, replay, or any
other deterministic timing. The Controls touch note reuses the actual board gesture
contract—tap to rotate, horizontal swipe to move, short downward swipe to soft-drop,
and long downward swipe to hard-drop—and does not create a second control surface.

Pause interrupts the game surface below the 64 px top bar. Its translucent backdrop
must not participate in hit testing over the header, so Back and Settings remain real
pointer targets as well as members of the focus loop. A chosen top action replaces the
pause sheet rather than stacking another modal; the live board and Next remain mounted,
dimmed, and unchanged.

**Verified implementation.** Frozen typography source `310d83a` implements the four
semantic font roles and the three-panel Settings console without changing gameplay.
Range-based browser geometry checks cover English and Chinese desktop Settings, English
portrait Controls, short-landscape Rules, Home, Pause, and an English Mutation HUD.
Every state has zero clipped text, text-ink overlap, wrong English/data face, or
horizontal overflow. Pause hit testing and real navigation both reach Back and Settings;
the inspected frame preserves a visible Next well beside the compact pause sheet.

The completed Phase-C candidate extends that correction without changing Core rules.
An explicit reduced-motion choice persists as `tetramorph:reduced-motion:v1 = on|off`,
while an unset preference continues to follow live operating-system media changes. The
same resolved value drives CSS and the existing Pixi option. Controls adds one concise
gesture line after gameplay-first and shortcuts-second keyboard groups. Renderer-owned
HUD previews synchronize the Pixi screen to the current host before every geometry read,
so returning from portrait or short-landscape Settings cannot leave a desktop Next well
outside a stale backing buffer. Source `06bd8b9` and evidence `a062799` close Phase C
across current English/Chinese HUD, result, leaderboard, Settings, Pause, and Leave
surfaces with one Canvas and clean teardown.

### Phase D — deterministic Survival warning lead

The existing Survival source-column arrow remains the only visual danger primitive,
but its warning is now a deterministic gameplay-time contract rather than an assumed
by-product of how long the player considers the preceding piece. The warning owns
exactly `48` minimum playing ticks, equal to `800 ms` at the canonical 60 Hz. Those
ticks begin with the single `survival-stones-warned` event. If the player hard-drops
the warned piece immediately, the following entry phase holds only until the remaining
warning ticks reach zero; if ordinary play already consumed the interval, the usual
entry delay is unchanged. Pause consumes no warning time and restart clears the timer.

The timing floor does not redraw the plan or perturb the ordinary seven-bag or Survival
stone randomizer. The frozen source column, one-or-two-cell rigid stone body, interval
progression, four-times fall cadence, blocked-entry deferral, and shared following-spawn
beat remain unchanged. Audio adds one dry, short, rising warning chirp at event time;
it has no loop or expiry voice and cannot mask piece, clear, or rock-impact feedback.

Accepted source `fcabe49` and evidence `c83b156` close Phase D. The evidence uses only
public commands and deterministic seeds, proves the Survival lead at ticks 47/48,
captures every Mutation family at Next/carrier/activation, and synchronizes the Bomb
board export to its actual impact phase. Classic and Puzzle remain presentation audits,
not new systems. Current English typography, numeric data, Settings tabs, Pause/Leave,
live Next wells, responsive fit, and teardown all remain green; final typecheck, the
complete suite (`316 passed / 3 skipped`), and the 768-module build pass. Bundle and
font weight are intentionally deferred to Phase E rather than disguised by thresholds.

### Phase E — measured delivery and idempotent teardown

Production typography keeps the accepted semantic roles but ships only the explicitly
used WOFF2 faces. The Chromium/Steam release target does not require duplicate WOFF
payloads, and historical unused font binaries are not production assets. This is a
delivery correction, not another typography redesign.

Runtime teardown is idempotent by contract. Restart replaces one active runtime with
one active runtime; unmount releases renderer frames, visibility/input listeners, the
single Canvas, QA bridge, and the runtime-owned AudioContext exactly once. Development
tooling may retain its own baseline interval and listeners, so evidence compares the
post-unmount state with the measured pre-runtime baseline rather than claiming an
impossible process-wide zero.

The current main application chunk warning remains visible. The measured payload is
dominated by React DOM, Pixi/runtime rendering, application composition, deterministic
Core, and authored Puzzle data. Raising the warning limit would hide evidence, while
static vendor chunk reshuffling would change request boundaries without reducing first
run execution weight. A lazy runtime boundary is deferred until it can be justified and
verified as a behavior-preserving product change.

**Verified implementation.** Source `4d37d59` reduces emitted font bytes by `57.6%` and
source `6af5403` adds direct idempotent runtime/audio teardown proof. Final typecheck,
the complete suite (`318 passed / 3 skipped`), build, scoped dependency audit, and
source-bound lifecycle browser evidence pass without changing gameplay or presentation.

## 2026-08-03 T25 — language-invariant English mode names

The four Home mode names are permanent English proper names, so their typography is
also permanent. `Classic`, `Survival`, `Mutation`, and `Puzzle` use the existing
Playwrite NZ Basic English UI role whether the surrounding interface language is
`zh-CN` or `en`. The selected language still owns accessible action copy and every
other localized surface. This correction changes no wording, card geometry, mode
order, focus behavior, or animation.

**Verified implementation.** The authoritative Home navigation rule owns the English
family explicitly instead of inheriting the page-language `--font-ui` alias. Chromium
reports the same loaded family, weight, width, height, and position for all four labels
in both language states.

## 2026-08-02 T24 — editorial settings console and stable type roles

**Accepted implementation.** Product/evidence candidate `eeb7c00` preserves one
Playwrite English UI role, one IBM Plex Mono data role, a balanced responsive Settings
console, and a non-modal Pause status window whose focus cycle explicitly includes
Continue, Back, and Settings. The reproducible evidence matrix binds to source
`1dabee8`; independent QA reports no P0-P3 finding.

T24 treats localization as layout truth rather than a string swap. English interface
copy has one consistent handwritten-humanist voice, but it is allowed real line height,
ordinary letter spacing, and content-width columns instead of being squeezed into the
metrics of the former condensed face. The wordmark alone retains the bold outlined brand
treatment. Data moves from the programmer-coded appearance of Fira Code to IBM Plex Mono:
clearer open counters, less aggressive punctuation, real tabular alignment, and no forced
slashed zeroes.

Settings is one editorial console. The top rule strip establishes context; the middle
is a balanced two-column composition with run controls on the left and the complete
keyboard map on the right; the record ledger forms the shared baseline below. Section
color and heading rhythm distinguish content without nested cards or ornamental boxes.
At narrow widths the columns collapse in reading order without retaining desktop-sized
empty tracks.

The pause sheet interrupts the board, not global navigation. Its translucent gameplay
backdrop and compact board-centred surface remain, while the top bar sits on a deliberate
interaction plane above it. Back and Settings can therefore replace Pause with their
existing single-dialog flows. Focus, input disablement, Next visibility, and one-Canvas
ownership do not change.

## 2026-08-02 T23 — authored pressure and quiet transformation

T23 adds decisions, not ambient randomness. Survival receives a slight five-percent
gravity increase and a deterministic Aftershock cadence: every fourth natural wall
rise advances two rows. Because the risk follows the same visible pressure clock and
does not depend on another random stream, players can plan around it. Initial staged
bedrock is presentation setup rather than pressure history; cleared bedrock does not
erase the cave's accumulated cycle. The ordinary rise label changes to Aftershock
only when the next resolved rise will be doubled.

Mutation's fifth carrier is **Reshape**. Its reward is forward information: clearing
the carrier rewrites the first queue entry that remains after the same-transition
spawn to `I`, and the existing Canvas-owned Next well immediately shows that result
for one complete turn before it enters. Reshape is an instantaneous emerald event with a
compact four-cell alignment motif. It never opens a persistent status card or field,
and it cannot disturb Bomb-first resolution, seeded replay, carrier cleanup, or the
fixed queue/preview contract.

Persistent effects recede behind play. Supergravity uses several broad horizontal
compression contours and a shallow contact-pressure wedge around occupied columns;
it contains no narrow vertical rain strokes and never pulses opacity. Multiplier uses
a small upper-corner constellation and x2/x4 mark rather than a central seal. Its
geometry and opacity are time-invariant, and x4 adds only one tiny secondary point.
The status rail remains the strongest source of effect name and remaining time.

Language selection is a run-level setting, so the one persisted control returns to
the Settings console. Home uses four permanent English proper names—Classic,
Survival, Mutation, Puzzle—while actions, rules, Settings, records, and accessibility
continue to localize. The wordmark and mode matrix remain centered and gain no second
language control.

Accepted source `4c43619` and browser evidence `e8418d5` close this contract. Final
typecheck, the full suite (`305 passed / 3 skipped`), and the 762-module build pass.
The evidence resolves the fourth rise from six to eight rows, captures Reshape plus
activation-free Supergravity and Multiplier fields, and reports one Canvas, zero DOM
board cells, zero console errors, responsive fit, and complete cleanup. Independent
read-only QA of `0107e52..e8418d5` reports P0-P3 all zero.

## 2026-08-02 T22 — label-free control and unified English face

The Home language selector is self-evident from its two explicit choices. It displays
only `中文` and `English`; the redundant visible `语言 / Language` prefix is removed.
The control and its button group retain localized accessible names, persisted state,
keyboard focus and navigation, and the established quiet bottom-right placement.
No spacing placeholder replaces the removed label.

English interface copy shares the Playwrite NZ Basic family with the TetraMorph
wordmark so the English surface has one authored voice. The wordmark remains the sole
bold expression through its existing maximum shipped weight and restrained outline;
other English prose uses the family without synthetic bolding. Chinese typography and
the dedicated tabular numeric/data face remain unchanged for legibility.

## 2026-08-02 T21 — relief continuity and modal sightlines

The Survival floor keeps the exact flat collision top and one uninterrupted cave-wall
body. Its new relief is neither a photograph nor a polygon mosaic. A deterministic,
low-frequency height field forms connected folds and mineral bands at several medium
scales; the bands cross both logical axes, receive one restrained upper-left light,
and use a compact cold blue-grey ramp. Neighboring values blend enough to read as one
eroded face, while gentle quantization keeps the surface compatible with the game's
graphic enamel pieces. No individual region may dominate the wall as a giant triangle
or reveal row, column, brick, tile, or wood cadence. The contact lip stays narrow and
integrated rather than becoming a separate platform.

The rockfall warning is deliberately singular. The one downward source-column arrow
is the only animated warning primitive. Normal motion changes that arrow's opacity on
a short rhythm; no board fill, column fill, halo, scan, or global brightness change
participates. Reduced motion shows the same arrow steadily at maximum clarity. The
warning cannot alter the legibility of pieces, Ghost cells, stack, Next, or geology.

Pause and restart confirmation are gameplay-local interruptions. On a desktop game
surface their compact sheet is centred on the board track, leaving the entire right
information rail—including the Canvas-owned Next piece—outside the opaque sheet.
The dimmer may subordinate the scene but must not clear, replace, or cover the preview.
On a narrow layout the sheet returns to the established bottom placement so the top
information band remains readable. Focus trapping, Left/Right selection, Enter,
Escape/cancel, and restoration to the same Canvas remain unchanged.

T21 changes no Core state, queue, preview semantics, stone cadence, collision, scoring,
replay, persistence, mode layout, or result behavior.

### Mutation activation order and supergravity weight

A simultaneous item grant is one causal sequence rather than a pile of unrelated
flashes. Bomb owns the first beat: its irregular localized blast begins before any
subsequent Ice, Supergravity, or Multiplier activation cue and before their changed
presentation can imply that the board settled by itself. Remaining distinct items then
enter in deterministic order with shorter, non-overlapping activation beats. Repeated
grants of one item still refresh its state once and do not replay duplicate cues.

Supergravity communicates sustained mass through downward compression, not an emblem
or screen pulse. A compact field of constant-alpha acceleration traces converges toward
the live stack and a restrained pressure band hugs the occupied region; trace motion
may be brisk, but opacity remains stable. The active piece and independently settled
Ghost stay the strongest geometry. Timer expiry continues to leave an already-airborne
latched piece under Supergravity through its next lock.

Gameplay sheets preserve queue context as a complete visual instrument: both the Next
well and its queued tetromino remain visible. The overlay may lower contrast uniformly,
but it cannot clear, cover, or replace the preview. This exception is scoped to pause,
restart, and leave sheets; the clean pre-run countdown continues to hide Next content.

### Piece-count stonefall, home language, and explicit rules

Survival pressure is now coupled to player decisions rather than wall-clock waiting.
The counter measures locked player tetrominoes until the next rockfall: 8 pieces at the
start, then one fewer after every four rockfall events, bottoming out at 4. The event is
scheduled on the following spawn so the player can read one coherent arrival beat. Its
one- or two-rock column is drawn deterministically from columns outside the new active
piece footprint; the rocks remain independent actors after entry. Their first frame is
already wholly visible at the board top, including both cells of a two-rock body—no
stone may enter through or be clipped by the hidden spawn buffer. The HUD shows the
compact pair `距离落石` / `X块`, never a seconds countdown.

Language selection is a global front-door preference, so its single control lives on
the home composition rather than inside a live run's Settings hierarchy. It remains
visually secondary to the mode grid and wordmark, supports keyboard focus, and persists
the existing preference. Settings keeps rules, audio, controls, keyboard help, and
records without duplicating language state.

Every mode rule sheet uses the same four-part information order: objective, escalating
pressure, mode-specific mechanic, end condition. Classic explains ten-line speed
tiers; Survival explains rising bedrock, piece-count rockfalls, and top-out; Mutation
explains six-line speed tiers and all carrier effects; Puzzle explains authored fixed
queues, original-block clearing, anchors, Undo, and progression. Copy is compact, but
no rule depends on inference from the HUD.

## 2026-08-01 T20 — Survival material harmony correction

The Survival floor is still an exposed cavern wall, but its visual truth is judged
inside TetraMorph's own material system. The rejected height-field looked like a
high-frequency grayscale photograph placed beneath clean enamel pieces. More literal
surface detail made the wall less believable in this game.

The replacement is **stylized mineral relief**. One deterministic, renderer-cached
surface uses broad low-frequency masses, a limited cold blue-grey tonal ramp, and one
restrained upper-left light direction. Regions span multiple cells and never reveal
the occupancy grid. Their sources have no row or column cadence, and neighbouring
planes blend without outlines, brick joints, or a closed repeated tile pattern. Tonal
transitions may be softly stepped to retain the game's graphic material language, but
the surface cannot regain photographic microtexture, neutral monochrome noise, pebble
detail, camouflage, or hard contour rings. The exact collision top remains level, and
a narrow integrated lip may clarify contact without becoming a separate platform bar.
The lower wall deepens gently so it retains weight beside the brighter playable palette.

The rockfall pre-warning is a signal layer, not geology. A warm accent distinguishes it
from the cold stone family and from every Mutation item. The source column retains a
single downward arrow with a longer shaft and clearer head. During normal motion the
arrow, a narrow column wash, and a very restrained whole-well wash share one short
rhythmic pulse; the board content stays readable and there is no sustained strobe after
the Core warning state ends. Reduced motion renders the maximum-clarity static endpoint
with no time-based opacity change.

This correction does not alter stone count, frozen source column, 4x cadence,
temporary-obstruction rules, coupled push, bedrock rise, scoring, replay, or save data.
The procedural texture still allocates once per renderer and is destroyed on teardown.

**Accepted implementation (2026-08-01).** Frozen source `eadeac6` realizes the wall
with deterministic Halton-distributed broad planes, a seven-step cold mineral ramp,
soft neighbour blending, and a shallow flat contact lip. Its normal-motion warning
keeps the arrow readable between short high-contrast warm flashes; reduced motion is
one static endpoint. Evidence `b600ace` proves the complete live Survival page and
browser invariants. After the sole writer-log provenance gap was repaired by `534e78e`,
independent QA `1b0c64c` accepted P0–P3 and evidence gaps at zero.

## 2026-08-01 Phase 12 — material truth and authored learning

Phase 12 responds to direct visual rejection by making fewer claims and making each
claim physically legible. A stone is defined by silhouette, face planes, contact, and
motion—not a crack decal. A section is defined by typography and reading order—not a
card around every paragraph. A Puzzle hint is defined by a reusable idea demonstrated
by a real level—not a dashboard of solver counts.

The accepted procedural bedrock wall is immutable during the final responsive retry.
That retry fixes measured Puzzle-title glyph clipping and the short-landscape Settings
footer, then replaces the browser matrix with active Mutation and dynamic Survival
proof. It may not revise the wall texture, flat contact lip, geology palette, falling
stone geometry, or Core behavior.

### Decision surfaces

The leave sheet presents the requested destination as the clear default: the left
`返回首页 / Back to home` action is filled primary blue and initially focused. The right
`留在本局 / Stay in this run` action is a quiet pale secondary. Color, position, focus,
and Enter therefore agree instead of sending contradictory signals.

Settings is one bounded console. The enclosing sheet owns the background, border,
radius, and shadow. Rules, Controls, Keyboard, and Record are ordinary flow sections
inside it; none may paint its own card background, rounded container, top stripe, or
shadow. Their headings establish hierarchy through Barlow/Chinese display weight,
section-specific text color, and consistent label rhythm. Space separates ideas but
does not reserve empty columns.

### Typography

- `TetraMorph`: Playwrite NZ Basic, unchanged and used nowhere else.
- English interface: Barlow Semi Condensed at locally bundled static weights. Its
  humanist industrial proportions give controls and mode names a distinct voice while
  fitting narrow surfaces without artificial condensation.
- Data and controls: Fira Code Variable for times, scores, ranks, dates, keycaps, and
  board numerals. Tabular figures and stable punctuation replace Geist Mono.
- Chinese families remain the accepted local UI/display files. Font fallback is
  explicit; no runtime font request is allowed.

Text containers are content-safe rather than ellipsis-driven. Values such as
`0.5 s/cell` remain whole. Responsive changes may reflow a stat grid or reduce a
heading size within its token range, but may not clip units, split an action into an
accidental two-line button, or hide a translated label.

### Survival material system

Bedrock is a continuous vertical cave wall with a mathematically flat top contact at the
cell boundary. Three rejected readings are forbidden: a plain framed slab with a few
oversized light planes, a low-poly fan of triangles/trapezoids, and a dry-stacked masonry
wall made from visible courses and dark joints. The wall owns one uninterrupted body,
then receives a deterministic multi-scale relief field whose irregular mineral regions
cross both row and column boundaries. Regions use close-valued slate tones and shared
edges without mortar-like outlines; broad vertical weight and gradual depth darkening
make the surface read as an exposed cavern face rather than a platform or built wall.
That relief must remain legible at the ordinary gameplay scale. A deterministic
renderer-lifetime height field combines low-frequency eroded masses with restrained
finer grain; a fixed upper-left light derives highlights and occlusion from that same
surface instead of drawing symbols or seams. Rounded nested blobs, pebble clusters,
cobblestone, repeated zigzags, camouflage, and folded-paper reads are forbidden
alongside a nearly uniform low-contrast slab and a sharp tessellated mosaic. The texture
is generated locally once, reused, and destroyed with the renderer; it does not add a
visible canvas, network asset, per-frame random work, or Core state.
No region may repeat at cell cadence, reveal a `10 × N` grid, form horizontal courses,
or dominate the wall as one giant geometric facet. The contact plane keeps one narrow,
restrained mineral lift while the exterior sides and bottom are clipped by the board,
not framed. The rock read comes from continuous surface relief, scale variation, and
directional light—not from a crack, chip, pit, speckle, sticker, stroked vein, wood
grain, brick joint, or per-cell texture. The mass can rise during entry without changing
Core rows.

A falling stone is an unmistakable square block whose rendered outer width and height
equal one ordinary board cell. A narrow bevel and two solid tonal faces create volume
without changing that exact collision-sized silhouette. One event contains one or two
vertically adjacent squares in one frozen column; a pair has no seam-sized gap and
moves and settles as one rigid component. The event advances with an integer accumulator
at four times ordinary Survival gravity. The warned column is identified by one fixed
downward arrow before the event; there is no fissure, flashing beacon, or alternative
warning emblem. An in-flight stone is a temporary obstruction, not a floor: contact
cannot enter or exhaust ordinary lock delay or trigger top-out. When its attempted next
row is occupied only by the active piece, Core treats the pair as one atomic debris
step: both stone and active piece translate down exactly one row if both destinations
are legal against settled board and every other debris event. This repeats at debris
cadence while the stone remains above the piece. If the active piece is instead above
the stone, the stone is temporary dynamic support only: the piece stays where it is
while the faster stone falls away when legal. Neither ordering consumes ordinary
gravity or lock delay, and illegal paired movement leaves both bodies waiting. Player
lateral movement can clear the relation; normal gravity resumes once the stone is no
longer above or below the piece. Normal lock delay resumes only after support is settled
board. Only cadence, this explicit temporary-coupling boundary, warning language, and
material presentation change.

### Home action geometry

The four mode tiles communicate their destination through the mode name and icon. Their
actions therefore use one square arrow control without the redundant `开始 / Start` or
`选关 / Levels` caption. The arrow glyph is centred by button geometry rather than a
font-baseline nudge, and its horizontal shaft is visibly longer than the rejected
compact mark without widening the square target. All four arrows share the same shaft,
head, stroke, and optical centre, while the complete localized mode action remains
available to the accessible name. Hover, focus, and keyboard selection may strengthen
the tile's own color but may not displace the arrow.

### Mutation duration audio

Multiplier and Super multiplier communicate their ten-second duration through the
status rail, light treatment, and countdown. Audio is event-based only: one brief cue
may acknowledge acquisition or activation, but no loop, drone, pulse, or repeated
state sound continues while either multiplier remains active.

The multiplier's ambient emblem is a compact local seal, not a full-board signal. Its
geometry stays small enough to preserve stack readability and its active-state alpha is
steady: no screen flash, alternating opacity, or bright/dark field pulse. Super
multiplier strengthens detail and value inside the same bounded footprint. Reduced
motion uses that same static endpoint.

Supergravity uses the same no-flash discipline, but no longer draws a board-wide top
boundary or ambient field. Weight follows the airborne piece itself: each visible cell
casts a short violet afterimage and tapered upward trail, so downward acceleration is
read from the moving form rather than from unrelated screen decoration. The trail is
clipped to the well, stays behind the solid piece, and disappears on lock without
leaving an empty cell frame. Reduced motion keeps one quiet, static short-tail endpoint.
The effect is latched onto the already-airborne piece: timer expiry changes the HUD and
future spawns, while that piece retains both the trail and independent per-column
settlement through its next lock. The latch is consumed by that lock and cannot leak to
the following piece.

Carrier material is owned only by extant cells. A consumed carrier can seed a bounded
activation burst, but the renderer must not retain or reconstruct its former square
rim, attachment frame, or empty-cell outline after the clear removes it.

### Whole-piece Mutation material

`carrier` remains an internal deterministic identity only; it is no longer a visual or
player-facing object. When an active or locked piece owns a Mutation item, that item
material replaces the complete ordinary seven-colour body. The same material identity
must survive through Next, the projected Ghost, the settled board, and the captured
`300 ms` line-clear body. No state may render an ordinary body first and then attach a
central core, emblem, fifth-cell-like plate, or repeated per-cell badge.

All playable bodies share the existing connected outer contour, readable internal cell
seams, and one quiet light direction. Ordinary pieces add only a low-contrast,
deterministic triangular facet layer. Mutation pieces strengthen that shared layer and
add one sparse family: Ice uses cold crystal planes and broken frost edges; Bomb uses a
dark mineral body crossed by contained orange lava seams; Multiplier uses gold planes
with at most one primary and one secondary glint per piece; Supergravity uses luminous
violet planes with one or two dark wells distributed across the piece. These motifs are
material texture, not trigger-location indicators.

Active and Next carry the clearest material signal. Settled pieces reduce motif/glow
strength so adjacent ordinary cells stay readable. Ghost uses the corresponding
material-coloured outline and only enough internal signal to identify the item without
obscuring the landing silhouette. Clear samples retain the captured material, alpha,
and scale across the already accepted row sequence. Reduced motion uses the same static
endpoints; it does not create a second geometry. Existing local activation particles
release the material at trigger time and remain frozen in timing and composition.

Audio continues to begin only when the item actually activates. Separate transitions
must queue against the same accepted visual timeline instead of restarting an audio
delay at zero, and restart must cancel both the current Mutation cue and future queued
cues. Those lifecycle corrections do not authorize any change to accepted sound assets,
recipes, gains, pan, compression, or timing.

### Home identity alignment

The `TetraMorph` wordmark is centred against the complete dark brand panel, not against
an incidental text line box. The layout uses the panel's two-axis grid centre and gives
the script face a symmetric containing box so glyph overhang cannot pull the visible
mark off-centre. The former browser icon's four equal multicolour quadrants are rejected:
at favicon size that geometry reads as a generic four-pane window and is too close to
Microsoft's dominant silhouette. Its replacement is a vector-first, asymmetric
TetraMorph/tetromino transformation mark with one unmistakable outer contour, protected
negative space, and no letter, copied logo, four-equal-quadrant grid, or trade-dress
silhouette. It must remain recognizable at `16/32/64 px`; favicon work does not reopen
the explicitly excluded PWA install surface.

The first D2 **Morph Core / 异形材质核** draft is rejected before source publication: its
faceted mineral silhouette remains too semantically ambiguous at Apple icon size. Site
identity therefore moves to the final T37 proposal gate. Until then the existing icon is
left unchanged rather than replaced by an unapproved mark. The final proposal must show
its actual browser-tab and Apple-mask readings before implementation, communicate the
falling-block/material theme without explanation, and still satisfy the asymmetric,
single-contour, no-four-pane, no-letter, and no-PWA boundaries above.

Final responsive proof must preserve that same geometry after every legacy cascade.
The wordmark owns a shrink-to-ink box (`max-content`) centred by the parent grid; it may
not inherit a full-width flex box or a compensating translation at portrait or short
landscape widths. The play header follows the same content-safety rule: translated mode
names keep a complete glyph box and visible ascenders/descenders, so a narrow layout may
reduce type size but may not crop Barlow glyphs with `overflow: hidden`.

### Puzzle curriculum

The rejected live analysis panel is removed. It offered counts generated from the
current decision but did not explain why a placement was useful and encouraged trial
and enumeration. The replacement is authored curriculum at the level-selection
boundary, where the player can read one idea before play and then test it without a
live answer feed.

Every lesson-bearing level must have at least one replay-verified public-command route
that demonstrates its idea and one alternate verified route so the lesson does not
imply a single script. The introductory sequence progresses through:

1. close the prepared row before adding unrelated height;
2. preserve a narrow well for the matching long or vertical body;
3. build support before placing a cap that would bury a hole;
4. read Next 1 and 2 as a two-move plan rather than two isolated pieces;
5. flatten one landing surface while retaining a future opening;
6. treat an anchor as permanent collision geometry rather than a target;
7. use a timed side-slip at anchor height to reach around an overhang.

The visible campaign follows that teaching sequence rather than treating route length
as the only definition of difficulty. Stable IDs, boards, seeds, and verified route
families do not move with their old ordinal: the current `difficulty` field is the
teaching position. The library uses three named tabs with deliberately unequal sizes:

- `入门 / Intro` — three isolated three-row foundations;
- `简单 / Easy` — twenty-seven three-row lessons/combinations and four-/five-row
  applications; its first three levels are certified mastery checks, followed by the
  first anchor geometry and timed side-slip lessons;
- `困难 / Hard` — twenty high-load applications grouped by the earlier technique they
  demand, not presented as one undifferentiated endgame wall.

Each Hard group points back to one selected Easy mastery level that exercises the same
idea in a cleaner board. A Hard level unlocks when the saved best for that prerequisite
is no greater than its certified optimum plus five operations. The selector explains
the relationship and remaining threshold in accessible text without turning the page
into a statistics dashboard. Historic save formats keep their literal legacy order
only for decoding; current completion and best-step records remain attached to stable
level IDs when normalized into the revised campaign. A historically completed Hard
level remains replayable even when its newly introduced mastery prerequisite has not
yet been met.

An optimum certificate is stronger than the existing paired route evidence. The
authoring verifier traverses every unique Core decision state that can still finish
before the candidate depth, without beam width, heuristic scoring, state-count cutoff,
or route-length assumption. Its only pruning rule is a mechanically checked admissible
column-conservation bound: every distinct surviving target row still consumes one cell
from every column when it clears; all ordinary cells already in that column are credited
as reusable supply, and only the summed column deficits are divided by four future cells
per tetromino. This stays safe when earlier clears pull existing cells into later target
rows. It records
each exhausted depth, finds no success before depth `N`, then replays public commands
that finish at depth `N`. The frozen
certificate stores the level ID, `N`, replay, frontier widths, explored-state count,
and the current puzzle-definition fingerprint. Product code reads only this verified
constant; verification tests recompute or validate it against the deterministic Core.
The former `shorterRouteLocks` fields remain exactly what they were: shortest routes
found by that bounded search, not mathematical optimality claims.

The library may show a short lesson title and a two-sentence principle/control cue for
the selected introduction level. It may not show landing counts, burden scores,
coordinates, exact rotations, or a complete move stream. Levels without an authored
intro lesson keep the clean preview/name/best/start composition.

### Puzzle header rhythm

The Puzzle library header and the connected gallery are one content-height vertical
composition. The back action and centred wordmark occupy the compact header track; the
gallery follows after a visible but restrained breathing gap: 16 px on desktop and
12 px on portrait or short-landscape layouts. The complete header-plus-gallery stack is
vertically centred in the viewport so that spare height sits outside the composition,
never as either a large disconnect or a visually attached edge between navigation and
the content it controls. This deliberately moves the header down while keeping the
gallery near its established position and size. It does not resize the cards, preview,
tabs, or responsive matrices and must preserve zero overflow at every target viewport.

### Phase 12 acceptance

Phase 12 is accepted at frozen product source
`d84b04351dc89d5f503df2112a71789950ba0796`. Final evidence
`18f8886..9e22a8b` supplies Chinese/English desktop, portrait, short-landscape,
reduced-motion, active Mutation, and dynamic Survival proof with one Canvas, zero DOM
board cells, zero overflow, and zero console/page errors. Strict optimum certificates
pass `3/3`; the final typecheck, full `32 passed / 1 skipped` file suite
(`297 passed / 3 skipped` tests), and `762`-module build pass. Independent read-only
QA `9ec1149..6fce9e6` reports P0–P3 and evidence gaps all zero. The separately
accepted procedural cavern wall chain `2e14ec3 / dcb1d79 / 5619bce / 92a124f`
remains immutable. Publication is non-force and owned resources are released.

## 2026-07-31 Phase 11 — luminous instruments and legible intent

Phase 11 preserves the accepted mineral/cavern foundation but tightens its signal:
**every surface must reveal material, state, or tactical intent.** Ornament that looks
like a rule, border that disappears under selection, and empty space reserved without
information are all treated as defects.

### Material grammar

Ordinary tetrominoes are bright enamel-mineral bodies: a saturated face, a lighter
upper/inner edge, and a stable dark perimeter. The seven hues remain identifiable in
peripheral vision and under Mutation attachments. Brightness rises without a white
glow layer or a second palette.

Survival geology uses dedicated procedural vector bodies rather than the ordinary
cell renderer. Permanent bedrock is a broad continuous basalt shelf: its jagged outer
contour is the geometry, no internal square grid is drawn, and connected lit/shadow
planes plus a few structural fractures establish volume across the mass. Falling
stones are irregular convex boulders with chipped perimeters and distinct lit and
shadow faces. A two-stone event interlocks two bodies into one falling mass instead
of stacking two textured squares. Dust supports motion only; it is never a substitute
for silhouette and volume. Deterministic vertex variants preserve replay and render
tests.

### Mutation atmosphere

- **Ice:** one continuous upper cold front extends through roughly the upper half of
  the well. Opacity follows a smooth easing curve, never visible bands; sparse flecks
  and a faint upper rim establish cold without recoloring the board.
- **Supergravity:** no central icon, chevron badge, flash, top strip, or bottom strip.
  A darkened upper pressure field, a few deterministic downward streaks, and a short
  support-compression response make weight readable. The ghost is a projection of
  the active cells after ordinary descent and the same independent-column settlement
  used by the real lock.
- **Bomb:** no rectangular three-row target frame. A graded lower heat field, an
  irregular blast edge, and rising embers identify the bottom-three-row scope. The
  effect is short, localized, and still understandable with reduced motion.

### Information composition

The right rail is an instrument stack, not a full-height column. It sizes to its
stats/status/Next content; a mode-specific module appears only when it carries useful
information. Settings uses four explicit surfaces in order: Rules, Controls,
Keyboard, Record. Every surface owns its heading and grid so translation length
cannot merge adjacent labels.

English UI is locally packaged Space Grotesk Variable. Numeric and tabular data is
locally packaged Geist Mono Variable. Chinese retains the accepted local UI/display
families and the wordmark alone retains Playwrite NZ Basic. Layout is measured after
`document.fonts.ready`; labels wrap deliberately and values never truncate their
units.

### Puzzle readout

Puzzle guidance is diagnosis rather than instruction. At a decision boundary it
enumerates the same finite legal hard-drop landings already used by route validation,
then publishes four small quantities:

1. **Direct clears:** landings that reduce remaining original cells immediately.
2. **Safe landings:** landings that introduce no buried hole and do not raise the
   non-target burden beyond the best available alternative.
3. **Buried holes:** currently empty cells enclosed below occupied support.
4. **Minimum burden:** the smallest number of extra non-target cells a legal landing
   adds while preserving the puzzle objective.

One prioritized sentence selects among direct clear, hole repair, narrow-gap
preservation, or skyline flattening. The visible queue receives only role hints such
as long-well, flat cap, junction, offset, or edge turn. The system never reveals an
exact column/rotation path, mutates Core, consumes item or piece RNG, changes undo,
or searches continuously with elapsed time.

### Interaction edges

The leave sheet initially selects Back to home. Home cards have no accent rail and
retain a complete inset top edge through hover/focus/selection. Pointer leave removes
pointer highlighting; keyboard focus remains independently visible.

### Phase 11 acceptance

The accepted implementation freezes product source at `12fb0ae` and browser evidence
at `d1656a1`. The geology correction is structural rather than decorative: Survival
bedrock is one continuous, jagged, faceted basalt shelf with no occupancy grid, while
one- and two-stone events use irregular joined boulder geometry instead of textured
square cells. The final Ice correction uses one smooth cached gradient rather than
stacked translucent bands. Final typecheck, `31` files / `288` tests, the `758`-module
build, 24-frame browser review, `26/26` evidence-integrity check, independent QA, and
the scoped secret scan all pass with no product or evidence finding.

## 2026-07-31 Phase 10 — pressure without ambiguity

Phase 10 unifies a set of related defects around one design principle: **the player
must be able to read what will happen next, why it happened, and what mattered in the
finished run.** The accepted Phase-9 mineral/cavern language remains the foundation;
this phase changes state communication, collision semantics, and result hierarchy
without adding ornamental text or another visual system.

### Canonical language

- The gravity tile is `下落速度 / Fall speed`. The numeric value always includes
  `秒/格 / s/cell`; Chinese Ice deliberately shows `1.0 秒/格`.
- The independent-column Mutation effect is `超重 / Supergravity`. Its internal
  serialized identifier may remain `collapse` so existing deterministic state and
  storage do not migrate, but no current player-facing rule, live region, status row,
  Next description, result, or accessibility label says `坍缩 / Collapse`.
- Survival pressure uses the compact tile `上升 / Rise`; the row count remains a
  deterministic game-state fact and may appear in rules or renderer diagnostics, but
  not in the tile heading.

### One cue per Mutation item

Carrier resolution still consumes every carrier and applies every mechanical effect.
For presentation, activations are grouped by item in deterministic first-seen order.
Each item produces one event containing the combined trigger cells and final canonical
duration/factor. A repeated Bomb may still apply its mechanical row clears; a repeated
Double may still promote to ×4; neither produces stacked duplicate flashes or audio
cues. Different item types remain visibly concurrent.

Ice is a local cold front, not a color filter. Its persistent field is a translucent
upper-edge gradient that fades before the main stack, with sparse descending flecks
and a restrained boundary glint. Board, ghost, carrier, and material hues remain
recognizable. Reduced motion uses the same static gradient without drifting particles.
There is no sustained Ice oscillator; activation receives one short, low-gain glass
tap or silence. The HUD reads `1.0 秒/格` for the full active interval and restores
the underlying six-line Mutation cadence when the timer reaches zero.

Supergravity keeps the canonical Next silhouette. On settlement, the affected columns
receive short downward weight marks and a denser support imprint; no row-wide strip,
top banner, displaced preview, screen shake, or geometry mutation is allowed.

### Survival one-way moving support

Falling stones are faster environmental actors, not spawn blockers. Ordinary spawn is
validated against settled board cells only. If a stone already overlaps the spawn
footprint, that overlap is grandfathered only while it resolves downward; the active
piece cannot move farther into a new stone cell.

When an active piece's next downward cells are supported by one falling event and the
event advances, Core attempts one atomic coupled step:

1. move the supporting stone event down one cell;
2. move the active piece down one cell;
3. accept both only when the active candidate does not collide with settled board or
   another non-supporting stone.

If the coupled step is blocked, the falling event waits rather than settling into the
active piece. Once the stone lands on settled support, it becomes ordinary clearable
board material and normal lock delay resumes. The rule is deterministic, integer-step,
hash-visible, and covered for one- and two-stone events, spawn overlap, lateral escape,
coupled descent, blocked descent, clear, and restart.

### Trustworthy preview and entry lifecycle

Next is derived from Core queue plus Mutation item RNG without consuming either. It is
visible during pause and leave/restart confirmation, and hidden only in the canonical
`ready`, `finished`, or `game-over` states. Mutation atmosphere and Supergravity
settlement never crop, recolor away, or replace the preview body.

Restart and Play again both reset into `ready`, disable gameplay input, and run the
same `3 / 2 / 1` presentation gate used for first entry. A restart must not call
`start()` early. On the first `playing` frame, active, ghost, carrier, and Next return
together.

### Mode-first settlement ledger

The result surface answers one question per mode:

- **Classic:** how many lines? Principal value is lines; secondary value is pieces.
  Ranking remains lines-first.
- **Survival:** how long? Principal value is survival time; secondary value is lines.
  Ranking remains elapsed-time-first.
- **Mutation:** how much score? Principal value is score; secondary value is lines.
  Ranking changes to score-first and never shows piece count.

The header uses the mode name plus neutral `结果 / Result` semantics; it never restates
the loss cause. One accent edge, the primary metric, the current leaderboard row, and
the primary action carry the mode color. Date and top-five history remain meaningful.
Unranked copy remains compact. No dot-separated summary sentence or decorative subtitle
is added.

Settings begins with Rules because it explains the current context before controls.
The leave confirmation places Return on the left and Stay on the right; Stay receives
initial focus. This makes visual position match risk while preserving arrow-key and
Enter operation.

### Puzzle completion as one transaction

Puzzle success is not inferred later from a dismissed modal. The finished Core snapshot
is converted immediately into one canonical progress update:

- add the level ID to the completed set;
- compare the operation count with the stored best and retain the lower value;
- persist one versioned snapshot;
- derive unlocks, gallery ticks/name color, hero best, and Settings record from that
  snapshot.

The canonical level ID is resolved from the finished snapshot and the currently mounted
Puzzle only when those identities agree. All fifty gallery entries are selectable in
the current product, so the retired progressive-frontier guard is not a completion
eligibility check: if Core successfully finishes the selected canonical level, that
achievement must be recorded. Invalid, mismatched, or non-Puzzle snapshots still fail
closed.

The update is idempotent, so React Strict Mode, duplicate terminal renders, or returning
before the next paint cannot erase or double-apply it. A completion with no previous
best is `first`; a lower move count is `record`; all other successes are `repeat`.
Storage reload and language change may re-render presentation but never recompute or
discard the achievement.

### Puzzle celebration

Puzzle success keeps a dedicated **violet-accent celebration** rather than sharing the
mode-loss ledger. The modal uses mineral white, a narrow violet-to-teal light edge, one
large success title, and the single meaningful figure `当前最优步数 / Current best`.
First completion says `恭喜你破解谜题 / Puzzle solved`; a new best says
`刷新个人纪录 / New personal best`; a repeat says `谜题已破解 / Puzzle solved`.
No eyebrow, line count, score, generic “run complete,” or duplicate “首次完成” detail
appears. The title flows directly to the best-step figure: no prism emblem,
constellation, or decorative particles appear above it.

Motion is short and bounded to the edge glow settling in `180 ms`; no decorative
fragments are emitted. `prefers-reduced-motion` renders the final edge without a
transition. Focus opens on Replay; Left/Right selects Replay or Back, Enter executes,
Escape returns to the library.

### Survival cave motion and geology

Survival's three countdown beats remain authoritative, but the presentation between
beats is continuous. At digit `3`, the first row translates upward from one row below
the well and eases into its canonical bottom position; digits `2` and `1` repeat the
same bounded motion while the already revealed shelf rises by the same one-cell
distance and the new row enters beneath it. Each beat spends `680 ms` on the rise and
`140 ms` on a restrained settle using `cubic-bezier(.22,.72,.28,1)`, then holds until
the next one-second beat. It never restarts within the same digit, bounces, or shakes
the camera. The digit remains visually stable. Reduced motion reveals each completed
row at its final position with no translation. Core still begins with the same
deterministic three bedrock rows; this is a Renderer mask/offset contract only.

Bedrock and falling stones share one **cold cave geology**:

- base faces are graphite/slate rather than brown, beige, or warm timber;
- every cell has two or three deterministic irregular planes rather than horizontal
  grain or a repeated brick seam;
- cracks are short and oblique, never row-spanning;
- permanent bedrock is darker and visually interlocked into one rising shelf;
- falling stones are one value step brighter, retain a complete readable outline,
  carry one sparse lower-edge dust trail while moving, and show the frozen one/two
  cell event height;
- rock planes, chips, pits, and fractures are derived deterministically and cached;
  they never use per-frame random geometry or enter the hot animation path;
- neither material changes collision geometry, board occupancy, line-clear behavior,
  warning timing, or the single-Canvas boundary.

The final visual proof must include one intermediate row-rise frame, all three completed
countdown beats, a one-stone fall, a two-stone fall, settled rock, and reduced motion.

### Local typography system

The wordmark remains the only use of **Playwrite NZ Basic**. All other text moves to a
language-aware four-role system selected from sources with explicit commercial
embedding permission:

- **Chinese body/UI — 文渊黑体 / WenYuan Sans Variable.** Use variable weights
  `420–720` for rules, controls, buttons, labels, and compact prose. Its mainland
  Chinese forms and broad coverage carry readability.
- **Chinese display — 得意黑 / Smiley Sans.** Use only for short Chinese display
  headings at `28 px` or larger, such as mode and key result titles. Its slanted
  construction must not appear in body copy, buttons, compact Settings headings,
  keyboard maps, numbers, or dense leaderboard rows.
- **English UI — Sora Variable.** Use `420–760`; its large x-height and open counters
  support compact application UI while remaining visually distinct from the wordmark.
- **Numbers — IBM Plex Mono.** Use for countdown digits, HUD values, ranks, timers,
  level numbers, dates, and scores with tabular numerals.

All four families are self-hosted. The build contains their original license notice;
no CDN or runtime request is permitted. CSS selects Chinese roles under
`:lang(zh-CN)` and English roles under `:lang(en)` rather than relying on incidental
fallback order. A missing display glyph falls back to 文渊黑体; a missing English glyph
falls back to Sora/WenYuan in that order. Loading must not change control sizes,
Puzzle-square geometry, result fit, or board alignment after `document.fonts.ready`.

Selection provenance is explicit rather than inferred from a font download:

- 文渊黑体 is the variable OFL family documented by
  [猫啃网](https://www.maoken.com/freefonts/28291.html) and its
  [upstream repository](https://github.com/takushun-wu/WenYuanFonts);
- 得意黑 is the OFL display face documented by
  [猫啃网](https://www.maoken.com/freefonts/17247.html) and
  [atelierAnchor](https://github.com/atelier-anchor/smiley-sans);
- Sora's UI purpose and OFL distribution are documented by its
  [upstream repository](https://github.com/sora-xor/sora-font), while
  [Fontsource](https://fontsource.org/fonts/sora/install) supplies the self-hosted
  variable package;
- IBM Plex Mono is distributed under OFL by
  [IBM](https://github.com/IBM/plex/blob/master/LICENSE.txt).

Every player-facing `返回模式 / Back to modes` label is replaced by
`返回首页 / Back to home`; historical documentation may retain old copy only as
provenance.

## 2026-07-31 Phase 9 direct re-open — clean entry, result ledger, and Puzzle gallery

The latest real-frame review reopens four presentation-only surfaces after the
navigation cascade repair. Two bounded read-only comparisons were completed before
source work: one traced countdown visibility and compared result-sheet hierarchies;
the other compared two-page Puzzle gallery layouts and transient home selection.
The accepted synthesis below supersedes the earlier Phase-9 `10×5 / 5×10` selector
composition, but does not change Puzzle definitions, order, progress, records, Core
timing, randomisation, or any mode rule.

### Countdown visibility

- `ready` is a pre-play presentation state. Core may retain its deterministic active
  piece and queue, but Renderer must draw and report no active cells, ghost cells,
  carrier overlay, or Next piece until `playing` begins.
- Survival digits `3 / 2 / 1` show only the digit plus exactly `1 / 2 / 3` canonical
  bedrock rows rising into place. The stable empty Next well may remain so the HUD
  does not reflow.
- The first `playing` frame restores active, ghost, carrier, and Next together. The
  gate is `state.status`, never a React timing flag, so no cross-frame leak is
  possible.

### Run-result ledger

- Classic, Survival, and Mutation use one compact **mineral result ledger** rather
  than the generic danger sheet. Mineral white remains the base; the current mode
  color appears only on a narrow top edge, principal values, current-run row, and
  primary action.
- The hierarchy is title and rank, two meaningful metrics, top-five leaderboard,
  then two actions. Dot-separated prose and ornamental subtitles are prohibited.
- Classic shows lines and score. Survival shows survival time and lines; pieces and
  bedrock rows are removed. Mutation shows lines and score. A ranked run does not
  repeat a separate `本局第 N 名 / This run · #N` label: its explicitly marked,
  mode-colored row in the leaderboard is the sole rank treatment. An unranked run
  still says `未进入前 5 / Outside the top 5`.
- Result leaderboard rows retain rank, meaningful mode metrics, date, and an explicit
  current-run mark. Puzzle success keeps its earned celebration surface and is not
  absorbed into the run ledger.
- `src/styles/result.css` is the only new result authority and loads after shared
  HUD/navigation layers. It must preserve two-button Left/Right + Enter behavior,
  Escape return, `44 px` targets, reduced motion, and compact landscape.

### Two-page Puzzle gallery

- The library is a **two-page Puzzle gallery**, not a fifty-cell dashboard. Page one
  contains `01–25`, page two `26–50`; each page is one functional `5×5` matrix with
  no page or panel scrolling.
- Every level node is a true square. The matrix is centered inside the catalogue
  instead of stretching its five rows to consume every available pixel; deliberate
  inter-node gaps keep the twenty-five controls readable rather than compressed into
  a worksheet.
- The connected gallery frame uses the full available row on compact viewports but
  caps at `740 px` on taller screens. The outer frame, not the square controls,
  contracts to remove structural empty space around the preview and matrix. Once
  contracted, it is vertically centered in the available content row so the whole
  selector does not cling to the top edge.
- Desktop and short landscape place a large deep-indigo live board preview on the
  left and the page controls plus matrix on the right. Portrait stacks the same two
  surfaces. The preview, localized level name, current best, and Start action form
  one connected hero surface.
- Puzzle keeps a distinct deep-indigo / restrained violet / warm-anchor language
  while reusing TetraMorph typography, mineral white, focus rings, and radii. Nodes
  show only centered number or completion tick; best count appears only in the hero.
  Hover never translates a first-row control beyond the clipped matrix, and selected
  nodes carry no ornamental corner squares without product meaning.
- The two range controls are a real tablist. Each page uses roving focus with
  Left/Right `±1`, Up/Down `±5`, Home/End, and Enter selection. Crossing `25/26`
  changes page without losing focus. Page change and preview settle within `180 ms`;
  reduced motion switches instantly.
- `src/styles/puzzle-library.css` is the final Puzzle-library authority, imported
  after `navigation.css`. Required frames are `1440×900`, `844×390`, `390×844`,
  and `360×800`, both pages, Chinese/English, selected/completed, longest-best copy,
  keyboard focus, and reduced motion.

### Transient home emphasis

- The initial home frame has zero active cards. Pointer emphasis is expressed only
  by real hover and disappears within one frame of leaving the mode region.
- Roving keyboard position remains independent of pointer hover. Tab/arrow focus
  keeps `:focus-visible`; pointer leave must not erase real keyboard focus.
- The permanent `mode-gate--active` / pressed-selection presentation is removed.
  Enter/click behavior, the two-by-two matrix, one wordmark, and stable font metrics
  remain unchanged.

### Source checkpoint

Checkpoints `2c1a13d..724e152` implement the gallery/home interaction contract without
changing any
Puzzle definition or progress data. The library now exposes two semantic tabs,
exactly twenty-five functional nodes per page, one canonical silhouette, one
localized name/best/Start hero, and page-aware `±1 / ±5 / Home / End` focus. Home
keeps roving keyboard focus but has no pointer-owned state, active class, pressed
attribute, or persistent selection data. Focused component/style proof is `48/48`
and typecheck is green. The first two-page frame pass is visually rejected because
its grid tracks stretch the nodes into tall rectangles and pack them too tightly.
Checkpoint `348209f` applies that presentation-only correction: every node owns a
`1 / 1` ratio, the five-row matrix centers instead of stretching, and the responsive
gaps are `12 px` desktop, `8 px` portrait, and `6 px` short landscape. Direct frame
measurement reports exact square controls at `95.02`, `46`, `64.8`, and `58.8 px`
for `1440×900`, `844×390`, `390×844`, and `360×800` respectively, with equal grid
client/scroll geometry and no page overflow. That recovery point was carried into
the final-candidate evidence below.

Independent review of evidence checkpoint `eae9a1f` accepts the square gallery and
home pointer behavior but rejects two adjacent presentation contracts. At
`844×390`, an unranked five-row result ledger clips its fifth row and both actions;
the short-landscape result must place summary and leaderboard side by side with the
two actions always visible and no internal scroll. The Puzzle range control is a
tablist, so Left/Right and Home/End on either tab must move focus and activate the
corresponding page; level-grid navigation remains separate.
The player's direct frame review additionally rejects the tall-screen outer frame:
the gallery must cap its height and fit its existing content rather than stretching
both columns to the full viewport.

Final correction range `51dd2fa..ba6bbb6` is the accepted implementation of this
contract. It fits the short-landscape ledger without internal scrolling, removes
the redundant result-rank sentence, supplies complete tablist keyboard behavior,
caps and vertically centers the gallery frame at `740 px`, preserves the complete
first-row hover border without node translation, and removes the selected-node
corner ornament. Final evidence `25cfebf` records square nodes and zero overflow at
all required viewports, staged countdown visibility, ranked/unranked ledgers,
pointer-leave and keyboard behavior, reduced motion, one Canvas, zero DOM board
cells, and zero console/page errors. Typecheck, `29 / 261` tests, and the
`756`-module production build pass; two independent read-only reviews accept with
no P0/P1/P2 finding.

## 2026-07-31 Phase 9 — cave pressure, quiet feedback, and compact navigation

The player's latest direct review opens four previously frozen presentation areas:
Survival falling stones and geology, the shared ordinary landing/line-clear response,
the fifty-level Puzzle selector, and the mode home. This Phase supersedes the
Phase-6R ordinary-clear visual rollback and the Phase-7/8 selector-composition freeze
only for the exact behaviors below. Puzzle definitions, routes, progression, records,
Mutation rules, score rules, audio, and the single-Canvas rendering boundary remain
frozen.

Three independent read-only design comparisons considered each area before source
work. Direct player review later rejected the warm/horizontal interpretation of the
first implementation. The corrected direction is one coherent slate-workbench
language:

- Survival uses a **cold slate cavern** treatment. Permanent bedrock and clearable
  falling stones share deterministic facets, chips, and short diagonal fractures
  while preserving exact cell silhouettes and seams. Bedrock is darker, denser, and
  older; falling stones are lighter fresh fracture. Long horizontal strata, warm
  brown wood tones, plank grain, and brick-wall repetition are explicitly rejected.
- Ordinary piece landing uses a **mineral imprint**: a short support-contact response
  under the cells that actually land. Ordinary line clearing uses **face release**:
  a centre-out sequence of restrained inset face blooms inside each real cleared
  cell. It draws no horizontal stroke or row band. Neither response may scale or
  displace cells, shake the well, flash the page, emit particles, or hide board state.
- Puzzle selection uses a **two-layer level bench**: a compact selected-level preview
  above one complete functional matrix. Desktop and short landscape use ten columns
  by five rows; portrait uses five columns by ten rows. All fifty levels must be
  visible without page or panel scrolling at the required viewports.
- The home uses one `TetraMorph` wordmark and a two-by-two mode matrix. The four
  entries form a functional O-tetromino-like composition through layout, not through
  copied trade dress or decorative grid lines. Selection strengthens the current
  mode color without changing CTA hue or animating font weight.

### Survival same-column stone-event contract

- Survival's normal piece cadence remains fixed at `40 ticks/cell`. Falling rock
  cadence becomes exactly `20 ticks/cell`, represented by integer Core state and
  therefore exactly two times normal Survival speed.
- Each event deterministically selects a height of one or two stones and exactly one
  column. Both choices are frozen when the two-second warning begins; a blocked event
  remains due with the same height and column and is never rerolled or redirected.
- One event has one identity. A one-stone event is one cell. A two-stone event is one
  vertically adjacent component: both cells share the selected column, move together,
  and settle in the same tick. If any required entry cell is blocked, no cell from
  that event spawns; partial entry is invalid.
- Every settled event cell becomes a clearable Survival stone cell and may complete
  an ordinary row. It does not become bedrock and does not alter the seven-bag.
- Pause advances nothing; restart clears active events, the frozen warning plan,
  timers, and accumulator. Clear mapping and bedrock movement must preserve one
  translation across every cell in an event; a nonuniform mapping fails closed.
- Warning, entry, flight, landing, clear, bedrock rise/lower, top-out, and state hash
  remain deterministic for a seed and command stream.

### Survival cavern presentation

- Board collision geometry remains a ten-column cell field. Coordinate-hashed
  variants may choose a small fixed set of facets, short diagonal cracks, chips, and
  pits; no per-frame random noise or external texture asset is allowed.
- Bedrock keeps visible seams and a darker compacted face. No horizontal layer line
  may cross a cell or continue into an adjacent cell.
- An airborne event is drawn as one rock component. A two-cell event has a shared
  perimeter and one internal fracture; a one-cell event keeps the same material
  grammar without a phantom second cell. Neither may resemble generic grey UI tiles.
- The warning is a top-edge fissure plus an exact one- or two-cell silhouette in the
  selected column, not a generic arrow. Flight uses only a short dust tail. Landing uses a
  local `120–160 ms` dust/contact response. Bedrock rise/lower uses only its newly
  exposed boundary; no full-board shake.
- Reduced motion keeps a static warning and final materials, removes interpolation
  and dust, and uses one instantaneous boundary emphasis.
- The deterministic three-row initial bedrock remains present in Core throughout the
  ready state. Renderer presentation masks it during the Survival entry countdown:
  digit `3` reveals the bottom row, digit `2` reveals the second, and digit `1`
  reveals the third. Each newly exposed row rises one cell into place over a short
  eased transition; reduced motion reveals the final row position immediately.

### Shared ordinary feedback contract

- Landing lasts at most six 60 Hz ticks (`100 ms`). It highlights actual support
  contacts and a restrained face response of at most twelve percent. A new landing
  replaces the previous landing response rather than queuing.
- Hard drop may add at most one short axial trace per occupied column, no more than
  four traces, for at most three ticks. Full-piece multi-layer ghost trails are
  rejected.
- A landing that starts a clear uses only fifty-five percent imprint strength and
  no hard-drop trace so the row response remains primary.
- Ordinary clearing completes its visible response in nine ticks (`150 ms`) inside
  the unchanged twelve-tick Core delay. Centre columns lead; every cell renders one
  fixed inset face bloom using that cell material. It uses fill-only rounded faces,
  no horizontal stroke or row band. Cells remain stationary, full size, and
  recognizable; particle count is zero.
- Survival falling-rock landing remains its own geology response. Mutation Bomb and
  Collapse remain their own effects. Puzzle anchors do not participate in the seam,
  and target ownership marks remain readable.
- Reduced motion shows a fixed contact imprint fading for four ticks and all ten
  clear faces fading together for six ticks. It does not remove feedback entirely.
- Undo, restart, screen exit, and renderer destruction clear every transient.

### Puzzle level-bench contract

- The selected preview becomes a compact horizontal bench containing the real board
  silhouette, level name/current best, and Start action. It may not consume half the
  viewport as an empty decorative well.
- The matrix groups levels `01–10`, `11–20`, `21–30`, `31–40`, and `41–50` as the
  real `3/4/5/6/7` target-row curriculum. Desktop/landscape use `10 × 5`; portrait
  uses `5 × 10`. A slightly larger gap between columns five and six may preserve the
  existing five-level unlock rhythm.
- Each level control is at least `44 × 44 px`. Ordinary nodes use mineral white and
  blue-grey edges; selected uses a solid Puzzle accent and visible outer focus;
  completed replaces its number with the existing centered tick. The best count
  appears only in the selected preview.
- Keyboard selection uses roving focus. On the ten-column matrix, Left/Right move
  one and Up/Down move ten; on the five-column matrix Up/Down move five. Enter
  selects, and the separate Start action launches the selected level.
- Selection uses only a `160–200 ms` preview crossfade/one-pixel settle. Reduced
  motion switches directly. No vertical or horizontal overflow is accepted at
  `1440×900`, `1280×720`, `2048×1152`, `844×390`, `390×844`, or `360×800`.
- The final home/selector component authority lives in
  `src/styles/navigation.css`, imported after semantic tokens and the existing
  mode/HUD layers. Historical rules in `styles.css` remain recovery context only;
  this slice must not add another late override block there.

### Home correction contract

- The page contains exactly one visible `TetraMorph` wordmark. The right side is a
  balanced two-by-two mode matrix with the existing four valid tetromino glyphs and
  mode colors; rules remain in first-entry/Settings rather than home cards.
- Pointer, focus, and arrow-key selection change only the selected card's surface,
  edge, and focus treatment. Text metrics and weight remain stable between cards.
- The real component styles load after semantic tokens so token bridge rules cannot
  silently override the accepted wordmark or mode composition.
- Desktop, portrait, and short landscape must keep all four entrances visible with
  `44 px` targets, visible keyboard focus, Enter activation, reduced-motion support,
  no duplicate name, and no meaningless copy.
- Every first-entry rules sheet uses a single localized title. Chinese joins the mode
  and `规则` without an inserted space (`生存规则`); English remains naturally spaced
  (`Survival Rules`). The redundant `首次进入说明 / First-time overview` subtitle and
  the repeated inner `规则 / Rules` heading are absent. The primary acknowledgement
  is `好的 / Got it`; the secondary action remains `返回 / Back`.
- Survival's concise rules state that every stone event randomly contains one or two
  clearable stones, all in the same random column, falling at two times normal
  Survival speed. No first-entry or Settings copy may claim a fixed pair.

## 2026-07-30 direct correction — ordinary line-clear rollback

The player's direct review rejects the Phase-6 three-stage ordinary line-clear
presentation. The shared ordinary clear returns to the pre-`1a163ff` visual baseline:
locked cells remain stationary and readable while a restrained, board-local centre-out
row sweep identifies the real cleared rows. The sweep completes within the existing
Core delay and is omitted for reduced motion.

This correction changes presentation only. It does not alter Core timing, row removal,
score, input, randomisation, Puzzle target ownership, or any mode rule. It also does not
roll back the later Classic landing/combo/speed/top-out cues, Survival pressure
feedback, or Mutation Bomb/Collapse/item effects. The rejected contraction, per-cell
dissolve, deterministic debris, and afterglow helpers/tests are removed instead of
being left as dormant alternate behavior.

### Final-gate fixture alignment

The ordinary-clear rollback does not absorb a Puzzle gameplay change. Its full suite
exposed test-only bindings that still replayed retired schema-6 routes after the
Phase-7 fifty-level boards replaced those layouts. The correction is limited to
current source-bound evidence:

- `puzzleRouteSearch.test.ts` exercises the current `01–10`, `11–20`, and `41–50`
  schema-7 artifacts;
- the browser QA specimen for `t5r-drift-08` replays that current level's frozen
  schema-7 primary route, and its direct test binds the fixture back to the artifact.

No level definition, queue, seed, solver rule, unlock rule, selector, target ownership,
or production Puzzle mechanic changes. Normal tests replay frozen routes; they do not
rerun the fifty-level solver.

## T15 phased refinement and fifty-level Puzzle contract

The current product pass follows one ordered sequence: design-system foundation,
Settings, live HUD/layout, Survival pressure, Mutation expression, Classic
micro-polish, then the fifty-level Puzzle curriculum. A later phase may consume the
tokens and primitives established by an earlier phase, but may not retroactively
change accepted game rules or hide a regression behind a broad visual rewrite.

The Puzzle selector keeps its present visual composition. Expanding the campaign may
adapt level count, selection data, unlock state, names, and records, but it may not
replace the selector with a new page design. The curriculum itself grows to fifty
deterministic authored levels and must progress from one clearly learnable construction
idea to combinations of earlier ideas. Every shipped level has at least one
Core-replayed solution, sensible fixed input, sparse solvability-safe anchors when
used, and a difficulty position supported by measured route features. Multiple
plausible routes are preferred; the player sees no route hint and no piece-count limit.

### T15 Phase 7 Puzzle-50 contract

Phase 7 opens from pushed recovery record
`d78e0e580ceb9375afb57fc8c4230624e4a54a77`. It replaces the current four
five-level presentation bands with fifty deterministic authored levels while preserving
the selector's one-preview/five-column composition. The right route becomes ten
five-level bands inside the same internally scrolling panel; target rows, unlock state,
names, completion and best-lock records are data-driven. The selector may not gain
level thumbnails, descriptive cards, decorative dots, per-level badges, a second preview
or a new page composition.

The curriculum uses exactly 3, 4, 5, 6 and 7 contiguous floor target rows for levels
`01–10`, `11–20`, `21–30`, `31–40` and `41–50`. Initial targets come only from a
legal five-to-fifteen-piece zero-clear setup replay. The first five levels contain no
anchor. Across the five ten-level batches, exactly 1, 2, 3, 3 and 0 levels respectively
carry sparse authored anchors; anchors remain outside every initial target row and
cannot move, clear or count toward victory. The first forty levels therefore distribute
nine immutable-anchor lessons instead of concentrating them at the end, while the
seven-row synthesis tier prioritizes multiple readable routes over another obstacle.
Timed disappearing pieces remain removed.

Every level ships with two public-command Core routes that clear all original targets.
The routes must diverge by a canonical landing no later than the fourth lock of the
shorter route. Solver output records locks, rotations, lateral work, line distribution,
height, holes, branching, divergence and anchor burden, but is never exposed as a hint
or claimed as mathematical optimality. Normal tests replay frozen routes instead of
rerunning fifty searches.

A fresh save opens `01–03`; any two open `04–05`; any three of `01–05` open
`06–10`; thereafter any three completions in a five-level band open the next band.
Progression advances only through an already-open frontier. A migrated out-of-order
completion remains replayable but cannot leapfrog unopened prerequisite bands. Locked
levels remain visible, disabled and unable to record completion.

Puzzle progress advances to v5 with a campaign revision. The old v4/v3/v2/v1 twenty-ID
domains remain frozen for parsing. Legal historical completion IDs migrate and write
back immediately; old keys remain untouched for rollback. Because the first twenty
boards are re-authored, old best-lock values remain historical in the old key and are
not misrepresented as current-board records. A v5 best is created only by actually
finishing the corresponding Phase-7 definition. Player-facing “操作数 / 当前最优步数”
continues to mean successfully locked tetrominoes, not input commands.

Phase 7 uses the updated dynamic resource budget. Static read-only comparisons may run
in parallel in the green state, while one writer owns each shared source slice and no
more than two heavy tasks overlap. Amber serializes new heavy work; red starts none.
Every solver, Node helper, browser and server is on-demand and released at its phase
boundary by verified ownership; WMI/CIM and name-only process termination are forbidden.

For the `21–30` five-row batch, route evidence fixes the authoring mix at seven
ten-drop ordinary boards plus three seven-drop one-anchor boards. Dense ten-, nine-,
and eight-drop anchor carriers all failed the same 24-lock, 600/480-beam public-Core
probe even when their anchor column was already full throughout the target band.
The sparser carrier is a solvability correction, not a reduced anchor quota or a
larger search allowance: every selected anchor package still needs two early-diverging
replayed routes at the unchanged bound before it can ship.

The `31–40` batch raises the target band to six rows and must turn earlier isolated
ideas into readable combinations: wells with staging shelves, offset channels,
bridges with recovery lanes, and controlled overhangs. Candidate generation therefore
uses separate ordinary and sparse-anchor pools rather than adding pegs to dense boards
after selection. Ordinary candidates may use 11–12 legal setup drops. A bounded 7/8-drop
anchor search produced no legal six-row board, while sampled ten-drop carriers could not
retain a route inside the fixed search domain after a headroom anchor was added. The
selected anchor carriers therefore use nine legal setup drops and place one consequential
anchor on an outer column already occupied throughout the six-row target band. Exactly
three selected levels retain one headroom anchor, and every selected board still needs
two public-Core routes diverging by lock four.
The six-row batch uses a fixed 30-lock, 600/480-beam verification ceiling; that larger
lock allowance reflects the extra target row and is not raised again for an individual
failure. Final ordering is based on replayed route features within the six-row band,
then reviewed for a clear structural lesson rather than sorted by a single scalar.
The retained lesson order is `曲井 / 左闸 / 错桥 / 阶井 / 悬台 / 右闸 / 双廊 /
回井 / 边塔 / 折桥` (`Bent Well / Left Gate / Offset Bridge / Stepped Well /
Hanging Shelf / Right Gate / Twin Channel / Loop Well / Edge Tower / Bent Bridge`).
The seven ordinary packages rise by shorter-route locks `11, 15, 16, 18, 19, 19,
21`. Three nine-drop anchor checkpoints remain deliberately distributed at positions
32, 36 and 39 rather than clustered by their shorter 8–9-lock solutions: their lower
cell count is not evidence that an immutable edge constraint is an easier lesson.
Every setup history, gameplay seed and anchor travels as one complete package when
ordered; no route is rebound to a different random sequence.

The `41–50` batch is the seven-row synthesis tier. It must combine earlier wells,
shelves, channels, delayed clears and recovery space into boards that remain readable
as constructions rather than random rubble. The final retained set contains ten
ordinary 14/15-drop packages. A 12/13-drop anchor pool, a dedicated 11-drop pass,
bounded topology/seed probes and two deterministic 10-drop smoke pairs produced no
two-route anchor package suitable for this tier. The measured correction removes
anchors from `41–50` rather than weakening the two-route rule or hiding a solver-only
opening in the hardest levels.

Every package still needs two public-Core routes diverging by lock four at the fixed
36-lock, 720-primary and 560-alternate beam ceiling. No individual failure may expand
that search domain. Final order and concise bilingual names are assigned only after route
metrics and human-readable structural lessons are inspected together; raw setup score
or route length alone does not define the curriculum. The measured order is `横沟 /
Cross Trench`, `中阶 / Center Steps`, `分廊 / Split Gallery`, `双塔 / Twin Towers`,
`斜廊 / Sloped Gallery`, `边井 / Edge Well`, `深槽 / Deep Channel`, `断槽 / Broken
Channel`, `叠井 / Layered Well`, and `岔口 / Forked Passage`. Their primary/alternate
route lengths are respectively `16/16`, `17/20`, `17/20`, `19/21`, `22/26`, `23/24`,
`27/23`, `24/24`, `25/25`, and `25/29` locks, with first canonical divergence at locks
`3, 1, 1, 1, 2, 2, 1, 1, 1, 1`. `深槽` alone uses a 15-drop setup; the other nine
packages use 14 drops.

Mutation items are an orthogonal attachment system:

| Ordinary body | Allowed attachments |
| --- | --- |
| `I`, `O`, `T`, `S`, `Z`, `J`, `L` | Ice (`freeze`), Collapse, Bomb, or Multiplier |

No piece shape, base colour, queue slot, or material may imply a fixed item. Rendering
first preserves the ordinary body and then adds the item's core, exposed-edge rim,
surface treatment, and local energy response. Active, locked, and immediate-Next
carriers share this grammar. The independent carrier RNG and ordinary seven-bag remain
separate; preview is pure and must equal the next spawned carrier. Direct regression
coverage retains every one of the twenty-eight body/attachment pairs throughout the
later Ice, Collapse, Bomb, and Multiplier redesign. The player-facing Chinese name is
`冰冻`; `冻结` is retired. The internal `freeze` key and English `Freeze` may remain so
this presentation correction does not force a persistence/schema migration.

Ice does not stop the active piece. During its ten game seconds, automatic gravity is
fixed at one second per cell (60 fixed ticks at 60 Hz); direct movement, rotation, soft
drop, and hard drop remain available. A repeated Ice carrier resets the remaining
duration to exactly ten seconds. On expiry, Mutation returns to its current normal
cadence, whose non-Ice floor remains 0.1 seconds per cell.

Visible refinement targets remain mode-specific. Settings must become compact without
structural blank space; the live board must dominate the HUD; Survival exposes one
coherent, fair pressure model; Mutation expands its status surface only for active
effects and gives Ice/Collapse substantially stronger board atmosphere; Classic
keeps its rule purity. All phases keep one Pixi canvas, keyboard/touch accessibility,
bilingual layout, reduced-motion endpoints, deterministic Core behavior, and bounded
render/audio lifecycle.

Attachment recognition may not depend on hue alone. Active, locked, and immediate-Next
carriers preserve the ordinary tetromino body while four item families receive different
core silhouettes, exposed-edge shapes, surface textures, static marks, and local motion.
At least three non-colour cues differ between each family. A player must be able to
judge both carrier presence and item identity within 100 ms in normal colour, grayscale,
and reduced-motion endpoints.

Collapse never draws a ten-cell-wide horizontal band at the board top or through the
well. Its active field is expressed by column-local lensing, compressed vertical guide
lines, falling motes, and a short settlement pulse bound to the columns that actually
move. A continuous horizontal effect wider than 80% of the well is a visual regression.

Phase 6 owns the shared ordinary line-clear presentation. Cleared rows receive one
coherent three-part signature: first a vertically narrow row-local confirmation light,
then the existing cells contract slightly toward the row centre while dissolving, and
finally a small deterministic debris/afterglow endpoint remains at those exact rows.
The complete presentation fits inside the existing 12-tick Core clear delay; it never
adds renderer-owned waiting. One through four lines retain the same geometry and timing
while only alpha, contraction distance, and debris count rise within bounded limits.
No primitive may span the full screen or escape the Pixi well.

At the first frame, the locked cells still read as their real materials. During the
middle stage each cell remains recognisable and moves by less than one quarter-cell;
at the endpoint it leaves a faint residual silhouette until Core performs the canonical
row removal. The next decision, HUD, and input stay unobscured. Reduced motion disables
cell translation, scaling, and debris and instead holds a stationary thin confirmation
at each cleared row with a quick opacity fade. Mutation Bomb and Collapse keep their
own Phase-5 presentation and do not reuse this ordinary-clear grammar.

The Phase-6 baseline feedback is board-local and event-specific. A normal Classic
lock leaves a short contact echo directly beneath the cells that reached support;
it does not shake, translate, or scale the board. A consecutive Classic clear adds
paired short side brackets at the resolved row positions, with repetition capped at
three marks so the signal strengthens without becoming a banner. Crossing a ten-line
speed boundary adds a brief pair of descending rail ticks inside the well edges. A
Classic top-out closes the spawn zone with four short corner marks over the existing
terminal scrim. These cues may coexist, remain clipped to the well, contain no text,
and never change Core timing, input, score, or the next-piece presentation.

Reduced motion keeps the same event locations but removes travel, expansion, particles,
and repeated oscillation: contact echoes, combo brackets, speed ticks, and top-out
corners become stationary strokes with a short opacity fade. The cues are renderer
state with bounded lifetimes and are cleared by restart/unmount. They apply only to
Classic in this checkpoint; Survival pressure, Mutation activation, Puzzle feedback,
React copy, HUD structure, and audio remain frozen.

Phase 5 is independently accepted, pushed, and cleaned through `4f871ac`. Phase 6
rules, visual, and evidence-integrity QA independently accept corrected product
`9085976` with P0–P3/GAP all zero, and the coordinator accepts the complete Phase-6
claim. Recovery point `d0b7406` is pushed with exact local/tracking/remote equality.
The fifty-level Puzzle contract may now open in its own documentation checkpoint; its
selector composition is not a Phase-6 target.

## Phase 1 — TetraMorph Design System v1.0

**Scope:** a foundation pass only. It centralises the existing interface language
without redesigning any page, changing layout, rebuilding Settings, changing a board
material, or adding new interaction or animation. It builds on the accepted T14
Mutation baseline without reopening that mechanic.

| System | Contract |
| --- | --- |
| Brand | `TetraMorph` alone uses Playwrite NZ Basic at its authored maximum 400 weight plus a restrained local stroke; no UI label may use the display face and no nonexistent 700 face may trigger fallback. |
| Interface | Locally bundled Space Grotesk Variable at 500/600/700 for English UI; Chinese resolves locally bundled Noto Sans SC Variable → PingFang SC → Microsoft YaHei. |
| Data | Locally bundled JetBrains Mono Variable carries scores, times, lines, countdowns, and compact key/value data. |
| Type scale | Display 28/700; heading 24/700; card title 14/600; value 24/700; body 14/500; caption 12/500. |
| Base palette | Background `#DCE7F1`; surface `#F8FAFC`; secondary surface `#EDF3F7`; border `#C4D4DF`; primary text `#102A43`; readable secondary text `#52677F`; soft non-body accent `#627D98`; board `#071522`. |
| Mode accents | Classic `#31978D`; Survival `#5878C4`; Mutation `#C77A35`; Puzzle `#8A63B3`. |
| Cards | Level 1: 16 px radius / 1 px border; level 2: 10 px radius / 16 px padding; level 3: 6 px radius. Four nested card levels are prohibited. |
| Buttons | Primary: 40 px visual height, 8 px radius, 14/600; secondary: transparent with 1 px border; icon: 36 × 36 px / 8 px radius. Existing 44 px touch-safe hit targets remain authoritative. |
| Motion | Hover 120 ms ease-out; press 80 ms; modal 220 ms; page 300 ms. These are tokens only in Phase 1, not a request to add animation. |

The renderer's shell palette resolves through the same colour contract, but ordinary
tetromino materials, Survival bedrock, stones, Puzzle anchors, and all Mutation VFX
palettes remain their independently accepted materials. The visible board field stays
the established deep navy `#071522`.

Phase 1 is accepted in two bounded parts rather than by mechanically replacing every
literal in the legacy stylesheet. Phase 1A establishes the typed/CSS vocabulary,
adopts colour and role fonts, and fixes accessibility. Phase 1B bundles the exact
Noto Sans SC variable face locally and closes the dependency lock. Component token
consumption is then verified where it has semantic context: Settings in Phase 2 and
the live HUD/cards/buttons in Phase 3. Those phases may not introduce a new arbitrary
size, radius, colour, or duration when an established token expresses the intent.

All implementation phases use one writer plus two independent read-only auditors.
The code/rules auditor compares the exact base-to-candidate range and deterministic
contracts; the target/visual auditor compares the candidate against this design
contract at every required viewport. P0/P1 findings and user-request-relevant P2
findings return to the original writer. QA never edits production paths.
The coordinator-owned phase matrix assigns the writer and both auditors before source
work begins. A corrected candidate always receives both audits again. Only a
coordinator-accepted phase may be pushed, and every accepted push is retained as the
remote recovery point for the next phase.

## Phase 2 — Settings as one connected instrument

**Status:** contract frozen at recovery base `fd26652`; source work has not started.
The prior two-card layout left an empty quadrant when Controls and Keyboard had
different heights. Its emergency horizontal replacement filled width by reducing
type and controls below the product scale. Both outcomes are rejected. Phase 2 uses
one 800 px maximum-width, natural-height, scroll-contained console with four ordered
bands: Controls, Keyboard, Rules, Records.

- **Controls.** A 52 px section rail identifies the band. Desktop places language,
  sound/volume, and the compact two-button run action together without making Restart
  and Continue span the sheet. It wraps before collision; 44 px targets and the
  design-system type scale do not shrink. There is no music control.
- **Keyboard.** Gameplay precedes Shortcuts. The two groups stack naturally, and each
  group uses exactly two columns of key/meaning pairs. Ordinary Gameplay fills 2 × 2;
  Puzzle's fifth `Z` pair spans the final row. Seven Shortcuts finish with Enter
  spanning the final row. This is a readable reference, not four scattered columns.
- **Rules.** Rules are typed facts rather than localized strings parsed by punctuation.
  Only real facts render. Three Classic facts fill three columns; four-fact modes use
  2 × 2; below 680 px they become one column. The layout may wrap text but may not
  reduce body copy below 12 px or create a fourth placeholder for Classic.
- **Records.** Records are always last. Ordinary modes render zero to five actual rows;
  empty state is one compact row. Survival exposes only time, lines, and date. Puzzle
  uses one current-level best strip and never mounts a hidden leaderboard.
- **Geometry and motion.** Direct child bands share one surface, zero inter-band gap,
  one-pixel dividers, 12 × 16 px section padding, 10 px outer radius, and no fixed
  height, equal-height stretch, or `space-between`. A short viewport scrolls the
  sheet's content. Reduced motion changes no geometry.
- **Input and lifecycle.** Settings controls declare semantic row/column positions.
  Horizontal arrows stay within a row; vertical arrows choose the nearest column in
  the adjacent row; range arrows remain native. Opening any sheet during entry
  countdown freezes the displayed digit and input-ready transition until the sheet
  chain closes. Existing modal focus handoff and same-Canvas restoration remain
  unchanged.

This phase may edit only the bounded App, direct App test, localization, coordinate
navigation branch, and Settings CSS paths named in `docs/CURRENT_TASK.md`. It may not
redesign the Puzzle selector or change gameplay, records, audio, dependencies, or
renderer ownership.

## Phase 3 — stable live HUD accepted and pushed

**Status:** final candidate `741d8a6` and acceptance/recovery record `1383fca` are
pushed to `origin/main`. The shared board/HUD topology now holds across
Classic, Survival, Mutation, and Puzzle at desktop, portrait, short landscape, and
wide compact viewports. Statistics, optional Mutation status, and Next use one
stable information hierarchy; Puzzle keeps one well with two complete `1` / `2`
forecast rows.

The Canvas remains the sole board renderer and is also the authoritative keyboard,
mouse-focus, and touch surface. A transparent board-bounded interaction layer receives
tap, horizontal swipe, downward swipe, and cancellation without changing Core
coordinates or creating a DOM grid. Spawn containment is presentation-only. The final
candidate preserves bilingual accessible names, 12 px minimum HUD text, 44 px header
targets, one Canvas, reduced-motion countdown endpoints, and zero layout overflow.
The Puzzle selector composition, mode rules, materials, and later Phase-4/5/6 effects
remain outside this acceptance.

## Phase 4 — Survival pressure accepted and pushed

**Status:** source/test candidate `2af2adf` and corrected evidence `993dfc7` are
accepted by the repeated rules, visual, and UI/evidence audits with no P0–P2. The
writer record, clock field, direct scoring assertion, candidate binding, raw gates,
English surface, and full lifecycle proof all pass. The only P3s are a complete but
awkward Chinese label wrap and a static Settings frame whose modal hides the frozen
digit while the scripted/JSON `3→3` assertion proves it. Acceptance/recovery record
`fd7ef8d` is pushed to `origin/main`; Phase 5 may build only from that boundary.
Survival opens with three rows of the accepted brown square bedrock material. Its
bedrock-rise clock decreases from 13 seconds to a 6-second floor, while every three
cleared lines removes one existing bedrock row. Ordinary pieces retain the accepted
fixed Survival cadence.

An independent stone clock starts at 20 seconds and decreases by one second after each
event to a 10-second floor. Exactly two playing seconds before an event, Core selects
one or two unique columns from a deterministic RNG stream that is isolated from the
ordinary seven-bag. The selected columns become canonical state, enter the replay/hash
domain, and drive both warning and spawn. If every warned entry cell is blocked at
expiry, the event stays due with its warning intact until one of those columns can
accept a stone; it is never silently skipped or redirected. Stones descend
independently at approximately 1.5× the ordinary piece speed, become clearable board
cells, and may either obstruct play or complete a scored line. Reduced motion replaces
travelling warning motion with the same static column endpoint.

The live Survival rail keeps the accepted four-card topology: elapsed time, cleared
lines, current bedrock count plus rise clock, and the independent stone clock. This
places the endurance metric and both threats above score without adding a fifth blank
or wrapping card. The local leaderboard persists a mode-discriminated v8 Survival row
containing only elapsed ticks, lines, completion date, and required schema metadata;
v7 migration deliberately discards Survival score, piece count, and chain.

Core timing/RNG, Pixi stone presentation, DOM pressure readout, and persistence schema
are separate checkpoints. Existing brown bedrock and slate stone materials remain
unchanged. Acceptance must prove deterministic replay, pause/restart and top-out
ordering, stored warning/spawn agreement, blocked-entry deferral, stone-assisted
clears, 13→6 and 20→10 boundaries, one-to-two stone events, records containing only
survival time/lines/date, responsive readability, one Canvas, zero DOM cells, no
leaks, and independent rules plus visual review.

## T14 Mutation VFX polish — accepted historical contract

The design authority is `docs/MUTATION_VFX_POLISH.md`, derived from the user-provided
VFX brief. Mutation keeps its original mechanical contract and is presented as a
contained **deep-space crystal instrument** inside the existing one-canvas board:
deep navy field, high-separation cyan/violet/ember/gold material language, and short
event-bound feedback. It must feel specific without imitating any commercial game's
logo, UI, soundtrack, assets, or trade dress. Player feedback authorizes a Mutation-only
6-tick / 0.1-second-per-cell gravity floor; it does not reopen any other mode's cadence.

The renderer owns all board effects through its existing Pixi layers and a bounded,
reused logical particle pool. A small timeline primitive owns phase sequencing so
visual time is not scattered through browser timers. The target states are: crystalline
Freeze with edge frost/refraction/snow; gravitational Collapse with a vertical pull
field and 120 ms settlement; staged Bomb warning/impact/shockwave/fragments; and
golden Multiplier score-light/floating value. Every item is an **attachment** to an
ordinary I/O/T/S/Z/J/L body rather than a replacement piece colour, so any shape can
carry any item and the immediate Next preview can communicate both identities. The rail
remains DOM information only and
uses a compact accessible Mutation Card. Existing Core timing, scoring, carrier
semantics, and state are intentionally unchanged except for that explicit Mutation
cadence floor. The visual layer gets a pure deterministic lookahead for the immediate
Next carrier, and its transient activation timeline is a FIFO so a single Core transition
can never overwrite a prior item effect. Reduced motion renders an informative static
endpoint.

### T15 Phase 5 baseline correction

The `fae3c96` three-way baseline audit found that the historical T14 presentation is
not yet the active Phase-5 target. Mutation item assignment currently consumes the
ordinary seven-bag stream; Ice stops gravity instead of imposing one-second cells;
Collapse recomputes settlement metadata and still presents broad top/bottom bands;
Bomb particles begin before impact; 2×/4× persistent fields collapse into the same
visual endpoint; and changing reduced-motion preference clears queued feedback.

Phase 5 therefore introduces a separate deterministic attachment RNG, keeps its pure
Next prediction aligned with the eventual body-plus-attachment spawn, and gives Ice a
60-tick gravity interval while preserving manual controls. Collapse Core shares one
column-compaction mapping with carrier settlement, while the renderer binds wells,
compression, refraction, motes, and final settling only to columns whose cells move.
No continuous horizontal primitive may span 80% of the board width. Bomb warning,
impact, shockwave, and fragments are temporally distinct; Multiplier retains explicit
2×/4× intensity in full and reduced motion. A runtime accessibility change preserves
the transient FIFO and converts the current effect to a readable bounded endpoint.

The Mutation rail is content-sized: no active timer means no status surface at all, so
the compact HUD keeps the ordinary two-column statistics/Next topology. Active timers
alone open one third status instrument and create only their own tracks with identity,
remaining time, and a semantic progress value; one, two, or three states never reserve
empty placeholder rows or columns. Chinese uses `冰冻`; Next accessibility names both
the ordinary body and its attachment or absence. Same-transition announcements retain
FIFO order rather than reporting only the last event.

Final Phase-5 browser evidence owns its local Vite process and starts it only after the
clean product tree is bound to the declared source SHA; attaching to an unknown process
on a familiar port is not source attribution. The DEV renderer snapshot may expose
read-only activation observability — current item, elapsed/duration, queued count,
active-particle count, and Collapse settlement columns — but may not mutate or bypass
Core or visual state. FIFO order and visual identity are two complementary proofs:
an observer installed before unrelated captures records every renderer-owned current /
queue transition through the complete fixed witness, including the 300 ms Collapse
case, while the four item-specific activation PNGs prove their visible endpoints.
For adjacent equal item labels, a shorter queue alone is not an instance boundary:
the observer must also see that activation elapsed time resets while duration remains
valid, so silently dropping one equal-labelled request cannot masquerade as delivery.
The evidence must not require one full-viewport PNG to begin and finish inside the
shortest activation window; that couples screenshot encoding latency to a correctness
claim and can reject a valid FIFO after the PNG has already captured. Evidence still
labels every activation frame from renderer state, captures Bomb after its real impact
boundary, captures each of the four activation endpoints again under reduced motion,
and binds one visible Collapse settlement frame to non-empty actual moved columns and
its maximum drop. SwiftShader can spend longer than the complete 260 ms Collapse
settlement lifetime in a DevTools screenshot even when capture starts in the first
quarter. A live diagnostic also proves that `drawImage` from the presented WebGL
Canvas is transparent because production correctly does not retain its drawing
buffer. Transient evidence therefore uses Pixi's read-only `ExtractSystem` to render
the current stage's exact board frame into a temporary in-memory 2D surface and encode
it synchronously in the page main thread. Renderer state is sampled immediately before
and after that extract inside the same JavaScript turn, so rAF cannot advance between
the state witness and pixels.
The result must include the CSS board bounds, source-pixel crop, PNG dimensions, a
nonblank pixel probe, file hash, and same-instance activation/trail witness. The
temporary 2D surface is never mounted and does not create a second gameplay canvas.
The export is exposed only through the DEV QA surface, is directly tested as
state-preserving, and may not enable `preserveDrawingBuffer`, pause the renderer or
retain the extracted Canvas.
Full-page Playwright screenshots remain authoritative for persistent HUD, responsive,
language and status layouts. It repeats mount/unmount twice against a home-screen
listener/RAF/audio baseline. A renderer microbenchmark alone does not prove 60 FPS; real
`requestAnimationFrame` mean and p95 are separately bounded. That acceptance sample
must use the machine's production hardware WebGL backend, record its unmasked
renderer/vendor, and fail if it resolves to SwiftShader, llvmpipe, or another software
renderer. A separate SwiftShader diagnostic may test fail-closed capture behavior, but
its compositor cadence is not a product 60 FPS measurement. The evidence run starts
from a fresh partial set, verifies its exact manifest file set, and publishes
`SHA256SUMS.txt` only after data and manifest are present. Text artifacts in this exact
Phase-5 evidence directory are pinned to LF so Windows `core.autocrlf` cannot invalidate
their committed hashes; this scoped attribute may not alter product-source EOL policy.

The one-state HUD proof is state-based, not tied to one particular stack's expiry
shape. Recollecting effects can refresh multiple deterministic ten-second timers in the
same Core transition, so a legitimate three-state stack may later move directly from
three rows to zero. The evidence harness first preserves and passes the complete
three-state responsive, English, reduced-motion and performance workload. It then
advances the real frozen Core clock tick-by-tick. If that stack expires without a
one-state suffix, the harness continues the same fixed-seed ordinary autoplay until a
real single timed effect is awarded and captures the actual rendered HUD. This fallback
has a finite fail-closed bound and may not inject state, alter a timer, change the seed,
or replace the already-completed three-state performance claim.

Lifecycle equality is sampled at equivalent stable active-game frame boundaries.
Restart intentionally schedules two nested rAF callbacks to restore Canvas focus. A
snapshot taken immediately when Core reports `playing` can therefore include one or
both finite focus frames even though neither is leaked. Before comparing first mount,
pre-restart, post-restart, or second mount, the harness awaits the same two real rAF
boundaries and then requires exact equality of all still-pending frames, global
listeners, Canvas count/identity, and open audio contexts. It never subtracts expected
focus frames or permits a tolerance. Unmount still returns exactly to the pre-game home
baseline, so a surviving frame remains a failure.
The two-boundary wait is itself fail-closed: a 2,000 ms browser timer rejects if both
rAF callbacks do not complete, and is cleared only after the second callback runs.
Timeout never produces a lifecycle snapshot or permits publication.

The home listener baseline is sampled only after Playwright has completed one stable
home-selector readiness probe. A raw post-navigation evaluation contains four
page-owned listeners before Playwright installs its actionability instrumentation;
comparing that pre-probe map to a post-interaction unmount is a probe-order error.
Hardware diagnosis and the already accepted Phase-4 evidence both show the stable
instrumented sequence `17 → 28 → 17 → 28 → 17`: Mutation contributes input,
visibility, resize, Pixi pointer-move and a second pointer-up listener, and unmount
removes all of them while closing audio and clearing rAF/Canvas/QA. Phase 5 mirrors
Phase 4 by waiting for the existing Mutation entry selector before sampling the
original home baseline, then requires exact map equality after both unmounts. It does
not warm the baseline with a game mount, filter listeners, subtract a fixed count, or
introduce tolerance.

The listener-aligned Phase-5 hardware batch was captured atomically from documentation
head `bdf4e20` while product `ee2aac5`, final gates `6d9fc6a`, and harness `45e7cfc`
remained frozen. Browser-raw `9fa98a2` contains 34 unique final PNGs plus the two
managed Vite logs; browser-index `013120a` contains the source-bound manifest and
checksum completion marker. Hardware WebGL2, exact four-item carrier coverage,
ordinary/reduced activation endpoints, real Collapse columns, FIFO ordering,
responsive one/two/three-status layouts, sub-frame timing, and the complete
`17 → 28 → 17 → 28 → 17` listener lifecycle are present. Coordinator inspection also
records that narrow three-status layouts use ellipsis for long values and labels
without clipping or structural overflow; independent visual QA, not the capture
coordinator, decides whether that presentation is acceptable.

Phase 5 is accepted on that frozen boundary. Independent rules and evidence reviews
report P0–P3/GAP zero; visual review reports P0–P2/GAP zero and one retained P3 for
narrow ellipsis of long score/status text. The P3 does not remove the item symbol,
material, progress or seconds and therefore does not obscure required Mutation
identity or duration. Acceptance `321ebc6` is pushed non-force to `origin/main` with
verified local/remote equality. Phase 6 and the fifty-level Puzzle target remain
closed, and execution pauses rather than opening a new writer path.

Phase-5 evidence is also resource-bound. Its coordinator, any independent reviewer,
and the managed browser are never concurrent: review turns are serialized, and no
browser, Vite, test, build, or diagnostic tree overlaps another heavy tree. Optional
MCP, Serena, language-server, and browser helpers are lifecycle-scoped and released
between checkpoints. Admission is lease-based rather than count-based: one lightweight
PDH snapshot establishes current headroom, then one declared owner controls one heavy
process tree with named command, children, listeners, temporary paths, completion
condition, and cleanup proof. A new lease cannot coexist with or start before release
of the previous lease. Normal admission still expects CPU below 60%, at least 6 GiB
available physical memory, committed memory at most 75%, disk queue at most 1.0, and a
clean process/listener/partial baseline, but must not loop over a fixed number of
samples to wait for a favourable reading. Resource inspection must not invoke WMI/CIM
because the inspection itself can create sustained provider load; use PDH, native
process ownership, `Get-Process`, and `netstat`. At 90% sustained CPU, stop admission
and release only verified project-owned children. System/security services and the
shared Codex app runtime are never cleanup targets.

## T13.16 Modal compositor integrity

**Status:** accepted at source `5ab9e7d` after independent code/rules, target/visual,
and evidence-integrity review. The live Pixi board remains visible and dimmed behind
every live-game sheet, but its WebGL layer never paints over the opaque Settings,
pause, restart, exit, or Puzzle-result surface. The pre-session first-entry sheet has
no Canvas and instead layers over the mode page. Live sessions retain the same one
canvas; copy, metrics, panel geometry, and Core state remain unchanged. Acceptance is
bound to the exact-SHA 20-case browser matrix and 18-case pixel audit rather than DOM
hit testing alone.

An ActionSheet-to-ActionSheet replacement is one modal ownership handoff. The outgoing
sheet may restore its saved trigger only when no successor `aria-modal` dialog exists.
If a successor is already mounted, its autofocus/focus trap owns the keyboard context;
an older delayed cleanup must not steal focus back to the canvas or retired trigger.
Only closing the final sheet restores the original focus route.

If a replacement sheet closes back to gameplay after its predecessor trigger has been
detached, the owning UI transaction must restore the stable game-canvas focus target
explicitly. It may not depend on a detached button, `body`, a fixed delay, or whichever
sheet cleanup happens last. Direct and production-browser coverage must exercise both
successor acquisition and the final cancel/close endpoint after queued animation frames.
If that cancellation returns to a still-paused run, the remounted Pause sheet—not the
Canvas—owns focus; board restoration is permitted only when the transaction actually
returns to playing with no successor modal.

## T13.15 Puzzle completion ceremony and Survival geology

**Status:** accepted after independent QA `4b0938d`. T13.14's mechanics and accepted
visual evidence remain the baseline. This pass does not change Core simulation,
campaign content, puzzle best-record semantics, or Survival debris; it gives two
currently flat visual outcomes a stronger original finish.

- **Puzzle completion ceremony.** A successful Puzzle result is an earned resolution,
  not the generic `原有方块已清除` termination sheet. It holds one compact deep-mineral
  field with four small rising tetromino fragments and a short radial trace—an original
  “assembled signal” gesture, not confetti or a commercial victory screen. The first
  finish says **恭喜你破解谜题** and makes the first-clear state unmistakable. A strict
  lower piece count says **新的个人纪录** and compares the old and new counts. A later
  non-record finish says **谜题再次破解** and retains the saved best without claiming a
  record. The ceremony omits the generic `首次完成 · X 步 · Y 消行` run-stat line; the
  level name, ordinal, route, anchor, and solution remain absent. The familiar **重来**
  and **返回关卡库** actions stay in their existing
  order and retain arrow/Enter/focus behavior. Motion lasts under 700 ms, is bounded
  inside the sheet, and resolves to a fully informative static frame under reduced
  motion.
- **Survival bedrock.** Permanent bedrock retains the approved brown raised-block
  material. It is intentionally a stable game-board unit rather than a simulated rock
  texture, fractured silhouette, or continuous shelf. Clearable falling stones stay
  separate, smaller-looking, and lighter/slate-coloured so their danger / opportunity
  role is legible at a glance. No texture asset, external art, filter, or gameplay-state
  exception is introduced.
- **Verification direction.** Browser evidence must visibly prove all three Puzzle
  completion states, reduced-motion stillness, and the established three-row brown
  bedrock at desktop and compact size. App tests freeze the outcome classification
  before progress persistence writes.

## T13.14 direct gameplay clarity, Mutation feedback, and Survival debris pass

**Status:** accepted. Player review correctly rejected the first reopened Settings
attempt `fe6db5f..7ab0886` for its structural empty quadrant, and the second correction
for its cramped full-width stack and nested forecast cards. Those attempts remain
diagnostic history only. The final range `e9db541..0bb2ba9` establishes a connected
upper Settings console and one ordinary dark Next well with two plain numbered rows;
source `866ef0a` uses readable loaded JetBrains Mono digits in place of the malformed
hand-drawn marker. Final coordinator gates passed typecheck, 22 files / 165 tests, and
the 746-module build; fresh desktop, short-landscape, portrait, and reduced-motion
evidence passed. Independent QA `b60511e` accepts the full corrective range with no
P0–P2 finding. T13.13 remains accepted historical evidence, but its additive item-
timer and music decisions are superseded wherever they conflict with this section.

- **Puzzle selector completion token.** The centred numeral/tick replacement is an
  already accepted baseline and is outside this pass. It remains frozen: a level card
  has exactly one centred state token, with a completed card replacing (not supplementing)
  its two-digit numeral using one centred accessible SVG tick.
- **Entry, Settings, rail, and language.** Restore the visible 3 → 2 → 1 entry
  countdown and its board overlay. Recompose Settings into a compact, intentionally
  filled sheet in its established order: controls, keyboard, rules, then records.
  Survival record rows show only survival duration and cleared lines. Puzzle removes
  the redundant `通关目标` label and names its counter `操作数`; its forecast uses one
  ordinary two-row Next well with a plain `1` / `2` marker on the left of each upcoming
  piece, rather than a floating `②`. Classic and 异变 call their gravity metric `下落速度/格` (and use the
  matching English unit). The page wordmark remains the only decorative display face;
  all other visible typography must be deliberately readable, stable, bilingual, and
  more expressive through original weight, spacing, hierarchy, and data treatment—not
  through transient synthetic bolding.
  Settings uses a connected upper console rather than a visually balanced but empty
  two-column poster or a full-width stack of microtype: controls and keyboard share an
  aligned first row as sections of the same surface, while concise rules and the useful
  record strip follow as content-sized bands. There is no detached unequal card,
  expanded spacer, stretched grid track, or forced microscopic copy. An empty
  leaderboard uses a short useful state row instead of an enlarged blank card. Desktop,
  Chinese/English, and compact portrait/landscape preserve the same
  no-structural-whitespace principle. A modal is an interruption,
  not a scene replacement: it dims the already-rendered board while retaining its
  current field, active piece, and forecast behind Settings, pause, restart, and exit.
  Puzzle Next reuses the ordinary single dark forecast well as two stacked physical
  rows. Each is marked only with a plain left-side `1` or `2`, rendered as a readable
  loaded JetBrains Mono numeral (and accessible Chinese/English descriptions), so the
  order cannot detach from its actual piece; circular
  number badges, pale label strips, split cards, nested cards, and doubled borders are
  prohibited.
- **Music removal.** Remove the current procedural music, its controls, and its
  lifecycle from the live product. Original effects remain enabled and independently
  controllable. This pass does not download, embed, or substitute external music.
- **Mutation.** Rebuild the four carrier materials and activation language around
  recognisable original semantics: frosted ice for Freeze, a dense gravity material
  for Collapse, an ember-core Bomb, and a bright star/mineral glow for Multiplier.
  Freeze leaves a bounded frost treatment while active; Collapse communicates heavy
  downward pressure; Bomb produces a local clear explosion; and Multiplier carries a
  clear score-light response. Effects are local, bounded, and reduced-motion safe.
  Recollecting a timed item refreshes its remaining deterministic game time to
  **exactly ten seconds** instead of adding duration. Multiplier retains its existing
  deterministic strength progression but also refreshes to ten seconds. The active
  rail state must make item identity and remaining time immediately legible; Bomb is
  self-evident through its visual result and has no explanatory rail sentence.
- **Survival.** Preserve the three-row opening bedrock and 13 → 6 second rise pressure,
  but render bedrock as varied, chipped stone rather than plain squares. Add a
  deterministic independent falling-stone stream. Its separate seeded stream clock
  starts at 20 seconds; each due emission chooses one or two distinct legal columns at
  the visible top edge, resets that clock, and shortens only the *next* interval by one
  second to a 10-second floor. The stream owns a seed independent of the ordinary
  seven-bag, so debris timing never silently changes the incoming-piece sequence.
  Active stones use an exact integer 3:2 fall accumulator (therefore 1.5× Survival's
  fixed tetromino gravity), block a currently falling tetromino exactly like a temporary
  obstacle, and never overlap the board, the active piece, or another falling stone.
  On contact they become a distinct ordinary **clearable** stone board material; unlike
  bedrock, a row completed by stone enters the normal line-clear resolution and awards
  the normal Survival score/line effects. If that independent clear occurs while a
  player piece is active, the brief resolution carries the active piece and remaining
  stones through the same board shift rather than spawning or losing a second piece.
  The stream must not reuse browser timing, must be replay-safe, and must interact
  correctly with ordinary locking, bedrock shifts, and line clears.

### T13.14 execution checkpoints

1. **Contract checkpoint (coordinator):** this record and `docs/CURRENT_TASK.md` only.
2. **Entry/selector/UI checkpoint:** `src/App.tsx`, `src/App.test.ts`,
   `src/styles.css`, `src/ui/localization.ts`, `src/leaderboard.ts`,
   `src/game/render/TetrisRenderer.ts`, and direct renderer/UI tests may change
   together for countdown, node replacement, Settings, records, rail text, two-piece
   forecast geometry, modal backdrop preservation, and typography. It may not change
   Core rules.
3. **Music removal checkpoint:** `src/game/audio/AudioEngine.ts`, its direct tests, and
   the directly dependent App/localization paths may change only to remove music while
   preserving original effect audio and teardown.
4. **Mutation Core/render checkpoint:** `src/game/core/constants.ts`,
   `src/game/core/types.ts`, `src/game/core/mutation.ts`, `src/game/core/engine.ts`,
   direct Core tests, `src/game/render/theme.ts`, `src/game/render/TetrisRenderer.ts`,
   and direct renderer tests form an authorised coupled boundary for timer reset,
   material, and visual-event semantics. No Puzzle content may change.
5. **Survival Core/render checkpoint:** the same typed Core boundary plus direct race
   tests and the renderer/theme paths may change together only for deterministic
   falling stones and stone materials. It must preserve fresh-seed replayability.
   This is an atomic typed bridge: introducing the stone board material expands both
   `BoardMaterial` and `GameState`, so Core collision/state fields, the Pixi material
   route, direct regression tests, and the DEV-visible state/rule copy must land in
   one typechecking checkpoint. The exact permitted paths are `src/game/core/types.ts`,
   `src/game/core/constants.ts`, `src/game/core/engine.ts`,
   `src/game/core/race.test.ts`, `src/game/render/theme.ts`,
   `src/game/render/theme.test.ts`, `src/game/render/TetrisRenderer.ts`,
   `src/game/render/TetrisRenderer.test.ts`, `src/App.tsx`, and
   `src/ui/localization.ts`. This one checkpoint may exceed the normal 500 handwritten
   line budget only because a partially landed sentinel/material/event would either
   fail the typed renderer or let the board show an undefined material.
6. **Verification:** each source checkpoint receives focused tests. The final candidate
   requires typecheck, the full test suite, production build, and real desktop,
   portrait, landscape, and reduced-motion browser evidence. Evidence must show the
   3/2/1 overlay, compact Settings, two Next previews,
   no music UI/runtime, a timer refresh, all four Mutation states, a visible stonefall,
   one canvas/zero DOM cells, no overflow, and zero console/page errors.

## T13.13 selector legibility, settings hierarchy, and Mutation reliability pass

**Status:** accepted bounded repair `fcd6fce..3e2bcd9` after separate Core,
interface, renderer/audio, browser, and independent-QA passes. The first independent
review correctly held acceptance for final-candidate evidence provenance; the closure
review accepted fresh desktop, portrait, landscape, and reduced-motion artifacts with
no P0–P2 finding. T13.12 remains historical evidence only and must not be cited as
proof for the requirements below.

This pass keeps the existing deterministic mode identities, Puzzle definitions,
fixed queues, locale persistence, one-canvas boundary, and original asset boundary. It
repairs the product where a player can currently lose information or an item effect.

- **Puzzle selector.** Every incomplete level numeral must remain centered and hold an
  AA-readable ink colour against both ordinary and selected surfaces; state may not
  rely on a pale selected number. A completed option replaces—not supplements—its
  centered numeral with one clearly drawn, accessible SVG tick. There is no lower-rail
  medallion, top-right badge, title-side glyph, or literal `√`. A completed selected
  title receives the completion colour; its compact `当前最优步数：x步` / `Current best:
  x pieces` shares a stable inline heading band rather than changing the panel height.
  The selected preview remains one real, unclipped, dark-well board silhouette with no
  white fills, light seams, accidental glyph residue, or overpaint at any zoom.
- **Settings and records.** Recompose Settings as a deliberate compact sheet rather
  than two loosely filled columns: controls form a stable control group, keyboard and
  rule reference form a balanced information group, and the record/leaderboard spans a
  clear final band. Its action area has equal visual weight and no empty panel that
  looks unfinished. Opening Settings from an already paused game overlays that pause
  state and exposes **继续游戏 / Continue** directly; it must not offer a detour named
  “返回暂停”. Backdrop click retains exactly the same resume result. Leaderboard rows
  place the date at the far logical end of each row, use structural layout rather than
  `·` punctuation, and retain the top-five/ranking semantics.
- **Shared game rail.** The board and information rail are separated by proportion and
  whitespace rather than a vertical dividing rule. Every mode keeps the same readable
  metric → optional Mutation state → Next rhythm. Next is a clearly bounded forecast
  instrument with sufficient cell scale and a labelled sequence, not an ambiguous empty
  dark rectangle. The Mutation status module is visibly separated from metrics and
  Next with intentional vertical spacing.
- **Mutation reliability.** A carrier activates exactly once when *any* one of its
  locked cells is removed, including when that removal is caused by a nested Bomb or
  Collapse clear. Its identity is then removed from every surviving sibling cell.
  Trigger discovery must happen from the pre-resolution carrier set so ordinary row
  mapping cannot erase the event. Freeze and Collapse begin at ten seconds; another
  activation while already active adds ten deterministic game-time seconds rather than
  resetting its timer. Multiplier follows the same additive duration rule: its first
  active trigger grants **加倍 / Double** (2× normal and item-clear points); a second
  trigger while it is active promotes it to **超级加倍 / Super Double** (4×); any later
  trigger keeps Super Double and adds another ten seconds. Expiry returns the multiplier
  to normal scoring. Bomb remains instant and supplies its direct row/score result.
- **Mutation expression.** Rebuild, rather than merely recolour, the carrier and
  activation language. A special tetromino stays a four-cell, item-owned material, but
  its per-cell identifier uses low-contrast material engraving rather than white
  symbols that can look like rendering debris. Freeze uses a bounded cold hold cue;
  Collapse uses a brief downward structural settle; Bomb uses a local three-row blast;
  Double/Super Double uses a contained score lift that visibly distinguishes 2× from
  4×. None may flash the entire board or leave a continuous animation. Reduced motion
  presents the final coloured/labelled state without moving particles. Each event gets
  a short original, non-electrical audio contour whose attack, register, and decay make
  the four effects distinguishable; a newer effect stops an older effect tail.

### T13.13 implementation boundary and checkpoints

1. **Contract checkpoint (coordinator):** this design record and `docs/CURRENT_TASK.md`
   define the fixes and acceptance tests before source edits.
2. **Mutation Core checkpoint:** `src/game/core/constants.ts`, `src/game/core/types.ts`,
   `src/game/core/mutation.ts`, `src/game/core/engine.ts`, and direct existing Core
   tests may change together to make carrier triggering, additive timing, and
   Super Double deterministic. This is an authorized atomic Core exception because the
   typed state, score calculation, event contract, and clear mapping cannot typecheck
   independently.
3. **Renderer/audio checkpoint:** `src/game/render/theme.ts`,
   `src/game/render/TetrisRenderer.ts`, `src/game/audio/AudioEngine.ts`, and their
   direct tests may change together only to bind the revised item states to original
   bounded visual/audio feedback. It may not change ordinary piece geometry, Puzzle
   rendering, or bring in assets/media.
4. **Interface checkpoint:** `src/App.tsx`, `src/App.test.ts`, `src/styles.css`, and
   `src/ui/localization.ts` may change together for selector, Settings, leaderboard,
   rail, status, Next, and bilingual copy. This is a presentation exception only; it
   may not redefine Puzzle content or generic game physics.
5. **Evidence/QA:** each source checkpoint receives targeted tests. The complete
   candidate then requires typecheck, full current-source tests, production build, and
   live desktop/portrait/landscape/reduced-motion browser evidence that exercises a
   real carrier clear, Double→Super Double extension, paused-Settings continue,
   selector completion, records, and Next. Independent QA remains read-only until a
   candidate range exists.

## T13.12 selector, settings, and Mutation expression pass

**Accepted implementation:** `9b6188f..ec36924`, independently accepted in `d7fc929`
after real local-Playwright desktop and 390px evidence. The browser connector's earlier
unavailable-page blocker remains historical provenance only; it is superseded by the
documented recovery recheck in the independent QA log.

This pass uses one coherent **mineral instrument panel** direction: a warm-white
information surface, deep-blue board field, and the four mode hues only where they
communicate a real state. Space Grotesk remains the readable bilingual UI face,
JetBrains Mono is reserved for values/keycaps, and the bold Playwrite wordmark remains
the sole decorative display face. Labels, button captions, and puzzle progress must
not inherit the display face or artificial tracking; headings may use a restrained
weight/size contrast instead of synthetic bold flashes.

- **Puzzle selector.** The selected detail has a fixed-height heading band whether or
  not a best exists. Its completed title receives the completion colour and a compact
  checkmark; the natural result copy is `历史最优：X 步` / `Best so far: X pieces` in a
  quiet body-style inline note, never a pill that changes the panel height. Nodes that
  are complete receive a visible checkmark in addition to their accessible completion
  state. The selected silhouette remains the only board preview and must have no white
  fill, stray highlight, or overflow from its SVG paths.
- **Settings and controls.** Settings becomes a scroll-contained, two-column desktop
  sheet with one compact control column and one reference column; narrow screens stack
  it without clipping. Its visual order remains controls, keyboard, rules, and record,
  but the rules become a four-line, itemised rule card with mode colour, clear lead
  fact, and no paragraph-like wall of text. Back/Escape and Settings/S remain usable
  during entry countdown; opening either cannot enable gameplay early, lose a timer, or
  leave the run paused after cancellation. The bottom row of individual touch buttons
  is removed; keyboard remains complete and the board gains unobtrusive direct touch
  gestures rather than another visible button deck.
- **Mutation.** Its rail uses Classic's score/lines/combo/fall rhythm. A fixed ledger
  between statistics and Next shows Freeze, Collapse, and Double as grey inactive rows
  or their own blue/violet/gold active colour with remaining seconds; Bomb is a direct
  one-shot result. Carrier tetrominoes are four whole-cell special materials rather
  than an ordinary piece plus a dot: faceted ice, weighted gravity blocks, burning
  bomb blocks, and star-lit score blocks. Activation never flashes the whole board:
  Freeze paints a bounded frost edge, Collapse applies a downward-weight cue, Bomb
  draws a local blast/cleared-row effect, and Double emits a contained gold sparkle.
  Reduced-motion variants are static, legible, and bounded. The last activated item
  owns the cue: any previous item music/effect tail is stopped before the new cue.
- **Palette and interaction.** Every button family has a role-specific, high-contrast
  colour treatment—neutral Back, mode-aware primary action, cool Settings/continue,
  amber restart, and danger confirmation—without hover turning controls into unrelated
  blue. All motion respects `prefers-reduced-motion`; no rule, record, or visual state
  relies on colour alone.

### T13.12 authorized implementation boundary

Source may change only in `src/App.tsx`, `src/App.test.ts`, `src/styles.css`,
`src/ui/localization.ts`, `src/game/render/TetrisRenderer.ts`,
`src/game/render/TetrisRenderer.test.ts`, `src/game/render/theme.ts`,
`src/game/audio/AudioEngine.ts`, `src/game/audio/AudioEngine.test.ts`,
`src/game/runtime/GameRuntime.test.ts`, and any narrowly necessary existing focused
test file. Coordinator documentation may later change only in this design file,
`docs/CURRENT_TASK.md`, `docs/progress.md`, the T13 coordinator/QA logs, and the root
changelog. The user-owned `package-lock.json` must not be modified, staged, or bundled.

## T13.11 brightens mode glyphs and orders the keyboard guide by use

The two requested adjustments are intentionally narrow UI refinements, made after the
accepted T13.10 delivery. They do not alter rules, controls, persistence, renderer
ownership, authored Puzzle content, or the established type system.

- The four homepage mode glyph accents retain their distinct teal, blue, amber, and
  violet identities, but move to brighter mid-tone values with clearer cell fills and
  borders against the mineral-white panel. The workbench separator remains structural
  and calm; there is no darkening of the page surface, new decorative treatment, or
  change to the mode action treatment.
- The Settings **键盘** guide presents game controls first: left/right movement, up
  rotation, down soft drop, Space hard drop, and Puzzle-only Z undo. A distinct
  **快捷键** group follows it for Settings, pause, restart confirmation, Escape
  return, and sheet navigation/activation. Both groups preserve the two-column layout,
  English equivalents, arrow/Enter accessibility, and narrow-screen readability.

### T13.11 authorized implementation boundary

Starting from accepted/pushed `25fa232`, only `src/App.tsx`, `src/App.test.ts`,
`src/ui/localization.ts`, and `src/styles.css` may change before the source checkpoint.
`docs/DESIGN.md`, `docs/CURRENT_TASK.md`, `docs/progress.md`, the T13 coordinator log,
and the root changelog may record the contract, evidence, and acceptance later. The
pre-existing user-owned `package-lock.json` change is explicitly outside this slice and
must not be staged, changed, or described as a delivery file.

### T13.11 acceptance

The source candidate `fc9cc3c` was accepted by independent QA in `4457667` after
desktop and 390 × 844 live checks confirm distinct brighter mode accents, Chinese and
English gameplay-before-shortcuts ordering, Puzzle-only Z in the gameplay group, no
duplicate right-rail guide, no horizontal overflow, and zero browser warnings/errors.

## T13.10 restores an independent TetraMorph identity

The earlier `Tetra` identity was replaced by `Tetris` while reconciling an older visual
contract. That now conflicts with the requested independent game name, so the live
product returns to a distinct name as **TetraMorph**: `Tetra` keeps the four-cell
falling-block vocabulary legible, while `Morph` describes the changing board states,
Survival pressure, Puzzle routes, and 异变 items without claiming a copied product
identity.

- Every live product mark—the browser document title, loading shell, gameplay/library
  header, and accessible brand label—uses the editable plain text `TetraMorph`. The
  homepage deliberately has no duplicate top-left brand: its sole page-level `h1` is
  the dark-field wordmark. There is no Chinese companion name, commercial logo
  treatment, or claim of affiliation with another game.
- The homepage's dark left field replaces the generic `选择模式` heading with the
  TetraMorph wordmark. It is a single calm, high-contrast typographic focal point;
  the four mode entrances remain the interaction surface and retain no rule or record
  prose. The effect may use only original CSS light/shadow and the existing mineral
  palette—no grid, scanline, diagonal ornament, or copied mark.
- The display face is bold **Playwrite New Zealand Basic**, sourced through its local
  `@fontsource` package rather than a network stylesheet. The static face must be the
  actual Google Font file—not a generated fallback—and is strengthened only through
  its requested bold treatment. Its brisk,
  characterful stroke gives the TetraMorph wordmark tension without resorting to a
  copied logo. Chinese UI copy keeps the existing readable system/Noto fallback chain.
  This keeps the visual result available offline and suitable for a later application
  package.
- The Settings sheet keeps its semantic title **设置** first, then presents a named
  **控制** section (language, sound/music/volume, and run actions), a two-column
  **键盘** reference, the concise per-mode **规则**, and only then the current record or
  leaderboard as its final content block. The keyboard reference is the complete live
  map—move, rotate, soft/hard drop, Settings, pause, restart, Escape, and Puzzle-only
  undo—moved here from the right rail. The right rail therefore keeps only metrics,
  active item state, and Next. The order must stay readable at narrow widths and
  preserve the existing arrow/Enter controls.
- The UI is fully bilingual rather than partly translated: a persistent Settings
  language choice switches between `中文` and `English`; first launch follows the
  browser language safely. English must cover all visible text, aria/live messages,
  screen/dialog titles, buttons, mode rules, leaderboard/date/time labels, puzzle
  library labels, level display names, touch actions, and the canvas label. The document
  language updates with the choice. Translation is UI-only: canonical mode IDs, puzzle
  IDs/names, deterministic Core state, storage record values, and gameplay rules do not
  change. No Chinese copy may remain in an English active route.
- On the homepage the four original mode glyphs are intentionally more legible than
  before: their tetromino cells are visibly enlarged within their fixed button frame,
  while the separators between mode entrances use a clear but restrained structural
  line. They remain original geometric marks, not copied sprites or decorative grids.
- Puzzle undo is direct: after any locked Puzzle piece, `Z` or its touch control
  immediately restores the pre-spawn board/queue checkpoint for that piece and respawns
  the same piece at the top to fall again. It does not open a confirmation sheet, retain
  the old landing translation, alter targets, reseed the fixed queue, or permit undo
  before a lock. Repeated undo walks the same pre-spawn checkpoints backward.
- Settings is pointer-complete: clicking the dimmed backdrop outside the panel has the
  same effect as **继续**. A click inside the panel never dismisses it, preserving the
  settings controls, keyboard navigation, and focused range behavior.
- During a live Puzzle run, the product identifies the mode only. It does not show an
  authored level name, a `1/20`-style ordinal, or equivalent visual telemetry in the
  header or rail; remaining original blocks, placed pieces, and the clear-all objective
  remain. The selector owns natural concise level names and the current-best label.
- Typography has one deliberate hierarchy: bold Playwrite New Zealand Basic is reserved
  for the single home wordmark, Space Grotesk carries body and interface headings, and
  JetBrains Mono is limited to compact data, controls, and keycaps. The latter two ship
  as local font files, keeping bilingual rendering stable offline.
- A selected completed Puzzle shows only `当前最优步数：x步` (and its full English
  equivalent) immediately beside its name—not above Start. The selector shows no
  visible `固定锚点` label. Its color system is rebalanced away from the current
  navy/purple heaviness toward a restrained light mineral workspace with a single
  deep-preview well and clear selected/completed contrast.
- This slice changes only presentation/localization and the deterministic Puzzle undo
  checkpoint semantics. It must not alter other mode rules, Puzzle definitions,
  persistence values, renderer geometry, or audio behavior.
  The visual proof must cover desktop and narrow responsive layouts, reduced motion,
  zero overflow, and zero browser errors.

### T13.10 authorized implementation boundary

Before the final documentation/archive records, only `index.html`, `package.json`,
`package-lock.json`, `src/main.tsx`, `src/App.tsx`, `src/App.test.ts`,
`src/ui/ActionSheet.tsx`, `src/ui/localization.ts`, `src/styles.css`, `src/game/core/puzzles.ts`, `src/game/core/puzzles.test.ts`, `src/game/core/types.ts`,
`src/game/core/engine.ts`, and `src/game/core/puzzleUndo.test.ts` may change.
`docs/progress.md` and the coordinator workstream log may record verified evidence after
the source checkpoint. No historical contract prose is rewritten solely to rename its
past state.

## T13.9 replaces Collapse with 异变

The user rejects Collapse as a standalone mode: its column-settling rule is interesting
only as a short-lived disruption, not as the whole game. The fourth visible mode is now
**异变**. It begins and ends like a readable Classic run, but its marked carrier pieces
make local tactical changes without altering Puzzle or Survival's identity.

- 异变 uses a fresh normal seven-bag and top-out end state. Its gravity begins at the
  Classic opening cadence and steps up after every **six** cleared-line equivalents.
  The legacy internal `sprint` identifier may remain private to avoid an unnecessary
  public API migration; no page-facing copy, record, or player-facing data calls it
  Collapse or Sprint.
- After the first two input pieces, a seeded deterministic item roll may attach one
  item identity to an incoming tetromino. The one identity is carried by all four
  locked cells; every cell receives the same fine item surface while one connected
  core and perimeter accent make the carrier unmistakable. No
  item exists in Classic, Survival, or Puzzle; no carrier is inserted from wall-clock
  randomness or a non-replayable source.
- Clearing any cell belonging to a carrier activates that carrier exactly once. If
  sibling cells remain, they become ordinary cells. Metadata follows ordinary line
  clears and temporary column collapse so it cannot drift, duplicate, or fire twice.
- The first item set is deliberately legible: **冻结** stops automatic gravity for ten
  game-time seconds while leaving manual movement/drop available; **坍缩** settles the
  board's columns independently after each lock for ten seconds and resolves cascaded
  full rows; **炸弹** immediately removes the bottom three board rows whether full or
  sparse, grants score, and contributes three cleared-line equivalents; **倍增** makes
  normal-clear and item-clear points double for ten seconds. Timed effects refresh to
  the later expiry rather than spawning ambiguous stacks.
- The rail adds a compact **异变状态** surface: an icon/name plus `10 秒` countdown for
  a timed effect, or one brief factual result for an instant effect. Each carrier's
  full four-cell material is unmistakably item-specific—ice blue for **冻结**, violet
  for **坍缩**, ember coral for **炸弹**, and warm gold for **倍增**—while a central
  halo/core confirms that it is one carried item rather than an ordinary recolor. The
  piece has a bounded arrival pulse; activation gets an item-matched board flash and
  short particle response plus a concise accessible event message. Reduced motion
  preserves the four material colors and one static activation state without
  continuous motion.
- The home mode selector is intentionally navigational, not instructional: it shows
  only each mode's name, identity mark, and enter action. The first real entry into a
  mode opens a compact, dismissible rule introduction before input begins; it states
  the objective, special rule, acceleration/pressure rule, item trigger where
  applicable, and how the run ends in plain Chinese. A **规则** section in Settings
  repeats the same mode-specific facts for later reference. The introduction is
  acknowledged per mode in safe local storage, is keyboard/touch accessible, and
  never changes a deterministic game state or Puzzle definition.
- Existing v6 Collapse (`sprint`) records are semantically incompatible. The new
  persistence schema preserves valid Classic and Survival entries but resets only the
  fourth-mode table; all three current tables retain at most five date-stamped rows.
- Survival's initial bedrock is **three rows**, retains fixed 40-tick gravity, removes
  one row per three cleared lines, and raises pressure from 13 seconds down to 6.

## T13.5 replaces the time limit, not the Collapse identity

The 2026-07-24 review keeps **坍缩** because independent column settling makes it
feel distinct, but rejects its arbitrary 75-second cutoff and the ruled data rail.
It also reopens Puzzle's authored anchor distribution and level names; this is a
new bounded authoring pass, not permission to restore volatile/timed Puzzle pieces.

- **坍缩** is an endless score-and-chain run. It has no countdown, time limit, finish
  event, or time-based record. A run ends only through an ordinary top-out; its local
  table retains the top five top-outs, ranked first by cleared lines, then score, best
  collapse depth, and fewer pieces. Timed v5 Collapse rows are incompatible with this
  rule and must not mix with the new table; valid Classic and Survival rows continue to
  migrate.
- Its live rail shows only **分数 / 当前连锁 / 最高连锁 / 消行**. It groups those
  values as quiet, touch-safe metric surfaces without horizontal rules through the
  stats, Next, or keyboard sections. The dark Next well remains visually distinct,
  but spacing and tonal surfaces—not decorative divider lines—create the hierarchy.
- Survival keeps its seven-row warm-mineral opening, fixed 40-tick gravity, and
  three-line bedrock reward. Pressure now begins at **13 seconds**, falls by one
  second for every three cleared lines, and bottoms out at **6 seconds**.
- Audio is a separate finishing pass: every game event must use a distinct, audible
  but non-harsh original Web Audio contour at the existing 100% default master level.
  Add a low-key original procedural background music bed after a user gesture, with an
  independent on/off control that remains subordinate to gameplay effects. It may not
  download, sample, or imitate copyrighted music; mute, volume changes, pause, restart,
  unmount, and browser audio suspension must leave no continuing audio source.
- The Settings sheet carries the current live mode's compact **本模式排行**, preserving
  only the top five records and showing the date beside each result. Classic and
  异变 are lines-first; Survival is duration-first. Puzzle deliberately stays out
  of that table: it shows only the selected level's minimum locked-piece count after a
  real completion (otherwise `尚未通关`), never other Puzzle progress, route data, a
  hint, or a selector-side control.
- Settings is keyboard-complete as well as pointer/touch-safe: its actionable controls
  use a visible roving `←`/`→` selection and `↑`/`↓` row movement, while `Enter` uses
  the selected button. The sheet presents a compact **键盘** keycap reference for
  `S`, `P`, `R`, `Esc` return, selection/confirm, and Puzzle-only `Z`; the volume range
  retains native arrow adjustment when it owns focus. During play, `Esc` invokes the
  exact same return confirmation as the visible return button; that confirmation stays
  navigable with `←`/`→` and confirmable with `Enter`.
- The homepage mode cards separate navigation from visual selection. Hover, focus, and
  selection keep the **开始**/**选关** key in its own mode accent instead of recoloring
  it blue; selection strengthens that mode's card, border, icon, and accent surface.
  Card text has a fixed rendered weight throughout the transition, with motion limited
  to color, border, background, and position rather than an animated font change. The
  selector carries no gameplay-rule, ranking, or personal-record prose: it is only a
  clear route into a mode. A compact rule sheet appears before that mode's first live
  run, and the same factual copy remains available under **规则** in Settings.
- Music must be audibly present after the player's next valid in-game gesture at the
  default 100% setting—not merely allocated as silent Web Audio nodes. Preserve the
  original, separate-toggle procedural boundary, but write it as a wordless
  piano-like accompaniment: soft note attacks, short resonant decay, and a restrained
  melodic loop without electronic beeps, percussion, samples, network media, or a
  copied melody. Effects keep their short physical contours; landing must remain a dry
  impact rather than a sustained electrical hum.
- The in-run header keeps the back action and a clear current-mode title, but its right
  side exposes one **设置** control only. `S` opens the same accessible settings sheet;
  that sheet owns effects/music controls, the volume slider, pause/continue, and the
  confirmation-gated restart action. The current mode label must read as a primary
  heading rather than a small suffix. Each visible mode rule is one compact factual
  sentence: objective, unusual mechanic, and ranking basis only—no decorative labels
  or repeated keyboard prose.
- Every two-action confirmation sheet keeps its visible focus selection in sync with
  `←`/`→`; `Enter` activates the currently selected action rather than an invisible
  default. Escape/cancel behavior and pointer/touch operation remain unchanged.
- Puzzle retains twenty deterministic, legal five-through-eight-row setups, fixed
  queues, unlimited ordinary pieces, Z-confirmed undo, and two teaching routes per level. It
  has no volatile or expiring input mechanic. Level names become short, structural
  Chinese labels (two to four characters), rather than opaque literary phrases.
- Classic and Survival receive a fresh random seven-bag sequence for each run, while
  Puzzle queues remain fixed by canonical level. The browser implementation must stay
  wrapper-ready (safe lifecycle, storage, focus, input, and audio teardown) for a
  future application package, but this delivery adds no desktop runtime or package.
- Completing a Puzzle records the player's lowest **落子数** for that canonical level;
  the selector shows that compact personal best beside completion state. It changes
  only after a real successful run with fewer locked pieces, remains safe when storage
  is unavailable, and never changes a queue, route, or win condition. The local
  `Solutions/` walkthrough images are deferred: do not regenerate or present them in
  this delivery unless the user explicitly reopens that output.
- Puzzle's visible undo is deliberately confirmation-gated: pressing `Z` or using its
  touch-safe control opens exactly **确认** and **取消**. Confirming restores the
  Core-owned checkpoint from immediately before the latest lock, when that input piece
  had just appeared; cancelling returns to the current run unchanged. This changes no
  Puzzle definition, queue, anchor, route, target, or win condition.
- A completed selected Puzzle places its personal **最少 N 步** directly above the
  primary **开始** action. It is action-local rather than a new selector label,
  thumbnail, checkmark, or row-count fact.
- Classic, Survival, Collapse, and Puzzle use one shared live-rail grammar: soft
  metric cards, a dark bounded Next well, then compact keyboard help. Metric labels and
  values remain mode-specific, but borders, spacing, corner language, and responsive
  stacking remain consistent and do not introduce decorative rules.
- The current player-facing Puzzle hint system is removed. The paired Core-replayed
  routes remain regression evidence for reachability and early divergence only; no
  hint trigger, unlock condition, cue, strategy label, route step, or hidden input
  transcript is shown until a future explicit design pass.
- The selected Puzzle preview deliberately avoids repeated status chrome: it shows no
  `X 行残局` caption and no completion checkmark. The level name itself takes the calm
  completed-state color when that level has a record; compact personal-best and
  anchor facts remain available without turning the preview into telemetry.
- Immutable anchors remain a sparse teaching mechanic rather than scenery. An anchor
  may appear only on a curated subset of levels, never on an original target cell or
  on any initial target row. It sits in visible headroom directly above the initial
  target band, is announced as a fixed peg, and must be Core-verified to alter at
  least one legal landing or post-clear state. Every anchored level still needs two
  public-command solutions with a real early locked-piece divergence.

# Tetra — T13.2 Collapse Mode Redesign Contract

## 坍缩 is not Classic with a different counter

The 2026-07-23 clarification identifies the rejected fourth mode as Sprint, not
Puzzle. Puzzle's twenty fixed definitions, all-open selector, canonical queues,
anchors, undo, hints, and presentation are closed; this correction does not modify
any Puzzle source or visual surface.

- Sprint is renamed **坍缩**. It is a fixed 75-second score attack with a fresh live
  seven-bag and steady brisk gravity. It has no opening rubble, no target-cell list,
  no clear-a-number-of-lines finish, and no time-to-completion ranking.
- Every placed tetromino triggers an independent-column settling pass as soon as it
  locks; a completed line triggers the same pass again after it is removed. The engine
  then checks for newly formed full lines and resolves them in sequence. One placed
  tetromino can therefore create a multi-stage collapse; a normal Classic lock cannot.
- Clear score is multiplied by the square of the current collapse depth. The HUD
  exposes current chain, best chain, total score, and time remaining. The round ends
  only when its clock expires; topping out ends an attempt early without a ranked
  result.
- The renamed mode ranks completed rounds by score, then best collapse depth, total
  lines, and fewer pieces. Its title/result text must say `坍缩`, never `冲刺`,
  `清障`, `开局方块`, or `完成时间`.
- The column-collapse resolver stays in pure Core and is deterministic for a supplied
  seed. It must preserve ordinary material identity, never affect Classic, Survival,
  or Puzzle, and be directly tested for independent column settling, repeated cascade
  resolution, score multiplier, countdown finish, replay/hash stability, and fresh
  random live runs.

## T13.3 local walkthrough artifact contract

`Solutions/` is a local player-facing output directory, not a source/tooling bucket.
It contains only current `Solution-1.md` through `Solution-20.md` walkthroughs and
their linked SVG snapshots. A walkthrough is generated by replaying the schema-6 T13
primary public command route against the real Core; each snapshot is taken after a
lock's automatic resolution and records original-target count, next piece, and any
coordinate-pinned anchor. It demonstrates one feasible approach and deliberately
does not claim a unique answer or optimum.

The replay/generation implementation is versioned at
`tools/generate-puzzle-walkthroughs.mjs`; it does not participate in product startup
or mutate any Puzzle rule. Stale T12 walkthroughs, old image sets, candidate search
data, selector audits, and local generator/render scripts are retained only under the
explicit ignored recovery route
`.local/audits/t12.6-walkthrough-legacy-20260724/`. This keeps both rollback material
and player-facing output unambiguous.

## T13.4 production-test discovery boundary

The default product test command is a current-source quality gate, not a recursive
archive verifier. Vitest must discover only current `src/` test files. Historical
artifact checks beneath `docs/workstreams/` and ignored local recovery material beneath
`.local/` remain readable reference evidence, but they may not enter `npm.cmd run test`
or import obsolete route artifacts. This prevents an ignored, intentionally retained
walkthrough helper from changing the production test result.

The scoped repair may change only the repository's Vitest/Vite test-discovery
configuration and its direct documentation/tests if needed. It does not alter game
rules, Puzzle definitions, queues, anchors, selectors, rendering, storage, or the
browser bundle. Acceptance requires the unqualified default test command to list and
run the current source suite to completion, followed by typecheck and build.

# Tetra — T13.1 Quiet Fields and Excavation Sprint Contract

## T13.1 feedback correction

The 2026-07-23 feedback rejects the just-authored gravity-workbench decoration as a
finished visual direction. The product must not simulate technical depth with grid
lines, scanlines, oversized ordinal telemetry, ornamental English, or arbitrary pixel
clusters. Those elements obscure the playable objects rather than helping a player
choose a mode or a Puzzle endgame.

### Quiet entry surfaces

- Home and the Puzzle library use calm, flat mineral-paper surrounds and one dark,
  ungridded play well. Remove every decorative horizontal/vertical field line,
  `GRAVITY FIELD` label, header signal number, giant selected-level ordinal, redundant
  availability counter, and footer instruction strip. A title, an actual mode rule,
  a real selected endgame, and a reachable action are meaningful; visual telemetry is
  not.
- Remove the five-cell rising cluster and every arbitrary slanted or pseudo-tetromino
  ornament. Any remaining mode glyph is a valid connected four-cell arrangement with
  four equal square cells: Classic uses I, Survival O, Sprint L, and Puzzle T. No
  decorative extra cell, diagonal accent, or non-game block silhouette may appear.
- Keep the entry interaction restrained: hover/focus can tint a selected lane and
  shift it by only a few pixels; Puzzle selection can briefly settle the selected
  specimen. There is no looping grid, sweep, count-up, or motion that hides the
  first useful frame. `prefers-reduced-motion` receives the same final arrangement
  with no transition.
- The Puzzle library's single preview is the visual explanation of a selected level:
  enlarge it enough to read its actual cell structure at desktop and narrow widths,
  give every piece material a cohesive but clearly separated value/chroma treatment
  against the dark well, and reserve one quiet mineral accent for immutable anchors.
  Do not recolor it into an unrelated icon, blur the cell edges, or replace the real
  setup with a generic illustration. The numeric selector stays deliberately sparse
  so the preview, not decorative navigation, carries the pattern.

### Superseded excavation Sprint (historical only)

- `sprint` becomes **清障冲刺**, not a 40-line variant of Classic. Each fresh run uses
  its own random seed to generate a low seven-row ordinary rubble field with readable
  two-cell openings and no full starting row. Its normal seven-bag is fresh too; there
  are no special pieces, fixed authored route, hidden changes, timer expiry, or rising
  bedrock.
- Its objective is to clear every ordinary cell that existed in that generated opening
  field. Those opening cells are tracked as Sprint targets through normal line clears;
  later player pieces do not count. Completing the target set immediately finishes the
  run. A top-out ends the attempt without a record. This creates a fast opening-read,
  digging, and recovery challenge rather than an endless stack with a 40-line counter.
- Sprint keeps a brisk fixed fall cadence and time leaderboard: lower completion time,
  then fewer placed pieces, then score. The game HUD shows remaining/total opening
  rubble, placed pieces, and elapsed time. Its result copy says **清障完成** or
  **清障中断** and reports remaining opening rubble, never `40 行`.
- The generator is deterministic for a supplied seed, contains only ordinary
  tetromino materials, occupies only visible bottom rows, and is directly unit-tested
  for dimensions, target ownership, non-full initial rows, replay determinism, target
  mapping, completion, and fresh-run seed behavior. It remains separate from fixed
  Puzzle setups and never changes Classic, Survival, Puzzle physics, or leaderboard
  ranking policy.

# Tetra — T13 Endgame Workshop, Direct Controls, and Sprint Contract

## T13 product direction

The 2026-07-23 direction supersedes T12.7's shallow target-floor curriculum and its
tier gate. Puzzle should feel like an authored **残局**: a compact, legal mid-game
position that asks the player to read surviving structure, recognize recoverable
channels, and choose an approach, rather than fill an obvious prepared shaft. It stays
an original clean-room falling-block study; it does not copy any commercial board,
sequence, level layout, visual language, or puzzle wording.

### Repository and checkpoint discipline

- Keep versioned source, contracts, reusable authoring tools, and formal evidence in
  their mapped locations (`src/`, `docs/`, `tools/`, `scripts/`). `Solutions/`,
  `output/`, `.playwright-mcp/`, and ad-hoc browser captures are local material only;
  a source dependency or durable verifier may not live only in one of those ignored
  directories. Legacy local captures are archived below `.local/audits/` or
  `.local/logs/` by explicit topic, never left as unclassified root files.
- This T13 chain uses separate, reversible checkpoints: contract/file-map record;
  input/confirmation behavior; authored endgame Core/route evidence; Sprint Core and
  leaderboard behavior; selector/home/runtime presentation; then final evidence and
  coordinator record. Each checkpoint has an exact path list, targeted test, workstream
  log entry, and a commit before the next subsystem begins.

### Direct controls and confirmation parity

- `P` is the explicit Pause shortcut. It invokes exactly the same pause/resume action
  as the visible header control; `Escape` may retain that same action as an additional
  accessibility shortcut. A pause sheet contains only the focused **继续游戏** action,
  and `Enter` invokes it.
- Clicking **重新开始** or pressing `R` takes the identical route: when a run is active,
  it pauses once and opens one confirmation dialog. Its focused **确认** button accepts
  `Enter`; cancellation restores only a run that was playing before the request. `R`
  never directly recreates a game state. Runtime/test-only restart APIs remain direct
  programmatic APIs, not browser shortcut behavior.
- Keyboard routes must not leak through an open confirmation dialog into game input;
  pause, restart, completion, countdown, and focus behavior are covered by DOM and
  runtime tests plus browser interaction evidence.

### Open endgame workshop

- Every one of the twenty Puzzle entries is selectable on a fresh save. Completion is
  still persisted for player history and hint state, but it gates neither selection nor
  start. The library must communicate an open workshop, not a locked campaign.
- Every starting board is a visible **five through eight non-empty-row** endgame. It is
  rebuilt from a recorded legal setup history of ordinary public hard drops on an empty
  board, has no setup line clears or hidden-buffer occupancy, and preserves every
  source tetromino as an exact connected four-cell same-material component. It is not a
  randomly excavated mask or a contiguous bottom template.
- Victory remains `original-targets-cleared`: every ordinary cell that existed in the
  authored start must leave through normal line clears. Normal seeded seven-bag play
  continues with no piece budget or timer. Each level retains a stable distinct seed
  and at least two Core-replayed successful reference routes with a real locked-piece
  divergence; routes are teaching/verifier evidence, never a mandatory solution.
- The twenty boards rise in authored complexity in four visible bands: levels 01–05 use
  five rows, 06–10 six, 11–15 seven, and 16–20 eight. Within a band, more decisions,
  deeper but telegraphed cavities, anchor placement, rotation planning, and modest
  recovery room—not opaque tricks or a unique opening—define the progression.
- Add one or two **immutable anchors** to a curated subset of boards. They are visible,
  non-target, fixed-world-coordinate obstacles that survive ordinary clears. Each
  included anchor must be structurally consequential: replay evidence proves an
  anchor-aware landing or post-clear state differs from the same route on an otherwise
  anchor-free board. Anchors must neither occupy a setup cell nor make all verified
  routes collapse to a single forced answer.
- The Puzzle guide remains optional and one-intention-at-a-time. Its cue explains the
  readable endgame feature (bridge, shelf, pocket, anchor seam, or release lane), then
  presents two named approaches without input scripts or automated moves. `B` undo is
  retained as the player-controlled experimentation tool.

### Fourth mode: Sprint

- Add an original fourth mode, **冲刺** (`sprint` internally), distinct from Classic's
  escalating score chase and Survival's rising-bedrock endurance. It starts from an
  empty board with a fresh random seven-bag and a steady, slightly brisk gravity,
  completing immediately when the player clears **40 lines**. There are no special
  pieces, hidden board changes, or Puzzle targets.
- Sprint has a completion result and a local leaderboard ranked by lower completion
  time, then fewer placed pieces, then score. Its storage migration preserves valid
  Classic/Survival records and fails closed on malformed data. Core state, replay, and
  UI must distinguish Sprint completion from Puzzle completion.

### Desktop-packaging readiness (not a packaging release)

- T13 continues to ship as a browser-first Vite application. It does **not** add an
  Electron, Tauri, Capacitor, installer, signing workflow, native dependency, or a
  packaged binary in this task.
- The app is nevertheless prepared for a later desktop shell: deterministic Core stays
  free of browser globals; local persistence, visibility lifecycle, timer ownership,
  audio capability checks, and focus/keyboard handling have explicit browser-boundary
  adapters with safe no-capability fallbacks. A desktop host may replace those adapters
  without changing Puzzle, Sprint, scoring, or rendering rules.
- `src/platform/browserPlatform.ts` is the sole T13 browser capability seam for these
  concerns. It owns guarded local storage, media-query subscription, frame/timeout
  scheduling and cancellation, document/window listener teardown, deferred focus, and
  AudioContext construction. Its default implementation uses the browser only when a
  capability exists; an injected unavailable host returns inert listeners, `null`
  timers/audio, and default reduced-motion/storage values without mutating Core state.
  GameRuntime receives this boundary as an optional presentation dependency and must
  release every acquired listener on destroy. React presentation may use it for local
  saves, countdown/focus, restart keys, and action-sheet focus trapping. Pixi renderer
  DOM geometry remains browser-bound by design, but is not part of Core or a package API.
- Production assets must remain Vite-relative and offline-safe. No runtime feature may
  require a remote font, URL scheme, popup, service worker, browser tab title, or direct
  filesystem access. Existing local-only saves must retain their versioned fail-closed
  migration behavior when the storage adapter is unavailable.
- The readiness check is structural and browser-tested only: build output still opens
  under a static local host, production code has no development QA globals, and closing,
  hiding, remounting, or losing storage/audio capability leaves one clean runtime with
  no listener, ticker, canvas, or state leak. Packaging itself remains an explicitly
  deferred, separately approved release task.

### Presentation and verification

The 2026-07-23 redesign supersedes the first all-open relay treatment shown in the
interim T13 captures. It keeps the same functional contract, but replaces its loose
light cards and unused left-side canvas with one original **gravity workbench** visual
system: near-ink wells, mineral-paper surrounds, precise blue/green/purple state
accents, and sparse but consequential motion. This is a clean-room composition, not a
copy of a commercial game surface or control arrangement.

- **Mode home:** use one coherent mode field rather than a floating card stack. A clear
  product masthead and a compact four-lane gravity matrix share the same frame. Each
  lane carries only ordinal, original glyph, title, brief rule, falling-cell marker,
  and an unambiguous action. The active/hover/focus lane gains a contained accent beam
  and a short lateral settle; it must not read as four independent marketing cards.
- **Puzzle library:** use one compact endgame console. The selected real well remains
  the sole large board preview; its ordinal, name, row/anchor fact, structural cue,
  and start action live as one focused specimen surface. The twenty all-open numeric
  stops move into a dense four-band control matrix beside it, so the selector has no
  broad unused route canvas. Stops retain only ordinal, quiet completion check, and
  optional anchor notch—never thumbnails, lock icons, repeated titles, or corner dots.
  Selection sends a brief coordinate pulse from the matrix into the focused well, then
  settles; `prefers-reduced-motion` paints the final state directly.
- Both surfaces must be visually restrained but not flat: use hierarchy, contrast,
  alignment, shadows, and original tetromino-derived marks rather than explanatory
  copy or ornamental telemetry. All controls remain keyboard/touch-safe with visible
  focus and at least 44 px targets. No thumbnail grid, repeated card wall, faux
  dashboard, lock-state drama, text wall, or decorative progress-dot system returns.
- Gameplay remains one Pixi canvas with no DOM cell grid. The Puzzle guide stays a
  concise player-controlled reading aid: one cue plus two approaches, never a command
  transcript or automated input.
- Before publication: replay every setup and paired route through public Core dispatch,
  run targeted Core/input/persistence/UI/platform-boundary tests, regenerate local ignored walkthroughs,
  run one final typecheck/full suite/build, and inspect desktop, portrait, and landscape
  browser evidence for controls, open selection, all four modes, exact end states,
  no overflow, one canvas, and zero console errors.

# Tetra — T12.7 Multi-route Puzzle Guidance Contract

## T12.7 verified alternatives, gradual guidance, and authored fixed sequences

The 2026-07-22 direction extends T12.6 rather than replacing its three-through-seven-row
original-target curriculum, fixed anchors, fixed-seed Puzzle queue, undo, or current
observatory. A recorded clear route is no longer sufficient evidence for a player-facing
Puzzle: the curriculum must make room for more than one understandable approach and
must explain that room without turning the game into a command-by-command spoiler.

- Every published Puzzle level must own at least two **Core-replayed reference routes**.
  A reference route ends only at ordinary `puzzleCompletion: 'finished'`, clears every
  original target, preserves every immutable anchor, and uses the level-owned fixed
  seven-bag without mutating or pre-consuming it. The alternatives must diverge at a
  real locked-piece placement (not merely use redundant movement, an equivalent
  rotation, or a different number of settlement ticks). Their distinct opening or
  mid-board posture is a deliberate player choice, not a solver accident.
- The committed route artifact becomes the authority for every reference route and its
  replay metrics. It records a canonical route plus a second named strategy family for
  each level, the first differing lock, and a compact difficulty profile. All recorded
  routes are regression evidence only: they are neither a piece allowance, a mandatory
  sequence, an optimality claim, nor a runtime restriction.
- Recalibrate board patterns and their stable deterministic seeds where the current
  fixed input stream offers only a forced or opaque solution. Keep the visible
  three-to-seven-row bands and the existing sparse-anchor limits, but favor readable
  low channels, alternate bridge/fill order, and recoverable staging over concealed
  cavities, timing, kicks, or one-pixel-perfect placements. The first few arrivals
  must make both recorded families plausible from the visible well and the two-item
  Next rail. Any campaign reorder is evidence-led and preserves canonical IDs and
  completion-store migration.
- Difficulty is authored and displayed as a rising learning curve, not just the length
  of one route: target-row band, shortest verified lock count, amount of rotation and
  horizontal planning, the depth at which the two route families diverge, and recovery
  room all inform the ordering. A higher tier may ask for a longer composition, but it
  may not require an untelegraphed trick or remove all reasonable alternatives.
- Puzzle receives a local, presentation-only guidance layer. It is initially sealed so
  a new board gets a fair read; it unlocks permanently for that level after the player
  has placed two pieces **or** spent twenty active seconds in that level. A restart does
  not relock an earned hint. The first layer names the structural reading cue (target
  channel, bridge, anchor, or safe staging area); the second offers the two verified
  strategy families; each chosen family reveals only one short placement intention at
  a time. It never sends inputs, changes state, marks a level complete, exposes a hard
  command stream, or claims a single required answer. `B` undo remains the recovery
  affordance and should be mentioned when a guide is open.
- Guidance progress is its own small, versioned local record. It fails closed on
  malformed storage, is keyed only by canonical Puzzle IDs, and is independent from
  completion/unlock progression. Classic and Survival never render, load, or mutate
  the guide record.
- The gameplay trigger and sheet are restrained additions to the existing field: a
  compact Puzzle-only strategy action communicates its locked/unlocked state without
  crowding the audio, restart, pause, board, Next, or touch controls. The sheet uses
  semantic buttons and readable route choice, supports keyboard and touch, traps focus
  through the existing dialog primitive, and uses only brief purposeful motion with a
  full reduced-motion fallback.

T12.7 may change the authored Puzzle patterns/seeds and direct Core tests, the
route-search helper and committed route artifact, Puzzle-local hint persistence and
tests, and the Puzzle gameplay markup/tests/styles. It must not alter general physics,
rotation, normal line resolution, the randomizer contract of Classic/Survival, audio,
renderer ownership, dependencies, browser assets, or another repository. Before
publication it requires a replay of every recorded alternative, focused Core/persistence/UI
tests, one final typecheck, full suite, production build, and a desktop plus two narrow
browser-evidence pass covering locked and unlocked guidance, route selection, and
reduced motion.

# Tetra — T12.6 Layered Puzzle Curriculum and Current-Observatory Selector Contract

## T12.6 layered original-target campaign and minimal current observatory

The 2026-07-21 direction supersedes T12.5's one- through four-row, single-piece
teaching boards and its visually dense campaign atlas. Puzzle remains a fixed-seed,
ordinary falling-block game, but each authored target now asks the player to read a
small multi-row clearing composition rather than spot one obvious gap.

- Keep the current original-target victory rule exactly: a Puzzle ends only after
  normal line resolution has removed every **removable** cell that existed in the
  authored starting board. There is still no usable-piece budget, target counter
  limit, timed input, altered collision rule, special line-clear rule, or hidden
  support trick. The normal deterministic seven-bag continues indefinitely after an
  attempted route, so a verified route is teaching evidence rather than a runtime
  restriction.
- Reintroduce a small, authored distribution of **immutable single blocks** (fixed
  anchors). They are not original targets, never count toward victory, and never move
  when a line clears; ordinary target cells continue to follow the existing
  anchor-aware line-clear mapping. An anchor is fixed per level—not runtime-random—so
  Puzzle remains replayable. It may appear in only selected levels, with at most two
  singles in a board, must sit outside that board's initial original-target rows, and
  must not become a hidden spawn blocker. Every anchor placement needs a fresh Core
  replay route proving that it is an optional spatial constraint rather than an
  unresolvable obstruction.
- Replace all twenty T12.5 boards with visible, contiguous floor bands containing
  **three through seven non-empty original-target rows**. Campaign row bands ascend
  without regression: levels `01–03` have three rows, `04–06` four, `07–10` five,
  `11–15` six, and `16–20` seven. Each occupied row begins incomplete and every
  target stays within the twenty visible board rows. The openings must require a
  plausible multi-piece composition under ordinary rotation and hard drop; a direct
  single-piece gap, a concealed top stack, or a puzzle that asks the player to infer
  an untelegraphed trick is not an acceptable replacement.
- A deterministic authoring search and an independent replay through Core `dispatch()`
  must produce a legal public-command route for every level. The campaign order is
  the stable ascending tuple `(targetRowCount, locks, rotations, horizontalMoves,
  commandCount, id)` from those replayed routes; the tuple is a transparent
  feasibility/difficulty calibration, not a mathematical global-optimum claim or a
  player-facing allowance. A route may use ordinary left/right moves, clockwise or
  counter-clockwise rotation, hard drop, and required settlement ticks only.
- Keep the established three-first tier gate and state it plainly in the selector:
  `01–03` start open; completing any two levels in the preceding three-level tier
  opens the next tier through `16–18`; completing any two of `16–18` opens `19–20`.
  Existing completion IDs remain valid and sealed entries remain readable but inert.
- Generate a local, ignored `Solutions/Solution-1.md` through
  `Solutions/Solution-20.md` walkthrough set from the final replay routes. Each file
  records the command steps and embeds a board image after every locked piece. These
  are recovery/reference artifacts only: they are excluded by `.gitignore`, never
  bundled into runtime or source checkpoints, and must be regenerated after a route
  changes.
- Rebuild the selector as an original **current observatory**, not a card grid, a
  long-form archive, or a terrain atlas. The selected board is the dominant deep-well
  focal object; a sparse numbered switchback route is only a navigation instrument at
  its side. A level name, completion state, fixed-anchor note, and start action appear
  once in that focal stage—not redundantly on every stop. Decorative thumbnails,
  corner dots, progress-dot systems, faux 3-D planes, dashboard telemetry, stacked
  floating cards, and explanatory text walls remain forbidden. The full unlock policy
  is one compact, always visible transit line rather than three prose panels. The page
  has a deliberate one-shot reveal: the observatory field resolves on entry and a
  selected route sends one short sweep through the focal well. Hover/focus/press motion
  is similarly brief and spatially useful. `prefers-reduced-motion` removes those
  transitions while preserving every state distinction and control.
- Visible copy stays deliberately sparse: route sectors are number-led, and the focal
  stage carries only its selected name, semantic state, required fixed-anchor note,
  and start action. Decorative technical English, duplicate field labels, row counts,
  and section captions are forbidden; the gate remains the sole explanatory sentence.
- The selector uses the bundled local Space Grotesk face with the system CJK fallback
  stack; it must not make a runtime remote-font request merely to render the library.
- The selector remains responsive and keyboard/touch-safe. It must maintain one
  selected canonical preview only, preserve the visible unlock explanation and state
  labels, fit the 1280 × 720 desktop composition without document scrolling, and use
  internal scrolling/reflow rather than horizontal overflow on portrait or landscape
  narrow viewports. Gameplay remains one Pixi canvas with no DOM cell grid.

T12.6 may change the Puzzle definitions and their direct Core tests, the replay route
fixture/test, the Puzzle catalog markup/tests/styles, and the assigned T12
documentation/evidence records. It does not authorize physics, randomizer behavior,
ordinary line resolution, audio, renderer mechanics, dependencies, browser assets, or
other-repository changes. Before publication it requires focused Core/UI tests, one
final typecheck, full suite, production build, browser evidence at desktop and two
narrow viewports, regenerated ignored walkthrough artifacts, and new independent Core
plus visual/browser QA.

## T12.5 low-pressure Puzzle rebuild, local undo, and campaign-atlas archive

The 2026-07-19 follow-up supersedes T12.4's solver-derived piece budgets, dense
endgame requirement, retained anchors, and flat archive treatment before that candidate
is accepted or published. Puzzle is now an approachable authored curriculum, not a
long-route endurance test.

- A Puzzle is won **only** when every original target cell from its starting board has
  been removed by ordinary line resolution. There is no solver allowance, remaining
  piece counter, budget terminal state, or `failed-budget` result. Normal top-out,
  invalid-spawn, restart, and explicit exit behavior remain ordinary game behavior.
  `pieceCount` may remain an informational non-limiting statistic, but it may not be
  presented as a maximum, fraction, countdown, or failure cause.
- Replace all twenty prior deep stacks with twenty stable, fixed-seed, shallow authored
  teaching boards. The campaign progresses from direct one-piece gaps through simple
  rotations, then clear two- through four-row vertical channels. Every published route must
  use only understandable public inputs (horizontal movement, at most one ordinary
  rotation per piece where needed, hard drop, and settlement ticks); it must not rely
  on kicks, hidden support tricks, soft-drop timing, deep covered cavities, or an
  obscure multi-line workaround. Boards have a small target band near the floor, no
  timed inputs, and no permanent anchors in this curriculum. IDs and completion-store
  compatibility remain stable, while authored seeds and boards may change to make the
  intended opening input unambiguous.
- The route fixture is a regression proof of clearability and curriculum ordering, not
  an optimality claim, player-facing walkthrough, score rule, or runtime constraint.
  Its exact Core replay must finish every board. Difficulty is authored from the
  verified route's simple lock/rotation/move complexity and presented as a gentle
  ascending campaign index.
- Puzzle adds a run-local **撤回** action. `B` invokes it, and the active Puzzle shell
  also exposes an equivalent touch-safe control. It restores the exact state immediately
  before the most recently locked piece: board and original-target ownership, active
  piece, queue/randomizer, score, lines, timers, and placed-piece count all return
  together. The history is private to the live Puzzle run, starts empty, is never
  persisted or exposed through QA state replacement, and is unavailable in Classic and
  Survival. Repeated use walks backwards through earlier locks; with no checkpoint it
  is a harmless no-op. Undo cannot create, consume, reorder, or reseed a Puzzle input.
- The selector becomes an original **campaign atlas** rather than a uniform list of
  cards. It uses one coherent dossier/terrain language: a readable tier route, quiet
  terrain bands that indicate the learning arc, level records as waypoints, and a
  single selected-board detail panel. It must not restore per-level miniatures,
  upper-corner dots, a decorative progress-dot system, or a second board preview.
  Texture and depth come from restrained CSS planes, contours, route seams, and
  type hierarchy—not a copied game screen, dashboard telemetry, or generic floating
  cards. Locked and complete states remain semantic and accessible without hue alone.
- The unlock rule is visible in full, not merely inferred from a counter: `01–03`
  are open on a new save; `04–18` open in successive three-level tiers when any two
  levels in the immediately preceding tier are complete; `19–20` open when any two
  of `16–18` are complete. Existing valid completion IDs migrate without loss and a
  sealed entry remains inert.
- The selected detail keeps Puzzle's ordered double-Next preview. Gameplay keeps one
  canvas, no DOM board grid, fixed deterministic Puzzle seeds, responsive/touch-safe
  controls, the established target marker treatment, and reduced-motion behavior.

T12.5 may change the direct Puzzle Core/runtime definitions and tests, Puzzle progress
copy, App/UI/styles, the isolated campaign-route fixture/helper, and the assigned T12
workstream documentation. It does not authorize a physics, rotation, ordinary
line-resolution, audio, dependency, browser-asset, or other-repository change. Before
publication it requires focused route/undo/progress/UI tests, one final typecheck, full
suite, production build, browser evidence at desktop and narrow viewports, and fresh
independent Core plus visual/browser QA.

## T12.1 archive worktable and visible-board presentation clamp

The 2026-07-19 follow-up keeps T12's campaign, fixed-seed Puzzle routes, and seven-row
Survival rules intact. It corrects two presentation defects only: the archive must read
as a deliberate campaign instrument rather than a flat card wall, and a buffered-spawn
piece must never become visible beyond the playable well.

- The Puzzle selector is an **archive worktable**. A compact campaign rail communicates
  the opened count as one continuous bar and an explicit `opened / total` value; it has
  no decorative dots. The catalog uses numbered text records with a clear state label
  (open, complete, or sealed), a narrow selected-state edge, and a restrained mineral
  surface. There are no per-level miniatures. The single selected canonical-board
  preview remains in the detail instrument, where its ordinal, difficulty, title, and
  start action form one stable reading order.
- A sealed entry remains readable but inert: it may not take selection, start a run, or
  masquerade as an error state. Its subdued color, solid surface, and state label must
  remain distinguishable without relying on hue alone. Keyboard focus, the existing
  button semantics, responsive reflow, and reduced-motion support remain mandatory.
- The visible twenty-row well is a hard renderer presentation boundary. Core may retain
  its normal hidden spawn buffer and deterministic replay coordinates, but a visible
  active cell, outline, or rotation pulse may not render above the board's top edge.
  When interpolation would move the active group above its first visible row, the
  renderer clamps that presentation offset at the visible boundary and suppresses the
  scale pulse for that frame. Edge contact is evaluated from the **effective
  post-offset group bounds**, so an otherwise interior group translated exactly onto an
  edge also receives neutral scale; source cell coordinates alone are insufficient.
  This is renderer-only: no spawn coordinate, collision, queue, timing, seed, or puzzle
  setup may change.

## T12.3 Puzzle double-Next and final archive fit

The 2026-07-19 follow-up adds more planning information to Puzzle without changing its
fixed queue, and closes the one desktop viewport fit finding from visual QA.

- Puzzle's existing `Next` instrument renders exactly the first two already-generated
  queue items, in order: `queue[0]` then `queue[1]`. They share the same canvas-owned
  slot as a paired compact preview, and the label/accessible description makes the
  count explicit. Classic and Survival retain their single `queue[0]` preview; neither
  mode's random per-run queue contract changes. Ready and terminal states show neither
  future piece, and the preview must never invent, consume, reorder, or mutate queue
  data.
- The archive's desktop 1280 × 720 composition must fit within the viewport without a
  document-level vertical scrollbar. The catalog itself may scroll for long campaigns;
  the selected preview/detail remains in view. Portrait and landscape narrow layouts
  retain their existing internal-catalog scrolling and zero horizontal overflow.

## T12.4 solver-backed Puzzle campaign recalibration

The 2026-07-19 direction supersedes the inherited route-budget table and its old
linear unlock frontier. The previous fifteen route fixtures predate the current
original-target win condition and selected fixed anchors; they are historical evidence
only and must not be used as a budget, difficulty, or walkthrough authority.

- A dedicated deterministic campaign solver must calculate a legal public-command
  route for every one of the twenty Puzzle definitions, including its fixed seven-bag
  input sequence, original-target tracking, and anchor-aware line resolution. A route
  is valid only after an independent replay through `dispatch()` reaches
  `puzzleCompletion: 'finished'`.
- The solver-result artifact records a finite full-input domain (legal move, rotation,
  soft-drop, hard-drop, and required settlement ticks), the exact public command
  stream, lock count, replay digest, and terminal state for every level. It publishes
  **verified playable solution locks**, not an unsupported claim of mathematical
  global optimality.
- Current anchor coverage is calibrated by this evidence: an `A` overlay remains only
  when a current-Core route is verified. To honor the sparse-anchor direction without
  inflating budgets for unsupported boards, the retained overlays are
  `t3r-shaft-01`, `t3r-shaft-03`, and `t5r-prism-11`; other levels retain their
  authored board, seed, and target set without an anchor overlay.
- Every Puzzle's public `puzzlePieceBudget` becomes exactly
  `verifiedSolutionLocks * 2`. The engine still permits success on the final allowed
  lock after line resolution. There is no generic fixed slack and no legacy route
  count may survive as the source of a budget.
- The published campaign order is sorted by increasing `verifiedSolutionLocks`.
  Equal lock counts sort by the deterministic route-complexity tuple
  `(anchor count, soft-drop commands, public-command count, id)` so the visible
  difficulty index is stable, explainable, and derived from recomputation rather than
  the prior authoring order. Puzzle IDs, seeds, authored setups, and boards remain
  stable; only sparse overlay coverage, campaign order, and derived difficulty index
  change.
- A new save opens the first three solved-and-sorted levels. The remaining roster is
  grouped into tiers `[04–06]`, `[07–09]`, `[10–12]`, `[13–15]`, `[16–18]`, and
  `[19–20]`. A complete tier opens when any two distinct levels from the immediately
  preceding tier have been canonically completed. This gives a recovery choice inside
  each difficulty band while preserving a visible ascending campaign. Existing
  completed IDs remain completed during migration; unlocks are recalculated against
  the new ordered tiers and never erase a valid prior completion.
- The archive must explain the tier gate in concise Chinese, preserve one selected
  canonical preview, keep locked entries inert, and announce both the current open
  count and the next gate accessibly. Its two-item Puzzle Next preview remains queue
  display only and is independent of solving, budgets, ordering, or unlock state.

The bounded T12.4 implementation may change only the following product/test paths
after a reviewed solver result exists: `src/game/core/puzzles.ts`, direct Core campaign
tests and a new solver-result fixture/helper, `src/puzzleProgress.ts`,
`src/puzzleProgress.test.ts`, `src/App.tsx`, `src/App.test.ts`, and directly related
styles. It may add one deterministic local authoring solver under `tools/` plus its
committed result artifact under `docs/workstreams/`; both must remain isolated from the
runtime loop. It must update `Solutions/Solution-1.md` from the new first level's
verified route but keep that player walkthrough ignored by Git. It must not change
piece physics, rotation, line-clear behavior, authored boards, seeds, audio,
dependencies, or another game repository. Before publication it requires focused
solver/replay/progress tests, typecheck, the full suite, production build, browser
evidence for archive gates and two-Next, and independent Core plus visual/browser QA.

## T12 fixed anchors, no timed inputs, progressive access, and stronger feedback

The user's 2026-07-19 direction supersedes T11's volatile Puzzle input mechanism and
the unrestricted fifteen-level archive. It corrects the current anchor clear bug and
changes only Survival's opening bedrock height; Classic and all other Survival rules
remain unchanged.

- Puzzle has exactly twenty original authored levels, ordered from difficulty `01` to
  `20`. Difficulty is the monotonic order of the Core-replayed verified route bounds:
  first by lock count, then by retained-anchor count, soft-drop count, public-command
  count, and ID. The public allowance is exactly twice the verified route length;
  it is recovery room, not a mathematical-optimum claim. All levels retain a stable,
  level-owned deterministic seed and original clean-room setup history.
- A new save begins with levels `01`–`03` available. Every distinct canonical Puzzle
  completion contributes to the immediately following tier gate: each of
  `04`–`06`, `07`–`09`, `10`–`12`, `13`–`15`, `16`–`18`, and `19`–`20` opens when
  two distinct canonical completions exist in the preceding tier. Completion remains
  persistent, malformed or older data fails closed, and historic completion records
  migrate without losing their completed-level information. Locked entries are visible
  in the archive but cannot be selected or started; completion and unlock state are
  announced accessibly.
- `A` anchors are permanent **coordinate-pinned** obstacles. No line clear, including
  one below an anchor, may change an anchor's `{x,y}`. When an ordinary clear occurs
  in a Puzzle with anchors, normal cells resolve inside the vertical segments delimited
  by those fixed coordinates; normal targets continue to move deterministically and
  are removed only when their own cleared row is resolved. A line containing an anchor
  clears its removable cells while leaving the anchor in place.
- Remove the timed/volatile Puzzle-input design completely. No Puzzle input can expire,
  disappear, invoke support settlement, receive a warm volatile material, show a timer,
  or emit an expiry event/audio cue. Puzzle uses only ordinary deterministic seven-bag
  inputs, original targets, and optional fixed anchors.
- The visible `0–100%` sound control remains beside Pause, but `100%` is rebalanced as
  a clearly audible game mix: a modest master headroom boost, less aggressive
  compression, and stronger bounded sine envelopes. The mix remains transient,
  sine-only, free of distortion-prone waveforms and ambient loops, and must not clip
  ordinary overlapping gameplay cues.
- The archive retains its selected canonical preview as its only board thumbnail. Its
  new progression signal is compact and semantic—difficulty, completion, and lock
  status—not a decorative dot or per-entry miniature board. Touch, keyboard, reduced
  motion, responsive geometry, one canvas, and the plain-text `Tetra` identity remain
  required. The short single-word name communicates the four-cell input vocabulary
  without borrowing the Tetris product name or logo; no Chinese companion name is
  displayed in the product shell.
- Survival now begins with exactly seven warm-mineral bedrock rows. Its 15→8-second
  pressure, one-row-per-three-lines removal, fixed 40-tick gravity, restart behavior,
  ranking, and ordinary-run random-seed contract are unchanged.

## T11 target-marked Puzzle budgets, acoustic refinement, and fixed Survival pace

## T11 target-marked Puzzle budgets, acoustic refinement, and fixed Survival pace

> Historical T11 notes below are retained for traceability. T12.4 supersedes their
> Puzzle `+10` budget, old campaign-order, and anchor-coverage statements.

The user's 2026-07-19 direction supersedes T10's permanent Puzzle-anchor overlay,
the five-row / progressive-speed Survival opening, and the previous restart-copy and
audio palette.

- A Puzzle's goal is to clear every *original target block* within that level's
  solver budget `X`. Original targets are the ordinary tetromino cells present in the
  authored visible board at startup; later player locks, active pieces, ghosts, and
  volatile pieces never become targets. Target identity follows its cell through an
  ordinary row clear and the bounded volatile support-settlement rule, and is removed
  only when that original cell clears.
- `X` is the shortest lock count among the level's currently verified deterministic
  public-command solver routes plus ten locks of fixed slack. It is a reproducible
  accepted-solver bound with room for recovery, not a claim of a globally proven
  mathematical optimum. The engine permits success on the Xth lock after line
  resolution; if targets remain then, it ends with the explicit budget failure. Each
  level owns and exposes its own solver result and its applied slack.
- Random permanent `A` anchors remain sparse and deterministic, but may occupy only a
  visible row that was entirely empty in the authored initial board. They never share
  an initial row with original targets, never count as targets, and therefore cannot
  make an all-original-target objective impossible. Five-second volatile inputs remain
  optional, seeded later-play mechanics and never count as original targets.
- Pixi keeps each original target's ordinary material and connected-piece geometry,
  then adds a restrained warm-gold inset corner bracket at its upper-left edge. It is
  a quiet piece of the existing bevel language rather than a dot, rivet, tail, glow,
  or full per-cell outer box. The marker survives normal state updates and moves with
  the canonical target coordinate; it is neither a DOM cell nor a new cell material.
- Puzzle statistics show original targets remaining, the bounded used/available solver
  locks, and a prominent countdown of the locks still available. Terminal success and
  failure copy state the target outcome rather than claiming that the full board is
  empty.
- Survival opens with exactly ten warm-mineral bedrock rows. It retains its 15→8-second
  pressure and three-line bedrock removal, but its automatic gravity is one fixed,
  slightly faster cadence for the whole run. Clearing lines never accelerates the
  falling piece; Classic and Puzzle retain their existing independent cadence rules.
- The restart sheet remains keyboard-confirmable with Enter, but its visible primary
  action is exactly `确认` and it has no explanatory small copy.
- Each new Classic or Survival run, including restart and replay, receives a fresh
  runtime seed and therefore a new seven-bag sequence. Puzzle ignores that runtime
  seed and always restores its selected level's fixed authored sequence.
- A terminal Classic or Survival record that survives leaderboard insertion is visibly
  highlighted in the result table. If it does not survive the ranked list, the result
  sheet instead gives a compact explicit non-qualification notice.
- All game feedback uses short, bounded sine-based acoustic cues with a shared soft
  envelope; square, triangle, and sawtooth voices are removed. A hard drop owns the
  complete landing voice, so its accompanying lock event cannot stack a second sharp
  waveform on top. Event differences come from timing, octave, chord shape, and
  envelope, never buzzy oscillator types or a sustained background loop.

## T10 immutable Puzzle anchors and five-second vanishing inputs

The user's 2026-07-19 direction supersedes the T5 assumption that every Puzzle
cell is removable and that every incoming piece remains active until it locks.

- Historical only — Puzzle owned a second permanent material, the `A` anchor. Anchors were visible,
  deterministic, single-cell blockers: an active tetromino cannot overlap one,
  an anchor is never erased, and a completed non-bedrock row containing anchors
  clears its removable cells while retaining each anchor. Normal rows and
  Survival bedrock semantics remain unchanged.
- Puzzle victory is `removable-board-empty`: every ordinary tetromino cell in
  both the hidden buffer and visible board must be gone; retained anchors do
  not make an otherwise solved level fail. The state hash, replay, renderer,
  preview, and QA text expose this canonical distinction.
- A deterministic, level-seeded subset of Puzzle inputs is volatile. It plays
  and locks normally; from that lock it receives exactly 300 playing ticks
  (5 seconds). Paused, ready, terminal, and non-Puzzle states never consume
  its timer. At zero that locked tetromino disappears, emits `piece-expired`,
  and triggers one deterministic support-resolution pass: only complete
  tetromino components immediately above a newly opened cell may fall straight
  down as far as they can; a component that cannot make a normal
  whole-component fall, or is not reached from that new gap, remains still.
  The expiry neither undoes normal score/line/placed-piece credit nor creates a
  replacement piece.
- The archive keeps all fifteen entries. Every entry retains its previous legal
  setup history, stable seed, deep multi-color endgame mask, and continuous
  seven-bag generation. Anchors are sparse and level-seeded rather than a
  final-three-only rule: four earlier/mid-archive entries receive one anchor,
  the final three receive two, and the remaining entries receive none. Every
  anchor occupies a pre-existing empty visible cell; the overlay is the sole
  added board difficulty and never replaces an authored stack with a simplified
  tutorial shape. Anchored entries also participate in the volatile-input draw,
  so the two mechanics can combine without being mandatory in every puzzle.
- Volatile inputs use a distinct warm-signal material while falling and after
  locking; the ordinary seven-piece materials remain unchanged. Gameplay states
  show `限时块 / 落定后 5 秒` while the marked input is active, then an exact
  rounded-up seconds value while its locked timer remains. The live DEV state
  includes the active volatile records and anchor count so browser evidence can
  compare visible and canonical state.
- Gameplay audio uses a single Web Audio master gain and a compressor safety
  stage. Its default is 100%, with an explicit mute control and a
  persistent-in-session 0–100% volume slider beside Pause. Distinct, audible
  feedback covers start/pause, movement/rotation, hard drop/lock, line clears,
  volatile expiry, Survival pressure, and terminal outcomes; all audio stays
  outside core simulation and must be released on unmount.
- Hard drop is a short paired sine landing thump, not a triangle, square, or
  sawtooth sweep: it must read as physical weight without an electrical buzz.
- The game header keeps three direct controls together: audio, `重新开始`, and
  Pause. Clicking `重新开始` pauses a live run and opens a confirmation sheet;
  Enter confirms its primary action and Escape/cancel restores the prior paused or
  playing state. The Pause sheet itself offers only continue and exit. `R` remains
  the keyboard mapping for an immediate deterministic restart in every
  playable/paused/terminal state; it clears held input and returns to the same
  selected mode or Puzzle level without changing the seed contract.

## T9 five-layer Survival opening and Puzzle archive surface

## T9 five-layer Survival opening and Puzzle archive surface

The user's 2026-07-19 direction supersedes T8's zero-bedrock opening, five-line
reward, 20-to-10-second Survival pressure, and the visually flat Puzzle library.

- Historical only — Survival began with exactly five full, unbreakable warm-mineral bedrock rows.
  Restart creates the same five-row opening; Classic and Puzzle begin with none.
- Survival pressure begins at 15 seconds and shortens by one second on each cumulative
  three-line boundary, to an eight-second floor:
  `max(8, 15 - floor(lines / 3))`. Pending-rise, safe lock/clear ordering, pause,
  restart, deterministic hashes, and top-overflow remain fail-closed.
- Crossing each three-line boundary resolves the ordinary clear, then any already
  pending rise, then removes one bottom bedrock row per crossed boundary when present.
  The timer resets under the new interval even when no bedrock can be removed.
- Survival gravity shares the existing fixed tick table but advances one table step per
  three cleared lines, capped at the existing fastest value. Classic remains on its
  ten-line progression and Puzzle remains at its accepted fixed 48-tick cadence.
- The home-facing plain-text `Tetris` identity is a clear primary heading, not a quiet
  utility label. It remains original editable text, never a copied logo or wordmark.
- Rebuild the Puzzle level selection as an original `解谜档案` surface: compact colored
  board tiles carry level number, name, completion state, and selection signal; the
  selected canonical board becomes a single strong preview and a clearly associated
  start action. Keep all fifteen levels enabled, every touch action at least 44 px,
  the exact 2:1 board data, keyboard focus, responsive portrait/landscape behavior,
  one game canvas, and reduced-motion support.
- Archive tiles carry no decorative status dot and no miniature board. The selected
  canonical board is the only Puzzle thumbnail on the selection surface.

## T8 Interface, Survival, and Records Contract

## T8 mode field, Puzzle library, Survival interval, and records

The user's latest 2026-07-18 direction supersedes the earlier rigid 1+2 mode surface,
small Puzzle return action, cropped Puzzle thumbnails, 40-to-10-second Survival
interval, and missing result leaderboard binding.

- Home is an original Tetris-shaped mode field: the three complete mode entrances land
  in a stepped composition, retain concise factual rules, and use a distinct four-cell
  motif. Puzzle uses a stable T tetromino icon and never tilts or rises on hover.
- The Puzzle library keeps all fifteen levels enabled, gives every desktop level its
  canonical colored endgame thumbnail, enlarges the selected board preview, and exposes
  an unmistakable 44 px or larger `返回模式` action. Library and home copy do not
  repeat `目标：清空棋盘`; the in-game objective statistic remains the active rule.
- Survival bedrock pressure starts at 20 seconds. Each five cumulative cleared lines
  removes one existing bottom bedrock row when present, resets pressure, and reduces
  the next interval by one second to a ten-second floor:
  `max(10, 20 - floor(lines / 5))`.
- The local result leaderboard remains mode-owned and fail-closed. Classic ranks and
  presents cleared lines as its primary record; Survival ranks and presents elapsed
  survival time in descending order. Score, lines, pieces, and timestamp are stable
  secondary tie-breaks only. Puzzle completion continues to use the separate campaign
  store.
- `index.html` owns a lightweight Tetris Loading screen. The four-cell loader is
  removed only after the React surface has painted and becomes static under
  `prefers-reduced-motion`.

## T7 timed Survival and restrained motion refinement

The user's 2026-07-18 review supersedes T6's fixed-speed Classic/Survival contract and
the five-lines-adds-bedrock rule. It also removes the short decorative phase bars on
the mode surface and action sheets, requires the rules to be visible and unambiguous,
and reopens motion only for small stateful feedback.

### Classic and shared falling speed

- Classic and Survival share one line-driven gravity table. Speed tier is
  `floor(clearedLines / 10)` and the exact ticks per automatic row are
  `48, 43, 38, 33, 28, 23, 18, 13, 10, 8, 6, 5, 4, 3`; the last value is the cap.
- Classic retains consecutive-clear combo scoring. It has no terminal line target and
  displays the current automatic fall cadence rather than a player-facing level.
- Puzzle remains at the fixed accepted 48-tick cadence so the fifteen authored
  challenge references and their event/hash evidence stay unchanged.

### Timed Survival pressure and five-line reward

- Survival starts with a 40-second bedrock interval. After every five cumulative
  cleared lines the interval decreases by exactly two seconds, down to a 10-second
  minimum: `max(10, 40 - 2 × floor(lines / 5))`.
- The timer advances only while canonical status is `playing`; pause, ready, game-over,
  and finished states do not consume it. When it reaches zero it becomes pending and
  stops accumulating. The pending row rises at the next safe lock/clear resolution,
  before the next piece spawns, so no active tetromino is teleported or overlapped.
- A timed rise shifts the remaining board upward and appends one full unbreakable
  bedrock row. Top overflow ends the run. Restart clears the timer, pending state, and
  all bedrock.
- Crossing each five-line threshold resolves the ordinary clear first, then any
  already-pending timed rise, then removes exactly one bottom bedrock row if present.
  Removing a row shifts the remaining board down and inserts one empty row at the top.
  The reward resets the timer to zero under the newly shortened interval; if no
  bedrock exists, the interval reduction and timer reset still apply.
- Survival visibly exposes current bedrock height and the next-rise countdown. A
  pending rise reads `待上升`; otherwise the countdown rounds up to complete seconds.
  State hashes and seeded replay include timer and pending pressure.

### Rules, line removal, and motion language

- Remove `.phase-seam` from the mode selector and the colored `action-sheet::before`
  bar. Structural borders remain only where they divide real regions or statistics.
- Home rules stay concise but complete: Classic states combo scoring and acceleration
  every ten lines; Survival states 40-second starting pressure, one-layer removal and
  two-second interval reduction every five lines, plus the ten-second floor; Puzzle
  states authored endgame and board-empty success.
- The game dock repeats only the immediate active rule and direct cadence/countdown
  values. It does not restore long marketing explanations or a generic level label.
- Motion uses three purposeful signatures: one staggered mode-card entrance, a small
  hover/focus tetromino gesture, and brief bedrock rise/removal feedback with countdown
  urgency. No decorative phase line, perpetual ambient loop, glow, confetti, particle
  field, or layout motion is allowed. `prefers-reduced-motion` removes transforms,
  pulses, and renderer feedback without changing timing or canonical state.
- The accepted palette, typography, layout skeleton, divided facet geometry, touch
  controls, countdown gate, and plain-text `Tetris` identity remain unchanged.

## T6 bedrock material refinement

The user's 2026-07-18 review reopens only the Survival bedrock material color. The
existing blue-grey bedrock is too close to the cool-blue tetromino materials and does
not read clearly enough as a permanent geological layer. Replace its four renderer
color tokens with one restrained warm rock-brown material:

- face start `#9C8B73`;
- face end `#76664F`;
- outer edge `#40372D`;
- inner signal edge `#CDBEAA`.

This low-saturation warm mineral set separates bedrock from all seven playable piece
materials while remaining compatible with the cool `雾昼矿物` page and deep navy
well. Both face endpoints must retain at least 3:1 contrast against the well. Bedrock
geometry, divided facets, seams, relief direction, behavior, height thresholds, and
all ordinary tetromino colors remain frozen.

## Status and authority

The user's 2026-07-18 rule review opens T6 only for the three gameplay identities.
Their subsequent request for a more creative separation, followed by the explicit
replacement of Race with Survival, supersedes both earlier T6 drafts:

The accepted T5 layout, typography, `雾昼矿物` palette, divided cohesive tetromino
facets, fifteen authored Puzzle endgames, 18-tick lock window, entry countdown,
responsive behavior, and accessibility remain frozen. T6 supersedes only the former
Classic level progression and the complete Race acceleration rule:

- Classic is fixed-speed chain-score survival: consecutive clearing pieces build a
  visible scoring chain and any non-clearing lock breaks it;
- Survival uses Classic's fixed gravity but raises one permanent unbreakable bedrock
  row from the floor for every five cumulative cleared lines;
- Puzzle uses the same fixed standard speed as Classic but changes the initial board
  and terminal objective to an authored board-clearing challenge.

The serialized `level` field remains pinned to `0` in Classic and Survival. Puzzle
retains its accepted invisible level-based score/event serialization only so all
thirty frozen public-command solution references keep their event digests and final
hashes; Puzzle gravity never reads it, the UI never displays it, and success still
depends only on the canonical board becoming empty. Removing this Puzzle evidence
compatibility requires a separately authorized reference migration.
Classic owns one deterministic `combo` counter. Survival and Puzzle keep it at `0`,
and non-Classic hashes remain stable by excluding that irrelevant field from their
canonical hash payload. The internal mode key remains `race` only for replay/storage
compatibility; every player-facing label is `生存`.

The 2026-07-17 T5 milestone was independently accepted at product source
`effb353c0a4d1bef26fa524ed38d3d3653f45eb8` with formal evidence
`c0832e43dc1cdd31c074066919c229d4a9fe5518`. The user's 2026-07-18 block review
reopens only the tetromino material presentation through bounded Slice K-R3; the
accepted gameplay, layout, typography, palette, copy, and responsive behavior remain
frozen.

The user's 2026-07-16 direction opens T5 and supersedes every conflicting T3/T4
product rule. The later Puzzle clarification in the same session also supersedes the
first T5 finite-queue draft:

- the T4 Mineral Shelf presentation is rejected and must be replaced, not patched;
- Race is endless accelerating play, not a 20-line target;
- Puzzle levels are all available, are not gated by displayed difficulty, and use the
  ordinary continuous falling-piece loop against harder authored clearing goals;
- a deterministic seed is allowed, but Puzzle must never become a short supplied-piece
  exercise or a single-reference-solution memorization task;
- outside games may inform only abstract mechanics such as downstacking or target
  clearing. T5 board layouts, names, copy, visual language, interaction structure,
  code, fixtures, and assets are original clean-room work;
- the reported one-piece Puzzle stall is a release blocker.

The user's 2026-07-17 visual review supersedes the first T5 frontend candidate:

- the player-facing name is the plain-text word `Tetris`;
- `青流方阵`, its custom mark, and the complete Aqua Blueprint presentation are
  rejected rather than eligible for incremental polish;
- the replacement must remain light cyan/light-blue and high contrast, but must read as
  a direct game interface rather than a marketing page or engineering console;
- plain-text naming does not authorize copying a commercial logo, multicolor wordmark,
  proprietary font, existing product layout, or other trade dress.

The user's later typography and panel review authorizes an original open-source Google
Fonts pairing and rejects broken statistic dividers. This does not authorize a logo
font or copied wordmark: `Tetris` remains editable plain text, while typography and
numeric rhythm become part of the surrounding original interface.

The user's subsequent board review rejects the remaining isolated-tile appearance.
Four-cell tetrominoes must read as cohesive dimensional forms rather than four small
plates with four complete outlines. The permitted depth is a restrained machined
mineral relief; this supersedes the earlier flat-cell edge rule but does not restore
plastic gloss, glass, glow, detached shadow, or candy bevels.

The user's 2026-07-18 clarification supersedes only the earlier instruction to make
internal seams nearly disappear. Cohesion belongs to the tetromino's connected outer
silhouette, not to an undivided flat face: all four unit cells remain clearly legible
inside that silhouette. Shared boundaries use engraved two-tone grooves over the same
material base, while a consistent top-left light direction gives each unit a shallow
raised face. A board-well gap between same-piece cells, four detached tile shadows, or
four independent outer boxes is still rejected.

The user's later 2026-07-18 refinement treats the current composition as substantially
complete and opens no page redesign. It authorizes only two controlled changes:

- shorten the shared grounded lock window from 30 to exactly 18 fixed ticks (about
  300 ms at 60 Hz), while preserving the existing movement/rotation reset semantics
  and reset cap;
- brighten the coordinated page, surface, state, and piece palette into the exact
  `雾昼矿物` tokens below. Technology must come from the existing measured grid,
  semantic dividers, typographic rhythm, focus states, and restrained phase motion,
  not from a dark theme, neon, decorative telemetry, or new interface machinery.

The subsequent start-flow refinement adds one functional layer without reopening the
page design. After a player activates Classic or Survival `开始`, or activates `开始` for a
selected Puzzle level, the game shell appears with a centered `3`, `2`, `1` countdown.
Each number occupies exactly one second. The runtime remains in its deterministic
`ready` state throughout the countdown: gravity, elapsed ticks, audio events, keyboard
commands, and touch commands cannot start or mutate the run early. Immediately after
`1`, the overlay is removed, input is enabled, the public runtime start path is called
once, and board focus is restored. Pause/resume, restart, and replay do not create a
second entry countdown. Reduced-motion removes digit transform/opacity animation but
does not shorten or skip the three-second preparation window.

The user's later 2026-07-17 review also rejects the complete second frontend
presentation at `c9135f3252abfa3bd6d7e94c5eb2e11fc3c72a18`. It is not a visual baseline
that can be accepted through local polish. The new authority is light neo-tech
minimal: technology is expressed through exact proportions, fine edge light, clear
state changes, and one restrained motion signature rather than decorative machinery.
The accepted lifecycle, accessibility, rule binding, and detached
`structuredClone` QA snapshot fix in `c9135f3` remain behavioral requirements and
must not regress. Independent review also found 8–11 px mobile statistics and legacy
`路线` copy; both must disappear in the replacement rather than be patched in the
rejected presentation.

The user's later 2026-07-17 direction extends the accepted neo-tech foundation before
release:

- the player-facing `马拉松` name becomes `经典`; the internal deterministic mode key
  remains `marathon` only for compatibility and is never player-facing;
- the seven pieces use an original multi-hue mapping rather than seven near-equal
  cyan/blue fills or the standard commercial piece-color mapping;
- Puzzle contains exactly fifteen all-enabled original levels for this milestone;
- every authored starting board is visibly multi-colored while its color assignment
  stays independent from gameplay randomization and never changes collision geometry;
- the nine new levels strengthen the existing topology and multi-route proof instead
  of duplicating or recoloring the first six.

The user's subsequent review of frontend candidate
`248ca89551ce1293abe88e651c9953e132c816be` rejects its visual finish while preserving
its behavior and responsive information architecture. The page must feel more premium,
and the current muted, double-outlined rounded minos are specifically rejected as ugly.
The latest authority is therefore:

- every piece color is bright, saturated, and clearly separated from the other six;
- the rendering language is a precision luminous slab, not a candy, ceramic, mineral,
  jelly, or plastic tile;
- higher perceived quality comes from hierarchy, controlled translucent depth, one
  spectral cyan-to-blue rail, and reduced component repetition, not dark neon, a
  marketing hero, decorative English telemetry, or copied trade dress;
- all accepted rules, fifteen-level bindings, selectors, accessibility, responsive
  geometry, and lifecycle proofs from `248ca89` remain mandatory.

The user's final color clarification explicitly removes the earlier cyan/green-only
page limitation. The premium page theme is `spectral glass light`: a cool near-white
base with disciplined cyan, cobalt, violet, and small coral state accents. It is not a
dark neon theme and not an unstructured rainbow.

- Base page: cool ice `#F5F7FF`; primary ink `#081426`; muted text `#52627A`;
  cool hairline `#B9CBE4`; translucent surfaces remain near-white.
- State accents: cyan `#00BFC8`, cobalt `#4767F5`, violet `#8A5CF6`, and coral
  `#FF5B7C`. Classic uses cyan-to-cobalt, Race uses cobalt-to-violet, and Puzzle uses
  violet with coral only as a small selection signal.
- The single signature rail is `linear-gradient(90deg, #00BFC8, #4767F5, #8A5CF6)`.
  CTA and focus treatments may use adjacent stops from this rail; they do not mix all
  four accents on every component.
- The background may use at most three broad, very-low-opacity cyan, violet, and coral
  light fields. It still has no repeating page grid, scanline, noise texture, or
  decorative technical coordinates.
- Gameplay piece colors remain the separate bright luminous-spectrum mapping below;
  UI state color never remaps a tetromino material.

The user's latest 2026-07-17 review rejects the resulting local Slice I checkpoint
`e552b3c86e59b801f6d69045a94211e3f1c97e34`. It remains an unpushed historical
checkpoint and is not eligible for QA, evidence, changelog integration, or push. The
following authority supersedes every conflicting bright-spectral, glass, salted-color,
and verbose-copy rule below:

- the complete page and piece palette becomes one natural, mutually compatible deep
  `暮海矿物` spectrum; darker color must create tension through controlled value and
  proportion, not neon glow, black-on-rainbow contrast, or unrelated accent colors;
- minos become matte anodized plates with restrained tonal variation. The bright
  plastic/candy fills, blurred active aura, glass blur, colored ambient light fields,
  gradient CTA fills, and luminous locked-cell treatment are rejected;
- every Puzzle starting board is an authored endgame generated from a frozen legal
  tetromino stacking history. Per-cell salted recoloring and randomly excavated masks
  are forbidden; every initial cell inherits the type and material of the exact source
  tetromino that formed it;
- all fifteen masks, state hashes, and thirty solution references are regenerated.
  Existing IDs, order, and gameplay seven-bag seeds stay stable, but the earlier mask
  and route compatibility promise is explicitly superseded;
- visible copy is reduced to names, controls, score/statistics, and the immediate
  objective. Repeated explanations of ordinary falling-block play are removed while
  full ARIA labels remain available to assistive technology.

The deterministic architecture integrated at
`4c8582854088695ebac90467842dc2bc0cef3a20` remains the rule baseline. The rejected
T4 candidate `dd7e31ea3547c18a797b2308f04161310d1412ce` remains in history but is not
an accepted visual baseline. Its uncommitted follow-up is preserved on local branch
`codex/tetris-t4-rejected-preservation` at
`1362c664629b2a83f0659f836259b84c21750fee`.

T3/T4 screenshots, manifests, reference files, and workstream logs are historical
evidence only. T5 uses new paths and does not rewrite those artifacts.

## Product and architecture invariants

- This is a clean-room deterministic falling-block game for desktop and mobile.
- Delivery remains a browser HTML webpage built by Vite. T5 does not add a native-app
  wrapper, PWA install surface, or packaged application target.
- React owns screen composition and lifecycle. PixiJS owns the board, pieces, preview,
  effects, and frame rendering.
- Gameplay uses one Pixi canvas and no DOM cell grid.
- Core state stays serializable and independent from React, PixiJS, DOM, audio,
  storage, browser timing, and viewport geometry.
- Every DEV/browser diagnostic snapshot must be detached from canonical runtime state.
  Mutating any object returned by a QA collector must not change the live run; no
  collector may expose a writable state reference or state-replacement path.
- There is no Hold mechanic.
- Grounded pieces lock after exactly 18 fixed ticks unless an already-supported legal
  move or rotation resets the timer within the unchanged reset cap. The same shortened
  window applies to Classic, Survival, and Puzzle and remains deterministic.
- Initial entry into a run has exactly one `3`, `2`, `1` countdown. While it is visible,
  the canonical state remains `ready`, every gameplay input is gated, and the runtime
  starts exactly once only after the final second.
- Keyboard and touch expose left, right, clockwise rotation, soft drop, hard drop,
  pause/resume, restart, and an explicit route back to the mode home.
- Restart, mode exit, and unmount must not multiply listeners, tickers, audio nodes, or
  canvases.

## T6 mode rules

### Classic (`marathon` internal key)

- The only player-facing mode name is `经典`; `马拉松` is removed from visible copy
  and accessibility labels.
- Classic is open-ended fixed-speed chain-score survival.
- Gravity is exactly 48 fixed ticks per automatic cell for the complete run. Clearing
  lines and placing pieces never accelerate it.
- Line clears award the fixed base table `40 / 100 / 300 / 1200` for one through four
  simultaneous lines. The first clearing piece starts chain `1`; every immediately
  consecutive clearing piece increases it by one and adds `50 × (chain - 1)` bonus
  points. A locked piece that clears no line resets the chain to `0`. There is no level
  multiplier and no chain bonus in Survival or Puzzle.
- Player-facing statistics are score, cleared lines, and current chain (`连消`).
  `等级` is not displayed or described.
- The run ends only on top-out or explicit player exit.

### Survival (`race` internal key)

Survival is fixed-speed pressure endurance. It shares Classic's 48-tick gravity but
replaces Classic's chain scoring with a board-changing floor hazard.

- The only player-facing name is `生存`; `竞速` and speed-tier copy are removed.
- There is no line target, speed curve, or successful terminal state.
- Seven-bag generation, movement, clearing, base line score, and ordinary top-out
  match normal play. Survival does not use Classic's chain counter or chain bonus.
- For every five cumulative cleared lines, exactly one solid bedrock row rises from
  the bottom. The threshold is cumulative: crossing multiple five-line boundaries in
  one resolution raises the corresponding number of rows.
- A rise occurs after the triggering normal lines have been removed and scored. Each
  rise shifts the entire remaining canonical board upward by one row and appends one
  full bedrock row at the bottom.
- Bedrock is a distinct canonical board-cell material. It blocks movement and locking,
  is visible as one coherent mineral stratum with internal units, and is never returned
  by full-row detection or removed by line clearing.
- If a rise would discard any occupied cell from the canonical top row, the run ends
  immediately as game over before spawning the next piece.
- Player-facing statistics are score, cleared lines, and current bedrock height.
- The run ends only on bedrock overflow, ordinary top-out, or explicit exit.
- Survival leaderboard rows, if retained, are endurance results rather than
  completion-time results.
- All copy and tests referring to “20 行”, “速度档”, Race acceleration, or Race
  completion are removed or migrated.

### Puzzle library

Puzzle is a library of authored board-clearing challenges, not an unlock ladder and
not a finite input-sequence exercise. It changes the starting board and win condition;
movement, rotation, fixed 48-tick gravity, locking, base scoring, line resolution, and
piece generation otherwise follow Classic play.

- All fifteen T5 levels are selectable from first launch. No level row is disabled or
  hidden behind prior completion.
- Numeric difficulty is removed from production definitions and UI. It does not
  control ordering or availability. Completion persistence is informational only.
- The goal remains canonical board empty after ordinary line resolution, including
  the hidden buffer.
- Every level has an empty hidden buffer, a non-empty original 20 × 10 visible board,
  and a stable level seed. That seed drives the shared deterministic seven-bag
  randomizer; the bag replenishes for as long as play continues.
- There is no authored finite queue, piece budget, remaining-piece counter, or
  `failed-budget` outcome. An unsolved run continues until canonical success, top-out,
  restart, or explicit exit.
- Puzzle uses Classic fixed gravity, grounded lock delay, entry delay, soft drop,
  hard drop, and SRS rotation, but not Classic's chain counter or chain bonus. Its
  invisible legacy score/event serialization remains frozen solely for reference
  compatibility. A no-clear lock and a clear both continue through the ordinary
  deterministic spawn path.
- The initial stack occupies 8–12 visible rows and is produced by 16–22 frozen setup
  pieces. It contains all seven piece types, at least seven distinct non-empty row
  shapes, four row-density classes, covered cavities in at least five columns, and at
  least eight buried holes. Repeated floor templates, three or more consecutive rows
  exposing one straight well, and an immediately obvious opening are forbidden.
- Production validation samples the first 84 generated pieces from each level seed and
  proves twelve consecutive complete seven-bags. This is a validation horizon, not a
  gameplay limit.
- Each of the fifteen levels has at least two frozen successful public-command replays for
  the same level seed. Both must clear the canonical board without state injection,
  and their semantic placement streams must differ at five or more locked-piece
  indices by final occupied cell set, landing column, and/or effective rotation. At
  least two intermediate canonical board hashes must diverge before success; a
  different command digest alone is not route diversity.
- Each accepted route uses 30–42 locked pieces, all seven piece types, at least seven
  landing columns, at least eight effective rotations, at least five non-clearing setup
  locks, and at least four separated line-resolution phases. Paired routes differ at
  five or more semantic placement indices, diverge no later than the fifth lock, and
  produce different canonical board hashes at two or more shared indices. These
  metrics establish nontrivial play; neither replay is presented as a unique or
  optimal answer.
- Authoring/verifier search stops a route after 70 locks as a bounded safety guard. The
  guard is not a production queue, gameplay limit, or player failure condition.
- The engine checks canonical-board-empty success after ordinary line resolution and
  otherwise applies normal top-out rules. Malformed initial definitions fail validation
  rather than creating a special player-facing Puzzle failure.
- References initialize through `createInitialState(level.seed, "puzzle", level.id)`
  and use public `dispatch` only. No verifier, runtime QA hook, or browser setup may
  construct, replace, or mutate canonical state.
- Every definition owns a separate `setup.seed` and an explicit ordered
  `setup.placements` list of `{ type, rotation, x }`. The declared type must equal the
  next piece drawn from that setup seed. Landing `y` is never authored or injected; it
  is derived by legal gravity and hard drop from the empty canonical board.
- Product meaning: each level is a frozen mid-game snapshot from a difficult seeded
  normal-play trace. The seed supplies the legal bag order and the signed placement
  history supplies the play already performed; neither a seed alone nor a fabricated
  occupancy mask is treated as the authored endgame.
- Setup replay uses ordinary rotation, horizontal movement, and hard drop. It must
  produce no line clear, top-out, hidden-buffer occupancy, overlap, or invalid spawn.
  Every source owner therefore remains exactly four cells whose normalized geometry
  equals the canonical rotation of its declared tetromino. Two source pieces of the
  same type may not share an orthogonal edge in the final setup, so every visible
  same-color connected component is one recognizable legal tetromino.
- `boardRows` is derived byte-for-byte from the frozen setup history. It is not a
  second handwritten authority. `BOARD_COLOR_SALT`, per-cell color draws, runtime mask
  generation, and production random excavation are removed. The separate gameplay
  seed still starts the ordinary continuously replenishing seven-bag and is never
  consumed by setup construction.
- Tests and the reference builder replay every setup from
  `createInitialState(level.setup.seed, "marathon")` through public `dispatch` only,
  then require the resulting board to match the production Puzzle board exactly. The
  pure production board constructor may reuse canonical shapes and collision helpers
  but must not import the engine or create a dependency cycle.
- The fifteen existing IDs, order, names, and gameplay seeds remain stable so the UI
  and informational completion records remain compatible. The old occupancy masks,
  setup colors, route streams, state hashes, reference SHA, and browser evidence are
  invalidated and regenerated under this authority.
- Topology validation normalizes every occupied piece character to one occupancy bit
  before counting distinct rows, densities, holes, or cavities. Color variation may
  never masquerade as geometric difficulty.
- All fifteen normalized masks are unique and every pair differs in at least 20 of the
  200 visible cells. The signed-in histories are authored and visually reviewed as
  distinct endgame motifs; the authoring/search helper may screen candidates and find
  solutions, but production never generates a board at runtime. A copied mask,
  recolored duplicate, random hole field, or one-obvious-answer opener is rejected.

## T5 `雾昼矿物` precise-light visual direction

The accepted visual target is the existing precise interface re-toned into one bright,
cool mineral daylight spectrum. The page and panels become light; the board well stays
deep so piece geometry remains dominant. This replaces the dark-shell dependency
without changing composition or returning to Aqua Blueprint, rounded ceramic, bright
spectral glass, or plastic luminous slabs. The only player-facing brand is `Tetris`
set as ordinary text in the product type system.

- Technology comes from measured spacing, crisp structural planes, semantic divider
  logic, restrained mineral state colors, functional feedback, and disciplined
  composition. It does not come
  from CAD, dashboards, decorative telemetry, generic neon futurism, or unrelated
  rainbow accents.
- Remove the custom brand glyph, `青流方阵`, `AQUA ROUTE`, coordinates, route lines,
  blueprint grids and ticks, diagonal bands, clipped corners, decorative numbering,
  all-caps engineering labels, oversized slogans, and the rejected stepped mode bands.
- Also forbid scanlines, repeating grids, decorative particles, toy/glass candy or
  plastic blocks, marketing heroes, settings-row layouts, floating-card piles,
  backdrop blur, colored ambient blobs, and technical English used only as decoration.
- Do not imitate an official Tetris logo, multicolor wordmark, commercial font,
  existing product composition, commercial level screen, or other trade dress.
- Per the user's earlier direction, `index.html` remains unchanged as the required
  Vite entry document; it already provides the browser HTML shell and `Tetris` title.
- The only ornamental motion signature is a 2 px teal-to-blue-to-violet `phase seam`: about
  72 px while idle, extending once on selection or focus over 220 ms. It never loops,
  and reduced motion switches state immediately.

### Palette

| Role | Token |
| --- | --- |
| Page | `#DCE7F2` |
| Main / raised / selected surface | `#F7FAFD` / `#EAF1F7` / `#DCE8F2` |
| Board well | `#0B1726` |
| Primary / secondary text | `#14243A` / `#52677F` |
| Line / structural edge | `#B5C5D5` / `#879DB3` |
| Classic / Survival / Puzzle / selection | `#357F78` / `#526EB0` / `#80639D` / `#A75E71` |
| Action / hover / focus / action ink | `#315F96` / `#3D70A8` / `#245E9C` / `#F7FAFD` |
| Success / failure | `#3F7F5D` / `#A64E61` |

The only page gradient is the signature
`linear-gradient(90deg, #357F78, #526EB0, #80639D)` phase seam. Buttons use solid
colors. Primary text on the main surface measures 14.93:1, secondary text 5.56:1,
and action ink on `#315F96` measures 6.25:1. The `#B5C5D5` divider is only a
non-essential separator; selection, focus, and error states always add a stronger or
non-color cue.

### Typography, surfaces, and piece language

- Load the open-source Google Fonts pairing `Space Grotesk` + `Noto Sans SC` from CSS,
  not `index.html`. The frozen CSS v2 request is
  `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap`.
  `Space Grotesk` owns Latin text, the plain `Tetris` title, `Next`, and tabular-style
  numerals; `Noto Sans SC` owns Chinese glyphs. Both fall back through Segoe UI /
  Microsoft YaHei UI / PingFang SC / system sans so a blocked font request remains
  readable, does not create blank text, and preserves the responsive geometry.
- The page uses solid light cool structural planes around one deep board well. It has
  no colored ambient field,
  `backdrop-filter`, repeating grid, measurement mark, grain, diagonal stripe, route
  diagram, gradient CTA, or glow shadow.
- Only the main page/game container may use the restrained `0 18px 44px
  rgba(31, 59, 86, .14)` depth. Internal regions rely on one-pixel structural edges,
  spacing, and tone rather than repeated shadows.
- Primary surfaces use 12–18 px radii. Buttons, action sheets, the board, and cells
  have no clipped corners; nested large pill/card stacks are forbidden.
- Every tetromino uses one joined `matte machined mineral` base: the existing
  135-degree two-stop field remains within about 8% lightness difference and
  orthogonally adjacent same-material cells bridge the board-well gap. The connected
  component therefore owns one uninterrupted outer silhouette rather than four
  detached plates. Different materials retain their narrow well-colored separation so
  dense残局 remain readable.
- Every shared unit boundary remains visibly divided by one engraved two-tone seam.
  The material-edge groove is 0.85–1.35 px at 58–76% alpha; a 0.45–0.8 px lower/right
  lip uses `innerEdge` at 22–34% alpha. Seams cover the complete shared edge exactly
  once, never open through to the board well, and never become four complete cell
  outlines.
- Spacing establishes the hierarchy: separate material components retain a board-well
  channel at least 1.6 times the perceived width of an internal engraved seam. The
  external channel is therefore read before the finer internal division. Active and
  Next pieces use their exact canonical four-cell component; authored Puzzle source
  pieces already remain separate same-material components by contract.
- Depth uses one consistent top-left light direction at two scales. The joined outer
  perimeter uses a 1–1.6 px light top/left and dark bottom/right bevel. Each unit face
  adds an inset 1–2.25 px light top/left and dark bottom/right chamfer over the joined
  base, so cells are readable as shallow raised facets within one piece. There is no
  white specular bar, thick lower lip, emboss texture, glow, blur, glass, detached
  shadow, universal black stroke, or plastic/candy gloss.
- Active and Next pieces group their exact four canonical cells. Active replaces the
  locked outer contour with one higher-contrast signal contour; it never adds a second
  perimeter. Locked-board grouping joins only orthogonally adjacent cells with the
  same material. Authored Puzzle setup guarantees those initial same-material
  components are exact source tetrominoes; later line clears may naturally split a
  contour and same-material contacts may naturally merge it without changing Core.
- Ghost uses zero fill and one complete 1 px signal outline around the whole active
  tetromino perimeter at about 45% alpha. Its shared cell boundaries remain as one
  lower-alpha guide per seam, but they do not close into four independent boxes. The
  lock response remains an 80–100 ms low-alpha face change and never draws a second
  outer border.
- Board, Next, canonical silhouettes, active cells, and locked cells use the same
  exact material mapping and cohesive component principle. Board and Next share the
  same Pixi group primitive. The silhouette keeps at most one path per piece type,
  substantially closes the old per-cell gaps, and uses only a hairline seam so the
  tetromino geometry reads before the individual grid units.
- The coordinated mineral mapping below deliberately differs from the standard
  commercial piece-color assignment. Garnet, sea-pine, ochre, storm blue, moss,
  rock violet, and lake blue share one restrained value/chroma envelope; no one piece
  becomes a fluorescent or candy accent.

| Piece | Fill start | Fill end | Edge | Inner edge |
| --- | --- | --- | --- | --- |
| I | `#C85A72` | `#B14F65` | `#713443` | `#E69AAA` |
| O | `#47AAA1` | `#3C918A` | `#245B57` | `#91D4CF` |
| T | `#C58E4A` | `#AD783D` | `#694824` | `#E8BD83` |
| S | `#647BC0` | `#576DAE` | `#354675` | `#A9B7E3` |
| Z | `#83AA57` | `#6F914A` | `#425A2B` | `#BCD79A` |
| J | `#9A65B1` | `#87579E` | `#553663` | `#CFA9DC` |
| L | `#4D91AD` | `#407D99` | `#295567` | `#95C8D9` |
- Every fill endpoint has at least 3:1 non-text contrast against the `#0B1726` board
  well; the measured range is 3.34:1–6.74:1.
  Active/locked distinction cannot depend
  on glow or color alone.
- Board and Next reuse the exact drawing primitive. Page entrance is 180 ms over at
  most 4 px; line clear is one local 120–160 ms tonal sweep. No ornamental animation
  loops, and reduced motion removes positional and sweep transitions immediately.

## Information architecture

### Mode home

- The webpage opens on a dedicated mode home with no gameplay board.
- The mode home and Puzzle library do not mount a runtime or canvas. Entering a run
  creates one runtime/canvas; returning home destroys both before showing the home.
- A compact `Tetris` header and one `选择模式` heading lead directly to `经典`, Survival,
  and Puzzle. There is no poetic or marketing hero.
- The three entrances share one continuous 1+2 mode surface: Classic occupies the
  complete first row, with Survival and Puzzle as two independent complete buttons in the
  second row. One-pixel dividers and selected-state tone establish grouping; they are
  not three floating cards or a settings list.
- Every mode entrance keeps its complete action label and rounded arrow control inside
  the shared surface at all required viewports. In particular, 844 × 390 DPR3 must
  satisfy `scrollWidth <= clientWidth` for each mode button and action cluster; the
  right edge may not be hidden by the surface's clipping boundary.
- The standalone selected-mode preview pane and its explanatory copy are removed. A
  small original four-cell signal may live inside a mode entrance, uses the same
  matte-plate language, and never becomes a logo or looping hero.
- Visible home copy is frozen to `Tetris`, one `选择模式`, the three Chinese mode
  names, and these terse factual lines: Classic `分数 · 消行 · 连消`, Survival
  `每 5 行 · 基岩上升`, and Puzzle `15 关残局 · 清空棋盘`, plus `开始` / `选关`.
  `当前选择`, `三种玩法`, `随时开始，也可随时退出。`, `键盘与触控均可操作`,
  full-sentence rule explanations, decorative numbering, and redundant brand labels
  are removed from the visible home.
- Mode selection is not a small rail beside the board.

### Puzzle library

- Every level entry is enabled and shows only its ordinal, name, and optional
  completion status.
- It does not show numeric difficulty or lock state.
- The library is one continuous surface with fifteen complete enabled entries and one
  selected-level detail/start region. Desktop and 844 × 390 use a 3 × 5 matrix plus
  the existing right-side detail. At 360/390 widths the level matrix uses two columns
  and the selected detail stays in normal flow outside the level items. Library-page
  scrolling is allowed on narrow portrait; gameplay page scrolling is not. No layout
  is a pile of floating cards, pagination, or a difficulty/unlock ladder.
- If a level silhouette is shown, it is read-only derived from the existing canonical
  initial board as one SVG with at most one bounded path per piece type. It is not a
  DOM gameplay grid and must not duplicate or modify Puzzle definitions.
- No sticky or fixed selection panel may cover a level row. Visible library copy is
  only `Tetris`, `解谜`, back, ordinals, level names/completion, one selected-board
  silhouette, `目标  清空棋盘`, and `开始`.
- Remove the repeated row-level `清空棋盘`, the library explanation paragraph,
  `当前选择`, visible `起始棋盘`, `连续七袋方块 · 不限定唯一解法`, and the separate
  `方块` / `规则` definition rows. Full accessible labels may still describe controls
  and state without duplicating that prose visually.
- Starting a level must keep the visible selection, canonical `puzzleId`, level seed,
  active piece, and Next preview aligned.

### Game screen

- Top actions provide mode-home exit, current mode, and pause.
- Desktop uses one coherent game surface: the board is the dominant element and one
  flat 200–240 px information dock contains Next, statistics, and compact keyboard
  controls. It does not return to detached side cards.
- Mobile uses a compact information band above the board and a five-action deck below.
- The five actions belong to one integrated control deck with shared edges and clear
  pressed/focus state, not five floating pills or tiles.
- The visible focus ring maps to the board frame rather than outlining the full-page
  Pixi canvas. The canvas may still cover the complete arena so it can render both the
  board and Next against DOM geometry anchors.
- Pixi owns both the dark Next well and its exact canonical tetromino. The DOM
  `next-slot` is a transparent geometry anchor only; an opaque compact information
  band must sit below that canvas layer so it cannot mask the preview on mobile.
- Pause, exit confirmation, success, and failure use accessible light action sheets
  with buttons at least 44 × 44 CSS px.
- Survival shows score, lines, and bedrock height. Puzzle shows level name, cleared lines,
  placed pieces, the board-empty goal, and one Next item. It never shows a finite
  remaining-piece value or a suggested solution.
- Statistic borders are role-based, never inferred from generic odd/even item rules.
  On the desktop Puzzle dock, the level and objective span both columns and the
  placed/cleared pair shares the middle row. Every internal separator is continuous;
  a half-width dangling line, stray vertical segment, or empty fake quadrant is a
  rendering defect. Compact grids may rearrange the same values only when their
  complete row/column boundaries remain visually coherent. Every statistic article
  exposes an explicit semantic role, and all grid spans/dividers select those roles;
  `nth-child`, `nth-of-type`, `odd`, and `even` are forbidden for statistic geometry.
- Remove visible `本局数据`, long `.mode-rule` explanations, and explanatory pause or
  exit paragraphs. Result copy is limited to `棋盘已清空` plus `X 方块 · Y 消行`,
  `堆叠到顶`, or `生存结束` plus the necessary statistics. Mode/level name, back,
  pause, score/statistics, objective, Next, keyboard map, and the five touch labels
  remain visible.

## Responsive and accessibility contract

- All visible buttons are at least 44 × 44 CSS px; primary mobile controls target
  48 px or larger.
- Canvas focus has a visible 3 px high-contrast focus ring.
- Dialog-like sheets expose a readable title, correct role/label, intentional initial
  focus, Escape/cancel behavior, and focus restoration.
- Mode and state are never communicated by color alone.
- `prefers-reduced-motion` is honored initially and when the media query changes.
  Runtime changes use `GameRuntime.setReducedMotion` and do not rebuild or replace the
  current canonical game state.
- Required viewports: 1440 × 900, 2048 × 1152, 390 × 844 DPR3, 844 × 390 DPR3, and
  360 × 800.
- Mobile visible body copy and touch labels are at least 12 px, statistic labels at
  least 14 px, and statistic values at least 18 px.
- No horizontal overflow, clipped essential text, overlapping modules, or accidental
  gameplay page scroll.
- At 360 × 800, Puzzle statistics show the complete visible goal `清空棋盘`; it may not
  be ellipsized, clipped, or made to fit by shrinking the value below 18 px. A narrow
  override may redistribute the two statistic columns while preserving their shared
  surface and the 390 × 844 / 844 × 390 layouts.
- Generated JSON and checksum evidence uses explicit LF bytes before hashing so every
  entry in `SHA256SUMS.txt` matches the corresponding raw Git blob on Windows and
  non-Windows checkouts.

## Implementation ownership and sequence

1. Coordinator freezes this contract and exact path boundaries.
2. Puzzle Slice J replaces all fifteen boards with frozen legal zero-clear setup
   histories, regenerates thirty routes/references, and changes no frontend path.
3. If the signed references invalidate an internal browser-QA replay, Slice J-R may
   replace only that replay's frozen placement fixture and its direct test. This is a
   QA-fixture migration: it does not change Puzzle rules, runtime timing, or product
   behavior, and the fixture remains public-command-only.
4. Independent read-only Core/runtime QA verifies the exact Slice J candidate range.
5. Frontend Slice K owns the `暮海矿物` theme, matte renderer, reduced visible copy,
   and related presentation tests. It changes no Core definition or reference.
6. Coordinator runs one combined final typecheck, full suite, build, and browser pass
   after the last product change.
7. Independent read-only functional and visual QA verify the exact combined candidate
   before evidence, changelog integration, or push.

Historical T3/T4 evidence stays unchanged. New reference and browser evidence lives
only under `docs/workstreams/tetris-t5-*` and `docs/qa/evidence/tetris-t5`.

## Acceptance gates

- `npm.cmd run typecheck`;
- complete Vitest suite;
- production build;
- deterministic Survival replay proving the fifth cleared line raises one permanent
  bedrock row, later thresholds accumulate, bedrock never clears, and overflow ends
  the run;
- all fifteen Puzzle levels, two distinct successful public-command routes per level,
  restart/hash determinism, normal automatic gravity, grounded locking, continuous
  seven-bag replenishment, consecutive multi-piece play, and exact regeneration from
  legal zero-clear setup histories;
- each setup replay uses public commands from an empty canonical board, derives every
  landing row by hard drop, preserves each source owner as four canonical cells, and
  proves initial cell type/color equals source tetromino type with no random per-cell
  recoloring;
- first-84-piece seven-bag integrity for every level seed with no queue exhaustion or
  budget terminal;
- UI-driven evidence selects modes and levels through visible controls;
- plain-text `Tetris` is the only visible brand; `青流方阵`, `AQUA ROUTE`, blueprint
  coordinates, technical column labels, grids, ticks, scanlines, clipped corners,
  route decoration, stepped bands, ceramic/jelly cells, and toy visuals are absent;
- all three mode entries are visible without scroll at 1440 × 900 and 390 × 844;
- the home is one coherent 1+2 mode surface and the `phase seam` is its only
  ornamental motion;
- the mobile Puzzle selector has no overlay covering any level content;
- coordinated deep mineral matte minos, clearly divided raised unit facets, zero-fill
  whole-silhouette Ghost with internal guides, and Next share one drawing primitive;
  rejected detached tiles, bright plastic, blurred aura, double outer outline,
  toy/candy, cut-corner, ceramic, highlight-bar, thick-lip, and bracket-ghost styles
  are absent;
- the page uses the exact `雾昼矿物` solid tokens, no backdrop blur, ambient color
  blobs, gradient CTA, glow shadow, or page gradient outside the single phase seam;
- visible home/library/game copy matches the frozen minimal lists above. Repeated
  gameplay explanations and the banned strings `当前选择`, `三种玩法`,
  `随时开始，也可随时退出。`, `键盘与触控均可操作`, `本局数据`, and the long
  library/rule descriptions are absent;
- player-facing copy contains no legacy `路线`; use `解法`, `本局`, or `对局` only when
  that meaning is actually needed;
- computed mobile body, statistic, and touch-label sizes are recorded by browser
  evidence rather than inferred only from CSS declarations;
- the complete 360 × 800 Puzzle goal text `清空棋盘` is visibly present and its rendered value
  has `scrollWidth <= clientWidth` without lowering the 18 px statistic-value floor;
- at least one Puzzle scenario after three consecutive locks, with visible/canonical
  level, active piece, placed-piece count, and Next preview aligned;
- mode-home → game → mode-home → game proof with no canvas/ticker/listener leaks;
- direct regression proof that nested mutation of every DEV QA state snapshot leaves
  canonical runtime state unchanged;
- one gameplay canvas, zero gameplay DOM cells, zero console/page errors;
- keyboard, touch, pause/resume, restart, explicit exit, failure, success, and reduced
  motion verified at required viewports.

A nonblank screenshot, internal QA state injection, mock terminal state, copied level
layout, or copied frontend treatment is not acceptance evidence.

## T26 portable RC evidence and version contract

The final TetraMorph RC is versioned `1.0.0-rc.1` in both npm metadata files. Release
evidence must be reproducible from a normal clone: Playwright is a pinned development
dependency, capture scripts import it by package name, and their instructions name the
one-time Chromium installation prerequisite. No committed release runner may contain a
personal home-directory path, Codex skill-cache path, or coordinator-specific username.

Phase-E lifecycle and Phase-F showcase evidence must be regenerated after the metadata
and runner correction so their source SHA, browser audit, screenshots, and cleanup
claims bind to the corrected candidate. Final acceptance additionally requires a clean
install from the committed lockfile, the full project gates, scoped dependency and
secret scans, synchronized status documents, and an independent read-only QA pass on
the exact frozen range.

## T37 F4E canonical Intro-05 recovery contract

F4E resumes from accepted canonical Endgame source, not from a stopped proof checkpoint.
The frozen Core base is `33ac2eb02e8828d25749229b2a5233abf6faae17`; its
`src/game/core` tree is `e86bacb4f2595b1b1d0109509c14d87429e3c0f5`. The eventual
candidate command may run from a documentation-only descendant only when that Core tree
still matches exactly and `git diff --quiet HEAD -- src/game/core` succeeds.

Two repository-external inputs are frozen before discovery:

- `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json` — 633 bytes,
  SHA-256 `959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42`;
- `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v1.mjs` —
  26,059 bytes, SHA-256
  `6237614A8B1AB729E52E3AB466E9EA1DDF444321FDB7C1E3510A8DE468A9E773`.

The clue owns only a proposed setup, gameplay seed, and two physical-pose routes. It owns
no board rows, state/hash result, admission result, certificate, or acceptance claim. The
validator rebuilds all of those through the current Core. It has no resume/checkpoint
option, rejects an existing output, limits and structurally parses the clue, pins its own
and the input bytes, binds the Core tree and tracked/untracked worktree, disables repository
Vite configuration, rejects every committed descendant path outside the five contract
documents, then repeats those checks after proof. It successfully closes Vite before writing,
creates a uniquely named staging file exclusively, and publishes with a same-volume hard link
whose existing-destination failure cannot overwrite the final path. It cleans only staging
bytes it owns; cleanup after publication is best-effort and cannot turn success into failure.
The one authorized
output is the initially absent path
`C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v1.json`.
Any failure must leave that output absent.

After two independent read-only reviews report `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`,
the exact discovery command is:

```powershell
node "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v1.mjs" `
  --root "E:\Proj\reproduction-tetris" `
  --input "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json" `
  --output "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v1.json" `
  --expect-core-base 33ac2eb02e8828d25749229b2a5233abf6faae17 `
  --expect-core-tree e86bacb4f2595b1b1d0109509c14d87429e3c0f5 `
  --expect-input-bytes 633 `
  --expect-input-sha 959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42 `
  --expect-validator-sha 6237614A8B1AB729E52E3AB466E9EA1DDF444321FDB7C1E3510A8DE468A9E773 `
  --id t3r-shaft-04 `
  --difficulty 5 `
  --target-rows 4 `
  --max-primary-locks 7 `
  --max-alternative-extra 2
```

The validator must derive exactly eight legal zero-clear setup drops, 32 targets in the
bottom four rows, gap counts `1..3` summing to eight, no hidden cells or anchors, a unique
gameplay seed, and 54 nonmatching exact/topology/near-topology comparisons. Both routes
must be reconstructed lock-by-lock from `exhaustiveEndgameLandings`; their first three
pieces must be literal Current/Next-1/Next-2 with releases `[0,0,0]`. They share lock 1,
first diverge at lock 2 or 3, and each proves complete nonempty lock-1-to-2 and
lock-2-to-3 blocker ownership plus remove-then-descend counterfactuals. Each later has at
least two positive release events summing to four and reaches zero targets. The primary
uses five through seven locks and the alternative is at most two locks longer.

Only `certifyOptimalEndgameRouteForDefinition` over `exhaustiveEndgameLandings` may prove
the primary. No beam or state cap is accepted. Route token `H` means hard drop; Hold is
absent because the current public `GameCommand` domain has no Hold command. The output
must contain the full shorter-depth telemetry, new canonical state and SHA-256 hashes,
causal evidence, admission comparisons, and a deterministically ordered schema-8 fixture
candidate. A bounded zero-hit, prior hash, or mechanically equivalent old-domain replay
is not proof.

The earlier 23,480-byte / `A5703556...2A875` and 25,478-byte /
`DD795484...D34B4`, and 25,754-byte / `5237C9A5...E67DB` validators are rejected by
review and must never run. They collectively
lacked frozen-byte assertions, untracked-Core and Vite-config isolation, post-proof
reconciliation, committed-descendant enforcement, no-I/O-after-publish ordering, and
exclusive owned no-replace publication. Only a complete,
independently audited output from the current frozen validator opens the four-path source boundary:
`src/game/core/endgameV3IntroDefinitions.ts`,
`docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-05.json`,
`src/game/core/endgameV3Intro05Exact.test.ts`, and
`src/game/core/endgameV3Intro04Exact.test.ts`. Intro-04 may replace only its fixed total
length assertion with exact identity of the accepted first-four prefix; Intro-05 owns the
new total. The source slice remains within 500 hand-authored changed lines and changes no
published roster, UI, progression, sensory behavior, protected T27 evidence, or icon.

### F4E exact-run resource recovery

The coordinator-observed first execution reached the current-Core exact-certificate search
and terminated with V8 heap exhaustion under Node's default old-space ceiling. Its terminal
reported `exit 134`, 398.7 seconds, and approximately 4,050 / 4,062 MiB; those exact historical
numbers were not recoverable from a separately readable raw transcript and are not treated as
independently verified evidence. Independently reproducible facts are that it published no
candidate, left no staging file, and changed no validator, clue, Core, arguments, output,
landing domain, lower bound, or certificate logic.

At recovery review the machine has 31.84 GiB physical memory. Free physical and virtual
memory are live values and are deliberately not frozen as a durable amount. Local Node
confirms `--max-old-space-size=8192` yields an 8.19 GiB heap limit. Immediately before
execution, both reported free physical memory and free virtual memory must exceed that
8.19 GiB limit; otherwise the command does not start. Independent recovery review accepted
the current facts and semantic identity with `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
Exactly one resource-only recovery may therefore replace the command's first line with:

```powershell
node --max-old-space-size=8192 "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v1.mjs" `
```

All remaining arguments are exactly the accepted command above. Authorization depends on the
current reproducible facts, not on the uncorroborated exact historical telemetry. A second OOM or any semantic
gate failure is a stop condition; it does not authorize another heap increase, a rerun, a
beam/state cap, a different route, or broader search.

### F4E-R3 key-frontier exact proof

The coordinator observed that the one authorized recovery passed its immediate preflight
with an 8.1875 GiB heap, 13.6352 GiB free physical memory, and 9.2452 GiB free virtual
memory, then terminated after 819.5 seconds with `exit 134`; V8's terminal tail reported
approximately 8,152.1 MiB retained inside an 8,160.7 MiB heap. Those historical telemetry
numbers lack a separately readable transcript and are not an acceptance premise. Current
reproducible facts are that no final output or owned staging file exists, the
validator process is gone, and the frozen Core tree remains unchanged. The 26,059-byte
validator is therefore retired. It must not run again with a larger heap, a state cap, a
beam, or a narrower domain.

Static inspection localizes the retained heap to the exact breadth-first proof in
`certifyOptimalEndgameRouteForDefinition`: each layer keeps full `GameState` objects while
the next-layer `Map` simultaneously keeps the current frozen 11-segment text key and another full state.
A representative started Intro state serializes to about 4.3 KiB before JavaScript object
overhead while its complete state key is about 0.6 KiB. This is a storage representation
failure, not evidence against the route or lower bound.

F4E-R3 may change only the authoring proof's frontier representation in
`src/game/core/endgameRouteSearch.ts`, `src/game/core/endgameRouteSearch.test.ts`, and one
new focused `src/game/core/endgameRouteKeyFrontier.test.ts`. The candidate replay
still establishes the same seven-lock upper bound. Every shorter depth still uses
`exhaustiveEndgameLandings`, `endgameRouteLockLowerBound`, and the exact current 11-segment
`endgameRouteStateKey` schema. Existing general state-key calls, including terminal landing
deduplication inside `exhaustiveEndgameLandings`, remain unchanged. A private proof-frontier
encoder first asserts the canonical decision-state domain and then delegates to that key.
The frontier stores only those complete keys. Before
expansion, a key is decoded fail-closed into a canonical proof-equivalence representative
`GameState`
using the real started state as its invariant template; it is not claimed to reproduce the
discarded historical score or clock. `.` becomes empty, `A` remains an anchor, and `#`
becomes one canonical ordinary material because the existing state-key contract already
proves ordinary piece colour is renderer-only for future collision and completion. Target
cells, supported cells, active pose, queue, randomizer seed/bag, piece/spawn counts, phase,
and status are all reconstructed from the key. Omitted display, score, line/level history,
clock, undo, Survival, and Mutation fields take reviewed proof-equivalence representative values.
Candidate/final hashes, releases, and presentation evidence remain sourced only from the
real public-command replay, never from a decoded proof representative.

The proof-frontier codec must define an exhaustive compile-time `GameState` field policy (for
example, `satisfies Record<keyof GameState, ...>`) so a newly added field cannot silently
enter the quotient. Every field has exactly one primary storage class plus zero or more
domain-validation/canonicalization modifiers:

1. `encoded`: board occupancy, target/support coordinates, active pose, queue, randomizer
   seed/bag, piece/spawn counts, phase, and status come from the 11 segments;
2. `template-invariant`: values come from the reviewed definition/start-state template rather
   than the key;
3. `proof-quotiented`: values may be replaced by a reviewed representative only after the
   proof-observation equivalence below is demonstrated.

Orthogonal modifiers then enforce that ordinary `I/J/L/O/S/T/Z` board materials alone may
be canonicalized behind encoded occupancy; `B` and `R` are rejected rather than collapsed
into `#`, while `A` stays `A`. Domain validators likewise constrain encoded fields such as
active/phase/status and template fields: the encoder admits only a real Endgame decision state for the same
   definition (`mode=endgame`, matching ID/seed/board source/initial target count,
   `endgameGoal=original-targets-cleared`, `endgameCompletion=active`, active playing phase,
   zero phase/gravity/lock counters, empty pending rows and undo state, and inert non-Endgame
   subsystems). Score, lines, combo, level, elapsed time, display bridges, completion bridges,
and any other enumerated proof-quotiented field may differ only after a dedicated test proves
the exact certifier's observations—lower bound, finished/no-win, successor 11-segment keys,
proof-observed `piece-locked` presence/type/cells, and telemetry—are unchanged. The complete
event stream, event fields outside that lock projection, and `stateHash` are explicitly
allowed to differ; ignored score/completion-tick payloads can never become final evidence.

Decoder grammar is fail-closed: exactly 11 segments; exactly 40 rows of 10 cells; only
`.`, `#`, and `A`; bounded unique canonically sorted coordinates; valid piece, rotation,
queue, bag, unsigned seed, and count fields; valid non-colliding active pose; active-playing
decision status; template invariants; and final byte-for-byte re-key equality. Unknown or
malformed keys throw rather than fall back.

The implementation is admissible only if focused tests prove all of the following:

- the proof-frontier encoder rejects Bedrock/Survival material and every noncanonical
  Endgame decision state without narrowing the existing general state-key domain;
  decode obeys the frozen 11-segment grammar and
  `endgameRouteStateKey(decode(key)) === key`;
- for real started and post-lock states, original versus decoded representatives have
  identical lower bounds, identical shorter-win outcomes, and identical sorted tuples of
  lock signature, encoded commands, and successor key across the complete public-control
  landing domain;
- an exhaustive `GameState` policy makes every field review-visible; tests exercise a
  reject-or-equivalence case for every asserted/quotiented field, including explicit `B`,
  `R`, mode, goal, completion, timer, pending-row, and malformed-key negatives;
- equivalence fixtures deliberately vary score, lines/level, elapsed ticks, ordinary colours,
  and every proof-quotiented field across states sharing one key; their decoded representative
  must still preserve the complete future successor-key set and win/no-win result, while
  tests also show expected event/state-hash non-equivalence is never used as proof evidence;
- ordinary board colour substitutions leave those tuples unchanged, while every field that
  the key preserves remains mutation-sensitive;
- a test-only full-object reference BFS and the key-frontier BFS return identical depth
  telemetry and identical shorter-win decisions on bounded accepted definitions;
- all existing opt-in exact certificates retain their literal frontier, transition, prune,
  state-count, route, and hash values, while real-route replays retain their literal lines,
  elapsed ticks, final state hashes, and events.

No hash-only identity, probabilistic filter, disk failure fallback, global visited set,
beam, state cap, altered lower bound, route-specific landing filter, or new gameplay rule is
allowed. After source QA and full gates, a new validator must pin the new Core tree and its
own new bytes; the retired validator/output authorization does not transfer. Only one
independently reviewed candidate run of that new validator may open the original four-path
Intro-05 integration slice.

Two independent read-only contract reviews accept this representation boundary with
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. One verifies field taxonomy, modifiers,
grammar, event projection, and evidence wording; the other traces the specified
observations against current Core lower-bound, landing, completion, and replay reads.
This acceptance opens only the three named implementation/test paths after the docs
checkpoint is committed; it does not accept an implementation or authorize a proof run.

## T37 final experience backlog

After the complete 5/25/16 Endgame curriculum is published and verified, the final
experience stage must revisit line clearing before the deferred site icon. One-through-four
line clears need visibly increasing reward feedback derived from the achieved clear count,
and the accepted classic row-clear presentation needs a longer readable duration. Exact
timings, reward grammar, audio alignment, reduced-motion behavior, and scoring boundaries
remain design work for that final stage; no interim curriculum slice may silently change
them.

## T37 F4E-R3-H1 certificate fingerprint synchronization

The active `endgame` namespace changes the canonical JSON field names included by
`stateHash`; therefore fingerprints produced before the atomic namespace switch cannot
be reused as current-state certificates. This correction is admissible only where an
uncapped exact rerun proves that every non-hash proof and replay field remains unchanged.

The post-F4E-R3 exact run satisfies that condition for five mastery cases. The current
fingerprints are `b9d99302` (`t5r-arc-13`), `a5cb7240`
(`t5r-current-12`), `845c1bd0` (`t5r-prism-11`), `9aff892c`
(the canonical one-anchor `t5r-drift-08` admission), and `79e3ebac` (its test-only
two-anchor admission). These are serialization fingerprints, not gameplay design
changes. The corresponding routes, optimums, frontiers, transitions, prunes, and final
states are frozen and must remain byte-for-byte equal to their existing expectations.

Only `src/endgameMastery.ts` and
`src/game/core/endgameMasteryExact.test.ts` may change, and only those five literals.
The general hash function, proof codec, engine, definitions, test routes, fixture data,
and historical status records remain untouched. A focused mastery exact rerun plus the
complete six-file exact gate, ordinary project gates, and independent range review are
required before the fingerprints become accepted current facts.

Disposition: accepted candidate `e09526b..d467744` passes all focused, exact, ordinary,
typecheck, and build gates, and independent final QA reports P0–P3/GAP all zero. The
key-frontier representation and all five current-namespace fingerprints are now the
authoritative proof base. A successor Intro-05 validator must pin this accepted Core
tree and its own newly reviewed bytes; no executable permission, heap allowance, output
path, or byte pin from the retired validator is inherited.

## T37 F4E-R4A successor-validator generation contract

The successor validator is a newly generated external capability, not a patch-in-place
or rerun of the retired v1 file. Its generation base is accepted HEAD
`7d81d4974ce8fb777ea105c5ef98d156cd1807cc` and Core tree
`96688eca803a335790d65b41db0ace4df7d2f9b5`. The sole data input remains the existing
633-byte clue at
`C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json`, SHA-256
`959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42`.

Only the following not-yet-created path may be written during generation:

`C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v2.mjs`

The generator/editor may read v1 solely to preserve its already reviewed semantic
checks. V2 must:

- require `--expect-repo-base` as a full lowercase 40-hex commit equal to
  `4172a79620cda33e167d291d38c69f0ed64fec89`; resolve it as a commit and require it to
  be an ancestor of actual HEAD; capture actual HEAD at startup, require it unchanged
  after proof, and record it in candidate `sourcePin`;
- bind exact root, accepted Core-base ancestry and tree, clue bytes/hash, validator self
  hash, and module hashes;
- allow committed descendants of repository base `4172a79620cda33e167d291d38c69f0ed64fec89`
  only in `docs/CURRENT_TASK.md`, `docs/DESIGN.md`,
  `docs/agent-runs/t37-unified-sensory-curriculum/STATE.md`, and
  `docs/workstreams/tetris-t37-endgame/THREAD_LOG.md`; reject rename ambiguity and every
  other committed path;
- structurally parse the bounded clue and rebuild the eight-drop four-row definition,
  live-50 plus four-draft admission, two uniquely reconstructible public-command routes,
  Current/Next-1/Next-2 chain, two immediately-prior-lock support relations per route,
  later multi-event four-row release, hashes, and schema-8 fixture candidate;
- call the public complete `exhaustiveEndgameLandings` and uncapped
  `certifyOptimalEndgameRouteForDefinition`, assert no Hold command, no beam/state cap,
  exact route reconstruction, optimum equality, and literal certificate/replay evidence;
- assert the proof-only testing seam is absent from the public Core index; use no private
  testing export to compute candidate evidence;
- load current Core through a single `configFile:false`, plugin-empty middleware Vite
  server; close it successfully before publication; then repeat HEAD/Core/worktree/module,
  clue, self, and output-absence checks;
- serialize one canonical UTF-8/LF v2 payload, exclusively create a random same-directory
  staging file, publish with a same-volume hard link that fails if the final path exists,
  then allow only best-effort cleanup of the owned staging path; cleanup failure must be
  swallowed and cannot change command success or final output, and no further operation
  may run after that cleanup attempt.

V2 has no resume/checkpoint, heap flag, alternate route, cap, beam, reduced proof domain,
or old-output compatibility. Generation cannot execute it or create candidate/staging
output. Once generated, only syntax/help checks are allowed. These documents must then
freeze exact bytes/hash and a wholly new initially absent v2 output path; two independent
reviews must accept both the byte-level program and semantic contract before a later
docs checkpoint can authorize exactly one command.

The first generated candidate (26,441 bytes, SHA-256
`3741327B110C8C9BD1D5F14C566BCDF1867DFF9A9A71DDEB4ED2E60213213B9B`) is rejected
and must not run. Its pre/post `--expect-head` equality is individually strict but
operationally impossible because the later docs commit containing that literal cannot
know its own SHA before its content is fixed. The reviewed repair uses the known
generation-contract commit as `--expect-repo-base`, exact descendant paths, and a
captured stable actual HEAD. It does not relax Core, module, input, self, proof, output,
or publication checks.

## T37 F4E-R4B historical validator bytes and rejected command

Historically static-accepted external bytes, now rejected by governing command QA:

- path:
  `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v2.mjs`;
- bytes: `26,928`;
- SHA-256: `9EA5177E0D589431EAC393951FD78F1F6015CB8D37EF28E27566BE8623BBA762`;
- static gates: UTF-8/LF/no BOM, `node --check`, `--help`, v2 output/staging/process zero;
- independent review: two byte/semantic passes, both
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.

The following command candidate is retained only as rejected history and must not run:

```powershell
node "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v2.mjs" `
  --root "E:\Proj\reproduction-tetris" `
  --input "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json" `
  --output "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v2.json" `
  --expect-core-base 7d81d4974ce8fb777ea105c5ef98d156cd1807cc `
  --expect-repo-base 4172a79620cda33e167d291d38c69f0ed64fec89 `
  --expect-core-tree 96688eca803a335790d65b41db0ace4df7d2f9b5 `
  --expect-input-bytes 633 `
  --expect-input-sha 959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42 `
  --expect-validator-sha 9EA5177E0D589431EAC393951FD78F1F6015CB8D37EF28E27566BE8623BBA762 `
  --id t3r-shaft-04 `
  --difficulty 5 `
  --target-rows 4 `
  --max-primary-locks 7 `
  --max-alternative-extra 2
```

This block has no execution authority. Its earlier proposed preflight would have
rechecked exact validator/clue bytes, absent final/staging,
zero matching validator Node processes, HEAD descendant paths, clean Core, and exact Core
tree. There is no dynamic memory threshold and no heap flag: key-frontier F4E-R3 is the
accepted memory repair. That proposed authorization condition was never met and is now
superseded; this bare command must never run. Only a later exact PowerShell wrapper for
newly frozen validator bytes can receive one proof-attempt claim. Independent output
audit must still rebuild hashes, schema, routes, causal evidence, admission,
certificate, source pins, and publication postconditions before the four-path Intro-05
integration contract can open.

### F4E-R4B command-gate rejection and second repair

The 26,928-byte validator with SHA-256
`9EA5177E0D589431EAC393951FD78F1F6015CB8D37EF28E27566BE8623BBA762` is rejected
and must not execute. The first adversarial command QA reports `P1 1 / P2 1`: allowed
net paths do not prove that the byte/command contract is committed, can hide
unauthorized intermediate changes later reverted, and omit four-document worktree
cleanliness. A second governing review reports `P1 2 / P2 1`: the repair still lacks a
persistent exactly-once receipt, does not bind the Node launcher environment, and does
not require NUL-safe path parsing.

The repaired validator derives this canonical line at runtime, using the shown exact
property order and literal runtime values:

```text
<reserved-manifest-token> {"schema":"t37-f4e-r4b-command-contract-v1","validatorPath":"<resolved-v2-path>","validatorBytes":<integer>,"validatorSha256":"<uppercase-sha>","nodeExecPath":"E:\\Nodejs\\node.exe","nodeVersion":"v24.12.0","nodeVersionsNode":"24.12.0","nodeExecutableBytes":89935872,"nodeExecutableSha256":"2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8","nodeHeapSizeLimit":4496293888,"nodeExecArgv":[],"nodeOptionsPresent":false,"gitExecPath":"E:\\Git\\mingw64\\bin\\git.exe","gitVersion":"git version 2.51.0.windows.2","gitExecutableBytes":4284816,"gitExecutableSha256":"E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9","inheritedGitEnvironmentKeys":[],"root":"<resolved-root>","inputPath":"<resolved-clue-path>","outputPath":"<resolved-v2-output-path>","attemptPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-attempt-v2.json","expectCoreBase":"<full-sha>","expectRepositoryBase":"<full-sha>","expectCoreTree":"<tree-sha>","expectInputBytes":633,"expectInputSha256":"<uppercase-sha>","id":"t3r-shaft-04","difficulty":5,"targetRows":4,"maxPrimaryLocks":7,"maxAlternativeExtra":2}
```

After repaired bytes are frozen, committed HEAD `DESIGN.md` contains exactly one fully
materialized literal line. Each of CURRENT_TASK, DESIGN, STATE, and the T37 Endgame
THREAD_LOG also contains exactly one literal short marker:

```text
<reserved-marker-token> validator=<uppercase repaired validator SHA-256>
```

V2 reads committed blobs with `git show <captured-head>:<path>` and never trusts working
text. It walks from captured HEAD back to the fixed repository base through at most 64
single-parent commits. Every parent-to-child `diff-tree --no-renames` record must be
status `M` on an authorized contract path, and the accumulated union must equal the exact
four-path set. Merge commits, add/delete/type/rename statuses, missing paths, or a chain
that does not reach the base fail closed. Before and after proof, actual HEAD and all
committed marker/manifest bytes must match the captured values; scoped `git diff HEAD`
and porcelain status for all four contract paths must be empty. Output `sourcePin` records
the ordered audited commits and per-commit paths. No other proof or publication behavior
changes.

### F4E-R4B fail-closed launcher, attempt, and path-byte contract

The successor adds required absolute CLI argument `--attempt` whose only admitted
resolved value is the hard-coded path
`C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v2.json`.
It must differ from validator, clue, output, and every output staging name. Both the
coordinator preflight and validator startup require final output, staging, and attempt
`lstat`-absent: files, directories, symlinks, dangling links, and reparse points all
count as present. Help and syntax inspection do not create it; a production invocation
that finds it present exits before project imports, Vite, or proof.

The future exact PowerShell command is a fail-closed script block, not a bare `node`
invocation. It first enumerates the Env provider case-insensitively and throws if any
`NODE_OPTIONS` key exists, including an empty-valued key; verifies absolute
`E:\Nodejs\node.exe` as exactly 89,935,872 bytes with SHA-256
`2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8`;
then invokes that absolute executable. It never clears or rewrites launcher variables.

The validator checks the launcher before any project import and again immediately
before output publication. `process.execArgv` must equal `[]`; no case-insensitive
`NODE_OPTIONS` key may exist. `realpath(process.execPath)` must be exactly the frozen
Node executable, `process.version` must be `v24.12.0`, `process.versions.node` must be
`24.12.0`, the executable bytes/hash must match, and
`v8.getHeapStatistics().heap_size_limit` must be the default `4496293888`. The canonical
committed manifest binds every value; the attempt receipt and successful `sourcePin`
repeat them. This PowerShell-before-spawn check plus the heap/executable pins closes a
preload that deletes its own `NODE_OPTIONS` evidence before the main module starts.

After self, launcher, argument, repository-history, committed-doc/worktree, Core tree,
input, and output-absence pins pass—and before dynamic project/Vite import, server
creation, or proof—the validator constructs one canonical UTF-8/LF JSON receipt with
schema `t37-f4e-r4b-attempt-v1`. It binds the command-manifest SHA-256, validator
identity, all resolved validator/root/input/output/attempt paths, captured HEAD,
repository/Core/tree/input pins, proof parameters, and launcher fields; an outer
`payloadSha256` covers the fixed-order receipt payload. It opens the fixed receipt with
exclusive `wx` mode `0o600`, writes the complete bytes, calls file-handle `sync`, and
keeps that same handle open through publication. It records handle `dev`/`ino` when
available plus the path `lstat`; before and after proof it reads through both the handle
at position zero and the fixed path, requiring identical bytes/hash and unchanged
identity. It never unlinks, truncates, replaces, or updates that path. If
creation/write/sync/read/close or any later operation fails, even leaving only a partial
receipt, the attempt remains consumed and no retry is authorized. Successful
`sourcePin` records attempt path, byte count, uppercase SHA-256, `payloadSha256`, and
available identity fields; independent output QA reproduces them. Receipt-handle close
after publication is best-effort resource release and cannot reopen or replace the run.

Exactly-once is a proof-attempt state machine, not a claim that malformed CLI inspection
consumes the run. Before successful `wx`, only bounded read-only validation may occur and
no project/Vite/proof code may execute. Receipt absent/output absent permits the one
claim; any receipt presence (even empty/partial) consumes it forever; receipt plus output
opens audit only; output without receipt is invalid; any output staging residue is a
stop-and-audit condition and is never cleaned to regain a run. Receipt deletion,
replacement, rollback, or Temp cleanup is a governance violation, not restored
authorization. File-system snapshots/admin tampering are outside the local receipt's
ordinary crash/concurrency guarantee.

Every history edge is obtained as a raw buffer from
`git diff-tree --no-commit-id --name-status -r --no-renames -z <parent> <child> --`.
Fatal UTF-8 decoding must succeed, the buffer must end in NUL, dropping only that final
empty token must leave a nonempty even token count, and each consecutive pair is exactly
`status,path`. Status must be literal `M`; path must equal one of the four ASCII contract
paths. Newlines, tabs, quoting, invalid UTF-8, extra fields, empty records, or any other
status/path fail closed. A path token must match an allowed ASCII byte sequence directly,
then also survive fatal UTF-8 decode and byte-for-byte round-trip; duplicates within an
edge are rejected. The single-parent walk itself uses strict full-SHA parent
records, reaches the fixed base within 64 edges, and reverses its collected edges for a
base-to-HEAD `sourcePin` audit chain whose path union is exactly all four paths. Scoped
porcelain is likewise `--porcelain=v1 -z` and raw-buffer parsed.

Every Git subprocess invokes the frozen implementation backend directly at absolute
`E:\Git\mingw64\bin\git.exe`, never the 46-KiB `cmd\git.exe` launcher. Its version is
`git version 2.51.0.windows.2`, byte count is `4,284,816`, and SHA-256 is
`E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9`.
The validator hashes that backend before every Git audit batch and again before
publication. These pins and the inherited-Git-environment empty set enter manifest,
receipt, and output. Each invocation also passes `-c core.fsmonitor=false`,
`-c core.untrackedCache=false`, and `-c core.hooksPath=NUL`.

Every Git subprocess receives a constructed environment that drops repository/object/
index/config redirection variables and sets `GIT_NO_REPLACE_OBJECTS=1` and
`GIT_OPTIONAL_LOCKS=0`; startup rejects any inherited case-insensitive `GIT_*` key not
explicitly admitted. The validator requires `rev-parse --show-toplevel` to resolve to
the exact root, no replace refs, no `.git/info/grafts`, and no
`.git/objects/info/alternates`. The same checks repeat before publication. This audit
does not claim to reconstruct transient uncommitted edits; it proves the committed
single-parent snapshots and current scoped worktree named by the contract.

Only after this four-document contract receives fresh all-zero independent review and
is committed may the repository-external v2 bytes be changed. Those new bytes then need
syntax/help/absence checks and two fresh exact-byte reviews. A later four-doc checkpoint
must materialize the repaired SHA marker and exact manifest (including `--attempt` and
launcher identity) before the one production invocation can be considered.

Fresh independent final contract reviews report
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` twice. They specifically accept the direct Git
backend identity and the same receipt handle being held through proof/publication. The
four-doc contract checkpoint may now be committed; validator editing, not execution, is
the only capability that commit opens.

### F4E-R4B implementation-domain clarification

Receipt identity has no circular self-write. The immutable pre-claim `receiptPayload`
contains no `dev` or `ino`; after exclusive creation, the validator captures identity
from the held file handle and fixed path, retains it in memory for double-read checks,
and records it only in a successful candidate `sourcePin`. The receipt bytes are never
updated to add identity.

Output staging remains random and same-directory, with the exact enumerable basename
prefix `${basename(outputPath)}.tmp-` followed by process id and one UUID. Before claim,
`readdir(outputDirectory)` must contain zero names with that prefix; the generated one
path must also be `lstat`-absent. That exact staging path is included in the immutable
receipt payload and successful `sourcePin`. Once claimed, any unexpected matching name,
collision, or residual stage fails closed and cannot regain execution authority.

Hash domains are byte-exact: `commandManifestSha256` hashes the complete materialized
manifest line followed by one LF byte; receipt `payloadSha256` hashes
`JSON.stringify(receiptPayload)` followed by one LF byte. The complete receipt is
`JSON.stringify({schema, payload, payloadSha256})` plus one LF. All use UTF-8 and
uppercase SHA-256 when recorded in manifest/receipt/output pins.

### F4E-R4D post-publication tail precedence

For the repaired receipt-bearing v2 only, this paragraph supersedes F4E-R4A solely for
operations after a successful no-replace hard link; every other R4A proof and
publication invariant remains frozen. The exact permitted tail is: (1) require final-path
bytes to equal the already-frozen canonical output; (2) through the still-held receipt
handle and fixed receipt path, repeat receipt byte/hash/identity equality; (3)
best-effort close that held handle; and (4) make exactly one best-effort unlink attempt
for the owned staging path. Failure in step 1 or 2 fails closed and leaves output,
receipt, and staging for audit. Failure in step 3 or 4 is swallowed and cannot alter an
otherwise successful publication. Step 4 is terminal and nothing follows it. No other
post-link Git, Core, module, input, proof, serialization, write, mutation, or cleanup
operation is permitted.

### F4E-R4E self-contained HEAD-blob Core loader

The 46,755-byte external candidate with SHA-256
`7FE655B13B741ABD3141FBB11B12A562BB3CE8D964CD567D444CE75026461766`
is rejected and must not execute. Its `createRequire(...).resolve('vite')` path trusts
ignored, unpinned `node_modules` and transformer environment, so Core blob checks do not
authenticate the code that produced proof. Its post-claim pre-link cleanup can also erase
staging evidence. Both defects are P1.

Receipt-bearing v2 now removes every `createRequire`, `require.resolve`, Vite server, SSR
transform, and `node_modules` dependency. All other R4 proof, receipt, history, pin, and
publication invariants remain frozen. With pinned Node 24.12.0 built-ins and direct Git
backend only, it enumerates exactly 16 regular HEAD blobs under `src/game/core`: every
`*.ts`, excluding `*.test.ts`, ordered by ascending raw ASCII Git-path bytes. Each URL is
exactly `t37-f4e-core:<40-lowercase-Core-tree>/<Git-path>` with no authority, percent
encoding, query, or fragment. Before claim it reads captured-HEAD bytes, fatally decodes
UTF-8, and creates fixed-order fields `path`, `canonicalUrl`, `blobId`, `rawBytes`,
`rawSha256`, `transformedBytes`, `transformedSha256`. Transform is
`stripTypeScriptTypes(source,{mode:'transform',sourceMap:false,sourceUrl:canonicalUrl})`.
Manifest hash is uppercase SHA-256 over UTF-8 `JSON.stringify(entries)` plus LF; entries
and hash enter receipt/sourcePin and are reproduced from captured HEAD after proof.

After claim, one synchronous `registerHooks` resolver/loader admits exact entry URLs only
in order `index.ts`, `endgameRouteSearch.ts`, `endgameFingerprints.ts`, then
`endgameV3IntroDefinitions.ts`. Non-entry specifiers must match
`^\./[A-Za-z][A-Za-z0-9]*$`; parent URL and same-directory `${basename}.ts` target must
both be in the frozen map. Packages, built-ins, other URLs/paths, backslashes, percent/NUL
bytes, query/fragment, extra slash/dot, tests, and JSON fail. Hooks never delegate, perform
I/O, inspect packages, or retransform; they return only canonical URLs and original
preclaim transformed-memory bytes with `shortCircuit:true` and `format:'module'`.

The pair remains registered through proof and every post-proof namespace use. One
enclosing `try/finally` synchronously deregisters before staging creation. Any registration,
import, proof, post-proof manifest reproduction, or deregistration failure aborts. No later
project import/require/loader/transform/node_modules access is permitted.

Wrapper and validator reject every case-insensitive `NODE_*` key except this ordered
allowlist, whose UTF-8 values are byte/hash-pinned without serializing values:
`NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S`, 129 bytes,
`36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1`; then
`NODE_REPL_TRUSTED_CODE_PATHS`, 25 bytes,
`C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D`. This exact
`{name,bytes,sha256}` array follows `nodeOptionsPresent` in manifest, receipt, and output,
excluding every loader/cache/path/coverage/warning-suppression variable. The pinned
experimental warning may appear on stderr but is never suppressed or proof data. Exact
Node pins remain mandatory because transform output is version-sensitive.

Once a post-claim staging file is successfully created, a failure before hard link must
leave receipt and staging unchanged for audit. No `finally` or error path may unlink it.
Only F4E-R4D step 4 may attempt the terminal unlink after all post-link verification and
best-effort receipt close. Production execution remains closed until this four-document
contract is independently accepted/committed and repaired bytes pass two fresh reviews.

### F4E-R4F exact command materialization candidate

The repaired external validator is frozen at 51,909 UTF-8/LF bytes with SHA-256
`17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A`.
Static syntax/help/absence gates pass. Three independent reviews of these exact bytes—full
contract, Node loader, and publication state machine—each report
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` without running the validator. Independent
transformation of all 16 captured-HEAD Core blobs reproduces manifest SHA-256
`812F68F7642859B5EFCA8EC8FB0062E63F7A06942A118FDE150A92E325044CD4`.

F4E-R4B-COMMAND-CONTRACT-V1 validator=17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A

The following is the sole canonical command-manifest line. Including its one trailing LF,
it is exactly 1,824 UTF-8 bytes with SHA-256
`29BA027DA237B62BB7AC1459053C37299BC85B76F37A2A6416E9F2F71DBDA139`.

```text
F4E-R4B-COMMAND-MANIFEST-V1 {"schema":"t37-f4e-r4b-command-contract-v1","validatorPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-validate-v2.mjs","validatorBytes":51909,"validatorSha256":"17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A","nodeExecPath":"E:\\Nodejs\\node.exe","nodeVersion":"v24.12.0","nodeVersionsNode":"24.12.0","nodeExecutableBytes":89935872,"nodeExecutableSha256":"2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8","nodeHeapSizeLimit":4496293888,"nodeExecArgv":[],"nodeOptionsPresent":false,"nodeEnvironment":[{"name":"NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S","bytes":129,"sha256":"36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1"},{"name":"NODE_REPL_TRUSTED_CODE_PATHS","bytes":25,"sha256":"C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D"}],"gitExecPath":"E:\\Git\\mingw64\\bin\\git.exe","gitVersion":"git version 2.51.0.windows.2","gitExecutableBytes":4284816,"gitExecutableSha256":"E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9","inheritedGitEnvironmentKeys":[],"root":"E:\\Proj\\reproduction-tetris","inputPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-clue-v1.json","outputPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-candidate-v2.json","attemptPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-attempt-v2.json","expectCoreBase":"7d81d4974ce8fb777ea105c5ef98d156cd1807cc","expectRepositoryBase":"4172a79620cda33e167d291d38c69f0ed64fec89","expectCoreTree":"96688eca803a335790d65b41db0ace4df7d2f9b5","expectInputBytes":633,"expectInputSha256":"959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42","id":"t3r-shaft-04","difficulty":5,"targetRows":4,"maxPrimaryLocks":7,"maxAlternativeExtra":2}
```

The sole proposed production invocation is this exact fail-closed PowerShell block. It
does not clear or rewrite environment values. Before spawning, it requires the exact two
byte/hash-pinned `NODE_*` entries and no `GIT_*` entries; pins the regular non-reparse
Node, Git, validator, and clue files; requires final output, fixed receipt, every matching
stage, and every matching validator process absent; verifies the exact repository root,
Core tree, branch, and clean four-document scope through the fixed Git backend; then
invokes absolute Node once with no Node flags. Any preflight failure occurs before the
attempt receipt claim and is not an invocation. Any spawned failure consumes the attempt
and the block must not be rerun.

The rejected first draft matched only the full long backslash path and could miss the same
script launched with forward slashes, a relative path, or its 8.3 alias. The repaired block
binds the actual file's unique `CIM_DataFile.EightDotThreeFileName` basename
`T312A0~1.MJS`; it rejects any `node.exe` whose command line is unreadable or contains the
long or short basename case-insensitively. Long-backslash, forward-slash, short-directory,
relative-long, relative-short, case-variant, and null-command-line probes all fail closed.

```powershell
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$node = 'E:\Nodejs\node.exe'
$git = 'E:\Git\mingw64\bin\git.exe'
$root = 'E:\Proj\reproduction-tetris'
$validator = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v2.mjs'
$input = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json'
$output = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v2.json'
$attempt = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v2.json'
$expectedNodeEnvironment = @(
  @{ Name = 'NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S'; Bytes = 129; Sha256 = '36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1' },
  @{ Name = 'NODE_REPL_TRUSTED_CODE_PATHS'; Bytes = 25; Sha256 = 'C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D' }
)

function Assert-RegularFilePin([string] $Path, [long] $Bytes, [string] $Sha256) {
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
  if ($item.PSIsContainer -or (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) -or $item.Length -ne $Bytes) {
    throw "File identity differs: $Path"
  }
  if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -cne $Sha256) {
    throw "File SHA-256 differs: $Path"
  }
}

function Assert-LstatAbsent([string] $Path) {
  try {
    $null = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    throw "Path is present: $Path"
  } catch [System.Management.Automation.ItemNotFoundException] {
    return
  }
}

$actualNodeEnvironment = @(
  Get-ChildItem Env: | Where-Object {
    $_.Name.StartsWith('NODE_', [System.StringComparison]::OrdinalIgnoreCase)
  } | Sort-Object Name
)
if ($actualNodeEnvironment.Count -ne $expectedNodeEnvironment.Count) {
  throw 'NODE_* key set differs.'
}
for ($index = 0; $index -lt $expectedNodeEnvironment.Count; $index += 1) {
  $actual = $actualNodeEnvironment[$index]
  $expected = $expectedNodeEnvironment[$index]
  if ($actual.Name -cne $expected.Name) {
    throw 'NODE_* key spelling or order differs.'
  }
  $valueBytes = [System.Text.Encoding]::UTF8.GetBytes([string] $actual.Value)
  $valueSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($valueBytes))
  if ($valueBytes.Length -ne $expected.Bytes -or $valueSha256 -cne $expected.Sha256) {
    throw "NODE_* value pin differs: $($actual.Name)"
  }
}
if (@(Get-ChildItem Env: | Where-Object {
  $_.Name.StartsWith('GIT_', [System.StringComparison]::OrdinalIgnoreCase)
}).Count -ne 0) {
  throw 'Inherited GIT_* variables must be absent.'
}

Assert-RegularFilePin $node 89935872 '2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8'
Assert-RegularFilePin $git 4284816 'E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9'
Assert-RegularFilePin $validator 51909 '17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A'
Assert-RegularFilePin $input 633 '959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42'
Assert-LstatAbsent $output
Assert-LstatAbsent $attempt

$outputDirectory = [System.IO.Path]::GetDirectoryName($output)
$stagePrefix = [System.IO.Path]::GetFileName($output) + '.tmp-'
if (@(Get-ChildItem -LiteralPath $outputDirectory -Force | Where-Object {
  $_.Name.StartsWith($stagePrefix, [System.StringComparison]::Ordinal)
}).Count -ne 0) {
  throw 'Output staging residue exists.'
}
$validatorBasenames = @(
  [System.IO.Path]::GetFileName($validator),
  'T312A0~1.MJS'
)
$validatorCimName = $validator.Replace('\', '\\').Replace("'", "''")
$validatorFileIdentity = @(Get-CimInstance CIM_DataFile -Filter "Name='$validatorCimName'")
if ($validatorFileIdentity.Count -ne 1 -or
    -not [System.IO.Path]::GetFileName([string] $validatorFileIdentity[0].EightDotThreeFileName).Equals(
      $validatorBasenames[1],
      [System.StringComparison]::OrdinalIgnoreCase
    )) {
  throw 'Validator short-path identity differs.'
}
foreach ($nodeProcess in @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")) {
  if ([string]::IsNullOrEmpty([string] $nodeProcess.CommandLine)) {
    throw "Cannot prove Node process $($nodeProcess.ProcessId) is unrelated."
  }
  if (@($validatorBasenames | Where-Object {
    $nodeProcess.CommandLine.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  }).Count -ne 0) {
    throw "A validator-named Node process already exists: $($nodeProcess.ProcessId)"
  }
}

$gitPrefix = @('-C', $root, '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-c', 'core.hooksPath=NUL')
$topLevel = & $git @gitPrefix rev-parse --show-toplevel
$normalizedTopLevel = [System.IO.Path]::GetFullPath([string] $topLevel).TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
)
$normalizedRoot = [System.IO.Path]::GetFullPath($root).TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
)
if ($LASTEXITCODE -ne 0 -or @($topLevel).Count -ne 1 -or $normalizedTopLevel -cne $normalizedRoot) {
  throw 'Repository root differs.'
}
$branch = & $git @gitPrefix branch --show-current
if ($LASTEXITCODE -ne 0 -or @($branch).Count -ne 1 -or $branch -cne 'main') {
  throw 'Repository branch differs.'
}
$coreTree = & $git @gitPrefix rev-parse HEAD:src/game/core
if ($LASTEXITCODE -ne 0 -or @($coreTree).Count -ne 1 -or $coreTree -cne '96688eca803a335790d65b41db0ace4df7d2f9b5') {
  throw 'Core tree differs.'
}
$scopedPaths = @(
  'src/game/core',
  'docs/CURRENT_TASK.md',
  'docs/DESIGN.md',
  'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md',
  'docs/workstreams/tetris-t37-endgame/THREAD_LOG.md'
)
& $git @gitPrefix diff --quiet HEAD -- @scopedPaths
if ($LASTEXITCODE -ne 0) {
  throw 'Core or command-contract tracked worktree is not clean.'
}
$scopedStatus = @(& $git @gitPrefix status --porcelain=v1 --untracked-files=all --ignored=matching -- @scopedPaths)
if ($LASTEXITCODE -ne 0 -or $scopedStatus.Count -ne 0) {
  throw 'Core or command-contract scoped status is not clean.'
}

$validatorArguments = @(
  $validator,
  '--root', $root,
  '--input', $input,
  '--output', $output,
  '--attempt', $attempt,
  '--expect-core-base', '7d81d4974ce8fb777ea105c5ef98d156cd1807cc',
  '--expect-repo-base', '4172a79620cda33e167d291d38c69f0ed64fec89',
  '--expect-core-tree', '96688eca803a335790d65b41db0ace4df7d2f9b5',
  '--expect-input-bytes', '633',
  '--expect-input-sha', '959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42',
  '--expect-validator-sha', '17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A',
  '--id', 't3r-shaft-04',
  '--difficulty', '5',
  '--target-rows', '4',
  '--max-primary-locks', '7',
  '--max-alternative-extra', '2'
)
& $node @validatorArguments
if ($LASTEXITCODE -ne 0) {
  throw "The sole validator attempt failed with exit code $LASTEXITCODE. Do not retry."
}
```

The output, attempt receipt, matching stage set, and matching validator process are all
currently absent. This block has no execution authority until the exact four-document
materialization receives independent all-zero review and is committed. After that commit,
the coordinator may repeat the same read-only preflight immediately and invoke this block
once only if every check is green.

### F4E-R4G consumed-v2 disposition and EOL-safe worktree authority

The exact R4F command was committed at
`4d297149fab5b4e4c1f510a96b8b4b7e464155ce` and spawned once. It failed before the
exclusive receipt open because v2 directly hashed checkout bytes and compared them with
the LF HEAD blob. `docs/CURRENT_TASK.md` and `docs/DESIGN.md` are legal mixed-CRLF
representations under the machine's `core.autocrlf=true`; fixed Git reports the scoped
tree clean, and filtered `git hash-object --path` reproduces all four HEAD blobs. This
diagnostic does not become proof authority. Output, attempt receipt, stage, and matching
process remain absent, but the v2 authorization is consumed. The exact v2 file is retained
unchanged for audit and its validator, marker, manifest, and wrapper are permanently
non-executable.

The successor namespace is disjoint:

- validator: `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v3.mjs`;
- output: `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v3.json`;
- receipt: `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v3.json`;
- stage prefix: `t37-f4e-endgame-canonical-candidate-v3.json.tmp-`;
- marker/manifest prefixes: `F4E-R4G-COMMAND-CONTRACT-V1 validator=` and
  `F4E-R4G-COMMAND-MANIFEST-V1 `;
- command-manifest JSON schema: `t37-f4e-r4g-command-contract-v1`;
- receipt/output schemas: `t37-f4e-r4g-attempt-v1` and
  `t37-f4e-endgame-canonical-candidate-v3`;
- scoped-clean policy: `head-blob-eol-equivalent-v1`.

For each path in the captured HEAD scoped tree, v3 obtains the expected blob bytes through
the already pinned raw Git backend. For the worktree observation it opens each expected
path once, compares the path `lstat` and handle `fstat` identity before reading, reads from
that handle, repeats handle/path identity after reading, and requires a regular
non-symbolic-link entity throughout. `realpath(root)` and `realpath(file)` must map through
`relative(root,file)` to the exact expected Git path with no absolute result or `..`
segment; string-prefix containment is forbidden. The check rejects UTF-8 BOM and malformed
UTF-8, changes only byte sequence CRLF to LF, rejects every residual CR, and compares those
normalized bytes byte-for-byte with the captured HEAD blob. It never invokes attributes,
clean filters, `hash-object --path`, or worktree TypeScript. Existing `diff --quiet HEAD`
and NUL-safe porcelain checks remain. Recursive Core enumeration rejects extra/ignored
items, symbolic links, junction/path escapes, directories in place of tracked files, and
non-files. It does not claim to detect an otherwise ordinary same-content NTFS hard link
or every vendor-specific in-place reparse tag; neither can become proof input because the
loader reads captured HEAD only. This policy runs before receipt claim and again before
publication; the policy identifier is present in command manifest, immutable receipt, and
candidate output.

R4G changes only the one-shot execution namespace and scoped worktree-equivalence policy.
V3 inherits every other R4A–R4E rule without weakening: exact captured-HEAD module set and
transform manifest, no-delegation/no-I/O hooks through all post-proof namespace use,
exclusive synced immutable receipt before hooks/proof, post-claim staging preservation,
hard-link publication, final-path and held-receipt revalidation, best-effort receipt close,
then the sole terminal best-effort owned-stage unlink, plus all Node/Git/environment/
history/input/runtime pins.

All proof modules, contract markers, and transformed-module hashes remain sourced only
from captured HEAD blobs. The initial failure is therefore classified as a preclaim EOL
representation bug, not a failed certificate search or dirty Core. Before v3 exists, this
behavior contract requires independent all-zero review and an exact four-document commit.
The external v3 then requires syntax/help, deterministic CRLF/LF/mixed/BOM/isolated-CR/
malformed-UTF-8/link/extra-file probes and two fresh exact-byte semantic reviews. Only a
subsequent committed exact marker/manifest/wrapper checkpoint can grant one production
spawn only after an independent all-zero review binds that committed checkpoint's exact
bytes, manifest/hash, 8.3/alias/null-command-line matrix, PowerShell AST single-spawn shape,
and every preflight. The coordinator then repeats only the immediate read-only preflight
and, if green, uses the one spawn. There is no v2 retry or identity reuse.

### F4E-R4H exact v3 command materialization candidate

The external v3 validator is frozen at 57,181 UTF-8/LF/no-BOM bytes with SHA-256
`25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF`.
Syntax and help gates pass. A hash-bound 8,038-byte / SHA-256
`F4D04565D1CB4407C7D151B3ED191ADFAACEE86063B5311DE17F4C3EEE7CFCFB`
isolated matrix imports the same bytes without `main` and passes all 18 EOL, UTF-8,
scope-dirt, extra-entry, directory, junction, and path-escape cases. Three independent
exact-byte reviews report P0-P3/GAP all zero without production execution.

F4E-R4G-COMMAND-CONTRACT-V1 validator=25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF

The following is the sole canonical command-manifest line. Including its one trailing LF,
it is exactly 1,874 UTF-8 bytes with SHA-256
`8A30A76938B8CA9E148631AAAD97DDE68CB1F762BD29F803E56876CCE6BDA3AA`.

```text
F4E-R4G-COMMAND-MANIFEST-V1 {"schema":"t37-f4e-r4g-command-contract-v1","validatorPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-validate-v3.mjs","validatorBytes":57181,"validatorSha256":"25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF","nodeExecPath":"E:\\Nodejs\\node.exe","nodeVersion":"v24.12.0","nodeVersionsNode":"24.12.0","nodeExecutableBytes":89935872,"nodeExecutableSha256":"2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8","nodeHeapSizeLimit":4496293888,"nodeExecArgv":[],"nodeOptionsPresent":false,"nodeEnvironment":[{"name":"NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S","bytes":129,"sha256":"36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1"},{"name":"NODE_REPL_TRUSTED_CODE_PATHS","bytes":25,"sha256":"C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D"}],"gitExecPath":"E:\\Git\\mingw64\\bin\\git.exe","gitVersion":"git version 2.51.0.windows.2","gitExecutableBytes":4284816,"gitExecutableSha256":"E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9","inheritedGitEnvironmentKeys":[],"root":"E:\\Proj\\reproduction-tetris","inputPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-clue-v1.json","outputPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-candidate-v3.json","attemptPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-attempt-v3.json","scopedCleanPolicy":"head-blob-eol-equivalent-v1","expectCoreBase":"7d81d4974ce8fb777ea105c5ef98d156cd1807cc","expectRepositoryBase":"4172a79620cda33e167d291d38c69f0ed64fec89","expectCoreTree":"96688eca803a335790d65b41db0ace4df7d2f9b5","expectInputBytes":633,"expectInputSha256":"959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42","id":"t3r-shaft-04","difficulty":5,"targetRows":4,"maxPrimaryLocks":7,"maxAlternativeExtra":2}
```

The sole proposed production invocation is this exact fail-closed PowerShell block. It
does not clear or rewrite environment values. It pins the retired v2 bytes as audit
evidence as well as the v3 candidate, binds both actual 8.3 names, rejects any matching
Node process alias, and requires both generations' output/receipt/stage namespaces absent.
It then pins runtime, Git, clue, repository, Core tree, branch, and scoped cleanliness and
spawns only absolute Node with the v3 arguments once. Any spawned nonzero result consumes
v3 and the block must not be rerun.

```powershell
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$node = 'E:\Nodejs\node.exe'
$git = 'E:\Git\mingw64\bin\git.exe'
$root = 'E:\Proj\reproduction-tetris'
$retiredValidator = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v2.mjs'
$validator = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v3.mjs'
$input = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json'
$retiredOutput = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v2.json'
$retiredAttempt = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v2.json'
$output = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v3.json'
$attempt = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v3.json'
$expectedNodeEnvironment = @(
  @{ Name = 'NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S'; Bytes = 129; Sha256 = '36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1' },
  @{ Name = 'NODE_REPL_TRUSTED_CODE_PATHS'; Bytes = 25; Sha256 = 'C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D' }
)

function Assert-RegularFilePin([string] $Path, [long] $Bytes, [string] $Sha256) {
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
  if ($item.PSIsContainer -or (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) -or $item.Length -ne $Bytes) {
    throw "File identity differs: $Path"
  }
  if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -cne $Sha256) {
    throw "File SHA-256 differs: $Path"
  }
}

function Assert-LstatAbsent([string] $Path) {
  try {
    $null = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    throw "Path is present: $Path"
  } catch [System.Management.Automation.ItemNotFoundException] {
    return
  }
}

function Assert-NoStages([string] $OutputPath) {
  $directory = [System.IO.Path]::GetDirectoryName($OutputPath)
  $prefix = [System.IO.Path]::GetFileName($OutputPath) + '.tmp-'
  if (@(Get-ChildItem -LiteralPath $directory -Force -ErrorAction Stop | Where-Object {
    $_.Name.StartsWith($prefix, [System.StringComparison]::Ordinal)
  }).Count -ne 0) {
    throw "Output staging residue exists: $OutputPath"
  }
}

$actualNodeEnvironment = @(
  Get-ChildItem Env: | Where-Object {
    $_.Name.StartsWith('NODE_', [System.StringComparison]::OrdinalIgnoreCase)
  } | Sort-Object Name
)
if ($actualNodeEnvironment.Count -ne $expectedNodeEnvironment.Count) {
  throw 'NODE_* key set differs.'
}
for ($index = 0; $index -lt $expectedNodeEnvironment.Count; $index += 1) {
  $actual = $actualNodeEnvironment[$index]
  $expected = $expectedNodeEnvironment[$index]
  if ($actual.Name -cne $expected.Name) {
    throw 'NODE_* key spelling or order differs.'
  }
  $valueBytes = [System.Text.Encoding]::UTF8.GetBytes([string] $actual.Value)
  $valueSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($valueBytes))
  if ($valueBytes.Length -ne $expected.Bytes -or $valueSha256 -cne $expected.Sha256) {
    throw "NODE_* value pin differs: $($actual.Name)"
  }
}
if (@(Get-ChildItem Env: | Where-Object {
  $_.Name.StartsWith('GIT_', [System.StringComparison]::OrdinalIgnoreCase)
}).Count -ne 0) {
  throw 'Inherited GIT_* variables must be absent.'
}

Assert-RegularFilePin $node 89935872 '2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8'
Assert-RegularFilePin $git 4284816 'E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9'
Assert-RegularFilePin $retiredValidator 51909 '17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A'
Assert-RegularFilePin $validator 57181 '25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF'
Assert-RegularFilePin $input 633 '959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42'
Assert-LstatAbsent $retiredOutput
Assert-LstatAbsent $retiredAttempt
Assert-LstatAbsent $output
Assert-LstatAbsent $attempt
Assert-NoStages $retiredOutput
Assert-NoStages $output

$validatorIdentities = @(
  @{ Path = $retiredValidator; LongBase = 't37-f4e-endgame-canonical-validate-v2.mjs'; ShortBase = 'T312A0~1.MJS' },
  @{ Path = $validator; LongBase = 't37-f4e-endgame-canonical-validate-v3.mjs'; ShortBase = 'T367D4~1.MJS' }
)
$validatorBasenames = @()
foreach ($identity in $validatorIdentities) {
  $cimName = $identity.Path.Replace('\', '\\').Replace("'", "''")
  $rows = @(Get-CimInstance CIM_DataFile -Filter "Name='$cimName'")
  if ($rows.Count -ne 1 -or
      -not [System.IO.Path]::GetFileName([string] $rows[0].EightDotThreeFileName).Equals(
        $identity.ShortBase,
        [System.StringComparison]::OrdinalIgnoreCase
      )) {
    throw "Validator short-path identity differs: $($identity.Path)"
  }
  $validatorBasenames += $identity.LongBase
  $validatorBasenames += $identity.ShortBase
}
foreach ($nodeProcess in @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")) {
  if ([string]::IsNullOrEmpty([string] $nodeProcess.CommandLine)) {
    throw "Cannot prove Node process $($nodeProcess.ProcessId) is unrelated."
  }
  if (@($validatorBasenames | Where-Object {
    $nodeProcess.CommandLine.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  }).Count -ne 0) {
    throw "A validator-named Node process already exists: $($nodeProcess.ProcessId)"
  }
}

$gitPrefix = @('-C', $root, '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-c', 'core.hooksPath=NUL')
$topLevel = & $git @gitPrefix rev-parse --show-toplevel
$normalizedTopLevel = [System.IO.Path]::GetFullPath([string] $topLevel).TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
)
$normalizedRoot = [System.IO.Path]::GetFullPath($root).TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
)
if ($LASTEXITCODE -ne 0 -or @($topLevel).Count -ne 1 -or $normalizedTopLevel -cne $normalizedRoot) {
  throw 'Repository root differs.'
}
$branch = & $git @gitPrefix branch --show-current
if ($LASTEXITCODE -ne 0 -or @($branch).Count -ne 1 -or $branch -cne 'main') {
  throw 'Repository branch differs.'
}
$coreTree = & $git @gitPrefix rev-parse HEAD:src/game/core
if ($LASTEXITCODE -ne 0 -or @($coreTree).Count -ne 1 -or $coreTree -cne '96688eca803a335790d65b41db0ace4df7d2f9b5') {
  throw 'Core tree differs.'
}
$scopedPaths = @(
  'src/game/core',
  'docs/CURRENT_TASK.md',
  'docs/DESIGN.md',
  'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md',
  'docs/workstreams/tetris-t37-endgame/THREAD_LOG.md'
)
& $git @gitPrefix diff --quiet HEAD -- @scopedPaths
if ($LASTEXITCODE -ne 0) {
  throw 'Core or command-contract tracked worktree is not clean.'
}
$scopedStatus = @(& $git @gitPrefix status --porcelain=v1 --untracked-files=all --ignored=matching -- @scopedPaths)
if ($LASTEXITCODE -ne 0 -or $scopedStatus.Count -ne 0) {
  throw 'Core or command-contract scoped status is not clean.'
}

$validatorArguments = @(
  $validator,
  '--root', $root,
  '--input', $input,
  '--output', $output,
  '--attempt', $attempt,
  '--expect-core-base', '7d81d4974ce8fb777ea105c5ef98d156cd1807cc',
  '--expect-repo-base', '4172a79620cda33e167d291d38c69f0ed64fec89',
  '--expect-core-tree', '96688eca803a335790d65b41db0ace4df7d2f9b5',
  '--expect-input-bytes', '633',
  '--expect-input-sha', '959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42',
  '--expect-validator-sha', '25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF',
  '--id', 't3r-shaft-04',
  '--difficulty', '5',
  '--target-rows', '4',
  '--max-primary-locks', '7',
  '--max-alternative-extra', '2'
)
& $node @validatorArguments
if ($LASTEXITCODE -ne 0) {
  throw "The sole v3 validator attempt failed with exit code $LASTEXITCODE. Do not retry."
}
```

V2 and v3 output, attempt, stage, and matching-process sets are currently zero. This block
has no execution authority before exact four-document review/commit and the required
post-commit independent bytes/manifest/alias/AST/preflight all-zero review.

### F4E-R4I consumed v3 incident and v4 receipt recovery

R4I supersedes every R4H present-tense artifact-zero, execution-authority, and next-action
statement; the retained R4H block records the state before its sole run only.

The exact R4H contract commit is
`8911a9cf5e9356c3e8beb099f7db53aeb4944e51`. After three all-zero pre-commit reviews,
three all-zero post-commit reviews, an actual committed-prefix preflight pass, and an
18/18 clean-policy matrix pass, the coordinator invoked its committed wrapper once.
The v3 process created, wrote, and synced its receipt, then exited before Core loader
creation or proof with this exact chain:

```text
Error: EBADF: bad file descriptor, read
readReceiptFromHandle (validate-v3.mjs:697:27)
verifyReceipt (validate-v3.mjs:723:23)
main (validate-v3.mjs:873:30)
```

The code opened `attemptPath` with `open(..., 'wx', 0o600)` at line 870. In Node 24,
`wx` means write-only plus create/exclusive/truncate; the subsequent positional
`FileHandle.read` is invalid. `wx+` changes only access to read/write while retaining
exclusive create. On Windows both use `CREATE_NEW`, so an existing file still fails.
A current-runtime isolated probe passed all four required facts: 14 bytes written and
synced, 14 bytes read from the same handle, independent path bytes equal, and a second
`wx+` open failed with `EEXIST`; its temporary namespace residue was zero.

#### Frozen consumed-v3 evidence

V3 is terminally consumed and may never run again. Its only artifact is the immutable
attempt receipt at the exact path below. V3 output, matching stage, and process are absent.

```text
path=C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v3.json
bytes=8729
sha256=06E9EACE16C6665FF4220D0753F0DFD5875C742FC1F56C9767771B1CB5A53E44
schema=t37-f4e-r4g-attempt-v1
payloadSha256=E1B6669502DE6055157347A83116053EAF9621D74993038A3A882F9F06C5448B
dev=1456395446
ino=456270937248336975
size=8729
mode=33206
nlink=1
mtimeNs=1786600246711586100
ctimeNs=1786600246711586100
```

Those physical values were equal through fixed-path `lstat` and an independent read-only
handle. Atime is not an identity field because verification reads may update it. Every v4
preflight and validator boundary must use strict UTF-8/no-BOM receipt bytes, recompute the
outer SHA and JSON payload hash, require the exact schema and bound source pins, and bind
the exact regular non-symbolic-link path and realpath to all seven frozen identity fields.
The Windows PowerShell wrapper also requires the `ReparsePoint` file attribute to be
absent. Node's `lstat`/`realpath` checks do not claim detection of every vendor-defined
reparse tag; the wrapper's Windows attribute gate owns that broader platform check.
The v3 receipt may not be opened for write, truncated, renamed, unlinked, replaced, linked,
or cleaned. Any mismatch closes the current boundary without cleanup.

#### V4 namespace and receipt state machine

V4 is a wholly new generation, not a v3 retry or alias:

- validator: `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v4.mjs`;
- output: `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v4.json`;
- attempt: `C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v4.json`;
- stage prefix: `t37-f4e-endgame-canonical-candidate-v4.json.tmp-`;
- marker prefix: `F4E-R4I-COMMAND-CONTRACT-V1 validator=`;
- manifest prefix: `F4E-R4I-COMMAND-MANIFEST-V1 `;
- command schema: `t37-f4e-r4i-command-contract-v1`;
- receipt schema: `t37-f4e-r4i-attempt-v1`;
- output schema: `t37-f4e-endgame-canonical-candidate-v4`;
- receipt policy: `held-wx-plus-expanded-identity-v1`.

The v4 attempt handle is created exactly once with `open(attemptPath, 'wx+', 0o600)`.
V4 writes canonical receipt bytes once, syncs, and never writes through that handle again.
It pins `dev`, `ino`, `size`, `mode`, `nlink`, `mtimeNs`, and `ctimeNs` immediately after
sync. Each verification reads from position zero through the original held handle and
also reads the fixed path, requiring exact expected bytes/hash plus equality between held
handle stats, fixed-path `lstat`, and the original identity pin. Verification occurs
immediately after claim, after proof before stage creation, and after the final hard link.
The successful terminal tail then best-effort closes the held handle and performs its one
best-effort owned-stage unlink. On any failure after the v4 receipt is claimed, validator
code performs no recovery or terminal-tail operation and lets the process exit release its
OS handle; v4 receipt, output, and any stage are preserved, with no explicit close, unlink,
truncate, rename, replacement, cleanup, or retry. R4I does not supersede R4D failure-tail
precedence.

V4 otherwise changes no proof or publication semantics. It inherits the exact clue,
repository/Core bases, captured-HEAD-only Core loader and contract audit, EOL-equivalent
scoped-clean policy, environment/runtime/Git/history pins, stage `wx`, hard-link output,
final-path validation, and close-then-single-terminal-unlink ordering. Its manifest,
receipt, and output additionally include one `consumedV3Attempt` object containing every
frozen v3 evidence value above. The consumed v3 receipt is revalidated at exactly four
pre-link boundaries: wrapper preflight, v4 preclaim, post-proof before v4 stage creation,
and immediately before the output hard link after the owned-stage/runtime/Git gates. Any
mismatch closes that boundary. No code reads or stats the consumed v3 receipt after the
hard link; R4D's v4-own receipt/final-output/close/unlink tail remains terminal. Preflight
rejects all v2/v3/v4 long, slash, relative,
case, actual 8.3, and unreadable/null Node process identities, pins both retired validator
files, and requires v2 output/attempt/stage absent, the exact v3 receipt present with v3
output/stage absent, and every v4 artifact/stage absent before claim.

#### Required non-production matrices and authorization order

The hash-bound receipt matrix must use only fresh external temporary fixtures and leave
zero residue. Its mutation capability is a closure over one freshly created, canonical
fixture realpath beneath the canonical OS temp realpath. It accepts only normalized
relative fixture names, uses separator-aware `relative()` containment for every source,
target, parent, rename, link, open, chmod, and timestamp operation, and rejects absolute,
empty, dot/dot-dot, prefix-sibling, production-path, production-basename, and actual-8.3
aliases before mutation. Production v2/v3/v4 paths are read-only forbidden sentinels;
pre/post hashes and namespace inventories are defense in depth, not the path firewall.
The matrix must prove:

1. the frozen `wx` negative reproduces `EBADF` after write/sync;
2. `wx+` supports claim, sync, and all three held-handle/path verifications;
3. pre-existing empty and non-empty paths both return `EEXIST` without byte changes;
4. path replacement/rebinding is either denied by the OS or rejected by identity;
5. equal-length overwrite, truncate, append, timestamp/mode drift, and hard-link creation
   are rejected by bytes/hash/size or expanded identity;
6. partial/short write, short read, and sync failure stop before proof with no production
   recovery/tail action and preserve claimed receipt/stage evidence without cleanup;
7. every successful verification uses the original `wx+` handle, never a reopened proxy;
8. real v3 receipt and all production v2/v3/v4 namespaces remain untouched.

Production v4 imports the native filesystem operations into module-lexical bindings and
contains no injection parameter, CLI/environment switch, global hook, mutable operation
table, or test export. Static QA proves those absences. Fault cases are permitted only in
the matrix: it first pins the exact v4 bytes/hash, validates one-occurrence source anchors,
removes production `main` in memory, applies an allowlisted exact in-memory substitution
to fixture-only native-operation wrappers, records the derivative hash, and exports only
the receipt lifecycle to the matrix. It writes no derived source file and cannot import or
invoke production `main`. Every mutation wrapper is still gated by the fixture capability.
After each failure assertion, matrix-harness teardown may close only its own fixture handle
and remove only its capability-bound fixture root; that teardown is outside the derived
production lifecycle and must not make a failed production branch appear to close/clean.

First independently review and commit this four-document R4I behavior contract. Only then
may a writer derive external v4 from the frozen v3, change generation identities, repair
the receipt state machine above, and build the isolated matrices. Syntax/help, matrix,
two independent exact-byte/semantic reviews, v4 output/attempt/stage/process zero, and the
exact consumed v3 receipt present are required
before a later exact four-document marker/manifest/one-spawn checkpoint. That checkpoint
then requires post-commit committed-byte, three-generation alias/null, AST, v3 receipt,
full-preflight, and matrix all-zero QA. No v4 production execution is authorized now.

### F4E-R4K rejected R4J launcher and Windows lease-runner recovery contract

The repository-external v4 validator remains frozen at 63,777 UTF-8/LF/no-BOM bytes with
SHA-256 `93952536898D055B793E52A7957C821A51C26C78B0A87B5379D35B551349EC60`.
The 30,392-byte hash-bound receipt matrix remains frozen at SHA-256
`054A965DA2664C121697F3CDB1B79D5DE5735A37DA56AC3F4E65720207E20A1F`
and passes all 40 cases with zero fixture residue and unchanged production sentinels.
Those validator and matrix reviews remain valid.

R4J's uncommitted wrapper is rejected before production use. Its path-based hash checks
did not hold Node and Git file objects until launch, so a same-user concurrent replacement
could change the executable opened later. The rejected wrapper was never committed and
never ran v4 production arguments; v4 attempt/output/stage/process remain zero.

The first repair prototype,
`C:\Users\Alex Chen\AppData\Local\Temp\t37-r4k-windows-lease-runner-v1.cs`, is
33,556 UTF-8/LF bytes with SHA-256
`4693199A84376488F66467BEACE6FCA3850C567E1F885B103EEF884876A6DE37`.
It is non-authoritative and must never receive production arguments. Static QA reports
`P0 0 / P1 1 / P2 2 / P3 0 / GAP 1`: `File.OpenHandle` follows the final reparse point;
`GetProcessImageFileNameW` did not reject truncation; and pumps wrote directly to Console,
permitting output backpressure deadlock and nondeterministic exceptional cleanup.

F4E-R4I-COMMAND-CONTRACT-V1 validator=93952536898D055B793E52A7957C821A51C26C78B0A87B5379D35B551349EC60

The following line is unchanged from R4J. Including its one trailing LF, it remains
exactly 2,948 UTF-8 bytes with SHA-256
`ED1E1844320882DB31EE365C9270B660329FF0AC7D42487F9F4B6BB2F8B9FA51`.
It is only the validator-argument manifest; it does not authorize a process launch.

```text
F4E-R4I-COMMAND-MANIFEST-V1 {"schema":"t37-f4e-r4i-command-contract-v1","validatorPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-validate-v4.mjs","validatorBytes":63777,"validatorSha256":"93952536898D055B793E52A7957C821A51C26C78B0A87B5379D35B551349EC60","nodeExecPath":"E:\\Nodejs\\node.exe","nodeVersion":"v24.12.0","nodeVersionsNode":"24.12.0","nodeExecutableBytes":89935872,"nodeExecutableSha256":"2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8","nodeHeapSizeLimit":4496293888,"nodeExecArgv":[],"nodeOptionsPresent":false,"nodeEnvironment":[{"name":"NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S","bytes":129,"sha256":"36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1"},{"name":"NODE_REPL_TRUSTED_CODE_PATHS","bytes":25,"sha256":"C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D"}],"gitExecPath":"E:\\Git\\mingw64\\bin\\git.exe","gitVersion":"git version 2.51.0.windows.2","gitExecutableBytes":4284816,"gitExecutableSha256":"E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9","inheritedGitEnvironmentKeys":[],"root":"E:\\Proj\\reproduction-tetris","inputPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-clue-v1.json","outputPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-candidate-v4.json","attemptPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-attempt-v4.json","scopedCleanPolicy":"head-blob-eol-equivalent-v1","receiptPolicy":"held-wx-plus-expanded-identity-v1","consumedV3Attempt":{"path":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-attempt-v3.json","bytes":8729,"sha256":"06E9EACE16C6665FF4220D0753F0DFD5875C742FC1F56C9767771B1CB5A53E44","schema":"t37-f4e-r4g-attempt-v1","payloadSha256":"E1B6669502DE6055157347A83116053EAF9621D74993038A3A882F9F06C5448B","identity":{"dev":"1456395446","ino":"456270937248336975","size":"8729","mode":"33206","nlink":"1","mtimeNs":"1786600246711586100","ctimeNs":"1786600246711586100"},"sourcePin":{"commandManifestSha256":"8A30A76938B8CA9E148631AAAD97DDE68CB1F762BD29F803E56876CCE6BDA3AA","validatorPath":"C:\\Users\\Alex Chen\\AppData\\Local\\Temp\\t37-f4e-endgame-canonical-validate-v3.mjs","validatorBytes":57181,"validatorSha256":"25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF","head":"8911a9cf5e9356c3e8beb099f7db53aeb4944e51","repositoryBase":"4172a79620cda33e167d291d38c69f0ed64fec89","coreBase":"7d81d4974ce8fb777ea105c5ef98d156cd1807cc","coreTree":"96688eca803a335790d65b41db0ace4df7d2f9b5"}},"expectCoreBase":"7d81d4974ce8fb777ea105c5ef98d156cd1807cc","expectRepositoryBase":"4172a79620cda33e167d291d38c69f0ed64fec89","expectCoreTree":"96688eca803a335790d65b41db0ace4df7d2f9b5","expectInputBytes":633,"expectInputSha256":"959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42","id":"t3r-shaft-04","difficulty":5,"targetRows":4,"maxPrimaryLocks":7,"maxAlternativeExtra":2}
```

#### Threat boundary and required lease primitive

The integrity claim covers ordinary same-user user-mode mutation of the named lexical
paths and file objects. Administrator/kernel compromise, drive or volume remapping, DLL
replacement, Git object-database attacks, and denial of service are outside result
integrity. Every observable deviation inside the boundary fails closed.

A fresh runner v2 uses a frozen absolute path ending in
`t37-r4k-windows-lease-runner-v2.cs`. The materialization must record its real byte count
and SHA-256; no placeholder is allowed. Because the runner cannot trust its own source
path before loading, the committed PowerShell wrapper must embed a minimal native
bootstrap. That bootstrap opens the volume-root-to-leaf components of the runner path
with `CreateFileW`, `OPEN_EXISTING`, `FILE_FLAG_OPEN_REPARSE_POINT`, and
`FILE_SHARE_READ`; directories additionally use `FILE_FLAG_BACKUP_SEMANTICS`, while the
final ordinary file uses `FILE_FLAG_RANDOM_ACCESS`. Each handle queries
`FileAttributeTagInfo` and rejects `FILE_ATTRIBUTE_REPARSE_POINT` on that same handle.
All component handles remain open, denying write and delete/rename, before the final
source handle is read.

The bootstrap requires an absolute canonical long path; rejects relative, dot/dot-dot,
ADS, trailing-space/dot, unexpected-volume, and alternate-name inputs; binds opened and
normalized NT paths, volume serial and 128-bit file ID, regular/non-delete-pending state,
size, link count and times; reads exactly to EOF from the held final handle; and checks
strict UTF-8, no BOM, LF-only framing, exact byte count, and SHA. `Add-Type` receives only
the decoded bytes from that handle. The loaded runner immediately creates its own
root-to-leaf lease for the same source and must match the bootstrap file identity, paths,
bytes, and SHA. Both lease sets stay open through all child exits and final checks.

Runner v2 applies the same root-to-leaf no-follow lease algorithm to exactly seven
production inputs: Node, Git, retired v2 and v3 validators, v4, the clue, and the consumed
v3 receipt. The final ordinary-file handle is the content handle. Constructor and
`AssertUsable(path)` freeze/recheck both `FILE_NAME_OPENED | VOLUME_NAME_NT` and
`FILE_NAME_NORMALIZED | VOLUME_NAME_NT`, volume/file ID, attributes/tag, bytes/hash,
legacy v3 receipt identity, and read-before/read-after metadata. Every lexical witness
is opened no-follow and compared to the persistent lease; path-only `Get-Item` checks
are never accepted as the atomic reparse gate.

#### Bound process and pipe lifecycle

Every Git invocation uses the exact absolute Git path and is immediately bracketed by
`gitLease.AssertUsable(path)`; using the same native runner for Git is preferred. All
eight lease sets remain held through every Git operation and the Node child exit.

The sole Node call uses nonempty exact `lpApplicationName`, a writable fixed command
line, `CREATE_SUSPENDED`, `EXTENDED_STARTUPINFO_PRESENT`, and a kill-on-close Job without
breakaway. `PROC_THREAD_ATTRIBUTE_HANDLE_LIST` contains only NUL/stdout/stderr handles;
`bInheritHandles=true` is required specifically for that whitelist. After creation,
assignment to the configured Job precedes any resume. The child device-form image path
must be nonempty and demonstrably untruncated, match the Node lease's normalized NT path,
and be followed by another lease/path witness and `STILL_ACTIVE` check. Source contains
exactly one `ResumeThread` call; it must return previous suspend count `1`. Any failure
terminates the child, closes the Job, waits for exit, joins pumps, and reports cleanup
failure without releasing leases early.

Stdout and stderr pumps start before resume and always continue draining. Each has a hard
capture limit; on overflow it records failure but keeps reading and discarding until EOF.
Pumps never write Console directly. After the child and every Job writer have exited,
both pumps are joined deterministically, their errors/overflow are checked, and only then
may bounded captured text be emitted. A pump error, overflow, non-join, handle leak, Job
cleanup failure, image mismatch, or nonzero child result is fatal.

Calling the runner with the v4 command conservatively consumes the one v4 authorization
regardless of whether `CreateProcessW` succeeds, returns, or throws. The wrapper catches
only to append the final `Do not retry.` disposition; it performs no artifact recovery.

#### Gates and next checkpoint

Production execution is closed. Before materialization, runner v2 must compile and pass
benign stdout/stderr/exit, root-to-leaf reparse and replacement races, same/equal-size
mutation, image-path length, high-output/no-deadlock, create/assign/resume failure, pump
failure, Job cleanup, and dynamic handle-count fixtures. Fixtures may touch only their
owned temporary roots; production sentinels must be byte/identity unchanged. Fresh
independent exact-source QA must report P0-P3/GAP all zero.

The later materialization may change only the four authorized docs and must stay within
the prospectively approved 1,200-line exception. Static QA requires four marker
occurrences, one unchanged manifest occurrence in DESIGN, one exact runner-v2
path/bytes/SHA pin, zero PowerShell parse errors, exactly one Node runner call, zero bare
`& $node`, `Start-Process`, `Process.Start`, or `Invoke-Expression`, and an allowed bound
route for every Git call. A hash-bound no-spawn derivative must exercise the complete
preflight without reaching the production call. After exact commit, independent Git-blob
QA, a QA-only THREAD_LOG commit, and a fresh final-HEAD all-zero binding are mandatory
before the coordinator repeats the immediate preflight and invokes the wrapper once.

### F4E-R4L exact v4 command materialization

The following wrapper is the sole copy-pasteable v4 command candidate. It is exactly
64,125 UTF-8/LF/no-BOM bytes with SHA-256
`278563AC435C57577DC1AD7F15FE1A99AD788DF2E187CE0ACFF1148C0D3FB9F6`.
Its inline bootstrap loads only the frozen 63,640-byte runner-v2 source pinned at
`178584C03DC1103F29D4038FF2A69B7301EBA2DCDBE28085D2D4220F573B3003`.
The exact argument manifest and all four existing command markers above remain
unchanged. The production block begins only after two complete preflights; after entry,
no verification postflight is permitted.

```powershell
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$runnerSourcePath = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-r4k-windows-lease-runner-v2.cs'
$node = 'E:\Nodejs\node.exe'
$git = 'E:\Git\mingw64\bin\git.exe'
$root = 'E:\Proj\reproduction-tetris'
$validatorV2 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v2.mjs'
$validatorV3 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v3.mjs'
$validatorV4 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v4.mjs'
$cluePath = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json'
$attemptV3 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v3.json'
$outputV2 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v2.json'
$attemptV2 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v2.json'
$outputV3 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v3.json'
$outputV4 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v4.json'
$attemptV4 = 'C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v4.json'

$runnerBootstrap = $null
$runnerLease = $null
$nodeLease = $null
$gitLease = $null
$validatorV2Lease = $null
$validatorV3Lease = $null
$validatorV4Lease = $null
$inputLease = $null
$attemptV3Lease = $null
$productionAttemptEntered = $false
$failure = $null
$preflightCleanupFailures = @()
$capturedHead = $null
$historySignature = $null
$scopedBindings = @()

function Assert-Condition([bool] $Condition, [string] $Message) {
  if (-not $Condition) { throw $Message }
}

function Assert-ByteArrayEqual([byte[]] $Left, [byte[]] $Right, [string] $Label) {
  Assert-Condition ($null -ne $Left -and $null -ne $Right) "$Label bytes are absent."
  Assert-Condition ($Left.Length -eq $Right.Length) "$Label byte lengths differ."
  $difference = 0
  for ($index = 0; $index -lt $Left.Length; $index += 1) {
    $difference = $difference -bor ($Left[$index] -bxor $Right[$index])
  }
  Assert-Condition ($difference -eq 0) "$Label bytes differ."
}

function Assert-ExactPropertyOrder($Object, [string[]] $Expected, [string] $Label) {
  Assert-Condition ($null -ne $Object) "$Label object is absent."
  $actual = @($Object.PSObject.Properties.Name)
  Assert-Condition ($actual.Count -eq $Expected.Count) "$Label property count differs."
  for ($index = 0; $index -lt $Expected.Count; $index += 1) {
    Assert-Condition ($actual[$index] -ceq $Expected[$index]) "$Label property order differs at $index."
  }
}

function Assert-UpperSha([string] $Value, [string] $Expected, [string] $Label) {
  Assert-Condition ($Value -cmatch '^[0-9A-F]{64}$') "$Label is not uppercase SHA-256."
  Assert-Condition ($Value -ceq $Expected) "$Label differs."
}

function Assert-LeasePin($Lease, [string] $Path, [long] $Bytes, [string] $Sha256, [string] $Label) {
  Assert-Condition ($null -ne $Lease) "$Label lease is absent."
  $Lease.AssertUsable($Path)
  Assert-Condition (-not $Lease.Directory -and -not $Lease.DeletePending) "$Label is not a usable regular file."
  Assert-Condition (($Lease.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) "$Label is a reparse point."
  Assert-Condition ($Lease.Length -eq $Bytes) "$Label byte length differs."
  Assert-UpperSha ([string] $Lease.Sha256) $Sha256 "$Label SHA-256"
}

function Assert-BootstrapRunnerBinding {
  $runnerBootstrap.AssertStable()
  $runnerLease.AssertUsable($runnerSourcePath)
  $final = $runnerBootstrap.Final
  Assert-Condition ($final.FinalDosPath -ceq $runnerLease.FinalDosPath) 'Runner DOS paths differ.'
  Assert-Condition ($final.FinalNtPath -ceq $runnerLease.FinalNtPath) 'Runner NT paths differ.'
  Assert-Condition ($final.Attributes -eq $runnerLease.Attributes) 'Runner attributes differ.'
  Assert-Condition ($final.Length -eq $runnerLease.Length) 'Runner lengths differ.'
  Assert-Condition ($final.VolumeSerialNumber -eq $runnerLease.VolumeSerialNumber) 'Runner volumes differ.'
  Assert-ByteArrayEqual $final.FileId $runnerLease.FileId 'Runner file ID'
  Assert-Condition ($final.NumberOfLinks -eq $runnerLease.NumberOfLinks) 'Runner link counts differ.'
  Assert-Condition ($final.CreationTime -eq $runnerLease.CreationTime) 'Runner creation times differ.'
  Assert-Condition ($final.LastWriteTime -eq $runnerLease.LastWriteTime) 'Runner write times differ.'
  Assert-Condition ($final.ChangeTime -eq $runnerLease.ChangeTime) 'Runner change times differ.'
  Assert-Condition ($final.DeletePending -eq $runnerLease.DeletePending) 'Runner delete states differ.'
  Assert-Condition ($final.Directory -eq $runnerLease.Directory) 'Runner file types differ.'
  Assert-ByteArrayEqual $runnerBootstrap.Bytes $runnerLease.Bytes 'Runner source'
  Assert-UpperSha ([string] $runnerLease.Sha256) '178584C03DC1103F29D4038FF2A69B7301EBA2DCDBE28085D2D4220F573B3003' 'Runner SHA-256'
}

function Assert-LstatAbsent([string] $Path) {
  try {
    $null = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    throw "Path is present: $Path"
  } catch [Management.Automation.ItemNotFoundException] { return }
}

function Assert-NoStages([string] $OutputPath) {
  $directory = [IO.Path]::GetDirectoryName($OutputPath)
  $prefix = [IO.Path]::GetFileName($OutputPath) + '.tmp-'
  $matches = @(Get-ChildItem -LiteralPath $directory -Force -ErrorAction Stop |
    Where-Object { $_.Name.StartsWith($prefix, [StringComparison]::Ordinal) })
  Assert-Condition ($matches.Count -eq 0) "Output staging residue exists: $OutputPath"
}

function Assert-ExactEnvironment {
  $expected = @(
    @{ Name = 'NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S'; Bytes = 129; Sha256 = '36816623CF40FFD5A13F444AF68A441001F99ED8B21D0CD03B221914185FCEE1' },
    @{ Name = 'NODE_REPL_TRUSTED_CODE_PATHS'; Bytes = 25; Sha256 = 'C99D703D69CE82B4803CEBB3E94F20CFB4D8F43A298C592018507394AD1B3A2D' }
  )
  $actual = @(Get-ChildItem Env: |
    Where-Object { $_.Name.StartsWith('NODE_', [StringComparison]::OrdinalIgnoreCase) } |
    Sort-Object Name)
  Assert-Condition ($actual.Count -eq $expected.Count) 'NODE_* key set differs.'
  for ($index = 0; $index -lt $expected.Count; $index += 1) {
    Assert-Condition ($actual[$index].Name -ceq $expected[$index].Name) 'NODE_* key spelling or order differs.'
    $bytes = [Text.UTF8Encoding]::new($false, $true).GetBytes([string] $actual[$index].Value)
    $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    Assert-Condition ($bytes.Length -eq $expected[$index].Bytes) "NODE_* length differs: $($actual[$index].Name)"
    Assert-UpperSha $hash $expected[$index].Sha256 "NODE_* SHA-256: $($actual[$index].Name)"
  }
  Assert-Condition (@(Get-ChildItem Env: |
    Where-Object { $_.Name.StartsWith('GIT_', [StringComparison]::OrdinalIgnoreCase) }).Count -eq 0) 'GIT_* must be absent.'
}

function Assert-AsciiProtocol([string] $Text, [string] $Label) {
  foreach ($character in $Text.ToCharArray()) {
    $code = [int] $character
    $allowed = $code -eq 0 -or $code -eq 9 -or $code -eq 10 -or $code -eq 13 -or ($code -ge 32 -and $code -le 126)
    Assert-Condition ($allowed -and $code -ne 0xFFFD) "$Label contains non-protocol text."
  }
}

function ConvertTo-FixedWindowsArgument([string] $Argument) {
  Assert-Condition ($null -ne $Argument) 'Git argument is null.'
  Assert-AsciiProtocol $Argument 'Git argument'
  Assert-Condition ($Argument.IndexOf([char] 0) -lt 0) 'Git argument contains NUL.'
  Assert-Condition ($Argument.IndexOf('"') -lt 0) 'Git argument contains a quote.'
  Assert-Condition (-not $Argument.EndsWith('\', [StringComparison]::Ordinal)) 'Git argument ends in a backslash.'
  return '"' + $Argument + '"'
}

function Invoke-BoundGit(
  [string[]] $Arguments,
  [int[]] $AllowedExitCodes = @(0),
  [string[]] $AllowedStderrLines = @()
) {
  Assert-Condition ($Arguments.Count -gt 0) 'Git invocation has no arguments.'
  Assert-Condition (@(Get-ChildItem Env: |
    Where-Object { $_.Name.StartsWith('GIT_', [StringComparison]::OrdinalIgnoreCase) }).Count -eq 0) 'Git environment is not empty.'
  $gitLease.AssertUsable($git)
  $argumentLine = [string]::Join(' ', @($Arguments | ForEach-Object { ConvertTo-FixedWindowsArgument $_ }))
  $savedOut = [Console]::Out
  $savedError = [Console]::Error
  $stdoutWriter = [IO.StringWriter]::new([Globalization.CultureInfo]::InvariantCulture)
  $stderrWriter = [IO.StringWriter]::new([Globalization.CultureInfo]::InvariantCulture)
  try {
    $env:GIT_NO_REPLACE_OBJECTS = '1'
    $env:GIT_OPTIONAL_LOCKS = '0'
    [Console]::SetOut($stdoutWriter)
    [Console]::SetError($stderrWriter)
    $exitCode = [T37R4KRunner]::Run($git, $argumentLine, $root, $gitLease)
  } finally {
    [Console]::SetOut($savedOut)
    [Console]::SetError($savedError)
    Remove-Item Env:GIT_NO_REPLACE_OBJECTS -ErrorAction SilentlyContinue
    Remove-Item Env:GIT_OPTIONAL_LOCKS -ErrorAction SilentlyContinue
  }
  Assert-Condition (@(Get-ChildItem Env: |
    Where-Object { $_.Name.StartsWith('GIT_', [StringComparison]::OrdinalIgnoreCase) }).Count -eq 0) 'Git environment restoration failed.'
  $stdout = $stdoutWriter.ToString()
  $stderr = $stderrWriter.ToString()
  $stdoutWriter.Dispose()
  $stderrWriter.Dispose()
  Assert-AsciiProtocol $stdout 'Git stdout'
  Assert-AsciiProtocol $stderr 'Git stderr'
  if ($stderr.Length -ne 0) {
    Assert-Condition ($AllowedStderrLines.Count -gt 0) "Git stderr was not empty: $stderr"
    Assert-Condition ($stderr.IndexOf("`r", [StringComparison]::Ordinal) -lt 0 -and $stderr.EndsWith("`n", [StringComparison]::Ordinal)) 'Git stderr framing differs.'
    $stderrLines = $stderr.Substring(0, $stderr.Length - 1).Split([char] 10)
    $seenStderrLines = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($line in $stderrLines) {
      Assert-Condition ($line.Length -gt 0 -and $seenStderrLines.Add($line)) 'Git stderr contains an empty or repeated line.'
      Assert-Condition ($AllowedStderrLines -ccontains $line) "Git stderr contains a non-allowlisted line: $line"
    }
  }
  Assert-Condition ($AllowedExitCodes -contains $exitCode) "Git exit code $exitCode is outside the allowlist."
  $gitLease.AssertUsable($git)
  return [pscustomobject]@{ ExitCode = $exitCode; Stdout = $stdout; Stderr = $stderr }
}

function Get-OneGitLine([string[]] $Arguments, [string] $Label) {
  $result = Invoke-BoundGit $Arguments
  Assert-Condition ($result.Stdout -cmatch '^[\x20-\x7E]+\n$') "$Label is not one LF-terminated ASCII line."
  return $result.Stdout.Substring(0, $result.Stdout.Length - 1)
}

function Assert-EmptyGitOutput([string[]] $Arguments, [string] $Label) {
  $result = Invoke-BoundGit $Arguments
  Assert-Condition ($result.Stdout.Length -eq 0) "$Label was not empty."
}

function Assert-ValidatorAliasesAndProcesses {
  $identities = @(
    @{ Path = $validatorV2; LongBase = 't37-f4e-endgame-canonical-validate-v2.mjs'; ShortBase = 'T312A0~1.MJS' },
    @{ Path = $validatorV3; LongBase = 't37-f4e-endgame-canonical-validate-v3.mjs'; ShortBase = 'T367D4~1.MJS' },
    @{ Path = $validatorV4; LongBase = 't37-f4e-endgame-canonical-validate-v4.mjs'; ShortBase = 'T34C6C~1.MJS' }
  )
  $basenames = @()
  foreach ($identity in $identities) {
    $cimName = $identity.Path.Replace('\', '\\').Replace("'", "''")
    $rows = @(Get-CimInstance CIM_DataFile -Filter "Name='$cimName'")
    Assert-Condition ($rows.Count -eq 1) "Validator CIM identity count differs: $($identity.Path)"
    Assert-Condition ([string] $rows[0].Name -ceq $identity.Path) "Validator CIM long path differs: $($identity.Path)"
    $shortBase = [IO.Path]::GetFileName([string] $rows[0].EightDotThreeFileName)
    Assert-Condition ($shortBase.Equals($identity.ShortBase, [StringComparison]::OrdinalIgnoreCase)) "Validator 8.3 identity differs: $($identity.Path)"
    $basenames += $identity.LongBase
    $basenames += $identity.ShortBase
  }
  foreach ($process in @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")) {
    $commandLine = [string] $process.CommandLine
    Assert-Condition (-not [string]::IsNullOrEmpty($commandLine)) "Cannot prove Node process $($process.ProcessId) is unrelated."
    foreach ($basename in $basenames) {
      Assert-Condition ($commandLine.IndexOf($basename, [StringComparison]::OrdinalIgnoreCase) -lt 0) "Validator Node process exists: $($process.ProcessId)"
    }
  }
}

function Assert-Namespaces {
  Assert-LstatAbsent $outputV2
  Assert-LstatAbsent $attemptV2
  Assert-LstatAbsent $outputV3
  Assert-LstatAbsent $outputV4
  Assert-LstatAbsent $attemptV4
  Assert-NoStages $outputV2
  Assert-NoStages $outputV3
  Assert-NoStages $outputV4
}

function Assert-V3Receipt {
  Assert-LeasePin $attemptV3Lease $attemptV3 8729 '06E9EACE16C6665FF4220D0753F0DFD5875C742FC1F56C9767771B1CB5A53E44' 'Consumed v3 receipt'
  Assert-Condition ($attemptV3Lease.NumberOfLinks -eq 1) 'Consumed receipt link count differs.'
  Assert-Condition ($attemptV3Lease.LegacyDev.ToString([Globalization.CultureInfo]::InvariantCulture) -ceq '1456395446') 'Consumed receipt dev differs.'
  Assert-Condition ($attemptV3Lease.LegacyIno.ToString([Globalization.CultureInfo]::InvariantCulture) -ceq '456270937248336975') 'Consumed receipt ino differs.'
  Assert-Condition ($attemptV3Lease.LegacySize.ToString([Globalization.CultureInfo]::InvariantCulture) -ceq '8729') 'Consumed receipt size differs.'
  Assert-Condition ($attemptV3Lease.LegacyMode.ToString([Globalization.CultureInfo]::InvariantCulture) -ceq '33206') 'Consumed receipt mode differs.'
  Assert-Condition ($attemptV3Lease.LegacyNlink.ToString([Globalization.CultureInfo]::InvariantCulture) -ceq '1') 'Consumed receipt nlink differs.'
  Assert-Condition ($attemptV3Lease.LegacyMtimeNs.ToString([Globalization.CultureInfo]::InvariantCulture) -ceq '1786600246711586100') 'Consumed receipt mtime differs.'
  Assert-Condition ($attemptV3Lease.LegacyCtimeNs.ToString([Globalization.CultureInfo]::InvariantCulture) -ceq '1786600246711586100') 'Consumed receipt ctime differs.'
  $bytes = $attemptV3Lease.Bytes
  Assert-Condition (-not ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)) 'Consumed receipt has a BOM.'
  Assert-Condition (@($bytes | Where-Object { $_ -eq 13 }).Count -eq 0) 'Consumed receipt contains CR.'
  $strictUtf8 = [Text.UTF8Encoding]::new($false, $true)
  $text = $strictUtf8.GetString($bytes)
  Assert-ByteArrayEqual $bytes ($strictUtf8.GetBytes($text)) 'Consumed receipt UTF-8'
  Assert-Condition ($text.EndsWith("`n", [StringComparison]::Ordinal)) 'Consumed receipt lacks terminal LF.'
  Assert-Condition ($text.Substring(0, $text.Length - 1).IndexOf("`n", [StringComparison]::Ordinal) -lt 0) 'Consumed receipt has interior LF.'
  $receipt = $text | ConvertFrom-Json -Depth 100 -ErrorAction Stop
  Assert-ExactPropertyOrder $receipt @('schema', 'payload', 'payloadSha256') 'Consumed receipt'
  Assert-Condition ($receipt.schema -ceq 't37-f4e-r4g-attempt-v1') 'Consumed receipt schema differs.'
  Assert-Condition ($receipt.payloadSha256 -ceq 'E1B6669502DE6055157347A83116053EAF9621D74993038A3A882F9F06C5448B') 'Consumed payload hash pin differs.'
  $jsonOptions = [Text.Json.JsonDocumentOptions]::new()
  $jsonDocument = [Text.Json.JsonDocument]::Parse($text, $jsonOptions)
  try {
    $rawPayload = $jsonDocument.RootElement.GetProperty('payload').GetRawText()
    $rawPayloadBytes = $strictUtf8.GetBytes($rawPayload + "`n")
    $rawPayloadHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($rawPayloadBytes))
    Assert-UpperSha $rawPayloadHash 'E1B6669502DE6055157347A83116053EAF9621D74993038A3A882F9F06C5448B' 'Consumed raw payload SHA-256'
  } finally {
    $jsonDocument.Dispose()
  }
  $payload = $receipt.payload
  Assert-ExactPropertyOrder $payload @(
    'commandManifestSha256', 'validatorPath', 'validatorBytes', 'validatorSha256',
    'runtime', 'git', 'root', 'inputPath', 'outputPath', 'attemptPath', 'stagingPath',
    'scopedCleanPolicy', 'head', 'repositoryBase', 'coreBase', 'coreTree',
    'coreModuleManifest', 'inputBytes', 'inputSha256', 'id', 'difficulty', 'targetRows',
    'maxPrimaryLocks', 'maxAlternativeExtra'
  ) 'Consumed payload'
  Assert-Condition ($payload.commandManifestSha256 -ceq '8A30A76938B8CA9E148631AAAD97DDE68CB1F762BD29F803E56876CCE6BDA3AA') 'Consumed manifest hash differs.'
  Assert-Condition ($payload.validatorPath -ceq $validatorV3 -and [long] $payload.validatorBytes -eq 57181 -and $payload.validatorSha256 -ceq '25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF') 'Consumed validator pin differs.'
  Assert-Condition ($payload.root -ceq $root -and $payload.inputPath -ceq $cluePath -and $payload.outputPath -ceq $outputV3 -and $payload.attemptPath -ceq $attemptV3) 'Consumed path pins differ.'
  Assert-Condition ($payload.stagingPath.StartsWith($outputV3 + '.tmp-', [StringComparison]::Ordinal)) 'Consumed staging prefix differs.'
  Assert-Condition ($payload.scopedCleanPolicy -ceq 'head-blob-eol-equivalent-v1') 'Consumed clean policy differs.'
  Assert-Condition ($payload.head -ceq '8911a9cf5e9356c3e8beb099f7db53aeb4944e51') 'Consumed HEAD differs.'
  Assert-Condition ($payload.repositoryBase -ceq '4172a79620cda33e167d291d38c69f0ed64fec89') 'Consumed repository base differs.'
  Assert-Condition ($payload.coreBase -ceq '7d81d4974ce8fb777ea105c5ef98d156cd1807cc') 'Consumed Core base differs.'
  Assert-Condition ($payload.coreTree -ceq '96688eca803a335790d65b41db0ace4df7d2f9b5') 'Consumed Core tree differs.'
  Assert-Condition ([long] $payload.inputBytes -eq 633 -and $payload.inputSha256 -ceq '959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42') 'Consumed input pin differs.'
  Assert-Condition ($payload.id -ceq 't3r-shaft-04' -and [int] $payload.difficulty -eq 5 -and [int] $payload.targetRows -eq 4 -and [int] $payload.maxPrimaryLocks -eq 7 -and [int] $payload.maxAlternativeExtra -eq 2) 'Consumed level contract differs.'
  Assert-ExactPropertyOrder $payload.runtime @('nodeExecPath', 'nodeVersion', 'nodeVersionsNode', 'nodeExecutableBytes', 'nodeExecutableSha256', 'nodeHeapSizeLimit', 'nodeExecArgv', 'nodeOptionsPresent', 'nodeEnvironment') 'Consumed runtime'
  Assert-Condition ($payload.runtime.nodeExecPath -ceq $node -and $payload.runtime.nodeVersion -ceq 'v24.12.0' -and $payload.runtime.nodeVersionsNode -ceq '24.12.0') 'Consumed runtime version differs.'
  Assert-Condition ([long] $payload.runtime.nodeExecutableBytes -eq 89935872 -and $payload.runtime.nodeExecutableSha256 -ceq '2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8') 'Consumed Node pin differs.'
  Assert-Condition ([long] $payload.runtime.nodeHeapSizeLimit -eq 4496293888 -and @($payload.runtime.nodeExecArgv).Count -eq 0 -and $payload.runtime.nodeOptionsPresent -eq $false) 'Consumed runtime process contract differs.'
  Assert-ExactPropertyOrder $payload.git @('gitExecPath', 'gitVersion', 'gitExecutableBytes', 'gitExecutableSha256', 'inheritedGitEnvironmentKeys') 'Consumed Git'
  Assert-Condition ($payload.git.gitExecPath -ceq $git -and $payload.git.gitVersion -ceq 'git version 2.51.0.windows.2') 'Consumed Git version differs.'
  Assert-Condition ([long] $payload.git.gitExecutableBytes -eq 4284816 -and $payload.git.gitExecutableSha256 -ceq 'E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9' -and @($payload.git.inheritedGitEnvironmentKeys).Count -eq 0) 'Consumed Git contract differs.'
}

$gitPrefix = @('-C', $root, '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-c', 'core.hooksPath=NUL')
$repositoryBase = '4172a79620cda33e167d291d38c69f0ed64fec89'
$coreBase = '7d81d4974ce8fb777ea105c5ef98d156cd1807cc'
$coreTree = '96688eca803a335790d65b41db0ace4df7d2f9b5'
$authorizedContractPaths = @(
  'docs/CURRENT_TASK.md',
  'docs/DESIGN.md',
  'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md',
  'docs/workstreams/tetris-t37-endgame/THREAD_LOG.md'
)
$scopedPaths = @('src/game/core') + $authorizedContractPaths
$commandMarkerPrefix = 'F4E-R4I-' + 'COMMAND-CONTRACT-V1 validator='
$commandMarkerLine = $commandMarkerPrefix + '93952536898D055B793E52A7957C821A51C26C78B0A87B5379D35B551349EC60'
$commandManifestPrefix = 'F4E-R4I-' + 'COMMAND-MANIFEST-V1 '

function Split-NulProtocol([string] $Text, [string] $Label, [bool] $AllowEmpty = $false) {
  if ($Text.Length -eq 0) {
    Assert-Condition $AllowEmpty "$Label is empty."
    return @()
  }
  Assert-Condition ($Text[$Text.Length - 1] -eq [char] 0) "$Label lacks a terminal NUL."
  $tokens = [Collections.Generic.List[string]]::new()
  $start = 0
  for ($index = 0; $index -lt $Text.Length; $index += 1) {
    if ($Text[$index] -eq [char] 0) {
      Assert-Condition ($index -gt $start) "$Label contains an empty token."
      $tokens.Add($Text.Substring($start, $index - $start))
      $start = $index + 1
    }
  }
  Assert-Condition ($start -eq $Text.Length) "$Label terminal data is malformed."
  return $tokens.ToArray()
}

function Assert-FullLowerSha([string] $Value, [string] $Label) {
  Assert-Condition ($Value -cmatch '^[0-9a-f]{40}$') "$Label is not a full lowercase SHA."
}

function Get-GitBlobSha1([byte[]] $Bytes) {
  $header = [Text.Encoding]::ASCII.GetBytes("blob $($Bytes.Length)`0")
  $framed = [byte[]]::new($header.Length + $Bytes.Length)
  [Buffer]::BlockCopy($header, 0, $framed, 0, $header.Length)
  [Buffer]::BlockCopy($Bytes, 0, $framed, $header.Length, $Bytes.Length)
  return [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($framed)).ToLowerInvariant()
}

function ConvertTo-NormalizedCheckoutBytes([byte[]] $Bytes, [string] $Label) {
  Assert-Condition (-not ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF)) "$Label has a BOM."
  $strictUtf8 = [Text.UTF8Encoding]::new($false, $true)
  $text = $strictUtf8.GetString($Bytes)
  Assert-ByteArrayEqual $Bytes ($strictUtf8.GetBytes($text)) "$Label UTF-8"
  $text = $text.Replace("`r`n", "`n")
  Assert-Condition ($text.IndexOf("`r", [StringComparison]::Ordinal) -lt 0) "$Label contains a non-CRLF CR."
  return ,([byte[]] $strictUtf8.GetBytes($text))
}

function Get-ScopedEntries([string] $Head) {
  Assert-FullLowerSha $Head 'Scoped HEAD'
  $result = Invoke-BoundGit @($gitPrefix + @('ls-tree', '-r', '-z', '--full-tree', $Head, '--') + $scopedPaths)
  $tokens = @(Split-NulProtocol $result.Stdout 'Scoped HEAD tree')
  Assert-Condition ($tokens.Count -gt 0) 'Scoped HEAD tree has no entries.'
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($token in $tokens) {
    $separator = $token.IndexOf([char] 9)
    Assert-Condition ($separator -gt 0 -and $separator -lt $token.Length - 1) 'Scoped HEAD record is malformed.'
    $metadata = $token.Substring(0, $separator)
    $match = [regex]::Match($metadata, '^(100644|100755) blob ([0-9a-f]{40})$', [Text.RegularExpressions.RegexOptions]::CultureInvariant)
    Assert-Condition $match.Success 'Scoped HEAD record is not a regular blob.'
    $gitPath = $token.Substring($separator + 1)
    Assert-Condition ($gitPath -cmatch '^[\x20-\x7E]+$' -and $gitPath.IndexOf('\') -lt 0) "Scoped path is not canonical ASCII: $gitPath"
    $insideScope = $false
    foreach ($scope in $scopedPaths) {
      if ($gitPath -ceq $scope -or $gitPath.StartsWith($scope + '/', [StringComparison]::Ordinal)) { $insideScope = $true; break }
    }
    Assert-Condition $insideScope "Scoped tree path escapes its scopes: $gitPath"
    Assert-Condition $seen.Add($gitPath) "Scoped HEAD repeats $gitPath."
    [pscustomobject]@{ GitPath = $gitPath; Mode = $match.Groups[1].Value; BlobId = $match.Groups[2].Value }
  }
}

function ConvertTo-ScopedAbsolutePath([string] $GitPath) {
  $absolute = [IO.Path]::GetFullPath((Join-Path $root $GitPath.Replace('/', '\')))
  $relative = [IO.Path]::GetRelativePath($root, $absolute).Replace('\', '/')
  Assert-Condition ($relative -ceq $GitPath -and -not [IO.Path]::IsPathRooted($relative)) "Scoped path mapping differs: $GitPath"
  return $absolute
}

function Assert-ContractDocuments {
  $totalManifestPrefixes = 0
  foreach ($contractPath in $authorizedContractPaths) {
    $binding = @($scopedBindings | Where-Object { $_.GitPath -ceq $contractPath })
    Assert-Condition ($binding.Count -eq 1) "Contract binding count differs: $contractPath"
    [byte[]] $normalized = ConvertTo-NormalizedCheckoutBytes $binding[0].Lease.Bytes "Contract $contractPath"
    $text = [Text.UTF8Encoding]::new($false, $true).GetString($normalized)
    $exactMarkerCount = 0
    $markerPrefixCount = 0
    $manifestPrefixCount = 0
    $manifestLine = $null
    foreach ($line in $text.Split([char] 10)) {
      if ($line -ceq $commandMarkerLine) { $exactMarkerCount += 1 }
      if ($line.StartsWith($commandMarkerPrefix, [StringComparison]::Ordinal)) { $markerPrefixCount += 1 }
      if ($line.StartsWith($commandManifestPrefix, [StringComparison]::Ordinal)) {
        $manifestPrefixCount += 1
        $manifestLine = $line
      }
    }
    Assert-Condition ($exactMarkerCount -eq 1 -and $markerPrefixCount -eq 1) "Contract marker differs: $contractPath"
    $totalManifestPrefixes += $manifestPrefixCount
    if ($contractPath -ceq 'docs/DESIGN.md') {
      Assert-Condition ($manifestPrefixCount -eq 1) 'DESIGN manifest count differs.'
      $manifestBytes = [Text.UTF8Encoding]::new($false, $true).GetBytes($manifestLine + "`n")
      Assert-Condition ($manifestBytes.Length -eq 2948) 'DESIGN manifest byte count differs.'
      Assert-UpperSha ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($manifestBytes))) 'ED1E1844320882DB31EE365C9270B660329FF0AC7D42487F9F4B6BB2F8B9FA51' 'DESIGN manifest SHA-256'
    } else {
      Assert-Condition ($manifestPrefixCount -eq 0) "Unexpected manifest: $contractPath"
    }
  }
  Assert-Condition ($totalManifestPrefixes -eq 1) 'Contract manifest prefix total differs.'
}

function Assert-ScopedDirectorySet {
  $trackedCore = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($binding in $scopedBindings) {
    if ($binding.GitPath.StartsWith('src/game/core/', [StringComparison]::Ordinal)) { $null = $trackedCore.Add($binding.GitPath) }
  }
  Assert-Condition ($trackedCore.Count -gt 0) 'Tracked Core set is empty.'
  $observed = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $pending = [Collections.Generic.Stack[string]]::new()
  $pending.Push((ConvertTo-ScopedAbsolutePath 'src/game/core'))
  while ($pending.Count -gt 0) {
    $directory = $pending.Pop()
    foreach ($item in @(Get-ChildItem -LiteralPath $directory -Force -ErrorAction Stop)) {
      Assert-Condition (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) "Scoped Core contains a reparse point: $($item.FullName)"
      $relative = [IO.Path]::GetRelativePath($root, $item.FullName).Replace('\', '/')
      if ($item.PSIsContainer) {
        $hasTrackedDescendant = $false
        foreach ($trackedPath in $trackedCore) {
          if ($trackedPath.StartsWith($relative + '/', [StringComparison]::Ordinal)) { $hasTrackedDescendant = $true; break }
        }
        Assert-Condition $hasTrackedDescendant "Scoped Core contains an extra directory: $relative"
        $pending.Push($item.FullName)
      } else {
        Assert-Condition ($item -is [IO.FileInfo] -and $trackedCore.Contains($relative)) "Scoped Core contains an untracked or non-file entry: $relative"
        Assert-Condition $observed.Add($relative) "Scoped Core repeats a file: $relative"
      }
    }
  }
  Assert-Condition ($observed.Count -eq $trackedCore.Count) 'Scoped Core disk file set differs.'
}

function Assert-ScopedBindings([string] $Head) {
  $entries = @(Get-ScopedEntries $Head)
  Assert-Condition ($entries.Count -eq $scopedBindings.Count) 'Scoped tracked entry count differs.'
  foreach ($entry in $entries) {
    $binding = @($scopedBindings | Where-Object { $_.GitPath -ceq $entry.GitPath })
    Assert-Condition ($binding.Count -eq 1 -and $binding[0].Mode -ceq $entry.Mode -and $binding[0].BlobId -ceq $entry.BlobId) "Scoped tracked binding differs: $($entry.GitPath)"
  }
  foreach ($binding in $scopedBindings) {
    $binding.Lease.AssertUsable($binding.AbsolutePath)
    [byte[]] $normalized = ConvertTo-NormalizedCheckoutBytes $binding.Lease.Bytes "Scoped checkout $($binding.GitPath)"
    Assert-Condition ((Get-GitBlobSha1 $normalized) -ceq $binding.BlobId) "Scoped checkout differs from HEAD blob: $($binding.GitPath)"
    Assert-Condition ((Get-OneGitLine @($gitPrefix + @('cat-file', '-t', $binding.BlobId)) "Scoped object type $($binding.GitPath)") -ceq 'blob') "Scoped Git object is not a blob: $($binding.GitPath)"
    Assert-Condition ([long] (Get-OneGitLine @($gitPrefix + @('cat-file', '-s', $binding.BlobId)) "Scoped object size $($binding.GitPath)") -eq $normalized.Length) "Scoped Git blob size differs: $($binding.GitPath)"
  }
  $allowedWarnings = @($scopedPaths | ForEach-Object { "warning: in the working copy of '$_', LF will be replaced by CRLF the next time Git touches it" })
  $diff = Invoke-BoundGit @($gitPrefix + @('diff', '--quiet', $Head, '--') + $scopedPaths) @(0) $allowedWarnings
  Assert-Condition ($diff.Stdout.Length -eq 0) 'Scoped diff stdout was not empty.'
  $status = Invoke-BoundGit @($gitPrefix + @('status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching', '--') + $scopedPaths)
  foreach ($token in @(Split-NulProtocol $status.Stdout 'Scoped porcelain' $true)) {
    Assert-Condition ($token.Length -gt 3 -and $token[2] -eq ' ' -and $token.Substring(0, 2) -ceq ' M') 'Scoped porcelain contains a disallowed status.'
    $path = $token.Substring(3)
    $insideScope = $false
    foreach ($scope in $scopedPaths) {
      if ($path -ceq $scope -or $path.StartsWith($scope + '/', [StringComparison]::Ordinal)) { $insideScope = $true; break }
    }
    Assert-Condition $insideScope "Scoped porcelain path escapes its scopes: $path"
  }
  Assert-ScopedDirectorySet
  Assert-ContractDocuments
}

function Initialize-ScopedBindings([string] $Head) {
  Assert-Condition ($scopedBindings.Count -eq 0) 'Scoped bindings were already initialized.'
  foreach ($entry in @(Get-ScopedEntries $Head)) {
    $absolutePath = ConvertTo-ScopedAbsolutePath $entry.GitPath
    $binding = [pscustomobject]@{ GitPath = $entry.GitPath; AbsolutePath = $absolutePath; Mode = $entry.Mode; BlobId = $entry.BlobId; Lease = $null }
    $script:scopedBindings += $binding
    $binding.Lease = [T37R4KLease]::new($absolutePath)
  }
  Assert-ScopedBindings $Head
}

function Assert-ContractHistory([string] $Head) {
  Assert-FullLowerSha $Head 'Contract HEAD'
  $visited = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $union = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $signatures = [Collections.Generic.List[string]]::new()
  $child = $Head
  $edgeCount = 0
  while ($child -cne $repositoryBase) {
    Assert-Condition ($edgeCount -lt 64 -and $visited.Add($child)) 'Contract history is too deep or cyclic.'
    $parentLine = Get-OneGitLine @($gitPrefix + @('rev-list', '--parents', '-n', '1', $child)) "Parents $child"
    $parts = @($parentLine.Split([char] 32))
    Assert-Condition ($parts.Count -eq 2 -and $parts[0] -ceq $child) "Commit $child is not single-parent."
    $parent = $parts[1]
    Assert-FullLowerSha $parent "Parent of $child"
    $diff = Invoke-BoundGit @($gitPrefix + @('diff-tree', '--no-commit-id', '--name-status', '-r', '--no-renames', '-z', $parent, $child, '--'))
    $tokens = @(Split-NulProtocol $diff.Stdout "Diff $parent..$child")
    Assert-Condition ($tokens.Count -gt 0 -and $tokens.Count % 2 -eq 0) "Diff $parent..$child lacks status/path pairs."
    $edgePaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    for ($index = 0; $index -lt $tokens.Count; $index += 2) {
      Assert-Condition ($tokens[$index] -ceq 'M') "Diff $parent..$child contains a non-M status."
      $path = $tokens[$index + 1]
      Assert-Condition ($authorizedContractPaths -ccontains $path) "Diff $parent..$child contains a non-contract path."
      Assert-Condition $edgePaths.Add($path) "Diff $parent..$child repeats $path."
      $null = $union.Add($path)
    }
    $signatures.Add($parent + '>' + $child + ':' + [string]::Join(',', @($edgePaths | Sort-Object)))
    $child = $parent
    $edgeCount += 1
  }
  Assert-Condition ($edgeCount -gt 0 -and $union.Count -eq $authorizedContractPaths.Count) 'Contract history edge/path count differs.'
  foreach ($path in $authorizedContractPaths) { Assert-Condition $union.Contains($path) "Contract history omits $path." }
  $currentSignature = [string]::Join("`n", $signatures)
  if ($null -eq $historySignature) { $script:historySignature = $currentSignature }
  else { Assert-Condition ($currentSignature -ceq $historySignature) 'Contract history changed after capture.' }
}

function Assert-GitRepository {
  Assert-Condition ((Get-OneGitLine @('--version') 'Git version') -ceq 'git version 2.51.0.windows.2') 'Git version differs.'
  $topLevel = Get-OneGitLine @($gitPrefix + @('rev-parse', '--show-toplevel')) 'Repository root'
  Assert-Condition ([IO.Path]::GetFullPath($topLevel).TrimEnd('\') -ceq [IO.Path]::GetFullPath($root).TrimEnd('\')) 'Repository root differs.'
  $gitDirectory = Get-OneGitLine @($gitPrefix + @('rev-parse', '--absolute-git-dir')) 'Git directory'
  Assert-Condition ([IO.Path]::GetFullPath($gitDirectory).TrimEnd('\') -ceq [IO.Path]::GetFullPath((Join-Path $root '.git')).TrimEnd('\')) 'Git directory differs.'
  Assert-EmptyGitOutput @($gitPrefix + @('replace', '-l')) 'Git replace refs'
  Assert-LstatAbsent (Join-Path $root '.git\info\grafts')
  Assert-LstatAbsent (Join-Path $root '.git\objects\info\alternates')
  Assert-Condition ((Get-OneGitLine @($gitPrefix + @('rev-parse', '--show-object-format')) 'Git object format') -ceq 'sha1') 'Git object format differs.'
  Assert-Condition ((Get-OneGitLine @($gitPrefix + @('branch', '--show-current')) 'Branch') -ceq 'main') 'Branch differs.'
  $head = Get-OneGitLine @($gitPrefix + @('rev-parse', 'HEAD')) 'HEAD'
  Assert-Condition ($head -cmatch '^[0-9a-f]{40}$') 'HEAD is malformed.'
  Assert-Condition ((Get-OneGitLine @($gitPrefix + @('rev-parse', "$repositoryBase^{commit}")) 'Repository base') -ceq $repositoryBase) 'Repository base differs.'
  Assert-Condition ((Get-OneGitLine @($gitPrefix + @('rev-parse', "$coreBase^{commit}")) 'Core base') -ceq $coreBase) 'Core base differs.'
  Assert-EmptyGitOutput @($gitPrefix + @('merge-base', '--is-ancestor', $coreBase, $head)) 'Core ancestry output'
  Assert-Condition ((Get-OneGitLine @($gitPrefix + @('rev-parse', "$head`:src/game/core")) 'Core tree') -ceq $coreTree) 'Core tree differs.'
  Assert-Condition ((Get-OneGitLine @($gitPrefix + @('rev-parse', "$coreBase`:src/game/core")) 'Core base tree') -ceq $coreTree) 'Core base tree differs.'
  Assert-ContractHistory $head
  if ($null -eq $capturedHead) {
    $script:capturedHead = $head
    Initialize-ScopedBindings $head
  } else {
    Assert-Condition ($head -ceq $capturedHead) 'HEAD changed after scoped capture.'
    Assert-ScopedBindings $head
  }
}

function Assert-PreflightState {
  Assert-ExactEnvironment
  Assert-BootstrapRunnerBinding
  Assert-LeasePin $runnerLease $runnerSourcePath 63640 '178584C03DC1103F29D4038FF2A69B7301EBA2DCDBE28085D2D4220F573B3003' 'Runner'
  Assert-LeasePin $nodeLease $node 89935872 '2FFE3ACC0458FDDE999F50D11809BBE7C9B7EF204DCF17094E325D26ACE101D8' 'Node'
  Assert-LeasePin $gitLease $git 4284816 'E996432581A70DF2E7AAAC5DB71E3811EC0DAA7F93A8BA73FE6DB6F9941F4BF9' 'Git'
  Assert-LeasePin $validatorV2Lease $validatorV2 51909 '17E6354BCE70EE051B5143BB031D36CB70A1115CAB70B9E50A841A291B8C3F8A' 'Validator v2'
  Assert-LeasePin $validatorV3Lease $validatorV3 57181 '25CCD003CBC8E779F3CFBD770A67E16408ED25FB8BA6270F76F7178D3AA06DFF' 'Validator v3'
  Assert-LeasePin $validatorV4Lease $validatorV4 63777 '93952536898D055B793E52A7957C821A51C26C78B0A87B5379D35B551349EC60' 'Validator v4'
  Assert-LeasePin $inputLease $cluePath 633 '959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42' 'Clue'
  Assert-V3Receipt
  $version = (Get-Item -LiteralPath $node -Force -ErrorAction Stop).VersionInfo
  Assert-Condition ($version.FileVersion -ceq '24.12.0' -and $version.ProductVersion -ceq '24.12.0' -and $version.OriginalFilename -ceq 'node.exe') 'Node version resource differs.'
  Assert-Namespaces
  Assert-ValidatorAliasesAndProcesses
  Assert-GitRepository
  Assert-Namespaces
  Assert-ValidatorAliasesAndProcesses
  $runnerBootstrap.AssertStable()
  $fixedBindings = @(
    [pscustomobject]@{ Lease = $runnerLease; Path = $runnerSourcePath },
    [pscustomobject]@{ Lease = $nodeLease; Path = $node },
    [pscustomobject]@{ Lease = $gitLease; Path = $git },
    [pscustomobject]@{ Lease = $validatorV2Lease; Path = $validatorV2 },
    [pscustomobject]@{ Lease = $validatorV3Lease; Path = $validatorV3 },
    [pscustomobject]@{ Lease = $validatorV4Lease; Path = $validatorV4 },
    [pscustomobject]@{ Lease = $inputLease; Path = $cluePath },
    [pscustomobject]@{ Lease = $attemptV3Lease; Path = $attemptV3 }
  )
  foreach ($binding in $fixedBindings) {
    $binding.Lease.AssertUsable([string] $binding.Path)
  }
  foreach ($binding in $scopedBindings) { $binding.Lease.AssertUsable($binding.AbsolutePath) }
}

$bootstrapSource = @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32.SafeHandles;

public sealed class T37R4KBootstrapSnapshot
{
    public string InputDosPath { get; internal set; }
    public string FinalDosPath { get; internal set; }
    public string FinalNtPath { get; internal set; }
    public string OpenedNtPath { get; internal set; }
    public FileAttributes Attributes { get; internal set; }
    public long Length { get; internal set; }
    public ulong VolumeSerialNumber { get; internal set; }
    public byte[] FileId { get; internal set; }
    public uint NumberOfLinks { get; internal set; }
    public long CreationTime { get; internal set; }
    public long LastWriteTime { get; internal set; }
    public long ChangeTime { get; internal set; }
    public bool DeletePending { get; internal set; }
    public bool Directory { get; internal set; }
    public uint ReparseTag { get; internal set; }
}

public sealed class T37R4KBootstrapResult : IDisposable
{
    private readonly List<SafeFileHandle> handles;
    private readonly List<T37R4KBootstrapSnapshot> original;
    private bool disposed;

    internal T37R4KBootstrapResult(
        List<SafeFileHandle> handles,
        List<T37R4KBootstrapSnapshot> snapshots,
        byte[] bytes,
        string text,
        string sha256)
    {
        this.handles = handles;
        this.original = snapshots;
        Bytes = bytes;
        Text = text;
        Sha256 = sha256;
        Components = snapshots.AsReadOnly();
        Final = snapshots[snapshots.Count - 1];
    }

    public byte[] Bytes { get; private set; }
    public string Text { get; private set; }
    public string Sha256 { get; private set; }
    public IReadOnlyList<T37R4KBootstrapSnapshot> Components { get; private set; }
    public T37R4KBootstrapSnapshot Final { get; private set; }
    public bool IsDisposed { get { return disposed; } }

    public void AssertStable()
    {
        if (disposed) throw new ObjectDisposedException("T37R4KBootstrapResult");
        for (int i = 0; i < handles.Count; i++)
        {
            T37R4KBootstrapSnapshot now = T37R4KBootstrapNative.Capture(handles[i], original[i].InputDosPath);
            T37R4KBootstrapNative.AssertSame(original[i], now, "component[" + i + "]");
        }

        byte[] reread = T37R4KBootstrapNative.ReadExact(handles[handles.Count - 1], Bytes.LongLength);
        if (!T37R4KBootstrapNative.BytesEqual(Bytes, reread))
            throw new InvalidDataException("Final source bytes changed while bootstrap handles were held.");
        string hash = T37R4KBootstrapNative.Sha256Hex(reread);
        if (!String.Equals(hash, Sha256, StringComparison.Ordinal))
            throw new InvalidDataException("Final source hash changed while bootstrap handles were held.");
    }

    public void Dispose()
    {
        if (disposed) return;
        disposed = true;
        for (int i = handles.Count - 1; i >= 0; i--) handles[i].Dispose();
    }
}

public static class T37R4KBootstrap
{
    public static T37R4KBootstrapResult OpenAndVerify(string canonicalAbsoluteDosPath, long expectedLength, string expectedSha256)
    {
        if (expectedLength < 0) throw new ArgumentOutOfRangeException("expectedLength");
        if (String.IsNullOrEmpty(expectedSha256) || expectedSha256.Length != 64)
            throw new ArgumentException("Expected SHA-256 must be exactly 64 uppercase hexadecimal characters.", "expectedSha256");
        for (int i = 0; i < expectedSha256.Length; i++)
        {
            char c = expectedSha256[i];
            if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F')))
                throw new ArgumentException("Expected SHA-256 must be uppercase hexadecimal.", "expectedSha256");
        }

        List<string> componentPaths = T37R4KBootstrapNative.ValidateAndExpandCanonicalPath(canonicalAbsoluteDosPath);
        List<SafeFileHandle> handles = new List<SafeFileHandle>(componentPaths.Count);
        List<T37R4KBootstrapSnapshot> snapshots = new List<T37R4KBootstrapSnapshot>(componentPaths.Count);
        try
        {
            for (int i = 0; i < componentPaths.Count; i++)
            {
                bool directoryExpected = i != componentPaths.Count - 1;
                SafeFileHandle handle = T37R4KBootstrapNative.OpenComponent(componentPaths[i], directoryExpected);
                handles.Add(handle);
                T37R4KBootstrapSnapshot snapshot = T37R4KBootstrapNative.Capture(handle, componentPaths[i]);
                if (snapshot.Directory != directoryExpected)
                    throw new InvalidDataException("Component directory/file type mismatch: " + componentPaths[i]);
                if ((snapshot.Attributes & FileAttributes.ReparsePoint) != 0 || snapshot.ReparseTag != 0)
                    throw new InvalidDataException("Reparse points are forbidden: " + componentPaths[i]);
                string expectedFinalDos = "\\\\?\\" + componentPaths[i];
                if (!String.Equals(snapshot.FinalDosPath, expectedFinalDos, StringComparison.Ordinal))
                    throw new InvalidDataException("Opened path is not the exact canonical DOS path: " + componentPaths[i]);
                if (String.IsNullOrEmpty(snapshot.FinalNtPath) || !snapshot.FinalNtPath.StartsWith("\\Device\\", StringComparison.Ordinal))
                    throw new InvalidDataException("Opened path has no normalized NT device binding: " + componentPaths[i]);
                if (String.IsNullOrEmpty(snapshot.OpenedNtPath) || !snapshot.OpenedNtPath.StartsWith("\\Device\\", StringComparison.Ordinal))
                    throw new InvalidDataException("Opened path has no opened-name NT device binding: " + componentPaths[i]);
                if (!String.Equals(snapshot.OpenedNtPath, snapshot.FinalNtPath, StringComparison.Ordinal))
                    throw new InvalidDataException("Opened and normalized NT paths differ; alternate path syntax is forbidden: " + componentPaths[i]);
                snapshots.Add(snapshot);
            }

            T37R4KBootstrapSnapshot final = snapshots[snapshots.Count - 1];
            if (final.Length != expectedLength)
                throw new InvalidDataException("Source byte length mismatch.");
            if (final.NumberOfLinks != 1)
                throw new InvalidDataException("Alternate hard-link paths are forbidden for runner source.");

            byte[] bytes = T37R4KBootstrapNative.ReadExact(handles[handles.Count - 1], expectedLength);
            string sha256 = T37R4KBootstrapNative.Sha256Hex(bytes);
            if (!String.Equals(sha256, expectedSha256, StringComparison.Ordinal))
                throw new InvalidDataException("Source SHA-256 mismatch.");
            string text = T37R4KBootstrapNative.DecodeStrictUtf8LfOnly(bytes);

            T37R4KBootstrapResult result = new T37R4KBootstrapResult(handles, snapshots, bytes, text, sha256);
            result.AssertStable();
            return result;
        }
        catch
        {
            for (int i = handles.Count - 1; i >= 0; i--) handles[i].Dispose();
            throw;
        }
    }
}

internal static class T37R4KBootstrapNative
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint FILE_READ_ATTRIBUTES = 0x00000080;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint OPEN_EXISTING = 3;
    private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
    private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
    private const uint FILE_FLAG_RANDOM_ACCESS = 0x10000000;
    private const uint VOLUME_NAME_DOS = 0x0;
    private const uint VOLUME_NAME_NT = 0x2;
    private const uint FILE_NAME_OPENED = 0x8;
    private const int FileBasicInfo = 0;
    private const int FileStandardInfo = 1;
    private const int FileAttributeTagInfo = 9;
    private const int FileIdInfo = 18;

    [StructLayout(LayoutKind.Sequential)]
    private struct FILETIME_RAW { public uint Low; public uint High; }

    [StructLayout(LayoutKind.Sequential)]
    private struct BY_HANDLE_FILE_INFORMATION
    {
        public uint FileAttributes;
        public FILETIME_RAW CreationTime;
        public FILETIME_RAW LastAccessTime;
        public FILETIME_RAW LastWriteTime;
        public uint VolumeSerialNumber;
        public uint FileSizeHigh;
        public uint FileSizeLow;
        public uint NumberOfLinks;
        public uint FileIndexHigh;
        public uint FileIndexLow;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFileW(
        string fileName, uint desiredAccess, uint shareMode, IntPtr securityAttributes,
        uint creationDisposition, uint flagsAndAttributes, IntPtr templateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetFileInformationByHandle(
        SafeFileHandle file, out BY_HANDLE_FILE_INFORMATION information);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetFileInformationByHandleEx(
        SafeFileHandle file, int informationClass, IntPtr information, uint bufferSize);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFinalPathNameByHandleW(
        SafeFileHandle file, StringBuilder path, uint pathLength, uint flags);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool ReadFile(
        SafeFileHandle file, IntPtr buffer, uint bytesToRead, out uint bytesRead, IntPtr overlapped);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetFilePointerEx(
        SafeFileHandle file, long distanceToMove, out long newFilePointer, uint moveMethod);

    internal static List<string> ValidateAndExpandCanonicalPath(string path)
    {
        if (String.IsNullOrEmpty(path)) throw new ArgumentException("Path is required.", "path");
        if (path.IndexOf('\0') >= 0) throw new ArgumentException("NUL is forbidden in paths.", "path");
        if (path.IndexOf('/') >= 0) throw new ArgumentException("Forward slashes are noncanonical.", "path");
        if (path.Length < 4 || path[0] < 'A' || path[0] > 'Z' || path[1] != ':' || path[2] != '\\')
            throw new ArgumentException("Path must be an uppercase-drive absolute DOS path.", "path");
        if (path.StartsWith("\\\\", StringComparison.Ordinal) || path.StartsWith("\\?\\", StringComparison.Ordinal) ||
            path.StartsWith("\\.\\", StringComparison.Ordinal) || path.EndsWith("\\", StringComparison.Ordinal))
            throw new ArgumentException("Device, UNC, or trailing-separator paths are forbidden.", "path");
        if (!String.Equals(Path.GetFullPath(path), path, StringComparison.Ordinal))
            throw new ArgumentException("Path is not lexically canonical.", "path");

        string[] parts = path.Substring(3).Split('\\');
        if (parts.Length == 0) throw new ArgumentException("Path must name a file.", "path");
        string[] reserved = new string[] { "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9" };
        foreach (string part in parts)
        {
            if (String.IsNullOrEmpty(part) || part == "." || part == "..")
                throw new ArgumentException("Empty, dot, and dot-dot components are forbidden.", "path");
            if (part.EndsWith(".", StringComparison.Ordinal) || part.EndsWith(" ", StringComparison.Ordinal))
                throw new ArgumentException("Trailing dot or space is forbidden.", "path");
            if (!String.Equals(part.Normalize(NormalizationForm.FormC), part, StringComparison.Ordinal))
                throw new ArgumentException("Path components must use Unicode NFC.", "path");
            for (int i = 0; i < part.Length; i++)
            {
                char c = part[i];
                if (c < 32 || c == ':' || c == '<' || c == '>' || c == '"' || c == '|' || c == '?' || c == '*')
                    throw new ArgumentException("Forbidden character or alternate data stream syntax in path.", "path");
            }
            string stem = part.Split('.')[0].ToUpperInvariant();
            foreach (string device in reserved)
                if (stem == device) throw new ArgumentException("Reserved DOS device name is forbidden.", "path");
        }

        List<string> expanded = new List<string>();
        string current = path.Substring(0, 3);
        expanded.Add(current);
        foreach (string part in parts)
        {
            current = current.EndsWith("\\", StringComparison.Ordinal) ? current + part : current + "\\" + part;
            expanded.Add(current);
        }
        return expanded;
    }

    internal static SafeFileHandle OpenComponent(string canonicalDosPath, bool directoryExpected)
    {
        uint access = directoryExpected ? FILE_READ_ATTRIBUTES : (GENERIC_READ | FILE_READ_ATTRIBUTES);
        uint flags = FILE_FLAG_OPEN_REPARSE_POINT | (directoryExpected ? FILE_FLAG_BACKUP_SEMANTICS : FILE_FLAG_RANDOM_ACCESS);
        SafeFileHandle handle = CreateFileW("\\\\?\\" + canonicalDosPath, access, FILE_SHARE_READ, IntPtr.Zero, OPEN_EXISTING, flags, IntPtr.Zero);
        if (handle.IsInvalid)
        {
            int error = Marshal.GetLastWin32Error();
            handle.Dispose();
            throw new Win32Exception(error, "CreateFileW failed for exact component: " + canonicalDosPath);
        }
        return handle;
    }

    internal static T37R4KBootstrapSnapshot Capture(SafeFileHandle handle, string inputDosPath)
    {
        BY_HANDLE_FILE_INFORMATION legacy;
        if (!GetFileInformationByHandle(handle, out legacy))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFileInformationByHandle failed.");

        IntPtr tagBuffer = Marshal.AllocHGlobal(8);
        IntPtr idBuffer = Marshal.AllocHGlobal(24);
        IntPtr standardBuffer = Marshal.AllocHGlobal(24);
        IntPtr basicBuffer = Marshal.AllocHGlobal(40);
        try
        {
            if (!GetFileInformationByHandleEx(handle, FileAttributeTagInfo, tagBuffer, 8))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "FileAttributeTagInfo failed.");
            if (!GetFileInformationByHandleEx(handle, FileIdInfo, idBuffer, 24))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "FileIdInfo failed.");
            if (!GetFileInformationByHandleEx(handle, FileStandardInfo, standardBuffer, 24))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "FileStandardInfo failed.");
            if (!GetFileInformationByHandleEx(handle, FileBasicInfo, basicBuffer, 40))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "FileBasicInfo failed.");

            byte[] fileId = new byte[16];
            Marshal.Copy(IntPtr.Add(idBuffer, 8), fileId, 0, 16);
            return new T37R4KBootstrapSnapshot
            {
                InputDosPath = inputDosPath,
                FinalDosPath = FinalPath(handle, VOLUME_NAME_DOS),
                FinalNtPath = FinalPath(handle, VOLUME_NAME_NT),
                OpenedNtPath = FinalPath(handle, VOLUME_NAME_NT | FILE_NAME_OPENED),
                Attributes = (FileAttributes)(uint)Marshal.ReadInt32(tagBuffer, 0),
                ReparseTag = (uint)Marshal.ReadInt32(tagBuffer, 4),
                Length = Marshal.ReadInt64(standardBuffer, 8),
                VolumeSerialNumber = unchecked((ulong)Marshal.ReadInt64(idBuffer, 0)),
                FileId = fileId,
                NumberOfLinks = unchecked((uint)Marshal.ReadInt32(standardBuffer, 16)),
                CreationTime = Marshal.ReadInt64(basicBuffer, 0),
                LastWriteTime = Marshal.ReadInt64(basicBuffer, 16),
                ChangeTime = Marshal.ReadInt64(basicBuffer, 24),
                DeletePending = Marshal.ReadByte(standardBuffer, 20) != 0,
                Directory = Marshal.ReadByte(standardBuffer, 21) != 0
            };
        }
        finally
        {
            Marshal.FreeHGlobal(tagBuffer);
            Marshal.FreeHGlobal(idBuffer);
            Marshal.FreeHGlobal(standardBuffer);
            Marshal.FreeHGlobal(basicBuffer);
        }
    }

    private static string FinalPath(SafeFileHandle handle, uint volumeFlag)
    {
        StringBuilder builder = new StringBuilder(512);
        uint length = GetFinalPathNameByHandleW(handle, builder, (uint)builder.Capacity, volumeFlag);
        if (length == 0) throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFinalPathNameByHandleW failed.");
        if (length >= builder.Capacity)
        {
            builder = new StringBuilder(checked((int)length + 1));
            length = GetFinalPathNameByHandleW(handle, builder, (uint)builder.Capacity, volumeFlag);
            if (length == 0 || length >= builder.Capacity)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFinalPathNameByHandleW retry failed.");
        }
        return builder.ToString();
    }

    internal static byte[] ReadExact(SafeFileHandle handle, long expectedLength)
    {
        if (expectedLength < 0 || expectedLength > Int32.MaxValue)
            throw new InvalidDataException("Bootstrap source length is outside the bounded range.");
        byte[] bytes = new byte[(int)expectedLength];
        long position;
        if (!SetFilePointerEx(handle, 0, out position, 0) || position != 0)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "SetFilePointerEx failed before exact read.");
        GCHandle pin = default(GCHandle);
        try
        {
            if (bytes.Length > 0) pin = GCHandle.Alloc(bytes, GCHandleType.Pinned);
            int offset = 0;
            while (offset < bytes.Length)
            {
                uint request = (uint)Math.Min(1024 * 1024, bytes.Length - offset);
                uint read;
                IntPtr pointer = IntPtr.Add(pin.AddrOfPinnedObject(), offset);
                if (!ReadFile(handle, pointer, request, out read, IntPtr.Zero))
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "ReadFile failed.");
                if (read == 0) throw new EndOfStreamException("Unexpected EOF while reading bootstrap source.");
                offset = checked(offset + (int)read);
            }

            byte[] sentinel = new byte[1];
            GCHandle sentinelPin = GCHandle.Alloc(sentinel, GCHandleType.Pinned);
            try
            {
                uint extra;
                if (!ReadFile(handle, sentinelPin.AddrOfPinnedObject(), 1, out extra, IntPtr.Zero))
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "ReadFile EOF check failed.");
                if (extra != 0) throw new InvalidDataException("Source grew beyond the expected exact length.");
            }
            finally { sentinelPin.Free(); }
            return bytes;
        }
        finally { if (pin.IsAllocated) pin.Free(); }
    }

    internal static string DecodeStrictUtf8LfOnly(byte[] bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            throw new InvalidDataException("UTF-8 BOM is forbidden.");
        for (int i = 0; i < bytes.Length; i++)
            if (bytes[i] == 0x0D) throw new InvalidDataException("CR bytes are forbidden; source must be LF-only.");
        UTF8Encoding strict = new UTF8Encoding(false, true);
        string text = strict.GetString(bytes);
        byte[] roundTrip = strict.GetBytes(text);
        if (!BytesEqual(bytes, roundTrip)) throw new InvalidDataException("UTF-8 round-trip mismatch.");
        return text;
    }

    internal static string Sha256Hex(byte[] bytes)
    {
        using (SHA256 sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "");
    }

    internal static bool BytesEqual(byte[] left, byte[] right)
    {
        if (Object.ReferenceEquals(left, right)) return true;
        if (left == null || right == null || left.Length != right.Length) return false;
        int difference = 0;
        for (int i = 0; i < left.Length; i++) difference |= left[i] ^ right[i];
        return difference == 0;
    }

    internal static void AssertSame(T37R4KBootstrapSnapshot expected, T37R4KBootstrapSnapshot actual, string label)
    {
        bool identityChanged =
            !String.Equals(expected.InputDosPath, actual.InputDosPath, StringComparison.Ordinal) ||
            !String.Equals(expected.FinalDosPath, actual.FinalDosPath, StringComparison.Ordinal) ||
            !String.Equals(expected.FinalNtPath, actual.FinalNtPath, StringComparison.Ordinal) ||
            !String.Equals(expected.OpenedNtPath, actual.OpenedNtPath, StringComparison.Ordinal) ||
            expected.Attributes != actual.Attributes ||
            expected.VolumeSerialNumber != actual.VolumeSerialNumber || !BytesEqual(expected.FileId, actual.FileId) ||
            expected.DeletePending != actual.DeletePending || expected.Directory != actual.Directory ||
            expected.ReparseTag != actual.ReparseTag;
        bool immutableFileMetadataChanged = !expected.Directory &&
            (expected.Length != actual.Length || expected.NumberOfLinks != actual.NumberOfLinks ||
             expected.CreationTime != actual.CreationTime || expected.LastWriteTime != actual.LastWriteTime ||
             expected.ChangeTime != actual.ChangeTime);
        if (identityChanged || immutableFileMetadataChanged)
            throw new InvalidDataException("Bootstrap identity/metadata changed: " + label);
    }
}
'@
$bootstrapBytes = [Text.UTF8Encoding]::new($false, $true).GetBytes($bootstrapSource)
Assert-Condition ($bootstrapBytes.Length -eq 21999) 'Inline bootstrap byte count differs.'
Assert-UpperSha ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bootstrapBytes))) '26C7080AC5AD22AA5BB7F68A15C9D81F3B2E7FD935693CFA222D7DBD02FC1A52' 'Inline bootstrap SHA-256'

$nodeArguments = @'
"C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-validate-v4.mjs" --root "E:\Proj\reproduction-tetris" --input "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-clue-v1.json" --output "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-candidate-v4.json" --attempt "C:\Users\Alex Chen\AppData\Local\Temp\t37-f4e-endgame-canonical-attempt-v4.json" --expect-core-base "7d81d4974ce8fb777ea105c5ef98d156cd1807cc" --expect-repo-base "4172a79620cda33e167d291d38c69f0ed64fec89" --expect-core-tree "96688eca803a335790d65b41db0ace4df7d2f9b5" --expect-input-bytes "633" --expect-input-sha "959053671BC2D2E745EC5816851615CE94CBB1E2D9A510DF329665899C387F42" --expect-validator-sha "93952536898D055B793E52A7957C821A51C26C78B0A87B5379D35B551349EC60" --id "t3r-shaft-04" --difficulty "5" --target-rows "4" --max-primary-locks "7" --max-alternative-extra "2"
'@
Assert-Condition (-not ('T37R4KBootstrap' -as [type])) 'Bootstrap types are loaded.'
Assert-Condition (-not ('T37R4KLease' -as [type])) 'Runner types are loaded.'
Assert-Condition ($nodeArguments.IndexOf("`r", [StringComparison]::Ordinal) -lt 0 -and $nodeArguments.IndexOf("`n", [StringComparison]::Ordinal) -lt 0 -and $nodeArguments.IndexOf([char] 0) -lt 0) 'Node arguments are not one safe line.'
$nodeArgumentBytes = [Text.UTF8Encoding]::new($false, $true).GetBytes($nodeArguments)
Assert-Condition ($nodeArgumentBytes.Length -eq 876) 'Node argument byte count differs.'
Assert-UpperSha ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($nodeArgumentBytes))) 'C3D76AEC1DEC4A675FA141BB8BF330AAE53AA658A0407A8EA09BBB497E36433E' 'Node argument SHA-256'

try {
  Add-Type -TypeDefinition $bootstrapSource -Language CSharp
  $runnerBootstrap = [T37R4KBootstrap]::OpenAndVerify($runnerSourcePath, 63640, '178584C03DC1103F29D4038FF2A69B7301EBA2DCDBE28085D2D4220F573B3003')
  Assert-Condition (-not ('T37R4KLease' -as [type])) 'Runner types preexisted verified source.'
  Add-Type -TypeDefinition $runnerBootstrap.Text -Language CSharp
  $runnerLease = [T37R4KLease]::new($runnerSourcePath)
  Assert-BootstrapRunnerBinding
  $nodeLease = [T37R4KLease]::new($node)
  $gitLease = [T37R4KLease]::new($git)
  $validatorV2Lease = [T37R4KLease]::new($validatorV2)
  $validatorV3Lease = [T37R4KLease]::new($validatorV3)
  $validatorV4Lease = [T37R4KLease]::new($validatorV4)
  $inputLease = [T37R4KLease]::new($cluePath)
  $attemptV3Lease = [T37R4KLease]::new($attemptV3)
  Assert-PreflightState
  Assert-PreflightState

# T37-R4L-PRODUCTION-CALL-BEGIN
  $productionAttemptEntered = $true
  $productionExitCode = [T37R4KRunner]::Run($node, $nodeArguments, $root, $nodeLease)
  if ($productionExitCode -ne 0) { throw "The sole v4 validator attempt failed with exit code $productionExitCode." }
# T37-R4L-PRODUCTION-CALL-END
} catch {
  $failure = $_.Exception
} finally {
  for ($index = $scopedBindings.Count - 1; $index -ge 0; $index -= 1) {
    $scopedLease = $scopedBindings[$index].Lease
    if ($null -ne $scopedLease) {
      if ($productionAttemptEntered) {
        try { $scopedLease.Dispose() } catch { }
      } else {
        try { $scopedLease.Dispose() } catch { $preflightCleanupFailures += $_.Exception.Message }
      }
    }
  }
  foreach ($lease in @($attemptV3Lease, $inputLease, $validatorV4Lease, $validatorV3Lease, $validatorV2Lease, $gitLease, $nodeLease, $runnerLease)) {
    if ($null -ne $lease) {
      if ($productionAttemptEntered) {
        try { $lease.Dispose() } catch { }
      } else {
        try { $lease.Dispose() } catch { $preflightCleanupFailures += $_.Exception.Message }
      }
    }
  }
  if ($null -ne $runnerBootstrap) {
    if ($productionAttemptEntered) {
      try { $runnerBootstrap.Dispose() } catch { }
    } else {
      try { $runnerBootstrap.Dispose() } catch { $preflightCleanupFailures += $_.Exception.Message }
    }
  }
}

$failureMessages = @()
if ($null -ne $failure) { $failureMessages += $failure.Message }
if (-not $productionAttemptEntered -and $preflightCleanupFailures.Count -gt 0) {
  $failureMessages += ('Preflight cleanup failures: ' + [string]::Join(' | ', $preflightCleanupFailures))
}
if ($failureMessages.Count -gt 0) {
  $message = [string]::Join(' | ', $failureMessages)
  if ($productionAttemptEntered) { $message += ' Do not retry.' }
  throw $message
}
```

The hash-bound no-spawn derivative replaces only the delimited 302-byte production
block in memory. Its 63,933 derived bytes hash to
`5E9D2DEF71E1A3ED01537415CB554F6382E7FE430CB3F45AF8F91FF2829617C2`
and retain only the bound Git runner call. The reviewed harness completed the full
preflight in 52.5 seconds with the sole output
`T37-R4L-NO-SPAWN-PREFLIGHT-PASS`; it created no v4 receipt, output, stage, or process.
This materialization alone does not open production execution.

## 2026-08-17 F4E-R6A — memory-bounded exact frontier infrastructure

This section supersedes older F4E next-action text. V5 is permanently consumed by the
audited default-heap failure recorded in `F4E-R5-CONSUMED-V1`; it produced no candidate
and does not prove Intro-05 unsatisfiable. A v6 production attempt remains closed.

Before v6, the renderer-independent exact certifier gains an optional frontier-store
boundary. Core continues to own every proof decision in the same order: decode the full
11-segment canonical state key, apply the existing target-column-deficit lower bound,
enumerate the complete public-control landing domain, reject any shorter win before child
pruning, apply the same child bound, and emit the same complete key. The default store keeps
the current in-memory behavior and every existing call remains source-compatible.

The Node-only authoring adapter stores only full canonical ASCII keys. It may not use a
hash, board mask, target-row projection, probabilistic structure, or other lossy identity.
It buffers a fixed 64 MiB raw-key budget, sorts and fully deduplicates each chunk, then
performs a deterministic k-way full-byte merge into the next layer. Only a bounded chunk,
one line per merge input, and bounded read/write buffers may be resident. Layer descriptors
carry exact unique-key count; Core telemetry and certificate fields remain unchanged.

The injected lifecycle is fail-closed. Core disposes the current layer after the next layer
is finalized and closes the entire store on success or exception. The adapter owns one
caller-supplied, already-empty staging directory; exclusive creation, regular-file checks,
ASCII/LF framing, exact count, deterministic names, complete write/flush/close handling,
and recursive *enumeration* are mandatory. Cleanup deletes only exact files created under
that verified directory. Any open/read/write/sort/merge/close/count/cleanup fault propagates,
cannot yield a certificate, and must be observable to a later terminal owner as residue or
an explicit cleanup failure.

The infrastructure checkpoint is limited to:

- `src/game/core/endgameRouteSearch.ts`;
- one focused Core frontier-store test;
- `scripts/endgame-disk-frontier.mjs`;
- one focused Node adapter test.

Acceptance requires old-versus-injected certificate equality for Intro-01 through Intro-04
and small synthetic definitions, including every telemetry field; deterministic chunk-order
and duplicate collapse; multi-chunk k-way merge; full-key collision adversaries; bounded
buffer accounting; and injected create/write/read/merge/close/cleanup failures. No test or
diagnostic may run Intro-05, a partial Intro-05 depth, or target-specific sampling. This is
proof infrastructure only, has no gameplay, renderer, storage, audio, score, or browser
behavior change, and does not authorize v6.

After focused and full automated gates plus independent all-zero QA, commit the infrastructure.
Only then may a fresh docs-first v6 validator contract bind the new Core tree and adapter blob,
new validator/candidate/attempt/terminal/staging schemas, and explicit runtime heap domain.
