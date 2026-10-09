import { useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMetasStore } from '../store/metasStore';
import { contarAtivas } from '../world/metas';
import { useNow } from './useNow';

/** Carrega as metas do usuário logado. Idempotente — pode ser chamado por mais de uma tela. */
export function useMetasDoUsuario() {
  const idUsuario = useAuthStore((s) => s.usuario?.idUsuarioAdmin ?? null);
  const carregar = useMetasStore((s) => s.carregar);
  useEffect(() => {
    if (idUsuario !== null) carregar(idUsuario);
  }, [idUsuario, carregar]);
}

/**
 * Metas em andamento agora — o número que a placa da Prefeitura e o seletor de distrito mostram.
 * Passa pelo `useNow` em vez de `Date.now()` solto: relógio no render é impuro, e a janela de uma
 * meta vira à meia-noite.
 */
export function useMetasAtivas(): number {
  const metas = useMetasStore((s) => s.metas);
  const cumpridas = useMetasStore((s) => s.cumpridas);
  const agora = useNow();
  return useMemo(() => contarAtivas(metas, cumpridas, agora), [metas, cumpridas, agora]);
}
