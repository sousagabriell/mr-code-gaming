import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { BuildGhost } from './BuildGhost';
import { CameraRig } from './CameraRig';
import { Citizens } from './Citizens';
import { ClientBuilding } from './ClientBuilding';
import { ConstructionSite } from './ConstructionSite';
import { Ground } from './Ground';
import { Landmark } from './Landmark';
import { SelectionMarker } from './SelectionMarker';
import { labelsPortal } from './labelsPortal';
import { KanbanYard } from './yard/KanbanYard';
import { ChamadoTruck } from './vehicles/ChamadoTruck';
import { EventVehicles } from './vehicles/EventVehicles';
import { useCityEventDetector } from './vehicles/useCityEventDetector';
import { Walkers } from './Walkers';
import { useCityLayout, useWorld } from '../hooks/useWorld';
import { useUiStore } from '../store/uiStore';
import { useGame } from '../hooks/useGame';
import { CityDecor } from './CityDecor';
import { Weather } from './Weather';
import { WEATHER_STYLE } from './weatherStyle';
import { OVERVIEW_CAMERA } from '../world/layout';
import { entityPosition } from '../world/positions';


function selectionSize(kind: string): number {
  if (kind === 'projeto') return 1.3;
  if (kind === 'cliente' || kind === 'chamado' || kind === 'fatura') return 2;
  return 3;
}

function City() {
  const world = useWorld();
  const layout = useCityLayout();
  const { level } = useGame();
  const selected = useUiStore((s) => s.selected);
  const buildMode = useUiStore((s) => s.buildMode);

  const marker = useMemo(() => {
    // Pedestre em movimento não tem lugar fixo para marcar (a câmera o segue).
    if (!selected || selected.kind === 'colaborador') return null;
    const pos = entityPosition(selected, layout, world);
    return pos ? { pos, size: selectionSize(selected.kind) } : null;
  }, [selected, layout, world]);

  // Pedestres "genéricos" só para dar vida à praça; quem tem atividade aberta anda pelas ruas (Walkers).
  const citizenCount = 4;
  useCityEventDetector(layout, world.faturas, !world.isLoading);

  return (
    <>
      <Ground layout={layout} buildMode={buildMode} />

      {layout.landmarks.map((l) => (
        <Landmark key={l.kind} kind={l.kind} position={l.position} />
      ))}
      {layout.clientPlots.map((plot) => (
        <ClientBuilding key={plot.cliente.idCliente} plot={plot} />
      ))}
      {layout.constructionSites.map((site) => (
        <ConstructionSite key={site.projeto.idProjeto} plot={site} />
      ))}

      <Citizens count={citizenCount} />
      <Walkers layout={layout} />

      {layout.trucks.map((t) => (
        <ChamadoTruck key={t.chamado.idChamado} plot={t} entryX={layout.bounds.minX - 3} />
      ))}
      <EventVehicles exitX={layout.bounds.maxX + 3} />

      {marker && <SelectionMarker position={marker.pos} size={marker.size} />}
      <BuildGhost lot={layout.nextLot} active={buildMode} />
      <CityDecor unlocked={level.unlocked} />
    </>
  );
}

/** Luz, céu e câmera são comuns; o conteúdo alterna entre a cidade e o pátio de um projeto. */
function Scene() {
  const yard = useUiStore((s) => s.yard);
  // O clima é a saúde da cidade (gamificação): sol, nublado, chuva ou tempestade.
  const { health } = useGame();
  const style = WEATHER_STYLE[health.weather];
  const sky = style.sky;

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 38, 80]} />

      {/* Iluminação física (three r155+): ~π de irradiância total ≈ cor do material sem estourar. */}
      <hemisphereLight args={['#ffffff', '#cfd6ea', style.hemi]} />
      <directionalLight
        position={[10, 18, 9]}
        intensity={style.sun}
        color={style.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />

      <CameraRig />
      <Weather kind={health.weather} />
      {yard ? <KanbanYard /> : <City />}
    </>
  );
}

export function CityScene() {
  const clearSelection = useUiStore((s) => s.clearSelection);
  const [dpr, setDpr] = useState(1.5);
  // Oclusão ambiente (cantos e contatos mais "maquete"): começa desligada e só liga quando o
  // PerformanceMonitor confirma folga de fps — em GPU fraca/software ela derruba a taxa de quadros.
  const [ao, setAo] = useState(false);

  return (
    <div className="relative h-full w-full">
      <Canvas
        className="h-full w-full"
        shadows="percentage"
        flat
        dpr={dpr}
        camera={{ fov: 32, position: OVERVIEW_CAMERA.position, near: 0.5, far: 220 }}
        onPointerMissed={(e) => {
          if (e.button === 0) clearSelection();
        }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
            setAo(false);
          }}
          onIncline={() => {
            setDpr(Math.min(2, window.devicePixelRatio));
            setAo(true);
          }}
        />
        <AdaptiveDpr pixelated={false} />
        <Scene />
        {ao && (
          <EffectComposer multisampling={4}>
            <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={0.8} halfRes color="#3b4566" />
          </EffectComposer>
        )}
      </Canvas>
      <div ref={labelsPortal} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
