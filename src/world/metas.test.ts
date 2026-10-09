import { describe, expect, it } from 'vitest';
import type { ChamadoDTO, ClienteDTO, ContratoDTO, FaturaDTO, KanbanColunaDTO, ProjetoDTO, WikiPaginaDTO } from '../types/domain';
import type { GameData } from './gamification';
import {
  avaliarMetas,
  contarAtivas,
  erroDaMeta,
  fimDaJanela,
  inicioDaJanela,
  METRICAS,
  METRICA_LABEL,
  metasParaRegistrar,
  progressoDaMeta,
  RECOMPENSA_MAX,
  xpDeMetas,
  type Cumpridas,
  type Meta,
  type MetaMetrica,
} from './metas';

/** Meio-dia local: longe o bastante das bordas para o teste não depender do fuso da máquina. */
const em = (dia: string) => `${dia}T12:00:00`;

const meta = (over: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  titulo: 'Meta',
  metrica: 'chamados',
  alvo: 2,
  inicio: '2026-11-01',
  fim: '2026-11-30',
  recompensa: 100,
  idResponsavel: null,
  nomeResponsavel: null,
  criadaEm: em('2026-10-20'),
  ...over,
});

const chamado = (id: number, over: Partial<ChamadoDTO> = {}): ChamadoDTO =>
  ({
    idChamado: id,
    protocolo: `MC-${id}`,
    origem: 'Interno',
    idCliente: 1,
    clienteNome: 'C',
    usuarioNome: 'U',
    usuarioEmail: null,
    assunto: 'A',
    descricao: null,
    prioridade: 'Media',
    status: 'Resolvido',
    resposta: null,
    idUsuarioAdminResponsavel: null,
    nomeResponsavel: null,
    dataHoraAbertura: em('2026-11-02'),
    dataHoraUltimaAtualizacao: em('2026-11-10'),
    idProjetoAtividadeVinculada: null,
    idAtividadeVinculada: null,
    ...over,
  }) as ChamadoDTO;

const fatura = (id: number, over: Partial<FaturaDTO> = {}): FaturaDTO =>
  ({
    idFatura: id,
    idCliente: 1,
    clienteNome: 'C',
    idContrato: null,
    idProjeto: null,
    numeroFatura: `F-${id}`,
    descricao: '',
    valor: 1000,
    dataEmissao: em('2026-11-01'),
    dataVencimento: em('2026-11-10'),
    dataPagamento: em('2026-11-05'),
    status: 'Pago',
    formaPagamento: null,
    observacoes: null,
    ...over,
  }) as FaturaDTO;

const colunaConcluida = (atividades: { dataConclusao: string; idUsuarioAdminResponsavel?: number | null }[]): KanbanColunaDTO =>
  ({
    idColuna: 1,
    idProjeto: 1,
    nome: 'Entregue',
    ordem: 0,
    ehColunaConclusao: true,
    atividades: atividades.map((a, i) => ({
      idAtividade: i + 1,
      idColuna: 1,
      idProjeto: 1,
      titulo: 'T',
      descricao: null,
      tipo: 'Tarefa',
      prioridade: 'Media',
      idUsuarioAdminResponsavel: a.idUsuarioAdminResponsavel ?? null,
      nomeResponsavel: null,
      dataPrazo: null,
      ordem: i,
      idChamadoOrigem: null,
      protocoloChamadoOrigem: null,
      dataCriacao: em('2026-11-01'),
      dataConclusao: a.dataConclusao,
    })),
  }) as KanbanColunaDTO;

const mundo = (over: Partial<GameData> = {}): GameData => ({
  clientes: [],
  contratos: [],
  projetos: [],
  chamados: [],
  faturas: [],
  wikiPaginas: [],
  kanbans: new Map(),
  observabilidade: null,
  dashboard: null,
  ...over,
});

