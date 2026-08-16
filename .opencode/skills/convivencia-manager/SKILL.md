---
name: convivencia-manager
description: Gestiona casos de convivencia escolar, protocolos, mediación y seguimiento. Trigger: convivencia, caso,protocolo, mediación.
---

# Convivencia Manager

Gestiona integralmente los casos de convivencia escolar.

## Flujo de Caso

### 1. Registro
- Clasificar tipo de conducta (leve/grave/gravísima)
- Identificar víctimas y victimarios
- Registrar fecha, hora, lugar, testigos
- Adjuntar evidencia disponible

### 2. Clasificación RICE
- Consultar `src/data.ts` para glosas del reglamento
- Asociar conducta a artículo específico
- Evaluar agravantes/atenuantes
- Determinar tipo de falta

### 3. Medidas Inmediatas
- Separación de puestos
- Cambio de recreos
- Comunicación a apoderados
- Derivación a psicólogo si aplica

### 4. Seguimiento
- Actualizar bitácora periódicamente
- Verificar cumplimiento de medidas
- Evaluar evolución conductual
- Documentar resultados

### 5. Cierre
- Verificar que todas las etapas estén completas
- Generar informe de cierre
- Actualizar estado en Supabase
- Archivar documentación

## Comandos Útiles
- Usar `@convivencia` para gestión de casos
- Usar `@legal` para validación normativa
- Usar `@pie` para casos con NEE
- Usar `@meeting` para actas de reuniones

## Recordatorios
- Plazo investigación: 60 días máximo
- Suspensión: 15 días máximo
- Expulsión: notificar Superintendencia en 5 días
- Siempre priorizar medidas formativas
