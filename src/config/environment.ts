export const environment = {
  /** Em dev, o Vite faz proxy de /api para o backend do mr-code-admin (ver vite.config.ts). */
  apiUrl: '/api',
  /** Deep-link de volta pro Angular real — onde a edição de fato acontece. */
  adminUrl: import.meta.env.DEV ? 'http://localhost:4400' : '',
};
