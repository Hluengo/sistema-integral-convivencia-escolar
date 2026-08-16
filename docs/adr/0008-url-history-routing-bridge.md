# ADR-0008: URL Routing Bridge con History API

## Estado

Aceptada — 2026-08-04

## Contexto

ADR-0004 mantuvo la navegación como state-driven para evitar complejidad prematura. La Fase 3 del plan frontend exige deep links, refresh estable y soporte para botones atrás/adelante del navegador.

Se evaluó `react-router-dom`, pero las versiones probadas introdujeron `react-router` con advisories altos reportados por `npm run security-audit`. El gate de seguridad del proyecto no permite incorporar una dependencia productiva vulnerable.

## Decisión

Implementar un bridge propio basado en `window.history`:

- `src/app/routing.ts` define el mapa canónico de rutas y parsea intents.
- `src/app/hooks/useUrlRouting.ts` sincroniza `window.location`, `uiStore.currentView`, `causasStore.selectedCausaId` y el modal `/login`.
- `handleViewChange()`, selección desde dashboard/notificaciones y cierre de detalle delegan en navegación URL.
- `MainContent` conserva el renderizado condicional actual mientras no exista una dependencia de routing que pase `npm run security-audit`.

## Alternativas Consideradas

- **React Router**: estándar para rutas declarativas, pero bloqueado por advisory alto en la versión disponible.
- **TanStack Router**: mayor tipado, pero implica cambio más grande y debe pasar la misma revisión de seguridad/bundle antes de adoptarse.
- **Mantener solo `currentView`**: menor cambio, pero no resuelve deep linking ni navegación del navegador.

## Consecuencias

- Positiva: hay URLs canónicas para vistas, `/login` y `/expedientes/:causaId`.
- Positiva: no se agrega dependencia productiva vulnerable.
- Positiva: el cambio respeta la arquitectura existente y mantiene `uiStore` como bridge para componentes actuales.
- Negativa: no hay loaders/actions ni rutas declarativas por componente.
- Negativa: la prueba E2E autenticada para `/expedientes/:causaId` sigue pendiente hasta usar datos/sesión reales.
