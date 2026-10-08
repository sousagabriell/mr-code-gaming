import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/http';

/** Intervalo do "Live" da HUD: os dados do MrCodeAdmin são reconsultados em segundo plano. */
export const LIVE_INTERVAL_MS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchInterval: LIVE_INTERVAL_MS,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
    },
  },
});

export const qk = {
  clientes: ['clientes'],
  contratos: ['contratos'],
  projetos: ['projetos'],
  projeto: (id: number) => ['projetos', id],
  chamados: ['chamados'],
  // Sob o prefixo 'chamados': invalidar a lista também atualiza o detalhe e as conversas abertas.
  chamado: (id: number) => ['chamados', id],
  mensagens: (idChamado: number) => ['chamados', idChamado, 'mensagens'],
  faturas: ['faturas'],
  despesas: ['despesas'],
  // O mês entra na chave: sem ele, navegar no extrato mostraria o resumo do mês anterior em cache.
  financeiro: (mes: string) => ['financeiro', mes],
  wiki: ['wiki'],
  equipe: ['equipe'],
  kanban: (idProjeto: number) => ['kanban', idProjeto],
  comentarios: (idAtividade: number) => ['comentarios', idAtividade],
  notificacoes: ['notificacoes'],
  dashboard: ['dashboard'],
  observabilidade: ['observabilidade'],
} as const;
