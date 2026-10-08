import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  // useCallback: sem referência estável o useSyncExternalStore reassina a cada render.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Celular (< 768px): inspector vira bottom sheet e aparece a barra inferior de ações. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** A partir do `lg` do Tailwind — onde cabem as colunas laterais da HUD (KPIs, inspector, celular). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
