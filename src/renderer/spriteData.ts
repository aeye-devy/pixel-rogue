import type { Entity } from '../engine/types.js'

// -- Pixel sprite system (12×12 logical pixels) --
// '.' = transparent, other characters map to hex colors via sprite-local palette
// Designed for Pixel Rogue's 4×4 dungeon grid at mobile scale (~90px per cell)

export interface SpriteDefinition {
  data: readonly string[]
  colors: Readonly<Record<string, string>>
}

/** Render a pixel-art sprite scaled to fill (x, y, size×size). */
export function renderSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteDefinition,
  x: number,
  y: number,
  size: number,
): void {
  const rows = sprite.data.length
  const cols = sprite.data[0]?.length ?? 0
  if (rows === 0 || cols === 0) return
  const pw = size / cols
  const ph = size / rows
  for (let r = 0; r < rows; r++) {
    const row = sprite.data[r]!
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]!
      if (ch === '.') continue
      const color = sprite.colors[ch]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(
        Math.floor(x + c * pw),
        Math.floor(y + r * ph),
        Math.ceil(pw),
        Math.ceil(ph),
      )
    }
  }
}

// -- Shared outline color --
const O = '#0d0e1a'

// ============================================================
// HERO — Cyan knight, bright silhouette, helmet + armor + eyes
// ============================================================
export const HERO_SPRITE: SpriteDefinition = {
  data: [
    '.....oo.....',
    '....oaao....',
    '...oaaaao...',
    '...oabbao...',
    '...oaaaao...',
    '....oaao....',
    '...ocaaco...',
    '..ocaaaaco..',
    '..ocaaaaco..',
    '...oaaaao...',
    '...oa..ao...',
    '...oo..oo...',
  ],
  colors: { o: O, a: '#4fc3f7', b: '#ffffff', c: '#0288d1' },
}

// ============================================================
// MONSTERS — 8 types across 4 difficulty tiers
// Each has a unique silhouette and primary color for instant ID
// ============================================================
const MONSTER_SPRITES: Record<string, SpriteDefinition> = {
  // Tier 1 — small, weak
  Rat: {
    data: [
      '............',
      '............',
      '.....ooo....',
      '....oaaao...',
      '...oabbao...',
      '...oaaaao.o.',
      '....oaaaooo.',
      '.....oaao...',
      '......oo....',
      '............',
      '............',
      '............',
    ],
    colors: { o: O, a: '#8d6e63', b: '#ffffff' },
  },
  Bat: {
    data: [
      '............',
      '.o........o.',
      '.oa......ao.',
      '.oao....oao.',
      '.oaao..oaao.',
      '..oaaooaao..',
      '...oabbao...',
      '...oaaaao...',
      '....oaao....',
      '.....oo.....',
      '............',
      '............',
    ],
    colors: { o: O, a: '#7e57c2', b: '#ef5350' },
  },
  // Tier 2 — medium threat
  Goblin: {
    data: [
      '..o......o..',
      '..ao.oo.ao..',
      '...ooaaoo...',
      '...oaaaao...',
      '...oabbao...',
      '...oaaaao...',
      '....oaao....',
      '...ocaaco...',
      '...ocaaco...',
      '....oaao....',
      '....oa.ao...',
      '....oo.oo...',
    ],
    colors: { o: O, a: '#66bb6a', b: '#ffd54f', c: '#388e3c' },
  },
  Snake: {
    data: [
      '............',
      '............',
      '.....ooo....',
      '....oaaao...',
      '....oabao...',
      '.....oaao...',
      '......oao...',
      '.....oaao...',
      '....oaaao...',
      '...oaaaao...',
      '....oooo....',
      '............',
    ],
    colors: { o: O, a: '#aed581', b: '#ef5350' },
  },
  // Tier 3 — dangerous
  Skeleton: {
    data: [
      '....oooo....',
      '...oaaaao...',
      '..oabaabao..',
      '...oaaaao...',
      '....oaao....',
      '....oaao....',
      '...oa.ao....',
      '...oaaao....',
      '...oa.ao....',
      '....oaao....',
      '...oa..ao...',
      '...oo..oo...',
    ],
    colors: { o: O, a: '#e0e0e0', b: '#2a2a3e' },
  },
  Orc: {
    data: [
      '..oooooooo..',
      '..oaaaaaao..',
      '..oabaabao..',
      '..oaaaaaao..',
      '..oababaao..',
      '...oaaaao...',
      '.oaaaaaaaaao',
      '.oaaaaaaaaao',
      '.oaaaaaaaaao',
      '..oaaaaaao..',
      '..oaa..aao..',
      '..ooo..ooo..',
    ],
    colors: { o: O, a: '#ef5350', b: '#ffffff' },
  },
  // Tier 4 — endgame threats
  Wraith: {
    data: [
      '....oooo....',
      '...oaaaao...',
      '..oaaaaaao..',
      '..oabaabao..',
      '..oaaaaaao..',
      '..oaaaaaao..',
      '...oaaaao...',
      '...oaaaao...',
      '..oao.oao...',
      '.oao...oao..',
      '.oo.....oo..',
      '............',
    ],
    colors: { o: O, a: '#ab47bc', b: '#00e676' },
  },
  Demon: {
    data: [
      '............',
      '..o......o..',
      '..oa....ao..',
      '..oaaaaaao..',
      '..oaaaaaao..',
      '..oabaabao..',
      '..oaaaaaao..',
      '...oaaaao...',
      '..oaaaaaao..',
      '..oaaaaaao..',
      '...oa..ao...',
      '...oo..oo...',
    ],
    colors: { o: O, a: '#c62828', b: '#ff6d00' },
  },
}

