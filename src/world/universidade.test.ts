import { describe, expect, it } from 'vitest';
import type { WikiPaginaDTO } from '../types/domain';
import { pathLength } from './routes';
import {
  alturaDaPrateleira,
  buildUniLayout,
  caminhoAteAEstante,
  COLS,
  corDoProjeto,
  ESTANTE,
  ESTANTE_ALTURA,
  ESTANTE_CABE_NA_PAREDE,
  etiquetaAnchor,
  filtrarPaginas,
  larguraDoLivro,
  LEITOR_ALTURA,
  LEITOR_CADEIRA,
  LIVRO_MAX,
  LIVRO_MIN,
  LIVRO_NA_MESA,
  livros,
  MAX_PRATELEIRAS,
  postoNaEstante,
  prateleiras,
  ROOM_D,
  ROOM_W,
  ROWS,
  tonalizar,
  UNI_CAMERA,
  UNI_DISTANCE,
  type Livro,
  type Prateleira,
} from './universidade';
import { WALL_H } from './interior';

const layout = buildUniLayout();

const pagina = (id: number, over: Partial<WikiPaginaDTO> = {}): WikiPaginaDTO => ({
  idPagina: id,
  idProjeto: null,
  projetoNome: null,
  titulo: `Artigo ${id}`,
  conteudo: '',
  autorNome: 'Autor',
  dataCriacao: '2026-01-01T00:00:00',
  dataAtualizacao: '2026-01-01T00:00:00',
  ...over,
});

const projeto = (idProjeto: number, nome: string) => ({ idProjeto, nome });

describe('sala da biblioteca', () => {
  it('o chão cobre a sala inteira, sem buraco nem sobra', () => {
    expect(layout.floor).toHaveLength(COLS * ROWS);
    const chaves = new Set(layout.floor.map((p) => `${p.position[0]},${p.position[2]}`));
    expect(chaves.size).toBe(COLS * ROWS);
  });

  it('são as mesmas duas lajes da agência — fundo e esquerda', () => {
    expect(layout.walls).toHaveLength(2);
    expect(layout.baseboards).toHaveLength(2);
    for (const p of layout.walls) expect(p.position[1] - p.size[1] / 2).toBeCloseTo(0);
  });

  it('todo móvel fica dentro da sala', () => {
    for (const peca of layout.furniture) {
      expect(Math.abs(peca.position[0]), `${peca.kind} fora no eixo x`).toBeLessThanOrEqual(ROOM_W / 2);
      expect(Math.abs(peca.position[2]), `${peca.kind} fora no eixo z`).toBeLessThanOrEqual(ROOM_D / 2);
    }
  });

  it('nenhum móvel ocupa o lugar da estante', () => {
    const e1 = ESTANTE.x - ESTANTE.largura / 2;
    const e2 = ESTANTE.x + ESTANTE.largura / 2;
    const fundoDaEstante = -ROOM_D / 2 + ESTANTE.profundidade;
    for (const peca of layout.furniture) {
      const naFaixaX = peca.position[0] > e1 && peca.position[0] < e2;
      const naFaixaZ = peca.position[2] < fundoDaEstante;
      expect(naFaixaX && naFaixaZ, `${peca.kind} está dentro da estante`).toBe(false);
    }
  });
});

