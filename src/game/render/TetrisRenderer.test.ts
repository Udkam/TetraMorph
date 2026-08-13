// @vitest-environment jsdom

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  ANCHOR_CELL,
  BEDROCK_CELL,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  SURVIVAL_STONE_CELL,
  createBoard,
  createInitialState,
  createRandomizer,
  dispatch,
  type BoardMaterial,
  type Cell,
  type GameEvent,
  type GameState,
  type MutationItem,
  type PieceType,
  VISIBLE_START_ROW,
} from '../core';
import {
  CLASSIC_LINE_CLEAR_SEQUENCE_MS,
  LINE_CLEAR_CORE_COMMIT_MS,
  LINE_CLEAR_RELEASE_TICKS,
  STUDIO_LINE_CLEAR_OFFSETS_MS,
} from '../../animation/lineClearTimeline';
import { MUTATION_VFX_TOKENS } from '../../design/mutationTokens';
import {
  BEDROCK_MATERIAL,
  COLORS,
  MUTATION_MATERIALS,
  SURVIVAL_STONE_MATERIAL,
  type MutationMaterialRole,
  type PieceMaterial,
} from './theme';

let TetrisRendererClass: (typeof import('./TetrisRenderer'))['TetrisRenderer'];
let buildBedrockTexturePixels: (width: number, height: number) => Uint8ClampedArray;
let originalCanvasContext: PropertyDescriptor | undefined;

type DrawOperation = {
  kind: 'roundRect' | 'rect' | 'circle' | 'poly' | 'segment' | 'fill' | 'stroke';
  values: readonly number[];
  options?: unknown;
};

type RecorderGraphics = {
  clear: () => RecorderGraphics;
  roundRect: (...values: number[]) => RecorderGraphics;
  rect: (...values: number[]) => RecorderGraphics;
  circle: (...values: number[]) => RecorderGraphics;
  poly: (values: number[]) => RecorderGraphics;
  moveTo: (x: number, y: number) => RecorderGraphics;
  lineTo: (x: number, y: number) => RecorderGraphics;
  fill: (options: unknown) => RecorderGraphics;
  stroke: (options: unknown) => RecorderGraphics;
};

function createGraphicsRecorder(): { graphics: RecorderGraphics; operations: DrawOperation[] } {
  const operations: DrawOperation[] = [];
  let currentX = 0;
  let currentY = 0;
  const graphics = {} as RecorderGraphics;
  graphics.clear = () => graphics;
  graphics.roundRect = (...values) => {
    operations.push({ kind: 'roundRect', values });
    return graphics;
  };
  graphics.rect = (...values) => {
    operations.push({ kind: 'rect', values });
    return graphics;
  };
  graphics.circle = (...values) => {
    operations.push({ kind: 'circle', values });
    return graphics;
  };
  graphics.poly = (values) => {
    operations.push({ kind: 'poly', values });
    return graphics;
  };
  graphics.moveTo = (x, y) => {
    currentX = x;
    currentY = y;
    return graphics;
  };
  graphics.lineTo = (x, y) => {
    operations.push({ kind: 'segment', values: [currentX, currentY, x, y] });
    currentX = x;
    currentY = y;
    return graphics;
  };
  graphics.fill = (options) => {
    operations.push({ kind: 'fill', values: [], options });
    return graphics;
  };
  graphics.stroke = (options) => {
    operations.push({ kind: 'stroke', values: [], options });
    return graphics;
  };
  return { graphics, operations };
}

function geometrySignature(operations: readonly DrawOperation[]): string {
  return JSON.stringify(operations
    .filter((operation) => operation.kind !== 'fill' && operation.kind !== 'stroke')
    .map(({ kind, values }) => ({ kind, values })));
}

function hasBroadHorizontalGeometry(operations: readonly DrawOperation[], boardWidth: number): boolean {
  const threshold = boardWidth * .8;
  return operations.some((operation) => {
    if (operation.kind === 'roundRect' || operation.kind === 'rect') {
      return (operation.values[2] ?? 0) >= threshold;
    }
    if (operation.kind === 'segment') {
      return Math.abs((operation.values[2] ?? 0) - (operation.values[0] ?? 0)) >= threshold;
    }
    return false;
  });
}

const MUTATION_ITEMS = ['freeze', 'collapse', 'bomb', 'multiplier'] as const satisfies readonly MutationItem[];

function mutationEvent(
  item: MutationItem,
  cells: readonly Cell[] = [],
): Extract<GameEvent, { type: 'mutation-activated' }> {
  if (item === 'bomb') {
    return {
      type: 'mutation-activated',
      item,
      durationTicks: 0,
      score: 300,
      rowsRemoved: 3,
      triggerCells: cells,
      bombOutcome: 'blast',
      blastRows: [37, 38, 39],
      participatingBombCount: 1,
    };
  }
  return {
    type: 'mutation-activated',
    item,
    durationTicks: 600,
    score: 0,
    rowsRemoved: 0,
    triggerCells: cells,
    ...(item === 'multiplier' ? { multiplierFactor: 2 as const } : {}),
  };
}

function chainClearEvent(
  cells: readonly Cell[],
  chainTriggerRows: readonly number[],
): Extract<GameEvent, { type: 'mutation-activated' }> {
  return {
    type: 'mutation-activated',
    item: 'bomb',
    durationTicks: 0,
    score: 600,
    rowsRemoved: 4,
    triggerCells: cells,
    bombOutcome: 'chain-clear',
    blastRows: [24, 25, 26],
    participatingBombCount: 2,
    chainOriginCarrierId: 3,
    chainOriginCells: cells,
    chainTriggerRows,
  };
}

