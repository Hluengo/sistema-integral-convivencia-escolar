# Engineering Handbook — Sistema Integral de Convivencia Escolar

> **Versión:** 1.0 | **Última actualización:** 2026-07-23
> Este handbook consolida todas las convenciones, estándares y buenas prácticas del proyecto.
> Todo desarrollador (humano o IA) debe leerlo antes de modificar el código.

---

## 1. Arquitectura

### 1.1 Stack

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Runtime | Node.js | 22+ | Requerido por pdfjs-dist |
| Frontend | React + TypeScript | 19.0.1 / 5.8.2 | UI |
| Build | Vite | 6.4.3 | Dev server + bundler |
| CSS | Tailwind CSS v4 | 4.1.14 | Estilos utility-first |
| State | Zustand | 5.0.14 | Estado global |
| Data Fetching | TanStack React Query | 5.101.2 | Server state cache |
| Forms | react-hook-form + Zod | 7.82.0 / 4.4.3 | Formularios + validación |
| Backend Dev | Express + tsx | 4.21.2 / 4.21.0 | Servidor desarrollo |
| Backend Prod | Vercel Serverless | esbuild bundle | Producción |
| Database | Supabase PostgreSQL | 17.6.1 | Datos |
| Auth | Supabase Auth | — | Autenticación |
| AI | OpenRouter | llama-3.1-8b-instruct | Asistencia legal |
| Docs | docx (Word) + pdfjs-dist (PDF) | 9.7.1 / 6.1.200 | Documentos |
| Monitoring | Sentry + PostHog | 10.66.0 / 1.404.1 | Errores + analytics |

### 1.2 FSD Structure

```
src/
├── app/              # App entry, providers, global styles
├── features/         # Feature modules
│   ├── anotaciones/  # Annotations + disciplinary process wizard
│   ├── causas/       # Case management + timeline
│   ├── dashboard/    # KPIs and statistics
│   ├── estudiantes/  # Student directory
│   ├── documentos/   # Document hub
│   └── timeline/     # Interactive case timeline
├── widgets/          # Header, Sidebar
├── shared/           # Reusable code
│   ├── api/services/ # Supabase data services
│   ├── lib/          # Utils, mappers, hooks, domain logic
│   │   ├── docx/     # DOCX document generation
│   │   ├── legalCompliance/ # Legal deadline validators
│   │   ├── domain/   # Pure domain functions
│   │   └── hooks/    # Custom hooks
│   ├── ui/           # Shared UI components
│   └── stores/       # Zustand stores
├── components/       # Legacy barrel re-exports (backward compat)
├── pages/            # Login page
├── hooks/            # Re-exports from shared/
├── stores/           # Re-exports from shared/
├── services/         # Re-exports from shared/
└── lib/              # Re-exports from shared/
```

### 1.3 Dual Server Entry Points

| Entry | File | Bundle | Dev | Prod |
|-------|------|--------|-----|------|
| Dev | `server/index.ts` | tsx runtime | ✅ | ❌ |
| Vercel | `server/api/index.ts` → `api/index.js` | esbuild ESM | ❌ | ✅ |

**Regla:** Siempre mantener sincronizados ambos entry points. Si agregas una ruta, créala en `server/routes/` y su gemela en `server/api/routes/`.

### 1.4 State-driven Routing

No hay React Router. La navegación usa `uiStore.currentView` de tipo `SidebarView`:

| View | Component | Ruta (no real) |
|------|-----------|----------------|
| `dashboard` | `<DashboardStats>` | State: 'dashboard' |
| `causas` | `<CausasView>` | State: 'causas' |
| `informes` | `<AdvisorView>` | State: 'informes' |
| `alumnos` | `<StudentsPanel>` | State: 'alumnos' |
| `anotaciones` | `<AnotacionesView>` | State: 'anotaciones' |
| `documentos` | `<DocumentosView>` | State: 'documentos' |

---

## 2. TypeScript

