---
name: gortex-features-anotaciones-newdisciplinaryprocessmodal
description: "Work in the features/anotaciones · NewDisciplinaryProcessModal area — 73 symbols across 1 files (86% cohesion)"
---

# features/anotaciones · NewDisciplinaryProcessModal

73 symbols | 1 files | 86% cohesion

## When to Use

Use this skill when working on files in:

- `src/features/anotaciones/NewDisciplinaryProcessModal.tsx`

## Key Files

| File                                                       | Symbols                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/features/anotaciones/NewDisciplinaryProcessModal.tsx` | setUploadedFile, goBack, status, existingAnnotationCount, step, ... |

## Entry Points

- `src/features/anotaciones/NewDisciplinaryProcessModal.tsx::NewDisciplinaryProcessModal`

## Connected Communities

- **features/timeline +28 dirs** (4 cross-edges)
- **api/services +11 dirs** (2 cross-edges)
- **api/services +22 dirs** (1 cross-edges)
- **plugins +14 dirs** (1 cross-edges)
- **features/anotaciones · handleAnalyze** (1 cross-edges)
- **lib/hooks +7 dirs · useMemberships** (1 cross-edges)
- **api/services +1 dirs · useStudentPdfDisciplinaryReview** (1 cross-edges)
- **api/services +3 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-168")
explore(operation:"context", task:"understand features/anotaciones · NewDisciplinaryProcessModal", format:"gcx")
relations(operation:"usages", target:{symbol:"src/features/anotaciones/NewDisciplinaryProcessModal.tsx::NewDisciplinaryProcessModal"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
