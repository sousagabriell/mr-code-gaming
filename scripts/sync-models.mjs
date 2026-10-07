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

const GLTF_TRANSFORM = path.join('node_modules', '.bin', 'gltf-transform');

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
};

for (const [name, kit] of Object.entries(KITS)) {
  const from = path.join(SRC, kit.dir, 'Models', 'GLB format');
  const to = path.join(DEST, name);
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  for (const m of kit.models) {
    // O GLB original referencia "Textures/colormap.png"; o optimize lê a textura e a embute no arquivo.
    const args = ['optimize', path.join(from, `${m}.glb`), path.join(to, `${m}.glb`), '--compress', 'meshopt', '--texture-compress', 'false', '--simplify', 'false'];
    if (kit.keepNodes) args.push('--join', 'false', '--flatten', 'false');
    execFileSync(GLTF_TRANSFORM, args, { stdio: 'ignore' });
  }
  fs.copyFileSync(path.join(SRC, kit.dir, 'License.txt'), path.join(to, 'License.txt'));
  const kb = fs.readdirSync(to).filter((f) => f.endsWith('.glb')).reduce((s, f) => s + fs.statSync(path.join(to, f)).size, 0) / 1024;
  console.log(`${name}: ${kit.models.length} modelos (${kb.toFixed(0)} KB)`);
}
