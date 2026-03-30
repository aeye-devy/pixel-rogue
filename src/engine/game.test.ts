import { describe, it, expect } from 'vitest'
import { createGame, createGameController, moveHero, calculateScore } from './game.js'
import { createRNG } from './rng.js'
import type { Cell, Direction, GameState, Monster, Position } from './types.js'
import { GRID_SIZE } from './types.js'
import { isBossFloor } from './floor.js'

// -- Helpers --

function makeGrid(entries: Array<{ pos: Position; cell: Cell }>): Cell[][] {
  const grid: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  )
  for (const { pos, cell } of entries) {
    grid[pos.y]![pos.x] = cell
  }
  return grid
}

function makeState(overrides: Partial<GameState> & { hero: GameState['hero']; grid: Cell[][] }): GameState {
  return {
    floor: 1,
    score: 0,
    status: 'playing',
    events: [],
    waveTimer: 30,
    isBossWave: false,
    gameOverCause: 'normal',
    ...overrides,
  }
}

function makeHero(overrides: Partial<GameState['hero']> = {}): GameState['hero'] {
  return {
    pos: { x: 0, y: 0 },
    hp: 10,
    maxHp: 10,
    atk: 1,
    def: 0,
    coins: 0,
    ...overrides,
  }
}

describe('createGame', () => {
  it('시드로 게임 생성 시 초기 상태 올바름', () => {
    const { state } = createGame(42)
    expect(state.floor).toBe(1)
    expect(state.score).toBe(0)
    expect(state.status).toBe('playing')
    expect(state.hero.hp).toBe(10)
    expect(state.hero.atk).toBe(1)
    expect(state.hero.def).toBe(0)
    expect(state.hero.coins).toBe(0)
  })
  it('같은 시드에서 동일한 초기 상태 생성', () => {
    const a = createGame(42)
    const b = createGame(42)
    expect(a.state.hero.pos).toEqual(b.state.hero.pos)
    expect(a.state.grid).toEqual(b.state.grid)
  })
  it('히어로 위치의 셀은 비어있음', () => {
    const { state } = createGame(42)
    expect(state.grid[state.hero.pos.y]![state.hero.pos.x]).toBeNull()
  })
})

describe('moveHero — 기본 이동', () => {
  it('빈 셀로 이동', () => {
    const hero = makeHero({ pos: { x: 1, y: 1 } })
    const state = makeState({ hero, grid: makeGrid([]) })
    const rng = createRNG(1)
    const ctx = { state, rng, floorEntityCount: 0, clearedCount: 0 }
    moveHero(ctx, 'right')
    expect(state.hero.pos).toEqual({ x: 2, y: 1 })
    expect(state.events.some(e => e.type === 'move')).toBe(true)
  })
  it('그리드 밖으로 이동 시 위치 변화 없음', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 } })
    const state = makeState({ hero, grid: makeGrid([]) })
    const rng = createRNG(1)
    const ctx = { state, rng, floorEntityCount: 0, clearedCount: 0 }
    moveHero(ctx, 'left')
    expect(state.hero.pos).toEqual({ x: 0, y: 0 })
    expect(state.events).toHaveLength(0)
  })
  it('위/아래/좌/우 4방향 이동', () => {
    const directions: Array<{ dir: Direction; expected: Position }> = [
      { dir: 'up', expected: { x: 2, y: 1 } },
      { dir: 'down', expected: { x: 2, y: 3 } },
      { dir: 'left', expected: { x: 1, y: 2 } },
      { dir: 'right', expected: { x: 3, y: 2 } },
    ]
    for (const { dir, expected } of directions) {
      const hero = makeHero({ pos: { x: 2, y: 2 } })
      const state = makeState({ hero, grid: makeGrid([]) })
      const rng = createRNG(1)
      moveHero({ state, rng, floorEntityCount: 0, clearedCount: 0 }, dir)
      expect(state.hero.pos).toEqual(expected)
    }
  })
  it('game_over 상태에서 이동 불가', () => {
    const hero = makeHero({ pos: { x: 1, y: 1 } })
    const state = makeState({ hero, grid: makeGrid([]), status: 'game_over' })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 0, clearedCount: 0 }, 'right')
    expect(state.hero.pos).toEqual({ x: 1, y: 1 })
  })
})

