import { create } from 'zustand';

/**
 * Estado da biblioteca da Universidade. Mora fora do painel porque duas superfícies disputam os
 * mesmos valores: a **estante 3D** (que livro está destacado, quais aparecem) e o painel da direita
 * (que artigo está aberto, o que a busca filtra).
 */
interface WikiState {
  /** Artigo aberto no painel, ou null = a biblioteca. */
  aberto: number | null;
  abrir: (idPagina: number) => void;
  /** Volta um degrau: artigo → biblioteca. Devolve false se já estava na biblioteca. */
  voltar: () => boolean;
  /** Fecha tudo — usado ao sair do cenário. */
  limpar: () => void;

  busca: string;
  /** Filtrar tira livros da estante: mexer na busca fecha um artigo que saiu dela. */
  setBusca: (busca: string) => void;
}

export const useWikiStore = create<WikiState>((set, get) => ({
  aberto: null,
  abrir: (idPagina) => set({ aberto: idPagina }),
  voltar: () => {
    if (get().aberto === null) return false;
    set({ aberto: null });
    return true;
  },
  limpar: () => set({ aberto: null, busca: '' }),

  busca: '',
  setBusca: (busca) => set({ busca }),
}));
