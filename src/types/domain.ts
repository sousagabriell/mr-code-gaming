// ─── Leitura ────────────────────────────────────────────────────────────────

export type ClienteStatus = 'Ativo' | 'Inativo';

export interface ClienteDTO {
  idCliente: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  cpfCnpj: string;
  email: string | null;
  telefone: string | null;
  nomeContato: string | null;
  idSistemaOrigem: number | null;
  sistemaOrigemNome: string | null;
  status: ClienteStatus;
  observacoes: string | null;
  dataCadastro: string;
}

export type ContratoTipo = 'Recorrente' | 'EscopoFechado' | 'PorHora';
export type ContratoStatus = 'Rascunho' | 'AguardandoAprovacao' | 'Ativo' | 'Encerrado' | 'Cancelado';

export interface ContratoDTO {
  idContrato: number;
  idCliente: number;
  clienteNome: string;
  numeroContrato: string;
  tipo: ContratoTipo;
  valorMensal: number | null;
  valorTotal: number | null;
  dataInicio: string;
  dataFim: string | null;
  status: ContratoStatus;
  dataCriacao: string;
}

export type ProjetoStatus = 'Planejamento' | 'EmAndamento' | 'Pausado' | 'Concluido' | 'Cancelado';
export type Prioridade = 'Baixa' | 'Media' | 'Alta';
export type ProjetoPrioridade = Prioridade;

export interface ProjetoMarcoDTO {
  idMarco: number;
  titulo: string;
  dataPrevista: string;
  concluido: boolean;
  dataConclusao: string | null;
}

export interface ProjetoEquipeDTO {
  idUsuarioAdmin: number;
  nomeUsuarioAdmin: string;
  papel: string | null;
}

export interface ProjetoLinkDTO {
  idProjetoLink: number;
  rotulo: string;
  url: string;
}

export interface ProjetoDTO {
  idProjeto: number;
  idCliente: number;
  clienteNome: string;
  idContrato: number | null;
  nome: string;
  descricao: string | null;
  dataInicio: string;
  dataPrevisaoFim: string;
  dataConclusao: string | null;
  status: ProjetoStatus;
  prioridade: ProjetoPrioridade;
  observacoes: string | null;
  linkProducao: string | null;
  /** Só vêm preenchidos no GET /Projeto/{id}. */
  marcos: ProjetoMarcoDTO[];
  equipe: ProjetoEquipeDTO[];
  links: ProjetoLinkDTO[];
}

export type ChamadoPrioridade = Prioridade;
export type ChamadoStatus = 'Aberto' | 'EmAndamento' | 'Resolvido' | 'Fechado';

export interface ChamadoDTO {
  idChamado: number;
  protocolo: string;
  origem: string;
  idCliente: number | null;
  clienteNome: string | null;
  usuarioNome: string;
  usuarioEmail: string | null;
  assunto: string;
  descricao: string;
  prioridade: ChamadoPrioridade;
  status: ChamadoStatus;
  resposta: string | null;
  idUsuarioAdminResponsavel: number | null;
  nomeResponsavel: string | null;
  dataHoraAbertura: string;
  dataHoraUltimaAtualizacao: string;
  idProjetoAtividadeVinculada: number | null;
  idAtividadeVinculada: number | null;
}

export type FaturaStatus = 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';

export interface FaturaDTO {
  idFatura: number;
  idCliente: number;
  clienteNome: string;
  idContrato: number | null;
  idProjeto: number | null;
  numeroFatura: string;
  descricao: string;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
  status: FaturaStatus;
}

export type DespesaStatus = 'Pendente' | 'Pago';

export interface DespesaDTO {
  idDespesa: number;
  descricao: string;
  categoria: string;
  valor: number;
  dataDespesa: string;
  status: DespesaStatus;
}

export interface WikiPaginaDTO {
  idPagina: number;
  idProjeto: number | null;
  titulo: string;
  autorNome: string;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface VpsStatusDTO {
  disponivel: boolean;
  cpuLoad1m: number;
  numNucleos: number;
  memPercentual: number;
  discoPercentual: number;
  uptimeSegundos: number;
}

export interface ObservabilidadeResumoDTO {
  habilitado: boolean;
  vps: VpsStatusDTO | null;
}

export type KanbanTipoAtividade = 'Tarefa' | 'Bug' | 'Melhoria' | 'Chamado';

export interface KanbanAtividadeDTO {
  idAtividade: number;
  idColuna: number;
  idProjeto: number | null;
  titulo: string;
  descricao: string | null;
  tipo: KanbanTipoAtividade;
  prioridade: Prioridade;
  idUsuarioAdminResponsavel: number | null;
  nomeResponsavel: string | null;
  dataPrazo: string | null;
  ordem: number;
  idChamadoOrigem: number | null;
  protocoloChamadoOrigem: string | null;
  dataCriacao: string;
  dataConclusao: string | null;
}

export interface KanbanColunaDTO {
  idColuna: number;
  idProjeto: number;
  nome: string;
  ordem: number;
  ehColunaConclusao: boolean;
  atividades: KanbanAtividadeDTO[];
}

export interface KanbanComentarioDTO {
  idComentario: number;
  idAtividade: number;
  idUsuarioAdminAutor: number;
  nomeAutor: string;
  conteudoHtml: string;
  dataCriacao: string;
}

export interface ColaboradorDTO {
  idUsuarioAdmin: number;
  nome: string;
  email: string;
  tipoUsuario: string;
  cargo: string | null;
  ativo: boolean;
}

export interface NotificacaoDTO {
  idNotificacao: number;
  idChamado: number | null;
  titulo: string;
  mensagem: string;
  lida: boolean;
  dataCriacao: string;
  dataLeitura: string | null;
}

export interface FinanceiroResumoDTO {
  mes: string;
  totalRecebido: number;
  totalAReceber: number;
  totalAtrasado: number;
  totalDespesas: number;
  saldo: number;
}

export interface DashboardResumoDTO {
  chamadosPorStatus: { status: ChamadoStatus; quantidade: number }[];
  projetosAtivos: number;
  projetosAtrasados: number;
  contratosAVencer: number;
  financeiroMesAtual: FinanceiroResumoDTO;
  serieMensal: { mes: string; recebido: number; despesas: number }[];
}

// ─── Escrita (espelham os DTOs de cadastro do backend) ──────────────────────

export interface CadastroClienteDTO {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cpfCnpj: string;
  email?: string | null;
  telefone?: string | null;
  nomeContato?: string | null;
  /** O PUT sobrescreve este vínculo — sempre reenviar o valor atual ao editar. */
  idSistemaOrigem?: number | null;
  observacoes?: string | null;
}

export interface CadastroProjetoDTO {
  idCliente: number;
  nome: string;
  descricao?: string | null;
  dataInicio: string;
  dataPrevisaoFim: string;
  prioridade: Prioridade;
  observacoes?: string | null;
}

export interface AtualizarProjetoDTO extends CadastroProjetoDTO {
  status: ProjetoStatus;
}

export interface CadastroChamadoInternoDTO {
  idCliente: number;
  usuarioNome?: string | null;
  usuarioEmail?: string | null;
  assunto: string;
  descricao: string;
  prioridade: Prioridade;
}

export interface CadastroAtividadeDTO {
  titulo: string;
  descricao?: string | null;
  tipo: KanbanTipoAtividade;
  prioridade: Prioridade;
  idUsuarioAdminResponsavel?: number | null;
  dataPrazo?: string | null;
}
