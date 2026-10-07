import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { COLORS } from '../world/colors';

const BOUNDS = { minX: -8.5, maxX: 8.5, minZ: -7.5, maxZ: 3 };

function randomDelay(): number {
  return 2 + Math.random() * 3;
}

function randomPoint(): Vector3 {
  return new Vector3(
    BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX),
    0.1,
    BOUNDS.minZ + Math.random() * (BOUNDS.maxZ - BOUNDS.minZ)
  );
}

function Citizen({ color }: { color: string }) {
  const ref = useRef<Group>(null);
  const start = useMemo(() => randomPoint(), []);
  const initialTarget = useMemo(() => randomPoint(), []);
  const initialDelay = useMemo(() => randomDelay(), []);
  const target = useRef(initialTarget);
  const nextRetarget = useRef(initialDelay);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    if (clock.elapsedTime > nextRetarget.current) {
      target.current = randomPoint();
      nextRetarget.current = clock.elapsedTime + 4 + Math.random() * 4;
    }
    ref.current.position.lerp(target.current, delta * 0.4);
  });

  return (
    <group ref={ref} position={start}>
      <mesh position={[0, 0.08, 0]}>
        <capsuleGeometry args={[0.05, 0.12, 4, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** Representa a Equipe (colaboradores ativos) como pontos decorativos circulando a praça cívica. */
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
