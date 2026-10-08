/**
 * Pseudoaleatório determinístico em [0, 1). Mesma entrada, mesma saída — árvores, arbustos e relevo
 * ficam no mesmo lugar a cada render e entre sessões, sem precisar guardar nada.
 */
export function seeded(i: number): number {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Valor determinístico dentro de uma faixa. */
export function seededRange(i: number, min: number, max: number): number {
  return min + seeded(i) * (max - min);
}
