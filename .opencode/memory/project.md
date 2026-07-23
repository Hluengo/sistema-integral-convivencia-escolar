# STAFF ENGINEER MEMORY — Sistema Integral de Convivencia Escolar

> **Versión:** 1.0 | **Estado:** Producción | **Última actualización:** 2026-07-23

---

## 1. VISIÓN GENERAL

### Propósito
Sistema SaaS multi-tenant para gestión integral de convivencia escolar en establecimientos educacionales chilenos. Automatiza el debido proceso disciplinario desde la recepción de anotaciones hasta la emisión de cartas y documentos, con cumplimiento garantizado de Circular 482 (2018) y Ley 21.809 (2026).

### Stack Tecnológico
| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript | 19.0.1 / 5.8.2 |
| Build | Vite | 6.4.3 |
| CSS | Tailwind CSS v4 | 4.1.14 |
| State | Zustand | 5.0.14 |
| Queries | TanStack React Query | 5.101.2 |
| Forms | react-hook-form + Zod | 7.82.0 / 4.4.3 |
| Backend (dev) | Express + tsx | 4.21.2 / 4.21.0 |
| Backend (prod) | Vercel Serverless | esbuild bundle |
| Database | Supabase PostgreSQL | 17.6.1 |
| Auth | Supabase Auth (email/password) | — |
| AI | OpenRouter (meta-llama/llama-3.1-8b-instruct) | — |
| Documentos | docx (Word), pdf-lib + pdfjs-dist (PDF) | 9.7.1 / 1.17.1 / 6.1.200 |
| Monitoring | Sentry + PostHog | 10.66.0 / 1.404.1 |
| Tests | node:test + node:assert/strict + Playwright | — |
| Lint/Format | TypeScript (tsc), ESLint 9, Prettier 3, Biome 2.5 | — |

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

| Entry Point | Uso | Bundle | Comando |
|------------|-----|--------|---------|
| `server/index.ts` | Desarrollo | tsx runtime | `npm run dev` |
| `api/index.js` (generado de `server/api/index.ts`) | Producción Vercel | esbuild bundle (ESM) | `npm run build` |

**Regla crítica:** Al modificar rutas API o lógica de servidor, actualizar **ambos** archivos (`server/routes/` y `server/api/routes/`). Las implementaciones serverless usan `https` module en vez de `fetch` para Node 18 compat.

### 2.3 Patrón de State Management

```
Zustand (authStore, causasStore, uiStore, toastStore)
  ├── Estado global compartido
  ├── Acciones síncronas (setCausas, setSelectedCausaId)
  └── Side effects on init (authStore subscribe onAuthStateChange)

TanStack React Query (courses, students queries)
  └── Fetching + caching (staleTime: 30min courses, 10min students)

useReducer (useNewCausaForm form state)
  └── Estado local del formulario wizard

React Context (AppProvider, TimelineProvider)
  └── Composición de stores/hooks para subárboles

Auto-save pipeline (useCausasPersistence)
  └── Debounce 2s → updateCausa + saveBitacora + saveChecklist
```

### 2.4 State-driven Routing (No React Router)

La navegación **NO usa React Router**. Se maneja con una variable `currentView` (tipo `SidebarView`) en `uiStore`. El componente `MainContent` renderiza condicionalmente según el valor:

| View | Component | Feature Module |
|------|-----------|---------------|
| `dashboard` | `<DashboardStats>` | `features/dashboard` |
| `causas` | `<CausasView>` + `<InteractiveTimeline>` | `features/causas` |
| `informes` | `<AdvisorView>` (AI Legal + Templates) | `features/causas/MainContent` |
| `alumnos` | `<StudentsPanel>` | `features/students` |
| `anotaciones` | `<AnotacionesView>` | `features/anotaciones` |
| `documentos` | `<DocumentosView>` | `features/documentos` |

**Modals controlados por estado** (sin rutas): `LoginPage`, `NewCausaModal`, `EditCausaModal`, `ShortcutsModal`, `NewDisciplinaryProcessModal`, `AnotacionesStudentDetailModal`.

### 2.5 Lazy Loading

Componentes lazy (React.lazy + Suspense):
- `Sidebar`, `Header`, `MainContent`, `CommandPalette`
- `LoginPage`, `NewCausaModal`, `ShortcutsModal`, `OnboardingTour`
- `InteractiveTimeline`, `EditCausaModal` (dentro de CausasView)
- `AnotacionesStudentDetailModal`, `NewDisciplinaryProcessModal` (dentro de AnotacionesView)
- `AnotacionesDocumentGenerator` (dentro de DocumentosView)

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

### 4.1 Esquema Completo (16 tablas)

