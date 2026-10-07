import { Html } from '@react-three/drei';
import type { Vec3 } from '../world/layout';
import { labelsPortalTarget } from './labelsPortal';

/**
 * Etiqueta ancorada num objeto 3D ("FL-01 · Loading truck" da referência).
 * zIndexRange baixo para nunca passar por cima da HUD.
 */
export function SceneTag({
  position,
  code,
  text,
  accent = '#134ced',
  visible = true,
}: {
  position: Vec3;
  code: string;
  text?: string;
  accent?: string;
  /** Mantém o <Html> montado e só esconde — desmontar durante o render gera aviso do React 19. */
  visible?: boolean;
}) {
  return (
    <Html position={position} center portal={labelsPortalTarget} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div
        aria-hidden={!visible}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-0.5 pr-2.5 text-[11px] font-medium text-ink shadow-[0_4px_14px_rgb(30_41_90/0.18)] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: accent }}>
          {code}
        </span>
        {text && <span className="text-ink-2">{text}</span>}
      </div>
    </Html>
  );
}
