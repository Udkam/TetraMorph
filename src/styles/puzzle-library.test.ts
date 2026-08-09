// @vitest-environment node

// @ts-expect-error Vitest reads this source contract in Node while product types omit Node globals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gallery = readFileSync('src/styles/puzzle-library.css', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');

describe('Phase 12 Puzzle curriculum authority', () => {
  it('loads one dedicated gallery layer after navigation and before result presentation', () => {
    const importPath = "./styles/puzzle-library.css";
    expect(main.match(new RegExp(importPath.replace('.', '\\.'), 'g'))).toHaveLength(1);
    expect(main.indexOf(importPath)).toBeGreaterThan(main.indexOf("./styles/navigation.css"));
    expect(main.indexOf(importPath)).toBeLessThan(main.indexOf("./styles/result.css"));
  });

  it('renders three semantic curriculum categories around one canonical preview', () => {
    expect(app).toContain("const PUZZLE_CATEGORY_IDS: readonly PuzzleCategoryId[] = Object.freeze(['intro', 'easy', 'hard'])");
    expect(app).not.toContain('PUZZLE_PAGE_SIZE');
    expect(app).toContain('role="tablist"');
    expect(app).toContain('role="tabpanel"');
    expect(app).toContain('data-puzzle-category={categoryId}');
    expect(app).toContain('puzzle-gallery__hero');
    expect(app).toContain('puzzle-gallery__board');
    expect(app).toContain('puzzle-gallery__title');
    expect(app).toContain('puzzle-gallery__start');
    expect(app).toContain('puzzle-gallery__lesson');
    expect(app).toContain('puzzle-gallery__mastery');
    expect(app).toContain('puzzle-gallery__requirement');
    expect(app).not.toContain('PUZZLE_TARGET_ROW_TIERS');
    expect(app).not.toContain('puzzleMatrixColumnCount');
  });

  it('uses square cards with category-specific density and no gallery scrolling', () => {
    expect(gallery).toMatch(/\.puzzle-gallery\s*\{[\s\S]*align-self:\s*stretch;[\s\S]*height:\s*100%;[\s\S]*max-height:\s*740px;/);
    expect(gallery).toMatch(/\.library-shell--gallery\s*\{[^}]*grid-template-rows:\s*44px min\(740px,\s*calc\(100dvh - 80px\)\);[^}]*align-content:\s*center;[^}]*gap:\s*16px;/s);
    expect(gallery).toMatch(/@media \(max-width:\s*719px\),\s*\(orientation:\s*portrait\)[\s\S]*\.library-shell--gallery\s*\{[^}]*calc\(100dvh - 66px\)[^}]*gap:\s*12px;/s);
    expect(gallery).toMatch(/@media \(min-width:\s*720px\) and \(max-height:\s*520px\)[\s\S]*\.library-shell--gallery\s*\{[^}]*calc\(100dvh - 62px\)[^}]*gap:\s*12px;/s);
    expect(gallery).toMatch(/\.puzzle-gallery__grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(44px,\s*1fr\)\)/);
    expect(gallery).toMatch(/\.puzzle-gallery__grid\s*\{[\s\S]*align-content:\s*center;[\s\S]*justify-self:\s*center;[\s\S]*width:\s*min\(100%,\s*560px\)/);
    expect(gallery).toMatch(/\.puzzle-gallery__grid\[data-puzzle-category="intro"\]\s*\{[^}]*repeat\(3,/s);
    expect(gallery).toMatch(/\.puzzle-gallery__grid\[data-puzzle-category="easy"\]\s*\{[^}]*repeat\(6,/s);
    expect(gallery).toMatch(/\.puzzle-gallery__node\s*\{[\s\S]*aspect-ratio:\s*1;/);
    expect(gallery).toMatch(/\.puzzle-gallery__node > button\s*\{[\s\S]*min-width:\s*44px;[\s\S]*min-height:\s*44px;/);
    expect(gallery).not.toMatch(/overflow-(?:x|y):\s*(?:auto|scroll)/);
    expect(gallery).toMatch(/\.puzzle-gallery__node > button:hover\s*\{[\s\S]*transform:\s*none;/);
    expect(gallery).not.toContain('.puzzle-gallery__node--selected > button::before');
  });

  it('keeps lessons and mastery compact without a second route-mount reveal', () => {
    expect(gallery).toMatch(/\.puzzle-gallery__lesson\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0,\s*1fr\)/s);
    expect(gallery).toMatch(/\.puzzle-gallery__mastery > div\s*\{[^}]*repeat\(3,/s);
    expect(gallery).toMatch(/\.puzzle-gallery__node--locked > button\s*\{[^}]*border-style:\s*dashed;/s);
    expect(gallery).toMatch(/@media \(max-width:\s*719px\),\s*\(orientation:\s*portrait\)[\s\S]*\.puzzle-gallery\s*\{[\s\S]*grid-template-rows:/);
    expect(gallery).toMatch(/@media \(min-width:\s*720px\) and \(max-height:\s*520px\)[\s\S]*\.puzzle-gallery__grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(5,/);
    expect(gallery).not.toContain('puzzle-gallery-reveal');
    expect(gallery).not.toContain('puzzle-gallery-page-in');
    expect(gallery).not.toMatch(/\.puzzle-gallery__(?:stage|grid)\s*\{[^}]*animation:/s);
  });

  it('keeps localized Puzzle titles inside a complete glyph box', () => {
    expect(gallery).toMatch(/\.puzzle-gallery__title\s*\{[^}]*min-block-size:\s*1\.34em;[^}]*padding-block:\s*\.06em;[^}]*overflow:\s*visible;[^}]*line-height:\s*1\.2;[^}]*text-overflow:\s*clip;/s);
    expect(gallery).not.toMatch(/\.puzzle-gallery__title\s*\{[^}]*text-overflow:\s*ellipsis;/s);
  });

  it('implements independent keyboard navigation for category tabs and level grids', () => {
    expect(app).toContain('const movePageFocus');
    expect(app).toContain('const moveLevelFocus');
    expect(app).toContain('gridTemplateColumns');
    expect(app).toContain("event.key === 'ArrowLeft'");
    expect(app).toContain("event.key === 'ArrowRight'");
    expect(app).toContain("event.key === 'ArrowUp'");
    expect(app).toContain("event.key === 'ArrowDown'");
    expect(app).toContain("event.key === 'Home'");
    expect(app).toContain("event.key === 'End'");
    expect(app).toContain('onKeyDown={(event) => movePageFocus(event, index)}');
    expect(app).toContain('onKeyDown={(event) => moveLevelFocus(event, localIndex)}');
  });
});
