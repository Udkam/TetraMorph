# T37 Stage F — Puzzle Curriculum v3

Status: **F4C INTRO-03 ACCEPTED; F4D INTRO-04 CONTRACT ACCEPTED — DISCOVERY OPEN**

Baseline: `e675389500cdae8063da4d37f4cdda47a62ffe76`

## Purpose and sequencing

Stage F replaces the current 10/20/20 campaign with exactly **5 Intro / 25 Easy /
16 Hard** levels without attaching old records to different games. The campaign stays
inside the shared 10 × 20 Core well for this pass. Visual board variation comes from
legally authored target silhouettes and immutable anchors; variable board width or
height remains a separate, unopened Core/renderer/input contract.

No published definition changes in F1. The order is:

1. freeze stable IDs, retirements, rebuilds, operation semantics, proof schema, and
   migration;
2. repair the strict public-control proof domain and prove ordinary, one-anchor, and
   two-anchor fixtures;
3. extend bounded authoring validation to ten target rows and richer anchors;
4. rebuild the five Intro levels;
5. recertify five Easy levels per checkpoint, preserving their definitions;
6. retain or rebuild the sixteen Hard levels in technique batches;
7. adopt revision-3 progression and v6 persistence;
8. change the library/UI only after all 46 definitions and proofs are green.

The old T15/T32 route JSON and evidence are historical artifacts. They are not edited
to impersonate v3 proof.

Before step 4, F3D closes one schema-8 implementation gap discovered by the post-F3C
inventory. Every exact search-loop depth that begins records
`lockedPieces,frontierStates,transitions,boundPrunes`; aggregate frontier/explored/
transition/prune fields are derived from those records and must remain byte-equivalent to
the accepted results. This is proof telemetry only. The live 50 definitions, mastery,
progress, selector, and the future v3 draft roster remain unchanged.

F3D is accepted at `7f31802`. Its `exhaustedDepths` array and records are frozen, every
legacy total is derived from them, both independent and writer exact runs pass `9/9`, and
no search result changes.

## F4A Intro-01 authoring admission

The first definition checkpoint is authoring-only. It creates one draft module, one
schema-8 certificate JSON, and one direct exact test for stable ID `t3r-shaft-01`; the live
50-level library remains byte-identical. Initial review rejects the original 7–10-drop
criterion because three non-full rows hold at most 27 cells while seven tetrominoes preserve
28. The repaired draft is an anchor-free board from exactly six legal zero-clear setup drops
occupying exactly the three contiguous floor rows. Its top-to-floor gap counts each lie in
`1..4`, sum to six, and do not equal the live level's `[3,1,2]`.

The draft's exact optimum is four or five locks. The chosen optimum has exactly two positive
row releases `[1,2]`; both strictly reduce remaining original targets, and the first leaves
the puzzle unfinished. Exactly one second valid route diverges at lock 1 or 2 within optimum
plus two locks.

The draft module exports only frozen `PUZZLE_V3_INTRO_DRAFTS`; it is not imported by live
product code. The certificate uses the schema-8 key order shown below and is canonical
`JSON.stringify(entry) + "\n"` in UTF-8 without BOM or CR.

The draft object, setup object, every placement object, `boardRows`, `hiddenCells`,
`anchorCells`, and the exported draft-array container are all frozen.
Every `comparePuzzleTopologies(liveDefinition, draft)` result must have `exactMatch=false`,
`topologyMatch=false`, and `nearTopology=false`. This pairwise rule is independent of the
required unique gameplay seed and behavior hash. It deliberately does not require the
whole-library audit arrays to be empty: current Core reports exact 0 / topology 0 / near 10
for the unchanged live 50 alone. The writer log records the final gap vector and a concise
teaching review of the two-stage route; seed-only differentiation is rejected.

`authoringDefinitionHash` is lowercase SHA-256 of one UTF-8 JSON line plus exactly one LF.
`JSON.stringify` receives this exact insertion order:

```ts
{
  schema: 'puzzle-authoring-definition-v1',
  stableId: definition.id,
  targetRows: definition.targetRows,
  setup: {
    seed: definition.setup.seed,
    placements: definition.setup.placements.map(({ type, rotation, x }) => ({ type, rotation, x })),
  },
  boardRows: [...definition.boardRows],
  hiddenCells,
  anchorCells,
  gameplaySeed: definition.seed,
  dimensions: { width: 10, height: 40, visibleStartRow: 20 },
  goal: 'clear-original-targets',
  rulesetRevision: 'puzzle-v3',
}
```

`hiddenCells` is sorted by numeric `y`, numeric `x`, then lexical `type`, and serialized
with coordinate key order `x,y,type`; it is empty in F4A. `anchorCells` is numeric `y,x`
sorted and serialized with key order `x,y`; it is also empty in F4A. `behaviorHash` uses the already frozen
`puzzle-behavior-v1` payload. `routeHash` and every alternative `routeHash` are lowercase
SHA-256 of `UTF8("puzzle-route-v2\0" + commandStream)` with no trailing LF.

The schema-8 entry has exact top insertion order
`schemaVersion,campaignRevision,rulesetRevision,routeTokenVersion,searchStateKeyVersion,`
`operationMetric,levelId,authoringDefinitionHash,behaviorHash,initialStateHash,`
`optimalLockedPieces,optimalRoute,routeHash,lockSignatures,finalStateHash,`
`solutionMultiplicity,proof,alternatives,techniqueEvidenceId`. `proof` exact order is
`kind,lowerBoundVersion,exhaustedDepths,exploredStateCount,transitionCount`; each depth
uses `lockedPieces,frontierStates,transitions,boundPrunes`. Each alternative exact order is
`route,routeHash,lockSignatures,firstDivergenceLock`.

F4A uses `proof.kind='exhaustive-shorter-depths'`,
`proof.lowerBoundVersion='target-column-deficit-v1'`,
`solutionMultiplicity='multiple'`, and `techniqueEvidenceId=null`. The exact test must
independently rebuild every field from current Core, while also pinning the unchanged live
50-level roster and canonical 625-byte `t3r-shaft-01`. Discovery may use bounded authoring
search, but no beam/null/timeout/cap result enters the certificate. Contract QA precedes
all discovery and source editing.

The first fresh repair review reported all zero, but a subsequent current-Core probe found
that its whole-audit-empty conclusion was wrong: the live 50 already produce ten historical
near pairs. The gate was repaired to the pairwise rule above. Fresh independent verification
on the corrected HEAD reproduces exact 0 / topology 0 / near 10 for live-only data, confirms
comparison does not depend on stable ID, and reports `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
Candidate discovery is open again; source creation, live product integration, and every other
curriculum definition remain closed.

### F4A selected candidate

Independent current-Core preimplementation QA reports
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` for the selected candidate:

- setup seed `2080886771`; placements `J0@4,Z0@6,T2@4,O0@1,I0@0,S1@7`;
- floor rows `IIIITTT.S.`, `.OO.JTZZSS`, `.OO.JJJZZS`; gap vector `[2,2,2]`;
- unique gameplay seed `1212`, first bag `LTIJZSO`, and zero pairwise exact/topology/near
  matches against all 50 live definitions;
- primary route `SQRRRHTTTQRRRRRHTTTTTTTTTTTTQLHTTTCLLLLHTTTTTTTTTTTT`, locks
  `L:6,35|7,35|7,36|7,37`, `T:9,35|8,36|9,36|9,37`,
  `I:3,36|3,37|3,38|3,39`, `J:0,37|1,37|0,38|0,39`, per-lock releases
  `[0,1,0,2]`, targets `[24,16,16,0]`, and state hashes `ad14d5ee -> b9fe55b0`;
- alternative `SQRRRRRHTTTQRRRHTTTTTTTTTTTTQLHTTTCLLLLHTTTTTTTTTTTT`, first divergence
  1, first two locks `L:8,35|9,35|9,36|9,37` and `T:7,35|6,36|7,36|7,37`, then the
  same I/J locks, final hash `f8aef200`;
- strict four-lock proof depths `{0,1,34,0}`, `{1,34,1184,440}`,
  `{2,744,13239,0}` in the frozen field order; totals 779 explored states, 14,457
  transitions, and 440 derived bound prunes.

The frozen hashes are authoring
`f3e6d4b728c52f57641315d188e09368c15b862d36cc268d378e3558e82a0aa1`, behavior
`28f617b83044422656734990b9284cdd6a5263bb2b1de4239e0e30db2d400542`, primary route
`a897b832ba90342d9fe8f7cd3c4bb35d6eaea14a81b28318319ab2322aff1d3f`, and alternative
route `001ae5539a0708110a8d7dfd8dcd91eab489e0059cd75fb9e7e32b378b069529`.
Source `cfbcab4` creates only the three contracted non-product paths. Normal direct tests pass
four with the exact case skipped; opt-in passes `5/5`. Typecheck, the complete
`437 passed / 12 skipped` suite, and the 767-module build pass. Independent source QA reports
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. F4A is accepted; the draft remains outside the live
50-level library. F4B must freeze a separate Intro-02 contract before any further source edit.

## F4B Intro-02 authoring admission

F4B appends only a non-published `t3r-shaft-02` draft to
`puzzleV3IntroDefinitions.ts`, plus `puzzle-v3-intro-02.json` and
`puzzleV3Intro02Exact.test.ts`. It also minimally repairs the accepted
`puzzleV3Intro01Exact.test.ts` so it pins index 0, its unique ID, bytes, and hash without
requiring the growing draft array to contain only one item. The module retains only type
imports and the one exported draft array; the four-path checkpoint remains at most 500
hand-authored changed lines.

The definition is a legal six-drop, zero-clear, anchor-free three-floor-row setup with 24
ordinary targets and exactly six empty cells. Exactly one column is empty in all three target
rows; all other columns contain at least one target, and every row has one through four gaps.
The gameplay seed is distinct from all 50 live definitions and every earlier v3 draft.

Its exact optimum is three or four locks. The test derives one literal `wellX` from the initial
visible three-row mask. All locks before the last have zero row releases and retain
`state.board[37][wellX]`, `state.board[38][wellX]`, and `state.board[39][wellX]` as `null`;
the well is an empty setup gap and is not an original target. The final lock is a vertical I
at that column with world-space cells `y=36,37,38,39`; it releases exactly three rows and
finishes. Each primary/alternative release sequence therefore contains only one positive
value, final `3`, with remaining target count 24 before it and zero after it. One stored
alternative diverges at lock 1 or 2, uses at most optimum plus two locks, and proves the same
no-early-clear/final-well-I sequence. Both routes are literal current-Core evidence; beam
output cannot prove optimum or absence.

Pairwise exact, normalized-topology, and near-topology flags are false against every live
definition and accepted Intro-01 draft. The accepted Intro-01 draft stays 622 bytes with
SHA-256 `DFC1DACDF8A8F0851C2F7BFCF41ED67C9088105D8583544E68A82A557223FDA8`; canonical live
Intro-02 stays 626 bytes with SHA-256
`E83542E1A19A248EA26261A7504913A6A6B155DA9EA089622DF1BC04BDEC55B4`.

The schema remains exactly certificate v8 with F4A field order and serializers,
`proof.kind='exhaustive-shorter-depths'`,
`proof.lowerBoundVersion='target-column-deficit-v1'`, one alternative,
`solutionMultiplicity='multiple'`, and `techniqueEvidenceId=null`. In this frozen schema,
`multiple` means two or more distinct completing public-command routes; it does not assert
multiple optimal routes. The primary route owns the strict optimum proof, while the stored
alternative remains bounded by optimum plus two. Fresh independent contract QA precedes all
discovery and source editing.

Two fresh independent reviews of repaired HEAD `0449924` report P0–P3/GAP all zero. They
verify visible rows 17–19 map to Core world rows 37–39, the final I supplies exactly the three
well gaps plus one cell above, the append-compatible Intro-01 maintenance is minimal, and all
route/proof/schema gates are executable. Candidate discovery is open; source editing and live
product integration remain closed.

### F4B selected candidate

