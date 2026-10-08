import type { CameraControlsImpl } from '@react-three/drei';
import { create } from 'zustand';

export type LandmarkKind = 'datacenter' | 'banco' | 'universidade' | 'prefeitura';
export const LANDMARK_KINDS: LandmarkKind[] = ['datacenter', 'banco', 'universidade', 'prefeitura'];

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
  | { form: 'converter-chamado'; idChamado: number }
  | { form: 'nova-fatura' }
  | { form: 'editar-fatura'; idFatura: number }
  | { form: 'nova-despesa' }
  | { form: 'editar-despesa'; idDespesa: number };

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
   * Agência do Banco Central aberta (o extrato). É o terceiro cenário, ao lado da cidade e do
   * pátio — e **excludente** com o `yard`: entrar num fecha o outro.
   */
  banco: boolean;
  enterBanco: () => void;
  /** selectBanco=false volta sem selecionar o landmark (ex.: ir para a visão geral). */
  exitBanco: (selectBanco?: boolean) => void;

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

function writeUrl(param: 'sel' | 'yard' | 'banco', value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(param, value);
  else url.searchParams.delete(param);
  window.history.replaceState(null, '', url);
}

const writeSelToUrl = (entity: EntityRef | null) => writeUrl('sel', entity ? entityKey(entity) : null);

function readUrl(param: 'sel' | 'yard' | 'banco'): string | null {
  if (typeof window === 'undefined') return null;
  return new URL(window.location.href).searchParams.get(param);
}

function readYardFromUrl(): number | null {
  const id = Number(readUrl('yard'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** `?banco=1` abre direto na agência — mas o pátio tem precedência se a URL trouxer os dois. */
function readBancoFromUrl(): boolean {
  return readUrl('banco') === '1' && readYardFromUrl() === null;
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
    const { yard, banco } = useUiStore.getState();
    const leaveYard = yard !== null && entity.kind !== 'atividade';
    if (leaveYard) writeUrl('yard', null);
    if (banco) writeUrl('banco', null);
    writeSelToUrl(entity);
    set((s) => ({
      selected: entity,
      focusNonce: s.focusNonce + 1,
      buildMode: false,
      // Colaborador só faz sentido acompanhando o pedestre; o resto começa parado.
      follow: entity.kind === 'colaborador',
      ...(leaveYard || banco ? { drawer: null } : {}),
      ...(leaveYard ? { yard: null } : {}),
      ...(banco ? { banco: false } : {}),
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
    writeUrl('banco', null);
    writeSelToUrl(then ?? null);
    set((s) => ({
      yard: idProjeto,
      banco: false,
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

  banco: readBancoFromUrl(),
  enterBanco: () => {
    writeUrl('banco', '1');
    writeUrl('yard', null);
    // Dentro da agência não há entidade selecionada: o painel do extrato ocupa a coluna da direita.
    writeSelToUrl(null);
    set((s) => ({ banco: true, yard: null, selected: null, focusNonce: s.focusNonce + 1, buildMode: false, drawer: null }));
  },
  exitBanco: (selectBanco = true) => {
    writeUrl('banco', null);
    const back: EntityRef | null = selectBanco ? { kind: 'banco' } : null;
    writeSelToUrl(back);
    set((s) => ({ banco: false, selected: back, focusNonce: s.focusNonce + 1, drawer: null }));
  },

  dragging: false,
  setDragging: (on) => set({ dragging: on }),
}));

// Só em dev: permite inspecionar/dirigir o estado da HUD pelos testes de navegador (Playwright).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __ui: typeof useUiStore }).__ui = useUiStore;
}
