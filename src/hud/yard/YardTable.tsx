import { useMemo, useState } from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { useYard } from '../../hooks/useYard';
import { useUiStore } from '../../store/uiStore';
import { TIPO_COLOR } from '../../scene/yard/crateColors';
import { cx } from '../tones';
import { Glass, StatusChip } from '../ui';

type Tab = 'abertas' | 'entregues';

/** Lista das caixas do pátio (complementa a vista 3D e serve de navegação por teclado). */
export function YardTable() {
  const { colunas } = useYard();
  const select = useUiStore((s) => s.select);
  const selected = useUiStore((s) => s.selected);
  const [tab, setTab] = useState<Tab>('abertas');

  const rows = useMemo(() => {
    const ordenadas = [...(colunas ?? [])].sort((a, b) => a.ordem - b.ordem);
    const all = ordenadas.flatMap((c) => c.atividades.map((a) => ({ a, coluna: c })));
    return {
      abertas: all.filter((x) => !x.coluna.ehColunaConclusao),
      entregues: all.filter((x) => x.coluna.ehColunaConclusao),
    };
  }, [colunas]);

  const list = rows[tab];

  return (
    <Glass className="flex w-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
          <Package className="h-4 w-4" />
        </span>
        <div className="flex rounded-lg bg-surface-2 p-0.5">
          {(['abertas', 'entregues'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx(
                'rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize transition-colors',
                tab === t ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
              )}
            >
              {t} <span className="font-medium text-ink-3 tabular">{rows[t].length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto px-1.5 pb-1.5 pt-2">
        {list.length === 0 && <p className="px-2 py-4 text-center text-[12px] text-ink-3">Nenhuma caixa aqui.</p>}
        {list.map(({ a, coluna }) => (
          <button
            key={a.idAtividade}
            onClick={() => select({ kind: 'atividade', id: a.idAtividade })}
            className={cx(
              'group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2',
              selected?.kind === 'atividade' && selected.id === a.idAtividade && 'bg-brand-soft/60'
            )}
          >
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: TIPO_COLOR[a.tipo] }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{a.titulo}</span>
              <span className="block truncate text-[11px] text-ink-3">
                {a.nomeResponsavel ?? 'Sem responsável'}
                {a.prioridade === 'Alta' ? ' · prioridade alta' : ''}
              </span>
            </span>
            <StatusChip status={coluna.nome} tone={coluna.ehColunaConclusao ? 'ok' : 'neutral'} />
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-ink-2" />
          </button>
        ))}
      </div>
    </Glass>
  );
}
