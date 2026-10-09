import type { CameraControlsImpl } from '@react-three/drei';
import { create } from 'zustand';
import { isInteriorKind, type InteriorKind } from '../world/interiors';
import { useBankStore } from './bankStore';
import { useWikiStore } from './wikiStore';

export type LandmarkKind = 'datacenter' | 'banco' | 'universidade' | 'prefeitura' | 'escritorio';
/** A ordem alimenta o seletor de distrito e o modo lista — o novo entra no fim. */
export const LANDMARK_KINDS: LandmarkKind[] = ['datacenter', 'banco', 'universidade', 'prefeitura', 'escritorio'];

/**
 * Cenários internos de landmark (agência do BC, biblioteca da UN) — ver `world/interiors.ts`. É
 * **um campo** em vez de uma flag por cenário porque todos se excluem entre si (e com o `yard`):
 * com flags separadas, cada `enter*` teria de zerar as outras e o terceiro cenário multiplicaria o
 * erro.
 */
export type { InteriorKind };

export type EntityRef =
  | { kind: 'cliente'; id: number }
  | { kind: 'projeto'; id: number }
  | { kind: 'chamado'; id: number }
  | { kind: 'fatura'; id: number }
  | { kind: 'colaborador'; id: number }
  /** Só existe dentro do pátio (`yard`). */
  | { kind: 'atividade'; id: number }
  | { kind: LandmarkKind };

export type DrawerState =
  | { form: 'novo-cliente' }
  | { form: 'editar-cliente'; idCliente: number }
  | { form: 'novo-projeto'; idCliente?: number }
  | { form: 'novo-chamado'; idCliente?: number }
  | { form: 'nova-atividade'; idProjeto: number; idColuna?: number }
  | { form: 'editar-atividade'; idProjeto: number; idAtividade: number }
  | { form: 'nova-coluna'; idProjeto: number }
  | { form: 'editar-coluna'; idProjeto: number; idColuna: number }
  // Fatura e despesa não entram aqui: os formulários do financeiro são telas do próprio extrato
  // da agência (§10.3) — um drawer lateral cairia em cima dele.
  | { form: 'converter-chamado'; idChamado: number }
  | { form: 'nova-meta' }
  | { form: 'editar-meta'; id: string };

interface UiState {
  selected: EntityRef | null;
  /** Incrementa a cada seleção para a câmera voar mesmo ao re-selecionar a mesma entidade. */
  focusNonce: number;
  select: (entity: EntityRef) => void;
  clearSelection: () => void;

  controls: CameraControlsImpl | null;
  setControls: (controls: CameraControlsImpl | null) => void;

  /** Câmera acompanhando a entidade selecionada enquanto ela se move (caminhão, colaborador). */
  follow: boolean;
  setFollow: (on: boolean) => void;

  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  buildMode: boolean;
  setBuildMode: (on: boolean) => void;

  drawer: DrawerState | null;
  openDrawer: (drawer: DrawerState) => void;
  closeDrawer: () => void;

  /** Projeto cujo pátio de obras (Kanban) está aberto; null = cidade. */
  yard: number | null;
  enterYard: (idProjeto: number, then?: EntityRef) => void;
  /** focusProject=false volta sem selecionar o canteiro (ex.: ir para a visão geral). */
  exitYard: (focusProject?: boolean) => void;

  /**
   * Interior de landmark aberto (agência do BC, biblioteca da UN) — ou null na cidade. **Excludente**
   * com o `yard`: entrar num fecha o outro.
   */
  interior: InteriorKind | null;
  enterInterior: (kind: InteriorKind) => void;
  /** selectLandmark=false volta sem selecionar a sede (ex.: ir para a visão geral). */
  exitInterior: (selectLandmark?: boolean) => void;

  /** Uma caixa do pátio está segurando o ponteiro (do pointerdown ao pointerup) — câmera travada. */
  dragging: boolean;
  setDragging: (on: boolean) => void;
}

// ─── Seleção ↔ URL (?sel=cliente:3) para links diretos e recarregar sem perder o foco ───

function parseSel(value: string | null): EntityRef | null {
  if (!value) return null;
  const [kind, rawId] = value.split(':');
  if ((LANDMARK_KINDS as string[]).includes(kind)) return { kind: kind as LandmarkKind };
  const id = Number(rawId);
  if (!Number.isInteger(id)) return null;
  if (
    kind === 'cliente' ||
    kind === 'projeto' ||
    kind === 'chamado' ||
    kind === 'fatura' ||
    kind === 'colaborador' ||
    kind === 'atividade'
  ) {
    return { kind, id };
  }
  return null;
}

export function entityKey(entity: EntityRef): string {
  return 'id' in entity ? `${entity.kind}:${entity.id}` : entity.kind;
}

