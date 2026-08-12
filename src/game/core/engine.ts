import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
  CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
  ENTRY_DELAY_TICKS,
  LINE_CLEAR_BASE_SCORE,
  LINE_CLEAR_DELAY_TICKS,
  LOCK_DELAY_TICKS,
  MUTATION_BOMB_ROWS,
  MUTATION_BOMB_SCORE,
  MUTATION_CARRIER_CHANCE,
  MUTATION_EFFECT_TICKS,
  MUTATION_FREEZE_GRAVITY_TICKS,
  MUTATION_RANDOM_SALT,
  MUTATION_RESULT_TICKS,
  MUTATION_SUPERGRAVITY_PIECES,
  MAX_LOCK_RESETS,
  NEXT_QUEUE_SIZE,
  INITIAL_SURVIVAL_BEDROCK_ROWS,
  SURVIVAL_DEBRIS_FALL_PROGRESS_PER_TICK,
  SURVIVAL_DEBRIS_FALL_PROGRESS_THRESHOLD,
  SURVIVAL_DEBRIS_EVENTS_PER_INTERVAL_STEP,
  SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES,
  SURVIVAL_DEBRIS_MIN_INTERVAL_PIECES,
  SURVIVAL_DEBRIS_RANDOM_SALT,
  SURVIVAL_DEBRIS_WARNING_TICKS,
  SURVIVAL_LINES_PER_BEDROCK,
  SURVIVAL_RISES_PER_AFTERSHOCK,
  TICKS_PER_SECOND,
  VISIBLE_START_ROW,
  gravityForMode,
  normalizeClassicGravityFloorTicks,
  normalizeClassicStartingGravityTicks,
  survivalIntervalTicks,
} from './constants';
import { canPlace, clearRows, createBoard, fullRows, lowerBedrock, mapCellsAfterClear, mergePiece, raiseBedrock, setCell } from './board';
import { cellsForPiece, createSpawnPiece, nextRotation } from './pieces';
import { createEndgameBoard, defaultEndgameId, getEndgameDefinition, nextEndgameId, originalTargetCells, type EndgameDefinition } from './endgames';
import { createRandomizer, drawPiece, drawRandom } from './random';
import { kickTests } from './rotation';
import { settleSupergravityPiece } from './sprint';
import {
  activeUsesSupergravityLanding,
  mapMutationCarriersAfterClear,
  mutationCarriersClearedByRows,
  withoutMutationCarriers,
} from './mutation';
import {
  ANCHOR_CELL,
  SURVIVAL_STONE_CELL,
  type ActivePiece,
  type Cell,
  type GameCommand,
  type GameEvent,
  type GameMode,
  type GameState,
  type GameTransition,
  type MutationCarrier,
  type MutationItem,
  type PieceType,
  type EndgameCompletion,
  type EndgameId,
  type EndgameUndoSnapshot,
  type SurvivalDebris,
} from './types';

const MUTATION_ITEMS: readonly MutationItem[] = Object.freeze(['freeze', 'collapse', 'bomb', 'multiplier']);

function survivalDebrisSeed(seed: number): number {
  return (seed ^ SURVIVAL_DEBRIS_RANDOM_SALT) >>> 0;
}

function mutationItemSeed(seed: number): number {
  return (seed ^ MUTATION_RANDOM_SALT) >>> 0;
}

function refillQueue(state: GameState, minimum = NEXT_QUEUE_SIZE + 1): GameState {
  const queue = [...state.queue];
  let randomizer = state.randomizer;
  while (queue.length < minimum) {
    const draw = drawPiece(randomizer);
    queue.push(draw.piece);
    randomizer = draw.randomizer;
  }
  return { ...state, queue, randomizer };
}

/** Schedules an optional marked carrier without weakening the normal seven-bag. */
function drawMutationItem(
  randomizer: GameState['mutationRandomizer'],
): { item: MutationItem | null; randomizer: GameState['mutationRandomizer'] } {
  const chance = drawRandom(randomizer);
  if (chance.value >= MUTATION_CARRIER_CHANCE) return { item: null, randomizer: chance.randomizer };
  const itemRoll = drawRandom(chance.randomizer);
  return {
    item: MUTATION_ITEMS[Math.floor(itemRoll.value * MUTATION_ITEMS.length)] ?? 'freeze',
    randomizer: itemRoll.randomizer,
  };
}

function assignMutationCarrier(state: GameState): GameState {
  if (state.mode !== 'sprint' || state.pieceCount < 2) {
    return state.mutationActiveCarrier === null ? state : { ...state, mutationActiveCarrier: null };
  }
  const draw = drawMutationItem(state.mutationRandomizer);
  if (draw.item === null) {
    return { ...state, mutationRandomizer: draw.randomizer, mutationActiveCarrier: null };
  }
  return {
    ...state,
    mutationRandomizer: draw.randomizer,
    mutationActiveCarrier: { id: state.mutationNextCarrierId, item: draw.item },
    mutationNextCarrierId: state.mutationNextCarrierId + 1,
  };
}

/**
 * Predicts the carrier attached to the immediate upcoming Mutation piece without
 * consuming state. It mirrors spawnPiece's queue refill and carrier draw exactly so the
 * renderer can present the real item on Next while Core timing stays untouched.
 */
export function nextMutationPreviewItem(state: GameState): MutationItem | null {
  if (state.mode !== 'sprint' || state.status === 'game-over') return null;
  const pieceCountAtUpcomingSpawn = state.pieceCount + (state.active === null ? 0 : 1);
  if (pieceCountAtUpcomingSpawn < 2) return null;
  return drawMutationItem(state.mutationRandomizer).item;
}

function endgameFailure(
  state: GameState,
  completion: Exclude<EndgameCompletion, 'active' | 'finished'>,
  reason: Extract<GameEvent, { type: 'game-over' }>['reason'],
): GameTransition {
  return {
    state: {
      ...state,
      active: null,
      status: 'game-over',
      phase: 'active',
      phaseTicks: 0,
      pendingClearRows: [],
      gravityTicks: 0,
      lockTicks: 0,
      lockResets: 0,
      endgameCompletion: completion,
      completedLevelId: null,
      nextUnlockedLevelId: null,
    },
    events: [{ type: 'game-over', reason }],
  };
}

function spawnPiece(state: GameState, type?: PieceType): GameTransition {
  // Endgame undo returns a locked piece to its normal top spawn, not its old landing.
  const endgameSpawnCheckpoint = state.mode === 'endgame' ? endgameUndoCheckpoint(state) : null;
  let next = refillQueue(state, type ? NEXT_QUEUE_SIZE : NEXT_QUEUE_SIZE + 1);
  const queue = [...next.queue];
  const pieceType = type ?? queue.shift();
  if (!pieceType) return invalidState(next);
  next = refillQueue({ ...next, queue }, NEXT_QUEUE_SIZE);
  const active = createSpawnPiece(pieceType);
  next = assignMutationCarrier(next);
  // Moving Survival stones do not participate in block-out. A due event is
  // deliberately placed outside this piece's spawn columns below.
  const canSpawn = next.mode === 'race'
    ? canPlace(next.board, active)
    : canPlaceInState(next, active);
  if (!canSpawn) {
    if (next.mode === 'endgame') return endgameFailure(next, 'failed-top-out', 'block-out');
    return {
      state: { ...next, active: null, status: 'game-over', phase: 'active' },
      events: [{ type: 'game-over', reason: 'block-out' }],
    };
  }
  const claimsSupergravity = next.mode === 'sprint'
    && next.mutationCollapsePiecesRemaining > 0;
  let spawnedState: GameState = {
      ...next,
      active,
      mutationCollapsePiecesRemaining: claimsSupergravity
        ? next.mutationCollapsePiecesRemaining - 1
        : next.mutationCollapsePiecesRemaining,
      mutationCollapseLandingLatched: claimsSupergravity,
      endgameQueue: next.mode === 'endgame' ? Object.freeze([...next.queue]) : next.endgameQueue,
      endgameQueueIndex: 0,
      endgameSpawnCount: next.mode === 'endgame' ? next.endgameSpawnCount + 1 : next.endgameSpawnCount,
      endgameActiveSpawnCheckpoint: endgameSpawnCheckpoint,
      phase: 'active',
      phaseTicks: 0,
      pendingClearRows: [],
      gravityTicks: 0,
      lockTicks: 0,
      lockResets: 0,
  };
  const events: GameEvent[] = [];

  if (spawnedState.mode === 'race') {
    if (spawnedState.survivalDebrisPiecesRemaining <= 0) {
      const activeColumns = new Set(cellsForPiece(active).map((cell) => cell.x));
      const warnedColumnConflicts = spawnedState.survivalDebrisWarningColumns.some(
        (column) => activeColumns.has(column),
      );
      const safePlanState = warnedColumnConflicts
        ? {
            ...spawnedState,
            survivalDebrisWarningColumns: Object.freeze([]),
            survivalDebrisWarningHeight: null,
            survivalDebrisWarningTicks: 0,
          }
        : spawnedState;
      const planned = planSurvivalDebris(safePlanState, active);
      const emitted = spawnSurvivalDebris(planned.state);
      spawnedState = emitted.state;
      if (emitted.cells.length > 0) {
        const survivalDebrisSpawnCount = spawnedState.survivalDebrisSpawnCount + 1;
        const nextIntervalPieces = Math.max(
          SURVIVAL_DEBRIS_MIN_INTERVAL_PIECES,
          SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES
            - Math.floor(survivalDebrisSpawnCount / SURVIVAL_DEBRIS_EVENTS_PER_INTERVAL_STEP),
        );
        spawnedState = {
          ...spawnedState,
          survivalDebrisSpawnCount,
          survivalDebrisPieceInterval: nextIntervalPieces,
          survivalDebrisPiecesRemaining: nextIntervalPieces,
        };
        events.push({
          type: 'survival-stones-spawned',
          cells: emitted.cells,
          intervalPieces: state.survivalDebrisPieceInterval,
          nextIntervalPieces,
        });
      }
    }

    if (
      spawnedState.survivalDebrisPiecesRemaining === 1
      && spawnedState.survivalDebrisWarningColumns.length === 0
      && spawnedState.queue[0]
    ) {
      const planned = planSurvivalDebris(spawnedState, createSpawnPiece(spawnedState.queue[0]));
      spawnedState = {
        ...planned.state,
        survivalDebrisWarningTicks: SURVIVAL_DEBRIS_WARNING_TICKS,
      };
      events.push({
        type: 'survival-stones-warned',
        columns: planned.columns,
        height: planned.height,
        leadPieces: 1,
      });
    }
  }

  return {
    state: spawnedState,
    events,
  };
}

