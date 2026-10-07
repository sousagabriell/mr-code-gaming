import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Group } from 'three';
import type { ConstructionSitePlot } from '../world/layout';
import { COLORS } from '../world/colors';
import { label, projetoCode } from '../world/status';
import { useUiStore } from '../store/uiStore';
import { coneModel } from './assets';
import { Prop } from './Prop';
import { SceneTag } from './SceneTag';
import { useHover } from './useHover';
import { motion } from './motion';

const PAD = 0.95;
const SCAFFOLD = '#7d8fb8';

function ZoneOutline() {
  const h = PAD / 2;
  return (
    <Line
      points={[
        [-h, 0, -h],
        [h, 0, -h],
        [h, 0, h],
        [-h, 0, h],
        [-h, 0, -h],
      ]}
      position={[0, 0.06, 0]}
      color={COLORS.zoneLine}
      lineWidth={1.6}
      dashed
      dashSize={0.12}
      gapSize={0.08}
    />
  );
}

function Crane({ height, spinning }: { height: number; spinning: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (motion.reduced) return;
    if (ref.current && spinning) ref.current.rotation.y += delta * 0.5;
  });
  return (
    <group position={[-0.32, 0, -0.32]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.06, height, 0.06]} />
        <meshStandardMaterial color={COLORS.warning} />
      </mesh>
      <group ref={ref} position={[0, height, 0]}>
        <mesh position={[0.28, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 0.05, 0.05]} />
          <meshStandardMaterial color={COLORS.warning} />
        </mesh>
        <mesh position={[0.6, -0.15, 0]}>
          <boxGeometry args={[0.01, 0.3, 0.01]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>
    </group>
  );
}

export function ConstructionSite({ plot }: { plot: ConstructionSitePlot }) {
  const select = useUiStore((s) => s.select);
  const enterYard = useUiStore((s) => s.enterYard);
  const isSelected = useUiStore((s) => s.selected?.kind === 'projeto' && s.selected.id === plot.projeto.idProjeto);
  const { hovered, bind } = useHover();
  const { projeto, progress } = plot;
  const [x, , z] = plot.position;
  const highlight = hovered || isSelected;

  const done = projeto.status === 'Concluido';
  const active = projeto.status === 'EmAndamento';
  const paused = projeto.status === 'Pausado';
  const builtHeight = 0.08 + progress * 0.55;

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'projeto', id: projeto.idProjeto });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        enterYard(projeto.idProjeto);
      }}
      {...bind}
    >
      {/* Área de clique generosa */}
      <mesh position={[0, 0.3, 0]} visible={false}>
        <boxGeometry args={[PAD, 0.6, PAD]} />
      </mesh>

      {done ? (
        <>
          {/* Anexo inaugurado */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.7, 0.8]} />
            <meshStandardMaterial color={COLORS.wall} roughness={0.85} emissive={COLORS.brandBlue} emissiveIntensity={highlight ? 0.18 : 0} />
          </mesh>
          <mesh position={[0, 0.73, 0]} castShadow>
            <boxGeometry args={[0.86, 0.08, 0.86]} />
            <meshStandardMaterial color={COLORS.brandBlueLight} />
          </mesh>
          <mesh position={[0.3, 0.95, 0.3]}>
            <boxGeometry args={[0.015, 0.35, 0.015]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          <mesh position={[0.37, 1.06, 0.3]}>
            <boxGeometry args={[0.14, 0.09, 0.01]} />
            <meshStandardMaterial color={COLORS.success} />
          </mesh>
        </>
      ) : (
        <>
          <ZoneOutline />
          {projeto.status === 'Planejamento' ? (
            // Cones de demarcação (Kenney car kit)
            <Suspense fallback={null}>
              {[-0.3, 0.3].flatMap((sx) => [-0.3, 0.3].map((sz) => <Prop key={`${sx}${sz}`} url={coneModel} size={0.22} fit="height" position={[sx, 0, sz]} />))}
            </Suspense>
          ) : (
            <>
              {/* Parte já "construída" ∝ tempo decorrido */}
              <mesh position={[0.05, builtHeight / 2, 0.05]} castShadow receiveShadow>
                <boxGeometry args={[0.62, builtHeight, 0.62]} />
                <meshStandardMaterial color={COLORS.wallShade} emissive={COLORS.brandBlue} emissiveIntensity={highlight ? 0.2 : 0} />
              </mesh>
              {/* Andaime */}
              <mesh position={[0.05, 0.4, 0.05]}>
                <boxGeometry args={[0.7, 0.8, 0.7]} />
                <meshStandardMaterial color={highlight ? COLORS.brandBlue : SCAFFOLD} wireframe />
              </mesh>
              <Crane height={1.05} spinning={active} />
              {paused && (
                <mesh position={[0, 0.08, PAD / 2]}>
                  <boxGeometry args={[PAD, 0.1, 0.04]} />
                  <meshStandardMaterial color={COLORS.warning} />
                </mesh>
              )}
            </>
          )}
        </>
      )}

      <SceneTag
        visible={highlight}
        position={[0, done ? 1.35 : 1.4, 0]}
        code={projetoCode(projeto.idProjeto)}
        text={`${projeto.nome} · ${label(projeto.status)}`}
      />
    </group>
  );
}
