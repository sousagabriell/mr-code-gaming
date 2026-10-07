import { useMemo } from 'react';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { Citizens } from './Citizens';
import { ClientBuilding } from './ClientBuilding';
import { ConstructionSite } from './ConstructionSite';
import { Landmark } from './Landmark';
import { useCityStore } from '../store/cityStore';
import { buildCityLayout } from '../world/layout';
import { isSystemAlert } from '../world/health';

const SKY_NORMAL = '#0a0c13';
const SKY_ALERT = '#1a0a0c';

export function CityScene() {
  const clientes = useCityStore((s) => s.clientes);
  const contratos = useCityStore((s) => s.contratos);
  const projetos = useCityStore((s) => s.projetos);
  const chamados = useCityStore((s) => s.chamados);
  const faturas = useCityStore((s) => s.faturas);
  const observabilidade = useCityStore((s) => s.observabilidade);
  const colaboradores = useCityStore((s) => s.colaboradores);
  const clearSelection = useCityStore((s) => s.clearSelection);

  const layout = useMemo(
    () => buildCityLayout(clientes, contratos, projetos, chamados),
    [clientes, contratos, projetos, chamados]
  );

  const alert = isSystemAlert({ faturas, chamados, observabilidade });
  const sky = alert ? SKY_ALERT : SKY_NORMAL;
  const citizenCount = Math.min(8, colaboradores.filter((c) => c.ativo).length);

  return (
    <Canvas className="h-full w-full" shadows onPointerMissed={clearSelection}>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 18, 42]} />

      <CameraRig />

      <ambientLight intensity={alert ? 0.3 : 0.4} />
      <directionalLight position={[6, 12, 4]} intensity={1.1} color={alert ? '#ff8a7a' : '#ffffff'} castShadow />

      <Citizens count={citizenCount} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#12141f" />
      </mesh>
      <gridHelper args={[60, 60, '#2a2f42', '#181c2b']} position={[0, 0.01, 0]} />

      {layout.landmarks.map((landmark) => (
        <Landmark key={landmark.kind} kind={landmark.kind} position={landmark.position} />
      ))}

      {layout.clientPlots.map((plot) => (
        <ClientBuilding key={plot.cliente.idCliente} plot={plot} />
      ))}

      {layout.constructionSites.map((site) => (
        <ConstructionSite key={site.projeto.idProjeto} plot={site} />
      ))}

      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
