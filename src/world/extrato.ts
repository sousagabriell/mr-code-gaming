import type { DespesaDTO, FaturaDTO } from '../types/domain';
import { norm } from './text';

/**
 * Regras do extrato da agência — as mesmas do fluxo `financeiro/faturas` e `financeiro/despesas` do
 * MrCodeAdmin, que lá moram em `computed()` do componente. Aqui são puras: nada de DOM, tudo testado.
 */

// ─── Navegador de mês ───────────────────────────────────────────────────────

export interface Mes {
  ano: number;
  /** 1–12 (não o 0–11 do `Date`). */
  mes: number;
}

export function mesDe(data: Date): Mes {
  return { ano: data.getFullYear(), mes: data.getMonth() + 1 };
}

/** Atravessa a virada de ano nos dois sentidos (o `Date` normaliza mês fora da faixa). */
export function deslocarMes({ ano, mes }: Mes, delta: number): Mes {
  const d = new Date(ano, mes - 1 + delta, 1);
  return mesDe(d);
}

export const mesmoMes = (a: Mes, b: Mes) => a.ano === b.ano && a.mes === b.mes;

/** "Outubro de 2026" — maiúscula inicial, que o `Intl` não põe em pt-BR. */
export function labelMes({ ano, mes }: Mes): string {
  const texto = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, mes - 1, 1));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** `aaaa-MM`, o formato que `GET /Financeiro/resumo?mes=` espera. */
export function mesParam({ ano, mes }: Mes): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

// ─── Recorte e filtros ──────────────────────────────────────────────────────

/** Fatura entra pelo vencimento, despesa pela data do lançamento. */
export const dataDaFatura = (f: FaturaDTO) => f.dataVencimento;
export const dataDaDespesa = (d: DespesaDTO) => d.dataDespesa;

export function noMes<T>(lista: T[], data: (item: T) => string, { ano, mes }: Mes): T[] {
  return lista.filter((item) => {
    const d = new Date(data(item));
    return d.getFullYear() === ano && d.getMonth() + 1 === mes;
  });
}

export interface ExtratoFiltros {
  busca: string;
  status: string | null;
  /** Só na aba de despesas. */
  categoria: string | null;
}

export const FILTROS_EXTRATO: ExtratoFiltros = { busca: '', status: null, categoria: null };

export const temFiltroExtrato = (f: ExtratoFiltros) =>
  f.busca.trim() !== '' || f.status !== null || f.categoria !== null;

export function filtrarFaturas(lista: FaturaDTO[], f: ExtratoFiltros): FaturaDTO[] {
  const busca = norm(f.busca.trim());
  return lista.filter((item) => {
    if (f.status && item.status !== f.status) return false;
    if (!busca) return true;
    return [item.numeroFatura, item.descricao, item.clienteNome].some((campo) => norm(campo).includes(busca));
  });
}

export function filtrarDespesas(lista: DespesaDTO[], f: ExtratoFiltros): DespesaDTO[] {
  const busca = norm(f.busca.trim());
  return lista.filter((item) => {
    if (f.status && item.status !== f.status) return false;
    if (f.categoria && item.categoria !== f.categoria) return false;
    if (!busca) return true;
    return [item.descricao, item.categoria].some((campo) => norm(campo).includes(busca));
  });
}

/** Categorias que aparecem no filtro: as que existem nos dados, em ordem alfabética. */
export function categoriasDe(lista: DespesaDTO[]): string[] {
  return [...new Set(lista.map((d) => d.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// ─── Agrupamento por dia ────────────────────────────────────────────────────

export interface GrupoDia<T> {
  /** Chave estável (aaaa-mm-dd) — o rótulo muda com o passar do dia. */
  key: string;
  label: string;
  itens: T[];
}

function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function labelDia(data: Date, agora = new Date()): string {
  const hoje = chaveDia(agora);
  const ontem = chaveDia(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1));
  const chave = chaveDia(data);
  if (chave === hoje) return 'Hoje';
  if (chave === ontem) return 'Ontem';
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' }).format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Do dia mais recente para o mais antigo; dentro do dia, a ordem que veio. */
export function agruparPorDia<T>(lista: T[], data: (item: T) => string, agora = new Date()): GrupoDia<T>[] {
  const ordenada = [...lista].sort((a, b) => new Date(data(b)).getTime() - new Date(data(a)).getTime());

  const grupos = new Map<string, GrupoDia<T>>();
  for (const item of ordenada) {
    const d = new Date(data(item));
    const key = chaveDia(d);
    if (!grupos.has(key)) grupos.set(key, { key, label: labelDia(d, agora), itens: [] });
    grupos.get(key)!.itens.push(item);
  }
  return [...grupos.values()];
}

// ─── Totais ─────────────────────────────────────────────────────────────────

export interface ResumoDespesas {
  pago: number;
  pendente: number;
  total: number;
}

/** `GET /Financeiro/resumo` só cobre faturas; o total de despesas do mês sai daqui. */
export function resumoDespesas(lista: DespesaDTO[]): ResumoDespesas {
  const pago = lista.filter((d) => d.status === 'Pago').reduce((s, d) => s + d.valor, 0);
  const pendente = lista.filter((d) => d.status === 'Pendente').reduce((s, d) => s + d.valor, 0);
  return { pago, pendente, total: pago + pendente };
}