export function createInitialState(
  seed = 0x51a1f00d,
  mode: GameMode = 'marathon',
  endgameId?: EndgameId,
  classicStartingGravityTicks = CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
  classicGravityFloorTicks = CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
  endgameDefinitionOverride?: EndgameDefinition,
): GameState {
  const selectedEndgame = mode === 'endgame'
    ? endgameDefinitionOverride ?? getEndgameDefinition(endgameId ?? defaultEndgameId())
    : null;
  const effectiveSeed = selectedEndgame?.seed ?? seed;
  const requireCanonicalEndgame = endgameDefinitionOverride === undefined;
  const initialBoard = selectedEndgame ? createEndgameBoard(selectedEndgame, true, requireCanonicalEndgame) : createBoard();
  const endgameTargetCells = selectedEndgame ? originalTargetCells(selectedEndgame, requireCanonicalEndgame) : Object.freeze([]);
  const openingBedrock = mode === 'race' ? raiseBedrock(initialBoard, INITIAL_SURVIVAL_BEDROCK_ROWS) : null;
  const normalizedClassicStartingGravityTicks = normalizeClassicStartingGravityTicks(classicStartingGravityTicks);
  const base: GameState = {
    board: openingBedrock?.board ?? initialBoard,
    active: null,
    queue: [],
    score: 0,
    lines: 0,
    combo: 0,
    level: 0,
    mode,
    classicStartingGravityTicks: normalizedClassicStartingGravityTicks,
    classicGravityFloorTicks: normalizeClassicGravityFloorTicks(
      classicGravityFloorTicks,
      normalizedClassicStartingGravityTicks,
    ),
    endgameId: selectedEndgame?.id ?? null,
    endgameTargetLines: null,
    endgameTargetCells,
    endgameInitialTargetCount: endgameTargetCells.length,
    endgameAnchorSupportedCells: Object.freeze([]),
    endgameBoardRows: selectedEndgame?.boardRows ?? null,
    endgameQueue: null,
    endgameQueueIndex: 0,
    endgameSpawnCount: 0,
    endgameGoal: selectedEndgame ? 'original-targets-cleared' : null,
    endgameCompletion: selectedEndgame ? 'active' : null,
    endgameUndoHistory: Object.freeze([]),
    endgameActiveSpawnCheckpoint: null,
    completedLevelId: null,
    nextUnlockedLevelId: null,
    pieceCount: 0,
    survivalBedrockRows: openingBedrock?.added ?? 0,
    survivalPressureTicks: 0,
    survivalRisePending: false,
    survivalRiseCount: 0,
    survivalDebris: Object.freeze([]),
    survivalDebrisNextId: 1,
    survivalDebrisPiecesRemaining: SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES,
    survivalDebrisPieceInterval: SURVIVAL_DEBRIS_INITIAL_INTERVAL_PIECES,
    survivalDebrisSpawnCount: 0,
    survivalDebrisWarningColumns: Object.freeze([]),
    survivalDebrisWarningHeight: null,
    survivalDebrisWarningTicks: 0,
    survivalDebrisFallProgress: 0,
    survivalDebrisRandomizer: createRandomizer(survivalDebrisSeed(effectiveSeed)),
    mutationActiveCarrier: null,
    mutationRandomizer: createRandomizer(mutationItemSeed(effectiveSeed)),
    mutationCarriers: Object.freeze([]),
    mutationNextCarrierId: 1,
    mutationFreezeTicks: 0,
    mutationCollapsePiecesRemaining: 0,
    mutationCollapseLandingLatched: false,
    mutationMultiplierTicks: 0,
    mutationMultiplierFactor: 1,
    mutationLastItem: null,
    mutationLastItemTicks: 0,
    status: 'ready',
    phase: 'active',
    phaseTicks: 0,
    pendingClearRows: [],
    gravityTicks: 0,
    lockTicks: 0,
    lockResets: 0,
    elapsedTicks: 0,
    randomizer: createRandomizer(effectiveSeed),
    seed: effectiveSeed,
  };
  const spawned = spawnPiece(base).state;
  return spawned.status === 'game-over' ? spawned : { ...spawned, status: 'ready' };
}

function invalidState(state: GameState): GameTransition {
  if (state.mode === 'endgame') return endgameFailure(state, 'failed-top-out', 'invalid-state');
  return {
    state: { ...state, active: null, status: 'game-over' },
    events: [{ type: 'game-over', reason: 'invalid-state' }],
  };
}

function finishEndgameSuccess(state: GameState): GameTransition {
  const levelId = state.endgameId;
  if (!levelId) return invalidState(state);
  return {
    state: {
      ...state,
      active: null,
      status: 'finished',
      phase: 'active',
      phaseTicks: 0,
      pendingClearRows: [],
      gravityTicks: 0,
      lockTicks: 0,
      lockResets: 0,
      endgameCompletion: 'finished',
      completedLevelId: levelId,
      nextUnlockedLevelId: nextEndgameId(levelId),
    },
    events: [{ type: 'finished', completionTicks: state.elapsedTicks }],
  };
}

/** Endgame-only post-lock resolution after shared merge and ordinary line clearing. */
function resolveEndgameAfterLock(state: GameState, spawnImmediately: boolean): GameTransition {
  if (state.endgameGoal !== 'original-targets-cleared') return invalidState(state);
  if (state.endgameTargetCells.length === 0) return finishEndgameSuccess(state);
  if (spawnImmediately) return spawnPiece(state);
  return {
    state: {
      ...state,
      active: null,
      phase: 'entry',
      phaseTicks: 0,
      gravityTicks: 0,
      lockTicks: 0,
      lockResets: 0,
    },
    events: [],
  };
}

function withActive(state: GameState): state is GameState & { active: ActivePiece } {
  return state.active !== null;
}

function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

function cellsForSurvivalDebris(debris: SurvivalDebris): readonly Cell[] {
  return Object.freeze(Array.from(
    { length: debris.height },
    (_, offset) => ({ x: debris.x, y: debris.y + offset }),
  ));
}

function canPlaceWithSurvivalDebris(
  board: GameState['board'],
  debris: readonly SurvivalDebris[],
  piece: ActivePiece,
): boolean {
  if (!canPlace(board, piece)) return false;
  if (debris.length === 0) return true;
  const occupied = new Set(debris.flatMap(cellsForSurvivalDebris).map(cellKey));
  return cellsForPiece(piece).every((cell) => !occupied.has(cellKey(cell)));
}

