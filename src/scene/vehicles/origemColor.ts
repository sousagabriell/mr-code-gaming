import { COLORS } from '../../world/colors';

/** Cor da faixa do baú pelo sistema de origem do chamado (como as transportadoras da referência). */
export function origemColor(origem: string): string {
  const o = origem.toLowerCase();
  if (o.includes('lmlopes')) return '#0ea5e9';
  if (o.includes('tjcoach')) return COLORS.brandPurple;
  return COLORS.brandBlue;
}
