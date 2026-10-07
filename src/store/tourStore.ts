import { create } from 'zustand';

const key = (userId: number) => `mrcode-city:tour:${userId}`;

export function tourDone(userId: number): boolean {
  try {
    return localStorage.getItem(key(userId)) === 'done';
  } catch {
    return true; // sem armazenamento, não insiste no tour a cada visita
  }
}

export function markTourDone(userId: number) {
  try {
    localStorage.setItem(key(userId), 'done');
  } catch {
    // ignora
  }
}

/** Passo atual do tour guiado (null = fechado). */
export const useTourStore = create<{ step: number | null; start: () => void; go: (step: number | null) => void }>((set) => ({
  step: null,
  start: () => set({ step: 0 }),
  go: (step) => set({ step }),
}));
