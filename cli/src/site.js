import fs from 'node:fs';
import path from 'node:path';
import { merge } from './config.js';
import { loadDocument, parseDocument, renderDocument, katexStylesheet, escapeHtml } from './render.js';
import { buildSiteCss } from './theme.js';

const MD_EXT = /\.(?:md|markdown)$/i;
const SKIP_DIRS = new Set(['node_modules']);
const ASSETS_DIR = 'mdp-assets';
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
// Natural order by name without the Markdown extension; on a tie, a .md file comes first.
const byName = (a, b) =>
  collator.compare(a.name.replace(MD_EXT, ''), b.name.replace(MD_EXT, '')) ||
  Number(!/\.md$/i.test(a.name)) - Number(!/\.md$/i.test(b.name)) ||
  collator.compare(a.name, b.name);

/** Relative, URL-encoded href from one output page to another (both posix paths from the site root). */
function relHref(from, to) {
  return path.posix.relative(path.posix.dirname(from), to).split('/').map(encodeURIComponent).join('/');
}

/** A folder's own page: index.md, otherwise README.md. */
function pickIndex(files) {
  for (const name of ['index', 'readme']) {
    const hit = files.find((f) => path.basename(f, path.extname(f)).toLowerCase() === name);
    if (hit) return hit;
  }
  return null;
}

/**
 * Walk `dir` for Markdown files. Returns a tree of folders and pages, keeping
 * only folders that contain Markdown somewhere below them.
 */
function scan(dir, relDir, exclude, warnings) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort(byName);
  const files = entries.filter((e) => e.isFile() && MD_EXT.test(e.name)).map((e) => path.join(dir, e.name));
  const index = pickIndex(files);
  const node = { type: 'dir', name: path.basename(dir), rel: relDir, index: null, children: [] };
  const used = new Set();

  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name) || abs === exclude) continue;
      const child = scan(abs, rel, exclude, warnings);
      if (child.index || child.children.length) node.children.push(child);
    } else if (files.includes(abs)) {
      const base = path.basename(e.name, path.extname(e.name));
      const out = (relDir ? `${relDir}/` : '') + (abs === index ? 'index' : base) + '.html';
      if (used.has(out.toLowerCase())) {
        warnings.push(`${rel}: skipped, another file already becomes ${out}`);
        continue;
      }
      used.add(out.toLowerCase());
      // A folder's index page is named after the folder.
      const page = { type: 'page', src: abs, srcRel: rel, out, name: abs === index ? node.name : base };
      if (abs === index) node.index = page;
      else node.children.push(page);
    }
  }
  return node;
}

/** Pages in sidebar order (depth-first), which is also the prev/next order. */
function flatten(node, out = []) {
  if (node.index) out.push(node.index);
  for (const c of node.children) {
    if (c.type === 'page') out.push(c);
    else flatten(c, out);
  }
  return out;
}

function renderTree(children, current) {
  const items = children.map((c) => {
    if (c.type === 'page') return `<li>${pageLink(c, current)}</li>`;
    // A folder holding only its own index page is just a link.
    if (!c.children.length) return `<li>${pageLink(c.index, current)}</li>`;
    const open = current.startsWith(`${c.rel}/`) ? ' open' : '';
    const label = c.index ? pageLink(c.index, current) : `<span class="nav-label">${escapeHtml(c.name)}</span>`;
    return `<li class="nav-dir"><details${open} data-key="${escapeHtml(c.rel)}"><summary>${label}</summary>${renderTree(c.children, current)}</details></li>`;
  });
  return `<ul>${items.join('')}</ul>`;
}

