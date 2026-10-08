/**
 * Remove acentos e caixa para a busca casar "clinica" com "Clínica".
 * `̀-ͯ` é o bloco de marcas diacríticas que o NFD separa das letras.
 */
export function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
