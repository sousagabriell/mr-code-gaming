import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Bug, FolderKanban, PackageCheck, Package, Receipt, Ticket, Wallet } from 'lucide-react';
import { useDashboardQuery } from '../api/queries';
import { contextClienteId } from '../hooks/useDistricts';
import { useNow } from '../hooks/useNow';
import { useWorld } from '../hooks/useWorld';
import { useYard } from '../hooks/useYard';
import { kanbanStats } from '../world/kanban';
import { formatBRLCompact } from '../lib/format';
import { useCountUp } from '../lib/useCountUp';
import { useUiStore } from '../store/uiStore';
import { pickContrato } from '../world/layout';
import { clienteCode, isChamadoAberto, isProjetoAtrasado, isProjetoEmObras, label } from '../world/status';
import { cx } from './tones';
import { Glass, IconTile } from './ui';

interface Delta {
  text: string;
  /** Sobe = bom? (chamados subindo é ruim, saldo subindo é bom) */
  good: boolean;
  up: boolean;
}

function KpiCard({
  icon,
  title,
  value,
  format,
  delta,
  sub,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  format: (n: number) => string;
  delta?: Delta | null;
  sub: string;
}) {
  const animated = useCountUp(value);
  return (
    <Glass className="flex min-w-0 items-center gap-3 px-3.5 py-3">
      <IconTile>{icon}</IconTile>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-ink-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold leading-tight tracking-tight text-ink tabular">{format(animated)}</span>
          {delta && (
            <span className={cx('flex items-center gap-0.5 text-[11px] font-semibold', delta.good ? 'text-ok' : 'text-bad')}>
              {delta.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {delta.text}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-ink-3">{sub}</p>
      </div>
    </Glass>
  );
}

const int = (n: number) => Math.round(n).toLocaleString('pt-BR');
const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

export function KpiCards() {
  const world = useWorld();
  const { data: dashboard } = useDashboardQuery();
  const selected = useUiStore((s) => s.selected);
  const idCliente = contextClienteId(selected, world);
  const now = useNow();
  const { idProjeto: yard, colunas } = useYard();

  const abertos = world.chamados.filter(isChamadoAberto);

  if (yard !== null) {
    const stats = kanbanStats(colunas, now);
    return (
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          title="Na fila"
          value={stats.abertas}
          format={int}
          sub={`${stats.atrasadas} com prazo vencido`}
        />
        <KpiCard
          icon={<PackageCheck className="h-5 w-5" />}
          title="Entregues"
          value={stats.concluidas}
          format={int}
          sub={`${stats.total ? Math.round((stats.concluidas / stats.total) * 100) : 0}% de ${stats.total} caixas`}
        />
        <KpiCard
          icon={<Bug className="h-5 w-5" />}
          title="Bugs abertos"
          value={stats.bugsAbertos}
          format={int}
          sub="caixas vermelhas no pátio"
        />
      </div>
    );
  }

  if (idCliente !== null) {
    const contrato = pickContrato(world.contratos, idCliente);
    const doCliente = abertos.filter((c) => c.idCliente === idCliente);
    const emAberto = world.faturas.filter((f) => f.idCliente === idCliente && (f.status === 'Pendente' || f.status === 'Atrasado'));
    const atrasadas = emAberto.filter((f) => f.status === 'Atrasado');
    const code = clienteCode(idCliente);

    return (
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          title={contrato?.valorMensal ? 'Contrato mensal' : 'Contrato'}
          value={contrato?.valorMensal ?? contrato?.valorTotal ?? 0}
          format={formatBRLCompact}
          sub={contrato ? `${contrato.numeroContrato} · ${label(contrato.status)}` : `sem contrato · ${code}`}
        />
        <KpiCard
          icon={<Ticket className="h-5 w-5" />}
          title="Chamados abertos"
          value={doCliente.length}
          format={int}
          sub={`${doCliente.filter((c) => c.prioridade === 'Alta').length} alta prioridade · ${code}`}
        />
        <KpiCard
          icon={<Receipt className="h-5 w-5" />}
          title="A receber"
          value={emAberto.reduce((s, f) => s + f.valor, 0)}
          format={formatBRLCompact}
          sub={`${emAberto.length} faturas · ${atrasadas.length} atrasada${atrasadas.length === 1 ? '' : 's'}`}
        />
      </div>
    );
  }

  const fin = dashboard?.financeiroMesAtual;
  const serie = dashboard?.serieMensal ?? [];
  const net = (i: number) => (serie[i] ? serie[i].recebido - serie[i].despesas : 0);
  const saldoDelta = serie.length >= 2 ? net(serie.length - 1) - net(serie.length - 2) : 0;
  const novos7d = world.chamados.filter((c) => now - new Date(c.dataHoraAbertura).getTime() < SEVEN_DAYS).length;
  const emObras = world.projetos.filter(isProjetoEmObras);
  const atrasados = emObras.filter((p) => isProjetoAtrasado(p, now)).length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <KpiCard
        icon={<Wallet className="h-5 w-5" />}
        title="Saldo do mês"
        value={fin?.saldo ?? 0}
        format={formatBRLCompact}
        delta={saldoDelta !== 0 ? { text: formatBRLCompact(Math.abs(saldoDelta)), good: saldoDelta > 0, up: saldoDelta > 0 } : null}
        sub={`a receber ${formatBRLCompact(fin?.totalAReceber ?? 0)} · vs mês anterior`}
      />
      <KpiCard
        icon={<Ticket className="h-5 w-5" />}
        title="Chamados abertos"
        value={abertos.length}
        format={int}
        delta={novos7d > 0 ? { text: `+${novos7d}`, good: false, up: true } : null}
        sub={`${abertos.filter((c) => c.prioridade === 'Alta').length} alta prioridade · últimos 7 dias`}
      />
      <KpiCard
        icon={<FolderKanban className="h-5 w-5" />}
        title="Projetos em obras"
        value={emObras.length}
        format={int}
        sub={`${atrasados} atrasado${atrasados === 1 ? '' : 's'} · ${dashboard?.contratosAVencer ?? 0} contrato(s) a vencer`}
      />
    </div>
  );
}
