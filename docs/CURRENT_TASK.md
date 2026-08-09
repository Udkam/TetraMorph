# Current Task — T37 Unified Material Feedback and Puzzle Curriculum

Status: **IN PROGRESS — first audio audition rejected; motion-linked audition R2**

## Active objective

Rebuild TetraMorph around one coherent physical-material language, then restructure
Puzzle into a certified 5/25/16 learning curriculum. T37 supersedes the rejected T36
audible palette and combines four user-visible concerns that must agree rather than be
polished independently: tactile sound, page transitions, ordinary/Mutation piece
materials, and Puzzle progression.

## Frozen product direction

- **Sound:** replace the entire audible palette. Feedback must be clear, positive,
  restrained, non-harsh, and materially tactile. Do not use exposed electronic tones,
  arcade bleeps, melodies, music, licensed samples, or copied commercial cues. Preserve
  only proven mixer ownership, priority, master controls, bounded voices, deterministic
  scheduling, and teardown. A small core-cue audition set is a hard human-listening gate
  before the palette expands.
- **Transitions:** give route/page changes one calm motion grammar: short opacity and
  small spatial continuity, no flashes, no large wipes, no gameplay-input delay, and a
  reduced-motion form that is effectively instant.
- **Pieces:** ordinary tetrominoes remain the familiar multicolour family. Mutation no
  longer appears as an attached carrier badge or overlay: the complete tetromino is a
  dedicated material object. Ice uses cold crystalline cyan, Bomb uses contained lava,
  Multiplier uses restrained gold glints, and Supergravity uses luminous violet mass.
  Every cell of a Mutation piece may release its item, but the piece triggers exactly
  once. Board, active piece, ghost, Next, clear feedback, and audio must agree.
- **Puzzle:** ship exactly 46 levels split into 5 Intro, 25 Easy, and 16 Hard levels.
  Intro is fully rebuilt around guided 3–4-row positions. Easy stays fully open and
  teaches reusable techniques while retaining normal residual-board puzzles. Hard uses
  distinctive, related applications such as tall trick boards, multiple anchors,
  hollow/two-wall/top structures, triangles, pyramids, and bounded board-shape variants.
  Repeated residual boards are removed. Every published level requires a deterministic
  strict solution certificate and confirmed optimum.
- Hard unlocks are attached to explicitly related Easy techniques. The qualifying Easy
  result is at most `certified optimum + 5` operations. Stable level IDs and stored
  progress must migrate without silently awarding completion.
- Preserve deterministic renderer-independent Core, React/Pixi ownership, one Canvas,
  touch and keyboard safety, three visual themes, bilingual copy, and all accepted
  Classic/Survival/Supergravity behavior not explicitly superseded here.

## Ordered checkpoints

1. **Contract** — this file, `docs/DESIGN.md`, T37 phase contract, and bounded run state.
2. **Audio audition gate** — implement and export a compact representative set covering
   movement, rotation, lock, hard drop, 1–4-line clears, countdown, and one Mutation
   activation. Stop expansion until human listening accepts the language.
3. **Complete audio palette** — extend only the accepted grammar to remaining gameplay,
   Survival, Mutation, Puzzle, and UI events; prove hierarchy, voice bounds, controls,
   determinism, and cleanup.
4. **Transition system** — route shell and page transitions with explicit
   reduced-motion behavior and no duplicate mounts/listeners/canvases.
5. **Material system** — ordinary-piece polish and the four whole-piece Mutation
   materials, including Next/ghost/clear/audio agreement and once-per-piece triggering.
6. **Puzzle curriculum** — 5/25/16 content, deduplication, solver certificates,
   technique links, unlock migration, and UI pagination.
7. **Integrated acceptance** — focused tests during editing, then one final typecheck,
   complete suite, build, browser evidence pass, independent read-only QA, changelog,
   bounded commits, and coordinator push.

## Current checkpoint state

- Audition R1 source `0bebf8a` and evidence `2ff0bb6` are **REJECTED BY HUMAN
  LISTENING**. The player found the result quieter, less connected to the matching
  effect/function, and worse than the earliest design. Its passing `21/21` tests,
  typecheck, deterministic WAV hashes, and zero clipping do not mitigate that verdict.
- Audition R2 reuses the earliest design's clear action contours, not its electronic
  timbre. Move maps to lateral settle, rotate to pivot/detent, hard drop to descent plus
  contact, line clear to the visual sweep and one-to-four row releases, countdown to
  physical cadence, and Ice to the 320 ms frost-bind/shard-release timeline.
- Normal clears must begin audibly on `clear-started` and resolve across Core's 200 ms
  clear interval instead of arriving only after `lines-cleared`.
- R2 source ownership is limited to `src/game/audio/AudioEngine.ts`, its direct test,
  and the four `audioGesture` / `audioPalette` source-test paths. Do not expand the
  other sixteen cue recipes, start a server/browser, or begin visual implementation.

Inherited dirty `docs/evidence/t27/**`, `docs/evidence/t27-r1-followup/**`, and
`progress.md` remain outside T37 and must not be staged.

## T37 acceptance boundary

- Passing tests or measurements cannot accept sound; explicit listening acceptance is
  required before checkpoint 3.
- A visual state is not accepted unless a current-source browser frame demonstrates the
  active piece, Next, ghost/landing guide, relevant status, all three themes, and both
  motion preferences without clipping or console errors.
- A Puzzle level is not accepted because a heuristic solver found one route. Its exact
  initial hash, fixed queue, ruleset, optimum, replay, and technique/unlock metadata
  must be reproducible from the public verification command.
- “Complete” is reserved for the final integrated candidate after multiple acceptance
  rounds. Until then every checkpoint remains a bounded candidate or listening gate.

---

# Previous Task — T36 Kinetic Harmonic Audio Recomposition

Status: **REJECTED BY HUMAN LISTENING 2026-08-09 — superseded by T37**

## Active objective

Recompose every audible event as a short kinetic-harmonic response: an action excites a
material body, the body opens into a controlled spectral contour, and the contour
resolves into space. Preserve only T35's proven routing, priority, volume, safety, and
lifecycle infrastructure. Replace its resonator-and-air timbres, remove default
continuous ambience, and deliver a new directly playable WAV matrix generated from the
same production recipes. Automated gates may establish a listening candidate, never
human acceptance.

## Frozen behavior

- Keep Gameplay, Reward, Mutation, Ambient, and UI buses, deterministic scheduling,
  sixteen-voice ceiling, master volume/mute, same-frame event suppression, and exact
  disable/destroy cleanup. The Ambient bus remains available, but no default sustained
  bed or musical loop may start.
- Replace exposed Web Audio oscillator gestures with deterministic, short, buffered
  procedural instruments: felt excitation, rounded impact, spectral ribbon, inharmonic
  glass, reward shimmer, and a restrained countdown pulse. Each layer is rendered as
  one bounded AudioBuffer voice so rapid play cannot create a node swarm.
- Controls must remain soft under repetition while still readable. Feedback energy is
  strictly ordered: move < rotate < lock < hard drop < one/two/three-line clear <
  Mutation < four-line clear/completion. The clear family shares one identity contour
  and grows by bandwidth, motion, duration, and mass rather than exposed chords.
- Ice, Supergravity, Bomb, x2, and x4 are distinct state-change gestures with no
  sustained loop. Supergravity has no continuous or landing sound. Survival cues use
  restrained stone mass; UI cues stay concise; countdown is exactly three related
  pulses with the final pulse longer and resolving, with no extra cover-exit sound.
- Recompose movement, rotation, drop, lock, all clear sizes, level/completion/game over,
  countdown, pause/resume, Puzzle undo, Survival bedrock/stone, and all current Mutation
  activations. One bounded companion visual cleanup removes the decorative glow behind
  the Mutation-status heading while preserving its text, position, and status content.
  No gameplay, scoring, layout, or rule change is in scope.
- Produce directly playable WAV suites plus a source-bound manifest with peak, RMS,
  clipping, repetition-density, and cue-boundary measurements. Browser evidence remains
  required, but neither measurements nor screenshots may stand in for listening.
- After final gates and independent read-only QA, status remains **CANDIDATE / LISTENING
  REQUIRED** until the user explicitly accepts the sound.

## Ordered checkpoints

1. **Contract** — this file, `docs/DESIGN.md`, the T36 phase document, and the bounded
   run state only.
2. **Instrument foundation** — deterministic PCM instruments, one-buffer voice
   scheduling, and direct tests for reproducibility, envelope safety, and cleanup.
3. **Complete palette** — replace every T35 recipe, remove default ambience, then run
   focused tests for hierarchy, event coverage, priority, mute/volume, bounded voices,
   and cleanup.
4. **Mutation heading cleanup** — remove only the status-title glow in a separate
   visual source checkpoint and verify the affected themes/states.
5. **Audition proof** — playable WAV cue matrix and measurement manifest generated
   from the production recipes, then one final typecheck/full suite/build/browser pass.
6. **Independent QA and handoff** — QA may validate correctness and evidence binding;
   only user listening may accept the palette. Coordinator then records the result and
   pushes the bounded candidate chain.

Inherited dirty `docs/evidence/t27/**`, `docs/evidence/t27-r1-followup/**`, and
`progress.md` remain outside T36 and must not be staged.

## T36 acceptance boundary

- T36 must not reuse T35 cue recipes with parameter-only edits. Reuse is limited to
  buses, event ownership, safety, rate limiting, master controls, and teardown.
- The final listening set must make rapid movement comfortable, lock and hard drop
  distinguishable, all four clear sizes identifiable, five Mutation activations
  separable, and the three countdown beats coherent on ordinary speakers.
- A user rejection reopens the palette; it is not converted into acceptance by passing
  tests, metrics, browser evidence, or independent QA.

## Verified candidate

- Product audio and the bounded Mutation-heading cleanup end at `39216d1`; generated
  WAV evidence is recorded at `4205612`, and final browser evidence at `4433aaf`.
- Final typecheck, the complete suite (`380 passed / 8 skipped`), production build,
  one-Canvas/zero-DOM-cell browser audit, live audio controls, and zero browser errors
  pass. Port 4189 was released after the short-lived evidence run.
- Independent read-only QA accepted candidate `4433aaf` with no blocking finding.
  Subjective timbre, balance, fatigue, and device loudness remain intentionally open
  until the user listens to the six committed WAV suites.

---

# Previous Task — T35 Audition-Led Material Gesture Audio Rebuild

Status: **REJECTED BY HUMAN LISTENING 2026-08-07 — superseded by T36**

T35 passed typecheck, the complete automated suite, build, browser evidence, generated
WAV measurements, and independent read-only QA. Its physical-gesture palette still did
not pass human listening, so its audible recipes are rejected. Commit `052d9ec` remains
the immutable rollback point and evidence archive; T36 retains only the proven audio
infrastructure named above.

---

# Previous Task — T34 Responsive Gravity Instrument Audio

Status: **REJECTED BY HUMAN LISTENING 2026-08-07 — superseded by T35**

## Active objective

Implement the supplied TetraMorph Sound Direction v2 as one coherent procedural audio
system. The target feeling is a calm gravity instrument that gives unmistakable,
positive response without harsh transients, generic arcade language, licensed music,
or unrelated visual/gameplay changes.

## Frozen behavior

- Route cues through five named buses: Gameplay, Reward, Mutation, Ambient, and UI.
  Preserve the master volume setting, enable/disable behavior, compressor safety path,
  deterministic synthesis, sixteen transient-voice ceiling, and lifecycle cleanup.
- Use layered synthesis where it materially improves identity: oscillator body,
  secondary harmonic, filtered deterministic air/material texture, and a quiet spatial
  tail. A layered cue is still one semantic event.
- Preserve the feedback hierarchy `move < rotate < lock < clear < Mutation < four-line
  clear/completion`. Resolve conflicts by event priority and ownership rather than by
  piling every sound into the same frame.
- Ship the high-value palette first: 1/2/3/4-line clears, hard drop/lock, Ice,
  Supergravity, Bomb, and Multiplier. Then align movement/rotation/drop, Survival, UI,
  and theme ambience to the same material language.
- No Mutation sustained loop. No music. Theme ambience is a barely audible procedural
  room tone that follows Deep Tide, Mineral Mist, or Sunstone and stops on disable or
  teardown.
- Entry countdown remains its accepted three-part cadence. This phase does not alter
  Core rules, scoring, Mutation ownership, Puzzle content, Survival timing, page
  layout, or renderer effects.

## Ordered checkpoints

1. **Contract** — `docs/DESIGN.md`, `docs/CURRENT_TASK.md`, and
   `docs/phases/t34-responsive-gravity-audio.md` only.
2. **Audio foundation** — `src/game/audio/AudioEngine.ts` and its direct test: five
   buses, layered routing helpers, deterministic filtered texture, spatial tail, theme
   ambience ownership, and cleanup.
3. **Priority palette** — the same audio pair only: clear hierarchy, hard drop/lock,
   and Mutation activation grammar.
4. **Secondary palette and runtime bridge** — movement/rotation/drop, Survival, UI, and
   the smallest runtime path needed to synchronize the existing visual theme. Exact
   runtime/test paths must be named before editing.
5. **Final proof** — one typecheck, one full suite, one build, one bounded browser
   evidence pass, independent read-only QA, changelog/acceptance commits, then push.

The normal ten-path/five-hundred-line checkpoint budget applies. Existing dirty
`docs/evidence/t27/**`, `docs/evidence/t27-r1-followup/**`, and `progress.md` are inherited
and must never be staged by T34.

## Acceptance evidence

- Focused audio/runtime tests pass `48 / 48`; the final typecheck, complete suite
  (`391 passed / 8 skipped`), and production build pass. The build retains only the
  existing bundle-size advisory.
- `docs/evidence/t34/responsive-audio-audit.json` is bound to source `a99a934` and
  records enabled 100% audio, mute/restore, a live 64% volume change, all three visual
  themes, one gameplay Canvas, zero DOM board cells, and zero console/page errors.
- Direct tests, rather than screenshot inference, prove deterministic schedules,
  five-bus routing, reward hierarchy, bounded voices, ambient switching, and exact
  disable/destroy cleanup.
- Independent read-only QA accepted `4593acf..67325a9` with no P0/P1/P2 finding.
  Remaining cross-device loudness and timbre preference requires human listening and
  is explicitly outside automated proof.

---

# Previous Task — T33 Supergravity Five-Piece Coverage

Status: **ACCEPTED 2026-08-06 — source `60c3fdd`, rule-copy repair `909f904`,
evidence `b887994`; independent QA PASS**

## Active objective

Replace Mutation Supergravity's five-second timer with coverage of the next five
spawned tetrominoes. Each covered piece owns an immutable per-piece Supergravity latch
from its first visible row through ghost projection and final settlement. The global
counter records only how many future pieces remain to be claimed; it may reach zero
while the fifth piece is airborne without changing that piece's landing behavior.

## Frozen behavior

- A cleared Supergravity carrier refreshes the future-piece quota to exactly five; it
  does not stack beyond five and does not retroactively alter the already-locked carrier
  piece that awarded it.
- Each subsequent successful spawn consumes one quota and latches Supergravity onto
  that exact piece. Movement, rotation, row-wise entry, pausing, and unrelated Mutation
  activation do not consume another quota.
- Ghost projection and final lock use the piece latch, never the remaining global
  quota. The fifth covered piece therefore keeps independent-column landing after the
  visible counter reaches zero.
- The Mutation status ledger presents a piece count rather than seconds or a timed
  progress meter. Chinese copy uses `剩余 N 块`; English copy uses `N pieces left`.
- Re-triggering Supergravity while a covered piece is already airborne refreshes the
  quota for future spawns to five while preserving the airborne piece's latch.

## Scope and checkpoints

- Contract: `docs/DESIGN.md`, `docs/CURRENT_TASK.md`,
  `docs/phases/t33-supergravity-five-piece-coverage.md`.
- Core: Supergravity state/types, activation, spawn consumption, latch, ghost/lock, and
  focused deterministic tests.
- UI: Mutation status/localization and direct tests only; no unrelated visual redesign.
- Atomic source exception: the implementation checkpoint may touch exactly these 12
  paths because renaming the shared canonical state from timed Supergravity to
  piece-count coverage cannot leave a green intermediate tree with Core and UI using
  different units: `src/game/core/constants.ts`, `src/game/core/types.ts`,
  `src/game/core/mutation.ts`, `src/game/core/engine.ts`,
  `src/game/core/sprint.test.ts`, `src/game/render/presentation.test.ts`,
  `src/game/render/TetrisRenderer.ts`, `src/game/render/TetrisRenderer.test.ts`,
  `src/game/audio/AudioEngine.test.ts`, `src/App.tsx`, `src/App.test.ts`, and
  `src/ui/localization.ts`. No other product/test path is authorized in that checkpoint.
- Final: one typecheck, one full suite, one build, one bounded browser evidence pass,
  independent QA, changelog, exact-path commits, then push.
- Inherited T27 evidence and `progress.md` remain untouched and unstaged.

## Acceptance evidence

- Focused App regression: `56 / 56` passed after the final localization repair.
- Final quality gates: typecheck PASS; complete suite `388 passed / 8 skipped`; build
  PASS with only the existing chunk-size advisory.
- Browser audit at source `909f90421f332eb6a5ac301724fbceb029521cb7` records
  `remaining: 4`, `landingLatched: true`, one gameplay canvas, and zero failures after
  the first covered spawn.
- Independent read-only QA confirms the five-piece Core/latch contract and the repaired
  Chinese/English rule copy with no remaining P0-P3 finding.
- The bounded Vite evidence service on port 5190 was stopped and the listener released.

---

# Previous Task — T31-R1 and T32 Final Acceptance

Status: **ACCEPTED 2026-08-06 — T31 evidence `a76e5e5`; T32 evidence `75cc2f9`**

## 2026-08-07 T32 certificate-fingerprint maintenance

Status: **ACCEPTED 2026-08-07 — contract `d31a84b`; source/test `3d69132`.** The
exhaustive solver reproduced all three certified routes, optimal operation counts,
frontier widths, explored-state counts, transition counts, and deficit-prune counts;
only the three frozen `initialStateHash` values changed after anchor-supported Puzzle
cells became future-relevant Core state. The opt-in exact suite passed `3/3`, the
focused T31/T32 suite passed `212/212`, and the final repository gates passed typecheck,
`380 passed / 8 skipped`, and production build. This certificate-only maintenance is
nonvisual and noninteractive, so the already accepted T31/T32 browser evidence was
audited rather than regenerated.

## Combined closure

- T31-R1/R3: Mutation status clarity, independent Next rendering, row-wise spatial
  entry, Supergravity expiry latch/preview agreement, and local Ice/Supergravity
  activation feedback are verified on current `main`.
- T32: the rebuilt 10/20/20 Puzzle curriculum, migration, strict solver certificates,
  progression graph, and anchor-safe clear mapping are accepted.
- Final source gates, browser evidence, teardown, and independent QA passed for both
  phases. No unverified requirement remains in this combined objective.

## Anchor support correction

- A fixed Puzzle anchor keeps its world coordinate during line clears.
- The exact cells of a settled placement that locks onto an anchor-supported chain are
  tracked as one supported unit; lower clears cannot pull its off-column cells downward
  or tear its shape, and adjacent same-material placements are not inferred into it.
- A tracked support cell removed by the current clear is discarded before collision
  boundaries resolve, so it cannot leave a phantom floor behind.
- Canonical Puzzle target coordinates and supported placement coordinates follow the
  same transform as the board.

## Active goal

Remove the rejected Reshape carrier; align the Supergravity ghost with the canonical
per-piece latch; replace Supergravity/Ice activation, clear, trail, and audio feedback;
restore the earlier information-rich Mutation status as one frameless ledger; and apply
the clarified row-by-row active-piece arrival. T31-R1 additionally restores the
frameless Next preview on a dedicated unmasked Pixi plane, strengthens the Mutation
ledger hierarchy without adding cards, and proves that an airborne Supergravity-latched
piece keeps its projected and final independent-column landing after global expiry. The
authoritative behavior contract is the top T31 section of `docs/DESIGN.md`.

Player re-review reopens three T31-R2 acceptance claims before T32 board authoring:
the frameless Mutation status must become unmistakably readable without restoring row
cards, an airborne Supergravity-latched piece must retain both independent-column lock
and matching complete landing preview after the global timer reaches zero, and the
frameless Next piece must remain visibly rendered in active Classic and Mutation play.
These are regression repairs, not permission to broaden Mutation mechanics.

The reopened claims are one continuous delivery target rather than a new feature
branch. The status ledger must remain frameless but gain enough typographic, signal,
spacing, and meter contrast to be read at a glance against all three themes. Next must
be anchored to the current gameplay arena rather than whichever matching DOM node is
found first, stay inside the live Canvas bounds, and have real visible pixels at both
1440 × 900 and the reported 1125 × 1196 layout. Supergravity compensation belongs to
the current active-piece generation: once that airborne piece latches the effect, its
complete independent-column guide and final settlement persist through global expiry,
row-wise board-mouth entry, movement, and rotation until that exact piece locks.

## Scope and ownership

- Coordinator/writer: primary task `/root`.
- Base: `main@7392edf372324dbf7fbb9fc08d606dc9e0d94070`.
- Contract checkpoint paths: `docs/DESIGN.md`, `docs/CURRENT_TASK.md`,
  `docs/phases/t31-mutation-gravity-and-feedback.md`, and `progress.md` only.
- Core checkpoint paths: `src/game/core/types.ts`, `src/game/core/engine.ts`,
  `src/game/core/sprint.test.ts`, `src/game/render/presentation.ts`, and its direct test.
- Feedback checkpoint paths: Mutation token/timeline/theme files and direct tests,
  `src/game/render/TetrisRenderer.ts` plus direct test, and `src/game/audio/AudioEngine.ts`
  plus direct test.
- UI checkpoint paths: `src/App.tsx`, `src/App.test.ts`, `src/ui/localization.ts`, and
  `src/styles/mutation-vfx.css` / `src/styles/hud.css` plus direct tests where required.
- Arrival clarification paths: `src/game/render/presentation.ts` and its direct test,
  plus renderer snapshot coverage only if the pure row grouping changes that contract.
- Evidence, independent QA, changelog, and accepted status are later separate
  checkpoints. Existing dirty `docs/evidence/t27/**` and
  `docs/evidence/t27-r1-followup/**` are inherited user evidence and remain unstaged
  and unmodified.
- No scoring, Bomb/Multiplier mechanics, ordinary clear profile, Survival, Puzzle,
  theme selection, layout, navigation, persistence, dependency, or package change is
  authorized.

## Ordered checkpoints

1. **T31 contract** — freeze the four-item pool, latch semantics, visual/audio grammar,
   status layout, exact paths, and evidence before source edits.
2. **T31 Core and preview** — remove Reshape and prove timer-or-latch agreement for
   Supergravity lock and ghost projection.
3. **T31 feedback** — implement local Ice/Supergravity activation and clear grammar,
   replace the trail, remove sustained/landing feedback, and cover reduced motion.
4. **T31 status and copy** — use frameless ledger rows with only signal/name/thin time
   line visible, and remove Reshape from live localized rules. Remaining seconds stay
   accessible but are not rendered as row copy.
5. **T31 row arrival clarification** — preserve hidden Core spawn rows and clip at the
   board mouth: the lower occupied row enters board row 1 first, then the next row enters
   after the current gravity interval while the lower row advances. No opacity/scale
   reveal or renderer-only whole-piece shift is accepted.
6. **T31-R1 activation correction** — replace the rejected Ice/Supergravity activation
   geometry with local snowflake and gravity-factor particle languages; restore Next on
   a dedicated unmasked plane; strengthen the frameless status hierarchy; and freeze the
   expiry-latched Supergravity ghost/lock chain in renderer evidence.
7. **T31 evidence and closure** — run focused tests, final gates, one bounded visual
   audit, independent QA, changelog reconciliation, scoped scan, and push.

## Acceptance checklist

- [x] The live Mutation item union, random pool, rules, renderer, audio, and tests contain
  Ice, Supergravity, Bomb, and Multiplier only.
- [x] A Supergravity-latched airborne piece keeps independent-column ghost and lock
  behavior after global expiry; its ghost, final board cells, lock pulse, and hard-drop
  trail share the same settled per-column coordinates. An unlatched next piece is rigid.
- [x] Supergravity produces no sustained or expiry voice and no special landing effect.
- [x] Ice and Supergravity activation/clear effects use respectively four local
  snowflakes and five local gravity-factor particles, remain short and reduced-motion
  safe, and the Supergravity trail has no spikes or stale frame.
- [x] Mutation status shows only signal/name/one-pixel time line without visible
  `生效中` / `Active`, seconds, individual row cards, overlap, or idle placeholder copy.
- [x] Mutation status is clearly legible through stronger heading/name/signal hierarchy,
  and Next is visible on its own unmasked, frameless plane during active play and
  board-local interruption states.
- [x] A newly spawned two-row piece has a lower-row-only first beat at board row 1; the
  upper row crosses the board mouth only after the configured gravity interval while the
  lower row advances. The complete final landing guide appears as soon as that lower row
  is visible; it does not wait for the upper row. No fake opacity/scale reveal or
  whole-piece clamp replaces canonical hidden-row geometry.
- [x] Focused tests, final typecheck, complete suite, build, one-Canvas browser evidence,
  zero console errors, teardown, and independent QA pass before acceptance.

Status (2026-08-05): **ACCEPTED / CLOSED**. Accepted product/test source is
`7c4a9a1`; final browser evidence is `735effe`. Typecheck, the complete suite
(`369 passed / 3 skipped`), production build, one-Canvas/zero-error browser audit, and
independent QA all pass. Independent QA reported P0 0 / P1 0 / P2 0 / P3 0 and verified
the unmasked Next plane, timer-expired airborne Supergravity latch, row-wise arrival
with immediate complete ghost, prominent frameless status ledger, and local activation
geometry. The correction contract is
`docs/phases/t31-r1-status-and-arrival-correction.md`.

### T31-R2 player re-review gate

Status (2026-08-05): **ACCEPTED / CLOSED**. Product/test source `432fde4` repairs the
player-reported status, Next, and Supergravity endpoint regressions. Evidence `a00845c`
and `f859d68` binds the live Mutation state plus Classic and Mutation Next at both
required viewports. The final source gates and resource teardown are recorded in
`docs/workstreams/tetris-t15-mutation/THREAD_LOG.md`; independent read-only QA accepted
the exact range `c291afb..532e636` with P0 0 / P1 0 / P2 0 / P3 0.

T31-R2 acceptance is fail-closed until all of the following are green together:

- [x] concurrent Mutation rows remain one frameless ledger but the heading, signal,
  name, spacing, and thin remaining-time line are unmistakable without cards, seconds,
  placeholder copy, or overlap;
- [x] the renderer resolves the transparent Next anchor inside its own current arena,
  keeps the preview bounds inside the live Canvas, and produces visible Next pixels in
  active Classic and Mutation at 1440 × 900 and 1125 × 1196;
- [x] a two-row active piece can reveal its lower entry slice, outlive the global
  Supergravity timer, move or rotate, and still show the same complete per-column ghost
  that Core finally locks; only the following generation becomes rigid;
- [x] focused tests, one final typecheck, complete suite, production build, bounded
  browser evidence, zero console errors, teardown, and independent read-only QA pass.

### T31-R3 live-regression checkpoint

Status (2026-08-05): **SOURCE CANDIDATE / VISUAL ACCEPTANCE PENDING**. Player review
reopened two visible claims after the accepted T31-R2 boundary: Mutation status still
read too quietly, and the frameless Next preview could disappear when a transient DOM
layout measurement moved its geometry outside the current Canvas. Source checkpoint
`fa34cc8` keeps the last valid preview bounds through that one-frame geometry miss and
strengthens the existing frameless Mutation ledger without restoring cards, countdown
copy, or decorative separators.

- [x] A renderer regression test proves that active play redraws the immediate queue
  item at the last valid rail bounds during a transient slot miss instead of clearing
  the preview.
- [x] A Core-derived App regression test advances an airborne Supergravity piece across
  timer expiry and proves both the landing latch and its visible status contract.
- [x] Focused T31 tests pass (`5 files / 158 tests`) and the candidate typechecks.
- [ ] Final full suite, production build, live browser evidence at the required
  viewports, resource teardown, and independent read-only QA remain required before
  T31-R3 can be accepted.

This checkpoint does not reopen Mutation mechanics, queue order, timers, scoring,
audio, Survival, or Puzzle authoring. T32 may continue as a separate bounded stream,
but final publication remains fail-closed until both streams complete their own gates.

## Queued next task — T32 Puzzle curriculum rebuild

Status (2026-08-05): **ACTIVE / BOARD AUTHORING ADMITTED**. T31-R2 is accepted and
closed. T32 owns the curriculum audit and rebuild, beginning from accepted product/test
source `432fde4` plus evidence `f859d68`. The post-T31 audit is frozen:
live data is 3/27/20, fresh progress opens only three levels, and none of the three
historic exact certificates remains reusable after the Intro rebuild. The isolated
fingerprint foundation is green at `da8e2b9`; board definitions and progression remain
bounded by the committed roster contract and exact-proof acceptance below.

### Frozen T32 outcome

- Preserve exactly 50 levels, redistributed as 10 Intro, 20 Easy, and 20 Hard.
- Rebuild all ten Intro boards. Intro remains immediately available and isolates
  concrete techniques instead of asking the player to guess through a miniature hard
  residue.
- Make all twenty Easy boards immediately available. Easy is the open practice field;
  completion totals and tier gates do not hide any Easy puzzle.
- Keep all twenty Hard boards behind technique mastery. Each Hard board names one
  certified Easy prerequisite, and satisfying that prerequisite within its exact
  threshold unlocks the dependent Hard board(s).
- Remove exact and near-repeated residues. Replace campaign positions 36, 38, and 47
  with, respectively, a lower-triangle, pyramid, and two-sided suspended-roof/hollow-
  middle residue while preserving legal deterministic authoring.
- Replace legacy positions 46, 48, 49, and 50 with distinct six-row, prefix-preserving
  residues because strict public-Core probes found no completion within the frozen
  twenty-two-lock proof ceiling.
- Require at least two distinct public-Core-command solution replays for every new or
  changed board. A changed board is not admitted on visual plausibility or a solver
  search result that was not replayed by Core.
- Require an exhaustive strict-minimum placed-piece certificate for every Easy board
  that gates Hard content. The visible unlock threshold is `optimum + 5`.
- Keep that prerequisite set deliberately small and teachable: each gating Easy board
  must be solvable in at most seven placed pieces, and may unlock a related Hard cluster.
  Never promote an eight-or-nine-piece route from bounded search as an optimal proof.
- Require a machine-auditable technique signature and route-critical decision match
  between every gating Easy puzzle and its Hard dependants. Handwritten labels alone
  do not establish correspondence.

### Ownership and isolation

- Coordinator/writer after admission: primary task `/root`; this queued documentation
  checkpoint does not transfer ownership away from active T31.
- T32 contract paths are `docs/DESIGN.md`, `docs/CURRENT_TASK.md`,
  `docs/phases/t32-puzzle-curriculum-rebuild.md`, `progress.md`, and
  `docs/workstreams/tetris-t32-puzzle/THREAD_LOG.md` only.
- Eventual source is expected to remain in Puzzle definitions, progress/mastery/
  lesson data, exact solver/certificate support, their direct tests, and scoped Puzzle
  library layout only where the new 10/20/20 data requires it. Exact source paths and
  checkpoint budgets must be re-audited against the post-T31 tree before admission.
- Existing T31 Mutation/audio/arrival working-tree changes and inherited T27 evidence
  are frozen owner work. T32 may not edit, stage, revert, format, regenerate, or bundle
  any of those paths. Any path collision stops T32 rather than resolving it implicitly.
- Mutation mechanics/feedback, audio, Survival, Classic, themes, navigation, package
  metadata, and unrelated evidence remain outside the T32 product boundary.
- Completed first source checkpoint writer: `/root`, exact paths
  `src/game/core/puzzleFingerprints.ts` and
  `src/game/core/puzzleFingerprints.test.ts` only, committed at `da8e2b9`. It did not
  edit `puzzles.ts` or start a server, browser, watcher, index, or solver.

### Frozen audit and migration

- Stable positions 01-10 become rebuilt Intro; 11-30 become all-open Easy; 31-50
  become mastery-only Hard. Stable IDs and ordinals are retained.
- The changed definition set is 01-10, 12-14, 36, 38, and 46-50. Revision 2 removes
  completion and best-operation records for those twenty IDs while preserving both for
  the thirty unchanged boards. Positions 12-14 are rebuilt Easy mastery prerequisites
  with strict optimum certificates and divergent public-Core completion routes.
- Existing unchanged Hard completion keeps only that level replayable; it cannot unlock
  another Hard level or bypass a new prerequisite. Uncompleted Hard remains locked.
- Existing artifacts provide sixty potentially reusable routes for the thirty unchanged
  levels; forty new Core-replayed routes are required for the changed set.
- The anchor-free Easy pool supported by the current exhaustive solver is 12-15,
  17-21, 23-25, and 28-30. No pairing or optimum is frozen before exact proof and
  replay-signature evidence.

### Ordered checkpoints

1. [complete] Re-audit the accepted post-T31 base, current 50 boards, route artifacts,
   saved-progress revision, exact solver capability, and shared-path ownership.
2. [complete] Implement exact, symmetry-normalized, and near-topology fingerprint
   comparison in the isolated two-file foundation checkpoint; campaign data remained
   read-only. Focused tests and typecheck pass at `da8e2b9`.
3. [complete] Freeze the final board roster, 10/20/20 order, technique families,
   candidate mastery map, campaign migration, exact source paths, and checkpoint budget
   before product edits at `d81f2db`. Candidate mastery relations remain non-product
   until strict optimum and replay-signature proof promotes them.
4. [complete] Author and Core-replay the rebuilt Intro set plus replacement boards
   36/38/47, then extend the strict-proof rebuild to 46/48/49/50.
5. [complete] Generate and replay a second distinct route for every changed board;
   freeze strict exhaustive certificates for Easy mastery positions 12-14. Remaining
   route evidence is committed at `8e0e2ba`.
6. [complete] Implement all-open Intro/Easy access, mastery-only Hard access, campaign
   revision, and technique-signature validators with direct tests. Revision-2 cleanup
   now covers all twenty rebuilt definitions at `08cbb4d`.
7. Adapt the Puzzle library only as required by the frozen categories and relations,
   then run final gates, bounded visual evidence, multi-round independent QA,
   changelog reconciliation, and coordinator push.

### T32 acceptance checklist

- [x] T31 is accepted and closed before the first T32 source edit.
- [x] The post-T31 category/route/solver/revision/path audit is frozen.
- [x] The isolated exact/symmetry/near-topology fingerprint checkpoint is green at
  `da8e2b9` before campaign definition edits.
- [ ] The campaign contains exactly 10 Intro, 20 Easy, and 20 Hard levels.
- [ ] All Intro boards are newly authored; all Intro and Easy boards are immediately
  available; no Hard board bypasses a mastery prerequisite.
- [ ] Campaign positions 36, 38, and 47 contain the three frozen distinct silhouettes;
  positions 46, 48, 49, and 50 contain their strict-proof six-row rebuilds; duplicate/
  near-duplicate validation finds no unresolved repetition.
- [ ] Every new or changed board has two distinct successful public-command Core
  replays from its registered initial state.
- [ ] Every gating Easy board has an exhaustive optimal placed-piece certificate and
  unlocks at exactly optimum plus five.
- [ ] Every Easy-to-Hard relation has replay-verified measurable preconditions, a
  matching decisive event, and a matching continuation invariant.
- [ ] Final typecheck, complete tests, build, migration checks, three-category browser
  evidence, one Canvas, zero browser errors, teardown, and multi-round independent QA
  pass before acceptance.

No checklist item is satisfied by this documentation-only queue checkpoint.

---

## Previous task — T30 In-Well Arrival and Route Transitions

## Active goal

Turn active-piece creation into a visible but collision-neutral in-well assembly, and
give real page navigation a short, coherent handoff. The authoritative contract is the
top T30 section of `docs/DESIGN.md`. Core state, gameplay timing, audio, themes, content,
localization, dependencies, and layout remain frozen.

## Scope and ownership

- Coordinator/writer: primary task `/root`.
- Base: `main@dc2aaad`.
- Contract checkpoint paths: `docs/DESIGN.md`, `docs/CURRENT_TASK.md`,
  `docs/phases/t30-spawn-and-page-transitions.md`, and `progress.md` only.
- Renderer checkpoint paths: `src/game/render/presentation.ts`,
  `src/game/render/presentation.test.ts`, `src/game/render/TetrisRenderer.ts`, and
  `src/game/render/TetrisRenderer.test.ts` only.
- Navigation checkpoint paths: `src/App.tsx`, `src/App.test.ts`,
  `src/styles/navigation.css`, and `src/styles/navigation.test.ts` only.
- Evidence, independent QA, changelog, and accepted status are separate later
  checkpoints. Existing dirty `docs/evidence/t27/**` and
  `docs/evidence/t27-r1-followup/**` are inherited user evidence and remain unstaged
  and unmodified.
- No Core, runtime, persistence, package, asset, audio, theme, Puzzle content, or
  dependency change is authorized.

## Ordered checkpoints

1. **T30 contract** — freeze arrival geometry/timing, route handoff, reduced motion,
   exact paths, and final evidence before source edits.
2. **T30 active arrival** — implement deterministic renderer-only cell staging and
   focused geometry/lifecycle tests.
3. **T30 route handoff** — centralize transitions around push/replace/popstate, add the
   CSS fallback and reduced-motion rules, and cover them directly.
4. **T30 evidence** — after the last source edit, run final typecheck, complete suite,
   build, and one bounded source-linked browser audit.
5. **T30 independent QA and closure** — read-only review of the exact range, then
   changelog/status reconciliation, scoped pre-push secret scan, and coordinator push.

## Acceptance checklist

- [x] Each new active generation visibly assembles over at most 210 ms without changing
  Core coordinates, collision, gravity, or seeded replay hashes.
- [x] Every arrival cell is fully inside the board throughout the effect; movement and
  rotation do not restart it, and the ghost guide joins only after the piece is legible.
- [x] Restart, Puzzle undo, terminal/unmount, and reduced motion leave no stale arrival
  state; reduced motion renders the complete endpoint immediately.
- [x] Push, replace, and popstate route changes use one bounded transition; no-URL
  Puzzle selection changes do not animate or create history entries.
- [x] Unsupported browsers retain an immediate navigation plus short entry fallback;
  reduced motion removes translation and long duration.
- [x] Focused renderer/navigation/style tests pass after their checkpoints.
- [x] Final typecheck, complete suite, production build, browser evidence, one Canvas,
  zero DOM board cells, zero console errors, and teardown pass.
- [x] Independent QA reports no unresolved P0/P1/P2 issue before acceptance and push.

Status (2026-08-04): **ACCEPTED** at product source `19a17e6`, with evidence
`2da8a37`. Focused renderer/navigation/style tests pass; final typecheck, the complete
suite (`372 passed / 3 skipped`), the production build, and the source-bound Chromium
audit pass. The audit reports one Canvas, zero DOM board cells, zero browser errors,
zero failures, and native route transitions. Independent read-only QA accepts exact
range `dc2aaad..2da8a37` with P0 0 / P1 0 / P2 0 / P3 0.

---

## Previous task — T29 Complete SFX Remaster

Status (2026-08-04): **ACCEPTED** at candidate `abce548`, with product source
`ca5da48`. Focused audio tests pass `29/29`; final typecheck, the complete suite
(`365 passed / 3 skipped`), the 759-module build, and the source-bound browser audit
pass. Independent read-only QA accepted `dfb9fbb7..abce548` with P0 0 / P1 0 / P2 0 /
P3 0.

---

## Previous task — T28 Ordinary Line-Clear Release Polish

## Active goal

Turn the supplied ordinary-clear proposal into one independent, reversible release-
polish chain. Implement a deterministic, theme-consistent 1/2/3/4-line visual grammar
and a clear-forward procedural feedback mix without changing Core's fixed twelve-tick /
200 ms clear boundary, rules, scoring, Puzzle content, branding, or the one-Pixi-Canvas
split. The audio must remain rounded and non-fatiguing, but an ordinary clear is now the
most legible positive-feedback event in its gameplay batch rather than a near-silent
confirmation.

The authoritative behavior and conflict contract is the top T28 section of
`docs/DESIGN.md`. T27 and older sections below remain historical provenance unless that
section explicitly supersedes them.

## Scope and ownership

- Coordinator/writer: primary task `/root`.
- Base: `main@17d4f82e0474f7417a261fea0aa6d41cd230fc9a`.
- Contract checkpoint paths: `docs/DESIGN.md`, `docs/CURRENT_TASK.md`,
  `docs/phases/t28-line-clear-release-polish.md`, and `progress.md` only.
- Visual checkpoint paths: `src/game/render/presentation.ts`,
  `src/game/render/presentation.test.ts`, `src/game/render/TetrisRenderer.ts`, and
  `src/game/render/TetrisRenderer.test.ts` only.
- Audio checkpoint paths: `src/game/audio/AudioEngine.ts` and
  `src/game/audio/AudioEngine.test.ts` only. A runtime call-site may be added only if
  live mode context is necessary and is covered in the same focused checkpoint.
- Evidence, independent QA disposition, and coordinator changelog are later separate
  checkpoints. Existing dirty `docs/evidence/t27/**` and `docs/evidence/t27-r1-followup/**`
  paths are inherited user evidence and remain unstaged and unmodified.
- `src/game/core/**`, Puzzle definitions/solutions, layout/theme systems, persistence,
  package metadata, and dependencies are excluded.

## Ordered checkpoints

1. **T28 contract** — freeze profiles, timing, mode priority, reduced motion, the
   clear-forward audio mix, exact paths, and acceptance evidence before source work.
2. **T28 visual profiles** — pure count profiles, deterministic board-local rendering,
   anchor exclusion, bounded tail lifecycle, and focused renderer tests.
3. **T28 positive-feedback audio profiles** — rounded but present 1/2/3/4 cues,
   supporting move/rotate/drop/lock mix correction, invalid-count refusal, resolution-
   event priority, Mutation suppression, and scheduling/lifecycle tests.
4. **T28 integration correction** — only if focused evidence finds a mode/conflict gap;
   it receives its own reviewable commit and direct regression test.
5. **T28 evidence** — after the last source change, run one typecheck, complete suite,
   build, and real browser matrix. Commit generated evidence separately.
6. **T28 independent QA and closure** — read-only review of the exact candidate range,
   then coordinator changelog/status reconciliation and push.

## Acceptance checklist

- [x] Counts 1–4 have visibly related but unambiguous profiles; invalid counts fail
  closed.
- [x] Core hashes, 12-tick clear timing, inputs, scoring, randomization, and all Puzzle
  data remain unchanged.
- [x] Full motion remains board-local and bounded; reduced motion contains no fragment,
  stagger, travel, post-tail, page flash, board displacement, or filter.
- [x] Survival, Mutation activation, Bomb, Puzzle completion, and anchor conflicts obey
  the T28 priority contract.
- [x] New clear audio is short, rounded, non-metallic, non-explosive, volume-controlled,
  and unmistakable above movement/landing in the same action. Counts 1–4 gain audible
  harmonic weight without abrupt master-volume jumps; all work remains bounded by 16
  voices and fully disconnects on lifecycle completion.
- [x] Supporting move, soft-drop, rotate, lock, hard-drop, countdown, system, Survival,
  and Mutation cues remain semantically distinct and audible without sharp chirps,
  electrical buzz, blast-like repetition, or masking an ordinary clear.
- [x] Focused tests pass at each source checkpoint.
- [x] Final typecheck, complete tests, build, 1/2/3/4 browser frames, reduced-motion and
  mode-conflict frames, one Canvas, zero DOM board cells, zero errors, and teardown pass.
- [x] Independent QA reports no unresolved P0/P1/P2 finding before acceptance and push.

Status (2026-08-04): **ACCEPTED** at candidate `9784b1b`, with product source
`2c4e4ae` and source-bound browser evidence reporting one Canvas, zero DOM board cells,
zero browser errors, and zero audit failures. Final gates pass (`359 passed / 3 skipped`),
and independent read-only QA reports P0 0 / P1 0 / P2 0 / P3 0. The first audio
checkpoint remains in history as the rejected rollback point; the accepted correction
makes ordinary clears unmistakable without reopening Core or the broader UI.

---

## Previous task — T27 Personalised Pace and Feedback Polish

## T27-R1 accepted goal — centred board stage and three complete visual themes

**Status (2026-08-04): ACCEPTED / ALL FOLLOW-UPS CLOSED.** This player-requested
visual correction supersedes T27 requirements 9 and 10 only where they describe the
desktop gameplay rail. It does not reopen Core rules, Puzzle ordering, the single-canvas
boundary, or Mutation mechanics. The later direct request narrowly reopens Classic
ranking and its leaderboard persistence so player-selected gravity intervals are no
longer compared as one difficulty. The final accepted follow-up also makes Puzzle the
only mode that enters and restarts immediately without the shared countdown.

The correction has ten coupled acceptance requirements:

1. The live gameplay field becomes an axis-symmetric three-column stage. The 10 x 20
   board occupies the true horizontal centre column. Left and right instrument rails
   have the same measured width, so content appearing or disappearing in either rail
   cannot move the board. At supported desktop viewports the board centre must remain
   within one CSS pixel of the play-surface centre.
2. Inside the gameplay field, the board frame is the only enclosing visual box. The
   play surface, arena, statistics group, statistic rows, Next module, and Mutation
   status lose card fills, rounded outlines, and shadows. Top-bar controls and modal
   sheets remain recognisable interactive surfaces. Plain typography, deliberate
   whitespace, and short separators may organise information without recreating a
   hidden card.
3. Next moves to the left rail. Mutation keeps that same Next forecast and places its
   persistent timed-state ledger immediately below it. Statistics move to the mirrored
   right rail as a four-row typographic instrument. Puzzle preserves its two correctly
   labelled forecasts. Pixi continues to own every tetromino preview, but it no longer
   paints a dark rounded preview card behind gameplay Next; the DOM remains geometry
   only and no DOM cell grid is introduced. The frameless forecast uses a larger,
   immediately legible tetromino scale without changing the measured rail footprint.
   `Next` and `异变状态 / Mutation status` are horizontally centred in the left
   instrument column; the forecast piece begins close beneath the Next label instead of
   floating in the vertical middle of an invisible former card.
4. Settings adds one persisted, keyboard-operable three-theme choice. The themes are
   not palette-only skins: each changes page field, typography contrast, separators,
   navigation/action treatment, board well and edge, Settings, modal/result surfaces,
   Home, Puzzle library, and gameplay instruments while retaining semantic mode and
   tetromino identity. The three themes are:
   - **雾昼矿物 / Mineral Mist** — the bright cool mineral baseline, with paper-blue
     space, slate ink, teal action, and a deep navy well;
   - **深潮夜航 / Deep Tide** — a low-luminance marine field, pale mineral ink,
     phosphor teal/blue/violet accents, and a deeper blue-black well without neon glow;
   - **暖砂日晷 / Sunstone** — a warm bone and sand field, graphite ink, copper/olive
     accents, and a charcoal-brown well with etched rather than glossy surfaces.
   **深潮夜航 / Deep Tide** is the product default for a fresh profile. Home and the
   Puzzle library must consume the active theme across their complete page field,
   primary surfaces, controls, selection states, preview/detail regions, and typography;
   neither page may remain a light-only shell after a theme change.
   Home's wordmark panel is one theme-owned **solid color** with no gradient, radial
   texture, or split-tone wash. Its solid field is the theme's brighter brand surface,
   not the near-black board-well token. The wordmark gains a restrained static theme-colored
   glow that remains legible without flashing and becomes non-animated under reduced
   motion. Every mode tile uses theme-owned hover and keyboard-focus colors; pointer
   highlight ends when the pointer leaves instead of persisting as a generic blue state.
5. Theme choices do not use circular or segmented color samples. All three complete
   buttons use the currently active theme's shared control surface instead of carrying
   three independent theme previews. The selected button adds a semantic outline and
   localized selected-state text, without a circle, swatch, or checkmark. The Motion
   control uses the same filled, theme-owned button language as Language and Sound in
   both states, so Full motion does not read as a disabled control. Full motion keeps the
   bounded cover fades, value-settle cues, surface interpolation, and short renderer
   particles/trails; Reduced motion presents static endpoints without interpolation,
   continuous breathing, value translation, particles, or trails. Switching modes must
   not flash or repaint the complete page as a transient frame and never changes gameplay
   timing or canonical state.
6. Pause and Restart both use the same full-board interruption composition as the
   opening cue instead of compact white sheets. Pause shows large `暂停 / Paused` and
   smaller `回车继续 / Press Enter to continue`; only Enter resumes the same run.
   Pressing `P` again and pointer clicks on the cover do nothing. Restart shows large `重新开始 / Restart` and
   smaller `回车确认，按 R 取消 / Enter to confirm; R to cancel`; Enter starts a fresh
   countdown and R cancels directly back into the interrupted run. The left Next
   instrument stays outside either interruption and remains visibly populated through
   the dim layer. Escape opens the same established leave flow from Pause or Restart
   without resuming the run. The visible top-bar Back and Settings
   controls remain pointer- and keyboard-operable over both covers; opening either replaces
   the board interruption with the established leave or Settings flow without resuming play.
7. The open-space instruments remain genuinely frameless in both DOM and Pixi. Next has
   no enclosing rectangle, DOM border/outline, Canvas backdrop, rounded well, shadow, or
   blank placeholder frame, including while its slot is empty, loading, paused, or
   restarting. No neutral parent or Canvas-host outline may reconstruct the rectangle.
   Idle Mutation status contains no sentence, spectrum, dash, underline, or horizontal
   rule. Left and right rails become larger desktop instruments positioned in the upper
   stage rather than the vertical middle, with the statistics side receiving the strongest
   hierarchy. The four right-rail numeric values use a larger desktop scale and
   theme-owned high-contrast value color; labels receive only the contrast correction
   needed for the active theme. Value changes may use one short opacity and vertical-settle cue; reduced
   motion disables it and no animation changes layout.
8. Home, Puzzle library, and every live mode are real inner pages backed by browser
   History paths: `/`, `/puzzles`, `/play/classic`, `/play/survival`,
   `/play/mutation`, and `/play/puzzle/:id`. Direct loading, browser Back/Forward, visible
   navigation controls, and first-entry rule confirmation all converge on the same
   canonical screen/mode/puzzle state. Unknown paths replace to `/`; routing never enters
   Core, changes a seed, or adds a dependency.
9. The opening board cover has one visible `3 / 2 / 1` sequence and no trailing
   `开始 / Start` word. After `1`, the cover exits through one short opacity/light
   transition and the first piece begins falling at that same completion boundary.
   Opening, pausing, restarting, and dismissing a cover must not hard-cut the board glow.
   The veil uses one soft, low-contrast luminous base that visibly fills the complete
   board, with broad four-direction edge falloff layered over that continuous field. It
   must not leave a mostly dark centre, split into four isolated edge lobes, or read as a
   central circular spotlight, ring, or hard radial hotspot.
   The countdown uses an unmistakable transport cue instead of a melody: `3` and `2`
   repeat one short, clean sine pulse, while `1` is a clearly higher and slightly
   longer final pulse. No ascending triad, mallet dyad, pitch sweep, noise burst,
   music, sample, or persistent voice is added. All cues obey the shared SFX
   enablement and volume controls and share runtime teardown. Confirming either the
   R-key restart flow or the direct Settings restart produces no separate `restarted`
   flourish; digit `3` is the only audible first beat of the new run.
   Rotation uses one concise mid-low sine pulse with no layered partial or pitch sweep;
   repeated turns must remain clear without a sharp chirp.
10. Mutation's non-Ice automatic-gravity floor is **0.2 seconds per cell**. Its six-line
    acceleration ladder clamps at that floor, while Classic's player-configured interval,
    Survival's cadence, Ice's one-second override, and Supergravity landing semantics remain
    unchanged.

The visible Back control uses the same theme-owned filled action treatment as Settings,
including its background, foreground, border, hover, focus, and disabled-state language.

Theme selection writes only the current `tetramorph:*` preference key, survives reload,
and changes the mounted game without rebuilding runtime or canonical state. Color never
becomes the only state signal. Reduced motion removes theme transition interpolation,
not theme identity. Desktop, portrait, and short-landscape layouts must retain one
Canvas, visible Next, no overlap, no horizontal overflow, and no clipped controls.

### T27-R1 checkpoints

1. Commit this contract before product code.
2. Commit theme tokens, persistence, theme-native Settings controls, localization, and
   direct tests.
3. Commit the centred frameless HUD topology, centred gameplay sheets, larger animated
   instruments, Pixi frameless preview support, and direct React/renderer/CSS tests.
4. Commit History-backed inner-page routing and direct-link/popstate tests as its own
   rollback point.
5. After the final source edit run one typecheck, the complete two-worker suite, one
   production build, and one controlled browser batch covering all three themes plus
   Classic, Mutation, Puzzle dual Next, Pause, and compact layouts. Independent
   read-only QA must accept the exact candidate before changelog closure and push.

**Atomic HUD line-budget exception.** The React/CSS half of checkpoint 3 may exceed the
default 500-line budget only across `src/App.tsx`, `src/App.test.ts`,
`src/styles/hud.css`, and `src/styles/hud.test.ts`. The centred three-column DOM,
interruption ownership, History integration, authoritative selectors, and direct
contracts replace the former card-stage topology as one coupled surface; splitting
these four paths would create a checkpoint whose class names, selectors, or tests do
not describe the mounted UI. The coordinator is the sole writer. Cached-path review,
`git diff --check`, one typecheck, the focused App/HUD suite, and the final whole-range
gates are required before this exception can be accepted.

### T27-R1 acceptance record

- Accepted source: `db021f6d73f04cf48c2c7c4d1339a6767502fae2`.
- Accepted evidence: `06595e95cf447c19ef8bcca29b987898d2e4fcc6` in
  `docs/evidence/t27-r1/`; the audit binds to the accepted source and reports one
  Canvas, zero browser errors, a centred board, frameless Next, theme-complete Home
  and Puzzle library pages, operative interruption controls, and a Puzzle result with
  no emblem, prism, or celebration-particle graphic above the best-step value.
- Final gates after the last source change: typecheck passed; complete suite passed
  with `338 passed / 3 skipped`; production build passed with 759 transformed modules.
  A subsequent `npm.cmd ci --ignore-scripts` also rebuilt dependencies successfully
  from the committed lockfile without changing either npm metadata file.
- Independent read-only QA accepted the original 75-commit product/evidence range
  through `401bfa5` and separately accepted the final orphan-style/evidence delta
  `088afa2..06595e9`; both reviews reported P0 0 / P1 0 / P2 0 / P3 0. The three
  intervening commits contain only QA/coordinator publication records.
- The controlled evidence listener was released. Four stale Node processes that were
  verified to have loaded this repository's Rolldown native module were released by
  exact PID before the lockfile rebuild; no development server remains owned by this
  slice.
- Eight inherited working-tree deltas under `docs/evidence/t27/` remain unstaged and
  outside the closure commit. They are not acceptance evidence for T27-R1 and must not
  be overwritten or bundled into the push.
- Final follow-up source `ca2bc48d404e5e9272f849c7534d8d0ffe46d800` adds the
  three-grade Classic ranking and immediate Puzzle entry/restart paths. Evidence commit
  `b0aa433` in `docs/evidence/t27-final/` binds all audits to that source. The supplemental
  audit records Classic countdown digit `3`, all three difficulty filters, and Puzzle
  `countdownSeen=false`, `countdownCount=0`, `status=playing`, an active piece, one Canvas,
  zero DOM board cells, and zero errors.
- Final source gates passed after `ca2bc48`: typecheck; complete suite with
  `348 passed / 3 skipped`; production build with 759 transformed modules. Independent
  read-only QA accepted `6189622..b0aa433` with P0 0 / P1 0 / P2 0 / P3 0 and confirmed
  that inherited `docs/evidence/t27/` and `docs/evidence/t27-r1-followup/` deltas are not
  part of the candidate.

## T27 accepted goal — make the opening pace configurable and feedback easier to read

**Status (2026-08-04): ACCEPTED / CLOSED / READY FOR PUSH.** Direct player
feedback reopens a bounded post-RC correction on clean pushed base `ffb2ec9`. The
coordinator is the only writer. The accepted deterministic Core, one Pixi canvas,
four-mode structure, Puzzle campaign, ranking, persistence migrations, and Settings
information architecture remain authoritative.

The slice has twenty player-visible acceptance requirements:

1. Home shows the single `TetraMorph` wordmark with no positioning line in either
   language. Removing the subtitle must collapse its layout space rather than leave a
   blank band below the wordmark.
2. Locally packaged **Metal 400** replaces Kavivanar for ordinary English UI.
   Playwrite NZ Basic remains exclusive to the `TetraMorph` wordmark, Noto Sans SC
   remains the Chinese face, and Geist Mono remains the numeric/data face. English text
   must wrap without overlap, clipping, disappearance, or the undersized appearance
   shown by the first Metal pass. The packaged face receives one controlled optical
   size adjustment rather than per-screen font substitutions. Metal uses its authored
   Regular 400 face rather than a fabricated bold face. Cadence cards never force two
   type systems onto one value baseline: the complete `下落速度 / Fall speed` label owns the first row,
   while the Geist Mono value and localized `秒/格` or `s/cell` unit share a second
   no-wrap baseline. Chinese cadence units remain Noto Sans SC and match the label's
   visual weight.
3. Classic Settings exposes a persisted gravity interval with two bounds, both limited
   to `1.0` through `0.1` seconds per cell in `0.1` steps. A fresh profile opens at
   `0.8` and accelerates no faster than `0.1`; the fastest bound cannot be slower than
   the opening bound. Every ten cleared lines still accelerates by `0.1` seconds per
   cell until the chosen fastest bound. Changing either bound never changes the current
   falling run and applies on the next restart, play-again, or newly entered Classic
   run. The interval is presented as one discrete `1.0 -> 0.1` rail rather than two
   disconnected sliders: two labelled handles identify the opening and fastest bounds,
   the selected acceleration band is visible between them, both current values remain
   visible above the rail, and the unit appears once. Mouse, touch, and keyboard each
   adjust a handle by one `0.1` step with an explicit focus state. Dragging or selecting
   a handle must never draw a rectangular outline around the complete rail: focus is
   carried by the active circular thumb alone. The component uses the Settings panel's
   established blue palette instead of browser-default colors.
4. Survival falling rocks advance at exactly **7x** the current ordinary Survival
   gravity through the existing deterministic integer accumulator. The piece-count
   schedule, warning lead, one-column one-or-two-rock body, collision rules, random
   stream, line-clear participation, and entry-safe spawn contract do not change.
5. The Survival `距离落石 / Until rockfall` metric uses the same normal, urgent, and
   reduced-motion countdown treatment as the bedrock-rise metric. This is HUD feedback
   only and cannot add an extra timer or alter the deterministic rockfall schedule.
   Urgency breathes through the complete card background; it must not add a pulsing
   left rail, inset stripe, or other one-sided ornament. The border remains stable.
6. Mutation Supergravity refreshes to **5 seconds**, while Ice and Double retain their
   ten-second windows. Its status meter uses the item-specific duration. Supergravity
   is expressed by the complete top boundary visibly shifting up and down with an
   irregular two-frequency tremor. A quiet stationary reference echo makes that vertical
   displacement readable; the moving line remains mostly horizontal rather than turning
   into a decorative wave. The board, active piece, and stack do not shake with it. This
   replaces a central symbol, rain-like marks, screen flash, or high-opacity full-board
   decoration. Double and Super Double replace the fixed upper-right emblem
   with a persistent **upper-field score glint field**: compact, independent amber
   four-point glints drift through a shallow top region and dissolve before reaching the
   lower playfield. Each glint uses one low-opacity outer star, one crisp inner star, and
   at most two detached dust motes. It must not draw a circular backing disc, connected
   stem, line tail, comet trail, or pulsing halo; those combinations read as hanging lamps,
   rain, or UI markers rather than natural light. Double must be immediately recognisable
   without flashing; Super Double increases only the count and warmth while preserving
   the size of each mark and the active-piece silhouette. The effect cannot become a
   corner badge, board-wide wash, or high-opacity score burst. Reduced motion receives a
   clearly visible static top-edge glint field. The latched landing rule remains unchanged.
7. The `3 / 2 / 1` entry countdown gains three warm, mallet-like procedural SFX cues.
   They outline the consonant `F4 / A4 / C5` ascent; every beat contains one soft
   triangle fundamental and one quiet sine perfect-fifth partial. The first two beats
   finish within 200 ms and the slightly fuller final beat within 230 ms. There is no
   harsh buzzer/sweep, noise burst, trailing Start word, or separate Start hold: after
   `1`, the cover fades out briefly and the runtime begins. Cues obey SFX enablement and
   volume, replay on restart, share the runtime-owned AudioContext, and leave no voices
   or timers after unmount.
8. Result sheets use a portrait, content-height scorecard rather than a wide sheet or a
   stack of dashboard cards. Classic is titled `消行 / Lines`, Survival is titled
   `生存时间 / Survival time`, and Mutation is titled `得分 / Score`; no scored mode
   may prepend or append its mode name or the generic word `结果 / result`. The same
   ranking metric is the unboxed hero number directly below that title, so its label is
   not repeated under the number. The secondary metric becomes one compact supporting
   row; top-five history follows as a quiet vertical list; and actions close the same
   axis. Puzzle retains the meaningful outcome title (`恭喜你破解谜题`, `刷新个人纪录`,
   or `谜题已破解`) but upgrades to a matching portrait celebration: one restrained
   unboxed best-operation hero directly below the title, with no emblem, prism,
   particles, horizontal boxed summary, or redundant completion sentence. No large empty bordered metric field,
   spreadsheet-like visual weight, decorative subtitle, or duplicate rank statement is
   allowed. Hero numerals keep the complete Geist Mono glyph box: no negative tracking,
   sub-unit line height, or overflow clipping may trim a counter, terminal, or baseline.
   Each dialog targets a `30–32rem` desktop width and remains viewport-safe on small
   screens.
9. The ordinary gameplay side rail is a deliberate **4 x 1** instrument column, not a
   `2 x 2` dashboard: one enclosing statistics surface contains four rows in source
   order, separated only by quiet internal rules. The rows may not become four bordered,
   rounded, or shadowed cards. The Next module follows directly beneath the unified
   surface at the same measured width without covering the Pixi-owned preview. The
   complete statistics-plus-Next group is vertically centred within the available rail
   height and cannot create a structural blank gap. Puzzle keeps its accepted dual
   preview and Mutation keeps its persistent status before statistics, but neither may
   regress compact/mobile layouts, pause visibility, or the single-canvas contract.
10. Mutation always reserves one **异变状态 / Mutation status** instrument at the top
    of the side rail, before statistics and Next. The instrument remains mounted while
    no timed item is active so the rail never jumps when an item begins or expires, but
    idle state contains no `暂无持续状态 / No active mutation` sentence or decorative
    spectrum. Its enclosing surface uses a restrained cool violet-grey tint and a
    coordinated border so it is distinguishable from the neutral statistics and Next
    modules without reading as a warning card. The idle shell keeps only this quiet
    tint; active rows remain the primary source of item-specific color. Compact/short
    layouts may reflow without changing this source order. Idle and a single active
    row occupy the same reserved ledger height. On desktop, additional simultaneous
    rows grow upward from a fixed lower edge rather than displacing statistics or Next;
    starting, refreshing, or expiring any item cannot move those downstream modules.
11. Reshape receives an unmistakable but short board-local activation: scattered units
    visibly converge into an I silhouette, the assembled piece receives one confirmation
    pulse, and a low-opacity field response connects the event to the board. It cannot
    reuse Double's star, add persistent screen decoration, obscure the active piece, or
    ignore reduced motion. The cue must remain visually distinct from the carried-item
    material and from the ordinary line-clear effect.
12. The Metal migration is complete across every active English surface and package
    artifact. Playwrite NZ Basic remains exclusive to the `TetraMorph` wordmark, Geist Mono keeps
    every numeric/data role, and Noto Sans SC keeps Chinese text and localized Chinese
    units. Metal is loaded from the pinned repository dependency for offline packaging;
    no remote font request, fabricated weight face, or partial Kavivanar cascade may
    remain active.
13. Every Mutation carrier returns to the earlier pre-plate, pre-charm material. The
    base tetromino stays visible; all four cells receive the same fine item-specific
    surface mark, and the connected carrier receives one compact core plus a restrained
    perimeter accent. Do not draw a neutral key plate, crate, detached socket, or a
    single-cell charm. The same grammar must remain readable on the falling piece,
    locked carrier, and Next preview. Mechanically all four cells own one carrier ID:
    clearing any one cell triggers the item exactly once and strips the identity from
    every surviving sibling. Reduced motion keeps the marks static, and clearing the
    carrier removes them completely.
14. The Settings sheet keeps an accessible dialog name but removes its duplicated
    visible top-left `设置 / Settings` heading. In Deep Tide, inactive and selected
    `设置 / 控制 / 规则` tabs use distinct theme-owned surfaces with readable text;
    neither state may fall back to generic blue or low-contrast dark-on-dark styling.
15. The Settings `重新开始 / Restart` control is an immediate action. Activating it
    closes Settings, resets the current run, and begins a fresh `3 / 2 / 1` countdown
    without opening the board restart-confirmation cover. The gameplay `R` shortcut
    retains its existing confirmation and cancellation contract.
16. Repeated horizontal movement uses one soft, low-gain sine cue without pitch sweep.
    Accepted movement voices are spaced by at least 60 ms so key repeat cannot stack
    transients into a pop, burst, or explosion-like sound. The cue remains audible at
    normal cadence, obeys the shared SFX controls, and creates no timer or teardown
    obligation.
17. Ordinary lock and hard-drop landing feedback are both short, rounded, and light.
    Neither path may use a heavy bass fall, stacked impact voices, electrical hum, or
    a long pitch sweep. Hard drop may remain slightly more present than a gravity lock,
    but both must sit below line-clear and countdown feedback in perceived weight.
18. Countdown returns to three discrete short cues: `3` and `2` share one warm electronic
    pulse with a restrained octave partial, while `1` reuses that material as a higher
    approximately 240 ms resolving beat with no separate low-volume tail. The
    entry cover exits silently in 120 ms after the `1` hold; `started` remains silent, so
    no release note, sweep, chord, noise burst, or generic start jingle may play at the
    input-open boundary. Pause/resume and other interruption-cover feedback must use
    low-gain, short sine taps without sharp sweeps and remain softer than the countdown.
19. Classic uses exactly three difficulty grades derived deterministically from both
    selected gravity bounds. The arithmetic midpoint of opening and fastest seconds per
    cell is **Relaxed / 休闲** at `0.65` or slower, **Standard / 标准** from `0.35` through
    `0.60`, and **Challenge / 挑战** at `0.30` or faster. The current grade is visible
    beside the interval control. Every new Classic score stores the selected opening
    and fastest tick bounds plus the derived grade, and Classic leaderboards keep a
    separate top five for each grade. Settings and result views allow the three compact
    grade filters without creating nine or more micro-tiers. Valid v8 Classic rows lack
    interval evidence and migrate conservatively into Standard; Survival and Mutation
    records, ordering, and limits remain unchanged.
20. Puzzle is the only mode without the `3 / 2 / 1` entry countdown. Opening a Puzzle,
   replaying it after completion, restarting it from Settings, or confirming the board
   restart action immediately resets the deterministic authored queue, enables input,
   and starts the first fixed piece. Puzzle must not render the entry veil, wait for its
   exit transition, or play any countdown cue. Classic, Survival, and Mutation retain
   the accepted countdown contract; Survival's staged bedrock-rise entry remains
   unchanged.

### Required checkpoints and verification

1. Commit this contract before product code.
2. Commit typography/Home and its direct tests as one rollback point.
3. Commit Classic Core/runtime persistence and UI controls in reviewable checkpoints;
   directly prove defaulting, validation, current-run immutability, and next-run use.
4. Commit Survival and Mutation timing changes with deterministic Core tests.
5. Commit countdown audio, the restrained Supergravity visual, and the portrait scored
   and Puzzle result hierarchy with direct audio, renderer, CSS, and reduced-motion
   tests.
6. Commit the persistent Mutation status rail, stronger carrier identity, Reshape
   activation, and Metal typography as bounded checkpoints with direct React,
   renderer/timeline, token, and CSS tests.
7. Commit Classic three-grade derivation, v9 leaderboard migration, per-grade retention,
   Settings/result filters, and focused persistence/UI tests as one bounded rollback point.
8. After the final source edit, run one typecheck, the complete two-worker suite, one
   production build, and one controlled bilingual browser-evidence batch. Inspect real
   Home, Classic Settings, Survival HUD, countdown, Supergravity, and all three ranked
   result frames. Then create a candidate SHA for independent read-only QA before
   changelog acceptance and push.

Requirements 1–20 are accepted. The final source/evidence and independent QA record are
captured in the T27-R1 acceptance record above.

# Previous Task — T26 TetraMorph v1.0 Release Candidate

## T26 accepted goal — converge the current game into Release Candidate 1.0

**Status (2026-08-03): TETRAMORPH 1.0.0-RC.1 INDEPENDENTLY REACCEPTED.**
The accepted game remains the product baseline. This
is a convergence programme: no Core rewrite, renderer replacement, fifth mode, account
system, server dependency, or broad React migration is authorised. Each change must
improve first-time understanding, portfolio presentation, or long-term maintenance.

The requirement-by-requirement recheck found no product, visual, mode, persistence, or
release-evidence regression. It did expose one resource-sensitive test-runner defect:
the default Vitest worker count starved the Pixi renderer suite until its 10-second
setup hook expired. Checkpoint `c8ceb70` caps the official test command at two workers;
the isolated renderer file passes `45/45`, and the corrected official gates pass
typecheck, the complete suite (`318 passed / 3 skipped`), and the 756-module build.
`package-lock.json` remains synchronized without a delta, and the scoped OSV scan is
clean. Independent read-only QA accepted the exact `bcbb229..5aceb53` range with
P0 0 / P1 0 / P2 0 / P3 0: the worker cap limits concurrency without filtering tests,
relaxing timeouts, or changing product behavior. The coordinator therefore reaccepts
the RC candidate for a normal `main` push.

The live requirement-by-requirement disposition is `docs/RC_AUDIT.md`. It records
unproven work as open even when a related historical slice passed. Phase B is now a
closed rollback point: Home has one localized positioning line, first-entry guidance
has exactly Goal / Mechanic / Challenge, and `Start` acknowledges the same boundary at
which the runtime becomes controllable.

Phases E and F are closed rollback points. The only active slice is the final independent
read-only QA disposition and coordinator acceptance. No gameplay, presentation, Puzzle,
ranking, persistence, dependency, release-evidence, or showcase change is authorised;
only a QA-requested correction to contradictory current-status text may precede the
final decision.

**Verified Phase-E result.** Source checkpoints `4d37d59` and `6af5403` replace
Fontsource's broad CSS delivery with the exact 13 WOFF2 faces used by the accepted type
system and add direct idempotent teardown tests for the runtime and AudioContext.
Emitted font payload falls from 11,208,240 to 4,752,492 bytes (`57.6%`) without changing
the four semantic font roles. Scoped dependency inspection reports a clean direct tree
and no known OSV issue. Final typecheck, complete suite (`318 passed / 3 skipped`), and
756-module build pass. Evidence `323d01d` restores zero Canvas, zero
renderer RAF, four baseline listeners, one closed AudioContext, and no QA bridge after
returning Home; restart preserves one runtime rather than accumulating a second. The
live Next well remains visible through restart and Pause, browser errors are zero, the
owned process chain is released, and port 4191 has no listener. The 546.62 kB main
application warning remains visible because threshold suppression or static chunk
reshuffling would not reduce first-run execution weight.

**Phase-D Survival timing contract.** The existing one-piece-ahead warning now owns a
deterministic minimum lead of `48` playing ticks (`800 ms` at the canonical 60 Hz). If
the warned player piece is locked sooner, the following ordinary-piece/rockfall entry
waits only for the unconsumed warning ticks; ordinary play that already consumes the
window receives no extra delay. The frozen column, one-or-two-rock height, piece-count
cadence, four-times fall rate, separate random stream, and simultaneous following-spawn
semantics do not change. One short, non-looping warning chirp accompanies the single
warning event. Direct Core and audio tests must cover immediate hard drop, natural
expiry, restart reset, deterministic hashing, and one-voice audio behavior before the
browser capture is accepted.

**Verified Phase-D result.** Source `fcabe49` and evidence `c83b156` close the current
mode-feedback audit. A real public-command Classic clear updates score/lines; Survival
holds an immediate hard drop for exactly the unconsumed part of its 48-tick warning,
shows no rock at tick 47, and spawns the planned rockfall on the next tick; all five
Mutation items are captured in Next, on their carrier, and at activation or active
state; Puzzle retains its three authored curriculum bands and existing order. The
synchronized Bomb board export captures the real impact phase with 72 fragments rather
than a fabricated board. Current English Settings/Controls/Rules, short-layout controls,
Pause, Leave, visible Next wells, and numeric data roles revalidate with zero clipping,
text overlap, wrong font role, legacy active face, horizontal overflow, extra Canvas or
DOM board cells, browser errors, or teardown residue. Final typecheck, the complete
suite (`316 passed / 3 skipped`), and the 768-module build pass. The 546.62 kB main
application chunk remains an explicit Phase-E audit item. The evidence-owned Vite and
Chromium chain closed normally and port 4190 has no listener.

**Verified Phase-C result.** Product checkpoints through `06bd8b9` add the persisted
OS-aware reduced-motion choice, inline touch guidance, complete cross-surface bilingual
coverage, and synchronous Pixi host-size reconciliation after responsive Settings
transitions. The final typecheck, complete suite (`312 passed / 3 skipped`), and
768-module build pass; the 546.05 kB application-chunk warning is recorded for Phase E,
not hidden. Evidence checkpoint `a062799` binds to source `06bd8b9` and proves desktop,
portrait, and short-landscape Settings, four current HUDs, two result/leaderboard
surfaces, Pause, and Leave with zero clipping, text overlap, wrong font role, horizontal
overflow, console errors, extra Canvas, DOM board cells, or teardown residue. Back and
Settings remain clickable during Pause; the live Next piece stays visible and does not
overlap either successor sheet. The owned preview process was released and port 4189
has no listener.

**Verified Phase-B result.** Product commits `29405e2` and `2198b92` add the localized
positioning line, separate concise first-entry copy, the non-blocking `Start` cue, and
an authoritative final cascade position for those rules. Evidence checkpoint `96b8854`
binds to source `2198b92` and covers English desktop, Chinese 390 x 844, English
844 x 390 reduced motion, countdown, and `Start`. The audit reports zero console
errors, clipped text, horizontal overflow, DOM board cells, or extra Canvas; all
first-entry surfaces contain three facts, the Chinese Mutation body is 48 characters,
and the `Start` frame contains one Canvas plus a live Next label. Typecheck, focused
App/Settings tests (`52 passed`), the complete suite (`310 passed / 3 skipped`), and
the 768-module build pass. The evidence-owned preview process released port 4188.

The complete phase contract is recorded in `docs/phases/rc-1.0.md`. Phase A delivered:

1. package metadata, README, active DEV-QA globals, active persistence writes, comments,
   and visible copy use `TetraMorph` / `tetramorph`;
2. `qingliu:*`, `tetris:*`, and `stack-order:*` keys remain explicit read-only migration
   sources so existing Puzzle progress, rule-intro state, and leaderboards survive;
3. current writes move to `tetramorph:*`, and direct tests prove the old values migrate
   without deleting or reinterpreting them;
4. README becomes the public project entry point with Features, Technical Highlights,
   Controls, Development, and Screenshots sections; it contains no retired project pitch;
5. The retired DEV-QA globals become `__TETRAMORPH_QA__` and
   `__TETRAMORPH_LAYOUT_QA__`, with every maintained script and direct test updated in
   the same checkpoint.

**Verified Phase-A result.** Contract, public metadata/README, persistence migration,
and QA identity are separate rollback points. Valid former leaderboard, Puzzle, and
mode-intro records copy into `tetramorph:*` keys while their rollback values remain.
Targeted tests pass; final typecheck, the complete suite (`308 passed / 3 skipped`),
the 760-module production build, and the active-identifier scan pass. No server or
browser was started for this nonvisual slice.

**Verified bounded slice — Phase-C typography, pause reachability, and Settings
information architecture.** Direct player review rejected the inherited handwritten
English UI, the IBM Plex Mono data role, a pause layer that can intercept the persistent
top actions, and a Settings sheet that exposes every subsystem at once. The correction
required:

1. keep Playwrite NZ Basic exclusive to the `TetraMorph` wordmark; use locally packaged
   Space Grotesk for all ordinary English headings, prose, labels, buttons, rules,
   keyboard descriptions, records, and units; use Noto Sans SC for Chinese UI;
2. use locally packaged Geist Mono for scores, times, ranks, dates, countdowns,
   board indices, keycaps, percentages, and numeric units. Its compact, open figures
   replace the rejected narrow JetBrains Mono treatment; tabular figures remain enabled
   and synthetic slashed-zero styling remains prohibited;
3. replace the all-at-once Settings console with three explicit tabs: **Settings**
   (language, SFX, volume, restart/continue), **Controls** (gameplay first, shortcuts
   second), and **Rules** (current-mode rules followed by its record or top-five table).
   The active panel alone is rendered, eliminating structural voids and translation
   collisions while preserving arrow-key navigation and Enter activation;
4. keep Back and Settings visually and pointer-operable while Pause is open by ending
   the gameplay backdrop below the 64 px top bar. Either action replaces Pause with its
   existing successor sheet; gameplay input stays disabled and only one Canvas remains;
5. add direct typography, Settings-tab, keyboard-navigation, and pause-transition tests.
   After the last source edit, run one typecheck, the full suite, one build, and one
   controlled bilingual browser batch at desktop, portrait, and short-landscape sizes.

The bounded slice allowed typography dependencies/imports/tokens/notices, localization,
`src/App.tsx`, authoritative Settings/HUD CSS, and direct tests. It did not change Core
rules, renderer primitives, Puzzle definitions, scoring, persistence schemas, or add a
new gameplay feature.

**Verified result.** Product source `310d83a` assigns Playwrite NZ Basic only to the
wordmark, Space Grotesk to ordinary English UI, Noto Sans SC to Chinese UI, and Geist
Mono to numeric/data roles. Settings now renders one of three compact panels at a time;
its run actions span the available width and its Controls panel keeps Gameplay and
Shortcuts balanced. Pause ends below the persistent top bar, so pointer hit testing and
real transitions both prove Back and Settings remain available while the board and Next
stay mounted.

Final typecheck, the complete suite (`309 passed / 3 skipped`), and the 768-module build
pass. Reproducible evidence under `docs/evidence/t26/` covers nine bilingual/responsive
states and reports zero clipping, text overlap, wrong English/data face, horizontal
overflow, DOM board cells, or browser errors. It binds to `310d83a`; evidence checkpoint
`32b4457` contains the runner, audit, and inspected frames. The browser-owned preview was
released and port `4186` has no listener. Phase B first-experience work and the remaining
RC phases stay open; this verification does not label the complete RC finished.

# Previous Task — T25 Invariant Home Mode Typography

## T25 active goal — keep the four English mode names typographically invariant

**Status (2026-08-03): VERIFIED / AWAITING PLAYER REVIEW.** Direct player comparison found that the four
permanent English Home labels use the Chinese UI face while the selected interface
language is Chinese, but use Playwrite NZ Basic when the language is English. Their
   content is intentionally language-invariant, so their font role must be invariant too.

The authoritative Home selector now binds those four labels directly to
`--font-ui-en`. Typecheck, the complete suite (`305 passed / 3 skipped`), and the
760-module production build pass. A bilingual Chromium check after `document.fonts.ready`
reports identical Playwrite NZ Basic families and identical label rectangles in
`zh-CN` and `en`, with zero console errors. The first complete-suite run hit one
unrelated renderer setup timeout; that file and the complete suite both passed on the
single controlled retry.

1. `Classic`, `Survival`, `Mutation`, and `Puzzle` use the existing English UI family
   in both `zh-CN` and `en` states.
2. Surrounding localized actions and accessible labels continue to follow the selected
   language; no copy, layout, card geometry, mode order, or interaction changes.
3. A direct style contract and bilingual rendered-font check must prevent regression.

**Ownership and checkpoint boundary.** The coordinator is the sole writer. Product
scope is limited to the authoritative Home navigation typography selector and its
direct tests. Documentation records the invariant proper-name role; browser evidence
must compare Chinese and English Home states before acceptance.

# Previous Task — T24 Typography, Pause Navigation, and Settings Composition

## T24 active goal — complete English typography, readable data, and compact settings

**Status (2026-08-02): ACCEPTED / CLOSED / READY FOR PUBLICATION.** Candidate
`eeb7c00` completes the frozen contract. Final typecheck, the full suite (`305 passed /
3 skipped`), and the 760-module production build pass. Reproducible browser evidence
binds to source `1dabee8` and covers English/Chinese Settings, populated and empty
records, desktop/portrait/short-landscape geometry, and Pause keyboard navigation.
Independent read-only QA of `230eb09..eeb7c00` reports P0-P3 all zero.

This bounded correction began from clean pushed base `230eb09`. Direct player review
showed English text collisions and incomplete family replacement, rejected the current
numeric face, required Back and Settings to remain clickable while the pause sheet was
open, and rejected the Settings composition as structurally loose.

1. **English UI uses one complete, content-safe family.** Every player-facing English
   prose, heading, label, button, rule, keyboard explanation, record caption, and unit
   must resolve through the same locally bundled UI family. `TetraMorph` remains its
   isolated bold brand treatment. Keycaps and numeric values are separate semantic
   roles, not exceptions that allow arbitrary legacy UI fonts. Long English content
   must wrap inside its own region without overlap, clipping, ellipsis, or disappearance.
2. **Numeric data receives a clearer dedicated face.** Replace Fira Code with locally
   bundled IBM Plex Mono for scores, times, ranks, dates, countdowns, board indices,
   keycaps, and numeric units. Use real packaged weights, tabular figures, and ordinary
   zeroes; do not synthesize weight or force slashed zeroes.
3. **Pause does not disable global navigation.** While the compact pause sheet is open,
   the top-bar Back and Settings buttons remain visible, pointer-clickable, and keyboard
   reachable. Back opens the existing leave confirmation; Settings replaces Pause with
   the single Settings dialog. Gameplay input remains disabled and no second dialog,
   Canvas, or preview implementation may appear.
4. **Settings becomes one compact two-column console.** Rules span the top. Controls
   and Keyboard form a balanced middle pair with explicit internal alignment; Record
   spans the bottom. Sections remain typographic regions inside one enclosing surface,
   not nested cards. Chinese and English, Classic/Survival/Mutation/Puzzle, empty and
   populated records, desktop, portrait, and short landscape must contain no structural
   void, collision, clipped copy, accidental two-line action, or internal horizontal
   overflow.
5. **Acceptance is fail-closed.** Direct tests must cover English font ownership,
   IBM Plex Mono loading, Settings content order and geometry contracts, and clicking
   Back/Settings from Pause. After the final source edit run one typecheck, the complete
   suite, one build, and one real browser batch covering Chinese and English Settings,
   populated Survival records, empty records, and Pause-to-Back/Settings transitions.
   One Canvas, zero DOM board cells, zero console errors, responsive fit, and cleanup
   remain mandatory.

**Ownership and checkpoint boundary.** The coordinator is the sole writer. Contract
paths are `docs/CURRENT_TASK.md`, `docs/DESIGN.md`, `progress.md`, and
`docs/workstreams/tetris-t24-coordinator/THREAD_LOG.md`. Typography may touch package
metadata, `src/main.tsx`, typography tokens, and direct tests. Pause/Settings work may
touch `src/App.tsx`, authoritative Settings/HUD styles, and direct tests. Evidence,
independent read-only QA, changelog integration, and push remain separate checkpoints.

# Previous Task — T23 Pressure, Reshape, and Quiet State Fields

## T23 accepted goal — readable new decisions without visual noise

**Status (2026-08-02): ACCEPTED / CLOSED / READY FOR PUBLICATION.** Product source
`4c43619` implements the frozen contract. Final typecheck, the complete suite (`305
passed / 3 skipped`), and the 762-module production build pass. Browser evidence
`e8418d5` proves the fourth natural rise changes `3 / 6` to `4 / 8`, captures Reshape
and activation-free persistent fields, and reports one Canvas, zero DOM board cells,
zero console errors, responsive fit, and complete runtime cleanup. Independent
read-only QA of `0107e52..e8418d5` reports P0-P3 all zero.

1. **Survival is slightly faster, not abruptly harsher.** Ordinary Survival gravity
   changes from 40 to 38 simulation ticks per cell (about 0.63 seconds per cell). The
   falling-rock cadence, four-times rock speed, initial three-row countdown, and
   three-line bedrock removal remain unchanged.
2. **Survival gains one deterministic cave risk: Aftershock.** Every fourth natural
   pressure rise adds two bedrock rows instead of one. Initial countdown rows do not
   count toward this cycle, and line-clear removal does not reset it. The HUD must
   warn when the pending rise is an Aftershock, and bilingual rules must explain the
   four-rise cycle. The cycle participates in restart, replay, and state hashing.
3. **Mutation gains one planning item: Reshape.** A Reshape carrier is a fifth seeded
   item outcome. When any of its cells clear, it changes the first post-activation
   preview tetromino to `I`. Core resolves the clear and spawns the already-waiting
   piece in one transition, so Reshape targets the following queue entry: it then
   remains visible in Next for the full active-piece turn before its own spawn. It has a distinct
   emerald material and a short reconfiguration cue, but no timed status field or
   looping sound. Existing Bomb-first activation order and seeded determinism remain
   authoritative.
4. **Persistent Mutation fields become quieter and more truthful.** Supergravity no
   longer uses narrow falling strokes that read as rain; broad constant-alpha
   compression contours converge on the occupied stack. Multiplier no longer owns a
   large central seal; one compact, time-invariant corner constellation indicates
   x2/x4 while the status rail remains the primary timer. Reduced motion uses the
   same static endpoint.
5. **Language returns to Settings; Home mode names stay English.** Remove the Home
   language control and restore the single persisted bilingual control inside
   Settings. The four visible Home labels are always `Classic`, `Survival`,
   `Mutation`, and `Puzzle`; surrounding interface and accessible action copy still
   follow the selected language. No duplicate language control is allowed.
6. **Acceptance is fail-closed.** Focused Core tests must prove 38-tick gravity,
   the fourth-rise double wall, restart/hash participation, seeded Reshape drawing,
   and queue replacement. Renderer tests must reject rain-like Supergravity strokes
   and oversized/animated Multiplier geometry. App tests must prove one Settings-only
   language control and invariant English Home labels. After the final source change,
   run one typecheck, one full test suite, one build, and one real browser evidence
   batch covering Home, Settings, Survival Aftershock, Reshape/Next, Supergravity,
   and Multiplier. One Canvas, zero DOM board cells, zero console errors, responsive
   fit, and resource cleanup remain mandatory.

**Checkpoint boundary.** Contract paths are `docs/CURRENT_TASK.md`,
`docs/DESIGN.md`, `progress.md`, and
`docs/workstreams/tetris-t23-coordinator/THREAD_LOG.md`. Core checkpoints may touch
only the smallest constants/state/engine paths and direct tests. Mutation visual work
may touch tokens, materials, timeline, renderer, and their direct tests. Language and
HUD work may touch App, localization, authoritative styles, and direct tests. Browser
evidence, QA disposition, changelog integration, and push remain separate commits.

# Previous Task — T22 Home Language and English Typography Refinement

## T22 active goal — buttons only and one English type family

**Status (2026-08-02): ACCEPTED / CLOSED / READY FOR PUBLICATION.** Product source
`0a0f2bc` removes the redundant visible label while retaining localized accessible
names, and makes Playwrite NZ Basic the first English UI family without changing
Chinese or numeric-data roles. The wordmark retains its maximum real weight and stroke
treatment. Direct tests pass `49/49`; final typecheck, the full suite (`300 passed / 3
skipped`), and the 762-module production build pass. English Home evidence `631393a`
shows the finished hierarchy without overflow, and independent read-only QA of
`e1f3eb3..631393a` reports P0-P3 all zero.

**Ownership and checkpoint boundary.** The coordinator is the sole writer. Contract
changes are limited to this file and `docs/DESIGN.md`; product changes are limited to
`src/App.tsx`, `src/styles/tokens.css`, `src/design/tokens/typography.ts`, and their
direct tests. Final verification, changelog, and push remain separate checkpoints.

# Previous Task — T21 Survival Wall and Gameplay Sheet Correction

## T21 active goal — coherent rock relief, arrow-only warning, unobscured Next

**Status (2026-08-02): ACCEPTED / CLOSED / READY FOR PUBLICATION.** Final product
source `7d5e944` and browser evidence `ca3d571` implement and verify the complete T21
contract. Final typecheck, the complete test suite (`300 passed / 3 skipped`), and the
production build pass. Browser evidence shows the actual queued tetromino under pause,
restart, and leave sheets; piece-count Survival rockfall beginning wholly inside the
visible board; one home-only language control; one gameplay Canvas; and zero console
errors. Independent read-only QA of `4505fb9..ca3d571` reports P0-P3 all zero.

1. **Bedrock remains one continuous, truthful wall.** Preserve the exact flat contact
   plane, continuous rectangular collision mass, staged entry rise, renderer-lifetime
   texture cache, deterministic generation, and cleanup. Replace the current oversized
   planar tessellation with medium-scale connected mineral relief and restrained strata
   whose forms cross logical rows and columns. The result must remain stylized beside
   the enamel pieces: no photograph, masonry, grid, timber grain, cracks, decals,
   isolated boulders, giant fan facets, or high-frequency noise.
2. **Only the warning arrow may flash.** Remove every time-varying board wash and
   source-column wash. Normal motion pulses only the single downward arrow in the
   frozen source column; the board, active piece, Ghost, bedrock, and settled stack do
   not change brightness. Reduced motion keeps that same arrow at one steady,
   high-contrast endpoint.
3. **Gameplay sheets respect the information rail.** Pause and restart confirmation
   use one compact gameplay-sheet placement centred over the board track on desktop,
   never over the right-side rail. The existing Canvas-owned Next preview remains the
   sole preview implementation and stays visible while either sheet is open. Small
   screens retain a readable bottom-sheet fallback without adding a second Canvas or
   DOM-rendered tetromino.
4. **Acceptance is visual and fail-closed.** Direct tests must prove deterministic
   cold-toned wall pixels without large flat regions, zero warning fill rectangles,
   time-varying normal arrow opacity, time-invariant reduced-motion geometry, and the
   gameplay-sheet placement contract. Browser evidence must show complete live pages
   for pause and restart with a visible Next piece and no sheet/Next overlap, plus a
   live Survival wall and arrow-only warning. One Canvas, zero DOM board cells, zero
   console errors, and no viewport overflow remain mandatory.
5. **Simultaneous Mutation effects preserve visible causality.** When one clear earns
   several distinct items, Bomb resolves and starts its board-local explosion before
   gravity-changing or scoring states present their activation. This prevents the
   stack from visibly settling before the blast that caused that settlement. All item
   activation cues may be shortened, but none may be skipped, duplicated, or left
   queued indefinitely.
6. **Supergravity must read as sustained downward force without flashing.** Replace
   the weak ambient field with compact, constant-alpha downward compression traces and
   a denser pressure zone that follows the occupied stack region. Translation may be
   faster and more decisive, but brightness may not oscillate and the board, active
   piece, Ghost, and Next must remain legible. Existing airborne-piece latching and
   independent-column landing truth remain unchanged.
7. **Gameplay sheets preserve the actual Next tetromino, not only its well.** Pause,
   restart confirmation, and leave confirmation may dim the game, but the queued piece
   inside Next remains rendered and readable beside the sheet. A bordered but empty
   Next well does not satisfy this requirement. Countdown still keeps its existing
   intentional preview suppression when no sheet is open.
8. **Survival stonefall is piece-count driven.** Replace the elapsed-seconds cadence
   with a deterministic piece interval. The first rockfall accompanies the spawn after
   eight player pieces have been used. Every four completed rockfalls reduces the next
   interval by one piece until the floor of four. The HUD uses the compact two-line
   reading “距离落石” / “X块”. Each event still creates one or two vertically joined
   rocks, but its seeded column must exclude every column occupied by the newly spawned
   tetromino at that instant. The event's first rendered state is wholly inside the
   visible board: a one- or two-rock body appears at the top row without entering from
   or being clipped by the hidden spawn buffer.
9. **Language belongs on the home screen.** Move the Chinese/English switch out of the
   in-game Settings sheet and into a quiet, keyboard-reachable home control. The choice
   remains persisted and updates the entire interface without introducing a second
   language control or disturbing the centered TetraMorph wordmark.
10. **Mode rules are concise but mechanically complete.** Rewrite all four rule sheets
    in both languages so each explains the objective, progression or pressure, unique
    mechanic, and end condition in plain language. Remove legacy timing claims and
    vague slogan-like fragments; Survival must describe the new piece-count rockfall.

**Ownership and checkpoint boundary.** The coordinator is the sole writer. Contract
paths are `docs/CURRENT_TASK.md`, `docs/DESIGN.md`, `progress.md`, and
`docs/workstreams/tetris-t21-coordinator/THREAD_LOG.md`. Renderer work is limited to
`src/game/render/TetrisRenderer.ts` and its direct test. Mutation sequencing may touch
the smallest inspected Core/runtime event path and its direct test; Mutation visual
work is limited to the renderer and its direct tests. Gameplay-sheet work is limited
to `src/App.tsx`, `src/App.test.ts`, `src/ui/ActionSheet.tsx`, and the authoritative
HUD/style paths required after inspection. The Survival cadence addendum may touch the
smallest Core state/engine and direct tests plus its HUD/localization surfaces. The
home language and rules addendum may touch `src/App.tsx`, localization, authoritative
styles, and direct tests only. Evidence, independent read-only QA,
changelog disposition, and push remain separate checkpoints.

**Final disposition.** The accepted piece cadence starts at 8, decreases after each
four rockfalls to the floor of 4, and schedules the rockfall with the following
ordinary spawn outside that piece's occupied columns. One- and two-rock events begin
at `VISIBLE_START_ROW`, so their complete body is visible on the first rendered frame.
The HUD reads `距离落石` / `X块`. The CSS stacking correction preserves both the Next
well and its Canvas-owned piece beneath every gameplay sheet. Language selection is
available only on Home, and all four bilingual rule sheets now state objective,
pressure, mechanic, and end condition without obsolete timing copy.

# Previous Task — T20 TetraMorph Survival Material Harmony Correction

## T20 active goal — game-native cavern wall and unmistakable rockfall warning

**Status (2026-08-01): ACCEPTED / CLOSED / READY FOR PUBLICATION.**

**Final acceptance.** Product source `eadeac6` replaces the rejected photographic
height field with the contracted cold-slate mineral wall and strengthens the warning
into a persistent arrow plus a short warm flash. Final browser evidence is frozen at
`b600ace`: one Canvas, zero DOM board cells, no viewport overflow or console errors,
different normal-motion warning phases, and identical reduced-motion samples. After
the last source change, typecheck, the full `32 passed / 1 skipped` file suite
(`297 passed / 3 skipped` tests), and the `762`-module build pass. Initial independent
QA `d1ad2e9` accepts the product and evidence but correctly blocks release because the
writer log was stale. Provenance checkpoint `534e78e` closes that sole gap without
reopening source or evidence, and independent retry `1b0c64c` reports P0–P3 and
evidence gaps all zero. The owned browser and Vite server are closed and port `5178`
is free.

This bounded post-acceptance correction starts from clean pushed base `0e21365`.
Phase 12 remains historically accepted, but direct player review rejects the final
bedrock texture because its dense neutral-grey photographic relief conflicts with the
bright, simplified enamel-mineral language of the playable pieces. The player also
finds the existing steady rockfall arrow too quiet and explicitly permits a flashing
warning. No Survival rule, collision, cadence, score, replay, save, or layout change is
authorized.

1. **Bedrock remains one truthful wall.** Preserve the continuous rectangular mass,
   mathematically flat contact plane, staged entry rise, renderer-lifetime cached
   texture, deterministic generation, and teardown. Do not restore a `10 x N` cell
   grid, masonry, bricks, wood, decals, cracks, isolated boulders, or an irregular
   collision silhouette.
2. **The material becomes stylized rather than photographic.** Replace dense fine
   grain and neutral photo-grey microcontrast with a cold blue-grey mineral ramp of
   roughly five to seven perceptual bands. Broad low-frequency planes may cross every
   logical cell boundary; a restrained upper-left lift and lower depth may add mass.
   At gameplay scale the wall must belong beside the enamel tetrominoes instead of
   reading as a pasted photograph, asset-store texture, concrete slab, or metal panel.
3. **Rockfall warning becomes unmistakable without becoming noise.** The frozen source
   column keeps one downward arrow, but it may use a short rhythmic pulse plus a
   restrained board/column flash in a warm warning accent. The flash must cease as soon
   as the warning clears, never obscure the active piece, and never resemble Mutation
   state feedback. `prefers-reduced-motion` replaces the pulse with one steady,
   high-contrast warning endpoint.
4. **Acceptance is fail-closed.** Direct renderer tests must prove deterministic pixel
   output, cold chroma, bounded tonal complexity, low high-frequency neighbour change,
   continuous wall geometry, a time-varying normal-motion warning, and a time-invariant
   reduced-motion warning. Final evidence must show the complete live Survival page at
   ordinary desktop scale with one Canvas, zero DOM board cells, zero browser errors,
   the wall visible beneath real pieces, and the warned column visible before a rock
   event. Visual acceptance is required; a green test alone cannot close this slice.

**Ownership and checkpoint boundary.** The coordinator is the sole writer. Contract
paths are `docs/CURRENT_TASK.md`, `docs/DESIGN.md`, `progress.md`, and
`docs/workstreams/tetris-t20-coordinator/THREAD_LOG.md`. Product work is limited to
`src/game/render/TetrisRenderer.ts`, `src/game/render/TetrisRenderer.test.ts`,
`src/game/render/theme.ts`, and `src/game/render/theme.test.ts`. Evidence, independent
read-only QA, changelog disposition, and push remain separate checkpoints.

## Phase 12 active goal — continuous settings, solid geology, authored technique

**Status (2026-08-01): ACCEPTED / CLOSED / READY FOR FINAL PUBLICATION.**

**Final acceptance (2026-08-01).** Product source is frozen at
`d84b04351dc89d5f503df2112a71789950ba0796`; final browser evidence is
`18f8886..9e22a8b`, and independent read-only QA is recorded by
`9ec1149..6fce9e6` with P0–P3 and evidence gaps all zero. The procedural cavern
wall remains the separately accepted `2e14ec3 / dcb1d79 / 5619bce / 92a124f`
chain and was not reopened by the final responsive retry. Exact Puzzle
certificates pass `3/3`; final typecheck, `32 passed / 1 skipped` test files
(`297 passed / 3 skipped` tests), and the `762`-module build pass. The two final
browser manifests bind to `d84b043`, cover sixteen static and four dynamic screen
groups, and report zero browser errors. The owned browser and both bounded Vite
processes are closed; port `5178` is free. Only the coordinator's final docs
checkpoint, non-force push, and local/tracking/remote equality check remain.

**Resolved Final-QA retry boundary (2026-08-01).** The independently accepted procedural
bedrock wall is frozen: its continuous relief, flat contact lip, renderer-lifetime
texture, and falling-stone material did not change in this retry. The measured Puzzle
title and English `844x390` Settings defects are closed, the exact Puzzle certificate
run passes, and replacement evidence now contains the required active Mutation and
dynamic Survival sequences. Independent final QA accepts all four corrections.

Phase 12 supersedes only the rejected Phase-11 presentation and guidance outcomes below.
Accepted deterministic game rules, save compatibility, rankings, undo, two-piece Next,
single-Canvas ownership, and the remaining Phase-11 visual work stay unchanged.

1. **The leave decision is risk-ordered by both position and color.** `返回首页 /
   Back to home` stays on the left, owns the initial keyboard focus, and becomes the
   filled primary-blue action. `留在本局 / Stay in this run` stays on the right and
   becomes the pale secondary action. Left/Right, Enter, Escape, and direct pointer
   activation remain deterministic.
2. **Settings is one continuous console, not four cards.** Rules, Controls, Keyboard,
   and Record keep that reading order but lose individual backgrounds, borders, rounded
   boxes, colored top rules, and card shadows. Section identity comes from heading
   weight, case, color, and measured whitespace inside one enclosing surface. It must
   remain compact, without structural void or fused English labels.
3. **English and data typography are replaced, locally packaged, and measured.**
   English UI moves from Space Grotesk to locally packaged Barlow Semi Condensed; data,
   timers, ranks, dates, keycaps, and gameplay numbers move from Geist Mono to locally
   packaged Fira Code. `TetraMorph` alone keeps Playwrite NZ Basic. Every supported
   Chinese/English viewport must show complete labels and values, including `s/cell`,
   without ellipsis, overlap, accidental line breaks, disappearing text, or baseline
   drift after fonts load.
4. **Survival stone reads through mass and light, never decals.** Bedrock becomes one
   flat-topped vertical cave wall whose contact plane aligns exactly with the board grid.
   The single slab with a few broad planes, the regular low-poly fan, and the later
   dry-stacked masonry courses are all rejected. The replacement uses one continuous
   wall body plus deterministic irregular relief regions at several scales. Those regions
   cross row and column boundaries, share edges without dark mortar outlines, stay close
   in value, and gain weight through vertical shading. They cannot repeat at cell cadence,
   form horizontal courses, expose a `10 × N` grid, dominate the wall as giant facets, or
   add a framed exterior. A narrow top-edge lift preserves the flat collision plane. No
   cracks, chips, dots, stickers, wood grain, stroked veins, brick joints, or per-cell
   ornament may imitate texture; the rocky read must come from continuous relief,
   varied scale, directional light, and depth. Falling
   stones remain square stone
   blocks with the same material family and a clear beveled solid face. Each falling
   stone owns exactly the same visual width and height as one ordinary board cell; it
   may not shrink into a pebble or expand beyond its collision cell. A two-stone event
   is two vertically adjacent squares in one frozen column with zero visual or logical
   gap, moving and settling as one rigid component. Core advances the event at exactly
   four times ordinary Survival gravity. Before each event, one steady downward arrow
   marks the frozen source column; it is the only warning symbol and never flashes.
   Contact with an unresolved falling stone is a temporary obstruction, never settled
   support: it must not start or complete ordinary lock delay or cause top-out. If the
   stone's next row is occupied only by the active piece below it, Core attempts one
   atomic coupled step at the stone cadence: the stone and active piece each move down
   exactly one row, preserving collision separation. Repeated legal debris steps keep
   pushing until lateral player movement or geometry ends the above/below obstruction.
   The reverse ordering is not a push: when the active piece is above a falling stone,
   the stone is only temporary dynamic support, the active piece keeps its coordinate,
   and the stone continues away on its own faster cadence when legal.
   A coupled step may not advance ordinary gravity or lock delay; if either moved body
   would hit settled board or other debris, both wait without locking. Only settled
   board support may resume the normal lock-delay decision. One/two-stone randomness,
   clearing, hashing, spawn fairness, and replay remain canonical.
5. **Puzzle teaches authored techniques instead of publishing solver statistics.**
   Remove the live `局面分析 / Analysis` metrics, strategy sentence, and queue-role
   card. Reuse replay-verified routes to select a short sequence of approachable
   introduction levels, then attach one concise, authored lesson to each selected
   level in the library detail surface. Lessons cover completing a prepared row,
   preserving a well for a suitable body, flattening support before capping it,
   avoiding buried holes, reading the fixed two-piece queue, and treating immutable
   anchors as geometry. At least one early anchor lesson must teach a genuine timed
   side-slip: let the active piece descend to anchor height, then move sideways during
   fall to pass the obstruction and reach a cell unavailable to a straight hard drop.
   Lesson claims must be backed by public-command Core replays; they may reveal a
   principle and control timing, but never an exact full solution or live enumeration.
6. **Puzzle order is a three-part curriculum, not a solver leaderboard.** Preserve
   every stable level ID, board, seed, verified route, completion, and personal-best
   key, but reorder the current campaign into named library pages rather than numeric
   ranges. `入门 / Intro` contains positions 1–3 and isolates row completion, well
   preservation, and support. `简单 / Easy` contains positions 4–30: positions 4–6
   teach hole avoidance, two-piece planning, and opening retention and are the strictly
   certified mastery prerequisites; positions 7–9 combine the introductory ideas,
   position 10 introduces an anchor as permanent geometry, position 11 demonstrates a
   genuine timed anchor side-slip, and the remainder deepens those ideas through the
   four- and five-row bands. `困难 / Hard` contains positions 31–50 and groups the
   highest-load applications by the same transferable techniques instead of merely by
   row count. Historic v2/v4 orders remain migration-only literals and may no longer
   be required to match current ordinals.
7. **Hard unlocks are mastery proofs, not estimated budgets.** Selected Easy levels
   act as named technique prerequisites for related Hard levels. A prerequisite is
   mastered only when its saved best operation count is at or below `optimal + 5`;
   completion alone is insufficient. `optimal` must be established by a deterministic,
   no-beam search over every unique Core decision state capable of finishing before the
   candidate route. The only admitted pruning is a proved column-conservation bound:
   every distinct surviving target row still consumes one cell from every column when
   it clears; all ordinary cells already in that column are credited as reusable supply,
   and only the summed column deficits are divided by four future cells per tetromino.
   This cannot overestimate the remaining locks even when earlier clears pull existing
   cells downward. No earlier frontier may contain a
   finished state, the candidate depth must have a public-command winning replay, and
   the certificate records the route plus per-depth frontier/exploration counts. Existing
   bounded beam routes prove playability and alternate solutions only and must never be
   relabelled as optimal. The product consumes frozen verified certificates; it never
   runs the proof search during play.
8. **Home actions are icon-only and optically centred.** Each of the four mode tiles
   removes the redundant `开始 / Start` and `选关 / Levels` action labels. The arrow is
   the sole action mark, centred in one consistent square hit target across Chinese,
   English, pointer, keyboard focus, and every responsive layout. Removing the label
   must not weaken the mode-name accessible label or the 44 px minimum target. The
   glyph uses a deliberately longer horizontal shaft than the rejected compact arrow;
   all four keep the same shaft length, head proportions, stroke, and optical centre.
9. **Multiplier has no sustained audio bed.** Mutation `加倍 / Multiplier` and
   `超级加倍 / Super multiplier` may keep one brief acquisition or activation cue, but
   their ten-second active windows emit no loop, drone, pulse, repeated retrigger, or
   other sustained state sound. Visual state and the canonical timer carry duration.
10. **Multiplier atmosphere is local and steady.** Its board-background emblem becomes
    materially smaller and remains continuously legible without full-frame opacity
    pulses, screen flashes, or alternating bright/dark fields. Super multiplier may
    strengthen the same compact emblem, but cannot enlarge it into a board-dominating
    seal. Reduced motion shows the same stable endpoint.
11. **The home wordmark is geometrically centred.** `TetraMorph` is centred on both
    axes of its dark brand panel at every supported viewport; letter overhang and font
    metrics may not be mistaken for container centring.
12. **The site icon belongs to the four modes.** The favicon is an original 2×2 mark
    made from the home palette in reading order: Classic green, Survival blue,
    Mutation orange, Puzzle purple. It contains no commercial logo or letterform and
    remains crisp at browser-tab size.
13. **Consumed carriers leave no empty-cell frame.** Once any carrier cell is removed
    by a line clear, its material rim, cell outline, and attachment frame disappear
    with the cell. The one-shot activation may use local light or particles, but it may
    not redraw the cleared cell footprint as a lingering square cage.
14. **Supergravity communicates weight on the falling piece itself.** Remove the
    board-wide top boundary and ambient field. While Supergravity applies, each visible
    active cell owns a short violet afterimage with an upward-fading vertical tail,
    rendered behind the solid piece and clipped to the well. The tail never flashes,
    never becomes a full-board overlay, and vanishes at lock without leaving a cell
    frame. Reduced motion keeps one static short-tail endpoint.
15. **An airborne Supergravity piece keeps its landing contract.** If the ten-second
    timer expires after the current piece has spawned but before it locks, that piece
    still settles each occupied column independently when it eventually lands. The
    latch clears immediately after that lock; a piece spawned after expiry is ordinary.
16. **The Puzzle header moves down to meet the gallery without lifting the gallery.**
    The `返回首页 / Back to home` control, centred `TetraMorph` wordmark, breathing gap,
    and gallery form one content-height stack that is vertically centred as a unit.
    Desktop keeps 16 px between header and gallery; portrait and short-landscape keep
    12 px. The gallery stays near its established viewport position and dimensions;
    spare height is distributed above and below the complete stack instead of becoming
    either a large disconnect or a visually attached edge. Responsive layouts retain
    zero overflow and the same square-node geometry.
17. **The Survival bedrock must read as an exposed cavern wall.** Its contact remains
    perfectly level for collision truth, while the visible face is one continuous mass
    with small and medium irregular relief regions crossing all logical cell boundaries.
    No masonry course, mortar line, cell grid, giant fan facet, slab frame, or decorative
    crack is visible. At ordinary desktop play size the player must read a dark, heavy,
    naturally varied rock face with a restrained lit lip—not wood, metal, concrete,
    paving stones, a built retaining wall, or a flat geometric platform. The relief
    must be plainly readable in the real gameplay frame through a deterministic
    normal-lit height field with low-frequency eroded masses and restrained fine grain.
    Rounded nested blobs, pebble clusters, repeated zigzags, camouflage, folded-paper,
    a nearly uniform low-contrast fill, or a sharp tessellated mosaic are still failed
    candidates. The generated texture is one renderer-lifetime resource and must be
    released on teardown.
18. **Final responsive typography proof is fail-closed.** The Home wordmark must own a
    shrink-to-content box centred by the dark panel at desktop, portrait, and short
    landscape sizes; legacy full-width or translation rules may not displace it. The
    play-header mode label must preserve the complete English glyph box without clipping
    ascenders or descenders. Any measured wordmark centre drift or clipped translated
    label keeps Phase 12 open and requires a fresh browser matrix after correction.

## Phase 12 checkpoint order

1. P12.0: contract, font/license decision, route evidence inventory, proof matrix.
2. P12.1: leave semantics, continuous Settings, and local typography/fit corrections.
3. P12.2: four-times Survival debris cadence plus flat shelf and square stone bodies.
4. P12.3: remove live Puzzle analysis; establish strictly verified optimal certificates;
   reorder the stable-ID campaign into Intro/Easy/Hard pages; implement technique-linked
   mastery gates; and author route-backed introductory lessons.
5. P12.4: exactly one final typecheck, full suite, and production build after the last
   source edit.
6. P12.5: multi-round browser evidence in Chinese/English and all target viewports.
7. P12.6: immutable candidate, independent read-only QA, scoped scans, acceptance docs,
   non-force push, and owned-resource release.

## Phase 12 evidence and resource boundary

- One production writer owns shared source. No Serena, WMI/CIM, persistent indexer,
  watcher, language server, or inspection-only browser is admitted.
- Focused tests use one worker and no file parallelism. One project server and one
  managed browser batch may run only for bounded visual review and must be released at
  the end of that batch. Full suite/build run once after the final source edit.
- Browser proof covers both leave actions and keyboard selection; all four Settings
  sections in one continuous surface; Chinese/English desktop, portrait, and short
  landscape with complete values; Survival countdown, a flat-contact continuous cavern
  wall with cross-grid relief and no slab/facet fan/masonry courses, a steady column arrow,
  one/two square stones, 4x cadence, and an atomic
  debris/active-piece push that stays outside ordinary gravity and lock delay; Puzzle
  library lessons and a live HUD with no analysis card;
  reduced motion; one Canvas; zero DOM board cells, overflow, console errors, or page
  errors. Home evidence must prove a geometrically centred wordmark, label-free and
  optically centred long-shaft arrow actions on all four tiles without changing their
  accessible names, plus the four-mode favicon. Mutation evidence must prove the smaller steady
  multiplier emblem, the steady weighted Supergravity field, no cleared-carrier frame,
  the airborne-piece expiry latch, and absence of sustained multiplier audio. Puzzle evidence must also prove
  that reordering preserves all fifty stable
  IDs, both documented routes per level, saved completion/best values by ID, the
  intended Intro/Easy/Hard membership, the teach-then-combine opening sequence, and the
  first deeper anchor lesson. Every Hard mastery gate must name its related Easy
  prerequisite, expose a threshold equal to its certified optimum plus five, stay
  locked above that threshold, unlock at the threshold, and retain migrated completion
  by stable ID.

---

## Archived Phase 11 acceptance

## Phase 11 active goal — luminous materials, compact information, explainable puzzles

**Status (2026-08-01): ACCEPTED / PUSHED / CLOSED.**

Phase 11 is accepted from frozen product source `12fb0ae` and evidence candidate
`d1656a1`; coordinator acceptance `1cf7d54` is published on `main`. A passing unit
test, a single screenshot, or an attractive isolated frame was not treated as
completion.

1. **Ordinary pieces read as bright enamel, not dim tiles.** The seven tetromino
   families keep distinct hues and dark edge contrast, while face and inner-edge
   values rise enough to remain vivid against the midnight well in normal, ghost,
   Next, Puzzle, and Mutation-carrier states. Brightening must not become neon bloom
   or erase attachment identity.
2. **Survival geology is built as rock geometry, not decorated cells.** Permanent
   bedrock becomes one continuous procedural basalt shelf: an irregular rising
   contour, connected lit/dark planes, and structural fractures replace the visible
   square grid entirely. Falling stones become actual irregular vector boulders with
   a broken perimeter, lit face, shadow face, and joined mass for a two-stone event;
   they do not reuse the ordinary-cell body and cannot be square tiles with a texture
   or decal painted on top. Sparse downward grit may support motion but cannot carry
   the material illusion by itself.
3. **Leaving defaults to the requested destination.** In the leave confirmation,
   `返回首页 / Back to home` is the initial keyboard action. Left/Right still changes
   selection, Enter executes it, Escape safely closes the sheet, and pointer actions
   remain direct.
4. **Mutation effects communicate physical behavior rather than symbols.** Ice uses
   one long, smooth upper cold-front fade with no horizontal band or full-board wash.
   Supergravity removes the central emblem and screen-flash language, replacing it
   with restrained downward pressure, falling particulate, and local compression at
   settlement. Its ghost shows the real independently settled final cells for every
   active column. Bomb communicates the bottom-three-row blast through heat, embers,
   and an irregular floor pulse without a `3×10` rectangle. Concurrent items remain
   separately legible and reduced motion retains state without travelling animation.
5. **The in-game instrument rail is content-sized.** Stats, active status, Next, and
   mode-specific information form one compact hierarchy; the rail may not reserve a
   tall empty column. Puzzle uses the reclaimed area for meaningful analysis rather
   than decorative copy. Desktop, portrait, and short landscape keep one Canvas and
   no clipping or overflow.
6. **English and numeric typography are re-authored and locally packaged.** English
   UI uses Space Grotesk Variable and data uses Geist Mono Variable; `TetraMorph`
   alone keeps Playwrite NZ Basic. Font loading creates no runtime request. Chinese
   and English at supported viewports must show complete labels and values with no
   collision, disappearance, faux-weight jump, or ellipsis such as truncated
   `s/cell`.
7. **Settings is visibly sectional.** Rules, Controls, Keyboard, and Record each own
   a distinct heading, boundary, density, and reading order. English labels cannot
   concatenate into strings such as `Controls Language` or `KeyboardGameplay`.
   Keyboard keeps Gameplay before Shortcuts and the panel has no structural void.
8. **Home cards use complete edges, not decorative rails.** Remove every left accent
   bar. Hover and keyboard focus preserve all four card borders, including the top
   edge, without leaving pointer selection active after the cursor exits.
9. **Puzzle exposes logic without giving away a scripted solution.** A deterministic,
   non-mutating readout derives from the current board, immutable anchors, remaining
   original cells, the current piece, and the visible two-piece queue. It reports:
   direct-clear landing count, safe landing count, buried-hole count, and minimum
   added burden. One concise strategy line explains the current priority, and the two
   queued pieces receive compact role hints. The analysis must help players reason
   about wells, row completion, skyline, holes, and future fit without consuming RNG,
   altering undo/replay, leaking exact coordinates, or running an unbounded search
   each frame.

## Phase 11 checkpoint order

1. P11.0: contract, visual grammar, ownership, and browser proof matrix.
2. P11.1: brighter enamel palette and connected Survival geology.
3. P11.2: Ice, Supergravity, Bomb, and true Supergravity ghost projection.
4. P11.3: leave default, compact HUD, Settings sections, and home-card edges.
5. P11.4: local English/data fonts and bilingual fit corrections.
6. P11.5: deterministic Puzzle diagnosis and strategy readout.
7. P11.6: exactly one final typecheck, full suite, and production build after the
   final source edit.
8. P11.7: multi-round browser evidence from the immutable candidate.
9. P11.8: independent read-only QA, security scan, acceptance docs, push, and owned
   resource release.

## Phase 11 resource and evidence boundary

- One writer owns source. No Serena, WMI/CIM, persistent indexer, watcher, or browser
  is used for code reading. Focused tests use one worker and no file parallelism.
- At most one project server and one managed browser batch may exist during visual
  evidence; both need explicit ownership and must be released at the boundary.
- Browser acceptance covers Chinese and English, desktop, portrait, and short
  landscape; reduced motion; keyboard and pointer paths; Survival shelf plus one- and
  two-stone events; all three Mutation effects; Puzzle metrics across at least three
  tactical board states; one Canvas; zero DOM cells, console errors, page errors,
  clipping, and unintended overflow.

## Phase 11 acceptance — 2026-08-01

- Final product source: `12fb0ae0b6e373ff856ca48d0187485232c4db99`.
- Immutable evidence candidate: `d1656a1c1499cc1034e61e01316808339e4294a0`,
  with 24 browser frames, structured assertions, and `26/26` independently verified
  manifest entries under `docs/qa/evidence/t18-phase11/`.
- Final post-source gates pass: typecheck; `31` files / `288` tests with one worker;
  production build across `758` modules. The only build note is the existing chunk-size
  advisory.
- Browser review accepts the no-grid basalt shelf and irregular joined boulders,
  smooth single-gradient Ice front, restrained Supergravity pressure with truthful
  split landing projection, non-rectangular Bomb field, compact bilingual surfaces,
  complete home-card edges, and deterministic Puzzle analysis across desktop,
  portrait, and short landscape. The evidence reports one gameplay Canvas, zero DOM
  board cells, and zero console/page errors.
- Independent read-only QA accepts all nine outcomes with P0/P1/P2/P3 and evidence-gap
  counts all zero. A redacted gitleaks `8.30.1` scan of
  `a2d6670f6e1c6cfbf61eee232c3d4468c38dc65e..d1656a1` reports zero findings.
- The final browser batch is closed and port `5178` is released. No development server,
  managed browser, watcher, indexer, or active subagent remains owned by this phase.
- Coordinator acceptance `1cf7d5416191bde665089ab8756a2c861ff79380` was pushed
  non-force; local `main`, `origin/main`, and the remote branch matched at the
  publication check. This terminal documentation delta closes the phase without
  reopening source or evidence.

---

## Archived Phase 10 acceptance

## Phase 10 active goal — readable state, fair pressure, and mode-first results

**Status (2026-07-31): ACCEPTED / PUSHED / CLOSED.**

Phase 10 keeps correcting the current product until all fifteen direct outcomes below are
implemented, verified in real play, independently reviewed, committed as bounded
recovery points, and pushed:

1. **Player-facing terminology is consistent in Chinese and English.**
   `下落速度/格` becomes `下落速度`, and its value owns the explicit unit `秒/格`;
   Mutation `坍缩 / Collapse` becomes `超重 / Supergravity`; Survival
   `基岩 x 层 · 上升` becomes the compact status name `上升`. Historical prose may
   remain only as provenance. Stable internal discriminants such as
   `MutationItem = "collapse"` remain compatibility details and must never leak to
   the interface.
2. **Mutation activation is legible and bounded.** A single transition may apply
   every triggered carrier, including repeated carriers of the same type, but emits
   and presents at most one activation cue per item type. Different item types retain
   independent cues and timers.
3. **Survival falling stones are fair to the ordinary piece.** A warned stone column
   cannot cause block-out merely by intersecting the ordinary spawn footprint.
   Existing overlap can resolve as the faster stone descends. If a valid ordinary
   piece is supported by a still-falling stone event, the piece descends with that
   event until the stone settles; board collision, event order, hashing, line clears,
   restart, and deterministic seeded replay remain authoritative.
4. **Ice communicates a local atmospheric condition.** While active, automatic
   gravity is exactly `1.0 秒/格` and the HUD shows that canonical value; after expiry
   it restores the underlying Mutation cadence. The noisy sustained ice tone is
   removed and activation uses at most one restrained cue. The board remains readable:
   frost is an upper-edge gradient with bounded particles/highlights, not a full-frame
   blue/crystal wash.
5. **Mutation preview and Supergravity landing are trustworthy.** The Next body and
   attachment remain complete through queue changes, pause/leave confirmation, and
   simultaneous effects. Supergravity changes the settlement response, not the
   tetromino silhouette or preview geometry.
6. **Results are mode-first rather than cause-first.** No result title says
   `异变到顶`, `异变结束`, `生存结束`, `堆叠到顶`, or equivalent English cause copy.
   Mutation emphasizes score and ranks by score, showing lines as context and no
   piece count. Survival emphasizes survival time and ranks by time, with lines as
   context. Classic emphasizes lines and ranks by lines, with piece count—not score—
   as the small secondary metric. The top five, date, current-run row treatment,
   keyboard behavior, and Puzzle celebration contract remain intact.
7. Opening the leave/back confirmation after play starts must not blank the Next
   panel. Pause/overlay state is presentation-only and preserves the current preview.
8. `重新开始 / Restart` and `再来一局 / Play again` always re-enter the canonical
   `3 / 2 / 1` input-gated countdown before play. No piece, ghost, carrier, or Next
   content leaks during `ready`.
9. The current mode's concise Rules block is the first content section in Settings,
   followed by Controls, Keyboard, and the mode record/leaderboard.
10. The leave/back confirmation swaps its horizontal choices: the destructive return
    action is on the left, while the safe stay/continue action is on the right and
    remains the initial keyboard focus. Left/Right and Enter retain deterministic
    operation.
11. **Puzzle completion is durable and truthful.** Every actual success transition
    persists the level as completed and updates its minimum-move record before any
    restart, return, language change, result dismissal, or unmount can intervene.
    All fifty gallery entries are currently selectable, so an obsolete progressive-
    unlock guard may not reject a canonical success for the level being played.
    The library tick, completed-name color, selected-level record, Settings record,
    unlock calculation, and stored progress all derive from the same canonical
    snapshot. Replays with more moves retain the earlier best; a better replay updates
    it; malformed or older storage is migrated without losing valid completion data.
12. **Puzzle success earns a polished celebration.** First completion, new personal
    best, and repeat completion use one compact Puzzle-specific result surface with
    distinct concise copy, the current best move count, restrained board-colored
    confetti/mineral sparks, and clear `重来 / Replay` plus `返回关卡库 / Back to
    puzzle library` actions. It does not show lines, score, a generic run-loss title,
    redundant completion prose, or an unsupported rank. Reduced motion preserves the
    hierarchy without moving particles.
13. **Survival's cave enters as continuous pressure, not stepped teleportation.**
    Countdown still reveals exactly one, two, then three canonical bedrock rows on the
    three one-second beats, but every newly revealed row rises continuously from below
    the well while the already revealed shelf moves upward by the same distance. Each
    beat uses one short eased translation and settle; the rows never jump between
    integer presentation positions, expose an active/ghost/Next piece, or alter
    deterministic Core state. Reduced motion presents each completed row without
    translation.
14. **Bedrock and falling stones read as one cave geology.** Both use a cool mineral
    rock family with irregular planes, inset chips, small pits, and short fractures;
    neither resembles wood grain, bricks, planks, or polished square tiles. Permanent
    bedrock reads as a compact rising shelf. Falling stones retain a clearer outer
    silhouette, slightly brighter moving face, and sparse downward dust so their
    position and one/two-cell event height remain immediately legible. Geometry stays
    Canvas-only and cannot obscure ordinary pieces or warnings.
15. **Navigation copy and typography are deliberate and locally packaged.**
    Every current `返回模式 / Back to modes` action becomes `返回首页 / Back to home`.
    `TetraMorph` alone retains Playwrite NZ Basic. Chinese body/UI copy uses the
    variable 文渊黑体; concise Chinese display headings may use 得意黑. English UI
    uses Sora Variable, and gameplay numbers use IBM Plex Mono. Fonts are self-hosted,
    license-noticed, subset or packaged without runtime network access, and verified
    for Chinese/English fallback, stable metrics, keyboard labels, compact layouts,
    and Steam distribution. No proprietary or ambiguous-license font is admitted.

### Execution and acceptance

- Base is accepted and pushed `main@1f4847225c562163ad748fd2a76e4f4023778442`.
- Only the coordinator writes shared paths. Existing Phase-9 review agents are
  finished and read-only; no new persistent helper, listener, indexer, Serena process,
  or browser is admitted merely for inspection.
- Checkpoints are split into: contract; shared UI/localization; Survival Core;
  Mutation Core/audio/Renderer; result UI; Puzzle persistence/celebration; Survival
  entry/cavern presentation; typography; final evidence; independent QA; coordinator
  acceptance. Each source checkpoint owns focused tests and is green before the next
  subsystem opens.
- After the final source change, run exactly one final typecheck, full test suite,
  production build, and browser-evidence pass. Browser proof covers all four modes,
  Chinese and English, restart/play-again countdown, paused/back preview, simultaneous
  Mutation triggers, Ice activation/expiry, Supergravity settlement, Survival
  spawn-overlap/carry, ranked/unranked results, reduced motion, one Canvas, zero DOM
  cells, zero overflow, and zero console/page errors. Puzzle proof additionally covers
  first completion, slower replay, new best, direct return, restart, storage reload,
  unlock propagation, and reduced-motion celebration. Survival proof captures every
  countdown beat plus an intermediate rising-row frame, falling one/two-stone events,
  and reduced motion. Typography proof covers local font loading, Chinese/English
  headings and body copy, numeric alignment, fallback stability, and zero layout shift
  after `document.fonts.ready`.
- Release every project-owned browser, server, port, and temporary profile after
  evidence. Run one repository-scoped `gitleaks` scan before push. Phase 10 remains
  `ACTIVE` until independent read-only QA accepts the immutable candidate.

### Phase 10 acceptance

- Frozen product source: `7f45c55ccfea1cdf50a785bf249d1cec831473ac`.
- Source gates: typecheck passed; the full single-worker suite passed `29` files /
  `273` tests; the production build passed with `758` modules and only the existing
  non-blocking bundle-size advisory.
- Source-bound browser evidence: `87d7586fabc2dc5819d8d36965f123132654b58f`
  contains `26` captures plus README/JSON metadata. Its `28/28` manifest entries
  recompute exactly. The pass records one gameplay Canvas, zero DOM board cells,
  zero overflow, zero console/page errors, local-only font loading, and the required
  Classic, Survival, Mutation, Puzzle, bilingual, reduced-motion, persistence,
  restart, result, and responsive states.
- Independent read-only QA accepts `ad0e31b..87d7586` with P0/P1/P2 all zero and no
  evidence-integrity or repository-boundary gap.
- Redacted repository-scoped gitleaks `8.30.1` scanning
  `1f4847225c562163ad748fd2a76e4f4023778442..87d7586` reports no leaks across
  `13` commits.
- Coordinator acceptance `6b4bfd7d46e609f23e0641eb907b7502e4012080` was
  pushed non-force and matched local, tracking, and remote `main`. The owned Chrome
  batch is closed and ports `4178`, `5178`, and `5179` are free. No Phase 10
  implementation or publication action remains open.

## Phase 9 active goal — cave pressure and navigation correction

**Status (2026-07-31): PHASE 9 ACCEPTED / PUSHED / CLOSED.**

The direct goal is to keep correcting this slice until all eight requested outcomes are
implemented and visually accepted:

1. Survival emits a deterministic random event containing one or two rocks in one
   random column. A two-rock event is vertically stacked; every event falls at
   exactly two times the fixed Survival tetromino speed.
2. Survival bedrock and falling rocks share a readable cold-slate cavern treatment
   that communicates both rising ground and falling-rock pressure without resembling
   wood, planks, bricks, or a warm decorative wall.
3. Ordinary landing and line clear become short, natural, material-aware feedback
   without scaling cells, board shake, page flash, particles, gameplay changes, or
   any horizontal line drawn across or inside a cleared row.
4. The complete fifty-level Puzzle selector becomes a distinct two-page gallery:
   one connected preview/name/best/Start hero plus a `5×5` matrix for `01–25` or
   `26–50`, with true square level nodes, deliberate inter-node spacing, and no page
   or panel scrolling at any target viewport.
5. The mode home receives the previously missed composition pass: one wordmark,
   two-by-two mode matrix, stable type, real keyboard navigation, and no pointer
   highlight after the pointer leaves the mode region.
6. Countdown `ready` frames reveal no active piece, ghost, carrier, or Next piece;
   Survival shows only the digit and the progressively rising one/two/three bedrock
   rows until play actually starts.
7. Classic, Survival, and Mutation settlement becomes a mode-colored mineral ledger
   with only meaningful metrics, a top-five leaderboard, a highlighted current-run
   row when ranked, and actions. It does not repeat a separate “本局第 N 名 /
   This run · #N” label. Survival shows only survival time and lines.
8. Design choices are frozen only after bounded read-only comparisons. The accepted
   countdown/result and selector/home syntheses are recorded in `docs/DESIGN.md` and
   `docs/phases/phase 9.md`.

The pushed base is `main@87121af42330ab9aea9456e28dfa42e5edc62536`.
Only the primary coordinator writes shared files. The three brainstorm agents were
read-only and are finished. Later independent QA agents remain read-only and begin
only after an immutable candidate exists.

Survival Core checkpoint `2a1fb3b` is a valid recovery point for exact
`20 ticks/cell` cadence and one warned column, but its fixed two-cell event has been
superseded by the player's latest correction. The open Core correction must freeze a
deterministic one-or-two count together with the warned column, retain all-or-nothing
entry for the chosen height, and preserve deterministic collision, clear,
bedrock-shift, hash, restart, and seven-bag boundaries.

Same-column variable-event checkpoint `b99bbed` closes that Core correction. The
separate deterministic stream now freezes one column plus height `1 | 2` when warning
begins. A one-stone event enters as one cell; a two-stone event remains one rigid
vertical component; blocked entry retains both choices without partial spawn or
reroll. Focused Core/presentation proof passes `30/30`, the Renderer direct suite
passes, the source-bound App text bridge passes, and typecheck passes. The only
failure in the broader App file is the preserved, separate selector/home WIP still
meeting an old ten-band assertion; it is not attributed to this Core checkpoint.

Survival cavern checkpoint `5215769` is retained as a rollback point but its
warm-brown horizontal strata are **visually rejected** because they read as wooden
boards. The correction must use cold slate faces, irregular facets/chips, short
diagonal fractures, and clear cell silhouettes with no long horizontal grain.
During Survival's `3 / 2 / 1` entry countdown, the Renderer reveals and raises the
bottom one / two / three canonical bedrock rows respectively. Core still owns the
same deterministic three-row ready board; the staged reveal is presentation only.

Ordinary feedback checkpoint `daa0a13` is retained as a rollback point, but its
horizontal per-cell clear seams are **visually rejected**. Landing support and
bounded hard-drop traces remain eligible; ordinary clear must instead use one
stationary inset face bloom per real cleared cell, with no `lineTo`/stroke geometry,
no row-spanning band, and no particles. Normal motion may retain centre-out timing;
reduced motion shows the same fixed faces simultaneously and only fades alpha.

Correction checkpoint `d8e97e7` implements the bounded source response: bedrock and
falling stones now use a high-contrast cold-slate family; permanent bedrock replaces
horizontal strata with deterministic polygon facets, two short diagonal fractures,
and a small pit. Ordinary clear now draws exactly one fill-only inset face per real
cell and zero line segments. Renderer/theme proof passes `40/40` tests and typecheck.
Countdown checkpoint `76ad7bf` adds a masked Pixi entry layer plus Runtime/App
presentation control. Digits `3 / 2 / 1` expose `10 / 20 / 30` canonical bedrock
cells, and each newly exposed row rises over `420 ms`; reduced motion reveals it
directly. Renderer/Runtime proof passes `46/46`, the focused React countdown proof
passes `1/1`, and typecheck passes. Both corrections remain source-green, not yet
browser-accepted.

Renderer correction `cb9356d` replaces the visually rejected large diamond-like
facets with smaller irregular patches, chips, pits, and localized cracks in a darker
cold-grey family. It also makes the fissure warning and public snapshot reflect the
frozen one- or two-stone event height. Runtime now retains the latest staged-bedrock
row count across async mount, while App starts the entry countdown only after Pixi
mount succeeds, closing the observed “digit 2 with no bedrock” race. Theme/Renderer/
Runtime proof passes `53/53`, focused React countdown proof passes `1/1`, and
typecheck passes. Real-frame browser acceptance remains open.

First-entry rules checkpoint `e4d19ad` now uses compact localized titles
(`生存规则` / `Survival Rules`), removes the redundant first-entry subtitle and
inner Rules heading, and changes the acknowledgement to `好的 / Got it`. Survival's
localized rule states that each event contains a deterministic random one or two
clearable stones in one random column at two times normal-piece speed. Focused React
and localization proof passes `2/2`, and typecheck passes. Browser acceptance and the
separate Puzzle/home navigation checkpoint remain open.

The first real-browser correction batch accepts the English and Chinese rule text,
title structure, and acknowledgement with zero console/page errors, but rejects the
Survival countdown frame. The authoritative late `.entry-countdown` rule paints an
opaque well-coloured layer above the Pixi canvas, so digits `3 / 2 / 1` are visible
while the intended one / two / three staged bedrock rows are completely hidden. This
is a presentation defect, not a Core or Renderer-state failure. The narrow repair must
make the existing countdown veil translucent while retaining the centered digit,
board-local dimming, focus/input gate, and reduced-motion behavior; it must not alter
countdown timing, Core state, renderer geometry, or other modal backgrounds.

Countdown compositing repair `e041a1c` replaces only that opaque late background with
a translucent well-coloured veil and adds a direct CSS contract. The repeat real-frame
batch visibly proves one / two / three staged rows beneath digits `3 / 2 / 1`.
The final frame has one Canvas, zero DOM cells, no horizontal or vertical overflow,
and zero console warnings/errors. The repair changes no timer, Core, Renderer geometry,
or modal behavior. Survival cavern and the first-entry rule sheet are browser-green;
the separate selector/home navigation checkpoint remains open.

Navigation candidate `9c515f6` is **independently rejected**. Its dedicated
`navigation.css` correctly declares a two-by-two mode matrix, but it does not reset
the explicit `grid-column`, `grid-row`, and `justify-self` values in older responsive
rules. Consequently 360×800 still places the four mode cards in one column, while
844×390 can create implicit third/fourth columns and a displaced action row. The
same independent pass finds a second P1 at 844×390: the short-landscape Puzzle
budget allocates 232 px to a five-row matrix whose five 44 px rows, four 3 px gaps,
and 2 px top inset require 234 px, so `overflow:hidden` clips the last row. The
correction is limited to authoritative home grid-item placement resets, an exact
short-landscape matrix budget repair, and direct cross-layer/budget regressions.
The first corrected browser measurement exposed one further rule in the same
cascade family: legacy `.console-route .console-node > button` specificity keeps
the actual short-landscape button at 48 px, producing
`scrollHeight 237 > clientHeight 233` even after the 2 px inset is removed. The
short-landscape authority must therefore reset that exact selector to the contracted
44 px target before the candidate can be reconsidered.
Survival, rules, Core, Renderer, records, audio, dependencies, Puzzle content and
progress semantics remain frozen. All final gates and affected browser frames must
be regenerated from the corrected candidate before acceptance.

Latest direct review supersedes the now-corrected one-page selector presentation.
The home cascade fix `2c199d2` and short-landscape budget fix `693f3d4` remain valid
recovery points, but Phase 9 is not accepted. The open source slices are:

- Renderer-only `ready` visibility: preserve deterministic Core state while drawing
  and reporting no active/ghost/Next content until `playing`; checkpoint `6a47926`
  closes this slice with `35/35` focused Renderer tests and typecheck;
- one dedicated result ledger for non-Puzzle modes, with structured metrics and
  mode-specific current-run highlighting; checkpoint `8b08361` closes this
  source slice with `43/43` focused App/style tests and typecheck;
- source checkpoints `2c1a13d..724e152` close the dedicated `25 + 25` Puzzle gallery and
  persistent-home-selection slices. Each page renders one `5×5` functional matrix
  around a connected board/name/best/Start hero, with semantic tabs and cross-page
  roving focus. Home retains only CSS hover and real keyboard focus; it emits no
  active/pressed selection state. Focused App/navigation/gallery proof passes
  `48/48` and typecheck passes. The pre-final real-frame pass measures zero overflow
  at all four target viewports and repairs compact preview scale plus the 360 px
  back-label wrap, but its stretched rectangular grid is visually rejected. The
  open presentation correction must make every node square, center the matrix with
  visible breathing room, and regenerate all selector evidence before acceptance.
  Checkpoint `348209f` implements the correction. Live measurements at the four
  required viewports prove equal width/height controls (`95.02 / 46 / 64.8 /
  58.8 px`), `12 / 6 / 8 / 8 px` gaps, equal grid client/scroll geometry, zero page
  overflow, and zero console errors; final source gates and committed evidence remain
  pending.

Independent QA rejects evidence checkpoint `eae9a1f` despite accepting the corrected
gallery and pointer-leave behavior. Two bounded corrections are open:

- the `844×390` unranked five-row result ledger must show every row and both actions
  in its first frame, with equal panel client/scroll geometry rather than relying on
  an internal scrollbar;
- result ledgers must remove the separate “本局第 N 名 / This run · #N” rank copy;
  a ranked run remains identifiable through the explicitly marked and mode-colored
  current-run leaderboard row;
- the `01–25 / 26–50` tablist must implement Left/Right and Home/End focus plus
  activation on the tabs themselves. Level-grid `±1 / ±5` navigation is unchanged.
- tall screens must contract the connected Puzzle outer frame to a content-fit
  `740 px` maximum while compact viewports continue using their full available row;
  the contracted frame is vertically centered in that available row rather than
  pinned to its top. Square-node sizes and spacing remain unchanged;
- first-row hover must retain its complete border: level controls do not move beyond
  the clipped matrix boundary on hover. The two tiny selected-node corner squares
  have no semantic meaning and are removed rather than explained.

Final correction range `51dd2fa..ba6bbb6` closes those findings. The `844×390`
unranked ledger now fits five rows and both actions with equal client/scroll
geometry; the separate “本局第 N 名 / This run · #N” copy is absent while the
current leaderboard row remains marked. Range tabs implement Left/Right/Home/End.
The gallery outer frame is capped at `740 px` and centered in its available row;
first-row hover has zero vertical displacement and keeps its `1 px` top border;
the meaningless selected-node corner squares are gone.

Final source `ba6bbb6` passes typecheck, the full `29`-file / `261`-test suite,
and the `756`-module production build. Evidence checkpoint `25cfebf` binds
twenty-six artifacts with `26/26` manifest matches. Browser proof covers the four
gallery viewports, Chinese/English and reduced motion, the staged Survival
countdown, ranked/unranked non-Puzzle results, pointer leave, tab and level-grid
keyboard paths, one Canvas, zero DOM board cells, zero overflow, and zero
console/page errors. Two independent read-only final reviews report
P0/P1/P2 = 0. Coordinator checkpoint `5b5dcb1` passed a scoped redacted
gitleaks 8.30.1 scan across the 33-commit Phase-9 range, was pushed non-force,
and matched local/tracking/remote exactly. The owned Vite listener and managed
Chrome batch are released. This closing documentation delta changes no product,
test, build, or evidence artifact.

### Ordered checkpoints

1. `contract`: documentation only; freeze exact rules, presentation, paths, gates,
   browser frames, resource ownership, and rollback base.
2. `source-survival-core`: one-or-two same-column event state, frozen count/column
   RNG plan, `20 ticks/cell`, clear and bedrock mapping, hashing, localization
   contract, and focused deterministic tests.
3. `source-survival-render-correction`: cold slate family, irregular facets, pair
   perimeter/fracture, fissure warning, local dust/contact, countdown one-row-at-a-
   time rise, reduced motion, and Renderer/Runtime/App tests.
4. `source-ordinary-feedback-correction`: support imprint, bounded hard-drop trace,
   stroke-free per-cell face bloom, reduced motion, reset/unmount cleanup, and
   direct Renderer tests.
5. `source-ready-visibility`: Renderer/snapshot only; no ready active/ghost/Next
   piece, exact Survival `10/20/30` staged bedrock, direct Renderer proof.
6. `source-result-ledger`: structured non-Puzzle metrics, rank state, result-only
   component CSS, localization and ActionSheet interaction proof.
7. `source-gallery-home`: two-page `5×5` Puzzle gallery, connected hero preview,
   page/roving focus, transient pointer hover, dedicated CSS and App/style tests.
8. `candidate/evidence`: final typecheck, one full suite, one production build, one
   managed Vite/Chrome lease, official web-game client, source-bound screenshots,
   geometry/overflow/input/lifecycle assertions, then complete resource release.
9. `qa/correction/acceptance`: independent rules, visual, and evidence reviews;
   relevant findings return to the same writer, receive fresh gates/evidence, and
   remain open until accepted. Then changelog, scoped gitleaks scan, exact staging,
   commits, non-force push, and local/tracking/remote equality.

### Exact source boundary

- Core: `src/game/core/constants.ts`, `src/game/core/types.ts`,
  `src/game/core/engine.ts`, `src/game/core/race.test.ts`, and direct hash/export
  tests only when required by the same-column one-or-two event.
- Renderer: `src/game/render/presentation.ts`,
  `src/game/render/presentation.test.ts`, `src/game/render/theme.ts`,
  `src/game/render/theme.test.ts`, `src/game/render/TetrisRenderer.ts`, and
  `src/game/render/TetrisRenderer.test.ts`.
- UI: `src/App.tsx`, `src/App.test.ts`, `src/styles.css`,
  `src/styles/tokens.css`, the final component authority
  `src/styles/navigation.css` plus its direct test, `src/main.tsx`, and
  `src/ui/localization.ts`.
- Evidence/docs: Phase-9 files under `docs/qa/evidence/t16-phase9/`,
  `docs/workstreams/tetris-t16-coordinator/`, `progress.md`, current contracts,
  and the final changelog entry.

Puzzle level definitions, solver artifacts/routes, unlock/persistence semantics,
leaderboards, Mutation gameplay/VFX, audio synthesis, dependencies, package metadata,
desktop packaging, and Steam SDK work remain out of scope.

### Acceptance gates

- Core: exactly one warned column and one frozen event count in `{1, 2}`; blocked
  entry produces no partial event or reroll; all cells in a two-stone event stay
  adjacent and move one cell per twenty playing ticks; normal pieces move one cell
  per forty; seed/replay and seven-bag remain stable; pause/restart/clear/bedrock
  shift/top-out/hash are deterministic.
- Renderer: a two-stone event remains adjacent in every captured frame while a
  one-stone event draws no phantom cell; permanent/clearable rocks
  are visibly related but distinct; all geology and feedback remains clipped to the
  one Pixi well; no DOM board cells or second Canvas; reduced motion remains clear.
- Feedback: landing `≤100 ms`, clear `≤150 ms`; stationary cells; zero particles;
  zero horizontal clear strokes or full-width sweep rectangles; Mutation carrier/
  status graphics and Puzzle marks survive ordinary clears.
- Survival entry: at countdown `3`, `2`, and `1`, exactly one, two, and three bottom
  bedrock rows are visible; each newly revealed row rises from below into its
  canonical cell row, while reduced motion reveals it directly. When the countdown
  ends, the Renderer returns to the full canonical board with no Core-state delta.
- Navigation: all fifty controls visible without scrolling at every required
  viewport; 44px targets; correct number/tick/best states; responsive arrow steps;
  Enter and pointer work; all four home entries visible with exactly one wordmark.
- First-entry rules: all four modes remove the overview subtitle and repeated inner
  rules heading; Chinese titles contain no inserted mode/rules space; the primary
  button is `好的` (`Got it` in English). Survival copy says random one-or-two stones
  in one shared random column at two times normal speed.
- Final: zero console/page errors and horizontal overflow; deterministic browser
  state; restart/undo/screen exit/unmount clear transients and return
  listener/rAF/audio/Canvas counts to baseline.

## Immediate clean-line correction — restore the ordinary clear baseline

**Status (2026-07-30): ACCEPTED / PUSHED / CLOSED.**

The rejected Phase-7 selector candidate and all of its later local records are preserved
without loss at `codex/t15-selector-wip-20260730`. `main` continues from accepted remote
recovery `62ba8e9`; `App.tsx`, `App.test.ts`, `styles.css`, and localization have no
delta from that recovery point. The current goal continues to exclude Puzzle-selector
visual work.

Clean-line product `760437d` restores only the stationary-cell, nine-tick centre-out
ordinary row sweep and removes the rejected contraction/dissolve/debris/afterglow
family. Current-schema QA fixture `9730d99` and title-only correction `70cff6e` align
the frozen Puzzle route evidence without changing a level, solver, progression rule,
selector, renderer behavior, or runtime game rule.

Run the focused Renderer/presentation tests, the focused route/QA tests, typecheck, one
full one-worker suite, and one production build. The existing normal/reduced Pixi
captures may be reused only if a static source comparison proves that their Renderer
inputs are byte-equivalent to `760437d`; otherwise capture fresh final-candidate
evidence. Return the clean-line range to the same independent rules reviewer before
coordinator acceptance or push.

Clean-line gates are green: Renderer/presentation passes 2 files / 39 tests; current
route/QA evidence passes 2 files / 5 tests; typecheck passes; the full one-worker suite
passes 26 files / 235 tests; and the production build passes with 753 modules. The
single-test reduction from the preserved WIP line is the excluded selector-candidate
test, not lost coverage in the clean product range. No browser, server, watcher, or
resident helper ran for these gates.

The same independent rules reviewer accepts `main@e2b990e` with P0, P1, P2, P3, and
GAP all zero. It confirms the four selector product/test paths are byte-identical to
`62ba8e9`, WIP is recoverable at `dce331b`, the rollback has the required stationary
nine-tick sweep, later mode effects remain intact, and the schema-7 fixture commits
change no product Puzzle behavior. The coordinator accepts the clean local result.
Run one scoped redacted secret scan, push `main` non-force, and verify local/tracking/
remote equality before resuming Phase 8.

Recovery `47ee3e5` was pushed non-force. Local `HEAD`, local tracking
`origin/main`, and remote `refs/heads/main` all resolved exactly to
`47ee3e5060b80d5c82c35672ad2fc8e178941207`. Scoped redacted gitleaks 8.30.1
scanned the six clean-line commits and found no leaks. The rejected selector WIP
remains local-only on its explicitly named preservation branch and is not part of
`main`.

## Phase 8 — final integration and release-readiness evidence

**Status (2026-07-30): ACCEPTED / PUSHED / CLOSED.** Pushed recovery
`4e4cca1` is the frozen product source. Phase-5 Mutation has been re-audited
against its ten mandatory requirements and current source: PASS, P0–P2/GAP zero,
with only the already accepted narrow three-status ellipsis P3. No Mutation semantic
path changed after `ee2aac5`; 34 captures, 38 browser hashes, 4 gate hashes, FIFO,
actual Collapse columns, 0.3 ms Renderer p95, 8.4 ms rAF p95 and zeroed lifecycle
remain source-bound evidence.

The five schema-7 Puzzle artifacts contain 50 unique IDs and 100 unique public-Core
routes, exactly ten levels / twenty routes for each 3/4/5/6/7-row tier. The current
26-file / 235-test suite replays definitions, anchors, both routes, early divergence,
progress gates and v5/v4/v3/v2/v1 migration. Selector visual work remains explicitly
excluded and its rejected candidate is not in `main`.

Phase 8 added only its contract, fail-closed evidence harness/output, integration
records and QA dispositions. The single managed Vite/Chrome lease plus official
web-game client produced 13 integration frames and two official-client frames.
All 23 published hashes and 18 manifest hashes recompute; the batch covers four modes,
desktop/portrait/short-landscape, Chinese/English, reduced motion, keyboard/touch,
modal focus paths and lifecycle return to baseline. Final typecheck, 26 files /
235 tests and the 753-module build pass.

Rules and visual QA both accept with only the already documented narrow three-status
ellipsis P3; evidence-integrity QA accepts with no finding or gap. Selector redesign
remains excluded, `dce331b` remains outside `main`, and product paths remain identical
to `4e4cca1`. Coordinator acceptance `c77790b` passed a scoped redacted
gitleaks scan and was pushed non-force. The final docs-only recovery record is
scanned and pushed separately, followed by exact local/tracking/remote equality.

## Active T15 delivery goal — six visual phases plus a 50-level Puzzle curriculum

**Status (2026-07-30):** accepted, pushed and closed. The linked product-review conversation is the
authoritative visual workflow. Complete the phases in order and retain fresh visual
evidence for each accepted boundary. After a phase passes both independent audits,
the coordinator records its acceptance, verifies resource cleanup, and pushes that
accepted checkpoint as a remote recovery point before the next phase begins. The
existing Puzzle library layout is explicitly excluded from redesign; adapting its
count/progression data for fifty levels is allowed, but its visual composition must
not be replaced. Phase 6 corrected product `9085976`, final gates, browser evidence,
and all three independent reviews pass; coordinator acceptance/recovery `d0b7406` is
pushed with exact local/tracking/remote equality and recorded at remote tip `d78e0e5`.
Phase 7's documentation contract is frozen at
`08c0491014c00ff5972ad7471d5bb0126eebae52` from that exact rollback base.
The persistence-v5 slice is independently accepted at product `fbec049`; bounded
setup authoring tool `b6acd46` and its generalization `306106a` are deterministic
and released. All five ten-level definition/artifact batches are independently
accepted and pushed through recovery point `e8bc42b9413dc096f503f122746cffb05b185f74`,
with both 41–50 audits reporting P0–P3/GAP all zero. The next bounded slice
implements the already-frozen progressive unlock rules in progress source and
direct tests only; React selector adaptation remains closed. Those data/progress
requirements are now accepted, and Phase 8 has accepted the integrated product without
reopening the selector visual boundary.

**Phase-7 Puzzle-50 contract (2026-07-30):** the existing Puzzle selector composition
is frozen. The active scope is fifty deterministic, solver-replayed levels arranged
in five ten-level curricula with exactly 3/4/5/6/7 original target rows. Every level
requires two completing routes with a different canonical landing no later than the
shorter route's fourth lock. Setup histories remain legal zero-clear hard drops; fixed
anchors are sparse, never share an initial target row, never move, never count toward
victory, and never replace the removed timed-piece mechanic.

Fresh progress opens `01–03`; any two open `04–05`; any three of `01–05` open
`06–10`; then any three completions in each open five-level band open the next band.
Completed legacy entries remain individually replayable without leapfrogging a closed
frontier. Locked entries cannot be selected, started or recorded. v5 freezes the old
twenty-ID migration domains, keeps old keys for rollback, migrates legal completion
history and writes it back, but does not promote old-board best counts into re-authored
boards. Current best continues to count locked tetrominoes.

The bounded source chain is: v5 persistence on the current twenty-level baseline; five
independent ten-level data/solver checkpoints; unlock/progress; existing-selector
adaptation; one final source candidate and gate/evidence/QA chain. Main is the only
writer for each shared slice. Under the updated dynamic resource memory, green permits
parallel static audits and at most two heavy tasks; amber serializes new heavy work;
red starts none. Helpers are on-demand and ownership-cleaned, with no WMI/CIM. Exact
paths, tests and evidence are frozen in `docs/phases/phase 7.md`.

**Open Phase-7 slice — progress unlock (2026-07-30):** accepted/pushed base
`e8bc42b`. Exact product/test paths are `src/puzzleProgress.ts` and
`src/puzzleProgress.test.ts`. Implement the frozen frontier only: fresh progress
opens 01–03; two completions there open 04–05; three completions across 01–05
open 06–10; then three completions in each already-open five-level band open the
next. Canonical completed IDs outside the current frontier remain individually
replayable but do not leapfrog closed prerequisite bands. Locked levels reject
new completion records. `nextPuzzleTierGate`, `nextLockedPuzzleLevel`,
`unlockedPuzzleLevelCount` and `isPuzzleUnlocked` must expose the same canonical
frontier and fail closed for malformed in-memory data.

This slice may update comments and direct tests but may not modify migration
domains, v5 revision/key semantics, Puzzle definitions/artifacts, App/App tests,
selector/CSS, localization, renderer, other modes or dependencies. Run the
focused progress test and typecheck, then freeze a source candidate for one
read-only rules/migration audit before opening selector adaptation.

**Progress-unlock candidate (2026-07-30):** product `3d21df8` over accepted
base `e8bc42b` implements the exact two-path claim. Fresh progress opens three
levels; the 2-of-3 and 3-of-5 opening gates feed the repeated five-level
frontier; completed out-of-order IDs remain individually replayable without
opening a later band; a locked level cannot create a completion or best record.
All frontier query functions derive the same ordered set and malformed
in-memory progress falls back to the fresh frontier.

The direct progress matrix passes 1 file / 8 tests; the bounded progress + App
integration matrix passes 2 files / 44 tests with one worker; typecheck passes.
No App/App-test, migration-domain, v5-key/revision, definition/artifact,
selector/CSS, localization, renderer, other-mode or dependency path changed.
Freeze `3d21df8` for one read-only rules/migration audit; selector adaptation
remains closed.

**Progress-unlock audit rejection (2026-07-30):** read-only QA rejects
`3d21df8` with `P1=1, GAP=2`. Frontier queries validate version, revision and
completed IDs but do not validate the in-memory `bestPieceCounts` object, so a
manually malformed runtime value can still unlock later tiers even though
persisted parsing correctly fails closed. Direct tests also need the missing
in-memory malformed case and an explicit two-stage assertion that out-of-order
completions do not advance before their band opens but do count after the
frontier reaches it.

Reopen only `src/puzzleProgress.ts` and `src/puzzleProgress.test.ts`. Make every
frontier query require the same complete progress validation used by record
updates, add both regression cases, rerun the direct and bounded App matrices
plus typecheck, then return the exact correction to the rejecting reviewer.

**Progress-unlock correction (2026-07-30):** `80da444` makes frontier
derivation validate both canonical completions and the full best-record object;
invalid `null`, non-positive count and unknown-ID in-memory best data now all
fall back to fresh 01–03. A two-stage regression proves that three migrated
completions in a later band do not advance while the prerequisite frontier is
closed, then do count immediately after that frontier opens. The corrected
bounded matrix passes 2 files / 46 tests with one worker and typecheck passes.
Return `80da444` to the original reviewer; selector adaptation remains closed.

**Progress-unlock acceptance (2026-07-30):** the original rejecting reviewer
accepts correction `80da444` with `P0=0, P1=0, P2=0, P3=0, GAP=0`. It confirms
all frontier queries now fail closed on the complete in-memory record, all
three malformed best cases and the before/after out-of-order scenario have
direct regression coverage, legal gate behavior is unchanged, migration
domains are untouched and the correction remains within the same two paths.
The progress-unlock slice is accepted. Commit and push this coordinator record
before opening selector adaptation.

**Open Phase-7 slice — persistence-v5:** exact product/test paths are
`src/puzzleProgress.ts`, `src/puzzleProgress.test.ts`, `src/App.tsx`, and
`src/App.test.ts`. This slice may add the v5 key/revision, freeze v4/v3/v2/v1 domains,
preserve legal completion history, reject malformed data, and write a successful
migration back to v5 while leaving old keys untouched. It must preserve the current
twenty-level runtime and all-open presentation until the later explicit unlock slice.
Puzzle definitions, IDs, names, solver, renderer, CSS and other modes remain closed.

**Persistence-v5 candidate (2026-07-30):** `fbec049` over base `455dea4` implements
the exact four-path claim. Focused progress/App tests pass 43/43 with one worker and
typecheck passes. v5 now has campaign revision 1; v4/v3/v2/v1 retain frozen historical
domains; v4 completion migrates without promoting old-board bests; a migrated record
writes back to v5 while old keys remain. The current twenty-level all-open runtime is
unchanged. Product is frozen for one read-only static slice audit before the first
ten-level curriculum batch opens.

**Persistence-v5 audit disposition (2026-07-30):** the independent static reviewer
accepts `455dea4..fbec049` with P0–P3/GAP all zero after correcting an initial
contract misread. The accepted behavior intentionally keeps v4 completion while
leaving retired-board best counts in the old key; it writes the migrated completion
to v5, preserves every old key, and does not change the twenty-level all-open
baseline. The fixed four-band builder is explicitly deferred to the later
unlock/expansion slice.

**01–10 authoring-tool checkpoint (2026-07-30):** `b6acd46` adds only
`docs/workstreams/tetris-t15-puzzle/search-puzzles.mjs`. Two identical fixed-budget
smoke runs produced the same SHA-256 JSON, four legal three-row candidates, 129,292
attempted landings and no budget exhaustion. Schema/row/cell/full-row assertions
passed; both temporary outputs and both Node processes were released.

**Open Phase-7 slice — levels 01–10:** exact paths are
`src/game/core/puzzles.ts`, `src/game/core/puzzles.test.ts`,
`src/game/core/puzzleCampaign.test.ts`, `src/game/core/puzzleFlow.test.ts`,
`src/game/core/puzzleSolverResults.test.ts`, `src/ui/localization.ts`,
`docs/workstreams/tetris-t15-puzzle/solve-puzzle-batch.mjs`, and
`docs/workstreams/tetris-t15-puzzle/puzzle-levels-01-10.json`. The first ten
existing visible IDs may receive re-authored 3-row setup histories, concise
structural Chinese/English names, unique gameplay seeds, and exactly one authored
anchor among 06–10. The Core-aware authoring runner may evaluate only those ten
registered definitions and emit the source-bound artifact. Every retained level
must replay two finishing public-dispatch routes with canonical landing divergence
by the shorter route's fourth lock. The remaining ten definitions, IDs, progress,
unlock, App/selector, CSS, renderer, other modes and dependencies remain closed.
Focused proof is the four direct Core test files plus typecheck; live search runs
one batch process at a time and never overlaps a full suite, build or browser.

**Levels 01–10 source candidate (2026-07-30):** `bf23126` re-authors the first ten
stable visible IDs into exactly three target rows. The shortest completing route
locks are nondecreasing `4,4,5,5,5,5,6,6,6,6`; every level has two public-Core
routes that finish and diverge at lock 1. The first five have no anchor, level 09
is the batch's only one-anchor board, and setup histories use 5–6 complete
zero-clear hard drops. The source-bound schema-7 artifact records setup, route,
clear, height, hole, branch-width, divergence and anchor metrics without claiming
optimality. Focused Core replay/definition/flow tests pass 4 files / 21 tests and
typecheck passes. Temporary candidate and probe outputs are removed; no solver,
Vite loader or listener remains. Product is frozen for one independent rules audit
and one independent curriculum/artifact audit of `1075400..bf23126`.

**Levels 01–10 audit correction (2026-07-30):** the independent rules audit accepts
`1075400..bf23126` with P0–P3/GAP all zero. The independent curriculum/artifact
audit reports P0/P1/P3/GAP zero and two relevant P2 findings: `targetRows` is not
stored explicitly on each registered `PuzzleDefinition`, and
`solve-puzzle-batch.mjs` accepts a range such as `05–14` even though authoring
checkpoints are fixed ten-level curricula. Reopened paths are
`src/game/core/puzzles.ts`, `src/game/core/puzzles.test.ts`,
`src/game/core/puzzleFlow.test.ts`, `src/game/core/puzzleSolverResults.test.ts`,
`docs/workstreams/tetris-t15-puzzle/solve-puzzle-batch.mjs`, and
`docs/workstreams/tetris-t15-puzzle/puzzle-levels-01-10.json`. The correction must
make target-row count explicit for every currently registered definition, consume
that metadata in validation/tests/artifacts, reject cross-batch ranges before
starting the loader, regenerate the same 01–10 route evidence, rerun only the four
focused Core files plus typecheck, and return to the same rejecting reviewer.

**Levels 01–10 correction candidate (2026-07-30):** `2ce309b` adds explicit
`targetRows` to every registered `PuzzleDefinition`, validates the frozen
per-ID values, and makes validation, flow proof, replay proof and artifact
generation consume the field rather than a difficulty formula. A `05–14` probe
exits 1 before constructing the loader and writes no file. The one permitted
`01–10` solver run verifies all ten levels and twenty routes; the regenerated
artifact remains byte-identical at SHA-256
`BA6DBABA314D34165F47DAC33E47CB721EA40E5B30E4EB152E5A0D83D2F597BF`.
After the last source edit, the four focused Core files pass 21/21 with one worker
and typecheck passes. No full suite, build, browser or persistent server ran.
The source is frozen for a narrow static re-audit by the reviewer who rejected
`bf23126`.

**Levels 01–10 correction audit disposition (2026-07-30):** the same
curriculum/artifact reviewer accepts `bf23126..2ce309b` with P0–P3/GAP all zero.
It statically matched 20 target-row metadata IDs to 20 registered definitions,
confirmed all consumers use the explicit field, proved cross-batch rejection
precedes loader construction and writes, found every frozen `endgame(...)` call
identical, and matched the unchanged schema-7 Git blob and SHA-256. Levels 01–10
are accepted and closed.

**Open Phase-7 slice — 11–20 authoring-tool generalization:** exact open path is
`docs/workstreams/tetris-t15-puzzle/search-puzzles.mjs`. It may replace the
hard-coded three-row constant with a required explicit `--target-rows 3..7`
argument, widen `--setup-counts` validation from the first-batch-only `5..7` to
the contract's `5..15`, and thread the selected row count through scoring,
acceptance, validation and output metadata. Product definitions, Puzzle IDs,
names, seeds, anchors, routes, Core, localization, progress/unlock, App, CSS,
renderer and other modes remain closed. Proof is `node --check` plus two
byte-identical bounded 4-row smoke outputs with direct schema/row/cell/full-row
assertions; all temporary files and processes must be released before opening
the 11–20 source slice.

**11–20 authoring-tool checkpoint (2026-07-30):** `306106a` changes only
`search-puzzles.mjs`. The tool now requires `--target-rows 3..7`, accepts unique
setup-count subsets from 5 through 15, and threads the explicit row count through
scoring, acceptance, validation and output metadata. `node --check` passes. Two
bounded 4-row runs with the same seed/range/budget each produced two candidates,
91,142 attempted landings and no budget exhaustion; both files had SHA-256
`6D2B28645AEDAC5897F80AC325B2B9FECC02D00502F6A0BB72405CDB27FB104B`.
Direct assertions passed for schema, explicit row metadata, exactly four occupied
rows, setup count, four cells per drop, encoding and no initially full row. The
two exact temporary files were removed; a malformed cleanup-verification
expression emitted a nonterminating PowerShell error after removal, then the
corrected standalone check confirmed both paths absent. No Node process remains.

**Phase-7 levels 11–20 source slice:** exact paths are
`src/game/core/puzzles.ts`, `src/game/core/puzzles.test.ts`,
`src/game/core/puzzleCampaign.test.ts`, `src/game/core/puzzleFlow.test.ts`,
`src/game/core/puzzleSolverResults.test.ts`, `src/ui/localization.ts`,
`docs/workstreams/tetris-t15-puzzle/solve-puzzle-batch.mjs`, and the new
`docs/workstreams/tetris-t15-puzzle/puzzle-levels-11-20.json`. The existing
visible IDs at ordinals 11–20 remain fixed but receive exactly four-row legal
setup histories, explicit `targetRows: 4`, concise bilingual structural names,
unique level seeds and exactly two one-anchor levels. Every level needs two
public-Core completing routes that diverge by the shorter route's fourth lock;
normal tests replay frozen evidence rather than search. Levels 01–10, new 21–50
IDs, persistence, progress/unlock, App/selector, CSS, renderer, other modes and
dependencies remain closed. Candidate generation and Core search run one process
at a time; focused proof is the four direct Core files plus typecheck.

**Levels 11–20 candidate checkpoint (2026-07-30):** source candidate `cdd5e43`
retains the ten visible IDs while replacing their legacy deep boards with legal
four-row setup histories, concise bilingual structural names, and a monotonic
7–14-lock progression. Exactly levels 11 and 16 carry one immutable headroom
anchor each; both anchors sit above the four target rows in a column already
occupied throughout the target band, so they cannot turn a completed target row
into an impossible row. The frozen schema-7 artifact contains 10 levels and 20
public-Core completion routes; every route pair diverges at lock 1 and each
definition uses explicit `targetRows: 4`. Its SHA-256 is
`BCA55D167E9609D06CF642A373A9AB268E71AD2E7B78486DB48A87CB67F8480E`.
Focused verification passes 4 files / 21 tests with one worker, typecheck passes,
`git diff --check` passes, all candidate pools/logs were removed, and the solver
PID exited. Product is frozen for two independent read-only static audits.
Levels 21–50, progress/unlock, App/selector, CSS, renderer, dependencies and other
modes remain closed until both 11–20 audits are resolved.

**Levels 11–20 audit disposition and narrow correction (2026-07-30):** the
curriculum/artifact audit accepts `d14e21e..cdd5e43` with P0–P3/GAP all zero.
The independent rules audit reports P0–P3 all zero and GAP=1: route replay checks
completion and final anchor position, but does not expose a static assertion that
no line-clear event targets an anchor's canonical board row, as required by the
Phase-7 contract. Only `src/game/core/puzzleSolverResults.test.ts` is reopened.
The correction must inspect public `dispatch()` event rows during both frozen
routes and reject an anchor-row clear. It may not change definitions, route
streams, artifact bytes, names, seeds, Core behavior or any later batch. After
the edit, rerun the four focused Core files plus typecheck and return to the same
rejecting reviewer.

**Levels 11–20 anchor-row proof candidate (2026-07-30):** correction `bb0210f`
changes only `puzzleSolverResults.test.ts`. Both frozen routes now inspect every
public `dispatch()` transition and fail if any `lines-cleared.rows` coordinate
equals an authored anchor's canonical board row. Focused proof remains 4 files /
21 tests with one worker; typecheck and diff checks pass. The 11–20 artifact is
unchanged at SHA-256
`BCA55D167E9609D06CF642A373A9AB268E71AD2E7B78486DB48A87CB67F8480E`.
The same rejecting rules reviewer owns the narrow static re-audit; levels 21–50
remain closed until it accepts.

**Levels 11–20 correction acceptance (2026-07-30):** the same rules reviewer
accepts `cdd5e43..bb0210f` with P0–P3/GAP all zero. The correction derives each
canonical anchor row, executes every frozen command through public `dispatch()`,
and rejects any real line-clear event targeting that row while retaining the
existing completion, target-clear, anchor-count and fixed-position assertions.
Definitions, routes and artifact did not change. Levels 11–20 are accepted and
closed.

**Open Phase-7 slice — 21–30 candidate authoring:** execute the existing
`docs/workstreams/tetris-t15-puzzle/search-puzzles.mjs` without modifying it,
using explicit `targetRows: 5`, a bounded seed range, setup counts within 5–15,
an explicit node budget and an explicit `.local` output. Run a small smoke first,
then at most one full candidate-pool process. Directly verify schema, five
contiguous occupied rows, complete four-cell placements, no hidden cells or full
initial row, determinism and resource cleanup. Product definitions, `PuzzleId`,
localization, progress, App/selector, CSS, renderer, routes and artifact remain
closed until the candidate pool is inspected and a separate source contract is
recorded.

**21–30 candidate-authoring checkpoint (2026-07-30):** two identical five-row
smoke runs each produced four candidates in 1,110,822 attempted landings without
budget exhaustion and matched SHA-256
`1D6444FF989A7817A224B0146BBE4AC1634842B28FA40DC5CDFD4052558DFE10`.
The single full pool run used 48 seeds, setup counts 9/10, 384 beam and a
20,000,000-node ceiling; it completed 60 unique boards across 23 setup seeds in
9,357,752 attempted landings without exhaustion. All selected-pool candidates
use ten complete drops, exactly five occupied floor rows, 40 original cells,
empty headroom and no initially full row. Pool SHA-256 is
`5C4E61ADF2117FD1B2E47924B8DC713AE0EA44812E86577919FA66993D46768C`.
Both smoke files and both process logs were removed; PID 2664 exited. The pool
remains only at `.local/puzzle-5row-candidate-pool.json` for source selection.

**Open Phase-7 slice — levels 21–30:** exact paths are
`src/game/core/types.ts`, `src/game/core/puzzles.ts`,
`src/game/core/puzzles.test.ts`, `src/game/core/puzzleCampaign.test.ts`,
`src/game/core/puzzleSolverResults.test.ts`, `src/ui/localization.ts`,
`src/puzzleProgress.ts`, `src/puzzleProgress.test.ts`, `src/App.test.ts`, and
the new `docs/workstreams/tetris-t15-puzzle/puzzle-levels-21-30.json`.
Add stable IDs `tm-puzzle-21` through `tm-puzzle-30`, ten selected five-row
setups, concise bilingual structural names, unique gameplay seeds and exactly
three one-anchor levels. Every anchor remains in visible headroom row 13 or 14
above the five-row target band and over a column already occupied in all five
target rows.
The current roster grouping may become data-length-driven in five-level bands
so the App remains runnable with 30 definitions, but access remains all-open;
the later progress/unlock and selector-adaptation slices remain closed.
Every new level needs two early-diverging public-Core completion routes and one
source-bound schema-7 artifact. Existing 01–20 definitions/artifacts, App source,
CSS, renderer, other modes and dependencies remain frozen. Focused proof covers
definition/campaign/route replay, progress roster and selector count tests plus
typecheck; candidate generation and route search remain single-process.

**21–30 anchor-carrier correction (2026-07-30):** the initial ten-drop source
selection passes 5 definition/progress/App files and 62 tests, but route probes
reject every attempted dense anchor carrier at the frozen 24-lock, 600/480-beam
bound. An unanchored copy of the same level completes in 11/15 locks, proving the
failure belongs to the anchor/40-cell combination rather than the base board.
Do not increase search bounds or weaken the three-anchor contract. Reopen only
the unchanged authoring tool for one bounded nine-drop, five-row anchor-specific
pool under `.local`; retain the ten-drop pool for ordinary levels. Replace the
three provisional anchor packages with sparse edge-column candidates and require
each to pass an individual public-Core route probe before the full batch resumes.
No committed source exists yet; all product paths remain within the already-open
21–30 slice.

**21–30 sparse anchor follow-up (2026-07-30):** the bounded nine-drop pool
completed 30 unique candidates across 9 setup seeds in 2,167,578 attempted
landings without exhaustion; SHA-256 is
`1CEDE040361A2B8CE9AE30A9AF5570C21EB68A2680EFE61A05ABE947AEA5F073`.
Direct legality assertions pass. However, the first selected nine-drop edge
anchor still has no route at the frozen bound, while removing only its anchor
completes the exact board/seed in 19/22 locks with lock-4 divergence. This again
isolates density plus anchor as the failure. Open one final bounded eight-drop,
five-row anchor pool. The three anchor levels may use 32 original cells; the
remaining seven levels retain ten-drop boards. Do not increase route bounds.

**21–30 final anchor-density correction (2026-07-30):** the bounded eight-drop
pool completed 30 unique candidates across the configured seed range in
1,845,658 attempted landings without exhaustion; SHA-256 is
`D1DE0E076538B67A4F3DEDE928035B06F2ACB2698D8CDCF8249A548AF785931B`.
All candidates pass direct eight-placement, 32-cell, five-floor-row, empty-headroom
and no-full-row assertions. Three distinct packages with an already-full target
column were probed individually, but each still has no primary route at the
unchanged 24-lock, 600/480-beam bound. Do not accept them, increase the route
budget, or reduce the three-anchor quota. Reopen the unchanged authoring tool for
one bounded seven-drop/five-row carrier pool. The intended batch mix becomes
seven ten-drop ordinary levels plus three seven-drop one-anchor levels; each
selected carrier must pass its individual two-route probe before the batch solver
resumes.

**Levels 21–30 source candidate (2026-07-30):** candidate `0faf9e7` appends
IDs `tm-puzzle-21` through `tm-puzzle-30` without changing the first twenty
definitions or selector composition. The final source uses seven ten-drop ordinary
boards and three seven-drop one-anchor boards. Its ten shorter-route lock counts are
`9,10,11,11,11,12,13,13,14,17`; every alternate route diverges at lock 1–3.
The source-bound schema-7 artifact contains 10 levels / 20 public-Core routes and
has SHA-256
`FF5849E87C2B1EB18F77F24A8D36C958350C2E950A02000E51C74992B1D01360`.
Focused proof is 6 files / 64 tests plus typecheck. Every artifact route finishes
through public `dispatch()`, exhausts the original targets, retains its authored
anchor, and rejects any line-clear event on an anchor's canonical row. All
candidate pools, probes, solver logs and owned solver PIDs were released after
artifact generation. Independent QA is now open read-only against candidate
`0faf9e7`; levels 31–40 remain closed until that disposition is recorded.

**Levels 21–30 accepted (2026-07-30):** two independent read-only reviews accept
candidate `0faf9e7` at record tip `49fc642` with P0–P3 all zero and GAP=0.
The route review independently confirms the 10-level/20-route schema, frozen
24/600/480 search bound, seven-ten/three-seven setup mix, legal five-row boards,
unique seeds/boards, lock-1–3 divergence, source binding, public-Core terminal
replay, fixed anchors and explicit rejection of anchor-row clears. The curriculum
review independently confirms the first twenty definitions/artifacts are unchanged,
the measured within-batch order is nondecreasing, three anchors are distributed
across left/right headroom, v4 remains a frozen twenty-ID domain, all 30 current
levels remain open during transition, five-level bands are data-driven, and neither
`src/App.tsx` nor `src/styles.css` changed. Levels 21–30 are **ACCEPTED / CLOSED**.
After this acceptance checkpoint is pushed, the coordinator may open only the
bounded levels 31–40 authoring contract.

**Open Phase-7 slice — levels 31–40 candidate authoring (2026-07-30):**
accepted/pushed base is `fc23cfb`. Use the unchanged
`docs/workstreams/tetris-t15-puzzle/search-puzzles.mjs` in explicit, short-lived
processes to build separate six-row ordinary and sparse-anchor pools under
`.local`. Run one small deterministic smoke before either full pool. Ordinary
candidates may use 11/12 legal zero-clear drops. The completed 7/8-drop anchor
search processed 40 seeds and 5,731,628 landings without budget exhaustion but
found no legal six-row board; its diagnostic SHA-256 is
`EF5109E0140F8951C77CF2F25118A0E7983A25CDB6716D2DA75A4EBE96B8666D`.
Reopen only the anchor pool once at 9/10 setup drops.
Directly reject hidden cells, initial clears/full rows, noncontiguous target bands,
duplicate boards/seeds and any anchor column whose six target cells are not already
occupied. Candidate pools are execution evidence only and must be removed after
selection.

After the pools are inspected, a separate source checkpoint may open only
`src/game/core/types.ts`, `src/game/core/puzzles.ts`,
`src/game/core/puzzles.test.ts`, `src/game/core/puzzleCampaign.test.ts`,
`src/game/core/puzzleSolverResults.test.ts`, `src/ui/localization.ts`,
`src/puzzleProgress.ts`, `src/puzzleProgress.test.ts`, `src/App.test.ts`, and
`docs/workstreams/tetris-t15-puzzle/puzzle-levels-31-40.json`. It must append
IDs `tm-puzzle-31` through `tm-puzzle-40`, ten unique six-row boards, concise
bilingual structural names and exactly three one-anchor levels. Each final level
requires two public-Core routes at max 30 locks / 600 primary beam / 480 alternate
beam, with first divergence no later than lock four. Order complete
board/setup/seed/anchor/name packages from replay evidence and human-readable
structural lessons; do not sort by lock count alone. Definitions/artifacts 01–30,
gradual unlock/v5 migration, App source, selector/CSS, renderer, dependencies,
later levels and other modes remain closed.

**Levels 31–40 pool completion and source opening (2026-07-30):** the 9/10-drop
anchor retry completed 50 unique six-row boards across 16 setup seeds in
9,413,436 attempted landings without exhaustion; every selected-pool candidate
uses 10 drops, and 37 candidates contain at least one column occupied in all six
target rows. Pool SHA-256 is
`B70A8204D320FB671A575EA6B640D37D4F2D619AA183651DFC4E872A692CCACC`.
Direct setup/headroom/full-row/board-key assertions pass. The already-recorded
ordinary pool remains valid at SHA-256
`95352981F972D305D9435E1B1B2089B9DF37B687DEFBD1DFF0FAF99862211CEF`.
Open the ten exact source/test/artifact paths listed above. Provisional selection
uses seven ordinary candidates from seven setup seeds and anchor candidates 1,
12 and 31, whose safe full columns cover right, left and center-right positions.
Each anchor package must pass an individual route probe before any full-batch
solver run; replace a failing package instead of enlarging 30/600/480. App source,
styles, unlock/v5 and levels 41–50 remain closed.

**Levels 31–40 sparse-anchor route correction (2026-07-30):** all three
provisional ten-drop anchor packages fail the fixed 30-lock / 600-beam primary
probe. Removing only the anchor from candidate 1 completes in 16/17 locks, and a
twenty-position headroom scan finds no anchored route for that carrier; reject the
ten-drop anchor shortlist rather than enlarging the search bound. Two bounded
nine-drop-only pools retain 16 and 20 legal six-row candidates without node-budget
exhaustion. Their SHA-256 values are
`17874E9DB3CCDD5A387C85B1098EA1C957610D80E6B4C497577C25B3E08316CE`
and
`94E671E23F1465771436457C07B5849D0609699900A82D22F85AF7C2C2D6A676`.

The replacement shortlist contains three unique board/setup/gameplay-seed
packages and keeps the full anchor quota: pool A candidate 5 uses setup seed
`2236068021`, the duplicate-free level seed `358294691`, and `{x:0,y:13}` with
provisional 8/10-lock routes diverging at lock 1; pool A candidate 7 uses equivalent legal
setup seed `213511`, level seed `197830471`, and `{x:9,y:13}` with 9/9-lock
routes diverging at lock 3; pool B candidate 13 uses setup seed `3236068023`,
level seed `41326521`, and `{x:9,y:13}` with 9/12-lock routes diverging at
lock 1. Seeds `213511` and `2236068021` produce the same required first-nine
seven-bag sequence `JILOTZSIO`, so the second history retains the exact legal
board while keeping setup provenance numerically distinct. The initially probed
candidate-5 gameplay seed `3141592653` was rejected because level 04 already owns
it; the bounded replacement-seed sweep found `358294691` on its second serial
attempt without changing the carrier. These injected-state probes only authorize
replacing the three source packages. Each package still requires the official
registered-definition batch solver, alternate-route replay, anchor-row rejection,
and final artifact before acceptance.

Registered ordinary level 33 is also rejected: the official runner finds a
completing pair only after its first canonical landing divergence at lock 10,
outside the unchanged lock-four contract. Replace its complete setup package
with ordinary-pool candidate 5 (`setupSeed: 1732050833`) while retaining the
level's unique gameplay seed. The replacement passes the registered
30/600/480 proof with 21/24-lock routes diverging at lock 1. It may enter the
ten-level batch artifact; do not restore the rejected carrier or expand the
search domain.

**Levels 31–40 measured curriculum order (2026-07-30):** all ten retained
complete packages now pass individual registered-definition proof. Their
primary/alternate locks in source-selection order are `11/13`, `8/10`,
`21/24`, `19/23`, `18/18`, `9/9`, `19/21`, `15/18`, `9/12` and `16/17`;
first divergence is lock 1–3 for every pair. Reorder packages, never individual
fields, into `曲井 / 左闸 / 错桥 / 阶井 / 悬台 / 右闸 / 双廊 / 回井 / 边塔 /
折桥`. This yields ordinary shorter-route progression `11,15,16,18,19,19,21`
and leaves the three lower-cell-count anchor lessons at 32, 36 and 39. The
batch deliberately does not sort anchors ahead of all ordinary boards merely
because nine setup drops produce shorter routes. The final full-batch artifact
must prove the reordered registered IDs without reusing the individual
selection artifacts.

**Levels 31–40 full-batch route artifact (2026-07-30):** the one permitted
registered solver run verifies all ten reordered IDs and twenty routes at the
fixed 30/600/480 bounds. Route locks are
`11/13, 8/10, 15/18, 16/17, 18/18, 9/9, 19/23, 19/21, 9/12, 21/24`;
first divergences are `2,1,1,1,1,3,3,1,1,1`. Setup counts are
`12,9,12,12,12,9,12,12,9,12`, with the three anchors exactly at 32, 36 and
39. Artifact SHA-256 is
`BBA6FB898DD49F59AB3B26F21011C4A73647B67120F9A6BE0ED8E0CF76EFCB3D`.
The solver exited and wrote no partial helper into tracked paths. Normal tests
must now import this fourth batch, replay all forty route pairs, assert the
batch-specific setup mix and preserve the documented anchor-checkpoint ordering
instead of imposing a false all-level lock-count sort.

**Levels 31–40 source candidate (2026-07-30):** product checkpoint `23970c6`
over bounded source-opening base `4f864af` appends IDs 31–40, ten six-row
definitions, bilingual structural names and the source-bound batch-4 artifact.
The final package order is `曲井 / 左闸 / 错桥 / 阶井 / 悬台 / 右闸 / 双廊 /
回井 / 边塔 / 折桥`; anchors remain only at 32, 36 and 39. The six focused
files pass 64/64 with one worker, typecheck passes, diff checks pass, and the
artifact retains SHA-256
`BBA6FB898DD49F59AB3B26F21011C4A73647B67120F9A6BE0ED8E0CF76EFCB3D`.
No full suite, build or browser ran because this ten-level data checkpoint is
still inside the Phase-7 staged source chain. Product is frozen for one
independent route/artifact audit and one independent curriculum/boundary audit;
levels 41–50 and unlock/selector adaptation remain closed.

**Levels 31–40 acceptance (2026-07-30):** independent route/artifact QA and
independent curriculum/boundary QA both accept `23970c6` with
`P0=0, P1=0, P2=0, P3=0, GAP=0`. The audits independently confirm the ten
registered six-row definitions, twenty distinct public-Core routes, fixed
30/600/480 bounds, anchors only at 32/36/39, unchanged 01–30 definitions and
artifacts, exact bilingual package order, transitional all-open behavior and
artifact SHA-256
`BBA6FB898DD49F59AB3B26F21011C4A73647B67120F9A6BE0ED8E0CF76EFCB3D`.
Both reviews were deliberately static and executed no product command; this is
not a verification gap because the frozen source checkpoint already passed its
focused 64-test replay gate and typecheck. Checkpoint `23970c6` and record tip
`4674061` are accepted. After this disposition is committed and pushed,
levels 41–50 may open as a separate bounded slice; unlock/v5/selector
data-scroll adaptation remains closed until all fifty definitions are accepted.

**Open Phase-7 slice — levels 41–50 candidate authoring (2026-07-30):**
accepted and pushed base `d8573e3`. The only execution tool opened by this
checkpoint is
`docs/workstreams/tetris-t15-puzzle/search-puzzles.mjs`; candidate JSON, stdout
and stderr remain ignored temporary files. Generate seven contiguous target rows
through legal zero-clear setup histories in two independent pools:

- ordinary pool: setup counts 14/15, from which six complete packages are
  retained;
- sparse-anchor pool: authoring probes setup counts 11/12/13, from which four
  one-anchor packages are retained.

Each retained anchor must occupy visible row 12, immediately above the seven-row
target band, on an outer or near-outer column that is occupied in all seven
target rows. Do not use two anchors, add an anchor after solving an ordinary
board, accept an initially full row, or relax the fixed target band. Every
retained definition later needs two public-Core routes with canonical landing
divergence by lock four at max 36 locks / 720 primary beam / 560 alternate beam.
These are fixed batch ceilings, not an invitation to raise one failed level's
budget.

Execution begins with two identical small 13-drop smoke runs and direct
schema/row/cell/full-row/hash comparison. Only after matching output may one
bounded ordinary pool and one bounded sparse-anchor pool run, sequentially,
with an explicit output path and no listener. A pool may use no more than 24
setup seeds, 100 retained candidates or 50,000,000 attempted landings. Inspect
candidate topology and support columns before opening source. Product
definitions/tests/artifact, IDs 41–50, localization, progress/unlock/v5, App,
selector/CSS, renderer, dependencies and other modes remain closed until a
candidate-pool checkpoint records exact hashes and a bounded source-opening
path list.

**Levels 41–50 candidate-pool checkpoint and source opening (2026-07-30):**
both identical 13-drop smoke runs completed four candidates in 98,570 attempted
landings and matched SHA-256
`33C481CE9299B4D0DBC1704A01A660D0B0FCB0DADA93970AA228DE465CFAB5B0`.
Direct assertions pass schema, legal-hard-drop/zero-clear claims, exact seven
contiguous floor rows, 52 cells, empty headroom, no full row and unique boards.

The ordinary pool completed 80 unique candidates across 24 seeds in 7,871,052
attempted landings without exhaustion; 78 use 14 drops and two use 15. Its
SHA-256 is
`932B849801F2DBFDAB6CB381023D24AB78D253B543F165EB4AE4CF88D37D0BC9`.
The sparse-anchor pool completed 80 unique candidates across 24 seeds in
9,454,272 attempted landings without exhaustion; no 11-drop history could form
seven legal rows, while 18 candidates use 12 drops and 62 use 13. Forty-two
candidates have at least one outer or near-outer column occupied throughout all
seven target rows. Its SHA-256 is
`EABC3BA7858C07517668EDDE9266F9A20FB8A020EE972CFDAB6C3555B112D67E`.
Retained anchor carriers are therefore tightened to 12/13 drops; target height,
four-anchor quota and route bounds do not change.

Provisional complete-package mapping distributes anchors and topology before
route measurement:

- 41 ordinary position 71; 42 anchor position 39 at `x=1`;
- 43 ordinary position 55; 44 ordinary position 59;
- 45 anchor position 23 at `x=8`; 46 ordinary position 22;
- 47 anchor position 45 at `x=0`; 48 ordinary position 38;
- 49 anchor position 77 at `x=9`; 50 ordinary position 74.

The coordinator is the single source writer. Open only
`src/game/core/types.ts`, `src/game/core/puzzles.ts`,
`src/game/core/puzzles.test.ts`, `src/game/core/puzzleCampaign.test.ts`,
`src/game/core/puzzleSolverResults.test.ts`, `src/ui/localization.ts`,
`src/puzzleProgress.test.ts`, `src/App.test.ts`, and
`docs/workstreams/tetris-t15-puzzle/puzzle-levels-41-50.json`.
Register the ten packages with unique deterministic gameplay seeds and
provisional structural names, pass focused structural proof, then probe the
four anchors individually at 36/720/560 before any full batch. Definitions and
artifacts 01–40, unlock/v5 source, App source, selector/CSS, renderer,
dependencies and other modes remain closed.

**Levels 41–50 sparse-anchor correction (2026-07-30):** all four registered
provisional anchor packages fail to produce a primary route at the fixed
36/720/560 bound: pool positions 39/23/45/77 at IDs 42/45/47/49. Two further
read-only injected probes of 12-drop positions 46 and 57, using explicit
deterministic gameplay seeds, also fail at the same bound. These are candidate
rejections, not evidence for expanding the route domain.

Reopen only one dedicated 11-drop authoring pool with target rows 7, at most
64 seeds, beam 512, 60 retained candidates and a 30,000,000 landing budget.
It runs once, alone, with an explicit ignored output and the same direct setup
invariants. If it produces candidates, filter outer/near-outer seven-row
support columns before any route probe. Ordinary packages, four-anchor quota,
anchor `y=12`, route bounds and every accepted 01–40 definition remain fixed.
Do not run another 12/13 pool.

Current source WIP is intentionally uncommitted on the seven open product/test
paths. It registers all ten provisional packages and passes five focused files,
62/62 tests, plus typecheck. No batch-5 artifact or route-test binding exists
yet. Keep this green WIP isolated while the 11-drop pool is evaluated; replace
failed packages atomically before a source checkpoint.

**Levels 41–50 anchor-topology correction (2026-07-30):** the dedicated
11-drop pass produced 34 valid unique seven-row boards in 9,940,012 attempted
landings without node-budget exhaustion. Its SHA-256 is
`B28DEF0F2A88C07CEAD22B28B316F5D50B50BFAEF0974FD5B9BA9BFCA98D0024`;
15 candidates contain an outer or near-outer column occupied through the full
target band. Candidate 6 without an anchor completes through the public Core in
14/14 locks with divergence at lock 2. Adding the full-support `x=1,y=12`
anchor under gameplay seed `746220617` retains one 14-lock primary route but no
route diverging by lock four. Two further fixed-width gameplay seeds find no
primary route, while a serial 300/240 prefix check across all 15 full-support
carriers finds no complete route pair. All probes ran one at a time at Idle
priority on one processor affinity and exited before the next began.

The full-seven-row support requirement is therefore withdrawn as a self-imposed
constraint that is stricter than the player's requested rule. Preserve the four
one-anchor quota, dedicated 11-drop carriers, anchor row 12, outer/near-outer
columns and fixed 36/720/560 route ceiling, but permit an otherwise empty
headroom column. The anchor must remain outside all initial target rows, overlap
no setup cell, avoid an initially full row and hidden spawn blocking, survive
both route replays, and measurably alter at least one legal landing or
post-clear state relative to the same carrier without the anchor.

Open one bounded, serial topology screen over at most 12
candidate/anchor/gameplay-seed triples. Use a 300/240 beam prefix only to find
strong candidates, then revalidate every hit at the fixed 720/560 ceiling.
Exactly one controlled Node process may run at a time; no agent, listener,
server or second pool may overlap. If four complete packages are not found,
stop and record the evidence instead of widening the batch silently. Product
source remains unchanged until all four replacements have replay evidence.

**Levels 41–50 bounded topology-screen result (2026-07-30):** the complete
12-triple screen produced no route pair. Candidate 6 with anchor positions
`x=0` and `x=8` under seed `746220617` has no primary route. Candidates
8/9/30/31 at the opposite outer or near-outer position also have no primary
route under that seed. Keeping candidate 6 at `x=1,y=12` and varying the first
two bags through seeds `1786354125`, `3438853325`, `197830471` and
`3709961825` produces no primary route; seed `2076461737` produces a primary
route but no alternate diverging by lock four. Moving that sequence to
candidate 8 again produces no primary route. Together with the earlier
`746220617` result, candidate 6 has two valid primary sequences but no accepted
early-diverging pair. Every probe ran serially at Idle priority with affinity
to one processor and exited; no solver, agent or server remains open.

Do not open another carrier or seed screen. Before changing the four-anchor
quota, carrier size, row, or fixed beam ceiling, run one diagnostic only:
retain candidate 6, `x=1,y=12`, seed `746220617`, the 36-lock limit and a
300/240 beam prefix, but inspect canonical exclusions through lock 8 rather
than stopping at lock 4. This is not acceptance evidence; it determines
whether the current failure is an impossible second route or a deliberately
forced opening followed by a later meaningful branch. If no alternate exists
by lock 8, stop for a new curriculum decision. If one exists, record its
measured divergence before considering a final-tier-only divergence rule.

**Levels 41–50 delayed-branch diagnosis and carrier decision (2026-07-30):**
candidate 6 under seed `746220617` still has no alternate route when canonical
exclusions are extended through lock 8 at the unchanged 36-lock and 300/240
prefix bounds. The single diagnostic exited normally and left no controlled
Node process. The 11-drop carrier is therefore rejected; do not weaken the
two-route requirement, divergence-by-lock-four rule, four-anchor quota, anchor
row or 720/560 acceptance ceiling.

Open one final sparse-carrier authoring correction at exactly 10 legal,
zero-clear setup drops and seven contiguous floor target rows. Use the existing
tracked generator only. First run two identical two-candidate, four-seed smoke
checks and require byte-identical normalized output plus the existing direct
schema/row/cell/full-row assertions. Only then run one serial pool with at most
64 setup seeds, beam 512, 40 retained candidates and a 20,000,000 attempted
landing budget. Every run uses an explicit ignored output path, Idle priority,
one processor affinity, no listener and no overlapping Node or agent.

If the pool yields legal boards, inspect outer/near-outer row-12 placements and
open a separately documented bounded route screen; do not silently reuse the
exhausted 11-drop probes. If it yields no legal candidates, stop and reconsider
the final-batch anchor quota rather than opening a ninth generator/search
variant. Ordinary packages and the current green source WIP remain unchanged.

**Levels 41–50 final anchor disposition (2026-07-30):** two identical 10-drop
smokes from seed start `4400001` each processed four seeds, attempted 143,604
landings, exhausted no budget and produced zero candidate. Their byte-identical
SHA-256 is
`0DF6E4F9BD74579D692793B750D48447008D97028622EBC6198E07495A2F6F35`.
A second identical pair from the evidence-led seed start `4301034` each
attempted 143,482 landings with the same zero-candidate/no-exhaustion result;
its byte-identical SHA-256 is
`85D2FCDB8990A233CD22B79084A52C06F1F49A2D8D3FAB355BCA2CCD9898D3DA`.
No formal 10-drop pool is authorized or run. All four smoke processes executed
serially at Idle priority with one-processor affinity and exited.

Close final-tier anchor authoring. Levels 01–40 already distribute nine sparse
immutable-anchor lessons across four different difficulty bands, so the user's
requirement is preserved without concentrating anchors in the last levels.
Levels 41–50 now retain ten ordinary 14/15-drop packages from the accepted
ordinary pool and prioritize two readable routes per level. This is a measured
curriculum correction: do not loosen route divergence, fixed search bounds,
Core replay, deterministic sequences or target depth to keep four additional
anchors.

Open only the already authorized seven product/test paths plus the batch-5
artifact. Replace provisional anchor packages 42/45/47/49 atomically with four
additional ordinary-pool packages; retain ten unique setup boards and gameplay
seeds. Probe each registered definition at 36/720/560, then order complete
packages by route metrics and structural lesson. Definitions/artifacts 01–40,
unlock/v5 source, App source, selector/CSS, renderer, dependencies and other
modes remain closed.

**Levels 41–50 registered-definition proof (2026-07-30):** all ten retained
ordinary packages complete twice through public Core commands at the unchanged
36-lock / 720-primary / 560-alternate bounds. In final curriculum order they are
`横沟 / Cross Trench` (`16/16`, divergence lock 3), `中阶 / Center Steps`
(`17/20`, 1), `分廊 / Split Gallery` (`17/20`, 1), `双塔 / Twin Towers`
(`19/21`, 1), `斜廊 / Sloped Gallery` (`22/26`, 2), `边井 / Edge Well`
(`23/24`, 2), `深槽 / Deep Channel` (`27/23`, 1), `断槽 / Broken Channel`
(`24/24`, 1), `叠井 / Layered Well` (`25/25`, 1), and `岔口 / Forked
Passage` (`25/29`, 1). Complete setup history, gameplay seed and bilingual
name move together; no route is rebound to another package. `深槽` uses the
single retained 15-drop setup and all other packages use 14 drops. All ten
definitions have seven target rows and no anchor.

The final reordered source passes the focused structural matrix
(`puzzles`, `puzzleCampaign`, `puzzleFlow`, `puzzleProgress`, and `App`:
5 files / 62 tests) with one worker, followed by typecheck. Authorize exactly
one formal batch-5 solver run against the registered order and write only
`docs/workstreams/tetris-t15-puzzle/puzzle-levels-41-50.json`. The run must
retain the fixed 36/720/560 bounds and must exit before the normal replay test
is bound to the artifact; no second solver, agent, listener, server or browser
may overlap.

**Levels 41–50 frozen candidate (2026-07-30):** the single formal solver PID
`17764` ran at Idle priority with one-processor affinity, verified all twenty
routes in registered order, wrote the batch-5 artifact and exited. No other
solver, agent, browser, server or listener overlapped. The artifact SHA-256 is
`3EC1720BCD9101CD7392CAB1303F89F5857840476C000E030E3169E29E646AB3`.
Normal source-bound tests now bind its exact campaign order, 36/720/560
bounds, zero anchors, setup counts
`14,14,14,14,14,14,15,14,14,14`, measured route pairs and all public-Core
replays. The final focused gate passes 6 files / 64 tests with one worker,
followed by typecheck. Historic artifacts 01–40 retain their accepted blob
IDs, and the source diff only appends the 41–50 definitions, IDs, names and
test expectations.

Candidate `7cd4a1d` is frozen from accepted base `d8573e3`; unlock/v5 source,
App source, selector/CSS, renderer, dependencies and other modes remain
unchanged. Independent route/artifact QA and curriculum/boundary QA both
accept this exact candidate with `P0=0, P1=0, P2=0, P3=0, GAP=0`. They
independently confirm all twenty command streams are distinct, current
definitions and artifact packages are bound through normal public-Core replay,
01–40 definitions/artifacts are frozen, and the seven-row lesson order is not
a blind lock-count sort. Levels 41–50 are accepted; after this acceptance
record is pushed, open unlock/v5 and selector data/scroll adaptation as a new
bounded slice.

**Authoritative current execution state (2026-07-30):** Phase 5 product
`ee2aac542529c116c915c38e0603584a7099b5e8`, final gates `6d9fc6a`, browser
evidence `9fa98a2` / `013120a`, and acceptance `321ebc6` are pushed through recovery
tip `4f871ac3706f95c2a57679dd0162071c89363ecb`. Phase 6 is
**ACCEPTED / PUSHED / CLOSED** at acceptance point
`d0b7406a771c3c4e19f7f9d24b5f04806e1ed518`, with pushed documentation tip
`d78e0e580ceb9375afb57fc8c4230624e4a54a77`. Its accepted product scope is the
shared ordinary-clear presentation and Classic feedback in:

- `src/game/render/presentation.ts`;
- `src/game/render/presentation.test.ts`;
- `src/game/render/TetrisRenderer.ts`;
- `src/game/render/TetrisRenderer.test.ts`.

That slice may replace the old broad sweep with the frozen three-part visual grammar:
a row-local narrow confirmation light, cell-local inward contraction/dissolve, and
restrained deterministic debris/afterglow. One through four rows use the same grammar
with bounded intensity. Reduced motion keeps a stationary row-local confirmation and
quick opacity endpoint. Core timing, scoring, board state, input, mode UI, Mutation
bomb/Collapse effects, Puzzle definitions, and the Puzzle selector remain frozen.
After this source checkpoint is green, a separate baseline audit decides whether
landing/combo/top-out or Classic terminology need another exact-path slice; they may
not be silently bundled into the ordinary-clear commit.

**Phase-6 baseline audit disposition (2026-07-29):** the ordinary-clear source is
frozen at `1a163ff3fed7cdf1cb6af6c12f92f291e0593006` and its documentation record at
`1ba6c26fc48ec691dd9ea4902654763074cd2fdb`. Classic terminology and metric roles
already satisfy the contract (`分数 / 消行 / 连消 / 下落速度/格` with explicit
`data-stat-role` coverage), so React, localization, and CSS remain closed. The
Renderer audit found one real feedback gap: `impact` is written for hard drop,
line-clear, Survival stone, Mutation, and level events but is only decayed and never
used by drawing or geometry. Phase 6 therefore opens a second, independent source
checkpoint in exactly:

- `src/game/render/TetrisRenderer.ts`;
- `src/game/render/TetrisRenderer.test.ts`.

That checkpoint adds Classic-only board-local cues for ordinary landing, consecutive
clear, each crossed ten-line speed boundary, and top-out. It may use a bounded
renderer-owned cue list so simultaneous combo and speed feedback cannot overwrite one
another. It may not wire the dormant global `impact` value into camera movement,
change the accepted ordinary-clear sequence, add text or DOM, or modify Core, UI/CSS,
audio, Survival, Mutation, Puzzle, random generation, scoring, timing, records, or
input. Reduced motion retains stationary local strokes with quick fade. After this
two-file checkpoint is green, Phase-6 source freezes and the final gates/evidence
chain begins.

**Phase-6 source freeze (2026-07-30):** the Classic feedback contract is
`fee0627`; primary source is `a1f3d1b` and the visually driven landing correction is
`eaed1ac`. The exact product candidate is therefore `eaed1ac` over Phase-6 base
`4f871ac`. Direct Renderer tests pass 29/29 and typecheck passes after the final source
edit. Disposable Pixi captures show distinct landing, coexisting combo plus ten-line
speed feedback, top-out, and reduced-motion frames; the first landing frame was
rejected as too close to the floor edge, then corrected with an in-cell contact glow,
bright core, and outward support marks before source freeze. No product path may now
reopen without a documented QA finding. The next chain is one final source-bound
typecheck, one full one-worker suite, one production build, managed browser evidence,
serial independent rules/visual audits, corrections if required, acceptance, cleanup,
and non-force push.

**Phase-6 final gates and evidence boundary (2026-07-30):** the frozen product tree
still matches `eaed1ac`. Final source-bound gates are committed and indexed through
`50e3693`: typecheck PASS, full one-worker suite PASS (26 files / 231 tests), and
production build PASS (753 modules, with only the existing non-fatal chunk-size
warning). The LF-normalised raw logs and their SHA-256 index live only under
`docs/qa/evidence/t15-phase6/`; no gate rerun is allowed unless product source changes.
The next and only writer is the bounded evidence harness
`docs/qa/evidence/t15-phase6/capture_phase6.py`, plus this phase's evidence records.
It may run one managed strict-port Vite/Chrome tree, must publish from an isolated
partial directory only after all assertions pass, and must release port 4178 and its
owned browser tree. Existing public-command Puzzle routes provide real 1/2/3-row
ordinary-clear witnesses; the absent four-row route is labelled and captured only as
an isolated real-Renderer contract frame. Product source, Puzzle data/selector, and
all gameplay rules remain closed.

**Phase-6 evidence freeze (2026-07-30):** the corrected fail-closed harness is
`1b9c85f`; original PNG/Vite logs are `a231fda`; the source-bound manifest and nineteen
recomputed SHA-256 entries are `d7fb4fa`. The final run publishes fifteen inspected
frames with zero console/page errors. Public runtime/Core evidence covers real
1/2/3-row ordinary clears, one-row confirmation/contraction/afterglow, safe next
active piece, the two-piece Puzzle Next rail, Classic landing, and desktop/portrait/
short-landscape layouts. An exhaustive replay confirms no current verified route
clears four rows at once, so four-row and non-reachable combo+speed/top-out states are
explicitly isolated real-Renderer contract frames; reduced-motion endpoints use the
same renderer path. Restart preserves the single Canvas and listener/audio counts;
two mount/unmount cycles and Puzzle exit restore the exact home listener set, zero
Canvas, and zero open AudioContexts. The managed Vite PID and listener 4178 are
released and the controlled Chrome is closed. Product and evidence are now frozen;
only serial independent rules, visual, and evidence-integrity QA may run before an
acceptance or correction decision.

**Phase-6 first rules-QA disposition (2026-07-30):** independent rules QA rejects
`eaed1ac` with one P2 and no other P0/P1/P3/GAP. The landing cue currently removes
piece-internal lower cells but does not require each remaining bottom edge to touch
the floor or an already locked board cell. A supported overhang can therefore paint
contact marks beneath its airborne cells. Visual and evidence QA remain closed. Only
`src/game/render/TetrisRenderer.ts` and
`src/game/render/TetrisRenderer.test.ts` reopen: filter and freeze landing cue cells
against the canonical post-lock board at the `piece-locked` event, and add an
overhang/single-support regression. No other cue, ordinary-clear path, Core/UI/audio,
mode, Puzzle, or evidence behavior may change. After focused green checks, the product
candidate, final gates, and all source-bound browser evidence must be regenerated.

**Phase-6 correction source (2026-07-30):** `9085976` filters the Classic landing
snapshot at `piece-locked` time against the canonical post-lock board. Only a cell
whose lower external edge touches the floor or an already locked board cell enters
the bounded cue queue. The direct Renderer suite passes 30/30, including a horizontal
I piece with one true support and three airborne overhang cells, and typecheck passes.
Product source is frozen again. The next permitted work is a fresh final typecheck,
one-worker full suite, build, and complete source-bound browser evidence regeneration;
rules QA must then be repeated before visual or evidence-integrity QA opens.

**Phase-6 corrected evidence freeze (2026-07-30):** final typecheck, the 26-file /
232-test one-worker suite, and the 753-module build pass for `9085976`; gate raw,
normalization, and index commits are `2c9fd50`, `0239231`, and `bee956a`. Browser
harness `4a7f95f` regenerated all fifteen frames and nineteen hashes; changed raw
artifacts are `9f90ced` and manifest/checksums are `ca80416`. Original-detail review
passes 1/2/3-row runtime clears, the honestly isolated 4-row Renderer contract,
one-row confirmation/contraction/afterglow, safe next frame, reduced motion, Classic
landing/combo+speed/top-out, desktop/portrait/short-landscape, and lifecycle. The run
reports zero browser errors, one Canvas, zero DOM cells, restored listeners, zero open
AudioContexts, closed Chrome, and released port 4178. Product and evidence are frozen.
Only repeated independent rules QA may run next; visual and evidence-integrity QA
remain closed until it accepts.

**Resource-containment hold (2026-07-30):** the attempted repeated rules-QA agent was
interrupted before a verdict after accumulated task support reached 42 Node processes,
7 `node_repl` processes, and 5 Serena servers plus language-server descendants. This
violated the serialized resource contract even though only one QA agent was active.
Command-line and parent-tree inspection, without WMI/CIM, identified stale Codex MCP,
`node_repl`, Serena/TypeScript, and an old `personal-web` Astro dev tree. Cleanup leaves
only the primary task's two MCP Node processes, zero `node_repl`, zero Serena/Serena
Python processes, zero Astro dev process, and zero listener on 4178. The aborted QA has
no verdict and cannot advance Phase 6. Do not spawn another sub-agent in this task.
Product, gates, and browser evidence remain frozen; resume only through a deliberately
low-overhead independent-review mechanism after an explicit resource admission check.

**Post-restart resource drift and static packet (2026-07-30):** a lightweight
continuation preflight found that the Codex tool session had automatically added a
second MCP server/stdin Node pair plus one `node_repl` to the retained primary pair.
Native process command-line and parent inspection proved all five processes were
direct children of the same Codex host. After that first exact-PID cleanup, the tool
host auto-backfilled another MCP pair, `node_repl`, and a Serena tree whose TypeScript
children incorrectly targeted stale `personal-web` paths. No file in that repository
was read. The complete auto-started tool cohort and the older idle MCP pair were then
scheduled for one final tree cleanup, leaving zero resident Node, `node_repl`, Serena,
or TypeScript-language-server process and zero listener on 4178. No WMI/CIM, test,
build, browser, server, or product command ran. The read-only packet at
`docs/workstreams/tetris-t15-classic/PHASE6_REPEAT_RULES_REVIEW.md` binds the corrected
candidate, mandatory rule questions, hashes, verdict schema, and zero-helper boundary.
Coordinator static/hash preflight is explicitly not independent QA; Phase 6 remains
frozen and unaccepted.

**Zero-runtime follow-up review packets (2026-07-30):** visual and evidence-integrity
checklists are prepared at
`docs/workstreams/tetris-t15-classic/PHASE6_VISUAL_REVIEW.md` and
`docs/workstreams/tetris-t15-classic/PHASE6_EVIDENCE_REVIEW.md`. They bind all fifteen
frames, required original-detail questions, candidate/hash/provenance checks,
responsive and reduced-motion coverage, lifecycle closure, severity schemas, and
strict review ordering. Preparation is documentation only: visual QA remains closed
until repeated rules QA accepts, and evidence-integrity QA remains closed until both
rules and visual QA accept. Neither packet is a verdict or permission to rerun gates,
browser capture, or product code.

**Dynamic resource admission and repeated rules QA (2026-07-30):** the player's newer
machine-wide resource memory supersedes the earlier temporary zero-helper hold. In the
green state (sustained CPU below 70%, at least 12 GB available RAM, and disk queue below
1.0), this project may use up to four concurrent sub-agents, with no more than two
editing or running heavy commands; amber reduces this to two and serializes new heavy
work; red starts no new heavy work. Every helper remains on-demand and project-owned.
Admission measured 10–14% CPU, about 17.6 GB available RAM, and zero disk queue. One
existing reviewer then performed static-only repeated rules QA; its temporary Node
cohort returned from six processes to the two primary processes on completion, with
zero `node_repl` and zero Serena. The reviewer independently accepts
`4f871ac3706f95c2a57679dd0162071c89363ecb..90859760bc9b2163219a31eb9053fcd4e92869ce`
with P0–P3/GAP all zero. The prior landing-support P2 is closed by the corrected
floor/old-board support filter and its single-support overhang regression. Product,
gate, and browser artifacts remain frozen. Visual QA is now open; evidence-integrity
QA remains closed until visual QA accepts.

**Independent visual QA evidence gap (2026-07-30):** a second independent reviewer
inspected all 15 committed PNGs at original dimensions. Fourteen frames pass and the
four-row image visibly proves the intended same-family contraction, but
`PHASE6_VISUAL_REVIEW.md` incorrectly called that `phaseTicks: 5` image an “endpoint”.
The browser evidence and manifest already identify the actual `clear-four` mid-stage
state; no product, image, hash, or runtime claim is wrong. Visual QA therefore returns
`REJECT` with P0–P3 all zero and one documentation GAP. Correct only the review-packet
label, commit that evidence-description checkpoint, and rerun the independent visual
review. Evidence-integrity QA remains closed.

**Independent visual QA accepted (2026-07-30):** evidence-description checkpoint
`e247dd9` changes only the visual-review packet status and the four-row label to
“isolated real Renderer contraction at `phaseTicks: 5`”. The same reviewer confirms
that this now matches the manifest and the previously inspected pixels. Final visual
verdict is `ACCEPT`, P0–P3/GAP all zero, with 15/15 original-size frames reviewed.
The correction started no runtime and changed no image, hash, product, or config.
Evidence-integrity QA is now open; Phase 6 remains unaccepted until that final
independent verdict and coordinator disposition.

**Independent evidence-integrity QA accepted (2026-07-30):** the final reviewer
accepts corrected product `9085976` with P0–P3/GAP all zero. It independently
recomputed 3/3 gate hashes, 19/19 browser hashes, and 15/15 embedded capture hashes;
confirmed the exact accepted-base/product/gate/harness/raw/index chain; found no
product/config drift from `9085976` to HEAD; and reconciled every capture's purpose,
dimensions, provenance, state binding, responsive/reduced-motion coverage,
one-Canvas/zero-DOM assertions, `17→28→17` listener lifecycle, final zero
Canvas/audio/rAF state, empty errors, closed browser, and released server. The Vite
`exitCode=1` is retained as a disclosed managed-termination record alongside
`released=true`, empty stderr, and closed listener; it is not a contradiction.
Phase 6 is now eligible for coordinator acceptance, changelog integration, cleanup,
and push. Puzzle 50 remains closed until that pushed recovery point exists.

**Coordinator Phase-6 acceptance (2026-07-30):** the coordinator has read the three
independent verdicts and the complete Classic workstream log, inspected the original
four-row contraction frame implicated by the only visual GAP, and confirms the GAP
was documentation-only and closed by `e247dd9`. Accepted product remains
`90859760bc9b2163219a31eb9053fcd4e92869ce`; gate index is `bee956a`; browser index is
`ca80416`. Repeated rules, final visual, and evidence-integrity verdicts all report
P0–P3/GAP zero. Product/config diff from `9085976` to HEAD is empty; Git is clean;
ports 4178/5178/5179, Chrome, `node_repl`, and Serena are absent. The current control
task retains only its two Node helpers. This coordinator checkpoint is the Phase-6
acceptance claim; push and exact local/remote equality verification are next. Do not
open Puzzle 50 before they succeed.

**Phase-6 pushed recovery point (2026-07-30):** `git push origin main` advanced
`origin/main` non-force from `4f871ac` through coordinator acceptance
`d0b7406a771c3c4e19f7f9d24b5f04806e1ed518`. `git rev-parse HEAD`,
`git rev-parse origin/main`, and `git ls-remote origin refs/heads/main` all returned
that exact SHA; the worktree is clean. Ports 4178/5178/5179 remain closed, Chrome,
`node_repl`, and Serena remain zero, and the active control task retains only two Node
helpers. Phase 6 is closed. Phase 7 may open only through its next bounded contract
checkpoint.

**Archived execution trail:** Phase 3 HUD source `741d8a64ee1151894920163285769417663e6464`
and acceptance/recovery record `1383fca794cba150d373597a21d6686a02922b02`
are pushed to `origin/main`. The final gates, exact-candidate browser matrix, input
audit, and independent rules/visual audits all pass with no open P0–P3 finding.
Project listeners on 4178/5178 and headless Chrome were released after acceptance.
Phase 4 Survival is accepted and pushed. Its source/test candidate
`2af2adfc1640b2d5be2197ec1bf92db8637f70ef` and corrected browser evidence
`993dfc7` passed all repeated independent audits with no P0–P2. Acceptance/recovery
record `fd7ef8d` is on `origin/main`; project ports and temporary browser resources
are released. Phase 5 Mutation is now the active contract boundary at `fd7ef8d`.
Three independent read-only baseline audits against documentation head `fae3c96`
return `GAP`: item assignment still shares the ordinary seven-bag RNG, Ice still
stops gravity, Collapse still performs duplicate work and draws global horizontal
bands, a runtime reduced-motion switch can discard queued feedback, and the status /
Next semantics remain incomplete. Exact Core → renderer → UI writer paths are frozen
in `docs/phases/phase 5.md`. The local Core candidate is now the bounded range
`f344f49..f2d51ca`: `f344f49` isolates the item stream and implements 60-tick Ice
gravity, `2e10789` shares one Collapse settlement mapping between board and carrier
metadata, `94c2d66` proves runtime FIFO handoff, and `3ceb6c2` closes the first
candidate audit's direct multi-carrier / empty-source / exactly-once test gaps.
`f2d51ca` additionally freezes Classic, Survival, and Puzzle replay/hash isolation
from item RNG while retaining that field in Mutation hashes. Focused Core/runtime
tests pass 40/40 and typecheck passes. This is still a candidate, not Phase-5
acceptance. Two complete independent read-only audits now accept exact product head
`f2d51ca` with no P0–P3: rules/RNG/Ice/cross-mode and Collapse-performance/Runtime
FIFO. The Core boundary is therefore accepted locally; only the frozen renderer /
timeline paths open next. Phase 5 itself remains open and unpushed until Renderer,
UI, production evidence, repeated QA, acceptance record, cleanup, and push complete.
Renderer reliability checkpoint `2484b67` fixes the pre-visual handoff: Bomb particles
wait for impact, consecutive bursts coexist in the bounded pool, a runtime
reduced-motion switch retains the current activation/FIFO/timed fields, Collapse no
longer enables a whole-board displacement filter, and Mutation Next invalidates its
cache from the independent attachment stream. Visual checkpoints `e66cbf8` and
`8488dd2` then give the four attachments distinct carrier edges and reduced-motion
endpoints, make the persistent 2× / 4× field explicit, replace Collapse's broad bands
with one compact gravity core, bind activation wells to the carrier's real columns,
and draw settlement only in columns whose existing or incoming cells actually move.
Focused renderer/timeline tests pass 24/24 and typecheck passes. Exact product head
`8488dd2` passed the first independent static product inspection, but that audit
correctly rejected palette-sensitive geometry assertions and an unrealistic same-lock
event fixture. Test correction `e2858a2` now strips paint options from geometry
signatures, proves Surface/Core reuse across locked/active/Next, exercises the real
2× / 4× vector glyphs, scans rectangle and segment spans, and uses
`piece-locked + clear-started`; focused tests pass 25/25 and typecheck passes. Exact
candidate `e2858a2` still allowed Rim geometry to mask a regressed Core. Second
correction `6599764` isolates Core from Rim during signature capture and wraps the
real Core path to prove locked/active/Next all reach Rim; focused tests remain 25/25
and typecheck passes. The final visual-contract re-audit accepts `6599764` with
P0–P3 = 0. The separate performance/lifecycle audit statically accepted the
implementation but rejected two missing regression assertions: a later burst could
clear surviving prior particles, and a completed Collapse trail could leak. Correction
`69730a1` now proves old Bomb particles survive the following Freeze emission and
Collapse trail exists at 259 ms but releases at 260 ms; focused tests remain 25/25 and
typecheck passes. Corrected performance/lifecycle re-audit accepts exact candidate
`69730a1` with P0–P3 = 0, matching the visual-contract PASS. Renderer static boundary
is therefore accepted locally and the frozen UI semantics/localization paths may open.
UI semantics candidate `7968bb1` retires player-facing `冻结`, states Ice as
1 second/cell in both languages, removes inactive status placeholders, exposes the
pure body-plus-attachment forecast through Next accessibility, and sends every notable
event from one Core transition to the live region in source order. Direct App coverage
passes 34/34 and typecheck passes. Its first independent static audit returned one P2:
entry/line-clear frames kept the Next body visible while `active=null` suppressed the
attachment prediction. Correction `287c426` derives eligibility from the piece count
at the upcoming spawn and directly proves entry/line-clear prediction equals the
actual spawned carrier without changing the state hash; the ARIA test now exercises
  an `active=null` frame. The first re-audit accepted the product fix but found that
  both Core delay fixtures happened to predict `null`, so the direct test could pass
  under the old guard. Proof correction `65ffd19` injects a deterministic non-null
  item stream into both entry and line-clear fixtures and asserts it before comparing
  the real spawn and preserved hash. Final independent re-audit accepts that exact
  correction with P0–P3 = 0. Responsive candidate `d819d92` therefore opens the frozen
  three CSS/test paths: idle Mutation reuses the ordinary two-column stats/Next
  topology, only active timed state creates a third status column, and one/two/three
  effects allocate only real tracks. The obsolete high-specificity mobile override
  that hid stats/Next is removed. Focused App/HUD tests pass 40/40 and typecheck passes.
  Independent responsive-layout review accepts exact candidate `d819d92` with
  P0–P3 = 0, including idle/active specificity, one/two/three-state allocation,
  short-height auto-fit, 12 px floors, reduced motion, and non-Mutation isolation.
  Final-source typecheck passes, the complete suite passes 26 files / 223 tests, and
  the production build completes with 753 transformed modules. Browser frames, 60 FPS,
  lifecycle, evidence capture, and repeated final audits remain.
  Final-evidence preflight then rejected the first capture harness before browser launch:
  it could attach to an unrelated service on port 4178, label a queued flash from Core's
  latest item instead of the renderer's current FIFO item, miss Bomb's impact boundary,
  and prove only one mount/unmount. Read-only observability candidate `f6fa06e` now
  exposes current Renderer FIFO/timeline/particle/Collapse-trail state and directly
  tests its immutability without reopening gameplay or visuals. The remaining bounded
  evidence writer owns only `docs/qa/evidence/t15-phase5/capture_phase5.py` plus root
  `.gitattributes` rules scoped exactly to that evidence directory. The harness must
  own and stop its Vite process, assert real rAF mean/p95, capture grayscale, compare
  two mount/unmount cycles with the home baseline, isolate a fresh partial artifact
  set, and publish its checksum only as the final completion marker. Harness base
  `8c321ca` and FIFO correction `f8b31ed` now pass two independent static reviews with
  P0–P3 = 0. This proves the capture design only; actual browser frames, performance,
  lifecycle evidence, final gates, evidence-integrity review, and acceptance remain.
Phase 5 itself remains unaccepted and unpushed until UI/status/Next, final-source
browser evidence, full gates, repeated QA, recording, cleanup, and push complete.

The remaining Phase-5 chain is deliberately fine-grained and may not be squashed:

1. raw final typecheck/test/build logs plus their source-bound gate manifest;
2. raw browser PNG/Vite output from the managed run;
3. browser manifest and checksums as a separate completion checkpoint;
4. independent rules, visual, and evidence verdict records as separate checkpoints;
5. each required correction and refreshed evidence in its own checkpoint;
6. coordinator acceptance/changelog, then verified cleanup and non-force push.

At the recorded pause there were 43 commits after Phase-4 recovery `fd7ef8d` (42 ahead
of `origin/main`). Resume corrections continue as new linear rollback nodes; no squash
or history rewrite is authorized.

### 2026-07-29 Phase 5 temporary pause point

- Status: **PAUSED / OPEN / UNPUSHED**. This is a recovery checkpoint, not Phase-5
  acceptance.
- Exact product source remains
  `f6fa06ea1b123f54bffff1885741e3ffbd551569`. Final source-bound gates are committed
  separately at `96a3841`: typecheck PASS, 26 files / 224 tests PASS, and production
  build PASS with 753 transformed modules.
- Managed browser capture correctly published no evidence from two rejected runs.
  The first exposed a stale FIFO witness created after unrelated carrier screenshots.
  Harness correction `3d01e9f` now probes FIFO before those screenshots and passed two
  independent static re-audits with P0–P3 = 0. A second run then failed the exact
  post-screenshot gate while sustained external CPU load remained roughly 80%–90%;
  no PNG, browser manifest, or completion checksum escaped its partial directory.
- At pause, the worktree is clean; Chrome count, listeners on 4178/5178/5179, and
  Phase-5 `.partial-*` directories are all zero. Browser performance/lifecycle
  evidence, visual inspection, three final QA verdicts, coordinator acceptance,
  changelog integration, and non-force push remain incomplete.
- Resume action: admit the same committed harness only after a trustworthy resource
  window, regenerate the complete managed browser batch, inspect every PNG, commit
  raw output and its index separately, obtain rules/visual/evidence acceptance, then
  record acceptance, clean resources, and push. Do not open Phase 6 first.

### 2026-07-29 Phase 5 resumed dynamic correction boundary

- Explicit resume reopened only the committed Phase-5 evidence harness. Product source
  remains `f6fa06e`; the gate evidence at `96a3841` remains authoritative.
- A mistaken `--help` invocation exposed that the script had no argument parser and
  therefore launched the capture. It failed closed at the same post-screenshot FIFO
  assertion and published no PNG, browser manifest, or completion checksum. Its Vite,
  Chrome, known ports, and partial directory were all verified as released.
- This third dynamic failure occurred with CPU samples below the 60% admission limit,
  so screenshot latency may no longer be classified only as external overload. The
  current harness incorrectly couples the frame-observed FIFO proof to a full-viewport
  PNG that must remain inside the shortest 300 ms activation.
- The bounded correction keeps the immediate rAF observer and exact fixed-suffix /
  instance-index checks, but records FIFO as renderer-state evidence rather than an
  ambiguously timed PNG. The existing four item-specific activation captures remain
  the visual proof. The script must also parse `--help` and reject unknown arguments
  before creating a partial directory, Vite process, or browser.
- Three independent static audits disagreed. The strict FIFO audit supplied a
  reproducible same-item counterexample: queue shrink can falsely advance the derived
  index while the original same-labelled activation continues. The correction must
  require an elapsed-time reset for adjacent equal labels.
- The target/visual audit also found two missing mandatory browser proofs: one
  non-empty `mutationCollapseTrail` capture bound to its actual columns/max drop, and
  four item-specific reduced-motion activation captures. Both become explicit exit
  conditions. The more permissive evidence audit's PASS is retained as a conflicting
  record, not used to waive the stricter findings.
- This is a harness-only correction. Core, renderer behavior/geometry, UI, CSS,
  localization, the committed gate logs, Phase 6, and Puzzle 50 remain closed.
- Two subsequent managed runs proved that even an early cropped DevTools screenshot
  can exceed the complete 260 ms Collapse settlement lifetime under SwiftShader. Both
  runs failed the unchanged post-screenshot continuity gate, published no artifact,
  and released Vite, Chrome, known ports, and partial directories.
- Do not extend the product effect or loosen its witness. A direct `drawImage`
  diagnostic is rejected because the production WebGL back buffer correctly yielded
  zero nontransparent samples. The next bounded correction uses Pixi's
  `ExtractSystem` to synchronously render the current stage board frame into an
  unmounted 2D Canvas. Pre-state, extract/PNG encoding, and post-state occur in one
  JavaScript turn; the manifest binds CSS/Pixi bounds, nonblank pixel statistics,
  dimensions, file hash, and same-instance Renderer state. Persistent layout frames
  continue to use ordinary Playwright screenshots.
- This correction reopens only:
  - `src/game/render/TetrisRenderer.ts` and its direct test;
  - `src/game/runtime/GameRuntime.ts` and its direct test for the DEV QA bridge;
  - `docs/qa/evidence/t15-phase5/capture_phase5.py`;
  - Phase-5 docs/log/evidence paths already owned by the coordinator.
  Renderer export, runtime bridge, and harness consumption are separate rollback
  commits. The final typecheck, complete suite and build must be regenerated after
  the last source commit before browser evidence is accepted.
- The reopened source chain is now frozen at `ee2aac5`: Renderer extraction is
  checkpoint `019268b`, and the DEV-only runtime bridge is checkpoint `ee2aac5`.
  Harness checkpoint `a5fa896` consumes only that typed bridge, copies each observed
  snapshot before attaching file metadata, locks the complete HEAD and committed
  harness blob/hash across the run, and rolls back an interrupted prefix publication.
  The prior gate batch at `96a3841` is now stale. Before regenerating gates, run one
  bounded live diagnostic that proves a real transient board extract is a nonblank
  PNG bound to unchanged pre/post Renderer state; do not publish that diagnostic.
- That bounded diagnostic now passes on the committed chain: a real Collapse
  settlement was observed at autoplay step 11 and extracted as a 391 × 782,
  61,838-byte PNG with 8,264/8,264 nontransparent samples and 189 quantized color
  buckets. Its Renderer pre/post witness was identical while the same actual trail
  remained at columns 5 and 9 with maximum drop 1. The temporary PNG/log directory,
  Vite listener, Chrome processes, and accidental Python bytecode cache were all
  removed. The next action is the one final source-bound typecheck/full-suite/build
  gate regeneration; this diagnostic is not browser acceptance evidence.
- The final source-bound gate batch is now committed at `6d9fc6a`: typecheck passed,
  all 26 test files / 225 tests passed with one worker, and the production build
  transformed 753 modules successfully. Raw test/build output is isolated in
  `5ec0f1b`; manifest/checksum binding is isolated in `6d9fc6a` and names
  `ee2aac5` as the product source candidate. This is gate acceptance only, not visual
  or Phase-5 acceptance. Three independent read-only audits now review source
  isolation, evidence integrity, and target/visual coverage before the one managed
  browser batch is admitted.
- Static comparison returned two PASS verdicts and one stricter evidence-integrity
  GAP. The stricter result controls: before the browser batch, the harness must bind
  the CSS board rectangle to the Renderer board rectangle in all four dimensions
  through the Canvas CSS/Renderer logical-size transform, not only by aspect ratio.
  Publication must also recompute every PNG hash, require it to equal both capture
  metadata and transient binding metadata where present, and reject duplicate PNG
  hashes across distinct capture labels. This is another harness-only checkpoint;
  `ee2aac5` and the final gates at `6d9fc6a` remain frozen and valid.
- Harness checkpoint `bc555ee` closes both findings. A bounded dynamic diagnostic
  proved the complete mapping at desktop: measured and computed CSS board rectangles
  were both `(402.5, 91, 391, 782)`, with a nonblank Pixi PNG and unchanged pre/post
  state. The original evidence reviewer then returned PASS with P0–P3 all zero and
  confirmed no product or gate drift. The single managed Phase-5 browser batch is now
  admitted, subject to a fresh resource check and fail-closed publication.
- The admitted run failed closed after proving every item/carrier/activation/FIFO and
  Collapse endpoint because the deterministic first reward granted two timed states
  in one transition. The harness therefore observed status counts 0 → 2 → 3 and could
  never satisfy its separate one-state layout frame while Core remained QA-frozen.
  It published nothing and released all owned resources. The bounded correction may
  relax only the main-loop exit from `{1,2,3}` to stable `{2,3}` coverage, retain the
  required three-state responsive/English/reduced captures, then advance the real
  deterministic Core clock one tick at a time after those frames until exactly one
  timed state remains and capture that actual UI. It may not inject state, change the
  product seed/source, fabricate a screenshot, or waive the one-state requirement.
  Independent comparison found one further ordering constraint: the existing
  three-state rAF/render benchmark must finish and pass before the clock is advanced
  toward one state. Move only the expiry fallback after `frame_budget` and before
  restart/lifecycle checks; the one-state proof may not weaken the three-state
  performance claim.
- Checkpoint `ad0be19` preserves the real one-state expiry proof but runs the complete
  three-state frame budget first. The strict reviewer returned PASS with P0–P3 all
  zero. Product `ee2aac5`, gates `6d9fc6a`, source behavior and publication rules are
  unchanged; a corrected managed run is admitted after a new resource sample.
- That run failed closed at the rAF mean gate and published nothing. Three repeated
  diagnostics proved the forced SwiftShader backend schedules at roughly 25 ms
  (about 40 FPS) despite a Renderer p95 of only 0.4–0.6 ms. The same frozen product
  and three-state workload on the actual RTX 4070 SUPER D3D11 WebGL2 backend measured
  mean 8.33 ms, p95 8.4 ms, max 8.6 ms and zero frames over 20 ms in all three
  samples. Keep every performance threshold unchanged. The harness must stop forcing
  SwiftShader, record the unmasked WebGL renderer/vendor, and fail closed on any
  software backend before the formal batch can be admitted again.
- Harness checkpoint `07e7a55` implements that backend boundary without changing any
  threshold. Two independent read-only reviewers returned PASS with P0–P3 all zero;
  product and gate trees are unchanged. The hardware-backed managed batch is now
  admitted after a fresh resource sample.
- The first hardware-backed formal batch at lease checkpoint `ccfd046` again failed
  closed and published no artifact. It passed the hardware/backend and three-state
  portions but reached the real-clock one-state fallback with all three timed effects
  carrying the same remaining tick count; Core therefore transitioned from three
  visible states directly to zero. This is a valid consequence of same-tick item
  refresh, not proof of a product defect. The evidence requirement remains one real
  one-state UI frame, but it is not required to be the suffix of the current
  three-state stack. After the already-passed three-state performance sample, the
  bounded harness correction may first advance the current deterministic clocks
  tick-by-tick; if they expire together, it must continue the same seeded, QA-frozen
  autoplay until the next genuine single timed effect exists, capture that actual UI,
  and fail closed on a finite bound. It may not inject or rewrite Core state, alter
  timers, change the seed/product, fabricate pixels, or weaken any three-state,
  performance, lifecycle, hash, uniqueness, or publication gate.
- Harness checkpoint `e2d18dab7317ebb5cf039af40e170481974d16e2`
  implements exactly that fallback. It records whether the one-state proof came from
  initial autoplay, the current stack's expiry, post-expiry autoplay, or the following
  real tick; preserves a 1,200-tick / 1,200-placement finite bound; and leaves all
  capture, GPU, performance, lifecycle and atomic-publication code unchanged. Python
  AST, CLI `--help` early exit and diff checks pass. Product `ee2aac5` and gates
  `6d9fc6a` remain frozen. A serialized read-only evidence audit must accept this exact
  harness before a new capture lease is opened.
- The accepted fallback then passed in the R2 formal batch, which failed closed later
  at the restart lifecycle comparison and again published nothing. Source inspection
  proves restart calls `focusBoard`, whose platform implementation schedules two
  nested rAF callbacks; the harness sampled `after_restart` as soon as Core returned
  to `playing`, before those intentionally finite focus callbacks necessarily drained,
  while `before_restart` was taken at an arbitrary frame boundary. Exact instantaneous
  pending-rAF equality is therefore not a stable leak proof. The bounded harness-only
  correction must sample active-game lifecycle after the same two real rAF boundaries
  for first mount, before restart, after restart, and second mount, then retain exact
  equality for pending frames, listeners and audio contexts. It may not ignore,
  subtract, cap, or waive a remaining frame; unmount must still return exactly to the
  home baseline.
- Harness checkpoint `e30a8d72aa5fa934fdea79db4223cab9ef0a0386`
  centralizes that stabilized active-game snapshot and uses it at first mount, before
  restart, after restart, and second mount. The helper awaits exactly two real rAF
  boundaries, then returns the unmodified lifecycle counters; all exact equalities and
  unmount baseline checks remain. Python AST, the embedded JavaScript syntax check,
  CLI `--help` early exit and diff checks pass. Product `ee2aac5`, gates `6d9fc6a`,
  the accepted one-state recovery and every visual/performance/publication rule remain
  unchanged. One serialized read-only audit must accept this exact harness before the
  next capture lease.
- The serialized audit correctly returned `GAP`, P0=0/P1=0/P2=1/P3=0: the two-rAF
  Promise has no rejection path if rAF itself stalls, so one of the four lifecycle
  samples could wait forever instead of reaching harness cleanup. The only permitted
  correction is a 2,000 ms browser-timer bound around the same two rAF callbacks,
  clearing that timer on success and throwing on expiry. The bound may not replace a
  frame, return a partial snapshot, catch the error as success, or relax any equality.
- Checkpoint `a59856d056951865e8a5c0b6dc93f75ac97461be` adds only that
  timer/rejection path. Python AST, extracted embedded-JavaScript syntax, CLI `--help`
  and diff checks pass. Product/gates and all lifecycle equality checks remain
  unchanged. The same serialized reviewer must close its P2 on this exact diff before
  another capture lease is registered.
- That reviewer closed P2 with P0–P3 all zero. R3 then passed the stable restart
  lifecycle boundary and failed closed at the later first-unmount global-listener
  baseline equality, again publishing nothing. The current assertion records only a
  count, so product leak versus probe/accounting mismatch is not yet established.
  Before any product or harness correction, one bounded nonpublishing diagnostic may
  reproduce only mount → settings restart → unmount with the committed lifecycle
  probe and print the complete baseline/current listener maps. It owns one Vite/Chrome
  tree and temporary files outside the repository, runs no gameplay capture or source
  gate, and must clean all outputs. Product source remains frozen unless that direct
  map proves a real game-owned listener survives.
- The bounded diagnostic now proves a probe-order mismatch rather than a product
  leak. The raw page baseline was sampled before any Playwright locator readiness
  action and contained 4 listeners. Mount/restart remained exactly stable at 28;
  unmount removed the game-owned `document:pointermove`, the additional
  `window:pointerup`, input, visibility and resize listeners, closed the only audio
  context, removed the Canvas/QA bridge and returned rAF to zero. The remaining
  17-listener map exactly matches the already accepted Phase-4 Playwright-instrumented
  home baseline, whose first and second unmounts both remained 17 and whose remount
  remained 28. Therefore product source and final gates stay frozen. The only allowed
  harness correction is to await the stable Mutation home selector through Playwright
  before taking the original lifecycle baseline, matching the accepted Phase-4
  `open_home` order. It must retain exact first-unmount and second-unmount equality;
  no listener may be filtered, subtracted, tolerated, or reclassified as success.
- Harness candidate `45e7cfcca48f438be1a9ff24619137ff19dffd3e`
  implements only that readiness boundary by waiting for
  `[data-testid='enter-sprint']` before the existing baseline snapshot. Python AST,
  side-effect-free CLI `--help`, diff and temporary-file cleanup checks pass. The
  exact unmount assertions and every product/gate/performance/publication condition
  remain unchanged. One serialized read-only evidence audit must accept this exact
  one-line diff before a new formal browser lease is registered.
- That audit accepted exact harness `45e7cfc` with P0–P3 and GAP all zero. Its
  automatically started Serena/TypeScript and MCP children were attributed by native
  parent/command-line data and released by exact PID; shared Codex infrastructure was
  preserved. Formal capture R4 is now admitted from clean documentation head
  `304509d`: product/config, gate and harness diffs are all empty; 4178/5178/5179,
  partials, browser artifacts and external control logs are absent. One PDH snapshot
  reports 11.86% CPU, 23,665 MiB available memory, 22.99% committed memory and disk
  queue 0. Only the single managed hardware capture tree may run next.
- Formal capture R4 completed successfully from capture head
  `bdf4e20a2cb563d5f1b8389b2a11748f531b4282`. The atomic batch binds product
  `ee2aac5`, final gates `6d9fc6a` and harness `45e7cfc`, records hardware WebGL2 on
  an NVIDIA GeForce RTX 4070 SUPER, and publishes exactly 34 unique PNGs, two Vite
  logs, one JSON manifest and one checksum completion marker. Browser-raw checkpoint
  `9fa98a2` and browser-index checkpoint `013120a` keep those concerns independently
  reversible.
- Coordinator validation recomputed every declared hash and exact artifact set. It
  confirmed the four attachments in ordinary and grayscale Next, active and locked
  pieces, all ordinary/reduced activation endpoints, real Collapse columns `[5, 9]`
  with maximum drop one, one/two/three concurrent statuses, and desktop/portrait/
  landscape/English layouts. Every frame has one gameplay Canvas, no DOM cell grid,
  no overflow, at least 44 px controls, and a nonblank Pixi extraction. Collapse has
  no 80%-width horizontal state bar or top pseudo-piece band.
- Runtime evidence reports renderer p95 `0.3 ms`; rAF mean `8.332 ms`, p95 `8.4 ms`,
  maximum `8.5 ms`, and zero frames over 20 ms. FIFO order is exactly
  `collapse → multiplier`. The listener lifecycle is the exact instrumented sequence
  `17 → 28 → 17 → 28 → 17`; both unmounts also return rAF/audio/Canvas/QA to zero,
  with two audio contexts created and two closed by final unmount. No runner, Vite,
  Chrome, partial directory or listener remains on 4178/5178/5179.
- Manual original-resolution review found the carrier identity legible by symbol,
  contour and material in color and grayscale; Bomb, Ice, Collapse and Multiplier
  activation locations are visually distinct and coexist without dropped effects.
  Narrow three-status frames intentionally ellipsize long metrics/status labels rather
  than overflow. That observation remains open for independent visual QA to classify;
  this coordinator record is evidence readiness, not Phase-5 acceptance.

### 2026-07-29 Phase 5 acceptance and pause

- Status: **ACCEPTED / PUSHED / PAUSED**. Phase 5 is accepted against frozen
  product `ee2aac5`, gate checkpoint `6d9fc6a`, raw browser evidence `9fa98a2` and
  browser index `013120a`.
- Final independent QA is deliberately split and reviewable:
  - rules `c5b7be8f1eb4063aee7974fd1d7e6b86191800e2`: PASS,
    P0=P1=P2=P3=GAP=0;
  - visual `737394845400df33cc56bdc4b7dadd98d006d66f`: PASS,
    P0=P1=P2=GAP=0, P3=1 for narrow long-value/status-label ellipsis;
  - evidence `eaf78aa9acc1085faf1a02ea89378d3e4a8497eb`: final PASS,
    P0=P1=P2=P3=GAP=0 after an initial fail-closed hash GAP was closed by an
    independent 38/38 SHA-256 retry.
- The visual P3 is retained as explicit polish debt. It does not hide item identity
  or duration because the unique symbol/material, progress track and seconds remain
  visible; it is not silently relabeled as zero.
- Acceptance preflight reports a clean worktree, zero product/config diff from
  `ee2aac5`, zero gate diff from `6d9fc6a`, zero harness diff from `45e7cfc`, no
  helper/partial/control-log residue, and no 4178/5178/5179 listener. No source gate
  was rerun after the frozen source because no source, dependency or config changed.
- Acceptance commit `321ebc65bb295dbb536db20ad63f6b659c8e4ed9` was pushed
  non-force to `origin/main`; local and remote heads matched immediately afterward.
  The only remaining action in this turn is to push this recovery/pause record,
  recheck equality and release any residual project resource. Do not open Phase 6 or
  Puzzle 50; wait for the player's next explicit instruction.

### 2026-07-29 Phase 5 resource-containment contract

- Phase 5 now executes **strictly serially**. The coordinator is the only active
  implementation/evidence worker. Independent QA may use at most one sub-agent at a
  time, only after the candidate is frozen; that agent must finish before another QA
  turn or any browser/test/build process begins.
- Browser capture, Vite, test, build, and diagnostic workloads are mutually exclusive.
  Exactly one heavy process tree may exist, and its owned children, listener, partial
  directory, and control logs must be released before the next workload starts.
- MCP, Serena, language servers, and browser helpers are off by default and may start
  only for a concrete current action. Do not retain them between checkpoints. The
  fixed Codex command-safety process and managed `node_repl` pool are app infrastructure,
  not project workers; do not repeatedly terminate a managed process that immediately
  respawns.
- Resource sampling may not call WMI, CIM, `wmic`, or `Get-WmiObject`. Use PDH for
  CPU/commit/disk samples, `Get-Process` plus the native process API for ownership, and
  `netstat` for listeners. This prevents resource governance from creating WMI load.
- Fixed multi-sample CPU admission is retired. Before any heavy action, the coordinator
  takes one lightweight current PDH snapshot and opens one explicit resource lease
  naming the owner, purpose, command, expected process tree, listeners, temporary
  paths, completion condition, and cleanup check. A lease starts only when there is no
  earlier heavy lease, current CPU has practical headroom (normally below 60%),
  committed memory is at most 75%, disk queue is at most 1.0, at least 6 GiB physical
  RAM is available, and no prior Phase-5 process, listener, control log, or partial
  directory exists. Do not poll repeatedly to manufacture a passing window: release
  unused resources, wait when the machine is pressured, then take a new single
  snapshot. At sustained 90% CPU, stop launching work, release only verified
  project-owned children, and never terminate Defender, WMI/Windows services, the user
  control window, or the Codex app-server.
- The 2026-07-29 cleanup removed the complete Serena/TypeScript-server tree, eight
  idle MCP bridge processes, and twenty-two stale duplicated `personal-web` preview
  Node processes (about 661 MiB working set). Phase-5 ports 4178/5178/5179, port 4322,
  and Phase-5 partial directories then all verified empty. No formal browser run may
  start until the strengthened lease preflight passes. After reboot, two automatically
  started Serena/TypeScript trees and three MCP bridge pairs were also released as one
  bounded cleanup (24 processes, about 1.2 GiB working set); only the managed Codex
  `node_repl` baseline remains.

The per-phase goal, team, checkpoint, and rollback briefs are indexed at
`docs/phases/README.md`. They refine this execution order without replacing this file
as the current-state authority.

1. **Design-system foundation.** Adopt the existing Phase-1 token candidate after
   candidate-bound checks. Its deliberately subtle result centralises colour, type,
   spacing, radius, component metrics, and motion timing; visible page recomposition
   belongs to later phases rather than being forced into this foundation.
2. **Settings.** Recompose the existing Settings content into one compact, coherent,
   responsive information system. Preserve controls → keyboard → rules → records,
   bilingual copy, focus/arrow/Enter/Escape/backdrop operation, useful record rows,
   and the visibly dimmed live board. No structural blank quadrants, tiny type,
   unrelated equal-height stretching, or hidden canvas are acceptable.
3. **Main HUD and layout.** Make the one Pixi board the dominant object, align the
   information rail to it, strengthen numerical hierarchy, reduce redundant nested
   cards, and preserve one canvas, touch/keyboard safety, compact layouts, and the
   established board field.
4. **Survival.** Unify bedrock rise and independent falling stones into one legible
   pressure model with predictable progress and a fair visible warning before a
   stone enters. Preserve deterministic seven-bag isolation, clearable falling stones,
   scoring/line-clear participation, and the accepted brown bedrock material unless a
   later explicit player instruction changes it.
5. **Mutation.** Collapse the idle rail to a concise no-effect state, then expand
   only active timed effects. The player-facing Chinese item name is **冰冻**, not
   “冻结”; its existing internal `freeze` key and English `Freeze` may remain for
   compatibility. Ice feedback and Collapse board feedback must become unmistakable,
   while the staged Bomb impact and readable Multiplier field remain bounded,
   reduced-motion-safe, and performant. **Items are attachments, never piece
   families:** every ordinary I/O/T/S/Z/J/L shape can independently carry Freeze,
   Collapse, Bomb, or Multiplier. The ordinary body shape/material remains readable;
   the item contributes its own core, rim, surface language, and energy response.
   Next must use the same body-plus-attachment grammar and must predict the actual
   spawned carrier without consuming deterministic state. Direct coverage must retain
   all 7 × 4 = 28 combinations. During the ten-second Ice effect, automatic gravity is
   fixed at **1 second per cell / 60 fixed ticks** rather than stopped; movement,
   rotation, soft drop, and hard drop remain available. Re-triggering Ice resets its
   remaining duration to ten seconds. Activity, locked cells, and Next must reveal both
   carrier presence and item identity within 100 ms by shape/edge/core/motion as well
   as colour. Collapse may not use a ten-cell-wide horizontal bar at the top or inside
   the board; its feedback is column-local gravity, compression, downward particles,
   and a short settlement wave only where cells actually move. Item attachment RNG
   must be a deterministic stream isolated from the ordinary seven-bag. Switching
   reduced motion at runtime may simplify current feedback but may not discard its
   pending FIFO. Bomb fragments begin only at impact, never during warning.
   Multiplier's ten-second field and reduced-motion endpoint must both distinguish
   2× from 4×.
6. **Classic.** Refine terminology, hierarchy, micro-motion, and feedback only. The
   shared ordinary line-clear effect must visibly identify the cleared row, contract
   and dissolve its cells, then settle with a restrained afterglow; 1/2/3/4-line clears
   scale one coherent effect family. No full-screen flash, input block, long occlusion,
   or Core timing change. Revalidate the shared effect in all modes, but do not add a
   mechanic or blur Classic's role as the clean baseline mode.
7. **Puzzle curriculum.** Expand from twenty to fifty deterministic authored levels
   without redesigning the selector. Build progressive concepts rather than fifty
   cosmetic variants: teach a readable idea, combine previously learned ideas,
   provide more than one reasonable route where practical, keep immutable anchors
   sparse and solvability-safe, and Core-replay every shipped route. Recalibrate names,
   sequence, fixed queues, difficulty order, unlock tiers, localization, persistence
   migration, and tests. Player victory remains clearing every original target with
   no public piece cap or strategy hint.

**Final acceptance.** Each phase receives focused tests and real screenshots before
the next phase is accepted. After the final source change run typecheck, the complete
suite, production build, deterministic replay/solver checks for all fifty Puzzle
levels, desktop/portrait/short-landscape/reduced-motion browser passes, one-canvas and
zero-DOM-grid assertions, console/page-error checks, lifecycle/resource cleanup, and
an independent read-only QA disposition. Never mark the goal complete merely because
one phase or a static screenshot passes.

## Phase 3 — stable live HUD and touch surface

**Status (2026-07-28):** accepted and pushed. Final source
`741d8a64ee1151894920163285769417663e6464` and recovery record
`1383fca794cba150d373597a21d6686a02922b02` are on `origin/main`. The exact source
checkpoints, production evidence, independent verdicts, exclusions, and rollback
boundary are recorded in `docs/phases/phase 3.md` and the Phase-3 workstream log.

1. **Shared topology.** Desktop, portrait, and short landscape use one final HUD
   topology for all four modes. The board stays 1:2 and dominant; statistics, optional
   mode status, and Next remain readable without mode-owned blank rows or hidden rails.
2. **Stable semantics.** Keep `下落速度/格`, `操作数`, Survival pressure values, one
   ordinary Next, and Puzzle's one-well/two-row `1`/`2` forecast. Actual piece types
   are included in preview accessible names.
3. **Spawn presentation.** Core coordinates remain unchanged; a presentation-only
   correction must show the entire newly spawned silhouette inside the visible well.
4. **Real input.** A transparent board-bounded interaction layer above the Canvas
   receives mouse focus and true touch gestures while countdown input stays disabled.
5. **Bounded paths.** DOM/input/accessibility, renderer presentation, and a final
   `hud.css` authority layer are separate source commits. Core rules, mode materials,
   Puzzle data and the Puzzle selector are excluded.
6. **Acceptance.** Four modes × desktop/portrait/short-landscape/1056 × 480/reduced
   motion, all three countdown digits, real touch gestures, one Canvas, zero DOM cells,
   zero overflow, zero page/console errors, and independent rules/visual acceptance.

## Phase 4 — Survival pressure system

**Status (2026-07-28):** accepted and pushed. Core
`514c459`, renderer `4d31994`, HUD `f89c040`, records `5c6a436`, clock correction
`cc8c71f`, and direct scoring proof `2af2adf` remain separate checkpoints. Corrected
evidence `993dfc7` binds the candidate, raw gates, English rendering, countdown,
pause/restart, two mount/unmount cycles, Canvas/listener/RAF/audio cleanup, and the
pressure sequence. Repeated rules, visual, and UI/evidence QA all return `ACCEPT`;
no P0–P2 remains. Acceptance/recovery record `fd7ef8d` is on `origin/main`.

1. **Pressure rules.** Start with three brown bedrock rows. The bedrock-rise interval
   decreases from 13 seconds to 6 seconds; each three cleared lines removes one row.
2. **Independent stones.** Every 20 seconds initially, decreasing by one second per
   stone event to a 10-second floor, drop one or two clearable stones at roughly
   1.5× the ordinary piece fall speed. Stones use an RNG stream isolated from the
   seven-bag and participate in line clears and scoring.
3. **Readable fairness.** Canonical Core state preselects one or two unique columns
   exactly two playing seconds before each stone event. The same stored plan drives
   the Canvas warning and actual spawn without rereading or predicting RNG. If every
   warned entry cell is blocked when the timer expires, the event remains due and the
   warning stays visible until at least one warned column can accept a stone; it may
   not silently consume the event or move to an unannounced column. Reduced motion
   keeps the same static column endpoint without relying on sweeping movement.
4. **Records.** Survival records contain only survival time, cleared lines, and date;
   no placed-piece count is persisted or displayed.
5. **HUD topology.** Preserve the accepted four-cell rail: elapsed Survival time and
   cleared lines occupy the first row; bedrock-rise and falling-stone clocks occupy
   the second. The bedrock clock label includes the current row count. Score is not
   promoted over the mode's endurance metric.
6. **Checkpoint boundary.**
   - Core warning plan: `src/game/core/constants.ts`, `types.ts`, `engine.ts`, and
     `race.test.ts`.
   - Renderer motion/cues: `src/game/render/TetrisRenderer.ts` and direct test plus
     `presentation.ts` and direct test.
   - HUD: `src/App.tsx`, direct App test, `src/ui/localization.ts`,
     `src/styles/hud.css`, and direct HUD test.
   - Persistence: `src/leaderboard.ts`, direct leaderboard test, `src/App.tsx`, and
     direct App test; use a mode-discriminated v8 record and explicitly drop
     Survival `score`, `pieces`, and `chain` during v7 migration.
   No Mutation, Classic, Puzzle, Settings, audio, dependency, packaging,
   second-Canvas, or DOM-grid change belongs to this phase.

## Phase 1 — TetraMorph Design System v1.0 (additive foundation)

**Status (2026-07-28):** Phase 1A/1B corrected source candidate `99e5a0f` is accepted
by both independent auditors; coordinator acceptance checkpoint `fcd612e` was pushed
to `origin/main` as the Phase-1 recovery point. The first target/visual audit
correctly rejected `54fd260` because imported Variable font faces were requested by
the wrong CSS family names; `99e5a0f` fixes the actual Space Grotesk Variable and
JetBrains Mono Variable families and refreshes source-bound proof. Deterministic local
fonts, dependency lock, clean install, full tests/build, and browser evidence are
complete.
This narrow
presentation foundation does not reopen accepted T14 mechanics or Mutation VFX. The
inherited `src/styles.css` modal correction remained outside every Phase-1 source
checkpoint. The original untracked `phase 1.md` brief was later normalized into
`docs/phases/phase 1.md` with the other phase-goal documents; that documentation
migration is not retroactively part of the accepted Phase-1 product-source range.

**Boundary.** Create one authoritative, typed token family under
`src/design/tokens/` for palette, typography, spacing, radii, and motion timing, then
bridge only existing CSS custom properties and renderer shell colours to those values.
No component tree, page geometry, semantic copy, control, gameplay, board cell
material, or new animation may be introduced in this phase. The board's established
deep navy remains `#071522`; ordinary piece materials and all mode rules remain
unchanged.

**Phase-1 source scope.**

- `src/design/tokens/colors.ts`
- `src/design/tokens/typography.ts`
- `src/design/tokens/spacing.ts`
- `src/design/tokens/radius.ts`
- `src/design/tokens/animation.ts`
- `src/design/tokens/tokens.test.ts`
- `src/styles/tokens.css`
- `src/main.tsx`
- `src/game/render/theme.ts`
- `src/game/render/theme.test.ts`

The contract fixes the requested base palette (`#DCE7F1`, `#F8FAFC`, `#EDF3F7`,
`#C4D4DF`, `#102A43`, and soft secondary `#627D98`), mode accents (Classic
`#31978D`, Survival `#5878C4`, Mutation `#C77A35`, Puzzle `#8A63B3`), Playwrite NZ
Basic for the `TetraMorph` wordmark only, the actual locally registered
`Space Grotesk Variable` family for UI, `JetBrains Mono Variable` for values, and the
`Noto Sans SC Variable` → PingFang SC → Microsoft YaHei Chinese fallback chain.
The shipped Playwrite face tops out at its authored 400 weight; request that real face
and use a restrained local stroke for the required bold presence instead of asking
for a nonexistent 700 face and silently falling back to Space Grotesk.
Because `#627D98` does not reach 4.5:1 on either light content surface, normal-size
supporting text uses the accessible `#52677F`; the softer requested value is retained
only as a non-body accent. Token values also define the three card levels,
primary/secondary/icon button metrics, and the hover/click/modal/page timing contract
without applying new motion.

**Verification.** Freeze the token contract in focused tests, retain one canvas and
zero DOM board cells, then run typecheck, the full suite, production build, and a
single real-browser visual comparison. The browser pass must establish that the
existing layouts are unchanged while typography, shell palette, and board colour
resolve through the new system.

### Phase 1A / 1B checkpoint split

- **Phase 1A — token and palette bridge:** `5ac6437..378826b` defines all requested
  token families, adopts the shell
  palette in CSS/Pixi, restores AA supporting text, and loads the real Playwrite
  wordmark. Spacing, radius, component, and motion tokens are deliberate primitives;
  Settings consumes them in Phase 2 and the live HUD consumes them in Phase 3. Do not
  claim that every historical literal in `src/styles.css` was mechanically replaced.
- **Phase 1B — deterministic local fonts and lock closure:** `7ff656c` adds exact
  `@fontsource-variable/noto-sans-sc@5.3.0` and its clean-installable lock;
  `54fd260` imports it locally and uses the actual Fontsource family before platform
  fallbacks. Correction `99e5a0f` binds the actual `Space Grotesk Variable` and
  `JetBrains Mono Variable` family names after independent visual QA caught their
  silent fallback. A disposable detached candidate passed a real `npm ci`, typecheck,
  and focused contract tests. No layout or gameplay path changed in Phase 1B.

Every later phase uses one writer and two independent read-only QA roles: code/rules
and target/visual. Each workstream records contract SHA, exact source paths, evidence
hashes, both findings, correction SHA, accepted SHA, and one rollback base before the
coordinator may push.

### T15 collaboration, audit, and rollback protocol

`docs/workstreams/tetris-t15-coordinator/PHASE_MATRIX.md` is the execution register.
Every phase follows the same non-skippable state machine:

1. coordinator freezes the target delta and exact paths in a docs-only checkpoint;
2. one writer produces small green source checkpoints and stops at a candidate SHA;
3. a code/rules auditor and a target/visual auditor independently compare the exact
   base-to-candidate range against the frozen target;
4. any P0/P1 or user-request-relevant P2 returns to the same writer, then both audits
   are repeated against the corrected SHA;
5. only the coordinator records acceptance, runs the phase-end resource audit, and
   pushes the accepted checkpoint.

Auditors never edit production code. Conflicting verdicts are reproduced by the
coordinator or sent to a third read-only tie-break auditor; they are never averaged
away. Each phase log preserves base, contract, source, evidence, correction,
acceptance, and pushed SHAs so `git revert` can roll back one claim without erasing
later QA history.

Branch: `main`

Current base: coordinator-verified T12.7 recovery record `550d77e`. It is historical
evidence only: its target-floor boards and tier gate are superseded by this task, and
its local walkthrough output remains historical ignored evidence and is not regenerated
in this delivery.

Current execution status (2026-07-28): **T15 phased product refinement active.** T14
Mutation VFX, T13.15's Puzzle ceremony/brown-bedrock outcome, and T13.14's final
Settings/forecast correction are accepted historical baselines. T15 may refine their
specified presentation in its named later phases, but does not silently reopen their
deterministic rules. The dependency lock is now intentionally owned by Phase 1B;
the inherited `src/styles.css` compositor delta remains outside the Phase-1
checkpoint.

## Phase 2 — compact Settings console

**Status (2026-07-28):** contract frozen at pushed base `fd26652`. Three independent
read-only pre-audits agree that records, dates, bilingual copy, backdrop dismissal,
sound-only controls, and most focus behavior already exist. The blocking gaps are the
countdown continuing behind a sheet, DOM-index direction navigation that does not
match the visible control geometry, one English result-page language leak, and a
Settings layout that alternates between stretched empty quadrants and unreadable
horizontal compression. No source acceptance is claimed.

1. **Information order and content.** The visible and DOM order is always title,
   **控制**, **键盘**, concise **规则**, then the current record surface last. Music
   stays removed; Controls contains language, sound effects, 0–100% volume, Restart,
   and Continue. Keyboard contains Gameplay before Shortcuts, with key entries in two
   readable columns rather than four sparse micro-columns. Puzzle alone adds `Z`.
2. **Natural-height connected console.** Use one connected mineral-light console whose
   sections are separated by one structural rule. The sheet is at most 800 px wide on
   desktop and grows only to its real content, with a scroll-contained maximum height.
   No top-level section may use a fixed/minimum height, equal-height stretch,
   `space-between`, ghost cell, or empty five-row record reserve. Body and key labels
   remain at least 12 px; interactive hit areas remain at least 44 px. Short landscape
   scrolls the content instead of shrinking it below the design-system floor.
3. **Responsive geometry.** Desktop Controls uses a 52 px label rail plus language,
   sound/volume, and compact run actions. It wraps to two rows before content collides
   and becomes a natural single column on narrow screens. Keyboard uses the same label
   rail, with Gameplay and Shortcuts arranged as real two-column item grids; the fifth
   Puzzle action and seventh shortcut span their final row. Rules render only real
   structured facts: three Classic facts fill three columns; four-fact modes use 2 × 2;
   widths below 680 px use one column. Records always follow Rules.
4. **Mode record matrix.** Classic rows show rank, lines, score, and date. Survival
   rows show rank, survival time, lines, and date—never score or piece count. Mutation
   rows show rank, lines, score, piece count, and date. Each ordinary mode renders only
   its actual zero-to-five rows; an empty table is one compact status row. Puzzle never
   creates a leaderboard: its final strip contains only the current level record and
   `最少 N 步` / `尚未通关`.
5. **Interaction correctness.** Opening Settings or Exit during 3 → 2 → 1 must freeze
   the current digit, keep Core ready and input disabled, and resume the same countdown
   after the final sheet closes; the run starts exactly once. Settings navigation uses
   explicit row/column coordinates: Left/Right stays in a row, Up/Down moves to the
   nearest control in the adjacent row, and Enter activates the selected control.
   A focused range keeps native arrow adjustment. Esc, backdrop, paused-origin
   Continue, successor sheets, and the Phase-1.5 same-Canvas focus contract remain.
   The result leaderboard receives the active language so English routes never fall
   back to Chinese.
6. **Structured copy.** Replace delimiter-split rule strings with typed rule facts
   carrying stable IDs, labels, and values. Keep the current mechanical facts and
   rankings; this phase changes presentation, not Core rules or persistence. Do not
   change date semantics unless a separate reproduced defect is accepted.
7. **Bounded source and checkpoints.**
   - behavior/content: `src/App.tsx`, `src/App.test.ts`,
     `src/ui/localization.ts`, and only the coordinate-navigation branch in
     `src/ui/ActionSheet.tsx`;
   - layout/style: `src/styles.css` plus direct contract assertions in
     `src/App.test.ts`;
   - excluded: Core, renderer, audio engine/runtime, leaderboard schema/sorting,
     dependencies, Puzzle definitions, and the Puzzle selector composition.
   Behavior and layout are separate commits. A rejected candidate returns to the same
   writer; no later shared-path phase starts before Phase 2 is accepted and pushed.
8. **Acceptance matrix.** Direct tests cover countdown-sheet freeze/resume, complete
   coordinate navigation, range behavior, playing/paused replacement chains, language
   switching, English results, all four structured rule sets, ordinary empty/five-row
   records, Survival field exclusion, and Puzzle completed/uncompleted strips. Final
   gates are typecheck, full suite, build, and candidate-bound production evidence at
   1440 × 900, 390 × 844, 844 × 390, and 1056 × 480, including Chinese/English,
   reduced motion, empty/full records, and Puzzle record states. Every top-level
   section has at most 16 px non-semantic trailing space; body text is at least 12 px,
   hit areas at least 44 px, the page does not overflow, the same one Canvas stays
   visible and dimmed, and console/page errors remain zero. Code/rules,
   target/visual, and evidence-integrity QA must all accept the exact candidate.

### T14 accepted historical delivery contract — Mutation VFX polish

**Authority:** `E:\Download\TetraMorph_Mutation_VFX_Polish_Prompt.md`, plus the player's
2026-07-27 live-feedback addendum; the implementation design is recorded in
`docs/MUTATION_VFX_POLISH.md`. The goal is a premium, original deep-navy
crystal-technology presentation for **异变 / Mutation**, with one explicitly authorized
Mutation-only cadence cap. The existing bright application shell, all four modes,
one-canvas boundary, and product accessibility remain authoritative.

**Candidate checkpoint (2026-07-27):** product source `480a2be` completes the T14
contract and awaits an independent read-only review before any acceptance, changelog,
or push claim. The source chain adds a non-mutating immediate-carrier lookahead,
the six-tick Mutation-only floor, array-indexed Collapse carrier settlement, attached
carrier rendering, FIFO transient delivery, and direct regressions for all 28
ordinary-body/item combinations. Final first-party gates are typecheck; 24 test files /
174 tests; and the 749-module production build. Fresh live browser checks verify the
four carriers/effects, coexistence of timed fields, a marked immediate Next preview
that exactly becomes the spawned carrier, desktop/390 × 844/844 × 390/reduced-motion
geometry, one canvas/zero DOM cells/no overflow/no console/page errors, and a
Collapse-active 180-frame render benchmark (mean 1.07 ms, p95 3.90 ms, max 5.70 ms).
The coordinator-owned port 5176 listener was verified released after capture.

1. **Gameplay and deterministic-preview contract.** Do not change Core commands,
deterministic seed/bag generation, the 32% carrier chance, first-two-piece delay, item
selection, scores, row removal, ten-second timed-item duration/reset, 2×/4× multiplier
progression, or persistence. The one authorized rule adjustment is Mutation's own
minimum gravity interval: it may never become faster than **6 fixed ticks / 0.1 seconds
per cell**; Classic, Survival, and Puzzle cadence remain untouched. A pure, non-mutating
Core lookahead may predict the next Mutation carrier for the already-visible Next piece,
but must consume no RNG/state and must match the carrier actually assigned on spawn.
Bomb's instant Core resolution remains intact, but the renderer must visually present an
ordered warning/impact/fragment sequence rather than an unreadable direct deletion.
2. **Design-system and rendering scope.** Add `src/design/mutationTokens.ts` for the
authoritative palette, phase timings, logical particle limits, and original audio
profiles; add `src/animation/mutationTimeline.ts` for reusable sequence/parallel/delay
timelines with cubic-in, cubic-out, and back-out easing. Renderer work is confined to
`src/game/render/TetrisRenderer.ts` and its direct tests/theme imports. It may use the
existing Pixi containers/Graphics and a bounded logical pool; it may not create a DOM
board, a second canvas, frame-by-frame Pixi objects, or a browser-timer visual loop.
3. **Required visual language and event reliability.** Every active, locked, **and
Next-preview** carrier must be identifiable within 100 ms: crystalline cyan Freeze,
compressed violet Collapse, ember-orange Bomb, and golden Multiplier. A carrier is an
**attached item treatment**, not a replacement piece family: the ordinary I/O/T/S/Z/J/L
body retains its own shape/material while the item adds a visible crystal core, rim,
surface mark, and local energy accent. Therefore every ordinary shape can visibly carry
every item. The Next preview uses that same base-piece-plus-attachment grammar. Freeze
owns frosted edge, glassy refraction cue, bounded snow;
Collapse owns a vertical gravity field, pull trails, and a 120 ms settle cue; Bomb owns
the 0/200/400/600/900 ms warning → pulse → impact → shockwave → fragments timeline;
Multiplier owns a contained score-light and floating value treatment. When one Core
transition activates several carriers, all short transient sequences must be retained in
a renderer-owned FIFO queue: timed fields may coexist, while the foreground transient
plays one complete readable item at a time instead of dropping or overwriting an event.
Timed states must remain legible throughout their existing ten game seconds and honor
reduced motion with a static high-contrast endpoint rather than an absent effect.
4. **Rail/audio.** Retain the current status location but make it a compact Mutation Card:
item identity, readable timer, and progress are visible without a long explanation.
No music or third-party media is added. Original WebAudio effects receive semantic
activate/impact/end contours, with any active cue stopped when a newer one supersedes it.
The UI uses the shipped Space Grotesk and JetBrains Mono families; the unavailable Inter
family is not fetched or silently substituted.
5. **Performance and acceptance.** Use at most 120 logical visual particles (below the
300 hard ceiling) and at most two effect planes; re-use their records and the existing
Pixi Graphics. Collapse settlement must avoid per-cell string-key maps or repeated
transient collection churn in the deterministic Core path. Direct tests must cover token
values, timeline phases, pooled limits, queued multi-item delivery, non-mutating Next
lookahead, the six-tick Mutation cap, reduced-motion endpoint, and each item event.
Final evidence requires typecheck, full tests, build, fresh live screenshots for four
carriers plus Freeze, Collapse, Bomb, and Multiplier active/impact states, an item-marked
Next preview, no console/page error, one canvas/zero DOM cells, desktop plus compact
layout, and a renderer benchmark that supports the 60 FPS budget.
The T13.16 modal-compositor correction is now isolated and accepted as T15 Phase 1.5.
Its short correction history remains a separate rollback range and must not be bundled
with the later Settings or HUD checkpoints.

### T13.16 accepted delivery contract — modal compositor integrity

**T15 Phase 1.5 status (2026-07-28):** source candidate `5ab9e7d` is accepted from
rollback base `dfeb2c9`. The final state-dependent return restores the board only from
a playing origin; a paused origin remounts one Pause sheet and leaves focus with its
Continue action. The direct App test, typecheck, 25-file / 185-test suite, main and
clean 752-module builds, exact-SHA 20-case production matrix, 18-case pixel audit, and
generic browser client all pass. Independent code/rules, target/visual, and evidence-
integrity auditors accept the candidate with no product P0/P1. Coordinator acceptance
is recorded at `6b1b76f`; the candidate preview and detached worktree were released,
and `dfeb2c9..6b1b76f` was pushed non-force to `origin/main`. Phase 1.5 is closed and
Settings may now acquire its declared shared paths from this remote recovery point.

1. **A modal must visually sit above the complete live scene.** A fresh desktop browser
   audit found that Settings' DOM hit-testing is correct but its WebGL canvas can paint
   above part of the sheet in a compositor capture. While any `.sheet-backdrop` is
   mounted over an existing `GameSession`, the one Pixi canvas must remain mounted and
   visibly dimmed *under* the overlay, but it may not bleed through, obscure, or draw
   over Settings, Pause, Restart, Exit, or Puzzle-result sheet pixels. The first-entry
   rule sheet appears before `GameSession` exists and therefore correctly has zero
   canvas; it verifies sheet stacking over the mode page rather than the live-scene
   invariant. This is a presentation-stacking correction only; it must not hide the
   live board, add another canvas, recreate the runtime, or change focus/input routing.
2. **Bounded source scope.** Candidate `17ccc96` changed only `src/styles.css` and its
   direct `src/App.test.ts` assertions. Production-preview QA then rejected the wider
   slice because Pause → Settings let the outgoing sheet's delayed cleanup steal focus
   back to the canvas. The correction may additionally change only
   `src/ui/ActionSheet.tsx` and direct `src/App.test.ts` coverage to arbitrate generic
   sheet-to-sheet focus ownership. The verified Settings → Restart → Cancel endpoint may
   additionally change only `src/App.tsx` to perform its existing semantic
   `focusBoard()` return, plus the same direct test path. No arbitrary App delay, Core,
   renderer scene, GameRuntime, modal copy, panel composition, leaderboard, audio,
   persistence, or game rule may change.
3. **Acceptance.** Run the direct App test, typecheck, full current-source suite, and
   production build after the final source change. Fresh browser evidence covers all
   live-game sheets in the phase log at desktop and compact portrait, plus first-entry
   rules with its expected zero canvas. It must prove one stable canvas for live-game
   sheets, no overflow/page/console error, stable focus inside every active dialog and
   correct restoration after the final dialog closes—including Settings → Restart →
   Cancel after queued frames from both playing and paused origins. A playing origin
   must restore the same Canvas; a paused origin must remount one Pause dialog and keep
   focus inside it. Evidence must also visibly demonstrate through screenshot
   pixel probes plus human review that opaque sheet contents are never painted beneath
   the canvas. Release every
   Tetris-owned temporary listener/browser after capture; independent QA remains
   read-only until a candidate SHA exists.

### T13.15 accepted delivery record and frozen contract

1. **Puzzle completion is a small ceremony, not a generic game-over sheet.** On a
   Puzzle success, preserve the existing modal focus trap, keyboard/touch actions,
   replay action, and return-to-library action, but present a dedicated celebratory
   surface. Determine the outcome exactly once from the persisted best **before** the
   completion write: a first completion must visibly contain `恭喜你破解谜题`; a strictly
   lower piece count is a personal-record result with distinct copy; an equal or higher
   count is a successful replay without a false record claim. The surface may show
   only the outcome label and saved best; it must not show a generic completion-stat
   line such as `首次完成 · X 步 · Y 消行`, nor reintroduce a level name/ordinal, route
   hint, or solution. Its original
   tetromino-fragment/constellation animation must remain local, brief, and decorative
   only; reduced motion shows the same semantic end frame with no drifting or looping.
   It must not obscure the dimmed live board or steal focus from the first action.
2. **Survival bedrock remains the established brown block treatment.** It retains its
   exact typed board-cell semantics, collision, unbreakability, rise/removal timing,
   score path, and deterministic replay. Do not add a stone texture, fractured
   silhouette, shelf, or other geology treatment in this slice. Rendering remains
   presentation-only: no hitbox, board coordinate, debris, or line-clear behavior may
   change.
3. **Bounded implementation.** The celebration/UI checkpoint may change only
   `src/App.tsx`, `src/App.test.ts`, `src/ui/ActionSheet.tsx`,
   `src/ui/localization.ts`, and `src/styles.css`. The narrow bedrock-restoration
   checkpoint may change only `src/game/render/TetrisRenderer.ts`,
   `src/game/render/TetrisRenderer.test.ts`, `src/game/render/theme.ts`, and
   `src/game/render/theme.test.ts`; it restores the established brown raised block
   material and removes the rejected stone treatment. Neither checkpoint may change Core state,
   deterministic queues, persistence format, scoring, or dependencies.
4. **Acceptance.** Add direct first/best/replay-result tests and a brown-bedrock
   material regression test. After the last source change run typecheck, the complete suite,
   production build, and one real browser pass covering a first Puzzle completion, a
   record Puzzle completion, reduced motion, and a live three-row Survival opening at
   desktop plus compact viewport. Verify one canvas, no DOM cell grid, no overflow,
   no console/page errors, and no listener/ticker/audio/canvas leak. Independent QA
   remains read-only until a candidate range exists.

**Acceptance evidence.** Product source is `87aeeb5`; the reviewed chain is
`6f55982..7c8d110`, followed by independent acceptance `4b0938d`. Typecheck, 22 test
files / 166 tests, and the 746-module production build pass. The candidate-bound audit
at `.local/audits/t13.15/browser/report.json` renders first, record, replay, and
390 × 844 reduced-motion result sheets through the authoritative Level 01 public route.
Every result reports one canvas, zero DOM board cells, no overflow or page/console
error, no generic completion-stat line, and no empty description paragraph; reduced
motion reports no ceremony animation. The separate desktop Survival capture verifies
the restored three brown raised bedrock rows. QA verified that the audit only uses the
existing public DEV action/tick hooks and does not inject state.

### T13.14 accepted historical record

**T13.14 DIRECT GAMEPLAY CLARITY, MUTATION, AND SURVIVAL DEBRIS — accepted.** The
first replacement attempt `fe6db5f..7ab0886` remains historical diagnostic evidence:
the player correctly identified its structural empty quadrant. The second replacement
source `18fe992` restored the live board but its full-width Settings stack and nested
two-card forecast treatment were also correctly rejected. The final correction range
`e9db541..0bb2ba9` uses a connected Settings console and one ordinary dark two-row
Puzzle Next well; source `866ef0a` replaces the malformed hand-drawn queue marker with
readable loaded JetBrains Mono `1` / `2` digits. Coordinator gates passed typecheck,
22 files / 165 tests, and the 746-module production build; fresh desktop, short
landscape, portrait, and reduced-motion browser evidence passed. Independent QA
`b60511e` accepts the exact range with no P0–P2 finding. The previous T13.13 repair
remains historical evidence only where it conflicts with this accepted pass. The
user-owned uncommitted `package-lock.json` remains outside every checkpoint and must
remain untouched.

### T13.14 active delivery contract

1. **Preserve the completed selector baseline.** The centred numeral/tick replacement
   is already complete and is not reopened in this task: a completed card replaces its
   one centred number with one centred SVG tick, with no added badge or positional shift.
2. **Restore and clarify live surfaces.** The board visibly counts 3, 2, then 1 before
   input starts. Settings becomes compact and fully composed in the existing semantic
   order (controls, keyboard, rules, records). Survival rankings show duration and
   lines only. Puzzle removes the `通关目标` label and calls `已落子` `操作数`; its two
   upcoming pieces are visibly labelled in the rail, with no floating `②`. Classic and
   异变 display a gravity unit as `下落速度/格`. All non-wordmark UI typography receives
   stable, intentional hierarchy without unstable weight flashes.
   **Settings-composition correction:** no desktop or compact-mode sheet may retain an
   oversized content card, a vacant grid quadrant, a microscopic type treatment, or a
   row stretched solely to match unrelated content. Desktop and short landscape use
   one connected upper console: Controls and Keyboard share one aligned row as two
   equal-height sections of the same surface, with a deliberate seam rather than two
   detached cards. Controls use their own vertical rhythm for language, sound, and
   actions; Keyboard uses its complete two-column guide. Concise Rules and the useful
   Record strip follow below as independent content-sized bands. Portrait keeps the
   same semantic order vertically with readable type rather than forcing the desktop
   grid. Every mode and locale must use this single dense grammar; a record footer may
   reserve only its useful header/row height, never a visual placeholder. Every
   Settings, pause, restart, and exit sheet must keep the single mounted Pixi board
   visibly dimmed beneath it; a modal may block input but may never make the underlying
   game field disappear.
   Puzzle's two forecast pieces must reuse the ordinary single dark **Next** well as
   two simple stacked rows. Each row carries only a plain left-side `1` or `2` (with
   matching accessible Chinese/English descriptions) and its canonical piece; no
   split card, accent rule, detached legend, circular badge, pale label strip, nested
   card, or doubled preview border may reappear. Those order numerals use the loaded
   JetBrains Mono digit glyphs at a readable contrast and size; they are never
   hand-drawn strokes, a partial-corner glyph, or an icon substitute.
3. **Remove only music.** Delete the current music output, toggle, copy, and lifecycle
   while preserving adjustable original sound effects and their safe teardown. Do not
   fetch or bundle replacement music in this delivery.
4. **Mutation timer and visual contract.** Repeated Freeze, Collapse, or Multiplier
   collection sets the respective remaining timer to exactly 600 game ticks (10 s),
   never adds time. Multiplier may preserve the current deterministic 2×→4× progression
   but its time still refreshes. Carrier and activation presentation must distinctly
   show frost, heavy gravity, explosion, and score-light semantics; reduced motion
   shows their final semantic state. The live status makes active item and countdown
   obvious, while Bomb relies on its result rather than a rail explanation sentence.
5. **Survival debris contract.** Survival keeps its three opening bedrock rows and
   existing 13→6-second pressure. Bedrock becomes visually irregular stone. A seeded,
   renderer-independent falling-stone stream owns a random source separate from the
   ordinary seven-bag. It begins at a 20-second interval, then every due emission
   chooses one or two distinct legal visible-top columns, resets the elapsed clock, and
   shortens the following interval by one second to a 10-second minimum. Active stones
   use a deterministic integer 3:2 accumulator against the fixed Survival gravity, so
   their exact average speed is 1.5× without browser-time drift. They block the active
   tetromino and one another while falling; on contact they lock as a separate ordinary
   **clearable** stone cell. Any row they complete resolves through the normal score,
   line, and bedrock-reward path; an active tetromino and remaining stones map with that
   board resolution rather than overlapping, disappearing, or causing an extra spawn.
   Core tests must prove replay determinism, seven-bag isolation, interval floor,
   fall rate, legal spawn/collision, locking, and clear participation.
6. **Execution and acceptance discipline.** Commit the contract before source. Keep
   entry/UI, music, Mutation, and Survival changes as separately reviewable source
   checkpoints with their direct tests. The second UI correction may jointly change
   `src/App.tsx`, `src/App.test.ts`, `src/styles.css`, `src/game/render/TetrisRenderer.ts`,
   and its direct renderer test only to preserve the sheet backdrop and give the two
   Puzzle forecasts their own geometry; it may not change Core state, queues, or rules.
   After the last source change run one typecheck, full suite, build, and real browser
   batch across desktop/portrait/landscape/reduced motion. Recheck each requirement in
   more than one pass; do not label the task or any visible mechanism complete based
   only on static inspection. Independent QA remains read-only until a candidate range
   exists.

### T13.14 Survival atomic source-checkpoint exception

The Survival debris source claim is permitted to exceed the normal 500 handwritten-line
checkpoint budget, but not the ten-path cap. Its exact authorized paths are
`src/game/core/types.ts`, `src/game/core/constants.ts`, `src/game/core/engine.ts`,
`src/game/core/race.test.ts`, `src/game/render/theme.ts`,
`src/game/render/theme.test.ts`, `src/game/render/TetrisRenderer.ts`,
`src/game/render/TetrisRenderer.test.ts`, `src/App.tsx`, and
`src/ui/localization.ts`. A stone sentinel necessarily crosses typed `BoardMaterial`,
`GameState`, replay/hash, collision, Pixi material lookup, and DEV/browser evidence;
committing an intermediate Core-only or renderer-only half would either fail typecheck
or create a visible undefined material path. The UI paths are limited to concise rule
disclosure and a DEV state snapshot; they do not alter layout, leaderboard behavior,
or Puzzle content. Focused Core/render/App tests and typecheck are mandatory before the
source checkpoint; the final suite, build, browser evidence, and independent QA remain
separate later checkpoints.

### T13.13 active acceptance contract

1. **Selector clarity.** Incomplete level numerals remain centered and readable in
   every normal, selected, focused, reduced-motion, and English state. A completed
   level replaces that centered numeral with one obvious accessible SVG tick; it does
   not add a lower-status medallion, top-right ornament, title-side glyph, or text
   `√`. The selected completed name uses its completion colour; `当前最优步数：x步` /
   `Current best: x pieces` remains on the same stable heading line. The single
   selected real silhouette has no white artifact, stray fill, accidental emblem, or
   overflow.
2. **Settings and records.** Settings is rebuilt into a balanced compact control,
   keyboard/rules, and records composition with no unfinished empty visual column.
   If opened while paused, it overlays the pause state and its primary close action is
   directly **继续游戏 / Continue**; backdrop dismissal does the same. Settings leaderboards
   preserve five ranked rows but position their date at the row's far end without `·`
   separators.
3. **Rail and Next.** Remove the visual vertical divider between board and right rail;
   rebuild hierarchy through gap/surfaces. Next becomes an immediately legible
   forecast instrument. The Mutation status panel gains a clear vertical interval from
   both metrics and Next, and its Chinese multiplier copy changes from `倍增` to
   `加倍`, with `超级加倍` while promoted.
4. **Deterministic Mutation repair.** Any cleared cell belonging to a carrier must
   trigger its item exactly once, including nested row clears. Surviving siblings lose
   their carrier identity. Freeze/Collapse repeats add ten seconds to remaining time.
   Multiplier begins as 2× **加倍**, becomes 4× **超级加倍** when another multiplier is
   collected before expiry, and all later collections retain 4× while adding ten
   seconds. Bomb stays immediate. Core state/hash/events, scoring, replays, and direct
   tests must prove the behavior.
5. **Mutation visual/audio rebuild.** Replace the current visually noisy symbols,
   vague motion, and weak/generic item cues with four original, local, bounded
   material/activation/audio treatments. White-looking glyph debris is prohibited.
   Freeze, Collapse, Bomb, Double, and Super Double must be visually and audibly
   distinguishable without full-board flashes or continuous motion; reduced motion
   keeps the final semantic state.
6. **Verification.** Commit contract, Core, renderer/audio, and interface claims as
   separately reviewable checkpoints. Each source checkpoint runs focused tests. The
   final candidate must pass `npm.cmd run typecheck`, `npm.cmd run test`, and
   `npm.cmd run build`, plus real browser evidence at desktop, portrait, landscape,
   and reduced motion covering selector legibility/completion, preview cleanliness,
   paused Settings continuation, right-aligned dates, clear Next, one canvas/no DOM
   board cells, zero console errors, carrier activation, additive timing, and
   Double→Super Double scoring. Independent QA remains required before changelog
   acceptance and coordinator push.

### Authoritative active delivery goals (2026-07-24)

1. **Product boundary and future packaging readiness.** Work only in this standalone
   clean-room repository. Keep the page-facing plain-text `TetraMorph` title without a
   Chinese companion title, copied trade dress, or affiliation claim. Do not package
   yet, but keep browser
   lifecycle, storage, keyboard/touch, focus, audio teardown, responsive layout, and
   platform seams safe for a later desktop wrapper; do not add Electron/Tauri/native
   dependencies or an installer in this delivery.
2. **Four clearly different modes.** Classic and Survival begin each run from fresh
   random seven-bag sequences; Puzzle keeps fixed canonical queues. Classic ranks by
   cleared lines. Survival starts with three bedrock rows, uses fixed 40-tick gravity,
   raises pressure every three cleared lines from 13 seconds down to 6 seconds, and
   ranks by survival time. **异变** (the legacy internal `sprint` key may remain only as
   an implementation detail) uses a fresh random seven-bag like Classic, ends at
   top-out, and raises gravity every six cleared lines. Its random carrier tetrominoes
   are visibly marked; clearing any cell from that tetromino activates its single item.
   It ranks its top five by lines, score, then fewer pieces, and must read as a clear
   item variant rather than a Collapse run or a second Classic screen.
3. **Puzzle authoring and readability.** Keep twenty deterministic, legal 5–8-row
   endgames with unlimited ordinary input, no piece budget, no timed/volatile blocks,
   Z-confirmed undo, and two upcoming pieces. Levels remain all-open. Names are short structural
   Chinese labels. Fixed anchors are sparse, are never initial target cells/rows, sit
   directly above the target band, visibly affect a legal landing or post-clear state,
   and have two Core-replayed early-divergent routes. The selected preview must show
   real board cells, targets, and anchors clearly with cohesive material colors.
4. **Puzzle guidance and results.** Remove the current player-facing strategy/hint
   system entirely—no trigger, unlock condition, cue, route/step UI, or hidden command
   transcript. Keep routes only as regression evidence. Do not create or regenerate
   `Solutions/` images in this delivery. Persist each level's real minimum successful
   locked-piece count, show it compactly in the selector, and change only the Puzzle
   success primary action to `重来`; other modes retain `再来一局`.
5. **Visual, controls, and concise copy.** Keep entry/home/Puzzle pages calm and
   original: no decorative grids/stray horizontal rules, meaningless English/telemetry,
   invalid block glyphs, thumbnails, or clipped active pieces. Preserve clear selected
   preview motion and reduced-motion fallbacks. Promote the active mode name. The
   in-run right header becomes one accessible `设置` control; `S` opens the same sheet
   containing effects/music, volume, pause/continue, and confirmation-gated restart.
   The homepage mode cards are navigation only: they show no gameplay-rule, ranking,
   or personal-record prose. Each card retains only its name, identity mark, accent,
   and entry action; its clear rule copy appears once on first entry and later in
   Settings.
   Their action key keeps its own mode color through hover/focus/selection; selected
   state is communicated by a stronger card and mode hue, not a blue call-to-action.
   Text weight is static during card transitions so moving between modes never flashes
   a briefly bold label. Every other visible rule remains concise and factual.
   All two-action sheets expose visible `←`/`→` selection, and `Enter` activates the
   selected action; pointer, touch, Escape, and cancel behavior remain correct.
   Settings shows the current non-Puzzle mode's compact top-five leaderboard, including
   each result date; Classic and 异变 remain lines-first, while Survival remains
   duration-first. Persist only those five results for each live mode. Puzzle remains
   different: show only the selected level's minimum locked-piece count after completion
   (otherwise `尚未通关`), with no Puzzle leaderboard or extra progress view.
   In Settings itself, `←`/`→` selects actionable controls, `↑`/`↓` moves between
   control rows, and `Enter` activates the selected control; a compact visible
   shortcut reference is headed **键盘** and makes `S`, `P`, `R`, `Esc` return,
   selection/confirm, and Puzzle-only `Z` immediately discoverable. `Esc` opens the
   same confirmation as the in-run return button; confirmation sheets keep `←`/`→`
   selection and `Enter` confirmation. A focused volume range retains native arrow
   adjustment. Puzzle undo is never immediate: `Z` or its visible control opens a
   two-action `确认`/`取消` sheet, and confirmation restores the exact pre-lock
   checkpoint—the point when the previous input piece had just appeared. The selected
   completed Puzzle places `最少 N 步` directly above its **开始** action, without
   adding it to the selector matrix. Every mode's live right rail uses the same compact
   metric-card, Next-well, and keyboard-help rhythm; the four modes keep their own
   metrics but no mode may retain a visually incompatible ruled table or unrelated card
   treatment. 异变 reserves a concise live-effect status area for its active timer or
   immediate trigger result; it cannot hide an effect behind transient audio alone.
   In the Puzzle selector, remove the selected `X 行残局` label and all visible
   completion checkmarks; when the selected level is completed, use its name color—not
   an extra glyph or row-count label—to communicate that state. Preserve the compact
   personal-best count and concise anchor fact where applicable.
6. **Audio.** Rework every original event contour so 100% effects are distinct and
   audible but never electrical or harsh. Add only an original, user-gesture-gated,
   separately toggleable procedural music bed. At the default 100%, it must become
   audibly present after the next valid player gesture rather than remaining a silent
   allocation. The bed is original, wordless, and piano-like—clear soft attacks, short
   resonance, and a restrained melodic loop rather than electronic beeps, percussion,
   or an external track. A signed-in music service may be used only as a read-only
   listening/reference source; no subscriber or third-party recording is downloaded,
   embedded, or redistributed. It must stop or suspend correctly on mute, pause,
   restart, unmount, and browser audio suspension; no external media, samples, or
   copyrighted music.
7. **Verification, resource hygiene, and release.** After each source checkpoint run
   targeted tests. At the final candidate run typecheck, the current-source full suite,
   build, Core route replay validation (without walkthrough-image generation), and
   desktop/portrait/landscape browser evidence. Prove one canvas, zero DOM cell grid,
   no overflow/console error, reduced motion, controls/shortcuts, storage behavior,
   and audio/runtime teardown. Before and after long test/browser phases, inspect only
   Tetris-owned processes, ports, and memory; release only clearly idle Tetris
   resources, never shared Codex tooling. Then update logs/changelog, commit exact
   paths, push `main`, and state any remaining independent-QA blocker explicitly.
8. **异变 item contract (historical T13 wording; superseded by the active T15
   Phase-5 contract above).** The old `冻结`/no-gravity wording below is retained only
   as provenance and must not be implemented. An item carrier is at most one marked
   cell group per random
   input tetromino; a carrier appears only in 异变, never before the opening two pieces,
   never in Puzzle, and is generated deterministically from that run's fresh seed. Its
   four locked cells retain one carrier identity. Clearing any of those cells activates
   the item once and removes that identity from any surviving siblings. The first
   delivery contains: **冻结** (ten seconds without automatic gravity), **坍缩** (ten
   seconds in which each locked board settles by independent columns and resolves any
   resulting clears), **炸弹** (remove the bottom three board rows regardless of fill,
   award score, and count three cleared-line equivalents), and **倍增** (ten seconds of
   double points from normal clears and item clears). Timers are deterministic game
   ticks, stack by taking the later expiry for the same timed effect, and are visible.
   Carrier art uses one of four full, item-specific materials—ice blue Freeze, violet
   Collapse, ember-coral Bomb, or warm-gold Multiplier—plus an original core/halo
   treatment across the same tetromino. A bounded item-colored arrival pulse and
   activation flash/particle response make both the carried and triggered state clear;
   reduced motion preserves the special color/state without continuous motion. The
   variant's record schema must discard legacy Collapse rows while preserving valid
   Classic and Survival rows.
9. **Mode-rule disclosure.** The homepage selector removes visible rule/record prose:
   cards retain only their name, icon, accent, and entry action. The first entry into
   each mode instead presents one concise, dismissible, mode-specific rule sheet before
   live input begins; it must state objective, special mechanic, pressure or speed
   cadence, relevant item trigger/effects, and terminal condition. Settings adds a
   durable **规则** section with the same facts. Completion is stored safely per mode,
   supports pointer/touch plus arrow/Enter operation, does not alter Core state, and
   never changes Puzzle authored content.

10. **TetraMorph branding.** `TetraMorph` is the live product name: `Tetra` preserves
    the four-cell vocabulary and `Morph` names the game's changing board states. It
    replaces all current browser, loading, gameplay/library-header, and accessible
    brand labels; the old `Tetra`/`Tetris` strings remain only in historical
    documentation. The homepage's left-field `选择模式` heading is replaced by this
    single page-level wordmark, with no duplicate top-left brand, while mode cards stay
    navigation-only. The wordmark uses the actual locally bundled Google Font
    **Playwrite New Zealand Basic** in its requested bold treatment—not a variable-package
    fallback—with original, restrained mineral-light CSS; no network font request,
    copied logo, extra decorative grid/line, or Chinese subtitle is allowed.
    The source boundary is `index.html`, `package.json`, `package-lock.json`,
     `src/main.tsx`, `src/App.tsx`, `src/App.test.ts`, `src/ui/ActionSheet.tsx`, `src/ui/localization.ts`,
     `src/styles.css`, `src/game/core/puzzles.ts`, `src/game/core/puzzles.test.ts`, `src/game/core/types.ts`,
     `src/game/core/engine.ts`, and `src/game/core/puzzleUndo.test.ts`; current
     design/task records precede source, and final proof includes desktop/narrow/reduced
     motion browser evidence with no overflow or console errors.
    In Settings, the semantic `设置` title remains first; its visible content order is
    **控制**, a two-column **键盘** guide, concise **规则**, then the mode record or
    leaderboard last. The Settings keyboard guide is the complete former live-rail
    map (movement, rotate, soft/hard drop, Settings, pause, restart, Escape, and
    Puzzle-only undo); the right rail no longer duplicates it. Arrow/Enter behavior
    and the native focused-volume range stay unchanged. A persistent `中文`/`English`
    choice in that control section fully translates every live UI/aria/dialog/rule/
    leaderboard/library/touch string, English level display name, and canvas label;
    it updates the document language without changing any Core/puzzle/storage
    semantics. Homepage mode glyph cells are visibly enlarged and their inter-card
    separators are clearly legible structural lines, while the one home TetraMorph
    wordmark remains the only game title. Puzzle `Z`/touch undo is direct with no
    confirmation: it restores the deterministic pre-spawn checkpoint for the latest
    locked piece, then respawns that same piece at its normal top entry so it falls
    anew. It is unavailable before a lock and never changes target ownership or the
    fixed queue. In the selector, remove visible `固定锚点`; place `当前最优步数：x步`
     (or its English equivalent) beside a completed selected name rather than above
     Start, and replace the present heavy navy/purple scheme with a restrained
     light-mineral workbench, deep preview well, and clear selected/completed contrast.
     Clicking the empty dimmed Settings backdrop is equivalent to **继续**; the panel
     itself remains inert to dismissal. Live Puzzle deliberately omits the selected
     level name and all `1/20`-style ordinal/total copy from both the header and rail,
     while retaining only the original-block objective and practical counters. The
     selector owns renamed, concise, natural Chinese labels with full English display
     equivalents. Beyond the single Playwrite wordmark, interface/body headings use
     locally bundled Space Grotesk and compact data/keycaps use local JetBrains Mono;
     both retain robust Chinese fallbacks and may not require a network request.

### T13.9 authorized implementation boundary

This deliberately replaces the prior Collapse gameplay slice. Exact product/test paths
are `src/game/core/constants.ts`, `src/game/core/types.ts`, `src/game/core/engine.ts`,
`src/game/core/sprint.ts` and direct tests, any new isolated item helper/test,
`src/game/runtime/GameRuntime.ts` and direct test, `src/game/render/TetrisRenderer.ts`,
`src/game/render/presentation.ts` and direct tests, `src/App.tsx`, `src/App.test.ts`,
`src/styles.css`, `src/leaderboard.ts`, `src/leaderboard.test.ts`, and the existing
AudioEngine/direct test only for activation feedback. `src/game/input/InputController.ts`
and its direct test retain their narrow `Z`/Escape ownership work. The exact preceding
docs records may move with checkpoints; no package target, external media, or frozen
Puzzle authoring path may move.

### Historical reconciliation notes (superseded by the ledger above)

The following notes preserve the sequence of earlier corrections. An item is not
complete merely because a local implementation exists; it remains open until its
stated proof belongs to the final candidate.

1. **Puzzle anchor and curriculum repair.** Move the sparse fixed pegs out of original
   target rows and into visible headroom, retain only positions that materially change
   a legal landing or post-clear state, and keep all twenty boards approachable with
   multiple early-divergent solutions. Recompute the six affected routes (campaign
   01, 08, 13, 15, 16, and 18), update the schema route artifact, short structural
   names. Player-facing Puzzle hints are removed; walkthrough-image generation is
   deferred. Audit the selected preview so
   target cells, fixed pegs, and the actual endgame shape remain clear and compatible.
2. **Collapse correctness and presentation.** Verify the endless top-out-only rule,
   current-chain/best-chain/score/lines rail, absence of decorative horizontal rules,
   and local top-ten table sorted by lines, score, chain, then fewer pieces. Confirm
   incompatible timed Collapse rows cannot leak into the new table.
3. **Survival pressure.** Verify the seven-row opening, fixed 40-tick fall cadence,
   one-row reward per three lines, and the corrected 13-second-to-6-second pressure
   curve in both Core and visible play.
4. **Audio finishing pass.** Redesign every existing event contour so it is distinct,
   audible at the default 100%, and non-electrical/non-harsh. Add an original,
   user-gesture-gated optional procedural music bed with independent control and no
   persistent source after pause, restart, unmount, or browser suspension.
5. **Settings, hierarchy, and copy.** Make the active mode name prominent. Replace
   the right-header control cluster with a single accessible **设置** control and `S`
   shortcut; place effects, music, volume, pause/continue, and confirmation-gated
   restart inside it. Recheck every visible explanation: it must state only the mode
   objective, distinct mechanic, and ranking basis in concise factual language. Every
   two-action confirmation sheet must support `←`/`→` focus selection and `Enter` on
   that selected action.
6. **Puzzle completion record.** Persist each canonical level's lowest successful
   locked-piece count, show that compact best on the all-open selector, and retain
   graceful no-storage behavior. The Puzzle result primary action is `重来`, while
   non-Puzzle results remain `再来一局`.
7. **Final evidence and release.** After the source slices, run targeted tests, then
   typecheck, the current-source full suite, build, route replay/walkthrough
   validation (but no walkthrough-image generation), and real desktop/portrait/landscape browser evidence. Verify controls
   and shortcuts, one canvas/zero DOM cells, no overflow or console errors, reduced
   motion, and runtime/audio teardown; record the evidence, update the changelog,
   commit exact paths, push `main`, and report any remaining blocker explicitly.
   Before and after every long test/browser phase, inspect project-owned processes,
   listeners, and memory; release only clearly Tetris-owned idle resources, verify the
   release, and never terminate Codex-owned shared tooling or another project's work.

### T13.5 persistent Collapse, readable anchors, and faster Survival correction

The user accepts Collapse's column-settling play but rejects its 75-second cutoff and
the repeated horizontal rules in its right rail. This correction supersedes the
time-limit portion of T13.2: Collapse is an endless score/chain run that ends only at
ordinary top-out and retains the top ten top-outs, sorted first by cleared lines then
score, best chain, and fewer pieces. Its rail must expose score/current chain/best
chain/lines with no clock and no
decorative horizontal dividers through stats, Next, or controls. Existing timed
Collapse records are incompatible and must not be retained alongside the new mode;
valid Classic and Survival data continues to migrate.

The same user review reopens the fixed Puzzle anchor authoring boundary. The twenty
legal setup histories, fixed queues, unlimited ordinary play, B undo, selected-preview
contract, and five-through-eight-row bands remain; no volatile/timed Puzzle mechanism
may return. Reauthor only the sparse immutable-anchor subset, names, hint copy, and
route artifact as one Core-verifiable unit; local walkthrough images are deferred. Every anchor must be
above the initial target-row band, never overlap an original target, make at least one
landing or post-clear result differ from the no-anchor state, and retain two public
Core-replayed routes with an early lock divergence. Replace opaque level names with
short structural Chinese labels. Separately, Survival pressure changes from 15→8 to
13→6 seconds while retaining the one-second-per-three-lines curve, seven-row opening,
fixed 40-tick gravity, and three-line bedrock reward.

Authorized source/test boundary: Collapse Core constants/types/engine/sprint and
direct tests; leaderboard and persistence tests; App/App tests/styles; Survival
constants/race/runtime tests; and the coupled Puzzle definition/progress/route
artifact/direct-test paths, plus the removal of the existing hint UI and persistence.
No renderer primitive, package dependency, or
desktop package target is in scope. Before a candidate claim: run direct tests after
each checkpoint, then typecheck, the unqualified current-source suite, build, route
replay validation, and a desktop/portrait/landscape browser pass.

Cross-boundary exception: retiring the Collapse timer changes one inseparable behavior
across Core terminal state, local score schema, HUD/result text, and direct tests. Its
single source checkpoint may use the named Collapse/Survival/persistence/UI paths above
despite the ordinary ten-path budget; it may not capture any unrelated path.

Audio follow-up boundary: after the rule and Puzzle source checkpoints are stable,
perform one separate audio slice limited to the existing AudioEngine/runtime/app control
paths and their direct tests. It may improve event contours and add user-gesture-gated,
original procedural music with an independent control. Do not add third-party music,
network media, renderer dependencies, or a second canvas; verify mute/volume/pause/
restart/unmount lifecycle behavior before the final candidate.

Settings and copy follow-up boundary: this same App-level finishing pass may replace
the exposed right-header control cluster with one accessible **设置** trigger and its
`S` shortcut. The sheet may contain the existing effects/volume controls, the new music
control, pause/continue, and confirmation-gated restart; no game rule or Core input
mapping changes are implied. The header's current mode name becomes visually primary,
and visible mode descriptions are reduced to concise factual objective/mechanic/ranking
copy. `src/App.tsx`, `src/App.test.ts`, `src/styles.css`, the existing ActionSheet
component where necessary, and direct audio/runtime tests are the authorized UI scope.

### T13.2 fourth-mode Collapse correction

The user clarified that the rejected fourth mode is Sprint, not Puzzle. Puzzle is
closed: no further source, selector, preview, level, queue, anchor, undo, hint, or
visual changes are authorized. The coordinator may replace only the current Sprint
implementation and its direct Core/runtime/leaderboard/App/test bindings with a new
75-second **坍缩** score attack. It must apply independent per-column settling after
every lock and again after each clear, resolving resulting lines as a scoring cascade, rank completed rounds by
score/best-chain/lines/fewer pieces, and never present a rubble target, time-to-finish,
or `冲刺` label. Required source scope is the existing Sprint Core paths, constants,
types, leaderboard/persistence paths, relevant App bindings/tests, and styles; the
gameplay renderer may receive only the smallest event/presentation support needed for
the visible cascade state. This is a fresh mechanics candidate, not a claim that the
current excavation Sprint was accepted.

### T13.3 current Solution artifact routing

The current Puzzle product remains closed: this checkpoint may not change a Puzzle
definition, setup, queue, anchor, route, rule, selector, or visual surface. It owns
only the local walkthrough map. `Solutions/` must contain exactly the regenerated
current `Solution-1.md` through `Solution-20.md` files and their linked SVG snapshots,
each replayed from the schema-6 T13 artifact's primary public route. The walkthroughs
are evidence of one feasible route, never a unique-answer or mathematical-optimum
claim. The durable explicit generator belongs at
`tools/generate-puzzle-walkthroughs.mjs`, while stale T12 docs, images, candidate
scratch data, and obsolete local scripts move together—without deletion—to
`.local/audits/t12.6-walkthrough-legacy-20260724/`. `Solutions/` remains ignored;
the generator, its documentation, and archive record are versioned. Required proof is
one successful regeneration, twenty readable Markdown files with linked snapshots,
Core terminal validation for all routes, and a clean Git/local top-level map. The
2026-07-24 recovery produced exactly twenty `Solution-x.md` files with 265 linked SVG
snapshots; the versioned generator replayed all schema-6 primary routes to `finished`
with zero targets remaining. The `Solutions/` top level is now exactly those twenty
walkthroughs and their twenty image directories, while the retained legacy material is
under the documented `.local/audits/` route.

### T13.4 production-test discovery correction

Default `npm.cmd run test` currently discovers an ignored historical walkthrough test
under `.local/audits/`, whose relative imports intentionally no longer resolve after
the recovery archive move. This is a test-discovery boundary defect, not a Puzzle
route, Core, or gameplay failure. The coordinator may modify only the Vite/Vitest
configuration and direct test/documentation paths necessary to limit the default suite
to current `src/` tests. Historical tests below `docs/workstreams/` and ignored local
archives remain preserved evidence but are excluded from the product command.

Required proof is a default `npm.cmd run test` that completes with only current source
tests, followed by `npm.cmd run typecheck` and `npm.cmd run build`. Do not modify any
Puzzle source, rule, setup, queue, anchor, selector, preview, or visual surface in
this correction. Result (2026-07-24): the configured default suite now discovers only
23 current `src/` files and passes all 138 tests. Typecheck, build, and the final
desktop/portrait/landscape browser audit also pass on candidate `dc9acca`; the generic
web-game client still cannot cross the app's countdown because no deterministic
`advanceTime` hook exists, so the real-time browser audit remains authoritative.

### T13.1 feedback-correction checkpoint

The user rejected the decorative grid/telemetry treatment and the 40-line Sprint as
too close to Classic. Before final validation, the coordinator must complete one
bounded correction sequence:

1. **Quiet-surface visual checkpoint:** `src/App.tsx`, `src/App.test.ts`, and
   `src/styles.css` remove background field lines, technical/decorative copy, large
   ordinals, redundant counters/footer copy, arbitrary pixel stacks, and slanted
   pseudo-block ornaments. They retain four reachable mode actions, the one selected
   real Puzzle preview, 20 open Puzzle controls, all existing routes, 44 px controls,
   keyboard semantics, and reduced-motion final state. Only exact four-cell, connected
   mode glyphs may remain. The one real Puzzle preview must become more legible rather
   than more ornamental: larger actual cells, coherent high-separation material
   colors on its dark well, and a quiet distinct anchor accent; numeric stops stay
   sparse and never become thumbnails.
2. **Excavation Sprint checkpoint:** `src/game/core/sprint.ts` and its direct test,
   `src/game/core/constants.ts`, `src/game/core/types.ts`, `src/game/core/engine.ts`,
   relevant Core exports/rules tests, `src/App.tsx`, and `src/App.test.ts` may replace
   the empty-board 40-line target with a fresh-seed seven-row ordinary rubble field
   whose original opening cells must all clear through normal lines. It must preserve
   fixed brisk gravity, fresh live-mode seven-bags, lower-time Sprint ranking, and
   all non-Sprint rules. No Puzzle source, renderer primitive, persistence format,
   external dependency, or package target is in scope.
3. **Correction proof:** run the new direct Core/UI tests and typecheck after each
   source checkpoint; after the final source edit, rerun build and browser evidence
   for desktop, portrait, and landscape. The earlier whole-suite attempts are recorded
   as inconclusive: one 124-second default run and one single-worker no-output run
   were stopped rather than treated as passing. Do not claim final T13 completion
   until a complete suite result is obtained or a concrete, isolated blocker is
   recorded.

### T13 implementation boundaries and checkpoints

1. **Contract and file-map checkpoint (coordinator):** `docs/DESIGN.md`, this task
   file, `docs/progress.md`, and the T13 coordinator log define endgame provenance,
   all-open selection, anchor impact, direct shortcut parity, Sprint semantics,
   artifact routing, and the ordered reversible checkpoints before product edits.
2. **Input checkpoint:** `src/App.tsx`, `src/App.test.ts`,
   `src/game/input/InputController.ts`, `src/game/input/InputController.test.ts`, and
   `src/game/runtime/GameRuntime.ts`/its direct test own only P/R/Enter parity and the
   single-action pause sheet. `R` must request the same React confirmation as the
   visible restart control; it cannot restart via Runtime input.
3. **Endgame Core checkpoint (authorized atomic exception):**
   `src/game/core/puzzles.ts`, Puzzle direct tests, the route-search helper/tests, and
   `docs/workstreams/tetris-t13-core/puzzle-endgame-results.json` may move together.
   The twenty definitions, legal setup histories, target ownership, anchors, route
   evidence, and difficulty ordering are atomically coupled; this is expressly allowed
   to exceed the normal file/line budget. It changes no ordinary physics, renderer, or
   randomizer rule.
4. **Puzzle access and guidance checkpoint:** `src/puzzleProgress.ts`,
   `src/puzzleProgress.test.ts`, `src/puzzleHints.ts`, and `src/puzzleHints.test.ts`
   may replace the retired tier gate with all-open access and rebind compact,
   non-spoiling guidance to the schema-6 route evidence. Historic completion records
   remain valid player history; no Core rule, renderer, or generic storage migration
   is changed.
5. **Collapse checkpoint (authorized integration exception):**
   `src/game/core/types.ts`, `src/game/core/constants.ts`, `src/game/core/engine.ts`,
   `src/game/core/index.ts`, `src/game/core/sprint.ts`,
   `src/game/core/sprint.test.ts`, `src/game/runtime/GameRuntime.test.ts`,
   `src/leaderboard.ts`, `src/leaderboard.test.ts`, `src/App.tsx`, `src/App.test.ts`,
   `src/styles.css`, and `src/game/render/theme.test.ts` may change together only to
   replace Sprint with the 75-second 坍缩 score attack: settle each column after every
   lock and again after every clear, score chain depth, rank completed runs by
   score/chain/lines/pieces, persist the renamed record schema, and bind the exact
   HUD/home/result surface. These Core/persistence/UI/style paths are atomic because
   the revised `GameState`, storage schema, and four mode surfaces must typecheck as
   one behavior; this expressly permits the documented path/line-budget exception.
   No Puzzle source or visual surface, renderer primitive, dependency, or packaging
   target is included.
6. **Workshop presentation checkpoint (authorized visual exception):** `src/App.tsx`,
   `src/App.test.ts`, and `src/styles.css` own the all-open relay copy/layout/motion
   and the four-mode home treatment. The responsive four-band circuit, focus well,
   selection scan, reduced-motion fallback, and semantic test must move together, so
   this exact three-path UI/test checkpoint may exceed the normal 500-line source
   budget. It cannot be split without an intermediate selector that contradicts the
   open-workshop contract. It requires direct typecheck/App coverage before its local
   checkpoint and the final whole-range typecheck, suite, build, and browser pass. No
   Core authoring, storage migration, or desktop packaging target is mixed into it.
7. **Desktop-readiness checkpoint (no package):** `src/platform/browserPlatform.ts`,
   its direct test, `src/App.tsx`, `src/puzzleHints.ts`, `src/ui/ActionSheet.tsx`, and
   the smallest GameRuntime/AudioEngine paths plus their direct tests may make storage,
   visibility, timer, focus, keyboard, and audio capability loss safe to host in a later
   desktop shell. The adapter owns safe storage reads/writes, media-query subscription,
   timeout/frame cancellation, visibility/window listener teardown, focus deferral, and
   AudioContext construction; unavailable capabilities must become no-ops or default
   values rather than change a game run. Do not add Electron, Tauri, Capacitor, native
   dependencies, installers, signing, or an actual packaged artifact. Core rules, route
   artifacts, renderer primitives, and Vite browser delivery remain authoritative.
8. **Local recovery and archive checkpoint:** move stale ignored captures only into the
   documented `.local/` archive routes, regenerate `Solutions/Solution-1.md` through
   `Solution-20.md` plus their images from the final primary paths, and leave all such
   local files ignored. Do not delete material by wildcard or stage it.
9. **Final coordinator checkpoint:** after the last source edit, run the exact final
   typecheck, full suite, build, and one desktop/portrait/landscape browser evidence
   pass; record base SHA, ordered commits, exact paths, commands, local cleanup,
   evidence, desktop-readiness disposition, blocker, and next action in the T13 log; update changelog, commit the
   record, push `main`, and verify both Git and the supported local artifact map are
   clean. Independent read-only Core and visual/browser QA remains required before an
   acceptance claim.
10. **Gravity-workbench presentation refinement (authorized visual exception):** the
    user rejected the interim loose mode-card stack and sparse relay selector. Only
    `src/App.tsx`, `src/App.test.ts`, and `src/styles.css` may replace them with the
    documented unified four-lane mode field and compact endgame console: a single
    selected real preview plus a dense four-band, all-open numeric matrix. Preserve
    the 20-entry access contract, unique preview, no thumbnails/corner dots/lock
    states, B undo, 44 px controls, reduced-motion fallback, and all existing routes.
    The exact three-path visual/test unit may exceed 500 lines because responsive
    composition, keyboard semantics, and motion must remain coherent. It must not
    alter Core, persistence, package tooling, assets, or gameplay rendering.

---

# Current Task — T12.7 Multi-route Puzzle Guidance and Curriculum Calibration

Branch: `main`

Current base: repository-hygiene recovery record `c47b90c`. The T12.6 candidate and
its local walkthroughs remain valid recovery evidence, but its single-route artifact is
not sufficient for this task.

Current execution status (2026-07-22): **CANDIDATE VERIFIED — T12.7 deepens the T12.6
Puzzle campaign with replay-verified alternatives and a gradual in-game strategy
guide.** The player is never told that a recorded route is the only way through a
level. Every one of the twenty fixed-seed levels now has two real Core-replayed route
families whose locked placements diverge at lock one or two, while remaining an
approachable ordinary falling-block composition with three through seven
original-target rows and the accepted sparse immutable anchors.

The guide is Puzzle-only and presentation/persistence-only. It unlocks for a canonical
level after two placed pieces or twenty active seconds, persists through restart, then
offers a structural reading cue and two named verified strategy families. A chosen
family reveals one placement intention at a time; no guide button may dispatch an input,
change the queue, change completion, or reveal a mandatory raw command stream. `B`
undo remains the player recovery path. Classic, Survival, their random sequences,
physics, normal line resolution, renderer, audio, dependencies, and browser assets are
closed.

The curriculum audit may change authored patterns and their stable per-level seeds only
when the current stream cannot furnish two readable routes. Any retained or revised
level preserves its canonical ID, original-target win condition, anchor restrictions,
fixed deterministic Puzzle queue, and completion migration. Difficulty/order is
recomputed from all replayed routes, considering target rows, shortest route locks,
planning complexity, meaningful divergence, and recovery room; it cannot regress into a
forced trick. The selector's existing tier gate continues to state the canonical
two-completions-per-previous-tier rule.

The candidate audit found genuine alternate locked placements for all existing streams,
with alternate routes needing no more than two extra locks (and matching the canonical
lock count on levels 07 and 17). The authored patterns, seeds, IDs, and ascending
canonical difficulty order are therefore retained rather than churned merely to create
input variation. Candidate source checkpoints are `8ad3943` through `c17fdcd`; ignored
local `Solutions/` walkthroughs were regenerated from the retained canonical routes
only. Final coordinator validation passed `npm.cmd run typecheck`, the full Vitest
suite (47 passed / 1 skipped files; 294 passed / 2 skipped tests), `npm.cmd run build`
(744 modules), and live desktop/portrait/landscape browser audits. Independent
read-only Core and visual/browser QA remains required before any acceptance claim; a
user-authorized recovery push must remain explicitly pending that QA.

### T12.7 writer boundaries and checkpoint sequence

1. **Contract checkpoint (coordinator):** `docs/DESIGN.md` and this task file define
   the multi-route, sequence, hint-unlock, and verification contract before source
   changes.
2. **Route/curriculum checkpoint (coordinator):**
   `src/game/core/puzzles.ts`, its direct Puzzle tests,
   `src/game/core/puzzleRouteSearch.ts`,
   `src/game/core/puzzleRouteSearch.test.ts`,
   `src/game/core/puzzleSolverResults.test.ts`, and
   `docs/workstreams/tetris-t12-core/puzzle-solver-results.json` own only the authored
   curriculum, deterministic alternative search/replay, route metrics, and evidence.
   This checkpoint may exceed the normal line budget if all twenty route records must
   move together; it changes no live physics or game rules.
3. **Guidance checkpoint (coordinator):** `src/puzzleHints.ts`,
   `src/puzzleHints.test.ts`, `src/App.tsx`, `src/App.test.ts`, and `src/styles.css`
   own hint persistence, route-family presentation, unlock copy, responsive layout,
   and accessibility. It does not modify Core state or runtime input.
4. **Local reference recovery:** regenerate ignored `Solutions/Solution-1.md` through
   `Solutions/Solution-20.md` and embedded images from the new canonical routes after
   the route checkpoint. They stay ignored and are never staged.
5. **Evidence and handoff:** run focused route/persistence/UI tests, then exactly one
   final typecheck, full suite, build, and desktop/portrait/landscape browser pass
   covering the locked guide, both strategy choices, one-step disclosure, restart
   persistence, no gameplay mutation, and reduced motion. Record base SHA, exact
   candidate paths, commands, evidence, blocker, and next action in the T12 workstream
   log. Obtain independent read-only Core and visual/browser QA before an acceptance
   claim; a user-authorized recovery push must still state that it is pending QA.

---

# Current Task — T12.6 Layered Puzzle Curriculum and Current-Observatory Selector

Branch: `main`

Current base: accepted T12.5 coordinator publication `3709fa3`; prior source
checkpoints remain historical evidence. T12.5 source `d2469e3` is accepted and must
not be rewritten.

Current execution status (2026-07-21): **IN PROGRESS — T12.6 replaces the accepted
T12.5 shallow one- through four-row curriculum and campaign-atlas presentation with
a replay-verified three- through seven-row curriculum and a minimal animated current
observatory.**

T12.6 preserves the normal fixed-seed seven-bag, original-target-only win condition,
unlimited ordinary play after a route, local `B` undo, existing seven-tier unlock
semantics, one selected preview, and all Classic/Survival behavior. It changes only
the authored twenty Puzzle boards/route evidence, the QA replay that consumes an
authored route, and the library's presentation.
There are no timed pieces, piece budgets, altered row resolution, or hidden setup
cells. A small authored distribution of immutable single anchors is restored: anchors
are non-target cells, never count toward victory, stay at their world coordinates on
ordinary line clears, and are limited to zero, one, or two per selected board. They
must not occupy an initial original-target row or create an initial hidden-spawn
blocker; every placement requires a route replay. `01–03` use three original target rows, `04–06` four, `07–10` five,
`11–15` six, and `16–20` seven; every band is contiguous at the floor and every row
is initially incomplete. Within each band, verified Core routes must increase the
stable difficulty tuple `(targetRowCount, locks, rotations, horizontalMoves,
commandCount, id)` without a lower row-band appearing later.

The player-facing unlock statement remains explicit: levels `01–03` are open on a
new save; complete any two in the immediately preceding three-level tier to open the
next tier through `16–18`; complete any two of `16–18` to open `19–20`. Completion
IDs retain their migration behavior. The new selector is a text-light **current
observatory**: one dominant dark selected preview, a sparse numbered switchback route,
and only one occurrence of the selected level name/status/start action. The full unlock
policy is one compact always-visible transit line, not a prose dashboard. It must use a
one-shot observatory-field reveal and selected-well sweep motion, with a full
reduced-motion fallback; it must not reintroduce level thumbnails, corner dots, a
dot-progress system, cards, text walls, or the rejected atlas planes. The selector uses
bundled local Latin typography plus system CJK fallbacks only, so its first frame never
depends on a remote font request. Visible copy is number-led and deliberately sparse:
only the selected name/status/required fixed-anchor note/start action appear in the
focal stage, while the transit line is the sole explanatory sentence. Decorative
technical English, duplicate field labels, row counters, and section captions are out
of scope.

### T12.6 writer boundaries and checkpoint sequence

1. **Contract checkpoint (coordinator):** `docs/DESIGN.md` and
   `docs/CURRENT_TASK.md` define the three- through seven-row, current-observatory contract
   before source changes.
2. **Core-route checkpoint (coordinator):**
   `src/game/core/puzzles.ts`, `src/game/core/puzzles.test.ts`,
   `src/game/core/puzzleCampaign.test.ts`, `src/game/core/puzzleFlow.test.ts`,
   `src/game/core/puzzleSolverResults.test.ts`, and
   `docs/workstreams/tetris-t12-core/puzzle-solver-results.json` own the new boards,
   validation, replayed route metrics, and sorted campaign evidence. This checkpoint
   is explicitly allowed to exceed 500 changed lines because twenty complete authored
   board patterns and their twenty replay command streams must be reviewed together;
   it changes no physics or runtime interface.
3. **Selector checkpoint (coordinator):** `src/App.tsx`, `src/App.test.ts`, and
   `src/styles.css` own the current-observatory markup, state copy, responsive behavior, and
   motion. This checkpoint is explicitly allowed to exceed 500 changed lines only if
   replacing the former atlas selectors requires it; no renderer or gameplay path is
   included.
4. **Local recovery artifacts:** `Solutions/Solution-1.md` through
   `Solutions/Solution-20.md` and their embedded images are regenerated only after
   the Core route checkpoint. They remain ignored by the existing `Solutions/` rule,
   are never staged, and are inspected as local reference material.
5. **QA replay repair (coordinator):** `src/game/runtime/qaScenario.ts` and
   `src/game/runtime/qaScenario.test.ts` may consume the current recorded public
   route for `t5r-drift-08` only. This is a deterministic test-fixture update, not a
   new solver, simulation rule, or runtime game behavior.
6. **Evidence and acceptance:** after the last source change, run focused tests, then
   exactly one final typecheck, full suite, build, and desktop/portrait/landscape
   browser-evidence pass. Record candidate SHA/range and evidence; obtain independent
   read-only Core and visual/browser QA; only then append coordinator log/changelog,
   commit exact documentation paths, and push `main`.

The coordinator owns every checkpoint, local walkthrough generation, browser evidence,
independent-QA request/disposition, exact-path staging, changelog, and push. No other
repository, asset, audio, dependency, randomizer, line-resolution, or score path is
in scope.

---

Historical T12.5 task text (accepted at `3709fa3`) follows for provenance only.

Current execution status (2026-07-19): **IN PROGRESS — T12.5 replaces the unaccepted
T12.4 budget/reorder candidate with a low-pressure twenty-level Puzzle curriculum,
Puzzle-local undo, and a themed campaign-atlas selector.**
Independent renderer QA rejected T12.1 candidate `7ae1190..b0889c7` on a P2
fractional-edge scale overhang, so it is not accepted. Source `95c7da7` remains the
locally verified T12 baseline; T11 remains a recoverable baseline at `a76eea2`, pending
its separate independent QA disposition.

T12.5 keeps the twenty-level fixed-seed campaign and its completion-store compatibility,
but replaces T12.4's dense boards, retained anchors, solver budgets, and budget-driven
ordering before publication. Each new authored board is deliberately shallow and
intuitive: direct gaps first, ordinary rotations next, then clear two- through four-row
vertical channels. No new curriculum board has an anchor or timed input. Success is
strictly removal of all original targets; no count of placed pieces can fail a run.
Every selected route is revalidated through Core `dispatch()` as a clearability and
difficulty-order proof only, never as an optimum or player restriction.

Puzzle receives a current-run-only undo stack. `B` and an equivalent visible Puzzle
control restore the exact pre-lock checkpoint for the most recently locked piece,
including target ownership, board, active piece, queue/randomizer, timers, score,
lines, and piece count. The history never persists, changes seed/queue order, appears
in Classic/Survival, or becomes a QA state-injection surface. It is a no-op when there
is no prior lock.

A fresh campaign still opens `01–03`. The page must state the full gate rule visibly:
complete any two of `01–03` for `04–06`, then any two of each preceding three-level
tier for the next tier through `16–18`; complete any two of `16–18` for `19–20`.
Sealed rows remain readable yet inert. The archive visual is rebuilt as an original
campaign atlas with a restrained route/terrain hierarchy and one selected canonical
preview only—no entry thumbnails, corner dots, or ornamental progress dots.

### T12.5 writer boundaries and checkpoint sequence

This is one explicitly authorized atomic source checkpoint despite exceeding the normal
path and line budget. Its exact paths are
`docs/workstreams/tetris-t12-core/puzzle-solver-results.json`,
`scripts/capture-tetris-t3-evidence.py`, `src/App.tsx`, `src/App.test.ts`,
`src/game/core/engine.ts`, `src/game/core/puzzleCampaign.test.ts`,
`src/game/core/puzzleFlow.test.ts`, `src/game/core/puzzleSolverResults.test.ts`,
`src/game/core/puzzles.test.ts`, `src/game/core/puzzles.ts`,
`src/game/core/puzzleUndo.test.ts`, `src/game/core/types.ts`,
`src/game/input/InputController.test.ts`, `src/game/input/InputController.ts`,
`src/game/render/TetrisRenderer.test.ts`, `src/game/render/TetrisRenderer.ts`,
`src/game/render/presentation.test.ts`, `src/game/runtime/GameRuntime.test.ts`,
`src/game/runtime/GameRuntime.ts`, `src/game/runtime/qaScenario.test.ts`,
`src/game/runtime/qaScenario.ts`, `src/puzzleProgress.ts`, `src/styles.css`, and
`tools/solve-puzzle-campaign.cpp`. The Core/input/runtime writer owns the deterministic
rules and undo state; the UI/renderer writer owns atlas composition and presentation;
the coordinator owns the integrated checkpoint and all subsequent evidence/QA/docs.

The checkpoint cannot be split into individually typechecking commits: removing the
canonical budget field while adding `GameRuntime.undoPuzzle()` changes the Core state
contract, input mapping, runtime surface, React HUD, and renderer event handling at the
same time. The atlas markup and its responsive/reduced-motion selectors are likewise a
single visual contract. It changes no ordinary physics or row resolution. Required
whole-range verification is typecheck, direct Core/input/runtime/UI/renderer tests, the
full suite, production build, desktop/portrait/landscape browser evidence, and separate
read-only Core and visual QA before acceptance.

The coordinator owns the contract/progress/workstream logs, browser evidence,
changelog, exact-path staging, independent QA, and push.

The player-facing identity changes to the short plain-text `Tetra`. It makes the
four-cell falling-block vocabulary legible without a copied logo treatment or a visible
Chinese companion name. Browser title, loading shell, visible header, and accessible
live copy must no longer present `Tetris` as the game title.

T12 removes all volatile/expiring Puzzle input behavior, related renderer material,
HUD state, expiry events, audio, timers, and volatile support settlement. Puzzle inputs
are exclusively ordinary fixed-seed seven-bag pieces. Its sparse anchors remain, but
are now coordinate-pinned through every line-clear resolution: ordinary cells resolve
inside anchor-delimited vertical segments, target identity follows that exact movement,
and no anchor may be displaced by clearing a row below it.

The existing 0–100% header audio control stays in place. At 100% its master/headroom,
compressor, and sine envelopes must be materially louder without reviving the rejected
electrical landing sound or allowing an unclipped overlapping mix.

Survival's opening bedrock height changes from ten rows to exactly seven. Its existing
15→8-second pressure, three-line removal, fixed 40-tick gravity, restart behavior,
and ranking order remain unchanged.

### T12.1 archive worktable and active-piece boundary correction

T12.1 changes neither simulation nor campaign content. The 20-level archive remains
fixed-seed, text-first, and selected-preview-only, but its flat three-column card wall
is rebuilt as a calmer archive worktable: a continuous opened-count rail, clearly
separated catalog records, solid readable sealed states, and a single selected detail
instrument. It must not restore per-level thumbnails, upper-corner dots, or any
decorative progress-dot system.

The user-visible Survival screenshot also exposes a renderer-only defect: a normal
interpolated active piece can be drawn above the top board frame when the core piece
uses its hidden spawn buffer. T12.1 must preserve the hidden buffer and every core
deterministic/replay coordinate. It instead clamps the active group's rendered vertical
presentation at the first visible board row and removes a rotation-scale overhang while
that clamp is engaged. Ghost, lock, board, and Next rendering must retain their existing
contracts.

T12.1 allowed product/test paths are `src/App.tsx`, `src/App.test.ts`,
`src/styles.css`, `src/game/render/TetrisRenderer.ts`, and the direct renderer or
presentation test that proves the clamped active-group offset. It may update only this
task/design contract before source and the progress/workstream records after verified
source. It must not edit Core, Puzzle definitions, replay fixtures, sequence generation,
audio, storage, dependencies, or the formal changelog.

Required T12.1 candidate evidence: a direct renderer/presentation test exercises a
stale negative interpolation offset at the visible top row and proves no active group
can cross the well; targeted App coverage preserves 20 rows, exactly one selected
preview, three initially enabled entries, inert sealed entries, and accessible state
labels. Browser evidence at desktop and narrow mobile must visibly inspect the revised
archive, an initial Survival board, the outer board geometry, the active input, and zero
console errors. Then typecheck, full suite, build, and fresh independent visual/browser
and renderer QA are required before changelog integration or publication.

T12.1 local verification is complete for `7ae1190 fix(t12): contain active piece
presentation` and `b0889c7 feat(t12): refine puzzle archive worktable`: targeted
`src/App.test.ts` and `src/game/render/presentation.test.ts` pass (27 tests), followed
by final `npm.cmd run typecheck`, the full `npm.cmd run test` (41 files / 293 tests,
with 1 file / 2 tests skipped), and `npm.cmd run build` (741 modules). Browser review
has zero console errors at 1280×720, 390×844, and 844×390. It confirms 20 archive rows,
zero catalog thumbnails, exactly one selected preview, a semantic `3 / 20` progress bar,
and no horizontal overflow. A frozen real Survival frame records an active `J` at core
`y:20` while presentation remains stale at `y:19.542…` (`offsetY:-0.457…`); the visible
piece remains fully inside the board's top edge. This is candidate evidence only:
independent renderer and visual/browser QA remain mandatory before changelog integration
or publication.

### T12.2 renderer QA correction — effective-edge scale guard

Renderer QA found that T12.1 neutralizes a rotation pulse only for an unshifted source
edge cell or a numerically changed clamp. It misses an interior group whose unchanged
interpolation offset lands it exactly on the visible top/bottom edge (for example local
rows `1–2` at `-1 × unit`). The group then retains a `1.035` scale and may leak a
fractional face/stroke beyond the well. T12.2 must calculate edge contact from the
effective post-offset bounds and force scale `1` whenever either rendered group bound
touches an edge, regardless of whether the clamp changed its number.

T12.2 allowed product/test paths are `src/game/render/TetrisRenderer.ts`,
`src/game/render/presentation.ts`, and `src/game/render/presentation.test.ts`. It may
update only this task/design contract before source and the progress/workstream records
after verification. Core, spawn rows, collision, seeds, queues, replay fixtures, Puzzle
content, UI, styles, audio, storage, dependencies, and the formal changelog remain
closed. Required proof adds translated-to-top and translated-to-bottom regression cases
which retain their offset yet report effective edge contact; a fresh browser top-edge
capture plus typecheck, full suite, build, and renewed independent renderer QA are
required before candidate status is restored.

### T12.3 Puzzle double-Next, archive viewport fit, and local solution artifact

Puzzle now needs planning visibility for its next two fixed inputs. The renderer must
draw `queue[0]` and `queue[1]` as an ordered compact pair in the existing Puzzle Next
slot, with an explicit two-item label and accessible description. Classic and Survival
remain single-Next; no mode may mutate, pre-consume, randomize, or otherwise alter its
queue merely to display it. Ready/terminal states retain no preview.

Visual QA accepted the archive interaction/content at 1280×720, 390×844, and 844×390,
but found a small 1280×720 document overflow (`scrollHeight:765`), so T12.3 also reduces
the desktop archive shell height enough to keep the outer document within the viewport
while letting only the catalog scroll internally. The known renderer P2 remains open
until T12.2 is re-reviewed.

The requested Level 01 walkthrough is a local player artifact at
`Solutions/Solution-1.md`; `Solutions/` must be ignored by Git. Its content must be
derived from the fixed deterministic solver route, document every lock's board snapshot,
and name the route's Core-replayed verified lock count as a playable upper bound, not
as a mathematical optimum. It is not a product asset and must not enter the Git
candidate.

T12.3 allowed product/test paths are `.gitignore`, `src/App.tsx`, `src/App.test.ts`,
`src/styles.css`, `src/game/render/TetrisRenderer.ts`,
`src/game/render/presentation.ts`, and `src/game/render/presentation.test.ts`; the
ignored local artifact is `Solutions/Solution-1.md`. It may update this/design contract
before code and progress/workstream records after verification. Core rules, Puzzle
definitions, setup histories, seeds, queue generation, audio, storage, dependencies,
and the formal changelog remain closed. Required proof adds direct queue-preview tests,
desktop/portrait/landscape browser inspection of the second Puzzle preview, zero console
errors, no document-level overflow, and renewed independent renderer plus visual/browser
QA before formal acceptance or publication.

### T12.4 current Puzzle solver recalculation, campaign reorder, doubled budgets, and tiered unlocks

The user requires every Puzzle level—not only the former first level—to have a
correctly Core-replayed route before any difficulty, budget, or player walkthrough
claim is published. This supersedes all inherited `SOLVER_PIECE_BUDGETS` values and
old reference-route assumptions. The legacy fifteen-route fixture is historical input
only; it cannot itself be presented as a current solution or budget authority.

The solver record defines a finite public-command domain: legal move, rotation,
soft-drop, hard-drop, and required settlement ticks. It independently replays every
published route through `dispatch()` with the actual seed, target mapping, and
line-clear behavior. Its result field is `verifiedSolutionLocks`: a reproducible,
playable upper bound with exact command stream and replay digest, **not** a claim of
global mathematical optimality. Failed or timed-out searches are excluded from the
artifact rather than converted into a budget.

The recalibration keeps anchor mechanics but reduces unsupported coverage. Retained
fixed overlays are `t3r-shaft-01`, `t3r-shaft-03`, and `t5r-prism-11`; current
overlays without a verified route are removed. All IDs, authored boards, setup
histories, and seeds remain stable. `PUZZLE_DEFINITIONS` is reordered by ascending
`verifiedSolutionLocks`, with ties by `(anchor count, soft-drop commands,
public-command count, id)`. Each revised `puzzlePieceBudget` is exactly twice that
level's `verifiedSolutionLocks`, with no separate `+10` slack.

The new unlock frontier is tiered after that ordering: levels 01–03 are initially
open; levels 04–06, 07–09, 10–12, 13–15, 16–18, and 19–20 each open when any two
distinct canonical completions in the immediately preceding tier exist. Valid stored
completion IDs migrate without loss, unlocked IDs are always recomputed from the new
order, and a direct caller cannot record a completion for a still-locked level. The
archive must state the next tier condition concisely and accessibly.

T12.4 opens the following paths after its solver-contract checkpoint:

- `tools/solve-puzzle-campaign.*` and only directly related solver verification helpers;
- one committed solver-result artifact under `docs/workstreams/tetris-t12-core/`;
- `src/game/core/puzzles.ts`, its direct tests, and the current Puzzle campaign
  verifier/reference fixture only as needed to make the verified route bounds
  authoritative;
- `src/puzzleProgress.ts`, `src/puzzleProgress.test.ts`, `src/App.tsx`,
  `src/App.test.ts`, and directly related styles for tier-gate persistence/copy;
- `Solutions/Solution-1.md` as a deliberately ignored local player walkthrough,
  regenerated only after the reordering identifies the new level 01;
- `docs/DESIGN.md`, this task record, `docs/progress.md`, and the assigned T12 core,
  frontend, and coordinator logs.

T12.4 does not authorize changed physics, rotation, row resolution, authored
setup/board content, seed generation, audio, dependencies, browser assets,
or work in another repository. The source chain must keep solver infrastructure,
authoritative core data, progress migration, and archive UI as separately reviewable
checkpoints. After the last source change: run focused solver/replay/progress tests,
one final typecheck, full test suite, build, and one browser matrix covering a new
archive, tier unlock transition, Puzzle double Next, and the renderer top edge. Fresh
independent Core and visual/browser QA must accept the final contiguous candidate
before `CHANGELOG.md` integration or push.

> Historical T11 notes below are retained for traceability. T12.4 supersedes their
> Puzzle `+10` budget, legacy unlock, and anchor-coverage statements.

T11 replaces the old board-empty Puzzle goal with a target-clear budget. Every initial
ordinary authored cell is an original target, receives a renderer-owned special
marker, and remains a target while rows clear or it moves through the bounded volatile
settlement path. Every later player cell is non-target. The current budget X is the
shortest lock count among that level's verified deterministic solver routes plus ten
locks of fixed slack; success can occur on its Xth resolved lock, while remaining
targets after that lock produce an explicit Puzzle budget failure. Sparse anchor
overlays remain, but are seeded only into initially wholly empty visible rows so they
never share a starting row with target cells or prevent their objective. The in-level
statistics show remaining original targets plus an explicit locks-remaining countdown.
Volatile
five-second input expiry remains Puzzle-only and never makes a player lock a target.

Survival opens with ten unbreakable bedrock rows. The 15→8-second pressure and each
three-line bedrock removal remain, while gravity becomes one fixed faster cadence for
the entire Survival run: no line count can accelerate the active piece. Header restart
uses exactly `确认` with no description. Audio is re-authored as a sine-only,
envelope-shaped event palette, with the hard drop owning its landing sound so a lock
event cannot recreate an electrical buzz.

Classic and Survival receive a freshly generated run seed on every new run, restart,
or replay; Puzzle always retains the selected level's deterministic seed. When a
terminal Classic/Survival score survives leaderboard insertion, its row is highlighted
in the result table; otherwise the result sheet displays a compact non-qualification
notice.

Required T12 evidence before any publication: targeted core/replay/UI coverage for all
twenty fixed-seed levels and progressive unlock persistence; stationary anchors when
clearing both their own and lower rows; target-coordinate mapping through that
resolution; absence of any volatile timer, event, material, or HUD state; and boosted
bounded sine routing at full volume; and seven-row Survival opening/restart/pressure.
Then run typecheck, the full suite, build, and one browser action pass with the
locked/unlocked archive, visible target/budget state, and zero browser errors.
Independent Core and visual/browser QA must accept the extended candidate before
changelog integration or acceptance.

### T12 source-checkpoint exception — coupled rule migration

The following exact T12 candidate range is permitted to exceed the normal per-commit
path budget because it removes a required `GameState`/`GameEvent` contract across core,
renderer, audio, React HUD, DEV state, persistence, and direct tests while introducing
the twenty-ID campaign those consumers must type-check against. This is not file-count
bundling: any intermediate SHA which changes the typed volatile fields/events without
their consumers would fail the build, while the archive cannot expose its new IDs before
the core validates them. The coordinator owns the entire range and must run the whole
targeted matrix, final typecheck, full suite, production build, and browser pass.

Exact product/test paths: `index.html`; `src/App.tsx`; `src/App.test.ts`;
`src/main.tsx`; `src/styles.css`; `src/puzzleProgress.ts`;
`src/puzzleProgress.test.ts`; `src/game/audio/AudioEngine.ts`;
`src/game/audio/AudioEngine.test.ts`; `src/game/core/board.ts`;
`src/game/core/board.test.ts`; `src/game/core/constants.ts`;
`src/game/core/engine.ts`; `src/game/core/puzzleFlow.test.ts`;
`src/game/core/puzzleCampaign.test.ts`; `src/game/core/puzzles.ts`;
`src/game/core/puzzles.test.ts`; `src/game/core/types.ts`;
`src/game/render/TetrisRenderer.ts`; `src/game/render/theme.ts`; and
`src/game/render/theme.test.ts`.

T12 local verification is complete for the candidate: targeted matrix 14 files / 109
tests; `npm.cmd run typecheck`; full `npm.cmd run test` (41 files / 292 tests, with 1
file / 2 tests skipped); and `npm.cmd run build` (741 modules) all pass. The final
browser pass has no console errors and visibly proves Tetra home branding, a 20-row
archive with only 01–03 enabled, Puzzle target/budget/anchor state, and a seven-row
Survival opening. This is evidence for independent QA, not acceptance or changelog
authority.

Local candidate evidence now covers the target budget/state transitions, fixed ten-row
Survival opening and cadence, fresh ordinary-run seeds, fixed Puzzle selection, audio
event routing, restart confirmation, leaderboard result feedback, and target marker.
`npm.cmd run typecheck` passes; the final full suite passes (40 files / 288 tests,
with 1 file / 2 tests skipped); the final production build passes (741 modules).
The prescribed Race action capture shows ten bedrock rows and 40-tick fixed gravity;
the live Puzzle browser review shows the warm-gold target brackets, target/budget
statistics, Next preview, one canvas, and zero console errors.

Publication exception (2026-07-19): the user explicitly authorizes a recovery
push of the committed candidate to `origin/main`. This publication preserves a
recoverable remote checkpoint only; it does not replace the pending independent
Core and visual/browser QA or mark T10 accepted.

The correction also adds explicit header controls beside Pause: mute plus a
0–100% master-volume slider (default 100%), then a standalone `重新开始` button.
Clicking the header restart button must first open a confirmation sheet, whose
primary confirmation is available through Enter. The Pause sheet contains only
continue and exit actions. `R` remains the immediate deterministic restart during
play, pause, or terminal states. A compressor safety stage and louder distinct
feedback must make game events audible without placing browser audio APIs in
`src/game/core`.
Hard drop specifically uses a restrained paired sine landing thump instead of an
electrical-sounding waveform sweep. The local Classic leaderboard ranks by cleared
lines, while Survival ranks by `elapsedTicks` (longer survival first); both visible
primary labels must match their persisted sort order.

The shared Pixi canvas owns the dark Next well and canonical tetromino while the
DOM `next-slot` remains only a transparent geometry anchor. This prevents the
opaque compact information band from covering the Next rendering at narrow
viewports; the visible preview must equal `queue[0]` at desktop, portrait, and
landscape sizes.

---

# Historical Current Task — T9 Survival Descent and Puzzle Archive

Branch: `main`

Current base: `beb47643ca6e80cbdae2fbb2a7459b1d6fffc1e6`

Current execution status (2026-07-19): **T9 is authorized and in progress.**

Status: **CANDIDATE READY — pending independent Core and visual/browser QA**

T8 remains the accepted baseline at `32ed0c7`. T9 candidate range is
`502f978..15e6412`: it adds the five-layer opening, 15→8-second / three-line Survival
descent, a matching three-line gravity ladder, a prominent home `Tetris` heading, and
the Puzzle archive surface. Typecheck, 269 passed / 2 skipped tests across 40 files,
the 741-module production build, and browser inspection of the homepage, Puzzle archive,
and real Survival opening passed. Independent Core and visual/browser QA are required
before coordinator acceptance or push. The completed cleanup removes the archive
selection dot and all per-level miniature boards; it retains only the selected preview.
The requested unbreakable random cells and ten-second incoming-piece rule are a later
Puzzle-contract decision, not part of this candidate. This file retains earlier slice
contracts below as historical record.

## Slice N — progressive gravity and timed Survival pressure

Task ID: `TETRIS-T7-TIMED-SURVIVAL-MOTION-019`

Base: clean accepted and pushed coordinator tip
`d0bbb7dc32e0e625b5aa41a2e58453975057efb7`.

Core writer boundary:

- `src/game/core/constants.ts`, `src/game/core/types.ts`, `src/game/core/board.ts`, and
  `src/game/core/engine.ts`;
- directly related `src/game/core/race.test.ts` and `src/game/core/rules.test.ts`;
- `docs/workstreams/tetris-t5-core/THREAD_LOG.md` after source freeze.

Core acceptance is the exact gravity, timer, pending-rise, five-line removal, ordering,
pause/restart, overflow, replay/hash, and Puzzle-compatibility contract in `DESIGN.md`.
The Core checkpoint must keep Puzzle's thirty references unchanged and may not edit
React, Pixi, runtime, styles, dependencies, evidence, or coordinator documents.

Frontend/renderer writer boundary after Core source freeze:

- `src/App.tsx`, `src/App.test.ts`, and `src/styles.css`;
- `src/game/runtime/qaScenario.ts` and `src/game/runtime/qaScenario.test.ts` only to
  replace obsolete five-lines-raises-bedrock evidence with public-command timed-rise
  and five-line-removal evidence;
- `src/game/render/TetrisRenderer.ts` and its direct presentation/renderer tests only
  for brief deterministic bedrock rise/removal feedback;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md` after source freeze.

Frontend acceptance:

- remove the mode `.phase-seam` and action-sheet colored lead bar at every viewport;
- show the concise complete rules and direct fall cadence/countdown values frozen in
  `DESIGN.md`, including `40 秒`, `每 5 行`, `-2 秒`, and `最短 10 秒`;
- add only the bounded entrance, hover/focus, bedrock feedback, and urgency motion;
  reduced motion must suppress presentation transforms without altering rules;
- preserve exactly one canvas, zero DOM board cells, 44 px actions, lifecycle/input
  safety, layout, palette, ordinary tetromino geometry, Puzzle library, dependencies,
  and `index.html`.

Each writer creates exact-path source and log checkpoints without push. After the last
source edit, the coordinator runs exactly one final typecheck, full suite, build, and
browser-evidence pass, then routes the exact source and evidence to independent static
and visual QA before changelog integration or push.

Disposition: **ACCEPTED**.

- Core source `ff90d61` implements the shared Classic/Survival gravity curve, timed
  pending pressure, safe rise ordering, five-line one-row removal, pause/restart,
  overflow, replay/hash, and unchanged Puzzle cadence/references.
- Final product source `356440cf0f785b2558745c6eddd307b1654525e6` removes both
  decorative bars, exposes complete concise rules and direct cadence/countdown values,
  adds bounded home/bedrock feedback, and explicitly disables its transforms and
  transitions for reduced motion.
- Final gates passed: typecheck; 40 test files with 39 passed / 1 skipped; 269 tests
  with 267 passed / 2 skipped; 739-module production build; and a completed 25-capture
  browser matrix with zero unexpected errors.
- Evidence `9ef2708` proves the public-command first rise at 2763 ticks with one full
  `BBBBBBBBBB` row, then the five-line reward at zero bedrock / zero pressure / 38
  seconds. Independent static and visual QA both accepted with no P0–P3 finding and
  reproduced all 27 evidence hashes.
- Dependencies, `index.html`, Puzzle definitions/references, ordinary material tokens,
  and separate game repositories remain unchanged.

## Slice M — warm mineral bedrock recolor

Task ID: `TETRIS-T6-BEDROCK-RECOLOR-018`

Base: accepted and pushed T6 coordinator tip
`2c7e5f3352ceaae48db48f0134ed9970a6e3e696`.

One writer may change only:

- `src/game/render/theme.ts`;
- `src/game/render/theme.test.ts` for the exact token and contrast regression;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md` after source freeze.

Acceptance:

- change only `BEDROCK_MATERIAL` to the exact warm rock-brown tokens frozen in
  `DESIGN.md`;
- retain the existing bedrock geometry, divided facets, material rendering path,
  Survival behavior, five-line threshold, and all seven ordinary piece materials;
- both bedrock face endpoints keep at least 3:1 contrast against the board well and
  the material remains unequal to every tetromino material;
- run the focused theme test and typecheck before an exact-path source checkpoint;
- after the final source change, run exactly one final typecheck, complete suite,
  build, and browser-evidence pass; route the exact candidate to independent read-only
  visual QA before changelog integration or push.

No layout, copy, Core/runtime/Puzzle data, dependency, `index.html`, ordinary piece
palette, renderer geometry, or separate game repository change is authorized.

Disposition: **ACCEPTED**.

- Source `4b27a98` changes only the four `BEDROCK_MATERIAL` tokens and their direct
  regression. Contract `07fdbbf`; source-log tip `da39948`.
- Final gates passed: typecheck; 40 test files with 39 passed / 1 skipped; 263 tests
  with 261 passed / 2 skipped; 739-module production build; prescribed action client;
  and one completed 24-capture formal browser matrix.
- Independent static QA found no P0–P3 issue and reproduced 5.455291:1 / 3.248488:1
  face-to-well contrast. Independent visual/evidence QA accepted both wide Survival
  originals plus 24/24 captures and 26/26 raw-Git-blob checksums with zero browser
  error or integrity failure.
- Evidence `367a443` binds exact source `4b27a98` and candidate tip `da39948`; its
  public-command replay shows 24 cleared lines, four full bedrock rows, and canonical
  bottom row `BBBBBBBBBB`.

## Slice L — three independent mode rules

Task ID: `TETRIS-T6-THREE-DISTINCT-MODES-017`

Contract base: accepted and pushed T5 coordinator tip
`c0340b1d3e30007473da6a7a4ec0fed72a22df38`.

User-visible outcome:

- Classic is fixed-speed chain-score survival: 48 ticks per automatic cell for the
  full run; consecutive clearing pieces build a visible `连消` counter and score
  bonus, while any non-clearing lock breaks the chain;
- Survival replaces player-facing Race: it uses Classic's fixed 48-tick gravity and
  raises one permanent, unbreakable bedrock row from the bottom for every five
  cumulative cleared lines;
- Puzzle shares Classic's fixed 48-tick speed but starts from one of fifteen authored
  legal endgames and wins only when the complete canonical board becomes empty.

Core writer boundary:

- `src/game/core/constants.ts`, `src/game/core/board.ts`,
  `src/game/core/engine.ts`, and `src/game/core/types.ts`;
- directly related tests under `src/game/core/*.test.ts`;
- `src/game/render/theme.ts`, `src/game/render/TetrisRenderer.ts`, and their directly
  related tests only for the minimum type-safe bedrock material/render binding;
- `docs/workstreams/tetris-t5-core/THREAD_LOG.md` after the source checkpoint.

Atomic boundary exception: canonical bedrock widens `BoardCell` from
`PieceType | null` to `PieceType | BedrockCell | null`. The same source checkpoint
must therefore bind a real bedrock material and renderer path; casting the sentinel to
`PieceType`, leaving an undefined material lookup, or committing a typechecking but
runtime-broken intermediate state is forbidden. This exact Core + renderer bridge is
pre-authorized despite crossing the normal subsystem boundary and remains within the
default ten-path checkpoint budget.

Core acceptance:

- Classic, Survival, and Puzzle remain at 48 ticks after any line or piece count;
- Classic and Survival use fixed base line-clear scores `40 / 100 / 300 / 1200`;
  Classic alone adds `50 × (combo - 1)` after the first consecutive clearing piece;
- Classic combo starts at `0`, becomes `1` on the first clearing piece, increments on
  every immediately consecutive clearing piece, and resets on a non-clearing lock;
  Survival and Puzzle remain at combo `0` and receive no combo bonus;
- Classic and Survival keep compatibility `state.level` exactly `0` and emit no
  `level-up`; Puzzle alone preserves its invisible accepted score/event serialization
  so the thirty frozen solution event digests and final hashes remain unchanged, but
  gravity, UI, and success never read that level;
- Survival's internal key remains `race`, but it has no speed curve or successful
  line-count terminal state;
- each crossed five-line threshold clears/scores first, then shifts the remaining
  board up and adds one full bedrock row; bedrock blocks pieces, never clears, and
  overflow from the top ends the run before the next spawn;
- restart reconstructs zero bedrock, while deterministic replay/hash includes the
  canonical bedrock state and height;
- Puzzle board-empty success and continuous seeded seven-bag input remain unchanged;
- focused Core tests and typecheck pass before an exact-path source checkpoint.

Frontend/renderer writer boundary after Core source is frozen:

- `src/App.tsx` and `src/App.test.ts`;
- `src/styles.css` only for the renamed semantic statistic role;
- `src/game/runtime/qaScenario.ts` and `src/game/runtime/qaScenario.test.ts` only to
  replace obsolete Race-speed evidence with real Survival bedrock evidence;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md` after the source checkpoint.

Frontend acceptance:

- Classic statistics are exactly score, cleared lines, and current `连消`;
- no player-facing or DEV text snapshot describes a Classic level; the detached text
  snapshot exposes the current combo instead;
- every visible `竞速` label becomes `生存`; Survival statistics are score, cleared
  lines, and bedrock height, with no speed-tier copy;
- bedrock renders as a restrained coherent mineral stratum compatible with the frozen
  palette, visibly distinct from all seven tetromino materials and retaining readable
  unit seams;
- Puzzle retains its existing level/placed/cleared objective statistics;
- no layout, ordinary tetromino theme/geometry, control, countdown, dependency, or
  `index.html` change is authorized;
- focused App tests, typecheck, and the prescribed browser action client pass.

After the two source checkpoints, the coordinator runs exactly one final typecheck,
complete test suite, build, and browser-evidence pass. Each source boundary receives
independent read-only cross-QA. Formal evidence, changelog integration, and push occur
only after both verdicts accept the exact combined source candidate.

Disposition: **ACCEPTED**.

- Core + type-safe bedrock source: `34184cb`; frontend/runtime binding source:
  `5a3c35af325e4fa43841190e8acfb4867c8f1ebc`; source-log tip: `2308d80`.
- Final gates passed: typecheck; 40 test files with 39 passed / 1 skipped; 263 tests
  with 261 passed / 2 skipped; 739-module production build; one formal browser pass.
- Independent Core QA accepted `34184cb`. Independent combined browser QA accepted
  `34184cb + 5a3c35a` after a 695-command public replay reached 24 cleared lines and
  four canonical bedrock rows at desktop and portrait with zero browser errors.
- Formal evidence `a26d989` binds 24 captures to exact source `5a3c35a` and candidate
  tip `2308d80`; independent evidence QA inspected 24/24 original PNGs and reproduced
  26/26 raw-Git-blob SHA-256 entries with zero integrity failure.
- `index.html`, dependencies, Puzzle definitions/references, accepted ordinary
  tetromino geometry/palette, and every separate game repository remain unchanged.

## User-visible problems to resolve

1. Keep the page named only `Tetris`, preserve the accepted composition and divided
   facet geometry, and apply only the exact coordinated `雾昼矿物` light retone frozen
   in `DESIGN.md`.
2. Keep the dedicated entry page with separate Classic (`经典`), Race, and Puzzle
   entrances. The internal `marathon` key remains compatibility-only.
3. Make Race endless accelerating normal play. It has no line target and stops only
   through player exit or top-out.
4. Rebuild all fifteen Puzzle levels as difficult authored endgames generated from
   explicit legal tetromino stacking histories: automatic gravity, replenishing seeded
   seven-bag input, no finite piece budget, every level unlocked, exact source-piece
   colors, and at least two proven successful routes per level.
5. Keep all level layouts, copy, frontend composition, block language, and assets
   original. Similar games are abstract mechanics research only.
6. Remove the current engineering-dashboard vocabulary, oversized slogan, custom
   brand glyph, `青流方阵` name, grid/coordinate/route decoration, clipped corners,
   oversized level cards, rounded ceramic/jelly blocks, stepped mode bands, legacy
   `路线` copy, and bracket-style ghost cells.
7. Remove repeated descriptions of ordinary play. Visible copy is limited to names,
   controls, score/statistics, completion state, and the immediate objective; full
   ARIA labels remain available without duplicating prose visually.

## Baseline policy

- Do not reset or rewrite `dd7e31e`; it remains a historical ancestor.
- Do not merge the rejected T4 preservation branch into T5.
- Migrate the valid 44 px and real-UI QA requirements into T5, not the old T4 styling.
- Do not modify T3/T4 screenshots, manifests, fixtures, capture scripts, or logs.
- New fixtures, logs, and browser evidence use T5-specific paths.
- Frontend candidate `b480e7db93aa7b6f2b2a1feb160985f4aa42e493` and its evidence
  child `9b7e552e83426d5578d86010571a4cbce83616ac` are rejected visual history.
  They must not be pushed or described as the current frontend baseline.
- Frontend candidate `c9135f3252abfa3bd6d7e94c5eb2e11fc3c72a18` is the second
  presentation rejected by the user. It must not be accepted through local font or
  copy fixes and is not the visual baseline for the next writer.
- Preserve from `c9135f3` only the verified lifecycle, accessibility, input/rule
  behavior, and detached `structuredClone` QA snapshot regression. Its rounded mode
  bands, ceramic cell material, page composition, and copy are superseded.
- Local commit `e552b3c86e59b801f6d69045a94211e3f1c97e34` completed the rejected
  bright spectral surface immediately before the latest user review. It is a clean
  historical checkpoint only. It must not receive independent acceptance, formal
  evidence, changelog integration, or push.

## Slice A — T5 Core

Task ID: `TETRIS-T5-PUZZLE-NORMALPLAY-002`

The Race and leaderboard work in candidate `3bf170ec252cc971b1f65d73b4649fabb2500dbb`
remains eligible. Its finite authored Puzzle queues, budget failures, no-gravity rule,
and single-route fixtures are superseded. The uncommitted removal of the live
`replayScenario` state-injection surface is retained as part of this slice.

The core writer may change only:

- `src/game/core/constants.ts`, `engine.ts`, `puzzles.ts`, `types.ts`, `random.ts`, and
  `index.ts` if public exports require it;
- directly related tests under `src/game/core/*.test.ts`, including a new focused
  Puzzle-flow test if useful;
- `src/game/runtime/qaScenario.ts`, `qaScenario.test.ts`, `GameRuntime.ts`, and
  `GameRuntime.test.ts` to migrate obsolete finite-Puzzle QA and permanently remove
  live state-replacement/replay injection;
- `src/leaderboard.ts` and `src/leaderboard.test.ts` for endless-Race records;
- `src/puzzleProgress.test.ts` only to replace hard-coded old 3–5-piece completion
  fixtures; `src/puzzleProgress.ts` remains forbidden;
- `src/game/render/presentation.test.ts` only to replace hard-coded old Puzzle queue
  expectations; renderer/presentation production files remain forbidden;
- `docs/workstreams/tetris-t3-rules/tests/campaign.verifier.test.ts` only to decouple
  frozen T3 evidence from current T5 production definitions and verify the unchanged
  historical artifacts internally; T3 fixtures/logs remain forbidden and the test
  must stay in full Vitest discovery;
- new or revised `docs/workstreams/tetris-t5-core/**` authoring helpers, fixtures, and
  `THREAD_LOG.md`.

The core writer must not edit `src/App.tsx`, `src/styles.css`,
`src/puzzleProgress.ts`, `src/game/render/**`, T3/T4 evidence, coordinator docs,
changelog, or the frontend log.

Core acceptance:

- no Race line count produces `finished`;
- Race speed uses locked pieces plus cleared lines, grows monotonically, and reaches
  its safe cap;
- each Puzzle definition has one stable seed and an original 8–12-row board meeting
  the topology constraints in `DESIGN.md`; numeric difficulty and finite queues/budgets
  are removed from production authority;
- Puzzle shares Marathon automatic gravity, scoring, SRS, lock/entry/clear timing, and
  continuously replenishing deterministic seven-bag generation;
- sampling 84 pieces per level proves twelve full seven-bags without exhaustion;
- every level has two deterministic successful public-command routes for the same seed,
  each using 18–35 pieces and meeting the semantic route-diversity metrics in
  `DESIGN.md`; verifier execution uses 70 locks only as a non-product guard;
- canonical board empty is success; an unsolved board never fails because a queue or
  budget ended, and normal top-out remains the gameplay failure;
- restart produces the exact authored board, seed, randomizer, and hash;
- mounted runtime exposes no replay or canonical-state replacement hook;
- focused tests and the new T5 verifier pass;
- after the last Core source change, one typecheck, one complete Vitest suite, and one
  build pass without weakening or deleting historical evidence checks;
- candidate SHA and exact evidence are logged before independent read-only QA.

## Slice B — T5 Frontend

Task ID: `TETRIS-T5-FRONTEND-001`

Base SHA: `630fb30e115db9d0b4e6328e679987f9e8608939`

Core QA result: **ACCEPT** — focused 22 files / 140 tests, typecheck, and diff check
passed independently.

Frontend result: **REJECTED BY USER** at candidate `b480e7d`; coordinator evidence
child `9b7e552` is obsolete. The path list and acceptance bullets below are retained as
historical slice evidence only and do not authorize further Aqua Blueprint work.

The frontend writer may change only:

- `src/App.tsx`;
- `src/styles.css`;
- `src/puzzleProgress.ts` and `src/puzzleProgress.test.ts`;
- `src/game/render/theme.ts`;
- `src/game/render/TetrisRenderer.ts`;
- `src/game/render/presentation.ts` and its test when necessary;
- new components under `src/ui/**`;
- directly related frontend/presentation tests when required;
- new `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The frontend writer must not change core rules, Puzzle definitions/fixtures, build
configuration, dependencies, T3/T4 evidence, changelog, or coordinator docs.

The rejected slice's detailed visual acceptance is archived in its workstream log.
Only its verified lifecycle, accessibility, progress, and mode-rule behavior may be
retained; its brand, page composition, CSS language, and cell renderer are forbidden
as the new visual baseline.

## Coordinator final integration

After both accepted slices and the last product change, run exactly one final:

1. `npm.cmd run typecheck`;
2. `npm.cmd run test`;
3. `npm.cmd run build`;
4. T5 browser-evidence pass at every required viewport.

Browser evidence must use visible UI, exercise at least three consecutive Puzzle locks
under automatic gravity, and compare visible level, placed-piece count, active piece,
and Next preview with canonical state. Internal state replacement is not valid setup
evidence.

The coordinator routes the exact combined candidate to independent read-only QA,
resolves findings with newly bounded writer slices, updates
`docs/logs/CHANGELOG.md`, commits the documentation delta, and decides whether to push.

## Slice C — final QA snapshot isolation fix

Task ID: `TETRIS-T5-FINAL-QA-FIX-001`

Base SHA: `9b7e552e83426d5578d86010571a4cbce83616ac`

Independent final QA result on the base: **REJECT** with one blocker. The DEV-only
`window.__TETRIS_D4_QA__.collect()` surface returns the object from
`GameRuntime.getState()` directly, so page script can mutate canonical state through
the returned reference. All other audited areas passed, including the visual review,
evidence checksums, `index.html` boundary, typecheck, and targeted tests.

Status: **superseded as a standalone slice**. The exact state-isolation requirement is
carried into Slice D so no work continues against the rejected visual candidate.

The frontend fix writer may change only:

- `src/App.tsx`;
- one directly related frontend test file under `src/**` when needed;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The writer must not change `GameRuntime`, core rules, renderer, styles, Puzzle data,
dependencies, `index.html`, coordinator documents, changelog, or any committed browser
evidence. The implementation must make `collect().state` a detached structured clone
without adding any state setter, replay injector, or replacement hook. A regression
test must mutate nested fields of the returned snapshot and prove the source canonical
state is unchanged.

After the fix candidate is independently accepted, the coordinator regenerates the
T5 browser evidence against the exact new product SHA, reruns the final gates required
after the last source change, and routes the exact evidence child to independent QA
before changelog integration or push.

## Slice D — clean light `Tetris` frontend replacement

Task ID: `TETRIS-T5-FRONTEND-REDESIGN-002`

Result: **REJECTED BY USER** at candidate
`c9135f3252abfa3bd6d7e94c5eb2e11fc3c72a18`. Independent review additionally found
8–11 px mobile statistic text and legacy `路线` copy. The slice below is historical
evidence only and grants no further write authority.

Base SHA: coordinator documentation child of
`1ec551ef902bd331b411cee95e35d2f8e879eb51`.

The frontend writer may change only:

- `src/App.tsx` and `src/styles.css`;
- `src/game/render/theme.ts` and `src/game/render/TetrisRenderer.ts`;
- `src/ui/ActionSheet.tsx`;
- new or directly related frontend/renderer tests under `src/**`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The writer must not change `index.html`, dependencies, Vite/build configuration,
`src/game/core/**`, Puzzle definitions/references, `GameRuntime`, input/audio/storage
semantics, `puzzleProgress.ts`, `presentation.ts`, coordinator documents, changelog,
historical T3/T4 evidence, or committed T5 browser evidence.

Implementation requirements:

- preserve the existing conditional `home → puzzle-library → game` lifecycle, the
  `GameSession` key, async mount disposal guard, media-query cleanup, pointer capture,
  and exact one-runtime/one-canvas teardown behavior;
- use plain text `Tetris` for visible branding, the canvas label, and startup live
  message; remove `青流方阵`, its glyph, English brand subtitle, blueprint labels,
  coordinates, route decoration, page grid, diagonal band, ticks, cut corners, and
  giant marketing copy;
- home: compact introduction plus three 96–112 px rounded horizontal mode bands,
  lightly stepped on desktop and all visible without scroll at 390 × 844;
- Puzzle: compact six-row selector plus selected details; desktop uses list/detail
  columns, mobile expands the selected row in place; no sticky overlay may cover a row;
- game: one coherent rounded surface with a dominant board and one right information
  rail on desktop, compact information above the board on mobile, and controls aligned
  with that surface; retain existing test IDs and DOM geometry anchors;
- renderer: rounded ceramic cells with same-hue lower edge and restrained top
  highlight; active/locked/ghost remain distinguishable; ghost is a complete rounded
  outline; Board and Next reuse the primitive; remove cut corners, universal thick
  outline, bracket ghost, blueprint ticks, and Pixi `NEXT` text duplication;
- DEV `__TETRIS_D4_QA__.collect().state` is a detached structured clone. Direct tests
  mutate snapshot `status`, `active.x`, `queue[0]`, and a nested board cell and prove
  canonical runtime state and nested identities remain isolated;
- visible mobile body copy is at least 12 px, statistics at least 14 px, touch labels
  at least 11 px; every button remains at least 44 × 44 CSS px;
- retain reduced-motion, accessible action-sheet, keyboard/touch, mode rule, all-level
  availability, continuous Puzzle stream, and endless Race behavior unchanged.

Writer validation order: targeted frontend tests while editing, then after the final
source change one typecheck, one complete Vitest suite, one production build, and a
writer browser smoke at desktop plus 390 × 844 and 360 × 800. Record exact paths,
commands, screenshots inspected, and candidate SHA; do not push.

After the writer candidate, independent read-only visual/functional QA must accept the
exact SHA before the coordinator replaces all obsolete T5 browser evidence across the
five required viewports. Only the final evidence child may proceed to changelog and
push.

## Slice E — light neo-tech minimal `Tetris` frontend

Task ID: `TETRIS-T5-FRONTEND-TECH-MINIMAL-003`

Product source baseline:
`c9135f3252abfa3bd6d7e94c5eb2e11fc3c72a18`

Writer base: the coordinator documentation commit that introduces this Slice E
directly above the product baseline.

The single frontend writer may change only:

- `src/App.tsx`;
- `src/App.test.ts`;
- `src/styles.css`;
- `src/game/render/theme.ts`;
- `src/game/render/TetrisRenderer.ts`;
- `src/ui/ActionSheet.tsx`;
- one new directly related renderer test under `src/game/render/**` if required,
  excluding `presentation.ts` and `presentation.test.ts`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The writer must not change:

- `index.html`;
- `package.json`, `package-lock.json`, `vite.config.*`, or `tsconfig*.json`;
- `src/main.tsx`;
- `src/game/core/**`, `src/game/runtime/**`, `src/game/input/**`, or
  `src/game/audio/**`;
- `src/game/render/presentation.ts` or `presentation.test.ts`;
- `src/puzzleProgress.ts`, `src/puzzleProgress.test.ts`, `src/leaderboard.ts`, or
  `src/leaderboard.test.ts`;
- `DESIGN.md`, `CURRENT_TASK.md`, `progress.md`, or `docs/logs/CHANGELOG.md`;
- `docs/qa/evidence/**`, historical T3/T4 workstreams/evidence, or existing committed
  T5 evidence.

Implementation requirements:

- preserve the conditional `home → puzzle-library → game` lifecycle, `GameSession`
  key, asynchronous mount disposal guard, media-query cleanup, pointer capture, and
  exact one-runtime/one-canvas teardown behavior;
- preserve the detached `collect().state` structured clone and the direct regression
  that mutates `status`, `active.x`, `queue[0]`, and one nested board cell without
  changing canonical state or nested identities;
- keep home and Puzzle library at zero runtimes and zero canvases; gameplay mounts
  exactly one Pixi runtime/canvas and never creates a DOM gameplay cell grid;
- use plain-text `Tetris`, the frozen light neo-tech minimal tokens, a single 1+2 mode
  surface, and the one-shot `phase seam`; do not reintroduce grids, CAD, scanlines,
  technical English decoration, badges, toy/glass styling, marketing hero copy,
  settings rows, floating card piles, or stepped rounded bands;
- the small selected-mode visual, if present, uses an original four-cell edge-lit
  plate composition and remains functional/subordinate rather than a brand mark;
- Puzzle stays one coherent all-enabled selection surface. `App.tsx` may read-only
  import the existing `CAMPAIGN_LEVELS` initial boards to derive one SVG/path
  silhouette, but it must not copy, mutate, or redefine canonical Puzzle data;
- the game stays one coherent surface with a flat information dock and one integrated
  five-action control deck;
- renderer cells use the 3–4 px edge-lit plate primitive in both Board and Next, with
  no white highlight bar, thick lower lip, ceramic/jelly bevel, detached unit shadow,
  universal dark outline, cut corner, or bracket ghost;
- remove player-visible legacy `路线` copy. Use `解法`, `本局`, or `对局` only when
  semantically correct;
- at 390 × 844 and 360 × 800 all three mode entrances are completely visible. At
  844 × 390 there is no clipped copy, overlap, horizontal overflow, or accidental page
  scroll;
- computed mobile body/touch copy is at least 12 px, statistic labels at least 14 px,
  statistic values at least 18 px, and every button at least 44 × 44 CSS px;
- preserve reduced motion, accessible action sheets, keyboard/touch controls,
  all-level Puzzle availability, continuous deterministic Puzzle play, and endless
  Race behavior unchanged.

Writer validation order: targeted frontend tests while editing, then after the final
source change one typecheck, one complete Vitest suite, one production build, and one
browser smoke covering 1440 × 900, 2048 × 1152, 390 × 844, 360 × 800, and 844 × 390.
The writer must inspect the actual captures, record computed text/button sizes and
exact changed paths in the workstream log, create one candidate commit, and not push.

After the candidate, independent read-only visual and functional QA must accept the
exact SHA before the coordinator regenerates T5 evidence or updates the changelog.

## Slice F — narrow Puzzle goal and portable evidence correction

Task ID: `TETRIS-T5-FRONTEND-NARROW-COPY-FIX-005`

Base SHA: coordinator contract child of rejected evidence commit
`221c8218b338abeaae6be4e3d73d24fb74550c76`.

Status: **PRODUCT ACCEPTED** at
`56288cde99f8121fd2bb6be51836385fb9d30883`; the old six-level formal evidence remains
rejected and is superseded by the later fifteen-level direction.

Independent visual QA found that `narrow-puzzle-360x800.png` ellipsizes the essential
Puzzle goal to `清空完整棋...`. Independent static QA also found that the evidence
generator hashed the Windows CRLF working-tree bytes of `browser-evidence.json`, while
Git stored the normalized LF blob; exact-commit verification therefore matched only
17 of 18 listed evidence files. All other visual, interaction, scope, and evidence
checks passed.

The single frontend fix writer may change only:

- `src/styles.css`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The writer must not change `App.tsx`, renderer/theme, tests, Core/runtime/Puzzle data,
`index.html`, dependencies/build configuration, coordinator documents, changelog, or
any evidence path.

Product acceptance:

- at 360 × 800 Puzzle gameplay shows the complete `清空完整棋盘` value with no
  ellipsis or clipping and computed `scrollWidth <= clientWidth`;
- statistic labels remain at least 14 px, values remain at least 18 px, touch labels
  remain at least 12 px, and all visible buttons remain at least 44 × 44 CSS px;
- the fix redistributes narrow Puzzle statistic space rather than hiding copy,
  scaling the page, or changing gameplay content;
- 390 × 844 Puzzle, 844 × 390 gameplay, all mode-home layouts, Board/Next geometry,
  one-canvas/zero-DOM-cell behavior, and all accepted rules remain unchanged;
- after the final source change, run one typecheck, one complete Vitest suite, one
  production build, and a bounded 360/390/844 browser comparison; inspect the actual
  captures, log exact computed values, create one candidate commit, and do not push.

Independent read-only product QA accepted the exact two-path candidate: the complete
goal measured `clientWidth == scrollWidth` at 360/390/844, retained 18 px values and
44 px controls, and produced one canvas, zero DOM cells, no overflow, and no console
errors. Because the user then expanded the campaign, the coordinator does not
regenerate the obsolete six-level evidence. The final combined evidence must later:

- write generated JSON and checksum text with explicit LF bytes before hashing;
- regenerate the complete required first-viewport capture set against the accepted
  product SHA;
- prove every `SHA256SUMS.txt` entry against the exact commit's raw Git blobs;
- route the new evidence child through independent static, browser, and visual QA
  before changelog integration or push.

## Slice G — fifteen-level multi-color Puzzle core

Task ID: `TETRIS-T5-PUZZLE-CAMPAIGN-15-006`

Status: **CORE ACCEPTED** at
`48a229ef55b94d7b6e1de4ba88539bebb1909ec0`. Independent read-only QA accepted the
exact commit with a clean worktree and no blocking finding.

Product base: `56288cde99f8121fd2bb6be51836385fb9d30883`.

Writer base: `ef2d7472eeb2cf461c5408101f045207605334ec`.

The single Core writer may change only:

- `src/game/core/types.ts`;
- `src/game/core/puzzles.ts`;
- `src/game/core/puzzles.test.ts`;
- `src/game/core/puzzleCampaign.test.ts`;
- `src/game/core/puzzleFlow.test.ts`;
- `src/puzzleProgress.test.ts`;
- `docs/workstreams/tetris-t5-core/search-puzzles.mjs`;
- `docs/workstreams/tetris-t5-core/puzzle-references.json`;
- `docs/workstreams/tetris-t5-core/THREAD_LOG.md`;
- at most one new reference-builder helper under
  `docs/workstreams/tetris-t5-core/` when required.

The Core writer must not change `engine.ts`, `random.ts`, `puzzleProgress.ts`, React,
CSS, renderer/theme, runtime/input/audio, dependencies, `index.html`, coordinator
documents, changelog, or formal browser evidence.

Core acceptance:

- production exports exactly fifteen all-enabled definitions; the old six IDs, seeds,
  occupancy masks, and two route placement streams remain compatible;
- nine new definitions have original names, unique nonzero seeds, original occupancy
  masks, 9–12 occupied rows, six or more occupancy-row shapes, four density classes,
  covered cavities in five or more columns, and at least eight buried holes;
- every starting board is deterministically colorized with at least five piece types,
  and all seven types occur across the campaign; this salted color pass never consumes
  or changes the gameplay randomizer;
- geometry validation normalizes every occupied character before measuring topology,
  so colors cannot fake row-shape or cavity diversity;
- every seed still produces twelve consecutive complete seven-bags in the first 84
  pieces and replenishes indefinitely in production;
- every one of the fifteen levels has two same-seed 28–35-lock successful routes
  through production `createInitialState` and public `dispatch` only; each route uses
  all seven incoming types, six landing columns, six effective rotations, three setup
  locks, and three separated clear phases; paired routes have at least three semantic
  placement differences and an intermediate board-hash divergence;
- search may use at most two concurrent seed processes and unique ignored outputs;
  failed seeds/candidates are replaced rather than weakening route or topology gates;
- after the final Core source change, run one typecheck, one complete Vitest suite,
  one production build, and the complete 30-route verifier. Inspect exact generated
  references, log commands/results, create one Core candidate commit, and do not push.

Independent read-only Core QA must accept the exact Slice G candidate before Slice H
starts. A Core-only 15-level candidate is not releasable through the six-row frontend.

## Slice H — `经典`, multi-color palette, and fifteen-level library

Task ID: `TETRIS-T5-FRONTEND-CAMPAIGN-15-007`

Status: **FUNCTIONAL CANDIDATE READY** at
`248ca89551ce1293abe88e651c9953e132c816be`, but **VISUALLY REJECTED / SUPERSEDED** by
the user's request for a more premium page and bright redesigned blocks. It is a clean
fallback, not a release candidate and not eligible for formal evidence or push.

Product base: independently accepted Slice G candidate
`48a229ef55b94d7b6e1de4ba88539bebb1909ec0`.

Writer base: the coordinator acknowledgement commit that opens Slice H.

The single frontend writer may change only:

- `src/App.tsx`;
- `src/App.test.ts`;
- `src/styles.css`;
- `src/game/render/theme.ts`;
- one new focused `src/game/render/theme.test.ts` if useful;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The frontend writer must not change Core/Puzzle definitions or references,
`puzzleProgress.ts`, renderer logic, presentation/runtime/input/audio, dependencies,
`index.html`, coordinator documents, changelog, or formal browser evidence.

Frontend acceptance:

- all player-facing mode copy and accessibility labels say `经典`; no visible
  `马拉松` remains. Internal `marathon`, `enter-marathon`, and CSS mode keys remain
  unchanged for deterministic compatibility;
- Board and Next use the exact seven-piece mineral-signal palette frozen in
  `DESIGN.md`; it is more varied than the rejected blue-only set and does not use the
  standard commercial piece-color mapping or a toy-rainbow treatment;
- the canonical multi-color starting board is visible in gameplay. Any library
  silhouette groups canonical cells into a bounded number of SVG paths by piece type,
  not a DOM cell grid and not a copied decorative layout;
- every `六关`/`六个` hard-code is removed. Copy and aria derive the exact count from
  `CAMPAIGN_LEVELS.length`;
- desktop and 844 × 390 show one continuous 3 × 5 all-enabled level matrix beside the
  selected detail/start region, with all fifteen rows/buttons inside the first
  viewport at 844 × 390; 360/390 use a two-column matrix and a separate in-flow detail
  region, with normal library scrolling allowed;
- all fifteen entries stay mounted, enabled, keyboard/touch reachable, and carry the
  existing `level-row`, `data-level-id`, `aria-pressed`, and stable start selectors;
- real UI proves selection/start for the first, middle, and fifteenth levels and
  matches canonical `puzzleId`, name, active piece, Next, and multi-color locked cells;
- preserve the accepted 1+2 home, phase seam, complete 360 px goal, 44 px controls,
  12/14/18 px type floors, one-canvas lifecycle, accessibility, reduced motion,
  continuous Puzzle, and endless Race;
- after the final frontend source change, run one typecheck, one complete Vitest
  suite, one production build, and the five-viewport browser matrix. Inspect actual
  captures, log exact values, create one frontend candidate commit, and do not push.

Slice H's functional and responsive results carry into Slice I, but its visual QA was
stopped when the user rejected the finish. No Slice H formal evidence is regenerated.

## Slice I — premium spectral surface and bright precision blocks

Task ID: `TETRIS-T5-PREMIUM-BRIGHT-BLOCKS-008`

Status: **REJECTED BY USER** at local commit
`e552b3c86e59b801f6d69045a94211e3f1c97e34`. It is unpushed and is not eligible
for QA or evidence. The path list and acceptance bullets below are historical only and
grant no further Slice I authority.

Product base: rejected-as-final but functionally complete candidate
`248ca89551ce1293abe88e651c9953e132c816be`.

Writer base: the coordinator contract commit that opens Slice I.

The single frontend/render writer may change only:

- `src/App.tsx`;
- `src/App.test.ts`;
- `src/styles.css`;
- `src/game/render/theme.ts`;
- `src/game/render/theme.test.ts`;
- `src/game/render/TetrisRenderer.ts`;
- at most one new focused test under `src/game/render/`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The writer must not change Core/Puzzle definitions, references or routes,
`puzzleProgress.ts`, presentation/runtime/input/audio, dependencies, `index.html`,
coordinator documents, changelog, or formal evidence.

Slice I acceptance:

- all 28 piece material values exactly match the bright luminous-spectrum table in
  `DESIGN.md`; no muted material from `248ca89` remains;
- Board and Next share one precision-slab renderer primitive with 1.25–2.5 px radius,
  one fine same-hue dark edge, no permanent inner perimeter, no detached unit shadow,
  and no candy/ceramic/mineral bevel. Active uses only a low-intensity light-color
  aura; locked is flat; Ghost is a full fine outline with at most 3% fill;
- canonical silhouettes use the same bright mapping, at most one path per present
  piece type, and no DOM gameplay grid;
- page refinement uses the exact `spectral glass light` tokens in `DESIGN.md`: ice
  base, near-white translucent surfaces, cyan/cobalt/violet state families, and coral
  only as a small Puzzle/selection signal. It replaces template-like flatness with
  controlled depth, tighter type/spacing hierarchy, and the single three-stop spectral
  rail. It does not add a dark neon theme, uncontrolled rainbow, decorative telemetry,
  repeating page grid, marketing hero, external font/asset, or copied trade dress;
- the 15-level matrix remains continuous. Selected state is unmistakable without
  becoming a floating card; repetitive cell copy is shortened without hiding names;
  at 360/390 the fifteenth odd item spans the two-column row instead of leaving an
  empty half-cell, and the selected detail remains outside/after the list;
- HUD, Next, statistics, and the five-action control deck read as one coherent game
  instrument rather than repeated rounded cards. All existing selectors, action order,
  labels, 44 px controls, 12/14/18 px floors, complete goal, and accessibility remain;
- visible `经典`, endless Race, continuous Puzzle, exact 15 all-enabled levels,
  first/eighth/fifteenth canonical bindings, seven locked colors, 1+2 mode home,
  reduced motion, and one-canvas/zero-DOM-cell lifecycle do not regress;
- the writer runs targeted theme/renderer/App tests while iterating and the prescribed
  real Playwright action client after each meaningful visual change. After the final
  product source change, run one typecheck, one complete suite, one production build,
  and one five-viewport browser matrix; inspect every library, home, and gameplay PNG,
  create one candidate commit, and do not push.

Independent read-only functional and visual QA must accept the exact Slice I candidate
before the coordinator regenerates explicit-LF formal evidence, updates the changelog,
or decides whether to push.

## Slice J — legal authored Puzzle endgames

Task ID: `TETRIS-T5-PUZZLE-AUTHORED-ENDGAMES-009`

Status: **ACCEPTED** at Core checkpoints `ee0d996` and `2d282b6`, with final frozen
product/source SHA `26ef004dc4ab11de8caeee6605bbe21044c5d950` after Slice J-R.
Independent read-only QA accepted the contiguous range
`50be21d70abab887051b85d412a102f0b77eb9d2..676d804c2be74b107d429c61639ecc03e70e6509`.

Product base: rejected visual checkpoint
`e552b3c86e59b801f6d69045a94211e3f1c97e34`; its accepted mode/runtime behavior
remains the deterministic base, but its visual result is not accepted.

Writer base: the coordinator documentation commit that opens Slice J directly above
the product base.

The single Core writer may change only:

- `src/game/core/puzzles.ts`;
- `src/game/core/puzzles.test.ts`;
- `src/game/core/puzzleCampaign.test.ts`;
- `docs/workstreams/tetris-t5-core/search-puzzles.mjs`;
- `docs/workstreams/tetris-t5-core/build-puzzle-references.test.ts`;
- `docs/workstreams/tetris-t5-core/puzzle-references.json`;
- at most one new directly related authoring/reference helper under
  `docs/workstreams/tetris-t5-core/`;
- `docs/workstreams/tetris-t5-core/THREAD_LOG.md`.

The Core writer must not change `engine.ts`, `random.ts`, `pieces.ts`, `board.ts`,
runtime/input/audio/render/frontend paths, `puzzleProgress.ts`, dependencies/build
configuration, `index.html`, coordinator documents, changelog, or formal browser
evidence.

Slice J acceptance:

- remove `BOARD_COLOR_SALT`, `colorizeBoardRows`, random hole excavation as production
  authority, and every per-cell color draw;
- keep the fifteen IDs, names, order, and gameplay seeds, but replace all masks and
  all thirty route/reference streams;
- each definition owns a separate setup seed and 16–22 explicit
  `{ type, rotation, x }` placements. Type must match the setup seed's next seven-bag
  draw; landing `y` is derived by ordinary hard drop and is never authored/injected;
- public-command setup replay starts from an empty Marathon board, uses rotation,
  horizontal movement, and hard drop only, produces zero line clears/top-out/hidden
  occupancy, and byte-matches the production Puzzle board;
- every source owner remains exactly four cells matching its canonical tetromino
  rotation and material type. Same-type source pieces do not share an orthogonal edge,
  so every visible same-color component is one recognizable tetromino;
- every endgame occupies 8–12 rows, uses all seven types, has at least seven row
  shapes, four density classes, five covered-cavity columns, and eight buried holes;
  masks are pairwise unique with Hamming distance at least 20;
- every level retains automatic gravity and the indefinitely replenishing gameplay
  seven-bag, and has two public-dispatch successful routes of 30–42 locks meeting the
  strengthened diversity thresholds in `DESIGN.md`;
- the reference verifier proves all thirty routes, the fifteen setup replays, and the
  first 84 gameplay pieces as twelve complete seven-bags. Search uses at most two
  concurrent processes; failed candidates are replaced rather than weakening gates;
- after the last Core source change, run one typecheck, one complete Vitest suite, one
  production build, and the complete setup/route verifier. Inspect the exact reference
  JSON, log paths/commands/results, create one candidate commit, and do not push.

Independent read-only Core QA must accept the exact Slice J candidate before Slice K
opens. The old random-color masks, state hashes, reference SHA, screenshots, and
routes are rejected evidence and may not be reused.

## Slice J-R — migrate the stale Puzzle browser-QA route

Task ID: `TETRIS-T5-QA-ROUTE-MIGRATION-009R`

Status: **ACCEPTED** at source checkpoint
`26ef004dc4ab11de8caeee6605bbe21044c5d950`; runtime log checkpoint `aab0dc9` and
Core final-gate log checkpoint `676d804` are accepted read-only records.

Trigger: the post-source full suite passed 39 files / 251 tests and failed only
`src/game/runtime/qaScenario.test.ts` because `PUZZLE_CHALLENGE_QA_ROUTE` still owns
the rejected pre-Slice-J first-level placements. The new first level retains the same
35-lock / 22-line public-command completion contract.

The runtime-QA fixture writer may change only:

- `src/game/runtime/qaScenario.ts`;
- `src/game/runtime/qaScenario.test.ts` only if a direct assertion must change;
- `docs/workstreams/tetris-t5-runtime/THREAD_LOG.md`.

Slice J-R acceptance:

- replace only the frozen `PUZZLE_CHALLENGE_QA_ROUTE` placement stream with the new
  signed first-level route; do not import the large reference JSON into production
  source and do not alter Race fixtures;
- preserve `replayPuzzleChallenge` as public `start` / rotate / move / hard-drop /
  tick dispatch only, with 35 locks, 22 lines, deterministic hash, finished status,
  completed `t3r-shaft-01`, and next level `t3r-shaft-02`;
- do not change Core, engine, timing, rendering, frontend, input/audio/storage,
  dependencies, `index.html`, coordinator documents, changelog, or evidence;
- run the focused `qaScenario.test.ts`, explicit-path stage/diff checks, create one
  bounded runtime-QA source checkpoint, and do not push.

After Slice J-R is green, the Core writer runs the still-pending single final build and
complete 15-setup / 30-route verifier; the already completed final typecheck and full
suite attempt remain recorded, but acceptance requires one green complete suite after
the fixture migration. Independent QA reviews the contiguous Slice J + J-R range.

## Slice K — `暮海矿物` theme and minimal visible copy

Task ID: `TETRIS-T5-DEEP-MINERAL-MINIMAL-010`

Status: **REJECTED BY INDEPENDENT QA** at log candidate `9c128ab`; frozen product
source `1b1bfdbf150afa6708859b81cf12cd876b77d320` remains the repair base only.

Product base: independently accepted Slice J + J-R candidate
`676d804c2be74b107d429c61639ecc03e70e6509`.

Writer base: the coordinator documentation checkpoint that opens Slice K directly
after the accepted product base.

Commit-policy plan: use bounded linear source checkpoints rather than one opaque UI
commit. Theme/renderer, visible App composition/copy, and CSS surface/responsive finish
are separate reviewable claims when their hand-authored range would otherwise exceed
500 lines. Each checkpoint keeps its direct tests green; the expensive final gates and
browser matrix run once after the last product-source change.

The single frontend/render writer may change only:

- `src/App.tsx`;
- `src/App.test.ts`;
- `src/styles.css`;
- `src/game/render/theme.ts`;
- `src/game/render/theme.test.ts`;
- `src/game/render/TetrisRenderer.ts`;
- at most one new focused renderer test under `src/game/render/`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

The frontend writer must not change Core/Puzzle definitions, setup histories,
references/routes, `puzzleProgress.ts`, presentation/runtime/input/audio, dependencies,
`index.html`, coordinator documents, changelog, or formal evidence.

Slice K acceptance:

- implement the exact `暮海矿物` page tokens and seven-piece four-value table in
  `DESIGN.md`; page and pieces form one natural, coordinated deep spectrum with no
  fluorescent, candy-rainbow, or clashing complementary accents;
- replace the blurred luminous material with the frozen matte anodized primitive:
  135-degree low-delta fill, 1.25–1.75 px radius, one 0.75–1 px dark edge, no locked
  shadow/inner ring/highlight, active using one signal edge and no BlurFilter, zero-fill
  Ghost with one 1 px signal outline, and Board/Next sharing the primitive;
- use solid page/control surfaces. The phase seam is the only page gradient; remove
  backdrop blur, ambient color blobs, gradient CTA, glow shadow, and plastic/glass
  styling. Preserve measured AA and at least 3:1 board-cell contrast endpoints;
- home visibly contains only `Tetris`, one `选择模式`, the three names, their terse
  statistic/objective lines, and `开始` / `选关`; remove the standalone selected-mode
  preview copy and every banned explanatory string in `DESIGN.md`;
- Puzzle rows contain only ordinal, name, and optional completion. Selected detail
  contains silhouette, `目标  清空棋盘`, and `开始`; remove repeated objectives and
  seven-bag/rule explanations;
- game retains mode/level, back, pause, score/statistics, `清空棋盘`, Next, keyboard
  controls, and five touch actions, while removing `本局数据`, long mode-rule copy,
  and explanatory pause/exit paragraphs. ARIA remains complete;
- preserve all stable selectors, internal `marathon`, exact fifteen enabled entries,
  first/eighth/fifteenth canonical binding, 44 px controls, 12/14/18 px floors,
  reduced motion, one-canvas/zero-DOM-cell lifecycle, endless Race, and continuous
  Puzzle behavior;
- run targeted App/theme/renderer tests while editing. After the final source change,
  run one typecheck, one complete suite, one build, the prescribed action client, and
  one five-viewport home/library/game browser matrix; inspect every PNG, log exact
  evidence, create bounded linear source checkpoints plus a log-only checkpoint, and
  do not push.

Independent read-only functional and visual QA must accept the exact Slice K candidate
before the coordinator regenerates explicit-LF formal evidence, updates the changelog,
or decides whether to push.

## Slice K-R — Google typography, coherent dividers, and QA motion repair

Task ID: `TETRIS-T5-MINERAL-TYPE-DIVIDER-011`

Status: **SUPERSEDED — the K-R candidate was repaired and accepted only through
Slice K-R2**.

Product base: rejected-as-final Slice K candidate
`9c128abae1c3ddb3e1de2e783be0b1c37210fc9c`; all accepted Core behavior and the
coordinated mineral palette/material remain fixed.

The repair writer may change only:

- `src/App.tsx` only for canonical silhouette cohesion;
- `src/styles.css`;
- `src/App.test.ts` only for direct visible-copy/structure regression coverage;
- `src/game/render/theme.ts`;
- `src/game/render/theme.test.ts`;
- `src/game/render/TetrisRenderer.ts`;
- `src/game/render/presentation.ts`;
- `src/game/render/presentation.test.ts`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md`.

Slice K-R acceptance:

- import the exact `Space Grotesk` + `Noto Sans SC` Google Fonts CSS v2 request frozen
  in `DESIGN.md` as the first CSS statement, with `display=swap` and the complete
  system fallback. Do not edit `index.html`, add a dependency, imitate a logo, or
  require the network for legibility/layout correctness;
- apply the pairing consistently to title/UI/numerals, then verify both successful
  font loading and a blocked-font fallback at the five required viewports. No font
  swap may clip names, controls, statistics, or the complete `清空棋盘` goal;
- replace the generic statistic odd/even borders with explicit Classic/Race/Puzzle
  geometry. Puzzle level and objective span full rows on the desktop dock, placed and
  cleared share one middle row, and no viewport contains the reported half divider,
  stray vertical segment, or empty fake quadrant;
- restore visible `Next` and the compact keyboard map at 390 × 844, 360 × 800, and
  844 × 390 without shrinking below 12 px, breaking the board's 1:2 geometry,
  clipping the goal, or adding gameplay scroll;
- reduce `surface-in` to at most 4 px over 180 ms. Cap the ordinary line-clear tonal
  sweep to nine 60 Hz presentation ticks (150 ms) without changing Core clear delay;
  reduced motion must show no positional or sweep transition;
- replace isolated cell plates with cohesive tetromino components. Orthogonally
  adjacent same-material cells bridge the old gap and do not retain full internal
  outlines; any seam stays at or below 0.35 px / 22% alpha. Active, Next, Ghost, and
  locked-board rendering use the same grouping logic, while the canonical silhouette
  substantially closes its per-cell gaps without exceeding one path per piece type;
- add only the frozen directional mineral relief: a 0.75–1.25 px low-alpha signal
  bevel on exposed top/left edges and the material dark edge on exposed bottom/right
  edges. Preserve the exact 28 colors and prohibit white highlight bars, inner rings,
  double outlines, glow, blur, glass, detached shadows, or plastic/candy gloss;
- test the grouping helper with canonical I/O/T/S/Z/J/L cells, proving internal edges
  are suppressed and the Ghost perimeter has no internal cell boxes. Visually inspect
  active, locked, Next, all fifteen authored boards, and post-line-clear fragments at
  desktop and mobile sizes;
- preserve the exact palette/material values, concise copy, `经典`, stable selectors,
  fifteen enabled levels, first/eighth/fifteenth binding, 44 px controls, 12/14/18 px
  floors, one canvas/zero DOM cells, lifecycle, endless Race, and continuous Puzzle;
- run focused App/presentation/renderer tests while editing. After the final product
  source change, run one typecheck, one complete suite, one production build, the
  prescribed action client, and a fresh five-viewport home/library/game matrix with
  original-detail inspection. Use bounded linear source checkpoints if the cohesive
  renderer and typography/layout claims together exceed 500 hand-authored modified
  lines, plus a log-only checkpoint; do not push.

Independent static/functional and visual/browser QA must accept the exact K-R source
checkpoint before formal evidence, changelog integration, or push.

## Slice K-R2 — Semantic statistic roles and landscape action containment

Task ID: `TETRIS-T5-MINERAL-SEMANTIC-REPAIR-012`

Status: **ACCEPTED — source `effb353`, candidate tip `ba5d387`, formal evidence
`c0832e4`**.

Product base: rejected-as-final Slice K-R candidate
`f4fcbb582ac5dfd8fce6fa4a2e3e7cc91e0f4102`; frozen product source
`e38c55c4631beb68eecb648b84d205e4376245b0` remains the implementation base.
Independent static QA rejected generic `nth-child(odd)` inference in the compact
Puzzle statistic grid. Independent visual QA additionally proved every 844 × 390
DPR3 home action cluster is clipped at the shared surface's right boundary in both
loaded-font and blocked-font conditions. All other K-R source and browser gates remain
accepted inputs to this bounded repair, not final release acceptance.

The repair writer may change only:

- `src/App.tsx` only to add explicit statistic-role hooks;
- `src/styles.css` only to replace statistic positional selectors and contain the
  landscape mode actions;
- `src/App.test.ts` only for direct semantic-role/structure regressions;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md` only after source is frozen.

Slice K-R2 acceptance:

- every Classic, Race, and Puzzle statistic article exposes an explicit semantic role;
  all statistic spans and dividers select those roles. No statistic geometry may use
  `nth-child`, `nth-of-type`, `odd`, or `even`;
- preserve the exact desktop and compact row topology already accepted visually:
  Puzzle level/objective full-width on desktop, placed/cleared in the middle, and a
  coherent 2 × 2 compact grid with no half line, dangling segment, doubled edge, or
  fake empty quadrant;
- at 844 × 390 DPR3, all three home entrances show their complete action label and
  rounded arrow border. Each mode button and `.mode-gate__action` must have
  `scrollWidth <= clientWidth`; keep each action at least 44 × 44 px and preserve the
  one-surface 1+2 composition;
- preserve the exact typography, palette/material values, cohesive Pixi grouping,
  concise copy, visible Next/keyboard map, 4 px entrance, nine-tick clear sweep,
  fifteen enabled levels, 2:1 board, 44 px controls, and one-canvas lifecycle from
  frozen source `e38c55c`;
- run focused App tests while editing. After the final source change, run one
  typecheck, one complete suite, one production build, the prescribed action client,
  and one fresh five-viewport loaded-font/blocked-font home/library/game matrix with
  original-detail inspection. Create one bounded source checkpoint and one log-only
  checkpoint; do not push.

Independent static/functional and visual/browser QA must accept the exact K-R2 source
checkpoint before formal evidence, changelog integration, or push.

Disposition: independent static/functional and visual/browser QA accepted exact source
range `bcc25d6..effb353`. The post-source candidate tip `ba5d387` changes only the
frontend workstream log. Formal generator `4d2733b` produced 23 screenshots and
evidence child `c0832e4`; independent evidence QA accepted 23/23 original-detail
captures and reproduced all 25/25 raw-Git-blob SHA-256 entries with zero CRLF in the
JSON and checksum manifest.

## Slice K-R3 — divided cohesive facets and stronger mineral depth

Task ID: `TETRIS-T5-MINERAL-DIVIDED-FACETS-013`

Status: **ACCEPTED AS PART OF FINAL SOURCE `48176fe`**. Source checkpoint `acaf405`
remains the frozen geometry/facet baseline and independent frontend cross-QA accepted
it together with K-R5/K-R6.

Branch base: `028c1580cec7eff92013db614b40491fa4eac9d6`; frozen behavior/layout source is
`effb353c0a4d1bef26fa524ed38d3d3653f45eb8`. The previously accepted evidence is a
historical baseline and must be regenerated after this renderer change.

The renderer writer may change only:

- `src/game/render/theme.ts` and `src/game/render/theme.test.ts`;
- `src/game/render/presentation.ts` and `src/game/render/presentation.test.ts`;
- `src/game/render/TetrisRenderer.ts`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md` after source is frozen.

Slice K-R3 acceptance:

- preserve the exact seven-piece palette and one connected outer silhouette for every
  orthogonally joined same-material component; same-piece neighbours never expose the
  board well or regain four detached shadows/outer boxes;
- keep the board-well channel between separate material components at least 1.6 times
  the perceived internal groove width. The larger outer gap and finer inner seam must
  make whole-piece grouping readable without changing board geometry;
- draw every shared cell boundary exactly once as the frozen dark groove plus
  lower/right light lip, so all four canonical units remain visible in active, locked,
  Next, and Ghost pieces;
- give each filled unit one restrained inset top/left light and bottom/right dark
  facet while keeping the stronger joined outer bevel. The result must read more
  dimensional without white gloss, plastic, candy, glass, blur, glow, or detached
  depth;
- add deterministic seam enumeration tests for I/O/T/S/Z/J/L, including exact shared
  boundary counts, no duplicate seams, complete outer perimeter, and split fragments;
- preserve typography, statistic dividers, visible Next/keyboard map, concise copy,
  `经典`, fifteen enabled legal残局, endless Race, responsive geometry, 44 px controls,
  reduced motion, one canvas, zero DOM cells, lifecycle, and `index.html` unchanged;
- run focused presentation/theme tests while editing. After the final source change,
  run one typecheck, one complete suite, one production build, the prescribed action
  client, and a fresh five-viewport browser pass with original-detail inspection of
  active, locked, Next, Ghost, and dense Puzzle stacks. Create bounded source and
  log-only checkpoints; do not push before independent static and visual QA accept the
  exact candidate.

## Slice K-R4 — shorter grounded lock window

Task ID: `TETRIS-T5-SHORT-LOCK-WINDOW-014`

Status: **ACCEPTED**. Source `f0ec47c`; log `4fed07c`; independent Core cross-QA
accepted the exact source with no finding.

Writer base: the contract checkpoint created from log candidate `400916c`. The writer
may change only:

- `src/game/core/constants.ts`;
- `src/game/core/core.test.ts` for the direct exact-duration regression;
- `docs/workstreams/tetris-t5-core/THREAD_LOG.md` after source is frozen.

K-R4 acceptance:

- change `LOCK_DELAY_TICKS` from 30 to exactly 18 (about 300 ms at 60 Hz); preserve
  `MAX_LOCK_RESETS`, move/rotation reset rules, hard drop, entry/clear delays, gravity,
  scoring, hashes, and every other Core constant;
- prove a grounded piece remains movable and unlocked through tick 17 and locks on
  tick 18 in Classic, while existing shared-delay tests continue to prove the same
  constant drives Race and Puzzle behavior;
- run the focused Core tests, typecheck, exact-path staging, and one bounded source
  checkpoint. Do not change renderer/UI/Puzzle data/references, dependencies,
  `index.html`, coordinator docs, formal evidence, or push.

## Slice K-R5 — brighter `雾昼矿物` retone

Task ID: `TETRIS-T5-BRIGHT-MINERAL-RETONE-015`

Status: **ACCEPTED**. Source `fd5f901`; log `1e7e5e3`; independent frontend cross-QA
accepted the exact retone and frozen renderer geometry with no finding.

Writer base: the same contract checkpoint. The writer may change only:

- `src/styles.css`;
- `src/game/render/theme.ts` and `src/game/render/theme.test.ts`;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md` after source is frozen.

K-R5 acceptance:

- replace only page/state/piece color values, shadow, action-ink handling, and
  `color-scheme` with the exact `雾昼矿物` table in `DESIGN.md`; retain the existing
  layout, type scale, spacing, semantic dividers, controls, copy, and phase motion;
- preserve K-R3's joined outer silhouette, larger external gap, narrower internal
  groove, raised unit facets, Ghost guides, and every geometry token unchanged;
- keep the board well deep while page and panels become visibly brighter. Technology
  remains in structural precision, typography, focus, and feedback; add no grid,
  neon, glow, ambient blob, decorative telemetry, new component, or marketing copy;
- freeze exact CSS and Pixi tokens in direct tests and retain AA text/action contrast
  plus at least 3:1 contrast for every piece fill endpoint against the board well;
- run focused theme/App tests and the prescribed action client while editing, then
  create one bounded source checkpoint. Do not change Core/runtime/Puzzle data,
  renderer geometry, dependencies, `index.html`, coordinator docs, formal evidence,
  or push.

After both source checkpoints, the coordinator runs one combined final typecheck,
complete suite, build, and five-viewport browser matrix. Independent cross-QA must
accept the exact combined candidate before formal evidence, changelog integration, or
push.

## Slice K-R6 — input-gated entry countdown

Task ID: `TETRIS-T5-ENTRY-COUNTDOWN-016`

Status: **ACCEPTED AFTER REPAIR**. Initial source `7f0b766`; gate repair `48176fe`;
final log tip `d292b15`. Independent frontend cross-QA rejected the first candidate's
DEV-QA reset/selection bypass, then accepted repaired source `48176fe` with no open
finding.

Writer base: the combined K-R4 + K-R5 log candidate. One writer may change only:

- `src/App.tsx` and `src/App.test.ts`;
- `src/game/runtime/GameRuntime.ts` and `src/game/runtime/GameRuntime.test.ts`;
- `src/styles.css` for the countdown overlay only;
- `docs/workstreams/tetris-t5-frontend/THREAD_LOG.md` after source is frozen.

K-R6 acceptance:

- Classic/Race mode start and the selected Puzzle start show the existing game shell
  with centered `3`, `2`, `1`, each for exactly 1000 ms; after `1`, remove the overlay,
  enable input, call the public runtime start path exactly once, and focus the canvas;
- keep the canonical game state `ready` for all three seconds. Keyboard, touch, QA,
  gravity, ticks, scoring, audio events, and pause cannot start or mutate the run early;
- expose an explicit runtime input gate with a direct regression test. Keep the gate
  disabled only for the entry countdown and clear held input whenever it changes;
- restarting/replaying an existing run starts immediately under current behavior and
  must not create another countdown. Reduced-motion removes visual interpolation only;
- style one restrained board-local countdown layer using existing palette/type tokens;
  add no new card, copy, neon, glow, telemetry, layout change, or renderer primitive;
- run focused App/runtime tests and the prescribed browser client, then create bounded
  source and log-only checkpoints. Do not change Core rules, Puzzle definitions,
  renderer geometry, dependencies, `index.html`, coordinator evidence/changelog, or
  push.

The coordinator runs the single final typecheck, full suite, build, and five-viewport
matrix only after K-R6 is source-frozen. Cross-QA acceptance of the exact combined
candidate is required before evidence integration or push.

Disposition: **ACCEPTED**. Final product source
`48176fe3d23cbc450fe39b38310c8a6b6eb71945` retains the mature layout and divided
cohesive facet renderer, applies the exact light `雾昼矿物` palette, shortens the shared
grounded lock delay to 18 ticks, and adds one input-gated three-second entry countdown.
Final post-repair gates passed typecheck; 40 test files with 39 passed / 1 skipped;
262 tests with 260 passed / 2 skipped; the 739-module production build; the prescribed
action client; and an exact-source five-viewport matrix. Independent Core QA accepted
K-R4 and independent frontend/browser QA accepted K-R3/K-R5/K-R6 after repair.
Evidence commit `7d374188b8672cef32b5d90023db4f677421d178` contains 24 captures tied to source
`48176fe` and candidate tip `d292b15`, 26/26 matching SHA-256 entries, a visible digit-3
countdown proof, canonical immutability under QA start/reset/selection/action attempts,
one canvas, zero DOM cells, and zero unexpected browser errors. `index.html`,
dependencies, Puzzle definitions/references, and separate game repositories were not
changed by these refinements.

## T26 Phase-F release-correction slice

Task ID: `TETRIS-T26-RC-PORTABLE-RELEASE-023`

Status: **ACCEPTED — FINAL INDEPENDENT QA P0/P1/P2/P3 ALL ZERO**.

Independent read-only QA found no P0 product failure, but final acceptance remains
fail-closed until all of the following are corrected and reverified together:

- replace every active T26 release-evidence import of the coordinator's personal
  Codex Playwright path with a repository-declared, pinned Playwright dependency;
- remove personal absolute paths from the active T26 evidence toolchain and document
  clone-local reproduction prerequisites;
- align `package.json` and `package-lock.json` to `1.0.0-rc.1`;
- refresh Phase-E and Phase-F evidence from the corrected candidate, then rerun the
  lockfile-clean install, typecheck, complete suite, build, OSV, and gitleaks gates;
- synchronize the RC plan, audit, progress, changelog, coordinator log, and release
  notes only after the corrected candidate and refreshed evidence are frozen;
- obtain a second independent read-only QA decision on that exact final range.

This correction may change package metadata, the committed lockfile, active T26
evidence runners/readmes, regenerated Phase-E/Phase-F evidence, and coordinator-owned
release documents. It may not change gameplay, presentation, Puzzle content/order,
ranking, persistence, renderer behavior, or the accepted release scope.

Correction checkpoints: contract `3dc5dfb`; npm version/dependency metadata `e4e97a1`;
portable evidence runners `85a3431`; refreshed lifecycle/showcase evidence `6d2255a`.
The corrected source reports `1.0.0-rc.1`, imports Playwright from the pinned repository
dependency, and has no executable browser-evidence script containing a personal path.
Post-source gates pass typecheck, `318 passed / 3 skipped`, the 756-module build, a clean
`npm ci` from the committed lockfile, a clean direct dependency tree, and OSV with no
known issue. Phase-E/F browser audits bind to source `85a3431`, report no errors or
cleanup residue, and release ports `4191` and `4192`. A redacted gitleaks 8.30.1 scan of
the candidate range passes. The second independent read-only QA accepted the committed
range with P0 0 / P1 0 / P2 0 / P3 0; coordinator closure and push are the only
remaining operations.

Final disposition: independent read-only QA accepted docs synchronization `d700ca3`
with P0 0 / P1 0 / P2 0 / P3 0 after verifying the portable evidence dependency,
`1.0.0-rc.1` package/lock alignment, source-bound Phase-E/F audits, and consistent current
status records. No product or evidence change followed the accepted source; coordinator
closure and ordinary push are the only remaining operations.
