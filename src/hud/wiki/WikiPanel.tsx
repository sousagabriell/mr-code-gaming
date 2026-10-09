import { useMemo, useState } from 'react';
import { BookOpen, Check, ChevronLeft, Copy, ExternalLink, Library, Pencil, Search, University, X } from 'lucide-react';
import { environment } from '../../config/environment';
import { useIsMobile } from '../../hooks/useIsMobile';
import { isReducedMotion } from '../../hooks/useReducedMotion';
import { useWorld } from '../../hooks/useWorld';
import { formatDate, formatRelative, resumo, stripHtml } from '../../lib/format';
import { WikiConteudo } from '../../lib/wikiContent';
import { useCityEvents } from '../../store/cityEvents';
import { toast } from '../../store/toastStore';
import { useUiStore } from '../../store/uiStore';
import { useWikiStore } from '../../store/wikiStore';
import type { WikiPaginaDTO } from '../../types/domain';
import { filtrarPaginas, prateleiras, type Prateleira } from '../../world/universidade';
import { cx } from '../tones';
import { Button, EmptyHint, Glass, IconButton, IconTile, KeyValue, Section } from '../ui';

/**
 * Painel da biblioteca, na coluna da direita — o mesmo lugar e a mesma largura do extrato da
 * agência (§10.3). Duas telas: a **biblioteca** (busca e o índice das prateleiras) e o **artigo**.
 *
 * A estante 3D e este painel leem o mesmo `wikiStore`: clicar numa lombada troca a tela daqui, e
 * digitar na busca tira livros de lá.
 *
 * O índice lista **todos** os artigos de cada prateleira, inclusive os que não couberam na prancha:
 * a estante é a navegação bonita, mas o painel é a navegação completa — e a única que funciona por
 * teclado, já que uma malha 3D não recebe foco.
 */
export function WikiPanel() {
  const aberto = useWikiStore((s) => s.aberto);
  const isMobile = useIsMobile();

  return (
    <Glass
      className={cx(
        'flex flex-col overflow-hidden',
        // No celular a folha do índice para na metade da tela (a estante é o resto da interface);
        // a do artigo sobe, porque aí o que importa é o texto. Mesma divisão do extrato (§10.3).
        isMobile
          ? cx('w-full rounded-b-none pb-[env(safe-area-inset-bottom)]', aberto === null ? 'max-h-[62dvh]' : 'max-h-[88dvh]')
          : 'max-h-full w-full'
      )}
    >
      {aberto === null ? <Biblioteca /> : <Artigo idPagina={aberto} />}
    </Glass>
  );
}

/**
 * Avisa que a estante está cheia de acervo de exemplo (só em dev). Dado falso que não se anuncia é
 * pior que estante vazia: quem vê a tela não tem como saber.
 */
function MockChip() {
  const { wikiDeExemplo } = useWorld();
  if (!wikiDeExemplo) return null;
  return (
    <span
      title="Acervo de exemplo: a wiki deste ambiente está vazia. Nada aqui vem do MrCodeAdmin."
      className="rounded-full bg-warn-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warn"
    >
      exemplo
    </span>
  );
}

function Biblioteca() {
  const exitInterior = useUiStore((s) => s.exitInterior);
  const { wikiPaginas, projetos } = useWorld();
  const busca = useWikiStore((s) => s.busca);
  const setBusca = useWikiStore((s) => s.setBusca);

  const visiveis = useMemo(() => filtrarPaginas(wikiPaginas, busca), [wikiPaginas, busca]);
  const estante = useMemo(() => prateleiras(visiveis, projetos), [visiveis, projetos]);

  return (
    <>
      <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
        <IconTile>
          <University className="h-5 w-5" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand">
            Wiki · UN
            <MockChip />
          </p>
          <h2 className="truncate text-[16px] font-bold leading-snug text-ink">Biblioteca</h2>
          <p className="text-[12px] text-ink-2">
            {wikiPaginas.length} artigo{wikiPaginas.length === 1 ? '' : 's'} em {estante.length} prateleira
            {estante.length === 1 ? '' : 's'}
          </p>
        </div>
        <a
          href={`${environment.adminUrl}/wiki`}
          target="_blank"
          rel="noreferrer"
          className="-mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
          title="Abrir a wiki no MrCodeAdmin"
          aria-label="Abrir a wiki no MrCodeAdmin"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <IconButton label="Voltar para a cidade (Esc)" onClick={() => exitInterior()} className="-mr-1 -mt-1">
          <X className="h-4 w-4" />
        </IconButton>
      </header>

      <div className="shrink-0 px-3 py-2">
        <label className="relative block">
          <span className="sr-only">Buscar artigos</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo título…"
            aria-label="Buscar artigos"
            className="w-full rounded-lg bg-surface-2 py-1.5 pl-8 pr-2.5 text-[12px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand/30"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {estante.length === 0 && (
          <EmptyHint>
            {busca.trim() ? 'Nenhum artigo com esse título.' : 'A biblioteca ainda está vazia.'}
          </EmptyHint>
        )}
        {estante.map((p) => (
          <Estante key={String(p.id)} prateleira={p} />
        ))}
      </div>
    </>
  );
}

