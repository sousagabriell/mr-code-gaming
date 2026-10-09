import { createElement, type ReactNode } from 'react';

/**
 * Renderiza o corpo de um artigo da wiki.
 *
 * O `conteudo` vem do editor rico do MrCodeAdmin — HTML escrito por outra aplicação — ou, nos
 * artigos antigos, texto cru (o portal trata o caso com `legacyPlainTextToHtml`). O Angular joga
 * isso num `[innerHTML]`, que passa pelo `DomSanitizer` dele; o React **não tem equivalente**, e
 * `dangerouslySetInnerHTML` entregaria `<script>` e `onerror=` prontos.
 *
 * Então aqui o HTML é **parseado para elementos React**, não injetado. A diferença importa: num
 * pipeline "sanitiza e joga no innerHTML", um furo no sanitizador vira execução de script; aqui o
 * pior caso de um furo é conteúdo que não aparece, porque só as tags desta tabela são construídas
 * e só os atributos mapeados abaixo chegam ao DOM. Nada de `style`, `class`, `id` ou `on*` passa.
 *
 * O preço é não haver teste de unidade (o `DOMParser` não existe no vitest em node) — a verificação
 * é no navegador, com um artigo cheio de `<script>`, `onerror=` e `javascript:`.
 */

const CLASSES: Record<string, string> = {
  p: 'mb-3 text-[13px] leading-relaxed text-ink-2',
  h1: 'mb-2 mt-4 text-[16px] font-bold text-ink',
  h2: 'mb-2 mt-4 text-[15px] font-bold text-ink',
  h3: 'mb-1.5 mt-3 text-[13px] font-bold text-ink',
  h4: 'mb-1.5 mt-3 text-[13px] font-semibold text-ink',
  ul: 'mb-3 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-ink-2',
  ol: 'mb-3 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-ink-2',
  li: '',
  strong: 'font-semibold text-ink',
  em: 'italic',
  a: 'font-medium text-brand underline decoration-brand/30 hover:decoration-brand',
  code: 'rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-ink',
  pre: 'mb-3 overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-[12px] leading-relaxed text-ink',
  blockquote: 'mb-3 border-l-2 border-brand/40 pl-3 text-[13px] italic leading-relaxed text-ink-2',
  table: 'mb-3 w-full border-collapse text-[12px]',
  th: 'border border-line bg-surface-2 px-2 py-1 text-left font-semibold text-ink',
  td: 'border border-line px-2 py-1 align-top text-ink-2',
  img: 'mb-3 max-w-full rounded-xl',
  hr: 'my-4 border-line',
  br: '',
  thead: '',
  tbody: '',
  tr: '',
};

/** Tags cujo conteúdo é descartado junto — texto de `<script>` não é texto do artigo. */
const DESCARTA = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'noscript',
  'template',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'select',
  'textarea',
]);

/** Elementos sem filhos: o React recusa `children` neles. */
const VAZIAS = new Set(['br', 'hr', 'img']);

/**
 * Contêineres que não podem ter texto direto. O parser de HTML mantém a quebra de linha entre
 * `<table>` e `<thead>` como nó de texto, e passar isso ao React vira "whitespace text nodes cannot
 * be a child of <table>". Dentro de um `<p>` o espaço entre palavras importa; aqui, não.
 */
const SEM_TEXTO_SOLTO = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'ul', 'ol']);

const linkSeguro = (href: string) => /^(https?:\/\/|mailto:)/i.test(href.trim());
const imagemSegura = (src: string) => /^(https?:\/\/|\/)/i.test(src.trim());

/** Só os atributos mapeados aqui chegam ao DOM — o resto (style, class, id, on*) é ignorado. */
function propsDe(el: Element, tag: string): Record<string, string | undefined> {
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '';
    // `javascript:` e `data:` não viram link — ver `converter`, que também tira a aparência de link.
    return linkSeguro(href) ? { href, target: '_blank', rel: 'noreferrer noopener' } : {};
  }
  if (tag === 'img') {
    const src = el.getAttribute('src') ?? '';
    if (!imagemSegura(src)) return {};
    return { src, alt: el.getAttribute('alt') ?? '' };
  }
  if (tag === 'td' || tag === 'th') {
    return { colSpan: el.getAttribute('colspan') ?? undefined, rowSpan: el.getAttribute('rowspan') ?? undefined };
  }
  return {};
}

function converter(node: Node, chave: string): ReactNode {
  if (node.nodeType === 3 /* texto */) return node.nodeValue;
  if (node.nodeType !== 1 /* elemento */) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (DESCARTA.has(tag)) return null;

  const soltos = SEM_TEXTO_SOLTO.has(tag)
    ? [...el.childNodes].filter((f) => f.nodeType !== 3 || (f.nodeValue ?? '').trim() !== '')
    : [...el.childNodes];
  const filhos = soltos.map((f, i) => converter(f, `${chave}.${i}`)).filter((f) => f !== null);

  // Tag desconhecida (um `<font>`, um `<section>`): desembrulha e mantém o texto de dentro.
  if (!(tag in CLASSES)) return filhos.length > 0 ? <span key={chave}>{filhos}</span> : null;

  const props: Record<string, unknown> = { key: chave, ...propsDe(el, tag) };
  if (CLASSES[tag]) props.className = CLASSES[tag];
  // `img` sem src seguro não tem o que mostrar.
  if (tag === 'img' && !props.src) return null;
  // Link recusado vira texto comum: azul e sublinhado sem destino é promessa falsa de clique.
  if (tag === 'a' && !props.href) return <span key={chave}>{filhos}</span>;
  if (VAZIAS.has(tag)) return createElement(tag, props);
  return createElement(tag, props, filhos);
}

/** Texto cru (artigos antigos): quebra em parágrafos. O React escapa tudo por construção. */
function TextoCru({ texto }: { texto: string }) {
  const blocos = texto.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <>
      {blocos.map((bloco, i) => (
        <p key={i} className={CLASSES.p}>
          {bloco.split('\n').map((linha, j, todas) => (
            <span key={j}>
              {linha}
              {j < todas.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}

export function WikiConteudo({ conteudo }: { conteudo: string }) {
  const texto = conteudo ?? '';
  // Mesma regra do `legacyPlainTextToHtml` do portal: sem "<", é texto cru.
  if (!texto.includes('<')) return <TextoCru texto={texto} />;

  const doc = new DOMParser().parseFromString(`<body>${texto}</body>`, 'text/html');
  return <>{[...doc.body.childNodes].map((n, i) => converter(n, String(i))).filter((n) => n !== null)}</>;
}
