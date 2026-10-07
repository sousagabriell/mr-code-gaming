import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAtualizarAtividade, useCriarAtividade } from '../../api/kanban';
import { useKanbanQuery, useProjetoDetalheQuery } from '../../api/queries';
import { useWorld } from '../../hooks/useWorld';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { CadastroAtividadeDTO, KanbanTipoAtividade } from '../../types/domain';
import { findAtividade } from '../../world/kanban';
import { TIPO_COLOR } from '../../scene/yard/crateColors';
import { cx } from '../tones';
import { Button } from '../ui';
import { Field, FormError, inputClass, PrioridadePicker } from './fields';
import { applyServerErrors } from './serverErrors';

const TIPOS: KanbanTipoAtividade[] = ['Tarefa', 'Bug', 'Melhoria', 'Chamado'];

const schema = z.object({
  idColuna: z.coerce.number<string>().int().positive('Escolha a zona'),
  titulo: z.string().trim().min(1, 'Dê um título para a caixa').max(200, 'Máximo de 200 caracteres'),
  descricao: z.string().trim().max(4000, 'Máximo de 4000 caracteres'),
  tipo: z.enum(['Tarefa', 'Bug', 'Melhoria', 'Chamado']),
  prioridade: z.enum(['Baixa', 'Media', 'Alta']),
  idUsuarioAdminResponsavel: z.string(),
  dataPrazo: z.string(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;
const FIELDS = ['titulo', 'descricao', 'tipo', 'prioridade', 'idUsuarioAdminResponsavel', 'dataPrazo'];

function TipoPicker({ value, onChange }: { value: KanbanTipoAtividade; onChange: (t: KanbanTipoAtividade) => void }) {
  return (
    <div className="mt-1 grid grid-cols-4 gap-1.5">
      {TIPOS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cx(
            'flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[12px] font-semibold transition',
            value === t ? 'border-transparent bg-ink text-white' : 'border-line bg-white text-ink-2 hover:bg-surface-2'
          )}
        >
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TIPO_COLOR[t] }} />
          {t}
        </button>
      ))}
    </div>
  );
}

/** Nova caixa no pátio ou edição de uma existente. */
export function AtividadeForm({ idProjeto, idColuna, idAtividade }: { idProjeto: number; idColuna?: number; idAtividade?: number }) {
  const { colaboradores } = useWorld();
  const usuario = useAuthStore((s) => s.usuario);
  const { data: colunas } = useKanbanQuery(idProjeto);
  const { data: detalhe } = useProjetoDetalheQuery(idProjeto);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const select = useUiStore((s) => s.select);
  const criar = useCriarAtividade();
  const atualizar = useAtualizarAtividade();
  const [formError, setFormError] = useState<string | null>(null);

  const existente = idAtividade ? findAtividade(colunas, idAtividade) : null;
  const ordenadas = [...(colunas ?? [])].sort((a, b) => a.ordem - b.ordem);

  // Quem pode ser responsável: equipe do projeto + colaboradores ativos (só ADMIN carrega) + você.
  const pessoas = useMemo(() => {
    const map = new Map<number, string>();
    detalhe?.equipe.forEach((m) => map.set(m.idUsuarioAdmin, m.nomeUsuarioAdmin));
    colaboradores.filter((c) => c.ativo).forEach((c) => map.set(c.idUsuarioAdmin, c.nome));
    if (usuario) map.set(usuario.idUsuarioAdmin, usuario.nome);
    if (existente?.atividade.idUsuarioAdminResponsavel) {
      map.set(existente.atividade.idUsuarioAdminResponsavel, existente.atividade.nomeResponsavel ?? 'Responsável atual');
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [detalhe, colaboradores, usuario, existente]);

  const a = existente?.atividade;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      idColuna: String(existente?.coluna.idColuna ?? idColuna ?? ordenadas[0]?.idColuna ?? ''),
      titulo: a?.titulo ?? '',
      descricao: a?.descricao ?? '',
      tipo: a?.tipo ?? 'Tarefa',
      prioridade: a?.prioridade ?? 'Media',
      idUsuarioAdminResponsavel: a?.idUsuarioAdminResponsavel ? String(a.idUsuarioAdminResponsavel) : '',
      dataPrazo: a?.dataPrazo ? a.dataPrazo.slice(0, 10) : '',
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const dto: CadastroAtividadeDTO = {
      titulo: values.titulo,
      descricao: values.descricao || null,
      tipo: values.tipo,
      prioridade: values.prioridade,
      idUsuarioAdminResponsavel: values.idUsuarioAdminResponsavel ? Number(values.idUsuarioAdminResponsavel) : null,
      dataPrazo: values.dataPrazo ? `${values.dataPrazo}T00:00:00` : null,
    };
    try {
      if (idAtividade) {
        await atualizar.mutateAsync({ idProjeto, idAtividade, dto });
        closeDrawer();
      } else {
        const nova = await criar.mutateAsync({ idProjeto, idColuna: values.idColuna, dto });
        closeDrawer();
        if (nova?.idAtividade) select({ kind: 'atividade', id: nova.idAtividade });
      }
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <FormError message={formError} />
        {!idAtividade && (
          <Field label="Zona" required error={errors.idColuna?.message}>
            <select className={inputClass} {...register('idColuna')}>
              {ordenadas.map((c) => (
                <option key={c.idColuna} value={c.idColuna}>
                  {c.nome} ({c.atividades.length})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Título" required error={errors.titulo?.message}>
          <input className={inputClass} aria-invalid={!!errors.titulo} autoFocus {...register('titulo')} />
        </Field>
        <Field label="Tipo" required>
          <Controller control={control} name="tipo" render={({ field }) => <TipoPicker value={field.value} onChange={field.onChange} />} />
        </Field>
        <Field label="Prioridade" required>
          <Controller
            control={control}
            name="prioridade"
            render={({ field }) => <PrioridadePicker value={field.value} onChange={field.onChange} />}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Responsável" error={errors.idUsuarioAdminResponsavel?.message} hint="Ganha uma empilhadeira no pátio.">
            <select className={inputClass} {...register('idUsuarioAdminResponsavel')}>
              <option value="">Ninguém</option>
              {pessoas.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prazo" error={errors.dataPrazo?.message}>
            <input className={inputClass} type="date" {...register('dataPrazo')} />
          </Field>
        </div>
        <Field label="Descrição" error={errors.descricao?.message}>
          <textarea className={inputClass} rows={4} {...register('descricao')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : idAtividade ? 'Salvar alterações' : 'Colocar no pátio'}
        </Button>
      </div>
    </form>
  );
}
