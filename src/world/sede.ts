import {
  backZ,
  baseboardSlabs as baseboardSlabsDa,
  colX,
  floorTiles,
  interiorCamera,
  leftX,
  PISO_Y,
  roomBounds,
  roomDepth,
  roomWidth,
  rowZ,
  wallSlabs as wallSlabsDa,
  type InteriorBounds,
  type InteriorPiece,
  type Sala,
  type Slab,
} from './interior';
import type { Vec3 } from './layout';
import type { ProjetoDTO, ProjetoMarcoDTO, ProjetoStatus } from '../types/domain';

/**
 * Escritório do cliente: o cenário que se abre ao entrar na **sede** de um cliente. A casca da sala
 * vem de `interior.ts` (a mesma da agência e da biblioteca); o assunto é o que o portal mostra na
 * tela do projeto — detalhes, acesso de produção, links, marcos e equipe —, e esse assunto mora todo
 * no painel da direita. A sala é cenário: a mesa de quem atende o cliente, com a placa dele na
 * parede.
 *
 * Diferente da agência e da biblioteca, não é um landmark: existe um escritório por cliente, e quem
 * diz de quem é o escritório aberto é o `sedeStore`.
 *
 * Tudo aqui é puro e testado em `sede.test.ts`.
 */

/**
 * A menor das três salas (5×3, contra 6×3 da biblioteca e 7×4 da agência). O que a cena precisa
 * mostrar é uma mesa e uma placa; cada ladrilho a mais vira chão vazio, e o painel já toma a
 * metade direita da tela.
 */
export const COLS = 5;
export const ROWS = 3;
const SALA: Sala = { cols: COLS, rows: ROWS };

export const ROOM_W = roomWidth(SALA);
export const ROOM_D = roomDepth(SALA);
export const SEDE_BOUNDS = roomBounds(SALA);

const x = (col: number) => colX(SALA, col);
const z = (row: number) => rowZ(SALA, row);
const FUNDO_Z = backZ(SALA);
const ESQUERDA_X = leftX(SALA);

const Q = Math.PI / 2;

// ─── A mesa e a placa ───────────────────────────────────────────────────────

/**
 * A mesa de quem atende o cliente, no eixo da placa. Virada para a câmera (+z): quem senta fica de
 * costas para a parede, e as cadeiras de visita, do lado de cá.
 */
export const MESA: Vec3 = [x(1), 0, z(0.45)];
/** Altura do tampo da `desk` do kit — onde o monitor e o teclado se apoiam. */
export const TAMPO_Y = 0.385;
/**
 * O tapete vai sobre o piso (`PISO_Y`), e mais uns milímetros: a malha do kit é quantizada pelo
 * meshopt, o tampo do ladrilho não fica exatamente em 0,05, e rente a ele o tapete só aparecia em
 * fiapos.
 */
const FOLGA_DO_TAPETE = 0.006;
/** Recuo da cadeira em relação ao centro da mesa: atrás dela, sem encostar na parede. */
const RECUO_CADEIRA = 0.5;

/**
 * A placa com o nome do cliente, pendurada na parede do fundo acima da cadeira. Proporção 2:1, a
 * mesma da textura de `signTexture.ts`. `y` acima do encosto da cadeira (0,61) e da estante (0,79):
 * nenhum móvel passa na frente.
 */
export const PLACA = {
  /** Centro do cartão: à frente da moldura, que por sua vez encosta na parede. */
  position: [MESA[0], 1.22, FUNDO_Z + 0.04] as Vec3,
  size: [1, 0.5] as [number, number],
  /** Quanto a moldura sobra em volta do cartão — dá relevo sem desenhar nada. */
  moldura: 0.05,
  /** Espessura da moldura, da parede até um fio antes do cartão (cartão e moldura no mesmo z piscariam). */
  molduraProf: 0.03,
} as const;

/**
 * Mobília do escritório. Tudo o que importa fica **à esquerda de x(2)**: o painel do projeto cobre
 * a direita da tela, e o que passa disso (a sala de espera) é fundo de cena.
 */
