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
        target: process.env.API_URL || "http://tubik-corp.ru:24003",
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        target: process.env.API_URL || "http://tubik-corp.ru:24003",
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