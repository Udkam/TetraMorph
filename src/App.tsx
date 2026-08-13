import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { flushSync } from 'react-dom';
import {
  ANCHOR_CELL,
  CLASSIC_GRAVITY_CHOICES_TICKS,
  CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
  CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
  MUTATION_EFFECT_TICKS,
  MUTATION_FREEZE_GRAVITY_TICKS,
  MUTATION_SUPERGRAVITY_PIECES,
  PIECE_TYPES,
  SURVIVAL_RISES_PER_AFTERSHOCK,
  TICKS_PER_SECOND,
  type GameEvent,
  type GameMode,
  type GameState,
  type MutationItem,
  type PieceType,
  type EndgameId,
  createInitialState,
  getEndgameDefinition,
  gravityForMode,
  nextMutationPreviewItem,
  normalizeClassicGravityFloorTicks,
  normalizeClassicStartingGravityTicks,
  survivalIntervalSeconds,
  survivalIntervalTicks,
} from './game/core';
import { GameRuntime, randomRunSeed } from './game/runtime/GameRuntime';
import { browserPlatform, type PlatformFrame, type PlatformTimeout } from './platform/browserPlatform';
import {
  DEFAULT_APP_NAVIGATION,
  appHistoryStateFor,
  appNavigationFromHistory,
  appPathFor,
  navigationForMode,
  routeTransitionDirection,
  type AppNavigationState,
  type RouteTransitionDirection,
} from './navigation/appRoute';
import {
  CAMPAIGN_LEVELS,
  ENDGAME_CATEGORIES,
  ENDGAME_PROGRESS_KEY,
  defaultEndgameProgress,
  isEndgameUnlocked,
  endgameMasteryGateStatus,
  endgameBestPieceCount,
  recordCanonicalEndgameCompletion,
  type EndgameProgress,
  type EndgameCategoryId,
} from './endgameProgress';
import {
  migrateEndgameProgressStorage,
  migrateEndgameRuleIntrosStorage,
  normalizeEndgameRoute,
} from './legacyEndgameMigration';
import { endgameLessonFor } from './endgameLessons';
import { ENDGAME_HARD_MASTERY_GROUPS, endgameOptimalCertificate } from './endgameMastery';
import {
  DEFAULT_VISUAL_THEME,
  VISUAL_THEMES,
  VISUAL_THEME_STORAGE_KEY,
  parseVisualTheme,
  type VisualThemeId,
} from './design/visualThemes';
import { ANCHOR_MATERIAL, PIECE_MATERIALS } from './game/render/theme';
import { nextPreviewPieces, survivalDebrisCells } from './game/render/presentation';
import { ActionSheet, ActionSheetFamily } from './ui/ActionSheet';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  appCopy,
  formatDate,
  formatNumber,
  initialLanguage,
  itemLabel,
  modeCopy,
  modeIntroRules,
  modeRules,
  modeRulesTitle,
  parseLanguage,
  endgameDisplayName,
  type AppLanguage,
  type EndgameCelebrationOutcome,
} from './ui/localization';
import {
  CLASSIC_DIFFICULTY_GRADES,
  LEADERBOARD_KEY,
  LEGACY_LEADERBOARD_KEYS,
  classicDifficultyGrade,
  emptyLeaderboard,
  insertScoreRecord,
  parseLeaderboard,
  recordsForMode,
  type Leaderboard,
  type ClassicDifficultyGrade,
  type RunMode,
  type ScoreRecord,
} from './leaderboard';

type ExitDestination = 'home' | 'endgame-library';
type EntryCountdownDigit = 3 | 2 | 1;
type SettingsTab = 'settings' | 'controls' | 'rules';
type SettingsTabPresence = Readonly<{ tab: SettingsTab; epoch: number; animate: boolean; reduced: boolean }>;
type CurtainKind = 'pause' | 'restart';
type CurtainPresence = Readonly<{ kind: CurtainKind; phase: 'enter' | 'steady' | 'exit'; epoch: number; reduced: boolean }>;
type ReducedMotionOverride = boolean | null;
export type EndgameCelebration = {
  outcome: EndgameCelebrationOutcome;
  pieces: number;
  lines: number;
  previousBest: number | null;
};
export type ClassicGravityRange = {
  startingTicks: number;
  floorTicks: number;
};

const APP_SEED = 0x51a1f00d;
const PRODUCT_NAME = 'TetraMorph';
const ENTRY_COUNTDOWN_STEP_MS = 500;
const ENTRY_COVER_EXIT_MS = 120;
const CURTAIN_ENTER_MS = 180;
const CURTAIN_EXIT_MS = 120;
const CURTAIN_REDUCED_MS = 32;

function settingsTabPresenceReducer(
  state: SettingsTabPresence,
  action:
    | { readonly type: 'reset'; readonly reduced: boolean }
    | { readonly type: 'select'; readonly tab: SettingsTab; readonly reduced: boolean }
    | { readonly type: 'reduce' },
): SettingsTabPresence {
  if (action.type === 'reset') return { ...state, tab: 'settings', animate: false, reduced: action.reduced };
  if (action.type === 'reduce') return state.reduced ? state : { ...state, reduced: true };
  if (action.tab === state.tab) return state;
  return { tab: action.tab, epoch: state.epoch + 1, animate: true, reduced: action.reduced };
}
const ROUTE_FALLBACK_MS = 160;
const ROUTE_REDUCED_MS = 32;
const ROUTE_READY_TIMEOUT_MS = 800;
const NOOP = () => undefined;

type AppRouteResolution = Readonly<{
  navigation: AppNavigationState;
  replacement: Readonly<{ path: string; state: unknown }> | null;
}>;

function resolveAppNavigation(pathname: string, historyState: unknown): AppRouteResolution {
  const legacy = normalizeEndgameRoute(pathname, historyState);
  if (legacy.status === 'normalized') {
    return {
      navigation: { ...legacy.navigation },
      replacement: { path: legacy.path, state: legacy.historyState },
    };
  }
  const canonical = appNavigationFromHistory(pathname, historyState);
  if (canonical) return { navigation: canonical, replacement: null };
  return {
    navigation: DEFAULT_APP_NAVIGATION,
    replacement: {
      path: appPathFor(DEFAULT_APP_NAVIGATION),
      state: appHistoryStateFor(DEFAULT_APP_NAVIGATION),
    },
  };
}

function readAppNavigation(): AppNavigationState {
  const target = browserPlatform.windowTarget();
  return resolveAppNavigation(target?.location.pathname ?? '/', target?.history.state).navigation;
}
const MODE_RULE_INTROS_KEY = 'tetramorph:mode-rule-intros:v2';
export const REDUCED_MOTION_STORAGE_KEY = 'tetramorph:reduced-motion:v1';
export const CLASSIC_GRAVITY_RANGE_STORAGE_KEY = 'tetramorph:classic-gravity-range:v1';
const LEGACY_CLASSIC_STARTING_GRAVITY_STORAGE_KEY = 'tetramorph:classic-start-gravity:v1';

const MODE_ORDER: readonly GameMode[] = ['marathon', 'race', 'sprint', 'endgame'];

export function cloneQaState(state: GameState): GameState {
  return structuredClone(state);
}

type PersistedBootstrap<T> = Readonly<{ value: T; canPersist: boolean }>;

function readModeRuleIntros(): PersistedBootstrap<readonly GameMode[]> {
  const result = migrateEndgameRuleIntrosStorage(browserPlatform);
  if (result.status === 'available') {
    return {
      value: Object.freeze([...result.data]) as readonly GameMode[],
      canPersist: result.persistence === 'verified',
    };
  }
  if (result.status === 'blocked') {
    return { value: MODE_ORDER, canPersist: false };
  }
  return { value: Object.freeze([]), canPersist: true };
}

