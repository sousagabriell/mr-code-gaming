import { ArrowLeft, Box, List, Plus, Search, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePrefsStore, webglAvailable } from '../store/prefsStore';
import { useUiStore } from '../store/uiStore';

function DockButton({ label, onClick, children, primary }: { label: string; onClick: () => void; children: ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        primary
          ? 'flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-brand py-1.5 text-[11px] font-semibold text-white'
          : 'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold text-ink-2 active:bg-surface-2'
      }
    >
      {children}
      {label}
    </button>
  );
}

/** Celular: ações principais no polegar (sem teclado para "/", "G", "B", "Esc"). */
export function MobileDock() {
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  // Na agência o extrato é a própria folha inferior — esta barra nem chega a ser montada lá.
  const yard = useUiStore((s) => s.yard);
  const exitYard = useUiStore((s) => s.exitYard);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const openPanel = useGameStore((s) => s.openPanel);
  const viewMode = usePrefsStore((s) => s.viewMode);
  const setViewMode = usePrefsStore((s) => s.setViewMode);
  const icon = 'h-5 w-5';

  return (
    <nav
      aria-label="Ações rápidas"
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex gap-1 rounded-2xl border border-white/70 bg-white/90 p-1.5 shadow-float backdrop-blur-xl"
    >
      {yard ? (
        <>
          <DockButton label="Cidade" onClick={() => exitYard()}>
            <ArrowLeft className={icon} />
          </DockButton>
          <DockButton label="Atividade" primary onClick={() => openDrawer({ form: 'nova-atividade', idProjeto: yard })}>
            <Plus className={icon} />
          </DockButton>
        </>
      ) : (
        <DockButton label="Buscar" onClick={() => setSearchOpen(true)}>
          <Search className={icon} />
        </DockButton>
      )}
      {webglAvailable && (
        <DockButton label={viewMode === 'lista' ? 'Cidade 3D' : 'Lista'} onClick={() => setViewMode(viewMode === 'lista' ? '3d' : 'lista')}>
          {viewMode === 'lista' ? <Box className={icon} /> : <List className={icon} />}
        </DockButton>
      )}
      <DockButton label="Jogo" onClick={() => openPanel()}>
        <Trophy className={icon} />
      </DockButton>
    </nav>
  );
}
