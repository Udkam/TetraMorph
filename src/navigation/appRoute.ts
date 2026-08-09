import type { GameMode, PuzzleId } from '../game/core';
import { CAMPAIGN_LEVELS } from '../puzzleProgress';

export type AppScreen = 'home' | 'puzzle-library' | 'game';

export interface AppNavigationState {
  screen: AppScreen;
  mode: GameMode;
  selectedPuzzleId: PuzzleId;
}

export type RouteTransitionDirection = 'forward' | 'back' | 'neutral';

interface AppRouteHistoryPayload {
  readonly version: 1;
  readonly navigation: AppNavigationState;
}

export interface AppRouteHistoryState {
  readonly tetramorphRoute: AppRouteHistoryPayload;
}

const FIRST_PUZZLE_ID = CAMPAIGN_LEVELS[0]!.id;
const PUZZLE_IDS = new Set<PuzzleId>(CAMPAIGN_LEVELS.map((level) => level.id));
const GAME_MODES = new Set<GameMode>(['marathon', 'race', 'sprint', 'puzzle']);

export const DEFAULT_APP_NAVIGATION: AppNavigationState = Object.freeze({
  screen: 'home',
  mode: 'marathon',
  selectedPuzzleId: FIRST_PUZZLE_ID,
});

function cleanPath(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

function state(screen: AppScreen, mode: GameMode, selectedPuzzleId = FIRST_PUZZLE_ID): AppNavigationState {
  return { screen, mode, selectedPuzzleId };
}

export function parseAppPath(pathname: string): AppNavigationState | null {
  const path = cleanPath(pathname || '/');
  if (path === '/') return state('home', 'marathon');
  if (path === '/puzzles') return state('puzzle-library', 'puzzle');
  if (path === '/play/classic') return state('game', 'marathon');
  if (path === '/play/survival') return state('game', 'race');
  if (path === '/play/mutation') return state('game', 'sprint');

  const puzzleMatch = /^\/play\/puzzle\/([^/]+)$/.exec(path);
  if (!puzzleMatch) return null;
  try {
    const puzzleId = decodeURIComponent(puzzleMatch[1]!) as PuzzleId;
    return PUZZLE_IDS.has(puzzleId) ? state('game', 'puzzle', puzzleId) : null;
  } catch {
    return null;
  }
}

export function appPathFor(navigation: AppNavigationState): string {
  if (navigation.screen === 'home') return '/';
  if (navigation.screen === 'puzzle-library') return '/puzzles';
  if (navigation.mode === 'marathon') return '/play/classic';
  if (navigation.mode === 'race') return '/play/survival';
  if (navigation.mode === 'sprint') return '/play/mutation';
  return `/play/puzzle/${encodeURIComponent(navigation.selectedPuzzleId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppNavigationState(value: unknown): value is AppNavigationState {
  if (!isRecord(value)) return false;
  const { screen, mode, selectedPuzzleId } = value;
  if (screen !== 'home' && screen !== 'puzzle-library' && screen !== 'game') return false;
  if (typeof mode !== 'string' || !GAME_MODES.has(mode as GameMode)) return false;
  if (typeof selectedPuzzleId !== 'string' || !PUZZLE_IDS.has(selectedPuzzleId as PuzzleId)) return false;
  if (screen === 'home') return mode === 'marathon';
  if (screen === 'puzzle-library') return mode === 'puzzle';
  return mode !== 'puzzle' || PUZZLE_IDS.has(selectedPuzzleId as PuzzleId);
}

export function appHistoryStateFor(navigation: AppNavigationState): AppRouteHistoryState {
  return {
    tetramorphRoute: {
      version: 1,
      navigation: { ...navigation },
    },
  };
}

export function appNavigationFromHistory(pathname: string, historyState: unknown): AppNavigationState | null {
  const parsed = parseAppPath(pathname);
  if (!parsed || !isRecord(historyState)) return parsed;
  const payload = historyState.tetramorphRoute;
  if (!isRecord(payload) || payload.version !== 1 || !isAppNavigationState(payload.navigation)) return parsed;
  return appPathFor(payload.navigation) === cleanPath(pathname || '/')
    ? { ...payload.navigation }
    : parsed;
}

function appRouteDepth(navigation: AppNavigationState): number {
  if (navigation.screen === 'home') return 0;
  if (navigation.screen === 'puzzle-library') return 1;
  return navigation.mode === 'puzzle' ? 2 : 1;
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
  selectedPuzzleId: PuzzleId,
): AppNavigationState {
  return mode === 'puzzle'
    ? state('puzzle-library', mode, selectedPuzzleId)
    : state('game', mode, selectedPuzzleId);
}
