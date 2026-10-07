import { COLORS } from './colors';
import type { DespesaDTO, FaturaDTO, ObservabilidadeResumoDTO } from '../types/domain';

export interface HealthState {
  color: string;
  pulse: boolean;
}

export function datacenterHealth(obs: ObservabilidadeResumoDTO | null): HealthState {
  if (!obs?.habilitado || !obs.vps) return { color: COLORS.neutral, pulse: false };
  const worst = Math.max(
    obs.vps.cpuLoad1m / obs.vps.numNucleos,
    obs.vps.memPercentual / 100,
    obs.vps.discoPercentual / 100
  );
  if (worst > 0.85) return { color: COLORS.danger, pulse: true };
  if (worst > 0.6) return { color: COLORS.warning, pulse: false };
  return { color: COLORS.info, pulse: false };
}

export function computeSaldo(faturas: FaturaDTO[], despesas: DespesaDTO[]): number {
  const recebido = faturas.filter((f) => f.status === 'Pago').reduce((s, f) => s + f.valor, 0);
  const pago = despesas.filter((d) => d.status === 'Pago').reduce((s, d) => s + d.valor, 0);
  return recebido - pago;
}

export function bancoHealth(faturas: FaturaDTO[], despesas: DespesaDTO[]): HealthState & { saldo: number } {
  const saldo = computeSaldo(faturas, despesas);
  if (faturas.some((f) => f.status === 'Atrasado')) return { color: COLORS.danger, pulse: true, saldo };
  return { color: saldo >= 0 ? COLORS.success : COLORS.warning, pulse: false, saldo };
}
