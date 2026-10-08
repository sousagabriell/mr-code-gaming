import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { textToHtml } from '../lib/format';
import { ApiError } from '../lib/http';
import { toast } from '../store/toastStore';
import type { CadastroAtividadeDTO, KanbanColunaDTO } from '../types/domain';
import { findAtividade, moveAtividade } from '../world/kanban';
import { formatarPrazo, mensagemDePrazo } from '../world/phone';
import { api } from './endpoints';
import { qk } from './queryClient';

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Não foi possível concluir a ação.';
}

export const useComentariosQuery = (idAtividade: number | null) =>
  useQuery({
    queryKey: qk.comentarios(idAtividade ?? 0),
    queryFn: () => api.kanban.comentarios(idAtividade!),
    enabled: idAtividade !== null,
  });

/** Invalida o quadro do projeto e mostra o feedback padrão. */
function useKanbanMutation<TVars extends { idProjeto: number }, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  success?: (data: TData, vars: TVars) => string | null
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      const msg = success?.(data, vars);
      if (msg) toast.ok(msg);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors.length > 0) return;
      toast.bad('Ação não concluída', errorMessage(error));
    },
    onSettled: (_d, _e, vars) => queryClient.invalidateQueries({ queryKey: qk.kanban(vars.idProjeto) }),
  });
}

/**
 * Mover caixa entre zonas: o quadro muda na hora (a caixa "anda" até a vaga nova) e
 * volta ao estado anterior se a API recusar.
 */
export function useMoverAtividade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { idProjeto: number; idAtividade: number; idColunaDestino: number; novaOrdem: number }) =>
      api.kanban.moverAtividade(v.idAtividade, v.idColunaDestino, v.novaOrdem),
    onMutate: async (v) => {
      const key = qk.kanban(v.idProjeto);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<KanbanColunaDTO[]>(key);
      const origem = findAtividade(previous, v.idAtividade)?.coluna;
      if (previous) queryClient.setQueryData(key, moveAtividade(previous, v.idAtividade, v.idColunaDestino, v.novaOrdem));
      return { previous, origem };
    },
    onError: (error, v, context) => {
      if (context?.previous) queryClient.setQueryData(qk.kanban(v.idProjeto), context.previous);
      toast.bad('A caixa voltou para o lugar', errorMessage(error));
    },
    onSuccess: (_d, v, context) => {
      const destino = context?.previous?.find((c) => c.idColuna === v.idColunaDestino);
      if (!destino || context?.origem?.idColuna === destino.idColuna) return;
      if (destino.ehColunaConclusao) toast.ok('Entregue na expedição', 'Atividade concluída');
      else toast.info(`Caixa levada para ${destino.nome}`);
    },
    onSettled: (_d, _e, v) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.kanban(v.idProjeto) }),
        queryClient.invalidateQueries({ queryKey: qk.chamados }),
      ]),
  });
}

export const useCriarAtividade = () =>
  useKanbanMutation(
    (v: { idProjeto: number; idColuna: number; dto: CadastroAtividadeDTO }) => api.kanban.criarAtividade(v.idColuna, v.dto),
    () => 'Nova caixa no pátio'
  );

export const useAtualizarAtividade = () =>
  useKanbanMutation(
    (v: { idProjeto: number; idAtividade: number; dto: CadastroAtividadeDTO }) => api.kanban.atualizarAtividade(v.idAtividade, v.dto),
    () => 'Atividade atualizada'
  );

export const useRemoverAtividade = () =>
  useKanbanMutation((v: { idProjeto: number; idAtividade: number }) => api.kanban.removerAtividade(v.idAtividade), () => 'Caixa removida do pátio');

export const useCriarColuna = () =>
  useKanbanMutation((v: { idProjeto: number; nome: string }) => api.kanban.criarColuna(v.idProjeto, v.nome), (_d, v) => `Zona “${v.nome}” pintada no pátio`);

export const useRenomearColuna = () =>
  useKanbanMutation((v: { idProjeto: number; idColuna: number; nome: string }) => api.kanban.renomearColuna(v.idColuna, v.nome), () => 'Zona renomeada');

export const useRemoverColuna = () =>
  useKanbanMutation((v: { idProjeto: number; idColuna: number }) => api.kanban.removerColuna(v.idColuna), () => 'Zona removida');

