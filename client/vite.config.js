import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so the port works both locally and from Docker.
    host: true,
    port: 5173,
    // Docker bind mounts on macOS/Windows don't reliably emit file-change
    // events, so fall back to polling when running in the container.
    watch: process.env.DOCKER ? { usePolling: true, interval: 100 } : undefined,
  },
})
