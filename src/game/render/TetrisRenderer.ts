import {
  Application,
  Container,
  DisplacementFilter,
  FillGradient,
  Graphics,
  NoiseFilter,
  Rectangle,
  Sprite,
  Texture,
  type Ticker,
} from 'pixi.js';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ANCHOR_CELL,
  BEDROCK_CELL,
  SURVIVAL_STONE_CELL,
  PIECE_SHAPES,
  VISIBLE_HEIGHT,
  VISIBLE_START_ROW,
  activeUsesSupergravityLanding,
  cellsForPiece,
  nextMutationPreviewItem,
  type Cell,
  type GameEvent,
  type GameState,
  type MutationItem,
  type BoardMaterial,
  type PieceType,
} from '../core';
import {
  ANCHOR_MATERIAL,
  BEDROCK_MATERIAL,
  CELL_STYLE,
  COLORS,
  MUTATION_MATERIALS,
  MUTATION_MATERIAL_STRENGTH,
  PIECE_MATERIALS,
  SURVIVAL_STONE_MATERIAL,
  type MutationMaterial,
  type MutationMaterialRole,
  type PieceMaterial,
} from './theme';
import {
  MUTATION_PARTICLE_LIMIT,
  MUTATION_VFX_TOKENS,
} from '../../design/mutationTokens';
import {
  DEFAULT_VISUAL_THEME,
  canvasThemePalette,
  type VisualThemeId,
} from '../../design/visualThemes';
import {
  createMutationActivationTimeline,
  mutationEase,
  type MutationTimeline,
  type TimelineSample,
} from '../../animation/mutationTimeline';
import {
  LINE_CLEAR_FIXED_STEP_MS,
  LINE_CLEAR_CORE_COMMIT_MS,
  lineClearReleaseSnapshot,
  lineClearVisualDurationMs,
  orderedLineClearRows,
} from '../../animation/lineClearTimeline';
import { mutationChainPresentationPlan } from '../../animation/mutationChainTimeline';
import {
  activeCellsInsideVisibleRows,
  activePresentationScaleFitsVisibleWell,
  approachPresentationPoint,
  boardShiftPresentationOffset,
  clampActivePresentationOffsetY,
  exposedCellEdges,
  internalCellSeams,
  nextPreviewPieces,
  ORDINARY_LINE_CLEAR_TAIL_LIMIT,
  classicLineClearCellSample,
  orthogonalCellComponents,
  projectedLandingCells,
  survivalDebrisCells,
  type ClassicLineClearCellSample,
  type CellEdge,
  type BoardShiftDirection,
} from './presentation';

interface RenderOptions {
  reducedMotion: boolean;
  modeSwitch: boolean;
  visualTheme: VisualThemeId;
  /** Renderer-only staged reveal of the canonical three ready-state bedrock rows. */
  survivalEntryBedrockRows: number | null;
}

interface BoardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cell: number;
  compact: boolean;
}

interface PiecePresentation {
  type: PieceType;
  x: number;
  y: number;
  settleMs: number;
}

interface ActiveSpawnEntry {
  generationKey: string;
  pending: boolean;
}

interface TrailState {
  cells: Cell[];
  distance: number;
  elapsed: number;
  duration: number;
  piece: PieceType;
}

interface LockPulse {
  cells: Cell[];
  elapsed: number;
  duration: number;
  piece: PieceType;
  /** A simultaneous clear owns the visual hierarchy, so its contact is quieter. */
  strength: number;
}

interface PreviewSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  /** In-well human labels reserve a calm strip above their matching tetromino. */
  labelInset: number;
}

interface BoardShift {
  direction: BoardShiftDirection;
  elapsed: number;
  duration: number;
}

interface OrdinaryMultiLineClearCueCell {
  cell: Cell;
  material: BoardMaterial;
  rowOrder: number;
  mutationItem: MutationItem | null;
  endgameTarget: boolean;
}

interface OrdinaryMultiLineClearCue {
  count: 1 | 2 | 3 | 4;
  orderedRows: readonly number[];
  cells: readonly OrdinaryMultiLineClearCueCell[];
  elapsed: number;
  duration: number;
  restrained: boolean;
  committed: boolean;
  fresh: boolean;
}

interface SurvivalDebrisPresentation {
  x: number;
  y: number;
}

interface SurvivalStoneCue {
  kind: 'spawn' | 'land';
  cells: readonly Cell[];
  elapsed: number;
  duration: number;
}

interface SurvivalBedrockCue {
  direction: BoardShiftDirection;
  height: number;
  elapsed: number;
  duration: number;
}

interface SurvivalEntryBedrockRise {
  rows: number;
  elapsed: number;
  duration: number;
}

type ClassicFeedbackKind = 'combo' | 'speed-up' | 'top-out';

interface ClassicFeedbackCue {
  kind: ClassicFeedbackKind;
  elapsed: number;
  duration: number;
  cells: readonly Cell[];
  rows: readonly number[];
  combo: number;
  tier: number;
}

interface MutationFlash {
  item: MutationItem;
  elapsed: number;
  duration: number;
  timeline: MutationTimeline;
  /** Immutable Core geometry, before a line clear remaps the carrier. */
  triggerCells: readonly Cell[];
  /** The activation event is the source of truth for the 2× / 4× cue. */
  multiplierFactor: 2 | 4;
  /** Core-earned points are only displayed; the renderer never changes scoring. */
  score: number;
  /** Bomb fragments are armed at impact; every other family emits at activation. */
  particlesEmitted: boolean;
  /** Immutable board snapshot retained only until a deferred Bomb impact begins. */
  particlePreviousBoard: GameState['board'] | null;
  /** Stable board columns touched by the carrier that activated this item. */
  triggerColumns: readonly number[];
  bombOutcome: 'blast' | 'chain-clear' | null;
  blastRows: readonly number[];
  chainOriginCells: readonly Cell[];
}

/** Renderer-only request retained until every same-tick item receives its own burst. */
interface MutationFlashRequest {
  item: MutationItem;
  triggerCells: readonly Cell[];
  multiplierFactor: 2 | 4;
  score: number;
  previousBoard: GameState['board'] | null;
  bombOutcome: 'blast' | 'chain-clear' | null;
  blastRows: readonly number[];
  chainOriginCells: readonly Cell[];
}

interface MutationArrival {
  carrierId: number;
  elapsed: number;
  duration: number;
}

type MutationFieldStage = 'enter' | 'active' | 'exit';
type TimedMutationItem = Extract<MutationItem, 'freeze' | 'collapse' | 'multiplier'>;

interface MutationField {
  item: TimedMutationItem;
  stage: MutationFieldStage;
  elapsed: number;
}

/** One renderer-owned slot in the fixed VFX pool; never a Pixi display object. */
interface MutationParticle {
  active: boolean;
  item: MutationItem;
  u: number;
  v: number;
  velocityU: number;
  velocityV: number;
  elapsed: number;
  lifeMs: number;
  size: number;
  color: number;
  rotation: number;
  rotationVelocity: number;
}

interface GroupDrawOptions {
  originX: number;
  originY: number;
  unit: number;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  active?: boolean;
  ghost?: boolean;
  faceColor?: number;
  material?: PieceMaterial;
}

export interface RendererSnapshot {
  canvas: { width: number; height: number; resolution: number };
  board: { x: number; y: number; width: number; height: number; cell: number };
  preview: { x: number; y: number; width: number; height: number } | null;
  previewLayerVisible: boolean;
  previewPiece: PieceType | null;
  previewPieces: PieceType[];
  previewMutationItem: MutationItem | null;
  previewClearBounds: { x: number; y: number; width: number; height: number } | null;
  previewClearPiece: PieceType | null;
  scrim: { x: number; y: number; width: number; height: number } | null;
  activeCells: Cell[];
  ghostCells: Cell[];
  activeSpawnEntry: {
    generationKey: string;
    pending: boolean;
    visibleCellCount: number;
    hiddenCellCount: number;
  } | null;
  visibleLockedCells: number;
  ordinaryLineClear: {
    readonly count: 1 | 2 | 3 | 4;
    readonly orderedRows: readonly number[];
    readonly releaseTicks: readonly number[];
    readonly releasedRows: readonly number[];
  } | null;
  ordinaryMultiLineClearCues: Array<{
    count: 1 | 2 | 3 | 4;
    orderedRows: number[];
    elapsedMs: number;
    durationMs: number;
    committed: boolean;
    restrained: boolean;
    visibleCellCount: number;
  }>;
  presentation: { x: number; y: number; offsetX: number; offsetY: number } | null;
  boardShiftOffsetY: number;
  mutationFilters: { freeze: boolean; collapse: boolean; activeCount: number };
  /** Read-only DEV-QA observability for source-bound FIFO/VFX evidence. */
  mutationActivation: {
    item: MutationItem;
    elapsedMs: number;
    durationMs: number;
    phases: TimelineSample[];
    particlesEmitted: boolean;
    triggerColumns: number[];
  } | null;
  mutationActivationQueueItems: MutationItem[];
  mutationActiveParticleCount: number;
  mutationCollapseTrail: {
    columns: number[];
    maxDrop: number;
    elapsedMs: number;
    durationMs: number;
  } | null;
  survivalDebris: Array<{
    id: number;
    x: number;
    y: number;
    height: 1 | 2;
    presentationY: number;
    cells: Cell[];
  }>;
  survivalDebrisWarningColumns: number[];
  survivalDebrisWarningHeight: GameState['survivalDebrisWarningHeight'];
  survivalStoneCueCount: number;
  survivalBedrockCue: {
    direction: BoardShiftDirection;
    height: number;
    elapsedMs: number;
    durationMs: number;
  } | null;
  survivalEntryBedrockRows: number | null;
  survivalEntryBedrockRise: {
    rows: number;
    elapsedMs: number;
    durationMs: number;
    offsetY: number;
  } | null;
  classicFeedback: Array<{
    kind: ClassicFeedbackKind;
    elapsedMs: number;
    durationMs: number;
    cells: Cell[];
    rows: number[];
    combo: number;
    tier: number;
  }>;
}

export interface RendererBoardCapture {
  dataUrl: string;
  frame: { x: number; y: number; width: number; height: number };
  resolution: number;
  outputPixels: { width: number; height: number };
  pixelProbe: {
    samples: number;
    nonTransparentSamples: number;
    distinctBuckets: number;
  };
}

const easeOutCubic = (value: number): number => 1 - Math.pow(1 - value, 3);
const CLASSIC_FEEDBACK_LIMIT = 6;
const SURVIVAL_ENTRY_RISE_MS = 680;
const SURVIVAL_ENTRY_SETTLE_MS = 140;
const SURVIVAL_ENTRY_DURATION_MS = SURVIVAL_ENTRY_RISE_MS + SURVIVAL_ENTRY_SETTLE_MS;

function ordinaryLineClearCellSampleForState(
  state: GameState,
  column: number,
  row: number,
  restrainedGeometry: boolean,
  elapsedMs = state.phaseTicks * LINE_CLEAR_FIXED_STEP_MS,
): Readonly<ClassicLineClearCellSample> | null {
  if (state.phase !== 'line-clear') return null;
  const release = lineClearReleaseSnapshot(state.pendingClearRows, state.phaseTicks);
  if (!release) return null;
  const rowOrder = release.orderedRows.indexOf(row);
  if (rowOrder < 0) return null;
  return classicLineClearCellSample(
    elapsedMs,
    column,
    BOARD_WIDTH,
    rowOrder,
    release.count,
    restrainedGeometry,
  );
}

type ReliefPoint = readonly [x: number, y: number];

function halton(index: number, base: number): number {
  let result = 0;
  let fraction = 1 / base;
  let remaining = index;
  while (remaining > 0) {
    result += fraction * (remaining % base);
    remaining = Math.floor(remaining / base);
    fraction /= base;
  }
  return result;
}

function rockHash(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495) ^ seed;
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 0xffffffff;
}

function rockNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const fadeX = tx * tx * (3 - 2 * tx);
  const fadeY = ty * ty * (3 - 2 * ty);
  const top = rockHash(x0, y0, seed) * (1 - fadeX) + rockHash(x0 + 1, y0, seed) * fadeX;
  const bottom = rockHash(x0, y0 + 1, seed) * (1 - fadeX) + rockHash(x0 + 1, y0 + 1, seed) * fadeX;
  return top * (1 - fadeY) + bottom * fadeY;
}

function rockFbm(x: number, y: number, seed: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let amplitudeTotal = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += rockNoise(x * frequency, y * frequency, seed + octave * 0x9e37) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return amplitudeTotal > 0 ? value / amplitudeTotal : 0;
}

/**
 * A deliberately small game-native mineral ramp. Keeping the generated wall inside
 * these seven related slate tones prevents the procedural surface from drifting into
 * photographic greyscale noise beside the enamel tetrominoes.
 */
const BEDROCK_MINERAL_RAMP = [
  [52, 73, 85],
  [59, 80, 92],
  [66, 88, 102],
  [74, 96, 110],
  [82, 104, 118],
  [91, 113, 128],
  [101, 123, 137],
] as const;

/** Deterministic local height-field texture; exported only for renderer contract tests. */
export function buildBedrockTexturePixels(requestedWidth: number, requestedHeight: number): Uint8ClampedArray {
  const width = Math.max(2, Math.floor(requestedWidth));
  const height = Math.max(2, Math.floor(requestedHeight));
  const aspect = width / height;
  // A continuous warped height field replaces the rejected Voronoi planes. Three
  // deliberately low-frequency layers create connected mineral folds without a
  // photographic grain, a giant fan facet, or any logical row/column cadence.
  const heights = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const physicalX = u * aspect;
      const warpX = (rockFbm(physicalX * 0.92 + 1.7, v * 1.08 + 3.1, 0x4d31, 3) - 0.5) * 0.3;
      const warpY = (rockFbm(physicalX * 1.04 + 5.2, v * 0.88 + 1.9, 0x72a5, 3) - 0.5) * 0.24;
      const warpedX = physicalX + warpX;
      const warpedY = v + warpY;
      const mass = rockFbm(warpedX * 1.72 + 0.8, warpedY * 1.82 + 2.4, 0x31b7, 4);
      const foldedSource = rockFbm(warpedX * 3.05 + 4.6, warpedY * 2.72 + 0.7, 0x5a19, 3);
      const fold = 1 - Math.abs(foldedSource * 2 - 1);
      const strataPhase = warpedY * 3.35 + warpedX * 0.42
        + rockFbm(warpedX * 1.18 + 6.1, warpedY * 1.32 + 4.4, 0x23d1, 3) * 1.35;
      const strata = 0.5 + 0.5 * Math.sin(strataPhase * Math.PI * 2);
      heights[y * width + x] = Math.max(0, Math.min(1, mass * 0.64 + fold * 0.23 + strata * 0.13));
    }
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const left = heights[y * width + Math.max(0, x - 1)]!;
      const right = heights[y * width + Math.min(width - 1, x + 1)]!;
      const above = heights[Math.max(0, y - 1) * width + x]!;
      const below = heights[Math.min(height - 1, y + 1) * width + x]!;
      const heightValue = heights[y * width + x]!;
      const reliefLight = Math.max(-0.16, Math.min(0.16, (left - right) * 1.4 + (below - above) * 1.05));
      const tone = Math.max(0, Math.min(1, 0.08 + heightValue * 0.78 + reliefLight + (1 - v) * 0.08));
      // Fourteen soft graphic steps retain natural connected relief while avoiding
      // both high-frequency photographic texture and oversized flat polygons.
      const quantizedTone = Math.round(tone * 14) / 14;
      const rampPosition = quantizedTone * (BEDROCK_MINERAL_RAMP.length - 1);
      const lowerBand = Math.max(0, Math.min(BEDROCK_MINERAL_RAMP.length - 1, Math.floor(rampPosition)));
      const upperBand = Math.min(BEDROCK_MINERAL_RAMP.length - 1, lowerBand + 1);
      const blend = rampPosition - lowerBand;
      const lowerColor = BEDROCK_MINERAL_RAMP[lowerBand]!;
      const upperColor = BEDROCK_MINERAL_RAMP[upperBand]!;
      const index = (y * width + x) * 4;
      pixels[index] = Math.round(lowerColor[0] * (1 - blend) + upperColor[0] * blend);
      pixels[index + 1] = Math.round(lowerColor[1] * (1 - blend) + upperColor[1] * blend);
      pixels[index + 2] = Math.round(lowerColor[2] * (1 - blend) + upperColor[2] * blend);
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

function buildRockLip(
  left: number,
  top: number,
  width: number,
  size: number,
): readonly ReliefPoint[] {
  const segments = Math.max(8, Math.round(width / Math.max(1, size * 0.7)));
  const points: ReliefPoint[] = [[left, top], [left + width, top]];
  for (let segment = segments; segment >= 0; segment -= 1) {
    const ratio = segment / segments;
    const depth = size * (0.045 + halton(segment + 5, 3) * 0.065);
    points.push([left + width * ratio, top + depth]);
  }
  return points;
}

function cubicBezierCoordinate(value: number, first: number, second: number): number {
  const inverse = 1 - value;
  return 3 * inverse * inverse * value * first
    + 3 * inverse * value * value * second
    + value * value * value;
}

/** Fixed `cubic-bezier(.22,.72,.28,1)` without allocating an easing object per frame. */
function survivalEntryCurve(value: number): number {
  const target = Math.max(0, Math.min(1, value));
  let lower = 0;
  let upper = 1;
  for (let step = 0; step < 7; step += 1) {
    const sample = (lower + upper) / 2;
    const x = cubicBezierCoordinate(sample, 0.22, 0.28);
    if (x < target) lower = sample;
    else upper = sample;
  }
  return cubicBezierCoordinate((lower + upper) / 2, 0.72, 1);
}

function survivalEntryRiseProgress(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs < SURVIVAL_ENTRY_RISE_MS) {
    return survivalEntryCurve(elapsedMs / SURVIVAL_ENTRY_RISE_MS) * 0.94;
  }
  const settleProgress = Math.min(
    1,
    (elapsedMs - SURVIVAL_ENTRY_RISE_MS) / SURVIVAL_ENTRY_SETTLE_MS,
  );
  return 0.94 + easeOutCubic(settleProgress) * 0.06;
}

const SCORE_SEGMENT_COORDINATES = [
  [.12, 0, .88, 0],
  [.88, 0, .88, .5],
  [.88, .5, .88, 1],
  [.12, 1, .88, 1],
  [.12, .5, .12, 1],
  [.12, 0, .12, .5],
  [.12, .5, .88, .5],
] as const;

const SCORE_DIGIT_SEGMENTS: Readonly<Record<string, readonly number[]>> = {
  '0': [0, 1, 2, 3, 4, 5],
  '1': [1, 2],
  '2': [0, 1, 6, 4, 3],
  '3': [0, 1, 6, 2, 3],
  '4': [5, 6, 1, 2],
  '5': [0, 5, 6, 2, 3],
  '6': [0, 5, 6, 4, 2, 3],
  '7': [0, 1, 2],
  '8': [0, 1, 2, 3, 4, 5, 6],
  '9': [0, 1, 2, 3, 5, 6],
};

export class TetrisRenderer {
  private app: Application | null = null;
  private host: HTMLElement | null = null;
  private readonly world = new Container();
  private readonly boardGraphics = new Graphics();
  private readonly pieceGraphics = new Graphics();
  /** Board-mouth clip for spatial spawn entry; active rows above the well stay hidden. */
  private readonly pieceMaskGraphics = new Graphics();
  /** HUD preview plane stays outside the board-mouth mask and world-only Mutation filters. */
  private readonly previewGraphics = new Graphics();
  private readonly survivalEntryGraphics = new Graphics();
  private readonly survivalEntryMaskGraphics = new Graphics();
  private readonly effectGraphics = new Graphics();
  /** Second and final visual-only effect plane, reserved for Mutation VFX. */
  private readonly mutationGraphics = new Graphics();
  /** Board-local clip: transient Mutation fragments must never obscure the HUD rail. */
  private readonly mutationMaskGraphics = new Graphics();
  /** Two renderer-lifetime Pixi filters; they are disabled instead of reallocated. */
  private frostFilter: NoiseFilter | null = null;
  private collapseFilter: DisplacementFilter | null = null;
  private collapseDisplacementMap: Sprite | null = null;
  private readonly mutationFilterState = { freeze: false, collapse: false };
  private readonly cellGradients = new Map<BoardMaterial, FillGradient>();
  private readonly overrideGradients = new Map<PieceMaterial, FillGradient>();
  /** One deterministic procedural rock face, reused by every bedrock draw. */
  private bedrockTexture: Texture | null = null;
  private bedrockTextureUnavailable = false;
  /** One renderer-lifetime alpha gradient prevents Ice from resolving into visible scan bands. */
  private freezeAtmosphereGradient: FillGradient | null = null;

  private frameCallback: ((deltaMs: number) => void) | null = null;
  private presentation: PiecePresentation | null = null;
  private activeSpawnGenerationKey: string | null = null;
  private activeSpawnEntry: ActiveSpawnEntry | null = null;
  private trail: TrailState | null = null;
  private lockPulse: LockPulse | null = null;
  private impact = 0;
  private rotationPulse = 0;
  private boardShift: BoardShift | null = null;
  private readonly ordinaryMultiLineClearCues: OrdinaryMultiLineClearCue[] = [];
  private readonly classicFeedbackCues: ClassicFeedbackCue[] = [];
  private readonly survivalDebrisPresentation = new Map<number, SurvivalDebrisPresentation>();
  private readonly survivalStoneCues: SurvivalStoneCue[] = [];
  private survivalBedrockCue: SurvivalBedrockCue | null = null;
  private survivalEntryBedrockRise: SurvivalEntryBedrockRise | null = null;
  private mutationFlash: MutationFlash | null = null;
  private readonly mutationFlashQueue: MutationFlashRequest[] = [];
  private mutationArrival: MutationArrival | null = null;
  private activeMutationCarrierId: number | null = null;
  private readonly mutationFields = new Map<TimedMutationItem, MutationField>();
  private readonly mutationParticles: MutationParticle[] = Array.from(
    { length: MUTATION_PARTICLE_LIMIT },
    () => ({
      active: false,
      item: 'freeze',
      u: 0,
      v: 0,
      velocityU: 0,
      velocityV: 0,
      elapsed: 0,
      lifeMs: 1,
      size: 0,
      color: 0xffffff,
      rotation: 0,
      rotationVelocity: 0,
    }),
  );
  private particleCursor = 0;
  private particleSeed = 0x4d555441;
  private mutationClockMs = 0;
  private previousBoard: GameState['board'] | null = null;
  private options: RenderOptions = {
    reducedMotion: false,
    modeSwitch: false,
    visualTheme: DEFAULT_VISUAL_THEME,
    survivalEntryBedrockRows: null,
  };
  private previewBounds: RendererSnapshot['preview'] = null;
  private previewLayerVisible = false;
  private previewPiece: PieceType | null = null;
  private previewPieces: PieceType[] = [];
  private previewMutationItem: MutationItem | null = null;
  /** Avoid replaying the pure Core preview lookahead on every rendered frame. */
  private previewMutationQueueRef: GameState['queue'] | null = null;
  private previewMutationRandomizerRef: GameState['mutationRandomizer'] | null = null;
  private previewMutationPieceCount = -1;
  private previewMutationMode: GameState['mode'] | null = null;
  private previewMutationHasActive = false;
  private lastPreviewBounds: RendererSnapshot['preview'] = null;
  private lastPreviewPiece: PieceType | null = null;
  private previewClearBounds: RendererSnapshot['previewClearBounds'] = null;
  private previewClearPiece: PieceType | null = null;
  private scrimBounds: RendererSnapshot['scrim'] = null;
  private snapshot: Omit<
    RendererSnapshot,
    'classicFeedback'
    | 'mutationActivation'
    | 'mutationActivationQueueItems'
    | 'mutationActiveParticleCount'
    | 'mutationCollapseTrail'
  > = {
    canvas: { width: 0, height: 0, resolution: 1 },
    board: { x: 0, y: 0, width: 0, height: 0, cell: 0 },
    preview: null,
    previewLayerVisible: false,
    previewPiece: null,
    previewPieces: [],
    previewMutationItem: null,
    previewClearBounds: null,
    previewClearPiece: null,
    scrim: null,
    activeCells: [],
    ghostCells: [],
    activeSpawnEntry: null,
    visibleLockedCells: 0,
    ordinaryLineClear: null,
    ordinaryMultiLineClearCues: [],
    presentation: null,
    boardShiftOffsetY: 0,
    mutationFilters: { freeze: false, collapse: false, activeCount: 0 },
    survivalDebris: [],
    survivalDebrisWarningColumns: [],
    survivalDebrisWarningHeight: null,
    survivalStoneCueCount: 0,
    survivalBedrockCue: null,
    survivalEntryBedrockRows: null,
    survivalEntryBedrockRise: null,
  };

