import { http } from '../lib/http';
import type {
  AtualizarProjetoDTO,
  CadastroAtividadeDTO,
  CadastroChamadoInternoDTO,
  CadastroClienteDTO,
  CadastroProjetoDTO,
  ChamadoDTO,
  ChamadoStatus,
  ClienteDTO,
  ClienteStatus,
  ColaboradorDTO,
  ContratoDTO,
  DashboardResumoDTO,
  DespesaDTO,
  FaturaDTO,
  KanbanAtividadeDTO,
  KanbanColunaDTO,
  KanbanComentarioDTO,
  NotificacaoDTO,
  ObservabilidadeResumoDTO,
  ProjetoDTO,
  WikiPaginaDTO,
} from '../types/domain';

/** Chamadas cruas à API do MrCodeAdmin, agrupadas por módulo. Hooks ficam em queries.ts / mutations.ts. */
export const api = {
  clientes: {
    list: () => http.get<ClienteDTO[]>('/Cliente'),
    create: (dto: CadastroClienteDTO) => http.post<ClienteDTO>('/Cliente', dto),
    update: (id: number, dto: CadastroClienteDTO) => http.put<ClienteDTO>(`/Cliente/${id}`, dto),
    setStatus: (id: number, status: ClienteStatus) => http.patch<ClienteDTO>(`/Cliente/${id}/status`, { status }),
  },
  contratos: {
    list: () => http.get<ContratoDTO[]>('/Contrato'),
  },
  projetos: {
    list: () => http.get<ProjetoDTO[]>('/Projeto'),
    get: (id: number) => http.get<ProjetoDTO>(`/Projeto/${id}`),
    create: (dto: CadastroProjetoDTO) => http.post<ProjetoDTO>('/Projeto', dto),
    update: (id: number, dto: AtualizarProjetoDTO) => http.put<ProjetoDTO>(`/Projeto/${id}`, dto),
  },
  chamados: {
    list: () => http.get<ChamadoDTO[]>('/Chamado'),
    createInterno: (dto: CadastroChamadoInternoDTO) => http.post<ChamadoDTO>('/Chamado/interno', dto),
    setStatus: (id: number, status: ChamadoStatus) => http.patch<ChamadoDTO>(`/Chamado/${id}/status`, { status }),
    setResponsavel: (id: number, idUsuarioAdmin: number) =>
      http.patch<ChamadoDTO>(`/Chamado/${id}/responsavel`, { idUsuarioAdmin }),
    converterEmAtividade: (id: number, idProjeto: number, idColuna: number | null) =>
      http.post<KanbanAtividadeDTO>(`/Chamado/${id}/converter-atividade`, { idProjeto, idColuna }),
  },
  faturas: {
    list: () => http.get<FaturaDTO[]>('/Fatura'),
    pagar: (id: number, formaPagamento?: string) => http.patch<FaturaDTO>(`/Fatura/${id}/pagar`, { formaPagamento }),
  },
  despesas: {
    list: () => http.get<DespesaDTO[]>('/Despesa'),
  },
  wiki: {
    list: () => http.get<WikiPaginaDTO[]>('/Wiki'),
  },
  equipe: {
    list: () => http.get<ColaboradorDTO[]>('/UsuarioAdmin'),
  },
  kanban: {
    quadro: (idProjeto: number) => http.get<KanbanColunaDTO[]>(`/Kanban/projeto/${idProjeto}`),
    criarColuna: (idProjeto: number, nome: string) => http.post<KanbanColunaDTO>(`/Kanban/projeto/${idProjeto}/colunas`, { nome }),
    renomearColuna: (idColuna: number, nome: string) => http.put<KanbanColunaDTO>(`/Kanban/colunas/${idColuna}`, { nome }),
    reordenarColuna: (idColuna: number, novaOrdem: number) => http.patch<void>(`/Kanban/colunas/${idColuna}/mover`, { novaOrdem }),
    removerColuna: (idColuna: number) => http.delete<void>(`/Kanban/colunas/${idColuna}`),
    criarAtividade: (idColuna: number, dto: CadastroAtividadeDTO) =>
      http.post<KanbanAtividadeDTO>(`/Kanban/colunas/${idColuna}/atividades`, dto),
    atualizarAtividade: (id: number, dto: CadastroAtividadeDTO) => http.put<KanbanAtividadeDTO>(`/Kanban/atividades/${id}`, dto),
    moverAtividade: (id: number, idColunaDestino: number, novaOrdem: number) =>
      http.patch<KanbanAtividadeDTO>(`/Kanban/atividades/${id}/mover`, { idColunaDestino, novaOrdem }),
    removerAtividade: (id: number) => http.delete<void>(`/Kanban/atividades/${id}`),
    comentarios: (id: number) => http.get<KanbanComentarioDTO[]>(`/Kanban/atividades/${id}/comentarios`),
    comentar: (id: number, conteudoHtml: string) =>
      http.post<KanbanComentarioDTO>(`/Kanban/atividades/${id}/comentarios`, { conteudoHtml }),
  },
  notificacoes: {
    minhas: () => http.get<NotificacaoDTO[]>('/Notificacao/minhas'),
    marcarLida: (id: number) => http.patch<void>(`/Notificacao/${id}/lida`),
    marcarTodas: () => http.patch<void>('/Notificacao/lida-todas'),
  },
  dashboard: {
    resumo: () => http.get<DashboardResumoDTO>('/Dashboard/resumo'),
  },
  observabilidade: {
    resumo: () => http.get<ObservabilidadeResumoDTO>('/Observabilidade/resumo'),
  },
};
