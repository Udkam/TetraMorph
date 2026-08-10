// @ts-expect-error Vitest runs this test in Node while the product tsconfig intentionally omits Node globals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BEDROCK_MATERIAL,
  CELL_STYLE,
  COLORS,
  MUTATION_MATERIALS,
  MUTATION_MATERIAL_STRENGTH,
  PIECE_MATERIALS,
  SURVIVAL_STONE_MATERIAL,
} from './theme';
import { COLOR_NUMBERS, COLOR_TOKENS } from '../../design/tokens/colors';

const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
const tokenStyles = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');

function relativeLuminance(color: number): number {
  const channels = [16, 8, 0].map((shift) => ((color >> shift) & 0xff) / 255);
  return channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index]!;
  }, 0);
}

function contrastRatio(first: number, second: number): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('T5 bright mineral matte material', () => {
  it('keeps the exact frozen four-value material for every piece', () => {
    expect(PIECE_MATERIALS).toEqual({
      I: { fillStart: 0xe46f89, fillEnd: 0xc75871, edge: 0x773143, innerEdge: 0xffb0c0 },
      O: { fillStart: 0x5bcfc5, fillEnd: 0x3ca59d, edge: 0x1f5c58, innerEdge: 0xb0eee8 },
      T: { fillStart: 0xe0a458, fillEnd: 0xc07f3f, edge: 0x6f4522, innerEdge: 0xffd29a },
      S: { fillStart: 0x7f99e0, fillEnd: 0x5f78c3, edge: 0x334875, innerEdge: 0xc7d2ff },
      Z: { fillStart: 0xa1ca69, fillEnd: 0x7ea64f, edge: 0x435d29, innerEdge: 0xd8efad },
      J: { fillStart: 0xbb7fd0, fillEnd: 0x945fac, edge: 0x5b3569, innerEdge: 0xe5b6f2 },
      L: { fillStart: 0x65b3d1, fillEnd: 0x458da9, edge: 0x29576a, innerEdge: 0xb8e5f4 },
    });
  });

  it('keeps bedrock and falling stones in one cold-slate family with distinct age', () => {
    expect(BEDROCK_MATERIAL).toEqual({
      fillStart: 0x78868b,
      fillEnd: 0x566a73,
      edge: 0x18272e,
      innerEdge: 0xb8c2c4,
    });
    expect(SURVIVAL_STONE_MATERIAL).toEqual({
      fillStart: 0x9babb4,
      fillEnd: 0x708692,
      edge: 0x263943,
      innerEdge: 0xd7e1e5,
    });
    expect(Object.values(PIECE_MATERIALS)).not.toContainEqual(BEDROCK_MATERIAL);
    expect(Object.values(PIECE_MATERIALS)).not.toContainEqual(SURVIVAL_STONE_MATERIAL);
    expect(SURVIVAL_STONE_MATERIAL).not.toEqual(BEDROCK_MATERIAL);
    expect(contrastRatio(BEDROCK_MATERIAL.fillStart, COLORS.well)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(BEDROCK_MATERIAL.fillEnd, COLORS.well)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(SURVIVAL_STONE_MATERIAL.fillStart, COLORS.well)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(SURVIVAL_STONE_MATERIAL.fillEnd, COLORS.well)).toBeGreaterThanOrEqual(3);
  });

  it('freezes four complete high-contrast Mutation materials without an ordinary underlay', () => {
    expect(MUTATION_MATERIALS).toEqual({
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
    });
    const starts = Object.values(MUTATION_MATERIALS).map((material) => material.fillStart);
    expect(new Set(starts).size).toBe(4);
    for (const material of Object.values(MUTATION_MATERIALS)) {
      expect(contrastRatio(material.fillStart, COLORS.well)).toBeGreaterThanOrEqual(3);
      // The lower endpoint may be dark mineral mass; the lit face and rim carry identity.
      expect(contrastRatio(material.fillEnd, COLORS.well)).toBeGreaterThanOrEqual(1.5);
      expect(contrastRatio(material.innerEdge, COLORS.well)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(material.glow, COLORS.well)).toBeGreaterThanOrEqual(3);
      expect(material.innerEdge).not.toBe(0xffffff);
      expect(material.facet).not.toBe(material.fillStart);
    }
  });

  it('uses one material grammar with quieter settled and silhouette-safe Ghost roles', () => {
    expect(MUTATION_MATERIAL_STRENGTH.active.motif).toBeGreaterThan(MUTATION_MATERIAL_STRENGTH.settled.motif);
    expect(MUTATION_MATERIAL_STRENGTH.next.motif).toBeGreaterThan(MUTATION_MATERIAL_STRENGTH.settled.motif);
    expect(MUTATION_MATERIAL_STRENGTH.ghost.facet).toBe(0);
    expect(MUTATION_MATERIAL_STRENGTH.ghost.motif).toBeLessThan(MUTATION_MATERIAL_STRENGTH.settled.motif);
    expect(MUTATION_MATERIAL_STRENGTH.clear.motif).toBeGreaterThan(MUTATION_MATERIAL_STRENGTH.settled.motif);
  });

  it('bridges the complete renderer shell palette from Design System tokens', () => {
    expect(COLORS).toEqual({
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
    });
  });

  it('bridges the exact Design System CSS palette and retains action ink on blue action states', () => {
    const tokens = {
      '--page': COLOR_TOKENS.background,
      '--surface': COLOR_TOKENS.surface,
      '--raised': COLOR_TOKENS.surfaceSecondary,
      '--selected': COLOR_TOKENS.surfaceSelected,
      '--well': COLOR_TOKENS.board,
      '--ink': COLOR_TOKENS.textPrimary,
      '--muted': COLOR_TOKENS.textSecondary,
      '--line': COLOR_TOKENS.border,
      '--edge': COLOR_TOKENS.borderStrong,
      '--classic': COLOR_TOKENS.classic,
      '--race': COLOR_TOKENS.survival,
      '--sprint': COLOR_TOKENS.mutation,
      '--puzzle': COLOR_TOKENS.puzzle,
      '--selection': COLOR_TOKENS.selection,
      '--action': COLOR_TOKENS.action,
      '--hover': COLOR_TOKENS.actionHover,
      '--focus': COLOR_TOKENS.focus,
      '--action-ink': COLOR_TOKENS.actionInk,
      '--success': COLOR_TOKENS.success,
      '--danger': COLOR_TOKENS.danger,
    } as const;

    for (const [token, value] of Object.entries(tokens)) {
      expect(tokenStyles).toContain(`${token}: ${value};`);
    }
    expect(tokenStyles).toContain('--phase: linear-gradient(90deg, #31978D, #5878C4, #C77A35, #8A63B3);');
    expect(styles).toContain('color-scheme: light;');
    expect(styles).toContain('--shadow: 0 18px 44px rgba(31, 59, 86, .14);');
    const actionTextRules = [
      /\.skip-link\s*\{[^}]*color: var\(--action-ink\);[^}]*background: var\(--action\);/s,
      /\.mode-gate:hover \.mode-gate__action b,[^}]*color: var\(--action-ink\);[^}]*background: var\(--action\);/s,
      /\.primary-action\s*\{[^}]*color: var\(--action-ink\);[^}]*background: var\(--action\);/s,
      /\.topbar-action:last-child\s*\{[^}]*color: var\(--action-ink\);[^}]*background: var\(--action\);/s,
      /\.touch-key:hover,[^}]*color: var\(--action-ink\);[^}]*background: var\(--action\);/s,
    ];
    for (const rule of actionTextRules) expect(styles).toMatch(rule);
  });

  it('retains AA text and action contrast plus three-to-one material contrast', () => {
    expect(contrastRatio(COLORS.text, COLORS.surface)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(COLORS.muted, COLORS.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.muted, COLORS.raised)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.actionInk, COLORS.action)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.actionInk, COLORS.hover)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORS.focus, COLORS.surface)).toBeGreaterThanOrEqual(3);

    for (const material of Object.values(PIECE_MATERIALS)) {
      expect(contrastRatio(material.fillStart, COLORS.well)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(material.fillEnd, COLORS.well)).toBeGreaterThanOrEqual(3);
    }
  });

  it('freezes the matte plate, signal edge, zero-fill ghost, and lock response', () => {
    expect(CELL_STYLE).toEqual({
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
    });
    expect(CELL_STYLE.radiusMax).toBeLessThanOrEqual(1.75);
    expect(CELL_STYLE.edgeWidthMax).toBeLessThanOrEqual(1.6);
    expect((CELL_STYLE.gapFloor * 2) / CELL_STYLE.seamGrooveWidthMin).toBeGreaterThanOrEqual(1.6);
    expect((CELL_STYLE.gapMin * 2) / CELL_STYLE.seamGrooveWidthMax).toBeGreaterThanOrEqual(1.6);
    expect(CELL_STYLE.ghostStrokeWidth).toBe(1);
    expect(CELL_STYLE.landingImprintFillAlpha).toBeLessThanOrEqual(0.12);
    expect(CELL_STYLE.landingImprintDurationMs).toBe(100);
  });
});
