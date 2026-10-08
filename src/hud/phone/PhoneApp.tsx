import { MessageCircle, Ticket } from 'lucide-react';
import { useWorld } from '../../hooks/useWorld';
import { usePhoneStore, type PhoneTab } from '../../store/phoneStore';
import { isChamadoAberto } from '../../world/status';
import { cx } from '../tones';
import { ChamadoScreen } from './ChamadoScreen';
import { ChamadosScreen } from './ChamadosScreen';
import { ChatScreen } from './ChatScreen';
import { ConversaScreen } from './ConversaScreen';
import { ConverterScreen } from './ConverterScreen';

const TABS: { id: PhoneTab; label: string; icon: typeof Ticket }[] = [
  { id: 'chamados', label: 'Chamados', icon: Ticket },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

function TaskBar({ badge }: { badge: number }) {
  const tab = usePhoneStore((s) => s.tab);
  const setTab = usePhoneStore((s) => s.setTab);
  const setAberto = usePhoneStore((s) => s.setAberto);

  return (
    <>
      <nav role="tablist" aria-label="Apps do celular" className="flex shrink-0 gap-1 border-t border-line px-2 pt-1.5">
        {TABS.map((t) => {
          const ativo = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={ativo}
              onClick={() => setTab(t.id)}
              className={cx(
                'relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold transition-colors',
                ativo ? 'text-brand' : 'text-ink-3 hover:text-ink-2'
              )}
            >
              <t.icon className="h-[18px] w-[18px]" />
              {t.label}
              {t.id === 'chamados' && badge > 0 && (
                <span className="absolute right-[18%] top-0 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold text-white tabular">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Indicador de home: como num celular de verdade, é por ele que se sai do app. */}
      <button
        onClick={() => setAberto(false)}
        aria-label="Recolher o celular"
        title="Recolher o celular (Esc)"
        className="group mx-auto my-1 flex h-4 w-28 shrink-0 items-center justify-center"
      >
        <span className="h-1 w-24 rounded-full bg-ink/20 transition-colors group-hover:bg-ink/50" />
      </button>
    </>
  );
}

/** A casca do app: tela atual + barra de tarefas. A navegação mora no `phoneStore`. */
export function PhoneApp() {
  const screen = usePhoneStore((s) => s.screen);
  const { chamados } = useWorld();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {screen.nome === 'chamados' && <ChamadosScreen />}
      {screen.nome === 'chamado' && <ChamadoScreen idChamado={screen.idChamado} />}
      {screen.nome === 'converter' && <ConverterScreen idChamado={screen.idChamado} />}
      {screen.nome === 'chat' && <ChatScreen />}
      {screen.nome === 'conversa' && <ConversaScreen idCliente={screen.idCliente} />}
      <TaskBar badge={chamados.filter(isChamadoAberto).length} />
    </div>
  );
}
