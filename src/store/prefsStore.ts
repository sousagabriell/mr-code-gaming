import { create } from 'zustand';

export type ViewMode = '3d' | 'lista';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // armazenamento indisponível: a preferência vale só nesta sessão
  }
}

/** Sem WebGL (máquina antiga, política corporativa, leitor de tela em VM) o modo lista é o único possível. */
export const webglAvailable: boolean = (() => {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
})();

interface PrefsState {
  /** '3d' = cidade; 'lista' = mesma informação em 2D, navegável por teclado e leitor de tela. */
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Força movimento reduzido mesmo se o sistema não pedir. */
  reduceMotion: boolean;
  toggleReduceMotion: () => void;
  /** Placas com o nome de cada construção (totens na cidade 3D). */
  showSigns: boolean;
  toggleShowSigns: () => void;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  viewMode: !webglAvailable ? 'lista' : read('mrcode-city:view') === 'lista' ? 'lista' : '3d',
  setViewMode: (viewMode) => {
    if (viewMode === '3d' && !webglAvailable) return;
    write('mrcode-city:view', viewMode);
    set({ viewMode });
  },
  reduceMotion: read('mrcode-city:reduce-motion') === 'on',
  toggleReduceMotion: () => {
    const reduceMotion = !get().reduceMotion;
    write('mrcode-city:reduce-motion', reduceMotion ? 'on' : 'off');
    set({ reduceMotion });
  },
  showSigns: read('mrcode-city:signs') !== 'off',
  toggleShowSigns: () => {
    const showSigns = !get().showSigns;
    write('mrcode-city:signs', showSigns ? 'on' : 'off');
    set({ showSigns });
  },
}));
