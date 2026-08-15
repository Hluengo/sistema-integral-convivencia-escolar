# Runbook: Corrección de Auditoría Frontend — 2026-08-14

**Estado:** Ejecución parcial verificada  
**Alcance:** Frontend React, Supabase Auth desde el cliente, estado, caché, privacidad y rendimiento  
**Fuera de alcance:** `db push`, cambios de RLS, migraciones, API serverless, modelo de negocio y flujo de debido proceso

## 1. Objetivo

Corregir los hallazgos detectados en la auditoría integral del frontend, manteniendo:

- aislamiento por tenant y autorización server-side;
- las cinco fases del debido proceso y Mediación como subflujo opcional;
- el modo privacidad para nombres y RUT de NNA;
- los contratos actuales de servicios, rutas y documentos;
- compatibilidad con la aplicación de inasistencias que comparte proyecto Supabase.

## 2. Hallazgos y prioridad

| ID | Severidad | Hallazgo | Archivo principal |
| --- | --- | --- | --- |
| FE-01 | Alto | La caché de membresía no distingue usuario ni tenant | `src/shared/api/services/membership.service.ts`, `src/shared/api/hooks/useMemberships.ts` |
| FE-02 | Alto condicionado | Supabase Auth usa la `storageKey` por defecto | `src/shared/api/lib/supabase.ts` |
| FE-03 | Medio | La paleta de comandos muestra nombres completos con privacidad activa | `src/features/command-palette/CommandPalette.tsx` |
| FE-04 | Medio | Estudiantes y resumen de anotaciones se cargan sin paginación | `src/shared/api/services/courses.service.ts`, `annotations.service.ts` |
| FE-05 | Medio | El cliente Supabase no usa tipos generados del esquema | `src/shared/api/lib/supabase.ts` |
| FE-06 | Bajo | Documentos de notificación se cargan con `useEffect` en vez de React Query | `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx` |

## 3. Reglas de ejecución

- Trabajar únicamente sobre los archivos del bloque activo.
- No usar `git add -A`, `git reset --hard` ni revertir cambios ajenos.
- No modificar migraciones existentes ni ejecutar `db push`.
- No agregar dependencias nuevas.
- No confiar en permisos del frontend: la API y RLS siguen siendo la autoridad.
- No enviar nombres, RUT, anotaciones ni documentos a telemetría.
- Mantener headers SPDX en los archivos modificados.
- Crear tests junto con cada corrección no trivial.

## 4. Preparación y línea base

Desde la raíz del repositorio:

```powershell
git status -sb
npm run lint
npm test
npm run build:web
npm run check:bundle
```

Registrar el estado actual antes de editar. En el working tree actual ya existen cambios backend y de Supabase; no deben incluirse accidentalmente en un commit frontend.

Si `npm run test:coverage` vuelve a mostrar respuestas `403` donde los tests esperan `400`, aislar primero ese problema backend. No atribuirlo a una corrección frontend.

## 5. Orden de implementación

### Fase A — FE-01: caché de membresía — completada

Archivos:

- `src/shared/api/services/membership.service.ts`
- `src/shared/api/hooks/useMemberships.ts`

Acciones:

1. Cambiar la clave interna de caché a `applicationCode + userId + tenantId`.
2. Cambiar la `queryKey` de React Query para incluir `tenantId`.
3. Invalidar la caché cuando cambie usuario o tenant.
4. No aceptar una membresía cacheada como autorización del servidor.

Tests mínimos:

- mismo usuario en dos tenants no reutiliza la respuesta anterior;
- dos usuarios con el mismo `applicationCode` no comparten caché;
- cambio de sesión limpia estado de membresía.

Criterio de aceptación: con modo `transition` o `enforced`, la vista refleja únicamente la membresía del usuario y tenant actuales.

### Fase B — FE-02: aislamiento de sesión Auth — completada en código

Archivo:

- `src/shared/api/lib/supabase.ts`

Acciones:

1. Configurar una clave propia:

```ts
storageKey: import.meta.env.VITE_SUPABASE_AUTH_STORAGE_KEY ?? 'convivencia-auth-token'
```

2. Documentar `VITE_SUPABASE_AUTH_STORAGE_KEY=convivencia-auth-token` en `.env.example`.
3. Confirmar una clave distinta en `registroinasistencia`.
4. No borrar todo `localStorage`; solicitar nuevo inicio de sesión de forma controlada.

Validación:

- cerrar sesión local y volver a iniciar sesión;
- recargar la aplicación y confirmar persistencia;
- comprobar que no se reutiliza el refresh token de la otra aplicación;
- revisar que la clave no contenga secretos.

Nota operativa: este cambio puede requerir que las personas usuarias vuelvan a iniciar sesión. No requiere migración ni `db push`.

### Fase C — FE-03: privacidad en paleta de comandos — completada en código

Archivos:

- `src/app/App.tsx`
- `src/features/command-palette/CommandPalette.tsx`

Acciones:

1. Pasar `privacyMode` a `CommandPalette`.
2. Mostrar `nnaProtectedName` o `maskName(...)` cuando esté activo.
3. Mantener la búsqueda funcional sobre los datos internos, sin renderizarlos en la interfaz.
4. Revisar también `aria-label`, `aria-activedescendant` y resultados de teclado.

