import { useMemo } from 'react';
import { Instance, Instances, Line, RoundedBox } from '@react-three/drei';
import { COLORS } from '../world/colors';
import { LANDMARK_Z, LOT_SIZE, LOT_SPACING, LOTS_START_Z, verticalRoadXs, type CityLayout } from '../world/layout';
import { cityPlatform } from '../world/outskirts';
import { roadModel, type RoadTile } from './assets';
import { useKenneyParts } from './kenney';

/**
 * Ruas montadas com os ladrilhos 1×1 da Kenney. O quarteirão (`LOT_SPACING`) é dividido num número inteiro
 * de ladrilhos para que as retas encostem exatamente nos cruzamentos — daí a largura da pista sair do passo.
 */
const TILES_PER_BLOCK = 6;
const TILE = LOT_SPACING / TILES_PER_BLOCK;
/** Acima do chão (y = 0) e abaixo dos lotes: evita z-fighting com o plano do terreno. */
const ROAD_Y = 0.006;

const QUARTER = Math.PI / 2;

interface RoadTilePlot {
  position: [number, number, number];
  rotationY: number;
}

/** Pseudoaleatório determinístico — as árvores ficam no mesmo lugar a cada render. */
function seeded(i: number): number {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Peça e giro de um cruzamento a partir das saídas (oeste/leste/norte/sul = -x/+x/-z/+z).
 * Base dos modelos: cruz completa, T com a perna em +z, curva ligando -x a +z.
 */
function junctionFor(w: boolean, e: boolean, n: boolean, s: boolean): { tile: RoadTile; rotationY: number } {
  if (w && e && n && s) return { tile: 'road-crossroad', rotationY: 0 };
  if (w && e && s) return { tile: 'road-intersection', rotationY: 0 };
  if (n && s && e) return { tile: 'road-intersection', rotationY: QUARTER };
  if (w && e && n) return { tile: 'road-intersection', rotationY: 2 * QUARTER };
  if (n && s && w) return { tile: 'road-intersection', rotationY: -QUARTER };
  if (w && s) return { tile: 'road-bend', rotationY: 0 };
  if (e && s) return { tile: 'road-bend', rotationY: QUARTER };
  if (e && n) return { tile: 'road-bend', rotationY: 2 * QUARTER };
  return { tile: 'road-bend', rotationY: -QUARTER };
}

/** Malha de ruas da cidade agrupada por peça (uma `InstancedMesh` por tipo de ladrilho). */
function roadTilePlots(rows: number): Record<RoadTile, RoadTilePlot[]> {
  const xs = verticalRoadXs();
  const firstZ = LOTS_START_Z - LOT_SPACING / 2;
  const zs = Array.from({ length: rows + 1 }, (_, r) => firstZ + r * LOT_SPACING);
  const plots: Record<RoadTile, RoadTilePlot[]> = {
    'road-straight': [],
    'road-crossroad': [],
    'road-intersection': [],
    'road-bend': [],
  };

  // Retas: os ladrilhos das pontas de cada quarteirão são os cruzamentos, por isso k vai de 1 a TILES_PER_BLOCK-1.
  for (const z of zs) {
    for (let c = 0; c < xs.length - 1; c++) {
      for (let k = 1; k < TILES_PER_BLOCK; k++) {
        plots['road-straight'].push({ position: [xs[c] + k * TILE, ROAD_Y, z], rotationY: 0 });
      }
    }
  }
  for (const x of xs) {
    for (let r = 0; r < zs.length - 1; r++) {
      for (let k = 1; k < TILES_PER_BLOCK; k++) {
        plots['road-straight'].push({ position: [x, ROAD_Y, zs[r] + k * TILE], rotationY: QUARTER });
      }
    }
  }

  for (let c = 0; c < xs.length; c++) {
    for (let r = 0; r < zs.length; r++) {
      const { tile, rotationY } = junctionFor(c > 0, c < xs.length - 1, r > 0, r < zs.length - 1);
      plots[tile].push({ position: [xs[c], ROAD_Y, zs[r]], rotationY });
    }
  }

  return plots;
}

function RoadLayer({ tile, plots }: { tile: RoadTile; plots: RoadTilePlot[] }) {
  // Os ladrilhos de rua têm malha única: a primeira peça é tudo.
  const { geometry, material } = useKenneyParts(roadModel(tile))[0];
  if (plots.length === 0) return null;
  return (
    <Instances limit={plots.length} geometry={geometry} material={material} receiveShadow>
      {plots.map((p, i) => (
        <Instance key={i} position={p.position} rotation={[0, p.rotationY, 0]} scale={TILE} />
      ))}
    </Instances>
  );
}

function Roads({ layout }: { layout: CityLayout }) {
  const plots = useMemo(() => roadTilePlots(layout.rows), [layout.rows]);
  return (
    <group>
      {Object.entries(plots).map(([tile, list]) => (
        <RoadLayer key={tile} tile={tile as RoadTile} plots={list} />
      ))}
    </group>
  );
}

function Trees({ layout }: { layout: CityLayout }) {
  const positions = useMemo(() => {
    const list: [number, number, number][] = [];
    const { minX, maxX, maxZ } = layout.bounds;
    // Bordas laterais da cidade
    for (let z = LANDMARK_Z - 1, i = 0; z <= maxZ; z += 2.2, i++) {
      list.push([minX - 1.4 - seeded(i) * 0.8, 0, z + seeded(i + 50) * 0.6]);
      list.push([maxX + 1.4 + seeded(i + 100) * 0.8, 0, z + seeded(i + 150) * 0.6]);
    }
    // Praça cívica entre os landmarks
    [-5, 0, 5].forEach((x, i) => {
      list.push([x - 0.5, 0, LANDMARK_Z + 0.2 + seeded(i) * 0.3]);
      list.push([x + 0.5, 0, LANDMARK_Z - 0.4 + seeded(i + 9) * 0.3]);
    });
    return list;
  }, [layout.bounds]);

  return (
    <group>
      <Instances limit={200} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.4, 6]} />
        <meshStandardMaterial color={COLORS.trunk} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0], 0.2, p[2]]} />
        ))}
      </Instances>
      <Instances limit={200} castShadow>
        <sphereGeometry args={[0.38, 14, 12]} />
        <meshStandardMaterial color={COLORS.tree} roughness={0.8} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0], 0.62 + seeded(i) * 0.12, p[2]]} scale={0.85 + seeded(i + 3) * 0.35} />
        ))}
      </Instances>
    </group>
  );
}

