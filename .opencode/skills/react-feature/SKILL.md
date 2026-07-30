---
name: react-feature
description: Implementacion de interfaces React + TypeScript con accesibilidad, diseno responsivo y componentes reutilizables
agent: frontend
---

# React Feature Skill

## Reglas

- Componentes pequeños y enfocados en una responsabilidad
- Props tipadas estrictamente con TypeScript
- Hooks personalizados para lógica reutilizable
- Accesibilidad WCAG AA (roles, aria, teclado)
- Diseno mobile-first con Tailwind CSS v4
- Sin consultas directas a Supabase desde componentes visuales
- Sin reglas de dominio dentro de JSX
- Separar presentacion, logica de aplicacion y servicios

## Flujo

1. Leer especificacion del componente
2. Identificar estado local vs global
3. Crear tipos primero
4. Implementar logica (hooks)
5. Implementar presentacion (JSX)
6. Escribir pruebas
7. Verificar lint y typecheck

## Verificacion

- `npm run typecheck`
- `npm run lint:code`
- `npm run test`
- `npm run build:web`
