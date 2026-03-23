import { createGameController } from './engine/game.js'
import type { GameEvent } from './engine/types.js'
import { createRenderer } from './renderer/renderer.js'
import { createAnimationManager } from './renderer/animations.js'
import { createInputHandler } from './renderer/input.js'
import { createSoundEngine } from './audio/soundEngine.js'
import { PALETTE } from './renderer/sprites.js'

// -- Bootstrap --
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
if (!canvas) throw new Error('Canvas element not found')
const ctx2d = canvas.getContext('2d')
if (!ctx2d) throw new Error('2D context not available')

const renderer = createRenderer({ canvas, ctx: ctx2d })
const anims = createAnimationManager()
const sound = createSoundEngine()

let game = createGameController()

// -- Animation event mapping --
function processEvents(events: GameEvent[]): void {
  for (const ev of events) {
    switch (ev.type) {
      case 'move':
        anims.addMove(ev.from, ev.to)
        sound.play('footstep')
        break
      case 'combat':
        anims.addFlash(ev.pos, PALETTE.hpBar)
        sound.play('swordSlash')
        if (ev.killed) {
          anims.addFloatText(ev.pos, `−${ev.damage}`, PALETTE.hpBar)
          sound.play('monsterDeath')
        } else {
          anims.addFloatText(ev.pos, `${ev.damage}`, PALETTE.white)
          sound.play('monsterHit')
        }
        break
      case 'hero_hurt':
        anims.addFlash(ev.pos, PALETTE.hpBar)
        anims.addFloatText(ev.pos, `−${ev.damage}`, PALETTE.hpBar)
        sound.play('heroHurt')
        break
      case 'collect_potion':
        anims.addFloatText(ev.pos, `+${ev.heal}`, PALETTE.potion)
        sound.play('potionDrink')
        break
      case 'collect_coin':
        anims.addFloatText(ev.pos, `+$${ev.value}`, PALETTE.coin)
        sound.play('coinPickup')
        break
      case 'collect_weapon':
        anims.addFlash(ev.pos, PALETTE.weapon)
        anims.addFloatText(ev.pos, `ATK+${ev.atk}`, PALETTE.weaponEdge)
        sound.play('weaponEquip')
        break
      case 'collect_shield':
        anims.addFlash(ev.pos, PALETTE.shield)
        anims.addFloatText(ev.pos, `DEF+${ev.def}`, PALETTE.shieldInner)
        sound.play('shieldEquip')
        break
      case 'floor_clear':
        anims.addScreenFlash(PALETTE.exit)
        sound.play('floorClear')
        break
      case 'game_over':
        sound.play('gameOver')
        break
    }
  }
}

// -- Input --
let inputLocked = false

function handleDirection(direction: Parameters<typeof game.move>[0]): void {
  if (inputLocked) return
  sound.unlock()
  const state = game.getState()
  if (state.status === 'game_over') {
    restartGame()
    return
  }
  if (state.status !== 'playing') return
  if (anims.isAnimating()) return
  const newState = game.move(direction)
  processEvents(newState.events)
  if (newState.status === 'game_over') {
    inputLocked = true
    setTimeout(() => { inputLocked = false }, 800)
  }
}

function restartGame(): void {
  game = createGameController()
  inputLocked = false
}

const input = createInputHandler(canvas, handleDirection)

// -- Restart on any key/tap during game over --
function onRestartKey(e: KeyboardEvent): void {
  const state = game.getState()
  if (state.status === 'game_over' && !inputLocked) {
    e.preventDefault()
    restartGame()
  }
}
document.addEventListener('keydown', onRestartKey)

// -- Game loop --
let lastTime = 0

function frame(timestamp: number): void {
  const dt = lastTime === 0 ? 0 : (timestamp - lastTime) / 1000
  lastTime = timestamp
  anims.update(dt)
  const state = game.getState()
  renderer.render(state, anims)
  if (state.status === 'game_over' && !anims.isAnimating()) {
    renderer.renderGameOver(state)
  }
  requestAnimationFrame(frame)
}

// -- Init --
function init(): void {
  renderer.resize()
  window.addEventListener('resize', () => renderer.resize())
  input.bind()
  requestAnimationFrame(frame)
}

init()
