import { describe, expect, it } from 'vitest';
import type { CityBounds } from './layout';
import { cityPlatform, FIELD_REACH, insideCity, MIN_SPACING, outskirtsPlan } from './outskirts';
import { seeded, seededRange } from './seeded';

const bounds: CityBounds = { minX: -9.5, maxX: 9.5, minZ: -8.3, maxZ: 8.1 };

describe('seeded', () => {
  it('fica em [0, 1) e repete para a mesma entrada', () => {
    for (let i = 0; i < 200; i++) {
      const v = seeded(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(seeded(i)).toBe(v);
    }
  });

  it('respeita a faixa pedida', () => {
    for (let i = 0; i < 100; i++) {
      const v = seededRange(i, -4, 7);
      expect(v).toBeGreaterThanOrEqual(-4);
      expect(v).toBeLessThan(7);
    }
  });
});

describe('outskirtsPlan', () => {
  const plan = outskirtsPlan(bounds);
  const tudo = [...plan.pines, ...plan.bushes];

  it('devolve o mesmo campo para os mesmos limites', () => {
    expect(outskirtsPlan(bounds)).toEqual(plan);
  });

  it('nada nasce dentro da cidade', () => {
    for (const { position } of tudo) expect(insideCity(bounds, position[0], position[2])).toBe(false);
  });

  it('nada nasce longe demais para ser visto', () => {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    for (const { position } of tudo) {
      expect(Math.abs(position[0] - cx)).toBeLessThanOrEqual(FIELD_REACH);
      expect(Math.abs(position[2] - cz)).toBeLessThanOrEqual(FIELD_REACH);
    }
  });

  it('povoa o campo de verdade (o anel não fica vazio)', () => {
    expect(plan.pines.length).toBeGreaterThan(60);
    expect(plan.bushes.length).toBeGreaterThan(40);
  });

  it('a plataforma cobre a cidade inteira com folga', () => {
    const p = cityPlatform(bounds);
    expect(p.width).toBeGreaterThan(bounds.maxX - bounds.minX);
    expect(p.depth).toBeGreaterThan(bounds.maxZ - bounds.minZ);
    expect(p.center[1]).toBe(0);
    expect(p.center[0]).toBeCloseTo((bounds.minX + bounds.maxX) / 2, 5);
  });

  it('a cidade crescendo não empurra nada para dentro dela', () => {
    const maior: CityBounds = { ...bounds, maxZ: bounds.maxZ + 4.6 * 3 };
    const plano = outskirtsPlan(maior);
    for (const { position } of [...plano.pines, ...plano.bushes]) {
      expect(insideCity(maior, position[0], position[2])).toBe(false);
    }
  });

  it('nenhuma planta encosta na outra', () => {
    for (let i = 0; i < tudo.length; i++) {
      for (let j = i + 1; j < tudo.length; j++) {
        const d = Math.hypot(tudo[i].position[0] - tudo[j].position[0], tudo[i].position[2] - tudo[j].position[2]);
        expect(d).toBeGreaterThanOrEqual(MIN_SPACING);
      }
    }
  });

  it('varia porte e giro', () => {
    const escalas = new Set(plan.pines.map((p) => p.scale.toFixed(3)));
    const giros = new Set(plan.pines.map((p) => p.rotationY.toFixed(3)));
    expect(escalas.size).toBeGreaterThan(50);
    expect(giros.size).toBeGreaterThan(50);
  });
});
