import { Construction, Flag, Warehouse } from 'lucide-react';
import { useKanbanQuery, useProjetoDetalheQuery } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { formatDate } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { clienteCode, isProjetoAtrasado, label, projetoCode, projetoProgress } from '../../world/status';
import { cx } from '../tones';
import { Button, EmptyHint, KeyValue, ListRow, ProgressBar, Section, StatusChip } from '../ui';
import { InspectorShell, StatusLine } from './Shell';

const TIPO_TONE = { Tarefa: 'info', Bug: 'bad', Melhoria: 'ok', Chamado: 'warn' } as const;

export function ProjetoInspector({ id }: { id: number }) {
  const { projetos } = useWorld();
  const select = useUiStore((s) => s.select);
  const enterYard = useUiStore((s) => s.enterYard);
  const { data: detalhe } = useProjetoDetalheQuery(id);
  const { data: colunas, isPending: kanbanPending } = useKanbanQuery(id);

  const projeto = projetos.find((p) => p.idProjeto === id);
  if (!projeto) return null;

  const progress = projetoProgress(projeto);
  const atrasado = isProjetoAtrasado(projeto);
  const totalAtividades = colunas?.reduce((s, c) => s + c.atividades.length, 0) ?? 0;
  const concluidas = colunas?.filter((c) => c.ehColunaConclusao).reduce((s, c) => s + c.atividades.length, 0) ?? 0;
  const pendentes = (colunas ?? [])
    .filter((c) => !c.ehColunaConclusao)
    .flatMap((c) => c.atividades.map((a) => ({ ...a, coluna: c.nome })))
    .slice(0, 5);

  return (
    <InspectorShell
      icon={<Construction className="h-5 w-5" />}
      eyebrow={`Projeto · ${projetoCode(id)}`}
      title={projeto.nome}
      subtitle={
        <button className="hover:text-brand hover:underline" onClick={() => select({ kind: 'cliente', id: projeto.idCliente })}>
          {clienteCode(projeto.idCliente)} · {projeto.clienteNome}
        </button>
      }
      adminPath={`/projetos/${id}/atividades`}
      footer={
        <Button variant="primary" onClick={() => enterYard(id)}>
          <Warehouse className="h-3.5 w-3.5" /> Entrar no pátio de obras
        </Button>
      }
    >
      <StatusLine>
        <StatusChip status={projeto.status} />
        <StatusChip status={projeto.prioridade} />
        {atrasado && <StatusChip status="Atrasado" tone="bad" />}
      </StatusLine>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[12px]">
          <span className="text-ink-2">Cronograma</span>
          <span className="font-semibold text-ink tabular">{Math.round(progress * 100)}%</span>
        </div>
        <ProgressBar value={progress} tone={atrasado ? 'bad' : projeto.status === 'Concluido' ? 'ok' : 'info'} />
        {totalAtividades > 0 && (
          <>
            <div className="mb-1 mt-2.5 flex justify-between text-[12px]">
              <span className="text-ink-2">Atividades concluídas</span>
              <span className="font-semibold text-ink tabular">
                {concluidas}/{totalAtividades}
              </span>
            </div>
            <ProgressBar value={concluidas / totalAtividades} tone="ok" />
          </>
        )}
      </div>

      <div className="mt-2">
        <KeyValue
          rows={[
            ['Início', formatDate(projeto.dataInicio)],
            ['Previsão de entrega', formatDate(projeto.dataPrevisaoFim)],
            ['Concluído em', projeto.dataConclusao ? formatDate(projeto.dataConclusao) : '—'],
            ['Prioridade', label(projeto.prioridade)],
          ]}
        />
      </div>

      <Section title="Quadro (pátio de obras)">
        {kanbanPending && <EmptyHint>Carregando quadro…</EmptyHint>}
        {colunas && colunas.length > 0 && (
          <div className="flex gap-1.5">
            {colunas.map((c) => (
              <div
                key={c.idColuna}
                className={cx('min-w-0 flex-1 rounded-lg px-2 py-1.5', c.ehColunaConclusao ? 'bg-ok-soft' : 'bg-surface-2')}
                title={c.nome}
              >
                <p className="truncate text-[10px] font-medium text-ink-2">{c.nome}</p>
                <p className="text-[15px] font-bold text-ink tabular">{c.atividades.length}</p>
              </div>
            ))}
          </div>
        )}
        {pendentes.length > 0 && (
          <div className="mt-1.5">
            {pendentes.map((a) => (
              <ListRow
                key={a.idAtividade}
                title={a.titulo}
                subtitle={`${a.coluna}${a.nomeResponsavel ? ` · ${a.nomeResponsavel}` : ''}`}
                right={<StatusChip status={a.tipo} tone={TIPO_TONE[a.tipo]} />}
              />
            ))}
          </div>
        )}
      </Section>

      {detalhe && detalhe.equipe.length > 0 && (
        <Section title={`Equipe (${detalhe.equipe.length})`}>
          {detalhe.equipe.map((m) => (
            <ListRow
              key={m.idUsuarioAdmin}
              title={m.nomeUsuarioAdmin}
              subtitle={m.papel ?? undefined}
              onClick={() => select({ kind: 'colaborador', id: m.idUsuarioAdmin })}
            />
          ))}
        </Section>
      )}

      {detalhe && detalhe.marcos.length > 0 && (
        <Section title="Marcos">
          {detalhe.marcos.map((m) => (
            <div key={m.idMarco} className="flex items-center gap-2 px-2 py-1 text-[13px]">
              <Flag className={cx('h-3.5 w-3.5', m.concluido ? 'text-ok' : 'text-ink-3')} />
              <span className={cx('flex-1 truncate', m.concluido ? 'text-ink-3 line-through' : 'text-ink')}>{m.titulo}</span>
              <span className="text-[11px] text-ink-3 tabular">{formatDate(m.dataPrevista)}</span>
            </div>
          ))}
        </Section>
      )}
    </InspectorShell>
  );
}
