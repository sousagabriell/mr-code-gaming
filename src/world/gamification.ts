import type {
  ChamadoDTO,
  ClienteDTO,
  ContratoDTO,
  DashboardResumoDTO,
  FaturaDTO,
  KanbanColunaDTO,
  ObservabilidadeResumoDTO,
  ProjetoDTO,
  WikiPaginaDTO,
} from '../types/domain';
import { isChamadoAberto, isProjetoAtrasado } from './status';

/**
 * Gamificação derivada dos dados reais do MrCodeAdmin (sem tabela própria no backend):
 * o XP é recalculado a cada atualização. Premia RESULTADO — um chamado reaberto deixa de valer.
 */
export interface GameData {
  clientes: ClienteDTO[];
  contratos: ContratoDTO[];
  projetos: ProjetoDTO[];
  chamados: ChamadoDTO[];
  faturas: FaturaDTO[];
  wikiPaginas: WikiPaginaDTO[];
  kanbans: Map<number, KanbanColunaDTO[]>;
  observabilidade: ObservabilidadeResumoDTO | null;
  dashboard: DashboardResumoDTO | null;
  /**
   * Bônus das metas da Prefeitura já batidas (`world/metas.ts`). É a **única** parcela do XP que não
   * sai do backend: vem do armazenamento local do navegador — ver MANUAL §12 e §17.
   */
  metasCumpridas?: { quantas: number; xp: number };
}

export type XpCategory =
  | 'clientes'
  | 'contratos'
  | 'projetos'
  | 'chamados'
  | 'atividades'
  | 'faturas'
  | 'wiki'
  | 'metas';

export interface XpLine {
  key: XpCategory;
  label: string;
  count: number;
  xp: number;
}

export const CHAMADO_XP = { Baixa: 30, Media: 50, Alta: 100 } as const;
export const isChamadoResolvido = (c: Pick<ChamadoDTO, 'status'>) => c.status === 'Resolvido' || c.status === 'Fechado';

export const faturaXp = (f: Pick<FaturaDTO, 'valor'>) => 30 + Math.round(f.valor / 1000) * 5;
export const atividadeXp = (tipo: string) => (tipo === 'Bug' ? 30 : 20);

/** Atividades entregues (na coluna de conclusão) de todos os quadros carregados. */
export function atividadesConcluidas(kanbans: Map<number, KanbanColunaDTO[]>) {
  return [...kanbans.values()].flatMap((colunas) => colunas.filter((c) => c.ehColunaConclusao).flatMap((c) => c.atividades));
}

export function computeXp(d: GameData): { total: number; lines: XpLine[] } {
  const clientesAtivos = d.clientes.filter((c) => c.status === 'Ativo').length;
  const contratos = d.contratos.filter((c) => c.status === 'Ativo' || c.status === 'Encerrado').length;
  const projetos = d.projetos.filter((p) => p.status === 'Concluido').length;
  const chamados = d.chamados.filter(isChamadoResolvido);
  const atividades = atividadesConcluidas(d.kanbans);
  const faturas = d.faturas.filter((f) => f.status === 'Pago');

  const lines: XpLine[] = [
    { key: 'clientes', label: 'Clientes ativos', count: clientesAtivos, xp: clientesAtivos * 100 },
    { key: 'contratos', label: 'Contratos fechados', count: contratos, xp: contratos * 150 },
    { key: 'projetos', label: 'Projetos entregues', count: projetos, xp: projetos * 250 },
    { key: 'chamados', label: 'Chamados resolvidos', count: chamados.length, xp: chamados.reduce((s, c) => s + CHAMADO_XP[c.prioridade], 0) },
    { key: 'atividades', label: 'Atividades entregues', count: atividades.length, xp: atividades.reduce((s, a) => s + atividadeXp(a.tipo), 0) },
    { key: 'faturas', label: 'Faturas recebidas', count: faturas.length, xp: faturas.reduce((s, f) => s + faturaXp(f), 0) },
    { key: 'wiki', label: 'Artigos na wiki', count: d.wikiPaginas.length, xp: d.wikiPaginas.length * 15 },
  ];
  // Só aparece quando há meta batida: uma cidade sem metas tem exatamente o XP que sempre teve.
  const metas = d.metasCumpridas;
  if (metas && metas.quantas > 0) {
    lines.push({ key: 'metas', label: 'Metas cumpridas', count: metas.quantas, xp: metas.xp });
  }
  return { total: lines.reduce((s, l) => s + l.xp, 0), lines };
}

// ─── Níveis e desbloqueios ──────────────────────────────────────────────────

/** XP acumulado para alcançar o nível n (n ≥ 1): 0, 300, 900, 1800, 3000… */
export const levelThreshold = (n: number) => 150 * n * (n - 1);

