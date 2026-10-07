import { create } from 'zustand';

export type GameTab = 'missoes' | 'conquistas' | 'ranking' | 'cidade' | 'saude';

interface Persisted {
  achievements: string[];
  level: number;
  xp: number;
}

const key = (userId: number) => `mrcode-city:game:${userId}`;

/** Progresso salvo por usuário neste navegador (conquistas não "somem" se a condição deixar de valer). */
export function loadProgress(userId: number): Persisted | null {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export function saveProgress(userId: number, p: Persisted) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(p));
  } catch {
    // Armazenamento indisponível (aba anônima, cota): o jogo funciona, só não lembra entre sessões.
  }
}

function loadSound(): boolean {
  try {
    return localStorage.getItem('mrcode-city:sound') === 'on';
  } catch {
    return false;
  }
}

interface GameUiState {
  panelOpen: boolean;
  tab: GameTab;
  openPanel: (tab?: GameTab) => void;
  closePanel: () => void;

  unlocked: string[];
  setUnlocked: (keys: string[]) => void;

  celebration: { level: number; unlock: string | null; offline: boolean } | null;
  celebrate: (c: { level: number; unlock: string | null; offline: boolean }) => void;
  dismissCelebration: () => void;

  sound: boolean;
  toggleSound: () => void;
}

export const useGameStore = create<GameUiState>((set, get) => ({
  panelOpen: false,
  tab: 'missoes',
  openPanel: (tab) => set((s) => ({ panelOpen: true, tab: tab ?? s.tab })),
  closePanel: () => set({ panelOpen: false }),

  unlocked: [],
  setUnlocked: (keys) => set({ unlocked: keys }),

  celebration: null,
  celebrate: (c) => set({ celebration: c }),
  dismissCelebration: () => set({ celebration: null }),

  sound: loadSound(),
  toggleSound: () => {
    const sound = !get().sound;
    try {
      localStorage.setItem('mrcode-city:sound', sound ? 'on' : 'off');
    } catch {
      // ignora
    }
    set({ sound });
  },
}));

// Só em dev: permite aos testes de navegador abrir o painel em cada aba.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __game: typeof useGameStore }).__game = useGameStore;
}
