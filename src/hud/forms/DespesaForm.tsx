import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAtualizarDespesa, useCriarDespesa } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { toDateInput } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { categoriasDe } from '../../world/extrato';
import { Button } from '../ui';
import { Field, FormError, inputClass } from './fields';
import { applyServerErrors } from './serverErrors';

const schema = z.object({
  descricao: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(300, 'Máximo de 300 caracteres'),
  categoria: z.string().trim().min(2, 'Informe a categoria').max(80, 'Máximo de 80 caracteres'),
  valor: z.coerce.number<string>().positive('O valor precisa ser maior que zero'),
  dataDespesa: z.string().min(1, 'Informe a data'),
  recorrente: z.boolean(),
  observacoes: z.string().trim().max(2000, 'Máximo de 2000 caracteres'),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;
const FIELDS = ['descricao', 'categoria', 'valor', 'dataDespesa', 'recorrente', 'observacoes'];

/** Lançar ou corrigir uma despesa — o que sai do caixa da cidade. */
export function DespesaForm({ idDespesa }: { idDespesa?: number }) {
  const { despesas } = useWorld();
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const criar = useCriarDespesa();
  const atualizar = useAtualizarDespesa();
  const [formError, setFormError] = useState<string | null>(null);

  const atual = idDespesa ? despesas.find((d) => d.idDespesa === idDespesa) : undefined;
  // Sugere as categorias que já existem — o backend aceita texto livre.
  const categorias = categoriasDe(despesas);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      descricao: atual?.descricao ?? '',
      categoria: atual?.categoria ?? '',
      valor: atual ? String(atual.valor) : '',
      dataDespesa: atual ? atual.dataDespesa.slice(0, 10) : toDateInput(new Date()),
      recorrente: atual?.recorrente ?? false,
      observacoes: atual?.observacoes ?? '',
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const dto = {
      descricao: values.descricao,
      categoria: values.categoria,
      valor: values.valor,
      dataDespesa: `${values.dataDespesa}T00:00:00`,
      recorrente: values.recorrente,
      observacoes: values.observacoes || null,
    };
    try {
      if (idDespesa) await atualizar.mutateAsync({ id: idDespesa, dto });
      else await criar.mutateAsync(dto);
      closeDrawer();
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={formError} />
        <Field label="Descrição" required error={errors.descricao?.message}>
          <input className={inputClass} aria-invalid={!!errors.descricao} autoFocus {...register('descricao')} />
        </Field>
        <Field label="Categoria" required error={errors.categoria?.message} hint="Texto livre; a lista sugere as já usadas.">
          <input className={inputClass} list="categorias-despesa" aria-invalid={!!errors.categoria} {...register('categoria')} />
          <datalist id="categorias-despesa">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" required error={errors.valor?.message}>
            <input className={inputClass} type="number" step="0.01" min="0" aria-invalid={!!errors.valor} {...register('valor')} />
          </Field>
          <Field label="Data" required error={errors.dataDespesa?.message}>
            <input className={inputClass} type="date" {...register('dataDespesa')} />
          </Field>
        </div>
        <label className="mb-3 flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-brand" {...register('recorrente')} />
          <span className="text-[12px] font-semibold text-ink-2">
            Recorrente
            <span className="ml-1 font-medium text-ink-3">— entra no “Gerar recorrentes” todo mês</span>
          </span>
        </label>
        <Field label="Observações" error={errors.observacoes?.message}>
          <textarea className={inputClass} rows={3} {...register('observacoes')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : idDespesa ? 'Salvar' : 'Lançar despesa'}
        </Button>
      </div>
    </form>
  );
}
