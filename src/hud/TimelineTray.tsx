import { useMemo, type ReactNode } from 'react';
import { Check, ChevronRight, Construction, FileSignature, Receipt, Ticket } from 'lucide-react';
import { useWorld, type World } from '../hooks/useWorld';
import { formatBRL } from '../lib/format';
import { useUiStore, type EntityRef } from '../store/uiStore';
import { chamadoLifecycle, contratoLifecycle, faturaLifecycle, projetoLifecycle, type LifecycleStep } from '../world/lifecycle';
import { pickContrato } from '../world/layout';
import { clienteCode, isChamadoAberto, projetoCode } from '../world/status';
import { cx, TONE_HEX } from './tones';
import { Glass, StatusChip } from './ui';

interface Tracked {
  kind: string;
  heading: string;
  ref: string;
  icon: ReactNode;
  steps: LifecycleStep[];
  card: { title: string; line: string; status: string; meta: string };
  target: EntityRef | null;
}

const PESO = { Alta: 3, Media: 2, Baixa: 1 } as const;

function urgentChamado(world: World, idCliente?: number) {
  return world.chamados
    .filter((c) => isChamadoAberto(c) && (idCliente === undefined || c.idCliente === idCliente))
    .sort((a, b) => PESO[b.prioridade] - PESO[a.prioridade] || a.dataHoraAbertura.localeCompare(b.dataHoraAbertura))[0];
}

function urgentFatura(world: World) {
  return world.faturas
    .filter((f) => f.status === 'Atrasado' || f.status === 'Pendente')
    .sort((a, b) => (a.status === b.status ? a.dataVencimento.localeCompare(b.dataVencimento) : a.status === 'Atrasado' ? -1 : 1))[0];
}

/** Decide qual ciclo de vida mostrar — o "Shipment Tracking" da referência, aplicado à seleção. */
function pickTracked(selected: EntityRef | null, world: World): Tracked | null {
  const chamadoTracked = (id: number): Tracked | null => {
    const c = world.chamados.find((x) => x.idChamado === id);
    if (!c) return null;
    return {
      kind: 'chamado',
      heading: 'Ciclo do chamado',
      ref: `${c.protocolo}${c.idCliente ? ` · ${clienteCode(c.idCliente)}` : ''}`,
      icon: <Ticket className="h-4 w-4" />,
      steps: chamadoLifecycle(c),
      card: { title: c.assunto, line: `Cliente: ${c.clienteNome ?? c.origem}`, status: c.status, meta: `${c.usuarioNome} · prioridade ${c.prioridade}` },
      target: { kind: 'chamado', id },
    };
  };
  const faturaTracked = (id: number): Tracked | null => {
    const f = world.faturas.find((x) => x.idFatura === id);
    if (!f) return null;
    return {
      kind: 'fatura',
      heading: 'Ciclo da fatura',
      ref: `${f.numeroFatura} · ${clienteCode(f.idCliente)}`,
      icon: <Receipt className="h-4 w-4" />,
      steps: faturaLifecycle(f),
      card: { title: formatBRL(f.valor), line: `Cliente: ${f.clienteNome}`, status: f.status, meta: f.descricao },
      target: { kind: 'fatura', id },
    };
  };
  const contratoTracked = (idCliente: number, contratoId?: number): Tracked | null => {
    const c = contratoId ? world.contratos.find((x) => x.idContrato === contratoId) : pickContrato(world.contratos, idCliente);
    if (!c) return null;
    return {
      kind: 'contrato',
      heading: 'Ciclo do contrato',
      ref: `${c.numeroContrato} · ${clienteCode(c.idCliente)}`,
      icon: <FileSignature className="h-4 w-4" />,
      steps: contratoLifecycle(c),
      card: {
        title: c.numeroContrato,
        line: `Cliente: ${c.clienteNome}`,
        status: c.status,
        meta: c.valorMensal ? `${formatBRL(c.valorMensal)}/mês` : formatBRL(c.valorTotal ?? 0),
      },
      target: { kind: 'cliente', id: c.idCliente },
    };
  };

  if (!selected) {
    const c = urgentChamado(world);
    return c ? chamadoTracked(c.idChamado) : null;
  }

  switch (selected.kind) {
    case 'chamado':
      return chamadoTracked(selected.id);
    case 'fatura':
      return faturaTracked(selected.id);
    case 'projeto': {
      const p = world.projetos.find((x) => x.idProjeto === selected.id);
      if (!p) return null;
      return {
        kind: 'projeto',
        heading: 'Ciclo do projeto',
        ref: `${projetoCode(p.idProjeto)} · ${clienteCode(p.idCliente)}`,
        icon: <Construction className="h-4 w-4" />,
        steps: projetoLifecycle(p),
        card: { title: p.nome, line: `Cliente: ${p.clienteNome}`, status: p.status, meta: `prioridade ${p.prioridade}` },
        target: { kind: 'projeto', id: p.idProjeto },
      };
    }
    case 'cliente': {
      const c = urgentChamado(world, selected.id);
      return c ? chamadoTracked(c.idChamado) : contratoTracked(selected.id);
    }
    case 'banco': {
      const f = urgentFatura(world);
      return f ? faturaTracked(f.idFatura) : null;
    }
    case 'prefeitura': {
      const c = world.contratos.find((x) => x.status === 'AguardandoAprovacao') ?? world.contratos.find((x) => x.status === 'Ativo');
      return c ? contratoTracked(c.idCliente, c.idContrato) : null;
    }
    default: {
      const c = urgentChamado(world);
      return c ? chamadoTracked(c.idChamado) : null;
    }
  }
}

