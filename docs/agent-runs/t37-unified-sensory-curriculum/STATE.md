# T37 Unified Material Feedback and Puzzle Curriculum — Bounded State

## Objective

Deliver one coherent TetraMorph material language across tactile sound, route motion,
ordinary/Mutation pieces, and a strictly certified 5/25/16 Puzzle curriculum.

## Immutable base and boundaries

- Base SHA: `745edb0e863ace5034131526ba7aee51cb71c07a`.
- Branch: `main`; origin matched the base at adoption.
- Preserve inherited dirty `docs/evidence/t27/**`,
  `docs/evidence/t27-r1-followup/**`, and `progress.md`; never stage them.
- No Serena, persistent indexer, watcher, idle server/browser, or external audio service.
- At most two editing/heavy activities may overlap; failed or idle agents are not
  respawned merely to fill capacity.
- Use exact-path staging and short reviewable checkpoints. The coordinator owns final
  changelog, independent-QA disposition, and push.

## Human decisions frozen for T37

- T36 audio is rejected; tests and prior QA do not override listening feedback.
- New sound is restrained, non-harsh, clearly responsive, and semantically tied to its
  action. Restrained electronic layers are now allowed; generic or piercing bleeps are
  still rejected.
- Mutation is a whole-piece material, never a carrier badge: Ice crystal, Bomb lava,
  Multiplier gold, and Supergravity violet. Four cells can release one piece-level item
  exactly once.
- The player-supplied material board is direction only (SHA-256
  `3BED43DFC335615C6C61A1989DA7B95CCA129C74F41622A1205EF99A59A569B8`): retain its
  triangular facets, continuous materials, bounded glow hierarchy, and sparse item
  motifs; do not copy its labels/layout or rename Supergravity to Collapse.
- Puzzle publication count is 46: 5 Intro, 25 Easy, 16 Hard. Easy is open; Hard uses
  related technique prerequisites at certified optimum plus five operations.

## Checkpoints

1. `COMPLETE` — contract, phase document, and this bounded state at `429ffe2`.
2. `REJECTED BY HUMAN LISTENING` — audition R1 source `0bebf8a` and evidence `2ff0bb6`
   were too quiet, weakly related to their effects/functions, and worse than the
   earliest design.
3. `SUPERSEDED BEFORE LISTENING` — R2 source `06bd7ea` repaired event/timing mapping,
   but the player then removed the blanket non-electronic constraint and requested a
   network-resource review.
4. `PARTIALLY ACCEPTED` — R3 freezes Studio clear 1/2/3 and countdown; clear 4 adopts
   the same four-pulse grammar without the rejected completion tail.
5. `CANDIDATE / LISTENING REQUIRED` — R4 replaces rejected
   move/rotate/lock/hard-drop and Glass Ice only at candidate tip `9232d14`.
6. `IMPLEMENTED / FINAL DOC QA PENDING` — player-directed bounded Mutation correction
   from base `265899d`: source `646b865`, bilingual copy `ae75f1e`, and source-bound
   browser evidence `c691d54` restore the 0.1-second gravity floor and replace inherited
   whole-board compaction with covered-piece-only independent-column settlement.
7. `BLOCKED ON HUMAN LISTENING` — full audio palette may start only after audition
   acceptance.
8. `PENDING` — route transition system and reduced-motion verification.
9. `PENDING` — ordinary/Mutation whole-piece material system.
10. `PENDING` — 5/25/16 Puzzle content, exact proofs, unlocks, migration, and UI.
11. `PENDING` — final gates, browser evidence, independent QA, changelog, and push.

## Verification state

- Contract checkpoint is committed as `429ffe2` on `main`.
- Focused audio tests pass `21/21`; `npm.cmd run typecheck` passes.
- Five mono 48 kHz / 16-bit WAV suites under
  `docs/evidence/t37/audio-audition/` bind directly to source `0bebf8a`. All samples
  are finite; layer endpoints are zero; independent in-process and cross-process WAV
  hashes are stable; peaks are bounded; clipped sample count is zero.
- Human listening overrides those checks: R1 fails perceived loudness and action/effect
  identity. The generic material-object vocabulary must not be incrementally retuned.
- Official-source review selected UI SFX `0.4.0` / source commit
  `2001f3dac2d1cf86ad99cbad5cef222c3a8b9082` for R3. Its packaged audio license is
  CC0-1.0 and implementation license is MIT. Kenney Interface Sounds and omgaudio are
  verified CC0 alternatives but remain unused reserves. No external package or asset
  has entered production source yet.
- The R3 page under `docs/evidence/t37/audio-audition-r3/` compares the same semantic
  map across `studio`, `mechanical`, and `scifi`, plus `glass` Ice. All 23 copied Ogg
  files match upstream SHA-256; their direct-file Base64 copies match the same bytes.
  `node docs/evidence/t37/audio-audition-r3/verify-audition.mjs` passes decoded
  finite/peak/RMS/duration checks, action-state checks, desktop/mobile screenshots,
  reduced motion, direct-file playback, and zero console/page errors.
