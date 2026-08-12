// @vitest-environment node

// @ts-expect-error Vitest reads this source contract in Node while product types omit Node globals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const result = readFileSync('src/styles/result.css', 'utf8');
const legacy = readFileSync('src/styles.css', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');

describe('T27 run-result scorecard authority', () => {
  it('loads one dedicated result layer after shared HUD and navigation styles', () => {
    const importPath = "./styles/result.css";
    expect(main.match(new RegExp(importPath.replace('.', '\\.'), 'g'))).toHaveLength(1);
    expect(main.indexOf(importPath)).toBeGreaterThan(main.indexOf("./styles/hud.css"));
    expect(main.indexOf(importPath)).toBeGreaterThan(main.indexOf("./styles/navigation.css"));
  });

  it('uses mode accents for the achievement, current-run rows, and the primary action', () => {
    expect(result).toContain('T27 result scorecard authority');
    expect(result).toMatch(/\.action-sheet--run-result-race\s*\{\s*--result-accent:\s*var\(--race\)/);
    expect(result).toMatch(/\.action-sheet--run-result-sprint\s*\{\s*--result-accent:\s*var\(--sprint\)/);
    expect(result).toMatch(/li\[data-current-record="true"\][\s\S]*box-shadow:\s*inset 0 0 0 1px color-mix\(in srgb, var\(--result-accent\)/);
    expect(result).toMatch(/\.action-sheet--run-result > \.action-sheet__actions > \.primary-action\s*\{[\s\S]*background:\s*var\(--result-accent\)/);
  });

  it('keeps one unboxed achievement and one supporting row in a narrow portrait scorecard', () => {
    expect(result).toMatch(/\.action-sheet--run-result\s*\{[\s\S]*width:\s*min\(31rem, calc\(100vw - 24px\)\)/);
    expect(result).toMatch(/\.run-result__hero strong\s*\{[\s\S]*font-size:\s*clamp\(48px, 13vw, 68px\)/);
    expect(result).toMatch(/\.run-result__hero strong\s*\{[\s\S]*overflow:\s*visible;[\s\S]*font-weight:\s*700;[\s\S]*line-height:\s*1\.08;[\s\S]*text-overflow:\s*clip;/);
    expect(result).toMatch(/\.run-result__support\s*\{[\s\S]*justify-content:\s*space-between/);
    expect(result).not.toContain('.run-result__metric');
    expect(result).toMatch(/@media \(min-width:\s*700px\) and \(max-height:\s*520px\)/);
    expect(result).toMatch(/@media \(min-width:\s*700px\) and \(max-height:\s*520px\)[\s\S]*width:\s*min\(31rem, calc\(100vw - 20px\)\)/);
    expect(result).toMatch(/@media \(min-width:\s*700px\) and \(max-height:\s*520px\)[\s\S]*overflow:\s*auto;/);
    expect(result).not.toContain('"summary leaderboard"');
    expect(result).not.toMatch(/grid-area:\s*(?:summary|leaderboard)/);
    expect(result).toMatch(/@media \(max-width:\s*560px\)/);
    expect(result).toMatch(/\.app\[data-reduced-motion="true"\] \.action-sheet--run-result[\s\S]*animation:\s*none !important/);
  });

  it('gives Endgame the same portrait rhythm without a boxed horizontal summary', () => {
    expect(result).toMatch(/\.action-sheet--endgame-celebration\s*\{[\s\S]*width:\s*min\(31rem, calc\(100vw - 24px\)\)/);
    expect(result).toMatch(/\.endgame-celebration\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/);
    expect(result).toMatch(/\.endgame-celebration__value strong\s*\{[\s\S]*font-size:\s*clamp\(52px, 14vw, 70px\)/);
    expect(result).toMatch(/\.endgame-celebration__value strong\s*\{[\s\S]*overflow:\s*visible;[\s\S]*font-weight:\s*700;[\s\S]*line-height:\s*1\.08;[\s\S]*text-overflow:\s*clip;/);
    expect(result).toMatch(/\.endgame-celebration__summary > span\s*\{[\s\S]*font-size:\s*12px/);
    expect(result).not.toMatch(/\.endgame-celebration__constellation\s*\{/);
    expect(result).not.toMatch(/\.endgame-celebration__prism\s*\{/);
    expect(legacy).not.toContain('.endgame-celebration__constellation');
    expect(legacy).not.toContain('.endgame-celebration__prism');
    expect(legacy).not.toContain('endgame-celebration-fragment');
    expect(result).not.toMatch(/grid-template-rows:\s*(?:84|90)px auto/);
  });
});
