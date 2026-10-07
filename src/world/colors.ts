/** Mesmos tokens de mrcode-admin-frontend/src/styles.scss — reaproveitados como cor de material 3D. */
export const COLORS = {
  brandBlue: '#134ced',
  brandBlueHover: '#2c60f6',
  brandPurple: '#5e4ced',
  success: '#22c55e',
  warning: '#f5a623',
  danger: '#ef4444',
  info: '#38bdf8',
  neutral: '#6b7280',
  neutralDim: '#3a3f55',
} as const;

export type ClientColorState = 'ativo' | 'pendente' | 'encerrado' | 'neutro';

export const CLIENT_COLOR_BY_STATE: Record<ClientColorState, string> = {
  ativo: COLORS.brandBlue,
  pendente: COLORS.warning,
  encerrado: COLORS.neutral,
  neutro: COLORS.neutralDim,
};

export const PRIORIDADE_COLOR: Record<'Baixa' | 'Media' | 'Alta', string> = {
  Baixa: COLORS.info,
  Media: COLORS.warning,
  Alta: COLORS.danger,
};
