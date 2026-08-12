# T37 N0 canonical Endgame browser evidence

This evidence is bound to product source
`1a348c2` (the full SHA is recorded in `audit.json` and `manifest.json`).

Run the one-shot capture from the repository root:

```powershell
node docs/evidence/t37/endgame-n0/capture-endgame-n0.mjs
```

The capture owns a Vite server on `127.0.0.1:4217`, closes its browser and server in
`finally`, and covers complete Chinese and English home/library frames. It verifies
language-matched home labels (`残局` / `Endgame`), canonical `/endgames` history, the
three curriculum tabs, neutral campaign-count accessibility copy, one selected level,
zero extra canvases or horizontal overflow, and zero console/page errors.

`audit.json` is the machine-readable decision. The four PNGs are full 1440 x 900
Chromium frames, and `manifest.json` pins the capture, audit, README, and screenshots by
SHA-256. Historical input compatibility is covered only by the isolated migration module
and its direct real-App-boot tests; this canonical browser evidence intentionally contains
no compatibility aliases.
