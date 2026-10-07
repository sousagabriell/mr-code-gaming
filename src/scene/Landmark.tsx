import { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { LandmarkKind, Vec3 } from '../world/layout';
import { COLORS } from '../world/colors';
import { useCityStore } from '../store/cityStore';
import { formatBRL } from '../lib/format';
import { bancoHealth, datacenterHealth } from '../world/health';

const LANDMARK_LABEL: Record<LandmarkKind, string> = {
  datacenter: 'Data Center',
  banco: 'Banco Central',
  universidade: 'Universidade',
  prefeitura: 'Prefeitura',
};

function Columns({ count, width, height, z }: { count: number; width: number; height: number; z: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const cx = -width / 2 + (width / (count - 1)) * i;
        return (
          <mesh key={i} position={[cx, height / 2, z]}>
            <cylinderGeometry args={[0.07, 0.07, height, 8]} />
            <meshStandardMaterial color="#cfd3e6" />
          </mesh>
        );
      })}
    </>
  );
}

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
      <span className="w-8 text-[var(--text-muted)]">{label}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </span>
    </div>
  );
}

export function Landmark({ kind, position }: { kind: LandmarkKind; position: Vec3 }) {
  const observabilidade = useCityStore((s) => s.observabilidade);
  const faturas = useCityStore((s) => s.faturas);
  const despesas = useCityStore((s) => s.despesas);
  const wikiPaginas = useCityStore((s) => s.wikiPaginas);
  const colaboradores = useCityStore((s) => s.colaboradores);
  const select = useCityStore((s) => s.select);
  const [hovered, setHovered] = useState(false);
  const pulseGroupRef = useRef<Group>(null);

  const [x, , z] = position;

  let color: string = COLORS.brandPurple;
  let pulse = false;
  let metric = `${wikiPaginas.length} artigos`;
  if (kind === 'datacenter') {
    const health = datacenterHealth(observabilidade);
    color = health.color;
    pulse = health.pulse;
    metric =
      observabilidade?.habilitado && observabilidade.vps
        ? `${Math.round((observabilidade.vps.cpuLoad1m / observabilidade.vps.numNucleos) * 100)}% CPU`
        : 'offline (dev)';
  } else if (kind === 'banco') {
    const health = bancoHealth(faturas, despesas);
    color = health.color;
    pulse = health.pulse;
    metric = formatBRL(health.saldo);
  } else if (kind === 'prefeitura') {
    color = COLORS.brandBlue;
    metric = `${colaboradores.filter((c) => c.ativo).length} colaboradores`;
  }

  useFrame(({ clock }) => {
    if (pulseGroupRef.current && pulse) {
      pulseGroupRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.03);
    }
  });

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    select({ kind }, [x, 1.1, z]);
  }

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }

  function handlePointerOut() {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }

  const vps = observabilidade?.vps;

  return (
    <group position={[x, 0, z]}>
      <group ref={pulseGroupRef} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
        {kind === 'datacenter' && (
          <>
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[1.8, 2, 1.2]} />
              <meshStandardMaterial color="#1b1e2c" emissive={color} emissiveIntensity={hovered ? 0.5 : 0.25} />
            </mesh>
            {[-0.6, -0.2, 0.2, 0.6].map((sx) => (
              <mesh key={sx} position={[sx, 1, 0.61]}>
                <boxGeometry args={[0.12, 1.6, 0.02]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
              </mesh>
            ))}
            <mesh position={[0, 2.3, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
              <meshStandardMaterial color="#cfd3e6" />
            </mesh>
          </>
        )}

        {kind === 'banco' && (
          <>
            <mesh position={[0, 0.7, 0]} castShadow>
              <boxGeometry args={[2.2, 1.4, 1.4]} />
              <meshStandardMaterial color="#e7e5df" emissive={color} emissiveIntensity={hovered ? 0.35 : 0.18} />
            </mesh>
            <Columns count={5} width={1.9} height={1.4} z={0.71} />
            <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 6, 0]}>
              <coneGeometry args={[1.5, 0.6, 3]} />
              <meshStandardMaterial color="#e7e5df" />
            </mesh>
          </>
        )}

        {kind === 'universidade' && (
          <>
            <mesh position={[0, 0.9, 0]} castShadow>
              <boxGeometry args={[1.8, 1.8, 1.6]} />
              <meshStandardMaterial color="#1f2236" emissive={color} emissiveIntensity={hovered ? 0.45 : 0.22} />
            </mesh>
            <Columns count={4} width={1.5} height={1.8} z={0.81} />
            <mesh position={[0, 2, 0]}>
              <sphereGeometry args={[0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
          </>
        )}

        {kind === 'prefeitura' && (
          <>
            <mesh position={[0, 0.8, 0]} castShadow>
              <boxGeometry args={[2, 1.6, 1.4]} />
              <meshStandardMaterial color="#e7e5df" emissive={color} emissiveIntensity={hovered ? 0.4 : 0.2} />
            </mesh>
            <Columns count={4} width={1.7} height={1.6} z={0.71} />
            <mesh position={[0, 1.9, 0]}>
              <boxGeometry args={[0.55, 0.6, 0.55]} />
              <meshStandardMaterial color="#e7e5df" />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <coneGeometry args={[0.42, 0.5, 4]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
          </>
        )}
      </group>

      {hovered && (
        <Html position={[0, 2.9, 0]} center distanceFactor={14}>
          <div className="pointer-events-none whitespace-nowrap rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-2.5 py-1 text-center font-[var(--font-mono)] text-[11px] text-[var(--text-primary)]">
            <div className="font-semibold">{LANDMARK_LABEL[kind]}</div>
            <div className="text-[var(--text-secondary)]">{metric}</div>
            {kind === 'datacenter' && observabilidade?.habilitado && vps && (
              <div className="mt-1 text-left">
                <HealthBar label="CPU" value={(vps.cpuLoad1m / vps.numNucleos) * 100} color={COLORS.info} />
                <HealthBar label="MEM" value={vps.memPercentual} color={COLORS.warning} />
                <HealthBar label="DISCO" value={vps.discoPercentual} color={COLORS.brandPurple} />
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
