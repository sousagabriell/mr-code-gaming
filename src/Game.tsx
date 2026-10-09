import { lazy, Suspense } from 'react';
import { BankBar } from './hud/bank/BankBar';
import { BankDetail } from './hud/bank/BankDetail';
import { BankPanel } from './hud/bank/BankPanel';
import { CameraToolbar } from './hud/CameraToolbar';
import { FormDrawer } from './hud/FormDrawer';
import { Inspector } from './hud/inspector/Inspector';
import { KpiCards } from './hud/KpiCards';
import { SearchPalette } from './hud/SearchPalette';
import { EscritorioPanel } from './hud/sede/EscritorioPanel';
import { TimelineTray } from './hud/TimelineTray';
import { Toasts } from './hud/Toasts';
import { TopBar } from './hud/TopBar';
import { LibraryBar } from './hud/wiki/LibraryBar';
import { WikiPanel } from './hud/wiki/WikiPanel';
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
import { useIsDesktop, useIsMobile, useMediaQuery } from './hooks/useIsMobile';
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
  const interior = useUiStore((s) => s.interior);
  const banco = interior === 'banco';
  const biblioteca = interior === 'universidade';
  const sede = interior === 'sede';
  const selected = useUiStore((s) => s.selected);
  const lista = usePrefsStore((s) => s.viewMode) === 'lista';
  const isMobile = useIsMobile();
  const desktop = useIsDesktop();
  // Abaixo de 1280px não cabem o detalhe (360) e o extrato (680) lado a lado: lá o detalhe entra
  // dentro do próprio extrato.
  const detalheAoLado = useMediaQuery('(min-width: 1280px)');
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
      {/* key troca a cada entrada/saída de cenário (pátio, interior) e reinicia a animação do véu */}
      <div
        key={interior ?? yard ?? 'city'}
        className="animate-scene-fade pointer-events-none absolute inset-0 z-10 bg-page"
      />

      {alert && (
        <div className="pointer-events-none absolute inset-0 z-10 animate-pulse shadow-[inset_0_0_60px_rgb(239_68_68/0.18)]" />
      )}

      <div className="pointer-events-none absolute inset-0 z-20">
        <TopBar />

        {/* Nos interiores os KPIs da cidade sairiam de contexto — cada painel traz o resumo do seu assunto. */}
        {!interior && (
          <div className="pointer-events-auto absolute left-4 top-[76px] hidden w-[min(660px,calc(100vw-480px))] lg:block">
            <KpiCards />
          </div>
        )}

        {isMobile ? (
          <>
            {!lista && (
              <div className="pointer-events-auto absolute right-3 top-16">
                <CameraToolbar />
              </div>
            )}
            {/* Celular: os painéis de interior e o inspector viram folhas que sobem da base. */}
            {banco ? (
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30">
                <BankPanel detalheEmbutido />
              </div>
            ) : biblioteca ? (
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30">
                <WikiPanel />
              </div>
            ) : sede ? (
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30">
                <EscritorioPanel />
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
          // Na cidade a base da coluna para acima da linha do tempo (142px + as folgas); no pátio,
          // acima da tabela do pátio. Nos interiores o painel ocupa a coluna inteira.
          <div
            className={`absolute right-4 top-[76px] bottom-4 flex items-start gap-2 ${
              lista || interior ? '' : yard ? 'lg:bottom-[300px]' : 'lg:bottom-[174px]'
            }`}
          >
            {/* A partir de 1024px os controles de câmera moram na barra superior. */}
            {!lista && !desktop && (
              <div className="pointer-events-auto">
                <CameraToolbar />
              </div>
            )}
            {/* Na agência o detalhe é um painel ao lado do extrato; biblioteca e escritório usam a coluna inteira. */}
            {banco && detalheAoLado && (
              <div className="pointer-events-auto flex max-h-full w-[360px]">
                <BankDetail />
              </div>
            )}
            <div className={`pointer-events-auto flex max-h-full ${interior ? 'w-[min(680px,calc(100vw-32px))]' : ''}`}>
              {banco ? (
                <BankPanel detalheEmbutido={!detalheAoLado} />
              ) : biblioteca ? (
                <WikiPanel />
              ) : sede ? (
                <EscritorioPanel />
              ) : (
                <Inspector />
              )}
            </div>
          </div>
        )}

        {!lista && (
          <>
            {/*
              Na cidade o celular fica à **esquerda** e a linha do tempo à direita: o aparelho aberto
              deixava de cobrir a cena e passava a disputar a coluna do inspector. No pátio e nos
              interiores não há celular, e a barra de lá fica onde o celular estaria. O escritório do
              cliente ainda não tem barra: por ora é a sala e o painel.
            */}
            {!yard && !interior && <Phone />}
            {(yard || banco || biblioteca) && (
              <div
                className={`pointer-events-auto absolute bottom-4 left-4 hidden lg:block ${
                  interior ? 'w-[min(760px,calc(100vw-728px))]' : 'w-[min(760px,calc(100vw-424px))]'
                }`}
              >
                {banco ? <BankBar /> : biblioteca ? <LibraryBar /> : <YardPanel />}
              </div>
            )}
            {yard ? (
              <div className="pointer-events-auto absolute bottom-4 right-4 hidden w-[376px] lg:block">
                <YardTable />
              </div>
            ) : (
              // A folga da esquerda é o celular recolhido (352 + folgas).
              !interior && (
                <div className="pointer-events-auto absolute bottom-4 right-4 hidden w-[min(760px,calc(100vw-400px))] lg:block">
                  <TimelineTray />
                </div>
              )
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
