import { useCallback, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useMarcarNotificacaoLida, useMarcarTodasLidas } from '../api/mutations';
import { useNotificacoesQuery } from '../api/queries';
import { formatRelative } from '../lib/format';
import { useUiStore } from '../store/uiStore';
import type { NotificacaoDTO } from '../types/domain';
import { cx } from './tones';
import { useClickOutside } from './useClickOutside';

export function NotificationBell() {
  const { data: notificacoes = [] } = useNotificacoesQuery();
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasLidas();
  const select = useUiStore((s) => s.select);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const naoLidas = notificacoes.filter((n) => !n.lida);

  function abrir(n: NotificacaoDTO) {
    if (!n.lida) marcarLida.mutate(n.idNotificacao);
    if (n.idChamado) select({ kind: 'chamado', id: n.idChamado });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-2 hover:bg-white/70 hover:text-ink"
        aria-label={`Notificações (${naoLidas.length} não lidas)`}
      >
        <Bell className="h-5 w-5" />
        {naoLidas.length > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold text-white ring-2 ring-page">
            {naoLidas.length > 9 ? '9+' : naoLidas.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-line bg-white shadow-float">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[13px] font-semibold text-ink">Notificações</span>
            {naoLidas.length > 0 && (
              <button
                onClick={() => marcarTodas.mutate()}
                className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto p-1.5">
            {notificacoes.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-ink-3">Nada por aqui.</p>}
            {notificacoes.map((n) => (
              <button
                key={n.idNotificacao}
                onClick={() => abrir(n)}
                className={cx('flex w-full gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2', !n.lida && 'bg-brand-soft/40')}
              >
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.lida ? 'bg-transparent' : 'bg-brand')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">{n.titulo}</span>
                  <span className="line-clamp-2 block text-[12px] text-ink-2">{n.mensagem}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-3">{formatRelative(n.dataCriacao)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
