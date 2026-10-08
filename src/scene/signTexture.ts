import { useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { SIGN_NAME_MAX, truncateLabel } from '../world/signs';

/**
 * Rasteriza a placa de um prédio num canvas 2D e devolve a textura.
 *
 * Por que canvas e não o `<Text>` do drei: o troika recusa `.woff2` e o projeto só tem
 * `@fontsource-variable/inter`, que entrega só `.woff2`; sem um arquivo local ele ainda cai num CDN
 * (jsDelivr) para a fonte padrão e para o resolvedor Unicode. O canvas reaproveita a fonte que a HUD
 * já carregou e pinta exatamente o mesmo cartão da pílula de hover (`SceneTag`).
 */

/** Proporção 2:1, igual à de `SIGN_PANEL` — o painel é um plano com essa textura. */
const W = 512;
const H = 256;
const PAD = 22;
const FONT_FAMILY = "'Inter Variable', system-ui, sans-serif";
/** Mesmos tokens do tema (index.css): o cartão tem que ser indistinguível da pílula da HUD. */
const INK = '#0f172a';
const CARD = '#ffffff';

/** Tamanhos tentados para o nome, do maior para o menor: cabe grande quando o nome é curto. */
const FONT_LADDER = [54, 48, 42, 36, 31];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Quebra o nome em no máximo duas linhas que caibam em `maxWidth`; devolve null se não couber. */
function wrap(ctx: CanvasRenderingContext2D, name: string, maxWidth: number): string[] | null {
  if (ctx.measureText(name).width <= maxWidth) return [name];

  const words = name.split(/\s+/);
  for (let cut = words.length - 1; cut >= 1; cut--) {
    const linhas = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
    if (linhas.every((l) => ctx.measureText(l).width <= maxWidth)) return linhas;
  }
  return null;
}

export interface SignSpec {
  code: string;
  name: string;
  accent: string;
}

/**
 * Textura da placa. Quem chama é dono dela: chame `dispose()` ao desmontar.
 * `anisotropy` entra por fora (precisa do renderer) — a placa é sempre vista de 30°–58° acima do
 * horizonte, ou seja, em minificação anisotrópica permanente, e é a maior alavanca de nitidez aqui.
 */
export function createSignTexture({ code, name, accent }: SignSpec): CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Cartão
  ctx.fillStyle = CARD;
  roundRect(ctx, PAD / 2, PAD / 2, W - PAD, H - PAD, 30);
  ctx.fill();

  // Chip com o código, igual ao da pílula de hover
  const chip = { x: PAD + 6, y: PAD + 8, h: 50 };
  ctx.font = `700 30px ${FONT_FAMILY}`;
  const chipW = ctx.measureText(code).width + 34;
  ctx.fillStyle = accent;
  roundRect(ctx, chip.x, chip.y, chipW, chip.h, chip.h / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, chip.x + 17, chip.y + chip.h / 2 + 1);

  // Nome: uma ou duas linhas, no maior corpo que couber
  const maxWidth = W - 2 * (PAD + 6);
  const nome = truncateLabel(name, SIGN_NAME_MAX);
  let size = FONT_LADDER[FONT_LADDER.length - 1];
  let linhas: string[] = [nome];
  for (const candidato of FONT_LADDER) {
    ctx.font = `600 ${candidato}px ${FONT_FAMILY}`;
    const quebra = wrap(ctx, nome, maxWidth);
    if (quebra) {
      size = candidato;
      linhas = quebra;
      break;
    }
  }

  ctx.font = `600 ${size}px ${FONT_FAMILY}`;
  ctx.fillStyle = INK;
  const blocoTopo = chip.y + chip.h + 18;
  const altura = H - PAD - blocoTopo;
  const entrelinha = size * 1.18;
  let y = blocoTopo + (altura - entrelinha * linhas.length) / 2 + entrelinha / 2;
  for (const linha of linhas) {
    ctx.fillText(linha, PAD + 6, y);
    y += entrelinha;
  }

  const texture = new CanvasTexture(canvas);
  // Sem isto o azul da marca (#134ced) sai lavado: o Canvas usa `flat`/NoToneMapping e reencodaria
  // bytes já em sRGB como se fossem lineares.
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const SAMPLE = 'ÁÇÃO Banco Central 0123';

/**
 * `true` quando a Inter já está pronta para o canvas. O Canvas2D não dispara a carga preguiçosa de
 * `@font-face` sozinho e o fontsource usa `font-display: swap` — sem esperar, a primeira placa de uma
 * sessão com cache frio sairia desenhada em Arial.
 */
export function useSignFontsReady(): boolean {
  const [ready, setReady] = useState(() => typeof document === 'undefined' || !document.fonts);

  useEffect(() => {
    if (ready) return;
    let vivo = true;
    const pronto = () => vivo && setReady(true);
    Promise.all([document.fonts.load(`700 30px ${FONT_FAMILY}`, SAMPLE), document.fonts.load(`600 54px ${FONT_FAMILY}`, SAMPLE)])
      .then(() => document.fonts.ready)
      .then(pronto, pronto);
    return () => {
      vivo = false;
    };
  }, [ready]);

  return ready;
}
