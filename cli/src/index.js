import fs from 'node:fs';
import path from 'node:path';
import { DEFAULTS, resolveConfig, merge } from './config.js';
import { loadDocument, parseDocument, renderDocument } from './render.js';

export { DEFAULTS, resolveConfig, loadDocument, parseDocument, renderDocument };

/**
 * Convert a Markdown file to HTML or PDF on disk.
 *
 *   await convertFile('notes.md', { format: 'pdf', config: { page: { style: 'lined' } } });
 *
 * @param {string} input path to the Markdown file
 * @param {object} [options]
 * @param {string} [options.output] output path (default: next to the input)
 * @param {'html'|'pdf'} [options.format]
 * @param {object} [options.config] config overrides (same shape as the config file)
 * @param {string|null} [options.configPath] explicit config file
 * @param {boolean} [options.discover=true] look for mdp.config.* near the input
 * @returns {Promise<{ output: string, title: string, warnings: string[] }>}
 */
export async function convertFile(input, { output, format, config = {}, configPath = null, discover = true } = {}) {
  const cli = format ? merge(config, { output: { format } }) : config;
  const doc = loadDocument(input, { configPath, discover, cli });
  const isPdf = doc.config.output.format === 'pdf';
  const outFile = path.resolve(
    output ?? path.join(path.dirname(doc.path), path.basename(doc.path, path.extname(doc.path)) + (isPdf ? '.pdf' : '.html')),
  );
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  const result = renderDocument(doc, {
    imageMode: isPdf || doc.config.output.selfContained ? 'embed' : 'link',
    outDir: path.dirname(outFile),
    forPdf: isPdf,
  });
  if (isPdf) {
    const { htmlToPdf } = await import('./pdf.js');
    await htmlToPdf(result.html, outFile, doc.config, { hasMermaid: result.hasMermaid });
  } else {
    fs.writeFileSync(outFile, result.html);
  }
  return { output: outFile, title: result.title, warnings: result.warnings };
}

/**
 * Render a Markdown string to a complete HTML page (no files touched).
 * Relative image paths are resolved against `baseDir`.
 *
 * @param {string} markdown
 * @param {object} [options]
 * @param {object} [options.config] config overrides
 * @param {string} [options.baseDir=process.cwd()]
 * @returns {{ html: string, title: string, warnings: string[] }}
 */
export function renderToHtml(markdown, { config = {}, baseDir = process.cwd() } = {}) {
  const doc = parseDocument(markdown, { path: path.join(path.resolve(baseDir), 'document.md'), discover: false, cli: config });
  const { html, title, warnings } = renderDocument(doc, { imageMode: 'embed', outDir: baseDir });
  return { html, title, warnings };
}
