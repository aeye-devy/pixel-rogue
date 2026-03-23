import { describe, it, expect } from 'vitest'
import { generateFloor, shouldShowExit, EXIT_THRESHOLD } from './floor.js'
import { createRNG } from './rng.js'
import { GRID_SIZE } from './types.js'

describe('generateFloor', () => {
  it('4x4 그리드 생성', () => {
    const rng = createRNG(42)
    const { grid } = generateFloor(1, rng)
    expect(grid.length).toBe(GRID_SIZE)
    for (const row of grid) {
      expect(row.length).toBe(GRID_SIZE)
    }
  })
  it('히어로 위치에 엔티티 배치하지 않음', () => {
    const rng = createRNG(42)
    const { grid, heroPos } = generateFloor(1, rng)
    expect(grid[heroPos.y]![heroPos.x]).toBeNull()
  })
  it('1층에 몬스터, 포션, 코인 배치', () => {
    const rng = createRNG(42)
    const { grid, entityCount } = generateFloor(1, rng)
    expect(entityCount).toBeGreaterThan(0)
    const kinds = new Set<string>()
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y]?.[x]
        if (cell != null) kinds.add(cell.kind)
      }
    }
    expect(kinds.has('monster')).toBe(true)
    expect(kinds.has('coin')).toBe(true)
  })
  it('높은 층에서 무기와 방패 등장 가능', () => {
    let hasWeapon = false
    let hasShield = false
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRNG(seed)
      const { grid } = generateFloor(6, rng)
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y]?.[x]
          if (cell?.kind === 'weapon') hasWeapon = true
          if (cell?.kind === 'shield') hasShield = true
        }
      }
    }
    expect(hasWeapon).toBe(true)
    expect(hasShield).toBe(true)
  })
  it('1층에서 무기와 방패 미등장', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRNG(seed)
      const { grid } = generateFloor(1, rng)
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y]?.[x]
          expect(cell?.kind).not.toBe('weapon')
          expect(cell?.kind).not.toBe('shield')
        }
      }
    }
  })
  it('무기 드롭은 확률적 (60%)', () => {
    let weaponCount = 0
    const trials = 100
    for (let seed = 1; seed <= trials; seed++) {
      const rng = createRNG(seed)
      const { grid } = generateFloor(5, rng)
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (grid[y]?.[x]?.kind === 'weapon') weaponCount++
        }
      }
    }
    expect(weaponCount).toBeGreaterThan(30)
    expect(weaponCount).toBeLessThan(85)
  })
  it('같은 시드에서 동일한 층 생성', () => {
    const a = generateFloor(3, createRNG(100))
    const b = generateFloor(3, createRNG(100))
    expect(a.heroPos).toEqual(b.heroPos)
    expect(a.entityCount).toBe(b.entityCount)
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        expect(a.grid[y]![x]).toEqual(b.grid[y]![x])
      }
    }
  })
  it('층이 올라갈수록 몬스터 체력 증가', () => {
    const floor1Grid = generateFloor(1, createRNG(42)).grid
    const floor10Grid = generateFloor(10, createRNG(42)).grid
    function maxMonsterHp(grid: (typeof floor1Grid)): number {
      let max = 0
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y]?.[x]
          if (cell?.kind === 'monster' && cell.hp > max) max = cell.hp
        }
      }
      return max
    }
    expect(maxMonsterHp(floor10Grid)).toBeGreaterThan(maxMonsterHp(floor1Grid))
  })
})

describe('shouldShowExit', () => {
  it('전체의 60% 이상 클리어 시 true', () => {
    expect(shouldShowExit(6, 10)).toBe(true)
    expect(shouldShowExit(7, 10)).toBe(true)
  })
  it('60% 미만 클리어 시 false', () => {
    expect(shouldShowExit(5, 10)).toBe(false)
    expect(shouldShowExit(0, 10)).toBe(false)
  })
  it('엔티티가 0개일 때 true', () => {
    expect(shouldShowExit(0, 0)).toBe(true)
  })
  it('EXIT_THRESHOLD는 0.6', () => {
    expect(EXIT_THRESHOLD).toBe(0.6)
  })
})
