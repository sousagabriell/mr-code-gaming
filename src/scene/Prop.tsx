import type { Vec3 } from '../world/layout';
import { useKenneyModel, type ModelOptions } from './kenney';

/** Objeto estático da Kenney (cone, caixa, prédio decorativo), já normalizado e apoiado no chão. */
export function Prop({ url, position, rotationY = 0, ...opts }: { url: string; position?: Vec3 } & ModelOptions) {
  const { root } = useKenneyModel(url, { ...opts, rotationY });
  return (
    <group position={position}>
      <primitive object={root} />
    </group>
  );
}
