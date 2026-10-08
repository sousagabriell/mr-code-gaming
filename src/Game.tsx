import { lazy, Suspense } from 'react';
import { BankBar } from './hud/bank/BankBar';
import { BankPanel } from './hud/bank/BankPanel';
import { CameraToolbar } from './hud/CameraToolbar';
import { FormDrawer } from './hud/FormDrawer';
import { Inspector } from './hud/inspector/Inspector';
import { KpiCards } from './hud/KpiCards';
import { SearchPalette } from './hud/SearchPalette';
import { TimelineTray } from './hud/TimelineTray';
import { Toasts } from './hud/Toasts';
import { TopBar } from './hud/TopBar';
import { YardPanel } from './hud/yard/YardPanel';
import { YardTable } from './hud/yard/YardTable';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWorld } from './hooks/useWorld';
import { useUiStore } from './store/uiStore';
import { GamePanel } from './hud/game/GamePanel';
import { PerfOverlay } from './hud/PerfOverlay';
import { ListView } from './hud/list/ListView';
import { MobileDock } from './hud/MobileDock';
import { Phone } from './hud/phone/Phone';
import { Tour } from './hud/Tour';
import { useIsDesktop, useIsMobile } from './hooks/useIsMobile';
import { usePrefsStore } from './store/prefsStore';
import { LevelUpOverlay } from './hud/game/LevelUpOverlay';
import { useGame } from './hooks/useGame';
import { useGameProgress } from './hooks/useGameProgress';

// A cena 3D (three.js) é o pedaço mais pesado: carrega em paralelo enquanto a HUD já aparece.
const CityScene = lazy(() => import('./scene/CityScene').then((m) => ({ default: m.CityScene })));

function StatusPill({ children, tone }: { children: string; tone: 'info' | 'bad' }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-1/2 z-20 flex justify-center">
      <span
        className={
          tone === 'bad'
            ? 'rounded-full bg-bad-soft px-4 py-2 text-[13px] font-semibold text-bad shadow-card'
            : 'rounded-full bg-white/90 px-4 py-2 text-[13px] font-semibold text-ink-2 shadow-card'
        }
      >
        {children}
      </span>
    </div>
  );
}

/**
 * Layout da HUD (referência WareTrack):
 * topo = barra · esquerda = KPIs · direita = câmera + inspector · base = linha do tempo + tabela.
 */
export default function Game() {
  const world = useWorld();
  const game = useGame();
  const alert = game.health.weather === 'tempestade';
  const yard = useUiStore((s) => s.yard);
  const banco = useUiStore((s) => s.banco);
  const selected = useUiStore((s) => s.selected);
  const lista = usePrefsStore((s) => s.viewMode) === 'lista';
  const isMobile = useIsMobile();
  const desktop = useIsDesktop();
  useKeyboardShortcuts();
  useGameProgress(game);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {lista ? (
        // Modo lista: sem canvas. Abre espaço à direita para o inspector (desktop/tablet).
        <div className={`absolute inset-x-0 bottom-0 top-16 z-[15] px-4 pb-24 md:top-[76px] md:pb-4 lg:top-[180px] ${selected ? 'md:pr-[384px]' : ''}`}>
          <ListView />
        </div>
      ) : (
        <Suspense fallback={null}>
          <CityScene />
        </Suspense>
      )}
      {/* key troca a cada entrada/saída de cenário (pátio, agência) e reinicia a animação do véu */}
      <div
        key={banco ? 'banco' : (yard ?? 'city')}
        className="animate-scene-fade pointer-events-none absolute inset-0 z-10 bg-page"
      />

      {alert && (
        <div className="pointer-events-none absolute inset-0 z-10 animate-pulse shadow-[inset_0_0_60px_rgb(239_68_68/0.18)]" />
      )}

      <div className="pointer-events-none absolute inset-0 z-20">
        <TopBar />

        <div className="pointer-events-auto absolute left-4 top-[76px] hidden w-[min(660px,calc(100vw-480px))] lg:block">
          <KpiCards />
        </div>

        {isMobile ? (
          <>
            {!lista && (
              <div className="pointer-events-auto absolute right-3 top-16">
                <CameraToolbar />
              </div>
            )}
            {/* Celular: o extrato e o inspector viram folhas que sobem da base. */}
            {banco ? (
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30">
                <BankPanel />
              </div>
            ) : selected ? (
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30">
                <Inspector sheet />
              </div>
            ) : (
              <MobileDock />
            )}
          </>
        ) : (
          // Sem lista, a base da coluna para logo acima do celular recolhido (124px + as folgas).
          <div
            className={`absolute right-4 top-[76px] bottom-4 flex items-start gap-2 ${lista || banco ? '' : 'lg:bottom-[156px]'}`}
          >
            {/* A partir de 1024px os controles de câmera moram na barra superior. */}
            {!lista && !desktop && (
              <div className="pointer-events-auto">
                <CameraToolbar />
              </div>
            )}
            {/* Na agência o extrato ocupa a coluna inteira — não há entidade selecionada lá dentro. */}
            <div className={`pointer-events-auto flex max-h-full ${banco ? 'w-[min(560px,calc(100vw-32px))]' : ''}`}>
              {banco ? <BankPanel /> : <Inspector />}
            </div>
          </div>
        )}

        {!lista && (
          <>
            {/* A folga da direita acompanha quem está lá: o extrato (560) é mais largo que o celular. */}
            <div
              className={`pointer-events-auto absolute bottom-4 left-4 hidden lg:block ${
                banco ? 'w-[min(760px,calc(100vw-608px))]' : 'w-[min(760px,calc(100vw-424px))]'
              }`}
            >
              {banco ? <BankBar /> : yard ? <YardPanel /> : <TimelineTray />}
            </div>
            {yard ? (
              <div className="pointer-events-auto absolute bottom-4 right-4 hidden w-[376px] lg:block">
                <YardTable />
              </div>
            ) : (
              !banco && <Phone />
            )}
          </>
        )}
      </div>

      {world.isLoading && <StatusPill tone="info">Construindo a cidade…</StatusPill>}
      {world.isError && !world.isLoading && <StatusPill tone="bad">Não foi possível carregar a cidade.</StatusPill>}

      <GamePanel />
      <FormDrawer />
      <SearchPalette />
      <Toasts />
      <LevelUpOverlay />
      <PerfOverlay />
      <Tour />
    </div>
  );
}
