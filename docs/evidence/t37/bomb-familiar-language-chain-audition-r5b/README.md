# Bomb R5B — product normal-to-chain audition

This source-only evidence page binds real Core normal and row-39 chain fixtures to the
current production `TetrisRenderer` and `AudioEngine`. The three neutral controls use only
the constructor-only A/B/C seam. Product default A remains provisional; the page has no
autoplay, URL/storage selector, persisted verdict, or automatic acceptance.

The listening surface is full-motion `1x` normal then chain. Reduced motion is technical
evidence only. The fail-closed verdict is **全部不通过**, and human listening is deferred
to the final consolidated review.

## Later evidence run (not part of this source checkpoint)

Serve the committed source head on strict port 4192, then run `browser-smoke.mjs`, the
prescribed web-game client with `client-actions.json`, and `write-manifest.mjs`. Commit
exactly the twelve pre-report paths declared in `write-manifest.mjs`; from that clean head
run `verify.mjs`, then commit only `verification-report.json`. The source writer must not
run those browser/generation steps.

The browser proof covers desktop and 390×844 mobile, full/reduced motion, keyboard and
44 px targets, product-local assets, one mono event buffer/source, exact 400/1368/466 ms
buffers and shared row-39 beat starts. Reusable stop/restart/disable retain exactly one
context, Renderer ticker, Canvas, and listener set while clearing event work. Terminal
destroy/pagehide remove all owners. HMR proves the old terminal state before one fresh
owner/context/Renderer/ticker/Canvas/listener set is admitted.

All text evidence is UTF-8 without BOM and LF-only. Source, contract, and product hashes
are Git-blob hashes. Pre-commit output hashes use validated raw worktree bytes; terminal
verification recomputes the same domain from the recorded generated-input Git head, so
checkout EOL and `core.autocrlf` cannot redefine evidence.
