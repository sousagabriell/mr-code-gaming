import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { COLORS } from '../world/colors';
import { LANDMARK_Z } from '../world/layout';

/** Os cidadãos circulam pela praça cívica, entre os landmarks e a avenida. */
const BOUNDS = { minX: -9, maxX: 9, minZ: LANDMARK_Z + 0.9, maxZ: LANDMARK_Z + 3.6 };

function randomPoint(): Vector3 {
  return new Vector3(
    BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX),
    0,
    BOUNDS.minZ + Math.random() * (BOUNDS.maxZ - BOUNDS.minZ)
  );
}

function Citizen({ color }: { color: string }) {
  const ref = useRef<Group>(null);
  const [initial] = useState(() => ({ start: randomPoint(), target: randomPoint(), delay: 2 + Math.random() * 3 }));
  const target = useRef(initial.target);
  const nextRetarget = useRef(initial.delay);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    if (clock.elapsedTime > nextRetarget.current) {
      target.current = randomPoint();
      nextRetarget.current = clock.elapsedTime + 4 + Math.random() * 4;
    }
    ref.current.position.lerp(target.current, delta * 0.35);
    ref.current.lookAt(target.current.x, 0, target.current.z);
  });

  return (
    <group ref={ref} position={initial.start}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.1, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.25, 0]} castShadow>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color="#f1c7a5" />
      </mesh>
    </group>
  );
}

/** Representa a Equipe (colaboradores ativos) como pessoas circulando pela praça. */
export function Citizens({ count }: { count: number }) {
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <>
      {indices.map((i) => (
        <Citizen key={i} color={i % 2 === 0 ? COLORS.brandBlue : COLORS.brandPurple} />
      ))}
    </>
  );
}
