// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { ENDGAME_CAMPAIGN_REVISION, ENDGAME_PROGRESS_KEY, ENDGAME_PROGRESS_V6_KEY } from './endgameProgress';
import { appHistoryStateFor } from './navigation/appRoute';
import type { PlatformStorageRead } from './platform/browserPlatform';
import {
  ENDGAME_V7_BEHAVIOR_STABLE_IDS,
  ENDGAME_V7_REBUILT_IDS,
  migrateEndgameProgressStorage,
  migrateEndgameRuleIntrosStorage,
  normalizeEndgameRoute,
} from './legacyEndgameMigration';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('./game/runtime/GameRuntime', () => ({
  randomRunSeed: () => 0x51a1f00d,
  GameRuntime: class {},
}));

function renderApp(): { readonly container: HTMLDivElement; unmount(): void } {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);
  act(() => root.render(createElement(App) as ReactNode));
  return {
    container,
    unmount: () => act(() => {
      root.unmount();
      container.remove();
    }),
  };
}

afterEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  document.body.replaceChildren();
});

interface MemoryOptions {
  readonly failedReads?: ReadonlySet<string>;
  readonly failedWrites?: ReadonlySet<string>;
  readonly failedRemovals?: ReadonlySet<string>;
  readonly readback?: (key: string, value: string) => PlatformStorageRead;
}

function memory(initial: Record<string, string>, options: MemoryOptions = {}) {
  const values = new Map(Object.entries(initial));
  let lastWrite: { key: string; value: string } | null = null;
  return {
    values,
    port: {
      readStorageState(key: string): PlatformStorageRead {
        if (options.failedReads?.has(key)) return { status: 'failed' };
        if (lastWrite?.key === key && options.readback) return options.readback(key, lastWrite.value);
        const value = values.get(key);
        return value === undefined ? { status: 'missing' } : { status: 'value', value };
      },
      writeStorage(key: string, value: string): boolean {
        if (options.failedWrites?.has(key)) return false;
        values.set(key, value);
        lastWrite = { key, value };
        return true;
      },
      removeStorage(key: string): boolean {
        if (options.failedRemovals?.has(key)) return false;
        values.delete(key);
        return true;
      },
    },
  };
}

function v6(
  completedLevelIds: readonly string[],
  bestPieceCounts: Record<string, number> = {},
): string {
  return JSON.stringify({ version: 6, campaignRevision: 2, completedLevelIds, bestPieceCounts });
}

function v7(
  completedLevelIds: readonly string[],
  bestLockedPieceCounts: Record<string, number> = {},
): string {
  return JSON.stringify({ version: 7, campaignRevision: 3, completedLevelIds, bestLockedPieceCounts });
}

