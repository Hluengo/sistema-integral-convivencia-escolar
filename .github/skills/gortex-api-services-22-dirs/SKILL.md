---
name: gortex-api-services-22-dirs
description: "Work in the api/services +22 dirs area — 366 symbols across 37 files (76% cohesion)"
---

# api/services +22 dirs

366 symbols | 37 files | 76% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `server/api/lib/https.ts`
- `server/api/routes/advisor.ts`
- `server/api/routes/draft.ts`
- `server/api/routes/institution.ts`
- `server/api/routes/platform.ts`
- `server/api/services/cache.ts`
- `server/api/services/caseDocuments.test.ts`
- `server/api/services/caseDocuments.ts`
- `server/api/services/excelImport.ts`
- `server/api/services/legalSources.ts`
- `server/lib/disciplinaryPdfAnalysis.ts`
- `server/lib/validators.ts`
- `src/features/ai-advisor/AdvisorMessage.tsx`
- `src/features/ai-advisor/AiAdvisor.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/annotationDisplay.ts`
- `src/features/causas/EditCausaModal/EditCausaModalForm.tsx`
- `src/features/causas/ForceCloseCausaDialog.tsx`
- `src/features/causas/forceCloseCausa.ts`
- `src/features/causas/notificacionDocgen/builders.ts`
- `src/features/causas/ui/NewIncidenteModal.tsx`
- `src/features/dashboard/DashboardStats.tsx`
- `src/features/platform/PlatformView.tsx`
- `src/features/timeline/MarkdownRenderer.tsx`
- `src/lib/causaFactory.ts`
- `src/lib/markdownUtils.tsx`
- `src/reglamentoData.ts`
- `src/shared/api/services/disciplinary-storage.service.ts`
- `src/shared/api/services/incidentes.service.ts`
- `src/shared/lib/anotacionesUtils.ts`
- `src/shared/lib/domain/checklistReconciliation.ts`
- `src/shared/lib/hooks/useBitacoraLog.ts`
- `src/shared/lib/schemas/newCausaForm.ts`
- `src/shared/lib/stores/uiStore.ts`
- `src/shared/lib/types.ts`
- `src/shared/ui/TextInputDialog.tsx`
- `vite.config.ts`

## Key Files

