import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import type { Group } from 'three';
import type { ClientPlot } from '../world/layout';
import { CLIENT_COLOR_BY_STATE, COLORS, PRIORIDADE_COLOR } from '../world/colors';
import { clienteCode, clienteNome, worstPrioridade } from '../world/status';
import { useUiStore } from '../store/uiStore';
import { MapPin } from './MapPin';
import { SceneTag } from './SceneTag';
import { useHover } from './useHover';

const WIDTH = 1.4;
const DEPTH = 1.15;

function Windows({ height }: { height: number }) {
  const floors = Math.max(1, Math.floor((height - 0.35) / 0.32));
  return (
    <>
      {Array.from({ length: floors }).map((_, f) => (
        <mesh key={f} position={[0, 0.45 + f * 0.32, DEPTH / 2 + 0.006]}>
          <planeGeometry args={[WIDTH * 0.78, 0.14]} />
          <meshStandardMaterial color={COLORS.glass} roughness={0.2} metalness={0.1} />
        </mesh>
      ))}
    </>
  );
}

export function ClientBuilding({ plot }: { plot: ClientPlot }) {
  const groupRef = useRef<Group>(null);
  const select = useUiStore((s) => s.select);
  const isSelected = useUiStore((s) => s.selected?.kind === 'cliente' && s.selected.id === plot.cliente.idCliente);
  const { hovered, bind } = useHover();

  const roof = CLIENT_COLOR_BY_STATE[plot.colorState];
  const inactive = plot.colorState === 'encerrado';
  const [x, , z] = plot.position;
  const h = plot.height;

  const worst = worstPrioridade(plot.chamadosAbertos);
  const pinColor = plot.faturasAtrasadas.length > 0 || worst === 'Alta' ? PRIORIDADE_COLOR.Alta : worst ? PRIORIDADE_COLOR[worst] : null;

  // Sobe do chão ao aparecer (primeiro carregamento ou sede recém-construída). A escala inicial é
  // aplicada só uma vez — passá-la como prop faria a sede "desabar" a cada re-render.
  useLayoutEffect(() => {
    groupRef.current?.scale.set(1, 0.001, 1);
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) easing.damp(groupRef.current.scale, 'y', 1, 0.35, delta);
  });

  const highlight = hovered || isSelected;

  return (
    <group position={[x, 0, z]}>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          select({ kind: 'cliente', id: plot.cliente.idCliente });
        }}
        {...bind}
      >
        {/* Corpo */}
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WIDTH, h, DEPTH]} />
          <meshStandardMaterial
            color={inactive ? COLORS.wallShade : COLORS.wall}
            roughness={0.85}
            emissive={COLORS.brandBlue}
            emissiveIntensity={highlight ? 0.18 : 0}
          />
        </mesh>
        {/* Telhado colorido pelo estado do contrato */}
        <mesh position={[0, h + 0.06, 0]} castShadow>
          <boxGeometry args={[WIDTH + 0.08, 0.12, DEPTH + 0.08]} />
          <meshStandardMaterial color={roof} roughness={0.6} />
        </mesh>
        {/* Faixa lateral da marca */}
        <mesh position={[WIDTH / 2 + 0.006, h * 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[DEPTH * 0.7, 0.16]} />
          <meshStandardMaterial color={roof} />
        </mesh>
        {/* Porta */}
        <mesh position={[0, 0.18, DEPTH / 2 + 0.01]}>
          <boxGeometry args={[0.34, 0.36, 0.02]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
        {!inactive && <Windows height={h} />}
      </group>

      {pinColor && <MapPin position={[0, h + 0.25, 0]} color={pinColor} />}

      <SceneTag
          visible={highlight || plot.chamadosAbertos.length > 0}
          position={[0, h + (pinColor ? 1.05 : 0.5), 0]}
          code={clienteCode(plot.cliente.idCliente)}
          text={
            highlight
              ? clienteNome(plot.cliente)
              : `${plot.chamadosAbertos.length} chamado${plot.chamadosAbertos.length > 1 ? 's' : ''}`
          }
          accent={inactive ? '#94a3b8' : COLORS.brandBlue}
        />
    </group>
  );
}
