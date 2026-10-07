import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import type { Group } from 'three';
import { useCityEvents } from '../../store/cityEvents';
import { useUiStore } from '../../store/uiStore';
import type { TruckPlot } from '../../world/layout';
import { useRegisterMover } from '../movers';
import { SceneTag } from '../SceneTag';
import { useHover } from '../useHover';
import { origemColor } from './origemColor';
import { TruckModel } from './TruckModel';

/** Velocidade máxima na rua (unidades/s) — chega com desaceleração suave. */
const MAX_SPEED = 3.2;

/**
 * Chamado aberto = caminhão na porta do cliente. Se o chamado surgiu durante a sessão, o caminhão
 * chega dirigindo desde a borda oeste da cidade; Em andamento = porta aberta, descarregando.
 */
export function ChamadoTruck({ plot, entryX }: { plot: TruckPlot; entryX: number }) {
  const ref = useRef<Group>(null);
  const placed = useRef(false);
  // Decidido na montagem: caminhões da primeira carga já aparecem estacionados.
  const [arriving] = useState(() => useCityEvents.getState().ready);
  const select = useUiStore((s) => s.select);
  const isSelected = useUiStore((s) => s.selected?.kind === 'chamado' && s.selected.id === plot.chamado.idChamado);
  const { hovered, bind } = useHover();
  useRegisterMover(`chamado:${plot.chamado.idChamado}`, ref);

  const { chamado } = plot;
  const [tx, , tz] = plot.position;
  const unloading = chamado.status === 'EmAndamento';

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    if (!placed.current) {
      g.position.set(arriving ? entryX : tx, 0, tz);
      placed.current = true;
    }
    // Também cobre a "fila andando" quando um caminhão da frente vai embora.
    easing.damp(g.position, 'x', tx, 0.45, delta, MAX_SPEED);
    easing.damp(g.position, 'z', tz, 0.3, delta, MAX_SPEED);
  });

  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'chamado', id: chamado.idChamado });
      }}
      {...bind}
    >
      <TruckModel
        stripe={origemColor(chamado.origem)}
        doorOpen={unloading}
        beacon={chamado.prioridade === 'Alta'}
        highlight={hovered || isSelected}
      />
      {unloading &&
        [0, 1].map((i) => (
          <mesh key={i} position={[-0.78 - i * 0.22, 0.09, 0.05 - i * 0.12]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial color="#d9b48a" />
          </mesh>
        ))}
      <SceneTag
        visible={hovered || isSelected}
        position={[0, 0.95, 0]}
        code={chamado.origem}
        text={chamado.assunto}
        accent={origemColor(chamado.origem)}
      />
    </group>
  );
}