export function Ground({ layout, buildMode }: { layout: CityLayout; buildMode: boolean }) {
  const platform = useMemo(() => cityPlatform(layout.bounds), [layout.bounds]);

  return (
    <group>
      {/* O chão virou campo; a cidade fica num tapete claro por cima, logo abaixo das ruas (ROAD_Y). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={COLORS.field} />
      </mesh>
      <mesh position={[platform.center[0], 0.004, platform.center[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[platform.width, platform.depth]} />
        <meshStandardMaterial color={COLORS.ground} />
      </mesh>

      {/* Praça cívica dos landmarks */}
      <RoundedBox args={[19.5, 0.04, 3.6]} radius={0.02} position={[0, 0.02, LANDMARK_Z]} receiveShadow>
        <meshStandardMaterial color={COLORS.plaza} />
      </RoundedBox>

      <Roads layout={layout} />

      {layout.clientPlots.map((plot) => (
        <RoundedBox
          key={plot.cliente.idCliente}
          args={[LOT_SIZE, 0.05, LOT_SIZE]}
          radius={0.02}
          position={[plot.lotCenter[0], 0.025, plot.lotCenter[2]]}
          receiveShadow
        >
          <meshStandardMaterial color={COLORS.lot} />
        </RoundedBox>
      ))}

      {buildMode && (
        <Line
          points={[
            [-LOT_SIZE / 2, 0, -LOT_SIZE / 2],
            [LOT_SIZE / 2, 0, -LOT_SIZE / 2],
            [LOT_SIZE / 2, 0, LOT_SIZE / 2],
            [-LOT_SIZE / 2, 0, LOT_SIZE / 2],
            [-LOT_SIZE / 2, 0, -LOT_SIZE / 2],
          ]}
          position={[layout.nextLot[0], 0.03, layout.nextLot[2]]}
          color={COLORS.brandBlue}
          lineWidth={2}
          dashed
          dashSize={0.25}
          gapSize={0.18}
        />
      )}

      <Trees layout={layout} />
    </group>
  );
}
