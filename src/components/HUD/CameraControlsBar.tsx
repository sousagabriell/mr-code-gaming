import { useCityStore } from '../../store/cityStore';
import { OVERVIEW_CAMERA } from '../../world/layout';

const BUTTON_CLASS =
  'grid h-8 w-8 place-items-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';

export function CameraControlsBar() {
  const controls = useCityStore((s) => s.controls);
  const clearSelection = useCityStore((s) => s.clearSelection);

  function rotate(direction: 1 | -1) {
    controls?.rotate(direction * (Math.PI / 2), 0, true);
  }

  function resetView() {
    clearSelection();
    controls?.setLookAt(...OVERVIEW_CAMERA.position, ...OVERVIEW_CAMERA.target, true);
  }

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-2 py-1">
      <button onClick={() => rotate(-1)} className={BUTTON_CLASS} aria-label="Girar -90°" title="Girar -90°">
        ⟲
      </button>
      <button onClick={resetView} className={BUTTON_CLASS} aria-label="Visão geral" title="Visão geral">
        ⌂
      </button>
      <button onClick={() => rotate(1)} className={BUTTON_CLASS} aria-label="Girar +90°" title="Girar +90°">
        ⟳
      </button>
    </div>
  );
}
