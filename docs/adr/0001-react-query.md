# ADR-0001: React Query for Server State

## Context
Necesitábamos una solución para fetching, caching y sincronización de datos del servidor (cursos, estudiantes) con el frontend React.

## Decisión
Usar TanStack React Query v5.

## Alternativas Consideradas
- **SWR**: Similar a React Query pero con menos features (devtools, mutations, query keys avanzadas)
- **RTK Query**: Requería adoptar Redux Toolkit completo (overhead)
- **Apollo Client**: Overkill para REST/Supabase (diseñado para GraphQL)
- **fetch + useEffect**: Waterfall de requests, race conditions, sin cache

## Consecuencias
- **Positivas**: Caché configurable (staleTime), retry automático, devtools, sin boilerplate
- **Positivas**: Queries dependientes (students solo cuando hay courseId)
- **Negativas**: Una dependencia adicional en package.json
- **Negativas**: No usamos useMutation (las mutaciones van directo a servicios)
