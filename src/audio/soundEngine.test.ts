import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSoundEngine } from './soundEngine.js'
import type { SoundName } from './soundEngine.js'

// Minimal AudioContext mock
function createMockAudioContext() {
  const oscillators: { type: string; started: boolean; stopped: boolean }[] = []
  const gainNodes: { gain: { value: number } }[] = []
  const mockDestination = {}
  const ctx = {
    state: 'running' as string,
    currentTime: 0,
    sampleRate: 44100,
    destination: mockDestination,
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => {
      const osc = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(() => { osc.started = true }),
        stop: vi.fn(() => { osc.stopped = true }),
        started: false,
        stopped: false,
      }
      oscillators.push(osc)
      return osc
    }),
    createGain: vi.fn(() => {
      const node = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }
      gainNodes.push(node)
      return node
    }),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      getChannelData: vi.fn(() => new Float32Array(length)),
      length,
      sampleRate,
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
  }
  return { ctx, oscillators, gainNodes }
}

let mockCtx: ReturnType<typeof createMockAudioContext>
let storage: Record<string, string>

function createMockLocalStorage() {
  storage = {}
  return {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    removeItem: vi.fn((key: string) => { delete storage[key] }),
    clear: vi.fn(() => { storage = {} }),
    get length() { return Object.keys(storage).length },
    key: vi.fn(() => null),
  }
}

beforeEach(() => {
  mockCtx = createMockAudioContext()
  vi.stubGlobal('AudioContext', vi.fn(() => mockCtx.ctx))
  vi.stubGlobal('localStorage', createMockLocalStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ALL_SOUNDS: SoundName[] = [
  'footstep', 'swordSlash', 'monsterHit', 'heroHurt', 'monsterDeath',
  'potionDrink', 'coinPickup', 'weaponEquip', 'shieldEquip',
  'floorClear', 'gameOver', 'menuSelect',
]

describe('SoundEngine', () => {
  it('음소거 상태가 아닐 때 사운드를 재생하면 오실레이터가 생성됨', () => {
    const engine = createSoundEngine()
    engine.unlock()
    engine.play('swordSlash')
    expect(mockCtx.oscillators.length).toBeGreaterThan(0)
  })
  it('음소거 상태에서 사운드를 재생하면 오실레이터가 생성되지 않음', () => {
    const engine = createSoundEngine()
    engine.unlock()
    engine.toggleMute()
    engine.play('swordSlash')
    expect(mockCtx.oscillators.length).toBe(0)
  })
  it('toggleMute가 새로운 음소거 상태를 반환함', () => {
    const engine = createSoundEngine()
    expect(engine.isMuted()).toBe(false)
    const result = engine.toggleMute()
    expect(result).toBe(true)
    expect(engine.isMuted()).toBe(true)
    const result2 = engine.toggleMute()
    expect(result2).toBe(false)
    expect(engine.isMuted()).toBe(false)
  })
  it('음소거 상태가 localStorage에 저장됨', () => {
    const engine = createSoundEngine()
    engine.toggleMute()
    expect(localStorage.getItem('pixelRogue-muted')).toBe('1')
    engine.toggleMute()
    expect(localStorage.getItem('pixelRogue-muted')).toBe('0')
  })
  it('localStorage에 저장된 음소거 상태로 초기화됨', () => {
    localStorage.setItem('pixelRogue-muted', '1')
    const engine = createSoundEngine()
    expect(engine.isMuted()).toBe(true)
  })
  it('unlock 호출 시 suspended 상태의 AudioContext를 resume함', () => {
    mockCtx.ctx.state = 'suspended'
    const engine = createSoundEngine()
    engine.unlock()
    expect(mockCtx.ctx.resume).toHaveBeenCalled()
  })
  it('모든 사운드 타입이 에러 없이 재생됨', () => {
    const engine = createSoundEngine()
    engine.unlock()
    for (const name of ALL_SOUNDS) {
      expect(() => engine.play(name)).not.toThrow()
    }
  })
  it('AudioContext가 suspended 상태이면 사운드를 재생하지 않음', () => {
    mockCtx.ctx.state = 'suspended'
    const engine = createSoundEngine()
    engine.play('footstep')
    expect(mockCtx.oscillators.length).toBe(0)
  })
  it('전투 사운드가 올바른 수의 오실레이터를 생성함', () => {
    const engine = createSoundEngine()
    engine.unlock()
    engine.play('swordSlash')
    const slashOscCount = mockCtx.oscillators.length
    expect(slashOscCount).toBeGreaterThanOrEqual(1)
  })
  it('아이템 사운드가 오실레이터를 생성함', () => {
    const engine = createSoundEngine()
    engine.unlock()
    engine.play('coinPickup')
    expect(mockCtx.oscillators.length).toBeGreaterThan(0)
  })
  it('UI 사운드(floorClear)가 다수의 오실레이터로 팡파레를 생성함', () => {
    const engine = createSoundEngine()
    engine.unlock()
    engine.play('floorClear')
    expect(mockCtx.oscillators.length).toBeGreaterThanOrEqual(4)
  })
  it('gameOver 사운드가 하강 시퀀스를 생성함', () => {
    const engine = createSoundEngine()
    engine.unlock()
    engine.play('gameOver')
    expect(mockCtx.oscillators.length).toBeGreaterThanOrEqual(3)
  })
})
