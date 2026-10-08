import { ArrowDownToLine, Hand, MapPin, MessageCircle, Warehouse } from 'lucide-react';
import { useAlterarStatusChamado, useAtribuirResponsavel } from '../../api/mutations';
import { useChamadoDetalheQuery } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { formatDateTimeShort, formatRelative, stripHtml } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { usePhoneStore } from '../../store/phoneStore';
import { useUiStore } from '../../store/uiStore';
import { TRANSITIONS } from '../chamadoActions';
import { Button, KeyValue, Section, StatusChip } from '../ui';
import { Empty, ScreenHeader } from './parts';

/**
 * Mesma estrutura do detalhe do portal (descrição, solicitante, responsabilidade, datas, atividade
 * vinculada, ações de status) — sem o bloco de mensagens, que no celular virou a aba Chat.
 */
export function ChamadoScreen({ idChamado }: { idChamado: number }) {
  const { chamados } = useWorld();
  const usuario = useAuthStore((s) => s.usuario);
  const voltar = usePhoneStore((s) => s.voltar);
  const push = usePhoneStore((s) => s.push);
  const select = useUiStore((s) => s.select);
  const enterYard = useUiStore((s) => s.enterYard);
  const alterarStatus = useAlterarStatusChamado();
  const atribuir = useAtribuirResponsavel();
  const { data: detalhe } = useChamadoDetalheQuery(idChamado);

  const chamado = chamados.find((c) => c.idChamado === idChamado);
  if (!chamado) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader title="Chamado" onBack={voltar} />
        <Empty>Este chamado saiu da lista.</Empty>
      </div>
    );
  }

  // O vínculo com o Kanban só vem no detalhe (GET /Chamado/{id}).
  const idAtividade = detalhe?.idAtividadeVinculada ?? chamado.idAtividadeVinculada;
  const idProjetoAtividade = detalhe?.idProjetoAtividadeVinculada ?? chamado.idProjetoAtividadeVinculada;
  const souResponsavel = usuario && chamado.idUsuarioAdminResponsavel === usuario.idUsuarioAdmin;
  const busy = alterarStatus.isPending || atribuir.isPending;
  // O passo óbvio fica fixo no rodapé; o resto desce para "Ações", no fim do conteúdo.
  const transicoes = TRANSITIONS[chamado.status];
  const principal = transicoes.find((t) => t.primary) ?? transicoes[0];
  const secundarias = transicoes.filter((t) => t !== principal);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader title={chamado.assunto} subtitle={chamado.protocolo} onBack={voltar} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusChip status={chamado.status} />
          <StatusChip status={chamado.prioridade} />
          <span className="text-[10.5px] text-ink-3">atualizado {formatRelative(chamado.dataHoraUltimaAtualizacao)}</span>
        </div>

        <Section title="Descrição">
          <p className="whitespace-pre-line rounded-xl bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
            {stripHtml(chamado.descricao) || '—'}
          </p>
        </Section>

        {chamado.resposta && (
          <Section title="Última resposta enviada">
            <p className="whitespace-pre-line text-[12px] leading-relaxed text-ink-2">{stripHtml(chamado.resposta)}</p>
          </Section>
        )}

        <Section title="Solicitante">
          <KeyValue
            rows={[
              ['Usuário', chamado.usuarioNome],
              ['E-mail', chamado.usuarioEmail ?? '—'],
              ['Origem', chamado.origem],
              ['Cliente', chamado.clienteNome ?? '—'],
            ]}
          />
        </Section>

        <Section title="Responsabilidade">
          <KeyValue rows={[['Responsável', chamado.nomeResponsavel ?? 'Ninguém ainda']]} />
        </Section>

        <Section title="Datas">
          <KeyValue
            rows={[
              ['Abertura', formatDateTimeShort(chamado.dataHoraAbertura)],
              ['Atualização', formatDateTimeShort(chamado.dataHoraUltimaAtualizacao)],
            ]}
          />
        </Section>

        <Section title="Ações">
          <div className="flex flex-col gap-1.5">
            {secundarias.map((t) => (
              <Button
                key={t.to}
                variant="secondary"
                disabled={busy}
                className="w-full"
                onClick={() => alterarStatus.mutate({ id: idChamado, status: t.to })}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </Button>
            ))}

            {idAtividade && idProjetoAtividade ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => enterYard(idProjetoAtividade, { kind: 'atividade', id: idAtividade })}
              >
                <Warehouse className="h-3.5 w-3.5" /> Ver caixa no pátio
              </Button>
            ) : (
              chamado.idCliente && (
                <Button variant="secondary" className="w-full" onClick={() => push({ nome: 'converter', idChamado })}>
                  <ArrowDownToLine className="h-3.5 w-3.5" /> Converter em tarefa
                </Button>
              )
            )}

            {usuario && !souResponsavel && (
              <Button
                variant="ghost"
                disabled={busy}
                className="w-full"
                onClick={() => atribuir.mutate({ id: idChamado, idUsuarioAdmin: usuario.idUsuarioAdmin, nome: usuario.nome })}
              >
                <Hand className="h-3.5 w-3.5" /> Assumir
              </Button>
            )}

            {chamado.idCliente && (
              <Button variant="ghost" className="w-full" onClick={() => push({ nome: 'conversa', idCliente: chamado.idCliente! })}>
                <MessageCircle className="h-3.5 w-3.5" /> Abrir conversa
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => select({ kind: 'chamado', id: idChamado })}>
              <MapPin className="h-3.5 w-3.5" /> Ver na cidade
            </Button>
          </div>
        </Section>
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2">
        <Button
          variant="primary"
          disabled={busy}
          className="w-full"
          onClick={() => alterarStatus.mutate({ id: idChamado, status: principal.to })}
        >
          <principal.icon className="h-3.5 w-3.5" /> {principal.label}
        </Button>
      </div>
    </div>
  );
}
