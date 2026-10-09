import { Hammer, Home, Minus, Plus, RotateCcw, RotateCw } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { goHome, rotateQuarter, zoomStep } from './camera';
import { cx } from './tones';
import { Glass, IconButton } from './ui';

/**
 * Zoom, giro, visão geral e construção. `horizontal` é a versão que mora na barra superior
 * (desktop); a vertical flutua na lateral quando a barra não tem espaço (< 1024px).
 */
export function CameraToolbar({ horizontal = false }: { horizontal?: boolean }) {
  const controls = useUiStore((s) => s.controls);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const buildMode = useUiStore((s) => s.buildMode);
  const setBuildMode = useUiStore((s) => s.setBuildMode);
  const yard = useUiStore((s) => s.yard);
  const interior = useUiStore((s) => s.interior);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const casa = interior === 'banco' ? 'a agência' : interior === 'universidade' ? 'a biblioteca' : null;

  const separador = horizontal ? 'mx-0.5 h-5 w-px bg-line' : 'my-0.5 h-px w-5 bg-line';

  return (
    <div
      data-tour="toolbar"
      role="toolbar"
      aria-label="Câmera e construção"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
    >
      <Glass
        className={cx(
          'flex items-center gap-0.5 p-1',
          // h-10 e rounded-xl alinham a pílula com o sino e o botão de lista da barra.
          horizontal ? 'h-10 rounded-xl' : 'flex-col'
        )}
      >
        <IconButton label="Aproximar (+)" onClick={() => zoomStep(controls, 1)}>
          <Plus className="h-4 w-4" />
        </IconButton>
        <IconButton label="Afastar (−)" onClick={() => zoomStep(controls, -1)}>
          <Minus className="h-4 w-4" />
        </IconButton>
        <div className={separador} />
        <IconButton label="Girar à esquerda (Q)" onClick={() => rotateQuarter(controls, -1)}>
          <RotateCcw className="h-4 w-4" />
        </IconButton>
        <IconButton label="Girar à direita (E)" onClick={() => rotateQuarter(controls, 1)}>
          <RotateCw className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={casa ? `Enquadrar ${casa} (H)` : yard ? 'Enquadrar o pátio (H)' : 'Visão geral (H)'}
          onClick={() => {
            // Nos interiores não há seleção: limpar levaria de volta para a cidade.
            if (!interior) clearSelection();
            goHome(controls);
          }}
        >
          <Home className="h-4 w-4" />
        </IconButton>
        <div className={separador} />
        {/* Não há o que construir dentro de um interior — lá o martelo some. */}
        {!interior && (
          <IconButton
            label={yard ? 'Nova atividade (B)' : buildMode ? 'Sair do modo construção (B)' : 'Modo construção (B)'}
            onClick={() => (yard ? openDrawer({ form: 'nova-atividade', idProjeto: yard }) : setBuildMode(!buildMode))}
            className={cx(buildMode && 'bg-brand text-white hover:bg-brand-hover hover:text-white')}
          >
            <Hammer className="h-4 w-4" />
          </IconButton>
        )}
      </Glass>
    </div>
  );
}
