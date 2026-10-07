import { useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { CameraControlsBar } from './components/HUD/CameraControlsBar';
import { EntityPanel } from './components/HUD/EntityPanel';
import { TreasuryTicker } from './components/HUD/TreasuryTicker';
import { CityScene } from './scene/CityScene';
import { useAuthStore } from './store/authStore';
import { useCityStore } from './store/cityStore';
import { isSystemAlert } from './world/health';

function App() {
  const { token, usuario, logout } = useAuthStore();
  const { status, error, load, faturas, chamados, observabilidade } = useCityStore();
  const alert = isSystemAlert({ faturas, chamados, observabilidade });

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  if (!token) {
    return <LoginScreen />;
  }

  return (
    <div className="relative h-full w-full">
      <CityScene />

      {alert && (
        <div className="pointer-events-none absolute inset-0 animate-pulse border-4 border-[var(--color-danger)]/60" />
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-3 py-1.5 font-[var(--font-mono)] text-xs font-bold uppercase tracking-[1px] text-[var(--brand-blue)]">
            MrCodeAdmin · Game Lab
          </span>
          <TreasuryTicker />
        </div>

        <CameraControlsBar />

        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-3 py-1.5">
          <span className="font-[var(--font-mono)] text-xs text-[var(--text-secondary)]">{usuario?.nome}</span>
          <button
            onClick={logout}
            className="font-[var(--font-mono)] text-xs font-semibold text-[var(--color-danger)] hover:underline"
          >
            Sair
          </button>
        </div>
      </header>

      <EntityPanel />

      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 py-1.5 font-[var(--font-mono)] text-xs text-[var(--text-secondary)]">
            Construindo a cidade…
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <span className="rounded-full border border-[rgba(239,68,68,0.3)] bg-[var(--bg-surface)]/90 px-4 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-danger)]">
            {error}
          </span>
        </div>
      )}
    </div>
  );
}

export default App;
