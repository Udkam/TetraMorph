import { AudioEngine } from '../../../../src/game/audio/AudioEngine';
import type { GameEvent } from '../../../../src/game/core';

const SOURCE_COMMIT = '95978eb8ad5fe66eb77faf05d010df9eb1a66cfa';
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

const mutation = (item: 'freeze' | 'collapse' | 'bomb' | 'multiplier', multiplierFactor?: 2 | 4): GameEvent => ({
  type: 'mutation-activated',
  item,
  durationTicks: item === 'bomb' ? 0 : 600,
  score: item === 'bomb' ? 300 : 0,
  rowsRemoved: item === 'bomb' ? 3 : 0,
  multiplierFactor,
  triggerCells: [{ x: 3, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 7 }, { x: 4, y: 7 }],
});

const play = (events: readonly GameEvent[]): void => audio.play(events);
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
  undo: () => play([{ type: 'puzzle-undone' }]),
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
  bomb: () => play([mutation('bomb')]),
  supergravity: () => play([mutation('collapse')]),
  'multiplier-2': () => play([mutation('multiplier', 2)]),
  'multiplier-4': () => play([mutation('multiplier', 4)]),
  'mutation-sequence': () => play([
    mutation('freeze'), mutation('collapse'), mutation('bomb'), mutation('multiplier', 2),
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
  currentCue = button.textContent?.trim().replace(/\s+/g, ' ') ?? id;
  status && (status.textContent = enabled ? '正式运行链已连接' : '当前为静音');
  lastCue && (lastCue.textContent = `最近：${currentCue}`);
  after(id === 'countdown' || id === 'mutation-sequence' ? 1_820 : 420, () => {
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
  pendingTimers: scheduledTimers.size,
});
window.__T37_STAGE_C_READY__ = true;
