#!/usr/bin/env node
/**
 * Copia dos kits Kenney (assets-src/kenney, fora do build) para public/models apenas os GLB que a cena usa,
 * otimizados com gltf-transform (meshopt; ~70–85% menores) e com a licença. Rodar depois de trocar um kit:
 *   npm run models
 * A lista abaixo deve espelhar src/scene/assets.ts.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Chama o entrypoint do CLI direto pelo node: o wrapper em .bin é .cmd no Windows e o execFile recusa (EINVAL).
const GLTF_TRANSFORM = path.join('node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');

const SRC = 'assets-src/kenney';
const DEST = 'public/models';

const KITS = {
  city: {
    dir: 'kenney_city-kit-commercial_2.1',
    models: [
      ...'abcdefgijklmn'.split('').map((l) => `building-${l}`),
      'building-skyscraper-a',
      'building-skyscraper-c',
      'building-skyscraper-d',
      'building-skyscraper-e',
    ],
  },
  // join/flatten desligados: as rodas e a porta precisam continuar sendo nós separados (giram/abrem).
  cars: { dir: 'kenney_car-kit', models: ['delivery', 'van', 'truck', 'ambulance', 'tractor-shovel', 'box', 'cone'], keepNodes: true },
  characters: {
    dir: 'kenney_mini-characters',
    models: ['a', 'b', 'c', 'd', 'e', 'f'].flatMap((v) => [`character-male-${v}`, `character-female-${v}`]),
  },
  // Kit industrial: só os prédios cívicos (o nome `building-a` colide com o kit comercial — por isso pasta própria).
  industrial: { dir: 'kenney_city-kit-industrial_2.0', models: ['building-a', 'building-t', 'detail-tank-large'] },
  // Ladrilhos 1×1 da malha viária; o resto do kit (placas, postes, pontes) não é usado.
  roads: { dir: 'kenney_city-kit-roads', models: ['road-straight', 'road-crossroad', 'road-intersection', 'road-bend'] },
  /**
   * "3D Road Tiles": kit antigo, em .gltf e com nomes numerados. Daqui só sai a vegetação do campo em
   * volta da cidade — o resto são pistas (já vêm do `roads`) e blocos de relevo, que isolados num plano
   * liso viram lajes em vez de morro. O destino renomeia porque `roadTile_019` não diz nada; confira o
   * número no `Preview.png` do kit antes de mexer.
   */
  nature: {
    dir: 'kenney_3d-road-tiles',
    sub: ['Models', 'gLTF'],
    ext: 'gltf',
    models: [
      { from: 'roadTile_019', to: 'pine' },
      { from: 'roadTile_020', to: 'bush' },
    ],
  },
  /**
   * Móveis dos cenários internos de landmark — a agência do BC e a biblioteca da UN. Este kit guarda
   * os GLB em "GLTF format"; os outros usam "GLB format". O kit tem 140 peças, aqui só as que as
   * duas salas montam.
   */
  furniture: {
    dir: 'kenney_furniture-kit',
    sub: ['Models', 'GLTF format'],
    models: [
      // casca das salas (as paredes são lajes lisas desenhadas na cena — ver world/interior.ts)
      'floorFull',
      'rugRounded',
      'rugRectangle',
      // balcão de atendimento
      'kitchenBar',
      'kitchenBarEnd',
      'stoolBar',
      // posto do caixa
      'desk',
      'chairDesk',
      'computerScreen',
      'computerKeyboard',
      // cofre e malotes
      'kitchenFridgeLarge',
      'cardboardBoxClosed',
      // espera
      'loungeSofa',
      'loungeChair',
      'tableCoffee',
      'pottedPlant',
      // biblioteca da Universidade: estantes decorativas e o canto de leitura
      // (a estante funcional é montada com caixas — ver world/universidade.ts)
      'bookcaseOpen',
      'bookcaseClosedWide',
      'chairModernCushion',
      'lampRoundFloor',
      // detalhes
      'lampSquareCeiling',
      'coatRackStanding',
      'trashcan',
      'books',
    ],
  },
};

for (const [name, kit] of Object.entries(KITS)) {
  const from = path.join(SRC, kit.dir, ...(kit.sub ?? ['Models', 'GLB format']));
  const ext = kit.ext ?? 'glb';
  const to = path.join(DEST, name);
  // Os kits originais ficam fora do git: sem a pasta de origem, mantém o que já está em public/models.
  if (!fs.existsSync(from)) {
    console.log(`${name}: kit ausente em ${from} — mantido como está`);
    continue;
  }
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  for (const entry of kit.models) {
    const { from: src, to: dest } = typeof entry === 'string' ? { from: entry, to: entry } : entry;
    // O GLB original referencia "Textures/colormap.png"; o optimize lê a textura e a embute no arquivo.
    const args = [GLTF_TRANSFORM, 'optimize', path.join(from, `${src}.${ext}`), path.join(to, `${dest}.glb`), '--compress', 'meshopt', '--texture-compress', 'false', '--simplify', 'false'];
    if (kit.keepNodes) args.push('--join', 'false', '--flatten', 'false');
    execFileSync(process.execPath, args, { stdio: 'ignore' });
  }
  fs.copyFileSync(path.join(SRC, kit.dir, 'License.txt'), path.join(to, 'License.txt'));
  const kb = fs.readdirSync(to).filter((f) => f.endsWith('.glb')).reduce((s, f) => s + fs.statSync(path.join(to, f)).size, 0) / 1024;
  console.log(`${name}: ${kit.models.length} modelos (${kb.toFixed(0)} KB)`);
}
