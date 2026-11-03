import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// send /api requests to the backend
// (docker: compose service name, local: port 5050)
const apiTarget = process.env.DOCKER
  ? 'http://server:5000'
  : 'http://localhost:5050'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // listen on all interfaces so docker can reach it
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
    // file watching doesn't work well in docker on mac/windows, so poll instead
    watch: process.env.DOCKER ? { usePolling: true, interval: 100 } : undefined,
  },
})
