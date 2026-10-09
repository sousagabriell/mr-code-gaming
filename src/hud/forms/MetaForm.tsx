import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useWorld } from '../../hooks/useWorld';
import { useMetasStore } from '../../store/metasStore';
import { useUiStore } from '../../store/uiStore';
import { diaISOEm, hojeISO } from '../../world/datas';
import {
  aceitaResponsavel,
  erroDaMeta,
  METRICA_EM_REAIS,
  METRICA_LABEL,
  METRICAS,
  RECOMPENSA_MAX,
  type MetaMetrica,
  type RascunhoMeta,
} from '../../world/metas';
import { Button } from '../ui';
import { Field, FormError, inputClass } from './fields';

/**
 * Criar ou editar uma meta da Prefeitura.
 *
 * Sem `react-hook-form` + zod aqui, ao contrário dos outros formulários: aqueles falam com a API e
 * precisam casar erros de campo vindos do servidor (`applyServerErrors`). Este grava num store local
 * e a validação já existe pura e testada em `erroDaMeta` — um segundo esquema só criaria duas fontes
 * de verdade para a mesma regra.
 */
export function MetaForm({ id }: { id?: string }) {
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const { colaboradores } = useWorld();
  const metas = useMetasStore((s) => s.metas);
  const cumpridas = useMetasStore((s) => s.cumpridas);
  const criar = useMetasStore((s) => s.criar);
  const atualizar = useMetasStore((s) => s.atualizar);
  const remover = useMetasStore((s) => s.remover);

  const existente = id ? metas.find((m) => m.id === id) : undefined;
  const registro = id ? cumpridas[id] : undefined;

  const [v, setV] = useState<RascunhoMeta>(() =>
    existente
      ? {
          titulo: existente.titulo,
          metrica: existente.metrica,
          alvo: existente.alvo,
          inicio: existente.inicio,
          fim: existente.fim,
          recompensa: existente.recompensa,
          idResponsavel: existente.idResponsavel,
          nomeResponsavel: existente.nomeResponsavel,
        }
      : {
          titulo: '',
          metrica: 'chamados',
          alvo: 10,
          inicio: hojeISO(),
          fim: diaISOEm(30),
          recompensa: 200,
          idResponsavel: null,
          nomeResponsavel: null,
        }
  );
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const ativos = colaboradores.filter((c) => c.ativo);
  const comResponsavel = aceitaResponsavel(v.metrica);
  const emReais = METRICA_EM_REAIS(v.metrica);

  /** Trocar para uma métrica sem responsável derruba a pessoa escolhida — senão a meta nasce inválida. */
  const trocarMetrica = (metrica: MetaMetrica) =>
    setV((a) =>
      aceitaResponsavel(metrica) ? { ...a, metrica } : { ...a, metrica, idResponsavel: null, nomeResponsavel: null }
    );

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const problema = erroDaMeta(v);
    setErro(problema);
    if (problema) return;
    if (existente) atualizar(existente.id, v);
    else criar(v);
    closeDrawer();
  }

  return (
    <form onSubmit={salvar} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={erro} />

        <Field label="Nome da meta" required hint="O que a equipe combinou — aparece na Prefeitura e no painel do jogo.">
          <input
            className={inputClass}
            autoFocus
            value={v.titulo}
            placeholder="Zerar a fila de chamados até o fim do mês"
            onChange={(e) => setV((a) => ({ ...a, titulo: e.target.value }))}
          />
        </Field>

        <Field label="O que medir" required>
          <select className={inputClass} value={v.metrica} onChange={(e) => trocarMetrica(e.target.value as MetaMetrica)}>
            {METRICAS.map((m) => (
              <option key={m} value={m}>
                {METRICA_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>

        {/* Só chamados e atividades têm responsável no backend — nas outras o campo nem aparece. */}
        {comResponsavel && ativos.length > 0 && (
          <Field label="De quem é a meta" hint="Deixe em “A cidade inteira” para somar o time todo.">
            <select
              className={inputClass}
              value={v.idResponsavel ?? ''}
              onChange={(e) => {
                const idSel = e.target.value ? Number(e.target.value) : null;
                setV((a) => ({
                  ...a,
                  idResponsavel: idSel,
                  nomeResponsavel: ativos.find((c) => c.idUsuarioAdmin === idSel)?.nome ?? null,
                }));
              }}
            >
              <option value="">A cidade inteira</option>
              {ativos.map((c) => (
                <option key={c.idUsuarioAdmin} value={c.idUsuarioAdmin}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-x-3">
          <Field label={emReais ? 'Alvo (R$)' : 'Alvo'} required>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={v.alvo}
              onChange={(e) => setV((a) => ({ ...a, alvo: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Recompensa (XP)" required hint={`Até ${RECOMPENSA_MAX} XP.`}>
            <input
              type="number"
              min={0}
              max={RECOMPENSA_MAX}
              className={inputClass}
              value={v.recompensa}
              onChange={(e) => setV((a) => ({ ...a, recompensa: Number(e.target.value) }))}
            />
          </Field>
          <Field label="De" required>
            <input
              type="date"
              className={inputClass}
              value={v.inicio}
              onChange={(e) => setV((a) => ({ ...a, inicio: e.target.value }))}
            />
          </Field>
          <Field label="Até" required hint="O último dia conta.">
            <input
              type="date"
              className={inputClass}
              value={v.fim}
              onChange={(e) => setV((a) => ({ ...a, fim: e.target.value }))}
            />
          </Field>
        </div>

        <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-ink-2">
          O progresso sai dos dados reais do MrCodeAdmin, recortados por esta janela — nada é
          preenchido à mão. A meta e o registro de quem já bateu ficam <strong>neste navegador</strong>.
        </p>

        {existente && (
          <div className="mt-4 rounded-xl border border-line p-3">
            <p className="text-[12px] font-semibold text-ink">Remover meta</p>
            <p className="mt-0.5 text-[12px] text-ink-2">
              {registro
                ? `Esta meta já foi batida: removê-la devolve os ${registro.xp} XP de bônus que ela deu.`
                : 'A meta sai da Prefeitura e do painel do jogo.'}
            </p>
            <Button
              type="button"
              variant="danger"
              className="mt-2"
              onClick={() => {
                if (!confirmando) return setConfirmando(true);
                remover(existente.id);
                closeDrawer();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> {confirmando ? 'Confirmar remoção' : 'Remover meta'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {existente ? 'Salvar' : 'Criar meta'}
        </Button>
      </div>
    </form>
  );
}
