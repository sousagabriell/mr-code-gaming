import { BookOpen, Briefcase, Check, Landmark as LandmarkIcon, Library, Plus, Server, Target, University, Wallet } from 'lucide-react';
import { useDashboardQuery } from '../../api/queries';
import { useGame } from '../../hooks/useGame';
import { useWorld } from '../../hooks/useWorld';
import { formatBRL, formatBRLCompact, formatDate, formatRelative } from '../../lib/format';
import { useMetasStore } from '../../store/metasStore';
import { useUiStore, type LandmarkKind } from '../../store/uiStore';
import { useWikiStore } from '../../store/wikiStore';
import { formatarDia } from '../../world/datas';
import { computeSaldo } from '../../world/health';
import {
  METRICA_EM_REAIS,
  METRICA_LABEL,
  xpDeMetas,
  type MetaComProgresso,
  type MetaMetrica,
  type MetaSituacao,
} from '../../world/metas';
import { label } from '../../world/status';
import { cx } from '../tones';
import { Button, EmptyHint, KeyValue, ListRow, ProgressBar, Section, StatusChip } from '../ui';
import { InspectorShell, StatusLine } from './Shell';

function Banco() {
  const { faturas, despesas } = useWorld();
  const { data: dashboard } = useDashboardQuery();
  const select = useUiStore((s) => s.select);
  const enterInterior = useUiStore((s) => s.enterInterior);
  const fin = dashboard?.financeiroMesAtual;
  const saldo = computeSaldo(faturas, despesas);
  const emAberto = faturas
    .filter((f) => f.status === 'Atrasado' || f.status === 'Pendente')
    .sort((a, b) => (a.status === 'Atrasado' ? -1 : 1) - (b.status === 'Atrasado' ? -1 : 1));

  return (
    <InspectorShell
      icon={<LandmarkIcon className="h-5 w-5" />}
      eyebrow="Financeiro · BC"
      title="Banco Central"
      subtitle="Faturas, despesas e caixa"
      adminPath="/financeiro/faturas"
      footer={
        <Button variant="primary" onClick={() => enterInterior('banco')}>
          <Wallet className="h-3.5 w-3.5" /> Ver conta bancária
        </Button>
      }
    >
      <StatusLine>
        <StatusChip status={saldo >= 0 ? 'Saldo positivo' : 'Saldo negativo'} tone={saldo >= 0 ? 'ok' : 'bad'} />
        <span className="font-semibold text-ink tabular">{formatBRL(saldo)}</span>
        <span>realizado</span>
      </StatusLine>
      {fin && (
        <div className="mt-2">
          <KeyValue
            rows={[
              ['Recebido no mês', formatBRL(fin.totalRecebido)],
              ['A receber', formatBRL(fin.totalAReceber)],
              ['Atrasado', <span key="atrasado" className={fin.totalAtrasado > 0 ? 'text-bad' : undefined}>{formatBRL(fin.totalAtrasado)}</span>],
              ['Despesas do mês', formatBRL(fin.totalDespesas)],
            ]}
          />
        </div>
      )}
      <Section title={`Faturas em aberto (${emAberto.length})`}>
        {emAberto.length === 0 && <EmptyHint>Tudo recebido.</EmptyHint>}
        {emAberto.slice(0, 8).map((f) => (
          <ListRow
            key={f.idFatura}
            title={`${formatBRL(f.valor)} · ${f.clienteNome}`}
            subtitle={`${f.numeroFatura} · vence ${formatDate(f.dataVencimento)}`}
            right={<StatusChip status={f.status} />}
            onClick={() => select({ kind: 'fatura', id: f.idFatura })}
          />
        ))}
      </Section>
    </InspectorShell>
  );
}

function DataCenter() {
  const { observabilidade } = useWorld();
  const vps = observabilidade?.vps;
  return (
    <InspectorShell icon={<Server className="h-5 w-5" />} eyebrow="Observabilidade · DC" title="Data Center" subtitle="VPS e serviços monitorados" adminPath="/observabilidade">
      {!observabilidade?.habilitado || !vps ? (
        <StatusLine>
          <StatusChip status="Offline" tone="neutral" />
          <span>Observabilidade desligada neste ambiente.</span>
        </StatusLine>
      ) : (
        <>
          <StatusLine>
            <StatusChip status={vps.disponivel ? 'Operacional' : 'Indisponível'} tone={vps.disponivel ? 'ok' : 'bad'} />
            <span>uptime {Math.floor(vps.uptimeSegundos / 3600)} h</span>
          </StatusLine>
          {[
            ['CPU (1 min)', (vps.cpuLoad1m / vps.numNucleos) * 100],
            ['Memória', vps.memPercentual],
            ['Disco', vps.discoPercentual],
          ].map(([nome, pct]) => (
            <div key={nome} className="mt-3">
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-ink-2">{nome}</span>
                <span className="font-semibold text-ink tabular">{Math.round(pct as number)}%</span>
              </div>
              <ProgressBar value={(pct as number) / 100} tone={(pct as number) > 85 ? 'bad' : (pct as number) > 60 ? 'warn' : 'ok'} />
            </div>
          ))}
        </>
      )}
    </InspectorShell>
  );
}

