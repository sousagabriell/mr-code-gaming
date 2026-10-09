import { Briefcase, Building2, Pencil, Plus, Power } from 'lucide-react';
import { useAlterarStatusCliente } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { formatBRL, formatDate } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { pickContrato } from '../../world/layout';
import { clienteCode, clienteNome, isChamadoAberto, label, projetoCode } from '../../world/status';
import { Button, EmptyHint, KeyValue, ListRow, Section, StatusChip } from '../ui';
import { InspectorShell, StatusLine } from './Shell';

export function ClienteInspector({ id }: { id: number }) {
  const world = useWorld();
  const select = useUiStore((s) => s.select);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const enterSede = useUiStore((s) => s.enterSede);
  const alterarStatus = useAlterarStatusCliente();

  const cliente = world.clientes.find((c) => c.idCliente === id);
  if (!cliente) return null;

  const contrato = pickContrato(world.contratos, id);
  const projetos = world.projetos.filter((p) => p.idCliente === id);
  const chamados = world.chamados.filter((c) => c.idCliente === id && isChamadoAberto(c));
  const faturas = world.faturas.filter((f) => f.idCliente === id && (f.status === 'Pendente' || f.status === 'Atrasado'));
  const ativo = cliente.status === 'Ativo';
  const nome = clienteNome(cliente);

  return (
    <InspectorShell
      icon={<Building2 className="h-5 w-5" />}
      eyebrow={`Cliente · ${clienteCode(id)}`}
      title={nome}
      subtitle={nome !== cliente.razaoSocial ? cliente.razaoSocial : cliente.cpfCnpj}
      adminPath={`/clientes/${id}`}
      footer={
        <>
          <Button variant="primary" onClick={() => enterSede(id)}>
            <Briefcase className="h-3.5 w-3.5" /> Entrar no escritório
          </Button>
          <Button variant="secondary" onClick={() => openDrawer({ form: 'editar-cliente', idCliente: id })}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button
            variant={ativo ? 'danger' : 'secondary'}
            disabled={alterarStatus.isPending}
            onClick={() => alterarStatus.mutate({ id, status: ativo ? 'Inativo' : 'Ativo' })}
          >
            <Power className="h-3.5 w-3.5" /> {ativo ? 'Desativar' : 'Reativar'}
          </Button>
        </>
      }
    >
      <StatusLine>
        {!ativo && <StatusChip status="Inativo" />}
        {contrato ? (
          <>
            <StatusChip status={contrato.status} />
            <span className="truncate">{contrato.numeroContrato}</span>
          </>
        ) : (
          <StatusChip status="Sem contrato" tone="neutral" />
        )}
        {cliente.sistemaOrigemNome && <span className="truncate">· via {cliente.sistemaOrigemNome}</span>}
      </StatusLine>

      <div className="mt-2">
        <KeyValue
          rows={[
            ['CPF/CNPJ', cliente.cpfCnpj],
            ['Contato', cliente.nomeContato ?? '—'],
            ['E-mail', cliente.email ?? '—'],
            ['Telefone', cliente.telefone ?? '—'],
            [
              'Contrato',
              contrato
                ? `${label(contrato.tipo)} · ${formatBRL(contrato.valorMensal ?? contrato.valorTotal ?? 0)}${contrato.valorMensal ? '/mês' : ''}`
                : '—',
            ],
            ['Cliente desde', formatDate(cliente.dataCadastro)],
          ]}
        />
      </div>

      <Section
        title={`Projetos (${projetos.length})`}
        action={
          <button
            onClick={() => openDrawer({ form: 'novo-projeto', idCliente: id })}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-brand hover:underline"
          >
            <Plus className="h-3 w-3" /> Novo
          </button>
        }
      >
        {projetos.length === 0 && <EmptyHint>Nenhum projeto — abra um canteiro de obras.</EmptyHint>}
        {projetos.map((p) => (
          <ListRow
            key={p.idProjeto}
            title={p.nome}
            subtitle={projetoCode(p.idProjeto)}
            right={<StatusChip status={p.status} />}
            onClick={() => select({ kind: 'projeto', id: p.idProjeto })}
          />
        ))}
      </Section>

      <Section
        title={`Chamados abertos (${chamados.length})`}
        action={
          <button
            onClick={() => openDrawer({ form: 'novo-chamado', idCliente: id })}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-brand hover:underline"
          >
            <Plus className="h-3 w-3" /> Abrir
          </button>
        }
      >
        {chamados.length === 0 && <EmptyHint>Nenhum chamado em aberto.</EmptyHint>}
        {chamados.map((c) => (
          <ListRow
            key={c.idChamado}
            title={c.assunto}
            subtitle={`${c.protocolo} · ${label(c.status)}`}
            right={<StatusChip status={c.prioridade} />}
            onClick={() => select({ kind: 'chamado', id: c.idChamado })}
          />
        ))}
      </Section>

      {faturas.length > 0 && (
        <Section title={`Faturas em aberto (${faturas.length})`}>
          {faturas.map((f) => (
            <ListRow
              key={f.idFatura}
              title={formatBRL(f.valor)}
              subtitle={`${f.numeroFatura} · vence ${formatDate(f.dataVencimento)}`}
              right={<StatusChip status={f.status} />}
              onClick={() => select({ kind: 'fatura', id: f.idFatura })}
            />
          ))}
        </Section>
      )}
    </InspectorShell>
  );
}
