import {
  backZ,
  baseboardSlabs as baseboardSlabsDa,
  colX,
  floorTiles,
  interiorCamera,
  roomBounds,
  roomDepth,
  roomWidth,
  rowZ,
  tileCenter as tileCenterDa,
  wallSlabs as wallSlabsDa,
  type InteriorBounds,
  type Sala,
  type Slab,
} from './interior';
import type { Vec3 } from './layout';
import type { Path } from './routes';

/**
 * Agência do Banco Central: o cenário que se abre no "ver conta bancária", no mesmo padrão do pátio
 * de obras (`yard.ts`) — medidas e peças puras aqui, renderização em `scene/bank/`.
 *
 * A casca da sala (ladrilhos, paredes, rodapé, câmera) vem de `interior.ts`, compartilhada com a
 * biblioteca da Universidade. O que é só da agência fica aqui: o balcão, o cofre e o malote.
 *
 * O kit de móveis da Kenney não tem balcão de banco nem cofre: o balcão é uma fila de `kitchenBar`
 * e o cofre é a geladeira grande pintada de aço. Ver MANUAL-TECNICO §9.9.
 *
 * **Toda posição aqui é o centro da peça**, apoiada no chão. Os GLB do kit têm a origem num canto
 * (o ladrilho vai de 0 a 1 em x e de -1 a 0 em z); quem recentra é o `FurnitureLayers`, para que
 * estas medidas possam ser lidas como uma planta baixa.
 */

export { BASEBOARD_H, TILE, WALL_H, WALL_T } from './interior';

export const COLS = 7;
export const ROWS = 4;
const SALA: Sala = { cols: COLS, rows: ROWS };

export const ROOM_W = roomWidth(SALA);
export const ROOM_D = roomDepth(SALA);
export const BANK_BOUNDS = roomBounds(SALA);

/** Mantido como nome local da agência: é a mesma laje lisa de `interior.ts`. */
export type BankWall = Slab;

export type BankPieceKind =
  | 'floorFull'
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
  /** Centro da peça, apoiada no chão. */
  position: Vec3;
  rotationY: number;
}

const Q = Math.PI / 2;

/** Centro do ladrilho (col, row), com a origem no meio da sala. */
export const tileCenter = (col: number, row: number): Vec3 => tileCenterDa(SALA, col, row);

/** Coordenadas contínuas na mesma régua dos ladrilhos — aceitam meio ladrilho. */
const x = (col: number) => colX(SALA, col);
const z = (row: number) => rowZ(SALA, row);

/** Linha da parede do fundo — o calendário e a porta se penduram nela. */
const FUNDO_Z = backZ(SALA);

export const floorPieces = () => floorTiles(SALA) as BankPiece[];
export const wallSlabs = () => wallSlabsDa(SALA);
export const baseboardSlabs = () => baseboardSlabsDa(SALA);

/**
 * Balcão de atendimento, posto do caixa, cofre e sala de espera.
 *
 * O que importa fica na **metade esquerda**: o extrato cobre a direita da tela, e é de lá que a
 * câmera olha. A sala de espera vai para a direita de propósito — é cenário de fundo.
 */
export function furniturePieces(): BankPiece[] {
  /** O balcão corre no eixo x; o cliente fica adiante (+z) e o caixa atrás (−z). */
  const BALCAO_Z = z(2.4);
  const CAIXA_Z = BALCAO_Z - 1.05;
  const CLIENTE_Z = BALCAO_Z + 0.65;

  // Larguras reais do kit: o passo é a própria largura do módulo, senão fica um vão entre eles.
  const MODULO = 0.43;
  const PONTA = 0.1;
  const MODULOS = 5;
  const inicio = x(1);

  const balcao: BankPiece[] = [];
  for (let i = 0; i < MODULOS; i++) balcao.push({ kind: 'kitchenBar', position: [inicio + i * MODULO, 0, BALCAO_Z], rotationY: 0 });
  // As pontas encostam a meia largura de cada peça do primeiro e do último módulo.
  const meiaPonta = (MODULO + PONTA) / 2;
  balcao.push({ kind: 'kitchenBarEnd', position: [inicio - meiaPonta, 0, BALCAO_Z], rotationY: 0 });
  balcao.push({ kind: 'kitchenBarEnd', position: [inicio + (MODULOS - 1) * MODULO + meiaPonta, 0, BALCAO_Z], rotationY: 2 * Q });

  return [
    ...balcao,
    // Clientes do lado de fora do balcão
    { kind: 'stoolBar', position: [x(1.2), 0, CLIENTE_Z], rotationY: 2 * Q },
    { kind: 'stoolBar', position: [x(2.1), 0, CLIENTE_Z], rotationY: 2 * Q },

    // Posto do caixa: mesa virada para o balcão, cadeira atrás dela
    { kind: 'desk', position: [x(1.6), 0, CAIXA_Z], rotationY: 2 * Q },
    { kind: 'chairDesk', position: [x(1.6), 0, CAIXA_Z - 0.55], rotationY: 0 },
    { kind: 'computerScreen', position: [x(1.45), 0.38, CAIXA_Z - 0.08], rotationY: 2 * Q },
    { kind: 'computerKeyboard', position: [x(1.8), 0.38, CAIXA_Z + 0.08], rotationY: 2 * Q },

    // Cofre encostado na parede do fundo, com os malotes ao lado
    { kind: 'kitchenFridgeLarge', position: [x(0.4), 0, z(0.3)], rotationY: 0 },
    { kind: 'cardboardBoxClosed', position: [x(1.2), 0, z(0.35)], rotationY: 0.4 },
    { kind: 'cardboardBoxClosed', position: [x(1.25), 0.28, z(0.3)], rotationY: -0.2 },

    // Sala de espera: encostada no balcão, não na borda — assim cabe no enquadramento
    { kind: 'rugRounded', position: [x(4.1), 0, z(3)], rotationY: 0 },
    { kind: 'loungeSofa', position: [x(4.1), 0, z(2.4)], rotationY: 2 * Q },
    { kind: 'loungeChair', position: [x(3.2), 0, z(3.2)], rotationY: Q },
    { kind: 'tableCoffee', position: [x(4.1), 0, z(3.2)], rotationY: 0 },
    { kind: 'books', position: [x(4.1), 0.23, z(3.2)], rotationY: 0.5 },

    // Detalhes
    { kind: 'pottedPlant', position: [x(0.3), 0, z(3.2)], rotationY: 0 },
    { kind: 'pottedPlant', position: [x(6.2), 0, z(0.4)], rotationY: 0 },
    // Ao lado da porta, sem invadir o vão.
    { kind: 'coatRackStanding', position: [x(4), 0, z(0.4)], rotationY: 0 },
    { kind: 'trashcan', position: [x(0.4), 0, z(2)], rotationY: 0 },
  ];
}