describe('isolated revision-3 Endgame progress migration', () => {
  it('publishes 46 active IDs with exactly 38 behavior-stable migrations and eight resets', () => {
    expect(ENDGAME_V7_BEHAVIOR_STABLE_IDS).toHaveLength(38);
    expect(ENDGAME_V7_REBUILT_IDS).toEqual([
      't3r-shaft-01', 't3r-shaft-02', 't3r-shaft-03', 't3r-cascade-06', 't3r-shaft-04',
      'tm-endgame-32', 'tm-endgame-39', 'tm-endgame-46',
    ]);
    expect(new Set([...ENDGAME_V7_BEHAVIOR_STABLE_IDS, ...ENDGAME_V7_REBUILT_IDS]).size).toBe(46);
  });

  it('accepts canonical v7 first, does not rewrite it, and retains v6 as rollback data', () => {
    const canonical = v7(['t3r-cascade-05'], { 't3r-cascade-05': 5 });
    const store = memory({
      [ENDGAME_PROGRESS_KEY]: canonical,
      [ENDGAME_PROGRESS_V6_KEY]: v6(['t3r-cascade-05'], { 't3r-cascade-05': 5 }),
    });
    const result = migrateEndgameProgressStorage(store.port);
    expect(result).toMatchObject({
      status: 'available', sourceRank: 0, persistence: 'verified',
      data: {
        version: 7, campaignRevision: ENDGAME_CAMPAIGN_REVISION,
        completedLevelIds: ['t3r-cascade-05'], bestLockedPieceCounts: { 't3r-cascade-05': 5 },
      },
      cleanup: { removedSourceRanks: [], retainedSourceRanks: [1] },
    });
    expect(store.values.get(ENDGAME_PROGRESS_KEY)).toBe(canonical);
    expect(store.values.has(ENDGAME_PROGRESS_V6_KEY)).toBe(true);
  });

  it('projects v6 through the frozen stable set, clears rebuilt records, and transfers nothing from retired IDs', () => {
    const store = memory({
      [ENDGAME_PROGRESS_V6_KEY]: v6([
        't3r-shaft-01', 't3r-shaft-02', 't3r-cascade-05', 't3r-cascade-06', 't5r-delta-07',
        'tm-endgame-32', 'tm-endgame-34', 'tm-endgame-39', 'tm-endgame-46', 'tm-endgame-50',
      ], {
        't3r-shaft-01': 3, 't3r-shaft-02': 4, 't3r-cascade-06': 5, 't3r-cascade-05': 6,
        't5r-delta-07': 7, 'tm-endgame-32': 8, 'tm-endgame-34': 9, 'tm-endgame-39': 10,
        'tm-endgame-46': 11, 'tm-endgame-50': 12,
      }),
    });
    const result = migrateEndgameProgressStorage(store.port);
    expect(result).toMatchObject({
      status: 'available', sourceRank: 1, persistence: 'verified',
      data: {
        version: 7, campaignRevision: 3,
        completedLevelIds: ['t3r-cascade-05', 't5r-delta-07', 'tm-endgame-50'],
        bestLockedPieceCounts: { 't3r-cascade-05': 6, 't5r-delta-07': 7, 'tm-endgame-50': 12 },
      },
      cleanup: { removedSourceRanks: [], retainedSourceRanks: [1] },
    });
    expect(JSON.parse(store.values.get(ENDGAME_PROGRESS_KEY) ?? 'null')).toEqual(
      (result as Extract<typeof result, { status: 'available' }>).data,
    );
    expect(store.values.has(ENDGAME_PROGRESS_V6_KEY)).toBe(true);
  });

  it('maps older generic IDs before projecting them into v7', () => {
    const source = 'tetramorph:puzzle-completion:v5';
    const store = memory({
      [source]: JSON.stringify({
        version: 5,
        campaignRevision: 2,
        completedLevelIds: ['tm-puzzle-34', 'tm-puzzle-50', 't3r-cascade-05', 'tm-puzzle-21'],
        bestPieceCounts: { 'tm-puzzle-34': 7, 'tm-puzzle-50': 8, 't3r-cascade-05': 5, 'tm-puzzle-21': 6 },
      }),
    });
    expect(migrateEndgameProgressStorage(store.port)).toMatchObject({
      status: 'available', sourceRank: 2, persistence: 'verified',
      data: {
        completedLevelIds: ['t3r-cascade-05', 'tm-endgame-21', 'tm-endgame-50'],
        bestLockedPieceCounts: { 't3r-cascade-05': 5, 'tm-endgame-21': 6, 'tm-endgame-50': 8 },
      },
      cleanup: { removedSourceRanks: [2], retainedSourceRanks: [] },
    });
  });

  it('treats a present unreadable or malformed higher-priority source as terminal', () => {
    const validV6 = v6(['t3r-cascade-05'], { 't3r-cascade-05': 5 });
    const failed = memory({ [ENDGAME_PROGRESS_V6_KEY]: validV6 }, { failedReads: new Set([ENDGAME_PROGRESS_KEY]) });
    expect(migrateEndgameProgressStorage(failed.port)).toEqual({ status: 'blocked', reason: 'read-failed', sourceRank: 0 });

    const invalidV7 = memory({
      [ENDGAME_PROGRESS_KEY]: v7(['t3r-cascade-05'], { 't3r-cascade-05': 0 }),
      [ENDGAME_PROGRESS_V6_KEY]: validV6,
    });
    expect(migrateEndgameProgressStorage(invalidV7.port)).toEqual({ status: 'blocked', reason: 'invalid', sourceRank: 0 });

    const invalidV6 = memory({
      [ENDGAME_PROGRESS_V6_KEY]: '{bad',
      'tetramorph:puzzle-completion:v5': JSON.stringify({ version: 5, campaignRevision: 2, completedLevelIds: [], bestPieceCounts: {} }),
    });
    expect(migrateEndgameProgressStorage(invalidV6.port)).toEqual({ status: 'blocked', reason: 'invalid', sourceRank: 1 });
  });

  it.each([
    ['write-failed', { failedWrites: new Set([ENDGAME_PROGRESS_KEY]) }],
    ['readback-missing', { readback: () => ({ status: 'missing' } as const) }],
    ['readback-failed', { readback: () => ({ status: 'failed' } as const) }],
    ['readback-invalid', { readback: () => ({ status: 'value', value: '{}' } as const) }],
    ['readback-mismatch', { readback: () => ({ status: 'value', value: v7([], {}) } as const) }],
  ] as const)('suppresses cleanup when v6-to-v7 persistence is %s', (persistence, options) => {
    const store = memory({ [ENDGAME_PROGRESS_V6_KEY]: v6(['t3r-cascade-05'], { 't3r-cascade-05': 5 }) }, options);
    const result = migrateEndgameProgressStorage(store.port);
    expect(result).toMatchObject({ status: 'available', sourceRank: 1, persistence });
    expect(store.values.has(ENDGAME_PROGRESS_V6_KEY)).toBe(true);
  });
});

