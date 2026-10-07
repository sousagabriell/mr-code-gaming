import { useEffect, useRef } from 'react';
import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useCityStore } from '../store/cityStore';
import { OVERVIEW_CAMERA } from '../world/layout';

export function CameraRig() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const focusRequest = useCityStore((s) => s.focusRequest);
  const setControls = useCityStore((s) => s.setControls);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Estilo Cities: Skylines — arrastar só faz pan, rotação é só via botões de 90°.
    controls.mouseButtons.left = CameraControlsImpl.ACTION.TRUCK;
    controls.mouseButtons.right = CameraControlsImpl.ACTION.NONE;
    controls.mouseButtons.wheel = CameraControlsImpl.ACTION.DOLLY;
    controls.mouseButtons.middle = CameraControlsImpl.ACTION.DOLLY;
    controls.touches.one = CameraControlsImpl.ACTION.TOUCH_TRUCK;
    controls.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK;
    controls.minZoom = 28;
    controls.maxZoom = 170;
    controls.dollySpeed = 0.4;
    controls.smoothTime = 0.22;
    controls.setLookAt(...OVERVIEW_CAMERA.position, ...OVERVIEW_CAMERA.target, false);

    setControls(controls);
    return () => setControls(null);
  }, [setControls]);

  useEffect(() => {
    if (!focusRequest) return;
    controlsRef.current?.setTarget(...focusRequest, true);
  }, [focusRequest]);

  return <CameraControls ref={controlsRef} makeDefault />;
}
