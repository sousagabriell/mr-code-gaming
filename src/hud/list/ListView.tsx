import type { ReactNode } from 'react';
import { ArrowLeft, Plus, Warehouse } from 'lucide-react';
import { useWorld } from '../../hooks/useWorld';
import { useYard } from '../../hooks/useYard';
import { formatBRL, formatDate } from '../../lib/format';
import { webglAvailable } from '../../store/prefsStore';
import { LANDMARK_KINDS, useUiStore, type EntityRef } from '../../store/uiStore';
import { TIPO_COLOR } from '../../scene/yard/crateColors';
import { pickContrato } from '../../world/layout';
import {
  clienteCode,
  clienteNome,
  isChamadoAberto,
  isProjetoAtrasado,
  label,
  LANDMARK_META,
  projetoCode,
  projetoProgress,
} from '../../world/status';
import { cx } from '../tones';
import { Button, ProgressBar, StatusChip } from '../ui';

/** Item selecionável: botão nativo (Tab/Enter/Espaço), marcado com aria-current quando selecionado. */
function Item({ target, children, className }: { target: EntityRef; children: ReactNode; className?: string }) {
  const select = useUiStore((s) => s.select);
  const selected = useUiStore((s) => s.selected);
  const current = !!selected && selected.kind === target.kind && (!('id' in target) || ('id' in selected && selected.id === target.id));
  return (
    <button
      onClick={() => select(target)}
      aria-current={current ? 'true' : undefined}
      className={cx(
        'w-full rounded-xl border bg-white px-3 py-2.5 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/30',
        current ? 'border-brand ring-2 ring-brand/20' : 'border-line',
        className
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mb-6" aria-label={title}>
      <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-2">
        {title}
        {count !== undefined && <span className="ml-1.5 font-semibold text-ink-3">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function CityList() {
  const world = useWorld();
  const enterYard = useUiStore((s) => s.enterYard);
  const abertos = world.chamados.filter(isChamadoAberto);
  const clientes = [...world.clientes].sort((a, b) => a.idCliente - b.idCliente);
  const projetos = world.projetos.filter((p) => p.status !== 'Cancelado');
  const faturas = world.faturas.filter((f) => f.status === 'Pendente' || f.status === 'Atrasado');

  return (
    <>
      <Section title="Clientes" count={clientes.length}>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c) => {
            const contrato = pickContrato(world.contratos, c.idCliente);
            const chamados = abertos.filter((ch) => ch.idCliente === c.idCliente).length;
            const atrasadas = world.faturas.filter((f) => f.idCliente === c.idCliente && f.status === 'Atrasado').length;
            return (
              <li key={c.idCliente}>
                <Item target={{ kind: 'cliente', id: c.idCliente }}>
                  <span className="flex items-center gap-2">
                    <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand">{clienteCode(c.idCliente)}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{clienteNome(c)}</span>
                    {c.status === 'Inativo' ? <StatusChip status="Inativo" /> : contrato && <StatusChip status={contrato.status} />}
                  </span>
                  <span className="mt-1 block text-[12px] text-ink-2">
                    {chamados} chamado(s) aberto(s) · {world.projetos.filter((p) => p.idCliente === c.idCliente).length} projeto(s)
                    {atrasadas > 0 && <span className="font-semibold text-bad"> · {atrasadas} fatura(s) atrasada(s)</span>}
                  </span>
                </Item>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Chamados abertos" count={abertos.length}>
        <ul className="space-y-1.5">
          {abertos.map((c) => (
            <li key={c.idChamado}>
              <Item target={{ kind: 'chamado', id: c.idChamado }}>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{c.assunto}</span>
                  <StatusChip status={c.prioridade} />
                  <StatusChip status={c.status} />
                </span>
                <span className="block text-[12px] text-ink-2">
                  {c.clienteNome ?? c.origem} · {c.protocolo}
                </span>
              </Item>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Projetos" count={projetos.length}>
        <ul className="space-y-1.5">
          {projetos.map((p) => {
            const atrasado = isProjetoAtrasado(p);
            const pct = Math.round(projetoProgress(p) * 100);
            return (
              <li key={p.idProjeto} className="flex items-stretch gap-2">
                <Item target={{ kind: 'projeto', id: p.idProjeto }} className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-ink-3">{projetoCode(p.idProjeto)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{p.nome}</span>
                    <StatusChip status={atrasado ? 'Atrasado' : p.status} />
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[12px] text-ink-2">
                    {p.clienteNome} · entrega {formatDate(p.dataPrevisaoFim)}
                    <ProgressBar value={pct / 100} tone={atrasado ? 'bad' : 'info'} className="w-20" />
                    <span className="sr-only">cronograma {pct}%</span>
                  </span>
                </Item>
                <Button variant="secondary" className="h-auto" onClick={() => enterYard(p.idProjeto)} aria-label={`Abrir o quadro de ${p.nome}`}>
                  <Warehouse className="h-3.5 w-3.5" /> Quadro
                </Button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Faturas em aberto" count={faturas.length}>
        <ul className="space-y-1.5">
          {faturas.map((f) => (
            <li key={f.idFatura}>
              <Item target={{ kind: 'fatura', id: f.idFatura }}>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                    {formatBRL(f.valor)} · {f.clienteNome}
                  </span>
                  <StatusChip status={f.status} />
                </span>
                <span className="block text-[12px] text-ink-2">
                  {f.numeroFatura} · vence {formatDate(f.dataVencimento)}
                </span>
              </Item>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Prédios da cidade">
        <ul className="grid gap-2 sm:grid-cols-2">
          {LANDMARK_KINDS.map((k) => (
            <li key={k}>
              <Item target={{ kind: k }}>
                <span className="block text-[13px] font-semibold text-ink">{LANDMARK_META[k].nome}</span>
                <span className="block text-[12px] text-ink-2">{LANDMARK_META[k].modulo}</span>
              </Item>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function YardList() {
  const { idProjeto, projeto, colunas } = useYard();
  const exitYard = useUiStore((s) => s.exitYard);
  const openDrawer = useUiStore((s) => s.openDrawer);
  if (!idProjeto) return null;
  const ordenadas = [...(colunas ?? [])].sort((a, b) => a.ordem - b.ordem);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => exitYard()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar à cidade
        </Button>
        <h2 className="text-[16px] font-bold text-ink">
          Quadro · {projetoCode(idProjeto)} {projeto?.nome}
        </h2>
        <Button variant="secondary" className="ml-auto" onClick={() => openDrawer({ form: 'nova-coluna', idProjeto })}>
          <Plus className="h-3.5 w-3.5" /> Coluna
        </Button>
      </div>
      <p className="mb-3 text-[12px] text-ink-2">Selecione uma atividade e use “Mover para a zona” no painel de detalhes para trocá-la de coluna.</p>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {ordenadas.map((c) => (
          <section key={c.idColuna} aria-label={`Coluna ${c.nome}`} className="rounded-2xl bg-surface-2 p-2.5">
            <div className="mb-2 flex items-center gap-2 px-1">
              <h3 className={cx('flex-1 text-[13px] font-bold', c.ehColunaConclusao ? 'text-ok' : 'text-ink')}>
                {c.nome} <span className="font-semibold text-ink-3">{c.atividades.length}</span>
              </h3>
              <button
                onClick={() => openDrawer({ form: 'nova-atividade', idProjeto, idColuna: c.idColuna })}
                className="grid h-7 w-7 place-items-center rounded-full bg-brand text-white hover:bg-brand-hover"
                aria-label={`Nova atividade em ${c.nome}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {c.atividades.map((a) => (
                <li key={a.idAtividade}>
                  <Item target={{ kind: 'atividade', id: a.idAtividade }}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: TIPO_COLOR[a.tipo] }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{a.titulo}</span>
                    </span>
                    <span className="block text-[12px] text-ink-2">
                      {a.tipo} · {label(a.prioridade)}
                      {a.nomeResponsavel && ` · ${a.nomeResponsavel}`}
                      {a.dataPrazo && ` · prazo ${formatDate(a.dataPrazo)}`}
                    </span>
                  </Item>
                </li>
              ))}
              {c.atividades.length === 0 && <li className="px-1 py-2 text-[12px] text-ink-3">Coluna vazia.</li>}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

/** Alternativa 2D à cidade: mesma informação, navegável por teclado e leitor de tela. */
export function ListView() {
  const yard = useUiStore((s) => s.yard);
  return (
    <main id="conteudo" aria-label={yard ? 'Quadro do projeto' : 'Cidade em lista'} className="h-full overflow-y-auto">
      {!webglAvailable && (
        <p className="mb-4 rounded-xl bg-warn-soft px-3 py-2 text-[12px] font-medium text-warn" role="note">
          Este navegador não tem suporte a WebGL, por isso a cidade 3D foi substituída por esta lista.
        </p>
      )}
      {yard ? <YardList /> : <CityList />}
    </main>
  );
}
