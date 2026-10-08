import { ArrowDownToLine, Hand, Ticket, Warehouse } from 'lucide-react';
import { useAlterarStatusChamado, useAtribuirResponsavel } from '../../api/mutations';
import { useChamadoDetalheQuery } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { formatDateTimeShort, formatRelative, stripHtml } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { clienteCode } from '../../world/status';
import { TRANSITIONS } from '../chamadoActions';
import { Button, KeyValue, Section, StatusChip } from '../ui';
import { InspectorShell, StatusLine } from './Shell';

export function ChamadoInspector({ id }: { id: number }) {
  const { chamados } = useWorld();
  const usuario = useAuthStore((s) => s.usuario);
  const select = useUiStore((s) => s.select);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const enterYard = useUiStore((s) => s.enterYard);
  const alterarStatus = useAlterarStatusChamado();
  const atribuir = useAtribuirResponsavel();
  const { data: detalhe } = useChamadoDetalheQuery(id);

  const chamado = chamados.find((c) => c.idChamado === id);
  if (!chamado) return null;

  // Vínculo com o Kanban só vem no detalhe (GET /Chamado/{id}).
  const idAtividade = detalhe?.idAtividadeVinculada ?? chamado.idAtividadeVinculada;
  const idProjetoAtividade = detalhe?.idProjetoAtividadeVinculada ?? chamado.idProjetoAtividadeVinculada;
  const souResponsavel = usuario && chamado.idUsuarioAdminResponsavel === usuario.idUsuarioAdmin;
  const busy = alterarStatus.isPending || atribuir.isPending;

  return (
    <InspectorShell
      icon={<Ticket className="h-5 w-5" />}
      eyebrow={`Chamado · ${chamado.protocolo}`}
      title={chamado.assunto}
      subtitle={
        chamado.idCliente ? (
          <button className="hover:text-brand hover:underline" onClick={() => select({ kind: 'cliente', id: chamado.idCliente! })}>
            {clienteCode(chamado.idCliente)} · {chamado.clienteNome} · via {chamado.origem}
          </button>
        ) : (
          `via ${chamado.origem}`
        )
      }
      adminPath={`/chamados/${id}`}
      footer={
        <>
          {TRANSITIONS[chamado.status].map((t) => (
            <Button
              key={t.to}
              variant={t.primary ? 'primary' : 'secondary'}
              disabled={busy}
              onClick={() => alterarStatus.mutate({ id, status: t.to })}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Button>
          ))}
          {idAtividade && idProjetoAtividade ? (
            <Button variant="ghost" onClick={() => enterYard(idProjetoAtividade, { kind: 'atividade', id: idAtividade })}>
              <Warehouse className="h-3.5 w-3.5" /> Ver caixa no pátio
            </Button>
          ) : (
            chamado.idCliente && (
              <Button variant="ghost" onClick={() => openDrawer({ form: 'converter-chamado', idChamado: id })}>
                <ArrowDownToLine className="h-3.5 w-3.5" /> Converter em atividade
              </Button>
            )
          )}
          {usuario && !souResponsavel && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => atribuir.mutate({ id, idUsuarioAdmin: usuario.idUsuarioAdmin, nome: usuario.nome })}
            >
              <Hand className="h-3.5 w-3.5" /> Assumir
            </Button>
          )}
        </>
      }
    >
      <StatusLine>
        <StatusChip status={chamado.status} />
        <StatusChip status={chamado.prioridade} />
        <span>atualizado {formatRelative(chamado.dataHoraUltimaAtualizacao)}</span>
      </StatusLine>

      <div className="mt-2">
        <KeyValue
          rows={[
            ['Solicitante', chamado.usuarioNome],
            ['Responsável', chamado.nomeResponsavel ?? 'Ninguém ainda'],
            ['Aberto em', formatDateTimeShort(chamado.dataHoraAbertura)],
            ['Origem', chamado.origem],
          ]}
        />
      </div>

      <Section title="Descrição">
        <p className="line-clamp-6 whitespace-pre-line rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
          {stripHtml(chamado.descricao) || '—'}
        </p>
      </Section>

      {chamado.resposta && (
        <Section title="Resposta">
          <p className="line-clamp-4 whitespace-pre-line text-[12.5px] text-ink-2">{stripHtml(chamado.resposta)}</p>
        </Section>
      )}
    </InspectorShell>
  );
}
