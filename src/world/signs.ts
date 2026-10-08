import { LANDMARK_Z, LOT_SIZE, type Vec3 } from './layout';

/**
 * Placas com nome ("totens") das construções: geometria, recorte do rótulo e a curva de opacidade.
 * Módulo puro — roda no vitest sem DOM, então nada de `three` nem de `document` aqui.
 */

/** Painel em unidades de mundo. Estreito de propósito: o nome quebra em até duas linhas. */
export const SIGN_PANEL = { w: 0.96, h: 0.48 } as const;
/**
 * Centro do painel. O lote de 3,8 não tem canto livre para um painel desta largura quando o cliente
 * tem 4+ projetos, então o totem é alto: o poste passa entre os canteiros e o painel passa por cima
 * deles. `LOT_OBSTACLE_TOP` é a trave desse acordo.
 */
export const SIGN_PANEL_Y = 1.6;
export const SIGN_POST = { height: SIGN_PANEL_Y - SIGN_PANEL.h / 2, radius: 0.035 } as const;
/** Coisa mais alta que um lote pode conter: a lança do guindaste do canteiro (`Crane height={1.05}`). */
export const LOT_OBSTACLE_TOP = 1.08;
export const signPanelBottom = () => SIGN_PANEL_Y - SIGN_PANEL.h / 2;
/** Painel inclinado para trás: recupera parte do encurtamento da câmera (sempre 30°–58° acima do horizonte). */
export const SIGN_TILT = -0.35;
/** Realce de hover/seleção — sem textura extra, só escala. */
export const SIGN_FOCUS_SCALE = 1.25;

/** Caracteres do nome que cabem no painel (2 linhas); o resto vira reticência. */
export const SIGN_NAME_MAX = 26;

/**
 * Some ao afastar a câmera. Medido pela distância do *controle* (câmera→alvo), nunca por placa: a
 * distância individual varia entre as colunas de lotes e as placas apagariam uma a uma, em gradiente.
 * O enquadramento inicial fica a ~30, então a cidade nasce com todas as placas acesas.
 */
export const SIGN_FADE = { start: 34, end: 44 } as const;

export function signOpacity(distance: number): number {
  if (distance <= SIGN_FADE.start) return 1;
  if (distance >= SIGN_FADE.end) return 0;
  return (SIGN_FADE.end - distance) / (SIGN_FADE.end - SIGN_FADE.start);
}

/**
 * Quina frontal-esquerda do lote: é a faixa que sobra entre a vaga de canteiro mais à esquerda
 * (`SITE_SLOTS[3]`) e a borda do lote, e à frente da sede.
 */
const CLIENT_OFFSET: [number, number] = [-1.55, 1.7];

export function clientSignAnchor(lotCenter: Vec3): Vec3 {
  return [lotCenter[0] + CLIENT_OFFSET[0], 0, lotCenter[2] + CLIENT_OFFSET[1]];
}

/** Mesmo z para os quatro landmarks — na borda da praça, senão a fileira fica escalonada. */
export function landmarkSignAnchor(x: number): Vec3 {
  return [x, 0, LANDMARK_Z + 1.9];
}

/** O painel gira no eixo y, então varre um disco de raio igual à sua meia-largura. */
export const signSweepRadius = (focused = false) =>
  (SIGN_PANEL.w / 2) * (focused ? SIGN_FOCUS_SCALE : 1);

/** Meia-extensão do lote, para os testes de folga. */
export const LOT_HALF = LOT_SIZE / 2;

/**
 * Corta pelo número de caracteres visíveis. `Array.from` e não `slice`: `nomeFantasia` é texto livre
 * de até 200 caracteres e um emoji cortado no meio viraria glifo de substituição.
 */
export function truncateLabel(name: string, max = SIGN_NAME_MAX): string {
  const chars = Array.from(name.trim());
  if (chars.length <= max) return chars.join('');
  return `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}
