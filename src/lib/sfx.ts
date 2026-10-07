/**
 * Efeitos sonoros curtos sintetizados com WebAudio (sem arquivos). Desligados por padrão —
 * a preferência fica no menu do usuário.
 */
type Sfx = 'xp' | 'level' | 'unlock' | 'deliver';

let ctx: AudioContext | null = null;

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.06) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

export function playSfx(kind: Sfx) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (kind === 'xp') {
      tone(880, 0, 0.12);
      tone(1320, 0.07, 0.16);
    } else if (kind === 'deliver') {
      tone(520, 0, 0.1, 'triangle');
      tone(780, 0.06, 0.14, 'triangle');
    } else if (kind === 'unlock') {
      [660, 880, 1100].forEach((f, i) => tone(f, i * 0.08, 0.2, 'triangle'));
    } else {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'square', 0.035));
    }
  } catch {
    // Sem áudio disponível (ex.: navegador bloqueou) — o jogo segue em silêncio.
  }
}
