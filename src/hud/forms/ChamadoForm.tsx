import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCriarChamadoInterno } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { clienteCode, clienteNome } from '../../world/status';
import { Button } from '../ui';
import { Field, FormError, inputClass, PrioridadePicker } from './fields';
import { applyServerErrors } from './serverErrors';

const schema = z.object({
  idCliente: z.coerce.number<string>().int().positive('Escolha o cliente'),
  usuarioNome: z.string().trim().max(150, 'Máximo de 150 caracteres'),
  assunto: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(150, 'Máximo de 150 caracteres'),
  descricao: z.string().trim().min(10, 'Descreva com pelo menos 10 caracteres').max(4000, 'Máximo de 4000 caracteres'),
  prioridade: z.enum(['Baixa', 'Media', 'Alta']),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;
const FIELDS = Object.keys(schema.shape);

/** Chamado aberto pela equipe em nome do cliente (POST /Chamado/interno). */
export function ChamadoForm({ idCliente }: { idCliente?: number }) {
  const { clientes } = useWorld();
  const usuario = useAuthStore((s) => s.usuario);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const select = useUiStore((s) => s.select);
  const criar = useCriarChamadoInterno();
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
      usuarioNome: usuario?.nome ?? '',
      assunto: '',
      descricao: '',
      prioridade: 'Media',
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const novo = await criar.mutateAsync({ ...values, usuarioNome: values.usuarioNome || null });
      closeDrawer();
      if (novo?.idChamado) select({ kind: 'chamado', id: novo.idChamado });
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  }

  const ordenados = [...clientes].sort((a, b) => clienteNome(a).localeCompare(clienteNome(b)));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={formError} />
        <Field label="Cliente" required error={errors.idCliente?.message}>
          <select className={inputClass} aria-invalid={!!errors.idCliente} {...register('idCliente')}>
            <option value="">Escolha…</option>
            {ordenados.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {clienteCode(c.idCliente)} · {clienteNome(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assunto" required error={errors.assunto?.message}>
          <input className={inputClass} aria-invalid={!!errors.assunto} autoFocus {...register('assunto')} />
        </Field>
        <Field label="Descrição" required error={errors.descricao?.message}>
          <textarea className={inputClass} rows={5} aria-invalid={!!errors.descricao} {...register('descricao')} />
        </Field>
        <Field label="Prioridade" required>
          <Controller
            control={control}
            name="prioridade"
            render={({ field }) => <PrioridadePicker value={field.value} onChange={field.onChange} />}
          />
        </Field>
        <Field label="Solicitante" error={errors.usuarioNome?.message} hint="Quem pediu — por padrão, você.">
          <input className={inputClass} {...register('usuarioNome')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Abrindo…' : 'Abrir chamado'}
        </Button>
      </div>
    </form>
  );
}
