import { expect, test } from '@playwright/test';
import { login } from './helpers.ts';

test.describe('MrCode City — fumaça (somente leitura)', () => {
  test('modo lista mostra a cidade e abre o inspector de um cliente', async ({ page }) => {
    await login(page);
    const clientes = page.getByRole('region', { name: 'Clientes' });
    await expect(clientes.getByRole('button').first()).toBeVisible();
    await clientes.getByRole('button').first().click();
    await expect(page.getByText(/^Cliente · CL-/)).toBeVisible();
    await expect(page.getByText('CPF/CNPJ')).toBeVisible();
  });

  test('busca (/) encontra e seleciona um cliente', async ({ page }) => {
    await login(page);
    const primeiro = page.getByRole('region', { name: 'Clientes' }).getByRole('button').first();
    const nome = (await primeiro.locator('span.truncate').first().textContent())?.trim() ?? '';
    await page.keyboard.press('/');
    const busca = page.getByRole('dialog', { name: 'Buscar na cidade' });
    await expect(busca).toBeVisible();
    await busca.getByRole('textbox').fill(nome.slice(0, 6));
    await page.keyboard.press('Enter');
    await expect(busca).toBeHidden();
    await expect(page.getByText(/^Cliente · CL-/)).toBeVisible();
  });

  test('painel do jogo abre com G e mostra todas as abas', async ({ page }) => {
    await login(page);
    await page.keyboard.press('g');
    const painel = page.getByRole('dialog', { name: 'Painel do jogo' });
    await expect(painel).toBeVisible();
    for (const aba of ['Missões', 'Conquistas', 'Ranking', 'Cidade', 'Saúde']) {
      await painel.getByRole('tab', { name: aba }).click();
      await expect(painel.getByRole('tab', { name: aba })).toHaveAttribute('aria-selected', 'true');
    }
    await page.keyboard.press('Escape');
    await expect(painel).toBeHidden();
  });

  test('quadro do projeto (pátio em lista) lista colunas e abre a atividade', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /Abrir o quadro de/ }).first().click();
    await expect(page.getByRole('button', { name: 'Voltar à cidade' })).toBeVisible();
    const coluna = page.getByRole('region', { name: /^Coluna / }).first();
    await expect(coluna).toBeVisible();
    const atividade = page.getByRole('region', { name: /^Coluna / }).getByRole('button', { name: /·/ }).first();
    if (await atividade.count()) {
      await atividade.click();
      await expect(page.getByRole('heading', { name: 'Mover para a zona' })).toBeVisible();
    }
  });

  test('validação do formulário acontece no cliente (nada é enviado)', async ({ page }) => {
    await login(page);
    await page.getByRole('region', { name: 'Clientes' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Editar' }).click();
    const drawer = page.getByRole('dialog', { name: 'Editar cliente' });
    await drawer.getByLabel(/Razão social/).fill('');
    let enviado = false;
    page.on('request', (r) => {
      if (r.method() === 'PUT' && r.url().includes('/Cliente/')) enviado = true;
    });
    await drawer.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(drawer.getByText('Informe a razão social')).toBeVisible();
    expect(enviado).toBe(false);
    await drawer.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('cidade 3D carrega o canvas', async ({ page }) => {
    await login(page, '3d');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 });
  });
});
