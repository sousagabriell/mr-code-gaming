import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { COLORS } from '../world/colors';
import type { CityBounds } from '../world/layout';
import { outskirtsPlan, type Scatter } from '../world/outskirts';
import { natureModel, type NatureModel } from './assets';
import { useKenneyParts } from './kenney';

/**
 * Campo em volta da cidade: pinheiros, arbustos e relevo do kit "3D Road Tiles", espalhados de forma
 * determinística fora da grade de ruas. As cores vêm da paleta do tema — o verde original do kit é um
 * oliva saturado que destoaria da maquete clara do miolo.
 */

/** Verde do tema por nome de material do GLB (os modelos não têm textura, só cor de material). */
const NATURE_COLORS = {
  Grass: COLORS.tree,
  Alternate_Dirt: COLORS.trunk,
} as const;
const SIZE: Record<NatureModel, { size: number; fit?: 'height' | 'footprint' }> = {
  pine: { size: 1.15, fit: 'height' },
  bush: { size: 0.55, fit: 'height' },
};

/** Uma `<Instances>` por primitiva — o pinheiro da Kenney vem com copa e tronco separados. */
function NatureLayer({ model, items }: { model: NatureModel; items: Scatter[] }) {
  const parts = useKenneyParts(natureModel(model), { ...SIZE[model], colors: NATURE_COLORS });
  if (items.length === 0) return null;
  return (
    <>
      {parts.map(({ geometry, material }, i) => (
        <Instances key={i} limit={items.length} geometry={geometry} material={material} castShadow receiveShadow>
          {items.map((s, j) => (
            <Instance key={j} position={s.position} rotation={[0, s.rotationY, 0]} scale={s.scale} />
          ))}
        </Instances>
      ))}
    </>
  );
}

export function Outskirts({ bounds }: { bounds: CityBounds }) {
  const plan = useMemo(() => outskirtsPlan(bounds), [bounds]);

  return (
    <group>
      <NatureLayer model="pine" items={plan.pines} />
      <NatureLayer model="bush" items={plan.bushes} />
    </group>
  );
}
