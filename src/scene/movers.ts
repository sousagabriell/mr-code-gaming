import { useEffect, type RefObject } from 'react';
import type { Object3D } from 'three';

/**
 * Objetos que se movem (caminhões, colaboradores) registrados pela chave da entidade
 * (`chamado:12`, `colaborador:3`) — a câmera consulta para focar e para o modo "seguir".
 */
const movers = new Map<string, Object3D>();

export function getMover(key: string): Object3D | undefined {
  return movers.get(key);
}

export function useRegisterMover(key: string, ref: RefObject<Object3D | null>) {
  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    movers.set(key, obj);
    return () => {
      if (movers.get(key) === obj) movers.delete(key);
    };
  }, [key, ref]);
}
