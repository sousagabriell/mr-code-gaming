import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** Celular (< 768px): inspector vira bottom sheet e aparece a barra inferior de ações. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
