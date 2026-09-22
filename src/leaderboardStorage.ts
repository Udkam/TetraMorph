import { emptyLeaderboard, LEADERBOARD_KEY, LEGACY_LEADERBOARD_KEYS, parsePersistedLeaderboard, type Leaderboard } from './leaderboard';
import type { BrowserPlatform } from './platform/browserPlatform';

type Storage = Pick<BrowserPlatform, 'readStorageState' | 'writeStorage'>;
export function readLeaderboardStorage(storage: Storage): { value: Leaderboard; canPersist: boolean } {
  const blocked = { value: emptyLeaderboard(), canPersist: false };
  const current = storage.readStorageState(LEADERBOARD_KEY);
  if (current.status === 'failed') return blocked;
  if (current.status === 'value') {
    const value = parsePersistedLeaderboard(current.value);
    return value ? { value, canPersist: true } : blocked;
  }
  for (const key of LEGACY_LEADERBOARD_KEYS) {
    const legacy = storage.readStorageState(key);
    if (legacy.status === 'failed') return blocked;
    if (legacy.status === 'missing') continue;
    const value = parsePersistedLeaderboard(legacy.value, true);
    if (!value) return blocked;
    const raw = JSON.stringify(value);
    const written = storage.writeStorage(LEADERBOARD_KEY, raw);
    const verified = written ? storage.readStorageState(LEADERBOARD_KEY) : null;
    return { value, canPersist: verified?.status === 'value' && verified.value === raw };
  }
  return { value: emptyLeaderboard(), canPersist: true };
}
