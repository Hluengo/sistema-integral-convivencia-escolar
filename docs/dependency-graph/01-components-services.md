# Dependency Graph — Componentes → Servicios

> Diagramas Mermaid de dependencias entre capas del frontend.

## 1. Dashboard View

```mermaid
graph TD
    DashboardStats --> MetricCard
    DashboardStats --> AnotacionesDashboardStats
    AnotacionesDashboardStats --> annotationsService.fetchStudentsWithAnnotationCounts
    AnotacionesDashboardStats --> annotationsService.fetchAnnotationStageCounts
    annotationsService --> supabase.rpc.get_student_annotation_summary
    annotationsService --> supabase.rpc.get_annotation_stage_counts
    supabase.rpc --> inspectorate_records
    supabase.rpc --> students
    supabase.rpc --> courses
```

## 2. Causas View

```mermaid
graph TD
    CausasView --> CausaCard
    CausasView --> InteractiveTimeline
    CausasView --> ClosedCases
    InteractiveTimeline --> TimelineHeader
    InteractiveTimeline --> TimelineTabs
    InteractiveTimeline --> TimelineTabPanels
    InteractiveTimeline --> EditCausaModal

    TimelineTabPanels --> ProcesoTab
    TimelineTabPanels --> BitacoraTab
    TimelineTabPanels --> AsistenteIATab

    ProcesoTab --> ProcessChecklist
    ProcesoTab --> RegistrationForm
    ProcessChecklist --> useChecklistRegistration
    useChecklistRegistration --> checklistService.saveChecklist
    checklistService --> supabase.from.checklist_items

    useDocumentManager --> storageService.uploadDocument
    storageService --> supabase.storage.from.documentos_convivencia

    BitacoraTab --> useBitacoraLog
    useBitacoraLog --> bitacoraService.addBitacoraEntry
    bitacoraService --> supabase.from.bitacora_entries

    AsistenteIATab --> AuditPanel
    AsistenteIATab --> DraftPanel
    AuditPanel --> useAuditDraft.fetch_audit
    DraftPanel --> useAuditDraft.fetch_draft
    useAuditDraft --> fetch./api/audit-due-process
    useAuditDraft --> fetch./api/draft-document
    fetch./api/* --> Express/Vercel
    Express/Vercel --> OpenRouter
```

## 3. Anotaciones View

```mermaid
graph TD
    AnotacionesView --> AnotacionesStudentTable
    AnotacionesView --> AnotacionesStudentDetailModal
    AnotacionesView --> NewDisciplinaryProcessModal

    AnotacionesStudentTable --> annotationsService.fetchStudentsWithAnnotationCounts
    annotationsService --> supabase.rpc.get_student_annotation_summary

    AnotacionesStudentDetailModal --> HistoryTab
    AnotacionesStudentDetailModal --> RevisionTab
    AnotacionesStudentDetailModal --> StudentSummaryTab
    AnotacionesStudentDetailModal --> PdfViewer
    HistoryTab --> useDisciplinaryData
    useDisciplinaryData --> supabase.from.inspectorate_records
    useDisciplinaryData --> supabase.from.cartas_disciplinarias
    useDisciplinaryData --> supabase.from.etapas_disciplinarias

    NewDisciplinaryProcessModal --> UploadAnalyzeStep
    NewDisciplinaryProcessModal --> CourseSelectStep
    NewDisciplinaryProcessModal --> StudentSelectStep
    NewDisciplinaryProcessModal --> ClassificationStep
    NewDisciplinaryProcessModal --> ReviewStep

    UploadAnalyzeStep --> disciplinaryStorage.uploadDisciplinaryFile
    UploadAnalyzeStep --> fetch./api/process-disciplinary-pdf
    disciplinaryStorage --> supabase.storage.from.disciplinary-processes

    ClassificationStep --> usePdfProcessing
    usePdfProcessing --> disciplinaryRulesService.fetchDisciplinaryRules
    disciplinaryRulesService --> supabase.from.disciplinary_rules
```

## 4. Document Generator

```mermaid
graph TD
    AnotacionesDocumentGenerator --> DocTypeSelector
    AnotacionesDocumentGenerator --> DocumentForm
    AnotacionesDocumentGenerator --> DocumentPreview
    DocumentForm --> useDocumentState
    DocumentForm --> useSelectedAnnotations
    useDocumentState --> docxBuilder.buildDocument
    docxBuilder --> docx.templates.amonestacion
    docxBuilder --> docx.templates.compromiso
    docxBuilder --> docx.templates.derivacion
    docxBuilder --> docx.helpers.paragraphs
    docxBuilder --> docx.helpers.tables
    docxBuilder --> docx.helpers.signature
    docxBuilder --> docx.helpers.annotations

    useDocumentExport --> fileSaver.saveAs
    useDocumentRegistry --> supabase.from.cartas_disciplinarias
```

## 5. AI Advisor

```mermaid
graph TD
    AdvisorView --> AiAdvisor
    AdvisorView --> TemplateEditor
    AiAdvisor --> AdvisorMessage
    AiAdvisor --> fetch./api/advisor-chat
    TemplateEditor --> supabase.from.document_templates
```

## 6. Students Panel

```mermaid
graph TD
    StudentsPanel --> coursesService.fetchCourses
    StudentsPanel --> coursesService.fetchStudentsWithCourses
    useCoursesQuery --> coursesService.fetchCourses
    useStudentsQuery --> coursesService.fetchStudentsByCourse
    coursesService --> supabase.from.courses
    coursesService --> supabase.from.students
```
