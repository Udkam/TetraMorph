# T37 Stage F — Endgame Curriculum v3

Status: **N0 CANONICAL ENDGAME NAMESPACE ACCEPTED; INTRO-05 CONTRACT RESUME NEXT**

## Supersession boundary

The player retired the former Chinese label and every active identifier from the former
mode namespace on 2026-08-12. The only current names are Chinese `残局`, English
`Endgame`, and code namespace `endgame` / `Endgame`. This document supersedes the former
Stage-F phase file. That deleted file remains available in Git history as provenance; it
is not an active specification and its certificates cannot prove the renamed domain.

This phase has two deliberately separate product changes:

1. **N0 namespace migration** keeps the currently published 50 boards, order, category
   split, unlock behavior, and campaign revision 2 mechanically unchanged. It changes
   names, URLs, IDs, persistence ownership, authoring schemas, and deterministic hashes.
2. **F5 curriculum publication** later changes the campaign to exactly 5 Intro, 25 Easy,
   and 16 Hard boards. It advances campaign revision to 3 and retires four canonical
   Endgame IDs. It cannot be combined with N0.

No work may call the 46-level curriculum published merely because N0 is green.

## N0 canonical namespace contract

### Product and code identity

- Player copy is exactly `残局` / `Endgame`.
- The mode literal is `'endgame'`; types, symbols, fields, filenames, selectors, test IDs,
  scripts, and tools use `Endgame` / `endgame`.
- Canonical routes are `/endgames` and `/play/endgame/:id`.
- Neutral level IDs (`t3r-*`, `t5r-*`, and `t6r-*`) remain byte-identical.
- Every currently published generic level ID in ordinal range 21–50 receives the same
  ordinal under the `tm-endgame-*` family during N0. This includes ordinals 34, 40, 42,
  and 43 because they remain live until F5.

### Progress versions and publication timing

N0 writes `tetramorph:endgame-completion:v6` with exact top-level fields:

```ts
type EndgameProgressV6 = Readonly<{
  version: 6;
  campaignRevision: 2;
  completedLevelIds: readonly EndgameId[];
  bestPieceCounts: Readonly<Partial<Record<EndgameId, number>>>;
}>;
```

V6 is a 50-level namespace conversion, not the future curriculum projection. Completion
and best values map by mechanically equivalent ordinal ID; no record is retired at N0.
The migration does not invent completion, best counts, or unlocks.

F5 later writes `tetramorph:endgame-completion:v7` with `version: 7` and
`campaignRevision: 3`. V7 projects the canonical 50-level record onto the final 46-level
roster. Canonical IDs at ordinals 34, 40, 42, and 43 are retired only then; their
completion/best values do not transfer to a different board. A direct link or selected
value for one of those four IDs opens the Endgame library with an archived-level notice.

### Failure-safe storage conversion

The browser capability exposes tri-state `readStorageState()` reads and idempotent
`removeStorage()` cleanup:

```ts
type StorageRead =
  | { status: 'value'; value: string }
  | { status: 'missing' }
  | { status: 'failed' };
```

Absence and read failure are never conflated. If the canonical key or the first present
higher-priority source is unreadable or invalid, the application must not persist an empty
or older record over uncertain/newer data. Source priority at N0 is: canonical v6; current
TetraMorph v5; historical v5, v4, v3, v2, then v1. Selection stops at the first present key:
a valid value converts, while an invalid or failed value is retained and blocks fallback to
an older snapshot. This avoids silently replacing newer damaged data with stale progress.

The converter writes canonical v6, reads it back through the same tri-state API, parses it,
and proves semantic equality before cleanup. Cleanup is explicitly not atomic: each legacy
key is removed independently and idempotently. A failed removal leaves that key in place
and retries on the next boot. Failures from storage acquisition, `getItem`, `setItem`,
readback, validation, `removeItem`, quota, and partial multi-key cleanup have direct tests.
The live in-memory conversion may be used for that run after a failed write/readback, but
default or gameplay writes remain suppressed until persistence safety is known.

### Rule-introduction conversion

The canonical key is `tetramorph:mode-rule-intros:v2` and its value is a JSON array of
canonical mode literals in product order. The isolated legacy decoder may read the former
TetraMorph v1 key and the older application v1 key, convert the retired mode value to
`'endgame'`, discard invalid values, and deduplicate. The same write/readback/cleanup rule
applies. Failure never causes a previously seen mode to be forgotten or its sheet to be
repeated solely because storage was unreadable.

