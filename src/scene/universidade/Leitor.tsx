import { Suspense, useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BookOpen } from 'lucide-react';
import type { Group } from 'three';
import { useCityEvents, type CityEvent } from '../../store/cityEvents';
import { useWikiStore } from '../../store/wikiStore';
import { pathLength, pointAt, type Path } from '../../world/routes';
import {
  caminhoAteAEstante,
  ESTANTE,
  LEITOR_ALTURA,
  LEITOR_CADEIRA,
  LIVRO_NA_MESA,
  type Livro,
} from '../../world/universidade';
import { characterModel } from '../assets';
import { labelsPortalTarget } from '../labelsPortal';
import { CharacterModel, type CharacterAnimation } from '../people/CharacterModel';

/**
 * O leitor da biblioteca: senta à mesa lendo, e **a cada artigo aberto** levanta, vai até a estante
 * buscar aquela lombada e volta com ela. É a única coisa viva da sala, e serve de confirmação — o
 * clique numa lombada ou numa linha do índice vira movimento, não só troca de painel.
 *
 * Nada aqui vem do backend. A viagem é disparada pelo `wikiStore`, e o "memorizei" pelo botão de
 * copiar, através da fila de `cityEvents` (a mesma da cidade e da agência).
 *
 * **Não é montado com movimento reduzido** — mesma regra dos pedestres da cidade. Por isso o copiar
 * também solta um toast: a confirmação não pode depender de uma animação que pode não existir.
 */

/** Um leitor fixo: é "a pessoa que trabalha ali", não um transeunte sorteado. */
const MODELO = characterModel('character-female-c');

/** Velocidade a pé, em unidades por segundo. A sala é pequena; correr ficaria cômico. */
const VELOCIDADE = 0.85;
/** Quanto ele demora de frente para a prateleira, pegando o livro. */
const TEMPO_PEGANDO = 1.1;

/** Quanto dura a comemoração do "memorizei". */
const TEMPO_EMOTE = 1.6;

type Fase = 'lendo' | 'indo' | 'pegando' | 'voltando' | 'comemorando';

const ANIMACAO: Record<Fase, CharacterAnimation> = {
  lendo: 'sit',
  indo: 'walk',
  pegando: 'pick-up',
  voltando: 'walk',
  comemorando: 'emote-yes',
};

/** Lombada genérica, para quando o artigo aberto não está na estante (filtrado pela busca). */
const COR_PADRAO = '#8c97ad';

/** O livro: a mesma caixinha das lombadas, na mão dele ou pousada na mesa. */
function Livrinho({ cor, aberto }: { cor: string; aberto: boolean }) {
  return (
    <mesh castShadow rotation={aberto ? [-0.35, 0, 0] : [0, 0, 0]}>
      <boxGeometry args={aberto ? [0.17, 0.015, 0.13] : [0.045, 0.16, 0.12]} />
      <meshStandardMaterial color={cor} roughness={0.72} />
    </mesh>
  );
}

/**
 * Balão de "memorizei", preso ao boneco. É `<Html>` ancorado (sem `transform`) pela mesma razão do
 * calendário da agência: colado no plano 3D o texto borra e o quadro perde a legibilidade.
 */
function BalaoMemorizou({ event }: { event: Extract<CityEvent, { kind: 'wiki-memo' }> }) {
  const remove = useCityEvents((s) => s.remove);
  useEffect(() => {
    const id = setTimeout(() => remove(event.id), 2600);
    return () => clearTimeout(id);
  }, [event.id, remove]);

  return (
    <Html position={[0, LEITOR_ALTURA + 0.22, 0]} center distanceFactor={4.2} portal={labelsPortalTarget} zIndexRange={[10, 0]}>
      <div
        aria-hidden
        className="levelup-pop flex w-[220px] items-center gap-2 rounded-2xl bg-white/95 py-1.5 pl-1.5 pr-3 text-left shadow-[0_6px_18px_rgb(30_41_90/0.2)]"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
          <BookOpen className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-ok">Memorizei</span>
          {/* Duas linhas no máximo: título longo não pode esticar o balão até fora do quadro. */}
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-ink">{event.titulo}</span>
        </span>
      </div>
    </Html>
  );
}

