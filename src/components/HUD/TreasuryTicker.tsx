import { useCityStore } from '../../store/cityStore';
import { computeSaldo } from '../../world/health';
import { formatBRL } from '../../lib/format';
import { useCountUp } from '../../lib/useCountUp';

export function TreasuryTicker() {
  const faturas = useCityStore((s) => s.faturas);
  const despesas = useCityStore((s) => s.despesas);
  const saldo = computeSaldo(faturas, despesas);
  const animated = useCountUp(saldo);

  return (
    <div className="pointer-events-none flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-3 py-1.5 font-[var(--font-mono)] text-xs">
      <span className="text-[var(--text-muted)]">Tesouro</span>
      <span style={{ color: animated >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {formatBRL(animated)}
      </span>
    </div>
  );
}
