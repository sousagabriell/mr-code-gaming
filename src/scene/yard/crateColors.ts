import type { KanbanTipoAtividade } from '../../types/domain';
import { COLORS } from '../../world/colors';

/** Cor da caixa por tipo de atividade — mesma legenda no pátio 3D e na HUD. */
export const TIPO_COLOR: Record<KanbanTipoAtividade, string> = {
  Tarefa: COLORS.brandBlueLight,
  Bug: COLORS.danger,
  Melhoria: COLORS.success,
  Chamado: COLORS.warning,
};
