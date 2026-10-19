---
title: Live preview
---

# Live preview

`serve` takes a file or a folder, like `build`:

```bash
mdp serve notes.md            # http://localhost:4321, opens your browser
mdp serve docs/               # the whole folder as a docs site
mdp serve notes.md -p 8080 --no-open
```

For a file, the page reloads every time you save the Markdown file, its config file or its custom CSS, and keeps your scroll position. Images next to the file are served too.

For a folder, the site is rebuilt whenever anything in the folder changes, including new, renamed and deleted files, and the open page reloads. Other files in the folder, such as PDFs or downloads, are served as they are. Nothing is written to the folder: the site is built in a temporary folder that is removed when you stop the server.

All the styling flags work here as well:

```bash
mdp serve notes.md -s dotted -m dark --toc
```

> [!NOTE]
> Every page is rebuilt on each change, which takes well under a second for a site of a few dozen pages.
