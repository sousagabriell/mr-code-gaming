import { create } from 'zustand';
import { FILTROS_EXTRATO, mesDe, type ExtratoFiltros, type Mes } from '../world/extrato';

/**
 * Estado da agência. O mês saiu do `BankPanel` porque três superfícies disputam o mesmo valor: o
 * navegador do extrato, o **calendário 3D na parede** e o resumo do mês. A seleção segue junto: o
 * detalhe é outro painel, ao lado da lista.
 */

export type BankAba = 'faturas' | 'despesas';

export type BankSelecao = { tipo: 'fatura'; id: number } | { tipo: 'despesa'; id: number };

/** O que o painel da esquerda mostra. `lista` = nada (só o extrato à direita). */
export type BankTela = 'lista' | 'detalhe' | 'form';

interface BankState {
  mes: Mes;
  setMes: (mes: Mes) => void;

  aba: BankAba;
  setAba: (aba: BankAba) => void;

  tela: BankTela;
  selecao: BankSelecao | null;
  /** Abre a leitura de um lançamento. */
  abrirDetalhe: (selecao: BankSelecao) => void;
  /** Formulário: sem `selecao` é um lançamento novo, com `selecao` é edição. */
  abrirForm: (selecao?: BankSelecao) => void;
  /** Volta um degrau: form → detalhe (se veio de um) ou lista. Devolve false se já estava na lista. */
  voltar: () => boolean;
  /** Fecha tudo — usado ao sair da agência. */
  limpar: () => void;

  filtros: ExtratoFiltros;
  setFiltros: (patch: Partial<ExtratoFiltros>) => void;
}

export const useBankStore = create<BankState>((set, get) => ({
  mes: mesDe(new Date()),
  setMes: (mes) => set({ mes }),

  aba: 'faturas',
  setAba: (aba) => set({ aba, filtros: FILTROS_EXTRATO, tela: 'lista', selecao: null }),

  tela: 'lista',
  selecao: null,
  abrirDetalhe: (selecao) => set({ tela: 'detalhe', selecao }),
  abrirForm: (selecao) => set({ tela: 'form', selecao: selecao ?? null }),
  voltar: () => {
    const { tela, selecao } = get();
    if (tela === 'lista') return false;
    // Editar veio de um detalhe: o voltar devolve a leitura, não a lista.
    if (tela === 'form' && selecao) set({ tela: 'detalhe' });
    else set({ tela: 'lista', selecao: null });
    return true;
  },
  limpar: () => set({ tela: 'lista', selecao: null, filtros: FILTROS_EXTRATO, mes: mesDe(new Date()) }),

  filtros: FILTROS_EXTRATO,
  setFiltros: (patch) => set((s) => ({ filtros: { ...s.filtros, ...patch } })),
}));
