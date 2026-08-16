# Comando: security-scan

## Descripción
Escanea el código en busca de vulnerabilidades de seguridad.

## Uso
Antes de commits importantes o cambios de seguridad.

## Flujo
1. Buscar secrets hardcodeados
2. Verificar manejo de JWT
3. Verificar sanitización de inputs
4. Verificar RLS policies
5. Verificar permisos de storage
6. Verificar headers de seguridad
7. Generar reporte

## Salida
- Vulnerabilidades encontradas
- Nivel de riesgo (CRITICAL/HIGH/MEDIUM/LOW)
- Recomendaciones de remediación
