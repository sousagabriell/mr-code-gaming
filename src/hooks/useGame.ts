import { useMemo } from 'react';
import { useAllKanbans, useDashboardQuery } from '../api/queries';
import {
  achievements,
  cityHealth,
  computeXp,
  levelInfo,
  weeklyMissions,
  weeklyRanking,
  type GameData,
} from '../world/gamification';
import { useNow } from './useNow';
import { useWorld } from './useWorld';

/** Estado do jogo (XP, nível, saúde/clima, missões, ranking, conquistas) derivado dos dados reais. */
export function useGame() {
  const world = useWorld();
  const kanbans = useAllKanbans(world.projetos);
  const { data: dashboard } = useDashboardQuery();
  const now = useNow();

  const esperados = world.projetos.filter((p) => p.status !== 'Cancelado').length;
  // "Assentado" = tudo carregado; antes disso o XP subiria só porque os quadros chegaram depois.
  const settled = !world.isLoading && kanbans.size >= esperados && !!dashboard;

  return useMemo(() => {
    const d: GameData = {
      clientes: world.clientes,
      contratos: world.contratos,
      projetos: world.projetos,
      chamados: world.chamados,
      faturas: world.faturas,
      wikiPaginas: world.wikiPaginas,
      kanbans,
      observabilidade: world.observabilidade,
      dashboard: dashboard ?? null,
    };
    const xp = computeXp(d);
    const level = levelInfo(xp.total);
    const health = cityHealth(d, now);
    return {
      settled,
      xp,
      level,
      health,
      missions: weeklyMissions(d, now),
      ranking: weeklyRanking(d, now),
      conquistas: achievements(d, { level: level.level, health: health.score, now }),
    };
  }, [world, kanbans, dashboard, now, settled]);
}

export type GameState = ReturnType<typeof useGame>;
