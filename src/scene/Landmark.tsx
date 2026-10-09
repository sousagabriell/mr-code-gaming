import { useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group } from 'three';
import type { LandmarkKind } from '../store/uiStore';
import type { Vec3 } from '../world/layout';
import { COLORS } from '../world/colors';
import { useUiStore } from '../store/uiStore';
import { useMetasAtivas } from '../hooks/useMetas';
import { useWorld } from '../hooks/useWorld';
import { formatBRLCompact } from '../lib/format';
import { bancoHealth, datacenterHealth } from '../world/health';
import { LANDMARK_META } from '../world/status';
import { LANDMARK_MODELS } from './assets';
import { BuildingSign } from './BuildingSign';
import { HIGHLIGHT, useKenneyModel } from './kenney';
import { landmarkSignAnchor } from '../world/signs';
import { SceneTag } from './SceneTag';
import { useHover } from './useHover';
import { motion } from './motion';

export function Landmark({ kind, position }: { kind: LandmarkKind; position: Vec3 }) {
  const { observabilidade, faturas, despesas, wikiPaginas, colaboradores, contratos } = useWorld();
  const metasAtivas = useMetasAtivas();
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
  } else if (kind === 'escritorio') {
    accent = COLORS.brandBlue;
    const ativos = contratos.filter((c) => c.status === 'Ativo').length;
    metric = colaboradores.length > 0 ? `${colaboradores.filter((c) => c.ativo).length} pessoas · ${ativos} contratos` : `${ativos} contratos ativos`;
  } else if (kind === 'prefeitura') {
    accent = COLORS.brandBlue;
    metric = metasAtivas === 0 ? 'sem metas em andamento' : `${metasAtivas} meta${metasAtivas === 1 ? '' : 's'} em andamento`;
  }

  useFrame(({ clock }) => {
    if (motion.reduced) return;
    if (pulseRef.current) pulseRef.current.scale.setScalar(pulse ? 1 + Math.sin(clock.elapsedTime * 5) * 0.025 : 1);
  });

  // Prédio Kenney por landmark; a base colorida mostra a saúde do módulo (verde/âmbar/vermelho/roxo).
  const { url, footprint, rotationY } = LANDMARK_MODELS[kind];
  const { root, size } = useKenneyModel(url, {
    size: footprint,
    rotationY,
    highlight: hovered || isSelected ? HIGHLIGHT : 0,
  });

  const meta = LANDMARK_META[kind];

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    select({ kind });
  };

  return (
    <>
      <group position={position}>
        <group ref={pulseRef} onClick={pick} {...bind}>
          <RoundedBox args={[size.x + 0.5, 0.12, size.z + 0.5]} radius={0.04} position={[0, 0.06, 0]} receiveShadow>
            <meshStandardMaterial color={accent} roughness={0.6} />
          </RoundedBox>
          <group position={[0, 0.12, 0]}>
            <primitive object={root} />
          </group>
        </group>
        <SceneTag
          visible={hovered || isSelected}
          position={[0, size.y + 0.6, 0]}
          code={meta.code}
          text={`${meta.nome} · ${metric}`}
          accent={accent}
        />
      </group>

      {/* Fora do grupo acima: a âncora é do mundo (o billboard precisa dela) e o pulso de saúde
          esticaria a placa junto. */}
      <BuildingSign
        anchor={landmarkSignAnchor(position[0])}
        code={meta.code}
        name={meta.nome}
        accent={accent}
        focused={hovered || isSelected}
        onClick={pick}
        bind={bind}
      />
    </>
  );
}
