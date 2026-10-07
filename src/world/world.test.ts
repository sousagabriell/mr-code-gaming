import { describe, expect, it } from 'vitest';
import type { ChamadoDTO, ClienteDTO, ContratoDTO, FaturaDTO, ProjetoDTO } from '../types/domain';
import { buildCityLayout, frontRoadZ, LANE_OFFSET, lotPosition, LOT_COLUMNS, MAX_TRUCKS_PER_LOT, verticalRoadXs } from './layout';
import { armoredRoute, pathLength, pointAt, walkerRoute } from './routes';
import { chamadoLifecycle, faturaLifecycle } from './lifecycle';
import { entityPosition } from './positions';
import { isProjetoAtrasado, label, projetoProgress, statusTone, worstPrioridade } from './status';

function cliente(id: number, extra: Partial<ClienteDTO> = {}): ClienteDTO {
  return {
    idCliente: id,
    razaoSocial: `Cliente ${id}`,
    nomeFantasia: null,
    cpfCnpj: '00000000000',
    email: null,
    telefone: null,
    nomeContato: null,
    idSistemaOrigem: null,
    sistemaOrigemNome: null,
    status: 'Ativo',
    observacoes: null,
    dataCadastro: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

function projeto(id: number, idCliente: number, extra: Partial<ProjetoDTO> = {}): ProjetoDTO {
  return {
    idProjeto: id,
    idCliente,
    clienteNome: '',
    idContrato: null,
    nome: `Projeto ${id}`,
    descricao: null,
    dataInicio: '2026-01-01T00:00:00Z',
    dataPrevisaoFim: '2026-12-31T00:00:00Z',
    dataConclusao: null,
    status: 'EmAndamento',
    prioridade: 'Media',
    observacoes: null,
    linkProducao: null,
    marcos: [],
    equipe: [],
    links: [],
    ...extra,
  };
}

function chamado(id: number, idCliente: number, extra: Partial<ChamadoDTO> = {}): ChamadoDTO {
  return {
    idChamado: id,
    protocolo: `MC-${id}`,
    origem: 'Interno',
    idCliente,
    clienteNome: null,
    usuarioNome: 'Fulano',
    usuarioEmail: null,
    assunto: 'Erro',
    descricao: 'Descrição longa',
    prioridade: 'Media',
    status: 'Aberto',
    resposta: null,
    idUsuarioAdminResponsavel: null,
    nomeResponsavel: null,
    dataHoraAbertura: '2026-10-01T10:00:00Z',
    dataHoraUltimaAtualizacao: '2026-10-02T10:00:00Z',
    idProjetoAtividadeVinculada: null,
    idAtividadeVinculada: null,
    ...extra,
  };
}

const NO_CONTRATOS: ContratoDTO[] = [];
const NO_FATURAS: FaturaDTO[] = [];

describe('layout estável', () => {
  it('um cliente novo não move os lotes existentes', () => {
    const antes = buildCityLayout([cliente(1), cliente(2), cliente(3)], NO_CONTRATOS, [], []);
    const depois = buildCityLayout([cliente(1), cliente(2), cliente(3), cliente(4), cliente(5)], NO_CONTRATOS, [], []);
    for (const plot of antes.clientPlots) {
      const mesmo = depois.clientPlots.find((p) => p.cliente.idCliente === plot.cliente.idCliente)!;
      expect(mesmo.lotCenter).toEqual(plot.lotCenter);
    }
  });

  it('o lote não depende da ordem em que a API devolve os clientes', () => {
    const a = buildCityLayout([cliente(3), cliente(1), cliente(2)], NO_CONTRATOS, [], []);
    const b = buildCityLayout([cliente(1), cliente(2), cliente(3)], NO_CONTRATOS, [], []);
    expect(a.clientPlots.map((p) => p.lotCenter)).toEqual(b.clientPlots.map((p) => p.lotCenter));
  });

  it('o próximo lote livre é o seguinte na grade', () => {
    const layout = buildCityLayout([cliente(1), cliente(2)], NO_CONTRATOS, [], []);
    expect(layout.nextLot).toEqual(lotPosition(2));
  });

  it('quebra a linha a cada LOT_COLUMNS lotes', () => {
    expect(lotPosition(LOT_COLUMNS)[2]).toBeGreaterThan(lotPosition(0)[2]);
    expect(lotPosition(LOT_COLUMNS)[0]).toBe(lotPosition(0)[0]);
  });

  it('canteiros ficam dentro do lote do cliente e ignoram projetos cancelados', () => {
    const layout = buildCityLayout(
      [cliente(1)],
      NO_CONTRATOS,
      [projeto(1, 1), projeto(2, 1, { status: 'Cancelado' }), projeto(3, 1, { status: 'Concluido' })],
      []
    );
    expect(layout.constructionSites.map((s) => s.projeto.idProjeto)).toEqual([1, 3]);
    const lot = layout.clientPlots[0].lotCenter;
    for (const s of layout.constructionSites) {
      expect(Math.abs(s.position[0] - lot[0])).toBeLessThan(1.9);
      expect(Math.abs(s.position[2] - lot[2])).toBeLessThan(1.9);
    }
  });

  it('associa só chamados abertos à sede', () => {
    const layout = buildCityLayout(
      [cliente(1)],
      NO_CONTRATOS,
      [],
      [chamado(1, 1), chamado(2, 1, { status: 'Fechado' }), chamado(3, 2)]
    );
    expect(layout.clientPlots[0].chamadosAbertos.map((c) => c.idChamado)).toEqual([1]);
  });
});

describe('posição das entidades', () => {
  it('chamado aberto aponta para o caminhão; fechado, para a sede', () => {
    const chamados = [chamado(9, 2), chamado(10, 2, { status: 'Fechado' })];
    const layout = buildCityLayout([cliente(1), cliente(2)], NO_CONTRATOS, [], chamados);
    const truck = layout.trucks.find((t) => t.chamado.idChamado === 9)!;
    const aberto = entityPosition({ kind: 'chamado', id: 9 }, layout, { chamados, faturas: NO_FATURAS });
    expect([aberto?.[0], aberto?.[2]]).toEqual([truck.position[0], truck.position[2]]);
    const fechado = entityPosition({ kind: 'chamado', id: 10 }, layout, { chamados, faturas: NO_FATURAS });
    const sede = layout.clientPlots[1].position;
    expect([fechado?.[0], fechado?.[2]]).toEqual([sede[0], sede[2]]);
  });

  it('caminhões ficam na rua em frente ao lote, sem se sobrepor, até o limite por sede', () => {
    const chamados = [1, 2, 3, 4].map((id) => chamado(id, 1));
    const layout = buildCityLayout([cliente(1)], NO_CONTRATOS, [], chamados);
    expect(layout.trucks).toHaveLength(MAX_TRUCKS_PER_LOT);
    const lot = layout.clientPlots[0].lotCenter;
    const xs = layout.trucks.map((t) => t.position[0]);
    expect(new Set(xs).size).toBe(xs.length);
    for (const t of layout.trucks) expect(t.position[2]).toBeCloseTo(frontRoadZ(lot[2]) - LANE_OFFSET);
  });

  it('landmark tem posição fixa', () => {
    const layout = buildCityLayout([], NO_CONTRATOS, [], []);
    expect(entityPosition({ kind: 'banco' }, layout, { chamados: [], faturas: [] })).toEqual(
      layout.landmarks.find((l) => l.kind === 'banco')!.position
    );
  });
});

describe('status', () => {
  it('rótulos e tons', () => {
    expect(label('EmAndamento')).toBe('Em andamento');
    expect(statusTone('Atrasado')).toBe('bad');
    expect(statusTone('Inexistente')).toBe('neutral');
  });

  it('pior prioridade', () => {
    expect(worstPrioridade([])).toBeNull();
    expect(worstPrioridade([{ prioridade: 'Baixa' }, { prioridade: 'Alta' }, { prioridade: 'Media' }])).toBe('Alta');
  });

  it('progresso e atraso do projeto pelo cronograma', () => {
    const p = projeto(1, 1, { dataInicio: '2026-01-01T00:00:00Z', dataPrevisaoFim: '2026-01-11T00:00:00Z' });
    expect(projetoProgress(p, Date.parse('2026-01-06T00:00:00Z'))).toBeCloseTo(0.5);
    expect(projetoProgress({ ...p, status: 'Planejamento' })).toBe(0);
    expect(projetoProgress({ ...p, status: 'Concluido' })).toBe(1);
    expect(isProjetoAtrasado(p, Date.parse('2026-02-01T00:00:00Z'))).toBe(true);
    expect(isProjetoAtrasado({ ...p, status: 'Concluido' }, Date.parse('2026-02-01T00:00:00Z'))).toBe(false);
  });
});

describe('ciclo de vida', () => {
  it('chamado em andamento marca etapas anteriores como feitas', () => {
    const steps = chamadoLifecycle(chamado(1, 1, { status: 'EmAndamento' }));
    expect(steps.map((s) => s.state)).toEqual(['done', 'current', 'todo', 'todo']);
    expect(steps[1].tone).toBe('info');
  });

  it('fatura atrasada fica vermelha na etapa de vencimento', () => {
    const f: FaturaDTO = {
      idFatura: 1,
      idCliente: 1,
      clienteNome: '',
      idContrato: null,
      idProjeto: null,
      numeroFatura: 'MC-FAT-1',
      descricao: '',
      valor: 100,
      dataEmissao: '2026-09-01T00:00:00Z',
      dataVencimento: '2026-09-10T00:00:00Z',
      dataPagamento: null,
      status: 'Atrasado',
    };
    const steps = faturaLifecycle(f);
    expect(steps[1]).toMatchObject({ state: 'current', tone: 'bad', label: 'Atrasada' });
  });
});

describe('rotas pelas ruas', () => {
  it('pointAt percorre o caminho e para no fim', () => {
    const path: [number, number, number][] = [
      [0, 0, 0],
      [3, 0, 0],
      [3, 0, 4],
    ];
    expect(pathLength(path)).toBe(7);
    expect(pointAt(path, 1.5).position).toEqual([1.5, 0, 0]);
    expect(pointAt(path, 5).position).toEqual([3, 0, 2]);
    expect(pointAt(path, 99).position).toEqual([3, 0, 4]);
    expect(pointAt(path, 5).heading).toBeCloseTo(0); // indo para +z
    expect(pointAt(path, 1).heading).toBeCloseTo(Math.PI / 2); // indo para +x
  });

  it('carro-forte só anda em segmentos retos (ruas) e termina no banco', () => {
    const lot = lotPosition(5);
    const bank: [number, number, number] = [-2.5, 0, -5.8];
    const route = armoredRoute(lot, bank);
    for (let i = 1; i < route.length; i++) {
      const sameX = route[i][0] === route[i - 1][0];
      const sameZ = route[i][2] === route[i - 1][2];
      expect(sameX || sameZ).toBe(true);
    }
    expect(route[route.length - 1][0]).toBe(bank[0]);
  });

  it('colaborador caminha pela calçada de uma rua vertical até o canteiro', () => {
    const site: [number, number, number] = [3.4, 0, 6];
    const route = walkerRoute([7.5, 0, -4.2], site);
    const vx = route[2][0];
    expect(verticalRoadXs().some((x) => Math.abs(x + 0.55 - vx) < 1e-9)).toBe(true);
    expect(route[route.length - 1][0]).toBe(site[0]);
  });
});
