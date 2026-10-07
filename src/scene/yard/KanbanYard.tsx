import { Suspense, useMemo, useState } from 'react';
import { Html, Line, RoundedBox } from '@react-three/drei';
import { ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react';
import { useMoverAtividade, useReordenarColuna } from '../../api/kanban';
import { useNow } from '../../hooks/useNow';
import { useYard } from '../../hooks/useYard';
import { useUiStore } from '../../store/uiStore';
import { COLORS } from '../../world/colors';
import type { Vec3 } from '../../world/layout';
import { projetoCode } from '../../world/status';
import { dropIndex, ZONE_D, ZONE_W, zoneAt, type YardCrate, type YardLayout, type YardZone } from '../../world/yard';
import { coneModel } from '../assets';
import { labelsPortalTarget } from '../labelsPortal';
import { Prop } from '../Prop';
import { SceneTag } from '../SceneTag';
import { Crate } from './Crate';
import { Forklift } from './Forklift';

const WAREHOUSE_Z = -ZONE_D / 2 - 1.25;
const WAREHOUSE_H = 2;

function rectPoints(w: number, d: number): Vec3[] {
  return [
    [-w / 2, 0, -d / 2],
    [w / 2, 0, -d / 2],
    [w / 2, 0, d / 2],
    [-w / 2, 0, d / 2],
    [-w / 2, 0, -d / 2],
  ];
}

const LABEL_BTN = 'grid h-6 w-6 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30';

function ZoneLabel({ zone, count, idProjeto, total }: { zone: YardZone; count: number; idProjeto: number; total: number }) {
  const openDrawer = useUiStore((s) => s.openDrawer);
  const reordenar = useReordenarColuna();
  const { coluna, index } = zone;
  const move = (dir: -1 | 1) => reordenar.mutate({ idProjeto, idColuna: coluna.idColuna, novaOrdem: index + dir });

  return (
    // Já está dentro do grupo posicionado na zona — coordenadas locais.
    <Html position={[0, 0.05, ZONE_D / 2 + 0.6]} center portal={labelsPortalTarget} zIndexRange={[10, 0]}>
      <div className="flex items-center gap-0.5 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-3 pr-0.5 shadow-[0_4px_14px_rgb(30_41_90/0.16)]">
        <span className={`text-[12px] font-bold ${coluna.ehColunaConclusao ? 'text-ok' : 'text-ink'}`}>{coluna.nome}</span>
        <span className="ml-1 mr-1 rounded-full bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-2 tabular">{count}</span>
        <button className={LABEL_BTN} disabled={index === 0} onClick={() => move(-1)} title="Mover zona para a esquerda" aria-label="Mover zona para a esquerda">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button className={LABEL_BTN} disabled={index === total - 1} onClick={() => move(1)} title="Mover zona para a direita" aria-label="Mover zona para a direita">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button className={LABEL_BTN} onClick={() => openDrawer({ form: 'editar-coluna', idProjeto, idColuna: coluna.idColuna })} title="Renomear ou remover zona" aria-label="Editar zona">
          <Pencil className="h-3 w-3" />
        </button>
        <button
          className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-hover"
          onClick={() => openDrawer({ form: 'nova-atividade', idProjeto, idColuna: coluna.idColuna })}
          title="Nova atividade nesta zona"
          aria-label="Nova atividade nesta zona"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </Html>
  );
}

function Warehouse({ layout, label }: { layout: YardLayout; label: string }) {
  const width = layout.width + 2;
  return (
    <group position={[0, 0, WAREHOUSE_Z]}>
      <mesh position={[0, WAREHOUSE_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, WAREHOUSE_H, 1.6]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.85} />
      </mesh>
      <mesh position={[0, WAREHOUSE_H + 0.08, 0]} castShadow>
        <boxGeometry args={[width + 0.15, 0.16, 1.75]} />
        <meshStandardMaterial color={COLORS.brandBlue} roughness={0.6} />
      </mesh>
      {/* Uma doca por zona, como na referência */}
      {layout.zones.map((zone) => (
        <group key={zone.coluna.idColuna} position={[zone.center[0], 0, 0.81]}>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[1.5, 1.44, 0.03]} />
            <meshStandardMaterial color={COLORS.brandBlue} />
          </mesh>
          <mesh position={[0, 0.66, 0.02]}>
            <boxGeometry args={[1.3, 1.3, 0.02]} />
            <meshStandardMaterial color={zone.coluna.ehColunaConclusao ? '#bbf7d0' : '#cbd5e1'} />
          </mesh>
        </group>
      ))}
      <SceneTag position={[0, WAREHOUSE_H + 0.6, 0]} code={label} text="Pátio de obras" />
    </group>
  );
}