- Human listening accepts only Studio clear 1/2/3 and countdown. All movement,
  rotation, natural-lock, hard-drop candidates are too sharp/not soft enough; Glass Ice
  is rejected as unpleasant. These verdicts override the green R3 measurements.
- The R4 page under `docs/evidence/t37/audio-audition-r4/` contains only the failed
  action set, three new Ice choices, frozen-set status labels, and one clear-4 extension
  button. Accepted 3·2·1 is not reopened as a review control.
  Actions use five UI SFX `soft` files with per-event contour, 12–18 ms attacks,
  1.6–2.6 kHz low-pass ceilings, `0.88×–1.05×` rates, post-filter peak calibration,
  and 12 ms retrigger release. Ice uses CC0 OpenGameArt Freeze Spell and IceShatters
  sources; the layered cue is baked into one buffer by a committed renderer.
- `node docs/evidence/t37/audio-audition-r4/verify-audition.mjs` passes `10/10` source
  decodes and `8/8` calibrated recipes, embedded-byte equality, clear-4 four-pulse with
  no extra tail, desktop/mobile frames, reduced motion, direct-file playback, and zero
  console/page errors. `git diff --check -- docs/evidence/t37/audio-audition-r4`
  passes.
- Accepted Studio clear/countdown uses its own exact R3 compressor
  (`-10 dB / knee 10 / 4:1 / 3 ms / 120 ms`) after follow-up `8d8cb67`; candidates use
  a separate safety compressor. The verifier exposes and asserts this output contract.
- Follow-up `9232d14` makes the move visual reach its declared main settle at 56 ms,
  then finish a 32 ms soft tail. The verifier asserts both the visual timing and absence
  of an accepted-countdown review control.
- Independent read-only QA passes `f122a4e..4a61bf5` with
  `P0 0 / P1 0 / P2 0 / P3 0`. Its task-specific Temp copy reports
  `PASS assets=10 recipes=8 consoleErrors=0 pageErrors=0`; it independently rebuilds
  the layered Ice buffer to SHA-256 `fea3b7e185441bd68707602ad0efa284c279d32d7511c7600a47ab7e6e240082`,
  measures the three Ice main responses near `324 / 327 / 327 ms`, confirms primary
  CC0 source records, and finds no inherited T27 or `progress.md` path in the range.
  Human listening remains the only open audio gate.
- The develop-web-game client observed `ice-layered / 冰冻激活` with no error artifact.
  A second pass observed accepted `3 · 2 · 1` with the frozen compressor contract.
  A third pass observed `soft / 左移` with the `56 / 88 ms` timing contract. Owned
  Python server PIDs `6608`, `3140`, and `24132` exited and port `4184` was released
  after each pass. No audition server or browser remains owned.
- The required develop-web-game client also observed `studio / 左移`; its owned Vite
  PID was stopped and port `4183` released. No server or browser remains owned.
- The superseded uncommitted R2 gain-only edit was restored to committed source. Its
  two untracked draft files were moved out of the workspace to the task-specific temp
  archive rather than staged or deleted.
- The Mutation correction's focused Core/presentation tests pass `50/50`; focused App
  tests pass `56/56`. After the last product source edit,
  `npm.cmd run typecheck`, the complete suite (`40 passed / 2 skipped` files;
  `381 passed / 8 skipped` tests), and the 761-module production build all pass. The
  build emits only the pre-existing bundle-size advisory.
- Browser evidence under `docs/evidence/t37/mutation-rules-correction/` binds to product
  source `ae75f1e`. Its live frame has one Canvas, zero DOM board cells, no overflow,
  and no console/page errors. Its deterministic exact reproduction keeps the settled
  `(8,34)` cell fixed, settles the covered O cells at `(8,32)`, `(8,33)`, `(9,38)`, and
  `(9,39)`, preserves the bottom-row `(8,39)` gap, starts no clear, matches ghost to
  lock and carrier coordinates, and verifies 60 lines as 6 ticks / 0.1 seconds per cell.
- Initial independent read-only QA of `265899d..c691d54` passes every product, test,
  evidence, scope, and screenshot claim and independently reruns `106/106` targeted
  tests. It withholds final acceptance only because this state file still described the
  completed gates as pending; the current documentation checkpoint corrects that stale
  record and requires one final read-only recheck.
- Two initial read-only audit agents failed before producing findings because the
  selected model was at capacity. No retry loop or extra resource was started.

## Next exact action

Obtain independent read-only recheck of the corrected Mutation status documents. If it
passes, record the verdict and return to R4 human listening; do not expand the remaining
palette or start transition/material/Puzzle work without the player's sound decision.

## Do not repeat

- Do not replay the full T34–T36 investigation or treat their measurements as taste
  evidence.
- Do not expand the complete audio palette before the compact audition passes.
- Do not redesign all Puzzle UI before strict level data and proof contracts are green.
- Do not reread broad logs after compaction; continue from this file one stage at a time.
