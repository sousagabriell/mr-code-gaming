import { LANDMARK_Z, type Vec3 } from './layout';
import type { Unlock } from './gamification';

/**
 * Onde cada construção de desbloqueio fica plantada. O desenho é JSX e mora em
 * `scene/CityDecor.tsx`; só as **posições** vivem aqui, porque elas disputam espaço com a fileira
 * cívica e precisam entrar nos testes junto dos landmarks.
 *
 * Essa separação não é arrumação: a coordenada do monumento estava só no componente, e um quinto
 * prédio cívico foi plantado em cima dele — o teste não tinha como ver. Com as duas tabelas no mesmo
 * lugar puro, a próxima colisão aparece em `signs.test.ts`, não na tela.
 *
 * O raio é a meia-largura aproximada da peça no chão, para o teste de folga.
 */
export interface DecorSpot {
  key: Unlock['key'];
  position: Vec3;
  raio: number;
}

export const DECOR_SPOTS: DecorSpot[] = [
  { key: 'fonte', position: [0, 0, LANDMARK_Z + 2.1], raio: 0.8 },
  // De −5 para −4 quando o passo da fileira cívica caiu para 4: a −5 a estátua ficava colada na
  // placa do Banco Central. Agora ela fica no meio do vão entre dois prédios.
  { key: 'estatua', position: [-4, 0, LANDMARK_Z + 2.1], raio: 0.7 },
  { key: 'parque', position: [-14, 0, 1.5], raio: 2.2 },
  { key: 'roda-gigante', position: [14, 0, 1.5], raio: 1.8 },
  { key: 'torre', position: [0, 0, LANDMARK_Z - 3.2], raio: 0.9 },
  { key: 'heliponto', position: [-14, 0, -6.5], raio: 1.6 },
  { key: 'monumento', position: [14, 0, -6.5], raio: 1.4 },
];

export const decorSpot = (key: Unlock['key']): DecorSpot => DECOR_SPOTS.find((d) => d.key === key)!;
