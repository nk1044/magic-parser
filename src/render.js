import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import matter from 'gray-matter';
import { resolveConfig, merge } from './config.js';
import { renderMarkdown } from './markdown.js';
import { buildCss, buildPdfCss } from './theme.js';

// Resolve KaTeX through the markdown plugin so the CSS always matches the
// KaTeX version that actually renders the math.
const require = createRequire(createRequire(import.meta.url).resolve('@vscode/markdown-it-katex'));

const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let katexCssCache = null;
function katexCss(selfContained) {
  const cssPath = require.resolve('katex/dist/katex.min.css');
  if (!selfContained) {
    const { version } = JSON.parse(fs.readFileSync(path.join(path.dirname(cssPath), '..', 'package.json'), 'utf8'));
    return { link: `https://cdn.jsdelivr.net/npm/katex@${version}/dist/katex.min.css` };
  }
  if (!katexCssCache) {
    const fontsDir = path.join(path.dirname(cssPath), 'fonts');
    // Keep only the woff2 source for each font and inline it.
    katexCssCache = fs
      .readFileSync(cssPath, 'utf8')
      .replace(/src:url\(fonts\/([^)]+?\.woff2)\)\s*format\("woff2"\)[^;}]*/g, (_, file) => {
        const data = fs.readFileSync(path.join(fontsDir, file)).toString('base64');
        return `src:url(data:font/woff2;base64,${data}) format("woff2")`;
      });
  }
  return { inline: katexCssCache };
}

/**
 * Rewrite <img src> for local files.
 *  - "embed": inline as data: URIs (single self-contained file)
 *  - "link":  rewrite the path so it still resolves from `outDir`
 */
