import type { Entity } from '../engine/types.js'
import { renderSprite, HERO_SPRITE, getEntitySprite } from './spriteData.js'

// -- 8-bit color palette --
export const PALETTE = {
  bg: '#1a1a2e',
  floor: '#2a2a3e',
  floorAlt: '#252538',
  gridLine: '#3a3a5e',
  hero: '#4fc3f7',
  heroBorder: '#0288d1',
  rat: '#8d6e63',
  bat: '#7e57c2',
  goblin: '#66bb6a',
  snake: '#aed581',
  skeleton: '#e0e0e0',
  orc: '#ef5350',
  wraith: '#ab47bc',
  demon: '#c62828',
  potion: '#e91e63',
  potionCross: '#f8bbd0',
  coin: '#ffd54f',
  coinInner: '#ff8f00',
  weapon: '#90a4ae',
  weaponEdge: '#eceff1',
  shield: '#5c6bc0',
  shieldInner: '#7986cb',
  exit: '#00e676',
  exitInner: '#1b5e20',
  hpBar: '#ef5350',
  hpBarBg: '#4a1a1a',
  text: '#e0e0e0',
  textDim: '#888',
  white: '#ffffff',
  black: '#000000',
  gameOverBg: 'rgba(0, 0, 0, 0.75)',
} as const

// -- Monster name → color (used by animation events) --
const MONSTER_COLORS: Record<string, string> = {
  Rat: PALETTE.rat,
  Bat: PALETTE.bat,
  Goblin: PALETTE.goblin,
  Snake: PALETTE.snake,
  Skeleton: PALETTE.skeleton,
  Orc: PALETTE.orc,
  Wraith: PALETTE.wraith,
  Demon: PALETTE.demon,
}

export function getMonsterColor(name: string): string {
  return MONSTER_COLORS[name] ?? PALETTE.orc
}

// -- Draw pixel art sprites --
// Minimal padding; the 12×12 sprite data has built-in transparent margins

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  x: number,
  y: number,
  size: number,
): void {
  const pad = Math.floor(size * 0.04)
  const inner = size - pad * 2
  renderSprite(ctx, getEntitySprite(entity), x + pad, y + pad, inner)
}

export function drawHero(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const pad = Math.floor(size * 0.04)
  const inner = size - pad * 2
  renderSprite(ctx, HERO_SPRITE, x + pad, y + pad, inner)
}
