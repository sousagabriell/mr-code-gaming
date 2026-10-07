import { type FormEvent, useState } from 'react';
import { Box } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { login, isLoading, error } = useAuthStore();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login({ email, senha });
  }

  return (
    <div className="grid h-full place-items-center bg-[radial-gradient(ellipse_at_top,#f6f8fd,#e3e8f4)] px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-[380px] rounded-3xl border border-white bg-white/90 p-8 shadow-float backdrop-blur">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white shadow-[0_6px_16px_rgb(19_76_237/0.35)]">
            <Box className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="leading-tight">
            <span className="block text-[18px] font-bold tracking-tight text-ink">MrCode City</span>
            <span className="block text-[12px] text-ink-3">Painel operacional gamificado</span>
          </span>
        </div>

        <h1 className="mb-5 text-[20px] font-bold text-ink">Entrar na cidade</h1>

        <label className="mb-3 block text-[12px] font-semibold text-ink-2">
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className={inputClass} />
        </label>

        <label className="mb-5 block text-[12px] font-semibold text-ink-2">
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required className={inputClass} />
        </label>

        {error && <p className="mb-4 rounded-lg bg-bad-soft px-3 py-2 text-[13px] font-medium text-bad">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-white shadow-[0_6px_16px_rgb(19_76_237/0.3)] transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {isLoading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-4 text-center text-[12px] text-ink-3">Mesma conta e API do MrCodeAdmin.</p>
      </form>
    </div>
  );
}
