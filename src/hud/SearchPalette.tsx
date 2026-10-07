import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Building2, Construction, Receipt, Search, Ticket, User } from 'lucide-react';
import { useWorld } from '../hooks/useWorld';
import { formatBRL } from '../lib/format';
import { useUiStore, type EntityRef } from '../store/uiStore';
import { clienteCode, clienteNome, label, projetoCode } from '../world/status';
import { cx } from './tones';
import { StatusChip } from './ui';

interface Result {
  key: string;
  group: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  status?: string;
  target: EntityRef;
}

/** Remove acentos e caixa para a busca casar "clinica" com "Clínica". */
function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const ICON_CLASS = 'h-4 w-4';

/** Montado do zero a cada abertura — busca e item ativo começam limpos. */
export function SearchPalette() {
  const open = useUiStore((s) => s.searchOpen);
  return open ? <PaletteBody /> : null;
}

function PaletteBody() {
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const select = useUiStore((s) => s.select);
  const world = useWorld();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo<Result[]>(() => {
    const q = norm(query.trim());
    const match = (...fields: (string | null | undefined)[]) => !q || fields.some((f) => norm(f).includes(q));

    const all: Result[] = [
      ...world.clientes
        .filter((c) => match(c.razaoSocial, c.nomeFantasia, c.cpfCnpj, clienteCode(c.idCliente)))
        .map<Result>((c) => ({
          key: `c${c.idCliente}`,
          group: 'Clientes',
          icon: <Building2 className={ICON_CLASS} />,
          title: clienteNome(c),
          subtitle: `${clienteCode(c.idCliente)} · ${c.cpfCnpj}`,
          status: c.status,
          target: { kind: 'cliente', id: c.idCliente },
        })),
      ...world.projetos
        .filter((p) => match(p.nome, p.clienteNome, projetoCode(p.idProjeto)))
        .map<Result>((p) => ({
          key: `p${p.idProjeto}`,
          group: 'Projetos',
          icon: <Construction className={ICON_CLASS} />,
          title: p.nome,
          subtitle: `${projetoCode(p.idProjeto)} · ${p.clienteNome}`,
          status: p.status,
          target: { kind: 'projeto', id: p.idProjeto },
        })),
      ...world.chamados
        .filter((c) => match(c.protocolo, c.assunto, c.clienteNome, c.usuarioNome))
        .map<Result>((c) => ({
          key: `ch${c.idChamado}`,
          group: 'Chamados',
          icon: <Ticket className={ICON_CLASS} />,
          title: c.assunto,
          subtitle: `${c.protocolo} · ${c.clienteNome ?? c.origem} · ${label(c.prioridade)}`,
          status: c.status,
          target: { kind: 'chamado', id: c.idChamado },
        })),
      ...world.faturas
        .filter((f) => match(f.numeroFatura, f.clienteNome, f.descricao))
        .map<Result>((f) => ({
          key: `f${f.idFatura}`,
          group: 'Faturas',
          icon: <Receipt className={ICON_CLASS} />,
          title: f.numeroFatura,
          subtitle: `${f.clienteNome} · ${formatBRL(f.valor)}`,
          status: f.status,
          target: { kind: 'fatura', id: f.idFatura },
        })),
      ...world.colaboradores
        .filter((c) => match(c.nome, c.email, c.cargo))
        .map<Result>((c) => ({
          key: `u${c.idUsuarioAdmin}`,
          group: 'Equipe',
          icon: <User className={ICON_CLASS} />,
          title: c.nome,
          subtitle: c.cargo ?? label(c.tipoUsuario),
          status: c.ativo ? 'Ativo' : 'Inativo',
          target: { kind: 'colaborador', id: c.idUsuarioAdmin },
        })),
      ...world.wikiPaginas
        .filter((w) => match(w.titulo, w.autorNome))
        .map<Result>((w) => ({
          key: `w${w.idPagina}`,
          group: 'Wiki',
          icon: <BookOpen className={ICON_CLASS} />,
          title: w.titulo,
          subtitle: `por ${w.autorNome}`,
          target: { kind: 'universidade' },
        })),
    ];

    // Sem busca: mostra um pouco de cada grupo; com busca: até 30 resultados.
    if (!q) {
      const perGroup = new Map<string, number>();
      return all.filter((r) => {
        const n = perGroup.get(r.group) ?? 0;
        perGroup.set(r.group, n + 1);
        return n < 3;
      });
    }
    return all.slice(0, 30);
  }, [query, world]);

  function choose(r: Result | undefined) {
    if (!r) return;
    select(r.target);
    setOpen(false);
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex justify-center bg-ink/20 px-4 pt-[12vh] backdrop-blur-[2px]" onPointerDown={() => setOpen(false)}>
      <div
        className="flex h-fit max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-float"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') {
                choose(results[active]);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder="Buscar clientes, projetos, chamados, faturas, pessoas…"
            className="h-12 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
          <kbd className="rounded-md border border-line bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-2">esc</kbd>
        </div>

        <div className="overflow-y-auto p-1.5">
          {results.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-ink-3">Nada encontrado para “{query}”.</p>}
          {results.map((r, i) => (
            <div key={r.key}>
              {(i === 0 || results[i - 1].group !== r.group) && (
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">{r.group}</p>
              )}
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className={cx('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left', i === active && 'bg-brand-soft/70')}
              >
                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', i === active ? 'bg-brand text-white' : 'bg-surface-2 text-ink-2')}>
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{r.title}</span>
                  <span className="block truncate text-[11px] text-ink-3">{r.subtitle}</span>
                </span>
                {r.status && <StatusChip status={r.status} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
