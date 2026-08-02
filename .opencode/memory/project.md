# STAFF ENGINEER MEMORY — Sistema Integral de Convivencia Escolar

> **Versión:** 1.4 | **Estado:** Producción | **Última actualización:** 2026-08-02

---

### 2.0 Configuración institucional y operación multi-tenant

La plataforma permite que el superadministrador gestione múltiples colegios sin pagos dentro de la aplicación. Cada tenant tiene `institution_settings` y `institution_rule_versions`, creados por la migración incremental `20260801100000_add_institutional_configuration.sql`. El bucket privado `institution-assets` almacena logos por tenant mediante URLs firmadas. El panel de administración gestiona el propio tenant; el panel global permite al superadministrador operar cualquier tenant. La validación automatizada usa `npm run test:multitenant` y `npm run test:roles`.

## 1. VISIÓN GENERAL

### Propósito

Sistema SaaS multi-tenant para gestión integral de convivencia escolar en establecimientos educacionales chilenos. Automatiza el debido proceso disciplinario desde la recepción de anotaciones hasta la emisión de cartas y documentos, con cumplimiento garantizado de Circular 482 (2018) y Ley 21.809 (2026).

### Stack Tecnológico

| Capa           | Tecnología                                        | Versión                  |
| -------------- | ------------------------------------------------- | ------------------------ |
| Frontend       | React + TypeScript                                | 19.0.1 / 5.8.2           |
| Build          | Vite                                              | 6.4.3                    |
| CSS            | Tailwind CSS v4                                   | 4.1.14                   |
| State          | Zustand                                           | 5.0.14                   |
| Queries        | TanStack React Query                              | 5.101.2                  |
| Forms          | react-hook-form + Zod                             | 7.82.0 / 4.4.3           |
| Backend (dev)  | Express + tsx                                     | 4.21.2 / 4.21.0          |
| Backend (prod) | Vercel Serverless                                 | esbuild bundle           |
| Database       | Supabase PostgreSQL                               | 17.6.1                   |
| Auth           | Supabase Auth (email/password)                    | —                        |
| AI             | OpenRouter (meta-llama/llama-3.1-8b-instruct)     | —                        |
| Documentos     | docx (Word), pdf-lib + pdfjs-dist (PDF)           | 9.7.1 / 1.17.1 / 6.1.200 |
| Monitoring     | Sentry + PostHog                                  | 10.66.0 / 1.404.1        |
| Tests          | node:test + node:assert/strict + Playwright       | —                        |
| Lint/Format    | TypeScript (tsc), ESLint 9, Prettier 3, Biome 2.5 | —                        |

---

## 2. ARQUITECTURA

### 2.1 Estructura del Proyecto (FSD — Feature-Sliced Design)

```
src/
├── app/              # App entry, providers, global styles
├── features/         # Feature modules (anotaciones, causas, timeline, dashboard, etc.)
├── widgets/          # Composit widgets (Header, Sidebar)
├── shared/           # Shared code (api, lib, ui, hooks, stores, schemas)
│   ├── api/services/ # Supabase data services (canonical)
│   ├── lib/          # Utils, mappers, docx, legalCompliance, domain, hooks
│   ├── ui/           # Shared UI components (Button, Dialog, AlertDialog)
│   └── stores/       # Zustand stores (authStore, causasStore, uiStore, toastStore)
├── components/       # Legacy layer (barrel re-exports for backward compat)
├── hooks/            # Re-exports from shared/lib/hooks/
├── stores/           # Re-exports from shared/lib/stores/
├── services/         # Re-exports from shared/api/services/
├── lib/              # Re-exports from shared/lib/
├── pages/            # LoginPage
├── types/            # Declaration files (.d.ts)
├── domain/           # Pure domain logic (disciplinaryStatus)
└── App.tsx           # Root component (state-driven router)
```

### 2.2 Dual Server Entry Points

| Entry Point                                        | Uso               | Bundle               | Comando         |
| -------------------------------------------------- | ----------------- | -------------------- | --------------- |
| `server/index.ts`                                  | Desarrollo        | tsx runtime          | `npm run dev`   |
| `api/index.js` (generado de `server/api/index.ts`) | Producción Vercel | esbuild bundle (ESM) | `npm run build` |

**Regla crítica:** Implementar cada ruta API una sola vez en `server/api/routes/` y registrarla en ambos entry points. Las implementaciones serverless usan `https` module en vez de `fetch` para Node 18 compat.

### 2.3 Patrón de State Management

```
Zustand (authStore, causasStore, uiStore, toastStore)
  ├── Estado global compartido
  ├── Acciones síncronas (setCausas, setSelectedCausaId)
  └── Side effects on init (authStore subscribe onAuthStateChange)

TanStack React Query (courses, students, causas queries)
  └── Fetching + caching (courses 30min, students 10min, causas list 1min, detalle 5min)
  └── Causas separa caché de listado y detalle por tenant; las mutaciones actualizan sólo la entrada afectada

useReducer (useNewCausaForm form state)
  └── Estado local del formulario wizard

React Context (AppProvider, TimelineProvider)
  └── Composición de stores/hooks para subárboles

Auto-save pipeline (useCausasPersistence)
  └── Debounce 2s → updateCausa + saveBitacora + saveChecklist
```

### 2.4 State-driven Routing (No React Router)

La navegación **NO usa React Router**. Se maneja con una variable `currentView` (tipo `SidebarView`) en `uiStore`. El componente `MainContent` renderiza condicionalmente según el valor:

| View          | Component                                | Feature Module                |
| ------------- | ---------------------------------------- | ----------------------------- |
| `dashboard`   | `<DashboardStats>`                       | `features/dashboard`          |
| `causas`      | `<CausasView>` + `<InteractiveTimeline>` | `features/causas`             |
| `informes`    | `<AdvisorView>` (AI Legal + Templates)   | `features/causas/MainContent` |
| `alumnos`     | `<StudentsPanel>`                        | `features/students`           |
| `anotaciones` | `<AnotacionesView>`                      | `features/anotaciones`        |

**Modals controlados por estado** (sin rutas): `LoginPage`, `NewCausaModal`, `EditCausaModal`, `ShortcutsModal`, `NewDisciplinaryProcessModal`, `AnotacionesStudentDetailModal`.

### 2.5 Lazy Loading

Componentes lazy (React.lazy + Suspense):

- `Sidebar`, `Header`, `MainContent`, `CommandPalette`
- `LoginPage`, `NewCausaModal`, `ShortcutsModal`, `OnboardingTour`
- `InteractiveTimeline`, `EditCausaModal` (dentro de CausasView)
- `AnotacionesStudentDetailModal`, `NewDisciplinaryProcessModal` (dentro de AnotacionesView)
- `AnotacionesDocumentGenerator` (lazy dentro de `CartasTab.tsx`)

---

## 3. DOMINIO DEL NEGOCIO

### 3.1 Entidades Principales

```
Tenant (Establecimiento Educacional)
  ├── id, name, slug, created_at
  │
  ├── Profiles (Usuarios del sistema)
  │   ├── user_id (PK, FK → auth.users)
  │   ├── email, full_name
  │   ├── role: admin | direccion | convivencia | inspectoria | profesor_jefe | teacher | inspector | user | staff
  │   ├── course_ids (UUID[])
  │   └── tenant_id (FK → tenants)
  │
  ├── Courses (Cursos)
  │   ├── id, name
  │   └── tenant_id
  │
  ├── Students (Estudiantes)
  │   ├── id, full_name, rut, course_id, ai_analysis (JSONB)
  │   └── tenant_id
  │
  ├── Causas (Casos disciplinarios)
  │   ├── id, estudiante_curso, estado_actual (39 estados), fecha_ultima_actualizacion
  │   ├── student_id (FK → students)
  │   ├── annotations_count, created_by
  │   └── tenant_id
  │   ├── BitacoraEntries (Historial de acciones)
  │   │   └── tipo: Entrevista | Evidencia | Notificación | Mediación | Resolución | Otro
  │   └── ChecklistItems (Pasos del debido proceso)
  │       └── completado, documento adjunto
  │
  ├── InspectorateRecords (Anotaciones desde inspectoría)
  │   ├── student_id, date_time, observation, severity (Leve|Grave|Muy Grave|Gravísima)
  │   ├── type (Positiva|Negativa|Información), registered_by
  │   ├── pdf_file_path
  │   └── tenant_id
  │
  ├── CartasDisciplinarias
  │   ├── student_id, letter_type (Amonestación|Compromiso|Derivación)
  │   ├── emission_date, status (Vigente|Cumplida|Incumplida|Anulada)
  │   ├── emitted_by, supervisor_name, apoderado_name
  │   ├── content_snapshot (JSONB con textos editados y datos visibles congelados)
  │   └── tenant_id
  │
  ├── CartaEvents
  │   ├── carta_id, student_id, event_type, event_detail
  │   ├── event_type: suggested|created|registered|printed|downloaded_pdf|downloaded_word|processed_manually|annulled
  │   └── tenant_id
  │
  ├── EtapasDisciplinarias
  │   ├── student_id, step_number, stage_name, responsible
  │   └── tenant_id
  │
  ├── DisciplinaryProcesses (Procesos desde PDF)
  │   ├── process_number (DP-YYYY-NNNN), status (draft|pending|approved|rejected|closed)
  │   ├── student_id, course, teacher_name, incident_date, description
  │   ├── suggested_letter_type, final_letter_type
  │   └── total_negativas/positivas/informativas
  │   ├── DisciplinaryProcessFiles (PDFs adjuntos)
  │   │   └── storage_path, file_hash, mime_type, processing_status
  │   └── DisciplinaryAnnotationsDetected (Anotaciones parseadas)
  │       ├── annotation_type, annotation_text, page_number, confidence
  │       └── raw_text, normalized_text, category, classification_method
  │
  ├── DisciplinaryRules (Reglas de negocio para cartas)
  │   ├── rule_type, rule_name, min/max negativas/positivas/informativas
  │   ├── suggested_letter_type, priority
  │   └── tenant_id
  │
  ├── DocumentAnalyses (Análisis AI de PDFs)
  │   ├── file_name, negativas|positivas|informativas count
  │   ├── detected_student_name, detected_course
  │   ├── student_match_status, warnings (JSONB)
  │   └── file_hash, parser_version
  │
  └── DocumentTemplates (Plantillas de documentos AI)
      ├── system_prompt
      └── tenant_id
```

### 3.2 Flujo de Debido Proceso (5 Fases, 39 Estados)

