import { useCallback, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDistricts, type District } from '../hooks/useDistricts';
import { useUiStore } from '../store/uiStore';
import { goOverview } from './camera';
import { cx } from './tones';
import { useClickOutside } from './useClickOutside';

function CodeBadge({ code, active }: { code: string; active?: boolean }) {
  return (
    <span
      className={cx(
        'grid h-8 min-w-11 place-items-center rounded-lg px-1.5 text-[11px] font-bold',
        active ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
      )}
    >
      {code}
    </span>
  );
}

/** Seletor de "site" da referência: cada cliente e cada landmark é um distrito da cidade. */
export function DistrictSelector() {
  const { districts, current } = useDistricts();
  const select = useUiStore((s) => s.select);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const controls = useUiStore((s) => s.controls);
  const yard = useUiStore((s) => s.yard);
  const exitYard = useUiStore((s) => s.exitYard);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  function go(d: District) {
    setOpen(false);
    if (d.target) select(d.target); // select já sai do pátio, se for o caso
    else {
      if (yard) exitYard(false);
      clearSelection();
      goOverview(controls);
    }
  }

  function next() {
    const i = districts.findIndex((d) => d.key === current.key);
    go(districts[(i + 1) % districts.length]);
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-xl border border-white/70 bg-white/85 shadow-card backdrop-blur-xl">
        <button onClick={next} className="flex items-center gap-2.5 rounded-l-xl py-1.5 pl-1.5 pr-2 text-left hover:bg-surface-2/60" title="Próximo distrito">
          <CodeBadge code={current.code} active />
          <span className="min-w-0">
            <span className="block max-w-44 truncate text-[13px] font-semibold text-ink">{current.nome}</span>
            <span className="block max-w-44 truncate text-[11px] text-ink-3">{current.sub}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-3" />
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="grid h-12 w-9 place-items-center rounded-r-xl border-l border-line text-ink-2 hover:bg-surface-2/60"
          aria-label="Escolher distrito"
          aria-expanded={open}
        >
          <ChevronDown className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 max-h-[60vh] w-80 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-float">
          {districts.map((d, i) => (
            <div key={d.key}>
              {(i === 1 || d.key === 'datacenter') && <div className="mx-2 my-1 border-t border-line" />}
              <button
                onClick={() => go(d)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-surface-2',
                  d.key === current.key && 'bg-brand-soft/60'
                )}
              >
                <CodeBadge code={d.code} active={d.key === current.key} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{d.nome}</span>
                  <span className="block truncate text-[11px] text-ink-3">{d.sub}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
