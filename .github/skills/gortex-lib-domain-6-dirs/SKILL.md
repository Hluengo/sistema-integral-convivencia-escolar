---
name: gortex-lib-domain-6-dirs
description: "Work in the lib/domain +6 dirs area — 77 symbols across 8 files (66% cohesion)"
---

# lib/domain +6 dirs

77 symbols | 8 files | 66% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `server/api/routes/platform.ts`
- `src/features/anotaciones/AnotacionesStudentDetailModal/PhysicalCartaRegistrationCard.tsx`
- `src/features/document-templates/TemplateEditor.tsx`
- `src/shared/Skeleton.tsx`
- `src/shared/lib/dateUtils.ts`
- `src/shared/lib/domain/disciplinaryStage.ts`
- `src/shared/lib/domain/investigationChecklist.ts`

## Key Files

| File                                                                                       | Symbols                                                                    |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| ``                                                                                         | has                                                                        |
| `server/api/routes/platform.ts`                                                            | slug, base, client, n, generateUniqueSlug, ...                             |
| `src/features/anotaciones/AnotacionesStudentDetailModal/PhysicalCartaRegistrationCard.tsx` | registeredTypes, setMessage, isRegistering, letterType, event, ...         |
| `src/features/document-templates/TemplateEditor.tsx`                                       | saveSuccess, setEditPrompt, saving, queryClient, templates, ...            |
| `src/shared/Skeleton.tsx`                                                                  | TextBlockSkeleton                                                          |
| `src/shared/lib/dateUtils.ts`                                                              | value, parseDateOnlyAtNoonUtc, value, parsed, getYearFromDateOnly          |
| `src/shared/lib/domain/disciplinaryStage.ts`                                               | cartas, currentYearPhysicalTypes, schoolYear, getPhysicalCartaBaselineType |
| `src/shared/lib/domain/investigationChecklist.ts`                                          | completedIds, checklist, getMediationOutcome                               |

## Entry Points

- `src/features/anotaciones/AnotacionesStudentDetailModal/PhysicalCartaRegistrationCard.tsx::PhysicalCartaRegistrationCard`
- `src/features/document-templates/TemplateEditor.tsx::TemplateEditor`

## Connected Communities

- **features/timeline +28 dirs** (12 cross-edges)
- **lib/hooks +8 dirs** (2 cross-edges)
- **anotaciones/AnotacionesStudentDetailModal +2 dirs · StudentSummaryTab** (2 cross-edges)
- **features/anotaciones +1 dirs · resolveStudentCartaTableState** (2 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (2 cross-edges)
- **lib/hooks +7 dirs · useMemberships** (2 cross-edges)
- **api/services +11 dirs** (2 cross-edges)
- **api/services +22 dirs** (1 cross-edges)
- **. +2 dirs · isLetterAnnotationSummary** (1 cross-edges)
- **. +11 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-162")
explore(operation:"context", task:"understand lib/domain +6 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"src/features/anotaciones/AnotacionesStudentDetailModal/PhysicalCartaRegistrationCard.tsx::PhysicalCartaRegistrationCard"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
