import { describe, expect, it } from 'vitest';
import { BANK_CAMERA, buildBankLayout, COLS, ROOM_D, ROOM_W, ROWS, tileCenter } from './bank';

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

  it('as paredes fecham só o fundo e a esquerda — a frente fica aberta para a câmera', () => {
    const fundo = layout.walls.filter((p) => p.rotationY === 0);
    const esquerda = layout.walls.filter((p) => p.rotationY !== 0);
    expect(fundo).toHaveLength(COLS);
    expect(esquerda).toHaveLength(ROWS);
    for (const p of fundo) expect(p.position[2]).toBeLessThan(-ROOM_D / 2 + 1);
    for (const p of esquerda) expect(p.position[0]).toBeLessThan(-ROOM_W / 2 + 1);
  });

  it('existe exatamente um vão de porta', () => {
    expect(layout.walls.filter((p) => p.kind === 'wallDoorway')).toHaveLength(1);
  });

  it('nenhum móvel nasce em cima do vão da porta', () => {
    const porta = layout.walls.find((p) => p.kind === 'wallDoorway')!;
    for (const peca of layout.furniture) {
      const perto = Math.abs(peca.position[0] - porta.position[0]) < 0.6 && Math.abs(peca.position[2] - porta.position[2]) < 0.9;
      expect(perto, `${peca.kind} bloqueia a porta`).toBe(false);
    }
  });

  it('todo móvel fica dentro da sala', () => {
    for (const peca of layout.furniture) {
      expect(Math.abs(peca.position[0]), `${peca.kind} fora no eixo x`).toBeLessThanOrEqual(ROOM_W / 2);
      expect(Math.abs(peca.position[2]), `${peca.kind} fora no eixo z`).toBeLessThanOrEqual(ROOM_D / 2);
    }
  });

  it('o balcão é uma fila contínua com as duas pontas fechadas', () => {
    const balcao = layout.furniture.filter((p) => p.kind === 'kitchenBar' || p.kind === 'kitchenBarEnd');
    const pontas = balcao.filter((p) => p.kind === 'kitchenBarEnd');
    expect(pontas).toHaveLength(2);
    const zs = new Set(balcao.map((p) => p.position[2].toFixed(3)));
    expect(zs.size, 'o balcão tem que estar todo na mesma fila').toBe(1);
    const xs = balcao.map((p) => p.position[0]).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(1);
  });

  it('os limites batem com o tamanho da sala', () => {
    expect(layout.bounds).toEqual({ minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 });
  });

  it('a câmera olha para a metade esquerda, onde o extrato não cobre', () => {
    expect(BANK_CAMERA.target[0]).toBeLessThan(0);
    expect(BANK_CAMERA.position[1]).toBeGreaterThan(ROOM_D / 2);
  });
});
