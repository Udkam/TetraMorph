import { describe, expect, it } from 'vitest';
import {
  MutationTimeline,
  createMutationActivationTimeline,
  createMutationChainTimeline,
  delay,
  parallel,
  phase,
  sequence,
} from './mutationTimeline';

describe('MutationTimeline', () => {
  it('supports sequence, parallel, delay, and named eased samples without browser timers', () => {
    const node = sequence(
      phase('enter', 100, 'cubicOut'),
      parallel(
        phase('pulse', 120, 'backOut'),
        delay(20, phase('spark', 80, 'cubicIn')),
      ),
    );
    const timeline = new MutationTimeline(node);

    expect(timeline.duration).toBe(220);
    expect(timeline.sample('enter')).toMatchObject({ active: true, progress: 0, value: 0 });
    timeline.advance(100);
    expect(timeline.sample('enter')).toMatchObject({ complete: true, progress: 1, value: 1 });
    expect(timeline.sample('pulse')).toMatchObject({ active: true, progress: 0 });
    expect(timeline.sample('spark')).toMatchObject({ active: false, progress: 0 });
    timeline.advance(60);
    expect(timeline.sample('pulse').value).toBeGreaterThan(0.5);
    expect(timeline.sample('spark')).toMatchObject({ active: true, progress: 0.5, value: 0.125 });
    timeline.advance(60);
    expect(timeline.complete).toBe(true);
  });

  it('keeps Bomb first and readable through a compact 620 ms visual sequence', () => {
    const timeline = createMutationActivationTimeline('bomb');
    expect(timeline.duration).toBe(620);
    timeline.advance(120);
    expect(timeline.sample('warning')).toMatchObject({ complete: true });
    expect(timeline.sample('pulse')).toMatchObject({ active: true, progress: 0 });
    timeline.advance(100);
    expect(timeline.sample('impact')).toMatchObject({ active: true, progress: 0 });
    timeline.advance(140);
    expect(timeline.sample('shockwave')).toMatchObject({ active: true, progress: 0 });
    timeline.advance(260);
    expect(timeline.complete).toBe(true);
  });

  it('keeps the chain-clear clock exact while exposing impact at the reveal beat', () => {
    const timeline = createMutationChainTimeline(288, 50);
    expect(timeline.duration).toBe(288);
    expect(timeline.sample('impact')).toMatchObject({ active: false, complete: false });
    timeline.advance(50);
    expect(timeline.sample('impact')).toMatchObject({ active: true, complete: false });
    timeline.advance(1);
    expect(timeline.sample('impact')).toMatchObject({ active: false, complete: true });
    timeline.advance(237);
    expect(timeline.complete).toBe(true);
  });

  it('gives Ice and Supergravity short local bind-and-release beats', () => {
    const freeze = createMutationActivationTimeline('freeze');
    expect(freeze.duration).toBe(320);
    expect(freeze.sample('frost-bind')).toMatchObject({ active: true, progress: 0 });
    expect(freeze.sample('shard-release')).toMatchObject({ active: false, progress: 0 });
    freeze.advance(120);
    expect(freeze.sample('shard-release').active).toBe(true);

    const collapse = createMutationActivationTimeline('collapse');
    expect(collapse.duration).toBe(220);
    expect(collapse.sample('pressure-bind')).toMatchObject({ active: true, progress: 0 });
    collapse.advance(120);
    expect(collapse.sample('column-release')).toMatchObject({ active: true, progress: 0 });
    collapse.advance(100);
    expect(collapse.complete).toBe(true);
  });
});
