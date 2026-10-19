---
title: Footnotes & HTML
mdp:
  features:
    toc: true
---

# Footnotes & HTML

This page turns on a table of contents in its front matter (`features.toc: true`). It is the box above this paragraph.

## Footnotes

```markdown
A claim that needs a source.[^1] Labels can be words too.[^note]

[^1]: Footnotes are collected at the end of the page.
[^note]: They can hold **formatting**.
```

A claim that needs a source.[^1] Labels can be words too.[^note]

[^1]: Footnotes are collected at the end of the page.
[^note]: They can hold **formatting**.

## Inline HTML

Raw HTML passes through. Markdown inside an HTML block works when it is separated by blank lines.

```markdown
<div align="center">
  <p>Raw <strong>HTML</strong>, with <sup>sup</sup> and <sub>sub</sub>.</p>
</div>

<details>
<summary>Native &lt;details&gt;</summary>

Markdown *inside* HTML.

</details>
```

<div align="center">
  <p>Raw <strong>HTML</strong>, with <sup>sup</sup> and <sub>sub</sub>.</p>
</div>

<details>
<summary>Native &lt;details&gt;</summary>

Markdown *inside* HTML.

</details>

Pass `--no-html` to disallow it, for example when rendering Markdown you didn't write.

## Table of contents

Put `[[toc]]` on a line by itself where the contents should go, or pass `--toc` to add it at the top. `features.tocDepth` sets the deepest heading level included (default 3).
