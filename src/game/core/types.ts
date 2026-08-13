export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;

export type PieceType = (typeof PIECE_TYPES)[number];
export const BEDROCK_CELL = 'B' as const;
export type BedrockCell = typeof BEDROCK_CELL;
/** A clearable Survival stone settled by the independent falling-stone stream. */
export const SURVIVAL_STONE_CELL = 'R' as const;
export type SurvivalStoneCell = typeof SURVIVAL_STONE_CELL;
export const ANCHOR_CELL = 'A' as const;
export type AnchorCell = typeof ANCHOR_CELL;
export type BoardMaterial = PieceType | BedrockCell | SurvivalStoneCell | AnchorCell;
export type Rotation = 0 | 1 | 2 | 3;

export interface Cell {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: PieceType;
  rotation: Rotation;
  x: number;
  y: number;
}

export type BoardCell = BoardMaterial | null;
export type Board = BoardCell[][];

export interface RandomizerState {
  seed: number;
  bag: PieceType[];
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'game-over' | 'finished';
export type GamePhase = 'active' | 'entry' | 'line-clear';
export type GameMode = 'marathon' | 'race' | 'sprint' | 'endgame';
export type EndgameId =
  | 't3r-shaft-01'
  | 't3r-shaft-02'
  | 't3r-shaft-03'
  | 't3r-shaft-04'
  | 't3r-cascade-05'
  | 't3r-cascade-06'
  | 't5r-delta-07'
  | 't5r-drift-08'
  | 't5r-lattice-09'
  | 't5r-rift-10'
  | 't5r-prism-11'
  | 't5r-current-12'
  | 't5r-arc-13'
  | 't5r-pulse-14'
  | 't5r-horizon-15'
  | 't6r-veil-16'
  | 't6r-cairn-17'
  | 't6r-terrace-18'
  | 't6r-bastion-19'
  | 't6r-keystone-20'
  | 'tm-endgame-21'
  | 'tm-endgame-22'
  | 'tm-endgame-23'
  | 'tm-endgame-24'
  | 'tm-endgame-25'
  | 'tm-endgame-26'
  | 'tm-endgame-27'
  | 'tm-endgame-28'
  | 'tm-endgame-29'
  | 'tm-endgame-30'
  | 'tm-endgame-31'
  | 'tm-endgame-32'
  | 'tm-endgame-33'
  | 'tm-endgame-34'
  | 'tm-endgame-35'
  | 'tm-endgame-36'
  | 'tm-endgame-37'
  | 'tm-endgame-38'
  | 'tm-endgame-39'
  | 'tm-endgame-40'
  | 'tm-endgame-41'
  | 'tm-endgame-42'
  | 'tm-endgame-43'
  | 'tm-endgame-44'
  | 'tm-endgame-45'
  | 'tm-endgame-46'
  | 'tm-endgame-47'
  | 'tm-endgame-48'
  | 'tm-endgame-49'
  | 'tm-endgame-50';

export type EndgameGoal = 'original-targets-cleared';
export type EndgameCompletion =
  | 'active'
  | 'finished'
  | 'failed-top-out'
  /** @deprecated Compatibility-only; the normal-play Endgame engine never emits this. */
  | 'failed-invalid-spawn';

export type MutationItem = 'freeze' | 'collapse' | 'bomb' | 'multiplier';
export type MutationBombOutcome = 'blast' | 'chain-clear';

/** One incoming carrier is represented once, even though all four locked cells carry it. */
export interface MutationCarrier {
  id: number;
  item: MutationItem;
  cells: readonly Cell[];
}

/** The carrier attached to the currently falling tetromino, before it reaches the board. */
export interface MutationActiveCarrier {
  id: number;
  item: MutationItem;
}

export type SurvivalDebrisHeight = 1 | 2;

/**
 * One independently falling Survival rock event before it settles into the board.
 * `y` is the upper cell. Height-two events add one cell at exactly `y + 1`.
 */
export interface SurvivalDebris {
  id: number;
  x: number;
  y: number;
  height: SurvivalDebrisHeight;
}

export interface GameState {
  board: Board;
  active: ActivePiece | null;
  queue: PieceType[];
  score: number;
  lines: number;
  combo: number;
  level: number;
  mode: GameMode;
  /** Classic-only opening gravity captured when this run is created. */
  classicStartingGravityTicks: number;
  /** Classic-only fastest gravity captured when this run is created. */
  classicGravityFloorTicks: number;
  endgameId: EndgameId | null;
  /**
   * Temporary presentation bridge for the frozen T2 shell. Endgame core rules
   * never read this field: T11 success is exclusively original-targets-cleared.
   * @deprecated Remove when the presentation shell consumes endgameGoal.
   */
  endgameTargetLines: number | null;
  /** Original authored cells still awaiting an ordinary line clear. */
  endgameTargetCells: readonly Cell[];
  /** Stable original-target count used for the player-facing progress display. */
  endgameInitialTargetCount: number;
  /** Exact settled Endgame cells whose placements are physically supported by anchors. */
  endgameAnchorSupportedCells: readonly Cell[];
  /** Immutable authored visible board source; the mutable canonical board is above. */
  endgameBoardRows: readonly string[] | null;
  /**
   * @deprecated Generated-preview bridge for the blocked renderer only. It mirrors
   * the shared queue and is never read by generation or terminal rules.
   */
  endgameQueue: readonly PieceType[] | null;
  /** @deprecated Generated-preview bridge index; always zero. Use pieceCount for placed pieces. */
  endgameQueueIndex: number;
  /** Number of seeded Endgame pieces that have entered the board, including the active piece. */
  endgameSpawnCount: number;
  endgameGoal: EndgameGoal | null;
  endgameCompletion: EndgameCompletion | null;
  /**
   * Endgame-only, run-local pre-spawn checkpoints for pieces that have already locked.
   * Snapshots intentionally omit both undo fields so history cannot recurse.
   */
  endgameUndoHistory: readonly EndgameUndoSnapshot[];
  /** Pre-spawn checkpoint for the active Endgame piece; promoted into history on lock. */
  endgameActiveSpawnCheckpoint: EndgameUndoSnapshot | null;
  completedLevelId: EndgameId | null;
  /** @deprecated Navigation/progress bridge only; T5 level availability is always unrestricted. */
  nextUnlockedLevelId: EndgameId | null;
  pieceCount: number;
  survivalBedrockRows: number;
  /** Playing ticks consumed in the current Survival pressure interval. */
  survivalPressureTicks: number;
  /** A due pressure row waiting for the next safe lock/clear resolution. */
  survivalRisePending: boolean;
  /** Resolved natural pressure rises; every fourth produces a two-row Aftershock. */
  survivalRiseCount: number;
  /** Independently falling, clearable stones that have not reached the board yet. */
  survivalDebris: readonly SurvivalDebris[];
  /** Stable identity for a new falling stone; useful for deterministic presentation. */
  survivalDebrisNextId: number;
  /** Player pieces still to lock before rockfall accompanies the following spawn. */
  survivalDebrisPiecesRemaining: number;
  /** Current lock interval: starts at 8 pieces and floors at 4. */
  survivalDebrisPieceInterval: number;
  /** Completed rockfall events; every fourth event shortens the interval by one. */
  survivalDebrisSpawnCount: number;
  /** The single canonical column announced before the next one-or-two-stone event. */
  survivalDebrisWarningColumns: readonly number[];
  /** Frozen height announced with the warning column; null when no event is planned. */
  survivalDebrisWarningHeight: SurvivalDebrisHeight | null;
  /** Unconsumed playing ticks from the deterministic 800 ms warning floor. */
  survivalDebrisWarningTicks: number;
  /** Exact integer accumulator that advances the event at 7× Survival gravity. */
  survivalDebrisFallProgress: number;
  /** Separate deterministic stream so debris timing never changes the seven-bag. */
  survivalDebrisRandomizer: RandomizerState;
  /** A random, deterministic item identity attached to the active fourth-mode piece. */
  mutationActiveCarrier: MutationActiveCarrier | null;
  /** Separate deterministic stream so item attachments never perturb the seven-bag. */
  mutationRandomizer: RandomizerState;
  /** Locked carrier metadata follows line clears and temporary column settling. */
  mutationCarriers: readonly MutationCarrier[];
  /** Monotonic local identity used to make every carrier activate once. */
  mutationNextCarrierId: number;
  /** Remaining game-time ticks for Ice. */
  mutationFreezeTicks: number;
  /** Future tetromino spawns that will claim Supergravity; refreshed to five. */
  mutationCollapsePiecesRemaining: number;
  /**
   * Supergravity settlement belongs to the piece that claimed one coverage unit when
   * it spawned. The future quota may reach zero, but cannot change that piece's lock.
   */
  mutationCollapseLandingLatched: boolean;
  mutationMultiplierTicks: number;
  /** Current score factor for an active Multiplier item; returns to one at expiry. */
  mutationMultiplierFactor: 1 | 2 | 4;
  /** Brief UI-facing report of the most recently activated item. */
  mutationLastItem: MutationItem | null;
  mutationLastItemTicks: number;
  status: GameStatus;
  phase: GamePhase;
  phaseTicks: number;
  pendingClearRows: number[];
  gravityTicks: number;
  /** Fixed-point remainder in [0, 9], active only for Classic and Mutation gravity. */
  gravitySubtickRemainder: number;
  lockTicks: number;
  lockResets: number;
  elapsedTicks: number;
  randomizer: RandomizerState;
  seed: number;
}

/** A nonrecursive Endgame checkpoint containing all canonical state except its own undo state. */
export type EndgameUndoSnapshot = Omit<GameState, 'endgameUndoHistory' | 'endgameActiveSpawnCheckpoint'>;

export type GameCommand =
  | { type: 'start' }
  | { type: 'tick' }
  | { type: 'move'; dx: -1 | 1 }
  | { type: 'soft-drop' }
  | { type: 'hard-drop' }
  | { type: 'rotate'; direction: -1 | 1 }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'undo' }
  | {
    type: 'restart';
    seed?: number;
    mode?: GameMode;
    endgameId?: EndgameId;
    classicStartingGravityTicks?: number;
    classicGravityFloorTicks?: number;
  };

