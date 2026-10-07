import { ArrowLeft, Hand, PaintRoller, Plus, Warehouse } from 'lucide-react';
import { useYard } from '../../hooks/useYard';
import { useUiStore } from '../../store/uiStore';
import { TIPO_COLOR } from '../../scene/yard/crateColors';
import { kanbanStats } from '../../world/kanban';
import { clienteCode, projetoCode } from '../../world/status';
import { Button, Glass, IconTile, ProgressBar } from '../ui';

/** Canto inferior esquerdo no pátio: identidade do projeto, progresso de entregas e ações. */
export function YardPanel() {
  const { idProjeto, projeto, colunas, isPending } = useYard();
  const exitYard = useUiStore((s) => s.exitYard);
  const openDrawer = useUiStore((s) => s.openDrawer);
  if (!idProjeto) return null;

  const stats = kanbanStats(colunas);
  const pct = stats.total ? stats.concluidas / stats.total : 0;

  return (
    <Glass className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 p-4">
      <div className="flex min-w-[240px] flex-1 items-center gap-3">
        <IconTile>
          <Warehouse className="h-5 w-5" />
        </IconTile>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand">
            Pátio de obras · {projetoCode(idProjeto)}
            {projeto && ` · ${clienteCode(projeto.idCliente)}`}
          </p>
          <p className="truncate text-[15px] font-bold text-ink">{projeto?.nome ?? 'Carregando…'}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <ProgressBar value={pct} tone="ok" className="w-28" />
            <span className="whitespace-nowrap text-[12px] font-semibold text-ink tabular">
              {stats.concluidas}/{stats.total} entregues
            </span>
          </div>
        </div>
      </div>

      <div className="hidden flex-col gap-1 text-[11px] text-ink-2 2xl:flex">
        <div className="flex gap-3">
          {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
            <span key={tipo} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              {tipo}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1 text-ink-3">
          <Hand className="h-3 w-3" /> {isPending ? 'Descarregando o quadro…' : 'Arraste as caixas entre as zonas'}
        </span>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => exitYard()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Cidade
        </Button>
        <Button variant="secondary" onClick={() => openDrawer({ form: 'nova-coluna', idProjeto })}>
          <PaintRoller className="h-3.5 w-3.5" /> Zona
        </Button>
        <Button variant="primary" onClick={() => openDrawer({ form: 'nova-atividade', idProjeto })}>
          <Plus className="h-3.5 w-3.5" /> Atividade
        </Button>
      </div>
    </Glass>
  );
}
