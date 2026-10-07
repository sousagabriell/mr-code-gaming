/** Paleta 3D do tema claro "maquete". A cor da marca é a mesma do MrCodeAdmin (#134ced). */
export const COLORS = {
  brandBlue: '#134ced',
  brandBlueLight: '#4a7af7',
  brandPurple: '#5e4ced',
  success: '#22c55e',
  warning: '#f5a623',
  danger: '#ef4444',
  info: '#38bdf8',
  neutral: '#94a3b8',

  wall: '#f8f9fd',
  wallShade: '#e3e8f3',
  glass: '#c4d4fb',
  ground: '#eef1f8',
  lot: '#e2e7f2',
  plaza: '#e7eaf4',
  road: '#d3d9e8',
  roadLine: '#ffffff',
  zoneLine: '#f2b84b',
  tree: '#7fcf8e',
  treeDark: '#5fb873',
  trunk: '#a07a5a',
} as const;

export type ClientColorState = 'ativo' | 'pendente' | 'encerrado' | 'neutro';

/** Cor do telhado da sede pelo estado do contrato. */
export const CLIENT_COLOR_BY_STATE: Record<ClientColorState, string> = {
  ativo: COLORS.brandBlue,
  pendente: COLORS.warning,
  encerrado: '#a3acbf',
  neutro: '#c3cbdc',
};

export const PRIORIDADE_COLOR: Record<'Baixa' | 'Media' | 'Alta', string> = {
  Baixa: COLORS.info,
  Media: COLORS.warning,
  Alta: COLORS.danger,
};
