# T37 single-line continuous classic clear evidence

Status: **TECHNICAL PASS — HUMAN PLAY ACCEPTANCE OPEN**

Bound checkpoints:

- contract/docs: `71f74af0b79dae8747ffc10d2543236406006095`
  (`docs(t37): extend accepted clear to one line`)
- product/tests: `aab8ed8a3e6b9f608b4c1fa990bf9c93b4f28e56`
  (`feat(t37): share continuous clear with one line`)

The player accepted the R3 2–4-line classic clear and explicitly asked one-line clears
to use the same effect. This checkpoint changes only that one-line presentation. The
accepted 2–4-line timing/materials, Studio cue starts, audio bytes, Bomb, Action A,
Ice 2, and Core's tick-12 atomic commit remain frozen.

## Result

One-line clears now use the same renderer-owned continuous grammar on a `0–300 ms`
track:

- normal motion keeps the captured cell material and resolves symmetric pairs from
  the centre outward through sampled highlight, scale, and alpha values;
- the cue remains continuous across Core's unchanged `200 ms` commit, retains a
  partially visible edge at `250 ms`, becomes visually empty just before the endpoint,
  and is released at `300 ms`;
- Puzzle and reduced-motion stay spatially stationary and use opacity-only handling;
- Puzzle target markers and Mutation companion material follow the owning cell alpha;
- Anchor and Bedrock remain excluded, and restart/mode switch/destroy clean up the cue;
- one-line Studio audio still starts once at `0 ms`. The accepted 2–4-line starts remain
  `0/180`, `0/90/180`, and `0/60/120/180 ms`.

`audit.json` records `PASS`, 47 renderer captures, an empty `browserErrors` array, an
empty `failures` array, one live Canvas, zero DOM board cells, the same Canvas after
restart, and zero canvases after exit/destroy. Every normal, reduced-motion, Puzzle,
and Freeze scenario keeps Core unchanged before tick 12, commits atomically at tick 12,
and emits exactly one cleared line.

The four contact sheets and live/client frames were inspected at original detail:

- `single-normal-contact-sheet.png` shows approximately 60 fps samples from `0` through
  `300 ms`, including `199.9`, `200`, `250`, and `299.9 ms`; there is no blank or
  material swap at commit;
- `single-reduced-contact-sheet.png` shows stationary opacity-only handling;
- `single-puzzle-contact-sheet.png` shows the target marker following its cell through
  the commit and tail;
- `single-freeze-contact-sheet.png` shows the Ice companion material following the same
  continuous centre-out track;
- `live-marathon-zh.png` is a complete real Chinese gameplay page. The two prescribed
  client screenshots are gameplay-area captures and show a real locked piece rather
  than a synthetic renderer fixture.

## Commands and gates

Capture command, run against an owned Vite server on port 4190:

```powershell
$env:TETRAMORPH_EVIDENCE_ORIGIN='http://127.0.0.1:4190'
$env:TETRAMORPH_SOURCE_SHA='aab8ed8'
$env:TETRAMORPH_SOURCE_BASE='71f74af'
node docs/evidence/t37/gameplay-feedback-r4-single-line-clear/capture-single-line-clear.mjs
```

Result:

```text
PASS source=aab8ed8a3e6b9f608b4c1fa990bf9c93b4f28e56 captures=47 consoleErrors=0
```

The prescribed web-game client ran twice against the real Classic route:

```powershell
node C:\Users\Alex` Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js `
  --url http://127.0.0.1:4190/play/classic `
  --click-selector '[data-testid="entry-mode-rules"] + button.primary-action' `
  --actions-file docs/evidence/t37/gameplay-feedback-r4-single-line-clear/client-actions.json `
  --iterations 2 --pause-ms 2500 `
  --screenshot-dir docs/evidence/t37/gameplay-feedback-r4-single-line-clear/client-final
```

The first client state reports active play. The second reports one locked O piece,
`score=14`, and the expected next/current pieces. Both retain the gameplay Canvas and
the directory contains no `errors-*.json` files.

Final client artifact SHA-256:

```text
shot-0.png   56DE10CB1EE1FECC75DB06A2F09F175223020194EA16A3DF5743B4D6D0E58F52
shot-1.png   15443741222AB81BE620FDC3B38964CAD2ECBD01321E3AE6EF19504C7F964F3D
state-0.json DC4A08F21E0F5140B7A876EF9925C58995E8B5CFF3E34AF1D774D0F487215702
state-1.json 02CACA85C95CE0AA1BB84C9F94CC015116A1429F7D4D68677F1A454C0EAA95BA
```

Post-source quality gates:

```text
npm.cmd run typecheck  PASS
npm.cmd run test       PASS — 44 passed / 2 skipped files; 402 passed / 8 skipped tests
npm.cmd run build      PASS — 767 modules; existing chunk-size advisory only
focused tests          PASS — 72 / 72
independent source QA  PASS — P0/P1/P2/P3 all zero
```

Human normal-speed play acceptance for the new one-line extension remains the final
authoritative gate. The accepted 2–4-line R3 effect is not reopened.
