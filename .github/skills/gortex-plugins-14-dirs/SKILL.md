---
name: gortex-plugins-14-dirs
description: "Work in the plugins +14 dirs area — 347 symbols across 20 files (85% cohesion)"
---

# plugins +14 dirs

347 symbols | 20 files | 85% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `api/index.js`
- `plugins/auth/index.ts`
- `plugins/db/index.ts`
- `plugins/index.ts`
- `plugins/tipos.ts`
- `server/api/routes/__tests__/institution.handlers.test.ts`
- `server/api/services/caseDocuments.test.ts`
- `server/api/services/gemini.test.ts`
- `server/lib/disciplinaryPdfAnalysis.integration.test.ts`
- `server/lib/disciplinaryPdfAnalysis.ts`
- `src/features/anotaciones/NewDisciplinaryProcessModal/PdfAnalysisComparison.tsx`
- `src/features/anotaciones/NewDisciplinaryProcessModal/analysisComparison.ts`
- `src/features/anotaciones/docgen/DocumentWarnings.tsx`
- `src/features/timeline/hooks/useBreaches.ts`
- `src/shared/api/services/causas.service.test.ts`
- `src/shared/lib/dateUtils.ts`
- `src/shared/lib/hooks/causaPersistence.test.ts`
- `src/shared/lib/hooks/useNotifications.ts`
- `supabase/migrations/00000_remote_schema_baseline.sql`

## Key Files

| File                                                                             | Symbols                                                                                                                          |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ``                                                                               | push, forEach                                                                                                                    |
| `api/index.js`                                                                   | getSuggestedLetter                                                                                                               |
| `plugins/auth/index.ts`                                                          | pluginAuth.init, ctx                                                                                                             |
| `plugins/db/index.ts`                                                            | ctx, pluginDb.init                                                                                                               |
| `plugins/index.ts`                                                               | nombre, resultado, plugin, cargados, contexto, ...                                                                               |
| `plugins/tipos.ts`                                                               | PluginBase, Resultado, ContextoPlugin                                                                                            |
| `server/api/routes/__tests__/institution.handlers.test.ts`                       | value, value, api.insert, value, api.upsert, ...                                                                                 |
| `server/api/services/caseDocuments.test.ts`                                      | pathname, headers, hostname, nextDownload, timeoutMs, ...                                                                        |
| `server/api/services/gemini.test.ts`                                             | headers, nextResponse, hostname, timeoutMs, body, ...                                                                            |
| `server/lib/disciplinaryPdfAnalysis.integration.test.ts`                         | getTextContent, update, _args, in, FakeQueryOptions, ...                                                                         |
| `server/lib/disciplinaryPdfAnalysis.ts`                                          | detectedStudentName, normalizedMatches, recommendedLetterType, supabase, splitAnnotationBlocks, ...                              |
| `src/features/anotaciones/NewDisciplinaryProcessModal/PdfAnalysisComparison.tsx` | previousSummary, variation, total, totalVariation, summary, ...                                                                  |
| `src/features/anotaciones/NewDisciplinaryProcessModal/analysisComparison.ts`     | getAnalysisVariation, current, previous                                                                                          |
| `src/features/anotaciones/docgen/DocumentWarnings.tsx`                           | warnings, DocumentWarnings                                                                                                       |
| `src/features/timeline/hooks/useBreaches.ts`                                     | plazoInvestigacion, hasAcompanamiento, maxPlazoInvestigacionDias, medidas, plazoInformeConcluyente, ...                          |
| `src/shared/api/services/causas.service.test.ts`                                 | result.resultForTable, table, result.resultForTable, table                                                                       |
| `src/shared/lib/dateUtils.ts`                                                    | today, daysElapsedCeil, calendarDifference, remainingProcedureDays, startDate, ...                                               |
| `src/shared/lib/hooks/causaPersistence.test.ts`                                  | operations.updateCausa, operations.updateCausa, operations.saveChecklist, operations.saveBitacora, operations.saveChecklist, ... |
| `src/shared/lib/hooks/useNotifications.ts`                                       | notifications, today, causas, buildNotifications                                                                                 |
| `supabase/migrations/00000_remote_schema_baseline.sql`                           | get_suggested_letter_type                                                                                                        |

## Connected Communities

- **api/services +22 dirs** (25 cross-edges)
- **features/timeline +28 dirs** (22 cross-edges)
- **lib/hooks +8 dirs** (7 cross-edges)
- **. +8 dirs** (4 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (3 cross-edges)
- **. +11 dirs** (3 cross-edges)
- **. +1 dirs · isMediationActive** (2 cross-edges)
- **lib/domain +6 dirs** (2 cross-edges)
- **api/services +2 dirs · runImport** (1 cross-edges)
- **. +4 dirs · padStart** (1 cross-edges)
- **server/lib · selectNewAnnotationsForLegacySy…** (1 cross-edges)
- **scripts +3 dirs** (1 cross-edges)
- **. +4 dirs · uploadDisciplinaryFile** (1 cross-edges)
- **. +2 dirs · buildDashboardTrendSummary** (1 cross-edges)
- **server/lib +4 dirs** (1 cross-edges)
- **. +1 dirs · prepareConfirmedAnnotations** (1 cross-edges)
- **shared/lib · EstadoCausa** (1 cross-edges)
- **api/services +11 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-124")
explore(operation:"context", task:"understand plugins +14 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
