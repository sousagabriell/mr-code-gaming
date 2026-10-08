import { describe, expect, it } from 'vitest';
import type { DespesaDTO, FaturaDTO } from '../types/domain';
import {
  agruparPorDia,
  categoriasDe,
  dataDaDespesa,
  dataDaFatura,
  deslocarMes,
  FILTROS_EXTRATO,
  filtrarDespesas,
  filtrarFaturas,
  labelDia,
  labelMes,
  mesDe,
  mesParam,
  mesmoMes,
  noMes,
  resumoDespesas,
  temFiltroExtrato,
  type ExtratoFiltros,
} from './extrato';

function fatura(over: Partial<FaturaDTO> & { idFatura: number }): FaturaDTO {
  return {
    idCliente: 1,
    clienteNome: 'Clínica Vida',
    idContrato: null,
    idProjeto: null,
    numeroFatura: `FT-${over.idFatura}`,
    descricao: 'Mensalidade',
    valor: 1000,
    dataEmissao: '2026-10-01T00:00:00',
    dataVencimento: '2026-10-10T00:00:00',
    dataPagamento: null,
    status: 'Pendente',
    formaPagamento: null,
    observacoes: null,
    ...over,
  };
}

function despesa(over: Partial<DespesaDTO> & { idDespesa: number }): DespesaDTO {
  return {
    descricao: 'Hospedagem',
    categoria: 'Infraestrutura',
    valor: 320,
    dataDespesa: '2026-10-05T00:00:00',
    status: 'Pendente',
    recorrente: false,
    observacoes: null,
    ...over,
  };
}

const filtros = (over: Partial<ExtratoFiltros> = {}): ExtratoFiltros => ({ ...FILTROS_EXTRATO, ...over });

