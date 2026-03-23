/**
 * Generate PNG icons from the hero sprite for PWA and Apple Touch Icon.
 * Usage: npx tsx scripts/generate-icons.ts
 *
 * Uses raw PNG encoding (no external deps).
 */

import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

const SPRITE = [
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
]

const COLORS: Record<string, [number, number, number, number]> = {
  '.': [0x1a, 0x1a, 0x2e, 255], // bg
  o: [0x0d, 0x0e, 0x1a, 255],
  a: [0x4f, 0xc3, 0xf7, 255],
  b: [0xff, 0xff, 0xff, 255],
  c: [0x02, 0x88, 0xd1, 255],
}

function createPNG(size: number): Buffer {
  const scale = Math.floor(size / 12)
  const w = scale * 12
  const h = scale * 12
  // Build raw RGBA image data with filter bytes
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0 // filter: none
    const spriteRow = Math.floor(y / scale)
    for (let x = 0; x < w; x++) {
      const spriteCol = Math.floor(x / scale)
      const ch = SPRITE[spriteRow]?.[spriteCol] ?? '.'
      const [r, g, b, a] = COLORS[ch] ?? COLORS['.']!
      const offset = y * (w * 4 + 1) + 1 + x * 4
      raw[offset] = r!
      raw[offset + 1] = g!
      raw[offset + 2] = b!
      raw[offset + 3] = a!
    }
  }
  const compressed = deflateSync(raw)
  // Build PNG file
  const chunks: Buffer[] = []
  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  function writeChunk(type: string, data: Buffer) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeB = Buffer.from(type)
    const crcData = Buffer.concat([typeB, data])
    let crc = crc32(crcData)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc >>> 0)
    chunks.push(Buffer.concat([len, typeB, data, crcBuf]))
  }
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  writeChunk('IHDR', ihdr)
  // IDAT
  writeChunk('IDAT', compressed)
  // IEND
  writeChunk('IEND', Buffer.alloc(0))
  return Buffer.concat(chunks)
}

// CRC32 table
const crcTable: number[] = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Generate icons
const sizes = [
  { size: 180, name: 'public/apple-touch-icon.png' },
  { size: 192, name: 'public/icon-192.png' },
  { size: 512, name: 'public/icon-512.png' },
]

for (const { size, name } of sizes) {
  const png = createPNG(size)
  writeFileSync(name, png)
  console.log(`Generated ${name} (${size}x${size}, ${png.length} bytes)`)
}
