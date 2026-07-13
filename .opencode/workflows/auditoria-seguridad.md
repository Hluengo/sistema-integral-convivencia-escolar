# Workflow: Auditoría de Seguridad

## Descripción
Workflow para realizar una auditoría de seguridad completa del sistema.

## Pasos

### 1. Preparación
- [ ] Revisar changelog reciente
- [ ] Identificar cambios de seguridad
- [ ] Preparar herramientas de escaneo

### 2. Análisis de Código
- [ ] Buscar secrets hardcodeados
- [ ] Verificar manejo de autenticación
- [ ] Verificar sanitización de inputs
- [ ] Verificar manejo de errores

### 3. Análisis de Infraestructura
- [ ] Verificar variables de entorno
- [ ] Verificar headers de seguridad
- [ ] Verificar CSP
- [ ] Verificar CORS

### 4. Análisis de Base de Datos
- [ ] Verificar RLS policies
- [ ] Verificar permisos de tablas
- [ ] Verificar storage buckets
- [ ] Verificar audit logs

### 5. Análisis de API
- [ ] Verificar rate limiting
- [ ] Verificar autenticación en endpoints
- [ ] Verificar validación de datos
- [ ] Verificar logging

### 6. Reporte
- [ ] Clasificar vulnerabilidades por riesgo
- [ ] Documentar hallazgos
- [ ] Proponer remediaciones
- [ ] Priorizar acciones

### 7. Remediación
- [ ] Corregir vulnerabilidades críticas
- [ ] Corregir vulnerabilidades altas
- [ ] Planificar corrección de medianas/bajas
- [ ] Re-verificar después de correcciones