function Universidade() {
  const { wikiPaginas } = useWorld();
  const enterInterior = useUiStore((s) => s.enterInterior);
  const abrir = useWikiStore((s) => s.abrir);
  const recentes = [...wikiPaginas].sort((a, b) => b.dataAtualizacao.localeCompare(a.dataAtualizacao));

  /** Clicar num artigo aqui já entra na biblioteca com ele aberto, em vez de sair para o portal. */
  const abrirNaBiblioteca = (idPagina: number) => {
    abrir(idPagina);
    enterInterior('universidade');
  };

  return (
    <InspectorShell
      icon={<University className="h-5 w-5" />}
      eyebrow="Wiki · UN"
      title="Universidade"
      subtitle={`${wikiPaginas.length} artigos na biblioteca`}
      adminPath="/wiki"
      footer={
        <Button variant="primary" onClick={() => enterInterior('universidade')}>
          <Library className="h-3.5 w-3.5" /> Entrar na biblioteca
        </Button>
      }
    >
      <Section title="Atualizados recentemente">
        {recentes.length === 0 && <EmptyHint>Nenhum artigo ainda.</EmptyHint>}
        {recentes.slice(0, 10).map((w) => (
          <ListRow
            key={w.idPagina}
            title={w.titulo}
            subtitle={`${w.autorNome} · ${formatRelative(w.dataAtualizacao)}`}
            right={<BookOpen className="h-3.5 w-3.5 text-ink-3" />}
            onClick={() => abrirNaBiblioteca(w.idPagina)}
          />
        ))}
      </Section>
    </InspectorShell>
  );
}

function Escritorio() {
  const { contratos, colaboradores } = useWorld();
  const select = useUiStore((s) => s.select);
  const ativos = colaboradores.filter((c) => c.ativo);
  const ordem = ['AguardandoAprovacao', 'Ativo', 'Rascunho', 'Encerrado', 'Cancelado'];
  const ordenados = [...contratos].sort((a, b) => ordem.indexOf(a.status) - ordem.indexOf(b.status));

  return (
    <InspectorShell icon={<Briefcase className="h-5 w-5" />} eyebrow="Equipe e contratos · ES" title="Escritório" subtitle="Contratos e pessoas da Mr Code" adminPath="/contratos">
      <Section title={`Contratos (${contratos.length})`}>
        {ordenados.length === 0 && <EmptyHint>Nenhum contrato.</EmptyHint>}
        {ordenados.map((c) => (
          <ListRow
            key={c.idContrato}
            title={c.clienteNome}
            subtitle={`${c.numeroContrato} · ${label(c.tipo)}${c.valorMensal ? ` · ${formatBRL(c.valorMensal)}/mês` : ''}`}
            right={<StatusChip status={c.status} />}
            onClick={() => select({ kind: 'cliente', id: c.idCliente })}
          />
        ))}
      </Section>
      {colaboradores.length > 0 && (
        <Section title={`Equipe ativa (${ativos.length})`}>
          {ativos.map((c) => (
            <ListRow
              key={c.idUsuarioAdmin}
              title={c.nome}
              subtitle={c.cargo ?? label(c.tipoUsuario)}
              onClick={() => select({ kind: 'colaborador', id: c.idUsuarioAdmin })}
            />
          ))}
        </Section>
      )}
    </InspectorShell>
  );
}

/** Como o progresso de uma meta é escrito: contagem, ou reais quando a métrica é receita. */
const valorDaMeta = (metrica: MetaMetrica, valor: number) =>
  METRICA_EM_REAIS(metrica) ? formatBRLCompact(valor) : valor.toLocaleString('pt-BR');

const SITUACAO: Record<MetaSituacao, { titulo: string; tone: 'ok' | 'info' | 'neutral' }> = {
  ativa: { titulo: 'Em andamento', tone: 'info' },
  agendada: { titulo: 'Agendadas', tone: 'neutral' },
  cumprida: { titulo: 'Cumpridas', tone: 'ok' },
  expirada: { titulo: 'Expiradas', tone: 'neutral' },
};

