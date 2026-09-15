---
name: gortex-docgen-components-3-dirs
description: "Work in the docgen/components +3 dirs area — 77 symbols across 5 files (88% cohesion)"
---

# docgen/components +3 dirs

77 symbols | 5 files | 88% cohesion

## When to Use

Use this skill when working on files in:

- `src/features/anotaciones/AnotacionesDocumentGenerator.tsx`
- `src/features/anotaciones/docgen/components/ExportError.tsx`
- `src/features/anotaciones/docgen/components/GeneratorHeader.tsx`
- `src/features/anotaciones/docgen/hooks/useDocumentState.ts`
- `src/shared/lib/anotacionesUtils.ts`

## Key Files

| File                                                             | Symbols                                                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/features/anotaciones/AnotacionesDocumentGenerator.tsx`      | handlePrintDoc, printMessage, printFileName, negativeCount, handlePrintDoc, ...                    |
| `src/features/anotaciones/docgen/components/ExportError.tsx`     | ExportError                                                                                        |
| `src/features/anotaciones/docgen/components/GeneratorHeader.tsx` | GeneratorHeader                                                                                    |
| `src/features/anotaciones/docgen/hooks/useDocumentState.ts`      | setAuthorizedDuplicate, setAuthorizedBypass, resetLetterContent, setLetterContent, setDocType, ... |
| `src/shared/lib/anotacionesUtils.ts`                             | getSemaphoricStyle, count, SemaphoricStyle, getCurrentDateStr                                      |

## Entry Points

- `src/features/anotaciones/AnotacionesDocumentGenerator.tsx::AnotacionesDocumentGenerator`

## Connected Communities

- **api/services +22 dirs** (3 cross-edges)
- **features/timeline +28 dirs** (3 cross-edges)
- **. +2 dirs · isLetterAnnotationSummary** (2 cross-edges)
- **api/services +2 dirs · runImport** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-158")
explore(operation:"context", task:"understand docgen/components +3 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"src/features/anotaciones/AnotacionesDocumentGenerator.tsx::AnotacionesDocumentGenerator"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
