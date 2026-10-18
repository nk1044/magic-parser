import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import footnote from 'markdown-it-footnote';
import deflist from 'markdown-it-deflist';
import { full as emoji } from 'markdown-it-emoji';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import mark from 'markdown-it-mark';
import ins from 'markdown-it-ins';
import abbr from 'markdown-it-abbr';
import container from 'markdown-it-container';
import taskLists from 'markdown-it-task-lists';
import githubAlerts from 'markdown-it-github-alerts';
import katexPluginModule from '@vscode/markdown-it-katex';
import hljs from 'highlight.js';

const katexPlugin = katexPluginModule.default ?? katexPluginModule;

const ADMONITIONS = ['note', 'tip', 'info', 'important', 'warning', 'caution', 'danger', 'success'];

export function slugify(s) {
  return encodeURIComponent(
    String(s)
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-'),
  );
}

/** Build a configured markdown-it instance. */
export function createMarkdown(config) {
  const f = config.features;

  const md = new MarkdownIt({
    html: f.html,
    linkify: f.linkify,
    typographer: f.typographer,
    breaks: f.breaks,
    highlight: (code, lang) => highlight(md, code, lang, f),
  });

  md.use(footnote)
    .use(deflist)
    .use(sub)
    .use(sup)
    .use(mark)
    .use(ins)
    .use(abbr)
    .use(taskLists, { enabled: false, label: true, labelAfter: true })
    .use(githubAlerts);

  if (f.emoji) md.use(emoji);
  if (f.math) md.use(katexPlugin, { throwOnError: false, output: 'htmlAndMathml' });
  if (f.anchors) {
    md.use(anchor, {
      slugify,
      tabIndex: false,
      permalink: anchor.permalink.linkInsideHeader({ symbol: '#', placement: 'after', ariaHidden: true }),
    });
  }

  // ::: note Optional title   /   ::: details Summary text
  for (const name of ADMONITIONS) {
    md.use(container, name, {
      render(tokens, idx) {
        const t = tokens[idx];
        if (t.nesting !== 1) return '</div>\n';
        const title = t.info.trim().slice(name.length).trim() || name[0].toUpperCase() + name.slice(1);
        return `<div class="admonition admonition-${name}"><p class="admonition-title">${md.utils.escapeHtml(title)}</p>\n`;
      },
    });
  }
  md.use(container, 'details', {
    render(tokens, idx) {
      const t = tokens[idx];
      if (t.nesting !== 1) return '</div></details>\n';
      const summary = t.info.trim().slice('details'.length).trim() || 'Details';
      return `<details class="details"><summary>${md.utils.escapeHtml(summary)}</summary><div class="details-body">\n`;
    },
  });

  // Wide tables scroll horizontally instead of breaking the layout.
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';

  // External links open in a new tab.
  const defaultLinkOpen = md.renderer.rules.link_open ?? ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') ?? '';
    if (/^https?:\/\//i.test(href)) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  return md;
}

function highlight(md, code, lang, f) {
  const language = (lang || '').trim().split(/\s+/)[0].toLowerCase();
  const esc = md.utils.escapeHtml;
  if (language === 'mermaid' && f.mermaid) {
    return `<pre class="mermaid">${esc(code)}</pre>`;
  }
  const label = language ? `<span class="code-lang">${esc(language)}</span>` : '';
  let body = esc(code);
  if (f.highlight && language && hljs.getLanguage(language)) {
    try {
      body = hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      /* keep escaped source */
    }
  }
  // Returning a string that starts with <pre tells markdown-it to use it verbatim.
  return `<pre class="code-block" data-lang="${esc(language)}">${label}<code class="hljs${language ? ` language-${esc(language)}` : ''}">${body}</code></pre>`;
}

/** Collect headings (after anchor ids are assigned) for the table of contents. */
function collectHeadings(tokens, md) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'heading_open') continue;
    const inline = tokens[i + 1];
    const text = inline.children
      .filter((c) => c.type === 'text' || c.type === 'code_inline' || c.type === 'emoji')
      .map((c) => (c.type === 'emoji' ? '' : c.content))
      .join('')
      .trim();
    out.push({ level: Number(t.tag.slice(1)), id: t.attrGet('id'), text: md.utils.escapeHtml(text) });
  }
  return out;
}

function renderToc(headings, depth) {
  const items = headings.filter((h) => h.level >= 2 && h.level <= depth && h.id);
  if (!items.length) return '';
  let html = '<nav class="toc" aria-label="Table of contents"><p class="toc-title">Contents</p>';
  const base = Math.min(...items.map((h) => h.level));
  let level = base - 1;
  for (const h of items) {
    if (h.level > level) html += '<ul>'.repeat(h.level - level);
    else if (h.level < level) html += '</li></ul>'.repeat(level - h.level) + '</li>';
    else html += '</li>';
    html += `<li><a href="#${h.id}">${h.text}</a>`;
    level = h.level;
  }
  html += '</li></ul>'.repeat(level - base + 1) + '</nav>';
  return html;
}

/**
 * Render a markdown string.
 * @returns {{ html: string, headings: object[], hasMath: boolean, hasMermaid: boolean }}
 */
export function renderMarkdown(src, config) {
  const md = createMarkdown(config);
  const env = {};
  const tokens = md.parse(src, env);
  const headings = collectHeadings(tokens, md);
  let html = md.renderer.render(tokens, md.options, env);

  const toc = renderToc(headings, config.features.tocDepth);
  const marker = /<p>\s*\[\[_?toc_?\]\]\s*<\/p>/gi;
  if (marker.test(html)) html = html.replace(marker, toc);
  else if (config.features.toc && toc) {
    // Place it under a leading title heading, otherwise at the very top.
    const leadingH1 = html.match(/^\s*<h1[\s>][\s\S]*?<\/h1>\n?/);
    html = leadingH1 ? leadingH1[0] + toc + html.slice(leadingH1[0].length) : toc + html;
  }

  return {
    html,
    headings,
    hasMath: html.includes('class="katex'),
    hasMermaid: html.includes('class="mermaid"'),
  };
}
