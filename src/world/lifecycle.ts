import { formatDateShort, formatDateTimeShort } from '../lib/format';
import type { ChamadoDTO, ContratoDTO, FaturaDTO, ProjetoDTO } from '../types/domain';
import type { Tone } from './status';

export type StepState = 'done' | 'current' | 'todo';

export interface LifecycleStep {
  key: string;
  label: string;
  /** Horário/data conhecido da etapa (o backend não guarda histórico por etapa — ver plano §7). */
  time: string | null;
  state: StepState;
  tone: Tone;
}

function build(
  defs: { key: string; label: string; time?: string | null }[],
  currentIndex: number,
  currentTone: Tone
): LifecycleStep[] {
  return defs.map((d, i) => ({
    key: d.key,
    label: d.label,
    time: d.time ?? null,
    state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo',
    tone: i === currentIndex ? currentTone : i < currentIndex ? 'ok' : 'neutral',
  }));
}

const CHAMADO_ORDEM: ChamadoDTO['status'][] = ['Aberto', 'EmAndamento', 'Resolvido', 'Fechado'];

export function chamadoLifecycle(c: ChamadoDTO): LifecycleStep[] {
  const current = CHAMADO_ORDEM.indexOf(c.status);
  const atualizado = current > 0 ? formatDateTimeShort(c.dataHoraUltimaAtualizacao) : null;
  const tone: Tone = c.status === 'Aberto' ? 'warn' : c.status === 'EmAndamento' ? 'info' : 'ok';
  return build(
    [
      { key: 'Aberto', label: 'Aberto', time: formatDateTimeShort(c.dataHoraAbertura) },
      { key: 'EmAndamento', label: 'Em atendimento', time: current === 1 ? atualizado : null },
      { key: 'Resolvido', label: 'Resolvido', time: current === 2 ? atualizado : null },
      { key: 'Fechado', label: 'Fechado', time: current === 3 ? atualizado : null },
    ],
    current,
    tone
  );
}

export function contratoLifecycle(c: ContratoDTO): LifecycleStep[] {
  if (c.status === 'Cancelado') {
    return build(
      [
        { key: 'Rascunho', label: 'Rascunho', time: formatDateShort(c.dataCriacao) },
        { key: 'Cancelado', label: 'Cancelado' },
      ],
      1,
      'bad'
    );
  }
  const ordem: ContratoDTO['status'][] = ['Rascunho', 'AguardandoAprovacao', 'Ativo', 'Encerrado'];
  const current = ordem.indexOf(c.status);
  return build(
    [
      { key: 'Rascunho', label: 'Rascunho', time: formatDateShort(c.dataCriacao) },
      { key: 'AguardandoAprovacao', label: 'Aprovação' },
      { key: 'Ativo', label: 'Ativo', time: formatDateShort(c.dataInicio) },
      { key: 'Encerrado', label: 'Encerrado', time: c.dataFim ? formatDateShort(c.dataFim) : null },
    ],
    current,
    c.status === 'AguardandoAprovacao' ? 'warn' : c.status === 'Ativo' ? 'ok' : 'neutral'
  );
}

export function faturaLifecycle(f: FaturaDTO): LifecycleStep[] {
  if (f.status === 'Cancelado') {
    return build(
      [
        { key: 'Emitida', label: 'Emitida', time: formatDateShort(f.dataEmissao) },
        { key: 'Cancelada', label: 'Cancelada' },
      ],
      1,
      'neutral'
    );
  }
  const current = f.status === 'Pago' ? 2 : 1;
  return build(
    [
      { key: 'Emitida', label: 'Emitida', time: formatDateShort(f.dataEmissao) },
      { key: 'Vencimento', label: f.status === 'Atrasado' ? 'Atrasada' : 'Vencimento', time: formatDateShort(f.dataVencimento) },
      { key: 'Paga', label: 'Paga', time: f.dataPagamento ? formatDateShort(f.dataPagamento) : null },
    ],
    current,
    f.status === 'Atrasado' ? 'bad' : f.status === 'Pago' ? 'ok' : 'warn'
  );
}

export function projetoLifecycle(p: ProjetoDTO): LifecycleStep[] {
  const index: Record<ProjetoDTO['status'], number> = {
    Planejamento: 0,
    EmAndamento: 1,
    Pausado: 1,
    Concluido: 3,
    Cancelado: 1,
  };
  const current = index[p.status];
  const tone: Tone =
    p.status === 'Pausado' ? 'warn' : p.status === 'Cancelado' ? 'bad' : p.status === 'Concluido' ? 'ok' : 'info';
  return build(
    [
      { key: 'Planejamento', label: 'Planejamento' },
      { key: 'EmAndamento', label: p.status === 'Pausado' ? 'Pausado' : 'Em obras', time: formatDateShort(p.dataInicio) },
      { key: 'Entrega', label: 'Entrega prevista', time: formatDateShort(p.dataPrevisaoFim) },
      { key: 'Concluido', label: 'Concluído', time: p.dataConclusao ? formatDateShort(p.dataConclusao) : null },
    ],
    current,
    tone
  );
}
