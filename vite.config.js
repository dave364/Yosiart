import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  cacheDir: '.vite-cache',
  // En desarrollo, /api va a la API local (cd api && npm run dev).
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