| File                                                                          | Symbols                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ``                                                                            | dirname, node:path, charCodeAt, match, pop, ...                                            |
| `server/api/lib/https.ts`                                                     | hostname, httpsGetBuffer, timeoutMs, maxBytes, pathname, ...                               |
| `server/api/routes/advisor.ts`                                                | AdvisorMessage, item, content, normalized, record, ...                                     |
| `server/api/routes/draft.ts`                                                  | value, displayDocumentName, lastPart                                                       |
| `server/api/routes/institution.ts`                                            | safeDocumentName, cleaned, name, parseLevels, value                                        |
| `server/api/routes/platform.ts`                                               | name, slugify                                                                              |
| `server/api/services/cache.ts`                                                | key, getFromCache, entry                                                                   |
| `server/api/services/caseDocuments.test.ts`                                   | centralOffset, fileName, xml, makeDocxBuffer, content, ...                                 |
| `server/api/services/caseDocuments.ts`                                        | path, extractCaseDocuments, encodedPath, storagePathname, commentLength, ...               |
| `server/api/services/excelImport.ts`                                          | value, cleaned, value, normalizeLevel, key, ...                                            |
| `server/api/services/legalSources.ts`                                         | terms, sources, candidates, terms, headerLength, ...                                       |
| `server/lib/disciplinaryPdfAnalysis.ts`                                       | assertStoragePathAllowed, text, courseMatch, block, value, ...                             |
| `server/lib/validators.ts`                                                    | text, redacted, sanitizeForAI, knownValues, value, ...                                     |
| `src/features/ai-advisor/AdvisorMessage.tsx`                                  | MessageContent, renderBoldText, text, lines                                                |
| `src/features/ai-advisor/AiAdvisor.tsx`                                       | session, e, messages, body, contentType, ...                                               |
| `src/features/anotaciones/AnotacionesStudentDetailModal/annotationDisplay.ts` | formatAnnotationDisplayText, parts, normalized, text, annotation                           |
| `src/features/causas/EditCausaModal/EditCausaModalForm.tsx`                   | name, toInitials                                                                           |
| `src/features/causas/ForceCloseCausaDialog.tsx`                               | setInforme, handleSubmit, error, documentoAdjunto, isSaving, ...                           |
| `src/features/causas/forceCloseCausa.ts`                                      | responsable, buildForceClosedCausa, input, ForceCloseCausaInput, titulo, ...               |
| `src/features/causas/notificacionDocgen/builders.ts`                          | combineDueProcessSections, content                                                         |
| `src/features/causas/ui/NewIncidenteModal.tsx`                                | event, handleSubmit, submitError                                                           |
| `src/features/dashboard/DashboardStats.tsx`                                   | DashboardActionQueue                                                                       |
| `src/features/platform/PlatformView.tsx`                                      | createMutation.mutationFn                                                                  |
| `src/features/timeline/MarkdownRenderer.tsx`                                  | lines, MarkdownRenderer                                                                    |
| `src/lib/causaFactory.ts`                                                     | generateInitials, fullName                                                                 |
| `src/lib/markdownUtils.tsx`                                                   | BoldText, parts                                                                            |
| `src/reglamentoData.ts`                                                       | extractConductaFromObservation, observaciones, match                                       |
| `src/shared/api/services/disciplinary-storage.service.ts`                     | withoutExtension, name, sanitizeFileName, base                                             |
| `src/shared/api/services/incidentes.service.ts`                               | tenantId, data, createIncidente, row, mapIncidente, ...                                    |
| `src/shared/lib/anotacionesUtils.ts`                                          | mainParts, rut, parts, maskRut, privacyMode                                                |
| `src/shared/lib/domain/checklistReconciliation.ts`                            | items, persisted, persistedItems, entryDate, entry, ...                                    |
| `src/shared/lib/hooks/useBitacoraLog.ts`                                      | buildManualBitacoraEntry, participants, normalizedTitle, input, normalizedDescription, ... |
| `src/shared/lib/schemas/newCausaForm.ts`                                      | compact, isChileanRutFormat, value, normalizeRutInput, verifier, ...                       |
| `src/shared/lib/stores/uiStore.ts`                                            | initialViewFromPathname, pathname                                                          |
| `src/shared/lib/types.ts`                                                     | Incidente                                                                                  |
| `src/shared/ui/TextInputDialog.tsx`                                           | event, handleSubmit, normalizedValue                                                       |
| `vite.config.ts`                                                              | transformIndexHtml, html                                                                   |

## Connected Communities

- **features/timeline +28 dirs** (41 cross-edges)
- **. +11 dirs** (13 cross-edges)
- **plugins +14 dirs** (13 cross-edges)
- **lib/hooks +8 dirs** (6 cross-edges)
- **api/services +11 dirs** (3 cross-edges)
- **. +8 dirs** (2 cross-edges)
- **server/lib +4 dirs** (2 cross-edges)
- **api/routes +1 dirs · requireAuth** (2 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (1 cross-edges)
- **. +2 dirs · buildDashboardTrendSummary** (1 cross-edges)
- **. +1 dirs · isMediationActive** (1 cross-edges)
- **. +4 dirs · uploadDisciplinaryFile** (1 cross-edges)
- **. +3 dirs · setCache** (1 cross-edges)
- **features/anotaciones +5 dirs** (1 cross-edges)
- **tests +1 dirs** (1 cross-edges)
- **lib/domain +6 dirs** (1 cross-edges)
- **api/services +1 dirs · platformRequest** (1 cross-edges)
- **shared · uploadDocument** (1 cross-edges)
- **. +2 dirs · httpsPatch** (1 cross-edges)
- **api · httpsPost** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-318")
explore(operation:"context", task:"understand api/services +22 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