function pageLink(page, current, label = page.label) {
  const active = page.out === current;
  return `<a class="nav-link${active ? ' active' : ''}" href="${relHref(current, page.out)}"${active ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
}

const SITE_BOOT = `<script>
try { if (localStorage.getItem('mdp-sidebar') === 'closed') document.documentElement.classList.add('sb-collapsed'); } catch (e) {}
</script>`;

const SIDEBAR_SCRIPT = `<script>
(function () {
  var d = document.documentElement, nav = document.getElementById('mdp-sidebar');
  var btn = document.querySelector('.sidebar-toggle'), narrow = matchMedia('(max-width: 900px)');
  function sync() { btn.setAttribute('aria-expanded', String(narrow.matches ? d.classList.contains('sb-open') : !d.classList.contains('sb-collapsed'))); }
  btn.addEventListener('click', function () {
    if (narrow.matches) d.classList.toggle('sb-open');
    else {
      var closed = d.classList.toggle('sb-collapsed');
      try { localStorage.setItem('mdp-sidebar', closed ? 'closed' : 'open'); } catch (e) {}
    }
    sync();
  });
  document.querySelector('.sidebar-backdrop').addEventListener('click', function () { d.classList.remove('sb-open'); sync(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('sb-open')) { d.classList.remove('sb-open'); sync(); } });
  narrow.addEventListener('change', sync);
  sync();

  // Remember which folders were opened or closed while browsing.
  var KEY = 'mdp-sidebar-folders', state = {};
  try { state = JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) {}
  nav.querySelectorAll('details[data-key]').forEach(function (el) {
    var k = el.getAttribute('data-key');
    if (k in state && !el.querySelector('.active')) el.open = state[k];
    el.addEventListener('toggle', function () {
      state[k] = el.open;
      try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    });
  });

  // Keep the sidebar's scroll position across pages; otherwise reveal the current page.
  var y = null;
  try { y = sessionStorage.getItem('mdp-sidebar-scroll'); } catch (e) {}
  if (y !== null) nav.scrollTop = +y;
  else { var a = nav.querySelector('.active'); if (a) a.scrollIntoView({ block: 'center' }); }
  addEventListener('pagehide', function () { try { sessionStorage.setItem('mdp-sidebar-scroll', String(nav.scrollTop)); } catch (e) {} });
})();
</script>`;

const SIDEBAR_BUTTON = `<button class="sidebar-toggle" type="button" aria-controls="mdp-sidebar" aria-label="Toggle sidebar" title="Toggle sidebar">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
</button>`;

function renderSidebar(tree, current, siteTitle) {
  const home = tree.index ? relHref(current, tree.index.out) : 'index.html';
  return `${SIDEBAR_BUTTON}
<div class="sidebar-backdrop"></div>
<nav class="sidebar" id="mdp-sidebar" aria-label="Site">
<a class="sidebar-title" href="${home}">${escapeHtml(siteTitle)}</a>
<div class="nav-tree">${renderTree(tree.children, current)}</div>
</nav>
${SIDEBAR_SCRIPT}
`;
}

function renderPager(prev, next, current) {
  if (!prev && !next) return '';
  const link = (p, cls, label) =>
    p ? `<a class="${cls}" href="${relHref(current, p.out)}"><span>${label}</span>${escapeHtml(p.label)}</a>` : '';
  return `<nav class="pager" aria-label="Pages">${link(prev, 'pager-prev', 'Previous')}${link(next, 'pager-next', 'Next')}</nav>\n`;
}

/** Point links to other Markdown files in the site at their generated pages. */
function rewriteLinks(html, { srcDir, current, outBySrc }) {
  return html.replace(/(<a\b[^>]*?\bhref=)(["'])(.*?)\2/gi, (whole, pre, q, href) => {
    if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return whole;
    const [, file, rest] = href.match(/^([^?#]*)(.*)$/);
    let decoded;
    try {
      decoded = decodeURIComponent(file.replace(/&amp;/g, '&'));
    } catch {
      decoded = file;
    }
    if (!MD_EXT.test(decoded)) return whole;
    const target = outBySrc.get(path.resolve(srcDir, decoded));
    return target ? `${pre}${q}${relHref(current, target)}${rest}${q}` : whole;
  });
}

/** Markdown for a generated home page: the site title and a nested list of every page. */
function landingMarkdown(tree, siteTitle) {
  const esc = (s) => s.replace(/[\\[\]*_`<>]/g, '\\$&');
  const lines = [`# ${esc(siteTitle)}`, ''];
  (function walk(children, depth) {
    for (const c of children) {
      const pad = '  '.repeat(depth);
      if (c.type === 'page') lines.push(`${pad}- [${esc(c.label)}](<${c.srcRel}>)`);
      else {
        lines.push(`${pad}- ${c.index ? `[**${esc(c.index.label)}**](<${c.index.srcRel}>)` : `**${esc(c.name)}**`}`);
        walk(c.children, depth + 1);
      }
    }
  })(tree.children, 0);
  return lines.join('\n') + '\n';
}

