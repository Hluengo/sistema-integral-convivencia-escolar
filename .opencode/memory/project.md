# STAFF ENGINEER MEMORY — Sistema Integral de Convivencia Escolar

> **Versión:** 1.6 | **Estado:** Producción | **Última actualización:** 2026-08-08

---

### 2.0 Configuración institucional y operación multi-tenant

La plataforma permite que el superadministrador gestione múltiples colegios sin pagos dentro de la aplicación. Cada tenant tiene `institution_settings` y `institution_rule_versions`, creados por la migración incremental `20260801100000_add_institutional_configuration.sql`. El bucket privado `institution-assets` almacena logos por tenant mediante URLs firmadas. El panel de administración gestiona el propio tenant; el panel global permite al superadministrador operar cualquier tenant. La validación automatizada usa `npm run test:multitenant` y `npm run test:roles`.

## 1. VISIÓN GENERAL

### Propósito

Sistema SaaS multi-tenant para gestión integral de convivencia escolar en establecimientos educacionales chilenos. Automatiza el debido proceso disciplinario desde la recepción de anotaciones hasta la emisión de cartas y documentos, con cumplimiento garantizado de Circular 482 (2018) y Ley 21.809 (2026).

### Stack Tecnológico

| Capa           | Tecnología                                            | Versión           |
| -------------- | ----------------------------------------------------- | ----------------- |
| Frontend       | React + TypeScript                                    | 19.0.1 / 5.8.2    |
| Build          | Vite                                                  | 6.4.3             |
| CSS            | Tailwind CSS v4                                       | 4.1.14            |
| State          | Zustand                                               | 5.0.14            |
| Queries        | TanStack React Query                                  | 5.101.2           |
| Forms          | react-hook-form + Zod                                 | 7.84.0 / 4.4.3    |
| Backend (dev)  | Express + tsx                                         | 4.21.2 / 4.21.0   |
| Backend (prod) | Vercel Serverless                                     | esbuild bundle    |
| Database       | Supabase PostgreSQL                                   | 17.6.1            |
| Auth           | Supabase Auth (email/password)                        | —                 |
| AI             | Gemini 3.6 textos/informes/docs + OpenRouter fallback | —                 |
| Documentos     | react-to-print (HTML imprimible) + pdfjs-dist (PDF)   | 3.3.0 / 6.1.200   |
| Monitoring     | Sentry Browser + PostHog                              | 10.66.0 / 1.404.1 |
| Tests          | node:test + node:assert/strict + Playwright           | —                 |
| Lint/Format    | TypeScript (tsc), ESLint 9, Prettier 3, Biome 2.5     | —                 |

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
│   ├── lib/          # Utils, mappers, legalCompliance, domain, hooks
│   ├── ui/           # Shared UI components (Button, Dialog, AlertDialog)
│   └── stores/       # Zustand stores (authStore, causasStore, uiStore, toastStore)
├── hooks/            # Re-exports from shared/lib/hooks/
├── stores/           # Re-exports from shared/lib/stores/
├── services/         # Re-exports from shared/api/services/
├── lib/              # Re-exports from shared/lib/
├── pages/            # LoginPage
├── types/            # Declaration files (.d.ts)
├── domain/           # Pure domain logic (disciplinaryStatus)
└── App.tsx           # Root shell coordinator with URL routing bridge
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

react-hook-form + Zod (useNewCausaForm)
  └── Estado local y validación runtime del formulario de nuevo expediente

React Context (AppProvider, TimelineProvider)
  └── Composición de stores/hooks para subárboles

Auto-save pipeline (useCausasPersistence)
  └── Debounce 2s → updateCausa + RPC snapshots de bitácora/checklist
```

### 2.4 URL History Routing Bridge

La navegación usa un bridge propio entre `window.history` y `uiStore.currentView` (tipo `SidebarView`). `src/app/routing.ts` define rutas canónicas, `src/app/hooks/useUrlRouting.ts` sincroniza la URL con `uiStore` y `causasStore.selectedCausaId`, y `MainContent` conserva renderizado condicional mientras no exista un router declarativo que pase `npm run security-audit`.

| View          | Ruta               | Component                                | Feature Module                |
| ------------- | ------------------ | ---------------------------------------- | ----------------------------- |
| `dashboard`   | `/`                | `<DashboardStats>`                       | `features/dashboard`          |
| `causas`      | `/expedientes`     | `<CausasView>` + `<InteractiveTimeline>` | `features/causas`             |
| `causas`      | `/expedientes/:id` | `<CausasView>` con detalle seleccionado  | `features/causas`             |
| `informes`    | `/informes`        | `<AdvisorView>` (AI Legal + Templates)   | `features/causas/MainContent` |
| `alumnos`     | `/alumnos`         | `<StudentsPanel>`                        | `features/students`           |
| `anotaciones` | `/anotaciones`     | `<AnotacionesView>`                      | `features/anotaciones`        |
| `reportes`    | `/reportes`        | `<ReportsCenter>`                        | `features/reports`            |
| `admin`       | `/admin`           | `<AdminView>`                            | `features/admin`              |
| `platform`    | `/plataforma`      | `<PlatformView>`                         | `features/platform`           |

**Modals:** `/login` abre `LoginPage`. `NewCausaModal`, `EditCausaModal`, `ShortcutsModal`, `NewDisciplinaryProcessModal` y `AnotacionesStudentDetailModal` siguen controlados por estado.

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
  │   ├── event_type: suggested|created|registered|printed|downloaded_pdf|downloaded_word|processed_manually|archived|annulled
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

### 3.2 Flujo de Debido Proceso (5 Fases, 24 Estados)

```
RECEPCIÓN (3 estados)
  └── Denuncia recibida → Verificación preliminar → Apertura formal

INVESTIGACIÓN
  ├── Investigación base → En Proceso de Indagación → Recopilación de Evidencias
  └── Mediación opcional → Derivación → Desarrollo → Acuerdo O Retorno a Indagación
      (Mediación permanece dentro de Investigación; no es una sexta fase ni hito obligatorio)

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

| Tabla                               | Propósito                                                | RLS | FK Clave                                                |
| ----------------------------------- | -------------------------------------------------------- | --- | ------------------------------------------------------- |
| `tenants`                           | Establecimientos educacionales                           | ✅  | —                                                       |
| `profiles`                          | Usuarios del sistema                                     | ✅  | `auth.users(id)`, `tenants(id)`                         |
| `students`                          | Estudiantes                                              | ✅  | `courses(id)`, `tenants(id)`                            |
| `courses`                           | Cursos                                                   | ✅  | `tenants(id)`                                           |
| `causas`                            | Casos disciplinarios                                     | ✅  | `students(id)`, `tenants(id)`                           |
| `bitacora_entries`                  | Historial de casos                                       | ✅  | `causas(id)`, `tenants(id)`                             |
| `checklist_items`                   | Checklist debido proceso                                 | ✅  | `causas(id)`, `tenants(id)`                             |
| `inspectorate_records`              | Anotaciones de inspectoría                               | ✅  | `students(id)`, `tenants(id)`                           |
| `cartas_disciplinarias`             | Cartas emitidas                                          | ✅  | `students(id)`, `tenants(id)`                           |
| `etapas_disciplinarias`             | Etapas del proceso                                       | ✅  | `students(id)`, `tenants(id)`                           |
| `document_templates`                | Prompts AI personalizados                                | ✅  | `tenants(id)`                                           |
| `document_analyses`                 | Resultados análisis PDF                                  | ✅  | `students(id)`, `tenants(id)`                           |
| `disciplinary_processes`            | Procesos desde PDF                                       | ✅  | `students(id)`, `tenants(id)`                           |
| `disciplinary_process_files`        | Archivos PDF adjuntos                                    | ✅  | `processes(id)`, `tenants(id)`                          |
| `disciplinary_annotations_detected` | Anotaciones parseadas de PDF                             | ✅  | `processes(id)`, `students(id)`, `tenants(id)`          |
| `disciplinary_rules`                | Reglas de sugerencia de cartas                           | ✅  | `tenants(id)`                                           |
| `usage_events`                      | Eventos de uso del sistema                               | ✅  | `auth.users(id)`                                        |
| `carta_events`                      | Trazabilidad de trámite de cartas                        | ✅  | `cartas_disciplinarias.id`, `students.id`, `tenants.id` |
| `causa_documents`                   | Documentos oficiales de causa (snapshot de trazabilidad) | ✅  | `causas(id)`, `tenants(id)`                             |

### 4.2 Reproducibilidad de Migraciones

