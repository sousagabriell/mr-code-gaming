import { Suspense, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { easing } from 'maath';
import type { Group } from 'three';
import { COLORS } from '../world/colors';
import { decorSpot } from '../world/decor';
import type { Unlock } from '../world/gamification';
import type { Vec3 } from '../world/layout';
import { TOWER_MODEL } from './assets';
import { Prop } from './Prop';
import { motion } from './motion';

/** Construção desbloqueada "brota" do chão ao aparecer. */
function Rise({ position, children }: { position: Vec3; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!motion.reduced) ref.current?.scale.set(1, 0.001, 1);
  }, []);
  useFrame((_, delta) => {
    if (ref.current) easing.damp(ref.current.scale, 'y', 1, 0.5, delta);
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

function Fonte() {
  const jet = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (motion.reduced) return;
    if (jet.current) jet.current.scale.y = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
  });
  return (
    <>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.75, 0.16, 28]} />
        <meshStandardMaterial color={COLORS.wallShade} />
      </mesh>
      <mesh position={[0, 0.165, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.01, 28]} />
        <meshStandardMaterial color="#93c5fd" roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.4, 12]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      <group ref={jet} position={[0, 0.55, 0]}>
        <mesh position={[0, 0.15, 0]}>
          <coneGeometry args={[0.12, 0.3, 12]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.75} />
        </mesh>
      </group>
    </>
  );
}

function Estatua() {
  return (
    <>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.3, 4, 10]} />
        <meshStandardMaterial color="#d4a017" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.08, 14, 10]} />
        <meshStandardMaterial color="#d4a017" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0.14, 0.82, 0]} rotation={[0, 0, -0.9]} castShadow>
        <capsuleGeometry args={[0.03, 0.22, 4, 8]} />
        <meshStandardMaterial color="#d4a017" metalness={0.6} roughness={0.35} />
      </mesh>
    </>
  );
}

function Parque() {
  const trees: [number, number][] = [
    [-1.3, -1.2],
    [1.2, -1.3],
    [-1.4, 0.9],
    [1.3, 1.1],
    [0, -1.5],
    [-0.2, 1.4],
  ];
  return (
    <>
      <RoundedBox args={[4, 0.06, 4]} radius={0.03} position={[0, 0.03, 0]} receiveShadow>
        <meshStandardMaterial color="#bfe7c6" />
      </RoundedBox>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 28]} />
        <meshStandardMaterial color="#93c5fd" roughness={0.1} />
      </mesh>
      {trees.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.4, 6]} />
            <meshStandardMaterial color={COLORS.trunk} />
          </mesh>
          <mesh position={[0, 0.62, 0]} castShadow>
            <sphereGeometry args={[0.38, 14, 12]} />
            <meshStandardMaterial color={COLORS.treeDark} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.9, 0.12, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.18]} />
        <meshStandardMaterial color={COLORS.trunk} />
      </mesh>
    </>
  );
}

function RodaGigante() {
  const wheel = useRef<Group>(null);
  useFrame((_, delta) => {
    if (motion.reduced) return;
    if (wheel.current) wheel.current.rotation.z += delta * 0.25;
  });
  const cabins = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  return (
    <>
      {[-0.35, 0.35].map((z) =>
        [-1, 1].map((side) => (
          <mesh key={`${z}${side}`} position={[side * 0.55, 1.05, z]} rotation={[0, 0, side * 0.45]} castShadow>
            <boxGeometry args={[0.08, 2.3, 0.08]} />
            <meshStandardMaterial color={COLORS.wall} />
          </mesh>
        ))
      )}
      <group ref={wheel} position={[0, 2.05, 0]}>
        <mesh>
          <torusGeometry args={[1.5, 0.05, 8, 48]} />
          <meshStandardMaterial color={COLORS.brandBlue} />
        </mesh>
        {cabins.map((a) => (
          // Raio do centro até a borda: meio comprimento à frente, girado no ângulo da cabine.
          <group key={a} position={[Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0]}>
            <mesh rotation={[0, 0, a]}>
              <boxGeometry args={[1.5, 0.03, 0.03]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
          </group>
        ))}
        {cabins.map((a, i) => (
          <mesh key={`c${a}`} position={[Math.cos(a) * 1.5, Math.sin(a) * 1.5 - 0.15, 0]} castShadow>
            <boxGeometry args={[0.24, 0.22, 0.24]} />
            <meshStandardMaterial color={[COLORS.warning, COLORS.danger, COLORS.success, COLORS.info][i % 4]} />
          </mesh>
        ))}
      </group>
    </>
  );
}

function Torre() {
  // Arranha-céu do City Kit — o mais alto da cidade depois do Banco.
  return <Prop url={TOWER_MODEL} size={1.7} />;
}

function Heliponto() {
  return (
    <>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.2, 2.2]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      <mesh position={[0, 1.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {[
        [-0.25, 0, 0.08, 0.7],
        [0.25, 0, 0.08, 0.7],
        [0, 0, 0.5, 0.08],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 1.225, z]}>
          <boxGeometry args={[w, 0.01, d]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}
    </>
  );
}

function Monumento() {
  const bar = (x: number, rot: number, h: number) => (
    <mesh position={[x, 0.6 + h / 2, 0]} rotation={[0, 0, rot]} castShadow>
      <boxGeometry args={[0.32, h, 0.32]} />
      <meshStandardMaterial color={COLORS.brandBlue} />
    </mesh>
  );
  return (
    <>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.6, 1]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      {bar(-0.85, 0, 2)}
      {bar(0.85, 0, 2)}
      {bar(-0.42, 0.45, 1.3)}
      {bar(0.42, -0.45, 1.3)}
    </>
  );
}

/** Só o desenho: as **posições** moram em `world/decor.ts`, onde os testes as cruzam com os landmarks. */
const NODE: Record<Unlock['key'], () => ReactNode> = {
  fonte: () => <Fonte />,
  estatua: () => <Estatua />,
  parque: () => <Parque />,
  'roda-gigante': () => <RodaGigante />,
  torre: () => <Torre />,
  heliponto: () => <Heliponto />,
  monumento: () => <Monumento />,
};

/** Construções que a cidade ganha ao subir de nível (gamification.UNLOCKS). */
export function CityDecor({ unlocked }: { unlocked: Unlock[] }) {
  return (
    <>
      {unlocked.map((u) => (
        <Rise key={u.key} position={decorSpot(u.key).position}>
          <Suspense fallback={null}>{NODE[u.key]()}</Suspense>
        </Rise>
      ))}
    </>
  );
}
