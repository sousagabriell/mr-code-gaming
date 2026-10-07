import { useEffect, useMemo, type ReactNode } from 'react';
import { useCityStore } from '../../store/cityStore';
import { pickContrato } from '../../world/layout';
import { PRIORIDADE_COLOR } from '../../world/colors';
import { computeSaldo } from '../../world/health';
import { formatBRL, formatDate } from '../../lib/format';
import { environment } from '../../config/environment';

const STATUS_COLOR_CLASS: Record<string, string> = {
  Ativo: 'text-[var(--color-success)]',
  Pago: 'text-[var(--color-success)]',
  Aberto: 'text-[var(--color-danger)]',
  Atrasado: 'text-[var(--color-danger)]',
  EmAndamento: 'text-[var(--color-warning)]',
  Pendente: 'text-[var(--color-warning)]',
  Planejamento: 'text-[var(--text-secondary)]',
  Pausado: 'text-[var(--color-warning)]',
  Encerrado: 'text-[var(--text-muted)]',
  Cancelado: 'text-[var(--text-muted)]',
  Concluido: 'text-[var(--color-success)]',
};

function statusClass(status: string): string {
  return STATUS_COLOR_CLASS[status] ?? 'text-[var(--text-secondary)]';
}

function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-flex items-center gap-1 font-[var(--font-mono)] text-xs font-semibold text-[var(--brand-blue)] hover:underline"
    >
      {children} →
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 border-t border-[var(--border-subtle)] pt-4 first:mt-0 first:border-0 first:pt-0">
      <h3 className="mb-2 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[1px] text-[var(--text-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function EntityPanel() {
  const selected = useCityStore((s) => s.selected);
  const clearSelection = useCityStore((s) => s.clearSelection);
  const clientes = useCityStore((s) => s.clientes);
  const contratos = useCityStore((s) => s.contratos);
  const projetos = useCityStore((s) => s.projetos);
  const chamados = useCityStore((s) => s.chamados);
  const faturas = useCityStore((s) => s.faturas);
  const despesas = useCityStore((s) => s.despesas);
  const wikiPaginas = useCityStore((s) => s.wikiPaginas);
  const observabilidade = useCityStore((s) => s.observabilidade);
  const colaboradores = useCityStore((s) => s.colaboradores);
  const kanbanByProjeto = useCityStore((s) => s.kanbanByProjeto);
  const loadKanban = useCityStore((s) => s.loadKanban);

  useEffect(() => {
    if (selected?.kind === 'projeto') loadKanban(selected.id);
  }, [selected, loadKanban]);

  const content = useMemo(() => {
    if (!selected) return null;

    if (selected.kind === 'cliente') {
      const cliente = clientes.find((c) => c.idCliente === selected.id);
      if (!cliente) return null;
      const contrato = pickContrato(contratos, cliente.idCliente);
      const projetosDoCliente = projetos.filter((p) => p.idCliente === cliente.idCliente);
      const abertosDoCliente = chamados.filter(
        (c) => c.idCliente === cliente.idCliente && (c.status === 'Aberto' || c.status === 'EmAndamento')
      );

      return {
        title: cliente.nomeFantasia ?? cliente.razaoSocial,
        eyebrow: 'Cliente',
        body: (
          <>
            <Section title="Contrato">
              {contrato ? (
                <>
                  <p className="text-sm text-[var(--text-primary)]">
                    {contrato.numeroContrato} · <span className={statusClass(contrato.status)}>{contrato.status}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {contrato.tipo}
                    {contrato.valorMensal ? ` · ${formatBRL(contrato.valorMensal)}/mês` : ''}
                    {contrato.valorTotal ? ` · ${formatBRL(contrato.valorTotal)} total` : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Sem contrato cadastrado.</p>
              )}
            </Section>

            <Section title={`Projetos (${projetosDoCliente.length})`}>
              {projetosDoCliente.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nenhum projeto.</p>}
              <ul className="space-y-1.5">
                {projetosDoCliente.map((p) => (
                  <li key={p.idProjeto} className="text-sm text-[var(--text-secondary)]">
                    {p.nome} · <span className={statusClass(p.status)}>{p.status}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`Chamados abertos (${abertosDoCliente.length})`}>
              {abertosDoCliente.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">Nenhum chamado em aberto.</p>
              )}
              <ul className="space-y-1.5">
                {abertosDoCliente.map((c) => (
                  <li key={c.idChamado} className="text-sm text-[var(--text-secondary)]">
                    {c.protocolo} · {c.assunto} ·{' '}
                    <span style={{ color: PRIORIDADE_COLOR[c.prioridade] }}>{c.prioridade}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <AdminLink href={`${environment.adminUrl}/clientes/${cliente.idCliente}`}>Abrir no MrCodeAdmin</AdminLink>
          </>
        ),
      };
    }

    if (selected.kind === 'projeto') {
      const projeto = projetos.find((p) => p.idProjeto === selected.id);
      if (!projeto) return null;
      const colunas = kanbanByProjeto[projeto.idProjeto];

      return {
        title: projeto.nome,
        eyebrow: `Projeto · ${projeto.clienteNome}`,
        body: (
          <>
            <Section title="Status">
              <p className="text-sm text-[var(--text-primary)]">
                <span className={statusClass(projeto.status)}>{projeto.status}</span> · Prioridade {projeto.prioridade}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Previsão: {formatDate(projeto.dataPrevisaoFim)}</p>
            </Section>

            <Section title="Kanban">
              {!colunas && <p className="text-sm text-[var(--text-muted)]">Carregando quadro…</p>}
              {colunas && colunas.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">Sem colunas no quadro.</p>
              )}
              {colunas && colunas.length > 0 && (
                <ul className="space-y-1">
                  {colunas.map((col) => (
                    <li key={col.idColuna} className="flex justify-between text-sm text-[var(--text-secondary)]">
                      <span>{col.nome}</span>
                      <span className="font-[var(--font-mono)]">{col.atividades.length}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <AdminLink href={`${environment.adminUrl}/projetos/${projeto.idProjeto}/atividades`}>
              Abrir quadro completo
            </AdminLink>
          </>
        ),
      };
    }

    if (selected.kind === 'datacenter') {
      const vps = observabilidade?.vps;
      return {
        title: 'Data Center',
        eyebrow: 'Observabilidade',
        body: (
          <>
            {!observabilidade?.habilitado || !vps ? (
              <p className="text-sm text-[var(--text-muted)]">Observabilidade desligada neste ambiente de dev.</p>
            ) : (
              <Section title="VPS">
                <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                  <li>
                    CPU (1m): {vps.cpuLoad1m.toFixed(2)} / {vps.numNucleos} núcleos
                  </li>
                  <li>Memória: {vps.memPercentual.toFixed(0)}%</li>
                  <li>Disco: {vps.discoPercentual.toFixed(0)}%</li>
                  <li>Uptime: {Math.floor(vps.uptimeSegundos / 3600)}h</li>
                </ul>
              </Section>
            )}
            <AdminLink href={`${environment.adminUrl}/observabilidade`}>Abrir observabilidade</AdminLink>
          </>
        ),
      };
    }

    if (selected.kind === 'banco') {
      const pagas = faturas.filter((f) => f.status === 'Pago');
      const pendentes = faturas.filter((f) => f.status === 'Pendente');
      const atrasadas = faturas.filter((f) => f.status === 'Atrasado');
      const despesasPagas = despesas.filter((d) => d.status === 'Pago');
      const saldo = computeSaldo(faturas, despesas);

      return {
        title: 'Banco Central',
        eyebrow: 'Financeiro',
        body: (
          <>
            <Section title="Saldo (realizado)">
              <p
                className="text-lg font-[var(--font-mono)]"
                style={{ color: saldo >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
              >
                {formatBRL(saldo)}
              </p>
            </Section>
            <Section title="Faturas">
              <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                <li>
                  Pagas: {pagas.length} · {formatBRL(pagas.reduce((s, f) => s + f.valor, 0))}
                </li>
                <li>Pendentes: {pendentes.length}</li>
                <li className={atrasadas.length > 0 ? 'text-[var(--color-danger)]' : undefined}>
                  Atrasadas: {atrasadas.length}
                </li>
              </ul>
            </Section>
            <Section title="Despesas">
              <p className="text-sm text-[var(--text-secondary)]">
                Pagas: {despesasPagas.length} · {formatBRL(despesasPagas.reduce((s, d) => s + d.valor, 0))}
              </p>
            </Section>
            <AdminLink href={`${environment.adminUrl}/financeiro/faturas`}>Abrir financeiro</AdminLink>
          </>
        ),
      };
    }

    if (selected.kind === 'universidade') {
      return {
        title: 'Universidade',
        eyebrow: 'Wiki',
        body: (
          <>
            <Section title={`Artigos (${wikiPaginas.length})`}>
              {wikiPaginas.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nenhum artigo ainda.</p>}
              <ul className="space-y-1.5">
                {wikiPaginas.slice(0, 8).map((w) => (
                  <li key={w.idPagina} className="text-sm text-[var(--text-secondary)]">
                    {w.titulo} <span className="text-[var(--text-muted)]">· {w.autorNome}</span>
                  </li>
                ))}
              </ul>
            </Section>
            <AdminLink href={`${environment.adminUrl}/wiki`}>Abrir wiki</AdminLink>
          </>
        ),
      };
    }

    // prefeitura
    const ativos = colaboradores.filter((c) => c.ativo);
    const inativos = colaboradores.filter((c) => !c.ativo);
    return {
      title: 'Prefeitura',
      eyebrow: 'Equipe',
      body: (
        <>
          <Section title={`Colaboradores ativos (${ativos.length})`}>
            {ativos.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nenhum colaborador ativo.</p>}
            <ul className="space-y-1.5">
              {ativos.map((c) => (
                <li key={c.idUsuarioAdmin} className="text-sm text-[var(--text-secondary)]">
                  {c.nome} <span className="text-[var(--text-muted)]">· {c.cargo ?? c.tipoUsuario}</span>
                </li>
              ))}
            </ul>
          </Section>
          {inativos.length > 0 && (
            <Section title={`Inativos (${inativos.length})`}>
              <ul className="space-y-1.5">
                {inativos.map((c) => (
                  <li key={c.idUsuarioAdmin} className="text-sm text-[var(--text-muted)]">
                    {c.nome}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <AdminLink href={`${environment.adminUrl}/equipe`}>Abrir equipe</AdminLink>
        </>
      ),
    };
  }, [
    selected,
    clientes,
    contratos,
    projetos,
    chamados,
    faturas,
    despesas,
    wikiPaginas,
    observabilidade,
    colaboradores,
    kanbanByProjeto,
  ]);

  if (!content) return null;

  return (
    <aside className="pointer-events-auto absolute inset-y-0 right-0 w-full max-w-[360px] overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]/97 p-5 backdrop-blur">
      <button
        onClick={clearSelection}
        className="absolute right-4 top-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        aria-label="Fechar"
      >
        ✕
      </button>
      <p className="font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[1px] text-[var(--brand-blue)]">
        {content.eyebrow}
      </p>
      <h2 className="mt-1 pr-6 font-[var(--font-mono)] text-lg font-semibold text-[var(--text-primary)]">
        {content.title}
      </h2>
      {content.body}
    </aside>
  );
}
