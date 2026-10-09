import { useMemo } from 'react';
import { useWorld } from '../../hooks/useWorld';
import { buildBankLayout, type BankPieceKind } from '../../world/bank';
import { COLORS } from '../../world/colors';
import { FurnitureLayers, type ColorOverrides } from '../interior/FurnitureLayers';
import { RoomShell } from '../interior/RoomShell';
import { BankEvents } from './BankEvents';
import { useBankEventDetector } from './useBankEventDetector';
import { WallCalendar } from './WallCalendar';

/**
 * Agência do Banco Central: o cenário que se abre no "ver conta bancária". O único clicável aqui
 * dentro é o calendário de parede; o extrato mora na HUD. As medidas vêm de `world/bank.ts` e a
 * casca da sala de `scene/interior/`.
 */

const CHAO = { wood: '#e9e3d6', woodDark: '#d6cdbb' };
const COFRE = { metalLight: '#9aa4b8', metalMedium: '#6b768c' };
const BALCAO = { wood: '#f1ece1', woodDark: '#cdbfa6', metal: COLORS.neutral };

// Referências estáveis: entram nas dependências do memo de `useKenneyParts`.
const CORES: Record<BankPieceKind | string, Record<string, string>> = {
  floorFull: CHAO,
  kitchenBar: BALCAO,
  kitchenBarEnd: BALCAO,
  kitchenFridgeLarge: COFRE,
} satisfies ColorOverrides;

export function BankBranch() {
  const layout = useMemo(() => buildBankLayout(), []);
  const { faturas, despesas, isLoading } = useWorld();
  useBankEventDetector(faturas, despesas, !isLoading);

  const pecas = useMemo(() => [...layout.floor, ...layout.furniture], [layout]);

  return (
    <group>
      <RoomShell walls={layout.walls} baseboards={layout.baseboards} />
      <FurnitureLayers pieces={pecas} colors={CORES} />
      <WallCalendar />
      <BankEvents />
    </group>
  );
}