/** Reordenar zonas também é otimista — as zonas deslizam na hora. */
export function useReordenarColuna() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { idProjeto: number; idColuna: number; novaOrdem: number }) => api.kanban.reordenarColuna(v.idColuna, v.novaOrdem),
    onMutate: async (v) => {
      const key = qk.kanban(v.idProjeto);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<KanbanColunaDTO[]>(key);
      if (previous) {
        const sorted = [...previous].sort((a, b) => a.ordem - b.ordem);
        const coluna = sorted.find((c) => c.idColuna === v.idColuna);
        if (coluna) {
          const rest = sorted.filter((c) => c.idColuna !== v.idColuna);
          rest.splice(Math.min(Math.max(v.novaOrdem, 0), rest.length), 0, coluna);
          queryClient.setQueryData(key, rest.map((c, i) => ({ ...c, ordem: i })));
        }
      }
      return { previous };
    },
    onError: (error, v, context) => {
      if (context?.previous) queryClient.setQueryData(qk.kanban(v.idProjeto), context.previous);
      toast.bad('Ação não concluída', errorMessage(error));
    },
    onSettled: (_d, _e, v) => queryClient.invalidateQueries({ queryKey: qk.kanban(v.idProjeto) }),
  });
}

export function useComentar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { idAtividade: number; conteudoHtml: string }) => api.kanban.comentar(v.idAtividade, v.conteudoHtml),
    onError: (error) => toast.bad('Comentário não enviado', errorMessage(error)),
    onSettled: (_d, _e, v) => queryClient.invalidateQueries({ queryKey: qk.comentarios(v.idAtividade) }),
  });
}

export interface ConverterChamadoVars {
  idChamado: number;
  idProjeto: number;
  idColuna: number | null;
  /** `yyyy-mm-dd`; obrigatório — é ele que vira o aviso no chat do cliente. */
  dataPrazo: string;
  assunto: string;
}

/**
 * Chamado → caixa no pátio, com prazo e aviso ao cliente. São três chamadas porque
 * `POST /Chamado/{id}/converter-atividade` não aceita prazo:
 *   1. converte (a caixa passa a existir);
 *   2. `PUT /Kanban/atividades/{id}` grava o prazo — o PUT substitui o registro inteiro, então os
 *      outros campos voltam a partir da atividade que o passo 1 devolveu;
 *   3. a mensagem automática entra na thread do chamado.
 *
 * Não é atômico. Depois do passo 1 nada pode virar um "falhou" genérico: o usuário repetiria a
 * conversão e duplicaria a caixa. Por isso 2 e 3 reportam exatamente o que não foi salvo.
 */
export function useConverterChamado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: ConverterChamadoVars) => {
      const atividade = await api.chamados.converterEmAtividade(v.idChamado, v.idProjeto, v.idColuna);
      if (!atividade) return { atividade, prazoOk: false, avisoOk: false };

      let prazoOk = false;
      try {
        await api.kanban.atualizarAtividade(atividade.idAtividade, {
          titulo: atividade.titulo,
          descricao: atividade.descricao,
          tipo: atividade.tipo,
          prioridade: atividade.prioridade,
          idUsuarioAdminResponsavel: atividade.idUsuarioAdminResponsavel,
          dataPrazo: `${v.dataPrazo}T00:00:00`,
        });
        prazoOk = true;
      } catch {
        // Relatado no onSuccess: a caixa já existe, repetir a conversão duplicaria.
      }

      let avisoOk = false;
      try {
        await api.chamados.enviarMensagem(v.idChamado, textToHtml(mensagemDePrazo(v.assunto, v.dataPrazo)));
        avisoOk = true;
      } catch {
        // idem
      }

      return { atividade, prazoOk, avisoOk };
    },
    onSuccess: ({ prazoOk, avisoOk }, v) => {
      if (!prazoOk) {
        toast.bad('Caixa criada, mas sem prazo', 'Abra a caixa no pátio e informe o prazo.');
        return;
      }
      if (!avisoOk) {
        toast.bad('Prazo salvo, cliente não avisado', 'Mande a mensagem pelo chat do celular.');
        return;
      }
      toast.ok('Chamado descarregado no pátio', `Prazo ${formatarPrazo(v.dataPrazo)} avisado ao cliente`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors.length > 0) return;
      toast.bad('Não foi possível converter', errorMessage(error));
    },
    onSettled: (_d, _e, v) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.kanban(v.idProjeto) }),
        queryClient.invalidateQueries({ queryKey: qk.chamados }),
      ]),
  });
}
