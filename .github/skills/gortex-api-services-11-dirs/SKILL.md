---
name: gortex-api-services-11-dirs
description: "Work in the api/services +11 dirs area — 427 symbols across 40 files (81% cohesion)"
---

# api/services +11 dirs

427 symbols | 40 files | 81% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `src/features/admin/AdminView.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/HistoryTab.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/PhysicalCartaRegistrationCard.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/StudentSummaryTab.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/hooks/useDisciplinaryData.ts`
- `src/features/anotaciones/AnotacionesView.tsx`
- `src/features/anotaciones/NewDisciplinaryProcessModal/PdfAnalysisComparison.tsx`
- `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx`
- `src/features/timeline/IncidentePanel.tsx`
- `src/shared/api/services/annotations.service.test.ts`
- `src/shared/api/services/annotations.service.ts`
- `src/shared/api/services/cartas.service.test.ts`
- `src/shared/api/services/cartas.service.ts`
- `src/shared/api/services/causaDocuments.service.test.ts`
- `src/shared/api/services/causaDocuments.service.ts`
- `src/shared/api/services/causas.service.test.ts`
- `src/shared/api/services/causas.service.ts`
- `src/shared/api/services/checklistProgress.service.ts`
- `src/shared/api/services/courses.service.ts`
- `src/shared/api/services/incidentes.service.ts`
- `src/shared/api/services/reports.service.test.ts`
- `src/shared/api/services/reports.service.ts`
- `src/shared/api/services/storage.service.test.ts`
- `src/shared/api/services/storage.service.ts`
- `src/shared/lib/dateUtils.ts`
- `src/shared/lib/hooks/useCausasQuery.ts`
- `src/shared/lib/hooks/useChecklistProgress.ts`
- `src/shared/lib/hooks/useCoursesQuery.ts`
- `src/shared/lib/hooks/useInvalidateDashboardQueries.test.ts`
- `src/shared/lib/hooks/useInvalidateDashboardQueries.ts`
- `src/shared/lib/hooks/usePersistentNotifications.ts`
- `src/shared/lib/hooks/usePhysicalCartaRegistration.ts`
- `src/shared/lib/hooks/useStudentHistoryEntries.ts`
- `src/shared/lib/hooks/useStudentsQuery.ts`
- `src/shared/lib/mappers.ts`
- `src/shared/lib/stores/authStore.ts`
- `src/shared/lib/stores/causasStore.ts`
- `src/shared/lib/stores/toastStore.ts`
- `src/shared/lib/types.ts`

## Key Files

