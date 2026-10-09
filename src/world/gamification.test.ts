import { describe, expect, it } from 'vitest';
import type { ChamadoDTO, FaturaDTO, KanbanAtividadeDTO, KanbanColunaDTO } from '../types/domain';
import {
  achievements,
  cityHealth,
  computeXp,
  levelInfo,
  levelThreshold,
  weekStart,
  weeklyMissions,
  weeklyRanking,
  type GameData,
} from './gamification';

const NOW = Date.parse('2026-10-07T15:00:00'); // quarta-feira

function chamado(id: number, extra: Partial<ChamadoDTO>): ChamadoDTO {
  return {
    idChamado: id,
    protocolo: `P${id}`,
    origem: 'Interno',
    idCliente: 1,
    clienteNome: 'C',
    usuarioNome: 'U',
    usuarioEmail: null,
    assunto: 'A',
    descricao: 'D',
    prioridade: 'Media',
    status: 'Aberto',
    resposta: null,
    idUsuarioAdminResponsavel: null,
    nomeResponsavel: null,
    dataHoraAbertura: '2026-10-01T10:00:00',
    dataHoraUltimaAtualizacao: '2026-10-06T10:00:00',
    idProjetoAtividadeVinculada: null,
    idAtividadeVinculada: null,
    ...extra,
  };
}

function fatura(id: number, extra: Partial<FaturaDTO>): FaturaDTO {
  return {
    idFatura: id,
    idCliente: 1,
    clienteNome: 'C',
    idContrato: null,
    idProjeto: null,
    numeroFatura: `F${id}`,
    descricao: '',
    valor: 1000,
    dataEmissao: '2026-09-01T00:00:00',
    dataVencimento: '2026-09-10T00:00:00',
    dataPagamento: null,
    status: 'Pendente',
    formaPagamento: null,
    observacoes: null,
    ...extra,
  };
}

function atividade(id: number, extra: Partial<KanbanAtividadeDTO>): KanbanAtividadeDTO {
  return {
    idAtividade: id,
    idColuna: 2,
    idProjeto: 1,
    titulo: 'T',
    descricao: null,
    tipo: 'Tarefa',
    prioridade: 'Media',
    idUsuarioAdminResponsavel: null,
    nomeResponsavel: null,
    dataPrazo: null,
    ordem: 0,
    idChamadoOrigem: null,
    protocoloChamadoOrigem: null,
    dataCriacao: '2026-09-01T00:00:00',
    dataConclusao: null,
    ...extra,
  };
}

function data(extra: Partial<GameData> = {}): GameData {
  return {
    clientes: [],
    contratos: [],
    projetos: [],
    chamados: [],
    faturas: [],
    wikiPaginas: [],
    kanbans: new Map(),
    observabilidade: null,
    dashboard: null,
    ...extra,
  };
}

function quadro(concluidas: KanbanAtividadeDTO[], abertas: KanbanAtividadeDTO[] = []): Map<number, KanbanColunaDTO[]> {
  return new Map([
    [
      1,
      [
        { idColuna: 1, idProjeto: 1, nome: 'Fazendo', ordem: 0, ehColunaConclusao: false, atividades: abertas },
        { idColuna: 2, idProjeto: 1, nome: 'Concluído', ordem: 1, ehColunaConclusao: true, atividades: concluidas },
      ],
    ],
  ]);
}

describe('XP', () => {
  it('premia resultado: chamado reaberto deixa de valer', () => {
    const resolvido = computeXp(data({ chamados: [chamado(1, { status: 'Resolvido', prioridade: 'Alta' })] }));
    const reaberto = computeXp(data({ chamados: [chamado(1, { status: 'Aberto', prioridade: 'Alta' })] }));
    expect(resolvido.total).toBe(100);
    expect(reaberto.total).toBe(0);
  });

  it('soma atividades entregues (bug vale mais) e faturas pagas pelo valor', () => {
    const r = computeXp(
      data({
        kanbans: quadro([atividade(1, {}), atividade(2, { tipo: 'Bug' })], [atividade(3, {})]),
        faturas: [fatura(1, { status: 'Pago', valor: 15000 }), fatura(2, { status: 'Pendente' })],
      })
    );
    expect(r.lines.find((l) => l.key === 'atividades')).toMatchObject({ count: 2, xp: 50 });
    expect(r.lines.find((l) => l.key === 'faturas')).toMatchObject({ count: 1, xp: 30 + 75 });
  });

  it('metas cumpridas somam uma linha ao XP', () => {
    const base = data({ chamados: [chamado(1, { status: 'Resolvido', prioridade: 'Alta' })] });
    const comMetas = computeXp({ ...base, metasCumpridas: { quantas: 2, xp: 350 } });
    expect(comMetas.lines.find((l) => l.key === 'metas')).toMatchObject({ count: 2, xp: 350 });
    expect(comMetas.total).toBe(100 + 350);
  });

  it('sem meta cumprida, o XP é exatamente o de sempre', () => {
    // Nenhuma cidade existente pode mudar de nível só porque as metas passaram a existir.
    const base = data({ chamados: [chamado(1, { status: 'Resolvido', prioridade: 'Alta' })] });
    const semCampo = computeXp(base);
    const zerado = computeXp({ ...base, metasCumpridas: { quantas: 0, xp: 0 } });
    expect(zerado.total).toBe(semCampo.total);
    expect(zerado.lines.some((l) => l.key === 'metas')).toBe(false);
  });
});

