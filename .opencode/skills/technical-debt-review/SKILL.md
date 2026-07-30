---
name: technical-debt-review
description: Revision de deuda tecnica antes y despues de funcionalidades grandes
agent: refactor
---

# Technical Debt Review Skill

## Areas de revision

1. Componentes demasiado grandes (>200 lineas)
2. Logica duplicada entre componentes/servicios
3. Consultas Supabase desde UI (deben estar en servicios)
4. Fechas UTC mal tratadas (sin timezone)
5. Falta de tipos TypeScript (any, inferencia insuficiente)
6. Estado React innecesario (que podria ser derivado)
7. Errores de accesibilidad (aria, roles, teclado)
8. Problemas de rendimiento (re-renders, bundles)
9. Dependencias obsoletas o no utilizadas
10. Secretos o datos personales en codigo

## Prioridades

- **Critico**: secretos, datos personales, RLS faltante, fechas rotas
- **Importante**: componentes grandes, logica duplicada, falta de tipos
- **Mejora futura**: rendimiento menor, refactors cosmeticos

## Regla

Solo implementar correcciones directamente relacionadas al trabajo solicitado.
