# Configuración: Modo Autónomo

## Visión General
Configuración para que opencode pueda ejecutar tareas de forma autónoma con supervisión mínima.

## Configuración Actual

### Modelos Disponibles
- **Fast**: `openrouter/qwen/qwen3-coder:free` — Tareas rápidas
- **Principal**: `opencode/mimo-v2-pro` — Tarea general
- **Fallback**: `opencode/mimo-v2-qr` — Fallback
- **Deep**: `opencode/mimo-v2-qwen` — Análisis profundo

### Agentes Disponibles
- **@developer**: Desarrollo fullstack TypeScript/React
- **@frontend**: React, Tailwind CSS, UX/UI
- **@backend**: Express, APIs REST, serverless
- **@database**: PostgreSQL, Supabase
- **@security**: Auditoría de seguridad
- **@tester**: Testing unitario y E2E
- **@reviewer**: Revisión de código

## Reglas para Modo Autónomo

### 1. SIEMPRE Ejecutar Lint
```bash
npm run lint  # Antes de cualquier commit
```

### 2. SIEMPRE Ejecutar Tests
```bash
npm run test  # Después de cambios significativos
```

### 3. No Deployar Sin Verificar
```bash
npm run build  # Verificar que build pasa
```

### 4. Seguir Convenciones
- Español chileno en UI
- License headers Apache-2.0
- Path alias `@/`
- Snake_case en DB, camelCase en TS

### 5. Seguridad Primero
- No exponer secrets
- Verificar JWT
- Usar RLS policies
- Sanitizar inputs

## Flujo Autónomo Recomendado

1. **Recibir tarea**
2. **Analizar** → @architect o @developer
3. **Implementar** → @developer/@frontend/@backend
4. **Testing** → @tester
5. **Review** → @reviewer
6. **Lint** → `npm run lint`
7. **Tests** → `npm run test`
8. **Documentar** → @documentation
9. **Deploy** → Solo si autorizado
