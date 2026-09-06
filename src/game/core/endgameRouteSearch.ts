import { canPlace } from './board';
import { BOARD_HEIGHT, BOARD_WIDTH, NEXT_QUEUE_SIZE } from './constants';
import { createInitialState, dispatch, stateHash } from './engine';
import { getEndgameDefinition, type EndgameDefinition } from './endgames';
import { PIECE_SHAPES } from './pieces';
import { drawPiece } from './random';
import {
  ANCHOR_CELL,
  PIECE_TYPES,
  type ActivePiece,
  type Board,
  type Cell,
  type EndgameId,
  type GameCommand,
  type GameState,
  type PieceType,
  type Rotation,
} from './types';

/** Public controls available to the ordinary Endgame player and recorded in route evidence. */
export type EndgameRouteToken = 'S' | 'T' | 'L' | 'R' | 'C' | 'Q' | 'D' | 'H';

const PLANNER_COMMANDS: readonly GameCommand[] = Object.freeze([
  { type: 'rotate', direction: 1 },
  { type: 'rotate', direction: -1 },
  { type: 'move', dx: -1 },
  { type: 'move', dx: 1 },
]);

const EXHAUSTIVE_PLANNER_COMMANDS: readonly GameCommand[] = Object.freeze([
  ...PLANNER_COMMANDS,
  { type: 'soft-drop' },
]);

const MAX_SETTLEMENT_TICKS = 32;
/** Long F5 certificates use an additional conservative supply bound; short frozen certificates retain their telemetry. */
const LONG_PROOF_INTERVAL_BOUND_MINIMUM_LOCKS = 9;

type ColumnInterval = Readonly<{ left: number; right: number }>;
const COLUMN_MASK_COUNT = 1 << BOARD_WIDTH;

const COLUMN_INTERVALS: readonly ColumnInterval[] = Object.freeze(
  Array.from({ length: BOARD_WIDTH }, (_, left) => (
    Array.from({ length: BOARD_WIDTH - left }, (_, offset) => Object.freeze({ left, right: left + offset }))
  )).flat(),
);

function maximumPieceCellsInInterval(piece: PieceType, interval: ColumnInterval): number {
  let maximum = 0;
  for (const rotation of [0, 1, 2, 3] as const) {
    for (let originX = -3; originX < BOARD_WIDTH; originX += 1) {
      const cells = PIECE_SHAPES[piece][rotation];
      if (cells.some((cell) => cell.x + originX < 0 || cell.x + originX >= BOARD_WIDTH)) continue;
      let covered = 0;
      for (const cell of cells) {
        const x = cell.x + originX;
        if (x >= interval.left && x <= interval.right) covered += 1;
      }
      maximum = Math.max(maximum, covered);
    }
  }
  return maximum;
}

const PIECE_INTERVAL_CAPACITY: Readonly<Record<PieceType, readonly number[]>> = Object.freeze(
  Object.fromEntries(PIECE_TYPES.map((piece) => [
    piece,
    Object.freeze(COLUMN_INTERVALS.map((interval) => maximumPieceCellsInInterval(piece, interval))),
  ])) as Record<PieceType, readonly number[]>,
);

function maximumPieceCellsInColumnMask(piece: PieceType, mask: number): number {
  let maximum = 0;
  for (const rotation of [0, 1, 2, 3] as const) {
    for (let originX = -3; originX < BOARD_WIDTH; originX += 1) {
      const cells = PIECE_SHAPES[piece][rotation];
      if (cells.some((cell) => cell.x + originX < 0 || cell.x + originX >= BOARD_WIDTH)) continue;
      let covered = 0;
      for (const cell of cells) {
        const x = cell.x + originX;
        if ((mask & (1 << x)) !== 0) covered += 1;
      }
      maximum = Math.max(maximum, covered);
    }
  }
  return maximum;
}

const PIECE_COLUMN_MASK_CAPACITY: Readonly<Record<PieceType, readonly number[]>> = Object.freeze(
  Object.fromEntries(PIECE_TYPES.map((piece) => [
    piece,
    Object.freeze(Array.from({ length: COLUMN_MASK_COUNT }, (_, mask) => (
      mask === 0 ? 0 : maximumPieceCellsInColumnMask(piece, mask)
    ))),
  ])) as Record<PieceType, readonly number[]>,
);

export interface EndgameRouteMetrics {
  commandCount: number;
  locks: number;
  rotationCount: number;
  moveCount: number;
}

/** A landed piece, independent from redundant pre-drop input. */
export interface EndgameLockPlacement {
  piece: PieceType;
  cells: readonly Cell[];
  signature: string;
}

export interface EndgameRouteReplay {
  state: GameState;
  commands: readonly GameCommand[];
  locks: readonly EndgameLockPlacement[];
}

export interface EndgameLanding {
  state: GameState;
  commands: readonly GameCommand[];
  lock: EndgameLockPlacement;
}

interface SearchNode {
  state: GameState;
  parent: SearchNode | null;
  segment: readonly GameCommand[];
  lock: EndgameLockPlacement | null;
  depth: number;
  cost: number;
}

export interface EndgameRouteSearchOptions {
  /** A small recovery margin keeps alternatives legible instead of accepting long salvage play. */
  maxLocks?: number;
  /** Bounded beam width keeps authoring search repeatable and quick. */
  beamWidth?: number;
}

export interface EndgameAlternativeSearchResult {
  canonical: EndgameRouteReplay;
  alternative: EndgameRouteReplay | null;
  /** One-based locked-piece index; null means no meaningful alternative was found. */
  firstDivergenceLock: number | null;
}

export type EndgameOptimalRouteDepthRecord = Readonly<{
  lockedPieces: number;
  frontierStates: number;
  transitions: number;
  boundPrunes: number;
}>;

export interface EndgameOptimalRouteCertificate {
  levelId: EndgameId;
  /** Exact minimum number of locked pieces in the complete public-control domain. */
  optimalLocks: number;
  /** Immutable proof telemetry for every decision frontier the exact search entered. */
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[];
  /** Width of every fully exhausted decision frontier at depths 0..optimalLocks - 2. */
  exhaustedFrontierWidths: readonly number[];
  /** Number of unique decision states whose complete landing domains were expanded. */
  exploredStateCount: number;
  /** Number of legal landing transitions considered while excluding every shorter win. */
  transitionCount: number;
  /** Branches proven unable to finish below the candidate by the target-deficit bound. */
  deficitBoundPrunes: number;
  /** Canonical hash of the started endgame definition/state covered by this proof. */
  initialStateHash: string;
  replay: EndgameRouteReplay;
}

export type EndgameProofRunRange = Readonly<{
  startOrdinal: number;
  endOrdinal: number;
}>;

/** One immutable, repeatably readable run used by the exact proof frontier. */
export interface EndgameProofRun {
  readonly id: string;
  readonly size: number;
  values(range?: EndgameProofRunRange): Iterable<string>;
  dispose(): void;
}

/** A synchronous sink for one already ordered and deduplicated proof run. */
export interface EndgameProofRunWriter {
  write(key: string): void;
  finish(): EndgameProofRun;
  abort(): void;
}

export interface EndgameProofRunStoreDiagnostics {
  readonly activeRuns: readonly string[];
  readonly residue: readonly string[];
  readonly residueTruncated: boolean;
  readonly cleanupErrors: readonly string[];
  readonly cleanupErrorsTruncated: boolean;
}

/**
 * Low-level immutable-run persistence. Sorting, deduplication, grouping, merging, and
 * every proof decision remain owned by Core.
 */
export interface EndgameProofRunStore {
  createRun(id: string): EndgameProofRunWriter;
  diagnostics(): EndgameProofRunStoreDiagnostics;
  dispose(): void;
}

export type EndgameProofResumeBinding = Readonly<{
  schema: 't37-f4e-r7-proof-binding-v1';
  levelId: EndgameId;
  candidateCommandStream: string;
  optimalLocks: number;
  initialStateHash: string;
  initialFrontierKey: string;
}>;

export type EndgameProofRunCollectionRange = Readonly<{
  startIndex: number;
  endIndex: number;
}>;

export type EndgameProofRunCollection = Readonly<{
  count: number;
  open(range: EndgameProofRunCollectionRange): readonly EndgameProofRun[];
}>;

export type EndgameProofSearchingCheckpoint = Readonly<{
  kind: 'searching';
  generation: number;
  binding: EndgameProofResumeBinding;
  depth: number;
  parentOffset: number;
  lastProcessedParentKey: string | null;
  frontier: EndgameProofRun;
  nextRuns: EndgameProofRunCollection;
  transitions: number;
  boundPrunes: number;
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[];
}>;

export type EndgameProofCompleteCheckpoint = Readonly<{
  kind: 'complete';
  generation: number;
  binding: EndgameProofResumeBinding;
  reason: 'empty-frontier' | 'final-depth' | 'zero-decision-depth';
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[];
}>;

export type EndgameProofCheckpoint =
  | EndgameProofSearchingCheckpoint
  | EndgameProofCompleteCheckpoint;

export type EndgameProofTip = Readonly<{
  generation: number;
  manifestSha256: string;
}>;

export type EndgameProofCheckpointPublication =
  | Readonly<{
      transition: 'seed';
      previousTip: null;
      binding: EndgameProofResumeBinding;
      frontier: EndgameProofRun;
    }>
  | Readonly<{
      transition: 'unit';
      previousTip: EndgameProofTip;
      parentOffset: number;
      lastProcessedParentKey: string;
      transitionsDelta: number;
      boundPrunesDelta: number;
      nextRun: EndgameProofRun | null;
    }>
  | Readonly<{
      transition: 'layer';
      previousTip: EndgameProofTip;
      completedDepth: EndgameOptimalRouteDepthRecord;
      nextFrontier: EndgameProofRun;
    }>
  | Readonly<{
      transition: 'complete';
      previousTip: EndgameProofTip;
      completedDepth: EndgameOptimalRouteDepthRecord | null;
      reason: 'empty-frontier' | 'final-depth' | 'zero-decision-depth';
    }>;

export interface EndgameProofCheckpointRunStore extends EndgameProofRunStore {
  loadCheckpoint(): Readonly<{
    checkpoint: EndgameProofCheckpoint | null;
    tip: EndgameProofTip | null;
    diagnostics: EndgameProofRunStoreDiagnostics;
    advanceAllowed: boolean;
  }>;
  publishCheckpoint(publication: EndgameProofCheckpointPublication): Readonly<{
    tip: EndgameProofTip;
    diagnostics: EndgameProofRunStoreDiagnostics;
    advanceAllowed: boolean;
  }>;
  releaseCheckpointRun(run: EndgameProofRun): void;
  suspend(): Readonly<{
    diagnostics: EndgameProofRunStoreDiagnostics;
    closeFailed: boolean;
  }>;
}

export type EndgameProofAdvanceResult =
  | Readonly<{
      status: 'searching';
      generation: number;
      depth: number;
      parentOffset: number;
      tip: EndgameProofTip;
      diagnostics: EndgameProofRunStoreDiagnostics;
      advanceAllowed: boolean;
    }>
  | Readonly<{
      status: 'complete';
      generation: number;
      certificate: EndgameOptimalRouteCertificate;
      tip: EndgameProofTip;
      diagnostics: EndgameProofRunStoreDiagnostics;
      advanceAllowed: boolean;
    }>
  | Readonly<{
      status: 'blocked';
      generation: number | null;
      tip: EndgameProofTip | null;
      diagnostics: EndgameProofRunStoreDiagnostics;
      advanceAllowed: false;
    }>;

export interface EndgameOptimalRouteCertificateOptions {
  runStore?: EndgameProofRunStore;
}

const PROOF_RUN_RECORD_MAX_BYTES = 2048;
const PROOF_RUN_CHUNK_MAX_BYTES = 64 * 1024 * 1024;
const PROOF_RUN_CHUNK_MAX_RECORDS = 131_072;
const PROOF_RUN_CHUNK_MAX_COUNT = 4096;
const PROOF_RUN_MERGE_FAN_IN = 32;
const PROOF_RUN_METADATA_MAX_COUNT = 4098;
const PROOF_RUN_CLEANUP_ERROR_MAX_COUNT = 4098;
const PROOF_RUN_ERROR_MAX_BYTES = 2048;
const PROOF_RUN_ID_MAX_BYTES = 96;

function tokenCommand(token: string): GameCommand {
  switch (token) {
    case 'S': return { type: 'start' };
    case 'T': return { type: 'tick' };
    case 'L': return { type: 'move', dx: -1 };
    case 'R': return { type: 'move', dx: 1 };
    case 'C': return { type: 'rotate', direction: 1 };
    case 'Q': return { type: 'rotate', direction: -1 };
    case 'D': return { type: 'soft-drop' };
    case 'H': return { type: 'hard-drop' };
    default: throw new Error(`Unknown Endgame route token: ${JSON.stringify(token)}.`);
  }
}

function commandToken(command: GameCommand): EndgameRouteToken {
  if (command.type === 'start') return 'S';
  if (command.type === 'tick') return 'T';
  if (command.type === 'hard-drop') return 'H';
  if (command.type === 'rotate' && command.direction === 1) return 'C';
  if (command.type === 'rotate' && command.direction === -1) return 'Q';
  if (command.type === 'soft-drop') return 'D';
  if (command.type === 'move' && command.dx === -1) return 'L';
  if (command.type === 'move' && command.dx === 1) return 'R';
  throw new Error(`Endgame route cannot encode ${command.type}.`);
}

function cellsSignature(piece: PieceType, cells: readonly Cell[]): string {
  return `${piece}:${[...cells]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((cell) => `${cell.x},${cell.y}`)
    .join('|')}`;
}

function lockPlacement(piece: PieceType, cells: readonly Cell[]): EndgameLockPlacement {
  const stableCells = Object.freeze(cells
    .map((cell) => Object.freeze({ x: cell.x, y: cell.y }))
    .sort((left, right) => left.y - right.y || left.x - right.x));
  return Object.freeze({ piece, cells: stableCells, signature: cellsSignature(piece, stableCells) });
}

function isActive(state: GameState): boolean {
  return state.status === 'playing' && state.phase === 'active' && state.active !== null;
}

/** Applies only the ordinary delays after a hard drop, stopping at the next decision point. */
function settleAfterLock(state: GameState): { state: GameState; commands: readonly GameCommand[] } | null {
  let next = state;
  const commands: GameCommand[] = [];
  for (let tick = 0; tick < MAX_SETTLEMENT_TICKS; tick += 1) {
    if (next.status === 'finished' || isActive(next)) return { state: next, commands };
    if (next.status === 'game-over') return null;
    const transition = dispatch(next, { type: 'tick' });
    if (transition.state === next) return null;
    next = transition.state;
    commands.push({ type: 'tick' });
  }
  return null;
}

/**
 * Lists all meaningful normal landing choices from an active piece. The search state
 * only expands both rotation directions and horizontal movement, then uses the same
 * hard drop and delay resolution a player sees; no timing trick or state injection is
 * part of the route domain.
 */
export function endgameLandings(state: GameState): readonly EndgameLanding[] {
  if (!isActive(state)) return [];
  const queue: { state: GameState; commands: readonly GameCommand[] }[] = [{ state, commands: [] }];
  const seen = new Set<string>();
  const result: EndgameLanding[] = [];

  const activeKey = (candidate: GameState) => {
    const active = candidate.active;
    return active ? `${active.type}:${active.rotation}:${active.x}:${active.y}` : 'none';
  };
  seen.add(activeKey(state));

  for (let index = 0; index < queue.length; index += 1) {
    const route = queue[index]!;
    const dropped = dispatch(route.state, { type: 'hard-drop' });
    const locked = dropped.events.find((event): event is Extract<typeof event, { type: 'piece-locked' }> => event.type === 'piece-locked');
    const settled = locked ? settleAfterLock(dropped.state) : null;
    if (locked && settled) {
      result.push({
        state: withoutUndoHistory(settled.state),
        commands: Object.freeze([...route.commands, { type: 'hard-drop' }, ...settled.commands]),
        lock: lockPlacement(locked.piece, locked.cells),
      });
    }

    for (const command of PLANNER_COMMANDS) {
      const transition = dispatch(route.state, command);
      if (transition.state === route.state || !isActive(transition.state)) continue;
      const key = activeKey(transition.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: transition.state, commands: [...route.commands, command] });
    }
  }
  return Object.freeze(result);
}

/**
 * Lists the complete finite landing domain exposed by the Endgame controls. Unlike the
 * compact authoring search above, this traversal includes every reachable vertical
 * state before a hard drop. That captures timed side-slips below an anchor/overhang and
 * is therefore the only landing domain valid for an optimality proof.
 */
