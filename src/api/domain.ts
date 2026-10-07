import { http } from '../lib/http';
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

export const fetchClientes = () => http.get<ClienteDTO[]>('/Cliente');
export const fetchContratos = () => http.get<ContratoDTO[]>('/Contrato');
export const fetchProjetos = () => http.get<ProjetoDTO[]>('/Projeto');
export const fetchChamados = () => http.get<ChamadoDTO[]>('/Chamado');
export const fetchFaturas = () => http.get<FaturaDTO[]>('/Fatura');
export const fetchDespesas = () => http.get<DespesaDTO[]>('/Despesa');
export const fetchWikiPaginas = () => http.get<WikiPaginaDTO[]>('/Wiki');
export const fetchObservabilidadeResumo = () => http.get<ObservabilidadeResumoDTO>('/Observabilidade/resumo');
export const fetchColaboradores = () => http.get<ColaboradorDTO[]>('/UsuarioAdmin');
export const fetchKanbanDoProjeto = (idProjeto: number) =>
  http.get<KanbanColunaDTO[]>(`/Kanban/projeto/${idProjeto}`);
