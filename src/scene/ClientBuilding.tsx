import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { easing } from 'maath';
import type { Group } from 'three';
import type { ClientPlot } from '../world/layout';
import { CLIENT_COLOR_BY_STATE, COLORS, PRIORIDADE_COLOR } from '../world/colors';
import { clienteCode, clienteNome, worstPrioridade } from '../world/status';
import { useUiStore } from '../store/uiStore';
import { buildingFor } from './assets';
import { HIGHLIGHT, useKenneyModel } from './kenney';
import { MapPin } from './MapPin';
import { SceneTag } from './SceneTag';
import { useHover } from './useHover';
import { motion } from './motion';

/** Lado maior da base da sede (os prédios da Kenney têm ~1 unidade). */
const FOOTPRINT = 1.5;
/** Cliente inativo: prédio dessaturado, de "luzes apagadas". */
const INACTIVE_TINT = '#b8bfcc';

export function ClientBuilding({ plot }: { plot: ClientPlot }) {
  const groupRef = useRef<Group>(null);
  const select = useUiStore((s) => s.select);
  const isSelected = useUiStore((s) => s.selected?.kind === 'cliente' && s.selected.id === plot.cliente.idCliente);
  const { hovered, bind } = useHover();

  const status = CLIENT_COLOR_BY_STATE[plot.colorState];
  const inactive = plot.colorState === 'encerrado';
  const [x, , z] = plot.position;
  const highlight = hovered || isSelected;

  // Prédio Kenney escolhido pelo porte do contrato (fixo por cliente); inativo fica acinzentado.
  const { root, size } = useKenneyModel(buildingFor(plot.cliente.idCliente, plot.height), {
    size: FOOTPRINT,
    tint: inactive ? INACTIVE_TINT : undefined,
    highlight: highlight ? HIGHLIGHT : 0,
  });
  const h = size.y;

  const worst = worstPrioridade(plot.chamadosAbertos);
  const pinColor = plot.faturasAtrasadas.length > 0 || worst === 'Alta' ? PRIORIDADE_COLOR.Alta : worst ? PRIORIDADE_COLOR[worst] : null;

  // Sobe do chão ao aparecer (primeiro carregamento ou sede recém-construída). A escala inicial é
  // aplicada só uma vez — passá-la como prop faria a sede "desabar" a cada re-render.
  useLayoutEffect(() => {
    if (!motion.reduced) groupRef.current?.scale.set(1, 0.001, 1);
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) easing.damp(groupRef.current.scale, 'y', 1, 0.35, delta);
  });

  return (
    <group position={[x, 0, z]}>
      {/* Base colorida = estado do contrato (azul ativo · âmbar pendente · cinza encerrado/sem contrato). */}
      <RoundedBox args={[size.x + 0.3, 0.08, size.z + 0.3]} radius={0.03} position={[0, 0.04, 0]} receiveShadow>
        <meshStandardMaterial color={status} roughness={0.7} />
      </RoundedBox>

      <group
        ref={groupRef}
        position={[0, 0.08, 0]}
        onClick={(e) => {
          e.stopPropagation();
          select({ kind: 'cliente', id: plot.cliente.idCliente });
        }}
        {...bind}
      >
        <primitive object={root} />
      </group>

      {pinColor && <MapPin position={[0, h + 0.3, 0]} color={pinColor} />}

      <SceneTag
        visible={highlight || plot.chamadosAbertos.length > 0}
        position={[0, h + (pinColor ? 1.1 : 0.55), 0]}
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
