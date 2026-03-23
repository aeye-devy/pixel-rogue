import type { Entity } from '../engine/types.js'

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

// -- Monster name → color --
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

// -- Draw placeholder entity sprites as colored shapes --
export function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  x: number,
  y: number,
  size: number,
): void {
  const pad = Math.floor(size * 0.15)
  const inner = size - pad * 2
  switch (entity.kind) {
    case 'monster':
      drawMonster(ctx, entity.name, x + pad, y + pad, inner)
      break
    case 'potion':
      drawPotion(ctx, x + pad, y + pad, inner)
      break
    case 'coin':
      drawCoin(ctx, x + pad, y + pad, inner)
      break
    case 'weapon':
      drawWeapon(ctx, x + pad, y + pad, inner)
      break
    case 'shield':
      drawShield(ctx, x + pad, y + pad, inner)
      break
    case 'exit':
      drawExit(ctx, x + pad, y + pad, inner)
      break
  }
}

export function drawHero(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const pad = Math.floor(size * 0.1)
  const inner = size - pad * 2
  ctx.fillStyle = PALETTE.hero
  ctx.fillRect(x + pad, y + pad, inner, inner)
  ctx.strokeStyle = PALETTE.heroBorder
  ctx.lineWidth = 2
  ctx.strokeRect(x + pad + 1, y + pad + 1, inner - 2, inner - 2)
  // Eyes
  const eyeSize = Math.max(2, Math.floor(inner * 0.15))
  const eyeY = y + pad + Math.floor(inner * 0.3)
  ctx.fillStyle = PALETTE.white
  ctx.fillRect(x + pad + Math.floor(inner * 0.25), eyeY, eyeSize, eyeSize)
  ctx.fillRect(x + pad + Math.floor(inner * 0.6), eyeY, eyeSize, eyeSize)
}

function drawMonster(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
): void {
  ctx.fillStyle = getMonsterColor(name)
  // Jagged body shape
  ctx.fillRect(x, y + Math.floor(size * 0.2), size, Math.floor(size * 0.8))
  // Horns/spikes on top
  const spikeW = Math.floor(size / 3)
  ctx.fillRect(x, y, spikeW, Math.floor(size * 0.3))
  ctx.fillRect(x + size - spikeW, y, spikeW, Math.floor(size * 0.3))
  // Eyes
  const eyeSize = Math.max(2, Math.floor(size * 0.15))
  const eyeY = y + Math.floor(size * 0.35)
  ctx.fillStyle = PALETTE.white
  ctx.fillRect(x + Math.floor(size * 0.2), eyeY, eyeSize, eyeSize)
  ctx.fillRect(x + Math.floor(size * 0.6), eyeY, eyeSize, eyeSize)
  ctx.fillStyle = PALETTE.black
  ctx.fillRect(x + Math.floor(size * 0.25), eyeY, Math.max(1, eyeSize - 1), Math.max(1, eyeSize - 1))
  ctx.fillRect(x + Math.floor(size * 0.65), eyeY, Math.max(1, eyeSize - 1), Math.max(1, eyeSize - 1))
}

function drawPotion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const cx = x + Math.floor(size / 2)
  const cy = y + Math.floor(size / 2)
  const r = Math.floor(size * 0.35)
  // Bottle body (circle approximation with rect)
  ctx.fillStyle = PALETTE.potion
  ctx.beginPath()
  ctx.arc(cx, cy + Math.floor(size * 0.1), r, 0, Math.PI * 2)
  ctx.fill()
  // Neck
  const neckW = Math.floor(size * 0.2)
  ctx.fillRect(cx - Math.floor(neckW / 2), y, neckW, Math.floor(size * 0.3))
  // Cross
  const crossSize = Math.max(2, Math.floor(r * 0.5))
  ctx.fillStyle = PALETTE.potionCross
  ctx.fillRect(cx - Math.floor(crossSize / 2), cy - crossSize + Math.floor(size * 0.1), crossSize, crossSize * 2)
  ctx.fillRect(cx - crossSize + Math.floor(crossSize / 2), cy - Math.floor(crossSize / 2) + Math.floor(size * 0.1), crossSize * 2, crossSize)
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const cx = x + Math.floor(size / 2)
  const cy = y + Math.floor(size / 2)
  const r = Math.floor(size * 0.38)
  ctx.fillStyle = PALETTE.coin
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = PALETTE.coinInner
  ctx.beginPath()
  ctx.arc(cx, cy, Math.floor(r * 0.6), 0, Math.PI * 2)
  ctx.fill()
  // $ sign
  ctx.fillStyle = PALETTE.coin
  ctx.font = `bold ${Math.floor(r)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('$', cx, cy + 1)
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  // Sword blade
  const bladeW = Math.floor(size * 0.15)
  const cx = x + Math.floor(size / 2)
  ctx.fillStyle = PALETTE.weaponEdge
  ctx.fillRect(cx - Math.floor(bladeW / 2), y, bladeW, Math.floor(size * 0.65))
  // Guard
  ctx.fillStyle = PALETTE.weapon
  ctx.fillRect(x + Math.floor(size * 0.2), y + Math.floor(size * 0.6), Math.floor(size * 0.6), Math.floor(size * 0.1))
  // Handle
  ctx.fillStyle = PALETTE.rat
  ctx.fillRect(cx - Math.floor(bladeW / 2), y + Math.floor(size * 0.7), bladeW, Math.floor(size * 0.25))
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const cx = x + Math.floor(size / 2)
  ctx.fillStyle = PALETTE.shield
  // Shield shape (rounded top, pointed bottom)
  ctx.beginPath()
  ctx.moveTo(x + Math.floor(size * 0.1), y + Math.floor(size * 0.15))
  ctx.lineTo(x + Math.floor(size * 0.9), y + Math.floor(size * 0.15))
  ctx.lineTo(x + Math.floor(size * 0.9), y + Math.floor(size * 0.55))
  ctx.lineTo(cx, y + size)
  ctx.lineTo(x + Math.floor(size * 0.1), y + Math.floor(size * 0.55))
  ctx.closePath()
  ctx.fill()
  // Inner emblem
  ctx.fillStyle = PALETTE.shieldInner
  ctx.fillRect(cx - Math.floor(size * 0.12), y + Math.floor(size * 0.3), Math.floor(size * 0.24), Math.floor(size * 0.3))
}

function drawExit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  // Stairs / portal
  ctx.fillStyle = PALETTE.exitInner
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = PALETTE.exit
  // Stair steps
  const steps = 4
  const stepH = Math.floor(size / steps)
  for (let i = 0; i < steps; i++) {
    const stepW = Math.floor((size * (i + 1)) / steps)
    ctx.fillRect(x + Math.floor((size - stepW) / 2), y + i * stepH, stepW, stepH - 1)
  }
}