describe('níveis', () => {
  it('limiares crescentes e progresso dentro do nível', () => {
    expect(levelThreshold(1)).toBe(0);
    expect(levelThreshold(2)).toBe(300);
    expect(levelInfo(0)).toMatchObject({ level: 1, progress: 0 });
    expect(levelInfo(299).level).toBe(1);
    expect(levelInfo(300).level).toBe(2);
    const l = levelInfo(1200); // nível 3 (900..1800)
    expect(l.level).toBe(3);
    expect(l.progress).toBeCloseTo(300 / 900);
    expect(l.unlocked.map((u) => u.key)).toEqual(['fonte', 'estatua']);
    expect(l.nextUnlock?.key).toBe('parque');
  });
});

describe('saúde da cidade', () => {
  it('cidade em dia = sol; problemas viram chuva/tempestade', () => {
    expect(cityHealth(data(), NOW)).toMatchObject({ score: 100, weather: 'sol' });
    const ruim = cityHealth(
      data({
        chamados: [1, 2, 3, 4].map((i) => chamado(i, { prioridade: 'Alta' })),
        faturas: [fatura(1, { status: 'Atrasado' }), fatura(2, { status: 'Atrasado' })],
      }),
      NOW
    );
    expect(ruim.score).toBe(100 - 48 - 20);
    expect(ruim.weather).toBe('tempestade');
    expect(ruim.factors.length).toBe(2);
  });

  it('nunca sai de 0..100', () => {
    const r = cityHealth(data({ chamados: Array.from({ length: 30 }, (_, i) => chamado(i, { prioridade: 'Alta' })) }), NOW);
    expect(r.score).toBe(0);
  });
});

describe('semana', () => {
  it('começa na segunda-feira', () => {
    const start = new Date(weekStart(NOW));
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(5);
    expect(start.getHours()).toBe(0);
  });

  it('missões contam só o que aconteceu na semana', () => {
    const missions = weeklyMissions(
      data({
        chamados: [
          chamado(1, { status: 'Resolvido', dataHoraUltimaAtualizacao: '2026-10-06T09:00:00' }),
          chamado(2, { status: 'Fechado', dataHoraUltimaAtualizacao: '2026-09-20T09:00:00' }),
        ],
        faturas: [fatura(1, { status: 'Pago', dataPagamento: '2026-10-07T08:00:00' })],
      }),
      NOW
    );
    expect(missions.find((m) => m.key === 'resolver-3')).toMatchObject({ progresso: 1, done: false });
    expect(missions.find((m) => m.key === 'receber-2')).toMatchObject({ progresso: 1 });
    expect(missions.find((m) => m.key === 'alta-zero')?.done).toBe(true);
    expect(missions.find((m) => m.key === 'sem-atraso')?.done).toBe(true);
  });

  it('ranking soma entregas e chamados resolvidos por pessoa', () => {
    const ranking = weeklyRanking(
      data({
        kanbans: quadro([
          atividade(1, { idUsuarioAdminResponsavel: 7, nomeResponsavel: 'Carla', dataConclusao: '2026-10-06T10:00:00', tipo: 'Bug' }),
          atividade(2, { idUsuarioAdminResponsavel: 8, nomeResponsavel: 'Diego', dataConclusao: '2026-09-01T10:00:00' }),
        ]),
        chamados: [chamado(1, { status: 'Resolvido', idUsuarioAdminResponsavel: 8, nomeResponsavel: 'Diego', prioridade: 'Alta' })],
      }),
      NOW
    );
    expect(ranking.map((r) => [r.nome, r.xp])).toEqual([
      ['Diego', 100],
      ['Carla', 30],
    ]);
  });
});

describe('conquistas', () => {
  it('avalia condições atuais', () => {
    const list = achievements(data({ chamados: [] }), { level: 5, health: 95, now: NOW });
    expect(list.find((a) => a.key === 'caixa-zero')?.met).toBe(true);
    expect(list.find((a) => a.key === 'prefeitura')?.met).toBe(true);
    expect(list.find((a) => a.key === 'pedra-fundamental')?.met).toBe(false);
  });
});