// ─── Pontos notáveis (animações e objetos de parede) ────────────────────────

/** Onde o cofre está, e onde o malote desaparece dentro dele. */
export const COFRE: Vec3 = [x(0.4), 0, z(0.3)];
/** A porta é o canto direito da parede do fundo — por onde o malote entra e sai. */
export const PORTA: Vec3 = [x(5), 0, FUNDO_Z];
/** Ponto de parada no balcão, do lado de dentro. */
export const BALCAO: Vec3 = [x(2), 0, z(2.4) - 0.45];
/** Tela do caixa — onde o "lançamento salvo" pisca. */
export const CAIXA_TELA: Vec3 = [x(1.45), 0.62, z(2.4) - 1.13];

const ALTURA_MALOTE = 0.35;
const naAltura = ([px, , pz]: Vec3): Vec3 => [px, ALTURA_MALOTE, pz];

/**
 * Caminho do malote: porta → balcão → cofre. É um `Path` de `world/routes.ts`, então `pathLength` e
 * `pointAt` servem sem adaptação — os mesmos que movem o carro-forte na cidade.
 */
export const MALOTE_ENTRA: Path = [naAltura(PORTA), naAltura(BALCAO), naAltura(COFRE)];
/** O contrário: do cofre para a rua. */
export const MALOTE_SAI: Path = [...MALOTE_ENTRA].reverse();

/**
 * Calendário pendurado na parede do fundo, na área livre entre o cofre e a porta. `y` acima do
 * balcão para nenhum móvel passar na frente.
 */
export const CALENDAR_ANCHOR: Vec3 = [x(2.2), 1.2, FUNDO_Z + 0.02];
export const CALENDAR_SIZE: [number, number] = [2.1, 1.35];

export interface BankLayout {
  floor: BankPiece[];
  walls: BankWall[];
  baseboards: BankWall[];
  furniture: BankPiece[];
  bounds: InteriorBounds;
}

export function buildBankLayout(): BankLayout {
  return {
    floor: floorPieces(),
    walls: wallSlabs(),
    baseboards: baseboardSlabs(),
    furniture: furniturePieces(),
    bounds: roomBounds(SALA),
  };
}

/**
 * O alvo fica à **direita** do centro da sala porque o extrato cobre ~44% da direita da tela: mirar
 * no meio do viewport jogaria a agência para trás do painel. Com o alvo deslocado, a sala sobe para
 * a metade visível. E fica **acima do chão** para a parede do fundo entrar no quadro em vez de só
 * o piso.
 */
const BANK_TARGET: Vec3 = [1.1, 0.55, -0.3];
/** Só a direção importa (o ângulo da vista); o comprimento vem de `BANK_DISTANCE`. */
const BANK_DIR: Vec3 = [2, 5.2, 6.2];
/**
 * Distância da câmera ao alvo. Perto o bastante para a sala preencher a metade visível, longe o
 * bastante para a parede do fundo trabalhar como fundo de cena. O `minDistance` do controle é 6.
 */
export const BANK_DISTANCE = 8.2;

export const BANK_CAMERA = interiorCamera(BANK_TARGET, BANK_DIR, BANK_DISTANCE);
