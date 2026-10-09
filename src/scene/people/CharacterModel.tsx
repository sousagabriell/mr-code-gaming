import { useEffect } from 'react';
import { useAnimations } from '@react-three/drei';
import { useKenneyModel } from '../kenney';

/** Animações do kit Kenney Mini Characters usadas no jogo (o kit traz ~30; estas são as que usamos). */
export type CharacterAnimation =
  | 'idle'
  | 'walk'
  | 'interact-right'
  | 'pick-up'
  | 'emote-yes'
  /** Biblioteca: sentado à mesa de leitura. */
  | 'sit';

/** Personagem animado (esqueleto clonado por instância; geometria e textura compartilhadas). */
export function CharacterModel({
  url,
  animation,
  height = 0.42,
  highlight = false,
}: {
  url: string;
  animation: CharacterAnimation;
  height?: number;
  highlight?: boolean;
}) {
  const { root, model, animations } = useKenneyModel(url, {
    size: height,
    fit: 'height',
    skinned: true,
    highlight: highlight ? 0.25 : 0,
  });
  const { actions } = useAnimations(animations, model);

  // Troca de animação com transição curta (andar → trabalhar → parado).
  useEffect(() => {
    const action = actions[animation];
    action?.reset().fadeIn(0.25).play();
    return () => {
      action?.fadeOut(0.25);
    };
  }, [actions, animation]);

  return <primitive object={root} />;
}
