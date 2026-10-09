import {
  backZ,
  baseboardSlabs as baseboardSlabsDa,
  colX,
  floorTiles,
  interiorCamera,
  roomBounds,
  roomDepth,
  roomWidth,
  rowZ,
  WALL_H,
  wallSlabs as wallSlabsDa,
  type InteriorBounds,
  type InteriorPiece,
  type Sala,
  type Slab,
} from './interior';
import type { Vec3 } from './layout';
import type { Path } from './routes';
import { projetoCode } from './status';
import type { ProjetoDTO, WikiPaginaDTO } from '../types/domain';

/**
 * Biblioteca da Universidade: o cenário que se abre no "entrar na biblioteca". A casca da sala vem
 * de `interior.ts` (a mesma da agência do BC); o que é só daqui é a **estante**, e a estante é a
 * navegação — uma prateleira por projeto, cada artigo da wiki uma lombada clicável.
 *
 * A estante funcional **não** vem do kit da Kenney. Os `bookcase*` têm as prateleiras internas numa
 * altura fixa do modelo, e aqui a divisão depende do dado (um nível por projeto, com etiqueta): ela
 * é montada com caixas, como as paredes. O kit mobilia o resto da sala.
 *
 * Tudo aqui é puro e testado em `universidade.test.ts`.
 */

/**
 * Sala menor que a da agência (7×4): aqui o assunto é a estante, e cada fila de chão a mais só
 * acrescenta bege vazio no rodapé do quadro.
 */
export const COLS = 6;
export const ROWS = 3;
const SALA: Sala = { cols: COLS, rows: ROWS };

export const ROOM_W = roomWidth(SALA);
export const ROOM_D = roomDepth(SALA);
export const UNI_BOUNDS = roomBounds(SALA);

const x = (col: number) => colX(SALA, col);
const z = (row: number) => rowZ(SALA, row);
const FUNDO_Z = backZ(SALA);

export const floorPieces = () => floorTiles(SALA);
export const wallSlabs = () => wallSlabsDa(SALA);
export const baseboardSlabs = () => baseboardSlabsDa(SALA);

// ─── A estante ──────────────────────────────────────────────────────────────

/**
 * Medidas da estante, encostada na parede do fundo e na **metade esquerda** da sala: o painel do
 * artigo cobre a direita da tela, então é de lá que a câmera olha.
 */
export const ESTANTE = {
  /** Centro no eixo x. */
  x: x(1.4),
  largura: 1.9,
  profundidade: 0.3,
  /** Altura livre de cada prateleira. */
  vao: 0.3,
  /** Altura do pé: a prateleira mais baixa não encosta no chão. */
  base: 0.22,
  /** Espessura das pranchas, das laterais e do fundo. */
  espessura: 0.04,
} as const;

/** Quantos níveis a estante tem. Fixos: o móvel é o móvel, prateleira sem artigo fica vazia. */
export const MAX_PRATELEIRAS = 5;
/** Teto de lombadas por nível — além do limite físico da prancha. */
export const MAX_POR_PRATELEIRA = 14;

/** Altura do tampo: a estante inteira tem que caber abaixo do topo da parede. */
export const ESTANTE_ALTURA = ESTANTE.base + MAX_PRATELEIRAS * ESTANTE.vao + ESTANTE.espessura / 2;

/** Centro da estante no eixo z — a face do fundo encosta na parede. */
const ESTANTE_Z = FUNDO_Z + ESTANTE.profundidade / 2;

/** Folga nas pontas da prancha e entre lombadas. */
const INSET = 0.04;
const GAP = 0.022;

const LIVRO_PROF = 0.18;
/** As lombadas ficam na frente da prateleira, como numa estante de verdade. */
const LIVRO_Z = FUNDO_Z + ESTANTE.profundidade - 0.03 - LIVRO_PROF / 2;

/** Altura da prancha do nível `nivel` (0 = a de cima). */
export function alturaDaPrateleira(nivel: number): number {
  return ESTANTE.base + (MAX_PRATELEIRAS - 1 - nivel) * ESTANTE.vao;
}

