import type { GameState } from '../engine/types.js'
import { GRID_SIZE } from '../engine/types.js'
import { PALETTE, drawEntity, drawHero } from './sprites.js'
import type { AnimationManager, FlashAnim, FloatTextAnim, ScreenFlashAnim } from './animations.js'
import { easeOutQuad } from './animations.js'
import type { HighScoreData } from '../storage.js'

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
  renderGameOver(state: GameState, highScoreData: HighScoreData): void
  /** Render title screen. */
  renderTitle(time: number): void
  /** Render sound toggle icon. */
  renderSoundToggle(muted: boolean): void
  /** Get current canvas size */
  getSize(): number
  /** Get cell size in pixels */
  getCellSize(): number
  /** Check if a pixel coordinate hits the sound toggle button. Returns true if hit. */
  hitTestSoundToggle(cssX: number, cssY: number): boolean
}

export function createRenderer(config: RendererConfig): Renderer {
  const { canvas, ctx } = config
  let size = 0
  let hudHeight = 0
  let gridSize = 0
  let cellSize = 0
  let gridOffsetY = 0
  let dpr = 1
  // Sound toggle button bounds (canvas pixel coords)
  let soundBtnX = 0
  let soundBtnY = 0
  let soundBtnSize = 0
  function resize(): void {
    dpr = window.devicePixelRatio || 1
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
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = gridX(x)
        const py = gridY(y)
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt
        ctx.fillRect(px, py, cellSize, cellSize)
        const dp = Math.max(1, Math.floor(cellSize / 12))
        ctx.fillStyle = PALETTE.gridLine
        const h = x * 7 + y * 13
        const scale = cellSize / 12
        ctx.fillRect(px + Math.floor(((h * 3 + 5) % 10 + 1) * scale), py + Math.floor(((h * 7 + 3) % 10 + 1) * scale), dp, dp)
        ctx.fillRect(px + Math.floor(((h * 11 + 2) % 10 + 1) * scale), py + Math.floor(((h * 5 + 8) % 10 + 1) * scale), dp, dp)
        ctx.strokeStyle = PALETTE.gridLine
        ctx.lineWidth = 1
        ctx.strokeRect(px, py, cellSize, cellSize)
      }
    }
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
    // HP bar
    const barX = pad
    const barY = Math.floor(hudHeight * 0.2)
    const barW = Math.floor(size * 0.45)
    const barH = Math.floor(hudHeight * 0.3)
    ctx.fillStyle = PALETTE.hpBarBg
    ctx.fillRect(barX, barY, barW, barH)
    const hpRatio = state.hero.hp / state.hero.maxHp
    ctx.fillStyle = PALETTE.hpBar
    ctx.fillRect(barX, barY, Math.floor(barW * hpRatio), barH)
    ctx.strokeStyle = PALETTE.gridLine
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barW, barH)
    // HP text
    ctx.fillStyle = PALETTE.white
    ctx.font = `bold ${smallFontSize}px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`HP ${state.hero.hp}/${state.hero.maxHp}`, barX + 4, barY + Math.floor(barH / 2))
    // Stats row
    const statsY = barY + barH + Math.floor(hudHeight * 0.15)
    ctx.font = `${smallFontSize}px monospace`
    ctx.fillStyle = PALETTE.text
    ctx.textAlign = 'left'
    ctx.fillText(`ATK ${state.hero.atk}  DEF ${state.hero.def}`, pad, statsY)
    // Score & floor on right
    ctx.textAlign = 'right'
    ctx.font = `bold ${fontSize}px monospace`
    ctx.fillStyle = PALETTE.coin
    ctx.fillText(`$${state.hero.coins}`, size - pad, barY + Math.floor(barH / 2))
    ctx.font = `${smallFontSize}px monospace`
    ctx.fillStyle = PALETTE.textDim
    ctx.fillText(`F${state.floor}`, size - pad, statsY)
    // Separator
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
  function renderGameOver(state: GameState, highScoreData: HighScoreData): void {
    // Dim overlay
    ctx.fillStyle = PALETTE.gameOverBg
    ctx.fillRect(0, 0, size, size)
    const centerY = Math.floor(size / 2)
    const titleSize = Math.floor(size * 0.08)
    const textSize = Math.floor(size * 0.04)
    const lineH = Math.floor(textSize * 2)
    // GAME OVER title
    ctx.fillStyle = PALETTE.hpBar
    ctx.font = `bold ${titleSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GAME OVER', size / 2, centerY - lineH * 3)
    // This run stats
    ctx.fillStyle = PALETTE.text
    ctx.font = `${textSize}px monospace`
    ctx.fillText(`Floor: ${state.floor}`, size / 2, centerY - lineH * 1.5)
    ctx.fillText(`Coins: ${state.hero.coins}`, size / 2, centerY - lineH * 0.5)
    // Score
    ctx.fillStyle = PALETTE.coin
    ctx.font = `bold ${Math.floor(titleSize * 0.9)}px monospace`
    ctx.fillText(`Score: ${state.score}`, size / 2, centerY + lineH * 0.5)
    // High score / best floor
    const hasNewHighScore = state.score >= highScoreData.highScore && state.score > 0
    const smallSize = Math.floor(textSize * 0.85)
    ctx.font = `${smallSize}px monospace`
    if (hasNewHighScore) {
      ctx.fillStyle = PALETTE.exit
      ctx.fillText('NEW HIGH SCORE!', size / 2, centerY + lineH * 1.5)
    } else {
      ctx.fillStyle = PALETTE.textDim
      ctx.fillText(`Best: ${highScoreData.highScore}`, size / 2, centerY + lineH * 1.5)
    }
    ctx.fillStyle = PALETTE.textDim
    ctx.fillText(`Best Floor: ${highScoreData.bestFloor}`, size / 2, centerY + lineH * 2.2)
    // Play Again button
    const btnW = Math.floor(size * 0.45)
    const btnH = Math.floor(size * 0.08)
    const btnX = Math.floor((size - btnW) / 2)
    const btnY = centerY + lineH * 3
    ctx.fillStyle = PALETTE.exit
    ctx.fillRect(btnX, btnY, btnW, btnH)
    ctx.fillStyle = PALETTE.black
    ctx.font = `bold ${Math.floor(btnH * 0.55)}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PLAY AGAIN', size / 2, btnY + Math.floor(btnH / 2))
    // Restart hint
    ctx.fillStyle = PALETTE.textDim
    ctx.font = `${Math.floor(smallSize * 0.85)}px monospace`
    ctx.fillText('or press any key', size / 2, btnY + btnH + Math.floor(lineH * 0.6))
  }
  function renderTitle(time: number): void {
    drawBackground()
    // Decorative dungeon floor tiles in background
    const tileSize = Math.floor(size / 8)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt
        ctx.globalAlpha = 0.3
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
      }
    }
    ctx.globalAlpha = 1
    const centerY = Math.floor(size * 0.38)
    // "PIXEL ROGUE" title — large pixel art style text
    const titleFontSize = Math.floor(size * 0.09)
    ctx.fillStyle = PALETTE.hero
    ctx.font = `bold ${titleFontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PIXEL', size / 2, centerY - Math.floor(titleFontSize * 0.7))
    ctx.fillStyle = PALETTE.exit
    ctx.fillText('ROGUE', size / 2, centerY + Math.floor(titleFontSize * 0.7))
    // Hero sprite in center
    const heroSize = Math.floor(size * 0.15)
    const heroX = Math.floor((size - heroSize) / 2)
    const heroY = centerY + Math.floor(size * 0.15)
    drawHero(ctx, heroX, heroY, heroSize)
    // "Tap to Start" blinking prompt
    const blinkAlpha = 0.5 + 0.5 * Math.sin(time * 3)
    ctx.globalAlpha = blinkAlpha
    const promptSize = Math.floor(size * 0.04)
    ctx.fillStyle = PALETTE.text
    ctx.font = `${promptSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('TAP TO START', size / 2, centerY + Math.floor(size * 0.35))
    ctx.globalAlpha = 1
    // Version/credit line
    ctx.fillStyle = PALETTE.textDim
    ctx.font = `${Math.floor(promptSize * 0.7)}px monospace`
    ctx.fillText('A Fanxy Game', size / 2, size - Math.floor(size * 0.05))
  }
  function renderSoundToggle(muted: boolean): void {
    const btnSz = Math.floor(size * 0.06)
    const margin = Math.floor(size * 0.02)
    soundBtnX = size - btnSz - margin
    soundBtnY = hudHeight + margin
    soundBtnSize = btnSz
    // Semi-transparent background circle
    ctx.globalAlpha = 0.5
    ctx.fillStyle = PALETTE.bg
    ctx.beginPath()
    ctx.arc(soundBtnX + btnSz / 2, soundBtnY + btnSz / 2, btnSz / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    // Speaker icon
    const cx = soundBtnX + btnSz / 2
    const cy = soundBtnY + btnSz / 2
    const u = Math.floor(btnSz / 8) // unit
    ctx.fillStyle = muted ? PALETTE.hpBar : PALETTE.text
    // Speaker body
    ctx.fillRect(cx - u * 2, cy - u, u * 2, u * 2)
    // Speaker cone
    ctx.beginPath()
    ctx.moveTo(cx, cy - u * 2)
    ctx.lineTo(cx + u * 2, cy - u * 2)
    ctx.lineTo(cx + u * 2, cy + u * 2)
    ctx.lineTo(cx, cy + u * 2)
    ctx.closePath()
    ctx.fill()
    if (muted) {
      // X mark for muted
      ctx.strokeStyle = PALETTE.hpBar
      ctx.lineWidth = Math.max(1, Math.floor(u * 0.8))
      ctx.beginPath()
      ctx.moveTo(cx - u * 3, cy - u * 2)
      ctx.lineTo(cx + u * 3, cy + u * 2)
      ctx.moveTo(cx + u * 3, cy - u * 2)
      ctx.lineTo(cx - u * 3, cy + u * 2)
      ctx.stroke()
    }
  }
  function hitTestSoundToggle(cssX: number, cssY: number): boolean {
    if (soundBtnSize === 0) return false
    const canvasX = cssX * dpr
    const canvasY = cssY * dpr
    const hitPadding = soundBtnSize * 0.5
    return (
      canvasX >= soundBtnX - hitPadding &&
      canvasX <= soundBtnX + soundBtnSize + hitPadding &&
      canvasY >= soundBtnY - hitPadding &&
      canvasY <= soundBtnY + soundBtnSize + hitPadding
    )
  }
  function getSize(): number {
    return size
  }
  function getCellSize(): number {
    return cellSize
  }
  return { resize, render, renderGameOver, renderTitle, renderSoundToggle, getSize, getCellSize, hitTestSoundToggle }
}
