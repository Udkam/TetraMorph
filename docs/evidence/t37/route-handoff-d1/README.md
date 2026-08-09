# T37 D1 Settled Handoff browser evidence

This evidence is bound to product source
`a1c9dea2baef4a022da6823e32b5a684dcabeba8`.

Run an owned Vite server on the default evidence origin, then execute:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 4192 --strictPort
node docs/evidence/t37/route-handoff-d1/capture-route-handoff.mjs
```

Set `T37_ROUTE_ORIGIN` to use another explicitly owned local origin. The capture covers:

- native forward and back handoffs at real compositor-owned intermediate times;
- Canvas-ready Game capture, keyboard interruption, rapid latest-request ownership,
  one live route, and at most one Canvas;
- the continuously visible 160 ms fallback path;
- the resolved reduced-motion opacity-only path, sampled in-page without extending its
  product timer;
- a 390 × 844 Puzzle Library endpoint with no viewport overflow and route controls at
  least 44 px high.

`audit.json` is the machine-readable decision. A passing run has empty `failures` and
`browserErrors` arrays. `manifest.json` pins the capture script, audit, and every PNG by
SHA-256. The images are real Chromium frames, not fabricated route state.
