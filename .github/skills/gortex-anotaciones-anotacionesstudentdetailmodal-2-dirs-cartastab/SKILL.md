---
name: gortex-anotaciones-anotacionesstudentdetailmodal-2-dirs-cartastab
description: "Work in the anotaciones/AnotacionesStudentDetailModal +2 dirs · CartasTab area — 63 symbols across 3 files (75% cohesion)"
---

# anotaciones/AnotacionesStudentDetailModal +2 dirs · CartasTab

63 symbols | 3 files | 75% cohesion

## When to Use

Use this skill when working on files in:

- `src/features/anotaciones/AnotacionesStudentDetailModal/CartasTab.tsx`
- `src/shared/api/services/cartas.service.ts`
- `src/shared/ui/TextInputDialog.tsx`

## Key Files

| File                                                                   | Symbols                                                                                 |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/features/anotaciones/AnotacionesStudentDetailModal/CartasTab.tsx` | setIsInterviewDialogOpen, schoolYear, isArchiveDialogOpen, sessionUser, localCarta, ... |
| `src/shared/api/services/cartas.service.ts`                            | carta, resolveCartaWorkflowStatus, CartaWorkflowStatus                                  |
| `src/shared/ui/TextInputDialog.tsx`                                    | TextInputDialog, setValue, inputId, handleSubmit, value                                 |

## Entry Points

- `src/features/anotaciones/AnotacionesStudentDetailModal/CartasTab.tsx::CartasTab`

## Connected Communities

- **anotaciones/AnotacionesStudentDetailModal +1 dirs · runCartaAction** (4 cross-edges)
- **features/anotaciones +1 dirs · resolveStudentCartaTableState** (4 cross-edges)
- **anotaciones/AnotacionesStudentDetailModal +2 dirs · getOutstandingLetterType** (2 cross-edges)
- **lib/hooks +7 dirs · useMemberships** (2 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (2 cross-edges)
- **anotaciones/AnotacionesStudentDetailModal +2 dirs · StudentSummaryTab** (1 cross-edges)
- **api/services +22 dirs** (1 cross-edges)
- **. +1 dirs · isMediationActive** (1 cross-edges)
- **api/services +11 dirs** (1 cross-edges)
- **anotaciones/AnotacionesStudentDetailModal · ensureCarta** (1 cross-edges)
- **lib/domain +6 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-245")
explore(operation:"context", task:"understand anotaciones/AnotacionesStudentDetailModal +2 dirs · CartasTab", format:"gcx")
relations(operation:"usages", target:{symbol:"src/features/anotaciones/AnotacionesStudentDetailModal/CartasTab.tsx::CartasTab"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
