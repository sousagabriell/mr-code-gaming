import type { ChamadoDTO, ClienteDTO, ContratoDTO, FaturaDTO, ProjetoDTO } from '../types/domain';
import type { LandmarkKind } from '../store/uiStore';
import type { ClientColorState } from './colors';
import { isChamadoAberto, projetoProgress } from './status';

export type Vec3 = [number, number, number];

export interface LandmarkPlot {
  kind: LandmarkKind;
  position: Vec3;
}

export interface ClientPlot {
  cliente: ClienteDTO;
  contrato: ContratoDTO | null;
  lotIndex: number;
  /** Centro do lote (pad no chão). */
  lotCenter: Vec3;
  /** Posição da sede dentro do lote. */
  position: Vec3;
  height: number;
  colorState: ClientColorState;
  chamadosAbertos: ChamadoDTO[];
  faturasAtrasadas: FaturaDTO[];
}

export interface ConstructionSitePlot {
  projeto: ProjetoDTO;
  position: Vec3;
  /** 0..1, estimado pelo tempo decorrido entre dataInicio e dataPrevisaoFim. */
  progress: number;
}

/** Caminhão de um chamado aberto, estacionado na rua em frente à sede do cliente. */
export interface TruckPlot {
  chamado: ChamadoDTO;
  idCliente: number;
  position: Vec3;
  index: number;
}

export interface CityBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CityLayout {
  clientPlots: ClientPlot[];
  constructionSites: ConstructionSitePlot[];
  landmarks: LandmarkPlot[];
  trucks: TruckPlot[];
  /** Lote onde a próxima sede será construída (modo construção). */
  nextLot: Vec3;
  rows: number;
  bounds: CityBounds;
}

/**
 * Grade de colunas FIXAS: o lote de um cliente depende só da sua posição na ordem de `idCliente`
 * (que é crescente e append-only). Um cliente novo ocupa o próximo lote livre — nada se move.
 */
export const LOT_COLUMNS = 4;
export const LOT_SPACING = 4.6;
export const LOT_SIZE = 3.8;
export const LOTS_START_Z = 1.2;
export const LANDMARK_Z = -5.8;
/** Avenida entre a praça cívica e a primeira fileira de lotes. */
export const AVENUE_Z = LOTS_START_Z - LOT_SPACING / 2;
/** Deslocamento da faixa de rodagem em relação ao eixo da rua. */
export const LANE_OFFSET = 0.2;
/** Caminhões visíveis por sede (o resto aparece só na contagem da etiqueta). */
export const MAX_TRUCKS_PER_LOT = 3;

/** Rua horizontal logo à frente (sul) de um lote. */
export function frontRoadZ(lotCenterZ: number): number {
  return lotCenterZ + LOT_SPACING / 2;
}

/** Eixos x das ruas verticais (entre as colunas de lotes). */
export function verticalRoadXs(): number[] {
  return Array.from({ length: LOT_COLUMNS + 1 }, (_, c) => (c - (LOT_COLUMNS - 1) / 2) * LOT_SPACING - LOT_SPACING / 2);
}

export function nearestVerticalRoadX(x: number): number {
  return verticalRoadXs().reduce((best, vx) => (Math.abs(vx - x) < Math.abs(best - x) ? vx : best));
}

export const LANDMARKS: LandmarkPlot[] = [
  { kind: 'datacenter', position: [-7.5, 0, LANDMARK_Z] },
  { kind: 'banco', position: [-2.5, 0, LANDMARK_Z] },
  { kind: 'universidade', position: [2.5, 0, LANDMARK_Z] },
  { kind: 'prefeitura', position: [7.5, 0, LANDMARK_Z] },
];

const OVERVIEW_TARGET: Vec3 = [0, 0, 0.5];
/** Só a direção importa (ângulo isométrico da vista); o comprimento vem de `OVERVIEW_DISTANCE`. */
const OVERVIEW_DIR: Vec3 = [17, 17, 18.5];
/**
 * Distância inicial ao centro da cidade: perto o bastante para ler as placas e ver a fileira cívica
 * inteira. Fica entre `FOCUS_DISTANCE` (15) e o `maxDistance` do controle (48), então ainda dá para
 * aproximar numa entidade e afastar para ver o campo.
 */
export const OVERVIEW_DISTANCE = 23;

const dirLen = Math.hypot(OVERVIEW_DIR[0], OVERVIEW_DIR[1], OVERVIEW_DIR[2]);
export const OVERVIEW_CAMERA: { position: Vec3; target: Vec3 } = {
  position: OVERVIEW_DIR.map((c, i) => OVERVIEW_TARGET[i] + (c / dirLen) * OVERVIEW_DISTANCE) as Vec3,
  target: OVERVIEW_TARGET,
};