describe('navegador de mês', () => {
  it('atravessa a virada de ano nos dois sentidos', () => {
    expect(deslocarMes({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(deslocarMes({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
    expect(deslocarMes({ ano: 2026, mes: 6 }, 7)).toEqual({ ano: 2027, mes: 1 });
  });

  it('volta ao mesmo mês indo e voltando', () => {
    const inicio = { ano: 2026, mes: 3 };
    expect(deslocarMes(deslocarMes(inicio, 5), -5)).toEqual(inicio);
  });

  it('mesDe lê o mês local, não o UTC', () => {
    expect(mesDe(new Date(2026, 0, 1))).toEqual({ ano: 2026, mes: 1 });
  });

  it('rotula com inicial maiúscula e formata o parâmetro da API', () => {
    expect(labelMes({ ano: 2026, mes: 10 })).toBe('Outubro de 2026');
    expect(mesParam({ ano: 2026, mes: 3 })).toBe('2026-03');
    expect(mesParam({ ano: 2026, mes: 11 })).toBe('2026-11');
  });

  it('mesmoMes compara ano e mês', () => {
    expect(mesmoMes({ ano: 2026, mes: 10 }, { ano: 2026, mes: 10 })).toBe(true);
    expect(mesmoMes({ ano: 2026, mes: 10 }, { ano: 2025, mes: 10 })).toBe(false);
  });
});

describe('noMes', () => {
  const faturas = [
    fatura({ idFatura: 1, dataVencimento: '2026-09-30T00:00:00' }),
    fatura({ idFatura: 2, dataVencimento: '2026-10-01T00:00:00' }),
    fatura({ idFatura: 3, dataVencimento: '2026-10-31T00:00:00' }),
    fatura({ idFatura: 4, dataVencimento: '2026-11-01T00:00:00' }),
  ];

  it('não deixa vazar o mês vizinho', () => {
    expect(noMes(faturas, dataDaFatura, { ano: 2026, mes: 10 }).map((f) => f.idFatura)).toEqual([2, 3]);
  });

  it('corta janeiro e dezembro sem confundir o ano', () => {
    const virada = [
      fatura({ idFatura: 5, dataVencimento: '2025-12-31T00:00:00' }),
      fatura({ idFatura: 6, dataVencimento: '2026-01-01T00:00:00' }),
    ];
    expect(noMes(virada, dataDaFatura, { ano: 2026, mes: 1 }).map((f) => f.idFatura)).toEqual([6]);
    expect(noMes(virada, dataDaFatura, { ano: 2025, mes: 12 }).map((f) => f.idFatura)).toEqual([5]);
  });

  it('usa o campo de data certo em cada lista', () => {
    const despesas = [
      despesa({ idDespesa: 1, dataDespesa: '2026-10-05T00:00:00' }),
      despesa({ idDespesa: 2, dataDespesa: '2026-11-05T00:00:00' }),
    ];
    expect(noMes(despesas, dataDaDespesa, { ano: 2026, mes: 10 }).map((d) => d.idDespesa)).toEqual([1]);
  });
});

describe('filtros', () => {
  const faturas = [
    fatura({ idFatura: 1, clienteNome: 'Clínica Vida', status: 'Pago' }),
    fatura({ idFatura: 2, clienteNome: 'AgroTech', descricao: 'Implantação', numeroFatura: 'FT-777' }),
  ];

  it('busca ignora acento e caixa', () => {
    expect(filtrarFaturas(faturas, filtros({ busca: 'CLINICA' })).map((f) => f.idFatura)).toEqual([1]);
    expect(filtrarFaturas(faturas, filtros({ busca: 'implantacao' })).map((f) => f.idFatura)).toEqual([2]);
  });

  it('busca casa o número da fatura', () => {
    expect(filtrarFaturas(faturas, filtros({ busca: '777' })).map((f) => f.idFatura)).toEqual([2]);
  });

  it('filtra por status', () => {
    expect(filtrarFaturas(faturas, filtros({ status: 'Pago' })).map((f) => f.idFatura)).toEqual([1]);
  });

  it('despesa filtra por categoria e busca na descrição', () => {
    const despesas = [
      despesa({ idDespesa: 1, categoria: 'Infraestrutura' }),
      despesa({ idDespesa: 2, categoria: 'Serviços', descricao: 'Contabilidade' }),
    ];
    expect(filtrarDespesas(despesas, filtros({ categoria: 'Serviços' })).map((d) => d.idDespesa)).toEqual([2]);
    expect(filtrarDespesas(despesas, filtros({ busca: 'servicos' })).map((d) => d.idDespesa)).toEqual([2]);
  });

  it('categoriasDe é única e ordenada', () => {
    const despesas = [
      despesa({ idDespesa: 1, categoria: 'Serviços' }),
      despesa({ idDespesa: 2, categoria: 'Infraestrutura' }),
      despesa({ idDespesa: 3, categoria: 'Serviços' }),
    ];
    expect(categoriasDe(despesas)).toEqual(['Infraestrutura', 'Serviços']);
  });

  it('temFiltroExtrato ignora busca só com espaço', () => {
    expect(temFiltroExtrato(filtros())).toBe(false);
    expect(temFiltroExtrato(filtros({ busca: '  ' }))).toBe(false);
    expect(temFiltroExtrato(filtros({ status: 'Pago' }))).toBe(true);
  });

  it('não altera a lista recebida', () => {
    const original = [...faturas];
    filtrarFaturas(faturas, filtros({ busca: 'x' }));
    expect(faturas).toEqual(original);
  });
});

describe('agruparPorDia', () => {
  const agora = new Date(2026, 9, 8, 12, 0, 0); // 8 de outubro de 2026

  it('rotula Hoje e Ontem a partir da data injetada', () => {
    expect(labelDia(new Date(2026, 9, 8), agora)).toBe('Hoje');
    expect(labelDia(new Date(2026, 9, 7), agora)).toBe('Ontem');
    expect(labelDia(new Date(2026, 9, 5), agora)).toContain('outubro');
  });

  it('rotula Ontem mesmo na virada de mês', () => {
    expect(labelDia(new Date(2026, 8, 30), new Date(2026, 9, 1, 9))).toBe('Ontem');
  });

  it('vai do dia mais recente para o mais antigo', () => {
    const lista = [
      fatura({ idFatura: 1, dataVencimento: '2026-10-05T00:00:00' }),
      fatura({ idFatura: 2, dataVencimento: '2026-10-08T00:00:00' }),
      fatura({ idFatura: 3, dataVencimento: '2026-10-07T00:00:00' }),
    ];
    const grupos = agruparPorDia(lista, dataDaFatura, agora);
    expect(grupos.map((g) => g.label)).toEqual(['Hoje', 'Ontem', expect.stringContaining('outubro')]);
  });

  it('junta o mesmo dia num grupo só', () => {
    const lista = [
      fatura({ idFatura: 1, dataVencimento: '2026-10-08T09:00:00' }),
      fatura({ idFatura: 2, dataVencimento: '2026-10-08T18:00:00' }),
    ];
    const grupos = agruparPorDia(lista, dataDaFatura, agora);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].itens.map((f) => f.idFatura)).toEqual([2, 1]);
  });

  it('a chave do grupo não depende do rótulo', () => {
    const grupos = agruparPorDia([fatura({ idFatura: 1, dataVencimento: '2026-10-08T00:00:00' })], dataDaFatura, agora);
    expect(grupos[0].key).toBe('2026-10-08');
  });

  it('lista vazia, nenhum grupo', () => {
    expect(agruparPorDia([], dataDaFatura, agora)).toEqual([]);
  });
});

describe('resumoDespesas', () => {
  it('soma pago e pendente separadamente', () => {
    const lista = [
      despesa({ idDespesa: 1, valor: 100, status: 'Pago' }),
      despesa({ idDespesa: 2, valor: 50, status: 'Pago' }),
      despesa({ idDespesa: 3, valor: 70, status: 'Pendente' }),
    ];
    expect(resumoDespesas(lista)).toEqual({ pago: 150, pendente: 70, total: 220 });
  });

  it('lista vazia zera tudo', () => {
    expect(resumoDespesas([])).toEqual({ pago: 0, pendente: 0, total: 0 });
  });
});
