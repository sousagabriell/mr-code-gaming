import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAtualizarFatura, useCriarFatura } from '../../api/mutations';
import { useWorld } from '../../hooks/useWorld';
import { toDateInput } from '../../lib/format';
import { clienteCode, clienteNome, projetoCode } from '../../world/status';
import { Button } from '../ui';
import { Field, FormError, inputClass } from './fields';
import { applyServerErrors } from './serverErrors';

const schema = z
  .object({
    idCliente: z.coerce.number<string>().int().positive('Escolha o cliente'),
    idContrato: z.string(),
    idProjeto: z.string(),
    descricao: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(300, 'Máximo de 300 caracteres'),
    valor: z.coerce.number<string>().positive('O valor precisa ser maior que zero'),
    dataEmissao: z.string().min(1, 'Informe a emissão'),
    dataVencimento: z.string().min(1, 'Informe o vencimento'),
    observacoes: z.string().trim().max(2000, 'Máximo de 2000 caracteres'),
  })
  .refine((v) => v.dataVencimento >= v.dataEmissao, {
    path: ['dataVencimento'],
    message: 'O vencimento não pode ser antes da emissão',
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;
const FIELDS = ['idCliente', 'idContrato', 'idProjeto', 'descricao', 'valor', 'dataEmissao', 'dataVencimento', 'observacoes'];

const daysFromNow = (n: number) => toDateInput(new Date(Date.now() + n * 86_400_000));
const opcional = (v: string) => (v ? Number(v) : null);

/**
 * Lançar ou corrigir uma fatura — o "a receber" da cidade. Mora **dentro** do extrato da agência
 * (§10.3), não num painel por cima dele. `onClose(true)` avisa que **salvou** — é o que dispara o
 * pisca-pisca no caixa; o Cancelar chama `onClose()` sem argumento.
 */
export function FaturaForm({ idFatura, onClose }: { idFatura?: number; onClose: (salvou?: boolean) => void }) {
  const { clientes, contratos, projetos, faturas } = useWorld();
  const criar = useCriarFatura();
  const atualizar = useAtualizarFatura();
  const [formError, setFormError] = useState<string | null>(null);

  const atual = idFatura ? faturas.find((f) => f.idFatura === idFatura) : undefined;

  // Contrato e projeto dependem do cliente escolhido. O valor vem de um estado próprio em vez do
  // `watch` do react-hook-form: a API devolve uma função nova a cada render e o compilador do React
  // desiste de memoizar o componente inteiro por causa dela.
  const [idCliente, setIdCliente] = useState(atual?.idCliente ?? 0);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      idCliente: atual ? String(atual.idCliente) : '',
      idContrato: atual?.idContrato ? String(atual.idContrato) : '',
      idProjeto: atual?.idProjeto ? String(atual.idProjeto) : '',
      descricao: atual?.descricao ?? '',
      valor: atual ? String(atual.valor) : '',
      dataEmissao: atual ? atual.dataEmissao.slice(0, 10) : daysFromNow(0),
      dataVencimento: atual ? atual.dataVencimento.slice(0, 10) : daysFromNow(30),
      observacoes: atual?.observacoes ?? '',
    },
  });

  const contratosDoCliente = contratos.filter((c) => c.idCliente === idCliente);
  const projetosDoCliente = projetos.filter((p) => p.idCliente === idCliente);
  const campoCliente = register('idCliente');

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const dto = {
      idCliente: values.idCliente,
      idContrato: opcional(values.idContrato),
      idProjeto: opcional(values.idProjeto),
      descricao: values.descricao,
      valor: values.valor,
      dataEmissao: `${values.dataEmissao}T00:00:00`,
      dataVencimento: `${values.dataVencimento}T00:00:00`,
      observacoes: values.observacoes || null,
    };
    try {
      if (idFatura) await atualizar.mutateAsync({ id: idFatura, dto });
      else await criar.mutateAsync(dto);
      onClose(true);
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  }

  const ativos = [...clientes].sort((a, b) => clienteNome(a).localeCompare(clienteNome(b)));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={formError} />
        {atual && (
          <div className="mb-4 rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{atual.numeroFatura}</p>
            <p className="text-[12px] text-ink-2">O número é gerado pelo MrCodeAdmin e não muda.</p>
          </div>
        )}
        <Field label="Cliente" required error={errors.idCliente?.message}>
          <select
            className={inputClass}
            aria-invalid={!!errors.idCliente}
            {...campoCliente}
            onChange={(e) => {
              campoCliente.onChange(e);
              setIdCliente(Number(e.target.value));
            }}
          >
            <option value="">Escolha…</option>
            {ativos.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {clienteCode(c.idCliente)} · {clienteNome(c)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contrato" hint="Opcional">
            <select className={inputClass} {...register('idContrato')}>
              <option value="">Nenhum</option>
              {contratosDoCliente.map((c) => (
                <option key={c.idContrato} value={c.idContrato}>
                  {c.numeroContrato}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Projeto" hint="Opcional">
            <select className={inputClass} {...register('idProjeto')}>
              <option value="">Nenhum</option>
              {projetosDoCliente.map((p) => (
                <option key={p.idProjeto} value={p.idProjeto}>
                  {projetoCode(p.idProjeto)} · {p.nome}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descrição" required error={errors.descricao?.message}>
          <input className={inputClass} aria-invalid={!!errors.descricao} autoFocus {...register('descricao')} />
        </Field>
        <Field label="Valor (R$)" required error={errors.valor?.message}>
          <input className={inputClass} type="number" step="0.01" min="0" aria-invalid={!!errors.valor} {...register('valor')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Emissão" required error={errors.dataEmissao?.message}>
            <input className={inputClass} type="date" {...register('dataEmissao')} />
          </Field>
          <Field label="Vencimento" required error={errors.dataVencimento?.message}>
            <input className={inputClass} type="date" aria-invalid={!!errors.dataVencimento} {...register('dataVencimento')} />
          </Field>
        </div>
        <Field label="Observações" error={errors.observacoes?.message}>
          <textarea className={inputClass} rows={3} {...register('observacoes')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={() => onClose()}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : idFatura ? 'Salvar' : 'Emitir fatura'}
        </Button>
      </div>
    </form>
  );
}
