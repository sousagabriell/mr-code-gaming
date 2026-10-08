import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { textToHtml } from '../lib/format';
import { toast } from '../store/toastStore';
import type {
  CadastroChamadoInternoDTO,
  CadastroClienteDTO,
  CadastroDespesaDTO,
  CadastroFaturaDTO,
  CadastroProjetoDTO,
  ChamadoDTO,
  ChamadoStatus,
  ClienteStatus,
} from '../types/domain';
import { api } from './endpoints';
import { qk } from './queryClient';

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Não foi possível concluir a ação.';
}

/**
 * Mutação padrão do jogo: chama a API, invalida os recursos afetados e dá feedback.
 * Formulários usam `mutateAsync` e tratam `ApiError.fieldErrors` campo a campo.
 */
function useGameMutation<TVars, TData>(options: {
  mutationFn: (vars: TVars) => Promise<TData>;
  invalidate: QueryKey[];
  success?: (data: TData, vars: TVars) => { title: string; detail?: string } | null;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (data, vars) => {
      const msg = options.success?.(data, vars);
      if (msg) toast.ok(msg.title, msg.detail);
    },
    onError: (error) => {
      // Erros de validação de formulário são exibidos no próprio campo.
      if (error instanceof ApiError && error.fieldErrors.length > 0) return;
      toast.bad('Ação não concluída', errorMessage(error));
    },
    onSettled: () =>
      Promise.all([
        ...options.invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        queryClient.invalidateQueries({ queryKey: qk.dashboard }),
      ]),
  });
}

// ─── Clientes ───────────────────────────────────────────────────────────────

export const useCriarCliente = () =>
  useGameMutation({
    mutationFn: (dto: CadastroClienteDTO) => api.clientes.create(dto),
    invalidate: [qk.clientes],
    success: (c) => ({ title: 'Nova sede construída', detail: c?.nomeFantasia ?? c?.razaoSocial }),
  });

export const useAtualizarCliente = () =>
  useGameMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CadastroClienteDTO }) => api.clientes.update(id, dto),
    invalidate: [qk.clientes, qk.contratos, qk.projetos, qk.chamados, qk.faturas],
    success: () => ({ title: 'Cliente atualizado' }),
  });

export const useAlterarStatusCliente = () =>
  useGameMutation({
    mutationFn: ({ id, status }: { id: number; status: ClienteStatus }) => api.clientes.setStatus(id, status),
    invalidate: [qk.clientes],
    success: (_, { status }) => ({ title: status === 'Ativo' ? 'Luzes da sede acesas' : 'Sede desativada' }),
  });

// ─── Projetos ───────────────────────────────────────────────────────────────

export const useCriarProjeto = () =>
  useGameMutation({
    mutationFn: (dto: CadastroProjetoDTO) => api.projetos.create(dto),
    invalidate: [qk.projetos],
    success: (p) => ({ title: 'Canteiro de obras aberto', detail: p?.nome }),
  });

// ─── Chamados (com atualização otimista: o caminhão reage na hora) ──────────

function usePatchChamado<TVars extends { id: number }>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  patch: (chamado: ChamadoDTO, vars: TVars) => ChamadoDTO,
  success: (vars: TVars) => string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: qk.chamados });
      const previous = queryClient.getQueryData<ChamadoDTO[]>(qk.chamados);
      queryClient.setQueryData<ChamadoDTO[]>(qk.chamados, (list) =>
        list?.map((c) => (c.idChamado === vars.id ? patch(c, vars) : c))
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(qk.chamados, context.previous);
      toast.bad('Ação não concluída', errorMessage(error));
    },
    onSuccess: (_data, vars) => toast.ok(success(vars)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.chamados }),
        queryClient.invalidateQueries({ queryKey: qk.notificacoes }),
        queryClient.invalidateQueries({ queryKey: qk.dashboard }),
      ]),
  });
}

const STATUS_SUCCESS: Record<ChamadoStatus, string> = {
  Aberto: 'Chamado reaberto',
  EmAndamento: 'Atendimento iniciado',
  Resolvido: 'Chamado resolvido',
  Fechado: 'Chamado fechado',
};

export const useAlterarStatusChamado = () =>
  usePatchChamado(
    ({ id, status }: { id: number; status: ChamadoStatus }) => api.chamados.setStatus(id, status),
    (c, { status }) => ({ ...c, status, dataHoraUltimaAtualizacao: new Date().toISOString() }),
    ({ status }) => STATUS_SUCCESS[status]
  );

export const useAtribuirResponsavel = () =>
  usePatchChamado(
    ({ id, idUsuarioAdmin }: { id: number; idUsuarioAdmin: number; nome: string }) =>
      api.chamados.setResponsavel(id, idUsuarioAdmin),
    (c, { idUsuarioAdmin, nome }) => ({ ...c, idUsuarioAdminResponsavel: idUsuarioAdmin, nomeResponsavel: nome }),
    ({ nome }) => `Chamado atribuído a ${nome}`
  );

export const useCriarChamadoInterno = () =>
  useGameMutation({
    mutationFn: (dto: CadastroChamadoInternoDTO) => api.chamados.createInterno(dto),
    invalidate: [qk.chamados, qk.notificacoes],
    success: (c) => ({ title: 'Chamado aberto', detail: c?.protocolo }),
  });

