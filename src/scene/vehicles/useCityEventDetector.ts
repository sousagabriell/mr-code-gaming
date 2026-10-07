import { useEffect, useRef } from 'react';
import { useCityEvents } from '../../store/cityEvents';
import type { FaturaDTO } from '../../types/domain';
import type { CityLayout, TruckPlot } from '../../world/layout';
import { armoredRoute } from '../../world/routes';
import { vehicleFor } from '../assets';
import { motion } from '../motion';

/**
 * Compara os dados a cada atualização (refetch ou mutação otimista) e transforma mudanças em
 * animações: caminhão que some = chamado resolvido (vai embora); fatura que vira "Pago" = carro-forte.
 * A primeira passada só registra o estado — nada anima na carga inicial nem ao voltar do pátio.
 */
export function useCityEventDetector(layout: CityLayout, faturas: FaturaDTO[], loaded: boolean) {
  const prevTrucks = useRef<Map<number, TruckPlot> | null>(null);
  const prevFaturas = useRef<Map<number, FaturaDTO['status']> | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const { ready, setReady, push } = useCityEvents.getState();
    const trucks = new Map(layout.trucks.map((t) => [t.chamado.idChamado, t]));

    if (ready && !motion.reduced && prevTrucks.current && prevFaturas.current) {
      for (const [id, t] of prevTrucks.current) {
        if (!trucks.has(id)) push({ id: `leave-${id}-${Date.now()}`, kind: 'truck-leave', from: t.position, vehicle: vehicleFor(t.chamado) });
      }
      const bank = layout.landmarks.find((l) => l.kind === 'banco')?.position;
      for (const f of faturas) {
        const antes = prevFaturas.current.get(f.idFatura);
        if (!bank || !antes || antes === 'Pago' || f.status !== 'Pago') continue;
        const lot = layout.clientPlots.find((p) => p.cliente.idCliente === f.idCliente)?.lotCenter;
        if (lot) push({ id: `armored-${f.idFatura}-${Date.now()}`, kind: 'armored', path: armoredRoute(lot, bank) });
      }
    }

    prevTrucks.current = trucks;
    prevFaturas.current = new Map(faturas.map((f) => [f.idFatura, f.status]));
    if (!ready) setReady();
  }, [layout, faturas, loaded]);

  // Saiu da cidade (ex.: entrou no pátio): ao voltar, os caminhões reaparecem estacionados.
  useEffect(() => () => useCityEvents.setState({ ready: false, events: [] }), []);
}
