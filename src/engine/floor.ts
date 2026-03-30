import type { Cell, Entity, Monster, Position, RNG } from './types.js'
import { GRID_SIZE } from './types.js'

// -- Boss wave config --

export const BOSS_WAVE_INTERVAL = 10

export function isBossFloor(floor: number): boolean {
  return floor % BOSS_WAVE_INTERVAL === 0
}

function createBossMonster(floor: number): Monster {
  const tier = Math.min(3, Math.floor(floor / BOSS_WAVE_INTERVAL) - 1)
  const baseHp = [15, 25, 40, 60][tier] ?? 15
  const baseAtk = [4, 6, 8, 12][tier] ?? 4
  return {
    kind: 'monster',
    name: 'BOSS',
    hp: baseHp,
    atk: baseAtk,
    isBoss: true,
  }
}

// -- Monster templates by difficulty tier --

interface MonsterTemplate {
  name: string
  hp: number
  atk: number
}

const TIER_1: MonsterTemplate[] = [
  { name: 'Rat', hp: 1, atk: 1 },
  { name: 'Bat', hp: 2, atk: 1 },
]

const TIER_2: MonsterTemplate[] = [
  { name: 'Goblin', hp: 3, atk: 2 },
  { name: 'Snake', hp: 2, atk: 3 },
]

const TIER_3: MonsterTemplate[] = [
  { name: 'Skeleton', hp: 5, atk: 3 },
  { name: 'Orc', hp: 6, atk: 4 },
]

const TIER_4: MonsterTemplate[] = [
  { name: 'Wraith', hp: 8, atk: 5 },
  { name: 'Demon', hp: 10, atk: 6 },
]

function pickMonster(floor: number, rng: RNG): Monster {
  const tiers = [TIER_1, TIER_2, TIER_3, TIER_4]
  const maxTier = Math.min(Math.floor(floor / 2), tiers.length - 1)
  const minTier = Math.max(0, maxTier - 1)
  const tierIdx = rng.int(minTier, maxTier)
  const tier = tiers[tierIdx]!
  const template = tier[rng.int(0, tier.length - 1)]!
  const hpScale = 1 + Math.floor(floor / 4) * 0.5
  return {
    kind: 'monster',
    name: template.name,
    hp: Math.ceil(template.hp * hpScale),
    atk: template.atk + Math.floor(floor / 4),
  }
}

// -- Entity counts per floor --

interface FloorConfig {
  monsters: number
  potions: number
  coins: number
  weapons: number
  shields: number
}

function getFloorConfig(floor: number, rng: RNG): FloorConfig {
  const totalCells = GRID_SIZE * GRID_SIZE
  // Hero takes 1 cell. Reserve 1 for exit (placed later). Leaves 14 cells on 4x4.
  const budget = totalCells - 2
  const monsterCount = Math.min(Math.floor(2 + floor * 0.6), Math.floor(budget * 0.65))
  const remaining = budget - monsterCount
  const potionCount = Math.max(1, Math.floor(remaining * 0.3))
  const coinCount = Math.max(1, Math.floor(remaining * 0.3))
  const weapons = floor >= 2 && rng.next() < 0.6 ? 1 : 0
  const shields = floor >= 4 && rng.next() < 0.4 ? 1 : 0
  return {
    monsters: monsterCount,
    potions: potionCount,
    coins: coinCount,
    weapons,
    shields,
  }
}

// -- Grid generation --

function emptyGrid(): Cell[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  )
}

function shuffledPositions(rng: RNG, exclude: Position): Position[] {
  const positions: Position[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === exclude.x && y === exclude.y) continue
      positions.push({ x, y })
    }
  }
  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    const tmp = positions[i]!
    positions[i] = positions[j]!
    positions[j] = tmp
  }
  return positions
}

export interface GeneratedFloor {
  grid: Cell[][]
  heroPos: Position
  entityCount: number
}

export function generateFloor(floor: number, rng: RNG): GeneratedFloor {
  const grid = emptyGrid()
  const heroPos: Position = {
    x: rng.int(0, GRID_SIZE - 1),
    y: rng.int(0, GRID_SIZE - 1),
  }
  const slots = shuffledPositions(rng, heroPos)
  const config = getFloorConfig(floor, rng)
  let idx = 0
  let entityCount = 0
  function place(entity: Entity): void {
    if (idx >= slots.length) return
    const pos = slots[idx]!
    grid[pos.y]![pos.x] = entity
    idx++
    entityCount++
  }
  if (isBossFloor(floor)) {
    place(createBossMonster(floor))
    // Place 2 regular helper monsters alongside the boss
    for (let i = 0; i < 2; i++) {
      place(pickMonster(floor, rng))
    }
  } else {
    for (let i = 0; i < config.monsters; i++) {
      place(pickMonster(floor, rng))
    }
  }
  for (let i = 0; i < config.potions; i++) {
    const healAmount = 2 + Math.floor(floor / 5)
    place({ kind: 'potion', heal: healAmount })
  }
  for (let i = 0; i < config.coins; i++) {
    const coinValue = 1 + Math.floor(floor / 3)
    place({ kind: 'coin', value: coinValue })
  }
  for (let i = 0; i < config.weapons; i++) {
    place({ kind: 'weapon', atk: 1 })
  }
  for (let i = 0; i < config.shields; i++) {
    place({ kind: 'shield', def: 1 })
  }
  return { grid, heroPos, entityCount }
}

export const EXIT_THRESHOLD = 0.6

export function shouldShowExit(clearedCount: number, totalEntities: number): boolean {
  if (totalEntities === 0) return true
  return clearedCount / totalEntities >= EXIT_THRESHOLD
}
