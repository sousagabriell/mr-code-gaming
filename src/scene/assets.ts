import type { LandmarkKind } from '../store/uiStore';
import type { ChamadoDTO } from '../types/domain';

/**
 * Modelos 3D da Kenney (CC0) servidos de public/models — gerados por `npm run models` a partir de
 * assets-src/kenney. Ao mudar a lista aqui, atualize também scripts/sync-models.mjs.
 */
const BASE = `${import.meta.env.BASE_URL}models`;

export const cityModel = (name: string) => `${BASE}/city/${name}.glb`;
/** Kit industrial: pasta própria porque os nomes (`building-a`…) colidem com os do kit comercial. */
export const industrialModel = (name: string) => `${BASE}/industrial/${name}.glb`;
export const roadModel = (name: RoadTile) => `${BASE}/roads/${name}.glb`;
/** Vegetação e relevo do campo em volta da cidade (kit "3D Road Tiles", renomeados — ver sync-models.mjs). */
export const natureModel = (name: NatureModel) => `${BASE}/nature/${name}.glb`;
/** Móveis do interior da agência do Banco Central (kit "Furniture Kit"). */
export const furnitureModel = (name: string) => `${BASE}/furniture/${name}.glb`;
export const carModel = (name: CarModel) => `${BASE}/cars/${name}.glb`;
export const characterModel = (variant: string) => `${BASE}/characters/${variant}.glb`;

/**
 * A paleta da Kenney usa cinzas médios nas fachadas (albedo ~0,55); a luz da cena foi calibrada para paredes
 * brancas. Clareia a cor base por kit para os modelos combinarem com o chão/ruas sem estourar a iluminação.
 */
export function brightnessFor(url: string): number {
  if (url.includes('/city/') || url.includes('/industrial/')) return 1.2;
  // O asfalto da Kenney é bem mais escuro que o chão claro da maquete.
  if (url.includes('/roads/')) return 1.35;
  if (url.includes('/cars/')) return 1.12;
  // Interior: o kit de móveis já é claro e a sala é fechada — clarear mais estouraria as paredes.
  if (url.includes('/furniture/')) return 1;
  return 1.08;
}

/**
 * O kit "3D Road Tiles" é de outra safra: verde oliva saturado e sem textura. Como a cor vem só do
 * material, trocá-la pela paleta do tema é o que mantém o campo coerente com a maquete clara.
 */
export type NatureModel = 'pine' | 'bush';
export const NATURE_MODELS: NatureModel[] = ['pine', 'bush'];

/**
 * Ladrilhos 1×1 da malha viária (centrados na origem). Na orientação original a reta corre no eixo x,
 * a curva liga -x/+z e o T tem a perna em +z com os braços em ±x — `Ground` gira a partir disso.
 */
export type RoadTile = 'road-straight' | 'road-crossroad' | 'road-intersection' | 'road-bend';

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

/**
 * Prédios cívicos: o Data Center é o tanque industrial; Banco e Prefeitura vêm do kit industrial.
 * A praça fica ao norte dos lotes, então a fachada tem que olhar para +z (a avenida). Os modelos do kit
 * industrial nascem virados para -z — daí o meio giro; os do comercial já vêm na direção certa.
 */
export const LANDMARK_MODELS: Record<LandmarkKind, { url: string; footprint: number; rotationY?: number }> = {
  datacenter: { url: industrialModel('detail-tank-large'), footprint: 2.4, rotationY: Math.PI },
  banco: { url: industrialModel('building-t'), footprint: 2.6, rotationY: Math.PI },
  universidade: { url: cityModel('building-j'), footprint: 2.5 },
  prefeitura: { url: industrialModel('building-a'), footprint: 2.6, rotationY: Math.PI },
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

export const ROAD_TILES: RoadTile[] = ['road-straight', 'road-crossroad', 'road-intersection', 'road-bend'];

/** Modelos que quase toda cidade usa — baixados em paralelo assim que a cena monta. */
export const PRELOAD = [
  ...Object.values(LANDMARK_MODELS).map((m) => m.url),
  ...Object.values(BUILDING_TIERS).flat().map(cityModel),
  ...ROAD_TILES.map(roadModel),
  ...NATURE_MODELS.map(natureModel),
  ...(['delivery', 'van', 'truck', 'ambulance', 'box', 'cone'] as CarModel[]).map(carModel),
];
