# Runbook: ruta del expediente desde Resolución

## Objetivo

Reducir registros repetidos desde Resolución hasta Seguimiento sin perder
trazabilidad, derecho a defensa ni documentos históricos.

## Modelo operativo

La ruta muestra solo actuaciones verificables. Los estados transitorios se
mantienen en `estadoActual` y no exigen un hito separado.

| Fase | Hitos visibles | Estados absorbidos |
|---|---|---|
| Resolución | Informe emitido; audiencia/descargos realizados; resolución notificada | Elaboración del informe; citación pendiente; elaboración de resolución |
| Apelación | Derecho y plazo informados; recurso recibido; recurso resuelto; resolución ejecutoriada | Revisión interna por Rectoría |
| Seguimiento | Medida/plan iniciado; seguimiento finalizado; cierre del expediente | Seguimiento en curso |

## Reglas de uso

1. Registrar un hito solo cuando ocurrió una actuación o existe respaldo.
2. Usar observaciones y documento en el hito visible para explicar citaciones,
   revisiones internas y fechas.
3. Registrar recurso recibido y recurso resuelto solo si hubo apelación.
4. El plazo de apelación se controla por fechas del expediente; el hito visible
   acredita la información entregada al apoderado.
5. El cierre anticipado debe completar el hito de cierre y generar una entrada
   de bitácora con fundamento.
6. Una rectificación conserva la entrada histórica y debe reconstruir el estado
   vigente del hito después de recargar.

## Compatibilidad y rollback

Los IDs históricos no se eliminan ni se migran. Los hitos absorbidos quedan
persistidos para reconstruir expedientes antiguos, pero dejan de aparecer en la
ruta operativa. Para revertir la presentación, restaurar el filtro de fases a
todos los IDs por prefijo; no borrar datos de `checklist_items` ni de
`bitacora_entries`.

## Validación

- La ruta de Resolución muestra 3 hitos.
- Apelación muestra 4 hitos.
- Seguimiento muestra 3 hitos.
- La fase Investigación conserva su flujo condicional de Mediación.
- Una rectificación sobrevive a la recarga.
- Un cierre anticipado marca `chk_seg_4` como completado.
- Ejecutar `npm run typecheck`, `npm test` y `git diff --check`.
