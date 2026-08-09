import { mapCellsAfterClear } from './board';
import type { Board, Cell, GameState, MutationCarrier } from './types';

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
