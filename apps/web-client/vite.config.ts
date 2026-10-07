import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  resolve: { dedupe: ['pixi.js', 'gsap'] },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3002,
    proxy: {
      '/game/x7-club': {
        target: process.env.X7_PROXY_URL ?? 'http://localhost:3003',
        changeOrigin: true,
      },
      '/game': {
        target: process.env.API_PROXY_URL ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
