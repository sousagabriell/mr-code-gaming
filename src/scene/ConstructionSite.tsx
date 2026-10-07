import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { ConstructionSitePlot } from '../world/layout';
import { COLORS } from '../world/colors';
import { useCityStore } from '../store/cityStore';

const STATUS_COLOR: Partial<Record<string, string>> = {
  Planejamento: COLORS.neutral,
  EmAndamento: COLORS.brandBlue,
  Pausado: COLORS.warning,
};

export function ConstructionSite({ plot }: { plot: ConstructionSitePlot }) {
  const craneRef = useRef<Group>(null);
  const select = useCityStore((s) => s.select);
  const color = STATUS_COLOR[plot.projeto.status] ?? COLORS.neutral;
  const [x, , z] = plot.position;
  const active = plot.projeto.status === 'EmAndamento';
  const scaffoldHeight = 0.15 + plot.progress * 0.7;

  useFrame((_, delta) => {
    if (craneRef.current && active) craneRef.current.rotation.y += delta * 0.6;
  });

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'projeto', id: plot.projeto.idProjeto }, [x, 0.6, z]);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.04, 0.8]} />
        <meshStandardMaterial color={color} wireframe />
      </mesh>

      {plot.projeto.status !== 'Planejamento' && (
        <mesh position={[0, scaffoldHeight / 2, 0]}>
          <boxGeometry args={[0.7, scaffoldHeight, 0.7]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} wireframe />
        </mesh>
      )}

      {active && (
        <group ref={craneRef} position={[0, scaffoldHeight + 0.1, 0]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
            <meshStandardMaterial color={COLORS.warning} emissive={COLORS.warning} emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0.3, 0.5, 0]}>
            <boxGeometry args={[0.6, 0.03, 0.03]} />
            <meshStandardMaterial color={COLORS.warning} emissive={COLORS.warning} emissiveIntensity={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}
