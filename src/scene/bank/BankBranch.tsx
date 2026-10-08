import { Suspense, useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { buildBankLayout, type BankPiece, type BankPieceKind } from '../../world/bank';
import { COLORS } from '../../world/colors';
import { furnitureModel } from '../assets';
import { useKenneyParts } from '../kenney';

/**
 * Agência do Banco Central: o cenário que se abre no "ver conta bancária". É cenário — não há nada
 * clicável aqui dentro; o extrato mora na HUD. As medidas vêm de `world/bank.ts`.
 *
 * Os modelos entram **em escala natural** (sem `size`): o kit de móveis já é desenhado numa grade de
 * 1×1, e normalizar peça a peça deixaria a lixeira do tamanho do sofá.
 */

/**
 * Os modelos do kit não têm textura — a cor vem do nome do material. Repintar é o que faz a sala
 * combinar com a maquete clara em vez de parecer uma casa de madeira. Referências estáveis: entram
 * nas dependências do memo de `useKenneyParts`.
 */
const CHAO = { wood: '#e9e3d6', woodDark: '#d6cdbb' } as const;
const PAREDE = { wood: COLORS.wall, _defaultMat: COLORS.glass, metalDark: COLORS.wallShade } as const;
const COFRE = { metalLight: '#9aa4b8', metalMedium: '#6b768c' } as const;
const BALCAO = { wood: '#f1ece1', woodDark: '#cdbfa6', metal: COLORS.neutral } as const;

const COLORS_BY_KIND: Partial<Record<BankPieceKind, Record<string, string>>> = {
  floorFull: CHAO,
  wall: PAREDE,
  wallWindow: PAREDE,
  wallDoorway: PAREDE,
  kitchenBar: BALCAO,
  kitchenBarEnd: BALCAO,
  kitchenFridgeLarge: COFRE,
};

/** Uma `<Instances>` por primitiva do modelo — o mesmo desenho do bosque em `Outskirts`. */
function PieceLayer({ kind, items }: { kind: BankPieceKind; items: BankPiece[] }) {
  const parts = useKenneyParts(furnitureModel(kind), { colors: COLORS_BY_KIND[kind] });
  if (items.length === 0) return null;
  return (
    <>
      {parts.map(({ geometry, material }, i) => (
        <Instances key={i} limit={items.length} geometry={geometry} material={material} castShadow receiveShadow>
          {items.map((p, j) => (
            <Instance key={j} position={p.position} rotation={[0, p.rotationY, 0]} />
          ))}
        </Instances>
      ))}
    </>
  );
}

export function BankBranch() {
  const layout = useMemo(() => buildBankLayout(), []);

  // Agrupa por modelo para que cada um carregue e instancie uma vez só.
  const porKind = useMemo(() => {
    const mapa = new Map<BankPieceKind, BankPiece[]>();
    for (const peca of [...layout.floor, ...layout.walls, ...layout.furniture]) {
      const lista = mapa.get(peca.kind);
      if (lista) lista.push(peca);
      else mapa.set(peca.kind, [peca]);
    }
    return [...mapa.entries()];
  }, [layout]);

  return (
    <group>
      {/* Cada modelo tem sua própria fronteira: um download novo não esconde o resto da sala. */}
      {porKind.map(([kind, items]) => (
        <Suspense key={kind} fallback={null}>
          <PieceLayer kind={kind} items={items} />
        </Suspense>
      ))}
    </group>
  );
}
