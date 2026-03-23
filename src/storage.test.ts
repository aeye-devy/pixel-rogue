import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadHighScore, saveHighScore } from './storage.js'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
  get length() { return Object.keys(store).length },
  key: vi.fn((_i: number) => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

describe('하이스코어 저장소', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })
  it('저장된 데이터가 없을 때 기본값 0 반환', () => {
    const data = loadHighScore()
    expect(data.highScore).toBe(0)
    expect(data.bestFloor).toBe(0)
  })
  it('스코어와 층수를 저장하고 불러오기', () => {
    saveHighScore(100, 5)
    const data = loadHighScore()
    expect(data.highScore).toBe(100)
    expect(data.bestFloor).toBe(5)
  })
  it('기존 하이스코어보다 낮은 점수는 갱신하지 않음', () => {
    saveHighScore(200, 10)
    saveHighScore(50, 3)
    const data = loadHighScore()
    expect(data.highScore).toBe(200)
    expect(data.bestFloor).toBe(10)
  })
  it('기존 하이스코어보다 높은 점수는 갱신', () => {
    saveHighScore(100, 5)
    const result = saveHighScore(300, 8)
    expect(result.highScore).toBe(300)
    expect(result.bestFloor).toBe(8)
  })
  it('스코어와 층수를 독립적으로 최대값 유지', () => {
    saveHighScore(100, 10)
    saveHighScore(200, 5)
    const data = loadHighScore()
    expect(data.highScore).toBe(200)
    expect(data.bestFloor).toBe(10)
  })
  it('잘못된 localStorage 값에 대해 기본값 반환', () => {
    store['pixelRogue-highScore'] = 'not-a-number'
    store['pixelRogue-bestFloor'] = 'invalid'
    const data = loadHighScore()
    expect(data.highScore).toBe(0)
    expect(data.bestFloor).toBe(0)
  })
})