  async init(host: HTMLElement): Promise<void> {
    this.host = host;
    const app = new Application();
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
    app.canvas.dataset.testid = 'game-canvas';
    app.canvas.setAttribute('aria-label', 'TetraMorph 10 × 20 游戏棋盘');
    app.canvas.setAttribute('role', 'img');
    app.canvas.tabIndex = 0;
    host.appendChild(app.canvas);
    this.pieceGraphics.mask = this.pieceMaskGraphics;
    this.mutationGraphics.mask = this.mutationMaskGraphics;
    this.survivalEntryGraphics.mask = this.survivalEntryMaskGraphics;
    this.world.addChild(
      this.boardGraphics,
      this.pieceGraphics,
      this.survivalEntryGraphics,
      this.effectGraphics,
      this.mutationGraphics,
      this.mutationMaskGraphics,
      this.survivalEntryMaskGraphics,
      this.pieceMaskGraphics,
    );
    this.initializeMutationFilters();
    app.stage.addChild(this.world, this.previewGraphics);
    app.ticker.add(this.onTick);
    this.app = app;
  }

  setFrameCallback(callback: (deltaMs: number) => void): void {
    this.frameCallback = callback;
  }

  setOptions(options: Partial<RenderOptions>): void {
    const previousEntryRows = this.options.survivalEntryBedrockRows;
    const previousReducedMotion = this.options.reducedMotion;
    const previousModeSwitch = this.options.modeSwitch;
    const hasEntryRows = Object.prototype.hasOwnProperty.call(options, 'survivalEntryBedrockRows');
    const requestedEntryRows = hasEntryRows
      ? options.survivalEntryBedrockRows
      : previousEntryRows;
    const nextEntryRows = requestedEntryRows === null || requestedEntryRows === undefined
      ? null
      : Math.max(1, Math.min(3, Math.floor(requestedEntryRows)));
    this.options = {
      ...this.options,
      ...options,
      survivalEntryBedrockRows: nextEntryRows,
    };
    if (hasEntryRows && nextEntryRows !== previousEntryRows) {
      this.survivalEntryBedrockRise = nextEntryRows === null || this.options.reducedMotion
        ? null
        : {
            rows: nextEntryRows,
            elapsed: 0,
            duration: SURVIVAL_ENTRY_DURATION_MS,
          };
    }
    if (this.options.reducedMotion !== previousReducedMotion) {
      this.ordinaryMultiLineClearCues.length = 0;
    }
    if (this.options.reducedMotion && !previousReducedMotion) {
      this.presentation = null;
      this.trail = null;
      this.lockPulse = null;
      this.impact = 0;
      this.rotationPulse = 0;
      this.boardShift = null;
      this.survivalEntryBedrockRise = null;
      this.mutationArrival = null;
      // Keep the authoritative Mutation FIFO, timed fields, Collapse endpoint,
      // previous board, and active carrier identity. A runtime preference switch
      // simplifies motion but must never discard an activation that Core emitted.
      this.clearMutationParticles();
      this.resetMutationFilters();
      this.setWorldOffset(0, 0);
    }
    if (this.options.modeSwitch && !previousModeSwitch) this.ordinaryMultiLineClearCues.length = 0;
  }

