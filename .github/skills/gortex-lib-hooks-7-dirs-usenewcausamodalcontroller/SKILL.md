---
name: gortex-lib-hooks-7-dirs-usenewcausamodalcontroller
description: "Work in the lib/hooks +7 dirs · useNewCausaModalController area — 68 symbols across 9 files (60% cohesion)"
---

# lib/hooks +7 dirs · useNewCausaModalController

68 symbols | 9 files | 60% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `src/app/hooks/useNewCausaModalController.tsx`
- `src/features/anotaciones/NewDisciplinaryProcessModal/ReviewStep.tsx`
- `src/features/anotaciones/annotationsExcelExport.ts`
- `src/features/causas/causaOperationalSummary.ts`
- `src/features/dashboard/dashboardTrends.ts`
- `src/shared/lib/domain/investigationChecklist.ts`
- `src/shared/lib/hooks/useNewCausaForm.ts`
- `src/shared/lib/hooks/useStudentsQuery.ts`

## Key Files

| File                                                                  | Symbols                                                                                       |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| ``                                                                    | find                                                                                          |
| `src/app/hooks/useNewCausaModalController.tsx`                        | handleCreateIncident, setShowGroupForm, showCreateForm, selectedCourseId, openCreateForm, ... |
| `src/features/anotaciones/NewDisciplinaryProcessModal/ReviewStep.tsx` | getClassificationLabel, classification                                                        |
| `src/features/anotaciones/annotationsExcelExport.ts`                  | scope, getAnnotationExportLabel                                                               |
| `src/features/causas/causaOperationalSummary.ts`                      | nextItem, currentItem, currentIndex, nextInvestigationItem, getNextChecklistItem, ...         |
| `src/features/dashboard/dashboardTrends.ts`                           | chileParts, monthPart, parts, yearPart, formatter, ...                                        |
| `src/shared/lib/domain/investigationChecklist.ts`                     | getApplicableChecklistItems, phase, activeIds, causa                                          |
| `src/shared/lib/hooks/useNewCausaForm.ts`                             | openCreateForm, setStudent, setValue, reset, useNewCausaForm, ...                             |
| `src/shared/lib/hooks/useStudentsQuery.ts`                            | isAuthenticated, courseId, useStudentsQuery, tenantId                                         |

## Connected Communities

- **lib/hooks +7 dirs · useMemberships** (3 cross-edges)
- **api/services +22 dirs** (3 cross-edges)
- **features/timeline +28 dirs** (2 cross-edges)
- **app/components +6 dirs** (1 cross-edges)
- **lib/domain +6 dirs** (1 cross-edges)
- **lib/domain · getApplicableInvestigationItemI…** (1 cross-edges)
- **lib/domain · getInvestigationChecklistModel** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-147")
explore(operation:"context", task:"understand lib/hooks +7 dirs · useNewCausaModalController", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
