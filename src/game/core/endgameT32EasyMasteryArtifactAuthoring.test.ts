// @ts-expect-error Vitest runs this historical-artifact check in Node while product types omit Node.
import { readFileSync } from 'node:fs';
// @ts-expect-error Vitest runs this historical-artifact check in Node while product types omit Node.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const OUTPUT_PATH = fileURLToPath(new URL(
  '../../../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-easy-mastery.json',
  import.meta.url,
));

type HistoricalArtifact = Readonly<{
  schemaVersion: number;
  batch: Readonly<{ from: number; to: number }>;
  campaignOrder: readonly string[];
  levels: readonly Readonly<{
    id: string;
    routes: readonly Readonly<{ id: string; commandStream: string }>[];
  }>[];
}>;

describe('T32 Easy mastery historical route artifact', () => {
  it('preserves the retired three-level artifact without treating it as the revision-3 certificate registry', () => {
    const persisted = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')) as HistoricalArtifact;
    expect(persisted.schemaVersion).toBe(7);
    expect(persisted.batch).toEqual({ from: 12, to: 14 });
    expect(persisted.campaignOrder).toEqual([
      't5r-arc-13', 't5r-current-12', 't5r-prism-11',
    ]);
    expect(persisted.levels.map(({ id }) => id)).toEqual(persisted.campaignOrder);
    for (const level of persisted.levels) {
      expect(level.routes.map(({ id }) => id)).toEqual(['primary', 'alternate']);
      expect(level.routes.every(({ commandStream }) => commandStream.startsWith('S'))).toBe(true);
    }
  });
});
