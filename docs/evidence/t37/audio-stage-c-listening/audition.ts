import { AudioEngine } from '../../../../src/game/audio/AudioEngine';
import type { GameEvent } from '../../../../src/game/core';

const SOURCE_COMMIT = '4d39951421234c8465960c4b81c6a7df7e0a804d';
const audio = new AudioEngine();
const status = document.querySelector<HTMLElement>('#audio-status');
const lastCue = document.querySelector<HTMLElement>('#last-cue');
const volume = document.querySelector<HTMLInputElement>('#volume');
const volumeValue = document.querySelector<HTMLOutputElement>('#volume-value');
const mute = document.querySelector<HTMLButtonElement>('#mute');
const scheduledTimers = new Set<number>();
let primed = false;
let enabled = true;
let playCount = 0;
let currentCue = '尚未播放';
let currentCueId: string | null = null;
let lastBombOutcome: 'blast' | 'chain-clear' | null = null;
let lastEventTypes: readonly string[] = [];
let lastDispatchSequence: readonly string[] = [];
let lastChainOriginCells: readonly { x: number; y: number }[] = [];
const bombDispatches = { blast: 0, 'chain-clear': 0 };

const mutation = (item: 'freeze' | 'collapse' | 'multiplier', multiplierFactor?: 2 | 4): GameEvent => ({
  type: 'mutation-activated',
  item,
  durationTicks: 600,
  score: 0,
  rowsRemoved: 0,
  multiplierFactor,
  triggerCells: [{ x: 3, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 7 }, { x: 4, y: 7 }],
});

const normalBombEvents: readonly GameEvent[] = [
  { type: 'clear-started', rows: [38, 39], mutationBombOutcome: 'blast' },
  {
    type: 'mutation-activated',
    item: 'bomb',
    durationTicks: 0,
    score: 300,
    rowsRemoved: 3,
    triggerCells: [{ x: 4, y: 38 }, { x: 5, y: 38 }, { x: 4, y: 39 }, { x: 5, y: 39 }],
    bombOutcome: 'blast',
    blastRows: [37, 38, 39],
    participatingBombCount: 1,
  },
];

const chainOriginCells = [
  { x: 4, y: 29 }, { x: 5, y: 29 }, { x: 4, y: 30 }, { x: 5, y: 30 },
] as const;
const chainBombEvents: readonly GameEvent[] = [
  { type: 'clear-started', rows: [29], mutationBombOutcome: 'chain-clear' },
  {
    type: 'mutation-activated',
    item: 'bomb',
    durationTicks: 0,
    score: 600,
    rowsRemoved: 6,
    triggerCells: [
      ...chainOriginCells,
      { x: 7, y: 30 }, { x: 8, y: 30 }, { x: 7, y: 31 }, { x: 8, y: 31 },
    ],
    bombOutcome: 'chain-clear',
    blastRows: [28, 29, 30],
    participatingBombCount: 2,
    chainOriginCarrierId: 1,
    chainOriginCells,
  },
];

const play = (events: readonly GameEvent[]): void => {
  lastEventTypes = events.map((event) => event.type);
  lastDispatchSequence = lastEventTypes;
  lastBombOutcome = null;
  lastChainOriginCells = [];
  audio.play(events);
};
const playBomb = (events: readonly GameEvent[]): void => {
  const activation = events.find((event): event is Extract<GameEvent, { type: 'mutation-activated'; item: 'bomb' }> => (
    event.type === 'mutation-activated' && event.item === 'bomb'
  ));
  if (!activation) throw new Error('Bomb listening control requires a Bomb activation event.');
  audio.play([{ type: 'restarted' }]);
  for (const event of events) audio.play([event]);
  lastEventTypes = events.map((event) => event.type);
  lastDispatchSequence = ['restarted', ...lastEventTypes];
  lastBombOutcome = activation.bombOutcome;
  lastChainOriginCells = activation.bombOutcome === 'chain-clear'
    ? activation.chainOriginCells.map((cell) => ({ ...cell }))
    : [];
  bombDispatches[activation.bombOutcome] += 1;
};
const after = (milliseconds: number, callback: () => void): void => {
  const timer = window.setTimeout(() => {
    scheduledTimers.delete(timer);
    callback();
  }, milliseconds);
  scheduledTimers.add(timer);
};
const clearTimers = (): void => {
  for (const timer of scheduledTimers) window.clearTimeout(timer);
  scheduledTimers.clear();
};