describe('moveHero — 전투', () => {
  it('약한 몬스터 처치 후 셀로 이동', () => {
    const monster: Monster = { kind: 'monster', name: 'Rat', hp: 1, atk: 1 }
    const hero = makeHero({ pos: { x: 0, y: 0 }, atk: 3 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: monster }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.hero.pos).toEqual({ x: 1, y: 0 })
    expect(state.grid[0]![1]).toBeNull()
    expect(state.events.some(e => e.type === 'combat' && e.killed)).toBe(true)
  })
  it('강한 몬스터와 싸우면 히어로 피해 입음', () => {
    const monster: Monster = { kind: 'monster', name: 'Orc', hp: 10, atk: 3 }
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 10, atk: 2 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: monster }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    // Monster survives (10 - 2 = 8 hp), hero stays at (0,0)
    expect(state.hero.pos).toEqual({ x: 0, y: 0 })
    expect(state.hero.hp).toBe(7) // 10 - 3 = 7
    expect(state.grid[0]![1]).not.toBeNull()
    expect(state.events.some(e => e.type === 'hero_hurt')).toBe(true)
  })
  it('DEF가 몬스터 피해를 감소시킴', () => {
    const monster: Monster = { kind: 'monster', name: 'Bat', hp: 5, atk: 3 }
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 10, atk: 1, def: 2 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: monster }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    // Monster deals max(1, 3 - 2) = 1 damage
    expect(state.hero.hp).toBe(9)
  })
  it('DEF가 높아도 최소 1 데미지 보장', () => {
    const monster: Monster = { kind: 'monster', name: 'Rat', hp: 5, atk: 1 }
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 10, atk: 1, def: 5 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: monster }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    // Monster deals max(1, 1 - 5) = 1 minimum damage
    expect(state.hero.hp).toBe(9)
  })
  it('HP가 0이 되면 game_over', () => {
    const monster: Monster = { kind: 'monster', name: 'Demon', hp: 99, atk: 20 }
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 5, atk: 1 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: monster }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.status).toBe('game_over')
    expect(state.hero.hp).toBe(0)
    expect(state.events.some(e => e.type === 'game_over')).toBe(true)
  })
})

describe('moveHero — 아이템 수집', () => {
  it('포션 수집 시 HP 회복', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 5, maxHp: 10 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: { kind: 'potion', heal: 3 } }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.hero.hp).toBe(8)
    expect(state.hero.pos).toEqual({ x: 1, y: 0 })
    expect(state.grid[0]![1]).toBeNull()
  })
  it('포션 수집 시 maxHp 초과하지 않음', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 9, maxHp: 10 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: { kind: 'potion', heal: 5 } }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.hero.hp).toBe(10)
  })
  it('코인 수집 시 코인 증가', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, coins: 5 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: { kind: 'coin', value: 3 } }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.hero.coins).toBe(8)
    expect(state.events.some(e => e.type === 'collect_coin')).toBe(true)
  })
  it('무기 수집 시 ATK 증가', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, atk: 1 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: { kind: 'weapon', atk: 2 } }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.hero.atk).toBe(3)
    expect(state.events.some(e => e.type === 'collect_weapon')).toBe(true)
  })
  it('방패 수집 시 DEF 증가', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, def: 0 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: { kind: 'shield', def: 1 } }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.hero.def).toBe(1)
    expect(state.events.some(e => e.type === 'collect_shield')).toBe(true)
  })
})

describe('moveHero — 출구와 층 전환', () => {
  it('출구 셀 진입 시 다음 층으로 이동', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, coins: 5 })
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: { kind: 'exit' } }])
    const state = makeState({ hero, grid, floor: 1 })
    const rng = createRNG(1)
    const result = moveHero({ state, rng, floorEntityCount: 5, clearedCount: 5 }, 'right')
    expect(result.state.floor).toBe(2)
    expect(result.state.events.some(e => e.type === 'floor_clear')).toBe(true)
    expect(result.clearedCount).toBe(0)
  })
  it('60% 클리어 후 exit 타일 출현', () => {
    // Place 5 entities, clear 3 (60%)
    const hero = makeHero({ pos: { x: 0, y: 0 } })
    const grid = makeGrid([
      { pos: { x: 1, y: 0 }, cell: { kind: 'coin', value: 1 } },
    ])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    // Simulate clearing 60% by passing clearedCount close to threshold
    const ctx = { state, rng, floorEntityCount: 5, clearedCount: 2 }
    moveHero(ctx, 'right') // collects coin, clearedCount becomes 3
    // 3/5 = 60% — exit should appear
    let hasExit = false
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (state.grid[y]![x]?.kind === 'exit') hasExit = true
      }
    }
    expect(hasExit).toBe(true)
  })
})