describe('carcaça da estante', () => {
  it('cabe abaixo do topo da parede', () => {
    expect(ESTANTE_CABE_NA_PAREDE).toBe(true);
    expect(ESTANTE_ALTURA).toBeLessThan(WALL_H);
  });

  it('cabe na largura da sala, sem atravessar a parede lateral', () => {
    expect(ESTANTE.x - ESTANTE.largura / 2).toBeGreaterThan(-ROOM_W / 2);
    expect(ESTANTE.x + ESTANTE.largura / 2).toBeLessThan(ROOM_W / 2);
  });

  it('fica na metade esquerda da sala — o painel cobre a direita da tela', () => {
    expect(ESTANTE.x).toBeLessThan(0);
  });

  it('tem uma prancha por nível, mais laterais, fundo e tampo', () => {
    const pranchas = layout.estante.filter((p) => p.parte === 'prancha');
    expect(pranchas).toHaveLength(MAX_PRATELEIRAS);
    expect(layout.estante.filter((p) => p.parte === 'lateral')).toHaveLength(2);
    expect(layout.estante.filter((p) => p.parte === 'fundo')).toHaveLength(1);
    expect(layout.estante.filter((p) => p.parte === 'tampo')).toHaveLength(1);
  });

  it('a prateleira 0 é a de cima e os níveis descem em passo constante', () => {
    const alturas = Array.from({ length: MAX_PRATELEIRAS }, (_, n) => alturaDaPrateleira(n));
    for (let i = 1; i < alturas.length; i++) {
      expect(alturas[i]).toBeLessThan(alturas[i - 1]);
      expect(alturas[i - 1] - alturas[i]).toBeCloseTo(ESTANTE.vao);
    }
    expect(Math.min(...alturas)).toBeGreaterThan(0);
  });

  it('as pranchas e o tampo ficam dentro da altura da carcaça', () => {
    const lateral = layout.estante.find((p) => p.parte === 'lateral')!;
    const topo = lateral.position[1] + lateral.size[1] / 2;
    for (const p of layout.estante) expect(p.position[1] + p.size[1] / 2).toBeLessThanOrEqual(topo + 1e-6);
  });

  it('o fundo da estante encosta na parede do fundo', () => {
    const fundo = layout.estante.find((p) => p.parte === 'fundo')!;
    expect(fundo.position[2] - fundo.size[2] / 2).toBeCloseTo(-ROOM_D / 2);
  });

  it('a etiqueta do nível fica na frente da estante e dentro da sala', () => {
    for (let n = 0; n < MAX_PRATELEIRAS; n++) {
      const [ex, ey, ez] = etiquetaAnchor(n);
      expect(Math.abs(ex)).toBeLessThan(ROOM_W / 2);
      expect(ez).toBeGreaterThan(-ROOM_D / 2);
      expect(ey).toBeGreaterThan(0);
      expect(ey).toBeLessThan(WALL_H);
    }
  });
});

