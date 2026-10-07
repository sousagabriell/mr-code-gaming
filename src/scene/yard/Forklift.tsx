import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { Vector3, type Group } from 'three';
import { COLORS } from '../../world/colors';
import type { Vec3 } from '../../world/layout';
import { SceneTag } from '../SceneTag';

const tmp = new Vector3();

/**
 * Empilhadeira de um colaborador. Dirige até a caixa da atividade em que ele está trabalhando —
 * quando a caixa muda de zona, a empilhadeira vai atrás.
 */
export function Forklift({ target, nome, showTag }: { target: Vec3; nome: string; showTag: boolean }) {
  const ref = useRef<Group>(null);
  const placed = useRef(false);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    tmp.set(target[0], 0, target[2]);
    if (!placed.current) {
      g.position.copy(tmp); // nasce já ao lado da caixa
      placed.current = true;
    }
    const dist = g.position.distanceTo(tmp);
    // Os garfos ficam em -z local: anda com eles à frente e estaciona apontando para a caixa (-z do mundo).
    if (dist > 0.05) {
      const angle = Math.atan2(tmp.x - g.position.x, tmp.z - g.position.z) + Math.PI;
      easing.dampAngle(g.rotation, 'y', angle, 0.15, delta);
    } else {
      easing.dampAngle(g.rotation, 'y', 0, 0.3, delta);
    }
    easing.damp3(g.position, tmp, 0.45, delta, 3);
  });

  return (
    <group ref={ref}>
      {/* Chassi */}
      <mesh position={[0, 0.17, 0]} castShadow>
        <boxGeometry args={[0.36, 0.2, 0.5]} />
        <meshStandardMaterial color={COLORS.warning} roughness={0.5} />
      </mesh>
      {/* Cabine */}
      <mesh position={[0, 0.38, 0.08]} castShadow>
        <boxGeometry args={[0.3, 0.24, 0.24]} />
        <meshStandardMaterial color="#1f2937" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0.51, 0.08]}>
        <boxGeometry args={[0.34, 0.03, 0.3]} />
        <meshStandardMaterial color={COLORS.warning} />
      </mesh>
      {/* Mastro e garfos (na frente = -z local) */}
      <mesh position={[0, 0.36, -0.27]} castShadow>
        <boxGeometry args={[0.28, 0.6, 0.04]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.08, -0.42]}>
          <boxGeometry args={[0.05, 0.02, 0.3]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}
      {/* Rodas */}
      {[-0.17, 0.17].flatMap((x) =>
        [-0.15, 0.17].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.07, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 12]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        ))
      )}
      <SceneTag visible={showTag} position={[0, 0.85, 0]} code={nome.split(' ')[0]} accent={COLORS.warning} />
    </group>
  );
}
