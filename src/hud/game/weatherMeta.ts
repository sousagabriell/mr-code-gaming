import { Cloud, CloudLightning, CloudRain, Sun } from 'lucide-react';
import type { Weather } from '../../world/gamification';
import type { Tone } from '../../world/status';

export const WEATHER_META: Record<Weather, { label: string; icon: typeof Sun; tone: Tone }> = {
  sol: { label: 'Céu limpo', icon: Sun, tone: 'ok' },
  nublado: { label: 'Nublado', icon: Cloud, tone: 'info' },
  chuva: { label: 'Chuva', icon: CloudRain, tone: 'warn' },
  tempestade: { label: 'Tempestade', icon: CloudLightning, tone: 'bad' },
};
