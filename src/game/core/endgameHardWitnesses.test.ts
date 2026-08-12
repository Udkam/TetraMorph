import { describe, expect, it } from 'vitest';
import { replayEndgameRoute } from './endgameRouteSearch';
import { T32_HARD_REBUILD_WITNESSES } from './endgameT32HardRebuildRoutes';

describe('T32 strict Hard rebuild witnesses', () => {
  it.each(T32_HARD_REBUILD_WITNESSES)('$id finishes through two divergent public-Core routes', ({
    id, primary, alternate,
  }) => {
    const canonical = replayEndgameRoute(id, primary.commandStream);
    const divergent = replayEndgameRoute(id, alternate.commandStream);
    expect(canonical.locks).toHaveLength(primary.locks);
    expect(divergent.locks).toHaveLength(alternate.locks);
    expect(canonical.state.endgameCompletion).toBe('finished');
    expect(divergent.state.endgameCompletion).toBe('finished');
    const firstDivergence = canonical.locks.findIndex(
      (lock, index) => lock.signature !== divergent.locks[index]?.signature,
    );
    expect(firstDivergence).toBeGreaterThanOrEqual(0);
  });
});
