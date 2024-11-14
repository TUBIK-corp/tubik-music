import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.SERVER_PORT,
    proxy: {
      '/api': {
        target: process.env.API_URL || "https://music.tubik-corp.ru",
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: process.env.API_URL || "https://music.tubik-corp.ru",
        changeOrigin: true,
        secure: false,
        ws: true, // Добавьте эту строку
        rewrite: (path) => path.replace(/^\/socket\.io/, '/socket.io'),
      }
    },
    watch: {
      usePolling: true
    }
  }
})