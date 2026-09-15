---
name: gortex-features-timeline-28-dirs
description: "Work in the features/timeline +28 dirs area — 600 symbols across 76 files (74% cohesion)"
---

# features/timeline +28 dirs

600 symbols | 76 files | 74% cohesion

## When to Use

Use this skill when working on files in:

- ``
- `server/api/services/gemini.ts`
- `server/lib/validators.ts`
- `src/features/admin/AdminView.tsx`
- `src/features/admin/InstitutionSettingsPanel.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/EditAnnotationsTab.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/HistoryTab.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/ManualHistoryEntryForm.tsx`
- `src/features/anotaciones/AnotacionesStudentDetailModal/constants.tsx`
- `src/features/anotaciones/AnotacionesStudentTable.tsx`
- `src/features/anotaciones/NewDisciplinaryProcessModal/ClassificationStep.tsx`
- `src/features/anotaciones/NewDisciplinaryProcessModal/ReviewStep.tsx`
- `src/features/anotaciones/RankingCard.tsx`
- `src/features/anotaciones/TeacherAnnotationRanking.tsx`
- `src/features/anotaciones/annotationsExcelExport.ts`
- `src/features/anotaciones/docgen/DocumentForm.tsx`
- `src/features/anotaciones/docgen/DocumentPreview/docTypes.ts`
- `src/features/anotaciones/docgen/components/PrintHintDialog.tsx`
- `src/features/causas/CausasTable.tsx`
- `src/features/causas/MainContent/AdvisorView.tsx`
- `src/features/causas/MainContent/CausasView.tsx`
- `src/features/causas/NewCausaForm/RiceConductSelect.tsx`
- `src/features/causas/causaOperationalSummary.ts`
- `src/features/causas/causaPresentation.ts`
- `src/features/causas/causasListLayout.test.ts`
- `src/features/causas/notificacionDocgen/NotificationForm.tsx`
- `src/features/causas/notificacionDocgen/builders.ts`
- `src/features/causas/ui/NewCausaForm.tsx`
- `src/features/causas/ui/NewIncidenteModal.tsx`
- `src/features/dashboard/DashboardStats.tsx`
- `src/features/dashboard/DashboardTrendsPanel.tsx`
- `src/features/dashboard/dashboardActions.ts`
- `src/features/platform/PlatformInstitutionDocuments.tsx`
- `src/features/platform/PlatformInstitutionPanel.tsx`
- `src/features/platform/PlatformView.tsx`
- `src/features/reports/ReportsCenter.tsx`
- `src/features/reports/reportUtils.ts`
- `src/features/students/StudentsPanel.tsx`
- `src/features/timeline/AttachedDocuments.tsx`
- `src/features/timeline/BitacoraTab.tsx`
- `src/features/timeline/ChecklistProgressPanel.tsx`
- `src/features/timeline/DraftPanel.tsx`
- `src/features/timeline/IncidentePanel.tsx`
- `src/features/timeline/ProcesoTab.tsx`
- `src/features/timeline/ProcessChecklist.tsx`
- `src/features/timeline/ResumenTab.tsx`
- `src/features/timeline/RutaExpedienteTab.tsx`
- `src/features/timeline/TimelineHeader.tsx`
- `src/features/timeline/TimelineTabPanels.tsx`
- `src/features/timeline/TimelineTabs.tsx`
- `src/shared/EmptyState.tsx`
- `src/shared/api/services/admin.service.ts`
- `src/shared/api/services/bitacora.service.ts`
- `src/shared/api/services/checklist.service.ts`
- `src/shared/api/services/institution.service.test.ts`
- `src/shared/api/services/storage.service.test.ts`
- `src/shared/api/services/storage.service.ts`
- `src/shared/lib/dateTime.ts`
- `src/shared/lib/domain/annotationRankings.ts`
- `src/shared/lib/domain/courseCartaRanking.ts`
- `src/shared/lib/domain/disciplinaryStatus.ts`
- `src/shared/lib/domain/investigationChecklist.ts`
- `src/shared/lib/hooks/useChecklistProgress.ts`
- `src/shared/lib/queries/causasQueryCache.ts`
- `src/shared/lib/stores/causasStore.ts`
- `src/shared/lib/stores/toastStore.ts`
- `src/shared/ui/Button.tsx`
- `src/shared/ui/DetailModal.tsx`
- `src/shared/ui/Dialog.tsx`
- `src/shared/ui/FormField.tsx`
- `src/shared/ui/HistoryEntryForm.tsx`
- `src/shared/ui/PageHeader.tsx`
- `src/shared/ui/ShortcutsModal.tsx`
- `src/shared/ui/SummaryCard.tsx`
- `src/shared/ui/WelcomeModal.tsx`
- `src/shared/ui/charts/TrendChart.tsx`

