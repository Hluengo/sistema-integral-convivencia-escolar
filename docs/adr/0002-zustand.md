# ADR-0002: Zustand for Global State

## Context
Necesitábamos estado global compartido entre componentes de diferentes vistas (auth, causas, UI).

## Decisión
Usar Zustand v5.

## Alternativas Consideradas
- **Redux Toolkit**: Mucho boilerplate (actions, reducers, slices, store config)
- **Jotai**: Bueno para estado atómico, no ideal para estado global compartido
- **Valtio**: Proxy-based, menos predecible que Zustand
- **React Context**: Prop drilling > 2 niveles, re-renders innecesarios

## Consecuencias
- **Positivas**: Cero boilerplate, TypeScript nativo, ~1KB bundle
- **Positivas**: 4 stores separados por dominio (SRP)
- **Positivas**: Fácil de testear (funciones puras)
- **Negativas**: Sin devtools nativos (pero hay middleware)
- **Negativas**: Persistencia manual (no como Redux Persist)
