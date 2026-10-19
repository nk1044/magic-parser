# magic-parser

Turn any Markdown file into a single self-contained web page or a print-ready PDF, on paper you choose: grid, lined, dotted or plain, in light or dark.

```bash
npx magic-parser notes.md            # → notes.html
npx magic-parser notes.md -f pdf     # → notes.pdf
npx magic-parser serve notes.md      # live preview in the browser
npx magic-parser docs/               # → docs-site/, a docs website with a sidebar
```

**Website:** https://nk1044.github.io/magic-parser/

[![npm](https://img.shields.io/npm/v/magic-parser)](https://www.npmjs.com/package/magic-parser)
![node](https://img.shields.io/node/v/magic-parser)
![license](https://img.shields.io/npm/l/magic-parser)

## Highlights

- **All of modern Markdown.** Headings, nested and task lists, tables, images, inline HTML, footnotes, definition lists, emoji, highlights and sub/superscript.
- **Math, code and diagrams.** KaTeX math, syntax highlighting for 190+ languages, and Mermaid diagrams.
- **Callouts.** GitHub `> [!NOTE]` alerts, `:::` containers and collapsible details.
- **Styled pages.** Faint grid lines on a cream page with serif type by default. Switch to lined, dotted or plain paper, light, dark or auto mode, and your own fonts and colors.
- **One portable file.** Images and math fonts are embedded, so the HTML works offline and can be emailed or hosted.
- **PDFs that bleed to the edge.** The paper pattern covers every page, with page numbers. Uses the Chrome, Edge or Brave you already have, so there's no browser download.
- **Docs sites from a folder.** Point it at a folder and get a multi-page site with a collapsible sidebar that mirrors the folder tree, linkable heading ids, and links between pages that just work.
- **Configurable in layers.** Defaults, then a config file, then front matter, then CLI flags; each overrides the one before.

## Repository layout

```
magic-parser/
├── cli/        the npm package (CLI + library); full docs in cli/README.md
│   ├── bin/        command-line entry (magic-parser / mdp)
│   ├── src/        config, markdown engine, theme, HTML/PDF rendering, dev server
│   └── examples/   showcase.md, a sample config, and an image
└── website/    the showcase site, a single static index.html
```

## Usage

Full option reference: **[cli/README.md](cli/README.md)**.

```bash
npx magic-parser notes.md -s lined -m dark --toc     # style with flags
npx magic-parser notes.md -c mdp.config.yaml         # or a config file
npx magic-parser docs/*.md -d dist                   # many files at once
npx magic-parser docs/ -o public --title "Acme"      # a whole folder as a docs site
npx magic-parser init                                # write a config with all defaults
```

As a library:

```js
import { convertFile, renderToHtml } from 'magic-parser';

await convertFile('notes.md', { format: 'pdf', config: { page: { style: 'dotted' } } });
const { html } = renderToHtml('# Hello $x^2$');
```

## Development

Requires Node 18+.

```bash
cd cli
npm install
node bin/mdp.js examples/showcase.md --open          # build the showcase page
node bin/mdp.js serve examples/showcase.md           # live preview while editing
npm run example:pdf                                  # showcase as PDF
```

The website has no build step: open `website/index.html` in a browser. It is hosted on GitHub Pages from the `gh-pages` branch. To deploy changes, commit them on `master`, then push the `website/` folder to that branch:

```bash
git subtree push --prefix website origin gh-pages
```

## Releasing

```bash
cd cli
npm version patch        # or minor / major
npm publish
```

Check what will ship with `npm pack --dry-run`. Only `bin/`, `src/`, `README.md` and `LICENSE` are included.

## License

MIT. See [cli/LICENSE](cli/LICENSE).