/** Qual parte da estante a caixa é — a cena pinta o fundo mais escuro, para as lombadas saltarem. */
export type EstanteParte = 'lateral' | 'fundo' | 'prancha' | 'tampo';

export interface EstantePeca extends Slab {
  parte: EstanteParte;
}

/** Carcaça da estante: laterais, fundo, as pranchas e o tampo. Caixas lisas, como as paredes. */
export function estanteSlabs(): EstantePeca[] {
  const { largura, profundidade, espessura } = ESTANTE;
  const alturaTotal = ESTANTE_ALTURA + espessura / 2;
  const vaoLargura = largura - 2 * espessura;

  const pecas: EstantePeca[] = [
    {
      parte: 'lateral',
      position: [ESTANTE.x - (largura - espessura) / 2, alturaTotal / 2, ESTANTE_Z],
      size: [espessura, alturaTotal, profundidade],
    },
    {
      parte: 'lateral',
      position: [ESTANTE.x + (largura - espessura) / 2, alturaTotal / 2, ESTANTE_Z],
      size: [espessura, alturaTotal, profundidade],
    },
    {
      parte: 'fundo',
      position: [ESTANTE.x, alturaTotal / 2, FUNDO_Z + espessura / 2],
      size: [vaoLargura, alturaTotal, espessura],
    },
    {
      parte: 'tampo',
      position: [ESTANTE.x, alturaTotal - espessura / 2, ESTANTE_Z],
      size: [largura, espessura, profundidade],
    },
  ];
  for (let nivel = 0; nivel < MAX_PRATELEIRAS; nivel++) {
    pecas.push({
      parte: 'prancha',
      position: [ESTANTE.x, alturaDaPrateleira(nivel), ESTANTE_Z],
      size: [vaoLargura, espessura, profundidade],
    });
  }
  return pecas;
}

// ─── Agrupamento dos artigos ────────────────────────────────────────────────

/**
 * Cores das prateleiras. Estáveis por projeto (índice pelo id, não pela ordem da lista): a estante
 * não pode trocar de cor a cada refetch do "Live".
 */
const PALETA = ['#134ced', '#5e4ced', '#0d9488', '#f5a623', '#d9486f', '#2f80ed'];
const COR_GERAL = '#8c97ad';

export const corDoProjeto = (idProjeto: number | null): string =>
  idProjeto === null ? COR_GERAL : PALETA[Math.abs(idProjeto) % PALETA.length];

/**
 * Mistura `hex` com branco (t > 0) ou preto (t < 0) — dá variação de tom às lombadas da mesma
 * prateleira sem inventar cores fora da paleta.
 */
