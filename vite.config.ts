import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Backend de desenvolvimento do mr-code-admin (dotnet run em :5200)
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5200',
        changeOrigin: true,
      },
    },
  },
})
