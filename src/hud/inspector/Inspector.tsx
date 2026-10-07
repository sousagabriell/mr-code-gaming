import { useUiStore } from '../../store/uiStore';
import { Glass } from '../ui';
import { AtividadeInspector } from './AtividadeInspector';
import { ChamadoInspector } from './ChamadoInspector';
import { ClienteInspector } from './ClienteInspector';
import { LandmarkInspector } from './LandmarkInspector';
import { ColaboradorInspector, FaturaInspector } from './OtherInspectors';
import { ProjetoInspector } from './ProjetoInspector';

function Content() {
  const selected = useUiStore((s) => s.selected);
  if (!selected) return null;
  switch (selected.kind) {
    case 'cliente':
      return <ClienteInspector id={selected.id} />;
    case 'projeto':
      return <ProjetoInspector id={selected.id} />;
    case 'chamado':
      return <ChamadoInspector id={selected.id} />;
    case 'fatura':
      return <FaturaInspector id={selected.id} />;
    case 'colaborador':
      return <ColaboradorInspector id={selected.id} />;
    case 'atividade':
      // key: estado local (ex.: confirmação de remoção) não vaza para outra caixa.
      return <AtividadeInspector key={selected.id} id={selected.id} />;
    default:
      return <LandmarkInspector kind={selected.kind} />;
  }
}

/** Card de detalhe à direita (o "FORKLIFT · WH-01" da referência). */
export function Inspector({ sheet = false }: { sheet?: boolean }) {
  const selected = useUiStore((s) => s.selected);
  if (!selected) return null;
  return (
    // empty:hidden — se a entidade sumiu (ex.: removida, link antigo), não sobra um card vazio.
    // `sheet`: no celular ocupa a largura toda e sobe da base (bottom sheet).
    <Glass
      className={
        sheet
          ? 'flex max-h-[68dvh] w-full flex-col overflow-hidden rounded-b-none bg-white/95 pb-[env(safe-area-inset-bottom)] empty:hidden'
          : 'flex max-h-full w-[min(352px,calc(100vw-32px))] flex-col overflow-hidden empty:hidden'
      }
    >
      <Content />
    </Glass>
  );
}
