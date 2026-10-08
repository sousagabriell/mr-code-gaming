import { http } from '../lib/http';
import type {
  AtualizarProjetoDTO,
  CadastroAtividadeDTO,
  CadastroChamadoInternoDTO,
  CadastroClienteDTO,
  CadastroDespesaDTO,
  CadastroFaturaDTO,
  CadastroProjetoDTO,
  ChamadoDTO,
  ChamadoMensagemDTO,
  ChamadoStatus,
  ClienteDTO,
  ClienteStatus,
  ColaboradorDTO,
  ContratoDTO,
  DashboardResumoDTO,
  DespesaDTO,
  FaturaDTO,
  FinanceiroResumoDTO,
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
    /** O detalhe traz o vínculo com a atividade do Kanban — a lista vem com esses campos nulos. */
    get: (id: number) => http.get<ChamadoDTO>(`/Chamado/${id}`),
    createInterno: (dto: CadastroChamadoInternoDTO) => http.post<ChamadoDTO>('/Chamado/interno', dto),
    setStatus: (id: number, status: ChamadoStatus) => http.patch<ChamadoDTO>(`/Chamado/${id}/status`, { status }),
    setResponsavel: (id: number, idUsuarioAdmin: number) =>
      http.patch<ChamadoDTO>(`/Chamado/${id}/responsavel`, { idUsuarioAdmin }),
    converterEmAtividade: (id: number, idProjeto: number, idColuna: number | null) =>
      http.post<KanbanAtividadeDTO>(`/Chamado/${id}/converter-atividade`, { idProjeto, idColuna }),
    /** Conversa do chamado — a mesma thread que o cliente vê no portal de origem. */
    mensagens: (id: number) => http.get<ChamadoMensagemDTO[]>(`/Chamado/${id}/mensagens`),
    enviarMensagem: (id: number, conteudoHtml: string) =>
      http.post<ChamadoMensagemDTO>(`/Chamado/${id}/mensagens`, { conteudoHtml }),
  },
  faturas: {
    list: () => http.get<FaturaDTO[]>('/Fatura'),
    get: (id: number) => http.get<FaturaDTO>(`/Fatura/${id}`),
    criar: (dto: CadastroFaturaDTO) => http.post<FaturaDTO>('/Fatura', dto),
    atualizar: (id: number, dto: CadastroFaturaDTO) => http.put<FaturaDTO>(`/Fatura/${id}`, dto),
    pagar: (id: number, formaPagamento?: string) => http.patch<FaturaDTO>(`/Fatura/${id}/pagar`, { formaPagamento }),
    estornar: (id: number) => http.patch<FaturaDTO>(`/Fatura/${id}/estornar`, {}),
    cancelar: (id: number) => http.patch<FaturaDTO>(`/Fatura/${id}/cancelar`, {}),
    /** Gera as faturas do mês a partir dos contratos recorrentes; devolve só as criadas. */
    gerarRecorrentes: () => http.post<FaturaDTO[]>('/Fatura/gerar-recorrentes', {}),
  },
  despesas: {
    list: () => http.get<DespesaDTO[]>('/Despesa'),
    get: (id: number) => http.get<DespesaDTO>(`/Despesa/${id}`),
    criar: (dto: CadastroDespesaDTO) => http.post<DespesaDTO>('/Despesa', dto),
    atualizar: (id: number, dto: CadastroDespesaDTO) => http.put<DespesaDTO>(`/Despesa/${id}`, dto),
    pagar: (id: number) => http.patch<DespesaDTO>(`/Despesa/${id}/pagar`, {}),
    estornar: (id: number) => http.patch<DespesaDTO>(`/Despesa/${id}/estornar`, {}),
    gerarRecorrentes: () => http.post<DespesaDTO[]>('/Despesa/gerar-recorrentes', {}),
  },
  financeiro: {
    /** `mes` em `aaaa-MM`; sem ele o backend devolve o mês corrente. */
    resumo: (mes?: string) => http.get<FinanceiroResumoDTO>(`/Financeiro/resumo${mes ? `?mes=${mes}` : ''}`),
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