### 2.1 Configuración

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] }
  }
}
```

### 2.2 Reglas

1. **No `any`** — Usar `unknown` + type narrowing. Si es inevitable, desactivar eslint en esa línea con comentario.
2. **`import type`** para imports que solo son tipos (enforced por ESLint).
3. **Interfaces > Types** para objetos públicos y props.
4. **Zod schemas** para validación runtime de datos externos.
5. **camelCase** en TypeScript, **snake_case** en DB (convertir con mappers.ts).
6. **Path alias `@/`** → project root. No rutas relativas profundas.

### 2.3 Patrón de Types

```typescript
// ✅ Bueno
interface CausaCardProps {
  causa: Causa;
  onSelect: (id: string) => void;
}

// ✅ type alias para uniones
type StatusValue = 'idle' | 'loading' | 'success' | 'error';
```

---

## 3. React

### 3.1 Componentes

- **Funcionales siempre**, no class components
- **Props tipadas** con interfaces explícitas
- **Un solo propósito** (Single Responsibility)
- **Composición sobre herencia**
- **Max 300 líneas** por archivo. Más grande = dividir.

### 3.2 Patrón de Componente

```typescript
interface ExampleProps {
  title: string;
  onAction: () => void;
}

export function Example({ title, onAction }: ExampleProps) {
  return <button onClick={onAction}>{title}</button>;
}
```

### 3.3 Hooks

- **Un hook por archivo**
- **Prefijo `use`** + nombre descriptivo
- **No mutar props** — llamar a stores o servicios
- **Custom hooks** en `shared/lib/hooks/` (reusables) o `features/X/hooks/` (feature-specific)

### 3.4 Estado

| Tipo | Solución | Cuándo |
|------|----------|--------|
| Estado global | Zustand | Múltiples componentes, diferentes vistas |
| Server state | React Query | Datos de Supabase |
| Form state | useReducer / react-hook-form | Formularios wizard |
| UI state | useState | Estado local de un componente |
| Context | React Context | Subárbol específico (TimelineProvider) |

### 3.5 Performance

- **Lazy load** componentes pesados (React.lazy + Suspense)
- **Evitar re-renders innecesarios** (React.memo solo si hay medición)
- **useMemo/useCallback** solo cuando hay evidencia de bottleneck
- **No useEffect para fetching** — usar React Query

### 3.6 Lazy Loading Pattern

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function Parent() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

---

## 4. Supabase

### 4.1 Client Setup

```typescript
// Client-side (browser)
const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Server-side (admin)
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});
```

### 4.2 Patrón de Servicios

```typescript
import { supabase } from '@/shared/api/lib/supabase';

export async function fetchItems(tenantId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('col1, col2, col3')  // Nunca SELECT *
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return data.map(mapRowToItem);
}
```

### 4.3 RLS Policies

Todas las tablas multi-tenant siguen este patrón:

```sql
-- Fast path: lee tenant_id del JWT
CREATE POLICY "table_tenant_select" ON public.table
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "table_tenant_insert" ON public.table
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "table_tenant_update" ON public.table
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY "table_tenant_delete" ON public.table
  FOR DELETE USING (tenant_id = current_tenant_id());
```

### 4.4 Migraciones

- **Timestamp prefix**: `YYYYMMDDHHMMSS_descripcion.sql`
- **NUNCA modificar migraciones existentes**
- **Siempre incluir**: CREATE/ALTER + RLS + índices
- **Probar con**: `supabase db push`

---

## 5. SQL

### 5.1 Convenciones

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Tablas | plural snake_case | `bitacora_entries`, `cartas_disciplinarias` |
| Columnas | snake_case | `tenant_id`, `estudiante_curso` |
| PKs | UUID | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| FKs | `{tabla}_id` | `causa_id`, `student_id` |
| Índices | `idx_{tabla}_{columna}` | `idx_bitacora_causa_fecha` |

### 5.2 Patrón de Tabla Multi-tenant

```sql
CREATE TABLE public.ejemplo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ejemplo ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ejemplo_tenant_id ON public.ejemplo(tenant_id);
```

---

## 6. APIs (Express + Vercel)

### 6.1 Patrón de Ruta

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { rateLimiter } from '../lib/rateLimit';

const router = Router();
router.use(requireAuth);
router.use(rateLimiter(10, 60000)); // 10 req/min

router.post('/api/endpoint', async (req, res) => {
  try {
    const { param } = req.body;
    // ... lógica
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[endpoint]', e);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});
```

### 6.2 Auth Middleware

