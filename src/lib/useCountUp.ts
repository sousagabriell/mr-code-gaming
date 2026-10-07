import { useEffect, useRef, useState } from 'react';

/** Anima a transição entre valores — efeito "contador de SimCity" no HUD. */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    let raf = 0;
    const start = performance.now();

    function tick(now: number) {
      // O timestamp do rAF pode ser anterior ao `start` (frame já começado): sem o max(0) o
      // progresso fica negativo e o número "passa" para o lado errado (ex.: -R$ 4,4 mil).
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - (1 - t) * (1 - t);
      setValue(from + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
