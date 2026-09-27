# Runbook: mejora de hallazgos de auditoría integral

**Fecha:** 2026-09-26  
**Alcance:** mejoras derivadas de la auditoría estática del repositorio. Este documento no certifica defectos ni reemplaza validaciones de runtime.

## 1. Objetivo

Convertir las señales de Gortex en acciones verificables, evitando corregir falsos positivos o tratar métricas incompletas como fallos confirmados. Ejecutar los pasos en orden y registrar evidencia en el PR o ticket de cada cambio.

## 2. Prioridad

| Orden | Trabajo                                   | Prioridad inicial             | Criterio para avanzar                                                            |
| ----- | ----------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| 1     | Revisar enlace `target="_blank"`          | Media, pendiente de confirmar | Confirmar el elemento, destino y comportamiento real.                            |
| 2     | Habilitar una medición de cobertura útil  | Calidad, brecha de evidencia  | Obtener un reporte vigente o documentar por qué el proveedor no puede generarlo. |
| 3     | Revisar logs de consola                   | Baja                          | Clasificar cada registro por entorno y sensibilidad.                             |
| 4     | Validar señales SAST de CORS y navegación | Informativa                   | Verificar configuración efectiva en los dos entrypoints y rutas reales.          |
| 5     | Revisar superficie de errores             | Informativa                   | Muestrear límites de confianza y confirmar respuestas HTTP seguras.              |

No iniciar refactors masivos por conteos de `throw`, logs o puntajes por símbolo.

## 3. Preparación

1. Confirmar rama y árbol de trabajo limpios; preservar los cambios locales preexistentes.
2. Revisar `CONTEXT.md`, los ADR relevantes y el flujo de CI vigente antes de elegir comandos.
3. Tomar el SHA y fecha de la revisión. Guardar salida de las herramientas en el ticket, sin incluir secretos ni datos personales.
4. Distinguir código fuente de artefactos generados. `api/index.js` es generado y sus hallazgos duplicados deben rastrearse a la fuente TypeScript; no corregirlo a mano.
5. Ejecutar validaciones solo en el alcance acordado y registrar comandos, resultado y limitaciones.

## 4. Pasos

### Paso A — enlace externo en nueva pestaña

**Ubicación inicial:** `src/features/platform/PlatformInstitutionDocuments.tsx`, alrededor de la línea 186 (`PlatformInstitutionDocuments`).

1. Inspeccionar el enlace y su URL de origen; comprobar si está controlada por el servidor o por usuarios.
2. Confirmar si realmente abre una nueva pestaña y si incluye una protección equivalente a `rel="noopener noreferrer"`.
3. Si falta protección, aplicar el atributo apropiado al enlace. Mantener intacta la autorización de acceso a los documentos; `rel` no sustituye controles de permisos.
4. Verificar que el usuario autorizado abra el documento esperado y que el destino externo no pueda controlar una redirección insegura.

**Cierre:** código revisado; protección presente o evidencia de mecanismo equivalente; prueba del enlace y revisión visual/manual registradas.

### Paso B — cobertura de pruebas

**Señal inicial:** Gortex devolvió `coverage_gaps: null`; no equivale a 0% ni acredita cobertura suficiente.

1. Identificar el comando de pruebas y reporte de cobertura configurados actualmente en `package.json`/CI.
2. Ejecutar el flujo de cobertura disponible y conservar el resumen por archivo/módulo. No publicar información sensible del entorno.
3. Si CI no produce cobertura, registrar el comando faltante o la causa operacional y acordar un mecanismo mínimo compatible con la configuración actual.
4. Priorizar flujos de autenticación/autorización, aislamiento de tenant, persistencia y manejo de errores; no perseguir porcentajes globales sin relación con el riesgo.
5. Añadir o ajustar pruebas solo para brechas verificadas, usando los patrones y dependencias ya instalados.

**Cierre:** reporte reproducible asociado a un SHA, módulos críticos identificados y brechas prioritarias cubiertas o aceptadas explícitamente con su motivo.

### Paso C — logs de consola

**Señal inicial:** 16 usos informativos, incluidos scripts de operación y funciones `logDev`/`logServer`.

