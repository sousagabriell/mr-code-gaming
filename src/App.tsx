import { lazy, Suspense, useEffect } from 'react';
import { queryClient } from './api/queryClient';
import { LoginScreen } from './components/LoginScreen';
import { useAuthStore } from './store/authStore';

// O jogo inteiro (HUD + three.js) só é baixado depois do login — a tela de entrada fica leve.
const Game = lazy(() => import('./Game'));

function Loading() {
  return (
    <div className="grid h-full place-items-center bg-page text-[13px] font-semibold text-ink-2" role="status">
      Preparando a cidade…
    </div>
  );
}

function App() {
  const token = useAuthStore((s) => s.token);

  // Ao sair, descarta o cache — outra conta não pode ver os dados da sessão anterior.
  useEffect(() => {
    if (!token) queryClient.clear();
  }, [token]);

  return token ? (
    <Suspense fallback={<Loading />}>
      <Game />
    </Suspense>
  ) : (
    <LoginScreen />
  );
}

export default App;
