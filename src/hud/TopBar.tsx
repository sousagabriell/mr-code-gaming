import { useCallback, useRef, useState } from 'react';
import { Box, ChevronDown, Footprints, List, LogOut, Search, Signpost, Volume2, VolumeX, Wind } from 'lucide-react';
import { useIsDesktop } from '../hooks/useIsMobile';
import { useWorld } from '../hooks/useWorld';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { label } from '../world/status';
import { CameraToolbar } from './CameraToolbar';
import { DistrictSelector } from './DistrictSelector';
import { HealthChip, LevelBadge } from './game/GameChips';
import { useGameStore } from '../store/gameStore';
import { usePrefsStore, webglAvailable } from '../store/prefsStore';
import { useTourStore } from '../store/tourStore';
import { NotificationBell } from './NotificationBell';
import { useClickOutside } from './useClickOutside';

function Logo() {
  return (
    <div className="flex items-center gap-2 sm:pr-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-[0_6px_16px_rgb(19_76_237/0.35)]">
        <Box className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="hidden leading-tight sm:block">
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
      data-tour="search"
      aria-label="Buscar (atalho /)"
      className="flex h-11 w-11 items-center justify-center gap-2.5 rounded-xl border border-white/70 bg-white/85 text-left text-[13px] text-ink-3 shadow-card backdrop-blur-xl hover:text-ink-2 sm:w-full sm:max-w-md sm:justify-start sm:px-3.5"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="hidden flex-1 truncate sm:block">Buscar clientes, projetos, chamados, faturas…</span>
      <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-2 sm:block">/</kbd>
    </button>
  );
}

/**
 * O relógio e o pulso de sincronização moram no celular (barra de status). Aqui fica só o alerta de
 * falha — que precisa existir na barra porque o celular some abaixo de 1024px, no modo lista e no pátio.
 */
function SyncAlert() {
  const { isError } = useWorld();
  if (!isError) return null;
  return (
    <span
      role="status"
      className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-warn-soft px-3 text-[12px] font-semibold text-warn"
      title="Falha ao sincronizar com o MrCodeAdmin — tentando de novo"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-warn" />
      Reconectando
    </span>
  );
}

function UserMenu() {
  const { usuario, logout } = useAuthStore();
  const sound = useGameStore((s) => s.sound);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const reduceMotion = usePrefsStore((s) => s.reduceMotion);
  const toggleReduceMotion = usePrefsStore((s) => s.toggleReduceMotion);
  const showSigns = usePrefsStore((s) => s.showSigns);
  const toggleShowSigns = usePrefsStore((s) => s.toggleShowSigns);
  const startTour = useTourStore((s) => s.start);
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
        <span className="hidden whitespace-nowrap text-left leading-tight 2xl:block">
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
            onClick={toggleShowSigns}
            role="switch"
            aria-checked={showSigns}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2"
          >
            <Signpost className="h-4 w-4" />
            Placas com nomes: {showSigns ? 'ligadas' : 'desligadas'}
          </button>
          <button
            onClick={toggleReduceMotion}
            role="switch"
            aria-checked={reduceMotion}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2"
          >
            <Wind className="h-4 w-4" />
            Reduzir animações: {reduceMotion ? 'sim' : 'segue o sistema'}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              startTour();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2"
          >
            <Footprints className="h-4 w-4" />
            Ver o tour de novo
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

/** Alterna cidade 3D ⇄ lista 2D (tecla L). Sem WebGL, só a lista existe e o botão some. */
function ViewToggle() {
  const viewMode = usePrefsStore((s) => s.viewMode);
  const setViewMode = usePrefsStore((s) => s.setViewMode);
  if (!webglAvailable) return null;
  const lista = viewMode === 'lista';
  return (
    <button
      onClick={() => setViewMode(lista ? '3d' : 'lista')}
      aria-pressed={lista}
      data-tour="view"
      title={lista ? 'Ver como cidade 3D (L)' : 'Ver como lista (L)'}
      className="hidden h-10 items-center gap-1.5 rounded-xl border border-white/70 bg-white/85 px-3 text-[12px] font-semibold text-ink-2 shadow-card backdrop-blur-xl hover:text-ink md:flex"
    >
      {lista ? <Box className="h-4 w-4" /> : <List className="h-4 w-4" />}
      <span className="hidden xl:inline">{lista ? 'Cidade' : 'Lista'}</span>
    </button>
  );
}

export function TopBar() {
  const desktop = useIsDesktop();
  const lista = usePrefsStore((s) => s.viewMode) === 'lista';
  // A partir de 1024px os controles de câmera moram aqui; abaixo disso o Game mantém a barrinha
  // flutuante na lateral (a barra não tem espaço para os seis botões). No modo lista não há câmera.
  const naBarra = desktop && !lista;

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 pt-3 sm:px-4 2xl:gap-3">
      <Logo />
      <LevelBadge />
      {/* min-w-0: sem isso o item não encolhe abaixo do conteúdo e a barra transborda em telas
          estreitas. O piso de 200px mantém o campo legível depois de absorver o aperto. */}
      <div className="flex min-w-0 flex-1 justify-center sm:min-w-[200px]">
        <SearchTrigger />
      </div>
      {/* Só a partir de xl: entre lg e xl o espaço vai para os controles de câmera. A navegação por
          distrito continua na busca (/) e nos próprios prédios. */}
      <div className="hidden xl:block">
        <DistrictSelector />
      </div>
      <ViewToggle />
      {naBarra && <CameraToolbar horizontal />}
      <HealthChip />
      <SyncAlert />
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