function canPlaceInState(state: GameState, piece: ActivePiece): boolean {
  return state.mode === 'race'
    ? canPlaceWithSurvivalDebris(state.board, state.survivalDebris, piece)
    : canPlace(state.board, piece);
}

function activeOverlapsSurvivalDebris(state: GameState, piece = state.active): boolean {
  if (state.mode !== 'race' || piece === null || state.survivalDebris.length === 0) return false;
  const occupied = new Set(state.survivalDebris.flatMap(cellsForSurvivalDebris).map(cellKey));
  return cellsForPiece(piece).some((cell) => occupied.has(cellKey(cell)));
}

/**
 * A moving stone is dynamic support, not settled ground. The ordinary board must
 * still accept the one-cell-lower piece; only an in-flight stone may block it.
 */
function hasFallingSurvivalSupport(state: GameState, piece: ActivePiece): boolean {
  if (
    state.mode !== 'race'
    || state.survivalDebris.length === 0
    || activeOverlapsSurvivalDebris(state, piece)
  ) return false;
  const candidate = { ...piece, y: piece.y + 1 };
  return canPlace(state.board, candidate)
    && !canPlaceWithSurvivalDebris(state.board, state.survivalDebris, candidate);
}

/** A stone about to enter the active piece from above pauses ordinary locking. */
function hasFallingSurvivalPressure(state: GameState, piece: ActivePiece): boolean {
  if (state.mode !== 'race' || state.survivalDebris.length === 0) return false;
  const activeCells = new Set(cellsForPiece(piece).map(cellKey));
  return state.survivalDebris.some((event) => (
    cellsForSurvivalDebris({ ...event, y: event.y + 1 })
      .some((cell) => activeCells.has(cellKey(cell)))
  ));
}

function hasFallingSurvivalContact(state: GameState, piece: ActivePiece): boolean {
  return hasFallingSurvivalSupport(state, piece) || hasFallingSurvivalPressure(state, piece);
}

function isGroundedInState(state: GameState, piece: ActivePiece): boolean {
  if (hasFallingSurvivalContact(state, piece)) return false;
  return !canPlaceInState(state, { ...piece, y: piece.y + 1 });
}

function advanceSurvivalPressure(state: GameState): GameState {
  if (state.mode !== 'race' || state.survivalRisePending) return state;
  const intervalTicks = survivalIntervalTicks(state.lines);
  const survivalPressureTicks = Math.min(intervalTicks, state.survivalPressureTicks + 1);
  return {
    ...state,
    survivalPressureTicks,
    survivalRisePending: survivalPressureTicks >= intervalTicks,
  };
}

function advanceSurvivalDebrisWarning(state: GameState): GameState {
  if (state.mode !== 'race' || state.survivalDebrisWarningTicks <= 0) return state;
  return {
    ...state,
    survivalDebrisWarningTicks: state.survivalDebrisWarningTicks - 1,
  };
}

function planSurvivalDebris(state: GameState, piece: ActivePiece): {
  state: GameState;
  columns: readonly number[];
  height: 1 | 2;
} {
  if (
    state.survivalDebrisWarningColumns.length > 0
    && state.survivalDebrisWarningHeight !== null
  ) {
    return {
      state,
      columns: state.survivalDebrisWarningColumns,
      height: state.survivalDebrisWarningHeight,
    };
  }
  const excludedColumns = new Set(cellsForPiece(piece).map((cell) => cell.x));
  const availableColumns = Array.from(
    { length: BOARD_WIDTH },
    (_, x) => x,
  ).filter((x) => !excludedColumns.has(x));
  const columnRoll = drawRandom(state.survivalDebrisRandomizer);
  const heightRoll = drawRandom(columnRoll.randomizer);
  const chosenColumn = availableColumns[
    Math.min(availableColumns.length - 1, Math.floor(columnRoll.value * availableColumns.length))
  ] ?? 0;
  const frozenColumns = Object.freeze([
    chosenColumn,
  ]);
  const frozenHeight = heightRoll.value < 0.5 ? 1 : 2;

  // The plan deliberately ignores the current stack. If any required entry
  // cell is blocked when due, the same announced column and height wait.
  return {
    state: {
      ...state,
      survivalDebrisWarningColumns: frozenColumns,
      survivalDebrisWarningHeight: frozenHeight,
      survivalDebrisRandomizer: heightRoll.randomizer,
    },
    columns: frozenColumns,
    height: frozenHeight,
  };
}

function spawnSurvivalDebris(state: GameState): { state: GameState; cells: readonly Cell[] } {
  // A rockfall enters as a complete one- or two-cell column. It never starts in
  // the hidden buffer, so the player sees the whole event on its first frame.
  const occupied = new Set<string>(
    state.survivalDebris.flatMap(cellsForSurvivalDebris).map(cellKey),
  );
  const survivalDebris = [...state.survivalDebris];
  const cells: Cell[] = [];
  let survivalDebrisNextId = state.survivalDebrisNextId;

  const x = state.survivalDebrisWarningColumns[0];
  const height = state.survivalDebrisWarningHeight;
  if (x !== undefined && height !== null) {
    const event: SurvivalDebris = {
      id: survivalDebrisNextId,
      x,
      y: VISIBLE_START_ROW,
      height,
    };
    const eventCells = cellsForSurvivalDebris(event);
    const blocked = eventCells.some((cell) => (
      cell.y < 0
      || cell.y >= BOARD_HEIGHT
      || state.board[cell.y]?.[cell.x] !== null
      || occupied.has(cellKey(cell))
    ));
    if (!blocked) {
      survivalDebris.push(event);
      survivalDebrisNextId += 1;
      cells.push(...eventCells);
    }
  }

  return {
    state: {
      ...state,
      survivalDebris: Object.freeze(survivalDebris),
      survivalDebrisNextId,
      survivalDebrisWarningColumns: cells.length > 0
        ? Object.freeze([])
        : state.survivalDebrisWarningColumns,
      survivalDebrisWarningHeight: cells.length > 0
        ? null
        : state.survivalDebrisWarningHeight,
      survivalDebrisWarningTicks: cells.length > 0
        ? 0
        : state.survivalDebrisWarningTicks,
    },
    cells: Object.freeze(cells),
  };
}

interface SurvivalDebrisStep {
  board: GameState['board'];
  active: ActivePiece | null;
  survivalDebris: readonly SurvivalDebris[];
  landed: readonly Cell[];
  movedIds: ReadonlySet<number>;
  pushedActive: boolean;
}

/**
 * Resolves one stone step bottom-up. Existing entry overlap may shrink as the stone
 * moves away. A stone immediately above the active piece may instead translate both
 * bodies by one row as an atomic debris-cadence step.
 */
