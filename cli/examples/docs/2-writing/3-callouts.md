---
title: Callouts
---

# Callouts

## GitHub alerts

The same syntax GitHub uses. There are five kinds:

```markdown
> [!NOTE]
> Useful information.

> [!TIP]
> A helpful suggestion.

> [!IMPORTANT]
> Something people need to know.

> [!WARNING]
> Needs attention right away.

> [!CAUTION]
> Could cause problems.
```

> [!NOTE]
> Useful information.

> [!TIP]
> A helpful suggestion.

> [!IMPORTANT]
> Something people need to know.

> [!WARNING]
> Needs attention right away.

> [!CAUTION]
> Could cause problems.

## Containers

Fenced `:::` blocks, with an optional title. Kinds: `note`, `tip`, `info`, `important`, `warning`, `caution`, `danger` and `success`.

```markdown
::: success All tests passed
Containers can hold **any** Markdown, including lists:

- one
- two
:::

::: danger
Without a title, the kind is used as the title.
:::
```

::: success All tests passed
Containers can hold **any** Markdown, including lists:

- one
- two
:::

::: danger
Without a title, the kind is used as the title.
:::

## Collapsible details

```markdown
::: details Click to expand
Hidden until you open it, with **formatting** and `code`.
:::
```

::: details Click to expand
Hidden until you open it, with **formatting** and `code`.
:::

PDFs print the contents of every details block, open or not.
