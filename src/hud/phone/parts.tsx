import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cx } from '../tones';

/** Cabeçalho de uma tela do app: título, linha de apoio e, nos segundos níveis, o voltar. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-line px-3 pb-2 pt-1">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="-ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[14px] font-bold leading-tight text-ink">{title}</h2>
        {subtitle && <p className="truncate text-[11px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-[12px] leading-relaxed text-ink-3">{children}</p>;
}

/** Filtro compacto da listagem — `select` nativo, que é o que cabe em 280px de tela. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'min-w-0 flex-1 rounded-lg border px-2 py-1 text-[11px] font-semibold outline-none transition focus:border-brand',
        value ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line bg-surface-2 text-ink-2'
      )}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
