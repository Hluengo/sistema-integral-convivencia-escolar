# Runbook: documentos propios y compartidos en incidentes grupales

**Estado:** Preparado para ejecución
**Alcance:** Incidente grupal, expedientes individuales y documentos privados/compartidos
**Fuera de alcance:** Interpretar jurídicamente cada caso, cambiar sanciones, modificar el flujo de debido proceso o compartir automáticamente antecedentes personales

## 1. Objetivo

Permitir que un incidente —por ejemplo, consumo de alcohol con varios estudiantes
involucrados— tenga varios expedientes individuales y documentos con dos niveles de
visibilidad:

- **Solo este expediente:** queda en la carpeta del estudiante actual.
- **Compartido con el incidente:** se almacena una sola vez y aparece en los expedientes
  vinculados y en la vista del incidente grupal.

La opción compartida no debe duplicar físicamente el archivo en cada carpeta.

## 2. Estado actual verificado

La aplicación ya tiene:

- Una `Causa` asociada a un solo estudiante mediante `student_id`.
- Bitácora con participantes como texto libre.
- Carga de archivos en `documentos_convivencia`.
- Rutas actuales con formato `causaId/documentos/nombre-archivo`.
- Cargas desde bitácora, avances de hitos y documentos del expediente.
- Validación de extensión, archivo vacío y límite de 10 MB.
- Bucket privado y políticas Storage restringidas por establecimiento y expediente.

Referencias principales:

- `src/shared/lib/types.ts`
- `src/shared/api/services/storage.service.ts`
- `src/shared/lib/hooks/useDocumentManager.ts`
- `src/shared/lib/hooks/useBitacoraLog.ts`
- `src/shared/lib/hooks/useChecklistRegistration.ts`
- `supabase/migrations/20260805170822_align_convivencia_document_storage_roles.sql`
- `supabase/migrations/20260824193445_allow_avances_convivencia_storage.sql`

No se debe reutilizar `causa_documents` para esta función: esa tabla administra
notificaciones de inicio de indagación y tiene un contrato específico.

## 3. Modelo operativo

```text
Incidente grupal: consumo de alcohol
├── Expediente estudiante A
│   ├── Documentos propios
│   └── Documentos compartidos del incidente
├── Expediente estudiante B
│   ├── Documentos propios
│   └── Documentos compartidos del incidente
└── Expediente estudiante C
    ├── Documentos propios
    └── Documentos compartidos del incidente
```

Reglas:

1. Cada estudiante conserva una causa separada.
2. Los hechos comunes pueden reutilizarse al crear las causas, pero los descargos y
   antecedentes individuales se editan por separado.
3. Un testigo o funcionario no se convierte automáticamente en una causa.
4. Un documento compartido no completa automáticamente un hito en los demás expedientes.
5. Las notificaciones, descargos, informes personales y antecedentes médicos son privados
   por defecto.
6. Eliminar un documento compartido lo elimina para todo el incidente; por eso la acción
   debe confirmarse y, preferentemente, ejecutarse desde la vista grupal.

## 4. Diseño de datos

### 4.1 Tabla de incidentes

Crear una tabla `public.incidentes` con, como mínimo:

- `id uuid primary key`;
- `tenant_id uuid not null`;
- fecha y hora del hecho;
- lugar;
- tipo de incidente;
- descripción común;
- responsable de apertura;
- `created_at` y `updated_at`.

Agregar a `public.causas`:

```text
incidente_id uuid null
```

Crear índice por `(tenant_id, incidente_id)` y una relación que impida vincular una causa
de un establecimiento con un incidente de otro establecimiento. Los expedientes
históricos quedan con `incidente_id = null`.

### 4.2 Ubicación de archivos

Mantener dos destinos:

```text
causaId/documentos/archivo.pdf
incidenteId/documentos/archivo.pdf
```

