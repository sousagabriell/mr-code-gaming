import { describe, expect, it } from 'vitest';
import type { Vec3 } from './layout';
import { pathLength } from './routes';
import {
  BALCAO,
  BANK_CAMERA,
  BANK_DISTANCE,
  buildBankLayout,
  CALENDAR_ANCHOR,
  CALENDAR_SIZE,
  COFRE,
  COLS,
  MALOTE_ENTRA,
  MALOTE_SAI,
  PORTA,
  ROOM_D,
  ROOM_W,
  ROWS,
  tileCenter,
  WALL_H,
} from './bank';

const layout = buildBankLayout();

describe('sala da agência', () => {
  it('o chão cobre a sala inteira, sem buraco nem sobra', () => {
    expect(layout.floor).toHaveLength(COLS * ROWS);
    const chaves = new Set(layout.floor.map((p) => `${p.position[0]},${p.position[2]}`));
    expect(chaves.size).toBe(COLS * ROWS);
  });

  it('tileCenter centra a sala na origem', () => {
    const [x0, , z0] = tileCenter(0, 0);
    const [x1, , z1] = tileCenter(COLS - 1, ROWS - 1);
    expect(x0 + x1).toBeCloseTo(0);
    expect(z0 + z1).toBeCloseTo(0);
  });

  it('são duas lajes inteiriças — fundo e esquerda; a frente fica aberta para a câmera', () => {
    expect(layout.walls).toHaveLength(2);
    const [fundo, esquerda] = layout.walls;
    // A do fundo é larga e fina; a da esquerda, o contrário.
    expect(fundo.size[0]).toBeGreaterThan(fundo.size[2]);
    expect(esquerda.size[2]).toBeGreaterThan(esquerda.size[0]);
    expect(fundo.position[2]).toBeLessThan(-ROOM_D / 2);
    expect(esquerda.position[0]).toBeLessThan(-ROOM_W / 2);
  });

  it('as lajes cobrem a sala inteira e fecham o canto sem fresta', () => {
    const [fundo, esquerda] = layout.walls;
    expect(fundo.size[0]).toBeGreaterThanOrEqual(ROOM_W);
    expect(esquerda.size[2]).toBeGreaterThanOrEqual(ROOM_D);
    // A ponta esquerda da parede do fundo alcança a face externa da parede lateral.
    const pontaFundo = fundo.position[0] - fundo.size[0] / 2;
    const faceExterna = esquerda.position[0] - esquerda.size[0] / 2;
    expect(pontaFundo).toBeLessThanOrEqual(faceExterna + 1e-6);
  });

  it('as paredes se apoiam no chão e têm a mesma altura', () => {
    for (const p of layout.walls) {
      expect(p.position[1] - p.size[1] / 2).toBeCloseTo(0);
      expect(p.size[1]).toBeCloseTo(WALL_H);
    }
  });

  it('o rodapé acompanha as paredes, mais baixo e um fio mais grosso', () => {
    expect(layout.baseboards).toHaveLength(layout.walls.length);
    layout.baseboards.forEach((r, i) => {
      const parede = layout.walls[i];
      expect(r.size[1]).toBeLessThan(parede.size[1]);
      expect(r.position[1] - r.size[1] / 2).toBeCloseTo(0);
      // Engrossou só no eixo fino da parede.
      const eixoFino = parede.size[0] < parede.size[2] ? 0 : 2;
      expect(r.size[eixoFino]).toBeGreaterThan(parede.size[eixoFino]);
      expect(r.size[2 - eixoFino]).toBeCloseTo(parede.size[2 - eixoFino]);
    });
  });

  it('nenhum móvel atravessa a parede', () => {
    for (const peca of layout.furniture) {
      expect(peca.position[0], `${peca.kind} atravessa a lateral`).toBeGreaterThan(-ROOM_W / 2);
      expect(peca.position[2], `${peca.kind} atravessa o fundo`).toBeGreaterThan(-ROOM_D / 2);
    }
  });

  it('todo móvel fica dentro da sala', () => {
    for (const peca of layout.furniture) {
      expect(Math.abs(peca.position[0]), `${peca.kind} fora no eixo x`).toBeLessThanOrEqual(ROOM_W / 2);
      expect(Math.abs(peca.position[2]), `${peca.kind} fora no eixo z`).toBeLessThanOrEqual(ROOM_D / 2);
    }
  });

  it('o balcão é uma fila contínua, sem vão entre os módulos', () => {
    // O módulo do kit tem 0,43 de largura: passo maior que isso abriria buraco no balcão.
    const LARGURA_MODULO = 0.43;
    const balcao = layout.furniture.filter((p) => p.kind === 'kitchenBar' || p.kind === 'kitchenBarEnd');
    expect(balcao.length).toBeGreaterThanOrEqual(4);
    const zs = new Set(balcao.map((p) => p.position[2].toFixed(3)));
    expect(zs.size, 'o balcão tem que estar todo na mesma fila').toBe(1);
    const xs = balcao.map((p) => p.position[0]).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeLessThanOrEqual(LARGURA_MODULO + 1e-6);
  });

  it('as duas pontas fecham os extremos do balcão', () => {
    const balcao = [...layout.furniture.filter((p) => p.kind === 'kitchenBar' || p.kind === 'kitchenBarEnd')].sort(
      (a, b) => a.position[0] - b.position[0]
    );
    expect(balcao[0].kind).toBe('kitchenBarEnd');
    expect(balcao[balcao.length - 1].kind).toBe('kitchenBarEnd');
    expect(balcao.filter((p) => p.kind === 'kitchenBarEnd')).toHaveLength(2);
  });

  it('o caixa fica atrás do balcão e o cliente na frente', () => {
    const balcaoZ = layout.furniture.find((p) => p.kind === 'kitchenBar')!.position[2];
    const mesa = layout.furniture.find((p) => p.kind === 'desk')!;
    const banquetas = layout.furniture.filter((p) => p.kind === 'stoolBar');
    expect(mesa.position[2]).toBeLessThan(balcaoZ);
    for (const b of banquetas) expect(b.position[2]).toBeGreaterThan(balcaoZ);
  });

  it('os limites batem com o tamanho da sala', () => {
    expect(layout.bounds).toEqual({ minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 });
  });

  it('o alvo fica à direita do centro, para a sala cair na metade visível da tela', () => {
    // O extrato cobre a direita: mirar no centro da sala jogaria a agência para trás do painel.
    expect(BANK_CAMERA.target[0]).toBeGreaterThan(0);
    expect(BANK_CAMERA.position[1]).toBeGreaterThan(ROOM_D / 2);
    // A câmera, por sua vez, fica à direita do alvo — é o que traz o balcão (lado -x) para a frente.
    expect(BANK_CAMERA.position[0]).toBeGreaterThan(BANK_CAMERA.target[0]);
  });

  it('o ângulo polar da câmera cabe nos limites do controle (0,55–1,05)', () => {
    const dx = BANK_CAMERA.position[0] - BANK_CAMERA.target[0];
    const dy = BANK_CAMERA.position[1] - BANK_CAMERA.target[1];
    const dz = BANK_CAMERA.position[2] - BANK_CAMERA.target[2];
    const polar = Math.atan2(Math.hypot(dx, dz), dy);
    expect(polar).toBeGreaterThan(0.55);
    expect(polar).toBeLessThan(1.05);
  });

  it('a posição da câmera sai da distância nomeada, acima do minDistance do controle', () => {
    const d = Math.hypot(
      BANK_CAMERA.position[0] - BANK_CAMERA.target[0],
      BANK_CAMERA.position[1] - BANK_CAMERA.target[1],
      BANK_CAMERA.position[2] - BANK_CAMERA.target[2]
    );
    expect(d).toBeCloseTo(BANK_DISTANCE);
    expect(d).toBeGreaterThan(6);
  });

  it('o alvo fica acima do chão, para a parede do fundo entrar no quadro', () => {
    expect(BANK_CAMERA.target[1]).toBeGreaterThan(0);
    expect(BANK_CAMERA.target[1]).toBeLessThan(WALL_H);
  });
});

