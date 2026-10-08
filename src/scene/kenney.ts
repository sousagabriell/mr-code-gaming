import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, FrontSide, Group, Matrix4, Vector3, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { brightnessFor } from './assets';

export interface ModelOptions {
  /** Tamanho-alvo: maior lado da base ('footprint') ou altura ('height'). */
  size: number;
  fit?: 'footprint' | 'height';
  /** Giro aplicado antes de medir (ex.: π/2 para um veículo que aponta para +z ficar de frente para +x). */
  rotationY?: number;
  /** Cor multiplicada sobre a textura (ex.: cinza para "inativo"). */
  tint?: string;
  /** Personagens com esqueleto precisam de clone profundo (SkeletonUtils). */
  skinned?: boolean;
  /** Brilho branco de hover/seleção (0 = desligado); cada instância tem seus próprios materiais. */
  highlight?: number;
}

/**
 * Carrega um GLB da Kenney e devolve uma cópia normalizada: centrada em x/z, apoiada no chão (y = 0) e escalada
 * para o tamanho pedido — assim os modelos encaixam nos lotes/ruas sem ajuste manual de cada arquivo.
 * Geometria e textura são compartilhadas entre instâncias; cada instância tem materiais próprios (realce, tinta).
 */
export function useKenneyModel(url: string, opts: ModelOptions) {
  const { scene, animations } = useGLTF(url);
  const { size, fit = 'footprint', rotationY = 0, tint, skinned = false, highlight = 0 } = opts;

  const built = useMemo(() => {
    const model = (skinned ? cloneSkinned(scene) : scene.clone(true)) as Object3D;
    model.rotation.y = rotationY;
    const materials: MeshStandardMaterial[] = [];
    const brightness = brightnessFor(url);
    model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Material sempre clonado: a textura (e a geometria) continuam compartilhadas, só os fatores mudam.
      const m = (mesh.material as Material).clone() as MeshStandardMaterial;
      if (tint) m.color.set(tint);
      m.color.multiplyScalar(brightness);
      // Os GLB vêm com doubleSided: com sombras, as faces de trás entram no mapa de sombra e as fachadas
      // iluminadas se auto-sombreiam (ficam quase pretas). Os modelos são fechados — basta a face da frente.
      m.side = FrontSide;
      mesh.material = m;
      materials.push(m);
    });

    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const raw = box.getSize(new Vector3());
    model.scale.setScalar(fit === 'height' ? size / raw.y : size / Math.max(raw.x, raw.z));
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    const center = box.getCenter(new Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);

    const root = new Group();
    root.add(model);
    return { root, model, materials, size: box.getSize(new Vector3()) };
  }, [scene, url, size, fit, rotationY, tint, skinned]);

  // Os objetos three.js são mutados fora do render (efeitos/frames) — por isso ficam num ref.
  const live = useRef(built);
  useLayoutEffect(() => {
    live.current = built;
  }, [built]);

  useEffect(() => {
    for (const m of live.current.materials) m.setValues({ emissive: '#ffffff', emissiveIntensity: highlight });
  }, [built, highlight]);

  // Materiais clonados são da instância: libera ao desmontar.
  useEffect(() => () => built.materials.forEach((m) => m.dispose()), [built]);

  return { ...built, animations };
}

export interface PartsOptions {
  /** Com tamanho, normaliza como `useKenneyModel`: centrado em x/z, apoiado em y = 0 e nessa medida. */
  size?: number;
  fit?: 'footprint' | 'height';
  /**
   * Troca a cor por nome de material do GLB (ex.: `{ Grass: '#8fd09c' }`) em vez de só clarear.
   * Passe uma referência estável (constante de módulo) — ela entra nas dependências do memo.
   */
  colors?: Record<string, string>;
}

/**
 * Geometrias e materiais de um GLB, um par por primitiva, prontos para `InstancedMesh` — um pinheiro
 * da Kenney vem com copa e tronco separados, então cada peça vira sua própria `<Instances>`.
 * A transformação dos nós já sai aplicada na geometria; os materiais são clonados.
 */
export function useKenneyParts(url: string, { size, fit = 'footprint', colors }: PartsOptions = {}) {
  const { scene } = useGLTF(url);

  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const meshes: Mesh[] = [];
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o as Mesh);
    });

    const built = meshes.map((mesh) => {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      const material = (mesh.material as Material).clone() as MeshStandardMaterial;
      const override = colors?.[material.name];
      if (override) material.color.set(override);
      else material.color.multiplyScalar(brightnessFor(url));
      material.side = FrontSide;
      return { geometry, material };
    });

    if (size !== undefined) {
      // Uma matriz só para todas as peças: elas precisam continuar encaixadas entre si.
      const box = new Box3();
      for (const part of built) {
        part.geometry.computeBoundingBox();
        box.union(part.geometry.boundingBox!);
      }
      const raw = box.getSize(new Vector3());
      const scale = fit === 'height' ? size / raw.y : size / Math.max(raw.x, raw.z);
      const center = box.getCenter(new Vector3());
      const m = new Matrix4()
        .makeScale(scale, scale, scale)
        .multiply(new Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
      for (const part of built) part.geometry.applyMatrix4(m);
    }

    return built;
  }, [scene, url, size, fit, colors]);

  useEffect(
    () => () => {
      for (const { geometry, material } of parts) {
        geometry.dispose();
        material.dispose();
      }
    },
    [parts]
  );

  return parts;
}

/** Intensidade padrão do realce de hover/seleção. */
export const HIGHLIGHT = 0.16;

/** Procura nós pelo prefixo do nome (rodas "wheel-…", porta "door"). */
export function findNodes(root: Object3D, prefix: string): Object3D[] {
  const out: Object3D[] = [];
  root.traverse((o) => {
    if (o.name.startsWith(prefix)) out.push(o);
  });
  return out;
}

export function preloadModels(urls: string[]) {
  urls.forEach((u) => useGLTF.preload(u));
}
