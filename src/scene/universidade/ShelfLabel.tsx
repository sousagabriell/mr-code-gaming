import { Html } from '@react-three/drei';
import { etiquetaAnchor, type Prateleira } from '../../world/universidade';
import { labelsPortalTarget } from '../labelsPortal';

/**
 * Etiqueta de um nível da estante: o código do projeto, na ponta esquerda da prancha. É ela que
 * transforma a estante num índice — sem ela, a cor da lombada não diz de que projeto é o artigo.
 *
 * **Sem `transform`**, pela mesma razão do calendário da agência (§9.9): colar o DOM no plano do
 * móvel borra o texto e quebra o teste de acerto. Ancorado e de frente, o `distanceFactor` ainda
 * encolhe a etiqueta junto com o zoom, que é o que a prende à cena.
 */
export function ShelfLabel({ prateleira }: { prateleira: Prateleira }) {
  const total = prateleira.total;
  return (
    <Html
      position={etiquetaAnchor(prateleira.nivel)}
      center
      distanceFactor={4.2}
      portal={labelsPortalTarget}
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <span
        aria-hidden
        title={`${prateleira.etiqueta} · ${total} artigo${total === 1 ? '' : 's'}`}
        className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-0.5 pr-2 text-[10px] font-semibold text-ink-2 shadow-[0_3px_10px_rgb(30_41_90/0.16)]"
      >
        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: prateleira.cor }}>
          {prateleira.codigo}
        </span>
        {total}
      </span>
    </Html>
  );
}
