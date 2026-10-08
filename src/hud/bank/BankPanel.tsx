import { useMemo, useState } from 'react';
import { Landmark, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNow } from '../../hooks/useNow';
import { useUiStore } from '../../store/uiStore';
import { FILTROS_EXTRATO, mesDe, type ExtratoFiltros, type Mes } from '../../world/extrato';
import { cx } from '../tones';
import { Glass, IconButton, IconTile } from '../ui';
import { DespesasExtrato } from './DespesasExtrato';
import { FaturasExtrato } from './FaturasExtrato';
import { MesNav } from './parts';

type Aba = 'faturas' | 'despesas';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'faturas', label: 'Faturas' },
  { id: 'despesas', label: 'Despesas' },
];

/**
 * O extrato da agência: duas abas (a mesma divisão de `financeiro/faturas` e `financeiro/despesas`
 * do MrCodeAdmin), navegador de mês, resumo e a lista agrupada por dia.
 *
 * O mês e os filtros são estado local: ao sair da agência a conversa recomeça no mês corrente.
 */
export function BankPanel() {
  const exitBanco = useUiStore((s) => s.exitBanco);
  const isMobile = useIsMobile();
  // "Hoje"/"Ontem" dependem do relógio; o `useNow` é a fonte do jogo (sem `Date.now()` no render).
  const nowMs = useNow(60_000);
  const agora = useMemo(() => new Date(nowMs), [nowMs]);
  const [mes, setMes] = useState<Mes>(() => mesDe(new Date()));
  const [aba, setAba] = useState<Aba>('faturas');
  const [filtros, setFiltrosState] = useState<ExtratoFiltros>(FILTROS_EXTRATO);
  const setFiltros = (patch: Partial<ExtratoFiltros>) => setFiltrosState((f) => ({ ...f, ...patch }));
  const trocarAba = (id: Aba) => {
    setAba(id);
    // Categoria só existe em despesas; manter o filtro esconderia faturas sem explicação.
    setFiltrosState(FILTROS_EXTRATO);
  };

  return (
    <Glass
      className={cx(
        'flex flex-col overflow-hidden',
        isMobile ? 'max-h-[68dvh] w-full rounded-b-none pb-[env(safe-area-inset-bottom)]' : 'max-h-full w-full'
      )}
    >
      <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
        <IconTile>
          <Landmark className="h-5 w-5" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Extrato · Banco Central</p>
          <h2 className="truncate text-[16px] font-bold leading-snug text-ink">Conta bancária</h2>
        </div>
        <IconButton label="Voltar para a cidade (Esc)" onClick={() => exitBanco()}>
          <X className="h-4 w-4" />
        </IconButton>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div role="tablist" aria-label="Seções do financeiro" className="flex rounded-lg bg-surface-2 p-0.5">
          {ABAS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={aba === t.id}
              onClick={() => trocarAba(t.id)}
              className={cx(
                'rounded-md px-3 py-1 text-[12px] font-semibold transition-colors',
                aba === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <MesNav mes={mes} onChange={setMes} hoje={agora} />
      </div>

      {aba === 'faturas' ? (
        <FaturasExtrato mes={mes} filtros={filtros} setFiltros={setFiltros} agora={agora} />
      ) : (
        <DespesasExtrato mes={mes} filtros={filtros} setFiltros={setFiltros} agora={agora} />
      )}
    </Glass>
  );
}
