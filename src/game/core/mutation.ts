import { BOARD_HEIGHT } from './constants';
import { mapCellsAfterClear } from './board';
import type { Board, Cell, GameState, MutationCarrier } from './types';

export interface MutationBombPlan {
  outcome: 'blast' | 'chain-clear';
  blastRows: readonly number[];
  removalRows: readonly number[];
  progressRows: readonly number[];
  participantBombs: readonly MutationCarrier[];
  activatedNonBombs: readonly MutationCarrier[];
  chainOriginCarrierId?: number;
  chainOriginCells?: readonly Cell[];
}

/**
 * Supergravity is granted to a piece exactly once when that piece spawns.
 * Once granted, its landing rule survives future-quota changes until it locks.
 */
export function activeUsesSupergravityLanding(
  state: Pick<
    GameState,
    'mode' | 'active' | 'mutationCollapseLandingLatched'
  >,
): boolean {
  return state.mode === 'sprint'
    && state.active !== null
    && state.mutationCollapseLandingLatched;
}

function sameCell(first: Cell, second: Cell): boolean {
  return first.x === second.x && first.y === second.y;
}

/**
 * Trigger resolution happens after the board has settled, so keep a private copy of
 * the pre-clear carrier. In particular, an all-cell clear must not erase the item
 * before the activation queue reads it.
 */
function snapshotCarrier(carrier: MutationCarrier): MutationCarrier {
  return Object.freeze({
    id: carrier.id,
    item: carrier.item,
    cells: Object.freeze(carrier.cells.map((cell) => Object.freeze({ ...cell }))),
  });
}

function sortedRows(rows: Iterable<number>): readonly number[] {
  return Object.freeze([...new Set(rows)].sort((left, right) => left - right));
}

function carriersTouchedByRows(
  carriers: readonly MutationCarrier[],
  rows: ReadonlySet<number>,
): readonly MutationCarrier[] {
  return Object.freeze(carriers
    .filter((carrier) => carrier.cells.some((cell) => rows.has(cell.y)))
    .sort((left, right) => left.id - right.id)
    .map(snapshotCarrier));
}

/**
 * Plans one Bomb settlement from immutable pre-clear coordinates. No board or carrier
 * mapping may happen before this function has captured every causal identity.
 */
export function planMutationBombClear(
  board: Board,
  carriers: readonly MutationCarrier[],
  ordinaryRows: readonly number[],
): MutationBombPlan | null {
  const ordinary = new Set(ordinaryRows);
  const bombs = carriers
    .filter((carrier) => carrier.item === 'bomb')
    .sort((left, right) => left.id - right.id);
  const primary = bombs.filter((carrier) => carrier.cells.some((cell) => ordinary.has(cell.y)));
  if (primary.length === 0) return null;

  const primaryBands = primary.map((carrier) => {
    const rows = new Set<number>();
    for (const cell of carrier.cells) {
      if (!ordinary.has(cell.y)) continue;
      for (let row = cell.y - 1; row <= cell.y + 1; row += 1) {
        if (row >= 0 && row < BOARD_HEIGHT) rows.add(row);
      }
    }
    return { carrier, rows };
  });
  const blastRows = sortedRows(primaryBands.flatMap(({ rows }) => [...rows]));
  const directHitIds = new Set<number>();
  for (const { carrier, rows } of primaryBands) {
    for (const candidate of bombs) {
      if (candidate.id === carrier.id) continue;
      if (candidate.cells.some((cell) => rows.has(cell.y))) directHitIds.add(candidate.id);
    }
  }

  const outcome = directHitIds.size > 0 ? 'chain-clear' : 'blast';
  const participantBombs = outcome === 'chain-clear'
    ? bombs.map(snapshotCarrier)
    : bombs
      .filter((carrier) => primary.some(({ id }) => id === carrier.id) || directHitIds.has(carrier.id))
      .map(snapshotCarrier);
  const removalRows = outcome === 'chain-clear'
    ? Object.freeze(Array.from({ length: BOARD_HEIGHT }, (_, row) => row))
    : sortedRows([...ordinaryRows, ...blastRows]);
  const progressRows = Object.freeze(removalRows.filter((row) => board[row]?.some((cell) => cell !== null)));
  const activationRows = new Set(removalRows);
  const activatedNonBombs = outcome === 'chain-clear'
    ? carriers
      .filter((carrier) => carrier.item !== 'bomb')
      .sort((left, right) => left.id - right.id)
      .map(snapshotCarrier)
    : carriersTouchedByRows(
      carriers.filter((carrier) => carrier.item !== 'bomb'),
      activationRows,
    );
  const origin = primary[0]!;

  return Object.freeze({
    outcome,
    blastRows,
    removalRows,
    progressRows,
    participantBombs: Object.freeze(participantBombs),
    activatedNonBombs: Object.freeze(activatedNonBombs),
    ...(outcome === 'chain-clear'
      ? {
        chainOriginCarrierId: origin.id,
        chainOriginCells: snapshotCarrier(origin).cells,
      }
      : {}),
  });
}

/** Returns every carrier touched by an actually removed row, at most once each. */
export function mutationCarriersClearedByRows(
  carriers: readonly MutationCarrier[],
  rows: readonly number[],
): readonly MutationCarrier[] {
  const removed = new Set(rows);
  return Object.freeze(carriers
    .filter((carrier) => carrier.cells.some((cell) => removed.has(cell.y)))
    .map(snapshotCarrier));
}

/** Removes triggered identities wholesale so their remaining sibling cells cannot fire again. */
export function withoutMutationCarriers(
  carriers: readonly MutationCarrier[],
  removed: readonly MutationCarrier[],
): readonly MutationCarrier[] {
  if (removed.length === 0) return carriers;
  const ids = new Set(removed.map((carrier) => carrier.id));
  return Object.freeze(carriers.filter((carrier) => !ids.has(carrier.id)));
}

/** Keeps untriggered carrier identities aligned with ordinary full-row settling. */
export function mapMutationCarriersAfterClear(
  board: Board,
  rows: readonly number[],
  carriers: readonly MutationCarrier[],
): readonly MutationCarrier[] {
  return Object.freeze(carriers.map((carrier) => ({
    ...carrier,
    cells: Object.freeze(mapCellsAfterClear(board, rows, carrier.cells)),
  })).filter((carrier) => carrier.cells.length > 0));
}

/** Assertion helper kept local to protect against accidental duplicated core marks. */
export function carrierContainsCell(carrier: MutationCarrier, cell: Cell): boolean {
  return carrier.cells.some((candidate) => sameCell(candidate, cell));
}
