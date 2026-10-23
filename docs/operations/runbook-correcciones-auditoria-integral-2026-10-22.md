# Runbook: correcciones de auditoría integral — 2026-10-22

**Estado:** EN EJECUCIÓN — **NOT READY**. A01/A04/A08/A12 probados solo en DB aislada; aplicación remota y coordinación pendientes. A07 diferido por el usuario; A09/A10/A13 incompletos. Evidencia vigente en §9.5–§9.8.  
**Línea base auditada:** `aeb0156e7ea94c2fe5c652d9879feb085b5db310` en `master`.  
**Alcance:** autorización, privacidad, continuidad del trabajo, incidentes, notificaciones, cartas y controles de publicación.  
**Entornos:** desarrollo/local → staging con datos ficticios → producción, con autorización explícita.

## 1. Objetivo y límites

Corregir los 13 hallazgos mediante cambios pequeños, pruebas reproducibles y despliegues verificables. Este documento planifica trabajo; no autoriza escrituras remotas, creación de usuarios reales, envíos de correo, commit, push ni deploy.

- No cambiar sanciones, textos institucionales ni etapas del debido proceso por razones cosméticas.
- No crear, anular ni recalcular cartas históricas automáticamente. Un conteo distinto al actual puede ser una fotografía válida de su emisión.
- Mantener los rangos operativos acordados: **5–9 negativas → Amonestación; 10–14 → Compromiso; 15 o más → Derivación**. La clasificación automática no acredita entrevistas, entrega de documentos ni actuaciones no realizadas.
- Reutilizar React Query, Zustand, React Hook Form, Zod y los servicios existentes. No añadir una capa general de persistencia ni una dependencia si no es necesaria.
- Preservar el runbook de septiembre como antecedente: [auditoría 2026-09-26](runbook-mejora-auditoria-integral-2026-09-26.md). No interpretar planes históricos como estado actual.

## 2. Evidencia de partida

Resultados de la auditoría del 22-10-2026; **revalidarlos sobre el SHA que se implemente**:

