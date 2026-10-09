import { Check, ChevronLeft, Pencil, Receipt, Repeat, RotateCcw, X } from 'lucide-react';
import {
  useCancelarFatura,
  useEstornarDespesa,
  useEstornarFatura,
  usePagarDespesa,
  usePagarFatura,
} from '../../api/mutations';
import { isReducedMotion } from '../../hooks/useReducedMotion';
import { useWorld } from '../../hooks/useWorld';
import { formatBRL, formatDate } from '../../lib/format';
import { useBankStore, type BankSelecao } from '../../store/bankStore';
import { useCityEvents } from '../../store/cityEvents';
import { clienteCode, projetoCode } from '../../world/status';
import { DespesaForm } from '../forms/DespesaForm';
import { FaturaForm } from '../forms/FaturaForm';
import { cx } from '../tones';
import { Button, EmptyHint, Glass, IconButton, KeyValue, Section, StatusChip } from '../ui';

/**
 * Leitura de um lançamento, no painel à **esquerda** do extrato — e o formulário no mesmo lugar
 * quando se clica em "Editar". A lista fica visível o tempo todo; é essa a razão de o detalhe não
 * ser mais uma tela empilhada sobre o extrato.
 */
export function BankDetail({ embutido = false }: { embutido?: boolean }) {
  const { faturas, despesas, contratos, projetos } = useWorld();
  const tela = useBankStore((s) => s.tela);
  const selecao = useBankStore((s) => s.selecao);
  const aba = useBankStore((s) => s.aba);
  const voltar = useBankStore((s) => s.voltar);
  const abrirForm = useBankStore((s) => s.abrirForm);

  const pagarFatura = usePagarFatura();
  const estornarFatura = useEstornarFatura();
  const cancelarFatura = useCancelarFatura();
  const pagarDespesa = usePagarDespesa();
  const estornarDespesa = useEstornarDespesa();
  const busy =
    pagarFatura.isPending ||
    estornarFatura.isPending ||
    cancelarFatura.isPending ||
    pagarDespesa.isPending ||
    estornarDespesa.isPending;

  if (tela === 'lista') return null;

  const novo = tela === 'form' && !selecao;
  const titulo = novo
    ? aba === 'faturas'
      ? 'Emitir fatura'
      : 'Lançar despesa'
    : tela === 'form'
      ? selecao?.tipo === 'fatura'
        ? 'Editar fatura'
        : 'Editar despesa'
      : 'Detalhe do lançamento';

  /** Salvar acende a tela do caixa lá na sala; cancelar só volta. */
  const fechar = (salvou?: boolean) => {
    if (salvou && !isReducedMotion()) {
      useCityEvents.getState().push({ id: `ping-${Date.now()}`, kind: 'extrato-ping' });
    }
    voltar();
  };

  const corpo =
    tela === 'form' ? (
      selecao?.tipo === 'despesa' ? (
        <DespesaForm idDespesa={selecao.id} onClose={fechar} />
      ) : selecao?.tipo === 'fatura' ? (
        <FaturaForm idFatura={selecao.id} onClose={fechar} />
      ) : aba === 'faturas' ? (
        <FaturaForm onClose={fechar} />
      ) : (
        <DespesaForm onClose={fechar} />
      )
    ) : (
      <Leitura
        selecao={selecao}
        faturas={faturas}
        despesas={despesas}
        contratos={contratos}
        projetos={projetos}
        busy={busy}
        onEditar={() => selecao && abrirForm(selecao)}
        acoes={{
          pagarFatura: (id) => pagarFatura.mutate({ id }),
          estornarFatura: (id) => estornarFatura.mutate({ id }),
          cancelarFatura: (id) => cancelarFatura.mutate({ id }),
          pagarDespesa: (id) => pagarDespesa.mutate({ id }),
          estornarDespesa: (id) => estornarDespesa.mutate({ id }),
        }}
      />
    );

  // Embutido = está dentro do extrato (telas estreitas); solto = painel próprio ao lado dele.
  const conteudo = (
    <>
      <header className="flex items-start gap-2 border-b border-line px-4 pb-3 pt-4">
        <IconButton label="Voltar" onClick={voltar} className="mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Banco Central</p>
          <h2 className="truncate text-[15px] font-bold leading-snug text-ink">{titulo}</h2>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{corpo}</div>
    </>
  );

  if (embutido) return <div className="flex min-h-0 flex-1 flex-col">{conteudo}</div>;
  return <Glass className="flex max-h-full w-full flex-col overflow-hidden">{conteudo}</Glass>;
}

interface Acoes {
  pagarFatura: (id: number) => void;
  estornarFatura: (id: number) => void;
  cancelarFatura: (id: number) => void;
  pagarDespesa: (id: number) => void;
  estornarDespesa: (id: number) => void;
}