export function exhaustiveEndgameLandings(state: GameState): readonly EndgameLanding[] {
  if (!isActive(state)) return [];
  const queue: { state: GameState; commands: readonly GameCommand[] }[] = [{ state, commands: [] }];
  const seenActive = new Set<string>();
  const landed = new Map<string, EndgameLanding>();

  const activeKey = (candidate: GameState) => {
    const active = candidate.active;
    return active ? `${active.type}:${active.rotation}:${active.x}:${active.y}` : 'none';
  };
  seenActive.add(activeKey(state));

  for (let index = 0; index < queue.length; index += 1) {
    const route = queue[index]!;
    const dropped = dispatch(route.state, { type: 'hard-drop' });
    const locked = dropped.events.find((event): event is Extract<typeof event, { type: 'piece-locked' }> => event.type === 'piece-locked');
    const settled = locked ? settleAfterLock(dropped.state) : null;
    if (locked && settled) {
      const landing: EndgameLanding = {
        state: withoutUndoHistory(settled.state),
        commands: Object.freeze([...route.commands, { type: 'hard-drop' }, ...settled.commands]),
        lock: lockPlacement(locked.piece, locked.cells),
      };
      const key = endgameRouteStateKey(landing.state);
      const existing = landed.get(key);
      if (!existing || landing.commands.length < existing.commands.length) landed.set(key, landing);
    }

    for (const command of EXHAUSTIVE_PLANNER_COMMANDS) {
      const transition = dispatch(route.state, command);
      if (transition.state === route.state || !isActive(transition.state)) continue;
      const key = activeKey(transition.state);
      if (seenActive.has(key)) continue;
      seenActive.add(key);
      queue.push({ state: transition.state, commands: [...route.commands, command] });
    }
  }

  return Object.freeze([...landed.values()].sort((left, right) => (
    left.lock.signature.localeCompare(right.lock.signature)
    || left.commands.length - right.commands.length
  )));
}

/** Solver exploration does not need recursive undo snapshots; final replays retain them. */
function withoutUndoHistory(state: GameState): GameState {
  if (state.endgameUndoHistory.length === 0 && state.endgameActiveSpawnCheckpoint === null) return state;
  return {
    ...state,
    endgameUndoHistory: Object.freeze([]),
    endgameActiveSpawnCheckpoint: null,
  };
}

function orderedCellsKey(cells: readonly Cell[]): string {
  return [...cells]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((cell) => `${cell.x},${cell.y}`)
    .join('|');
}

/** Score, elapsed time, and undo history do not affect a Endgame's future legal moves. */
export function endgameRouteStateKey(state: GameState): string {
  const active = state.active;
  return [
    // Piece colours are renderer data: future collisions and Endgame completion only
    // distinguish empty, occupied, and immutable anchor cells. Canonicalising them
    // prevents the exhaustive authoring proof from retaining equivalent colourings.
    state.board.map((row) => row.map((cell) => (
      cell === null ? '.' : cell === ANCHOR_CELL ? 'A' : '#'
    )).join('')).join('/'),
    orderedCellsKey(state.endgameTargetCells),
    orderedCellsKey(state.endgameAnchorSupportedCells),
    active ? `${active.type}:${active.rotation}:${active.x}:${active.y}` : '-',
    state.queue.join(''),
    state.randomizer.seed,
    state.randomizer.bag.join(''),
    state.pieceCount,
    state.endgameSpawnCount,
    state.phase,
    state.status,
  ].join('~');
}

export type EndgameProofFieldStorage = 'encoded' | 'template-invariant' | 'proof-quotiented';

/** @internal Compile-time tripwire: new GameState fields must receive an explicit proof policy. */
const ENDGAME_PROOF_FIELD_POLICY = Object.freeze({
  board: 'encoded',
  active: 'encoded',
  queue: 'encoded',
  score: 'proof-quotiented',
  lines: 'proof-quotiented',
  combo: 'proof-quotiented',
  level: 'proof-quotiented',
  mode: 'template-invariant',
  classicStartingGravityTicks: 'template-invariant',
  classicGravityFloorTicks: 'template-invariant',
  endgameId: 'template-invariant',
  endgameTargetLines: 'proof-quotiented',
  endgameTargetCells: 'encoded',
  endgameInitialTargetCount: 'template-invariant',
  endgameAnchorSupportedCells: 'encoded',
  endgameBoardRows: 'template-invariant',
  endgameQueue: 'proof-quotiented',
  endgameQueueIndex: 'proof-quotiented',
  endgameSpawnCount: 'encoded',
  endgameGoal: 'template-invariant',
  endgameCompletion: 'template-invariant',
  endgameUndoHistory: 'proof-quotiented',
  endgameActiveSpawnCheckpoint: 'proof-quotiented',
  completedLevelId: 'proof-quotiented',
  nextUnlockedLevelId: 'proof-quotiented',
  pieceCount: 'encoded',
  survivalBedrockRows: 'template-invariant',
  survivalPressureTicks: 'template-invariant',
  survivalRisePending: 'template-invariant',
  survivalRiseCount: 'template-invariant',
  survivalDebris: 'template-invariant',
  survivalDebrisNextId: 'template-invariant',
  survivalDebrisPiecesRemaining: 'template-invariant',
  survivalDebrisPieceInterval: 'template-invariant',
  survivalDebrisSpawnCount: 'template-invariant',
  survivalDebrisWarningColumns: 'template-invariant',
  survivalDebrisWarningHeight: 'template-invariant',
  survivalDebrisWarningTicks: 'template-invariant',
  survivalDebrisFallProgress: 'template-invariant',
  survivalDebrisRandomizer: 'template-invariant',
  mutationActiveCarrier: 'template-invariant',
  mutationRandomizer: 'template-invariant',
  mutationCarriers: 'template-invariant',
  mutationNextCarrierId: 'template-invariant',
  mutationFreezeTicks: 'template-invariant',
  mutationCollapsePiecesRemaining: 'template-invariant',
  mutationCollapseLandingLatched: 'template-invariant',
  mutationMultiplierTicks: 'template-invariant',
  mutationMultiplierFactor: 'template-invariant',
  mutationLastItem: 'template-invariant',
  mutationLastItemTicks: 'template-invariant',
  status: 'encoded',
  phase: 'encoded',
  phaseTicks: 'proof-quotiented',
  pendingClearRows: 'proof-quotiented',
  gravityTicks: 'proof-quotiented',
  gravitySubtickRemainder: 'proof-quotiented',
  lockTicks: 'proof-quotiented',
  lockResets: 'proof-quotiented',
  elapsedTicks: 'proof-quotiented',
  randomizer: 'encoded',
  seed: 'template-invariant',
} as const satisfies Readonly<Record<keyof GameState, EndgameProofFieldStorage>>);

type EndgameProofFrontierContext = Readonly<{ template: GameState }>;
const PIECE_TYPE_SET = new Set<string>(PIECE_TYPES);
const PROOF_FRONTIER_KEY_PREFIX = 'p1.';
const PROOF_FRONTIER_BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const PROOF_FRONTIER_COORDINATE_COUNT = BOARD_WIDTH * BOARD_HEIGHT;
const PROOF_FRONTIER_COORDINATE_BITMAP_BYTES = Math.ceil(PROOF_FRONTIER_COORDINATE_COUNT / 8);
const PROOF_FRONTIER_COORDINATE_SPARSE = 0;
const PROOF_FRONTIER_COORDINATE_BITMAP = 1;
const PROOF_FRONTIER_ACTIVE_AXIS_BIAS = 128;

function proofKeyError(message: string): never {
  throw new Error(`Invalid Endgame proof-frontier state: ${message}.`);
}

function isUint(value: number, maximum = Number.MAX_SAFE_INTEGER): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

function assertPieceList(list: readonly PieceType[], label: string, expectedLength?: number): void {
  if (!Array.isArray(list) || (expectedLength !== undefined && list.length !== expectedLength)) {
    proofKeyError(`${label} has an invalid length`);
  }
  if (list.some((piece) => !PIECE_TYPE_SET.has(piece))) proofKeyError(`${label} contains an unknown piece`);
}

function assertCells(cells: readonly Cell[], label: string): void {
  if (!Array.isArray(cells)) proofKeyError(`${label} is not an array`);
  const seen = new Set<number>();
  for (const cell of cells) {
    if (!isUint(cell?.x, BOARD_WIDTH - 1) || !isUint(cell?.y, BOARD_HEIGHT - 1)) {
      proofKeyError(`${label} contains an out-of-bounds coordinate`);
    }
    const coordinate = cell.y * BOARD_WIDTH + cell.x;
    if (seen.has(coordinate)) proofKeyError(`${label} contains a duplicate coordinate`);
    seen.add(coordinate);
  }
}

function assertProofDecisionDomain(state: GameState): void {
  if (state.mode !== 'endgame' || state.endgameId === null
    || !isUint(state.seed, 0xffff_ffff) || state.seed === 0) {
    proofKeyError('state is not a seeded Endgame');
  }
  if (state.endgameGoal !== 'original-targets-cleared' || state.endgameCompletion !== 'active') {
    proofKeyError('Endgame goal or completion is not active');
  }
  if (state.status !== 'playing' || state.phase !== 'active' || state.active === null) {
    proofKeyError('state is not an active playing decision');
  }
  if (
    state.phaseTicks !== 0 || state.gravityTicks !== 0 || state.gravitySubtickRemainder !== 0
    || state.lockTicks !== 0
    || state.lockResets !== 0 || state.pendingClearRows.length !== 0
  ) proofKeyError('decision timers or pending rows are noncanonical');
  if (state.endgameUndoHistory.length !== 0 || state.endgameActiveSpawnCheckpoint !== null) {
    proofKeyError('undo state must be stripped');
  }
  if (state.board.length !== BOARD_HEIGHT || state.board.some((row) => row.length !== BOARD_WIDTH)) {
    proofKeyError('board dimensions are noncanonical');
  }
  for (const row of state.board) for (const cell of row) {
    if (cell !== null && cell !== ANCHOR_CELL && !PIECE_TYPE_SET.has(cell)) {
      proofKeyError('board contains Bedrock, Survival stone, or unknown material');
    }
  }
  if (state.board.some((row) => row.every((cell) => cell !== null))) {
    proofKeyError('active decision contains an unresolved full row');
  }
  assertCells(state.endgameTargetCells, 'target cells');
  assertCells(state.endgameAnchorSupportedCells, 'supported cells');
  if (state.endgameTargetCells.length === 0) proofKeyError('active decision has no remaining target');
  if (state.endgameAnchorSupportedCells.length > 0
    && !state.board.some((row) => row.includes(ANCHOR_CELL))) {
    proofKeyError('supported cells require an immutable anchor');
  }
  for (const [label, cells] of [
    ['target cells', state.endgameTargetCells],
    ['supported cells', state.endgameAnchorSupportedCells],
  ] as const) {
    if (cells.some((cell) => !PIECE_TYPE_SET.has(state.board[cell.y]![cell.x]!))) {
      proofKeyError(`${label} do not identify current ordinary occupied cells`);
    }
  }
  assertPieceList(state.queue, 'queue', NEXT_QUEUE_SIZE);
  assertPieceList(state.randomizer.bag, 'randomizer bag');
  if (state.randomizer.bag.length > PIECE_TYPES.length - 1
    || new Set(state.randomizer.bag).size !== state.randomizer.bag.length) {
    proofKeyError('randomizer bag is not a valid remaining seven-bag');
  }
  if (!isUint(state.randomizer.seed, 0xffff_ffff) || state.randomizer.seed === 0
    || !isUint(state.pieceCount) || !isUint(state.endgameSpawnCount)
    || state.endgameSpawnCount !== state.pieceCount + 1) {
    proofKeyError('randomizer or piece counts are noncanonical');
  }
  const active = state.active;
  if (!PIECE_TYPE_SET.has(active.type) || ![0, 1, 2, 3].includes(active.rotation) || !canPlace(state.board, active)) {
    proofKeyError('active piece is malformed, colliding, or outside the board');
  }
}

function createProofFrontierContext(template: GameState): EndgameProofFrontierContext {
  assertProofDecisionDomain(template);
  return Object.freeze({ template });
}

function proofFrontierStateKey(state: GameState, context: EndgameProofFrontierContext): string {
  assertProofDecisionDomain(state);
  for (const field of Object.keys(ENDGAME_PROOF_FIELD_POLICY) as (keyof GameState)[]) {
    if (ENDGAME_PROOF_FIELD_POLICY[field] === 'template-invariant'
      && state[field] !== context.template[field]) {
      proofKeyError(`template-invariant field ${field} changed`);
    }
  }
  for (let y = 0; y < BOARD_HEIGHT; y += 1) for (let x = 0; x < BOARD_WIDTH; x += 1) {
    if ((state.board[y]![x] === ANCHOR_CELL) !== (context.template.board[y]![x] === ANCHOR_CELL)) {
      proofKeyError('immutable anchor coordinates changed');
    }
  }
  const active = state.active;
  if (active === null) proofKeyError('active piece is missing');

  const ordinaryCoordinates: number[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) for (let x = 0; x < BOARD_WIDTH; x += 1) {
    const cell = state.board[y]![x]!;
    if (cell !== null && cell !== ANCHOR_CELL) ordinaryCoordinates.push(y * BOARD_WIDTH + x);
  }
  const bytes: number[] = [];
  writeProofCoordinateList(bytes, ordinaryCoordinates, 'ordinary occupancy');
  writeProofCoordinateList(bytes, canonicalProofCoordinates(state.endgameTargetCells), 'target cells');
  writeProofCoordinateList(bytes, canonicalProofCoordinates(state.endgameAnchorSupportedCells), 'supported cells');
  writeProofPiece(bytes, active.type, 'active piece');
  if (![0, 1, 2, 3].includes(active.rotation)) proofKeyError('active rotation is outside its domain');
  bytes.push(active.rotation, encodeProofActiveAxis(active.x, 'active x'), encodeProofActiveAxis(active.y, 'active y'));
  for (const piece of state.queue) writeProofPiece(bytes, piece, 'queue');
  writeProofUint32(bytes, state.randomizer.seed, 'randomizer seed');
  if (state.randomizer.bag.length > PIECE_TYPES.length - 1) proofKeyError('randomizer bag is too long');
  bytes.push(state.randomizer.bag.length);
  for (const piece of state.randomizer.bag) writeProofPiece(bytes, piece, 'randomizer bag');
  writeProofVarUint(bytes, state.pieceCount, 'piece count');
  return `${PROOF_FRONTIER_KEY_PREFIX}${encodeProofBase64Url(bytes)}`;
}

function canonicalProofCoordinates(cells: readonly Cell[]): number[] {
  return cells.map((cell) => cell.y * BOARD_WIDTH + cell.x).sort((left, right) => left - right);
}

function writeProofCoordinateList(bytes: number[], coordinates: readonly number[], label: string): void {
  assertProofCompactCoordinates(coordinates, label);
  const useBitmap = proofCoordinateListUsesBitmap(coordinates.length);
  bytes.push(useBitmap ? PROOF_FRONTIER_COORDINATE_BITMAP : PROOF_FRONTIER_COORDINATE_SPARSE);
  if (useBitmap) {
    const bitmap = Array.from({ length: PROOF_FRONTIER_COORDINATE_BITMAP_BYTES }, () => 0);
    for (const coordinate of coordinates) bitmap[Math.floor(coordinate / 8)]! |= 1 << (coordinate % 8);
    bytes.push(...bitmap);
    return;
  }
  writeProofUint16(bytes, coordinates.length, `${label} count`);
  for (const coordinate of coordinates) writeProofUint16(bytes, coordinate, `${label} coordinate`);
}

function assertProofCompactCoordinates(coordinates: readonly number[], label: string): void {
  if (coordinates.length > PROOF_FRONTIER_COORDINATE_COUNT) proofKeyError(`${label} exceeds compact capacity`);
  let previous = -1;
  for (const coordinate of coordinates) {
    if (!isUint(coordinate, PROOF_FRONTIER_COORDINATE_COUNT - 1) || coordinate <= previous) {
      proofKeyError(`${label} are not strictly ordered compact coordinates`);
    }
    previous = coordinate;
  }
}

function proofCoordinateListUsesBitmap(count: number): boolean {
  return 2 + count * 2 >= PROOF_FRONTIER_COORDINATE_BITMAP_BYTES;
}

function writeProofPiece(bytes: number[], piece: PieceType, label: string): void {
  const code = PIECE_TYPES.indexOf(piece);
  if (code < 0) proofKeyError(`${label} contains an unknown piece`);
  bytes.push(code);
}