function resolveSurvivalDebrisStep(state: GameState, active: ActivePiece | null): SurvivalDebrisStep {
  const occupied = new Set(state.survivalDebris.flatMap(cellsForSurvivalDebris).map(cellKey));
  let resolvedActive = active;
  let activeCells = new Set(active ? cellsForPiece(active).map(cellKey) : []);
  const falling = [...state.survivalDebris].sort((left, right) => (
    right.y - left.y || left.x - right.x || left.id - right.id
  ));
  const survivalDebris: SurvivalDebris[] = [];
  const landed: Cell[] = [];
  const movedIds = new Set<number>();
  let pushedActive = false;
  let board = state.board;

  for (const event of falling) {
    const currentCells = cellsForSurvivalDebris(event);
    const currentOverlap = new Set(
      currentCells.map(cellKey).filter((key) => activeCells.has(key)),
    );
    for (const cell of currentCells) occupied.delete(cellKey(cell));

    const movedEvent = { ...event, y: event.y + 1 };
    const movedCells = cellsForSurvivalDebris(movedEvent);
    const environmentAllowsFall = movedCells.every((cell) => (
      cell.y >= 0
      && cell.y < BOARD_HEIGHT
      && board[cell.y]?.[cell.x] === null
      && !occupied.has(cellKey(cell))
    ));
    const movedOverlap = movedCells.map(cellKey).filter((key) => activeCells.has(key));
    const activeAllowsFall = movedOverlap.every((key) => currentOverlap.has(key));

    if (environmentAllowsFall && activeAllowsFall) {
      survivalDebris.push(movedEvent);
      movedIds.add(event.id);
      for (const cell of movedCells) occupied.add(cellKey(cell));
      continue;
    }

    if (
      environmentAllowsFall
      && currentOverlap.size === 0
      && movedOverlap.length > 0
      && resolvedActive !== null
      && !pushedActive
    ) {
      const pushed = { ...resolvedActive, y: resolvedActive.y + 1 };
      const pushedCells = cellsForPiece(pushed);
      const movedCellKeys = new Set(movedCells.map(cellKey));
      const pushIsLegal = canPlace(board, pushed)
        && pushedCells.every((cell) => (
          !occupied.has(cellKey(cell))
          && !movedCellKeys.has(cellKey(cell))
        ));
      if (pushIsLegal) {
        resolvedActive = pushed;
        activeCells = new Set(pushedCells.map(cellKey));
        pushedActive = true;
        survivalDebris.push(movedEvent);
        movedIds.add(event.id);
        for (const cell of movedCells) occupied.add(cellKey(cell));
        continue;
      }
    }

    if (!environmentAllowsFall && currentOverlap.size === 0) {
      for (const cell of currentCells) board = setCell(board, cell.x, cell.y, SURVIVAL_STONE_CELL);
      landed.push(...currentCells);
      continue;
    }

    // The active piece is the only blocker. Keep the event airborne at its exact
    // canonical coordinate so replay/hash order and the next attempted step agree.
    survivalDebris.push(event);
    for (const cell of currentCells) occupied.add(cellKey(cell));
  }

  return {
    board,
    active: resolvedActive,
    survivalDebris: Object.freeze(survivalDebris.sort((left, right) => left.id - right.id)),
    landed: Object.freeze(landed),
    movedIds,
    pushedActive,
  };
}

function settleSurvivalDebris(state: GameState): {
  state: GameState;
  landed: readonly Cell[];
  pushedActive: boolean;
} {
  if (state.mode !== 'race' || state.survivalDebris.length === 0) {
    return { state, landed: Object.freeze([]), pushedActive: false };
  }
  // Support below falls away independently. Pressure above may move both bodies one
  // row, but that debris-cadence push never advances ordinary gravity or lock delay.
  const resolved = resolveSurvivalDebrisStep(state, state.active);

  return {
    state: {
      ...state,
      board: resolved.board,
      active: resolved.active,
      survivalDebris: resolved.survivalDebris,
      gravityTicks: resolved.pushedActive ? 0 : state.gravityTicks,
      lockTicks: resolved.pushedActive ? 0 : state.lockTicks,
    },
    landed: resolved.landed,
    pushedActive: resolved.pushedActive,
  };
}

interface SurvivalDebrisAdvance extends GameTransition {
  startedLineClear: boolean;
  pushedActive: boolean;
}

/** Advances only the independent 7× fixed-tick fall accumulator. */
function advanceSurvivalDebris(state: GameState): SurvivalDebrisAdvance {
  if (state.mode !== 'race') return {
    state,
    events: [],
    startedLineClear: false,
    pushedActive: false,
  };
  let next = state;
  let pushedActive = false;
  const events: GameEvent[] = [];
  const progress = state.survivalDebrisFallProgress + SURVIVAL_DEBRIS_FALL_PROGRESS_PER_TICK;
  if (progress >= SURVIVAL_DEBRIS_FALL_PROGRESS_THRESHOLD) {
    const settled = settleSurvivalDebris(state);
    next = {
      ...settled.state,
      survivalDebrisFallProgress: progress - SURVIVAL_DEBRIS_FALL_PROGRESS_THRESHOLD,
    };
    pushedActive = settled.pushedActive;
    if (settled.landed.length > 0) events.push({ type: 'survival-stones-landed', cells: settled.landed });
  } else {
    next = { ...state, survivalDebrisFallProgress: progress };
  }

  const full = fullRows(next.board);
  const pending = new Set(next.pendingClearRows);
  const newlyFull = full.filter((row) => !pending.has(row));
  if (newlyFull.length === 0) return {
    state: next,
    events,
    startedLineClear: false,
    pushedActive,
  };

  const pendingClearRows = [...pending, ...newlyFull].sort((left, right) => left - right);
  return {
    state: {
      ...next,
      phase: 'line-clear',
      phaseTicks: 0,
      pendingClearRows,
      gravityTicks: 0,
      lockTicks: 0,
    },
    events: [...events, { type: 'clear-started', rows: newlyFull }],
    startedLineClear: state.phase !== 'line-clear',
    pushedActive,
  };
}

function mapSurvivalDebrisAfterClear(board: GameState['board'], rows: readonly number[], debris: readonly SurvivalDebris[]): readonly SurvivalDebris[] {
  return Object.freeze(debris.map((event) => {
    const before = cellsForSurvivalDebris(event);
    const after = mapCellsAfterClear(board, rows, before);
    if (after.length !== before.length) return event;
    const dx = after[0]!.x - before[0]!.x;
    const dy = after[0]!.y - before[0]!.y;
    const rigid = after.every((cell, index) => (
      cell.x - before[index]!.x === dx
      && cell.y - before[index]!.y === dy
    ));
    return rigid ? { ...event, x: event.x + dx, y: event.y + dy } : event;
  }));
}

function mapActiveAfterClear(board: GameState['board'], rows: readonly number[], active: ActivePiece | null): ActivePiece | null {
  if (!active) return null;
  const before = cellsForPiece(active);
  const after = mapCellsAfterClear(board, rows, before);
  if (after.length !== before.length) return active;
  const dx = after[0]!.x - before[0]!.x;
  const dy = after[0]!.y - before[0]!.y;
  return after.every((cell, index) => (
    cell.x - before[index]!.x === dx && cell.y - before[index]!.y === dy
  ))
    ? { ...active, x: active.x + dx, y: active.y + dy }
    : active;
}

function shiftSurvivalMovers(state: GameState, deltaY: number): {
  active: ActivePiece | null;
  survivalDebris: readonly SurvivalDebris[];
  overflow: boolean;
} {
  const active = state.active ? { ...state.active, y: state.active.y + deltaY } : null;
  const survivalDebris = Object.freeze(state.survivalDebris.map((event) => ({ ...event, y: event.y + deltaY })));
  const activeOverflow = active !== null && cellsForPiece(active).some((cell) => cell.y < 0 || cell.y >= BOARD_HEIGHT);
  const debrisOverflow = survivalDebris.some((event) => (
    event.y < 0 || event.y + event.height - 1 >= BOARD_HEIGHT
  ));
  return { active, survivalDebris, overflow: activeOverflow || debrisOverflow };
}

function lowerSurvivalBedrock(state: GameState, count: number): { state: GameState; removed: number } {
  const lowered = lowerBedrock(state.board, count);
  if (lowered.removed === 0) return { state, removed: 0 };
  const movers = shiftSurvivalMovers(state, lowered.removed);
  return {
    state: {
      ...state,
      board: lowered.board,
      active: movers.active,
      survivalDebris: movers.survivalDebris,
      survivalBedrockRows: Math.max(0, state.survivalBedrockRows - lowered.removed),
    },
    removed: lowered.removed,
  };
}

/** Restores and respawns the latest locked Endgame piece from its normal top entry. */
function undoEndgame(state: GameState): GameTransition {
  if (state.mode !== 'endgame' || state.status === 'finished') return { state, events: [] };
  if (state.status !== 'playing' && state.status !== 'paused' && state.status !== 'game-over') return { state, events: [] };
  const checkpoint = state.endgameUndoHistory.at(-1);
  if (!checkpoint) return { state, events: [] };

  const restored: GameState = {
    // Start from the current shape so JSON-backed state hashes retain their
    // canonical property order while checkpoint values replace every field.
    ...state,
    ...checkpoint,
    status: state.status === 'paused' ? 'paused' : 'playing',
    endgameUndoHistory: Object.freeze(state.endgameUndoHistory.slice(0, -1)),
    endgameActiveSpawnCheckpoint: null,
  };
  const respawned = spawnPiece(restored);
  return {
    state: respawned.state,
    events: [...respawned.events, { type: 'endgame-undone' }],
  };
}

/** Creates a self-contained pre-spawn checkpoint without recursively retaining undo state. */
function endgameUndoCheckpoint(state: GameState): EndgameUndoSnapshot {
  const {
    endgameUndoHistory: _endgameUndoHistory,
    endgameActiveSpawnCheckpoint: _endgameActiveSpawnCheckpoint,
    ...checkpoint
  } = state;
  return checkpoint;
}