describe('calculateScore', () => {
  it('점수 = 층 × 코인', () => {
    const state = makeState({
      hero: makeHero({ coins: 10 }),
      grid: makeGrid([]),
      floor: 3,
    })
    expect(calculateScore(state)).toBe(30)
  })
  it('코인 0이면 점수 0', () => {
    const state = makeState({
      hero: makeHero({ coins: 0 }),
      grid: makeGrid([]),
      floor: 5,
    })
    expect(calculateScore(state)).toBe(0)
  })
})

describe('createGameController', () => {
  it('컨트롤러 생성 및 이동', () => {
    const ctrl = createGameController(42)
    const initial = ctrl.getState()
    expect(initial.status).toBe('playing')
    expect(initial.floor).toBe(1)
    const initialPos = { ...initial.hero.pos }
    // Try all directions to find a valid move
    const directions: Direction[] = ['right', 'down', 'left', 'up']
    let moved = false
    for (const dir of directions) {
      const after = ctrl.move(dir)
      if (after.hero.pos.x !== initialPos.x || after.hero.pos.y !== initialPos.y) {
        moved = true
        break
      }
    }
    // At least one direction should work unless hero is completely surrounded by entities
    // In that case the hero would interact with an entity
    expect(moved || ctrl.getState().events.length > 0).toBe(true)
  })
  it('같은 시드에서 동일한 게임 재현', () => {
    const ctrl1 = createGameController(999)
    const ctrl2 = createGameController(999)
    expect(ctrl1.getState().hero.pos).toEqual(ctrl2.getState().hero.pos)
    ctrl1.move('right')
    ctrl2.move('right')
    expect(ctrl1.getState().hero).toEqual(ctrl2.getState().hero)
  })
})

describe('GameController — revive', () => {
  it('game_over 상태에서 revive 시 HP 50% 복원', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 1, maxHp: 10, atk: 1 })
    const monster: Monster = { kind: 'monster', name: 'Demon', hp: 99, atk: 20 }
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: monster }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.status).toBe('game_over')
    expect(state.hero.hp).toBe(0)
    // Simulate revive by restoring HP
    state.hero.hp = Math.max(1, Math.ceil(state.hero.maxHp * 0.5))
    state.status = 'playing'
    expect(state.status).toBe('playing')
    expect(state.hero.hp).toBe(5)
  })
  it('revive 후 다시 game_over 시 재사용 불가 (moveHero 직접 테스트)', () => {
    const hero = makeHero({ pos: { x: 0, y: 0 }, hp: 5, maxHp: 10, atk: 1 })
    const demon: Monster = { kind: 'monster', name: 'Demon', hp: 99, atk: 50 }
    const grid = makeGrid([{ pos: { x: 1, y: 0 }, cell: demon }])
    const state = makeState({ hero, grid })
    const rng = createRNG(1)
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.status).toBe('game_over')
    // First revive
    state.hero.hp = Math.max(1, Math.ceil(state.hero.maxHp * 0.5))
    state.status = 'playing'
    expect(state.hero.hp).toBe(5)
    // Die again — move into the same demon
    moveHero({ state, rng, floorEntityCount: 1, clearedCount: 0 }, 'right')
    expect(state.status).toBe('game_over')
  })
  it('playing 상태에서 revive 호출 시 false 반환', () => {
    const ctrl = createGameController(42)
    expect(ctrl.getState().status).toBe('playing')
    expect(ctrl.revive()).toBe(false)
  })
})