El segundo archivo se guarda una sola vez. La interfaz lo lista también dentro de cada
expediente vinculado, indicando claramente que es compartido.

No copiar el archivo a todas las carpetas salvo que exista una exigencia operacional
posterior que justifique duplicación, sincronización y limpieza de copias.

## 5. Preparación y controles previos

Desde la raíz del repositorio:

```powershell
git status -sb
git branch --show-current
supabase --version
```

Confirmar antes de editar:

- no existen cambios locales relacionados con Storage, causas o migraciones;
- `.vite/` y archivos no relacionados se conservan sin incluirlos en el commit;
- el proyecto Supabase vinculado corresponde al establecimiento esperado;
- existe un usuario de prueba con acceso a convivencia y otro sin acceso al tenant;
- se dispone de un incidente de prueba con tres estudiantes ficticios.

No usar `git add -A`.

## 6. Orden de implementación

### Paso A: migración Supabase

Crear la migración con el CLI, no inventar el nombre del archivo:

```powershell
supabase migration new add_incidentes_and_shared_documents
```

La migración debe:

1. Crear `public.incidentes` con `tenant_id` obligatorio.
2. Activar RLS.
3. Crear políticas `SELECT`, `INSERT`, `UPDATE` y `DELETE` alineadas con el acceso actual
   de convivencia.
4. Agregar `causas.incidente_id` como columna nullable.
5. Crear índice para consultar las causas del incidente.
6. Impedir relaciones entre tenants.
7. No borrar ni modificar filas existentes.

Para Storage, actualizar las políticas del bucket privado para aceptar:

- rutas cuyo primer segmento sea una causa válida del tenant; o
- rutas cuyo primer segmento sea un incidente que tenga causas válidas del tenant.

Mantener la validación del segundo segmento (`documentos`) y los roles autorizados.
No conceder acceso a `anon`.

### Paso B: tipos y servicios

Agregar el tipo mínimo `Incidente` y `incidenteId?: string` a `Causa`.

Extender el servicio de almacenamiento para aceptar un destino explícito:

```text
causa | incidente
```

El servicio debe seguir centralizando:

- validación de extensión;
- límite de 10 MB;
- nombre seguro;
- `upsert: false`;
- generación de ruta;
- URLs firmadas.

Actualizar el listado para combinar documentos propios y compartidos sin duplicarlos en la
interfaz. Los documentos compartidos deben conservar su ruta de incidente y no convertirse
en una ruta de causa por conveniencia.

### Paso C: formulario de carga

En los formularios que actualmente permiten adjuntar archivos —documentos del expediente,
bitácora y avances— mostrar, solo cuando exista `incidenteId`:

```text
Guardar documento en:
(•) Solo este expediente
( ) Compartir con el incidente grupal
```

Comportamiento:

- opción individual seleccionada por defecto;
- la opción grupal exige confirmación visual;
- el texto debe advertir que el documento será visible para todos los expedientes
  vinculados;
- si el documento se carga desde un hito, solo se actualiza el hito del expediente actual;
- el documento compartido aparece además en la sección común del incidente.

### Paso D: vista del incidente grupal

Agregar una vista simple que muestre:

- datos comunes del incidente;
- causas vinculadas;
- estado y avance de cada causa;
- documentos compartidos;
- opción para agregar otra causa;
- historial de quién subió o eliminó documentos compartidos.

Desde una causa individual debe existir un enlace a la vista grupal, pero no deben aparecer
automáticamente los descargos ni los documentos privados de los otros estudiantes.

### Paso E: creación de varias causas

El flujo grupal debe:

1. Crear el incidente.
2. Seleccionar varios estudiantes.
3. Crear una causa independiente para cada estudiante.
4. Copiar solo los hechos comunes iniciales.
5. Informar explícitamente si alguna causa no pudo crearse.
6. Permitir reintentar sin duplicar causas ya creadas.

No ocultar fallas parciales ni presentar el grupo como completo si falta una causa.

