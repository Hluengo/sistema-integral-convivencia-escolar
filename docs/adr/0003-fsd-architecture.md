# ADR-0003: Feature-Sliced Design (FSD)

## Context
El proyecto necesitaba una estructura escalable que creciera con los features sin volverse un monolito.

## Decisión
Adoptar Feature-Sliced Design (FSD) con capas: app → features → widgets → shared.

## Alternativas Consideradas
- **Estructura plana** (`src/components/`, `src/pages/`, `src/hooks/`): Se vuelve inmanejable con +50 componentes
- **Atomic Design** (atoms, molecules, organisms): Buena para sistemas de diseño, no para features de negocio
- **Domain folders**: Mezcla features con shared, difícil de reusar

## Consecuencias
- **Positivas**: Features auto-contenidos con sus propios componentes, hooks y servicios
- **Positivas**: Shared claramente identificable (reusable entre features)
- **Positivas**: Legacy `components/` con barrels para backward compat
- **Negativas**: Duplicación temporal durante la migración (components/ + features/)
- **Negativas**: Curva de aprendizaje del FSD para nuevos desarrolladores