/** Empilhadeira de cada responsável, estacionada na frente da caixa em que está trabalhando. */
function useForklifts(layout: YardLayout | null) {
  return useMemo(() => {
    if (!layout) return [];
    const lastZone = layout.zones.length - 1;
    const byPessoa = new Map<number, { nome: string; crate: YardCrate; score: number }>();
    for (const crate of layout.crates) {
      const a = crate.atividade;
      if (!a.idUsuarioAdminResponsavel || crate.coluna.ehColunaConclusao) continue;
      // Prefere atividades "em andamento" (zonas do meio) às do backlog.
      const score = crate.zoneIndex > 0 && crate.zoneIndex < lastZone ? 2 : 1;
      const atual = byPessoa.get(a.idUsuarioAdminResponsavel);
      if (!atual || score > atual.score) byPessoa.set(a.idUsuarioAdminResponsavel, { nome: a.nomeResponsavel ?? 'Equipe', crate, score });
    }
    return [...byPessoa.entries()].slice(0, 8).map(([id, v]) => ({
      id,
      nome: v.nome,
      idAtividade: v.crate.atividade.idAtividade,
      target: [v.crate.position[0], 0, v.crate.position[2] + 0.62] as Vec3,
    }));
  }, [layout]);
}

export function KanbanYard() {
  const { idProjeto, projeto, layout } = useYard();
  const mover = useMoverAtividade();
  const selected = useUiStore((s) => s.selected);
  const [hoverZone, setHoverZone] = useState<number | null>(null);
  const now = useNow();
  const forklifts = useForklifts(layout);

  if (!layout || !idProjeto) return null;

  function handleDragMove(x: number, z: number) {
    const id = zoneAt(layout!, x, z)?.coluna.idColuna ?? null;
    setHoverZone((prev) => (prev === id ? prev : id));
  }

  function handleDrop(crate: YardCrate, x: number, z: number) {
    setHoverZone(null);
    const zone = zoneAt(layout!, x, z);
    if (!zone) return; // soltou fora: a caixa volta sozinha para a vaga
    const restantes = zone.coluna.atividades.filter((a) => a.idAtividade !== crate.atividade.idAtividade).length;
    const novaOrdem = dropIndex(zone, x, z, restantes);
    if (zone.coluna.idColuna === crate.coluna.idColuna && novaOrdem === crate.slot) return;
    mover.mutate({ idProjeto: idProjeto!, idAtividade: crate.atividade.idAtividade, idColunaDestino: zone.coluna.idColuna, novaOrdem });
  }

  const selectedId = selected?.kind === 'atividade' ? selected.id : null;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={COLORS.ground} />
      </mesh>
      <RoundedBox args={[layout.width + 4, 0.04, ZONE_D + 6]} radius={0.02} position={[0, 0.02, -0.3]} receiveShadow>
        <meshStandardMaterial color={COLORS.road} />
      </RoundedBox>

      <Warehouse layout={layout} label={projeto ? projetoCode(projeto.idProjeto) : 'PR'} />

      {layout.zones.map((zone) => {
        const done = zone.coluna.ehColunaConclusao;
        const isTarget = hoverZone === zone.coluna.idColuna;
        return (
          <group key={zone.coluna.idColuna} position={zone.center}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]} receiveShadow>
              <planeGeometry args={[ZONE_W, ZONE_D]} />
              <meshStandardMaterial color={isTarget ? '#dbe6ff' : done ? '#e3f5e8' : COLORS.ground} />
            </mesh>
            <Line
              points={rectPoints(ZONE_W, ZONE_D)}
              position={[0, 0.055, 0]}
              color={isTarget ? COLORS.brandBlue : done ? COLORS.success : COLORS.zoneLine}
              lineWidth={isTarget ? 3 : 2}
              dashed={!isTarget}
              dashSize={0.25}
              gapSize={0.16}
            />
            <Suspense fallback={null}>
              {[-1, 1].map((side) => (
                <Prop key={side} url={coneModel} size={0.3} fit="height" position={[side * (ZONE_W / 2 - 0.15), 0.05, ZONE_D / 2 - 0.15]} />
              ))}
            </Suspense>
            <ZoneLabel zone={zone} count={zone.coluna.atividades.length} idProjeto={idProjeto} total={layout.zones.length} />
          </group>
        );
      })}

      {layout.crates.map((crate) => (
        <Crate
          key={crate.atividade.idAtividade}
          crate={crate}
          done={crate.coluna.ehColunaConclusao}
          now={now}
          onDragMove={handleDragMove}
          onDrop={handleDrop}
        />
      ))}

      {forklifts.map((f) => (
        <Forklift key={f.id} target={f.target} nome={f.nome} showTag={f.idAtividade === selectedId} />
      ))}
    </group>
  );
}