/** Só leitura: os mesmos campos do detalhe do portal, sem nenhum campo editável. */
function Leitura({
  selecao,
  faturas,
  despesas,
  contratos,
  projetos,
  busy,
  onEditar,
  acoes,
}: {
  selecao: BankSelecao | null;
  faturas: ReturnType<typeof useWorld>['faturas'];
  despesas: ReturnType<typeof useWorld>['despesas'];
  contratos: ReturnType<typeof useWorld>['contratos'];
  projetos: ReturnType<typeof useWorld>['projetos'];
  busy: boolean;
  onEditar: () => void;
  acoes: Acoes;
}) {
  const fatura = selecao?.tipo === 'fatura' ? faturas.find((f) => f.idFatura === selecao.id) : undefined;
  const despesa = selecao?.tipo === 'despesa' ? despesas.find((d) => d.idDespesa === selecao.id) : undefined;

  if (!fatura && !despesa) {
    return <EmptyHint>Este lançamento saiu da lista.</EmptyHint>;
  }

  const valor = fatura?.valor ?? despesa!.valor;
  const entrada = !!fatura;
  const status = fatura?.status ?? despesa!.status;
  const pago = status === 'Pago';

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="mt-3 rounded-xl bg-surface-2 px-3 py-3">
          <p className="truncate text-[12px] text-ink-2">{fatura ? fatura.clienteNome : despesa!.categoria}</p>
          <p className={cx('text-[26px] font-bold leading-tight tabular', entrada && pago ? 'text-ok' : entrada ? 'text-ink' : 'text-bad')}>
            {entrada ? (pago ? '+' : '') : '−'}
            {formatBRL(valor)}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <StatusChip status={status} />
            {despesa?.recorrente && (
              <span className="flex items-center gap-1 text-[11px] text-ink-3">
                <Repeat className="h-3 w-3" /> recorrente
              </span>
            )}
          </div>
        </div>

        {fatura && (
          <Section title="Fatura">
            <KeyValue
              rows={[
                ['Número', fatura.numeroFatura],
                ['Descrição', fatura.descricao || '—'],
                ['Cliente', `${clienteCode(fatura.idCliente)} · ${fatura.clienteNome}`],
                ['Contrato', contratos.find((c) => c.idContrato === fatura.idContrato)?.numeroContrato ?? '—'],
                [
                  'Projeto',
                  fatura.idProjeto
                    ? `${projetoCode(fatura.idProjeto)} · ${projetos.find((p) => p.idProjeto === fatura.idProjeto)?.nome ?? ''}`
                    : '—',
                ],
              ]}
            />
          </Section>
        )}

        {despesa && (
          <Section title="Despesa">
            <KeyValue
              rows={[
                ['Descrição', despesa.descricao],
                ['Categoria', despesa.categoria],
                ['Recorrente', despesa.recorrente ? 'Sim' : 'Não'],
              ]}
            />
          </Section>
        )}

        <Section title="Datas">
          <KeyValue
            rows={
              fatura
                ? [
                    ['Emissão', formatDate(fatura.dataEmissao)],
                    ['Vencimento', formatDate(fatura.dataVencimento)],
                    ['Pagamento', fatura.dataPagamento ? formatDate(fatura.dataPagamento) : '—'],
                    ['Forma', fatura.formaPagamento ?? '—'],
                  ]
                : [['Lançamento', formatDate(despesa!.dataDespesa)]]
            }
          />
        </Section>

        {(fatura?.observacoes || despesa?.observacoes) && (
          <Section title="Observações">
            <p className="whitespace-pre-line rounded-xl bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
              {fatura?.observacoes ?? despesa?.observacoes}
            </p>
          </Section>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        <Button variant="primary" onClick={onEditar}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        {fatura && (fatura.status === 'Pendente' || fatura.status === 'Atrasado') && (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => acoes.pagarFatura(fatura.idFatura)}>
              <Check className="h-3.5 w-3.5" /> Marcar paga
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => acoes.cancelarFatura(fatura.idFatura)}>
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          </>
        )}
        {fatura?.status === 'Pago' && (
          <Button variant="secondary" disabled={busy} onClick={() => acoes.estornarFatura(fatura.idFatura)}>
            <RotateCcw className="h-3.5 w-3.5" /> Estornar
          </Button>
        )}
        {despesa && !pago && (
          <Button variant="secondary" disabled={busy} onClick={() => acoes.pagarDespesa(despesa.idDespesa)}>
            <Receipt className="h-3.5 w-3.5" /> Marcar paga
          </Button>
        )}
        {despesa && pago && (
          <Button variant="secondary" disabled={busy} onClick={() => acoes.estornarDespesa(despesa.idDespesa)}>
            <RotateCcw className="h-3.5 w-3.5" /> Estornar
          </Button>
        )}
      </div>
    </div>
  );
}