| Tabla | Propósito | RLS | FK Clave |
|-------|-----------|-----|----------|
| `tenants` | Establecimientos educacionales | ✅ | — |
| `profiles` | Usuarios del sistema | ✅ | `auth.users(id)`, `tenants(id)` |
| `students` | Estudiantes | ✅ | `courses(id)`, `tenants(id)` |
| `courses` | Cursos | ✅ | `tenants(id)` |
| `causas` | Casos disciplinarios | ✅ | `students(id)`, `tenants(id)` |
| `bitacora_entries` | Historial de casos | ✅ | `causas(id)`, `tenants(id)` |
| `checklist_items` | Checklist debido proceso | ✅ | `causas(id)`, `tenants(id)` |
| `inspectorate_records` | Anotaciones de inspectoría | ✅ | `students(id)`, `tenants(id)` |
| `cartas_disciplinarias` | Cartas emitidas | ✅ | `students(id)`, `tenants(id)` |
| `etapas_disciplinarias` | Etapas del proceso | ✅ | `students(id)`, `tenants(id)` |
| `document_templates` | Prompts AI personalizados | ✅ | `tenants(id)` |
| `document_analyses` | Resultados análisis PDF | ✅ | `students(id)`, `tenants(id)` |
| `disciplinary_processes` | Procesos desde PDF | ✅ | `students(id)`, `tenants(id)` |
| `disciplinary_process_files` | Archivos PDF adjuntos | ✅ | `processes(id)`, `tenants(id)` |
| `disciplinary_annotations_detected` | Anotaciones parseadas de PDF | ✅ | `processes(id)`, `students(id)`, `tenants(id)` |
| `disciplinary_rules` | Reglas de sugerencia de cartas | ✅ | `tenants(id)` |
| `usage_events` | Eventos de uso del sistema | ✅ | `auth.users(id)` |

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

| Bucket | Uso | Público | Max Size | MIME Types | Path Pattern |
|--------|-----|---------|----------|------------|--------------|
| `anotaciones` | Documentos de anotaciones | No | 10 MB | PDF, MD, TXT | `{tenant_id}/...` |
| `disciplinary-processes` | PDFs de procesos disciplinarios | No | 10 MB | PDF | `{tenant_id}/{student_id}/{process_id}/{name}` |
| `documentos_convivencia` (legacy) | Documentos varios | No | — | — | Referenciado en storage.service.ts |

### 4.4 RPCs (Funciones)

| RPC | Retorna | Propósito |
|-----|---------|-----------|
| `current_app_role()` | TEXT | Rol del usuario actual |
| `is_staff()` | BOOLEAN | Check staff-level role |
| `current_tenant_id()` | UUID | Tenant actual (JWT fast path) |
| `get_student_annotation_summary()` | TABLE | Dashboard: students + annotation counts + status |
| `get_annotation_stage_counts()` | TABLE | Conteo de estudiantes por etapa disciplinaria |
| `get_usage_stats(since, until)` | TABLE | Stats de uso agregadas |
| `get_daily_active_users(since, until)` | TABLE | DAU por día |
| `get_latest_analysis(p_student_id)` | TABLE | Último análisis PDF por estudiante |
| `generate_process_number(p_tenant_id)` | TEXT | Genera DP-YYYY-NNNN |
| `get_suggested_letter_type(...)` | TEXT | Sugiere tipo de carta según reglas |

---

## 5. API (Express + Vercel Serverless)

### 5.1 Endpoints

| Método | Ruta | Auth | Rate-Limit | AI | DB Tables |
|--------|------|------|------------|----|-----------|
| POST | `/api/advisor-chat` | ✅ | 10/min | ✅ (OpenRouter) | — |
| POST | `/api/audit-due-process` | ✅ | 10/min | ✅ (OpenRouter) | — |
| POST | `/api/draft-document` | ✅ | 10/min | ✅ (OpenRouter) | `document_templates` |
| POST | `/api/improve-text` | ✅ | 10/min | ✅ (OpenRouter) | — |
| POST | `/api/parse-annotations` | ❌ | 10/min | ❌ (regex) | — |
| POST | `/api/process-disciplinary-pdf` | ✅ | 10/min | ❌ | `document_analyses`, `students` |
| POST | `/api/process-disciplinary-pdf/confirm` | ✅ | 10/min | ❌ | `disciplinary_processes`, `files`, `annotations` |
| GET | `/api/document-templates` | ❌ | ❌ | ❌ | `document_templates` |
| PUT | `/api/document-templates` | ✅ | ❌ | ❌ | `document_templates` |
| POST | `/api/usage/events` | ✅ | ❌ | ❌ | `usage_events` |
| GET | `/api/usage/stats` | ✅ | ❌ | ❌ | RPCs |

### 5.2 Auth Middleware (`requireAuth`)

```
1. Extraer Bearer token de Authorization header
2. Verificar JWT con HMAC-SHA256 (SUPABASE_JWT_SECRET)
   ├── Intenta raw text + base64-decoded secret
   └── Si falla → fallback a Supabase API /auth/v1/user
3. Inyectar tenant context (query profiles table)
4. Adjuntar payload decodificado a req.user
```

