import { useState, type ReactNode } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { useConverterChamado } from '../../api/kanban';
import { useKanbanQuery } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { toDateInput } from '../../lib/format';
import { usePhoneStore } from '../../store/phoneStore';
import { useUiStore } from '../../store/uiStore';
import { mensagemDePrazo, prazoInvalido } from '../../world/phone';
import { projetoCode } from '../../world/status';
import { Button } from '../ui';
import { Empty, ScreenHeader } from './parts';

const selectClass =
  'mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] text-ink outline-none transition focus:border-brand';

function Campo({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="text-[11px] font-semibold text-ink-2">
        {label}
        {required && <span className="text-bad"> *</span>}
      </span>
      {children}
    </label>
  );
}

/** Chamado → caixa no pátio. O prazo é obrigatório e vira a resposta automática no chat do cliente. */
export function ConverterScreen({ idChamado }: { idChamado: number }) {
  const { chamados, projetos } = useWorld();
  const voltar = usePhoneStore((s) => s.voltar);
  const setTab = usePhoneStore((s) => s.setTab);
  const enterYard = useUiStore((s) => s.enterYard);
  const converter = useConverterChamado();

  const chamado = chamados.find((c) => c.idChamado === idChamado);
  const candidatos = projetos.filter(
    (p) => p.idCliente === chamado?.idCliente && p.status !== 'Cancelado' && p.status !== 'Concluido'
  );
  const [idProjeto, setIdProjeto] = useState<number | null>(candidatos[0]?.idProjeto ?? null);
  const [idColuna, setIdColuna] = useState('');
  const [dataPrazo, setDataPrazo] = useState('');
  const [hoje] = useState(() => toDateInput(new Date()));
  const { data: colunas } = useKanbanQuery(idProjeto);
  const ordenadas = [...(colunas ?? [])].sort((a, b) => a.ordem - b.ordem);

  if (!chamado) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader title="Converter" onBack={voltar} />
        <Empty>Este chamado saiu da lista.</Empty>
      </div>
    );
  }

  const erroPrazo = prazoInvalido(dataPrazo);

  function confirmar() {
    if (!idProjeto || erroPrazo || !chamado) return;
    converter.mutate(
      { idChamado, idProjeto, idColuna: idColuna ? Number(idColuna) : null, dataPrazo, assunto: chamado.assunto },
      {
        onSuccess: ({ atividade }) => {
          setTab('chamados');
          enterYard(idProjeto, atividade?.idAtividade ? { kind: 'atividade', id: atividade.idAtividade } : undefined);
        },
      }
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader title="Converter em tarefa" subtitle={chamado.protocolo} onBack={voltar} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2">
        <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2">
          <p className="text-[12px] font-semibold leading-snug text-ink">{chamado.assunto}</p>
          <p className="text-[11px] text-ink-2">{chamado.clienteNome}</p>
        </div>

        {candidatos.length === 0 ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-[11.5px] leading-relaxed text-warn">
            Este cliente não tem projeto em andamento. Abra um canteiro de obras para ele primeiro.
          </p>
        ) : (
          <>
            <Campo label="Projeto (pátio de destino)" required>
              <select
                className={selectClass}
                value={idProjeto ?? ''}
                onChange={(e) => {
                  setIdProjeto(Number(e.target.value));
                  setIdColuna('');
                }}
              >
                {candidatos.map((p) => (
                  <option key={p.idProjeto} value={p.idProjeto}>
                    {projetoCode(p.idProjeto)} · {p.nome}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Zona">
              <select className={selectClass} value={idColuna} onChange={(e) => setIdColuna(e.target.value)}>
                <option value="">Primeira zona</option>
                {ordenadas.map((c) => (
                  <option key={c.idColuna} value={c.idColuna}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Prazo de atendimento" required>
              <input
                type="date"
                className={selectClass}
                value={dataPrazo}
                min={hoje}
                aria-invalid={!!dataPrazo && !!erroPrazo}
                onChange={(e) => setDataPrazo(e.target.value)}
              />
              {dataPrazo && erroPrazo ? (
                <span className="mt-1 block text-[10.5px] font-medium text-bad">{erroPrazo}</span>
              ) : (
                <span className="mt-1 block text-[10.5px] leading-snug text-ink-3">
                  {dataPrazo
                    ? `O cliente recebe no chat: “${mensagemDePrazo(chamado.assunto, dataPrazo)}”`
                    : 'Sem prazo não dá para converter — é ele que vira o aviso no chat do cliente.'}
                </span>
              )}
            </Campo>

            <Button
              variant="primary"
              className="w-full"
              disabled={!idProjeto || !!erroPrazo || converter.isPending}
              onClick={confirmar}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              {converter.isPending ? 'Descarregando…' : 'Converter e ir ao pátio'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
