import type { Position } from '../engine/types.js'

// -- Animation types --

export interface MoveAnim {
  kind: 'move'
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
}

export interface FlashAnim {
  kind: 'flash'
  cellX: number
  cellY: number
  color: string
  progress: number
}

export interface FloatTextAnim {
  kind: 'floatText'
  text: string
  color: string
  cellX: number
  cellY: number
  progress: number
}

export interface ScreenFlashAnim {
  kind: 'screenFlash'
  color: string
  progress: number
}

export type Animation = MoveAnim | FlashAnim | FloatTextAnim | ScreenFlashAnim

// -- Durations (seconds) --
const MOVE_DURATION = 0.1
const FLASH_DURATION = 0.15
const FLOAT_TEXT_DURATION = 0.6
const SCREEN_FLASH_DURATION = 0.3

// -- Animation manager --

export interface AnimationManager {
  /** Queue a hero movement animation */
  addMove(from: Position, to: Position): void
  /** Queue a cell flash (combat, pickup) */
  addFlash(pos: Position, color: string): void
  /** Queue floating text (+3 HP, -2, etc) */
  addFloatText(pos: Position, text: string, color: string): void
  /** Queue a full-screen flash (floor transition) */
  addScreenFlash(color: string): void
  /** Advance all animations by dt seconds. Returns true if any are active. */
  update(dt: number): boolean
  /** Get current animations for rendering */
  getActive(): ReadonlyArray<Animation>
  /** Get hero position offset from current move animation (grid units) */
  getHeroOffset(): { dx: number; dy: number }
  /** Whether any animation is currently playing */
  isAnimating(): boolean
}

export function createAnimationManager(): AnimationManager {
  let animations: Animation[] = []
  function addMove(from: Position, to: Position): void {
    animations.push({
      kind: 'move',
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      progress: 0,
    })
  }
  function addFlash(pos: Position, color: string): void {
    animations.push({
      kind: 'flash',
      cellX: pos.x,
      cellY: pos.y,
      color,
      progress: 0,
    })
  }
  function addFloatText(pos: Position, text: string, color: string): void {
    animations.push({
      kind: 'floatText',
      text,
      color,
      cellX: pos.x,
      cellY: pos.y,
      progress: 0,
    })
  }
  function addScreenFlash(color: string): void {
    animations.push({ kind: 'screenFlash', color, progress: 0 })
  }
  function getDuration(anim: Animation): number {
    switch (anim.kind) {
      case 'move': return MOVE_DURATION
      case 'flash': return FLASH_DURATION
      case 'floatText': return FLOAT_TEXT_DURATION
      case 'screenFlash': return SCREEN_FLASH_DURATION
    }
  }
  function update(dt: number): boolean {
    for (const anim of animations) {
      anim.progress = Math.min(1, anim.progress + dt / getDuration(anim))
    }
    animations = animations.filter((a) => a.progress < 1)
    return animations.length > 0
  }
  function getActive(): ReadonlyArray<Animation> {
    return animations
  }
  function getHeroOffset(): { dx: number; dy: number } {
    for (const anim of animations) {
      if (anim.kind === 'move') {
        const t = easeOutQuad(anim.progress)
        return {
          dx: (anim.fromX - anim.toX) * (1 - t),
          dy: (anim.fromY - anim.toY) * (1 - t),
        }
      }
    }
    return { dx: 0, dy: 0 }
  }
  function isAnimating(): boolean {
    return animations.length > 0
  }
  return { addMove, addFlash, addFloatText, addScreenFlash, update, getActive, getHeroOffset, isAnimating }
}

/** Easing: ease-out quad */
export function easeOutQuad(t: number): number {
  return t * (2 - t)
}
