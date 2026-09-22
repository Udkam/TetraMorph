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
- Contract committed `e1795ca7`; Survival `cd77b665` (engine/race tests), persistence
  `b40f4d9b` (App, styles, leaderboard and bootstrap/tests), materials `e83792ec`
  (renderer/theme/tests), causal VFX `1a0db27f` (renderer/tests), audio `6e80d1ad`
  (Bomb playback/palette/engine tests), dependencies `ad060988` (package/lock),
  recovery `a2f18457` (App/main/recovery/tests), CI `d5b46903` (workflow/package/runner),
  smoke coverage `f3f2cbe0` and `e0062984`. Exact path ownership is recorded in each
  bounded commit; inherited dirty paths never staged.
- Targeted tests/typecheck green at each source checkpoint. Survival first reproduced
  three failures (phantom rise/lower, lost top sentinel, waived overflow), then 32/32.
  Renderer 74/74; audio 35/35; persistence 92/92 plus new notice test; recovery 77/77.
- Final actual commands after last product edit: `npm ci --registry=https://registry.npmjs.org`,
  `npm run typecheck`, `npm run test`, `npm run build`. Results: 787 passed / 17 skipped,
  build 780 modules, main 639.27 KB / gzip 191.99 KB; known chunk-size advisory only.
  `npm audit --registry=https://registry.npmjs.org`: zero vulnerabilities including dev.
- Production `npm run test:release`: 12/12 viewports/modes, actual touch-capable taps,
  same-document SPA exits, zero console/page errors, storage-denied disclosure. Final
  correction waited for the physically retired backdrop before screenshots.
- `node docs/evidence/t38/capture.mjs`: eight source-bound material/effect frames,
  no failures. `node docs/evidence/t38/check-review.mjs`: seven cues and two product
  Bomb scenes functional, no errors. Skill client final run recorded real playing
  state and a placed piece; early intro-only run is not claimed as gameplay proof.
- Evidence `9961a341`; independent read-only QA `f534dab5`: 211 targeted tests passed,
  candidate PASS and smoke-only increment PASS. See QA.md for non-claims.
- Owned dev preview: node PID 24868, parent 29196, started 2026-09-22 21:34:10 local,
  command `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4194 --strictPort`,
  root this repository, purpose current user review. Retained for the review handoff.
  Earlier owned dev server and all production smoke servers/browsers stopped.
- Intermediate captures moved within the repository to ignored `.local/t38-intermediate`;
  no user archives or inherited files deleted. Final evidence about 1 MB, not proof-search output.
- Engineering implementation and independent review complete. Next: consolidate docs,
  push the reviewed candidate, report remote CI honestly, user listening/material review.
  Do not tag a subjectively accepted release or deploy to an unspecified host.
