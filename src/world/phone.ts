import type { ChamadoDTO, ChamadoStatus, ClienteDTO, Prioridade } from '../types/domain';
import { formatarDia, hojeISO } from './datas';
import { clienteNome, isChamadoAberto } from './status';
import { norm } from './text';

// ─── Abas da listagem ───────────────────────────────────────────────────────

export type ChamadoAba = 'abertos' | 'andamento' | 'fechados';

/**
 * O backend tem quatro status para as três abas pedidas: `Resolvido` é um fechado que o cliente
 * ainda pode reabrir, então mora junto com `Fechado`.
 */
export const ABA_STATUS: Record<ChamadoAba, ChamadoStatus[]> = {
  abertos: ['Aberto'],
  andamento: ['EmAndamento'],
  fechados: ['Resolvido', 'Fechado'],
};

export const ABAS: { id: ChamadoAba; label: string }[] = [
  { id: 'abertos', label: 'Abertos' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'fechados', label: 'Fechados' },
];

export interface ChamadoFiltros {
  busca: string;
  prioridade: Prioridade | null;
  origem: string | null;
}

export const FILTROS_VAZIOS: ChamadoFiltros = { busca: '', prioridade: null, origem: null };

export function temFiltro(f: ChamadoFiltros): boolean {
  return f.busca.trim() !== '' || f.prioridade !== null || f.origem !== null;
}

const PESO: Record<Prioridade, number> = { Alta: 3, Media: 2, Baixa: 1 };

/** Busca, prioridade, origem e contexto do distrito — tudo menos a aba. */
function aplicarFiltros(chamados: ChamadoDTO[], f: ChamadoFiltros, idCliente: number | null): ChamadoDTO[] {
  const busca = norm(f.busca.trim());
  return chamados.filter((c) => {
    if (idCliente !== null && c.idCliente !== idCliente) return false;
    if (f.prioridade && c.prioridade !== f.prioridade) return false;
    if (f.origem && c.origem !== f.origem) return false;
    if (!busca) return true;
    return [c.protocolo, c.assunto, c.clienteNome, c.usuarioNome, c.origem].some((campo) => norm(campo).includes(busca));
  });
}

/** Mais urgente primeiro e, empatado, o que teve atividade mais recente (caixa de entrada). */
function ordenar(chamados: ChamadoDTO[]): ChamadoDTO[] {
  return [...chamados].sort(
    (a, b) =>
      PESO[b.prioridade] - PESO[a.prioridade] ||
      b.dataHoraUltimaAtualizacao.localeCompare(a.dataHoraUltimaAtualizacao)
  );
}

export function filtrarChamados(
  chamados: ChamadoDTO[],
  aba: ChamadoAba,
  f: ChamadoFiltros,
  idCliente: number | null = null
): ChamadoDTO[] {
  const status = ABA_STATUS[aba];
  return ordenar(aplicarFiltros(chamados, f, idCliente).filter((c) => status.includes(c.status)));
}

/** Contagem de cada aba já com os filtros aplicados — senão o número contradiz a lista. */
export function contarPorAba(
  chamados: ChamadoDTO[],
  f: ChamadoFiltros,
  idCliente: number | null = null
): Record<ChamadoAba, number> {
  const base = aplicarFiltros(chamados, f, idCliente);
  const conta = (aba: ChamadoAba) => base.filter((c) => ABA_STATUS[aba].includes(c.status)).length;
  return { abertos: conta('abertos'), andamento: conta('andamento'), fechados: conta('fechados') };
}

/** Em qual aba um chamado cai — usado para abrir a lista já na aba certa ao voltar do detalhe. */
export function abaDoChamado(status: ChamadoStatus): ChamadoAba {
  if (status === 'Aberto') return 'abertos';
  if (status === 'EmAndamento') return 'andamento';
  return 'fechados';
}

// ─── Chat: uma conversa por cliente ─────────────────────────────────────────

