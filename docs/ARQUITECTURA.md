# Arquitectura — Sistema Integral de Convivencia Escolar

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind v4, Zustand, Zod
- **Backend local:** Express + Vite middleware (`server.ts`)
- **API producción:** Vercel Serverless (`api/index.js`)
- **DB/Auth:** Supabase PostgreSQL + Auth + RLS + JWT claims
- **IA:** Groq (modelo `llama-3.3-70b-versatile`) para mejora de textos y asesoría

## Estructura FSD (Feature-Sliced Design)

```
src/
├── app/                     # Inicialización de app (main.tsx, App.tsx, index.css)
├── features/                # Features: causas, onboarding
│   └── causas/
│       ├── MainContent/     # Vistas de causas
│       ├── NewCausaForm/    # Formulario nueva causa
│       ├── ui/              # Componentes UI de causas
│       └── EditCausaModal/  # Modal edición
├── pages/                   # Páginas (vacío actualmente)
├── widgets/                 # Widgets reutilizables (vacío)
├── shared/
│   ├── api/services/        # Servicios Supabase (causas, anotaciones, etc.)
│   ├── lib/
│   │   ├── domain/          # Lógica de dominio (disciplinaryStatus)
│   │   ├── hooks/           # Hooks React (useCausasPersistence, useStudentFilters)
│   │   ├── schemas/         # Validación Zod
│   │   ├── stores/          # Zustand stores (authStore, causasStore, gearStore)
│   │   └── types.ts         # Tipos compartidos
│   └── ui/                  # Componentes UI base (Button, Dialog, Skeleton)
├── components/              # Componentes legacy con barrels
├── services/                # Barrels retrocompatibles
├── lib/                     # Barrels retrocompatibles
└── data.ts                  # Barrels retrocompatibles
```

## Multi-Tenant

### Esquema
- Tabla `tenants` con `id UUID`, `name`, `slug`
- Columna `tenant_id` en 10 tablas: `profiles`, `causas`, `bitacora_entries`, `checklist_items`, `cartas_disciplinarias`, `etapas_disciplinarias`, `inspectorate_records`, `document_templates`, `students`, `courses`
- JWT claim `app_metadata.tenant_id` para RLS rápido (sin subquery)

### RLS
- `current_tenant_id()`: lee tenant_id del JWT primero, fallback a `profiles`
- `current_app_role()`: obtiene rol del usuario desde `profiles`
- Políticas tenant-aware en todas las tablas con DELETE restringido a admin/dirección

### App
- `useAuthStore.tenantId`: se carga al autenticar desde `profiles`
- Servicios inyectan `tenant_id` en INSERT vía `useAuthStore.getState().tenantId`
- API middleware inyecta `req.tenantId` en `api/index.js`

## Seguridad

- Login obligatorio (salvo `VITE_ALLOW_LOCAL_DEMO=true`)
- RLS por rol + tenant en todas las tablas
- JWT custom claims para tenant context
- Middleware `requireAuth` verifica JWT en endpoints API
- Confirmación humana de resultados IA antes de persistir

## Flujo de Datos

```
Browser (Auth JWT + tenant_id en app_metadata)
  → Supabase RLS filtra por tenant_id automáticamente
  → Servicios frontend incluyen tenant_id en INSERTs
  → API endpoints verifican JWT y proveen tenant context
```

## Tests

- Framework: `node:test` + `node:assert/strict`
- Ejecución: `npm run test` (tsx --test)
- Cobertura: servicios, schemas, mappers, API endpoints, dominio
- 57 tests, 0 fallos esperados
