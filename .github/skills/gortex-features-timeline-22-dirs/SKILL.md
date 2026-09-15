---
name: gortex-features-timeline-22-dirs
description: "Work in the features/timeline +22 dirs area — 118 symbols across 72 files (75% cohesion)"
---

# features/timeline +22 dirs

118 symbols | 72 files | 75% cohesion

## When to Use

Use this skill when working on files in:

- `src/app/hooks/useAppNavigation.ts`
- `src/app/hooks/useUrlRouting.ts`
- `src/features/causas/CausaDetailModal.tsx`
- `src/features/causas/CausasTable.tsx`
- `src/features/causas/ClosedCases.tsx`
- `src/features/causas/EditCausaModal/EditCausaModalForm.tsx`
- `src/features/causas/ForceCloseCausaDialog.tsx`
- `src/features/causas/MainContent.tsx`
- `src/features/causas/MainContent/CaseLegalWorkspace.tsx`
- `src/features/causas/MainContent/CausasView.tsx`
- `src/features/causas/MainContent/viewContracts.ts`
- `src/features/causas/NewCausaForm/RiceConductSelect.tsx`
- `src/features/causas/causaOperationalSummary.test.ts`
- `src/features/causas/causaOperationalSummary.ts`
- `src/features/causas/causaPresentation.ts`
- `src/features/causas/causasListLayout.test.ts`
- `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx`
- `src/features/causas/notificacionDocgen/notificacionDocgen.test.ts`
- `src/features/causas/ui/EditCausaModal.tsx`
- `src/features/command-palette/CommandPalette.tsx`
- `src/features/dashboard/DashboardStats.tsx`
- `src/features/dashboard/dashboardActions.test.ts`
- `src/features/dashboard/dashboardTrends.test.ts`
- `src/features/onboarding/OnboardingChecklist.tsx`
- `src/features/reports/reportUtils.test.ts`
- `src/features/timeline/BitacoraTab.tsx`
- `src/features/timeline/ChecklistItemCard.tsx`
- `src/features/timeline/ChecklistProgressPanel.tsx`
- `src/features/timeline/IncidentePanel.tsx`
- `src/features/timeline/InteractiveTimeline.tsx`
- `src/features/timeline/InvestigationChecklist.tsx`
- `src/features/timeline/ProcesoTab.tsx`
- `src/features/timeline/ProcessChecklist.tsx`
- `src/features/timeline/RegistrationForm.tsx`
- `src/features/timeline/ResumenTab.tsx`
- `src/features/timeline/RutaExpedienteTab.tsx`
- `src/features/timeline/TimelineHeader.tsx`
- `src/features/timeline/TimelineTabPanels.tsx`
- `src/features/timeline/TimelineTabs.tsx`
- `src/features/timeline/timelineTabs.types.ts`
- `src/lib/causaFactory.ts`
- `src/shared/api/services/causas.service.ts`
- `src/shared/api/services/checklist.service.test.ts`
- `src/shared/api/services/checklist.service.ts`
- `src/shared/api/services/incidentes.service.ts`
- `src/shared/api/services/institution.service.ts`
- `src/shared/lib/data.test.ts`
- `src/shared/lib/domain/checklistReconciliation.test.ts`
- `src/shared/lib/domain/investigationChecklist.test.ts`
- `src/shared/lib/domain/investigationChecklist.ts`
- `src/shared/lib/hooks/causaPersistence.ts`
- `src/shared/lib/hooks/useAuditDraft.ts`
- `src/shared/lib/hooks/useBitacoraLog.ts`
- `src/shared/lib/hooks/useCausasPersistence.ts`
- `src/shared/lib/hooks/useChecklistRegistration.ts`
- `src/shared/lib/hooks/useDocumentManager.ts`
- `src/shared/lib/hooks/useNotifications.test.ts`
- `src/shared/lib/hooks/useTimelineController.ts`
- `src/shared/lib/legalCompliance/legalCompliance.test.ts`
- `src/shared/lib/queries/causasQueryCache.test.ts`
- `src/shared/lib/queries/causasQueryCache.ts`
- `src/shared/lib/stores/causasStore.test.ts`
- `src/shared/lib/stores/causasStore.ts`
- `src/shared/lib/stores/uiStore.ts`
- `src/shared/lib/types.ts`
- `src/shared/lib/useAppContext.ts`
- `src/shared/lib/useTimelineContext.ts`
- `src/shared/ui/ViewLoader.tsx`
- `src/shared/ui/viewLoaderPhrases.ts`
- `src/widgets/header/Header.tsx`
- `src/widgets/sidebar/Sidebar.tsx`
- `src/widgets/sidebar/SidebarUserMenu.tsx`

