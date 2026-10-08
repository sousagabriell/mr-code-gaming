import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useWorld } from '../../hooks/useWorld';
import { formatRelative } from '../../lib/format';
import { usePhoneStore } from '../../store/phoneStore';
import { conversas } from '../../world/phone';
import { Empty, ScreenHeader } from './parts';

/** Duas primeiras iniciais do nome — o "avatar" da conversa. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] ?? '?').concat(partes[1]?.[0] ?? '').toUpperCase();
}

/** Uma conversa por cliente; as threads dos chamados dele são carregadas ao abrir. */
export function ChatScreen() {
  const { clientes, chamados } = useWorld();
  const push = usePhoneStore((s) => s.push);
  const lista = useMemo(() => conversas(clientes, chamados), [clientes, chamados]);
  const comConversa = lista.filter((c) => c.ultimo).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader title="Chat" subtitle={`${comConversa} de ${lista.length} clientes com chamado`} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-2">
        {lista.length === 0 ? (
          <Empty>Nenhum cliente na cidade ainda.</Empty>
        ) : (
          lista.map((c) => (
            <button
              key={c.idCliente}
              onClick={() => push({ nome: 'conversa', idCliente: c.idCliente })}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                {iniciais(c.nome)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold leading-snug text-ink">{c.nome}</span>
                <span className="block truncate text-[10.5px] text-ink-3">
                  {c.ultimo?.assunto ?? 'Sem chamados — nada a conversar ainda.'}
                </span>
              </span>
              {c.abertos > 0 && (
                <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white tabular">
                  {c.abertos}
                </span>
              )}
              {c.ultimo && (
                <span className="shrink-0 text-[10px] text-ink-3">
                  {formatRelative(c.ultimo.dataHoraUltimaAtualizacao)}
                </span>
              )}
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