export function furniturePieces(): InteriorPiece[] {
  const [mx, , mz] = MESA;
  return [
    // posto de atendimento: mesa, cadeira atrás, monitor e teclado no tampo. Monitor e teclado
    // olham para quem senta (−z): da câmera se vê a traseira da tela, como de quem chega à mesa.
    { kind: 'rugRectangle', position: [mx, PISO_Y + FOLGA_DO_TAPETE, z(0.85)], rotationY: 0 },
    { kind: 'desk', position: MESA, rotationY: 2 * Q },
    { kind: 'chairDesk', position: [mx, 0, mz - RECUO_CADEIRA], rotationY: 0 },
    { kind: 'computerScreen', position: [mx - 0.1, TAMPO_Y, mz + 0.08], rotationY: 0 },
    { kind: 'computerKeyboard', position: [mx - 0.1, TAMPO_Y, mz - 0.08], rotationY: 0 },
    { kind: 'books', position: [mx + 0.26, TAMPO_Y, mz - 0.06], rotationY: 0.3 },
    { kind: 'trashcan', position: [x(1.6), 0, z(0.25)], rotationY: 0 },

    // cadeiras de visita, de frente para a mesa
    { kind: 'chairModernCushion', position: [x(0.7), 0, z(1.15)], rotationY: 2 * Q },
    { kind: 'chairModernCushion', position: [x(1.3), 0, z(1.15)], rotationY: 2 * Q },

    // arquivo: o armário encostado no fundo, com as caixas de documento em cima
    { kind: 'bookcaseClosedWide', position: [x(-0.05), 0, FUNDO_Z + 0.14], rotationY: 0 },
    { kind: 'cardboardBoxClosed', position: [x(-0.25), 0.79, FUNDO_Z + 0.14], rotationY: 0.25 },
    { kind: 'cardboardBoxClosed', position: [x(0.15), 0.79, FUNDO_Z + 0.15], rotationY: -0.15 },

    // canto da esquerda: poltrona encostada na parede, olhando para a mesa
    { kind: 'loungeChair', position: [ESQUERDA_X + 0.24, 0, z(1.6)], rotationY: Q },
    { kind: 'lampRoundFloor', position: [ESQUERDA_X + 0.2, 0, z(1.05)], rotationY: 0 },
    { kind: 'pottedPlant', position: [x(1.85), 0, FUNDO_Z + 0.16], rotationY: 0 },

    // sala de espera à direita — fundo de cena, parte dela fica atrás do painel
    { kind: 'loungeSofa', position: [x(3.1), 0, FUNDO_Z + 0.22], rotationY: 0 },
    { kind: 'tableCoffee', position: [x(3.1), 0, z(0.85)], rotationY: 0 },
    { kind: 'books', position: [x(3.05), 0.23, z(0.85)], rotationY: -0.4 },
    { kind: 'coatRackStanding', position: [x(4.2), 0, FUNDO_Z + 0.2], rotationY: 0 },
  ];
}

export interface SedeLayout {
  floor: InteriorPiece[];
  walls: Slab[];
  baseboards: Slab[];
  furniture: InteriorPiece[];
  bounds: InteriorBounds;
}

export function buildSedeLayout(): SedeLayout {
  return {
    floor: floorTiles(SALA),
    walls: wallSlabsDa(SALA),
    baseboards: baseboardSlabsDa(SALA),
    furniture: furniturePieces(),
    bounds: roomBounds(SALA),
  };
}

// ─── Câmera ─────────────────────────────────────────────────────────────────

/**
 * O alvo fica à **direita** da mesa, pela mesma razão da biblioteca: o painel cobre a direita da
 * tela, e mirar na mesa a jogaria para trás dele. Acima do chão para a placa entrar no quadro.
 */
const SEDE_TARGET: Vec3 = [0.6, 0.85, -0.3];
/** Só a direção importa (o ângulo da vista); o comprimento vem de `SEDE_DISTANCE`. */
const SEDE_DIR: Vec3 = [1.5, 3.9, 6.2];
/**
 * A mais fechada dos interiores (6,1 contra 6,4 da biblioteca e 8,2 da agência): a sala é a menor e
 * o assunto é uma mesa. O `minDistance` do controle é 6 — abaixo disso ele mesmo afastaria.
 */
export const SEDE_DISTANCE = 6.1;

export const SEDE_CAMERA = interiorCamera(SEDE_TARGET, SEDE_DIR, SEDE_DISTANCE);

// ─── Painel: os projetos do cliente ─────────────────────────────────────────

