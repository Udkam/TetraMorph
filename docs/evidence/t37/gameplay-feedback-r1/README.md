# T37 Live-Play Feedback Correction R1

Status: technical candidate only. Human live-play/listening acceptance remains open.

## Source binding

- Product source: `41afc786715d25f32400b1aa6a8712bbffddc676`.
- Candidate range: `d2a0b1e..41afc78`.
- `audit.json` was generated from that exact product source by
  `capture-gameplay-feedback.mjs` against the owned Vite origin
  `http://127.0.0.1:4188`.
- The prescribed `develop-web-game` client was rerun after `41afc78` and produced no
  `errors-*.json` artifact. Its final files are bound here by SHA-256:
  - `client-final/shot-0.png` —
    `C6E22151080E0C26FB875F91C1764E67D8581C2761DE0BB5951F517B5C4FDE6E`;
  - `client-final/state-0.json` —
    `46815528CF98A2E0962E0062CF683B1CBA36DFD5F37C05DB6638F25ABC13A87B`.

## What the evidence proves

- The live Classic page has exactly one Pixi canvas, zero DOM board cells, a visible
  board/Next/state layout, and no browser console or page errors. Restart retains the
  same canvas; leaving the run removes the canvas and DEV QA surfaces.
- Actual `TetrisRenderer` captures show 2, 3, and 4 rows releasing in ascending board
  `y` order (visually top to bottom). The 4-row sequence releases at presentation ticks
  `0 / 4 / 7 / 11`; reduced motion keeps the same discrete order without travel.
- Actual Core remains unchanged during the eleven held ticks and atomically resolves
  all rows on tick 12. Scoring, board collapse, and line events therefore remain Core
  transactions rather than renderer-owned partial clears.
- Actual `AudioEngine` scheduling records Studio row starts at
  `0 / 60 / 120 / 180 ms`. Bomb records pressure/body/tail oscillator starts at
  `0 / 220 / 235 ms`, deterministic air at `220 ms`, and the bounded
  `880 Hz / Q 0.55` low-pass route.
- All layers of one clear or Bomb event now share one captured AudioContext clock
  origin, so browser clock movement while nodes are being constructed cannot skew the
  later row pulses or Bomb air layer.

## Commands run after the final source change

```text
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
node docs/evidence/t37/gameplay-feedback-r1/capture-gameplay-feedback.mjs
node C:\Users\Alex Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js ...
```

Results: typecheck passed; complete suite `400 passed / 8 skipped`; production build
transformed 767 modules and emitted only the existing bundle-size advisory; browser
audit passed with 11 inspected frames and zero errors.

## Reproduction

Start repository Vite on port 4188, then run the capture script from the repository
root. The script fails closed on ordering, Core atomicity, audio timing/filter values,
canvas lifecycle, or browser errors. The screenshots are product/render evidence, not
human taste acceptance; the player remains the authority on the strengthened Bomb mix
and the perceived rhythm of 2–4-line clears.
