import { create } from 'zustand';
import type { CarModel } from '../scene/assets';
import type { Vec3 } from '../world/layout';
import type { Path } from '../world/routes';

/**
 * Animações passageiras disparadas por mudanças nos dados (não existem no backend). A fila é uma só
 * para os dois cenários — cada um renderiza os tipos que conhece e ignora o resto.
 */
export type CityEvent =
  // Cidade
  | { id: string; kind: 'truck-leave'; from: Vec3; vehicle: CarModel }
  | { id: string; kind: 'armored'; path: Path }
  // Agência: malote entrando (recebimento) ou saindo (pagamento), e o pisca-pisca do caixa
  | { id: string; kind: 'malote'; sentido: 'entra' | 'sai' }
  | { id: string; kind: 'extrato-ping' }
  // Biblioteca: o leitor "memorizou" o artigo que acabou de ser copiado
  | { id: string; kind: 'wiki-memo'; titulo: string };

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