function encodeProofActiveAxis(value: number, label: string): number {
  if (!Number.isInteger(value) || value < -PROOF_FRONTIER_ACTIVE_AXIS_BIAS
    || value >= PROOF_FRONTIER_ACTIVE_AXIS_BIAS) {
    proofKeyError(`${label} is outside compact active-axis bounds`);
  }
  return value + PROOF_FRONTIER_ACTIVE_AXIS_BIAS;
}

function writeProofUint32(bytes: number[], value: number, label: string): void {
  if (!isUint(value, 0xffff_ffff)) proofKeyError(`${label} is outside compact uint32 bounds`);
  bytes.push(
    Math.floor(value / 0x1000000) & 0xff,
    Math.floor(value / 0x10000) & 0xff,
    Math.floor(value / 0x100) & 0xff,
    value & 0xff,
  );
}

function writeProofUint16(bytes: number[], value: number, label: string): void {
  if (!isUint(value, 0xffff)) proofKeyError(`${label} is outside compact uint16 bounds`);
  bytes.push(Math.floor(value / 0x100) & 0xff, value & 0xff);
}

function writeProofVarUint(bytes: number[], value: number, label: string): void {
  if (!isUint(value)) proofKeyError(`${label} is outside compact unsigned bounds`);
  let remaining = value;
  do {
    let encoded = remaining % 0x80;
    remaining = Math.floor(remaining / 0x80);
    if (remaining > 0) encoded |= 0x80;
    bytes.push(encoded);
  } while (remaining > 0);
}

function encodeProofBase64Url(bytes: readonly number[]): string {
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += PROOF_FRONTIER_BASE64URL_ALPHABET[first >> 2]!;
    encoded += PROOF_FRONTIER_BASE64URL_ALPHABET[((first & 0x03) << 4) | ((second ?? 0) >> 4)]!;
    if (second !== undefined) {
      encoded += PROOF_FRONTIER_BASE64URL_ALPHABET[((second & 0x0f) << 2) | ((third ?? 0) >> 6)]!;
    }
    if (third !== undefined) encoded += PROOF_FRONTIER_BASE64URL_ALPHABET[third & 0x3f]!;
  }
  return encoded;
}

function proofBase64UrlValue(character: string): number {
  const value = PROOF_FRONTIER_BASE64URL_ALPHABET.indexOf(character);
  if (value < 0) proofKeyError('compact key contains a non-Base64URL character');
  return value;
}

function decodeProofBase64Url(text: string): number[] {
  if (text.length === 0 || text.length % 4 === 1) proofKeyError('compact key has an invalid Base64URL length');
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 4) {
    const remaining = Math.min(4, text.length - index);
    const first = proofBase64UrlValue(text[index]!);
    const second = proofBase64UrlValue(text[index + 1]!);
    if (remaining === 2 && (second & 0x0f) !== 0) proofKeyError('compact key has noncanonical Base64URL padding bits');
    bytes.push((first << 2) | (second >> 4));
    if (remaining >= 3) {
      const third = proofBase64UrlValue(text[index + 2]!);
      if (remaining === 3 && (third & 0x03) !== 0) {
        proofKeyError('compact key has noncanonical Base64URL padding bits');
      }
      bytes.push(((second & 0x0f) << 4) | (third >> 2));
      if (remaining === 4) {
        const fourth = proofBase64UrlValue(text[index + 3]!);
        bytes.push(((third & 0x03) << 6) | fourth);
      }
    }
  }
  return bytes;
}

type ProofByteCursor = { offset: number };

function readProofByte(bytes: readonly number[], cursor: ProofByteCursor, label: string): number {
  const value = bytes[cursor.offset];
  if (value === undefined) proofKeyError(`compact key ended while reading ${label}`);
  cursor.offset += 1;
  return value;
}

function readProofCoordinateList(
  bytes: readonly number[],
  cursor: ProofByteCursor,
  label: string,
): readonly number[] {
  const representation = readProofByte(bytes, cursor, `${label} representation`);
  const coordinates: number[] = [];
  if (representation === PROOF_FRONTIER_COORDINATE_SPARSE) {
    const count = readProofUint16(bytes, cursor, `${label} count`);
    if (count > PROOF_FRONTIER_COORDINATE_COUNT) proofKeyError(`${label} exceeds compact capacity`);
    for (let index = 0; index < count; index += 1) {
      coordinates.push(readProofUint16(bytes, cursor, `${label} coordinate`));
    }
  } else if (representation === PROOF_FRONTIER_COORDINATE_BITMAP) {
    for (let byteIndex = 0; byteIndex < PROOF_FRONTIER_COORDINATE_BITMAP_BYTES; byteIndex += 1) {
      const byte = readProofByte(bytes, cursor, `${label} bitmap`);
      for (let bit = 0; bit < 8; bit += 1) if ((byte & (1 << bit)) !== 0) {
        coordinates.push(byteIndex * 8 + bit);
      }
    }
  } else {
    proofKeyError(`${label} has an unknown compact representation`);
  }
  assertProofCompactCoordinates(coordinates, label);
  if (proofCoordinateListUsesBitmap(coordinates.length)
    !== (representation === PROOF_FRONTIER_COORDINATE_BITMAP)) {
    proofKeyError(`${label} is not canonically represented`);
  }
  return Object.freeze(coordinates);
}

function readProofPiece(bytes: readonly number[], cursor: ProofByteCursor, label: string): PieceType {
  const code = readProofByte(bytes, cursor, label);
  const piece = PIECE_TYPES[code];
  if (piece === undefined) proofKeyError(`${label} contains an unknown piece`);
  return piece;
}

function readProofActiveAxis(bytes: readonly number[], cursor: ProofByteCursor, label: string): number {
  return readProofByte(bytes, cursor, label) - PROOF_FRONTIER_ACTIVE_AXIS_BIAS;
}

function readProofUint32(bytes: readonly number[], cursor: ProofByteCursor, label: string): number {
  return (
    readProofByte(bytes, cursor, `${label} byte 0`) * 0x1000000
    + readProofByte(bytes, cursor, `${label} byte 1`) * 0x10000
    + readProofByte(bytes, cursor, `${label} byte 2`) * 0x100
    + readProofByte(bytes, cursor, `${label} byte 3`)
  );
}

function readProofUint16(bytes: readonly number[], cursor: ProofByteCursor, label: string): number {
  return (
    readProofByte(bytes, cursor, `${label} byte 0`) * 0x100
    + readProofByte(bytes, cursor, `${label} byte 1`)
  );
}

function readProofVarUint(bytes: readonly number[], cursor: ProofByteCursor, label: string): number {
  let value = 0;
  let multiplier = 1;
  for (let index = 0; index < 8; index += 1) {
    const encoded = readProofByte(bytes, cursor, label);
    const payload = encoded & 0x7f;
    value += payload * multiplier;
    if (!Number.isSafeInteger(value)) proofKeyError(`${label} exceeds the safe integer domain`);
    if ((encoded & 0x80) === 0) {
      if (index > 0 && payload === 0) proofKeyError(`${label} is not canonically encoded`);
      return value;
    }
    multiplier *= 0x80;
  }
  proofKeyError(`${label} exceeds compact unsigned bounds`);
}

function cellsFromProofCoordinates(coordinates: readonly number[]): readonly Cell[] {
  return Object.freeze(coordinates.map((coordinate) => Object.freeze({
    x: coordinate % BOARD_WIDTH,
    y: Math.floor(coordinate / BOARD_WIDTH),
  })));
}

function boardFromProofCoordinates(
  coordinates: readonly number[],
  context: EndgameProofFrontierContext,
): Board {
  const board: Board = context.template.board.map((row) => row.map((cell) => (
    cell === ANCHOR_CELL ? ANCHOR_CELL : null
  )));
  for (const coordinate of coordinates) {
    const x = coordinate % BOARD_WIDTH;
    const y = Math.floor(coordinate / BOARD_WIDTH);
    if (board[y]![x] === ANCHOR_CELL) proofKeyError('ordinary occupancy overlaps an immutable anchor');
    board[y]![x] = 'I';
  }
  return board;
}

function decodeProofFrontierStateKey(key: string, context: EndgameProofFrontierContext): GameState {
  if (!key.startsWith(PROOF_FRONTIER_KEY_PREFIX)) proofKeyError('key has an unknown compact codec prefix');
  const bytes = decodeProofBase64Url(key.slice(PROOF_FRONTIER_KEY_PREFIX.length));
  const cursor: ProofByteCursor = { offset: 0 };
  const ordinaryCoordinates = readProofCoordinateList(bytes, cursor, 'ordinary occupancy');
  const targetCoordinates = readProofCoordinateList(bytes, cursor, 'target cells');
  const supportedCoordinates = readProofCoordinateList(bytes, cursor, 'supported cells');
  const active: ActivePiece = {
    type: readProofPiece(bytes, cursor, 'active piece'),
    rotation: readProofByte(bytes, cursor, 'active rotation') as Rotation,
    x: readProofActiveAxis(bytes, cursor, 'active x'),
    y: readProofActiveAxis(bytes, cursor, 'active y'),
  };
  if (![0, 1, 2, 3].includes(active.rotation)) proofKeyError('active rotation is outside its domain');
  const queue = Array.from({ length: NEXT_QUEUE_SIZE }, () => readProofPiece(bytes, cursor, 'queue'));
  const randomizerSeed = readProofUint32(bytes, cursor, 'randomizer seed');
  const bagLength = readProofByte(bytes, cursor, 'randomizer bag count');
  if (bagLength > PIECE_TYPES.length - 1) proofKeyError('randomizer bag is too long');
  const bag = Array.from({ length: bagLength }, () => readProofPiece(bytes, cursor, 'randomizer bag'));
  if (new Set(bag).size !== bag.length) proofKeyError('randomizer bag is not a valid remaining seven-bag');
  const pieceCount = readProofVarUint(bytes, cursor, 'piece count');
  if (cursor.offset !== bytes.length) proofKeyError('compact key contains trailing bytes');
  const endgameSpawnCount = pieceCount + 1;
  if (!isUint(endgameSpawnCount)) proofKeyError('derived Endgame spawn count is outside its domain');
  const decoded: GameState = {
    ...context.template,
    board: boardFromProofCoordinates(ordinaryCoordinates, context),
    active,
    queue,
    score: 0,
    lines: 0,
    combo: 0,
    level: 0,
    endgameTargetLines: null,
    endgameTargetCells: cellsFromProofCoordinates(targetCoordinates),
    endgameAnchorSupportedCells: cellsFromProofCoordinates(supportedCoordinates),
    endgameQueue: Object.freeze([...queue]),
    endgameQueueIndex: 0,
    endgameSpawnCount,
    endgameUndoHistory: Object.freeze([]),
    endgameActiveSpawnCheckpoint: null,
    completedLevelId: null,
    nextUnlockedLevelId: null,
    pieceCount,
    status: 'playing',
    phase: 'active',
    phaseTicks: 0,
    pendingClearRows: [],
    gravityTicks: 0,
    gravitySubtickRemainder: 0,
    lockTicks: 0,
    lockResets: 0,
    elapsedTicks: 0,
    randomizer: {
      seed: randomizerSeed,
      bag,
    },
  };
  if (decoded.randomizer.seed === 0) proofKeyError('randomizer seed cannot be zero');
  assertProofDecisionDomain(decoded);
  if (proofFrontierStateKey(decoded, context) !== key) proofKeyError('decoded state does not re-key byte-for-byte');
  return decoded;
}

/** @internal Focused tests exercise the private proof codec without changing general key callers. */
export const ENDGAME_PROOF_FRONTIER_TESTING = Object.freeze({
  fieldPolicy: ENDGAME_PROOF_FIELD_POLICY,
  encode(state: GameState, template: GameState): string {
    return proofFrontierStateKey(state, createProofFrontierContext(template));
  },
  decode(key: string, template: GameState): GameState {
    return decodeProofFrontierStateKey(key, createProofFrontierContext(template));
  },
});

/**
 * Every distinct surviving target row still consumes one cell from every column when
 * it clears. Credit every ordinary cell already in that column as reusable supply,
 * including cells that can shift downward after an earlier clear. Only the summed
 * column deficits must come from future tetrominoes, four cells at a time. This
 * conservation bound therefore cannot overestimate the remaining locks.
 */
export function endgameRouteLockLowerBound(state: GameState): number {
  if (
    state.endgameAnchorSupportedCells.length > 0
    || state.board.some((row) => row.some((cell) => cell === ANCHOR_CELL))
  ) {
    return 0;
  }
  const requiredClearsPerColumn = new Set(state.endgameTargetCells.map((cell) => cell.y)).size;
  let deficit = 0;
  for (let x = 0; x < state.board[0]!.length; x += 1) {
    const available = state.board.reduce((count, row) => count + Number(row[x] !== null), 0);
    deficit += Math.max(0, requiredClearsPerColumn - available);
  }
  return Math.ceil(deficit / 4);
}

type ProofIntervalCapacityCache = Map<string, readonly number[]>;
type ProofColumnMaskCapacityCache = Map<string, readonly number[]>;

function proofFutureIntervalCapacity(
  state: GameState,
  locks: number,
  cache: ProofIntervalCapacityCache,
): readonly number[] {
  const active = state.active;
  if (active === null || locks <= 0) return Object.freeze(Array.from({ length: COLUMN_INTERVALS.length }, () => 0));
  const key = `${active.type}:${state.queue.join('')}:${state.randomizer.seed}:${state.randomizer.bag.join('')}:${locks}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const pieces: PieceType[] = [active.type, ...state.queue];
  let randomizer = state.randomizer;
  while (pieces.length < locks) {
    const draw = drawPiece(randomizer);
    pieces.push(draw.piece);
    randomizer = draw.randomizer;
  }
  const capacity = Array.from({ length: COLUMN_INTERVALS.length }, () => 0);
  for (const piece of pieces.slice(0, locks)) {
    const contribution = PIECE_INTERVAL_CAPACITY[piece];
    for (let index = 0; index < capacity.length; index += 1) capacity[index]! += contribution[index]!;
  }
  const frozen = Object.freeze(capacity);
  cache.set(key, frozen);
  return frozen;
}

function proofFutureColumnMaskCapacity(
  state: GameState,
  locks: number,
  cache: ProofColumnMaskCapacityCache,
): readonly number[] {
  const active = state.active;
  if (active === null || locks <= 0) return Object.freeze(Array.from({ length: COLUMN_MASK_COUNT }, () => 0));
  const key = `${active.type}:${state.queue.join('')}:${state.randomizer.seed}:${state.randomizer.bag.join('')}:${locks}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const pieces: PieceType[] = [active.type, ...state.queue];
  let randomizer = state.randomizer;
  while (pieces.length < locks) {
    const draw = drawPiece(randomizer);
    pieces.push(draw.piece);
    randomizer = draw.randomizer;
  }
  const capacity = Array.from({ length: COLUMN_MASK_COUNT }, () => 0);
  for (const piece of pieces.slice(0, locks)) {
    const contribution = PIECE_COLUMN_MASK_CAPACITY[piece];
    for (let mask = 1; mask < capacity.length; mask += 1) capacity[mask]! += contribution[mask]!;
  }
  const frozen = Object.freeze(capacity);
  cache.set(key, frozen);
  return frozen;
}

/**
 * A relaxation of the physical board: each future piece may independently choose the placement
 * that covers the most cells in a contiguous set of columns. If even that generous supply cannot
 * fill every surviving target row in an interval, the real public-control game cannot finish in
 * the proposed number of locks. Anchors deliberately retain the established zero-bound policy.
 */