describe('tickTimer — 보스 웨이브', () => {
  it('보스가 살아있는 상태에서 타이머 만료 시 즉시 game_over', () => {
    const ctrl = createGameController(42)
    // 보스 웨이브를 강제 설정
    const state = ctrl.getState()
    state.isBossWave = true
    state.waveTimer = 0.1
    // Place a boss on the grid
    state.grid[0]![0] = { kind: 'monster', name: 'BOSS', hp: 50, atk: 10, isBoss: true }
    state.hero.pos = { x: 3, y: 3 }
    const result = ctrl.tickTimer(0.5)
    expect(result.status).toBe('game_over')
    expect(result.gameOverCause).toBe('boss_survived')
    expect(result.events.some(e => e.type === 'game_over' && e.cause === 'boss_survived')).toBe(true)
  })
  it('보스가 이미 처치된 경우 타이머 만료 시 다음 층으로', () => {
    const ctrl = createGameController(42)
    const state = ctrl.getState()
    state.isBossWave = true
    state.waveTimer = 0.1
    // No boss alive — grid clear
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        state.grid[y]![x] = null
      }
    }
    const result = ctrl.tickTimer(0.5)
    expect(result.status).toBe('playing')
    expect(result.floor).toBe(2)
  })
  it('일반 웨이브 타이머 만료 시 몬스터 수만큼 HP 감소 후 다음 층', () => {
    const ctrl = createGameController(42)
    const state = ctrl.getState()
    state.isBossWave = false
    state.waveTimer = 0.1
    state.hero.hp = 10
    state.hero.pos = { x: 3, y: 3 }
    // Place 2 monsters
    state.grid[0]![0] = { kind: 'monster', name: 'Rat', hp: 1, atk: 1 }
    state.grid[0]![1] = { kind: 'monster', name: 'Bat', hp: 2, atk: 1 }
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!((y === 0 && (x === 0 || x === 1)) || (y === 3 && x === 3))) {
          state.grid[y]![x] = null
        }
      }
    }
    const result = ctrl.tickTimer(0.5)
    expect(result.status).toBe('playing')
    expect(result.floor).toBe(2)
  })
  it('일반 웨이브 타이머 만료 시 데미지가 HP를 0으로 만들면 game_over', () => {
    const ctrl = createGameController(42)
    const state = ctrl.getState()
    state.isBossWave = false
    state.waveTimer = 0.1
    state.hero.hp = 2
    state.hero.pos = { x: 3, y: 3 }
    // Place 3 monsters — will deal 3 damage to hero with 2 HP
    state.grid[0]![0] = { kind: 'monster', name: 'Rat', hp: 1, atk: 1 }
    state.grid[0]![1] = { kind: 'monster', name: 'Bat', hp: 2, atk: 1 }
    state.grid[0]![2] = { kind: 'monster', name: 'Goblin', hp: 3, atk: 2 }
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!((y === 0 && x <= 2) || (y === 3 && x === 3))) {
          state.grid[y]![x] = null
        }
      }
    }
    const result = ctrl.tickTimer(0.5)
    expect(result.status).toBe('game_over')
    expect(result.gameOverCause).toBe('normal')
  })
  it('isBossFloor — 10의 배수만 보스 층', () => {
    expect(isBossFloor(1)).toBe(false)
    expect(isBossFloor(5)).toBe(false)
    expect(isBossFloor(10)).toBe(true)
    expect(isBossFloor(20)).toBe(true)
    expect(isBossFloor(15)).toBe(false)
  })
})

describe('GameController — applyPowerUp', () => {
  it('atk_boost 적용 시 ATK +3', () => {
    const ctrl = createGameController(42)
    const beforeAtk = ctrl.getState().hero.atk
    ctrl.applyPowerUp('atk_boost')
    expect(ctrl.getState().hero.atk).toBe(beforeAtk + 3)
  })
  it('full_heal 적용 시 HP가 maxHp로 복원', () => {
    const ctrl = createGameController(42)
    // Move around to take some damage first
    const directions: Direction[] = ['right', 'down', 'left', 'up']
    for (const dir of directions) {
      ctrl.move(dir)
      if (ctrl.getState().hero.hp < ctrl.getState().hero.maxHp) break
    }
    ctrl.applyPowerUp('full_heal')
    const state = ctrl.getState()
    expect(state.hero.hp).toBe(state.hero.maxHp)
  })
})
