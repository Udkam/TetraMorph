// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { ENDGAME_CAMPAIGN_REVISION, ENDGAME_PROGRESS_KEY } from './endgameProgress';
import { appHistoryStateFor } from './navigation/appRoute';
import type { PlatformStorageRead } from './platform/browserPlatform';
import {
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

describe('isolated Endgame progress migration', () => {
  it('maps generic IDs exactly, preserves neutral IDs, orders and verifies canonical v6', () => {
    const source = 'tetramorph:puzzle-completion:v5';
    const store = memory({
      [source]: JSON.stringify({
        version: 5,
        campaignRevision: 2,
        completedLevelIds: ['tm-puzzle-50', 't3r-shaft-01', 'tm-puzzle-21', 'tm-puzzle-21'],
        bestPieceCounts: { 'tm-puzzle-50': 9, 't3r-shaft-01': 3, 'tm-puzzle-21': 5 },
      }),
    });
    const result = migrateEndgameProgressStorage(store.port);
    expect(result).toMatchObject({
      status: 'available', persistence: 'verified', sourceRank: 1,
      data: {
        version: 6, campaignRevision: 2,
        completedLevelIds: ['t3r-shaft-01', 'tm-endgame-21', 'tm-endgame-50'],
        bestPieceCounts: { 't3r-shaft-01': 3, 'tm-endgame-21': 5, 'tm-endgame-50': 9 },
      },
    });
    expect(store.values.has(source)).toBe(false);
    expect(JSON.parse(store.values.get('tetramorph:endgame-completion:v6')!)).toEqual(
      (result as Extract<typeof result, { status: 'available' }>).data,
    );
  });

  it.each(['tm-puzzle-20', 'tm-puzzle-51', 'tm-puzzle-2x', 'unknown'])('rejects invalid id %s', (id) => {
    const store = memory({
      'tetramorph:puzzle-completion:v5': JSON.stringify({
        version: 5, campaignRevision: 2, completedLevelIds: [id], bestPieceCounts: {},
      }),
    });
    expect(migrateEndgameProgressStorage(store.port)).toEqual({ status: 'blocked', reason: 'invalid', sourceRank: 1 });
    expect(store.values.has('tetramorph:endgame-completion:v6')).toBe(false);
  });

  it('replays revision-2 invalidation for v4, v3, v2, and v1 without promoting v4 bests', () => {
    const cases = [
      ['qingliu:puzzle-completion:v4', { version: 4, completedLevelIds: ['t3r-shaft-01', 't5r-prism-11'], bestPieceCounts: { 't3r-shaft-01': 7, 't5r-prism-11': 9 } }, ['t5r-prism-11'], {}],
      ['qingliu:puzzle-completion:v3', { version: 3, completedLevelIds: ['t3r-shaft-01', 't5r-prism-11'] }, ['t5r-prism-11'], {}],
      ['qingliu:puzzle-completion:v2', { version: 2, completedLevelIds: ['t3r-shaft-01', 't5r-prism-11'] }, ['t5r-prism-11'], {}],
      ['tetris:puzzle-progress:v1', { version: 1, nextUnlockedLevelId: 't6r-veil-16' }, ['t5r-prism-11', 't5r-horizon-15'], {}],
    ] as const;
    for (const [key, payload, completedLevelIds, bestPieceCounts] of cases) {
      const result = migrateEndgameProgressStorage(memory({ [key]: JSON.stringify(payload) }).port);
      expect(result).toMatchObject({ status: 'available', persistence: 'verified', data: { completedLevelIds, bestPieceCounts } });
    }
  });

  it('preserves revision-2 v5 data while filtering revision-1 changed completions and bests', () => {
    const payload = (campaignRevision: number) => JSON.stringify({
      version: 5,
      campaignRevision,
      completedLevelIds: ['t3r-shaft-01', 't5r-prism-11', 't5r-pulse-14', 'tm-puzzle-36', 'tm-puzzle-37'],
      bestPieceCounts: { 't3r-shaft-01': 3, 't5r-prism-11': 4, 't5r-pulse-14': 5, 'tm-puzzle-36': 6, 'tm-puzzle-37': 7 },
    });
    const revisionOne = migrateEndgameProgressStorage(memory({ 'tetramorph:puzzle-completion:v5': payload(1) }).port);
    expect(revisionOne).toMatchObject({ data: {
      completedLevelIds: ['t5r-prism-11', 'tm-endgame-37'],
      bestPieceCounts: { 't5r-prism-11': 4, 'tm-endgame-37': 7 },
    } });
    const revisionTwo = migrateEndgameProgressStorage(memory({ 'tetramorph:puzzle-completion:v5': payload(2) }).port);
    expect(revisionTwo).toMatchObject({ data: {
      completedLevelIds: ['t3r-shaft-01', 't5r-prism-11', 't5r-pulse-14', 'tm-endgame-36', 'tm-endgame-37'],
      bestPieceCounts: { 't3r-shaft-01': 3, 't5r-prism-11': 4, 't5r-pulse-14': 5, 'tm-endgame-36': 6, 'tm-endgame-37': 7 },
    } });
  });

  it('uses the live 1-through-50 order rather than the later 5/25/16 roster order', () => {
    const result = migrateEndgameProgressStorage(memory({
      'tetramorph:puzzle-completion:v5': JSON.stringify({
        version: 5,
        campaignRevision: 2,
        completedLevelIds: ['t3r-cascade-06', 't3r-shaft-04', 't3r-cascade-05', 't6r-keystone-20', 't6r-veil-16'],
        bestPieceCounts: {},
      }),
    }).port);
    expect(result).toMatchObject({ data: { completedLevelIds: [
      't3r-shaft-04', 't3r-cascade-05', 't3r-cascade-06', 't6r-veil-16', 't6r-keystone-20',
    ] } });
  });

  it('lets canonical or first-present failure/invalidity block every older fallback', () => {
    const canonicalKey = 'tetramorph:endgame-completion:v6';
    const old = JSON.stringify({ version: 2, completedLevelIds: ['t3r-shaft-01'] });
    const failed = memory({ 'qingliu:puzzle-completion:v2': old }, { failedReads: new Set([canonicalKey]) });
    expect(migrateEndgameProgressStorage(failed.port)).toEqual({ status: 'blocked', reason: 'read-failed', sourceRank: 0 });

    const invalid = memory({
      'tetramorph:puzzle-completion:v5': '{bad',
      'qingliu:puzzle-completion:v2': old,
    });
    expect(migrateEndgameProgressStorage(invalid.port)).toEqual({ status: 'blocked', reason: 'invalid', sourceRank: 1 });
    expect(invalid.values.has(canonicalKey)).toBe(false);
  });

  it.each([
    ['write-failed', { failedWrites: new Set(['tetramorph:endgame-completion:v6']) }],
    ['readback-missing', { readback: () => ({ status: 'missing' } as const) }],
    ['readback-failed', { readback: () => ({ status: 'failed' } as const) }],
    ['readback-invalid', { readback: () => ({ status: 'value', value: '{}' } as const) }],
    ['readback-mismatch', { readback: () => ({ status: 'value', value: JSON.stringify({ version: 6, campaignRevision: 2, completedLevelIds: [], bestPieceCounts: {} }) } as const) }],
  ] as const)('keeps live converted data but suppresses cleanup on %s', (persistence, options) => {
    const key = 'qingliu:puzzle-completion:v2';
    const store = memory({ [key]: JSON.stringify({ version: 2, completedLevelIds: ['t5r-prism-11'] }) }, options);
    const result = migrateEndgameProgressStorage(store.port);
    expect(result).toMatchObject({ status: 'available', persistence, data: { completedLevelIds: ['t5r-prism-11'] } });
    expect(store.values.has(key)).toBe(true);
  });

  it('does not rewrite valid canonical v6 and only attempts cleanup for present sources', () => {
    let writes = 0;
    const canonical = JSON.stringify({
      version: 6, campaignRevision: 2,
      completedLevelIds: ['t3r-shaft-01', 't3r-shaft-04', 'tm-endgame-21'],
      bestPieceCounts: { 't3r-shaft-04': 4 },
    });
    const store = memory({
      'tetramorph:endgame-completion:v6': canonical,
      'qingliu:puzzle-completion:v2': JSON.stringify({ version: 2, completedLevelIds: [] }),
    });
    const port = {
      ...store.port,
      writeStorage(key: string, value: string) { writes += 1; return store.port.writeStorage(key, value); },
    };
    const result = migrateEndgameProgressStorage(port);
    expect(result).toMatchObject({ status: 'available', sourceRank: 0, persistence: 'verified', cleanup: {
      removedSourceRanks: [5], retainedSourceRanks: [],
    } });
    expect(writes).toBe(0);
  });

  it('cleans every source independently and reports partial removal for retry', () => {
    const blocked = 'qingliu:puzzle-completion:v3';
    const store = memory({
      'qingliu:puzzle-completion:v2': JSON.stringify({ version: 2, completedLevelIds: [] }),
      [blocked]: JSON.stringify({ version: 3, completedLevelIds: [] }),
    }, { failedRemovals: new Set([blocked]) });
    const result = migrateEndgameProgressStorage(store.port);
    expect(result).toMatchObject({
      status: 'available', persistence: 'verified',
      cleanup: { removedSourceRanks: [5], retainedSourceRanks: [4] },
    });
    expect(store.values.has(blocked)).toBe(true);
  });
});

describe('isolated mode-introduction migration', () => {
  it('maps, deduplicates, filters, and emits product order', () => {
    const store = memory({
      'tetramorph:mode-rule-intros:v1': JSON.stringify(['puzzle', 'race', 'bogus', 'marathon', 'puzzle', 4]),
    });
    expect(migrateEndgameRuleIntrosStorage(store.port)).toMatchObject({
      status: 'available', persistence: 'verified', data: ['marathon', 'race', 'endgame'],
    });
  });

  it('blocks fallback when the first present intro value cannot be read or parsed', () => {
    const store = memory({
      'tetramorph:mode-rule-intros:v1': 'not-json',
      'tetris:mode-rule-intros:v1': JSON.stringify(['marathon']),
    });
    expect(migrateEndgameRuleIntrosStorage(store.port)).toEqual({ status: 'blocked', reason: 'invalid', sourceRank: 1 });
  });
});

describe('isolated Endgame URL and history normalization', () => {
  const history = (screen: string, selectedPuzzleId: string, mode = 'puzzle') => ({
    tetramorphRoute: { version: 1, navigation: { screen, mode, selectedPuzzleId } },
  });

  it('lets a valid library history preserve selection and returns one replace payload', () => {
    expect(normalizeEndgameRoute('/puzzles/', history('puzzle-library', 'tm-puzzle-22'))).toEqual({
      status: 'normalized', needsReplace: true, historyAccepted: true, path: '/endgames',
      navigation: { screen: 'endgame-library', mode: 'endgame', selectedEndgameId: 'tm-endgame-22' },
      historyState: { tetramorphRoute: { version: 2, navigation: {
        screen: 'endgame-library', mode: 'endgame', selectedEndgameId: 'tm-endgame-22',
      } } },
    });
  });

  it('makes a play path authoritative over disagreeing or malformed history', () => {
    const result = normalizeEndgameRoute('/play/puzzle/tm-puzzle-23', history('game', 'tm-puzzle-22'));
    expect(result).toMatchObject({
      status: 'normalized', needsReplace: true, historyAccepted: false,
      path: '/play/endgame/tm-endgame-23',
      navigation: { screen: 'game', mode: 'endgame', selectedEndgameId: 'tm-endgame-23' },
    });
  });

  it.each(['/play/puzzle/%E0%A4%A', '/play/puzzle/tm-puzzle-20', '/play/puzzle/unknown'])
  ('falls back invalid legacy play path %s to the canonical library', (path) => {
    expect(normalizeEndgameRoute(path, null)).toMatchObject({
      status: 'normalized', needsReplace: true, historyAccepted: false, path: '/endgames',
      navigation: { screen: 'endgame-library', mode: 'endgame', selectedEndgameId: 't3r-shaft-01' },
    });
  });

  it('does not claim canonical or unrelated paths and rejects mixed history fields', () => {
    expect(normalizeEndgameRoute('/endgames', history('puzzle-library', 'tm-puzzle-22'))).toMatchObject({
      status: 'normalized', path: '/endgames', historyAccepted: true,
      navigation: { selectedEndgameId: 'tm-endgame-22' },
    });
    expect(normalizeEndgameRoute('/elsewhere', null)).toEqual({ status: 'unhandled', needsReplace: false });
    const mixed = history('puzzle-library', 'tm-puzzle-22') as Record<string, unknown>;
    (mixed.tetramorphRoute as { navigation: Record<string, unknown> }).navigation.selectedEndgameId = 'tm-endgame-22';
    expect(normalizeEndgameRoute('/puzzles', mixed)).toMatchObject({ historyAccepted: false });
  });

  it.each([
    ['/', history('home', 'tm-puzzle-22', 'marathon'), 'home', 'marathon'],
    ['/play/classic', history('game', 'tm-puzzle-22', 'marathon'), 'game', 'marathon'],
    ['/play/survival', history('game', 'tm-puzzle-22', 'race'), 'game', 'race'],
    ['/play/mutation', history('game', 'tm-puzzle-22', 'sprint'), 'game', 'sprint'],
  ] as const)('upgrades matching v1 history on unchanged path %s', (path, state, screen, mode) => {
    expect(normalizeEndgameRoute(path, state)).toMatchObject({
      status: 'normalized', needsReplace: true, historyAccepted: true, path,
      navigation: { screen, mode, selectedEndgameId: 'tm-endgame-22' },
    });
  });

  it('upgrades matching v1 history on a canonical Endgame play path while path ID wins', () => {
    expect(normalizeEndgameRoute('/play/endgame/tm-endgame-23', history('game', 'tm-puzzle-22'))).toMatchObject({
      status: 'normalized', needsReplace: true, historyAccepted: false,
      path: '/play/endgame/tm-endgame-23',
      navigation: { screen: 'game', mode: 'endgame', selectedEndgameId: 'tm-endgame-23' },
    });
  });

  it('leaves valid canonical paths to the canonical router when v1 history is malformed or mismatched', () => {
    expect(normalizeEndgameRoute('/play/classic', history('game', 'tm-puzzle-22', 'race')))
      .toEqual({ status: 'unhandled', needsReplace: false });
    expect(normalizeEndgameRoute('/endgames', { malformed: true }))
      .toEqual({ status: 'unhandled', needsReplace: false });
    expect(normalizeEndgameRoute('/play/endgame/tm-endgame-23', null))
      .toEqual({ status: 'unhandled', needsReplace: false });
  });

  it('rejects mismatched screens, modes, versions, and extra navigation fields as history input', () => {
    const cases: unknown[] = [
      history('game', 'tm-puzzle-22'),
      history('puzzle-library', 'tm-puzzle-22', 'marathon'),
      { tetramorphRoute: { version: 2, navigation: {
        screen: 'endgame-library', mode: 'endgame', selectedPuzzleId: 'tm-puzzle-22',
      } } },
      { tetramorphRoute: { version: 1, navigation: {
        screen: 'puzzle-library', mode: 'puzzle', selectedPuzzleId: 'tm-puzzle-22', extra: true,
      } } },
    ];
    for (const value of cases) {
      expect(normalizeEndgameRoute('/puzzles', value)).toMatchObject({
        status: 'normalized', historyAccepted: false,
        navigation: { selectedEndgameId: 't3r-shaft-01' },
      });
    }
  });
});

describe('isolated migration consumed by real App boot', () => {
  it('normalizes the retired library URL and selected level through one history replacement', () => {
    const retiredHistory = {
      tetramorphRoute: {
        version: 1,
        navigation: {
          screen: 'puzzle-library',
          mode: 'puzzle',
          selectedPuzzleId: 'tm-puzzle-22',
        },
      },
    };
    window.history.replaceState(retiredHistory, '', '/puzzles');
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['endgame']));
    const replaceState = vi.spyOn(window.history, 'replaceState');

    const view = renderApp();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/endgames');
    expect(window.history.state).toEqual(appHistoryStateFor({
      screen: 'endgame-library',
      mode: 'endgame',
      selectedEndgameId: 'tm-endgame-22',
    }));
    expect(view.container.querySelector('[data-testid="endgame-library"]')).not.toBeNull();
    expect(view.container.querySelector('[data-level-id="tm-endgame-22"]')?.getAttribute('aria-pressed')).toBe('true');
    view.unmount();
    replaceState.mockRestore();
  });

  it('migrates retired progress and introductions before the first interactive route', () => {
    const retiredProgressKey = 'tetramorph:puzzle-completion:v5';
    const retiredIntroKey = 'tetramorph:mode-rule-intros:v1';
    localStorage.setItem(retiredProgressKey, JSON.stringify({
      version: 5,
      campaignRevision: 2,
      completedLevelIds: ['t3r-shaft-01', 'tm-puzzle-21'],
      bestPieceCounts: { 't3r-shaft-01': 3, 'tm-puzzle-21': 7 },
    }));
    localStorage.setItem(retiredIntroKey, JSON.stringify(['puzzle', 'marathon']));

    const view = renderApp();

    expect(JSON.parse(localStorage.getItem(ENDGAME_PROGRESS_KEY) ?? 'null')).toEqual({
      version: 6,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: ['t3r-shaft-01', 'tm-endgame-21'],
      bestPieceCounts: { 't3r-shaft-01': 3, 'tm-endgame-21': 7 },
    });
    expect(JSON.parse(localStorage.getItem('tetramorph:mode-rule-intros:v2') ?? 'null'))
      .toEqual(['marathon', 'endgame']);
    expect(localStorage.getItem(retiredProgressKey)).toBeNull();
    expect(localStorage.getItem(retiredIntroKey)).toBeNull();

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]')?.click());
    expect(view.container.querySelector('[data-testid="entry-mode-rules"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="endgame-library"]')).not.toBeNull();
    expect(view.container.querySelector('[data-level-id="t3r-shaft-01"]')?.getAttribute('data-best-pieces')).toBe('3');
    view.unmount();
  });
});
