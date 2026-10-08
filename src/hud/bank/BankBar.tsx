import { ArrowLeft, Landmark, Plus, Receipt, Repeat } from 'lucide-react';
import { useGerarDespesasRecorrentes, useGerarFaturasRecorrentes } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { formatBRL } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { computeSaldo } from '../../world/health';
import { cx } from '../tones';
import { Button, Glass, IconTile } from '../ui';

/** Canto inferior esquerdo da agência: identidade, saldo realizado e as ações que não são de linha. */
export function BankBar() {
  const { faturas, despesas } = useWorld();
  const exitBanco = useUiStore((s) => s.exitBanco);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const gerarFaturas = useGerarFaturasRecorrentes();
  const gerarDespesas = useGerarDespesasRecorrentes();
  const saldo = computeSaldo(faturas, despesas);
  const gerando = gerarFaturas.isPending || gerarDespesas.isPending;

  return (
    <Glass className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 p-4">
      <div className="flex min-w-[220px] flex-1 items-center gap-3">
        <IconTile tone={saldo >= 0 ? 'ok' : 'bad'}>
          <Landmark className="h-5 w-5" />
        </IconTile>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Agência · BC</p>
          <p className="truncate text-[15px] font-bold text-ink">Banco Central</p>
          <p className="text-[12px] text-ink-2">
            Saldo realizado{' '}
            <span className={cx('font-semibold tabular', saldo >= 0 ? 'text-ok' : 'text-bad')}>{formatBRL(saldo)}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => exitBanco()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Cidade
        </Button>
        <Button variant="primary" onClick={() => openDrawer({ form: 'nova-fatura' })}>
          <Plus className="h-3.5 w-3.5" /> Fatura
        </Button>
        <Button variant="secondary" onClick={() => openDrawer({ form: 'nova-despesa' })}>
          <Receipt className="h-3.5 w-3.5" /> Despesa
        </Button>
        <Button
          variant="ghost"
          disabled={gerando}
          title="Gera as faturas e despesas recorrentes deste mês"
          onClick={() => {
            gerarFaturas.mutate(undefined);
            gerarDespesas.mutate(undefined);
          }}
        >
          <Repeat className="h-3.5 w-3.5" /> {gerando ? 'Gerando…' : 'Recorrentes'}
        </Button>
      </div>
    </Glass>
  );
}
