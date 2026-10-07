import { create } from 'zustand';

export interface PerfSample {
  fps: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

/** Medições da cena para o medidor `?perf` (orçamento de desempenho no MANUAL-TECNICO.md). */
export const usePerfStore = create<{ sample: PerfSample | null; set: (s: PerfSample) => void }>((set) => ({
  sample: null,
  set: (sample) => set({ sample }),
}));

export const perfEnabled = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf');

/** Orçamento: acima disso o medidor fica vermelho. */
export const PERF_BUDGET = { calls: 450, triangles: 250_000 };
