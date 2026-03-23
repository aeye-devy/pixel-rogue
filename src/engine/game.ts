import type {
  Cell,
  Direction,
  GameState,
  Hero,
  Monster,
  Position,
  RNG,
} from './types.js'
import { DIRECTION_DELTAS, GRID_SIZE } from './types.js'
import { generateFloor, shouldShowExit } from './floor.js'
import { createRNG } from './rng.js'

// -- Hero factory --

const INITIAL_HP = 10
const INITIAL_ATK = 1
const INITIAL_DEF = 0

function createHero(pos: Position): Hero {
  return {
    pos,
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    atk: INITIAL_ATK,
    def: INITIAL_DEF,
    coins: 0,
  }
}

// -- Game factory --

export function createGame(seed?: number): { state: GameState; rng: RNG } {
  const rng = createRNG(seed ?? Date.now())
  const { grid, heroPos } = generateFloor(1, rng)
  const state: GameState = {
    grid,
    hero: createHero(heroPos),
    floor: 1,
    score: 0,
    status: 'playing',
    events: [],
  }
  return { state, rng }
}

// -- Movement --

function isInBounds(pos: Position): boolean {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE
}

function getCell(grid: Cell[][], pos: Position): Cell {
  return grid[pos.y]?.[pos.x] ?? null
}

function setCell(grid: Cell[][], pos: Position, cell: Cell): void {
  const row = grid[pos.y]
  if (row) row[pos.x] = cell
}

export interface MoveContext {
  state: GameState
  rng: RNG
  /** Total entities placed on this floor (for exit threshold calc) */
  floorEntityCount: number
  /** Entities cleared so far on this floor */
  clearedCount: number
}

export function moveHero(ctx: MoveContext, direction: Direction): MoveContext {
  const { state, rng } = ctx
  const { floorEntityCount } = ctx
  let { clearedCount } = ctx
  if (state.status !== 'playing') return ctx
  state.events = []
  const delta = DIRECTION_DELTAS[direction]
  const newPos: Position = {
    x: state.hero.pos.x + delta.dx,
    y: state.hero.pos.y + delta.dy,
  }
  if (!isInBounds(newPos)) return ctx
  const cell = getCell(state.grid, newPos)
  if (cell === null) {
    state.events.push({ type: 'move', from: { ...state.hero.pos }, to: { ...newPos } })
    state.hero.pos = newPos
  } else {
    switch (cell.kind) {
      case 'monster':
        resolveMonsterCell(state, newPos, cell)
        if (state.status !== 'playing') return { state, rng, floorEntityCount, clearedCount }
        if (getCell(state.grid, newPos) === null) {
          clearedCount++
        }
        break
      case 'potion':
        resolvePotionCell(state, newPos, cell)
        clearedCount++
        break
      case 'coin':
        resolveCoinCell(state, newPos, cell)
        clearedCount++
        break
      case 'weapon':
        resolveWeaponCell(state, newPos, cell)
        clearedCount++
        break
      case 'shield':
        resolveShieldCell(state, newPos, cell)
        clearedCount++
        break
      case 'exit':
        return advanceFloor({ state, rng, floorEntityCount, clearedCount })
    }
    if (state.status === 'playing' && shouldShowExit(clearedCount, floorEntityCount)) {
      placeExitIfNeeded(state, rng)
    }
  }
  return { state, rng, floorEntityCount, clearedCount }
}

// -- Cell resolution --

function resolveMonsterCell(state: GameState, pos: Position, monster: Monster): void {
  const heroDmg = Math.max(1, state.hero.atk)
  monster.hp -= heroDmg
  const killed = monster.hp <= 0
  state.events.push({
    type: 'combat',
    pos: { ...pos },
    monster: { ...monster },
    damage: heroDmg,
    killed,
  })
  if (killed) {
    setCell(state.grid, pos, null)
    state.events.push({ type: 'move', from: { ...state.hero.pos }, to: { ...pos } })
    state.hero.pos = pos
  } else {
    const monsterDmg = Math.max(1, monster.atk - state.hero.def)
    state.hero.hp -= monsterDmg
    state.events.push({
      type: 'hero_hurt',
      pos: { ...state.hero.pos },
      damage: monsterDmg,
    })
    if (state.hero.hp <= 0) {
      state.hero.hp = 0
      state.status = 'game_over'
      state.score = calculateScore(state)
      state.events.push({
        type: 'game_over',
        floor: state.floor,
        score: state.score,
      })
    }
  }
}

