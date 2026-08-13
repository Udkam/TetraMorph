# T37 Bomb presentation evidence

This evidence binds to product source `4d39951`. It keeps two claims separate:

- `live-mutation-zh.png` is a real App integration smoke: real keyboard inputs, exactly
  one gameplay Canvas, zero DOM cells, restart reuses the Canvas, and exit cleans up.
- The Bomb contact sheets are supplemental deterministic evidence. The browser imports
  the production Core engine and `TetrisRenderer`, creates real Core transitions, and
  feeds those transitions to the production renderer. They are not presented as a
  naturally reached App run and do not add a state-injection API to the product.

The source-bound scenarios prove full and reduced chain propagation, the first Bomb's
complete carrier as origin, bidirectional row beats, full-board completion, real
disjoint normal blast bands, hidden-only suppression, and runtime motion retiming.

Run:

```powershell
node docs/evidence/t37/bomb-presentation-final/capture-bomb-presentation.mjs
```

Audio is reviewed separately through the existing Stage-C production listening page.
An automated evidence PASS does not mark Bomb sound accepted; player listening is still
required.
