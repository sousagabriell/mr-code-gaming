import { describe, expect, it } from 'vitest';
import type { KanbanAtividadeDTO, KanbanColunaDTO } from '../types/domain';
import { findAtividade, kanbanStats, moveAtividade } from './kanban';
import { buildYardLayout, dropIndex, slotPosition, SLOT_COLS, SLOT_ROWS, STACK_H, zoneAt } from './yard';

function atividade(id: number, idColuna: number, ordem: number, extra: Partial<KanbanAtividadeDTO> = {}): KanbanAtividadeDTO {
  return {
    idAtividade: id,
    idColuna,
    idProjeto: 1,
    titulo: `A${id}`,
    descricao: null,
    tipo: 'Tarefa',
    prioridade: 'Media',
    idUsuarioAdminResponsavel: null,
    nomeResponsavel: null,
    dataPrazo: null,
    ordem,
    idChamadoOrigem: null,
    protocoloChamadoOrigem: null,
    dataCriacao: '2026-10-01T00:00:00Z',
    dataConclusao: null,
    ...extra,
  };
}

function quadro(): KanbanColunaDTO[] {
  return [
    { idColuna: 10, idProjeto: 1, nome: 'Backlog', ordem: 0, ehColunaConclusao: false, atividades: [atividade(1, 10, 0), atividade(2, 10, 1), atividade(3, 10, 2)] },
    { idColuna: 11, idProjeto: 1, nome: 'Fazendo', ordem: 1, ehColunaConclusao: false, atividades: [atividade(4, 11, 0)] },
    { idColuna: 12, idProjeto: 1, nome: 'Concluído', ordem: 2, ehColunaConclusao: true, atividades: [] },
  ];
}

const ids = (c: KanbanColunaDTO) => c.atividades.map((a) => a.idAtividade);
const ordens = (c: KanbanColunaDTO) => c.atividades.map((a) => a.ordem);

describe('moveAtividade (espelho do backend)', () => {
  it('move entre colunas na posição pedida e renumera as duas', () => {
    const r = moveAtividade(quadro(), 2, 11, 0);
    expect(ids(r[0])).toEqual([1, 3]);
    expect(ordens(r[0])).toEqual([0, 1]);
    expect(ids(r[1])).toEqual([2, 4]);
    expect(ordens(r[1])).toEqual([0, 1]);
    expect(r[1].atividades[0].idColuna).toBe(11);
  });

  it('limita novaOrdem ao tamanho da coluna de destino', () => {
    const r = moveAtividade(quadro(), 1, 11, 99);
    expect(ids(r[1])).toEqual([4, 1]);
  });

  it('reordena dentro da mesma coluna', () => {
    const r = moveAtividade(quadro(), 1, 10, 2);
    expect(ids(r[0])).toEqual([2, 3, 1]);
    expect(ordens(r[0])).toEqual([0, 1, 2]);
  });

  it('marca conclusão ao entrar na coluna de conclusão e limpa ao sair', () => {
    const now = '2026-10-07T12:00:00Z';
    const done = moveAtividade(quadro(), 4, 12, 0, now);
    expect(done[2].atividades[0].dataConclusao).toBe(now);
    const back = moveAtividade(done, 4, 10, 0);
    expect(back[0].atividades[0].dataConclusao).toBeNull();
  });

  it('mantém a referência das colunas não afetadas', () => {
    const q = quadro();
    const r = moveAtividade(q, 1, 10, 1);
    expect(r[1]).toBe(q[1]);
    expect(r[2]).toBe(q[2]);
  });

  it('ignora atividade ou coluna inexistente', () => {
    const q = quadro();
    expect(moveAtividade(q, 999, 11, 0)).toBe(q);
    expect(moveAtividade(q, 1, 999, 0)).toBe(q);
  });
});

describe('estatísticas e busca', () => {
  it('conta abertas, concluídas e bugs', () => {
    const q = quadro();
    q[0].atividades[0] = atividade(1, 10, 0, { tipo: 'Bug' });
    q[2].atividades = [atividade(5, 12, 0)];
    expect(kanbanStats(q)).toMatchObject({ total: 5, concluidas: 1, abertas: 4, bugsAbertos: 1 });
  });

  it('localiza atividade com coluna e índice', () => {
    expect(findAtividade(quadro(), 3)).toMatchObject({ index: 2, coluna: { idColuna: 10 } });
    expect(findAtividade(quadro(), 42)).toBeNull();
  });
});

describe('layout do pátio', () => {
  it('uma zona por coluna, em ordem, centralizadas', () => {
    const layout = buildYardLayout(quadro());
    expect(layout.zones.map((z) => z.coluna.idColuna)).toEqual([10, 11, 12]);
    expect(layout.zones[1].center[0]).toBeCloseTo(0);
    expect(layout.zones[0].center[0]).toBeCloseTo(-layout.zones[2].center[0]);
  });

  it('caixas empilham quando a zona lota', () => {
    const perLevel = SLOT_COLS * SLOT_ROWS;
    expect(slotPosition([0, 0, 0], 0)[1]).toBe(0);
    expect(slotPosition([0, 0, 0], perLevel)[1]).toBe(STACK_H);
    expect(slotPosition([0, 0, 0], perLevel)[0]).toBe(slotPosition([0, 0, 0], 0)[0]);
  });

  it('soltar sobre a posição de uma caixa devolve o índice dela', () => {
    const layout = buildYardLayout(quadro());
    const zone = layout.zones[0];
    for (let k = 0; k < 3; k++) {
      const [x, , z] = slotPosition(zone.center, k);
      expect(dropIndex(zone, x, z, 3)).toBe(k);
    }
    // além do fim da fila → vai para o final
    const [x, , z] = slotPosition(zone.center, 7);
    expect(dropIndex(zone, x, z, 2)).toBe(2);
  });

  it('acha a zona sob o ponteiro e ignora fora do pátio', () => {
    const layout = buildYardLayout(quadro());
    expect(zoneAt(layout, layout.zones[2].center[0] + 0.5, 0)?.coluna.idColuna).toBe(12);
    expect(zoneAt(layout, 0, 50)).toBeNull();
    expect(zoneAt(layout, 500, 0)).toBeNull();
  });
});
