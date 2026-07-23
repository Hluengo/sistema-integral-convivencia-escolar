# Project Rules — Always Do This

## Siempre

1. Ejecutar `npm run lint` antes de commit
2. Ejecutar `npm run test` antes de push
3. Usar `import type` para imports type-only
4. Tipar props de componentes con interfaces explícitas
5. Usar Zod schemas para validación runtime
6. camelCase TS ↔ snake_case DB (mappers.ts)
7. Lazy-load componentes pesados
8. Preservar license headers
9. Crear servicio en `shared/api/services/` para nueva feature
10. Crear hook en `shared/lib/hooks/` para lógica reusable
11. Crear tests co-located (`*.test.ts`)
12. Agregar `tenant_id` con FK en tablas multi-tenant
13. Crear RLS policies (SELECT + INSERT + UPDATE + DELETE)
14. Crear migración nueva (timestamp_descripcion.sql)
15. Agregar índices en columnas de filtro
16. Documentar decisiones importantes (ADR en `docs/adr/`)

## Específico por Área

### Frontend
- React Query para fetching, no useEffect
- Zustand para estado global (separado por dominio)
- No prop drilling > 2 niveles
- UI en español chileno
- Tailwind v4 con @theme en index.css
- Radix UI para primitives (Dialog, Select, Tabs, etc.)
- Lucide para iconos

### Backend
- Actualizar AMBOS entry points (server/routes/ + server/api/routes/)
- Sanitizar input AI con sanitizeForAI()
- Rate limit endpoints (10 req/min/IP)
- Usar https module (no fetch) en Vercel serverless

### Base de Datos
- Migraciones con timestamp prefix
- UUIDs como PKs
- tenant_id NOT NULL en tablas multi-tenant
- RLS policies por operación