function LinhaDaMeta({ item }: { item: MetaComProgresso }) {
  const openDrawer = useUiStore((s) => s.openDrawer);
  const { meta, progresso, pct, situacao, cumpridaEm } = item;
  const cumprida = situacao === 'cumprida';

  return (
    <button
      onClick={() => openDrawer({ form: 'editar-meta', id: meta.id })}
      className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
    >
      <div className="flex items-start gap-2">
        <span
          className={cx(
            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full',
            cumprida ? 'bg-ok text-white' : situacao === 'expirada' ? 'bg-surface-2 text-ink-3' : 'bg-brand-soft text-brand'
          )}
        >
          {cumprida ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Target className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{meta.titulo}</span>
          <span className="block truncate text-[11px] text-ink-2">
            {METRICA_LABEL[meta.metrica]}
            {meta.nomeResponsavel && ` · ${meta.nomeResponsavel}`}
            {' · '}
            {formatarDia(meta.inicio)} a {formatarDia(meta.fim)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[12px] font-bold text-ink tabular">
            {valorDaMeta(meta.metrica, progresso)}/{valorDaMeta(meta.metrica, meta.alvo)}
          </span>
          <span className={cx('block text-[11px] font-semibold tabular', cumprida ? 'text-ok' : 'text-ink-3')}>
            {cumprida ? '+' : ''}
            {meta.recompensa} XP
          </span>
        </span>
      </div>
      {/* `cumpridaEm` é ISO com fuso (veio de `toISOString`), diferente da janela em dia puro. */}
      {cumprida ? (
        <p className="mt-1.5 text-[11px] text-ok">Batida em {formatDate(cumpridaEm!)}</p>
      ) : (
        <ProgressBar value={pct} tone={situacao === 'expirada' ? 'bad' : 'info'} className="mt-2" />
      )}
    </button>
  );
}

/**
 * A Prefeitura governa as metas de XP: cadastrar, dar prazo e recompensa, acompanhar. O progresso
 * sai do mesmo dado real do resto do jogo (`world/metas.ts`); o que é do usuário — a meta em si e o
 * registro do que já foi batido — mora no navegador (§17).
 */
function Prefeitura() {
  const { metas } = useGame();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const semArmazenamento = useMetasStore((s) => s.semArmazenamento);
  const cumpridas = useMetasStore((s) => s.cumpridas);
  const bonus = xpDeMetas(cumpridas);
  const ativas = metas.filter((m) => m.situacao === 'ativa').length;

  const grupos = (['ativa', 'agendada', 'cumprida', 'expirada'] as MetaSituacao[])
    .map((s) => ({ situacao: s, itens: metas.filter((m) => m.situacao === s) }))
    .filter((g) => g.itens.length > 0);

  return (
    <InspectorShell
      icon={<LandmarkIcon className="h-5 w-5" />}
      eyebrow="Metas e XP · PF"
      title="Prefeitura"
      subtitle="Metas com prazo e recompensa"
      footer={
        <Button variant="primary" onClick={() => openDrawer({ form: 'nova-meta' })}>
          <Plus className="h-3.5 w-3.5" /> Nova meta
        </Button>
      }
    >
      <StatusLine>
        <StatusChip status={ativas > 0 ? `${ativas} em andamento` : 'Nenhuma em andamento'} tone={ativas > 0 ? 'info' : 'neutral'} />
        <span>
          {Object.keys(cumpridas).length} cumprida{Object.keys(cumpridas).length === 1 ? '' : 's'} ·{' '}
          <span className="font-semibold text-ink tabular">{bonus} XP</span> de bônus
        </span>
      </StatusLine>

      {semArmazenamento && (
        <p className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-[12px] text-bad">
          Este navegador não está guardando dados (aba anônima ou cota cheia). As metas valem só até
          fechar a aba.
        </p>
      )}

      {metas.length === 0 && (
        <EmptyHint>
          Nenhuma meta ainda. Combine um objetivo com prazo — "resolver 20 chamados até o fim do mês" —
          e a cidade ganha XP quando a equipe bater.
        </EmptyHint>
      )}

      {grupos.map((g) => (
        <Section key={g.situacao} title={`${SITUACAO[g.situacao].titulo} (${g.itens.length})`}>
          <div className="space-y-2">
            {g.itens.map((item) => (
              <LinhaDaMeta key={item.meta.id} item={item} />
            ))}
          </div>
        </Section>
      ))}
    </InspectorShell>
  );
}

export function LandmarkInspector({ kind }: { kind: LandmarkKind }) {
  if (kind === 'banco') return <Banco />;
  if (kind === 'datacenter') return <DataCenter />;
  if (kind === 'universidade') return <Universidade />;
  if (kind === 'escritorio') return <Escritorio />;
  return <Prefeitura />;
}

