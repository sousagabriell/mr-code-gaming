import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';
import { useWorld } from '../hooks/useWorld';
import { useAuthStore } from '../store/authStore';
import { markTourDone, tourDone, useTourStore } from '../store/tourStore';
import { Button } from './ui';

interface Step {
  /** `data-tour` do elemento destacado; sem alvo (ou alvo oculto, ex.: celular) o cartão fica centralizado. */
  target?: string;
  titulo: string;
  texto: string;
}

const STEPS: Step[] = [
  {
    titulo: 'Bem-vinda(o) à MrCode City',
    texto:
      'Cada cliente é uma sede na cidade, cada projeto um canteiro de obras e cada chamado um caminhão na porta do cliente. Clique em qualquer coisa para ver os detalhes e agir.',
  },
  {
    target: 'search',
    titulo: 'Ache qualquer coisa',
    texto: 'Busque clientes, projetos, chamados, faturas e pessoas. A câmera voa até o resultado. Atalho: tecla /.',
  },
  {
    target: 'toolbar',
    titulo: 'Câmera e construção',
    texto:
      'Aproxime, gire e volte à visão geral. O martelo (tecla B) mostra onde a próxima sede será construída — é assim que se cadastra um cliente. Dê duplo clique num canteiro para abrir o pátio do Kanban e arrastar as caixas.',
  },
  {
    target: 'phone',
    titulo: 'O celular do atendimento',
    texto:
      'A fila de chamados e a conversa com cada cliente moram aqui. Abra um chamado para responder, mudar o status ou transformá-lo em tarefa no pátio — com prazo, que o cliente recebe por mensagem. Esc recolhe o aparelho.',
  },
  {
    target: 'level',
    titulo: 'Nível, missões e conquistas',
    texto:
      'Resolver chamados, entregar atividades e receber faturas dá XP. Subir de nível desbloqueia construções na cidade. Missões semanais e o ranking da equipe ficam no painel (tecla G).',
  },
  {
    target: 'health',
    titulo: 'O clima é a saúde da cidade',
    texto:
      'Chamados urgentes, faturas e projetos atrasados nublam o céu — até virar tempestade. Clique aqui para ver o que está pesando. Prefere sem 3D? Use o modo lista (tecla L).',
  },
];

function useTargetRect(target: string | undefined, step: number | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (step === null) return;
    const measure = () => {
      const el = target ? document.querySelector(`[data-tour="${target}"]`) : null;
      const r = el?.getBoundingClientRect();
      // Elemento escondido (ex.: no celular) → cartão centralizado.
      setRect(r && r.width > 0 && r.height > 0 ? r : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [target, step]);
  return rect;
}

/** Tour de 5 passos no primeiro acesso de cada usuário (pode ser revisto pelo menu do usuário). */
export function Tour() {
  const step = useTourStore((s) => s.step);
  const go = useTourStore((s) => s.go);
  const start = useTourStore((s) => s.start);
  const userId = useAuthStore((s) => s.usuario?.idUsuarioAdmin ?? null);
  const { isLoading } = useWorld();
  const nextRef = useRef<HTMLButtonElement>(null);
  const current = step !== null ? STEPS[step] : undefined;
  const rect = useTargetRect(current?.target, step);

  // Primeira visita: começa quando a cidade terminou de carregar.
  useEffect(() => {
    if (!isLoading && userId !== null && !tourDone(userId)) start();
  }, [isLoading, userId, start]);

  useEffect(() => {
    if (step !== null) nextRef.current?.focus();
  }, [step]);

  if (step === null || !current) return null;

  const finish = () => {
    if (userId !== null) markTourDone(userId);
    go(null);
  };
  const last = step === STEPS.length - 1;

  // Cartão abaixo do alvo (ou acima, se não couber); centralizado sem alvo.
  const pad = 8;
  const cardW = Math.min(360, window.innerWidth - 32);
  const style: CSSProperties = rect
    ? {
        left: Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 16),
        ...(rect.bottom + 220 < window.innerHeight ? { top: rect.bottom + 14 } : { bottom: window.innerHeight - rect.top + 14 }),
        width: cardW,
      }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardW };

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-titulo"
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish();
        if (e.key === 'ArrowRight' && !last) go(step + 1);
        if (e.key === 'ArrowLeft' && step > 0) go(step - 1);
      }}
    >
      {/* Escurece tudo menos o alvo: quatro painéis em volta do recorte + contorno branco. */}
      {rect ? (
        (() => {
          const x = rect.left - pad;
          const y = rect.top - pad;
          const w = rect.width + pad * 2;
          const h = rect.height + pad * 2;
          const shade = 'absolute bg-ink/50';
          return (
            <>
              <div className={shade} style={{ left: 0, top: 0, right: 0, height: Math.max(0, y) }} />
              <div className={shade} style={{ left: 0, top: y + h, right: 0, bottom: 0 }} />
              <div className={shade} style={{ left: 0, top: y, width: Math.max(0, x), height: h }} />
              <div className={shade} style={{ left: x + w, top: y, right: 0, height: h }} />
              <div className="pointer-events-none absolute rounded-xl border-2 border-white" style={{ left: x, top: y, width: w, height: h }} />
            </>
          );
        })()
      ) : (
        <div className="absolute inset-0 bg-ink/50" />
      )}

      <div className="absolute rounded-2xl bg-white p-5 shadow-float" style={style}>
        <button onClick={finish} className="absolute right-3 top-3 text-ink-3 hover:text-ink" aria-label="Pular o tour">
          <X className="h-4 w-4" />
        </button>
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
          <Sparkles className="h-3.5 w-3.5" /> Passo {step + 1} de {STEPS.length}
        </p>
        <h2 id="tour-titulo" className="text-[17px] font-bold text-ink">
          {current.titulo}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{current.texto}</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-5 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`} />
            ))}
          </div>
          {step > 0 && (
            <Button variant="ghost" onClick={() => go(step - 1)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
          )}
          <Button ref={nextRef} variant="primary" onClick={() => (last ? finish() : go(step + 1))}>
            {last ? 'Começar' : 'Próximo'} {!last && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
