import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

/**
 * Default configuration. Every key here can be overridden by (in order of
 * increasing precedence): a config file, the document's front matter (under an
 * `mdp:` key), and CLI flags.
 */
export const DEFAULTS = Object.freeze({
  output: {
    format: 'html', // html | pdf
    file: null, // defaults to <input>.<format>, next to the input
    selfContained: true, // inline local images and math fonts into the HTML
    open: false, // open the result after building
  },
  page: {
    style: 'grid', // plain | lined | grid | dotted
    mode: 'light', // light | dark | auto (follows the OS)
    color: null, // page background; null = theme default (cream / warm charcoal)
    textColor: null,
    accentColor: null,
    lineColor: null, // color of grid / lines / dots; null = barely visible theme default
    gridSize: '24px',
    width: '760px', // max width of the text column
    padding: '64px 32px 96px',
  },
  font: {
    // "Anthropic Serif" is used if installed locally; otherwise falls back
    // through similar serifs to the bundled Google Font below.
    body: '"Anthropic Serif", "Tiempos Text", "Source Serif 4", Georgia, "Times New Roman", serif',
    heading: null, // null = same as body
    mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    size: '17px',
    lineHeight: 1.65,
    // Google Fonts families to load (needs network when viewing). [] to disable.
    googleFonts: ['Source Serif 4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700'],
  },
  features: {
    html: true, // allow inline HTML
    math: true, // $inline$ and $$block$$ via KaTeX
    highlight: true, // syntax highlighting for fenced code
    mermaid: true, // ```mermaid blocks (loads mermaid from a CDN when used)
    emoji: true, // :smile:
    typographer: true, // smart quotes, dashes
    linkify: true, // bare URLs become links
    breaks: false, // single newline => <br>
    anchors: true, // heading ids + hover permalinks
    toc: false, // insert a table of contents at the top ([[toc]] works regardless)
    tocDepth: 3,
    themeToggle: true, // floating light/dark toggle in the HTML output
    copyButtons: true, // copy button on code blocks
  },
  pdf: {
    format: 'A4', // A4 | Letter | Legal | A3 | A5 | Tabloid
    margin: '18mm', // one value or "top right bottom left"
    landscape: false,
    pageNumbers: true,
    browserPath: null, // Chrome / Chromium / Edge / Brave executable; auto-detected if null
  },
  meta: {
    title: null, // defaults to front matter title, then first heading, then file name
    lang: 'en',
    description: null,
  },
  css: null, // path to an extra stylesheet appended after the theme
});

export const ENUMS = {
  'output.format': ['html', 'pdf'],
  'page.style': ['plain', 'lined', 'grid', 'dotted'],
  'page.mode': ['light', 'dark', 'auto'],
  'pdf.format': ['A3', 'A4', 'A5', 'Letter', 'Legal', 'Tabloid'],
};

export const CONFIG_FILENAMES = [
  'mdp.config.yaml',
  'mdp.config.yml',
  'mdp.config.json',
  '.mdprc',
  '.mdprc.json',
  '.mdprc.yaml',
];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep-merge plain objects; arrays and scalars from `src` replace those in `dst`. */
export function merge(dst, src) {
  const out = structuredClone(dst);
  if (!isPlainObject(src)) return out;
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? merge(out[k], v) : structuredClone(v);
  }
  return out;
}

/** Turn a "a.b.c" path + value into a nested object. */
export function fromPath(dotted, value) {
  const keys = dotted.split('.');
  const root = {};
  let cur = root;
  keys.slice(0, -1).forEach((k) => (cur = cur[k] = {}));
  cur[keys.at(-1)] = value;
  return root;
}

/** Coerce a CLI string ("true", "12", "null", "[a,b]") into a JS value. */
export function coerce(raw) {
  if (typeof raw !== 'string') return raw;
  const s = raw.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^[[{]/.test(s)) {
    try {
      return JSON.parse(s);
    } catch {
      /* fall through: treat as string */
    }
  }
  return raw;
}

export function parseConfigText(text, filename = '') {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.json') return JSON.parse(text);
  // YAML is a superset of JSON, so it handles .mdprc in either syntax.
  return yaml.load(text) ?? {};
}

export function loadConfigFile(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`Config file not found: ${file}`);
  let data;
  try {
    data = parseConfigText(fs.readFileSync(abs, 'utf8'), abs);
  } catch (err) {
    throw new Error(`Could not parse config file ${file}: ${err.message}`);
  }
  if (!isPlainObject(data)) throw new Error(`Config file ${file} must contain an object at the top level.`);
  return { path: abs, data };
}

/** Look for a config file in `dir` and its parents, stopping at the filesystem root. */
export function findConfigFile(dir) {
  let cur = path.resolve(dir);
  for (;;) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = path.join(cur, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

function walk(obj, prefix, fn) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) walk(v, key, fn);
    else fn(key, v);
  }
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Validate a merged config; returns a list of human-readable warnings, throws on hard errors. */
export function validate(config) {
  const warnings = [];
  walk(config, '', (key) => {
    // meta.* is free-form (author, date, ... are passed through untouched).
    if (!key.startsWith('meta.') && getPath(DEFAULTS, key) === undefined) {
      warnings.push(`Unknown config key "${key}" (ignored)`);
    }
  });
  for (const [key, allowed] of Object.entries(ENUMS)) {
    const v = getPath(config, key);
    if (v != null && !allowed.includes(v)) {
      throw new Error(`Invalid value for ${key}: "${v}". Expected one of: ${allowed.join(', ')}`);
    }
  }
  return warnings;
}

/**
 * Resolve the final config.
 * @param {object} opts
 * @param {string|null} opts.configPath explicit config file, or null to auto-discover
 * @param {boolean} opts.discover search upward from `cwd` when no explicit path given
 * @param {string} opts.cwd where to start discovery (usually the input file's directory)
 * @param {object} opts.frontMatter `mdp:` block from the document
 * @param {object} opts.cli overrides from command-line flags
 */
export function resolveConfig({ configPath = null, discover = true, cwd = process.cwd(), frontMatter = {}, cli = {} } = {}) {
  let file = null;
  if (configPath) file = loadConfigFile(configPath);
  else if (discover) {
    const found = findConfigFile(cwd);
    if (found) file = loadConfigFile(found);
  }
  let config = merge(DEFAULTS, file?.data ?? {});
  config = merge(config, frontMatter ?? {});
  config = merge(config, cli);
  const warnings = validate(config);
  return { config, configFile: file?.path ?? null, warnings };
}
