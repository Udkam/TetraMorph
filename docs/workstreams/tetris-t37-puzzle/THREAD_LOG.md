# Tetris T37 Puzzle Workstream Log

## F3D — schema-8 exhausted-depth telemetry

- Task ID: `T37-F3D` (`/root/f3d_depth_telemetry_writer`)
- Base SHA: `46564e575ffee9a1ff65b6e1f19e879d327fc6f6`
- Source commit: `7f3180206e3fb45c6b476b507983d8c8bfd47716`
- Status: source green; independent read-only QA accepted; coordinator documentation acceptance pending.

### Exact source paths

- `src/game/core/puzzleRouteSearch.ts`
- `src/game/core/puzzleMasteryExact.test.ts`
- `src/game/core/puzzleV3PrototypeExact.test.ts`

The source checkpoint exports the readonly per-depth record, freezes `exhaustedDepths`
and every record, and derives all legacy frontier/exploration/transition/prune values
from those records. The five mastery/admission records and the F3C
`[{lockedPieces:0,frontierStates:1,transitions:0,boundPrunes:1}]` record are literal
regressions. Existing route, optimum, state hash, replay, and aggregate values did not
change.

### Writer commands actually run

1. First mastery-only discovery:

   ```powershell
   $env:PUZZLE_EXACT_CERTIFICATES='1'; npm.cmd run test -- --run src/game/core/puzzleMasteryExact.test.ts
   ```

   Result: `1` file and `5/5` tests passed in `248.64 s`. Vitest's default console
   interception suppressed the temporary telemetry output, so this run did not capture
   the depth literals.

2. Coordinator-approved mastery-only discovery rerun:

   ```powershell
   $env:PUZZLE_EXACT_CERTIFICATES='1'; npm.cmd run test -- --run src/game/core/puzzleMasteryExact.test.ts --disableConsoleIntercept --reporter=verbose
   ```

   Result: `1` file and `5/5` tests passed in `247.38 s`; all three mastery and two
   anchor depth-record literals were captured. The temporary console markers were then
   removed, and a targeted `rg` check found no console/debug residue.

3. Normal focused gate:

   ```powershell
   npm.cmd run test -- --run src/game/core/puzzleRouteSearch.test.ts src/game/core/puzzleMasteryExact.test.ts src/game/core/puzzleV3PrototypeExact.test.ts
   ```

   Result: `2` files passed, `1` file skipped; `11` tests passed and `6` opt-in tests
   skipped, in `19.25 s`.

4. Final combined opt-in exact gate:

   ```powershell
   $env:PUZZLE_EXACT_CERTIFICATES='1'; npm.cmd run test -- --run src/game/core/puzzleMasteryExact.test.ts src/game/core/puzzleV3PrototypeExact.test.ts
   ```

   Result: `2` files and `9/9` tests passed in `239.00 s`. This was the sole formal
   writer acceptance run after the literals were frozen.

5. Typecheck:

   ```powershell
   npm.cmd run typecheck
   ```

   Result: passed (`tsc -b --pretty false`). Final writer checks also found an empty
   staged set, an exact three-path source diff of `120` insertions / `12` deletions,
   and a clean `git diff --check`.

### Independent QA

Independent read-only QA bound the frozen three-path source to base `46564e5` and
reported `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. It independently confirmed the
per-depth values and freezing, legacy derivation, F3C literal, unchanged routes/hashes/
aggregates, unchanged exact search domain, empty index, and source hashes. QA made no
edit, stage, or commit.

### Coordinator-only gates

The coordinator separately reported the complete suite at `433 passed / 11 skipped`
and the production build at `767 modules`. These were not writer-run commands and are
recorded only as coordinator-reported integration evidence.

### Blocker and next action

- Blocker: none.
- Next action: the coordinator records F3D documentation acceptance and opens only the
  bounded F4A contract.
