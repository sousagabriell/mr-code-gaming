import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { formatBRL } from '../../lib/format';
import { deslocarMes, labelMes, mesDe, mesmoMes, type Mes } from '../../world/extrato';
import { cx } from '../tones';

/** Navegador de mês do extrato — ‹ Outubro de 2026 ›, com atalho para o mês corrente. */
export function MesNav({ mes, onChange, hoje }: { mes: Mes; onChange: (m: Mes) => void; hoje: Date }) {
  const atual = mesDe(hoje);
  const btn = 'grid h-7 w-7 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink';

  return (
    <div className="flex items-center gap-1">
      <button className={btn} aria-label="Mês anterior" onClick={() => onChange(deslocarMes(mes, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[132px] text-center text-[13px] font-bold text-ink">{labelMes(mes)}</span>
      <button className={btn} aria-label="Próximo mês" onClick={() => onChange(deslocarMes(mes, 1))}>
        <ChevronRight className="h-4 w-4" />
      </button>
      {!mesmoMes(mes, atual) && (
        <button
          onClick={() => onChange(atual)}
          className="ml-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
        >
          Hoje
        </button>
      )}
    </div>
  );
}

/** Bloco de totais do mês: um número grande e os secundários em chips. */
export function ResumoBloco({
  destaque,
  valor,
  tone = 'ok',
  chips,
}: {
  destaque: string;
  valor: number;
  tone?: 'ok' | 'bad';
  /** `texto` escapa da formatação de moeda (ex.: uma contagem). */
  chips: { label: string; valor?: number; texto?: string; tone?: 'ok' | 'bad' | 'neutral' }[];
}) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{destaque}</p>
      <p className={cx('text-[22px] font-bold leading-tight tabular', tone === 'bad' ? 'text-bad' : 'text-ok')}>
        {formatBRL(valor)}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-2">
        {chips.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="truncate text-[10px] text-ink-3">{c.label}</p>
            <p
              className={cx(
                'truncate text-[12px] font-semibold tabular',
                c.tone === 'bad' ? 'text-bad' : c.tone === 'ok' ? 'text-ok' : 'text-ink'
              )}
            >
              {c.texto ?? formatBRL(c.valor ?? 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BuscaExtrato({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1.5 focus-within:border-brand">
      <Search className="h-3.5 w-3.5 shrink-0 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
      />
    </label>
  );
}

export function SelectExtrato({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-semibold outline-none transition focus:border-brand',
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

/** Cabeçalho de um dia dentro do extrato ("Hoje", "Ontem", "Qua., 08 de outubro"). */
export function DiaLabel({ children }: { children: ReactNode }) {
  return (
    <p className="sticky top-0 z-10 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-3 backdrop-blur-sm">
      {children}
    </p>
  );
}

export function AcaoLinha({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        'grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-colors disabled:opacity-40',
        danger
          ? 'border-bad/25 text-bad hover:bg-bad-soft'
          : 'border-line text-ink-2 hover:border-brand/40 hover:bg-brand-soft hover:text-brand'
      )}
    >
      {children}
    </button>
  );
}

const TONE_ICON = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-neutral-soft text-neutral',
} as const;

/**
 * Uma linha do extrato — a "transação" do portal: ícone de status, título, subtítulo, valor com
 * sinal e as ações. Abrir a edição é um `<button>` **irmão** das ações, não um contêiner delas:
 * aninhar botões faria o nome acessível da linha engolir o das ações (e o clique cair na linha).
 */
export function LinhaExtrato({
  icone,
  tone,
  titulo,
  subtitulo,
  valor,
  sinal,
  chip,
  acoes,
  onClick,
}: {
  icone: ReactNode;
  tone: 'ok' | 'warn' | 'bad' | 'neutral';
  titulo: string;
  subtitulo: string;
  valor: number;
  sinal: '+' | '−' | '';
  chip: ReactNode;
  acoes: ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-1 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', TONE_ICON[tone])}>{icone}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold leading-snug text-ink">{titulo}</span>
          <span className="block truncate text-[10.5px] text-ink-3">{subtitulo}</span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className={cx(
              'block whitespace-nowrap text-[12.5px] font-bold tabular',
              sinal === '+' ? 'text-ok' : sinal === '−' ? 'text-bad' : 'text-ink-2'
            )}
          >
            {sinal}
            {formatBRL(valor)}
          </span>
          {chip}
        </span>
      </button>
      <span className="flex shrink-0 gap-1 pl-1">{acoes}</span>
    </div>
  );
}