describe('prateleiras', () => {
  const projetos = [projeto(1, 'Portal'), projeto(2, 'Paciente'), projeto(3, 'Sem artigo')];

  it('uma prateleira por projeto com artigo, e a Geral no topo', () => {
    const p = prateleiras(
      [pagina(1), pagina(2, { idProjeto: 1 }), pagina(3, { idProjeto: 2 })],
      projetos
    );
    expect(p.map((x) => x.id)).toEqual(['geral', 1, 2]);
    expect(p[0].nivel).toBe(0);
    expect(p[1].etiqueta).toBe('Portal');
  });

  it('artigo sem projeto cai na Geral; projeto sem artigo não ganha prateleira', () => {
    const p = prateleiras([pagina(1), pagina(2)], projetos);
    expect(p).toHaveLength(1);
    expect(p[0].id).toBe('geral');
    expect(p[0].total).toBe(2);
  });

  it('sem artigo nenhum, a estante não tem nível ocupado', () => {
    expect(prateleiras([], projetos)).toEqual([]);
  });

  it('sem artigo geral, o primeiro nível é de projeto', () => {
    const p = prateleiras([pagina(1, { idProjeto: 2 })], projetos);
    expect(p.map((x) => x.id)).toEqual([2]);
  });

  it('projeto sem nome na lista ainda ganha prateleira', () => {
    const p = prateleiras([pagina(1, { idProjeto: 99 })], projetos);
    expect(p[0].etiqueta).toBe('Projeto');
    expect(p[0].codigo).toMatch(/^PR-/);
  });

  it('mais grupos que níveis: o excedente vira uma prateleira "Outros", sem perder artigo', () => {
    const muitos = Array.from({ length: 9 }, (_, i) => projeto(i + 1, `P${i + 1}`));
    const paginas = muitos.map((pr, i) => pagina(i + 1, { idProjeto: pr.idProjeto }));
    const p = prateleiras(paginas, muitos);
    expect(p).toHaveLength(MAX_PRATELEIRAS);
    expect(p[p.length - 1].id).toBe('outros');
    expect(p.reduce((s, x) => s + x.total, 0)).toBe(paginas.length);
  });

  it('a cor da prateleira é estável por projeto, não pela ordem da lista', () => {
    const a = prateleiras([pagina(1, { idProjeto: 7 }), pagina(2, { idProjeto: 3 })], projetos);
    const b = prateleiras([pagina(2, { idProjeto: 3 }), pagina(1, { idProjeto: 7 })], projetos);
    expect(a.find((x) => x.id === 7)!.cor).toBe(b.find((x) => x.id === 7)!.cor);
    expect(corDoProjeto(7)).toBe(a.find((x) => x.id === 7)!.cor);
    expect(corDoProjeto(null)).not.toBe(corDoProjeto(1));
  });

  it('passando do que cabe na prancha, ficam os atualizados mais recentemente', () => {
    const paginas = Array.from({ length: 60 }, (_, i) =>
      pagina(i + 1, { titulo: `Artigo ${String(i + 1).padStart(2, '0')}`, dataAtualizacao: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00` })
    );
    const [p] = prateleiras(paginas, []);
    expect(p.paginas.length).toBeLessThan(paginas.length);
    expect(p.ocultos).toBe(paginas.length - p.paginas.length);
    expect(p.total).toBe(paginas.length);
    // O painel lista o grupo inteiro; só a prancha da cena é que tem tamanho fixo.
    expect(p.todas).toHaveLength(paginas.length);
    const naPrancha = new Set(p.paginas.map((x) => x.idPagina));
    expect(p.todas.filter((x) => !naPrancha.has(x.idPagina))).toHaveLength(p.ocultos);
    // Nada mais antigo que o mais antigo exibido ficou de fora por engano.
    const maisAntigoExibido = Math.min(...p.paginas.map((x) => Date.parse(x.dataAtualizacao)));
    const exibidos = new Set(p.paginas.map((x) => x.idPagina));
    for (const fora of paginas.filter((x) => !exibidos.has(x.idPagina))) {
      expect(Date.parse(fora.dataAtualizacao)).toBeLessThanOrEqual(maisAntigoExibido);
    }
  });

  it('a prancha e o índice exibem em ordem de título', () => {
    const [p] = prateleiras([pagina(1, { titulo: 'Zebra' }), pagina(2, { titulo: 'Abacaxi' })], []);
    expect(p.paginas.map((x) => x.titulo)).toEqual(['Abacaxi', 'Zebra']);
    expect(p.todas.map((x) => x.titulo)).toEqual(['Abacaxi', 'Zebra']);
  });
});

describe('lombadas', () => {
  const porPrateleira = (lista: Livro[]) => {
    const mapa = new Map<Prateleira['id'], Livro[]>();
    for (const l of lista) mapa.set(l.prateleira, [...(mapa.get(l.prateleira) ?? []), l]);
    return [...mapa.values()];
  };

  const cheia = () =>
    prateleiras(
      [
        ...Array.from({ length: 30 }, (_, i) => pagina(i + 1, { titulo: `Artigo geral número ${i}` })),
        ...Array.from({ length: 12 }, (_, i) => pagina(100 + i, { idProjeto: 1, titulo: `P1 ${i}` })),
        ...Array.from({ length: 5 }, (_, i) => pagina(200 + i, { idProjeto: 2, titulo: `Dois ${i}` })),
      ],
      [projeto(1, 'Um'), projeto(2, 'Dois')]
    );

  it('uma lombada por artigo exibido', () => {
    const estante = cheia();
    expect(livros(estante)).toHaveLength(estante.reduce((s, p) => s + p.paginas.length, 0));
  });

  it('nenhuma lombada sai da prancha', () => {
    const esquerda = ESTANTE.x - ESTANTE.largura / 2 + ESTANTE.espessura;
    const direita = ESTANTE.x + ESTANTE.largura / 2 - ESTANTE.espessura;
    for (const l of livros(cheia())) {
      expect(l.position[0] - l.size[0] / 2, `${l.titulo} passa da lateral esquerda`).toBeGreaterThanOrEqual(esquerda);
      expect(l.position[0] + l.size[0] / 2, `${l.titulo} passa da lateral direita`).toBeLessThanOrEqual(direita);
    }
  });

  it('nenhuma lombada encavala na vizinha', () => {
    for (const fila of porPrateleira(livros(cheia()))) {
      const ordenada = [...fila].sort((a, b) => a.position[0] - b.position[0]);
      for (let i = 1; i < ordenada.length; i++) {
        const fimAnterior = ordenada[i - 1].position[0] + ordenada[i - 1].size[0] / 2;
        const inicio = ordenada[i].position[0] - ordenada[i].size[0] / 2;
        expect(inicio, `${ordenada[i].titulo} encavala`).toBeGreaterThanOrEqual(fimAnterior - 1e-9);
      }
    }
  });

  it('cada lombada se apoia na prancha do seu nível e caberia no vão', () => {
    const estante = cheia();
    const nivelDe = new Map(estante.map((p) => [p.id, p.nivel]));
    for (const l of livros(estante)) {
      const prancha = alturaDaPrateleira(nivelDe.get(l.prateleira)!);
      expect(l.position[1] - l.size[1] / 2).toBeCloseTo(prancha + ESTANTE.espessura / 2);
      expect(l.size[1]).toBeLessThan(ESTANTE.vao);
    }
  });

  it('as lombadas ficam na frente da prateleira, não enterradas na parede', () => {
    for (const l of livros(cheia())) {
      expect(l.position[2] - l.size[2] / 2).toBeGreaterThan(-ROOM_D / 2);
      expect(l.position[2] + l.size[2] / 2).toBeLessThanOrEqual(-ROOM_D / 2 + ESTANTE.profundidade);
    }
  });

  it('título mais longo dá lombada mais grossa, com teto', () => {
    expect(larguraDoLivro('oi')).toBeLessThan(larguraDoLivro('um título bem mais comprido que o outro'));
    expect(larguraDoLivro('x'.repeat(500))).toBe(LIVRO_MAX);
    expect(larguraDoLivro('')).toBe(LIVRO_MIN);
  });

  it('a prancha cheia fica bem ocupada — estante vazia demais não lê como estante', () => {
    const muitas = Array.from({ length: 40 }, (_, i) => pagina(i + 1, { titulo: `Artigo sobre o tema ${i}` }));
    const [p] = prateleiras(muitas, []);
    const ocupado = p.paginas.reduce((s, x) => s + larguraDoLivro(x.titulo), 0);
    const util = ESTANTE.largura - 2 * ESTANTE.espessura;
    expect(ocupado / util).toBeGreaterThan(0.75);
  });

  it('a cor da lombada vem da prateleira e é estável para o mesmo artigo', () => {
    const estante = prateleiras([pagina(1, { idProjeto: 4 })], [projeto(4, 'Quatro')]);
    expect(livros(estante)[0].cor).toBe(livros(estante)[0].cor);
    expect(livros(estante)[0].cor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('estante vazia não gera lombada', () => {
    expect(livros([])).toEqual([]);
  });
});

describe('tonalizar', () => {
  it('t=0 devolve a própria cor', () => {
    expect(tonalizar('#134ced', 0)).toBe('#134ced');
  });

  it('t=1 chega ao branco e t=-1 ao preto', () => {
    expect(tonalizar('#134ced', 1)).toBe('#ffffff');
    expect(tonalizar('#134ced', -1)).toBe('#000000');
  });

  it('clareia e escurece sem sair do formato', () => {
    for (const t of [-0.5, -0.2, 0.3, 0.8]) expect(tonalizar('#8c97ad', t)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('busca', () => {
  const paginas = [pagina(1, { titulo: 'Como publicar' }), pagina(2, { titulo: 'Deploy do Portal' })];

  it('sem termo, devolve tudo', () => {
    expect(filtrarPaginas(paginas, '')).toHaveLength(2);
    expect(filtrarPaginas(paginas, '   ')).toHaveLength(2);
  });

  it('casa por trecho do título, sem diferenciar maiúsculas', () => {
    expect(filtrarPaginas(paginas, 'PORTAL').map((p) => p.idPagina)).toEqual([2]);
    expect(filtrarPaginas(paginas, ' publicar ').map((p) => p.idPagina)).toEqual([1]);
  });

  it('termo sem par devolve lista vazia', () => {
    expect(filtrarPaginas(paginas, 'xyz')).toEqual([]);
  });
});

describe('o leitor', () => {
  const cadeira = layout.furniture.find((p) => p.kind === 'chairModernCushion')!;
  const mesa = layout.furniture.find((p) => p.kind === 'desk')!;

  it('entra na escala dos móveis, não na da cidade', () => {
    // Na cidade os bonecos têm 0,42 (prédios enormes); aqui uma cadeira do kit tem 0,46.
    expect(LEITOR_ALTURA).toBeGreaterThan(0.5);
    expect(LEITOR_ALTURA).toBeLessThan(WALL_H);
  });

  it('senta exatamente na cadeira da mesa de leitura', () => {
    expect(cadeira.position[0]).toBeCloseTo(LEITOR_CADEIRA[0]);
    expect(cadeira.position[2]).toBeCloseTo(LEITOR_CADEIRA[2]);
  });

  it('a mesa fica à frente dele, no lado da câmera', () => {
    expect(mesa.position[2]).toBeGreaterThan(LEITOR_CADEIRA[2]);
  });

  it('o livro pousa acima do tampo e dentro da mesa', () => {
    expect(LIVRO_NA_MESA[1]).toBeGreaterThan(0.3);
    expect(Math.abs(LIVRO_NA_MESA[0] - mesa.position[0])).toBeLessThan(0.6);
    expect(Math.abs(LIVRO_NA_MESA[2] - mesa.position[2])).toBeLessThan(0.6);
  });

  it('a mesa de leitura fica dentro do quadro, à esquerda do que o painel cobre', () => {
    expect(LEITOR_CADEIRA[0]).toBeLessThan(ROOM_W / 2 - 1);
  });

  it('o posto na estante nunca passa das laterais dela', () => {
    for (const alvo of [-99, ESTANTE.x - 5, ESTANTE.x, ESTANTE.x + 5, 99]) {
      const [px, , pz] = postoNaEstante(alvo);
      expect(Math.abs(px - ESTANTE.x)).toBeLessThanOrEqual(ESTANTE.largura / 2);
      // Na frente da estante, com espaço para o corpo — e não dentro dela.
      expect(pz).toBeGreaterThan(-ROOM_D / 2 + ESTANTE.profundidade);
      expect(pz).toBeLessThan(ROOM_D / 2);
    }
  });

  it('o posto acompanha a lombada escolhida', () => {
    const esquerda = postoNaEstante(ESTANTE.x - 0.5)[0];
    const direita = postoNaEstante(ESTANTE.x + 0.5)[0];
    expect(esquerda).toBeLessThan(direita);
  });

  it('o caminho sai da cadeira e termina em frente à estante', () => {
    const livro = livros(prateleiras([pagina(1, { titulo: 'Um artigo' })], []))[0];
    const caminho = caminhoAteAEstante(livro.position[0]);
    expect(caminho[0]).toEqual(LEITOR_CADEIRA);
    const fim = caminho[caminho.length - 1];
    expect(fim).toEqual(postoNaEstante(livro.position[0]));
  });

  it('o caminho pega o corredor antes de virar — em reta ele atravessaria a mesa', () => {
    const caminho = caminhoAteAEstante(ESTANTE.x);
    expect(caminho.length).toBeGreaterThanOrEqual(3);
    // O primeiro trecho só muda z (anda para trás), antes de qualquer deslocamento em x.
    expect(caminho[1][0]).toBeCloseTo(caminho[0][0]);
    expect(caminho[1][2]).toBeLessThan(caminho[0][2]);
  });

  it('o caminho inteiro fica dentro da sala e no chão', () => {
    for (const alvo of [ESTANTE.x - 1, ESTANTE.x, ESTANTE.x + 1]) {
      for (const [px, py, pz] of caminhoAteAEstante(alvo)) {
        expect(Math.abs(px)).toBeLessThanOrEqual(ROOM_W / 2);
        expect(Math.abs(pz)).toBeLessThanOrEqual(ROOM_D / 2);
        expect(py).toBe(0);
      }
    }
  });

  it('a viagem é longa o bastante para ser percebida', () => {
    expect(pathLength(caminhoAteAEstante(ESTANTE.x))).toBeGreaterThan(1.5);
  });
});

describe('câmera da biblioteca', () => {
  it('mira à direita da estante, para ela cair na metade visível da tela', () => {
    expect(UNI_CAMERA.target[0]).toBeGreaterThan(ESTANTE.x);
    expect(UNI_CAMERA.position[0]).toBeGreaterThan(UNI_CAMERA.target[0]);
  });

  it('o alvo fica acima do chão, com a estante inteira no quadro', () => {
    expect(UNI_CAMERA.target[1]).toBeGreaterThan(0);
    expect(UNI_CAMERA.target[1]).toBeLessThan(WALL_H);
  });

  it('o ângulo polar cabe nos limites do controle (0,55–1,05)', () => {
    const dx = UNI_CAMERA.position[0] - UNI_CAMERA.target[0];
    const dy = UNI_CAMERA.position[1] - UNI_CAMERA.target[1];
    const dz = UNI_CAMERA.position[2] - UNI_CAMERA.target[2];
    const polar = Math.atan2(Math.hypot(dx, dz), dy);
    expect(polar).toBeGreaterThan(0.55);
    expect(polar).toBeLessThan(1.05);
  });

  it('a posição sai da distância nomeada, acima do minDistance do controle', () => {
    const d = Math.hypot(
      UNI_CAMERA.position[0] - UNI_CAMERA.target[0],
      UNI_CAMERA.position[1] - UNI_CAMERA.target[1],
      UNI_CAMERA.position[2] - UNI_CAMERA.target[2]
    );
    expect(d).toBeCloseTo(UNI_DISTANCE);
    expect(d).toBeGreaterThan(6);
  });

  it('os limites batem com o tamanho da sala', () => {
    expect(layout.bounds).toEqual({ minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 });
  });
});