function readLanguage(): AppLanguage {
  try {
    const saved = parseLanguage(browserPlatform.readStorage(LANGUAGE_STORAGE_KEY));
    if (saved !== null) return saved;
    return initialLanguage(browserPlatform.windowTarget()?.navigator.language);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function writeLanguage(language: AppLanguage): void {
  try {
    browserPlatform.writeStorage(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage is optional: the active session still switches language immediately.
  }
}

function readVisualTheme(): VisualThemeId {
  try {
    return parseVisualTheme(browserPlatform.readStorage(VISUAL_THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_VISUAL_THEME;
  }
}

function writeVisualTheme(theme: VisualThemeId): void {
  try {
    browserPlatform.writeStorage(VISUAL_THEME_STORAGE_KEY, theme);
  } catch {
    // Storage is optional: the active surface still adopts the theme immediately.
  }
}

function normalizeClassicGravityRange(range: ClassicGravityRange): ClassicGravityRange {
  const startingTicks = normalizeClassicStartingGravityTicks(range.startingTicks);
  return {
    startingTicks,
    floorTicks: normalizeClassicGravityFloorTicks(range.floorTicks, startingTicks),
  };
}

export function parseClassicGravityRange(
  value: string | null,
  legacyStartingValue: string | null = null,
): ClassicGravityRange {
  const fallback = {
    startingTicks: CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
    floorTicks: CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
  };
  const source = value?.trim();
  if (source) {
    try {
      const parsed: unknown = JSON.parse(source);
      if (typeof parsed === 'number') {
        return normalizeClassicGravityRange({ startingTicks: parsed, floorTicks: fallback.floorTicks });
      }
      if (typeof parsed === 'object' && parsed !== null) {
        const candidate = parsed as Partial<ClassicGravityRange>;
        if (typeof candidate.startingTicks === 'number' && typeof candidate.floorTicks === 'number') {
          return normalizeClassicGravityRange({
            startingTicks: candidate.startingTicks,
            floorTicks: candidate.floorTicks,
          });
        }
      }
    } catch {
      const legacyNumber = Number(source);
      if (Number.isFinite(legacyNumber)) {
        return normalizeClassicGravityRange({ startingTicks: legacyNumber, floorTicks: fallback.floorTicks });
      }
    }
  }
  if (legacyStartingValue?.trim()) {
    return normalizeClassicGravityRange({
      startingTicks: Number(legacyStartingValue),
      floorTicks: fallback.floorTicks,
    });
  }
  return fallback;
}

function readClassicGravityRange(): ClassicGravityRange {
  try {
    return parseClassicGravityRange(
      browserPlatform.readStorage(CLASSIC_GRAVITY_RANGE_STORAGE_KEY),
      browserPlatform.readStorage(LEGACY_CLASSIC_STARTING_GRAVITY_STORAGE_KEY),
    );
  } catch {
    return {
      startingTicks: CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
      floorTicks: CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
    };
  }
}

function writeClassicGravityRange(range: ClassicGravityRange): void {
  try {
    browserPlatform.writeStorage(
      CLASSIC_GRAVITY_RANGE_STORAGE_KEY,
      JSON.stringify(normalizeClassicGravityRange(range)),
    );
  } catch {
    // Storage is optional: the next run in this session still uses the chosen pace.
  }
}

function writeModeRuleIntros(modes: readonly GameMode[], canPersist = true): void {
  if (!canPersist) return;
  browserPlatform.writeStorage(
    MODE_RULE_INTROS_KEY,
    JSON.stringify(MODE_ORDER.filter((mode) => modes.includes(mode))),
  );
}

function writeEndgameProgress(progress: EndgameProgress, canPersist = true): void {
  if (!canPersist) return;
  browserPlatform.writeStorage(ENDGAME_PROGRESS_KEY, JSON.stringify(progress));
}

function readEndgameProgress(): PersistedBootstrap<EndgameProgress> {
  const result = migrateEndgameProgressStorage(browserPlatform);
  if (result.status === 'available') {
    return {
      value: {
        version: result.data.version,
        campaignRevision: result.data.campaignRevision,
        completedLevelIds: [...result.data.completedLevelIds],
        bestPieceCounts: { ...result.data.bestPieceCounts },
      },
      canPersist: result.persistence === 'verified',
    };
  }
  return { value: defaultEndgameProgress(), canPersist: result.status === 'missing' };
}

function readLeaderboard(): Leaderboard {
  try {
    const current = browserPlatform.readStorage(LEADERBOARD_KEY);
    if (current !== null) return parseLeaderboard(current);
    for (const key of LEGACY_LEADERBOARD_KEYS) {
      const legacy = browserPlatform.readStorage(key);
      if (legacy !== null) {
        const migrated = parseLeaderboard(legacy);
        browserPlatform.writeStorage(LEADERBOARD_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    return emptyLeaderboard();
  }
  return emptyLeaderboard();
}

function formatScore(value: number, language: AppLanguage = DEFAULT_LANGUAGE): string {
  return formatNumber(value, language);
}

export function elapsedTimeLabel(elapsedTicks: number, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const seconds = Math.floor(Math.max(0, elapsedTicks) / TICKS_PER_SECOND);
  return appCopy(language).phrasing.elapsed(Math.floor(seconds / 60), seconds % 60);
}

/** Compact live clock; the surrounding stat label supplies the translated context. */
export function elapsedClockLabel(elapsedTicks: number): string {
  const seconds = Math.floor(Math.max(0, elapsedTicks) / TICKS_PER_SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function countdownTimeLabel(remainingTicks: number): string {
  const seconds = Math.ceil(Math.max(0, remainingTicks) / TICKS_PER_SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function fallCadenceParts(
  state: GameState,
  language: AppLanguage = DEFAULT_LANGUAGE,
): { value: string; unit: string } {
  const ticks = state.mode === 'sprint' && state.mutationFreezeTicks > 0
    ? MUTATION_FREEZE_GRAVITY_TICKS
    : gravityForMode(
      state.mode,
      state.level,
      state.pieceCount,
      state.lines,
      state.classicStartingGravityTicks,
      state.classicGravityFloorTicks,
    );
  const seconds = ticks / TICKS_PER_SECOND;
  return {
    value: seconds.toFixed(seconds < 0.2 ? 2 : 1),
    unit: language === 'en' ? 's/cell' : '秒/格',
  };
}

export function fallCadenceLabel(state: GameState, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const { value, unit } = fallCadenceParts(state, language);
  return `${value} ${unit}`;
}

export function survivalCountdownSeconds(state: GameState): number {
  if (state.mode !== 'race' || state.survivalRisePending) return 0;
  return Math.max(0, Math.ceil((survivalIntervalTicks(state.lines) - state.survivalPressureTicks) / TICKS_PER_SECOND));
}

export function survivalCountdownLabel(state: GameState, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const copy = appCopy(language);
  return state.survivalRisePending ? copy.labels.pendingRise : copy.phrasing.seconds(survivalCountdownSeconds(state));
}

/** Remaining player placements before the next Survival rockfall. */
export function survivalStoneCountdownPieces(state: GameState): number {
  if (state.mode !== 'race') return 0;
  return Math.max(0, state.survivalDebrisPiecesRemaining);
}

export function parseReducedMotionOverride(value: string | null): ReducedMotionOverride {
  if (value === 'on') return true;
  if (value === 'off') return false;
  return null;
}

function readReducedMotionOverride(): ReducedMotionOverride {
  return parseReducedMotionOverride(browserPlatform.readStorage(REDUCED_MOTION_STORAGE_KEY));
}

function writeReducedMotionOverride(reducedMotion: boolean): void {
  browserPlatform.writeStorage(REDUCED_MOTION_STORAGE_KEY, reducedMotion ? 'on' : 'off');
}

function campaignLevel(id: EndgameId | null) {
  return CAMPAIGN_LEVELS.find((level) => level.id === id) ?? CAMPAIGN_LEVELS[0]!;
}

export function terminalCopy(state: GameState, language: AppLanguage = DEFAULT_LANGUAGE): { title: string; detail: string; success: boolean } | null {
  const copy = appCopy(language);
  if (state.mode === 'endgame') {
    if (state.endgameCompletion === 'finished') {
      return { ...copy.phrasing.terminalEndgameSuccess(state.pieceCount, state.lines), success: true };
    }
    if (state.endgameCompletion && state.endgameCompletion !== 'active') {
      const remaining = state.endgameTargetCells.length;
      return { ...copy.phrasing.terminalEndgameFailure(remaining, state.pieceCount), success: false };
    }
    return null;
  }
  if (state.mode === 'sprint') {
    if (state.status === 'game-over') {
      return {
        ...copy.phrasing.terminalMutation(),
        success: false,
      };
    }
    return null;
  }
  if (state.status !== 'game-over') return null;
  if (state.mode === 'race') {
    return {
      ...copy.phrasing.terminalSurvival(),
      success: false,
    };
  }
  return { ...copy.phrasing.terminalClassic(), success: false };
}

export type RunResultMetric = Readonly<{
  id: 'lines' | 'score' | 'pieces' | 'survival-time';
  label: string;
  value: string;
  primary: boolean;
}>;

export function runResultMetrics(
  state: GameState,
  language: AppLanguage = DEFAULT_LANGUAGE,
): readonly RunResultMetric[] {
  const copy = appCopy(language);
  if (state.mode === 'race') {
    return [
      { id: 'survival-time', label: copy.labels.survivalTime, value: elapsedClockLabel(state.elapsedTicks), primary: true },
      { id: 'lines', label: copy.labels.lines, value: formatNumber(state.lines, language), primary: false },
    ];
  }
  if (state.mode === 'sprint') {
    return [
      { id: 'score', label: copy.labels.score, value: formatScore(state.score, language), primary: true },
      { id: 'lines', label: copy.labels.lines, value: formatNumber(state.lines, language), primary: false },
    ];
  }
  return [
    { id: 'lines', label: copy.labels.lines, value: formatNumber(state.lines, language), primary: true },
    { id: 'pieces', label: copy.labels.piecesUsed, value: formatNumber(state.pieceCount, language), primary: false },
  ];
}

/**
 * Completion copy is classified before persistence updates the endgame record.
 * That keeps a first clear from being mislabelled as a replay on the same frame.
 */
export function endgameCelebrationOutcome(previousBest: number | null, pieces: number): EndgameCelebrationOutcome {
  if (previousBest === null) return 'first';
  return pieces < previousBest ? 'record' : 'replay';
}

export function endgameCelebrationCopy(
  celebration: EndgameCelebration,
  language: AppLanguage = DEFAULT_LANGUAGE,
) {
  const best = celebration.previousBest === null
    ? celebration.pieces
    : Math.min(celebration.previousBest, celebration.pieces);
  return appCopy(language).phrasing.endgameCelebration(
    celebration.outcome,
    best,
  );
}

export function scoreRecordForState(state: GameState, completedAt: string): ScoreRecord | null {
  const isTopOutRun = (state.mode === 'marathon' || state.mode === 'race' || state.mode === 'sprint') && state.status === 'game-over';
  if (!isTopOutRun) return null;
  const mode: RunMode = state.mode === 'sprint' ? 'sprint' : state.mode === 'race' ? 'race' : 'marathon';
  if (mode === 'race') {
    return {
      version: 9,
      lines: state.lines,
      elapsedTicks: state.elapsedTicks,
      mode,
      outcome: 'top-out',
      completedAt,
    };
  }
  const scoredRecord = {
    version: 9 as const,
    score: state.score,
    lines: state.lines,
    pieces: state.pieceCount,
    elapsedTicks: state.elapsedTicks,
    chain: 0,
    mode,
    outcome: 'top-out' as const,
    completedAt,
  };
  if (mode === 'marathon') {
    return {
      ...scoredRecord,
      mode,
      classicStartingGravityTicks: state.classicStartingGravityTicks,
      classicGravityFloorTicks: state.classicGravityFloorTicks,
      classicGrade: classicDifficultyGrade(
        state.classicStartingGravityTicks,
        state.classicGravityFloorTicks,
      ),
    };
  }
  return { ...scoredRecord, mode: 'sprint' };
}

export function scoreRecordKey(record: ScoreRecord): string {
  if (record.mode === 'race') {
    return [record.mode, record.completedAt, record.lines, record.elapsedTicks].join(':');
  }
  if (record.mode === 'marathon') {
    return [
      record.mode,
      record.classicGrade,
      record.classicStartingGravityTicks,
      record.classicGravityFloorTicks,
      record.completedAt,
      record.score,
      record.lines,
      record.pieces,
      record.elapsedTicks,
      record.chain,
    ].join(':');
  }
  return [record.mode, record.completedAt, record.score, record.lines, record.pieces, record.elapsedTicks, record.chain].join(':');
}

export function scoreRecordRank(records: readonly ScoreRecord[], record: ScoreRecord | null): number | null {
  if (!record) return null;
  const comparableRecords = record.mode === 'marathon'
    ? records.filter((candidate) => candidate.mode === 'marathon' && candidate.classicGrade === record.classicGrade)
    : records;
  const index = comparableRecords.findIndex((candidate) => scoreRecordKey(candidate) === scoreRecordKey(record));
  return index >= 0 ? index + 1 : null;
}

function Brand({ compact = false }: { compact?: boolean }) {
  const wordmark = <strong>{PRODUCT_NAME}</strong>;
  return (
    <div
      className={`brand ${compact ? 'brand--compact' : ''}`}
      data-testid="brand"
      aria-label={PRODUCT_NAME}
    >
      {wordmark}
    </div>
  );
}

function EndgameCelebrationPanel({ celebration, language }: { celebration: EndgameCelebration; language: AppLanguage }) {
  const presentation = endgameCelebrationCopy(celebration, language);
  return (
    <section
      className={`endgame-celebration endgame-celebration--${celebration.outcome}`}
      data-testid="endgame-celebration"
      data-outcome={celebration.outcome}
      aria-label={presentation.best}
    >
      <div className="endgame-celebration__summary">
        <div className="endgame-celebration__value">
          <strong>{presentation.bestValue}</strong>
          <small>{presentation.bestUnit}</small>
        </div>
        <span>{presentation.bestLabel}</span>
      </div>
    </section>
  );
}

function ModeGlyph({ mode }: { mode: GameMode }) {
  const cell = { width: 9, height: 9, rx: 1.15 };
  if (mode === 'marathon') {
    return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1.5" y="15.5" {...cell} /><rect x="11.3" y="15.5" {...cell} /><rect x="21.1" y="15.5" {...cell} /><rect x="30.9" y="15.5" {...cell} /></svg>;
  }
  if (mode === 'race') {
    return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="10.7" y="10.7" {...cell} /><rect x="20.3" y="10.7" {...cell} /><rect x="10.7" y="20.3" {...cell} /><rect x="20.3" y="20.3" {...cell} /></svg>;
  }
  if (mode === 'sprint') {
    return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="10.7" y="5.9" {...cell} /><rect x="10.7" y="15.5" {...cell} /><rect x="10.7" y="25.1" {...cell} /><rect x="20.3" y="25.1" {...cell} /></svg>;
  }
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <rect x="15.5" y="5.9" {...cell} />
      <rect x="5.9" y="15.5" {...cell} />
      <rect x="15.5" y="15.5" {...cell} />
      <rect x="25.1" y="15.5" {...cell} />
    </svg>
  );
}

function ModeRuleSummary({
  mode,
  language,
  testId,
  showHeading = true,
  variant = 'full',
}: {
  mode: GameMode;
  language: AppLanguage;
  testId?: string;
  showHeading?: boolean;
  variant?: 'full' | 'intro';
}) {
  const copy = appCopy(language);
  const facts = variant === 'intro' ? modeIntroRules(language, mode) : modeRules(language, mode);
  return (
    <section className={`mode-rule-summary mode-rule-summary--${mode} mode-rule-summary--${variant}`} data-testid={testId} aria-label={modeRulesTitle(language, mode)}>
      {showHeading && <strong>{copy.labels.rules}</strong>}
      <ul>
        {facts.map((fact) => (
          <li key={fact.id} data-rule-id={fact.id}><b>{fact.label}</b><span>{fact.value}</span></li>
        ))}
      </ul>
    </section>
  );
}

export function ModeHome({
  onEnter,
  language = DEFAULT_LANGUAGE,
}: {
  onEnter: (mode: GameMode) => void;
  language?: AppLanguage;
}) {
  const [focusMode, setFocusMode] = useState<GameMode>('marathon');
  const [inputModality, setInputModality] = useState<'keyboard' | 'pointer'>('keyboard');
  const modeButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const copy = appCopy(language);
  const moveModeFocus = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const keyOffset: Partial<Record<string, number>> = {
      ArrowLeft: index % 2 === 0 ? 0 : -1,
      ArrowRight: index % 2 === 1 ? 0 : 1,
      ArrowUp: index < 2 ? 0 : -2,
      ArrowDown: index >= 2 ? 0 : 2,
    };
    const offset = keyOffset[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const nextIndex = Math.max(0, Math.min(MODE_ORDER.length - 1, index + offset));
    if (nextIndex === index) return;
    const nextMode = MODE_ORDER[nextIndex]!;
    setFocusMode(nextMode);
    modeButtonRefs.current[nextIndex]?.focus();
  };
  return (
    <main id="game" lang={language} className="landing-shell landing-shell--workbench landing-shell--wordmark app-route-surface" data-testid="mode-home" tabIndex={-1}>
      <section className="landing-stage landing-stage--workbench" aria-labelledby="home-title">
        <section className="mode-chooser mode-chooser--workbench">
          <div className="landing-intro">
            <h1 id="home-title" className="mode-home-wordmark"><span>Tetra</span><span>Morph</span></h1>
          </div>
          <div
            className="mode-gates mode-gates--workbench"
            aria-label={copy.labels.selectMode}
            data-testid="mode-list"
            data-input-modality={inputModality}
            onPointerMove={() => setInputModality('pointer')}
            onKeyDownCapture={() => setInputModality('keyboard')}
          >
            {MODE_ORDER.map((mode, index) => {
              const item = modeCopy(language, mode);
              return (
                <button
                  key={mode}
                  className={`mode-gate mode-gate--${mode}`}
                  type="button"
                  aria-label={`${item.action} ${item.label}`}
                  data-testid={`enter-${mode}`}
                  tabIndex={focusMode === mode ? 0 : -1}
                  ref={(node) => { modeButtonRefs.current[index] = node; }}
                  onFocus={() => setFocusMode(mode)}
                  onKeyDown={(event) => moveModeFocus(event, index)}
                  onClick={() => onEnter(mode)}
                >
                  <span className="mode-gate__glyph"><ModeGlyph mode={mode} /></span>
                  <span className="mode-gate__body">
                    <strong>{item.label}</strong>
                  </span>
                  <span className="mode-gate__action" aria-hidden="true">
                    <svg viewBox="0 0 28 24" focusable="false">
                      <path d="M3 12h22m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function endgameSilhouettePaths(id: EndgameId): ReadonlyMap<PieceType, string> {
  const board = createInitialState(APP_SEED, 'endgame', id).board.slice(-12);
  const unit = 4;
  const face = 3.8;
  const paths = new Map<PieceType, string>();
  for (const type of PIECE_TYPES) {
    const path = board.flatMap((row, y) => row.map((cell, x) => (
      cell === type ? `M${x * unit + .1} ${y * unit + .1}h${face}v${face}h-${face}z` : ''
    ))).join('');
    if (path) paths.set(type, path);
  }
  return paths;
}

/** One canonical preview keeps immutable anchors legible without adding list thumbnails. */
export function endgameAnchorSilhouettePath(id: EndgameId): string {
  const board = createInitialState(APP_SEED, 'endgame', id).board.slice(-12);
  const unit = 4;
  const face = 3.8;
  return board.flatMap((row, y) => row.map((cell, x) => (
    cell === ANCHOR_CELL ? `M${x * unit + .1} ${y * unit + .1}h${face}v${face}h-${face}z` : ''
  ))).join('');
}

function endgameSilhouetteViewBox(id: EndgameId): string {
  const board = createInitialState(APP_SEED, 'endgame', id).board.slice(-12);
  const firstOccupiedRow = board.findIndex((row) => row.some((cell) => cell !== null));
  const startRow = Math.max(0, (firstOccupiedRow < 0 ? 0 : firstOccupiedRow) - 2);
  return `0 ${startRow * 4} 40 ${(12 - startRow) * 4}`;
}

function EndgameSilhouette({ id, label }: { id: EndgameId; label: string }) {
  const anchorPath = endgameAnchorSilhouettePath(id);
  return (
    <svg
      className="endgame-silhouette"
      viewBox={endgameSilhouetteViewBox(id)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {[...endgameSilhouettePaths(id)].map(([type, path]) => {
        const material = PIECE_MATERIALS[type];
        return (
          <path
            key={type}
            data-piece-type={type}
            d={path}
            fill={cssHex(material.fillStart)}
            stroke={cssHex(material.edge)}
          />
        );
      })}
      {anchorPath && (
        <path
          className="endgame-silhouette__anchor"
          data-piece-type="anchor"
          d={anchorPath}
          fill={cssHex(ANCHOR_MATERIAL.fillStart)}
          stroke={cssHex(ANCHOR_MATERIAL.edge)}
        />
      )}
    </svg>
  );
}

/** A centered graphic replacement for the completed level numeral; never expose literal check text. */
function CompletionTick() {
  return (
    <span className="endgame-gallery__completion-tick" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="m4.8 12.35 4.35 4.3L19.4 7.2" />
      </svg>
    </span>
  );
}

const ENDGAME_CATEGORY_IDS: readonly EndgameCategoryId[] = Object.freeze(['intro', 'easy', 'hard']);

function endgameCategoryForLevel(levelId: EndgameId): EndgameCategoryId {
  return ENDGAME_CATEGORIES.find((category) => category.levels.some((level) => level.id === levelId))?.id ?? 'intro';
}

export function EndgameLibrary({
  progress,
  selectedId,
  onSelect,
  onStart,
  onBack,
  language = DEFAULT_LANGUAGE,
}: {
  progress: EndgameProgress;
  selectedId: EndgameId;
  onSelect: (id: EndgameId) => void;
  onStart: () => void;
  onBack: () => void;
  language?: AppLanguage;
}) {
  const selected = campaignLevel(selectedId);
  const selectedName = endgameDisplayName(language, selected.id, selected.name);
  const copy = appCopy(language);
  const selectedLesson = endgameLessonFor(selected.id);
  const selectedLessonCopy = selectedLesson ? copy.phrasing.endgameLesson(selectedLesson.technique) : null;
  const selectedComplete = progress.completedLevelIds.includes(selected.id);
  const selectedBest = endgameBestPieceCount(progress, selected.id);
  const selectedUnlocked = isEndgameUnlocked(progress, selected.id);
  const selectedGate = endgameMasteryGateStatus(progress, selected.id);
  const selectedGateLesson = selectedGate ? copy.phrasing.endgameLesson(selectedGate.group.technique) : null;
  const selectedGatePrerequisite = selectedGate
    ? campaignLevel(selectedGate.group.prerequisiteId)
    : null;
  const selectedGatePrerequisiteName = selectedGatePrerequisite
    ? endgameDisplayName(language, selectedGatePrerequisite.id, selectedGatePrerequisite.name)
    : null;
  const selectedCategory = endgameCategoryForLevel(selected.id);
  const [categoryId, setCategoryId] = useState<EndgameCategoryId>(selectedCategory);
  const levelButtonRefs = useRef(new Map<EndgameId, HTMLButtonElement>());
  const pageTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingFocusRef = useRef<EndgameId | null>(null);
  const pageLastSelectedRef = useRef<Record<EndgameCategoryId, EndgameId>>({
    intro: ENDGAME_CATEGORIES[0]!.levels[0]!.id,
    easy: ENDGAME_CATEGORIES[1]!.levels[0]!.id,
    hard: ENDGAME_CATEGORIES[2]!.levels[0]!.id,
  });
  pageLastSelectedRef.current[selectedCategory] = selected.id;
  const activeCategory = ENDGAME_CATEGORIES.find((category) => category.id === categoryId)!;
  const pageLevels = activeCategory.levels;
  const rovingLevelId = pageLevels.some((level) => level.id === selected.id)
    ? selected.id
    : pageLastSelectedRef.current[categoryId];

  useEffect(() => {
    setCategoryId(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const target = levelButtonRefs.current.get(pending);
    if (!target) return;
    pendingFocusRef.current = null;
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }, [categoryId, selectedId]);

  const selectLevelAtIndex = (index: number, focus = false) => {
    const next = CAMPAIGN_LEVELS[index];
    if (!next) return;
    const nextCategory = endgameCategoryForLevel(next.id);
    pageLastSelectedRef.current[nextCategory] = next.id;
    if (focus && nextCategory !== categoryId) pendingFocusRef.current = next.id;
    setCategoryId(nextCategory);
    onSelect(next.id);
    if (focus && nextCategory === categoryId) {
      const target = levelButtonRefs.current.get(next.id);
      try {
        target?.focus({ preventScroll: true });
      } catch {
        target?.focus();
      }
    }
  };

  const switchPage = (nextCategory: EndgameCategoryId, focusTab = false) => {
    const targetId = pageLastSelectedRef.current[nextCategory];
    const targetIndex = CAMPAIGN_LEVELS.findIndex((level) => level.id === targetId);
    setCategoryId(nextCategory);
    if (targetIndex >= 0) onSelect(targetId);
    if (focusTab) {
      const target = pageTabRefs.current[ENDGAME_CATEGORY_IDS.indexOf(nextCategory)];
      try {
        target?.focus({ preventScroll: true });
      } catch {
        target?.focus();
      }
    }
  };

  const movePageFocus = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;
    if (event.key === 'ArrowLeft') nextIndex = (index + ENDGAME_CATEGORY_IDS.length - 1) % ENDGAME_CATEGORY_IDS.length;
    else if (event.key === 'ArrowRight') nextIndex = (index + 1) % ENDGAME_CATEGORY_IDS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ENDGAME_CATEGORY_IDS.length - 1;
    else return;
    event.preventDefault();
    switchPage(ENDGAME_CATEGORY_IDS[nextIndex]!, true);
  };

  const moveLevelFocus = (event: ReactKeyboardEvent<HTMLButtonElement>, localIndex: number) => {
    const grid = event.currentTarget.closest<HTMLOListElement>('.endgame-gallery__grid');
    const renderedColumns = grid
      ? window.getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
      : 0;
    const fallbackColumns = categoryId === 'intro' ? 3 : categoryId === 'easy' ? 6 : 5;
    const columns = renderedColumns > 1 ? renderedColumns : fallbackColumns;
    let nextLocalIndex = localIndex;
    if (event.key === 'ArrowLeft') nextLocalIndex = Math.max(0, localIndex - 1);
    else if (event.key === 'ArrowRight') nextLocalIndex = Math.min(pageLevels.length - 1, localIndex + 1);
    else if (event.key === 'ArrowUp') nextLocalIndex = Math.max(0, localIndex - columns);
    else if (event.key === 'ArrowDown') nextLocalIndex = Math.min(pageLevels.length - 1, localIndex + columns);
    else if (event.key === 'Home') nextLocalIndex = 0;
    else if (event.key === 'End') nextLocalIndex = pageLevels.length - 1;
    else return;
    event.preventDefault();
    if (nextLocalIndex === localIndex) return;
    selectLevelAtIndex(pageLevels[nextLocalIndex]!.index - 1, true);
  };
  return (
    <main id="game" lang={language} className="library-shell library-shell--gallery app-route-surface" data-testid="endgame-library" tabIndex={-1}>
      <header className="library-header endgame-gallery__header">
        <button className="library-back" type="button" aria-label={copy.labels.leaveRun} onClick={onBack}>
          <b aria-hidden="true">←</b><span>{copy.labels.modeHome}</span>
        </button>
        <Brand compact />
      </header>
      <section className="endgame-gallery" aria-labelledby="library-title">
        <aside className="endgame-gallery__hero" aria-live="polite" aria-label={copy.phrasing.selectedEndgame(selectedName)}>
          <div className="endgame-gallery__stage" key={selected.id}>
            <div className="endgame-gallery__board">
              <EndgameSilhouette id={selected.id} label={copy.phrasing.endgameBoard(selectedName)} />
            </div>
          </div>
          <section className="endgame-gallery__meta">
            <div className="endgame-gallery__title-row">
              <h2 className={`endgame-gallery__title${selectedComplete ? ' endgame-gallery__title--complete' : ''}`}>{selectedName}</h2>
              {selectedBest !== null && <span className="endgame-gallery__best" data-testid="selected-endgame-start-best">{copy.phrasing.currentBest(selectedBest)}</span>}
            </div>
            <button className="primary-action endgame-gallery__start" type="button" data-testid="start-selected-endgame" aria-label={copy.phrasing.startEndgame(selectedName)} disabled={!selectedUnlocked} onClick={onStart}>{copy.labels.start}</button>
            {selectedLesson && selectedLessonCopy && (
              <section
                className="endgame-gallery__lesson"
                data-testid="endgame-lesson"
                data-endgame-technique={selectedLesson.technique}
                aria-label={selectedLessonCopy.title}
              >
                <strong>{selectedLessonCopy.title}</strong>
                <p>{selectedLessonCopy.body}</p>
              </section>
            )}
            {selectedGate && selectedGateLesson && selectedGatePrerequisiteName && (
              <p
                className={`endgame-gallery__requirement${selectedGate.unlocked ? ' endgame-gallery__requirement--met' : ''}`}
                data-testid="endgame-mastery-requirement"
              >
                {copy.phrasing.masteryThreshold(
                  selectedGateLesson.title,
                  selectedGatePrerequisiteName,
                  selectedGate.requiredOperations,
                  selectedGate.bestOperations,
                )}
              </p>
            )}
          </section>
        </aside>
        <nav className="endgame-gallery__catalog" aria-label={copy.phrasing.endgameList(CAMPAIGN_LEVELS.length)} data-testid="level-list">
          <header className="endgame-gallery__catalog-header">
            <h1 id="library-title">{copy.labels.endgame}</h1>
            <div className="endgame-gallery__pages" role="tablist" aria-label={copy.labels.endgamePages}>
              {ENDGAME_CATEGORIES.map((category, index) => {
                const active = categoryId === category.id;
                const label = category.id === 'intro'
                  ? copy.labels.endgameIntro
                  : category.id === 'easy'
                    ? copy.labels.endgameEasy
                    : copy.labels.endgameHard;
                return (
                  <button
                    id={`endgame-page-tab-${category.id}`}
                    className={`endgame-gallery__page${active ? ' endgame-gallery__page--active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`endgame-page-panel-${category.id}`}
                    tabIndex={active ? 0 : -1}
                    key={category.id}
                    ref={(node) => {
                      pageTabRefs.current[index] = node;
                    }}
                    onClick={() => switchPage(category.id)}
                    onKeyDown={(event) => movePageFocus(event, index)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </header>
          {categoryId === 'hard' && (
            <section className="endgame-gallery__mastery" aria-label={copy.labels.mastery}>
              <p>{copy.labels.hardUnlockHint}</p>
              <div>
                {ENDGAME_HARD_MASTERY_GROUPS.map((group) => {
                  const certificate = endgameOptimalCertificate(group.prerequisiteId)!;
                  const prerequisite = campaignLevel(group.prerequisiteId);
                  const prerequisiteName = endgameDisplayName(language, prerequisite.id, prerequisite.name);
                  const best = endgameBestPieceCount(progress, group.prerequisiteId);
                  const lesson = copy.phrasing.endgameLesson(group.technique);
                  const met = best !== null && best <= certificate.masteryOperations;
                  return (
                    <span
                      className={met ? 'endgame-gallery__mastery-key--met' : undefined}
                      title={copy.phrasing.masteryThreshold(lesson.title, prerequisiteName, certificate.masteryOperations, best)}
                      key={group.prerequisiteId}
                    >
                      <b>{lesson.title}</b>
                      <i>{best ?? '—'} / {certificate.masteryOperations}</i>
                    </span>
                  );
                })}
              </div>
            </section>
          )}
          <ol
            id={`endgame-page-panel-${categoryId}`}
            className="endgame-gallery__grid"
            role="tabpanel"
            aria-labelledby={`endgame-page-tab-${categoryId}`}
            aria-label={copy.phrasing.endgameCategory(
              categoryId === 'intro' ? copy.labels.endgameIntro : categoryId === 'easy' ? copy.labels.endgameEasy : copy.labels.endgameHard,
              pageLevels.length,
            )}
            data-endgame-category={categoryId}
            key={categoryId}
          >
            {pageLevels.map((level, localIndex) => {
              const complete = progress.completedLevelIds.includes(level.id);
              const unlocked = isEndgameUnlocked(progress, level.id);
              const gate = endgameMasteryGateStatus(progress, level.id);
              const hasAnchor = getEndgameDefinition(level.id).anchorCells.length > 0;
              const selectedLevel = rovingLevelId === level.id;
              const bestPieces = endgameBestPieceCount(progress, level.id);
              const levelName = endgameDisplayName(language, level.id, level.name);
              return (
                <li className={`endgame-gallery__node${selectedLevel ? ' endgame-gallery__node--selected' : ''}${complete ? ' endgame-gallery__node--complete' : ''}${unlocked ? '' : ' endgame-gallery__node--locked'}`} key={level.id}>
                  <button
                    type="button"
                    data-testid="level-row"
                    data-level-id={level.id}
                    data-unlocked={String(unlocked)}
                    data-anchor={hasAnchor || undefined}
                    data-best-pieces={bestPieces ?? undefined}
                    aria-pressed={selectedLevel}
                    tabIndex={selectedLevel ? 0 : -1}
                    ref={(node) => {
                      if (node) levelButtonRefs.current.set(level.id, node);
                      else levelButtonRefs.current.delete(level.id);
                    }}
                    aria-label={`${copy.phrasing.levelNode(String(level.index).padStart(2, '0'), levelName, getEndgameDefinition(level.id).targetRows, complete, unlocked, bestPieces)}${gate && !gate.unlocked ? ` — ${copy.phrasing.masteryThreshold(copy.phrasing.endgameLesson(gate.group.technique).title, endgameDisplayName(language, campaignLevel(gate.group.prerequisiteId).id, campaignLevel(gate.group.prerequisiteId).name), gate.requiredOperations, gate.bestOperations)}` : ''}`}
                    onKeyDown={(event) => moveLevelFocus(event, localIndex)}
                    onClick={() => onSelect(level.id)}
                  >
                    {complete
                      ? <CompletionTick />
                      : <span className="endgame-gallery__index">{String(level.index).padStart(2, '0')}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </section>
    </main>
  );
}

export function LeaderboardPanel({
  mode,
  records,
  highlightRecord = null,
  variant = 'result',
  language = DEFAULT_LANGUAGE,
  initialClassicGrade,
}: {
  mode: RunMode;
  records: readonly ScoreRecord[];
  highlightRecord?: ScoreRecord | null;
  variant?: 'result' | 'settings';
  language?: AppLanguage;
  initialClassicGrade?: ClassicDifficultyGrade;
}) {
  const copy = appCopy(language);
  const survival = mode === 'race';
  const preferredClassicGrade = highlightRecord?.mode === 'marathon'
    ? highlightRecord.classicGrade
    : initialClassicGrade ?? 'standard';
  const [selectedClassicGrade, setSelectedClassicGrade] = useState<ClassicDifficultyGrade>(preferredClassicGrade);
  useEffect(() => {
    setSelectedClassicGrade(preferredClassicGrade);
  }, [preferredClassicGrade]);
  const highlightKey = highlightRecord ? scoreRecordKey(highlightRecord) : null;
  const classicGradeLabels: Record<ClassicDifficultyGrade, string> = {
    relaxed: copy.labels.classicRelaxed,
    standard: copy.labels.classicStandard,
    challenge: copy.labels.classicChallenge,
  };
  const filteredRecords = mode === 'marathon'
    ? records.filter((record) => record.mode === 'marathon' && record.classicGrade === selectedClassicGrade)
    : records;
  const visibleRecords = filteredRecords.slice(0, 5);
  const title = variant === 'settings'
    ? copy.labels.leaderboard
    : copy.labels.resultLeaderboard;
  return (
    <section
      className={`result-leaderboard result-leaderboard--${variant}`}
      data-mode={mode}
      data-testid={variant === 'settings' ? 'settings-leaderboard' : undefined}
      data-empty={visibleRecords.length === 0 || undefined}
      data-classic-grade={mode === 'marathon' ? selectedClassicGrade : undefined}
      aria-label={title}
    >
      <header>
        <strong>{title}</strong>
        <span>{copy.phrasing.leaderboardCriterion(survival)}</span>
      </header>
      {mode === 'marathon' && (
        <div
          className="result-leaderboard__grades"
          role="group"
          aria-label={copy.labels.classicDifficulty}
          data-testid="classic-leaderboard-grades"
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const currentIndex = CLASSIC_DIFFICULTY_GRADES.indexOf(selectedClassicGrade);
            const nextIndex = (currentIndex + direction + CLASSIC_DIFFICULTY_GRADES.length) % CLASSIC_DIFFICULTY_GRADES.length;
            const nextGrade = CLASSIC_DIFFICULTY_GRADES[nextIndex]!;
            setSelectedClassicGrade(nextGrade);
            event.currentTarget.querySelector<HTMLButtonElement>(`button[data-grade="${nextGrade}"]`)?.focus();
          }}
        >
          {CLASSIC_DIFFICULTY_GRADES.map((grade) => (
            <button
              key={grade}
              type="button"
              data-grade={grade}
              aria-pressed={selectedClassicGrade === grade}
              onClick={() => setSelectedClassicGrade(grade)}
            >
              {classicGradeLabels[grade]}
            </button>
          ))}
        </div>
      )}
      {visibleRecords.length === 0 ? <p>{copy.labels.noRecords}</p> : (
        <ol>
          {visibleRecords.map((record, index) => {
            const recordIsSurvival = record.mode === 'race';
            const recordIsMutation = record.mode === 'sprint';
            const isCurrentRecord = scoreRecordKey(record) === highlightKey;
            const primaryField = recordIsSurvival ? 'time' : recordIsMutation ? 'score' : 'lines';
            const primaryValue = recordIsSurvival
              ? elapsedTimeLabel(record.elapsedTicks, language)
              : recordIsMutation
                ? formatScore(record.score, language)
                : copy.phrasing.lineCount(record.lines);
            return (
              <li key={`${record.completedAt}:${index}`} data-current-record={isCurrentRecord || undefined}>
                <b data-record-field="rank">{String(index + 1).padStart(2, '0')}</b>
                <div className="result-leaderboard__run">
                  <strong data-record-field={primaryField}>{primaryValue}</strong>
                  <small>
                    {recordIsMutation || recordIsSurvival ? (
                      <span data-record-field="lines">{copy.phrasing.lineCount(record.lines)}</span>
                    ) : (
                      <span data-record-field="pieces">{copy.phrasing.pieceCount(record.pieces)}</span>
                    )}
                    {isCurrentRecord && <em className="result-leaderboard__current">{copy.labels.currentRun}</em>}
                  </small>
                </div>
                <time data-record-field="date" dateTime={record.completedAt}>{formatDate(record.completedAt, language)}</time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function RunResultSummary({
  state,
  rank,
  hasRecord,
  language = DEFAULT_LANGUAGE,
}: {
  state: GameState;
  rank: number | null;
  hasRecord: boolean;
  language?: AppLanguage;
}) {
  const copy = appCopy(language);
  const metrics = runResultMetrics(state, language);
  const primaryMetric = metrics.find((metric) => metric.primary) ?? metrics[0]!;
  const supportingMetrics = metrics.filter((metric) => metric !== primaryMetric);
  const rankLabel = hasRecord && rank === null
    ? copy.labels.currentRunMissedLeaderboard
    : null;
  return (
    <section className="run-result" data-mode={state.mode} aria-label={copy.labels.resultSummary}>
      {rankLabel && (
        <p className="run-result__rank" data-ranked={rank !== null || undefined}>
          {rankLabel}
        </p>
      )}
      <div className="run-result__hero" data-metric={primaryMetric.id}>
        <strong>{primaryMetric.value}</strong>
      </div>
      {supportingMetrics.map((metric) => (
        <article className="run-result__support" data-metric={metric.id} key={metric.id}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </section>
  );
}

function AudioControls({
  enabled,
  volume,
  onEnabledChange,
  onVolumeChange,
  language,
}: {
  enabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
  language: AppLanguage;
}) {
  const copy = appCopy(language);
  const percent = Math.round(volume * 100);
  return (
    <section className="audio-controls" aria-label={copy.labels.soundControls}>
      <div className="audio-controls__switches">
        <button
          className="audio-toggle"
          type="button"
          data-testid="audio-toggle"
          data-arrow-nav
          data-arrow-row="2"
          data-arrow-col="0"
          aria-label={enabled ? copy.labels.turnSoundOff : copy.labels.turnSoundOn}
          aria-pressed={enabled}
          onClick={() => onEnabledChange(!enabled)}
        >{enabled ? copy.labels.soundOn : copy.labels.soundOff}</button>
      </div>
      <label className="audio-volume">
        <span>{copy.labels.volume}</span>
        <input
          type="range"
          data-testid="audio-volume"
          min="0"
          max="100"
          step="1"
          value={percent}
          aria-label={copy.labels.volume}
          onChange={(event) => onVolumeChange(Number(event.currentTarget.value) / 100)}
        />
        <output>{percent}%</output>
      </label>
    </section>
  );
}

export function SettingsRecord({
  mode,
  endgameId,
  leaderboard,
  progress,
  language = DEFAULT_LANGUAGE,
  classicGrade = 'standard',
}: {
  mode: GameMode;
  endgameId: EndgameId;
  leaderboard: Leaderboard;
  progress: EndgameProgress;
  language?: AppLanguage;
  classicGrade?: ClassicDifficultyGrade;
}) {
  const copy = appCopy(language);
  if (mode === 'endgame') {
    const bestPieces = endgameBestPieceCount(progress, endgameId);
    return (
      <section className="settings-console__record settings-console__record--endgame" data-testid="settings-record" aria-label={copy.labels.currentRecord}>
        <span>{copy.labels.currentRecord}</span>
        <strong>{bestPieces === null ? copy.labels.notCompleted : copy.phrasing.minimumMoves(bestPieces)}</strong>
      </section>
    );
  }

  return (
    <LeaderboardPanel
      mode={mode}
      records={recordsForMode(leaderboard, mode)}
      variant="settings"
      language={language}
      initialClassicGrade={mode === 'marathon' ? classicGrade : undefined}
    />
  );
}

function LanguageControl({
  language,
  onChange,
  className = '',
}: {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
  className?: string;
}) {
  const copy = appCopy(language);
  return (
    <section className={`language-control ${className}`.trim()} aria-label={copy.labels.language}>
      <div role="group" aria-label={copy.labels.language}>
        <button type="button" data-testid="language-zh" data-arrow-nav data-arrow-row="1" data-arrow-col="0" aria-pressed={language === 'zh-CN'} onClick={() => onChange('zh-CN')}>{copy.labels.chinese}</button>
        <button type="button" data-testid="language-en" data-arrow-nav data-arrow-row="1" data-arrow-col="1" aria-pressed={language === 'en'} onClick={() => onChange('en')}>{copy.labels.english}</button>
      </div>
    </section>
  );
}

function VisualThemeControl({
  theme,
  language,
  onChange,
}: {
  theme: VisualThemeId;
  language: AppLanguage;
  onChange: (theme: VisualThemeId) => void;
}) {
  const copy = appCopy(language);
  const labels: Record<VisualThemeId, string> = {
    'mineral-mist': copy.labels.mineralMist,
    'deep-tide': copy.labels.deepTide,
    sunstone: copy.labels.sunstone,
  };
  return (
    <section className="visual-theme-control" aria-label={copy.labels.theme}>
      <div role="group" aria-label={copy.labels.theme}>
        {VISUAL_THEMES.map((option, index) => (
          <button
            key={option}
            type="button"
            className="visual-theme-control__option"
            data-testid={`theme-${option}`}
            data-theme-option={option}
            data-arrow-nav
            data-arrow-row="2"
            data-arrow-col={index}
            aria-pressed={theme === option}
            onClick={() => onChange(option)}
          >
            <span>{labels[option]}</span>
            <span className="visual-theme-control__selection" aria-hidden="true">
              {theme === option ? copy.labels.currentTheme : ''}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MotionControl({
  reducedMotion,
  onChange,
  language,
}: {
  reducedMotion: boolean;
  onChange: (reducedMotion: boolean) => void;
  language: AppLanguage;
}) {
  const copy = appCopy(language);
  return (
    <button
      className="motion-toggle"
      type="button"
      data-testid="reduced-motion-toggle"
      data-motion-mode={reducedMotion ? 'reduced' : 'full'}
      data-arrow-nav
      data-arrow-row="1"
      data-arrow-col="2"
      aria-label={reducedMotion ? copy.labels.turnReducedMotionOff : copy.labels.turnReducedMotionOn}
      aria-pressed={reducedMotion}
      onClick={() => onChange(!reducedMotion)}
    >{reducedMotion ? copy.labels.reducedMotionOn : copy.labels.reducedMotionOff}</button>
  );
}

function ClassicGravityRangeControl({
  range,
  language,
  onChange,
}: {
  range: ClassicGravityRange;
  language: AppLanguage;
  onChange: (range: ClassicGravityRange) => void;
}) {
  const copy = appCopy(language);
  const displaySeconds = (ticks: number) => {
    const seconds = ticks / TICKS_PER_SECOND;
    return seconds.toFixed(seconds < 0.2 ? 2 : 1);
  };
  const startingSeconds = displaySeconds(range.startingTicks);
  const floorSeconds = displaySeconds(range.floorTicks);
  const unit = language === 'en' ? 's/cell' : '秒/格';
  const difficultyGrade = classicDifficultyGrade(range.startingTicks, range.floorTicks);
  const difficultyLabel = {
    relaxed: copy.labels.classicRelaxed,
    standard: copy.labels.classicStandard,
    challenge: copy.labels.classicChallenge,
  }[difficultyGrade];
  const choiceTicks: readonly number[] = CLASSIC_GRAVITY_CHOICES_TICKS;
  const choiceIndex = (ticks: number) => choiceTicks.indexOf(normalizeClassicStartingGravityTicks(ticks));
  const percentForTicks = (ticks: number) => (choiceIndex(ticks) / (choiceTicks.length - 1)) * 100;
  const controlStyle = {
    '--classic-speed-start': `${percentForTicks(range.startingTicks)}%`,
    '--classic-speed-floor': `${percentForTicks(range.floorTicks)}%`,
  } as CSSProperties;
  const updateBoundFromRail = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('input')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const position = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const targetIndex = Math.round(position * (choiceTicks.length - 1));
    const ticks = choiceTicks[targetIndex]!;
    const startingIndex = choiceIndex(range.startingTicks);
    const floorIndex = choiceIndex(range.floorTicks);
    const selectStarting = startingIndex === floorIndex
      ? targetIndex <= startingIndex
      : Math.abs(targetIndex - startingIndex) <= Math.abs(targetIndex - floorIndex);
    const testId = selectStarting ? 'classic-starting-speed' : 'classic-fastest-speed';
    event.currentTarget.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)?.focus();
    onChange(normalizeClassicGravityRange(selectStarting
      ? { startingTicks: Math.max(ticks, range.floorTicks), floorTicks: range.floorTicks }
      : { startingTicks: range.startingTicks, floorTicks: Math.min(ticks, range.startingTicks) }));
  };
  return (
    <div className="classic-speed-control" role="group" aria-label={copy.labels.classicSpeedRange} style={controlStyle}>
      <div className="classic-speed-control__heading">
        <span><b>{copy.labels.classicSpeedRange}</b><small>{copy.labels.appliesNextRun}</small></span>
        <span className="classic-speed-control__meta">
          <strong className="classic-speed-control__grade" data-grade={difficultyGrade} data-testid="classic-difficulty-grade">
            {copy.labels.classicDifficulty} · {difficultyLabel}
          </strong>
          <em>{unit}</em>
        </span>
      </div>
      <div className="classic-speed-control__values">
        <output className="classic-speed-control__value" htmlFor="classic-starting-speed" aria-live="polite">
          <span>{copy.labels.startingFallSpeed}</span><strong>{startingSeconds}</strong>
        </output>
        <span className="classic-speed-control__direction" aria-hidden="true">→</span>
        <output className="classic-speed-control__value" htmlFor="classic-fastest-speed" aria-live="polite">
          <span>{copy.labels.fastestFallSpeed}</span><strong>{floorSeconds}</strong>
        </output>
      </div>
      <div className="classic-speed-control__rail" onPointerDown={updateBoundFromRail}>
        <span className="classic-speed-control__track" aria-hidden="true"><i /></span>
        <input
          id="classic-starting-speed"
          className="classic-speed-control__input classic-speed-control__input--start"
          type="range"
          data-testid="classic-starting-speed"
          data-arrow-nav
          data-arrow-row="3"
          data-arrow-col="1"
          min="0"
          max={choiceTicks.length - 1}
          step="1"
          value={choiceIndex(range.startingTicks)}
          aria-label={copy.labels.startingFallSpeed}
          aria-valuetext={`${startingSeconds} ${unit}`}
          onChange={(event) => onChange(normalizeClassicGravityRange({
            startingTicks: Math.max(choiceTicks[Number(event.currentTarget.value)]!, range.floorTicks),
            floorTicks: range.floorTicks,
          }))}
        />
        <input
          id="classic-fastest-speed"
          className="classic-speed-control__input classic-speed-control__input--floor"
          type="range"
          data-testid="classic-fastest-speed"
          data-arrow-nav
          data-arrow-row="3"
          data-arrow-col="2"
          min="0"
          max={choiceTicks.length - 1}
          step="1"
          value={choiceIndex(range.floorTicks)}
          aria-label={copy.labels.fastestFallSpeed}
          aria-valuetext={`${floorSeconds} ${unit}`}
          onChange={(event) => onChange(normalizeClassicGravityRange({
            startingTicks: range.startingTicks,
            floorTicks: Math.min(choiceTicks[Number(event.currentTarget.value)]!, range.startingTicks),
          }))}
        />
      </div>
      <div className="classic-speed-control__limits" aria-hidden="true"><span>1.0</span><span>0.08</span></div>
    </div>
  );
}

function SettingsShortcutGuide({ mode, language }: { mode: GameMode; language: AppLanguage }) {
  const copy = appCopy(language);
  return (
    <section className={`settings-console__keyboard settings-console__keyboard--${mode}`} data-testid="settings-shortcuts" aria-label={copy.labels.keyboard}>
      <strong>{copy.labels.keyboard}</strong>
      <div className="settings-console__key-group settings-console__key-group--gameplay" data-testid="keyboard-gameplay">
        <span className="settings-console__key-group-label">{copy.labels.gameplayControls}</span>
        <span><kbd>← →</kbd> {copy.labels.move}</span>
        <span><kbd>↑</kbd> {copy.labels.rotate}</span>
        <span><kbd>↓</kbd> {copy.labels.softDrop}</span>
        <span><kbd>Space</kbd> {copy.labels.hardDrop}</span>
        {mode === 'endgame' && <span><kbd>Z</kbd> {copy.labels.undo}</span>}
      </div>
      <div className="settings-console__key-group settings-console__key-group--shortcuts" data-testid="keyboard-shortcuts">
        <span className="settings-console__key-group-label">{copy.labels.shortcuts}</span>
        <span><kbd>S</kbd> {copy.labels.settingsShortcut}</span>
        <span><kbd>P</kbd> {copy.labels.pauseResume}</span>
        <span><kbd>R</kbd> {copy.labels.restartConfirm}</span>
        <span><kbd>Esc</kbd> {copy.labels.back}</span>
        <span><kbd>← →</kbd> {copy.labels.select}</span>
        <span><kbd>↑ ↓</kbd> {copy.labels.switch}</span>
        <span><kbd>Enter</kbd> {copy.labels.activate}</span>
      </div>
      <div className="settings-console__touch" data-testid="touch-guidance">
        <span>{copy.labels.touchControls}</span>
        <p>{copy.labels.touchGestureHint}</p>
      </div>
    </section>
  );
}

function RunStatValue({
  children,
  ariaLabel,
}: {
  children: string | number;
  ariaLabel?: string;
}) {
  return <strong key={String(children)} className="run-stats__value" aria-label={ariaLabel}>{children}</strong>;
}

function FallCadenceValue({ state, language }: { state: GameState; language: AppLanguage }) {
  const cadence = fallCadenceParts(state, language);
  return (
    <div className="run-stats__value-row">
      <RunStatValue ariaLabel={fallCadenceLabel(state, language)}>{cadence.value}</RunStatValue>
      <small className="run-stats__unit" aria-hidden="true">{cadence.unit}</small>
    </div>
  );
}

function FallCadenceLabel({ language }: { language: AppLanguage }) {
  const copy = appCopy(language);
  return <span className="run-stats__label">{copy.labels.fall}</span>;
}

export function RunStats({ state, language = DEFAULT_LANGUAGE }: { state: GameState; language?: AppLanguage }) {
  const copy = appCopy(language);
  const modeLabel = modeCopy(language, state.mode).label;
  if (state.mode === 'race') {
    const riseSeconds = survivalCountdownSeconds(state);
    const stonePieces = survivalStoneCountdownPieces(state);
    const aftershockNext = (state.survivalRiseCount + 1) % SURVIVAL_RISES_PER_AFTERSHOCK === 0;
    return (
      <section className="run-stats run-stats--survival" data-testid="stats" aria-label={`${modeLabel}${language === 'en' ? ' ' : ''}${copy.labels.modeData}`}>
        <article data-stat-role="survival-time"><span>{copy.labels.survivalTime}</span><RunStatValue>{elapsedClockLabel(state.elapsedTicks)}</RunStatValue></article>
        <article data-stat-role="lines"><span>{copy.labels.lines}</span><RunStatValue>{state.lines}</RunStatValue></article>
        <article
          data-stat-role="survival-bedrock"
          data-aftershock={aftershockNext || undefined}
          data-urgent={state.survivalRisePending || riseSeconds <= 5 || undefined}
        >
          <span>{aftershockNext ? copy.labels.aftershock : copy.phrasing.bedrockRise(state.survivalBedrockRows)}</span>
          <RunStatValue>{survivalCountdownLabel(state, language)}</RunStatValue>
        </article>
        <article
          data-stat-role="survival-stones"
          data-warning={state.survivalDebrisWarningColumns.length > 0 || undefined}
          data-urgent={stonePieces <= 2 || undefined}
        >
          <span>{copy.labels.stonefall}</span>
          <RunStatValue>{copy.phrasing.rockfallPieces(stonePieces)}</RunStatValue>
        </article>
      </section>
    );
  }
  if (state.mode === 'endgame') {
    return (
      <section className="run-stats run-stats--endgame" data-testid="stats" aria-label={`${modeLabel}${language === 'en' ? ' ' : ''}${copy.labels.modeData}`}>
        <article data-stat-role="endgame-targets"><span>{copy.labels.originalBlocks}</span><RunStatValue>{`${state.endgameTargetCells.length}/${state.endgameInitialTargetCount}`}</RunStatValue></article>
        <article data-stat-role="endgame-placed"><span>{copy.labels.placed}</span><RunStatValue>{state.pieceCount}</RunStatValue></article>
      </section>
    );
  }
  if (state.mode === 'sprint') {
    return (
      <section className="run-stats run-stats--mutation" data-testid="stats" aria-label={`${modeLabel}${language === 'en' ? ' ' : ''}${copy.labels.modeData}`}>
        <article data-stat-role="score"><span>{copy.labels.score}</span><RunStatValue>{formatScore(state.score, language)}</RunStatValue></article>
        <article data-stat-role="lines"><span>{copy.labels.lines}</span><RunStatValue>{state.lines}</RunStatValue></article>
        <article data-stat-role="classic-combo"><span>{copy.labels.combo}</span><RunStatValue>{state.combo}</RunStatValue></article>
        <article data-stat-role="fall-cadence"><FallCadenceLabel language={language} /><FallCadenceValue state={state} language={language} /></article>
      </section>
    );
  }
  return (
    <section className="run-stats" data-testid="stats" aria-label={`${modeLabel}${language === 'en' ? ' ' : ''}${copy.labels.modeData}`}>
      <article data-stat-role="score"><span>{copy.labels.score}</span><RunStatValue>{formatScore(state.score, language)}</RunStatValue></article>
      <article data-stat-role="lines"><span>{copy.labels.lines}</span><RunStatValue>{state.lines}</RunStatValue></article>
      <article data-stat-role="classic-combo"><span>{copy.labels.combo}</span><RunStatValue>{state.combo}</RunStatValue></article>
      <article data-stat-role="fall-cadence"><FallCadenceLabel language={language} /><FallCadenceValue state={state} language={language} /></article>
    </section>
  );
}

function mutationEffectLabel(item: MutationItem, ticks: number, language: AppLanguage, multiplierFactor: 1 | 2 | 4 = 1): string {
  const copy = appCopy(language);
  const label = item === 'multiplier' && multiplierFactor === 4 ? copy.labels.superMultiplier : itemLabel(language, item);
  return copy.phrasing.mutationTimer(label, Math.ceil(ticks / TICKS_PER_SECOND));
}

function mutationEffectName(item: MutationItem, language: AppLanguage, multiplierFactor: 1 | 2 | 4 = 1): string {
  const copy = appCopy(language);
  return item === 'multiplier' && multiplierFactor === 4 ? copy.labels.superMultiplier : itemLabel(language, item);
}

export function MutationStatus({ state, language = DEFAULT_LANGUAGE }: { state: GameState; language?: AppLanguage }) {
  if (state.mode !== 'sprint') return null;
  const copy = appCopy(language);
  const candidates: Array<{
    item: MutationItem;
    ticks: number;
    multiplierFactor?: 1 | 2 | 4;
    landingLatched?: boolean;
  }> = [
    { item: 'freeze', ticks: state.mutationFreezeTicks },
    {
      item: 'collapse',
      ticks: state.mutationCollapsePiecesRemaining,
      landingLatched: state.mutationCollapseLandingLatched,
    },
    { item: 'multiplier', ticks: state.mutationMultiplierTicks, multiplierFactor: state.mutationMultiplierFactor },
  ];
  // Count the latched active tetromino alongside the unclaimed future quota.
  const activeEffects = candidates.filter((effect) => effect.ticks > 0 || effect.landingLatched);

  return (
    <section
      className="mutation-status mutation-status--vfx"
      data-testid="mutation-status"
      data-active-count={activeEffects.length}
      aria-label={copy.labels.mutationStatus}
    >
      <header className="mutation-status__header">
        <strong>{copy.labels.mutationStatus}</strong>
      </header>
      <div className="mutation-status__ledger">
        {activeEffects.map((effect) => {
          const name = mutationEffectName(effect.item, language, effect.multiplierFactor);
          const coveredPieces = effect.item === 'collapse'
            ? effect.ticks + (effect.landingLatched ? 1 : 0)
            : 0;
          const label = effect.item === 'collapse'
            ? copy.phrasing.mutationPieces(name, coveredPieces)
            : mutationEffectLabel(effect.item, effect.ticks, language, effect.multiplierFactor);
          const durationTicks = effect.item === 'collapse'
            ? MUTATION_SUPERGRAVITY_PIECES
            : MUTATION_EFFECT_TICKS;
          const meterPercent = Math.round(
            (effect.item === 'collapse' ? coveredPieces : effect.ticks) / durationTicks * 100,
          );
          return (
            <div
              key={effect.item}
              className="mutation-status__effect"
              data-mutation-state={effect.item}
              data-mutation-tier={effect.item === 'multiplier' ? effect.multiplierFactor : undefined}
              data-landing-latched={effect.landingLatched || undefined}
              data-active
              aria-label={label}
            >
              <i className="mutation-status__signal" aria-hidden="true" />
              <span className="mutation-status__effect-copy">
                <b>{effect.item === 'collapse' ? label : name}</b>
              </span>
              <span className="mutation-status__meter" aria-hidden="true"><i style={{ width: `${meterPercent}%` }} /></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function eventMessage(event: GameEvent, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const copy = appCopy(language);
  if (event.type === 'lines-cleared') return copy.phrasing.eventLinesCleared(event.count);
  if (event.type === 'bedrock-raised') return copy.phrasing.eventBedrockRaised(event.height);
  if (event.type === 'bedrock-lowered') return copy.phrasing.eventBedrockLowered(event.height);
  if (event.type === 'paused') return copy.labels.pausedMessage;
  if (event.type === 'resumed') return copy.labels.resumedMessage;
  if (event.type === 'endgame-undone') return copy.labels.undoMessage;
  if (event.type === 'mutation-activated') {
    // The board explosion is the primary Bomb explanation; the live region stays terse.
    if (event.item === 'bomb') return itemLabel(language, 'bomb');
    const label = event.item === 'multiplier' && event.multiplierFactor === 4
      ? copy.labels.superMultiplier
      : itemLabel(language, event.item);
    if (event.item === 'collapse') {
      return copy.phrasing.eventSupergravityTriggered(
        label,
        event.coveredPieces ?? MUTATION_SUPERGRAVITY_PIECES,
      );
    }
    return copy.phrasing.eventItemTriggered(label, Math.ceil(event.durationTicks / TICKS_PER_SECOND));
  }
  if (event.type === 'finished') return copy.labels.targetReached;
  if (event.type === 'game-over') return copy.labels.runEnded;
  return '';
}

export function eventMessages(events: readonly GameEvent[], language: AppLanguage = DEFAULT_LANGUAGE): string {
  return events
    .map((event) => eventMessage(event, language))
    .filter((message) => message.length > 0)
    .join(' ');
}

function serialiseRect(element: Element | null) {
  if (!(element instanceof HTMLElement)) return null;
  const value = element.getBoundingClientRect();
  if (value.width <= 0 || value.height <= 0) return null;
  return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
}

declare global {
  interface Window {
    __TETRAMORPH_LAYOUT_QA__?: { collect: () => unknown };
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

export function GameSession({
  mode,
  endgameId,
  onExit,
  onCanonicalCompletion,
  leaderboard = emptyLeaderboard(),
  endgameProgress = defaultEndgameProgress(),
  onRunFinished,
  language = DEFAULT_LANGUAGE,
  onLanguageChange = () => undefined,
  visualTheme = DEFAULT_VISUAL_THEME,
  onVisualThemeChange = () => undefined,
  classicGravityRange = {
    startingTicks: CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
    floorTicks: CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
  },
  onClassicGravityRangeChange = () => undefined,
  reducedMotion = browserPlatform.mediaQuery('(prefers-reduced-motion: reduce)').matches,
  onReducedMotionChange = () => undefined,
  routeEpoch = 0,
  onRouteReady = NOOP,
}: {
  mode: GameMode;
  endgameId: EndgameId;
  onExit: (destination: ExitDestination) => void;
  onCanonicalCompletion: (state: GameState) => void;
  leaderboard?: Leaderboard;
  endgameProgress?: EndgameProgress;
  onRunFinished?: (record: ScoreRecord) => void;
  language?: AppLanguage;
  onLanguageChange?: (language: AppLanguage) => void;
  visualTheme?: VisualThemeId;
  onVisualThemeChange?: (theme: VisualThemeId) => void;
  classicGravityRange?: ClassicGravityRange;
  onClassicGravityRangeChange?: (range: ClassicGravityRange) => void;
  reducedMotion?: boolean;
  onReducedMotionChange?: (reducedMotion: boolean) => void;
  routeEpoch?: number;
  onRouteReady?: (epoch: number, ready?: boolean) => void;
}) {
  const copy = appCopy(language);
  const skipsEntryCountdown = mode === 'endgame';
  const hostRef = useRef<HTMLDivElement>(null);
  const boardGestureRef = useRef<{ id: number; x: number; y: number; at: number } | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const countdownCompleteRef = useRef(skipsEntryCountdown);
  const countdownTimerDigitRef = useRef<EntryCountdownDigit | null>(null);
  const countdownTimerRemainingMsRef = useRef(ENTRY_COUNTDOWN_STEP_MS);
  const countdownTimerDeadlineRef = useRef<number | null>(null);
  const entryCoverRemainingMsRef = useRef(ENTRY_COVER_EXIT_MS);
  const entryCoverDeadlineRef = useRef<number | null>(null);
  const curtainPresenceRef = useRef<CurtainPresence | null>(null);
  const curtainDeadlineRef = useRef<number | null>(null);
  const curtainShortenedDurationRef = useRef<number | null>(null);
  const curtainWasOpenRef = useRef<CurtainKind | null>(null);
  const curtainImmediateDismissRef = useRef(false);
  const exitWasPlayingRef = useRef(false);
  const restartWasPlayingRef = useRef(false);
  const settingsWasPlayingRef = useRef(false);
  const languageRef = useRef(language);
  const reducedMotionRef = useRef(reducedMotion);
  const initialClassicGravityRangeRef = useRef(normalizeClassicGravityRange(classicGravityRange));
  const lastRecordedRunRef = useRef<string | null>(null);
  const endgameCompletionKeyRef = useRef<string | null>(null);
  const endgameProgressRef = useRef(endgameProgress);
  const [runSeed] = useState(() => mode === 'endgame' ? APP_SEED : randomRunSeed());
  const [runtime, setRuntime] = useState<GameRuntime | null>(null);
  const [state, setState] = useState<GameState>(() => createInitialState(
    runSeed,
    mode,
    mode === 'endgame' ? endgameId : undefined,
    initialClassicGravityRangeRef.current.startingTicks,
    initialClassicGravityRangeRef.current.floorTicks,
  ));
  const [countdownDigit, setCountdownDigit] = useState<EntryCountdownDigit | null>(() => skipsEntryCountdown ? null : 3);
  const [entryCoverExiting, setEntryCoverExiting] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTabPresence, dispatchSettingsTabPresence] = useReducer(settingsTabPresenceReducer, {
    tab: 'settings',
    epoch: 0,
    animate: false,
    reduced: reducedMotion,
  });
  const settingsTab = settingsTabPresence.tab;
  const [curtainPresence, setCurtainPresenceState] = useState<CurtainPresence | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(1);
  const [resultRecord, setResultRecord] = useState<ScoreRecord | null>(null);
  const [endgameCelebration, setEndgameCelebration] = useState<EndgameCelebration | null>(null);
  endgameProgressRef.current = endgameProgress;
  reducedMotionRef.current = reducedMotion;

  const setCurtainPresence = useCallback((next: CurtainPresence | null) => {
    curtainPresenceRef.current = next;
    setCurtainPresenceState(next);
  }, []);

  const changeAudioEnabled = useCallback((enabled: boolean) => {
    runtime?.setAudioEnabled(enabled);
    setAudioEnabled(enabled);
  }, [runtime]);

  const changeAudioVolume = useCallback((volume: number) => {
    runtime?.setAudioVolume(volume);
    setAudioVolume(volume);
  }, [runtime]);

  const changeClassicGravityRange = useCallback((range: ClassicGravityRange) => {
    const normalized = normalizeClassicGravityRange(range);
    runtime?.setClassicGravityRange(normalized.startingTicks, normalized.floorTicks);
    onClassicGravityRangeChange(normalized);
  }, [onClassicGravityRangeChange, runtime]);

  const focusBoard = useCallback(() => {
    browserPlatform.defer(() => {
      browserPlatform.deferFocus(hostRef.current?.querySelector('canvas') ?? null);
    });
  }, []);

  const beginBoardGesture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (countdownDigit !== null || state.status !== 'playing') return;
    focusBoard();
    if (event.pointerType === 'mouse') return;
    boardGestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [countdownDigit, focusBoard, state.status]);

  const finishBoardGesture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const start = boardGestureRef.current;
    if (!start || start.id !== event.pointerId) return;
    boardGestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!runtime || countdownDigit !== null || state.status !== 'playing') return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (horizontal && Math.abs(deltaX) >= 22) {
      const action = deltaX < 0 ? 'left' : 'right';
      runtime.press(action);
      runtime.release(action);
      return;
    }
    if (!horizontal && deltaY >= 64) {
      runtime.press('hard-drop');
      return;
    }
    if (!horizontal && deltaY >= 22) {
      runtime.press('soft-drop');
      runtime.release('soft-drop');
      return;
    }
    if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12 && event.timeStamp - start.at < 420) runtime.press('rotate-cw');
  }, [countdownDigit, runtime, state.status]);

  const cancelBoardGesture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (boardGestureRef.current?.id === event.pointerId) boardGestureRef.current = null;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    countdownCompleteRef.current = skipsEntryCountdown;
    const nextRuntime = new GameRuntime({
      seed: runSeed,
      mode,
      endgameId: mode === 'endgame' ? endgameId : undefined,
      inputEnabled: skipsEntryCountdown,
      reducedMotion: reducedMotionRef.current,
      visualTheme,
      survivalEntryBedrockRows: mode === 'race' ? 1 : null,
      classicStartingGravityTicks: initialClassicGravityRangeRef.current.startingTicks,
      classicGravityFloorTicks: initialClassicGravityRangeRef.current.floorTicks,
      audioEnabled,
      audioVolume,
      onState: (nextState, events) => {
        if (disposed) return;
        setState(nextState);
        if (nextState.status === 'ready') {
          lastRecordedRunRef.current = null;
          endgameCompletionKeyRef.current = null;
          setResultRecord(null);
          setEndgameCelebration(null);
        }
        const recordableRun = (nextState.mode === 'marathon' || nextState.mode === 'race' || nextState.mode === 'sprint')
          && nextState.status === 'game-over';
        if (recordableRun) {
          const runKey = `${nextState.seed}:${nextState.mode}:${nextState.elapsedTicks}:${nextState.pieceCount}:${nextState.score}:${nextState.lines}`;
          if (lastRecordedRunRef.current !== runKey) {
            lastRecordedRunRef.current = runKey;
            const record = scoreRecordForState(nextState, new Date().toISOString());
            if (record) {
              setResultRecord(record);
              onRunFinished?.(record);
            }
          }
        }
        const announcement = eventMessages(events, languageRef.current);
        if (announcement) setLiveMessage(announcement);
        if (nextState.mode === 'endgame' && nextState.endgameCompletion === 'finished') {
          const completedId = nextState.completedLevelId ?? nextState.endgameId ?? endgameId;
          const completionKey = `${nextState.seed}:${completedId}:${nextState.pieceCount}:${nextState.lines}`;
          if (endgameCompletionKeyRef.current !== completionKey) {
            const previousBest = endgameBestPieceCount(endgameProgressRef.current, completedId);
            endgameCompletionKeyRef.current = completionKey;
            setEndgameCelebration({
              outcome: endgameCelebrationOutcome(previousBest, nextState.pieceCount),
              pieces: nextState.pieceCount,
              lines: nextState.lines,
              previousBest,
            });
          }
          onCanonicalCompletion(nextState);
        }
      },
    });
    runtimeRef.current = nextRuntime;
    void nextRuntime.mount(host).then(() => {
      if (disposed) return;
      setRuntime(nextRuntime);
      nextRuntime.setReducedMotion(reducedMotionRef.current);
      const canvas = host.querySelector('canvas');
      canvas?.setAttribute('aria-label', appCopy(languageRef.current).phrasing.boardLabel);
      canvas?.setAttribute('aria-description', appCopy(languageRef.current).labels.touchGestureHint);
      onRouteReady(routeEpoch, true);
      if (skipsEntryCountdown) {
        nextRuntime.start();
        setLiveMessage(appCopy(languageRef.current).labels.runStarted);
        focusBoard();
      } else if (countdownCompleteRef.current) {
        focusBoard();
      }
    }).catch(() => {
      if (disposed) return;
      nextRuntime.destroy();
      if (runtimeRef.current === nextRuntime) runtimeRef.current = null;
      onRouteReady(routeEpoch, false);
    });

    return () => {
      disposed = true;
      nextRuntime.destroy();
      if (runtimeRef.current === nextRuntime) runtimeRef.current = null;
    };
  }, [focusBoard, mode, onCanonicalCompletion, onRouteReady, onRunFinished, endgameId, routeEpoch, runSeed, skipsEntryCountdown]);

  useEffect(() => {
    runtime?.setReducedMotion(reducedMotion);
  }, [reducedMotion, runtime]);

  useEffect(() => {
    runtime?.setVisualTheme?.(visualTheme);
  }, [runtime, visualTheme]);

  useEffect(() => {
    runtime?.setClassicGravityRange(classicGravityRange.startingTicks, classicGravityRange.floorTicks);
  }, [classicGravityRange.floorTicks, classicGravityRange.startingTicks, runtime]);

  useEffect(() => {
    if (!runtime || countdownDigit === null) return;
    runtime.playEntryCountdown(countdownDigit);
  }, [countdownDigit, runtime]);

  useEffect(() => {
    if (!runtime || countdownDigit === null || settingsOpen || restartConfirmOpen || exitOpen) return;
    if (countdownTimerDigitRef.current !== countdownDigit) {
      countdownTimerDigitRef.current = countdownDigit;
      countdownTimerRemainingMsRef.current = ENTRY_COUNTDOWN_STEP_MS;
    }
    let completed = false;
    const deadline = browserPlatform.now() + countdownTimerRemainingMsRef.current;
    countdownTimerDeadlineRef.current = deadline;
    const timer = browserPlatform.scheduleTimeout(() => {
      completed = true;
      countdownTimerDeadlineRef.current = null;
      countdownTimerRemainingMsRef.current = ENTRY_COUNTDOWN_STEP_MS;
      if (countdownDigit === 3) {
        setCountdownDigit(2);
        return;
      }
      if (countdownDigit === 2) {
        setCountdownDigit(1);
        return;
      }
      countdownTimerDigitRef.current = null;
      entryCoverRemainingMsRef.current = ENTRY_COVER_EXIT_MS;
      runtime.playEntryCountdownResolve();
      setEntryCoverExiting(true);
      setCountdownDigit(null);
    }, countdownTimerRemainingMsRef.current);
    return () => {
      browserPlatform.cancelTimeout(timer);
      if (!completed && countdownTimerDeadlineRef.current === deadline) {
        countdownTimerRemainingMsRef.current = Math.max(0, deadline - browserPlatform.now());
        countdownTimerDeadlineRef.current = null;
      }
    };
  }, [countdownDigit, exitOpen, restartConfirmOpen, runtime, settingsOpen]);

  useEffect(() => {
    if (!runtime || !entryCoverExiting || settingsOpen || restartConfirmOpen || exitOpen) return;
    let completed = false;
    const deadline = browserPlatform.now() + entryCoverRemainingMsRef.current;
    entryCoverDeadlineRef.current = deadline;
    const timer = browserPlatform.scheduleTimeout(() => {
      completed = true;
      entryCoverDeadlineRef.current = null;
      entryCoverRemainingMsRef.current = ENTRY_COVER_EXIT_MS;
      countdownCompleteRef.current = true;
      runtime.setInputEnabled(true);
      runtime.start();
      setEntryCoverExiting(false);
      setLiveMessage(appCopy(languageRef.current).labels.runStarted);
      focusBoard();
    }, entryCoverRemainingMsRef.current);
    return () => {
      browserPlatform.cancelTimeout(timer);
      if (!completed && entryCoverDeadlineRef.current === deadline) {
        entryCoverRemainingMsRef.current = Math.max(0, deadline - browserPlatform.now());
        entryCoverDeadlineRef.current = null;
      }
    };
  }, [entryCoverExiting, exitOpen, focusBoard, restartConfirmOpen, runtime, settingsOpen]);

  useEffect(() => {
    runtime?.setSurvivalEntryBedrockRows(
      mode === 'race' && countdownDigit !== null ? 4 - countdownDigit : null,
    );
  }, [countdownDigit, mode, runtime]);

  useEffect(() => {
    runtime?.setAudioEnabled(audioEnabled);
    runtime?.setAudioVolume(audioVolume);
  }, [audioEnabled, audioVolume, runtime]);

  useLayoutEffect(() => {
    // Gameplay sheets change the board/rail layout in the same React commit that
    // changes their visibility. Re-render once in the layout phase and once on the
    // following paint frame: the second pass covers the browser's WebGL compositor
    // update without introducing a persistent loop or changing canonical state.
    if (!runtime) return undefined;
    runtime.refreshPresentation();
    const frame = browserPlatform.defer(() => runtime.refreshPresentation());
    return () => browserPlatform.cancelFrame(frame);
  }, [exitOpen, restartConfirmOpen, runtime, settingsOpen, state.status]);

  useEffect(() => {
    languageRef.current = language;
    // A live-region sentence is already spoken when it is written. Keeping that
    // sentence after a language switch exposes stale Chinese on an English surface
    // (and vice versa), so discard it instead of presenting mixed-language status.
    setLiveMessage('');
    const documentTarget = browserPlatform.documentTarget();
    if (documentTarget?.documentElement) documentTarget.documentElement.lang = language;
    const canvas = hostRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('aria-label', appCopy(language).phrasing.boardLabel);
      canvas.setAttribute('aria-description', appCopy(language).labels.touchGestureHint);
    }
  }, [language, runtime]);

  useEffect(() => {
    if (!import.meta.env.DEV || !runtime) return;
    window.render_game_to_text = () => {
      // The DEV text channel is read directly after deterministic QA ticks. React may
      // not have committed the corresponding visual rail frame yet, so read Core's
      // canonical current state rather than a captured render closure.
      const current = runtime.getState();
      return JSON.stringify({
        coordinateSystem: 'board origin is top-left; x increases right; y increases down; visible board is 10 columns by 20 rows',
        screen: 'game',
        mode: current.mode,
        status: current.status,
        countdown: countdownDigit,
        phase: current.phase,
        endgameId: current.endgameId,
        endgameCompletion: current.endgameCompletion,
        endgameTargetsRemaining: current.endgameTargetCells.length,
        endgameTargetsInitial: current.endgameInitialTargetCount,
        endgameUndoDepth: current.mode === 'endgame' ? current.endgameUndoHistory.length : 0,
        mutation: current.mode === 'sprint' ? {
          activeCarrier: current.mutationActiveCarrier?.item ?? null,
          lockedCarriers: current.mutationCarriers.length,
          freezeTicks: current.mutationFreezeTicks,
          collapsePiecesRemaining: current.mutationCollapsePiecesRemaining,
          multiplierTicks: current.mutationMultiplierTicks,
          lastItem: current.mutationLastItem,
        } : null,
        score: current.score,
        lines: current.lines,
        combo: current.combo,
        bedrockRows: current.survivalBedrockRows,
        bedrockIntervalSeconds: current.mode === 'race' ? survivalIntervalSeconds(current.lines) : null,
        bedrockNextSeconds: current.mode === 'race' ? survivalCountdownSeconds(current) : null,
        bedrockPending: current.mode === 'race' ? current.survivalRisePending : false,
        stoneIntervalPieces: current.mode === 'race' ? current.survivalDebrisPieceInterval : null,
        stoneNextPieces: current.mode === 'race' ? survivalStoneCountdownPieces(current) : null,
        fallingStones: current.mode === 'race'
          ? current.survivalDebris.flatMap((pair) => survivalDebrisCells(pair).map((cell) => ({ ...cell })))
          : [],
        fallTicks: gravityForMode(current.mode, current.level, current.pieceCount, current.lines),
        placedPieces: current.pieceCount,
        active: current.active ? { type: current.active.type, x: current.active.x, y: current.active.y, rotation: current.active.rotation } : null,
        next: current.queue[0] ?? null,
        nextPreviews: current.mode === 'endgame' ? current.queue.slice(0, 2) : current.queue.slice(0, 1),
        visibleBoard: current.board.slice(-20).map((row) => row.map((cell) => cell ?? '.').join('')),
      });
    };
    window.advanceTime = (ms: number) => {
      const ticks = Math.max(1, Math.round(Math.max(0, ms) / (1000 / 60)));
      window.__TETRAMORPH_QA__?.advanceTicks(ticks);
    };
    window.__TETRAMORPH_LAYOUT_QA__ = {
      collect: () => {
        const buttons = [...document.querySelectorAll<HTMLElement>('button')].map((button) => button.getBoundingClientRect());
        return {
          screen: 'game',
          countdown: countdownDigit,
          state: cloneQaState(runtime.getState()),
          renderer: runtime.getRendererSnapshot(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
          },
          bounds: {
            board: serialiseRect(document.querySelector('[data-testid="board-frame"]')),
            stats: serialiseRect(document.querySelector('[data-testid="stats"]')),
            next: serialiseRect(document.querySelector('[data-testid="next-slot"]')),
            touch: serialiseRect(document.querySelector('[data-testid="touch-rail"]')),
          },
          assertions: {
            canvasCount: document.querySelectorAll('canvas').length,
            domCellCount: document.querySelectorAll('[data-game-cell]').length,
            minButtonWidth: buttons.length ? Math.min(...buttons.map((item) => item.width)) : null,
            minButtonHeight: buttons.length ? Math.min(...buttons.map((item) => item.height)) : null,
            noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
            noVerticalOverflow: document.documentElement.scrollHeight <= window.innerHeight,
          },
        };
      },
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
      delete window.__TETRAMORPH_LAYOUT_QA__;
    };
  }, [countdownDigit, runtime]);

  const openSettings = useCallback(() => {
    if (!runtime || settingsOpen || exitOpen) return;
    const runtimeState = runtime.getState();
    if (runtimeState.status !== 'ready' && runtimeState.status !== 'playing' && runtimeState.status !== 'paused') return;
    settingsWasPlayingRef.current = restartConfirmOpen
      ? restartWasPlayingRef.current
      : runtimeState.status === 'playing';
    if (runtimeState.status === 'playing') runtime.togglePause();
    if (restartConfirmOpen) {
      setRestartConfirmOpen(false);
      restartWasPlayingRef.current = false;
    }
    runtime.setInputEnabled(false);
    dispatchSettingsTabPresence({ type: 'reset', reduced: reducedMotionRef.current });
    setSettingsOpen(true);
  }, [exitOpen, restartConfirmOpen, runtime, settingsOpen]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    if (countdownDigit === null && !entryCoverExiting) runtime?.setInputEnabled(true);
    // Opening settings is a temporary overlay even when the player paused before it.
    // Closing it always returns directly to the live board, never to a second pause sheet.
    if (runtime?.getState().status === 'paused') runtime.togglePause();
    settingsWasPlayingRef.current = false;
    focusBoard();
  }, [countdownDigit, entryCoverExiting, focusBoard, runtime]);

  const restartRun = useCallback(() => {
    curtainImmediateDismissRef.current = restartConfirmOpen;
    setExitOpen(false);
    setSettingsOpen(false);
    setRestartConfirmOpen(false);
    settingsWasPlayingRef.current = false;
    restartWasPlayingRef.current = false;
    countdownCompleteRef.current = skipsEntryCountdown;
    countdownTimerDigitRef.current = null;
    countdownTimerRemainingMsRef.current = ENTRY_COUNTDOWN_STEP_MS;
    countdownTimerDeadlineRef.current = null;
    entryCoverRemainingMsRef.current = ENTRY_COVER_EXIT_MS;
    entryCoverDeadlineRef.current = null;
    setEntryCoverExiting(false);
    runtime?.setInputEnabled(true);
    runtime?.restart();
    if (skipsEntryCountdown) {
      setCountdownDigit(null);
      runtime?.start();
      setLiveMessage(appCopy(languageRef.current).labels.runStarted);
      focusBoard();
      return;
    }
    runtime?.setInputEnabled(false);
    setCountdownDigit(3);
  }, [focusBoard, restartConfirmOpen, runtime, skipsEntryCountdown]);

  const requestRestart = useCallback(() => {
    if (!runtime || restartConfirmOpen) return;
    const runtimeState = runtime.getState();
    if (runtimeState.status !== 'playing' && runtimeState.status !== 'paused') return;
    restartWasPlayingRef.current = runtimeState.status === 'playing' || settingsWasPlayingRef.current;
    if (runtimeState.status === 'playing') runtime.togglePause();
    // The confirmation is a UI transaction: no keyboard control may leak through it.
    runtime.setInputEnabled(false);
    settingsWasPlayingRef.current = false;
    setSettingsOpen(false);
    setRestartConfirmOpen(true);
  }, [restartConfirmOpen, runtime]);

  const cancelRestart = useCallback(() => {
    const returnsToPlaying = restartWasPlayingRef.current;
    setRestartConfirmOpen(false);
    runtime?.setInputEnabled(true);
    if (returnsToPlaying && runtime?.getState().status === 'paused') runtime.togglePause();
    restartWasPlayingRef.current = false;
    if (returnsToPlaying) focusBoard();
  }, [focusBoard, runtime]);

  const requestEndgameUndo = useCallback(() => {
    if (!runtime || countdownDigit !== null || state.mode !== 'endgame' || exitOpen || restartConfirmOpen || settingsOpen) return;
    const runtimeState = runtime.getState();
    if (runtimeState.status !== 'playing' || runtimeState.endgameUndoHistory.length === 0) return;
    runtime?.undoEndgame();
    focusBoard();
  }, [countdownDigit, exitOpen, focusBoard, restartConfirmOpen, runtime, settingsOpen, state.mode]);

  const resumeRun = useCallback(() => {
    runtime?.resume();
    focusBoard();
  }, [focusBoard, runtime]);

  useEffect(() => {
    const handleRestartShortcut = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.code !== 'KeyR' || keyboardEvent.repeat || keyboardEvent.isComposing) return;
      if (restartConfirmOpen) {
        keyboardEvent.preventDefault();
        cancelRestart();
        return;
      }
      if (countdownDigit !== null || (state.status !== 'playing' && state.status !== 'paused') || exitOpen || settingsOpen) return;
      keyboardEvent.preventDefault();
      requestRestart();
    };
    return browserPlatform.listenWindow('keydown', handleRestartShortcut);
  }, [cancelRestart, countdownDigit, exitOpen, requestRestart, restartConfirmOpen, settingsOpen, state.status]);

  useEffect(() => {
    const handleInterruptionConfirm = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.code !== 'Enter' || keyboardEvent.repeat || keyboardEvent.isComposing) return;
      if (restartConfirmOpen) {
        keyboardEvent.preventDefault();
        restartRun();
        return;
      }
      if (state.status !== 'paused' || exitOpen || settingsOpen) return;
      keyboardEvent.preventDefault();
      resumeRun();
    };
    return browserPlatform.listenWindow('keydown', handleInterruptionConfirm);
  }, [exitOpen, restartConfirmOpen, restartRun, resumeRun, settingsOpen, state.status]);

  useEffect(() => {
    const handleSettingsShortcut = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.code !== 'KeyS' || keyboardEvent.repeat || keyboardEvent.isComposing) return;
      if (exitOpen || settingsOpen) return;
      keyboardEvent.preventDefault();
      openSettings();
    };
    return browserPlatform.listenWindow('keydown', handleSettingsShortcut);
  }, [exitOpen, openSettings, settingsOpen]);

  const requestExit = useCallback(() => {
    if (!runtime || exitOpen || settingsOpen) return;
    const runtimeState = runtime.getState();
    if (runtimeState.status !== 'ready' && runtimeState.status !== 'playing' && runtimeState.status !== 'paused') return;
    exitWasPlayingRef.current = restartConfirmOpen
      ? restartWasPlayingRef.current
      : runtimeState.status === 'playing';
    if (restartConfirmOpen) {
      setRestartConfirmOpen(false);
      restartWasPlayingRef.current = false;
    }
    if (runtimeState.status === 'playing') runtime.togglePause();
    runtime.setInputEnabled(false);
    setExitOpen(true);
  }, [exitOpen, restartConfirmOpen, runtime, settingsOpen]);

  const cancelExit = useCallback(() => {
    setExitOpen(false);
    if (countdownDigit === null && !entryCoverExiting) runtime?.setInputEnabled(true);
    if (exitWasPlayingRef.current && runtime?.getState().status === 'paused') runtime.togglePause();
    exitWasPlayingRef.current = false;
  }, [countdownDigit, entryCoverExiting, runtime]);

  useEffect(() => {
    const handleEndgameUndoShortcut = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.code !== 'KeyZ' || keyboardEvent.repeat || keyboardEvent.isComposing) return;
      if (countdownDigit !== null || state.mode !== 'endgame' || state.status !== 'playing' || exitOpen || restartConfirmOpen || settingsOpen) return;
      keyboardEvent.preventDefault();
      requestEndgameUndo();
    };
    return browserPlatform.listenWindow('keydown', handleEndgameUndoShortcut);
  }, [countdownDigit, exitOpen, requestEndgameUndo, restartConfirmOpen, settingsOpen, state.mode, state.status]);

  useEffect(() => {
    const handleExitShortcut = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.code !== 'Escape' || keyboardEvent.repeat || keyboardEvent.isComposing) return;
      if ((state.status !== 'ready' && state.status !== 'playing' && state.status !== 'paused') || exitOpen || settingsOpen) return;
      keyboardEvent.preventDefault();
      requestExit();
    };
    return browserPlatform.listenWindow('keydown', handleExitShortcut);
  }, [exitOpen, requestExit, settingsOpen, state.status]);

  const terminal = terminalCopy(state, language);
  const activeEndgameCelebration = state.mode === 'endgame' && terminal?.success ? endgameCelebration : null;
  const celebrationPresentation = activeEndgameCelebration
    ? endgameCelebrationCopy(activeEndgameCelebration, language)
    : null;
  const modeLabel = modeCopy(language, state.mode).label;
  const exitDestination: ExitDestination = state.mode === 'endgame' ? 'endgame-library' : 'home';
  const leaveResult = useCallback(() => onExit(exitDestination), [exitDestination, onExit]);
  const pauseOpen = state.status === 'paused' && !exitOpen && !restartConfirmOpen && !settingsOpen;
  const resultOpen = terminal !== null && !exitOpen && !restartConfirmOpen && !settingsOpen;
  const settingsTabEpoch = settingsTabPresence.animate ? settingsTabPresence.epoch : undefined;
  const settingsTabMotion = settingsTabPresence.animate
    ? settingsTabPresence.reduced ? 'reduced' : 'full'
    : undefined;
  const curtainKind: CurtainKind | null = restartConfirmOpen ? 'restart' : pauseOpen ? 'pause' : null;

  useLayoutEffect(() => {
    const previousKind = curtainWasOpenRef.current;
    curtainWasOpenRef.current = curtainKind;
    if (curtainKind === previousKind) return;
    if (curtainKind !== null) {
      if (previousKind !== null && previousKind !== curtainKind) setCurtainPresence(null);
      const next = {
        kind: curtainKind,
        phase: 'enter',
        epoch: (curtainPresenceRef.current?.epoch ?? 0) + 1,
        reduced: reducedMotionRef.current,
      } as const;
      curtainShortenedDurationRef.current = null;
      setCurtainPresence(next);
      return;
    }
    if (previousKind === null) return;
    const immediate = curtainImmediateDismissRef.current || exitOpen || settingsOpen || countdownDigit !== null
      || state.status === 'finished' || state.status === 'game-over';
    curtainImmediateDismissRef.current = false;
    if (immediate) {
      setCurtainPresence(null);
      return;
    }
    const next = {
      kind: previousKind,
      phase: 'exit',
      epoch: (curtainPresenceRef.current?.epoch ?? 0) + 1,
      reduced: reducedMotionRef.current,
    } as const;
    setCurtainPresence(next);
  }, [countdownDigit, curtainKind, exitOpen, setCurtainPresence, settingsOpen, state.status]);

  useLayoutEffect(() => {
    if (!curtainPresence || !reducedMotion || curtainPresence.reduced || curtainPresence.phase === 'steady') return;
    const remaining = curtainDeadlineRef.current === null
      ? CURTAIN_REDUCED_MS
      : Math.max(0, curtainDeadlineRef.current - browserPlatform.now());
    curtainShortenedDurationRef.current = Math.min(CURTAIN_REDUCED_MS, remaining);
    setCurtainPresence({ ...curtainPresence, reduced: true });
  }, [curtainPresence, reducedMotion, setCurtainPresence]);

  useLayoutEffect(() => {
    if (reducedMotion) dispatchSettingsTabPresence({ type: 'reduce' });
  }, [reducedMotion]);

  useEffect(() => {
    if (!curtainPresence || curtainPresence.phase === 'steady') return undefined;
    const epoch = curtainPresence.epoch;
    const phase = curtainPresence.phase;
    const duration = curtainShortenedDurationRef.current
      ?? (curtainPresence.reduced
        ? CURTAIN_REDUCED_MS
        : phase === 'enter' ? CURTAIN_ENTER_MS : CURTAIN_EXIT_MS);
    curtainShortenedDurationRef.current = null;
    curtainDeadlineRef.current = browserPlatform.now() + duration;
    const finish = () => {
      if (curtainPresenceRef.current?.epoch !== epoch || curtainPresenceRef.current.phase !== phase) return;
      curtainDeadlineRef.current = null;
      setCurtainPresence(phase === 'enter' ? { ...curtainPresence, phase: 'steady' } : null);
    };
    const timer = browserPlatform.scheduleTimeout(finish, duration);
    if (timer === null) finish();
    return () => {
      browserPlatform.cancelTimeout(timer);
      if (curtainPresenceRef.current?.epoch !== epoch || curtainPresenceRef.current.phase !== phase) {
        curtainDeadlineRef.current = null;
      }
    };
  }, [curtainPresence, setCurtainPresence]);

  useEffect(() => () => {
    curtainPresenceRef.current = null;
    curtainDeadlineRef.current = null;
    curtainShortenedDurationRef.current = null;
    curtainImmediateDismissRef.current = false;
  }, []);
  const storedRecords = state.mode === 'endgame' ? [] : recordsForMode(leaderboard, state.mode);
  const leaderboardRecords = resultRecord && scoreRecordRank(storedRecords, resultRecord) === null
    ? recordsForMode(insertScoreRecord(leaderboard, resultRecord), resultRecord.mode)
    : storedRecords;
  const resultRank = state.mode === 'endgame' ? null : scoreRecordRank(leaderboardRecords, resultRecord);
  const endgameDoublePreview = state.mode === 'endgame';
  const previewPieces = nextPreviewPieces(state);
  const previewMutationItem = state.mode === 'sprint' && previewPieces[0]
    ? nextMutationPreviewItem(state)
    : null;
  const firstPreviewDescription = previewPieces[0] && previewMutationItem
    ? copy.phrasing.mutationPreview(
        previewPieces[0],
        copy.materials[previewMutationItem],
        itemLabel(language, previewMutationItem),
      )
    : previewPieces[0];
  const firstPreviewLabel = firstPreviewDescription
    ? `${copy.labels.nextPiece}: ${firstPreviewDescription}`
    : copy.labels.nextPiece;
  const secondPreviewLabel = previewPieces[1]
    ? `${copy.labels.followingPiece}: ${previewPieces[1]}`
    : copy.labels.followingPiece;

  return (
    <main
      id="game"
      lang={language}
      className={`play-shell app-route-surface${pauseOpen || restartConfirmOpen ? ' play-shell--interrupted' : ''}`}
      data-testid="game-screen"
      tabIndex={-1}
    >
      <header className="play-topbar" data-testid="cluster-header">
        <button
          className="topbar-action topbar-action--back"
          type="button"
          data-pause-global-action
          data-testid="exit-game"
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            requestExit();
          }}
          aria-label={state.mode === 'endgame' ? copy.labels.leaveEndgame : copy.labels.leaveRun}
          aria-keyshortcuts="Escape"
        >← {copy.labels.back}</button>
        <div className="play-identity">
          <Brand compact />
          <h1 data-testid="current-mode">{modeLabel}</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="topbar-action topbar-action--settings"
            type="button"
            data-pause-global-action
            data-testid="open-settings"
            aria-label={`${copy.labels.settings} (S)`}
            aria-keyshortcuts="S"
            aria-expanded={settingsOpen}
            disabled={state.status !== 'ready' && state.status !== 'playing' && state.status !== 'paused'}
            onClick={openSettings}
          >{copy.labels.settings}</button>
        </div>
      </header>

      <section className="play-surface" aria-label={`${modeLabel} ${copy.labels.gamePanel}`}>
        <section className="game-arena" data-testid="game-cluster" aria-label={`${modeLabel} ${copy.labels.gameArea}`}>
          <div ref={hostRef} className="canvas-host" data-testid="canvas-host" />
          <aside
            className={`game-left-rail game-left-rail--${state.mode}`}
            data-testid="side-rail"
            aria-label={`${copy.labels.next}${state.mode === 'sprint' ? ` · ${copy.labels.mutationStatus}` : ''}`}
          >
            <div className={`preview-rail ${endgameDoublePreview ? 'preview-rail--endgame' : ''}`}>
              <p className="rail-label"><span>{copy.labels.next}</span></p>
              <div
                className={`next-slot ${endgameDoublePreview ? 'next-slot--dual' : ''}`}
                data-testid="next-slot"
                data-preview-frameless="true"
                data-preview-count={endgameDoublePreview ? 2 : 1}
                role={endgameDoublePreview ? undefined : 'img'}
                aria-label={endgameDoublePreview
                  ? `${copy.labels.twoUpcoming}${previewPieces.length ? ` (${previewPieces.join(', ')})` : ''}`
                  : firstPreviewLabel}
              >
                {endgameDoublePreview && (
                  <>
                    <div className="next-slot__segment" data-testid="endgame-next-segment" data-preview-segment="1" role="img" aria-label={`1 ${firstPreviewLabel}`}>
                      <span className="next-slot__segment-label" aria-hidden="true"><b>1</b></span>
                    </div>
                    <div className="next-slot__segment" data-testid="endgame-next-segment" data-preview-segment="2" role="img" aria-label={`2 ${secondPreviewLabel}`}>
                      <span className="next-slot__segment-label" aria-hidden="true"><b>2</b></span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <MutationStatus state={state} language={language} />
          </aside>
          <section
            className={`board-frame ${countdownDigit !== null || entryCoverExiting || pauseOpen || restartConfirmOpen ? 'board-frame--countdown' : ''}`}
            data-testid="board-frame"
            onPointerDown={beginBoardGesture}
            onPointerUp={finishBoardGesture}
            onPointerCancel={cancelBoardGesture}
          >
            {(countdownDigit !== null || entryCoverExiting) && (
              <div
                className={`entry-countdown${entryCoverExiting ? ' entry-countdown--exit' : ''}`}
                data-testid="entry-countdown"
                data-countdown={countdownDigit ?? 'exit'}
                role="status"
                aria-live="assertive"
                aria-atomic="true"
              >
                {countdownDigit !== null && (
                  <span key={countdownDigit} className="entry-countdown__digit">{countdownDigit}</span>
                )}
              </div>
            )}
            {curtainPresence?.kind === 'pause' && (
              <div
                className="entry-countdown entry-countdown--pause"
                data-testid="pause-curtain"
                data-curtain-phase={curtainPresence.phase}
                data-curtain-motion={curtainPresence.reduced ? 'reduced' : 'full'}
                role={curtainPresence.phase === 'exit' ? undefined : 'status'}
                inert={curtainPresence.phase === 'exit' || undefined}
                aria-hidden={curtainPresence.phase === 'exit' || undefined}
                aria-label={curtainPresence.phase === 'exit' ? undefined : `${copy.labels.pauseTitle}。${copy.labels.pauseHint}`}
              >
                <span className="entry-countdown__digit entry-countdown__digit--pause">{copy.labels.pauseTitle}</span>
                <small className="entry-countdown__hint">{copy.labels.pauseHint}</small>
              </div>
            )}
            {curtainPresence?.kind === 'restart' && (
              <div
                className="entry-countdown entry-countdown--restart"
                data-testid="restart-curtain"
                data-curtain-phase={curtainPresence.phase}
                data-curtain-motion={curtainPresence.reduced ? 'reduced' : 'full'}
                role={curtainPresence.phase === 'exit' ? undefined : 'alertdialog'}
                aria-modal={curtainPresence.phase === 'exit' ? undefined : 'true'}
                inert={curtainPresence.phase === 'exit' || undefined}
                aria-hidden={curtainPresence.phase === 'exit' || undefined}
                aria-label={curtainPresence.phase === 'exit' ? undefined : `${copy.labels.restartTitle}。${copy.labels.restartHint}`}
              >
                <span className="entry-countdown__digit entry-countdown__digit--restart">{copy.labels.restartTitle}</span>
                <small className="entry-countdown__hint">{copy.labels.restartHint}</small>
              </div>
            )}
          </section>
          <aside
            className={`game-right-rail game-right-rail--${state.mode}`}
            data-testid="data-rail"
            aria-label={`${modeLabel}${language === 'en' ? ' ' : ''}${copy.labels.modeData}`}
          >
            <RunStats state={state} language={language} />
          </aside>
        </section>

      </section>

      <ActionSheet
        open={settingsOpen}
        title={copy.labels.settings}
        description=""
        className="action-sheet--settings"
        visuallyHideTitle
        dismissOnBackdropClick
        reducedMotion={reducedMotion}
        focusReturn="external"
        onCancel={closeSettings}
      >
        <section className="settings-console" data-testid="settings-sheet" aria-label={copy.labels.settings}>
          <nav className="settings-console__tabs" role="tablist" aria-label={copy.labels.settings}>
            {([
              ['settings', copy.labels.settings],
              ['controls', copy.labels.controls],
              ['rules', copy.labels.rules],
            ] as const).map(([tab, label], index) => (
              <button
                id={`settings-tab-${tab}`}
                key={tab}
                type="button"
                role="tab"
                data-testid={`settings-tab-${tab}`}
                data-arrow-nav
                data-arrow-activate-on-focus="true"
                data-arrow-row="0"
                data-arrow-col={index}
                data-autofocus={settingsTab === tab ? true : undefined}
                aria-controls={`settings-panel-${tab}`}
                aria-selected={settingsTab === tab}
                tabIndex={settingsTab === tab ? 0 : -1}
                onClick={() => dispatchSettingsTabPresence({ type: 'select', tab, reduced: reducedMotionRef.current })}
              >{label}</button>
            ))}
          </nav>

          {settingsTab === 'settings' && (
            <section
              id="settings-panel-settings"
              className="settings-console__panel settings-console__panel--settings"
              role="tabpanel"
              aria-labelledby="settings-tab-settings"
              data-settings-tab-epoch={settingsTabEpoch}
              data-settings-tab-motion={settingsTabMotion}
            >
              <section className="settings-console__controls" data-testid="settings-controls" aria-label={copy.labels.controls}>
                <div className="settings-console__preference settings-console__preference--language">
                  <strong>{copy.labels.language}</strong>
                  <LanguageControl language={language} onChange={onLanguageChange} />
                </div>
                <div className="settings-console__preference settings-console__preference--sound">
                  <strong>{copy.labels.soundControls}</strong>
                  <AudioControls
                    enabled={audioEnabled}
                    volume={audioVolume}
                    onEnabledChange={changeAudioEnabled}
                    onVolumeChange={changeAudioVolume}
                    language={language}
                  />
                </div>
                <div className="settings-console__preference settings-console__preference--motion">
                  <strong>{copy.labels.motion}</strong>
                  <MotionControl
                    reducedMotion={reducedMotion}
                    onChange={onReducedMotionChange}
                    language={language}
                  />
                </div>
                <div className="settings-console__preference settings-console__preference--theme">
                  <strong>{copy.labels.theme}</strong>
                  <VisualThemeControl
                    theme={visualTheme}
                    language={language}
                    onChange={onVisualThemeChange}
                  />
                </div>
                {state.mode === 'marathon' && (
                  <div className="settings-console__preference settings-console__preference--classic-speed">
                    <ClassicGravityRangeControl
                      range={classicGravityRange}
                      language={language}
                      onChange={changeClassicGravityRange}
                    />
                  </div>
                )}
                <div className="settings-console__actions">
                  <button className="secondary-action" type="button" data-testid="settings-restart" data-arrow-nav data-arrow-row="4" data-arrow-col="0" data-sheet-close data-sheet-focus-owner="external" disabled={countdownDigit !== null || entryCoverExiting} onClick={restartRun}>{copy.labels.restart}</button>
                  <button className="primary-action" type="button" data-arrow-nav data-arrow-row="4" data-arrow-col="1" data-sheet-close data-sheet-focus-owner="external" onClick={closeSettings}>
                    {copy.labels.continue}
                  </button>
                </div>
              </section>
            </section>
          )}

          {settingsTab === 'controls' && (
            <section
              id="settings-panel-controls"
              className="settings-console__panel settings-console__panel--controls"
              role="tabpanel"
              aria-labelledby="settings-tab-controls"
              data-settings-tab-epoch={settingsTabEpoch}
              data-settings-tab-motion={settingsTabMotion}
            >
              <SettingsShortcutGuide mode={state.mode} language={language} />
            </section>
          )}

          {settingsTab === 'rules' && (
            <section
              id="settings-panel-rules"
              className="settings-console__panel settings-console__panel--rules"
              role="tabpanel"
              aria-labelledby="settings-tab-rules"
              data-settings-tab-epoch={settingsTabEpoch}
              data-settings-tab-motion={settingsTabMotion}
            >
              <ModeRuleSummary mode={state.mode} language={language} testId="settings-rules" />
              <SettingsRecord
                mode={state.mode}
                endgameId={state.endgameId ?? endgameId}
                leaderboard={leaderboard}
                progress={endgameProgress}
                language={language}
                classicGrade={classicDifficultyGrade(classicGravityRange.startingTicks, classicGravityRange.floorTicks)}
              />
            </section>
          )}
        </section>
      </ActionSheet>

      <ActionSheet
        open={exitOpen}
        title={copy.labels.leaveTitle}
        description=""
        tone="danger"
        reducedMotion={reducedMotion}
        onCancel={cancelExit}
      >
        <button className="primary-action" data-autofocus data-sheet-close data-sheet-focus-owner="external" type="button" onClick={() => onExit(exitDestination)}>
          {exitDestination === 'endgame-library' ? copy.labels.leaveEndgame : copy.labels.leaveRun}
        </button>
        <button className="secondary-action" data-sheet-close type="button" onClick={cancelExit}>{copy.labels.stay}</button>
      </ActionSheet>

      <ActionSheet
        open={resultOpen}
        title={celebrationPresentation?.title ?? terminal?.title ?? copy.labels.resultTitle}
        description={celebrationPresentation?.detail ?? terminal?.detail ?? ''}
        tone={terminal?.success ? 'success' : 'default'}
        className={activeEndgameCelebration
          ? 'action-sheet--endgame-celebration'
          : state.mode !== 'endgame'
            ? `action-sheet--run-result action-sheet--run-result-${state.mode}`
            : undefined}
        reducedMotion={reducedMotion}
        focusReturn="external"
        onCancel={leaveResult}
      >
        {activeEndgameCelebration && <EndgameCelebrationPanel celebration={activeEndgameCelebration} language={language} />}
        {state.mode !== 'endgame' && <>
          <RunResultSummary state={state} rank={resultRank} hasRecord={resultRecord !== null} language={language} />
          <LeaderboardPanel
            mode={state.mode}
            records={leaderboardRecords}
            highlightRecord={resultRank !== null ? resultRecord : null}
            initialClassicGrade={resultRecord?.mode === 'marathon' ? resultRecord.classicGrade : undefined}
            language={language}
          />
        </>}
        <button className="primary-action" data-autofocus data-sheet-close data-sheet-focus-owner="external" type="button" onClick={restartRun}>{state.mode === 'endgame' ? copy.labels.replay : copy.labels.playAgain}</button>
        <button className="secondary-action" data-sheet-close data-sheet-focus-owner="external" type="button" onClick={leaveResult}>
          {exitDestination === 'endgame-library' ? copy.labels.leaveEndgame : copy.labels.modeHome}
        </button>
      </ActionSheet>

      <div className="sr-only" aria-live="polite">{liveMessage}</div>
    </main>
  );
}

type RouteTransitionMode = 'idle' | 'native' | 'fallback' | 'reduced';

interface AppViewTransition {
  finished: Promise<unknown>;
  ready?: Promise<unknown>;
  updateCallbackDone?: Promise<unknown>;
  skipTransition?: () => void;
}

type AppViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => AppViewTransition;
};

interface ActiveRouteTransition {
  readonly epoch: number;
  readonly transition: AppViewTransition;
}

interface RouteReadyGate {
  readonly epoch: number;
  readonly promise: Promise<boolean>;
  readonly resolve: (ready: boolean) => void;
  timeout: PlatformTimeout;
}

function writeDocumentRouteDirection(direction: RouteTransitionDirection | null): void {
  const root = browserPlatform.documentTarget()?.documentElement;
  if (!root) return;
  if (direction === null) delete root.dataset.routeDirection;
  else root.dataset.routeDirection = direction;
}

function skipAppViewTransition(transition: AppViewTransition | null | undefined): void {
  try {
    transition?.skipTransition?.();
  } catch {
    // A browser may already have released an interrupted compositor transition.
  }
}

export default function App() {
  const [navigation, setNavigation] = useState<AppNavigationState>(readAppNavigation);
  const progressBootstrapRef = useRef<PersistedBootstrap<EndgameProgress> | null>(null);
  if (progressBootstrapRef.current === null) progressBootstrapRef.current = readEndgameProgress();
  const introBootstrapRef = useRef<PersistedBootstrap<readonly GameMode[]> | null>(null);
  if (introBootstrapRef.current === null) introBootstrapRef.current = readModeRuleIntros();
  const navigationRef = useRef(navigation);
  const [routeTransitionMode, setRouteTransitionMode] = useState<RouteTransitionMode>('idle');
  const [routeDirection, setRouteDirection] = useState<RouteTransitionDirection>('neutral');
  const [routeCommitEpoch, setRouteCommitEpoch] = useState(0);
  const routeEpochRef = useRef(0);
  const activeRouteTransitionRef = useRef<ActiveRouteTransition | null>(null);
  const routeReadyGateRef = useRef<RouteReadyGate | null>(null);
  const routeResetTimerRef = useRef<PlatformTimeout>(null);
  const routeFocusFrameRef = useRef<PlatformFrame>(null);
  const initialRouteReplacedRef = useRef(false);
  const [language, setLanguage] = useState<AppLanguage>(readLanguage);
  const [visualTheme, setVisualTheme] = useState<VisualThemeId>(readVisualTheme);
  const [classicGravityRange, setClassicGravityRange] = useState(readClassicGravityRange);
  const { screen, mode, selectedEndgameId } = navigation;
  const [progress, setProgress] = useState<EndgameProgress>(progressBootstrapRef.current.value);
  const progressRef = useRef(progress);
  const [leaderboard, setLeaderboard] = useState<Leaderboard>(readLeaderboard);
  const [introducedModes, setIntroducedModes] = useState<readonly GameMode[]>(introBootstrapRef.current.value);
  const [ruleIntroMode, setRuleIntroMode] = useState<GameMode | null>(null);
  const [reducedMotionOverride, setReducedMotionOverride] = useState<ReducedMotionOverride>(readReducedMotionOverride);
  const [systemReducedMotion, setSystemReducedMotion] = useState(
    () => browserPlatform.mediaQuery('(prefers-reduced-motion: reduce)').matches,
  );
  navigationRef.current = navigation;
  progressRef.current = progress;
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;

  useEffect(() => {
    const query = browserPlatform.mediaQuery('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(query.matches);
    return query.subscribe(setSystemReducedMotion);
  }, []);

  useEffect(() => {
    const documentTarget = browserPlatform.documentTarget();
    const copy = appCopy(language);
    if (documentTarget?.documentElement) documentTarget.documentElement.lang = language;
    const skipLink = documentTarget?.querySelector<HTMLAnchorElement>('.skip-link');
    if (skipLink) skipLink.textContent = copy.labels.skipToGame;
    const bootScreen = documentTarget?.getElementById('boot-screen');
    if (bootScreen) bootScreen.setAttribute('aria-label', copy.labels.loading);
  }, [language]);

  const settleRouteReadyGate = useCallback((epoch?: number, ready = false) => {
    const gate = routeReadyGateRef.current;
    if (!gate || (epoch !== undefined && gate.epoch !== epoch)) return;
    routeReadyGateRef.current = null;
    browserPlatform.cancelTimeout(gate.timeout);
    gate.resolve(ready);
  }, []);

  const waitForGameRouteReady = useCallback((epoch: number): Promise<boolean> => {
    settleRouteReadyGate();
    let resolve: (ready: boolean) => void = NOOP;
    const promise = new Promise<boolean>((complete) => { resolve = complete; });
    const gate: RouteReadyGate = { epoch, promise, resolve, timeout: null };
    routeReadyGateRef.current = gate;
    gate.timeout = browserPlatform.scheduleTimeout(() => {
      const active = activeRouteTransitionRef.current;
      if (active?.epoch === epoch) skipAppViewTransition(active.transition);
      settleRouteReadyGate(epoch, false);
    }, ROUTE_READY_TIMEOUT_MS);
    if (gate.timeout === null) settleRouteReadyGate(epoch, false);
    return promise;
  }, [settleRouteReadyGate]);

  const finishRouteTransition = useCallback((epoch: number) => {
    if (routeEpochRef.current !== epoch) return;
    if (activeRouteTransitionRef.current?.epoch === epoch) activeRouteTransitionRef.current = null;
    settleRouteReadyGate(epoch);
    browserPlatform.cancelTimeout(routeResetTimerRef.current);
    routeResetTimerRef.current = null;
    writeDocumentRouteDirection(null);
    setRouteTransitionMode('idle');
    setRouteDirection('neutral');
  }, [settleRouteReadyGate]);

  const focusRouteDestination = useCallback((nextNavigation: AppNavigationState, epoch: number) => {
    browserPlatform.cancelFrame(routeFocusFrameRef.current);
    routeFocusFrameRef.current = null;
    if (nextNavigation.screen === 'game') return;
    routeFocusFrameRef.current = browserPlatform.defer(() => {
      if (routeEpochRef.current !== epoch) return;
      const documentTarget = browserPlatform.documentTarget();
      const preferred = nextNavigation.screen === 'endgame-library'
        ? documentTarget?.querySelector<HTMLElement>('[data-testid="level-row"][aria-pressed="true"]')
        : documentTarget?.querySelector<HTMLElement>(`[data-testid="enter-${nextNavigation.mode}"]`);
      const landmark = documentTarget?.querySelector<HTMLElement>(
        nextNavigation.screen === 'endgame-library' ? '[data-testid="endgame-library"]' : '[data-testid="mode-home"]',
      );
      try {
        (preferred ?? landmark)?.focus({ preventScroll: true });
      } catch {
        (preferred ?? landmark)?.focus();
      }
    });
  }, []);

  const navigate = useCallback((
    nextNavigation: AppNavigationState,
    action: 'push' | 'replace' | 'pop' = 'push',
    hasUaVisualTransition = false,
  ) => {
    const windowTarget = browserPlatform.windowTarget();
    const previousNavigation = navigationRef.current;
    const previousPath = appPathFor(previousNavigation);
    const nextPath = appPathFor(nextNavigation);
    const direction = routeTransitionDirection(previousNavigation, nextNavigation);
    const epoch = routeEpochRef.current + 1;
    routeEpochRef.current = epoch;

    skipAppViewTransition(activeRouteTransitionRef.current?.transition);
    activeRouteTransitionRef.current = null;
    settleRouteReadyGate();
    browserPlatform.cancelTimeout(routeResetTimerRef.current);
    routeResetTimerRef.current = null;
    browserPlatform.cancelFrame(routeFocusFrameRef.current);
    routeFocusFrameRef.current = null;

    const commit = (transitionMode: RouteTransitionMode): boolean => {
      if (routeEpochRef.current !== epoch) return false;
      if (windowTarget && action !== 'pop') {
        const historyState = appHistoryStateFor(nextNavigation);
        if (action === 'replace') windowTarget.history.replaceState(historyState, '', nextPath);
        else if (windowTarget.location.pathname !== nextPath) windowTarget.history.pushState(historyState, '', nextPath);
      }
      navigationRef.current = nextNavigation;
      setRouteCommitEpoch(epoch);
      setRouteDirection(transitionMode === 'idle' ? 'neutral' : direction);
      setRouteTransitionMode(transitionMode);
      setNavigation(nextNavigation);
      return true;
    };

    const commitNow = (transitionMode: RouteTransitionMode): boolean => {
      let committed = false;
      flushSync(() => { committed = commit(transitionMode); });
      if (committed) focusRouteDestination(nextNavigation, epoch);
      return committed;
    };

    const queueFinish = (delayMs: number) => {
      routeResetTimerRef.current = browserPlatform.scheduleTimeout(
        () => finishRouteTransition(epoch),
        delayMs,
      );
      if (routeResetTimerRef.current === null) finishRouteTransition(epoch);
    };

    if (previousPath === nextPath || hasUaVisualTransition) {
      writeDocumentRouteDirection(null);
      commitNow('idle');
      return;
    }

    writeDocumentRouteDirection(direction);
    if (reducedMotion) {
      if (commitNow('reduced')) queueFinish(ROUTE_REDUCED_MS);
      return;
    }

    const transitionDocument = browserPlatform.documentTarget() as AppViewTransitionDocument | null;
    if (transitionDocument?.startViewTransition) {
      try {
        const transition = transitionDocument.startViewTransition(async () => {
          if (routeEpochRef.current !== epoch) return;
          const ready = nextNavigation.screen === 'game'
            ? waitForGameRouteReady(epoch)
            : null;
          if (!commitNow('native')) {
            settleRouteReadyGate(epoch);
            return;
          }
          if (ready && !(await ready)) {
            const active = activeRouteTransitionRef.current;
            if (active?.epoch === epoch) skipAppViewTransition(active.transition);
          }
        });
        if (routeEpochRef.current !== epoch) {
          skipAppViewTransition(transition);
          return;
        }
        activeRouteTransitionRef.current = { epoch, transition };
        void transition.ready?.catch(() => undefined);
        void transition.updateCallbackDone?.catch(() => undefined);
        void transition.finished.then(
          () => finishRouteTransition(epoch),
          () => finishRouteTransition(epoch),
        );
        return;
      } catch {
        if (commitNow('fallback')) queueFinish(ROUTE_FALLBACK_MS);
        return;
      }
    }
    if (commitNow('fallback')) queueFinish(ROUTE_FALLBACK_MS);
  }, [finishRouteTransition, focusRouteDestination, reducedMotion, settleRouteReadyGate, waitForGameRouteReady]);

  const notifyRouteReady = useCallback((epoch: number, ready = true) => {
    const active = activeRouteTransitionRef.current;
    if (!ready && active?.epoch === epoch) skipAppViewTransition(active.transition);
    settleRouteReadyGate(epoch, ready);
  }, [settleRouteReadyGate]);

  useEffect(() => () => {
    routeEpochRef.current += 1;
    skipAppViewTransition(activeRouteTransitionRef.current?.transition);
    activeRouteTransitionRef.current = null;
    settleRouteReadyGate();
    browserPlatform.cancelTimeout(routeResetTimerRef.current);
    browserPlatform.cancelFrame(routeFocusFrameRef.current);
    routeResetTimerRef.current = null;
    routeFocusFrameRef.current = null;
    writeDocumentRouteDirection(null);
  }, [settleRouteReadyGate]);

  useEffect(() => {
    const windowTarget = browserPlatform.windowTarget();
    if (!windowTarget) return undefined;
    if (!initialRouteReplacedRef.current) {
      initialRouteReplacedRef.current = true;
      const initialRoute = resolveAppNavigation(windowTarget.location.pathname, windowTarget.history.state);
      if (initialRoute.replacement) {
        windowTarget.history.replaceState(
          initialRoute.replacement.state,
          '',
          initialRoute.replacement.path,
        );
      } else {
        windowTarget.history.replaceState(
          appHistoryStateFor(initialRoute.navigation),
          '',
          appPathFor(initialRoute.navigation),
        );
      }
    }

    return browserPlatform.listenWindow('popstate', (event) => {
      const popEvent = event as PopStateEvent & { hasUAVisualTransition?: boolean };
      const nextRoute = resolveAppNavigation(windowTarget.location.pathname, popEvent.state);
      setRuleIntroMode(null);
      if (nextRoute.replacement) {
        windowTarget.history.replaceState(
          nextRoute.replacement.state,
          '',
          nextRoute.replacement.path,
        );
      }
      navigate(nextRoute.navigation, 'pop', popEvent.hasUAVisualTransition === true);
    });
  }, [navigate]);

  useEffect(() => {
    if (screen !== 'home' && !introducedModes.includes(mode)) setRuleIntroMode(mode);
  }, [introducedModes, mode, screen]);

  const changeLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    writeLanguage(nextLanguage);
  }, []);

  const changeVisualTheme = useCallback((nextTheme: VisualThemeId) => {
    setVisualTheme(nextTheme);
    writeVisualTheme(nextTheme);
  }, []);

  const changeClassicGravityRange = useCallback((range: ClassicGravityRange) => {
    const normalized = normalizeClassicGravityRange(range);
    setClassicGravityRange(normalized);
    writeClassicGravityRange(normalized);
  }, []);

  const changeReducedMotion = useCallback((nextReducedMotion: boolean) => {
    setReducedMotionOverride(nextReducedMotion);
    writeReducedMotionOverride(nextReducedMotion);
  }, []);

  const openMode = useCallback((nextMode: GameMode) => {
    navigate(navigationForMode(nextMode, selectedEndgameId));
  }, [navigate, selectedEndgameId]);

  const enterMode = useCallback((nextMode: GameMode) => {
    if (!introducedModes.includes(nextMode)) {
      setRuleIntroMode(nextMode);
      return;
    }
    openMode(nextMode);
  }, [introducedModes, openMode]);

  const beginIntroducedMode = useCallback(() => {
    if (ruleIntroMode === null) return;
    const nextIntroduced = introducedModes.includes(ruleIntroMode)
      ? introducedModes
      : Object.freeze(MODE_ORDER.filter((mode) => (
        mode === ruleIntroMode || introducedModes.includes(mode)
      )));
    setIntroducedModes(nextIntroduced);
    writeModeRuleIntros(nextIntroduced, introBootstrapRef.current?.canPersist ?? false);
    openMode(ruleIntroMode);
    setRuleIntroMode(null);
  }, [introducedModes, openMode, ruleIntroMode]);

  const startEndgame = useCallback(() => {
    navigate({ screen: 'game', mode: 'endgame', selectedEndgameId });
  }, [navigate, selectedEndgameId]);

  const recordCompletion = useCallback((state: GameState) => {
    const current = progressRef.current;
    const updated = recordCanonicalEndgameCompletion(current, state, selectedEndgameId);
    if (updated === current) return;
    // Storage is the first side effect so an immediate modal dismissal or unmount
    // cannot discard a success before React commits the visual update.
    writeEndgameProgress(updated, progressBootstrapRef.current?.canPersist ?? false);
    progressRef.current = updated;
    setProgress(updated);
  }, [selectedEndgameId]);

  const recordRun = useCallback((record: ScoreRecord) => {
    setLeaderboard((current) => {
      const updated = insertScoreRecord(current, record);
      browserPlatform.writeStorage(LEADERBOARD_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const exitGame = useCallback((destination: ExitDestination) => {
    navigate(destination === 'endgame-library'
      ? { screen: 'endgame-library', mode: 'endgame', selectedEndgameId }
      : DEFAULT_APP_NAVIGATION);
  }, [navigate, selectedEndgameId]);

  const selectEndgame = useCallback((endgameId: EndgameId) => {
    navigate({ ...navigationRef.current, mode: 'endgame', selectedEndgameId: endgameId }, 'replace');
  }, [navigate]);

  return (
    <div
      className="app"
      lang={language}
      data-theme={visualTheme}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-route-transition={routeTransitionMode}
      data-route-direction={routeDirection}
    >
      <ActionSheetFamily>
      <div className="app-route-viewport" data-testid="route-viewport" key={appPathFor(navigation)}>
        {screen === 'home' && <ModeHome onEnter={enterMode} language={language} />}
        {screen === 'endgame-library' && (
          <EndgameLibrary
            progress={progress}
            selectedId={selectedEndgameId}
            onSelect={selectEndgame}
            onStart={startEndgame}
            onBack={() => navigate(DEFAULT_APP_NAVIGATION)}
            language={language}
          />
        )}
        {screen === 'game' && (
          <GameSession
            key={`${mode}:${selectedEndgameId}`}
            mode={mode}
            endgameId={selectedEndgameId}
            onExit={exitGame}
            onCanonicalCompletion={recordCompletion}
            leaderboard={leaderboard}
            endgameProgress={progress}
            onRunFinished={recordRun}
            language={language}
            onLanguageChange={changeLanguage}
            visualTheme={visualTheme}
            onVisualThemeChange={changeVisualTheme}
            classicGravityRange={classicGravityRange}
            onClassicGravityRangeChange={changeClassicGravityRange}
            reducedMotion={reducedMotion}
            onReducedMotionChange={changeReducedMotion}
            routeEpoch={routeCommitEpoch}
            onRouteReady={notifyRouteReady}
          />
        )}
      </div>
      <ActionSheet
        open={ruleIntroMode !== null}
        title={ruleIntroMode === null ? appCopy(language).labels.rules : modeRulesTitle(language, ruleIntroMode)}
        description=""
        reducedMotion={reducedMotion}
        onCancel={() => setRuleIntroMode(null)}
        onConfirm={beginIntroducedMode}
      >
        {ruleIntroMode !== null && <ModeRuleSummary mode={ruleIntroMode} language={language} testId="entry-mode-rules" showHeading={false} variant="intro" />}
        <button className="primary-action" data-autofocus data-sheet-close data-sheet-focus-owner="external" type="button" onClick={beginIntroducedMode}>{appCopy(language).labels.okay}</button>
        <button className="secondary-action" data-sheet-close type="button" onClick={() => setRuleIntroMode(null)}>{appCopy(language).labels.back}</button>
      </ActionSheet>
      </ActionSheetFamily>
    </div>
  );
}