const HQ_OFFSET: [number, number] = [-0.7, -0.3];
/** Vagas de canteiro dentro do lote, na ordem em que são ocupadas. */
const SITE_SLOTS: [number, number][] = [
  [1.05, -1.1],
  [1.05, 0],
  [1.05, 1.1],
  [-0.8, 1.35],
  [0.15, 1.35],
];

export function lotPosition(index: number): Vec3 {
  const col = index % LOT_COLUMNS;
  const row = Math.floor(index / LOT_COLUMNS);
  return [(col - (LOT_COLUMNS - 1) / 2) * LOT_SPACING, 0, LOTS_START_Z + row * LOT_SPACING];
}

export function pickContrato(contratos: ContratoDTO[], idCliente: number): ContratoDTO | null {
  const doCliente = contratos.filter((c) => c.idCliente === idCliente);
  if (doCliente.length === 0) return null;
  return doCliente.find((c) => c.status === 'Ativo') ?? doCliente[doCliente.length - 1];
}

function colorStateFor(cliente: ClienteDTO, contrato: ContratoDTO | null): ClientColorState {
  if (cliente.status === 'Inativo') return 'encerrado';
  if (!contrato) return 'neutro';
  if (contrato.status === 'Ativo') return 'ativo';
  if (contrato.status === 'Rascunho' || contrato.status === 'AguardandoAprovacao') return 'pendente';
  return 'encerrado';
}

function heightFor(contrato: ContratoDTO | null): number {
  const valor = contrato?.valorMensal ?? contrato?.valorTotal ?? 0;
  return 0.9 + Math.min(1.6, Math.log10(1 + valor) / 4);
}

export function buildCityLayout(
  clientes: ClienteDTO[],
  contratos: ContratoDTO[],
  projetos: ProjetoDTO[],
  chamados: ChamadoDTO[],
  faturas: FaturaDTO[] = []
): CityLayout {
  const ordered = [...clientes].sort((a, b) => a.idCliente - b.idCliente);

  const clientPlots: ClientPlot[] = ordered.map((cliente, lotIndex) => {
    const lotCenter = lotPosition(lotIndex);
    const contrato = pickContrato(contratos, cliente.idCliente);
    return {
      cliente,
      contrato,
      lotIndex,
      lotCenter,
      position: [lotCenter[0] + HQ_OFFSET[0], 0, lotCenter[2] + HQ_OFFSET[1]],
      height: heightFor(contrato),
      colorState: colorStateFor(cliente, contrato),
      chamadosAbertos: chamados.filter((c) => c.idCliente === cliente.idCliente && isChamadoAberto(c)),
      faturasAtrasadas: faturas.filter((f) => f.idCliente === cliente.idCliente && f.status === 'Atrasado'),
    };
  });

  const plotByCliente = new Map(clientPlots.map((p) => [p.cliente.idCliente, p]));
  const slotByCliente = new Map<number, number>();

  const constructionSites: ConstructionSitePlot[] = [...projetos]
    .filter((p) => p.status !== 'Cancelado')
    .sort((a, b) => a.idProjeto - b.idProjeto)
    .flatMap((projeto) => {
      const plot = plotByCliente.get(projeto.idCliente);
      if (!plot) return [];
      const slot = slotByCliente.get(projeto.idCliente) ?? 0;
      slotByCliente.set(projeto.idCliente, slot + 1);
      if (slot >= SITE_SLOTS.length) return [];
      const [dx, dz] = SITE_SLOTS[slot];
      const position: Vec3 = [plot.lotCenter[0] + dx, 0, plot.lotCenter[2] + dz];
      return [{ projeto, position, progress: projetoProgress(projeto) }];
    });

  const trucks: TruckPlot[] = clientPlots.flatMap((plot) =>
    [...plot.chamadosAbertos]
      .sort((a, b) => a.idChamado - b.idChamado)
      .slice(0, MAX_TRUCKS_PER_LOT)
      .map((chamado, index) => ({
        chamado,
        idCliente: plot.cliente.idCliente,
        index,
        position: [plot.lotCenter[0] - 1.3 + index * 1.3, 0, frontRoadZ(plot.lotCenter[2]) - LANE_OFFSET] as Vec3,
      }))
  );

  const rows = Math.max(1, Math.ceil((ordered.length + 1) / LOT_COLUMNS));
  const halfWidth = ((LOT_COLUMNS - 1) / 2) * LOT_SPACING + LOT_SPACING / 2;

  return {
    clientPlots,
    constructionSites,
    landmarks: LANDMARKS,
    trucks,
    nextLot: lotPosition(ordered.length),
    rows,
    bounds: {
      minX: Math.min(-halfWidth, -9.5),
      maxX: Math.max(halfWidth, 9.5),
      minZ: LANDMARK_Z - 2.5,
      maxZ: LOTS_START_Z + (rows - 1) * LOT_SPACING + LOT_SPACING / 2,
    },
  };
}
