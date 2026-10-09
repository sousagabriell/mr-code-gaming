import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Vec3 } from '../world/layout';

/**
 * Estouro de moedas: o "dinheiro entrou" do jogo. Nasceu no carro-forte da cidade e é o mesmo gesto
 * no cofre da agência — por isso mora aqui, e não dentro de um dos dois cenários.
 */
export function CoinBurst({ position, raio = 0.9 }: { position: Vec3; raio?: number }) {
  const ref = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const dirs = useMemo(() => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2), []);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    start.current ??= clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / 1.1);
    g.children.forEach((c, i) => {
      const a = dirs[i];
      // Sobe e cai: a parábola é o que faz parecer moeda jogada para o alto.
      c.position.set(Math.cos(a) * t * raio, 0.4 + 2.4 * t - 2.6 * t * t, Math.sin(a) * t * raio);
      c.rotation.x = t * 12;
      c.scale.setScalar(1 - t * 0.6);
    });
    g.visible = t < 1;
  });

  return (
    <group ref={ref} position={position}>
      {dirs.map((a) => (
        <mesh key={a}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 12]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
