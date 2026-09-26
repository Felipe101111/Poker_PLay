import { randomInt } from 'node:crypto';

export type Rng = () => number;

// mulberry32: tiny, fast, seedable PRNG — good enough for shuffling (not cryptographic),
// reproducible given the same seed (FR-002). No external dependency needed.
export function createRng(seed?: number): Rng {
  let state = (seed ?? randomInt(0, 2 ** 31)) >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
