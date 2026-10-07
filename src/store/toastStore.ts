import { create } from 'zustand';

export type ToastTone = 'ok' | 'bad' | 'info' | 'xp';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }));
    setTimeout(() => get().dismiss(id), toast.tone === 'bad' ? 6000 : 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  ok: (title: string, detail?: string) => useToastStore.getState().push({ tone: 'ok', title, detail }),
  bad: (title: string, detail?: string) => useToastStore.getState().push({ tone: 'bad', title, detail }),
  info: (title: string, detail?: string) => useToastStore.getState().push({ tone: 'info', title, detail }),
  xp: (title: string, detail?: string) => useToastStore.getState().push({ tone: 'xp', title, detail }),
};
