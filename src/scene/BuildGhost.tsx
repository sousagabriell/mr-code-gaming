import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { COLORS } from '../world/colors';
import type { Vec3 } from '../world/layout';
import { useUiStore } from '../store/uiStore';
import { labelsPortalTarget } from './labelsPortal';

/** Modo construção: sede-fantasma no próximo lote livre. Clicar abre o formulário de novo cliente. */
export function BuildGhost({ lot, active }: { lot: Vec3; active: boolean }) {
  const ref = useRef<Group>(null);
  const openDrawer = useUiStore((s) => s.openDrawer);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.05 + Math.sin(clock.elapsedTime * 2) * 0.05;
  });

  const open = () => openDrawer({ form: 'novo-cliente' });

  return (
    <group position={[lot[0] - 0.7, 0, lot[2] - 0.3]}>
      <group
        ref={ref}
        visible={active}
        onClick={(e) => {
          if (!active) return;
          e.stopPropagation();
          open();
        }}
        onPointerOver={() => active && (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.4, 1.2, 1.15]} />
          <meshStandardMaterial color={COLORS.brandBlue} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.4, 1.2, 1.15]} />
          <meshBasicMaterial color={COLORS.brandBlue} wireframe />
        </mesh>
      </group>
      <Html position={[0, 1.9, 0]} center portal={labelsPortalTarget} zIndexRange={[10, 0]} style={{ pointerEvents: active ? 'auto' : 'none' }}>
        <button
          onClick={open}
          tabIndex={active ? 0 : -1}
          aria-hidden={!active}
          className={`whitespace-nowrap transition-opacity ${active ? 'opacity-100' : 'opacity-0'} rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-float hover:bg-brand-hover`}
        >
          + Construir sede aqui
        </button>
      </Html>
    </group>
  );
}
