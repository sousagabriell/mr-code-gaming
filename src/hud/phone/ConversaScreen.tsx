import { useEffect, useMemo, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { useEnviarMensagem } from '../../api/mutations';
import { useMensagensDoCliente } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { formatClock, formatDateShort, stripHtml } from '../../lib/format';
import { usePhoneStore } from '../../store/phoneStore';
import { blocosDaConversa, conversas } from '../../world/phone';
import { cx } from '../tones';
import { Empty, ScreenHeader } from './parts';

/**
 * A conversa de um cliente: as threads de todos os chamados dele numa linha do tempo só, com um
 * separador de protocolo a cada troca de assunto. O `POST` é por chamado, então a resposta sempre
 * tem um alvo explícito — por padrão, a thread do último bloco.
 */
export function ConversaScreen({ idCliente }: { idCliente: number }) {
  const { clientes, chamados } = useWorld();
  const voltar = usePhoneStore((s) => s.voltar);
  const push = usePhoneStore((s) => s.push);
  const enviar = useEnviarMensagem();

  const conversa = useMemo(
    () => conversas(clientes, chamados).find((c) => c.idCliente === idCliente),
    [clientes, chamados, idCliente]
  );
  const ids = useMemo(() => conversa?.chamados.map((c) => c.idChamado) ?? [], [conversa]);
  const { mensagens, isLoading } = useMensagensDoCliente(ids);
  const blocos = useMemo(() => blocosDaConversa(mensagens, conversa?.chamados ?? []), [mensagens, conversa]);

  const [texto, setTexto] = useState('');
  const [alvoEscolhido, setAlvoEscolhido] = useState<number | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  // Thread que recebe a resposta: a escolhida, senão a do último bloco, senão o chamado mais recente.
  const idAlvo = alvoEscolhido ?? blocos[blocos.length - 1]?.idChamado ?? conversa?.ultimo?.idChamado ?? null;
  const alvo = conversa?.chamados.find((c) => c.idChamado === idAlvo) ?? null;

  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
  }, [blocos]);

  if (!conversa) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader title="Conversa" onBack={voltar} />
        <Empty>Este cliente saiu da cidade.</Empty>
      </div>
    );
  }

  function mandar() {
    const limpo = texto.trim();
    if (!limpo || !idAlvo || enviar.isPending) return;
    enviar.mutate({ idChamado: idAlvo, texto: limpo }, { onSuccess: () => setTexto('') });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        title={conversa.nome}
        subtitle={`${conversa.chamados.length} chamado${conversa.chamados.length === 1 ? '' : 's'} · ${conversa.abertos} aberto${conversa.abertos === 1 ? '' : 's'}`}
        onBack={voltar}
      />

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2">
        {blocos.length === 0 ? (
          <Empty>
            {isLoading
              ? 'Carregando a conversa…'
              : conversa.chamados.length === 0
                ? 'Sem chamados deste cliente — a conversa começa quando ele abrir um.'
                : 'Nenhuma mensagem nas threads deste cliente ainda.'}
          </Empty>
        ) : (
          blocos.map((bloco, i) => (
            <div key={`${bloco.idChamado}-${i}`} className="space-y-1.5">
              <button
                onClick={() => push({ nome: 'chamado', idChamado: bloco.idChamado })}
                className="mx-auto flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[9.5px] font-semibold text-ink-3 transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <span className="shrink-0">{bloco.protocolo.slice(-6)}</span>
                <span className="truncate">· {bloco.assunto}</span>
              </button>
              {bloco.mensagens.map((m) => (
                <div key={m.idMensagem} className={cx('flex', m.autorEhAdmin ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cx(
                      'max-w-[85%] rounded-2xl px-2.5 py-1.5',
                      m.autorEhAdmin ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-surface-2 text-ink'
                    )}
                  >
                    {!m.autorEhAdmin && (
                      <span className="block text-[9.5px] font-semibold text-ink-3">{m.autorNome}</span>
                    )}
                    <p className="whitespace-pre-line text-[12px] leading-snug">{stripHtml(m.conteudoHtml)}</p>
                    <span
                      className={cx(
                        'mt-0.5 block text-right text-[9px] tabular',
                        m.autorEhAdmin ? 'text-white/70' : 'text-ink-3'
                      )}
                    >
                      {formatDateShort(m.dataCriacao)} {formatClock(new Date(m.dataCriacao))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={fim} />
      </div>

      {conversa.chamados.length > 1 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-line px-2 py-1">
          {conversa.chamados.map((c) => (
            <button
              key={c.idChamado}
              onClick={() => setAlvoEscolhido(c.idChamado)}
              className={cx(
                'shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold transition-colors',
                c.idChamado === idAlvo ? 'bg-brand text-white' : 'bg-surface-2 text-ink-3 hover:text-ink'
              )}
            >
              {c.protocolo.slice(-6)}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 border-t border-line px-2 py-1.5">
        <div className="flex items-end gap-1.5">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                mandar();
              }
              // O Esc global limpa a seleção da cidade antes de olhar se alguém está digitando.
              if (e.key === 'Escape') {
                e.stopPropagation();
                e.currentTarget.blur();
              }
            }}
            disabled={!alvo}
            placeholder={alvo ? `Responder em ${alvo.protocolo.slice(-6)}` : 'Sem chamado para responder'}
            aria-label="Escrever mensagem para o cliente"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[12px] text-ink outline-none transition focus:border-brand disabled:text-ink-3"
          />
          <button
            onClick={mandar}
            disabled={!alvo || !texto.trim() || enviar.isPending}
            aria-label="Enviar mensagem"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
