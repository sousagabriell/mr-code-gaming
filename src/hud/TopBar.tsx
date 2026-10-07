import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { Box, ChevronDown, LogOut, Search, Volume2, VolumeX } from 'lucide-react';
import { useWorld } from '../hooks/useWorld';
import { formatClock } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { label } from '../world/status';
import { DistrictSelector } from './DistrictSelector';
import { HealthChip, LevelBadge } from './game/GameChips';
import { useGameStore } from '../store/gameStore';
import { NotificationBell } from './NotificationBell';
import { cx } from './tones';
import { useClickOutside } from './useClickOutside';

function Logo() {
  return (
    <div className="flex items-center gap-2 pr-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-[0_6px_16px_rgb(19_76_237/0.35)]">
        <Box className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-bold tracking-tight text-ink">MrCode</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">City</span>
      </span>
    </div>
  );
}

function SearchTrigger() {
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  return (
    <button
      onClick={() => setSearchOpen(true)}
      className="flex h-11 w-full max-w-md items-center gap-2.5 rounded-xl border border-white/70 bg-white/85 px-3.5 text-left text-[13px] text-ink-3 shadow-card backdrop-blur-xl hover:text-ink-2"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">Buscar clientes, projetos, chamados, faturas…</span>
      <kbd className="rounded-md border border-line bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-2">/</kbd>
    </button>
  );
}

function LiveIndicator() {
  const fetching = useIsFetching() > 0;
  const { isError } = useWorld();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={cx(
        'flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold',
        isError ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'
      )}
      title={isError ? 'Falha ao sincronizar — tentando de novo' : 'Dados sincronizados com o MrCodeAdmin a cada 30s'}
    >
      <span className={cx('h-2 w-2 rounded-full', isError ? 'bg-warn' : 'bg-ok', fetching && 'animate-pulse')} />
      {isError ? 'Reconectando' : 'Live'}
      <span className="font-medium text-ink tabular">{formatClock(now)}</span>
    </span>
  );
}

function UserMenu() {
  const { usuario, logout } = useAuthStore();
  const sound = useGameStore((s) => s.sound);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const iniciais = (usuario?.nome ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-white/70">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-brand to-brand-purple text-[13px] font-bold text-white">
          {iniciais}
        </span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-[13px] font-semibold text-ink">{usuario?.nome}</span>
          <span className="block text-[11px] text-ink-3">{label(usuario?.tipoUsuario ?? '')}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-ink-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-float">
          <div className="px-3 py-2">
            <p className="truncate text-[13px] font-semibold text-ink">{usuario?.nome}</p>
            <p className="truncate text-[11px] text-ink-3">{usuario?.email}</p>
          </div>
          <button
            onClick={toggleSound}
            role="switch"
            aria-checked={sound}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2"
          >
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Sons do jogo: {sound ? 'ligados' : 'desligados'}
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-bad hover:bg-bad-soft"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-4 pt-3">
      <Logo />
      <LevelBadge />
      <div className="flex flex-1 justify-center">
        <SearchTrigger />
      </div>
      <div className="hidden md:block">
        <DistrictSelector />
      </div>
      <HealthChip />
      <div className="hidden sm:block">
        <LiveIndicator />
      </div>
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
