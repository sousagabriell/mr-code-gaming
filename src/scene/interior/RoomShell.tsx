import { COLORS } from '../../world/colors';
import type { Slab as SlabData } from '../../world/interior';
import { Slab } from './Slab';

/**
 * Paredes e rodapé dos interiores. Uma cor só, sem textura e sem emenda (ver `wallSlabs` em
 * `world/interior.ts`). Mais escura que `COLORS.wall` de propósito — no branco da página a parede
 * sumiria contra o céu.
 */
const COR_PAREDE = COLORS.wallShade;
const COR_RODAPE = '#b9c3d8';

export function RoomShell({ walls, baseboards }: { walls: SlabData[]; baseboards: SlabData[] }) {
  return (
    <>
      {walls.map((p, i) => (
        <Slab key={`p${i}`} position={p.position} size={p.size} color={COR_PAREDE} />
      ))}
      {baseboards.map((p, i) => (
        <Slab key={`r${i}`} position={p.position} size={p.size} color={COR_RODAPE} />
      ))}
    </>
  );
}
