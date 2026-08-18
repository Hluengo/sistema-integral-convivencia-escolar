# Runbook: orden y compactación de la Notificación de Inicio de Indagación

**Estado:** Implementado  
**Fecha:** 2026-08-18  
**Alcance:** plantilla, contenido automático y validación del documento Carta.

## Objetivo

Mantener una notificación coherente, profesional y compacta, sin repetir el relato de hechos en la calificación ni duplicar las garantías del debido proceso.

## Orden oficial

1. **Fundamento del procedimiento:** base normativa y motivo de apertura.
2. **Hechos que motivan la indagación:** relato concreto del expediente.
3. **Calificación preliminar de la falta:** gravedad y conducta exacta seleccionada del RICE.
4. **Evidencias y testimonios:** antecedentes ya registrados o que serán incorporados.
5. **Circunstancias atenuantes y agravantes:** factores que se revisarán durante la indagación.
6. **Medidas en evaluación:** medidas sujetas a análisis, sin anticipar una sanción.
7. **Garantías del debido proceso:** derechos del estudiante y aclaración de que no existe sanción anticipada.
8. **Confidencialidad:** resguardo de la notificación y sus antecedentes.

## Reglas de contenido

- La sección de hechos contiene únicamente el relato; no califica jurídicamente la conducta.
- La sección de calificación usa `conductaRiceId` para mostrar la descripción oficial del RICE.
- La calificación no repite el relato ni la advertencia completa de debido proceso.
- La sección de evidencias no inventa antecedentes: usa solo registros existentes o una fórmula breve de incorporación futura.
- Las garantías se mantienen completas y en una única sección.
- Los datos del expediente siguen visibles en la grilla superior; las secciones desarrollan el contenido sin duplicarlo innecesariamente.

## Validación antes de publicar

Ejecutar desde la raíz del repositorio:

```powershell
npm run lint
npm run test -- src/features/causas/notificacionDocgen/notificacionDocgen.test.ts
npm run build:web
git diff --check
```

Validar manualmente en vista previa e impresión:

1. La numeración sigue el orden oficial.
2. La conducta RICE aparece en la sección 3.
3. El relato aparece solo en la sección 2.
4. Las garantías aparecen completas en la sección 7.
5. Firmas y confidencialidad no quedan cortadas en Carta.

## Criterio de aceptación

El runbook se considera cumplido cuando las pruebas pasan, Vite compila, el documento mantiene una sola narrativa de hechos, la calificación contiene la conducta RICE exacta y la vista previa no presenta desbordamiento ni secciones duplicadas.

## Reversión

Si la compactación visual no es aprobada, revertir únicamente los cambios de la plantilla y del generador de notificación asociados a este runbook. No revertir los cambios de persistencia de `conductaRiceId`, porque son necesarios para conservar la selección RICE del expediente.