function intervalSupplyCannotFinishWithin(
  state: GameState,
  futureLocks: number,
  cache: ProofIntervalCapacityCache,
  columnMaskCache: ProofColumnMaskCapacityCache,
): boolean {
  if (
    futureLocks < 0
    || state.endgameAnchorSupportedCells.length > 0
    || state.board.some((row) => row.some((cell) => cell === ANCHOR_CELL))
  ) return false;
  const targetRows = new Set(state.endgameTargetCells.map((cell) => cell.y)).size;
  if (targetRows === 0) return false;
  const capacity = proofFutureIntervalCapacity(state, futureLocks, cache);
  const occupiedByColumn = Array.from({ length: BOARD_WIDTH }, () => 0);
  for (const row of state.board) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      if (row[x] !== null) occupiedByColumn[x]! += 1;
    }
  }

  let intervalIndex = 0;
  for (let left = 0; left < BOARD_WIDTH; left += 1) {
    let available = 0;
    for (let right = left; right < BOARD_WIDTH; right += 1) {
      available += occupiedByColumn[right]!;
      const required = targetRows * (right - left + 1);
      if (required - available > capacity[intervalIndex]!) return true;
      intervalIndex += 1;
    }
  }

  const deficits = occupiedByColumn.map((available) => Math.max(0, targetRows - available));
  let positiveMask = 0;
  let positiveColumnCount = 0;
  for (let x = 0; x < deficits.length; x += 1) {
    if (deficits[x]! > 0) {
      positiveMask |= 1 << x;
      positiveColumnCount += 1;
    }
  }
  // Sparse deficits are where independent per-column maxima lose the most information. Keep
  // this bounded to six columns so the exact frontier retains a small, fixed per-state cost.
  if (futureLocks <= 5 && positiveMask !== 0 && positiveColumnCount <= 6) {
    const maskCapacity = proofFutureColumnMaskCapacity(state, futureLocks, columnMaskCache);
    for (let mask = positiveMask; mask > 0; mask = (mask - 1) & positiveMask) {
      let required = 0;
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if ((mask & (1 << x)) !== 0) required += deficits[x]!;
      }
      if (required > maskCapacity[mask]!) return true;
    }
  }
  return false;
}

function proofDeficitBoundPrecludesCandidate(
  state: GameState,
  futureLocks: number,
  useIntervalBound: boolean,
  cache: ProofIntervalCapacityCache,
  columnMaskCache: ProofColumnMaskCapacityCache,
): boolean {
  if (endgameRouteLockLowerBound(state) > futureLocks) return true;
  return useIntervalBound && intervalSupplyCannotFinishWithin(state, futureLocks, cache, columnMaskCache);
}

/** @internal Focused tests exercise the conservative long-proof interval relaxation. */
export const ENDGAME_PROOF_INTERVAL_BOUND_TESTING = Object.freeze({
  cannotFinishWithin(state: GameState, futureLocks: number): boolean {
    return intervalSupplyCannotFinishWithin(state, futureLocks, new Map(), new Map());
  },
});

type EndgameProofRunLimits = Readonly<{
  recordMaxBytes: number;
  chunkMaxBytes: number;
  chunkMaxRecords: number;
  chunkMaxCount: number;
  mergeFanIn: number;
  metadataMaxCount: number;
}>;

const ENDGAME_PROOF_RUN_LIMITS: EndgameProofRunLimits = Object.freeze({
  recordMaxBytes: PROOF_RUN_RECORD_MAX_BYTES,
  chunkMaxBytes: PROOF_RUN_CHUNK_MAX_BYTES,
  chunkMaxRecords: PROOF_RUN_CHUNK_MAX_RECORDS,
  chunkMaxCount: PROOF_RUN_CHUNK_MAX_COUNT,
  mergeFanIn: PROOF_RUN_MERGE_FAN_IN,
  metadataMaxCount: PROOF_RUN_METADATA_MAX_COUNT,
});

type TrackedProofRun = Readonly<{ expectedId: string; run: EndgameProofRun }>;

type EndgameProofRunOwner = {
  readonly store: EndgameProofRunStore;
  readonly limits: EndgameProofRunLimits;
  readonly active: Set<TrackedProofRun>;
  readonly activeIds: Set<string>;
  pendingWriters: number;
};

type CleanupErrorCollector = {
  readonly errors: Error[];
  omitted: number;
};

function proofRunError(message: string): Error {
  return new Error(`Invalid Endgame proof run: ${message}.`);
}

function ordinalByteCompare(left: string, right: string): number {
  const bound = Math.min(left.length, right.length);
  for (let index = 0; index < bound; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function proofRunRecordBytes(key: string, limit: number): number {
  if (typeof key !== 'string') throw proofRunError('records must be strings');
  if (key.length === 0) throw proofRunError('records cannot be blank');
  if (key.length > limit) throw proofRunError(`record exceeds ${limit} bytes`);
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) {
      throw proofRunError('records must contain printable ASCII only');
    }
  }
  return key.length + 1;
}

function proofRunId(depth: number, pass: number, group: number): string {
  if (![depth, pass, group].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw proofRunError('run ordinals must be non-negative safe integers');
  }
  const id = `d${String(depth).padStart(4, '0')}-p${String(pass).padStart(4, '0')}-g${String(group).padStart(4, '0')}`;
  if (id.length > PROOF_RUN_ID_MAX_BYTES || !/^[\x20-\x7e]+$/.test(id)) {
    throw proofRunError(`run id exceeds ${PROOF_RUN_ID_MAX_BYTES} printable ASCII bytes`);
  }
  return id;
}

function normalizeProofRunError(error: unknown): string {
  const raw = error instanceof Error
    ? `${error.name}: ${error.message}`
    : typeof error === 'string'
      ? error
      : String(error);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(raw);
  if (bytes.length <= PROOF_RUN_ERROR_MAX_BYTES) return raw;
  const suffix = '...[truncated]';
  const suffixBytes = encoder.encode(suffix);
  let retainedLength = PROOF_RUN_ERROR_MAX_BYTES - suffixBytes.length;
  let result = `${new TextDecoder().decode(bytes.slice(0, retainedLength))}${suffix}`;
  while (encoder.encode(result).length > PROOF_RUN_ERROR_MAX_BYTES) {
    retainedLength -= 1;
    result = `${new TextDecoder().decode(bytes.slice(0, retainedLength))}${suffix}`;
  }
  return result;
}

function createCleanupCollector(): CleanupErrorCollector {
  return { errors: [], omitted: 0 };
}

function collectCleanupError(collector: CleanupErrorCollector, error: unknown): void {
  if (collector.omitted > 0) {
    collector.omitted += 1;
  } else if (collector.errors.length < PROOF_RUN_CLEANUP_ERROR_MAX_COUNT) {
    collector.errors.push(new Error(normalizeProofRunError(error)));
  } else {
    collector.errors.pop();
    collector.omitted = 2;
  }
}

function collectOmittedCleanupErrors(collector: CleanupErrorCollector, count: number): void {
  if (collector.omitted === 0 && collector.errors.length === PROOF_RUN_CLEANUP_ERROR_MAX_COUNT) {
    collector.errors.pop();
    collector.omitted = 1;
  }
  collector.omitted += Number.isSafeInteger(count) && count > 0 ? count : 1;
}

function cleanupErrorsWithSentinel(collector: CleanupErrorCollector): readonly Error[] {
  if (collector.omitted === 0) return collector.errors;
  return [
    ...collector.errors,
    new Error(`Endgame proof cleanup errors truncated; omitted ${collector.omitted}.`),
  ];
}

function throwProofRunFailure(primary: unknown, collector: CleanupErrorCollector): never {
  const primaryError = primary instanceof Error ? primary : new Error(normalizeProofRunError(primary));
  const cleanup = cleanupErrorsWithSentinel(collector);
  if (cleanup.length === 0) throw primaryError;
  throw new AggregateError([primaryError, ...cleanup], primaryError.message);
}

function assertProofRunDescriptor(run: EndgameProofRun, expectedId: string): void {
  if (run.id !== expectedId) throw proofRunError(`store returned id ${JSON.stringify(run.id)} for ${expectedId}`);
  if (!Number.isSafeInteger(run.size) || run.size < 0) {
    throw proofRunError(`${expectedId} has an invalid size descriptor`);
  }
}

function registerProofRun(owner: EndgameProofRunOwner, id: string, run: EndgameProofRun): TrackedProofRun {
  if (owner.active.size + owner.pendingWriters >= owner.limits.metadataMaxCount) {
    throw proofRunError(`active metadata exceeds ${owner.limits.metadataMaxCount} entries`);
  }
  if (owner.activeIds.has(id)) throw proofRunError(`duplicate deterministic run id ${id}`);
  const tracked = Object.freeze({ expectedId: id, run });
  owner.active.add(tracked);
  owner.activeIds.add(id);
  assertProofRunDescriptor(run, id);
  return tracked;
}

function disposeTrackedProofRun(owner: EndgameProofRunOwner, tracked: TrackedProofRun): void {
  tracked.run.dispose();
  owner.active.delete(tracked);
  owner.activeIds.delete(tracked.expectedId);
}

function closeIterator(iterator: Iterator<string>, collector: CleanupErrorCollector): void {
  try {
    iterator.return?.();
  } catch (error) {
    collectCleanupError(collector, error);
  }
}

function verifyProofRunAgainstRecords(
  tracked: TrackedProofRun,
  expected: readonly string[],
  limits: EndgameProofRunLimits,
): void {
  assertProofRunDescriptor(tracked.run, tracked.expectedId);
  if (tracked.run.size !== expected.length) {
    throw proofRunError(`${tracked.expectedId} size ${tracked.run.size} does not match ${expected.length}`);
  }
  const iterator = tracked.run.values()[Symbol.iterator]();
  const cleanup = createCleanupCollector();
  let completed = false;
  let primary: unknown;
  let hasPrimary = false;
  try {
    for (let index = 0; index < expected.length; index += 1) {
      const item = iterator.next();
      if (item.done) throw proofRunError(`${tracked.expectedId} omitted record ${index}`);
      proofRunRecordBytes(item.value, limits.recordMaxBytes);
      if (item.value !== expected[index]) {
        throw proofRunError(`${tracked.expectedId} changed record ${index}`);
      }
    }
    if (!iterator.next().done) throw proofRunError(`${tracked.expectedId} added records`);
    completed = true;
  } catch (error) {
    primary = error;
    hasPrimary = true;
  } finally {
    if (!completed) closeIterator(iterator, cleanup);
  }
  if (hasPrimary) throwProofRunFailure(primary, cleanup);
  if (cleanup.errors.length > 0 || cleanup.omitted > 0) {
    throwProofRunFailure(proofRunError(`${tracked.expectedId} readback failed`), cleanup);
  }
}

function* verifiedProofRunValues(
  tracked: TrackedProofRun,
  limits: EndgameProofRunLimits,
): Generator<string, void, undefined> {
  assertProofRunDescriptor(tracked.run, tracked.expectedId);
  let count = 0;
  let previous: string | null = null;
  for (const value of tracked.run.values()) {
    proofRunRecordBytes(value, limits.recordMaxBytes);
    if (previous !== null && ordinalByteCompare(previous, value) >= 0) {
      throw proofRunError(`${tracked.expectedId} is not strictly increasing at record ${count}`);
    }
    if (count >= tracked.run.size) throw proofRunError(`${tracked.expectedId} added records`);
    previous = value;
    count += 1;
    yield value;
  }
  if (count !== tracked.run.size) {
    throw proofRunError(`${tracked.expectedId} yielded ${count} records for size ${tracked.run.size}`);
  }
}

function persistProofRun(
  owner: EndgameProofRunOwner,
  id: string,
  produce: (write: (key: string) => void) => number,
): TrackedProofRun {
  if (owner.active.size + owner.pendingWriters >= owner.limits.metadataMaxCount) {
    throw proofRunError(`active metadata exceeds ${owner.limits.metadataMaxCount} entries`);
  }
  if (owner.activeIds.has(id)) throw proofRunError(`duplicate deterministic run id ${id}`);
  owner.pendingWriters += 1;
  let writer: EndgameProofRunWriter | null = null;
  let finished = false;
  try {
    writer = owner.store.createRun(id);
    const expectedSize = produce((key) => {
      proofRunRecordBytes(key, owner.limits.recordMaxBytes);
      writer!.write(key);
    });
    const run = writer.finish();
    finished = true;
    owner.pendingWriters -= 1;
    const tracked = registerProofRun(owner, id, run);
    if (run.size !== expectedSize) {
      throw proofRunError(`${id} size ${run.size} does not match written count ${expectedSize}`);
    }
    return tracked;
  } catch (primary) {
    if (owner.pendingWriters > 0) owner.pendingWriters -= 1;
    const cleanup = createCleanupCollector();
    if (writer && !finished) {
      try {
        writer.abort();
      } catch (error) {
        collectCleanupError(cleanup, error);
      }
    }
    throwProofRunFailure(primary, cleanup);
  }
}

function sortAndDedupeProofChunk(chunk: string[]): void {
  chunk.sort(ordinalByteCompare);
  let output = 0;
  for (const value of chunk) {
    if (output === 0 || value !== chunk[output - 1]) {
      chunk[output] = value;
      output += 1;
    }
  }
  chunk.length = output;
}

function* mergedProofRunValues(
  inputs: readonly TrackedProofRun[],
  limits: EndgameProofRunLimits,
): Generator<string, void, undefined> {
  type Cursor = { iterator: Iterator<string>; current: string | null; count: number; run: TrackedProofRun };
  const cursors: Cursor[] = [];
  const cleanup = createCleanupCollector();
  const advance = (cursor: Cursor): void => {
    const item = cursor.iterator.next();
    if (item.done) {
      if (cursor.count !== cursor.run.run.size) {
        throw proofRunError(`${cursor.run.expectedId} yielded ${cursor.count} records for size ${cursor.run.run.size}`);
      }
      cursor.current = null;
      return;
    }
    proofRunRecordBytes(item.value, limits.recordMaxBytes);
    if (cursor.current !== null && ordinalByteCompare(cursor.current, item.value) >= 0) {
      throw proofRunError(`${cursor.run.expectedId} is not strictly increasing`);
    }
    if (cursor.count >= cursor.run.run.size) throw proofRunError(`${cursor.run.expectedId} added records`);
    cursor.current = item.value;
    cursor.count += 1;
  };
  let primary: unknown;
  let hasPrimary = false;
  try {
    for (const run of inputs) {
      assertProofRunDescriptor(run.run, run.expectedId);
      const cursor: Cursor = {
        iterator: run.run.values()[Symbol.iterator](),
        current: null,
        count: 0,
        run,
      };
      cursors.push(cursor);
      advance(cursor);
    }
    while (cursors.some((cursor) => cursor.current !== null)) {
      let next: string | null = null;
      for (const cursor of cursors) {
        if (cursor.current !== null && (next === null || ordinalByteCompare(cursor.current, next) < 0)) {
          next = cursor.current;
        }
      }
      if (next === null) break;
      yield next;
      for (const cursor of cursors) {
        if (cursor.current === next) advance(cursor);
      }
    }
  } catch (error) {
    primary = error;
    hasPrimary = true;
  } finally {
    for (const cursor of cursors) closeIterator(cursor.iterator, cleanup);
    if (!hasPrimary && (cleanup.errors.length > 0 || cleanup.omitted > 0)) {
      throwProofRunFailure(proofRunError('merge input cleanup failed'), cleanup);
    }
  }
  if (hasPrimary) throwProofRunFailure(primary, cleanup);
}

function verifyMergedProofRun(
  inputs: readonly TrackedProofRun[],
  output: TrackedProofRun,
  limits: EndgameProofRunLimits,
): void {
  const expected = mergedProofRunValues(inputs, limits);
  const actual = output.run.values()[Symbol.iterator]();
  const cleanup = createCleanupCollector();
  let count = 0;
  let previous: string | null = null;
  let completed = false;
  let primary: unknown;
  let hasPrimary = false;
  try {
    for (const value of expected) {
      const item = actual.next();
      if (item.done) throw proofRunError(`${output.expectedId} omitted merged record ${count}`);
      proofRunRecordBytes(item.value, limits.recordMaxBytes);
      if (item.value !== value) throw proofRunError(`${output.expectedId} changed merged record ${count}`);
      if (previous !== null && ordinalByteCompare(previous, item.value) >= 0) {
        throw proofRunError(`${output.expectedId} is not strictly increasing`);
      }
      previous = item.value;
      count += 1;
    }
    if (!actual.next().done) throw proofRunError(`${output.expectedId} added merged records`);
    if (count !== output.run.size) {
      throw proofRunError(`${output.expectedId} yielded ${count} records for size ${output.run.size}`);
    }
    completed = true;
  } catch (error) {
    primary = error;
    hasPrimary = true;
  } finally {
    if (!completed) {
      closeIterator(expected, cleanup);
      closeIterator(actual, cleanup);
    }
  }
  if (hasPrimary) throwProofRunFailure(primary, cleanup);
  if (cleanup.errors.length > 0 || cleanup.omitted > 0) {
    throwProofRunFailure(proofRunError(`${output.expectedId} merge readback failed`), cleanup);
  }
}

