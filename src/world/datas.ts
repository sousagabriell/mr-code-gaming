/**
 * Datas de **dia inteiro** (`aaaa-mm-dd`) — prazo de chamado, janela de meta, campos `<input
 * type="date">`.
 *
 * O cuidado é sempre o mesmo: `new Date('2026-11-01')` é lido como **UTC**, e num fuso negativo isso
 * vira 31/10. Então nada aqui passa por `Date(string)`; as datas são montadas a partir dos pedaços,
 * em horário local.
 */

/** `aaaa-mm-dd` → `dd/mm/aaaa`. */
export function formatarDia(valor: string): string {
  const [ano, mes, dia] = valor.split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : valor;
}

/** `aaaa-mm-dd` de hoje no fuso local — o que um `<input type="date">` espera. */
export function hojeISO(agora: Date = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${m}-${d}`;
}

/** `aaaa-mm-dd` somado de `dias` — para os padrões do formulário ("daqui a um mês"). */
export function diaISOEm(dias: number, agora: Date = new Date()): string {
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + dias);
  return hojeISO(d);
}
