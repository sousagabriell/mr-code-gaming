import { describe, expect, it } from 'vitest';
import type { ChamadoDTO, ChamadoStatus, ClienteDTO, Prioridade } from '../types/domain';
import {
  abaDoChamado,
  blocosDaConversa,
  contarPorAba,
  conversas,
  FILTROS_VAZIOS,
  filtrarChamados,
  formatarPrazo,
  mensagemDePrazo,
  prazoInvalido,
  temFiltro,
  type ChamadoFiltros,
  type MensagemLike,
} from './phone';

function chamado(over: Partial<ChamadoDTO> & { idChamado: number }): ChamadoDTO {
  return {
    protocolo: `MC-2026000000${over.idChamado}`,
    origem: 'Interno',
    idCliente: 1,
    clienteNome: 'Clínica Vida',
    usuarioNome: 'Paulo Henrique',
    usuarioEmail: null,
    assunto: 'Assunto',
    descricao: '',
    prioridade: 'Media' as Prioridade,
    status: 'Aberto' as ChamadoStatus,
    resposta: null,
    idUsuarioAdminResponsavel: null,
    nomeResponsavel: null,
    dataHoraAbertura: '2026-10-01T10:00:00',
    dataHoraUltimaAtualizacao: '2026-10-01T10:00:00',
    idProjetoAtividadeVinculada: null,
    idAtividadeVinculada: null,
    ...over,
  };
}

function cliente(idCliente: number, nomeFantasia: string): ClienteDTO {
  return {
    idCliente,
    razaoSocial: `${nomeFantasia} Ltda`,
    nomeFantasia,
    cpfCnpj: '00000000000000',
    email: null,
    telefone: null,
    nomeContato: null,
    idSistemaOrigem: null,
    sistemaOrigemNome: null,
    status: 'Ativo',
    observacoes: null,
    dataCadastro: '2026-01-01T00:00:00',
  };
}

const filtros = (over: Partial<ChamadoFiltros> = {}): ChamadoFiltros => ({ ...FILTROS_VAZIOS, ...over });

describe('abas', () => {
  const lista = [
    chamado({ idChamado: 1, status: 'Aberto' }),
    chamado({ idChamado: 2, status: 'EmAndamento' }),
    chamado({ idChamado: 3, status: 'Resolvido' }),
    chamado({ idChamado: 4, status: 'Fechado' }),
  ];

  it('Resolvido e Fechado caem na mesma aba', () => {
    expect(filtrarChamados(lista, 'fechados', filtros()).map((c) => c.idChamado)).toEqual([3, 4]);
    expect(abaDoChamado('Resolvido')).toBe('fechados');
    expect(abaDoChamado('Fechado')).toBe('fechados');
  });

  it('EmAndamento não aparece entre os abertos', () => {
    expect(filtrarChamados(lista, 'abertos', filtros()).map((c) => c.idChamado)).toEqual([1]);
    expect(filtrarChamados(lista, 'andamento', filtros()).map((c) => c.idChamado)).toEqual([2]);
  });

  it('cada chamado cai em exatamente uma aba', () => {
    const contagem = contarPorAba(lista, filtros());
    expect(contagem.abertos + contagem.andamento + contagem.fechados).toBe(lista.length);
  });

  it('a contagem das abas respeita os outros filtros', () => {
    const comPrioridade = [...lista, chamado({ idChamado: 5, status: 'Aberto', prioridade: 'Alta' })];
    expect(contarPorAba(comPrioridade, filtros({ prioridade: 'Alta' }))).toEqual({
      abertos: 1,
      andamento: 0,
      fechados: 0,
    });
  });
});

