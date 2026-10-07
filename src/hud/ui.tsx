import type { ComponentProps, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { label, statusTone, type Tone } from '../world/status';
import { cx, TONE_CLASS, TONE_HEX } from './tones';

export function Glass({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-white/70 bg-white/85 shadow-card backdrop-blur-xl', className)}>
      {children}
    </div>
  );
}

export function StatusChip({ status, tone, className }: { status: string; tone?: Tone; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold',
        TONE_CLASS[tone ?? statusTone(status)],
        className
      )}
    >
      {label(status)}
    </span>
  );
}

export function ToneDot({ tone }: { tone: Tone }) {
  return <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE_HEX[tone] }} />;
}

export function ProgressBar({ value, tone = 'info', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-surface-2', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: TONE_HEX[tone] }}
      />
    </div>
  );
}

export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line/70">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
          <dt className="text-ink-2">{k}</dt>
          <dd className="truncate text-right font-medium text-ink tabular">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ListRow({
  title,
  subtitle,
  right,
  onClick,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2 disabled:hover:bg-transparent"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{title}</span>
        {subtitle && <span className="block truncate text-[11px] text-ink-3">{subtitle}</span>}
      </span>
      {right}
      {onClick && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-ink-2" />}
    </button>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="px-2 py-1 text-[12px] text-ink-3">{children}</p>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-[0_4px_14px_rgb(19_76_237/0.25)]',
  secondary: 'bg-white text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-white text-bad border border-bad/25 hover:bg-bad-soft',
};

export function Button({
  variant = 'secondary',
  className,
  children,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANT[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label: ariaLabel,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cx(
        'grid h-8 w-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        className
      )}
    >
      {children}
    </button>
  );
}

/** Ícone em quadrado azul suave — cabeçalho dos KPIs e do inspector. */
export function IconTile({ children, tone = 'info' }: { children: ReactNode; tone?: Tone }) {
  return <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', TONE_CLASS[tone])}>{children}</span>;
}
