import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { toast } from '../store/toastStore';
import type {
  CadastroChamadoInternoDTO,
  CadastroClienteDTO,
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

// ─── Financeiro ─────────────────────────────────────────────────────────────

export const usePagarFatura = () =>
  useGameMutation({
    mutationFn: ({ id }: { id: number }) => api.faturas.pagar(id),
    invalidate: [qk.faturas],
    success: () => ({ title: 'Pagamento recebido', detail: 'Carro-forte a caminho do Banco Central' }),
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
