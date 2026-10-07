import type { ChamadoDTO, ClienteDTO, ContratoDTO, ProjetoDTO } from '../types/domain';
import type { ClientColorState } from './colors';

export type Vec3 = [number, number, number];

export type LandmarkKind = 'datacenter' | 'banco' | 'universidade' | 'prefeitura';

export interface LandmarkPlot {
  kind: LandmarkKind;
  position: Vec3;
}

export interface ClientPlot {
  cliente: ClienteDTO;
  contrato: ContratoDTO | null;
  position: Vec3;
  height: number;
  colorState: ClientColorState;
  chamadosAbertos: ChamadoDTO[];
}

export interface ConstructionSitePlot {
  projeto: ProjetoDTO;
  position: Vec3;
  /** 0..1, estimado pelo tempo decorrido entre dataInicio e dataPrevisaoFim. */
  progress: number;
}

export interface CityLayout {
  clientPlots: ClientPlot[];
  constructionSites: ConstructionSitePlot[];
  landmarks: LandmarkPlot[];
}

const GRID_SPACING = 2.8;
const LANDMARK_Z = -6;
const CLIENT_START_Z = 0.5;

export const LANDMARKS: LandmarkPlot[] = [
  { kind: 'datacenter', position: [-7.5, 0, LANDMARK_Z] },
  { kind: 'banco', position: [-2.5, 0, LANDMARK_Z] },
  { kind: 'universidade', position: [2.5, 0, LANDMARK_Z] },
  { kind: 'prefeitura', position: [7.5, 0, LANDMARK_Z] },
];

export const OVERVIEW_CAMERA: { position: Vec3; target: Vec3 } = {
  position: [16, 15, 16],
  target: [0, 0, -2],
};

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
  return 0.8 + Math.min(1.8, Math.log10(1 + valor) / 4);
}

const PROJETO_EM_OBRAS: ProjetoDTO['status'][] = ['Planejamento', 'EmAndamento', 'Pausado'];

function progressFor(projeto: ProjetoDTO): number {
  const start = new Date(projeto.dataInicio).getTime();
  const end = new Date(projeto.dataPrevisaoFim).getTime();
  if (projeto.status === 'Planejamento') return 0;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0.5;
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
}

export function buildCityLayout(
  clientes: ClienteDTO[],
  contratos: ContratoDTO[],
  projetos: ProjetoDTO[],
  chamados: ChamadoDTO[]
): CityLayout {
  const columns = Math.max(3, Math.ceil(Math.sqrt(clientes.length || 1)));
  const totalWidth = (columns - 1) * GRID_SPACING;

  const clientPlots: ClientPlot[] = clientes.map((cliente, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const position: Vec3 = [-totalWidth / 2 + col * GRID_SPACING, 0, CLIENT_START_Z + row * GRID_SPACING];
    const contrato = pickContrato(contratos, cliente.idCliente);
    const chamadosAbertos = chamados.filter(
      (c) => c.idCliente === cliente.idCliente && (c.status === 'Aberto' || c.status === 'EmAndamento')
    );

    return {
      cliente,
      contrato,
      position,
      height: heightFor(contrato),
      colorState: colorStateFor(cliente, contrato),
      chamadosAbertos,
    };
  });

  const plotByCliente = new Map(clientPlots.map((p) => [p.cliente.idCliente, p]));
  const siteIndexByCliente = new Map<number, number>();

  const constructionSites: ConstructionSitePlot[] = projetos
    .filter((p) => PROJETO_EM_OBRAS.includes(p.status))
    .map((projeto) => {
      const plot = plotByCliente.get(projeto.idCliente);
      if (!plot) return null;

      const index = siteIndexByCliente.get(projeto.idCliente) ?? 0;
      siteIndexByCliente.set(projeto.idCliente, index + 1);

      const position: Vec3 = [plot.position[0] + 1.1, 0, plot.position[2] - 0.9 - index * 1.1];
      return { projeto, position, progress: progressFor(projeto) };
    })
    .filter((x): x is ConstructionSitePlot => x !== null);

  return { clientPlots, constructionSites, landmarks: LANDMARKS };
}
