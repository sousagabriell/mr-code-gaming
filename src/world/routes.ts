import { AVENUE_Z, frontRoadZ, LANDMARK_Z, LANE_OFFSET, nearestVerticalRoadX, type Vec3 } from './layout';

/** Caminho poligonal no chão (y = 0). Veículos e pedestres seguem estas rotas pelas ruas. */
export type Path = Vec3[];

export function pathLength(path: Path): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]);
  return total;
}

/** Ponto e direção (ângulo em y) a uma distância `d` do início do caminho. */
export function pointAt(path: Path, d: number): { position: Vec3; heading: number } {
  let rest = Math.max(0, d);
  for (let i = 1; i < path.length; i++) {
    const [ax, , az] = path[i - 1];
    const [bx, , bz] = path[i];
    const seg = Math.hypot(bx - ax, bz - az);
    const heading = Math.atan2(bx - ax, bz - az);
    if (rest <= seg || i === path.length - 1) {
      const t = seg === 0 ? 1 : Math.min(1, rest / seg);
      return { position: [ax + (bx - ax) * t, 0, az + (bz - az) * t], heading };
    }
    rest -= seg;
  }
  const last = path[path.length - 1] ?? [0, 0, 0];
  return { position: last, heading: 0 };
}

/** Carro-forte: da rua em frente ao cliente até a porta do Banco Central, sempre pelas ruas. */
export function armoredRoute(lotCenter: Vec3, bank: Vec3): Path {
  const roadZ = frontRoadZ(lotCenter[2]) + LANE_OFFSET;
  const vx = nearestVerticalRoadX(lotCenter[0]) + LANE_OFFSET;
  return [
    [lotCenter[0], 0, roadZ],
    [vx, 0, roadZ],
    [vx, 0, AVENUE_Z - LANE_OFFSET],
    [bank[0], 0, AVENUE_Z - LANE_OFFSET],
    [bank[0], 0, LANDMARK_Z + 1.3],
  ];
}

const SIDEWALK = 0.55;

/** Colaborador: da praça cívica até o canteiro do projeto, pelas calçadas. */
export function walkerRoute(plaza: Vec3, site: Vec3): Path {
  const vx = nearestVerticalRoadX(site[0]) + SIDEWALK;
  const sidewalkZ = AVENUE_Z - SIDEWALK;
  return [
    plaza,
    [plaza[0], 0, sidewalkZ],
    [vx, 0, sidewalkZ],
    [vx, 0, site[2] + 0.7],
    [site[0], 0, site[2] + 0.7],
  ];
}
