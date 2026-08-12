import type { PuzzleDefinition } from './puzzles';

const INTRO_01: PuzzleDefinition = Object.freeze({
  id: 't3r-shaft-01',
  name: '补行',
  difficulty: 1,
  targetRows: 3,
  seed: 1212,
  setup: Object.freeze({
    seed: 2080886771,
    placements: Object.freeze([
      Object.freeze({ type: 'J', rotation: 0, x: 4 }),
      Object.freeze({ type: 'Z', rotation: 0, x: 6 }),
      Object.freeze({ type: 'T', rotation: 2, x: 4 }),
      Object.freeze({ type: 'O', rotation: 0, x: 1 }),
      Object.freeze({ type: 'I', rotation: 0, x: 0 }),
      Object.freeze({ type: 'S', rotation: 1, x: 7 }),
    ]),
  }),
  boardRows: Object.freeze([
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    'IIIITTT.S.',
    '.OO.JTZZSS',
    '.OO.JJJZZS',
  ]),
  hiddenCells: Object.freeze([]),
  anchorCells: Object.freeze([]),
});

export const PUZZLE_V3_INTRO_DRAFTS: readonly PuzzleDefinition[] = Object.freeze([INTRO_01]);
