import { useCallback, useRef } from 'react';
import { Check, Flag, Lock, Medal, Star, Target, Trophy, X } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import { formatBRLCompact, formatDateShort } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useGameStore, type GameTab } from '../../store/gameStore';
import { useUiStore } from '../../store/uiStore';
import { formatarDia } from '../../world/datas';
import { UNLOCKS, weekStart } from '../../world/gamification';
import { METRICA_EM_REAIS, METRICA_LABEL } from '../../world/metas';
import { cx, TONE_CLASS, TONE_HEX } from '../tones';
import { Glass, IconButton, ProgressBar } from '../ui';
import { useClickOutside } from '../useClickOutside';
import { WEATHER_META } from './weatherMeta';

const TABS: { id: GameTab; label: string }[] = [
  { id: 'missoes', label: 'Missões' },
  { id: 'conquistas', label: 'Conquistas' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'saude', label: 'Saúde' },
];

/**
 * Metas da Prefeitura: só as que estão correndo ou acabaram de ser batidas. Agendadas e expiradas
 * ficam na Prefeitura — aqui o painel é sobre o que dá para fazer agora.
 */
function MetasEmJogo() {
  const { metas } = useGame();
  const select = useUiStore((s) => s.select);
  const closePanel = useGameStore((s) => s.closePanel);
  const emJogo = metas.filter((m) => m.situacao === 'ativa' || m.situacao === 'cumprida');
  if (emJogo.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Metas da Prefeitura</p>
        <button
          onClick={() => {
            closePanel();
            select({ kind: 'prefeitura' });
          }}
          className="text-[11px] font-semibold text-brand hover:underline"
        >
          Gerenciar
        </button>
      </div>
      <ul className="space-y-2">
        {emJogo.map(({ meta, progresso, pct, situacao }) => {
          const ok = situacao === 'cumprida';
          return (
            <li key={meta.id} className={cx('rounded-xl border px-3 py-2.5', ok ? 'border-ok/20 bg-ok-soft/50' : 'border-line bg-white')}>
              <div className="flex items-center gap-2">
                <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full', ok ? 'bg-ok text-white' : 'bg-brand-soft text-brand')}>
                  {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Flag className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block truncate text-[13px] font-semibold', ok ? 'text-ok' : 'text-ink')}>{meta.titulo}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {METRICA_LABEL[meta.metrica]}
                    {meta.nomeResponsavel && ` · ${meta.nomeResponsavel}`} · até {formatarDia(meta.fim)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px] font-semibold text-ink-2 tabular">
                    {METRICA_EM_REAIS(meta.metrica) ? formatBRLCompact(progresso) : progresso}/
                    {METRICA_EM_REAIS(meta.metrica) ? formatBRLCompact(meta.alvo) : meta.alvo}
                  </span>
                  <span className={cx('block text-[11px] font-semibold tabular', ok ? 'text-ok' : 'text-ink-3')}>
                    {ok ? '+' : ''}
                    {meta.recompensa} XP
                  </span>
                </span>
              </div>
              {!ok && <ProgressBar value={pct} className="ml-8 mt-2" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Missoes() {
  const { missions } = useGame();
  const done = missions.filter((m) => m.done).length;
  const start = weekStart();
  const end = start + 6 * 86_400_000;

  return (
    <div>
      <MetasEmJogo />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] text-ink-2">
          Semana de {formatDateShort(new Date(start).toISOString())} a {formatDateShort(new Date(end).toISOString())}
        </p>
        <span className="flex items-center gap-0.5" aria-label={`${done} de ${missions.length} missões`}>
          {missions.map((m, i) => (
            <Star key={m.key} className={cx('h-4 w-4', i < done ? 'fill-amber-400 text-amber-400' : 'text-ink-3/40')} />
          ))}
        </span>
      </div>
      <ul className="space-y-2">
        {missions.map((m) => (
          <li key={m.key} className={cx('rounded-xl border px-3 py-2.5', m.done ? 'border-ok/20 bg-ok-soft/50' : 'border-line bg-white')}>
            <div className="flex items-center gap-2">
              <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full', m.done ? 'bg-ok text-white' : 'bg-surface-2 text-ink-3')}>
                {m.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Target className="h-3.5 w-3.5" />}
              </span>
              <span className={cx('flex-1 text-[13px] font-semibold', m.done ? 'text-ok' : 'text-ink')}>{m.titulo}</span>
              <span className="text-[12px] font-semibold text-ink-2 tabular">
                {m.progresso}/{m.meta}
              </span>
            </div>
            {!m.done && m.meta > 1 && <ProgressBar value={m.progresso / m.meta} className="ml-8 mt-2" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Conquistas() {
  const { conquistas } = useGame();
  const unlocked = useGameStore((s) => s.unlocked);
  const total = conquistas.filter((c) => unlocked.includes(c.key) || c.met).length;

  return (
    <div>
      <p className="mb-3 text-[12px] text-ink-2">
        {total} de {conquistas.length} desbloqueadas
      </p>
      <div className="grid grid-cols-2 gap-2">
        {conquistas.map((c) => {
          const on = unlocked.includes(c.key) || c.met;
          return (
            <div key={c.key} className={cx('rounded-xl border p-2.5', on ? 'border-amber-300/50 bg-amber-50' : 'border-line bg-surface-2/60')}>
              <span className={cx('mb-1.5 grid h-8 w-8 place-items-center rounded-lg', on ? 'bg-amber-400 text-white' : 'bg-white text-ink-3')}>
                {on ? <Trophy className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </span>
              <p className={cx('text-[12.5px] font-bold', on ? 'text-ink' : 'text-ink-2')}>{c.nome}</p>
              <p className="text-[11px] leading-snug text-ink-3">{c.descricao}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MEDAL = ['#f59e0b', '#94a3b8', '#b45309'];

function Ranking() {
  const { ranking } = useGame();
  const me = useAuthStore((s) => s.usuario?.idUsuarioAdmin);

  return (
    <div>
      <p className="mb-3 text-[12px] text-ink-2">XP da semana: atividades entregues e chamados resolvidos por responsável.</p>
      {ranking.length === 0 && (
        <p className="rounded-xl bg-surface-2 px-3 py-6 text-center text-[12px] text-ink-3">Ninguém pontuou ainda esta semana. Que tal entregar uma caixa no pátio?</p>
      )}
      <ol className="space-y-1.5">
        {ranking.map((r, i) => (
          <li key={r.id} className={cx('flex items-center gap-3 rounded-xl px-3 py-2', r.id === me ? 'bg-brand-soft/70' : 'bg-white')}>
            <span className="grid h-7 w-7 shrink-0 place-items-center">
              {i < 3 ? <Medal className="h-5 w-5" style={{ color: MEDAL[i] }} /> : <span className="text-[12px] font-bold text-ink-3">{i + 1}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">
                {r.nome}
                {r.id === me && <span className="ml-1 text-[11px] font-medium text-brand">(você)</span>}
              </span>
              <span className="block text-[11px] text-ink-3">
                {r.atividades} entrega(s) · {r.chamados} chamado(s)
              </span>
            </span>
            <span className="text-[13px] font-bold text-ink tabular">{r.xp} XP</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Cidade() {
  const { level, xp } = useGame();
  return (
    <div>
      <div className="mb-4 rounded-2xl bg-linear-to-br from-brand to-brand-purple p-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Mr Code City</p>
        <p className="text-[26px] font-extrabold leading-tight">Nível {level.level}</p>
        <p className="text-[12px] opacity-90 tabular">
          {xp.total.toLocaleString('pt-BR')} XP · faltam {(level.xpForNext - level.xpInLevel).toLocaleString('pt-BR')} para o nível {level.level + 1}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </div>
      </div>

      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">De onde vem o XP</p>
      <ul className="mb-4 divide-y divide-line/70">
        {xp.lines.map((l) => (
          <li key={l.key} className="flex items-center justify-between py-1.5 text-[13px]">
            <span className="text-ink-2">
              {l.label} <span className="text-ink-3">· {l.count}</span>
            </span>
            <span className="font-semibold text-ink tabular">{l.xp.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ul>

      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Construções desbloqueáveis</p>
      <ul className="space-y-1.5">
        {UNLOCKS.map((u) => {
          const on = level.level >= u.level;
          return (
            <li key={u.key} className="flex items-center gap-2 text-[13px]">
              <span className={cx('grid h-6 w-6 place-items-center rounded-full', on ? 'bg-ok text-white' : 'bg-surface-2 text-ink-3')}>
                {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Lock className="h-3 w-3" />}
              </span>
              <span className={cx('flex-1', on ? 'font-semibold text-ink' : 'text-ink-2')}>{u.nome}</span>
              <span className="text-[11px] text-ink-3">nível {u.level}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Saude() {
  const { health } = useGame();
  const meta = WEATHER_META[health.weather];
  const Icon = meta.icon;
  return (
    <div>
      <div className={cx('mb-4 flex items-center gap-3 rounded-2xl p-4', TONE_CLASS[meta.tone])}>
        <Icon className="h-10 w-10" />
        <div>
          <p className="text-[26px] font-extrabold leading-none tabular">{health.score}/100</p>
          <p className="text-[12px] font-semibold">{meta.label} sobre a cidade</p>
        </div>
      </div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">O que está pesando</p>
      {health.factors.length === 0 ? (
        <p className="rounded-xl bg-ok-soft px-3 py-3 text-[12px] text-ok">Nada! Cidade em dia — aproveite o sol.</p>
      ) : (
        <ul className="space-y-1.5">
          {health.factors.map((f) => (
            <li key={f.label} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
              <span className="text-ink-2">{f.label}</span>
              <span className="font-bold tabular" style={{ color: TONE_HEX.bad }}>
                {f.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-ink-3">
        Acima de 80 faz sol; 60–79 nublado; 40–59 chuva; abaixo de 40, tempestade com alerta na tela.
      </p>
    </div>
  );
}

/** Painel do jogo (abre pela badge de nível, pelo chip de saúde ou com a tecla G). */
export function GamePanel() {
  const open = useGameStore((s) => s.panelOpen);
  const tab = useGameStore((s) => s.tab);
  const openPanel = useGameStore((s) => s.openPanel);
  const closePanel = useGameStore((s) => s.closePanel);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => closePanel(), [closePanel]);
  useClickOutside(ref, close, open);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Painel do jogo"
      className="pointer-events-auto absolute left-4 top-[76px] z-40 w-[min(420px,calc(100vw-32px))] max-md:left-3 max-md:top-16"
    >
      <Glass className="flex max-h-[calc(100dvh-100px)] flex-col overflow-hidden bg-white/95">
        <div className="flex items-center gap-2 px-4 pt-3">
          <div role="tablist" aria-label="Seções do jogo" className="flex flex-1 gap-0.5 overflow-x-auto rounded-lg bg-surface-2 p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                autoFocus={tab === t.id}
                onClick={() => openPanel(t.id)}
                className={cx(
                  'whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors',
                  tab === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <IconButton label="Fechar (Esc)" onClick={closePanel}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'missoes' && <Missoes />}
          {tab === 'conquistas' && <Conquistas />}
          {tab === 'ranking' && <Ranking />}
          {tab === 'cidade' && <Cidade />}
          {tab === 'saude' && <Saude />}
        </div>
      </Glass>
    </div>
  );
}
