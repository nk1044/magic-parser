---
title: Single files
---

# Single files

Give magic-parser a Markdown file and it writes an HTML page next to it:

```bash
mdp notes.md                 # → notes.html
mdp notes.md -o out/page.html # choose the output path
mdp notes.md --open          # build, then open it in your browser
```

## Self-contained output

The page is one file. Local images are inlined as data URIs, and so are the KaTeX math fonts when the page has math, so you can email it, host it anywhere, or open it offline.

To keep images as separate files instead, link them:

```bash
mdp notes.md --no-embed
```

> [!NOTE]
> Body text uses Source Serif 4 from Google Fonts, which needs a network connection. Pass `--no-google-fonts` for a page that works fully offline. It then falls back to fonts installed on the machine.

## Many files at once

```bash
mdp chapters/*.md -d dist    # one HTML file per input, all in dist/
```

## Dark mode toggle

Every HTML page has a light / dark button in the top-right corner, and the choice is remembered. Turn it off with `--set features.themeToggle=false`.
