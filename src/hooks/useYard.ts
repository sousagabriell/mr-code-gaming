import { useMemo } from 'react';
import { useKanbanQuery } from '../api/queries';
import { useUiStore } from '../store/uiStore';
import { buildYardLayout } from '../world/yard';
import { useWorld } from './useWorld';

/** Pátio aberto no momento (projeto + quadro + layout), ou null quando estamos na cidade. */
export function useYard() {
  const yard = useUiStore((s) => s.yard);
  const { projetos } = useWorld();
  const { data: colunas, isPending } = useKanbanQuery(yard);

  const layout = useMemo(() => (colunas ? buildYardLayout(colunas) : null), [colunas]);
  const projeto = yard ? (projetos.find((p) => p.idProjeto === yard) ?? null) : null;

  return { idProjeto: yard, projeto, colunas, layout, isPending: yard !== null && isPending };
}
