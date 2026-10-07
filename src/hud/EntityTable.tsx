import { useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, LayoutList } from 'lucide-react';
import { contextClienteId, useDistricts } from '../hooks/useDistricts';
import { useWorld } from '../hooks/useWorld';
import { formatBRLCompact } from '../lib/format';
import { useUiStore, type EntityRef } from '../store/uiStore';
import { PRIORIDADE_COLOR } from '../world/colors';
import { isChamadoAberto, isProjetoAtrasado, isProjetoEmObras, projetoCode, projetoProgress } from '../world/status';
import { cx } from './tones';
import { Glass, ProgressBar, StatusChip } from './ui';

type Tab = 'chamados' | 'projetos' | 'faturas';

interface Row {
  key: string;
  title: string;
  sub: string;
  status: string;
  extra?: ReactNode;
  target: EntityRef;
}

const PESO = { Alta: 3, Media: 2, Baixa: 1 } as const;

/** Tabela por abas da referência (Docks / Forklifts / Trucks), contextual ao distrito. */
export function EntityTable() {
  const world = useWorld();
  const selected = useUiStore((s) => s.selected);
  const select = useUiStore((s) => s.select);
  const { current } = useDistricts();
  const [tab, setTab] = useState<Tab>('chamados');
  const idCliente = contextClienteId(selected, world);

  const data = useMemo(() => {
    const doContexto = <T extends { idCliente: number | null }>(list: T[]) =>
      idCliente === null ? list : list.filter((x) => x.idCliente === idCliente);

    const chamados = doContexto(world.chamados);
    const projetos = doContexto(world.projetos).filter((p) => p.status !== 'Cancelado');
    const faturas = doContexto(world.faturas).filter((f) => f.status !== 'Cancelado');

    const chamadoRows: Row[] = [...chamados]
      .sort(
        (a, b) =>
          Number(isChamadoAberto(b)) - Number(isChamadoAberto(a)) ||
          PESO[b.prioridade] - PESO[a.prioridade] ||
          b.dataHoraAbertura.localeCompare(a.dataHoraAbertura)
      )
      .map((c) => ({
        key: `c${c.idChamado}`,
        title: c.assunto,
        sub: `${c.clienteNome ?? c.origem} · ${c.protocolo.slice(-6)}`,
        status: c.status,
        extra: <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORIDADE_COLOR[c.prioridade] }} title={`Prioridade ${c.prioridade}`} />,
        target: { kind: 'chamado', id: c.idChamado },
      }));

    const projetoRows: Row[] = [...projetos]
      .sort((a, b) => Number(isProjetoEmObras(b)) - Number(isProjetoEmObras(a)) || a.dataPrevisaoFim.localeCompare(b.dataPrevisaoFim))
      .map((p) => ({
        key: `p${p.idProjeto}`,
        title: p.nome,
        sub: `${projetoCode(p.idProjeto)} · ${p.clienteNome}`,
        status: isProjetoAtrasado(p) ? 'Atrasado' : p.status,
        extra: <ProgressBar value={projetoProgress(p)} tone={isProjetoAtrasado(p) ? 'bad' : 'info'} className="w-10" />,
        target: { kind: 'projeto', id: p.idProjeto },
      }));

    const faturaRows: Row[] = [...faturas]
      .sort((a, b) => {
        const rank = (s: string) => (s === 'Atrasado' ? 0 : s === 'Pendente' ? 1 : 2);
        return rank(a.status) - rank(b.status) || a.dataVencimento.localeCompare(b.dataVencimento);
      })
      .map((f) => ({
        key: `f${f.idFatura}`,
        title: `${formatBRLCompact(f.valor)} · ${f.clienteNome}`,
        sub: f.numeroFatura,
        status: f.status,
        target: { kind: 'fatura', id: f.idFatura },
      }));

    return {
      chamados: { rows: chamadoRows, open: chamados.filter(isChamadoAberto).length, total: chamados.length },
      projetos: { rows: projetoRows, open: projetos.filter(isProjetoEmObras).length, total: projetos.length },
      faturas: {
        rows: faturaRows,
        open: faturas.filter((f) => f.status === 'Pendente' || f.status === 'Atrasado').length,
        total: faturas.length,
      },
    };
  }, [world, idCliente]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'chamados', label: 'Chamados' },
    { id: 'projetos', label: 'Projetos' },
    { id: 'faturas', label: 'Faturas' },
  ];

  const rows = data[tab].rows;

  return (
    <Glass className="flex w-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
          <LayoutList className="h-4 w-4" />
        </span>
        <div className="flex rounded-lg bg-surface-2 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors',
                tab === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
              )}
            >
              {t.label} <span className="font-medium text-ink-3 tabular">{data[t.id].open}/{data[t.id].total}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto hidden truncate text-[11px] font-medium text-ink-3 2xl:block">{current.nome}</span>
      </div>
      <div className="max-h-52 overflow-y-auto px-1.5 pb-1.5 pt-2">
        {rows.length === 0 && <p className="px-2 py-4 text-center text-[12px] text-ink-3">Nada por aqui.</p>}
        {rows.map((r) => (
          <button
            key={r.key}
            onClick={() => select(r.target)}
            className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{r.title}</span>
              <span className="block truncate text-[11px] text-ink-3">{r.sub}</span>
            </span>
            {r.extra}
            <StatusChip status={r.status} />
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-ink-2" />
          </button>
        ))}
      </div>
    </Glass>
  );
}
