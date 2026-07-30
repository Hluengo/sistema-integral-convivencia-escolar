---
name: feature-spec
description: Convierte solicitudes funcionales en especificaciones implementables
agent: architect
---

# Feature Spec Skill

## Estructura de la especificacion

1. **Problema**: que necesidad resuelve
2. **Objetivo**: que debe lograr
3. **Comportamiento esperado**: pasos de usuario, estados, errores
4. **Casos limite**: bordes, carga, sin datos, permisos
5. **Criterios de aceptacion**: checklist verificable
6. **Datos afectados**: tablas, columnas, RLS, Storage
7. **Permisos**: roles requeridos, restricciones
8. **Impacto Supabase**: consultas, migraciones, RLS
9. **Pruebas necesarias**: unitarias, integracion, E2E
10. **Plan de reversion**: como deshacer el cambio

## Reglas

- Detectar contradicciones antes de implementar
- Si el requerimiento es claro, no pedir confirmaciones menores
- Identificar decisiones que afecten datos reales
