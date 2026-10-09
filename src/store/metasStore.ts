import { create } from 'zustand';
import type { Cumpridas, Meta, RascunhoMeta } from '../world/metas';

/**
 * Metas da Prefeitura, guardadas **no navegador, por usuário**. O backend não tem tabela de
 * gamificação (ver MANUAL §17) — é a mesma limitação das conquistas e do tour.
 *
 * **Chave separada da `mrcode-city:game:<id>`** de propósito: aquela é reescrita a cada tique
 * assentado do jogo, com estado derivado dos dados. Meta é conteúdo que o usuário escreveu, e não
 * pode ir embora junto com um cálculo.
 */
const chave = (idUsuario: number) => `mrcode-city:metas:${idUsuario}`;

interface Guardado {
  metas: Meta[];
  cumpridas: Cumpridas;
}

const VAZIO: Guardado = { metas: [], cumpridas: {} };

function ler(idUsuario: number): Guardado {
  try {
    const raw = localStorage.getItem(chave(idUsuario));
    if (!raw) return VAZIO;
    const dado = JSON.parse(raw) as Partial<Guardado>;
    return { metas: dado.metas ?? [], cumpridas: dado.cumpridas ?? {} };
  } catch {
    return VAZIO;
  }
}

/** Devolve false quando o navegador recusa guardar (aba anônima, cota) — a HUD avisa o usuário. */
function gravar(idUsuario: number, dado: Guardado): boolean {
  try {
    localStorage.setItem(chave(idUsuario), JSON.stringify(dado));
    return true;
  } catch {
    return false;
  }
}

interface MetasState {
  /** Usuário carregado; null antes do login. */
  idUsuario: number | null;
  metas: Meta[];
  cumpridas: Cumpridas;
  /** O navegador recusou guardar — o painel mostra o aviso em vez de fingir que salvou. */
  semArmazenamento: boolean;

  carregar: (idUsuario: number) => void;
  criar: (rascunho: RascunhoMeta) => void;
  atualizar: (id: string, rascunho: RascunhoMeta) => void;
  /** Apaga a meta **e** o registro: desfazer uma meta batida devolve o XP dela. */
  remover: (id: string) => void;
  /** Registra o pagamento. Uma vez registrada, a meta fica cumprida mesmo se o dado mudar. */
  registrarCumprida: (meta: Meta, em: string) => void;
}

const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const useMetasStore = create<MetasState>((set, get) => {
  /** Toda escrita passa por aqui: grava e reflete no estado, inclusive o aviso de armazenamento. */
  const persistir = (metas: Meta[], cumpridas: Cumpridas) => {
    const { idUsuario } = get();
    const ok = idUsuario === null ? false : gravar(idUsuario, { metas, cumpridas });
    set({ metas, cumpridas, semArmazenamento: !ok });
  };

  return {
    idUsuario: null,
    metas: [],
    cumpridas: {},
    semArmazenamento: false,

    carregar: (idUsuario) => {
      if (get().idUsuario === idUsuario) return;
      const { metas, cumpridas } = ler(idUsuario);
      set({ idUsuario, metas, cumpridas, semArmazenamento: false });
    },

    criar: (rascunho) => {
      const meta: Meta = { ...rascunho, id: novoId(), criadaEm: new Date().toISOString() };
      persistir([...get().metas, meta], get().cumpridas);
    },

    atualizar: (id, rascunho) => {
      persistir(
        get().metas.map((m) => (m.id === id ? { ...m, ...rascunho } : m)),
        get().cumpridas
      );
    },

    remover: (id) => {
      const { [id]: _removida, ...resto } = get().cumpridas;
      persistir(
        get().metas.filter((m) => m.id !== id),
        resto
      );
    },

    registrarCumprida: (meta, em) => {
      if (get().cumpridas[meta.id]) return;
      persistir(get().metas, {
        ...get().cumpridas,
        [meta.id]: { em, xp: meta.recompensa, titulo: meta.titulo },
      });
    },
  };
});

// Só em dev: permite aos testes de navegador semear e inspecionar as metas.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __metas: typeof useMetasStore }).__metas = useMetasStore;
}
