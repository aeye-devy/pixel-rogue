const MUTE_KEY = 'pixelRogue-muted'

export type SoundName =
  | 'footstep'
  | 'swordSlash'
  | 'monsterHit'
  | 'heroHurt'
  | 'monsterDeath'
  | 'potionDrink'
  | 'coinPickup'
  | 'weaponEquip'
  | 'shieldEquip'
  | 'floorClear'
  | 'gameOver'
  | 'menuSelect'

export interface SoundEngine {
  /** Resume AudioContext (call on first user gesture for mobile). */
  unlock(): void
  /** Play a named sound effect. */
  play(name: SoundName): void
  /** Toggle mute state. Returns new muted value. */
  toggleMute(): boolean
  /** Current mute state. */
  isMuted(): boolean
}

export function createSoundEngine(): SoundEngine {
  let ctx: AudioContext | null = null
  let muted = localStorage.getItem(MUTE_KEY) === '1'

  function getCtx(): AudioContext {
    ctx ??= new AudioContext()
    return ctx
  }

  function unlock(): void {
    const ac = getCtx()
    if (ac.state === 'suspended') {
      void ac.resume()
    }
  }

  function toggleMute(): boolean {
    muted = !muted
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    return muted
  }

  function isMuted(): boolean {
    return muted
  }

  // -- Oscillator helpers --

  function osc(
    ac: AudioContext,
    type: OscillatorType,
    freq: number,
    startTime: number,
    duration: number,
    gain: number,
    freqEnd?: number,
  ): void {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, startTime)
    if (freqEnd !== undefined) {
      o.frequency.linearRampToValueAtTime(freqEnd, startTime + duration)
    }
    g.gain.setValueAtTime(gain, startTime)
    g.gain.linearRampToValueAtTime(0, startTime + duration)
    o.connect(g)
    g.connect(ac.destination)
    o.start(startTime)
    o.stop(startTime + duration)
  }

  function noise(
    ac: AudioContext,
    startTime: number,
    duration: number,
    gain: number,
  ): void {
    const sampleRate = ac.sampleRate
    const length = Math.floor(sampleRate * duration)
    const buffer = ac.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const src = ac.createBufferSource()
    src.buffer = buffer
    const g = ac.createGain()
    g.gain.setValueAtTime(gain, startTime)
    g.gain.linearRampToValueAtTime(0, startTime + duration)
    src.connect(g)
    g.connect(ac.destination)
    src.start(startTime)
    src.stop(startTime + duration)
  }

  // -- Movement --

  /** Short stone footstep: low triangle pulse + subtle noise tap */
  function playFootstep(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'triangle', 120, t, 0.04, 0.06, 80)
    noise(ac, t, 0.03, 0.04)
  }

  // -- Combat --

  /** Sword slash: sawtooth sweep high→low with noise burst */
  function playSwordSlash(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'sawtooth', 900, t, 0.08, 0.1, 200)
    noise(ac, t, 0.06, 0.06)
  }

  /** Monster hit: square thud with quick pitch drop */
  function playMonsterHit(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'square', 300, t, 0.06, 0.1, 150)
    osc(ac, 'triangle', 200, t + 0.02, 0.05, 0.04, 100)
    noise(ac, t, 0.03, 0.03)
  }

  /** Hero hurt: descending square wave with vibrato feel */
  function playHeroHurt(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'square', 400, t, 0.1, 0.1, 200)
    osc(ac, 'square', 350, t + 0.05, 0.08, 0.06, 180)
    noise(ac, t + 0.02, 0.06, 0.04)
  }

  /** Monster death: noise explosion + descending tone cascade */
  function playMonsterDeath(ac: AudioContext): void {
    const t = ac.currentTime
    noise(ac, t, 0.12, 0.1)
    osc(ac, 'square', 500, t, 0.08, 0.08, 300)
    osc(ac, 'square', 350, t + 0.08, 0.08, 0.06, 150)
    osc(ac, 'triangle', 200, t + 0.16, 0.1, 0.05, 80)
  }

  // -- Items --

  /** Potion drink: ascending bubble trio (triangle wave) */
  function playPotionDrink(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'triangle', 400, t, 0.06, 0.06, 600)
    osc(ac, 'triangle', 500, t + 0.07, 0.06, 0.06, 700)
    osc(ac, 'triangle', 600, t + 0.14, 0.08, 0.07, 900)
  }

  /** Coin pickup: bright high-pitched double arpeggio */
  function playCoinPickup(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'square', 988, t, 0.04, 0.06)        // B5
    osc(ac, 'square', 1319, t + 0.05, 0.06, 0.07) // E6
    osc(ac, 'triangle', 1319, t + 0.05, 0.06, 0.03)
  }

  /** Weapon equip: metallic clang — sawtooth + noise burst */
  function playWeaponEquip(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'sawtooth', 600, t, 0.05, 0.08, 400)
    osc(ac, 'square', 800, t, 0.03, 0.05)
    noise(ac, t, 0.04, 0.06)
  }

  /** Shield equip: deeper metallic thud — low sawtooth + square */
  function playShieldEquip(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'sawtooth', 300, t, 0.06, 0.08, 180)
    osc(ac, 'square', 400, t, 0.04, 0.05)
    noise(ac, t, 0.05, 0.04)
  }

  // -- UI --

  /** Floor clear: triumphant ascending C major fanfare */
  function playFloorClear(ac: AudioContext): void {
    const t = ac.currentTime
    // C-E-G-C ascending fanfare
    osc(ac, 'square', 523, t, 0.12, 0.1)           // C5
    osc(ac, 'square', 659, t + 0.13, 0.12, 0.1)    // E5
    osc(ac, 'square', 784, t + 0.26, 0.12, 0.1)    // G5
    osc(ac, 'square', 1047, t + 0.39, 0.3, 0.12)   // C6 (hold)
    // Harmony layer
    osc(ac, 'triangle', 392, t + 0.39, 0.3, 0.06)  // G4
    osc(ac, 'triangle', 523, t + 0.39, 0.3, 0.06)  // C5
    // Sparkle
    osc(ac, 'triangle', 1568, t + 0.5, 0.2, 0.04, 2093)
  }

  /** Game over: sad descending minor sequence */
  function playGameOver(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'square', 440, t, 0.2, 0.1)           // A4
    osc(ac, 'square', 392, t + 0.22, 0.2, 0.1)    // G4
    osc(ac, 'square', 330, t + 0.44, 0.2, 0.1)    // E4
    osc(ac, 'triangle', 220, t + 0.66, 0.4, 0.1)  // A3 (long)
    noise(ac, t + 0.66, 0.2, 0.03)
  }

  /** Menu select: quick UI blip */
  function playMenuSelect(ac: AudioContext): void {
    const t = ac.currentTime
    osc(ac, 'square', 800, t, 0.03, 0.07, 600)
    noise(ac, t, 0.02, 0.02)
  }

  // -- Dispatcher --

  function play(name: SoundName): void {
    if (muted) return
    const ac = getCtx()
    if (ac.state === 'suspended') return
    switch (name) {
      case 'footstep':
        playFootstep(ac)
        break
      case 'swordSlash':
        playSwordSlash(ac)
        break
      case 'monsterHit':
        playMonsterHit(ac)
        break
      case 'heroHurt':
        playHeroHurt(ac)
        break
      case 'monsterDeath':
        playMonsterDeath(ac)
        break
      case 'potionDrink':
        playPotionDrink(ac)
        break
      case 'coinPickup':
        playCoinPickup(ac)
        break
      case 'weaponEquip':
        playWeaponEquip(ac)
        break
      case 'shieldEquip':
        playShieldEquip(ac)
        break
      case 'floorClear':
        playFloorClear(ac)
        break
      case 'gameOver':
        playGameOver(ac)
        break
      case 'menuSelect':
        playMenuSelect(ac)
        break
    }
  }

  return { unlock, play, toggleMute, isMuted }
}
