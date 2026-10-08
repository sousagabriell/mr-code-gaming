import type { CityBounds, Vec3 } from './layout';
import { seeded, seededRange } from './seeded';

/**
 * Campo em volta da cidade: o que preenche o chão branco fora da grade de ruas. Módulo puro — o
 * espalhamento é determinístico (`seeded`), então o bosque nasce igual a cada render e entre sessões.
 */

/** Folga entre a borda da cidade e onde o campo começa a ser povoado. */
export const FIELD_MARGIN = 2.6;
/** Até onde vale povoar: a névoa começa em 38 e a câmera não se afasta além de 48. */
export const FIELD_REACH = 38;
/** Plataforma clara sob a cidade, para o miolo não virar grama. */
export const PLATFORM_MARGIN = 1.2;

export interface Scatter {
  position: Vec3;
  rotationY: number;
  scale: number;
}

export interface OutskirtsPlan {
  pines: Scatter[];
  bushes: Scatter[];
}

function platformOf(b: CityBounds) {
  return {
    minX: b.minX - PLATFORM_MARGIN,
    maxX: b.maxX + PLATFORM_MARGIN,
    minZ: b.minZ - PLATFORM_MARGIN,
    maxZ: b.maxZ + PLATFORM_MARGIN,
  };
}

/** Retângulo claro sob a cidade — o que separa o miolo urbano do campo. */
export function cityPlatform(b: CityBounds): { center: Vec3; width: number; depth: number } {
  const p = platformOf(b);
  return {
    center: [(p.minX + p.maxX) / 2, 0, (p.minZ + p.maxZ) / 2],
    width: p.maxX - p.minX,
    depth: p.maxZ - p.minZ,
  };
}

/** Distância mínima entre duas plantas: encostadas, as copas viram uma massa embolada. */
export const MIN_SPACING = 1.6;

/** Dentro da área urbana (plataforma + folga)? Nada de campo cresce aí. */
export function insideCity(b: CityBounds, x: number, z: number, pad = FIELD_MARGIN): boolean {
  const p = platformOf(b);
  return x > p.minX - pad && x < p.maxX + pad && z > p.minZ - pad && z < p.maxZ + pad;
}

/**
 * Sorteia posições num anel em volta da cidade. O índice entra no gerador, então acrescentar um
 * cliente (que muda `bounds`) só reposiciona o que precisava sair de dentro da cidade.
 */
function ring(
  b: CityBounds,
  count: number,
  offset: number,
  scaleMin: number,
  scaleMax: number,
  taken: Scatter[]
): Scatter[] {
  const out: Scatter[] = [];
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  for (let i = 0; i < count * 6 && out.length < count; i++) {
    const s = offset + i * 7;
    const x = cx + seededRange(s, -FIELD_REACH, FIELD_REACH);
    const z = cz + seededRange(s + 1, -FIELD_REACH, FIELD_REACH);
    if (insideCity(b, x, z)) continue;
    if (taken.some((t) => Math.hypot(t.position[0] - x, t.position[2] - z) < MIN_SPACING)) continue;
    const planta: Scatter = {
      position: [x, 0, z],
      rotationY: seeded(s + 2) * Math.PI * 2,
      scale: seededRange(s + 3, scaleMin, scaleMax),
    };
    out.push(planta);
    taken.push(planta);
  }
  return out;
}

/**
 * Só vegetação: o kit também traz blocos de relevo, mas isolados num plano liso eles viram lajes
 * verdes angulares em vez de morro — não combinam com a maquete.
 */
export function outskirtsPlan(b: CityBounds): OutskirtsPlan {
  // Lista compartilhada: o arbusto também não pode nascer dentro de um pinheiro.
  const taken: Scatter[] = [];
  return {
    pines: ring(b, 120, 0, 0.7, 1.25, taken),
    bushes: ring(b, 90, 5000, 0.5, 0.95, taken),
  };
}
