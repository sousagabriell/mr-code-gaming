import { useEffect, useRef } from 'react';
import { playSfx } from '../lib/sfx';
import { useAuthStore } from '../store/authStore';
import { loadProgress, saveProgress, useGameStore } from '../store/gameStore';
import { useMetasStore } from '../store/metasStore';
import { toast } from '../store/toastStore';
import { UNLOCKS, type XpLine } from '../world/gamification';
import { metasParaRegistrar } from '../world/metas';
import type { GameState } from './useGame';

/**
 * Observa o estado do jogo e transforma mudanças em feedback: "+50 XP · Chamados resolvidos",
 * subida de nível (com o desbloqueio), conquistas novas. A primeira leitura assentada só vira
 * linha de base — e compara com o progresso salvo para celebrar o que mudou "enquanto você estava fora".
 */
export function useGameProgress(game: GameState) {
  const userId = useAuthStore((s) => s.usuario?.idUsuarioAdmin ?? null);
  const baseline = useRef<{ lines: XpLine[]; level: number } | null>(null);

  useEffect(() => {
    if (!game.settled || userId === null) return;
    const store = useGameStore.getState();
    const sound = store.sound;
    const metNow = game.conquistas.filter((c) => c.met).map((c) => c.key);
    const persisted = loadProgress(userId);
    const unlocked = new Set([...(persisted?.achievements ?? []), ...store.unlocked]);
    const level = game.level.level;

    if (!baseline.current) {
      // Primeira leitura da sessão.
      if (persisted) {
        const ganho = game.xp.total - persisted.xp;
        if (ganho > 0) toast.xp(`+${ganho} XP desde a sua última visita`, `Cidade no nível ${level}`);
        if (level > persisted.level) {
          store.celebrate({ level, unlock: UNLOCKS.find((u) => u.level === level)?.nome ?? null, offline: true });
        }
      }
      // Conquistas já atendidas entram em silêncio na primeira visita; nas seguintes, anuncia as novas.
      const novas = persisted ? metNow.filter((k) => !unlocked.has(k)) : [];
      novas.forEach((k) => toast.xp('Conquista desbloqueada', game.conquistas.find((c) => c.key === k)?.nome));
      metNow.forEach((k) => unlocked.add(k));
    } else {
      // Durante a sessão: XP ganho por categoria.
      let ganhou = false;
      for (const line of game.xp.lines) {
        // O bônus de meta já é anunciado com o nome da meta, logo abaixo — sem isto, sairiam dois
        // toasts para o mesmo acontecimento.
        if (line.key === 'metas') continue;
        const antes = baseline.current.lines.find((l) => l.key === line.key)?.xp ?? 0;
        if (line.xp > antes) {
          toast.xp(`+${line.xp - antes} XP`, line.label);
          ganhou = true;
        }
      }
      if (level > baseline.current.level) {
        store.celebrate({ level, unlock: UNLOCKS.find((u) => u.level === level)?.nome ?? null, offline: false });
        if (sound) playSfx('level');
      } else if (ganhou && sound) {
        playSfx('xp');
      }
      const novas = metNow.filter((k) => !unlocked.has(k));
      novas.forEach((k) => toast.xp('Conquista desbloqueada', game.conquistas.find((c) => c.key === k)?.nome));
      if (novas.length && sound) setTimeout(() => playSfx('unlock'), 350);
      novas.forEach((k) => unlocked.add(k));
    }

    /**
     * Metas batidas: registra o pagamento **uma vez**. É o registro que separa "recompensa" de
     * "número que oscila" — o progresso é recalculado a cada refetch, e um chamado reaberto sai de
     * "resolvidos". Sem gravar, o bônus seria pago de novo a cada carga ou sumiria depois.
     */
    const agora = new Date().toISOString();
    for (const { meta } of metasParaRegistrar(game.metas)) {
      useMetasStore.getState().registrarCumprida(meta, agora);
      toast.xp(`Meta cumprida · +${meta.recompensa} XP`, meta.titulo);
      if (sound) setTimeout(() => playSfx('unlock'), 200);
    }

    baseline.current = { lines: game.xp.lines, level };
    store.setUnlocked([...unlocked]);
    saveProgress(userId, { achievements: [...unlocked], level, xp: game.xp.total });
  }, [game, userId]);
}
