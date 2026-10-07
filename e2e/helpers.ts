import { expect, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

/**
 * Entra no app já no modo pedido. O modo lista não depende de WebGL — é rápido e estável no CI.
 * O tour é marcado como visto para não cobrir a tela.
 */
export async function login(page: Page, view: '3d' | 'lista' = 'lista') {
  if (!email || !password) throw new Error('Defina E2E_EMAIL e E2E_PASSWORD (usuário do MrCodeAdmin de dev).');

  await page.addInitScript((mode) => {
    localStorage.setItem('mrcode-city:view', mode);
    // Qualquer id de usuário: o tour lê a chave do usuário logado, então marca uma faixa comum.
    for (let id = 1; id <= 50; id++) localStorage.setItem(`mrcode-city:tour:${id}`, 'done');
  }, view);

  await page.goto('/');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: /Buscar/ })).toBeVisible();
}
