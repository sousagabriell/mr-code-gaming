import { useMemo } from 'react';
import { useAllKanbans, useDashboardQuery } from '../api/queries';
import { useMetasStore } from '../store/metasStore';
import {
  achievements,
  cityHealth,
  computeXp,
  levelInfo,
  weeklyMissions,
  weeklyRanking,
  type GameData,
} from '../world/gamification';
import { avaliarMetas, xpDeMetas } from '../world/metas';
import { useMetasDoUsuario } from './useMetas';
import { useNow } from './useNow';
import { useWorld } from './useWorld';

/**
 * Estado do jogo (XP, nível, saúde/clima, missões, ranking, conquistas, metas) derivado dos dados
 * reais — mais o bônus das metas batidas, que é a única parcela guardada no navegador.
 */
export function useGame() {
  const world = useWorld();
  const kanbans = useAllKanbans(world.projetos);
  const { data: dashboard } = useDashboardQuery();
  const now = useNow();

  // As metas são por usuário: trocar de conta troca a lista.
  useMetasDoUsuario();
  const listaDeMetas = useMetasStore((s) => s.metas);
  const cumpridas = useMetasStore((s) => s.cumpridas);

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
      metasCumpridas: { quantas: Object.keys(cumpridas).length, xp: xpDeMetas(cumpridas) },
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
      // Avaliar metas não depende do XP: o bônus de uma meta recém-batida entra no render seguinte
      // ao registro — que é justamente quando o toast aparece.
      metas: avaliarMetas(listaDeMetas, d, cumpridas, now),
    };
  }, [world, kanbans, dashboard, now, settled, listaDeMetas, cumpridas]);
}

export type GameState = ReturnType<typeof useGame>;