describe('janela da meta', () => {
  it('cobre o dia inteiro nos dois extremos, em horário local', () => {
    const m = meta({ inicio: '2026-11-01', fim: '2026-11-30' });
    const inicio = new Date(inicioDaJanela(m));
    const fim = new Date(fimDaJanela(m));
    // Se a data fosse lida como UTC, em fuso negativo o início cairia em 31/10.
    expect(inicio.getDate()).toBe(1);
    expect(inicio.getMonth()).toBe(10);
    expect(inicio.getHours()).toBe(0);
    expect(fim.getDate()).toBe(30);
    expect(fim.getHours()).toBe(23);
  });

  it('o primeiro e o último dia contam', () => {
    const m = meta({ metrica: 'wiki', alvo: 1 });
    const d = (dia: string) =>
      mundo({ wikiPaginas: [{ dataCriacao: em(dia) } as WikiPaginaDTO] });
    expect(progressoDaMeta(m, d('2026-11-01'))).toBe(1);
    expect(progressoDaMeta(m, d('2026-11-30'))).toBe(1);
    expect(progressoDaMeta(m, d('2026-10-31'))).toBe(0);
    expect(progressoDaMeta(m, d('2026-12-01'))).toBe(0);
  });
});

describe('progresso por métrica', () => {
  it('chamados conta só os resolvidos dentro da janela', () => {
    const d = mundo({
      chamados: [
        chamado(1, { dataHoraUltimaAtualizacao: em('2026-11-10') }),
        chamado(2, { status: 'Fechado', dataHoraUltimaAtualizacao: em('2026-11-12') }),
        chamado(3, { status: 'Aberto', dataHoraUltimaAtualizacao: em('2026-11-12') }),
        chamado(4, { dataHoraUltimaAtualizacao: em('2026-12-05') }),
      ],
    });
    expect(progressoDaMeta(meta(), d)).toBe(2);
  });

  it('atividades conta as entregues na janela', () => {
    const d = mundo({
      kanbans: new Map([[1, [colunaConcluida([{ dataConclusao: em('2026-11-03') }, { dataConclusao: em('2026-12-03') }])]]]),
    });
    expect(progressoDaMeta(meta({ metrica: 'atividades' }), d)).toBe(1);
  });

  it('faturas conta quantas foram pagas; receita soma o valor', () => {
    const d = mundo({ faturas: [fatura(1, { valor: 1500 }), fatura(2, { valor: 2500 })] });
    expect(progressoDaMeta(meta({ metrica: 'faturas' }), d)).toBe(2);
    expect(progressoDaMeta(meta({ metrica: 'receita' }), d)).toBe(4000);
  });

  it('fatura não paga não conta em nenhuma das duas', () => {
    const d = mundo({ faturas: [fatura(1, { status: 'Pendente', dataPagamento: null })] });
    expect(progressoDaMeta(meta({ metrica: 'faturas' }), d)).toBe(0);
    expect(progressoDaMeta(meta({ metrica: 'receita' }), d)).toBe(0);
  });

  it('projetos conta os concluídos; clientes, os ativos cadastrados na janela', () => {
    const d = mundo({
      projetos: [
        { status: 'Concluido', dataConclusao: em('2026-11-09') } as ProjetoDTO,
        { status: 'EmAndamento', dataConclusao: null } as ProjetoDTO,
      ],
      clientes: [
        { status: 'Ativo', dataCadastro: em('2026-11-02') } as ClienteDTO,
        { status: 'Inativo', dataCadastro: em('2026-11-02') } as ClienteDTO,
      ],
    });
    expect(progressoDaMeta(meta({ metrica: 'projetos' }), d)).toBe(1);
    expect(progressoDaMeta(meta({ metrica: 'clientes' }), d)).toBe(1);
  });

  it('contratos conta os fechados na janela', () => {
    const d = mundo({
      contratos: [
        { status: 'Ativo', dataCriacao: em('2026-11-04') } as ContratoDTO,
        { status: 'Rascunho', dataCriacao: em('2026-11-04') } as ContratoDTO,
      ],
    });
    expect(progressoDaMeta(meta({ metrica: 'contratos' }), d)).toBe(1);
  });

  it('toda métrica da lista sabe se medir', () => {
    for (const m of METRICAS) {
      expect(progressoDaMeta(meta({ metrica: m }), mundo())).toBe(0);
      expect(METRICA_LABEL[m]).toBeTruthy();
    }
  });
});