## Key Files

| File                                                                                | Symbols                                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ``                                                                                  | values, assign, sort, flatMap, entries, ...                                                          |
| `server/api/services/gemini.ts`                                                     | record, value, collectText                                                                           |
| `server/lib/validators.ts`                                                          | uniqueKnownValues, values                                                                            |
| `src/features/admin/AdminView.tsx`                                                  | refresh, setOperationError, enabled, importResult, email, ...                                        |
| `src/features/admin/InstitutionSettingsPanel.tsx`                                   | logoMutation, InstitutionSettingsPanel, setRuleTitle, setMessage, saveMutation, ...                  |
| `src/features/anotaciones/AnotacionesStudentDetailModal/EditAnnotationsTab.tsx`     | tenantId, setEditingId, cancelEditing, startEditing, editingId, ...                                  |
| `src/features/anotaciones/AnotacionesStudentDetailModal/HistoryTab.tsx`             | manualHistory, base, describeCartaEvent, event, isPhysical, ...                                      |
| `src/features/anotaciones/AnotacionesStudentDetailModal/ManualHistoryEntryForm.tsx` | ManualHistoryEntryForm                                                                               |
| `src/features/anotaciones/AnotacionesStudentDetailModal/constants.tsx`              | dateStr, formatDate                                                                                  |
| `src/features/anotaciones/AnotacionesStudentTable.tsx`                              | setSelectedCartaStatus, setIsExporting, exportMenuRef, isExporting, selectedCourseId, ...            |
| `src/features/anotaciones/NewDisciplinaryProcessModal/ClassificationStep.tsx`       | total, displayOptions, ClassificationStep                                                            |
| `src/features/anotaciones/NewDisciplinaryProcessModal/ReviewStep.tsx`               | startEditing, draftText, classLabel, saveEditedText, ReviewStep, ...                                 |
| `src/features/anotaciones/RankingCard.tsx`                                          | BarSkeleton, RankingCard, maxCount                                                                   |
| `src/features/anotaciones/TeacherAnnotationRanking.tsx`                             | Count, maxNegativeCount, TeacherAnnotationRanking, LegendDot                                         |
| `src/features/anotaciones/annotationsExcelExport.ts`                                | getStudentsForAnnotationExport, rows, AnnotationExportScope, emptyCells, dataRows, ...               |
| `src/features/anotaciones/docgen/DocumentForm.tsx`                                  | DocumentForm, showAdvanced                                                                           |
| `src/features/anotaciones/docgen/DocumentPreview/docTypes.ts`                       | buildLetterAnnotationSummary, selectedNegativeAnnotations, annotations, toRecord                     |
| `src/features/anotaciones/docgen/components/PrintHintDialog.tsx`                    | PrintHintDialog                                                                                      |
| `src/features/causas/CausasTable.tsx`                                               | StudentName, CausasTable                                                                             |
| `src/features/causas/MainContent/AdvisorView.tsx`                                   | AdvisorView                                                                                          |
| `src/features/causas/MainContent/CausasView.tsx`                                    | onSelectCausaFromDashboard, selectedFaseFilter, visibleCausas, privacyMode, setSelectedCourse, ...   |
| `src/features/causas/NewCausaForm/RiceConductSelect.tsx`                            | pendingConductId, conductasLeves, conductasGraves, conductasGravisimas, applyConducta, ...           |
| `src/features/causas/causaOperationalSummary.ts`                                    | causa, phaseProgress, persistedIndex, laterActivityPhase, latestActivityIndex, ...                   |
| `src/features/causas/causaPresentation.ts`                                          | causa, getCausaStatus                                                                                |
| `src/features/causas/causasListLayout.test.ts`                                      | informeConcluyente, fechaCompletado, fechaCompletado, cierreIndagacion                               |
| `src/features/causas/notificacionDocgen/NotificationForm.tsx`                       | NotificationForm                                                                                     |
| `src/features/causas/notificacionDocgen/builders.ts`                                | listBitacoraAntecedentes, bitacora                                                                   |
| `src/features/causas/ui/NewCausaForm.tsx`                                           | newAulaSegura, errors, isSubmitting, control, mediaCourses, ...                                      |
| `src/features/causas/ui/NewIncidenteModal.tsx`                                      | setResponsable, isSaving, setError, setDescripcion, fechaHora, ...                                   |
| `src/features/dashboard/DashboardStats.tsx`                                         | DashboardSkeleton                                                                                    |
| `src/features/dashboard/DashboardTrendsPanel.tsx`                                   | SummaryMetric, activeModeTotals, summary, toneClasses, observedPoints, ...                           |
| `src/features/dashboard/dashboardActions.ts`                                        | causa, getDashboardActions, isClosed, causas, today, ...                                             |
| `src/features/platform/PlatformInstitutionDocuments.tsx`                            | file, upload, setCategory, documentsQuery, queryClient, ...                                          |
| `src/features/platform/PlatformInstitutionPanel.tsx`                                | form, publish, tenantId, rule, rulesQuery, ...                                                       |
| `src/features/platform/PlatformView.tsx`                                            | isBusy, totalUsers, activeTab, setSlug, setOperationError, ...                                       |
| `src/features/reports/ReportsCenter.tsx`                                            | dueProcessPending, filtered, dashboardStats, total, setFilter, ...                                   |
| `src/features/reports/reportUtils.ts`                                               | filterReportCausas, causas, from, filters, to                                                        |
| `src/features/students/StudentsPanel.tsx`                                           | error, activityTotals, collapseAll, dispatch, toggleCourse, ...                                      |
| `src/features/timeline/AttachedDocuments.tsx`                                       | AttachedDocuments                                                                                    |
| `src/features/timeline/BitacoraTab.tsx`                                             | setManualFileName, progressEntries, setParticipants, setDocumentScope, setLogType, ...               |
| `src/features/timeline/ChecklistProgressPanel.tsx`                                  | ChecklistProgressPanel, formError, itemEntries, setEntryType, occurredAt, ...                        |
| `src/features/timeline/DraftPanel.tsx`                                              | documentTitle, printDocument, printRef, date, DraftPanel                                             |
| `src/features/timeline/IncidentePanel.tsx`                                          | incidenteId, isLoading, data, IncidentePanel                                                         |
| `src/features/timeline/ProcesoTab.tsx`                                              | ProcesoTab                                                                                           |
| `src/features/timeline/ProcessChecklist.tsx`                                        | ProcessChecklist                                                                                     |
| `src/features/timeline/ResumenTab.tsx`                                              | ResumenTab, completed, deadlines, conductaDescripcion                                                |
| `src/features/timeline/RutaExpedienteTab.tsx`                                       | tone, deadlines, summary, deadlineClass, RutaExpedienteTab, ...                                      |
| `src/features/timeline/TimelineHeader.tsx`                                          | TimelineHeader, displayName, deadlines, canEdit                                                      |
| `src/features/timeline/TimelineTabPanels.tsx`                                       | ctx, TimelineTabPanels                                                                               |
| `src/features/timeline/TimelineTabs.tsx`                                            | tabDefinitions, TimelineTabs, tabs                                                                   |
| `src/shared/EmptyState.tsx`                                                         | styles, EmptyState                                                                                   |
| `src/shared/api/services/admin.service.ts`                                          | AdminRole                                                                                            |
| `src/shared/api/services/bitacora.service.ts`                                       | activeIds, entries, previousById, buildBitacoraSnapshotDelta, rows, ...                              |
| `src/shared/api/services/checklist.service.ts`                                      | previousItems, rows, removedIds, activeIds, buildChecklistSnapshotDelta, ...                         |
| `src/shared/api/services/institution.service.test.ts`                               | value                                                                                                |
| `src/shared/api/services/storage.service.test.ts`                                   | list, close, result.fn, openDocument, result.fn, ...                                                 |
| `src/shared/api/services/storage.service.ts`                                        | openDocument, signedUrl, pathOrLegacyUrl, popup                                                      |
| `src/shared/lib/dateTime.ts`                                                        | getValidDate, formatChileDate, dateOnlyMatch, month, formatChileDateTime, ...                        |
| `src/shared/lib/domain/annotationRankings.ts`                                       | aggregateTeacherAnnotationRanking, teacherName, limit, aggregateStudentAnnotationRanking, limit, ... |
| `src/shared/lib/domain/courseCartaRanking.ts`                                       | carta, countsByCourse, key, CourseCartaCount, courseName, ...                                        |
| `src/shared/lib/domain/disciplinaryStatus.ts`                                       | countByStage, students                                                                               |
| `src/shared/lib/domain/investigationChecklist.ts`                                   | checklist, completedItemIds                                                                          |
| `src/shared/lib/hooks/useChecklistProgress.ts`                                      | causaId, createMutation, query, invalidateMutation, queryClient, ...                                 |
| `src/shared/lib/queries/causasQueryCache.ts`                                        | syncPersistedCausasToCache, tenantId, addCausaToCache, key, causas, ...                              |
| `src/shared/lib/stores/causasStore.ts`                                              | useCausasStore.handleUpdateCausa, updated                                                            |
| `src/shared/lib/stores/toastStore.ts`                                               | timeoutId, id, useToastStore.removeToast                                                             |
| `src/shared/ui/Button.tsx`                                                          | Button                                                                                               |
| `src/shared/ui/DetailModal.tsx`                                                     | DetailModalBody, DetailModalTab, T, DetailModalTabsProps, DetailModalTabs                            |
| `src/shared/ui/Dialog.tsx`                                                          | DialogFooter, DialogHeader                                                                           |
| `src/shared/ui/FormField.tsx`                                                       | FormField                                                                                            |
| `src/shared/ui/HistoryEntryForm.tsx`                                                | description, canSave, setDescription, isOpen, handleSubmit, ...                                      |
| `src/shared/ui/PageHeader.tsx`                                                      | PageHeader                                                                                           |
| `src/shared/ui/ShortcutsModal.tsx`                                                  | ShortcutsModal                                                                                       |
| `src/shared/ui/SummaryCard.tsx`                                                     | SummaryCard                                                                                          |
| `src/shared/ui/WelcomeModal.tsx`                                                    | WelcomeModal                                                                                         |
| `src/shared/ui/charts/TrendChart.tsx`                                               | TrendChartPoint, MonthlyBars, TrendChart, LegendPill, maxValue                                       |

