import { ArrowLeft, ExternalLink, University } from 'lucide-react';
import { environment } from '../../config/environment';
import { useWorld } from '../../hooks/useWorld';
import { formatRelative } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { Button, Glass, IconTile } from '../ui';

/** Canto inferior esquerdo da biblioteca: identidade, tamanho do acervo e a saída para a cidade. */
export function LibraryBar() {
  const { wikiPaginas, wikiDeExemplo } = useWorld();
  const exitInterior = useUiStore((s) => s.exitInterior);
  const ultimo = [...wikiPaginas].sort((a, b) => b.dataAtualizacao.localeCompare(a.dataAtualizacao))[0];

  return (
    <Glass className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 p-4">
      <div className="flex min-w-[220px] flex-1 items-center gap-3">
        <IconTile>
          <University className="h-5 w-5" />
        </IconTile>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand">
            Biblioteca · UN
            {/* Acervo de exemplo (dev): precisa estar na cara, não escondido num tooltip. */}
            {wikiDeExemplo && (
              <span
                title="Acervo de exemplo: a wiki deste ambiente está vazia. Nada aqui vem do MrCodeAdmin."
                className="rounded-full bg-warn-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warn"
              >
                exemplo
              </span>
            )}
          </p>
          <p className="truncate text-[15px] font-bold text-ink">Universidade</p>
          <p className="truncate text-[12px] text-ink-2">
            {wikiPaginas.length} artigo{wikiPaginas.length === 1 ? '' : 's'}
            {ultimo && ` · último ${formatRelative(ultimo.dataAtualizacao)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => exitInterior()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Cidade
        </Button>
        {/* Publicar e editar continuam no portal: o editor rico com imagens não vive aqui (§11). */}
        <a
          href={`${environment.adminUrl}/wiki/novo`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          title="Publicar um artigo no MrCodeAdmin"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Novo artigo
        </a>
      </div>
    </Glass>
  );
}
