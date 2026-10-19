---
title: Diagrams
---

# Diagrams

Fenced `mermaid` blocks become diagrams. Mermaid is loaded from a CDN only on pages that have one, and diagrams redraw to match when you switch between light and dark.

## Flowchart

````markdown
```mermaid
flowchart LR
  A[Markdown] --> B{magic-parser}
  B -->|HTML| C[Browser]
  B -->|PDF| D[Print]
  B -->|folder| E[Docs site]
```
````

```mermaid
flowchart LR
  A[Markdown] --> B{magic-parser}
  B -->|HTML| C[Browser]
  B -->|PDF| D[Print]
  B -->|folder| E[Docs site]
```

## Sequence diagram

```mermaid
sequenceDiagram
  participant You
  participant CLI as magic-parser
  participant Browser
  You->>CLI: mdp serve notes.md
  CLI->>Browser: open localhost:4321
  You->>CLI: save notes.md
  CLI-->>Browser: reload
```

## Pie chart

```mermaid
pie title Time spent writing docs
  "Writing" : 45
  "Formatting" : 5
  "Arguing about tabs" : 50
```
