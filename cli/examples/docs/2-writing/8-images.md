---
title: Images
---

# Images

```markdown
![The magic-parser pipeline](../../assets/diagram.svg "Pipeline")
```

![The magic-parser pipeline](../../assets/diagram.svg "Pipeline")

Image paths are relative to the Markdown file. Local images (PNG, JPEG, GIF, SVG, WebP, AVIF, BMP and ICO) are embedded in the page, so it doesn't depend on the image files. Remote images (`https://…`) are left as links.

To keep images as separate files instead, link them:

```bash
mdp notes.md --no-embed
```

## Sizing with HTML

Markdown has no syntax for image size. Use an `<img>` tag:

```markdown
<img src="../../assets/diagram.svg" alt="Small pipeline" width="280">
```

<img src="../../assets/diagram.svg" alt="Small pipeline" width="280">
