import { describe, it, expect } from 'vitest'
import { createRNG } from './rng.js'

describe('createRNG', () => {
  it('같은 시드에서 같은 시퀀스 생성', () => {
    const a = createRNG(42)
    const b = createRNG(42)
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next())
    }
  })
  it('다른 시드에서 다른 시퀀스 생성', () => {
    const a = createRNG(1)
    const b = createRNG(2)
    const results = Array.from({ length: 5 }, () => a.next() !== b.next())
    expect(results.some(Boolean)).toBe(true)
  })
  it('next()는 [0, 1) 범위의 값 반환', () => {
    const rng = createRNG(123)
    for (let i = 0; i < 100; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('int()는 [min, max] 범위의 정수 반환', () => {
    const rng = createRNG(456)
    for (let i = 0; i < 100; i++) {
      const v = rng.int(3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
  it('int(n, n)은 항상 n 반환', () => {
    const rng = createRNG(789)
    for (let i = 0; i < 10; i++) {
      expect(rng.int(5, 5)).toBe(5)
    }
  })
})
