---
title: Getting started
---

# Getting started

magic-parser needs Node 18 or newer. There is nothing to install globally. Run it with `npx`:

```bash
npx magic-parser notes.md
```

Or add it to a project and use the short `mdp` name:

```bash
npm install --save-dev magic-parser
npx mdp notes.md
```

## What you can build

| Input | Command | Output |
| :---- | :------ | :----- |
| One file | `mdp notes.md` | `notes.html`, a single self-contained page |
| One file | `mdp notes.md -f pdf` | `notes.pdf`, print-ready |
| Many files | `mdp docs/*.md -d dist` | one page per file in `dist/` |
| A folder | `mdp docs/` | `docs-site/`, a multi-page site with a sidebar |

The next pages walk through each of these:

1. [Single files](1-single-files.md)
2. [PDF output](2-pdf.md)
3. [Documentation sites](3-docs-sites.md)
4. [Live preview](4-live-preview.md)