Independent current-Core preimplementation QA reports
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` for:

- setup `3424573653`: `I0@0,L0@7,Z0@3,T0@0,J2@3,S0@7`;
- floor rows `.T.JJJ..SS`, `TTTZZJ.SSL`, `IIIIZZ.LLL`; gaps `[4,1,1]`; unique `wellX=6`;
- unique gameplay seed `560` and zero exact/topology/near flags across the live 50 plus
  accepted Intro-01;
- primary `SQLLLHTTTCCLHTTTCRRRHTTTCRHTTTTTTTTTTTT`, locks
  `Z:1,35|0,36|1,36|0,37`, `L:2,36|3,36|4,36|2,37`,
  `T:7,35|7,36|8,36|7,37`, `I:6,36|6,37|6,38|6,39`;
- alternative `SCRRRHTTTCCLHTTTCLLLLHTTTCRHTTTTTTTTTTTT`, first lock
  `Z:8,35|7,36|8,36|7,37`, same L/final I, third lock
  `T:0,35|0,36|1,36|0,37`, and first divergence 1;
- both route releases `[0,0,0,3]`, targets `[24,24,24,0]`, pre-final well cells null,
  initial `3aadbdab`, primary final `b060114c`, alternative final `e78bd4f0`;
- exact optimum 4 and depths `{0,1,17,0}`, `{1,17,589,206}`, `{2,383,13661,0}`;
  totals 401 explored, 14,267 transitions, 206 prunes.

Hashes are authoring `64cb91c06eb02480e2dad8ec19e9566392d175079843c21875b0f67435348907`,
behavior `f19aecb90dbba04a1cac3e38b6714806f5ca44709a8a558cd6935f501fae23cb`, primary route
`17a81baa80e064389305e7dd44d9ee0c48bcb3e9713e1378a6f38ba7fdcd042a`, and alternative
`648350cc55b43e319d1b555984abd716102549753900c144d01a0d48a116a1d2`. The four-path source
checkpoint may now open; product integration remains closed.

Source `c571f54` implements exactly the four contracted paths with 340 additions and two
deletions. The serialized Intro-02 draft definition is 621 bytes with SHA-256
`1E67D9E72F64769DDF4703FF9909A3C08EA4454638662B7E76DD1E001884A9EB`; its canonical
schema-8 certificate file is 1,421 bytes with SHA-256
`8EC555240FD12F07B7C873DC3F163356EA9B8113C58D1E944497889A2EE03B75`. Accepted Intro-01
and both pinned live definitions remain unchanged. Normal Intro/live regression passes
`19 passed / 2 skipped`, combined opt-in Intro exact passes `10/10`, typecheck passes, the
complete suite passes `441 passed / 13 skipped`, and the production build transforms 767
modules. Two independent source reviews report `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` after
separate byte/hash, topology, setup, route, well, and exact-certificate reconstruction.
F4B is accepted as an authoring-only draft. F4C opens only a docs-first contract for
`t3r-shaft-03`; no candidate discovery or source edit is authorized until its four-row
support-before-bridge lesson is made mechanically testable and independently accepted.

## F4C Intro-03 authoring admission

The stable ID remains `t3r-shaft-03`, but the v3 rebuild deliberately changes its authored
height from the live three-row baseline to the roster's four-row lesson. The historical
`t3r-` prefix and live `PUZZLE_TARGET_ROWS` entry do not override the new contract. The draft
uses `targetRows=4` through noncanonical validation only; product data remains byte-identical
until the complete campaign switches atomically.

Exactly eight legal, seeded, zero-clear setup drops preserve 32 ordinary cells in exactly the
four contiguous floor rows. Each row has `1..4` gaps, the gap total is eight, and no target,
anchor, or ordinary cell exists above the band. Hidden and anchor arrays are empty. The
gameplay seed is unique across live 50 plus earlier drafts, and every pairwise exact,
normalized-topology, and near-topology flag against those 52 definitions is false.

Both primary and alternative routes bind the following direct-Core teaching evidence:

1. lock 1 is the support and lock 2 is the bridge;
2. both locks release zero rows and retain all 32 original targets;
3. every support cell was empty in the initial setup board;
4. immediately before the bridge, shifting every bridge cell down one row remains in bounds;
5. every occupied destination in that shift is a support cell from lock 1, the blocker set is
   nonempty, and no setup, floor, or unrelated blocker contributes;
6. the bridge owns a same-y horizontal run of at least three consecutive cells;
7. define `interiorRunCells` as the horizontal source run without its endpoints; at least one
   source `{x,y}` in that set has shifted destination `{x,y+1}` in the blocker/support set;
8. some run source cell strictly to the left and another strictly to the right of that
   interior source each has an empty shifted destination `{x,y+1}`.

Thus the complete bridge would descend without the just-authored support and visibly spans
open space on both sides. The horizontal run is stored in source coordinates and blockers are
stored separately in shifted destination coordinates; they are never compared as identical
two-dimensional cells. Candidate admission freezes literal support/bridge signatures,
source-run coordinates, shifted blocker coordinates, and the pre-bridge board evidence for
each route. A name, screenshot, four-row count, or generic structural score is not evidence.

The primary strict optimum is four or five locks. For both primary and alternative, the first
two releases are `[0,0]`; at least two later positive release events sum to four, each lowers
the remaining original-target count, and the final state is finished at zero. Their exact
release arrays need not match. One stored alternative diverges at lock 1 or 2, proves the same
support/bridge geometry and complete release invariant, and is no longer than optimum plus
two. Schema-8 keeps one alternative, `solutionMultiplicity='multiple'`, `techniqueEvidenceId=null`,
`proof.kind='exhaustive-shorter-depths'`, and
`proof.lowerBoundVersion='target-column-deficit-v1'`. Beam output may discover but never
certify the candidate.

The source checkpoint is limited to three paths and 500 hand-authored changed lines:

- append `src/game/core/puzzleV3IntroDefinitions.ts` at draft index 2;
- create `docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-03.json`;
- create `src/game/core/puzzleV3Intro03Exact.test.ts`.

Existing Intro tests require no edit. The test pins live Intro-03 at 625 serialized bytes /
SHA-256 `0979CED2EEA842DC7722E8236229CBD4566CC6468D17E67007FD316D7740A7D2`,
Intro-01 at 622 / `DFC1DACDF8A8F0851C2F7BFCF41ED67C9088105D8583544E68A82A557223FDA8`,
and Intro-02 at 621 / `1E67D9E72F64769DDF4703FF9909A3C08EA4454638662B7E76DD1E001884A9EB`.
It also enforces canonical one-line UTF-8/LF schema-8 bytes, every hash and literal route,
full setup replay, pairwise admission, exact telemetry, product isolation, and deep freezing.
Fresh independent contract QA must be all zero before discovery or source creation.

Two independent final reviews of HEAD `3e9811a` report
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. The contract is accepted. Candidate discovery may run
only in repository-external temporary paths and may use heuristic search solely to find an
upper bound. Source creation remains closed until current Core independently replays the legal
eight-drop setup, both qualifying routes and pairwise admission, then exhaustively excludes
every shorter solution without beam, timeout, or state cap.

### F4C frozen candidate

Repository-external discovery admits one five-lock candidate for implementation. Setup seed
`37220` replays `I T S L J Z O L` as eight legal zero-clear drops. Its typed floor rows are
`...ZJOOSLL`, `L.ZZJOOSSL`, `L.ZJJTTTSL`, and `LLIIIIT...`, yielding gap vector
`[3,1,1,3]`. Gameplay seed `2900` is unused by the live 50 and Intro-01/02 and opens
`O I T S J`; all 52 prior exact/topology/near comparisons are false.

Primary route
`SHTTTHTTTCCLLLHTTTTTTTTTTTTQLLLHTTTTTTTTTTTTRRRRHTTTTTTTTTTTT`
uses support `O:4,34|5,34|4,35|5,35` and bridge `I:3,33|4,33|5,33|6,33`.
The sole alternative
`SLHTTTLHTTTLLDDDDDDDDDDDDCLDCHTTTTTTTTTTTTQLLLHTTTTTTTTTTTTRRRRHTTTTTTTTTTTT`
diverges at lock 1 with support `O:3,34|4,34|3,35|4,35` and bridge
`I:2,33|3,33|4,33|5,33`. Both then use the same `T`, `S`, and `J` signatures, release
`[0,0,2,1,1]`, retain `[32,32,16,7,0]` targets, and end at hashes `7e21cf71` and
`92a715fe`. The alternative's soft drops are ordinary exhaustive public controls and do not
violate the accepted contract.

Primary and alternative source runs are respectively `x3..6@y33` and `x2..5@y33`; shifted
blockers are respectively `(4,34),(5,34)` and `(3,34),(4,34)`, with both shifted span
endpoints open. Strict proof fixes initial hash `9ac8a069`, optimum 5, exhausted depths
`{0,1,9,0},{1,9,153,0},{2,153,5369,3034},{3,2335,41231,0}`, 2,498 explored
states, 46,762 transitions, and 3,034 bound prunes. Candidate mechanics passed read-only
preimplementation QA; this freeze still requires its own fresh independent docs review.

After that review is all zero, the source gate opens only for the previously bounded three
paths and 500-line limit. Implementation must reproduce these literals and canonical
schema-8 hashes; temporary discovery scripts are not production inputs.

Source `95f3316` fulfills that gate in exactly three paths and 336 added lines while leaving
the live 50 unchanged. The normal focused gate passes `23 / 3 skipped`; the opt-in Intro-03
exact gate passes `5/5` and reproduces optimum 5. Typecheck, the final full suite
(`445 / 14 skipped`), and the 767-module build pass. The first full-suite attempt hit an
unrelated renderer `beforeAll` timeout whose isolated `54/54` rerun passed; the clean final
full run is authoritative. Three independent source reviews report
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. Intro-03 is accepted outside product. F4D must begin
docs-first with stable ID `t3r-cascade-06`; no Intro-04 discovery or source edit opens before
its local-clear/only-opening contract passes independent review.

## F4D Intro-04 authoring admission

F4D preserves stable ID/name/difficulty `t3r-cascade-06` / `留口` / 4 but rebuilds the live
three-row product as a non-published four-row draft. The live definition remains 627 serialized
bytes with SHA-256
`7B10203C8C02B1C575761BFDE6F471E8CD298FE0E7B3FD3AC3E8E1E25D1CDAFE`, setup seed
`5200003`, gameplay seed `1717986918`, and floor rows
`IIIILLL... / OO.TLZZJJJ / OOTTT.ZZ.J`. Product data and imports remain byte-identical.

The draft uses exactly eight legal zero-clear seeded setup drops, 32 ordinary targets in world
rows 36–39, one through four gaps per row, eight total gaps, and no hidden or anchor cells.
Exactly one `openingX` is empty from world rows 20 through 39; every other column owns at least
one target in the four-row band. Its gameplay seed is unique across live 50 plus Intro-01/02/03,
and all 53 pairwise exact/topology/near comparisons are false.

For each unfinished route state, `deepestTargetY` is the maximum current original-target y and
`openingColumns` is the set of columns empty from world row 20 through that y. Both routes must
start with and preserve exactly `[openingX]` after every non-final lock. This definition is
recomputed after ordinary row-clear mapping; it does not confuse original target identity,
visible coordinates, or a screenshot cavity with a traversable opening.

The shared local-clear lock is lock 1 or 2 and clears world row 39. Earlier releases are zero.
Immediately before it, that row's only gaps are exactly two or three contiguous cells supplied
by the local lock and the span includes `openingX`. Merging the lock yields only full row 39.
The lock supplies exactly `(openingX,39)` in the corridor, releases one row without finishing,
and has at least one off-row survivor; current Core clear mapping must place every survivor
outside `openingX` and restore `[openingX]` as the sole corridor. All other intermediate locks
release zero and preserve the same opening.

The final lock is a vertical I at `openingX`, world y=36..39. It uses the opening, releases the
remaining three target rows, reaches zero targets, and finishes. Each route therefore owns
exactly two positive releases, `1` then `3`. Candidate evidence freezes the opening coordinate,
local index/row/signatures, every post-lock opening set, releases, remaining targets, local
pre/post state hashes, survivor mapping, and final hashes.

The strict primary optimum is four or five locks. One alternative diverges by lock 1 or 2,
uses at most optimum plus two locks, and proves the same complete invariant. Schema-8 keeps
the accepted field order, serializers, hash domains, one alternative,
`solutionMultiplicity='multiple'`, `proof.kind='exhaustive-shorter-depths'`,
`proof.lowerBoundVersion='target-column-deficit-v1'`, and `techniqueEvidenceId=null`.
Heuristic/beam output may discover only; the primary needs uncapped current-Core proof.

The source boundary is exactly three paths and at most 500 hand-authored changed lines: append
draft index 3 in `src/game/core/puzzleV3IntroDefinitions.ts`, create
`puzzle-v3-intro-04.json`, and create `puzzleV3Intro04Exact.test.ts`. Existing Intro tests do
not change. The direct test pins live Intro-04 at 627 /
`7B10203C8C02B1C575761BFDE6F471E8CD298FE0E7B3FD3AC3E8E1E25D1CDAFE` and accepted drafts
at Intro-01 622 / `DFC1DACDF8A8F0851C2F7BFCF41ED67C9088105D8583544E68A82A557223FDA8`,
Intro-02 621 / `1E67D9E72F64769DDF4703FF9909A3C08EA4454638662B7E76DD1E001884A9EB`, and
Intro-03 682 / `A825A82CE4B96DDA78E2FB7A2C696F354CAC49B6C63AF5FDAA7722665F53EC9E`.
Independent contract QA precedes all discovery and source creation.

Two final independent reviews of corrected HEAD `fcfc15e` report
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. The F4D contract is accepted. Only
repository-external heuristic candidate discovery is open; source creation still requires a
fully qualified candidate with legal setup, both complete route invariants, seed/fingerprint
admission, literal hashes, and uncapped current-Core exact proof.

## Frozen published roster

`preserve` means the playable definition and behavior hash must remain byte-equivalent;
category, ordinal, lesson copy, and a newly exhaustive certificate may change without
invalidating a real prior completion. `rebuild` retains only the stable ID and clears
both completion and best placement count during migration.

| New | Band | Stable ID | Old | Action | v3 role |
| ---: | --- | --- | ---: | --- | --- |
| 1 | Intro | `t3r-shaft-01` | 1 | rebuild | three-row, two-stage row completion; never a one-drop answer |
| 2 | Intro | `t3r-shaft-02` | 2 | rebuild | three-row well preservation |
| 3 | Intro | `t3r-shaft-03` | 3 | rebuild | four-row support before bridge |
| 4 | Intro | `t3r-cascade-06` | 4 | rebuild | four-row local clear that retains the only opening |
| 5 | Intro | `t3r-shaft-04` | 5 | rebuild | four-row current/Next-1/Next-2 planning |
| 6 | Easy | `t3r-cascade-05` | 6 | preserve | avoid sealing a target cavity; mastery key |
| 7 | Easy | `t5r-delta-07` | 7 | preserve | edge-to-centre reduction; mastery key |
| 8 | Easy | `t5r-lattice-09` | 8 | preserve | split two pieces across lanes; mastery key |
| 9 | Easy | `t5r-rift-10` | 9 | preserve | fixed-queue gate choice; mastery key |
| 10 | Easy | `t5r-drift-08` | 10 | preserve | anchor-height side-slip; mastery key |
| 11 | Easy | `t5r-pulse-14` | 11 | preserve | ordinary anchor platform application |
| 12 | Easy | `t5r-arc-13` | 12 | preserve | support application |
| 13 | Easy | `t5r-current-12` | 13 | preserve | retained-opening application |
| 14 | Easy | `t5r-prism-11` | 14 | preserve | avoid-hole application |
| 15 | Easy | `t5r-horizon-15` | 15 | preserve | preserve/switch wells; mastery key |
| 16 | Easy | `t6r-cairn-17` | 16 | preserve | ordinary anchor recovery |
| 17 | Easy | `t6r-terrace-18` | 17 | preserve | dependency clear order; mastery key |
| 18 | Easy | `t6r-keystone-20` | 18 | preserve | bridge support; mastery key |
| 19 | Easy | `t6r-bastion-19` | 19 | preserve | normal narrow-gate residual |
| 20 | Easy | `t6r-veil-16` | 20 | preserve | normal crossing residual |
| 21 | Easy | `tm-puzzle-21` | 21 | preserve | normal column/order residual |
| 22 | Easy | `tm-puzzle-22` | 22 | preserve | anchor corridor combination |
| 23 | Easy | `tm-puzzle-23` | 23 | preserve | centre-column branch |
| 24 | Easy | `tm-puzzle-24` | 24 | preserve | slope/support combination |
| 25 | Easy | `tm-puzzle-25` | 25 | preserve | ordinary paired-well residual |
| 26 | Easy | `tm-puzzle-26` | 26 | preserve | anchor offset application |
| 27 | Easy | `tm-puzzle-27` | 27 | preserve | anchor slope application |
| 28 | Easy | `tm-puzzle-28` | 28 | preserve | side bridge/opening application |
| 29 | Easy | `tm-puzzle-29` | 29 | preserve | ordinary two-layer recovery |
| 30 | Easy | `tm-puzzle-30` | 30 | preserve | fixed-queue broken-platform branch |
| 31 | Hard | `tm-puzzle-31` | 31 | preserve | multi-stage curved well |
| 32 | Hard | `tm-puzzle-32` | 32 | rebuild | two-anchor gate and height-dependent side-slip |
| 33 | Hard | `tm-puzzle-33` | 33 | preserve | offset bridge between two walls |
| 34 | Hard | `tm-puzzle-35` | 35 | preserve | staged suspended platform |
| 35 | Hard | `tm-puzzle-36` | 36 | preserve | accepted lower-triangle silhouette |
| 36 | Hard | `tm-puzzle-37` | 37 | preserve | paired corridors |
| 37 | Hard | `tm-puzzle-38` | 38 | preserve | accepted stepped pyramid silhouette |
| 38 | Hard | `tm-puzzle-39` | 39 | rebuild | sparse four-row position with several anchors |
| 39 | Hard | `tm-puzzle-41` | 41 | preserve | segmented horizontal dependency order |
| 40 | Hard | `tm-puzzle-44` | 44 | preserve | twin towers and centre crossing |
| 41 | Hard | `tm-puzzle-45` | 45 | preserve | diagonal corridor |
| 42 | Hard | `tm-puzzle-46` | 46 | rebuild | ten-row deep edge well with a short technique route |
| 43 | Hard | `tm-puzzle-47` | 47 | preserve | accepted two-wall suspended roof and hollow centre |
| 44 | Hard | `tm-puzzle-48` | 48 | preserve | separated-slot dependency order |
| 45 | Hard | `tm-puzzle-49` | 49 | preserve | multi-well switching |
| 46 | Hard | `tm-puzzle-50` | 50 | preserve | fixed-queue fork with one safe branch |

The retired stable IDs are exactly:

- `tm-puzzle-34` — redundant with the stronger curved/deep-well family;
- `tm-puzzle-40` — redundant with the retained offset/suspended/twin bridge family;
- `tm-puzzle-42` — redundant with the clearer triangle and pyramid contractions;
- `tm-puzzle-43` — redundant with the retained paired-corridor and fork choices.

This leaves **38 preserved definitions, 8 rebuilt definitions, and 4 retired IDs**.
In particular, T32's three explicitly accepted special silhouettes at old positions
36, 38, and 47 remain published and definition-preserved.

## Curriculum and unlock graph

Intro and Easy are all open at fresh progress, so the initial available count remains
30 but now means 5 + 25. Seventeen Easy levels remain normal or combination residuals.
The following eight Easy levels are the only visible mastery keys:

| Technique | Easy prerequisite | Hard stable IDs |
| --- | --- | --- |
| `preserve-well` | `t5r-horizon-15` | `tm-puzzle-31`, `tm-puzzle-45`, `tm-puzzle-46`, `tm-puzzle-49` |
| `anchor-side-slip` | `t5r-drift-08` | `tm-puzzle-32`, `tm-puzzle-39` |
| `build-support` | `t6r-keystone-20` | `tm-puzzle-33`, `tm-puzzle-35`, `tm-puzzle-44` |
| `edge-to-centre` | `t5r-delta-07` | `tm-puzzle-36`, `tm-puzzle-38` |
| `split-lanes` | `t5r-lattice-09` | `tm-puzzle-37` |
| `avoid-hole` | `t3r-cascade-05` | `tm-puzzle-47` |
| `clear-order` | `t6r-terrace-18` | `tm-puzzle-41`, `tm-puzzle-48` |
| `choose-gate` | `t5r-rift-10` | `tm-puzzle-50` |

Every Hard level has exactly one visible Easy prerequisite. One Easy may unlock several
Hard levels only through the same replay-derived technique signature. There is no
AND/OR prerequisite language in v3. The relation stores stable IDs and evidence IDs,
never a copied threshold. The threshold is always derived as:

`strict optimal locked tetrominoes + 5`

A preserved historical Hard completion keeps that one Hard replayable. It neither
unlocks siblings nor substitutes for the related Easy mastery result.

## Operation metric

One Puzzle operation is **one tetromino that reaches the real `piece-locked` event**.
The setup history is not player work. Left/right movement, clockwise or
counter-clockwise rotation, soft-drop steps, hard-drop input, automatic settlement
ticks, and clear delay do not add operations. Undo restores the earlier `pieceCount`,
so an undone placement is absent from the final successful count. Restart starts at
zero.

Core may retain its internal `pieceCount` name. New player copy and v6 persistence use
the explicit label `落子数 / Pieces placed`; unqualified `步 / Moves` is retired for
Puzzle records and mastery gates.

## Strict public-control proof domain

The strict domain contains every decision available to a Puzzle player: left, right,
clockwise rotation, counter-clockwise rotation, soft drop, and hard drop, followed by
the same deterministic settlement ticks as Core. Existing `C` routes remain valid;
route-token version 2 adds `Q` for counter-clockwise rotation. A direction-dependent
SRS kick near an anchor cannot be replaced by three clockwise turns in the proof.

Undo is excluded from optimum search because deleting an undone branch yields the same
future state with no greater final locked-piece count. Restart and navigation are not
part of one attempt. Fast beam search remains an authoring aid and its `null` result is
never evidence of impossibility or optimum.

Strict state deduplication must include the sorted `puzzleAnchorSupportedCells` mask in
addition to board occupancy (`.` / ordinary / anchor), target coordinates, active pose,
queue/randomizer state, counters, phase, and status. Ordinary colours remain irrelevant.

The existing target-column deficit lower bound remains enabled only when the board has
no anchor and the support mask is empty. Its first anchor-aware implementation returns
zero instead of pruning. Any faster anchor lower bound requires a separate mathematical
argument plus differential tests against the zero-bound search; timeout, beam width,
or state caps can never become an optimum certificate.

## Proof admission fixtures

These fixtures precede published data edits:

| Case | Definition | Current evidence | F2 requirement |
| --- | --- | --- | --- |
| ordinary | canonical `t5r-arc-13` | initial hash `1c4d5e6a`; current five-lock certificate | recertify after adding `Q`; no optimum/stat field is assumed stable |
| one anchor | canonical `t5r-drift-08` | initial hash `e9b71c20`; T32 primary route SHA-256 `7eda053968ee110316dd8c1d274cc9d2c74e1796a50ecd65c47df0f43736d63d` finishes in 6 locks and produces 4 supported cells | definition-aware exhaustive certificate with zero anchor bound |
| two anchors | test-only copy of `t5r-drift-08` plus `{x:4,y:16}` | initial hash `696f86a0`; the same 6-lock public route finishes with zero targets and produces 4 supported cells | prove the complete shorter-depth domain without publishing the fixture |

The hashes and completions above are admission probes, not optimum claims. After those
three pass, one unanchored ten-target-row prototype must also obtain a complete strict
certificate before `tm-puzzle-46` is reauthored.

## Certificate artifact schema 8

Each of the 46 published levels owns one source-controlled authoring artifact entry:

```ts
type PuzzleCertificateV8 = Readonly<{
  schemaVersion: 8;
  campaignRevision: 3;
  rulesetRevision: 'puzzle-v3';
  routeTokenVersion: 2;
  searchStateKeyVersion: 2;
  operationMetric: 'locked-tetromino';
  levelId: string;
  authoringDefinitionHash: string;
  behaviorHash: string;
  initialStateHash: string;
  optimalLockedPieces: number;
  optimalRoute: string;
  routeHash: string;
  lockSignatures: readonly string[];
  finalStateHash: string;
  solutionMultiplicity: 'multiple' | 'unique-proven';
  proof: Readonly<{
    kind: 'exhaustive-shorter-depths' | 'exhaustive-through-optimal-depth';
    lowerBoundVersion: 'target-column-deficit-v1' | 'none-anchor-v1';
    exhaustedDepths: readonly Readonly<{
      lockedPieces: number;
      frontierStates: number;
      transitions: number;
      boundPrunes: number;
    }>[];
    exploredStateCount: number;
    transitionCount: number;
  }>;
  alternatives: readonly Readonly<{
    route: string;
    routeHash: string;
    lockSignatures: readonly string[];
    firstDivergenceLock: number;
  }>[];
  techniqueEvidenceId: string | null;
}>;
```

`authoringDefinitionHash` covers stable ID, target rows, setup seed/placements, derived
board rows, anchors, gameplay seed, dimensions, and goal/rules revision.
`behaviorHash` excludes display name/category/ordinal but covers the initial board and
targets, anchors, gameplay seed and fixed queue, dimensions, operation metric, and rules
revision. Migration uses the explicit table plus the behavior hash, never
`initialStateHash` or the topology fingerprint alone.

Every level has a strict optimum route and either one meaningfully divergent successful
route or an exhaustive same-depth uniqueness disposition. `unique-proven` therefore
requires exhausting the optimal depth as well as every shorter depth; absence of a
beam-found alternative is not uniqueness. Gate Easy and Hard entries additionally bind
measurable preconditions, decisive replay event, continuation invariant, and Hard
hardening delta through `techniqueEvidenceId`. Full routes/frontiers stay in authoring/
test artifacts; the browser imports only compact optimum and unlock metadata.

## Frozen revision-2 behavior baselines

Migration may preserve a record only against the following 38 hashes generated from
the definitions at baseline `e675389500cdae8063da4d37f4cdda47a62ffe76`. It may not
derive the historic side of the comparison from already-edited v3 definitions.

`behaviorHash` is the lowercase SHA-256 of one UTF-8 JSON line followed by exactly one
LF. `JSON.stringify` receives an object with this exact insertion order:

```ts
{
  schema: 'puzzle-behavior-v1',
  dimensions: { width: 10, height: 40, visibleStartRow: 20 },
  goal: 'clear-original-targets',
  operationMetric: 'locked-tetromino',
  rulesetRevision: 'puzzle-core-v3-compatible-v1',
  queueModel: 'seven-bag-v1',
  gameplaySeed: definition.seed,
  initialBoardRows,
  targetCells,
  anchorCells,
}
```

`initialBoardRows` contains the twenty visible rows and normalizes every ordinary cell
to `#` and every empty cell to `.`; renderer colour/type letters are deliberately not
behavior. `targetCells` is every normalized `#` coordinate in numeric row-major order.
Targets and anchors both use the definition's visible-board `y = 0..19` coordinates;
`anchorCells` contains `{x,y}` objects sorted by numeric `y`, then `x`. Coordinate
objects keep key order `x,y`. The queue model plus gameplay seed identify the complete
deterministic seven-bag stream. The ruleset string covers the preserved 10 × 40 well,
20-row visible boundary, SRS in both directions, Puzzle gravity/lock/clear semantics,
anchor behavior, original-target goal, and locked-tetromino metric; changing any of
those semantics requires a new ruleset string and therefore cannot preserve a v2 best.

