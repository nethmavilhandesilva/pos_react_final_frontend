import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // This says: any request starting with "/api"
      // should be sent to "http://localhost:8000"
      '/api': {
        target: 'http://localhost:8000', // <-- This is your LARAVEL server
        changeOrigin: true,
        secure: false,
      },
    }
  }
})