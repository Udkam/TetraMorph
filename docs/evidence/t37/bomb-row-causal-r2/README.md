# T37 Bomb R2 row-causal visual evidence

This supplemental evidence batch is bound to production renderer source commit
`8de0cb732adfe6337605013fd67bcfe2ba63ca86` and evidence-opening HEAD
`7443f0461457bea029cc461fd7ef265baac28bd1`.

The harness uses public Core commands to hard-drop an ordinary O piece into the last two
holes of a dense Mutation board. The real Core transition emits `clear-started.rows=[30]`,
then a `chain-clear` Bomb activation with `chainTriggerRows=[30]`; its first already-settled
Bomb carrier spans rows 29 and 30, and its blast reaches the second Bomb. That immutable
transition is rendered by the production `TetrisRenderer` at exact full-motion and
reduced-motion plan times. No product state, renderer event, or screenshot is injected.

Coverage includes:

- full `0/219/220/276/332 ms`, plan-derived `500/780/999/1000 ms`
  middle/last-front/completion-boundary frames, and a
  no-replay frame 1000 ms after completion;
- reduced `0/49/50/70/90 ms`, plan-derived `150/250/339/340 ms`
  middle/last-front/completion-boundary frames, and the
  same no-replay interval;
- source-only first impact, symmetric `+/-1` and `+/-2` fronts, and unchanged unreached
  cell interiors until their causal beat (the full-motion prelude uses the timeline sample
  because its one permitted impact shake changes the extracted board coordinates);
- a dense nonblank local explosion motif with no legacy all-board particle burst;
- reduced motion with zero moving particles, and renderer completion with no stale cue;
- exactly one production Canvas while each renderer is mounted, zero DOM board cells,
  renderer cleanup, zero console/page/request errors, and SHA-256 artifact binding.

The audit separates three evidence layers. Pixel comparisons are a machine causality
gate; horizontal-run values are retained only as observations because removed board cells
are not equivalent to a full-width overlay. A static gate reads the exact bound renderer
blob and rejects rectangle primitives or unguarded chain particles while requiring local
polygon/core/ring/fragment calls. The contact sheets were reviewed at original resolution.

The two contact sheets are intended for human visual review. Automated assertions and
these deterministic Core-to-renderer frames do **not** claim a naturally reached App run
or human visual acceptance.

Run once from the repository root:

```powershell
node --check docs/evidence/t37/bomb-row-causal-r2/capture-bomb-row-causal.mjs
node docs/evidence/t37/bomb-row-causal-r2/capture-bomb-row-causal.mjs
```

The script owns a dynamic-port Vite helper and Chromium instance and releases both in a
`finally` block. `audit.json` records exact Core events, plan values, captured snapshots,
row-interior pixel comparisons, topology, and errors. `manifest.json` binds every other
artifact by SHA-256.
