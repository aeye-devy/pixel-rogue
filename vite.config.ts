import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/pixel-rogue/',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  server: {
    port: 3000,
  },
})
