import { describe, expect, it } from 'vitest';
import {
  ENDGAME_DEFINITIONS,
  type EndgameDefinition,
  type EndgameSetupPlacement,
} from './endgames';
import {
  auditEndgameFingerprints,
  compareEndgameTopologies,
  createEndgameExactFingerprint,
  createEndgameTopologyFingerprint,
  createEndgameTopologyProfile,
} from './endgameFingerprints';
import type { EndgameId } from './types';

const EMPTY_ROW = '..........';

function fixture(
  id: EndgameId,
  rows: readonly string[],
  options: {
    anchors?: readonly { x: number; y: number }[];
    placements?: readonly EndgameSetupPlacement[];
    targetRows?: number;
  } = {},
): EndgameDefinition {
  return {
    id,
    name: id,
    difficulty: 1,
    targetRows: options.targetRows ?? 3,
    seed: 1,
    setup: {
      seed: 2,
      placements: options.placements ?? [{ type: 'T', rotation: 0, x: 3 }],
    },
    boardRows: [...Array.from({ length: 20 - rows.length }, () => EMPTY_ROW), ...rows],
    hiddenCells: [],
    anchorCells: options.anchors ?? [],
  };
}

describe('T32 endgame structure fingerprints', () => {
  it('normalizes source colors while retaining legal setup geometry in exact fingerprints', () => {
    const left = fixture('t3r-shaft-01', ['..TT......', '..TT......']);
    const recolored = fixture('t3r-shaft-02', ['..OO......', '..OO......']);
    const differentSetup = fixture('t3r-shaft-03', ['..OO......', '..OO......'], {
      placements: [{ type: 'O', rotation: 0, x: 2 }],
    });

    expect(createEndgameExactFingerprint(left)).toBe(createEndgameExactFingerprint(recolored));
    expect(createEndgameExactFingerprint(left)).not.toBe(createEndgameExactFingerprint(differentSetup));
  });

  it('canonicalizes unused-column translation and horizontal reflection without losing anchors', () => {
    const left = fixture('t3r-shaft-01', ['.TT.......', '.T........'], {
      anchors: [{ x: 3, y: 18 }],
    });
    const shiftedMirror = fixture('t3r-shaft-02', ['......TT..', '.......T..'], {
      anchors: [{ x: 5, y: 18 }],
    });
    const anchorMoved = fixture('t3r-shaft-03', ['......TT..', '.......T..'], {
      anchors: [{ x: 4, y: 18 }],
    });

    expect(createEndgameTopologyFingerprint(left)).toBe(createEndgameTopologyFingerprint(shiftedMirror));
    expect(createEndgameTopologyFingerprint(left)).not.toBe(createEndgameTopologyFingerprint(anchorMoved));
  });

  it('reports deterministic one-cell near variants and topology metrics', () => {
    const left = fixture('t3r-shaft-01', ['.TT.......', '.T........']);
    const near = fixture('t3r-shaft-02', ['.TT.......', '.TT.......']);
    const comparison = compareEndgameTopologies(left, near);
    const profile = createEndgameTopologyProfile(near);

    expect(comparison).toMatchObject({
      exactMatch: false,
      topologyMatch: false,
      nearTopology: true,
      minimumCellDelta: 1,
    });
    expect(profile).toMatchObject({
      ordinaryCells: 4,
      anchorCells: 0,
      connectedComponents: 1,
      enclosedCavities: 0,
      rowCounts: expect.arrayContaining([2]),
      columnCounts: [2, 2],
    });
  });

  it('keeps the inherited campaign free of exact and symmetry-normalized collisions', () => {
    const audit = auditEndgameFingerprints(ENDGAME_DEFINITIONS);
    expect(audit.exactConflicts).toEqual([]);
    expect(audit.topologyConflicts).toEqual([]);
    expect(audit.nearCandidates).toEqual(expect.any(Array));
  });
});
