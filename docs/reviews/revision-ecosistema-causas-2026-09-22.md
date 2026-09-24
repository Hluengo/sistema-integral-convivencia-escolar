# Revisión del ecosistema Causas / Expedientes — 2026-09-22

> Archivada desde la revisión de sesión. Corrige dos cifras de la versión
> original en chat: el plazo de indagación es **60 días hábiles** (10 en alta
> complejidad), no 15; el correlativo es **`DC-2026-NNN`**, no `CAU-`.

## 1. Mapa de componentes

```
CausasView / Dashboard
 │
 ├── "Nueva Causa" ──► useNewCausaModalController
 │                      └── NewCausaModalBoundary
 │                           └── NewCausaModal ──► NewCausaForm
 │                                                  ├── RiceConductSelect
 │                                                  └── FormField / Input / Select
 │
 ├── "Incidente Grupal" ──► NewIncidenteModal (N causas vinculadas por incidenteId)
 │
 └── Fila / "Gestionar" ──► CausaDetailModal (Radix Dialog + DetailModalContent)
                             └── InteractiveTimeline (ctx + TimelineProvider)
                                  ├── TimelineHeader (NNA, semáforo plazos, privacidad)
                                  ├── TimelineOverlays (EditCausaModal, ForceClose, Delete)
                                  ├── TimelineTabs (Resumen | Ruta | Bitácora | Expediente)
                                  └── TimelineTabPanels
                                       ├── ResumenTab (KPIs, próximo hito, alertas)
                                       ├── RutaExpedienteTab (stepper 5 fases)
                                       │    └── TimelinePhaseWorkspace ──► ProcessChecklist
                                       ├── BitacoraTab (auditoría cronológica)
                                       └── CausaExpedienteTab (matriz, garantías, export)
```

## 2. Creación — NewCausaModal / NewCausaForm

- Cascada Curso → Estudiante (`useCoursesQuery`/`useStudentsQuery`) con 4
  estados (`newCausaFormState.ts`): `no-course`, `loading`, `has-students`,
  `no-students` (fallback a ingreso manual de nombre + RUT).
- `RiceConductSelect`: autocompleta gravedad, Aula Segura y plantilla de relato.
- Alerta de plazo dinámica (`getMaxPlazoInvestigacionDias`): **60 días
  hábiles**, **10 días hábiles** en alta complejidad (Aula Segura / Muy
  Grave / Gravísima). El 15 es el tope de **suspensión** (Ley 21.809 Art. 16E.j).
- Validación RHF + Zod con dígito verificador de RUT; persiste vía
  `causasStore.handleCreateCausa` con correlativo `DC-2026-NNN` por colegio.

## 3. Gestión — CausaDetailModal / InteractiveTimeline

- `TimelineHeader`: modo privacidad NNA (alias + RUN enmascarado), semáforo de
  plazos (`causaPresentation.ts`), RBAC (docente solo lectura).
- 5 fases: Recepción, Investigación, Resolución, Apelación, Seguimiento.
- `ProcessChecklist` + `CausaNotificationPanel` (carta al apoderado).
- `EditCausaModalForm`: transiciones válidas (`editCausaForm.ts`), suspensión
  con monitoreo pedagógico obligatorio, folio SIE, cierre forzado fundado.
- Autoguardado diferencial con debounce (`useCausasPersistence.ts` +
  `causaPersistence.ts`); estado visible en `SaveStatus`
  (`idle | saving | saved | error`).

## 4. Mejoras aplicadas (2026-09-22)

- **A — Unificación de formularios**: `EditCausaModalForm.tsx` 590 → 534
  líneas; 12 campos migrados a `FormField`/`Input`/`Select` compartidos;
  `FormField` ahora emite `id="{htmlFor}-error"` para `aria-describedby`.
  Tests: `editCausaFormAccessibility.test.ts`.
- **B — Reintento de sincronización**: lo fallido se re-encola
  (`mergePendingCausaSave`) en vez de perderse; `saveRetryNonce` +
  `requestSaveRetry()` en el store; franja `role="alert"` con botón
  **Reintentar** en `TimelineHeader` (rol editable) y botón en `SaveStatus`
  global. Tests: merge (2), nonce (1), cableado estático (4).
- **C — Docs**: `docs/opencode-runbook-causas-modal.md` actualizado (~530
  líneas, tarea A registrada).

## 5. Verificación

- `tsc` + `eslint` limpios; unitarios 839/839.
- e2e: `edit-causa-conducta` 1/1; `accessibility` + `case-flow` 13 pass /
  3 skip preexistentes (axe sin violaciones, incl. modal de edición).
