import { describe, expect, it } from 'vitest';
import type { ProjetoDTO, ProjetoMarcoDTO } from '../types/domain';
import { WALL_H } from './interior';
import { INTERIOR_BOUNDS, INTERIOR_CAMERA, interiorParam, lerInterior } from './interiors';
import {
  buildSedeLayout,
  COLS,
  marcosEmOrdem,
  MESA,
  PLACA,
  projetoEmFoco,
  projetosDoCliente,
  resumoDosMarcos,
  ROOM_D,
  ROOM_W,
  ROWS,
  SEDE_CAMERA,
  SEDE_DISTANCE,
  situacaoDoMarco,
  temAcessoDeProducao,
  urlSegura,
} from './sede';

const layout = buildSedeLayout();

const projeto = (idProjeto: number, idCliente: number, status: ProjetoDTO['status'] = 'EmAndamento') => ({
  idProjeto,
  idCliente,
  status,
});

const marco = (idMarco: number, dataPrevista: string, over: Partial<ProjetoMarcoDTO> = {}): ProjetoMarcoDTO => ({
  idMarco,
  titulo: `Marco ${idMarco}`,
  dataPrevista: `${dataPrevista}T00:00:00`,
  concluido: false,
  dataConclusao: null,
  ...over,
});

describe('sala do escritório', () => {
  it('o chão cobre a sala inteira, sem buraco nem sobra', () => {
    expect(layout.floor).toHaveLength(COLS * ROWS);
    const chaves = new Set(layout.floor.map((p) => `${p.position[0]},${p.position[2]}`));
    expect(chaves.size).toBe(COLS * ROWS);
  });

  it('é a menor das três salas', () => {
    const area = (b: { minX: number; maxX: number; minZ: number; maxZ: number }) => (b.maxX - b.minX) * (b.maxZ - b.minZ);
    expect(area(INTERIOR_BOUNDS.sede)).toBeLessThan(area(INTERIOR_BOUNDS.universidade));
    expect(area(INTERIOR_BOUNDS.sede)).toBeLessThan(area(INTERIOR_BOUNDS.banco));
  });

  it('são as mesmas duas lajes das outras salas — fundo e esquerda', () => {
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

  it('o posto de atendimento fica na metade esquerda — o painel cobre a direita da tela', () => {
    expect(MESA[0]).toBeLessThan(0);
    const posto = layout.furniture.filter((p) => ['desk', 'chairDesk', 'computerScreen'].includes(p.kind));
    expect(posto).toHaveLength(3);
    for (const p of posto) expect(p.position[0]).toBeLessThan(0);
  });

  it('a cadeira fica atrás da mesa, entre ela e a parede', () => {
    const cadeira = layout.furniture.find((p) => p.kind === 'chairDesk')!;
    expect(cadeira.position[2]).toBeLessThan(MESA[2]);
    expect(cadeira.position[2]).toBeGreaterThan(-ROOM_D / 2);
  });

  it('as cadeiras de visita ficam do lado de cá da mesa, viradas para ela', () => {
    const visitas = layout.furniture.filter((p) => p.kind === 'chairModernCushion');
    expect(visitas).toHaveLength(2);
    for (const c of visitas) {
      expect(c.position[2]).toBeGreaterThan(MESA[2]);
      expect(c.rotationY).toBeCloseTo(Math.PI);
    }
  });
});

describe('placa do cliente', () => {
  const [w, h] = PLACA.size;
  const [px, py, pz] = PLACA.position;

  it('tem a proporção 2:1 da textura das placas', () => {
    expect(w / h).toBeCloseTo(2);
  });

  it('fica no eixo da mesa', () => {
    expect(px).toBeCloseTo(MESA[0]);
  });

  it('cabe na parede, acima dos móveis encostados nela', () => {
    expect(py + h / 2 + PLACA.moldura).toBeLessThan(WALL_H);
    // 0,79 é o tampo do armário do arquivo — o móvel mais alto encostado na parede do fundo.
    expect(py - h / 2 - PLACA.moldura).toBeGreaterThan(0.79);
  });

  it('o cartão fica à frente da moldura, e a moldura encosta na parede', () => {
    const fundo = -ROOM_D / 2;
    expect(pz - fundo).toBeGreaterThan(PLACA.molduraProf);
    expect(pz - fundo).toBeLessThan(0.1);
  });
});

describe('câmera do escritório', () => {
  it('mira à direita da mesa, para ela cair na metade visível da tela', () => {
    expect(SEDE_CAMERA.target[0]).toBeGreaterThan(MESA[0]);
    expect(SEDE_CAMERA.position[0]).toBeGreaterThan(SEDE_CAMERA.target[0]);
  });

  it('o alvo fica acima do chão e abaixo do topo da parede', () => {
    expect(SEDE_CAMERA.target[1]).toBeGreaterThan(0);
    expect(SEDE_CAMERA.target[1]).toBeLessThan(WALL_H);
  });

  it('o ângulo polar cabe nos limites do controle (0,55–1,05)', () => {
    const [dx, dy, dz] = SEDE_CAMERA.position.map((c, i) => c - SEDE_CAMERA.target[i]);
    const polar = Math.atan2(Math.hypot(dx, dz), dy);
    expect(polar).toBeGreaterThan(0.55);
    expect(polar).toBeLessThan(1.05);
  });

  it('é a mais fechada dos interiores, sem passar do minDistance do controle', () => {
    const dist = (c: { position: number[]; target: number[] }) =>
      Math.hypot(...c.position.map((v, i) => v - c.target[i]));
    expect(dist(SEDE_CAMERA)).toBeCloseTo(SEDE_DISTANCE);
    expect(dist(SEDE_CAMERA)).toBeGreaterThan(6);
    expect(dist(SEDE_CAMERA)).toBeLessThan(dist(INTERIOR_CAMERA.universidade));
    expect(dist(SEDE_CAMERA)).toBeLessThan(dist(INTERIOR_CAMERA.banco));
  });

  it('os limites batem com o tamanho da sala', () => {
    expect(layout.bounds).toEqual({ minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 });
    expect(INTERIOR_BOUNDS.sede).toEqual(layout.bounds);
  });
});

describe('interior na URL', () => {
  it('lê os interiores de landmark sem id', () => {
    expect(lerInterior('banco')).toEqual({ kind: 'banco', idCliente: null });
    expect(lerInterior('universidade')).toEqual({ kind: 'universidade', idCliente: null });
  });

  it('o escritório traz o cliente dono', () => {
    expect(lerInterior('sede:3')).toEqual({ kind: 'sede', idCliente: 3 });
  });

  it('escritório sem dono válido não abre', () => {
    for (const valor of ['sede', 'sede:', 'sede:abc', 'sede:0', 'sede:-2', 'sede:1.5']) {
      expect(lerInterior(valor), valor).toBeNull();
    }
  });

  it('recusa o que não é interior, e landmark com id', () => {
    for (const valor of [null, undefined, '', 'prefeitura', 'banco:2', 'cliente:3']) {
      expect(lerInterior(valor), String(valor)).toBeNull();
    }
  });

  it('ida e volta pela URL preserva o interior', () => {
    expect(lerInterior(interiorParam('sede', 7))).toEqual({ kind: 'sede', idCliente: 7 });
    expect(lerInterior(interiorParam('banco'))).toEqual({ kind: 'banco', idCliente: null });
  });
});

describe('projetos do escritório', () => {
  it('só os do cliente, em ordem de id — a aba não troca de lugar quando o status muda', () => {
    const todos = [projeto(5, 1, 'Concluido'), projeto(2, 2), projeto(3, 1, 'Planejamento'), projeto(1, 1, 'Cancelado')];
    expect(projetosDoCliente(todos, 1).map((p) => p.idProjeto)).toEqual([1, 3, 5]);
  });

  it('cliente sem projeto não tem foco', () => {
    expect(projetoEmFoco([], null)).toBeNull();
    expect(projetoEmFoco([], 4)).toBeNull();
  });

  it('o projeto pedido vale quando é do cliente', () => {
    const lista = [projeto(1, 1), projeto(2, 1, 'Concluido')];
    expect(projetoEmFoco(lista, 2)).toBe(2);
  });

  it('pedido de outro cliente cai no padrão', () => {
    const lista = [projeto(1, 1), projeto(2, 1, 'Concluido')];
    expect(projetoEmFoco(lista, 99)).toBe(1);
  });

  it('o padrão é o que está em obra; cancelado só se não houver outro', () => {
    expect(projetoEmFoco([projeto(1, 1, 'Cancelado'), projeto(2, 1, 'Concluido'), projeto(3, 1, 'EmAndamento')], null)).toBe(3);
    expect(projetoEmFoco([projeto(1, 1, 'Cancelado'), projeto(2, 1, 'Pausado'), projeto(3, 1, 'Planejamento')], null)).toBe(3);
    expect(projetoEmFoco([projeto(4, 1, 'Cancelado')], null)).toBe(4);
  });

  it('empate na fase fica com o de menor id', () => {
    expect(projetoEmFoco([projeto(9, 1), projeto(4, 1)], null)).toBe(4);
  });
});

describe('acesso de produção e links', () => {
  it('há acesso se qualquer um dos três campos estiver preenchido', () => {
    const vazio = { linkProducao: null, loginProducao: null, senhaProducao: null };
    expect(temAcessoDeProducao(vazio)).toBe(false);
    expect(temAcessoDeProducao({ ...vazio, senhaProducao: 'x' })).toBe(true);
    expect(temAcessoDeProducao({ ...vazio, loginProducao: 'root@root.com' })).toBe(true);
  });

  it('http e https viram link', () => {
    expect(urlSegura('https://app.lmlopesordermanager.online/')).toBe('https://app.lmlopesordermanager.online/');
    expect(urlSegura('  http://localhost:4400  ')).toBe('http://localhost:4400');
  });

  it('esquema perigoso ou estranho não vira link', () => {
    for (const valor of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'ftp://host/arquivo']) {
      expect(urlSegura(valor), valor).toBeNull();
    }
  });

  it('endereço sem esquema, vazio ou nulo não vira link', () => {
    for (const valor of ['www.site.com.br', 'github.com/repo', '', '   ', null, undefined]) {
      expect(urlSegura(valor), String(valor)).toBeNull();
    }
  });
});

describe('marcos', () => {
  const hoje = '2026-10-09';

  it('concluído vale mais que a data', () => {
    expect(situacaoDoMarco(marco(1, '2020-01-01', { concluido: true }), hoje)).toBe('concluido');
  });

  it('pendente com a data no passado está atrasado; o próprio dia ainda está no prazo', () => {
    expect(situacaoDoMarco(marco(1, '2026-10-08'), hoje)).toBe('atrasado');
    expect(situacaoDoMarco(marco(2, '2026-10-09'), hoje)).toBe('previsto');
    expect(situacaoDoMarco(marco(3, '2027-01-01'), hoje)).toBe('previsto');
  });

  it('a data é lida como dia de calendário, sem fuso — o fim do dia não vira o dia seguinte', () => {
    expect(situacaoDoMarco({ concluido: false, dataPrevista: '2026-10-08T23:59:59' }, hoje)).toBe('atrasado');
  });

  it('ficam em ordem de calendário, com o id desempatando', () => {
    const ordem = marcosEmOrdem([marco(3, '2026-12-01'), marco(2, '2026-01-15'), marco(1, '2026-12-01')]);
    expect(ordem.map((m) => m.idMarco)).toEqual([2, 1, 3]);
  });

  it('ordenar não mexe na lista original', () => {
    const lista = [marco(2, '2026-12-01'), marco(1, '2026-01-01')];
    marcosEmOrdem(lista);
    expect(lista.map((m) => m.idMarco)).toEqual([2, 1]);
  });

  it('o resumo conta concluídos e atrasados', () => {
    const lista = [marco(1, '2026-01-01', { concluido: true }), marco(2, '2026-02-01'), marco(3, '2027-02-01')];
    expect(resumoDosMarcos(lista, hoje)).toEqual({ total: 3, concluidos: 1, atrasados: 1 });
    expect(resumoDosMarcos([], hoje)).toEqual({ total: 0, concluidos: 0, atrasados: 0 });
  });
});
