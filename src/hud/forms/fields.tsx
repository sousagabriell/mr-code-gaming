import type { ReactNode } from 'react';
import type { Prioridade } from '../../types/domain';
import { PRIORIDADE_COLOR } from '../../world/colors';
import { label } from '../../world/status';
import { cx } from '../tones';

export const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-bad';

export function Field({
  label: text,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="text-[12px] font-semibold text-ink-2">
        {text}
        {required && <span className="text-bad"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] font-medium text-bad">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-[11px] text-ink-3">{hint}</span>
      )}
    </label>
  );
}

const PRIORIDADES: Prioridade[] = ['Baixa', 'Media', 'Alta'];

/** Seletor de prioridade em "pílulas" coloridas. */
export function PrioridadePicker({ value, onChange }: { value: Prioridade; onChange: (p: Prioridade) => void }) {
  return (
    <div className="mt-1 grid grid-cols-3 gap-1.5">
      {PRIORIDADES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cx(
            'flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[12px] font-semibold transition',
            value === p ? 'border-transparent bg-ink text-white' : 'border-line bg-white text-ink-2 hover:bg-surface-2'
          )}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: PRIORIDADE_COLOR[p] }} />
          {label(p)}
        </button>
      ))}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mb-3 rounded-lg bg-bad-soft px-3 py-2 text-[12px] font-medium text-bad">{message}</p>;
}
