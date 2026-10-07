import type { Tone } from '../world/status';

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  info: 'bg-info-soft text-info',
  neutral: 'bg-neutral-soft text-neutral',
};

export const TONE_HEX: Record<Tone, string> = {
  ok: '#16a34a',
  warn: '#f59e0b',
  bad: '#ef4444',
  info: '#134ced',
  neutral: '#94a3b8',
};
