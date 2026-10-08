import { CheckCircle2, Lock, Play, RotateCcw } from 'lucide-react';
import type { ChamadoStatus } from '../types/domain';

export interface Transition {
  to: ChamadoStatus;
  label: string;
  icon: typeof Play;
  primary?: boolean;
}

/**
 * Próximos passos possíveis a partir do status atual — viram os botões de ação no inspector e na
 * tela de detalhe do celular.
 */
export const TRANSITIONS: Record<ChamadoStatus, Transition[]> = {
  Aberto: [
    { to: 'EmAndamento', label: 'Iniciar atendimento', icon: Play, primary: true },
    { to: 'Resolvido', label: 'Resolver', icon: CheckCircle2 },
  ],
  EmAndamento: [{ to: 'Resolvido', label: 'Marcar como resolvido', icon: CheckCircle2, primary: true }],
  Resolvido: [
    { to: 'Fechado', label: 'Fechar', icon: Lock, primary: true },
    { to: 'Aberto', label: 'Reabrir', icon: RotateCcw },
  ],
  Fechado: [{ to: 'Aberto', label: 'Reabrir', icon: RotateCcw }],
};
