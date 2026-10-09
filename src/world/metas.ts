import { atividadesConcluidas, isChamadoResolvido, type GameData } from './gamification';

/**
 * Metas da Prefeitura: objetivos que a equipe combina ("fechar 12 faturas até o fim do trimestre"),
 * com prazo e recompensa em XP.
 *
 * Diferente das seis missões fixas da semana (`weeklyMissions`), a meta é **escrita pelo usuário** —
 * mas o progresso continua vindo do dado real do MrCodeAdmin, recortado pela janela da meta. Nada
 * aqui é digitado à mão depois de criada.
 *
 * Tudo puro e testado em `metas.test.ts`; onde as metas são guardadas é assunto de `store/metasStore.ts`.
 */

/**
 * O que uma meta pode medir. Escrito à mão, e **não** derivado de `XpCategory`: aquela lista ganhou
 * `'metas'` quando o bônus entrou no XP, e uma meta que mede metas cumpridas seria circular.
 */
export type MetaMetrica =
  | 'clientes'
  | 'contratos'
  | 'projetos'
  | 'chamados'
  | 'atividades'
  | 'faturas'
  | 'wiki'
  | 'receita';

export const METRICAS: MetaMetrica[] = [
  'chamados',
  'atividades',
  'faturas',
  'receita',
  'projetos',
  'clientes',
  'contratos',
  'wiki',
];

export const METRICA_LABEL: Record<MetaMetrica, string> = {
  clientes: 'Clientes ativos conquistados',
  contratos: 'Contratos fechados',
  projetos: 'Projetos entregues',
  chamados: 'Chamados resolvidos',
  atividades: 'Atividades entregues',
  faturas: 'Faturas recebidas',
  wiki: 'Artigos publicados',
  receita: 'Recebido em reais',
};

/** Unidade do alvo — muda o campo do formulário e como o progresso é escrito na tela. */
export const METRICA_EM_REAIS = (m: MetaMetrica) => m === 'receita';

/**
 * Só chamados e atividades têm `idUsuarioAdminResponsavel` nos DTOs — é por isso que o ranking
 * semanal também só pontua esses dois. Nas outras métricas o campo nem aparece no formulário, em vez
 * de oferecer uma escolha que não mediria nada.
 */
export const METRICAS_COM_RESPONSAVEL: MetaMetrica[] = ['chamados', 'atividades'];
export const aceitaResponsavel = (m: MetaMetrica) => METRICAS_COM_RESPONSAVEL.includes(m);

export interface Meta {
  id: string;
  titulo: string;
  metrica: MetaMetrica;
  alvo: number;
  /** `aaaa-mm-dd`, **inclusivos** nos dois extremos. */
  inicio: string;
  fim: string;
  /** XP pago uma única vez, quando a meta é batida. */
  recompensa: number;
  /** `null` = meta da cidade; com id, é de uma pessoa da equipe. */
  idResponsavel: number | null;
  nomeResponsavel: string | null;
  criadaEm: string;
}

/** Registro de uma meta batida. Guarda o pagamento, não só a data: o selo sobrevive à meta. */
export interface MetaCumprida {
  em: string;
  xp: number;
  titulo: string;
}

export type Cumpridas = Record<string, MetaCumprida>;

export type MetaSituacao = 'agendada' | 'ativa' | 'cumprida' | 'expirada';

export interface MetaComProgresso {
  meta: Meta;
  progresso: number;
  /** 0–1, limitado — a barra não passa de cheia, mas o texto mostra a contagem real. */
  pct: number;
  situacao: MetaSituacao;
  cumpridaEm: string | null;
}

// ─── Janela ─────────────────────────────────────────────────────────────────

/**
 * `aaaa-mm-dd` → milissegundos **no fuso local**. `new Date('2026-11-01')` seria lido como UTC e, em
 * fuso negativo, começaria a meta no dia 31 — o mesmo cuidado de `formatarPrazo` em `phone.ts`.
 */
function diaLocal(iso: string, fimDoDia = false): number {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return fimDoDia ? new Date(ano, mes - 1, dia, 23, 59, 59, 999).getTime() : new Date(ano, mes - 1, dia).getTime();
}

export const inicioDaJanela = (meta: Pick<Meta, 'inicio'>) => diaLocal(meta.inicio);
export const fimDaJanela = (meta: Pick<Meta, 'fim'>) => diaLocal(meta.fim, true);

/** O carimbo caiu dentro da janela? Os dois extremos contam. */
function naJanela(carimbo: string | null | undefined, meta: Meta): boolean {
  if (!carimbo) return false;
  const t = new Date(carimbo).getTime();
  return t >= inicioDaJanela(meta) && t <= fimDaJanela(meta);
}

const daPessoa = (meta: Meta, id: number | null | undefined) =>
  meta.idResponsavel === null || meta.idResponsavel === id;

// ─── Progresso ──────────────────────────────────────────────────────────────

