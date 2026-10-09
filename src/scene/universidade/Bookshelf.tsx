import { useEffect, useState } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { useWikiStore } from '../../store/wikiStore';
import type { Vec3 } from '../../world/layout';
import { ESTANTE, ESTANTE_ALTURA, tonalizar, type Livro } from '../../world/universidade';
import { SceneTag } from '../SceneTag';

/**
 * As lombadas da estante — os únicos objetos clicáveis da biblioteca.
 *
 * Tudo numa `<Instances>` com uma caixa unitária: são até uma centena de livros, e um `<mesh>` por
 * livro custaria uma centena de draw calls. O `<Instance>` do drei faz o raycast por instância, o
 * que mantém o clique e o hover por livro; a cor e o tamanho vêm por instância.
 */

/** Livro em foco: puxado para frente da prateleira e clareado, como um livro meio tirado da estante. */
const PUXADO = 0.055;
const ABERTO_SOBE = 0.025;

/** Onde a etiqueta espera, invisível, enquanto nenhum livro está em foco. */
const REPOUSO: Vec3 = [ESTANTE.x, ESTANTE_ALTURA + 0.2, 0];

function BookSpine({
  livro,
  aberto,
  sobHover,
  onAbrir,
  onHover,
}: {
  livro: Livro;
  aberto: boolean;
  sobHover: boolean;
  onAbrir: (idPagina: number) => void;
  onHover: (idPagina: number | null) => void;
}) {
  const [px, py, pz] = livro.position;
  const puxado = aberto || sobHover;
  return (
    <Instance
      position={[px, py + (aberto ? ABERTO_SOBE : 0), pz + (puxado ? PUXADO : 0)]}
      scale={livro.size}
      color={aberto ? tonalizar(livro.cor, 0.42) : sobHover ? tonalizar(livro.cor, 0.2) : livro.cor}
      onClick={(e) => {
        e.stopPropagation();
        onAbrir(livro.idPagina);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(livro.idPagina);
      }}
      onPointerOut={() => onHover(null)}
    />
  );
}

/** Enquanto o ponteiro está sobre uma lombada, o cursor é a mãozinha (como no resto da cidade). */
function useCursorDeMao(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [ativo]);
}

export function Bookshelf({ livros }: { livros: Livro[] }) {
  const aberto = useWikiStore((s) => s.aberto);
  const abrir = useWikiStore((s) => s.abrir);
  const [hover, setHover] = useState<number | null>(null);
  useCursorDeMao(hover !== null);

  // Um livro apagado da wiki sai da estante: o foco guardado simplesmente não encontra nada.
  const emFoco = livros.find((l) => l.idPagina === (hover ?? aberto));
  const alvo: Vec3 = emFoco
    ? [emFoco.position[0], emFoco.position[1] + emFoco.size[1] / 2 + 0.12, emFoco.position[2] + PUXADO]
    : REPOUSO;

  return (
    <>
      {/* limit nunca zero: a `Instances` reserva o buffer de matrizes no primeiro render. */}
      <Instances limit={Math.max(1, livros.length)} castShadow receiveShadow frames={Infinity}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.72} />
        {livros.map((l) => (
          <BookSpine
            key={l.idPagina}
            livro={l}
            aberto={l.idPagina === aberto}
            sobHover={l.idPagina === hover}
            onAbrir={abrir}
            onHover={setHover}
          />
        ))}
      </Instances>
      {/* Uma etiqueta só, que acompanha o livro em foco — montar/desmontar `<Html>` por hover pisca. */}
      <SceneTag
        position={alvo}
        code="WK"
        text={emFoco?.titulo}
        accent={emFoco?.cor ?? '#134ced'}
        visible={!!emFoco}
      />
    </>
  );
}
