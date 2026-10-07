import { useMemo } from 'react';
import {
  useChamadosQuery,
  useClientesQuery,
  useContratosQuery,
  useDespesasQuery,
  useEquipeQuery,
  useFaturasQuery,
  useObservabilidadeQuery,
  useProjetosQuery,
  useWikiQuery,
} from '../api/queries';
import type {
  ChamadoDTO,
  ClienteDTO,
  ColaboradorDTO,
  ContratoDTO,
  DespesaDTO,
  FaturaDTO,
  ProjetoDTO,
  WikiPaginaDTO,
} from '../types/domain';
import { buildCityLayout } from '../world/layout';

// Referências estáveis para não invalidar useMemo enquanto a query ainda não respondeu.
const NO_CLIENTES: ClienteDTO[] = [];
const NO_CONTRATOS: ContratoDTO[] = [];
const NO_PROJETOS: ProjetoDTO[] = [];
const NO_CHAMADOS: ChamadoDTO[] = [];
const NO_FATURAS: FaturaDTO[] = [];
const NO_DESPESAS: DespesaDTO[] = [];
const NO_WIKI: WikiPaginaDTO[] = [];
const NO_EQUIPE: ColaboradorDTO[] = [];

/** Tudo o que a cidade precisa, vindo de queries independentes (uma falha não derruba as outras). */
export function useWorld() {
  const clientes = useClientesQuery();
  const contratos = useContratosQuery();
  const projetos = useProjetosQuery();
  const chamados = useChamadosQuery();
  const faturas = useFaturasQuery();
  const despesas = useDespesasQuery();
  const wiki = useWikiQuery();
  const equipe = useEquipeQuery();
  const observabilidade = useObservabilidadeQuery();

  const core = [clientes, contratos, projetos, chamados];
  const isLoading = core.some((q) => q.isPending);
  const isError = core.some((q) => q.isError);

  // Objeto estável enquanto nenhum dado muda — consumidores podem usá-lo como dependência de useMemo.
  return useMemo(
    () => ({
      clientes: clientes.data ?? NO_CLIENTES,
      contratos: contratos.data ?? NO_CONTRATOS,
      projetos: projetos.data ?? NO_PROJETOS,
      chamados: chamados.data ?? NO_CHAMADOS,
      faturas: faturas.data ?? NO_FATURAS,
      despesas: despesas.data ?? NO_DESPESAS,
      wikiPaginas: wiki.data ?? NO_WIKI,
      colaboradores: equipe.data ?? NO_EQUIPE,
      observabilidade: observabilidade.data ?? null,
      isLoading,
      isError,
    }),
    [
      clientes.data,
      contratos.data,
      projetos.data,
      chamados.data,
      faturas.data,
      despesas.data,
      wiki.data,
      equipe.data,
      observabilidade.data,
      isLoading,
      isError,
    ]
  );
}

export type World = ReturnType<typeof useWorld>;

export function useCityLayout() {
  const { clientes, contratos, projetos, chamados, faturas } = useWorld();
  return useMemo(
    () => buildCityLayout(clientes, contratos, projetos, chamados, faturas),
    [clientes, contratos, projetos, chamados, faturas]
  );
}
