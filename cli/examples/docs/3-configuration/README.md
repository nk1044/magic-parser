---
title: Configuration
---

# Configuration

Settings come from four layers. Each one overrides the one before it:

1. **Defaults**, built in: grid paper, a cream page, serif type.
2. **[Config file](1-config-file.md)**: `mdp.config.yaml` and the like, found automatically or passed with `-c`.
3. **[Front matter](2-front-matter.md)**: an `mdp:` key at the top of a document.
4. **[CLI flags](3-cli-flags.md)**: for a single build.

To see the result of all four for a file:

```bash
mdp config notes.md
```

In a docs site, each page resolves its own config. Pages share settings through a config file at the top of the folder, and any page can override them in its front matter. This site has one, `examples/docs/mdp.config.yaml`:

```yaml
page:
  mode: auto       # follow the OS; the toggle button still switches
```

See [page styles](4-page-styles.md) for what the paper looks like.
