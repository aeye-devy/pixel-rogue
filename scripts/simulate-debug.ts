/**
 * Debug trace for a single simulation run.
 * Usage: npx tsx scripts/simulate-debug.ts [seed]
 */

import { createGame, moveHero, type MoveContext } from '../src/engine/game.js'
import { GRID_SIZE, type Cell, type Direction, type Position } from '../src/engine/types.js'

const SEED = Number(process.argv[2]) || 42
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

function getCell(grid: Cell[][], pos: Position): Cell {
  return grid[pos.y]?.[pos.x] ?? null
}

function pickMove(ctx: MoveContext): Direction | null {
  const { state } = ctx
  const hero = state.hero
  type Candidate = { dir: Direction; cell: Cell; pos: Position; score: number }
  const candidates: Candidate[] = []
  for (const dir of DIRECTIONS) {
    const delta = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } }[dir]
    const pos = { x: hero.pos.x + delta.dx, y: hero.pos.y + delta.dy }
    if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) continue
    const cell = getCell(state.grid, pos)
    let score = 0
    if (cell === null) { score = 1 }
    else {
      switch (cell.kind) {
        case 'exit': score = 100; break
        case 'potion': score = hero.hp <= hero.maxHp * 0.5 ? 90 : 20; break
        case 'weapon': score = 80; break
        case 'shield': score = 75; break
        case 'coin': score = 50; break
        case 'monster': {
          const dmgToHero = Math.max(0, cell.atk - hero.def)
          const hitsToKill = Math.ceil(cell.hp / Math.max(1, hero.atk))
          const totalDmg = dmgToHero * (hitsToKill - 1)
          if (totalDmg >= hero.hp) score = -10
          else if (hero.hp - totalDmg <= 2) score = 5
          else score = 30
          break
        }
      }
    }
    candidates.push({ dir, cell, pos, score })
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]!.dir
}

const { state, rng } = createGame(SEED)
let entityCount = 0
for (let y = 0; y < GRID_SIZE; y++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    const cell = getCell(state.grid, { x, y })
    if (cell !== null && cell.kind !== 'exit') entityCount++
  }
}
let ctx: MoveContext = { state, rng, floorEntityCount: entityCount, clearedCount: 0 }

function printGrid() {
  for (let y = 0; y < GRID_SIZE; y++) {
    let row = ''
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === state.hero.pos.x && y === state.hero.pos.y) { row += ' H '; continue }
      const c = getCell(state.grid, { x, y })
      if (c === null) row += ' . '
      else if (c.kind === 'monster') row += ` ${c.name[0]}${c.hp}`
      else row += ` ${c.kind[0]} `
    }
    console.log(row)
  }
}

console.log(`Seed: ${SEED}`)
console.log(`Hero: (${state.hero.pos.x},${state.hero.pos.y}) HP:${state.hero.hp} ATK:${state.hero.atk}`)
console.log(`Entities: ${entityCount}`)
printGrid()
console.log('')

let moves = 0
let lastPos = { x: -1, y: -1 }
let stuckCount = 0
while (ctx.state.status === 'playing' && moves < 80) {
  const dir = pickMove(ctx)
  if (!dir) { console.log('No valid move'); break }
  const prevFloor = state.floor
  ctx = moveHero(ctx, dir)
  moves++
  const events = ctx.state.events.filter(e => e.type !== 'move')
  const evtStr = events.map(e => {
    if (e.type === 'combat') return `combat(${(e as any).killed ? 'kill' : 'hit'},dmg=${(e as any).damage})`
    if (e.type === 'hero_hurt') return `hurt(${(e as any).damage})`
    if (e.type === 'collect_potion') return `potion(+${(e as any).heal})`
    if (e.type === 'collect_coin') return `coin(+${(e as any).value})`
    if (e.type === 'collect_weapon') return `weapon(+${(e as any).atk})`
    if (e.type === 'collect_shield') return `shield(+${(e as any).def})`
    if (e.type === 'floor_clear') return `FLOOR_CLEAR(${(e as any).floor})`
    if (e.type === 'game_over') return `GAME_OVER(f=${(e as any).floor},s=${(e as any).score})`
    return e.type
  }).join(', ')
  if (state.hero.pos.x === lastPos.x && state.hero.pos.y === lastPos.y) stuckCount++
  else stuckCount = 0
  lastPos = { ...state.hero.pos }
  console.log(`#${String(moves).padStart(2)} ${dir.padEnd(5)} → (${state.hero.pos.x},${state.hero.pos.y}) HP:${state.hero.hp}/${state.hero.maxHp} ATK:${state.hero.atk} DEF:${state.hero.def} cleared:${ctx.clearedCount}/${ctx.floorEntityCount} ${evtStr}`)
  if (state.floor !== prevFloor) {
    console.log(`\n--- Floor ${state.floor} ---`)
    printGrid()
    console.log('')
  }
}
console.log(`\nResult: floor=${state.floor} status=${state.status} score=${state.score} hp=${state.hero.hp} moves=${moves}`)
