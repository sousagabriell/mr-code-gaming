import { useGame } from '../../hooks/useGame';
import { useGameStore } from '../../store/gameStore';
import { cx, TONE_CLASS } from '../tones';
import { WEATHER_META } from './weatherMeta';

/** Nível da cidade com anel de progresso — abre o painel do jogo. */
export function LevelBadge() {
  const { level, xp } = useGame();
  const openPanel = useGameStore((s) => s.openPanel);
  const r = 15;
  const c = 2 * Math.PI * r;

  return (
    <button
      onClick={() => openPanel('cidade')}
      data-tour="level"
      aria-label={`Nível ${level.level}, ${xp.total} XP — abrir painel do jogo`}
      className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/85 py-1 pl-1 pr-3 shadow-card backdrop-blur-xl hover:bg-white"
      title={`${xp.total.toLocaleString('pt-BR')} XP · faltam ${(level.xpForNext - level.xpInLevel).toLocaleString('pt-BR')} para o nível ${level.level + 1}`}
    >
      <span className="relative grid h-9 w-9 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="#e8eefe" strokeWidth="3.5" />
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="url(#lvl)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - level.progress)}
            className="transition-[stroke-dashoffset] duration-700"
          />
          <defs>
            <linearGradient id="lvl" x1="0" x2="1">
              <stop offset="0%" stopColor="#134ced" />
              <stop offset="100%" stopColor="#5e4ced" />
            </linearGradient>
          </defs>
        </svg>
        <span className="text-[13px] font-extrabold text-ink tabular">{level.level}</span>
      </span>
      <span className="hidden whitespace-nowrap text-left leading-tight xl:block">
        <span className="block text-[12px] font-bold text-ink">Nível {level.level}</span>
        <span className="block text-[11px] text-ink-3 tabular">{xp.total.toLocaleString('pt-BR')} XP</span>
      </span>
    </button>
  );
}

/** Saúde da cidade e o clima que ela produz na cena. */
export function HealthChip() {
  const { health } = useGame();
  const openPanel = useGameStore((s) => s.openPanel);
  const meta = WEATHER_META[health.weather];
  const Icon = meta.icon;

  return (
    <button
      onClick={() => openPanel('saude')}
      data-tour="health"
      aria-label={`Saúde da cidade ${health.score} de 100, ${meta.label}`}
      className={cx('flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold', TONE_CLASS[meta.tone])}
      title={`Saúde da cidade: ${health.score}/100 · ${meta.label}`}
    >
      <Icon className="h-4 w-4" />
      <span className="tabular">{health.score}</span>
    </button>
  );
}