| Stable ID | Frozen rev2 `behaviorHash` |
| --- | --- |
| `t3r-cascade-05` | `af68657b7c59ccbdae05d4ddf2105eb6cbba12df513eccabe760f111d06545ce` |
| `t5r-delta-07` | `e66c395dd168cd4728c9f39e976249dc7d3cf3ebcb0cc5a87ad58806ed6ff317` |
| `t5r-lattice-09` | `455013fb5522deddde42f28642d1779f5e63b3734684515a71dc483dada54741` |
| `t5r-rift-10` | `f9b024af530db83c1a904811c551c4fa5f160af9e66f41ccdab278940ff62d7e` |
| `t5r-drift-08` | `2432362ed6ba2fbb41cdf1a9448a9ad75e94828ca32dd47496f3eb0955c98860` |
| `t5r-pulse-14` | `fc634a927472983523b29127cbd705d6e6f21de6800a701b12182bae62523d46` |
| `t5r-arc-13` | `d12a9d18fe65ec415d3985f7d1be5eb8015391946270e4a86609dbcc8b834325` |
| `t5r-current-12` | `c372902e3c157fb66dfa1b8257a04cbc5637600835c7a7912c67d7e43b1d3aaf` |
| `t5r-prism-11` | `2dc01118c633fc74921c926324c50a00d4407b52fb77d21d2bb14b7eacf91058` |
| `t5r-horizon-15` | `f07ec0766eb0a0f7e5dd57930f4bf39b822837e45683dcca54bc16e048af03c9` |
| `t6r-cairn-17` | `975dbe9259b46abc93ed67bdbfffb6aa193c5eedc108cdb3ea4c10dafbd3ced7` |
| `t6r-terrace-18` | `290dfff1dde551e775350369d0d5e91816a219bcc7155771ea5670b7a4891db1` |
| `t6r-keystone-20` | `a33220646ea5338d670bd5e89595cdd92fc1d3324013e4d3bff93e68110744d7` |
| `t6r-bastion-19` | `d53551d30144c17d8842f884206b5827479fab5de009d5348fa8c6c66de4e4a7` |
| `t6r-veil-16` | `a0fe1287f60d2d771f9fb2bdf72bdb414e90445092bbb262c59a57a1b645be16` |
| `tm-puzzle-21` | `0d1f10ee52296959cb7fb06d4d8fdd386cb461c3502ddda7b7ce2e693dff7618` |
| `tm-puzzle-22` | `91a87bbb5692688cd5fdb13164c302f70b6e702c8ffc0a38f10eb8db771e52f6` |
| `tm-puzzle-23` | `d29a988d9345453b8b0318a6aa2ec7396e5b71ac19a655e270059feac606b120` |
| `tm-puzzle-24` | `1821bdbcbd5bd6c07b589b8f5b135de1d36f5ac73170636e4e5108e1539841dd` |
| `tm-puzzle-25` | `11b440821e1a0773ec596e0bd7969de78068d3b1bf9d8799ea77303db74d4b88` |
| `tm-puzzle-26` | `3372ad01a33cee1bda532fb8cf7ce078d70ea9711c800e24f44e5a40a4baaeb8` |
| `tm-puzzle-27` | `fe58e766c093485aead8e416ea12814952ae87094e2eab78b323190c1d36f215` |
| `tm-puzzle-28` | `42ccfc20227beeaed63f1cdeb496df3699ca522a8a96130f6e985f124a828d50` |
| `tm-puzzle-29` | `845157781f5e3a9b70336f5f2fedc6e87cdd1441f85f9931186a86ab23bd2a2e` |
| `tm-puzzle-30` | `0b1efdf42fdac2773d9c1e5ff5f084c2939908798b9d4d5b8831e662c6f779a3` |
| `tm-puzzle-31` | `ce42be553636caae6d6275b4a9ccc61aff15c77af73a011d322b4081e92aad3b` |
| `tm-puzzle-33` | `cc6d97d7b88f6a98055af19fe8f0f0fd314a38349199a756d7555eb2b3acc177` |
| `tm-puzzle-35` | `39bc5f4108f4e79ad44a001a09d405a4a6b96a516532b09b93ec6438dd4da719` |
| `tm-puzzle-36` | `f35af4e3a1006214c6c5488dff4d4ec3171e774d6f156a71d6235c6f998759af` |
| `tm-puzzle-37` | `58b4dd7c157599c09d25901ee11e89bf56408c452cb17610194307a12d02bdb1` |
| `tm-puzzle-38` | `729a4afbd81ee80a6441a7158d6d0c09f7b3d0f82d0fdfcd26b57a85ef7240a1` |
| `tm-puzzle-41` | `2f3d8bc50dfe3d7926e744b9c6960ba102ce687887a512e2f411e1d9e89707b3` |
| `tm-puzzle-44` | `11c42f1a90a934f9bfb8e2d1ebc67428f695fd278ff1e1058044bb5e3855414e` |
| `tm-puzzle-45` | `c643bd7fb5ca0807013646aa198122c4590fa782e01cda326f24a0c413a15f08` |
| `tm-puzzle-47` | `88f537b58817cc45dd310f40914866e21edaf7c3aa060cdc05593c016fc5b2e7` |
| `tm-puzzle-48` | `b55fda5016508df85927e72a408d9f9428bacd4d3855dda69d99f14a68ebb0ff` |
| `tm-puzzle-49` | `338d4964f402cb83e54fd38851e1530e8f7a8d477307548102f5838ed7e8dc9d` |
| `tm-puzzle-50` | `06ef5a600ed8d2af9dc587e61d54c2a8e1265c6380d9e231369ffbbbc16db5c0` |

