import { Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { useCityEvents, type CityEvent } from '../../store/cityEvents';
import { CAIXA_TELA, COFRE, MALOTE_ENTRA, MALOTE_SAI } from '../../world/bank';
import { pathLength, pointAt } from '../../world/routes';
import { furnitureModel } from '../assets';
import { CoinBurst } from '../CoinBurst';
import { useKenneyModel } from '../kenney';

/** Velocidade do malote, em unidades por segundo — a sala é pequena, então anda devagar. */
const VELOCIDADE = 1.6;

/**
 * Malote: o "carro-forte de dentro da sala". Entrando (recebimento) percorre porta → balcão → cofre
 * e estoura moedas ao chegar; saindo (pagamento) faz o caminho de volta, sem moedas — o dinheiro foi
 * embora.
 */
function Malote({ event }: { event: Extract<CityEvent, { kind: 'malote' }> }) {
  const entra = event.sentido === 'entra';
  const path = entra ? MALOTE_ENTRA : MALOTE_SAI;
  const ref = useRef<Group>(null);
  const andou = useRef(0);
  const total = useMemo(() => pathLength(path), [path]);
  const [chegou, setChegou] = useState(false);
  const chegouEm = useRef<number | null>(null);
  const remove = useCityEvents((s) => s.remove);
  const { root } = useKenneyModel(furnitureModel('cardboardBoxClosed'), { size: 0.32 });

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    if (chegou) {
      chegouEm.current ??= clock.elapsedTime;
      if (clock.elapsedTime - chegouEm.current > 1.2) remove(event.id);
      return;
    }
    andou.current += delta * VELOCIDADE;
    const { position, heading } = pointAt(path, andou.current);
    g.position.set(position[0], position[1], position[2]);
    g.rotation.y = heading;
    // Encolhe no fim do trecho: é assim que o malote "entra" no cofre em vez de atravessá-lo.
    const restante = Math.max(0, total - andou.current);
    g.scale.setScalar(Math.min(1, restante / 0.4));
    if (andou.current >= total) setChegou(true);
  });

  return (
    <>
      <group ref={ref} position={path[0]}>
        <primitive object={root} />
      </group>
      {chegou && entra && <CoinBurst position={[COFRE[0], 0.9, COFRE[2] + 0.4]} raio={0.5} />}
    </>
  );
}

/**
 * Salvou um lançamento: um clarão curto sobre a tela do caixa. Desenha a própria luz em vez de mexer
 * no material do monitor — aquele material é **compartilhado** pela instância do kit, e mutá-lo num
 * `useFrame` deixaria o brilho preso se a animação fosse interrompida.
 */
function PingDoCaixa({ event }: { event: Extract<CityEvent, { kind: 'extrato-ping' }> }) {
  const ref = useRef<Mesh>(null);
  const start = useRef<number | null>(null);
  const remove = useCityEvents((s) => s.remove);

  useFrame(({ clock, camera }) => {
    const m = ref.current;
    if (!m) return;
    start.current ??= clock.elapsedTime;
    const t = (clock.elapsedTime - start.current) / 1.4;
    if (t >= 1) {
      remove(event.id);
      return;
    }
    // Duas piscadas que vão sumindo.
    const forca = Math.abs(Math.sin(t * Math.PI * 2)) * (1 - t);
    (m.material as MeshStandardMaterial).opacity = forca * 0.85;
    m.scale.setScalar(0.8 + forca * 0.5);
    m.lookAt(camera.position);
  });

  return (
    <mesh ref={ref} position={CAIXA_TELA}>
      <circleGeometry args={[0.3, 20]} />
      <meshStandardMaterial color="#9fd0ff" emissive="#4a9bff" emissiveIntensity={2} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/**
 * Anima o que acontece na agência. Os eventos vêm da mesma fila da cidade (`cityEvents`); aqui só
 * os tipos da agência são tratados.
 */
export function BankEvents() {
  const events = useCityEvents((s) => s.events);

  return (
    <Suspense fallback={null}>
      {events.map((e) => {
        if (e.kind === 'malote') return <Malote key={e.id} event={e} />;
        if (e.kind === 'extrato-ping') return <PingDoCaixa key={e.id} event={e} />;
        return null;
      })}
    </Suspense>
  );
}