describe('isolated Endgame routes and the archived deep-link fallback', () => {
  it.each([
    ['/play/endgame/tm-endgame-34', 'tm-endgame-34'],
    ['/play/endgame/tm-endgame-40', 'tm-endgame-40'],
    ['/play/puzzle/tm-puzzle-43', 'tm-endgame-43'],
  ] as const)('returns retired deep link %s to the active library', (path, retiredEndgameId) => {
    expect(normalizeEndgameRoute(path, null)).toMatchObject({
      status: 'normalized', needsReplace: true, historyAccepted: false,
      path: '/endgames', archivedEndgameId: retiredEndgameId,
      navigation: { screen: 'endgame-library', mode: 'endgame', selectedEndgameId: 't3r-shaft-01' },
    });
  });

  it('continues to leave a valid active canonical path for the canonical router', () => {
    expect(normalizeEndgameRoute('/play/endgame/tm-endgame-31', null))
      .toEqual({ status: 'unhandled', needsReplace: false });
  });
});

describe('isolated mode-introduction migration', () => {
  it('maps, filters, deduplicates, and emits product order', () => {
    const store = memory({
      'tetramorph:mode-rule-intros:v1': JSON.stringify(['puzzle', 'race', 'bogus', 'marathon', 'puzzle', 4]),
    });
    expect(migrateEndgameRuleIntrosStorage(store.port)).toMatchObject({
      status: 'available', persistence: 'verified', data: ['marathon', 'race', 'endgame'],
    });
  });
});

describe('revision-3 route consumption in the real App', () => {
  it('replaces a retired deep link once and exposes an archived-level notice', () => {
    window.history.replaceState({}, '', '/play/endgame/tm-endgame-34');
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['endgame']));
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const view = renderApp();

    expect(window.location.pathname).toBe('/endgames');
    expect(window.history.state).toEqual(appHistoryStateFor({
      screen: 'endgame-library', mode: 'endgame', selectedEndgameId: 't3r-shaft-01',
    }));
    expect(view.container.querySelector('[data-testid="endgame-library"]')).not.toBeNull();
    expect(view.container.querySelector('[data-testid="endgame-archived-notice"]')?.getAttribute('data-archived-endgame-id'))
      .toBe('tm-endgame-34');
    expect(replaceState).toHaveBeenCalledTimes(1);
    view.unmount();
    replaceState.mockRestore();
  });
});
