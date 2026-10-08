import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { MeshBasicMaterial, MeshStandardMaterial, type Group } from 'three';
import type { Vec3 } from '../world/layout';
import { SIGN_FOCUS_SCALE, SIGN_PANEL, SIGN_PANEL_Y, SIGN_POST, SIGN_TILT, signOpacity } from '../world/signs';
import { usePrefsStore } from '../store/prefsStore';
import { createSignTexture, useSignFontsReady } from './signTexture';
import { signView } from './signView';

const POST_COLOR = '#9aa4ba';

interface HoverBind {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
}

/**
 * Placa com o nome da construção: painel sobre um poste, girando no eixo y para sempre encarar a
 * câmera (o azimute é livre, então uma placa presa à fachada ficaria de costas metade do tempo).
 *
 * Monte sempre como **irmão** do grupo do modelo, nunca como filho: tanto a sede quanto o landmark
 * animam a escala do próprio grupo (crescer do chão, pulso de saúde) e isso esticaria a placa junto.
 */
export function BuildingSign({
  anchor,
  code,
  name,
  accent,
  focused = false,
  onClick,
  bind,
}: {
  /** Base do poste no chão, em coordenadas do mundo. */
  anchor: Vec3;
  code: string;
  name: string;
  accent: string;
  /** Hover/seleção: a placa cresce um pouco e ignora o fade de distância. */
  focused?: boolean;
  /** Herdados do prédio: sem eles, clicar na placa cairia no `onPointerMissed` e limparia a seleção. */
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  bind?: HoverBind;
}) {
  const gl = useThree((s) => s.gl);
  const showSigns = usePrefsStore((s) => s.showSigns);
  const fontsReady = useSignFontsReady();
  const groupRef = useRef<Group>(null);

  // Só primitivos na chave: `useWorld()` devolve arrays novos a cada refetch, e re-rasterizar a cidade
  // inteira de 30 em 30 segundos seria caro à toa.
  const materials = useMemo(() => {
    const texture = fontsReady ? createSignTexture({ code, name, accent }) : null;
    // A placa é sempre vista de 30°–58° acima do horizonte, ou seja, em minificação anisotrópica
    // permanente — é a maior alavanca de nitidez que existe aqui.
    if (texture) texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    return {
      // Básico de propósito: com material iluminado o texto escureceria na tempestade e o brilho da
      // placa pulsaria enquanto o usuário gira a cidade (o painel muda de ângulo com a luz).
      // `transparent` fica fixo — alternar isso em runtime recompila o shader e engasga o quadro.
      panel: new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
      post: new MeshStandardMaterial({ color: POST_COLOR, roughness: 0.6, transparent: true }),
    };
  }, [gl, fontsReady, code, name, accent]);

  // Os materiais são mutados fora do render (opacidade por quadro) — por isso ficam num ref, como em
  // `useKenneyModel`.
  const live = useRef(materials);
  useLayoutEffect(() => {
    live.current = materials;
  }, [materials]);

  useEffect(
    () => () => {
      materials.panel.map?.dispose();
      materials.panel.dispose();
      materials.post.dispose();
    },
    [materials]
  );

  useFrame(({ camera }) => {
    const group = groupRef.current;
    const { panel, post } = live.current;
    if (!group) return;

    const opacity = panel.map ? (focused ? 1 : signOpacity(signView.distance)) : 0;
    group.visible = showSigns && opacity > 0.01;
    // `useFrame` segue rodando com o objeto invisível — sem este corte, placa apagada ainda custaria.
    if (!group.visible) return;

    panel.opacity = opacity;
    post.opacity = opacity;
    group.scale.setScalar(focused ? SIGN_FOCUS_SCALE : 1);
    // A âncora é função pura do layout: dá para mirar na câmera sem recalcular matriz de mundo.
    group.rotation.y = Math.atan2(camera.position.x - anchor[0], camera.position.z - anchor[2]);
  });

  return (
    <group ref={groupRef} position={anchor} visible={false} onClick={onClick} {...bind}>
      <mesh position={[0, SIGN_POST.height / 2, 0]} material={materials.post}>
        <cylinderGeometry args={[SIGN_POST.radius, SIGN_POST.radius, SIGN_POST.height, 8]} />
      </mesh>
      {/* Um fio à frente do poste para o painel não atravessá-lo ao girar. */}
      <mesh
        position={[0, SIGN_PANEL_Y, SIGN_POST.radius + 0.02]}
        rotation={[SIGN_TILT, 0, 0]}
        material={materials.panel}
      >
        <planeGeometry args={[SIGN_PANEL.w, SIGN_PANEL.h]} />
      </mesh>
    </group>
  );
}
