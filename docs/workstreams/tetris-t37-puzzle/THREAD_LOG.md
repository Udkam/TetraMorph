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
release all three rows. The serialized draft definition is 621 bytes with SHA-256
`1E67D9E72F64769DDF4703FF9909A3C08EA4454638662B7E76DD1E001884A9EB`; the canonical
schema-8 certificate file is 1,421 bytes with SHA-256
`8EC555240FD12F07B7C873DC3F163356EA9B8113C58D1E944497889A2EE03B75`.

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

## F4C — Intro-03 authoring contract

- Task ID: `T37-F4C-CONTRACT`
- Base SHA: `6636cd0` (F4B artifact-identity correction)
- Status: contract frozen; independent QA pending; no source path open.

The new draft keeps stable ID/name/difficulty `t3r-shaft-03` / `托台` / 3 but deliberately
uses four target rows. Live Intro-03 remains the pinned three-row product baseline until the
later atomic campaign switch. Eight legal zero-clear setup drops must produce 32 targets and
eight gaps in the four floor rows, without anchors or hidden cells.

Both stored routes must use lock 1 as support and lock 2 as a horizontal bridge. The first two
locks clear nothing. Immediately before lock 2, every blocker encountered by shifting the
complete bridge down one row must be a cell from lock 1; at least one blocker is inside a
three-cell-or-longer horizontal run, with open below-cells to its left and right. Candidate
evidence freezes both routes' signatures, run cells, blockers, releases, remaining targets,
hashes, and strict exact telemetry.

First QA rejects `588e065` with `P1 2 / P3 1`: one F4B paragraph was misplaced below the F4C
heading, and “blocker inside run” mixed source-row and shifted-destination coordinates. The
repair restores the F4B paragraph and defines the bridge check as an interior run source
`{x,y}` whose shifted destination `{x,y+1}` is support, with separate left/right source cells
whose shifted destinations are empty.

Re-QA closes those two P1 issues, then reports P2 because the phase summary could allow the
alternative to clear four rows in one event. The repair now requires both routes to start
`[0,0]`, then use at least two positive releases summing to four, strictly reduce targets on
each positive event, and finish at zero; the exact arrays may differ.

Both final reviews of `66c567d` close P0/P1/P2/GAP and retain only a P3 because STATE still
asked to create a commit that already existed. This checkpoint correction removes that stale
instruction; it does not change the contract body.

- Blocker: candidate discovery is closed pending two all-zero reviews of the repaired SHA.
- Next action: obtain two independent all-zero confirmations of the current HEAD containing
  this record; then open only bounded repository-external candidate discovery.

Two independent confirmations of HEAD `3e9811a` report
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. The contract is accepted. No repository source path is
open yet.

- Blocker: none for bounded external discovery.
- Next action: search outside the repository for a qualifying four-lock candidate; require
  independent current-Core replay, exact proof, and preimplementation QA before source.

### Candidate freeze

Repository-external construction found a legal candidate using setup seed `37220`, gameplay
seed `2900`, four-row gap vector `[3,1,1,3]`, and primary/alternative five-lock releases
`[0,0,2,1,1]`. The routes diverge at lock 1 and prove the required O-support/horizontal-I
bridge geometry. Current-Core exact proof returns optimum 5, initial hash `9ac8a069`, 2,498
explored states, 46,762 transitions, and 3,034 deficit-bound prunes. Pairwise admission
against live 50 plus Intro-01/02 is all false. Candidate mechanics passed read-only
preimplementation QA; the docs freeze still needs fresh independent review.

- Blocker: none.
- Next action: independently review this docs-only freeze, repair any finding, then commit
  the all-zero freeze and implement only the authorized three-path Intro-03 source checkpoint.

## F4C — Intro-03 source acceptance

- Task ID: `T37-F4C-SOURCE`
- Base SHA: `0ac4c4215a60363d3a238205528818376224592b`
- Candidate SHA: `95f331601d598280d7f6a10f29e387e987ed0a3a`
- Status: accepted outside product; live 50 unchanged.

The source checkpoint adds exactly
`src/game/core/puzzleV3IntroDefinitions.ts`,
`docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-03.json`, and
`src/game/core/puzzleV3Intro03Exact.test.ts`: three paths and 336 added lines. It reproduces
the frozen setup, both lock-1-divergent five-lock routes, releases `[0,0,2,1,1]`, canonical
schema-8 bytes and hashes, initial `9ac8a069`, optimum 5, 2,498 explored states, 46,762
transitions, and 3,034 deficit-bound prunes.

