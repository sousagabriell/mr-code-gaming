import { createRef, type RefObject } from 'react';

/**
 * Contêiner DOM estável para todos os <Html> da cena. Sem ele o drei usa como alvo o pai do
 * canvas e, quando o R3F conecta os eventos, troca de alvo e remonta cada etiqueta.
 */
export const labelsPortal = createRef<HTMLDivElement>();

/** O drei tipa `portal` como não-nulo; o contêiner já existe quando qualquer <Html> monta. */
export const labelsPortalTarget = labelsPortal as RefObject<HTMLElement>;
