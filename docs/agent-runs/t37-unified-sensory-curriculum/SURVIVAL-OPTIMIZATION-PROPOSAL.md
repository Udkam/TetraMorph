# T37 Survival Optimization Proposal

> **AUDIT ONLY / NOT IMPLEMENTED**
>
> This document is the requested Survival design output. It does not authorize or claim
> any product, Core, renderer, audio, persistence, leaderboard, or copy change. Every
> recommendation below requires a separate implementation contract and fresh QA.

## 1. Current deterministic rules

The current product is internally coherent and already exposes a recognizable two-clock
Survival mode:

- A run opens with three permanent bedrock rows.
- Natural bedrock pressure starts at 13 seconds, shortens by one second per three cleared
  lines, and stops shortening at 6 seconds.
- Every fourth resolved natural rise is an Aftershock that raises two rows instead of one.
- Crossing each three-line boundary removes one top bedrock row and resets pressure.
- Rockfall begins at an eight-locked-piece interval. Every four rockfall events shorten
  the interval by one piece, to a minimum of four.
- One warned column receives a one- or two-cell joined rock. The warning is held for at
  least 800 ms of playing time; the rocks fall at seven times ordinary piece speed and
  may complete lines.
- The live rail reports time, lines, bedrock pressure, and pieces until rockfall. The
  local ranking compares time first and lines second.

These facts are an audit baseline, not a recommendation to retain every tuning value.

## 2. Confirmed correctness risk

### P0 — rise, reward, and overflow are not one lossless transaction

During line-clear completion, the current Core resolves a pending rise with overflow
deferred, then applies the three-line bedrock reward. If the same clear crosses a reward
threshold, a previously reported rise overflow is not terminal. The rise operation has
already clipped the canonical board, so a top cell can be discarded before the later
lowering makes the final board appear playable. The two-row Aftershock plus one-row
reward is the sharpest case.

The future correction should be transactional:

1. Freeze the pre-resolution board, active piece, falling rocks, pending-rise count, and
   crossed reward count.
2. Apply line removal, natural rise, and reward in their existing causal order to an
   extended logical board that can temporarily represent rows above `0`.
3. Do not clip or discard any ordinary cell while the transaction is in progress.
4. After all vertical transforms, end the run if any locked cell, active cell, or falling
   rock remains outside the canonical board; otherwise commit the complete final state.
5. Emit deterministic `bedrock-raised` then `bedrock-lowered` events when both occur, and
   emit at most one terminal event after the final bounds decision.

This preserves the current rise-before-reward rule while eliminating silent cell loss.
It also gives an exact expected result for `+1/-1` and `+2/-1` boundary cases instead of
letting truncation decide them accidentally.

Required future tests:

- pending one-row rise plus a three-line reward with occupied rows `0` and `1`;
- pending Aftershock plus one reward row with occupied rows `0`, `1`, and `2`;
- active-piece and falling-rock overflow variants;
- no duplicated or missing rise/lower/game-over events;
- property tests proving cell conservation outside explicitly cleared rows;
- deterministic replay and state-hash equality across restart and serialization.

## 3. Fair competition boundary

### P0 — random-seed runs should not share one comparable ranking

The current local leaderboard ranks runs generated from different random seeds. Duration
and lines are useful personal-history statistics, but they are not a fair competitive
ordering when piece and rock sequences differ.

Split the future surface into two honest domains:

- **Personal runs:** fresh random seeds; preserve date, time, lines, and diagnostics as
  local history. Never describe cross-seed ordering as a fair rank.
- **Comparable challenge:** a fixed published `rulesetId` plus `seedId`; only records with
  the same pair compete. Seed rotation may be daily or explicitly selected, but it must
  be deterministic and available offline.

A future persistence revision should store the domain, `rulesetId`, `seedId`, time,
lines, and diagnostic summary. Existing records remain visible as legacy personal
history; they must not be silently assigned a seed or promoted into the comparable
domain. Any rules or cadence change creates a new ruleset rather than mixing records.

## 4. Readability and pacing improvements

These are P1/P2 proposals, ordered after the two P0 corrections.

### P1 — make each hazard forecast actionable

- Keep the existing minimum warning lead, but show the exact column and whether one or
  two rocks are coming.
- Announce an upcoming Aftershock as `+2`, not only by changing the card label.
- Use one polite live-region update when a forecast is created and one when it resolves;
  do not announce every timer tick.
- Retain visual distinction between permanent bedrock, warned entry, falling rock, and
  settled ordinary cells under all themes and reduced motion.

### P1 — measure compound spikes before retuning

Natural rise and rockfall clocks can resolve close together, and both accelerate over a
run. That compound pressure may be desirable, but tuning it by feel from one seed would
hide variance. Before changing any interval, run a deterministic multi-seed baseline and
record at least:

- survival time and lines;
- rise, Aftershock, and rockfall timestamps;
- number of rise/rockfall overlaps within two locked pieces;
- maximum bedrock height and board-height danger time;
- terminal cause and last ten placements.

Compare distributions across a frozen seed set and ruleset. Only then evaluate candidate
smoothing rules such as a short post-Aftershock rockfall exclusion window or a capped
combined-hazard budget. No smoothing rule is approved by this proposal.

### P1 — make results explain the run

Add a future result summary with terminal cause, seed/ruleset domain, time, lines, natural
rises, Aftershocks, rockfalls, and maximum bedrock height. This should explain a failure
without turning the in-run HUD into a telemetry dashboard.

### P2 — separate entry ceremony from competitive time

Audit whether the staged three-row opening currently contributes to recorded Survival
time. A comparable challenge should start its timer at the same controllable instant on
every device, after the entry presentation and when the first piece accepts input.

### P2 — keep audio semantic and separately accepted

Future Survival audio may distinguish warning, ordinary rise, Aftershock, falling rocks,
and terminal overflow, but only after the state contracts above are fixed. Every cue must
be clearly causal, restrained, and pass a separate human listening gate; automated WAV
metrics alone are not acceptance.

## 5. Recommended implementation order

1. Add lossless atomic-settlement fixtures and reproduce the overflow defect.
2. Implement the transactional rise/reward boundary without changing tuning.
3. Introduce personal versus comparable record domains and a versioned ruleset/seed key.
4. Capture a frozen multi-seed baseline from the corrected Core.
5. Improve warning semantics, live-region behavior, and result diagnostics.
6. Evaluate pacing candidates against the same seed set; choose one only with measured
   benefit and human play review.
7. Consider the audio layer last, behind its own listening acceptance.

Each step should be a separate reviewable checkpoint. Core simulation remains
renderer-independent, and UI/storage work must not redefine deterministic mechanics.

## 6. Future acceptance criteria

A later Survival implementation is eligible for acceptance only when all of the following
are true:

- zero silent cell loss in the atomic-settlement matrix and property tests;
- identical seed, ruleset, and input replay produce identical state/event hashes;
- comparable rankings contain only one exact `rulesetId` and `seedId` domain;
- legacy random records remain readable and are never misrepresented as comparable;
- warning column, height, and Aftershock size agree with the next resolved hazard;
- keyboard, touch, reduced motion, and live-region behavior remain usable;
- one gameplay Canvas, zero browser errors, and no listener/ticker/audio leak;
- full typecheck, test suite, build, browser evidence, and independent QA pass;
- pacing, clarity, and any new sound receive explicit human acceptance.

Until such a separately authorized slice exists, the shipped Survival product remains
unchanged and this proposal remains **NOT IMPLEMENTED**.
