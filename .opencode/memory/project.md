# Memoria del Proyecto — Debido Proceso

## Decisiones Arquitectónicas

### Dual Server Entry Points
- `server.ts` — Dev server (Express + Vite middleware)
- `api/index.js` — Vercel serverless function
- Razón: Vercel no soporta Express en serverless; dev necesita HMR

### JWT Verification Strategy
- HMAC (HS256) first — rápido, sin llamadas HTTP
- Supabase API fallback — para tokens ES256 (migración ~5 meses)
- Razón: Performance + compatibilidad con rotación de keys

### AI Model Selection
- Groq API como proveedor principal (llama-3.3-70b-versatile)
- Selector inteligente por tipo de tarea
- Razón: Costo-efectivo, buenas capacidades en español

### Supabase Proyecto Principal
- `jjzwwhnofiepvliugowr` — "Registro Inasistencia"
- PostgreSQL 17.6.1, region us-west-2
- Razón: Proyecto principal con todos los datos

## Patrones de Código

### API Responses
```json
{ "ok": true, "data": {...} }
{ "ok": false, "error": "mensaje" }
```

### Error Handling
```typescript
try { ... }
catch (e) { console.error('[contexto]', e); }
```

### Auth Check
```typescript
const user = await getSupabaseUser(req);
if (!user) return res.status(401).json({ ok: false, error: 'No autenticado' });
```

## Convenciones

- Todo en español chileno
- License headers: `/** @license SPDX-License-Identifier: Apache-2.0 */`
- Path alias `@/` → project root
- Snake_case en DB, camelCase en TypeScript

## Ecosistema de Agentes (Actualizado)

### Skills Disponibles (29 total)
- **Core:** react-builder, typescript-review, tailwind-review, vite-optimizer, testing
- **Documentos:** pdf-official, docx-official, xlsx-official
- **Educación:** school-dashboard, data-analytics, convivencia-manager
- **Legal:** legal-compliance, due-process-validator
- **Base de datos:** db-migration, postgres-review, supabase-audit
- **DevOps:** deploy, gitflow, github
- **Investigación:** academic-writing, research, prompt-engineering
- **Automatización:** python-automation, powershell, apps-script
- **Calidad:** ponytail (YAGNI), documentation

### MCP Servers (5 configurados)
1. **memory** — Memoria persistente entre sesiones
2. **sequential-thinking** — Razonamiento paso a paso
3. **codebase-memory** — Memoria del codebase
4. **supabase** — Acceso directo a Supabase (habilitado con service role key)
5. **context7** — Documentación actualizada de librerías

### Agentes Educativos (8 especializados)
- `@analytics` — Métricas y KPIs educativos
- `@pie` — Programa de Integración Escolar
- `@utp` — Unidad Técnico Pedagógica
- `@convivencia` — Gestión de casos de convivencia
- `@legal` — Análisis legal educativo
- `@security` — Auditoría de seguridad
- `@reviewer` — Code review
- `@test` — Testing

### Workflows Disponibles (5)
1. `auditoria-seguridad` — Auditoría completa de seguridad
2. `fix-bug-critico` — Proceso de fix de bugs críticos
3. `nuevo-feature-legal` — Nuevo feature con validación legal
4. `reporte-convivencia` — Reporte completo de convivencia
5. `auditoria-completa` — Auditoría integral del sistema
