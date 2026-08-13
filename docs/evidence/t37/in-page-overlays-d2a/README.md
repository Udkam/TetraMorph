# T37 D2A in-page overlay evidence

This evidence batch is bound to product source commit
`27d319428701708d892961de4cb5aa1fbbe522b2`.

It exercises production UI through public controls and the existing read-only DEV QA
surface. The terminal result is reached by replaying the accepted legal current-product
`t3r-shaft-01` witness from the T32 artifact; no state replacement or result-only debug
hook is used.

Coverage:

- first-entry rules: enter, cancel, and route handoff while the retiring shell remains
  outside the route viewport;
- Settings: first-open stillness, real tab swaps, close, and pause replacement;
- leave confirmation: cancel and route-owned leave;
- pause and restart curtains: enter, release/cancel, and restart-to-countdown replacement;
- terminal result: real completion, replay, then leave to the Endgame library;
- reduced motion on a 390 x 844 viewport: opacity-only sheet, tab, and curtain paths;
- one Pixi Canvas, zero DOM board cells, at most one active modal owner, responsive
  geometry, and zero browser console/page/request errors.

Run from the repository root:

```powershell
node --check docs/evidence/t37/in-page-overlays-d2a/capture-in-page-overlays.mjs
node docs/evidence/t37/in-page-overlays-d2a/capture-in-page-overlays.mjs
```

The capture starts and stops its own dynamic-port Vite server and Chromium instance.
`audit.json` contains the assertions and browser motion records; `manifest.json` binds
every artifact by SHA-256.

Capture history: the first 2026-08-14 run stopped before audit generation because the
script tried to close Settings while the Rules tab was active. The corrected script now
returns through the real Settings tab (and verifies its 150 ms transition) before using
the Continue action. A second run stopped when the script accidentally used the
unpublished Intro-01 v3 draft certificate against the current `t3r-shaft-01` product
definition. The corrected script uses that product definition's accepted T32 route.
Neither stop involved a product defect or source change.
