import type { GameState } from '../engine/types.js'
import { GRID_SIZE } from '../engine/types.js'
import { PALETTE, drawEntity, drawHero } from './sprites.js'
import type { AnimationManager, FlashAnim, FloatTextAnim, ScreenFlashAnim } from './animations.js'
import { easeOutQuad } from './animations.js'

// -- Layout constants --
const HUD_HEIGHT_RATIO = 0.12
const GRID_PADDING = 2

export interface RendererConfig {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

export interface Renderer {
  /** Resize canvas to fit viewport. Call on init and on resize. */
  resize(): void
  /** Render one frame. */
  render(state: GameState, anims: AnimationManager): void
  /** Render game over overlay. */
  renderGameOver(state: GameState): void
  /** Get current canvas size */
  getSize(): number
  /** Get cell size in pixels */
  getCellSize(): number
}

export function createRenderer(config: RendererConfig): Renderer {
  const { canvas, ctx } = config
  let size = 0
  let hudHeight = 0
  let gridSize = 0
  let cellSize = 0
  let gridOffsetY = 0
  function resize(): void {
    const dpr = window.devicePixelRatio || 1
    const cssSize = Math.min(window.innerWidth, window.innerHeight, 430)
    size = Math.floor(cssSize * dpr)
    canvas.width = size
    canvas.height = size
    canvas.style.width = `${cssSize}px`
    canvas.style.height = `${cssSize}px`
    hudHeight = Math.floor(size * HUD_HEIGHT_RATIO)
    gridSize = size - hudHeight - GRID_PADDING * 2
    cellSize = Math.floor(gridSize / GRID_SIZE)
    gridOffsetY = hudHeight
    ctx.imageSmoothingEnabled = false
  }
  function gridX(col: number): number {
    const totalGridWidth = cellSize * GRID_SIZE
    const offsetX = Math.floor((size - totalGridWidth) / 2)
    return offsetX + col * cellSize
  }
  function gridY(row: number): number {
    const totalGridHeight = cellSize * GRID_SIZE
    const offsetY = gridOffsetY + Math.floor((size - gridOffsetY - totalGridHeight) / 2)
    return offsetY + row * cellSize
  }
  function drawBackground(): void {
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, size, size)
  }
  function drawGrid(state: GameState): void {
    // Floor tiles (checkerboard)
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = gridX(x)
        const py = gridY(y)
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt
        ctx.fillRect(px, py, cellSize, cellSize)
        // Stone texture: deterministic scattered detail pixels
        const dp = Math.max(1, Math.floor(cellSize / 12))
        ctx.fillStyle = PALETTE.gridLine
        const h = x * 7 + y * 13
        const scale = cellSize / 12
        ctx.fillRect(px + Math.floor(((h * 3 + 5) % 10 + 1) * scale), py + Math.floor(((h * 7 + 3) % 10 + 1) * scale), dp, dp)
        ctx.fillRect(px + Math.floor(((h * 11 + 2) % 10 + 1) * scale), py + Math.floor(((h * 5 + 8) % 10 + 1) * scale), dp, dp)
        // Cell border
        ctx.strokeStyle = PALETTE.gridLine
        ctx.lineWidth = 1
        ctx.strokeRect(px, py, cellSize, cellSize)
      }
    }
    // Draw entities
    const grid = state.grid
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y]?.[x]
        if (cell) {
          drawEntity(ctx, cell, gridX(x), gridY(y), cellSize)
        }
      }
    }
  }
  function drawHeroSprite(state: GameState, anims: AnimationManager): void {
    const offset = anims.getHeroOffset()
    const hx = gridX(state.hero.pos.x) + offset.dx * cellSize
    const hy = gridY(state.hero.pos.y) + offset.dy * cellSize
    drawHero(ctx, hx, hy, cellSize)
  }
  function drawHud(state: GameState): void {
    const pad = Math.floor(size * 0.03)
    const fontSize = Math.floor(hudHeight * 0.35)
    const smallFontSize = Math.floor(hudHeight * 0.28)
    // HP bar background
    const barX = pad
    const barY = Math.floor(hudHeight * 0.2)
    const barW = Math.floor(size * 0.45)
    const barH = Math.floor(hudHeight * 0.3)
    ctx.fillStyle = PALETTE.hpBarBg
    ctx.fillRect(barX, barY, barW, barH)
    // HP bar fill
    const hpRatio = state.hero.hp / state.hero.maxHp
    ctx.fillStyle = PALETTE.hpBar
    ctx.fillRect(barX, barY, Math.floor(barW * hpRatio), barH)
    // HP bar border
    ctx.strokeStyle = PALETTE.gridLine
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barW, barH)
    // HP text
    ctx.fillStyle = PALETTE.white
    ctx.font = `bold ${smallFontSize}px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`HP ${state.hero.hp}/${state.hero.maxHp}`, barX + 4, barY + Math.floor(barH / 2))
    // Stats row below HP bar
    const statsY = barY + barH + Math.floor(hudHeight * 0.15)
    ctx.font = `${smallFontSize}px monospace`
    ctx.fillStyle = PALETTE.text
    ctx.textAlign = 'left'
    ctx.fillText(`ATK ${state.hero.atk}  DEF ${state.hero.def}`, pad, statsY)
    // Floor & coins on right side
    ctx.textAlign = 'right'
    ctx.font = `bold ${fontSize}px monospace`
    ctx.fillStyle = PALETTE.coin
    ctx.fillText(`$${state.hero.coins}`, size - pad, barY + Math.floor(barH / 2))
    ctx.font = `${smallFontSize}px monospace`
    ctx.fillStyle = PALETTE.textDim
    ctx.fillText(`F${state.floor}`, size - pad, statsY)
    // Separator line
    ctx.strokeStyle = PALETTE.gridLine
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, hudHeight - 1)
    ctx.lineTo(size, hudHeight - 1)
    ctx.stroke()
  }
  function drawAnimations(anims: AnimationManager): void {
    for (const anim of anims.getActive()) {
      switch (anim.kind) {
        case 'flash':
          drawFlashAnim(anim)
          break
        case 'floatText':
          drawFloatTextAnim(anim)
          break
        case 'screenFlash':
          drawScreenFlashAnim(anim)
          break
      }
    }
  }
  function drawFlashAnim(anim: FlashAnim): void {
    const alpha = 1 - easeOutQuad(anim.progress)
    ctx.globalAlpha = alpha * 0.6
    ctx.fillStyle = anim.color
    ctx.fillRect(gridX(anim.cellX), gridY(anim.cellY), cellSize, cellSize)
    ctx.globalAlpha = 1
  }
  function drawFloatTextAnim(anim: FloatTextAnim): void {
    const alpha = 1 - anim.progress
    const offsetY = -anim.progress * cellSize * 0.8
    ctx.globalAlpha = alpha
    ctx.fillStyle = anim.color
    const fontSize = Math.floor(cellSize * 0.35)
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cx = gridX(anim.cellX) + cellSize / 2
    const cy = gridY(anim.cellY) + cellSize / 2 + offsetY
    ctx.fillText(anim.text, cx, cy)
    ctx.globalAlpha = 1
  }
  function drawScreenFlashAnim(anim: ScreenFlashAnim): void {
    const alpha = 1 - easeOutQuad(anim.progress)
    ctx.globalAlpha = alpha * 0.4
    ctx.fillStyle = anim.color
    ctx.fillRect(0, 0, size, size)
    ctx.globalAlpha = 1
  }
  function render(state: GameState, anims: AnimationManager): void {
    drawBackground()
    drawHud(state)
    drawGrid(state)
    drawHeroSprite(state, anims)
    drawAnimations(anims)
  }
  function renderGameOver(state: GameState): void {
    // Dim overlay
    ctx.fillStyle = PALETTE.gameOverBg
    ctx.fillRect(0, 0, size, size)
    const centerY = Math.floor(size / 2)
    const titleSize = Math.floor(size * 0.08)
    const textSize = Math.floor(size * 0.045)
    const lineH = Math.floor(textSize * 1.8)
    // Title
    ctx.fillStyle = PALETTE.hpBar
    ctx.font = `bold ${titleSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GAME OVER', size / 2, centerY - lineH * 2.5)
    // Stats
    ctx.fillStyle = PALETTE.text
    ctx.font = `${textSize}px monospace`
    ctx.fillText(`Floor: ${state.floor}`, size / 2, centerY - lineH * 0.5)
    ctx.fillText(`Coins: ${state.hero.coins}`, size / 2, centerY + lineH * 0.5)
    ctx.fillStyle = PALETTE.coin
    ctx.font = `bold ${Math.floor(titleSize * 0.9)}px monospace`
    ctx.fillText(`Score: ${state.score}`, size / 2, centerY + lineH * 2)
    // Restart hint
    ctx.fillStyle = PALETTE.textDim
    ctx.font = `${Math.floor(textSize * 0.85)}px monospace`
    ctx.fillText('Tap or press any key to restart', size / 2, centerY + lineH * 3.8)
  }
  function getSize(): number {
    return size
  }
  function getCellSize(): number {
    return cellSize
  }
  return { resize, render, renderGameOver, getSize, getCellSize }
}