- `00001_base_schema.sql`: creada para proveer el schema base ausente en el repo local (perfiles, estudiantes, cursos, causas, bitácora, checklist, plantillas). Esto permite que `supabase db reset` en un proyecto nuevo reconstruya la base usando solo `supabase/migrations/`.
- `00002_anotaciones_tables.sql`: corregida para usar `UUID` en las PKs y FKs a `students(id)`, alineándose con el schema real de producción y con las migraciones posteriores (`20260716100100`, `20260724`, etc.).
- El schema local se verificó contra la instancia vinculada (`supabase db query`) y `students.id`, `courses.id`, `profiles.user_id` son UUID; `causas.id`, `document_templates.id`, `bitacora_entries.id`, `checklist_items.id` son TEXT.
- **Limitación local:** Docker no está disponible en este entorno, por lo que `supabase db reset` no se pudo ejecutar localmente. Se validó `supabase db lint` contra el proyecto remoto sin errores.

### 4.2.1 DB-01 — `carta_events` TEXT → UUID (estado 2026-08-08)

- Migración `20260807000000_carta_events_uuid_fk.sql` → aplicada en producción como `20260808015911 carta_events_uuid_fk`: agrega `carta_id_uuid` y `student_id_uuid` (UUID, nullable) + FK.
- Migración `20260808000000_swap_carta_events_uuid_final.sql` → **APLICADA en producción 2026-08-08** como `swap_carta_events_uuid_final` (vía Management API, sin Docker/runbook local; la ventana se coordinó de forma asistida). Swap completado: backfill defensivo, RENAME text→`*_text_old` y `*_uuid`→canónicos, `SET NOT NULL`, drop de 4 índices text, rewrite de las 3 funciones.
- Migración `20260808100000_drop_carta_events_text_columns.sql` → **NO aplicada aún**: elimina `carta_id_text_old`/`student_id_text_old` tras 24–72h de observación post-swap.
- **Hotfix post-swap necesario (2026-08-08)**: las columnas renombradas `carta_id_text_old`/`student_id_text_old` conservaron `NOT NULL` heredado de las columnas text originales, lo que rompía cualquier INSERT del cliente (que ya solo escribe `carta_id`/`student_id` uuid). Se ejecutó `ALTER TABLE ... DROP NOT NULL` en ambas para la ventana de observación. El drop final las elimina.
- Estado post-swap verificado: `carta_id:uuid NOT NULL`, `student_id:uuid NOT NULL`, 0 NULLs, 0 huérfanos, FKs `fk_carta_events_carta_id_uuid`/`fk_carta_events_student_id_uuid` apuntan a las columnas canónicas, índices `idx_carta_events_carta_id_uuid_created_at`/`idx_carta_events_student_id_uuid_created_at` asociados a `carta_id`/`student_id`, 4 índices text eliminados. 227 eventos preservados (backup `carta_events_pre_swap_backup` en producción + 227 filas confirmadas).
- Smoke tests post-swap: INSERT uuid=uuid directo OK (luego eliminado, 0 residuos), JOINs `carta_events→cartas_disciplinarias/students` por uuid OK, `get_annotation_stage_counts` usa `ce.carta_id = c.id` (uuid=uuid), ninguna función referencia `*_text_old`.
- Prechecks ejecutados contra la base real (2026-08-08): `0/0/0` (227 eventos, sin NULLs en `*_uuid`, sin cartas/estudiantes huérfanos). `grep _uuid` en `src/` y `server/` = 0 referencias.
- `cartas.service.ts` ya no usa `sessionContext` (pasa `tenantId` y `actor` explícitos); `CartasTab.tsx` pasa `tenantId` desde `authStore`.
- Workflow `db01-prechecks.yml` corregido (#17): `secrets` no es válido en `if` de jobs → movido a `env` de job + paso guarda. El repo **no tiene** el secreto `STAGING_DATABASE_URL` configurado.

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

| RPC                                                 | Retorna | Propósito                                                                                                |
| --------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `current_app_role()`                                | TEXT    | Rol del usuario actual                                                                                   |
| `is_staff()`                                        | BOOLEAN | Check staff-level role                                                                                   |
| `current_tenant_id()`                               | UUID    | Tenant actual (JWT fast path)                                                                            |
| `get_student_annotation_summary()`                  | TABLE   | Dashboard: students + annotation counts + status                                                         |
| `get_annotation_stage_counts()`                     | TABLE   | Conteo de estudiantes por etapa disciplinaria                                                            |
| `get_usage_stats(since, until)`                     | TABLE   | Stats de uso agregadas                                                                                   |
| `get_daily_active_users(since, until)`              | TABLE   | DAU por día                                                                                              |
| `get_latest_analysis(p_student_id)`                 | TABLE   | Último análisis PDF por estudiante                                                                       |
| `generate_process_number(p_tenant_id)`              | TEXT    | Genera DP-YYYY-NNNN                                                                                      |
| `get_suggested_letter_type(...)`                    | TEXT    | Sugiere tipo de carta según reglas                                                                       |
| `mark_causa_document_notified(pid, snap, chk, bit)` | VOID    | Marca notificación notificada: documento + hito `chk_rec_3` + bitácora en 1 transacción (tenant por RLS) |

---

## 5. API (Express + Vercel Serverless)

### 5.1 Endpoints

| Método | Ruta                                    | Auth | Rate-Limit | AI              | DB Tables                                        |
| ------ | --------------------------------------- | ---- | ---------- | --------------- | ------------------------------------------------ |
| POST   | `/api/advisor-chat`                     | ✅   | 10/min     | ✅ (OpenRouter) | —                                                |
| POST   | `/api/audit-due-process`                | ✅   | 10/min     | ✅ (Gemini)     | —                                                |
| POST   | `/api/draft-document`                   | ✅   | 10/min     | ✅ (Gemini)     | `document_templates`                             |
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

### 5.3 AI Integration (Gemini + OpenRouter)

```
Gemini pospago: mejora de textos breves, auditorías de debido proceso, informes y borradores/documentos oficiales
API Key: GEMINI_API_KEY (env)
Modelo mejora de textos: TEXT_IMPROVEMENT_GEMINI_MODEL opcional, si no existe reutiliza LEGAL_DRAFT_MODEL y luego gemini-3.6-flash
Modelo documentos/informes: LEGAL_DRAFT_MODEL opcional, por defecto gemini-3.6-flash
Generación Gemini: sin sampling params deprecated (temperature/top_p/top_k)
OpenRouter: respaldo de mejora de textos breves y asesoría legal breve
API Key: OPENROUTER_API_KEY (env)
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

Regla de proveedores:
  ├── OpenRouter no se usa como respaldo para informes ni documentos oficiales
  └── Si Gemini falla en esos flujos, el endpoint responde error explícito de Gemini
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

| Query Key                | Hook               | Stale Time | Enabled                         |
| ------------------------ | ------------------ | ---------- | ------------------------------- |
| `['courses']`            | `useCoursesQuery`  | 30 min     | Siempre                         |
| `['students', courseId]` | `useStudentsQuery` | 10 min     | `!!courseId && isAuthenticated` |

**No hay useMutation** — las mutaciones se hacen directamente a servicios Supabase desde los stores y hooks.

### 6.4 Servicios (shared/api/services/)

| Servicio                          | Métodos Clave                                                                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.service.ts`                 | signInWithEmail, signOut, onAuthStateChange                                                                                                                                                                                            |
| `causas.service.ts`               | fetchCausas, createCausa, updateCausa, deleteCausa                                                                                                                                                                                     |
| `bitacora.service.ts`             | saveBitacora vía `save_bitacora_snapshot` + buildBitacoraSnapshotDelta                                                                                                                                                                 |
| `checklist.service.ts`            | saveChecklist vía `save_checklist_snapshot` + buildChecklistSnapshotDelta                                                                                                                                                              |
| `annotations.service.ts`          | fetchAnnotations, fetchDocumentAnalyses, saveAnnotation, fetchStudentsWithAnnotationCounts                                                                                                                                             |
| `courses.service.ts`              | fetchCourses, fetchStudentsByCourse, fetchStudentsWithCourses                                                                                                                                                                          |
| `cartas.service.ts`               | fetchCartas, fetchStudentDisciplinarySnapshot (incluye etapas disciplinarias), createCartaEvent, markCartaPrinted, markCartaDownloadedPdf, markCartaDownloadedWord, markCartaProcessedManually, annulCarta, resolveCartaWorkflowStatus |
| `storage.service.ts`              | uploadDocument, listDocuments, deleteDocument (bucket: documentos_convivencia)                                                                                                                                                         |
| `disciplinary-storage.service.ts` | validateDisciplinaryPdf, uploadDisciplinaryFile, getDisciplinaryFileUrl, deleteDisciplinaryFile                                                                                                                                        |
| `disciplinary-rules.service.ts`   | fetchDisciplinaryRules                                                                                                                                                                                                                 |
| `causaDocuments.service.ts`       | createPendingCausaDocument, fetchCausaDocuments, saveCausaDocumentSnapshot, markCausaDocumentNotified (RPC), annulCausaDocument                                                                                                        |

---

## 7. PDF PROCESSING PIPELINE

### 7.1 Two-step Workflow

**Step 1: `POST /api/process-disciplinary-pdf`** (Analysis)

```
1. Auth validation → requireAuth
2. Download PDF from Supabase Storage (disciplinary-processes bucket)
3. Validate PDF header (%PDF-), size ≤ 10MB, pages ≤ 80
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
1. Auth + tenant + role validation (`superadmin`, `admin`, `direccion`, `convivencia`, `inspectoria`, `profesor_jefe`)
2. Re-download PDF, recompute SHA-256 and validate request hash
3. Validate `analysisId` belongs to tenant and matches the actual file hash
4. Re-parse PDF and accept only confirmed annotations present in parser output
5. Idempotency check (storagePath + tenantId)
6. Student verification (belongs to tenant)
7. Generate process number via RPC (DP-YYYY-NNNN)
8. Insert: disciplinary_processes (draft) + files + annotations + analyses
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

### 9.1 Cartas institucionales (HTML imprimible + react-to-print)

```
Generación de cartas como documentos HTML con react-to-print:
- Cartas de amonestación, compromiso y derivación viven en docgen por feature.
- Snapshot de contenido en `carta_snapshots` para trazabilidad.
- Los templates con IA se resuelven con Gemini (document_templates en DB).
- `docx` y `pdf-lib` ya NO forman parte del bundle (removidos).
```

### 9.2 PDF (Analysis)

```
Vía servidor:
  pdfjs-dist → Text extraction → Regex parsing → Student matching
```

### 9.3 AI Drafted Documents

> **Nota:** La **Notificación de Inicio de Indagación** ya NO se redacta con asistencia AI. Se emite desde el hito `chk_rec_3` del checklist de Recepción, con su propia plantilla hoja Carta (`notificacionDocgen`, sin IA) y trazabilidad por snapshot en `causa_documents`. La vista legal limita la redacción asistida a informes.

| Tipo                        | System Prompt                     |
| --------------------------- | --------------------------------- |
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
- **Consumo de privacidad:** `privacyMode` vive en `uiStore`; las vistas lo leen con selectores Zustand cuando corresponde. Cualquier vista nueva del dashboard o tabla con nombres de NNA/docentes debe aplicar `maskName`/`maskRut` de `shared/lib/anotacionesUtils.ts` o reutilizar helpers ya enmascarados.
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
- Coverage: `node --experimental-test-coverage` con umbral mínimo de 60% líneas; excluye `api/index.js` por ser bundle generado para Vercel
- Tests alongside source files (`*.test.ts`)

### 11.5 Git/Commits

- lint antes de commit (husky pre-commit)
- pre-push: lint + test + build
- No commit secrets
- Mensajes descriptivos en español

---

## 12. PROBLEMAS CONOCIDOS

### 12.1 Errores Activos

| Error                                                             | Causa                                                                                                                                 | Solución                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vercel 500 en PDF upload                                          | pdf.worker.mjs no incluido en bundle                                                                                                  | ✅ Fixed: vercel.json includeFiles                                                                                                                                                                                                               |
| JWT ES256 verification                                            | Supabase rotación de keys                                                                                                             | HMAC + API fallback (implementado)                                                                                                                                                                                                               |
| CSP fonts bloqueados                                              | Google Fonts no en CSP                                                                                                                | Agregar dominios a vercel.json                                                                                                                                                                                                                   |
| opencode.json corruption                                          | Plugins sobreescriben config                                                                                                          | Restaurar desde git                                                                                                                                                                                                                              |
| `riceMeasures.test.ts` missing                                    | Referencia en package.json a test inexistente                                                                                         | ✅ Fixed: removido de package.json                                                                                                                                                                                                               |
| `inspectorate_records.student_id` TEXT vs UUID                    | Migración 00002 usaba TEXT en lugar de UUID                                                                                           | ✅ Fixed: 00002 corregido a UUID                                                                                                                                                                                                                 |
| `fetchAnnualAnnotationTrends` mostraba 0 anotaciones en dashboard | RPC `get_annual_annotation_trend` devuelve `month_key` como `'YYYY-MM'` pero el cliente lo trataba como mes numérico → fecha inválida | ✅ Fixed 2026-08-08: parseo robusto en `annotations.service.ts` (año+mes desde clave, soporta ambos formatos) + test `"YYYY-MM"`. Además `getDashboardSchoolYear` ahora resuelve el año escolar en `America/Santiago` (consistente con las RPC). |
| Tests de API endpoints retornan 403                               | Auth middleware requería perfil Supabase real                                                                                         | ✅ Fixed: fast-path JWT tenant+role + JWT self-contained en tests                                                                                                                                                                                |

### 12.2 Deuda Técnica

| Ítem                                        | Impacto                                                                                             | Prioridad                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `components/` legacy layer                  | Quedan 14 componentes reales por migrar; 13 barrels están protegidos por test                       | Media                                                                      |
| Routing declarativo pendiente               | Bridge `History API` resuelve URL/deep links básicos; `MainContent` aún renderiza por condicionales | Media                                                                      |
| ManualChunks circular warnings              | Build warnings, posible mejor chunking                                                              | Baja                                                                       |
| Dual server routes (server/ + api/)         | Duplicación, riesgo de drift                                                                        | Alta                                                                       |
| Docker no disponible localmente             | No se puede ejecutar `supabase db reset` ni migraciones locales                                     | Media                                                                      |
| test:vitest y test corren en paralelo       | Dos test runners                                                                                    | Baja                                                                       |
| `carta_events.tenant_id` nullable           | RLS policy SELECT usa `tenant_id = current_tenant_id()`; filas con NULL quedan invisibles           | ✅ Fixed: 20260806124000 enforce_carta_events_tenant (NOT NULL + backfill) |
| `carta_events.student_id` / `carta_id` TEXT | Inconsistente con `students.id` y `cartas_disciplinarias.id` (UUID)                                 | ✅ Fixed: DB-01 (swap a UUID en ventana de mantenimiento, ver runbook)     |

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
4. Sanitizar input con `sanitizeForAI()` y anonimizar PII con `redactSensitiveForAI()` antes de enviar a LLM
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
- `status = Vigente` conserva su significado administrativo. La UI obtiene `Pendiente`, `Procesada` o `Archivada` desde `carta_events`.
- `archived` registra el cierre físico posterior a la entrevista: carta procesada, firmada por apoderado/a y archivada en expediente físico.
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
- Storage en `disciplinary-processes` autoriza los mismos roles activos de `CONVIVENCIA_MEMBERSHIP` (`superadmin`, `admin`, `direccion`, `convivencia`, `inspectoria`, `profesor_jefe`, `teacher`, `inspector`, `user`, `staff`) mediante `app_memberships`, respetando tenant por carpeta. La ruta temporal del modal de PDF usa `{tenant_id}/pending-student/draft/...`.
- Conteos, etapas y rankings usan el año escolar vigente en `America/Santiago`; los rankings normalizan claves de docentes/cursos y no mezclan fuentes de fallback.
- El cliente no usa fallback paginado para KPIs/rankings cuando falla la RPC: expone el error para evitar datos inconsistentes.
- La auditoría técnica quedó validada localmente con lint, 295 tests y build de producción exitosos.

### Optimizaciones de rendimiento aplicadas (2026-07-31)

- `useAppContext` y `useMemberships` usan selectores parciales de Zustand; las listas derivadas de causas se memoizan por referencia del arreglo.
- KPIs y rankings del dashboard usan `staleTime` de 30 segundos y conservan invalidación selectiva tras escrituras.
- Sentry Browser, PostHog y Web Vitals se inicializan dos segundos después del primer render. Sentry no configura Session Replay; `webVitals` recibe adaptadores desde `loadTelemetry()` y no importa Sentry/PostHog de forma estática.
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
- Cobertura base agregada para `authStore`, `uiStore`, `toastStore` y acciones/selectores síncronos de `causasStore`; la suite local queda en 370 tests / 78 suites.
- Auditoría legacy de `src/components/`: 30 archivos actuales; 29 son barrels de compatibilidad protegidos por `src/components/legacyCompatibility.test.ts` y 1 es el test de compatibilidad. Ya no quedan componentes reales en esa capa. `MetricCard`, `ErrorBoundary`, `ToastProvider` y `ShortcutsModal` viven ahora en `src/shared/ui/`; `ClosedCases` vive en `src/features/causas/`; `TemplateEditor` vive en `src/features/document-templates/`; `InteractiveTimeline` vive en `src/features/timeline/`; `Header` y sus subcomponentes viven en `src/widgets/header/`; `Sidebar` y `SidebarUserMenu` viven en `src/widgets/sidebar/`. Sus archivos bajo `src/components/` sólo reexportan para compatibilidad.
- Skeletons lazy cerrados: `src/shared/Skeleton.tsx` centraliza fallbacks para shell, vistas administrativas/reportes/plataforma, detalle de expediente, modales y generador de cartas. `src/app/lazyFallbacks.test.ts` evita `fallback={null}` en `src/app` y `src/features`; suite local verificada en 370 tests / 78 suites.
- Cobertura >60% cerrada: `npm run test:coverage` mide 85.69% líneas / 83.90% ramas / 86.37% funciones, excluye sólo `api/index.js` por ser artefacto generado y falla con `--test-coverage-lines=80` (umbral subido desde 60 en 2026-08-06).
- Seed local completo cerrado: `supabase/seed.sql` carga tenant demo, usuarios Auth/perfiles, membresías, cursos, estudiantes, anotaciones por tramo disciplinario, expedientes, bitácora, checklist, cartas, reglas, plantillas, proceso/analisis PDF, historial, reportes, notificaciones, invitaciones y configuración/documentos institucionales. La CLI actual no expone `supabase db seed`; el flujo documentado es `supabase db reset` con `[db.seed].sql_paths`.
- Índices compuestos faltantes cerrados: `supabase/migrations/20260803004959_add_query_pattern_indexes.sql` agrega 16 índices `IF NOT EXISTS` para patrones tenant-scoped frecuentes en cursos, estudiantes, anotaciones, cartas/eventos, etapas, procesos PDF, documentos institucionales y eventos de cartas. `src/shared/lib/databaseIndexes.test.ts` protege la migración. La migración fue aplicada remotamente como `20260803004959 add_query_pattern_indexes` y se verificó en `pg_indexes` con 16/16 índices creados.
- Dashboard analítico avanzado iniciado: `src/features/dashboard/dashboardTrends.ts` usa el ciclo escolar vigente marzo-diciembre para aperturas/cierres de expedientes y anotaciones agregadas. Las anotaciones se leen con `fetchAnnualAnnotationTrends(schoolYear)` desde `inspectorate_records`, filtradas por `tenant_id` y con columnas mínimas (`date_time`, `severity`, `type`), sin nombres, RUT, estudiantes, docentes ni texto de observación. `DashboardTrendsPanel.tsx` muestra el gráfico anual y `dashboardTrends.test.ts` cubre ciclo marzo-diciembre, cambio de año escolar en enero/febrero y agregación de anotaciones. Siguiente paso: mover tendencias históricas a una RPC/consulta agregada cuando el volumen real justifique paginación o análisis multi-año.

### Frontend shell y telemetría — 2026-08-04

- Telemetría: Sentry usa `@sentry/browser` sin Session Replay; `webVitals` recibe adaptadores desde `loadTelemetry()` y no importa Sentry/PostHog de forma estática. `src/index.css` ya no usa `@import` de Google Fonts; `index.html` mantiene la carga externa única con `display=swap`.
- Shell React: `App.tsx` queda como coordinador de 261 líneas. La hidratación/filtrado de expedientes vive en `src/app/hooks/useCausaWorkspace.ts`; permisos en `useRoleGates.ts`; navegación protegida en `useAppNavigation.ts`; routing URL en `useUrlRouting.ts`; bienvenida en `useWelcomeGate.ts`; atajos en `useAppShortcuts.ts`; nueva causa en `useNewCausaModalController.tsx`.
- Prop drilling: `MainContent` recibe 6 props agrupadas mediante `CausaWorkspaceViewModel`, `CreateCausaActions` y `MainNavigationActions`; `CausasView` recibe esos view-models y lee `privacyMode`, `selectedFaseFilter` y `searchQuery` directamente desde Zustand.
- Routing: bridge propio con `window.history`; `src/app/routing.ts` y `useUrlRouting.ts` sincronizan URL ↔ `uiStore`, incluyendo `/login` y `/expedientes/:causaId`. `react-router-dom` fue retirado porque `npm run security-audit` falló por advisory alto en `react-router`; conversión a rutas declarativas queda pendiente hasta tener una opción segura.
- Persistencia de antecedentes: `saveBitacora()` y `saveChecklist()` calculan deltas cliente-side, pero la escritura se aplica con RPCs `security invoker` (`save_bitacora_snapshot`, `save_checklist_snapshot`) en una transacción PostgreSQL por colección. Las funciones resuelven `current_tenant_id()` y no aceptan `tenant_id` del cliente.
- Formularios: `react-hook-form@7.84.0` quedó instalado. `NewCausaModal` usa `useNewCausaForm()` con resolver Zod local (`newCausaFormSchema`); `EditCausaModalForm` y `LoginPage` usan schemas compartidos (`editCausaFormSchema`, `loginFormSchema`, `passwordResetRequestSchema`, `passwordUpdateFormSchema`). Los errores inline usan `aria-describedby` y tests unitarios cubren los schemas.
- Gráficos: `TrendChart`, `MonthlyBars` y `LegendPill` viven en `src/shared/ui/charts/`. `DashboardTrendsPanel` y `ReportsCenter` reutilizan el contrato `TrendChartPoint`/`ChartSeriesItem`.
- Accesibilidad: `npm run test:a11y` ejecuta `@axe-core/playwright` sobre dashboard público y login. El workflow de CI usa `PLAYWRIGHT_USE_WEBSERVER=true` para levantar el servidor Playwright en CI. El skeleton del dashboard usa `role="status"` y los textos de loader/login cumplen contraste AA básico.

### Notificación de Inicio de Indagación (documento de causa) — 2026-08-06

- Feature "Notificación de Inicio de Indagación" como documento oficial de causa, hoja Carta (216x279mm), **sin IA**: plantilla fija editable de 9 secciones numeradas, vista previa con validación de desbordamiento, impresión y anulación. Aislada del flujo de cartas disciplinarias y del DraftPanel/Gemini.
- Migración `20260806090000_add_causa_documents_notificacion_inicio_indagacion.sql`: tabla `causa_documents` (snapshot jsonb de trazabilidad, estados `Pendiente/Notificada/Anulada`, tenant por RLS + índice compuesto) y RPC transaccional `mark_causa_document_notified` que en una sola transacción actualiza el documento, completa el hito `chk_rec_3` e inserta la entrada de bitácora tipo `Notificación`. La PK de `checklist_items` es `(id, causa_id)`, por lo que el `ON CONFLICT (id, causa_id)` del RPC es válido.
- Integración UI: `ProcessChecklist.tsx` renderiza `CausaNotificationPanel` en el hito `chk_rec_3` (solo Recepción); reemplaza el registro genérico de hitos para ese hito. `docente` solo puede leer (aviso).
- `DraftPanel` limita la redacción asistida de la vista legal a informes; la notificación inicial se mantiene en el hito de Recepción sin IA.
- Robustez/seguridad anexa al diff: `isValidUuid` en `admin.ts` (membership PATCH), guard de `tenantId` en `processDisciplinaryPdf.ts`, `AbortController` + rollback optimista en `useAuditDraft`/`useDocumentManager`, deep-link a expedientes más allá de la primera página en `useCausaWorkspace`/`fetchCausaDetails`, y `useStudentsQuery` gateado por `isAuthenticated`.
- Tests: `src/features/causas/notificacionDocgen/notificacionDocgen.test.ts` (unit) + `tests/notificacion-docgen.spec.ts` (E2E, se omite sin credenciales E2E). Suite completa al cierre: 719 tests verdes (159 suites); lint + typecheck + build verdes.
- **Pendiente de registro:** el E2E requiere credenciales staff para ejecutarse; el trabajo quedó persistido en el branch `allow-staff-disciplinary-process`.

### Auditoría integral + fixes — 2026-08-06

- Informe completo en `docs/reviews/audit-integral-20260806.md`: baseline (lint ✅, 449 tests/89 suites, build ✅, `npm audit` 0 vulnerabilidades), 0 CRÍTICO · 8 ALTO · 16 MEDIO · 14 BAJO.
- **QC-01**: `causaDocuments.service.ts` corrige `.select()` con columnas explícitas (evita `SELECT *` → rompe API de Supabase).
- **SEC-01/02**: migración `20260806093000_revoke_anon_table_access.sql` — `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon` + revoca acceso a funciones internas (`app_role()`, `current_app_role()`, `current_tenant_id()`, `clean_old_logs()`, `count_affected_tests()`). Las RPC públicas `get_public_dashboard_kpis`/`teacher_get_public_*` son `SECURITY DEFINER` y quedan intactas.
- **QC-06**: headers SPDX agregados a 7 archivos que los tenían en falta.
- **QC-08**: removido `import React` de `markdownUtils.tsx`.
- **PERF-10**: logo móvil `veritas2.webp` (404) reemplazado por `public/veritas.png` copiado desde `src/assets/veritas.png`.
- **QA-11**: umbral de cobertura subido de 60 a 80 en `package.json` (`--test-coverage-lines=80`).
- **QA-01**: nuevos tests `cartas.service.test.ts` (14 tests: `resolveCartaWorkflowStatus`, `getCartaWorkflowLabel`, `registerPhysicalCartaForStudent`, `fetchCourseCartaRanking`, `fetchCartaTableStates`) y `annotations.service.test.ts` (21 tests: fetch/update/trends/RPCs). Patrón: `MockQueryBuilder` encadenable + mutación de `supabase.from`/`supabase.rpc` + `useAuthStore.setState` (patrón de `bitacora.service.test.ts`).
- **QA-02**: timeline sin tests — extraída lógica pura `computeBreaches(causa)` de `useBreaches.ts` (el hook ahora es un `useMemo(() => computeBreaches(causa), [causa])`); tests `useBreaches.test.ts` (15 tests de brechas Circular 482/Ley 21809: resguardo, socioemocional, Aula Segura, plazos vencidos, confidencialidad, monitoreo) y `processSections.test.ts` (4 tests de las 5 fases).
- **QA-03**: `auth.service.test.ts` (9 tests) mockeando `supabase.auth` — `signInWithEmail`, `requestPasswordReset` (con/sin `window`), `updatePassword`, `signOut` (scope local), `onAuthStateChange`.
- **DOC-01**: README y memoria actualizados — 719 tests/159 suites, cobertura 92.64%/81.87%/91.85%, umbral 80; eliminadas referencias a `docx`, `pdf-lib` y `etapas.service.ts` (ya no existen; documentos con react-to-print y etapas dentro de `cartas.service.ts`).
- **QA-01 (continuación, ronda 2)**: nuevos tests para 6 servicios Supabase que estaban en 0%: `reports.service.test.ts` (5), `causas.service.test.ts` (14), `courses.service.test.ts` (7), `admin.service.test.ts` (12), `institution.service.test.ts` (18), `causaDocuments.service.test.ts` (10). Para `admin.service` e `institution.service` (endpoints fetch) el patrón es mockear `supabase.auth.getSession()` + `globalThis.fetch` + `Object.defineProperty(response, 'json', ...)`.
- **QA-01 (ronda 2) — hallazgos**: `reconcileChecklistFromBitacora` de `causas.service.ts` expande a la checklist base completa confirmada (`getBaseChecklist()`); en tests buscar por id (`chk_rec_1`), no por `length === 1`. `admin.service.ts` define `interface FetchMockOptions` y usa `afterEach` solo si hay teardown; ambos provocan `no-unused-vars` si se importan sin usar.
- **Verificación final ronda 2 (2026-08-06)**: `npm run lint` ✅, `npm run test` ✅ **578 tests / 136 suites / 0 fail**, `npm run test:coverage` ✅ **87.67% líneas / 83.31% ramas / 88.72% funciones** (umbral 80). README y memoria actualizados a estos conteos. Quedan sin tests (cobertura <80% objetivo): `student-history.service.ts`, `notifications.service.ts`, `documentTemplates.service.ts`, `platform.service.ts`, `public-dashboard.service.ts`, `storage.service.ts`, `disciplinary-rules.service.ts`, `disciplinary-storage.service.ts`.
- **QA-01 (ronda 3, cierre 2026-08-06)**: tests para los 8 servicios restantes — `disciplinary-rules.service.test.ts` (3), `disciplinary-storage.service.test.ts` (11, con `File` nativo y mock de `supabase.storage.from`), `documentTemplates.service.test.ts` (8, con fetch mock + `isDocumentTemplate`), `notifications.service.test.ts` (9, incl. RPC `sync_notification` con parámetros snake_case), `platform.service.test.ts` (7, con fetch mock y FormData), `public-dashboard.service.test.ts` (4, RPC `get_public_dashboard_kpis` y mapeo camelCase/strings), `storage.service.test.ts` (15, con mock de `window` para `openDocument`), `student-history.service.test.ts` (6, con validación Zod de UUID). Cobertura de servicios: 6 de 8 al 100% (resto ≥97%).
- **Verificación final ronda 3 (2026-08-06)**: `npm run lint` ✅, `npm run test` ✅ **645 tests / 159 suites / 0 fail**, `npm run test:coverage` ✅ **88.70% líneas / 83.08% ramas / 89.89% funciones**. README y memoria actualizados a estos conteos. Todos los servicios de `src/shared/api/services/` quedan con cobertura ≥62% (cartas.service.ts el menor, por complejidad de RPCs).
- **QA-05 serverless backend (2026-08-06)**: cobertura de backend serverless sube con 39 tests nuevos en 4 archivos: `server/api/services/gemini.test.ts` (6), `server/api/services/caseDocuments.test.ts` (8), `server/lib/disciplinaryPdfAnalysis.integration.test.ts` (10), `server/api/routes/__tests__/institution.handlers.test.ts` (15). Se exportó `getTenantFromRequest` desde `server/api/routes/institution.ts` para test unitario del guard de superadmin. Suite final: **684 tests / 159 suites / 0 fail**, coverage **92.81% líneas / 81.32% ramas / 91.80% funciones**. Patrón `mock.module` (flag `--experimental-test-module-mocks`) con handlers delegables: `let nextResponse/tableHandler/queryHandler/pdfTextItems` reseteados por test. El job `rls-validators` del CI (QA-04) ejecuta `test:multitenant` y `test:roles` cuando existen secrets.

- **Cierre pendientes MEDIO auditoría (2026-08-06)**:
  pm run lint OK,
  pm run test -> **719 tests / 159 suites / 0 fail**,
  pm run test:coverage -> **92.64% líneas / 81.87% ramas / 91.85% funciones** (umbral 80). README actualizado. Pendientes cerrados: PERF-01 (Sentry tracing solo prod), PERF-02 (RPC get_tenant_user_counts() en 20260806123000_add_tenant_user_counts_rpc.sql; GET /api/platform/tenants usa una query agregada con fallback al conteo individual; test server/api/routes/**tests**/platform.test.ts 3 tests con mock.module), PERF-03 (filtro ciclo escolar mar-dic + limit 500 en etchCartaTableStates; se perdió temporalmente por un restore masivo de headers SPDX y se re-aplicó), PERF-04 (RPC get_annual_annotation_trend(p_year) en 20260806120000_add_annual_annotation_trend_rpc.sql con celdas mensuales disjuntas; etchAnnualAnnotationTrends usa RPC con fallback a rom('inspectorate_records') reconstruyendo registros sintéticos por subgrupos high/resto; 3 tests nuevos en nnotations.service.test.ts; también se re-aplicó tras el restore), PERF-09 (chunk documents eliminado, límite 550), DB-02 (20260806124000_enforce_carta_events_tenant.sql: backfill desde cartas_disciplinarias/students, DELETE huérfanos, SET NOT NULL), QA-14 (29 tests en disciplinaryStage.test.ts), QC-06 (headers SPDX a 11 archivos restantes), QC-07 (alias @/shared/* en tsconfig+vite, 45 archivos con imports unificados de @/src/shared/ a @/shared/; Vite requiere orden del alias específico antes de @), QC-08 ya resuelto en HEAD.

- **Ejecución de migraciones y alineación del ledger (2026-08-06)**: las 5 migraciones pendientes se aplicaron en Supabase (`mjhbcqwtjzgvqssfiore`) vía `supabase db push --db-url` con la pooler de sesión (puerto **5432**, no 6543) de `aws-0-us-east-2.pooler.supabase.com`. El proyecto real NO está en la org del token CLI (`ywqshshppdkzfnhhsfuc`), por lo que `supabase link` y el login role devuelven 403; la vía útil es la conexión directa por pooler con `SUPABASE_DB_PASSWORD`. Se aplicaron: `20260806093000_revoke_anon_table_access.sql` (revoca tablas y 5 funciones de anon), `20260806120000` (PERF-04 RPC tendencia), `20260806123000` (PERF-02 RPC conteos), `20260806124000` (DB-02 `carta_events.tenant_id NOT NULL`), y `20260806130000_revoke_app_role_public_execute.sql` (fix SEC-02: `app_role()` quedaba ejecutable por anon vía el grant default a PUBLIC). El historial se alineó con `supabase migration repair`: 16 versiones remotas (11 de julio cubiertas por el baseline `00000` + 5 gemelas renombradas) se marcaron `reverted`, y 7 versiones locales ya aplicadas físicamente se marcaron `applied` (incluidas `20260801140000`, `20260806090000` aplicadas vía Management API sin registrarse). Verificado en base: `get_annual_annotation_trend` y `get_tenant_user_counts` ejecutan OK, `carta_events.tenant_id` es `NOT NULL`, y `anon` ya no tiene `EXECUTE` en `app_role()` ni acceso a tablas.

### Remediación auditoría 2026-08-07 (nanoid, PERF-05, DB-01, QC-03)

- Informe de verificación previo: `docs/reviews/audit-integral-2026-08-07.md` (18 cerrados, 8 parciales, 3 no cerrados, 7 pendientes de verificación). Verificación remota en Supabase: SEC-01/SEC-02/DB-02 cerrados; Security advisors: 59 hallazgos (1 ERROR: view `teacher_public_view` SECURITY DEFINER; WARN funciones anon/authenticated ejecutables y leaked password protection deshabilitado; INFO: `coexistence_cases` y `membership_invitations` con RLS sin policies). Migraciones locales↔remotas 20/20 sincronizadas sin drift.
- **nanoid**: `npm audit fix` → nanoid 3.3.18; `npm audit --omit=dev` = 0 vulnerabilidades. Vulns dev restantes (tmp/uuid/inquirer vía `@lhci/cli`) requieren `npm audit fix --force` breaking → no aplicadas.
- **PERF-05**: `DashboardStats.tsx` `DASHBOARD_STALE_TIME_MS = 300_000` (staleTime 5 min en lugar de 30 s).
- **DB-01**: migración `20260807000000_carta_events_uuid_fk.sql` aplicada en remoto (vía Management API): columnas `carta_id_uuid`/`student_id_uuid` uuid NULL, backfill 227/227 filas, 3 índices (`idx_carta_events_carta_id_uuid_created_at`, `idx_carta_events_student_id_uuid_created_at`, `idx_carta_events_tenant_carta_student`), 2 FKs ON DELETE CASCADE (`fk_carta_events_carta_id_uuid`, `fk_carta_events_student_id_uuid`). `cartas.service.ts` escribe en columnas old+new (`carta_id`/`student_id` y `carta_id_uuid`/`student_id_uuid`), consulta con `.in('carta_id_uuid', ...)` y la interface `CartaEvent` incluye ambos pares. **Pendiente**: swap final (DROP columnas text, RENAME a uuid) en ventana de mantenimiento coordinada con el código cliente.
- **DB-01 (SWAP APLICADO EN PRODUCCIÓN 2026-08-08)**: la migración `20260808000000_swap_carta_events_uuid_final.sql` se aplicó a producción (vía Management API/MCP sobre `mjhbcqwtjzgvqssfiore`, no se usó el runbook Docker porque no está disponible en el entorno). Prechecks inmediatos 0/0/0/0, backup `carta_events_pre_swap_backup` (227 filas), swap OK. **Hotfix aplicado**: `carta_id_text_old`/`student_id_text_old` conservaban NOT NULL heredado → `ALTER COLUMN ... DROP NOT NULL` (si no, todo INSERT del cliente fallaba). Postchecks: columnas canónicas `carta_id`/`student_id` uuid NOT NULL, 0 NULLs, 0 huérfanos, FKs e índices asociados correctamente. Smoke: INSERT uuid=uuid OK y eliminado (0 residuos), JOINs uuid OK, funciones reescritas sin referencia a `*_text_old`. **Pendiente**: aplicar `20260808100000_drop_carta_events_text_columns.sql` tras 24–72h de observación (borra `*_text_old` y renames cosméticos).
- **DB-01 (runbook validado 2026-08-08, stack local Docker)**: `supabase db reset --local` aplica las 22 migraciones en orden (uuid_fk → swap → drop) y el seed completo sin errores. Verificado en base real: columnas `carta_id`/`student_id` de `carta_events` son **uuid**, 0 NULLs, 0 huérfanos; FKs `fk_carta_events_carta_id`/`fk_carta_events_student_id` ON DELETE CASCADE; índices `idx_carta_events_carta_id_created_at`/`idx_carta_events_student_id_created_at` renombrados y 4 índices text legacy eliminados; columnas text legacy ya no existen. Smoke tests SQL: insert UUID directo OK, `register_physical_carta` con JWT simulado crea carta física + evento OK, `get_annotation_course_stage_counts`/`get_annotation_stage_counts` ejecutan sin error. **Fix seed descubierto durante la validación**: `checklist_items` tiene PK compuesta `(id, causa_id)` (baseline línea 2223) pero el seed usaba `ON CONFLICT (id)` → `42P10`; corregido a `ON CONFLICT (id, causa_id)` en `supabase/seed.sql` (error pre-existente, no causado por DB-01). **Nota runbook**: `supabase db push` NO tiene flag `--file` (solo `--include-all`, `--db-url`, `--linked`, `--local`, `--dry-run`); la vía correcta es `psql -f` (Opción A) o `supabase db push` con el directorio de migraciones completo.
- **DB-01 (artefactos runbook 2026-08-08)**: se generaron `scripts/run_swap_carta_events.sh` (runbook automatizado con `--backup`, `--swap`, `--drop`, `--rollback`, `--monitor`; usa Docker + `psql -f`; corregidos los typos `count()` → `count(*)` del runbook original), `.github/pull_request_template.md` (template PR DB-01 con checklist) y `.github/workflows/db01-prechecks.yml` (workflow manual de prechecks contra staging vía `workflow_dispatch`, requiere secreto `STAGING_DATABASE_URL`; no aplica migraciones, solo lecturas). Validados: `bash -n` OK, YAML OK, queries del script verificadas contra base local post-swap (0/0/0). El script no se puede ejecutar completo en WSL local por falta de integración Docker; está diseñado para runner Linux de la ventana de mantenimiento.
- **QC-03**: `src/shared/api/lib/sessionContext.ts` dejó de ser el puente services→stores: ahora son funciones puras `getSessionTenantId(tenantId?)`, `getSessionUserId(userId?)`, `getSessionUserEmail(email?)` que solo devuelven el parámetro. Los 4 servicios que leían el store ahora reciben `tenantId`/actor como parámetros: `annotations.service.ts` (`updateAnnotation`, `fetchAnnualAnnotationTrends`), `cartas.service.ts` (`createCartaEvent` con `actor`, `createPendingCartaForStudent` con `tenantId` en params), `causas.service.ts` (`createCausa(causa, tenantId)`), `disciplinary-rules.service.ts` (`fetchDisciplinaryRules(tenantId)`). Los call sites (hooks/componentes/stores) obtienen los valores desde `useAuthStore` y los pasan: `causasStore.ts`, `CartasTab.tsx` (tenantId + actor desde `sessionUser`), `NewDisciplinaryProcessModal.tsx` (`queryFn: () => fetchDisciplinaryRules(tenantId)`), `DashboardStats.tsx`, `EditAnnotationsTab.tsx`. Tests co-located actualizados a pasar valores explícitos.
- **SEC-A/B/C mitigaciones críticas APLICADAS EN PRODUCCIÓN 2026-08-08** (security-advisors del proyecto `mjhbcqwtjzgvqssfiore`, vía MCP Supabase):
  - **SEC-A (ERROR resuelto)**: `teacher_public_view` (exponía PII ausencias+estudiantes+cursos a `authenticated` sin filtro de tenant y con grants DML) → `ALTER VIEW ... SET (security_invoker = true)` + `REVOKE INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER FROM authenticated` + `REVOKE ALL FROM anon` + `GRANT SELECT TO authenticated`. Verificado: `reloptions={security_invoker=true}`, grants solo SELECT para authenticated.
  - **SEC-B (WARN resuelto)**: `REVOKE EXECUTE ... FROM anon/authenticated` + `GRANT ... TO service_role` en `set_tenant_id(uuid)`, `process_audit_log()`, `clean_old_logs(integer)`, `sync_tenant_to_jwt()` (además `REVOKE ALL FROM PUBLIC`), `handle_new_user()`. Verificado: `execute_grantees = postgres,service_role` para las 5. **Los triggers siguen funcionando**: Postgres no exige EXECUTE del usuario para disparos internos (triggers verificados habilitados: `tr_audit_absences`, `tr_audit_students`, `trg_profiles_sync_tenant_to_jwt`, `trigger_causas_updated_at`, etc.).
  - **SEC-C (WARN resuelto)**: `CREATE OR REPLACE` con `SET search_path TO 'public', 'pg_temp'` en `app_role()`, `audit_logs_sync_actor_columns()`, `get_absence_stats()`, `is_management()`, `update_updated_at_column()` (public, no storage). **Bug latente corregido de paso**: `is_management()` usaba `p.id = auth.uid()` (columna inexistente; `profiles` usa `user_id`) → corregido a `p.user_id`.
  - **Pendiente SEC-D**: leaked-password protection = toggle manual en Supabase Console (Authentication → Security); no hay API/MCP.
  - **Pendiente SEC-E**: drop final DB-01 tras 24–72h de observación (`scripts/run_swap_carta_events.sh --drop`).
  - **No revocar a ciegas**: los demás WARNs SECURITY DEFINER (`get_public_dashboard_kpis`, `get_teacher_dashboard`, `current_role`, `teacher_get_public_*`) son usos intencionales vía RPC desde el frontend (dashboard público read-only) — evaluar uno a uno.
  - **Artefactos runbook**: `scripts/critical_mitigations.sh` (dry-run por defecto, `--apply`, `--verify`) + `scripts/critical_mitigations/` con `01_alter_view_to_invoker.sql`, `02_revoke_grant_functions.sql`, `03_harden_search_path.sql`, `04_verify.sql`, `README.md`.
  - Baseline post-mitigación: `npm run typecheck` ✅, `npm run lint:code` ✅.
  - **SEC-F/H (2026-08-08, segunda ronda)**: REVOKE de `anon`/`authenticated` en 13 funciones SECURITY DEFINER sin call sites que exponían PII cross-tenant: `teacher_get_public_absences(_masked)`, `teacher_get_public_absence_detail`, `teacher_get_public_courses`, `teacher_get_public_instant_messages`, `teacher_get_instant_messages`, `get_teacher_dashboard` (rota + **grant a PUBLIC revocado**), `current_role`, `count_affected_tests`, `generate_process_number`, `get_suggested_letter_type`, `get_usage_stats`, `get_daily_active_users` (todas quedan solo para `service_role`). Se mantienen las legítimas: `get_public_dashboard_kpis` (dashboard público read-only con filtro tenant 'default'), rankings/resúmenes de anotaciones usados vía RPC (`get_annotation_stage_counts`, `get_course_carta_ranking`, `get_student_annotation_ranking`, `get_student_annotation_summary`, `get_teacher_annotation_ranking`, `current_user_memberships`) y las que filtran por `auth.uid()`/`current_tenant_id()` (`current_app_role`, `current_tenant_id`, `has_app_access`, `get_latest_analysis`).
  - **SEC-G (2026-08-08)**: `coexistence_cases` (tabla no usada por la app) tenía `GRANT ALL` a anon/authenticated heredado del baseline → revocado, queda solo `service_role` (mismo patrón que `membership_invitations`). Ambas tablas mantienen RLS deny-all intencional (INFO advisors, sin fuga).
  - **Advisors security post-mitigación**: ERROR `teacher_public_view` eliminado; `anon` ejecutable solo `get_public_dashboard_kpis` (intencional); `authenticated` ejecutable = 11 funciones todas legítimas; pendientes: leaked-password (manual consola) + 2 INFO RLS sin policy (intencional).
  - **PERF ronda 3 (2026-08-08, advisors rendimiento)**: `duplicate_index` resuelto (`DROP INDEX idx_causas_tenant_updated`, idéntico a `idx_causas_tenant_fecha`; baseline líneas 2455/2463). `no_primary_key` resuelto: `carta_events_pre_swap_backup` (backup del swap DB-01) ahora tiene PK sobre `id` (227/227 únicos, sin NULL). `unindexed_foreign_keys` 17→**0**: 17 índices compuestos creados (`idx_instant_messages_course_id/created_by`, `idx_notifications_user_id`, `idx_report_history_created_by`, `idx_institution_documents_uploaded_by/archived_by`, `idx_institution_rule_versions_created_by/published_by`, `idx_institution_settings_updated_by`, `idx_membership_invitations_application_code`, `idx_disciplinary_processes_created_by`, `idx_disciplinary_process_files_uploaded_by`, `idx_disciplinary_annotations_corrected_by`, `idx_document_analyses_confirmed_by/file_id`, `idx_coexistence_cases_curso_id`, `idx_causa_documents_causa_id`).
  - **PERF ronda 3 (auth_rls_initplan)**: 13 políticas RLS reescritas con initplan `(select auth.uid())` para evitar evaluaciones por fila: `app_memberships_select_own`, `audit_events_insert_same_tenant`, `p_instant_messages_staff_insert`, `p_profiles_self_select`, `profiles_tenant_insert/update/select`, `usage_events_insert_own`, `notifications_insert_own/select_own/update_own`, `report_history_insert_same_tenant`, `report_history_update_creator`. Verificado en `pg_policies`: las 13 contienen `( SELECT auth.uid() AS uid)` (Postgres normaliza la re-serialización a mayúsculas — usar `ILIKE` al verificar, no LIKE case-sensitive). `auth_rls_initplan` 13→**0**.
  - **PERF ronda 3 (pendientes documentados)**: `unused_index` 49 (32 preexistentes + 17 nuevos sin stats aún) son INFO; verificado con `pg_stat_user_indexes` que TODOS reportan `idx_scan=0` con tamaño mínimo (8–312 KB) → dataset pequeño donde el planificador prefiere seq scan. **No dropar a ciegas**: re-analizar con tráfico real y `pg_stat_user_indexes` antes de remover. `multiple_permissive_policies` 19: patrón intencional (política tenant + política staff/superuser combinadas con OR) — documentado, no tocar. Advisors performance final: 0 ERROR/WARN accionables; solo INFO/WARN documentados.
  - **E2E integral (2026-08-08)**: suite Playwright **47/47 ✅** (staff + superadmin + público + backend + documento Carta). Se agregó `SUPABASE_JWT_SECRET` a `.env.local` (valor de 88 chars proporcionado por el usuario) para habilitar el test `confirmación PDF bloquea roles básicos antes de tocar Storage` (`backend-e2e-review.spec.ts:111`), que antes quedaba skipped. El verificador del servidor acepta el secret crudo o base64 (`auth.ts:52` itera ambas variantes); el test firma JWT HS256 self-contained con `app_metadata.tenant_id`/`role` (fast-path `injectTenantContext`, sin round-trip a BD).
  - **Membresías Fase 3 verificadas (2026-08-08)**: `usuario@colegio.cl` (role staff) y `superadmin@colegio.cl` tienen membresía **activa** en `app_memberships` (application_code=`convivencia`, is_active=true, tenant 00000000-0000-0000-0000-000000000001) y la app `convivencia` está activa en `applications`. Flags actuales: `VITE_APP_MEMBERSHIPS_ENABLED=false`, `ENFORCED=false`, `ALLOW_LEGACY_FALLBACK=true` → modo **legacy** (sin chequeo; `getMyMembership` retorna `not_available` sin llamar la RPC). La RPC `current_user_memberships()` está endurecida (search_path fijo, filtro por auth.uid()+current_tenant_id(), grants solo postgres/authenticated/service_role). Si se activa enforcement, ambas cuentas pasarían el chequeo. **Spec E2E endurecido (2026-08-08)**: `tests/smoke-membership.spec.ts` ahora deriva el modo real desde las flags y cada test se salta si no corresponde (elimina falsos positivos). transition aserta que la RPC `current_user_memberships` SÍ se consulta; enforced se dividió en dos (staff con membresía activa entra; cuenta sin membresía ve "No tiene acceso a esta aplicación", sin OR laxo). Se creó la cuenta E2E `e2e-sin-membresia@colegio.cl` (role staff, password `e2e-nomembership-2026`, email confirmado, sin membresías activas en `app_memberships` porque el trigger `sync_convivencia_membership_from_profile` la crea automáticamente al insertar el profile y luego se desactiva `is_active=false`; se documenta en `.env.example` con `E2E_NO_MEMBERSHIP_EMAIL/PASSWORD`). Nota GoTrue: los usuarios creados por SQL directo en `auth.users` necesitan `confirmation_token`/`recovery_token`/`email_change_token_new`/`email_change_token_current`/`email_change` con `''` (string vacío) y `provider_id` de identidad = email (no UUID), o el login falla con `converting NULL to string is unsupported`. **Verificación en los 3 modos con flags reales**: legacy 2✅/3⏭️, transition 2✅/3⏭️, enforced 3✅/2⏭️.
### Auditoría integral 2026-08-15 (runbook: Fases 1-4)

- Runbook de referencia: `docs/operations/runbook-auditoria-integral-2026-08-15.md`. Ejecutado sin commit/push (pendiente autorización). DB compartida con el proyecto `inasistencias` (mjhbcqwtjzgvqssfiore) - no tocar objetos de inasistencias.
- **Fase 1A/1B**: proyecto Supabase viejo `jjwzhnofiepvliugowr` eliminado; fix JWT HMAC: `ensureJwtConfig` + validación de secret no vacío y `exp` obligatorio en `server/middleware/auth.ts`.
- **Fase 1C (PAUSADA)**: `usage_events.tenant_id` es objeto compartido con inasistencias; requiere confirmación. Nota: `server/api/routes/usage.ts` ya inserta `tenant_id` desde el servidor (columna NO existe en remoto → `POST /usage/events` responde 503 hoy, bug vivo preexistente).
- **Fase 1D/1E (APLICADAS 2026-08-16)**: `20260815170000_harden_convivencia_rls_roles.sql` y `20260815173000_fix_generate_process_number_tenant.sql` aplicadas con `supabase db push --linked --include-all`. Validación: `migration list` OK (columna remota poblada), `npm run test:roles` 9/9, staff DELETE bitácora bloqueado por RLS (204 sin filas), INSERT staff OK, service_role DELETE OK; `generate_process_number`: tenant ajeno → 403 `tenant mismatch`, tenant propio → `DP-2026-0165`, service_role → `DP-2026-0001`.
- **Fase 1F**: errores sanitizados con `clientErrorBody` en admin/platform/institution/processDisciplinaryPdf.
- **Fase 1G**: rateLimit en `PUT /document-templates` (`templates.ts`); rama 413 (`entity.too.large`) en `errorHandler.ts`.
- **Fase 2A (gate de transición de estado)**: `isValidStateTransition(desde, hasta)` en `src/shared/lib/schemas/editCausaForm.ts`. Regla: no avanzar saltando más de una fase (FASE_ORDEN: Recepción 1, Investigación 2, Resolución 3, Apelación 4, Seguimiento 5); retroceder libre (correcciones). `createEditCausaResolver(estadoActual)` factory en `EditCausaModalForm.tsx` (usa `causa.estadoActual`). No hay ruta server de update de causas (cliente llama directo a Supabase) - el gate vive en el resolver (único punto de escritura). Trigger DB = hardening opcional diferido.
- **Fase 2B**: plazos centralizados en `src/shared/lib/legalCompliance/constants.ts` (`MAX_PLAZO_INVESTIGACION_DIAS`, `MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS`, `DIAS_ALERTA_PLAZO_CRITICO`, `MAX_PLAZO_SUSPENSION_DIAS`, `PLAZO_RECONSIDERACION_DIAS`); literales reemplazados en `deadlineValidators.ts` y `causaPresentation.ts`.
- **Fase 2C**: `CLAUSULA_RECONSIDERACION` (5 días hábiles ante Dirección) agregada al `cierre` de las 3 cartas en `docTypes.ts` (amonestacion, compromiso_conductual, derivacion).
- **Fase 2D (brechas)**: `computeBreaches` en `useBreaches.ts` + 2 reglas: (1) `chk_imp_1` (apelación informada) requerido antes de RESOLUCION_EJECUTORIADA/CAUSA_CERRADA; (2) priorización de medidas formativas en fases de ejecución (regex sobre `medidasEjecutadas`). Tests en `useBreaches.test.ts`.
- **Fase 3**: Sentry solo en producción (`src/lib/telemetry.ts` con `import()` condicional + NOOP_SENTRY en dev); `aulaSeguraCount` con `useMemo` en `App.tsx`. **Bug corregido durante lint**: el useMemo estaba DESPUÉS de early returns (hooks condicionales) - movido arriba de los returns. `refetchOnMount` = default v5 (no-op); hash JSON = YAGNI.
- **Fase 4A**: tests de `legalCompliance/` (9 tests) y `maskName`/`maskRut` (7 tests). **Bug de timezone corregido**: `legalCompliance/dateUtils.ts` parseaba `new Date('YYYY-MM-DD')` (UTC) pero operaba con métodos locales - en America/Santiago los plazos legales se desplazaban 1 día. Nuevo `parseDateOnly()` (construcción local) + `formatDateOnly()` local (evita `toISOString()` UTC).
- **Fase 4B**: funciones de validación exportadas y testeadas sin mockear IA: `normalizeHistory` (advisor), `isUsableImprovement` (improve), `isValidEventName`/`hasSafeProperties` (usage), `getBearerToken`/`getProcessErrorResponse` (processDisciplinaryPdf). Tests de middlewares `requireRole`/`requireTenant` (8 tests). Patrón: superadmin NO tiene bypass implícito en `requireRole` - las rutas lo listan explícitamente (templates/usage: `['superadmin','admin','direccion']`).
- **Fase 4C (limpieza legacy)**: `src/components/` (29 shims de re-export) ELIMINADO. Los 6 consumidores ahora importan directo de FSD: `lazyAppComponents.ts` (MainContent/CommandPalette/LoginPage), `NewCausaModalBoundary.tsx` (features/causas/ui), `AdvisorView.tsx` (features/ai-advisor), `MainContent.tsx` (features/dashboard). `legacyCompatibility.test.ts` reemplazado por guard `src/app/architecture.test.ts` (verifica que `src/components` no exista y consumidores apunten a FSD).
- **Fase 4D**: memoria sincronizada (esta sección). Ledger `04-canonical-object-ledger.md` actualizado con 1D/1E aplicadas (policies por rol).
- **Estado final**: `npm run lint` OK, typecheck OK, **787 tests / 171 suites / 0 fail**, `npm run build:web` OK.
- **Pendientes**: confirmación 1C con inasistencias (endpoint `/usage/events` 503 mientras tanto); Fase 5 E2E final (solo tras aprobación); feriados chilenos en cálculos de días hábiles (opcional, tabla es de inasistencias).

### Auditoría integral 2026-08-15 — Fase 5 (E2E final) cerrada (2026-08-16)

- **`tests/auditoria-final.spec.ts` (nuevo)**: 4/4 E2E verdes en el mismo run.
  1. **Flujo RICE + gate de fase**: NO persiste la causa. Razón de diseño: el staff E2E no tiene permiso de eliminación (RLS `causas_tenant_delete` solo admin/direccion/superadmin) — crear y luego borrar vía UI era imposible (el `onDelete` retorna `false` y el modal de edición queda abierto; verificado empíricamente y la causa residual `DC-2026-006` se limpió manualmente vía API). El test valida el formulario RICE completo (curso, estudiante, RUN autocompletado, gravedad, relato) SIN enviar, y el gate de fase se verifica sobre un expediente existente en modo solo lectura (abrir edición → saltar fase → verificar error → cancelar).
  2. **Cartas con cláusula de reconsideración**: tab se llama **"Carta"** (singular) en la ficha del estudiante. El botón "Crear carta" está deshabilitado hasta que carga la tabla de estudiantes; hay que esperar las filas con `expect.poll` sobre el conteo de botones "Ver detalle de". La cláusula aparece 2 veces (textarea del editor + preview) → usar `.first()` en el matcher.
  3. **Privacidad**: activa modo y verifica que el body no contiene RUN (`\d{1,2}\.\d{3}\.\d{3}-[\dkK]`).
  4. **Superadmin**: plataforma (heading "Gestión de colegios") + exportación Excel (download `.xlsx`).
- **Selector de estudiante en Nueva Causa**: `getByLabel('Estudiante')` matchea también "Curso del estudiante" (strict mode violation) → usar `getByLabel('Estudiante', { exact: true })`. Los `<option>` de `<select>` son `hidden` para Playwright → no usar `toBeVisible`, usar `expect.poll(() => select.locator('option').count()).toBeGreaterThan(1)`.
- **a11y (5.3)**: dashboard público, login y modales pasan (5/5). El test preexistente "vistas privadas principales" reporta contraste marginal en el badge "Listo para consultar" (`text-leve-700` #15803d sobre `bg-leve-50` #f0fdf4). Es un falso positivo por opacidad intermedia de animación de entrada: axe mide colores variables (#298a4e/#1e8545), el color real da 4.78:1. El CI de HEAD (c25f7b35) pasa el mismo test; localmente pasa con `--retries=2` (flaky). NO se modificó `AiAdvisor.tsx` (fuera del alcance del runbook).
- **Suite completa (5.4)**: `npm run lint` 0 errores, `npm run test` 787/787, `npm run build` OK, `npm run security-audit` 0 vulnerabilidades, `npm run test:e2e` 54 passed + 6 skipped (único fail local = test a11y preexistente flaky de 5.3).
- **Cierre**: diff revisado sin secrets. Runbook actualizado con el estado de la Fase 5. Commit/push PENDIENTE de autorización explícita.

### Aplicación de pendientes 2026-08-16 (runbook: P1-P5)

- Runbook: `docs/operations/runbook-aplicacion-pasos-2026-08-16.md`. Línea base HEAD `c25f7b35aeb519dab192fe5ff64e6fd6930f36c8`, tag `backup/aplicacion-pendientes-20260816` creado.
- **P2 y P3 ejecutadas y validadas** (ver Fase 1D/1E arriba): migraciones aplicadas con `supabase db push --linked --include-all` (la CLI pidió `--include-all` porque los timestamps eran anteriores a la última migración remota `20260815220726`).
- **P1 sigue bloqueada**: `usage_events.tenant_id` — espera confirmación de inasistencias. Endpoint `POST /usage/events` responde 503 mientras tanto (columna inexistente, insert preexistente en `usage.ts:71`).
- **P4 completada**: ledger `04-canonical-object-ledger.md` y `05-migration-reconciliation.md` actualizados con checksums SHA-256 (1D `66017AC6...`, 1E `AADC8A8E...`); README actualizado (nota de migraciones 1D/1E aplicadas 2026-08-16); runbook de auditoría marcado COMPLETADO con fases 1D/1E ✅ APLICADA.
- **P5 ejecutada (2026-08-16)**: commit `12187cd`, push `c25f7b3..12187cd master -> master`, deploy Vercel producción `gestiondecasos.vercel.app`, smoke E2E 4/4 OK. Validación pre-commit completa: lint ✅, test 787/787 ✅, build ✅, security-audit 0 ✅, E2E 54+6 ✅ (a11y flaky pasa con retries).
- **Cierre runbook pasos pendientes**: COMPLETADO — solo P1 (1C) sigue bloqueada por confirmación de inasistencias (endpoint `/usage/events` 503 mientras tanto).
