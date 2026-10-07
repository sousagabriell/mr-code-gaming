import type { KanbanAtividadeDTO, KanbanColunaDTO } from '../types/domain';

export interface AtividadeLocalizada {
  atividade: KanbanAtividadeDTO;
  coluna: KanbanColunaDTO;
  /** Posição dentro da coluna (0 = primeira). */
  index: number;
}

export function findAtividade(colunas: KanbanColunaDTO[] | undefined, idAtividade: number): AtividadeLocalizada | null {
  for (const coluna of colunas ?? []) {
    const index = coluna.atividades.findIndex((a) => a.idAtividade === idAtividade);
    if (index >= 0) return { atividade: coluna.atividades[index], coluna, index };
  }
  return null;
}

/**
 * Espelho exato de KanbanDomainService.MoverAtividade (backend): tira a atividade da coluna de origem,
 * insere na de destino em `clamp(novaOrdem, 0, tamanho)` e renumera `ordem` das duas colunas.
 * Usado na atualização otimista — o quadro muda na hora e o servidor confirma depois.
 */
export function moveAtividade(
  colunas: KanbanColunaDTO[],
  idAtividade: number,
  idColunaDestino: number,
  novaOrdem: number,
  now = new Date().toISOString()
): KanbanColunaDTO[] {
  const found = findAtividade(colunas, idAtividade);
  const destino = colunas.find((c) => c.idColuna === idColunaDestino);
  if (!found || !destino) return colunas;

  const moved: KanbanAtividadeDTO = {
    ...found.atividade,
    idColuna: idColunaDestino,
    dataConclusao: destino.ehColunaConclusao ? (found.atividade.dataConclusao ?? now) : null,
  };

  return colunas.map((coluna) => {
    let atividades = coluna.atividades.filter((a) => a.idAtividade !== idAtividade);
    if (coluna.idColuna === idColunaDestino) {
      atividades = [...atividades];
      atividades.splice(Math.min(Math.max(novaOrdem, 0), atividades.length), 0, moved);
    } else if (atividades.length === coluna.atividades.length) {
      return coluna; // coluna não afetada — mantém a referência
    }
    return { ...coluna, atividades: atividades.map((a, i) => (a.ordem === i ? a : { ...a, ordem: i })) };
  });
}

export function kanbanStats(colunas: KanbanColunaDTO[] | undefined, now = Date.now()) {
  const todas = (colunas ?? []).flatMap((c) => c.atividades.map((a) => ({ a, done: c.ehColunaConclusao })));
  const abertas = todas.filter((x) => !x.done);
  return {
    total: todas.length,
    concluidas: todas.length - abertas.length,
    abertas: abertas.length,
    bugsAbertos: abertas.filter((x) => x.a.tipo === 'Bug').length,
    atrasadas: abertas.filter((x) => x.a.dataPrazo && new Date(x.a.dataPrazo).getTime() < now).length,
  };
}