```
requireAuth:
  1. Extraer Bearer token
  2. HMAC-SHA256 verification (rápido, legacy HS256)
  3. Fallback: Supabase API /auth/v1/user (ES256)
  4. Inyectar req.user + req.tenantId
```

### 6.3 Rate Limiting

- Endpoints AI: 10 req/min/IP
- Endpoints PDF: 10 req/min/IP
- Endpoints públicos: sin rate limit
- Implementación: in-memory Map (se pierde al reiniciar)

### 6.4 AI Integration

```typescript
// Llamada a OpenRouter
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'meta-llama/llama-3.1-8b-instruct',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: 0,
    max_tokens: 2000,
  }),
});
```

### 6.5 Sanitización de Input

```typescript
// Siempre sanitizar antes de enviar a AI
sanitizeForAI(input):
  - Elimina patrones prompt injection ([INST], <<SYS>>, etc.)
  - Elimina "ignore/disregard ... instrucciones"
  - Máximo 10K caracteres
```

---

## 7. Testing

### 7.1 Stack

| Tipo | Framework | Ejecución |
|------|-----------|-----------|
| Unit | `node:test` + `node:assert/strict` | `npm run test` |
| Vitest | Vitest + `@vitest/coverage-v8` | `npm run test:vitest` |
| E2E | Playwright | `npm run test:e2e` |

### 7.2 Patrón de Test

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('functionName', () => {
  it('handles happy path', () => {
    const result = functionName(input);
    assert.equal(result, expected);
  });

  it('handles empty input', () => {
    const result = functionName('');
    assert.equal(result, fallbackValue);
  });
});
```

### 7.3 Cobertura Objetivo

- **Core domain**: 100% (disciplinaryStatus, mappers, validators)
- **Services**: 80%+
- **Hooks**: 60%+
- **Components**: 50%+

---

## 8. UI/UX

### 8.1 Principios

- **Idioma**: Español chileno en toda la UI
- **Responsive**: Mobile-first, sidebar colapsable
- **Accesible**: WCAG 2.1 AA (verificado con @axe-core/playwright)
- **Consistente**: Mismo sistema de diseño en toda la app

### 8.2 Componentes UI

- **Radix UI** para primitives (Dialog, AlertDialog, Select, DropdownMenu, Tabs, Tooltip, Popover)
- **Tailwind v4** con `@theme` en `src/index.css`
- **Lucide React** para iconos
- **Sonner** para toasts

### 8.3 Privacy Mode

Toggle en Header que oculta RUTs y nombres completos de NNA. Activado via `uiStore.privacyMode`.

---

## 9. Documentación

### 9.1 Sistema de Archivos

```
docs/
├── architecture/     # Guía de arquitectura viva (numerada 00-14)
├── engineering/      # Engineering Handbook
├── adr/              # Architecture Decision Records
├── dependency-graph/ # Diagramas Mermaid de dependencias
├── reviews/          # Security + Performance reviews
└── leyes/            # Documentos legales chilenos

.ai/                  # Project Brain (resumen para IAs)
├── brain.md
├── domain.md
├── architecture.md
├── decisions.md
├── rules.md
├── conventions.md
├── anti-patterns.md
├── glossary.md
├── common-errors.md
├── migration-guide.md
└── roadmap.md
```

### 9.2 ADR Format

```markdown
# ADR-0001: [Título]

## Contexto
¿Qué problema estamos resolviendo?

## Decisión
¿Qué elegimos y por qué?

## Alternativas Consideradas
- Alternativa A: pro/contra
- Alternativa B: pro/contra

