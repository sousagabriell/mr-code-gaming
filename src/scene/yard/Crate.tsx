import { useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { easing } from 'maath';
import { Plane, Vector3, type Group, type Mesh } from 'three';
import { COLORS, PRIORIDADE_COLOR } from '../../world/colors';
import type { Vec3 } from '../../world/layout';
import { CRATE_SIZE, type YardCrate } from '../../world/yard';
import { setCameraLocked, setHoverPan } from '../../hud/camera';
import { useUiStore } from '../../store/uiStore';
import { MapPin } from '../MapPin';
import { SceneTag } from '../SceneTag';
import { TIPO_COLOR } from './crateColors';
import { motion } from '../motion';

const GROUND = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();
const tmp = new Vector3();
/** Distância mínima (em unidades do mundo) para um clique virar arraste. */
const DRAG_THRESHOLD = 0.18;

interface CaptureTarget {
  setPointerCapture: (id: number) => void;
  releasePointerCapture: (id: number) => void;
}

function DeliveryBurst({ color }: { color: string }) {
  const ref = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const dirs = useMemo(
    () => Array.from({ length: 10 }, (_, i) => [Math.cos((i / 10) * Math.PI * 2), 1.4 + (i % 3) * 0.4, Math.sin((i / 10) * Math.PI * 2)] as Vec3),
    []
  );

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    start.current ??= clock.elapsedTime;
    const t = (clock.elapsedTime - start.current) / 0.9;
    g.visible = t < 1;
    g.children.forEach((child, i) => {
      const [dx, dy, dz] = dirs[i];
      child.position.set(dx * t * 0.8, dy * t - 2.2 * t * t + 0.4, dz * t * 0.8);
      child.scale.setScalar(Math.max(0, 1 - t));
    });
  });

  return (
    <group ref={ref}>
      {dirs.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.07, 0.07, 0.07]} />
          <meshBasicMaterial color={i % 2 ? color : COLORS.warning} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Atividade do Kanban = caixa num palete. Clique seleciona; arrastar leva a caixa para outra zona
 * (o pátio decide a coluna/posição no `onDrop`). Fora do arraste, a caixa "anda" até a sua vaga.
 */
export function Crate({
  crate,
  done,
  now,
  onDragMove,
  onDrop,
}: {
  crate: YardCrate;
  done: boolean;
  now: number;
  onDragMove: (x: number, z: number) => void;
  onDrop: (crate: YardCrate, x: number, z: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const boxRef = useRef<Mesh>(null);
  const drag = useRef<{ pointerId: number; startX: number; startZ: number; active: boolean } | null>(null);
  const dragPoint = useRef(new Vector3());
  const [hovered, setHovered] = useState(false);
  const [dragging, setDraggingLocal] = useState(false);
  const placed = useRef(false);
  const [prevDone, setPrevDone] = useState(done);
  const [burstKey, setBurstKey] = useState(0);

  const select = useUiStore((s) => s.select);
  const setDragging = useUiStore((s) => s.setDragging);
  const isSelected = useUiStore((s) => s.selected?.kind === 'atividade' && s.selected.id === crate.atividade.idAtividade);

  const { atividade } = crate;
  const color = TIPO_COLOR[atividade.tipo];
  const [tx, ty, tz] = crate.position;

  // Entrou na zona de conclusão → confete de entrega (estado derivado da prop anterior).
  if (done !== prevDone) {
    setPrevDone(done);
    if (done) setBurstKey((k) => k + 1);
  }

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (!placed.current) {
      g.position.set(tx, ty, tz);
      placed.current = true;
    }
    if (drag.current?.active) {
      tmp.set(dragPoint.current.x, 0.7, dragPoint.current.z);
      easing.damp3(g.position, tmp, 0.06, delta);
      return;
    }
    if (motion.reduced) {
      g.position.set(tx, ty, tz);
      return;
    }
    // Indo para a vaga: sobe um pouco no caminho, como se estivesse sendo carregada.
    tmp.set(tx, ty, tz);
    const dist = Math.hypot(g.position.x - tx, g.position.z - tz);
    tmp.y = ty + Math.min(0.5, dist * 0.35);
    easing.damp3(g.position, tmp, 0.28, delta);
  });

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(GROUND, hit)) return;
    (e.target as unknown as CaptureTarget).setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startX: hit.x, startZ: hit.z, active: false };
    // Trava global: nenhuma outra caixa religa o pan e a câmera cancela qualquer gesto em curso.
    setDragging(true);
    setCameraLocked(true);
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId || !e.ray.intersectPlane(GROUND, hit)) return;
    if (!d.active && Math.hypot(hit.x - d.startX, hit.z - d.startZ) > DRAG_THRESHOLD) {
      d.active = true;
      setDraggingLocal(true);
    }
    if (d.active) {
      dragPoint.current.copy(hit);
      onDragMove(hit.x, hit.z);
    }
  }

  function onPointerUp(e: ThreeEvent<PointerEvent>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.stopPropagation();
    (e.target as unknown as CaptureTarget).releasePointerCapture(e.pointerId);
    drag.current = null;
    setDragging(false);
    // A caixa segue o ponteiro, então normalmente ele ainda está sobre ela: pan continua desligado.
    setCameraLocked(false, !hovered);
    if (d.active) {
      setDraggingLocal(false);
      onDrop(crate, dragPoint.current.x, dragPoint.current.z);
    } else {
      select({ kind: 'atividade', id: atividade.idAtividade });
    }
  }

  const highlight = hovered || isSelected || dragging;
  const atrasada = !done && atividade.dataPrazo && new Date(atividade.dataPrazo).getTime() < now;
  const s = CRATE_SIZE;

  return (
    <group
      ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        setHoverPan(false);
        document.body.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        setHovered(false);
        if (useUiStore.getState().dragging) return; // alguma caixa está segurando o ponteiro
        setHoverPan(true);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Palete */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[s + 0.1, 0.1, s + 0.1]} />
        <meshStandardMaterial color="#c9a27a" roughness={0.9} />
      </mesh>
      {/* Caixa */}
      <mesh ref={boxRef} position={[0, 0.1 + s / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color={done ? '#d9c3a3' : color} roughness={0.7} emissive="#ffffff" emissiveIntensity={highlight ? 0.16 : 0} />
      </mesh>
      {/* Fita */}
      <mesh position={[0, 0.1 + s + 0.003, 0]}>
        <boxGeometry args={[s + 0.004, 0.006, 0.12]} />
        <meshStandardMaterial color={done ? '#b58e5c' : '#ffffff'} transparent opacity={0.85} />
      </mesh>

      {atividade.prioridade === 'Alta' && !done && <MapPin position={[0, s + 0.2, 0]} color={PRIORIDADE_COLOR.Alta} scale={0.7} />}
      {atrasada && atividade.prioridade !== 'Alta' && <MapPin position={[0, s + 0.2, 0]} color={COLORS.warning} scale={0.7} />}

      <SceneTag
        visible={highlight}
        position={[0, s + 0.95, 0]}
        code={atividade.tipo}
        text={`${atividade.titulo}${atividade.nomeResponsavel ? ` · ${atividade.nomeResponsavel.split(' ')[0]}` : ''}`}
        accent={color}
      />
      {burstKey > 0 && !motion.reduced && <DeliveryBurst key={burstKey} color={COLORS.success} />}
    </group>
  );
}
