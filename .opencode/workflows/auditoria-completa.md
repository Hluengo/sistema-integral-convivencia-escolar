---
name: auditoria-completa
description: Auditoría completa del sistema: código, seguridad, base de datos, legal
---

# Workflow: Auditoría Completa

Realiza una auditoría integral del sistema cubriendo todas las áreas críticas.

## Fases

### 1. Auditoría de Código
- Revisión de TypeScript (tipos, patrones)
- Análisis de dependencias (actualizaciones, vulnerabilidades)
- Verificación de tests (cobertura, edge cases)
- Code review de componentes críticos

### 2. Auditoría de Seguridad
- Verificación de RLS en todas las tablas
- Revisión de autenticación (JWT, sesiones)
- Validación de permisos (anon key vs service role)
- Detección de vulnerabilidades OWASP Top 10
- Revisión de headers de seguridad (CSP, CORS)

### 3. Auditoría de Base de Datos
- Verificación de índices (queries lentas)
- Revisión de foreign keys (integridad referencial)
- Análisis de políticas RLS
- Verificación de functions y triggers
- Optimización de consultas

### 4. Auditoría Legal
- Validación de debido proceso (Circular 482)
- Verificación de plazos (Ley 21809)
- Revisión de confidencialidad
- Validación de notificaciones
- Verificación de proporcionalidad de medidas

### 5. Auditoría de Performance
- Análisis de bundle size
- Verificación de lazy loading
- Revisión de queries N+1
- Análisis de métricas Lighthouse

## Salida
- Informe de hallazgos
- Priorización de issues (crítico/alto/medio/bajo)
- Recomendaciones de mejora
- Plan de acción

## Agentes Involucrados
- `@reviewer` — Code review
- `@security` — Seguridad
- `@database` — Base de datos
- `@legal` — Legal
- `@analytics` — Performance
