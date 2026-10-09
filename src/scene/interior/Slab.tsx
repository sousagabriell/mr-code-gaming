import type { Vec3 } from '../../world/layout';

/** Caixa lisa dos interiores: parede, rodapé, prancha de estante. */
export function Slab({
  position,
  size,
  color,
}: {
  position: Vec3;
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
