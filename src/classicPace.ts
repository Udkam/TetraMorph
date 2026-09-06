import {
  CLASSIC_GRAVITY_CHOICES_TICKS,
  CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
  CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
  normalizeClassicGravityFloorTicks,
  normalizeClassicStartingGravityTicks,
} from './game/core/constants';

export const CLASSIC_PACE_IDS = ['calm', 'relaxed', 'standard', 'swift', 'expert'] as const;

export type ClassicPaceId = typeof CLASSIC_PACE_IDS[number];

export type ClassicPace = Readonly<{
  id: ClassicPaceId;
  startingTicks: number;
  floorTicks: number;
}>;

export const DEFAULT_CLASSIC_PACE_ID: ClassicPaceId = 'standard';

export const CLASSIC_PACES: readonly ClassicPace[] = Object.freeze([
  Object.freeze({ id: 'calm', startingTicks: 60, floorTicks: 18 }),
  Object.freeze({ id: 'relaxed', startingTicks: 48, floorTicks: 12 }),
  Object.freeze({ id: 'standard', startingTicks: 36, floorTicks: 4.8 }),
  Object.freeze({ id: 'swift', startingTicks: 24, floorTicks: 4.8 }),
  Object.freeze({ id: 'expert', startingTicks: 12, floorTicks: 4.8 }),
]);

const PACE_BY_ID = new Map<ClassicPaceId, ClassicPace>(CLASSIC_PACES.map((pace) => [pace.id, pace]));

function choiceIndex(ticks: number): number {
  const normalized = normalizeClassicStartingGravityTicks(ticks);
  return CLASSIC_GRAVITY_CHOICES_TICKS.findIndex((choice) => choice === normalized);
}

/**
 * Resolves an old arbitrary pair to the closest current preset. Equal Manhattan distances
 * deliberately prefer the slower preset, first by opening cadence and then by floor cadence.
 */
export function classicPaceForGravityRange(startingTicks: number, floorTicks: number): ClassicPace {
  const normalizedStarting = normalizeClassicStartingGravityTicks(startingTicks);
  const normalizedFloor = normalizeClassicGravityFloorTicks(floorTicks, normalizedStarting);
  const startingIndex = choiceIndex(normalizedStarting);
  const floorIndex = choiceIndex(normalizedFloor);
  return CLASSIC_PACES.reduce((best, candidate) => {
    const bestDistance = Math.abs(choiceIndex(best.startingTicks) - startingIndex)
      + Math.abs(choiceIndex(best.floorTicks) - floorIndex);
    const candidateDistance = Math.abs(choiceIndex(candidate.startingTicks) - startingIndex)
      + Math.abs(choiceIndex(candidate.floorTicks) - floorIndex);
    if (candidateDistance !== bestDistance) return candidateDistance < bestDistance ? candidate : best;
    const candidateStart = choiceIndex(candidate.startingTicks);
    const bestStart = choiceIndex(best.startingTicks);
    if (candidateStart !== bestStart) return candidateStart < bestStart ? candidate : best;
    return choiceIndex(candidate.floorTicks) < choiceIndex(best.floorTicks) ? candidate : best;
  });
}

export function classicPaceForId(id: ClassicPaceId): ClassicPace {
  return PACE_BY_ID.get(id) ?? PACE_BY_ID.get(DEFAULT_CLASSIC_PACE_ID)!;
}

export function isClassicPaceId(value: unknown): value is ClassicPaceId {
  return CLASSIC_PACE_IDS.includes(value as ClassicPaceId);
}

export function defaultClassicPace(): ClassicPace {
  const pace = classicPaceForId(DEFAULT_CLASSIC_PACE_ID);
  if (
    pace.startingTicks !== CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS
    || pace.floorTicks !== CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS
  ) {
    throw new Error('Classic default pace must remain the canonical Standard 0.60-to-0.08 range.');
  }
  return pace;
}