describe('caminho do malote', () => {
  const dentroDaSala = ([px, , pz]: Vec3) => Math.abs(px) <= ROOM_W / 2 && Math.abs(pz) <= ROOM_D / 2 + 0.6;

  it('entra pela porta, passa no balcão e termina no cofre', () => {
    expect(MALOTE_ENTRA).toHaveLength(3);
    expect(MALOTE_ENTRA[0][0]).toBeCloseTo(PORTA[0]);
    expect(MALOTE_ENTRA[1][0]).toBeCloseTo(BALCAO[0]);
    expect(MALOTE_ENTRA[2][0]).toBeCloseTo(COFRE[0]);
  });

  it('sair é o caminho de volta', () => {
    expect(MALOTE_SAI.map((p) => p[0])).toEqual([...MALOTE_ENTRA].reverse().map((p) => p[0]));
  });

  it('o malote viaja acima do chão, não arrastando', () => {
    for (const p of MALOTE_ENTRA) expect(p[1]).toBeGreaterThan(0.2);
  });

  it('o caminho inteiro fica dentro da sala', () => {
    for (const p of [...MALOTE_ENTRA, ...MALOTE_SAI]) expect(dentroDaSala(p), `ponto ${p}`).toBe(true);
  });

  it('tem comprimento suficiente para a animação ser percebida', () => {
    expect(pathLength(MALOTE_ENTRA)).toBeGreaterThan(2);
  });

  it('o ponto do balcão fica atrás do balcão, do lado do caixa', () => {
    const balcaoZ = buildBankLayout().furniture.find((p) => p.kind === 'kitchenBar')!.position[2];
    expect(BALCAO[2]).toBeLessThan(balcaoZ);
  });
});

describe('calendário de parede', () => {
  it('fica no plano da parede do fundo', () => {
    const fundo = layout.walls[0];
    // Um fio à frente da face interna da laje, senão desaparece dentro dela.
    expect(CALENDAR_ANCHOR[2]).toBeGreaterThan(fundo.position[2]);
    expect(CALENDAR_ANCHOR[2] - fundo.position[2]).toBeLessThan(0.3);
  });

  it('cabe na largura da parede', () => {
    const [largura] = CALENDAR_SIZE;
    expect(Math.abs(CALENDAR_ANCHOR[0]) + largura / 2).toBeLessThanOrEqual(ROOM_W / 2);
  });

  it('fica acima dos móveis e abaixo do teto da parede', () => {
    const maisAlto = Math.max(...layout.furniture.map((p) => p.position[1]));
    expect(CALENDAR_ANCHOR[1] - CALENDAR_SIZE[1] / 2).toBeGreaterThan(maisAlto);
    expect(CALENDAR_ANCHOR[1] + CALENDAR_SIZE[1] / 2).toBeLessThanOrEqual(WALL_H);
  });

  it('não fica em cima do cofre', () => {
    const cofre = layout.furniture.find((p) => p.kind === 'kitchenFridgeLarge')!;
    expect(Math.abs(CALENDAR_ANCHOR[0] - cofre.position[0])).toBeGreaterThan(CALENDAR_SIZE[0] / 2);
  });
});
