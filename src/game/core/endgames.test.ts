import { describe, expect, it } from 'vitest';
import { VISIBLE_HEIGHT, VISIBLE_START_ROW } from './constants';
import { createInitialState, dispatch, stateHash } from './engine';
import {
  ENDGAME_DEFINITIONS,
  createEndgameBoard,
  getEndgameDefinition,
  originalTargetCells,
  replayEndgameSetup,
  validateEndgameDefinition,
  type EndgameDefinition,
  type EndgameSetupHistory,
} from './endgames';
import { endgameLandings } from './endgameRouteSearch';
import { createRandomizer, drawPiece } from './random';
import { ANCHOR_CELL, PIECE_TYPES, type PieceType, type EndgameId } from './types';

function invalid(definition: EndgameDefinition, patch: Partial<EndgameDefinition>): EndgameDefinition {
  return { ...definition, ...patch };
}

function occupiedCount(definition: EndgameDefinition): number {
  return definition.boardRows.join('').replaceAll('.', '').length;
}

function generatedPieces(seed: number, count: number): PieceType[] {
  let randomizer = createRandomizer(seed);
  const pieces: PieceType[] = [];
  for (let index = 0; index < count; index += 1) {
    const draw = drawPiece(randomizer);
    pieces.push(draw.piece);
    randomizer = draw.randomizer;
  }
  return pieces;
}

function visibleBoardRows(definition: EndgameDefinition): string[] {
  const rows = definition.boardRows.map((row) => [...row]);
  for (const anchor of definition.anchorCells) rows[anchor.y]![anchor.x] = ANCHOR_CELL;
  return rows.map((row) => row.join(''));
}

function initialLandingSignatures(definition: EndgameDefinition, includeAnchors: boolean): string[] {
  let state = dispatch(createInitialState(0x51a1f00d, 'endgame', definition.id), { type: 'start' }).state;
  if (!includeAnchors) state = { ...state, board: createEndgameBoard(definition, false) };
  return endgameLandings(state).map(({ lock }) => lock.signature).sort();
}

const F3A_MIN_SETUP: EndgameSetupHistory = {
  seed: 2,
  placements: [
    { type: 'J', rotation: 2, x: 3 },
    { type: 'S', rotation: 0, x: 3 },
    { type: 'O', rotation: 2, x: 5 },
    { type: 'L', rotation: 0, x: 3 },
    { type: 'Z', rotation: 2, x: 4 },
  ],
};

const F3A_MAX_SETUP: EndgameSetupHistory = {
  seed: 4101007,
  placements: [
    { type: 'O', rotation: 2, x: 1 },
    { type: 'I', rotation: 0, x: 4 },
    { type: 'J', rotation: 1, x: -1 },
    { type: 'Z', rotation: 3, x: 8 },
    { type: 'L', rotation: 0, x: 3 },
    { type: 'T', rotation: 2, x: 6 },
    { type: 'S', rotation: 2, x: 3 },
    { type: 'T', rotation: 2, x: 2 },
    { type: 'O', rotation: 2, x: 0 },
    { type: 'S', rotation: 2, x: 7 },
    { type: 'Z', rotation: 0, x: 4 },
    { type: 'I', rotation: 2, x: 6 },
    { type: 'J', rotation: 2, x: 0 },
    { type: 'L', rotation: 2, x: 3 },
    { type: 'T', rotation: 3, x: 5 },
    { type: 'L', rotation: 1, x: -1 },
    { type: 'S', rotation: 1, x: 0 },
    { type: 'Z', rotation: 1, x: 3 },
    { type: 'J', rotation: 1, x: 2 },
    { type: 'O', rotation: 0, x: 7 },
  ],
};

function authoringDefinition(
  setup: EndgameSetupHistory,
  targetRows: number,
  anchorCells: EndgameDefinition['anchorCells'] = [],
): EndgameDefinition {
  const source = getEndgameDefinition('t3r-shaft-01');
  const boardRows = replayEndgameSetup(setup).slice(VISIBLE_START_ROW)
    .map((row) => row.map((cell) => cell ?? '.').join(''));
  return invalid(source, {
    name: 'F3A authoring fixture',
    seed: source.seed + 1,
    targetRows,
    setup,
    boardRows,
    anchorCells,
  });
}

