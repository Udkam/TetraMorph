import { canPlace } from './board';
import { BOARD_HEIGHT, BOARD_WIDTH, NEXT_QUEUE_SIZE } from './constants';
import { createInitialState, dispatch, stateHash } from './engine';
import { getEndgameDefinition, type EndgameDefinition } from './endgames';
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
export const ENDGAME_PROOF_FIELD_POLICY = {
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
  lockTicks: 'proof-quotiented',
  lockResets: 'proof-quotiented',
  elapsedTicks: 'proof-quotiented',
  randomizer: 'encoded',
  seed: 'template-invariant',
} as const satisfies Readonly<Record<keyof GameState, EndgameProofFieldStorage>>;

type EndgameProofFrontierContext = Readonly<{ template: GameState }>;
const PIECE_TYPE_SET = new Set<string>(PIECE_TYPES);

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
  if (state.mode !== 'endgame' || state.endgameId === null || state.seed <= 0) {
    proofKeyError('state is not a seeded Endgame');
  }
  if (state.endgameGoal !== 'original-targets-cleared' || state.endgameCompletion !== 'active') {
    proofKeyError('Endgame goal or completion is not active');
  }
  if (state.status !== 'playing' || state.phase !== 'active' || state.active === null) {
    proofKeyError('state is not an active playing decision');
  }
  if (
    state.phaseTicks !== 0 || state.gravityTicks !== 0 || state.lockTicks !== 0
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
  return endgameRouteStateKey(state);
}

function parseCanonicalUint(text: string, label: string, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!/^(0|[1-9]\d*)$/.test(text)) proofKeyError(`${label} is not a canonical unsigned integer`);
  const value = Number(text);
  if (!isUint(value, maximum)) proofKeyError(`${label} is outside its domain`);
  return value;
}

function parseCanonicalInt(text: string, label: string): number {
  if (!/^-?(0|[1-9]\d*)$/.test(text)) proofKeyError(`${label} is not a canonical integer`);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || String(value) !== text) proofKeyError(`${label} is outside its domain`);
  return value;
}

function parseCellsKey(text: string, label: string): readonly Cell[] {
  if (text === '') return Object.freeze([]);
  const cells = text.split('|').map((token) => {
    const match = /^(0|[1-9]\d*),(0|[1-9]\d*)$/.exec(token);
    if (!match) proofKeyError(`${label} has malformed coordinates`);
    return Object.freeze({
      x: parseCanonicalUint(match[1]!, `${label} x`, BOARD_WIDTH - 1),
      y: parseCanonicalUint(match[2]!, `${label} y`, BOARD_HEIGHT - 1),
    });
  });
  assertCells(cells, label);
  if (orderedCellsKey(cells) !== text) proofKeyError(`${label} is not canonically sorted`);
  return Object.freeze(cells);
}

function parsePieceList(text: string, label: string, expectedLength?: number): PieceType[] {
  const pieces = [...text];
  if (pieces.some((piece) => !PIECE_TYPE_SET.has(piece))) proofKeyError(`${label} contains an unknown piece`);
  const typed = pieces as PieceType[];
  assertPieceList(typed, label, expectedLength);
  return typed;
}

function decodeProofFrontierStateKey(key: string, context: EndgameProofFrontierContext): GameState {
  const segments = key.split('~');
  if (segments.length !== 11) proofKeyError('key must contain exactly 11 segments');
  const rows = segments[0]!.split('/');
  if (rows.length !== BOARD_HEIGHT || rows.some((row) => row.length !== BOARD_WIDTH || !/^[.#A]+$/.test(row))) {
    proofKeyError('board segment is malformed');
  }
  const board: Board = rows.map((row) => [...row].map((cell) => (
    cell === '.' ? null : cell === 'A' ? ANCHOR_CELL : 'I'
  )));
  const activeMatch = /^([IOTSZJL]):([0-3]):(-?(?:0|[1-9]\d*)):(-?(?:0|[1-9]\d*))$/.exec(segments[3]!);
  if (!activeMatch) proofKeyError('active-piece segment is malformed');
  const active: ActivePiece = {
    type: activeMatch[1] as PieceType,
    rotation: Number(activeMatch[2]) as Rotation,
    x: parseCanonicalInt(activeMatch[3]!, 'active x'),
    y: parseCanonicalInt(activeMatch[4]!, 'active y'),
  };
  const queue = parsePieceList(segments[4]!, 'queue', NEXT_QUEUE_SIZE);
  const bag = parsePieceList(segments[6]!, 'randomizer bag');
  if (bag.length > PIECE_TYPES.length - 1 || new Set(bag).size !== bag.length) {
    proofKeyError('randomizer bag is not a valid remaining seven-bag');
  }
  if (segments[9] !== 'active' || segments[10] !== 'playing') {
    proofKeyError('key is not an active-playing decision');
  }
  const decoded: GameState = {
    ...context.template,
    board,
    active,
    queue,
    score: 0,
    lines: 0,
    combo: 0,
    level: 0,
    endgameTargetLines: null,
    endgameTargetCells: parseCellsKey(segments[1]!, 'target cells'),
    endgameAnchorSupportedCells: parseCellsKey(segments[2]!, 'supported cells'),
    endgameQueue: Object.freeze([...queue]),
    endgameQueueIndex: 0,
    endgameSpawnCount: parseCanonicalUint(segments[8]!, 'Endgame spawn count'),
    endgameUndoHistory: Object.freeze([]),
    endgameActiveSpawnCheckpoint: null,
    completedLevelId: null,
    nextUnlockedLevelId: null,
    pieceCount: parseCanonicalUint(segments[7]!, 'piece count'),
    status: 'playing',
    phase: 'active',
    phaseTicks: 0,
    pendingClearRows: [],
    gravityTicks: 0,
    lockTicks: 0,
    lockResets: 0,
    elapsedTicks: 0,
    randomizer: {
      seed: parseCanonicalUint(segments[5]!, 'randomizer seed', 0xffff_ffff),
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

/**
 * Certifies a supplied winning route as optimal. All public-control landing states that
 * could finish with fewer locks are traversed; the only pruning rule is the proved
 * target-deficit lower bound above. There is no beam, heuristic score, state-count
 * cutoff, or product-time execution.
 */
export function certifyOptimalEndgameRoute(
  levelId: EndgameId,
  candidateCommandStream: string,
): EndgameOptimalRouteCertificate | null {
  return certifyOptimalEndgameRouteForDefinition(getEndgameDefinition(levelId), candidateCommandStream);
}

export function certifyOptimalEndgameRouteForDefinition(
  definition: EndgameDefinition,
  candidateCommandStream: string,
): EndgameOptimalRouteCertificate | null {
  const levelId = definition.id;
  const replay = replayEndgameRouteForDefinition(definition, candidateCommandStream);
  if (replay.state.status !== 'finished' || replay.state.endgameCompletion !== 'finished' || replay.locks.length <= 0) {
    throw new Error(`Optimal Endgame candidate must be a completed public-command replay: ${levelId}.`);
  }
  const optimalLocks = replay.locks.length;
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
      if (depth + endgameRouteLockLowerBound(parent) >= optimalLocks) {
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
        if (nextDepth + endgameRouteLockLowerBound(landing.state) >= optimalLocks) {
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