interface MutationActivationEventBase {
  type: 'mutation-activated';
  durationTicks: number;
  score: number;
  rowsRemoved: number;
  /** Immutable pre-clear carrier geometry for bounded renderer/audio anchoring. */
  triggerCells?: readonly Cell[];
  /** Present for a Multiplier trigger: 2 for Double, 4 for Super Double. */
  multiplierFactor?: 2 | 4;
  /** Present for Supergravity: number of future tetrominoes covered by this award. */
  coveredPieces?: number;
}

export type MutationActivationEvent =
  | (MutationActivationEventBase & {
    item: Exclude<MutationItem, 'bomb'>;
    bombOutcome?: never;
    blastRows?: never;
    participatingBombCount?: never;
    chainOriginCarrierId?: never;
    chainOriginCells?: never;
    chainTriggerRows?: never;
  })
  | (MutationActivationEventBase & {
    item: 'bomb';
    bombOutcome: 'blast';
    blastRows: readonly number[];
    participatingBombCount: number;
    chainOriginCarrierId?: never;
    chainOriginCells?: never;
    chainTriggerRows?: never;
  })
  | (MutationActivationEventBase & {
    item: 'bomb';
    bombOutcome: 'chain-clear';
    blastRows: readonly number[];
    participatingBombCount: number;
    chainOriginCarrierId: number;
    chainOriginCells: readonly Cell[];
    /** Frozen, sorted pre-clear ordinary full rows that caused this chain. */
    readonly chainTriggerRows: readonly number[];
  });

