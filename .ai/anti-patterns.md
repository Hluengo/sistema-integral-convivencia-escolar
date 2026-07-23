# Anti-Patterns — Never Do This

## 🔴 Nunca en Frontend

1. **useEffect para fetching de datos** → Usar React Query
2. **Prop drilling > 2 niveles** → Zustand o Context
3. **Componentes gigantes (+300 líneas)** → Dividir en sub-componentes
4. **any** → unknown + narrowing
5. **CSS global fuera de index.css** → Tailwind utility classes
6. **forzar recálculo innecesario** → useMemo/useCallback solo cuando hay medición de performance
7. **mutar estado de stores fuera de acciones** → Siempre usar set() de Zustand
8. **duplicar lógica entre hooks** → Extraer a shared/lib/hooks/

## 🔴 Nunca en Backend

1. **Exponer service_role key al cliente** → Solo server-side y Vercel env
2. **Confiar en input de usuario sin sanitizar** → sanitizeForAI() antes de LLM
3. **Rate-limit insuficiente** → 10 req/min/IP para endpoints AI
4. **Usar fetch en Vercel serverless** → Usar https module (Node 18 compat)

## 🔴 Nunca en Base de Datos

1. **Modificar migraciones existentes** → Siempre crear nueva
2. **SELECT *** → Columnas explícitas
3. **Omitir tenant_id** → Todas las tablas multi-tenant
4. **Omitir RLS policies** → SELECT + INSERT + UPDATE + DELETE
5. **IDs auto-increment** → UUIDs obligatorios
6. **Cambiar tipo de columna sin migración** → Progresivo, con plan

## 🔴 Nunca en Seguridad

1. **Commit secrets** → .env.local en .gitignore, .env.example para template
2. **Desactivar RLS** → Última línea de defensa para datos de NNA
3. **Enviar datos personales a AI** → Anonimizar antes
4. **Ignorar warnings de CSP** → Vulnerabilidad XSS

## 🔴 Nunca en Documentación

1. **Documentar después** → Documentar mientras se codifica
2. **No actualizar ADR cuando cambia una decisión** → ADRs son vivos
3. **Dejar docs obsoletos** → Marcar como deprecated o actualizar
