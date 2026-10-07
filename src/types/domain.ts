export type ClienteStatus = 'Ativo' | 'Inativo';

export interface ClienteDTO {
  idCliente: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  cpfCnpj: string;
  email: string | null;
  telefone: string | null;
  nomeContato: string | null;
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
export type ProjetoPrioridade = 'Baixa' | 'Media' | 'Alta';

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
}

export type ChamadoPrioridade = 'Baixa' | 'Media' | 'Alta';
export type ChamadoStatus = 'Aberto' | 'EmAndamento' | 'Resolvido' | 'Fechado';

export interface ChamadoDTO {
  idChamado: number;
  protocolo: string;
  idCliente: number | null;
  clienteNome: string | null;
  usuarioNome: string;
  assunto: string;
  prioridade: ChamadoPrioridade;
  status: ChamadoStatus;
  dataHoraAbertura: string;
}

export type FaturaStatus = 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';

export interface FaturaDTO {
  idFatura: number;
  idCliente: number;
  clienteNome: string;
  numeroFatura: string;
  descricao: string;
  valor: number;
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
  titulo: string;
  tipo: KanbanTipoAtividade;
  nomeResponsavel: string | null;
  dataConclusao: string | null;
}

export interface KanbanColunaDTO {
  idColuna: number;
  nome: string;
  ordem: number;
  ehColunaConclusao: boolean;
  atividades: KanbanAtividadeDTO[];
}

export interface ColaboradorDTO {
  idUsuarioAdmin: number;
  nome: string;
  email: string;
  tipoUsuario: string;
  cargo: string | null;
  ativo: boolean;
}
