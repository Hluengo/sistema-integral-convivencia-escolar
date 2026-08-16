# Comando: audit-debido-proceso

## Descripción
Audita un caso de debito proceso contra los requisitos legales (Circular 482, Ley 21809).

## Uso
Cuando el usuario pida auditar un caso o verificar cumplimiento legal.

## Flujo
1. Leer código de causa desde la causa o del contexto
2. Ejecutar `src/lib/legalCompliance.ts` para verificar plazos
3. Verificar cada paso del checklist legal
4. Generar informe de cumplimiento
5. Identificar riesgos jurídicos

## Salida
- Informe de auditoría con cumplimiento por etapa
- Riesgos jurídicos identificados
- Recomendaciones de acción
