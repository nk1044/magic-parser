#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Command, Option } from 'commander';
import * as yaml from 'js-yaml';
import { DEFAULTS, ENUMS, merge, fromPath, coerce, resolveConfig } from '../src/config.js';
import { loadDocument, renderDocument } from '../src/render.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

/** CLI option name -> config path. Only options the user actually typed are applied. */
const OPTION_MAP = {
  format: 'output.format',
  embed: 'output.selfContained',
  open: 'output.open',
  style: 'page.style',
  mode: 'page.mode',
  pageColor: 'page.color',
  textColor: 'page.textColor',
  accentColor: 'page.accentColor',
  lineColor: 'page.lineColor',
  gridSize: 'page.gridSize',
  width: 'page.width',
  font: 'font.body',
  headingFont: 'font.heading',
  monoFont: 'font.mono',
  fontSize: 'font.size',
  lineHeight: 'font.lineHeight',
  googleFonts: 'font.googleFonts',
  toc: 'features.toc',
  math: 'features.math',
  highlight: 'features.highlight',
  html: 'features.html',
  breaks: 'features.breaks',
  pdfFormat: 'pdf.format',
  margin: 'pdf.margin',
  landscape: 'pdf.landscape',
  pageNumbers: 'pdf.pageNumbers',
  browser: 'pdf.browserPath',
  title: 'meta.title',
  lang: 'meta.lang',
  css: 'css',
};

function addRenderOptions(cmd) {
  return cmd
    .option('-c, --config <file>', 'config file (JSON or YAML); otherwise mdp.config.{yaml,json} / .mdprc is auto-discovered')
    .option('--no-config', 'ignore config files, use defaults + flags only')
    .addOption(new Option('-s, --style <style>', 'page style').choices(ENUMS['page.style']))
    .addOption(new Option('-m, --mode <mode>', 'color mode').choices(ENUMS['page.mode']))
    .option('--page-color <color>', 'page background color')
    .option('--text-color <color>', 'text color')
    .option('--accent-color <color>', 'link / accent color')
    .option('--line-color <color>', 'grid / ruled line color')
    .option('--grid-size <size>', 'grid / line spacing, e.g. 24px')
    .option('--width <size>', 'max text column width, e.g. 760px')
    .option('--font <family>', 'body font-family stack')
    .option('--heading-font <family>', 'heading font-family stack')
    .option('--mono-font <family>', 'code font-family stack')
    .option('--font-size <size>', 'base font size, e.g. 17px')
    .option('--line-height <n>', 'base line height, e.g. 1.65', Number)
    .option('--no-google-fonts', "don't load web fonts from Google Fonts")
    .option('--toc', 'insert a table of contents at the top')
    .option('--no-math', 'disable $math$ rendering')
    .option('--no-highlight', 'disable syntax highlighting')
    .option('--no-html', 'disallow inline HTML in the markdown')
    .option('--breaks', 'treat single newlines as <br>')
    .option('--title <title>', 'document title')
    .option('--lang <code>', 'document language, e.g. en')
    .option('--css <file>', 'extra stylesheet to append')
    .option('--set <key=value...>', 'set any config key, e.g. --set page.gridSize=32px features.emoji=false')
    .option('-q, --quiet', 'only print errors');
}

/** Build the CLI-override layer from the options the user actually passed. */
function cliOverrides(cmd) {
  const opts = cmd.opts();
  let out = {};
  for (const [name, key] of Object.entries(OPTION_MAP)) {
    if (cmd.getOptionValueSource(name) !== 'cli') continue;
    let value = opts[name];
    if (name === 'googleFonts' && value === false) value = [];
    out = merge(out, fromPath(key, value));
  }
  for (const pair of opts.set ?? []) {
    const i = pair.indexOf('=');
    if (i < 1) throw new Error(`--set expects key=value, got "${pair}"`);
    out = merge(out, fromPath(pair.slice(0, i).trim(), coerce(pair.slice(i + 1))));
  }
  return out;
}