Normal focused tests pass `23 / 3 skipped`; the opt-in exact gate passes `5/5`; typecheck
passes; the final complete suite passes `445 / 14 skipped`; and the build transforms 767
modules. One earlier full-suite run hit an unrelated renderer `beforeAll` timeout, followed
by an isolated `54/54` pass and the clean final full pass. Three independent source reviews
each report `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.

- Blocker: none for the next docs-only contract.
- Next action: reconcile the live `t3r-cascade-06` baseline with the frozen Intro-04 role,
  then commit and independently review a mechanically testable four-row local-clear/
  only-opening contract before discovery. Product, progression/UI, sensory, protected T27
  paths, and icon remain closed.

## F4D — Intro-04 authoring contract

- Task ID: `T37-F4D-CONTRACT`
- Base SHA: `877ceb6f5fd6d5c915b3c695cc364196f15a6943`
- Status: contract frozen; independent docs QA pending; no source path open.

Live `t3r-cascade-06` remains targetRows 3 with setup seed `5200003`, gameplay seed
`1717986918`, rows `IIIILLL... / OO.TLZZJJJ / OOTTT.ZZ.J`, 627 serialized bytes, and
SHA-256 `7B10203C8C02B1C575761BFDE6F471E8CD298FE0E7B3FD3AC3E8E1E25D1CDAFE`.
The non-published v3 draft deliberately uses four rows through noncanonical validation.

The frozen lesson begins with 32 targets from eight legal zero-clear setup drops and exactly
one column empty from world rows 20 through 39. Both routes recompute and preserve that sole
opening after every non-final lock. At lock 1 or 2, one piece fills a two- or three-cell
contiguous bottom-row gap including the opening, clears only row 39 without finishing, retains
at least one off-row survivor outside the opening, and restores the same sole corridor after
ordinary Core clear mapping. Intermediate locks clear nothing. The final vertical I occupies
the corridor at y=36..39 and clears the remaining three target rows. Both routes therefore
have exactly two positive releases, `1` then `3`, and prove the full coordinate/state chain.

Primary optimum is four or five locks. One early-divergent alternative may be at most optimum
plus two. Unique seed, all 53 pairwise structure exclusions, schema-8 serialization/hashes,
and uncapped no-beam shorter-depth proof remain mandatory. Accepted prior draft pins are
Intro-01 622 / `DFC1...FDA8`, Intro-02 621 / `1E67...A9EB`, and Intro-03 682 /
`A825...EC9E`.

The eventual source boundary is three paths / at most 500 hand-authored changed lines:
`puzzleV3IntroDefinitions.ts`, `puzzle-v3-intro-04.json`, and
`puzzleV3Intro04Exact.test.ts`. Existing Intro tests, product definitions, progress, UI,
sensory, protected T27 paths, and icon remain closed.

- Blocker: discovery is closed pending fresh independent review of committed contract
  `de917a7e6f0be1fc26736343f7e3c43917e9d3ce` and this checkpoint correction.
- Next action: obtain two independent reports on the corrected HEAD with
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`; repair any finding before opening only
  repository-external candidate discovery.

Two final independent reviews of corrected HEAD `fcfc15e` report
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. They verify the live/prior byte pins, 53-comparison
admission, schema-8 and exact-proof boundary, three-path feasibility, unique-opening state
definition, local row-39 clear and survivor mapping, and final vertical-I use. The earlier
stale-next-action P2 is closed.

- Blocker: none for repository-external candidate discovery.
- Next action: discover a qualifying F4D candidate outside the repository, then independently
  replay and freeze every literal before any source path opens.

## F4D — Intro-04 contract revision after discovery

- Task ID: `T37-F4D-CONTRACT-R2`
- Base SHA: `16570db8b72c3da5d907371f5ac4d1311c502f81`
- Status: contract R2 accepted; repository-external discovery active; source closed.

Repository-external discovery narrowed 2,040 eight-drop masks to 16 complete-control-domain
local-lock geometries. The setup exact-cover search naturally exhausted all seven eight-draw
count profiles for each of those 16 with zero legal no-same-type-touch tilings. This proves
the accepted index-1 search family cannot satisfy its eight-drop setup boundary; it does not
claim an unrestricted mathematical impossibility for every conceivable index-2 construction.

The minimal replacement is seven legal zero-clear setup drops, 28 targets, twelve total gaps,
and one through four gaps on each of rows 36–39. Local clear is lock 1, row 39's exact two-cell
gap includes the unique opening, and the settled state owns 20 targets. Later non-final locks
release zero; the terminal vertical I releases the remaining three rows. Primary optimum is
four through six and the one stored alternative first diverges at lock 2. Schema 8, the 53
pairwise exclusions, unique seeds, hash domains, and uncapped no-beam proof remain unchanged.

Discovery validation already found 25 legal seven-drop definitions; an independent current-
Core audit retained 11 fully local-qualified candidates across eight unique boards and found
one contract-shaped first lock for each. None is frozen and no source path is open.

- Evidence SHA-256: geometry `8D84B60A...73081`; reachable-mask set
  `41F07134...8ECDB`; exhausted eight-drop tilings `2A33921A...9149A`; seven-drop
  candidates `289D6130...7AE2`; current-Core local replay `789A36A7...7892`; independent
  contract audit script/output `045D28D3...CAE3F` / `9986A0CC...D7D85`.
- Independent QA of exact range `16570db..a09b64f` reports
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. It verifies a direct-child five-path checkpoint,
  internally consistent R2 counts/invariants, clean diff checks, and continued isolation of
  protected T27/follow-up/progress paths.