function mergeProofRuns(
  owner: EndgameProofRunOwner,
  depth: number,
  initialRuns: readonly TrackedProofRun[],
  options?: Readonly<{
    id(pass: number, group: number): string;
    rewriteSingletons: boolean;
  }>,
): TrackedProofRun {
  if (initialRuns.length === 0) {
    const empty = persistProofRun(owner, options?.id(0, 0) ?? proofRunId(depth, 0, 0), () => 0);
    verifyProofRunAgainstRecords(empty, [], owner.limits);
    return empty;
  }
  let runs = [...initialRuns];
  let pass = 1;
  while (runs.length > 1) {
    const outputs: TrackedProofRun[] = [];
    for (let start = 0, group = 0; start < runs.length; start += owner.limits.mergeFanIn, group += 1) {
      const inputs = runs.slice(start, start + owner.limits.mergeFanIn);
      if (inputs.length === 1 && !options?.rewriteSingletons) {
        for (const _value of verifiedProofRunValues(inputs[0]!, owner.limits)) {
          // A one-run tail is revalidated and carried without rewriting it.
        }
        outputs.push(inputs[0]!);
        continue;
      }
      const id = options?.id(pass, group) ?? proofRunId(depth, pass, group);
      const output = persistProofRun(owner, id, (write) => {
        let count = 0;
        for (const value of mergedProofRunValues(inputs, owner.limits)) {
          write(value);
          count += 1;
        }
        return count;
      });
      verifyMergedProofRun(inputs, output, owner.limits);
      for (const input of inputs) disposeTrackedProofRun(owner, input);
      outputs.push(output);
    }
    runs = outputs;
    pass += 1;
  }
  return runs[0]!;
}

function createProofLayerBuilder(
  owner: EndgameProofRunOwner,
  depth: number,
  ids?: Readonly<{
    working(pass: number, group: number): string;
    committed: string;
  }>,
): Readonly<{ add(key: string): void; finish(): TrackedProofRun }> {
  let chunk: string[] = [];
  let chunkBytes = 0;
  const runs: TrackedProofRun[] = [];
  let closed = false;
  const flush = (): void => {
    if (chunk.length === 0) return;
    if (runs.length >= owner.limits.chunkMaxCount) {
      throw proofRunError(`layer exceeds ${owner.limits.chunkMaxCount} chunk runs`);
    }
    sortAndDedupeProofChunk(chunk);
    const source = chunk;
    const run = persistProofRun(owner, ids?.working(0, runs.length) ?? proofRunId(depth, 0, runs.length), (write) => {
      for (const value of source) write(value);
      return source.length;
    });
    verifyProofRunAgainstRecords(run, source, owner.limits);
    runs.push(run);
    chunk = [];
    chunkBytes = 0;
  };
  return Object.freeze({
    add(key: string): void {
      if (closed) throw proofRunError('cannot add to a finished layer');
      const bytes = proofRunRecordBytes(key, owner.limits.recordMaxBytes);
      if (bytes > owner.limits.chunkMaxBytes) {
        throw proofRunError(`single record exceeds ${owner.limits.chunkMaxBytes}-byte chunk limit`);
      }
      if (
        chunk.length > 0
        && (chunkBytes + bytes > owner.limits.chunkMaxBytes
          || chunk.length + 1 > owner.limits.chunkMaxRecords)
      ) flush();
      chunk.push(key);
      chunkBytes += bytes;
    },
    finish(): TrackedProofRun {
      if (closed) throw proofRunError('layer is already finished');
      closed = true;
      flush();
      const merged = mergeProofRuns(owner, depth, runs, ids ? Object.freeze({
        id: ids.working,
        rewriteSingletons: true,
      }) : undefined);
      if (!ids) return merged;
      const committed = persistProofRun(owner, ids.committed, (write) => {
        let count = 0;
        for (const value of verifiedProofRunValues(merged, owner.limits)) {
          write(value);
          count += 1;
        }
        return count;
      });
      verifyMergedProofRun([merged], committed, owner.limits);
      disposeTrackedProofRun(owner, merged);
      return committed;
    },
  });
}

function cleanupProofRunOwner(owner: EndgameProofRunOwner): CleanupErrorCollector {
  const collector = createCleanupCollector();
  for (const tracked of [...owner.active].reverse()) {
    try {
      disposeTrackedProofRun(owner, tracked);
    } catch (error) {
      collectCleanupError(collector, error);
    }
  }
  try {
    owner.store.dispose();
  } catch (error) {
    collectCleanupError(collector, error);
  }
  try {
    const diagnostics = owner.store.diagnostics();
    if (diagnostics.activeRuns.length > 0) {
      collectCleanupError(collector, proofRunError(`store retained active runs: ${diagnostics.activeRuns.join(',')}`));
    }
    if (diagnostics.residue.length > 0) {
      collectCleanupError(collector, proofRunError(`store retained residue: ${diagnostics.residue.join(',')}`));
    }
    if (diagnostics.residueTruncated) {
      collectCleanupError(collector, proofRunError('store residue diagnostics were truncated'));
    }
    if (diagnostics.cleanupErrorsTruncated) {
      let sentinel: string | undefined;
      for (let index = diagnostics.cleanupErrors.length - 1; index >= 0; index -= 1) {
        const message = diagnostics.cleanupErrors[index]!;
        if (/omitted\s+\d+/i.test(message)) {
          sentinel = message;
          break;
        }
      }
      for (const error of diagnostics.cleanupErrors) {
        if (error !== sentinel) collectCleanupError(collector, error);
      }
      const omitted = sentinel ? Number(/omitted\s+(\d+)/i.exec(sentinel)?.[1]) : 1;
      collectOmittedCleanupErrors(collector, omitted);
    } else {
      for (const error of diagnostics.cleanupErrors) collectCleanupError(collector, error);
    }
  } catch (error) {
    collectCleanupError(collector, error);
  }
  return collector;
}

function withProofRunStore<T>(
  store: EndgameProofRunStore,
  limits: EndgameProofRunLimits,
  work: (owner: EndgameProofRunOwner) => T,
): T {
  const owner: EndgameProofRunOwner = {
    store,
    limits,
    active: new Set(),
    activeIds: new Set(),
    pendingWriters: 0,
  };
  let result: T;
  try {
    result = work(owner);
  } catch (primary) {
    throwProofRunFailure(primary, cleanupProofRunOwner(owner));
  }
  const cleanup = cleanupProofRunOwner(owner);
  if (cleanup.errors.length > 0 || cleanup.omitted > 0) {
    throwProofRunFailure(proofRunError('store cleanup failed after a completed proof'), cleanup);
  }
  return result;
}

function testProofRunLimits(overrides: Partial<EndgameProofRunLimits>): EndgameProofRunLimits {
  const limits = { ...ENDGAME_PROOF_RUN_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw proofRunError(`${name} test limit is invalid`);
  }
  if (limits.mergeFanIn < 2 || limits.mergeFanIn > PROOF_RUN_MERGE_FAN_IN) {
    throw proofRunError(`test merge fan-in must be 2..${PROOF_RUN_MERGE_FAN_IN}`);
  }
  return Object.freeze(limits);
}

type SyntheticVerifiedUnitForTesting = Readonly<{
  syntheticVerifiedNextKeys: Iterable<string>;
  lastProcessedParentKey: string;
  transitionsDelta: number;
  boundPrunesDelta: number;
}>;

/** @internal Bounded low-level matrix seam; it never invokes an Endgame search. */
export const ENDGAME_PROOF_FRONTIER_STORE_TESTING = Object.freeze({
  limits: ENDGAME_PROOF_RUN_LIMITS,
  ordinalByteCompare,
  persist(
    records: Iterable<string>,
    store: EndgameProofRunStore,
    overrides: Partial<EndgameProofRunLimits> = {},
  ): readonly string[] {
    const limits = testProofRunLimits(overrides);
    return withProofRunStore(store, limits, (owner) => {
      const layer = createProofLayerBuilder(owner, 0);
      for (const record of records) layer.add(record);
      const run = layer.finish();
      return Object.freeze([...verifiedProofRunValues(run, limits)]);
    });
  },
  advanceSyntheticVerifiedUnitForDefinition(
    definition: EndgameDefinition,
    candidateCommandStream: string,
    store: EndgameProofCheckpointRunStore,
    fixture: SyntheticVerifiedUnitForTesting,
    overrides: Partial<EndgameProofRunLimits> = {},
  ): EndgameProofAdvanceResult | null {
    return advanceResumableEndgameProof(
      definition, candidateCommandStream, store,
      Object.freeze({ fixture, limits: testProofRunLimits(overrides) }),
    );
  },
});

type PreparedResumableEndgameProof = Readonly<{
  levelId: EndgameId;
  replay: EndgameRouteReplay;
  optimalLocks: number;
  useIntervalBound: boolean;
  intervalCapacityCache: ProofIntervalCapacityCache;
  columnMaskCapacityCache: ProofColumnMaskCapacityCache;
  initialStateHash: string;
  started: GameState;
  proofContext: EndgameProofFrontierContext;
  binding: EndgameProofResumeBinding;
}>;

function resumableProofRunId(kind: 'frontier' | 'unit', depth: number, generation: number, unit?: number): string {
  if (!Number.isSafeInteger(depth) || depth < 0 || depth > 32_767) {
    throw proofRunError('resumable depth must be 0..32767');
  }
  if (!Number.isSafeInteger(generation) || generation < 0 || generation > 32_767) {
    throw proofRunError('resumable generation must be 0..32767');
  }
  const depthToken = String(depth).padStart(5, '0');
  const generationToken = String(generation).padStart(5, '0');
  if (kind === 'frontier') return `r7-f-d${depthToken}-g${generationToken}`;
  if (!Number.isSafeInteger(unit) || unit! < 0 || unit! > 4095) {
    throw proofRunError('resumable unit must be 0..4095');
  }
  return `r7-u-d${depthToken}-n${String(unit).padStart(8, '0')}-g${generationToken}`;
}

function prepareResumableEndgameProof(
  definition: EndgameDefinition,
  candidateCommandStream: string,
): PreparedResumableEndgameProof | null {
  const levelId = definition.id;
  const replay = replayEndgameRouteForDefinition(definition, candidateCommandStream);
  if (replay.state.status !== 'finished' || replay.state.endgameCompletion !== 'finished' || replay.locks.length <= 0) {
    throw new Error(`Optimal Endgame candidate must be a completed public-command replay: ${levelId}.`);
  }
  const optimalLocks = replay.locks.length;
  if (!Number.isSafeInteger(optimalLocks) || optimalLocks <= 0 || optimalLocks > 32_768) {
    throw proofRunError('optimal lock count must be 1..32768');
  }
  const useIntervalBound = optimalLocks >= LONG_PROOF_INTERVAL_BOUND_MINIMUM_LOCKS;
  const intervalCapacityCache: ProofIntervalCapacityCache = new Map();
  const columnMaskCapacityCache: ProofColumnMaskCapacityCache = new Map();
  const canonicalStart = dispatch(createEndgameInitialState(definition), { type: 'start' }).state;
  if (!isActive(canonicalStart)) return null;
  const initialStateHash = stateHash(canonicalStart);
  const started = withoutUndoHistory(canonicalStart);
  const proofContext = createProofFrontierContext(started);
  const initialFrontierKey = proofFrontierStateKey(started, proofContext);
  const binding: EndgameProofResumeBinding = Object.freeze({
    schema: 't37-f4e-r7-proof-binding-v1',
    levelId,
    candidateCommandStream,
    optimalLocks,
    initialStateHash,
    initialFrontierKey,
  });
  return Object.freeze({
    levelId,
    replay,
    optimalLocks,
    useIntervalBound,
    intervalCapacityCache,
    columnMaskCapacityCache,
    initialStateHash,
    started,
    proofContext,
    binding,
  });
}

function assertResumableBinding(
  actual: EndgameProofResumeBinding,
  expected: EndgameProofResumeBinding,
): void {
  for (const key of [
    'schema',
    'levelId',
    'candidateCommandStream',
    'optimalLocks',
    'initialStateHash',
    'initialFrontierKey',
  ] as const) {
    if (actual[key] !== expected[key]) {
      throw proofRunError(`checkpoint binding ${key} does not match the candidate`);
    }
  }
}

function assertResumableTip(tip: EndgameProofTip | null, generation: number | null): EndgameProofTip {
  if (tip === null) throw proofRunError('checkpoint is missing its authenticated tip');
  if (
    !Number.isSafeInteger(tip.generation)
    || tip.generation < 0
    || tip.generation > 32_767
    || tip.generation !== generation
  ) {
    throw proofRunError('checkpoint tip generation is invalid');
  }
  if (!/^[0-9A-F]{64}$/.test(tip.manifestSha256)) {
    throw proofRunError('checkpoint tip hash is invalid');
  }
  return tip;
}

function frozenResumableDepths(
  records: readonly EndgameOptimalRouteDepthRecord[],
  maximum: number,
): readonly EndgameOptimalRouteDepthRecord[] {
  if (!Array.isArray(records) || records.length > maximum) {
    throw proofRunError('completed depth prefix length is invalid');
  }
  return Object.freeze(records.map((record, index) => {
    if (
      record.lockedPieces !== index
      || !Number.isSafeInteger(record.frontierStates)
      || record.frontierStates <= 0
      || !Number.isSafeInteger(record.transitions)
      || record.transitions < 0
      || !Number.isSafeInteger(record.boundPrunes)
      || record.boundPrunes < 0
    ) {
      throw proofRunError(`completed depth ${index} is invalid`);
    }
    return Object.freeze({
      lockedPieces: record.lockedPieces,
      frontierStates: record.frontierStates,
      transitions: record.transitions,
      boundPrunes: record.boundPrunes,
    });
  }));
}

function generationAfterCompletedDepths(records: readonly EndgameOptimalRouteDepthRecord[]): number {
  let generation = 0;
  for (const record of records) {
    const unitCount = Math.ceil(record.frontierStates / RESUMABLE_PARENT_UNIT_SIZE);
    if (!Number.isSafeInteger(unitCount) || unitCount < 1 || unitCount > RESUMABLE_PARENT_UNIT_MAX_COUNT) {
      throw proofRunError('completed depth frontier exceeds the 4096-unit generation domain');
    }
    generation += unitCount + 1;
    if (!Number.isSafeInteger(generation) || generation > 32_767) {
      throw proofRunError('completed depth history exceeds generation 32767');
    }
  }
  return generation;
}

function safeDepthTotal(
  records: readonly EndgameOptimalRouteDepthRecord[],
  key: 'frontierStates' | 'transitions' | 'boundPrunes',
): number {
  let total = 0;
  for (const record of records) {
    total += record[key];
    if (!Number.isSafeInteger(total)) throw proofRunError(`${key} total exceeds the safe integer domain`);
  }
  return total;
}

function assertSafeCompletedDepthTotals(records: readonly EndgameOptimalRouteDepthRecord[]): void {
  safeDepthTotal(records, 'frontierStates');
  safeDepthTotal(records, 'transitions');
  safeDepthTotal(records, 'boundPrunes');
}

function assertSafeSearchingTotals(
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[],
  frontierStates: number,
  transitions: number,
  boundPrunes: number,
): void {
  addSafeProofCounter(safeDepthTotal(exhaustedDepths, 'frontierStates'), frontierStates, 'frontier-state total');
  addSafeProofCounter(safeDepthTotal(exhaustedDepths, 'transitions'), transitions, 'transition total');
  addSafeProofCounter(safeDepthTotal(exhaustedDepths, 'boundPrunes'), boundPrunes, 'bound-prune total');
}

function certificateFromResumableCheckpoint(
  prepared: PreparedResumableEndgameProof,
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[],
): EndgameOptimalRouteCertificate {
  const frozenDepths = frozenResumableDepths(exhaustedDepths, prepared.optimalLocks - 1);
  return Object.freeze({
    levelId: prepared.levelId,
    optimalLocks: prepared.optimalLocks,
    exhaustedDepths: frozenDepths,
    exhaustedFrontierWidths: Object.freeze(frozenDepths.map(({ frontierStates }) => frontierStates)),
    exploredStateCount: safeDepthTotal(frozenDepths, 'frontierStates'),
    transitionCount: safeDepthTotal(frozenDepths, 'transitions'),
    deficitBoundPrunes: safeDepthTotal(frozenDepths, 'boundPrunes'),
    initialStateHash: prepared.initialStateHash,
    replay: prepared.replay,
  });
}

