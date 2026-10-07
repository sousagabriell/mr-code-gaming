import type { Weather } from '../world/gamification';

/** Céu, luz e efeitos por clima — o clima vem da saúde da cidade (gamification.cityHealth). */
export const WEATHER_STYLE: Record<
  Weather,
  { sky: string; hemi: number; sun: number; sunColor: string; clouds: number; cloudColor: string; rain: number; lightning: boolean }
> = {
  sol: { sky: '#e9edf7', hemi: 1.6, sun: 2, sunColor: '#ffffff', clouds: 3, cloudColor: '#ffffff', rain: 0, lightning: false },
  nublado: { sky: '#e0e4ed', hemi: 1.5, sun: 1.3, sunColor: '#f8fafc', clouds: 9, cloudColor: '#f8fafc', rain: 0, lightning: false },
  chuva: { sky: '#d2d7e2', hemi: 1.35, sun: 0.8, sunColor: '#e2e8f0', clouds: 12, cloudColor: '#cbd5e1', rain: 450, lightning: false },
  tempestade: { sky: '#c3c6d3', hemi: 1.2, sun: 0.5, sunColor: '#e0e7ff', clouds: 14, cloudColor: '#94a3b8', rain: 800, lightning: true },
};
