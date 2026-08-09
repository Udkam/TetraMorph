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
- New sound is tactile, restrained, clearly responsive, and non-electronic.
- Mutation is a whole-piece material, never a carrier badge: Ice crystal, Bomb lava,
  Multiplier gold, and Supergravity violet. Four cells can release one piece-level item
  exactly once.
- Puzzle publication count is 46: 5 Intro, 25 Easy, 16 Hard. Easy is open; Hard uses
  related technique prerequisites at certified optimum plus five operations.

## Checkpoints

1. `COMPLETE` — contract, phase document, and this bounded state at `429ffe2`.
2. `REJECTED BY HUMAN LISTENING` — audition R1 source `0bebf8a` and evidence `2ff0bb6`
   were too quiet, weakly related to their effects/functions, and worse than the
   earliest design.
3. `IN PROGRESS` — motion-linked audio audition R2.
4. `BLOCKED ON HUMAN LISTENING` — full audio palette may start only after audition
   acceptance.
5. `PENDING` — route transition system and reduced-motion verification.
6. `PENDING` — ordinary/Mutation whole-piece material system.
7. `PENDING` — 5/25/16 Puzzle content, exact proofs, unlocks, migration, and UI.
8. `PENDING` — final gates, browser evidence, independent QA, changelog, and push.

## Verification state

- Contract checkpoint is committed as `429ffe2` on `main`.
- Focused audio tests pass `21/21`; `npm.cmd run typecheck` passes.
- Five mono 48 kHz / 16-bit WAV suites under
  `docs/evidence/t37/audio-audition/` bind directly to source `0bebf8a`. All samples
  are finite; layer endpoints are zero; independent in-process and cross-process WAV
  hashes are stable; peaks are bounded; clipped sample count is zero.
- Human listening overrides those checks: R1 fails perceived loudness and action/effect
  identity. The generic material-object vocabulary must not be incrementally retuned.
- No full suite, build, browser pass, server, or complete-palette expansion has run.
- Two initial read-only audit agents failed before producing findings because the
  selected model was at capacity. No retry loop or extra resource was started.

## Next exact action

Replace R1 with a bounded R2 across exactly `AudioEngine.ts` and its test plus the four
`audioGesture` / `audioPalette` paths. Restore readable motion/function contours using
non-electronic physical models, synchronize normal clears to `clear-started`, run the
focused tests and typecheck, then render a new source-bound audition. Do not expand the
remaining palette or start visual work.

## Do not repeat

- Do not replay the full T34–T36 investigation or treat their measurements as taste
  evidence.
- Do not expand the complete audio palette before the compact audition passes.
- Do not redesign all Puzzle UI before strict level data and proof contracts are green.
- Do not reread broad logs after compaction; continue from this file one stage at a time.
