# Checklist: Integración MCP

## Servidores MCP Configurados

### 1. context7
- **Propósito:** Documentación actualizada de librerías
- **Uso:** Consultar docs de React, Supabase, Vite, etc.
- **Cuándo usar:** Cuando se necesita API syntax o configuración

### 2. sequential-thinking
- **Propósito:** Razonamiento paso a paso
- **Uso:** Problemas complejos que requieren análisis secuencial
- **Cuándo usar:** Bugs difíciles, diseño de arquitectura, debugging

## Antes de Usar MCP

- [ ] Verificar que el servidor está activo
- [ ] Context7: tener library ID correcto
- [ ] Sequential Thinking: definir total_thoughts inicial

## Errores Comunes

### context7
- `libraryId not found`: Usar `resolve-library-id` primero
- `No snippets available`: La librería no tiene ejemplos

### sequential-thinking
- `thoughtNumber > totalThoughts`: Ajustar total_thoughts
- `needsMoreThoughts: true`: Continuar pensando

## Buenas Prácticas

1. **context7**: Llamar `resolve-library-id` antes de `query-docs`
2. **context7**: Máximo 3 llamadas por pregunta
3. **sequential-thinking**: Empezar con estimación conservadora
4. **sequential-thinking**: No dudar en revisar pensamientos anteriores