function writeUrl(param: 'sel' | 'yard' | 'interior', value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(param, value);
  else url.searchParams.delete(param);
  window.history.replaceState(null, '', url);
}

const writeSelToUrl = (entity: EntityRef | null) => writeUrl('sel', entity ? entityKey(entity) : null);

function readUrl(param: 'sel' | 'yard' | 'interior'): string | null {
  if (typeof window === 'undefined') return null;
  return new URL(window.location.href).searchParams.get(param);
}

function readYardFromUrl(): number | null {
  const id = Number(readUrl('yard'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** `?interior=banco` abre direto no cenário — mas o pátio tem precedência se a URL trouxer os dois. */
function readInteriorFromUrl(): InteriorKind | null {
  if (readYardFromUrl() !== null) return null;
  const value = readUrl('interior');
  return isInteriorKind(value) ? value : null;
}

/** Cada cenário interno tem um painel com estado próprio; sair zera o painel de onde se saiu. */
function limparPainelDoInterior(kind: InteriorKind) {
  if (kind === 'banco') useBankStore.getState().limpar();
  else useWikiStore.getState().limpar();
}

function readSelFromUrl(): EntityRef | null {
  const sel = parseSel(readUrl('sel'));
  // Atividade só faz sentido dentro de um pátio.
  if (sel?.kind === 'atividade' && !readYardFromUrl()) return null;
  return sel;
}

export const useUiStore = create<UiState>((set) => ({
  selected: readSelFromUrl(),
  focusNonce: 0,
  select: (entity) => {
    // Selecionar algo da cidade (busca, notificação, distrito) estando num cenário interno = voltar.
    const { yard, interior } = useUiStore.getState();
    const leaveYard = yard !== null && entity.kind !== 'atividade';
    if (leaveYard) writeUrl('yard', null);
    if (interior) {
      writeUrl('interior', null);
      limparPainelDoInterior(interior);
    }
    writeSelToUrl(entity);
    set((s) => ({
      selected: entity,
      focusNonce: s.focusNonce + 1,
      buildMode: false,
      // Colaborador só faz sentido acompanhando o pedestre; o resto começa parado.
      follow: entity.kind === 'colaborador',
      ...(leaveYard || interior ? { drawer: null } : {}),
      ...(leaveYard ? { yard: null } : {}),
      ...(interior ? { interior: null } : {}),
    }));
  },
  clearSelection: () => {
    writeSelToUrl(null);
    set({ selected: null, follow: false });
  },

  controls: null,
  setControls: (controls) => set({ controls }),

  follow: false,
  setFollow: (on) => set({ follow: on }),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  buildMode: false,
  setBuildMode: (on) => set({ buildMode: on }),

  drawer: null,
  openDrawer: (drawer) => set({ drawer }),
  closeDrawer: () => set({ drawer: null }),

  yard: readYardFromUrl(),
  enterYard: (idProjeto, then) => {
    writeUrl('yard', String(idProjeto));
    writeUrl('interior', null);
    writeSelToUrl(then ?? null);
    set((s) => ({
      yard: idProjeto,
      interior: null,
      selected: then ?? null,
      focusNonce: s.focusNonce + 1,
      buildMode: false,
      drawer: null,
    }));
  },
  exitYard: (focusProject = true) => {
    const { yard } = useUiStore.getState();
    writeUrl('yard', null);
    // Volta para a cidade focando o canteiro do projeto de onde saiu.
    const back: EntityRef | null = yard && focusProject ? { kind: 'projeto', id: yard } : null;
    writeSelToUrl(back);
    set((s) => ({ yard: null, selected: back, focusNonce: s.focusNonce + 1, drawer: null }));
  },

  interior: readInteriorFromUrl(),
  enterInterior: (kind) => {
    writeUrl('interior', kind);
    writeUrl('yard', null);
    // Dentro do cenário não há entidade selecionada: o painel do interior ocupa a coluna da direita.
    writeSelToUrl(null);
    set((s) => ({ interior: kind, yard: null, selected: null, focusNonce: s.focusNonce + 1, buildMode: false, drawer: null }));
  },
  exitInterior: (selectLandmark = true) => {
    const { interior } = useUiStore.getState();
    writeUrl('interior', null);
    // Volta para a cidade com a sede de onde saiu selecionada.
    const back: EntityRef | null = interior && selectLandmark ? { kind: interior } : null;
    writeSelToUrl(back);
    // O painel recomeça limpo na próxima visita (mês corrente / nenhum livro aberto).
    if (interior) limparPainelDoInterior(interior);
    set((s) => ({ interior: null, selected: back, focusNonce: s.focusNonce + 1, drawer: null }));
  },

  dragging: false,
  setDragging: (on) => set({ dragging: on }),
}));

// Só em dev: permite inspecionar/dirigir o estado da HUD pelos testes de navegador (Playwright).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __ui: typeof useUiStore }).__ui = useUiStore;
}
