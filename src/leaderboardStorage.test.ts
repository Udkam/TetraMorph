import { describe, expect, it } from 'vitest';
import { BrowserPlatform } from './platform/browserPlatform';
import { emptyLeaderboard, LEADERBOARD_KEY, LEGACY_LEADERBOARD_KEYS } from './leaderboard';
import { readLeaderboardStorage } from './leaderboardStorage';

function fixture(raw?: string, legacy = false, failWrite = false) {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set(legacy ? LEGACY_LEADERBOARD_KEYS[0] : LEADERBOARD_KEY, raw);
  const storage = new BrowserPlatform({ storage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrite) throw new Error('quota');
      values.set(key, value);
    },
  } as Storage });
  return { storage, values };
}
describe('leaderboard persistence boundary', () => {
  it('allows missing or valid current data', () => {
    expect(readLeaderboardStorage(fixture().storage).canPersist).toBe(true);
    expect(readLeaderboardStorage(fixture(JSON.stringify(emptyLeaderboard())).storage).canPersist).toBe(true);
  });
  it.each(['{', '{"version":11}', '{"version":10,"marathon":[]}'])('preserves invalid/current future data: %s', (raw) => {
    const { storage, values } = fixture(raw);
    expect(readLeaderboardStorage(storage).canPersist).toBe(false);
    expect(values.get(LEADERBOARD_KEY)).toBe(raw);
  });
  it('blocks writes after inaccessible reads', () => {
    expect(readLeaderboardStorage(new BrowserPlatform({ storage: null })).canPersist).toBe(false);
  });
  it('only migrates validated legacy data and retains the original', () => {
    const raw = JSON.stringify({ version: 9, marathon: [], race: [], sprint: [] });
    const { storage, values } = fixture(raw, true);
    expect(readLeaderboardStorage(storage).canPersist).toBe(true);
    expect(values.get(LEGACY_LEADERBOARD_KEYS[0])).toBe(raw);
    expect(JSON.parse(values.get(LEADERBOARD_KEY)!)).toEqual(emptyLeaderboard());
    expect(readLeaderboardStorage(fixture(raw, true, true).storage).canPersist).toBe(false);
    const invalid = fixture('{}', true);
    expect(readLeaderboardStorage(invalid.storage).canPersist).toBe(false);
    expect(invalid.values.has(LEADERBOARD_KEY)).toBe(false);
  });
});
