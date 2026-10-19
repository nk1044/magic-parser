---
title: Documentation sites
---

# Documentation sites

Pass a folder instead of a file and magic-parser builds a multi-page site, like the one you are reading:

```bash
mdp docs/                            # → ./docs-site/index.html
mdp docs/ -o public --title "Acme"   # output folder and site title
```

## How the folder maps to pages

```
docs/                         docs-site/
├── README.md            →    ├── index.html
├── 1-guide/                  ├── 1-guide/
│   ├── README.md        →    │   ├── index.html
│   └── 1-install.md     →    │   └── 1-install.html
└── 2-faq.md             →    └── 2-faq.html
```

- Every `.md` or `.markdown` file becomes an `.html` page at the same path.
- In each folder, `index.md`, or else `README.md`, becomes that folder's `index.html`. Clicking the folder in the sidebar opens it.
- If the top folder has no index page, a home page listing every page is generated.
- Hidden folders and `node_modules` are skipped.

## The sidebar

The sidebar mirrors the folder tree. Folders open and close, and the current page is highlighted. Whether the sidebar is shown, which folders are open and how far it is scrolled all carry over as you move between pages. On a phone it slides in over the page.

Labels come from each page's front-matter `title`, otherwise the file name. A folder takes the title of its index page. Entries are sorted naturally, so `2-…` comes before `10-…`. Number your files to set the order, and give them titles to keep the numbers out of the sidebar:

```markdown
---
title: Installation
---
```

## Links between pages

Link to other Markdown files as you normally would. Links are rewritten to point at the generated pages, and `#section` anchors are kept:

```markdown
See [the code page](../2-writing/4-code.md#fenced-blocks).
```

See [the code page](../2-writing/4-code.md#fenced-blocks).

## Heading anchors

Every heading gets an id, as on any docs site. Hover over a heading and click the `#` beside it to get a link straight to that section. This page has [one for this heading](#heading-anchors). If two headings share a name, the second gets `-1` appended to its id.

## Previous and next

At the bottom of each page are links to the previous and next pages, in sidebar order.

## Hosting

The output is plain static files with the sidebar built into every page, so it works when opened from disk and on any static host, such as GitHub Pages, Netlify or S3.