| Control                    | Evidencia obtenida                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint y tipos               | `npm run lint` aprobado                                                                                                                            |
| Pruebas                    | 1.011 aprobadas, 214 suites                                                                                                                        |
| Cobertura reportada        | 90,97 % líneas; no acredita cobertura de todos los formularios                                                                                     |
| Compilación                | Frontend y ambos entrypoints del servidor aprobados                                                                                                |
| Tamaño JS                  | 2.191.386 bytes totales, dentro del presupuesto vigente                                                                                            |
| Knip                       | Sin archivos/dependencias sin uso en el alcance del comando de CI                                                                                  |
| Dependencias               | Vite 8.2.2 señalado con severidad alta por `npm audit`                                                                                             |
| CI                         | [Vercel Gate del SHA auditado](https://github.com/Hluengo/sistema-integral-convivencia-escolar/actions/runs/39805070300) falló en `Security audit` |
| Interfaz pública           | Sin errores JS, desbordes ni infracciones automáticas de Axe a 1440, 768 y 375 px                                                                  |
| API sin sesión             | Tres rutas sensibles verificadas respondieron 401                                                                                                  |
| Datos del colegio revisado | 809 estudiantes; 2.191 negativas de 2026 en 304 estudiantes; 339 cartas anuales                                                                    |
| Progresión por conteo      | 6 estudiantes sin carta registrada y 3 con una etapa inferior a la requerida                                                                       |
| Aislamiento observado      | Sin cruces de tenant en las relaciones inspeccionadas; 48 tablas públicas con RLS habilitada                                                       |

El problema del rol `NULL` se verificó por inspección de funciones/políticas y evaluación de la condición SQL, **sin explotar cuentas reales**. No se encontraron perfiles inactivos ni sin rol en esa revisión. Los fallos de renovación de sesión, etiquetas de cartas, redacción de nombres y truncamiento HTML se reprodujeron con datos sintéticos.

## 3. Preparación y condiciones de parada

### 3.1 Línea base

```powershell
git status --short --branch
git rev-parse HEAD
git log -5 --oneline
```

1. Registrar SHA, rama, fecha, responsable y diferencias respecto de esta línea base.
2. Preservar cambios preexistentes. En la auditoría solo `opencode.json` estaba modificado; no incluirlo por arrastre.
3. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, los ADR pertinentes y los contratos de los consumidores de cada cambio.
4. Identificar todas las llamadas, pruebas y fixtures afectadas antes de editar. Resolver la causa en el punto compartido, no parchear cada pantalla.
5. Conservar evidencias sin nombres, RUN, relatos reales, tokens ni secretos. Usar estudiantes y destinatarios ficticios.

### 3.2 Base compartida y respaldo

- Consultar [ledger de objetos compartidos](../shared-supabase/04-canonical-object-ledger.md). Sus inventarios históricos deben contrastarse con el esquema vigente.
- `profiles`, membresías y funciones de resolución de identidad afectan a ambas aplicaciones. **A01 y cualquier cambio sobre estos objetos requieren acuerdo con Inasistencias.** No modificar sus tablas o RPC propias para silenciar avisos.
- Antes de migrar: guardar las definiciones actuales de funciones, políticas, triggers y grants afectados; confirmar respaldo recuperable y procedimiento de recuperación.
- Crear migraciones incrementales nuevas. Nunca editar ni volver a aplicar migraciones antiguas como reparación.
- Revisar el destino y las migraciones pendientes antes de cualquier aplicación. No usar `--include-all` para publicar cambios no revisados.
- Las pruebas RLS deben usar identidades autenticadas de prueba: el éxito con service role **no** prueba autorización correcta.

### 3.3 Parar cuando

- Falta staging/local, respaldo, autorización o coordinación de un objeto compartido.
- No se puede demostrar que una petición no autorizada se rechaza sin efectos laterales.
- Aparecen escrituras parciales, pérdida de borradores, correos reales inesperados o datos de otro tenant.
- Falla un control de seguridad o CI. No usar `--no-verify`, desactivar hooks, bajar umbrales ni modificar tests para ocultarlo.

Registrar el bloqueo y continuar solo con trabajos independientes que no requieran saltarse ese control.

## 4. Orden y trazabilidad

Cada ID corresponde al mismo número del informe de auditoría. Asignar responsable e issue/PR antes de ejecutar; este runbook no crea tickets ni los da por resueltos.

| ID  | Prioridad   | Corrección                                        | Dependencia principal                       | Estado                                    |
| --- | ----------- | ------------------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| A01 | Crítica     | Rechazar escalada de privilegios con rol nulo     | Coordinación DB compartida                  | Validado local; coordinación pendiente    |
| A02 | Alta        | Aislar borradores por identidad y colegio         | Inventario de borradores y cierre de sesión | Validado local                            |
| A03 | Alta        | Conservar contexto al renovar sesión              | Pruebas del ciclo auth/membresía            | Validado local                            |
| A04 | Alta        | Alinear permisos de superadmin y roles operativos | A01; matriz de permisos aprobada            | Validado local; staging pendiente         |
| A05 | Alta        | Conservar borrador hasta confirmación durable     | A02; contrato del autoguardado              | Validado local                            |
| A06 | Alta        | Evitar truncamiento de HTML en correos            | Pruebas con proveedor simulado              | Validado local; entrega pendiente         |
| A07 | Alta        | Reforzar desidentificación antes de IA            | Inventario de payloads y proveedor simulado | Parcial; diferido por usuario             |
| A08 | Alta        | Crear incidente y expedientes atómicamente        | A04; migración y fixtures                   | Validado local; staging pendiente         |
| A09 | Alta        | Corregir Vite y recuperar gate de publicación     | Versión corregida verificada                | Parcial                                   |
| A10 | Media       | Completar restauración de formularios             | A02, A03 y A05                              | Parcial                                   |
| A11 | Media       | Resolver estado de carta de la etapa requerida    | Reglas de progresión vigentes               | Validado local                            |
| A12 | Media       | Conservar fecha/hora del incidente                | Integrar con A08                            | Validado local con RPC; staging pendiente |
| A13 | Transversal | Cubrir regresiones y validar publicación          | Pruebas desde el primer cambio              | Parcial                                   |

**Secuencia:** preparar entorno y pruebas → cerrar A01/A02 → resolver A03/A04/A05 → corregir A06/A07/A08/A12 → completar A10/A11 → cerrar controles A09/A13. La actualización de dependencias puede prepararse antes para disponer de CI verde; no posterga A01. Ejecutar las pruebas de cada ID junto con su corrección, no al final de todo.

## 5. Correcciones

### A01 — Protector de perfiles: rechazo por defecto

**Ubicación:** función `protect_profile_privileges()`; referencia de origen: `supabase/migrations/20261017183735_close_audit_authorization_gaps.sql`. Revisar las políticas de `profiles` y el trigger `sync_convivencia_membership_from_profile()` en el esquema vigente.

1. Reproducir localmente el caso de usuario autenticado cuyo rol efectivo es `NULL`: `NOT IN` no produce un rechazo verdadero.
2. Impedir que un usuario sin potestad cambie `role`, `tenant_id` o `is_active`, incluyendo alta de perfil propio y reactivación. No basta con proteger solo el valor `superadmin`.
3. Preservar la edición de campos no privilegiados permitidos y las altas legítimas. Distinguir operaciones administrativas internas autorizadas; no tratar toda identidad ausente como permiso administrativo.
4. Revisar que la sincronización de membresías no reactive accesos revocados ni haga escalar una actualización no autorizada.
5. Implementar una migración nueva y actualizar el ledger compartido al aplicar el cambio acordado.

**Aceptación:** usuario sin perfil, perfil inactivo, membresía revocada, docente y usuario de otro colegio no pueden autoasignarse privilegios; ninguna denegación cambia perfil o membresía. Administración legítima y procesos internos autorizados siguen funcionando. La prueba debe cubrir ambos consumidores compartidos.

### A02 — Borradores privados y validados

**Archivos:** `src/shared/lib/sessionDraft.ts`, `src/shared/lib/hooks/useNewCausaForm.ts`, `src/features/causas/ui/NewIncidenteModal.tsx`, `src/features/causas/EditCausaModal/EditCausaModalForm.tsx`, `src/features/causas/ForceCloseCausaDialog.tsx`, `src/app/hooks/useAppNavigation.ts` y `src/shared/lib/stores/authStore.ts`.

1. Usar claves versionadas con usuario, tenant, tipo de formulario e identificador del registro cuando corresponda. No leer/escribir borradores sin identidad verificada.
2. Limpiar el estado en memoria y el almacenamiento del usuario al salir o cambiar de identidad. No borrar claves ajenas, credenciales de Supabase ni todo `sessionStorage` indiscriminadamente.
3. No reasignar automáticamente borradores legacy sin identidad al siguiente usuario. Avisar del cambio y permitir resguardar el trabajo en la sesión propietaria antes de una purga autorizada.
4. Validar la forma y tipos de los datos recuperados con los schemas existentes adaptados a borradores incompletos; no confiar en `JSON.parse` convertido mediante `as T`.
5. Manejar almacenamiento bloqueado, JSON corrupto y cuota agotada tanto al leer/escribir como al borrar. Informar que no hay respaldo local si no se pudo guardar.
6. No persistir tokens, contraseñas, objetos `File` ni confirmaciones de riesgo/acciones destructivas. Estas últimas deben solicitarse nuevamente.

**Aceptación:** A y B no recuperan el trabajo del otro en la misma pestaña; ocurre lo mismo entre colegios. La recarga con la misma identidad restaura texto válido. Datos corruptos o almacenamiento bloqueado no rompen el formulario ni simulan guardado exitoso.

### A03 — Renovación de sesión sin desmontar el trabajo

**Archivos:** `src/shared/lib/stores/authStore.ts`, `src/shared/api/hooks/useMemberships.ts`, `src/app/App.tsx` y sus consumidores.

1. Reproducir `TOKEN_REFRESHED` y `SIGNED_IN` repetido para el mismo usuario con formulario abierto y texto sin confirmar.
2. No poner el tenant/rol verificado en `null` solo para renovar el token. Diferenciar renovación de cambio real de usuario, colegio, revocación o cierre de sesión.
3. Revalidar permisos sin permitir escrituras con acceso revocado. Un error o denegación real debe bloquear la acción e informar al usuario, sin atribuir el borrador a otra identidad.
4. Conservar `refetchOnWindowFocus: false` y `refetchOnReconnect: false` conforme al requisito actual. No desactivar la renovación segura de tokens para evitar el síntoma.

**Aceptación:** volver de otra pestaña y renovar token no cambia modal, sección, campos o estudiantes seleccionados, ni dispara refrescos por foco/reconexión. Un cambio real de identidad o pérdida de acceso no conserva datos privados visibles ni privilegios anteriores.

### A04 — Permisos coherentes en UI y RLS

**Objetos:** políticas de `incidentes`, `causas`, `checklist_items`, bitácora y relaciones necesarias para completar el alta. Referencias: migraciones `20260827142437_add_incidentes_and_shared_documents.sql` y `20261017183735_close_audit_authorization_gaps.sql`; controlador `src/app/hooks/useNewCausaModalController.tsx`.

1. Documentar por operación qué roles pueden leer, crear, editar, eliminar y reabrir. Distinguir rol de perfil y membresía; comprobar la fuente efectiva que usa la DB.
2. Incorporar las operaciones legítimas de `superadmin` en su tenant sin conceder acceso irrestricto a otros colegios.
3. Resolver la contradicción de roles que pueden crear el incidente pero no sus causas. No habilitar escrituras a docentes u otros roles por conveniencia sin decisión explícita.
4. Alinear controles visibles y mensajes con las políticas. No reemplazar RLS por esconder botones ni usar service role en el navegador.

**Aceptación:** cada rol aprobado completa todas las escrituras de una creación individual/grupal; el no autorizado falla sin registros parciales. Probar llamadas directas a Supabase y tenant ajeno, no solo botones.

### A05 — Borradores hasta confirmación del servidor

**Archivos:** editor y cierre anticipado de causas, `src/shared/lib/hooks/useCausasPersistence.ts`, `src/shared/lib/hooks/causaPersistence.ts` y callbacks de guardado/caché.

1. Sustituir la eliminación anticipada del respaldo por eliminación tras confirmación durable del guardado correspondiente. `onSave: () => void` o actualizar Zustand no equivalen a confirmación del servidor.
2. Mantener respaldo y posibilidad de reintento si falla la red, una colección relacionada o la autorización.
3. Evitar que una respuesta de un guardado antiguo borre una edición más reciente. Asociar la confirmación con la versión/snapshot efectivamente enviado.
4. Cubrir recarga/cierre durante el intervalo de autoguardado: conservar trabajo pendiente localmente y advertir si no puede respaldarse. Restaurar un borrador no debe ejecutar automáticamente cambios legales.
5. Mostrar estados distintos para respaldo local, guardado remoto pendiente, error y guardado confirmado.

**Aceptación:** editar → guardar con fallo simulado → recargar → recuperar texto. Reintentar con éxito elimina solo el respaldo confirmado. Una edición durante una petición lenta permanece intacta. Cerrar un expediente requiere confirmación humana vigente.

### A06 — Notificaciones HTML completas

**Archivos:** `server/lib/validators.ts`, `server/api/routes/notificaciones.ts`, `server/index.ts`, `server/api/index.ts` y generador de notificación.

1. Añadir regresión con HTML sintético mayor a 10.000 caracteres y menor al límite permitido; verificar texto y etiquetas finales en el argumento entregado al proveedor simulado.
2. Evitar que `optStr`/`sanitize` recorten el HTML silenciosamente. Validar tipo, bytes UTF-8 y contenido antes del envío, manteniendo la protección frente a HTML peligroso.
3. Hacer coherentes los límites del documento, la envoltura JSON y `express.json` en ambos entrypoints. No ampliar globalmente el límite de todas las rutas sin necesidad.
4. Rechazar el exceso con un error 4xx claro; nunca enviar una versión parcial y responder éxito.

**Aceptación:** se conserva íntegro el ejemplo de 22.026 caracteres; acentos y emojis respetan el límite por bytes; sobrelímite y HTML peligroso no llaman al proveedor. E2E de entrega solo a un buzón de prueba autorizado.

### A07 — Privacidad antes de llamadas de IA

**Archivos:** `server/lib/validators.ts`, `server/api/routes/advisor.ts`, `server/api/routes/audit.ts`, `server/api/routes/draft.ts` y servicios de proveedores.

1. Inventariar todo lo enviado: mensaje, historial, relato, participantes, nombres/rutas de documentos, texto extraído y datos estructurados.
2. Minimizar datos y reemplazar identidades conocidas antes del envío. No prometer anonimización completa solo por expresiones regulares basadas en mayúsculas.
3. Cubrir nombres en minúsculas, mayúsculas, con tildes y variantes, además de RUN, teléfonos y correos. Revisar los nombres dentro de archivos y antecedentes de terceros.
4. Si un campo libre no puede enviarse con el resguardo acordado, omitirlo o bloquear el envío con explicación; no recurrir a otro proveedor menos protegido.
5. Mantener separados instrucciones y antecedentes no confiables. No enviar datos reales para validar el corrector.

**Aceptación:** pruebas interceptan los payloads completos a todos los proveedores y verifican que no contienen los identificadores sintéticos de prueba. Logs y evidencias tampoco los exponen. La solución no degrada los antecedentes jurídicos necesarios por reemplazos indiscriminados.

### A08 — Incidente y expedientes en una operación atómica

**Archivos/objetos:** `src/app/hooks/useNewCausaModalController.tsx`, `src/shared/api/services/incidentes.service.ts`, creación de causas y nueva migración/RPC.

1. Validar antes de escribir: rol, tenant resuelto desde la sesión, curso, estudiantes únicos pertenecientes al colegio, conducta, relato y fecha/hora.
2. Crear incidente, expedientes y sus estructuras iniciales necesarias dentro de una transacción. Reutilizar correlativos y contratos vigentes; no generar IDs por contadores del navegador.
3. Preferir una RPC `SECURITY INVOKER` con grants explícitos y RLS coherente. Cualquier necesidad de privilegios elevados requiere revisión específica y controles equivalentes.
4. Incorporar idempotencia por tenant/actor/solicitud, reutilizada al reintentar tras una respuesta perdida. Una misma clave con otro contenido debe rechazarse; verificar la carrera concurrente en DB.
5. Actualizar Zustand/caché y limpiar el borrador solo al confirmar el conjunto completo. No presentar un alta parcial como éxito terminado.

**Aceptación:** fallo forzado en el segundo estudiante revierte toda el alta; estudiante repetido o ajeno no deja registros. Peticiones concurrentes y reintentos con la misma clave devuelven el mismo incidente, sin duplicar causas. Se mantienen separados los antecedentes personales de cada expediente.

### A09 — Dependencias y publicación con CI verde

**Archivos:** `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `.husky/` y configuración efectiva de Vercel.

1. Confirmar los advisories vigentes y elegir la versión corregida compatible de Vite. Actualizar declaración y lockfile de forma acotada; no ejecutar `npm audit fix --force` ni una actualización general a ciegas.
2. Verificar Node 22, Vite middleware local, build y ambos entrypoints. Revisar diferencias transitivas del lockfile.
3. Exigir los controles de CI para el **SHA exacto** a publicar. Revisar la integración de Vercel: un push no debe publicar una versión cuyo gate todavía no terminó o falló; usar preview/promoción controlada si corresponde.
4. No dar por saneado el entorno por tratarse de Vercel: los avisos de Vite afectan especialmente al desarrollo. Tampoco presentarlos como explotación demostrada del sitio estático.

**Aceptación:** auditoría de producción sin vulnerabilidades pendientes, CI verde y evidencia de que un fallo del gate impide la promoción de prueba. No se salta ningún hook ni comprobación.

### A10 — Completar el autoguardado solicitado

**Inventario mínimo:** nuevo/editar expediente, incidente grupal, cierre anticipado, cartas (`docgen/hooks/useDocumentState.ts`), notificaciones (`notificacionDocgen/CausaNotificationGenerator.tsx`), edición de anotaciones (`AnotacionesStudentDetailModal/EditAnnotationsTab.tsx`), revisión PDF y `NewDisciplinaryProcessModal.tsx`. Extender el inventario a los demás formularios con edición pendiente accesibles por rol.

1. Registrar para cada formulario identidad del borrador, campos editables, clave de registro, acción de guardar, descartar y restaurar. Excluir formularios de credenciales y secretos.
2. Aplicar A02/A05 con el mínimo código compartido necesario. No serializar indiscriminadamente todo el estado de React ni estados de peticiones en curso.
3. Conservar en el incidente el curso junto con los estudiantes; restaurarlos como conjunto. Un cambio intencional de curso sí debe limpiar selecciones incompatibles.
4. Restaurar paso, contenido y selección sin duplicar uploads, análisis, cartas o expedientes. No reejecutar envíos, firmas, aceptaciones de riesgo ni acciones legales por recuperar un borrador.
5. Mantener `sessionStorage` por pestaña: sobrevive a recargas de esa pestaña, no garantiza recuperación tras cerrarla ni sincronización entre dispositivos. Explicar el límite al usuario.
6. Un archivo `File` no se restaura por JSON: pedir reselección cuando sea necesario. Solo reutilizar metadatos de un archivo ya subido tras comprobar pertenencia y disponibilidad, sin borrarlo por desmontar una vista.

**Aceptación:** cada formulario inventariado conserva trabajo al cambiar de pestaña del navegador, navegar entre vistas, alternar pestañas internas del modal y recargar con la misma sesión. Guardar/descartar afecta solo a su borrador y no se mezcla con otro estudiante, carta, usuario o colegio.

### A11 — Estado de la carta requerida

**Archivos:** `src/shared/lib/domain/disciplinaryStage.ts`, `src/features/anotaciones/annotationStudentCartaStates.ts`, `AnotacionesView.tsx` y consumidores de filtros/exportaciones.

1. Resolver la etiqueta contra la etapa requerida y la carta completada/archivada del año correspondiente.
2. Una carta inferior completada no convierte la etapa siguiente en procesada. Con 11 negativas y solo Amonestación procesada, el Compromiso debe figurar **Pendiente**.
3. Tratar tanto ausencia de carta como estado explícito `none`. No confundir consulta pendiente/fallida con ausencia confirmada; mostrar carga/error cuando no se conoce el estado.
4. Preservar constancias físicas válidas, anulaciones, años y eventos del historial. No crear filas para corregir una etiqueta de tabla.

**Aceptación:** pruebas en 4, 5, 9, 10, 14 y 15 negativas; sin registro, `none`, carta inferior realizada, carta del tramo procesada/archivada, anulada, física y del año anterior. Tabla, filtro Pendiente, exportación y detalle son coherentes. Los 9 casos de la línea base se revisan sin modificar automáticamente antecedentes.

### A12 — Fecha y hora del incidente

**Archivos:** `src/features/causas/ui/NewIncidenteModal.tsx`, `src/app/hooks/useNewCausaModalController.tsx`, `src/shared/api/services/incidentes.service.ts` y RPC de A08.

1. Transmitir `fechaHora` en todo el recorrido; el controlador actualmente la omite al invocar el servicio.
2. Validarla antes de escribir y conservar el instante elegido, sin reemplazarlo por `new Date()` durante un reintento o restauración.
3. Acordar explícitamente la zona del formulario y su conversión a UTC; verificar visualización en `America/Santiago`, cambios de horario y equipos con otra zona.
4. No reemplazar `created_at` ni fechas de apertura individuales por la fecha del hecho, ni recalcular registros históricos.

**Aceptación:** un hecho de fecha anterior mantiene exactamente su fecha/hora al guardar, reabrir y reintentar. Una entrada vacía o inválida informa error y no deja incidente.

### A13 — Pruebas y cierre verificable

- Escribir una regresión que falle antes de cada corrección. No sustituir pruebas de comportamiento por buscar cadenas en el código.
- Cubrir directamente `sessionDraft`, renovación auth/membresía, errores del almacenamiento, guardados lentos/fallidos, grupos atómicos, payloads de IA/correo y reglas de cartas.
- Usar integración contra DB local/staging para roles, políticas y transacciones. Mantener al menos dos tenants y cuentas con permisos distintos.
- Añadir E2E del trabajo en curso y sus cambios de contexto; comprobar teclado, foco, errores y controles en escritorio/móvil. Axe no certifica accesibilidad completa.
- La cobertura global no basta: conservar reporte por módulo y verificar que el código nuevo está realmente incluido. Mantener el umbral vigente de 80 % o superior, sin bajarlo para pasar.

**Aceptación:** todos los IDs anteriores tienen pruebas y evidencia antes/después; ninguna validación omitida o prueba saltada se presenta como aprobada.

## 6. Endurecimientos adicionales, no fallos explotados automáticamente

1. **Contraseñas filtradas:** evaluar/activar la protección de Supabase Auth con el responsable del proyecto y verificar recuperación/acceso de prueba. [Guía oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
2. **`search_path`:** revisar las cuatro funciones `touch_*` señaladas; fijarlo mediante migración nueva según sus referencias reales y propiedad. [Aviso del linter](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
3. **Grants de funciones:** revisar los permisos `SECURITY DEFINER` según propósito, validaciones internas y dependencias. Un aviso sobre una función trigger no demuestra que pueda explotarse como RPC; no revocar en bloque funciones necesarias para RLS.
4. **Índices:** los 28 avisos de FK sin índice y 33 de índices no usados no justifican cambios masivos. Medir consultas representativas, planes y uso; revisar índices compuestos existentes y registrar el beneficio antes de crear/eliminar. [Guía de FK](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
5. **Volumen de cartas:** `fetchCartaTableStates()` usa un máximo fijo de 500 frente a 339 cartas anuales observadas. Preparar fixture de más de 500 y paginar/agregar antes de cruzar ese límite; no atribuirle un fallo actual sin evidencia.

Estos trabajos necesitan responsable y aceptación propios; no sustituyen las correcciones prioritarias ni autorizan tocar objetos de Inasistencias.

## 7. Verificación y despliegue

### 7.1 Controles locales

Ejecutar desde la raíz **uno por uno**, continuando solo si cada comando termina con código 0:

```powershell
npm run lint
npm run test:coverage
npm run knip:ci
npm run build
npm run check:bundle
npm run security-audit
git diff --check
```

`npm run build` regenera `api/index.js`; revisar por separado fuentes y artefactos según la política del repositorio. No editar el bundle a mano ni descartar cambios ajenos para dejar el árbol limpio.

### 7.2 Controles en entorno de prueba

- Inspeccionar antes `scripts/validate-multitenant.mjs`, `scripts/validate-production-roles.mjs`, `playwright.config.ts` y pruebas seleccionadas: pueden crear usuarios/datos o usar credenciales del entorno.
- Ejecutar `npm run test:multitenant`, `npm run test:roles`, `npm run test:a11y` y los E2E críticos **solo contra local/staging confirmado**, con autorización para sus escrituras y correos de prueba.
- Verificar que Vite/API/frontend apuntan al mismo entorno de prueba. No confiar únicamente en el nombre de una variable o del script.
- Probar migraciones, idempotencia, pérdida de respuesta, almacenamiento bloqueado, renovación de token y restauración. Documentar limpieza acotada a los fixtures creados.
- Repetir las consultas de aislamiento y avisos Supabase; diferenciar errores funcionales, avisos informativos y limitaciones.

### 7.3 Publicación autorizada

1. Revisar diff, migraciones, rollback, secretos y PII; registrar aprobación del responsable del colegio y de objetos compartidos cuando corresponda.
2. Desplegar por lotes pequeños y compatibles. Para A08, publicar primero la RPC/migración aditiva; verificarla antes de activar el cliente que la usa.
3. Hacer commit/push solo con autorización. Exigir CI verde sobre el SHA exacto y comprobar que el preview incorpora ese SHA, no un árbol local con cambios adicionales.
4. Promover a producción únicamente tras la aprobación del preview y el gate. Registrar ID/URL del deployment, SHA y migraciones aplicadas; `READY` por sí solo no acredita corrección funcional.
5. Ejecutar smoke de solo lectura: acceso, rutas, health y rechazo sin sesión. Las pruebas autenticadas de escritura en producción requieren autorización y un plan separado; no usar estudiantes reales como fixtures.
6. Monitorear errores de autorización, fallos de guardado, duplicados, pérdida de contexto y correos incompletos. Registrar ventana y responsable del seguimiento; redactar logs antes de compartirlos.

## 8. Recuperación

| Situación                                                     | Acción segura                                                                                                                                                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend defectuoso                                           | Detener promoción; volver al deployment previamente verificado y compatible con las migraciones vigentes. Preservar borradores y evidencia antes de invalidar claves.                                      |
| Migración de permisos bloquea acceso legítimo                 | Usar acceso administrativo de emergencia autorizado y una migración compensatoria revisada. No desactivar RLS ni devolver el hueco de privilegios de A01.                                                  |
| RPC grupal falla                                              | Bloquear temporalmente el alta grupal; conservar solicitudes/borradores para reintento. No volver al flujo parcial ni borrar expedientes para simular rollback.                                            |
| Datos alterados inesperadamente                               | Detener escrituras del flujo afectado; identificar filas por trazabilidad y recuperar de forma acotada con respaldo/plan aprobado. No restaurar toda la base compartida sin evaluar efectos en ambas apps. |
| Mensaje o datos enviados al destinatario/proveedor incorrecto | Detener nuevos envíos, preservar trazabilidad y activar el procedimiento institucional de privacidad; un rollback de código no revierte una divulgación.                                                   |

No usar `git reset --hard`, borrar rutas completas, modificar migraciones antiguas ni reintroducir políticas vulnerables como recuperación rápida.

## 9. Registro de ejecución y cierre

### 9.1 Primer lote local — 22-10-2026

Registro histórico. Los bloqueos de Docker/SQL de esta subsección se superaron localmente en §9.5; no describen el estado actual de producción.

**Responsable:** OpenCode, sesión de ejecución solicitada por el usuario. Sin issue/PR ni commits de esta ejecución. Cambios en el árbol de trabajo sobre `aeb0156e7ea94c2fe5c652d9879feb085b5db310`; `opencode.json` preexistente se preservó sin editar.

No hubo migraciones, escrituras de datos, llamadas reales a proveedores de IA, envíos de correo ni despliegues remotos. Las pruebas HTTP usan servidor local y proveedores/base simulados; las pruebas de navegador bloquean la red y montan componentes reales con identidades ficticias.

| ID  | Implementación / evidencia RED → GREEN                                                                                                                                                                                                                                                                     | Resultado y pendiente                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Sin modificación de SQL. `docker info --format '{{.ServerVersion}}'` no conecta a `dockerDesktopLinuxEngine`.                                                                                                                                                                                              | **Bloqueado**: iniciar Docker o proporcionar staging, coordinar con Inasistencias y validar perfiles/membresías con identidades de prueba. El defecto remoto no está corregido.                                                                                                                                                                                                                                                           |
| A02 | `sessionDraft.test.ts`: los tipos inválidos se recuperaban sin validar y no había separación/limpieza. Ahora 8 pruebas del helper verifican schemas, identidad/tenant/registro, almacenamiento bloqueado, JSON corrupto y confirmaciones. `authStore.events.test.ts` verifica limpieza selectiva al salir. | Claves `draft:v2`, sin lectura/escritura sin identidad; se preservan credenciales y claves legacy. Aviso sobre borradores legacy sin reasignarlos ni purgarlos. La frontera de sesión limpia memoria/caché al cambiar realmente de usuario/colegio.                                                                                                                                                                                       |
| A03 | El callback real ponía tenant en `null` al renovar y conservaba membresía al cambiar de usuario. Regresiones de `authStore.events.test.ts`: contexto estable, revalidación, respuestas obsoletas y perfiles ausentes/inactivos.                                                                            | Renovación de misma identidad no desmonta formularios; cambios reales limpian permisos. Revalidación de membresía sin reutilizar caché previa. Pendiente validación integrada de revocación/RLS en entorno autorizado. No se cambió el requisito de no refrescar por foco/reconexión.                                                                                                                                                     |
| A04 | Sin modificación de políticas ni ampliación de roles.                                                                                                                                                                                                                                                      | **Bloqueado** por A01/entorno de prueba y matriz de permisos compartida. No se declara que superadmin ya complete el alta.                                                                                                                                                                                                                                                                                                                |
| A05 | `sessionDraft.test.ts` y `tests/session-drafts.spec.ts`: la confirmación anticipada perdía el respaldo; además la segunda edición podía quedar encolada sin enviarse tras una petición lenta (1 envío en vez de 2).                                                                                        | Editor/cierre registran el snapshot enviado; solo una persistencia completa confirma su borrador. Una respuesta antigua no borra texto nuevo. El autoguardado drena la siguiente edición tras finalizar la anterior, sin bucle automático de reintentos fallidos. Archivos locales siguen requiriendo reselección tras recarga.                                                                                                           |
| A06 | `notificaciones.integration.test.ts`: HTML de 22.026 caracteres llegaba recortado a 10.000; HTML excedido podía enviarse parcial y la envoltura JSON válida fallaba con 413. Regresiones adicionales de esquemas ejecutables ofuscados y cuerpo vacío.                                                     | HTML original completo; validación por bytes y rechazo sin llamar al proveedor. `configureJsonBody` compartido por ambos entrypoints amplía solo esta ruta. Entrega real a buzón de prueba **no ejecutada**.                                                                                                                                                                                                                              |
| A07 | `validators.test.ts` y `aiPrivacy.integration.test.ts`: fallaban identidades conocidas sin tildes y se filtraban nombres/rutas de archivos en los dossiers. Ahora se interceptan los payloads completos de asesor, auditoría y borrador a proveedores simulados.                                           | **Parcial**: identidades conocidas reconocen variantes; nombres/rutas de archivos no se envían. Se conserva la gravedad de la falta y no se elimina una observación completa por tratarla como identidad. **Nombres de terceros no declarados, especialmente en minúsculas, siguen sin garantía de desidentificación.** Falta definir e implementar revisión estructurada o bloqueo de esos textos; no publicar como privacidad resuelta. |
| A08 | Sin RPC ni migración; no se intentaron escrituras grupales en producción.                                                                                                                                                                                                                                  | **Bloqueado**: aún existe el flujo secuencial no atómico. Falta transacción, idempotencia y prueba de concurrencia/reversión en DB de prueba.                                                                                                                                                                                                                                                                                             |
| A09 | `npm audit --omit=dev` pasó de una vulnerabilidad alta en Vite a 0; Vite quedó en **8.2.4**, con lockfile y transitivas revisadas.                                                                                                                                                                         | **Parcial**: auditoría de producción corregida. La instalación reporta avisos de desarrollo; no se ejecutó actualización masiva ni `--force`. El gate remoto y la configuración de promoción de Vercel no se modificaron ni validaron.                                                                                                                                                                                                    |
| A10 | Pruebas de navegador reprodujeron pérdida de carta, selección de anotaciones, notificación y edición de anotaciones al desmontar/recargar. Recuperación del incidente también conserva curso y fecha.                                                                                                      | **Parcial**: siete flujos con respaldo local, inventario inicial abajo. No se restauran autorizaciones excepcionales ni aceptación de riesgo. No se alteran snapshots notificados/históricos para recuperar un borrador. PDF y otros formularios siguen pendientes; no equivale a «todos los formularios».                                                                                                                                |
| A11 | Regresiones de `disciplinaryStage.test.ts` y `annotationStudentCartaStates.test.ts`: carta inferior realizada y estado `none` se confundían con trámite de la etapa requerida; carga sin resultado se trataba como ausencia.                                                                               | Tramo correcto y **Pendiente** cuando falta su carta. Carga/error se informa aparte. Pruebas de fronteras y regresiones históricas aprobadas; ninguna carta histórica modificada. Revisión de los nueve casos reales no repetida en esta ejecución.                                                                                                                                                                                       |
| A12 | `incidentes.service.test.ts`: fecha inválida no rechazaba antes de escribir. Prueba de navegador conserva una fecha anterior y produce el UTC esperado; `annotationEditUtils.test.ts` cubre invierno/verano, hora inexistente y equipo en otra zona.                                                       | Se transmite `fechaHora` desde controlador al servicio, sin sustituirla por ahora. Conversión compartida en `dateTimeUtils.ts` y zona explícita Chile continental. No se corrigieron registros históricos; queda integrar la futura RPC de A08.                                                                                                                                                                                           |
| A13 | Regresiones unitarias, HTTP y de navegador; `npm run test:e2e:offline` agregado al CI, sin credenciales remotas.                                                                                                                                                                                           | **Parcial**: controles locales no certifican RLS/transacciones, entrega de correo ni promoción. Verificación global en §9.3.                                                                                                                                                                                                                                                                                                              |

### 9.2 Inventario inicial A10 — no exhaustivo

En todos los respaldos implementados la clave incluye usuario y colegio, y el registro cuando corresponde. El respaldo usa `sessionStorage`: es por pestaña, no entre dispositivos ni después de cerrar la pestaña. No se persisten objetos `File`, credenciales ni aceptaciones legales.

| Formulario                                                          | Contenido respaldado                                                                         | Guardado/recuperación                                                                                                          | Estado                                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Nuevo expediente                                                    | Curso/estudiante, RUN, falta, relato y responsable                                           | Recuperación validada; limpieza al confirmar creación del núcleo                                                               | Implementado; falta E2E de alta integrada                                                                             |
| Editor de expediente                                                | Campos editables del formulario                                                              | Confirmación del autoguardado remoto correspondiente; respuestas antiguas preservan edición nueva                              | Validado en navegador con servidor simulado                                                                           |
| Cierre fundado                                                      | Responsable, título y motivo                                                                 | Conserva respaldo hasta persistencia; aceptación de riesgo siempre nueva y archivo requiere reselección                        | Implementado; falta E2E completo del cierre                                                                           |
| Incidente grupal                                                    | Curso, estudiantes, fecha/hora, lugar, relato, responsable, conducta y clave de solicitud    | La RPC confirma todo el grupo; reintentos conservan clave y fecha, sin alta secuencial de respaldo                             | SQL/servicio y recuperación en navegador validados; integración autenticada en staging y descarte completo pendientes |
| Carta disciplinaria                                                 | Texto, responsables, tipo, compromisos y selección de anotaciones                            | Separado por estudiante/tipo/registro; no restaura autorizaciones ni suplanta snapshots completados                            | Validado en navegador; falta limpieza terminal integrada y descarte explícito completo                                |
| Notificación                                                        | Texto, apoderado, correo y firmante                                                          | Borrador separado del documento; espera snapshot remoto antes de montar; notificada/anulada no se sustituye por borrador local | Validado en navegador; falta limpieza terminal integrada                                                              |
| Edición de anotaciones                                              | Texto, fecha, tipo, responsable y anotación activa; mapa de ediciones por estudiante         | Preserva entre pestañas internas/recarga y ante error; guardar no borra una edición posterior                                  | Validado en navegador                                                                                                 |
| Revisión PDF / nuevo proceso disciplinario                          | Paso, selección, clasificación, anotaciones, texto aún no aplicado, metadatos e idempotencia | Revalida análisis, colegio, archivo privado y SHA-256; no repite upload, análisis ni confirmación; salir no borra PDFs remotos | Validado en escritorio/móvil; archivos sin análisis finalizado pueden requerir reselección                            |
| Bitácora e historial manual                                         | Título, descripción, fecha, texto, tipo, participantes, alcance y clave estable de entrada   | Cerrar conserva; descarte explícito; limpieza solo por snapshot remoto confirmado, sin borrar ediciones nuevas                 | Tres consumidores integrados; E2E de bitácora y estudiante en escritorio/móvil; ruta de evidencias sin E2E específico |
| Registro de hitos/avances                                           | Aún en memoria                                                                               | Continuar en `RegistrationForm` y `useChecklistRegistration`, por expediente/hito y con confirmación durable                   | **Pendiente**                                                                                                         |
| Constancia física y diálogos de notas/fundamentos                   | Aún en memoria                                                                               | Preservar texto, sin restaurar aceptación ni ejecutar la actuación automáticamente                                             | **Pendiente**                                                                                                         |
| Plantillas, configuración institucional y administración/plataforma | Aún en memoria                                                                               | Revisar cada formulario editable por rol, excluyendo contraseñas/invitaciones y acciones automáticas                           | **Pendiente**                                                                                                         |

### 9.3 Verificación del primer lote

- Corrida global final de fuentes: `npm run test:coverage` → **1.037/1.037**, 219 suites, **91,78 %** de líneas reportadas, sin pruebas omitidas. El runner incluye pruebas en ese porcentaje y no incluye todos los hooks/componentes. No es cobertura total del frontend.
- `npm run test:e2e:offline` → **16/16** en Chromium: ocho escenarios en escritorio (1440 px) y móvil (375 px), con red bloqueada. Se prueba comportamiento, no una auditoría visual/AXE de todos los formularios.
- `npm run lint` aprobado sin advertencias; `npm run build` aprobó frontend Vite 8.2.4 y ambos entrypoints del servidor.
- `npm run knip:ci` aprobado después de conectar la configuración de pruebas offline a un script real. Mantiene cuatro sugerencias preexistentes de configuración, no errores de archivos/dependencias sin uso.
- `npm run check:bundle` → **2.200.600 bytes** JS totales, dentro del presupuesto. `api/index.js` regenerado por build; no editado a mano.
- `npm run security-audit` → **0 vulnerabilidades de producción**. Esto no declara inexistentes los avisos de dependencias de desarrollo.
- `git diff --check` aprobado. Repetir los controles si cambia cualquier fuente después de este registro; una edición solo documental no invalida la corrida.

**Siguiente paso del primer lote:** entorno DB y coordinación para A01/A04/A08. §9.5 incorpora la continuación local; los pendientes vigentes están en §9.6. Los casilleros finales son de cierre operativo, no de implementación local.

### 9.4 Autoevaluación del primer lote

**Resultado: avances locales verificados, ejecución incompleta (3,6/5).**

| Eje            | Nota | Evidencia / mejora concreta                                                                                                  |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| Exactitud      | 4/5  | Pruebas y resultados reproducibles; sin evidencia de DB real, entrega o promoción. No atribuirles aprobación.                |
| Completitud    | 2/5  | A01/A04/A08 bloqueados; A07/A09/A10/A13 parciales. El pedido incluía todos los formularios, no solo los siete respaldados.   |
| Claridad       | 4/5  | §9 distingue implementación, validación local y pendientes; la tabla sigue siendo extensa.                                   |
| Accionabilidad | 4/5  | Script offline y matriz de siguiente trabajo disponibles; falta entorno/coordinar acceso antes del lote DB.                  |
| Concisión      | 4/5  | Reutiliza servicios, validación y UI instalados; quedan listas de campos duplicadas entre formularios y schemas de borrador. |

**Mejoras por impacto:** (1) cerrar autorización/atomicidad en DB de prueba, (2) cerrar la brecha de terceros en IA y terminar el inventario/autoguardado A10, (3) validar promoción y flujos integrados en staging. **Autocontrol:** el usuario no debería interpretar este lote como el runbook completo ni listo para producción.

### 9.5 Segundo lote — continuación del 22–23-10-2026

**Decisiones del usuario:** autorizar expedientes por membresía activa de Convivencia, con perfil activo del mismo colegio ([ADR-0009](../adr/0009-convivencia-membership-authorization.md)). A07 permanece pendiente: no se bloqueó la IA ni se prometió anonimización de terceros desconocidos.

**Entorno:** Docker 29.6.2 y Supabase local operativos. La base preexistente `postgres` conserva `20260808100000`, sin tabla `incidentes`. Su esquema resultó idéntico a la copia previa, excluyendo solo los delimitadores aleatorios de `pg_dump`. No hubo reset ni copia de datos personales. Los ensayos usan `runbook_audit_20261022_v3`, copia de solo esquema actualizada con las migraciones del repositorio; las dos copias iniciales fallidas se conservaron solo con esquema.

El baseline no contenía `gmail_imports`: se agregó únicamente a la copia aislada mediante `supabase/tests/fixtures/shared-inasistencias-schema.sql`, contrastando columnas con una consulta remota de metadatos, sin leer filas. Este fixture vacío no certifica políticas, triggers ni el flujo real de Gmail/Inasistencias. La autorización se prueba con `SET LOCAL ROLE authenticated` y claims ficticios; el usuario administrativo solo prepara y limpia fixtures.

- **A01:** `20261022120000_reject_unverified_profile_privileges.sql`. RED: una identidad sin perfil pudo insertar un perfil administrativo. GREEN: `profile_privileges.sql` rechaza privilegios para rol nulo, inactivo, revocado, docente y otro colegio sin efectos laterales. La sincronización no reactiva membresías revocadas ni perfiles inactivos. Se conserva la edición no privilegiada y la administración ficticia de ambos consumidores. Falta coordinación y validación integrada con Inasistencias.
- **A04:** `20261022130000_authorize_causas_by_convivencia_membership.sql` y permisos de UI. RED: un perfil docente con membresía operativa no completaba el alta; la matriz ampliada detectó además borrado bloqueado por avances y vinculación a estudiante ajeno. GREEN: siete roles operativos, docentes de solo lectura, vigencia/revocación, relaciones del expediente, tenant ajeno, reapertura administrativa y borrado con avances. Un trigger impide relaciones estudiante/expediente entre colegios. No se cambiaron los resolutores de rol/tenant compartidos.
- **A08/A12:** `20261022140000_create_incidente_with_causas_atomically.sql`, servicio y controlador. La RPC `SECURITY INVOKER` crea incidente, expedientes, 38 ítems iniciales por expediente y bitácoras individuales en una transacción. Tenant/actor se resuelven en DB; correlativos globales sin truncamiento después de 999. El borrador conserva la clave de solicitud. Si falta la RPC, se informa el error y no se vuelve al alta parcial.
- **Integridad:** `incident_atomicity.sql` fuerza un fallo en el segundo estudiante y verifica rollback total; rechaza repetidos/ajenos, conducta inválida, checklist incompleto y misma clave con otro contenido. Otra regresión reprodujo un hash dependiente del huso horario: se normalizó en UTC, conservando el instante del hecho. Dos conexiones con la misma clave devuelven el mismo grupo; claves distintas no chocan. Fixtures transaccionales revertidos y limpieza de carreras limitada a sus identificadores ficticios.
- **A10 PDF:** schemas, `usePdfReviewDraft` y ambos consumidores. RED: cierre/recarga perdían revisión o borraban el archivo; la pantalla real permitía confirmar sin archivo revalidado o con texto en edición. GREEN: respaldo del textarea aún no aplicado y conservación al retroceder. Confirmación bloqueada hasta guardar/descartar ediciones y revalidar PDF. Un fallo de refresco tras el éxito no se presenta como confirmación fallida. Descartar texto no elimina PDFs remotos que pudieron quedar confirmados tras una respuesta perdida.
- **A09:** el 23-10 apareció un aviso crítico nuevo en DOMPurify 3.4.16, transitivo de PostHog. Se actualizó solo ese paquete a **3.4.17**, dentro del rango existente y sin nueva dependencia directa ni `--force`. Auditoría de producción: de un hallazgo crítico a cero. Vite permanece en 8.2.4.

**Reproducción:** `npm run test:db:runbook` apunta exclusivamente al contenedor local y la copia aislada indicada. Requiere esa base preparada; no prepara, resetea ni migra `postgres`, ni lee credenciales/URLs productivas. Las tres migraciones nuevas se ensayaron solo localmente; aún falta aplicar el conjunto completo desde cero en staging y revisar propietarios/grants del destino.

**Controles finales:**

- `npm run lint`: aprobado.
- Node **22.23.4**: **1.048/1.048**, 221 suites, **91,86 %** de líneas reportadas, sin pruebas omitidas; build de Vite y ambos entrypoints aprobado bajo Node 22.
- Cobertura por módulo: permisos y schema de incidente **100 %**; almacenamiento PDF **98,10 %**; schema del borrador PDF **89,80 %**; servicio de incidentes **70,04 %**, incluyendo lecturas anteriores sin cobertura. El porcentaje global incluye tests y no acredita todos los hooks/componentes; navegador/SQL complementan la evidencia.
- Navegador offline: **20/20**, diez escenarios en escritorio/móvil con red bloqueada. Incluye texto PDF pendiente, navegación anterior y clave de incidente conservada tras fallo/recarga.
- DB: tres suites SQL y carreras reales aprobadas también con el ejecutor bajo Node 22; limpieza acotada confirmada.
- Knip aprobado con cuatro sugerencias preexistentes; JS total **2.213.630 bytes**, dentro del presupuesto. `api/index.js` regenerado, no editado a mano.
- Auditoría de producción: **0 vulnerabilidades** con DOMPurify 3.4.17; no certifica dependencias de desarrollo ni evita avisos futuros.

Sin commit, push, deploy, correos reales ni escrituras/migraciones remotas. `opencode.json` preexistente se preservó. No se alteraron cartas históricas ni el requisito de no refrescar por foco/reconexión.

### 9.6 Pendientes vigentes — no cerrar el runbook

1. **A10:** implementación local de hitos/avances, constancia física, diálogos de cartas, plantillas y campos no-file de administración/plataforma completada; evidencia adicional validada offline. Pendientes: E2E específico de `RutaYoloView`, revisión completa del inventario y validación autenticada. Mantener confirmación durable y excluir archivos/aceptaciones.
2. Completar limpieza terminal y descarte explícito de cartas/notificaciones e incidente. Los flujos respaldados no equivalen a todos los formularios. Informar el límite por pestaña y reselección de archivos locales.
3. **A01/A04/A08:** coordinar perfiles/membresías con Inasistencias, revisar esquema destino y ensayar las tres migraciones en staging con respaldo/recuperación y ambos clientes. SQL no sustituye el flujo autenticado UI → Supabase ni autoriza publicación.
4. **A07:** el usuario acepta explícitamente el riesgo residual de nombres de terceros desconocidos en texto libre. Queda documentado como excepción aprobada; no se afirma anonimización completa.
5. **A06/A09/A13:** correo a buzón de prueba autorizado, CI/promoción del SHA exacto y ensayo de bloqueo de promoción fallida. No se usaron scripts de roles/multitenant potencialmente productivos.
6. Endurecimientos de §6 sin ejecutar en este lote: requieren responsable y aceptación, no cambios masivos a objetos compartidos o índices sin evidencia.

### 9.7 Autoevaluación del segundo lote

**Resultado: 3,6/5; ejecución incompleta.** Exactitud **4/5**: RLS, rollback y concurrencia reales; falta integración autenticada en staging. Completitud **2/5**: faltan formularios A10 y promoción A09/A13. Claridad **4/5**: historia separada del estado vigente, aunque el runbook es extenso. Accionabilidad **4/5**: ejecutor reproducible, pero preparar el esquema compartido exige cuidado manual. Concisión **4/5**: sin dependencias directas ni capa general nueva; SQL/fixtures extensos por autorización e integridad.

**Mejoras:** completar A10 con confirmación durable; coordinar y ensayar staging; cerrar correo/promoción. **Autocontrol:** no significa runbook terminado ni producción corregida.

### 9.8 Tercer bloque A10 — historial y bitácora, 23-10-2026

**Corte de alcance:** cerrar este bloque, sin abrir nuevas correcciones. El usuario pidió aclarar la demora; la auditoría completa sigue **NOT READY**, no es una compilación pendiente.

- `HistoryEntryForm` respalda contenido incompleto por identidad/colegio/registro en sus tres consumidores. Cerrar conserva el texto; `Descartar borrador` lo elimina explícitamente. No se respaldan archivos ni aceptaciones; el aviso exige reseleccionar archivos al cerrar/recargar.
- Bitácora ahora envía fecha y texto de evidencia, que antes ignoraba. El tratamiento del respaldo se concentra en `useBitacoraLog`; si hay archivo y texto, ambos se conservan (texto incorporado a la descripción). La clave de entrada se conserva al reintentar. En el historial del estudiante, fecha y evidencia se incorporan al relato, sin alterar `created_at`; sigue vigente el límite del servicio de 2.000 caracteres y un rechazo conserva el borrador, sin truncar.
- Las confirmaciones pendientes se guardan junto al borrador, bajo la misma identidad, para sobrevivir a una recarga. Se limpian al persistir el expediente completo o hidratar el detalle remoto correspondiente, nunca por actualizar Zustand. El snapshot exacto impide borrar ediciones posteriores; el evento de limpieza también compara el texto en pantalla por si falló su respaldo.

**Evidencia RED → GREEN:** dos pruebas unitarias reprodujeron pérdida de confirmación tras recarga y captura equivocada del snapshot después de una espera. Navegador reprodujo pérdida al cerrar/recargar, detalles no recuperados, texto ignorado con archivo y una edición solo en memoria borrada por respuesta antigua con cuota agotada. Los mismos casos pasaron tras corregirlos.

**Controles:** Node 22.23.4, **1.050/1.050**, 221 suites, **91,84 %** de líneas reportadas; navegador offline **24/24** escritorio/móvil. Tras dar formato, los cuatro escenarios nuevos volvieron a pasar. Lint/tipos, build, Knip, auditoría productiva (**0 vulnerabilidades**) y presupuesto JS (**2.216.011 bytes**) aprobados. El porcentaje global incluye tests y no acredita todos los componentes. Registro: `runbook-history-coverage-20261023.log` en la carpeta temporal aprobada.

**Límites:** sin E2E específico de `RutaYoloView`, sin ensayo autenticado de pérdida de respuesta/recarga ni de cambio de identidad durante una subida en curso. No se volvieron a ejecutar las suites SQL: este bloque no cambia esquema ni permisos. Sin commit/push/deploy, correo real o escrituras remotas. `opencode.json` preexistente intacto; bundle de API regenerado por build.

**Autoevaluación: 3,0/5.** Exactitud **4/5**: pruebas y tipos aprobados, falta integración autenticada. Completitud **2/5**: siguen pendientes hitos y demás formularios. Claridad **3/5**: el corte y los pendientes quedaron explícitos, pero el usuario tuvo que preguntar por la demora. Accionabilidad **4/5**: siguiente blanco concreto, falta ejecutar sus criterios. Concisión **2/5**: la investigación y verificación se extendieron demasiado para este bloque. Mejoras: acotar por formulario antes de empezar; reutilizar la evidencia existente; informar bloqueos externos antes de prolongar la ejecución. Autocontrol: no equiparar este avance con cierre del runbook.

### 9.9 Cuarto bloque A10 — evidencia adicional y campos administrativos, 23-10-2026

- `HistoryEntryForm` para evidencia adicional conserva título, descripción, fecha, texto, alcance y clave de registro tras recarga; el archivo seleccionado no se restaura y debe reseleccionarse.
- Se añadieron respaldos privados para plantillas, invitación administrativa, importación de base, creación de colegios e importación de plataforma; los archivos siguen excluidos.
- Se corrigió la confirmación de los cuatro diálogos de cartas: ahora el callback retorna su resultado remoto y el borrador solo se limpia después del éxito.
- Evidencia RED → GREEN: `npm run test:e2e:offline -- --project escritorio --grep "evidencia adicional|hito:"` — 2/2; typecheck y lint aprobados.

**Límites:** todavía falta montar la prueba desde `RutaYoloView`, repetir los flujos administrativos en navegador y validar el comportamiento con sesión autenticada en staging.

### 9.10 Validación autenticada de staging — 23-10-2026

- Proyecto Supabase configurado: validación multi-tenant aprobada con `mmddconcepcion` y `colegio-san-jose`; cursos, plantillas, configuración y reglamentos permanecen aislados; `audit_events` rechaza update/delete. Fixtures QA eliminados al finalizar.
- URL de staging: `https://gestiondecasos.vercel.app/`. Matriz de roles aprobada: admin/dirección `200` en administración e institución; convivencia, inspectoría, profesor jefe, docente, inspector, usuario y equipo `403`; onboarding `200` para roles operativos. Usuarios QA eliminados al finalizar.
- Smoke, accesibilidad y plataforma: **17/17 ejecutadas aprobadas**, 3 pruebas omitidas por credenciales/condición explícita; ninguna falló.
- DB aislada: `profile_privileges.sql`, `causa_role_matrix.sql` e `incident_atomicity.sql` aprobados; carreras idempotentes y sin colisión de correlativos.
- Cobertura: **1.050/1.050**, 221 suites, **91,75 %** líneas. Build, `npm audit --omit=dev` (0 vulnerabilidades) y presupuesto JS (**2.216.011 bytes**) aprobados.

**Pendientes de cierre:** correo a buzón de prueba autorizado, gate CI/promoción del SHA exacto, migraciones y flujos transaccionales autenticados en staging, y E2E directo de `RutaYoloView`.

### Criterios de cierre

- [ ] A01: roles nulos/revocados no elevan privilegios y ambas aplicaciones conservan sus accesos legítimos.
- [ ] A02: borradores y estado en memoria aislados por identidad/tenant, sin secretos ni purgas silenciosas.
- [ ] A03: foco/reconexión/renovación no destruyen trabajo; revocaciones reales siguen bloqueando acceso.
- [ ] A04: matriz de roles completa validada en UI, API/RPC y RLS con tenant ajeno.
- [ ] A05: ningún respaldo se elimina antes de confirmar el guardado correspondiente.
- [ ] A06: HTML íntegro, límites coherentes y envío de prueba verificado.
- [ ] A07: payloads de IA verificados sin identificadores personales de prueba y limitaciones documentadas.
- [ ] A08: alta grupal atómica, idempotente y sin duplicados bajo fallos/concurrencia.
- [ ] A09: dependencia corregida y CI verde como requisito efectivo de promoción.
- [ ] A10: inventario completo de formularios aprobado y restauración validada, con límites de archivos/sesión visibles.
- [ ] A11: etapa y estado de cartas coherentes, sin reescribir el historial para corregir etiquetas.
- [ ] A12: fecha/hora elegida conserva su significado en todo el flujo.
- [ ] A13: regresiones, integración, E2E y controles globales con evidencia del SHA publicado.
- [ ] Endurecimientos adicionales ejecutados o diferidos explícitamente con motivo y responsable.
- [ ] Recuperación ensayada en staging, cambios compartidos documentados y monitoreo posterior registrado.

**Veredicto operativo:** mantener **NOT READY** mientras exista un bloqueo de seguridad/integridad o un gate fallido. Cambiar a **READY** solo con los criterios cumplidos; una excepción residual debe quedar delimitada y aprobada, nunca usarse para dar por corregido un fallo pendiente.
