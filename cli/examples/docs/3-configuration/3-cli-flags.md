---
title: CLI flags
---

# CLI flags

```
mdp build <input...> [options]       (the default command, so `mdp file.md` works)
                            an input that is a folder builds a multi-page site
  -o, --output <file>       output file (one input), or the site folder
  -d, --out-dir <dir>       output directory (several inputs)
  -f, --format <html|pdf>
  -c, --config <file>       --no-config to skip config files
  -s, --style <plain|lined|grid|dotted>
  -m, --mode <light|dark|auto>
  --page-color --text-color --accent-color --line-color <color>
  --grid-size --width <size>
  --font --heading-font --mono-font <family>   --font-size <size>  --line-height <n>
  --toc  --breaks  --no-math  --no-highlight  --no-html  --no-google-fonts
  --title <t>  --lang <code>  --css <file>
  --no-embed                link local images instead of inlining them
  --open                    open the result
  --pdf-format <size>  --margin <css>  --landscape  --no-page-numbers  --browser <path>
  --set <key=value...>      any config key

mdp serve <input> [-p 4321] [--host localhost] [--no-open] [same styling flags]
mdp init [--format yaml|json] [--force]
mdp config [input] [same flags]       print the resolved config
```

## Any setting with `--set`

Every config key can be set from the command line, even without its own flag:

```bash
mdp notes.md --set page.gridSize=32px features.emoji=false
```

Values are read as JSON where they can be: `true`, `false`, `null`, numbers and `[arrays]`.

## Examples

```bash
mdp notes.md -s lined -m dark --toc                # ruled, dark, with contents
mdp notes.md --accent-color "#4C8A3F" --width 680px
mdp notes.md -f pdf --pdf-format Letter --landscape
mdp docs/ -o public --title "Acme docs" -m auto   # a site that follows the OS theme
```

In a site build, `--title` names the site and appears at the top of the sidebar. Each page keeps its own title.