function appendEndgameUndoCheckpoint(state: GameState, checkpoint: EndgameUndoSnapshot | null): GameState {
  if (checkpoint === null) return state;
  return {
    ...state,
    endgameUndoHistory: Object.freeze([...state.endgameUndoHistory, checkpoint]),
  };
}

interface SurvivalRiseResolution extends GameTransition {
  overflow: boolean;
}

function resolvePendingSurvivalRise(state: GameState, deferOverflow = false): SurvivalRiseResolution {
  if (state.mode !== 'race' || !state.survivalRisePending) return { state, events: [], overflow: false };
  const survivalRiseCount = state.survivalRiseCount + 1;
  const riseRows = survivalRiseCount % SURVIVAL_RISES_PER_AFTERSHOCK === 0 ? 2 : 1;
  const raised = raiseBedrock(state.board, riseRows);
  const movers = shiftSurvivalMovers(state, -raised.added);
  const next: GameState = {
    ...state,
    board: raised.board,
    active: movers.active,
    survivalDebris: movers.survivalDebris,
    survivalBedrockRows: state.survivalBedrockRows + raised.added,
    survivalPressureTicks: 0,
    survivalRisePending: false,
    survivalRiseCount,
  };
  const events: GameEvent[] = raised.added > 0
    ? [{ type: 'bedrock-raised', count: raised.added, height: next.survivalBedrockRows }]
    : [];
  const overflow = raised.overflow || movers.overflow;
  if (!overflow || deferOverflow) return { state: next, events, overflow };
  return {
    state: { ...next, active: null, status: 'game-over', phase: 'active' },
    events: [...events, { type: 'game-over', reason: 'bedrock-overflow' }],
    overflow: true,
  };
}

function moveActive(state: GameState, dx: number, dy: number, cause: 'move' | 'gravity' | 'soft-drop'): GameTransition {
  if (!withActive(state)) return { state, events: [] };
  const candidate = { ...state.active, x: state.active.x + dx, y: state.active.y + dy };
  if (!canPlaceInState(state, candidate)) return { state, events: [] };

  const wasGrounded = isGroundedInState(state, state.active);
  const remainsGrounded = isGroundedInState(state, candidate);
  const canReset = cause === 'move' && wasGrounded && state.lockResets < MAX_LOCK_RESETS;

  return {
    state: {
      ...state,
      active: candidate,
      gravityTicks: dy > 0 ? 0 : state.gravityTicks,
      lockTicks: remainsGrounded ? (canReset ? 0 : state.lockTicks) : 0,
      lockResets: canReset ? state.lockResets + 1 : state.lockResets,
      score: cause === 'soft-drop' ? state.score + 1 : state.score,
    },
    events: [{ type: 'piece-moved', piece: candidate.type, dx, dy, cause }],
  };
}

function mutationScoreMultiplier(state: GameState): number {
  if (state.mode !== 'sprint' || state.mutationMultiplierTicks <= 0) return 1;
  return state.mutationMultiplierFactor === 4 ? 4 : 2;
}

function bottomBombRows(): number[] {
  return Array.from({ length: MUTATION_BOMB_ROWS }, (_, index) => BOARD_HEIGHT - MUTATION_BOMB_ROWS + index);
}

interface MutationActivation {
  state: GameState;
  events: GameEvent[];
}

interface MutationActivationSummary {
  item: MutationItem;
  durationTicks: number;
  score: number;
  rowsRemoved: number;
  triggerCells: Cell[];
  triggerKeys: Set<string>;
  multiplierFactor?: 2 | 4;
  coveredPieces?: number;
}

/**
 * Applies every carrier triggered by one resolved clear. Bombs may remove another
 * carrier, so the deterministic queue handles that finite chain without a second
 * render or browser-timing pass.
 */
function activateMutationCarriers(state: GameState, triggered: readonly MutationCarrier[]): MutationActivation {
  if (state.mode !== 'sprint' || triggered.length === 0) return { state, events: [] };

  let next = state;
  const events: GameEvent[] = [];
  // Bomb owns the first causal beat. Keep the original scan order within each
  // priority so seeded replays remain stable while blast-driven settlement can
  // never appear after a timed-state activation.
  const pending = [...triggered].sort((left, right) => (
    Number(right.item === 'bomb') - Number(left.item === 'bomb')
  ));
  const queued = new Set(triggered.map((carrier) => carrier.id));
  const activated = new Set<number>();
  const activationOrder: MutationItem[] = [];
  const summaries = new Map<MutationItem, MutationActivationSummary>();

  while (pending.length > 0) {
    const carrier = pending.shift();
    if (!carrier || activated.has(carrier.id)) continue;
    activated.add(carrier.id);
    next = {
      ...next,
      mutationCarriers: withoutMutationCarriers(next.mutationCarriers, [carrier]),
    };

    let durationTicks = 0;
    let score = 0;
    let rowsRemoved = 0;
    if (carrier.item === 'freeze') {
      // A fresh carrier never stacks latent play time. The player gets a clear,
      // repeatable ten-second window from the instant this effect resolves.
      durationTicks = MUTATION_EFFECT_TICKS;
      next = { ...next, mutationFreezeTicks: durationTicks };
    } else if (carrier.item === 'collapse') {
      next = { ...next, mutationCollapsePiecesRemaining: MUTATION_SUPERGRAVITY_PIECES };
    } else if (carrier.item === 'multiplier') {
      const wasActive = next.mutationMultiplierTicks > 0;
      durationTicks = MUTATION_EFFECT_TICKS;
      next = {
        ...next,
        mutationMultiplierTicks: durationTicks,
        mutationMultiplierFactor: wasActive ? 4 : 2,
      };
    } else {
      const rows = bottomBombRows();
      const bombTriggered = mutationCarriersClearedByRows(next.mutationCarriers, rows);
      score = MUTATION_BOMB_SCORE * mutationScoreMultiplier(next);
      rowsRemoved = rows.length;
      next = {
        ...next,
        board: clearRows(next.board, rows),
        mutationCarriers: mapMutationCarriersAfterClear(
          next.board,
          rows,
          withoutMutationCarriers(next.mutationCarriers, bombTriggered),
        ),
        score: next.score + score,
        lines: next.lines + rowsRemoved,
      };
      events.push({ type: 'lines-cleared', rows, count: rowsRemoved, score });
      for (const candidate of bombTriggered) {
        if (!activated.has(candidate.id) && !queued.has(candidate.id)) {
          queued.add(candidate.id);
          if (candidate.item === 'bomb') {
            const firstNonBomb = pending.findIndex((queuedCarrier) => queuedCarrier.item !== 'bomb');
            pending.splice(firstNonBomb < 0 ? pending.length : firstNonBomb, 0, candidate);
          } else {
            pending.push(candidate);
          }
        }
      }
    }

    next = {
      ...next,
      mutationLastItem: carrier.item,
      mutationLastItemTicks: durationTicks > 0 ? durationTicks : MUTATION_RESULT_TICKS,
    };
    const multiplierFactor = carrier.item === 'multiplier'
      ? (next.mutationMultiplierFactor === 4 ? 4 : 2)
      : undefined;
    let summary = summaries.get(carrier.item);
    if (!summary) {
      summary = {
        item: carrier.item,
        durationTicks: 0,
        score: 0,
        rowsRemoved: 0,
        triggerCells: [],
        triggerKeys: new Set(),
      };
      summaries.set(carrier.item, summary);
      activationOrder.push(carrier.item);
    }
    if (carrier.item === 'collapse') summary.coveredPieces = MUTATION_SUPERGRAVITY_PIECES;
    summary.durationTicks = Math.max(summary.durationTicks, durationTicks);
    summary.score += score;
    summary.rowsRemoved += rowsRemoved;
    if (multiplierFactor !== undefined) summary.multiplierFactor = multiplierFactor;
    for (const cell of carrier.cells) {
      const key = cellKey(cell);
      if (summary.triggerKeys.has(key)) continue;
      summary.triggerKeys.add(key);
      summary.triggerCells.push(Object.freeze({ ...cell }));
    }
  }

  for (const item of activationOrder) {
    const summary = summaries.get(item)!;
    events.push({
      type: 'mutation-activated',
      item,
      durationTicks: summary.durationTicks,
      score: summary.score,
      rowsRemoved: summary.rowsRemoved,
      triggerCells: Object.freeze(summary.triggerCells),
      ...(summary.multiplierFactor === undefined
        ? {}
        : { multiplierFactor: summary.multiplierFactor }),
      ...(summary.coveredPieces === undefined
        ? {}
        : { coveredPieces: summary.coveredPieces }),
    });
  }
  return { state: next, events };
}