### URL and history conversion

Canonical history has exact shape:

```ts
type AppRouteHistoryV2 = Readonly<{
  tetramorphRoute: Readonly<{
    version: 2;
    navigation: Readonly<{
      screen: 'home' | 'endgame-library' | 'game';
      mode: 'marathon' | 'race' | 'sprint' | 'endgame';
      selectedEndgameId: EndgameId;
    }>;
  }>;
}>;
```

Normal routing accepts and emits canonical values only. One pure legacy decoder recognizes
the former library path, former play-path prefix, version-1 history payload, former mode,
screen, selected-field name, and generic ordinal IDs. On initial load or `popstate`, path
parsing is authoritative when path and history disagree. A valid legacy input returns one
canonical navigation value and canonical path; the React owner calls `replaceState` once,
never `pushState`. A valid canonical path is handled by the canonical router and is never
redirected because history is malformed or mixed. Invalid encoding or an unknown ID on a
legacy Endgame path falls back to the canonical library; unrelated invalid paths retain the
existing not-found fallback. N0 has no retired IDs; F5 adds the four-ID archived fallback
described above. Back/forward tests cover legacy-to-canonical normalization without duplicate
entries.

### Isolated compatibility boundary

Retired input literals may exist only in:

- `src/legacyEndgameMigration.ts`;
- `src/legacyEndgameMigration.test.ts`.

The module exports canonical data or structured failure only. It exports no compatibility
alias, legacy domain type, active key, selector, or normal writer. `BrowserPlatform` and its
test may add tri-state read and idempotent removal without containing retired domain words.

#### Exact legacy inputs

The isolated module recognizes only these storage keys:

```text
tetramorph:puzzle-completion:v5
qingliu:puzzle-completion:v5
qingliu:puzzle-completion:v4
qingliu:puzzle-completion:v3
qingliu:puzzle-completion:v2
tetris:puzzle-progress:v1
tetramorph:mode-rule-intros:v1
tetris:mode-rule-intros:v1
```

The progress formats are the already validated v5 `{version,campaignRevision,
completedLevelIds,bestPieceCounts}`, v4 `{version,completedLevelIds,bestPieceCounts}`, v3/v2
`{version,completedLevelIds}`, and v1 `{version,nextUnlockedLevelId}` payloads. Exact generic
IDs `tm-puzzle-21` through `tm-puzzle-50` map to the same `tm-endgame-*` ordinal; 20, 51,
non-decimal suffixes, and unknown IDs are invalid. Neutral registered IDs remain unchanged.
The two mode-introduction values are JSON arrays; exact input mode `'puzzle'` maps to
`'endgame'`, unknown entries are discarded, duplicates are removed, and output order is
`marathon`, `race`, `sprint`, `endgame`.

The only legacy paths are `/puzzles` and `/play/puzzle/:id`. Version-1 history has exact
shape:

```ts
type LegacyAppRouteHistoryV1 = Readonly<{
  tetramorphRoute: Readonly<{
    version: 1;
    navigation: Readonly<{
      screen: 'home' | 'puzzle-library' | 'game';
      mode: 'marathon' | 'race' | 'sprint' | 'puzzle';
      selectedPuzzleId: string;
    }>;
  }>;
}>;
```

For the legacy library path, a structurally valid matching history value may preserve its
registered selected ID. For a legacy play path, the decoded path ID always wins. A history
screen/mode inconsistent with its path, any canonical field mixed into v1, any legacy field
mixed into v2, unknown extra navigation fields, invalid percent encoding, or an unregistered
ID is rejected as history input. Rejected history never overrides a valid canonical path.

### Determinism and proof reset

The renamed mode, state fields, IDs, schemas, and hash preimages invalidate every former
state hash, behavior hash, route hash, and certificate hash. Mechanical equivalence is
checked with a namespace-neutral fingerprint containing board geometry, fixed queue, setup
seed, anchors, target cells, public command stream, lock signatures, releases, and final
remaining targets. Old hashes identify historical inputs only; they are never compared as
canonical Endgame proof.

The stopped Intro-05 proof shards are `ABANDONED_LEGACY_PUZZLE_MODE`. They cannot be resumed,
merged, or cited. Intro-05 discovery restarts only after canonical Endgame Core, regenerated
fixtures, and full N0 gates are green.

