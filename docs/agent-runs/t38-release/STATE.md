# T38 — Release candidate / 2026-09-22

## Authority and boundary

User: autonomously design and improve the game to a publishable state, especially
Mutation effects, audio and item material quality. Owner: coordinator. Base:
`654ff73b7e29114be0585fb50a6c8fa7d0c810b8` on `main`.
This is an implementation candidate, not a claim of human listening acceptance.
Keep the four modes, 46-level curriculum, existing genuine mastery certificates,
single Pixi canvas and deterministic core. Do not revive deferred proof searches.
Do not alter inherited T27 captures, t27-r1-followup or progress.md.

## Design

- Material: frost glass (freeze), dark fired ceramic with warm fracture seams
  (Bomb), satin gold (multiplier), dense amethyst with downward grooves (gravity).
  Broad facets and narrow contour lighting replace repeated per-cell star facets.
  One material identity across next, active, settled, clear and subdued ghost.
- Effects: show the affected cells and the resulting action, not a screen flash.
  Preserve Bomb beat synchronization and reduced-motion endpoint semantics.
- Audio: soft dry block fracture/knock, crystal and weighted percussion in the
  established palette; no realistic explosion, startling transient or long ring.
  Keep accepted action sounds and music. Subjective acceptance is consolidated last.
- Survival: combine pending rise and earned relief before touching board/movers;
  emit only actual net motion and evaluate overflow on that final motion.
- Persistence: unavailable/corrupt/future-version storage is not silently replaced;
  failed writes retain session progress and visibly disclose session-only saving.

## Bounded checkpoint sequence

1. This contract (DESIGN, CURRENT_TASK, STATE).
2. Survival atomic settlement: engine.ts and race.test.ts.
3. Persistence: leaderboard bootstrap module/tests, App and relevant UI tests.
4. Materials/effects: renderer, mutation tokens, renderer contract tests (split
   further before exceeding 500 authored lines).
5. Mutation audio: playback, palette, focused audio tests.
6. Release robustness: error recovery, dependency lock, CI, README/runbook in
   separate concern-specific checkpoints. No invented public source license.
7. One final typecheck, full test suite, build and actual browser evidence pass;
   independent read-only QA of immutable base..candidate, then coordinator report.

## Verification and acceptance

Targeted regressions per source checkpoint; final clean-lock install and production
audit; desktop/mobile and reduced-motion real gameplay, exactly one canvas, no
console/page errors, restart/unmount lifecycle, storage-denied recovery, route reload.
Record source SHA and actual command results. No synthetic screenshot acceptance.
Release instructions must distinguish tested deployment behavior from unperformed
hosting and human audio/material approval. Do not publish an unapproved "accepted"
tag. No external deployment target has been supplied.

## Work log

- Initial inspection: source clean at base; only inherited T27/progress dirty paths.
  Reviewed existing material renderer, Mutation audio, Survival settlement and
  persistence entrypoints. No helpers launched yet. Historical screenshot confirms
  repeated cell facets and small overlaid motifs; final evidence must be current.
- Next: regress atomic Survival rise/relief, implement final-state overflow.