describe('filtrarChamados', () => {
  const lista = [
    chamado({ idChamado: 1, assunto: 'Erro ao gerar boleto', clienteNome: 'Clínica Vida' }),
    chamado({ idChamado: 2, assunto: 'Exportação de dados', clienteNome: 'AgroTech', origem: 'TJCoach' }),
  ];

  it('busca ignora acento e caixa', () => {
    expect(filtrarChamados(lista, 'abertos', filtros({ busca: 'CLINICA' })).map((c) => c.idChamado)).toEqual([1]);
    expect(filtrarChamados(lista, 'abertos', filtros({ busca: 'exportacao' })).map((c) => c.idChamado)).toEqual([2]);
  });

  it('busca casa protocolo, cliente e solicitante', () => {
    expect(filtrarChamados(lista, 'abertos', filtros({ busca: '0000002' })).map((c) => c.idChamado)).toEqual([2]);
    expect(filtrarChamados(lista, 'abertos', filtros({ busca: 'agrotech' })).map((c) => c.idChamado)).toEqual([2]);
    expect(filtrarChamados(lista, 'abertos', filtros({ busca: 'paulo' })).map((c) => c.idChamado)).toEqual([1, 2]);
  });

  it('filtra por origem e por prioridade', () => {
    expect(filtrarChamados(lista, 'abertos', filtros({ origem: 'TJCoach' })).map((c) => c.idChamado)).toEqual([2]);
    expect(filtrarChamados(lista, 'abertos', filtros({ prioridade: 'Alta' }))).toEqual([]);
  });

  it('o contexto do distrito restringe ao cliente', () => {
    const outro = [...lista, chamado({ idChamado: 3, idCliente: 9 })];
    expect(filtrarChamados(outro, 'abertos', filtros(), 9).map((c) => c.idChamado)).toEqual([3]);
  });

  it('ordena por prioridade e, empatado, pela atividade mais recente', () => {
    const bagunca = [
      chamado({ idChamado: 1, prioridade: 'Baixa', dataHoraUltimaAtualizacao: '2026-10-05T10:00:00' }),
      chamado({ idChamado: 2, prioridade: 'Alta', dataHoraUltimaAtualizacao: '2026-10-01T10:00:00' }),
      chamado({ idChamado: 3, prioridade: 'Baixa', dataHoraUltimaAtualizacao: '2026-10-07T10:00:00' }),
    ];
    expect(filtrarChamados(bagunca, 'abertos', filtros()).map((c) => c.idChamado)).toEqual([2, 3, 1]);
  });

  it('não altera a lista recebida', () => {
    const original = [...lista];
    filtrarChamados(lista, 'abertos', filtros());
    expect(lista).toEqual(original);
  });

  it('temFiltro só acusa filtro de verdade', () => {
    expect(temFiltro(filtros())).toBe(false);
    expect(temFiltro(filtros({ busca: '   ' }))).toBe(false);
    expect(temFiltro(filtros({ origem: 'Interno' }))).toBe(true);
  });
});

describe('conversas', () => {
  const clientes = [cliente(1, 'Clínica Vida'), cliente(2, 'AgroTech'), cliente(3, 'Bom Pão')];
  const chamados = [
    chamado({ idChamado: 1, idCliente: 1, status: 'Fechado', dataHoraUltimaAtualizacao: '2026-10-02T10:00:00' }),
    chamado({ idChamado: 2, idCliente: 1, status: 'Aberto', dataHoraUltimaAtualizacao: '2026-10-04T10:00:00' }),
    chamado({ idChamado: 3, idCliente: 2, status: 'EmAndamento', dataHoraUltimaAtualizacao: '2026-10-06T10:00:00' }),
  ];

  it('ordena pela conversa com atividade mais recente', () => {
    expect(conversas(clientes, chamados).map((c) => c.idCliente)).toEqual([2, 1, 3]);
  });

  it('cliente sem chamado vai para o fim, mas continua listado', () => {
    const semConversa = conversas(clientes, chamados)[2];
    expect(semConversa.idCliente).toBe(3);
    expect(semConversa.ultimo).toBeNull();
    expect(semConversa.chamados).toEqual([]);
  });

  it('conta os chamados abertos e usa o mais recente como prévia', () => {
    const vida = conversas(clientes, chamados).find((c) => c.idCliente === 1)!;
    expect(vida.abertos).toBe(1);
    expect(vida.ultimo?.idChamado).toBe(2);
    expect(vida.chamados.map((c) => c.idChamado)).toEqual([2, 1]);
  });

  it('chamado sem cliente não entra em conversa nenhuma', () => {
    const orfao = [...chamados, chamado({ idChamado: 9, idCliente: null })];
    const todos = conversas(clientes, orfao).flatMap((c) => c.chamados.map((x) => x.idChamado));
    expect(todos).not.toContain(9);
  });
});