export function tonalizar(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const alvo = t >= 0 ? 255 : 0;
  const canal = (deslocamento: number) => {
    const c = (n >> deslocamento) & 0xff;
    return Math.round(c + (alvo - c) * Math.abs(t));
  };
  return `#${[canal(16), canal(8), canal(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Lombada mais grossa = título mais longo. Dá relevo à estante sem depender do corpo do artigo.
 *
 * O piso é generoso de propósito: lombada fina demais some na distância da câmera, e o alvo de
 * clique tem que ter tamanho de alvo de clique.
 */
export const LIVRO_MIN = 0.085;
export const LIVRO_MAX = 0.14;

export function larguraDoLivro(titulo: string): number {
  return Math.min(LIVRO_MAX, LIVRO_MIN + titulo.length * 0.0013);
}

/** Altura da lombada: três variações estáveis, para a fileira não virar um bloco só. */
const alturaDoLivro = (idPagina: number) => 0.21 + (Math.abs(idPagina) % 3) * 0.018;

export type PrateleiraId = number | 'geral' | 'outros';

export interface Prateleira {
  /** Id do projeto, `'geral'` (artigos sem projeto) ou `'outros'` (o resto que não caberia). */
  id: PrateleiraId;
  /** Código curto da etiqueta: `UN`, `PR-04`, `+`. */
  codigo: string;
  etiqueta: string;
  cor: string;
  /** 0 = a prateleira de cima. */
  nivel: number;
  /** Os que couberam na prancha — viram lombada na cena. Em ordem de título. */
  paginas: WikiPaginaDTO[];
  /**
   * O grupo **inteiro**, em ordem de título. A prancha tem tamanho fixo, mas o índice do painel não:
   * é por `todas` que ele lista também o que não coube (e é a única rota por teclado, §10.4).
   */
  todas: WikiPaginaDTO[];
  /** Quantos de `todas` ficaram fora da prancha. */
  ocultos: number;
  total: number;
}

export interface Livro {
  idPagina: number;
  titulo: string;
  /** Centro da lombada, apoiada na prancha. */
  position: Vec3;
  /** [espessura, altura, profundidade] */
  size: [number, number, number];
  cor: string;
  prateleira: PrateleiraId;
}

/** Busca por título — a mesma do `wiki-list` do portal, sem olhar o corpo do artigo. */
export function filtrarPaginas(paginas: WikiPaginaDTO[], busca: string): WikiPaginaDTO[] {
  const termo = busca.trim().toLowerCase();
  if (!termo) return paginas;
  return paginas.filter((p) => p.titulo.toLowerCase().includes(termo));
}

/** Quantas lombadas desta fila cabem numa prancha — o limite é físico, não só de contagem. */
function quantosCabem(paginas: WikiPaginaDTO[]): number {
  const disponivel = ESTANTE.largura - 2 * ESTANTE.espessura - 2 * INSET;
  let usado = 0;
  let n = 0;
  for (const p of paginas) {
    if (n >= MAX_POR_PRATELEIRA) break;
    const w = larguraDoLivro(p.titulo);
    if (usado + w > disponivel) break;
    usado += w + GAP;
    n++;
  }
  return n;
}

const porTitulo = (a: WikiPaginaDTO, b: WikiPaginaDTO) => a.titulo.localeCompare(b.titulo, 'pt-BR');
const maisRecentePrimeiro = (a: WikiPaginaDTO, b: WikiPaginaDTO) => b.dataAtualizacao.localeCompare(a.dataAtualizacao);

/**
 * Uma prateleira por projeto **com artigo**, mais a "Geral" no topo. Projeto sem artigo não ganha
 * nível, e passando de `MAX_PRATELEIRAS` o resto cai numa prateleira "Outros" — a estante tem
 * tamanho fixo, mas nenhum artigo desaparece da contagem.
 */
export function prateleiras(
  paginas: WikiPaginaDTO[],
  projetos: Pick<ProjetoDTO, 'idProjeto' | 'nome'>[]
): Prateleira[] {
  const porProjeto = new Map<number, WikiPaginaDTO[]>();
  const gerais: WikiPaginaDTO[] = [];
  for (const p of paginas) {
    if (p.idProjeto === null) gerais.push(p);
    else {
      const lista = porProjeto.get(p.idProjeto);
      if (lista) lista.push(p);
      else porProjeto.set(p.idProjeto, [p]);
    }
  }

  interface Grupo {
    id: PrateleiraId;
    codigo: string;
    etiqueta: string;
    cor: string;
    paginas: WikiPaginaDTO[];
  }
  const grupos: Grupo[] = [];
  if (gerais.length > 0) {
    grupos.push({ id: 'geral', codigo: 'UN', etiqueta: 'Geral', cor: corDoProjeto(null), paginas: gerais });
  }
  for (const idProjeto of [...porProjeto.keys()].sort((a, b) => a - b)) {
    grupos.push({
      id: idProjeto,
      codigo: projetoCode(idProjeto),
      etiqueta: projetos.find((p) => p.idProjeto === idProjeto)?.nome ?? 'Projeto',
      cor: corDoProjeto(idProjeto),
      paginas: porProjeto.get(idProjeto)!,
    });
  }

  // Mais grupos que níveis: o excedente vira uma prateleira só.
  if (grupos.length > MAX_PRATELEIRAS) {
    const sobra = grupos.splice(MAX_PRATELEIRAS - 1);
    grupos.push({
      id: 'outros',
      codigo: '+',
      etiqueta: `Outros ${sobra.length} projetos`,
      cor: COR_GERAL,
      paginas: sobra.flatMap((g) => g.paginas),
    });
  }

  return grupos.map((g, nivel) => {
    // Quando não cabe tudo, ficam os atualizados mais recentemente; a prancha exibe em ordem de título.
    const candidatos = [...g.paginas].sort(maisRecentePrimeiro);
    const cabem = quantosCabem(candidatos);
    return {
      id: g.id,
      codigo: g.codigo,
      etiqueta: g.etiqueta,
      cor: g.cor,
      nivel,
      paginas: candidatos.slice(0, cabem).sort(porTitulo),
      todas: [...g.paginas].sort(porTitulo),
      ocultos: g.paginas.length - cabem,
      total: g.paginas.length,
    };
  });
}

/**
 * Lombadas enfileiradas em cada prancha, apoiadas nela e **centradas**. Encostar à esquerda seria o
 * natural numa estante de verdade, mas com poucos artigos a fila vira um amontoado num canto e o
 * resto da prancha fica vazio; centrada, a estante lê bem desde o primeiro artigo.
 */
export function livros(lista: Prateleira[]): Livro[] {
  const out: Livro[] = [];
  for (const p of lista) {
    const base = alturaDaPrateleira(p.nivel) + ESTANTE.espessura / 2;
    const fila = p.paginas.reduce((s, x) => s + larguraDoLivro(x.titulo), 0) + GAP * Math.max(0, p.paginas.length - 1);
    const esquerda = ESTANTE.x - fila / 2;
    let cursor = 0;
    for (const pagina of p.paginas) {
      const w = larguraDoLivro(pagina.titulo);
      const h = alturaDoLivro(pagina.idPagina);
      out.push({
        idPagina: pagina.idPagina,
        titulo: pagina.titulo,
        position: [esquerda + cursor + w / 2, base + h / 2, LIVRO_Z],
        size: [w, h, LIVRO_PROF],
        cor: tonalizar(p.cor, [-0.2, 0, 0.16, 0.3][Math.abs(pagina.idPagina) % 4]),
        prateleira: p.id,
      });
      cursor += w + GAP;
    }
  }
  return out;
}

/** Onde pendurar a etiqueta do nível: na ponta esquerda da prancha, na frente da estante. */
export function etiquetaAnchor(nivel: number): Vec3 {
  return [
    ESTANTE.x - ESTANTE.largura / 2 - 0.02,
    alturaDaPrateleira(nivel) + ESTANTE.vao / 2,
    FUNDO_Z + ESTANTE.profundidade + 0.04,
  ];
}

// ─── Mobília do resto da sala ───────────────────────────────────────────────

// ─── O leitor ───────────────────────────────────────────────────────────────

/**
 * O personagem entra na **escala do kit de móveis**, não na da cidade — lá os bonecos têm 0,42 porque
 * os prédios são enormes; aqui uma cadeira tem 0,46.
 *
 * O valor saiu de uma escada renderizada (0,92 · 0,78 · 0,66 · 0,56), não de conta: o boneco da
 * Kenney é chibi, com a cabeça valendo ~40% da altura, então a altura "realista" (~0,9) deixa a
 * cabeça do tamanho da mesa.
 */
export const LEITOR_ALTURA = 0.66;

/** Onde ele senta — a cadeira fica no mesmo ponto, e ele de frente para a câmera (+z). */
export const LEITOR_CADEIRA: Vec3 = [x(2.9), 0, z(1.15)];
/** Mesa de leitura, logo à frente dele. */
const MESA: Vec3 = [x(2.9), 0, z(1.78)];
/** Livro pousado na mesa enquanto ele lê. */
export const LIVRO_NA_MESA: Vec3 = [x(2.9), 0.4, z(1.65)];

/** Corredor por onde ele caminha entre a mesa e a estante, sem atravessar móvel. */
const CORREDOR_Z = z(0.95);
/** Um passo à frente da estante: perto o bastante para alcançar a prancha, sem entrar nela. */
const POSTO_Z = FUNDO_Z + ESTANTE.profundidade + 0.28;

/** Onde ele para para pegar o livro que está em `xDoLivro`, sem sair da frente da estante. */
export function postoNaEstante(xDoLivro: number): Vec3 {
  const limite = ESTANTE.largura / 2 - 0.2;
  const px = Math.min(Math.max(xDoLivro, ESTANTE.x - limite), ESTANTE.x + limite);
  return [px, 0, POSTO_Z];
}

/**
 * Caminho da cadeira até a lombada: sai da mesa, pega o corredor e só então vira para a estante. Em
 * linha reta ele passaria por dentro da mesa e de quina na estante.
 */
export function caminhoAteAEstante(xDoLivro: number): Path {
  const posto = postoNaEstante(xDoLivro);
  return [LEITOR_CADEIRA, [LEITOR_CADEIRA[0], 0, CORREDOR_Z], [posto[0], 0, CORREDOR_Z], posto];
}

/**
 * Mobília do resto da sala. O que importa é a estante, e o painel do artigo cobre ~44% da direita
 * da tela: tudo o que tem de ser visto fica **à esquerda de x(3,5)**, e o que passa disso é fundo.
 * A mesa de leitura é a exceção que confirma a regra — ela foi trazida para dentro do quadro porque
 * é onde o leitor senta.
 */
export function furniturePieces(): InteriorPiece[] {
  return [
    // mesa de leitura: o centro da cena depois da estante
    { kind: 'rugRectangle', position: [x(2.9), 0, z(1.5)], rotationY: 0 },
    { kind: 'desk', position: MESA, rotationY: 0 },
    { kind: 'chairModernCushion', position: LEITOR_CADEIRA, rotationY: 0 },
    { kind: 'books', position: [x(3.5), 0.4, z(1.78)], rotationY: 0.4 },

    // canto de leitura à esquerda, entre a estante e a parede
    { kind: 'loungeChair', position: [x(0.95), 0, z(1.6)], rotationY: 0 },
    { kind: 'tableCoffee', position: [x(1.85), 0, z(1.9)], rotationY: 0 },
    { kind: 'lampRoundFloor', position: [x(0.15), 0, z(1.1)], rotationY: 0 },

    // estantes decorativas do kit, flanqueando a funcional (dão escala a ela)
    { kind: 'bookcaseOpen', position: [x(0.25), 0, z(0.2)], rotationY: 0 },
    { kind: 'bookcaseClosedWide', position: [x(4.4), 0, z(0.2)], rotationY: 0 },

    // detalhes
    { kind: 'pottedPlant', position: [x(5.5), 0, z(0.6)], rotationY: 0 },
    { kind: 'pottedPlant', position: [x(0.25), 0, z(1.9)], rotationY: 0 },
    { kind: 'trashcan', position: [x(3.9), 0, z(1.3)], rotationY: 0 },
  ];
}

export interface UniLayout {
  floor: InteriorPiece[];
  walls: Slab[];
  baseboards: Slab[];
  estante: EstantePeca[];
  furniture: InteriorPiece[];
  bounds: InteriorBounds;
}

export function buildUniLayout(): UniLayout {
  return {
    floor: floorPieces(),
    walls: wallSlabsDa(SALA),
    baseboards: baseboardSlabs(),
    estante: estanteSlabs(),
    furniture: furniturePieces(),
    bounds: roomBounds(SALA),
  };
}

// ─── Câmera ─────────────────────────────────────────────────────────────────

/**
 * O alvo fica à **direita** da estante: o painel do artigo cobre a direita da tela, e mirar no meio
 * do viewport jogaria a estante para trás dele. Acima do chão para a estante inteira (e a parede
 * atrás dela) entrarem no quadro.
 */
const UNI_TARGET: Vec3 = [0.55, 1, -0.25];
/**
 * Só a direção importa (o ângulo da vista); o comprimento vem de `UNI_DISTANCE`. Mais deitada que
 * a da agência (polar ~1,0 contra ~0,94): a sala é rasa e o assunto está na parede do fundo, então
 * olhar mais de cima só renderia chão vazio.
 */
const UNI_DIR: Vec3 = [1.5, 3.8, 6.2];
/** Perto o bastante para se ler as lombadas; o `minDistance` do controle é 6. */
export const UNI_DISTANCE = 6.4;

export const UNI_CAMERA = interiorCamera(UNI_TARGET, UNI_DIR, UNI_DISTANCE);

/** A estante tem que caber abaixo do topo da parede. */
export const ESTANTE_CABE_NA_PAREDE = ESTANTE_ALTURA < WALL_H;
