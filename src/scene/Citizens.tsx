import { Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { LANDMARK_Z } from '../world/layout';
import { characterFor } from './assets';
import { CharacterModel } from './people/CharacterModel';

/** Os cidadãos circulam pela praça cívica, entre os landmarks e a avenida. */
const BOUNDS = { minX: -9, maxX: 9, minZ: LANDMARK_Z + 0.9, maxZ: LANDMARK_Z + 3.6 };
const SPEED = 0.55;

function randomPoint(): Vector3 {
  return new Vector3(
    BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX),
    0,
    BOUNDS.minZ + Math.random() * (BOUNDS.maxZ - BOUNDS.minZ)
  );
}

/** Passeia até um ponto da praça, para um pouco e escolhe outro destino. */
function Citizen({ index }: { index: number }) {
  const ref = useRef<Group>(null);
  const [initial] = useState(() => ({ start: randomPoint(), target: randomPoint() }));
  const target = useRef(initial.target);
  const pauseUntil = useRef(0);
  const [walking, setWalking] = useState(true);
  const dir = useMemo(() => new Vector3(), []);

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (t < pauseUntil.current) return;
    dir.subVectors(target.current, g.position);
    const dist = dir.length();
    if (dist < 0.05) {
      pauseUntil.current = t + 1.5 + Math.random() * 3;
      target.current = randomPoint();
      if (walking) setWalking(false);
      return;
    }
    if (!walking) setWalking(true);
    g.position.addScaledVector(dir.normalize(), Math.min(dist, SPEED * delta));
    g.rotation.y = Math.atan2(dir.x, dir.z);
  });

  return (
    <group ref={ref} position={initial.start}>
      {/* Índices altos para não repetir o visual dos colaboradores com rota. */}
      <Suspense fallback={null}>
        <CharacterModel url={characterFor(index + 7)} animation={walking ? 'walk' : 'idle'} />
      </Suspense>
    </group>
  );
}

/** Pedestres "genéricos" para dar vida à praça. */
export function Citizens({ count }: { count: number }) {
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <>
      {indices.map((i) => (
        <Citizen key={i} index={i} />
      ))}
    </>
  );
}
