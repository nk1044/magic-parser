---
title: Code
---

# Code

## Fenced blocks

Name the language after the opening fence. Highlighting covers 190+ languages, each block shows its language, and a copy button appears when you hover over it.

````markdown
```js
const doc = loadDocument('README.md');
console.log(`Rendered ${doc.source.length} chars`);
```
````

```js
const doc = loadDocument('README.md');
console.log(`Rendered ${doc.source.length} chars`);
```

## More languages

```python
from dataclasses import dataclass

@dataclass
class Page:
    style: str = "grid"

    def describe(self) -> str:
        return f"{self.style} page"  # f-string
```

```rust
fn main() {
    let pages = vec!["intro", "guide"];
    println!("{} pages", pages.len());
}
```

```diff
- page: plain
+ page: grid
```

```
A block with no language is shown as plain text.
```

## Inline code

```markdown
Run `npm install` first.
```

Run `npm install` first.

> [!TIP]
> Turn highlighting off with `--no-highlight`, and the copy buttons with `--set features.copyButtons=false`.
