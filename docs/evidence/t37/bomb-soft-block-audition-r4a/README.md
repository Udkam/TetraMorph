# Bomb R4A — normal cue listening gate

This evidence-only page presents three new deterministic normal-Bomb cues through the
current production `TetrisRenderer`. It does not call `AudioEngine.play`, does not include
a chain-clear cue, and does not modify product audio.

Human status is deliberately fail-closed:

- X, Y, and Z are neutral identifiers, not material descriptions.
- the visible page defaults to **全部不通过**;
- full-motion `1x` is the only sound-taste surface;
- reduced motion is an automated technical surface only;
- no automatic PASS in this directory means the sound is human accepted.

## Reproduce

From `E:\Proj\reproduction-tetris`:

```text
node docs/evidence/t37/bomb-soft-block-audition-r4a/render-candidates.mjs
npm.cmd exec vite -- --host 127.0.0.1 --port 4192 --strictPort
node docs/evidence/t37/bomb-soft-block-audition-r4a/browser-smoke.mjs http://127.0.0.1:4192/docs/evidence/t37/bomb-soft-block-audition-r4a/
node docs/evidence/t37/bomb-soft-block-audition-r4a/write-manifest.mjs
node docs/evidence/t37/bomb-soft-block-audition-r4a/verify.mjs
```

Player review URL:

```text
http://127.0.0.1:4192/docs/evidence/t37/bomb-soft-block-audition-r4a/
```

The page exposes `window.render_game_to_text`, `window.advanceTime(ms)`, and
`window.__R4A_TEST__`. Every candidate schedules its WAV exactly `220 ms` after the
captured production-renderer visual clock. A candidate switch before that deadline stops
the old source before it can sound.

## Bound behavior

- Core creates a real normal `blast`: clear row `[39]`, blast rows `[38,39]`, one
  participating Bomb, four exact trigger cells, and no chain fields.
- WAVs are original 48 kHz mono PCM16 procedural renders. The per-voice `1.45` gain boost
  and `0.5` ceiling are already completed in those bytes.
- Playback graph is WAV -> Mutation `0.96` -> candidate effects `1` -> master `1.85` ->
  Action compressor `-4/6/3:1/3 ms/120 ms` -> enabled gate `1` -> volume `1 * 0.78`.
- Hard-drop uses the accepted Action scheduler and graph. One-line clear uses the frozen
  Studio asset, scheduler, compressor, and the same gate/output.
- Full-motion cleanup drains the 620 ms activation and 850 ms particle hold. Reduced
  technical frames at `0/219/220/619 ms` are pixel-identical and have zero active
  particles. Pagehide, HMR, explicit dispose, replay, and stop clear sources, timers,
  frame callbacks, ResizeObserver, Renderer, Canvas, and AudioContext.

Inspect `verification-report.json`, `browser-report.json`, the three screenshots, and
`manifest.json` for the machine evidence. The remaining gap is player listening only.
