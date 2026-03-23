import type { RNG } from './types.js'

/**
 * Mulberry32 — fast 32-bit seedable PRNG.
 * Deterministic: same seed always produces same sequence.
 */
export function createRNG(seed: number): RNG {
  let state = seed | 0
  function next(): number {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  function int(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1))
  }
  return { next, int }
}