/** Uma prateleira do índice: a etiqueta do nível e os artigos dela, inclusive os fora da prancha. */
function Estante({ prateleira }: { prateleira: Prateleira }) {
  const abrir = useWikiStore((s) => s.abrir);
  // `todas`, não `paginas`: a prancha da cena tem tamanho fixo, o índice do painel não.
  const naPrancha = new Set(prateleira.paginas.map((p) => p.idPagina));
  const todas = [...prateleira.todas].sort((a, b) => b.dataAtualizacao.localeCompare(a.dataAtualizacao));

  return (
    <Section
      title={`${prateleira.codigo} · ${prateleira.etiqueta}`}
      action={<span className="text-[11px] text-ink-3 tabular">{prateleira.total}</span>}
    >
      <div className="space-y-1">
        {todas.map((p) => (
          <button
            key={p.idPagina}
            onClick={() => abrir(p.idPagina)}
            className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
          >
            <span
              aria-hidden
              className="mt-1 h-7 w-1.5 shrink-0 rounded-full"
              style={{ background: prateleira.cor }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{p.titulo}</span>
              <span className="block truncate text-[11px] text-ink-2">
                {resumo(p.conteudo, 80) || `${p.autorNome} · ${formatRelative(p.dataAtualizacao)}`}
              </span>
            </span>
            {!naPrancha.has(p.idPagina) && (
              <span className="mt-0.5 shrink-0 text-[10px] text-ink-3" title="Não cabe na prateleira da cena">
                fora da prancha
              </span>
            )}
            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
          </button>
        ))}
        {prateleira.ocultos > 0 && (
          <p className="px-2.5 pt-1 text-[11px] text-ink-3">
            {prateleira.ocultos} artigo{prateleira.ocultos === 1 ? '' : 's'} desta prateleira não{' '}
            {prateleira.ocultos === 1 ? 'cabe' : 'cabem'} na prancha da cena — mas {prateleira.ocultos === 1 ? 'está' : 'estão'} na
            lista acima.
          </p>
        )}
      </div>
    </Section>
  );
}

/**
 * Copia o artigo em texto puro para a área de transferência — e manda o leitor da cena comemorar,
 * como se tivesse memorizado o que acabou de ser levado.
 *
 * O **toast** não é redundante com a animação: o leitor não existe com movimento reduzido, e nem
 * sempre ele está no enquadramento. Confirmação de cópia não pode depender de olhar para a cena.
 */
function CopiarArtigo({ pagina }: { pagina: WikiPaginaDTO }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const texto = `${pagina.titulo}\n\n${stripHtml(pagina.conteudo)}`.trim();
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Sem permissão, fora de contexto seguro, ou a API nem existe no navegador.
      toast.bad('Não foi possível copiar', 'Selecione o texto e copie pelo teclado.');
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    toast.ok('Artigo copiado', pagina.titulo);
    if (!isReducedMotion()) {
      useCityEvents.getState().push({ id: `memo-${pagina.idPagina}`, kind: 'wiki-memo', titulo: pagina.titulo });
    }
  }

  return (
    <Button variant="secondary" onClick={copiar}>
      {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copiado ? 'Copiado' : 'Copiar'}
    </Button>
  );
}

/** O artigo, na mesma ordem do `wiki-detail` do portal. */
function Artigo({ idPagina }: { idPagina: number }) {
  const { wikiPaginas } = useWorld();
  const voltar = useWikiStore((s) => s.voltar);
  const pagina = wikiPaginas.find((p) => p.idPagina === idPagina);

  const cabecalho = (titulo: string, eyebrow: string) => (
    <header className="flex items-start gap-2 border-b border-line px-4 pb-3 pt-4">
      <IconButton label="Voltar para a biblioteca (Esc)" onClick={voltar} className="mt-0.5">
        <ChevronLeft className="h-5 w-5" />
      </IconButton>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-brand">{eyebrow}</p>
        <h2 className="text-[16px] font-bold leading-snug text-ink">{titulo}</h2>
      </div>
      {pagina && (
        <a
          href={`${environment.adminUrl}/wiki/${idPagina}`}
          target="_blank"
          rel="noreferrer"
          className="-mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
          title="Abrir no MrCodeAdmin"
          aria-label="Abrir no MrCodeAdmin"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </header>
  );

  // O "Live" revalida a cada 30 s: um artigo apagado no portal simplesmente sai da lista.
  if (!pagina) {
    return (
      <>
        {cabecalho('Artigo indisponível', 'Wiki · UN')}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <EmptyHint>Este artigo saiu da biblioteca — pode ter sido apagado no MrCodeAdmin.</EmptyHint>
          <div className="mt-3">
            <Button variant="secondary" onClick={voltar}>
              <Library className="h-3.5 w-3.5" /> Voltar para a estante
            </Button>
          </div>
        </div>
      </>
    );
  }

  const eyebrow = pagina.idProjeto ? `Projeto · ${pagina.projetoNome ?? 'sem nome'}` : 'Geral · Wiki';

  return (
    <>
      {cabecalho(pagina.titulo, eyebrow)}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Section title="Artigo">
          <KeyValue
            rows={[
              ['Autor', pagina.autorNome],
              ['Criado', formatDate(pagina.dataCriacao)],
              ['Atualizado', `${formatDate(pagina.dataAtualizacao)} · ${formatRelative(pagina.dataAtualizacao)}`],
              ['Projeto', pagina.projetoNome ?? 'Geral (sem projeto)'],
            ]}
          />
        </Section>
        <Section title="Conteúdo">
          <div className="rounded-xl bg-surface-2 px-3.5 py-3">
            {pagina.conteudo?.trim() ? (
              <WikiConteudo conteudo={pagina.conteudo} />
            ) : (
              <EmptyHint>Este artigo está sem conteúdo.</EmptyHint>
            )}
          </div>
        </Section>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        <CopiarArtigo pagina={pagina} />
        {/* Editar é no portal: o editor rico com upload de imagens não vive aqui dentro (§11). */}
        <a
          href={`${environment.adminUrl}/wiki/${idPagina}/editar`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar no MrCodeAdmin
        </a>
        <Button variant="secondary" onClick={voltar}>
          <Library className="h-3.5 w-3.5" /> Estante
        </Button>
      </div>
    </>
  );
}
