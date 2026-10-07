import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePerfStore } from './perf';

/** Lê `renderer.info` a cada meio segundo (só montado com `?perf`). */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const last = useRef(0);
  const set = usePerfStore((s) => s.set);

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (last.current === 0) last.current = now;
    if (now - last.current < 500) return;
    const { render, memory } = gl.info;
    set({
      fps: Math.round((frames.current * 1000) / (now - last.current)),
      calls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
    });
    frames.current = 0;
    last.current = now;
  });

  return null;
}
