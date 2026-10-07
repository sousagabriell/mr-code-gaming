import type { CameraControlsImpl } from '@react-three/drei';
import { create } from 'zustand';
import {
  fetchChamados,
  fetchClientes,
  fetchColaboradores,
  fetchContratos,
  fetchDespesas,
  fetchFaturas,
  fetchKanbanDoProjeto,
  fetchObservabilidadeResumo,
  fetchProjetos,
  fetchWikiPaginas,
} from '../api/domain';
import type {
  ChamadoDTO,
  ClienteDTO,
  ColaboradorDTO,
  ContratoDTO,
  DespesaDTO,
  FaturaDTO,
  KanbanColunaDTO,
  ObservabilidadeResumoDTO,
  ProjetoDTO,
  WikiPaginaDTO,
} from '../types/domain';
import type { LandmarkKind, Vec3 } from '../world/layout';

export type SelectedEntity =
  | { kind: 'cliente'; id: number }
  | { kind: 'projeto'; id: number }
  | { kind: LandmarkKind };

interface CityState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;

  clientes: ClienteDTO[];
  contratos: ContratoDTO[];
  projetos: ProjetoDTO[];
  chamados: ChamadoDTO[];
  faturas: FaturaDTO[];
  despesas: DespesaDTO[];
  wikiPaginas: WikiPaginaDTO[];
  observabilidade: ObservabilidadeResumoDTO | null;
  colaboradores: ColaboradorDTO[];

  kanbanByProjeto: Record<number, KanbanColunaDTO[] | undefined>;
  loadKanban: (idProjeto: number) => void;

  load: () => Promise<void>;

  selected: SelectedEntity | null;
  focusRequest: Vec3 | null;
  select: (entity: SelectedEntity, position: Vec3) => void;
  clearSelection: () => void;

  controls: CameraControlsImpl | null;
  setControls: (controls: CameraControlsImpl | null) => void;
}

export const useCityStore = create<CityState>((set, get) => ({
  status: 'idle',
  error: null,

  clientes: [],
  contratos: [],
  projetos: [],
  chamados: [],
  faturas: [],
  despesas: [],
  wikiPaginas: [],
  observabilidade: null,
  colaboradores: [],

  kanbanByProjeto: {},
  loadKanban: (idProjeto) => {
    if (get().kanbanByProjeto[idProjeto]) return;
    fetchKanbanDoProjeto(idProjeto)
      .then((colunas) => set((s) => ({ kanbanByProjeto: { ...s.kanbanByProjeto, [idProjeto]: colunas } })))
      .catch(() => set((s) => ({ kanbanByProjeto: { ...s.kanbanByProjeto, [idProjeto]: [] } })));
  },

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const [clientes, contratos, projetos, chamados, faturas, despesas, wikiPaginas, observabilidade, colaboradores] =
        await Promise.all([
          fetchClientes(),
          fetchContratos(),
          fetchProjetos(),
          fetchChamados(),
          fetchFaturas(),
          fetchDespesas(),
          fetchWikiPaginas(),
          fetchObservabilidadeResumo(),
          fetchColaboradores(),
        ]);
      set({
        clientes,
        contratos,
        projetos,
        chamados,
        faturas,
        despesas,
        wikiPaginas,
        observabilidade,
        colaboradores,
        status: 'loaded',
      });
    } catch {
      set({ status: 'error', error: 'Não foi possível carregar os dados da cidade.' });
    }
  },

  selected: null,
  focusRequest: null,
  select: (entity, position) => set({ selected: entity, focusRequest: position }),
  clearSelection: () => set({ selected: null }),

  controls: null,
  setControls: (controls) => set({ controls }),
}));
