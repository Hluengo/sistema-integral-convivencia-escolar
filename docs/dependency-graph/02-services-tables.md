# Dependency Graph — Servicios → Tablas

> Mapa de qué servicios escriben/leen qué tablas de Supabase.

## Services Map

```mermaid
graph LR
    subgraph Services
        causasService
        bitacoraService
        checklistService
        annotationsService
        coursesService
        cartasService
        etapasService
        storageService
        disciplinaryStorage
        disciplinaryRules
        authService
    end

    subgraph Supabase Tables
        causas
        bitacora_entries
        checklist_items
        inspectorate_records
        students
        courses
        cartas_disciplinarias
        etapas_disciplinarias
        document_templates
        document_analyses
        disciplinary_processes
        disciplinary_process_files
        disciplinary_annotations_detected
        disciplinary_rules
        profiles
        usage_events
    end

    causasService --> causas
    causasService --> bitacora_entries
    causasService --> checklist_items

    bitacoraService --> bitacora_entries

    checklistService --> checklist_items

    annotationsService --> inspectorate_records
    annotationsService --> document_analyses

    coursesService --> courses
    coursesService --> students

    cartasService --> cartas_disciplinarias

    etapasService --> etapas_disciplinarias

    storageService -.-> documentos_convivencia_bucket
    disciplinaryStorage -.-> disciplinary-processes_bucket

    disciplinaryRules --> disciplinary_rules

    authService --> profiles
```

## Read/Write Matrix

| Service | Tablas que Lee | Tablas que Escribe |
|---------|---------------|-------------------|
| causasService | causas, bitacora_entries, checklist_items | causas, bitacora_entries, checklist_items |
| bitacoraService | bitacora_entries | bitacora_entries |
| checklistService | checklist_items | checklist_items |
| annotationsService | inspectorate_records, students, courses | inspectorate_records, document_analyses |
| coursesService | courses, students | — |
| cartasService | cartas_disciplinarias | — |
| etapasService | etapas_disciplinarias | — |
| disciplinaryRules | disciplinary_rules | — |
| authService | profiles | — |
```

## Supabase RPCs

```mermaid
graph LR
    subgraph RPCs
        get_student_annotation_summary
        get_annotation_stage_counts
        get_suggested_letter_type
        generate_process_number
        current_tenant_id
        current_app_role
    end

    subgraph Tables
        inspectorate_records
        students
        courses
        disciplinary_rules
        disciplinary_processes
        profiles
    end

    get_student_annotation_summary --> students
    get_student_annotation_summary --> inspectorate_records
    get_student_annotation_summary --> courses

    get_annotation_stage_counts --> students
    get_annotation_stage_counts --> inspectorate_records

    get_suggested_letter_type --> disciplinary_rules

    generate_process_number --> disciplinary_processes

    current_tenant_id --> profiles
    current_app_role --> profiles
```
