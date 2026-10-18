/**
 * Builds the stylesheet for a rendered document from the resolved config.
 * Colors are CSS custom properties so light/dark/auto and the in-page toggle
 * all work from one stylesheet.
 */

const PALETTES = {
  light: {
    page: '#FAF9F5', // Claude-style warm ivory
    text: '#2B2A27',
    heading: '#141413',
    muted: '#6E6C66',
    accent: '#C96442', // clay
    line: 'rgba(31, 30, 29, 0.055)', // grid / ruled lines: barely there
    dot: 'rgba(31, 30, 29, 0.17)',
    border: 'rgba(31, 30, 29, 0.12)',
    surface: '#F2F0E8',
    codeBg: 'rgba(31, 30, 29, 0.05)',
    mark: 'rgba(232, 180, 90, 0.35)',
    // syntax
    synKeyword: '#A0472C',
    synString: '#4F7A3A',
    synNumber: '#9A5B13',
    synComment: '#8C8A82',
    synFunc: '#2F5F8A',
    synType: '#7A4F9A',
    synAttr: '#8A6A1F',
  },
  dark: {
    page: '#262624',
    text: '#E3E1D8',
    heading: '#F5F4EE',
    muted: '#A19F96',
    accent: '#D97757',
    line: 'rgba(240, 238, 230, 0.045)',
    dot: 'rgba(240, 238, 230, 0.13)',
    border: 'rgba(240, 238, 230, 0.12)',
    surface: '#1E1E1C',
    codeBg: 'rgba(240, 238, 230, 0.07)',
    mark: 'rgba(217, 160, 70, 0.32)',
    synKeyword: '#E8906F',
    synString: '#A3C98A',
    synNumber: '#E3B467',
    synComment: '#8A887F',
    synFunc: '#8FB8E0',
    synType: '#C9A3E6',
    synAttr: '#D9C27A',
  },
};

function vars(p, page) {
  const v = {
    '--page': page.color ?? p.page,
    '--text': page.textColor ?? p.text,
    '--heading': page.textColor ?? p.heading,
    '--muted': p.muted,
    '--accent': page.accentColor ?? p.accent,
    '--line': page.lineColor ?? p.line,
    '--dot': page.lineColor ?? p.dot,
    '--border': p.border,
    '--surface': p.surface,
    '--code-bg': p.codeBg,
    '--mark': p.mark,
    '--syn-keyword': p.synKeyword,
    '--syn-string': p.synString,
    '--syn-number': p.synNumber,
    '--syn-comment': p.synComment,
    '--syn-func': p.synFunc,
    '--syn-type': p.synType,
    '--syn-attr': p.synAttr,
  };
  return Object.entries(v)
    .map(([k, val]) => `  ${k}: ${val};`)
    .join('\n');
}

function patternCss(style) {
  switch (style) {
    case 'grid':
      return `background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: var(--grid) var(--grid);`;
    case 'lined':
      return `background-image: linear-gradient(var(--line) 1px, transparent 1px);
  background-size: 100% var(--grid);`;
    case 'dotted':
      return `background-image: radial-gradient(circle, var(--dot) 1px, transparent 1.3px);
  background-size: var(--grid) var(--grid);`;
    default:
      return 'background-image: none;';
  }
}

/** Footer strip (for page numbers) kept as a real page margin in PDFs. */
export const PDF_FOOTER_HEIGHT = '10mm';

/** Resolved colors for the document's mode (auto prints as light). */
export function resolvedColors(config) {
  const p = config.page.mode === 'dark' ? PALETTES.dark : PALETTES.light;
  return { page: config.page.color ?? p.page, muted: p.muted };
}

/**
 * PDF layout: zero page margins so the paper pattern bleeds to the edges, with
 * the configured margins recreated as padding that repeats on every page.
 */
export function buildPdfCss(config) {
  const [top, right = top, bottom = top, left = right] = String(config.pdf.margin).trim().split(/\s+/);
  const footer = config.pdf.pageNumbers ? PDF_FOOTER_HEIGHT : '0mm';
  return `
@page { margin: 0 0 ${footer} 0; background-color: ${resolvedColors(config).page}; }
@media print {
  .page {
    padding: ${top} ${right} max(4mm, calc(${bottom} - ${footer})) ${left};
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
}
`;
}

