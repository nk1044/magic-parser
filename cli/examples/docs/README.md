---
title: magic-parser docs
description: An example documentation site built from a folder of Markdown with magic-parser.
---

# magic-parser docs

This whole site was built from a folder of Markdown files with one command:

```bash
npx magic-parser examples/docs -o examples/out/docs --title "magic-parser docs"
```

Each page covers one feature. It shows the Markdown you write and, right below, what it renders to. Use the sidebar to move around. The button in the top-left corner hides it, and the folders in it open and close.

> [!TIP]
> This site is itself an example of the folder feature. Its sidebar mirrors the `examples/docs` folder, and the order comes from the numeric prefixes on file names (`1-…`, `2-…`).

## Where to start

- [Getting started](1-getting-started/README.md): install, then build a file, a PDF or a site.
- [Writing](2-writing/README.md): every Markdown feature, one page each.
- [Configuration](3-configuration/README.md): config files, front matter, flags and page styles.
- [Library API](4-library-api.md): call magic-parser from Node.js.
