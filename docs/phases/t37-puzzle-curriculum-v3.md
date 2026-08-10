# T37 Stage F — Puzzle Curriculum v3

Status: **F3B INJECTED MECHANICS ACCEPTED; F3C TEN-ROW ADMISSION NEXT**

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
