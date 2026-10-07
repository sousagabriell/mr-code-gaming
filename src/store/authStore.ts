import { create } from 'zustand';
import { http } from '../lib/http';
import type { LoginDTO, LoginResultDTO, UsuarioAdminDTO } from '../types/api';

const TOKEN_KEY = 'mrcode_token';
const USUARIO_KEY = 'mrcode_usuario';

function restoreUsuario(): UsuarioAdminDTO | null {
  try {
    const stored = localStorage.getItem(USUARIO_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  usuario: UsuarioAdminDTO | null;
  isLoading: boolean;
  error: string | null;
  login: (dto: LoginDTO) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  usuario: restoreUsuario(),
  isLoading: false,
  error: null,

  login: async (dto) => {
    set({ isLoading: true, error: null });
    try {
      const result = await http.post<LoginResultDTO>('/Login', dto);
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USUARIO_KEY, JSON.stringify(result.usuario));
      set({ token: result.token, usuario: result.usuario, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Email ou senha inválidos' });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    set({ token: null, usuario: null });
  },
}));
