import type { LandmarkKind } from '../store/uiStore';
import type { ChamadoDTO } from '../types/domain';

/**
 * Modelos 3D da Kenney (CC0) servidos de public/models — gerados por `npm run models` a partir de
 * assets-src/kenney. Ao mudar a lista aqui, atualize também scripts/sync-models.mjs.
 */
const BASE = `${import.meta.env.BASE_URL}models`;

export const cityModel = (name: string) => `${BASE}/city/${name}.glb`;
export const carModel = (name: CarModel) => `${BASE}/cars/${name}.glb`;
export const characterModel = (variant: string) => `${BASE}/characters/${variant}.glb`;

/**
 * A paleta da Kenney usa cinzas médios nas fachadas (albedo ~0,55); a luz da cena foi calibrada para paredes
 * brancas. Clareia a cor base por kit para os modelos combinarem com o chão/ruas sem estourar a iluminação.
 */
export function brightnessFor(url: string): number {
  if (url.includes('/city/')) return 1.2;
  if (url.includes('/cars/')) return 1.12;
  return 1.08;
}

export type CarModel = 'delivery' | 'van' | 'truck' | 'ambulance' | 'tractor-shovel' | 'box' | 'cone';

/** Porte da sede pelo valor do contrato (altura do layout); o modelo dentro do porte é fixo por cliente. */
const BUILDING_TIERS = {
  // building-h fica de fora: é o único do kit com fachada grafite (destoa do visual claro).
  pequeno: ['building-a', 'building-b', 'building-c', 'building-d'],
  medio: ['building-e', 'building-f', 'building-g', 'building-i'],
  grande: ['building-l', 'building-m', 'building-skyscraper-a', 'building-skyscraper-e'],
} as const;

export function buildingFor(idCliente: number, height: number): string {
  const tier = height < 1.3 ? BUILDING_TIERS.pequeno : height < 1.9 ? BUILDING_TIERS.medio : BUILDING_TIERS.grande;
  return cityModel(tier[idCliente % tier.length]);
}

/** Prédios cívicos: o Banco é o arranha-céu mais alto (centro financeiro). */
export const LANDMARK_MODELS: Record<LandmarkKind, { url: string; footprint: number }> = {
  datacenter: { url: cityModel('building-k'), footprint: 2.3 },
  banco: { url: cityModel('building-skyscraper-d'), footprint: 1.9 },
  universidade: { url: cityModel('building-j'), footprint: 2.5 },
  prefeitura: { url: cityModel('building-n'), footprint: 2.4 },
};

export const TOWER_MODEL = cityModel('building-skyscraper-c');
export const boxModel = carModel('box');
export const coneModel = carModel('cone');

/** Chamado urgente vem de ambulância; os demais pela "transportadora" do sistema de origem. */
export function vehicleFor(chamado: Pick<ChamadoDTO, 'prioridade' | 'origem'>): CarModel {
  if (chamado.prioridade === 'Alta') return 'ambulance';
  const o = chamado.origem.toLowerCase();
  if (o.includes('lmlopes')) return 'delivery';
  if (o.includes('tjcoach')) return 'van';
  return 'truck';
}

export const CHARACTER_VARIANTS = ['a', 'b', 'c', 'd', 'e', 'f'].flatMap((v) => [`character-male-${v}`, `character-female-${v}`]);

export const characterFor = (id: number) => characterModel(CHARACTER_VARIANTS[Math.abs(id) % CHARACTER_VARIANTS.length]);

/** Modelos que quase toda cidade usa — baixados em paralelo assim que a cena monta. */
export const PRELOAD = [
  ...Object.values(LANDMARK_MODELS).map((m) => m.url),
  ...Object.values(BUILDING_TIERS).flat().map(cityModel),
  ...(['delivery', 'van', 'truck', 'ambulance', 'box', 'cone'] as CarModel[]).map(carModel),
];
