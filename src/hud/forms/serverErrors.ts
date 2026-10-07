import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../../lib/http';

/** "RazaoSocial" (backend) → "razaoSocial" (formulário). */
function toCamel(field: string): string {
  return field.charAt(0).toLowerCase() + field.slice(1);
}

/**
 * Leva os erros de validação do backend (FluentValidation) para os campos do formulário.
 * Retorna a mensagem geral quando o erro não é de campo.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: string[]): string | null {
  if (!(error instanceof ApiError)) return 'Não foi possível salvar.';
  const unmatched: string[] = [];
  for (const fe of error.fieldErrors) {
    const key = toCamel(fe.field);
    if (fields.includes(key)) setError(key as Path<T>, { message: fe.message });
    else unmatched.push(fe.message);
  }
  if (error.fieldErrors.length === 0) return error.message;
  return unmatched.length > 0 ? unmatched.join(' ') : null;
}

/** "" → null, para campos opcionais irem como null para a API. */
export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])) as T;
}
