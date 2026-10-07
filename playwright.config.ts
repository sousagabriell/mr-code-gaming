import { defineConfig } from '@playwright/test';

/**
 * Testes E2E (somente leitura — não gravam nada no MrCodeAdmin).
 * Pré-requisitos: backend de dev rodando, `npm run dev` e as variáveis E2E_EMAIL / E2E_PASSWORD.
 * Ver docs/MANUAL-TECNICO.md §15.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    // Localmente usa o Chrome instalado; no CI, `npx playwright install chromium` e E2E_CHANNEL vazio.
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
  },
});