1. Revisar los usos reportados en `server/index.ts`, `server/middleware/requireMembership.ts`, `src/shared/api/hooks/useMemberships.ts`, `src/shared/api/services/membership.service.ts` y `src/shared/lib/stores/authStore.ts`.
2. Clasificar cada uno como registro operacional esperado, diagnóstico condicionado a desarrollo, o registro sobrante.
3. Revisar contenido: no registrar tokens, claves, JWT, correos, identificadores personales, texto de expedientes ni payloads sensibles.
4. Mantener los logs necesarios para operaciones; retirar o condicionar solo los que no aporten valor. Evitar reemplazos globales mecánicos.

**Cierre:** cada uso clasificado; los registros de producción no exponen datos sensibles; los registros necesarios siguen siendo útiles para diagnóstico.

### Paso D — CORS y redirección fija

**Señales SAST iniciales:** CORS en `server/api/index.ts` y `server/index.ts`, duplicado en el generado `api/index.js`; asignación fija `window.location.href = "/"` en `src/shared/ui/MembershipAccessDenied.tsx`.

1. Confirmar que `ALLOWED_ORIGINS` se parsea como allowlist exacta y que un origen ausente o inválido no se refleja en `Access-Control-Allow-Origin`.
2. Validar por separado ambos entrypoints que se despliegan. Confirmar que `credentials` solo se habilite cuando se responde a un origen permitido; nunca combinar credenciales con `*`.
3. Tratar `api/index.js` como evidencia del bundle únicamente; corregir la fuente y regenerar según el flujo normal si fuera necesario.
4. Confirmar que la asignación de `MembershipAccessDenied` es constante (`/`) y no deriva de input de usuario. La detección estática no prueba una redirección abierta.
5. No editar por la alerta sola: registrar falsos positivos confirmados y conservar la configuración efectiva como evidencia.

**Cierre:** pruebas o inspección reproducible de origen permitido, origen rechazado y credenciales; redirección fija confirmada o corregida si se descubre una entrada variable.

### Paso E — superficie de excepciones

**Señal inicial:** Gortex detectó 94 funciones con `throw`; el conteo no es un defecto por sí mismo.

1. Revisar primero límites de confianza y rutas con privilegios: autenticación, membresías, administración de tenant, uploads y operaciones con service role.
2. Para cada ruta seleccionada, seguir el error desde el servicio hasta el handler HTTP y confirmar que no se filtren secretos, SQL, tokens ni datos de otro tenant.
3. Confirmar que errores esperados de validación usan estados 4xx y errores internos estados 5xx, según los contratos existentes.
4. Priorizar excepciones sin manejo, promesas rechazadas sin respuesta, respuestas parciales en operaciones multi-paso y rollback ausente donde podría perderse o duplicarse información.
5. No cambiar errores intencionales de validación ni añadir wrappers genéricos sin evidencia de un contrato roto.

**Cierre:** rutas críticas seleccionadas y trazadas; respuestas y datos expuestos verificados; defectos reproducidos tienen corrección y prueba asociada.

## 5. Verificación global

Al completar cambios de código, seguir los comandos existentes del proyecto para lint, pruebas focalizadas, cobertura y build, según el alcance del PR. Si no se ejecuta una validación, anotar el motivo y no presentarla como aprobada. Para cambios de configuración desplegada, verificar el valor efectivo en el entorno correspondiente sin imprimir secretos.

Registrar en el PR:

- SHA revisado y archivos afectados.
- Hallazgo original y clasificación: confirmado, falso positivo o no concluyente.
- Evidencia antes/después y comandos ejecutados.
- Resultado de pruebas y limitaciones conocidas.

## 6. Criterios de cierre del runbook

- El enlace de nueva pestaña está verificado y protegido si corresponde.
- La cobertura tiene una fuente medible y se conocen las brechas prioritarias, o la limitación quedó documentada.
- Los logs reportados fueron clasificados y revisados por privacidad.
- Las señales CORS/redirección fueron comprobadas contra configuración y flujo reales, sin cambios innecesarios.
- Los errores en rutas críticas se revisaron por exposición de información, tenant y consistencia.
- Toda corrección tiene evidencia reproducible; todo hallazgo no confirmado queda marcado como tal.