```
RECEPCIÓN (3 estados)
  └── Denuncia recibida → Verificación preliminar → Apertura formal

INVESTIGACIÓN (6 estados)
  └── Notificación apertura → Entrevista descargos → Recopilación evidencias
      → Informe cierre indagación → Análisis jurídico → Vista fiscal

RESOLUCIÓN (6 estados)
  └── Propuesta resolución → Revisión direccion → Notificación resolución
      → Aplicación medidas → Registro medidas → Cierre resolución

APELACIÓN (5 estados)
  └── Notificación apelación → Revisión superiores → Resolución apelación
      → Notificación resultado → Aplicación definitiva

SEGUIMIENTO (4+ estados)
  └── Plan seguimiento → Monitoreo → Evaluación → Cierre formal

# Estados legales adicionales (Ley 21809)
  └── Medidas Provisionales, Acogida Denuncia, Archivo, etc.
```

### 3.3 Sistema de Anotaciones Disciplinarias

```
Clasificación RICE (severidad):
  ├── Leve → Medidas formativas, registro en inspectoría
  ├── Grave → Amonestación por escrito, citación apoderado
  ├── Muy Grave → Compromiso conductual, suspensión (máx 15 días)
  └── Gravísima → Derivación, posible cancelación (Ley Aula Segura 21.128)

Reglas de cartas por cantidad de anotaciones Negativas:
  ├── 0-4 negativas → Sin carta (priority 1)
  ├── 5-9 negativas → Amonestación (priority 2)
  ├── 10-14 negativas → Compromiso (priority 3)
  └── 15+ negativas → Derivación (priority 4)
```

### 3.4 Disciplinary Status (Código de colores)

```
Verde (0-4 negativas o >50% positivas)
Amarillo (5-9 negativas o de 20-50% positivas)
Naranja (10-14 negativas o <20% positivas)
Rojo (15+ negativas)
```

---

## 4. BASE DE DATOS

### 4.1 Esquema Completo (16 tablas del sistema)

| Tabla                               | Propósito                         | RLS | FK Clave                                                |
| ----------------------------------- | --------------------------------- | --- | ------------------------------------------------------- |
| `tenants`                           | Establecimientos educacionales    | ✅  | —                                                       |
| `profiles`                          | Usuarios del sistema              | ✅  | `auth.users(id)`, `tenants(id)`                         |
| `students`                          | Estudiantes                       | ✅  | `courses(id)`, `tenants(id)`                            |
| `courses`                           | Cursos                            | ✅  | `tenants(id)`                                           |
| `causas`                            | Casos disciplinarios              | ✅  | `students(id)`, `tenants(id)`                           |
| `bitacora_entries`                  | Historial de casos                | ✅  | `causas(id)`, `tenants(id)`                             |
| `checklist_items`                   | Checklist debido proceso          | ✅  | `causas(id)`, `tenants(id)`                             |
| `inspectorate_records`              | Anotaciones de inspectoría        | ✅  | `students(id)`, `tenants(id)`                           |
| `cartas_disciplinarias`             | Cartas emitidas                   | ✅  | `students(id)`, `tenants(id)`                           |
| `etapas_disciplinarias`             | Etapas del proceso                | ✅  | `students(id)`, `tenants(id)`                           |
| `document_templates`                | Prompts AI personalizados         | ✅  | `tenants(id)`                                           |
| `document_analyses`                 | Resultados análisis PDF           | ✅  | `students(id)`, `tenants(id)`                           |
| `disciplinary_processes`            | Procesos desde PDF                | ✅  | `students(id)`, `tenants(id)`                           |
| `disciplinary_process_files`        | Archivos PDF adjuntos             | ✅  | `processes(id)`, `tenants(id)`                          |
| `disciplinary_annotations_detected` | Anotaciones parseadas de PDF      | ✅  | `processes(id)`, `students(id)`, `tenants(id)`          |
| `disciplinary_rules`                | Reglas de sugerencia de cartas    | ✅  | `tenants(id)`                                           |
| `usage_events`                      | Eventos de uso del sistema        | ✅  | `auth.users(id)`                                        |
| `carta_events`                      | Trazabilidad de trámite de cartas | ✅  | `cartas_disciplinarias.id`, `students.id`, `tenants.id` |

### 4.2 Reproducibilidad de Migraciones

- `00001_base_schema.sql`: creada para proveer el schema base ausente en el repo local (perfiles, estudiantes, cursos, causas, bitácora, checklist, plantillas). Esto permite que `supabase db reset` en un proyecto nuevo reconstruya la base usando solo `supabase/migrations/`.
- `00002_anotaciones_tables.sql`: corregida para usar `UUID` en las PKs y FKs a `students(id)`, alineándose con el schema real de producción y con las migraciones posteriores (`20260716100100`, `20260724`, etc.).
- El schema local se verificó contra la instancia vinculada (`supabase db query`) y `students.id`, `courses.id`, `profiles.user_id` son UUID; `causas.id`, `document_templates.id`, `bitacora_entries.id`, `checklist_items.id` son TEXT.
- **Limitación local:** Docker no está disponible en este entorno, por lo que `supabase db reset` no se pudo ejecutar localmente. Se validó `supabase db lint` contra el proyecto remoto sin errores.

### 4.2 RLS Policy Map (Patrón Consistente)

```
TODAS las tablas de datos siguen el mismo patrón:
  └── SELECT: tenant_id = current_tenant_id()
  └── INSERT: tenant_id = current_tenant_id()
  └── UPDATE: tenant_id = current_tenant_id()
  └── DELETE: tenant_id = current_tenant_id() (algunas requieren admin/direccion)

Funciones clave para RLS:
  ├── current_tenant_id(): UUID → Lee de JWT app_metadata.tenant_id (fast path)
  │                           Fallback a query profiles table
  └── current_app_role(): TEXT → Lee role de profiles

Excepciones:
  ├── tenants: Políticas por rol (admin puede todo, otros solo su tenant)
  ├── usage_events: INSERT solo propio user_id, SELECT solo admin/direccion
  └── storage.objects: Por bucket + tenant folder

Trigger de JWT sync: sync_tenant_to_jwt() en profiles
  └── AFTER INSERT OR UPDATE OF tenant_id → escribe en auth.users.raw_app_meta_data
```

### 4.3 Storage Buckets

| Bucket                            | Uso                             | Público | Max Size | MIME Types   | Path Pattern                                   |
| --------------------------------- | ------------------------------- | ------- | -------- | ------------ | ---------------------------------------------- |
| `anotaciones`                     | Documentos de anotaciones       | No      | 10 MB    | PDF, MD, TXT | `{tenant_id}/...`                              |
| `disciplinary-processes`          | PDFs de procesos disciplinarios | No      | 10 MB    | PDF          | `{tenant_id}/{student_id}/{process_id}/{name}` |
| `documentos_convivencia` (legacy) | Documentos varios               | No      | —        | —            | Referenciado en storage.service.ts             |

### 4.4 RPCs (Funciones)

| RPC                                    | Retorna | Propósito                                        |
| -------------------------------------- | ------- | ------------------------------------------------ |
| `current_app_role()`                   | TEXT    | Rol del usuario actual                           |
| `is_staff()`                           | BOOLEAN | Check staff-level role                           |
| `current_tenant_id()`                  | UUID    | Tenant actual (JWT fast path)                    |
| `get_student_annotation_summary()`     | TABLE   | Dashboard: students + annotation counts + status |
| `get_annotation_stage_counts()`        | TABLE   | Conteo de estudiantes por etapa disciplinaria    |
| `get_usage_stats(since, until)`        | TABLE   | Stats de uso agregadas                           |
| `get_daily_active_users(since, until)` | TABLE   | DAU por día                                      |
| `get_latest_analysis(p_student_id)`    | TABLE   | Último análisis PDF por estudiante               |
| `generate_process_number(p_tenant_id)` | TEXT    | Genera DP-YYYY-NNNN                              |
| `get_suggested_letter_type(...)`       | TEXT    | Sugiere tipo de carta según reglas               |

---

## 5. API (Express + Vercel Serverless)

### 5.1 Endpoints

| Método | Ruta                                    | Auth | Rate-Limit | AI              | DB Tables                                        |
| ------ | --------------------------------------- | ---- | ---------- | --------------- | ------------------------------------------------ |
| POST   | `/api/advisor-chat`                     | ✅   | 10/min     | ✅ (OpenRouter) | —                                                |
| POST   | `/api/audit-due-process`                | ✅   | 10/min     | ✅ (OpenRouter) | —                                                |
| POST   | `/api/draft-document`                   | ✅   | 10/min     | ✅ (OpenRouter) | `document_templates`                             |
| POST   | `/api/improve-text`                     | ✅   | 10/min     | ✅ (OpenRouter) | —                                                |
| POST   | `/api/parse-annotations`                | ❌   | 10/min     | ❌ (regex)      | —                                                |
| POST   | `/api/process-disciplinary-pdf`         | ✅   | 10/min     | ❌              | `document_analyses`, `students`                  |
| POST   | `/api/process-disciplinary-pdf/confirm` | ✅   | 10/min     | ❌              | `disciplinary_processes`, `files`, `annotations` |
| GET    | `/api/document-templates`               | ❌   | ❌         | ❌              | `document_templates`                             |
| PUT    | `/api/document-templates`               | ✅   | ❌         | ❌              | `document_templates`                             |
| POST   | `/api/usage/events`                     | ✅   | ❌         | ❌              | `usage_events`                                   |
| GET    | `/api/usage/stats`                      | ✅   | ❌         | ❌              | RPCs                                             |

### 5.2 Auth Middleware (`requireAuth`)

```
1. Extraer Bearer token de Authorization header
2. Verificar JWT con HMAC-SHA256 (SUPABASE_JWT_SECRET)
   ├── Intenta raw text + base64-decoded secret
   └── Si falla → fallback a Supabase API /auth/v1/user
3. Validar que el JWT contenga un sub (user_id) válido UUID
4. Consultar profiles para obtener role, full_name, course_ids y tenant_id activo
5. Rechazar 403 si no existe perfil o tenant_id es inválido / no UUID
6. Adjuntar { userId, email, role, tenantId, profile } a req.user
```

**Regla crítica:** `server/api/middleware/auth.ts` re-exporta el middleware canónico de `server/middleware/auth.ts` para evitar drift. El constructor `createRequireAuth({ profileFetcher })` permite inyectar un fetcher de perfiles en tests.

### 5.3 AI Integration (OpenRouter)

```
Proveedor: OpenRouter → meta-llama/llama-3.1-8b-instruct
API Key: OPENROUTER_API_KEY (env)
Temperatura: 0 (determinista)
Max tokens: 2000

Sanitización de input:
  ├── Elimina patrones de prompt injection
  ├── Elimina instrucciones de override
  └── Máximo 10K caracteres

Caching (in-memory):
  ├── advisor-chat → 5 min TTL, SHA256(userId + message + history)
  ├── improve-text → 5 min TTL, SHA256(text)
  └── Máximo 100 entries en cache

Rate Limiting: 10 req/min/IP por endpoint (in-memory Map)
```

---

## 6. FRONTEND

