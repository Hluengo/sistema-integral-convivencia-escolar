# Workflow: Fix Bug Crítico

## Descripción
Workflow para corregir bugs críticos que afectan funcionalidad legal o seguridad.

## Pasos

### 1. Diagnóstico
- [ ] Reproducir el bug
- [ ] Identificar causa raíz
- [ ] Evaluar impacto
- [ ] Determinar urgencia

### 2. Solución
- [ ] Diseñar solución
- [ ] Implementar fix
- [ ] Agregar tests para prevenir regresión
- [ ] Verificar que no rompe funcionalidad existente

### 3. Testing
- [ ] Tests unitarios pasan
- [ ] Tests E2E pasan
- [ ] Verificar en environment de staging
- [ ] Manual testing si es necesario

### 4. Deploy
- [ ] Ejecutar lint
- [ ] Commit con mensaje descriptivo
- [ ] Push a rama principal
- [ ] Deploy a Vercel
- [ ] Verificar en producción

### 5. Post-Fix
- [ ] Monitorear por 24h
- [ ] Documentar el fix
- [ ] Actualizar error conocido si aplica
- [ ] Comunicar a stakeholders si es necesario