The later v6 source checkpoint must reproduce this table from a literal rev2 roster
before it is allowed to project progress. A test must also mutate every hashed field and
show that the hash changes; display name, category, ordinal, and ordinary colour/type
letters must not change it.

## Definition capability boundary

The v3 validator may eventually admit:

- 3–10 contiguous bottom target rows;
- 5–20 legal, zero-clear setup placements;
- 0–4 immutable anchors in the visible bottom twelve rows;
- no anchor on an original target, in the hidden buffer, or in an initially full row;
- at least one replay-verified landing/support effect for every authored anchor.

The F2 proof fixtures use the current headroom rule first. Wider anchor placement and
ten-row validation are a later Core-definition checkpoint with direct board, clear,
support, target-mapping, preview, and proof tests. No renderer-painted obstacle or hand-
injected ordinary board is admitted.

### Stage F3 bounded checkpoints

- **F3A — structural validator:** expand `replayPuzzleSetup` and
  `validatePuzzleDefinition(..., false)` to 3–10 contiguous bottom rows, 5–20 legal
  zero-clear drops, and 0–4 unique anchors in visible rows 8–19. Anchors remain outside
  the hidden buffer and may occupy only a setup-derived `.` cell. Ordinary cells plus
  anchors may not complete an initial row in canonical or authoring-override mode.
  Canonical validation keeps every current published definition exact; a dedicated
  literal-baseline test reruns the F1 serializer against all 38 frozen behavior hashes.
- **F3B — injected-definition mechanics:** one test-only four-anchor definition proves
  initial board/target ownership and clear/support/target mapping. Every anchor owns an
  independent successful public-route witness compared with a copy removing only that
  anchor; the witness proves a changed real lock signature or direct support cells.
  Static validation does not substitute for that evidence. Preview coverage asserts
  the injected state's bottom-twelve-row projection and reruns existing two-piece queue
  tests; UI source stays closed.
- **F3C — ten-row admission:** exact paths are
  `docs/workstreams/tetris-t37-puzzle/puzzle-v3-ten-row-prototype.json` and
  `src/game/core/puzzleV3PrototypeExact.test.ts`. The first is a source-controlled
  authoring/test fixture, not browser evidence; the second imports it and proves one
  legal, unanchored, non-published ten-row definition and public route with exact
  initial/final hashes, lock signatures, and full shorter-depth statistics. The pair is
  one source/test checkpoint. An optional reusable discovery tool is restricted to
  `tools/search-puzzle-v3-prototype.mjs` in a separate earlier tooling checkpoint. The
  opt-in proof uses no beam, timeout, or state cap and must pass before
  `tm-puzzle-46` changes.

The F3A source boundary is `src/game/core/puzzles.ts`, its direct test, and
`src/game/core/puzzleV3BehaviorBaseline.test.ts`. Any additional Core source path
requires a failing direct mechanics test first. Historical T15/T32 route JSON and
scripts remain untouched. After F3A/F3B/F3C are green, run final typecheck, complete
suite, build, and independent read-only QA. Since no published/rendered state changes,
F3 has no browser-evidence requirement.

Independent read-only review accepts the frozen contract range `628f66d..dc035a3`
with `P0 0 / P1 0 / P2 0 / P3 0`. It closes the initial full-row, literal-baseline,
and F3C path/split findings and confirms that the four-path range excludes inherited
T27 evidence, `t27-r1-followup`, and `progress.md`. This disposition opens F3A only;
it does not accept any F3 product source or published level.

F3A source checkpoint `a1e37f1` implements the frozen structural bounds in exactly the
three declared Core/test paths. The literal serializer matches all 38 revision-2
behavior hashes, and focused tests pass `16/16` with typecheck green. Independent
read-only QA repeats those gates, verifies the unchanged canonical library and range,
and accepts `da264f4..b30ee1f` with P0–P3 all zero. F3A is accepted; F3B may open only
the injected-definition mechanics tests, while F3C and curriculum content remain
closed.

