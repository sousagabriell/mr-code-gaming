import type { LandmarkKind } from '../store/uiStore';
import type { ChamadoDTO, ClienteDTO, ProjetoDTO } from '../types/domain';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

const TONE_BY_STATUS: Record<string, Tone> = {
  // Cliente / contrato
  Ativo: 'ok',
  Inativo: 'neutral',
  Rascunho: 'neutral',
  AguardandoAprovacao: 'warn',
  Encerrado: 'neutral',
  Cancelado: 'neutral',
  // Projeto
  Planejamento: 'neutral',
  EmAndamento: 'info',
  Pausado: 'warn',
  Concluido: 'ok',
  // Chamado
  Aberto: 'warn',
  Resolvido: 'ok',
  Fechado: 'neutral',
  // Financeiro
  Pendente: 'warn',
  Pago: 'ok',
  Atrasado: 'bad',
  // Prioridade
  Baixa: 'neutral',
  Media: 'warn',
  Alta: 'bad',
};

export function statusTone(status: string): Tone {
  return TONE_BY_STATUS[status] ?? 'neutral';
}

const LABEL: Record<string, string> = {
  EmAndamento: 'Em andamento',
  AguardandoAprovacao: 'Aguardando aprovação',
  Concluido: 'Concluído',
  Media: 'Média',
  EscopoFechado: 'Escopo fechado',
  PorHora: 'Por hora',
  ADMIN: 'Administrador',
  STAFF: 'Equipe',
};

export function label(value: string): string {
  return LABEL[value] ?? value;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export const clienteCode = (id: number) => `CL-${pad2(id)}`;
export const projetoCode = (id: number) => `PR-${pad2(id)}`;

export function clienteNome(c: Pick<ClienteDTO, 'nomeFantasia' | 'razaoSocial'>): string {
  return c.nomeFantasia || c.razaoSocial;
}

export const LANDMARK_META: Record<LandmarkKind, { code: string; nome: string; modulo: string }> = {
  datacenter: { code: 'DC', nome: 'Data Center', modulo: 'Observabilidade' },
  banco: { code: 'BC', nome: 'Banco Central', modulo: 'Financeiro' },
  universidade: { code: 'UN', nome: 'Universidade', modulo: 'Wiki' },
  prefeitura: { code: 'PF', nome: 'Prefeitura', modulo: 'Metas e XP' },
  escritorio: { code: 'ES', nome: 'Escritório', modulo: 'Equipe e contratos' },
};

export function isChamadoAberto(c: Pick<ChamadoDTO, 'status'>): boolean {
  return c.status === 'Aberto' || c.status === 'EmAndamento';
}

const EM_OBRAS: ProjetoDTO['status'][] = ['Planejamento', 'EmAndamento', 'Pausado'];

export function isProjetoEmObras(p: Pick<ProjetoDTO, 'status'>): boolean {
  return EM_OBRAS.includes(p.status);
}

export function isProjetoAtrasado(p: Pick<ProjetoDTO, 'status' | 'dataPrevisaoFim'>, now = Date.now()): boolean {
  return isProjetoEmObras(p) && new Date(p.dataPrevisaoFim).getTime() < now;
}

/** 0..1 pelo tempo decorrido entre início e previsão (não há % de conclusão real no backend). */
export function projetoProgress(
  p: Pick<ProjetoDTO, 'status' | 'dataInicio' | 'dataPrevisaoFim'>,
  now = Date.now()
): number {
  if (p.status === 'Concluido') return 1;
  if (p.status === 'Planejamento') return 0;
  const start = new Date(p.dataInicio).getTime();
  const end = new Date(p.dataPrevisaoFim).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0.5;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

const PRIORIDADE_PESO = { Alta: 3, Media: 2, Baixa: 1 } as const;

export function worstPrioridade(chamados: Pick<ChamadoDTO, 'prioridade'>[]): ChamadoDTO['prioridade'] | null {
  if (chamados.length === 0) return null;
  return chamados.reduce<ChamadoDTO['prioridade']>(
    (worst, c) => (PRIORIDADE_PESO[c.prioridade] > PRIORIDADE_PESO[worst] ? c.prioridade : worst),
    'Baixa'
  );
}