**Regla crítica:** Siempre mantener sincronizados `server/middleware/auth.ts` y `server/api/middleware/auth.ts`.

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
            │   └── documentos → <DocumentosView>
            └── Modals: LoginPage, NewCausaModal, ShortcutsModal, OnboardingTour (todos lazy)
          </AppProvider>
        </ToastProvider>
      </App>
    </PerformanceProfiler>
  </ErrorBoundary>
</QueryClientProvider>
```

### 6.2 Zustand Stores

| Store | Estado Clave | Acciones | Persistencia |
|-------|-------------|----------|-------------|
| `authStore` | user, tenantId, authLoading, isAuthenticated | setUser, setShowLoginModal | Subscripción onAuthStateChange |
| `causasStore` | causas[], selectedCausaId, saveStatus, filters | setCausas, handleCreateCausa, handleDeleteCausa | Auto-save debounced 2s |
| `uiStore` | currentView, isSidebarCollapsed, privacyMode, currentRole | setCurrentView, toggleSidebar, togglePrivacy | — |
| `toastStore` | toasts[] | addToast (4s auto-remove), removeToast | — |

### 6.3 React Query

| Query Key | Hook | Stale Time | Enabled |
|-----------|------|-----------|---------|
| `['courses']` | `useCoursesQuery` | 30 min | Siempre |
| `['students', courseId]` | `useStudentsQuery` | 10 min | `!!courseId` |

**No hay useMutation** — las mutaciones se hacen directamente a servicios Supabase desde los stores y hooks.

### 6.4 Servicios (shared/api/services/)

| Servicio | Métodos Clave |
|----------|--------------|
| `auth.service.ts` | signInWithEmail, signOut, onAuthStateChange |
| `causas.service.ts` | fetchCausas, createCausa, updateCausa, deleteCausa |
| `bitacora.service.ts` | fetchBitacora, saveBitacora (delete all + re-insert), addBitacoraEntry |
| `checklist.service.ts` | saveChecklist (delete all + re-insert) |
| `annotations.service.ts` | fetchAnnotations, fetchDocumentAnalyses, saveAnnotation, fetchStudentsWithAnnotationCounts |
| `courses.service.ts` | fetchCourses, fetchStudentsByCourse, fetchStudentsWithCourses |
| `cartas.service.ts` | fetchCartas |
| `etapas.service.ts` | fetchEtapas |
| `storage.service.ts` | uploadDocument, listDocuments, deleteDocument (bucket: documentos_convivencia) |
| `disciplinary-storage.service.ts` | validateDisciplinaryPdf, uploadDisciplinaryFile, getDisciplinaryFileUrl, deleteDisciplinaryFile |
| `disciplinary-rules.service.ts` | fetchDisciplinaryRules |

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

| Rol | Permisos |
|-----|---------|
| `admin` | Todo: CRUD en todo el tenant |
| `direccion` | CRUD (excepto delete en algunas tablas) |
| `convivencia` | CRUD en causas, anotaciones, estudiantes |
| `inspectoria` | CRUD en inspectorate_records, estudiantes |
| `profesor_jefe` | Lectura + escritura limitada a su curso |
| `teacher` | Lectura básica |
| `inspector` | CRUD básico |
| `user` | Lectura básica |
| `staff` | CRUD en causas |

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

| Tipo | System Prompt |
|------|-------------|
| `notificacion_apertura` | "Eres un asistente experto..." |
| `citacion_entrevista` | "Eres un experto..." |
| `informe_cierre_indagacion` | Prompt en DB (document_templates) |
| `informe_concluyente` | Prompt en DB (document_templates) |

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

| Error | Causa | Solución |
|-------|-------|----------|
| Vercel 500 en PDF upload | pdf.worker.mjs no incluido en bundle | ✅ Fixed: vercel.json includeFiles |
| JWT ES256 verification | Supabase rotación de keys | HMAC + API fallback (implementado) |
| CSP fonts bloqueados | Google Fonts no en CSP | Agregar dominios a vercel.json |
| opencode.json corruption | Plugins sobreescriben config | Restaurar desde git |
| `riceMeasures.test.ts` missing | Test file no creado | Crear o remover de package.json |

### 12.2 Deuda Técnica

| Ítem | Impacto | Prioridad |
|------|---------|-----------|
| `components/` legacy layer | Duplicación con `features/` y `shared/` | Media |
| No React Router | URL no refleja estado, no deep linking | Media |
| ManualChunks circular warnings | Build warnings, posible mejor chunking | Baja |
| Dual server routes (server/ + api/) | Duplicación, riesgo de drift | Alta |
| `inspectorate_records.student_id` TEXT vs UUID | Type mismatch | Media |
| No hay test de riceMeasures | Missing test file en package.json | Baja |
| test:vitest y test corren en paralelo | Dos test runners | Baja |

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
1. Actualizar AMBOS entry points (`server/routes/` y `server/api/routes/`)
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