export type GameEvent =
  | { type: 'started' }
  | { type: 'restarted' }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'piece-moved'; piece: PieceType; dx: number; dy: number; cause: 'move' | 'gravity' | 'soft-drop' | 'hard-drop' }
  | { type: 'piece-rotated'; piece: PieceType; direction: -1 | 1 }
  | { type: 'hard-dropped'; piece: PieceType; distance: number }
  | { type: 'piece-locked'; piece: PieceType; cells: Cell[] }
  | { type: 'endgame-undone' }
  | {
    type: 'clear-started';
    rows: number[];
    /** Pre-clear Bomb plan so presentation can suppress feedback that cannot be recalled. */
    mutationBombOutcome?: MutationBombOutcome;
  }
  | { type: 'lines-cleared'; rows: number[]; count: number; score: number }
  | MutationActivationEvent
  | { type: 'bedrock-raised'; count: number; height: number }
  | { type: 'bedrock-lowered'; count: number; height: number }
  | {
    type: 'survival-stones-warned';
    columns: readonly number[];
    height: SurvivalDebrisHeight;
    leadPieces: number;
  }
  | {
    type: 'survival-stones-spawned';
    cells: readonly Cell[];
    intervalPieces: number;
    nextIntervalPieces: number;
  }
  | { type: 'survival-stones-landed'; cells: readonly Cell[] }
  | { type: 'level-up'; level: number }
  | { type: 'finished'; completionTicks: number }
  | { type: 'game-over'; reason: 'block-out' | 'lock-out' | 'bedrock-overflow' | 'endgame-invalid-spawn' | 'invalid-state' };

export interface GameTransition {
  state: GameState;
  events: GameEvent[];
}
