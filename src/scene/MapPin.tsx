import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Vec3 } from '../world/layout';
import { motion } from './motion';

/** Pin de mapa flutuante — marca entidades que pedem atenção (chamado Alta, fatura atrasada). */
export function MapPin({ position, color, scale = 1 }: { position: Vec3; color: string; scale?: number }) {
  const ref = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (motion.reduced) return;
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2.4) * 0.06;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.17, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.42, 0.13]}>
        <sphereGeometry args={[0.065, 12, 10]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.19, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.13, 0.32, 20]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </group>
  );
}
