import { useState, type FormEvent } from 'react';
import { ArrowRightLeft, Package, Pencil, Send, Trash2 } from 'lucide-react';
import { useComentar, useComentariosQuery, useMoverAtividade, useRemoverAtividade } from '../../api/kanban';
import { useYard } from '../../hooks/useYard';
import { formatDate, formatRelative, stripHtml, textToHtml } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { findAtividade } from '../../world/kanban';
import { label } from '../../world/status';
import { cx } from '../tones';
import { Button, EmptyHint, KeyValue, Section, StatusChip } from '../ui';
import { InspectorShell, StatusLine } from './Shell';

const TIPO_TONE = { Tarefa: 'info', Bug: 'bad', Melhoria: 'ok', Chamado: 'warn' } as const;

function Comentarios({ idAtividade }: { idAtividade: number }) {
  const { data: comentarios, isPending } = useComentariosQuery(idAtividade);
  const comentar = useComentar();
  const [texto, setTexto] = useState('');

  function enviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    comentar.mutate({ idAtividade, conteudoHtml: textToHtml(t) }, { onSuccess: () => setTexto('') });
  }

  return (
    <Section title={`Comentários${comentarios ? ` (${comentarios.length})` : ''}`}>
      {isPending && <EmptyHint>Carregando…</EmptyHint>}
      {comentarios?.length === 0 && <EmptyHint>Nenhum comentário ainda.</EmptyHint>}
      <div className="space-y-2">
        {comentarios?.map((c) => (
          <div key={c.idComentario} className="rounded-xl bg-surface-2 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-semibold text-ink">{c.nomeAutor}</span>
              <span className="text-[11px] text-ink-3">{formatRelative(c.dataCriacao)}</span>
            </div>
            <p className="mt-0.5 whitespace-pre-line text-[12.5px] text-ink-2">{stripHtml(c.conteudoHtml)}</p>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} className="mt-2 flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar(e);
          }}
          rows={2}
          placeholder="Escreva um comentário… (⌘+Enter envia)"
          className="min-h-9 flex-1 resize-none rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
        />
        <Button type="submit" variant="primary" disabled={!texto.trim() || comentar.isPending} aria-label="Enviar comentário">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </Section>
  );
}

export function AtividadeInspector({ id }: { id: number }) {
  const { idProjeto, colunas } = useYard();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const mover = useMoverAtividade();
  const remover = useRemoverAtividade();
  const [confirmando, setConfirmando] = useState(false);

  const found = findAtividade(colunas, id);
  if (!found || !idProjeto) return null;
  const { atividade, coluna } = found;
  const ordenadas = [...(colunas ?? [])].sort((a, b) => a.ordem - b.ordem);

  return (
    <InspectorShell
      icon={<Package className="h-5 w-5" />}
      eyebrow={`Atividade · ${coluna.nome}`}
      title={atividade.titulo}
      subtitle={atividade.protocoloChamadoOrigem ? `veio do chamado ${atividade.protocoloChamadoOrigem}` : `criada ${formatRelative(atividade.dataCriacao)}`}
      adminPath={`/projetos/${idProjeto}/atividades`}
      footer={
        <>
          <Button variant="secondary" onClick={() => openDrawer({ form: 'editar-atividade', idProjeto, idAtividade: id })}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          {confirmando ? (
            <Button
              variant="danger"
              disabled={remover.isPending}
              onClick={() => remover.mutate({ idProjeto, idAtividade: id }, { onSuccess: clearSelection })}
            >
              <Trash2 className="h-3.5 w-3.5" /> Confirmar remoção
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmando(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </Button>
          )}
        </>
      }
    >
      <StatusLine>
        <StatusChip status={atividade.tipo} tone={TIPO_TONE[atividade.tipo]} />
        <StatusChip status={atividade.prioridade} />
        {coluna.ehColunaConclusao && <StatusChip status="Concluída" tone="ok" />}
      </StatusLine>

      {/* Alternativa ao arraste (teclado / acessibilidade): escolher a zona de destino. */}
      <Section title="Mover para a zona">
        <div className="flex flex-wrap gap-1.5">
          {ordenadas.map((c) => (
            <button
              key={c.idColuna}
              disabled={c.idColuna === coluna.idColuna || mover.isPending}
              onClick={() => mover.mutate({ idProjeto, idAtividade: id, idColunaDestino: c.idColuna, novaOrdem: c.atividades.length })}
              className={cx(
                'flex items-center gap-1 rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition',
                c.idColuna === coluna.idColuna
                  ? 'border-transparent bg-ink text-white'
                  : 'border-line bg-white text-ink-2 hover:border-brand hover:text-brand'
              )}
            >
              {c.idColuna !== coluna.idColuna && <ArrowRightLeft className="h-3 w-3" />}
              {c.nome}
            </button>
          ))}
        </div>
      </Section>

      <div className="mt-3">
        <KeyValue
          rows={[
            ['Responsável', atividade.nomeResponsavel ?? 'Ninguém'],
            ['Prazo', atividade.dataPrazo ? formatDate(atividade.dataPrazo) : '—'],
            ['Prioridade', label(atividade.prioridade)],
            ['Concluída em', atividade.dataConclusao ? formatDate(atividade.dataConclusao) : '—'],
          ]}
        />
      </div>

      {atividade.descricao && (
        <Section title="Descrição">
          <p className="line-clamp-6 whitespace-pre-line rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
            {stripHtml(atividade.descricao)}
          </p>
        </Section>
      )}

      <Comentarios idAtividade={id} />
    </InspectorShell>
  );
}
