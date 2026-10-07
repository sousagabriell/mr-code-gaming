import { PERF_BUDGET, perfEnabled, usePerfStore } from '../scene/perf';

/** Medidor de desempenho da cena — abra a URL com `?perf`. */
export function PerfOverlay() {
  const sample = usePerfStore((s) => s.sample);
  if (!perfEnabled() || !sample) return null;
  const over = (v: number, max: number) => (v > max ? 'text-bad' : 'text-ok');
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink/85 px-3 py-1.5 font-mono text-[11px] text-white tabular">
      {sample.fps} fps · <span className={over(sample.calls, PERF_BUDGET.calls)}>{sample.calls} draws</span> ·{' '}
      <span className={over(sample.triangles, PERF_BUDGET.triangles)}>{(sample.triangles / 1000).toFixed(0)}k tris</span> ·{' '}
      {sample.geometries} geo · {sample.textures} tex
    </div>
  );
}