type RendererInternals = {
  host: HTMLElement | null;
  previewGraphics: unknown;
  pieceGraphics: unknown;
  previewBounds: { x: number; y: number; width: number; height: number } | null;
  previewLayerVisible: boolean;
  app: {
    stage: unknown;
    renderer: {
      resolution: number;
      extract: {
        canvas: (options: unknown) => HTMLCanvasElement;
      };
    };
  } | null;
  snapshot: {
    board: { x: number; y: number; width: number; height: number; cell: number };
    activeCells: Cell[];
    ghostCells: Cell[];
    activeSpawnEntry: {
      generationKey: string;
      pending: boolean;
      visibleCellCount: number;
      hiddenCellCount: number;
    } | null;
  };
  presentation: unknown;
  activeSpawnGenerationKey: string | null;
  activeSpawnEntry: {
    generationKey: string;
    pending: boolean;
  } | null;
  trail: {
    cells: Cell[];
    distance: number;
    elapsed: number;
    duration: number;
    piece: PieceType;
  } | null;
  syncCanvasSize: (app: {
    screen: { width: number; height: number };
    resize: () => void;
  }) => void;
  lockPulse: {
    cells: Cell[];
    elapsed: number;
    duration: number;
    piece: PieceType;
    strength: number;
  } | null;
  impact: number;
  rotationPulse: number;
  boardShift: unknown;
  classicFeedbackCues: Array<{
    kind: 'combo' | 'speed-up' | 'top-out';
    elapsed: number;
    duration: number;
    cells: readonly Cell[];
    rows: readonly number[];
    combo: number;
    tier: number;
  }>;
  survivalDebrisPresentation: Map<number, { x: number; y: number }>;
  survivalStoneCues: Array<{
    kind: 'spawn' | 'land';
    cells: readonly Cell[];
    elapsed: number;
    duration: number;
  }>;
  ordinaryMultiLineClearCues: Array<{
    count: 1 | 2 | 3 | 4;
    orderedRows: readonly number[];
    cells: readonly {
      cell: Cell;
      material: BoardMaterial;
      rowOrder: number;
      mutationItem: MutationItem | null;
      endgameTarget: boolean;
    }[];
    elapsed: number;
    duration: number;
    restrained: boolean;
    committed: boolean;
    fresh: boolean;
  }>;
  survivalBedrockCue: {
    direction: 'up' | 'down';
    height: number;
    elapsed: number;
    duration: number;
  } | null;
  survivalEntryBedrockRise: {
    rows: number;
    elapsed: number;
    duration: number;
  } | null;
  drawPieces: (
    state: GameState,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  updateSnapshot: (
    state: GameState,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
    app: { screen: { width: number; height: number }; renderer: { resolution: number } },
  ) => void;
  mutationFlash: {
    item: MutationItem;
    elapsed: number;
    duration: number;
    triggerCells: readonly Cell[];
    multiplierFactor: 2 | 4;
    score: number;
    particlesEmitted: boolean;
    triggerColumns: readonly number[];
    bombOutcome: 'blast' | 'chain-clear' | null;
    blastRows: readonly number[];
    chainOriginCells: readonly Cell[];
    chainTriggerRows: readonly number[];
  } | null;
  pendingBombClearOutcome: 'blast' | 'chain-clear' | null;
  mutationFlashQueue: Array<{ item: MutationItem }>;
  mutationParticles: Array<{ active: boolean; item: MutationItem; rotation: number; rotationVelocity: number }>;
  mutationFields: Map<
    Extract<MutationItem, 'freeze' | 'collapse' | 'multiplier'>,
    { item: Extract<MutationItem, 'freeze' | 'collapse' | 'multiplier'>; stage: 'enter' | 'active' | 'exit'; elapsed: number }
  >;
  mutationClockMs: number;
  mutationArrival: unknown;
  activeMutationCarrierId: number | null;
  consumeEvents: (
    events: readonly GameEvent[],
    state?: GameState,
    previousBoard?: GameState['board'] | null,
    collapseWasActive?: boolean,
  ) => void;
  advanceEffects: (deltaMs: number) => void;
  applyMutationCameraShake: (
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  syncActiveSpawnEntry: (state: GameState) => void;
  advanceSurvivalDebrisPresentation: (state: GameState, deltaMs: number) => void;
  drawEffects: (state: GameState, layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean }) => void;
  drawCommittedOrdinaryMultiLineClearBodies: (
    graphics: unknown,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  drawPreviews: (state: GameState, layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean }) => void;
  drawSurvivalPressureEffects: (
    graphics: unknown,
    state: GameState,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  mutationMaterial: (item: MutationItem) => PieceMaterial;
  materialFor: (material: typeof BEDROCK_CELL | typeof SURVIVAL_STONE_CELL) => PieceMaterial;
  drawMutationPieceMaterial: (
    graphics: unknown,
    cells: readonly Cell[],
    type: BoardMaterial,
    item: MutationItem,
    alpha: number,
    role: MutationMaterialRole,
    options: {
      originX: number;
      originY: number;
      unit: number;
      offsetX?: number;
      offsetY?: number;
      scale?: number;
      active?: boolean;
      ghost?: boolean;
      material?: PieceMaterial;
    },
  ) => void;
  drawMutationMaterialDetails: (
    graphics: unknown,
    cells: readonly Cell[],
    item: MutationItem,
    alpha: number,
    role: MutationMaterialRole,
    options: { originX: number; originY: number; unit: number; offsetX?: number; offsetY?: number; scale?: number },
  ) => void;
  drawMutationCarrierMaterials: (
    graphics: unknown,
    state: GameState,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
    offsetY: number,
  ) => void;
  drawEndgameTargetMarkers: (
    graphics: unknown,
    state: GameState,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
    offsetY: number,
  ) => void;
  drawMutationMaterialArrivalPulse: (
    graphics: unknown,
    cells: readonly Cell[],
    item: MutationItem | null,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
    offsetX: number,
    offsetY: number,
  ) => void;
  drawMutationMaterialRim: (
    graphics: unknown,
    cells: readonly Cell[],
    item: MutationItem,
    options: { originX: number; originY: number; unit: number; offsetX?: number; offsetY?: number; scale?: number },
    alpha?: number,
    width?: number,
  ) => void;
  drawMutationChainClear: (
    graphics: unknown,
    flash: NonNullable<RendererInternals['mutationFlash']>,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  drawReducedMutationEndpoint: (
    graphics: unknown,
    item: MutationItem,
    centerX: number,
    centerY: number,
    size: number,
    factor: 2 | 4,
  ) => void;
  drawMutationMultiplierValue: (
    graphics: unknown,
    centerX: number,
    centerY: number,
    unit: number,
    factor: 2 | 4,
    color: number,
    alpha: number,
  ) => void;
  drawPreviewPiece: (
    graphics: unknown,
    type: PieceType,
    centerX: number,
    centerY: number,
    unit: number,
    carrierItem: MutationItem | null,
  ) => void;
  drawCellGroups: (
    graphics: unknown,
    cells: readonly Cell[],
    type: unknown,
    alpha: number,
    options: unknown,
  ) => void;
  drawBedrockBody: (
    graphics: unknown,
    cells: readonly { cell: Cell; x: number; y: number }[],
    size: number,
    material: PieceMaterial,
    alpha: number,
  ) => void;
  drawStoneBodies: (
    graphics: unknown,
    cells: readonly { cell: Cell; x: number; y: number }[],
    size: number,
    material: PieceMaterial,
    alpha: number,
  ) => void;
  drawHardDropTraces: (
    graphics: unknown,
    trail: NonNullable<RendererInternals['trail']>,
    progress: number,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
    boardShiftOffsetY?: number,
  ) => void;
  drawLandingImprint: (
    graphics: unknown,
    imprint: NonNullable<RendererInternals['lockPulse']>,
    progress: number,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  drawClassicFeedbackCues: (
    graphics: unknown,
    state: GameState,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  drawMutationActivationEffect: (
    graphics: unknown,
    flash: NonNullable<RendererInternals['mutationFlash']>,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  drawActiveMutationAtmosphere: (
    graphics: unknown,
    state: GameState,
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
  ) => void;
  drawMutationSnowflake: (
    graphics: unknown,
    centerX: number,
    centerY: number,
    radius: number,
    color: number,
    alpha: number,
    rotation?: number,
  ) => void;
  drawGravityFactorParticle: (
    graphics: unknown,
    centerX: number,
    centerY: number,
    radius: number,
    color: number,
    alpha: number,
    scale?: number,
  ) => void;
  drawSupergravityPieceTrail: (
    graphics: unknown,
    cells: readonly Cell[],
    layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean },
    offsetX?: number,
    offsetY?: number,
  ) => void;
  drawMutationLineClearAccent: (
    graphics: unknown,
    item: 'freeze' | 'collapse',
    x: number,
    y: number,
    size: number,
    progress: number,
    cellSize: number,
  ) => void;
  syncMutationFilters: (state: GameState, layout: { x: number; y: number; width: number; height: number; cell: number; compact: boolean }) => void;
  resolvePreviewMutationItem: (state: GameState) => MutationItem | null;
  previewMutationRandomizerRef: GameState['mutationRandomizer'] | null;
  drawPreviewPieces: (graphics: unknown, pieces: readonly ('I' | 'O')[], x: number, y: number, width: number, height: number, labelInset?: number) => void;
};

describe('Endgame undo presentation reset', () => {
  beforeAll(async () => {
    originalCanvasContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null,
    });
    ({ TetrisRenderer: TetrisRendererClass, buildBedrockTexturePixels } = await import('./TetrisRenderer'));
  });

  afterAll(() => {
    if (originalCanvasContext) Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', originalCanvasContext);
  });

  it('synchronizes the Pixi screen before rendering restored responsive layouts', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const host = document.createElement('div');
    Object.defineProperties(host, {
      clientWidth: { configurable: true, value: 758 },
      clientHeight: { configurable: true, value: 810 },
    });
    const screen = { width: 318, height: 313 };
    const resize = vi.fn(() => {
      screen.width = host.clientWidth;
      screen.height = host.clientHeight;
    });
    internals.host = host;

    internals.syncCanvasSize({ screen, resize });
    internals.syncCanvasSize({ screen, resize });

    expect(resize).toHaveBeenCalledTimes(1);
    expect(screen).toEqual({ width: 758, height: 810 });
  });

  it('removes every discarded lock, line-impact, and interpolation residue', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    internals.presentation = { type: 'I', x: 4, y: 10, settleMs: 26 };
    internals.trail = { cells: [{ x: 4, y: 10 }], distance: 18, elapsed: 12, duration: 50, piece: 'I' };
    internals.lockPulse = {
      cells: [{ x: 4, y: 10 }],
      elapsed: 12,
      duration: 100,
      piece: 'I',
      strength: 1,
    };
    internals.classicFeedbackCues.push({
      kind: 'combo',
      elapsed: 12,
      duration: 300,
      cells: [],
      rows: [39],
      combo: 2,
      tier: 0,
    });
    internals.impact = 1.2;
    internals.rotationPulse = 1;
    internals.boardShift = { direction: 'up', elapsed: 12, duration: 180 };

    internals.consumeEvents([{ type: 'endgame-undone' }]);

    expect(internals.presentation).toBeNull();
    expect(internals.trail).toBeNull();
    expect(internals.lockPulse).toBeNull();
    expect(internals.classicFeedbackCues).toHaveLength(0);
    expect(internals.impact).toBe(0);
    expect(internals.rotationPulse).toBe(0);
    expect(internals.boardShift).toBeNull();
  });

  it('maps each item to a complete material and queues bounded mutation effects', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    expect(internals.mutationMaterial('freeze')).toBe(MUTATION_MATERIALS.freeze);
    expect(internals.mutationMaterial('collapse')).toBe(MUTATION_MATERIALS.collapse);
    expect(internals.mutationMaterial('bomb')).toBe(MUTATION_MATERIALS.bomb);
    expect(internals.mutationMaterial('multiplier')).toBe(MUTATION_MATERIALS.multiplier);

    internals.consumeEvents([mutationEvent('bomb')]);
    expect(internals.mutationFlash).toMatchObject({
      item: 'bomb',
      elapsed: 0,
      duration: 620,
      triggerCells: [],
      score: 300,
      particlesEmitted: false,
    });
    expect(internals.mutationParticles).toHaveLength(120);
    expect(internals.mutationParticles.filter((particle) => particle.active && particle.item === 'bomb')).toHaveLength(0);
    internals.consumeEvents([{ type: 'mutation-activated', item: 'freeze', durationTicks: 600, score: 0, rowsRemoved: 0 }]);
    expect(internals.mutationFlash).toMatchObject({ item: 'bomb' });
    expect(internals.mutationFlashQueue).toHaveLength(1);
    expect(internals.mutationFlashQueue[0]).toMatchObject({ item: 'freeze' });
    internals.advanceEffects(219);
    expect(internals.mutationParticles.filter((particle) => particle.active && particle.item === 'bomb')).toHaveLength(0);
    internals.advanceEffects(1);
    expect(internals.mutationFlash).toMatchObject({ item: 'bomb', particlesEmitted: true });
    expect(internals.mutationParticles.filter((particle) => particle.active && particle.item === 'bomb')).toHaveLength(72);
    expect(internals.mutationParticles.some((particle) => particle.active && particle.item === 'bomb' && Math.abs(particle.rotationVelocity) > 0)).toBe(true);
    internals.advanceEffects(399);
    expect(internals.mutationFlash).toMatchObject({ item: 'bomb' });
    internals.advanceEffects(1);
    expect(internals.mutationFlash).toMatchObject({ item: 'freeze', elapsed: 0, duration: 320 });
    expect(internals.mutationParticles.filter((particle) => particle.active && particle.item === 'freeze')).toHaveLength(0);
    expect(internals.mutationParticles.filter((particle) => particle.active && particle.item === 'bomb').length).toBeGreaterThan(0);
    internals.advanceEffects(319);
    expect(internals.mutationFlash).not.toBeNull();
    internals.advanceEffects(1);
    expect(internals.mutationFlash).toBeNull();
  });

  it('queues one renderer activation per distinct item with Bomb first', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    internals.consumeEvents([
      { type: 'mutation-activated', item: 'freeze', durationTicks: 600, score: 0, rowsRemoved: 0 },
      { type: 'mutation-activated', item: 'freeze', durationTicks: 600, score: 0, rowsRemoved: 0 },
      { type: 'mutation-activated', item: 'collapse', durationTicks: 600, score: 0, rowsRemoved: 0 },
      mutationEvent('bomb'),
    ]);

    expect(internals.mutationFlash).toMatchObject({ item: 'bomb' });
    expect(internals.mutationFlashQueue).toMatchObject([{ item: 'freeze' }, { item: 'collapse' }]);
  });

  it('preserves the current Mutation flash, FIFO, and timed fields when reduced motion changes', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    internals.consumeEvents([
      mutationEvent('bomb'),
      { type: 'mutation-activated', item: 'freeze', durationTicks: 600, score: 0, rowsRemoved: 0 },
    ]);
    internals.mutationFields.set('collapse', { item: 'collapse', stage: 'active', elapsed: 0 });

    renderer.setOptions({ reducedMotion: true });

    expect(internals.mutationFlash).toMatchObject({ item: 'bomb', particlesEmitted: false });
    expect(internals.mutationFlashQueue).toMatchObject([{ item: 'freeze' }]);
    expect(internals.mutationFields.get('collapse')).toMatchObject({ stage: 'active' });
    expect(internals.mutationParticles.every((particle) => !particle.active)).toBe(true);

    internals.advanceEffects(620);
    expect(internals.mutationFlash).toMatchObject({ item: 'freeze', elapsed: 0 });
    internals.advanceEffects(320);
    expect(internals.mutationFlash).toBeNull();
  });

  it('retimes an active chain clear without truncating or stalling its FIFO', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const origin = [{ x: 4, y: VISIBLE_START_ROW + 5 }];
    internals.consumeEvents([
      chainClearEvent(origin, [VISIBLE_START_ROW + 5]),
      { type: 'mutation-activated', item: 'freeze', durationTicks: 600, score: 0, rowsRemoved: 0 },
    ]);
    internals.advanceEffects(349);
    expect(internals.mutationFlash).toMatchObject({ item: 'bomb', elapsed: 349 });
    const fullDuration = internals.mutationFlash!.duration;

    renderer.setOptions({ reducedMotion: true });
    const reducedDuration = internals.mutationFlash!.duration;
    expect(reducedDuration).toBeLessThan(fullDuration);
    expect(internals.mutationFlash!.elapsed / reducedDuration).toBeCloseTo(349 / fullDuration, 2);
    internals.advanceEffects(reducedDuration - internals.mutationFlash!.elapsed - 1);
    expect(internals.mutationFlash).toMatchObject({ item: 'bomb' });
    internals.advanceEffects(1);
    expect(internals.mutationFlash).toMatchObject({ item: 'freeze', elapsed: 0 });
  });

  it('preserves normalized chain-clear progress when reduced motion is disabled mid-wave', () => {
    const renderer = new TetrisRendererClass();
    renderer.setOptions({ reducedMotion: true });
    const internals = renderer as unknown as RendererInternals;
    internals.consumeEvents([chainClearEvent(
      [{ x: 4, y: VISIBLE_START_ROW + 5 }],
      [VISIBLE_START_ROW + 5],
    )]);
    const reducedDuration = internals.mutationFlash!.duration;
    internals.advanceEffects(reducedDuration * 0.4);

    renderer.setOptions({ reducedMotion: false });
    const fullDuration = internals.mutationFlash!.duration;
    expect(fullDuration).toBeGreaterThan(reducedDuration);
    expect(internals.mutationFlash!.elapsed / fullDuration).toBeCloseTo(0.4, 5);
    internals.advanceEffects(fullDuration * 0.6 - 1);
    expect(internals.mutationFlash).toMatchObject({ item: 'bomb' });
    internals.advanceEffects(1);
    expect(internals.mutationFlash).toBeNull();
  });

  it('invalidates Mutation preview lookahead only when the item stream changes', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const initial = createInitialState(0x715, 'sprint');
    const state = {
      ...initial,
      status: 'playing' as const,
      active: { type: 'T' as const, rotation: 0 as const, x: 3, y: 20 },
      pieceCount: 1,
    };

    internals.resolvePreviewMutationItem(state);
    expect(internals.previewMutationRandomizerRef).toBe(state.mutationRandomizer);

    const changedItemStream = {
      ...state,
      mutationRandomizer: createRandomizer(0xdead_beef),
    };
    internals.resolvePreviewMutationItem(changedItemStream);
    expect(internals.previewMutationRandomizerRef).toBe(changedItemStream.mutationRandomizer);

    const changedOrdinaryStream = {
      ...changedItemStream,
      randomizer: createRandomizer(0x1234_5678),
    };
    internals.resolvePreviewMutationItem(changedOrdinaryStream);
    expect(internals.previewMutationRandomizerRef).toBe(changedItemStream.mutationRandomizer);
  });

  it('routes Survival debris through a distinct stone material without dropping simultaneous local cues', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    expect(internals.materialFor(BEDROCK_CELL)).toBe(BEDROCK_MATERIAL);
    expect(internals.materialFor(SURVIVAL_STONE_CELL)).toBe(SURVIVAL_STONE_MATERIAL);

    internals.consumeEvents([{
      type: 'survival-stones-spawned',
      cells: [{ x: 2, y: 19 }, { x: 2, y: 20 }],
      intervalPieces: 8,
      nextIntervalPieces: 8,
    }]);
    expect(internals.impact).toBeGreaterThan(0);
    internals.consumeEvents([{
      type: 'survival-stones-landed',
      cells: [{ x: 2, y: 38 }, { x: 2, y: 39 }],
    }]);
    expect(internals.impact).toBeGreaterThan(0.4);
    expect(internals.survivalStoneCues).toMatchObject([
      { kind: 'spawn', cells: [{ x: 2, y: 19 }, { x: 2, y: 20 }], elapsed: 0, duration: 140 },
      { kind: 'land', cells: [{ x: 2, y: 38 }, { x: 2, y: 39 }], elapsed: 0, duration: 150 },
    ]);

    internals.advanceEffects(140);
    expect(internals.survivalStoneCues).toMatchObject([
      { kind: 'land', elapsed: 140, duration: 150 },
    ]);
    internals.advanceEffects(10);
    expect(internals.survivalStoneCues).toHaveLength(0);
  });

  it('builds a deterministic stylized cold-slate wall without photographic microtexture', () => {
    const first = buildBedrockTexturePixels(64, 32);
    const second = buildBedrockTexturePixels(64, 32);
    expect(first).toEqual(second);
    expect(first).toHaveLength(64 * 32 * 4);
    const luminance: number[] = [];
    const colors = new Set<string>();
    let adjacentDelta = 0;
    let adjacentPairs = 0;
    let sharpEdges = 0;
    let longestFlatRun = 0;
    for (let y = 0; y < 32; y += 1) {
      let flatRun = 1;
      for (let x = 0; x < 64; x += 1) {
        const index = (y * 64 + x) * 4;
        const red = first[index]!;
        const green = first[index + 1]!;
        const blue = first[index + 2]!;
        const value = (first[index]! * 0.2126) + (first[index + 1]! * 0.7152) + (first[index + 2]! * 0.0722);
        luminance.push(value);
        colors.add(`${red},${green},${blue}`);
        expect(green).toBeGreaterThan(red);
        expect(blue).toBeGreaterThan(green);
        expect(first[index + 3]).toBe(255);
        if (x > 0) {
          const delta = Math.abs(value - luminance[luminance.length - 2]!);
          adjacentDelta += delta;
          if (delta > 18) sharpEdges += 1;
          if (delta < 0.01) flatRun += 1;
          else flatRun = 1;
          longestFlatRun = Math.max(longestFlatRun, flatRun);
          adjacentPairs += 1;
        }
      }
    }
    expect(Math.max(...luminance) - Math.min(...luminance)).toBeGreaterThan(30);
    expect(colors.size).toBeGreaterThanOrEqual(9);
    expect(colors.size).toBeLessThanOrEqual(128);
    expect(adjacentDelta / adjacentPairs).toBeLessThan(8);
    expect(sharpEdges / adjacentPairs).toBeLessThan(0.04);
    expect(longestFlatRun).toBeLessThan(18);
  });

  it('draws a flat-contact continuous cavern wall and complete square falling stones without decals', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const shelf = Array.from({ length: 30 }, (_, index) => {
      const x = index % 10;
      const row = Math.floor(index / 10);
      return {
        cell: { x, y: 15 + row },
        x: 10 + x * 24,
        y: 20 + row * 24,
      };
    });
    const pair = [
      { cell: { x: 3, y: 16 }, x: 82, y: 20 },
      { cell: { x: 3, y: 17 }, x: 82, y: 44 },
    ];
    const bedrock = createGraphicsRecorder();
    const falling = createGraphicsRecorder();

    internals.drawBedrockBody(
      bedrock.graphics,
      shelf,
      24,
      BEDROCK_MATERIAL,
      1,
    );
    internals.drawStoneBodies(
      falling.graphics,
      pair,
      24,
      SURVIVAL_STONE_MATERIAL,
      1,
    );

    const bedrockRects = bedrock.operations.filter((operation) => operation.kind === 'rect');
    const bedrockPolygons = bedrock.operations.filter((operation) => operation.kind === 'poly');
    const fallingRects = falling.operations.filter((operation) => operation.kind === 'rect');
    const fallingPolygons = falling.operations.filter((operation) => operation.kind === 'poly');
    expect(bedrockRects).toHaveLength(1);
    expect(bedrockRects[0]?.values).toEqual([10, 20, 240, 72]);
    expect(bedrockPolygons).toHaveLength(1);
    for (const face of bedrockPolygons) {
      const vertices = Array.from({ length: face.values.length / 2 }, (_, vertex) => (
        `${face.values[vertex * 2]?.toFixed(3)},${face.values[vertex * 2 + 1]?.toFixed(3)}`
      ));
      expect(new Set(vertices).size).toBeGreaterThanOrEqual(3);
      const xValues = face.values.filter((_, index) => index % 2 === 0);
      const yValues = face.values.filter((_, index) => index % 2 === 1);
      expect(Math.min(...xValues)).toBeGreaterThanOrEqual(10);
      expect(Math.max(...xValues)).toBeLessThanOrEqual(250);
      expect(Math.min(...yValues)).toBeGreaterThanOrEqual(20);
      expect(Math.max(...yValues)).toBeLessThanOrEqual(92);
    }
    const lip = bedrockPolygons[0]!;
    const lipXValues = lip.values.filter((_, index) => index % 2 === 0);
    const lipYValues = lip.values.filter((_, index) => index % 2 === 1);
    expect(Math.min(...lipXValues)).toBe(10);
    expect(Math.max(...lipXValues)).toBe(250);
    expect(Math.min(...lipYValues)).toBe(20);
    expect(Math.max(...lipYValues)).toBeLessThan(26);
    expect(bedrock.operations[2]?.kind).toBe('poly');
    const bedrockSegments = bedrock.operations.filter((operation) => operation.kind === 'segment');
    expect(bedrockSegments).toEqual([{ kind: 'segment', values: [10, 20, 250, 20] }]);
    expect(bedrock.operations.filter((operation) => operation.kind === 'stroke')).toHaveLength(1);
    expect(bedrock.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(bedrock.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(fallingRects).toHaveLength(2);
    for (const body of fallingRects) {
      expect(body.values[2]).toBeCloseTo(body.values[3] ?? 0, 6);
      expect(body.values[2]).toBe(24);
    }
    expect(fallingRects[0]?.values[0]).toBeCloseTo(fallingRects[1]?.values[0] ?? 0, 6);
    expect(fallingRects[0]?.values).toEqual([82, 20, 24, 24]);
    expect(fallingRects[1]?.values).toEqual([82, 44, 24, 24]);
    expect((fallingRects[0]?.values[1] ?? 0) + (fallingRects[0]?.values[3] ?? 0))
      .toBe(fallingRects[1]?.values[1]);
    expect(fallingPolygons).toHaveLength(6);
    expect(falling.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(falling.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(falling.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(0);
    expect(geometrySignature(bedrock.operations)).not.toBe(geometrySignature(falling.operations));

    const cellSized = createGraphicsRecorder();
    internals.drawCellGroups(
      cellSized.graphics,
      [{ x: 3, y: 16 }, { x: 3, y: 17 }],
      SURVIVAL_STONE_CELL,
      1,
      { originX: 10, originY: 20, unit: 24 },
    );
    const cellBodies = cellSized.operations.filter((operation) => operation.kind === 'rect');
    expect(cellBodies.slice(0, 2).map((operation) => operation.values)).toEqual([
      [82, 404, 24, 24],
      [82, 428, 24, 24],
    ]);
  });

  it('reveals and raises exactly one canonical bedrock row per Survival countdown digit', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const state = createInitialState(0x51a1f00d, 'race');
    const pieces = createGraphicsRecorder();
    const rising = createGraphicsRecorder();
    const mask = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: pieces.graphics,
      survivalEntryGraphics: rising.graphics,
      survivalEntryMaskGraphics: mask.graphics,
    });
    const drawGroups = vi.spyOn(internals, 'drawCellGroups');

    renderer.setOptions({ survivalEntryBedrockRows: 1 });
    internals.drawPieces(state, layout);
    expect(renderer.getSnapshot().visibleLockedCells).toBe(10);
    expect(renderer.getSnapshot().survivalEntryBedrockRows).toBe(1);
    expect(renderer.getSnapshot().survivalEntryBedrockRise).toMatchObject({
      rows: 1,
      elapsedMs: 0,
      durationMs: 820,
      offsetY: 20,
    });
    const firstRiseCall = drawGroups.mock.calls.find((call) => (
      call[0] === rising.graphics && call[2] === BEDROCK_CELL
    ));
    expect(firstRiseCall?.[1]).toHaveLength(10);
    expect(firstRiseCall?.[4]).toMatchObject({ offsetY: 20 });
    const entryPolygons = rising.operations.filter((operation) => operation.kind === 'poly').length;
    expect(entryPolygons).toBe(1);
    expect(rising.operations.some((operation) => operation.kind === 'roundRect')).toBe(false);

    internals.advanceEffects(340);
    const halfway = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      survivalEntryGraphics: halfway.graphics,
    });
    internals.drawPieces(state, layout);
    const halfwayOffset = renderer.getSnapshot().survivalEntryBedrockRise?.offsetY ?? 0;
    expect(halfwayOffset).toBeGreaterThan(0);
    expect(halfwayOffset).toBeLessThan(layout.cell);

    drawGroups.mockClear();
    renderer.setOptions({ survivalEntryBedrockRows: 2 });
    const secondRow = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      survivalEntryGraphics: secondRow.graphics,
    });
    internals.drawPieces(state, layout);
    expect(renderer.getSnapshot().visibleLockedCells).toBe(20);
    expect(renderer.getSnapshot().survivalEntryBedrockRise).toMatchObject({ rows: 2, offsetY: 20 });
    const secondRiseCall = drawGroups.mock.calls.find((call) => (
      call[0] === secondRow.graphics && call[2] === BEDROCK_CELL
    ));
    expect(secondRiseCall?.[1]).toHaveLength(20);
    expect(secondRiseCall?.[4]).toMatchObject({ offsetY: 20 });
    expect(drawGroups.mock.calls.some((call) => (
      call[0] === pieces.graphics && call[2] === BEDROCK_CELL
    ))).toBe(false);

    renderer.setOptions({ reducedMotion: true, survivalEntryBedrockRows: 3 });
    const reduced = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: reduced.graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
    });
    internals.drawPieces(state, layout);
    expect(renderer.getSnapshot().visibleLockedCells).toBe(30);
    expect(renderer.getSnapshot().survivalEntryBedrockRows).toBe(3);
    expect(renderer.getSnapshot().survivalEntryBedrockRise).toBeNull();
  });

  it('lets a two-row spawn cross the board mouth one real row at a time', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const ready = createInitialState(0x51a1f00d, 'race');
    const pieces = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: pieces.graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
      survivalEntryMaskGraphics: createGraphicsRecorder().graphics,
    });
    const drawGroups = vi.spyOn(internals, 'drawCellGroups');
    const app = { screen: { width: 280, height: 480 }, renderer: { resolution: 1 } };

    renderer.setOptions({ survivalEntryBedrockRows: 1 });
    internals.drawPieces(ready, layout);
    internals.updateSnapshot(ready, layout, app);

    expect(renderer.getSnapshot()).toMatchObject({
      activeCells: [],
      ghostCells: [],
      activeSpawnEntry: null,
      visibleLockedCells: 10,
    });
    expect(drawGroups.mock.calls.filter((call) => call[2] === ready.active?.type)).toHaveLength(0);

    const started = dispatch(ready, { type: 'start' }).state;
    const playing = {
      ...started,
      active: { type: 'T', rotation: 0, x: 3, y: 19 },
    } as GameState;
    drawGroups.mockClear();
    renderer.setOptions({ survivalEntryBedrockRows: null });
    internals.drawPieces(playing, layout);
    internals.updateSnapshot(playing, layout, app);

    expect(renderer.getSnapshot().activeCells).toHaveLength(4);
    expect(renderer.getSnapshot().ghostCells).toHaveLength(4);
    expect(renderer.getSnapshot().activeSpawnEntry).toMatchObject({
      pending: true,
      visibleCellCount: 3,
      hiddenCellCount: 1,
    });
    const firstVisibleRow = drawGroups.mock.calls.find((call) => (
      call[2] === 'T' && (call[4] as { active?: boolean } | undefined)?.active === true
    ));
    expect(firstVisibleRow?.[1]).toEqual([
      { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
    ]);
    expect(drawGroups.mock.calls.some((call) => (
      (call[4] as { ghost?: boolean } | undefined)?.ghost === true
    ))).toBe(true);
    expect(drawGroups.mock.calls.find((call) => (
      (call[4] as { ghost?: boolean } | undefined)?.ghost === true
    ))?.[1]).toHaveLength(4);

    const entering = {
      ...playing,
      active: { ...playing.active!, y: 20 },
    } as GameState;
    Object.assign(internals as unknown as Record<string, unknown>, {
      presentation: { type: 'T', x: 3, y: 19, settleMs: 56 },
    });
    drawGroups.mockClear();
    internals.drawPieces(entering, layout);
    internals.updateSnapshot(entering, layout, app);
    const crossingRows = drawGroups.mock.calls.find((call) => (
      call[2] === 'T' && (call[4] as { active?: boolean } | undefined)?.active === true
    ));
    expect(crossingRows?.[1]).toEqual([
      { x: 4, y: 0 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 },
    ]);
    expect(crossingRows?.[4]).toMatchObject({ offsetY: -20 });
    expect(renderer.getSnapshot().activeSpawnEntry).toMatchObject({
      pending: true,
      visibleCellCount: 4,
      hiddenCellCount: 0,
    });
    expect(drawGroups.mock.calls.some((call) => (
      (call[4] as { ghost?: boolean } | undefined)?.ghost === true
    ))).toBe(true);
    expect(drawGroups.mock.calls.find((call) => (
      (call[4] as { ghost?: boolean } | undefined)?.ghost === true
    ))?.[1]).toHaveLength(4);

    Object.assign(internals as unknown as Record<string, unknown>, {
      presentation: { type: 'T', x: 3, y: 19.99, settleMs: 56 },
    });
    drawGroups.mockClear();
    internals.drawPieces(entering, layout);
    internals.updateSnapshot(entering, layout, app);
    expect(renderer.getSnapshot().activeSpawnEntry).toMatchObject({ pending: false });
    expect(drawGroups.mock.calls.some((call) => (
      (call[4] as { ghost?: boolean } | undefined)?.ghost === true
    ))).toBe(true);
  });

  it('does not restart spatial spawn entry for movement, rotation, or pause', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const base = dispatch(createInitialState(0x51a1f00d, 'marathon'), { type: 'start' }).state;
    const playing = {
      ...base,
      active: { type: 'T', rotation: 0, x: 3, y: 19 },
    } as GameState;

    internals.syncActiveSpawnEntry(playing);
    const originalEntry = internals.activeSpawnEntry;

    internals.syncActiveSpawnEntry({
      ...playing,
      active: playing.active ? { ...playing.active, x: playing.active.x + 1, rotation: 1 } : null,
    });
    expect(internals.activeSpawnEntry).toBe(originalEntry);
    expect(internals.activeSpawnEntry?.pending).toBe(true);

    internals.syncActiveSpawnEntry({ ...playing, status: 'paused' });
    expect(internals.activeSpawnEntry).toBe(originalEntry);

    internals.syncActiveSpawnEntry({ ...playing, pieceCount: playing.pieceCount + 1 });
    expect(internals.activeSpawnEntry).not.toBe(originalEntry);
    expect(internals.activeSpawnEntry?.pending).toBe(true);
  });

  it('draws and snapshots the independently settled Supergravity ghost after its timer expires', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const board = createBoard();
    board[39]![3] = 'I';
    board[38]![3] = 'T';
    board[39]![4] = 'L';
    const base = dispatch(createInitialState(0x11a, 'sprint'), { type: 'start' }).state;
    const state = {
      ...base,
      board,
      active: { type: 'O', rotation: 0, x: 3, y: 20 },
      mutationCollapsePiecesRemaining: 0,
      mutationCollapseLandingLatched: true,
    } as GameState;
    const pieces = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: pieces.graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
      survivalEntryMaskGraphics: createGraphicsRecorder().graphics,
    });
    const drawGroups = vi.spyOn(internals, 'drawCellGroups');

    internals.drawPieces(state, layout);
    internals.updateSnapshot(state, layout, {
      screen: { width: 280, height: 480 },
      renderer: { resolution: 1 },
    });

    const ghostCall = drawGroups.mock.calls.find((call) => (
      (call[4] as { ghost?: boolean } | undefined)?.ghost === true
    ));
    expect(ghostCall?.[1]).toEqual([
      { x: 3, y: 16 }, { x: 4, y: 17 }, { x: 3, y: 17 }, { x: 4, y: 18 },
    ]);
    expect(renderer.getSnapshot().ghostCells).toEqual([
      { x: 3, y: 36 }, { x: 4, y: 37 }, { x: 3, y: 37 }, { x: 4, y: 38 },
    ]);
  });

  it('draws the DOM-anchored Next queue on the unmasked preview plane', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const arena = document.createElement('section');
    arena.dataset.testid = 'game-cluster';
    const host = document.createElement('div');
    const slot = document.createElement('div');
    slot.dataset.testid = 'next-slot';
    const staleSlot = document.createElement('div');
    staleSlot.dataset.testid = 'next-slot';
    document.body.append(staleSlot, arena);
    arena.append(host, slot);
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      x: 100, y: 40, left: 100, top: 40, right: 1100, bottom: 840, width: 1000, height: 800,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(staleSlot, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 80, bottom: 80, width: 80, height: 80,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(slot, 'getBoundingClientRect').mockReturnValue({
      x: 130, y: 100, left: 130, top: 100, right: 350, bottom: 260, width: 220, height: 160,
      toJSON: () => ({}),
    } as DOMRect);
    const preview = createGraphicsRecorder();
    const pieces = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      host,
      previewGraphics: preview.graphics,
      pieceGraphics: pieces.graphics,
    });
    const drawPreviews = vi.spyOn(internals, 'drawPreviewPieces');
    const state = dispatch(createInitialState(0x51a1f00d, 'marathon'), { type: 'start' }).state;

    try {
      internals.drawPreviews(state, { x: 400, y: 40, width: 200, height: 400, cell: 20, compact: false });
      expect(drawPreviews).toHaveBeenCalledTimes(1);
      expect(drawPreviews.mock.calls[0]?.[0]).toBe(preview.graphics);
      expect(drawPreviews.mock.calls[0]?.[0]).not.toBe(pieces.graphics);
      expect(drawPreviews.mock.calls[0]?.slice(2, 6)).toEqual([30, 60, 220, 160]);
      expect(internals.previewBounds).toEqual({ x: 30, y: 60, width: 220, height: 160 });
      expect(internals.previewLayerVisible).toBe(true);
    } finally {
      staleSlot.remove();
      arena.remove();
    }
  });

  it('keeps the current Next queue in its last valid rail bounds during a transient layout miss', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const arena = document.createElement('section');
    arena.dataset.testid = 'game-cluster';
    const host = document.createElement('div');
    const slot = document.createElement('div');
    slot.dataset.testid = 'next-slot';
    arena.append(host, slot);
    document.body.append(arena);
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      x: 100, y: 40, left: 100, top: 40, right: 1100, bottom: 840, width: 1000, height: 800,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(slot, 'getBoundingClientRect')
      .mockReturnValueOnce({
        x: 130, y: 100, left: 130, top: 100, right: 350, bottom: 260, width: 220, height: 160,
        toJSON: () => ({}),
      } as DOMRect)
      .mockReturnValue({
        x: -320, y: 100, left: -320, top: 100, right: -100, bottom: 260, width: 220, height: 160,
        toJSON: () => ({}),
      } as DOMRect);
    const preview = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      host,
      previewGraphics: preview.graphics,
      pieceGraphics: createGraphicsRecorder().graphics,
    });
    const drawPreviews = vi.spyOn(internals, 'drawPreviewPieces');
    const state = dispatch(createInitialState(0x51a1f00d, 'marathon'), { type: 'start' }).state;
    const layout = { x: 400, y: 40, width: 200, height: 400, cell: 20, compact: false };

    try {
      internals.drawPreviews(state, layout);
      expect(internals.previewBounds).toEqual({ x: 30, y: 60, width: 220, height: 160 });

      internals.drawPreviews(state, layout);

      expect(drawPreviews).toHaveBeenCalledTimes(2);
      expect(drawPreviews.mock.calls[1]?.slice(2, 6)).toEqual([30, 60, 220, 160]);
      expect(internals.previewBounds).toEqual({ x: 30, y: 60, width: 220, height: 160 });
      expect(internals.previewLayerVisible).toBe(true);
    } finally {
      arena.remove();
    }
  });

  it('draws the current Next queue at deterministic board-relative bounds when the first rail measurement misses the canvas', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const arena = document.createElement('section');
    arena.dataset.testid = 'game-cluster';
    const host = document.createElement('div');
    const slot = document.createElement('div');
    slot.dataset.testid = 'next-slot';
    arena.append(host, slot);
    document.body.append(arena);
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
      x: 100, y: 40, left: 100, top: 40, right: 1100, bottom: 840, width: 1000, height: 800,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(slot, 'getBoundingClientRect').mockReturnValue({
      x: -320, y: 100, left: -320, top: 100, right: -100, bottom: 260, width: 220, height: 160,
      toJSON: () => ({}),
    } as DOMRect);
    const preview = createGraphicsRecorder();
    Object.assign(internals as unknown as Record<string, unknown>, {
      host,
      previewGraphics: preview.graphics,
      pieceGraphics: createGraphicsRecorder().graphics,
    });
    const drawPreviews = vi.spyOn(internals, 'drawPreviewPieces');
    const state = dispatch(createInitialState(0x51a1f00d, 'marathon'), { type: 'start' }).state;

    try {
      internals.drawPreviews(state, { x: 400, y: 40, width: 200, height: 400, cell: 20, compact: false });

      expect(drawPreviews).toHaveBeenCalledTimes(1);
      expect(internals.previewBounds).not.toBeNull();
      expect(internals.previewLayerVisible).toBe(true);
    } finally {
      arena.remove();
    }
  });

  it('interpolates each Survival stone by id and snaps the reduced-motion endpoint', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const state = {
      mode: 'race',
      survivalDebris: [{ id: 7, x: 2, y: 20, height: 2 }],
    } as unknown as GameState;

    internals.advanceSurvivalDebrisPresentation(state, 16);
    expect(internals.survivalDebrisPresentation.get(7)).toEqual({ x: 2, y: 20 });

    internals.advanceSurvivalDebrisPresentation({
      ...state,
      survivalDebris: [{ id: 7, x: 2, y: 21, height: 2 }],
    }, 16);
    expect(internals.survivalDebrisPresentation.get(7)?.y).toBeGreaterThan(20);
    expect(internals.survivalDebrisPresentation.get(7)?.y).toBeLessThan(21);

    renderer.setOptions({ reducedMotion: true });
    internals.advanceSurvivalDebrisPresentation({
      ...state,
      survivalDebris: [{ id: 7, x: 2, y: 21, height: 2 }],
    }, 16);
    expect(internals.survivalDebrisPresentation.get(7)).toEqual({ x: 2, y: 21 });

    internals.advanceSurvivalDebrisPresentation({ ...state, survivalDebris: [] }, 16);
    expect(internals.survivalDebrisPresentation.size).toBe(0);
  });

  it('pulses only one warm source-column arrow and keeps a static reduced-motion endpoint', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const drawWarning = (height: 1 | 2, clock: number, reducedMotion = false) => {
      renderer.setOptions({ reducedMotion });
      (internals as unknown as { mutationClockMs: number }).mutationClockMs = clock;
      const recorder = createGraphicsRecorder();
      internals.drawSurvivalPressureEffects(
        recorder.graphics,
        {
          mode: 'race',
          survivalDebrisWarningColumns: [2],
          survivalDebrisWarningHeight: height,
        } as unknown as GameState,
        { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false },
      );
      return recorder.operations;
    };

    const trough = drawWarning(1, 600);
    const peak = drawWarning(2, 200);
    expect(trough).not.toEqual(peak);
    const segments = trough.filter((operation) => operation.kind === 'segment');
    expect(segments).toHaveLength(3);
    expect(segments.every((segment) => (segment.values[0] ?? 0) >= 44 && (segment.values[0] ?? 0) <= 56)).toBe(true);
    expect(trough.filter((operation) => operation.kind === 'rect')).toHaveLength(0);
    expect(trough.filter((operation) => operation.kind === 'fill')).toHaveLength(0);
    expect(trough.filter((operation) => operation.kind === 'stroke')).toHaveLength(1);
    const troughAlpha = (trough.find((operation) => operation.kind === 'stroke')?.options as { alpha?: number } | undefined)?.alpha ?? 0;
    const peakAlpha = (peak.find((operation) => operation.kind === 'stroke')?.options as { alpha?: number } | undefined)?.alpha ?? 0;
    expect(peakAlpha - troughAlpha).toBeGreaterThan(0.7);
    expect(trough.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(trough.filter((operation) => operation.kind === 'poly')).toHaveLength(0);

    const reducedFirst = drawWarning(1, 0, true);
    const reducedLater = drawWarning(2, 437, true);
    expect(reducedFirst).toEqual(reducedLater);
  });

  it('keeps a local bedrock boundary cue even when reduced motion removes the shift', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;

    internals.consumeEvents([{ type: 'bedrock-raised', count: 1, height: 4 }]);
    expect(internals.boardShift).toMatchObject({ direction: 'up', elapsed: 0, duration: 180 });
    expect(internals.survivalBedrockCue).toEqual({
      direction: 'up',
      height: 4,
      elapsed: 0,
      duration: 180,
    });
    internals.advanceEffects(180);
    expect(internals.survivalBedrockCue).toBeNull();

    renderer.setOptions({ reducedMotion: true });
    internals.consumeEvents([{ type: 'bedrock-lowered', count: 1, height: 3 }]);
    expect(internals.boardShift).toBeNull();
    expect(internals.survivalBedrockCue).toEqual({
      direction: 'down',
      height: 3,
      elapsed: 0,
      duration: 80,
    });
  });

  it('renders one static reduced-motion endpoint without resurrecting a consumed carrier frame', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const fills: unknown[] = [];
    const strokes: unknown[] = [];
    let carrierRimCalls = 0;
    const graphics = {
      clear: () => graphics,
      roundRect: () => graphics,
      circle: () => graphics,
      rect: () => graphics,
      poly: () => graphics,
      moveTo: () => graphics,
      lineTo: () => graphics,
      fill: (options: unknown) => {
        fills.push(options);
        return graphics;
      },
      stroke: (options: unknown) => {
        strokes.push(options);
        return graphics;
      },
    };
    (internals as unknown as { effectGraphics: typeof graphics; mutationGraphics: typeof graphics }).effectGraphics = graphics;
    (internals as unknown as { effectGraphics: typeof graphics; mutationGraphics: typeof graphics }).mutationGraphics = graphics;
    (internals as unknown as { drawMutationMaterialRim: () => void }).drawMutationMaterialRim = () => {
      carrierRimCalls += 1;
    };

    renderer.setOptions({ reducedMotion: true });
    internals.consumeEvents([{
      type: 'mutation-activated',
      item: 'freeze',
      durationTicks: 600,
      score: 0,
      rowsRemoved: 0,
      triggerCells: [{ x: 4, y: VISIBLE_START_ROW + 4 }],
    }]);
    internals.advanceEffects(16);

    expect(internals.mutationFlash).toMatchObject({ item: 'freeze', elapsed: 16, duration: 320 });
    internals.drawEffects(
      { phase: 'active', pendingClearRows: [] } as unknown as GameState,
      { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false },
    );
    expect(fills).toHaveLength(0);
    expect(strokes.length).toBeGreaterThan(0);
    expect(carrierRimCalls).toBe(0);

    internals.advanceEffects(304);
    expect(internals.mutationFlash).toBeNull();
  });

  it('exposes immutable renderer-owned FIFO, impact, and particle evidence without a landing trail', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const previousBoard = createBoard();
    internals.consumeEvents([
      {
        ...mutationEvent('bomb', [
          { x: 1, y: VISIBLE_START_ROW + 5 },
          { x: 7, y: VISIBLE_START_ROW + 5 },
        ]),
        score: 120,
      },
      {
        type: 'mutation-activated',
        item: 'freeze',
        durationTicks: 600,
        score: 0,
        rowsRemoved: 0,
        triggerCells: [{ x: 4, y: VISIBLE_START_ROW + 4 }],
      },
    ], undefined, previousBoard);

    const queued = renderer.getSnapshot();
    expect(queued.mutationActivation).toMatchObject({
      item: 'bomb',
      elapsedMs: 0,
      durationMs: 620,
      particlesEmitted: false,
      triggerColumns: [1, 7],
    });
    expect(queued.mutationActivation?.phases.find((phase) => phase.id === 'warning')).toMatchObject({
      active: true,
      complete: false,
    });
    expect(queued.mutationActivationQueueItems).toEqual(['freeze']);
    expect(queued.mutationActiveParticleCount).toBe(0);

    internals.advanceEffects(220);
    const impact = renderer.getSnapshot();
    expect(impact.mutationActivation).toMatchObject({
      item: 'bomb',
      elapsedMs: 220,
      particlesEmitted: true,
      triggerColumns: [1, 7],
    });
    expect(impact.mutationActivation?.phases.find((phase) => phase.id === 'impact')).toMatchObject({
      active: true,
      complete: false,
      progress: 0,
    });
    expect(impact.mutationActiveParticleCount).toBeGreaterThan(0);

    impact.mutationActivation!.triggerColumns.push(9);
    impact.mutationActivationQueueItems.push('bomb');
    expect(renderer.getSnapshot().mutationActivation?.triggerColumns).toEqual([1, 7]);
    expect(renderer.getSnapshot().mutationActivationQueueItems).toEqual(['freeze']);

    expect(renderer.getSnapshot().mutationCollapseTrail).toBeNull();

    internals.advanceEffects(500);
    expect(renderer.getSnapshot()).toMatchObject({
      mutationActivation: {
        item: 'freeze',
        elapsedMs: 0,
      },
      mutationActivationQueueItems: [],
    });
  });

  it('gives all four reduced-motion activations distinct static silhouettes and preserves 2× / 4×', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const signatures = new Map<MutationItem, string>();
    for (const item of MUTATION_ITEMS) {
      const recorder = createGraphicsRecorder();
      internals.drawReducedMutationEndpoint(
        recorder.graphics,
        item,
        100,
        120,
        20,
        item === 'multiplier' ? 4 : 2,
      );
      signatures.set(item, geometrySignature(recorder.operations));
    }

    expect(new Set(signatures.values()).size).toBe(4);
    const two = createGraphicsRecorder();
    const four = createGraphicsRecorder();
    internals.drawReducedMutationEndpoint(two.graphics, 'multiplier', 100, 120, 20, 2);
    internals.drawReducedMutationEndpoint(four.graphics, 'multiplier', 100, 120, 20, 4);
    expect(geometrySignature(two.operations)).not.toBe(geometrySignature(four.operations));
  });

  it('uses item-specific facets and sparse motifs without a central carrier plate', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const cells = [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 5 }];
    const signatures = new Set<string>();
    for (const item of MUTATION_ITEMS) {
      const recorder = createGraphicsRecorder();
      internals.drawMutationMaterialDetails(
        recorder.graphics,
        cells,
        item,
        1,
        'active',
        { originX: 0, originY: 0, unit: 20 },
      );
      signatures.add(geometrySignature(recorder.operations));
      expect(recorder.operations.some((operation) => operation.kind === 'roundRect'), item).toBe(false);
      if (item !== 'collapse') {
        expect(recorder.operations.some((operation) => operation.kind === 'circle'), item).toBe(false);
      } else {
        // At most two distributed wells, each made from three nested circles.
        expect(recorder.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(6);
      }
    }
    expect(signatures.size).toBe(4);
  });

  it('replaces the complete body material in every presentation role', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const bodyCalls: Array<{ item: MutationItem; role: MutationMaterialRole; material: PieceMaterial | undefined }> = [];
    let currentItem: MutationItem = 'freeze';
    let currentRole: MutationMaterialRole = 'active';
    internals.drawCellGroups = (_graphics, _cells, _type, _alpha, options) => {
      bodyCalls.push({
        item: currentItem,
        role: currentRole,
        material: (options as { material?: PieceMaterial }).material,
      });
    };
    internals.drawMutationMaterialDetails = () => undefined;

    for (const item of MUTATION_ITEMS) {
      for (const role of ['active', 'next', 'ghost', 'settled', 'clear'] as const) {
        currentItem = item;
        currentRole = role;
        internals.drawMutationPieceMaterial(
          createGraphicsRecorder().graphics,
          [{ x: 2, y: 3 }],
          'T',
          item,
          1,
          role,
          { originX: 0, originY: 0, unit: 20, ghost: role === 'ghost' },
        );
      }
    }

    expect(bodyCalls).toHaveLength(MUTATION_ITEMS.length * 5);
    for (const call of bodyCalls) {
      expect(call.material).toBe(MUTATION_MATERIALS[call.item]);
    }
  });

  it('routes settled, active, Ghost, and Next through the same whole-piece material path', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const calls: Array<{ item: MutationItem; role: MutationMaterialRole; cells: number }> = [];
    internals.drawMutationPieceMaterial = (_graphics, cells, _type, item, _alpha, role) => {
      calls.push({ item, role, cells: cells.length });
    };
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: createGraphicsRecorder().graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
      survivalEntryMaskGraphics: createGraphicsRecorder().graphics,
      pieceMaskGraphics: createGraphicsRecorder().graphics,
    });

    for (const item of MUTATION_ITEMS) {
      const board = createBoard();
      board[VISIBLE_START_ROW + 3]![2] = 'T';
      const locked = {
        ...createInitialState(0x51a1f00d, 'sprint'),
        board,
        mode: 'sprint',
        mutationCarriers: [{ id: 1, item, cells: [{ x: 2, y: VISIBLE_START_ROW + 3 }] }],
      } as GameState;
      internals.drawMutationCarrierMaterials(createGraphicsRecorder().graphics, locked, layout, 0);
      internals.drawPreviewPiece(createGraphicsRecorder().graphics, 'T', 100, 100, 20, item);

      const active = {
        ...createInitialState(0x51a1f00d, 'sprint'),
        status: 'playing',
        phase: 'active',
        active: { type: 'T', rotation: 0, x: 3, y: VISIBLE_START_ROW },
        board: createBoard(),
        mutationActiveCarrier: { id: 2, item, cells: [] },
        mutationCarriers: [],
      } as GameState;
      internals.drawPieces(active, layout);
    }

    for (const item of MUTATION_ITEMS) {
      expect(calls.filter((call) => call.item === item && call.role === 'settled')).toHaveLength(1);
      expect(calls.filter((call) => call.item === item && call.role === 'next' && call.cells === 4)).toHaveLength(1);
      expect(calls.filter((call) => call.item === item && call.role === 'active')).toHaveLength(1);
      expect(calls.filter((call) => call.item === item && call.role === 'ghost')).toHaveLength(1);
    }
  });

  it('activates Ice with exactly four local snowflakes', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    internals.consumeEvents([{
      type: 'mutation-activated',
      item: 'freeze',
      durationTicks: 600,
      score: 0,
      rowsRemoved: 0,
      triggerCells: [
        { x: 3, y: VISIBLE_START_ROW + 4 },
        { x: 4, y: VISIBLE_START_ROW + 4 },
      ],
    }]);

    internals.advanceEffects(60);
    const snowflakes = vi.spyOn(internals, 'drawMutationSnowflake');
    const bind = createGraphicsRecorder();
    internals.drawMutationActivationEffect(bind.graphics, internals.mutationFlash!, layout);
    expect(snowflakes).toHaveBeenCalledTimes(4);
    expect(bind.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(0);
    expect(bind.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(bind.operations.filter((operation) => operation.kind === 'segment').length).toBeGreaterThan(0);
    expect(hasBroadHorizontalGeometry(bind.operations, layout.width)).toBe(false);

    internals.advanceEffects(100);
    snowflakes.mockClear();
    const release = createGraphicsRecorder();
    internals.drawMutationActivationEffect(release.graphics, internals.mutationFlash!, layout);
    expect(snowflakes).toHaveBeenCalledTimes(4);
    expect(release.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(0);
    expect(release.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(release.operations.filter((operation) => operation.kind === 'segment').length).toBeGreaterThan(0);
    expect(hasBroadHorizontalGeometry(release.operations, layout.width)).toBe(false);

    const reduced = new TetrisRendererClass();
    reduced.setOptions({ reducedMotion: true });
    const reducedInternals = reduced as unknown as RendererInternals;
    reducedInternals.consumeEvents([{
      type: 'mutation-activated',
      item: 'freeze',
      durationTicks: 600,
      score: 0,
      rowsRemoved: 0,
      triggerCells: [
        { x: 3, y: VISIBLE_START_ROW + 4 },
        { x: 4, y: VISIBLE_START_ROW + 4 },
      ],
    }]);
    const reducedSnowflakes = vi.spyOn(reducedInternals, 'drawMutationSnowflake');
    const reducedStart = createGraphicsRecorder();
    reducedInternals.drawMutationActivationEffect(reducedStart.graphics, reducedInternals.mutationFlash!, layout);
    expect(reducedSnowflakes).toHaveBeenCalledTimes(3);
    reducedSnowflakes.mockClear();
    reducedInternals.mutationClockMs = 999;
    const reducedLater = createGraphicsRecorder();
    reducedInternals.drawMutationActivationEffect(reducedLater.graphics, reducedInternals.mutationFlash!, layout);
    expect(reducedSnowflakes).toHaveBeenCalledTimes(3);
    expect(geometrySignature(reducedLater.operations)).toBe(geometrySignature(reducedStart.operations));
    expect(reducedStart.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(0);
  });

  it('activates Supergravity with exactly five local gravity factors', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    internals.consumeEvents([{
      type: 'mutation-activated',
      item: 'collapse',
      durationTicks: 600,
      score: 0,
      rowsRemoved: 0,
      triggerCells: [
        { x: 1, y: VISIBLE_START_ROW + 4 },
        { x: 7, y: VISIBLE_START_ROW + 7 },
      ],
    }]);

    expect(internals.mutationFlash).toMatchObject({ triggerColumns: [1, 7] });
    const factors = vi.spyOn(internals, 'drawGravityFactorParticle');
    const recorder = createGraphicsRecorder();
    internals.drawMutationActivationEffect(
      recorder.graphics,
      internals.mutationFlash!,
      layout,
    );
    expect(factors).toHaveBeenCalledTimes(5);
    expect(recorder.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(5);
    expect(recorder.operations.filter((operation) => operation.kind === 'segment').length).toBeGreaterThan(0);
    expect(recorder.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(recorder.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(hasBroadHorizontalGeometry(recorder.operations, layout.width)).toBe(false);

    internals.advanceEffects(160);
    factors.mockClear();
    const release = createGraphicsRecorder();
    internals.drawMutationActivationEffect(release.graphics, internals.mutationFlash!, layout);
    expect(factors).toHaveBeenCalledTimes(5);
    expect(release.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(5);
    expect(release.operations.filter((operation) => operation.kind === 'segment').length).toBeGreaterThan(0);

    const reduced = new TetrisRendererClass();
    reduced.setOptions({ reducedMotion: true });
    const reducedInternals = reduced as unknown as RendererInternals;
    reducedInternals.consumeEvents([{
      type: 'mutation-activated',
      item: 'collapse',
      durationTicks: 600,
      score: 0,
      rowsRemoved: 0,
      triggerCells: [
        { x: 1, y: VISIBLE_START_ROW + 4 },
        { x: 7, y: VISIBLE_START_ROW + 7 },
      ],
    }]);
    const reducedFactors = vi.spyOn(reducedInternals, 'drawGravityFactorParticle');
    const reducedStart = createGraphicsRecorder();
    reducedInternals.drawMutationActivationEffect(reducedStart.graphics, reducedInternals.mutationFlash!, layout);
    expect(reducedFactors).toHaveBeenCalledTimes(3);
    reducedFactors.mockClear();
    reducedInternals.mutationClockMs = 999;
    const reducedLater = createGraphicsRecorder();
    reducedInternals.drawMutationActivationEffect(reducedLater.graphics, reducedInternals.mutationFlash!, layout);
    expect(reducedFactors).toHaveBeenCalledTimes(3);
    expect(geometrySignature(reducedLater.operations)).toBe(geometrySignature(reducedStart.operations));
    expect(reducedStart.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(3);
  });

  it('keeps Ice and Supergravity line-clear accents local to the consumed carrier cell', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;

    const freeze = createGraphicsRecorder();
    internals.drawMutationLineClearAccent(freeze.graphics, 'freeze', 40, 80, 14, .5, 20);
    expect(freeze.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(1);
    expect(freeze.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(2);
    expect(hasBroadHorizontalGeometry(freeze.operations, 200)).toBe(false);

    const collapse = createGraphicsRecorder();
    internals.drawMutationLineClearAccent(collapse.graphics, 'collapse', 40, 80, 14, .5, 20);
    expect(collapse.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(3);
    expect(collapse.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(collapse.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(0);
    expect(hasBroadHorizontalGeometry(collapse.operations, 200)).toBe(false);
  });

  it('attaches a clipped Supergravity trail to the falling piece without a board-wide field', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const cells = [{ x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 7 }];
    const atmosphere = createGraphicsRecorder();
    internals.drawActiveMutationAtmosphere(
      atmosphere.graphics,
      {
        mode: 'sprint',
        mutationFreezeTicks: 0,
        mutationCollapsePiecesRemaining: 1,
        mutationMultiplierTicks: 0,
        mutationMultiplierFactor: 2,
      } as unknown as GameState,
      layout,
    );
    expect(atmosphere.operations).toEqual([]);

    const recorder = createGraphicsRecorder();
    internals.drawSupergravityPieceTrail(recorder.graphics, cells, layout);
    expect(recorder.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(8);
    expect(recorder.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(0);
    expect(hasBroadHorizontalGeometry(recorder.operations, layout.width)).toBe(false);
    const localValues = recorder.operations
      .filter((operation) => operation.kind === 'roundRect' || operation.kind === 'segment')
      .flatMap((operation) => operation.values);
    expect(Math.min(...localValues)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...localValues)).toBeLessThanOrEqual(layout.height);

    const shifted = createGraphicsRecorder();
    internals.drawSupergravityPieceTrail(
      shifted.graphics,
      cells.map((cell) => ({ ...cell, y: cell.y + 1 })),
      layout,
    );
    expect(geometrySignature(shifted.operations)).not.toBe(geometrySignature(recorder.operations));
    const firstTop = recorder.operations.find((operation) => operation.kind === 'roundRect')?.values[1];
    const shiftedTop = shifted.operations.find((operation) => operation.kind === 'roundRect')?.values[1];
    expect((shiftedTop ?? 0) - (firstTop ?? 0)).toBeCloseTo(layout.cell, 6);

    const reduced = new TetrisRendererClass();
    reduced.setOptions({ reducedMotion: true });
    const reducedInternals = reduced as unknown as RendererInternals;
    const reducedFirst = createGraphicsRecorder();
    reducedInternals.drawSupergravityPieceTrail(reducedFirst.graphics, cells, layout);
    reducedInternals.mutationClockMs = 437;
    const reducedLater = createGraphicsRecorder();
    reducedInternals.drawSupergravityPieceTrail(reducedLater.graphics, cells, layout);
    expect(reducedFirst.operations).toEqual([]);
    expect(reducedLater.operations).toEqual([]);
  });

  it('never redraws a consumed material rim during an item activation', () => {
    for (const item of MUTATION_ITEMS) {
      const renderer = new TetrisRendererClass();
      const internals = renderer as unknown as RendererInternals;
      let carrierRimCalls = 0;
      (internals as unknown as { drawMutationMaterialRim: () => void }).drawMutationMaterialRim = () => {
        carrierRimCalls += 1;
      };
      internals.consumeEvents([mutationEvent(item, [{ x: 4, y: VISIBLE_START_ROW + 6 }])]);
      internals.drawMutationActivationEffect(
        createGraphicsRecorder().graphics,
        internals.mutationFlash!,
        { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false },
      );
      expect(carrierRimCalls, item).toBe(0);
    }
  });

  it('shows the Bomb range as an irregular floor field instead of a 3-by-10 box', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    internals.consumeEvents([mutationEvent('bomb', [{ x: 4, y: VISIBLE_START_ROW + 8 }])]);

    const warning = createGraphicsRecorder();
    internals.drawMutationActivationEffect(warning.graphics, internals.mutationFlash!, layout);
    const warningFields = warning.operations.filter((operation) => operation.kind === 'poly');
    expect(warningFields).toHaveLength(1);
    expect(warning.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    const warningDepths = new Set(warningFields[0]!.values.filter((_value, index) => index % 2 === 1));
    expect(warningDepths.size).toBeGreaterThan(5);

    internals.advanceEffects(220);
    const impact = createGraphicsRecorder();
    internals.drawMutationActivationEffect(impact.graphics, internals.mutationFlash!, layout);
    expect(impact.operations.filter((operation) => operation.kind === 'poly').length).toBeGreaterThanOrEqual(2);
    expect(impact.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
  });

  it('renders only real visible Bomb row runs and no hidden-only fallback explosion', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const disjoint = mutationEvent('bomb') as Extract<GameEvent, { type: 'mutation-activated'; item: 'bomb' }>;
    internals.consumeEvents([{ ...disjoint, blastRows: [29, 30, 31, 38, 39] }]);
    const visible = createGraphicsRecorder();
    internals.drawMutationActivationEffect(visible.graphics, internals.mutationFlash!, layout);
    expect(visible.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(2);

    const hiddenRenderer = new TetrisRendererClass();
    const hidden = hiddenRenderer as unknown as RendererInternals;
    hidden.consumeEvents([{ ...disjoint, blastRows: [2, 3, 4] }]);
    const hiddenFrame = createGraphicsRecorder();
    hidden.drawMutationActivationEffect(hiddenFrame.graphics, hidden.mutationFlash!, layout);
    expect(hiddenFrame.operations).toEqual([]);
    hidden.advanceEffects(160);
    const hiddenPulse = createGraphicsRecorder();
    hidden.drawMutationActivationEffect(hiddenPulse.graphics, hidden.mutationFlash!, layout);
    expect(hiddenPulse.operations).toEqual([]);
    hidden.advanceEffects(240);
    const hiddenShockwave = createGraphicsRecorder();
    hidden.drawMutationActivationEffect(hiddenShockwave.graphics, hidden.mutationFlash!, layout);
    expect(hiddenShockwave.operations).toEqual([]);

    const reducedRenderer = new TetrisRendererClass();
    reducedRenderer.setOptions({ reducedMotion: true });
    const reduced = reducedRenderer as unknown as RendererInternals;
    reduced.consumeEvents([{ ...disjoint, blastRows: [2, 3, 4] }]);
    const reducedFrame = createGraphicsRecorder();
    reduced.drawMutationActivationEffect(reducedFrame.graphics, reduced.mutationFlash!, layout);
    expect(reducedFrame.operations).toEqual([]);
  });

  it('starts at the exact clear row before propagating local explosions equally upward and downward', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const previousBoard = createBoard();
    previousBoard[VISIBLE_START_ROW + 5]!.fill('T');
    previousBoard[VISIBLE_START_ROW + 4]![2] = 'J';
    previousBoard[VISIBLE_START_ROW + 6]![7] = 'L';
    internals.consumeEvents([
      chainClearEvent([
        { x: 4, y: VISIBLE_START_ROW + 5 },
        { x: 4, y: VISIBLE_START_ROW + 6 },
      ], [VISIBLE_START_ROW + 5]),
    ], undefined, previousBoard);
    const flash = internals.mutationFlash!;
    expect(flash).toMatchObject({
      bombOutcome: 'chain-clear',
      blastRows: [24, 25, 26],
      chainTriggerRows: [VISIBLE_START_ROW + 5],
    });

    const origin = createGraphicsRecorder();
    flash.elapsed = 0;
    internals.drawMutationChainClear(origin.graphics, flash, layout);
    expect(origin.operations.some((operation) => operation.kind === 'roundRect')).toBe(true);
    expect(hasBroadHorizontalGeometry(origin.operations, layout.width)).toBe(false);

    const firstBeat = createGraphicsRecorder();
    flash.elapsed = 220;
    internals.drawMutationChainClear(firstBeat.graphics, flash, layout);
    const blastCenters = firstBeat.operations.filter((operation) => operation.kind === 'circle');
    expect(blastCenters).toHaveLength(6);
    expect(new Set(blastCenters.map((operation) => operation.values[1]))).toEqual(new Set([layout.cell * 5.5]));
    expect(hasBroadHorizontalGeometry(firstBeat.operations, layout.width)).toBe(false);
    expect(firstBeat.operations.filter((operation) => operation.kind === 'rect')).toHaveLength(0);
    expect(firstBeat.operations.filter((operation) => operation.kind === 'poly')).toHaveLength(3);

    const secondBeat = createGraphicsRecorder();
    flash.elapsed = 276;
    internals.drawMutationChainClear(secondBeat.graphics, flash, layout);
    const propagatedCenters = secondBeat.operations.filter((operation) => operation.kind === 'circle');
    expect(new Set(propagatedCenters.map((operation) => operation.values[1]))).toEqual(new Set([
      layout.cell * 4.5,
      layout.cell * 5.5,
      layout.cell * 6.5,
    ]));
    expect(hasBroadHorizontalGeometry(secondBeat.operations, layout.width)).toBe(false);
  });

  it('supports multiple exact clear-row sources without using carrier-crossing rows', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const previousBoard = createBoard();
    for (const row of [VISIBLE_START_ROW + 3, VISIBLE_START_ROW + 9]) previousBoard[row]![4] = 'T';
    internals.consumeEvents([chainClearEvent([
      { x: 4, y: VISIBLE_START_ROW + 3 },
      { x: 4, y: VISIBLE_START_ROW + 4 },
    ], [VISIBLE_START_ROW + 9, VISIBLE_START_ROW + 3])], undefined, previousBoard);
    const flash = internals.mutationFlash!;
    expect(flash.chainTriggerRows).toEqual([VISIBLE_START_ROW + 9, VISIBLE_START_ROW + 3]);

    flash.elapsed = 220;
    const first = createGraphicsRecorder();
    internals.drawMutationChainClear(first.graphics, flash, layout);
    expect(new Set(first.operations.filter((operation) => operation.kind === 'circle')
      .map((operation) => operation.values[1]))).toEqual(new Set([
      layout.cell * 3.5,
      layout.cell * 9.5,
    ]));
    expect(first.operations.some((operation) => (
      operation.kind === 'circle' && operation.values[1] === layout.cell * 4.5
    ))).toBe(false);
  });

  it('does not overlap the chain-clear reveal with the ordinary line-clear cue', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const row = BOARD_HEIGHT - 1;
    const state = {
      ...createInitialState(0x1a16_43a, 'sprint'),
      phase: 'line-clear',
      pendingClearRows: [row],
    } as GameState;

    internals.consumeEvents([{
      type: 'clear-started',
      rows: [row],
      mutationBombOutcome: 'chain-clear',
    }], state);

    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
  });

  it('keeps the trigger row stable before chain commit and layers the first Bomb last', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const row = BOARD_HEIGHT - 1;
    const board = createBoard();
    board[row]!.fill('I');
    const state = {
      ...createInitialState(0x1a16_43b, 'sprint'),
      board,
      phase: 'line-clear',
      phaseTicks: 11,
      pendingClearRows: [row],
    } as GameState;
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: createGraphicsRecorder().graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
      survivalEntryMaskGraphics: createGraphicsRecorder().graphics,
      pieceMaskGraphics: createGraphicsRecorder().graphics,
    });
    const groups = vi.spyOn(internals, 'drawCellGroups');
    internals.consumeEvents([{
      type: 'clear-started',
      rows: [row],
      mutationBombOutcome: 'chain-clear',
    }], state);
    internals.drawPieces(state, { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false });
    expect(groups.mock.calls.some((call) => call[1].length === 10 && call[3] === 1)).toBe(true);
    expect(internals.pendingBombClearOutcome).toBe('chain-clear');

    const order: string[] = [];
    internals.drawCellGroups = () => { order.push('board'); };
    internals.drawMutationPieceMaterial = () => { order.push('origin'); };
    internals.consumeEvents([chainClearEvent([{ x: 4, y: row }], [row])], undefined, board);
    internals.drawMutationChainClear(createGraphicsRecorder().graphics, internals.mutationFlash!, {
      x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false,
    });
    expect(order.at(-1)).toBe('origin');
  });

  it('clamps a hidden trigger to the nearest visible boundary without hidden delay', () => {
    const renderer = new TetrisRendererClass();
    renderer.setOptions({ reducedMotion: true });
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const previousBoard = createBoard();
    previousBoard[VISIBLE_START_ROW]![4] = 'T';
    internals.consumeEvents([chainClearEvent([{ x: 4, y: 3 }], [3])], undefined, previousBoard);
    const flash = internals.mutationFlash!;
    const firstVisibleBeat = createGraphicsRecorder();
    flash.elapsed = 50;
    internals.drawMutationChainClear(firstVisibleBeat.graphics, flash, layout);
    expect(new Set(firstVisibleBeat.operations.filter((operation) => operation.kind === 'circle')
      .map((operation) => operation.values[1]))).toEqual(new Set([layout.cell * .5]));
    expect(firstVisibleBeat.operations.some((operation) => operation.kind === 'rect')).toBe(false);
  });

  it('keeps future rows fragment-free and clears every chain primitive at completion', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const triggerRow = VISIBLE_START_ROW + 10;
    const previousBoard = createBoard();
    previousBoard[triggerRow]![1] = 'T';
    previousBoard[triggerRow + 2]![8] = 'L';
    internals.consumeEvents([chainClearEvent([{ x: 1, y: triggerRow }], [triggerRow])], undefined, previousBoard);
    const flash = internals.mutationFlash!;

    internals.advanceEffects(220);
    expect(internals.mutationParticles.every((particle) => !particle.active)).toBe(true);
    flash.elapsed = 220 + 56;
    const reached = createGraphicsRecorder();
    internals.drawMutationChainClear(reached.graphics, flash, layout);
    expect(reached.operations.some((operation) => (
      operation.kind === 'circle' && operation.values[0] === layout.cell * 8.5
    ))).toBe(false);
    flash.elapsed = flash.duration;
    const complete = createGraphicsRecorder();
    internals.drawCellGroups = () => {};
    internals.drawMutationPieceMaterial = () => {};
    internals.drawMutationChainClear(complete.graphics, flash, layout);
    expect(complete.operations).toEqual([]);
  });

  it('uses static directional reduced-motion blasts without particles, rings, or shake', () => {
    const renderer = new TetrisRendererClass();
    renderer.setOptions({ reducedMotion: true });
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const triggerRow = VISIBLE_START_ROW + 6;
    const previousBoard = createBoard();
    previousBoard[triggerRow]![4] = 'T';
    previousBoard[triggerRow - 1]![3] = 'J';
    previousBoard[triggerRow + 1]![5] = 'L';
    internals.consumeEvents([chainClearEvent([{ x: 4, y: triggerRow }], [triggerRow])], undefined, previousBoard);
    const flash = internals.mutationFlash!;
    internals.drawCellGroups = () => {};

    flash.elapsed = 50;
    const source = createGraphicsRecorder();
    internals.drawMutationChainClear(source.graphics, flash, layout);
    expect(source.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(1);
    expect(source.operations.some((operation) => operation.kind === 'stroke')).toBe(false);
    expect(source.operations.some((operation) => operation.kind === 'segment')).toBe(false);

    flash.elapsed = 70;
    const neighbours = createGraphicsRecorder();
    internals.drawMutationChainClear(neighbours.graphics, flash, layout);
    expect(new Set(neighbours.operations.filter((operation) => operation.kind === 'circle')
      .map((operation) => operation.values[1]))).toEqual(new Set([
      layout.cell * 5.5,
      layout.cell * 6.5,
      layout.cell * 7.5,
    ]));
    expect(neighbours.operations.some((operation) => operation.kind === 'stroke')).toBe(false);
    expect(internals.mutationParticles.every((particle) => !particle.active)).toBe(true);
    internals.impact = 0;
    internals.applyMutationCameraShake(layout);
    expect(internals.impact).toBe(0);
  });

  it('anchors multiplier feedback to Core trigger cells and preserves the 4× escalation cue', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const triggerCells = Object.freeze([{ x: 3, y: VISIBLE_START_ROW + 6 }]);

    internals.consumeEvents([{
      type: 'mutation-activated',
      item: 'multiplier',
      durationTicks: 1_200,
      score: 0,
      rowsRemoved: 0,
      triggerCells,
      multiplierFactor: 4,
    }]);

    expect(internals.mutationFlash).toMatchObject({
      item: 'multiplier',
      triggerCells,
      multiplierFactor: 4,
      duration: 320,
    });
  });

  it('uses independent upper-field score glints without discs, stems, or a fixed badge', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    const base = {
      mode: 'sprint',
      mutationFreezeTicks: 0,
      mutationCollapsePiecesRemaining: 0,
      mutationMultiplierTicks: 60,
    } as unknown as GameState;

    const twoField = createGraphicsRecorder();
    const fourField = createGraphicsRecorder();
    internals.drawActiveMutationAtmosphere(
      twoField.graphics,
      { ...base, mutationMultiplierFactor: 2 },
      layout,
    );
    internals.drawActiveMutationAtmosphere(
      fourField.graphics,
      { ...base, mutationMultiplierFactor: 4 },
      layout,
    );
    expect(geometrySignature(twoField.operations)).not.toBe(geometrySignature(fourField.operations));
    expect(twoField.operations.filter((operation) => operation.kind === 'rect')).toHaveLength(0);
    expect(twoField.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(fourField.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(twoField.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(twoField.operations.filter((operation) => operation.kind === 'stroke')).toHaveLength(0);
    expect(fourField.operations.filter((operation) => operation.kind === 'stroke')).toHaveLength(0);
    const twoSegments = twoField.operations.filter((operation) => operation.kind === 'segment');
    const fourSegments = fourField.operations.filter((operation) => operation.kind === 'segment');
    expect(twoSegments).toHaveLength(7 * 24);
    expect(fourSegments).toHaveLength(10 * 24);
    expect(twoField.operations.filter((operation) => operation.kind === 'fill')).toHaveLength(7 * 4);
    expect(fourField.operations.filter((operation) => operation.kind === 'fill')).toHaveLength(10 * 4);

    internals.mutationClockMs = 437;
    const laterField = createGraphicsRecorder();
    internals.drawActiveMutationAtmosphere(
      laterField.graphics,
      { ...base, mutationMultiplierFactor: 2 },
      layout,
    );
    expect(geometrySignature(laterField.operations)).not.toBe(geometrySignature(twoField.operations));
    expect(laterField.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(laterField.operations.filter((operation) => operation.kind === 'stroke')).toHaveLength(0);

    const twoGlyph = createGraphicsRecorder();
    const fourGlyph = createGraphicsRecorder();
    internals.drawMutationMultiplierValue(twoGlyph.graphics, 100, 120, 10, 2, 0xffffff, 1);
    internals.drawMutationMultiplierValue(fourGlyph.graphics, 100, 120, 10, 4, 0xffffff, 1);
    expect(geometrySignature(twoGlyph.operations)).not.toBe(geometrySignature(fourGlyph.operations));
  });

  it('keeps Ice and Supergravity vector-local instead of filtering the whole board', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const frost = { enabled: false, noise: 0, seed: 0 };
    const collapse = { enabled: false, scale: { x: 0, y: 0 } };
    const map = {
      position: { set: () => undefined },
      width: 0,
      height: 0,
    };
    const fields = new Map([
      ['freeze', { item: 'freeze' as const, stage: 'active' as const, elapsed: 0 }],
      ['collapse', { item: 'collapse' as const, stage: 'active' as const, elapsed: 0 }],
    ]);
    (internals as unknown as { frostFilter: typeof frost; collapseFilter: typeof collapse; collapseDisplacementMap: typeof map; mutationFields: typeof fields }).frostFilter = frost;
    (internals as unknown as { frostFilter: typeof frost; collapseFilter: typeof collapse; collapseDisplacementMap: typeof map; mutationFields: typeof fields }).collapseFilter = collapse;
    (internals as unknown as { frostFilter: typeof frost; collapseFilter: typeof collapse; collapseDisplacementMap: typeof map; mutationFields: typeof fields }).collapseDisplacementMap = map;
    (internals as unknown as { frostFilter: typeof frost; collapseFilter: typeof collapse; collapseDisplacementMap: typeof map; mutationFields: typeof fields }).mutationFields = fields;

    internals.syncMutationFilters(
      { mode: 'sprint' } as GameState,
      { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false },
    );

    expect(frost).toMatchObject({ enabled: false, noise: 0 });
    expect(collapse.enabled).toBe(false);
    expect(collapse.scale.x).toBe(0);
    expect(collapse.scale.y).toBe(0);
  });

  it('renders Ice as one long smooth upper gradient without a horizontal boundary', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 10, y: 20, width: 200, height: 400, cell: 20, compact: false };
    const recorder = createGraphicsRecorder();
    internals.drawActiveMutationAtmosphere(
      recorder.graphics,
      {
        mode: 'sprint',
        mutationFreezeTicks: 600,
        mutationCollapsePiecesRemaining: 0,
        mutationMultiplierTicks: 0,
        mutationMultiplierFactor: 1,
      } as unknown as GameState,
      layout,
    );

    const field = recorder.operations.filter((operation) => operation.kind === 'rect');
    expect(field).toHaveLength(1);
    expect(field[0]!.values[1]).toBeGreaterThanOrEqual(layout.y);
    expect(field[0]!.values[1]! + field[0]!.values[3]!).toBeLessThanOrEqual(layout.y + layout.height * .64);
    const gradientFill = recorder.operations.find((operation) => (
      operation.kind === 'fill'
      && typeof operation.options === 'object'
      && operation.options !== null
      && 'fill' in operation.options
    ))?.options as { fill?: { colorStops?: readonly unknown[] }; alpha?: number } | undefined;
    expect(gradientFill?.fill?.colorStops).toHaveLength(4);
    expect(gradientFill?.alpha).toBeGreaterThan(0);
    expect(recorder.operations.some((operation) => (
      operation.kind === 'segment'
      && Math.abs(operation.values[3]! - operation.values[1]!) < 0.001
      && Math.abs(operation.values[2]! - operation.values[0]!) >= layout.width * .2
    ))).toBe(false);
    expect(recorder.operations.some((operation) => (
      operation.kind === 'roundRect'
      && operation.values[3]! >= layout.height * 0.5
    ))).toBe(false);
  });

  it('uses crystalline facets across a connected Ice body without a central charm', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const recorder = createGraphicsRecorder();

    internals.drawMutationMaterialDetails(
      recorder.graphics,
      [{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 6 }, { x: 4, y: 6 }],
      'freeze',
      1,
      'active',
      { originX: 0, originY: 0, unit: 20 },
    );

    expect(recorder.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(0);
    expect(recorder.operations.filter((operation) => operation.kind === 'fill')).toHaveLength(8);
    expect(recorder.operations.filter((operation) => operation.kind === 'circle')).toHaveLength(0);
    expect(recorder.operations.filter((operation) => operation.kind === 'segment').length).toBeGreaterThan(16);
  });

  it('keeps Ice and Multiplier visible while reduced motion omits Supergravity trails', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const fills: Array<{ color?: number }> = [];
    const strokes: Array<{ color?: number }> = [];
    const graphics = {
      clear: () => graphics,
      roundRect: () => graphics,
      circle: () => graphics,
      rect: () => graphics,
      poly: () => graphics,
      moveTo: () => graphics,
      lineTo: () => graphics,
      fill: (options: { color?: number }) => {
        fills.push(options);
        return graphics;
      },
      stroke: (options: { color?: number }) => {
        strokes.push(options);
        return graphics;
      },
    };
    (internals as unknown as { effectGraphics: typeof graphics; mutationGraphics: typeof graphics }).effectGraphics = graphics;
    (internals as unknown as { effectGraphics: typeof graphics; mutationGraphics: typeof graphics }).mutationGraphics = graphics;
    renderer.setOptions({ reducedMotion: true });

    const base = { mode: 'sprint', elapsedTicks: 0, phase: 'active', pendingClearRows: [] } as unknown as GameState;
    const layout = { x: 0, y: 0, width: 200, height: 400, cell: 20, compact: false };
    internals.drawEffects({ ...base, mutationFreezeTicks: 1 }, layout);
    expect(fills.some((entry) => entry.color === MUTATION_VFX_TOKENS.freeze.palette.highlight)).toBe(true);

    fills.length = 0;
    strokes.length = 0;
    const reducedTrail = createGraphicsRecorder();
    internals.drawSupergravityPieceTrail(reducedTrail.graphics, [{ x: 4, y: 6 }], layout);
    expect(reducedTrail.operations).toEqual([]);

    fills.length = 0;
    internals.drawEffects({ ...base, mutationMultiplierTicks: 1 }, layout);
    expect(fills.some((entry) => entry.color === MUTATION_VFX_TOKENS.multiplier.palette.primary)).toBe(true);
  });

  it('uses the generic lock pulse and leaves no Supergravity landing residue', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const previousBoard = createBoard();
    previousBoard[BOARD_HEIGHT - 1]![0] = 'T';
    const finishedTimerState = {
      ...createInitialState(0x51a1f00d, 'sprint'),
      mutationCollapsePiecesRemaining: 0,
      mutationCollapseLandingLatched: false,
    };

    internals.consumeEvents([{
      type: 'piece-locked',
      piece: 'I',
      cells: [{ x: 0, y: BOARD_HEIGHT - 4 }],
    }], finishedTimerState, previousBoard, true);

    expect(internals.lockPulse).toMatchObject({ piece: 'I' });
    expect(renderer.getSnapshot().mutationCollapseTrail).toBeNull();
  });

  it('renders the shared bounded continuous grammar for every clear count', () => {
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I', 'O', 'T'];
    const signatures: string[] = [];

    for (const count of [1, 2, 3, 4] as const) {
      const renderer = new TetrisRendererClass();
      const internals = renderer as unknown as RendererInternals;
      const board = createBoard();
      const rows = Array.from({ length: count }, (_, index) => BOARD_HEIGHT - 1 - index);
      for (const row of rows) {
        for (let column = 0; column < pieces.length; column += 1) {
          board[row]![column] = pieces[column]!;
        }
      }
      const state = {
        ...createInitialState(0x1a16_3ff + count, 'marathon'),
        board,
        status: 'playing',
        phase: 'line-clear',
        phaseTicks: 0,
        pendingClearRows: rows,
      } as GameState;
      const recorder = createGraphicsRecorder();
      (internals as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = recorder.graphics;

      internals.consumeEvents([{ type: 'clear-started', rows }], state);
      const cue = internals.ordinaryMultiLineClearCues[0]!;
      expect(cue).toMatchObject({ count, duration: CLASSIC_LINE_CLEAR_SEQUENCE_MS });
      for (const elapsedMs of STUDIO_LINE_CLEAR_OFFSETS_MS[count]) {
        cue.elapsed = elapsedMs;
        internals.drawEffects(state, layout);
      }

      const faceBlooms = recorder.operations.filter((operation) => (
        operation.kind === 'roundRect' && operation.values[2] === operation.values[3]
      ));
      expect(faceBlooms.length).toBeGreaterThanOrEqual(count);
      expect(faceBlooms.every((operation) => {
        const [x, y, width, height] = operation.values;
        return width === height
          && width! < layout.cell
          && x! >= layout.x
          && x! + width! <= layout.x + layout.width
          && y! >= layout.y
          && y! + height! <= layout.y + layout.height;
      })).toBe(true);
      expect(hasBroadHorizontalGeometry(recorder.operations, layout.width)).toBe(false);
      signatures.push(geometrySignature(recorder.operations));
    }

    expect(new Set(signatures).size).toBe(4);
  });

  it('flashes then erases multi-line cells centre-out without moving Core or hiding fixed materials', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const board = createBoard();
    const orderedRows = [BOARD_HEIGHT - 4, BOARD_HEIGHT - 3, BOARD_HEIGHT - 2, BOARD_HEIGHT - 1];
    for (const row of orderedRows) board[row]!.fill('I');
    board[orderedRows[0]!]![0] = ANCHOR_CELL;
    board[orderedRows[0]!]![1] = BEDROCK_CELL;
    board[BOARD_HEIGHT - 5]![4] = 'T';
    const state = {
      ...createInitialState(0x1a16_400, 'marathon'),
      board,
      active: null,
      status: 'playing',
      phase: 'line-clear',
      pendingClearRows: [...orderedRows].reverse(),
    } as GameState;
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: createGraphicsRecorder().graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
      survivalEntryMaskGraphics: createGraphicsRecorder().graphics,
      pieceMaskGraphics: createGraphicsRecorder().graphics,
    });
    const app = { screen: { width: 280, height: 480 }, renderer: { resolution: 1 } };
    internals.consumeEvents([{ type: 'clear-started', rows: state.pendingClearRows }], state);
    const cue = internals.ordinaryMultiLineClearCues[0]!;
    expect(cue).toMatchObject({
      count: 4,
      orderedRows,
      duration: CLASSIC_LINE_CLEAR_SEQUENCE_MS,
      committed: false,
    });
    expect(cue.cells).toHaveLength(38);
    expect(cue.cells.some(({ material }) => material === ANCHOR_CELL || material === BEDROCK_CELL)).toBe(false);

    const drawCells = vi.spyOn(internals, 'drawCellGroups');
    cue.elapsed = 30;
    internals.drawPieces(state, layout);
    internals.updateSnapshot(state, layout, app);
    expect(renderer.getSnapshot()).toMatchObject({
      visibleLockedCells: 41,
      ordinaryLineClear: {
        count: 4,
        orderedRows,
        releaseTicks: [0, 4, 7, 11],
        releasedRows: orderedRows.slice(0, 1),
      },
      ordinaryMultiLineClearCues: [{
        elapsedMs: 30,
        durationMs: CLASSIC_LINE_CLEAR_SEQUENCE_MS,
        visibleCellCount: 38,
      }],
    });
    const centreTransition = drawCells.mock.calls.find((call) => (
      (call[1] as readonly Cell[]).some((cell) => (
        cell.x === 4 && cell.y === orderedRows[0]! - VISIBLE_START_ROW
      ))
      && typeof call[3] === 'number'
      && call[3] > 0
      && call[3] < 1
    ));
    expect(centreTransition).toBeDefined();
    expect((centreTransition?.[4] as { scale?: number }).scale).toBeLessThan(1);

    drawCells.mockClear();
    cue.elapsed = 60;
    internals.drawPieces(state, layout);
    internals.updateSnapshot(state, layout, app);
    expect(renderer.getSnapshot()).toMatchObject({
      visibleLockedCells: 39,
      ordinaryMultiLineClearCues: [{ visibleCellCount: 36 }],
    });
    expect(board[orderedRows[0]!]![4]).toBe('I');

    const oneLineBoard = createBoard();
    oneLineBoard[BOARD_HEIGHT - 1]!.fill('I');
    const oneLineRenderer = new TetrisRendererClass();
    const oneLineInternals = oneLineRenderer as unknown as RendererInternals;
    Object.assign(oneLineInternals as unknown as Record<string, unknown>, {
      pieceGraphics: createGraphicsRecorder().graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
      survivalEntryMaskGraphics: createGraphicsRecorder().graphics,
      pieceMaskGraphics: createGraphicsRecorder().graphics,
    });
    const oneLine = {
      ...state,
      board: oneLineBoard,
      phaseTicks: 9,
      pendingClearRows: [BOARD_HEIGHT - 1],
    } as GameState;
    oneLineInternals.consumeEvents([{
      type: 'clear-started',
      rows: oneLine.pendingClearRows,
    }], oneLine);
    const oneLineCue = oneLineInternals.ordinaryMultiLineClearCues[0]!;
    oneLineCue.elapsed = 150;
    oneLineInternals.drawPieces(oneLine, layout);
    oneLineInternals.updateSnapshot(oneLine, layout, app);
    expect(oneLineRenderer.getSnapshot()).toMatchObject({
      visibleLockedCells: 8,
      ordinaryLineClear: { count: 1, releasedRows: [BOARD_HEIGHT - 1] },
      ordinaryMultiLineClearCues: [{
        count: 1,
        durationMs: CLASSIC_LINE_CLEAR_SEQUENCE_MS,
        visibleCellCount: 8,
      }],
    });
  });

  it('keeps Endgame markers and Mutation materials until their matching cells erase', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const top = BOARD_HEIGHT - 2;
    const bottom = BOARD_HEIGHT - 1;
    const board = createBoard();
    board[top]![4] = 'T';
    board[bottom]![2] = 'T';
    const endgame = {
      ...createInitialState(0x1a16_401, 'endgame'),
      board,
      status: 'playing',
      phase: 'line-clear',
      phaseTicks: 0,
      pendingClearRows: [bottom, top],
      endgameTargetCells: [{ x: 4, y: top }, { x: 2, y: bottom }],
    } as GameState;
    const markers = createGraphicsRecorder();
    internals.consumeEvents([{ type: 'clear-started', rows: endgame.pendingClearRows }], endgame);
    const endgameCue = internals.ordinaryMultiLineClearCues[0]!;

    internals.drawEndgameTargetMarkers(markers.graphics, endgame, layout, 0);

    expect(markers.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(4);
    endgameCue.elapsed = 80;
    const fadingMarkers = createGraphicsRecorder();
    internals.drawEndgameTargetMarkers(fadingMarkers.graphics, endgame, layout, 0);
    expect(fadingMarkers.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(4);
    const fadingMarkerAlpha = (fadingMarkers.operations.find((operation) => (
      operation.kind === 'stroke'
    ))?.options as { alpha?: number } | undefined)?.alpha;
    expect(fadingMarkerAlpha).toBeGreaterThan(0);
    expect(fadingMarkerAlpha).toBeLessThan(0.76);
    endgameCue.elapsed = 210;
    const laterMarkers = createGraphicsRecorder();
    internals.drawEndgameTargetMarkers(laterMarkers.graphics, endgame, layout, 0);
    expect(laterMarkers.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(2);
    endgameCue.elapsed = LINE_CLEAR_CORE_COMMIT_MS;
    internals.consumeEvents([{
      type: 'lines-cleared',
      rows: endgame.pendingClearRows,
      count: 2,
      score: 200,
    }], { ...endgame, phase: 'active', pendingClearRows: [] });
    const committedMarkers = createGraphicsRecorder();
    (internals as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = committedMarkers.graphics;
    internals.drawEffects({ ...endgame, phase: 'active', pendingClearRows: [] }, layout);
    const committedTargetStroke = committedMarkers.operations.find((operation) => (
      operation.kind === 'stroke'
      && (operation.options as { color?: number } | undefined)?.color === COLORS.target
    ));
    expect((committedTargetStroke?.options as { alpha?: number } | undefined)?.alpha).toBeGreaterThan(0);

    const mutationRenderer = new TetrisRendererClass();
    const mutationInternals = mutationRenderer as unknown as RendererInternals;
    const mutation = {
      ...createInitialState(0x1a16_402, 'sprint'),
      board,
      status: 'playing',
      phase: 'line-clear',
      phaseTicks: 0,
      pendingClearRows: [bottom, top],
      mutationCarriers: [{
        id: 1,
        item: 'freeze',
        cells: [{ x: 4, y: top }, { x: 2, y: bottom }],
      }],
    } as GameState;
    mutationInternals.consumeEvents([{ type: 'clear-started', rows: mutation.pendingClearRows }], mutation);
    const mutationCue = mutationInternals.ordinaryMultiLineClearCues[0]!;
    const drawMaterial = vi.spyOn(mutationInternals, 'drawMutationPieceMaterial').mockImplementation(() => undefined);

    mutationInternals.drawMutationCarrierMaterials(markers.graphics, mutation, layout, 0);

    expect(drawMaterial.mock.calls.map((call) => call[1]).sort((first, second) => (
      (first[0]?.y ?? 0) - (second[0]?.y ?? 0)
    ))).toEqual([
      [{ x: 4, y: top - VISIBLE_START_ROW }],
      [{ x: 2, y: bottom - VISIBLE_START_ROW }],
    ]);
    expect(drawMaterial.mock.calls.every((call) => call[3] === 'freeze')).toBe(true);
    expect(drawMaterial.mock.calls.every((call) => call[5] === 'settled' || call[5] === 'clear')).toBe(true);
    drawMaterial.mockClear();
    mutationCue.elapsed = 60;
    mutationInternals.drawMutationCarrierMaterials(markers.graphics, mutation, layout, 0);
    const fadingMaterial = drawMaterial.mock.calls.find((call) => (
      (call[1] as readonly Cell[]).some((cell) => cell.x === 4)
    ));
    expect(fadingMaterial?.[4]).toBeGreaterThan(0);
    expect(fadingMaterial?.[4]).toBeLessThan(1);
    expect(fadingMaterial?.[5]).toBe('clear');
    drawMaterial.mockClear();
    mutationCue.elapsed = 100;
    mutationInternals.drawMutationCarrierMaterials(markers.graphics, mutation, layout, 0);

    expect(drawMaterial.mock.calls[0]?.[1]).toEqual([{ x: 2, y: bottom - VISIBLE_START_ROW }]);
  });

  it('continues every captured Mutation companion through the Core commit', () => {
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const top = BOARD_HEIGHT - 2;
    const bottom = BOARD_HEIGHT - 1;
    for (const item of MUTATION_ITEMS) {
      const renderer = new TetrisRendererClass();
      const internals = renderer as unknown as RendererInternals;
      const board = createBoard();
      board[top]![4] = 'T';
      board[bottom]![2] = 'T';
      const state = {
        ...createInitialState(0x1a16_410 + MUTATION_ITEMS.indexOf(item), 'sprint'),
        board,
        active: null,
        status: 'playing',
        phase: 'line-clear',
        pendingClearRows: [bottom, top],
        mutationCarriers: [{ id: 1, item, cells: [{ x: 4, y: top }, { x: 2, y: bottom }] }],
      } as GameState;
      internals.consumeEvents([{ type: 'clear-started', rows: state.pendingClearRows }], state);
      const cue = internals.ordinaryMultiLineClearCues[0]!;
      cue.elapsed = LINE_CLEAR_CORE_COMMIT_MS;
      internals.consumeEvents([{
        type: 'lines-cleared',
        rows: state.pendingClearRows,
        count: 2,
        score: 200,
      }], { ...state, phase: 'active', pendingClearRows: [], mutationCarriers: [] });
      const body = vi.spyOn(internals, 'drawCellGroups');
      const materialDraw = vi.spyOn(internals, 'drawMutationPieceMaterial');

      internals.drawCommittedOrdinaryMultiLineClearBodies(createGraphicsRecorder().graphics, layout);

      expect(body.mock.calls.length).toBeGreaterThan(0);
      const materialCall = materialDraw.mock.calls.find((call) => call[3] === item);
      expect(materialCall?.[4]).toBeGreaterThan(0);
      expect(materialCall?.[5]).toBe('clear');
      const bodyCall = body.mock.calls.find((call) => (
        (call[4] as { material?: PieceMaterial }).material === MUTATION_MATERIALS[item]
      ));
      expect(bodyCall).toBeDefined();
    }
  });

  it('excludes anchors and bedrock from ordinary clear faces while retaining live materials', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const board = createBoard();
    const row = BOARD_HEIGHT - 1;
    board[row]![0] = ANCHOR_CELL;
    board[row]![1] = BEDROCK_CELL;
    board[row]![2] = SURVIVAL_STONE_CELL;
    for (let column = 3; column < BOARD_WIDTH; column += 1) board[row]![column] = 'T';
    const state = {
      ...createInitialState(0x1a16_4ff, 'race'),
      board,
      status: 'playing',
      phase: 'line-clear',
      phaseTicks: 4,
      pendingClearRows: [row],
    } as GameState;
    const recorder = createGraphicsRecorder();
    (internals as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = recorder.graphics;

    internals.consumeEvents([{ type: 'clear-started', rows: state.pendingClearRows }], state);
    internals.drawEffects(state, layout);

    expect(recorder.operations.filter((operation) => (
      operation.kind === 'roundRect' && operation.values[2] === operation.values[3]
    ))).toHaveLength(8);
    expect(hasBroadHorizontalGeometry(recorder.operations, layout.width)).toBe(false);
  });

  it('continues the accepted 300 ms material track for one line across Core commit', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const row = BOARD_HEIGHT - 1;
    const board = createBoard();
    board[row]!.fill('I');
    const state = {
      ...createInitialState(0x1a16_500, 'marathon'),
      board,
      active: null,
      status: 'playing',
      phase: 'line-clear',
      pendingClearRows: [row],
      endgameTargetCells: [{ x: 0, y: row }],
      mutationCarriers: [{ id: 1, item: 'freeze', cells: [{ x: 0, y: row }] }],
    } as GameState;
    Object.assign(internals as unknown as Record<string, unknown>, {
      pieceGraphics: createGraphicsRecorder().graphics,
      survivalEntryGraphics: createGraphicsRecorder().graphics,
      survivalEntryMaskGraphics: createGraphicsRecorder().graphics,
      pieceMaskGraphics: createGraphicsRecorder().graphics,
    });

    internals.consumeEvents([{ type: 'clear-started', rows: [row] }], state);
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(1);
    internals.advanceEffects(0);
    const cue = internals.ordinaryMultiLineClearCues[0]!;
    expect(cue).toMatchObject({
      count: 1,
      orderedRows: [row],
      duration: CLASSIC_LINE_CLEAR_SEQUENCE_MS,
      committed: false,
    });
    expect(cue.cells).toHaveLength(10);
    expect(cue.cells.find(({ cell }) => cell.x === 0)?.endgameTarget).toBe(true);
    expect(cue.cells.find(({ cell }) => cell.x === 0)?.mutationItem).toBe('freeze');

    cue.elapsed = LINE_CLEAR_CORE_COMMIT_MS - 0.1;
    const preCommitDraw = vi.spyOn(internals, 'drawCellGroups').mockImplementation(() => undefined);
    internals.drawPieces(state, layout);
    const preCommitPair = preCommitDraw.mock.calls.find((call) => (
      (call[1] as readonly Cell[]).some((cell) => cell.x === 2 && cell.y === row - VISIBLE_START_ROW)
      && typeof call[3] === 'number'
      && call[3] > 0
      && call[3] < 1
    ));
    expect(preCommitPair).toBeDefined();
    const preCommitAlpha = preCommitPair?.[3] as number;
    preCommitDraw.mockRestore();

    internals.consumeEvents([{
      type: 'lines-cleared',
      rows: [row],
      count: 1,
      score: 40,
    }], { ...state, phase: 'active', pendingClearRows: [] });
    expect(internals.ordinaryMultiLineClearCues[0]).toBe(cue);
    expect(cue).toMatchObject({
      elapsed: LINE_CLEAR_CORE_COMMIT_MS - 0.1,
      committed: true,
    });

    cue.elapsed = LINE_CLEAR_CORE_COMMIT_MS;
    const commitDraw = vi.spyOn(internals, 'drawCellGroups').mockImplementation(() => undefined);
    internals.drawCommittedOrdinaryMultiLineClearBodies(createGraphicsRecorder().graphics, layout);
    const committedPair = commitDraw.mock.calls.find((call) => (
      (call[1] as readonly Cell[]).some((cell) => cell.x === 2 && cell.y === row - VISIBLE_START_ROW)
    ));
    expect(committedPair).toBeDefined();
    expect(Math.abs((committedPair?.[3] as number) - preCommitAlpha)).toBeLessThan(0.02);
    commitDraw.mockRestore();

    cue.elapsed = 250;
    const tailDraw = vi.spyOn(internals, 'drawCellGroups').mockImplementation(() => undefined);
    const tailMaterial = vi.spyOn(internals, 'drawMutationPieceMaterial');
    internals.drawCommittedOrdinaryMultiLineClearBodies(createGraphicsRecorder().graphics, layout);
    expect(tailDraw.mock.calls.some((call) => (
      (call[1] as readonly Cell[]).some((cell) => cell.x === 0 && cell.y === row - VISIBLE_START_ROW)
      && typeof call[3] === 'number'
      && call[3] > 0
      && call[3] < 1
      && (call[4] as { material?: PieceMaterial }).material === MUTATION_MATERIALS.freeze
    ))).toBe(true);
    const tailMaterialCall = tailMaterial.mock.calls.find((call) => call[3] === 'freeze');
    expect(tailMaterialCall?.[4]).toBeGreaterThan(0);
    expect(tailMaterialCall?.[5]).toBe('clear');
    tailDraw.mockRestore();
    tailMaterial.mockRestore();

    const tailFaces = createGraphicsRecorder();
    (internals as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = tailFaces.graphics;
    internals.drawEffects({
      ...state,
      phase: 'active',
      pendingClearRows: [],
      mutationCarriers: [],
      endgameTargetCells: [],
    }, layout);
    expect(tailFaces.operations.some((operation) => (
      operation.kind === 'stroke'
      && (operation.options as { color?: number } | undefined)?.color === COLORS.target
    ))).toBe(true);

    cue.elapsed = 299.9;
    internals.advanceEffects(0.2);
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
  });

  it('keeps reduced motion and Endgame on the same ordered beats without chips or travel', () => {
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const board = createBoard();
    const rows = Array.from({ length: 4 }, (_, index) => BOARD_HEIGHT - 1 - index);
    for (const row of rows) board[row]!.fill('I');
    const base = {
      ...createInitialState(0x1a16_5ff, 'marathon'),
      board,
      status: 'playing',
      phase: 'line-clear',
      pendingClearRows: rows,
    } as GameState;

    const reducedRenderer = new TetrisRendererClass();
    reducedRenderer.setOptions({ reducedMotion: true });
    const reduced = reducedRenderer as unknown as RendererInternals;
    reduced.consumeEvents([{ type: 'clear-started', rows }], base);
    const reducedCue = reduced.ordinaryMultiLineClearCues[0]!;
    expect(reducedCue.restrained).toBe(true);
    const reducedStart = createGraphicsRecorder();
    (reduced as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = reducedStart.graphics;
    reducedCue.elapsed = 0;
    reduced.drawEffects(base, layout);
    const reducedLater = createGraphicsRecorder();
    (reduced as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = reducedLater.graphics;
    reducedCue.elapsed = 20;
    reduced.drawEffects(base, layout);
    const reducedStartFaces = reducedStart.operations.filter((operation) => operation.kind === 'roundRect');
    const reducedLaterFaces = reducedLater.operations.filter((operation) => operation.kind === 'roundRect');
    expect(reducedStartFaces).toHaveLength(10);
    expect(reducedLaterFaces).toHaveLength(10);
    expect(geometrySignature(reducedLater.operations)).toBe(geometrySignature(reducedStart.operations));
    expect(reducedStart.operations.some((operation) => operation.kind === 'rect' || operation.kind === 'segment')).toBe(false);
    expect(reducedLater.operations.some((operation) => operation.kind === 'rect' || operation.kind === 'segment')).toBe(false);

    const endgameRenderer = new TetrisRendererClass();
    const endgame = endgameRenderer as unknown as RendererInternals;
    const endgameState = { ...base, mode: 'endgame' } as GameState;
    endgame.consumeEvents([{ type: 'clear-started', rows }], endgameState);
    const endgameCue = endgame.ordinaryMultiLineClearCues[0]!;
    endgameCue.elapsed = 20;
    expect(endgameCue.restrained).toBe(true);
    const endgameFrame = createGraphicsRecorder();
    (endgame as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = endgameFrame.graphics;
    endgame.drawEffects(endgameState, layout);
    expect(endgameFrame.operations.some((operation) => operation.kind === 'rect' || operation.kind === 'segment')).toBe(false);
    expect(endgameFrame.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(10);
  });

  it('keeps restrained feedback on one continuous track across the unchanged Core commit', () => {
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const app = { screen: { width: 280, height: 480 }, renderer: { resolution: 1 } };

    for (const count of [1, 2, 3, 4] as const) {
      const board = createBoard();
      const rows = Array.from({ length: count }, (_, index) => BOARD_HEIGHT - 1 - index);
      for (const row of rows) board[row]!.fill('I');
      const base = {
        ...createInitialState(0x1a16_600 + count, 'marathon'),
        board,
        status: 'playing',
        phase: 'line-clear',
        pendingClearRows: rows,
      } as GameState;

      for (const variant of [
        { mode: 'marathon' as const, reducedMotion: true },
        { mode: 'endgame' as const, reducedMotion: false },
      ]) {
        const renderer = new TetrisRendererClass();
        renderer.setOptions({ reducedMotion: variant.reducedMotion });
        const internals = renderer as unknown as RendererInternals;
        const frame = {
          ...base,
          mode: variant.mode,
        } as GameState;
        internals.consumeEvents([{ type: 'clear-started', rows }], frame);
        internals.advanceEffects(0);
        const cue = internals.ordinaryMultiLineClearCues[0]!;
        cue.elapsed = 199.9;
        const cueIdentity = cue;
        internals.consumeEvents([{
          type: 'lines-cleared',
          rows,
          count,
          score: 100 * count,
        }], { ...frame, phase: 'active', pendingClearRows: [] });
        expect(internals.ordinaryMultiLineClearCues[0]).toBe(cueIdentity);
        expect(cue).toMatchObject({
          elapsed: 199.9,
          duration: CLASSIC_LINE_CLEAR_SEQUENCE_MS,
          restrained: true,
          committed: true,
        });
        expect(cue.duration - 200).toBeCloseTo(100, 5);

        cue.elapsed = 250;
        const postCommit = { ...frame, phase: 'active', pendingClearRows: [], active: null } as GameState;
        internals.updateSnapshot(postCommit, layout, app);
        expect(renderer.getSnapshot().ordinaryMultiLineClearCues[0]!.visibleCellCount).toBeGreaterThan(0);
        const tailFrame = createGraphicsRecorder();
        (internals as unknown as { effectGraphics: RecorderGraphics }).effectGraphics = tailFrame.graphics;
        internals.drawEffects(postCommit, layout);
        expect(tailFrame.operations.filter((operation) => operation.kind === 'roundRect').length).toBeGreaterThan(0);
        expect(tailFrame.operations.some((operation) => operation.kind === 'rect' || operation.kind === 'segment')).toBe(false);

        cue.elapsed = 299.9;
        expect(internals.ordinaryMultiLineClearCues).toContain(cue);
        internals.advanceEffects(0.2);
        expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
      }
    }

  });

  it('captures one bounded 300 ms material cue and clears it on lifecycle boundaries', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const board = createBoard();
    const rows = Array.from({ length: 4 }, (_, index) => BOARD_HEIGHT - 1 - index);
    for (const row of rows) board[row]!.fill('I');
    const clearEvent: Extract<GameEvent, { type: 'lines-cleared' }> = {
      type: 'lines-cleared',
      rows,
      count: 4,
      score: 1200,
    };
    const classic = {
      ...createInitialState(0x1a16_6ff, 'marathon'),
      board,
      active: null,
      status: 'playing',
      phase: 'line-clear',
      pendingClearRows: rows,
    } as GameState;
    const startEvent: Extract<GameEvent, { type: 'clear-started' }> = { type: 'clear-started', rows };

    internals.consumeEvents([startEvent], classic);
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(1);
    const cue = internals.ordinaryMultiLineClearCues[0]!;
    expect(cue).toMatchObject({
      duration: CLASSIC_LINE_CLEAR_SEQUENCE_MS,
      elapsed: 0,
      restrained: false,
      committed: false,
      fresh: true,
    });
    expect(cue.cells).toHaveLength(40);
    internals.consumeEvents([startEvent], classic);
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(1);

    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    cue.elapsed = LINE_CLEAR_CORE_COMMIT_MS - 0.1;
    const preCommitDraw = vi.spyOn(internals, 'drawCellGroups').mockImplementation(() => undefined);
    internals.drawPieces(classic, layout);
    const preCommitCenter = preCommitDraw.mock.calls.find((call) => (
      (call[1] as readonly Cell[]).some((cell) => (
        cell.x === 4 && cell.y === BOARD_HEIGHT - 1 - VISIBLE_START_ROW
      ))
      && typeof call[3] === 'number'
      && call[3] < 1
    ));
    expect(preCommitCenter).toBeDefined();
    const preCommitAlpha = preCommitCenter?.[3] as number;
    preCommitDraw.mockRestore();

    internals.consumeEvents([clearEvent], { ...classic, phase: 'active', pendingClearRows: [] });
    expect(internals.ordinaryMultiLineClearCues[0]).toBe(cue);
    expect(cue).toMatchObject({ elapsed: LINE_CLEAR_CORE_COMMIT_MS - 0.1, committed: true });
    cue.elapsed = LINE_CLEAR_CORE_COMMIT_MS;
    const commitDraw = vi.spyOn(internals, 'drawCellGroups').mockImplementation(() => undefined);
    internals.drawCommittedOrdinaryMultiLineClearBodies(createGraphicsRecorder().graphics, layout);
    const committedCenter = commitDraw.mock.calls.find((call) => (
      (call[1] as readonly Cell[]).some((cell) => (
        cell.x === 4 && cell.y === BOARD_HEIGHT - 1 - VISIBLE_START_ROW
      ))
    ));
    expect(committedCenter).toBeDefined();
    expect(Math.abs((committedCenter?.[3] as number) - preCommitAlpha)).toBeLessThan(0.02);
    commitDraw.mockRestore();

    cue.elapsed = 250;
    const bodyDraw = vi.spyOn(internals, 'drawCellGroups').mockImplementation(() => undefined);
    internals.drawCommittedOrdinaryMultiLineClearBodies(createGraphicsRecorder().graphics, layout);
    expect(bodyDraw.mock.calls.length).toBeGreaterThan(0);
    expect(bodyDraw.mock.calls.every((call) => (
      typeof call[3] === 'number' && call[3] > 0 && call[3] <= 1
    ))).toBe(true);
    bodyDraw.mockRestore();

    internals.ordinaryMultiLineClearCues.length = 0;
    for (let index = 0; index < 6; index += 1) {
      internals.consumeEvents([startEvent, clearEvent], classic);
    }
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(4);
    expect(internals.ordinaryMultiLineClearCues.every((entry) => entry.cells.length === 40)).toBe(true);

    internals.consumeEvents([{ type: 'restarted' }], classic);
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
    internals.consumeEvents([startEvent], classic);
    internals.consumeEvents([{ type: 'endgame-undone' }], classic);
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
    internals.consumeEvents([startEvent], classic);
    renderer.setOptions({ reducedMotion: true });
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
    internals.consumeEvents([startEvent], classic);
    expect(internals.ordinaryMultiLineClearCues[0]?.restrained).toBe(true);
    renderer.setOptions({ reducedMotion: false });
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
    internals.consumeEvents([startEvent], classic);
    expect(internals.ordinaryMultiLineClearCues[0]?.restrained).toBe(false);
    renderer.setOptions({ modeSwitch: true });
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
    renderer.setOptions({ modeSwitch: false });
    internals.consumeEvents([startEvent], { ...classic, mode: 'endgame' });
    expect(internals.ordinaryMultiLineClearCues[0]?.restrained).toBe(true);
    renderer.destroy();
    expect(internals.ordinaryMultiLineClearCues).toHaveLength(0);
  });

  it('queues bounded coexisting Classic combo, speed, and top-out cues only', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const classic = {
      mode: 'marathon',
      lines: 10,
      combo: 2,
    } as unknown as GameState;

    internals.consumeEvents(
      [{ type: 'piece-locked', piece: 'O', cells: [{ x: 4, y: 38 }, { x: 5, y: 38 }, { x: 4, y: 39 }, { x: 5, y: 39 }] }],
      classic,
    );
    internals.consumeEvents(
      [{ type: 'lines-cleared', rows: [BOARD_HEIGHT - 1], count: 2, score: 150 }],
      classic,
    );
    internals.consumeEvents([{ type: 'game-over', reason: 'lock-out' }], classic);

    expect(internals.classicFeedbackCues.map((cue) => cue.kind)).toEqual([
      'combo',
      'speed-up',
      'top-out',
    ]);
    expect(internals.lockPulse).toMatchObject({
      cells: [{ x: 4, y: 39 }, { x: 5, y: 39 }],
      duration: 100,
      strength: 1,
    });
    expect(internals.classicFeedbackCues[0]).toMatchObject({
      rows: [BOARD_HEIGHT - 1],
      combo: 2,
    });
    expect(internals.classicFeedbackCues[1]).toMatchObject({ tier: 1 });

    const snapshot = renderer.getSnapshot();
    expect(snapshot.classicFeedback.map((cue) => cue.kind)).toEqual([
      'combo',
      'speed-up',
      'top-out',
    ]);
    snapshot.classicFeedback[0]!.rows.push(38);
    expect(internals.classicFeedbackCues[0]?.rows).toEqual([BOARD_HEIGHT - 1]);

    const otherMode = new TetrisRendererClass() as unknown as RendererInternals;
    otherMode.consumeEvents(
      [
        { type: 'piece-locked', piece: 'I', cells: [{ x: 3, y: 39 }] },
        { type: 'lines-cleared', rows: [39], count: 1, score: 40 },
        { type: 'game-over', reason: 'lock-out' },
      ],
      { mode: 'sprint', lines: 10, combo: 2 } as unknown as GameState,
    );
    expect(otherMode.classicFeedbackCues).toHaveLength(0);

    const clearingLock = new TetrisRendererClass() as unknown as RendererInternals;
    clearingLock.consumeEvents(
      [
        { type: 'piece-locked', piece: 'I', cells: [{ x: 3, y: 39 }] },
        { type: 'clear-started', rows: [39] },
      ],
      classic,
    );
    expect(clearingLock.classicFeedbackCues).toHaveLength(0);

    for (let index = 0; index < 10; index += 1) {
      internals.consumeEvents([{ type: 'game-over', reason: 'lock-out' }], classic);
    }
    expect(internals.classicFeedbackCues).toHaveLength(6);
    expect(internals.classicFeedbackCues.every((cue) => cue.kind === 'top-out')).toBe(true);
  });

  it('freezes the shared landing imprint to true support cells under a one-point overhang', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const board = createBoard();
    const cells = [
      { x: 3, y: BOARD_HEIGHT - 2 },
      { x: 4, y: BOARD_HEIGHT - 2 },
      { x: 5, y: BOARD_HEIGHT - 2 },
      { x: 6, y: BOARD_HEIGHT - 2 },
    ];
    for (const cell of cells) board[cell.y]![cell.x] = 'I';
    board[BOARD_HEIGHT - 1]![4] = 'T';

    internals.consumeEvents(
      [{ type: 'piece-locked', piece: 'I', cells }],
      { mode: 'race', board } as unknown as GameState,
    );

    expect(internals.classicFeedbackCues).toHaveLength(0);
    expect(internals.lockPulse?.cells).toEqual([
      { x: 4, y: BOARD_HEIGHT - 2 },
    ]);

    board[BOARD_HEIGHT - 1]![3] = 'T';
    expect(internals.lockPulse?.cells).toEqual([
      { x: 4, y: BOARD_HEIGHT - 2 },
    ]);
  });

  it('limits a hard drop to four short column traces and suppresses it under a clear', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const trail: NonNullable<RendererInternals['trail']> = {
      cells: [
        { x: 3, y: 39 },
        { x: 4, y: 39 },
        { x: 5, y: 39 },
        { x: 6, y: 39 },
      ],
      distance: 18,
      elapsed: 0,
      duration: 50,
      piece: 'I',
    };
    const recorder = createGraphicsRecorder();
    internals.drawHardDropTraces(recorder.graphics, trail, 0, layout);
    const segments = recorder.operations.filter((operation) => operation.kind === 'segment');
    expect(segments).toHaveLength(8);
    expect(new Set(segments.map((operation) => operation.values[0])).size).toBe(4);
    expect(segments.every((operation) => {
      const [startX, startY, endX, endY] = operation.values;
      return startX === endX && endY! - startY! <= layout.cell * 0.65;
    })).toBe(true);
    expect(recorder.operations.some((operation) => operation.kind === 'roundRect')).toBe(false);

    internals.consumeEvents(
      [
        { type: 'hard-dropped', piece: 'I', distance: 18 },
        { type: 'piece-locked', piece: 'I', cells: trail.cells },
        { type: 'clear-started', rows: [BOARD_HEIGHT - 1] },
      ],
      { mode: 'marathon', board: createBoard() } as unknown as GameState,
    );
    expect(internals.trail).toBeNull();
    expect(internals.lockPulse).toMatchObject({ strength: 0.55, duration: 100 });
  });

  it('keeps landing feedback as a bounded six-tick support imprint', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const imprint: NonNullable<RendererInternals['lockPulse']> = {
      cells: [{ x: 4, y: BOARD_HEIGHT - 1 }],
      elapsed: 0,
      duration: 100,
      piece: 'O',
      strength: 1,
    };
    const normal = createGraphicsRecorder();
    internals.drawLandingImprint(normal.graphics, imprint, 0, layout);
    expect(normal.operations.filter((operation) => operation.kind === 'roundRect')).toHaveLength(1);
    expect(normal.operations.filter((operation) => operation.kind === 'segment')).toHaveLength(2);
    const fill = normal.operations.find((operation) => operation.kind === 'fill');
    expect((fill?.options as { alpha?: number }).alpha).toBeLessThanOrEqual(0.12);
    expect(hasBroadHorizontalGeometry(normal.operations, layout.width)).toBe(false);

    renderer.setOptions({ reducedMotion: true });
    const reducedStart = createGraphicsRecorder();
    const reducedLater = createGraphicsRecorder();
    internals.drawLandingImprint(reducedStart.graphics, imprint, 0, layout);
    internals.drawLandingImprint(reducedLater.graphics, imprint, 0.5, layout);
    expect(geometrySignature(reducedLater.operations)).toBe(geometrySignature(reducedStart.operations));
  });

  it('keeps Classic feedback inside the well and uses stationary reduced-motion geometry', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const layout = { x: 40, y: 24, width: 200, height: 400, cell: 20, compact: false };
    const classic = { mode: 'marathon', lines: 10, combo: 4 } as unknown as GameState;
    internals.consumeEvents(
      [{ type: 'piece-locked', piece: 'O', cells: [{ x: 4, y: 38 }, { x: 5, y: 38 }, { x: 4, y: 39 }, { x: 5, y: 39 }] }],
      classic,
    );
    internals.consumeEvents(
      [{ type: 'lines-cleared', rows: [38, 39], count: 2, score: 150 }],
      classic,
    );
    internals.consumeEvents([{ type: 'game-over', reason: 'lock-out' }], classic);

    const initial = createGraphicsRecorder();
    internals.drawClassicFeedbackCues(initial.graphics, classic, layout);
    expect(initial.operations.some((operation) => operation.kind === 'segment')).toBe(true);
    expect(initial.operations.some((operation) => (
      operation.kind === 'stroke'
      && (operation.options as { color?: number }).color === COLORS.classic
    ))).toBe(true);
    expect(hasBroadHorizontalGeometry(initial.operations, layout.width)).toBe(false);
    expect(initial.operations
      .filter((operation) => operation.kind === 'segment')
      .every((operation) => {
        const [startX, startY, endX, endY] = operation.values;
        return startX! >= layout.x
          && startX! <= layout.x + layout.width
          && endX! >= layout.x
          && endX! <= layout.x + layout.width
          && startY! >= layout.y
          && startY! <= layout.y + layout.height
          && endY! >= layout.y
          && endY! <= layout.y + layout.height;
      })).toBe(true);
    const movingSignature = geometrySignature(initial.operations);
    internals.advanceEffects(60);
    const moved = createGraphicsRecorder();
    internals.drawClassicFeedbackCues(moved.graphics, classic, layout);
    expect(geometrySignature(moved.operations)).not.toBe(movingSignature);

    internals.consumeEvents([{ type: 'restarted' }], classic);
    renderer.setOptions({ reducedMotion: true });
    internals.consumeEvents(
      [{ type: 'piece-locked', piece: 'O', cells: [{ x: 4, y: 39 }, { x: 5, y: 39 }] }],
      classic,
    );
    internals.consumeEvents(
      [{ type: 'lines-cleared', rows: [39], count: 1, score: 90 }],
      classic,
    );
    internals.consumeEvents([{ type: 'game-over', reason: 'lock-out' }], classic);
    const reducedStart = createGraphicsRecorder();
    internals.drawClassicFeedbackCues(reducedStart.graphics, classic, layout);
    expect(reducedStart.operations.some((operation) => operation.kind === 'circle')).toBe(false);
    expect(reducedStart.operations.some((operation) => operation.kind === 'rect')).toBe(false);
    internals.advanceEffects(40);
    const reducedLater = createGraphicsRecorder();
    internals.drawClassicFeedbackCues(reducedLater.graphics, classic, layout);
    expect(geometrySignature(reducedLater.operations)).toBe(geometrySignature(reducedStart.operations));

    internals.advanceEffects(200);
    expect(internals.classicFeedbackCues).toHaveLength(0);
  });

  it('extracts the current Pixi board without retaining or mounting a second Canvas', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const pixels = new Uint8ClampedArray([
      8, 24, 42, 255,
      200, 90, 114, 255,
      71, 170, 161, 255,
      154, 101, 177, 255,
    ]);
    const extracted = document.createElement('canvas');
    extracted.width = 2;
    extracted.height = 2;
    const context = {
      getImageData: () => ({ data: pixels }),
    };
    Object.defineProperty(extracted, 'getContext', {
      configurable: true,
      value: vi.fn(() => context),
    });
    Object.defineProperty(extracted, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/png;base64,renderer-board'),
    });
    const extractCanvas = vi.fn<(options: unknown) => HTMLCanvasElement>(() => extracted);
    const stage = {};
    internals.app = {
      stage,
      renderer: {
        resolution: 2,
        extract: { canvas: extractCanvas },
      },
    };
    internals.snapshot.board = { x: 11, y: 13, width: 101, height: 202, cell: 10 };
    const beforeSnapshot = renderer.getSnapshot();
    const canvasCountBefore = document.querySelectorAll('canvas').length;

    const result = renderer.captureBoardPng();

    expect(result).toEqual({
      dataUrl: 'data:image/png;base64,renderer-board',
      frame: { x: 11, y: 13, width: 101, height: 202 },
      resolution: 2,
      outputPixels: { width: 2, height: 2 },
      pixelProbe: {
        samples: 4,
        nonTransparentSamples: 4,
        distinctBuckets: 4,
      },
    });
    expect(extractCanvas).toHaveBeenCalledOnce();
    expect(extractCanvas.mock.calls[0]?.[0]).toMatchObject({
      target: stage,
      resolution: 2,
      antialias: true,
    });
    expect(extractCanvas.mock.calls[0]?.[0]).toHaveProperty('frame');
    expect(renderer.getSnapshot()).toEqual(beforeSnapshot);
    expect(document.querySelectorAll('canvas')).toHaveLength(canvasCountBefore);
  });

  it('scales Next geometry to the slot instead of capping it at a tiny fixed unit', () => {
    const renderer = new TetrisRendererClass();
    const internals = renderer as unknown as RendererInternals;
    const calls: Array<{ centerX: number; centerY: number; unit: number }> = [];
    (internals as unknown as {
      drawPreviewPiece: (_graphics: unknown, _piece: 'I' | 'O', centerX: number, centerY: number, unit: number) => void;
    }).drawPreviewPiece = (_graphics, _piece, centerX, centerY, unit) => calls.push({ centerX, centerY, unit });

    internals.drawPreviewPieces({}, ['I'], 0, 0, 220, 96);
    expect(calls).toEqual([{ centerX: 110, centerY: 48, unit: 36 }]);

    calls.length = 0;
    internals.drawPreviewPieces({}, ['I', 'O'], 0, 0, 220, 180);
    expect(calls).toEqual([
      { centerX: 110, centerY: 45, unit: 28 },
      { centerX: 110, centerY: 135, unit: 28 },
    ]);

    calls.length = 0;
    internals.drawPreviewPieces({}, ['O'], 0, 0, 120, 64, 18);
    expect(calls[0]?.centerY).toBe(41);
  });

});
