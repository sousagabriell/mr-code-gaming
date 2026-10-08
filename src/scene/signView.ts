/**
 * Distância da câmera ao alvo, lida dentro dos `useFrame` das placas (mesmo padrão de `motion.ts`).
 * Um único componente escreve; todas as placas leem — assim elas acendem e apagam juntas, em vez de
 * cada uma medir a própria distância e desbotar em gradiente pela cidade.
 */
export const signView = { distance: 30 };
