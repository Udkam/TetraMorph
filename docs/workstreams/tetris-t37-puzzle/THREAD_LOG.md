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

## F4A — non-published Intro-01 authoring

- Task ID: `T37-F4A` (coordinator-owned implementation; independent QA
  `/root/f4a_candidate_b`)
- Base SHA: `4e1ab52922de90ef39e9e133f2938a7dc3d7b299`
- Source commit: `cfbcab4ba6fa797f4cf5c11f268ef68366ba675f`
- Status: accepted; remains outside the live 50-level library.

### Exact source paths

- `src/game/core/puzzleV3IntroDefinitions.ts`
- `docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-01.json`
- `src/game/core/puzzleV3Intro01Exact.test.ts`

The draft uses setup seed `2080886771`, gameplay seed `1212`, and gap vector `[2,2,2]`.
Its optimal four-lock replay releases rows `[0,1,0,2]`, leaving 16 original targets after
the first clear; one four-lock route diverges at lock 1. This makes the teaching sequence
readable as “complete one row, preserve the remaining structure, then complete two rows”
instead of presenting three simultaneous one-row clears. Pairwise comparison against every
live definition returns no exact, normalized-topology, or near-topology match.

### Commands and evidence

- Normal focused gate:
  `npm.cmd run test -- src/game/core/puzzleV3Intro01Exact.test.ts src/game/core/puzzles.test.ts src/game/core/puzzleV3BehaviorBaseline.test.ts`
  -> `15 passed / 1 skipped`.
- Exact gate with `PUZZLE_EXACT_CERTIFICATES=1`:
  `npm.cmd run test -- src/game/core/puzzleV3Intro01Exact.test.ts` -> `5/5` passed.
- `npm.cmd run typecheck` passed.
- Complete `npm.cmd run test` passed `437 / 12 skipped`.
- `npm.cmd run build` passed with 767 modules.
- Browser evidence is not applicable because the draft is not product-imported and changes
  no runtime, renderer, UI, or playable level.

Exact proof returns optimum 4, initial `ad14d5ee`, depths
`{0,1,34,0},{1,34,1184,440},{2,744,13239,0}`, totals 779 explored states / 14,457
transitions / 440 bound prunes, primary final `b9fe55b0`, and alternative final `f8aef200`.

### Independent QA

Independent read-only source QA reports `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. It verifies
the three-path/335-line boundary, deep freezing and product isolation, canonical schema and
hashes, live 50 and canonical 625-byte base, setup/seed/fingerprint admission, both routes,
and current-Core exact telemetry. Index and inherited protected dirty paths remain unchanged.

### Blocker and next action

- Blocker: none.
- Next action: freeze and independently review a docs-only F4B Intro-02 well-preservation
  contract before opening any new source path.

## F4B — non-published Intro-02 authoring

- Task ID: `T37-F4B` (coordinator-owned implementation; independent source review by two
  read-only workers)
- Base SHA: `48275bdd2e9c069bac1a62218ee2deeef67fa68f`
- Source commit: `c571f54dfe0077b5dc88554671ed0f25c5abb335`
- Status: accepted; remains outside the live 50-level library.

### Exact source paths

- `src/game/core/puzzleV3IntroDefinitions.ts`
- `docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-02.json`
- `src/game/core/puzzleV3Intro02Exact.test.ts`
- `src/game/core/puzzleV3Intro01Exact.test.ts`

The source appends stable ID `t3r-shaft-02`, pins Intro-01 by ID/index/bytes/hash without a
whole-array length assertion, and changes 340 added plus two deleted lines. The six legal
setup drops create the `[4,1,1]` floor mask and unique x=6 well. Both four-lock routes keep
the well open through three zero-clear locks, then use the same vertical I at y36..39 to
release all three rows. The canonical artifact is 621 bytes with SHA-256
`1E67D9E72F64769DDF4703FF9909A3C08EA4454638662B7E76DD1E001884A9EB`.

### Commands and evidence

- Normal focused gate over Intro-01/02, `puzzles.test.ts`, and the v3 behavior baseline:
  `19 passed / 2 skipped`.
- Combined opt-in Intro exact gate with `PUZZLE_EXACT_CERTIFICATES=1`: `10/10` passed.
- `npm.cmd run typecheck` passed.
- Complete `npm.cmd run test` passed `441 / 13 skipped`.
- `npm.cmd run build` passed with 767 modules.
- Browser evidence is not applicable because the drafts are not imported by product code.

Exact proof returns optimum 4, initial `3aadbdab`, depths
`{0,1,17,0},{1,17,589,206},{2,383,13661,0}`, totals 401 explored states / 14,267
transitions / 206 bound prunes, primary final `b060114c`, and alternative final `e78bd4f0`.

### Independent QA

Two fresh read-only source reviews each report `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
They independently verify the exact four-path/line boundary, product isolation, deep freezing,
canonical bytes and hashes, pinned live/Intro-01 baselines, every topology comparison, legal
setup, both routes, well coordinates, exact telemetry, empty index, and unchanged protected
dirty paths.

### Blocker and next action

- Blocker: none.
- Next action: freeze and independently review a docs-only F4C `t3r-shaft-03` four-row
  support-before-bridge contract before candidate discovery or any source edit.
