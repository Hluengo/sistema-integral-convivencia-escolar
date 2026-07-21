# Checklist: Integración MCP

## Servidores MCP Configurados (5)

### 1. memory
- **Propósito:** Memoria persistente entre sesiones
- **Uso:** Almacenar y recuperar contexto del proyecto
- **Cuándo usar:** Siempre (automático)
- **Comando:** `npx -y @modelcontextprotocol/server-memory`

### 2. sequential-thinking
- **Propósito:** Razonamiento paso a paso
- **Uso:** Problemas complejos que requieren análisis secuencial
- **Cuándo usar:** Bugs difíciles, diseño de arquitectura, debugging
- **Comando:** `npx -y @modelcontextprotocol/server-sequential-thinking`

### 3. codebase-memory
- **Propósito:** Memoria del codebase
- **Uso:** Recordar decisiones arquitectónicas y patrones
- **Cuándo usar:** Automático
- **Comando:** `npx -y codebase-memory-mcp`

### 4. context7
- **Propósito:** Documentación actualizada de librerías
- **Uso:** Consultar docs de React, Supabase, Vite, Tailwind, etc.
- **Cuándo usar:** Cuando se necesita API syntax o configuración
- **Comando:** `npx -y @upstash/context7-mcp`

### 5. supabase (habilitado)
- **Propósito:** Acceso directo a Supabase
- **Uso:** Consultas, migraciones, administración de DB
- **Cuándo usar:** Cuando se necesita acceso directo a la base de datos
- **Requiere:** `SUPABASE_SERVICE_ROLE_KEY` en .env.local
- **Comando:** `npx -y @supabase/mcp-server`

## Antes de Usar MCP

- [ ] Verificar que el servidor está activo
- [ ] Context7: tener library ID correcto
- [ ] Sequential Thinking: definir total_thoughts inicial
- [ ] Supabase: configurar token de acceso

## Errores Comunes

### context7
- `libraryId not found`: Usar `resolve-library-id` primero
- `No snippets available`: La librería no tiene ejemplos

### sequential-thinking
- `thoughtNumber > totalThoughts`: Ajustar total_thoughts
- `needsMoreThoughts: true`: Continuar pensando

### supabase
- `Invalid token`: Verificar SUPABASE_ACCESS_TOKEN
- `Permission denied`: Verificar permisos del token

## Buenas Prácticas

1. **context7**: Llamar `resolve-library-id` antes de `query-docs`
2. **context7**: Máximo 3 llamadas por pregunta
3. **sequential-thinking**: Empezar con estimación conservadora
4. **sequential-thinking**: No dudar en revisar pensamientos anteriores
5. **supabase**: Usar service role solo en server-side
6. **supabase**: Siempre filtrar por tenant_id en queries
