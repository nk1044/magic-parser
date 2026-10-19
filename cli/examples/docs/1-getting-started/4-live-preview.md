---
title: Live preview
---

# Live preview

```bash
mdp serve notes.md            # http://localhost:4321, opens your browser
mdp serve notes.md -p 8080 --no-open
```

The page reloads every time you save the Markdown file, its config file or its custom CSS, and keeps your scroll position. Images next to the file are served too.

All the styling flags work here as well:

```bash
mdp serve notes.md -s dotted -m dark --toc
```

> [!NOTE]
> `serve` previews one file at a time.
