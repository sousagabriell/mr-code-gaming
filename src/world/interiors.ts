import { BANK_BOUNDS, BANK_CAMERA } from './bank';
import type { InteriorBounds } from './interior';
import type { Vec3 } from './layout';
import { UNI_BOUNDS, UNI_CAMERA } from './universidade';

/**
 * Registro dos cenários internos de landmark. Existe para que `uiStore`, `CameraRig` e `camera.ts`
 * não repitam um `if (banco) … else if (universidade) …` cada um à sua maneira: somar um cenário é
 * somar uma linha em cada tabela daqui.
 *
 * O tipo nasce neste módulo (e não no `uiStore`) para `world/` continuar sem depender do estado.
 */
export type InteriorKind = 'banco' | 'universidade';
export const INTERIOR_KINDS: InteriorKind[] = ['banco', 'universidade'];

export const isInteriorKind = (value: string | null | undefined): value is InteriorKind =>
  (INTERIOR_KINDS as string[]).includes(value ?? '');

/** Enquadramento de entrada e "casa" (tecla H) de cada cenário. */
export const INTERIOR_CAMERA: Record<InteriorKind, { position: Vec3; target: Vec3 }> = {
  banco: BANK_CAMERA,
  universidade: UNI_CAMERA,
};

/** Limite do pan. Fixo: as salas não mudam de tamanho com os dados. */
export const INTERIOR_BOUNDS: Record<InteriorKind, InteriorBounds> = {
  banco: BANK_BOUNDS,
  universidade: UNI_BOUNDS,
};
