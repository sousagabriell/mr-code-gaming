import { useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { ChevronUp, Signal, Wifi, WifiOff } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useIsMobile';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWorld } from '../../hooks/useWorld';
import { formatClock } from '../../lib/format';
import { usePhoneStore } from '../../store/phoneStore';
import { useUiStore } from '../../store/uiStore';
import { isChamadoAberto } from '../../world/status';
import { cx } from '../tones';
import { PhoneApp } from './PhoneApp';

/** Relógio da barra de status — meio minuto de precisão é de sobra para um aparelho cenográfico. */
function useClock(): string {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return formatClock(agora);
}

/**
 * Barra de status. O wifi faz as vezes do antigo chip "Live" da barra superior: pulsa enquanto o
 * TanStack busca e vira `WifiOff` vermelho quando a sincronização falha.
 */
function StatusBar() {
  const hora = useClock();
  const buscando = useIsFetching() > 0;
  const { isError } = useWorld();
  const semMovimento = useReducedMotion();

  return (
    <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[11px] font-semibold text-ink tabular">
      <span>{hora}</span>
      <span
        className="flex items-center gap-1 text-ink-2"
        title={isError ? 'Sem sincronizar com o MrCodeAdmin — tentando de novo' : 'Dados do MrCodeAdmin a cada 30 s'}
      >
        <Signal className="h-3 w-3" />
        {/* Só o wifi muda de cor: bateria vermelha leria como "pouca carga". */}
        {isError ? (
          <WifiOff className="h-3 w-3 text-bad" />
        ) : (
          <Wifi className={cx('h-3 w-3', buscando && !semMovimento && 'animate-pulse')} />
        )}
        <span className="ml-0.5 flex h-2.5 w-5 items-center rounded-[3px] border border-current/40 p-[1.5px]">
          <span className="h-full w-2/3 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}

/** Recolhido: a "tela de bloqueio" — quantos chamados esperam e qual é o mais recente. */
function LockScreen({ onOpen }: { onOpen: () => void }) {
  const { chamados } = useWorld();
  const abertos = chamados.filter(isChamadoAberto);
  const ultimo = [...abertos].sort((a, b) =>
    b.dataHoraUltimaAtualizacao.localeCompare(a.dataHoraUltimaAtualizacao)
  )[0];

  return (
    <button
      onClick={onOpen}
      className="group flex min-h-0 flex-1 flex-col justify-end gap-1 px-3 pb-3 text-left"
      aria-label="Abrir o app de atendimento"
    >
      <span className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 transition-colors group-hover:bg-brand-soft">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand text-[11px] font-bold text-white">
          {abertos.length}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-bold text-ink">
            {abertos.length === 1 ? '1 chamado aberto' : `${abertos.length} chamados abertos`}
          </span>
          <span className="block truncate text-[11px] text-ink-2">{ultimo?.assunto ?? 'Tudo em dia por aqui.'}</span>
        </span>
        <ChevronUp className="h-4 w-4 shrink-0 text-ink-3" />
      </span>
    </button>
  );
}

/**
 * O celular do atendimento: ocupa o canto inferior direito da HUD. Recolhido mostra a tela de
 * bloqueio; aberto sobe e cobre a coluna do inspector.
 */
export function Phone() {
  const aberto = usePhoneStore((s) => s.aberto);
  const setAberto = usePhoneStore((s) => s.setAberto);
  const recolher = usePhoneStore((s) => s.recolher);
  const restaurar = usePhoneStore((s) => s.restaurar);
  const setMontado = usePhoneStore((s) => s.setMontado);
  const temSelecao = useUiStore((s) => s.selected !== null);
  const focusNonce = useUiStore((s) => s.focusNonce);
  const desktop = useIsDesktop();
  const semMovimento = useReducedMotion();

  /**
   * O aparelho aberto cobre o inspector. Enquanto houver seleção ele encolhe; ao limpar a seleção
   * volta ao estado que o usuário escolheu. O `focusNonce` entra junto para o caso de trocar de
   * entidade com o celular reaberto por cima.
   *
   * O valor anterior fica num `ref` em vez de uma flag de "primeira execução": o StrictMode monta
   * duas vezes em dev, e a flag faria o efeito pular justamente a abertura vinda da URL (`?sel=`).
   */
  const anterior = useRef<{ temSelecao: boolean; focusNonce: number } | null>(null);
  useEffect(() => {
    const antes = anterior.current;
    anterior.current = { temSelecao, focusNonce };
    if (temSelecao) {
      if (!antes || !antes.temSelecao || antes.focusNonce !== focusNonce) recolher();
    } else if (antes?.temSelecao) {
      restaurar();
    }
  }, [temSelecao, focusNonce, recolher, restaurar]);

  // O `Esc` global só mexe no celular quando ele está mesmo na tela.
  useEffect(() => {
    setMontado(desktop);
    return () => setMontado(false);
  }, [desktop, setMontado]);

  if (!desktop) return null;

  return (
    <div
      className={cx(
        // Mesma largura do inspector (`w-[min(352px,...)]`): os dois formam uma coluna só.
        'pointer-events-auto absolute bottom-4 right-4 z-30 w-[min(352px,calc(100vw-32px))]',
        !semMovimento && 'transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        aberto ? 'h-[min(640px,calc(100vh-92px))]' : 'h-[124px]'
      )}
    >
      <section
        data-tour="phone"
        aria-label="Celular do atendimento"
        className="flex h-full flex-col overflow-hidden rounded-[38px] bg-ink p-[9px] shadow-float ring-1 ring-ink/20"
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] bg-surface">
          {/* ilha */}
          <span className="pointer-events-none absolute left-1/2 top-2 z-10 h-[18px] w-[68px] -translate-x-1/2 rounded-full bg-ink" />
          <StatusBar />
          {aberto ? <PhoneApp /> : <LockScreen onOpen={() => setAberto(true)} />}
        </div>
      </section>
    </div>
  );
}