That gate is now green at source `1a348c2` and evidence `9a68dda`. Final independent N0
review reports P0–P3/GAP all zero. Intro-05 therefore resumes with a new canonical fact
reconciliation and reviewed authoring contract; the abandoned checkpoints remain clues only.

## N0 checkpoint order — accepted

1. Contract and independent QA.
2. Browser storage capability plus isolated legacy decoder and failure-injection tests.
3. Canonical fixture conversion with a checked source/target/hash manifest; historical
   originals remain immutable.
4. One atomic active namespace switch across every current consumer and filename.
5. Regenerate canonical behavior baselines and exact certificates.
6. Focused tests while editing, then one typecheck, full suite, build, bilingual browser
   route/history/storage pass, and independent QA.

There is no dual-mode bridge and no intermediate commit that exports both namespaces.

## F5 final 5 / 25 / 16 roster

The following order is future revision-3 product truth. N0 must not publish it early.

### Intro — 5

1. `t3r-shaft-01`
2. `t3r-shaft-02`
3. `t3r-shaft-03`
4. `t3r-cascade-06`
5. `t3r-shaft-04`

Intro boards use guided 3–4-row positions. Intro 01–04 have accepted mechanical lesson
geometry, but their canonical hashes/proofs must be regenerated after N0. Intro 05 retains
only its accepted causal lesson: the player must use Current, Next-1, and Next-2 and choose
a viable opening; old proof results are not accepted.

### Easy — 25

6–20: `t3r-cascade-05`, `t5r-delta-07`, `t5r-lattice-09`, `t5r-rift-10`,
`t5r-drift-08`, `t5r-pulse-14`, `t5r-arc-13`, `t5r-current-12`, `t5r-prism-11`,
`t5r-horizon-15`, `t6r-cairn-17`, `t6r-terrace-18`, `t6r-keystone-20`,
`t6r-bastion-19`, `t6r-veil-16`.

21–30: `tm-endgame-21` through `tm-endgame-30`.

Easy is fully open. It teaches reusable technique families while retaining some ordinary
residual-board play. Any Easy used as a Hard prerequisite requires an exact optimum and a
measurable technique signature.

### Hard — 16

31–46 use, in order: `tm-endgame-31`, `tm-endgame-32`, `tm-endgame-33`,
`tm-endgame-35`, `tm-endgame-36`, `tm-endgame-37`, `tm-endgame-38`,
`tm-endgame-39`, `tm-endgame-41`, `tm-endgame-44`, `tm-endgame-45`,
`tm-endgame-46`, `tm-endgame-47`, `tm-endgame-48`, `tm-endgame-49`,
`tm-endgame-50`.

Hard may use tall trick boards, multiple anchors, sparse short positions, hollow/two-wall
structures, triangles, pyramids, and bounded board-shape changes. It is not constrained to
one 15×10 template when an explicit board contract and proof domain define another shape.
Every Hard has exactly one visibly related Easy prerequisite; mastery is exact optimum plus
five locked tetrominoes. Generic completion totals do not unlock Hard.

The revision-3 retired set is exactly `tm-endgame-34`, `tm-endgame-40`,
`tm-endgame-42`, and `tm-endgame-43`.

## Certificate acceptance

One operation is one tetromino reaching the real `piece-locked` event. The strict public
domain includes left/right, soft/hard drop, both SRS rotation directions, deterministic
gravity/lock/clear timing, anchors and their support mask, fixed queue, and every decision
available to an Endgame player. Hold remains absent unless product rules explicitly add it.

Every published level requires Core replay of its canonical route, an exhaustive
shorter-depth rejection, deterministic per-depth telemetry, a canonical Endgame state/hash
schema, and independent byte/hash review. A bounded search result, a legacy-domain proof,
or a human-readable route alone is not a certificate.

## Acceptance boundary

Stage F completes only when the canonical namespace is live, all 46 revision-3 boards are
published in the frozen 5/25/16 order, every required certificate is regenerated, progress
conversion is failure-safe, Hard unlock relations derive from accepted Easy techniques,
typecheck/full tests/build pass, one final browser pass proves both languages and persistence,
and independent QA reports no open finding. Until then, completed sub-checkpoints remain
bounded candidates rather than whole-stage acceptance.
