export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "R$ 12,4 mil" — para KPIs onde o espaço é curto. */
export function formatBRLCompact(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

/** "25 de outubro de 2024" — o formato da tela de projeto do portal. */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'long' });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatDateTimeShort(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso: string, now = Date.now()): string {
  const diffMin = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `há ${diffD} d`;
}

/** Texto puro a partir do HTML do editor rico (descrições/respostas de chamado). */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  // Preserva as quebras de linha que o textContent descartaria.
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
  return (doc.body.textContent ?? '').trim();
}

/** Primeira linha do conteúdo, numa linha só — o resumo do artigo no índice da biblioteca. */
export function resumo(html: string | null | undefined, limite = 140): string {
  // `textContent` cola blocos vizinhos ("…o tempo todoTermoO que é"): separa antes de achatar.
  const separado = (html ?? '').replace(/<\/(p|h[1-6]|li|td|th|tr|blockquote|pre|div)>/gi, ' $&');
  const texto = stripHtml(separado).replace(/\s+/g, ' ');
  return texto.length > limite ? `${texto.slice(0, limite).trimEnd()}…` : texto;
}

/** Texto digitado → HTML seguro (o MrCodeAdmin renderiza o HTML dos comentários). */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** yyyy-mm-dd no fuso local (toISOString usaria UTC e poderia virar o dia). */
export function toDateInput(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
