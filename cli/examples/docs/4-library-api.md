---
title: Library API
---

# Library API

Everything the CLI does is available from Node.js:

```js
import { convertFile, renderToHtml, buildSite } from 'magic-parser';
```

## `convertFile(input, options)`

Markdown file to an HTML or PDF file, using the same config layers as the CLI.

```js
const { output, title, warnings } = await convertFile('notes.md', {
  format: 'pdf',                                    // 'html' (default) or 'pdf'
  output: 'out/notes.pdf',                          // default: next to the input
  config: { page: { style: 'lined', mode: 'dark' } },
});
```

## `renderToHtml(markdown, options)`

A Markdown string to a complete HTML page, in memory. Front matter works, and relative image paths resolve against `baseDir`.

```js
const { html, title } = renderToHtml('# Hello\n\nSome $E = mc^2$ math.', {
  config: { page: { style: 'dotted' } },
  baseDir: process.cwd(),
});
```

## `buildSite(folder, options)`

A folder of Markdown to a multi-page site with a sidebar, as `mdp docs/` does.

```js
const site = buildSite('docs', {
  outDir: 'public',
  title: 'Acme docs',                 // sidebar heading; default: the folder name
  cli: { page: { mode: 'auto' } },    // config overrides, like CLI flags
  onPage: ({ src, output }) => console.log(src, '→', output),
});

site.index;     // public/index.html
site.pages;     // [{ src, output, title }, …]
site.warnings;  // e.g. images that weren't found
```

## Lower-level pieces

`loadDocument`, `parseDocument`, `renderDocument`, `resolveConfig` and `DEFAULTS` are exported too, for finer control:

```js
import { loadDocument, renderDocument } from 'magic-parser';

const doc = loadDocument('notes.md', { cli: { features: { toc: true } } });
const { html, hasMath, hasMermaid } = renderDocument(doc, { imageMode: 'embed', outDir: '.' });
```
