export const environment = {
  apiUrl: import.meta.env.DEV ? 'http://localhost:5200/api' : '/api',
  /** Deep-link de volta pro Angular real — onde a edição de fato acontece. */
  adminUrl: import.meta.env.DEV ? 'http://localhost:4400' : '',
};
