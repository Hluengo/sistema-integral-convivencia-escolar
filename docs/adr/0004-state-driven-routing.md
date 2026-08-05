# ADR-0004: State-driven Routing (No React Router)

> Enmendada por ADR-0008: el proyecto mantiene `uiStore.currentView` como bridge, pero la URL ahora se sincroniza mediante `History API`.

## Context

El proyecto necesitaba navegación entre vistas (dashboard, causas, anotaciones, etc.).

## Decisión

NO usar React Router. La navegación se maneja con `uiStore.currentView`.

## Alternativas Consideradas

- **React Router v7**: Solución estándar, pero agrega complejidad (nested routes, loaders, actions)
- **TanStack Router**: Type-safe, pero sobreingeniería para SPA sin SSR
- **No router**: Simplicidad máxima, suficiente para SPA con 6 vistas

## Consecuencias

- **Positivas**: Sin dependencia externa, sin boilerplate de routing
- **Positivas**: Estado de navegación en Zustand (consistente con el resto del estado)
- **Negativas**: No deep linking (compartir URL a una vista específica)
- **Negativas**: No browser back/forward
- **Negativas**: Estado de vista se pierde al recargar página
- **Actualización 2026-08-04**: ver ADR-0008. El deep linking básico se resolvió con un bridge `History API`; una migración a router declarativo queda condicionada al gate de seguridad.
