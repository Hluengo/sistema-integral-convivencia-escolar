---
name: arquitectura-claude
description: Diseña arquitecturas modernas y escalables tipo Claude. Úsala cuando pidan diseño de sistema, elección de stack o roadmap de implementación.
---

# Skill: Arquitectura tipo Claude

> Toda la comunicación y documentación generada con esta skill debe estar en español.

## Cuándo usarla

- Solicitudes de diseño de sistema o nuevos módulos.
- Elección de patrones (multitenant, colas, caché, realtime).
- Decisiones de stack para apps modernas (React + Vite + Supabase + Express).

## Patrones obligatorios de este repo

1. **Frontend**: React 19 + Vite + Tailwind 4 + shadcn/radix + `zustand` (estado cliente) + `@tanstack/react-query` (estado servidor) + `react-hook-form` + `zod`.
2. **Backend**: Express en `server/` + Supabase (Postgres + Auth + Storage). `SUPABASE_SERVICE_ROLE_KEY` solo en servidor.
3. **Multitenant**: todo dato pertenece a un tenant. Validar membresía en `app_memberships` antes de operar.
4. **Validación**: esquemas `zod` compartidos entre cliente y servidor.

## Plantilla de respuesta (ahorra tokens: úsala tal cual)

1. **Decisión**: una frase con la recomendación.
2. **Alternativas descartadas**: tabla de 2-3 filas con motivo (una línea cada una).
3. **Diagrama mínimo**: lista de 3-7 componentes con responsabilidad de una línea.
4. **Riesgos**: máximo 3, cada uno con mitigación de una línea.
5. **Próximos 3 pasos**: acciones concretas y verificables.

## Reglas de ahorro de tokens

- No repitas contexto que ya está en `.memory/patrones.md`.
- Si el diseño ya existe en memoria, cítalo por nombre en vez de reescribirlo.
- Prefiere listas cortas sobre párrafos largos.
