import { ArrowDownToLine, Building2, Construction, Package, PaintRoller, Pencil, Target, Ticket, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useUiStore, type DrawerState } from '../store/uiStore';
import { AtividadeForm } from './forms/AtividadeForm';
import { ChamadoForm } from './forms/ChamadoForm';
import { ClienteForm } from './forms/ClienteForm';
import { ColunaForm } from './forms/ColunaForm';
import { ConverterChamadoForm } from './forms/ConverterChamadoForm';
import { MetaForm } from './forms/MetaForm';
import { ProjetoForm } from './forms/ProjetoForm';
import { IconButton, IconTile } from './ui';

function meta(drawer: DrawerState): { icon: ReactNode; title: string; subtitle: string; body: ReactNode } {
  switch (drawer.form) {
    case 'novo-cliente':
      return {
        icon: <Building2 className="h-5 w-5" />,
        title: 'Construir nova sede',
        subtitle: 'Um novo cliente ganha o próximo lote livre da cidade.',
        body: <ClienteForm />,
      };
    case 'editar-cliente':
      return {
        icon: <Pencil className="h-5 w-5" />,
        title: 'Editar cliente',
        subtitle: 'Dados cadastrais da sede.',
        body: <ClienteForm idCliente={drawer.idCliente} />,
      };
    case 'novo-projeto':
      return {
        icon: <Construction className="h-5 w-5" />,
        title: 'Abrir canteiro de obras',
        subtitle: 'O projeto vira um canteiro no lote do cliente.',
        body: <ProjetoForm idCliente={drawer.idCliente} />,
      };
    case 'novo-chamado':
      return {
        icon: <Ticket className="h-5 w-5" />,
        title: 'Abrir chamado',
        subtitle: 'A sede do cliente passa a sinalizar o atendimento pendente.',
        body: <ChamadoForm idCliente={drawer.idCliente} />,
      };
    case 'nova-atividade':
      return {
        icon: <Package className="h-5 w-5" />,
        title: 'Nova caixa no pátio',
        subtitle: 'Uma atividade nova entra no fim da zona escolhida.',
        body: <AtividadeForm idProjeto={drawer.idProjeto} idColuna={drawer.idColuna} />,
      };
    case 'editar-atividade':
      return {
        icon: <Pencil className="h-5 w-5" />,
        title: 'Editar atividade',
        subtitle: 'Para mudar de zona, arraste a caixa no pátio.',
        body: <AtividadeForm idProjeto={drawer.idProjeto} idAtividade={drawer.idAtividade} />,
      };
    case 'nova-coluna':
      return {
        icon: <PaintRoller className="h-5 w-5" />,
        title: 'Pintar nova zona',
        subtitle: 'Uma coluna nova no quadro do projeto.',
        body: <ColunaForm idProjeto={drawer.idProjeto} />,
      };
    case 'editar-coluna':
      return {
        icon: <PaintRoller className="h-5 w-5" />,
        title: 'Editar zona',
        subtitle: 'Renomear ou remover a coluna do quadro.',
        body: <ColunaForm idProjeto={drawer.idProjeto} idColuna={drawer.idColuna} />,
      };
    case 'converter-chamado':
      return {
        icon: <ArrowDownToLine className="h-5 w-5" />,
        title: 'Converter em atividade',
        subtitle: 'O chamado vira uma caixa no pátio de um projeto do cliente.',
        body: <ConverterChamadoForm idChamado={drawer.idChamado} />,
      };
    case 'nova-meta':
      return {
        icon: <Target className="h-5 w-5" />,
        title: 'Nova meta',
        subtitle: 'Um objetivo com prazo e recompensa em XP para a cidade.',
        body: <MetaForm />,
      };
    case 'editar-meta':
      return {
        icon: <Pencil className="h-5 w-5" />,
        title: 'Editar meta',
        subtitle: 'Alvo, prazo e recompensa — ou remover a meta.',
        body: <MetaForm id={drawer.id} />,
      };
  }
}

/** Painel lateral de formulários — as ações de escrita do jogo. */
export function FormDrawer() {
  const drawer = useUiStore((s) => s.drawer);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  if (!drawer) return null;
  const m = meta(drawer);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="drawer-titulo"
      className="pointer-events-auto absolute bottom-4 right-4 top-[76px] z-40 flex w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-float max-md:inset-x-0 max-md:bottom-0 max-md:top-14 max-md:w-full max-md:rounded-b-none"
    >
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <IconTile>{m.icon}</IconTile>
        <div className="min-w-0 flex-1">
          <h2 id="drawer-titulo" className="text-[16px] font-bold text-ink">
            {m.title}
          </h2>
          <p className="text-[12px] text-ink-2">{m.subtitle}</p>
        </div>
        <IconButton label="Fechar" onClick={closeDrawer}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {/* key força um formulário limpo ao trocar de drawer */}
      <div key={JSON.stringify(drawer)} className="min-h-0 flex-1">
        {m.body}
      </div>
    </aside>
  );
}
