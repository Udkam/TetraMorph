# Bomb R5A — familiar-language normal-cue listening gate

This evidence-only page presents three deterministic normal-Bomb cues assembled from
the game's existing Action, Studio, and compact procedural languages. It imports the
current production `TetrisRenderer`, uses a real Core normal-Bomb fixture, and does not
modify product audio or create a chain-clear cue.

Human status is deliberately fail-closed:

- `A`, `B`, and `C` are neutral identifiers rather than descriptive sound names;
- the page defaults to **全部不通过** and never autoplays;
- full-motion `1x` is the only sound-taste surface;
- reduced motion is an automated technical surface only;
- automatic verification cannot accept any candidate.

The open listening gate does not authorize R5B or product-audio integration. The
coordinator may continue separately authorized work while this player verdict remains
open.

## Reproduce

From `E:\Proj\reproduction-tetris`, first serve the committed source-only evidence head:

```text
npm.cmd exec vite -- --host 127.0.0.1 --port 4192 --strictPort
```

Then run, in order:

```text
node docs/evidence/t37/bomb-familiar-language-audition-r5a/render-candidates.mjs http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/render-harness.html
node docs/evidence/t37/bomb-familiar-language-audition-r5a/browser-smoke.mjs http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/
node C:\Users\Alex Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js --url http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/ --actions-file docs/evidence/t37/bomb-familiar-language-audition-r5a/client-actions.json --click-selector '[data-play="A"]' --iterations 3 --pause-ms 250 --screenshot-dir docs/evidence/t37/bomb-familiar-language-audition-r5a/client-smoke
node docs/evidence/t37/bomb-familiar-language-audition-r5a/write-manifest.mjs http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/render-harness.html
node docs/evidence/t37/bomb-familiar-language-audition-r5a/verify.mjs http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/
```

Player review URL:

```text
http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/
```

The page exposes `window.render_game_to_text`, `window.advanceTime(ms)`, and
`window.__R5A_TEST__`. Every candidate schedules its committed WAV exactly `220 ms`
after the production-renderer visual clock begins. Switching, stopping, natural
completion, explicit disposal, pagehide, and HMR have separately exercised cleanup
contracts.

## Bound behavior

- Core creates a real normal `blast`: clear row `[39]`, blast rows `[38,39]`, one
  participating Bomb, four exact trigger cells, and no chain fields.
- Each WAV is a deterministic 48 kHz mono PCM16 stem rendered twice in pinned Chromium
  from the committed source graph. It ends after its owned compressors and candidate
  trim, before the listening page's enabled gate and `0.78` output volume.
- A is the complete accepted hard-drop atom at impact, lock at `+9 ms`, and move at
  `+18 ms`, all at neutral pan, sharing the Action graph.
- B is the complete hard-drop atom plus a candidate-local bounded Studio-derived excerpt
  at `+12 ms`; the full accepted Studio reference remains separately available and
  unchanged.
- C is one compact countdown-knock grammar layer with no pitch glide.
- Full hard-drop and full Studio references can be compared directly against A, B, or C.
- The browser proof covers reusable switch/stop/completion behavior and twelve terminal
  lifecycle cases: priming, pending, playing, and idle for dispose, pagehide, and HMR.

Inspect `verification-report.json`, `browser-report.json`, the three review screenshots,
the prescribed client states/screenshots, and `manifest.json` for machine evidence. The
remaining sound-quality decision belongs only to player listening.
