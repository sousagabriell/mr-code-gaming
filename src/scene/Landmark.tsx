import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { LandmarkKind } from '../store/uiStore';
import type { Vec3 } from '../world/layout';
import { COLORS } from '../world/colors';
import { useUiStore } from '../store/uiStore';
import { useWorld } from '../hooks/useWorld';
import { formatBRLCompact } from '../lib/format';
import { bancoHealth, datacenterHealth } from '../world/health';
import { LANDMARK_META } from '../world/status';
import { SceneTag } from './SceneTag';
import { useHover } from './useHover';

function Columns({ count, width, height, z }: { count: number; width: number; height: number; z: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const cx = -width / 2 + (width / (count - 1)) * i;
        return (
          <mesh key={i} position={[cx, height / 2, z]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, height, 10]} />
            <meshStandardMaterial color={COLORS.wall} />
          </mesh>
        );
      })}
    </>
  );
}

function Body({ args, y, color = COLORS.wall }: { args: [number, number, number]; y: number; color?: string }) {
  return (
    <mesh position={[0, y, 0]} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

export function Landmark({ kind, position }: { kind: LandmarkKind; position: Vec3 }) {
  const { observabilidade, faturas, despesas, wikiPaginas, colaboradores, contratos } = useWorld();
  const select = useUiStore((s) => s.select);
  const isSelected = useUiStore((s) => s.selected?.kind === kind);
  const { hovered, bind } = useHover();
  const pulseRef = useRef<Group>(null);

  let accent: string = COLORS.brandPurple;
  let pulse = false;
  let metric = `${wikiPaginas.length} artigos`;
  if (kind === 'datacenter') {
    const health = datacenterHealth(observabilidade);
    accent = health.color;
    pulse = health.pulse;
    metric =
      observabilidade?.habilitado && observabilidade.vps
        ? `${Math.round((observabilidade.vps.cpuLoad1m / observabilidade.vps.numNucleos) * 100)}% CPU`
        : 'offline em dev';
  } else if (kind === 'banco') {
    const health = bancoHealth(faturas, despesas);
    accent = health.color;
    pulse = health.pulse;
    metric = formatBRLCompact(health.saldo);
  } else if (kind === 'prefeitura') {
    accent = COLORS.brandBlue;
    const ativos = contratos.filter((c) => c.status === 'Ativo').length;
    metric = colaboradores.length > 0 ? `${colaboradores.filter((c) => c.ativo).length} pessoas · ${ativos} contratos` : `${ativos} contratos ativos`;
  }

  useFrame(({ clock }) => {
    if (pulseRef.current) pulseRef.current.scale.setScalar(pulse ? 1 + Math.sin(clock.elapsedTime * 5) * 0.025 : 1);
  });

  let model: ReactNode;
  if (kind === 'datacenter') {
    model = (
      <>
        <Body args={[1.9, 1.5, 1.3]} y={0.75} color="#dfe5f2" />
        <mesh position={[0, 1.53, 0]} castShadow>
          <boxGeometry args={[1.96, 0.08, 1.36]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        {[-0.6, -0.2, 0.2, 0.6].map((sx) => (
          <mesh key={sx} position={[sx, 0.75, 0.655]}>
            <boxGeometry args={[0.16, 1.1, 0.02]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
          </mesh>
        ))}
        <mesh position={[0.6, 1.9, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </>
    );
  } else if (kind === 'banco') {
    model = (
      <>
        <Body args={[2.2, 0.16, 1.5]} y={0.08} color={COLORS.wallShade} />
        <Body args={[2, 1.2, 1.2]} y={0.76} />
        <Columns count={5} width={1.8} height={1.2} z={0.7} />
        <mesh position={[0, 1.56, 0.05]} rotation={[0, Math.PI / 4, 0]} scale={[1.55, 1, 1.05]} castShadow>
          <coneGeometry args={[1, 0.45, 4]} />
          <meshStandardMaterial color={COLORS.wall} />
        </mesh>
        <mesh position={[0, 1.3, 0.71]}>
          <boxGeometry args={[1.9, 0.1, 0.02]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      </>
    );
  } else if (kind === 'universidade') {
    model = (
      <>
        <Body args={[1.9, 1.5, 1.6]} y={0.75} />
        <Columns count={4} width={1.5} height={1.5} z={0.86} />
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.55, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      </>
    );
  } else {
    model = (
      <>
        <Body args={[2, 1.3, 1.4]} y={0.65} />
        <Columns count={4} width={1.7} height={1.3} z={0.76} />
        <Body args={[0.55, 0.65, 0.55]} y={1.62} />
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[0.42, 0.5, 4]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      </>
    );
  }

  const meta = LANDMARK_META[kind];

  return (
    <group position={position}>
      <group
        ref={pulseRef}
        onClick={(e) => {
          e.stopPropagation();
          select({ kind });
        }}
        {...bind}
      >
        {model}
      </group>
      <SceneTag visible={hovered || isSelected} position={[0, 2.9, 0]} code={meta.code} text={`${meta.nome} · ${metric}`} accent={accent} />
    </group>
  );
}
