import { create } from 'zustand';

/**
 * Estado do escritório do cliente (`interior === 'sede'`). Mora fora do painel pela mesma razão do
 * `wikiStore`: duas superfícies leem os mesmos valores — a **sala 3D** (a placa na parede é de quem
 * é o escritório) e o painel da direita (que projeto está em foco).
 *
 * Quem abre e fecha é o `uiStore` (`enterSede`, `exitInterior`): o id do cliente também vive na URL
 * (`?interior=sede:3`), e o `uiStore` é o dono da URL.
 */
interface SedeState {
  /** Cliente dono do escritório aberto; null fora dele. */
  idCliente: number | null;
  /** Projeto pedido para o painel; null = o padrão de `projetoEmFoco`. */
  idProjeto: number | null;
  abrir: (idCliente: number, idProjeto?: number | null) => void;
  focarProjeto: (idProjeto: number) => void;
  /**
   * Volta um degrau dentro do painel. O escritório ainda é uma tela só (leitura), então não há
   * degrau: devolve false e o `Esc` sai direto do cenário.
   */
  voltar: () => boolean;
  /** Fecha tudo — usado ao sair do cenário. */
  limpar: () => void;
}

export const useSedeStore = create<SedeState>((set) => ({
  idCliente: null,
  idProjeto: null,
  abrir: (idCliente, idProjeto = null) => set({ idCliente, idProjeto }),
  focarProjeto: (idProjeto) => set({ idProjeto }),
  voltar: () => false,
  limpar: () => set({ idCliente: null, idProjeto: null }),
}));
