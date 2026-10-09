import { describe, expect, it } from 'vitest';
import { DECOR_SPOTS } from './decor';
import { frontRoadZ, LANDMARKS, LANE_OFFSET, lotPosition, LOT_SPACING } from './layout';
import {
  clientSignAnchor,
  landmarkSignAnchor,
  LOT_HALF,
  LOT_OBSTACLE_TOP,
  SIGN_FADE,
  SIGN_NAME_MAX,
  SIGN_POST,
  signOpacity,
  signPanelBottom,
  signSweepRadius,
  truncateLabel,
} from './signs';

/** Vagas de canteiro de `layout.ts` (SITE_SLOTS), relativas ao centro do lote, com meia-extensão do pad. */
const SITE_SLOTS: [number, number][] = [
  [1.05, -1.1],
  [1.05, 0],
  [1.05, 1.1],
  [-0.8, 1.35],
  [0.15, 1.35],
];
const SITE_PAD_HALF = 0.475;
/** Caminhão de chamado: 1,15 de comprimento, parado na faixa em frente ao lote. */
const TRUCK = { halfLength: 0.575, halfWidth: 0.25, dxs: [-1.3, 0, 1.3] };

describe('signOpacity', () => {
  it('fica opaca em todo o alcance normal de navegação', () => {
    expect(signOpacity(6)).toBe(1);
    expect(signOpacity(30)).toBe(1);
    expect(signOpacity(SIGN_FADE.start)).toBe(1);
  });

  it('zera ao atingir o fim do fade e não volta', () => {
    expect(signOpacity(SIGN_FADE.end)).toBe(0);
    expect(signOpacity(48)).toBe(0);
  });

  it('decresce de forma monotônica entre start e end', () => {
    const amostras = [34, 36, 38, 40, 42, 44].map(signOpacity);
    for (let i = 1; i < amostras.length; i++) expect(amostras[i]).toBeLessThan(amostras[i - 1]);
    expect(signOpacity((SIGN_FADE.start + SIGN_FADE.end) / 2)).toBeCloseTo(0.5, 5);
  });
});

describe('clientSignAnchor', () => {
  const lot = lotPosition(0);
  const anchor = clientSignAnchor(lot);

  it('acompanha o lote', () => {
    const outro = clientSignAnchor(lotPosition(1));
    expect(outro[0] - anchor[0]).toBeCloseTo(LOT_SPACING, 5);
    expect(outro[2]).toBeCloseTo(anchor[2], 5);
    expect(anchor[1]).toBe(0);
  });

  it('o poste fica dentro do lote', () => {
    expect(Math.abs(anchor[0] - lot[0])).toBeLessThan(LOT_HALF);
    expect(Math.abs(anchor[2] - lot[2])).toBeLessThan(LOT_HALF);
  });

  it('o poste passa entre as vagas de canteiro', () => {
    const r = SIGN_POST.radius;
    for (const [dx, dz] of SITE_SLOTS) {
      const folgaX = Math.abs(anchor[0] - (lot[0] + dx)) - (r + SITE_PAD_HALF);
      const folgaZ = Math.abs(anchor[2] - (lot[2] + dz)) - (r + SITE_PAD_HALF);
      // Basta estar separado num dos eixos para os retângulos não se tocarem.
      expect(Math.max(folgaX, folgaZ)).toBeGreaterThan(0);
    }
  });

  it('o poste não fica em cima de nenhuma vaga de caminhão', () => {
    const z = frontRoadZ(lot[2]) - LANE_OFFSET;
    for (const dx of TRUCK.dxs) {
      const folgaX = Math.abs(anchor[0] - (lot[0] + dx)) - (SIGN_POST.radius + TRUCK.halfLength);
      const folgaZ = Math.abs(anchor[2] - z) - (SIGN_POST.radius + TRUCK.halfWidth);
      expect(Math.max(folgaX, folgaZ)).toBeGreaterThan(0);
    }
  });

  it('o painel passa por cima do que o lote pode conter', () => {
    // O disco varrido pelo painel cruza a vaga 3 em planta — a folga é vertical, não horizontal.
    expect(signPanelBottom()).toBeGreaterThan(LOT_OBSTACLE_TOP);
    expect(signSweepRadius(true)).toBeLessThan(LOT_HALF);
  });
});

describe('landmarkSignAnchor', () => {
  it('alinha a fileira cívica inteira no mesmo z', () => {
    const zs = LANDMARKS.map((l) => landmarkSignAnchor(l.position[0])[2]);
    expect(LANDMARKS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(zs).size).toBe(1);
  });

  it('nenhuma placa varre a praça nem outro landmark', () => {
    const r = signSweepRadius(true);
    const xs = LANDMARKS.map((l) => l.position[0]);
    for (let i = 1; i < xs.length; i++) {
      expect(Math.abs(xs[i] - xs[i - 1]), `placas de ${xs[i - 1]} e ${xs[i]}`).toBeGreaterThan(r * 2);
    }
  });

  /**
   * O teste cruza as **duas tabelas de verdade** (`LANDMARKS` e `DECOR_SPOTS`) em vez de repetir
   * coordenadas à mão: foi por serem cópias que o monumento acabou plantado em cima do quinto prédio
   * cívico sem nada acusar.
   */
  it('nenhum prédio cívico encosta numa construção de desbloqueio', () => {
    const FOOTPRINT = 1.3; // meia-largura do maior landmark
    for (const l of LANDMARKS) {
      for (const d of DECOR_SPOTS) {
        const dist = Math.hypot(l.position[0] - d.position[0], l.position[2] - d.position[2]);
        expect(dist, `${l.kind} × ${d.key}`).toBeGreaterThan(FOOTPRINT + d.raio);
      }
    }
  });

  it('a placa de cada prédio também fica livre da decoração', () => {
    const r = signSweepRadius(true);
    for (const l of LANDMARKS) {
      const [sx, , sz] = landmarkSignAnchor(l.position[0]);
      for (const d of DECOR_SPOTS) {
        const dist = Math.hypot(sx - d.position[0], sz - d.position[2]);
        expect(dist, `placa de ${l.kind} × ${d.key}`).toBeGreaterThan(r + d.raio);
      }
    }
  });
});

describe('truncateLabel', () => {
  it('devolve nomes curtos intactos', () => {
    expect(truncateLabel('Banco Central')).toBe('Banco Central');
  });

  it('tira espaços nas pontas', () => {
    expect(truncateLabel('  AgroTech  ')).toBe('AgroTech');
  });

  it('corta com reticência e respeita o limite', () => {
    const corte = truncateLabel('Distribuidora Nordeste Comércio e Serviços Ltda');
    expect(Array.from(corte)).toHaveLength(SIGN_NAME_MAX);
    expect(corte.endsWith('…')).toBe(true);
  });

  it('é idempotente', () => {
    const nome = 'Distribuidora Nordeste Comércio e Serviços Ltda';
    expect(truncateLabel(truncateLabel(nome))).toBe(truncateLabel(nome));
  });

  it('não parte pares substitutos', () => {
    const nome = '🏗️🏗️🏗️ Construtora Horizonte Azul Ltda';
    const corte = truncateLabel(nome);
    expect(corte).not.toContain('�');
    expect(Array.from(corte).length).toBeLessThanOrEqual(SIGN_NAME_MAX);
  });

  it('conta caracteres acentuados como um só', () => {
    expect(truncateLabel('Ação Çédilha', 12)).toBe('Ação Çédilha');
  });
});
