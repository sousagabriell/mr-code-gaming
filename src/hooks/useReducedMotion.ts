import { useSyncExternalStore } from 'react';
import { usePrefsStore } from '../store/prefsStore';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

/**
 * Movimento reduzido: preferência do sistema operacional OU o botão do menu do usuário.
 * Na cena desliga deslocamentos (pedestres, chegadas, chuva) e tudo que pisca (giroflex, relâmpago).
 */
export function useReducedMotion(): boolean {
  const system = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const forced = usePrefsStore((s) => s.reduceMotion);
  return system || forced;
}

/** Leitura fora do React (handlers, useFrame). */
export function isReducedMotion(): boolean {
  return (typeof window !== 'undefined' && window.matchMedia(QUERY).matches) || usePrefsStore.getState().reduceMotion;
}