### 6.1 Component Tree

```
<QueryClientProvider>
  <ErrorBoundary>
    <PerformanceProfiler>
      <AuthAnalytics />
      <App>
        <ToastProvider>
          <AppProvider>
            ├── <CommandPalette /> (lazy)
            ├── <Sidebar /> (lazy)
            ├── <Header /> (lazy)
            ├── <MainContent> (lazy)
            │   ├── dashboard → <DashboardStats>
            │   ├── causas → <CausasView> + <InteractiveTimeline> (lazy)
            │   ├── informes → <AdvisorView>
            │   ├── alumnos → <StudentsPanel>
            │   ├── anotaciones → <AnotacionesView> (con modals lazy)
            └── Modals: LoginPage, NewCausaModal, ShortcutsModal, OnboardingTour (todos lazy)
          </AppProvider>
        </ToastProvider>
      </App>
    </PerformanceProfiler>
  </ErrorBoundary>
</QueryClientProvider>
```

### 6.2 Zustand Stores

| Store         | Estado Clave                                              | Acciones                                        | Persistencia                   |
| ------------- | --------------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| `authStore`   | user, tenantId, authLoading, isAuthenticated              | setUser, setShowLoginModal                      | Subscripción onAuthStateChange |
| `causasStore` | causas[], selectedCausaId, saveStatus, filters            | setCausas, handleCreateCausa, handleDeleteCausa | Auto-save debounced 2s         |
| `uiStore`     | currentView, isSidebarCollapsed, privacyMode, currentRole | setCurrentView, toggleSidebar, togglePrivacy    | —                              |
| `toastStore`  | toasts[]                                                  | addToast (4s auto-remove), removeToast          | —                              |

### 6.3 React Query

| Query Key                | Hook               | Stale Time | Enabled      |
| ------------------------ | ------------------ | ---------- | ------------ |
| `['courses']`            | `useCoursesQuery`  | 30 min     | Siempre      |
| `['students', courseId]` | `useStudentsQuery` | 10 min     | `!!courseId` |

**No hay useMutation** — las mutaciones se hacen directamente a servicios Supabase desde los stores y hooks.

### 6.4 Servicios (shared/api/services/)

| Servicio                          | Métodos Clave                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth.service.ts`                 | signInWithEmail, signOut, onAuthStateChange                                                                                                                                                            |
| `causas.service.ts`               | fetchCausas, createCausa, updateCausa, deleteCausa                                                                                                                                                     |
| `bitacora.service.ts`             | fetchBitacora, saveBitacora (delete all + re-insert), addBitacoraEntry                                                                                                                                 |
| `checklist.service.ts`            | saveChecklist (delete all + re-insert)                                                                                                                                                                 |
| `annotations.service.ts`          | fetchAnnotations, fetchDocumentAnalyses, saveAnnotation, fetchStudentsWithAnnotationCounts                                                                                                             |
| `courses.service.ts`              | fetchCourses, fetchStudentsByCourse, fetchStudentsWithCourses                                                                                                                                          |
| `cartas.service.ts`               | fetchCartas, fetchStudentDisciplinarySnapshot, createCartaEvent, markCartaPrinted, markCartaDownloadedPdf, markCartaDownloadedWord, markCartaProcessedManually, annulCarta, resolveCartaWorkflowStatus |
| `etapas.service.ts`               | fetchEtapas                                                                                                                                                                                            |
| `storage.service.ts`              | uploadDocument, listDocuments, deleteDocument (bucket: documentos_convivencia)                                                                                                                         |
| `disciplinary-storage.service.ts` | validateDisciplinaryPdf, uploadDisciplinaryFile, getDisciplinaryFileUrl, deleteDisciplinaryFile                                                                                                        |
| `disciplinary-rules.service.ts`   | fetchDisciplinaryRules                                                                                                                                                                                 |

---

## 7. PDF PROCESSING PIPELINE

### 7.1 Two-step Workflow

**Step 1: `POST /api/process-disciplinary-pdf`** (Analysis)

```
1. Auth validation → requireAuth
2. Download PDF from Supabase Storage (disciplinary-processes bucket)
3. Validate PDF header (%PDF-), size ≤ 10MB
4. SHA-256 hash
5. Text extraction via pdfjs-dist (legacy/build/pdf.mjs)
   ├── Polyfills: DOMMatrix, ImageData, Path2D
   └── Worker: legacy/build/pdf.worker.mjs
6. Metadata extraction (regex):
   ├── extractStudentName() → labelled fields, headings, uppercase
   └── extractCourse() → labelled, normalized number-letter
7. Annotation parsing (regex):
   ├── splitAnnotationBlocks() → by DD/MM/YYYY dates
   ├── classifyAnnotation() → type labels, keyword heuristics
   └── Deduplication by (page, type, date, text)
8. Student matching:
   ├── Exact match (ilike) → 0.99 confidence
   ├── NFD-stripped match → 0.94 confidence
   ├── Word overlap ≥ 50% → variable
   └── Course-based fallback
9. Letter type suggestion via RPC get_suggested_letter_type()
10. Persist to document_analyses
```

**Step 2: `POST /api/process-disciplinary-pdf/confirm`** (Finalize)

```
1. Auth + validation
2. Idempotency check (storagePath + tenantId)
3. Student verification (belongs to tenant)
4. Generate process number via RPC (DP-YYYY-NNNN)
5. Insert: disciplinary_processes (draft) + files + annotations + analyses
```

### 7.2 Known Issues

- **Vercel 500 error**: PDF worker no incluido en bundle. Solución: `vercel.json` con `"includeFiles": "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"`
- **Node polyfills**: `pdfjs-dist` 6.1.200 requiere Node ≥ 22.13.0. Polyfills para DOMMatrix, ImageData, Path2D.
- **StudentId type mismatch**: `inspectorate_records` tiene TEXT id referenciando UUID PK de students (implicit casting).

---

## 8. MULTI-TENANCY

### 8.1 Estrategia

```
Capa 1 — Base de datos: tenant_id column en todas las tablas de datos (10+ tablas)
Capa 2 — RLS: tenant_id = current_tenant_id() en todas las policies
Capa 3 — JWT fast path: app_metadata.tenant_id sincronizado por trigger
Capa 4 — Storage: path pattern {tenant_id}/... para isolation
Capa 5 — Server-side: service_role key bypasses RLS (uso controlado)
```

### 8.2 Roles

| Rol             | Permisos                                  |
| --------------- | ----------------------------------------- |
| `admin`         | Todo: CRUD en todo el tenant              |
| `direccion`     | CRUD (excepto delete en algunas tablas)   |
| `convivencia`   | CRUD en causas, anotaciones, estudiantes  |
| `inspectoria`   | CRUD en inspectorate_records, estudiantes |
| `profesor_jefe` | Lectura + escritura limitada a su curso   |
| `teacher`       | Lectura básica                            |
| `inspector`     | CRUD básico                               |
| `user`          | Lectura básica                            |
| `staff`         | CRUD en causas                            |

---

## 9. DOCUMENT GENERATION

### 9.1 DOCX (Word)

```
src/shared/lib/docx/
├── builder.ts        → Construye documento completo
├── types.ts          → BuildDocxParams interface
├── constants.ts      → Constantes de documento
├── templates/        → Plantillas específicas
│   ├── amonestacion.ts  → Carta de amonestación
│   ├── compromiso.ts    → Carta de compromiso conductual
│   └── derivacion.ts    → Carta de derivación
├── helpers/
│   ├── paragraphs.ts → Párrafos reutilizables
│   ├── tables.ts     → Tablas
│   ├── signature.ts  → Bloques de firma
│   └── annotations.ts → Formateo de anotaciones
└── index.ts          → Entry point
```

### 9.2 PDF (Analysis)

```
Vía servidor:
  pdfjs-dist → Text extraction → Regex parsing → Student matching

Vía cliente (download offline):
  pdf-lib → Download Carta PDF (en AnotacionesDocumentGenerator)
```

### 9.3 AI Drafted Documents (4 tipos)

| Tipo                        | System Prompt                     |
| --------------------------- | --------------------------------- |
| `notificacion_apertura`     | "Eres un asistente experto..."    |
| `citacion_entrevista`       | "Eres un experto..."              |
| `informe_cierre_indagacion` | Prompt en DB (document_templates) |
| `informe_concluyente`       | Prompt en DB (document_templates) |

---

## 10. SEGURIDAD

### 10.1 Auth Flow

```
Login: Email/password → Supabase Auth → JWT session
Server: Bearer token → HMAC verification → Supabase API fallback
Tenant: JWT app_metadata.tenant_id → RLS fast path
Sign-out: supabase.auth.signOut() → limpia sesión
```

### 10.2 JWT Verification Strategy

```
Primary: HMAC-SHA256 (HS256) — rápido, sin HTTP calls
  ├── Intenta raw secret (TextEncoder)
  └── Intenta base64-decoded secret
Fallback: Supabase REST API /auth/v1/user
  └── Para tokens ES256 (migración desde HS256)
```

### 10.3 Privacy Mode

- Estado global en `uiStore.privacyMode`
- Oculta RUTs, nombres completos
- Toggle en Header (UserAvatar)
- **Prop drilling obligatorio:** `privacyMode` se pasa desde `App.tsx` hacia abajo por props (patrón usado en `CausasView`, `AnotacionesView`, `StudentsPanel`). Cualquier vista nueva del dashboard o tabla con nombres de NNA/docentes debe recibirla y aplicar `maskName`/`maskRut` de `shared/lib/anotacionesUtils.ts`.
- **Rankings del dashboard (P-01, resuelto 2026-08-02):** los rankings de docentes/estudiantes mostraron nombres reales con privacidad activada. Se corrigió pasando `privacyMode` desde `MainContent` → `DashboardStats` → `AnotacionesDashboardStats` → rankings, y el mapeo a items vive en `features/anotaciones/annotationRankingCardItems.ts` (`toTeacherCardItems`/`toStudentCardItems`). El curso en el sublabel no se enmascara (no es dato personal). Si se agregan nuevas tarjetas de ranking, deben usar ese helper.
- Los RPCs de Supabase (`get_student_annotation_ranking`, `get_teacher_annotation_ranking`) devuelven nombres reales; **no hay enmascarado server-side** — la protección es responsabilidad del cliente.

### 10.4 Security Headers (vercel.json)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: restrictivo (self + supabase + openrouter/groq)
```

---

## 11. CONVENCIONES DE CÓDIGO

### 11.1 TypeScript

- Strict mode (`noEmit: true`, `isolatedModules: true`)
- `import type` para type-only imports (enforced by ESLint)
- Path alias `@/` → project root
- No `any` (warn enabled)
- Prefer `interface` sobre `type` para objetos públicos

### 11.2 Database