function resolvePotionCell(state: GameState, pos: Position, potion: { heal: number }): void {
  const oldHp = state.hero.hp
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + potion.heal)
  setCell(state.grid, pos, null)
  state.events.push({ type: 'move', from: { ...state.hero.pos }, to: { ...pos } })
  state.hero.pos = pos
  state.events.push({
    type: 'collect_potion',
    pos: { ...pos },
    heal: state.hero.hp - oldHp,
    newHp: state.hero.hp,
  })
}

function resolveCoinCell(state: GameState, pos: Position, coin: { value: number }): void {
  state.hero.coins += coin.value
  setCell(state.grid, pos, null)
  state.events.push({ type: 'move', from: { ...state.hero.pos }, to: { ...pos } })
  state.hero.pos = pos
  state.events.push({ type: 'collect_coin', pos: { ...pos }, value: coin.value })
}

function resolveWeaponCell(state: GameState, pos: Position, weapon: { atk: number }): void {
  state.hero.atk += weapon.atk
  setCell(state.grid, pos, null)
  state.events.push({ type: 'move', from: { ...state.hero.pos }, to: { ...pos } })
  state.hero.pos = pos
  state.events.push({ type: 'collect_weapon', pos: { ...pos }, atk: weapon.atk })
}

function resolveShieldCell(state: GameState, pos: Position, shield: { def: number }): void {
  state.hero.def += shield.def
  setCell(state.grid, pos, null)
  state.events.push({ type: 'move', from: { ...state.hero.pos }, to: { ...pos } })
  state.hero.pos = pos
  state.events.push({ type: 'collect_shield', pos: { ...pos }, def: shield.def })
}

// -- Exit placement --

function placeExitIfNeeded(state: GameState, rng: RNG): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (getCell(state.grid, { x, y })?.kind === 'exit') return
    }
  }
  const emptyCells: Position[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (getCell(state.grid, { x, y }) === null && !(x === state.hero.pos.x && y === state.hero.pos.y)) {
        emptyCells.push({ x, y })
      }
    }
  }
  if (emptyCells.length === 0) return
  const pos = emptyCells[rng.int(0, emptyCells.length - 1)]!
  setCell(state.grid, pos, { kind: 'exit' })
}

// -- Floor advancement --

function advanceFloor(ctx: MoveContext): MoveContext {
  const { state, rng } = ctx
  state.score = calculateScore(state)
  state.floor++
  state.events.push({ type: 'floor_clear', floor: state.floor - 1 })
  const { grid, heroPos, entityCount } = generateFloor(state.floor, rng)
  state.grid = grid
  state.hero.pos = heroPos
  const FLOOR_HEAL = 2
  const healAmount = Math.min(FLOOR_HEAL, state.hero.maxHp - state.hero.hp)
  state.hero.hp += healAmount
  return { state, rng, floorEntityCount: entityCount, clearedCount: 0 }
}

// -- Score --

export function calculateScore(state: GameState): number {
  return state.floor * state.hero.coins
}

// -- Public API: high-level game controller --

export type PowerUpKind = 'atk_boost' | 'full_heal'

export interface GameController {
  getState(): GameState
  move(direction: Direction): GameState
  /** Revive hero at 50% HP. Returns false if already used this run. */
  revive(): boolean
  /** Apply a power-up reward. */
  applyPowerUp(kind: PowerUpKind): void
  /** Whether revive has been used this run. */
  hasRevived(): boolean
}

const POWER_UP_ATK_BOOST = 3

export function createGameController(seed?: number): GameController {
  const { state, rng } = createGame(seed)
  const { entityCount } = countFloorEntities(state)
  let ctx: MoveContext = { state, rng, floorEntityCount: entityCount, clearedCount: 0 }
  let revived = false
  function getState(): GameState {
    return ctx.state
  }
  function move(direction: Direction): GameState {
    ctx = moveHero(ctx, direction)
    return ctx.state
  }
  function revive(): boolean {
    if (revived) return false
    if (ctx.state.status !== 'game_over') return false
    revived = true
    const hero = ctx.state.hero
    hero.hp = Math.max(1, Math.ceil(hero.maxHp * 0.5))
    ctx.state.status = 'playing'
    ctx.state.events = []
    return true
  }
  function applyPowerUp(kind: PowerUpKind): void {
    if (ctx.state.status !== 'playing') return
    if (kind === 'atk_boost') {
      ctx.state.hero.atk += POWER_UP_ATK_BOOST
    } else {
      ctx.state.hero.hp = ctx.state.hero.maxHp
    }
  }
  function hasRevived(): boolean {
    return revived
  }
  return { getState, move, revive, applyPowerUp, hasRevived }
}

function countFloorEntities(state: GameState): { entityCount: number } {
  let entityCount = 0
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = getCell(state.grid, { x, y })
      if (cell !== null && cell.kind !== 'exit') entityCount++
    }
  }
  return { entityCount }
}
