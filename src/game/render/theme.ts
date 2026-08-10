import type { MutationItem, PieceType } from '../core';
import { COLOR_NUMBERS } from '../../design/tokens/colors';

export interface PieceMaterial {
  fillStart: number;
  fillEnd: number;
  edge: number;
  innerEdge: number;
}

export interface MutationMaterial extends PieceMaterial {
  facet: number;
  glow: number;
}

export type MutationMaterialRole = 'active' | 'next' | 'ghost' | 'settled' | 'clear';

export interface MutationMaterialStrength {
  facet: number;
  motif: number;
  rim: number;
}

export const CELL_STYLE = {
  gapFloor: 0.7,
  gapMin: 1.25,
  gapRatio: 0.055,
  radiusMin: 1.25,
  radiusMax: 1.75,
  radiusRatio: 0.065,
  edgeWidthMin: 1,
  edgeWidthMax: 1.6,
  edgeWidthRatio: 0.045,
  reliefSignalAlpha: 0.38,
  reliefDarkAlpha: 0.92,
  faceInsetMin: 0.55,
  faceInsetMax: 1.15,
  faceInsetRatio: 0.035,
  faceBevelWidthMin: 0.65,
  faceBevelWidthMax: 1.6,
  faceBevelWidthRatio: 0.052,
  faceSignalAlpha: 0.24,
  faceDarkAlpha: 0.46,
  facetLightAlpha: 0.09,
  facetDarkAlpha: 0.07,
  seamGrooveWidthMin: 0.6,
  seamGrooveWidthMax: 1.2,
  seamGrooveWidthRatio: 0.038,
  seamGrooveAlpha: 0.72,
  seamLipWidthMin: 0.45,
  seamLipWidthMax: 0.8,
  seamLipWidthRatio: 0.025,
  seamLipAlpha: 0.3,
  seamLipOffsetRatio: 0.55,
  ghostInsetMin: 0.75,
  ghostInsetRatio: 0.045,
  ghostStrokeWidth: 1,
  ghostStrokeAlpha: 0.45,
  ghostSeamWidth: 0.75,
  ghostSeamAlpha: 0.28,
  landingImprintFillAlpha: 0.12,
  landingImprintDurationMs: 100,
} as const;

export const COLORS = {
  page: COLOR_NUMBERS.background,
  surface: COLOR_NUMBERS.surface,
  raised: COLOR_NUMBERS.surfaceSecondary,
  selected: COLOR_NUMBERS.surfaceSelected,
  well: COLOR_NUMBERS.board,
  text: COLOR_NUMBERS.textPrimary,
  muted: COLOR_NUMBERS.textSecondary,
  line: COLOR_NUMBERS.border,
  edge: COLOR_NUMBERS.borderStrong,
  classic: COLOR_NUMBERS.classic,
  race: COLOR_NUMBERS.survival,
  puzzle: COLOR_NUMBERS.puzzle,
  selection: COLOR_NUMBERS.selection,
  target: COLOR_NUMBERS.target,
  action: COLOR_NUMBERS.action,
  hover: COLOR_NUMBERS.actionHover,
  focus: COLOR_NUMBERS.focus,
  actionInk: COLOR_NUMBERS.actionInk,
  success: COLOR_NUMBERS.success,
  danger: COLOR_NUMBERS.danger,
  scrim: COLOR_NUMBERS.board,
} as const;

export const PIECE_MATERIALS: Record<PieceType, PieceMaterial> = {
  I: { fillStart: 0xe46f89, fillEnd: 0xc75871, edge: 0x773143, innerEdge: 0xffb0c0 },
  O: { fillStart: 0x5bcfc5, fillEnd: 0x3ca59d, edge: 0x1f5c58, innerEdge: 0xb0eee8 },
  T: { fillStart: 0xe0a458, fillEnd: 0xc07f3f, edge: 0x6f4522, innerEdge: 0xffd29a },
  S: { fillStart: 0x7f99e0, fillEnd: 0x5f78c3, edge: 0x334875, innerEdge: 0xc7d2ff },
  Z: { fillStart: 0xa1ca69, fillEnd: 0x7ea64f, edge: 0x435d29, innerEdge: 0xd8efad },
  J: { fillStart: 0xbb7fd0, fillEnd: 0x945fac, edge: 0x5b3569, innerEdge: 0xe5b6f2 },
  L: { fillStart: 0x65b3d1, fillEnd: 0x458da9, edge: 0x29576a, innerEdge: 0xb8e5f4 },
};

/** Complete tetromino materials. No ordinary seven-bag body is rendered underneath. */
export const MUTATION_MATERIALS: Record<MutationItem, MutationMaterial> = {
  freeze: {
    fillStart: 0x9beeff,
    fillEnd: 0x58b8d2,
    edge: 0x206d8a,
    innerEdge: 0xe2fbff,
    facet: 0x70d4e8,
    glow: 0xbaf2ff,
  },
  collapse: {
    fillStart: 0xaa7aff,
    fillEnd: 0x7043bd,
    edge: 0x321354,
    innerEdge: 0xe2c6ff,
    facet: 0x8659d4,
    glow: 0xc396ff,
  },
  bomb: {
    fillStart: 0xb95332,
    fillEnd: 0x5c272d,
    edge: 0x251116,
    innerEdge: 0xffa24c,
    facet: 0xd85b2d,
    glow: 0xffb347,
  },
  multiplier: {
    fillStart: 0xffd46f,
    fillEnd: 0xc89936,
    edge: 0x76500f,
    innerEdge: 0xfff3bd,
    facet: 0xdfb24e,
    glow: 0xffe29a,
  },
};

/** State-aware signal strength; all roles reuse the same body and motif grammar. */
export const MUTATION_MATERIAL_STRENGTH: Record<MutationMaterialRole, MutationMaterialStrength> = {
  active: { facet: 0.34, motif: 0.94, rim: 0.62 },
  next: { facet: 0.3, motif: 0.86, rim: 0.56 },
  ghost: { facet: 0, motif: 0.22, rim: 0.34 },
  settled: { facet: 0.2, motif: 0.62, rim: 0.38 },
  clear: { facet: 0.26, motif: 0.74, rim: 0.46 },
};

export const BEDROCK_MATERIAL: PieceMaterial = {
  // Compacted basalt shelf: a cool, heavy mass with restrained mineral lift.
  fillStart: 0x78868b,
  fillEnd: 0x566a73,
  edge: 0x18272e,
  innerEdge: 0xb8c2c4,
};

/** Fresh, clearable falling rock from the same basalt family as bedrock. */
export const SURVIVAL_STONE_MATERIAL: PieceMaterial = {
  fillStart: 0x9babb4,
  fillEnd: 0x708692,
  edge: 0x263943,
  innerEdge: 0xd7e1e5,
};

/** Puzzle-only immutable cells use a pale mineral core rather than a playable hue. */
export const ANCHOR_MATERIAL: PieceMaterial = {
  fillStart: 0xb7aa92,
  fillEnd: 0x8f826b,
  edge: 0x514735,
  innerEdge: 0xe0d4bc,
};