- snake_case en columnas, camelCase en TypeScript (mappers.ts)
- UUIDs como PKs
- `tenant_id` NOT NULL en todas las tablas multi-tenant
- Migraciones incrementales con timestamp naming

### 11.3 UI/UX

- Todo UI en español chileno
- Tailwind CSS v4 con `@theme` en `src/index.css`
- shadcn/ui como referencia visual
- Radix UI para primitives (Dialog, AlertDialog, Select, DropdownMenu, Tabs, Tooltip, Popover)
- Lucide para iconos
- Sonner para toasts
- Mobile-first responsive
- WCAG 2.1 AA via @axe-core/playwright

### 11.4 Testing

- Unit: `node:test` + `node:assert/strict`
- E2E: Playwright
- Coverage: Vitest + @vitest/coverage-v8
- Tests alongside source files (`*.test.ts`)

### 11.5 Git/Commits

- lint antes de commit (husky pre-commit)
- pre-push: lint + test + build
- No commit secrets
- Mensajes descriptivos en español

---

## 12. PROBLEMAS CONOCIDOS

### 12.1 Errores Activos

| Error                                          | Causa                                         | Solución                                                          |
| ---------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Vercel 500 en PDF upload                       | pdf.worker.mjs no incluido en bundle          | ✅ Fixed: vercel.json includeFiles                                |
| JWT ES256 verification                         | Supabase rotación de keys                     | HMAC + API fallback (implementado)                                |
| CSP fonts bloqueados                           | Google Fonts no en CSP                        | Agregar dominios a vercel.json                                    |
| opencode.json corruption                       | Plugins sobreescriben config                  | Restaurar desde git                                               |
| `riceMeasures.test.ts` missing                 | Referencia en package.json a test inexistente | ✅ Fixed: removido de package.json                                |
| `inspectorate_records.student_id` TEXT vs UUID | Migración 00002 usaba TEXT en lugar de UUID   | ✅ Fixed: 00002 corregido a UUID                                  |
| Tests de API endpoints retornan 403            | Auth middleware requería perfil Supabase real | ✅ Fixed: fast-path JWT tenant+role + JWT self-contained en tests |

### 12.2 Deuda Técnica

| Ítem                                        | Impacto                                                                                   | Prioridad |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- | --------- |
| `components/` legacy layer                  | Quedan 14 componentes reales por migrar; 13 barrels están protegidos por test             | Media     |
| No React Router                             | URL no refleja estado, no deep linking                                                    | Media     |
| ManualChunks circular warnings              | Build warnings, posible mejor chunking                                                    | Baja      |
| Dual server routes (server/ + api/)         | Duplicación, riesgo de drift                                                              | Alta      |
| Docker no disponible localmente             | No se puede ejecutar `supabase db reset` ni migraciones locales                           | Media     |
| test:vitest y test corren en paralelo       | Dos test runners                                                                          | Baja      |
| `carta_events.tenant_id` nullable           | RLS policy SELECT usa `tenant_id = current_tenant_id()`; filas con NULL quedan invisibles | Baja      |
| `carta_events.student_id` / `carta_id` TEXT | Inconsistente con `students.id` y `cartas_disciplinarias.id` (UUID)                       | Baja      |

---

## 13. REGLAS PARA FUTURAS SESIONES

### 13.1 Al Modificar Frontend

1. Usar componentes de `shared/ui/` en vez de crear nuevos
2. Estado global en Zustand (no prop drilling > 2 niveles)
3. Queries con React Query (no fetch manual en useEffect)
4. Formularios con react-hook-form + Zod schemas
5. Lazy load modals y vistas pesadas
6. Respetar FSD layers: app → features → widgets → shared → components (legacy)

### 13.2 Al Modificar Backend

1. Implementar la ruta en `server/api/routes/` y registrarla en ambos entry points
2. No exponer service_role key al cliente
3. Rate limit endpoints AI (10 req/min/IP)
4. Sanitizar input con `sanitizeForAI()` antes de enviar a LLM
5. Usar `http` module (no `fetch`) en Vercel serverless

### 13.3 Al Modificar Base de Datos

1. Nunca modificar migraciones existentes
2. Crear nueva migración con timestamp prefix
3. Agregar `tenant_id` con FK a `tenants(id)` en toda tabla multi-tenant
4. Siempre crear RLS policies para cada operación (SELECT/INSERT/UPDATE/DELETE)
5. Agregar índices para columnas de filtro (tenant_id, foreign keys, fechas)
6. Ejecutar migraciones en Supabase antes de deploy

### 13.4 Al Trabajar con AI

1. Validar output AI antes de mostrar al usuario (human confirmation)
2. No enviar datos sensibles de NNA sin anonimizar
3. Cachear respuestas cuando sea posible (advisor-chat, improve-text)
4. Sanitizar input contra prompt injection
5. Usar temperatura 0 para outputs deterministas

### 13.5 Reglas de Oro

1. ✅ Siempre ejecutar `npm run lint` antes de commit
2. ✅ Siempre ejecutar `npm run test` antes de push
3. ✅ No duplicar código — buscar en shared/ primero
4. ✅ No modificar migraciones antiguas — crear nuevas
5. ✅ No exponer secrets ni service_role key
6. ✅ Preservar license headers
7. ✅ Mantener español chileno en UI y docs
8. ✅ Si un cambio toca API, actualizar dev + serverless

### 13.6 Saneamiento de código — Fase 1 y 2 ✅ (2026-08-02)

**Fase 1 (commit `b466eb4`)** — código muerto detectado por knip:

- Eliminados 9 archivos sin consumidores: `components/CausaCard.tsx`, `CausaCardHelpers.tsx`, `features/causas/ui/CausaCard.tsx`, `Header/SearchBar.tsx`, `widgets/header/SearchBar.tsx`, `InteractiveTimeline/MarkdownRenderer.tsx`, `hooks/useNotifications.ts`, `components/ImproveInput.tsx`, `scripts/serve-dist.mjs`.
- Exports muertos backend/frontend removidos (platformUpload, fetchTenantProfiles, FASES_LIST, PHASE_SHORT, buildReportRows, etc.).
- devDep `agent-browser` removida; knip `ignore: []`.

**Fase 2 (commit `2a60fc5`)** — consolidación de capas legacy:

- Colapsados 5 barrels de `server/api/middleware/` hacia el canonical `server/middleware/` (auth, requireMembership, requireRole, requireSuperAdmin, requireTenant); las rutas ahora importan `../../middleware/*`.
- `src/lib/dateUtils.ts` unificado a `src/shared/lib/dateUtils.ts`; `CHILE_TIME_ZONE` centralizado (antes duplicada en `shared/lib/dateTime.ts`).
- Eliminados 39 barrels de re-export legacy (components/ui/_, context/_, hooks/_, stores/_, services/_, domain/_, schemas/index, lib/*) + 2 barrels raíz `src/data.ts` y `src/types.ts`; ~150 consumidores migrados a imports directos de `src/shared/`.
- Directorios legacy vacíos eliminados: `src/hooks`, `src/context`, `src/stores`, `src/services`, `src/domain`, `src/schemas`, `src/components/ui`, `src/lib/legalCompliance`.
- Bug heredado corregido: `reportUtils.ts` usaba `buildReportRows` (eliminado en Fase 1) → restaurado como función local.
- `api/index.js` regenerado con el build (refleja barrels eliminados).

**Reglas para migración de barrels legacy:**

- Los imports deben usar la ruta resuelta correcta (alias `@/` o relativa) hacia el canonical en `src/shared/`.
- Verificar siempre con `npx tsc --noEmit` tras cada lote (los tests `.test.ts` también pueden importar barrels).
- knip solo reporta falsos positivos conocidos: `lighthouserc.cjs` (script `lighthouse:ci`) y binario `gitleaks` (script `security:secrets`).

---

## 14. ESTADO DE SESIÓN — Cierre documental Fase 0 (2026-07-25)

### Fase 0 — Contención de acceso anónimo ✅ Cerrada

**Orden real de aplicación:**

| #   | Migración        | Propósito                                                                                                 |
| --- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `20260726000001` | current_tenant_id(), REVOKE tablas, DROP policies públicas, Storage privado                               |
| 2   | `20260726000003` | REVOKE EXECUTE directo RPCs sensibles (correctiva: DO block no revocó ACL directas)                       |
| 3   | `20260726000002` | SET search_path=public,pg_temp en 4 funciones SECURITY DEFINER                                            |
| 4   | `20260726000004` | REVOKE EXECUTE anon/authenticated en 4 funciones SECURITY DEFINER (correctiva: ACL directas persistieron) |

**Resultados confirmados:**

- `current_tenant_id()` retorna NULL para anon
- anon sin SELECT en tablas escolares
- anon sin EXECUTE en RPCs sensibles
- No quedan policies public/anon con USING(true) o WITH CHECK(true)
- Buckets sensibles en public=false
- SECURITY DEFINER con search_path=public, pg_temp
- anon y authenticated sin EXECUTE en funciones internas
- service_role conserva EXECUTE

**Riesgos residuales:**

- Overloads teacher_get_public_absences → 300 para authenticated sin ruta explícita
- Vista Docente sin login deshabilitada temporalmente
- Tablas de Inasistencias sin tenant_id
- Esquema remoto no reconciliado
- Migraciones históricas (001, 002, 003) no deben aplicarse en bloque

**Próximo paso:** Fase 1 — Reconciliación canónica del esquema remoto compartido.

### Fase 0.5b — Tenant resolution + Storage signed URLs + Profile trigger (2026-07-25) ✅

**Problema:** Inasistencias hardcodeaba `tenant_id: '00000000-0000-0000-0000-000000000001'` en `inspectorateService.ts`, usaba `getPublicUrl()` en bucket 'documents' (público), y su `handle_new_user_profile()` no incluía `tenant_id`, causando conflictos con Convivencia.

**Bloque 1 — Storage signed URLs:**

- `src/utils/upload.ts`: Reemplazado `getPublicUrl()` por `createSignedUrl()` con expiración de 7 días
- Eliminada función auxiliar `extractPublicUrl()`

**Bloque 2 — Hardcoded tenant_id:**

- `src/services/inspectorateService.ts`: Eliminado `tenant_id: '00000000-0000-0000-0000-000000000001'` de `createInspectorateRecord`. Ahora depende de DEFAULT `current_tenant_id()` en la columna.

**Bloque 3 — Migración `20260727000001_fase_05b_tenant_storage_profile.sql`:**

1. `ALTER COLUMN tenant_id SET DEFAULT current_tenant_id()` en 10 tablas multi-tenant
2. Update `handle_new_user_profile()` para leer `tenant_id` de `raw_user_meta_data` con fallback a `current_tenant_id()` y default tenant
3. Bucket 'documents' cambiado a `public = false` con RLS tenant-aware (por carpeta `{tenant_id}/...`)
4. Revoke PUBLIC en `handle_new_user_profile()`

**Bloque 4 — Vista Docente modo mantenimiento:**

- `src/hooks/queries/teacher-public.ts`: Detección de RPC no encontrado (códigos PGRST202, 42883, 42P13) → retorna array vacío en vez de error
- `src/pages/DocentePublico.tsx`: Banner de mantenimiento con icono Construction cuando RPC no disponible

**Bloque 5 — Tests:**

- `absenceService.integration.test.ts`: Mock actualizado de `getPublicUrl` → `createSignedUrl`
- Resultado: 120/120 Inasistencias, 136/136 Convivencia

**Archivos modificados:**

| Archivo                                                                                                       | Cambio                          |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `registroinasistencia/src/services/inspectorateService.ts`                                                    | Eliminado tenant_id hardcodeado |
| `registroinasistencia/src/utils/upload.ts`                                                                    | getPublicUrl → createSignedUrl  |
| `registroinasistencia/src/hooks/queries/teacher-public.ts`                                                    | Mantenimiento RPC no encontrado |
| `registroinasistencia/src/pages/DocentePublico.tsx`                                                           | Banner mantenimiento            |
| `registroinasistencia/src/hooks/queries.ts`                                                                   | Export rpcMaintCheck            |
| `registroinasistencia/src/hooks/queries/index.ts`                                                             | Export rpcMaintCheck            |
| `registroinasistencia/src/services/absenceService.integration.test.ts`                                        | Mock createSignedUrl            |
| `sistema-integral-convivencia-escolar/supabase/migrations/20260727000001_fase_05b_tenant_storage_profile.sql` | Nueva migración                 |
| `sistema-integral-convivencia-escolar/.ai/roadmap.md`                                                         | Fase 0.5b ✅                    |
| `sistema-integral-convivencia-escolar/.opencode/memory/project.md`                                            | Esta sección                    |

**Riesgos residuales:**

- `handle_new_user_profile()` y `handle_new_user()` coexisten; Convivencia corre primero (orden alfabético)
- Si se deshabilita el trigger de Convivencia, el de Inasistencias es funcional (tiene tenant_id ahora)
- Vista Docente muestra datos vacíos si RPC no disponible (no crash)
- Bucket 'documents' requiere migración aplicada antes de funcionar con signed URLs

### Archivos modificados en esta sesión

| Archivo                                                     | Cambio                                         |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `docs/shared-supabase/00-emergency-containment.md`          | Cierre documental Fase 0, riesgos residuales   |
| `docs/shared-supabase/02-emergency-validation-checklist.md` | Checklist marcado completo, registro de cierre |
| `.ai/roadmap.md`                                            | Fase 0 ✅, Fase 1 como próximo paso            |
| `.opencode/memory/project.md`                               | Esta sección                                   |

### Fase 1 — Auth + Tenant ✅ Cerrada

- Middleware auth reescrito con `createRequireAuth`, `ProfileFetcher` inyectable, validación UUID.
- `server/api/middleware/auth.ts` re-exporta el middleware canónico.
- 22 tests de auth pasando.
- Schema reproducible desde `supabase/migrations/`.

### Fase 1 Supabase — Reconciliación canónica del esquema compartido ✅ Cerrada (2026-07-26)

**Objetivo:** Cerrar documentalmente el estado remoto post-Fase 0 + Fase 0.5b, reconciliar migraciones, establecer propiedad de objetos, preparar arquitectura de Fase 2.

**Inventario remoto completado:**

- 25 tablas/vistas (compartidas, Convivencia, Inasistencias, legacy)
- 28 funciones (26 únicas) clasificadas por aplicación consumidora y riesgo
- 4 buckets storage (149 + 39 + 24 + 3 objetos)
- 76 índices documentados
- 98 policies analizadas (84 public + 14 storage)

**Documentación creada:**

| Archivo                                                  | Propósito                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `docs/shared-supabase/04-canonical-object-ledger.md`     | Adoption ledger: 60+ objetos clasificados por propiedad y riesgo |
| `docs/shared-supabase/05-migration-reconciliation.md`    | Reconciliación: cronología, deriva, política forward-only        |
| `docs/shared-supabase/06-canonical-baseline-20260727.md` | Línea base canónica post-Fase 0.5b                               |
| `docs/shared-supabase/07-code-consumption-matrix.md`     | ~58 referencias de código mapeadas en ambos repositorios         |
| `docs/shared-supabase/08-phase-2-membership-design.md`   | Arquitectura applications + app_memberships                      |
| `supabase/validation/phase-1-baseline-validation.sql`    | 20 consultas de validación read-only                             |

**Migraciones reconciliadas:**

- 46 migraciones locales analizadas (34 Convivencia + 12 Inasistencias)
- 9 aplicaciones manuales documentadas con orden real (4 Fase 0 + 5 Fase 0.5b)
- Deriva documentada: solo 3/55 migraciones registradas en `schema_migrations`
- Política forward-only: Convivencia como único origen, no reaplicación masiva

**Phase 2 preparada (sin aplicar):**

- `20260728000001_create_applications.sql`
- `20260728000002_create_app_memberships.sql`
- `20260728000003_seed_applications.sql`
- `20260728000004_prepare_membership_backfill.sql`
- `20260728000005_create_initial_memberships_inasistencias.sql`
- `20260728000006_create_initial_memberships_convivencia.sql`

**Validación local:**

- Convivencia: lint ✅, 136 tests ✅, build:web ✅
- Inasistencias: lint ✅, 120 tests ✅, build ✅

**Restricciones respetadas:**

- No se modificó Supabase remoto
- No se ejecutó SQL de escritura
- No se aplicaron migraciones nuevas
- No se reejecutaron migraciones antiguas
- No se usó db push / db reset / migration up
- No se hizo deploy / commit / push
- No se abrió data.sql

**Próximo paso:** Fase 2 — Aplicar al remoto.

### Archivos modificados/creados en esta sesión (Fase 1 Supabase)

| Archivo                                                     | Cambio                                   |
| ----------------------------------------------------------- | ---------------------------------------- |
| `docs/shared-supabase/00-emergency-containment.md`          | Agregado cierre Fase 1 como próximo paso |
| `docs/shared-supabase/02-emergency-validation-checklist.md` | Agregadas secciones Fase 0.5b + Fase 1   |
| `docs/shared-supabase/03-post-containment-stabilization.md` | Marcado como cerrado                     |
| `docs/shared-supabase/04-canonical-object-ledger.md`        | **Nuevo** — Adoption ledger              |
| `docs/shared-supabase/05-migration-reconciliation.md`       | **Nuevo** — Migration reconciliation     |
| `docs/shared-supabase/06-canonical-baseline-20260727.md`    | **Nuevo** — Canonical baseline           |
| `docs/shared-supabase/07-code-consumption-matrix.md`        | **Nuevo** — Code consumption matrix      |
| `docs/shared-supabase/08-phase-2-membership-design.md`      | **Nuevo** — Phase 2 membership design    |
| `supabase/validation/phase-1-baseline-validation.sql`       | **Nuevo** — Baseline validation script   |
| `supabase/migrations/20260728*.sql`                         | **Nuevo** (6) — Draft Phase 2 migrations |
| `.ai/roadmap.md`                                            | Fase 1 ✅, Fase 2 como próximo           |
| `.opencode/memory/project.md`                               | Esta sección                             |

### Fase 2 — Applications + Memberships ⏳ Implementación local (2026-07-26)

**Estado:** Código completo, pendiente de aplicación en Supabase.

**Decisiones arquitectónicas:**

| Decisión                                                    | Fundamento                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backfill solo no ambiguos                                   | teacher→inasistencias, direccion/convivencia→convivencia. Staff, admin, etc. requieren revisión |
| RLS en tenants con current_tenant_id() + current_app_role() | Consistente con Fase 0/0.5b, sin USING(true)                                                    |
| app_memberships solo SELECT own                             | Usuario solo ve sus propias membresías; service_role administra                                 |
| helpers con SECURITY DEFINER                                | Necesario para RLS bypass controlado; search_path bloqueado                                     |
| Feature flag = false                                        | profiles.role sigue como fallback; cero impacto en usuarios                                     |
| Middleware no conectado                                     | Implementado pero no activo en rutas productivas                                                |

**Archivos de migración:**

| #     | Archivo                                                       | Propósito                                             |
| ----- | ------------------------------------------------------------- | ----------------------------------------------------- |
| 00001 | `20260728000001_create_applications.sql`                      | Tabla catálogo con RLS, CHECK, grants                 |
| 00002 | `20260728000002_create_app_memberships.sql`                   | Tabla membresías con índices, trigger updated_at, RLS |
| 00003 | `20260728000003_seed_applications.sql`                        | Seed convivencia + inasistencias                      |
| 00004 | `20260728000004_prepare_membership_backfill.sql`              | Vista readiness (solo service_role)                   |
| 00005 | `20260728000005_create_initial_memberships_inasistencias.sql` | Backfill teacher→inasistencias                        |
| 00006 | `20260728000006_create_initial_memberships_convivencia.sql`   | Backfill direccion/convivencia→convivencia            |
| 00007 | `20260728000007_enable_membership_tables_and_tenants_rls.sql` | RLS hardening                                         |
| 00008 | `20260728000008_create_membership_helpers.sql`                | current_user_memberships(), has_app_access()          |

**Archivos de validación:**

| Archivo                                                       | Propósito                |
| ------------------------------------------------------------- | ------------------------ |
| `supabase/validation/phase-2-pre-application-validation.sql`  | 14 checks pre-migración  |
| `supabase/validation/phase-2-post-application-validation.sql` | 23 checks post-migración |
| `supabase/validation/phase-2-membership-rls-tests.sql`        | 15 pruebas RLS manuales  |

**Cambios en Convivencia:**

| Archivo                                         | Tipo       |
| ----------------------------------------------- | ---------- |
| `src/shared/api/types/membership.ts`            | Nuevo      |
| `src/shared/api/services/membership.service.ts` | Nuevo      |
| `src/shared/api/hooks/useMemberships.ts`        | Nuevo      |
| `src/shared/lib/stores/authStore.ts`            | Modificado |
| `server/middleware/requireMembership.ts`        | Nuevo      |
| `server/api/middleware/requireMembership.ts`    | Nuevo      |
| `.env.local`                                    | Modificado |

**Cambios en Inasistencias:**

| Archivo                             | Tipo       |
| ----------------------------------- | ---------- |
| `src/types/membership.ts`           | Nuevo      |
| `src/services/membershipService.ts` | Nuevo      |
| `src/hooks/useAuth.ts`              | Modificado |
| `.env.local`                        | Modificado |

**Documentación nueva:**

| Archivo                                                  | Propósito                         |
| -------------------------------------------------------- | --------------------------------- |
| `docs/shared-supabase/10-membership-backfill-review.md`  | Backfill review con datos remotos |
| `docs/shared-supabase/11-phase-2-implementation-plan.md` | Orden manual de aplicación        |

**Restricciones respetadas:**

- No se modificó Supabase remoto
- No se ejecutó SQL de escritura
- No se aplicaron migraciones nuevas
- No se hizo deploy / commit / push

### Fase 2 — Applications + Memberships ✅ Cerrada y reconciliada (2026-07-28)

**Estado:** Fase 2 completa — migraciones reconciliadas, RLS y smoke tests aprobados.

**Migraciones aplicadas (9) — reconciliadas con remoto:**

- 00001: `applications` tabla con RLS
- 00009: `revoke_applications_default_privileges` (correctiva, aplicada 2da en remoto)
- 00002: `app_memberships` tabla con índices y RLS
- 00003: Seed convivencia + inasistencias
- 00004: Vista `membership_readiness`
- 00005: Backfill teacher→inasistencias
- 00006: Backfill direccion/convivencia→convivencia (no-op)
- 00007: RLS hardening
- 00008: Helpers `current_user_memberships()`, `has_app_access()`

**Validaciones remotas completadas:**

- RLS activo en applications, app_memberships, tenants
- ACL verificado con `has_table_privilege`: anon=none, authenticated=SELECT, service_role=ALL
- authenticated SELECT restringido, sin INSERT/UPDATE/DELETE
- service_role con administración completa
- membership_readiness solo service_role/postgres
- helpers con search_path seguro, SECURITY DEFINER, sin EXECUTE para anon
- backfill: 1 membership (inasistencias/teacher), sin duplicados, staff excluido

**Smoke tests:**

- Convivencia flag=false: ✅ PASSED (7.0s)
- Inasistencias flag=false: ✅ PASSED (12.4s)
- Inasistencias flag=true: ✅ PASSED (12.3s)

**Estado de transición:**

- profiles.role continúa como fallback temporal
- requireMembership middleware implementado pero no aplicado globalmente
- Feature flag VITE_APP_MEMBERSHIPS_ENABLED=false (debe permanecer false en producción)
- Vista Docente continúa en mantenimiento (Fase 0.5b)

**Deuda siguiente (Fase 3):**

- Decidir membership/role del perfil staff
- Activar enforcement solo en desarrollo
- Conectar requireMembership a rutas seleccionadas
- Retirar gradualmente profiles.role

**Documentación:**

- `docs/shared-supabase/12-phase-2-closure.md`: Cierre formal reconciliado
- `docs/shared-supabase/12-phase-2-security-review.md`: Revisión de seguridad reconciliada
- `docs/shared-supabase/PHASE-2-DELIVERY-REPORT.md`: Informe de entrega reconciliado
- `docs/shared-supabase/08-phase-2-membership-design.md`: Actualizado a completada
- `docs/shared-supabase/11-phase-2-implementation-plan.md`: Actualizado con 9 migraciones
- `.ai/roadmap.md`: Fase 2 marcada como completada y reconciliada

### Fase 3 — Controlled Membership Enforcement ✅ Completada (2026-07-26)

**Estado:** Fase 3 completa — 3 modos de autenticación implementados, validación aprobada.

**Modos de autenticación:**

| Modo       | `MEMBERSHIPS_ENABLED` | `MEMBERSHIPS_ENFORCED` | Comportamiento                                            |
| ---------- | --------------------- | ---------------------- | --------------------------------------------------------- |
| legacy     | `false`               | *                      | Sin verificación. Usa `profiles.role`. Sin carga.         |
| transition | `true`                | `false`                | Verifica membresía. Fallback a `profiles.role` si denied. |
| enforced   | `true`                | `true`                 | Solo membresía activa. Sin fallback.                      |

**Archivos creados (Convivencia):**

- `src/shared/api/lib/membershipConfig.ts` — Config helpers
- `src/shared/ui/MembershipLoading.tsx` — Loading state con timeout
- `src/shared/ui/MembershipAccessDenied.tsx` — Denied state con retry/logout
- `src/shared/ui/MembershipFallbackWarning.tsx` — Warning banner transition mode
- `src/shared/ui/index.ts` — Barrel export
- `docs/shared-supabase/13-staff-membership-decision.md` — Staff membership decision
- `docs/shared-supabase/14-phase-3-transition-enforcement.md` — Phase 3 report

**Archivos modificados:**

- Convivencia: types, membership service, useMemberships hook, authStore, App.tsx, server middleware
- Inasistencias: types, membershipService, useAuth, App.tsx
- Both: `.env.local` con nuevas variables

**Variables de entorno nuevas:**

- `VITE_APP_MEMBERSHIPS_ENFORCED=false`
- `VITE_APP_MEMBERSHIPS_ALLOW_LEGACY_FALLBACK=true`

**Validación:**

- Convivencia: lint ✅, 136/136 tests ✅, build ✅
- Inasistencias: tsc ✅, 120/120 tests ✅, build ✅

**Pendiente:**

- Staff membership decision (`docs/shared-supabase/13-staff-membership-decision.md`)
- Activar `VITE_APP_MEMBERSHIPS_ENABLED=true` en desarrollo
- Probar transition mode con usuarios existentes

**Documentación:**

- `docs/shared-supabase/13-staff-membership-decision.md`: Staff membership decision
- `docs/shared-supabase/14-phase-3-transition-enforcement.md`: Phase 3 report
- `.ai/roadmap.md`: Fase 3 marcada como completada

### Constancias físicas de cartas disciplinarias (2026-07-28)

- La pestaña Carta de la ficha individual registra Amonestación o Compromiso ya emitidos en papel.
- `cartas_disciplinarias.origin` distingue `platform` y `physical`; `school_year` limita el efecto al año de la carta.
- `register_physical_carta` es un RPC `SECURITY INVOKER` exclusivo de `authenticated`, con aislamiento por `current_tenant_id()`.
- La constancia usa `annotations_count = 0`: no crea ni altera anotaciones y no abre el generador.
- Progresión anual: Amonestación física habilita Compromiso; Compromiso físico habilita Derivación.

### Estado efectivo de cartas en Anotaciones (2026-07-28)

- La tabla, sus filtros y la exportación combinan el tramo de anotaciones con la carta realizada de mayor nivel del año vigente.
- Una Derivación `processed_manually` prevalece sobre el tramo numérico; el conteo de anotaciones no se modifica.
- `status = Vigente` conserva su significado administrativo. La UI obtiene `Pendiente` o `Procesada` desde `carta_events`.
- Al procesar o registrar una carta desde la ficha individual se recargan tanto el modal como la tabla principal.
- Abrir o reabrir el generador no inserta eventos en el historial.
- Los eventos preliminares históricos `created` y `suggested` se conservan en Supabase, pero no se muestran.
- Las cartas pendientes no generan entradas sintéticas; aparecen en el historial al procesarse, registrarse, imprimirse mediante el flujo histórico o anularse.

### Resumen y comparación de actualizaciones PDF (2026-07-29)

- `get_student_annotation_summary()` es la fuente canónica de los conteos de la tabla de Anotaciones; agrega negativas, positivas e informativas dentro de PostgreSQL sin depender del límite de filas de PostgREST.
- `last_annotation_date` corresponde a la fecha de la anotación más reciente de cualquier tipo, no a la fecha de carga del PDF.
- El fallback del cliente pagina explícitamente `inspectorate_records` y solo se ejecuta si el RPC no está disponible.
- Al analizar una actualización se comparan el último PDF confirmado y el PDF nuevo por categoría; la diferencia se presenta como variación porque la confirmación todavía puede omitir duplicados.
- Las fechas civiles se muestran sin conversión UTC y los timestamps se presentan con la zona IANA `America/Santiago`, respetando automáticamente horario de invierno y verano.

### Historial manual y KPI de Anotaciones (2026-07-29)

- La pestaña Historial de la ficha individual admite entradas manuales con título y descripción.
- `student_history_entries` es multi-tenant, conserva `created_by` y es append-only para usuarios autenticados: permite lectura e inserción, no actualización ni eliminación.
- Una entrada manual documenta entrevistas, acuerdos o seguimientos, pero no altera anotaciones, cartas ni etapas disciplinarias.
- `get_annotation_stage_counts()` entrega `total_count`, `pending_count` y `processed_count` para Sin Carta, Amonestación, Compromiso y Derivación.
- La etapa efectiva es el máximo entre el tramo de anotaciones negativas y la carta completada de mayor nivel del año escolar vigente.
- Una etapa se considera procesada solo cuando su carta efectiva vigente tiene evidencia de registro, impresión, procesamiento manual u origen físico; si el conteo exige una etapa superior, esta queda pendiente.
- El año escolar y las fechas operativas se resuelven con la zona IANA `America/Santiago`.

### Correcciones de auditoría técnica aplicadas (2026-07-31)

- Las migraciones `20260731000020`, `20260731000030`, `20260731180716`, `20260731190539` y `20260731191230` ya fueron aplicadas en Supabase remoto.
- Storage autoriza los roles `convivencia` y `direccion` para los buckets disciplinarios, respetando tenant y membresía activa.
- Conteos, etapas y rankings usan el año escolar vigente en `America/Santiago`; los rankings normalizan claves de docentes/cursos y no mezclan fuentes de fallback.
- El cliente no usa fallback paginado para KPIs/rankings cuando falla la RPC: expone el error para evitar datos inconsistentes.
- La auditoría técnica quedó validada localmente con lint, 295 tests y build de producción exitosos.

### Optimizaciones de rendimiento aplicadas (2026-07-31)

- `useAppContext` y `useMemberships` usan selectores parciales de Zustand; las listas derivadas de causas se memoizan por referencia del arreglo.
- KPIs y rankings del dashboard usan `staleTime` de 30 segundos y conservan invalidación selectiva tras escrituras.
- Sentry, PostHog y Web Vitals se inicializan dos segundos después del primer render.
- Las pestañas Resumen, Ruta y Bitácora del timeline usan `React.memo` sin alterar el flujo de autoguardado.
- Las fuentes jurídicas normalizan su texto una sola vez por instancia para reducir CPU al puntuar consultas AI.

### Auditoría técnica inmutable (2026-07-31)

- `public.audit_events` es un registro técnico append-only, separado de `audit-due-process`, que continúa siendo una auditoría asistida por IA.
- La tabla conserva tenant, usuario responsable, acción, entidad, identificador, valores anteriores/nuevos y fecha; tiene índices por tenant, usuario, entidad y fecha.
- RLS permite lectura e inserción solo a usuarios autenticados con rol operativo dentro de su tenant; no hay privilegios de UPDATE/DELETE y un trigger rechaza mutaciones incluso privilegiadas.
- La migración local es `supabase/migrations/20260731200000_create_immutable_audit_events.sql`; sus comprobaciones están en `supabase/validation/audit-events-security-tests.sql`.

### Fase B — Gestión de miembros (2026-07-31)

- La administración de usuarios usa `profiles` y `app_memberships`; `profiles.is_active` y `app_memberships.is_active` se actualizan juntos para activar o desactivar acceso.
- Las invitaciones se registran en `membership_invitations` y se envían mediante Auth Admin exclusivamente desde el servidor; reenvío y cancelación quedan disponibles para `admin` y `direccion`.
- Los cambios administrativos se registran en `audit_events`; el backend valida nuevamente el rol y tenant con service role y nunca expone la clave secreta al cliente.
- No se permite degradar ni desactivar al último administrador activo. Validaciones SQL: `supabase/validation/phase-b-membership-security-tests.sql`.

### Fase C — Centro de notificaciones persistido (2026-07-31)

- `public.notifications` conserva notificaciones por usuario y tenant con estado de lectura, historial, filtros por vencimiento y enlace a entidad.
- `sync_notification()` actualiza alertas derivadas por `notification_key` sin resetear `read_at`; RLS limita lectura/escritura al usuario y tenant actuales.
- `useNotifications` mantiene la lógica pura de generación separada de `usePersistentNotifications`, evitando dependencias Supabase en tests unitarios.
- El dropdown ofrece activas, sin leer e historial; Realtime queda deliberadamente fuera hasta validar la versión persistida.

### Fase D — Centro de reportes (2026-07-31)

- `public.report_history` conserva quién generó cada reporte, fecha, filtros, estado, cantidad de filas y nombre de archivo; es independiente de `audit_events` y `audit-due-process`.
- El Centro de reportes reutiliza `Causa[]`, filtros operativos y `write-excel-file`; el historial no duplica datos personales de estudiantes.
- RLS limita el historial al tenant actual y a roles `admin`, `direccion`, `convivencia` e `inspectoria`; no se permite borrar reportes.
- La migración pendiente es `supabase/migrations/20260731230000_create_report_history.sql`. El modelo de estado (`queued`, `processing`, `completed`, `failed`) deja preparado el procesamiento asíncrono para exportaciones pesadas sin inventar un worker en esta fase.

### Fase E — Multi-tenant de plataforma + refactor visual ReportsCenter (2026-07-31)

- Refactor visual: `SummaryCard` extraído a `src/shared/ui/SummaryCard.tsx` y reutilizado en `AdminView` y `PlatformView`; `ReportsCenter.tsx` unifica su lenguaje visual (eyebrow/H2/badge/tabs/pills `rounded-full`/tabla `divide-y divide-neutral-100`) con el patrón de `AdminView`, usando `formatChileDateTime` (timezone `America/Santiago`). Comportamiento intacto.
- Rol `superadmin`: migración `supabase/migrations/20260801000000_create_superadmin_role.sql` amplía `profiles_role_check`, backfill idempotente de `superusuario@colegio.cl` y policies RLS para lectura transversal de tenants/profiles. El correo NO se hardcodea en middleware: la identificación es solo por rol.
- `requireSuperAdmin` (`server/middleware/requireSuperAdmin.ts` + reexport en `server/api/middleware/`) es middleware Node cross-tenant; `requireAuth` inyecta `tenantId + profileRole`. `VALID_ROLES` incluye `superadmin` para el JWT fast-path.
- `server/api/routes/platform.ts` orquesta el aprovisionamiento en Node (NO existe RPC Postgres): insert tenant → `inviteUserByEmail` con `raw_user_meta_data.tenant_id` → update profile + `app_memberships` (upsert `onConflict`) → copia `document_templates` del tenant default con ids nuevos → `audit_events` (requiere `actor_user_id` explícito con service role). Incluye `POST /platform/tenants/:id/import` (multer memoryStorage, 5MB).
- `server/api/services/excelImport.ts` parsea `.xlsx` (hojas «Cursos» y «Estudiantes»; deriva cursos si solo hay «Estudiantes»), normaliza nivel (BÁSICA/MEDIA), RUT (`normalizeRut` limpia guiones líderes) y deduplica por RUT en `runImport`; `POST /admin/import` reutiliza el flujo para el tenant actual. Tests: `excelImport.test.ts` con fixture real vía `write-excel-file/node` (302 tests pasando).
- Frontend: `PlatformView.tsx` (tabs Colegios/Importar base/Plan y límites, sin Stripe), `platform.service.ts`, `SidebarView` incluye `'platform'`, guard en `App.tsx` (`canAccessPlatform = effectiveAdminRole === 'superadmin'`), `VIEW_TITLES` con entrada `platform`, `MainContent` lazy-carga `PlatformView`. `AdminView` añadió pestaña `import` (Upload/Download + `importOwnTenantBase`).
- Verificación módulo: typecheck ✅, lint ✅, 302 tests ✅, `build:web` ✅, `git diff --check` sin errores. E2E configurado y ejecutándose (ver entrada E2E abajo). Pendiente: validación manual de los snippets RLS (`supabase/validation/platform-superadmin-rls-tests.sql`).

### E2E (Playwright) — configuración y estado (2026-07-31)

- `playwright.config.ts` carga `.env.local` vía `dotenv`; `E2E_BASE_URL` por defecto `http://localhost:3001` y `webServer` levanta `npm run dev` solo si no hay servidor corriendo (`reuseExistingServer: true`).
- Variables E2E documentadas en `.env.example` y activas en `.env.local`: `E2E_BASE_URL`, `E2E_STAFF_EMAIL=usuario@colegio.cl`, `E2E_STAFF_PASSWORD=123456` (credenciales válidas contra el Supabase remoto), `E2E_SUPERADMIN_EMAIL`/`E2E_SUPERADMIN_PASSWORD` (comentadas).
- `tests/platform.spec.ts` (nuevo): verifica que la vista Plataforma no está disponible para anónimos; los tests de superadmin se omiten sin `E2E_SUPERADMIN_*`.
- `tests/case-flow.spec.ts`: corregido — navega a la vista Causas antes de buscar el botón "Nueva Causa" (el login aterriza en Dashboard).
- Estado: `npm run test:e2e` → 24 passed, 2 skipped (superadmin sin credenciales); typecheck y lint ✅.
- Migración `20260801000000_create_superadmin_role.sql` aplicada manualmente al Supabase remoto por el usuario (SQL Editor del dashboard; la CLI local daba 403 en el management API y no hay `SUPABASE_DB_PASSWORD`). Verificado: `superusuario@colegio.cl` con `role='superadmin'` y constraint que acepta `superadmin`.
- Credenciales E2E activas en `.env.local`: `E2E_STAFF_EMAIL=usuario@colegio.cl`/`E2E_STAFF_PASSWORD=123456` y `E2E_SUPERADMIN_EMAIL=superusuario@colegio.cl`/`E2E_SUPERADMIN_PASSWORD=12345678`.
- Estado final: `npm run test:e2e` → **26 passed, 0 skipped** (incluye los 3 de plataforma). `tests/platform.spec.ts` usa timeout 15s tras la carga lazy de `PlatformView` para evitar carreras.

### Fase E — Fix acceso superadmin a Plataforma (2026-07-31)

- **Causa raíz del 403 de `GET /api/platform/tenants`:** tres routers pre-Fase E usan `router.use(...)` SIN path y se montan ANTES de `platformRoutes` en `server/index.ts` (líneas 67→74→75), interceptando TODAS las rutas `/api/*`:
  - `server/api/routes/processDisciplinaryPdf.ts:16` → `requireMembership(CONVIVENCIA_MEMBERSHIP)` (bloquea roles no-convivencia).
  - `server/api/routes/templates.ts:13` → `requireAuth + requireMembership(...)`.
  - `server/api/routes/admin.ts:138` → `requireAuth + requireTenant + requireRole(ADMIN_ROLES)` con `ADMIN_ROLES=['admin','direccion']` (rechazaba a superadmin con "No tiene permisos para realizar esta acción." antes de llegar a plataforma).
- **Contexto de cuentas (verificado en Supabase):** solo 4 perfiles; `superusuario@colegio.cl` es la ÚNICA cuenta con `role='superadmin'` (backfill idempotente de `20260801000000_create_superadmin_role.sql`; no hay otra vía de provisión). Su membresía `convivencia` quedó `is_active=false` porque el trigger `sync_convivencia_membership_from_profile` (20260731190539) desactiva membresías de roles no listados y no contempla `superadmin`. Distinción conceptual: "superusuario" = cuenta seed del tenant default; "super administrador" = el mismo rol de plataforma que ejerce esa cuenta; NO existe un perfil ni membresía distinta que provisionar.
- **Solución elegida (Opción 1 completada; cambios mínimos de datos de rol, no estructurales):** añadir `'superadmin'` a `CONVIVENCIA_MEMBERSHIP_ROLES` en `server/middleware/requireMembership.ts` (ya aplicada antes) y a `ADMIN_ROLES` en `server/api/routes/admin.ts:16` → `['superadmin', 'admin', 'direccion']`. Con esto el superadmin atraviesa los tres interceptores y llega a `platformRoutes` → `requireSuperAdmin` → `GET /platform/tenants` responde OK.
- **Verificación final:** `npx playwright test` → **26 passed, 0 skipped**; `npm run typecheck` ✅; `npm run lint:code` ✅; `npm run test` → 302 passed ✅; `git diff --check` limpio; diff mínimo (solo las líneas de roles; normalizado con `npx prettier --write`).
- **Deuda pendiente (opcional, no bloqueante):** los tres `router.use` sin path en routers pre-Fase E deberían acotarse con path (p.ej. `router.use('/admin', ...)`) para que sus guards solo apliquen a sus propias rutas; hoy dependen de las listas de roles para no interceptar rutas ajenas.

### Fase E — Fix deuda: guards acotados a prefijo + bundle serverless regenerado (2026-07-31)

- **Deuda saldada:** los cuatro `router.use(...)` SIN path ahora llevan prefijo propio, de modo que sus guards solo aplican a sus propias rutas y ya no interceptan `GET /api/platform/tenants` ni otras rutas ajenas:
  - `server/api/routes/processDisciplinaryPdf.ts` → `router.use('/process-disciplinary-pdf', requireAuth, requireMembership(CONVIVENCIA_MEMBERSHIP), rateLimit)`
  - `server/api/routes/templates.ts` → `router.use('/document-templates', requireAuth, requireMembership(CONVIVENCIA_MEMBERSHIP))`
  - `server/api/routes/admin.ts` → `router.use('/admin', requireAuth, requireTenant, requireRole(ADMIN_ROLES))`
  - `server/api/routes/platform.ts` → `router.use('/platform', requireAuth, requireSuperAdmin)`
- **Bundle serverless regenerado (`api/index.js`):** el commit de Fase E (`7cddd53`) agregó `admin.ts` y `platform.ts` a `server/api/index.ts`, pero el bundle versionado en ese entonces quedó atrasado (último bundle en `5eac15e`) y NO exponía `POST /admin/*` ni `/api/platform/*` en producción. Con `npm run build` se regeneró: ahora monta `admin_default` y `platform_default` en `api/index.js` (líneas ~3893-3894). **Lección (2026-08-01):** se intentó des-trackear `api/index.js` (`.gitignore` + `git rm --cached`), pero el deploy de Vercel vía integración Git falló con `unused_function`: Vercel detecta las funciones serverless escaneando `api/` en el commit ANTES del build, por lo que `api/index.js` debe permanecer versionado. Se revirtió el des-trackeo; `api/index.js` sigue trackeado y se regenera con `npm run build` antes de commitear.
- **Verificación:** `npm run typecheck` ✅; `npm run lint:code` ✅; `npm run test` → 302 passed ✅; `npm run build` ✅ (Vite + `dist/server.cjs` + `api/index.js`). E2E ya validado previamente (26 passed, 0 skipped).

### Estado remoto Supabase — revisión CLI (2026-08-01)

- Proyecto remoto `GestionConvivencia` (`mjhbcqwtjzgvqssfiore`) está vinculado y `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.
- El remoto tiene 1 tenant (`Default School`), 4 usuarios Auth confirmados, 4 perfiles activos y 6 membresías.
- `superusuario@colegio.cl` ya existe, está confirmado, activo y tiene `profiles.role = 'superadmin'`. No requiere crear otra cuenta ni cambiar contraseña.
- Su membresía `convivencia` está inconsistente: `role = 'admin'` e `is_active = false`. En modo transición funciona por fallback, pero fallaría con enforcement estricto.
- Existen remotamente `audit_events`, `membership_invitations`, `notifications` y `report_history`, actualmente sin registros.
- El historial remoto de migraciones no coincide con el conjunto local: hay migraciones locales no registradas remotamente y migraciones remotas no presentes localmente. No ejecutar `supabase db push` hasta reconciliar el ledger.
- Nueva migración local pendiente de aplicación controlada: `supabase/migrations/20260801010000_activate_superadmin_convivencia_membership.sql`; sus comprobaciones de solo lectura están en `supabase/validation/superadmin-membership-tests.sql`.

### Realtime y rendimiento — 2026-08-01

- `usePersistentNotifications` conserva Supabase persistente como fuente de verdad y admite invalidación por Realtime de forma opt-in mediante `VITE_NOTIFICATIONS_REALTIME=true`.
- La migración forward-only `20260801120000_enable_notifications_realtime.sql` prepara la publicación de `notifications`; no está aplicada remotamente por el bloqueo HTTP 403 del CLI.
- Lighthouse CI quedó configurado en `lighthouserc.cjs` y se incorpora al workflow; la medición local observó FCP aproximado de 3,4 s y LCP de 5,0 s, pero Windows falló al limpiar la carpeta temporal con `EPERM`.
- E2E de plataforma e institucionalidad: 27 pruebas pasan contra producción; no se modificaron datos institucionales.

### Reconciliación del ledger Supabase — 2026-08-01

- El ledger remoto fue verificado en SQL Editor: contiene 12 versiones, incluido `00000` como baseline remoto.
- Las versiones `20260727181206`, `20260729191822`, `20260729215646`, `20260729215812`, `20260729215837` y `20260731191230` tienen archivos históricos identificables en `supabase/migrations-legacy/`.
- Las versiones `20260727175043`, `20260728185201`, `20260728202937`, `20260731003251` y `20260731003405` no tienen archivo local; se conservan como historial externo y no deben inventarse.
- Se verificaron completamente los efectos de `20260801090000`, `20260801100000` y `20260801120000`, y se registraron esas tres versiones en `supabase_migrations.schema_migrations` mediante `supabase/operations/register-verified-migrations.sql` sin reejecutar DDL.
- La reconciliación funcional del ledger está cerrada. El CLI aún devuelve HTTP 403 al inicializar el login role, por lo que no se usa `db push` ni `migration repair` automático.

### Auditoría de código y frontend — 2026-08-01

- Se detectó y corrigió un riesgo de aislamiento en caché React Query: cursos, estudiantes, administración, reportes, configuración institucional, documentos y reglas disciplinarias ahora incluyen `tenantId` en sus `queryKey` y esperan el contexto tenant antes de consultar.
- La auditoría estática no encontró `SELECT *` en los módulos revisados, exposición de `service_role` al cliente, `eval`, `dangerouslySetInnerHTML` ni rutas sin prefijo que vuelvan a interceptar endpoints ajenos.
- La referencia visual `PageHero` está aplicada en Administración, Plataforma y Centro de reportes; los formularios institucionales tienen etiquetas/aria-labels y estados de error/reintento.
- Validación posterior: lint, typecheck, 309 tests, build, bundle, security audit, 27 E2E, multi-tenant, roles y health pasan.
- Deuda no bloqueante corregida: `TemplateEditor` vive en `src/features/document-templates/`, usa React Query para cargar plantillas y delega HTTP en `src/shared/api/services/documentTemplates.service.ts`.

### Auditoría integral previa a push — 2026-08-01

- `tests/responsive-shell.spec.ts` verifica el shell público en escritorio (1440px) y móvil (390px), incluyendo ausencia de overflow horizontal; la suite de producción quedó en 29 pruebas aprobadas.
- `scripts/validate-production-roles.mjs` valida los nueve roles del modelo: `admin`, `direccion`, `convivencia`, `inspectoria`, `profesor_jefe`, `teacher`, `inspector`, `user` y `staff`. Reutiliza un token por rol para no provocar rate limits innecesarios en Supabase Auth.
- Las rutas de invitaciones administrativas responden `429` cuando Supabase informa límites temporales de correo; los casos normales y de validación mantienen sus respuestas existentes.
- La telemetría se difiere a `requestIdleCallback` (con timeout de 8 segundos) o a un timeout equivalente, para no competir con el primer render.
- Validaciones remotas: E2E 29/29, roles 9/9, aislamiento multi-tenant y auditoría append-only aprobados; lint, 309 tests, build, bundle y `npm audit --omit=dev` sin errores.
- Lighthouse CI conserva una advertencia de rendimiento observada en Windows y, en ejecuciones posteriores, un bloqueo ambiental de Chrome por `EPERM`/procesos residuales al limpiar temporales. No se modificaron umbrales para ocultar el problema.

### Bienvenida pública y acceso a Gestión de Casos — 2026-08-01

- La vista anónima ya no queda en blanco: `src/shared/ui/WelcomeModal.tsx` presenta el propósito de Gestión de Casos, debido proceso, resguardo de información y acciones para continuar sin sesión o iniciar sesión.
- `src/app/App.tsx` muestra un fallback de carga accesible mientras Supabase Auth resuelve la sesión y conserva el cierre de la bienvenida durante la pestaña mediante `sessionStorage` (`gestion-casos-welcome-seen`). La acción de inicio de sesión reutiliza el modal de autenticación existente.
- La suite E2E cubre la bienvenida y el acceso al login, además de adaptar los flujos existentes para descartarla explícitamente; la prueba responsive mantiene cobertura de escritorio y móvil.
- El dominio actual de Vercel debe conservarse como alias productivo. El alias adicional `gestiondecasos.vercel.app` se configura después del despliegue si Vercel confirma disponibilidad y permisos sobre ese subdominio.

### Selector global de colegio para superadmin — 2026-08-01

- `PlatformView` mantiene un `selectedTenantId` local y explícito para el superadmin; no modifica el `tenant_id` del JWT ni el contexto de usuarios normales.
- El selector `Colegio para administrar` se comparte entre las pestañas de Plataforma, Configuración institucional e Importar base. La interfaz muestra el colegio activo y exige selección antes de cargar o importar información.
- La configuración institucional usa rutas `/api/platform/tenants/:tenantId/...` protegidas por `requireSuperAdmin`; la importación Excel se dirige al mismo tenant seleccionado.
- La navegación completa de expedientes y el gestor de documentos institucionales todavía requieren una etapa posterior; este cambio cubre el contexto seguro de administración global y evita seleccionar tenants distintos en cada pestaña.

### Estabilidad de navegación y carga de Anotaciones — 2026-08-01

- `OnboardingChecklist` oculta realmente el panel al pulsar la X: el estado persistido `dismissed` se acompaña de `expanded=false`.
- `App.tsx` resuelve permisos usando el rol de mayor privilegio entre `profileRole` y `appRole`; esto evita que una membresía acotada sobrescriba el rol `superadmin` y haga aparecer/desaparecer Administración, Centro de reportes o Plataforma.
- `AnotacionesView` usa React Query con claves por `tenantId`: estudiantes, estados de cartas y detalle de anotaciones tienen caché separada. La tabla puede renderizar al llegar el resumen de estudiantes sin esperar la consulta global de cartas/eventos.

### Limpieza React Query y stores — 2026-08-02

- `StudentsPanel` ya no hace fetching remoto dentro de `useEffect`; reutiliza `useCoursesQuery` y el nuevo `useStudentsWithCoursesQuery`, con claves por `tenantId` y estado local solo para filtros/expansión.
- `authStore` conserva el patrón de no consultar Supabase dentro de `onAuthStateChange`, pero ahora expone limpieza explícita de la suscripción y del timeout de inicialización; se ejecuta en HMR y en tests para evitar listeners o timers duplicados.
- `supabase.ts` acepta fallback a `process.env` cuando corre fuera de Vite, lo que permite importar servicios/stores en tests Node con env dummy sin cambiar el bundle del cliente.
- Cobertura base agregada para `authStore`, `uiStore`, `toastStore` y acciones/selectores síncronos de `causasStore`; la suite local queda en 366 tests / 78 suites.
- Auditoría legacy de `src/components/`: 30 archivos actuales; 29 son barrels de compatibilidad protegidos por `src/components/legacyCompatibility.test.ts` y 1 es el test de compatibilidad. Ya no quedan componentes reales en esa capa. `MetricCard`, `ErrorBoundary`, `ToastProvider` y `ShortcutsModal` viven ahora en `src/shared/ui/`; `ClosedCases` vive en `src/features/causas/`; `TemplateEditor` vive en `src/features/document-templates/`; `InteractiveTimeline` vive en `src/features/timeline/`; `Header` y sus subcomponentes viven en `src/widgets/header/`; `Sidebar` y `SidebarUserMenu` viven en `src/widgets/sidebar/`. Sus archivos bajo `src/components/` sólo reexportan para compatibilidad.
- Skeletons lazy cerrados: `src/shared/Skeleton.tsx` centraliza fallbacks para shell, vistas administrativas/reportes/plataforma, detalle de expediente, modales y generador de cartas. `src/app/lazyFallbacks.test.ts` evita `fallback={null}` en `src/app` y `src/features`; suite local verificada en 366 tests / 78 suites.
