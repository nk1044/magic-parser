---
title: Config file
---

# Config file

magic-parser looks for a config file in the Markdown file's folder, then in each parent folder, and uses the first one it finds:

```
mdp.config.yaml   mdp.config.yml   mdp.config.json   .mdprc   .mdprc.json   .mdprc.yaml
```

Pass `-c path/to/config.yaml` to choose one, or `--no-config` to ignore them.

## Start from the defaults

```bash
mdp init                 # writes mdp.config.yaml listing every option
mdp init --format json   # or mdp.config.json
```

## Example

This is `examples/mdp.config.yaml` in the repository. It gives a dark, ruled-notebook look:

```yaml
page:
  style: lined
  mode: dark
  gridSize: 28px
  width: 720px
font:
  size: 18px
features:
  toc: true
pdf:
  format: Letter
  margin: 20mm 18mm
```

## All options

```yaml
output:
  format: html           # html | pdf
  file: null             # output path (default: next to the input)
  selfContained: true    # inline images & math fonts
  open: false            # open the result when done
page:
  style: grid            # plain | lined | grid | dotted
  mode: light            # light | dark | auto
  color: null            # page background
  textColor: null
  accentColor: null      # links, checkboxes, active sidebar item
  lineColor: null        # grid / line / dot color
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
  typographer: true
  linkify: true
  breaks: false
  anchors: true          # heading ids + hover permalinks
  toc: false
  tocDepth: 3
  themeToggle: true
  copyButtons: true
pdf:
  format: A4
  margin: 18mm
  landscape: false
  pageNumbers: true
  browserPath: null
meta:
  title: null
  lang: en
  description: null
css: null                # extra stylesheet appended after the theme
```

## Custom CSS

`css` points at a stylesheet that is added after the built-in theme, so it can override anything:

```css
/* custom.css */
:root { --accent: #3D7AB8; }
h1 { letter-spacing: -0.03em; }
```

```bash
mdp notes.md --css custom.css
```
