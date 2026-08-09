import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LEVELS } from '../puzzleProgress';
import {
  DEFAULT_APP_NAVIGATION,
  appHistoryStateFor,
  appNavigationFromHistory,
  appPathFor,
  navigationForMode,
  parseAppPath,
  routeTransitionDirection,
} from './appRoute';

describe('appRoute', () => {
  const firstPuzzleId = CAMPAIGN_LEVELS[0]!.id;

  it('maps public inner-page paths to stable application state', () => {
    expect(parseAppPath('/')).toEqual(DEFAULT_APP_NAVIGATION);
    expect(parseAppPath('/puzzles/')).toMatchObject({ screen: 'puzzle-library', mode: 'puzzle' });
    expect(parseAppPath('/play/classic')).toMatchObject({ screen: 'game', mode: 'marathon' });
    expect(parseAppPath('/play/survival')).toMatchObject({ screen: 'game', mode: 'race' });
    expect(parseAppPath('/play/mutation')).toMatchObject({ screen: 'game', mode: 'sprint' });
    expect(parseAppPath(`/play/puzzle/${firstPuzzleId}`)).toEqual({
      screen: 'game',
      mode: 'puzzle',
      selectedPuzzleId: firstPuzzleId,
    });
  });

  it('rejects malformed and unknown deep links instead of starting arbitrary state', () => {
    expect(parseAppPath('/play/puzzle/not-a-level')).toBeNull();
    expect(parseAppPath('/play/unknown')).toBeNull();
    expect(parseAppPath('/something-else')).toBeNull();
  });

  it('serialises every application destination to a real route', () => {
    expect(appPathFor(DEFAULT_APP_NAVIGATION)).toBe('/');
    expect(appPathFor(navigationForMode('marathon', firstPuzzleId))).toBe('/play/classic');
    expect(appPathFor(navigationForMode('race', firstPuzzleId))).toBe('/play/survival');
    expect(appPathFor(navigationForMode('sprint', firstPuzzleId))).toBe('/play/mutation');
    expect(appPathFor(navigationForMode('puzzle', firstPuzzleId))).toBe('/puzzles');
    expect(appPathFor({ screen: 'game', mode: 'puzzle', selectedPuzzleId: firstPuzzleId }))
      .toBe(`/play/puzzle/${firstPuzzleId}`);
  });

  it('restores validated route context without allowing history to override the URL', () => {
    const secondPuzzleId = CAMPAIGN_LEVELS[1]!.id;
    const library = { screen: 'puzzle-library', mode: 'puzzle', selectedPuzzleId: secondPuzzleId } as const;
    const saved = appHistoryStateFor(library);

    expect(appNavigationFromHistory('/puzzles', saved)).toEqual(library);
    expect(appNavigationFromHistory('/', saved)).toEqual(DEFAULT_APP_NAVIGATION);
    expect(appNavigationFromHistory('/puzzles', {
      tetramorphRoute: { version: 1, navigation: { ...library, selectedPuzzleId: 'unknown' } },
    })).toEqual(parseAppPath('/puzzles'));
  });

  it('derives calm transition direction from route hierarchy', () => {
    const classic = navigationForMode('marathon', firstPuzzleId);
    const library = navigationForMode('puzzle', firstPuzzleId);
    const puzzleGame = { screen: 'game', mode: 'puzzle', selectedPuzzleId: firstPuzzleId } as const;

    expect(routeTransitionDirection(DEFAULT_APP_NAVIGATION, classic)).toBe('forward');
    expect(routeTransitionDirection(DEFAULT_APP_NAVIGATION, library)).toBe('forward');
    expect(routeTransitionDirection(library, puzzleGame)).toBe('forward');
    expect(routeTransitionDirection(puzzleGame, library)).toBe('back');
    expect(routeTransitionDirection(classic, library)).toBe('neutral');
  });
});
