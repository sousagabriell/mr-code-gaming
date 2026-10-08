import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { ChamadoMensagemDTO, KanbanColunaDTO, ProjetoDTO } from '../types/domain';
import { useAuthStore } from '../store/authStore';
import { api } from './endpoints';
import { qk } from './queryClient';

export const useClientesQuery = () => useQuery({ queryKey: qk.clientes, queryFn: api.clientes.list });
export const useContratosQuery = () => useQuery({ queryKey: qk.contratos, queryFn: api.contratos.list });
export const useProjetosQuery = () => useQuery({ queryKey: qk.projetos, queryFn: api.projetos.list });
export const useChamadosQuery = () => useQuery({ queryKey: qk.chamados, queryFn: api.chamados.list });
export const useFaturasQuery = () => useQuery({ queryKey: qk.faturas, queryFn: api.faturas.list });
export const useDespesasQuery = () => useQuery({ queryKey: qk.despesas, queryFn: api.despesas.list });
export const useWikiQuery = () => useQuery({ queryKey: qk.wiki, queryFn: api.wiki.list });
export const useDashboardQuery = () => useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard.resumo });
export const useNotificacoesQuery = () => useQuery({ queryKey: qk.notificacoes, queryFn: api.notificacoes.minhas });

export const useObservabilidadeQuery = () =>
  useQuery({ queryKey: qk.observabilidade, queryFn: api.observabilidade.resumo });

/** Resumo financeiro de um mês (`aaaa-MM`) — o cabeçalho do extrato da agência. */
export const useFinanceiroResumoQuery = (mes: string) =>
  useQuery({ queryKey: qk.financeiro(mes), queryFn: () => api.financeiro.resumo(mes) });

/** GET /UsuarioAdmin exige perfil ADMIN — para STAFF a equipe simplesmente não é carregada. */
export function useEquipeQuery() {
  const isAdmin = useAuthStore((s) => s.usuario?.tipoUsuario === 'ADMIN');
  return useQuery({ queryKey: qk.equipe, queryFn: api.equipe.list, enabled: isAdmin });
}

export const useProjetoDetalheQuery = (id: number | null) =>
  useQuery({ queryKey: qk.projeto(id ?? 0), queryFn: () => api.projetos.get(id!), enabled: id !== null });

export const useKanbanQuery = (idProjeto: number | null) =>
  useQuery({ queryKey: qk.kanban(idProjeto ?? 0), queryFn: () => api.kanban.quadro(idProjeto!), enabled: idProjeto !== null });

/**
 * Quadro de todos os projetos não cancelados (uma query por projeto, compartilhando o cache do pátio).
 * Alimenta os colaboradores andando pela cidade e a gamificação (atividades entregues, ranking).
 */
// Referência estável: o TanStack só re-executa o combine quando algum resultado muda.
const onlyData = (results: { data?: KanbanColunaDTO[] }[]) => results.map((r) => r.data);

export function useAllKanbans(projetos: ProjetoDTO[]) {
  const ids = useMemo(() => projetos.filter((p) => p.status !== 'Cancelado').map((p) => p.idProjeto), [projetos]);
  const datas = useQueries({
    queries: ids.map((id) => ({ queryKey: qk.kanban(id), queryFn: () => api.kanban.quadro(id) })),
    combine: onlyData,
  });
  return useMemo(() => {
    const byProjeto = new Map<number, KanbanColunaDTO[]>();
    datas.forEach((d, i) => {
      if (d) byProjeto.set(ids[i], d);
    });
    return byProjeto;
  }, [datas, ids]);
}

export const useChamadoDetalheQuery = (id: number | null) =>
  useQuery({ queryKey: qk.chamado(id ?? 0), queryFn: () => api.chamados.get(id!), enabled: id !== null });

/** Threads carregadas por conversa; o resto do histórico fica no MrCodeAdmin. */
export const MAX_THREADS_POR_CONVERSA = 20;

// Referência estável: o TanStack só re-executa o combine quando algum resultado muda.
const combineMensagens = (results: { data?: ChamadoMensagemDTO[]; isPending: boolean }[]) => ({
  mensagens: results.flatMap((r) => r.data ?? []),
  isLoading: results.some((r) => r.isPending),
});

/**
 * A conversa de um cliente é a união das threads dos chamados dele — o backend guarda mensagem por
 * chamado, não por cliente. Uma query por thread, compartilhando o cache com o detalhe do chamado.
 */
export function useMensagensDoCliente(idsChamado: number[]) {
  return useQueries({
    queries: idsChamado.slice(0, MAX_THREADS_POR_CONVERSA).map((id) => ({
      queryKey: qk.mensagens(id),
      queryFn: () => api.chamados.mensagens(id),
    })),
    combine: combineMensagens,
  });
}
