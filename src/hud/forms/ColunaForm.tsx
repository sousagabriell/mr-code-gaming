import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { useCriarColuna, useRemoverColuna, useRenomearColuna } from '../../api/kanban';
import { useKanbanQuery } from '../../api/queries';
import { useUiStore } from '../../store/uiStore';
import { Button } from '../ui';
import { Field, FormError, inputClass } from './fields';
import { applyServerErrors } from './serverErrors';

const schema = z.object({
  nome: z.string().trim().min(1, 'Dê um nome para a zona').max(80, 'Máximo de 80 caracteres'),
});
type FormValues = z.infer<typeof schema>;

/** Criar, renomear ou remover uma zona (coluna do Kanban). */
export function ColunaForm({ idProjeto, idColuna }: { idProjeto: number; idColuna?: number }) {
  const { data: colunas } = useKanbanQuery(idProjeto);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const criar = useCriarColuna();
  const renomear = useRenomearColuna();
  const remover = useRemoverColuna();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const coluna = idColuna ? colunas?.find((c) => c.idColuna === idColuna) : undefined;
  const ocupada = (coluna?.atividades.length ?? 0) > 0;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { nome: coluna?.nome ?? '' } });

  async function onSubmit({ nome }: FormValues) {
    setFormError(null);
    try {
      if (idColuna) await renomear.mutateAsync({ idProjeto, idColuna, nome });
      else await criar.mutateAsync({ idProjeto, nome });
      closeDrawer();
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['nome']));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={formError} />
        <Field label="Nome da zona" required error={errors.nome?.message} hint={idColuna ? undefined : 'A zona nova entra à direita das existentes.'}>
          <input className={inputClass} aria-invalid={!!errors.nome} autoFocus {...register('nome')} />
        </Field>

        {coluna?.ehColunaConclusao && (
          <p className="rounded-lg bg-ok-soft px-3 py-2 text-[12px] text-ok">
            Esta é a zona de expedição: caixas que chegam aqui contam como concluídas.
          </p>
        )}

        {idColuna && !coluna?.ehColunaConclusao && (
          <div className="mt-4 rounded-xl border border-line p-3">
            <p className="text-[12px] font-semibold text-ink">Remover zona</p>
            <p className="mt-0.5 text-[12px] text-ink-2">
              {ocupada ? 'Mova ou remova as caixas desta zona antes de removê-la.' : 'A zona está vazia e pode ser removida.'}
            </p>
            <Button
              type="button"
              variant="danger"
              className="mt-2"
              disabled={ocupada || remover.isPending}
              onClick={() => {
                if (!confirmando) return setConfirmando(true);
                remover.mutate({ idProjeto, idColuna }, { onSuccess: closeDrawer });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> {confirmando ? 'Confirmar remoção' : 'Remover zona'}
            </Button>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : idColuna ? 'Renomear' : 'Pintar zona'}
        </Button>
      </div>
    </form>
  );
}
