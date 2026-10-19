---
title: Front matter
description: Per-document settings.
mdp:
  page:
    style: dotted
    accentColor: "#3D7AB8"
---

# Front matter

A YAML block at the top of a document sets its title and description, and any setting under `mdp:`. This page uses one, which is why its paper is dotted and its accent is blue:

```markdown
---
title: Front matter
description: Per-document settings.
mdp:
  page:
    style: dotted
    accentColor: "#3D7AB8"
---
```

| Key | Used for |
| :-- | :------- |
| `title` | the page `<title>` and its sidebar label |
| `description` | the `<meta name="description">` tag |
| `lang` | the page's `lang` attribute |
| `mdp:` | any config key, same shape as the config file |

Front matter overrides the config file, and CLI flags override front matter.
