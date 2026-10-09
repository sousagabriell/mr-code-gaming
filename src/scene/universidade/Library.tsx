import { useMemo } from 'react';
import { useWorld } from '../../hooks/useWorld';
import { COLORS } from '../../world/colors';
import {
  buildUniLayout,
  filtrarPaginas,
  livros,
  prateleiras,
  type EstanteParte,
} from '../../world/universidade';
import { useWikiStore } from '../../store/wikiStore';
import { FurnitureLayers, type ColorOverrides } from '../interior/FurnitureLayers';
import { RoomShell } from '../interior/RoomShell';
import { Slab } from '../interior/Slab';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Bookshelf } from './Bookshelf';
import { Leitor } from './Leitor';
import { ShelfLabel } from './ShelfLabel';

/**
 * Biblioteca da Universidade: o cenário que se abre no "entrar na biblioteca". A estante **é** a
 * navegação — uma prateleira por projeto, um livro por artigo da wiki, e o detalhe no painel da
 * direita. Medidas em `world/universidade.ts`, casca da sala em `scene/interior/`.
 */

// O mesmo piso e as mesmas madeiras da agência: os dois interiores são do mesmo prédio.
const CHAO = { wood: '#e9e3d6', woodDark: '#d6cdbb' };
const MADEIRA = { wood: '#e4d8c3', woodDark: '#c3b093' };
const MESA = { wood: '#f1ece1', woodDark: '#cdbfa6', metal: COLORS.neutral };
/**
 * O azul e o marrom crus do kit gritam contra a maquete clara — vão para a paleta do tema. Cada
 * modelo nomeia o estofado à sua maneira (`carpet` na poltrona, `carpetBlue` na cadeira).
 */
const POLTRONA = { carpet: '#9fb4e8', wood: '#cdbfa6' };
const CADEIRA = { carpetBlue: '#9fb4e8', metal: COLORS.neutral };
const TAPETE = { carpet: '#d4dcee', carpetDarker: '#b7c3de' };

const CORES: ColorOverrides = {
  floorFull: CHAO,
  bookcaseOpen: MADEIRA,
  bookcaseClosedWide: MADEIRA,
  desk: MESA,
  tableCoffee: MESA,
  rugRectangle: TAPETE,
  loungeChair: POLTRONA,
  chairModernCushion: CADEIRA,
};

/** Madeira da estante funcional: o fundo mais escuro é o que faz as lombadas saltarem. */
const COR_ESTANTE: Record<EstanteParte, string> = {
  lateral: '#cdbfa6',
  tampo: '#d8cbb4',
  prancha: '#d8cbb4',
  fundo: '#a9977c',
};

export function Library() {
  const layout = useMemo(() => buildUniLayout(), []);
  const { wikiPaginas, projetos } = useWorld();
  const busca = useWikiStore((s) => s.busca);
  const reduzido = useReducedMotion();

  // A busca filtra a **estante**: o livro que não casa sai da prateleira.
  const estante = useMemo(
    () => prateleiras(filtrarPaginas(wikiPaginas, busca), projetos),
    [wikiPaginas, projetos, busca]
  );
  const lombadas = useMemo(() => livros(estante), [estante]);
  const pecas = useMemo(() => [...layout.floor, ...layout.furniture], [layout]);

  return (
    <group>
      <RoomShell walls={layout.walls} baseboards={layout.baseboards} />
      {layout.estante.map((p, i) => (
        <Slab key={i} position={p.position} size={p.size} color={COR_ESTANTE[p.parte]} />
      ))}
      <FurnitureLayers pieces={pecas} colors={CORES} />
      <Bookshelf livros={lombadas} />
      {/* Movimento reduzido: sem leitor, como a cidade fica sem pedestres. */}
      {!reduzido && <Leitor livros={lombadas} />}
      {estante.map((p) => (
        <ShelfLabel key={String(p.id)} prateleira={p} />
      ))}
    </group>
  );
}
