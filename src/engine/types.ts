// -- Directions --

export type Direction = 'up' | 'down' | 'left' | 'right'

export const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

// -- Grid --

export const GRID_SIZE = 4

export interface Position {
  x: number
  y: number
}

// -- Entities --

export interface Monster {
  kind: 'monster'
  hp: number
  atk: number
  name: string
}

export interface Potion {
  kind: 'potion'
  heal: number
}

export interface Coin {
  kind: 'coin'
  value: number
}

export interface Weapon {
  kind: 'weapon'
  atk: number
}

export interface Shield {
  kind: 'shield'
  def: number
}

export interface ExitTile {
  kind: 'exit'
}

export type Entity = Monster | Potion | Coin | Weapon | Shield | ExitTile

export type Cell = Entity | null

// -- Hero --

export interface Hero {
  pos: Position
  hp: number
  maxHp: number
  atk: number
  def: number
  coins: number
}

// -- Game Events (for renderer/sound hooks) --

export type GameEvent =
  | { type: 'move'; from: Position; to: Position }
  | { type: 'combat'; pos: Position; monster: Monster; damage: number; killed: boolean }
  | { type: 'hero_hurt'; pos: Position; damage: number }
  | { type: 'collect_potion'; pos: Position; heal: number; newHp: number }
  | { type: 'collect_coin'; pos: Position; value: number }
  | { type: 'collect_weapon'; pos: Position; atk: number }
  | { type: 'collect_shield'; pos: Position; def: number }
  | { type: 'floor_clear'; floor: number }
  | { type: 'game_over'; floor: number; score: number }

// -- Game State --

export type GameStatus = 'title' | 'playing' | 'floor_clear' | 'game_over'

export interface GameState {
  grid: Cell[][]
  hero: Hero
  floor: number
  score: number
  status: GameStatus
  events: GameEvent[]
}

// -- RNG interface --

export interface RNG {
  /** Returns a float in [0, 1) */
  next(): number
  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number
}
