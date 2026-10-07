import { BadgeDollarSign, Receipt, User } from 'lucide-react';
import { usePagarFatura } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { formatBRL, formatDate } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { clienteCode, label } from '../../world/status';
import { Button, KeyValue, StatusChip } from '../ui';
import { InspectorShell, StatusLine } from './Shell';

export function FaturaInspector({ id }: { id: number }) {
  const { faturas } = useWorld();
  const select = useUiStore((s) => s.select);
  const pagar = usePagarFatura();

  const fatura = faturas.find((f) => f.idFatura === id);
  if (!fatura) return null;
  const emAberto = fatura.status === 'Pendente' || fatura.status === 'Atrasado';

  return (
    <InspectorShell
      icon={<Receipt className="h-5 w-5" />}
      eyebrow={`Fatura · ${fatura.numeroFatura}`}
      title={formatBRL(fatura.valor)}
      subtitle={
        <button className="hover:text-brand hover:underline" onClick={() => select({ kind: 'cliente', id: fatura.idCliente })}>
          {clienteCode(fatura.idCliente)} · {fatura.clienteNome}
        </button>
      }
      adminPath={`/financeiro/faturas/${id}/editar`}
      footer={
        emAberto ? (
          <Button variant="primary" disabled={pagar.isPending} onClick={() => pagar.mutate({ id })}>
            <BadgeDollarSign className="h-3.5 w-3.5" /> Registrar pagamento
          </Button>
        ) : undefined
      }
    >
      <StatusLine>
        <StatusChip status={fatura.status} />
        <span className="truncate">{fatura.descricao}</span>
      </StatusLine>
      <div className="mt-2">
        <KeyValue
          rows={[
            ['Emissão', formatDate(fatura.dataEmissao)],
            ['Vencimento', formatDate(fatura.dataVencimento)],
            ['Pagamento', fatura.dataPagamento ? formatDate(fatura.dataPagamento) : '—'],
            ['Valor', formatBRL(fatura.valor)],
          ]}
        />
      </div>
    </InspectorShell>
  );
}

export function ColaboradorInspector({ id }: { id: number }) {
  const { colaboradores } = useWorld();
  const colaborador = colaboradores.find((c) => c.idUsuarioAdmin === id);
  if (!colaborador) return null;

  return (
    <InspectorShell
      icon={<User className="h-5 w-5" />}
      eyebrow={`Equipe · ${label(colaborador.tipoUsuario)}`}
      title={colaborador.nome}
      subtitle={colaborador.cargo ?? colaborador.email}
      adminPath={`/equipe/${id}/editar`}
    >
      <StatusLine>
        <StatusChip status={colaborador.ativo ? 'Ativo' : 'Inativo'} />
      </StatusLine>
      <div className="mt-2">
        <KeyValue
          rows={[
            ['E-mail', colaborador.email],
            ['Cargo', colaborador.cargo ?? '—'],
            ['Perfil', label(colaborador.tipoUsuario)],
          ]}
        />
      </div>
    </InspectorShell>
  );
}