export function getMonsterSprite(name: string): SpriteDefinition {
  return MONSTER_SPRITES[name] ?? MONSTER_SPRITES['Rat']!
}

// ============================================================
// ITEMS — iconic shapes, high contrast against dungeon floor
// ============================================================
export const POTION_SPRITE: SpriteDefinition = {
  data: [
    '............',
    '.....oo.....',
    '....oaao....',
    '....oaao....',
    '...oooooo...',
    '..obbbbbo...',
    '..obbbbbo...',
    '..obbcbbo...',
    '..obcccbo...',
    '..obbcbbo...',
    '..obbbbbo...',
    '...ooooo....',
  ],
  colors: { o: O, a: '#8d6e63', b: '#e91e63', c: '#f8bbd0' },
}

export const COIN_SPRITE: SpriteDefinition = {
  data: [
    '............',
    '....oooo....',
    '...oaaaao...',
    '..oaaaaaao..',
    '..oaabbaao..',
    '..oabbbbao..',
    '..oaabbaao..',
    '..oaaaaaao..',
    '...oaaaao...',
    '....oooo....',
    '............',
    '............',
  ],
  colors: { o: O, a: '#ffd54f', b: '#ff8f00' },
}

export const WEAPON_SPRITE: SpriteDefinition = {
  data: [
    '............',
    '....oaao....',
    '....oaao....',
    '....oaao....',
    '....oaao....',
    '....oaao....',
    '....oaao....',
    '..oobbboo...',
    '....obbo....',
    '....obbo....',
    '....obbo....',
    '.....oo.....',
  ],
  colors: { o: O, a: '#eceff1', b: '#8d6e63' },
}

export const SHIELD_SPRITE: SpriteDefinition = {
  data: [
    '............',
    '..oooooooo..',
    '..oaaaaaao..',
    '..oaaaaaao..',
    '..oaaabbao..',
    '..oaaabbao..',
    '..oaaaaaao..',
    '...oaaaao...',
    '...oaaaao...',
    '....oaao....',
    '.....oo.....',
    '............',
  ],
  colors: { o: O, a: '#5c6bc0', b: '#7986cb' },
}

export const EXIT_SPRITE: SpriteDefinition = {
  data: [
    '............',
    '..oooooooo..',
    '..oaabbaao..',
    '..oabbbbao..',
    '..oabbbbao..',
    '..oabbbbao..',
    '..oabbbbao..',
    '..oabbbbao..',
    '..oaabbaao..',
    '..oooooooo..',
    '............',
    '............',
  ],
  colors: { o: O, a: '#1b5e20', b: '#00e676' },
}

// -- Entity → sprite lookup --
export function getEntitySprite(entity: Entity): SpriteDefinition {
  switch (entity.kind) {
    case 'monster': return getMonsterSprite(entity.name)
    case 'potion': return POTION_SPRITE
    case 'coin': return COIN_SPRITE
    case 'weapon': return WEAPON_SPRITE
    case 'shield': return SHIELD_SPRITE
    case 'exit': return EXIT_SPRITE
  }
}