function processImages(html, { baseDir, outDir, mode, warn }) {
  return html.replace(/(<img\b[^>]*?\bsrc=)(["'])(.*?)\2/gi, (whole, pre, q, src) => {
    if (!src || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(src)) return whole; // remote, data:, etc.
    let rel;
    try {
      rel = decodeURIComponent(src.split(/[?#]/)[0]);
    } catch {
      rel = src.split(/[?#]/)[0];
    }
    const abs = path.resolve(baseDir, rel);
    if (!fs.existsSync(abs)) {
      warn(`Image not found: ${src}`);
      return whole;
    }
    if (mode === 'embed') {
      const mime = IMAGE_MIME[path.extname(abs).toLowerCase()];
      if (!mime) {
        warn(`Unsupported image type, left as a link: ${src}`);
        return whole;
      }
      const data = fs.readFileSync(abs).toString('base64');
      return `${pre}${q}data:${mime};base64,${data}${q}`;
    }
    const relOut = path.relative(outDir, abs).split(path.sep).map(encodeURIComponent).join('/');
    return `${pre}${q}${relOut}${q}`;
  });
}

function googleFontsLink(families) {
  const list = (Array.isArray(families) ? families : [families]).filter(Boolean);
  if (!list.length) return '';
  const query = list.map((f) => `family=${String(f).trim().replace(/ /g, '+')}`).join('&');
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${escapeHtml(query)}&amp;display=swap">`;
}

const THEME_BOOT = (mode) => `<script>
(function () {
  var d = document.documentElement;
  try { var t = localStorage.getItem('mdp-theme'); if (t === 'light' || t === 'dark') d.setAttribute('data-theme', t); } catch (e) {}
  if (!d.hasAttribute('data-theme') && ${JSON.stringify(mode)} === 'dark') d.setAttribute('data-theme', 'dark');
})();
</script>`;

const UI_SCRIPT = ({ themeToggle, copyButtons }) => `<script>
(function () {
  var d = document.documentElement;
  function isDark() {
    var t = d.getAttribute('data-theme');
    return t ? t === 'dark' : getComputedStyle(d).colorScheme === 'dark';
  }
  window.__mdpIsDark = isDark;
  ${
    themeToggle
      ? `var btn = document.querySelector('.theme-toggle');
  if (btn) btn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    d.setAttribute('data-theme', next);
    try { localStorage.setItem('mdp-theme', next); } catch (e) {}
    document.dispatchEvent(new CustomEvent('mdp:theme', { detail: next }));
  });`
      : ''
  }
  ${
    copyButtons
      ? `document.querySelectorAll('pre.code-block').forEach(function (pre) {
    var b = document.createElement('button');
    b.className = 'copy-btn'; b.type = 'button'; b.textContent = 'Copy';
    b.addEventListener('click', function () {
      var code = pre.querySelector('code');
      navigator.clipboard.writeText(code ? code.innerText : '').then(function () {
        b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1400);
      }, function () { b.textContent = 'Failed'; });
    });
    pre.appendChild(b);
  });`
      : ''
  }
})();
</script>`;

const MERMAID_SCRIPT = `<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
const nodes = [...document.querySelectorAll('pre.mermaid')];
nodes.forEach((n) => (n.dataset.src = n.textContent));
async function draw() {
  nodes.forEach((n) => { n.removeAttribute('data-processed'); n.innerHTML = ''; n.textContent = n.dataset.src; });
  mermaid.initialize({ startOnLoad: false, theme: window.__mdpIsDark && window.__mdpIsDark() ? 'dark' : 'neutral', fontFamily: 'inherit' });
  try { await mermaid.run({ nodes }); } catch (e) { console.error(e); }
  window.__mdpMermaidDone = true;
}
document.addEventListener('mdp:theme', draw);
draw();
</script>`;

const TOGGLE_BUTTON = `<button class="theme-toggle" type="button" aria-label="Toggle dark mode" title="Toggle dark mode">
<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
</button>`;

/**
 * Parse a Markdown file with front matter and resolve its configuration.
 */
export function loadDocument(inputPath, { configPath = null, discover = true, cli = {} } = {}) {
  const abs = path.resolve(inputPath);
  if (!fs.existsSync(abs)) throw new Error(`Input file not found: ${inputPath}`);
  const raw = fs.readFileSync(abs, 'utf8');
  let parsed;
  try {
    parsed = matter(raw);
  } catch (err) {
    throw new Error(`Invalid front matter in ${inputPath}: ${err.message}`);
  }
  const { mdp, title, description, lang, ...rest } = parsed.data ?? {};
  const frontMatter = merge({ meta: { title, description, lang } }, mdp ?? {});
  const resolved = resolveConfig({ configPath, discover, cwd: path.dirname(abs), frontMatter, cli });
  return { path: abs, source: parsed.content, data: rest, ...resolved };
}

/**
 * Render a loaded document into a complete HTML page.
 * @param {object} doc result of loadDocument()
 * @param {object} opts
 * @param {'embed'|'link'} opts.imageMode
 * @param {string} opts.outDir directory the HTML will live in (for relative links)
 * @param {string} [opts.extraHead] injected before </head> (used by the dev server)
 * @param {boolean} [opts.forPdf]
 */
export function renderDocument(doc, { imageMode, outDir, extraHead = '', forPdf = false }) {
  const { config } = doc;
  const warnings = [...doc.warnings];
  const warn = (m) => warnings.push(m);
  const baseDir = path.dirname(doc.path);

  const { html: body0, headings, hasMath, hasMermaid } = renderMarkdown(doc.source, config);
  const body = processImages(body0, { baseDir, outDir, mode: imageMode, warn });

  // heading text is already escaped by the markdown renderer
  const title =
    (config.meta.title != null ? escapeHtml(config.meta.title) : null) ??
    headings.find((h) => h.level === 1)?.text ??
    escapeHtml(path.basename(doc.path, path.extname(doc.path)));

  let customCss = '';
  if (config.css) {
    const cssPath = [path.resolve(config.css), path.resolve(baseDir, config.css)].find((p) => fs.existsSync(p));
    if (cssPath) customCss = fs.readFileSync(cssPath, 'utf8');
    else warn(`Custom CSS file not found: ${config.css}`);
  }

  const head = [];
  head.push(googleFontsLink(config.font.googleFonts));
  if (hasMath) {
    const k = katexCss(config.output.selfContained);
    head.push(k.inline ? `<style>${k.inline}</style>` : `<link rel="stylesheet" href="${k.link}">`);
  }
  head.push(`<style>${buildCss(config)}</style>`);
  if (forPdf) head.push(`<style>${buildPdfCss(config)}</style>`);
  if (customCss) head.push(`<style>/* custom */\n${customCss}</style>`);

  const f = config.features;
  const showToggle = f.themeToggle && !forPdf;
  const initialTheme = config.page.mode === 'dark' ? ' data-theme="dark"' : '';
  const metaDescription = config.meta.description
    ? `<meta name="description" content="${escapeHtml(config.meta.description)}">\n`
    : '';

  const html = `<!doctype html>
<html lang="${escapeHtml(config.meta.lang ?? 'en')}"${initialTheme}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="magic-parser">
${metaDescription}<title>${title}</title>
${forPdf ? '' : THEME_BOOT(config.page.mode)}
${head.filter(Boolean).join('\n')}
${extraHead}
</head>
<body>
${showToggle ? TOGGLE_BUTTON : ''}
<main class="page">
${body}
</main>
${UI_SCRIPT({ themeToggle: showToggle, copyButtons: f.copyButtons && !forPdf })}
${hasMermaid ? MERMAID_SCRIPT : ''}
</body>
</html>
`;
  return { html, title, warnings, hasMermaid, hasMath };
}
