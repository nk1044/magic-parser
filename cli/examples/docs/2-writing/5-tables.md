---
title: Tables
---

# Tables

## Alignment

Colons in the separator row set the alignment of each column:

```markdown
| Plan  | Seats | Price |
| :---- | :---: | ----: |
| Solo  |   1   |    $0 |
| Team  |  10   |   $40 |
| Scale |  100  |  $300 |
```

| Plan  | Seats | Price |
| :---- | :---: | ----: |
| Solo  |   1   |    $0 |
| Team  |  10   |   $40 |
| Scale |  100  |  $300 |

Numbers line up because the table uses tabular figures.

## Wide tables

A table wider than the page scrolls sideways instead of breaking the layout:

| Option | CLI flag | Config key | Default | Applies to | Notes |
| :----- | :------- | :--------- | :------ | :--------- | :---- |
| Page style | `--style` | `page.style` | `grid` | HTML and PDF | `plain`, `lined`, `grid` or `dotted` |
| Color mode | `--mode` | `page.mode` | `light` | HTML and PDF | `auto` follows the operating system |
| Grid size | `--grid-size` | `page.gridSize` | `24px` | HTML and PDF | spacing of the lines or dots |
| Paper size | `--pdf-format` | `pdf.format` | `A4` | PDF only | A3, A4, A5, Letter, Legal, Tabloid |
