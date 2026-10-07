import { Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useCityEvents, type CityEvent } from '../../store/cityEvents';
import type { Vec3 } from '../../world/layout';
import { pathLength, pointAt } from '../../world/routes';
import { VehicleModel } from './VehicleModel';

/** Chamado resolvido: o caminhão sai da porta do cliente e vai embora pela rua até sumir. */
function DepartingTruck({ event, exitX }: { event: Extract<CityEvent, { kind: 'truck-leave' }>; exitX: number }) {
  const ref = useRef<Group>(null);
  const speed = useRef(0);
  const remove = useCityEvents((s) => s.remove);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    speed.current = Math.min(3.5, speed.current + delta * 2.2); // arranca devagar
    g.position.x += speed.current * delta;
    if (g.position.x > exitX) remove(event.id);
  });

  return (
    <group ref={ref} position={event.from}>
      <Suspense fallback={null}>
        <VehicleModel kind={event.vehicle} />
      </Suspense>
    </group>
  );
}

function CoinBurst({ position }: { position: Vec3 }) {
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
      c.position.set(Math.cos(a) * t * 0.9, 0.4 + 2.4 * t - 2.6 * t * t, Math.sin(a) * t * 0.9);
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

/** Fatura paga: carro-forte vai do cliente até o Banco Central pelas ruas e "deposita" moedas. */
function ArmoredTruck({ event }: { event: Extract<CityEvent, { kind: 'armored' }> }) {
  const ref = useRef<Group>(null);
  const traveled = useRef(0);
  const total = useMemo(() => pathLength(event.path), [event.path]);
  const [arrived, setArrived] = useState(false);
  const arrivedAt = useRef<number | null>(null);
  const remove = useCityEvents((s) => s.remove);
  const end = event.path[event.path.length - 1];

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    if (arrived) {
      arrivedAt.current ??= clock.elapsedTime;
      if (clock.elapsedTime - arrivedAt.current > 1.4) remove(event.id);
      return;
    }
    traveled.current += delta * 3;
    const { position, heading } = pointAt(event.path, traveled.current);
    g.position.set(position[0], 0, position[2]);
    g.rotation.y = heading - Math.PI / 2;
    if (traveled.current >= total) setArrived(true);
  });

  return (
    <>
      <group ref={ref} position={event.path[0]}>
        {/* Carro-forte: a van da Kenney em grafite. */}
        <Suspense fallback={null}>
          <VehicleModel kind="van" tint="#6b7280" length={1.05} />
        </Suspense>
      </group>
      {arrived && <CoinBurst position={[end[0], 0, end[2]]} />}
    </>
  );
}

export function EventVehicles({ exitX }: { exitX: number }) {
  const events = useCityEvents((s) => s.events);
  return (
    <>
      {events.map((e) =>
        e.kind === 'truck-leave' ? <DepartingTruck key={e.id} event={e} exitX={exitX} /> : <ArmoredTruck key={e.id} event={e} />
      )}
    </>
  );
}
