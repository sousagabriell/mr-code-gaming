import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePerfStore } from './perf';

/** Lê `renderer.info` a cada meio segundo (só montado com `?perf`). */
export function PerfProbe() {
  const frames = useRef(0);
  const last = useRef(0);
  const frame = useRef({ calls: 0, triangles: 0 });
  const set = usePerfStore((s) => s.set);

  useFrame(({ gl }) => {
    const { render, memory } = gl.info;
    // Com `autoReset` ligado o three zera o contador a cada `render()`, e o EffectComposer faz vários
    // por quadro — a leitura pegava só o passe final do AO (1 draw call). Zerando à mão uma vez por
    // quadro, o contador soma a cena inteira mais o pós-processamento.
    gl.info.autoReset = false;
    // Este callback roda antes do render, então o contador traz o quadro anterior inteiro.
    if (render.calls > 0) frame.current = { calls: render.calls, triangles: render.triangles };
    gl.info.reset();

    frames.current++;
    const now = performance.now();
    if (last.current === 0) last.current = now;
    if (now - last.current < 500) return;
    set({
      fps: Math.round((frames.current * 1000) / (now - last.current)),
      calls: frame.current.calls,
      triangles: frame.current.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
    });
    frames.current = 0;
    last.current = now;
  });

  return null;
}
