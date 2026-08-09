# T37 continuous classic clear evidence

Status: **TECHNICAL PASS — HUMAN PLAY ACCEPTANCE OPEN**

Bound checkpoints:

- contract/docs: `98d92be7a42149191f7c38060d21783a66515628`
  (`docs(t37): slow and connect classic clears`)
- initial product/tests: `40b3e76` (`feat(t37): connect multi-line clear motion`)
- continuity repair: `b3f21447f36e3a9e9995bb19a6c23f4aa1cc7fe2`
  (`fix(t37): preserve clear material across commit`)

This evidence supersedes the rejected three-tick R2 presentation. The accepted Studio
bytes and starts, one-line clear, Bomb, Action A, Ice 2, and Core's tick-12 atomic
commit remain frozen. Only the renderer-owned 2–4-line presentation changed.

## Result

The final Pixi sequence uses one continuous `0–300 ms` track:

- two rows use `210/120 ms` windows; three and four rows use `120 ms` windows;
- adjacent rows overlap for at least `30 ms`, so a later row begins while the prior row
  is still resolving instead of appearing after a blank interval;
- normal motion removes symmetric cell pairs from the centre outward through sampled
  highlight, scale, and alpha values rather than three boolean visibility steps;
- the original cell material continues through Core's unchanged `200 ms` commit and
  fades beneath the collapsed board/current piece for at most `100 ms`;
- Puzzle and reduced-motion use the same timing but remain spatially stationary;
  Puzzle target markers and all four Mutation materials follow the same cell alpha;
- Anchor and Bedrock remain excluded. Restart, undo, mode/reduced-motion switches,
  destroy, and the `300 ms` endpoint clear all retained cues.

`audit.json` records `PASS`, 53 renderer captures, an empty `browserErrors` array, an
empty `failures` array, one live Canvas, zero DOM board cells, zero viewport overflow,
the same Canvas after restart, and zero canvases after exit/destroy. The Core probes
confirm that each tested board is unchanged before tick 12 and changes atomically on
tick 12. Studio starts remain exactly `0/180`, `0/90/180`, and `0/60/120/180 ms`.

All contact sheets and complete-page/client frames were inspected at original detail:

- `four-normal-contact-sheet.png` shows approximately 60 fps samples from `0` through
  `300 ms`, including `199.9`, `200`, and `250 ms`; the old material is continuous at
  commit, remains visibly in flight at `250 ms`, and is released at `300 ms`;
- `two-normal-contact-sheet.png` shows both rows active together at the `180 ms`
  handoff rather than a hard gap;
- `four-reduced-contact-sheet.png` shows stationary opacity-only handling;
- `two-puzzle-contact-sheet.png` shows stationary target markers continuing through
  commit;
- `live-marathon-zh.png` and `client-final/shot-*.png` show the complete real page and
  successful normal gameplay rather than a synthetic component crop.

## Commands and gates

Capture command (run against an owned Vite server on port 4190):

```powershell
$env:TETRAMORPH_EVIDENCE_ORIGIN='http://127.0.0.1:4190'
$env:TETRAMORPH_SOURCE_SHA='b3f21447f36e3a9e9995bb19a6c23f4aa1cc7fe2'
$env:TETRAMORPH_SOURCE_BASE='98d92be7a42149191f7c38060d21783a66515628'
node docs/evidence/t37/gameplay-feedback-r3-continuous-clear/capture-continuous-clear.mjs
```

Result:

```text
PASS source=b3f21447f36e3a9e9995bb19a6c23f4aa1cc7fe2 captures=53 consoleErrors=0
```

The prescribed web-game client was run twice against the real Classic route:

```powershell
node C:\Users\Alex` Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js `
  --url http://127.0.0.1:4190/play/classic `
  --click-selector '[data-testid="entry-mode-rules"] + button.primary-action' `
  --actions-file docs/evidence/t37/gameplay-feedback-r3-continuous-clear/client-actions.json `
  --iterations 2 --pause-ms 2500 `
  --screenshot-dir docs/evidence/t37/gameplay-feedback-r3-continuous-clear/client-final
```

The first client state reports active play; the second reports one locked O piece,
`score=12`, and the expected next/current pieces. Both retain the gameplay canvas and
there are no `errors-*.json` files.

Final client artifact SHA-256:

```text
shot-0.png   173A8F26B2D7080100D7D89DCC47052E0415204885CB67E2A5481D5CA18FAF4C
shot-1.png   4F06042F6484168E5E27AA8176644B053930CA26EA2E4B1027B927395763077F
state-0.json FD0CAC718079B9D96835BA657C3249173C395759B88916C34685F73567F5900A
state-1.json 70EA3ABDF07C1FD57A0274ABBB7833169D7EF5C63084ADA8CE4006CE2710DB2E
```

Post-source quality gates:

```text
npm.cmd run typecheck  PASS
npm.cmd run test       PASS — 44 passed / 2 skipped files; 401 passed / 8 skipped tests
npm.cmd run build      PASS — 767 modules; existing chunk-size advisory only
focused R3 tests       PASS — 71 / 71
independent recheck   PASS — 109 / 109; P0/P1/P2/P3 all zero
```

The independent recheck first caught a commit-frame opacity jump, lost Puzzle/Mutation
material, and incomplete reduced-motion cleanup in `40b3e76`; `b3f2144` closes all
three findings. Human normal-speed visual/play acceptance remains open and is the next
authoritative gate.
