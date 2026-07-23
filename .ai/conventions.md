# Coding Conventions

## TypeScript
- Strict mode (noEmit, isolatedModules)
- No `any` — usar `unknown` + type narrowing
- `import type` para type-only imports
- Path alias `@/` → project root
- Interfaces sobre types para objetos públicos

## React
- Componentes funcionales con props tipadas
- No class components
- Hooks: un hook por archivo, un propósito
- Store actions síncronas (side effects en hooks)
- Lazy loading con React.lazy + Suspense

## Service Layer
- Métodos async que retornan tipos
- Mappers para DB→TS (snake→camel)
- Zod schemas para validación runtime
- Errores lanzados con throw (capturados por React Query y ErrorBoundary)

## Estilos
- Tailwind v4 utility classes
- @theme en index.css para brand colors
- Responsive mobile-first
- Componentes de UI en shared/ui/

## Naming
- Componentes: PascalCase.tsx
- Hooks: camelCase con prefix use
- Servicios: kebab-case.service.ts
- Stores: camelCase con suffix Store
- Tests: *.test.ts (co-located)
- Tablas SQL: plural snake_case
- Columnas SQL: snake_case
- Variables TS: camelCase

## Commits
- Formato: `tipo: descripción en español`
- Tipos: feat, fix, refactor, docs, test, chore, security
- Body opcional explicando el por qué