function loadOptions(cmd) {
  const opts = cmd.opts();
  return {
    configPath: typeof opts.config === 'string' ? opts.config : null,
    discover: opts.config !== false,
    cli: cliOverrides(cmd),
  };
}

function openFile(target) {
  const [bin, args] =
    process.platform === 'darwin'
      ? ['open', [target]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', target]]
        : ['xdg-open', [target]];
  spawn(bin, args, { stdio: 'ignore', detached: true }).unref();
}

function outputPathFor(input, config, { output, outDir }, multiple) {
  const ext = config.output.format === 'pdf' ? '.pdf' : '.html';
  if (output) {
    if (multiple) throw new Error('--output can only be used with a single input; use --out-dir instead.');
    return path.resolve(output);
  }
  if (!multiple && config.output.file) return path.resolve(path.dirname(input), config.output.file);
  const dir = outDir ? path.resolve(outDir) : path.dirname(input);
  return path.join(dir, path.basename(input, path.extname(input)) + ext);
}

const isDirectory = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();

/** Build a folder of Markdown into a multi-page site with a sidebar. */
async function buildFolder(input, opts, cmd, load, log, multiple) {
  const started = performance.now();
  if (cmd.getOptionValueSource('format') === 'cli' && opts.format === 'pdf') {
    throw new Error('folders build to an HTML site only; PDF output takes a single file.');
  }
  if (opts.output && multiple) throw new Error('--output can only be used with a single input; use --out-dir instead.');
  const name = path.basename(path.resolve(input));
  const outDir = opts.output
    ? path.resolve(opts.output)
    : opts.outDir
      ? path.resolve(opts.outDir, multiple ? name : '.')
      : path.resolve(`${name}-site`);
  // --title names the site; each page keeps its own title.
  const { meta: { title, ...meta } = {}, ...cli } = load.cli;
  const { buildSite } = await import('../src/site.js');
  const site = buildSite(input, {
    outDir,
    configPath: load.configPath,
    discover: load.discover,
    cli: Object.keys(meta).length ? { ...cli, meta } : cli,
    title,
  });
  for (const w of site.warnings) console.warn(`warning: ${w}`);
  const ms = (performance.now() - started).toFixed(0);
  const count = `${site.pages.length} page${site.pages.length === 1 ? '' : 's'}`;
  log(`✓ ${path.relative(process.cwd(), site.index) || site.index}  (${count}, ${ms} ms)`);
  if (resolveConfig({ ...load, cwd: path.resolve(input) }).config.output.open) openFile(site.index);
}

async function build(inputs, _opts, cmd) {
  const opts = cmd.opts();
  const log = opts.quiet ? () => {} : (m) => console.log(m);
  const load = loadOptions(cmd);
  let failed = 0;

  for (const input of inputs) {
    const started = performance.now();
    try {
      if (isDirectory(input)) {
        await buildFolder(input, opts, cmd, load, log, inputs.length > 1);
        continue;
      }
      const doc = loadDocument(input, load);
      if (doc.configFile) log(`config: ${path.relative(process.cwd(), doc.configFile) || doc.configFile}`);
      const { config } = doc;
      const outFile = outputPathFor(doc.path, config, opts, inputs.length > 1);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });

      const isPdf = config.output.format === 'pdf';
      const result = renderDocument(doc, {
        // PDFs are rendered from an in-memory page, so images must always be embedded.
        imageMode: isPdf || config.output.selfContained ? 'embed' : 'link',
        outDir: path.dirname(outFile),
        forPdf: isPdf,
      });
      for (const w of result.warnings) console.warn(`warning: ${w}`);

      if (isPdf) {
        const { htmlToPdf } = await import('../src/pdf.js');
        await htmlToPdf(result.html, outFile, config, { hasMermaid: result.hasMermaid });
      } else {
        fs.writeFileSync(outFile, result.html);
      }
      const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
      const ms = (performance.now() - started).toFixed(0);
      log(`✓ ${path.relative(process.cwd(), outFile)}  (${kb} KB, ${ms} ms)`);
      if (config.output.open) openFile(outFile);
    } catch (err) {
      failed++;
      console.error(`✗ ${input}: ${err.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

const INIT_TEMPLATE = `# magic-parser config. Any key can also be set with a CLI flag or --set key=value,
# or per-document in front matter under an "mdp:" key.
${yaml.dump(DEFAULTS, { lineWidth: 120, quotingType: '"' })}`;

const program = new Command();
program
  .name('magic-parser')
  .description('Render Markdown into a beautiful self-contained HTML page or PDF.')
  .version(pkg.version);

addRenderOptions(
  program
    .command('build', { isDefault: true })
    .description('render markdown file(s) to HTML or PDF, or a folder to a multi-page HTML site')
    .argument('<input...>', 'markdown file(s), or folder(s) to build as a site')
    .option('-o, --output <file>', 'output file (single input); for a folder, the site directory')
    .option('-d, --out-dir <dir>', 'output directory (multiple inputs)')
    .addOption(new Option('-f, --format <format>', 'output format').choices(ENUMS['output.format']))
    .option('--no-embed', "don't inline local images / fonts; link them instead")
    .option('--open', 'open the result when done')
    .addOption(new Option('--pdf-format <size>', 'PDF paper size').choices(ENUMS['pdf.format']))
    .option('--margin <css>', 'PDF margins, e.g. "18mm" or "20mm 15mm"')
    .option('--landscape', 'landscape PDF')
    .option('--no-page-numbers', 'omit PDF page numbers')
    .option('--browser <path>', 'Chrome / Chromium / Edge / Brave executable for PDF output'),
).action(build);

addRenderOptions(
  program
    .command('serve')
    .alias('preview')
    .description('preview a markdown file in the browser with live reload')
    .argument('<input>', 'markdown file')
    .option('-p, --port <port>', 'port', Number, 4321)
    .option('--host <host>', 'host', 'localhost')
    .option('--no-open', "don't open the browser"),
).action(async (input, opts, cmd) => {
  const { serve } = await import('../src/serve.js');
  const load = loadOptions(cmd);
  const log = opts.quiet ? () => {} : (m) => console.log(m);
  serve(input, {
    port: opts.port,
    host: opts.host,
    ...load,
    log,
    onReady(url) {
      console.log(`Serving ${input} at ${url}  (Ctrl+C to stop)`);
      if (opts.open) openFile(url);
    },
  });
});

program
  .command('init')
  .description('write a config file with all defaults to the current directory')
  .addOption(new Option('--format <format>', 'config file format').choices(['yaml', 'json']).default('yaml'))
  .option('--force', 'overwrite an existing file')
  .action((opts) => {
    const file = opts.format === 'json' ? 'mdp.config.json' : 'mdp.config.yaml';
    if (fs.existsSync(file) && !opts.force) {
      console.error(`${file} already exists (use --force to overwrite)`);
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(file, opts.format === 'json' ? JSON.stringify(DEFAULTS, null, 2) + '\n' : INIT_TEMPLATE);
    console.log(`✓ wrote ${file}`);
  });

addRenderOptions(
  program
    .command('config')
    .description('print the fully resolved config (after file, front matter and flags)')
    .argument('[input]', 'markdown file (to include its front matter)'),
).action((input, _opts, cmd) => {
  const load = loadOptions(cmd);
  if (input) {
    const doc = loadDocument(input, load);
    if (doc.configFile) console.error(`# from ${doc.configFile}`);
    doc.warnings.forEach((w) => console.error(`# warning: ${w}`));
    console.log(yaml.dump(doc.config));
  } else {
    const r = resolveConfig(load);
    if (r.configFile) console.error(`# from ${r.configFile}`);
    r.warnings.forEach((w) => console.error(`# warning: ${w}`));
    console.log(yaml.dump(r.config));
  }
});

program.parseAsync().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