function assertCompleteCheckpoint(
  checkpoint: EndgameProofCompleteCheckpoint,
  prepared: PreparedResumableEndgameProof,
): readonly EndgameOptimalRouteDepthRecord[] {
  assertResumableBinding(checkpoint.binding, prepared.binding);
  const records = frozenResumableDepths(checkpoint.exhaustedDepths, prepared.optimalLocks - 1);
  if (checkpoint.reason === 'zero-decision-depth') {
    if (prepared.optimalLocks !== 1 || records.length !== 0) {
      throw proofRunError('zero-decision checkpoint shape is invalid');
    }
  } else if (checkpoint.reason === 'final-depth') {
    if (prepared.optimalLocks < 2 || records.length !== prepared.optimalLocks - 1) {
      throw proofRunError('final-depth checkpoint shape is invalid');
    }
  } else if (
    checkpoint.reason !== 'empty-frontier'
    || records.length === 0
    || records.length >= prepared.optimalLocks - 1
  ) {
    throw proofRunError('empty-frontier checkpoint shape is invalid');
  }
  const expectedGeneration = checkpoint.reason === 'zero-decision-depth'
    ? 1
    : generationAfterCompletedDepths(records);
  if (checkpoint.generation !== expectedGeneration) {
    throw proofRunError('complete checkpoint generation does not match its completed-depth history');
  }
  assertSafeCompletedDepthTotals(records);
  return records;
}

function createVerifiedResumableRun(
  store: EndgameProofRunStore,
  id: string,
  records: readonly string[],
): EndgameProofRun {
  let writer: EndgameProofRunWriter | null = null;
  let run: EndgameProofRun | null = null;
  try {
    writer = store.createRun(id);
    for (const record of records) {
      proofRunRecordBytes(record, PROOF_RUN_RECORD_MAX_BYTES);
      writer.write(record);
    }
    run = writer.finish();
    assertProofRunDescriptor(run, id);
    verifyProofRunAgainstRecords(Object.freeze({ expectedId: id, run }), records, ENDGAME_PROOF_RUN_LIMITS);
    return run;
  } catch (primary) {
    const cleanup = createCleanupCollector();
    if (run) {
      try {
        run.dispose();
      } catch (error) {
        collectCleanupError(cleanup, error);
      }
    } else if (writer) {
      try {
        writer.abort();
      } catch (error) {
        collectCleanupError(cleanup, error);
      }
    }
    throwProofRunFailure(primary, cleanup);
  }
}

const RESUMABLE_PARENT_UNIT_SIZE = 65_536;
const RESUMABLE_PARENT_UNIT_MAX_COUNT = 4096;

function resumableUnitWorkingRunId(
  generation: number,
  depth: number,
  unit: number,
  pass: number,
  group: number,
): string {
  for (const [label, value, maximum] of [
    ['generation', generation, 32_767],
    ['depth', depth, 32_767],
    ['unit', unit, 4095],
    ['pass', pass, 4095],
    ['group', group, 4095],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
      throw proofRunError(`resumable ${label} is outside 0..${maximum}`);
    }
  }
  return `r7w-u-g${String(generation).padStart(5, '0')}`
    + `-d${String(depth).padStart(5, '0')}`
    + `-n${String(unit).padStart(8, '0')}`
    + `-p${String(pass).padStart(4, '0')}`
    + `-h${String(group).padStart(4, '0')}`;
}

function createResumableProofRunOwner(
  store: EndgameProofRunStore,
  limits: EndgameProofRunLimits = ENDGAME_PROOF_RUN_LIMITS,
): EndgameProofRunOwner {
  return {
    store,
    limits,
    active: new Set(),
    activeIds: new Set(),
    pendingWriters: 0,
  };
}

function cleanupResumableProofRuns(owner: EndgameProofRunOwner): CleanupErrorCollector {
  const cleanup = createCleanupCollector();
  for (const tracked of [...owner.active].reverse()) {
    try {
      disposeTrackedProofRun(owner, tracked);
    } catch (error) {
      collectCleanupError(cleanup, error);
    }
  }
  return cleanup;
}

function detachResumableProofRun(owner: EndgameProofRunOwner, tracked: TrackedProofRun): EndgameProofRun {
  owner.active.delete(tracked);
  owner.activeIds.delete(tracked.expectedId);
  return tracked.run;
}

function addSafeProofCounter(base: number, delta: number, label: string): number {
  if (!Number.isSafeInteger(base) || base < 0 || !Number.isSafeInteger(delta) || delta < 0) {
    throw proofRunError(`${label} counter is invalid`);
  }
  const result = base + delta;
  if (!Number.isSafeInteger(result)) throw proofRunError(`${label} counter exceeds the safe integer domain`);
  return result;
}

function assertSearchingCheckpoint(
  checkpoint: EndgameProofSearchingCheckpoint,
  prepared: PreparedResumableEndgameProof,
): Readonly<{
  processedUnits: number;
  finalDecisionDepth: boolean;
  frontierGeneration: number;
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[];
}> {
  assertResumableBinding(checkpoint.binding, prepared.binding);
  assertProofRunDescriptor(checkpoint.frontier, checkpoint.frontier.id);
  if (
    !Number.isSafeInteger(checkpoint.depth)
    || checkpoint.depth < 0
    || checkpoint.depth > 32_767
    || (prepared.optimalLocks > 1 && checkpoint.depth > prepared.optimalLocks - 2)
    || (prepared.optimalLocks === 1 && checkpoint.depth !== 0)
  ) {
    throw proofRunError('searching checkpoint depth is invalid');
  }
  const exhaustedDepths = frozenResumableDepths(checkpoint.exhaustedDepths, prepared.optimalLocks - 1);
  if (exhaustedDepths.length !== checkpoint.depth) {
    throw proofRunError('searching checkpoint completed-depth prefix does not match its depth');
  }
  if (checkpoint.frontier.size <= 0
    || checkpoint.frontier.size > RESUMABLE_PARENT_UNIT_SIZE * RESUMABLE_PARENT_UNIT_MAX_COUNT) {
    throw proofRunError('searching frontier size exceeds the 4096-unit domain');
  }
  if (
    !Number.isSafeInteger(checkpoint.parentOffset)
    || checkpoint.parentOffset < 0
    || checkpoint.parentOffset > checkpoint.frontier.size
    || (checkpoint.parentOffset !== checkpoint.frontier.size
      && checkpoint.parentOffset % RESUMABLE_PARENT_UNIT_SIZE !== 0)
  ) {
    throw proofRunError('searching parent offset is not a canonical unit boundary');
  }
  const processedUnits = checkpoint.parentOffset === 0
    ? 0
    : Math.ceil(checkpoint.parentOffset / RESUMABLE_PARENT_UNIT_SIZE);
  if (processedUnits > RESUMABLE_PARENT_UNIT_MAX_COUNT) {
    throw proofRunError('searching checkpoint exceeds 4096 parent units');
  }
  const frontierMatch = /^r7-f-d(\d{5})-g(\d{5})$/.exec(checkpoint.frontier.id);
  if (!frontierMatch || Number(frontierMatch[1]) !== checkpoint.depth) {
    throw proofRunError('searching frontier id does not match its depth');
  }
  const frontierGeneration = Number(frontierMatch[2]);
  const historicalFrontierGeneration = generationAfterCompletedDepths(exhaustedDepths);
  if (frontierGeneration !== historicalFrontierGeneration) {
    throw proofRunError('searching frontier generation does not match its completed-depth history');
  }
  const historicalCheckpointGeneration = historicalFrontierGeneration + processedUnits;
  if (!Number.isSafeInteger(historicalCheckpointGeneration) || historicalCheckpointGeneration > 32_767
    || historicalCheckpointGeneration !== checkpoint.generation) {
    throw proofRunError('searching generation does not match its frontier and unit cursor');
  }
  const finalDecisionDepth = prepared.optimalLocks > 1
    && checkpoint.depth === prepared.optimalLocks - 2;
  const expectedNextRuns = finalDecisionDepth ? 0 : processedUnits;
  if (!Number.isSafeInteger(checkpoint.nextRuns.count)
    || checkpoint.nextRuns.count !== expectedNextRuns
    || checkpoint.nextRuns.count < 0
    || checkpoint.nextRuns.count > RESUMABLE_PARENT_UNIT_MAX_COUNT) {
    throw proofRunError('searching next-run collection does not match processed units');
  }
  addSafeProofCounter(checkpoint.transitions, 0, 'transition');
  addSafeProofCounter(checkpoint.boundPrunes, 0, 'bound-prune');
  if (checkpoint.parentOffset === 0) {
    if (checkpoint.lastProcessedParentKey !== null
      || checkpoint.transitions !== 0
      || checkpoint.boundPrunes !== 0) {
      throw proofRunError('fresh searching layer has a nonempty cursor or counters');
    }
  } else {
    if (checkpoint.lastProcessedParentKey === null) {
      throw proofRunError('advanced searching layer is missing its parent cursor');
    }
    proofRunRecordBytes(checkpoint.lastProcessedParentKey, PROOF_RUN_RECORD_MAX_BYTES);
  }
  assertSafeSearchingTotals(
    exhaustedDepths, checkpoint.frontier.size, checkpoint.transitions, checkpoint.boundPrunes,
  );
  return Object.freeze({ processedUnits, finalDecisionDepth, frontierGeneration, exhaustedDepths });
}

function visitVerifiedProofRunRange(
  run: EndgameProofRun,
  range: EndgameProofRunRange,
  precedingKey: string | null,
  visit: (key: string) => void,
): string {
  const iterator = run.values(range)[Symbol.iterator]();
  const cleanup = createCleanupCollector();
  let previous = precedingKey;
  let completed = false;
  let primary: unknown;
  let hasPrimary = false;
  try {
    const expectedCount = range.endOrdinal - range.startOrdinal;
    for (let index = 0; index < expectedCount; index += 1) {
      const item = iterator.next();
      if (item.done) throw proofRunError(`${run.id} omitted ranged record ${range.startOrdinal + index}`);
      proofRunRecordBytes(item.value, PROOF_RUN_RECORD_MAX_BYTES);
      if (previous !== null && ordinalByteCompare(previous, item.value) >= 0) {
        throw proofRunError(`${run.id} ranged records are not strictly increasing`);
      }
      previous = item.value;
      visit(item.value);
    }
    if (!iterator.next().done) throw proofRunError(`${run.id} added ranged records`);
    completed = true;
  } catch (error) {
    primary = error;
    hasPrimary = true;
  } finally {
    if (!completed) closeIterator(iterator, cleanup);
  }
  if (hasPrimary) throwProofRunFailure(primary, cleanup);
  if (previous === null) throw proofRunError(`${run.id} returned an empty nonempty range`);
  return previous;
}

type VerifiedNextKeyUnitProgress = Readonly<{
  lastProcessedParentKey: string;
  transitionsDelta: number;
  boundPrunesDelta: number;
}>;

function publishSearchingProofUnitFromVerifiedNextKeys(
  checkpoint: EndgameProofSearchingCheckpoint,
  tip: EndgameProofTip,
  store: EndgameProofCheckpointRunStore,
  processedUnits: number,
  finalDecisionDepth: boolean,
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[],
  endOrdinal: number,
  limits: EndgameProofRunLimits,
  produceVerifiedNextKeys: (add: (key: string) => void) => VerifiedNextKeyUnitProgress,
): EndgameProofAdvanceResult {
  const generation = checkpoint.generation + 1;
  if (generation > 32_767) throw proofRunError('resumable generation exceeds 32767');
  const owner = createResumableProofRunOwner(store, limits);
  const builder = finalDecisionDepth ? null : createProofLayerBuilder(owner, checkpoint.depth + 1, Object.freeze({
    working: (pass: number, group: number) => resumableUnitWorkingRunId(
      generation, checkpoint.depth, processedUnits, pass, group,
    ),
    committed: resumableProofRunId('unit', checkpoint.depth, generation, processedUnits),
  }));
  let frontierReleased = false;
  try {
    const progress = produceVerifiedNextKeys((key) => {
      if (builder === null) throw proofRunError('final decision unit cannot produce a next key');
      builder.add(key);
    });
    assertSafeSearchingTotals(
      exhaustedDepths,
      checkpoint.frontier.size,
      addSafeProofCounter(checkpoint.transitions, progress.transitionsDelta, 'transition'),
      addSafeProofCounter(checkpoint.boundPrunes, progress.boundPrunesDelta, 'bound-prune'),
    );
    const trackedNextRun = builder?.finish() ?? null;
    store.releaseCheckpointRun(checkpoint.frontier);
    frontierReleased = true;
    const nextRun = trackedNextRun ? detachResumableProofRun(owner, trackedNextRun) : null;
    const publication = store.publishCheckpoint(Object.freeze({
      transition: 'unit',
      previousTip: tip,
      parentOffset: endOrdinal,
      lastProcessedParentKey: progress.lastProcessedParentKey,
      transitionsDelta: progress.transitionsDelta,
      boundPrunesDelta: progress.boundPrunesDelta,
      nextRun,
    }));
    return searchingAdvanceResult(generation, checkpoint.depth, endOrdinal, publication);
  } catch (primary) {
    const cleanup = cleanupResumableProofRuns(owner);
    if (!frontierReleased) {
      try {
        store.releaseCheckpointRun(checkpoint.frontier);
      } catch (error) {
        collectCleanupError(cleanup, error);
      }
    }
    throwProofRunFailure(primary, cleanup);
  }
}

function advanceSearchingProofUnit(
  checkpoint: EndgameProofSearchingCheckpoint,
  tip: EndgameProofTip,
  prepared: PreparedResumableEndgameProof,
  store: EndgameProofCheckpointRunStore,
  processedUnits: number,
  finalDecisionDepth: boolean,
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[],
): EndgameProofAdvanceResult {
  const endOrdinal = Math.min(checkpoint.frontier.size, checkpoint.parentOffset + RESUMABLE_PARENT_UNIT_SIZE);
  const range = Object.freeze({ startOrdinal: checkpoint.parentOffset, endOrdinal });
  return publishSearchingProofUnitFromVerifiedNextKeys(
    checkpoint, tip, store, processedUnits, finalDecisionDepth, exhaustedDepths,
    endOrdinal, ENDGAME_PROOF_RUN_LIMITS, (add) => {
      let transitionsDelta = 0;
      let boundPrunesDelta = 0;
      const lastProcessedParentKey = visitVerifiedProofRunRange(
        checkpoint.frontier,
        range,
        checkpoint.lastProcessedParentKey,
        (parentKey) => {
          const parent = decodeProofFrontierStateKey(parentKey, prepared.proofContext);
          if (proofDeficitBoundPrecludesCandidate(
            parent,
            prepared.optimalLocks - checkpoint.depth - 1,
            prepared.useIntervalBound,
            prepared.intervalCapacityCache,
            prepared.columnMaskCapacityCache,
          )) {
            boundPrunesDelta += 1;
            addSafeProofCounter(checkpoint.boundPrunes, boundPrunesDelta, 'bound-prune');
            return;
          }
          for (const landing of exhaustiveEndgameLandings(parent)) {
            transitionsDelta += 1;
            addSafeProofCounter(checkpoint.transitions, transitionsDelta, 'transition');
            if (landing.state.status === 'finished') {
              throw new Error(
                `Endgame ${prepared.levelId} has a shorter route than the ${prepared.optimalLocks}-lock candidate.`,
              );
            }
            if (!isActive(landing.state) || finalDecisionDepth) continue;
            const nextDepth = checkpoint.depth + 1;
            if (proofDeficitBoundPrecludesCandidate(
              landing.state,
              prepared.optimalLocks - nextDepth - 1,
              prepared.useIntervalBound,
              prepared.intervalCapacityCache,
              prepared.columnMaskCapacityCache,
            )) {
              boundPrunesDelta += 1;
              addSafeProofCounter(checkpoint.boundPrunes, boundPrunesDelta, 'bound-prune');
              continue;
            }
            add(proofFrontierStateKey(landing.state, prepared.proofContext));
          }
        },
      );
      return Object.freeze({ lastProcessedParentKey, transitionsDelta, boundPrunesDelta });
    },
  );
}

function resumableLayerWorkingRunId(
  generation: number,
  depth: number,
  pass: number,
  group: number,
): string {
  for (const [label, value, maximum] of [
    ['generation', generation, 32_767],
    ['depth', depth, 32_767],
    ['pass', pass, 4095],
    ['group', group, 4095],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
      throw proofRunError(`resumable layer ${label} is outside 0..${maximum}`);
    }
  }
  return `r7w-l-g${String(generation).padStart(5, '0')}`
    + `-d${String(depth).padStart(5, '0')}`
    + `-p${String(pass).padStart(4, '0')}`
    + `-h${String(group).padStart(4, '0')}`;
}

function validateMergedCheckpointInput(
  tracked: TrackedProofRun,
  prepared: PreparedResumableEndgameProof,
): void {
  for (const key of verifiedProofRunValues(tracked, ENDGAME_PROOF_RUN_LIMITS)) {
    decodeProofFrontierStateKey(key, prepared.proofContext);
  }
}

