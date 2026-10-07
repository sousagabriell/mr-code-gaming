import { type FormEvent, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { login, isLoading, error } = useAuthStore();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login({ email, senha });
  }

  return (
    <div className="grid h-full place-items-center bg-[var(--bg-page)] px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[380px] rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <p className="font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[1px] text-[var(--brand-blue)]">
          MrCodeAdmin · Game Lab
        </p>
        <h1 className="mt-2 mb-6 font-[var(--font-mono)] text-[19px] font-semibold text-[var(--text-primary)]">
          Entrar na cidade
        </h1>

        <label className="mb-3 block text-sm text-[var(--text-secondary)]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 py-2 text-[var(--text-primary)] outline-none focus-visible:border-[var(--brand-blue)]"
          />
        </label>

        <label className="mb-5 block text-sm text-[var(--text-secondary)]">
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="mt-1 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 py-2 text-[var(--text-primary)] outline-none focus-visible:border-[var(--brand-blue)]"
          />
        </label>

        {error && <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-[10px] bg-[var(--brand-blue)] font-[var(--font-mono)] text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-blue-hover)] disabled:opacity-60"
        >
          {isLoading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          Mesma conta e API do MrCodeAdmin — projeto isolado, só leitura.
        </p>
      </form>
    </div>
  );
}
