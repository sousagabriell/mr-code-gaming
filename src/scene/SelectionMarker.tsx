import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Group } from 'three';
import { COLORS } from '../world/colors';
import type { Vec3 } from '../world/layout';

/** Colchetes de canto no chão ao redor da seleção ("In 2 · Booked" da referência). */
export function SelectionMarker({ position, size }: { position: Vec3; size: number }) {
  const ref = useRef<Group>(null);
  const h = size / 2;
  const arm = size * 0.22;

  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.035);
  });

  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  return (
    <group ref={ref} position={[position[0], 0.07, position[2]]}>
      {corners.map(([sx, sz]) => (
        <Line
          key={`${sx}${sz}`}
          points={[
            [sx * h, 0, sz * (h - arm)],
            [sx * h, 0, sz * h],
            [sx * (h - arm), 0, sz * h],
          ]}
          color={COLORS.brandBlue}
          lineWidth={3}
        />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={COLORS.brandBlue} transparent opacity={0.07} depthWrite={false} />
      </mesh>
    </group>
  );
}
