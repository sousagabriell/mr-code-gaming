import { useEffect, useRef } from 'react';
import { useCityEvents } from '../../store/cityEvents';
import type { DespesaDTO, FaturaDTO } from '../../types/domain';
import { motion } from '../motion';

/**
 * Transforma mudança de status em animação dentro da agência: fatura que vira "Pago" = malote
 * entrando; despesa que vira "Pago" = malote saindo. Mesmo desenho do `useCityEventDetector`.
 *
 * O `id` do evento é **estável por lançamento** (sem `Date.now()`): a mutação otimista muda o status
 * no cache e o refetch muda de novo, então o detector dispara duas vezes para o mesmo pagamento — e
 * o `push` do store, que filtra por id, substitui em vez de empilhar dois malotes.
 */
export function useBankEventDetector(faturas: FaturaDTO[], despesas: DespesaDTO[], loaded: boolean) {
  const antesFaturas = useRef<Map<number, FaturaDTO['status']> | null>(null);
  const antesDespesas = useRef<Map<number, DespesaDTO['status']> | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const { ready, setReady, push } = useCityEvents.getState();

    // A primeira passada só registra: entrar na agência com tudo já pago não anima nada.
    if (ready && !motion.reduced && antesFaturas.current && antesDespesas.current) {
      for (const f of faturas) {
        const antes = antesFaturas.current.get(f.idFatura);
        if (antes && antes !== 'Pago' && f.status === 'Pago') {
          push({ id: `malote-f${f.idFatura}`, kind: 'malote', sentido: 'entra' });
        }
      }
      for (const d of despesas) {
        const antes = antesDespesas.current.get(d.idDespesa);
        if (antes && antes !== 'Pago' && d.status === 'Pago') {
          push({ id: `malote-d${d.idDespesa}`, kind: 'malote', sentido: 'sai' });
        }
      }
    }

    antesFaturas.current = new Map(faturas.map((f) => [f.idFatura, f.status]));
    antesDespesas.current = new Map(despesas.map((d) => [d.idDespesa, d.status]));
    if (!ready) setReady();
  }, [faturas, despesas, loaded]);

  // Sair da agência zera a fila: voltar não deve reproduzir o que já aconteceu.
  useEffect(() => () => useCityEvents.setState({ ready: false, events: [] }), []);
}
