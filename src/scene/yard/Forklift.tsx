import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { Vector3, type Group } from 'three';
import { COLORS } from '../../world/colors';
import type { Vec3 } from '../../world/layout';
import { SceneTag } from '../SceneTag';
import { VehicleModel } from '../vehicles/VehicleModel';
import { motion } from '../motion';

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
    if (!placed.current || motion.reduced) {
      g.position.copy(tmp); // nasce já ao lado da caixa (ou teletransporta, com movimento reduzido)
      placed.current = true;
    }
    const dist = g.position.distanceTo(tmp);
    // A pá fica em -z local: anda com ela à frente e estaciona apontando para a caixa (-z do mundo).
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
      {/* Trator com pá da Kenney (aponta para +z); girado para a frente ficar em -z, como a lógica de estacionar espera. */}
      <Suspense fallback={null}>
        <VehicleModel kind="tractor-shovel" length={0.9} rotationY={Math.PI} />
      </Suspense>
      <SceneTag visible={showTag} position={[0, 0.85, 0]} code={nome.split(' ')[0]} accent={COLORS.warning} />
    </group>
  );
}
