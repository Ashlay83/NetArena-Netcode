import { describe, it, expect } from 'vitest';
import { step, hashState, type GameState, type InputCmd } from '../src/state'; 

describe('Deterministic Simulation', () => {
  it('produces the exact same final state given the same inputs', () => {
    // 1. Create a dummy starting state
    const initialState: GameState = {
      tick: 0,
      players: [
        {
          id: "player-1",
          position: { x: 100, y: 100 },
          velocity: { x: 0, y: 0 },
          health: 100,
          isDead: false,
          lastFiredTick: 0,
          deadUntilTick: 0,
          invulnerableUntilTick: 0
        },
        {
          id: "player-2",
          position: { x: 200, y: 200 },
          velocity: { x: 0, y: 0 },
          health: 100,
          isDead: false,
          lastFiredTick: 0,
          deadUntilTick: 0,
          invulnerableUntilTick: 0
        }
      ]
    };

    // 2. Create two completely independent copies (representing Server and Client)
    const stateA = structuredClone(initialState);
    const stateB = structuredClone(initialState);

    // 3. Define an exact sequence of inputs to apply
    const inputsTick1: Record<string, InputCmd> = {
      "player-1": { moveX: 1, moveY: 1, aim: 0, fire: true },
      "player-2": { moveX: -1, moveY: 0, aim: 32768, fire: false }
    };
    
    const inputsTick2: Record<string, InputCmd> = {
      "player-1": { moveX: 1, moveY: 0, aim: 0, fire: false },
      "player-2": { moveX: 0, moveY: -1, aim: 32768, fire: true }
    };

    const TICK_RATE = 1 / 60; // 60 Hz simulation

    // 4. Run State A through the simulation loops
    step(stateA, inputsTick1, TICK_RATE);
    step(stateA, inputsTick2, TICK_RATE);

    // 5. Run State B through the simulation loops with the exact same inputs
    step(stateB, inputsTick1, TICK_RATE);
    step(stateB, inputsTick2, TICK_RATE);

    // 6. Assert that both states resulted in the exact same mathematical output
    expect(hashState(stateA)).toBe(hashState(stateB));
    
    // Sanity check: Ensure the simulation actually moved them from the starting block
    expect(hashState(stateA)).not.toBe(hashState(initialState));
  });
});