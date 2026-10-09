import { useMemo } from 'react';
import { formatBRLCompact } from '../lib/format';
import { useSedeStore } from '../store/sedeStore';
import { LANDMARK_KINDS, useUiStore, type EntityRef, type LandmarkKind } from '../store/uiStore';
import type { ChamadoDTO, FaturaDTO, ProjetoDTO } from '../types/domain';
import { computeSaldo } from '../world/health';
import { clienteCode, clienteNome, isChamadoAberto, isProjetoEmObras, LANDMARK_META, projetoCode } from '../world/status';
import { useMetasAtivas } from './useMetas';
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
  const interior = useUiStore((s) => s.interior);
  const idClienteDaSede = useSedeStore((s) => s.idCliente);

  // A Prefeitura mostra metas, não contratos.
  const ativas = useMetasAtivas();

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

    const landmarkSub: Record<LandmarkKind, string> = {
      datacenter: world.observabilidade?.habilitado ? 'monitorando VPS' : 'offline em dev',
      banco: `saldo ${formatBRLCompact(computeSaldo(world.faturas, world.despesas))}`,
      universidade: `${world.wikiPaginas.length} artigos`,
      prefeitura: `${ativas} meta${ativas === 1 ? '' : 's'} em andamento`,
      escritorio: `${world.contratos.filter((c) => c.status === 'Ativo').length} contratos ativos`,
    };

    const landmarks = LANDMARK_KINDS.map<District>((kind) => ({
      key: kind,
      code: LANDMARK_META[kind].code,
      nome: LANDMARK_META[kind].nome,
      sub: landmarkSub[kind],
      target: { kind },
    }));

    return [overview, ...clientes, ...landmarks];
  }, [world, ativas]);

  const current = useMemo<District>(() => {
    if (interior === 'banco') {
      const saldo = computeSaldo(world.faturas, world.despesas);
      return {
        key: 'banco:agencia',
        code: LANDMARK_META.banco.code,
        nome: 'Agência',
        sub: `extrato · saldo ${formatBRLCompact(saldo)}`,
        target: { kind: 'banco' },
      };
    }
    if (interior === 'universidade') {
      return {
        key: 'universidade:biblioteca',
        code: LANDMARK_META.universidade.code,
        nome: 'Biblioteca',
        sub: `wiki · ${world.wikiPaginas.length} artigos`,
        target: { kind: 'universidade' },
      };
    }
    if (interior === 'sede' && idClienteDaSede !== null) {
      const cliente = world.clientes.find((c) => c.idCliente === idClienteDaSede);
      return {
        key: `sede:${idClienteDaSede}`,
        code: clienteCode(idClienteDaSede),
        nome: 'Escritório',
        sub: cliente ? clienteNome(cliente) : 'escritório do cliente',
        target: { kind: 'cliente', id: idClienteDaSede },
      };
    }
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
    // A equipe mora no Escritório desde que a Prefeitura virou o gerenciador de metas.
    if (selected.kind === 'colaborador') return districts.find((d) => d.key === 'escritorio')!;
    const idCliente = contextClienteId(selected, world);
    return districts.find((d) => d.key === `cliente:${idCliente}`) ?? districts[0];
  }, [selected, districts, world, yard, interior, idClienteDaSede]);

  return { districts, current };
}