describe('T13 legal endgame workshop definitions', () => {
  it('keeps all stable IDs while applying the teaching-first visible order', () => {
    expect(ENDGAME_DEFINITIONS.map(({ id }) => id)).toEqual([
      't3r-shaft-01', 't3r-shaft-02', 't3r-shaft-03', 't3r-cascade-06', 't3r-shaft-04',
      't3r-cascade-05', 't5r-delta-07', 't5r-lattice-09', 't5r-rift-10', 't5r-drift-08',
      't5r-pulse-14', 't5r-arc-13', 't5r-current-12', 't5r-prism-11', 't5r-horizon-15',
      't6r-cairn-17', 't6r-terrace-18', 't6r-keystone-20', 't6r-bastion-19', 't6r-veil-16',
      'tm-endgame-21', 'tm-endgame-22', 'tm-endgame-23', 'tm-endgame-24', 'tm-endgame-25',
      'tm-endgame-26', 'tm-endgame-27', 'tm-endgame-28', 'tm-endgame-29', 'tm-endgame-30',
      'tm-endgame-31', 'tm-endgame-32', 'tm-endgame-33', 'tm-endgame-34', 'tm-endgame-35',
      'tm-endgame-36', 'tm-endgame-37', 'tm-endgame-38', 'tm-endgame-39', 'tm-endgame-40',
      'tm-endgame-41', 'tm-endgame-42', 'tm-endgame-43', 'tm-endgame-44', 'tm-endgame-45',
      'tm-endgame-46', 'tm-endgame-47', 'tm-endgame-48', 'tm-endgame-49', 'tm-endgame-50',
    ] satisfies EndgameId[]);
    expect(ENDGAME_DEFINITIONS.map(({ difficulty }) => difficulty)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    expect(new Set(ENDGAME_DEFINITIONS.map(({ id }) => id)).size).toBe(50);
    expect(new Set(ENDGAME_DEFINITIONS.map(({ name }) => name)).size).toBe(50);
    expect(ENDGAME_DEFINITIONS.map(({ name }) => name)).toEqual([
      '补行', '留井', '托台', '留口', '后手', '避坑', '归心', '分流', '择门', '侧隙',
      '平台', '塔基', '留槽', '侧门', '双井', '回填', '侧台', '横桥', '窄门', '交汇',
      '门柱', '回廊', '中柱', '斜坡', '夹井', '错台', '缓坡', '侧桥', '双层', '断台',
      '曲井', '左闸', '错桥', '阶井', '悬台', '斜阶', '双廊', '层塔', '边塔', '折桥',
      '横沟', '中阶', '分廊', '双塔', '斜廊', '边井', '悬廊', '断槽', '叠井', '岔口',
    ]);
    expect(new Set(ENDGAME_DEFINITIONS.map(({ seed }) => seed)).size).toBe(50);
    expect(new Set(ENDGAME_DEFINITIONS.map(({ boardRows, anchorCells }) => JSON.stringify({
      boardRows,
      anchorCells,
    }))).size).toBe(50);
    expect(ENDGAME_DEFINITIONS.filter((definition) => definition.anchorCells.length > 0).map(({ id }) => id)).toEqual([
      't5r-drift-08', 't5r-pulse-14', 't6r-cairn-17',
      'tm-endgame-22', 'tm-endgame-26', 'tm-endgame-27',
      'tm-endgame-32', 'tm-endgame-39',
    ] satisfies EndgameId[]);
  });

  it('derives each authored row count from a legal zero-clear hard-drop history', () => {
    expect(ENDGAME_DEFINITIONS.map(({ targetRows }) => targetRows)).toEqual([
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
      5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
      6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
      7, 7, 7, 7, 7, 6, 7, 6, 6, 6,
    ]);

    for (const definition of ENDGAME_DEFINITIONS) {
      expect(() => validateEndgameDefinition(definition), definition.id).not.toThrow();
      expect(definition.boardRows).toHaveLength(VISIBLE_HEIGHT);
      expect(definition.hiddenCells).toEqual([]);
      expect(definition.setup.placements.length, definition.id).toBeGreaterThanOrEqual(5);
      expect(definition.setup.placements.length, definition.id).toBeLessThanOrEqual(15);
      expect(occupiedCount(definition), definition.id).toBe(definition.setup.placements.length * 4);
      expect(createEndgameBoard(definition, false), definition.id).toEqual(replayEndgameSetup(definition.setup));

      const occupiedRows = definition.boardRows
        .map((row, y) => row === '.'.repeat(10) ? null : y)
        .filter((y): y is number => y !== null);
      expect(occupiedRows, definition.id).toHaveLength(definition.targetRows);
      expect(occupiedRows, definition.id).toEqual(
        Array.from({ length: occupiedRows.length }, (_, index) => VISIBLE_HEIGHT - occupiedRows.length + index),
      );
      for (const row of definition.boardRows) {
        expect(row).toHaveLength(10);
        expect([...row].every((cell) => cell === '.' || PIECE_TYPES.includes(cell as PieceType))).toBe(true);
        if (row !== '..........') expect([...row]).toContain('.');
      }
      for (const anchor of definition.anchorCells) {
        const targetStart = VISIBLE_HEIGHT - definition.targetRows;
        expect(anchor.y, definition.id).toBeGreaterThanOrEqual(Math.max(0, targetStart - 2));
        expect(anchor.y, definition.id).toBeLessThan(targetStart);
        expect(definition.boardRows[anchor.y]?.[anchor.x], definition.id).toBe('.');
      }
    }
  });

  it('keeps the three rebuilt hard silhouettes exact after public-Core setup replay', () => {
    const occupiedSilhouette = (id: EndgameId): string[] => getEndgameDefinition(id).boardRows
      .slice(-getEndgameDefinition(id).targetRows)
      .map((row) => row.replace(/[IJLOSTZ]/g, '#'));

    expect(occupiedSilhouette('tm-endgame-36')).toEqual([
      '##........',
      '####......',
      '######....',
      '########..',
      '########..',
      '########..',
    ]);
    expect(occupiedSilhouette('tm-endgame-38')).toEqual([
      '...####...',
      '..######..',
      '..######..',
      '.########.',
      '.########.',
      '.########.',
    ]);
    expect(occupiedSilhouette('tm-endgame-47')).toEqual([
      '###....###',
      '###....###',
      '###....###',
      '##......##',
      '###....###',
      '###....###',
      '###....###',
    ]);
  });

  it('starts every selected level from the exact derived board and a stable seven-bag', () => {
    for (const definition of ENDGAME_DEFINITIONS) {
      const ready = createInitialState(0x51a1f00d, 'endgame', definition.id);
      expect(ready.status, definition.id).toBe('ready');
      expect(ready.seed, definition.id).toBe(definition.seed);
      expect(ready.endgameGoal, definition.id).toBe('original-targets-cleared');
      expect(ready.endgameInitialTargetCount, definition.id).toBe(occupiedCount(definition));
      expect(ready.endgameTargetCells, definition.id).toEqual(originalTargetCells(definition));
      expect(ready.board.slice(0, VISIBLE_START_ROW).flat(), definition.id).toEqual(
        Array.from({ length: VISIBLE_START_ROW * 10 }, () => null),
      );
      expect(ready.board.slice(VISIBLE_START_ROW).map((row) => row.map((cell) => cell ?? '.').join('')), definition.id)
        .toEqual(visibleBoardRows(definition));
      expect(ready.board.flat().filter((cell) => cell === ANCHOR_CELL), definition.id)
        .toHaveLength(definition.anchorCells.length);
      for (const anchor of definition.anchorCells) {
        expect(ready.board[VISIBLE_START_ROW + anchor.y]?.[anchor.x], definition.id).toBe(ANCHOR_CELL);
        expect(ready.endgameTargetCells.some((target) => target.x === anchor.x && target.y === VISIBLE_START_ROW + anchor.y), definition.id)
          .toBe(false);
      }

      const firstEightyFour = generatedPieces(definition.seed, 84);
      for (let bag = 0; bag < 12; bag += 1) {
        expect(new Set(firstEightyFour.slice(bag * 7, bag * 7 + 7)), definition.id).toEqual(new Set(PIECE_TYPES));
      }
    }
  });

  it('keeps every curated anchor in headroom and proves it changes a legal landing without covering a target', () => {
    for (const definition of ENDGAME_DEFINITIONS.filter((level) => level.anchorCells.length > 0)) {
      const anchoredLandings = initialLandingSignatures(definition, true);
      const anchorFreeLandings = initialLandingSignatures(definition, false);
      expect(anchoredLandings, definition.id).not.toEqual(anchorFreeLandings);
      for (const anchor of definition.anchorCells) {
        expect(definition.boardRows[anchor.y]?.[anchor.x], definition.id).toBe('.');
      }
    }
  });

  it('rejects mutated seeds, histories, rows, hidden cells, and invalid anchors', () => {
    const first = getEndgameDefinition('t3r-shaft-01');
    expect(() => validateEndgameDefinition(invalid(first, { seed: 0 }))).toThrow(/seed/i);
    const authoringOverride = invalid(first, { seed: first.seed + 1, name: 'authoring override' });
    expect(() => validateEndgameDefinition(authoringOverride, false)).not.toThrow();
    expect(() => validateEndgameDefinition(invalid(authoringOverride, {
      boardRows: first.boardRows.slice(1),
    }), false)).toThrow(/exactly/i);
    expect(() => validateEndgameDefinition(invalid(first, { seed: getEndgameDefinition('t3r-shaft-02').seed }))).toThrow(/stable level seed/i);
    expect(() => validateEndgameDefinition(invalid(first, { difficulty: 20 }))).toThrow(/difficulty/i);
    expect(() => validateEndgameDefinition(invalid(first, { targetRows: 4 }))).toThrow(/target-row/i);
    expect(() => validateEndgameDefinition(invalid(first, { name: 'other' }))).toThrow(/name/i);
    expect(() => validateEndgameDefinition(invalid(first, { boardRows: first.boardRows.slice(1) }))).toThrow(/exactly/i);
    expect(() => validateEndgameDefinition(invalid(first, {
      boardRows: [...first.boardRows.slice(0, 19), 'IIIIIIIIII'],
    }))).toThrow(/derived/i);
    expect(() => validateEndgameDefinition(invalid(first, {
      setup: { ...first.setup, seed: first.setup.seed + 1 },
    }))).toThrow(/setup history/i);
    expect(() => validateEndgameDefinition(invalid(first, { hiddenCells: [{ x: 0, y: 0, type: 'J' }] }))).toThrow(/hidden buffer/i);
    expect(() => validateEndgameDefinition(invalid(first, { anchorCells: [{ x: 0, y: 19 }] }))).toThrow(/anchor/i);
    expect(() => validateEndgameDefinition(invalid(first, { anchorCells: [{ x: 3, y: 16 }, { x: 3, y: 16 }] }))).toThrow(/duplicate/i);
  });

  it('admits the F3A setup and target-row boundaries without changing canonical definitions', () => {
    const canonical = getEndgameDefinition('t3r-shaft-01');
    const threeRows = invalid(canonical, {
      name: 'F3A three-row authoring fixture',
      seed: canonical.seed + 1,
    });
    const minimum = authoringDefinition(F3A_MIN_SETUP, 10);
    const maximum = authoringDefinition(F3A_MAX_SETUP, 10);

    expect(threeRows.targetRows).toBe(3);
    expect(minimum.setup.placements).toHaveLength(5);
    expect(maximum.setup.placements).toHaveLength(20);
    expect(minimum.boardRows.filter((row) => row !== '..........')).toHaveLength(10);
    expect(maximum.boardRows.filter((row) => row !== '..........')).toHaveLength(10);
    expect(() => validateEndgameDefinition(threeRows, false)).not.toThrow();
    expect(() => validateEndgameDefinition(minimum, false)).not.toThrow();
    expect(() => validateEndgameDefinition(maximum, false)).not.toThrow();
    expect(() => validateEndgameDefinition(invalid(minimum, { targetRows: 2 }), false)).toThrow(/target-row/i);
    expect(() => validateEndgameDefinition(invalid(maximum, { targetRows: 11 }), false)).toThrow(/target-row/i);
    expect(() => replayEndgameSetup({ ...F3A_MIN_SETUP, placements: F3A_MIN_SETUP.placements.slice(0, 4) }))
      .toThrow(/five through twenty/i);
    expect(() => replayEndgameSetup({
      ...F3A_MAX_SETUP,
      placements: [...F3A_MAX_SETUP.placements, F3A_MAX_SETUP.placements[0]!],
    })).toThrow(/five through twenty/i);
  });

  it('admits four unique anchors only inside empty cells of the bottom twelve visible rows', () => {
    const base = authoringDefinition(F3A_MAX_SETUP, 10);
    const fourAnchors = invalid(base, {
      anchorCells: [{ x: 0, y: 8 }, { x: 9, y: 8 }, { x: 0, y: 9 }, { x: 9, y: 19 }],
    });

    expect(base.boardRows[19]?.[9]).toBe('.');
    expect(() => validateEndgameDefinition(fourAnchors, false)).not.toThrow();
    expect(() => validateEndgameDefinition(invalid(fourAnchors, {
      anchorCells: [...fourAnchors.anchorCells, { x: 1, y: 8 }],
    }), false)).toThrow(/zero through four/i);
    const malformedAnchors: unknown[] = [
      { x: -1, y: 8 },
      { x: 10, y: 8 },
      { x: 0, y: -1 },
      { x: 0, y: 7 },
      { x: 0, y: 20 },
      { x: 0.5, y: 8 },
      { x: 0, y: Number.NaN },
      { y: 8 },
      null,
    ];
    for (const anchor of malformedAnchors) {
      expect(() => validateEndgameDefinition(invalid(base, {
        anchorCells: [anchor] as unknown as EndgameDefinition['anchorCells'],
      }), false)).toThrow(/anchor/i);
    }
    expect(() => validateEndgameDefinition(invalid(base, {
      anchorCells: null as unknown as EndgameDefinition['anchorCells'],
    }), false)).toThrow(/anchor/i);
    expect(() => validateEndgameDefinition(invalid(base, { anchorCells: [{ x: 0, y: 8 }, { x: 0, y: 8 }] }), false))
      .toThrow(/duplicate/i);
    expect(base.boardRows[10]?.[0]).not.toBe('.');
    expect(() => validateEndgameDefinition(invalid(base, { anchorCells: [{ x: 0, y: 10 }] }), false))
      .toThrow(/target cell/i);
  });

  it('rejects ordinary cells plus an anchor that complete an initial row in both validation modes', () => {
    const canonical = getEndgameDefinition('t3r-shaft-01');
    expect(canonical.boardRows[18]).toBe('OOSSLJJJT.');
    const completedByAnchor = invalid(canonical, { anchorCells: [{ x: 9, y: 18 }] });

    expect(() => validateEndgameDefinition(completedByAnchor)).toThrow(/initially full visible row/i);
    expect(() => validateEndgameDefinition(completedByAnchor, false)).toThrow(/initially full visible row/i);
  });

  it('restarts a level with the exact same derived board, target ownership, queue, and hash', () => {
    const initial = createInitialState(0x51a1f00d, 'endgame', 't3r-shaft-01');
    let changed = dispatch(initial, { type: 'start' }).state;
    changed = dispatch(changed, { type: 'move', dx: -1 }).state;
    changed = dispatch(changed, { type: 'hard-drop' }).state;
    const restarted = dispatch(changed, { type: 'restart', seed: 123, mode: 'endgame', endgameId: 't3r-shaft-01' }).state;

    expect(restarted).toEqual(initial);
    expect(stateHash(restarted)).toBe(stateHash(initial));
    expect(createEndgameBoard(getEndgameDefinition('t3r-shaft-01'))).toEqual(initial.board);
  });
});