function advanceMutationEffects(state: GameState): GameState {
  if (state.mode !== 'sprint') return state;
  const mutationMultiplierTicks = Math.max(0, state.mutationMultiplierTicks - 1);
  return {
    ...state,
    mutationFreezeTicks: Math.max(0, state.mutationFreezeTicks - 1),
    mutationMultiplierTicks,
    mutationMultiplierFactor: mutationMultiplierTicks > 0 ? state.mutationMultiplierFactor : 1,
    mutationLastItemTicks: Math.max(0, state.mutationLastItemTicks - 1),
  };
}

function endgameAnchorSupportAfterLock(state: GameState, sourceCells: readonly Cell[]): readonly Cell[] {
  if (state.mode !== 'endgame') return state.endgameAnchorSupportedCells;
  const supportedKeys = new Set(state.endgameAnchorSupportedCells.map((cell) => cell.y * BOARD_WIDTH + cell.x));
  const isSupported = sourceCells.some((cell) => {
    const belowY = cell.y + 1;
    return state.board[belowY]?.[cell.x] === ANCHOR_CELL
      || supportedKeys.has(belowY * BOARD_WIDTH + cell.x);
  });
  if (!isSupported) return state.endgameAnchorSupportedCells;
  const appended = sourceCells
    .filter((cell) => !supportedKeys.has(cell.y * BOARD_WIDTH + cell.x))
    .map((cell) => Object.freeze({ ...cell }));
  return Object.freeze([...state.endgameAnchorSupportedCells, ...appended]);
}

function lockActive(
  state: GameState,
  extraEvents: GameEvent[] = [],
): GameTransition {
  if (!withActive(state)) return { state, events: extraEvents };
  if (activeOverlapsSurvivalDebris(state, state.active)) {
    return { state: { ...state, lockTicks: 0 }, events: [] };
  }
  if (hasFallingSurvivalContact(state, state.active)) {
    return { state: { ...state, lockTicks: 0 }, events: extraEvents };
  }
  const undoCheckpoint = state.mode === 'endgame' ? state.endgameActiveSpawnCheckpoint : null;
  const sourceCells = cellsForPiece(state.active);
  if (sourceCells.some((cell) => cell.y < 0 || cell.y >= BOARD_HEIGHT)) return invalidState(state);
  const endgameAnchorSupportedCells = endgameAnchorSupportAfterLock(state, sourceCells);
  let board: GameState['board'];
  const pieceCount = state.pieceCount + 1;
  let settledCells = sourceCells;
  if (activeUsesSupergravityLanding(state)) {
    const settlement = settleSupergravityPiece(state.board, sourceCells, state.active.type);
    board = settlement.board;
    settledCells = settlement.cells;
  } else {
    board = mergePiece(state.board, state.active);
  }
  let mutationCarriers = state.mutationCarriers;
  if (state.mode === 'sprint' && state.mutationActiveCarrier !== null) {
    mutationCarriers = Object.freeze([
      ...mutationCarriers,
      {
        id: state.mutationActiveCarrier.id,
        item: state.mutationActiveCarrier.item,
        cells: Object.freeze(settledCells.map((cell) => ({ ...cell }))),
      },
    ]);
  }
  const lockedEvent: GameEvent = {
    type: 'piece-locked',
    piece: state.active.type,
    cells: settledCells,
  };
  const lockedState: GameState = {
    ...state,
    board,
    active: null,
    pieceCount,
    survivalDebrisPiecesRemaining: state.mode === 'race'
      ? Math.max(0, state.survivalDebrisPiecesRemaining - 1)
      : state.survivalDebrisPiecesRemaining,
    mutationActiveCarrier: null,
    mutationCarriers,
    mutationCollapseLandingLatched: false,
    endgameAnchorSupportedCells,
    endgameActiveSpawnCheckpoint: null,
  };
  const rows = fullRows(board);
  const lockOut = settledCells.every((cell) => cell.y < VISIBLE_START_ROW) && rows.length === 0;

  if (lockOut) {
    if (state.mode === 'endgame') {
      const failed = endgameFailure(lockedState, 'failed-top-out', 'lock-out');
      return {
        state: appendEndgameUndoCheckpoint(failed.state, undoCheckpoint),
        events: [...extraEvents, lockedEvent, ...failed.events],
      };
    }
    return {
      state: { ...lockedState, status: 'game-over', combo: 0 },
      events: [...extraEvents, lockedEvent, { type: 'game-over', reason: 'lock-out' }],
    };
  }

  if (rows.length > 0) {
    const clearing: GameState = {
      ...lockedState,
      phase: 'line-clear',
      phaseTicks: 0,
      pendingClearRows: rows,
      gravityTicks: 0,
      lockTicks: 0,
    };
    return {
      state: appendEndgameUndoCheckpoint(clearing, undoCheckpoint),
      events: [...extraEvents, lockedEvent, { type: 'clear-started', rows }],
    };
  }

  if (state.mode === 'sprint') {
    return {
      state: {
        ...lockedState,
        phase: 'entry',
        phaseTicks: 0,
        gravityTicks: 0,
        lockTicks: 0,
        lockResets: 0,
        combo: 0,
      },
      events: [...extraEvents, lockedEvent],
    };
  }

  if (state.mode === 'endgame') {
    const resolved = resolveEndgameAfterLock({
      ...lockedState,
      phase: 'active',
      phaseTicks: 0,
      pendingClearRows: [],
      gravityTicks: 0,
      lockTicks: 0,
      lockResets: 0,
      combo: 0,
    }, false);
    return {
      state: appendEndgameUndoCheckpoint(resolved.state, undoCheckpoint),
      events: [...extraEvents, lockedEvent, ...resolved.events],
    };
  }

  if (state.mode === 'race') {
    const resolved = resolvePendingSurvivalRise({
      ...lockedState,
      phase: 'active',
      phaseTicks: 0,
      pendingClearRows: [],
      gravityTicks: 0,
      lockTicks: 0,
      lockResets: 0,
      combo: 0,
    });
    if (resolved.state.status === 'game-over') {
      return { state: resolved.state, events: [...extraEvents, lockedEvent, ...resolved.events] };
    }
    return {
      state: { ...resolved.state, phase: 'entry' },
      events: [...extraEvents, lockedEvent, ...resolved.events],
    };
  }

  return {
    state: {
      ...lockedState,
      phase: 'entry',
      phaseTicks: 0,
      gravityTicks: 0,
      lockTicks: 0,
      combo: 0,
    },
    events: [...extraEvents, lockedEvent],
  };
}

function hardDrop(state: GameState): GameTransition {
  if (!withActive(state)) return { state, events: [] };
  if (activeOverlapsSurvivalDebris(state, state.active)) return { state, events: [] };
  let distance = 0;
  let candidate = state.active;
  while (canPlaceInState(state, { ...candidate, y: candidate.y + 1 })) {
    candidate = { ...candidate, y: candidate.y + 1 };
    distance += 1;
  }
  const next = { ...state, active: candidate, score: state.score + distance * 2 };
  if (hasFallingSurvivalContact(next, candidate)) {
    return {
      state: { ...next, gravityTicks: 0, lockTicks: 0 },
      events: [{ type: 'piece-moved', piece: candidate.type, dx: 0, dy: distance, cause: 'hard-drop' }],
    };
  }
  return lockActive(next, [{ type: 'hard-dropped', piece: candidate.type, distance }]);
}

function rotate(state: GameState, direction: -1 | 1): GameTransition {
  if (!withActive(state)) return { state, events: [] };
  const target = nextRotation(state.active.rotation, direction);
  const wasGrounded = isGroundedInState(state, state.active);
  for (const kick of kickTests(state.active, target)) {
    const candidate: ActivePiece = {
      ...state.active,
      rotation: target,
      x: state.active.x + kick.x,
      y: state.active.y + kick.y,
    };
    if (!canPlaceInState(state, candidate)) continue;
    const remainsGrounded = isGroundedInState(state, candidate);
    const canReset = wasGrounded && state.lockResets < MAX_LOCK_RESETS;
    return {
      state: {
        ...state,
        active: candidate,
        lockTicks: remainsGrounded ? (canReset ? 0 : state.lockTicks) : 0,
        lockResets: canReset ? state.lockResets + 1 : state.lockResets,
      },
      events: [{ type: 'piece-rotated', piece: candidate.type, direction }],
    };
  }
  return { state, events: [] };
}

