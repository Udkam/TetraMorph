# T38 evidence

Product source: `d5b46903debad9568a1ae37be2fa3cab8eb4f22c`.
Production smoke runner including QA coverage corrections: `e0062984`.
No product source changed between these SHAs. Captured 2026-09-22 on Windows,
Node 24.12.0, Playwright 1.61.1 Chromium.

- `final/`: four actual seeded games, next/active/ghost materials and real Core
  activations. `capture.mjs` imports the established deterministic action fixture;
  no replacement board or screenshot is injected. Playwright's clock freezes
  presentation between frames so 220–320 ms effects survive screenshot latency.
  The raw report records the game text, renderer state and source SHA. Eight
  scenes, all four matching active carriers/activation frames, no layout failures.
- `production/`: built `dist` only, 12 scenes across 1440×900, reduced-motion
  390×844 and 844×390, plus storage-denied recovery. Keyboard, touch-capable
  contexts/taps, settings exit, same-document SPA exit and canvas removal,
  direct Endgame route reload; zero collected page/console errors.
- `index.html`: consolidated local review entry; actual product AudioEngine for
  seven audio buttons, current product Bomb visual audition linked separately.
  `check-review.mjs` exercised all seven buttons and normal/chain product audition,
  with no page/console errors. This verifies operation, not human listening approval.
- The required develop-web-game client was run twice; the final run dismissed the
  introductory modal and recorded `status=playing`, one placed piece, actual keys,
  one canvas. Intermediate outputs are local-only in `.local/t38-intermediate`.

Reproduce with a loopback dev server on 4194:

```text
node docs/evidence/t38/capture.mjs
node docs/evidence/t38/check-review.mjs
npm run test:release
```

The release runner owns and stops its production preview process. Runtime/audio
unit tests, not screenshot counts alone, cover listener/audio/ticker cleanup.
No Safari/Firefox or physical-device validation is claimed. No external hosting
or subjective approval is implied by these captures.