function Stepper({ steps }: { steps: LifecycleStep[] }) {
  return (
    <ol className="flex items-start">
      {steps.map((s, i) => {
        const color = TONE_HEX[s.tone];
        return (
          <li key={s.key} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {i > 0 && (
              // Liga o centro da etapa anterior ao centro desta.
              <span
                className="absolute top-[15px] h-0.5"
                style={{ left: '-50%', width: '100%', background: s.state === 'todo' ? '#e4e8f1' : '#134ced' }}
              />
            )}
            <span
              className={cx(
                'relative z-10 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold',
                s.state === 'todo' && 'bg-surface-2 text-ink-3',
                s.state === 'done' && 'bg-brand text-white'
              )}
              style={
                s.state === 'current'
                  ? { background: color, color: 'white', boxShadow: `0 0 0 4px white, 0 0 0 6px ${color}55` }
                  : undefined
              }
            >
              {s.state === 'done' ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('mt-2 max-w-full truncate px-1 text-[12px]', s.state === 'todo' ? 'text-ink-3' : 'font-semibold text-ink')}>
              {s.label}
            </span>
            <span className="text-[11px] text-ink-3 tabular">{s.time ?? '—'}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TimelineTray() {
  const world = useWorld();
  const selected = useUiStore((s) => s.selected);
  const select = useUiStore((s) => s.select);
  const tracked = useMemo(() => pickTracked(selected, world), [selected, world]);

  if (!tracked) return null;

  return (
    <Glass className="flex w-full items-stretch gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-brand">{tracked.icon}</span>
          <span className="text-[14px] font-bold text-ink">{tracked.heading}</span>
          <span className="ml-auto truncate text-[12px] text-ink-3">{tracked.ref}</span>
        </div>
        <Stepper steps={tracked.steps} />
      </div>
      <button
        onClick={() => tracked.target && select(tracked.target)}
        className="hidden w-56 shrink-0 items-center gap-3 rounded-xl bg-surface-2 p-3 text-left transition-colors hover:bg-brand-soft/60 xl:flex"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-brand shadow-sm">{tracked.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-ink">{tracked.card.title}</span>
          <span className="block truncate text-[11px] text-ink-2">{tracked.card.line}</span>
          <StatusChip status={tracked.card.status} className="my-1" />
          <span className="block truncate text-[11px] text-ink-3">{tracked.card.meta}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
      </button>
    </Glass>
  );
}