## Entry Points

- `src/features/students/StudentsPanel.tsx::StudentsPanel`
- `src/features/admin/AdminView.tsx::AdminView`
- `src/features/platform/PlatformView.tsx::PlatformView`
- `src/features/reports/ReportsCenter.tsx::ReportsCenter`
- `src/features/anotaciones/AnotacionesStudentTable.tsx::AnotacionesStudentTable`

## Connected Communities

- **api/services +22 dirs** (29 cross-edges)
- **. +11 dirs** (10 cross-edges)
- **. +2 dirs · buildDashboardTrendSummary** (9 cross-edges)
- **lib/hooks +7 dirs · useNewCausaModalController** (9 cross-edges)
- **lib/domain +6 dirs** (8 cross-edges)
- **lib/hooks +7 dirs · useMemberships** (7 cross-edges)
- **api/services +11 dirs** (7 cross-edges)
- **lib/hooks +8 dirs** (6 cross-edges)
- **app/components +6 dirs** (5 cross-edges)
- **plugins +14 dirs** (4 cross-edges)
- **server/lib +4 dirs** (3 cross-edges)
- **features/anotaciones +5 dirs** (3 cross-edges)
- **features/anotaciones +1 dirs · resolveStudentCartaTableState** (3 cross-edges)
- **api/services +2 dirs · runImport** (2 cross-edges)
- **features/dashboard +1 dirs · getModeTotals** (2 cross-edges)
- **docgen/components +3 dirs** (1 cross-edges)
- **lib/hooks · useStudentHistoryEntries** (1 cross-edges)
- **. +1 dirs · isMediationActive** (1 cross-edges)
- **features/timeline +22 dirs** (1 cross-edges)
- **shared/lib · EstadoCausa** (1 cross-edges)
- **features/anotaciones +1 dirs · downloadAnnotationsExcel** (1 cross-edges)
- **api/services +1 dirs · updateAnnotation** (1 cross-edges)
- **. +2 dirs · UploadAnalyzeStep** (1 cross-edges)
- **causas/notificacionDocgen +1 dirs · CausaNotificationGenerator** (1 cross-edges)
- **shared · BitacoraEntry** (1 cross-edges)
- **. +8 dirs** (1 cross-edges)
- **causas/NewCausaForm** (1 cross-edges)
- **anotaciones/AnotacionesStudentDetailModal +2 dirs · CartasTab** (1 cross-edges)
- **. +2 dirs · isLetterAnnotationSummary** (1 cross-edges)
- **features/timeline +1 dirs** (1 cross-edges)
- **anotaciones/docgen +8 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-161")
explore(operation:"context", task:"understand features/timeline +28 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"src/features/students/StudentsPanel.tsx::StudentsPanel"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
