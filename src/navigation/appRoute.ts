import type { GameMode, EndgameId } from '../game/core';
import { CAMPAIGN_LEVELS } from '../endgameProgress';

export type AppScreen = 'home' | 'endgame-library' | 'game';

export interface AppNavigationState {
  screen: AppScreen;
  mode: GameMode;
  selectedEndgameId: EndgameId;
}

export type RouteTransitionDirection = 'forward' | 'back' | 'neutral';

interface AppRouteHistoryPayload {
  readonly version: 2;
  readonly navigation: AppNavigationState;
}

export interface AppRouteHistoryState {
  readonly tetramorphRoute: AppRouteHistoryPayload;
}

const FIRST_ENDGAME_ID = CAMPAIGN_LEVELS[0]!.id;
const ENDGAME_IDS = new Set<EndgameId>(CAMPAIGN_LEVELS.map((level) => level.id));
const GAME_MODES = new Set<GameMode>(['marathon', 'race', 'sprint', 'endgame']);

export const DEFAULT_APP_NAVIGATION: AppNavigationState = Object.freeze({
  screen: 'home',
  mode: 'marathon',
  selectedEndgameId: FIRST_ENDGAME_ID,
});

function cleanPath(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

function state(screen: AppScreen, mode: GameMode, selectedEndgameId = FIRST_ENDGAME_ID): AppNavigationState {
  return { screen, mode, selectedEndgameId };
}

export function parseAppPath(pathname: string): AppNavigationState | null {
  const path = cleanPath(pathname || '/');
  if (path === '/') return state('home', 'marathon');
  if (path === '/endgames') return state('endgame-library', 'endgame');
  if (path === '/play/classic') return state('game', 'marathon');
  if (path === '/play/survival') return state('game', 'race');
  if (path === '/play/mutation') return state('game', 'sprint');

  const endgameMatch = /^\/play\/endgame\/([^/]+)$/.exec(path);
  if (!endgameMatch) return null;
  try {
    const endgameId = decodeURIComponent(endgameMatch[1]!) as EndgameId;
    return ENDGAME_IDS.has(endgameId) ? state('game', 'endgame', endgameId) : null;
  } catch {
    return null;
  }
}

export function appPathFor(navigation: AppNavigationState): string {
  if (navigation.screen === 'home') return '/';
  if (navigation.screen === 'endgame-library') return '/endgames';
  if (navigation.mode === 'marathon') return '/play/classic';
  if (navigation.mode === 'race') return '/play/survival';
  if (navigation.mode === 'sprint') return '/play/mutation';
  return `/play/endgame/${encodeURIComponent(navigation.selectedEndgameId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isAppNavigationState(value: unknown): value is AppNavigationState {
  if (!isRecord(value) || !hasExactKeys(value, ['screen', 'mode', 'selectedEndgameId'])) return false;
  const { screen, mode, selectedEndgameId } = value;
  if (screen !== 'home' && screen !== 'endgame-library' && screen !== 'game') return false;
  if (typeof mode !== 'string' || !GAME_MODES.has(mode as GameMode)) return false;
  if (typeof selectedEndgameId !== 'string' || !ENDGAME_IDS.has(selectedEndgameId as EndgameId)) return false;
  if (screen === 'home') return mode === 'marathon';
  if (screen === 'endgame-library') return mode === 'endgame';
  return mode !== 'endgame' || ENDGAME_IDS.has(selectedEndgameId as EndgameId);
}

export function appHistoryStateFor(navigation: AppNavigationState): AppRouteHistoryState {
  return {
    tetramorphRoute: {
      version: 2,
      navigation: { ...navigation },
    },
  };
}

export function appNavigationFromHistory(pathname: string, historyState: unknown): AppNavigationState | null {
  const parsed = parseAppPath(pathname);
  if (!parsed || !isRecord(historyState) || !hasExactKeys(historyState, ['tetramorphRoute'])) return parsed;
  const payload = historyState.tetramorphRoute;
  if (!isRecord(payload)
    || !hasExactKeys(payload, ['version', 'navigation'])
    || payload.version !== 2
    || !isAppNavigationState(payload.navigation)) return parsed;
  return appPathFor(payload.navigation) === cleanPath(pathname || '/')
    ? { ...payload.navigation }
    : parsed;
}

function appRouteDepth(navigation: AppNavigationState): number {
  if (navigation.screen === 'home') return 0;
  if (navigation.screen === 'endgame-library') return 1;
  return navigation.mode === 'endgame' ? 2 : 1;
}

export function routeTransitionDirection(
  previous: AppNavigationState,
  next: AppNavigationState,
): RouteTransitionDirection {
  const difference = appRouteDepth(next) - appRouteDepth(previous);
  if (difference > 0) return 'forward';
  if (difference < 0) return 'back';
  return 'neutral';
}

export function navigationForMode(
  mode: GameMode,
  selectedEndgameId: EndgameId,
): AppNavigationState {
  return mode === 'endgame'
    ? state('endgame-library', mode, selectedEndgameId)
    : state('game', mode, selectedEndgameId);
}
