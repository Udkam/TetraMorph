// @vitest-environment node

// @ts-expect-error Vitest runs this test in Node while the product tsconfig omits Node globals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const main = readFileSync('src/main.tsx', 'utf8');
const css = readFileSync('src/styles/in-page-transitions.css', 'utf8');

describe('T37 D2A in-page transition authority', () => {
  it('loads after every legacy sheet and theme layer', () => {
    expect(main.indexOf("./styles/in-page-transitions.css")).toBeGreaterThan(main.indexOf("./styles/themes.css"));
  });

  it('keeps the settled full-motion distances and durations without enlarging the panel', () => {
    expect(css).toMatch(/d2a-backdrop-in 120ms cubic-bezier\(\.16, 1, \.3, 1\)/);
    expect(css).toMatch(/d2a-sheet-in 180ms cubic-bezier\(\.16, 1, \.3, 1\)/);
    expect(css).toMatch(/d2a-settings-panel-in 150ms cubic-bezier\(\.16, 1, \.3, 1\)/);
    expect(css).toMatch(/d2a-sheet-out 120ms cubic-bezier\(\.4, 0, 1, 1\)/);
    expect(css).toContain('transform: translateY(4px)');
    expect(css).toContain('transform: translateY(2px)');
    expect(css).toContain('transform: translateY(-2px)');
    expect(css).not.toMatch(/scale\s*\(/);
    expect(css).not.toMatch(/blur\s*\(/);
  });

  it('keeps reduced phases opacity-only and no longer than 32ms', () => {
    expect(css.match(/32ms/g)?.length).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/data-sheet-motion="reduced"[\s\S]*transform: none !important/);
    expect(css).toMatch(/data-sheet-phase="steady"[\s\S]*animation: none !important/);
  });

  it('gives pause and restart the same bounded board-curtain lifecycle', () => {
    expect(css).toMatch(/data-curtain-phase="enter"[\s\S]*d2a-curtain-in 180ms/);
    expect(css).toMatch(/data-curtain-phase="exit"[\s\S]*d2a-curtain-out 120ms/);
    expect(css).toMatch(/data-curtain-motion="reduced"[\s\S]*d2a-opacity-in 32ms/);
    expect(css).toMatch(/@keyframes d2a-curtain-in[\s\S]*translateY\(4px\)/);
    expect(css).toMatch(/@keyframes d2a-curtain-out[\s\S]*translateY\(-2px\)/);
  });
});
