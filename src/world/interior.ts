import type { Vec3 } from './layout';

/**
 * Casca comum dos cenários internos de landmark — a agência do Banco Central (`bank.ts`) e a
 * biblioteca da Universidade (`universidade.ts`). Quem desenha é `scene/interior/`.
 *
 * O molde é sempre o mesmo: uma sala apertada de ladrilhos 1×1, duas paredes lisas (fundo e
 * esquerda, as únicas que a câmera isométrica enxerga), rodapé e móveis do kit da Kenney. A sala é
 * propositalmente pequena — sobra de chão vazio vira espaço morto na tela, já que o painel do
 * interior cobre a direita.
 *
 * **Toda posição daqui é o centro da peça**, apoiada no chão: os GLB do kit têm a origem num canto
 * e quem recentra é a cena, para que estes módulos possam ser lidos como planta baixa.
 */

/** Lado do ladrilho de chão (o kit desenha os móveis numa grade de 1×1). */
export const TILE = 1;

/**
 * As paredes **não** vêm do kit. Os três modelos (`wall`, `wallWindow`, `wallDoorway`) têm recortes
 * de janela e vão de porta: vistos de perto viram uma silhueta serrilhada, e as emendas entre
 * segmentos aparecem. Como aqui elas só fazem papel de fundo, são lajes lisas pintadas com a paleta
 * do tema — sem emenda, sem recorte.
 */
export const WALL_H = 1.9;
export const WALL_T = 0.14;
/** Faixa escura no pé da parede: dá profundidade sem desenhar nada. */
export const BASEBOARD_H = 0.12;

/** Planta da sala em ladrilhos. */
export interface Sala {
  cols: number;
  rows: number;
}

/** Caixa lisa desenhada direto na cena (parede, rodapé, prancha de estante). */
export interface Slab {
  /** Centro da caixa. */
  position: Vec3;
  size: [number, number, number];
}

/** Peça de mobília: o `kind` é o nome do GLB no kit (`furnitureModel`). */
export interface InteriorPiece {
  kind: string;
  /** Centro da peça, apoiada no chão. */
  position: Vec3;
  rotationY: number;
}

export interface InteriorBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const roomWidth = (sala: Sala) => sala.cols * TILE;
export const roomDepth = (sala: Sala) => sala.rows * TILE;

/** Coordenadas contínuas na régua dos ladrilhos, com a origem no meio da sala — aceitam meio ladrilho. */
export const colX = (sala: Sala, col: number) => (col - (sala.cols - 1) / 2) * TILE;
export const rowZ = (sala: Sala, row: number) => (row - (sala.rows - 1) / 2) * TILE;

export const tileCenter = (sala: Sala, col: number, row: number): Vec3 => [colX(sala, col), 0, rowZ(sala, row)];

/** Linha da parede do fundo (−z): meio ladrilho além do centro da primeira fila. */
export const backZ = (sala: Sala) => rowZ(sala, 0) - TILE / 2;
/** Linha da parede lateral esquerda (−x). */
export const leftX = (sala: Sala) => colX(sala, 0) - TILE / 2;

/** Um ladrilho de chão por célula da planta. */
export function floorTiles(sala: Sala): InteriorPiece[] {
  const pecas: InteriorPiece[] = [];
  for (let row = 0; row < sala.rows; row++) {
    for (let col = 0; col < sala.cols; col++) {
      pecas.push({ kind: 'floorFull', position: tileCenter(sala, col, row), rotationY: 0 });
    }
  }
  return pecas;
}

/**
 * Só as duas paredes que a câmera isométrica enxerga (fundo e esquerda) — as da frente tapariam a
 * sala. Uma laje inteiriça por parede; a do fundo avança a espessura da outra para o canto fechar
 * sem fresta.
 */
export function wallSlabs(sala: Sala): Slab[] {
  const w = roomWidth(sala);
  const d = roomDepth(sala);
  return [
    { position: [-WALL_T / 2, WALL_H / 2, backZ(sala) - WALL_T / 2], size: [w + WALL_T, WALL_H, WALL_T] },
    { position: [leftX(sala) - WALL_T / 2, WALL_H / 2, 0], size: [WALL_T, WALL_H, d] },
  ];
}

/** Rodapé: a mesma planta das lajes, só que baixo e um fio mais grosso, para sobressair. */
export function baseboardSlabs(sala: Sala): Slab[] {
  const EXTRA = 0.05;
  return wallSlabs(sala).map(({ position, size }) => {
    const [w, , d] = size;
    // Engrossa só o eixo fino — é ele que encosta na parede.
    const grosso: [number, number, number] = w < d ? [w + EXTRA, BASEBOARD_H, d] : [w, BASEBOARD_H, d + EXTRA];
    return { position: [position[0], BASEBOARD_H / 2, position[2]], size: grosso };
  });
}

export function roomBounds(sala: Sala): InteriorBounds {
  const w = roomWidth(sala);
  const d = roomDepth(sala);
  return { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };
}

/**
 * Câmera de interior por **direção × distância**: a direção dá o ângulo da vista, a distância dá o
 * zoom. Separar os dois é o que permite reenquadrar o cenário mexendo num número só.
 */
export function interiorCamera(target: Vec3, dir: Vec3, distance: number): { position: Vec3; target: Vec3 } {
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  return { position: dir.map((c, i) => target[i] + (c / len) * distance) as Vec3, target };
}
