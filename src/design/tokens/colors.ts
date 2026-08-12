/**
 * TetraMorph Design System v1.0 — semantic colour contract.
 *
 * Keep these values semantic. Renderer shell colours and CSS custom properties
 * both bridge here; piece, bedrock, anchor, and Mutation-VFX materials deliberately
 * remain in their own renderer contracts.
 */
export const COLOR_TOKENS = {
  background: '#DCE7F1',
  surface: '#F8FAFC',
  surfaceSecondary: '#EDF3F7',
  surfaceSelected: '#E5EFF5',
  border: '#C4D4DF',
  borderStrong: '#9FB4C4',
  textPrimary: '#102A43',
  /** Normal-size supporting copy; AA against both light content surfaces. */
  textSecondary: '#52677F',
  /** Requested soft tone for large/decorative accents, never 12–14 px body copy. */
  textSecondarySoft: '#627D98',
  board: '#071522',
  classic: '#31978D',
  survival: '#5878C4',
  mutation: '#C77A35',
  endgame: '#8A63B3',
  selection: '#A75E71',
  target: '#D9C187',
  action: '#315F96',
  actionHover: '#3D70A8',
  focus: '#245E9C',
  actionInk: '#F8FAFC',
  success: '#3F7F5D',
  danger: '#A64E61',
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;

export function hexToColorNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

export const COLOR_NUMBERS = Object.fromEntries(
  Object.entries(COLOR_TOKENS).map(([token, hex]) => [token, hexToColorNumber(hex)]),
) as { readonly [Token in ColorToken]: number };
