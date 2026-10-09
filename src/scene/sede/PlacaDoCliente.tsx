import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { MeshBasicMaterial } from 'three';
import { PLACA } from '../../world/sede';
import { Slab } from '../interior/Slab';
import { createSignTexture, useSignFontsReady } from '../signTexture';

const COR_MOLDURA = '#b9c3d8';

/**
 * A placa do cliente na parede do fundo — é ela que faz a sala ser o escritório **dele**, e não um
 * escritório qualquer. O cartão é o mesmo do totem da cidade (`signTexture.ts`), só que preso à
 * parede: aqui as paredes da frente não existem e a câmera olha sempre do mesmo lado, então não há
 * billboard.
 */
export function PlacaDoCliente({ code, name, accent }: { code: string; name: string; accent: string }) {
  const gl = useThree((s) => s.gl);
  const fontsReady = useSignFontsReady();

  // Só primitivos na chave, como no `BuildingSign`: o refetch do "Live" troca os arrays do mundo a
  // cada 30 s, e re-rasterizar a placa a cada vez seria trabalho à toa.
  const material = useMemo(() => {
    const texture = fontsReady ? createSignTexture({ code, name, accent }) : null;
    if (texture) texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    // Básico, como o totem: com material iluminado o texto escureceria na sombra da parede. Fica
    // invisível até a fonte chegar — cartão em Arial seria pior que cartão nenhum por um instante.
    return new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, visible: texture !== null });
  }, [gl, fontsReady, code, name, accent]);

  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material]
  );

  const [w, h] = PLACA.size;
  const [px, py, pz] = PLACA.position;
  const borda = 2 * PLACA.moldura;

  return (
    <>
      <Slab
        position={[px, py, pz - PLACA.molduraProf / 2 - 0.01]}
        size={[w + borda, h + borda, PLACA.molduraProf]}
        color={COR_MOLDURA}
      />
      <mesh position={PLACA.position} material={material}>
        <planeGeometry args={PLACA.size} />
      </mesh>
    </>
  );
}
