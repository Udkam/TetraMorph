# T37 classic centre-out clear evidence

Status: **TECHNICAL PASS — HUMAN PLAY ACCEPTANCE OPEN**

Bound checkpoints:

- contract/docs: `d9e41b4` (`docs(t37): replace direct clear with classic sweep`)
- product/tests: `d1063b80a699c1bc42327a9fb589cabb681a6ac0`
  (`feat(t37): restore classic centre-out clears`)

This evidence slice supersedes the rejected direct whole-row disappearance shown in
`gameplay-feedback-r1`. It binds to the classic centre-out product checkpoint and must
show, from real Pixi output:

- a complete row confirmation flash on each accepted Studio beat;
- the normal-motion sequence `all visible → centre 2 erased → centre 6 erased → row complete`;
- 2/3/4 rows starting top-to-bottom without changing the accepted audio offsets;
- an `8 → 4 → 0` translucent bridge for the final row across Core's unchanged tick-12
  atomic commit;
- stationary, tail-free reduced-motion and Puzzle handling;
- all three themes, desktop Chinese, mobile English, one Canvas, zero DOM cells,
  restart/exit cleanup, and zero browser errors.

## Result

The final Pixi captures show the requested classic game-machine grammar without copying
commercial assets or timing:

- each accepted 2/3/4-line Studio beat first shows a complete-row material flash;
- normal motion then erases the row in three readable stages:
  `all visible → centre 2 erased → centre 6 erased → row complete`;
- rows still start top-to-bottom at the frozen offsets `0/11`, `0/5/11`, and
  `0/4/7/11` ticks;
- after Core's unchanged atomic tick-12 commit, the last row uses a translucent
  renderer-only `8 → 4 → 0` cell bridge over two ticks (about 33.33 ms);
- reduced-motion and Puzzle use one stationary confirmation flash followed by an
  immediate whole-row hide, with no travel or tail;
- Anchor and Bedrock cells remain excluded from flash, erase, and tail handling.

`audit.json` records `PASS`, 25 final captures, an empty `browserErrors` array, an empty
`failures` array, one live Canvas, zero DOM board cells, zero viewport overflow, the same
Canvas after restart, and zero canvases after exit/destroy. Its Core probes confirm that
2/3/4-line boards are unchanged through tick 11 and change atomically at tick 12.

All final evidence frames were visually inspected. In particular, the 4-line sequence
is bound by `clear-4-tick-0.png`, `clear-4-tick-1.png`, `clear-4-tick-2.png`,
`clear-4-tick-3.png`, `clear-4-tick-4.png`, `clear-4-tick-7.png`, and
`clear-4-tick-11.png`; the commit bridge is bound by `clear-4-tail-0.png`,
`clear-4-tail-1.png`, and `clear-4-committed.png`.

## Commands and gates

Capture command (run against an owned Vite server on port 4189):

```powershell
$env:TETRAMORPH_EVIDENCE_ORIGIN='http://127.0.0.1:4189'
node docs/evidence/t37/gameplay-feedback-r2-classic-clear/capture-classic-clear.mjs
```

Result:

```text
PASS source=d1063b80a699c1bc42327a9fb589cabb681a6ac0 captures=25 consoleErrors=0
```

The prescribed web-game client was also run twice against the real Classic route:

```powershell
node C:\Users\Alex` Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js `
  --url http://127.0.0.1:4189/play/classic `
  --click-selector '[data-testid="entry-mode-rules"] + button.primary-action' `
  --actions-file docs/evidence/t37/gameplay-feedback-r2-classic-clear/client-actions.json `
  --iterations 2 --pause-ms 2500 `
  --screenshot-dir docs/evidence/t37/gameplay-feedback-r2-classic-clear/client-final
```

The two final client states both report `screen=game`, `mode=marathon`,
`status=playing`, and `countdown=null`. The second state proves one hard-dropped piece
was locked (`placedPieces=1`, `score=8`) while the gameplay canvas remained visible.
There are no `errors-*.json` files.

Final client artifact SHA-256:

```text
shot-0.png   390BEE743A20FE43A7A6F638167E102D34BF3BE6D5C7EF438AD8D0DC5E041492
shot-1.png   6D06843D45509E4B18A06D0379BFA851C40C61D7B1B3B3BE4178722BA0C36A7C
state-0.json 2C9FDB6FCC0074436FB2B9FDA4FECEFCA7DA996F65C92E445E304559E1F34F56
state-1.json CAB93932303B7615B120B7C77473A9E861B36FB55F13244A4F2AEF708DFDEB23
```

Post-source quality gates:

```text
npm.cmd run typecheck  PASS
npm.cmd run test       PASS — 44 passed / 2 skipped files; 400 passed / 8 skipped tests
npm.cmd run build      PASS — 767 modules; existing chunk-size advisory only
focused clear tests    PASS — 70 / 70
```

The older `gameplay-feedback-r1` evidence remains historical evidence for the rejected
direct-disappearance version; it is not acceptance evidence for this checkpoint.

Human visual/play acceptance remains open. The next required decision is focused actual
play of 2–4-line clears, especially whether the centre-out cadence feels classic and
whether the final-row bridge is visually continuous at normal game speed.