function finishLineClear(state: GameState): GameTransition {
  const rows = [...state.pendingClearRows];
  const count = rows.length;
  const lines = state.lines + count;
  const combo = state.mode === 'marathon' ? state.combo + 1 : 0;
  const comboBonus = state.mode === 'marathon' ? 50 * Math.max(0, combo - 1) : 0;
  const level = state.mode === 'endgame' ? Math.floor(lines / 10) : 0;
  const baseScore = LINE_CLEAR_BASE_SCORE[count] ?? 0;
  const clearScore = state.mode === 'endgame'
    ? baseScore * (level + 1)
    : state.mode === 'sprint'
      ? baseScore * mutationScoreMultiplier(state)
      : baseScore + comboBonus;
  const triggeredCarriers = state.mode === 'sprint'
    ? mutationCarriersClearedByRows(state.mutationCarriers, rows)
    : Object.freeze([]);
  const activeAfterClear = state.mode === 'race'
    ? mapActiveAfterClear(state.board, rows, state.active)
    : state.active;
  const debrisAfterClear = state.mode === 'race'
    ? mapSurvivalDebrisAfterClear(state.board, rows, state.survivalDebris)
    : state.survivalDebris;
  let cleared: GameState = {
    ...state,
    board: clearRows(state.board, rows, state.endgameAnchorSupportedCells),
    active: activeAfterClear,
    survivalDebris: debrisAfterClear,
    endgameTargetCells: state.mode === 'endgame'
      ? mapCellsAfterClear(state.board, rows, state.endgameTargetCells, state.endgameAnchorSupportedCells)
      : state.endgameTargetCells,
    endgameAnchorSupportedCells: state.mode === 'endgame'
      ? mapCellsAfterClear(
        state.board,
        rows,
        state.endgameAnchorSupportedCells,
        state.endgameAnchorSupportedCells,
      )
      : state.endgameAnchorSupportedCells,
    mutationCarriers: state.mode === 'sprint'
      ? mapMutationCarriersAfterClear(
        state.board,
        rows,
        withoutMutationCarriers(state.mutationCarriers, triggeredCarriers),
      )
      : state.mutationCarriers,
    score: state.score + clearScore,
    lines,
    combo,
    level,
    pendingClearRows: [],
    phaseTicks: 0,
  };
  const events: GameEvent[] = [{ type: 'lines-cleared', rows, count, score: clearScore }];
  if (state.mode === 'endgame' && level > state.level) events.push({ type: 'level-up', level });
  if (cleared.mode === 'endgame') {
    const resolved = resolveEndgameAfterLock(cleared, true);
    return { state: resolved.state, events: [...events, ...resolved.events] };
  }
  if (cleared.mode === 'sprint') {
    const activated = activateMutationCarriers(cleared, triggeredCarriers);
    const spawned = spawnPiece(activated.state);
    return { state: spawned.state, events: [...events, ...activated.events, ...spawned.events] };
  }
  if (cleared.mode === 'race') {
    const risen = resolvePendingSurvivalRise(cleared, true);
    cleared = risen.state;
    events.push(...risen.events);

    const crossedRewardThresholds = Math.floor(lines / SURVIVAL_LINES_PER_BEDROCK)
      - Math.floor(state.lines / SURVIVAL_LINES_PER_BEDROCK);
    if (crossedRewardThresholds > 0) {
      const lowered = lowerSurvivalBedrock(cleared, crossedRewardThresholds);
      cleared = {
        ...lowered.state,
        survivalPressureTicks: 0,
        survivalRisePending: false,
      };
      if (lowered.removed > 0) {
        events.push({ type: 'bedrock-lowered', count: lowered.removed, height: cleared.survivalBedrockRows });
      }
    }
    if (risen.overflow && crossedRewardThresholds === 0) {
      return {
        state: { ...cleared, active: null, status: 'game-over', phase: 'active' },
        events: [...events, { type: 'game-over', reason: 'bedrock-overflow' }],
      };
    }
    if (cleared.active !== null) {
      return {
        state: {
          ...cleared,
          phase: 'active',
          phaseTicks: 0,
          gravityTicks: 0,
          lockTicks: 0,
          lockResets: 0,
        },
        events,
      };
    }
  }
  const spawned = spawnPiece(cleared);
  return { state: spawned.state, events: [...events, ...spawned.events] };
}

function tick(state: GameState): GameTransition {
  if (state.status !== 'playing') return { state, events: [] };
  const freezeGravityActive = state.mode === 'sprint' && state.mutationFreezeTicks > 0;
  const debris = advanceSurvivalDebris(
    advanceSurvivalDebrisWarning(
      advanceMutationEffects(advanceSurvivalPressure({ ...state, elapsedTicks: state.elapsedTicks + 1 })),
    ),
  );
  let next: GameState = debris.state;
  const timedEvents: GameEvent[] = [...debris.events];

  // A stone-created row receives a full visible clear interval before its first
  // countdown tick, matching a player-created clear rather than skipping the cue.
  if (debris.startedLineClear) return { state: next, events: timedEvents };
  if (debris.pushedActive && next.phase === 'active') {
    return { state: next, events: timedEvents };
  }

  if (next.phase === 'entry') {
    const phaseTicks = next.phaseTicks + 1;
    if (phaseTicks >= ENTRY_DELAY_TICKS) {
      if (
        next.mode === 'race'
        && next.survivalDebrisPiecesRemaining <= 0
        && next.survivalDebrisWarningColumns.length > 0
        && next.survivalDebrisWarningTicks > 0
      ) {
        return {
          state: { ...next, phaseTicks: ENTRY_DELAY_TICKS },
          events: timedEvents,
        };
      }
      const resolved = resolvePendingSurvivalRise({ ...next, phaseTicks: 0 });
      if (resolved.state.status === 'game-over') return { state: resolved.state, events: [...timedEvents, ...resolved.events] };
      const spawned = spawnPiece(resolved.state);
      return { state: spawned.state, events: [...timedEvents, ...resolved.events, ...spawned.events] };
    }
    return { state: { ...next, phaseTicks }, events: timedEvents };
  }

  if (next.phase === 'line-clear') {
    const phaseTicks = next.phaseTicks + 1;
    if (phaseTicks >= LINE_CLEAR_DELAY_TICKS) {
      const finished = finishLineClear(next);
      return { state: finished.state, events: [...timedEvents, ...finished.events] };
    }
    return { state: { ...next, phaseTicks }, events: timedEvents };
  }

  if (!withActive(next)) {
    const invalid = invalidState(next);
    return { state: invalid.state, events: [...timedEvents, ...invalid.events] };
  }

  if (isGroundedInState(next, next.active)) {
    next = { ...next, lockTicks: next.lockTicks + 1 };
    if (next.lockTicks >= LOCK_DELAY_TICKS) {
      const locked = lockActive(next);
      return { state: locked.state, events: [...timedEvents, ...locked.events] };
    }
  } else if (next.lockTicks !== 0) {
    next = { ...next, lockTicks: 0 };
  }

  const gravityTicks = next.gravityTicks + 1;
  const gravityInterval = freezeGravityActive
    ? MUTATION_FREEZE_GRAVITY_TICKS
    : gravityForMode(
      next.mode,
      next.level,
      next.pieceCount,
      next.lines,
      next.classicStartingGravityTicks,
      next.classicGravityFloorTicks,
    );
  if (gravityTicks >= gravityInterval) {
    const moved = moveActive({ ...next, gravityTicks: 0 }, 0, 1, 'gravity');
    return { state: moved.state, events: [...timedEvents, ...moved.events] };
  }
  return { state: { ...next, gravityTicks }, events: timedEvents };
}

export function dispatch(state: GameState, command: GameCommand): GameTransition {
  if (command.type === 'restart') {
    return {
      state: createInitialState(
        command.seed ?? state.seed,
        command.mode ?? state.mode,
        command.endgameId ?? state.endgameId ?? undefined,
        command.classicStartingGravityTicks ?? state.classicStartingGravityTicks,
        command.classicGravityFloorTicks ?? state.classicGravityFloorTicks,
      ),
      events: [{ type: 'restarted' }],
    };
  }
  if (command.type === 'start' && state.status === 'ready') {
    return { state: { ...state, status: 'playing' }, events: [{ type: 'started' }] };
  }
  if (command.type === 'pause' && state.status === 'playing') {
    return { state: { ...state, status: 'paused' }, events: [{ type: 'paused' }] };
  }
  if (command.type === 'resume' && state.status === 'paused') {
    return { state: { ...state, status: 'playing' }, events: [{ type: 'resumed' }] };
  }
  if (command.type === 'undo') return undoEndgame(state);
  if (command.type === 'tick') return tick(state);
  if (state.status !== 'playing' || state.phase !== 'active') return { state, events: [] };

  switch (command.type) {
    case 'move':
      return moveActive(state, command.dx, 0, 'move');
    case 'soft-drop':
      return moveActive(state, 0, 1, 'soft-drop');
    case 'hard-drop':
      return hardDrop(state);
    case 'rotate':
      return rotate(state, command.direction);
    default:
      return { state, events: [] };
  }
}

