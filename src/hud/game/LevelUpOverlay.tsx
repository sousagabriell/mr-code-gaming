import { useEffect, useMemo } from 'react';
import { PartyPopper, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const CONFETTI_COLORS = ['#134ced', '#5e4ced', '#f59e0b', '#22c55e', '#ef4444', '#38bdf8'];

/** Celebração de subida de nível: confete + o que foi desbloqueado na cidade. */
export function LevelUpOverlay() {
  const celebration = useGameStore((s) => s.celebration);
  const dismiss = useGameStore((s) => s.dismissCelebration);

  // Confete com posições fixas por peça (sem Math.random no render).
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 9) * 0.08,
        duration: 1.6 + (i % 5) * 0.25,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: (i * 47) % 360,
      })),
    []
  );

  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(dismiss, 6500);
    return () => clearTimeout(id);
  }, [celebration, dismiss]);

  if (!celebration) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" role="status" aria-live="polite">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      {/* Abaixo da pilha de toasts (que fica no topo), para os dois aparecerem juntos. */}
      <div className="absolute inset-x-0 top-[36vh] flex justify-center px-4">
        <div className="levelup-pop pointer-events-auto relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-float">
          <button onClick={dismiss} className="absolute right-3 top-3 text-ink-3 hover:text-ink" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-brand to-brand-purple text-white">
            <PartyPopper className="h-7 w-7" />
          </span>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand">
            {celebration.offline ? 'Enquanto você estava fora' : 'Subiu de nível!'}
          </p>
          <p className="text-[34px] font-extrabold leading-tight text-ink">Nível {celebration.level}</p>
          {celebration.unlock ? (
            <p className="mt-1 text-[13px] text-ink-2">
              Desbloqueado na cidade: <span className="font-semibold text-ink">{celebration.unlock}</span>
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-ink-2">A cidade está crescendo. Continue entregando!</p>
          )}
        </div>
      </div>
    </div>
  );
}
