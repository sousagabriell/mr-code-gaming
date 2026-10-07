import type { ReactNode } from 'react';
import { Crosshair, ExternalLink, LocateFixed, X } from 'lucide-react';
import { environment } from '../../config/environment';
import { getMover } from '../../scene/movers';
import { entityKey, useUiStore } from '../../store/uiStore';
import { cx } from '../tones';
import { IconButton, IconTile } from '../ui';

/** Aproxima a câmera da seleção atual (botão ⌖ da referência). */
function useFocusSelected() {
  const selected = useUiStore((s) => s.selected);
  const select = useUiStore((s) => s.select);
  const controls = useUiStore((s) => s.controls);
  return () => {
    if (!selected) return;
    select(selected);
    setTimeout(() => controls?.dollyTo(8, true), 50);
  };
}

export function InspectorShell({
  icon,
  eyebrow,
  title,
  subtitle,
  adminPath,
  children,
  footer,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  /** Caminho no MrCodeAdmin (Angular) para edições que o jogo ainda não cobre. */
  adminPath?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const clearSelection = useUiStore((s) => s.clearSelection);
  const selected = useUiStore((s) => s.selected);
  const follow = useUiStore((s) => s.follow);
  const setFollow = useUiStore((s) => s.setFollow);
  const focus = useFocusSelected();
  // Caminhões e pedestres podem ser acompanhados pela câmera.
  const movable = !!selected && !!getMover(entityKey(selected));

  return (
    <div className="flex max-h-full flex-col">
      <div className="flex items-start gap-3 px-4 pt-4">
        <IconTile>{icon}</IconTile>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-brand">{eyebrow}</p>
          <h2 className="truncate text-[16px] font-bold leading-snug text-ink" title={title}>
            {title}
          </h2>
          {subtitle && <div className="truncate text-[12px] text-ink-2">{subtitle}</div>}
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 items-center">
          {movable ? (
            <IconButton
              label={follow ? 'Parar de seguir' : 'Seguir com a câmera'}
              aria-pressed={follow}
              onClick={() => setFollow(!follow)}
              className={cx(follow && 'bg-brand text-white hover:bg-brand-hover hover:text-white')}
            >
              <LocateFixed className="h-4 w-4" />
            </IconButton>
          ) : (
            <IconButton label="Focar" onClick={focus}>
              <Crosshair className="h-4 w-4" />
            </IconButton>
          )}
          {adminPath && (
            <a
              href={`${environment.adminUrl}${adminPath}`}
              target="_blank"
              rel="noreferrer"
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
              title="Abrir no MrCodeAdmin"
              aria-label="Abrir no MrCodeAdmin"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <IconButton label="Fechar (Esc)" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">{children}</div>
      {footer && <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">{footer}</div>}
    </div>
  );
}

/** Linha de chip de status + texto auxiliar, logo abaixo do cabeçalho. */
export function StatusLine({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2 text-[12px] text-ink-2">{children}</div>;
}
