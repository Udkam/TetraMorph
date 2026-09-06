# T37 D2B final Endgame category smoke

This browser pass is bound to product source candidate
`92ec0fcca276462ac81757f5e7d0c8ad2e80c944` and ran on 2026-09-06 against an
explicitly owned local Vite server at `http://127.0.0.1:4192`.

The real `/endgames` library was opened from the home route, then its tabs were
activated in order. The browser observed no console or page errors and recorded:

- Intro: 5 cards, active Intro tab, full-motion mode;
- Easy: 25 cards, active Easy tab, category and detail motion classes present 36 ms
  after the interaction;
- Hard: 16 cards, active Hard tab, category and detail motion classes present 36 ms
  after the interaction;
- both final Easy and Hard layouts had a document scroll width equal to the 1440 px
  viewport width, so neither introduced horizontal overflow.

The untracked raw JSON report is SHA-256
`887dbaa8a47a5b6bb7e8005c7f25a163c81a17349f2df2ce4fac4d69ec0f85a5`.
The Easy, Hard, and settled Hard Chromium frames were visually reviewed during this
run. This supplementary smoke complements `audit.json`, which contains the D1
route-transition matrix and mobile Endgame endpoint capture.
