---
title: PDF output
---

# PDF output

```bash
mdp notes.md -f pdf
mdp notes.md -f pdf --pdf-format Letter --margin "20mm 15mm" --landscape
```

The PDF uses the Chromium-based browser you already have (Chrome, Chromium, Edge, Brave, Arc or Vivaldi), so nothing is downloaded. If it isn't found, point at it:

```bash
mdp notes.md -f pdf --browser "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# or: export MDP_BROWSER=/path/to/chrome
```

## Paper that bleeds to the edge

The grid, lines or dots run to the edge of every page. Margins are rebuilt as padding that repeats on each page, and page numbers sit in a footer strip (`--no-page-numbers` removes them).

| Option | Flag | Default |
| :----- | :--- | :------ |
| Paper size | `--pdf-format` | `A4` |
| Margins | `--margin` | `18mm` |
| Orientation | `--landscape` | portrait |
| Page numbers | `--no-page-numbers` | on |

> [!IMPORTANT]
> PDFs take one file at a time. A folder always builds to an HTML site.