describe('meta de uma pessoa', () => {
  const d = mundo({
    chamados: [
      chamado(1, { idUsuarioAdminResponsavel: 7 }),
      chamado(2, { idUsuarioAdminResponsavel: 9 }),
      chamado(3, { idUsuarioAdminResponsavel: null }),
    ],
    kanbans: new Map([
      [
        1,
        [
          colunaConcluida([
            { dataConclusao: em('2026-11-05'), idUsuarioAdminResponsavel: 7 },
            { dataConclusao: em('2026-11-06'), idUsuarioAdminResponsavel: 9 },
          ]),
        ],
      ],
    ]),
  });

  it('conta só o que é da pessoa', () => {
    expect(progressoDaMeta(meta({ idResponsavel: 7 }), d)).toBe(1);
    expect(progressoDaMeta(meta({ metrica: 'atividades', idResponsavel: 7 }), d)).toBe(1);
  });

  it('sem responsável, a mesma meta conta o time todo', () => {
    expect(progressoDaMeta(meta({ idResponsavel: null }), d)).toBe(3);
    expect(progressoDaMeta(meta({ metrica: 'atividades', idResponsavel: null }), d)).toBe(2);
  });
});

describe('situação', () => {
  const dentro = new Date(2026, 10, 15).getTime();
  const antes = new Date(2026, 9, 15).getTime();
  const depois = new Date(2026, 11, 15).getTime();
  const vazio: Cumpridas = {};

  const situacao = (agora: number, cumpridas: Cumpridas = vazio, m = meta()) =>
    avaliarMetas([m], mundo(), cumpridas, agora)[0].situacao;

  it('agendada antes de começar, ativa dentro, expirada depois', () => {
    expect(situacao(antes)).toBe('agendada');
    expect(situacao(dentro)).toBe('ativa');
    expect(situacao(depois)).toBe('expirada');
  });

  it('cumprida continua cumprida mesmo com a janela vencida', () => {
    const registrada: Cumpridas = { m1: { em: em('2026-11-20'), xp: 100, titulo: 'Meta' } };
    expect(situacao(depois, registrada)).toBe('cumprida');
    expect(situacao(antes, registrada)).toBe('cumprida');
  });

  it('cumprida continua cumprida mesmo se o progresso cair abaixo do alvo', () => {
    // Um chamado reaberto sai de "resolvidos": sem o registro, a recompensa se perderia.
    const registrada: Cumpridas = { m1: { em: em('2026-11-20'), xp: 100, titulo: 'Meta' } };
    const [item] = avaliarMetas([meta()], mundo({ chamados: [] }), registrada, dentro);
    expect(item.progresso).toBe(0);
    expect(item.situacao).toBe('cumprida');
  });

  it('a barra não passa de cheia, mas a contagem real continua à vista', () => {
    const d = mundo({ chamados: [chamado(1), chamado(2), chamado(3), chamado(4)] });
    const [item] = avaliarMetas([meta({ alvo: 2 })], d, vazio, dentro);
    expect(item.progresso).toBe(4);
    expect(item.pct).toBe(1);
  });

  it('ordena o que pede atenção primeiro e o histórico no fim', () => {
    const metas = [
      meta({ id: 'exp', fim: '2026-10-01', inicio: '2026-09-01' }),
      meta({ id: 'ativa' }),
      meta({ id: 'futura', inicio: '2026-12-01', fim: '2026-12-31' }),
    ];
    expect(avaliarMetas(metas, mundo(), vazio, dentro).map((m) => m.meta.id)).toEqual(['ativa', 'futura', 'exp']);
  });
});