## Consecuencias
- Positivas: ...
- Negativas: ...
```

---

## 10. Git

### 10.1 Flujo

```
main ← develop ← feature/*
         ↑
       fix/*
         ↑
       hotfix/*
```

### 10.2 Commits

```
Formato: tipo(scope): descripción en español

Tipos:
  feat:     Nueva funcionalidad
  fix:      Corrección de bug
  refactor: Cambio que no agrega feature ni corrige bug
  docs:     Documentación
  test:     Tests
  chore:    Mantenimiento (deps, config)
  security: Parche de seguridad

Ejemplos:
  feat(annotations): agrega wizard de proceso disciplinario
  fix(pdf): corrige extracción de nombre con acentos
  refactor(stores): unifica stores en shared/lib
  docs(adr): agrega ADR-0001 React Query
```

### 10.3 Pre-commit Checklist

1. `npm run lint` — 0 errores
2. `npm run test` — todos pasan
3. `npm run build:web` — build exitoso
4. `git diff` — sin secrets

---

## 11. Releases

### 11.1 Versionado

Usamos [SemVer](https://semver.org/):
- **MAJOR**: Cambio incompatible en API o DB
- **MINOR**: Nueva funcionalidad backward-compatible
- **PATCH**: Bug fixes backward-compatible

### 11.2 Pre-release Checklist

1. Todas las migraciones aplicadas en producción
2. Tests pasando (unit + E2E)
3. Build exitoso (frontend + serverless)
4. RLS verificado con diferentes roles
5. ADR actualizado si hay decisiones nuevas
6. CHANGELOG.md actualizado

### 11.3 Deploy

```bash
# 1. Build
npm run build

# 2. Deploy a Vercel
vercel --prod

# 3. Verificar
# - Login funciona
# - Dashboard carga
# - Causas se listan
# - PDF se analiza
# - Documentos se generan
```

---

## 12. Multi-tenant

### 12.1 Estrategia

```
Capa 1: tenant_id column en todas las tablas de datos
Capa 2: RLS policies (tenant_id = current_tenant_id())
Capa 3: JWT fast path (app_metadata.tenant_id via trigger)
Capa 4: Storage isolation ({tenant_id}/... path)
Capa 5: Service role (bypass RLS, solo server-side)
```

### 12.2 Roles

| Rol | Permisos |
|-----|----------|
| admin | CRUD completo |
| direccion | CRUD sin delete destructivo |
| convivencia | CRUD causas, anotaciones, estudiantes |
| inspectoria | CRUD inspectorate_records |
| profesor_jefe | Su curso |
| teacher | Lectura básica |

---

## 13. Seguridad

### 13.1 Checklist

- [ ] RLS policies en todas las tablas con datos
- [ ] JWT verification con HMAC + API fallback
- [ ] Service role key nunca en cliente
- [ ] CSP header restrictivo
- [ ] Input sanitizado para AI
- [ ] Rate limiting en endpoints
- [ ] Signed URLs para storage
- [ ] Privacy mode para datos de NNA
- [ ] Sin secrets en código

### 13.2 CSP (vercel.json)

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline' fonts.googleapis.com
connect-src 'self' openrouter.ai api.groq.com *.supabase.co wss://*.supabase.co
img-src 'self' *.supabase.co data: blob:
font-src 'self' fonts.gstatic.com data:
```

---

## 14. PDF Processing

### 14.1 Pipeline

```
Upload → POST /api/process-disciplinary-pdf
  1. Download from Supabase Storage
  2. Validate (%PDF-, ≤10MB)
  3. SHA-256 hash
  4. Text extraction (pdfjs-dist)
  5. Metadata regex (student name, course)
  6. Annotation regex (type, date, text)
  7. Student matching (exact → NFD → word overlap → course)
  8. Letter suggestion (RPC)
  9. Persist to document_analyses

Confirm → POST /api/process-disciplinary-pdf/confirm
  1. Idempotency check
  2. Student verification
  3. Generate process number (RPC)
  4. Insert process + files + annotations
```

### 14.2 Stack PDF

- **pdfjs-dist@6.1.200**: Extracción de texto (requiere Node ≥ 22.13)
- **pdf-lib**: Generación de PDFs (download offline de cartas)
- **Regex puro**: Sin AI para parsing (determinista, 22 tests)

---

## 15. Document Generation

### 15.1 DOCX (Word)

```
src/shared/lib/docx/
├── builder.ts       → Construye documento
├── types.ts         → BuildDocxParams
├── templates/       → amonestacion, compromiso, derivacion + header
└── helpers/         → paragraphs, tables, signature, annotations
```

### 15.2 AI Drafts

| Tipo | Origen del Prompt |
|------|------------------|
| notificacion_apertura | Hardcoded en route |
| citacion_entrevista | Hardcoded en route |
| informe_cierre_indagacion | DB document_templates |
| informe_concluyente | DB document_templates |

---

*Aprobado por: Staff Engineer — 2026-07-23*