export function buildCss(config) {
  const { page, font } = config;
  const light = vars(PALETTES.light, page);
  const dark = vars(PALETTES.dark, page);
  const headingFont = font.heading ?? font.body;

  return `
:root {
  color-scheme: light;
${light}
  --grid: ${page.gridSize};
  --width: ${page.width};
  --font-body: ${font.body};
  --font-heading: ${headingFont};
  --font-mono: ${font.mono};
}
:root[data-theme="dark"] {
  color-scheme: dark;
${dark}
}
${
  page.mode === 'auto'
    ? `@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${dark.replace(/^/gm, '  ')}
  }
}`
    : ''
}

*, *::before, *::after { box-sizing: border-box; }

html {
  background-color: var(--page);
  ${patternCss(page.style)}
  background-position: -1px -1px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  scroll-padding-top: 24px;
}

body {
  margin: 0;
  color: var(--text);
  font-family: var(--font-body);
  font-size: ${font.size};
  line-height: ${font.lineHeight};
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  font-kerning: normal;
  hanging-punctuation: first;
}

.page {
  max-width: var(--width);
  margin: 0 auto;
  padding: ${page.padding};
  overflow-wrap: break-word;
}
@media (max-width: 640px) {
  .page { padding: 40px 16px 72px; }
  body { font-size: calc(${font.size} * 0.95); }
}

/* ---------- Headings ---------- */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--heading);
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 2em 0 0.6em;
  text-wrap: balance;
  position: relative;
}
h1 { font-size: 2.25em; margin-top: 0.4em; letter-spacing: -0.02em; }
h2 { font-size: 1.6em; }
h3 { font-size: 1.3em; }
h4 { font-size: 1.1em; }
h5 { font-size: 1em; }
h6 { font-size: 0.9em; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.page > :first-child { margin-top: 0; }

.header-anchor {
  margin-left: 0.35em;
  color: var(--muted);
  text-decoration: none;
  opacity: 0;
  font-weight: 400;
  transition: opacity .15s;
}
:is(h1, h2, h3, h4, h5, h6):hover .header-anchor,
.header-anchor:focus-visible { opacity: .6; }

/* ---------- Text ---------- */
p, ul, ol, dl, blockquote, pre, table, figure, details, .table-wrap, .admonition, .markdown-alert {
  margin: 0 0 1.1em;
}
a { color: var(--accent); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.18em; }
a:hover { text-decoration-thickness: 2px; }
strong { font-weight: 650; color: var(--heading); }
mark { background: var(--mark); color: inherit; padding: 0.05em 0.2em; border-radius: 3px; }
ins { text-decoration-color: var(--accent); }
del, s { color: var(--muted); }
abbr[title] { text-decoration: underline dotted; cursor: help; }
:is(h1, h2, h3, h4, h5, h6) abbr[title] { text-decoration: none; }
small { font-size: 0.85em; }
sub, sup { font-size: 0.75em; line-height: 0; }
kbd {
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: 0.1em 0.45em;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 5px;
  background: var(--surface);
}
hr {
  border: 0;
  height: 1px;
  background: var(--border);
  margin: 2.5em 0;
}

/* ---------- Lists ---------- */
ul, ol { padding-left: 1.6em; }
li { margin: 0.25em 0; }
li > ul, li > ol { margin: 0.25em 0; }
li::marker { color: var(--muted); }
ul.contains-task-list { list-style: none; padding-left: 0.4em; }
ul.contains-task-list ul.contains-task-list { padding-left: 1.6em; }
.task-list-item { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 0.55em; }
.task-list-item > ul { flex-basis: 100%; }
.task-list-item-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 1em; height: 1em;
  margin: 0;
  border: 1.5px solid var(--muted);
  border-radius: 4px;
  background: transparent center / 80% no-repeat;
  transform: translateY(0.14em);
  flex-shrink: 0;
  opacity: 1;
}
.task-list-item-checkbox:checked {
  background-color: var(--accent);
  border-color: var(--accent);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.task-list-item:has(> .task-list-item-checkbox:checked) > label { color: var(--muted); text-decoration: line-through; text-decoration-color: var(--border); }
dt { font-weight: 650; color: var(--heading); }
dd { margin: 0 0 0.6em 1.4em; }

/* ---------- Blockquote ---------- */
blockquote {
  margin-left: 0;
  padding: 0.1em 0 0.1em 1.2em;
  border-left: 3px solid var(--border);
  color: var(--muted);
  font-style: italic;
}
blockquote > :last-child { margin-bottom: 0; }

/* ---------- Code ---------- */
code, kbd, samp, pre { font-family: var(--font-mono); }
:not(pre) > code {
  font-size: 0.84em;
  background: var(--code-bg);
  padding: 0.12em 0.38em;
  border-radius: 5px;
}
pre.code-block {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1em 1.15em;
  overflow-x: auto;
  font-size: 0.8em;
  line-height: 1.6;
  tab-size: 2;
}
pre.code-block > code { background: none; padding: 0; }
pre.code-block:has(.code-lang) { padding-top: 2em; }
.code-lang {
  position: absolute;
  top: 0.55em;
  left: 1.15em;
  font-size: 0.78em;
  color: var(--muted);
  text-transform: lowercase;
  letter-spacing: 0.03em;
  user-select: none;
}
.copy-btn {
  position: absolute;
  top: 0.45em;
  right: 0.5em;
  font: 500 11px/1 system-ui, sans-serif;
  color: var(--muted);
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s;
}
pre.code-block:hover .copy-btn, .copy-btn:focus-visible { opacity: 1; }
@media (hover: none) { .copy-btn { opacity: 1; } }

.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-built_in.hljs-keyword, .hljs-meta .hljs-keyword { color: var(--syn-keyword); }
.hljs-string, .hljs-regexp, .hljs-addition, .hljs-template-tag, .hljs-symbol, .hljs-bullet { color: var(--syn-string); }
.hljs-number, .hljs-variable.constant_, .hljs-meta { color: var(--syn-number); }
.hljs-comment, .hljs-quote { color: var(--syn-comment); font-style: italic; }
.hljs-title, .hljs-title.function_, .hljs-section, .hljs-name { color: var(--syn-func); }
.hljs-type, .hljs-title.class_, .hljs-built_in, .hljs-class .hljs-title { color: var(--syn-type); }
.hljs-attr, .hljs-attribute, .hljs-property, .hljs-selector-class, .hljs-selector-id, .hljs-variable, .hljs-params { color: var(--syn-attr); }
.hljs-deletion { color: var(--syn-keyword); }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }

pre.mermaid {
  background: transparent;
  text-align: center;
  font-family: var(--font-body);
}

/* ---------- Tables ---------- */
.table-wrap { overflow-x: auto; }
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.92em;
  font-variant-numeric: tabular-nums;
  margin: 0;
}
th, td {
  padding: 0.55em 0.9em;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}
th {
  font-weight: 650;
  color: var(--heading);
  border-bottom: 1.5px solid var(--text);
  white-space: nowrap;
}
tbody tr:last-child td { border-bottom: 0; }
td[style*="right"], th[style*="right"] { text-align: right; }

/* ---------- Media ---------- */
img, video, svg, canvas, iframe { max-width: 100%; }
img { height: auto; border-radius: 6px; }
p > img:only-child { display: block; margin: 1.6em auto; }
figure { margin-left: 0; margin-right: 0; }
figcaption { color: var(--muted); font-size: 0.88em; text-align: center; margin-top: 0.5em; }

/* ---------- Math ---------- */
.katex { font-size: 1.08em; }
.katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.4em 0; margin: 0 0 1.1em; }

/* ---------- Callouts: GitHub alerts (> [!NOTE]) and ::: containers ---------- */
.markdown-alert, .admonition {
  --c: var(--accent);
  padding: 0.75em 1.1em;
  border-left: 3px solid var(--c);
  background: color-mix(in srgb, var(--c) 7%, transparent);
  border-radius: 0 8px 8px 0;
}
.markdown-alert > :last-child, .admonition > :last-child { margin-bottom: 0; }
.markdown-alert-title, .admonition-title {
  display: flex;
  align-items: center;
  gap: 0.45em;
  font-weight: 650;
  color: var(--c);
  margin-bottom: 0.35em;
}
.markdown-alert-title svg { fill: currentColor; }
.markdown-alert-note, .admonition-note, .admonition-info { --c: #3D7AB8; }
.markdown-alert-tip, .admonition-tip, .admonition-success { --c: #4C8A3F; }
.markdown-alert-important, .admonition-important { --c: #8A5CC2; }
.markdown-alert-warning, .admonition-warning { --c: #B9831A; }
.markdown-alert-caution, .admonition-caution, .admonition-danger { --c: #C24A3A; }

details.details {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6em 1em;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
}
details.details > summary { cursor: pointer; font-weight: 600; color: var(--heading); }
details.details[open] > summary { margin-bottom: 0.6em; }
.details-body > :last-child { margin-bottom: 0; }

/* ---------- Footnotes ---------- */
.footnotes-sep { margin: 3em 0 1.2em; }
.footnotes { font-size: 0.88em; color: var(--muted); }
.footnote-ref a, .footnote-backref { text-decoration: none; }

/* ---------- Table of contents ---------- */
.toc {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.9em 1.3em 0.6em;
  margin: 0 0 2em;
  background: color-mix(in srgb, var(--page) 80%, transparent);
  font-size: 0.93em;
}
.toc-title { font-weight: 650; color: var(--heading); margin: 0 0 0.4em; }
.toc ul { list-style: none; padding-left: 1.1em; margin: 0; }
.toc > ul { padding-left: 0; margin-bottom: 0.4em; }
.toc a { color: var(--text); text-decoration: none; }
.toc a:hover { color: var(--accent); }

/* ---------- Document UI ---------- */
.theme-toggle {
  position: fixed;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--page);
  color: var(--muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 10;
}
.theme-toggle:hover { color: var(--heading); }
.theme-toggle svg { width: 17px; height: 17px; }
.theme-toggle .sun { display: none; }
:root[data-theme="dark"] .theme-toggle .sun { display: block; }
:root[data-theme="dark"] .theme-toggle .moon { display: none; }
${
  page.mode === 'auto'
    ? `@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .theme-toggle .sun { display: block; }
  :root:not([data-theme="light"]) .theme-toggle .moon { display: none; }
}`
    : ''
}

::selection { background: color-mix(in srgb, var(--accent) 25%, transparent); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- Print / PDF ---------- */
@media print {
  .theme-toggle, .copy-btn, .header-anchor { display: none !important; }
  .page { max-width: none; padding: 0; }
  h1, h2, h3, h4, h5, h6 { break-after: avoid; }
  pre, blockquote, table, figure, img, .katex-display, .admonition, .markdown-alert, tr { break-inside: avoid; }
  pre.code-block { white-space: pre-wrap; overflow: visible; }
  .table-wrap { overflow: visible; }
  a { text-decoration: none; }
  details.details > :not(summary) { display: block; }
}
`;
}
