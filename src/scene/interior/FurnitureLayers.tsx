import { Suspense, useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { Box3 } from 'three';
import type { InteriorPiece } from '../../world/interior';
import type { Vec3 } from '../../world/layout';
import { furnitureModel } from '../assets';
import { useKenneyParts } from '../kenney';

/**
 * Mobília dos interiores (agência do BC, biblioteca da UN) a partir do "Furniture Kit" da Kenney.
 *
 * Os modelos entram **em escala natural** (sem `size`): o kit já é desenhado numa grade de 1×1, e
 * normalizar peça a peça deixaria a lixeira do tamanho do sofá. Os modelos também não têm textura —
 * a cor vem do nome do material, e repintar é o que faz a sala combinar com a maquete clara em vez
 * de parecer uma casa de madeira.
 */
export type ColorOverrides = Record<string, Record<string, string>>;

/**
 * Uma `<Instances>` por primitiva do modelo — o mesmo desenho do bosque em `Outskirts`.
 *
 * Os GLB do kit têm a origem num canto (o ladrilho ocupa 0..1 em x e -1..0 em z) e alguns descem
 * abaixo do zero. O deslocamento calculado aqui recentra a peça em x/z e a apoia no chão, para que
 * os módulos de `world/` possam ser lidos como planta baixa em vez de uma lista de offsets.
 */
function PieceLayer({
  kind,
  items,
  colors,
}: {
  kind: string;
  items: InteriorPiece[];
  colors?: Record<string, string>;
}) {
  const parts = useKenneyParts(furnitureModel(kind), { colors });

  const offset = useMemo<Vec3>(() => {
    const caixa = new Box3();
    for (const { geometry } of parts) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) caixa.union(geometry.boundingBox);
    }
    if (caixa.isEmpty()) return [0, 0, 0];
    return [-(caixa.min.x + caixa.max.x) / 2, -caixa.min.y, -(caixa.min.z + caixa.max.z) / 2];
  }, [parts]);

  if (items.length === 0) return null;
  return (
    <>
      {parts.map(({ geometry, material }, i) => (
        <Instances key={i} limit={items.length} geometry={geometry} material={material} castShadow receiveShadow>
          {items.map((p, j) => (
            // O giro é do grupo: o deslocamento interno acompanha a rotação, como deve.
            <group key={j} position={p.position} rotation={[0, p.rotationY, 0]}>
              <Instance position={offset} />
            </group>
          ))}
        </Instances>
      ))}
    </>
  );
}

/** Agrupa por modelo para que cada um carregue e instancie uma vez só. */
export function FurnitureLayers({ pieces, colors }: { pieces: InteriorPiece[]; colors?: ColorOverrides }) {
  const porKind = useMemo(() => {
    const mapa = new Map<string, InteriorPiece[]>();
    for (const peca of pieces) {
      const lista = mapa.get(peca.kind);
      if (lista) lista.push(peca);
      else mapa.set(peca.kind, [peca]);
    }
    return [...mapa.entries()];
  }, [pieces]);

  return (
    <>
      {/* Cada modelo tem sua própria fronteira: um download novo não esconde o resto da sala. */}
      {porKind.map(([kind, items]) => (
        <Suspense key={kind} fallback={null}>
          <PieceLayer kind={kind} items={items} colors={colors?.[kind]} />
        </Suspense>
      ))}
    </>
  );
}
