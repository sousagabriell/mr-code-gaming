import { CheckCircle2, Info, Sparkles, TriangleAlert, X } from 'lucide-react';
import { useToastStore, type ToastTone } from '../store/toastStore';
import { cx } from './tones';

const ICON: Record<ToastTone, typeof Info> = { ok: CheckCircle2, bad: TriangleAlert, info: Info, xp: Sparkles };
const ICON_CLASS: Record<ToastTone, string> = { ok: 'text-ok', bad: 'text-bad', info: 'text-brand', xp: 'text-brand-purple' };

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[76px] z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-float',
              t.tone === 'xp' ? 'border-brand-purple/25 bg-linear-to-r from-white to-[#f1efff]' : 'border-line bg-white'
            )}
            role={t.tone === 'bad' ? 'alert' : 'status'}
          >
            <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', ICON_CLASS[t.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{t.title}</p>
              {t.detail && <p className="truncate text-[12px] text-ink-2">{t.detail}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-ink-3 hover:text-ink" aria-label="Fechar">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