| File                                                                                       | Symbols                                                                                                   |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| ``                                                                                         | parseInt, ok, error, all                                                                                  |
| `src/features/admin/AdminView.tsx`                                                         | inviteMutation.onSuccess, data, importMutation.onSuccess, invalidate, memberMutation.onSuccess, ...       |
| `src/features/anotaciones/AnotacionesStudentDetailModal/HistoryTab.tsx`                    | HistoryTabProps                                                                                           |
| `src/features/anotaciones/AnotacionesStudentDetailModal/PhysicalCartaRegistrationCard.tsx` | PhysicalCartaRegistrationCardProps                                                                        |
| `src/features/anotaciones/AnotacionesStudentDetailModal/StudentSummaryTab.tsx`             | StudentSummaryTabProps                                                                                    |
| `src/features/anotaciones/AnotacionesStudentDetailModal/hooks/useDisciplinaryData.ts`      | DisciplinaryDataResult, query.queryFn                                                                     |
| `src/features/anotaciones/AnotacionesView.tsx`                                             | annotationsQuery.queryFn                                                                                  |
| `src/features/anotaciones/NewDisciplinaryProcessModal/PdfAnalysisComparison.tsx`           | PdfAnalysisComparisonProps                                                                                |
| `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx`                        | documentsQuery.queryFn                                                                                    |
| `src/features/timeline/IncidentePanel.tsx`                                                 | incidente, queryFn, activity, causas                                                                      |
| `src/shared/api/services/annotations.service.test.ts`                                      | result.fn, result.fn, fetchDocumentAnalyses, fetchAnnotations, _column, ...                               |
| `src/shared/api/services/annotations.service.ts`                                           | data, studentId, fetchDocumentAnalyses, query, studentId, ...                                             |
| `src/shared/api/services/cartas.service.test.ts`                                           | _row, makeCarta, result, gte, _opts, ...                                                                  |
| `src/shared/api/services/cartas.service.ts`                                                | error, studentId, updateCartaStatus, DisciplinaryProcessRecord, cartaId, ...                              |
| `src/shared/api/services/causaDocuments.service.test.ts`                                   | fetchCausaDocuments, fetchCausaDocuments, result.fn, result.fn                                            |
| `src/shared/api/services/causaDocuments.service.ts`                                        | data, error, fetchCausaDocuments, causaId                                                                 |
| `src/shared/api/services/causas.service.test.ts`                                           | delete                                                                                                    |
| `src/shared/api/services/causas.service.ts`                                                | max, causa, deletedCausas, row, tenantId, ...                                                             |
| `src/shared/api/services/checklistProgress.service.ts`                                     | mapRow, fetchChecklistProgress, parsed, row, queries, ...                                                 |
| `src/shared/api/services/courses.service.ts`                                               | data, error, error, tenantId, fetchStudentsWithCourses, ...                                               |
| `src/shared/api/services/incidentes.service.ts`                                            | causas, IncidenteSharedActivity, incidenteId, causaIds, data, ...                                         |
| `src/shared/api/services/reports.service.test.ts`                                          | makeHistoryItem, overrides                                                                                |
| `src/shared/api/services/reports.service.ts`                                               | ReportStatus, error, ReportHistoryItem, ReportType, ReportFilters, ...                                    |
| `src/shared/api/services/storage.service.test.ts`                                          | createSignedUrl                                                                                           |
| `src/shared/api/services/storage.service.ts`                                               | trimmed, url, data, filePath, encodedPath, ...                                                            |
| `src/shared/lib/dateUtils.ts`                                                              | getCurrentSchoolYear                                                                                      |
| `src/shared/lib/hooks/useCausasQuery.ts`                                                   | trackCausasQuery, queryFn, details, resultCount, query.queryFn, ...                                       |
| `src/shared/lib/hooks/useChecklistProgress.ts`                                             | createMutation.onSuccess, linkedCausas, error, invalidateMutation.onSuccess, query.queryFn                |
| `src/shared/lib/hooks/useCoursesQuery.ts`                                                  | queryFn                                                                                                   |
| `src/shared/lib/hooks/useInvalidateDashboardQueries.test.ts`                               | options, invalidateQueries                                                                                |
| `src/shared/lib/hooks/useInvalidateDashboardQueries.ts`                                    | invalidateDashboardQueries, useInvalidateDashboardQueries, client, queryClient, DashboardQueryClient      |
| `src/shared/lib/hooks/usePersistentNotifications.ts`                                       | event, readMutation.onSuccess, markAllMutation.onSuccess, handlePageShow                                  |
| `src/shared/lib/hooks/usePhysicalCartaRegistration.ts`                                     | usePhysicalCartaRegistration, isRegistering, invalidateDashboard, registerPhysicalCarta, setIsRegistering |
| `src/shared/lib/hooks/useStudentHistoryEntries.ts`                                         | createMutation.onSuccess                                                                                  |
| `src/shared/lib/hooks/useStudentsQuery.ts`                                                 | queryFn                                                                                                   |
| `src/shared/lib/mappers.ts`                                                                | s, mapCauseRowToCarta, row, validStatus, StageRow, ...                                                    |
| `src/shared/lib/stores/authStore.ts`                                                       | error, data, loadTenantProfile, userId                                                                    |
| `src/shared/lib/stores/causasStore.ts`                                                     | requireAuth, newObj, state, useCausasStore.handleDeleteCausa, id, ...                                     |
| `src/shared/lib/stores/toastStore.ts`                                                      | useToastStore.addToast, timeoutId, type, id, message                                                      |
| `src/shared/lib/types.ts`                                                                  | EtapaDisciplinaria, CartaDisciplinaria, DocumentAnalysis                                                  |

## Connected Communities

- **features/timeline +28 dirs** (32 cross-edges)
- **api/services +22 dirs** (10 cross-edges)
- **plugins +14 dirs** (5 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (4 cross-edges)
- **lib/hooks +8 dirs** (3 cross-edges)
- **. +2 dirs · buildDashboardTrendSummary** (2 cross-edges)
- **api/services +4 dirs · fetchAnnualAnnotationTrends** (2 cross-edges)
- **features/anotaciones +1 dirs · resolveStudentCartaTableState** (1 cross-edges)
- **api/services · fetchStudentsWithCoursesPage** (1 cross-edges)
- **lib/domain +6 dirs** (1 cross-edges)
- **. +11 dirs** (1 cross-edges)
- **src/lib · toPostHog** (1 cross-edges)
- **lib/hooks · useStudentHistoryEntries** (1 cross-edges)
- **api/services +4 dirs · rpc** (1 cross-edges)
- **. +1 dirs · isMediationActive** (1 cross-edges)
- **. +4 dirs · padStart** (1 cross-edges)
- **features/anotaciones +5 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-257")
explore(operation:"context", task:"understand api/services +11 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
