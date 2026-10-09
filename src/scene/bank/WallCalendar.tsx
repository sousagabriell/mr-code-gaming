import { Html } from '@react-three/drei';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNow } from '../../hooks/useNow';
import { useBankStore } from '../../store/bankStore';
import { CALENDAR_ANCHOR } from '../../world/bank';
import { mesDe, mesesDoAno, mesmoMes } from '../../world/extrato';
import { cx } from '../../hud/tones';
import { labelsPortalTarget } from '../labelsPortal';

/**
 * Calendário pendurado na parede do fundo da agência: clicar num mês redesenha o extrato naquele
 * mês. É DOM de verdade (botões com foco de teclado e os tokens do tema), no mesmo caminho das
 * etiquetas de zona do pátio.
 *
 * **Sem `transform`.** Colar o DOM no plano da parede deixa o texto borrado, exige calibrar um
 * `scale` em unidades de mundo e — pior — quebra o teste de acerto: sob transformação 3D as caixas
 * dos botões se sobrepõem, e o clique cai no mês errado. Ancorado e de frente, o `distanceFactor`
 * ainda faz o quadro encolher junto com o zoom, que é o que prende ele à cena.
 */
export function WallCalendar() {
  const mes = useBankStore((s) => s.mes);
  const setMes = useBankStore((s) => s.setMes);
  // `useNow` em vez de `new Date()` solto: o relógio no render é impuro (e o mês vira de madrugada).
  const hoje = mesDe(new Date(useNow(60_000)));
  const grade = mesesDoAno(mes.ano);

  const seta = 'grid h-6 w-6 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink';

  return (
    // distanceFactor calibrado para o quadro ocupar ~2 unidades da parede no zoom padrão.
    <Html position={CALENDAR_ANCHOR} center distanceFactor={4.2} portal={labelsPortalTarget} zIndexRange={[10, 0]}>
      {/* pointer-events-auto: o portal dos rótulos é `none`, e sem isto o canvas come o clique. */}
      <section
        aria-label="Calendário da agência"
        className="pointer-events-auto w-[220px] rounded-xl border border-line bg-white/95 p-2 shadow-[0_6px_20px_rgb(30_41_90/0.18)]"
      >
        <header className="mb-1.5 flex items-center justify-between">
          <button className={seta} aria-label="Ano anterior" onClick={() => setMes({ ...mes, ano: mes.ano - 1 })}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[13px] font-bold tabular text-ink">{mes.ano}</span>
          <button className={seta} aria-label="Próximo ano" onClick={() => setMes({ ...mes, ano: mes.ano + 1 })}>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="grid grid-cols-4 gap-1">
          {grade.map(({ mes: m, curto }) => {
            const selecionado = mesmoMes(m, mes);
            const atual = mesmoMes(m, hoje);
            return (
              <button
                key={curto}
                onClick={() => setMes(m)}
                aria-current={selecionado ? 'date' : undefined}
                title={`Ver o extrato de ${curto}/${m.ano}`}
                className={cx(
                  'rounded-md py-1 text-[11px] font-semibold transition-colors',
                  selecionado
                    ? 'bg-brand text-white'
                    : atual
                      ? 'bg-brand-soft text-brand hover:bg-brand/20'
                      : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                )}
              >
                {curto}
              </button>
            );
          })}
        </div>
      </section>
    </Html>
  );
}
