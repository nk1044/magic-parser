---
title: Page styles
---

# Page styles

Four kinds of paper, each in light, dark or auto mode:

| Style | Flag | Looks like |
| :---- | :--- | :--------- |
| Grid | `-s grid` (default) | faint squares, like graph paper |
| Lined | `-s lined` | ruled lines, like a notebook |
| Dotted | `-s dotted` | a dot grid, like a bullet journal |
| Plain | `-s plain` | a clean page |

```bash
mdp notes.md -s dotted -m dark --grid-size 20px
```

`--grid-size` sets the spacing of the lines and dots, and `--line-color` their color.

## Color modes

- `light`: a cream page with dark text (default).
- `dark`: a warm charcoal page.
- `auto`: follows the operating system's setting.

Whatever the mode, the button in the top-right corner switches between light and dark, and the choice is remembered.

## Colors and type

```bash
mdp notes.md \
  --page-color "#FFFFFF" --text-color "#222" --accent-color "#8A5CC2" \
  --font "Georgia, serif" --mono-font "Menlo, monospace" --font-size 18px
```

Body text defaults to Anthropic Serif if it is installed, then Tiempos Text, Source Serif 4 (from Google Fonts) and Georgia.

> [!TIP]
> Try one: [Front matter](2-front-matter.md) is on dotted paper with a blue accent.
