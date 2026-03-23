import { createGameController } from './engine/game.js'
import type { GameEvent } from './engine/types.js'
import { createRenderer } from './renderer/renderer.js'
import type { AdPromptButton } from './renderer/renderer.js'
import { createAnimationManager } from './renderer/animations.js'
import { createInputHandler } from './renderer/input.js'
import { createSoundEngine } from './audio/soundEngine.js'
import { PALETTE } from './renderer/sprites.js'
import { loadHighScore, saveHighScore } from './storage.js'
import type { HighScoreData } from './storage.js'
import { showRewardedAd, skipAd, onAdAnalytics } from './ads/ads.js'
import type { AdAnalyticsEvent } from './ads/ads.js'

// -- Bootstrap --
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
if (!canvas) throw new Error('Canvas element not found')
const ctx2d = canvas.getContext('2d')
if (!ctx2d) throw new Error('2D context not available')

const renderer = createRenderer({ canvas, ctx: ctx2d })
const anims = createAnimationManager()
const sound = createSoundEngine()

let game = createGameController()
type Screen = 'title' | 'playing' | 'game_over' | 'ad_revive' | 'ad_powerup'
let screen: Screen = 'title'
let highScoreData: HighScoreData = loadHighScore()

// -- Ad prompt state --
const POWER_UP_FLOOR_INTERVAL = 3
let floorsCleared = 0
let adBusy = false // true while ad is being "shown"
let adPromptButtons: { watchBtn: AdPromptButton; skipBtn: AdPromptButton } | null = null

// -- Analytics logging --
onAdAnalytics((event: AdAnalyticsEvent) => {
  console.log('[ad]', event.type, event.rewardType, `floor=${event.floor}`)
})

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
        floorsCleared++
        break
      case 'game_over':
        highScoreData = saveHighScore(ev.score, ev.floor)
        sound.play('gameOver')
        break
    }
  }
}

// -- Screen transitions --
function startGame(): void {
  game = createGameController()
  screen = 'playing'
  inputLocked = false
  floorsCleared = 0
  adBusy = false
  adPromptButtons = null
  sound.unlock()
  sound.play('menuSelect')
}

function restartGame(): void {
  game = createGameController()
  screen = 'playing'
  inputLocked = false
  floorsCleared = 0
  adBusy = false
  adPromptButtons = null
  sound.play('menuSelect')
}

// -- Ad flow handlers --
async function handleWatchReviveAd(): Promise<void> {
  if (adBusy) return
  adBusy = true
  const state = game.getState()
  const result = await showRewardedAd('revive', state.floor)
  adBusy = false
  if (result.watched && game.revive()) {
    screen = 'playing'
    inputLocked = false
    adPromptButtons = null
  } else {
    screen = 'game_over'
    adPromptButtons = null
    inputLocked = true
    setTimeout(() => { inputLocked = false }, 400)
  }
}

function handleSkipReviveAd(): void {
  const state = game.getState()
  skipAd('revive', state.floor)
  screen = 'game_over'
  adPromptButtons = null
  inputLocked = true
  setTimeout(() => { inputLocked = false }, 400)
}

async function handleWatchPowerUpAd(): Promise<void> {
  if (adBusy) return
  adBusy = true
  const state = game.getState()
  // Choose ATK boost if hero is at full HP, otherwise full heal
  const rewardType = state.hero.hp >= state.hero.maxHp ? 'atk_boost' : 'full_heal'
  const result = await showRewardedAd(rewardType, state.floor)
  adBusy = false
  if (result.watched) {
    game.applyPowerUp(result.rewardType === 'atk_boost' ? 'atk_boost' : 'full_heal')
    anims.addScreenFlash(result.rewardType === 'atk_boost' ? PALETTE.weapon : PALETTE.potion)
    sound.play(result.rewardType === 'atk_boost' ? 'weaponEquip' : 'potionDrink')
  }
  screen = 'playing'
  inputLocked = false
  adPromptButtons = null
}

function handleSkipPowerUpAd(): void {
  const state = game.getState()
  skipAd('atk_boost', state.floor)
  screen = 'playing'
  inputLocked = false
  adPromptButtons = null
}

// -- Input --
let inputLocked = false

