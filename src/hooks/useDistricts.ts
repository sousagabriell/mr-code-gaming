import { useMemo } from 'react';
import { formatBRLCompact } from '../lib/format';
import { LANDMARK_KINDS, useUiStore, type EntityRef } from '../store/uiStore';
import type { ChamadoDTO, FaturaDTO, ProjetoDTO } from '../types/domain';
import { computeSaldo } from '../world/health';
import { clienteCode, clienteNome, isChamadoAberto, isProjetoEmObras, LANDMARK_META, projetoCode } from '../world/status';
import { useWorld } from './useWorld';

export interface District {
  key: string;
  code: string;
  nome: string;
  sub: string;
  /** null = visão geral */
  target: EntityRef | null;
}

/** Cliente "dono" da seleção atual — dá contexto a KPIs, tabela e seletor de distrito. */
export function contextClienteId(
  selected: EntityRef | null,
  data: { projetos: ProjetoDTO[]; chamados: ChamadoDTO[]; faturas: FaturaDTO[] }
): number | null {
  if (!selected) return null;
  switch (selected.kind) {
    case 'cliente':
      return selected.id;
    case 'projeto':
      return data.projetos.find((p) => p.idProjeto === selected.id)?.idCliente ?? null;
    case 'chamado':
      return data.chamados.find((c) => c.idChamado === selected.id)?.idCliente ?? null;
    case 'fatura':
      return data.faturas.find((f) => f.idFatura === selected.id)?.idCliente ?? null;
    default:
      return null;
  }
}

export function useDistricts() {
  const world = useWorld();
  const selected = useUiStore((s) => s.selected);
  const yard = useUiStore((s) => s.yard);

  const districts = useMemo<District[]>(() => {
    const abertos = world.chamados.filter(isChamadoAberto);
    const overview: District = {
      key: 'overview',
      code: 'HQ',
      nome: 'Mr Code City',
      sub: `${world.clientes.length} clientes · ${abertos.length} chamados abertos`,
      target: null,
    };

    const clientes = [...world.clientes]
      .sort((a, b) => a.idCliente - b.idCliente)
      .map<District>((c) => {
        const obras = world.projetos.filter((p) => p.idCliente === c.idCliente && isProjetoEmObras(p)).length;
        const chamados = abertos.filter((ch) => ch.idCliente === c.idCliente).length;
        return {
          key: `cliente:${c.idCliente}`,
          code: clienteCode(c.idCliente),
          nome: clienteNome(c),
          sub: `${obras} em obras · ${chamados} chamado${chamados === 1 ? '' : 's'}`,
          target: { kind: 'cliente', id: c.idCliente },
        };
      });

    const landmarkSub = {
      datacenter: world.observabilidade?.habilitado ? 'monitorando VPS' : 'offline em dev',
      banco: `saldo ${formatBRLCompact(computeSaldo(world.faturas, world.despesas))}`,
      universidade: `${world.wikiPaginas.length} artigos`,
      prefeitura: `${world.contratos.filter((c) => c.status === 'Ativo').length} contratos ativos`,
    };

    const landmarks = LANDMARK_KINDS.map<District>((kind) => ({
      key: kind,
      code: LANDMARK_META[kind].code,
      nome: LANDMARK_META[kind].nome,
      sub: landmarkSub[kind],
      target: { kind },
    }));

    return [overview, ...clientes, ...landmarks];
  }, [world]);

  const current = useMemo<District>(() => {
    if (yard) {
      const projeto = world.projetos.find((p) => p.idProjeto === yard);
      return {
        key: `yard:${yard}`,
        code: projetoCode(yard),
        nome: projeto?.nome ?? 'Pátio de obras',
        sub: `pátio de obras${projeto ? ` · ${projeto.clienteNome}` : ''}`,
        target: { kind: 'projeto', id: yard },
      };
    }
    if (!selected) return districts[0];
    if ((LANDMARK_KINDS as string[]).includes(selected.kind)) return districts.find((d) => d.key === selected.kind)!;
    if (selected.kind === 'colaborador') return districts.find((d) => d.key === 'prefeitura')!;
    const idCliente = contextClienteId(selected, world);
    return districts.find((d) => d.key === `cliente:${idCliente}`) ?? districts[0];
  }, [selected, districts, world, yard]);

  return { districts, current };
}
