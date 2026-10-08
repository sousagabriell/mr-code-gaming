import type { Vec3 } from './layout';

/**
 * Agência do Banco Central: o cenário que se abre ao "ver a conta bancária", no mesmo padrão do
 * pátio de obras (`yard.ts`) — medidas e peças puras aqui, renderização em `scene/bank/`.
 *
 * O kit de móveis da Kenney não tem balcão de banco nem cofre: o balcão é uma fila de `kitchenBar`
 * e o cofre é a geladeira grande pintada de aço. Ver MANUAL-TECNICO §9.9.
 */

/** Lado do ladrilho de chão e do segmento de parede do kit (ambos 1×1). */
export const TILE = 1;
/** Sala em ladrilhos: x de -COLS/2 a +COLS/2, z de -ROWS/2 a +ROWS/2. */
export const COLS = 11;
export const ROWS = 9;

export const ROOM_W = COLS * TILE;
export const ROOM_D = ROWS * TILE;

/** Vão da porta na parede do fundo (índices de coluna que ficam sem parede cheia). */
export const DOOR_COL = 0;

export type BankPieceKind =
  | 'floorFull'
  | 'wall'
  | 'wallWindow'
  | 'wallDoorway'
  | 'rugRounded'
  | 'kitchenBar'
  | 'kitchenBarEnd'
  | 'stoolBar'
  | 'desk'
  | 'chairDesk'
  | 'computerScreen'
  | 'computerKeyboard'
  | 'kitchenFridgeLarge'
  | 'cardboardBoxClosed'
  | 'loungeSofa'
  | 'loungeChair'
  | 'tableCoffee'
  | 'pottedPlant'
  | 'lampSquareCeiling'
  | 'coatRackStanding'
  | 'trashcan'
  | 'books';

export interface BankPiece {
  kind: BankPieceKind;
  position: Vec3;
  /** Múltiplos de 90° — o kit é todo ortogonal. */
  rotationY: number;
}

const Q = Math.PI / 2;

/** Centro do ladrilho (col, row), com a origem no meio da sala. */
export function tileCenter(col: number, row: number): Vec3 {
  return [(col - (COLS - 1) / 2) * TILE, 0, (row - (ROWS - 1) / 2) * TILE];
}

const x = (col: number) => tileCenter(col, 0)[0];
const z = (row: number) => tileCenter(0, row)[2];

/** Chão: um ladrilho por célula. */
export function floorPieces(): BankPiece[] {
  const pecas: BankPiece[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      pecas.push({ kind: 'floorFull', position: tileCenter(col, row), rotationY: 0 });
    }
  }
  return pecas;
}

/**
 * Só as duas paredes que a câmera isométrica enxerga (fundo e esquerda) — as da frente tapariam a
 * sala. O vão da porta fica no meio da parede do fundo.
 */
export function wallPieces(): BankPiece[] {
  const pecas: BankPiece[] = [];
  const fundo = z(0) - TILE / 2;
  const esquerda = x(0) - TILE / 2;
  const meio = Math.floor(COLS / 2);

  for (let col = 0; col < COLS; col++) {
    const kind: BankPieceKind = col === meio + DOOR_COL ? 'wallDoorway' : col === 2 || col === COLS - 3 ? 'wallWindow' : 'wall';
    pecas.push({ kind, position: [x(col), 0, fundo], rotationY: 0 });
  }
  for (let row = 0; row < ROWS; row++) {
    const kind: BankPieceKind = row === ROWS - 3 ? 'wallWindow' : 'wall';
    pecas.push({ kind, position: [esquerda, 0, z(row)], rotationY: Q });
  }
  return pecas;
}

/** Balcão de atendimento, posto do caixa, cofre e sala de espera. */
export function furniturePieces(): BankPiece[] {
  const balcaoRow = 4;
  const caixaRow = balcaoRow - 1.3;
  const clienteRow = balcaoRow + 1.1;

  const balcao: BankPiece[] = [];
  for (let col = 3; col <= 7; col++) {
    const ponta = col === 3 || col === 7;
    balcao.push({
      kind: ponta ? 'kitchenBarEnd' : 'kitchenBar',
      position: [x(col), 0, z(balcaoRow)],
      // A ponta esquerda fecha para -x e a direita para +x.
      rotationY: col === 3 ? 2 * Q : 0,
    });
  }

  return [
    ...balcao,
    // Cliente do outro lado do balcão
    { kind: 'stoolBar', position: [x(4), 0, z(clienteRow)], rotationY: 2 * Q },
    { kind: 'stoolBar', position: [x(6), 0, z(clienteRow)], rotationY: 2 * Q },

    // Posto do caixa, atrás do balcão e virado para ele
    { kind: 'desk', position: [x(5), 0, z(caixaRow)], rotationY: 2 * Q },
    { kind: 'chairDesk', position: [x(5), 0, z(caixaRow - 0.9)], rotationY: 0 },
    { kind: 'computerScreen', position: [x(5) - 0.25, 0.52, z(caixaRow)], rotationY: 2 * Q },
    { kind: 'computerKeyboard', position: [x(5) + 0.3, 0.52, z(caixaRow + 0.15)], rotationY: 2 * Q },

    // Cofre no canto do fundo, com os malotes ao lado
    { kind: 'kitchenFridgeLarge', position: [x(9), 0, z(1)], rotationY: 0 },
    { kind: 'cardboardBoxClosed', position: [x(8), 0, z(1.4)], rotationY: 0.4 },
    { kind: 'cardboardBoxClosed', position: [x(8.1), 0.42, z(1.3)], rotationY: -0.2 },

    // Sala de espera à esquerda
    { kind: 'rugRounded', position: [x(1.6), 0, z(6)], rotationY: 0 },
    { kind: 'loungeSofa', position: [x(1.6), 0, z(5)], rotationY: 2 * Q },
    { kind: 'loungeChair', position: [x(0.3), 0, z(6.4)], rotationY: Q },
    { kind: 'tableCoffee', position: [x(1.6), 0, z(6.3)], rotationY: 0 },
    { kind: 'books', position: [x(1.6), 0.34, z(6.3)], rotationY: 0.5 },

    // Detalhes
    { kind: 'pottedPlant', position: [x(0.2), 0, z(1)], rotationY: 0 },
    { kind: 'pottedPlant', position: [x(10), 0, z(7)], rotationY: 0 },
    { kind: 'coatRackStanding', position: [x(2.8), 0, z(1)], rotationY: 0 },
    { kind: 'trashcan', position: [x(7.8), 0, z(3.2)], rotationY: 0 },
    { kind: 'lampSquareCeiling', position: [x(5), 2.6, z(4)], rotationY: 0 },
  ];
}

export interface BankLayout {
  floor: BankPiece[];
  walls: BankPiece[];
  furniture: BankPiece[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export function buildBankLayout(): BankLayout {
  return {
    floor: floorPieces(),
    walls: wallPieces(),
    furniture: furniturePieces(),
    bounds: { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 },
  };
}

/**
 * A sala fica à esquerda porque o extrato ocupa a coluna da direita: o alvo é deslocado em -x para
 * a agência não ficar atrás do painel.
 */
export const BANK_CAMERA: { position: Vec3; target: Vec3 } = {
  position: [-3.5, 10.5, 13],
  target: [-1.6, 0, 1],
};
