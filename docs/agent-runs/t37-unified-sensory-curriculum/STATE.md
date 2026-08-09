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
- Human listening accepts R5 **Action A** (exact T28 `35509a7` recipe/mixer) and
  **Ice 2** (Freesound `819779 / sbml / Ice cubes`). The R3 Studio clear/countdown
  subset and no-tail four-pulse clear 4 remain frozen.

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
5. `REJECTED BY HUMAN LISTENING` — R4 action and Ice candidate tip `9232d14` is worse
   than an earlier softer direction; technical checks and independent QA do not rescue it.
6. `ACCEPTED` — player-directed bounded Mutation correction from base `265899d`:
   source `646b865`, bilingual copy `ae75f1e`, source-bound browser evidence `c691d54`,
   and accepted status checkpoint `4722927` restore the 0.1-second gravity floor and
   replace inherited whole-board compaction with covered-piece-only independent-column
   settlement.
7. `ACCEPTED BY HUMAN LISTENING` — R5 source `2eb56af`, centred-gain repair `f241488`,
   and evidence `05b28ff` compare two exact historical soft action directions and three
   short primary-source real ice contact/crack recordings. The player selects Action A
   and Ice 2; technical and independent read-only gates also pass.
8. `IN PROGRESS` — full production audio language from the accepted Action A, Studio,
   and Ice 2 contracts. Contract `03ce9fd`, playback foundation `a1febc0`, local
   assets/countdown `47629e7`, and production mapping `108aee8` are committed. Ice 2
   original-WAV provenance and remaining-cue listening remain open.
9. `PENDING` — route transition system and reduced-motion verification.
10. `PENDING` — ordinary/Mutation whole-piece material system.
11. `PENDING` — 5/25/16 Puzzle content, exact proofs, unlocks, migration, and UI.
12. `PENDING` — final gates, browser evidence, independent QA, changelog, and push.

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
- Human listening rejects all of R4. The `soft` name did not correspond to the earlier
  preferred softness, and the three Ice choices did not sound like the requested crisp
  ice-cube response. No R4 recipe is accepted for production; its green technical
  evidence remains provenance and rollback information only.
- R5 source `2eb56af` restores the exact T28 `35509a7` / `c43a687...` and T29
  `ca5da48` / `f470e89...` recipes and mixers. Independent QA rejected its initial
  evidence because a centred `StereoPannerNode` reduced rotate, lock, and hard drop by
  about 3.01 dB in Chromium. Repair `f241488` limits panning to disclosed left/right
  movement and routes all centred actions directly; runtime checks observe
  `stereo-pan:-0.28`, `stereo-pan:0.28`, then `direct` for the other actions.
- Evidence `05b28ff` binds both reports to `f241488` and passes two-profile history,
  frozen Studio hashes/mix, four-pulse/no-tail clear 4, three original-rate real-Ice
  decodes, embedded/direct-file equality, responsive/reduced-motion checks, and zero
  console/page errors. Final typecheck, the complete suite (`381 passed / 8 skipped`),
  the 761-module build, the prescribed action client, and final independent read-only
  QA pass. The Ice files are HQ Ogg audition previews; the selected source still needs
  its uploader's original WAV pinned before the production asset gate can close.
- The player's verdict is Action A and Ice 2. Action A freezes the T28 `35509a7` mixer,
  direct centred action route, directional movement pan, and 50 ms hard-drop
  trail-to-contact alignment. Ice 2 freezes HQ Ogg SHA-256
  `5a68425717de348ba3d10767618fa4c428a97f26c2e85abc96f45b7bfb35a450`, original-rate
  window `0.19375–0.63375 s`, 3 ms attack, 12 ms release, and direct accepted output.
- A live normal-download check found no authenticated accessible Freesound surface in
  the currently controlled browsers, and no matching original WAV exists in the local
  Downloads folder. Do not bypass the login gate. Candidate integration may use the
  exact accepted HQ Ogg, while `819779__sbml__ice-cubes.wav` plus its SHA-256 remains
  the next provenance requirement.
- Stage-C production now loads the three byte-frozen local assets once, preserves the
  accepted Action A/Studio/Ice output paths, aligns non-zero hard drop to the 50 ms
  renderer trail, uses the accepted 500 ms visible countdown, and serializes Mutation
  audio by the renderer activation durations. Typecheck and the six-file focused gate
  pass `100/100` at source `108aee8`.
- Concurrent writer staging combined the authorized asset and countdown paths into
  `47629e7`. The index is clean and no inherited path entered the commit. Do not amend,
  reset, or rewrite shared history; record the mixed checkpoint and continue with exact
  path staging. The earlier playback foundation's two EOF warnings were removed in
  `108aee8`.
- The open palette candidate will restore the intact pre-T29 T28 snapshot `2c4e4ae`
  for soft drop, undo, Survival, UI, reward, Bomb, Multiplier, and Supergravity. It uses
  a separate Action-A-equivalent safety route, excludes accepted Freeze, and remains
  unaccepted until focused listening.
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
  tests. It initially withholds acceptance only because this state file still described
  the completed gates as pending. Status checkpoint `4722927` corrects that stale record;
  the final read-only recheck passes with `P0 0 / P1 0 / P2 0 / P3 0`, no product-source
  delta, a clean range diff, and no inherited T27 or `progress.md` path in the candidate.
- Two initial read-only audit agents failed before producing findings because the
  selected model was at capacity. No retry loop or extra resource was started.

## Next exact action

Implement the restored T28 remaining-cue palette and focused tests, then publish one
production-bound listening surface without changing the accepted Action A, Studio, or
Ice 2 controls. Keep transition/material/Puzzle work closed until the production audio
candidate is green and the open provenance/listening gates are explicitly reported.

## Do not repeat

- Do not replay the full T34–T36 investigation or treat their measurements as taste
  evidence.
- Do not reopen Action A, Ice 2, or the frozen Studio subset without new explicit player
  feedback; do not treat newly extended cues as accepted merely because they share the
  selected grammar.
- Do not redesign all Puzzle UI before strict level data and proof contracts are green.
- Do not reread broad logs after compaction; continue from this file one stage at a time.
