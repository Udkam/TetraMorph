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
4. `CANDIDATE / AWAITING HUMAN LISTENING` — network-verified semantic audio audition
   R3 at evidence commits `5f7bc05` and `4770642`.
5. `BLOCKED ON HUMAN LISTENING` — full audio palette may start only after audition
   acceptance.
6. `PENDING` — route transition system and reduced-motion verification.
7. `PENDING` — ordinary/Mutation whole-piece material system.
8. `PENDING` — 5/25/16 Puzzle content, exact proofs, unlocks, migration, and UI.
9. `PENDING` — final gates, browser evidence, independent QA, changelog, and push.

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
- The required develop-web-game client also observed `studio / 左移`; its owned Vite
  PID was stopped and port `4183` released. No server or browser remains owned.
- The superseded uncommitted R2 gain-only edit was restored to committed source. Its
  two untracked draft files were moved out of the workspace to the task-specific temp
  archive rather than staged or deleted.
- No full suite, build, browser pass, server, or complete-palette expansion has run.
- Two initial read-only audit agents failed before producing findings because the
  selected model was at capacity. No retry loop or extra resource was started.

## Next exact action

The user opens `docs/evidence/t37/audio-audition-r3/index.html`, first compares each
family's complete action chain and twelve-move repetition, then checks 1–4-line clears
and Glass Ice. Record explicit acceptance of A/Studio, B/Mechanical, C/Sci-fi, a named
per-action hybrid, or rejection. Do not adopt production assets, expand the remaining
palette, or start visual work before that decision.

## Do not repeat

- Do not replay the full T34–T36 investigation or treat their measurements as taste
  evidence.
- Do not expand the complete audio palette before the compact audition passes.
- Do not redesign all Puzzle UI before strict level data and proof contracts are green.
- Do not reread broad logs after compaction; continue from this file one stage at a time.
