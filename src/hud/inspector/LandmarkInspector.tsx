import { BookOpen, Landmark as LandmarkIcon, Server, University } from 'lucide-react';
import { useDashboardQuery } from '../../api/queries';
import { environment } from '../../config/environment';
import { useWorld } from '../../hooks/useWorld';
import { formatBRL, formatDate, formatRelative } from '../../lib/format';
import { useUiStore, type LandmarkKind } from '../../store/uiStore';
import { computeSaldo } from '../../world/health';
import { label } from '../../world/status';
import { EmptyHint, KeyValue, ListRow, ProgressBar, Section, StatusChip } from '../ui';
import { InspectorShell, StatusLine } from './Shell';

function Banco() {
  const { faturas, despesas } = useWorld();
  const { data: dashboard } = useDashboardQuery();
  const select = useUiStore((s) => s.select);
  const fin = dashboard?.financeiroMesAtual;
  const saldo = computeSaldo(faturas, despesas);
  const emAberto = faturas
    .filter((f) => f.status === 'Atrasado' || f.status === 'Pendente')
    .sort((a, b) => (a.status === 'Atrasado' ? -1 : 1) - (b.status === 'Atrasado' ? -1 : 1));

  return (
    <InspectorShell icon={<LandmarkIcon className="h-5 w-5" />} eyebrow="Financeiro · BC" title="Banco Central" subtitle="Faturas, despesas e caixa" adminPath="/financeiro/faturas">
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
  const recentes = [...wikiPaginas].sort((a, b) => b.dataAtualizacao.localeCompare(a.dataAtualizacao));
  return (
    <InspectorShell icon={<University className="h-5 w-5" />} eyebrow="Wiki · UN" title="Universidade" subtitle={`${wikiPaginas.length} artigos na biblioteca`} adminPath="/wiki">
      <Section title="Atualizados recentemente">
        {recentes.length === 0 && <EmptyHint>Nenhum artigo ainda.</EmptyHint>}
        {recentes.slice(0, 10).map((w) => (
          <ListRow
            key={w.idPagina}
            title={w.titulo}
            subtitle={`${w.autorNome} · ${formatRelative(w.dataAtualizacao)}`}
            right={<BookOpen className="h-3.5 w-3.5 text-ink-3" />}
            onClick={() => window.open(`${environment.adminUrl}/wiki/${w.idPagina}`, '_blank', 'noreferrer')}
          />
        ))}
      </Section>
    </InspectorShell>
  );
}

function Prefeitura() {
  const { contratos, colaboradores } = useWorld();
  const select = useUiStore((s) => s.select);
  const ativos = colaboradores.filter((c) => c.ativo);
  const ordem = ['AguardandoAprovacao', 'Ativo', 'Rascunho', 'Encerrado', 'Cancelado'];
  const ordenados = [...contratos].sort((a, b) => ordem.indexOf(a.status) - ordem.indexOf(b.status));

  return (
    <InspectorShell icon={<LandmarkIcon className="h-5 w-5" />} eyebrow="Equipe e contratos · PF" title="Prefeitura" subtitle="Contratos e pessoas da Mr Code" adminPath="/contratos">
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

export function LandmarkInspector({ kind }: { kind: LandmarkKind }) {
  if (kind === 'banco') return <Banco />;
  if (kind === 'datacenter') return <DataCenter />;
  if (kind === 'universidade') return <Universidade />;
  return <Prefeitura />;
}

