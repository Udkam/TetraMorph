import { MUTATION_VFX_TOKENS } from '../design/mutationTokens';
import type { MutationItem } from '../game/core';

export type MutationEasing = 'linear' | 'cubicIn' | 'cubicOut' | 'backOut';

export interface TimelinePhase {
  id: string;
  startMs: number;
  durationMs: number;
  easing: MutationEasing;
}

export interface TimelineNode {
  durationMs: number;
  phases: readonly TimelinePhase[];
}

export interface TimelineSample {
  id: string;
  active: boolean;
  complete: boolean;
  progress: number;
  value: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const mutationEase = (easing: MutationEasing, progress: number): number => {
  const value = clamp01(progress);
  if (easing === 'cubicIn') return value * value * value;
  if (easing === 'cubicOut') return 1 - Math.pow(1 - value, 3);
  if (easing === 'backOut') {
    const overshoot = 1.70158;
    const shifted = value - 1;
    return 1 + (overshoot + 1) * shifted * shifted * shifted + overshoot * shifted * shifted;
  }
  return value;
};

export const phase = (id: string, durationMs: number, easing: MutationEasing = 'linear'): TimelineNode => ({
  durationMs: Math.max(0, durationMs),
  phases: [{ id, startMs: 0, durationMs: Math.max(0, durationMs), easing }],
});

/** Place children end-to-end while preserving their local phase offsets. */
export const sequence = (...nodes: readonly TimelineNode[]): TimelineNode => {
  let offset = 0;
  const phases: TimelinePhase[] = [];
  for (const node of nodes) {
    phases.push(...node.phases.map((entry) => ({ ...entry, startMs: entry.startMs + offset })));
    offset += node.durationMs;
  }
  return { durationMs: offset, phases };
};

/** Start all children together; the longest child defines the resulting duration. */
export const parallel = (...nodes: readonly TimelineNode[]): TimelineNode => ({
  durationMs: Math.max(0, ...nodes.map((node) => node.durationMs)),
  phases: nodes.flatMap((node) => node.phases.map((entry) => ({ ...entry }))),
});

/** Offset a child without injecting a fake animation phase. */
export const delay = (durationMs: number, node: TimelineNode): TimelineNode => ({
  durationMs: Math.max(0, durationMs) + node.durationMs,
  phases: node.phases.map((entry) => ({ ...entry, startMs: entry.startMs + Math.max(0, durationMs) })),
});

/**
 * Small deterministic timeline driven by Pixi's delta time. It has no browser
 * timer and produces plain samples, so renderer tests can validate every beat.
 */
export class MutationTimeline {
  private elapsedMs = 0;

  constructor(private readonly node: TimelineNode) {}

  get elapsed(): number {
    return this.elapsedMs;
  }

  get duration(): number {
    return this.node.durationMs;
  }

  get complete(): boolean {
    return this.elapsedMs >= this.node.durationMs;
  }

  reset(): void {
    this.elapsedMs = 0;
  }

  advance(deltaMs: number): void {
    this.elapsedMs = Math.min(this.node.durationMs, this.elapsedMs + Math.max(0, deltaMs));
  }

  sample(id: string): TimelineSample {
    const entry = this.node.phases.find((phaseEntry) => phaseEntry.id === id);
    if (!entry) return { id, active: false, complete: false, progress: 0, value: 0 };
    const duration = Math.max(1, entry.durationMs);
    const rawProgress = (this.elapsedMs - entry.startMs) / duration;
    const progress = clamp01(rawProgress);
    return {
      id,
      active: rawProgress >= 0 && rawProgress < 1,
      complete: rawProgress >= 1,
      progress,
      value: mutationEase(entry.easing, progress),
    };
  }

  samples(): TimelineSample[] {
    return this.node.phases.map((entry) => this.sample(entry.id));
  }
}

/** Item-specific visual-only activation beats. Core duration remains independently owned. */
export function createMutationActivationTimeline(
  item: MutationItem,
  minimumDurationMs = 0,
): MutationTimeline {
  const timing = MUTATION_VFX_TOKENS[item].animation;
  if (item === 'bomb') {
    const normal = sequence(
      phase('warning', timing.enterMs, 'cubicOut'),
      phase('pulse', timing.pulseMs, 'backOut'),
      phase('impact', 140, 'cubicIn'),
      phase('shockwave', 260, 'cubicOut'),
    );
    return new MutationTimeline(minimumDurationMs > normal.durationMs
      ? parallel(normal, phase('chain-propagation', minimumDurationMs, 'linear'))
      : normal);
  }
  if (item === 'collapse') {
    return new MutationTimeline(sequence(
      phase('pressure-bind', timing.enterMs, 'cubicOut'),
      phase('column-release', timing.pulseMs, 'cubicIn'),
    ));
  }
  if (item === 'freeze') {
    return new MutationTimeline(parallel(
      phase('frost-bind', timing.enterMs, 'cubicOut'),
      delay(Math.round(timing.enterMs * 0.34), phase('shard-release', Math.round(timing.enterMs * 0.66), 'cubicOut')),
    ));
  }
  return new MutationTimeline(parallel(
    phase('score-pop', timing.enterMs, 'backOut'),
    delay(Math.round(timing.enterMs * 0.28), phase('spark-tail', timing.activationMs - Math.round(timing.enterMs * 0.28), 'cubicOut')),
  ));
}

/** Exact shared chain-clear clock; normal Bomb phases must not extend a reduced wave. */
export function createMutationChainTimeline(durationMs: number, impactAtMs: number): MutationTimeline {
  const duration = Math.max(1, durationMs);
  const impactAt = Math.max(0, Math.min(duration - 1, impactAtMs));
  return new MutationTimeline(parallel(
    phase('chain-propagation', duration, 'linear'),
    delay(impactAt, phase('impact', 1, 'cubicOut')),
  ));
}