export function Leitor({ livros }: { livros: Livro[] }) {
  const ref = useRef<Group>(null);
  const aberto = useWikiStore((s) => s.aberto);
  const memo = useCityEvents((s) => s.events).find((e) => e.kind === 'wiki-memo');

  // Fase e trajeto vivem em refs: mudam a cada quadro e não devem re-renderizar a cena.
  const fase = useRef<Fase>('lendo');
  const rota = useRef<{ path: Path; total: number } | null>(null);
  const andou = useRef(0);
  const relogio = useRef(0);
  /** Último "memorizei" já comemorado — o evento fica na fila alguns segundos. */
  const memoVisto = useRef<string | null>(null);
  /** Começa em null para ele já sair buscando quando se entra na sala com um artigo aberto. */
  const abertoVisto = useRef<number | null>(null);

  // Estado de verdade só para o que o React precisa desenhar: a animação e o livro na mão.
  const [anim, setAnim] = useState<CharacterAnimation>('sit');
  const [naMao, setNaMao] = useState(false);
  const [cor, setCor] = useState(COR_PADRAO);

  const entrarEm = (proxima: Fase) => {
    fase.current = proxima;
    setAnim(ANIMACAO[proxima]);
  };

  /**
   * Os dois gatilhos — artigo aberto e "memorizei" — são lidos **dentro do `useFrame`**, comparando
   * com o que já foi visto, em vez de em `useEffect`. São degraus da própria máquina de estados: num
   * efeito, cada um viraria uma cascata de `setState`. E o `useFrame` é re-registrado a cada render,
   * então a closure sempre enxerga o `livros` mais recente sem precisar de lista de dependências —
   * o que importa porque a busca refaz `livros` a cada tecla digitada.
   */
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const r = rota.current;

    // Trocou de artigo: levanta e vai buscar aquela lombada.
    if (aberto !== null && aberto !== abertoVisto.current) {
      abertoVisto.current = aberto;
      const livro = livros.find((l) => l.idPagina === aberto);
      const path = caminhoAteAEstante(livro?.position[0] ?? ESTANTE.x);
      rota.current = { path, total: pathLength(path) };
      andou.current = 0;
      setCor(livro?.cor ?? COR_PADRAO);
      setNaMao(false);
      entrarEm('indo');
      return;
    }

    /**
     * Copiou o artigo: ele comemora. **Só sentado** — interromper a ida à estante no meio deixaria o
     * boneco deslizando pelo chão em pose de comemoração.
     */
    if (memo && memo.id !== memoVisto.current && fase.current === 'lendo') {
      memoVisto.current = memo.id;
      relogio.current = TEMPO_EMOTE;
      entrarEm('comemorando');
      return;
    }

    switch (fase.current) {
      case 'lendo':
        return;
      case 'comemorando':
        relogio.current -= delta;
        if (relogio.current <= 0) entrarEm('lendo');
        return;
      case 'indo':
        if (!r) return;
        andou.current += VELOCIDADE * delta;
        if (andou.current >= r.total) {
          andou.current = r.total;
          relogio.current = TEMPO_PEGANDO;
          entrarEm('pegando');
        }
        break;
      case 'pegando':
        relogio.current -= delta;
        if (relogio.current <= 0) {
          setNaMao(true);
          entrarEm('voltando');
        }
        break;
      case 'voltando':
        if (!r) return;
        andou.current -= VELOCIDADE * delta;
        if (andou.current <= 0) {
          andou.current = 0;
          setNaMao(false);
          entrarEm('lendo');
        }
        break;
    }

    if (!r) return;
    const { position, heading } = pointAt(r.path, andou.current);
    g.position.set(position[0], 0, position[2]);
    // A anotação derrota o estreitamento do `switch`: `fase` é um ref e pode ter mudado lá dentro.
    const atual: Fase = fase.current;
    // O boneco da Kenney olha para +z, então `heading` já é a rotação; voltando, ele anda de frente.
    if (atual === 'indo') g.rotation.y = heading;
    else if (atual === 'voltando') g.rotation.y = heading + Math.PI;
    // Parado na estante, de frente para ela; sentado, de frente para a câmera.
    else if (atual === 'pegando') g.rotation.y = Math.PI;
    else g.rotation.y = 0;
  });

  /**
   * Enquanto lê, o livro fica aberto na mesa; na volta, fechado na mão. Deriva de `anim` (estado do
   * React), e não de `fase` (ref mutado no `useFrame`): ref lido no render não dispara redesenho.
   */
  const lendo = anim === 'sit' || anim === 'emote-yes';

  return (
    <>
      {/* O nome é a alça pela qual os testes de navegador acham o boneco no grafo da cena. */}
      <group ref={ref} name="leitor" position={LEITOR_CADEIRA}>
        <Suspense fallback={null}>
          <CharacterModel url={MODELO} animation={anim} height={LEITOR_ALTURA} />
        </Suspense>
        {/* Na mão, à frente do peito — some ao sentar, quando o livro vai para a mesa. */}
        {naMao && (
          <group position={[0, LEITOR_ALTURA * 0.55, 0.16]}>
            <Livrinho cor={cor} aberto={false} />
          </group>
        )}
        {memo && <BalaoMemorizou event={memo} />}
      </group>
      {lendo && (
        <group position={LIVRO_NA_MESA} rotation={[0, 0.12, 0]}>
          <Livrinho cor={cor} aberto />
        </group>
      )}
    </>
  );
}