export interface Conversa {
  idCliente: number;
  nome: string;
  /** Threads do cliente, da mais recente para a mais antiga. */
  chamados: ChamadoDTO[];
  abertos: number;
  /** Chamado mais recente — vira a linha de prévia da lista. */
  ultimo: ChamadoDTO | null;
}

/**
 * As mensagens do backend são por chamado (`/Chamado/{id}/mensagens`), não por cliente. A conversa
 * de um cliente é a união das threads dos chamados dele; aqui só montamos o índice — as mensagens
 * são carregadas sob demanda ao abrir a conversa.
 */
export function conversas(clientes: ClienteDTO[], chamados: ChamadoDTO[]): Conversa[] {
  const lista = clientes.map<Conversa>((cliente) => {
    const doCliente = chamados
      .filter((c) => c.idCliente === cliente.idCliente)
      .sort((a, b) => b.dataHoraUltimaAtualizacao.localeCompare(a.dataHoraUltimaAtualizacao));
    return {
      idCliente: cliente.idCliente,
      nome: clienteNome(cliente),
      chamados: doCliente,
      abertos: doCliente.filter(isChamadoAberto).length,
      ultimo: doCliente[0] ?? null,
    };
  });

  // Com conversa primeiro (atividade mais recente no topo); sem conversa no fim, em ordem alfabética.
  return lista.sort((a, b) => {
    if (!a.ultimo || !b.ultimo) return a.ultimo ? -1 : b.ultimo ? 1 : a.nome.localeCompare(b.nome);
    return b.ultimo.dataHoraUltimaAtualizacao.localeCompare(a.ultimo.dataHoraUltimaAtualizacao);
  });
}

export interface MensagemLike {
  idMensagem: number;
  idChamado: number;
  autorNome: string;
  autorEhAdmin: boolean;
  conteudoHtml: string;
  dataCriacao: string;
}

export interface BlocoConversa {
  idChamado: number;
  protocolo: string;
  assunto: string;
  mensagens: MensagemLike[];
}

/**
 * Mensagens de vários chamados numa linha do tempo só, quebrada num bloco novo a cada troca de
 * chamado — o separador de protocolo é o que diz ao atendente de qual assunto se está falando.
 */
export function blocosDaConversa(mensagens: MensagemLike[], chamados: ChamadoDTO[]): BlocoConversa[] {
  const porId = new Map(chamados.map((c) => [c.idChamado, c]));
  const ordenadas = [...mensagens].sort(
    (a, b) => a.dataCriacao.localeCompare(b.dataCriacao) || a.idMensagem - b.idMensagem
  );

  const blocos: BlocoConversa[] = [];
  for (const m of ordenadas) {
    const atual = blocos[blocos.length - 1];
    if (atual && atual.idChamado === m.idChamado) {
      atual.mensagens.push(m);
      continue;
    }
    const chamado = porId.get(m.idChamado);
    blocos.push({
      idChamado: m.idChamado,
      protocolo: chamado?.protocolo ?? `#${m.idChamado}`,
      assunto: chamado?.assunto ?? 'Chamado',
      mensagens: [m],
    });
  }
  return blocos;
}

// ─── Prazo da conversão ─────────────────────────────────────────────────────

/** `yyyy-mm-dd` → `dd/mm/aaaa` sem passar por `Date` (que leria a string como UTC e viraria o dia). */
export const formatarPrazo = formatarDia;

/** Mensagem de erro do campo, ou `null` se o prazo serve. */
export function prazoInvalido(valor: string, agora = new Date()): string | null {
  if (!valor) return 'Informe o prazo de atendimento.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Data inválida.';
  if (valor < hojeISO(agora)) return 'O prazo não pode ser no passado.';
  return null;
}

/** Resposta automática no chat do cliente quando o chamado vira tarefa. */
export function mensagemDePrazo(assunto: string, dataPrazo: string): string {
  return `Seu chamado “${assunto}” virou uma tarefa da nossa equipe. Prazo de atendimento: ${formatarPrazo(dataPrazo)}.`;
}