export interface Unlock {
  level: number;
  key: 'fonte' | 'estatua' | 'parque' | 'roda-gigante' | 'torre' | 'heliponto' | 'monumento';
  nome: string;
}

export const UNLOCKS: Unlock[] = [
  { level: 2, key: 'fonte', nome: 'Fonte na praça' },
  { level: 3, key: 'estatua', nome: 'Estátua do fundador' },
  { level: 4, key: 'parque', nome: 'Parque municipal' },
  { level: 5, key: 'roda-gigante', nome: 'Roda-gigante' },
  { level: 6, key: 'torre', nome: 'Torre de vidro' },
  { level: 8, key: 'heliponto', nome: 'Heliponto' },
  { level: 10, key: 'monumento', nome: 'Monumento Mr Code' },
];

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  const base = levelThreshold(level);
  const next = levelThreshold(level + 1);
  return {
    level,
    xpInLevel: xp - base,
    xpForNext: next - base,
    progress: (xp - base) / (next - base),
    unlocked: UNLOCKS.filter((u) => u.level <= level),
    nextUnlock: UNLOCKS.find((u) => u.level > level) ?? null,
  };
}

// ─── Saúde da cidade → clima ────────────────────────────────────────────────

export type Weather = 'sol' | 'nublado' | 'chuva' | 'tempestade';

export interface HealthFactor {
  label: string;
  delta: number;
}

export function cityHealth(d: GameData, now = Date.now()): { score: number; weather: Weather; factors: HealthFactor[] } {
  const factors: HealthFactor[] = [];
  const add = (label: string, delta: number) => delta !== 0 && factors.push({ label, delta });

  const abertos = d.chamados.filter(isChamadoAberto);
  const alta = abertos.filter((c) => c.prioridade === 'Alta').length;
  const media = abertos.filter((c) => c.prioridade === 'Media').length;
  add(`${alta} chamado(s) de prioridade alta`, -12 * alta);
  add(`${media} chamado(s) de prioridade média`, -4 * media);

  const atrasadas = d.faturas.filter((f) => f.status === 'Atrasado').length;
  add(`${atrasadas} fatura(s) atrasada(s)`, -Math.min(30, 10 * atrasadas));

  const projetosAtrasados = d.projetos.filter((p) => isProjetoAtrasado(p, now)).length;
  add(`${projetosAtrasados} projeto(s) atrasado(s)`, -8 * projetosAtrasados);

  const vencidas = [...d.kanbans.values()]
    .flatMap((cols) => cols.filter((c) => !c.ehColunaConclusao).flatMap((c) => c.atividades))
    .filter((a) => a.dataPrazo && new Date(a.dataPrazo).getTime() < now).length;
  add(`${vencidas} atividade(s) com prazo vencido`, -Math.min(10, 2 * vencidas));

  const vps = d.observabilidade?.habilitado ? d.observabilidade.vps : null;
  if (vps) {
    const worst = Math.max(vps.cpuLoad1m / vps.numNucleos, vps.memPercentual / 100, vps.discoPercentual / 100);
    add('VPS sob pressão', worst > 0.85 ? -25 : worst > 0.6 ? -10 : 0);
  }

  const score = Math.max(0, Math.min(100, 100 + factors.reduce((s, f) => s + f.delta, 0)));
  const weather: Weather = score >= 80 ? 'sol' : score >= 60 ? 'nublado' : score >= 40 ? 'chuva' : 'tempestade';
  return { score, weather, factors };
}

// ─── Semana, missões e ranking ──────────────────────────────────────────────

/** Início da semana (segunda-feira 00:00, horário local). */
export function weekStart(now = Date.now()): number {
  const d = new Date(now);
  const diaDaSemana = (d.getDay() + 6) % 7; // segunda = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diaDaSemana);
  return d.getTime();
}

const inWeek = (iso: string | null | undefined, start: number) => !!iso && new Date(iso).getTime() >= start;

export interface Mission {
  key: string;
  titulo: string;
  progresso: number;
  meta: number;
  done: boolean;
}