## 7. Privacidad y autorización

Validar en base de datos y Storage, no solo en la interfaz:

- el usuario pertenece al tenant del incidente;
- el usuario tiene un rol autorizado para leer o modificar documentos;
- una causa no puede apuntar a un incidente de otro tenant;
- un usuario sin acceso al establecimiento no puede listar ni abrir rutas grupales;
- una URL firmada no se guarda como autorización permanente;
- los documentos generados para una persona siguen siendo privados.

La vista grupal debe aplicar el mismo modo de privacidad existente para nombres y datos
personales.

## 8. Validación automatizada

Agregar pruebas para:

- construir correctamente rutas individuales y grupales;
- rechazar extensiones no permitidas, archivos vacíos y archivos sobre 10 MB;
- listar documentos propios y compartidos sin duplicados;
- mantener causas antiguas sin `incidente_id` funcionando;
- evitar que un documento compartido complete hitos de otras causas;
- impedir relaciones entre tenants;
- ocultar documentos compartidos a roles no autorizados;
- eliminar un documento compartido solo con confirmación y efecto global conocido.

Ejecutar:

```powershell
npm run typecheck
npm run test
npm run build:web
npm run test:a11y
npm run security-audit
git diff --check
```

Si se modifica más de un componente TSX, revisar también la lista de React best practices
disponible en el entorno.

## 9. Prueba manual de aceptación

Usar datos ficticios y comprobar:

1. Crear un incidente con tres estudiantes.
2. Confirmar tres expedientes separados.
3. Subir `acta-hallazgo.pdf` como documento compartido.
4. Verlo desde los tres expedientes y desde la vista grupal.
5. Subir `descargo-estudiante-a.pdf` como documento individual.
6. Confirmar que solo aparece en el expediente A.
7. Registrar una entrevista individual en cada causa.
8. Adjuntar una evidencia a un hito de la causa B.
9. Confirmar que el hito de A y C no se completa automáticamente.
10. Intentar abrir el documento con un usuario de otro tenant.
11. Eliminar el documento compartido y confirmar que desaparece para los tres.
12. Recargar la página y repetir la comprobación.

## 10. Despliegue

Orden recomendado:

1. Revisar la migración y sus políticas RLS.
2. Aplicar la migración en el entorno de prueba.
3. Ejecutar las validaciones SQL de tenant, Storage y roles.
4. Publicar la aplicación en preview.
5. Ejecutar la prueba manual completa en preview.
6. Aplicar la migración en producción.
7. Publicar producción.
8. Verificar estado `READY`, alias de producción, carga, listado, URL firmada y eliminación.
9. Confirmar logs sin errores de Storage ni RLS.

La publicación no se considera terminada con un build local o un deployment en estado
`BUILDING`.

## 11. Rollback

Si falla la interfaz o el flujo:

1. Detener la promoción.
2. Volver a la versión estable de la aplicación.
3. Mantener la migración aditiva y las columnas nuevas sin usarlas.
4. No borrar incidentes ni archivos grupales automáticamente.
5. Si una política Storage quedó incorrecta, corregirla primero para mantener los archivos
   inaccesibles hasta reparar la aplicación.
6. Repetir pruebas de acceso, listado y descarga antes de reintentar.

No ejecutar `DROP TABLE`, `DROP COLUMN` ni eliminación masiva de Storage como rollback.

## 12. Criterios de cierre

El trabajo queda cerrado cuando:

- una causa individual y un incidente grupal funcionan simultáneamente;
- los documentos propios y compartidos se distinguen claramente;
- el documento compartido se almacena una sola vez;
- RLS y Storage bloquean accesos entre tenants;
- los documentos personales no se comparten por accidente;
- los expedientes históricos siguen funcionando;
- pasan typecheck, tests, build, accesibilidad, auditoría y diff check;
- producción queda `READY` y el flujo se verifica con una prueba real controlada.
