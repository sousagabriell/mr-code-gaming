import { useMemo } from 'react';
import { Check, Clock, Repeat, RotateCcw } from 'lucide-react';
import { useEstornarDespesa, usePagarDespesa } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { formatDate } from '../../lib/format';
import type { DespesaDTO, DespesaStatus } from '../../types/domain';
import {
  agruparPorDia,
  categoriasDe,
  dataDaDespesa,
  filtrarDespesas,
  noMes,
  resumoDespesas,
  temFiltroExtrato,
  type ExtratoFiltros,
  type Mes,
} from '../../world/extrato';
import { EmptyHint, StatusChip } from '../ui';
import { AcaoLinha, BuscaExtrato, DiaLabel, LinhaExtrato, ResumoBloco, SelectExtrato } from './parts';

const STATUS: DespesaStatus[] = ['Pendente', 'Pago'];

export function DespesasExtrato({
  mes,
  filtros,
  setFiltros,
  agora,
  onAbrir,
}: {
  mes: Mes;
  filtros: ExtratoFiltros;
  setFiltros: (patch: Partial<ExtratoFiltros>) => void;
  agora: Date;
  /** Abre a leitura do lançamento no painel de detalhe (à esquerda do extrato). */
  onAbrir: (id: number) => void;
}) {
  const { despesas } = useWorld();
  const pagar = usePagarDespesa();
  const estornar = useEstornarDespesa();
  const busy = pagar.isPending || estornar.isPending;

  // `GET /Financeiro/resumo` só cobre faturas — o total de despesas do mês sai do cliente.
  const { grupos, resumo, total, categorias } = useMemo(() => {
    const doMes = noMes(despesas, dataDaDespesa, mes);
    const filtradas = filtrarDespesas(doMes, filtros);
    return {
      grupos: agruparPorDia(filtradas, dataDaDespesa, agora),
      resumo: resumoDespesas(doMes),
      total: filtradas.length,
      categorias: categoriasDe(doMes),
    };
  }, [despesas, mes, filtros, agora]);

  return (
    <>
      <div className="shrink-0 space-y-2 px-3 pb-2">
        <ResumoBloco
          destaque="Despesas do mês"
          valor={resumo.total}
          tone="bad"
          chips={[
            { label: 'Pagas', valor: resumo.pago, tone: 'neutral' },
            { label: 'Em aberto', valor: resumo.pendente, tone: resumo.pendente > 0 ? 'bad' : 'neutral' },
            { label: 'Lançamentos', texto: String(total), tone: 'neutral' },
          ]}
        />
        <div className="flex gap-1.5">
          <BuscaExtrato
            value={filtros.busca}
            onChange={(busca) => setFiltros({ busca })}
            placeholder="Descrição ou categoria"
          />
          <SelectExtrato
            label="Status"
            value={filtros.status ?? ''}
            onChange={(v) => setFiltros({ status: v || null })}
            options={STATUS.map((s) => ({ value: s, label: s }))}
          />
        </div>
        {categorias.length > 0 && (
          <SelectExtrato
            label="Categoria"
            value={filtros.categoria ?? ''}
            onChange={(v) => setFiltros({ categoria: v || null })}
            options={categorias.map((c) => ({ value: c, label: c }))}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-2">
        {total === 0 ? (
          <EmptyHint>
            {temFiltroExtrato(filtros) ? 'Nenhuma despesa com esses filtros.' : 'Nenhuma despesa neste mês.'}
          </EmptyHint>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.key} className="mb-1">
              <DiaLabel>{grupo.label}</DiaLabel>
              {grupo.itens.map((d: DespesaDTO) => {
                const pago = d.status === 'Pago';
                return (
                  <LinhaExtrato
                    key={d.idDespesa}
                    icone={pago ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    tone={pago ? 'neutral' : 'warn'}
                    titulo={d.descricao}
                    subtitulo={`${d.categoria} · ${formatDate(d.dataDespesa)}`}
                    valor={d.valor}
                    sinal="−"
                    chip={
                      <span className="mt-0.5 flex items-center justify-end gap-1">
                        {d.recorrente && <Repeat className="h-3 w-3 text-ink-3" aria-label="Recorrente" />}
                        <StatusChip status={d.status} />
                      </span>
                    }
                    onClick={() => onAbrir(d.idDespesa)}
                    acoes={
                      pago ? (
                        <AcaoLinha label="Estornar pagamento" disabled={busy} onClick={() => estornar.mutate({ id: d.idDespesa })}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </AcaoLinha>
                      ) : (
                        <AcaoLinha label="Marcar como paga" disabled={busy} onClick={() => pagar.mutate({ id: d.idDespesa })}>
                          <Check className="h-3.5 w-3.5" />
                        </AcaoLinha>
                      )
                    }
                  />
                );
              })}
            </div>
          ))
        )}
      </div>
    </>
  );
}