## Key Files

| File                                                                | Symbols                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/app/hooks/useAppNavigation.ts`                                 | UseAppNavigationArgs                                                                 |
| `src/app/hooks/useUrlRouting.ts`                                    | UseUrlRoutingArgs                                                                    |
| `src/features/causas/CausaDetailModal.tsx`                          | CausaDetailModalProps                                                                |
| `src/features/causas/CausasTable.tsx`                               | CausasTableProps                                                                     |
| `src/features/causas/ClosedCases.tsx`                               | ClosedCasesProps                                                                     |
| `src/features/causas/EditCausaModal/EditCausaModalForm.tsx`         | EditCausaModalFormProps                                                              |
| `src/features/causas/ForceCloseCausaDialog.tsx`                     | ForceCloseCausaDialogProps                                                           |
| `src/features/causas/MainContent.tsx`                               | MainContentProps                                                                     |
| `src/features/causas/MainContent/CaseLegalWorkspace.tsx`            | CaseLegalTool, CaseLegalWorkspaceProps                                               |
| `src/features/causas/MainContent/CausasView.tsx`                    | CausasViewProps                                                                      |
| `src/features/causas/MainContent/viewContracts.ts`                  | CreateCausaActions, MainNavigationActions, CausaWorkspaceViewModel                   |
| `src/features/causas/NewCausaForm/RiceConductSelect.tsx`            | RiceConductSelectProps                                                               |
| `src/features/causas/causaOperationalSummary.test.ts`               | overrides, causa                                                                     |
| `src/features/causas/causaOperationalSummary.ts`                    | CausaOperationalSummary, PhaseProgress                                               |
| `src/features/causas/causaPresentation.ts`                          | getCausaPhase, causa                                                                 |
| `src/features/causas/causasListLayout.test.ts`                      | cause, overrides                                                                     |
| `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx` | CausaNotificationPanelProps                                                          |
| `src/features/causas/notificacionDocgen/notificacionDocgen.test.ts` | baseCausa                                                                            |
| `src/features/causas/ui/EditCausaModal.tsx`                         | EditCausaModalProps                                                                  |
| `src/features/command-palette/CommandPalette.tsx`                   | CommandPaletteProps                                                                  |
| `src/features/dashboard/DashboardStats.tsx`                         | DashboardStatsProps                                                                  |
| `src/features/dashboard/dashboardActions.test.ts`                   | overrides, causa                                                                     |
| `src/features/dashboard/dashboardTrends.test.ts`                    | overrides, makeCausa                                                                 |
| `src/features/onboarding/OnboardingChecklist.tsx`                   | StepDefinition, OnboardingChecklistProps                                             |
| `src/features/reports/reportUtils.test.ts`                          | causa, overrides                                                                     |
| `src/features/timeline/BitacoraTab.tsx`                             | BitacoraTabProps                                                                     |
| `src/features/timeline/ChecklistItemCard.tsx`                       | ChecklistItemCardProps                                                               |
| `src/features/timeline/ChecklistProgressPanel.tsx`                  | ChecklistProgressPanelProps                                                          |
| `src/features/timeline/IncidentePanel.tsx`                          | IncidentePanelProps                                                                  |
| `src/features/timeline/InteractiveTimeline.tsx`                     | InteractiveTimelineProps                                                             |
| `src/features/timeline/InvestigationChecklist.tsx`                  | InvestigationChecklistProps                                                          |
| `src/features/timeline/ProcesoTab.tsx`                              | ProcesoTabProps                                                                      |
| `src/features/timeline/ProcessChecklist.tsx`                        | ProcessChecklistProps                                                                |
| `src/features/timeline/RegistrationForm.tsx`                        | RegistrationFormProps                                                                |
| `src/features/timeline/ResumenTab.tsx`                              | ResumenTabProps                                                                      |
| `src/features/timeline/RutaExpedienteTab.tsx`                       | RutaExpedienteTabProps                                                               |
| `src/features/timeline/TimelineHeader.tsx`                          | TimelineHeaderProps                                                                  |
| `src/features/timeline/TimelineTabPanels.tsx`                       | TimelineTabPanelsProps                                                               |
| `src/features/timeline/TimelineTabs.tsx`                            | TimelineTabsProps                                                                    |
| `src/features/timeline/timelineTabs.types.ts`                       | TimelineTab                                                                          |
| `src/lib/causaFactory.ts`                                           | CreateDraftCausaArgs                                                                 |
| `src/shared/api/services/causas.service.ts`                         | CausasPage                                                                           |
| `src/shared/api/services/checklist.service.test.ts`                 | createChecklistItem, overrides                                                       |
| `src/shared/api/services/checklist.service.ts`                      | ChecklistSnapshotRow                                                                 |
| `src/shared/api/services/incidentes.service.ts`                     | IncidenteCausaSummary                                                                |
| `src/shared/api/services/institution.service.ts`                    | OnboardingStatus                                                                     |
| `src/shared/lib/data.test.ts`                                       | causa, completedIds, overrides                                                       |
| `src/shared/lib/domain/checklistReconciliation.test.ts`             | causa, bitacora, overrides, checklistDebidoProceso                                   |
| `src/shared/lib/domain/investigationChecklist.test.ts`              | overrides, causa                                                                     |
| `src/shared/lib/domain/investigationChecklist.ts`                   | MediationOutcome, InvestigationChecklistModel                                        |
| `src/shared/lib/hooks/causaPersistence.ts`                          | ExistingCausaPersistenceOperations                                                   |
| `src/shared/lib/hooks/useAuditDraft.ts`                             | UseAuditDraftArgs                                                                    |
| `src/shared/lib/hooks/useBitacoraLog.ts`                            | UseBitacoraLogArgs, ManualBitacoraEntryInput                                         |
| `src/shared/lib/hooks/useCausasPersistence.ts`                      | causa, previousCausa, createInitialSnapshot, UseCausasPersistenceArgs                |
| `src/shared/lib/hooks/useChecklistRegistration.ts`                  | UseChecklistRegistrationArgs                                                         |
| `src/shared/lib/hooks/useDocumentManager.ts`                        | UseDocumentManagerArgs                                                               |
| `src/shared/lib/hooks/useNotifications.test.ts`                     | baseCausa                                                                            |
| `src/shared/lib/hooks/useTimelineController.ts`                     | TimelineControllerArgs                                                               |
| `src/shared/lib/legalCompliance/legalCompliance.test.ts`            | overrides, makeCausa, cierreIndagacion, informeConcluyente, fechaCompletado, ...     |
| `src/shared/lib/queries/causasQueryCache.test.ts`                   | createCausa, overrides                                                               |
| `src/shared/lib/queries/causasQueryCache.ts`                        | causa, current, hasLoadedDetails, freshList, mergeCausasList, ...                    |
| `src/shared/lib/stores/causasStore.test.ts`                         | makeCausa, overrides                                                                 |
| `src/shared/lib/stores/causasStore.ts`                              | SaveStatus, CausasState                                                              |
| `src/shared/lib/stores/uiStore.ts`                                  | UIState                                                                              |
| `src/shared/lib/types.ts`                                           | UserRole, ChecklistItem, Causa, FaseProcedimental                                    |
| `src/shared/lib/useAppContext.ts`                                   | AppContextValue                                                                      |
| `src/shared/lib/useTimelineContext.ts`                              | TimelineContextValue                                                                 |
| `src/shared/ui/ViewLoader.tsx`                                      | ViewLoaderProps                                                                      |
| `src/shared/ui/viewLoaderPhrases.ts`                                | ViewLoaderView                                                                       |
| `src/widgets/header/Header.tsx`                                     | HeaderProps                                                                          |
| `src/widgets/sidebar/Sidebar.tsx`                                   | SidebarContent, SidebarView, SidebarProps, navigationItems, SidebarContentProps, ... |
| `src/widgets/sidebar/SidebarUserMenu.tsx`                           | SidebarAulaSeguraAlert, SidebarUserMenu                                              |

## Connected Communities

- **features/timeline +28 dirs** (4 cross-edges)
- **. +11 dirs** (2 cross-edges)
- **shared/lib · EstadoCausa** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-365")
explore(operation:"context", task:"understand features/timeline +22 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
