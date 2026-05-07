/**
 * Runtime adapters for impure platform primitives.
 *
 * Application services receive these as injected dependencies so tests can use
 * deterministic clocks and random generators without reaching into globals.
 */
export const systemClock = {
  now(): number {
    return Date.now();
  },
};

export const systemTimer = {
  nowMs(): number {
    return globalThis.performance?.now() ?? Date.now();
  },
};

export const systemRandom = {
  next(): number {
    return Math.random();
  },
};

export type Clock = {
  now: () => number;
};

export type Timer = {
  nowMs: () => number;
};

export type RandomSource = {
  next: () => number;
};

export type RuntimeDependencies = {
  clock?: Clock;
  random?: RandomSource;
};

export function createBoardInstanceIdGenerator(
  dependencies: RuntimeDependencies = {},
): () => string {
  const clock = dependencies.clock ?? systemClock;
  const random = dependencies.random ?? systemRandom;

  return () => {
    const timestamp = clock.now();
    const token = random.next().toString(36).slice(2, 8);
    return `instance-${timestamp}-${token}`;
  };
}
