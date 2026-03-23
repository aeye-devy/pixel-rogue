const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
if (!canvas) throw new Error('Canvas element not found')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('2D context not available')

// Placeholder: fill canvas with dark background
const SIZE = Math.min(window.innerWidth, window.innerHeight, 400)
canvas.width = SIZE
canvas.height = SIZE
ctx.fillStyle = '#1a1a2e'
ctx.fillRect(0, 0, SIZE, SIZE)
ctx.fillStyle = '#e0e0e0'
ctx.font = '16px monospace'
ctx.textAlign = 'center'
ctx.fillText('Pixel Rogue', SIZE / 2, SIZE / 2 - 10)
ctx.fillStyle = '#888'
ctx.font = '12px monospace'
ctx.fillText('Engine ready — renderer coming soon', SIZE / 2, SIZE / 2 + 15)
