import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import { Object3D, type AmbientLight, type Group, type InstancedMesh } from 'three';
import type { Weather as WeatherKind } from '../world/gamification';
import { WEATHER_STYLE } from './weatherStyle';
import { motion } from './motion';

function seeded(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const SPAN_X = 52;

/** Nuvens fofas (esferas instanciadas) atravessando o céu devagar. */
function Clouds({ count, color }: { count: number; color: string }) {
  const refs = useRef<(Group | null)[]>([]);
  const clouds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: -SPAN_X / 2 + seeded(i) * SPAN_X,
        // Altas e leves: enfeitam o céu sem esconder os prédios da visão isométrica.
        y: 12 + seeded(i + 11) * 2.5,
        z: -16 + seeded(i + 23) * 30,
        s: 0.55 + seeded(i + 37) * 0.5,
        speed: 0.25 + seeded(i + 51) * 0.3,
      })),
    [count]
  );

  useFrame((_, delta) => {
    if (motion.reduced) return;
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.position.x += clouds[i].speed * delta;
      if (g.position.x > SPAN_X / 2) g.position.x = -SPAN_X / 2;
    });
  });

  return (
    <Instances limit={count * 4 + 1}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color={color} roughness={1} transparent opacity={0.7} depthWrite={false} />
      {clouds.map((c, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[c.x, c.y, c.z]}
          scale={c.s}
        >
          <Instance position={[0, 0, 0]} scale={[1.2, 0.75, 0.9]} />
          <Instance position={[0.9, -0.15, 0.1]} scale={[0.85, 0.6, 0.7]} />
          <Instance position={[-0.95, -0.2, -0.05]} scale={[0.8, 0.55, 0.65]} />
          <Instance position={[0.2, 0.35, 0]} scale={[0.7, 0.55, 0.6]} />
        </group>
      ))}
    </Instances>
  );
}

const dummy = new Object3D();

/** Chuva: gotas instanciadas caindo sobre a cidade; reaparecem no topo ao tocar o chão. */
function Rain({ count }: { count: number }) {
  const ref = useRef<InstancedMesh>(null);
  // Estado mutável da simulação fica num ref (atualizado a cada frame, fora do ciclo do React).
  const drops = useRef<{ x: number; y: number; z: number; v: number }[]>([]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    drops.current = Array.from({ length: count }, (_, i) => ({
      x: -18 + seeded(i) * 36,
      y: seeded(i + 100) * 11,
      z: -12 + seeded(i + 200) * 30,
      v: 9 + seeded(i + 300) * 4,
    }));
    drops.current.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(0, 0, 0.12);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    drops.current.forEach((d, i) => {
      d.y -= d.v * Math.min(delta, 0.1);
      if (d.y < 0) d.y = 11;
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(0, 0, 0.12);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.012, 0.32, 0.012]} />
      <meshBasicMaterial color="#64748b" transparent opacity={0.45} />
    </instancedMesh>
  );
}

/** Relâmpagos: clarões curtos e aleatórios durante a tempestade. */
function Lightning() {
  const ref = useRef<AmbientLight>(null);
  const next = useRef(3);
  const flashUntil = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t > next.current) {
      flashUntil.current = t + 0.12 + Math.random() * 0.1;
      next.current = t + 4 + Math.random() * 6;
    }
    if (ref.current) ref.current.intensity = t < flashUntil.current ? 2.2 : 0;
  });

  return <ambientLight ref={ref} intensity={0} color="#e0e7ff" />;
}

/** Com movimento reduzido: nuvens paradas, sem chuva caindo e sem relâmpagos (flashes). */
export function Weather({ kind, reduced }: { kind: WeatherKind; reduced: boolean }) {
  const style = WEATHER_STYLE[kind];
  return (
    <>
      {style.clouds > 0 && <Clouds key={`${style.clouds}-${style.cloudColor}`} count={style.clouds} color={style.cloudColor} />}
      {style.rain > 0 && !reduced && <Rain key={style.rain} count={style.rain} />}
      {style.lightning && !reduced && <Lightning />}
    </>
  );
}