function mergeCheckpointRunCollection(
  checkpoint: EndgameProofSearchingCheckpoint,
  prepared: PreparedResumableEndgameProof,
  store: EndgameProofCheckpointRunStore,
  owner: EndgameProofRunOwner,
  generation: number,
  frontierGeneration: number,
): TrackedProofRun {
  const firstPass: TrackedProofRun[] = [];
  for (let startIndex = 0, group = 0; startIndex < checkpoint.nextRuns.count; startIndex += 32, group += 1) {
    const endIndex = Math.min(checkpoint.nextRuns.count, startIndex + 32);
    const opened = checkpoint.nextRuns.open(Object.freeze({ startIndex, endIndex }));
    const inputs = Array.isArray(opened) ? opened.map((run, offset) => {
      const unit = startIndex + offset;
      const expectedId = resumableProofRunId('unit', checkpoint.depth, frontierGeneration + unit + 1, unit);
      return Object.freeze({ expectedId, run });
    }) : [];
    let output: TrackedProofRun | null = null;
    let primary: unknown;
    let hasPrimary = false;
    try {
      if (!Array.isArray(opened) || opened.length !== endIndex - startIndex) {
        throw proofRunError('checkpoint collection returned the wrong contiguous batch length');
      }
      for (const input of inputs) {
        assertProofRunDescriptor(input.run, input.expectedId);
        validateMergedCheckpointInput(input, prepared);
      }
      output = persistProofRun(owner, resumableLayerWorkingRunId(
        generation, checkpoint.depth + 1, 0, group,
      ), (write) => {
        let count = 0;
        for (const value of mergedProofRunValues(inputs, ENDGAME_PROOF_RUN_LIMITS)) {
          write(value);
          count += 1;
        }
        return count;
      });
      verifyMergedProofRun(inputs, output, ENDGAME_PROOF_RUN_LIMITS);
    } catch (error) {
      primary = error;
      hasPrimary = true;
    }
    const cleanup = createCleanupCollector();
    for (const input of inputs) {
      try {
        store.releaseCheckpointRun(input.run);
      } catch (error) {
        collectCleanupError(cleanup, error);
      }
    }
    if (hasPrimary) throwProofRunFailure(primary, cleanup);
    if (cleanup.errors.length > 0 || cleanup.omitted > 0) {
      throwProofRunFailure(proofRunError('checkpoint collection release failed'), cleanup);
    }
    firstPass.push(output!);
  }
  return mergeProofRuns(owner, checkpoint.depth + 1, firstPass, Object.freeze({
    id: (pass: number, group: number) => resumableLayerWorkingRunId(
      generation, checkpoint.depth + 1, pass, group,
    ),
    rewriteSingletons: true,
  }));
}

function completeAdvanceResult(
  prepared: PreparedResumableEndgameProof,
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[],
  generation: number,
  publication: ReturnType<EndgameProofCheckpointRunStore['publishCheckpoint']>,
): EndgameProofAdvanceResult {
  const advanceAllowed = assertStrictAdvanceAllowed(publication.advanceAllowed, 'checkpoint publication');
  const tip = assertResumableTip(publication.tip, generation);
  return Object.freeze({
    status: 'complete',
    generation,
    certificate: certificateFromResumableCheckpoint(prepared, exhaustedDepths),
    tip,
    diagnostics: publication.diagnostics,
    advanceAllowed,
  });
}

function advanceCoveredSearchingLayer(
  checkpoint: EndgameProofSearchingCheckpoint,
  tip: EndgameProofTip,
  prepared: PreparedResumableEndgameProof,
  store: EndgameProofCheckpointRunStore,
  validated: ReturnType<typeof assertSearchingCheckpoint>,
): EndgameProofAdvanceResult {
  const generation = checkpoint.generation + 1;
  if (generation > 32_767) throw proofRunError('resumable generation exceeds 32767');
  const completedDepth = Object.freeze({
    lockedPieces: checkpoint.depth,
    frontierStates: checkpoint.frontier.size,
    transitions: checkpoint.transitions,
    boundPrunes: checkpoint.boundPrunes,
  });
  const exhaustedDepths = Object.freeze([...validated.exhaustedDepths, completedDepth]);
  assertSafeCompletedDepthTotals(exhaustedDepths);
  const owner = createResumableProofRunOwner(store);
  let frontierReleased = false;
  try {
    store.releaseCheckpointRun(checkpoint.frontier);
    frontierReleased = true;
    if (validated.finalDecisionDepth) {
      const publication = store.publishCheckpoint(Object.freeze({
        transition: 'complete', previousTip: tip, completedDepth, reason: 'final-depth',
      }));
      return completeAdvanceResult(prepared, exhaustedDepths, generation, publication);
    }
    const merged = mergeCheckpointRunCollection(
      checkpoint, prepared, store, owner, generation, validated.frontierGeneration,
    );
    if (merged.run.size === 0) {
      disposeTrackedProofRun(owner, merged);
      const publication = store.publishCheckpoint(Object.freeze({
        transition: 'complete', previousTip: tip, completedDepth, reason: 'empty-frontier',
      }));
      return completeAdvanceResult(prepared, exhaustedDepths, generation, publication);
    }
    const committedId = resumableProofRunId('frontier', checkpoint.depth + 1, generation);
    const committed = persistProofRun(owner, committedId, (write) => {
      let count = 0;
      for (const value of verifiedProofRunValues(merged, ENDGAME_PROOF_RUN_LIMITS)) {
        write(value);
        count += 1;
      }
      return count;
    });
    verifyMergedProofRun([merged], committed, ENDGAME_PROOF_RUN_LIMITS);
    disposeTrackedProofRun(owner, merged);
    const nextFrontier = detachResumableProofRun(owner, committed);
    const publication = store.publishCheckpoint(Object.freeze({
      transition: 'layer', previousTip: tip, completedDepth, nextFrontier,
    }));
    return searchingAdvanceResult(generation, checkpoint.depth + 1, 0, publication);
  } catch (primary) {
    const cleanup = cleanupResumableProofRuns(owner);
    if (!frontierReleased) {
      try {
        store.releaseCheckpointRun(checkpoint.frontier);
      } catch (error) {
        collectCleanupError(cleanup, error);
      }
    }
    throwProofRunFailure(primary, cleanup);
  }
}

function searchingAdvanceResult(
  generation: number,
  depth: number,
  parentOffset: number,
  publication: ReturnType<EndgameProofCheckpointRunStore['publishCheckpoint']>,
): EndgameProofAdvanceResult {
  const advanceAllowed = assertStrictAdvanceAllowed(publication.advanceAllowed, 'checkpoint publication');
  const tip = assertResumableTip(publication.tip, generation);
  return Object.freeze({
    status: 'searching',
    generation,
    depth,
    parentOffset,
    tip,
    diagnostics: publication.diagnostics,
    advanceAllowed,
  });
}

function blockedAdvanceResult(
  checkpoint: EndgameProofSearchingCheckpoint | null,
  tip: EndgameProofTip | null,
  diagnostics: EndgameProofRunStoreDiagnostics,
): EndgameProofAdvanceResult {
  return Object.freeze({
    status: 'blocked',
    generation: checkpoint?.generation ?? null,
    tip,
    diagnostics,
    advanceAllowed: false,
  });
}

function assertStrictAdvanceAllowed(value: unknown, source: string): boolean {
  if (typeof value !== 'boolean') throw proofRunError(`${source} advanceAllowed must be boolean`);
  return value;
}

type SyntheticVerifiedUnitTestingOptions = Readonly<{
  fixture: SyntheticVerifiedUnitForTesting;
  limits: EndgameProofRunLimits;
}>;

function advanceSyntheticVerifiedSearchingProofUnitForTesting(
  checkpoint: EndgameProofSearchingCheckpoint,
  tip: EndgameProofTip,
  store: EndgameProofCheckpointRunStore,
  processedUnits: number,
  finalDecisionDepth: boolean,
  exhaustedDepths: readonly EndgameOptimalRouteDepthRecord[],
  testing: SyntheticVerifiedUnitTestingOptions,
): EndgameProofAdvanceResult {
  const endOrdinal = Math.min(checkpoint.frontier.size, checkpoint.parentOffset + RESUMABLE_PARENT_UNIT_SIZE);
  assertSafeSearchingTotals(
    exhaustedDepths,
    checkpoint.frontier.size,
    addSafeProofCounter(checkpoint.transitions, testing.fixture.transitionsDelta, 'transition'),
    addSafeProofCounter(checkpoint.boundPrunes, testing.fixture.boundPrunesDelta, 'bound-prune'),
  );
  const lastProcessedParentKey = testing.fixture.lastProcessedParentKey;
  proofRunRecordBytes(lastProcessedParentKey, PROOF_RUN_RECORD_MAX_BYTES);
  if (checkpoint.lastProcessedParentKey !== null
    && ordinalByteCompare(checkpoint.lastProcessedParentKey, lastProcessedParentKey) >= 0) {
    throw proofRunError('synthetic parent cursor is not strictly increasing');
  }
  return publishSearchingProofUnitFromVerifiedNextKeys(
    checkpoint, tip, store, processedUnits, finalDecisionDepth, exhaustedDepths,
    endOrdinal, testing.limits, (add) => {
      for (const key of testing.fixture.syntheticVerifiedNextKeys) {
        proofRunRecordBytes(key, testing.limits.recordMaxBytes);
        add(key);
      }
      return Object.freeze({
        lastProcessedParentKey,
        transitionsDelta: testing.fixture.transitionsDelta,
        boundPrunesDelta: testing.fixture.boundPrunesDelta,
      });
    },
  );
}

function advanceResumableEndgameProof(
  definition: EndgameDefinition,
  candidateCommandStream: string,
  store: EndgameProofCheckpointRunStore,
  testing: SyntheticVerifiedUnitTestingOptions | null = null,
): EndgameProofAdvanceResult | null {
  const prepared = prepareResumableEndgameProof(definition, candidateCommandStream);
  if (!prepared) return null;
  const loaded = store.loadCheckpoint();
  const loadedAdvanceAllowed = assertStrictAdvanceAllowed(loaded.advanceAllowed, 'loaded checkpoint');
  const { checkpoint, tip } = loaded;
  if (checkpoint === null) {
    if (testing !== null) throw proofRunError('synthetic unit testing requires a searching checkpoint');
    if (tip !== null) throw proofRunError('null checkpoint has a nonnull tip');
    if (!loadedAdvanceAllowed) return blockedAdvanceResult(null, null, loaded.diagnostics);
    const frontier = createVerifiedResumableRun(
      store,
      resumableProofRunId('frontier', 0, 0),
      [prepared.binding.initialFrontierKey],
    );
    const publication = store.publishCheckpoint(Object.freeze({
      transition: 'seed',
      previousTip: null,
      binding: prepared.binding,
      frontier,
    }));
    return searchingAdvanceResult(0, 0, 0, publication);
  }

  const checkpointKind: unknown = checkpoint.kind;
  if (checkpointKind !== 'searching' && checkpointKind !== 'complete') {
    throw proofRunError('checkpoint kind must be searching or complete');
  }

  const authenticatedTip = assertResumableTip(tip, checkpoint.generation);
  assertResumableBinding(checkpoint.binding, prepared.binding);
  if (checkpoint.kind === 'complete') {
    if (testing !== null) throw proofRunError('synthetic unit testing requires a searching checkpoint');
    const records = assertCompleteCheckpoint(checkpoint, prepared);
    return Object.freeze({
      status: 'complete',
      generation: checkpoint.generation,
      certificate: certificateFromResumableCheckpoint(prepared, records),
      tip: authenticatedTip,
      diagnostics: loaded.diagnostics,
      advanceAllowed: loadedAdvanceAllowed,
    });
  }
  const searching = assertSearchingCheckpoint(checkpoint, prepared);
  if (testing !== null && (prepared.optimalLocks === 1 || checkpoint.parentOffset >= checkpoint.frontier.size)) {
    throw proofRunError('synthetic unit testing requires an uncovered searching unit');
  }
  if (!loadedAdvanceAllowed) {
    return blockedAdvanceResult(checkpoint, authenticatedTip, loaded.diagnostics);
  }
  if (prepared.optimalLocks === 1) {
    let frontierReleased = false;
    try {
      if (checkpoint.generation !== 0 || checkpoint.frontier.id !== 'r7-f-d00000-g00000'
        || checkpoint.frontier.size !== 1) {
        throw proofRunError('zero-decision checkpoint is not the canonical seed');
      }
      const initialKey = visitVerifiedProofRunRange(
        checkpoint.frontier,
        Object.freeze({ startOrdinal: 0, endOrdinal: 1 }),
        null,
        () => {},
      );
      if (initialKey !== prepared.binding.initialFrontierKey) {
        throw proofRunError('zero-decision frontier does not match the binding');
      }
      store.releaseCheckpointRun(checkpoint.frontier);
      frontierReleased = true;
      const publication = store.publishCheckpoint(Object.freeze({
        transition: 'complete',
        previousTip: authenticatedTip,
        completedDepth: null,
        reason: 'zero-decision-depth',
      }));
      return completeAdvanceResult(prepared, Object.freeze([]), checkpoint.generation + 1, publication);
    } catch (primary) {
      const cleanup = createCleanupCollector();
      if (!frontierReleased) {
        try {
          store.releaseCheckpointRun(checkpoint.frontier);
        } catch (error) {
          collectCleanupError(cleanup, error);
        }
      }
      throwProofRunFailure(primary, cleanup);
    }
  }
  if (checkpoint.parentOffset < checkpoint.frontier.size) {
    if (testing !== null) {
      return advanceSyntheticVerifiedSearchingProofUnitForTesting(
        checkpoint,
        authenticatedTip,
        store,
        searching.processedUnits,
        searching.finalDecisionDepth,
        searching.exhaustedDepths,
        testing,
      );
    }
    return advanceSearchingProofUnit(
      checkpoint,
      authenticatedTip,
      prepared,
      store,
      searching.processedUnits,
      searching.finalDecisionDepth,
      searching.exhaustedDepths,
    );
  }
  return advanceCoveredSearchingLayer(
    checkpoint, authenticatedTip, prepared, store, searching,
  );
}

export function advanceOptimalEndgameRouteProof(
  levelId: EndgameId,
  candidateCommandStream: string,
  store: EndgameProofCheckpointRunStore,
): EndgameProofAdvanceResult | null {
  return advanceResumableEndgameProof(getEndgameDefinition(levelId), candidateCommandStream, store);
}

export function advanceOptimalEndgameRouteProofForDefinition(
  definition: EndgameDefinition,
  candidateCommandStream: string,
  store: EndgameProofCheckpointRunStore,
): EndgameProofAdvanceResult | null {
  return advanceResumableEndgameProof(definition, candidateCommandStream, store);
}

