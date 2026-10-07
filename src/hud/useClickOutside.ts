import { useEffect, type RefObject } from 'react';

export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handle(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOutside();
    }
    document.addEventListener('pointerdown', handle);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handle);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, onOutside, active]);
}