/**
 * Resposta no chat do cliente. O texto digitado vira HTML porque o MrCodeAdmin renderiza o
 * `conteudoHtml` da mensagem — mandar texto cru perderia as quebras de linha.
 */
export function useEnviarMensagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idChamado, texto }: { idChamado: number; texto: string }) =>
      api.chamados.enviarMensagem(idChamado, textToHtml(texto)),
    onError: (error) => toast.bad('Mensagem não enviada', errorMessage(error)),
    onSettled: (_d, _e, { idChamado }) => queryClient.invalidateQueries({ queryKey: qk.mensagens(idChamado) }),
  });
}

// ─── Financeiro ─────────────────────────────────────────────────────────────

/**
 * Mexer no financeiro muda o saldo da cidade: além do recurso, invalida o resumo mensal do extrato
 * (`['financeiro', …]`, todos os meses — a conta de um mês pode entrar em outro ao estornar).
 */
const FINANCEIRO = [qk.faturas, qk.despesas, ['financeiro']];

export const usePagarFatura = () =>
  useGameMutation({
    mutationFn: ({ id, formaPagamento }: { id: number; formaPagamento?: string }) => api.faturas.pagar(id, formaPagamento),
    invalidate: FINANCEIRO,
    success: () => ({ title: 'Pagamento recebido', detail: 'Carro-forte a caminho do Banco Central' }),
  });

export const useEstornarFatura = () =>
  useGameMutation({
    mutationFn: ({ id }: { id: number }) => api.faturas.estornar(id),
    invalidate: FINANCEIRO,
    success: (f) => ({ title: 'Pagamento estornado', detail: f?.numeroFatura }),
  });

export const useCancelarFatura = () =>
  useGameMutation({
    mutationFn: ({ id }: { id: number }) => api.faturas.cancelar(id),
    invalidate: FINANCEIRO,
    success: (f) => ({ title: 'Fatura cancelada', detail: f?.numeroFatura }),
  });

export const useCriarFatura = () =>
  useGameMutation({
    mutationFn: (dto: CadastroFaturaDTO) => api.faturas.criar(dto),
    invalidate: FINANCEIRO,
    success: (f) => ({ title: 'Fatura emitida', detail: f?.numeroFatura }),
  });

export const useAtualizarFatura = () =>
  useGameMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CadastroFaturaDTO }) => api.faturas.atualizar(id, dto),
    invalidate: FINANCEIRO,
    success: () => ({ title: 'Fatura atualizada' }),
  });

export const useCriarDespesa = () =>
  useGameMutation({
    mutationFn: (dto: CadastroDespesaDTO) => api.despesas.criar(dto),
    invalidate: FINANCEIRO,
    success: (d) => ({ title: 'Despesa lançada', detail: d?.descricao }),
  });

export const useAtualizarDespesa = () =>
  useGameMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CadastroDespesaDTO }) => api.despesas.atualizar(id, dto),
    invalidate: FINANCEIRO,
    success: () => ({ title: 'Despesa atualizada' }),
  });

export const usePagarDespesa = () =>
  useGameMutation({
    mutationFn: ({ id }: { id: number }) => api.despesas.pagar(id),
    invalidate: FINANCEIRO,
    success: (d) => ({ title: 'Despesa paga', detail: d?.descricao }),
  });

export const useEstornarDespesa = () =>
  useGameMutation({
    mutationFn: ({ id }: { id: number }) => api.despesas.estornar(id),
    invalidate: FINANCEIRO,
    success: (d) => ({ title: 'Pagamento estornado', detail: d?.descricao }),
  });

/**
 * O endpoint devolve a lista do que criou e a contagem no `message` — mas o `http.ts` entrega só o
 * `data` ao chamador. O aviso é montado do tamanho do array, senão "nada gerado" sairia sem explicação.
 */
function recorrentesToast(n: number, substantivo: 'fatura' | 'despesa') {
  if (n === 0) return { title: 'Nada a gerar', detail: 'Os lançamentos recorrentes deste mês já existem.' };
  const plural = n === 1 ? '' : 's';
  return { title: `${n} ${substantivo}${plural} gerada${plural}`, detail: 'A partir dos lançamentos recorrentes.' };
}

export const useGerarFaturasRecorrentes = () =>
  useGameMutation({
    mutationFn: () => api.faturas.gerarRecorrentes(),
    invalidate: FINANCEIRO,
    success: (criadas) => recorrentesToast(criadas?.length ?? 0, 'fatura'),
  });

export const useGerarDespesasRecorrentes = () =>
  useGameMutation({
    mutationFn: () => api.despesas.gerarRecorrentes(),
    invalidate: FINANCEIRO,
    success: (criadas) => recorrentesToast(criadas?.length ?? 0, 'despesa'),
  });

// ─── Notificações ───────────────────────────────────────────────────────────

export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.notificacoes.marcarLida(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notificacoes }),
  });
}

export function useMarcarTodasLidas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.notificacoes.marcarTodas(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notificacoes }),
  });
}