describe('blocosDaConversa', () => {
  const chamados = [
    chamado({ idChamado: 1, protocolo: 'MC-AAA', assunto: 'Boleto' }),
    chamado({ idChamado: 2, protocolo: 'MC-BBB', assunto: 'Exportação' }),
  ];
  const msg = (idMensagem: number, idChamado: number, dataCriacao: string): MensagemLike => ({
    idMensagem,
    idChamado,
    autorNome: 'Cliente',
    autorEhAdmin: false,
    conteudoHtml: `<p>${idMensagem}</p>`,
    dataCriacao,
  });

  it('é cronológica e abre um bloco a cada troca de chamado', () => {
    const blocos = blocosDaConversa(
      [
        msg(3, 1, '2026-10-05T12:00:00'),
        msg(1, 1, '2026-10-01T09:00:00'),
        msg(2, 2, '2026-10-03T09:00:00'),
      ],
      chamados
    );
    expect(blocos.map((b) => b.idChamado)).toEqual([1, 2, 1]);
    expect(blocos.map((b) => b.protocolo)).toEqual(['MC-AAA', 'MC-BBB', 'MC-AAA']);
    expect(blocos.flatMap((b) => b.mensagens.map((m) => m.idMensagem))).toEqual([1, 2, 3]);
  });

  it('agrupa mensagens seguidas do mesmo chamado num bloco só', () => {
    const blocos = blocosDaConversa([msg(1, 1, '2026-10-01T09:00:00'), msg(2, 1, '2026-10-01T09:05:00')], chamados);
    expect(blocos).toHaveLength(1);
    expect(blocos[0].mensagens).toHaveLength(2);
  });

  it('desempata pelo id quando a data é idêntica', () => {
    const blocos = blocosDaConversa([msg(2, 1, '2026-10-01T09:00:00'), msg(1, 1, '2026-10-01T09:00:00')], chamados);
    expect(blocos[0].mensagens.map((m) => m.idMensagem)).toEqual([1, 2]);
  });

  it('sobrevive a uma mensagem de chamado que não está na lista', () => {
    const blocos = blocosDaConversa([msg(1, 77, '2026-10-01T09:00:00')], chamados);
    expect(blocos[0].protocolo).toBe('#77');
  });

  it('sem mensagem, sem bloco', () => {
    expect(blocosDaConversa([], chamados)).toEqual([]);
  });
});

describe('prazo', () => {
  const hoje = new Date(2026, 9, 8); // 8 de outubro de 2026, hora local

  it('formata sem deixar o fuso virar o dia', () => {
    expect(formatarPrazo('2026-10-12')).toBe('12/10/2026');
    expect(formatarPrazo('2026-01-01')).toBe('01/01/2026');
  });

  it('exige preenchimento', () => {
    expect(prazoInvalido('', hoje)).toBe('Informe o prazo de atendimento.');
  });

  it('recusa data no passado e aceita hoje', () => {
    expect(prazoInvalido('2026-10-07', hoje)).toBe('O prazo não pode ser no passado.');
    expect(prazoInvalido('2026-10-08', hoje)).toBeNull();
    expect(prazoInvalido('2026-12-31', hoje)).toBeNull();
  });

  it('recusa formato que não é uma data', () => {
    expect(prazoInvalido('12/10/2026', hoje)).toBe('Data inválida.');
  });

  it('a mensagem automática cita o assunto e a data em pt-BR', () => {
    const texto = mensagemDePrazo('Erro ao gerar boleto', '2026-10-12');
    expect(texto).toContain('Erro ao gerar boleto');
    expect(texto).toContain('12/10/2026');
  });
});