- Next action: continue repository-external complete-candidate discovery. Freeze no setup,
  route, seed, or source until current-Core replay, both route invariants, 53 pairwise
  exclusions, canonical hashes, and uncapped exact proof all pass.

## F4D — Intro-04 R3 candidate freeze

- Task ID: `T37-F4D-CANDIDATE-R3`
- Base SHA: `3632f4c9`
- Status: qualified docs candidate; independent QA next; source closed.

Setup `49` and placements `I0@6,L0@1,T1@-1,J0@7,O0@8,Z1@1,S0@5` derive the exact four
floor rows `...Z..SSOO / T.ZZ.SSJOO / TTZL...JJJ / TLLL..IIII`. The candidate corrects
R2's per-row cap to exact gaps `[5,2,3,2]` and replaces the unavailable terminal-I invariant
with an explicit corridor migration: local S restores `[4]`, Z preserves it, J uses it and
migrates the opening to `[0]`/`[1]`, and T uses the migrated opening to finish.

Gameplay seed `83` is unique and all 53 pairwise admissions pass. Primary/alternative releases
are `[1,0,2,1]` / `[1,0,1,2]`, both are exactly four locks, and first divergence is lock 2.
Exact proof records initial `faa34545`, 12 states, 308 transitions, 93 prunes, and no shorter
route. Definition/artifact pins are 647 bytes / `4D542D3A...4941A` and 1,477 bytes /
`EC17469F...EFB1A`. TEMP freeze script/output hash `4F6EC55E...C742C7A` /
`56DEA01D...52A4DB`; independent complete-domain evidence `3D6E2386...CCE27` finds seven
optimal geometries. No repository source or protected path changed.

- Blocker: fresh independent R3 contract/candidate QA.
- Next action: repair any finding; with all-zero QA, commit this docs freeze and open only
  the authorized definition/artifact/exact-test paths, under 500 hand-authored lines and
  without changing existing Intro tests.

## F4D — Intro-04 source acceptance

- Task ID: `T37-F4D-SOURCE-R3`
- Base/candidate: `ca8ceec..d3aafc0`
- Exact paths: definition append, `puzzle-v3-intro-04.json`, Intro-04 exact test.
- Status: accepted outside product; F4E docs contract next.

The source checkpoint adds 381 lines across exactly three authorized paths. Writer gates are
focused `16 / 4 skipped`, Intro-04 exact `5/5`, typecheck, isolated renderer `54/54`, clean
final full `449 / 15 skipped`, and build 767 modules. Formal source QA also runs all four
Intro exact suites `20/20`; formal and adversarial reviews both report P0–P3/GAP all zero.
Protected T27/follow-up/progress paths remain unstaged and outside the commit.

- Blocker: none for docs-only F4E contract authoring.
- Next action: freeze and independently review the Intro-05 Current/Next-1/Next-2 planning
  contract, including the append-compatible Intro-04 test boundary.

## F4E — Intro-05 Current/Next-1/Next-2 contract

- Task ID: `T37-F4E-CONTRACT`
- Base SHA: `159bfbc`
- Status: contract accepted; repository-external discovery open; source closed.

Live `t3r-shaft-04` is pinned at 625 bytes / `E973122A...D7A2`, setup `5200006`, gameplay
seed `2309737967`, first bag `OTSIJZL`, and its exact three floor rows. The non-published
draft uses eight zero-clear setup drops / 32 targets / four rows, gap sum eight with each row
in `1..3`, no anchors/hidden cells, unique seed, and 54 pairwise exclusions.

The teaching test is a causal two-hop support chain. Locks 1–3 follow the first three queue
draws and clear zero. Lock 2's identical pose must be blocked from descending in `before[2]`;
its nonempty occupied shifted set must belong entirely to lock 1; removing lock 1 must make
every shifted cell empty and allow it to descend one row. Removing lock 2 from `before[3]`
must do the same for lock 3, with a shifted
cell owned by the removed lock in each original state. Both routes share lock 1, diverge at
lock 2 or 3, prove the chain, then use at least two positive events summing to four rows.

Primary optimum is 5–7 with uncapped current-Core proof; one alternative is within +2.
Schema 8 and prior definition/hash pins remain frozen. Source is exactly four paths / <=500
lines, including only the minimum Intro-04 prefix-assertion repair required for appendability.

- Blocker: fresh independent contract QA.
- Next action: repair findings and, only after all-zero QA, run repository-external candidate
  discovery without editing source/product/protected paths.

Formal and adversarial reviews now report P0–P3/GAP all zero. The final wording requires a
nonempty complete set of shifted blockers owned by the immediately previous lock, with the
original pose blocked and the remove-then-descend counterfactual open. Contract QA is closed.

- Blocker: none for repository-external candidate discovery.
- Next action: discover and independently freeze a complete F4E candidate; keep all four
  source paths closed until setup, both support chains, admissions, hashes, and exact proof pass.
