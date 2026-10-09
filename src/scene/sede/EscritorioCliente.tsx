import { useMemo } from 'react';
import { useWorld } from '../../hooks/useWorld';
import { useSedeStore } from '../../store/sedeStore';
import { COLORS } from '../../world/colors';
import { buildSedeLayout } from '../../world/sede';
import { clienteCode, clienteNome } from '../../world/status';
import { FurnitureLayers, type ColorOverrides } from '../interior/FurnitureLayers';
import { RoomShell } from '../interior/RoomShell';
import { PlacaDoCliente } from './PlacaDoCliente';

/**
 * Escritório do cliente: o cenário que se abre ao entrar na sede dele. Por enquanto é só cenário —
 * o projeto (detalhes, acesso de produção, links, marcos, equipe) mora todo no painel da direita.
 * Medidas em `world/sede.ts`, casca da sala em `scene/interior/`.
 */

/**
 * Madeira um tom mais quente que a da agência e da biblioteca (aquelas duas são o mesmo prédio
 * público; esta é a sede de uma empresa). O cinza frio foi testado e descartado: colava na parede
 * e a sala virava um bloco só.
 */
const CHAO = { wood: '#e6dccb' };
const MESA = { wood: '#f1ece1', metal: COLORS.neutral };
const MADEIRA = { wood: '#e4d8c3' };
/** O azul cru do kit grita contra a maquete clara: o estofado vai para o azul suave do tema. */
const ESTOFADO = '#9fb4e8';

// Referências estáveis: entram nas dependências do memo de `useKenneyParts`.
const CORES: ColorOverrides = {
  floorFull: CHAO,
  desk: MESA,
  tableCoffee: MESA,
  bookcaseClosedWide: MADEIRA,
  coatRackStanding: { wood: '#cdbfa6' },
  chairDesk: { carpet: ESTOFADO, metalMedium: '#7c879c' },
  chairModernCushion: { carpetBlue: ESTOFADO, metal: COLORS.neutral },
  loungeChair: { carpet: ESTOFADO, wood: '#cdbfa6' },
  loungeSofa: { carpet: '#b9c6e6', wood: '#cdbfa6' },
  rugRectangle: { carpet: '#d4dcee', carpetDarker: '#b7c3de' },
};

export function EscritorioCliente() {
  const layout = useMemo(() => buildSedeLayout(), []);
  const pecas = useMemo(() => [...layout.floor, ...layout.furniture], [layout]);
  const idCliente = useSedeStore((s) => s.idCliente);
  const { clientes } = useWorld();
  const cliente = clientes.find((c) => c.idCliente === idCliente);

  return (
    <group>
      <RoomShell walls={layout.walls} baseboards={layout.baseboards} />
      <FurnitureLayers pieces={pecas} colors={CORES} />
      {cliente && (
        <PlacaDoCliente
          code={clienteCode(cliente.idCliente)}
          name={clienteNome(cliente)}
          // Cliente inativo apaga a placa, como apaga a sede na cidade.
          accent={cliente.status === 'Ativo' ? COLORS.brandBlue : COLORS.neutral}
        />
      )}
    </group>
  );
}
