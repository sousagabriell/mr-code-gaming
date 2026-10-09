import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { useCityLayout, useWorld } from '../hooks/useWorld';
import { useYard } from '../hooks/useYard';
import { entityKey, useUiStore } from '../store/uiStore';
import { getMover } from './movers';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { INTERIOR_BOUNDS, INTERIOR_CAMERA } from '../world/interiors';
import { OVERVIEW_CAMERA, type Vec3 } from '../world/layout';
import { entityPosition } from '../world/positions';
import { YARD_CAMERA } from '../world/yard';

/** Distância máxima da câmera ao focar uma entidade — aproxima sem "colar" no objeto. */
export const FOCUS_DISTANCE = 15;
/** No pátio as caixas são pequenas, mas o contexto das zonas importa mais que o detalhe. */
const YARD_FOCUS_DISTANCE = 19;

export function CameraRig() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const setControls = useUiStore((s) => s.setControls);
  const selected = useUiStore((s) => s.selected);
  const focusNonce = useUiStore((s) => s.focusNonce);
  const layout = useCityLayout();
  const { chamados, faturas } = useWorld();
  const { idProjeto: yard, layout: yardLayout } = useYard();
  const interior = useUiStore((s) => s.interior);
  const reduced = useReducedMotion();

  // Movimento reduzido: a câmera "corta" para o destino em vez de deslizar.
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.smoothTime = reduced ? 0.0001 : 0.25;
  }, [reduced]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Arrastar com o botão esquerdo = pan; direito = girar (preso ao ângulo isométrico); roda = zoom.
    controls.mouseButtons.left = CameraControlsImpl.ACTION.TRUCK;
    controls.mouseButtons.right = CameraControlsImpl.ACTION.ROTATE;
    controls.mouseButtons.wheel = CameraControlsImpl.ACTION.DOLLY;
    controls.mouseButtons.middle = CameraControlsImpl.ACTION.DOLLY;
    controls.touches.one = CameraControlsImpl.ACTION.TOUCH_TRUCK;
    controls.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_ROTATE;
    controls.minDistance = 6;
    controls.maxDistance = 48;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.05;
    controls.dollySpeed = 0.5;
    controls.dollyToCursor = true;
    controls.smoothTime = 0.25;
    controls.setLookAt(...OVERVIEW_CAMERA.position, ...OVERVIEW_CAMERA.target, false);

    // Mexeu na câmera com o mouse/dedo: deixa de seguir a entidade.
    const stopFollow = () => useUiStore.getState().setFollow(false);
    controls.addEventListener('controlstart', stopFollow);

    setControls(controls);
    return () => {
      controls.removeEventListener('controlstart', stopFollow);
      setControls(null);
    };
  }, [setControls]);

  // O pan fica preso à área visível: a cidade (cresce com os lotes), o pátio aberto ou o interior.
  const bounds = interior ? INTERIOR_BOUNDS[interior] : yard && yardLayout ? yardLayout.bounds : layout.bounds;
  useEffect(() => {
    const { minX, maxX, minZ, maxZ } = bounds;
    controlsRef.current?.setBoundary(new Box3(new Vector3(minX - 2, 0, minZ - 2), new Vector3(maxX + 2, 3, maxZ + 2)));
  }, [bounds]);

  // Entrar no pátio: enquadra todas as zonas assim que o quadro chega.
  const yardWidth = yardLayout?.width ?? null;
  const frameYard = useEffectEvent(() => {
    if (yardWidth === null) return;
    const cam = YARD_CAMERA(yardWidth);
    controlsRef.current?.setLookAt(...cam.position, ...cam.target, true);
  });
  const yardReady = yardWidth !== null;
  useEffect(() => {
    if (yard) frameYard();
  }, [yard, yardReady]);

  // Entrar num interior: enquadra a sala (não depende de dado nenhum, o layout é fixo).
  useEffect(() => {
    if (!interior) return;
    const cam = INTERIOR_CAMERA[interior];
    controlsRef.current?.setLookAt(...cam.position, ...cam.target, true);
  }, [interior]);

  const target = useMemo((): Vec3 | null => {
    if (!selected) return null;
    if (selected.kind === 'atividade') {
      const crate = yardLayout?.crates.find((c) => c.atividade.idAtividade === selected.id);
      return crate ? [crate.position[0], crate.position[1] + 0.4, crate.position[2]] : null;
    }
    // Nos interiores não há entidade para voar até: o painel é todo HUD.
    return yard || interior ? null : entityPosition(selected, layout, { chamados, faturas });
  }, [selected, layout, chamados, faturas, yard, interior, yardLayout]);
  const targetKey = target?.join(',');

  // Voa até a seleção. Depende de targetKey para também focar quando os dados chegam depois
  // (seleção restaurada da URL) — o refetch periódico não muda a chave, então não "puxa" a câmera.
  const flyToTarget = useEffectEvent(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // Entidades que se movem (caminhão, pedestre) são focadas onde estão agora.
    const mover = selected && !yard ? getMover(entityKey(selected)) : undefined;
    const point = mover ? ([mover.position.x, 0.3, mover.position.z] as Vec3) : target;
    if (!point) return;
    controls.moveTo(point[0], point[1], point[2], true);
    const max = yard ? YARD_FOCUS_DISTANCE : FOCUS_DISTANCE;
    if (controls.distance > max) controls.dollyTo(max, true);
  });

  useEffect(() => {
    flyToTarget();
  }, [focusNonce, targetKey]);

  // Modo seguir: a cada frame o alvo da câmera acompanha o objeto (com o amortecimento do controle).
  useFrame(() => {
    const { follow, selected: sel } = useUiStore.getState();
    if (!follow || !sel || yard) return;
    const mover = getMover(entityKey(sel));
    if (mover) controlsRef.current?.moveTo(mover.position.x, 0.3, mover.position.z, true);
  });

  return <CameraControls ref={controlsRef} makeDefault />;
}