F3B source checkpoint `308233c` changes only the three frozen test paths. Its injected
four-anchor definition owns the exact 12-row projection and 24 setup-derived targets;
board and engine tests map target/support ownership through two real clears. Four
distinct public-command completion routes each compare with a copy removing only the
tested anchor: the complete definition's first I lock occupies absolute rows `24..27`
and records those four support identities, while the remove-only replay lands at
`33..36` with no support identity. Typecheck and the final four-file focused suite
(`36/36`, including the unchanged two-piece presentation test) pass. Independent
read-only QA accepts `3aa6766..6c3286c` with P0–P3 all zero, reproduces those gates,
validates all four remove-only witnesses, confirms the presentation blobs are unchanged,
and verifies the six-path range excludes every protected path. F3B is accepted; F3C may
open only the frozen non-published ten-row fixture/test pair. Published content,
migration, progression, and UI remain closed.

Initial F3C discovery proves the F3A maximum setup is not a prototype candidate: its
column deficits split across two regions requiring six and fourteen cells, which no
five connected tetrominoes can supply. The sole single-placement variant admitting a
five-piece column profile has no solution across all 120 public-landing orders of its
`I/J/L/O/T` set. F3C therefore activates its previously frozen optional tooling path,
`tools/search-puzzle-v3-prototype.mjs`, as a separate earlier checkpoint. The tool may
search only a fixed reversibly constructed ten-row mask with explicit seed/node/RSS
bounds and an explicit output path. Its result remains a candidate until the two-path
fixture/test checkpoint independently replays setup and route and obtains the complete
strict certificate.

Tool candidate `8e86207` is the exact one-path implementation from base `5bd76e2`.
`node --check` passes, its uint32 wrap guard rejects before output, and two identical
`--seed-start 11 --seed-count 3 --node-budget 1500 --max-rss-mib 512` smokes produce
byte-identical JSON with SHA-256
`1869CAD02860106A349064BD3D0B7265E8F40FED7C1303B39DBDFB6082B2097A`. Both smokes
stop at the intentional node budget (`1,501` attempted landings), so they validate
determinism and containment rather than discover a candidate. Independent QA must
accept this checkpoint before the one bounded substantive candidate batch begins.
Independent read-only QA accepts `5bd76e2..85b48c2` with P0–P3 all zero after
reproducing syntax, double-smoke/hash, wrap rejection, mask/route, Core-equivalence,
temporary cleanup, and exact-path gates. The accepted tool may now run exactly one
serial batch over seeds `1..20000` with 10,000,000 attempted landings and a 900 MiB RSS
guard. `budget-exhausted` does not prove the entire seed range negative.

The authorized batch returns exactly that budget status after 10,000,001 attempted
landings, 289,828 accepted placements, 289,654 failed states, and 267,472 trie nodes.
It processes 20,000 seeds but produces no candidate and cannot claim that range is
exhausted. Its Temp JSON hash is
`1144E031CCA91E843F903E002FD79D37BA9507CBCC7856AE1A4DAEF7CF38223D`; the file and
owned process are removed. Before another search, the contract must freeze a
deterministic same-range fair-shard or resumable traversal and its coverage evidence.

The revision contract retains the independently accepted forward search and opens only
its existing tool path. The frozen `1..20000` domain is divided with
`start=floor(seedCount*shardIndex/shardCount)` and
`end=floor(seedCount*(shardIndex+1)/shardCount)` offsets. New required
`--shard-count`, `--shard-index`, and `--cursor` arguments therefore produce complete,
non-overlapping seed coverage. Shard count must be `1..seedCount`, shard index must be
`0..shardCount-1`, cursor is nonnegative, and cursor plus budget cannot exceed the
existing 1,000,000,000-probe limit. `--node-budget` counts only new landing probes after
the cursor; deterministic replay reconstructs prior failed-state memo. Budget/RSS
stopping uses a dedicated sentinel and may not memoize an incomplete caller.

Schema 2 output sets traversal version `seed-shard-replay-v1`, queue-generator version
`xorshift32-fisher-yates-seven-bag-v1`, and setup-rule version
`visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1`.
`queueSequenceDigest` is uppercase SHA-256 of the UTF-8 concatenation, in ascending seed
order, of exact lines `<decimal-uint32-seed>:<20-uppercase-piece-letters>\n`. Any change
to xorshift32, zero-seed fallback, Fisher–Yates, bag reset, type order, or draw order
must bump the queue version and changes this materialized digest.

The domain payload uses this exact insertion order: `traversalVersion`,
`queueGeneratorVersion`, `setupRulesVersion`, `queueSequenceDigest`, `boardGeometry`,
`targetMaskRows`, `pieceTypes`, `pieceShapes`, `seedStart`, `seedCount`,
`sequenceLength`, `shardCount`, `traversalOrder`. `boardGeometry` is the ordered object
`{width,height,visibleStart,targetTop}`. `pieceShapes` is the nested array
`pieceTypes.map(type => [type, SHAPES[type].map(shape => shape.map(([x,y]) => [x,y]))])`,
preserving rotations 0–3 and source cell order. `traversalOrder` is exactly
`type-index/rotation-0..3/x-ascending/landing-cell-dedupe-v1`. `domainHash` is uppercase
SHA-256 of the UTF-8 bytes of `JSON.stringify(domainPayload) + "\n"`, with no other
whitespace.

The output also includes original domain, selected absolute shard seed bounds,
start/next cursor, replayed and new probe counts, `complete`, `probeHash`, and `memoHash`.
Before every landing attempt, `probeHash` receives the UTF-8 line
`<nodeIndex>|<boardKey>|<typeRowsKey>|<type>|<rotation>|<x>\n`; it therefore covers the
complete pre-probe semantic state and fixed traversal choice. At output, `memoHash` is
uppercase SHA-256 of every fully exhausted `failed` key in ordinal JS sort order, each
followed by `\n` (empty set hashes empty bytes). Probe limits are checked before
execution, eliminating the old `+1` guard count.

Cursor replay and new work occur inside one uninterrupted DFS: reaching cursor changes
only accounting phase; it does not STOP/unwind, import memo, or restart from root.
Cursor replay that encounters a prior candidate or naturally exhausts before the cursor
fails closed. If RSS stops before cursor, `nextCursor` remains the input cursor. The
acceptance pair runs one-shot `cursor=0,budget=A+B` and resumed `cursor=A,budget=B`;
at the same absolute next cursor they must match `domainHash`, ordered `probeHash`,
sorted `memoHash`, status/setup, and next cursor. Each invocation is also repeated
separately for byte identity; first and resumed outputs are not compared byte-for-byte
because their coverage fields intentionally differ.

After contract and tool QA, the first fair round runs shard indices `0..31` in
order, each selecting 625 seeds with cursor 0 and 312,500 new probes; all 32 together
own exactly 10,000,000 new probes under the unchanged 900 MiB RSS guard. No shard may
receive a second increment until every incomplete shard has received the first. The
existing type/rotation/x order and minimum seed at a matching trie leaf remain fixed;
ascending shard order stops deterministically at the first candidate.

Independent contract QA rejects first candidate `a1bcf15` with
`P0 0 / P1 1 / P2 1 / P3 0`: domain identity omitted the queue generator, and cursor
evidence did not prove memo/probe equivalence. The repaired hash and one-shot/resumed
equivalence gates above must pass a fresh read-only disposition before the tool path
reopens.

Independent repair QA accepts `a1bcf15..1ccc04a` with
`P0 0 / P1 0 / P2 0 / P3 0`. It verifies that the queue-bound domain identity closes
P1, the probe/memo one-shot-versus-resume gate closes P2, the four-path range stays
within budget, and product/protected paths remain excluded. Only
`tools/search-puzzle-v3-prototype.mjs` may now implement schema 2; no fair-round search
or final fixture/test path opens until that tool candidate passes all runtime gates and
independent QA.

Tool candidate `1a9c9da` is the exact one-path implementation from base `8ff907a`; the
file is 479 lines and its checkpoint changes 144 insertions / 21 deletions. `node
--check` and diff checks pass. A seed `1..8`, four-shard smoke proves adjacent absolute
ranges `[1,3)`, `[3,5)`, `[5,7)`, `[7,9)`, total seed count eight, one shared domain
hash, and one exact new probe per shard.

For seed domain `11..13`, one-shot `cursor=0,budget=1500` and resumed
`cursor=750,budget=750` both end at cursor 1,500 with 52 accepted placements and 40
completed failed states. Both have domain hash
`AA59890E709C8870AA75213FA793688BF46AA727B7559486A494205C803985FD`, queue digest
`72B12EA371CB53F9D8390AE9AA4B6E419278DDE0355AE3B4F972BA567AFC3A07`, probe hash
`7553AD77B6DE58BDB044625F0CD266854522B2F7F9BECE428641FE338C808273`, and memo hash
`A75C9B7A6D58707822FCB644D79DE78D2D233CD9F4E3C1202607FCD8427BD4BA`.
Repeated one-shot files share SHA-256
`B334010D7CEC7E38A35EDB429FE9DA3333D5A312893B78EFB4E8659455419A2A`; repeated
resumed files share `B5BCCC97D05CF107F988907E9E45E525D97D145CE684F140455317896A8AB454`.

Missing shard inputs, uint32 wrap, invalid shard index, and cursor-plus-budget overflow
all fail before output. At 128 MiB, trie construction stops after 16,384 selected seeds
with zero probes; cursor 0 stays 0 and cursor 750 stays 750. All 12 generated Temp files
are removed and owned-process count is zero. These are candidate claims only; independent
QA must reproduce the one-path range and runtime gates before the fair round opens.

Independent read-only QA accepts `8ff907a..4ad42ba` with
`P0 0 / P1 0 / P2 0 / P3 0`. It rechecks the exact five-path range and 479-line budget,
confirms the accepted forward/Core semantics are unchanged, independently recomputes
the queue/domain digests, and reproduces the shard union, exact probe counts,
one-shot/resumed probe+memo identity, byte repeats, invalid-input closure, and RSS
cursor preservation. Live 128 MiB pressure stopped its trie after 14,336 seeds rather
than the coordinator's 16,384; both are containment observations rather than canonical
counts and both stop with zero probes. Its Temp files and owned process are zero. The
accepted tool may now run only the frozen serial first fair round; its output cannot
open the final F3C fixture/test without Core replay and proof.

The first fair round runs all shard indices `0..31` in order. Every absolute range is
adjacent, each owns 625 seeds, and their union is exactly seeds `1..20000`. All 32 return
`budget-exhausted` with cursor/new probes exactly `312500/312500`; candidate, complete,
and memory counts are zero. Shared domain and queue digests are
`9F88718E9DC7793483578E7A82E5C30890CC7F9E61673644AE771777A4639B7E` and
`1F6278E6C699C1D81D6EE289BD42C1A820D0B984FFD1C973E50271E94160A27C`.
Aggregate new probes, accepted placements, failed states, and trie nodes are
`10,000,000 / 291,609 / 290,910 / 337,031`. The ordered filename-and-file-hash manifest
hash is `DC0C992BBF7D72605D849209036AA1F12E3A011D093CE1F8776B6782D7243CA9`.
All 32 Temp files are removed and owned process count is zero.

The first round proves equal scheduling only; it does not exclude any incomplete shard.
The second equal round preserves the same domain and ascending shard order, replays
cursor 312,500, and adds another 312,500 probes to every shard. All 32 again return
`budget-exhausted`, now at cursor 625,000, with zero candidate, complete, or memory
statuses. Domain and queue digests remain
`9F88718E9DC7793483578E7A82E5C30890CC7F9E61673644AE771777A4639B7E` and
`1F6278E6C699C1D81D6EE289BD42C1A820D0B984FFD1C973E50271E94160A27C`.
The invocation records 10,000,000 replay probes, 10,000,000 new probes, and 20,000,000
physical attempts; cumulative new coverage across the two rounds is 20,000,000.
Replay-inclusive accepted placements, failed states, and trie nodes are
`582,850 / 581,851 / 337,031`. Its ordered filename-and-file-hash manifest is
`14197EB55C858699317467C48AAF6B1470DE07166FCC6E34E5FEFCE93BA059CC`.
All 32 exact Temp files are removed and owned process count is zero.

The third equal round preserves the same domain and ascending order. Every shard starts
at cursor 625,000, adds 312,500 new probes, and returns `budget-exhausted` at cursor
937,500. Candidate, complete, and memory counts are zero; the domain/queue digests stay
unchanged. The invocation records 20,000,000 replay probes, 10,000,000 new probes, and
30,000,000 physical attempts. Cumulative new coverage across all three rounds is
30,000,000. Replay-inclusive accepted placements, failed states, and trie nodes are
`873,726 / 872,398 / 337,031`. SHA-256 over the sorted `filename:SHA256` lines joined
with LF and no terminal LF is
`D7CBB36B03EC4DA715208F8F94F35466FD3A5114D2C4E29CBF9F2B354BFC7DC3`.
All 32 exact Temp files are removed and owned process count is zero.