const handlers: Readonly<Record<string, () => void>> = {
  'move-left': () => play([{ type: 'piece-moved', piece: 'T', dx: -1, dy: 0, cause: 'move' }]),
  'move-right': () => play([{ type: 'piece-moved', piece: 'T', dx: 1, dy: 0, cause: 'move' }]),
  rotate: () => play([{ type: 'piece-rotated', piece: 'T', direction: 1 }]),
  lock: () => play([{ type: 'piece-locked', piece: 'T', cells: [] }]),
  'hard-drop': () => play([{ type: 'hard-dropped', piece: 'I', distance: 12 }]),
  'clear-1': () => play([{ type: 'clear-started', rows: [39] }]),
  'clear-2': () => play([{ type: 'clear-started', rows: [38, 39] }]),
  'clear-3': () => play([{ type: 'clear-started', rows: [37, 38, 39] }]),
  'clear-4': () => play([{ type: 'clear-started', rows: [36, 37, 38, 39] }]),
  countdown: () => {
    audio.playEntryCountdown(3);
    after(500, () => audio.playEntryCountdown(2));
    after(1_000, () => audio.playEntryCountdown(1));
    after(1_500, () => audio.playEntryCountdownResolve());
  },
  freeze: () => play([mutation('freeze')]),
  'soft-drop': () => play([{ type: 'piece-moved', piece: 'T', dx: 0, dy: 1, cause: 'soft-drop' }]),
  undo: () => play([{ type: 'endgame-undone' }]),
  pause: () => play([{ type: 'paused' }]),
  resume: () => play([{ type: 'resumed' }]),
  'bedrock-rise': () => play([{ type: 'bedrock-raised', count: 1, height: 3 }]),
  'bedrock-lower': () => play([{ type: 'bedrock-lowered', count: 1, height: 2 }]),
  'stone-warning': () => play([{ type: 'survival-stones-warned', columns: [3], height: 2, leadPieces: 1 }]),
  'stone-spawn': () => play([{ type: 'survival-stones-spawned', cells: [{ x: 3, y: 0 }], intervalPieces: 8, nextIntervalPieces: 8 }]),
  'stone-land': () => play([{ type: 'survival-stones-landed', cells: [{ x: 3, y: 12 }] }]),
  'level-up': () => play([{ type: 'level-up', level: 2 }]),
  finished: () => play([{ type: 'finished', completionTicks: 1_800 }]),
  'game-over': () => play([{ type: 'game-over', reason: 'block-out' }]),
  'bomb-normal': () => playBomb(normalBombEvents),
  'bomb-chain': () => playBomb(chainBombEvents),
  supergravity: () => play([mutation('collapse')]),
  'multiplier-2': () => play([mutation('multiplier', 2)]),
  'multiplier-4': () => play([mutation('multiplier', 4)]),
  'mutation-sequence': () => play([
    mutation('freeze'), mutation('collapse'), mutation('multiplier', 2),
  ]),
};

async function trigger(button: HTMLButtonElement): Promise<void> {
  const id = button.dataset.cue;
  const handler = id ? handlers[id] : undefined;
  if (!id || !handler) return;
  clearTimers();
  for (const active of document.querySelectorAll<HTMLButtonElement>('[data-playing]')) {
    delete active.dataset.playing;
  }
  button.dataset.playing = 'true';
  status && (status.textContent = primed ? '正式运行链已连接' : '正在载入本地音频…');
  await audio.prime();
  primed = true;
  handler();
  playCount += 1;
  currentCueId = id;
  currentCue = button.textContent?.trim().replace(/\s+/g, ' ') ?? id;
  status && (status.textContent = enabled ? '正式运行链已连接' : '当前为静音');
  lastCue && (lastCue.textContent = `最近：${currentCue}`);
  const activeMilliseconds = id === 'countdown' || id === 'mutation-sequence'
    ? 1_820
    : id === 'bomb-normal' || id === 'bomb-chain' ? 720 : 420;
  after(activeMilliseconds, () => {
    delete button.dataset.playing;
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-cue]')) {
  button.addEventListener('click', () => { void trigger(button); });
}

volume?.addEventListener('input', () => {
  const value = Number(volume.value) / 100;
  audio.setVolume(value);
  volumeValue && (volumeValue.textContent = `${volume.value}%`);
});

mute?.addEventListener('click', () => {
  enabled = !enabled;
  audio.setEnabled(enabled);
  mute.setAttribute('aria-pressed', String(!enabled));
  mute.textContent = enabled ? '静音' : '恢复声音';
  status && (status.textContent = enabled ? '正式运行链已连接' : '当前为静音');
});

window.addEventListener('pagehide', () => {
  clearTimers();
  audio.destroy();
}, { once: true });

declare global {
  interface Window {
    __T37_STAGE_C_READY__: boolean;
    render_game_to_text: () => string;
  }
}

window.render_game_to_text = () => JSON.stringify({
  sourceCommit: SOURCE_COMMIT,
  productionEngine: true,
  primed,
  enabled,
  volume: audio.getVolume(),
  playCount,
  currentCue,
  currentCueId,
  lastBombOutcome,
  lastEventTypes,
  lastDispatchSequence,
  lastChainOriginCells,
  bombDispatches: { ...bombDispatches },
  pendingTimers: scheduledTimers.size,
});
window.__T37_STAGE_C_READY__ = true;