/** Quanto já foi feito dentro da janela. Cada métrica tem a sua data no DTO — ver MANUAL §8. */
export function progressoDaMeta(meta: Meta, d: GameData): number {
  switch (meta.metrica) {
    case 'clientes':
      return d.clientes.filter((c) => c.status === 'Ativo' && naJanela(c.dataCadastro, meta)).length;
    case 'contratos':
      return d.contratos.filter(
        (c) => (c.status === 'Ativo' || c.status === 'Encerrado') && naJanela(c.dataCriacao, meta)
      ).length;
    case 'projetos':
      return d.projetos.filter((p) => p.status === 'Concluido' && naJanela(p.dataConclusao, meta)).length;
    case 'chamados':
      return d.chamados.filter(
        (c) =>
          isChamadoResolvido(c) &&
          naJanela(c.dataHoraUltimaAtualizacao, meta) &&
          daPessoa(meta, c.idUsuarioAdminResponsavel)
      ).length;
    case 'atividades':
      return atividadesConcluidas(d.kanbans).filter(
        (a) => naJanela(a.dataConclusao, meta) && daPessoa(meta, a.idUsuarioAdminResponsavel)
      ).length;
    case 'faturas':
      return d.faturas.filter((f) => f.status === 'Pago' && naJanela(f.dataPagamento, meta)).length;
    case 'receita':
      return d.faturas
        .filter((f) => f.status === 'Pago' && naJanela(f.dataPagamento, meta))
        .reduce((s, f) => s + f.valor, 0);
    case 'wiki':
      return d.wikiPaginas.filter((w) => naJanela(w.dataCriacao, meta)).length;
  }
}

function situacaoDaMeta(meta: Meta, cumprida: boolean, agora: number): MetaSituacao {
  // Cumprida vence tudo: uma vez batida, fica batida mesmo com a janela vencida (ver MANUAL §16).
  if (cumprida) return 'cumprida';
  if (agora < inicioDaJanela(meta)) return 'agendada';
  if (agora > fimDaJanela(meta)) return 'expirada';
  return 'ativa';
}

/** Ordem de leitura do painel: o que pede atenção primeiro, o histórico no fim. */
const PESO: Record<MetaSituacao, number> = { ativa: 0, agendada: 1, cumprida: 2, expirada: 3 };

export function avaliarMetas(metas: Meta[], d: GameData, cumpridas: Cumpridas, agora: number): MetaComProgresso[] {
  return metas
    .map<MetaComProgresso>((meta) => {
      const registro = cumpridas[meta.id] ?? null;
      const progresso = progressoDaMeta(meta, d);
      return {
        meta,
        progresso,
        pct: meta.alvo > 0 ? Math.min(1, progresso / meta.alvo) : 0,
        situacao: situacaoDaMeta(meta, !!registro, agora),
        cumpridaEm: registro?.em ?? null,
      };
    })
    .sort(
      (a, b) =>
        PESO[a.situacao] - PESO[b.situacao] ||
        a.meta.fim.localeCompare(b.meta.fim) ||
        a.meta.titulo.localeCompare(b.meta.titulo, 'pt-BR')
    );
}

/**
 * Quantas metas estão em andamento agora. Contagem barata — a placa do prédio e o seletor de
 * distrito não precisam varrer os dados do mundo para calcular progresso.
 */
export function contarAtivas(metas: Meta[], cumpridas: Cumpridas, agora: number): number {
  return metas.filter((m) => !cumpridas[m.id] && agora >= inicioDaJanela(m) && agora <= fimDaJanela(m)).length;
}

/** Metas ativas que acabaram de bater o alvo — o que ainda não foi registrado. */
export function metasParaRegistrar(avaliadas: MetaComProgresso[]): MetaComProgresso[] {
  return avaliadas.filter((m) => m.situacao === 'ativa' && m.progresso >= m.meta.alvo);
}

/** XP já conquistado em metas. Sai do registro, não das metas — o selo sobrevive a uma exclusão. */
export const xpDeMetas = (cumpridas: Cumpridas) =>
  Object.values(cumpridas).reduce((s, c) => s + c.xp, 0);

// ─── Validação ──────────────────────────────────────────────────────────────

/**
 * Teto da recompensa. Não é regra de negócio, é guarda: sem ele uma meta emite cinco níveis de uma
 * vez e os desbloqueios por nível deixam de significar alguma coisa.
 */
export const RECOMPENSA_MAX = 1000;
export const ALVO_MAX = 1_000_000;

export type RascunhoMeta = Pick<
  Meta,
  'titulo' | 'metrica' | 'alvo' | 'inicio' | 'fim' | 'recompensa' | 'idResponsavel' | 'nomeResponsavel'
>;

/** Validação de verdade — o zod do formulário é só a primeira camada. */
export function erroDaMeta(r: RascunhoMeta): string | null {
  if (!r.titulo.trim()) return 'Dê um nome para a meta.';
  if (!Number.isFinite(r.alvo) || r.alvo < 1) return 'O alvo precisa ser pelo menos 1.';
  if (r.alvo > ALVO_MAX) return 'Esse alvo é grande demais.';
  if (!r.inicio || !r.fim) return 'Defina o início e o fim da meta.';
  if (r.fim < r.inicio) return 'O fim não pode ser antes do início.';
  if (!Number.isFinite(r.recompensa) || r.recompensa < 0) return 'A recompensa não pode ser negativa.';
  if (r.recompensa > RECOMPENSA_MAX) return `A recompensa vai até ${RECOMPENSA_MAX} XP.`;
  if (r.idResponsavel !== null && !aceitaResponsavel(r.metrica)) {
    return `"${METRICA_LABEL[r.metrica]}" não tem responsável no sistema — essa meta só pode ser da cidade.`;
  }
  return null;
}
