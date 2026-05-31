import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy /coursera-api/* → https://api.coursera.org/*
      // This bypasses CORS so the browser can call Coursera's public catalog API directly.
      '/coursera-api': {
        target: 'https://api.coursera.org',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/coursera-api/, ''),
      },
    },
  },
})
