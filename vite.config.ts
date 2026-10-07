import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Em produção o jogo é servido em /city/ no mesmo domínio do MrCodeAdmin (ver docs/MANUAL-TECNICO.md §19).
  base: process.env.VITE_BASE ?? '/',
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
  // Testes unitários só em src/ (os E2E do Playwright ficam em e2e/).
  test: { include: ['src/**/*.test.ts'] },
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas grandes em pedaços próprios: cache longo entre deploys e download em paralelo.
        codeSplitting: {
          groups: [
            // O que a tela de login precisa — não pode depender de three.js.
            { name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|zustand|@tanstack)[\\/]/, priority: 40 },
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'r3f', test: /node_modules[\\/](@react-three|three-stdlib|camera-controls|postprocessing|n8ao|maath|troika)/, priority: 20 },
          ],
        },
      },
    },
  },
})