describe('registro e bônus', () => {
  const dentro = new Date(2026, 10, 15).getTime();

  it('só entrega para registrar o que está ativo e bateu o alvo', () => {
    const d = mundo({ chamados: [chamado(1), chamado(2)] });
    const avaliadas = avaliarMetas([meta({ alvo: 2 }), meta({ id: 'm2', alvo: 5 })], d, {}, dentro);
    expect(metasParaRegistrar(avaliadas).map((m) => m.meta.id)).toEqual(['m1']);
  });

  it('o que já foi registrado não volta para a fila', () => {
    const d = mundo({ chamados: [chamado(1), chamado(2)] });
    const cumpridas: Cumpridas = { m1: { em: em('2026-11-10'), xp: 100, titulo: 'Meta' } };
    expect(metasParaRegistrar(avaliarMetas([meta()], d, cumpridas, dentro))).toEqual([]);
  });

  it('meta expirada que bateu depois do prazo não é registrada', () => {
    const d = mundo({ chamados: [chamado(1), chamado(2)] });
    const fora = new Date(2026, 11, 15).getTime();
    expect(metasParaRegistrar(avaliarMetas([meta()], d, {}, fora))).toEqual([]);
  });

  it('o bônus sai do registro, com o valor pago na época', () => {
    const cumpridas: Cumpridas = {
      a: { em: em('2026-11-10'), xp: 100, titulo: 'A' },
      b: { em: em('2026-11-12'), xp: 250, titulo: 'B' },
    };
    expect(xpDeMetas(cumpridas)).toBe(350);
    expect(xpDeMetas({})).toBe(0);
  });

  it('contarAtivas ignora as cumpridas e as fora da janela', () => {
    const metas = [meta({ id: 'a' }), meta({ id: 'b' }), meta({ id: 'c', inicio: '2026-12-01', fim: '2026-12-31' })];
    expect(contarAtivas(metas, {}, dentro)).toBe(2);
    expect(contarAtivas(metas, { a: { em: em('2026-11-10'), xp: 1, titulo: 'A' } }, dentro)).toBe(1);
  });
});

describe('validação', () => {
  const rascunho = (over: Partial<Meta> = {}) => {
    const { titulo, metrica, alvo, inicio, fim, recompensa, idResponsavel, nomeResponsavel } = meta(over);
    return { titulo, metrica, alvo, inicio, fim, recompensa, idResponsavel, nomeResponsavel };
  };

  it('aceita uma meta bem montada', () => {
    expect(erroDaMeta(rascunho())).toBeNull();
  });

  it('recusa título vazio e alvo inválido', () => {
    expect(erroDaMeta(rascunho({ titulo: '   ' }))).toMatch(/nome/i);
    expect(erroDaMeta(rascunho({ alvo: 0 }))).toMatch(/alvo/i);
    expect(erroDaMeta(rascunho({ alvo: Number.NaN }))).toMatch(/alvo/i);
  });

  it('recusa janela invertida', () => {
    expect(erroDaMeta(rascunho({ inicio: '2026-11-30', fim: '2026-11-01' }))).toMatch(/antes do início/i);
    // Um único dia é uma janela válida.
    expect(erroDaMeta(rascunho({ inicio: '2026-11-05', fim: '2026-11-05' }))).toBeNull();
  });

  it('recusa recompensa negativa ou acima do teto', () => {
    expect(erroDaMeta(rascunho({ recompensa: -1 }))).toMatch(/negativa/i);
    expect(erroDaMeta(rascunho({ recompensa: RECOMPENSA_MAX + 1 }))).toMatch(String(RECOMPENSA_MAX));
    expect(erroDaMeta(rascunho({ recompensa: RECOMPENSA_MAX }))).toBeNull();
    expect(erroDaMeta(rascunho({ recompensa: 0 }))).toBeNull();
  });

  it('recusa responsável numa métrica que não tem responsável no backend', () => {
    for (const m of ['faturas', 'wiki', 'receita', 'clientes', 'contratos', 'projetos'] as MetaMetrica[]) {
      expect(erroDaMeta(rascunho({ metrica: m, idResponsavel: 7 })), m).toBeTruthy();
    }
    for (const m of ['chamados', 'atividades'] as MetaMetrica[]) {
      expect(erroDaMeta(rascunho({ metrica: m, idResponsavel: 7 })), m).toBeNull();
    }
  });
});