The fourth equal round preserves the same domain and ascending order. Every shard starts
at cursor 937,500, adds 312,500 new probes, and returns `budget-exhausted` at cursor
1,250,000. Candidate, complete, and memory counts are zero. It records 30,000,000
replay probes, 10,000,000 new probes, and 40,000,000 physical attempts. Cumulative new
coverage across all four rounds is 40,000,000. Replay-inclusive accepted placements,
failed states, and trie nodes are `1,164,487 / 1,162,739 / 337,031`. SHA-256 over the
sorted `filename:SHA256` lines joined with LF and no terminal LF is
`14D1B742D64C36CC6EC247A92B7467149217C67E5AFD7137DAABE697CF21D616`.
All 32 exact Temp files are removed and owned process count is zero.

The fifth equal round preserves the same domain and ascending order. Every shard starts
at cursor 1,250,000, adds 312,500 new probes, and returns `budget-exhausted` at cursor
1,562,500. Candidate, complete, and memory counts are zero. It records 40,000,000
replay probes, 10,000,000 new probes, and 50,000,000 physical attempts. Cumulative new
coverage across all five rounds is 50,000,000. Replay-inclusive accepted placements,
failed states, and trie nodes are `1,455,294 / 1,453,114 / 337,031`. SHA-256 over the
sorted `filename:SHA256` lines joined with LF and no terminal LF is
`A5A6A955372A1A914C87B01A8C3DDC581C5B54B41D8841AA275949FAA6C71EEC`.
All 32 exact Temp files are removed and owned process count is zero.

This remains a fair prefix, not a negative proof. The fifth invocation spends four
replay probes for each new probe, and a sixth would spend five. Before any sixth round,
one independent read-only design review must evaluate reverse hard-drop peeling against
the reversed trie of the unchanged seeds `1..20000`. It must freeze equivalence,
deterministic traversal, bounds, memory accounting, output identity, and Core replay
requirements before the accepted tool may reopen. No new seed or product path opens.

### Seeded-reverse implementation contract

Independent read-only review accepts freezing this concept with
`P0 0 / P1 0 / P2 0 / P3 0`. Gaps remain explicit: the 200,000-node unseeded probe is
not performance, completeness, solvability, or candidate evidence; seeded reverse has
not been implemented or differentially verified; and lossless resume remains unproven.
The review opens this docs contract only.
Exact-range QA then rejects candidate `155b82a` with
`P0 0 / P1 1 / P2 1 / P3 0 / GAP 0`: probe/Merkle/cursor bytes and the probe/STOP
priority machine were ambiguous. Range, equivalence, forbidden masks, memo tuple,
geometric dedupe, two-file boundary, tests, and protected exclusions pass. The
first repair freezes those bytes and the state machine. Repair QA rejects `9737663`
with `P0 0 / P1 3 / P2 0 / P3 1 / GAP 0`: priority, vectors, equivalence, state,
scope, and exclusions pass, but domain/shard bytes, nested JSON/null states, and one
F3A-only summary remain ambiguous or stale. The following complete protocol, schema,
and status matrix are the authoritative second repair.
Independent closure QA accepts `89ae4ad..09e90c5` with
`P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`; implementation may now open only on the two paths
named below. This is not tool, search-result, fixture, or content acceptance.
Implementation candidate `1f85a0a..da2c67d` now occupies only those two paths and passes
its post-last-edit standalone contract test, typecheck, full suite, build, exact forward
byte regression, scope, and cleanup checks. Independent implementation QA remains
mandatory before the first accepted reverse search round can open.
Formal QA rejects the candidate with `P1 2`; adversarial QA rejects it with
`P1 1 / P2 2`. Restore must bind each partial probe token to the exact reconstructed
candidate index/descriptor and enforce the 1,000,000,000 cumulative probe ceiling before
the first new probe. Existing resume/output paths must be compared by file identity so
hard links cannot overwrite the checkpoint. The standalone suite must replace its
tautological mask equality with an independent forward oracle run against actual reverse
traversal, including both same-type peel orders. Only the two implementation paths may
reopen for this repair; no reverse shard or product path is authorized before repair QA.
Repair candidate `77bc7fc` stays within those paths and adds direct recomputed-token,
descriptor, real hard-link, exact-ceiling, and no-output overflow regressions. Its new
forward oracle independently drops `I`/`O` cells and compares the complete bounded result
set with actual reverse traversal across separated and touching same-type orders plus a
mixed queue. Post-last-edit standalone, typecheck, complete test rerun, build, legacy
bytes, scope, and cleanup pass. Independent repair QA remains mandatory before any shard.
Independent repair QA rejects `77bc7fc` with `P2 1 / GAP 5`. The test's restricted
catalog runs each stop at the first candidate, so manually exchanging oracle-selected
descriptor order is not a complete reverse enumeration. The test-only repair must use
the canonical catalog, continue one state after every candidate through
`complete-not-found`, and compare every history against an independent forward oracle,
including same-type, mixed, support, upper-obstruction, and spawn-domain cases. Fresh QA
must also run the five deferred tamper/ceiling/file/byte/process checks before any shard.
Test checkpoint `1686963` now uses the canonical catalog and one state per target,
continues after every candidate to natural completion, and compares exact reverse sets
with an independent physical-drop oracle across same-type, mixed-order, support, and
floating-upper scenarios. Floor/upper blockers agree with production landing, while the
spawn blocker is explicitly outside the ten-row reverse domain. All local gates and the
five deferred regression classes pass; fresh independent QA remains required.
Formal QA reproduces the candidate with P0–P3/GAP all zero. Adversarial QA rejects it
with `P2 1 / GAP 1` because all complete-set fixtures remain I/O-only: filtering the
helper catalog to those two types would evade the exact-set matrix. The test-only repair
must independently prove catalog completeness and add at least one non-I/O complete-set
fixture. No production reverse shard may run before fresh QA closes that mutation hole.
The first three-T fixture then reveals a deeper defect: its independent forward set has
six orders, but one canonical reverse state returns three and completes. A successful
subtree is still memoized as failed when its frame later exhausts, causing the missing
orders. Reopen only the authoring tool and standalone reverse test. Preserve the frozen
cursor/output schema, probe and legacy byte vectors, candidate null continuation, and all
pre-first-candidate behavior; fresh QA still controls production-search admission.
Candidate `77fe380` adds an internal candidate marker that leaves the production path
through its first result unchanged, then disables only false failed-memo writes during
bounded in-memory enumeration. Candidate-bearing states cannot create a cursor or later
formal output, and resumable tokens reject outcome 5. An independent seven-type catalog
oracle pins the three-T target to three descriptors and all six history orders. Final
standalone/typecheck/full-suite/build gates pass; production search remains QA-closed.
Formal and adversarial QA both accept with P0–P3/GAP all zero. Independent attacks cover
six three-T and 120 five-I histories, three catalog-filter mutations, candidate cursor/
output mismatch, outcome-5 resumability, earlier envelope/ceiling/NTFS vectors, bytes,
scope, and cleanup. Only the first 32-shard fair reverse round now opens under the frozen
1,000,000-probe, 900 MiB, serial, one-increment-each boundary; later rounds and all product
work remain closed.
The first round then completes all 32 first increments: each 625-seed shard stops at
`paused-budget` after exactly 1,000,000 new probes, with no candidate, memory guard, or
completion. Totals are 32,000,000 probes, 342,213 failed states, 338,728 trie nodes, and
81,077,752 bytes; ordered manifest is `2FEE9131...873F25`. Independent output QA reports
P0–P3/GAP all zero. Its 32 files are also the only continuation inputs, so the prior
cleanup-first order is invalid: keep the exact external Temp directory intact until a
distinct successor set passes review. A bounded performance slice may cache the same
ordered `frameCandidates()` result by seven-type availability mask, but it must prove
old-cursor compatibility and byte-identical probe/hash behavior under fresh QA before
any second increment. Product work remains closed.
Candidate `8317373` meets byte equivalence and performance intent, but fresh QA rejects
its regression closure with `P3 1 / GAP 2`. The cache must reset when catalog identity is
replaced; tests must derive an independent oracle from raw trie children for all 128 masks
and count actual filters for same-mask reuse and context isolation. No search opens on the
rejected candidate.
Repair `0b744b6` closes the stale-catalog and both regression gaps. Final gates pass;
100,000 real resumed probes remain byte-identical and improve from 8.313 s to 1.296 s.
Fresh QA reports P0–P3/GAP all zero. The second equal increment may now run serially from
the accepted round-one inputs into distinct round-two outputs; both sets remain until the
successors receive independent output QA.
Round two then advances every shard from 1,000,000 to 2,000,000 probes. All 32 remain
resumable `paused-budget`; cumulative coverage is 64,000,000 probes and no terminal result
occurs. Independent output QA reconstructs every formal restore/hash and accepts with
P0–P3/GAP all zero. The accepted round-two set supersedes round one, but no third increment
opens until a bounded structural/scaling review chooses continuation or redesign.
The review chooses redesign and permanently stops reverse v1 at that cursor. Every root
remains at descriptor 36–49/662 in the initial I-type band; second-round root progress is
348 descriptors, memo growth is near-linear, and three depth-19 residual masks are not
tetrominoes. A third round, wider seeds, and higher budgets are closed.

The fixed mask nevertheless passes two static necessary-condition checks. One exact cover
uses 20 pieces; a stronger cover also has type counts `[3,3,3,3,2,3,3]` (two full bags plus
six distinct third-bag draws) and no orthogonally touching same-type pieces. The first
strong certificate has no seed-compatible hard-drop order in `1..20000` after complete
704-state checking. A new, separately versioned tool must enumerate canonical strong
tilings first, match each finite order against the unchanged seed trie second, then demand
current-Core zero-clear replay. It cannot reuse reverse-v1 cursor or evidence bytes.

### Tiling-first v1 authoring contract

Only `tools/search-puzzle-v3-tiling-first.mjs` and
`tools/search-puzzle-v3-tiling-first.test.mjs` open. The old tool, Core, fixture, campaign,
UI, and protected paths remain closed. The new tool imports the accepted geometry, queue,
trie, canonical JSON, mask, hard-drop, and hash primitives without importing any reverse
continuation. Its fixed identity is:

- algorithm `tiling-first-v1`, seeds `1..20000`, sequence length 20, target rows 10;
- the existing 80-cell mask, 662-entry catalog/hash, shape-table hash, full-queue hash,
  reverse-trie hash, type/candidate order, setup-rule, and queue-generator versions;
- cover traversal `mrv-cell/catalog-index-v1` and order traversal
  `remaining-set/trie-node/catalog-index-v1`.

Startup derives every 20-draw type-count tuple from the fixed seed domain. Exactly seven
profiles must exist: one type has count 2 and the other six have count 3. Profiles are
deduplicated and ordered by the count-2 type index `0..6`; their canonical tuple stream is
hashed. Any identity/profile drift fails before a work probe or output.

For each profile, MRV exact-cover DFS starts from the full target, its exact remaining
counts, and seven zero forbidden masks. A descriptor is live only when all four cells are
uncovered, its type has remaining count, and it does not intersect that type's accumulated
four-neighbour forbidden mask. Among uncovered cells, choose the one with the fewest live
descriptors; ties use the lowest absolute target bit. A zero-live pivot is a static dead
end. Branches use complete catalog index order. Selection covers four cells, decrements
one count, and extends only that type's forbidden mask. No reachability, height, random,
or empirical pruning exists in v1.

A strong tiling has zero uncovered cells, seven zero remaining counts, and exactly 20
descriptors. Its identity is the ascending array of 20 catalog indices; the same identity
enters order DFS once. For local bits `0..19` in that ascending order, order state is only
`(remainingSet:u32,trieNodeId:u32)` and board occupancy is the union of remaining pieces.
Try remaining pieces in local/catalog order. An order piece probe first binds the real trie
child, then removes the piece, requires exact `hardDropMask(remainingBoard, descriptor)`,
checks that tiling's failed memo, and descends. Empty remaining set succeeds only at depth
20 with a real trie leaf; choose its minimum seed and reverse the peel order to forward
placements. A tiling owns its memo, which is written only after full state exhaustion;
STOP never writes memo and no memo crosses tiling/profile boundaries.

