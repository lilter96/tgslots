import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3002,
    proxy: {
      '/game': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
