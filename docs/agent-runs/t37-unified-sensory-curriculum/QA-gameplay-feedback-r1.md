# T37 Gameplay Feedback R1 — Independent Read-Only QA

Task ID: `TETRIS-T37-GAMEPLAY-FEEDBACK-R1-QA`

## Candidate

- Review range: `d2a0b1e..dc70f10`.
- Final product source: `41afc786715d25f32400b1aa6a8712bbffddc676`.
- Evidence checkpoint: `dc70f10`.
- QA ownership: independent read-only agent; no file was edited, staged, or committed
  during the review.

## Disposition

`P0 0 / P1 0 / P2 0 / P3 0`.

The exact candidate is technically safe to return to the player for focused live-play
and listening. This disposition does not accept Bomb timbre, perceived impact, or the
comfort of the multi-line rhythm; only the player can close those sensory gates.

## Verified claims

- Bomb derives its primary `220 ms` impact from the renderer Mutation token. Pressure
  begins at `0 ms`, the main low body and deterministic air start at `220 ms`, and the
  low tail begins at `235 ms`. The cue uses four voices and remains within the existing
  sixteen-voice ceiling under the tested dense Mutation batch.
- AudioEngine captures one AudioContext clock origin per cue. Studio row pulses and
  Bomb tone/air layers therefore cannot drift apart when `currentTime` advances while
  their nodes are being constructed.
- Studio audio and renderer release share `lineClearTimeline.ts`. Two, three, and four
  rows use `0/180`, `0/90/180`, and `0/60/120/180 ms`, mapped to presentation ticks
  `0/11`, `0/5/11`, and `0/4/7/11` respectively.
- The renderer orders pending rows by ascending board `y`, so the visible sequence is
  top to bottom. Anchors and bedrock remain visible; released Puzzle markers and
  Mutation overlays leave with their row. Reduced-motion and Puzzle retain the same
  discrete order without fragments or travel.
- `src/game/core/**` is unchanged in the candidate. Core retains the twelve-tick hold
  and resolves the complete row set atomically on tick 12.
- One-line clear, accepted Action A, accepted Ice 2, and Studio sample/mixer bytes remain
  outside the reopened surface.

## Evidence and commands

- `audit.json` binds to `41afc78` and records Studio four-row starts at
  `0/60/120/180 ms`, Bomb oscillators at `0/220/235 ms`, Bomb air at `220 ms`, and the
  `880 Hz / Q 0.55` low-pass route.
- Twelve committed PNGs were inspected at original detail. The 2/3/4-row sequences
  visibly release from the top row downward; the reduced-motion frame agrees with the
  declared discrete state. Live and prescribed-client frames show the complete game
  page rather than an isolated blank canvas.
- Live evidence reports one canvas, zero DOM board cells, restart canvas reuse, exit
  cleanup, and zero console/page errors.
- Seven targeted test files passed `98/98` during independent QA.
- `git diff --check d2a0b1e..dc70f10` is clean. The range contains none of inherited
  dirty `docs/evidence/t27/**`, `docs/evidence/t27-r1-followup/**`, or `progress.md`.

## Open gate and next action

Blocker: none technical. Human sensory acceptance remains intentionally open.

Next action: the player retests Bomb and 2–4-line clears at normal device volume. Keep
Stage D closed and do not alter accepted anchors until that focused verdict arrives.