The single correctness budget is:

```text
workCount = coverBranchProbeCount + orderPieceProbeCount
```

A cover branch consumes one probe when a live descriptor branch begins. An order attempt
consumes one probe before checking a remaining piece, including no-child, hard-drop miss,
memo hit, descent, and candidate. MRV scans and zero-probe unwind do not count. At every
boundary the priority is natural unwind/completion, an already admitted candidate, exact
budget exhaustion, RSS guard, then the next probe. No `budget + 1` probe is legal; budget
wins an equal-boundary RSS stop. RSS uses strict `rss > maxRssBytes` before domain build,
every 1024 trie seeds, after build, before first work, and every 1024 work probes.

CLI accepts only explicit pairs:

```text
--algorithm tiling-first-v1
--work-budget 1..1000000000
--max-rss-mib 128..4096
--output <non-existing explicit path>
```

Cursor, resume, shard, custom seed, duplicate, unknown, aliasing, and malformed arguments
fail before output. V1 is intentionally nonresumable: a larger budget restarts at zero and
separate budget-exhausted runs cannot be added as coverage.

Schema 1 uses exact top-level fields `schemaVersion`, `algorithmVersion`, `claim`, `status`,
`phase`, `domain`, `coverage`, `evidence`, `targetRows`, `targetMaskRows`, `setup`,
`boardRows`, and `search`. Status/phase pairs are candidate/order, complete-not-found/cover,
budget-exhausted/cover-or-order, and memory-guard/domain-build-or-cover-or-order. Invalid
exits 1 with no output; all valid states exit 0 only for candidate, otherwise 2. Candidate
has non-null setup/board rows and `complete=false`; only natural exhaustion of all seven
profiles may set `complete=true`.

Uppercase SHA-256 identities include profile, domain, ordered work trace, strong tiling,
failed-memo trace, and result hashes. Work tokens bind global index/kind/profile and the
complete cover or order pre-probe state, fixed choice, and outcome. Domain excludes budget;
result binds domain, status/phase, limits, counts, all evidence roots, setup, and board.
Output uses recursive canonical JSON, UTF-8, one LF, no BOM. It is fully formed before an
atomic move to a verified absent destination; invalid input cannot touch an existing file.

Direct tests must independently cover all seven profiles and seeds, catalog equivalence,
small-mask exact sets, counts/contact, certificate union, order/forward-physics set
equivalence, real blockers/support, trie reversal/leaf seed, memo isolation, STOP/budget/
RSS priority, identity drift, invalid no-output, schema/nulls, trace vectors, and repeated
bytes. The canonical first strong tiling is a literal regression under global profile
order: profile 0, cover work 1,542, cover trace hash
`695A6D69E8504B78704A39CB19EF6F25BB5FB165172E70F4B54D4E7F3F93C88E`, strong-tiling hash
`06A49A48903ED102042EDFE94804480B9A2ED4F1FFDAB4FCA8C010C9FD433C35`, and a complete
no-seed order result of 443 states / 5,982 piece probes. Independently pin its order trace
and memo hashes. The earlier 704-state profile-4 certificate remains diagnostic provenance
and is not a v1 first-tiling oracle.

After final local gates and fresh independent QA, exactly one production batch may run,
only while resources are green: full fixed domain, work budget 10,000,000, RSS 900 MiB,
one process, repository-external output. Stop on candidate, natural completion, exact
budget, RSS, or system red. Budget/memory output is telemetry only. A candidate still
requires current-Core 20-drop, zero-clear, exact-mask replay before F3C content opens. If
the batch exhausts, review its profile/tiling/order/trace counts before any from-zero v1
increase or separately contracted v2; never return to reverse-v1.

Reverse v1 preserves the existing seed domain `1..20000`, shard count 32, exact floor
partition into 625 seeds each, 20-piece queue generator, fixed 80-cell mask, type and
shape tables, spawn row, vertical hard drop, target-band/hidden/off-mask restrictions,
no-clear setup, and minimum-seed leaf choice. It adds explicit CLI mode
`--algorithm seeded-reverse-v1` and optional `--resume <explicit-json-path>`. Reverse
mode keeps the existing required seed/shard, `--node-budget`, `--max-rss-mib`, and
explicit `--output` arguments; numeric `--cursor` is forbidden, and resume input/output
must be distinct. Existing forward mode and its schema-2 outputs stay unchanged.

For current board `B`, candidate last piece `P` follows one child type of the reversed
seed trie. Let `B' = B \ P`; the candidate is legal only when the existing forward
spawn/rotation/x hard-drop simulation on `B'` lands on exactly `P`. Candidate descriptors
are precomputed inside the fixed mask and ordered by type index, rotation `0..3`, x
ascending, then absolute y ascending. Descriptors with the same type and cell mask are
deduplicated, retaining the first descriptor, matching the accepted forward geometric
landing dedupe. At each frame, only descriptors whose type has a real child at the
current reversed-trie node form the filtered candidate list; types without a child,
descriptors outside the fixed mask, and discarded geometric duplicates never enter the
list and consume no probe. Every descriptor in that filtered list consumes exactly one
probe when its turn begins, including remaining-board, forbidden, hard-drop, or memo
rejections.
An empty-board depth-20 leaf reverses the placements and chooses the minimum seed stored
at that trie leaf; that result remains an authoring candidate only.

For each type, `forbidden[type]` is the fixed-mask-clipped four-neighbor union of already
peeled cells of that type. Candidate `P` must not intersect its type's forbidden mask;
on acceptance the mask gains the four-neighbor cells of `P`. This checks contact only
between distinct source pieces and never rejects adjacency within one tetromino.
Search-state identity is the tuple `(depth, reverseTrieNodeId, remainingBoardMask,
forbidden[I], forbidden[O], forbidden[T], forbidden[S], forbidden[Z], forbidden[J],
forbidden[L])`. Any failed memo uses the full tuple. A frame is memoized only after all
canonical candidates exhaust; budget, memory, candidate, or other STOP propagation may
not memoize it.

Reverse output uses `schemaVersion: 3`, `algorithmVersion: "seeded-reverse-v1"`, and
`cursorSchemaVersion: 1`. Reverse JSON uses a recursive canonical serializer: object
keys sort by unsigned UTF-8 byte order, arrays retain order, all numbers are safe base-10
integers, strings use ECMAScript `JSON.stringify` escaping, and output is the compact
canonical JSON followed by one LF with no BOM. Hash labels below are their exact ASCII
bytes including the shown terminal NUL. SHA-256 JSON fields are uppercase hexadecimal;
hash composition uses raw 32-byte digests.

The five domain version strings are exact literals: algorithm
`seeded-reverse-v1`; setup rules
`visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1`; type
order `I,O,T,S,Z,J,L-v1`; queue generator
`xorshift32-fisher-yates-seven-bag-v1`; and candidate order
`type-index/rotation-0..3/x-ascending/absolute-y-ascending/landing-cell-dedupe/real-trie-child-v1`.
Changing any literal requires a new algorithm/schema contract.

Binary primitives are unsigned `u8`, two's-complement `i8`, big-endian `u32be` and
`u64be`, plus `bytes(s) = u32be(UTF8(s).length) || UTF8(s)`. Board/cell/forbidden masks
use bit `(absoluteY - TARGET_TOP) * 10 + x` and encode as 13 unsigned big-endian bytes
with the top four padding bits zero; JSON uses exactly 25 uppercase hexadecimal digits.
A placement descriptor encodes `(typeIndex:u8, rotation:u8, x:i8, absoluteY:u8,
cellMask:mask13)`. The catalog hash is SHA-256 of
`"T37-RCAT-v1\0" || u32be(count) || descriptors` in canonical order. The shape-table
hash is SHA-256 of `"T37-RSHAPES-v1\0" || u32be(7)` followed in
`I,O,T,S,Z,J,L` order by `u8(typeIndex) || u32be(4)` and, for rotations `0..3`,
`u8(rotation) || u32be(cellCount)` plus each shape cell as `(dx:i8,dy:i8)` in source
array order.

The full-queue hash covers the entire supplied full seed domain, not one shard. It is
SHA-256 of `"T37-RQUEUE-v1\0" || u32be(fullSeedStart) || u32be(fullSeedCount)` followed
for every seed in the half-open interval
`[fullSeedStart, fullSeedStart + fullSeedCount)` by `u32be(seed)` and its 20 type indices
as `u8`. Accepted production runs use full domain `1..20000` and sequence length 20.

Each reverse trie contains only the current shard's seeds. Root is node 0. Insert seeds
in ascending order from the shard's half-open seed interval and each exact 20-piece queue
in reverse; an absent child receives the next consecutive node ID. Its hash input is
`"T37-RTRIE-v1\0" || u32be(nodeCount)` followed for each ascending node ID by seven
`u32be` child IDs in `I,O,T,S,Z,J,L` order (`0xFFFFFFFF` for absent),
`u32be(leafSeedCount)`, and ascending leaf seeds as `u32be`.

Domain hash input is exactly `"T37-RDOMAIN-v1\0" || fixedMask:mask13 || rawCatalogHash
|| rawShapeTableHash || rawFullQueueHash || rawReverseTrieHash ||
u32be(fullSeedStart) || u32be(fullSeedCount) || u32be(20) || u32be(shardCount) ||
u32be(shardIndex) || u32be(shardStartOffset) || u32be(shardEndOffsetExclusive) ||
bytes(algorithmVersion) || bytes(setupRulesVersion) || bytes(typeOrderVersion) ||
bytes(queueGeneratorVersion) || bytes(candidateOrderVersion)`. Shard offsets are
zero-based into the full domain, the end is half-open, and accepted production uses
32 shards with the existing floor partition.

The reverse schema-3 output has exactly these top-level fields:
`schemaVersion`, `algorithmVersion`, `cursorSchemaVersion`, `claim`, `status`, `phase`,
`domain`, `shard`, `coverage`, `evidence`, `targetRows`, `targetMaskRows`, `setup`,
`boardRows`, `search`, and `continuation`. Claim is exactly
`F3C seeded-reverse setup candidate only; Core route replay and exact proof remain mandatory.`
`domain` has exactly `algorithmVersion`, `setupRulesVersion`, `typeOrderVersion`,
`queueGeneratorVersion`, `candidateOrderVersion`, `catalogHash`, `shapeTableHash`,
`fullQueueHash`, `reverseTrieHash`, `domainHash`, `fullSeedStart`, `fullSeedCount`,
`sequenceLength`, and `shardCount`. Version values are the literals above; hash values
are uppercase SHA-256 strings except the two phase-specific nulls defined below;
`sequenceLength` is 20 and all numeric values are safe JSON integers.

`shard` has exactly `count`, `index`, `startOffset`, `endOffsetExclusive`, `seedStart`,
and `seedCount`; count/index/offsets equal the domain-hash inputs,
`seedStart = fullSeedStart + startOffset`, and
`seedCount = endOffsetExclusive - startOffset`. `coverage` has exactly
`startProbeCount`, `newProbeCount`,
`nextProbeCount`, and Boolean `complete`. `evidence` has exactly `probeHash`, `memoHash`,
`cursorStateHash`, and `resultHash`. `search` has exactly `nodeBudget`, `maxRssMiB`,
`processedSeeds`, `catalogDescriptorCount`, `reverseTrieNodeCount`, `startProbeCount`,
`newProbeCount`, `nextProbeCount`, and `failedStateCount`.

`targetRows` is 10 and `targetMaskRows` is the unchanged exact 20-string
`TARGET_VISIBLE_ROWS` array. `setup` is null or exactly `{seed,placements}`, where seed
is the minimum seed at the accepted shard leaf and placements is the forward-order array
of exactly `{type,rotation,x}` with type one of `I,O,T,S,Z,J,L`. `boardRows` is null or
the exact 20-string visible reconstruction using `.` or the owning type letter. Candidate
exits 0, valid noncandidate statuses exit 2, and invalid input/cursor exits 1 without
output.

A failed-state key is the fixed binary tuple
`depth:u8 || reverseTrieNodeId:u32be || remainingBoard:mask13 || seven forbidden:mask13`
in `I,O,T,S,Z,J,L` order; it is 109 bytes and JSON stores exactly 218 uppercase
hexadecimal digits. `memoHash` is
SHA-256 of `"T37-RMEMO-v1\0" || u32be(count)` plus each fixed-length key's raw bytes
sorted lexicographically unsigned. Cursor memo storage uses that same sorted key list.
The required empty-memo vector is the 17-byte label/NUL/count input and hashes to
`1853F77C68198E07DC7A6038F2D055CF0B1C9C9F2C2F9EAD59379CEF07FCFC97`.

