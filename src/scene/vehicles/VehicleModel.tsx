import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { Vector3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { COLORS } from '../../world/colors';
import { carModel, type CarModel } from '../assets';
import { findNodes, HIGHLIGHT, useKenneyModel } from '../kenney';
import { motion } from '../motion';

const tmp = new Vector3();

/**
 * Veículo da Kenney. Por padrão fica de frente para +x (rotationY = π/2: os modelos apontam para +z).
 * As rodas giram conforme a velocidade real do objeto na cena; `doorOpen` abre a porta traseira do baú
 * (descarregando); `beacon` liga um giroflex de urgência no teto.
 */
export function VehicleModel({
  kind,
  length = 1.15,
  rotationY = Math.PI / 2,
  tint,
  doorOpen = false,
  beacon = false,
  highlight = false,
}: {
  kind: CarModel;
  length?: number;
  rotationY?: number;
  tint?: string;
  doorOpen?: boolean;
  beacon?: boolean;
  highlight?: boolean;
}) {
  const { root, model, size } = useKenneyModel(carModel(kind), {
    size: length,
    rotationY,
    tint,
    highlight: highlight ? HIGHLIGHT : 0,
  });
  // Peças animadas (rodas, porta) num ref: são mutadas a cada frame.
  const parts = useRef<{ wheels: Object3D[]; door?: Object3D }>({ wheels: [] });
  useLayoutEffect(() => {
    parts.current = { wheels: findNodes(model, 'wheel'), door: findNodes(model, 'door')[0] };
  }, [model]);
  const last = useRef<Vector3 | null>(null);
  const beaconRef = useRef<Mesh>(null);
  // Raio da roda em unidades da cena (0,3 no modelo original de ~3 de comprimento).
  const wheelRadius = (0.3 * length) / 3;

  useFrame(({ clock }, delta) => {
    root.getWorldPosition(tmp);
    if (last.current && delta > 0 && !motion.reduced) {
      const speed = tmp.distanceTo(last.current) / delta;
      if (speed > 0.02) for (const w of parts.current.wheels) w.rotateX((speed * delta) / wheelRadius);
    }
    (last.current ??= new Vector3()).copy(tmp);

    const door = parts.current.door;
    if (door) {
      const target = doorOpen ? 1.35 : 0;
      if (motion.reduced) door.rotation.x = target;
      else easing.damp(door.rotation, 'x', target, 0.4, delta);
    }
    if (beaconRef.current) {
      const m = beaconRef.current.material as MeshStandardMaterial;
      // Giroflex pisca; com movimento reduzido fica aceso fixo (evita flashes).
      m.emissiveIntensity = motion.reduced ? 1.2 : Math.sin(clock.elapsedTime * 10) > 0 ? 2.2 : 0.2;
    }
  });

  return (
    <group>
      <primitive object={root} />
      {beacon && (
        <mesh ref={beaconRef} position={[length * 0.3, size.y + 0.03, 0]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color={COLORS.danger} emissive={COLORS.danger} emissiveIntensity={1} />
        </mesh>
      )}
    </group>
  );
}
