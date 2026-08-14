# T37 Bomb R2 live player-review helper

This helper presents the already-frozen Bomb R2 visual candidate through the live public
Core and production `TetrisRenderer`. It is bound to renderer source
`8de0cb732adfe6337605013fd67bcfe2ba63ca86` and does not import or play product audio.

The page reproduces the source-bound evidence fixture with a public hard drop and fails
closed unless all of these facts remain true:

- `clear-started.rows=[30]` with `mutationBombOutcome='chain-clear'`;
- the chain activation has `chainTriggerRows=[30]`;
- the first Bomb carrier spans rows `29/30`;
- the committed board contains zero occupied cells;
- each replay leaves exactly one production Canvas.

Open through the task-owned Vite helper:

```text
http://127.0.0.1:4192/docs/evidence/t37/bomb-row-causal-review-r2/
```

`完整动画 1×` is the real product timing and the only full-motion player-acceptance
reference. `慢速复核 0.5×` changes wall-clock inspection speed only. `减少动态 1×`
uses the production reduced-motion plan. The page initializes one renderer; every replay
uses its public `restarted` event to clear the prior visual clock before applying the same
real Core transition again. Page disposal destroys that renderer and its Canvas.

This is a deterministic Core-to-production-renderer review surface. It does not claim a
naturally reached App run, alter product source, supersede the committed evidence under
`../bomb-row-causal-r2/`, or claim player acceptance.