Tests mínimos:

- privacidad activa no muestra nombre completo en texto visible ni etiquetas accesibles;
- privacidad desactivada conserva la búsqueda y navegación actuales;
- `Ctrl/Cmd + K`, flechas, Enter y Escape siguen funcionando.

### Fase D — FE-04: paginación de estudiantes y anotaciones — completada

Archivos candidatos:

- `src/shared/api/services/courses.service.ts`
- `src/shared/lib/hooks/useStudentsQuery.ts`
- `src/shared/api/services/annotations.service.ts`
- `src/features/anotaciones/AnotacionesView.tsx`
- `src/features/students/StudentsPanel.tsx`

Acciones:

1. Medir primero el tamaño real de las listas en producción.
2. Convertir las consultas grandes a `useInfiniteQuery` o RPC paginada.
3. Mantener búsqueda y filtros server-side cuando el conjunto supere una página.
4. Definir límites explícitos; no usar `select('*')`.
5. Para exportaciones, solicitar explícitamente el alcance completo y mostrar estado de carga.
6. No introducir virtualización hasta demostrar que la paginación no resuelve el problema.

Estado verificado: el proyecto remoto tiene 808 estudiantes, 40 cursos y 1.129
anotaciones. Estudiantes usa páginas PostgREST de 200 filas y el resumen usa la
nueva RPC `get_student_annotation_summary_page(limit, offset)`, con total exacto.
La migración está preparada en `supabase/migrations/20260815025824_paginate_student_annotation_summary.sql`.
La migración fue aplicada al proyecto remoto y los tipos Supabase fueron regenerados.

Criterio de aceptación: la primera pantalla no descarga todos los estudiantes ni todas las anotaciones del tenant.

### Fase E — FE-05: tipos Supabase — completada

Acciones:

1. Generar tipos desde el proyecto vinculado, sin aplicar SQL:

```powershell
supabase gen types typescript --linked > src/shared/api/lib/database.types.ts
```

2. Parametrizar `createClient<Database>(...)`.
3. Corregir errores de nombres de columnas, RPCs y relaciones.
4. No editar manualmente el archivo generado salvo que exista una decisión documentada.

Validación: `npm run typecheck`, tests de servicios y `npm run build:web`.

Estado verificado: tipos generados desde el proyecto vinculado en
`src/shared/api/lib/database.types.ts`; el cliente usa `createClient<Database>`.

### Fase F — FE-06: documentos de notificación — completada en código

Archivos:

- `src/features/causas/notificacionDocgen/CausaNotificationPanel.tsx`
- `src/shared/api/services/causaDocuments.service.ts`

Acciones:

1. Mover `fetchCausaDocuments(causa.id)` a un hook React Query.
2. Usar una clave por tenant y causa.
3. Invalidar la consulta después de crear, guardar, marcar como notificada o anular.
4. Eliminar el estado local duplicado solo después de comprobar que no se pierde el snapshot en edición.

Criterio de aceptación: cambiar de causa no muestra documentos de la causa anterior y las mutaciones actualizan la vista sin recarga manual.

## 6. Validación por fase

Después de cada fase:

```powershell
npm run lint
npm test
npm run build:web
git diff --check
```

Validación final:

```powershell
npm run test:a11y
npm run test:e2e
npm run check:bundle
npm run knip
npm run security-audit
git status -sb
```

Casos funcionales obligatorios:

1. Login, recarga y logout.
2. Cambio de tenant con el mismo usuario superadmin.
3. Modo privacidad en Expedientes, Anotaciones, Estudiantes y paleta de comandos.
4. Búsqueda y exportación con listas grandes.
5. Abrir un expediente, editarlo y volver a abrirlo.
6. Crear, guardar y anular la notificación de inicio.
7. Deep-link `/expedientes/:id`.
8. Sesiones simultáneas con la aplicación de inasistencias.

## 7. Rollback

- FE-01: restaurar la clave anterior solo en código local y limpiar la caché React Query; no reparar el ledger Supabase.
- FE-02: revertir `storageKey` y solicitar reautenticación; no borrar almacenamiento de otros productos.
- FE-03: retirar solo el prop y masking de la paleta si rompe navegación; conservar privacidad en las demás vistas.
- FE-04: volver temporalmente a la consulta anterior con límite explícito mientras se corrige el paginador.
- FE-05: retirar temporalmente la parametrización de tipos si el esquema remoto no está disponible; conservar los tipos generados para revisión.
- FE-06: restaurar la lectura anterior solo con un commit correctivo y repetir E2E del flujo documental.

En todos los casos, revertir únicamente los archivos de la fase afectada y preservar cambios ajenos del working tree.

## 8. Cierre

El runbook se considera completado cuando:

- los seis hallazgos tienen estado cerrado o una excepción documentada;
- lint, tests, build, accesibilidad y E2E pasan;
- no quedan nombres completos expuestos con privacidad activa;
- las cachés están separadas por usuario y tenant;
- el diff contiene únicamente código frontend, tests y documentación asociada;
- no se ejecutó ninguna migración ni `db push` como parte de estas correcciones.
