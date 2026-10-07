import type { KanbanAtividadeDTO, KanbanColunaDTO } from '../types/domain';
import type { Vec3 } from './layout';

/**
 * Pátio de obras de um projeto: cada coluna do Kanban é uma zona pintada no chão,
 * cada atividade é uma caixa num palete. Funções puras — testadas em yard.test.ts.
 */
export const ZONE_W = 3.2;
export const ZONE_D = 4.4;
export const ZONE_GAP = 0.8;
export const SLOT_COLS = 3;
export const SLOT_ROWS = 4;
export const SLOT_GAP = 0.95;
export const CRATE_SIZE = 0.62;
/** Altura de um palete + caixa, para empilhar quando a zona lota. */
export const STACK_H = 0.72;

export interface YardZone {
  coluna: KanbanColunaDTO;
  index: number;
  center: Vec3;
}

export interface YardCrate {
  atividade: KanbanAtividadeDTO;
  coluna: KanbanColunaDTO;
  zoneIndex: number;
  slot: number;
  position: Vec3;
}

export interface YardLayout {
  zones: YardZone[];
  crates: YardCrate[];
  width: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const FIRST_ROW_Z = -ZONE_D / 2 + 0.75;

export function zoneCenterX(index: number, count: number): number {
  return (index - (count - 1) / 2) * (ZONE_W + ZONE_GAP);
}

/** Posição da k-ésima caixa dentro da zona: 3 colunas × 4 filas, depois empilha. */
export function slotPosition(zoneCenter: Vec3, slot: number): Vec3 {
  const perLevel = SLOT_COLS * SLOT_ROWS;
  const level = Math.floor(slot / perLevel);
  const k = slot % perLevel;
  const col = k % SLOT_COLS;
  const row = Math.floor(k / SLOT_COLS);
  return [zoneCenter[0] + (col - (SLOT_COLS - 1) / 2) * SLOT_GAP, level * STACK_H, FIRST_ROW_Z + row * SLOT_GAP];
}

export function buildYardLayout(colunas: KanbanColunaDTO[]): YardLayout {
  const ordered = [...colunas].sort((a, b) => a.ordem - b.ordem);
  const zones: YardZone[] = ordered.map((coluna, index) => ({
    coluna,
    index,
    center: [zoneCenterX(index, ordered.length), 0, 0],
  }));

  const crates: YardCrate[] = zones.flatMap((zone) =>
    [...zone.coluna.atividades]
      .sort((a, b) => a.ordem - b.ordem)
      .map((atividade, slot) => ({
        atividade,
        coluna: zone.coluna,
        zoneIndex: zone.index,
        slot,
        position: slotPosition(zone.center, slot),
      }))
  );

  const width = Math.max(1, ordered.length) * (ZONE_W + ZONE_GAP) - ZONE_GAP;
  return {
    zones,
    crates,
    width,
    bounds: { minX: -width / 2 - 2, maxX: width / 2 + 2, minZ: -ZONE_D / 2 - 3, maxZ: ZONE_D / 2 + 3 },
  };
}

/** Zona sob um ponto do chão (com tolerância até a metade do vão entre zonas). */
export function zoneAt(layout: YardLayout, x: number, z: number): YardZone | null {
  if (Math.abs(z) > ZONE_D / 2 + 1) return null;
  const half = (ZONE_W + ZONE_GAP) / 2;
  return layout.zones.find((zone) => Math.abs(x - zone.center[0]) <= half) ?? null;
}

/**
 * Índice de destino (novaOrdem) ao soltar uma caixa num ponto da zona.
 * `count` é o número de caixas que ficarão na zona SEM a que está sendo movida.
 */
export function dropIndex(zone: YardZone, x: number, z: number, count: number): number {
  const col = Math.round((x - zone.center[0]) / SLOT_GAP + (SLOT_COLS - 1) / 2);
  const row = Math.round((z - FIRST_ROW_Z) / SLOT_GAP);
  const k = Math.min(Math.max(row, 0), SLOT_ROWS - 1) * SLOT_COLS + Math.min(Math.max(col, 0), SLOT_COLS - 1);
  return Math.min(Math.max(k, 0), count);
}

/** Mira um pouco à frente do pátio para ele ficar acima dos painéis inferiores da HUD. */
export const YARD_CAMERA = (width: number): { position: Vec3; target: Vec3 } => ({
  position: [width * 0.12, 11 + width * 0.42, 15 + width * 0.55],
  target: [0, 0, 1.8],
});
