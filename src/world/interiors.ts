import { BANK_BOUNDS, BANK_CAMERA } from './bank';
import type { InteriorBounds } from './interior';
import type { Vec3 } from './layout';
import { SEDE_BOUNDS, SEDE_CAMERA } from './sede';
import { UNI_BOUNDS, UNI_CAMERA } from './universidade';

/**
 * Registro dos cenários internos. Existe para que `uiStore`, `CameraRig` e `camera.ts` não repitam
 * um `if (banco) … else if (universidade) …` cada um à sua maneira: somar um cenário é somar uma
 * linha em cada tabela daqui.
 *
 * O tipo nasce neste módulo (e não no `uiStore`) para `world/` continuar sem depender do estado.
 *
 * `sede` é o **escritório do cliente** — o único interior que não é de landmark: existe um por
 * cliente, então ele carrega o id de quem é (ver `lerInterior`).
 */
export type InteriorKind = 'banco' | 'universidade' | 'sede';
export const INTERIOR_KINDS: InteriorKind[] = ['banco', 'universidade', 'sede'];

/** Enquadramento de entrada e "casa" (tecla H) de cada cenário. */
export const INTERIOR_CAMERA: Record<InteriorKind, { position: Vec3; target: Vec3 }> = {
  banco: BANK_CAMERA,
  universidade: UNI_CAMERA,
  sede: SEDE_CAMERA,
};

/** Limite do pan. Fixo: as salas não mudam de tamanho com os dados. */
export const INTERIOR_BOUNDS: Record<InteriorKind, InteriorBounds> = {
  banco: BANK_BOUNDS,
  universidade: UNI_BOUNDS,
  sede: SEDE_BOUNDS,
};

/** O interior aberto como a URL o guarda. `idCliente` só existe no escritório do cliente. */
export interface InteriorAberto {
  kind: InteriorKind;
  idCliente: number | null;
}

/**
 * Lê o `?interior=` — `banco`, `universidade` ou `sede:<idCliente>`. O escritório sem id (ou com id
 * inválido) não abre: uma sala sem dono não tem o que mostrar no painel.
 */
export function lerInterior(value: string | null | undefined): InteriorAberto | null {
  if (!value) return null;
  const [kind, rawId] = value.split(':');
  if (kind === 'sede') {
    const id = Number(rawId);
    return Number.isInteger(id) && id > 0 ? { kind, idCliente: id } : null;
  }
  if (rawId !== undefined) return null;
  return kind === 'banco' || kind === 'universidade' ? { kind, idCliente: null } : null;
}

/** O inverso de `lerInterior`: o valor que vai para o `?interior=`. */
export function interiorParam(kind: InteriorKind, idCliente: number | null = null): string {
  return kind === 'sede' ? `sede:${idCliente}` : kind;
}