A zero-based probe token uses the exact binary fields
`tokenVersion:u8(1), globalProbeIndex:u64be, depth:u8, trieNodeId:u32be,
remainingBoard:mask13, seven forbidden:mask13, candidateIndex:u32be, typeIndex:u8,
rotation:u8, x:i8, absoluteY:u8, cellMask:mask13, outcome:u8`. Outcome is 0
`cells-not-remaining`, 1 `same-type-forbidden`, 2 `hard-drop-mismatch`, 3
`child-memo-hit`, 4 `child-pushed`, or 5 `candidate-leaf`. Each token is 140 bytes and
its cursor JSON form is exactly 280 uppercase hexadecimal digits. The token is appended
only after the descriptor's complete outcome is known, then the global and invocation
probe counts increment by one.

Probe blocks contain exactly 1,024 consecutive tokens. Zero-based block `k` hashes
`"T37-RPBLOCK-v1\0" || u64be(k) || u32be(1024) || token[0] ... token[1023]`.
Its Merkle leaf is SHA-256 of `"T37-RPLEAF-v1\0" || u64be(k) || blockHash`. Appending a
leaf uses binary-carry peaks from level 0 upward; merging existing left and new right
children at level `L` hashes `"T37-RPNODE-v1\0" || u32be(L) || left || right` and
stores the parent at `L+1`. Cursor peaks are an array from level 0 through the highest
present level, each `null` or uppercase hash. The partial block stores 0–1,023 complete
tokens as uppercase hex. `probeHash` is SHA-256 of
`"T37-RPROOT-v1\0" || u64be(totalProbeCount) || u32be(1024) || u32be(peaks.length)`,
then for each peak `u8(0)` or `u8(1)||rawHash`, then `u32be(partialCount)` and the raw
partial tokens. The empty stream therefore has count 0, peaks length 0, and partial
count 0. Cursor validation requires the peak presence bits to encode exactly
`floor(totalProbeCount / 1024)` leaves and partial count to equal the remainder.
The required empty-probe-root vector is the 34-byte label/NUL/count/block-size/empty-
peaks/empty-partial input and hashes to
`C07AA09A429443F5FC5F930F033012D8EECE50DB060894EBA7324C211002D0CA`.

A continuation has exactly `cursorSchemaVersion`, `domainHash`, `shardIndex`,
`nextProbeCount`, `probeBlockSize`, `peaks`, `partialProbeTokens`, `placements`,
`failedMemoKeys`, `frames`, and `cursorStateHash`. `probeBlockSize` is 1,024. `peaks` is
the minimal level-0-up array defined above; `partialProbeTokens` is an array of 0–1,023
complete 280-digit token strings; and `failedMemoKeys` is the unsigned-lexicographically
sorted array of 218-digit key strings.

Cursor `placements` is the reverse-peel path from the first removed forward-last piece
to the current frame. Every entry and every nonroot entering descriptor has exactly
`typeIndex`, `rotation`, `x`, `absoluteY`, and `cellMask`; the root entering descriptor
is null. `frames` is root-to-top and each frame has exactly `depth`, `trieNodeId`,
`remainingBoard`, `forbiddenMasks`, `nextCandidateIndex`, and `enteringDescriptor`.
`forbiddenMasks` is an exact seven-element mask-string array in `I,O,T,S,Z,J,L` order.
The root has depth 0, node 0, the fixed remaining mask, seven zero masks, and the path
length is always `frames.length - 1`; each path item equals its corresponding nonroot
frame's entering descriptor.

`cursorStateHash` is SHA-256 of
`"T37-RCURSOR-v1\0" || UTF8(canonicalJson(continuationWithoutCursorStateHash))`; the
canonical JSON hash input has no trailing LF. Resume recomputes candidate lists and
validates exact field sets and types, mask padding/length, index bounds, root identity,
every parent/child board, forbidden/trie transition, path/frame agreement, memo-key
shape, peak/partial counts, and every non-null domain hash before any probe. Only
search-phase `paused-budget` or `memory-guard` output may be resumed, input/output paths
must differ, and resume continues this stack without prefix replay.

`resultHash` is SHA-256 of `"T37-RRESULT-v1\0" || UTF8(canonicalJson(payload))`, where
payload has exactly `complete`, `cursorStateHash`, `domainHash`, `memoHash`,
`nextProbeCount`, `phase`, `probeHash`, `setup`, and `status` with the same values as the
output. This hash input has no LF. It excludes invocation budget/start/new counts and
file paths so one-shot and resumed execution at the same state match. Any resumable
cursor mismatch fails before a probe.

`--node-budget` counts new reverse candidate probes only; time is never a correctness
budget. After cursor/domain validation and complete trie construction, each search
advance follows this exact state machine:

1. Perform zero-probe unwind first. Exhausted top frames enter the failed memo and pop;
   repeat until a frame has a next descriptor or the root pops. Root exhaustion returns
   `complete-not-found`, even when the invocation budget is also exhausted.
2. If invocation new probes equal `--node-budget`, return `paused-budget`. Therefore
   budget wins over a simultaneous RSS observation.
3. Before the first new probe of every invocation, and thereafter before a next probe
   whose global index is divisible by 1,024, check RSS. If it exceeds the guard, return
   in-search `memory-guard`. No probe is consumed.
4. Increment the frame's next index, evaluate that descriptor, append its completed
   outcome token, increment counts, and update block/Merkle state. A legal child already
   in the failed memo records outcome 3 and is not pushed; otherwise a nonleaf records
   outcome 4 and pushes the exact child frame.
5. A legal empty-board depth-20 trie leaf records outcome 5 and returns `candidate`
   immediately after the admitted probe. It wins over budget or RSS at that boundary.
   Otherwise loop to step 1, so zero-probe natural exhaustion after the final admitted
   probe also wins over a budget stop.

Trie construction allocates root node 0 first, then checks RSS before shard-relative
seed offsets 0, 1,024, 2,048, and so on, inserting at most that group's next 1,024
ascending seeds only after the check; it checks once more after all seeds are inserted.
A guard at any check returns `memory-guard` with phase `trie-build`; even when the
post-build check fires, `domain.reverseTrieHash` and `domain.domainHash` are both null,
`coverage` and all search probe counters are zero/false, the probe and memo hashes are
the fixed empty vectors above, `evidence.cursorStateHash`, setup, board rows, and
continuation are null, and `resultHash` uses that null domain hash. Other domain fields
and pre-trie hashes remain populated. Search `processedSeeds` and
`reverseTrieNodeCount` report the exact inserted-seed and currently allocated-node
counts; failed-state count is zero. This stop is not resumable.

The complete status/null matrix is:

| status / phase | `coverage.complete` | trie/domain hashes | cursor hash / continuation | setup / board |
| --- | --- | --- | --- | --- |
| `memory-guard` / `trie-build` | `false` | `null` / `null` | `null` / `null` | `null` / `null` |
| `paused-budget` / `search` | `false` | hash / hash | hash / object | `null` / `null` |
| `memory-guard` / `search` | `false` | hash / hash | hash / object | `null` / `null` |
| `candidate` / `search` | `false` | hash / hash | `null` / `null` | object / 20 rows |
| `complete-not-found` / `search` | `true` | hash / hash | `null` / `null` | `null` / `null` |

For every search-phase row, trie construction is complete, `processedSeeds` equals the
selected shard seed count, `reverseTrieNodeCount` is final, coverage/search start-new-
next counters agree with `next = start + new`, and probe/memo/result hashes are strings.
For resumable rows, evidence cursor hash equals the continuation's hash. Interrupted
frames never enter the failed memo. Invalid args, resume status, schema, identity, hash,
or structural transitions fail before output. Reverse files use the canonical JSON/LF
serializer; deterministic repeats are byte-identical, while one-shot/split equivalence
compares the same cumulative probe/memo/cursor/result hashes. The first
accepted reverse search round, not yet open, is 32 serial shards with 1,000,000 new
probes per shard and 900 MiB RSS; every incomplete shard receives one increment before
another does.

The only implementation paths after contract QA are
`tools/search-puzzle-v3-prototype.mjs` and
`tools/search-puzzle-v3-prototype-reverse.test.mjs`. Tests must prove small-board
forward/reverse legal-history set equality; floor/piece support, upper and spawn
blockers; same-type contact in either peel order, separated pieces, and intra-piece
adjacency; duplicate rotations; reversed queue equality and exact shard union; distinct
keys for identical board/trie with different forbidden masks; one-shot N probes versus
lossless N1+resume+N2 equality with zero prefix replay; STOP/memo cleanliness; cursor
tamper/version/mask/trie/shard failures; deterministic byte repeats; injected and live
RSS containment; exact empty/partial/full-block and multi-peak digest vectors; all six
probe outcomes; no-child/out-of-mask/duplicate non-probes; simultaneous budget/RSS,
candidate/budget, candidate/RSS, complete/budget, and complete/RSS priority; and forward
`replayPuzzleSetup` reconstruction of every test candidate. Tests also pin the five
version literals, full-domain queue versus shard-local trie digest vector, every exact
nested key/type set, descriptor/frame/path order, cursor and result payload bytes, and
all five rows of the status/null matrix, including post-build RSS with discarded trie/
domain hashes.
Core, the final F3C JSON/test, published content, and later stages remain closed.

## Progress v6 and revision-3 migration

The new key is `tetramorph:puzzle-completion:v6`; schema is 6 and campaign revision is
3. The existing `tetramorph:puzzle-completion:v5` key remains untouched as a read-only
migration/rollback source. A literal rev2 roster preserves all fifty historical IDs,
including the four retirees, independently of the active `PuzzleId` domain.

The target payload is explicit; it does not silently retain the ambiguous v5 field
name:

```ts
type PuzzleProgressV6 = Readonly<{
  version: 6;
  campaignRevision: 3;
  completedLevelIds: readonly ActivePuzzleId[];
  bestLockedPieceCounts: Readonly<Partial<Record<ActivePuzzleId, number>>>;
}>;
```

Migration decodes against the source version's own ID set, validates completion and
positive best counts, then projects each ID exactly once:

- `preserve`: carry completion and map the source v5 `bestPieceCounts[id]` to v6
  `bestLockedPieceCounts[id]` only when the frozen behavior hash matches;
- `rebuild`: clear both fields;
- `retire`: do not map to another level and do not participate in the live campaign;
- unknown source IDs: fail closed rather than partially inventing progress.

The output is deduplicated and ordered by the active 46-ID roster. A best count may
exist only for a retained completion. No array position, old name, category, or ordinal
is a migration key. A retained old Easy best may immediately satisfy its new related
Hard threshold; that recognizes the same unchanged game and never marks the Hard level
complete.

The obsolete live five-level row-band constructor is removed before the 46 definitions
load. Category presentation later uses one 5-slot Intro set, one 5 × 5 Easy set, and one
4 × 4 Hard set. A retired deep link returns to the Puzzle library with an archived-level
notice; it never opens the level now occupying the old ordinal.

## F2 acceptance gate

F2 may hand off to definition authoring only when:

- old route tokens replay unchanged and `Q` round-trips;
- a direction-dependent fixture proves counter-clockwise landing coverage;
- support-mask ordering canonicalizes but different support masks never deduplicate;
- the current three unanchored certificates are rerun over the expanded control graph;
- ordinary, one-anchor, and two-anchor admission fixtures close full shorter-depth
  searches without beam, timeout, or state caps;
- typecheck and the focused Core proof tests pass; and
- inherited T27 evidence and `progress.md` remain outside the checkpoint.

The default F2 source boundary is `src/game/core/puzzleRouteSearch.ts` plus
`src/game/core/puzzleRouteSearch.test.ts` and
`src/game/core/puzzleMasteryExact.test.ts`. `src/puzzleMastery.ts` is a
result-triggered proof-refresh path: include it only if the expanded exact graph changes
the frozen route, optimum, frontier widths, explored states, transitions, or prunes.
Never weaken the exact equality test to avoid that refresh. A statistics-only delta may
change only those proof statistics. A shorter optimum or changed route must also
recompute `masteryOperations = optimum + 5`, the technique signature, and direct
`src/puzzleMastery.test.ts` expectations. The current mastery-group graph remains out of
scope until the later revision-3 progression checkpoint.
