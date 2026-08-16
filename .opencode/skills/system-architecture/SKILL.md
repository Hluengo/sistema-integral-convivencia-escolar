---
name: system-architecture
description: Analisis completo de arquitectura antes de cambios estructurales
agent: architect
---

# System Architecture Skill

## Alcance del analisis

Antes de cambios estructurales, identificar:

1. **Rutas y vistas**: paginas principales, modales, layouts
2. **Componentes React**: jerarquia, props, estado
3. **Estado global**: Zustand stores, React Query, contexto
4. **Servicios y APIs**: Express routes, Vercel serverless, servicios Supabase
5. **Supabase**: tablas, RLS, Auth, Storage, tenant_id
6. **Flujos de datos**: Causas, Anotaciones, Documentos, Bitacora
7. **Dependencias**: package.json, configuraciones
8. **Puntos de riesgo**: fechas, RLS, privacidad, migraciones

## Output

- Mapa de arquitectura actual
- Riesgos identificados
- Plan tecnico con etapas
- Pruebas necesarias
- Estrategia de publicacion y reversion

## Regla

No modifica codigo. Solo produce diagnostico, riesgos y plan tecnico.
