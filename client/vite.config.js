import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// send /api requests to the backend
const apiTarget = process.env.API_TARGET || 'http://localhost:5050'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // listen on all interfaces
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
    // poll for file changes where normal file watching doesn't work
    watch: process.env.WATCH_POLLING ? { usePolling: true, interval: 100 } : undefined,
  },
})
