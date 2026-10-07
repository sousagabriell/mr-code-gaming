import { create } from 'zustand';
import type { Vec3 } from '../world/layout';
import type { Path } from '../world/routes';

/** Animações passageiras disparadas por mudanças nos dados (não existem no backend). */
export type CityEvent =
  | { id: string; kind: 'truck-leave'; from: Vec3; origem: string }
  | { id: string; kind: 'armored'; path: Path };

interface CityEventsState {
  /** Vira true depois da primeira carga — antes disso nada "chega" nem "parte", só aparece. */
  ready: boolean;
  setReady: () => void;
  events: CityEvent[];
  push: (event: CityEvent) => void;
  remove: (id: string) => void;
}

export const useCityEvents = create<CityEventsState>((set) => ({
  ready: false,
  setReady: () => set({ ready: true }),
  events: [],
  push: (event) => set((s) => ({ events: [...s.events.filter((e) => e.id !== event.id), event] })),
  remove: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
}));
