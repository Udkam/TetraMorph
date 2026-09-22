# TetraMorph 1.0.0-rc.1 Release Candidate

> Historical 2026-08-03 snapshot, superseded by [T38 release delivery](T38-RELEASE.md).
> The current campaign has 46 levels and Mutation has four items, not the counts below.

Date: 2026-08-03

TetraMorph 1.0.0-rc.1 freezes the current four-mode game as a coherent, testable portfolio
release. This milestone focuses on clarity, visual consistency, deterministic behavior,
and clean delivery rather than expanding the feature set.

## Highlights

- Four distinct modes: Classic, Survival, Mutation, and a 50-level Puzzle campaign.
- Deterministic seeded Core and replay paths isolated from React, PixiJS, browser time,
  storage, audio, and rendering.
- One PixiJS gameplay Canvas with visible ghost, Next, particles, pressure, carrier,
  and mutation feedback.
- Chinese and English UI, keyboard and touch controls, adjustable procedural SFX, and a
  persistent reduced-motion preference that follows the operating system until changed.
- Compact three-tab Settings surface with live controls, complete rules, and local
  records/leaderboards.

## Mode release state

- **Classic** exposes score, line, combo, and fall-speed feedback around the familiar
  escalating clear loop.
- **Survival** combines rising bedrock with clearable falling stones and an 800 ms,
  source-column danger warning before rockfall entry.
- **Mutation** ships five recognizable abilities—Freeze, Supergravity, Bomb, Double,
  and Reshape—with distinct Next, carrier, activation, and active-state presentation.
- **Puzzle** ships 50 fixed-sequence boards, undo, three curriculum bands, technique
  guidance, mastery gates, and best-operation records.

## Engineering closure

- Final gates: TypeScript pass, 318 tests passed / 3 skipped, and production build pass.
- Runtime restart and unmount are idempotent; final evidence restores baseline
  listeners, closes the owned AudioContext, removes the Canvas and renderer frames, and
  leaves no QA bridge or browser error.
- Production typography emits only the 13 WOFF2 faces used by the accepted semantic
  roles, reducing emitted font bytes by 57.6%.
- The direct dependency tree is clean and a scoped OSV Scanner 2.4.0 lockfile scan found
  no known issue in the candidate. A redacted gitleaks 8.30.1 scan reports no secret
  finding in the release range.

## Evidence

Final source-bound frames and their reproducible audit are in
[`docs/evidence/t26/phase-f`](../evidence/t26/phase-f/README.md). The capture covers Home,
Classic, Survival danger, Mutation impact, Puzzle campaign, and Settings with zero
clipping, horizontal overflow, wrong font roles, DOM board cells, or console errors.

## Scope note

This validated web release candidate passed the implementation, engineering, evidence,
and independent read-only acceptance gates. Native desktop/Steam packaging, store
metadata, platform SDK integration, signing, and distribution QA are separate future
delivery work and are not claimed by this milestone.
