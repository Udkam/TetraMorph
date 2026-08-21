import { describe, expect, it } from 'vitest';
import {
  activeCellsInsideVisibleRows,
  activePresentationScaleFitsVisibleWell,
  approachPresentationPoint,
  boardShiftPresentationOffset,
  clampActivePresentationOffsetY,
  classicLineClearCellSample,
  classicLineClearPairIndex,
  exposedCellEdges,
  internalCellSeams,
  lineClearCellProgress,
  lineClearPresentationProgress,
  nextPreviewPieces,
  nextPreviewPiece,
  ordinaryLineClearCellProgress,
  ordinaryLineClearFragment,
  ordinaryLineClearPresentationProgress,
  ordinaryLineClearProfile,
  ordinaryLineClearRewardTailSample,
  orthogonalCellComponents,
  projectedLandingCells,
  survivalDebrisCells,
} from './presentation';
import { createBoard, createInitialState, dispatch, PIECE_SHAPES, PIECE_TYPES, type Cell, type GameState } from '../core';
import {
  CLASSIC_LINE_CLEAR_SEQUENCE_MS,
  lineClearRewardTailDurationMs,
  lineClearVisualDurationMs,
} from '../../animation/lineClearTimeline';

describe('presentation interpolation', () => {
  it('projects the real independent-column Supergravity landing without mutating Core', () => {
    const board = createBoard();
    for (let x = 0; x < 8; x += 1) board[39]![x] = 'T';
    board[34]![8] = 'J';
    const base = dispatch(createInitialState(0x11a, 'sprint'), { type: 'start' }).state;
    const state = {
      ...base,
      board,
      active: { type: 'O', rotation: 0, x: 8, y: 20 },
      mutationCollapsePiecesRemaining: 0,
      mutationCollapseLandingLatched: true,
    } as GameState;
    const before = board.map((row) => [...row]);

    const rigidLanding = [
      { x: 8, y: 32 }, { x: 9, y: 32 }, { x: 8, y: 33 }, { x: 9, y: 33 },
    ];
    const independentLanding = [
      { x: 8, y: 32 }, { x: 9, y: 38 }, { x: 8, y: 33 }, { x: 9, y: 39 },
    ];

    expect(projectedLandingCells({
      ...state,
      mutationCollapseLandingLatched: false,
    })).toEqual(rigidLanding);
    expect(projectedLandingCells(state)).toEqual(independentLanding);
    const transition = dispatch(state, { type: 'hard-drop' });
    const locked = transition.events.find(
      (event) => event.type === 'piece-locked',
    );
    expect(locked?.cells).toEqual(independentLanding);
    expect(locked?.cells).toEqual(projectedLandingCells(state));
    expect(transition.events.some((event) => event.type === 'clear-started')).toBe(false);
    expect(transition.state.board[34]?.[8]).toBe('J');
    expect(transition.state.board[39]?.[8]).toBeNull();
    expect(projectedLandingCells(state)).toEqual(projectedLandingCells(state));
    expect(board).toEqual(before);
  });

  it('derives the frozen one- or two-cell geometry from each Survival rock event', () => {
    expect(survivalDebrisCells({ x: 6, y: 20, height: 1 })).toEqual([
      { x: 6, y: 20 },
    ]);
    expect(survivalDebrisCells({ x: 6, y: 19, height: 2 })).toEqual([
      { x: 6, y: 19 },
      { x: 6, y: 20 },
    ]);
  });

  it('approaches repeated soft-drop targets continuously without overshooting them', () => {
    let point = { x: 4, y: 0 };
    const samples: number[] = [];
    for (let targetY = 1; targetY <= 8; targetY += 1) {
      point = approachPresentationPoint(point, { x: 4, y: targetY }, 1000 / 60, 26);
      samples.push(point.y);
      expect(point.y).toBeGreaterThan(targetY - 1);
      expect(point.y).toBeLessThanOrEqual(targetY);
    }
    expect(samples.every((value, index) => index === 0 || value > samples[index - 1]!)).toBe(true);
  });

  it('snaps only when motion is disabled and otherwise remains bounded after a long frame', () => {
    expect(approachPresentationPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, 16, 0)).toEqual({ x: 1, y: 1 });
    const point = approachPresentationPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, 200, 80);
    expect(point.x).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(1);
    expect(point.y).toBe(point.x);
  });

  it('maps only the four ordinary clear profiles to their fixed normal and reduced timing', () => {
    expect([1, 2, 3, 4].map((count) => ordinaryLineClearProfile(count))).toMatchObject([
      { id: 'precision-cut', normalTicks: 9, reducedTicks: 6, postCommitTailMs: 220, reducedPostCommitTailMs: 180, rewardTailMs: 120, reducedRewardTailMs: 80 },
      { id: 'dual-resonance', normalTicks: 11, reducedTicks: 7, postCommitTailMs: 340, reducedPostCommitTailMs: 200, rewardTailMs: 240, reducedRewardTailMs: 100 },
      { id: 'cascade-fracture', normalTicks: 12, reducedTicks: 8, postCommitTailMs: 460, reducedPostCommitTailMs: 220, rewardTailMs: 360, reducedRewardTailMs: 120 },
      { id: 'tetramorph', normalTicks: 12, reducedTicks: 8, postCommitTailMs: 580, reducedPostCommitTailMs: 240, rewardTailMs: 480, reducedRewardTailMs: 140 },
    ]);
    for (const count of [-1, 0, 1.5, 5, Number.NaN]) {
      expect(ordinaryLineClearProfile(count)).toBeNull();
      expect(ordinaryLineClearPresentationProgress(8, count, false)).toBe(0);
    }

    expect(ordinaryLineClearPresentationProgress(9, 1, false)).toBe(1);
    expect(ordinaryLineClearPresentationProgress(9, 2, false)).toBeCloseTo(9 / 11);
    expect(ordinaryLineClearPresentationProgress(12, 3, false)).toBe(1);
    expect(ordinaryLineClearPresentationProgress(12, 4, false)).toBe(1);
    expect(ordinaryLineClearPresentationProgress(6, 1, true)).toBe(1);
    expect(ordinaryLineClearPresentationProgress(7, 2, true)).toBe(1);
    expect(ordinaryLineClearPresentationProgress(8, 3, true)).toBe(1);
    expect(ordinaryLineClearPresentationProgress(8, 4, true)).toBe(1);

    // Compatibility callers still receive the original single-clear seam.
    expect(lineClearPresentationProgress(0, false)).toBe(0);
    expect(lineClearPresentationProgress(9, false)).toBe(1);
    expect(lineClearPresentationProgress(12, false)).toBe(1);
    expect(lineClearPresentationProgress(3, true)).toBe(0.5);
    expect(lineClearPresentationProgress(6, true)).toBe(1);

    const center = lineClearCellProgress(0.4, 4, 10);
    const edge = lineClearCellProgress(0.4, 0, 10);
    expect(center).toBeGreaterThan(edge);
    expect(lineClearCellProgress(1, 0, 10)).toBe(1);
    expect(lineClearCellProgress(1, 9, 10)).toBe(1);
  });

  it('samples a count-only reward tail after erase with stationary restrained geometry', () => {
    const intensities: number[] = [];
    for (const count of [1, 2, 3, 4] as const) {
      const fullTailMs = lineClearRewardTailDurationMs(count, false);
      const reducedTailMs = lineClearRewardTailDurationMs(count, true);
      const before = ordinaryLineClearRewardTailSample(
        CLASSIC_LINE_CLEAR_SEQUENCE_MS - 0.1,
        count,
        false,
        false,
      );
      const boundary = ordinaryLineClearRewardTailSample(
        CLASSIC_LINE_CLEAR_SEQUENCE_MS,
        count,
        false,
        false,
      );
      const afterBoundary = ordinaryLineClearRewardTailSample(
        CLASSIC_LINE_CLEAR_SEQUENCE_MS + 0.1,
        count,
        false,
        false,
      );
      const full = ordinaryLineClearRewardTailSample(
        CLASSIC_LINE_CLEAR_SEQUENCE_MS + fullTailMs / 2,
        count,
        false,
        false,
      );
      const endgame = ordinaryLineClearRewardTailSample(
        CLASSIC_LINE_CLEAR_SEQUENCE_MS + fullTailMs / 2,
        count,
        false,
        true,
      );
      const reduced = ordinaryLineClearRewardTailSample(
        CLASSIC_LINE_CLEAR_SEQUENCE_MS + reducedTailMs / 2,
        count,
        true,
        true,
      );

      expect(before).toMatchObject({ active: false, complete: false, alpha: 0, layerCount: 0 });
      expect(boundary).toMatchObject({ active: false, complete: false, progress: 0, alpha: 0, layerCount: 0 });
      expect(afterBoundary.active).toBe(true);
      expect(afterBoundary.progress).toBeGreaterThan(0);
      expect(afterBoundary.alpha).toBeGreaterThan(0);
      expect(afterBoundary.layerCount).toBe(count);
      expect(full).toMatchObject({ active: true, complete: false, progress: 0.5, layerCount: count });
      expect(full.alpha).toBeGreaterThan(0);
      expect(full.travel).toBeGreaterThan(0);
      expect(endgame).toMatchObject({
        active: true,
        progress: full.progress,
        alpha: full.alpha,
        intensity: full.intensity,
        layerCount: count,
        travel: 0,
      });
      expect(reduced).toMatchObject({ active: true, progress: 0.5, layerCount: count, travel: 0 });
      expect(ordinaryLineClearRewardTailSample(
        lineClearVisualDurationMs(count),
        count,
        false,
        false,
      )).toMatchObject({ active: false, complete: true, alpha: 0 });
      expect(ordinaryLineClearRewardTailSample(
        lineClearVisualDurationMs(count, true),
        count,
        true,
        true,
      )).toMatchObject({ active: false, complete: true, alpha: 0 });
      intensities.push(full.intensity);
    }
    expect(intensities.every((value, index) => index === 0 || value > intensities[index - 1]!)).toBe(true);
    expect(ordinaryLineClearRewardTailSample(360, 0, false, false))
      .toMatchObject({ active: false, intensity: 0, layerCount: 0 });
  });

  it('samples continuous symmetric cell exits while restrained geometry stays stationary', () => {
    expect(Array.from({ length: 10 }, (_, column) => classicLineClearPairIndex(column, 10)))
      .toEqual([4, 3, 2, 1, 0, 0, 1, 2, 3, 4]);
    const untouched = classicLineClearCellSample(39, 4, 10, 1, 4, false);
    expect(untouched).toMatchObject({ active: false, complete: false, alpha: 1, scale: 1 });

    const centreStart = classicLineClearCellSample(0, 4, 10, 0, 4, false);
    const centreMiddle = classicLineClearCellSample(30, 4, 10, 0, 4, false);
    const centreEnd = classicLineClearCellSample(53, 4, 10, 0, 4, false);
    expect(centreStart).toMatchObject({ active: true, complete: false, alpha: 1, scale: 1 });
    expect(centreMiddle.alpha).toBeGreaterThan(0);
    expect(centreMiddle.alpha).toBeLessThan(1);
    expect(centreMiddle.scale).toBeLessThan(1);
    expect(centreMiddle.highlight).toBeGreaterThan(0);
    expect(centreEnd).toMatchObject({ complete: true, alpha: 0, scale: 0.78 });

    const centreLeft = classicLineClearCellSample(30, 4, 10, 0, 4, false);
    const centreRight = classicLineClearCellSample(30, 5, 10, 0, 4, false);
    expect(centreLeft).toEqual(centreRight);
    expect(classicLineClearCellSample(30, 4, 10, 0, 4, false).pairProgress)
      .toBeGreaterThan(classicLineClearCellSample(30, 0, 10, 0, 4, false).pairProgress);

    const firstRowAtHandoff = classicLineClearCellSample(180, 0, 10, 0, 2, false);
    const secondRowAtHandoff = classicLineClearCellSample(180, 4, 10, 1, 2, false);
    expect(firstRowAtHandoff.complete).toBe(false);
    expect(firstRowAtHandoff.alpha).toBeGreaterThan(0);
    expect(secondRowAtHandoff).toMatchObject({ active: true, complete: false, alpha: 1 });

    const restrainedLeft = classicLineClearCellSample(80, 0, 10, 0, 4, true);
    const restrainedRight = classicLineClearCellSample(80, 9, 10, 0, 4, true);
    expect(restrainedLeft).toEqual(restrainedRight);
    expect(restrainedLeft.scale).toBe(1);
    expect(restrainedLeft.alpha).toBeGreaterThan(0);
    expect(restrainedLeft.alpha).toBeLessThan(1);
    expect(classicLineClearCellSample(120, 0, 10, 0, 4, true).complete).toBe(true);

    const singleCentreStart = classicLineClearCellSample(0, 4, 10, 0, 1, false);
    const singleCentreMiddle = classicLineClearCellSample(90, 4, 10, 0, 1, false);
    const singleEdgeBefore = classicLineClearCellSample(160, 0, 10, 0, 1, false);
    const singleEdgeTail = classicLineClearCellSample(250, 0, 10, 0, 1, false);
    expect(singleCentreStart).toMatchObject({ active: true, complete: false, alpha: 1 });
    expect(singleCentreMiddle.alpha).toBeGreaterThan(0);
    expect(singleCentreMiddle.alpha).toBeLessThan(1);
    expect(singleEdgeBefore).toMatchObject({ active: true, complete: false, alpha: 1 });
    expect(singleEdgeTail.alpha).toBeGreaterThan(0);
    expect(singleEdgeTail.alpha).toBeLessThan(1);
    expect(classicLineClearCellSample(300, 0, 10, 0, 1, false)).toMatchObject({
      complete: true,
      alpha: 0,
    });

    // Legacy stateless callers remain deterministic, but production one-line rendering
    // now uses the accepted continuous sample above.
    expect(ordinaryLineClearCellProgress(0.34, 4, 10, 0, 1, true)).toBe(0.34);
    expect(ordinaryLineClearCellProgress(0.5, 4, 10, 0, 7, false)).toBe(0);
  });

  it('derives bounded deterministic mineral chips without allocating random state', () => {
    const ceilings = [8, 16, 32, 48];
    const counts: number[] = [];
    for (const count of [1, 2, 3, 4]) {
      const samples = Array.from({ length: count }, (_, row) => (
        Array.from({ length: 10 }, (_, column) => (
          [0, 1].map((index) => ordinaryLineClearFragment(count, 30 + row, column, index))
        )).flat()
      )).flat().filter(Boolean);
      counts.push(samples.length);
      expect(samples.length).toBeLessThanOrEqual(ceilings[count - 1]!);
      expect(samples).toEqual(Array.from({ length: count }, (_, row) => (
        Array.from({ length: 10 }, (_, column) => (
          [0, 1].map((index) => ordinaryLineClearFragment(count, 30 + row, column, index))
        )).flat()
      )).flat().filter(Boolean));
    }
    expect(counts[0]).toBeLessThan(counts[1]!);
    expect(counts[1]).toBeLessThan(counts[2]!);
    expect(counts[2]).toBeLessThan(counts[3]!);
    expect(ordinaryLineClearFragment(0, 39, 4)).toBeNull();
  });

  it('keeps interpolated active cells within the visible well at both edges', () => {
    const unit = 30;
    const height = 20;
    const topSquare: Cell[] = [
      { x: 4, y: 0 }, { x: 5, y: 0 },
      { x: 4, y: 1 }, { x: 5, y: 1 },
    ];
    const middleSquare: Cell[] = topSquare.map((cell) => ({ ...cell, y: cell.y + 5 }));
    const bottomSquare: Cell[] = topSquare.map((cell) => ({ ...cell, y: cell.y + 18 }));
    const translatedTopSquare: Cell[] = topSquare.map((cell) => ({ ...cell, y: cell.y + 1 }));
    const translatedBottomSquare: Cell[] = topSquare.map((cell) => ({ ...cell, y: cell.y + 17 }));
    const pulseScale = 1.035;

    expect(clampActivePresentationOffsetY(-unit, topSquare, unit, height)).toBe(0);
    expect(clampActivePresentationOffsetY(-unit, middleSquare, unit, height)).toBe(-unit);
    expect(clampActivePresentationOffsetY(unit, bottomSquare, unit, height)).toBe(0);
    expect(clampActivePresentationOffsetY(-unit, translatedTopSquare, unit, height)).toBe(-unit);
    expect(clampActivePresentationOffsetY(unit, translatedBottomSquare, unit, height)).toBe(unit);
    expect(activePresentationScaleFitsVisibleWell(translatedTopSquare, -unit, unit, height, pulseScale)).toBe(false);
    expect(activePresentationScaleFitsVisibleWell(translatedBottomSquare, unit, unit, height, pulseScale)).toBe(false);
    expect(activePresentationScaleFitsVisibleWell(middleSquare, -unit, unit, height, pulseScale)).toBe(true);

    for (const [cells, requestedOffsetY] of [
      [topSquare, -unit],
      [middleSquare, -unit],
      [bottomSquare, unit],
    ] as const) {
      const offsetY = clampActivePresentationOffsetY(requestedOffsetY, cells, unit, height);
      for (const cell of cells) {
        expect(cell.y * unit + offsetY).toBeGreaterThanOrEqual(0);
        expect((cell.y + 1) * unit + offsetY).toBeLessThanOrEqual(height * unit);
      }
    }
  });

  it('keeps hidden spawn cells above the board mouth without mutating Core coordinates', () => {
    const hiddenSpawn: Cell[] = [
      { x: 4, y: 1 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ];
    const original = structuredClone(hiddenSpawn);
    const presented = activeCellsInsideVisibleRows(hiddenSpawn, 2, 20);
    expect(presented).toEqual([
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
    expect(hiddenSpawn).toEqual(original);
    expect(presented).toHaveLength(3);
  });

  it('adds the higher spawn row only after Core moves it through the board mouth', () => {
    const entering: Cell[] = [
      { x: 4, y: 1 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 6, y: 2 },
    ];
    expect(activeCellsInsideVisibleRows(entering, 2, 20)).toEqual([
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 6, y: 2 },
    ]);
    const visible = entering.map((cell) => ({ ...cell, y: cell.y + 1 }));
    expect(activeCellsInsideVisibleRows(visible, 2, 20)).toEqual(visible);
  });

  it('settles timed bedrock shifts in their canonical direction without overshoot', () => {
    const upStart = boardShiftPresentationOffset('up', 0, 180, 30);
    const upMiddle = boardShiftPresentationOffset('up', 90, 180, 30);
    const downStart = boardShiftPresentationOffset('down', 0, 180, 30);
    expect(upStart).toBeCloseTo(10.2);
    expect(upMiddle).toBeGreaterThan(0);
    expect(upMiddle).toBeLessThan(upStart);
    expect(downStart).toBeCloseTo(-10.2);
    expect(boardShiftPresentationOffset('up', 180, 180, 30)).toBe(0);
    expect(boardShiftPresentationOffset('down', 20, 0, 30)).toBe(0);
  });

  it('groups every canonical tetromino, preserves its outer perimeter, and enumerates each inner seam once', () => {
    const expectedPerimeters = { I: 10, O: 8, T: 10, S: 10, Z: 10, J: 10, L: 10 } as const;
    const expectedSeams = { I: 3, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 } as const;
    const opposite = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const;
    const offsets = {
      top: { x: 0, y: -1 },
      right: { x: 1, y: 0 },
      bottom: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
    } as const;

    for (const type of PIECE_TYPES) {
      const cells = PIECE_SHAPES[type][0];
      const ordered = cells.slice().sort((a, b) => a.y - b.y || a.x - b.x);
      expect(orthogonalCellComponents(cells)).toEqual([ordered]);
      const perimeter = exposedCellEdges(cells);
      expect(perimeter.flatMap(({ exposed }) => Object.values(exposed)).filter(Boolean)).toHaveLength(expectedPerimeters[type]);
      const seams = internalCellSeams(cells);
      expect(seams).toHaveLength(expectedSeams[type]);
      expect(new Set(seams.map(({ start, end }) => `${start.x},${start.y}:${end.x},${end.y}`)).size).toBe(seams.length);

      const byCell = new Map(perimeter.map((entry) => [`${entry.cell.x},${entry.cell.y}`, entry]));
      for (const { cell, exposed } of perimeter) {
        for (const edge of Object.keys(offsets) as Array<keyof typeof offsets>) {
          const offset = offsets[edge];
          const neighbour = byCell.get(`${cell.x + offset.x},${cell.y + offset.y}`);
          if (!neighbour) continue;
          expect(exposed[edge]).toBe(false);
          expect(neighbour.exposed[opposite[edge]]).toBe(false);
        }
      }
    }
  });

  it('splits post-clear fragments without inventing internal Ghost boxes', () => {
    const fragments: Cell[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }];
    expect(orthogonalCellComponents(fragments).map((component) => component.length)).toEqual([2, 1]);
    const joined = exposedCellEdges(fragments.slice(0, 2));
    expect(joined[0]?.exposed.right).toBe(false);
    expect(joined[1]?.exposed.left).toBe(false);
    expect(joined.flatMap(({ exposed }) => Object.values(exposed)).filter(Boolean)).toHaveLength(6);
    expect(internalCellSeams(fragments)).toEqual([
      {
        orientation: 'vertical',
        start: { x: 1, y: 0 },
        end: { x: 1, y: 1 },
      },
    ]);
  });

  it('uses the canonical queue for a two-item Endgame preview and one-item live previews', () => {
    const ready = createInitialState(9, 'endgame', 't3r-shaft-01');
    const playing = dispatch(ready, { type: 'start' }).state;
    const endgameQueueBeforePreview = [...playing.queue];

    expect(nextPreviewPieces(ready)).toEqual([]);
    expect(nextPreviewPieces(playing)).toEqual(playing.queue.slice(0, 2));
    expect(nextPreviewPiece(playing)).toBe(playing.queue[0]);
    expect(playing.queue).toEqual(endgameQueueBeforePreview);

    const classic = dispatch(createInitialState(9, 'marathon'), { type: 'start' }).state;
    const survival = dispatch(createInitialState(9, 'race'), { type: 'start' }).state;
    expect(nextPreviewPieces(classic)).toEqual(classic.queue.slice(0, 1));
    expect(nextPreviewPieces(survival)).toEqual(survival.queue.slice(0, 1));
    expect(nextPreviewPieces({ ...classic, status: 'paused' })).toEqual(classic.queue.slice(0, 1));
    expect(nextPreviewPieces({ ...survival, status: 'paused' })).toEqual(survival.queue.slice(0, 1));

    // Level 01's intended opening hard-drop now legitimately finishes the board.
    // Use the deterministic rotation-teaching level here so the post-lock Endgame
    // state remains live and continues to exercise the two-item queue preview.
    const nonFinishingEndgame = dispatch(createInitialState(5, 'endgame', 't5r-drift-08'), { type: 'start' }).state;
    let afterFirstLock = dispatch(nonFinishingEndgame, { type: 'hard-drop' }).state;
    for (let guard = 0; afterFirstLock.status === 'playing' && (!afterFirstLock.active || afterFirstLock.phase !== 'active') && guard < 64; guard += 1) {
      afterFirstLock = dispatch(afterFirstLock, { type: 'tick' }).state;
    }
    expect(nextPreviewPieces(afterFirstLock)).toEqual(afterFirstLock.queue.slice(0, 2));
    expect(nextPreviewPiece({ ...afterFirstLock, status: 'finished' })).toBeNull();
    expect(nextPreviewPieces({ ...afterFirstLock, status: 'finished' })).toEqual([]);
  });
});
