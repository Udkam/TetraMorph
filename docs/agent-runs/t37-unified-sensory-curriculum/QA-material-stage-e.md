# T37 Stage E Independent QA Disposition

## Candidate

- Product source: `a1849525db8742701c398cd67c4eed5a9f4bc47b`.
- Direct restart-proof repair: `1058dbd` (test only).
- Semantic evidence: `731bf6f` (20 PNGs plus audit and capture runner).
- Theme/motion/responsive repair: `8e336fe` (6 PNGs plus audit and capture runner).

## Findings and closure

1. Initial audio QA found one P2: the restart test replayed Ice at `9.0 s`, after the
   stale queue tail at `8.94 s`, so it did not prove tail reset. `1058dbd` moves replay
   to `8.25 s`; without reset the cue would start at `8.94 s`, and the assertion fails.
2. Initial static QA found one P1: the first evidence set used only deep-tide and full
   motion. `8e336fe` adds all three themes, full/reduced motion, Chinese/English,
   desktop/portrait/mobile viewports, and all four item materials.

Both findings are closed. Independent static, audio, and original-detail visual
rechecks report `P0 0 / P1 0 / P2 0 / P3 0`.

## Verified evidence

- Ice reads as a complete cyan crystal body with restrained frost/crack structure.
- Bomb reads as a dark mineral body with contained orange lava seams.
- Multiplier reads as a complete gold body with sparse glints.
- Supergravity reads as a luminous violet body with distributed dark wells.
- Next, active plus Ghost, settled, captured clear, and activation retain one material
  identity; no central badge or ordinary-body underlay remains visible.
- All 26 PNG SHA-256 entries match. Browser audits report one Canvas, zero DOM board
  cells, no horizontal/vertical overflow, and zero console/page errors.
- The final coordinator gates pass typecheck, `412 passed / 8 skipped` tests, and the
  767-module production build.
- The committed Stage E range contains no inherited T27 evidence, T27-R1 follow-up, or
  `progress.md` path.

## Disposition

Stage E is **TECHNICAL ACCEPT — PLAYER REVIEW OPEN**. This decision opens the bounded
Stage F proof foundation; it does not claim human acceptance of the new material look.