/**
 * Build a multi-page HTML site from every Markdown file under `inputDir`.
 * Each page mirrors its source path (a/b.md → a/b.html); a folder's index.md or
 * README.md becomes its index.html. Every page carries the sidebar, so the
 * site works from disk as well as from a web server.
 *
 * @param {string} inputDir
 * @param {object} opts
 * @param {string} opts.outDir
 * @param {string|null} [opts.configPath]
 * @param {boolean} [opts.discover=true]
 * @param {object} [opts.cli] config overrides
 * @param {string} [opts.title] site title (default: the folder name)
 * @param {string} [opts.extraHead] injected before </head> on every page (used by the dev server)
 * @param {(page: object) => void} [opts.onPage] called after each page is written
 * @returns {{ outDir: string, index: string, pages: object[], warnings: string[] }}
 */
export function buildSite(inputDir, { outDir, configPath = null, discover = true, cli = {}, title, extraHead = '', onPage } = {}) {
  const root = path.resolve(inputDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Not a folder: ${inputDir}`);
  const out = path.resolve(outDir);
  const warnings = [];

  const tree = scan(root, '', out, warnings);
  const pages = flatten(tree);
  if (!pages.length) throw new Error(`No Markdown files found in ${inputDir}`);

  const siteTitle = title ?? path.basename(root);
  // Sites are HTML only; per-page titles come from each document, not the site title.
  const pageCli = merge(cli, { output: { format: 'html' } });
  const load = { configPath, discover, cli: pageCli };

  for (const page of pages) {
    page.doc = loadDocument(page.src, load);
    const fallback = page === tree.index ? siteTitle : page.name;
    page.label = page.doc.config.meta.title != null ? String(page.doc.config.meta.title) : fallback;
  }

  let home = null;
  if (!tree.index) {
    home = { type: 'page', src: path.join(root, 'index.md'), out: 'index.html', name: 'index', label: siteTitle };
    home.doc = parseDocument(landingMarkdown(tree, siteTitle), { path: home.src, ...load });
  }

  const outBySrc = new Map(pages.map((p) => [p.src, p.out]));
  const css = buildSiteCss();
  let usesMath = false;

  for (const page of home ? [home, ...pages] : pages) {
    const i = pages.indexOf(page);
    const { doc } = page;
    const outFile = path.join(out, ...page.out.split('/'));
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    const result = renderDocument(doc, {
      imageMode: doc.config.output.selfContained ? 'embed' : 'link',
      outDir: path.dirname(outFile),
      extraHead: SITE_BOOT + extraHead,
      extraCss: css,
      before: renderSidebar(tree, page.out, siteTitle),
      after: i === -1 ? renderPager(null, pages[0], page.out) : renderPager(pages[i - 1] ?? home, pages[i + 1], page.out),
      katexHref: relHref(page.out, `${ASSETS_DIR}/katex.css`),
      transformBody: (html) => rewriteLinks(html, { srcDir: path.dirname(page.src), current: page.out, outBySrc }),
      titleSuffix: page.out === 'index.html' ? '' : ` · ${siteTitle}`,
    });
    usesMath ||= result.hasMath && doc.config.output.selfContained;
    const rel = path.relative(root, page.src) || page.out;
    for (const w of result.warnings) warnings.push(`${rel}: ${w}`);
    fs.writeFileSync(outFile, result.html);
    onPage?.({ src: page.src, output: outFile, title: result.title });
  }

  if (usesMath) {
    fs.mkdirSync(path.join(out, ASSETS_DIR), { recursive: true });
    fs.writeFileSync(path.join(out, ASSETS_DIR, 'katex.css'), katexStylesheet());
  }

  return {
    outDir: out,
    index: path.join(out, 'index.html'),
    pages: pages.map((p) => ({ src: p.src, output: path.join(out, ...p.out.split('/')), title: p.label })),
    warnings,
  };
}
