# magic-parser (`mdp`)

Render Markdown into a single self-contained HTML page or a PDF, on paper you can style: grid, lined, dotted or plain, in light, dark or auto mode.

```bash
mdp notes.md                      # → notes.html (grid paper, cream page, serif)
mdp notes.md -f pdf               # → notes.pdf
mdp serve notes.md                # live-reloading preview in your browser
```

## Install

```bash
npm install
npm link            # makes `mdp` available globally (or use: node bin/mdp.js)
```

Requires Node 18+. PDF output uses a Chromium-based browser that's already installed (Chrome, Chromium, Edge, Brave, Arc or Vivaldi) and finds it automatically.

## What it renders

Everything in CommonMark + GFM, plus the common extensions:

| | |
|---|---|
| Headings, paragraphs, emphasis, links, images | `#`, `*em*`, `**strong**`, `[a](b)`, `![a](b)` |
| Lists, nested lists, task lists | `- [x] done` |
| Tables (with alignment) | `\| :--- \| ---: \|` |
| Code blocks with syntax highlighting (190+ languages) | ` ```js ` |
| Math (KaTeX) | `$inline$`, `$$display$$` |
| Mermaid diagrams | ` ```mermaid ` |
| GitHub alerts | `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` |
| Callout containers / collapsibles | `::: warning Title` … `:::`, `::: details Summary` |
| Footnotes | `text[^1]` / `[^1]: note` |
| Definition lists, abbreviations | `Term\n: definition`, `*[HTML]: …` |
| Highlight, insert, sub/superscript, strikethrough | `==mark==`, `++ins++`, `H~2~O`, `x^2^`, `~~del~~` |
| Emoji shortcodes | `:rocket:` |
| Inline / block HTML | `<kbd>`, `<details>`, `<div align="center">` … |
| Front matter | YAML `---` block (`title`, `description`, `lang`, `mdp:` overrides) |
| Table of contents | `[[toc]]` anywhere, or `--toc` |

See [examples/showcase.md](examples/showcase.md) for all of it on one page.

## Configuration

Settings come from four layers. Each one overrides the one before it:

1. **Defaults**, built in
2. **Config file**: `-c path/to/file`, or the first `mdp.config.yaml` / `mdp.config.yml` / `mdp.config.json` / `.mdprc` found by searching upward from the Markdown file (`--no-config` turns this off)
3. **Front matter**: an `mdp:` key in the document
4. **CLI flags**

Run `mdp init` to write a config file containing every option with its default, or `mdp config notes.md` to print the final merged config.

```yaml
output:
  format: html           # html | pdf
  file: null             # output path (default: next to the input)
  selfContained: true    # inline images & math fonts into the HTML
  open: false            # open the result when done
page:
  style: grid            # plain | lined | grid | dotted
  mode: light            # light | dark | auto (follows the OS)
  color: null            # page background (null = cream #FAF9F5 / charcoal #262624)
  textColor: null
  accentColor: null      # links, checkboxes (null = clay #C96442)
  lineColor: null        # grid / line / dot color (null = barely visible)
  gridSize: 24px
  width: 760px           # text column width
  padding: 64px 32px 96px
font:
  body: '"Anthropic Serif", "Tiempos Text", "Source Serif 4", Georgia, serif'
  heading: null          # null = same as body
  mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace'
  size: 17px
  lineHeight: 1.65
  googleFonts: ["Source Serif 4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700"]
features:
  html: true
  math: true
  highlight: true
  mermaid: true
  emoji: true
  typographer: true      # smart quotes and dashes
  linkify: true
  breaks: false          # single newline => <br>
  anchors: true          # heading ids + hover permalinks
  toc: false
  tocDepth: 3
  themeToggle: true      # floating light/dark button (HTML only)
  copyButtons: true      # copy button on code blocks (HTML only)
pdf:
  format: A4             # A3 | A4 | A5 | Letter | Legal | Tabloid
  margin: 18mm           # CSS shorthand: "18mm" or "20mm 15mm" …
  landscape: false
  pageNumbers: true
  browserPath: null      # auto-detected; or set MDP_BROWSER
meta:
  title: null            # default: front-matter title → first H1 → file name
  lang: en
  description: null
css: null                # extra stylesheet appended after the theme
```

Per-document overrides in front matter:

```markdown
---
title: Meeting notes
mdp:
  page: { style: lined, mode: dark }
  features: { toc: true }
---
```

### CLI flags

```
mdp build <input...> [options]       (the default command, so `mdp file.md` works)
  -o, --output <file>       output file (one input)
  -d, --out-dir <dir>       output directory (several inputs)
  -f, --format <html|pdf>
  -c, --config <file>       --no-config to skip config files
  -s, --style <plain|lined|grid|dotted>
  -m, --mode <light|dark|auto>
  --page-color --text-color --accent-color --line-color <color>
  --grid-size --width <size>
  --font --heading-font --mono-font <family>   --font-size <size>  --line-height <n>
  --toc  --breaks  --no-math  --no-highlight  --no-html  --no-google-fonts
  --title <t>  --lang <code>  --css <file>
  --no-embed                link local images instead of inlining them
  --open                    open the result
  --pdf-format <size>  --margin <css>  --landscape  --no-page-numbers  --browser <path>
  --set <key=value...>      any config key, e.g. --set page.gridSize=32px features.emoji=false

mdp serve <input> [-p 4321] [--host localhost] [--no-open] [same styling flags]
mdp init [--format yaml|json] [--force]
mdp config [input] [same flags]       print the resolved config
```

## Notes

- **Fonts.** Anthropic Serif, the typeface on claude.ai, isn't publicly licensed, so the font stack uses it only if it's installed on your machine. Otherwise it falls back to Tiempos Text, then Source Serif 4 (loaded from Google Fonts, so it needs a network connection), then Georgia. Pass `--no-google-fonts` for a fully offline file.
- **Self-contained output.** Local images are inlined as data URIs, and so are the KaTeX math fonts when the document contains math. Mermaid is loaded from jsDelivr only for documents that contain a diagram.
- **PDF backgrounds.** The paper pattern runs to the edge of every page. Margins are rebuilt as padding that repeats on each page, so they work with any `pdf.margin` value.
