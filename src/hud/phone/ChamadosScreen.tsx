import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { contextClienteId } from '../../hooks/useDistricts';
import { useWorld } from '../../hooks/useWorld';
import { formatRelative } from '../../lib/format';
import { usePhoneStore } from '../../store/phoneStore';
import { useUiStore } from '../../store/uiStore';
import type { Prioridade } from '../../types/domain';
import { PRIORIDADE_COLOR } from '../../world/colors';
import { ABAS, contarPorAba, filtrarChamados, temFiltro } from '../../world/phone';
import { clienteCode, label } from '../../world/status';
import { cx } from '../tones';
import { Empty, FilterSelect, ScreenHeader } from './parts';

const PRIORIDADES: Prioridade[] = ['Alta', 'Media', 'Baixa'];

/** 'TJCoach' é o valor do backend; 'TJ Coach' é como o portal mostra. */
const ORIGEM_LABEL: Record<string, string> = { TJCoach: 'TJ Coach' };

export function ChamadosScreen() {
  const world = useWorld();
  const selected = useUiStore((s) => s.selected);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const aba = usePhoneStore((s) => s.aba);
  const setAba = usePhoneStore((s) => s.setAba);
  const filtros = usePhoneStore((s) => s.filtros);
  const setFiltros = usePhoneStore((s) => s.setFiltros);
  const limparFiltros = usePhoneStore((s) => s.limparFiltros);
  const push = usePhoneStore((s) => s.push);

  const idCliente = contextClienteId(selected, world);
  const contagem = useMemo(() => contarPorAba(world.chamados, filtros, idCliente), [world.chamados, filtros, idCliente]);
  const lista = useMemo(
    () => filtrarChamados(world.chamados, aba, filtros, idCliente),
    [world.chamados, aba, filtros, idCliente]
  );
  const origens = useMemo(() => [...new Set(world.chamados.map((c) => c.origem))].sort(), [world.chamados]);
  const total = contagem.abertos + contagem.andamento + contagem.fechados;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        title="Chamados"
        subtitle={`${total} na caixa de entrada`}
        action={
          temFiltro(filtros) ? (
            <button
              onClick={limparFiltros}
              className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-[10px] font-semibold text-ink-2 hover:bg-brand-soft hover:text-brand"
            >
              Limpar
            </button>
          ) : undefined
        }
      />

      <div className="shrink-0 space-y-1.5 px-3 pb-2 pt-2">
        {idCliente !== null && (
          <button
            onClick={clearSelection}
            className="flex w-full items-center gap-1 rounded-lg bg-brand-soft px-2 py-1 text-[10px] font-semibold text-brand hover:bg-brand/15"
          >
            Só de {clienteCode(idCliente)}
            <X className="ml-auto h-3 w-3" />
          </button>
        )}

        <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1.5 focus-within:border-brand">
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-3" />
          <input
            type="search"
            value={filtros.busca}
            onChange={(e) => setFiltros({ busca: e.target.value })}
            placeholder="Protocolo, assunto ou cliente"
            aria-label="Buscar chamados"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
          />
        </label>

        <div className="flex gap-1.5">
          <FilterSelect
            label="Prioridade"
            value={filtros.prioridade ?? ''}
            onChange={(v) => setFiltros({ prioridade: (v || null) as Prioridade | null })}
            options={PRIORIDADES.map((p) => ({ value: p, label: label(p) }))}
          />
          <FilterSelect
            label="Origem"
            value={filtros.origem ?? ''}
            onChange={(v) => setFiltros({ origem: v || null })}
            options={origens.map((o) => ({ value: o, label: ORIGEM_LABEL[o] ?? o }))}
          />
        </div>

        <div role="tablist" aria-label="Situação dos chamados" className="flex rounded-lg bg-surface-2 p-0.5">
          {ABAS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={aba === t.id}
              onClick={() => setAba(t.id)}
              className={cx(
                'min-w-0 flex-1 truncate rounded-md px-0.5 py-1 text-[10px] font-semibold tracking-tight transition-colors',
                aba === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2'
              )}
            >
              {t.label} <span className="tabular opacity-70">{contagem[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-2">
        {lista.length === 0 ? (
          <Empty>{temFiltro(filtros) ? 'Nenhum chamado com esses filtros.' : 'Nada nesta aba.'}</Empty>
        ) : (
          lista.map((c) => (
            <button
              key={c.idChamado}
              onClick={() => push({ nome: 'chamado', idChamado: c.idChamado })}
              className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: PRIORIDADE_COLOR[c.prioridade] }}
                title={`Prioridade ${label(c.prioridade)}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold leading-snug text-ink">{c.assunto}</span>
                <span className="block truncate text-[10.5px] text-ink-3">
                  {c.clienteNome ?? ORIGEM_LABEL[c.origem] ?? c.origem} · {c.protocolo.slice(-6)}
                </span>
              </span>
              <span className="shrink-0 pt-0.5 text-[10px] text-ink-3">
                {formatRelative(c.dataHoraUltimaAtualizacao)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
