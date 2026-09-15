---
name: gortex-docs-viewertext
description: "Work in the docs · viewerText area — 340 symbols across 1 files (98% cohesion)"
---

# docs · viewerText

340 symbols | 1 files | 98% cohesion

## When to Use

Use this skill when working on files in:

- `docs/arquitectura-runtime.html`

## Key Files

| File                             | Symbols                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `docs/arquitectura-runtime.html` | release, publishOwner, viewerText, showResult, render, ... |

## Entry Points

- `docs/arquitectura-runtime.html#script:5452::placeRelationshipLens`
- `docs/arquitectura-runtime.html#script:5452::render_L7288`
- `docs/arquitectura-runtime.html#script:5452::layoutLegendEntry`
- `docs/arquitectura-runtime.html#script:5452::syncNow`
- `docs/arquitectura-runtime.html#script:5452::installRelationshipHitTargets`

## Connected Communities

- **docs · apply** (7 cross-edges)
- **docs · chooseRadarPlacement** (3 cross-edges)
- **docs · syncChapterPreview** (2 cross-edges)
- **docs · relationshipTokenGeometry** (2 cross-edges)
- **docs · clamp** (2 cross-edges)
- **docs · storyStep** (1 cross-edges)
- **docs · measure** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-66")
explore(operation:"context", task:"understand docs · viewerText", format:"gcx")
relations(operation:"usages", target:{symbol:"docs/arquitectura-runtime.html#script:5452::placeRelationshipLens"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
