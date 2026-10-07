import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCriarProjeto } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { toDateInput } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';
import { clienteCode, clienteNome } from '../../world/status';
import { Button } from '../ui';
import { Field, FormError, inputClass, PrioridadePicker } from './fields';
import { applyServerErrors } from './serverErrors';

const schema = z
  .object({
    idCliente: z.coerce.number<string>().int().positive('Escolha o cliente'),
    nome: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(200, 'Máximo de 200 caracteres'),
    descricao: z.string().trim().max(2000, 'Máximo de 2000 caracteres'),
    dataInicio: z.string().min(1, 'Informe o início'),
    dataPrevisaoFim: z.string().min(1, 'Informe a previsão'),
    prioridade: z.enum(['Baixa', 'Media', 'Alta']),
  })
  .refine((v) => v.dataPrevisaoFim >= v.dataInicio, {
    path: ['dataPrevisaoFim'],
    message: 'A previsão deve ser igual ou posterior ao início',
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;
const FIELDS = ['idCliente', 'nome', 'descricao', 'dataInicio', 'dataPrevisaoFim', 'prioridade'];

const daysFromNow = (n: number) => toDateInput(new Date(Date.now() + n * 86_400_000));

export function ProjetoForm({ idCliente }: { idCliente?: number }) {
  const { clientes } = useWorld();
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const select = useUiStore((s) => s.select);
  const criar = useCriarProjeto();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      idCliente: idCliente ? String(idCliente) : '',
      nome: '',
      descricao: '',
      dataInicio: daysFromNow(0),
      dataPrevisaoFim: daysFromNow(60),
      prioridade: 'Media',
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const novo = await criar.mutateAsync({
        ...values,
        descricao: values.descricao || null,
        dataInicio: `${values.dataInicio}T00:00:00`,
        dataPrevisaoFim: `${values.dataPrevisaoFim}T00:00:00`,
      });
      closeDrawer();
      if (novo?.idProjeto) select({ kind: 'projeto', id: novo.idProjeto });
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  }

  const ativos = [...clientes].filter((c) => c.status === 'Ativo').sort((a, b) => clienteNome(a).localeCompare(clienteNome(b)));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={formError} />
        <Field label="Cliente (lote)" required error={errors.idCliente?.message}>
          <select className={inputClass} aria-invalid={!!errors.idCliente} {...register('idCliente')}>
            <option value="">Escolha…</option>
            {ativos.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {clienteCode(c.idCliente)} · {clienteNome(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome do projeto" required error={errors.nome?.message}>
          <input className={inputClass} aria-invalid={!!errors.nome} autoFocus {...register('nome')} />
        </Field>
        <Field label="Descrição" error={errors.descricao?.message}>
          <textarea className={inputClass} rows={3} {...register('descricao')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" required error={errors.dataInicio?.message}>
            <input className={inputClass} type="date" {...register('dataInicio')} />
          </Field>
          <Field label="Previsão de entrega" required error={errors.dataPrevisaoFim?.message}>
            <input className={inputClass} type="date" aria-invalid={!!errors.dataPrevisaoFim} {...register('dataPrevisaoFim')} />
          </Field>
        </div>
        <Field label="Prioridade" required>
          <Controller
            control={control}
            name="prioridade"
            render={({ field }) => <PrioridadePicker value={field.value} onChange={field.onChange} />}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Abrindo…' : 'Abrir canteiro'}
        </Button>
      </div>
    </form>
  );
}
