import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';
import { COLORS } from '../../world/colors';

const WHEELS: [number, number][] = [
  [-0.38, 0.2],
  [-0.38, -0.2],
  [0.32, 0.2],
  [0.32, -0.2],
];

/**
 * Caminhão baú low-poly, de frente para +x (rotation.y = 0).
 * `doorOpen` abre a porta traseira (descarregando); `beacon` liga o giroflex de urgência.
 */
export function TruckModel({
  stripe,
  cab = '#f8f9fd',
  body = '#ffffff',
  doorOpen = false,
  beacon = false,
  highlight = false,
}: {
  stripe: string;
  cab?: string;
  body?: string;
  doorOpen?: boolean;
  beacon?: boolean;
  highlight?: boolean;
}) {
  const beaconRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!beaconRef.current) return;
    const m = beaconRef.current.material as MeshStandardMaterial;
    m.emissiveIntensity = Math.sin(clock.elapsedTime * 10) > 0 ? 2.2 : 0.2;
  });

  const glow = highlight ? 0.16 : 0;

  return (
    <group>
      {/* Baú */}
      <mesh position={[-0.17, 0.33, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.76, 0.46, 0.44]} />
        <meshStandardMaterial color={body} roughness={0.6} emissive="#ffffff" emissiveIntensity={glow} />
      </mesh>
      {/* Faixa da marca nas laterais */}
      {[0.222, -0.222].map((z) => (
        <mesh key={z} position={[-0.17, 0.3, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[0.7, 0.12]} />
          <meshStandardMaterial color={stripe} />
        </mesh>
      ))}
      {/* Cabine */}
      <mesh position={[0.36, 0.25, 0]} castShadow>
        <boxGeometry args={[0.3, 0.32, 0.42]} />
        <meshStandardMaterial color={cab} roughness={0.5} emissive="#ffffff" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0.512, 0.3, 0]}>
        <boxGeometry args={[0.01, 0.13, 0.34]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} />
      </mesh>
      {/* Chassi e rodas */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.08, 0.06, 0.36]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {WHEELS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.08, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 14]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      {/* Porta traseira: abre girando para o lado */}
      <group position={[-0.55, 0.33, 0.22]} rotation={[0, doorOpen ? -1.9 : 0, 0]}>
        <mesh position={[0, 0, -0.22]}>
          <boxGeometry args={[0.015, 0.44, 0.42]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      </group>
      {beacon && (
        <mesh ref={beaconRef} position={[0.36, 0.45, 0]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color={COLORS.danger} emissive={COLORS.danger} emissiveIntensity={1} />
        </mesh>
      )}
    </group>
  );
}
