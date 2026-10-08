import { useMemo } from 'react';
import { AlertTriangle, Check, Clock, RotateCcw, X, XCircle } from 'lucide-react';
import { useCancelarFatura, useEstornarFatura, usePagarFatura } from '../../api/mutations';
import { useFinanceiroResumoQuery } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { formatDate } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import type { FaturaDTO, FaturaStatus } from '../../types/domain';
import {
  agruparPorDia,
  dataDaFatura,
  filtrarFaturas,
  mesParam,
  noMes,
  temFiltroExtrato,
  type ExtratoFiltros,
  type Mes,
} from '../../world/extrato';
import { EmptyHint, StatusChip } from '../ui';
import { AcaoLinha, BuscaExtrato, DiaLabel, LinhaExtrato, ResumoBloco, SelectExtrato } from './parts';

const STATUS: FaturaStatus[] = ['Pendente', 'Pago', 'Atrasado', 'Cancelado'];

const ICONE: Record<FaturaStatus, { icon: typeof Check; tone: 'ok' | 'warn' | 'bad' | 'neutral' }> = {
  Pago: { icon: Check, tone: 'ok' },
  Pendente: { icon: Clock, tone: 'warn' },
  Atrasado: { icon: AlertTriangle, tone: 'bad' },
  Cancelado: { icon: XCircle, tone: 'neutral' },
};

export function FaturasExtrato({
  mes,
  filtros,
  setFiltros,
  agora,
}: {
  mes: Mes;
  filtros: ExtratoFiltros;
  setFiltros: (patch: Partial<ExtratoFiltros>) => void;
  agora: Date;
}) {
  const { faturas } = useWorld();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const { data: resumo } = useFinanceiroResumoQuery(mesParam(mes));
  const pagar = usePagarFatura();
  const estornar = useEstornarFatura();
  const cancelar = useCancelarFatura();
  const busy = pagar.isPending || estornar.isPending || cancelar.isPending;

  const grupos = useMemo(() => {
    const doMes = noMes(faturas, dataDaFatura, mes);
    return agruparPorDia(filtrarFaturas(doMes, filtros), dataDaFatura, agora);
  }, [faturas, mes, filtros, agora]);

  const total = grupos.reduce((s, g) => s + g.itens.length, 0);

  return (
    <>
      <div className="shrink-0 space-y-2 px-3 pb-2">
        <ResumoBloco
          destaque="Recebido no mês"
          valor={resumo?.totalRecebido ?? 0}
          chips={[
            { label: 'A receber', valor: resumo?.totalAReceber ?? 0 },
            { label: 'Atrasado', valor: resumo?.totalAtrasado ?? 0, tone: (resumo?.totalAtrasado ?? 0) > 0 ? 'bad' : 'neutral' },
            { label: 'Saldo do mês', valor: resumo?.saldo ?? 0, tone: (resumo?.saldo ?? 0) < 0 ? 'bad' : 'ok' },
          ]}
        />
        <div className="flex gap-1.5">
          <BuscaExtrato
            value={filtros.busca}
            onChange={(busca) => setFiltros({ busca })}
            placeholder="Número, descrição ou cliente"
          />
          <SelectExtrato
            label="Status"
            value={filtros.status ?? ''}
            onChange={(v) => setFiltros({ status: v || null })}
            options={STATUS.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-2">
        {total === 0 ? (
          <EmptyHint>
            {temFiltroExtrato(filtros) ? 'Nenhuma fatura com esses filtros.' : 'Nenhuma fatura vence neste mês.'}
          </EmptyHint>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.key} className="mb-1">
              <DiaLabel>{grupo.label}</DiaLabel>
              {grupo.itens.map((f: FaturaDTO) => {
                const { icon: Icon, tone } = ICONE[f.status];
                const emAberto = f.status === 'Pendente' || f.status === 'Atrasado';
                return (
                  <LinhaExtrato
                    key={f.idFatura}
                    icone={<Icon className="h-4 w-4" />}
                    tone={tone}
                    titulo={f.clienteNome}
                    subtitulo={
                      f.status === 'Pago' && f.formaPagamento
                        ? `${f.numeroFatura} · pago via ${f.formaPagamento}`
                        : `${f.numeroFatura} · vence ${formatDate(f.dataVencimento)}`
                    }
                    valor={f.valor}
                    sinal={f.status === 'Pago' ? '+' : ''}
                    chip={<StatusChip status={f.status} className="mt-0.5" />}
                    onClick={() => openDrawer({ form: 'editar-fatura', idFatura: f.idFatura })}
                    acoes={
                      <>
                        {emAberto && (
                          <>
                            <AcaoLinha label="Marcar como paga" disabled={busy} onClick={() => pagar.mutate({ id: f.idFatura })}>
                              <Check className="h-3.5 w-3.5" />
                            </AcaoLinha>
                            <AcaoLinha label="Cancelar fatura" danger disabled={busy} onClick={() => cancelar.mutate({ id: f.idFatura })}>
                              <X className="h-3.5 w-3.5" />
                            </AcaoLinha>
                          </>
                        )}
                        {f.status === 'Pago' && (
                          <AcaoLinha label="Estornar pagamento" disabled={busy} onClick={() => estornar.mutate({ id: f.idFatura })}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </AcaoLinha>
                        )}
                      </>
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
