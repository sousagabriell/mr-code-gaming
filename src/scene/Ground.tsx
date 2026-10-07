import { useMemo } from 'react';
import { Instance, Instances, Line, RoundedBox } from '@react-three/drei';
import { COLORS } from '../world/colors';
import { LANDMARK_Z, LOT_COLUMNS, LOT_SIZE, LOT_SPACING, LOTS_START_Z, type CityLayout } from '../world/layout';

const ROAD_WIDTH = 0.8;

/** Pseudoaleatório determinístico — as árvores ficam no mesmo lugar a cada render. */
function seeded(i: number): number {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function Roads({ layout }: { layout: CityLayout }) {
  const { minX, maxX } = layout.bounds;
  const firstZ = LOTS_START_Z - LOT_SPACING / 2;
  const lastZ = firstZ + layout.rows * LOT_SPACING;

  const horizontal = Array.from({ length: layout.rows + 1 }, (_, r) => firstZ + r * LOT_SPACING);
  const vertical = Array.from(
    { length: LOT_COLUMNS + 1 },
    (_, c) => (c - (LOT_COLUMNS - 1) / 2) * LOT_SPACING - LOT_SPACING / 2
  );

  return (
    <group>
      {horizontal.map((z) => (
        <group key={`h${z}`}>
          <mesh position={[(minX + maxX) / 2, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[maxX - minX + 2, ROAD_WIDTH]} />
            <meshStandardMaterial color={COLORS.road} />
          </mesh>
          <Line
            points={[
              [minX, 0.02, z],
              [maxX, 0.02, z],
            ]}
            color={COLORS.roadLine}
            lineWidth={1.5}
            dashed
            dashSize={0.35}
            gapSize={0.3}
          />
        </group>
      ))}
      {vertical.map((x) => (
        <mesh key={`v${x}`} position={[x, 0.011, (firstZ + lastZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[ROAD_WIDTH, lastZ - firstZ]} />
          <meshStandardMaterial color={COLORS.road} />
        </mesh>
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
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
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
