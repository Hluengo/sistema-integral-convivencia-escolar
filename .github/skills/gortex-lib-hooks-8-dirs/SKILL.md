---
name: gortex-lib-hooks-8-dirs
description: "Work in the lib/hooks +8 dirs area — 201 symbols across 19 files (79% cohesion)"
---

# lib/hooks +8 dirs

201 symbols | 19 files | 79% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `src/features/causas/CausasTable.tsx`
- `src/features/causas/causaPresentation.ts`
- `src/lib/causaFactory.ts`
- `src/shared/api/services/storage.service.ts`
- `src/shared/lib/dateUtils.ts`
- `src/shared/lib/domain/disciplinaryStage.ts`
- `src/shared/lib/hooks/causaPersistence.test.ts`
- `src/shared/lib/hooks/useBitacoraLog.ts`
- `src/shared/lib/hooks/useChecklistRegistration.ts`
- `src/shared/lib/hooks/useDocumentManager.ts`
- `src/shared/lib/hooks/useTimelineController.ts`
- `src/shared/lib/legalCompliance/constants.ts`
- `src/shared/lib/legalCompliance/dateUtils.ts`
- `src/shared/lib/legalCompliance/deadlineCalculators.ts`
- `src/shared/lib/legalCompliance/deadlineValidators.ts`
- `src/shared/lib/legalCompliance/types.ts`
- `src/shared/lib/stores/causasStore.ts`
- `src/shared/lib/types.ts`

## Key Files

| File                                                    | Symbols                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ``                                                      | isNaN, parse                                                                                                                               |
| `src/features/causas/CausasTable.tsx`                   | Deadline, tone, deadline                                                                                                                   |
| `src/features/causas/causaPresentation.ts`              | remainingDays, closedPresentation, maxDays, causa, DeadlinePresentation, ...                                                               |
| `src/lib/causaFactory.ts`                               | formatSequentialCaseId, padding, dateOnly, plazoInvestigacionDias, counter, ...                                                            |
| `src/shared/api/services/storage.service.ts`            | resolveDocumentOwnerId, scope, causaId, incidenteId                                                                                        |
| `src/shared/lib/dateUtils.ts`                           | parts, date, toIsoWithoutMilliseconds, values, nowDateOnly, ...                                                                            |
| `src/shared/lib/domain/disciplinaryStage.ts`            | getCartaTimestamp, carta, value, timestamp                                                                                                 |
| `src/shared/lib/hooks/causaPersistence.test.ts`         | createCausaFixture                                                                                                                         |
| `src/shared/lib/hooks/useBitacoraLog.ts`                | isCreatingManualLog, setManualLogError, useBitacoraLog, setIsCreatingManualLog, resetManualLogError, ...                                   |
| `src/shared/lib/hooks/useChecklistRegistration.ts`      | handleSaveRegistration, documentScope, setRegFile, handleFileChange, registeringItemId, ...                                                |
| `src/shared/lib/hooks/useDocumentManager.ts`            | getResponsableName, isUploadingDocument, handleAttachDocument, useDocumentManager, refreshDocuments, ...                                   |
| `src/shared/lib/hooks/useTimelineController.ts`         | documents, checklist, contextValue, log, useTimelineController                                                                             |
| `src/shared/lib/legalCompliance/constants.ts`           | getMaxPlazoInvestigacionDias, comprometeAulaSegura, tipoInfraccion                                                                         |
| `src/shared/lib/legalCompliance/dateUtils.ts`           | fecha, calcularDiasHabilesDesdeDiaSiguiente, diasAgregados, diasHabiles, iniciaEnDiaHabil, ...                                             |
| `src/shared/lib/legalCompliance/deadlineCalculators.ts` | calcularFechaLimiteCierreIndagacion, fechaInicioInvestigacion, fechaResolucion, tipoInfraccion, calcularFechaLimiteInformeConcluyente, ... |
| `src/shared/lib/legalCompliance/deadlineValidators.ts`  | maxDias, fechaLimite, fechaInicio, normalizedChecklistDate, getInvestigationStartDate, ...                                                 |
| `src/shared/lib/legalCompliance/types.ts`               | EstadoPlazo, ResultadoPlazo                                                                                                                |
| `src/shared/lib/stores/causasStore.ts`                  | useCausasStore.handleReopenCausa, causa                                                                                                    |
| `src/shared/lib/types.ts`                               | DocumentScope                                                                                                                              |

## Connected Communities

- **features/timeline +28 dirs** (18 cross-edges)
- **api/services +22 dirs** (7 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (5 cross-edges)
- **. +11 dirs** (4 cross-edges)
- **shared · uploadDocument** (3 cross-edges)
- **lib/legalCompliance** (3 cross-edges)
- **plugins +14 dirs** (1 cross-edges)
- **api/services +1 dirs · useStudentPdfDisciplinaryReview** (1 cross-edges)
- **api/services · listDocuments** (1 cross-edges)
- **. +4 dirs · padStart** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-186")
explore(operation:"context", task:"understand lib/hooks +8 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