function handleDirection(direction: Parameters<typeof game.move>[0]): void {
  if (inputLocked) return
  if (screen === 'title') {
    startGame()
    return
  }
  if (screen === 'game_over') {
    restartGame()
    return
  }
  if (screen === 'ad_revive' || screen === 'ad_powerup') return
  if (screen !== 'playing') return
  sound.unlock()
  const state = game.getState()
  if (state.status !== 'playing') return
  if (anims.isAnimating()) return
  const newState = game.move(direction)
  processEvents(newState.events)
  if (newState.status === 'game_over') {
    if (!game.hasRevived()) {
      screen = 'ad_revive'
      inputLocked = true
      setTimeout(() => { inputLocked = false }, 300)
    } else {
      screen = 'game_over'
      inputLocked = true
      setTimeout(() => { inputLocked = false }, 800)
    }
    return
  }
  // Check for power-up ad opportunity after floor clear
  if (newState.events.some((e) => e.type === 'floor_clear') && floorsCleared > 0 && floorsCleared % POWER_UP_FLOOR_INTERVAL === 0) {
    screen = 'ad_powerup'
    inputLocked = true
    setTimeout(() => { inputLocked = false }, 300)
  }
}

const input = createInputHandler(canvas, handleDirection)

// -- Start/restart on any key/tap --
function onKey(e: KeyboardEvent): void {
  if (inputLocked) return
  if (screen === 'title') {
    e.preventDefault()
    startGame()
    return
  }
  if (screen === 'game_over') {
    e.preventDefault()
    restartGame()
  }
}
document.addEventListener('keydown', onKey)

// -- Hit test helper for ad prompt buttons --
function hitTestButton(btn: AdPromptButton, cssX: number, cssY: number): boolean {
  const dpr = renderer.getDpr()
  const canvasX = cssX * dpr
  const canvasY = cssY * dpr
  return canvasX >= btn.x && canvasX <= btn.x + btn.w && canvasY >= btn.y && canvasY <= btn.y + btn.h
}

// -- Sound toggle on tap --
canvas.addEventListener('click', (e: MouseEvent) => {
  if (screen !== 'playing') return
  const rect = canvas.getBoundingClientRect()
  const cssX = e.clientX - rect.left
  const cssY = e.clientY - rect.top
  if (renderer.hitTestSoundToggle(cssX, cssY)) {
    sound.toggleMute()
    e.stopPropagation()
  }
})

// -- Ad prompt click handlers --
canvas.addEventListener('click', (e: MouseEvent) => {
  if (inputLocked || adBusy) return
  if (screen !== 'ad_revive' && screen !== 'ad_powerup') return
  if (!adPromptButtons) return
  const rect = canvas.getBoundingClientRect()
  const cssX = e.clientX - rect.left
  const cssY = e.clientY - rect.top
  if (hitTestButton(adPromptButtons.watchBtn, cssX, cssY)) {
    e.stopPropagation()
    if (screen === 'ad_revive') {
      handleWatchReviveAd()
    } else {
      handleWatchPowerUpAd()
    }
    return
  }
  if (hitTestButton(adPromptButtons.skipBtn, cssX, cssY)) {
    e.stopPropagation()
    if (screen === 'ad_revive') {
      handleSkipReviveAd()
    } else {
      handleSkipPowerUpAd()
    }
  }
})

// -- Title screen / game over tap to start --
canvas.addEventListener('click', () => {
  if (inputLocked) return
  if (screen === 'title') {
    startGame()
  } else if (screen === 'game_over') {
    restartGame()
  }
})

// -- Game loop --
let lastTime = 0

function frame(timestamp: number): void {
  const dt = lastTime === 0 ? 0 : (timestamp - lastTime) / 1000
  lastTime = timestamp
  if (screen === 'title') {
    const time = timestamp / 1000
    renderer.renderTitle(time)
  } else {
    anims.update(dt)
    const state = game.getState()
    renderer.render(state, anims)
    if (screen === 'playing') {
      renderer.renderSoundToggle(sound.isMuted())
    }
    if (screen === 'game_over' && !anims.isAnimating()) {
      renderer.renderGameOver(state, highScoreData)
    }
    if (screen === 'ad_revive' && !anims.isAnimating()) {
      adPromptButtons = renderer.renderAdPrompt('revive')
    }
    if (screen === 'ad_powerup' && !anims.isAnimating()) {
      adPromptButtons = renderer.renderAdPrompt('power_up')
    }
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
