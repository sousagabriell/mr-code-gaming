import { Hammer, Home, Minus, Plus, RotateCcw, RotateCw } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { goHome, rotateQuarter, zoomStep } from './camera';
import { cx } from './tones';
import { Glass, IconButton } from './ui';

export function CameraToolbar() {
  const controls = useUiStore((s) => s.controls);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const buildMode = useUiStore((s) => s.buildMode);
  const setBuildMode = useUiStore((s) => s.setBuildMode);
  const yard = useUiStore((s) => s.yard);
  const openDrawer = useUiStore((s) => s.openDrawer);

  return (
    <Glass className="flex flex-col items-center gap-0.5 p-1">
      <IconButton label="Aproximar (+)" onClick={() => zoomStep(controls, 1)}>
        <Plus className="h-4 w-4" />
      </IconButton>
      <IconButton label="Afastar (−)" onClick={() => zoomStep(controls, -1)}>
        <Minus className="h-4 w-4" />
      </IconButton>
      <div className="my-0.5 h-px w-5 bg-line" />
      <IconButton label="Girar à esquerda (Q)" onClick={() => rotateQuarter(controls, -1)}>
        <RotateCcw className="h-4 w-4" />
      </IconButton>
      <IconButton label="Girar à direita (E)" onClick={() => rotateQuarter(controls, 1)}>
        <RotateCw className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={yard ? 'Enquadrar o pátio (H)' : 'Visão geral (H)'}
        onClick={() => {
          clearSelection();
          goHome(controls);
        }}
      >
        <Home className="h-4 w-4" />
      </IconButton>
      <div className="my-0.5 h-px w-5 bg-line" />
      <IconButton
        label={yard ? 'Nova atividade (B)' : buildMode ? 'Sair do modo construção (B)' : 'Modo construção (B)'}
        onClick={() => (yard ? openDrawer({ form: 'nova-atividade', idProjeto: yard }) : setBuildMode(!buildMode))}
        className={cx(buildMode && 'bg-brand text-white hover:bg-brand-hover hover:text-white')}
      >
        <Hammer className="h-4 w-4" />
      </IconButton>
    </Glass>
  );
}