function certifyOptimalEndgameRouteWithRunStore(
  definition: EndgameDefinition,
  candidateCommandStream: string,
  runStore: EndgameProofRunStore,
): EndgameOptimalRouteCertificate | null {
  return withProofRunStore(runStore, ENDGAME_PROOF_RUN_LIMITS, (owner) => {
    const levelId = definition.id;
    const replay = replayEndgameRouteForDefinition(definition, candidateCommandStream);
    if (replay.state.status !== 'finished' || replay.state.endgameCompletion !== 'finished' || replay.locks.length <= 0) {
      throw new Error(`Optimal Endgame candidate must be a completed public-command replay: ${levelId}.`);
    }
    const optimalLocks = replay.locks.length;
    const useIntervalBound = optimalLocks >= LONG_PROOF_INTERVAL_BOUND_MINIMUM_LOCKS;
    const intervalCapacityCache: ProofIntervalCapacityCache = new Map();
    const columnMaskCapacityCache: ProofColumnMaskCapacityCache = new Map();
    const canonicalStart = dispatch(createEndgameInitialState(definition), { type: 'start' }).state;
    if (!isActive(canonicalStart)) return null;
    const initialStateHash = stateHash(canonicalStart);
    const started = withoutUndoHistory(canonicalStart);
    const proofContext = createProofFrontierContext(started);
    const firstLayer = createProofLayerBuilder(owner, 0);
    firstLayer.add(proofFrontierStateKey(started, proofContext));
    let frontier = firstLayer.finish();
    const exhaustedDepths: EndgameOptimalRouteDepthRecord[] = [];

    for (let depth = 0; depth < optimalLocks - 1 && frontier.run.size > 0; depth += 1) {
      assertProofRunDescriptor(frontier.run, frontier.expectedId);
      const frontierStates = frontier.run.size;
      let transitions = 0;
      let boundPrunes = 0;
      const nextFrontier = createProofLayerBuilder(owner, depth + 1);
      for (const parentKey of verifiedProofRunValues(frontier, owner.limits)) {
        const parent = decodeProofFrontierStateKey(parentKey, proofContext);
        if (proofDeficitBoundPrecludesCandidate(
          parent, optimalLocks - depth - 1, useIntervalBound, intervalCapacityCache, columnMaskCapacityCache,
        )) {
          boundPrunes += 1;
          continue;
        }
        for (const landing of exhaustiveEndgameLandings(parent)) {
          transitions += 1;
          if (landing.state.status === 'finished') {
            throw new Error(`Endgame ${levelId} has a shorter route than the ${optimalLocks}-lock candidate.`);
          }
          if (!isActive(landing.state)) continue;
          const nextDepth = depth + 1;
          if (nextDepth >= optimalLocks - 1) continue;
          if (proofDeficitBoundPrecludesCandidate(
            landing.state, optimalLocks - nextDepth - 1, useIntervalBound, intervalCapacityCache, columnMaskCapacityCache,
          )) {
            boundPrunes += 1;
            continue;
          }
          nextFrontier.add(proofFrontierStateKey(landing.state, proofContext));
        }
      }
      const finalizedNextFrontier = nextFrontier.finish();
      exhaustedDepths.push(Object.freeze({
        lockedPieces: depth,
        frontierStates,
        transitions,
        boundPrunes,
      }));
      disposeTrackedProofRun(owner, frontier);
      frontier = finalizedNextFrontier;
    }

    const frozenExhaustedDepths = Object.freeze(exhaustedDepths);
    const exhaustedFrontierWidths = Object.freeze(frozenExhaustedDepths.map((record) => (
      record.frontierStates
    )));
    const exploredStateCount = frozenExhaustedDepths.reduce((total, record) => (
      total + record.frontierStates
    ), 0);
    const transitionCount = frozenExhaustedDepths.reduce((total, record) => (
      total + record.transitions
    ), 0);
    const deficitBoundPrunes = frozenExhaustedDepths.reduce((total, record) => (
      total + record.boundPrunes
    ), 0);

    return Object.freeze({
      levelId,
      optimalLocks,
      exhaustedDepths: frozenExhaustedDepths,
      exhaustedFrontierWidths,
      exploredStateCount,
      transitionCount,
      deficitBoundPrunes,
      initialStateHash,
      replay,
    });
  });
}

/**
 * Certifies a supplied winning route as optimal. All public-control landing states that
 * could finish with fewer locks are traversed; pruning uses only proved target-deficit
 * lower bounds, including the long-route interval-supply relaxation. There is no beam,
 * heuristic score, state-count cutoff, or product-time execution.
 */
export function certifyOptimalEndgameRoute(
  levelId: EndgameId,
  candidateCommandStream: string,
  options: EndgameOptimalRouteCertificateOptions = {},
): EndgameOptimalRouteCertificate | null {
  return certifyOptimalEndgameRouteForDefinition(getEndgameDefinition(levelId), candidateCommandStream, options);
}

export function certifyOptimalEndgameRouteForDefinition(
  definition: EndgameDefinition,
  candidateCommandStream: string,
  options: EndgameOptimalRouteCertificateOptions = {},
): EndgameOptimalRouteCertificate | null {
  if (options.runStore) {
    return certifyOptimalEndgameRouteWithRunStore(definition, candidateCommandStream, options.runStore);
  }
  const levelId = definition.id;
  const replay = replayEndgameRouteForDefinition(definition, candidateCommandStream);
  if (replay.state.status !== 'finished' || replay.state.endgameCompletion !== 'finished' || replay.locks.length <= 0) {
    throw new Error(`Optimal Endgame candidate must be a completed public-command replay: ${levelId}.`);
  }
  const optimalLocks = replay.locks.length;
  const useIntervalBound = optimalLocks >= LONG_PROOF_INTERVAL_BOUND_MINIMUM_LOCKS;
  const intervalCapacityCache: ProofIntervalCapacityCache = new Map();
  const columnMaskCapacityCache: ProofColumnMaskCapacityCache = new Map();
  const canonicalStart = dispatch(createEndgameInitialState(definition), { type: 'start' }).state;
  if (!isActive(canonicalStart)) return null;
  const initialStateHash = stateHash(canonicalStart);
  const started = withoutUndoHistory(canonicalStart);
  const proofContext = createProofFrontierContext(started);
  let frontier = [proofFrontierStateKey(started, proofContext)];
  const exhaustedDepths: EndgameOptimalRouteDepthRecord[] = [];

  for (let depth = 0; depth < optimalLocks - 1 && frontier.length > 0; depth += 1) {
    const frontierStates = frontier.length;
    let transitions = 0;
    let boundPrunes = 0;
    const nextFrontier = new Set<string>();
    for (const parentKey of frontier) {
      const parent = decodeProofFrontierStateKey(parentKey, proofContext);
      if (proofDeficitBoundPrecludesCandidate(
        parent, optimalLocks - depth - 1, useIntervalBound, intervalCapacityCache, columnMaskCapacityCache,
      )) {
        boundPrunes += 1;
        continue;
      }
      for (const landing of exhaustiveEndgameLandings(parent)) {
        transitions += 1;
        if (landing.state.status === 'finished') {
          throw new Error(`Endgame ${levelId} has a shorter route than the ${optimalLocks}-lock candidate.`);
        }
        if (!isActive(landing.state)) continue;
        const nextDepth = depth + 1;
        if (nextDepth >= optimalLocks - 1) continue;
        if (proofDeficitBoundPrecludesCandidate(
          landing.state, optimalLocks - nextDepth - 1, useIntervalBound, intervalCapacityCache, columnMaskCapacityCache,
        )) {
          boundPrunes += 1;
          continue;
        }
        nextFrontier.add(proofFrontierStateKey(landing.state, proofContext));
      }
    }
    exhaustedDepths.push(Object.freeze({
      lockedPieces: depth,
      frontierStates,
      transitions,
      boundPrunes,
    }));
    frontier = [...nextFrontier];
  }

  const frozenExhaustedDepths = Object.freeze(exhaustedDepths);
  const exhaustedFrontierWidths = Object.freeze(frozenExhaustedDepths.map((record) => (
    record.frontierStates
  )));
  const exploredStateCount = frozenExhaustedDepths.reduce((total, record) => (
    total + record.frontierStates
  ), 0);
  const transitionCount = frozenExhaustedDepths.reduce((total, record) => (
    total + record.transitions
  ), 0);
  const deficitBoundPrunes = frozenExhaustedDepths.reduce((total, record) => (
    total + record.boundPrunes
  ), 0);

  return Object.freeze({
    levelId,
    optimalLocks,
    exhaustedDepths: frozenExhaustedDepths,
    exhaustedFrontierWidths,
    exploredStateCount,
    transitionCount,
    deficitBoundPrunes,
    initialStateHash,
    replay,
  });
}

/**
 * Test-only authoring aid: reconstructs one route from the same proof-quotiented,
 * exhaustive public-control frontier used by optimality certification. It never
 * participates in product state or unlock decisions.
 */
export function discoverExactEndgameRoute(
  levelId: EndgameId,
  maxLocks: number,
): EndgameRouteReplay | null {
  const definition = getEndgameDefinition(levelId);
  const canonicalStart = dispatch(createEndgameInitialState(definition), { type: 'start' }).state;
  if (!isActive(canonicalStart) || !Number.isSafeInteger(maxLocks) || maxLocks <= 0) return null;
  const started = withoutUndoHistory(canonicalStart);
  const proofContext = createProofFrontierContext(started);
  let frontier = new Map<string, readonly GameCommand[]>([
    [proofFrontierStateKey(started, proofContext), Object.freeze([{ type: 'start' }])],
  ]);

  for (let depth = 0; depth < maxLocks && frontier.size > 0; depth += 1) {
    const next = new Map<string, readonly GameCommand[]>();
    for (const [parentKey, parentCommands] of frontier) {
      const parent = decodeProofFrontierStateKey(parentKey, proofContext);
      if (depth + endgameRouteLockLowerBound(parent) > maxLocks) continue;
      for (const landing of exhaustiveEndgameLandings(parent)) {
        const commands = Object.freeze([...parentCommands, ...landing.commands]);
        if (landing.state.status === 'finished' && landing.state.endgameCompletion === 'finished') {
          return replayEndgameRouteForDefinition(definition, encodeEndgameRoute(commands));
        }
        if (!isActive(landing.state) || depth + 1 >= maxLocks) continue;
        if (depth + 1 + endgameRouteLockLowerBound(landing.state) > maxLocks) continue;
        const key = proofFrontierStateKey(landing.state, proofContext);
        if (!next.has(key)) next.set(key, commands);
      }
    }
    frontier = next;
  }
  return null;
}

function countHoles(state: GameState): number {
  let holes = 0;
  for (let x = 0; x < state.board[0]!.length; x += 1) {
    let occupied = false;
    for (const row of state.board) {
      if (row[x]) occupied = true;
      else if (occupied) holes += 1;
    }
  }
  return holes;
}

/** Lower is friendlier: retain target removal first, then readable flat staging. */
function routeCost(state: GameState, depth: number): number {
  const targetCount = state.endgameTargetCells.length;
  let aggregateHeight = 0;
  let bumpiness = 0;
  let rowCompletion = 0;
  const heights: number[] = [];
  for (let x = 0; x < state.board[0]!.length; x += 1) {
    let height = 0;
    for (let y = 0; y < state.board.length; y += 1) {
      if (state.board[y]![x]) {
        height = state.board.length - y;
        break;
      }
    }
    heights.push(height);
    aggregateHeight += height;
  }
  for (let x = 1; x < heights.length; x += 1) bumpiness += Math.abs(heights[x]! - heights[x - 1]!);
  for (const row of state.board) {
    const fill = row.reduce((count, cell) => count + Number(cell !== null), 0);
    if (fill >= 6) rowCompletion += fill * fill;
  }
  return targetCount * 1_000_000
    + countHoles(state) * 3_000
    + aggregateHeight * 40
    + bumpiness * 80
    - rowCompletion * 25
    + depth * 5;
}

function reconstructReplay(node: SearchNode): EndgameRouteReplay {
  const segments: GameCommand[][] = [];
  const locks: EndgameLockPlacement[] = [];
  for (let cursor: SearchNode | null = node; cursor?.parent; cursor = cursor.parent) {
    segments.push([...cursor.segment]);
    if (cursor.lock) locks.push(cursor.lock);
  }
  segments.reverse();
  locks.reverse();
  const commands: GameCommand[] = [{ type: 'start' }, ...segments.flat()];
  return Object.freeze({
    state: node.state,
    commands: Object.freeze(commands),
    locks: Object.freeze(locks),
  });
}

function firstDivergence(canonical: readonly EndgameLockPlacement[], alternative: readonly EndgameLockPlacement[]): number | null {
  const bound = Math.min(canonical.length, alternative.length);
  for (let index = 0; index < bound; index += 1) {
    if (canonical[index]!.signature !== alternative[index]!.signature) return index + 1;
  }
  return canonical.length === alternative.length ? null : bound + 1;
}

function searchRoute(
  levelId: EndgameId,
  maxLocks: number,
  beamWidth: number,
  banned?: { lock: EndgameLockPlacement; index: number },
  initialState?: GameState,
): EndgameRouteReplay | null {
  const started = initialState
    ?? dispatch(createInitialState(0x51a1f00d, 'endgame', levelId), { type: 'start' }).state;
  if (!isActive(started)) return null;
  let beam: SearchNode[] = [{ state: withoutUndoHistory(started), parent: null, segment: [], lock: null, depth: 0, cost: routeCost(started, 0) }];

  for (let depth = 0; depth < maxLocks; depth += 1) {
    const deduplicated = new Map<string, SearchNode>();
    for (const parent of beam) {
      for (const landing of endgameLandings(parent.state)) {
        if (depth === banned?.index && landing.lock.signature === banned.lock.signature) continue;
        const node: SearchNode = {
          state: landing.state,
          parent,
          segment: landing.commands,
          lock: landing.lock,
          depth: parent.depth + 1,
          cost: routeCost(landing.state, parent.depth + 1),
        };
        if (landing.state.status === 'finished') return reconstructReplay(node);
        if (!isActive(landing.state)) continue;
        const key = endgameRouteStateKey(landing.state);
        const existing = deduplicated.get(key);
        if (!existing || node.cost < existing.cost) deduplicated.set(key, node);
      }
    }
    beam = [...deduplicated.values()]
      .sort((left, right) => left.cost - right.cost || left.lock!.signature.localeCompare(right.lock!.signature))
      .slice(0, beamWidth);
    if (beam.length === 0) return null;
  }
  return null;
}

/** Finds one legal Core-replayed route without making it a product rule or hint script. */
export function findEndgameRoute(levelId: EndgameId, options: EndgameRouteSearchOptions = {}): EndgameRouteReplay | null {
  return searchRoute(levelId, options.maxLocks ?? 30, options.beamWidth ?? 480);
}

export function findEndgameRouteForDefinition(
  definition: EndgameDefinition,
  options: EndgameRouteSearchOptions = {},
): EndgameRouteReplay | null {
  const started = dispatch(createEndgameInitialState(definition), { type: 'start' }).state;
  return searchRoute(definition.id, options.maxLocks ?? 30, options.beamWidth ?? 480, undefined, started);
}

export function decodeEndgameRoute(commandStream: string): readonly GameCommand[] {
  return Object.freeze([...commandStream].map(tokenCommand));
}

export function encodeEndgameRoute(commands: readonly GameCommand[]): string {
  return commands.map(commandToken).join('');
}

/** Replays an artifact route through the current Core and records each genuine landing. */
export function replayEndgameRoute(levelId: EndgameId, commandStream: string): EndgameRouteReplay {
  return replayEndgameRouteForDefinition(getEndgameDefinition(levelId), commandStream);
}

function createEndgameInitialState(definition: EndgameDefinition): GameState {
  return createInitialState(
    0x51a1f00d,
    'endgame',
    definition.id,
    undefined,
    undefined,
    definition,
  );
}

export function replayEndgameRouteForDefinition(
  definition: EndgameDefinition,
  commandStream: string,
): EndgameRouteReplay {
  let state = createEndgameInitialState(definition);
  const commands = decodeEndgameRoute(commandStream);
  const locks: EndgameLockPlacement[] = [];
  for (const command of commands) {
    const transition = dispatch(state, command);
    const locked = transition.events.find((event): event is Extract<typeof event, { type: 'piece-locked' }> => event.type === 'piece-locked');
    if (locked) locks.push(lockPlacement(locked.piece, locked.cells));
    state = transition.state;
  }
  return Object.freeze({ state, commands, locks: Object.freeze(locks) });
}

export function metricsForEndgameRoute(commandStream: string): EndgameRouteMetrics {
  return Object.freeze({
    commandCount: commandStream.length,
    locks: [...commandStream].filter((token) => token === 'H').length,
    rotationCount: [...commandStream].filter((token) => token === 'C' || token === 'Q').length,
    moveCount: [...commandStream].filter((token) => token === 'L' || token === 'R').length,
  });
}

/**
 * Finds one compact alternate route by excluding the canonical landing at each possible
 * point in turn. The earliest replayable difference wins, which gives a player a real
 * early strategic choice instead of a late cosmetic variant.
 */
export function findEndgameAlternativeRoute(
  levelId: EndgameId,
  canonicalCommandStream: string,
  options: EndgameRouteSearchOptions = {},
): EndgameAlternativeSearchResult {
  const canonical = replayEndgameRoute(levelId, canonicalCommandStream);
  const maxLocks = options.maxLocks ?? canonical.locks.length + 2;
  const beamWidth = options.beamWidth ?? 360;
  if (canonical.state.status !== 'finished' || canonical.state.endgameCompletion !== 'finished') {
    throw new Error(`Canonical route for ${levelId} does not finish through Core.`);
  }

  for (let index = 0; index < canonical.locks.length; index += 1) {
    const alternative = searchRoute(levelId, maxLocks, beamWidth, { lock: canonical.locks[index]!, index });
    if (!alternative) continue;
    const divergence = firstDivergence(canonical.locks, alternative.locks);
    if (divergence !== null) return Object.freeze({ canonical, alternative, firstDivergenceLock: divergence });
  }
  return Object.freeze({ canonical, alternative: null, firstDivergenceLock: null });
}
