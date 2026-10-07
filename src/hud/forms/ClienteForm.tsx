import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAtualizarCliente, useCriarCliente } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { useUiStore } from '../../store/uiStore';
import type { CadastroClienteDTO } from '../../types/domain';
import { Button } from '../ui';
import { Field, FormError, inputClass } from './fields';
import { applyServerErrors, emptyToNull } from './serverErrors';

const schema = z.object({
  razaoSocial: z.string().trim().min(1, 'Informe a razão social').max(200, 'Máximo de 200 caracteres'),
  nomeFantasia: z.string().trim().max(200, 'Máximo de 200 caracteres'),
  cpfCnpj: z.string().trim().min(11, 'CPF ou CNPJ incompleto').max(20, 'Máximo de 20 caracteres'),
  email: z.union([z.literal(''), z.string().trim().email('E-mail inválido')]),
  telefone: z.string().trim().max(30, 'Máximo de 30 caracteres'),
  nomeContato: z.string().trim().max(150, 'Máximo de 150 caracteres'),
  observacoes: z.string().trim().max(2000, 'Máximo de 2000 caracteres'),
});

type FormValues = z.infer<typeof schema>;
const FIELDS = Object.keys(schema.shape);

/** Criar (modo construção) ou editar um cliente. */
export function ClienteForm({ idCliente }: { idCliente?: number }) {
  const { clientes } = useWorld();
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const select = useUiStore((s) => s.select);
  const setBuildMode = useUiStore((s) => s.setBuildMode);
  const criar = useCriarCliente();
  const atualizar = useAtualizarCliente();
  const [formError, setFormError] = useState<string | null>(null);

  const existente = idCliente ? clientes.find((c) => c.idCliente === idCliente) : undefined;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      razaoSocial: existente?.razaoSocial ?? '',
      nomeFantasia: existente?.nomeFantasia ?? '',
      cpfCnpj: existente?.cpfCnpj ?? '',
      email: existente?.email ?? '',
      telefone: existente?.telefone ?? '',
      nomeContato: existente?.nomeContato ?? '',
      observacoes: existente?.observacoes ?? '',
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const dto = emptyToNull(values) as CadastroClienteDTO;
    try {
      if (idCliente) {
        await atualizar.mutateAsync({ id: idCliente, dto: { ...dto, idSistemaOrigem: existente?.idSistemaOrigem ?? null } });
        closeDrawer();
      } else {
        const novo = await criar.mutateAsync(dto);
        closeDrawer();
        setBuildMode(false);
        if (novo?.idCliente) select({ kind: 'cliente', id: novo.idCliente });
      }
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={formError} />
        <Field label="Razão social" required error={errors.razaoSocial?.message}>
          <input className={inputClass} aria-invalid={!!errors.razaoSocial} autoFocus {...register('razaoSocial')} />
        </Field>
        <Field label="Nome fantasia" error={errors.nomeFantasia?.message} hint="É o nome que aparece na placa da sede.">
          <input className={inputClass} {...register('nomeFantasia')} />
        </Field>
        <Field label="CPF ou CNPJ" required error={errors.cpfCnpj?.message}>
          <input className={inputClass} aria-invalid={!!errors.cpfCnpj} inputMode="numeric" {...register('cpfCnpj')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contato" error={errors.nomeContato?.message}>
            <input className={inputClass} {...register('nomeContato')} />
          </Field>
          <Field label="Telefone" error={errors.telefone?.message}>
            <input className={inputClass} type="tel" {...register('telefone')} />
          </Field>
        </div>
        <Field label="E-mail" error={errors.email?.message}>
          <input className={inputClass} aria-invalid={!!errors.email} type="email" {...register('email')} />
        </Field>
        <Field label="Observações" error={errors.observacoes?.message}>
          <textarea className={inputClass} rows={3} {...register('observacoes')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : idCliente ? 'Salvar alterações' : 'Construir sede'}
        </Button>
      </div>
    </form>
  );
}
