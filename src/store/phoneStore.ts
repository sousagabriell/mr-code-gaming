import { create } from 'zustand';
import { FILTROS_VAZIOS, type ChamadoAba, type ChamadoFiltros } from '../world/phone';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // armazenamento indisponível: a preferência vale só nesta sessão
  }
}

const CHAVE = 'mrcode-city:phone';

export type PhoneTab = 'chamados' | 'chat';

/** Pilha de navegação do app — rasa de propósito: cada aba tem no máximo dois níveis. */
export type PhoneScreen =
  | { nome: 'chamados' }
  | { nome: 'chamado'; idChamado: number }
  | { nome: 'converter'; idChamado: number }
  | { nome: 'chat' }
  | { nome: 'conversa'; idCliente: number };

const INICIAL: Record<PhoneTab, PhoneScreen> = { chamados: { nome: 'chamados' }, chat: { nome: 'chat' } };

interface PhoneState {
  /** Aparelho expandido. Recolhido, só a barra de status e o resumo aparecem. */
  aberto: boolean;
  /** Escolha do usuário — persiste entre sessões. */
  setAberto: (aberto: boolean) => void;
  toggle: () => void;
  /** Recolhimento automático (o inspector abriu na frente): não vira preferência. */
  recolher: () => void;
  /** Volta ao estado que o usuário escolheu — usado quando a seleção é limpa. */
  restaurar: () => void;
  /** O aparelho está na tela? Só então o `Esc` global deve mexer nele. */
  montado: boolean;
  setMontado: (montado: boolean) => void;

  tab: PhoneTab;
  setTab: (tab: PhoneTab) => void;

  screen: PhoneScreen;
  /** Abre uma tela sem trocar de aba (e sempre com o aparelho aberto). */
  push: (screen: PhoneScreen) => void;
  /** Volta ao primeiro nível da aba atual. Devolve false se já estava lá. */
  voltar: () => boolean;

  filtros: ChamadoFiltros;
  setFiltros: (patch: Partial<ChamadoFiltros>) => void;
  limparFiltros: () => void;

  aba: ChamadoAba;
  setAba: (aba: ChamadoAba) => void;
}

export const usePhoneStore = create<PhoneState>((set, get) => ({
  // Padrão ligado: o celular ocupa o lugar de um painel que estava sempre visível.
  aberto: read(CHAVE) !== 'off',
  setAberto: (aberto) => {
    write(CHAVE, aberto ? 'on' : 'off');
    set({ aberto });
  },
  toggle: () => get().setAberto(!get().aberto),
  recolher: () => set({ aberto: false }),
  restaurar: () => set({ aberto: read(CHAVE) !== 'off' }),
  montado: false,
  setMontado: (montado) => set({ montado }),

  tab: 'chamados',
  setTab: (tab) => set({ tab, screen: INICIAL[tab] }),

  screen: INICIAL.chamados,
  push: (screen) => {
    const tab: PhoneTab = screen.nome === 'chat' || screen.nome === 'conversa' ? 'chat' : 'chamados';
    if (!get().aberto) get().setAberto(true);
    set({ screen, tab });
  },
  voltar: () => {
    const { screen, tab } = get();
    if (screen.nome === INICIAL[tab].nome) return false;
    set({ screen: INICIAL[tab] });
    return true;
  },

  filtros: FILTROS_VAZIOS,
  setFiltros: (patch) => set((s) => ({ filtros: { ...s.filtros, ...patch } })),
  limparFiltros: () => set({ filtros: FILTROS_VAZIOS }),

  aba: 'abertos',
  setAba: (aba) => set({ aba }),
}));
