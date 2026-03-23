/**
 * Balance simulation script.
 * Runs N automated games with a BFS-pathfinding AI and reports stats.
 *
 * Usage: npx tsx scripts/simulate.ts [numRuns]
 */

import { createGame, moveHero, type MoveContext } from '../src/engine/game.js'
import { GRID_SIZE, type Cell, type Direction, type Position } from '../src/engine/types.js'

const NUM_RUNS = Number(process.argv[2]) || 5000
const DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

function getCell(grid: Cell[][], pos: Position): Cell {
  return grid[pos.y]?.[pos.x] ?? null
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`
}

/** Score a cell for desirability. Higher = more desirable target. */
function scoreCell(cell: Cell, hero: { hp: number; maxHp: number; atk: number; def: number }): number {
  if (cell === null) return -1 // not a target
  switch (cell.kind) {
    case 'exit':
      return 1000
    case 'weapon':
      return 90
    case 'shield':
      return 85
    case 'potion':
      return hero.hp <= hero.maxHp * 0.6 ? 95 : 15
    case 'coin':
      return 50
    case 'monster': {
      const dmgToHero = Math.max(0, cell.atk - hero.def)
      const hitsToKill = Math.ceil(cell.hp / Math.max(1, hero.atk))
      const totalDmg = dmgToHero * (hitsToKill - 1)
      if (totalDmg >= hero.hp) return -50 // lethal
      if (hero.hp - totalDmg <= 2) return 5
      return 30
    }
  }
}

/**
 * BFS-based AI: finds the best reachable target on the grid and returns
 * the first step direction to reach it. Walks through empty cells and
 * engageable monsters. Avoids lethal monsters unless no other option.
 */
function pickMove(ctx: MoveContext): Direction | null {
  const { state } = ctx
  const hero = state.hero
  const start = hero.pos
  // BFS to find all reachable cells and their first-step direction
  interface BFSNode {
    pos: Position
    firstDir: Direction
    dist: number
  }
  const queue: BFSNode[] = []
  const visited = new Set<string>()
  visited.add(posKey(start))
  // Seed with immediate neighbors
  for (const dir of DIRECTIONS) {
    const d = DELTAS[dir]
    const np = { x: start.x + d.dx, y: start.y + d.dy }
    if (np.x < 0 || np.x >= GRID_SIZE || np.y < 0 || np.y >= GRID_SIZE) continue
    const key = posKey(np)
    if (visited.has(key)) continue
    visited.add(key)
    queue.push({ pos: np, firstDir: dir, dist: 1 })
  }
  // Evaluate all reachable targets
  let bestTarget: BFSNode | null = null
  let bestScore = -Infinity
  let idx = 0
  while (idx < queue.length) {
    const node = queue[idx]!
    idx++
    const cell = getCell(state.grid, node.pos)
    const sc = scoreCell(cell, hero)
    // Adjust score: prefer closer targets (subtract small distance penalty)
    const adjustedScore = sc - node.dist * 0.1
    if (sc >= 0 && adjustedScore > bestScore) {
      bestScore = adjustedScore
      bestTarget = node
    }
    // Can walk through this cell? Only empty cells and killed-in-one-hit monsters
    const canPassThrough =
      cell === null ||
      (cell.kind === 'monster' && cell.hp <= Math.max(1, hero.atk)) ||
      (cell.kind !== 'monster') // items are collected on step
    if (canPassThrough) {
      for (const dir of DIRECTIONS) {
        const d = DELTAS[dir]
        const np = { x: node.pos.x + d.dx, y: node.pos.y + d.dy }
        if (np.x < 0 || np.x >= GRID_SIZE || np.y < 0 || np.y >= GRID_SIZE) continue
        const key = posKey(np)
        if (visited.has(key)) continue
        visited.add(key)
        queue.push({ pos: np, firstDir: node.firstDir, dist: node.dist + 1 })
      }
    }
  }
  if (bestTarget) return bestTarget.firstDir
  // Fallback: pick any valid move (even lethal — game is lost anyway)
  for (const dir of DIRECTIONS) {
    const d = DELTAS[dir]
    const np = { x: start.x + d.dx, y: start.y + d.dy }
    if (np.x >= 0 && np.x < GRID_SIZE && np.y >= 0 && np.y < GRID_SIZE) return dir
  }
  return null
}

interface RunResult {
  floor: number
  score: number
  coins: number
  hp: number
  atk: number
  def: number
}

function simulateRun(seed: number): RunResult {
  const { state, rng } = createGame(seed)
  let entityCount = 0
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = getCell(state.grid, { x, y })
      if (cell !== null && cell.kind !== 'exit') entityCount++
    }
  }
  let ctx: MoveContext = { state, rng, floorEntityCount: entityCount, clearedCount: 0 }
  let moves = 0
  const MAX_MOVES = 500
  while (ctx.state.status === 'playing' && moves < MAX_MOVES) {
    const dir = pickMove(ctx)
    if (dir === null) break
    ctx = moveHero(ctx, dir)
    moves++
  }
  return {
    floor: state.floor,
    score: state.score || state.floor * state.hero.coins,
    coins: state.hero.coins,
    hp: state.hero.hp,
    atk: state.hero.atk,
    def: state.hero.def,
  }
}

// Run simulation
const results: RunResult[] = []
for (let i = 0; i < NUM_RUNS; i++) {
  results.push(simulateRun(i + 1))
}

// Stats
const floors = results.map((r) => r.floor)
const scores = results.map((r) => r.score)
const avgFloor = floors.reduce((a, b) => a + b, 0) / floors.length
floors.sort((a, b) => a - b)
const maxFloor = Math.max(...floors)
const minFloor = Math.min(...floors)
const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
const maxScore = Math.max(...scores)

// Floor distribution
const floorDist: Record<number, number> = {}
for (const f of floors) {
  floorDist[f] = (floorDist[f] || 0) + 1
}

// Percentiles
const p10 = floors[Math.floor(floors.length * 0.1)]!
const p25 = floors[Math.floor(floors.length * 0.25)]!
const p50 = floors[Math.floor(floors.length * 0.5)]!
const p75 = floors[Math.floor(floors.length * 0.75)]!
const p90 = floors[Math.floor(floors.length * 0.9)]!

console.log(`\n=== Balance Simulation (${NUM_RUNS} runs) ===\n`)
console.log(`Floor reached:`)
console.log(`  Min: ${minFloor}  Max: ${maxFloor}  Avg: ${avgFloor.toFixed(1)}  Median: ${p50}`)
console.log(`  P10: ${p10}  P25: ${p25}  P50: ${p50}  P75: ${p75}  P90: ${p90}`)
console.log(`\nScore:`)
console.log(`  Avg: ${avgScore.toFixed(0)}  Max: ${maxScore}`)
console.log(`\nFloor distribution:`)
const sortedFloors = Object.entries(floorDist).sort((a, b) => Number(a[0]) - Number(b[0]))
for (const [floor, count] of sortedFloors) {
  const pct = ((count / NUM_RUNS) * 100).toFixed(1)
  const bar = '█'.repeat(Math.ceil((count / NUM_RUNS) * 50))
  console.log(`  Floor ${floor.padStart(2)}: ${String(count).padStart(4)} (${pct.padStart(5)}%) ${bar}`)
}

// Hero stat averages at death
const avgAtk = results.reduce((a, r) => a + r.atk, 0) / results.length
const avgDef = results.reduce((a, r) => a + r.def, 0) / results.length
console.log(`\nHero stats at death:`)
console.log(`  ATK avg: ${avgAtk.toFixed(1)}  DEF avg: ${avgDef.toFixed(1)}`)

// Stuck detection (runs that hit MAX_MOVES)
const stuckRuns = results.filter((r) => r.hp > 0 && r.floor <= 2).length
console.log(`\nStuck runs (alive, floor<=2): ${stuckRuns} (${((stuckRuns / NUM_RUNS) * 100).toFixed(1)}%)`)