  private syncCanvasSize(app: Application): void {
    const host = this.host;
    if (!host) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width <= 0 || height <= 0) return;
    if (app.screen.width === width && app.screen.height === height) return;
    // Pixi's resize plugin queues window resizes for the next animation frame.
    // A responsive settings sheet can restore the gameplay layout and open a
    // successor dialog in that same frame, so synchronize here before reading
    // DOM-owned HUD geometry for the canvas preview.
    app.resize();
  }

  render(state: GameState, events: readonly GameEvent[], deltaMs: number): void {
    const app = this.app;
    if (!app) return;
    this.syncCanvasSize(app);
    this.consumeEvents(events, state, this.previousBoard);
    this.syncMutationFields(state);
    this.advanceEffects(deltaMs);
    this.advanceSurvivalDebrisPresentation(state, deltaMs);
    this.advancePresentation(state, deltaMs);
    const layout = this.calculateLayout(app.screen.width, app.screen.height, state.status === 'ready');
    this.syncMutationFilters(state, layout);
    this.applyMutationCameraShake(layout);
    this.drawBoard(state, layout);
    this.drawPieces(state, layout);
    this.drawEffects(state, layout);
    this.drawPreviews(state, layout);
    this.updateSnapshot(state, layout, app);
    this.previousBoard = state.board;
  }

  getSnapshot(): RendererSnapshot {
    let activeParticleCount = 0;
    for (const particle of this.mutationParticles) {
      if (particle.active) activeParticleCount += 1;
    }
    return structuredClone({
      ...this.snapshot,
      classicFeedback: this.classicFeedbackCues.map((cue) => ({
        kind: cue.kind,
        elapsedMs: cue.elapsed,
        durationMs: cue.duration,
        cells: cue.cells.map((cell) => ({ ...cell })),
        rows: [...cue.rows],
        combo: cue.combo,
        tier: cue.tier,
      })),
      mutationActivation: this.mutationFlash
        ? {
            item: this.mutationFlash.item,
            elapsedMs: this.mutationFlash.elapsed,
            durationMs: this.mutationFlash.duration,
            phases: this.mutationFlash.timeline.samples(),
            particlesEmitted: this.mutationFlash.particlesEmitted,
            triggerColumns: [...this.mutationFlash.triggerColumns],
          }
        : null,
      mutationActivationQueueItems: this.mutationFlashQueue.map((request) => request.item),
      mutationActiveParticleCount: activeParticleCount,
      mutationCollapseTrail: null,
    });
  }

  /**
   * DEV-QA evidence export. Pixi rerenders the current stage into an unmounted
   * Canvas because the presented WebGL back buffer is intentionally not retained.
   * No Core, ticker, timeline, display-tree, or DOM state is changed.
   */
  captureBoardPng(): RendererBoardCapture {
    const app = this.app;
    if (!app) throw new Error('Renderer board capture requires a mounted renderer.');
    const frame = this.snapshot.board;
    if (frame.width <= 0 || frame.height <= 0) {
      throw new Error('Renderer board capture requires non-empty board geometry.');
    }
    const extracted = app.renderer.extract.canvas({
      target: app.stage,
      frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
      resolution: app.renderer.resolution,
      clearColor: canvasThemePalette(this.options.visualTheme).well,
      antialias: true,
    });
    if (!('toDataURL' in extracted)) {
      throw new Error('Renderer board capture requires an HTML Canvas export.');
    }
    const canvas = extracted as HTMLCanvasElement;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Renderer board capture cannot read extracted pixels.');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixelCount = canvas.width * canvas.height;
    const stride = Math.max(1, Math.floor(pixelCount / 8192));
    const buckets = new Set<string>();
    let samples = 0;
    let nonTransparentSamples = 0;
    for (let pixel = 0; pixel < pixelCount; pixel += stride) {
      const offset = pixel * 4;
      const alpha = pixels[offset + 3] ?? 0;
      samples += 1;
      if (alpha > 0) nonTransparentSamples += 1;
      buckets.add(
        `${(pixels[offset] ?? 0) >> 4}:${(pixels[offset + 1] ?? 0) >> 4}:`
        + `${(pixels[offset + 2] ?? 0) >> 4}:${alpha >> 4}`,
      );
    }
    return {
      dataUrl: canvas.toDataURL('image/png'),
      frame: {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      },
      resolution: app.renderer.resolution,
      outputPixels: { width: canvas.width, height: canvas.height },
      pixelProbe: {
        samples,
        nonTransparentSamples,
        distinctBuckets: buckets.size,
      },
    };
  }

  benchmark(state: GameState, iterations = 120): { meanMs: number; p95Ms: number; maxMs: number } {
    const samples: number[] = [];
    const count = Math.max(1, Math.min(500, Math.floor(iterations)));
    for (let index = 0; index < count; index += 1) {
      const start = performance.now();
      this.render(state, [], 0);
      samples.push(performance.now() - start);
    }
    samples.sort((left, right) => left - right);
    const meanMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    return {
      meanMs,
      p95Ms: samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))] ?? 0,
      maxMs: samples.at(-1) ?? 0,
    };
  }

  destroy(): void {
    const app = this.app;
    if (app) app.ticker.remove(this.onTick);
    this.frameCallback = null;
    this.destroyMutationFilters();
    for (const gradient of this.cellGradients.values()) gradient.destroy();
    this.cellGradients.clear();
    for (const gradient of this.overrideGradients.values()) gradient.destroy();
    this.overrideGradients.clear();
    this.bedrockTexture?.destroy(true);
    this.bedrockTexture = null;
    this.bedrockTextureUnavailable = false;
    this.freezeAtmosphereGradient?.destroy();
    this.freezeAtmosphereGradient = null;
    app?.destroy({ removeView: true }, { children: true });
    this.app = null;
    this.host = null;
    this.presentation = null;
    this.activeSpawnGenerationKey = null;
    this.activeSpawnEntry = null;
    this.lockPulse = null;
    this.ordinaryMultiLineClearCues.length = 0;
    this.classicFeedbackCues.length = 0;
    this.mutationFlash = null;
    this.mutationArrival = null;
    this.activeMutationCarrierId = null;
    this.clearSurvivalVisualState();
    this.clearMutationVisualState();
    this.previousBoard = null;
  }

  private readonly onTick = (ticker: Ticker): void => {
    this.frameCallback?.(Math.min(ticker.deltaMS, 100));
  };

  private calculateLayout(width: number, height: number, ready: boolean): BoardLayout {
    const hostBounds = this.host?.getBoundingClientRect();
    const boardElement = document.querySelector<HTMLElement>('[data-testid="board-frame"]');
    const requestedBounds = boardElement?.getBoundingClientRect();
    if (hostBounds && requestedBounds && requestedBounds.width > 0 && requestedBounds.height > 0) {
      const boardWidth = requestedBounds.width;
      return {
        x: requestedBounds.left - hostBounds.left,
        y: requestedBounds.top - hostBounds.top,
        width: boardWidth,
        height: requestedBounds.height,
        cell: boardWidth / BOARD_WIDTH,
        compact: requestedBounds.width <= 260,
      };
    }
    const compact = width < 620 && height > width * 1.05;
    const topBand = compact && !ready ? Math.min(96, height * 0.19) : 0;
    const horizontalAllowance = compact ? 18 : Math.min(260, width * 0.34);
    const cell = Math.max(8, Math.min((height - topBand - 24) / VISIBLE_HEIGHT, (width - horizontalAllowance) / BOARD_WIDTH));
    const boardWidth = cell * BOARD_WIDTH;
    const boardHeight = cell * VISIBLE_HEIGHT;
    return {
      x: (width - boardWidth) / 2,
      y: compact ? topBand + (height - topBand - boardHeight) / 2 : (height - boardHeight) / 2,
      width: boardWidth,
      height: boardHeight,
      cell,
      compact,
    };
  }

  private drawBoard(state: GameState, layout: BoardLayout): void {
    const graphics = this.boardGraphics;
    graphics.clear();
    const radius = Math.max(8, Math.min(12, layout.cell * 0.38));
    const palette = canvasThemePalette(this.options.visualTheme);
    const mutationWell = state.mode === 'sprint';
    graphics
      .roundRect(layout.x, layout.y, layout.width, layout.height, radius)
      .fill({ color: palette.well, alpha: 1 })
      .stroke({
        color: mutationWell ? palette.mutationEdge : palette.edge,
        alpha: .9,
        width: Math.max(1, layout.cell * 0.035),
      });
    if (mutationWell) {
      const inset = Math.max(3, layout.cell * 0.18);
      graphics
        .roundRect(
          layout.x + inset,
          layout.y + inset,
          layout.width - inset * 2,
          layout.height - inset * 2,
          Math.max(5, layout.cell * 0.2),
        )
        .stroke({ color: palette.mutationEdge, alpha: 0.28, width: Math.max(1, layout.cell * 0.026) });
    }
    this.scrimBounds = null;
    if (state.status === 'paused' || state.status === 'game-over' || state.status === 'finished' || this.options.modeSwitch) {
      const alpha = state.status === 'paused' ? 0.22 : this.options.modeSwitch ? 0.38 : 0.16;
      graphics.roundRect(layout.x, layout.y, layout.width, layout.height, radius).fill({ color: COLORS.scrim, alpha });
      this.scrimBounds = { x: layout.x, y: layout.y, width: layout.width, height: layout.height };
    }
  }

  private ordinaryMultiLineClearCueForState(state: GameState): OrdinaryMultiLineClearCue | null {
    if (state.phase !== 'line-clear' || state.pendingClearRows.length < 1 || state.pendingClearRows.length > 4) {
      return null;
    }
    const orderedRows = orderedLineClearRows(state.pendingClearRows);
    for (let index = this.ordinaryMultiLineClearCues.length - 1; index >= 0; index -= 1) {
      const cue = this.ordinaryMultiLineClearCues[index]!;
      if (
        cue.count === orderedRows.length
        && cue.orderedRows.every((row, rowOrder) => row === orderedRows[rowOrder])
      ) return cue;
    }
    return null;
  }

  private ordinaryMultiLineClearSampleForState(
    state: GameState,
    column: number,
    row: number,
    restrainedGeometry: boolean,
  ): Readonly<ClassicLineClearCellSample> | null {
    const cue = this.ordinaryMultiLineClearCueForState(state);
    return ordinaryLineClearCellSampleForState(
      state,
      column,
      row,
      cue?.restrained ?? restrainedGeometry,
      cue?.elapsed,
    );
  }

  private drawPieces(state: GameState, layout: BoardLayout): void {
    const graphics = this.pieceGraphics;
    graphics.clear();
    const entryGraphics = this.survivalEntryGraphics;
    entryGraphics.clear();
    const restrainedClearGeometry = this.options.reducedMotion || state.mode === 'endgame';
    this.survivalEntryMaskGraphics
      .clear()
      .rect(layout.x, layout.y, layout.width, layout.height)
      .fill({ color: 0xffffff, alpha: 1 });
    this.pieceMaskGraphics
      .clear()
      .rect(layout.x, layout.y, layout.width, layout.height)
      .fill({ color: 0xffffff, alpha: 1 });
    this.syncMutationArrival(state);
    this.syncActiveSpawnEntry(state);
    let visibleLockedCells = 0;
    const lockedByMaterial = new Map<BoardMaterial, Cell[]>();
    const mutationLockedCellKeys = state.mode === 'sprint'
      ? new Set(state.mutationCarriers.flatMap((carrier) => (
          carrier.cells.map((cell) => `${cell.x},${cell.y}`)
        )))
      : new Set<string>();
    const transitioningLockedCells: Array<{
      cell: Cell;
      material: BoardMaterial;
      alpha: number;
      scale: number;
    }> = [];
    const risingBedrockCells: Cell[] = [];
    const stagedBedrockRows = state.mode === 'race' && state.status === 'ready'
      ? this.options.survivalEntryBedrockRows
      : null;
    const firstVisibleBedrockY = stagedBedrockRows === null
      ? 0
      : VISIBLE_HEIGHT - stagedBedrockRows;
    const entryRiseActive = stagedBedrockRows !== null
      && !this.options.reducedMotion
      && this.survivalEntryBedrockRise?.rows === stagedBedrockRows;
    const entryRiseProgress = entryRiseActive
      ? survivalEntryRiseProgress(this.survivalEntryBedrockRise!.elapsed)
      : 1;
    const entryRiseOffsetY = entryRiseActive
      ? layout.cell * (1 - entryRiseProgress)
      : 0;
    const boardShiftOffsetY = this.boardShift && !this.options.reducedMotion
      ? boardShiftPresentationOffset(
          this.boardShift.direction,
          this.boardShift.elapsed,
          this.boardShift.duration,
          layout.cell,
        )
      : 0;

    this.drawCommittedOrdinaryMultiLineClearBodies(graphics, layout);

    state.board.forEach((row, boardY) => {
      if (boardY < VISIBLE_START_ROW) return;
      row.forEach((cell, x) => {
        if (!cell) return;
        const visibleY = boardY - VISIBLE_START_ROW;
        const clearSample = cell === ANCHOR_CELL || cell === BEDROCK_CELL
          ? null
          : this.ordinaryMultiLineClearSampleForState(
              state,
              x,
              boardY,
              restrainedClearGeometry,
            );
        if (clearSample?.complete) return;
        if (
          cell === BEDROCK_CELL
          && stagedBedrockRows !== null
          && visibleY < firstVisibleBedrockY
        ) return;
        visibleLockedCells += 1;
        // Mutation bodies are drawn once from their piece-level identity below. Keeping
        // them out of ordinary groups prevents seven-bag colour from leaking underneath.
        if (mutationLockedCellKeys.has(`${x},${boardY}`)) return;
        if (
          clearSample?.active
          && (clearSample.alpha < 0.999 || Math.abs(clearSample.scale - 1) > 0.001)
        ) {
          transitioningLockedCells.push({
            cell: { x, y: visibleY },
            material: cell,
            alpha: clearSample.alpha,
            scale: clearSample.scale,
          });
          return;
        }
        if (cell === BEDROCK_CELL && entryRiseActive) {
          risingBedrockCells.push({ x, y: visibleY });
          return;
        }
        const cells = lockedByMaterial.get(cell) ?? [];
        cells.push({ x, y: visibleY });
        lockedByMaterial.set(cell, cells);
      });
    });
    for (const [type, cells] of lockedByMaterial) {
      this.drawCellGroups(graphics, cells, type, 1, {
        originX: layout.x,
        originY: layout.y,
        unit: layout.cell,
        offsetY: boardShiftOffsetY,
      });
    }
    for (const transition of transitioningLockedCells) {
      this.drawCellGroups(graphics, [transition.cell], transition.material, transition.alpha, {
        originX: layout.x,
        originY: layout.y,
        unit: layout.cell,
        offsetY: boardShiftOffsetY,
        scale: transition.scale,
      });
    }
    if (risingBedrockCells.length > 0) {
      this.drawCellGroups(entryGraphics, risingBedrockCells, BEDROCK_CELL, 1, {
        originX: layout.x,
        originY: layout.y,
        unit: layout.cell,
        offsetY: entryRiseOffsetY,
      });
    }
    if (state.mode === 'race') {
      for (const pair of state.survivalDebris) {
        const presented = this.survivalDebrisPresentation.get(pair.id) ?? pair;
        const visiblePairCells = survivalDebrisCells(pair)
          .filter((cell) => (
            cell.y >= VISIBLE_START_ROW
            && cell.y < VISIBLE_START_ROW + VISIBLE_HEIGHT
          ))
          .map((cell) => ({ x: cell.x, y: cell.y - VISIBLE_START_ROW }));
        if (visiblePairCells.length === 0) continue;
        this.drawCellGroups(
          graphics,
          visiblePairCells,
          SURVIVAL_STONE_CELL,
          1,
          {
            originX: layout.x,
            originY: layout.y,
            unit: layout.cell,
            offsetY: boardShiftOffsetY + (presented.y - pair.y) * layout.cell,
          },
        );
      }
    }
    this.drawEndgameTargetMarkers(graphics, state, layout, boardShiftOffsetY);
    this.drawMutationCarrierMaterials(graphics, state, layout, boardShiftOffsetY);

    if (this.trail && !this.options.reducedMotion) {
      const progress = Math.min(1, this.trail.elapsed / this.trail.duration);
      this.drawHardDropTraces(graphics, this.trail, progress, layout, boardShiftOffsetY);
    }

    const drawableActive = state.status === 'ready' ? null : state.active;
    const activeCells = drawableActive ? cellsForPiece(drawableActive) : [];
    const ghostCells = drawableActive ? [...projectedLandingCells(state)] : [];

    const visibleGhostCells = ghostCells
      .filter((cell) => cell.y >= VISIBLE_START_ROW && cell.y < VISIBLE_START_ROW + VISIBLE_HEIGHT)
      .map((cell) => ({ x: cell.x, y: cell.y - VISIBLE_START_ROW }));
    const ghostOffsetX = this.presentation && drawableActive
      ? (this.presentation.x - drawableActive.x) * layout.cell
      : 0;
    const activeMutationItem = state.mode === 'sprint'
      ? state.mutationActiveCarrier?.item ?? null
      : null;
    const spawnEntryPending = this.activeSpawnEntry?.generationKey === this.activeSpawnGenerationKey
      && this.activeSpawnEntry.pending;
    const hasVisibleSpawnSlice = activeCells.some((cell) => (
      cell.y >= VISIBLE_START_ROW && cell.y < VISIBLE_START_ROW + VISIBLE_HEIGHT
    ));
    if (drawableActive && (!spawnEntryPending || hasVisibleSpawnSlice)) {
      const ghostOptions: GroupDrawOptions = {
        originX: layout.x,
        originY: layout.y,
        unit: layout.cell,
        offsetX: ghostOffsetX,
        ghost: true,
      };
      if (activeMutationItem) {
        this.drawMutationPieceMaterial(
          graphics,
          visibleGhostCells,
          drawableActive.type,
          activeMutationItem,
          0.82,
          'ghost',
          ghostOptions,
        );
      } else {
        this.drawCellGroups(graphics, visibleGhostCells, drawableActive.type, 0.82, ghostOptions);
      }
    }

    const offsetX = this.presentation && drawableActive && !this.options.reducedMotion
      ? (this.presentation.x - drawableActive.x) * layout.cell
      : 0;
    const rawOffsetY = this.presentation && drawableActive && !this.options.reducedMotion
      ? (this.presentation.y - drawableActive.y) * layout.cell
      : 0;
    const visibleActiveCells = activeCellsInsideVisibleRows(activeCells, VISIBLE_START_ROW, VISIBLE_HEIGHT)
      .map((cell) => ({ x: cell.x, y: cell.y - VISIBLE_START_ROW }));
    // While the higher spawn row is crossing the board mouth, preserve the Core-owned
    // vertical interpolation. The board-local mask clips the portion still above row 1.
    const offsetY = spawnEntryPending
      ? rawOffsetY
      : clampActivePresentationOffsetY(rawOffsetY, visibleActiveCells, layout.cell, VISIBLE_HEIGHT);
    const requestedRotationScale = this.options.reducedMotion ? 1 : 1 + this.rotationPulse * 0.035;
    const rotationScale = activePresentationScaleFitsVisibleWell(
      visibleActiveCells,
      offsetY,
      layout.cell,
      VISIBLE_HEIGHT,
      requestedRotationScale,
    )
      ? requestedRotationScale
      : 1;
    if (drawableActive) {
      if (
        !spawnEntryPending
        && activeUsesSupergravityLanding(state)
      ) {
        this.drawSupergravityPieceTrail(
          graphics,
          visibleActiveCells,
          layout,
          offsetX,
          offsetY,
        );
      }
      const activeOptions: GroupDrawOptions = {
        originX: layout.x,
        originY: layout.y,
        unit: layout.cell,
        offsetX,
        offsetY,
        active: true,
        scale: rotationScale,
      };
      if (activeMutationItem) {
        this.drawMutationPieceMaterial(
          graphics,
          visibleActiveCells,
          drawableActive.type,
          activeMutationItem,
          1,
          'active',
          activeOptions,
        );
      } else {
        this.drawCellGroups(graphics, visibleActiveCells, drawableActive.type, 1, activeOptions);
      }
      this.drawMutationMaterialArrivalPulse(
        graphics,
        visibleActiveCells,
        activeMutationItem,
        layout,
        offsetX,
        offsetY,
      );
    }

    this.snapshot.visibleLockedCells = visibleLockedCells;
    this.snapshot.boardShiftOffsetY = boardShiftOffsetY;
    this.snapshot.survivalEntryBedrockRows = stagedBedrockRows;
    this.snapshot.survivalEntryBedrockRise = entryRiseActive
      ? {
          rows: stagedBedrockRows!,
          elapsedMs: this.survivalEntryBedrockRise!.elapsed,
          durationMs: this.survivalEntryBedrockRise!.duration,
          offsetY: entryRiseOffsetY,
        }
      : null;
    this.pieceGraphics.alpha = this.options.modeSwitch ? 0.34 : 1;
    this.survivalEntryGraphics.alpha = this.options.modeSwitch ? 0.34 : 1;
    this.effectGraphics.alpha = this.options.modeSwitch ? 0.2 : 1;
    this.mutationGraphics.alpha = this.options.modeSwitch ? 0.2 : 1;
  }

  private drawEndgameTargetMarkers(
    graphics: Graphics,
    state: GameState,
    layout: BoardLayout,
    offsetY: number,
  ): void {
    if (state.mode !== 'endgame' || state.endgameTargetCells.length === 0) return;
    const inset = Math.max(2, layout.cell * 0.19);
    const bracket = Math.max(5, layout.cell * 0.36);
    const stroke = Math.max(1, layout.cell * 0.038);
    for (const cell of state.endgameTargetCells) {
      if (cell.y < VISIBLE_START_ROW || cell.y >= VISIBLE_START_ROW + VISIBLE_HEIGHT) continue;
      const clearSample = this.ordinaryMultiLineClearSampleForState(state, cell.x, cell.y, true);
      if (clearSample?.complete) continue;
      const material = state.board[cell.y]?.[cell.x];
      if (!material || material === ANCHOR_CELL || material === BEDROCK_CELL) continue;
      const x = layout.x + cell.x * layout.cell + inset;
      const y = layout.y + (cell.y - VISIBLE_START_ROW) * layout.cell + inset + offsetY;
      graphics.moveTo(x + bracket, y)
        .lineTo(x, y)
        .lineTo(x, y + bracket)
        .stroke({ color: COLORS.target, alpha: 0.76 * (clearSample?.alpha ?? 1), width: stroke });
    }
  }

  private mutationMaterial(item: MutationItem): MutationMaterial {
    return MUTATION_MATERIALS[item];
  }

  private syncMutationArrival(state: GameState): void {
    const carrierId = state.mode === 'sprint' && state.active && state.mutationActiveCarrier
      ? state.mutationActiveCarrier.id
      : null;
    if (carrierId === this.activeMutationCarrierId) return;
    this.activeMutationCarrierId = carrierId;
    this.mutationArrival = carrierId === null || this.options.reducedMotion
      ? null
      : { carrierId, elapsed: 0, duration: 150 };
  }

  private drawMutationCarrierMaterials(
    graphics: Graphics,
    state: GameState,
    layout: BoardLayout,
    offsetY: number,
  ): void {
    if (state.mode !== 'sprint') return;
    for (const carrier of state.mutationCarriers) {
      const stableByMaterial = new Map<BoardMaterial, Cell[]>();
      const transitioningCells: Array<{
        cell: Cell;
        material: BoardMaterial;
        alpha: number;
        scale: number;
      }> = [];
      for (const cell of carrier.cells) {
        if (cell.y < VISIBLE_START_ROW || cell.y >= VISIBLE_START_ROW + VISIBLE_HEIGHT) continue;
        const boardMaterial = state.board[cell.y]?.[cell.x];
        if (!boardMaterial) continue;
        const sample = this.ordinaryMultiLineClearSampleForState(
          state,
          cell.x,
          cell.y,
          this.options.reducedMotion,
        );
        if (sample?.complete) continue;
        const visibleCell = { x: cell.x, y: cell.y - VISIBLE_START_ROW };
        if (sample?.active) {
          transitioningCells.push({
            cell: visibleCell,
            material: boardMaterial,
            alpha: sample.alpha,
            scale: sample.scale,
          });
        } else {
          const stableCells = stableByMaterial.get(boardMaterial) ?? [];
          stableCells.push(visibleCell);
          stableByMaterial.set(boardMaterial, stableCells);
        }
      }
      for (const [material, stableCells] of stableByMaterial) {
        this.drawMutationPieceMaterial(
          graphics,
          stableCells,
          material,
          carrier.item,
          1,
          'settled',
          {
            originX: layout.x,
            originY: layout.y,
            unit: layout.cell,
            offsetY,
          },
        );
      }
      for (const transition of transitioningCells) {
        this.drawMutationPieceMaterial(
          graphics,
          [transition.cell],
          transition.material,
          carrier.item,
          transition.alpha,
          'clear',
          {
            originX: layout.x,
            originY: layout.y,
            unit: layout.cell,
            offsetY,
            scale: transition.scale,
          },
        );
      }
    }
  }

  /** Draws one complete item material; ordinary seven-bag colour is never underneath. */
  private drawMutationPieceMaterial(
    graphics: Graphics,
    cells: readonly Cell[],
    type: BoardMaterial,
    item: MutationItem,
    alpha: number,
    role: MutationMaterialRole,
    options: GroupDrawOptions,
  ): void {
    if (cells.length === 0 || alpha <= 0) return;
    const material = this.mutationMaterial(item);
    this.drawCellGroups(graphics, cells, type, alpha, { ...options, material });
    this.drawMutationMaterialDetails(graphics, cells, item, alpha, role, options);
  }

  /** Triangular facets and sparse motifs describe material, never a trigger location. */
  private drawMutationMaterialDetails(
    graphics: Graphics,
    cells: readonly Cell[],
    item: MutationItem,
    alpha: number,
    role: MutationMaterialRole,
    options: GroupDrawOptions,
  ): void {
    if (cells.length === 0 || alpha <= 0) return;
    const material = this.mutationMaterial(item);
    const strength = MUTATION_MATERIAL_STRENGTH[role];
    const token = MUTATION_VFX_TOKENS[item];
    const pulse = role === 'active' && !this.options.reducedMotion
      ? .96 + Math.sin(this.mutationClockMs / token.animation.pulseMs * Math.PI * 2) * .04
      : 1;
    const scale = options.scale ?? 1;
    const offsetX = options.offsetX ?? 0;
    const offsetY = options.offsetY ?? 0;
    for (const component of orthogonalCellComponents(cells)) {
      const minX = Math.min(...component.map((cell) => cell.x));
      const maxX = Math.max(...component.map((cell) => cell.x));
      const minY = Math.min(...component.map((cell) => cell.y));
      const maxY = Math.max(...component.map((cell) => cell.y));
      const componentCenterX = options.originX + ((minX + maxX + 1) * options.unit) / 2;
      const componentCenterY = options.originY + ((minY + maxY + 1) * options.unit) / 2;
      const entries = component.map((cell) => {
        const baseX = options.originX + cell.x * options.unit;
        const baseY = options.originY + cell.y * options.unit;
        const x = componentCenterX + (baseX - componentCenterX) * scale + offsetX;
        const y = componentCenterY + (baseY - componentCenterY) * scale + offsetY;
        const size = options.unit * scale;
        return { cell, x, y, size, centerX: x + size / 2, centerY: y + size / 2 };
      });

      if (role !== 'ghost' && strength.facet > 0) {
        for (const entry of entries) {
          const inset = Math.max(1, entry.size * .13);
          const left = entry.x + inset;
          const top = entry.y + inset;
          const right = entry.x + entry.size - inset;
          const bottom = entry.y + entry.size - inset;
          const nodeX = entry.x + entry.size * .54;
          const nodeY = entry.y + entry.size * .46;
          graphics
            .moveTo(left, top)
            .lineTo(right, top)
            .lineTo(nodeX, nodeY)
            .lineTo(left, top)
            .fill({ color: material.innerEdge, alpha: alpha * strength.facet * .46 * pulse })
            .moveTo(right, bottom)
            .lineTo(left, bottom)
            .lineTo(nodeX, nodeY)
            .lineTo(right, bottom)
            .fill({ color: material.edge, alpha: alpha * strength.facet * .36 });
          this.strokeSegments(graphics, [
            [left, top, nodeX, nodeY],
            [nodeX, nodeY, right, bottom],
          ], material.facet, alpha * strength.facet * .78, Math.max(.8, entry.size * .026));
        }
      }

      const motifEntries = entries.length <= 2
        ? entries
        : [entries[0]!, entries[Math.floor((entries.length - 1) / 2)]!, entries.at(-1)!]
          .filter((entry, index, list) => list.indexOf(entry) === index);
      const motifAlpha = alpha * strength.motif * pulse;
      const motifStroke = Math.max(1, options.unit * scale * .042);
      if (item === 'freeze') {
        for (const entry of motifEntries.slice(0, role === 'ghost' ? 1 : 3)) {
          const reach = entry.size * .27;
          this.strokeSegments(graphics, [
            [entry.centerX - reach, entry.centerY - reach * .72, entry.centerX + reach * .12, entry.centerY + reach * .05],
            [entry.centerX + reach * .12, entry.centerY + reach * .05, entry.centerX + reach, entry.centerY + reach * .62],
            [entry.centerX + reach * .08, entry.centerY, entry.centerX + reach * .54, entry.centerY - reach * .52],
          ], material.glow, motifAlpha * .72, motifStroke);
        }
      } else if (item === 'bomb') {
        for (const entry of motifEntries.slice(0, role === 'ghost' ? 1 : 3)) {
          const reach = entry.size * .3;
          this.strokeSegments(graphics, [
            [entry.centerX - reach, entry.centerY - reach * .7, entry.centerX - reach * .04, entry.centerY],
            [entry.centerX - reach * .04, entry.centerY, entry.centerX + reach, entry.centerY + reach * .64],
            [entry.centerX - reach * .04, entry.centerY, entry.centerX + reach * .5, entry.centerY - reach * .66],
          ], material.glow, motifAlpha * .88, motifStroke * 1.08);
        }
      } else if (item === 'multiplier') {
        const [primary, secondary] = motifEntries;
        if (primary) {
          this.drawMutationStar(
            graphics,
            primary.centerX,
            primary.centerY,
            primary.size * .16,
            primary.size * .055,
            material.glow,
            motifAlpha * .9,
          );
        }
        if (secondary && secondary !== primary && role !== 'ghost') {
          this.drawMutationStar(
            graphics,
            secondary.centerX + secondary.size * .08,
            secondary.centerY - secondary.size * .1,
            secondary.size * .09,
            secondary.size * .028,
            material.innerEdge,
            motifAlpha * .72,
          );
        }
      } else {
        for (const entry of motifEntries.slice(0, 2)) {
          const radius = Math.max(1.4, entry.size * (role === 'ghost' ? .1 : .13));
          graphics
            .circle(entry.centerX, entry.centerY, radius)
            .fill({ color: material.edge, alpha: motifAlpha * .74 })
            .circle(entry.centerX, entry.centerY, radius * .48)
            .fill({ color: material.fillEnd, alpha: motifAlpha * .84 })
            .circle(entry.centerX - radius * .18, entry.centerY - radius * .22, radius * .16)
            .fill({ color: material.glow, alpha: motifAlpha * .56 });
        }
      }

      this.drawMutationMaterialRim(
        graphics,
        component,
        item,
        options,
        alpha * strength.rim * pulse,
      );
    }
  }

  private drawMutationDiamond(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    color: number,
    alpha: number,
  ): void {
    graphics
      .moveTo(centerX, centerY - radiusY)
      .lineTo(centerX + radiusX, centerY)
      .lineTo(centerX, centerY + radiusY)
      .lineTo(centerX - radiusX, centerY)
      .lineTo(centerX, centerY - radiusY)
      .fill({ color, alpha });
  }

  private drawMutationStar(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number,
    color: number,
    alpha: number,
  ): void {
    const points = 8;
    for (let index = 0; index <= points; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 4;
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (index === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
    graphics.fill({ color, alpha });
  }

  private drawMutationMaterialRim(
    graphics: Graphics,
    cells: readonly Cell[],
    item: MutationItem,
    options: GroupDrawOptions,
    alpha = 1,
    width = Math.max(1, options.unit * 0.056),
  ): void {
    if (cells.length === 0 || alpha <= 0) return;
    const scale = options.scale ?? 1;
    const offsetX = options.offsetX ?? 0;
    const offsetY = options.offsetY ?? 0;
    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const componentCenterX = options.originX + ((minX + maxX + 1) * options.unit) / 2;
    const componentCenterY = options.originY + ((minY + maxY + 1) * options.unit) / 2;
    const size = options.unit * scale;
    const inset = Math.max(1, size * .12);
    const material = this.mutationMaterial(item);
    const segments: Array<readonly [number, number, number, number]> = [];
    const accents: Array<readonly [number, number, number, number]> = [];
    const pushBroken = (x1: number, y1: number, x2: number, y2: number): void => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      segments.push(
        [x1, y1, x1 + dx * .38, y1 + dy * .38],
        [x1 + dx * .62, y1 + dy * .62, x2, y2],
      );
    };
    for (const { cell, exposed } of exposedCellEdges(cells)) {
      const baseX = options.originX + cell.x * options.unit;
      const baseY = options.originY + cell.y * options.unit;
      const x = componentCenterX + (baseX - componentCenterX) * scale + offsetX;
      const y = componentCenterY + (baseY - componentCenterY) * scale + offsetY;
      const right = x + size;
      const bottom = y + size;
      const top: readonly [number, number, number, number] = [x + inset, y + inset, right - inset, y + inset];
      const rightEdge: readonly [number, number, number, number] = [right - inset, y + inset, right - inset, bottom - inset];
      const bottomEdge: readonly [number, number, number, number] = [right - inset, bottom - inset, x + inset, bottom - inset];
      const left: readonly [number, number, number, number] = [x + inset, bottom - inset, x + inset, y + inset];
      if (item === 'freeze') {
        if (exposed.top) pushBroken(...top);
        if (exposed.right) pushBroken(...rightEdge);
        if (exposed.bottom) pushBroken(...bottomEdge);
        if (exposed.left) pushBroken(...left);
        if (exposed.top && exposed.left) {
          accents.push([x + inset, y + inset * 1.9, x + inset * 1.9, y + inset]);
        }
        if (exposed.bottom && exposed.right) {
          accents.push([right - inset * 1.9, bottom - inset, right - inset, bottom - inset * 1.9]);
        }
      } else {
        if (exposed.top) segments.push(top);
        if (exposed.right) segments.push(rightEdge);
        if (exposed.bottom) segments.push(bottomEdge);
        if (exposed.left) segments.push(left);
      }
      if (item === 'collapse' && exposed.bottom && accents.length < 3) {
        const centerX = x + size / 2;
        const baseline = bottom - inset * .72;
        accents.push(
          [x + inset * 1.25, baseline, right - inset * 1.25, baseline],
          [centerX - size * .18, baseline + inset * .22, centerX, baseline + inset * .72],
          [centerX, baseline + inset * .72, centerX + size * .18, baseline + inset * .22],
        );
      }
    }
    this.strokeSegments(
      graphics,
      segments,
      item === 'bomb' ? material.glow : item === 'collapse' ? material.fillStart : material.innerEdge,
      alpha,
      item === 'collapse' ? width * 1.18 : width,
    );
    if (accents.length > 0) {
      this.strokeSegments(graphics, accents, material.innerEdge, Math.min(1, alpha * 1.08), Math.max(1, width * .78));
    }
  }

  private drawMutationMaterialArrivalPulse(
    graphics: Graphics,
    cells: readonly Cell[],
    item: MutationItem | null,
    layout: BoardLayout,
    offsetX: number,
    offsetY: number,
  ): void {
    if (!item || !this.mutationArrival || this.options.reducedMotion || cells.length === 0) return;
    const progress = Math.min(1, this.mutationArrival.elapsed / this.mutationArrival.duration);
    const alpha = 0.86 * (1 - easeOutCubic(progress));
    this.drawMutationMaterialRim(
      graphics,
      cells,
      item,
      {
        originX: layout.x,
        originY: layout.y,
        unit: layout.cell,
        offsetX,
        offsetY,
      },
      alpha,
      Math.max(1, layout.cell * 0.082),
    );
  }

  private drawCellGroups(
    graphics: Graphics,
    cells: readonly Cell[],
    type: BoardMaterial,
    alpha: number,
    options: GroupDrawOptions,
  ): void {
    for (const component of orthogonalCellComponents(cells)) {
      this.drawCellComponent(graphics, component, type, alpha, options);
    }
  }

  private materialFor(type: BoardMaterial) {
    if (type === ANCHOR_CELL) return ANCHOR_MATERIAL;
    if (type === BEDROCK_CELL) return BEDROCK_MATERIAL;
    if (type === SURVIVAL_STONE_CELL) return SURVIVAL_STONE_MATERIAL;
    return PIECE_MATERIALS[type];
  }

  private gradientFor(type: BoardMaterial, materialOverride?: PieceMaterial): FillGradient {
    if (materialOverride) {
      const existingOverride = this.overrideGradients.get(materialOverride);
      if (existingOverride) return existingOverride;
      const gradient = this.createGradient(materialOverride);
      this.overrideGradients.set(materialOverride, gradient);
      return gradient;
    }
    const existing = this.cellGradients.get(type);
    if (existing) return existing;
    const gradient = this.createGradient(this.materialFor(type));
    this.cellGradients.set(type, gradient);
    return gradient;
  }

  private createGradient(material: PieceMaterial): FillGradient {
    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: material.fillStart },
        { offset: 1, color: material.fillEnd },
      ],
    });
    return gradient;
  }

  private drawCellComponent(
    graphics: Graphics,
    cells: readonly Cell[],
    type: BoardMaterial,
    alpha: number,
    options: GroupDrawOptions,
  ): void {
    if (!cells.length) return;
    const scale = options.scale ?? 1;
    const offsetX = options.offsetX ?? 0;
    const offsetY = options.offsetY ?? 0;
    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const centerX = options.originX + ((minX + maxX + 1) * options.unit) / 2;
    const centerY = options.originY + ((minY + maxY + 1) * options.unit) / 2;
    const scaledUnit = options.unit * scale;
    const baseGap = Math.max(CELL_STYLE.gapFloor, Math.min(CELL_STYLE.gapMin, options.unit * CELL_STYLE.gapRatio));
    const ghostInset = options.ghost
      ? Math.max(CELL_STYLE.ghostInsetMin, options.unit * CELL_STYLE.ghostInsetRatio)
      : 0;
    // Falling stones own the complete logical cell footprint. This keeps one stone
    // the same size as one board cell and makes a vertical pair meet edge-to-edge.
    const gap = type === SURVIVAL_STONE_CELL && !options.ghost
      ? 0
      : (baseGap + ghostInset) * scale;
    const size = scaledUnit - gap * 2;
    const material = options.material ?? this.materialFor(type);
    const radius = Math.max(CELL_STYLE.radiusMin, Math.min(CELL_STYLE.radiusMax, size * CELL_STYLE.radiusRatio));
    const borderWidth = Math.max(
      CELL_STYLE.edgeWidthMin,
      Math.min(CELL_STYLE.edgeWidthMax, size * CELL_STYLE.edgeWidthRatio),
    );
    const faceInset = Math.max(
      CELL_STYLE.faceInsetMin,
      Math.min(CELL_STYLE.faceInsetMax, size * CELL_STYLE.faceInsetRatio),
    );
    const faceBevelWidth = Math.max(
      CELL_STYLE.faceBevelWidthMin,
      Math.min(CELL_STYLE.faceBevelWidthMax, size * CELL_STYLE.faceBevelWidthRatio),
    );
    const seamGrooveWidth = Math.max(
      CELL_STYLE.seamGrooveWidthMin,
      Math.min(CELL_STYLE.seamGrooveWidthMax, size * CELL_STYLE.seamGrooveWidthRatio),
    );
    const seamLipWidth = Math.max(
      CELL_STYLE.seamLipWidthMin,
      Math.min(CELL_STYLE.seamLipWidthMax, size * CELL_STYLE.seamLipWidthRatio),
    );
    const geology = type === BEDROCK_CELL || type === SURVIVAL_STONE_CELL;
    const occupied = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
    const geometry = exposedCellEdges(cells).map(({ cell, exposed }) => {
      const baseX = options.originX + cell.x * options.unit;
      const baseY = options.originY + cell.y * options.unit;
      return {
        cell,
        exposed,
        x: centerX + (baseX - centerX) * scale + offsetX + gap,
        y: centerY + (baseY - centerY) * scale + offsetY + gap,
      };
    });

    if (geology) {
      if (type === BEDROCK_CELL) {
        this.drawBedrockBody(graphics, geometry, size, material, alpha);
      } else {
        this.drawStoneBodies(graphics, geometry, size, material, alpha);
      }
      return;
    }

    if (!options.ghost) {
      for (const entry of geometry) {
        graphics.roundRect(entry.x, entry.y, size, size, radius);
      }
      for (const entry of geometry) {
        if (!entry.exposed.right) graphics.rect(entry.x + size, entry.y, gap * 2, size);
        if (!entry.exposed.bottom) graphics.rect(entry.x, entry.y + size, size, gap * 2);
        if (
          !entry.exposed.right
          && !entry.exposed.bottom
          && occupied.has(`${entry.cell.x + 1},${entry.cell.y + 1}`)
        ) {
          graphics.rect(entry.x + size, entry.y + size, gap * 2, gap * 2);
        }
      }
      if (options.faceColor === undefined) graphics.fill({ fill: this.gradientFor(type, options.material), alpha });
      else graphics.fill({ color: options.faceColor, alpha });
      if (options.faceColor !== undefined) return;

      const faceSignalSegments: Array<[number, number, number, number]> = [];
      const faceDarkSegments: Array<[number, number, number, number]> = [];
      for (const entry of geometry) {
        const left = entry.x + faceInset;
        const top = entry.y + faceInset;
        const right = entry.x + size - faceInset;
        const bottom = entry.y + size - faceInset;
        faceSignalSegments.push([left, top, right, top], [left, bottom, left, top]);
        faceDarkSegments.push([right, top, right, bottom], [right, bottom, left, bottom]);
      }
      this.strokeSegments(
        graphics,
        faceSignalSegments,
        material.innerEdge,
        Math.min(CELL_STYLE.faceSignalAlpha, alpha),
        faceBevelWidth,
      );
      this.strokeSegments(
        graphics,
        faceDarkSegments,
        material.edge,
        Math.min(CELL_STYLE.faceDarkAlpha, alpha),
        faceBevelWidth,
      );
      // One quiet facet language keeps ordinary and Mutation bodies related without
      // turning the seven-colour baseline into another effects layer.
      for (const entry of geometry) {
        const inset = Math.max(1, size * .14);
        const left = entry.x + inset;
        const top = entry.y + inset;
        const right = entry.x + size - inset;
        const bottom = entry.y + size - inset;
        const nodeX = entry.x + size * .54;
        const nodeY = entry.y + size * .46;
        graphics
          .moveTo(left, top)
          .lineTo(right, top)
          .lineTo(nodeX, nodeY)
          .lineTo(left, top)
          .fill({ color: material.innerEdge, alpha: Math.min(CELL_STYLE.facetLightAlpha, alpha) })
          .moveTo(right, bottom)
          .lineTo(left, bottom)
          .lineTo(nodeX, nodeY)
          .lineTo(right, bottom)
          .fill({ color: material.edge, alpha: Math.min(CELL_STYLE.facetDarkAlpha, alpha) });
      }
    }

    const componentX = (x: number): number => (
      centerX + (options.originX + x * options.unit - centerX) * scale + offsetX
    );
    const componentY = (y: number): number => (
      centerY + (options.originY + y * options.unit - centerY) * scale + offsetY
    );
    const seamSegments = internalCellSeams(cells).map((seam) => {
      const startX = componentX(seam.start.x);
      const startY = componentY(seam.start.y);
      const endX = componentX(seam.end.x);
      const endY = componentY(seam.end.y);
      return seam.orientation === 'vertical'
        ? [startX, startY + gap, endX, endY - gap] as const
        : [startX + gap, startY, endX - gap, endY] as const;
    });
    const seamLipOffset = seamGrooveWidth * CELL_STYLE.seamLipOffsetRatio;

    const segments = new Map<CellEdge, Array<[number, number, number, number]>>([
      ['top', []], ['right', []], ['bottom', []], ['left', []],
    ]);
    for (const entry of geometry) {
      const left = entry.x;
      const top = entry.y;
      const right = entry.x + size;
      const bottom = entry.y + size;
      const corner = options.ghost ? 0 : radius * 0.55;
      if (entry.exposed.top) segments.get('top')!.push([
        left + (entry.exposed.left ? corner : -gap), top,
        right + (entry.exposed.right ? -corner : gap), top,
      ]);
      if (entry.exposed.right) segments.get('right')!.push([
        right, top + (entry.exposed.top ? corner : -gap),
        right, bottom + (entry.exposed.bottom ? -corner : gap),
      ]);
      if (entry.exposed.bottom) segments.get('bottom')!.push([
        right + (entry.exposed.right ? -corner : gap), bottom,
        left + (entry.exposed.left ? corner : -gap), bottom,
      ]);
      if (entry.exposed.left) segments.get('left')!.push([
        left, bottom + (entry.exposed.bottom ? -corner : gap),
        left, top + (entry.exposed.top ? corner : -gap),
      ]);
    }

    if (options.ghost) {
      this.strokeSegments(graphics, [...segments.values()].flat(), material.innerEdge,
        Math.min(CELL_STYLE.ghostStrokeAlpha, alpha), CELL_STYLE.ghostStrokeWidth);
      this.strokeSegments(
        graphics,
        seamSegments,
        material.innerEdge,
        Math.min(CELL_STYLE.ghostSeamAlpha, alpha),
        CELL_STYLE.ghostSeamWidth,
      );
    } else if (options.active) {
      this.strokeSegments(
        graphics,
        seamSegments,
        material.edge,
        Math.min(CELL_STYLE.seamGrooveAlpha, alpha),
        seamGrooveWidth,
      );
      this.strokeSegments(
        graphics,
        seamSegments.map(([startX, startY, endX, endY]) => (
          startX === endX
            ? [startX + seamLipOffset, startY, endX + seamLipOffset, endY] as const
            : [startX, startY + seamLipOffset, endX, endY + seamLipOffset] as const
        )),
        material.innerEdge,
        Math.min(CELL_STYLE.seamLipAlpha, alpha),
        seamLipWidth,
      );
      this.strokeSegments(graphics, [...segments.values()].flat(), material.innerEdge, Math.min(1, alpha), borderWidth);
    } else {
      this.strokeSegments(
        graphics,
        seamSegments,
        material.edge,
        Math.min(CELL_STYLE.seamGrooveAlpha, alpha),
        seamGrooveWidth,
      );
      this.strokeSegments(
        graphics,
        seamSegments.map(([startX, startY, endX, endY]) => (
          startX === endX
            ? [startX + seamLipOffset, startY, endX + seamLipOffset, endY] as const
            : [startX, startY + seamLipOffset, endX, endY + seamLipOffset] as const
        )),
        material.innerEdge,
        Math.min(CELL_STYLE.seamLipAlpha, alpha),
        seamLipWidth,
      );
      this.strokeSegments(graphics, [...segments.get('top')!, ...segments.get('left')!], material.innerEdge,
        Math.min(CELL_STYLE.reliefSignalAlpha, alpha), borderWidth);
      this.strokeSegments(graphics, [...segments.get('bottom')!, ...segments.get('right')!], material.edge,
        Math.min(CELL_STYLE.reliefDarkAlpha, alpha), borderWidth);
    }
  }

  private textureForBedrock(): Texture | null {
    if (this.bedrockTexture) return this.bedrockTexture;
    if (this.bedrockTextureUnavailable || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) {
      this.bedrockTextureUnavailable = true;
      return null;
    }
    const image = context.createImageData(canvas.width, canvas.height);
    image.data.set(buildBedrockTexturePixels(canvas.width, canvas.height));
    context.putImageData(image, 0, 0);
    const texture = Texture.from(canvas, true);
    texture.label = 'procedural-bedrock-wall';
    this.bedrockTexture = texture;
    return texture;
  }

  /** Draws one flat-contact cavern wall with a continuous procedural rock face. */
  private drawBedrockBody(
    graphics: Graphics,
    cells: readonly { cell: Cell; x: number; y: number }[],
    size: number,
    material: PieceMaterial,
    alpha: number,
  ): void {
    const ordered = [...cells].sort((first, second) => (
      first.cell.y - second.cell.y || first.cell.x - second.cell.x
    ));
    const first = ordered[0];
    if (!first) return;
    const minCellX = Math.min(...ordered.map(({ cell }) => cell.x));
    const maxCellX = Math.max(...ordered.map(({ cell }) => cell.x));
    const minCellY = Math.min(...ordered.map(({ cell }) => cell.y));
    const maxCellY = Math.max(...ordered.map(({ cell }) => cell.y));
    const rectangular = ordered.length === (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1);
    if (!rectangular) {
      this.drawStoneBodies(graphics, ordered, size, material, alpha, true);
      return;
    }

    const left = Math.min(...ordered.map(({ x }) => x));
    const top = Math.min(...ordered.map(({ y }) => y));
    const right = Math.max(...ordered.map(({ x }) => x + size));
    const bottom = Math.max(...ordered.map(({ y }) => y + size));
    const width = right - left;
    const height = bottom - top;
    const bedrockTexture = this.textureForBedrock();
    graphics
      .rect(left, top, width, height)
      .fill(bedrockTexture
        ? { texture: bedrockTexture, textureSpace: 'local', alpha }
        : { fill: this.gradientFor(BEDROCK_CELL), alpha });

    graphics
      .poly(buildRockLip(left, top, width, size).flatMap(([x, y]) => [x, y]))
      .fill({ color: material.innerEdge, alpha: Math.min(alpha, alpha * 0.28) });

    this.strokeSegments(
      graphics,
      [[left, top, right, top]],
      material.innerEdge,
      Math.min(0.38, alpha * 0.38),
      Math.max(1, size * 0.04),
    );
  }

  /** Draws each falling rock at full cell size; adjacent event cells meet without a gap. */
  private drawStoneBodies(
    graphics: Graphics,
    cells: readonly { cell: Cell; x: number; y: number }[],
    size: number,
    material: PieceMaterial,
    alpha: number,
    compacted = false,
  ): void {
    const ordered = [...cells].sort((first, second) => (
      first.cell.y - second.cell.y || first.cell.x - second.cell.x
    ));
    for (const entry of ordered) {
      const left = entry.x;
      const top = entry.y;
      const bodySize = size;
      const right = left + bodySize;
      const bottom = top + bodySize;
      const bevel = Math.max(1.25, bodySize * 0.13);
      const gradientType = compacted ? BEDROCK_CELL : SURVIVAL_STONE_CELL;
      graphics
        .rect(left, top, bodySize, bodySize)
        .fill({ fill: this.gradientFor(gradientType), alpha })
        .stroke({
          color: material.edge,
          alpha: Math.min(compacted ? 0.86 : 0.96, alpha),
          width: Math.max(1, size * 0.045),
        });

      graphics
        .poly([
          left, top,
          right, top,
          right - bevel, top + bevel,
          left + bevel, top + bevel,
        ])
        .fill({ color: material.innerEdge, alpha: Math.min(compacted ? 0.16 : 0.28, alpha * 0.3) });
      graphics
        .poly([
          left, top,
          left + bevel, top + bevel,
          left + bevel, bottom - bevel,
          left, bottom,
        ])
        .fill({ color: material.innerEdge, alpha: Math.min(compacted ? 0.1 : 0.16, alpha * 0.18) });
      graphics
        .poly([
          right - bevel, top + bevel,
          right, top,
          right, bottom,
          left, bottom,
          left + bevel, bottom - bevel,
          right - bevel, bottom - bevel,
        ])
        .fill({ color: material.edge, alpha: Math.min(compacted ? 0.19 : 0.25, alpha * 0.28) });
    }
  }

  private strokeSegments(
    graphics: Graphics,
    segments: ReadonlyArray<readonly [number, number, number, number]>,
    color: number,
    alpha: number,
    width: number,
  ): void {
    if (!segments.length || alpha <= 0) return;
    for (const [startX, startY, endX, endY] of segments) {
      graphics.moveTo(startX, startY).lineTo(endX, endY);
    }
    graphics.stroke({ color, alpha, width });
  }

  private drawSurvivalPressureEffects(
    graphics: Graphics,
    state: GameState,
    layout: BoardLayout,
  ): void {
    if (state.mode !== 'race') return;

    const warningColor = COLORS.target;
    const pulseWave = this.options.reducedMotion
      ? 1
      : 0.5 + 0.5 * Math.sin((this.mutationClockMs / 800) * Math.PI * 2);
    // The arrow itself is the complete warning. Compress its bright endpoint into a
    // short pulse without tinting the board, source column, pieces, Ghost, or wall.
    const warningFlash = this.options.reducedMotion ? 1 : pulseWave ** 4;
    for (const column of state.survivalDebrisWarningColumns) {
      const centerX = layout.x + (column + 0.5) * layout.cell;
      const top = layout.y + Math.max(2, layout.cell * 0.08);
      const markerWidth = layout.cell * 0.29;
      const markerBottom = top + layout.cell * 0.92;
      this.strokeSegments(graphics, [
        [centerX, top, centerX, markerBottom],
        [centerX - markerWidth, markerBottom - markerWidth, centerX, markerBottom],
        [centerX, markerBottom, centerX + markerWidth, markerBottom - markerWidth],
      ], warningColor, this.options.reducedMotion ? 0.98 : 0.2 + warningFlash * 0.8,
      Math.max(1.8, layout.cell * 0.085));
    }

    for (const cue of this.survivalStoneCues) {
      const progress = Math.min(1, cue.elapsed / cue.duration);
      const eased = easeOutCubic(progress);
      const alpha = this.options.reducedMotion ? Math.max(0, 0.5 * (1 - progress)) : Math.max(0, 1 - eased);
      if (cue.kind === 'spawn') {
        if (this.options.reducedMotion) continue;
        const columns = [...new Set(cue.cells.map((cell) => cell.x))];
        for (const column of columns) {
          const centerX = layout.x + (column + 0.5) * layout.cell;
          const tail = layout.cell * (0.24 + (1 - progress) * 0.25);
          this.strokeSegments(graphics, [
            [centerX - layout.cell * 0.19, layout.y + layout.cell * 0.04, centerX - layout.cell * 0.19, layout.y + tail],
            [centerX, layout.y + layout.cell * 0.02, centerX, layout.y + tail * 0.72],
            [centerX + layout.cell * 0.19, layout.y + layout.cell * 0.08, centerX + layout.cell * 0.19, layout.y + tail * 0.88],
          ], SURVIVAL_STONE_MATERIAL.innerEdge, alpha * 0.36, Math.max(0.9, layout.cell * 0.032));
        }
        continue;
      }

      const bottomCells = cue.cells.filter((cell) => (
        !cue.cells.some((candidate) => candidate.x === cell.x && candidate.y === cell.y + 1)
      ));
      for (const cell of bottomCells) {
        const visibleY = cell.y - VISIBLE_START_ROW;
        if (visibleY < 0 || visibleY >= VISIBLE_HEIGHT) continue;
        const centerX = layout.x + (cell.x + 0.5) * layout.cell;
        const contactY = Math.min(
          layout.y + layout.height - Math.max(1, layout.cell * 0.04),
          layout.y + (visibleY + 1) * layout.cell,
        );
        const spread = layout.cell * (this.options.reducedMotion ? 0.26 : 0.22 + eased * 0.18);
        this.strokeSegments(graphics, [
          [centerX - spread, contactY, centerX - layout.cell * 0.06, contactY],
          [centerX + layout.cell * 0.06, contactY, centerX + spread, contactY],
        ], SURVIVAL_STONE_MATERIAL.innerEdge, alpha * 0.74, Math.max(1.1, layout.cell * 0.055));
        if (!this.options.reducedMotion) {
          const dustOffset = layout.cell * (0.22 + eased * 0.18);
          graphics
            .circle(centerX - dustOffset, contactY - layout.cell * 0.04, Math.max(1, layout.cell * 0.05))
            .circle(centerX + dustOffset, contactY - layout.cell * 0.04, Math.max(1, layout.cell * 0.05))
            .fill({ color: SURVIVAL_STONE_MATERIAL.innerEdge, alpha: alpha * 0.24 });
        }
      }
    }

    if (this.survivalBedrockCue) {
      const cue = this.survivalBedrockCue;
      const progress = Math.min(1, cue.elapsed / cue.duration);
      const bedrockEased = easeOutCubic(progress);
      const alpha = this.options.reducedMotion ? Math.max(0, 0.46 * (1 - progress)) : Math.max(0, 1 - bedrockEased);
      const boundaryY = Math.max(
        layout.y + Math.max(1, layout.cell * 0.04),
        Math.min(
          layout.y + layout.height - Math.max(1, layout.cell * 0.04),
          layout.y + (VISIBLE_HEIGHT - cue.height) * layout.cell,
        ),
      );
      const segments: Array<[number, number, number, number]> = [];
      for (let column = 0; column < BOARD_WIDTH; column += 1) {
        const left = layout.x + column * layout.cell + layout.cell * 0.12;
        const right = layout.x + (column + 1) * layout.cell - layout.cell * 0.12;
        const drift = ((column * 7 + cue.height * 3) % 3 - 1) * layout.cell * 0.025;
        segments.push([left, boundaryY + drift, right, boundaryY - drift]);
      }
      this.strokeSegments(
        graphics,
        segments,
        cue.direction === 'up' ? BEDROCK_MATERIAL.innerEdge : BEDROCK_MATERIAL.edge,
        alpha * 0.72,
        Math.max(1.1, layout.cell * 0.05),
      );
      if (!this.options.reducedMotion) {
        for (let column = 1; column < BOARD_WIDTH; column += 3) {
          const centerX = layout.x + (column + 0.5) * layout.cell;
          graphics
            .circle(centerX, boundaryY - layout.cell * (0.08 + bedrockEased * 0.08), Math.max(1, layout.cell * 0.045))
            .fill({ color: BEDROCK_MATERIAL.innerEdge, alpha: alpha * 0.18 });
        }
      }
    }
  }

  private drawEffects(state: GameState, layout: BoardLayout): void {
    const graphics = this.effectGraphics;
    const mutationGraphics = this.mutationGraphics;
    this.mutationMaskGraphics
      .clear()
      .rect(layout.x, layout.y, layout.width, layout.height)
      .fill({ color: 0xffffff, alpha: 1 });
    graphics.clear();
    mutationGraphics.clear();
    this.drawSurvivalPressureEffects(graphics, state, layout);
    this.drawActiveMutationAtmosphere(mutationGraphics, state, layout);
    if (this.mutationFlash) {
      this.drawMutationActivationEffect(mutationGraphics, this.mutationFlash, layout);
    }
    this.drawMutationParticles(mutationGraphics, layout);
    this.drawOrdinaryMultiLineClearCueFaces(graphics, layout);
    this.drawClassicFeedbackCues(graphics, state, layout);

    if (this.lockPulse) {
      const progress = Math.min(1, this.lockPulse.elapsed / this.lockPulse.duration);
      this.drawLandingImprint(graphics, this.lockPulse, progress, layout);
    }
  }

  private drawPreviews(state: GameState, layout: BoardLayout): void {
    const graphics = this.previewGraphics;
    graphics.clear();
    this.previewBounds = null;
    this.previewLayerVisible = false;
    this.previewPiece = null;
    this.previewPieces = [];
    this.previewMutationItem = this.resolvePreviewMutationItem(state);
    const hostBounds = this.host?.getBoundingClientRect();
    const arena = this.host?.closest<HTMLElement>('[data-testid="game-cluster"]');
    const slotElement = arena?.querySelector<HTMLElement>('[data-testid="next-slot"]') ?? null;
    const slot = slotElement?.getBoundingClientRect();
    if (hostBounds && slot && slot.width > 0 && slot.height > 0) {
      const clippedLeft = Math.max(hostBounds.left, slot.left);
      const clippedTop = Math.max(hostBounds.top, slot.top);
      const clippedRight = Math.min(hostBounds.right, slot.right);
      const clippedBottom = Math.min(hostBounds.bottom, slot.bottom);
      if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) {
        // During a route/layout transition React can keep the canonical Next slot
        // mounted while its measured rectangle misses the full-arena canvas for one
        // frame. Clearing and returning here used to freeze a blank Next instrument.
        // Repaint the current queue into the last verified rail rectangle; mode
        // switching and terminal states still clear intentionally below.
        if (this.drawPreviewsAtLastValidBounds(state)) return;
        this.drawPreviewsAtBoardFallback(state, layout);
        return;
      }
      const fallbackSlot: PreviewSlot = {
        x: clippedLeft - hostBounds.left,
        y: clippedTop - hostBounds.top,
        width: clippedRight - clippedLeft,
        height: clippedBottom - clippedTop,
        labelInset: 0,
      };
      const segmentSlots = slotElement
        ? [...slotElement.querySelectorAll<HTMLElement>('[data-preview-segment]')]
          .map((segment): PreviewSlot | null => {
            const bounds = segment.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return null;
            const left = Math.max(hostBounds.left, bounds.left);
            const top = Math.max(hostBounds.top, bounds.top);
            const right = Math.min(hostBounds.right, bounds.right);
            const bottom = Math.min(hostBounds.bottom, bounds.bottom);
            if (right <= left || bottom <= top) return null;
            return {
              x: left - hostBounds.left,
              y: top - hostBounds.top,
              width: right - left,
              height: bottom - top,
              labelInset: 0,
            };
          })
          .filter((segment): segment is PreviewSlot => segment !== null)
        : [];
      const previewSlots = segmentSlots.length ? segmentSlots : [fallbackSlot];
      // Endgame has one ordinary Next well, divided into two numbered rows. The DOM
      // establishes those row bounds and uses the loaded data-face numerals;
      // Pixi owns the shared well and pieces.
      const segmentedQueue = segmentSlots.length > 1;
      // A DOM-anchored gameplay preview is intentionally open space. The DOM owns
      // geometry and labels; Pixi owns only the tetromino. Fallback previews without
      // a DOM slot may still use the legacy well for isolated renderer harnesses.
      const frameless = slotElement !== null;
      const segmentInset = segmentedQueue ? 0 : 1;
      if (!frameless) {
        if (segmentedQueue) {
          this.drawPreviewBackdrop(
            fallbackSlot.x + 1,
            fallbackSlot.y + 1,
            Math.max(8, fallbackSlot.width - 2),
            Math.max(8, fallbackSlot.height - 2),
            segmentSlots.length,
          );
        } else {
          for (const previewSlot of previewSlots) {
            this.drawPreviewBackdrop(
              previewSlot.x + segmentInset,
              previewSlot.y + segmentInset,
              Math.max(8, previewSlot.width - segmentInset * 2),
              Math.max(8, previewSlot.height - segmentInset * 2),
              1,
              previewSlot.labelInset,
            );
          }
        }
      }
      if (state.status === 'ready' || state.status === 'finished' || state.status === 'game-over') {
        this.previewClearBounds = null;
        this.previewClearPiece = null;
        return;
      }
      if (this.options.modeSwitch) {
        // drawPieces clears its Graphics at the start of this same frame. Hiding the
        // preview and refusing fallback placement here prevents the old Pixi preview
        // from surviving after React removes the DOM slot for mode switching.
        this.previewClearBounds = this.lastPreviewBounds;
        this.previewClearPiece = this.lastPreviewPiece;
        return;
      }
      this.previewClearBounds = null;
      this.previewClearPiece = null;
      const previews = nextPreviewPieces(state);
      if (segmentSlots.length >= previews.length) {
        for (const [index, piece] of previews.entries()) {
          const previewSlot = segmentSlots[index];
          if (!previewSlot) continue;
          this.drawPreviewPieces(
            graphics,
            [piece],
            previewSlot.x + segmentInset,
            previewSlot.y + segmentInset,
            Math.max(8, previewSlot.width - segmentInset * 2),
            Math.max(8, previewSlot.height - segmentInset * 2),
            previewSlot.labelInset,
            index === 0 ? this.previewMutationItem : null,
          );
        }
      } else {
        this.drawPreviewPieces(
          graphics,
          previews,
          fallbackSlot.x,
          fallbackSlot.y,
          fallbackSlot.width,
          fallbackSlot.height,
          0,
          this.previewMutationItem,
        );
      }
      this.previewBounds = { x: fallbackSlot.x, y: fallbackSlot.y, width: fallbackSlot.width, height: fallbackSlot.height };
      this.previewLayerVisible = previews.length > 0;
      this.previewPieces = [...previews];
      this.previewPiece = previews[0] ?? null;
      this.lastPreviewBounds = this.previewBounds;
      this.lastPreviewPiece = this.previewPiece;
      return;
    }
    this.drawPreviewsAtBoardFallback(state, layout);
  }

  private drawPreviewsAtBoardFallback(state: GameState, layout: BoardLayout): void {
    const graphics = this.previewGraphics;
    if (state.status === 'ready' || state.status === 'finished' || state.status === 'game-over') {
      this.previewClearBounds = null;
      this.previewClearPiece = null;
      return;
    }
    if (this.options.modeSwitch) {
      // drawPieces clears its Graphics at the start of this same frame. Hiding the
      // preview and refusing fallback placement here prevents the old Pixi preview
      // from surviving after React removes the DOM slot for mode switching.
      this.previewClearBounds = this.lastPreviewBounds;
      this.previewClearPiece = this.lastPreviewPiece;
      return;
    }
    this.previewClearBounds = null;
    this.previewClearPiece = null;
    const width = this.app?.screen.width ?? 0;
    if (layout.compact) {
      const topY = Math.max(7, layout.y - Math.min(92, layout.cell * 4.7));
      this.previewBounds = { x: layout.x, y: topY, width: layout.cell * 5, height: Math.max(42, layout.cell * 4) };
      const previews = nextPreviewPieces(state);
      this.drawPreviewPieces(
        graphics,
        previews,
        this.previewBounds.x,
        this.previewBounds.y,
        this.previewBounds.width,
        this.previewBounds.height,
        0,
        this.previewMutationItem,
      );
      this.previewLayerVisible = previews.length > 0;
      this.previewPieces = [...previews];
      this.previewPiece = previews[0] ?? null;
      this.lastPreviewBounds = this.previewBounds;
      this.lastPreviewPiece = this.previewPiece;
    } else {
      const sideWidth = Math.max(92, (width - layout.width) / 2 - 22);
      const leftX = Math.max(12, layout.x - sideWidth - 14);
      const cardWidth = Math.max(78, sideWidth);
      this.previewBounds = { x: leftX, y: layout.y, width: cardWidth, height: Math.max(52, layout.cell * 4) };
      const previews = nextPreviewPieces(state);
      this.drawPreviewPieces(
        graphics,
        previews,
        this.previewBounds.x,
        this.previewBounds.y,
        this.previewBounds.width,
        this.previewBounds.height,
        0,
        this.previewMutationItem,
      );
      this.previewLayerVisible = previews.length > 0;
      this.previewPieces = [...previews];
      this.previewPiece = previews[0] ?? null;
      this.lastPreviewBounds = this.previewBounds;
      this.lastPreviewPiece = this.previewPiece;
    }
  }

  private drawPreviewsAtLastValidBounds(state: GameState): boolean {
    const bounds = this.lastPreviewBounds;
    if (
      !bounds
      || bounds.width <= 0
      || bounds.height <= 0
      || state.status === 'ready'
      || state.status === 'finished'
      || state.status === 'game-over'
      || this.options.modeSwitch
    ) return false;

    const previews = nextPreviewPieces(state);
    if (previews.length === 0) return false;
    this.previewClearBounds = null;
    this.previewClearPiece = null;
    this.drawPreviewPieces(
      this.previewGraphics,
      previews,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      this.previewMutationItem,
    );
    this.previewBounds = { ...bounds };
    this.previewLayerVisible = true;
    this.previewPieces = [...previews];
    this.previewPiece = previews[0] ?? null;
    this.lastPreviewPiece = this.previewPiece;
    return true;
  }

  private drawPreviewBackdrop(x: number, y: number, width: number, height: number, segments = 1, labelInset = 0): void {
    const palette = canvasThemePalette(this.options.visualTheme);
    const captionInset = Math.min(labelInset, Math.max(0, height - 8));
    const contentY = y + captionInset;
    const contentHeight = Math.max(8, height - captionInset);
    const radius = Math.max(6, Math.min(8, Math.min(width, contentHeight) * 0.075));
    this.boardGraphics
      .roundRect(x, contentY, width, contentHeight, radius)
      .fill({ color: palette.well, alpha: 1 })
      .stroke({ color: palette.edge, alpha: 0.86, width: 1 });

    if (segments < 2) return;
    const dividerInset = Math.max(8, Math.min(14, width * 0.08));
    for (let index = 1; index < segments; index += 1) {
      const dividerY = contentY + contentHeight * index / segments;
      this.boardGraphics
        .moveTo(x + dividerInset, dividerY)
        .lineTo(x + width - dividerInset, dividerY)
        .stroke({ color: palette.edge, alpha: 0.42, width: 1 });
    }
  }

  /**
   * A hard drop leaves at most one short trace per occupied column. This reads as
   * speed without replaying translucent copies of the complete tetromino.
   */
  private drawHardDropTraces(
    graphics: Graphics,
    trail: TrailState,
    progress: number,
    layout: BoardLayout,
    boardShiftOffsetY = 0,
  ): void {
    const material = PIECE_MATERIALS[trail.piece];
    const alpha = Math.max(0, 1 - easeOutCubic(progress));
    const topCellByColumn = new Map<number, Cell>();
    for (const cell of trail.cells) {
      const current = topCellByColumn.get(cell.x);
      if (!current || cell.y < current.y) topCellByColumn.set(cell.x, cell);
    }
    const columns = [...topCellByColumn.entries()]
      .sort(([left], [right]) => left - right)
      .slice(0, 4);
    const length = layout.cell * (0.48 + (1 - progress) * 0.16);
    const lowerGap = layout.cell * 0.12;

    for (const [column, cell] of columns) {
      const visibleY = cell.y - VISIBLE_START_ROW;
      if (visibleY < 0 || visibleY >= VISIBLE_HEIGHT) continue;
      const x = layout.x + (column + 0.5) * layout.cell;
      const bottom = layout.y + visibleY * layout.cell + boardShiftOffsetY - lowerGap;
      const top = Math.max(layout.y + layout.cell * 0.06, bottom - length);
      if (bottom <= top) continue;
      this.strokeSegments(
        graphics,
        [[x, top, x, bottom]],
        material.edge,
        alpha * 0.42,
        Math.max(1.1, layout.cell * 0.052),
      );
      this.strokeSegments(
        graphics,
        [[x, top + layout.cell * 0.08, x, bottom]],
        material.innerEdge,
        alpha * 0.62,
        Math.max(0.75, layout.cell * 0.026),
      );
    }
  }

  /** Carrier-only clear accents make the triggering cell readable before activation. */
  private drawMutationLineClearAccent(
    graphics: Graphics,
    item: 'freeze' | 'collapse',
    x: number,
    y: number,
    size: number,
    progress: number,
    cellSize: number,
    alphaScale = 1,
  ): void {
    const token = MUTATION_VFX_TOKENS[item];
    const pulse = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
    const alpha = Math.max(.22, pulse) * (this.options.reducedMotion ? .62 : 1) * alphaScale;
    const centerX = x + size * .5;
    const centerY = y + size * .5;
    const stroke = Math.max(1, cellSize * .045);
    if (item === 'freeze') {
      const inset = size * (.08 + progress * .22);
      graphics
        .roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, Math.max(1, cellSize * .045))
        .stroke({ color: token.palette.highlight, alpha: .86 * alpha, width: stroke });
      this.strokeSegments(graphics, [
        [x + size * .2, centerY, centerX, y + size * .2],
        [centerX, y + size * .2, x + size * .8, centerY],
      ], token.palette.primary, .64 * alpha, stroke * .72);
      return;
    }

    for (let index = 0; index < 3; index += 1) {
      const lineY = centerY - size * .22 + index * size * .22;
      const halfWidth = size * (.36 - index * .055) * (1 - progress * .24);
      this.strokeSegments(
        graphics,
        [[centerX - halfWidth, lineY, centerX + halfWidth, lineY]],
        index === 1 ? token.palette.highlight : token.palette.primary,
        (.78 - index * .12) * alpha,
        stroke,
      );
    }
  }

  /**
   * After Core collapses the board at 200 ms, unfinished captured cells continue
   * below the new board on the same 300 ms material track. No row is restarted.
   */
  private drawCommittedOrdinaryMultiLineClearBodies(
    graphics: Graphics,
    layout: BoardLayout,
  ): void {
    for (const cue of this.ordinaryMultiLineClearCues) {
      if (!cue.committed) continue;
      for (const { cell, material, rowOrder, mutationItem } of cue.cells) {
        if (cell.y < VISIBLE_START_ROW || cell.y >= VISIBLE_START_ROW + VISIBLE_HEIGHT) continue;
        const sample = classicLineClearCellSample(
          cue.elapsed,
          cell.x,
          BOARD_WIDTH,
          rowOrder,
          cue.count,
          cue.restrained,
        );
        if (sample.complete || sample.alpha <= 0.001) continue;
        const visibleCell = { x: cell.x, y: cell.y - VISIBLE_START_ROW };
        const drawOptions: GroupDrawOptions = {
          originX: layout.x,
          originY: layout.y,
          unit: layout.cell,
          scale: sample.scale,
        };
        if (mutationItem) {
          this.drawMutationPieceMaterial(
            graphics,
            [visibleCell],
            material,
            mutationItem,
            sample.alpha,
            'clear',
            drawOptions,
          );
        } else {
          this.drawCellGroups(graphics, [visibleCell], material, sample.alpha, drawOptions);
        }
      }
    }
  }

  /** A low, continuous highlight follows the same sample as each material body. */
  private drawOrdinaryMultiLineClearCueFaces(graphics: Graphics, layout: BoardLayout): void {
    for (const cue of this.ordinaryMultiLineClearCues) {
      for (const { cell, material, rowOrder, mutationItem, endgameTarget } of cue.cells) {
        if (cell.y < VISIBLE_START_ROW || cell.y >= VISIBLE_START_ROW + VISIBLE_HEIGHT) continue;
        const sample = classicLineClearCellSample(
          cue.elapsed,
          cell.x,
          BOARD_WIDTH,
          rowOrder,
          cue.count,
          cue.restrained,
        );
        if (sample.complete || !sample.active || sample.highlight <= 0.001) continue;
        const pieceMaterial = mutationItem
          ? this.mutationMaterial(mutationItem)
          : this.materialFor(material);
        const inset = layout.cell * 0.075;
        const baseSize = layout.cell - inset * 2;
        const size = baseSize * sample.scale;
        const x = layout.x + (cell.x + 0.5) * layout.cell - size / 2;
        const y = layout.y + (cell.y - VISIBLE_START_ROW + 0.5) * layout.cell - size / 2;
        const committedFade = cue.committed
          ? Math.max(0, Math.min(1, (cue.elapsed - LINE_CLEAR_CORE_COMMIT_MS) / 32))
          : 0;
        const committedAttenuation = 1 - easeOutCubic(committedFade) * 0.45;
        const alpha = Math.min(0.55, sample.highlight * 0.5) * committedAttenuation;
        graphics
          .roundRect(x, y, size, size, Math.max(1, layout.cell * 0.08))
          .fill({ color: COLORS.actionInk, alpha })
          .stroke({
            color: pieceMaterial.innerEdge,
            alpha: Math.min(0.62, alpha * 1.16),
            width: Math.max(1, layout.cell * 0.042),
          });

        if (!cue.restrained && sample.pairProgress > 0) {
          const bandProgress = Math.sin(Math.min(1, sample.pairProgress) * Math.PI);
          const bandWidth = size * (0.56 - Math.min(1, sample.pairProgress) * 0.22);
          const bandHeight = Math.max(1, layout.cell * (0.035 + bandProgress * 0.018));
          graphics
            .roundRect(
              x + (size - bandWidth) / 2,
              y + (size - bandHeight) / 2,
              bandWidth,
              bandHeight,
              bandHeight / 2,
            )
            .fill({ color: pieceMaterial.innerEdge, alpha: Math.min(0.5, alpha * 1.08) });
        }

        if (cue.committed && endgameTarget) {
          const markerInset = Math.max(2, layout.cell * 0.19);
          const markerSize = Math.max(5, layout.cell * 0.36);
          const markerX = layout.x + cell.x * layout.cell + markerInset;
          const markerY = layout.y + (cell.y - VISIBLE_START_ROW) * layout.cell + markerInset;
          graphics
            .moveTo(markerX + markerSize, markerY)
            .lineTo(markerX, markerY)
            .lineTo(markerX, markerY + markerSize)
            .stroke({
              color: COLORS.target,
              alpha: 0.76 * sample.alpha * committedAttenuation,
              width: Math.max(1, layout.cell * 0.038),
            });
        }

        if (mutationItem === 'freeze' || mutationItem === 'collapse') {
          this.drawMutationLineClearAccent(
            graphics,
            mutationItem,
            x,
            y,
            size,
            sample.pairProgress,
            layout.cell,
            sample.alpha * committedAttenuation,
          );
        }
      }
    }
  }

  private enqueueOrdinaryMultiLineClearCue(
    rows: readonly number[],
    state: GameState | undefined,
  ): void {
    if (!state || !Array.isArray(state.board)) return;
    const orderedRows = orderedLineClearRows(rows);
    const count = orderedRows.length;
    if (count < 1 || count > 4) return;
    const typedCount = count as 1 | 2 | 3 | 4;
    const duplicate = this.ordinaryMultiLineClearCues.some((cue) => (
      !cue.committed
      && cue.count === typedCount
      && cue.orderedRows.every((row, rowOrder) => row === orderedRows[rowOrder])
    ));
    if (duplicate) return;

    const mutationItemByCell = new Map<string, MutationItem>();
    for (const carrier of state.mutationCarriers ?? []) {
      for (const cell of carrier.cells) {
        mutationItemByCell.set(`${cell.x},${cell.y}`, carrier.item);
      }
    }
    const endgameTargetCells = new Set(
      (state.endgameTargetCells ?? []).map((cell) => `${cell.x},${cell.y}`),
    );
    const cells: OrdinaryMultiLineClearCueCell[] = [];
    for (let rowOrder = 0; rowOrder < orderedRows.length; rowOrder += 1) {
      const row = orderedRows[rowOrder]!;
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const material = state.board[row]?.[x];
        if (!material || material === ANCHOR_CELL || material === BEDROCK_CELL) continue;
        cells.push({
          cell: { x, y: row },
          material,
          rowOrder,
          mutationItem: mutationItemByCell.get(`${x},${row}`) ?? null,
          endgameTarget: endgameTargetCells.has(`${x},${row}`),
        });
      }
    }
    if (cells.length === 0) return;
    this.ordinaryMultiLineClearCues.push({
      count: typedCount,
      orderedRows,
      cells,
      elapsed: 0,
      duration: lineClearVisualDurationMs(typedCount),
      restrained: this.options.reducedMotion || state.mode === 'endgame',
      committed: false,
      fresh: true,
    });
    if (this.ordinaryMultiLineClearCues.length > ORDINARY_LINE_CLEAR_TAIL_LIMIT) {
      this.ordinaryMultiLineClearCues.splice(
        0,
        this.ordinaryMultiLineClearCues.length - ORDINARY_LINE_CLEAR_TAIL_LIMIT,
      );
    }
  }

  private commitOrdinaryMultiLineClearCue(rows: readonly number[]): void {
    const orderedRows = orderedLineClearRows(rows);
    for (let index = this.ordinaryMultiLineClearCues.length - 1; index >= 0; index -= 1) {
      const cue = this.ordinaryMultiLineClearCues[index]!;
      if (
        !cue.committed
        && cue.count === orderedRows.length
        && cue.orderedRows.every((row, rowOrder) => row === orderedRows[rowOrder])
      ) {
        cue.committed = true;
        return;
      }
    }
  }

  /** A six-tick support imprint replaces the old broad landing bracket. */
  private drawLandingImprint(
    graphics: Graphics,
    imprint: LockPulse,
    progress: number,
    layout: BoardLayout,
  ): void {
    const material = PIECE_MATERIALS[imprint.piece];
    const eased = easeOutCubic(progress);
    const alpha = Math.max(0, 1 - progress) * imprint.strength;
    const halfSpan = layout.cell * (
      this.options.reducedMotion ? 0.24 : 0.16 + eased * 0.08
    );
    for (const cell of imprint.cells) {
      const visibleY = cell.y - VISIBLE_START_ROW;
      if (visibleY < 0 || visibleY >= VISIBLE_HEIGHT) continue;
      const centerX = layout.x + (cell.x + 0.5) * layout.cell;
      const y = Math.min(
        layout.y + layout.height - Math.max(1, layout.cell * 0.05),
        layout.y + (visibleY + 1) * layout.cell - layout.cell * 0.1,
      );
      graphics
        .roundRect(
          centerX - halfSpan,
          y - layout.cell * 0.045,
          halfSpan * 2,
          layout.cell * 0.09,
          Math.max(1, layout.cell * 0.035),
        )
        .fill({
          color: material.innerEdge,
          alpha: Math.min(CELL_STYLE.landingImprintFillAlpha, alpha * CELL_STYLE.landingImprintFillAlpha),
        });
      this.strokeSegments(
        graphics,
        [[centerX - halfSpan, y, centerX + halfSpan, y]],
        material.edge,
        alpha * 0.58,
        Math.max(1.15, layout.cell * 0.06),
      );
      this.strokeSegments(
        graphics,
        [[centerX - halfSpan * 0.72, y - layout.cell * 0.025, centerX + halfSpan * 0.72, y - layout.cell * 0.025]],
        material.innerEdge,
        alpha * 0.76,
        Math.max(0.75, layout.cell * 0.028),
      );
    }
  }

  private drawClassicFeedbackCues(
    graphics: Graphics,
    state: GameState,
    layout: BoardLayout,
  ): void {
    if (state.mode !== 'marathon' || this.classicFeedbackCues.length === 0) return;
    const stroke = Math.max(1.2, layout.cell * 0.055);

    for (const cue of this.classicFeedbackCues) {
      const progress = Math.min(1, Math.max(0, cue.elapsed / cue.duration));
      const eased = easeOutCubic(progress);
      const alpha = Math.max(0, 1 - eased);
      if (alpha <= 0) continue;

      if (cue.kind === 'combo') {
        const marks = Math.min(3, Math.max(1, cue.combo - 1));
        for (const row of cue.rows) {
          if (row < VISIBLE_START_ROW || row >= VISIBLE_START_ROW + VISIBLE_HEIGHT) continue;
          const centerY = layout.y + (row - VISIBLE_START_ROW + 0.5) * layout.cell;
          for (let mark = 0; mark < marks; mark += 1) {
            const inset = layout.cell * (
              0.24 + mark * 0.16 + (this.options.reducedMotion ? 0 : (1 - eased) * 0.16)
            );
            const arm = layout.cell * 0.16;
            const halfHeight = layout.cell * (0.17 + mark * 0.035);
            const leftX = layout.x + inset;
            const rightX = layout.x + layout.width - inset;
            this.strokeSegments(graphics, [
              [leftX + arm, centerY - halfHeight, leftX, centerY - halfHeight],
              [leftX, centerY - halfHeight, leftX, centerY + halfHeight],
              [leftX, centerY + halfHeight, leftX + arm, centerY + halfHeight],
              [rightX - arm, centerY - halfHeight, rightX, centerY - halfHeight],
              [rightX, centerY - halfHeight, rightX, centerY + halfHeight],
              [rightX, centerY + halfHeight, rightX - arm, centerY + halfHeight],
            ], COLORS.classic, alpha * (0.82 - mark * 0.14), Math.max(1, stroke * 0.82));
          }
        }
        continue;
      }

      if (cue.kind === 'speed-up') {
        const travel = this.options.reducedMotion ? 0 : eased * layout.cell * 2.8;
        const baseY = layout.y + layout.cell * 1.25 + travel;
        const leftX = layout.x + layout.cell * 0.42;
        const rightX = layout.x + layout.width - layout.cell * 0.42;
        const tickWidth = layout.cell * 0.16;
        const tickHeight = layout.cell * 0.22;
        const repetitions = this.options.reducedMotion ? 1 : 3;
        for (let tick = 0; tick < repetitions; tick += 1) {
          const y = Math.min(
            layout.y + layout.height - tickHeight - stroke,
            baseY + tick * layout.cell * 0.58,
          );
          this.strokeSegments(graphics, [
            [leftX - tickWidth, y - tickHeight, leftX, y],
            [leftX, y, leftX + tickWidth, y - tickHeight],
            [rightX - tickWidth, y - tickHeight, rightX, y],
            [rightX, y, rightX + tickWidth, y - tickHeight],
          ], COLORS.classic, alpha * (0.84 - tick * 0.14), stroke);
        }
        continue;
      }

      const travel = this.options.reducedMotion ? 0 : (1 - eased) * layout.cell * 0.5;
      const left = layout.x + layout.cell * 3 - travel;
      const right = layout.x + layout.cell * 7 + travel;
      const top = layout.y + layout.cell * 0.45;
      const bottom = layout.y + layout.cell * 3.15 + travel * 0.45;
      const arm = layout.cell * 0.46;
      this.strokeSegments(graphics, [
        [left, top + arm, left, top],
        [left, top, left + arm, top],
        [right - arm, top, right, top],
        [right, top, right, top + arm],
        [left, bottom - arm, left, bottom],
        [left, bottom, left + arm, bottom],
        [right - arm, bottom, right, bottom],
        [right, bottom, right, bottom - arm],
      ], COLORS.danger, alpha * 0.9, Math.max(1.4, stroke * 1.08));
    }
  }

  private resolvePreviewMutationItem(state: GameState): MutationItem | null {
    const hasActive = state.active !== null;
    const unchanged = this.previewMutationQueueRef === state.queue
      && this.previewMutationRandomizerRef === state.mutationRandomizer
      && this.previewMutationPieceCount === state.pieceCount
      && this.previewMutationMode === state.mode
      && this.previewMutationHasActive === hasActive;
    if (unchanged) return this.previewMutationItem;
    this.previewMutationQueueRef = state.queue;
    this.previewMutationRandomizerRef = state.mutationRandomizer;
    this.previewMutationPieceCount = state.pieceCount;
    this.previewMutationMode = state.mode;
    this.previewMutationHasActive = hasActive;
    return state.mode === 'sprint' ? nextMutationPreviewItem(state) : null;
  }

  /** Persistent, low-obstruction board treatment makes every ten-second state legible. */
  private drawActiveMutationAtmosphere(graphics: Graphics, state: GameState, layout: BoardLayout): void {
    if (state.mode !== 'sprint') return;
    const fallback: TimedMutationItem[] = [];
    if (state.mutationFreezeTicks > 0) fallback.push('freeze');
    if (state.mutationCollapsePiecesRemaining > 0 || state.mutationCollapseLandingLatched) fallback.push('collapse');
    if (state.mutationMultiplierTicks > 0) fallback.push('multiplier');

    const fields = this.mutationFields.size
      ? [...this.mutationFields.values()]
      : fallback.map((item) => ({ item, stage: 'active' as const, elapsed: 0 }));
    for (const field of fields) {
      const token = MUTATION_VFX_TOKENS[field.item];
      const alpha = this.mutationFieldOpacity(field);
      if (alpha <= 0) continue;
      const phaseDuration = field.item === 'collapse'
        ? 560
        : field.item === 'multiplier'
          ? 4_800
          : token.animation.pulseMs;
      const phase = this.options.reducedMotion ? 0 : (this.mutationClockMs % phaseDuration) / phaseDuration;
      if (field.item === 'freeze') this.drawFreezeAtmosphere(graphics, layout, phase, alpha);
      else if (field.item === 'collapse') continue;
      else this.drawMultiplierAtmosphere(
        graphics,
        layout,
        phase,
        alpha,
        state.mutationMultiplierFactor === 4 ? 4 : 2,
      );
    }
  }

  private mutationFieldOpacity(field: MutationField): number {
    const timing = MUTATION_VFX_TOKENS[field.item].animation;
    if (this.options.reducedMotion || field.stage === 'active') return 1;
    if (field.stage === 'enter') return mutationEase('cubicOut', field.elapsed / timing.enterMs);
    return 1 - mutationEase('cubicIn', field.elapsed / timing.exitMs);
  }

  private drawFreezeAtmosphere(graphics: Graphics, layout: BoardLayout, phase: number, opacity: number): void {
    const token = MUTATION_VFX_TOKENS.freeze;
    const inset = Math.max(1.5, layout.cell * 0.08);
    const pulse = this.options.reducedMotion ? 1 : 0.88 + Math.sin(phase * Math.PI * 2) * 0.1;
    const fieldDepth = Math.min(layout.height * 0.62, layout.cell * 12.4);
    // A single alpha gradient produces a continuous cold front. Discrete strips,
    // even when overlapped, quantise into scan lines after canvas scaling.
    graphics
      .rect(layout.x + inset, layout.y + inset, layout.width - inset * 2, fieldDepth)
      .fill({ fill: this.freezeAtmosphereFill(), alpha: pulse * opacity });
    const shardSize = Math.max(3, layout.cell * 0.17);
    for (const [xFactor, yFactor, scale] of [
      [.08, .08, .72], [.27, .14, .48], [.53, .1, .56], [.72, .2, .66], [.92, .12, .42], [.16, .35, .38], [.83, .44, .5],
    ] as const) {
      const drift = this.options.reducedMotion ? 0 : ((phase + xFactor) % 1) * layout.cell * .36;
      this.drawMutationDiamond(
        graphics,
        layout.x + layout.width * xFactor,
        layout.y + fieldDepth * yFactor + drift,
        shardSize * scale * .45,
        shardSize * scale,
        token.palette.highlight,
        0.54 * pulse * opacity,
      );
    }
  }

  private freezeAtmosphereFill(): FillGradient {
    if (this.freezeAtmosphereGradient) return this.freezeAtmosphereGradient;
    const token = MUTATION_VFX_TOKENS.freeze;
    const withAlpha = (color: number, alpha: number): string => {
      const rgb = color.toString(16).padStart(6, '0');
      const channel = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, '0');
      return `#${rgb}${channel}`;
    };
    this.freezeAtmosphereGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: withAlpha(token.palette.highlight, token.shader.fieldAlpha * .86) },
        { offset: .22, color: withAlpha(token.palette.primary, token.shader.fieldAlpha * .68) },
        { offset: .58, color: withAlpha(token.palette.primary, token.shader.fieldAlpha * .22) },
        { offset: 1, color: withAlpha(token.palette.primary, 0) },
      ],
    });
    return this.freezeAtmosphereGradient;
  }

  /**
   * Supergravity keeps two quiet, cell-shaped afterimages behind the airborne piece.
   * The cue follows every moving cell, is clipped to the well, and disappears at lock;
   * reduced motion omits it entirely instead of leaving a static landing mark.
   */
  private drawSupergravityPieceTrail(
    graphics: Graphics,
    cells: readonly Cell[],
    layout: BoardLayout,
    offsetX = 0,
    offsetY = 0,
  ): void {
    if (cells.length === 0 || this.options.reducedMotion) return;
    const token = MUTATION_VFX_TOKENS.collapse;
    const wellLeft = layout.x;
    const wellTop = layout.y;
    const wellRight = layout.x + layout.width;
    const wellBottom = layout.y + layout.height;
    const inset = Math.max(1, layout.cell * .075);
    const phase = (this.mutationClockMs % 360) / 360;

    for (const cell of cells) {
      const baseX = layout.x + cell.x * layout.cell + offsetX + inset;
      const baseY = layout.y + cell.y * layout.cell + offsetY + inset;
      const width = layout.cell - inset * 2;
      const height = layout.cell - inset * 2;
      for (let layer = 0; layer < 2; layer += 1) {
        const distance = layout.cell * (.17 + layer * .18 + phase * .035);
        const rawTop = baseY - distance;
        const left = Math.max(wellLeft, baseX);
        const right = Math.min(wellRight, baseX + width);
        const top = Math.max(wellTop, rawTop);
        const bottom = Math.min(wellBottom, rawTop + height);
        if (right <= left || bottom <= top) continue;
        graphics
          .roundRect(left, top, right - left, bottom - top, Math.max(1, layout.cell * .08))
          .fill({
            color: layer === 0 ? token.palette.highlight : token.palette.primary,
            alpha: layer === 0 ? .15 : .08,
          });
      }
    }
  }

  private drawMultiplierAtmosphere(
    graphics: Graphics,
    layout: BoardLayout,
    phase: number,
    opacity: number,
    factor: 2 | 4,
  ): void {
    const token = MUTATION_VFX_TOKENS.multiplier;
    const glintCount = factor === 4 ? 10 : 7;
    const fieldDepth = Math.min(layout.height * .34, layout.cell * 6.8);
    // Independent double-layer glints keep Double readable without turning the
    // board into rain or hanging markers. Detached diamond dust has no circular
    // backing, stem, tail, or shared pulse. Super Double adds count and warmth,
    // while every individual mark keeps the same quiet gameplay-safe footprint.
    for (let index = 0; index < glintCount; index += 1) {
      const xFactor = (((index * 37 + 13) % 83) + 8) / 100;
      const offset = ((index * 29) % glintCount) / glintCount;
      const travel = this.options.reducedMotion ? .14 + offset * .64 : (phase + offset) % 1;
      const edgeFade = this.options.reducedMotion
        ? 1
        : Math.max(0, Math.min(1, travel / .14, (1 - travel) / .2));
      const sway = this.options.reducedMotion
        ? 0
        : Math.sin((phase + offset) * Math.PI * 2) * layout.cell * .08;
      const radius = layout.cell * (index % 4 === 0 ? .15 : .11);
      const x = layout.x + layout.width * xFactor + sway;
      const y = layout.y + layout.cell * .42 + fieldDepth * travel;
      const warmer = factor === 4 && index % 3 !== 1;
      const outerColor = warmer ? token.palette.highlight : token.palette.primary;
      const innerColor = factor === 4 && index % 2 === 0 ? token.palette.glow : token.palette.highlight;
      const alpha = (factor === 4 ? .68 : .6) * opacity * edgeFade;

      this.drawMutationStar(
        graphics,
        x,
        y,
        radius * 1.58,
        radius * .42,
        outerColor,
        alpha * .22,
      );
      this.drawMutationStar(
        graphics,
        x,
        y,
        radius,
        radius * .25,
        innerColor,
        alpha * .88,
      );
      const moteDirection = index % 2 === 0 ? -1 : 1;
      this.drawMutationDiamond(
        graphics,
        x + moteDirection * radius * 2.35,
        y - radius * 1.7,
        radius * .18,
        radius * .3,
        innerColor,
        alpha * .34,
      );
      this.drawMutationDiamond(
        graphics,
        x - moteDirection * radius * 1.55,
        y + radius * 1.32,
        radius * .12,
        radius * .2,
        outerColor,
        alpha * .22,
      );
    }
  }

  private drawPreviewPiece(
    graphics: Graphics,
    type: PieceType,
    centerX: number,
    centerY: number,
    unit: number,
    mutationItem: MutationItem | null,
  ): void {
    const shape = PIECE_SHAPES[type][0];
    const minX = Math.min(...shape.map((cell) => cell.x));
    const maxX = Math.max(...shape.map((cell) => cell.x));
    const minY = Math.min(...shape.map((cell) => cell.y));
    const maxY = Math.max(...shape.map((cell) => cell.y));
    const width = (maxX - minX + 1) * unit;
    const height = (maxY - minY + 1) * unit;
    const originX = centerX - width / 2 - minX * unit;
    const originY = centerY - height / 2 - minY * unit;
    const drawOptions: GroupDrawOptions = {
      originX,
      originY,
      unit,
    };
    if (mutationItem) {
      this.drawMutationPieceMaterial(
        graphics,
        shape,
        type,
        mutationItem,
        0.96,
        'next',
        drawOptions,
      );
    } else {
      this.drawCellGroups(graphics, shape, type, 0.96, drawOptions);
    }
  }

  private drawPreviewPieces(
    graphics: Graphics,
    pieces: readonly PieceType[],
    x: number,
    y: number,
    width: number,
    height: number,
    labelInset = 0,
    mutationItem: MutationItem | null = null,
  ): void {
    if (!pieces.length) return;
    const dualPreview = pieces.length > 1;
    const contentY = y + Math.min(labelInset, Math.max(0, height - 8));
    const contentHeight = Math.max(8, height - (contentY - y));
    const slotHeight = contentHeight / pieces.length;
    for (const [index, piece] of pieces.entries()) {
      const unit = this.previewUnitFor(piece, width, slotHeight, dualPreview);
      const centerY = contentY + slotHeight * (index + 0.5);
      this.drawPreviewPiece(graphics, piece, x + width / 2, centerY, unit, index === 0 ? mutationItem : null);
    }
  }

  /**
   * Fit an actual tetromino silhouette instead of capping every preview at a
   * tiny fixed cell size. The compact rail now uses most of the available slot
   * while retaining a calm margin around a long I or tall rotated footprint.
   */
  private previewUnitFor(type: PieceType, width: number, height: number, dualPreview: boolean): number {
    const shape = PIECE_SHAPES[type][0];
    const spanX = Math.max(...shape.map((cell) => cell.x)) - Math.min(...shape.map((cell) => cell.x)) + 1;
    const spanY = Math.max(...shape.map((cell) => cell.y)) - Math.min(...shape.map((cell) => cell.y)) + 1;
    const horizontalAllowance = Math.max(0, width) * (dualPreview ? 0.76 : 0.84);
    const verticalAllowance = Math.max(0, height) * (dualPreview ? 0.76 : 0.82);
    const cap = dualPreview ? 28 : 36;
    return Math.max(5, Math.min(cap, horizontalAllowance / spanX, verticalAllowance / spanY));
  }

  private drawReducedMutationEndpoint(
    graphics: Graphics,
    item: MutationItem,
    centerX: number,
    centerY: number,
    size: number,
    factor: 2 | 4,
  ): void {
    const token = MUTATION_VFX_TOKENS[item];
    const stroke = Math.max(1, size * .1);
    if (item === 'freeze') {
      this.drawMutationDiamond(graphics, centerX, centerY, size * .58, size, token.palette.highlight, .44);
      this.drawMutationDiamond(graphics, centerX, centerY, size * .28, size * .52, token.palette.primary, .88);
      this.strokeSegments(graphics, [
        [centerX - size * .9, centerY, centerX + size * .9, centerY],
        [centerX, centerY - size * .9, centerX, centerY + size * .9],
      ], token.palette.highlight, .82, stroke);
      return;
    }
    if (item === 'collapse') {
      for (let index = 0; index < 3; index += 1) {
        const y = centerY - size * .42 + index * size * .34;
        const halfWidth = size * (.72 - index * .14);
        this.strokeSegments(
          graphics,
          [[centerX - halfWidth, y, centerX + halfWidth, y]],
          index === 1 ? token.palette.highlight : token.palette.primary,
          .88 - index * .14,
          stroke,
        );
      }
      this.strokeSegments(graphics, [
        [centerX, centerY + size * .28, centerX, centerY + size * .94],
      ], token.palette.highlight, .74, stroke * .72);
      return;
    }
    if (item === 'bomb') {
      graphics
        .circle(centerX, centerY, size * .34)
        .fill({ color: token.palette.primary, alpha: .74 })
        .circle(centerX, centerY, size * .72)
        .stroke({ color: token.palette.highlight, alpha: .92, width: stroke * 1.22 })
        .circle(centerX, centerY, size)
        .stroke({ color: token.palette.primary, alpha: .56, width: stroke });
      this.strokeSegments(graphics, [
        [centerX - size * .94, centerY - size * .42, centerX - size * .58, centerY - size * .26],
        [centerX + size * .58, centerY + size * .28, centerX + size * .96, centerY + size * .48],
        [centerX + size * .18, centerY - size * .72, centerX + size * .42, centerY - size * 1.08],
      ], token.palette.highlight, .84, stroke);
      return;
    }
    graphics.circle(centerX, centerY, size * 1.08).fill({ color: token.palette.primary, alpha: factor === 4 ? .28 : .18 });
    this.drawMutationStar(
      graphics,
      centerX,
      centerY,
      size * (factor === 4 ? .92 : .76),
      size * .28,
      token.palette.highlight,
      .92,
    );
    this.drawMutationMultiplierValue(
      graphics,
      centerX,
      centerY + size * .82,
      size * .32,
      factor,
      token.palette.highlight,
      1,
    );
  }

  private drawMutationSnowflake(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    radius: number,
    color: number,
    alpha: number,
    rotation = 0,
  ): void {
    const segments: Array<readonly [number, number, number, number]> = [];
    const branchRadius = radius * .26;
    for (let axis = 0; axis < 3; axis += 1) {
      const angle = rotation + axis * Math.PI / 3;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      segments.push([
        centerX - dx * radius,
        centerY - dy * radius,
        centerX + dx * radius,
        centerY + dy * radius,
      ]);
      for (const direction of [-1, 1] as const) {
        const branchX = centerX + dx * radius * .62 * direction;
        const branchY = centerY + dy * radius * .62 * direction;
        const reverseAngle = angle + (direction > 0 ? Math.PI : 0);
        for (const branchTurn of [-.62, .62] as const) {
          segments.push([
            branchX,
            branchY,
            branchX + Math.cos(reverseAngle + branchTurn) * branchRadius,
            branchY + Math.sin(reverseAngle + branchTurn) * branchRadius,
          ]);
        }
      }
    }
    this.strokeSegments(graphics, segments, color, alpha, Math.max(1, radius * .16));
  }

  private drawGravityFactorParticle(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    radius: number,
    color: number,
    alpha: number,
    scale = 1,
  ): void {
    const radiusX = radius * .72 * scale;
    const radiusY = radius * scale;
    graphics.poly([
      centerX,
      centerY - radiusY,
      centerX + radiusX,
      centerY - radiusY * .08,
      centerX,
      centerY + radiusY,
      centerX - radiusX,
      centerY - radiusY * .08,
    ]).fill({ color, alpha });
    const chevronTop = centerY + radiusY * 1.3;
    const chevronHalf = radiusX * .72;
    this.strokeSegments(graphics, [
      [centerX - chevronHalf, chevronTop, centerX, chevronTop + radiusY * .42],
      [centerX, chevronTop + radiusY * .42, centerX + chevronHalf, chevronTop],
    ], color, alpha * .82, Math.max(1, radius * .14));
  }

  private drawMutationActivationEffect(
    graphics: Graphics,
    flash: MutationFlash,
    layout: BoardLayout,
  ): void {
    const token = MUTATION_VFX_TOKENS[flash.item];
    const cells = flash.triggerCells
      .filter((cell) => cell.y >= VISIBLE_START_ROW && cell.y < VISIBLE_START_ROW + VISIBLE_HEIGHT)
      .map((cell) => ({ x: cell.x, y: cell.y - VISIBLE_START_ROW }));
    const minX = cells.length ? Math.min(...cells.map((cell) => cell.x)) : BOARD_WIDTH / 2 - 0.5;
    const maxX = cells.length ? Math.max(...cells.map((cell) => cell.x)) : BOARD_WIDTH / 2 - 0.5;
    const minY = cells.length ? Math.min(...cells.map((cell) => cell.y)) : VISIBLE_HEIGHT * 0.42;
    const maxY = cells.length ? Math.max(...cells.map((cell) => cell.y)) : VISIBLE_HEIGHT * 0.42;
    const anchorX = layout.x + (minX + maxX + 1) * layout.cell / 2;
    const anchorY = layout.y + (minY + maxY + 1) * layout.cell / 2;
    const strokeWidth = Math.max(1, layout.cell * 0.06);

    if (flash.item === 'bomb' && flash.bombOutcome === 'chain-clear') {
      this.drawMutationChainClear(graphics, flash, layout);
      return;
    }

    if (this.options.reducedMotion) {
      if (flash.item === 'freeze') {
        const sourceCells = [...cells]
          .sort((left, right) => left.y - right.y || left.x - right.x)
          .filter((cell, index, ordered) => index === 0 || cell.x !== ordered[index - 1]!.x || cell.y !== ordered[index - 1]!.y);
        if (sourceCells.length === 0) return;
        const offsets = [[-.18, -.08], [.19, .04], [-.04, .18]] as const;
        for (let index = 0; index < 3; index += 1) {
          const cell = sourceCells[Math.floor(index * sourceCells.length / 3)]!;
          const [offsetX, offsetY] = offsets[index]!;
          this.drawMutationSnowflake(
            graphics,
            layout.x + (cell.x + .5 + offsetX) * layout.cell,
            layout.y + (cell.y + .5 + offsetY) * layout.cell,
            layout.cell * [.12, .1, .11][index]!,
            token.palette.highlight,
            .52,
            [-.2, .16, -.12][index]!,
          );
        }
        return;
      }
      if (flash.item === 'collapse') {
        const bottomByColumn = new Map<number, number>();
        for (const cell of cells) {
          if (!flash.triggerColumns.includes(cell.x)) continue;
          bottomByColumn.set(cell.x, Math.max(bottomByColumn.get(cell.x) ?? -Infinity, cell.y + 1));
        }
        const sources = [...bottomByColumn.entries()].sort(([left], [right]) => left - right);
        if (sources.length === 0) return;
        for (let index = 0; index < 3; index += 1) {
          const [column, bottom] = sources[Math.floor(index * sources.length / 3)]!;
          this.drawGravityFactorParticle(
            graphics,
            layout.x + (column + .5 + [-.08, .06, 0][index]!) * layout.cell,
            Math.min(layout.y + layout.height - layout.cell * .18, layout.y + bottom * layout.cell + layout.cell * [.06, .12, .18][index]!),
            layout.cell * [.105, .09, .1][index]!,
            token.palette.highlight,
            .52,
          );
        }
        return;
      }
      this.drawReducedMutationEndpoint(
        graphics,
        flash.item,
        anchorX,
        anchorY,
        Math.max(layout.cell * .72, layout.width * .042),
        flash.multiplierFactor,
      );
      return;
    }

    if (flash.item === 'freeze') {
      const bind = flash.timeline.sample('frost-bind');
      const release = flash.timeline.sample('shard-release');
      if (!bind.active && !release.active) return;
      const sourceCells = [...cells]
        .sort((left, right) => left.y - right.y || left.x - right.x)
        .filter((cell, index, ordered) => index === 0 || cell.x !== ordered[index - 1]!.x || cell.y !== ordered[index - 1]!.y);
      if (sourceCells.length === 0) return;
      const phaseProgress = bind.active ? bind.progress * .42 : .42 + release.progress * .58;
      const sourceOffsets = [[-.22, -.04], [.18, .06], [-.08, .17], [.24, -.15]] as const;
      const drift = [[-.1, -.34], [.08, -.45], [.04, -.29], [-.06, -.4]] as const;
      const radii = [.12, .1, .11, .09] as const;
      const rotations = [-.21, .17, -.14, .24] as const;
      for (let index = 0; index < 4; index += 1) {
        const cell = sourceCells[Math.floor(index * sourceCells.length / 4)]!;
        const localProgress = Math.max(0, Math.min(1, (phaseProgress - index * .06) / .82));
        const [offsetX, offsetY] = sourceOffsets[index]!;
        const [driftX, driftY] = drift[index]!;
        const releaseFade = release.active ? 1 - release.progress : 1;
        this.drawMutationSnowflake(
          graphics,
          layout.x + (cell.x + .5 + offsetX + driftX * localProgress) * layout.cell,
          layout.y + (cell.y + .5 + offsetY + driftY * localProgress) * layout.cell,
          layout.cell * radii[index]! * (.62 + localProgress * .48),
          token.palette.highlight,
          (.24 + localProgress * .58) * releaseFade,
          rotations[index]! + localProgress * (index % 2 === 0 ? -.38 : .34),
        );
      }
      return;
    }

    if (flash.item === 'collapse') {
      const pressure = flash.timeline.sample('pressure-bind');
      const release = flash.timeline.sample('column-release');
      if (!pressure.active && !release.active) return;
      const bottomByColumn = new Map<number, number>();
      for (const cell of cells) {
        if (!flash.triggerColumns.includes(cell.x)) continue;
        bottomByColumn.set(cell.x, Math.max(bottomByColumn.get(cell.x) ?? -Infinity, cell.y + 1));
      }
      const sources = [...bottomByColumn.entries()].sort(([left], [right]) => left - right);
      if (sources.length === 0) return;
      const phaseProgress = pressure.active ? pressure.progress * .4 : .4 + release.progress * .6;
      const lateralDrift = [-.24, -.12, 0, .14, .25] as const;
      const verticalTravel = [.38, .52, .62, .46, .56] as const;
      for (let index = 0; index < 5; index += 1) {
        const [column, bottom] = sources[Math.floor(index * sources.length / 5)]!;
        const localProgress = Math.max(0, Math.min(1, (phaseProgress - index * .045) / .82));
        const sourceY = layout.y + bottom * layout.cell;
        const releaseFade = release.active ? 1 - release.progress : 1;
        this.drawGravityFactorParticle(
          graphics,
          layout.x + (column + .5 + lateralDrift[index]! * localProgress) * layout.cell,
          Math.min(
            layout.y + layout.height - layout.cell * .25,
            sourceY + layout.cell * (.04 + verticalTravel[index]! * localProgress),
          ),
          layout.cell * (.085 + (index % 2) * .012),
          token.palette.highlight,
          (.22 + localProgress * .58) * releaseFade,
          .66 + localProgress * .52,
        );
      }
      return;
    }

    if (flash.item === 'bomb') {
      const warning = flash.timeline.sample('warning');
      const pulse = flash.timeline.sample('pulse');
      const impact = flash.timeline.sample('impact');
      const shockwave = flash.timeline.sample('shockwave');
      const visibleRows = flash.blastRows.filter((row) => row >= VISIBLE_START_ROW && row < BOARD_HEIGHT);
      const firstRow = visibleRows.length ? Math.min(...visibleRows) : BOARD_HEIGHT - 1;
      const lastRow = visibleRows.length ? Math.max(...visibleRows) : BOARD_HEIGHT - 1;
      const y = layout.y + (firstRow - VISIBLE_START_ROW) * layout.cell;
      const fieldBottom = layout.y + (lastRow - VISIBLE_START_ROW + 1) * layout.cell;
      const floorField = (alpha: number, lift: number, color: number): void => {
        const points: number[] = [layout.x, fieldBottom, layout.x, y + layout.cell * .82];
        const ridge = [.72, .3, .58, .18, .5, .26, .68, .16, .44, .34, .7] as const;
        for (let index = 0; index < ridge.length; index += 1) {
          points.push(
            layout.x + layout.width * index / (ridge.length - 1),
            y + layout.cell * (ridge[index]! - lift),
          );
        }
        points.push(layout.x + layout.width, fieldBottom);
        graphics.poly(points).fill({ color, alpha });
      };
      if (warning.active) {
        const alpha = .55 + Math.sin(warning.progress * Math.PI * 3) * .28;
        floorField(.27 * alpha, 0, token.palette.deep);
        for (const [xFactor, yFactor, scale] of [[.08, .6, .4], [.24, .3, .32], [.48, .52, .46], [.69, .18, .3], [.9, .42, .38]] as const) {
          this.drawMutationDiamond(
            graphics,
            layout.x + layout.width * xFactor,
            y + layout.cell * yFactor,
            layout.cell * scale * .18,
            layout.cell * scale * .46,
            token.palette.primary,
            .62 * alpha,
          );
        }
      }
      if (pulse.active) {
        const alpha = Math.sin(pulse.progress * Math.PI);
        const radius = Math.max(layout.cell * 1.1, layout.width * (.06 + pulse.value * .12));
        graphics
          .circle(anchorX, anchorY, radius)
          .fill({ color: token.palette.primary, alpha: .24 * alpha })
          .circle(anchorX, anchorY, radius * 1.35)
          .stroke({ color: token.palette.highlight, alpha: .9 * alpha, width: strokeWidth });
      }
      if (impact.active) {
        const alpha = 1 - impact.progress;
        floorField(.42 * alpha, .18, token.palette.primary);
        floorField(.18 * alpha, .42, token.palette.highlight);
      }
      if (shockwave.active) {
        const alpha = 1 - shockwave.progress;
        const radius = Math.max(layout.cell * 1.4, layout.width * (.12 + shockwave.value * .42));
        graphics
          .circle(anchorX, anchorY, radius)
          .stroke({ color: token.palette.highlight, alpha: .96 * alpha, width: Math.max(strokeWidth, layout.cell * .09) })
          .circle(anchorX, anchorY, radius * .68)
          .stroke({ color: token.palette.primary, alpha: .5 * alpha, width: strokeWidth });
      }
      return;
    }

    const scorePop = flash.timeline.sample('score-pop');
    const sparkTail = flash.timeline.sample('spark-tail');
    if (!scorePop.active && !sparkTail.active) return;
    const alpha = Math.max(scorePop.active ? 1 - scorePop.progress * .2 : 0, sparkTail.active ? 1 - sparkTail.progress : 0);
    const intensity = flash.multiplierFactor === 4 ? 1.32 : 1;
    const starRadius = Math.max(layout.cell * .74, layout.width * .048) * intensity;
    graphics.circle(anchorX, anchorY, starRadius * (2.1 + scorePop.value * .7)).fill({ color: token.palette.primary, alpha: 0.16 * alpha });
    this.drawMutationStar(graphics, anchorX, anchorY, starRadius * 1.72, starRadius * .46, token.palette.highlight, 0.96 * alpha);
    this.drawMutationStar(graphics, anchorX, anchorY, starRadius, starRadius * .28, token.palette.primary, alpha);
    this.strokeSegments(graphics, [
      [anchorX - starRadius * 2.55, anchorY, anchorX + starRadius * 2.55, anchorY],
      [anchorX, anchorY - starRadius * 2.55, anchorX, anchorY + starRadius * 2.55],
    ], token.palette.highlight, 0.76 * alpha, Math.max(1, layout.cell * .055));
    this.drawMutationMultiplierValue(
      graphics,
      anchorX,
      anchorY - starRadius * (1.58 + scorePop.value * .72),
      starRadius * .58,
      flash.multiplierFactor,
      token.palette.highlight,
      alpha,
    );
    this.drawMutationScoreValue(
      graphics,
      anchorX,
      anchorY - starRadius * (2.85 + scorePop.value * .88),
      starRadius * .34,
      flash.score,
      token.palette.highlight,
      alpha,
    );
  }

  /**
   * A small Pixi vector value instead of a DOM overlay: the immediate reward reads as
   * ×2 / ×4 beside the gold burst even when the Core event itself carries no direct score.
   */
  private drawMutationMultiplierValue(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    unit: number,
    factor: 2 | 4,
    color: number,
    alpha: number,
  ): void {
    const width = unit * 2.48;
    const height = unit * 1.3;
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    const stroke = Math.max(1, unit * .14);
    graphics
      .roundRect(left - unit * .3, top - unit * .24, width + unit * .6, height + unit * .48, Math.max(2, unit * .3))
      .fill({ color: MUTATION_VFX_TOKENS.multiplier.palette.deep, alpha: .22 * alpha })
      .stroke({ color, alpha: .62 * alpha, width: Math.max(1, stroke * .55) });
    const crossX = left + unit * .52;
    this.strokeSegments(graphics, [
      [crossX - unit * .24, centerY - unit * .24, crossX + unit * .24, centerY + unit * .24],
      [crossX + unit * .24, centerY - unit * .24, crossX - unit * .24, centerY + unit * .24],
    ], color, alpha, stroke);

    const digitLeft = left + unit * 1.12;
    const digitRight = digitLeft + unit * .78;
    const digitTop = top;
    const digitMiddle = centerY;
    const digitBottom = top + height;
    const segments: Array<readonly [number, number, number, number]> = factor === 2
      ? [
        [digitLeft, digitTop, digitRight, digitTop],
        [digitRight, digitTop, digitRight, digitMiddle],
        [digitLeft, digitMiddle, digitRight, digitMiddle],
        [digitLeft, digitMiddle, digitLeft, digitBottom],
        [digitLeft, digitBottom, digitRight, digitBottom],
      ]
      : [
        [digitLeft, digitTop, digitLeft, digitMiddle],
        [digitRight, digitTop, digitRight, digitBottom],
        [digitLeft, digitMiddle, digitRight, digitMiddle],
      ];
    this.strokeSegments(graphics, segments, color, alpha, stroke);
  }

  /** Vector score numerals remain legible without introducing a DOM overlay. */
  private drawMutationScoreValue(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    unit: number,
    score: number,
    color: number,
    alpha: number,
  ): void {
    const value = Math.max(0, Math.round(score));
    if (value === 0 || alpha <= 0) return;
    const glyphs = `+${value}`;
    const glyphWidth = unit * .72;
    const gap = unit * .22;
    const totalWidth = glyphs.length * glyphWidth + (glyphs.length - 1) * gap;
    const left = centerX - totalWidth / 2;
    const top = centerY - unit / 2;
    const stroke = Math.max(1, unit * .16);
    for (let glyphIndex = 0; glyphIndex < glyphs.length; glyphIndex += 1) {
      const glyph = glyphs[glyphIndex]!;
      const glyphLeft = left + glyphIndex * (glyphWidth + gap);
      if (glyph === '+') {
        this.strokeSegments(graphics, [
          [glyphLeft + glyphWidth * .16, centerY, glyphLeft + glyphWidth * .84, centerY],
          [glyphLeft + glyphWidth * .5, centerY - unit * .34, glyphLeft + glyphWidth * .5, centerY + unit * .34],
        ], color, alpha, stroke);
        continue;
      }
      const activeSegments = SCORE_DIGIT_SEGMENTS[glyph];
      if (!activeSegments) continue;
      for (const segmentIndex of activeSegments) {
        const segment = SCORE_SEGMENT_COORDINATES[segmentIndex]!;
        graphics
          .moveTo(glyphLeft + glyphWidth * segment[0], top + unit * segment[1])
          .lineTo(glyphLeft + glyphWidth * segment[2], top + unit * segment[3])
          .stroke({ color, alpha, width: stroke });
      }
    }
  }

  /** Sync renderer-only field transitions from Core's authoritative timers. */
  private syncMutationFields(state: GameState): void {
    const timed: Array<{ item: TimedMutationItem; active: boolean }> = [
      { item: 'freeze', active: state.mode === 'sprint' && state.mutationFreezeTicks > 0 },
      {
        item: 'collapse',
        active: state.mode === 'sprint'
          && (state.mutationCollapsePiecesRemaining > 0 || state.mutationCollapseLandingLatched),
      },
      { item: 'multiplier', active: state.mode === 'sprint' && state.mutationMultiplierTicks > 0 },
    ];
    for (const { item, active } of timed) {
      const field = this.mutationFields.get(item);
      if (active) {
        if (!field || field.stage === 'exit') this.mutationFields.set(item, { item, stage: 'enter', elapsed: 0 });
      } else if (field && field.stage !== 'exit') {
        field.stage = 'exit';
        field.elapsed = 0;
      }
    }
  }

  private advanceMutationFields(deltaMs: number): void {
    for (const [item, field] of this.mutationFields) {
      if (field.stage === 'active') continue;
      field.elapsed += Math.max(0, deltaMs);
      const timing = MUTATION_VFX_TOKENS[item].animation;
      if (field.stage === 'enter' && field.elapsed >= timing.enterMs) {
        field.stage = 'active';
        field.elapsed = 0;
      } else if (field.stage === 'exit' && field.elapsed >= timing.exitMs) {
        this.mutationFields.delete(item);
      }
    }
  }

  private clearMutationVisualState(): void {
    this.mutationFields.clear();
    this.mutationFlashQueue.length = 0;
    this.clearMutationParticles();
    this.resetMutationFilters();
    this.particleCursor = 0;
    this.particleSeed = 0x4d555441;
    this.mutationClockMs = 0;
    this.setWorldOffset(0, 0);
  }

  /** Foreground one new activation at a time; persistent timed fields still stack. */
  private clearMutationParticles(): void {
    for (const particle of this.mutationParticles) particle.active = false;
  }

  private enqueueMutationFlash(request: MutationFlashRequest): void {
    this.mutationFlashQueue.push(request);
    if (this.mutationFlash === null) this.startNextMutationFlash();
  }

  private mutationColumnsFor(cells: readonly Cell[]): readonly number[] {
    const seen = new Uint8Array(BOARD_WIDTH);
    const columns: number[] = [];
    for (const cell of cells) {
      if (cell.x < 0 || cell.x >= BOARD_WIDTH || seen[cell.x] !== 0) continue;
      seen[cell.x] = 1;
      columns.push(cell.x);
    }
    columns.sort((left, right) => left - right);
    return columns;
  }

  private startNextMutationFlash(): void {
    const request = this.mutationFlashQueue.shift();
    if (!request) {
      this.mutationFlash = null;
      return;
    }
    const chainDuration = request.bombOutcome === 'chain-clear'
      ? mutationChainPresentationPlan(request.chainOriginCells, this.options.reducedMotion).durationMs
      : 0;
    const timeline = createMutationActivationTimeline(request.item, chainDuration);
    this.mutationFlash = {
      item: request.item,
      elapsed: 0,
      // The renderer owns this visual timeline only; Core retains item
      // duration, scoring, clears, and the instant Bomb removal rule.
      duration: timeline.duration,
      timeline,
      triggerCells: request.triggerCells,
      multiplierFactor: request.multiplierFactor,
      score: request.score,
      particlesEmitted: this.options.reducedMotion || request.item !== 'bomb',
      particlePreviousBoard: request.previousBoard,
      triggerColumns: this.mutationColumnsFor(request.triggerCells),
      bombOutcome: request.bombOutcome,
      blastRows: request.blastRows,
      chainOriginCells: request.chainOriginCells,
    };
    // Bomb owns a warning and pulse before impact, so its fragments cannot exist
    // until the impact phase begins. Only the multiplier keeps a local sparkle
    // burst; Ice and Supergravity activation geometry remains carrier-bound.
    if (request.item === 'multiplier' && !this.options.reducedMotion) {
      this.emitMutationParticles(request.item, request.triggerCells, request.previousBoard);
    }
    this.impact = this.options.reducedMotion ? 0.24 : request.item === 'bomb' ? 0 : 0.72;
  }

  private emitDeferredBombImpact(flash: MutationFlash): void {
    if (flash.item !== 'bomb' || flash.particlesEmitted) return;
    const impact = flash.timeline.sample('impact');
    if (!impact.active && !impact.complete) return;
    flash.particlesEmitted = true;
    if (this.options.reducedMotion) return;
    this.emitMutationParticles('bomb', flash.triggerCells, flash.particlePreviousBoard);
    this.impact = Math.max(this.impact, 1.05);
  }

  /** Pixi nulls display-object points during unmount; cleanup must stay safe. */
  private setWorldOffset(x: number, y: number): void {
    const position = (this.world as unknown as { position?: { set: (nextX: number, nextY: number) => void } | null }).position;
    position?.set(x, y);
  }

  /**
   * The only two GPU field effects are renderer-lifetime objects. A generated
   * displacement texture keeps the implementation original and avoids a second
   * visible canvas or a downloaded asset.
   */
  private initializeMutationFilters(): void {
    const frost = new NoiseFilter({ noise: 0, seed: 0 });
    frost.enabled = false;
    const map = this.createCollapseDisplacementMap();
    const collapse = map
      ? new DisplacementFilter({ sprite: map, scale: { x: 0, y: 0 } })
      : null;
    if (collapse) {
      collapse.enabled = false;
      // The displacement map participates in world transforms but never paints
      // into the one visible gameplay canvas as a normal sprite.
      map!.renderable = false;
      this.world.addChild(map!);
    }
    this.frostFilter = frost;
    this.collapseFilter = collapse;
    this.collapseDisplacementMap = map;
    this.world.filters = collapse ? [frost, collapse] : [frost];
  }

  private createCollapseDisplacementMap(): Sprite | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const pixels = context.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4;
        const diagonalWave = Math.sin((x * 0.43) + (y * 0.21));
        const verticalWave = Math.cos((y * 0.51) - (x * 0.13));
        pixels.data[index] = 128 + Math.round(diagonalWave * 62);
        pixels.data[index + 1] = 128 + Math.round(verticalWave * 54);
        pixels.data[index + 2] = 255;
        pixels.data[index + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    return new Sprite(Texture.from(canvas, true));
  }

  private destroyMutationFilters(): void {
    this.world.filters = undefined;
    this.frostFilter?.destroy();
    this.collapseFilter?.destroy();
    const map = this.collapseDisplacementMap;
    if (map) {
      if (map.parent === this.world) this.world.removeChild(map);
      map.destroy({ texture: true, textureSource: true });
    }
    this.frostFilter = null;
    this.collapseFilter = null;
    this.collapseDisplacementMap = null;
    this.resetMutationFilters();
  }

  private resetMutationFilters(): void {
    this.mutationFilterState.freeze = false;
    this.mutationFilterState.collapse = false;
    if (this.frostFilter) {
      this.frostFilter.enabled = false;
      this.frostFilter.noise = 0;
    }
    if (this.collapseFilter) {
      this.collapseFilter.enabled = false;
      this.collapseFilter.scale.x = 0;
      this.collapseFilter.scale.y = 0;
    }
  }

  private mutationFieldOpacityFor(item: TimedMutationItem): number {
    const field = this.mutationFields.get(item);
    return field ? this.mutationFieldOpacity(field) : 0;
  }

  /** Maps Core timers to a bounded board filter without affecting Core state. */
  private syncMutationFilters(state: GameState, _layout: BoardLayout): void {
    if (this.options.reducedMotion || state.mode !== 'sprint') {
      this.resetMutationFilters();
      return;
    }

    this.mutationFilterState.freeze = false;
    // Collapse is intentionally vector-local. A world-wide displacement field
    // implies unaffected columns are moving and violates the actual-column contract.
    this.mutationFilterState.collapse = false;

    if (this.frostFilter) {
      // Ice is expressed by the board-local upper gradient. Leaving the reusable
      // filter disabled prevents a full-world blue/grain wash over pieces and HUD.
      this.frostFilter.enabled = false;
      this.frostFilter.noise = 0;
    }

    if (this.collapseFilter) {
      this.collapseFilter.enabled = false;
      this.collapseFilter.scale.x = 0;
      this.collapseFilter.scale.y = 0;
    }
  }

  /** Fixed-seed visual random sequence: cosmetic particles never affect Core. */
  private nextMutationRandom(): number {
    this.particleSeed = (Math.imul(this.particleSeed, 1664525) + 1013904223) >>> 0;
    return this.particleSeed / 0x1_0000_0000;
  }

  private emitMutationParticles(
    item: MutationItem,
    triggerCells: readonly Cell[],
    previousBoard: GameState['board'] | null,
  ): void {
    if (this.options.reducedMotion) return;
    const token = MUTATION_VFX_TOKENS[item];
    const sources: Cell[] = [];
    if (item === 'bomb' && previousBoard) {
      const rows = this.mutationFlash?.bombOutcome === 'chain-clear'
        ? Array.from({ length: VISIBLE_HEIGHT }, (_, index) => VISIBLE_START_ROW + index)
        : this.mutationFlash?.blastRows ?? [];
      for (const y of rows) {
        if (y < VISIBLE_START_ROW || y >= BOARD_HEIGHT) continue;
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          if (previousBoard[y]?.[x]) sources.push({ x, y });
        }
      }
    }
    if (sources.length === 0) sources.push(...triggerCells);
    if (sources.length === 0) sources.push({ x: Math.floor(BOARD_WIDTH / 2), y: VISIBLE_START_ROW + Math.floor(VISIBLE_HEIGHT * .43) });
    const count = Math.min(MUTATION_PARTICLE_LIMIT, token.particles.burst);
    for (let index = 0; index < count; index += 1) {
      const source = sources[index % sources.length]!;
      const particle = this.mutationParticles[this.particleCursor % this.mutationParticles.length]!;
      this.particleCursor = (this.particleCursor + 1) % this.mutationParticles.length;
      const angle = this.nextMutationRandom() * Math.PI * 2;
      const variance = .58 + this.nextMutationRandom() * .72;
      const speed = token.particles.speed * .006 * variance;
      particle.active = true;
      particle.item = item;
      particle.u = (source.x + .5) / BOARD_WIDTH;
      particle.v = (source.y - VISIBLE_START_ROW + .5) / VISIBLE_HEIGHT;
      particle.velocityU = Math.cos(angle) * speed;
      particle.velocityV = Math.sin(angle) * speed;
      if (item === 'freeze') particle.velocityV = -Math.abs(particle.velocityV) * .72 - speed * .18;
      if (item === 'collapse') particle.velocityV = Math.abs(particle.velocityV) * 1.26 + speed * .18;
      if (item === 'bomb') particle.velocityV -= speed * .44;
      if (item === 'multiplier') particle.velocityV -= speed * .36;
      particle.elapsed = 0;
      particle.lifeMs = token.particles.lifeMs * (.72 + this.nextMutationRandom() * .38);
      particle.size = token.particles.size * (.72 + this.nextMutationRandom() * .62);
      particle.color = this.nextMutationRandom() > .43 ? token.palette.highlight : token.palette.primary;
      particle.rotation = this.nextMutationRandom() * Math.PI * 2;
      particle.rotationVelocity = (this.nextMutationRandom() - .5) * .009;
    }
  }

  private advanceMutationParticles(deltaMs: number): void {
    for (const particle of this.mutationParticles) {
      if (!particle.active) continue;
      particle.elapsed += Math.max(0, deltaMs);
      if (particle.elapsed >= particle.lifeMs) particle.active = false;
    }
  }

  private drawMutationParticles(graphics: Graphics, layout: BoardLayout): void {
    if (this.options.reducedMotion) return;
    for (const particle of this.mutationParticles) {
      if (!particle.active) continue;
      const progress = Math.min(1, particle.elapsed / particle.lifeMs);
      const alpha = Math.pow(1 - progress, particle.item === 'bomb' ? .58 : 1.16);
      if (alpha <= .01) continue;
      const x = layout.x + (particle.u + particle.velocityU * particle.elapsed) * layout.width;
      const gravity = particle.item === 'collapse' ? progress * progress * .13 : particle.item === 'bomb' ? progress * progress * .08 : 0;
      const y = layout.y + (particle.v + particle.velocityV * particle.elapsed + gravity) * layout.height;
      const size = Math.max(1.5, layout.cell * particle.size * (particle.item === 'bomb' ? 1 - progress * .32 : 1));
      if (particle.item === 'freeze') {
        this.drawMutationDiamond(graphics, x, y, size * .45, size, particle.color, .82 * alpha);
      } else if (particle.item === 'collapse') {
        graphics
          .roundRect(x - size * .72, y - size * .11, size * 1.44, size * .22, size * .1)
          .fill({ color: particle.color, alpha: .66 * alpha });
      } else if (particle.item === 'bomb') {
        this.drawMutationFragment(
          graphics,
          x,
          y,
          size * 1.44,
          size * .76,
          particle.rotation + particle.rotationVelocity * particle.elapsed,
          particle.color,
          .86 * alpha,
        );
      } else {
        this.drawMutationStar(graphics, x, y, size, size * .34, particle.color, .82 * alpha);
      }
    }
  }

  /** A rotating Bomb fragment, drawn without allocating a Pixi display object. */
  private drawMutationFragment(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    rotation: number,
    color: number,
    alpha: number,
  ): void {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const leftTopX = centerX - halfWidth * cosine + halfHeight * sine;
    const leftTopY = centerY - halfWidth * sine - halfHeight * cosine;
    const rightTopX = centerX + halfWidth * cosine + halfHeight * sine;
    const rightTopY = centerY + halfWidth * sine - halfHeight * cosine;
    const rightBottomX = centerX + halfWidth * cosine - halfHeight * sine;
    const rightBottomY = centerY + halfWidth * sine + halfHeight * cosine;
    const leftBottomX = centerX - halfWidth * cosine - halfHeight * sine;
    const leftBottomY = centerY - halfWidth * sine + halfHeight * cosine;
    graphics
      .moveTo(leftTopX, leftTopY)
      .lineTo(rightTopX, rightTopY)
      .lineTo(rightBottomX, rightBottomY)
      .lineTo(leftBottomX, leftBottomY)
      .lineTo(leftTopX, leftTopY)
      .fill({ color, alpha });
  }

  private applyMutationCameraShake(layout: BoardLayout): void {
    const flash = this.mutationFlash;
    if (this.options.reducedMotion || !flash || flash.item !== 'bomb') {
      this.setWorldOffset(0, 0);
      return;
    }
    const pulse = flash.timeline.sample('pulse');
    const impact = flash.timeline.sample('impact');
    const shockwave = flash.timeline.sample('shockwave');
    const envelope = Math.max(
      pulse.active ? Math.sin(pulse.progress * Math.PI) * .48 : 0,
      impact.active ? 1 - impact.progress * .28 : 0,
      shockwave.active ? (1 - shockwave.progress) * .38 : 0,
    );
    if (envelope <= 0) {
      this.setWorldOffset(0, 0);
      return;
    }
    const amplitude = Math.min(8, Math.max(2, layout.cell * .2)) * envelope;
    const phase = this.mutationClockMs / 29;
    this.setWorldOffset(Math.sin(phase * 1.7) * amplitude, Math.cos(phase * 2.3) * amplitude * .55);
  }

  private enqueueClassicFeedback(
    kind: ClassicFeedbackKind,
    details: Partial<Pick<ClassicFeedbackCue, 'cells' | 'rows' | 'combo' | 'tier'>> = {},
  ): void {
    const fullDuration = kind === 'combo' ? 300 : kind === 'speed-up' ? 360 : 440;
    const reducedDuration = kind === 'combo' ? 150 : kind === 'speed-up' ? 170 : 200;
    this.classicFeedbackCues.push({
      kind,
      elapsed: 0,
      duration: this.options.reducedMotion ? reducedDuration : fullDuration,
      cells: (details.cells ?? []).map((cell) => ({ ...cell })),
      rows: [...(details.rows ?? [])],
      combo: details.combo ?? 0,
      tier: details.tier ?? 0,
    });
    if (this.classicFeedbackCues.length > CLASSIC_FEEDBACK_LIMIT) {
      this.classicFeedbackCues.splice(
        0,
        this.classicFeedbackCues.length - CLASSIC_FEEDBACK_LIMIT,
      );
    }
  }

  private landingSupportCells(
    cells: readonly Cell[],
    board: GameState['board'] | undefined,
  ): Cell[] {
    const pieceCells = new Set(cells.map((cell) => cell.y * BOARD_WIDTH + cell.x));
    return cells.filter((cell) => {
      const belowY = cell.y + 1;
      if (pieceCells.has(belowY * BOARD_WIDTH + cell.x)) return false;
      if (belowY >= BOARD_HEIGHT) return true;
      return board?.[belowY]?.[cell.x] != null;
    });
  }

  private consumeEvents(
    events: readonly GameEvent[],
    state?: GameState,
    previousBoard: GameState['board'] | null = null,
  ): void {
    const classic = state?.mode === 'marathon';
    const clearsOnLock = events.some((event) => event.type === 'clear-started');
    const seenMutationItems = new Set<MutationItem>();
    const mutationActivations = events
      .filter((event): event is Extract<GameEvent, { type: 'mutation-activated' }> => event.type === 'mutation-activated')
      .filter((event) => {
        if (seenMutationItems.has(event.item)) return false;
        seenMutationItems.add(event.item);
        return true;
      })
      .sort((left, right) => Number(right.item === 'bomb') - Number(left.item === 'bomb'));
    for (const event of events) {
      if (event.type === 'piece-moved') {
        if (this.presentation) {
          const settleMs = event.cause === 'soft-drop' ? 26 : event.cause === 'gravity' ? 82 : 56;
          this.presentation.settleMs = Math.min(this.presentation.settleMs, settleMs);
        }
      } else if (event.type === 'piece-rotated') {
        this.rotationPulse = this.options.reducedMotion ? 0 : 1;
      } else if (event.type === 'restarted') {
        this.presentation = null;
        this.activeSpawnGenerationKey = null;
        this.activeSpawnEntry = null;
        this.boardShift = null;
        this.ordinaryMultiLineClearCues.length = 0;
        this.classicFeedbackCues.length = 0;
        this.clearSurvivalVisualState();
        this.mutationFlash = null;
        this.mutationArrival = null;
        this.activeMutationCarrierId = null;
        this.clearMutationVisualState();
        this.previousBoard = null;
      } else if (event.type === 'endgame-undone') {
        // Undo restores a pre-lock Core snapshot. Any lock, trail, line-impact, or
        // interpolation residue belongs to the discarded timeline and must not
        // linger over the restored board for a frame.
        this.presentation = null;
        this.activeSpawnGenerationKey = null;
        this.activeSpawnEntry = null;
        this.trail = null;
        this.lockPulse = null;
        this.ordinaryMultiLineClearCues.length = 0;
        this.classicFeedbackCues.length = 0;
        this.impact = 0;
        this.rotationPulse = 0;
        this.boardShift = null;
        this.clearSurvivalVisualState();
        this.mutationFlash = null;
        this.mutationArrival = null;
        this.activeMutationCarrierId = null;
        this.clearMutationVisualState();
        this.previousBoard = null;
      } else if (event.type === 'piece-locked') {
        this.lockPulse = {
          cells: this.landingSupportCells(event.cells, state?.board),
          elapsed: 0,
          duration: this.options.reducedMotion ? 80 : CELL_STYLE.landingImprintDurationMs,
          piece: event.piece,
          strength: clearsOnLock ? 0.55 : 1,
        };
      } else if (event.type === 'hard-dropped') {
        this.impact = this.options.reducedMotion ? 0.25 : 1;
        const lock = events.find((candidate) => candidate.type === 'piece-locked');
        if (lock?.type === 'piece-locked' && !clearsOnLock && event.distance > 0) {
          this.trail = {
            cells: lock.cells,
            distance: event.distance,
            elapsed: 0,
            duration: this.options.reducedMotion ? 1 : 50,
            piece: event.piece,
          };
        }
      } else if (event.type === 'clear-started') {
        this.enqueueOrdinaryMultiLineClearCue(event.rows, state);
      } else if (event.type === 'lines-cleared') {
        this.impact = this.options.reducedMotion ? 0.3 : Math.min(1.4, 0.55 + event.count * 0.2);
        this.commitOrdinaryMultiLineClearCue(event.rows);
        if (classic) {
          if ((state?.combo ?? 0) > 1) {
            this.enqueueClassicFeedback('combo', {
              rows: event.rows,
              combo: state?.combo ?? 0,
            });
          }
          const previousLines = Math.max(0, (state?.lines ?? event.count) - event.count);
          const previousTier = Math.floor(previousLines / 10);
          const currentTier = Math.floor((state?.lines ?? previousLines) / 10);
          if (currentTier > previousTier) {
            this.enqueueClassicFeedback('speed-up', { tier: currentTier });
          }
        }
      } else if (event.type === 'survival-stones-spawned') {
        this.impact = Math.max(this.impact, this.options.reducedMotion ? 0.1 : 0.24);
        this.enqueueSurvivalStoneCue('spawn', event.cells);
      } else if (event.type === 'survival-stones-landed') {
        this.impact = Math.max(this.impact, this.options.reducedMotion ? 0.18 : 0.46);
        this.enqueueSurvivalStoneCue('land', event.cells);
      } else if (event.type === 'mutation-activated') {
        continue;
      } else if (event.type === 'level-up') {
        this.impact = this.options.reducedMotion ? 0.3 : 1.35;
      } else if (event.type === 'game-over' && classic) {
        this.enqueueClassicFeedback('top-out');
      } else if (event.type === 'bedrock-raised' || event.type === 'bedrock-lowered') {
        const direction = event.type === 'bedrock-raised' ? 'up' : 'down';
        this.survivalBedrockCue = {
          direction,
          height: event.height,
          elapsed: 0,
          duration: this.options.reducedMotion ? 80 : 180,
        };
        this.boardShift = this.options.reducedMotion
          ? null
          : { direction, elapsed: 0, duration: 180 };
      }
    }
    for (const event of mutationActivations) {
      this.enqueueMutationFlash({
        item: event.item,
        triggerCells: event.triggerCells ?? [],
        multiplierFactor: event.multiplierFactor ?? 2,
        score: event.score,
        previousBoard,
        bombOutcome: event.item === 'bomb' ? event.bombOutcome : null,
        blastRows: event.item === 'bomb' ? event.blastRows : [],
        chainOriginCells: event.item === 'bomb' && event.bombOutcome === 'chain-clear'
          ? event.chainOriginCells
          : [],
      });
    }
  }

  private drawMutationChainClear(
    graphics: Graphics,
    flash: MutationFlash,
    layout: BoardLayout,
  ): void {
    const board = flash.particlePreviousBoard;
    if (!board) return;
    const token = MUTATION_VFX_TOKENS.bomb;
    const plan = mutationChainPresentationPlan(flash.chainOriginCells, this.options.reducedMotion);
    const visibleOriginCells = flash.chainOriginCells
      .filter((cell) => cell.y >= VISIBLE_START_ROW && cell.y < BOARD_HEIGHT)
      .map((cell) => ({ x: cell.x, y: cell.y - VISIBLE_START_ROW }));

    if (flash.elapsed < plan.revealMs && visibleOriginCells.length > 0) {
      this.drawMutationPieceMaterial(
        graphics,
        visibleOriginCells,
        'T',
        'bomb',
        1,
        'settled',
        {
          originX: layout.x,
          originY: layout.y,
          unit: layout.cell,
          scale: 1 + (1 - flash.elapsed / plan.revealMs) * .06,
        },
      );
    }

    for (const { row, distance, startMs } of plan.rowBeats) {
      const progress = flash.elapsed < startMs
        ? 0
        : Math.min(1, (flash.elapsed - startMs) / plan.fadeMs);
      const cellAlpha = flash.elapsed < startMs ? 1 : Math.max(0, 1 - progress);
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const material = board[row]?.[x];
        if (!material || cellAlpha <= 0) continue;
        this.drawCellGroups(
          graphics,
          [{ x, y: row - VISIBLE_START_ROW }],
          material,
          cellAlpha,
          { originX: layout.x, originY: layout.y, unit: layout.cell },
        );
      }
      if (flash.elapsed < startMs) continue;
      const alpha = Math.max(0, 1 - progress);
      const rowY = layout.y + (row - VISIBLE_START_ROW) * layout.cell;
      graphics
        .rect(layout.x, rowY, layout.width, layout.cell)
        .fill({
          color: distance === 0 ? token.palette.highlight : token.palette.primary,
          alpha: .16 + alpha * .34,
        });
      if (!this.options.reducedMotion) {
        graphics
          .rect(layout.x, rowY + layout.cell * .45, layout.width, Math.max(1, layout.cell * .1))
          .fill({ color: token.palette.glow, alpha: alpha * .58 });
      }
    }

    const tailStart = plan.durationMs - plan.fadeMs;
    if (flash.elapsed >= tailStart) {
      const tail = Math.min(1, (flash.elapsed - tailStart) / plan.fadeMs);
      graphics
        .rect(layout.x, layout.y, layout.width, layout.height)
        .stroke({
          color: token.palette.highlight,
          alpha: (1 - tail) * .72,
          width: Math.max(1, layout.cell * .08),
        });
    }
  }

  private advanceEffects(deltaMs: number): void {
    this.mutationClockMs += Math.max(0, deltaMs);
    this.advanceMutationFields(deltaMs);
    this.advanceMutationParticles(deltaMs);
    if (this.trail) {
      this.trail.elapsed += deltaMs;
      if (this.trail.elapsed >= this.trail.duration) this.trail = null;
    }
    if (this.lockPulse) {
      this.lockPulse.elapsed += deltaMs;
      if (this.lockPulse.elapsed >= this.lockPulse.duration) this.lockPulse = null;
    }
    for (let index = this.classicFeedbackCues.length - 1; index >= 0; index -= 1) {
      const cue = this.classicFeedbackCues[index]!;
      cue.elapsed += Math.max(0, deltaMs);
      if (cue.elapsed >= cue.duration) this.classicFeedbackCues.splice(index, 1);
    }
    if (this.boardShift) {
      this.boardShift.elapsed += deltaMs;
      if (this.boardShift.elapsed >= this.boardShift.duration) this.boardShift = null;
    }
    if (this.mutationFlash) {
      this.mutationFlash.timeline.advance(deltaMs);
      this.mutationFlash.elapsed = this.mutationFlash.timeline.elapsed;
      this.emitDeferredBombImpact(this.mutationFlash);
      if (this.mutationFlash.timeline.complete) this.startNextMutationFlash();
    }
    if (this.mutationArrival) {
      this.mutationArrival.elapsed += deltaMs;
      if (this.mutationArrival.elapsed >= this.mutationArrival.duration) this.mutationArrival = null;
    }
    for (let index = this.survivalStoneCues.length - 1; index >= 0; index -= 1) {
      const cue = this.survivalStoneCues[index]!;
      cue.elapsed += Math.max(0, deltaMs);
      if (cue.elapsed >= cue.duration) this.survivalStoneCues.splice(index, 1);
    }
    for (let index = this.ordinaryMultiLineClearCues.length - 1; index >= 0; index -= 1) {
      const cue = this.ordinaryMultiLineClearCues[index]!;
      if (cue.fresh) {
        cue.fresh = false;
        continue;
      }
      cue.elapsed += Math.max(0, deltaMs);
      if (cue.elapsed >= cue.duration) this.ordinaryMultiLineClearCues.splice(index, 1);
    }
    if (this.survivalBedrockCue) {
      this.survivalBedrockCue.elapsed += Math.max(0, deltaMs);
      if (this.survivalBedrockCue.elapsed >= this.survivalBedrockCue.duration) {
        this.survivalBedrockCue = null;
      }
    }
    if (this.survivalEntryBedrockRise) {
      this.survivalEntryBedrockRise.elapsed += Math.max(0, deltaMs);
      if (this.survivalEntryBedrockRise.elapsed >= this.survivalEntryBedrockRise.duration) {
        this.survivalEntryBedrockRise = null;
      }
    }
    this.impact = Math.max(0, this.impact - deltaMs / 260);
    this.rotationPulse = Math.max(0, this.rotationPulse - deltaMs / 110);
  }

  private enqueueSurvivalStoneCue(kind: SurvivalStoneCue['kind'], cells: readonly Cell[]): void {
    if (cells.length === 0) return;
    this.survivalStoneCues.push({
      kind,
      cells: cells.map((cell) => ({ ...cell })),
      elapsed: 0,
      duration: this.options.reducedMotion ? 80 : kind === 'spawn' ? 140 : 150,
    });
    if (this.survivalStoneCues.length > 8) {
      this.survivalStoneCues.splice(0, this.survivalStoneCues.length - 8);
    }
  }

  private clearSurvivalVisualState(): void {
    this.survivalDebrisPresentation.clear();
    this.survivalStoneCues.length = 0;
    this.survivalBedrockCue = null;
  }

  private advanceSurvivalDebrisPresentation(state: GameState, deltaMs: number): void {
    if (state.mode !== 'race') {
      this.clearSurvivalVisualState();
      return;
    }

    const visibleIds = new Set<number>();
    for (const stone of state.survivalDebris) {
      visibleIds.add(stone.id);
      const current = this.survivalDebrisPresentation.get(stone.id);
      if (
        !current
        || this.options.reducedMotion
        || Math.abs(current.x - stone.x) + Math.abs(current.y - stone.y) > 2.5
      ) {
        this.survivalDebrisPresentation.set(stone.id, { x: stone.x, y: stone.y });
        continue;
      }
      const next = approachPresentationPoint(current, stone, deltaMs, 112);
      current.x = next.x;
      current.y = next.y;
    }
    for (const id of this.survivalDebrisPresentation.keys()) {
      if (!visibleIds.has(id)) this.survivalDebrisPresentation.delete(id);
    }
  }

  private advancePresentation(state: GameState, deltaMs: number): void {
    const active = state.active;
    if (!active) {
      this.presentation = null;
      return;
    }
    if (
      !this.presentation
      || this.presentation.type !== active.type
      || Math.abs(this.presentation.x - active.x) + Math.abs(this.presentation.y - active.y) > 4
      || this.options.reducedMotion
    ) {
      this.presentation = { type: active.type, x: active.x, y: active.y, settleMs: 56 };
      return;
    }
    const next = approachPresentationPoint(
      this.presentation,
      active,
      deltaMs,
      this.presentation.settleMs,
    );
    this.presentation.x = next.x;
    this.presentation.y = next.y;
    this.presentation.settleMs += (64 - this.presentation.settleMs) * Math.min(1, deltaMs / 90);
  }

  private syncActiveSpawnEntry(state: GameState): void {
    if (
      state.status === 'ready'
      || state.status === 'game-over'
      || state.status === 'finished'
      || !state.active
    ) {
      this.activeSpawnGenerationKey = null;
      this.activeSpawnEntry = null;
      return;
    }

    const generationKey = `${state.pieceCount}:${state.active.type}`;
    const activeCells = cellsForPiece(state.active);
    if (generationKey !== this.activeSpawnGenerationKey) {
      this.activeSpawnGenerationKey = generationKey;
      this.activeSpawnEntry = {
        generationKey,
        pending: activeCells.some((cell) => cell.y < VISIBLE_START_ROW),
      };
      return;
    }

    if (!this.activeSpawnEntry?.pending) return;
    const allRowsInsideBoard = activeCells.every((cell) => cell.y >= VISIBLE_START_ROW);
    const presentationAtCoreRow = this.options.reducedMotion
      || !this.presentation
      || Math.abs(this.presentation.y - state.active.y) < 0.02;
    if (allRowsInsideBoard && presentationAtCoreRow) this.activeSpawnEntry.pending = false;
  }

  private updateSnapshot(state: GameState, layout: BoardLayout, app: Application): void {
    const drawableActive = state.status === 'ready' ? null : state.active;
    const activeCells = drawableActive ? cellsForPiece(drawableActive) : [];
    const ghostCells = drawableActive ? [...projectedLandingCells(state)] : [];
    const visibleActiveCells = activeCellsInsideVisibleRows(activeCells, VISIBLE_START_ROW, VISIBLE_HEIGHT)
      .map((cell) => ({ x: cell.x, y: cell.y - VISIBLE_START_ROW }));
    const activeSpawnEntry = this.activeSpawnEntry?.generationKey === this.activeSpawnGenerationKey
      ? {
          generationKey: this.activeSpawnEntry.generationKey,
          pending: this.activeSpawnEntry.pending,
          visibleCellCount: visibleActiveCells.length,
          hiddenCellCount: Math.max(0, activeCells.length - visibleActiveCells.length),
        }
      : null;
    const ordinaryLineClear = state.phase === 'line-clear'
      ? lineClearReleaseSnapshot(state.pendingClearRows, state.phaseTicks)
      : null;
    this.snapshot = {
      canvas: { width: app.screen.width, height: app.screen.height, resolution: app.renderer.resolution },
      board: { x: layout.x, y: layout.y, width: layout.width, height: layout.height, cell: layout.cell },
      preview: this.previewBounds,
      previewLayerVisible: this.previewLayerVisible,
      previewPiece: this.previewPiece,
      previewPieces: [...this.previewPieces],
      previewMutationItem: this.previewMutationItem,
      previewClearBounds: this.previewClearBounds,
      previewClearPiece: this.previewClearPiece,
      scrim: this.scrimBounds,
      activeCells,
      ghostCells,
      activeSpawnEntry,
      visibleLockedCells: this.snapshot.visibleLockedCells,
      ordinaryLineClear: ordinaryLineClear
        ? {
            count: ordinaryLineClear.count,
            orderedRows: [...ordinaryLineClear.orderedRows],
            releaseTicks: [...ordinaryLineClear.releaseTicks],
            releasedRows: [...ordinaryLineClear.releasedRows],
          }
        : null,
      ordinaryMultiLineClearCues: this.ordinaryMultiLineClearCues.map((cue) => ({
        count: cue.count,
        orderedRows: [...cue.orderedRows],
        elapsedMs: cue.elapsed,
        durationMs: cue.duration,
        committed: cue.committed,
        restrained: cue.restrained,
        visibleCellCount: cue.cells.reduce((visibleCount, { cell, rowOrder }) => {
          const sample = classicLineClearCellSample(
            cue.elapsed,
            cell.x,
            BOARD_WIDTH,
            rowOrder,
            cue.count,
            cue.restrained,
          );
          return visibleCount + Number(!sample.complete && sample.alpha > 0.001);
        }, 0),
      })),
      presentation: drawableActive && this.presentation
        ? {
            x: this.presentation.x,
            y: this.presentation.y,
            offsetX: this.presentation.x - drawableActive.x,
            offsetY: this.presentation.y - drawableActive.y,
          }
        : null,
      boardShiftOffsetY: this.snapshot.boardShiftOffsetY,
      mutationFilters: {
        freeze: this.mutationFilterState.freeze,
        collapse: this.mutationFilterState.collapse,
        activeCount: Number(this.mutationFilterState.freeze) + Number(this.mutationFilterState.collapse),
      },
      survivalDebris: state.mode === 'race'
        ? state.survivalDebris.map((pair) => ({
            ...pair,
            presentationY: this.survivalDebrisPresentation.get(pair.id)?.y ?? pair.y,
            cells: survivalDebrisCells(pair).map((cell) => ({ ...cell })),
          }))
        : [],
      survivalDebrisWarningColumns: state.mode === 'race' ? [...state.survivalDebrisWarningColumns] : [],
      survivalDebrisWarningHeight: state.mode === 'race' ? state.survivalDebrisWarningHeight : null,
      survivalStoneCueCount: this.survivalStoneCues.length,
      survivalBedrockCue: this.survivalBedrockCue
        ? {
            direction: this.survivalBedrockCue.direction,
            height: this.survivalBedrockCue.height,
            elapsedMs: this.survivalBedrockCue.elapsed,
            durationMs: this.survivalBedrockCue.duration,
          }
        : null,
      survivalEntryBedrockRows: this.snapshot.survivalEntryBedrockRows,
      survivalEntryBedrockRise: this.snapshot.survivalEntryBedrockRise,
    };
  }
}