export function weeklyMissions(d: GameData, now = Date.now()): Mission[] {
  const start = weekStart(now);
  const m = (key: string, titulo: string, progresso: number, meta: number): Mission => ({
    key,
    titulo,
    progresso: Math.min(progresso, meta),
    meta,
    done: progresso >= meta,
  });

  const altaAbertos = d.chamados.filter((c) => isChamadoAberto(c) && c.prioridade === 'Alta').length;
  const resolvidos = d.chamados.filter((c) => isChamadoResolvido(c) && inWeek(c.dataHoraUltimaAtualizacao, start)).length;
  const entregues = atividadesConcluidas(d.kanbans).filter((a) => inWeek(a.dataConclusao, start)).length;
  const recebidas = d.faturas.filter((f) => f.status === 'Pago' && inWeek(f.dataPagamento, start)).length;
  const artigos = d.wikiPaginas.filter((w) => inWeek(w.dataCriacao, start)).length;
  const atrasadas = d.faturas.filter((f) => f.status === 'Atrasado').length;

  return [
    m('alta-zero', 'Zerar os chamados de prioridade alta', altaAbertos === 0 ? 1 : 0, 1),
    m('resolver-3', 'Resolver 3 chamados na semana', resolvidos, 3),
    m('entregar-5', 'Entregar 5 atividades na semana', entregues, 5),
    m('receber-2', 'Receber 2 faturas na semana', recebidas, 2),
    m('wiki-1', 'Publicar 1 artigo na wiki', artigos, 1),
    m('sem-atraso', 'Nenhuma fatura atrasada', atrasadas === 0 ? 1 : 0, 1),
  ];
}

export interface RankingEntry {
  id: number;
  nome: string;
  xp: number;
  atividades: number;
  chamados: number;
}

/** XP da semana por pessoa: atividades entregues sob sua responsabilidade + chamados que resolveu. */
export function weeklyRanking(d: GameData, now = Date.now()): RankingEntry[] {
  const start = weekStart(now);
  const map = new Map<number, RankingEntry>();
  const get = (id: number, nome: string) => {
    const e = map.get(id) ?? { id, nome, xp: 0, atividades: 0, chamados: 0 };
    map.set(id, e);
    return e;
  };

  for (const a of atividadesConcluidas(d.kanbans)) {
    if (!a.idUsuarioAdminResponsavel || !inWeek(a.dataConclusao, start)) continue;
    const e = get(a.idUsuarioAdminResponsavel, a.nomeResponsavel ?? 'Equipe');
    e.atividades++;
    e.xp += atividadeXp(a.tipo);
  }
  for (const c of d.chamados) {
    if (!c.idUsuarioAdminResponsavel || !isChamadoResolvido(c) || !inWeek(c.dataHoraUltimaAtualizacao, start)) continue;
    const e = get(c.idUsuarioAdminResponsavel, c.nomeResponsavel ?? 'Equipe');
    e.chamados++;
    e.xp += CHAMADO_XP[c.prioridade];
  }
  return [...map.values()].sort((a, b) => b.xp - a.xp || a.nome.localeCompare(b.nome));
}

// ─── Conquistas ─────────────────────────────────────────────────────────────

export interface Achievement {
  key: string;
  nome: string;
  descricao: string;
  /** Condição atendida agora (a HUD guarda as já desbloqueadas para não "perder" a conquista). */
  met: boolean;
}

export function achievements(d: GameData, ctx: { level: number; health: number; now?: number }): Achievement[] {
  const now = ctx.now ?? Date.now();
  const concluidas = atividadesConcluidas(d.kanbans).length;
  const recebido = d.faturas.filter((f) => f.status === 'Pago').reduce((s, f) => s + f.valor, 0);
  const a = (key: string, nome: string, descricao: string, met: boolean): Achievement => ({ key, nome, descricao, met });

  return [
    a('pedra-fundamental', 'Pedra fundamental', 'Ter o primeiro cliente na cidade', d.clientes.length >= 1),
    a('metropole', 'Metrópole', 'Chegar a 10 clientes', d.clientes.length >= 10),
    a('inauguracao', 'Inauguração', 'Entregar um projeto', d.projetos.some((p) => p.status === 'Concluido')),
    a('ritmo-de-obra', 'Ritmo de obra', 'Entregar 10 atividades', concluidas >= 10),
    a('linha-de-producao', 'Linha de produção', 'Entregar 100 atividades', concluidas >= 100),
    a('caixa-zero', 'Caixa de entrada zero', 'Nenhum chamado em aberto', !d.chamados.some(isChamadoAberto)),
    a('mes-no-azul', 'Mês no azul', 'Fechar um mês com recebimentos acima das despesas', !!d.dashboard?.serieMensal.some((m) => m.recebido > m.despesas)),
    a('caixa-forte', 'Caixa-forte', 'Receber R$ 50 mil em faturas', recebido >= 50_000),
    a('biblioteca', 'Biblioteca', 'Ter 10 artigos na wiki', d.wikiPaginas.length >= 10),
    a(
      'pontualidade',
      'Pontualidade',
      'Nenhuma fatura nem projeto atrasado',
      !d.faturas.some((f) => f.status === 'Atrasado') && !d.projetos.some((p) => isProjetoAtrasado(p, now))
    ),
    a('ceu-de-brigadeiro', 'Céu de brigadeiro', 'Saúde da cidade acima de 90', ctx.health >= 90),
    a('prefeitura', 'Chave da cidade', 'Alcançar o nível 5', ctx.level >= 5),
  ];
}
