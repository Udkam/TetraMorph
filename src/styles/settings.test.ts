// @ts-expect-error Vitest runs this contract test in Node while the product tsconfig omits Node globals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const settingsCss = readFileSync('src/styles/settings.css', 'utf8');
const themesCss = readFileSync('src/styles/themes.css', 'utf8');

describe('RC1 Settings composition', () => {
  it('uses one three-tab console and renders each concern in its own compact panel', () => {
    expect(settingsCss).toMatch(/\.settings-console__tabs\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
    expect(settingsCss).toMatch(/\.settings-console__panel\s*\{[^}]*padding:\s*18px/s);
    expect(settingsCss).toMatch(/\.settings-console__controls\s*\{[^}]*grid-template-columns:\s*minmax\(170px,\s*\.75fr\) minmax\(280px,\s*1\.2fr\) minmax\(140px,\s*\.62fr\)/s);
    expect(settingsCss).toMatch(/\.settings-console__actions\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*justify-self:\s*stretch;[^}]*width:\s*100%;/s);
    expect(settingsCss).toMatch(/\.settings-console__keyboard\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*grid-template-areas:\s*none;/s);
    expect(settingsCss).toMatch(/\.settings-console__key-group\s*\{[^}]*grid-area:\s*auto;/s);
    expect(settingsCss).not.toMatch(/grid-template-areas:\s*"rules rules"\s*"controls keyboard"\s*"record record"/s);
    expect(settingsCss).not.toMatch(/font-size:\s*(?:9|9\.5|10)px/);
  });

  it('keeps prose in the UI face and reserves the data face for values and keycaps', () => {
    expect(settingsCss).toMatch(/\.settings-console__panel--rules > \.mode-rule-summary li\s*\{[^}]*font-family:\s*var\(--font-ui\)/s);
    expect(settingsCss).toMatch(/\.settings-console__panel--rules > \.mode-rule-summary li b\s*\{[^}]*font-family:\s*var\(--font-ui\)/s);
    expect(settingsCss).toMatch(/\.settings-console__key-group > span\s*\{[^}]*font-family:\s*var\(--font-ui\)/s);
    expect(settingsCss).toMatch(/\.settings-console__keyboard kbd\s*\{[^}]*font-family:\s*var\(--font-data\)/s);
    expect(settingsCss).toMatch(/\.settings-console__controls \.audio-volume output\s*\{[^}]*font-family:\s*var\(--font-data\)/s);
    expect(settingsCss).toMatch(/\.settings-console__controls \.motion-toggle\s*\{[^}]*width:\s*100%;[^}]*color:\s*var\(--action-ink\);[^}]*background:\s*var\(--action\);[^}]*border-color:\s*var\(--action\);[^}]*border-radius:\s*8px;/s);
    expect(settingsCss).not.toMatch(/\.settings-console__controls \.motion-toggle\[aria-pressed="true"\]/);
    expect(settingsCss).toMatch(/\.settings-console__touch\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  });

  it('collapses columns without shrinking English or Chinese copy below the readable floor', () => {
    const mobileStart = settingsCss.indexOf('@media (max-width: 680px)');
    const mobileEnd = settingsCss.indexOf('@media (max-width: 460px)', mobileStart);
    const mobileCss = settingsCss.slice(mobileStart, mobileEnd);
    expect(mobileStart).toBeGreaterThanOrEqual(0);
    expect(mobileEnd).toBeGreaterThan(mobileStart);
    expect(settingsCss).toMatch(/@media \(max-width:\s*680px\)[\s\S]*?\.settings-console__controls,[\s\S]*?\.settings-console__keyboard\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
    expect(mobileCss).toMatch(/\.action-sheet--settings\s*\{[^}]*width:\s*min\(620px,\s*100%\)/s);
    expect(mobileCss).not.toContain('100vw');
    expect(settingsCss).toMatch(/@media \(max-height:\s*520px\)[\s\S]*?\.settings-console__key-group > span,[\s\S]*?font-size:\s*11\.5px/s);
  });

  it('gives Deep Tide Settings tabs distinct readable idle and selected surfaces', () => {
    expect(themesCss).toMatch(/\.app\[data-theme="deep-tide"\] \.settings-console__tabs button\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--ink\) 90%, var\(--muted\)\);[^}]*background:\s*color-mix\(in srgb, var\(--selected\) 64%, var\(--raised\)\);/s);
    expect(themesCss).toMatch(/\.app\[data-theme="deep-tide"\] \.settings-console__tabs button\[aria-selected="true"\]\s*\{[^}]*color:\s*var\(--action-ink\);[^}]*background:\s*color-mix\(in srgb, var\(--action\) 86%, var\(--selected\)\);/s);
  });
});
