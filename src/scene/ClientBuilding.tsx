import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DoubleSide, type Mesh, type MeshBasicMaterial } from 'three';
import type { ClientPlot } from '../world/layout';
import { CLIENT_COLOR_BY_STATE, PRIORIDADE_COLOR } from '../world/colors';
import { useCityStore } from '../store/cityStore';

function worstPrioridade(chamados: ClientPlot['chamadosAbertos']): 'Alta' | 'Media' | 'Baixa' {
  if (chamados.some((c) => c.prioridade === 'Alta')) return 'Alta';
  if (chamados.some((c) => c.prioridade === 'Media')) return 'Media';
  return 'Baixa';
}

export function ClientBuilding({ plot }: { plot: ClientPlot }) {
  const [hovered, setHovered] = useState(false);
  const beaconRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const select = useCityStore((s) => s.select);

  const color = CLIENT_COLOR_BY_STATE[plot.colorState];
  const [x, , z] = plot.position;
  const y = plot.height / 2;
  const worst = plot.chamadosAbertos.length > 0 ? worstPrioridade(plot.chamadosAbertos) : null;
  const beaconColor = worst ? PRIORIDADE_COLOR[worst] : null;

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      beaconRef.current.scale.setScalar(0.75 + Math.sin(clock.elapsedTime * 4) * 0.25);
    }
    if (ringRef.current && worst === 'Alta') {
      const t = (clock.elapsedTime % 1.4) / 1.4;
      ringRef.current.scale.setScalar(0.4 + t * 2.2);
      (ringRef.current.material as MeshBasicMaterial).opacity = 1 - t;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, y, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          select({ kind: 'cliente', id: plot.cliente.idCliente }, [x, y, z]);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[1, plot.height, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.9 : plot.colorState === 'ativo' ? 0.55 : 0.25}
          opacity={plot.colorState === 'neutro' ? 0.6 : 1}
          transparent={plot.colorState === 'neutro'}
        />
      </mesh>

      {beaconColor && (
        <mesh ref={beaconRef} position={[0, plot.height + 0.5, 0]}>
          <octahedronGeometry args={[0.18]} />
          <meshStandardMaterial color={beaconColor} emissive={beaconColor} emissiveIntensity={1.4} />
        </mesh>
      )}

      {worst === 'Alta' && beaconColor && (
        <mesh ref={ringRef} position={[0, plot.height + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.3, 32]} />
          <meshBasicMaterial color={beaconColor} transparent opacity={1} side={DoubleSide} />
        </mesh>
      )}

      {hovered && (
        <Html position={[0, plot.height + 1, 0]} center distanceFactor={14}>
          <div className="pointer-events-none whitespace-nowrap rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-2 py-1 font-[var(--font-mono)] text-[11px] text-[var(--text-primary)]">
            {plot.cliente.nomeFantasia ?? plot.cliente.razaoSocial}
          </div>
        </Html>
      )}
    </group>
  );
}
