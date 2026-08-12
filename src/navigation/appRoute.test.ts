import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LEVELS } from '../endgameProgress';
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
  const firstEndgameId = CAMPAIGN_LEVELS[0]!.id;

  it('maps public inner-page paths to stable application state', () => {
    expect(parseAppPath('/')).toEqual(DEFAULT_APP_NAVIGATION);
    expect(parseAppPath('/endgames/')).toMatchObject({ screen: 'endgame-library', mode: 'endgame' });
    expect(parseAppPath('/play/classic')).toMatchObject({ screen: 'game', mode: 'marathon' });
    expect(parseAppPath('/play/survival')).toMatchObject({ screen: 'game', mode: 'race' });
    expect(parseAppPath('/play/mutation')).toMatchObject({ screen: 'game', mode: 'sprint' });
    expect(parseAppPath(`/play/endgame/${firstEndgameId}`)).toEqual({
      screen: 'game',
      mode: 'endgame',
      selectedEndgameId: firstEndgameId,
    });
  });

  it('rejects malformed and unknown deep links instead of starting arbitrary state', () => {
    expect(parseAppPath('/play/endgame/not-a-level')).toBeNull();
    expect(parseAppPath('/play/unknown')).toBeNull();
    expect(parseAppPath('/something-else')).toBeNull();
  });

  it('serialises every application destination to a real route', () => {
    expect(appPathFor(DEFAULT_APP_NAVIGATION)).toBe('/');
    expect(appPathFor(navigationForMode('marathon', firstEndgameId))).toBe('/play/classic');
    expect(appPathFor(navigationForMode('race', firstEndgameId))).toBe('/play/survival');
    expect(appPathFor(navigationForMode('sprint', firstEndgameId))).toBe('/play/mutation');
    expect(appPathFor(navigationForMode('endgame', firstEndgameId))).toBe('/endgames');
    expect(appPathFor({ screen: 'game', mode: 'endgame', selectedEndgameId: firstEndgameId }))
      .toBe(`/play/endgame/${firstEndgameId}`);
  });

  it('restores validated route context without allowing history to override the URL', () => {
    const secondEndgameId = CAMPAIGN_LEVELS[1]!.id;
    const library = { screen: 'endgame-library', mode: 'endgame', selectedEndgameId: secondEndgameId } as const;
    const saved = appHistoryStateFor(library);

    expect(appNavigationFromHistory('/endgames', saved)).toEqual(library);
    expect(appNavigationFromHistory('/', saved)).toEqual(DEFAULT_APP_NAVIGATION);
    expect(appNavigationFromHistory('/endgames', {
      tetramorphRoute: { version: 2, navigation: { ...library, selectedEndgameId: 'unknown' } },
    })).toEqual(parseAppPath('/endgames'));
    expect(appNavigationFromHistory('/endgames', {
      tetramorphRoute: { version: 2, navigation: { ...library, extra: true } },
    })).toEqual(parseAppPath('/endgames'));
    expect(appNavigationFromHistory('/endgames', {
      tetramorphRoute: { version: 2, navigation: library, extra: true },
    })).toEqual(parseAppPath('/endgames'));
    expect(appNavigationFromHistory('/endgames', {
      tetramorphRoute: { version: 2, navigation: library }, extra: true,
    })).toEqual(parseAppPath('/endgames'));
  });

  it('derives calm transition direction from route hierarchy', () => {
    const classic = navigationForMode('marathon', firstEndgameId);
    const library = navigationForMode('endgame', firstEndgameId);
    const endgameGame = { screen: 'game', mode: 'endgame', selectedEndgameId: firstEndgameId } as const;

    expect(routeTransitionDirection(DEFAULT_APP_NAVIGATION, classic)).toBe('forward');
    expect(routeTransitionDirection(DEFAULT_APP_NAVIGATION, library)).toBe('forward');
    expect(routeTransitionDirection(library, endgameGame)).toBe('forward');
    expect(routeTransitionDirection(endgameGame, library)).toBe('back');
    expect(routeTransitionDirection(classic, library)).toBe('neutral');
  });
});
