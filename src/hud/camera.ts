import { CameraControlsImpl } from '@react-three/drei';
import { qk, queryClient } from '../api/queryClient';
import { useUiStore } from '../store/uiStore';
import type { KanbanColunaDTO } from '../types/domain';
import { INTERIOR_CAMERA } from '../world/interiors';
import { OVERVIEW_CAMERA } from '../world/layout';
import { buildYardLayout, YARD_CAMERA } from '../world/yard';

export function goOverview(controls: CameraControlsImpl | null) {
  controls?.setLookAt(...OVERVIEW_CAMERA.position, ...OVERVIEW_CAMERA.target, true);
}

export function rotateQuarter(controls: CameraControlsImpl | null, direction: 1 | -1) {
  controls?.rotate(direction * (Math.PI / 2), 0, true);
}

export function zoomStep(controls: CameraControlsImpl | null, direction: 1 | -1) {
  controls?.dolly(direction * 4, true);
}

export function panStep(controls: CameraControlsImpl | null, dx: number, dz: number) {
  controls?.truck(dx, 0, true);
  controls?.forward(dz, true);
}

/**
 * Liga/desliga o pan do botão esquerdo. Desligado enquanto o ponteiro está sobre algo arrastável:
 * o camera-controls recebe o pointerdown antes do R3F e começaria a arrastar o mapa junto.
 */
export function setPanEnabled(controls: CameraControlsImpl | null, on: boolean) {
  if (!controls) return;
  controls.mouseButtons.left = on ? CameraControlsImpl.ACTION.TRUCK : CameraControlsImpl.ACTION.NONE;
  controls.touches.one = on ? CameraControlsImpl.ACTION.TOUCH_TRUCK : CameraControlsImpl.ACTION.NONE;
}

/** Botão ⌂ / tecla H: reenquadra o cenário atual — cidade, pátio, agência ou biblioteca. */
export function goHome(controls: CameraControlsImpl | null) {
  const { yard, interior } = useUiStore.getState();
  if (interior) {
    const cam = INTERIOR_CAMERA[interior];
    controls?.setLookAt(...cam.position, ...cam.target, true);
    return;
  }
  const colunas = yard ? queryClient.getQueryData<KanbanColunaDTO[]>(qk.kanban(yard)) : undefined;
  if (yard && colunas) {
    const cam = YARD_CAMERA(buildYardLayout(colunas).width);
    controls?.setLookAt(...cam.position, ...cam.target, true);
  } else {
    goOverview(controls);
  }
}

/** Hover sobre algo arrastável: liga/desliga o pan da câmera atual (lida do store). */
export function setHoverPan(on: boolean) {
  setPanEnabled(useUiStore.getState().controls, on);
}

/** Trava a câmera inteira durante um arraste (cancela gesto em curso) e destrava ao soltar. */
export function setCameraLocked(locked: boolean, panAfterUnlock = true) {
  const controls = useUiStore.getState().controls;
  if (!controls) return;
  controls.enabled = !locked;
  setPanEnabled(controls, !locked && panAfterUnlock);
}
