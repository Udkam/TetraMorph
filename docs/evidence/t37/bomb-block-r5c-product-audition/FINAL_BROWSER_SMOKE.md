# T37 R5C final browser smoke

This final technical run is bound to product source candidate
`92ec0fcca276462ac81757f5e7d0c8ad2e80c944` and was captured on 2026-09-06 from an
explicitly owned local Vite server at `http://127.0.0.1:4192`.

```powershell
node docs/evidence/t37/bomb-block-r5c-product-audition/browser-smoke.mjs http://127.0.0.1:4192/docs/evidence/t37/bomb-block-r5c-product-audition/
```

The run passed with empty console, page, request, and assertion-failure arrays. It
exercised the real Core Bomb path rather than a hidden sample or a fabricated A/B/C
asset:

- normal Bomb: one source, visual/audio onset at 220 ms, zero pre-beat samples,
  peak absolute sample `0.0754463449`;
- 20-beat chained clear: one source, exact rendered Float32 hash and zero residual;
- reduced motion: shortened 20-beat path, exact rendered Float32 hash and zero
  residual;
- all checkpoints maintained exactly one Canvas and released active audio sources on
  teardown/HMR/pagehide.

The untracked raw JSON report is SHA-256
`7f51ab5ed0fc0502cd5aa76441fb7eea4262dfed4704862ef48fc783a20efe86`.
Desktop normal, desktop chain, and mobile normal frames were visually reviewed during
the run. This is technical evidence only: it does not substitute for the player's
listening acceptance of timbre and perceived loudness.
