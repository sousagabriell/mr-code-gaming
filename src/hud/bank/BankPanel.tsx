import { useMemo } from 'react';
import { Landmark, Plus, Receipt, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNow } from '../../hooks/useNow';
import { useBankStore } from '../../store/bankStore';
import { useUiStore } from '../../store/uiStore';
import { cx } from '../tones';
import { Glass, IconButton, IconTile } from '../ui';
import { BankDetail } from './BankDetail';
import { DespesasExtrato } from './DespesasExtrato';
import { FaturasExtrato } from './FaturasExtrato';
import { MesNav } from './parts';

const ABAS = [
  { id: 'faturas', label: 'Faturas' },
  { id: 'despesas', label: 'Despesas' },
] as const;

/**
 * O extrato da agência: duas abas (a mesma divisão de `financeiro/faturas` e `financeiro/despesas`
 * do MrCodeAdmin), navegador de mês, resumo e a lista agrupada por dia.
 *
 * Mês, aba, filtros e seleção moram no `bankStore` — o calendário na parede e o painel de detalhe
 * leem os mesmos valores. Em telas largas o detalhe é um painel ao lado; aqui dentro ele só aparece
 * quando não há espaço para os dois (`embutido`).
 */
export function BankPanel({ detalheEmbutido = false }: { detalheEmbutido?: boolean }) {
  const exitInterior = useUiStore((s) => s.exitInterior);
  const isMobile = useIsMobile();
  // "Hoje"/"Ontem" dependem do relógio; o `useNow` é a fonte do jogo (sem `Date.now()` no render).
  const nowMs = useNow(60_000);
  const agora = useMemo(() => new Date(nowMs), [nowMs]);

  const mes = useBankStore((s) => s.mes);
  const setMes = useBankStore((s) => s.setMes);
  const aba = useBankStore((s) => s.aba);
  const setAba = useBankStore((s) => s.setAba);
  const filtros = useBankStore((s) => s.filtros);
  const setFiltros = useBankStore((s) => s.setFiltros);
  const abrirDetalhe = useBankStore((s) => s.abrirDetalhe);
  const abrirForm = useBankStore((s) => s.abrirForm);
  const tela = useBankStore((s) => s.tela);

  // Sem espaço para dois painéis: o detalhe toma conta deste.
  if (detalheEmbutido && tela !== 'lista') {
    return (
      <Glass
        className={cx(
          'flex flex-col overflow-hidden',
          isMobile ? 'max-h-[88dvh] w-full rounded-b-none pb-[env(safe-area-inset-bottom)]' : 'max-h-full w-full'
        )}
      >
        <BankDetail embutido />
      </Glass>
    );
  }

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
        <IconButton label="Voltar para a cidade (Esc)" onClick={() => exitInterior()}>
          <X className="h-4 w-4" />
        </IconButton>
      </header>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div role="tablist" aria-label="Seções do financeiro" className="flex rounded-lg bg-surface-2 p-0.5">
          {ABAS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={aba === t.id}
              onClick={() => setAba(t.id)}
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
        <button
          onClick={() => abrirForm()}
          className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          {aba === 'faturas' ? <Plus className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
          {aba === 'faturas' ? 'Nova fatura' : 'Nova despesa'}
        </button>
      </div>

      {aba === 'faturas' ? (
        <FaturasExtrato
          mes={mes}
          filtros={filtros}
          setFiltros={setFiltros}
          agora={agora}
          onAbrir={(id) => abrirDetalhe({ tipo: 'fatura', id })}
        />
      ) : (
        <DespesasExtrato
          mes={mes}
          filtros={filtros}
          setFiltros={setFiltros}
          agora={agora}
          onAbrir={(id) => abrirDetalhe({ tipo: 'despesa', id })}
        />
      )}
    </Glass>
  );
}
