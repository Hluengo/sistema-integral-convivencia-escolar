---
name: gortex-11-dirs
description: "Work in the . +11 dirs area — 93 symbols across 17 files (67% cohesion)"
---

# . +11 dirs

93 symbols | 17 files | 67% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `plugins/storage/index.ts`
- `server/api/routes/draft.ts`
- `server/api/routes/processDisciplinaryPdf.ts`
- `src/features/anotaciones/AnotacionesStudentDetailModal/hooks/pdfReviewLogic.ts`
- `src/features/anotaciones/AnotacionesStudentTable.tsx`
- `src/features/anotaciones/NewDisciplinaryProcessModal/StudentSelectStep.tsx`
- `src/features/anotaciones/NewDisciplinaryProcessModal/constants.tsx`
- `src/features/anotaciones/annotationStudentFilters.ts`
- `src/features/causas/ClosedCases.tsx`
- `src/features/command-palette/CommandPalette.tsx`
- `src/features/document-templates/TemplateEditor.tsx`
- `src/shared/api/lib/supabaseRetry.ts`
- `src/shared/lib/data.test.ts`
- `src/shared/lib/data.ts`
- `src/shared/lib/domain/investigationChecklist.test.ts`
- `vite.config.ts`

## Key Files

| File                                                                             | Symbols                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ``                                                                               | includes, toLowerCase                                                                                   |
| `plugins/storage/index.ts`                                                       | carpeta, archivo, validarRuta, tenantId                                                                 |
| `server/api/routes/draft.ts`                                                     | message, message, value, getGeminiDraftErrorStatus, getGeminiDraftErrorMessage, ...                     |
| `server/api/routes/processDisciplinaryPdf.ts`                                    | error, getProcessErrorResponse, message                                                                 |
| `src/features/anotaciones/AnotacionesStudentDetailModal/hooks/pdfReviewLogic.ts` | recommendation, detectedNegativeCount, nameConflict, currentDocType, suggestedLetterType, ...           |
| `src/features/anotaciones/AnotacionesStudentTable.tsx`                           | selectedCourseId, cartaStatuses, activeFilter, q, filtered, ...                                         |
| `src/features/anotaciones/NewDisciplinaryProcessModal/StudentSelectStep.tsx`     | StudentSelectStep, filtered, search, searched, setSearch                                                |
| `src/features/anotaciones/NewDisciplinaryProcessModal/constants.tsx`             | status, statusStyle                                                                                     |
| `src/features/anotaciones/annotationStudentFilters.ts`                           | matchesCartaStatusFilter, CourseFilterStudent, student, CartaStatusFilterStudent, selectedCourseId, ... |
| `src/features/causas/ClosedCases.tsx`                                            | ClosedCases, setSearchQuery, setSortBy, filteredCausas, closedCausas, ...                               |
| `src/features/command-palette/CommandPalette.tsx`                                | e, isOpen, handleQueryChange, focusTimerRef, handler, ...                                               |
| `src/features/document-templates/TemplateEditor.tsx`                             | failureCount, error, templatesQuery.retry                                                               |
| `src/shared/api/lib/supabaseRetry.ts`                                            | message, error, isTransientNetworkError                                                                 |
| `src/shared/lib/data.test.ts`                                                    | completedChecklist, completedIds                                                                        |
| `src/shared/lib/data.ts`                                                         | getBaseChecklist                                                                                        |
| `src/shared/lib/domain/investigationChecklist.test.ts`                           | completedChecklist, completedIds                                                                        |
| `vite.config.ts`                                                                 | id, output.manualChunks                                                                                 |

## Entry Points

- `src/features/command-palette/CommandPalette.tsx::CommandPalette`
- `src/features/causas/ClosedCases.tsx::ClosedCases`

## Connected Communities

- **features/timeline +28 dirs** (18 cross-edges)
- **api/services +22 dirs** (7 cross-edges)
- **features/anotaciones +1 dirs · resolveStudentCartaTableState** (3 cross-edges)
- **widgets/header +5 dirs** (2 cross-edges)
- **. +2 dirs · buildDashboardTrendSummary** (1 cross-edges)
- **anotaciones/AnotacionesStudentDetailModal +2 dirs · StudentSummaryTab** (1 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (1 cross-edges)
- **shared/ui +3 dirs** (1 cross-edges)
- **features/anotaciones +5 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-184")
explore(operation:"context", task:"understand . +11 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"src/features/command-palette/CommandPalette.tsx::CommandPalette"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
