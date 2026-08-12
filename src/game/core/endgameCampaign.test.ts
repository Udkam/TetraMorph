import { describe, expect, it } from 'vitest';
import { createInitialState, dispatch } from './engine';
import { ENDGAME_DEFINITIONS, getEndgameDefinition } from './endgames';
import type { GameCommand, GameState, EndgameId } from './types';

function settle(state: GameState): GameState {
  let next = state;
  for (let tick = 0; tick < 64 && next.status === 'playing' && (!next.active || next.phase !== 'active'); tick += 1) {
    next = dispatch(next, { type: 'tick' }).state;
  }
  return next;
}

describe('Phase-7 transitional all-open Endgame campaign behavior', () => {
  it('orders the stable IDs as a teaching-first curriculum before the later authored batches', () => {
    expect(ENDGAME_DEFINITIONS.map((definition) => definition.id)).toEqual([
      't3r-shaft-01', 't3r-shaft-02', 't3r-shaft-03', 't3r-cascade-06', 't3r-shaft-04',
      't3r-cascade-05', 't5r-delta-07', 't5r-lattice-09', 't5r-rift-10', 't5r-drift-08',
      't5r-pulse-14', 't5r-arc-13', 't5r-current-12', 't5r-prism-11', 't5r-horizon-15',
      't6r-cairn-17', 't6r-terrace-18', 't6r-keystone-20', 't6r-bastion-19', 't6r-veil-16',
      'tm-endgame-21', 'tm-endgame-22', 'tm-endgame-23', 'tm-endgame-24', 'tm-endgame-25',
      'tm-endgame-26', 'tm-endgame-27', 'tm-endgame-28', 'tm-endgame-29', 'tm-endgame-30',
      'tm-endgame-31', 'tm-endgame-32', 'tm-endgame-33', 'tm-endgame-34', 'tm-endgame-35',
      'tm-endgame-36', 'tm-endgame-37', 'tm-endgame-38', 'tm-endgame-39', 'tm-endgame-40',
      'tm-endgame-41', 'tm-endgame-42', 'tm-endgame-43', 'tm-endgame-44', 'tm-endgame-45',
      'tm-endgame-46', 'tm-endgame-47', 'tm-endgame-48', 'tm-endgame-49', 'tm-endgame-50',
    ] satisfies EndgameId[]);
    expect(ENDGAME_DEFINITIONS.every((definition) => !('solverPieceBudget' in definition))).toBe(true);
    expect(ENDGAME_DEFINITIONS.map((definition) => definition.difficulty)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    expect(ENDGAME_DEFINITIONS.some((definition) => definition.anchorCells.length > 0)).toBe(true);
    expect(ENDGAME_DEFINITIONS.every((definition) => definition.anchorCells.length <= 2)).toBe(true);
  });

  it('continues an unsolved Endgame through ordinary locks instead of failing by a piece count', () => {
    let state = dispatch(createInitialState(0, 'endgame', 't3r-shaft-01'), { type: 'start' }).state;
    // Move the opening piece away from the replayed composition. It locks without
    // clearing every original target, yet the game must continue via normal flow.
    state = dispatch(state, { type: 'move', dx: -1 }).state;
    const locked = dispatch(state, { type: 'hard-drop' });
    state = settle(locked.state);

    expect(locked.events.some((event) => event.type === 'piece-locked')).toBe(true);
    expect(state.status).toBe('playing');
    expect(state.endgameCompletion).toBe('active');
    expect(state.endgameTargetCells.length).toBeGreaterThan(0);
    expect(state.active).not.toBeNull();
  });

  it('keeps level selection, deterministic restart, and continuous queue ownership level-local', () => {
    for (const definition of ENDGAME_DEFINITIONS) {
      const ready = createInitialState(0x51a1f00d, 'endgame', definition.id);
      expect(ready.endgameId).toBe(definition.id);
      expect(ready.seed).toBe(definition.seed);
      expect(ready.queue.length).toBeGreaterThanOrEqual(5);
      expect(ready.endgameQueue).toEqual(ready.queue);
      const restarted = dispatch(ready, { type: 'restart' }).state;
      expect(restarted).toEqual(ready);
    }
  });

  it('retains direct Core selection validation for every stable campaign id', () => {
    for (const definition of ENDGAME_DEFINITIONS) {
      expect(getEndgameDefinition(definition.id)).toBe(definition);
    }
  });

  it('does not give an arbitrary public-command replay a hidden queue limit', () => {
    const commands: GameCommand[] = [
      { type: 'start' },
      { type: 'move', dx: -1 },
      { type: 'hard-drop' },
      { type: 'tick' },
      { type: 'tick' },
      { type: 'tick' },
    ];
    const state = commands.reduce(
      (current, command) => dispatch(current, command).state,
      createInitialState(0, 'endgame', 't3r-shaft-01'),
    );
    expect(state.status).toBe('playing');
    expect(state.endgameCompletion).toBe('active');
  });
});
