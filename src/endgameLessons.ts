import type { EndgameId } from './game/core';

/** Authored concepts shown before play. These are principles, never solver output. */
export type EndgameTechnique =
  | 'complete-row'
  | 'preserve-well'
  | 'build-support'
  | 'avoid-hole'
  | 'read-queue'
  | 'retain-opening'
  | 'edge-to-centre'
  | 'split-lanes'
  | 'choose-gate'
  | 'anchor-side-slip'
  | 'clear-order';

export type EndgameLesson = Readonly<{
  levelId: EndgameId;
  technique: EndgameTechnique;
  stage: 'foundation' | 'anchor';
}>;

/**
 * Intro establishes transferable decisions. Lesson slots remain authored coaching;
 * only independently verified certificates may later unlock matching Hard boards.
 */
export const ENDGAME_LESSONS: readonly EndgameLesson[] = Object.freeze([
  Object.freeze({ levelId: 't3r-shaft-01', technique: 'complete-row', stage: 'foundation' }),
  Object.freeze({ levelId: 't3r-shaft-02', technique: 'preserve-well', stage: 'foundation' }),
  Object.freeze({ levelId: 't3r-shaft-03', technique: 'build-support', stage: 'foundation' }),
  Object.freeze({ levelId: 't3r-cascade-06', technique: 'retain-opening', stage: 'foundation' }),
  Object.freeze({ levelId: 't3r-shaft-04', technique: 'read-queue', stage: 'foundation' }),
  Object.freeze({ levelId: 't3r-cascade-05', technique: 'avoid-hole', stage: 'foundation' }),
  Object.freeze({ levelId: 't5r-delta-07', technique: 'edge-to-centre', stage: 'foundation' }),
  Object.freeze({ levelId: 't5r-lattice-09', technique: 'split-lanes', stage: 'foundation' }),
  Object.freeze({ levelId: 't5r-rift-10', technique: 'choose-gate', stage: 'foundation' }),
  Object.freeze({ levelId: 't5r-drift-08', technique: 'anchor-side-slip', stage: 'anchor' }),
  Object.freeze({ levelId: 't5r-horizon-15', technique: 'preserve-well', stage: 'foundation' }),
  Object.freeze({ levelId: 't6r-terrace-18', technique: 'clear-order', stage: 'foundation' }),
  Object.freeze({ levelId: 't6r-keystone-20', technique: 'build-support', stage: 'foundation' }),
]);

const LESSON_BY_LEVEL = new Map<EndgameId, EndgameLesson>(
  ENDGAME_LESSONS.map((lesson) => [lesson.levelId, lesson]),
);

export function endgameLessonFor(levelId: EndgameId): EndgameLesson | null {
  return LESSON_BY_LEVEL.get(levelId) ?? null;
}
