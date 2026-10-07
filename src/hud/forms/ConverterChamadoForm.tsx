import { useState } from 'react';
import { useConverterChamado } from '../../api/kanban';
import { useKanbanQuery } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { useUiStore } from '../../store/uiStore';
import { projetoCode } from '../../world/status';
import { Button } from '../ui';
import { Field, inputClass } from './fields';

/** Chamado → atividade no pátio de um projeto do mesmo cliente ("o caminhão descarrega"). */
export function ConverterChamadoForm({ idChamado }: { idChamado: number }) {
  const { chamados, projetos } = useWorld();
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const enterYard = useUiStore((s) => s.enterYard);
  const converter = useConverterChamado();

  const chamado = chamados.find((c) => c.idChamado === idChamado);
  const candidatos = projetos.filter((p) => p.idCliente === chamado?.idCliente && p.status !== 'Cancelado' && p.status !== 'Concluido');
  const [idProjeto, setIdProjeto] = useState<number | null>(candidatos[0]?.idProjeto ?? null);
  const [idColuna, setIdColuna] = useState<string>('');
  const { data: colunas } = useKanbanQuery(idProjeto);
  const ordenadas = [...(colunas ?? [])].sort((a, b) => a.ordem - b.ordem);

  if (!chamado) return null;

  function confirmar() {
    if (!idProjeto) return;
    converter.mutate(
      { idChamado, idProjeto, idColuna: idColuna ? Number(idColuna) : null },
      {
        onSuccess: (atividade) => {
          closeDrawer();
          // Leva direto ao pátio, com a caixa nova selecionada.
          enterYard(idProjeto, atividade?.idAtividade ? { kind: 'atividade', id: atividade.idAtividade } : undefined);
        },
      }
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 rounded-xl bg-surface-2 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{chamado.protocolo}</p>
          <p className="text-[13px] font-semibold text-ink">{chamado.assunto}</p>
          <p className="text-[12px] text-ink-2">{chamado.clienteNome}</p>
        </div>

        {candidatos.length === 0 ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-[12px] text-warn">
            Este cliente não tem projeto em andamento. Abra um canteiro de obras para ele primeiro.
          </p>
        ) : (
          <>
            <Field label="Projeto (pátio de destino)" required>
              <select
                className={inputClass}
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
            </Field>
            <Field label="Zona" hint="Em branco = primeira zona do quadro.">
              <select className={inputClass} value={idColuna} onChange={(e) => setIdColuna(e.target.value)}>
                <option value="">Primeira zona</option>
                {ordenadas.map((c) => (
                  <option key={c.idColuna} value={c.idColuna}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={!idProjeto || converter.isPending} onClick={confirmar}>
          {converter.isPending ? 'Descarregando…' : 'Converter e ir ao pátio'}
        </Button>
      </div>
    </div>
  );
}