/**
 * Projetos do cliente na ordem das abas do painel: por id, e só por id. Ordenar por status faria a
 * aba trocar de lugar quando um projeto muda de fase no refetch do "Live".
 */
export function projetosDoCliente<P extends Pick<ProjetoDTO, 'idProjeto' | 'idCliente'>>(projetos: P[], idCliente: number): P[] {
  return projetos.filter((p) => p.idCliente === idCliente).sort((a, b) => a.idProjeto - b.idProjeto);
}

/** Qual projeto vale a pena abrir primeiro: o que está em obra; cancelado só se não houver outro. */
const PRIORIDADE_DO_STATUS: Record<ProjetoStatus, number> = {
  EmAndamento: 0,
  Planejamento: 1,
  Pausado: 2,
  Concluido: 3,
  Cancelado: 4,
};

/**
 * O projeto em foco no painel. O pedido (vindo do inspector do projeto, ou da aba clicada) vale se
 * for mesmo deste cliente; senão, o primeiro pela fase. `null` = cliente sem projeto.
 */
export function projetoEmFoco(
  projetos: Pick<ProjetoDTO, 'idProjeto' | 'status'>[],
  pedido: number | null
): number | null {
  if (pedido !== null && projetos.some((p) => p.idProjeto === pedido)) return pedido;
  const [primeiro] = [...projetos].sort(
    (a, b) => PRIORIDADE_DO_STATUS[a.status] - PRIORIDADE_DO_STATUS[b.status] || a.idProjeto - b.idProjeto
  );
  return primeiro?.idProjeto ?? null;
}

// ─── Painel: acesso de produção e links ─────────────────────────────────────

export function temAcessoDeProducao(p: Pick<ProjetoDTO, 'linkProducao' | 'loginProducao' | 'senhaProducao'>): boolean {
  return Boolean(p.linkProducao || p.loginProducao || p.senhaProducao);
}

/**
 * O endereço como link — ou `null`, quando ele não deve virar um. Só `http(s)` passa: o valor é
 * digitado no portal, e um `javascript:` num `href` executaria no clique. O que é recusado aparece
 * como texto, porque link sem destino é promessa falsa de clique (MANUAL-TECNICO §16).
 */
export function urlSegura(url: string | null | undefined): string | null {
  const valor = url?.trim();
  if (!valor) return null;
  try {
    const { protocol } = new URL(valor);
    return protocol === 'http:' || protocol === 'https:' ? valor : null;
  } catch {
    return null;
  }
}

// ─── Painel: marcos ─────────────────────────────────────────────────────────

export type MarcoSituacao = 'concluido' | 'atrasado' | 'previsto';

/** Dia de calendário (`aaaa-mm-dd`) de um `DateTime` do backend, sem passar por `Date` (§16). */
const diaDe = (iso: string) => iso.slice(0, 10);

/**
 * Atrasado é o pendente cuja data prevista já passou — o próprio dia ainda conta como no prazo.
 * `hoje` é `aaaa-mm-dd` em horário local (`hojeISO`), injetado para o teste não depender do relógio.
 */
export function situacaoDoMarco(m: Pick<ProjetoMarcoDTO, 'concluido' | 'dataPrevista'>, hoje: string): MarcoSituacao {
  if (m.concluido) return 'concluido';
  return diaDe(m.dataPrevista) < hoje ? 'atrasado' : 'previsto';
}

/** Em ordem de calendário: o portal lista na ordem de cadastro, que não diz nada sobre o prazo. */
export function marcosEmOrdem<M extends Pick<ProjetoMarcoDTO, 'idMarco' | 'dataPrevista'>>(marcos: M[]): M[] {
  return [...marcos].sort((a, b) => diaDe(a.dataPrevista).localeCompare(diaDe(b.dataPrevista)) || a.idMarco - b.idMarco);
}

export function resumoDosMarcos(marcos: Pick<ProjetoMarcoDTO, 'concluido' | 'dataPrevista'>[], hoje: string) {
  const situacoes = marcos.map((m) => situacaoDoMarco(m, hoje));
  return {
    total: marcos.length,
    concluidos: situacoes.filter((s) => s === 'concluido').length,
    atrasados: situacoes.filter((s) => s === 'atrasado').length,
  };
}
