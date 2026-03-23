import type { Direction } from '../engine/types.js'

export type InputCallback = (direction: Direction) => void

export interface InputHandler {
  /** Start listening for input events */
  bind(): void
  /** Stop listening for input events */
  unbind(): void
}

const MIN_SWIPE_DISTANCE = 30

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
}

export function createInputHandler(
  target: HTMLElement,
  onDirection: InputCallback,
): InputHandler {
  let touchStartX = 0
  let touchStartY = 0
  let isSwiping = false
  function onKeyDown(e: KeyboardEvent): void {
    const dir = KEY_MAP[e.key]
    if (dir) {
      e.preventDefault()
      onDirection(dir)
    }
  }
  function onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0]
    if (!touch) return
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    isSwiping = true
  }
  function onTouchEnd(e: TouchEvent): void {
    if (!isSwiping) return
    isSwiping = false
    const touch = e.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (Math.max(absDx, absDy) < MIN_SWIPE_DISTANCE) return
    e.preventDefault()
    if (absDx > absDy) {
      onDirection(dx > 0 ? 'right' : 'left')
    } else {
      onDirection(dy > 0 ? 'down' : 'up')
    }
  }
  function bind(): void {
    document.addEventListener('keydown', onKeyDown)
    target.addEventListener('touchstart', onTouchStart, { passive: true })
    target.addEventListener('touchend', onTouchEnd, { passive: false })
  }
  function unbind(): void {
    document.removeEventListener('keydown', onKeyDown)
    target.removeEventListener('touchstart', onTouchStart)
    target.removeEventListener('touchend', onTouchEnd)
  }
  return { bind, unbind }
}

/** Resolve a swipe direction from delta — exported for testing */
export function resolveSwipeDirection(dx: number, dy: number): Direction | null {
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  if (Math.max(absDx, absDy) < MIN_SWIPE_DISTANCE) return null
  if (absDx > absDy) {
    return dx > 0 ? 'right' : 'left'
  }
  return dy > 0 ? 'down' : 'up'
}

/** Resolve key to direction — exported for testing */
export function resolveKeyDirection(key: string): Direction | null {
  return KEY_MAP[key] ?? null
}