export function dropDistance(state: GameState): number {
  if (!withActive(state)) return 0;
  let distance = 0;
  while (canPlaceInState(state, { ...state.active, y: state.active.y + distance + 1 })) distance += 1;
  return distance;
}

export function replay(
  seed: number,
  commands: readonly GameCommand[],
  mode: GameMode = 'marathon',
  endgameId?: EndgameId,
  classicStartingGravityTicks = CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
  classicGravityFloorTicks = CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
): GameState {
  return commands.reduce(
    (state, command) => dispatch(state, command).state,
    createInitialState(seed, mode, endgameId, classicStartingGravityTicks, classicGravityFloorTicks),
  );
}

export function stateHash(state: GameState): string {
  // Mode-private fields stay out of unrelated replays so the established Classic,
  // Survival, and Endgame hash domains remain stable. 异变 keeps its item/timer state
  // in its own canonical payload because that state changes legal future play.
  const canonicalState = state.mode === 'endgame'
    ? (() => {
      const {
        combo: _combo,
        classicStartingGravityTicks: _classicStartingGravityTicks,
        classicGravityFloorTicks: _classicGravityFloorTicks,
        survivalBedrockRows: _survivalBedrockRows,
        survivalPressureTicks: _survivalPressureTicks,
        survivalRisePending: _survivalRisePending,
        survivalRiseCount: _survivalRiseCount,
        survivalDebris: _survivalDebris,
        survivalDebrisNextId: _survivalDebrisNextId,
        survivalDebrisPiecesRemaining: _survivalDebrisPiecesRemaining,
        survivalDebrisPieceInterval: _survivalDebrisPieceInterval,
        survivalDebrisSpawnCount: _survivalDebrisSpawnCount,
        survivalDebrisWarningColumns: _survivalDebrisWarningColumns,
        survivalDebrisWarningHeight: _survivalDebrisWarningHeight,
        survivalDebrisWarningTicks: _survivalDebrisWarningTicks,
        survivalDebrisFallProgress: _survivalDebrisFallProgress,
        survivalDebrisRandomizer: _survivalDebrisRandomizer,
        mutationActiveCarrier: _mutationActiveCarrier,
        mutationRandomizer: _mutationRandomizer,
        mutationCarriers: _mutationCarriers,
        mutationNextCarrierId: _mutationNextCarrierId,
        mutationFreezeTicks: _mutationFreezeTicks,
        mutationCollapsePiecesRemaining: _mutationCollapsePiecesRemaining,
        mutationCollapseLandingLatched: _mutationCollapseLandingLatched,
        mutationMultiplierTicks: _mutationMultiplierTicks,
        mutationMultiplierFactor: _mutationMultiplierFactor,
        mutationLastItem: _mutationLastItem,
        mutationLastItemTicks: _mutationLastItemTicks,
        endgameUndoHistory: _endgameUndoHistory,
        endgameActiveSpawnCheckpoint: _endgameActiveSpawnCheckpoint,
        ...endgameState
      } = state;
      return endgameState;
    })()
    : (() => {
      const {
        endgameBoardRows: _endgameBoardRows,
        endgameTargetCells: _endgameTargetCells,
        endgameInitialTargetCount: _endgameInitialTargetCount,
        endgameAnchorSupportedCells: _endgameAnchorSupportedCells,
        endgameQueue: _endgameQueue,
        endgameQueueIndex: _endgameQueueIndex,
        endgameSpawnCount: _endgameSpawnCount,
        endgameGoal: _endgameGoal,
        endgameCompletion: _endgameCompletion,
        endgameUndoHistory: _endgameUndoHistory,
        endgameActiveSpawnCheckpoint: _endgameActiveSpawnCheckpoint,
        completedLevelId: _completedLevelId,
        nextUnlockedLevelId: _nextUnlockedLevelId,
        ...legacyState
      } = state;
      if (state.mode === 'marathon') {
        const {
          survivalBedrockRows: _survivalBedrockRows,
          survivalPressureTicks: _survivalPressureTicks,
          survivalRisePending: _survivalRisePending,
          survivalRiseCount: _survivalRiseCount,
          survivalDebris: _survivalDebris,
          survivalDebrisNextId: _survivalDebrisNextId,
          survivalDebrisPiecesRemaining: _survivalDebrisPiecesRemaining,
          survivalDebrisPieceInterval: _survivalDebrisPieceInterval,
          survivalDebrisSpawnCount: _survivalDebrisSpawnCount,
          survivalDebrisWarningColumns: _survivalDebrisWarningColumns,
          survivalDebrisWarningHeight: _survivalDebrisWarningHeight,
          survivalDebrisWarningTicks: _survivalDebrisWarningTicks,
          survivalDebrisFallProgress: _survivalDebrisFallProgress,
          survivalDebrisRandomizer: _survivalDebrisRandomizer,
          mutationActiveCarrier: _mutationActiveCarrier,
          mutationRandomizer: _mutationRandomizer,
          mutationCarriers: _mutationCarriers,
          mutationNextCarrierId: _mutationNextCarrierId,
          mutationFreezeTicks: _mutationFreezeTicks,
          mutationCollapsePiecesRemaining: _mutationCollapsePiecesRemaining,
          mutationCollapseLandingLatched: _mutationCollapseLandingLatched,
          mutationMultiplierTicks: _mutationMultiplierTicks,
          mutationMultiplierFactor: _mutationMultiplierFactor,
          mutationLastItem: _mutationLastItem,
          mutationLastItemTicks: _mutationLastItemTicks,
          ...classicState
        } = legacyState;
        return classicState;
      }
      if (state.mode === 'sprint') {
        const {
          combo: _combo,
          classicStartingGravityTicks: _classicStartingGravityTicks,
          classicGravityFloorTicks: _classicGravityFloorTicks,
          survivalBedrockRows: _survivalBedrockRows,
          survivalPressureTicks: _survivalPressureTicks,
          survivalRisePending: _survivalRisePending,
          survivalRiseCount: _survivalRiseCount,
          survivalDebris: _survivalDebris,
          survivalDebrisNextId: _survivalDebrisNextId,
          survivalDebrisPiecesRemaining: _survivalDebrisPiecesRemaining,
          survivalDebrisPieceInterval: _survivalDebrisPieceInterval,
          survivalDebrisSpawnCount: _survivalDebrisSpawnCount,
          survivalDebrisWarningColumns: _survivalDebrisWarningColumns,
          survivalDebrisWarningHeight: _survivalDebrisWarningHeight,
          survivalDebrisWarningTicks: _survivalDebrisWarningTicks,
          survivalDebrisFallProgress: _survivalDebrisFallProgress,
          survivalDebrisRandomizer: _survivalDebrisRandomizer,
          ...sprintState
        } = legacyState;
        return sprintState;
      }
      const {
        combo: _combo,
        classicStartingGravityTicks: _classicStartingGravityTicks,
        classicGravityFloorTicks: _classicGravityFloorTicks,
        mutationActiveCarrier: _mutationActiveCarrier,
        mutationRandomizer: _mutationRandomizer,
        mutationCarriers: _mutationCarriers,
        mutationNextCarrierId: _mutationNextCarrierId,
        mutationFreezeTicks: _mutationFreezeTicks,
        mutationCollapsePiecesRemaining: _mutationCollapsePiecesRemaining,
        mutationCollapseLandingLatched: _mutationCollapseLandingLatched,
        mutationMultiplierTicks: _mutationMultiplierTicks,
        mutationMultiplierFactor: _mutationMultiplierFactor,
        mutationLastItem: _mutationLastItem,
        mutationLastItemTicks: _mutationLastItemTicks,
        ...survivalState
      } = legacyState;
      return survivalState;
    })();
  const canonical = JSON.stringify(canonicalState);
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
