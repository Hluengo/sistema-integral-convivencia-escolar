/** @license SPDX-License-Identifier: Apache-2.0 */

# Runbook: retiro de mejora de texto con IA

Fecha: 2026-08-24
Alcance: retirar la función específica de **Mejorar redacción con IA**.

## Objetivo

Eliminar el botón y el flujo de mejora automática de textos en formularios y
en el Asesor Legal, junto con su endpoint, servicios específicos,
configuración y pruebas.

Se mantienen sin cambios:

- Asesor Legal (`/api/advisor-chat`).
- Auditoría de debido proceso.
- Generación de documentos oficiales.
- Procesamiento de PDF y sus flujos asociados.
- Gemini y OpenRouter cuando sean utilizados por esas funciones restantes.

No se requiere migración Supabase ni modificación de datos existentes.

## Estado previo obligatorio

Antes de editar:

```powershell
git status --short --branch
git diff --stat
```

El árbol actualmente contiene cambios no relacionados en `api/index.js`,
componentes de cartas, `cartas.service.ts`, una migración y `.vite/`. No deben
ser revertidos, mezclados ni incluidos en la publicación del retiro.

## Inventario de retiro

### Interfaz

Eliminar el componente compartido `src/shared/ImproveTextarea.tsx` y
reemplazar sus usos por el campo de texto equivalente, conservando etiquetas,
validación, estilos, `maxLength` y comportamiento de guardado en:

- `src/features/causas/ui/NewCausaForm.tsx`
- `src/features/causas/EditCausaModal/EditCausaModalForm.tsx`
- `src/features/causas/ForceCloseCausaDialog.tsx`
- `src/features/timeline/RegistrationForm.tsx`
- `src/features/timeline/ChecklistProgressPanel.tsx`
- `src/shared/ui/HistoryEntryForm.tsx`

En `src/features/ai-advisor/AiAdvisor.tsx`, eliminar solamente el botón de
mejora de redacción, su estado, sus handlers y su mensaje de error. El envío
normal de consultas debe permanecer operativo.

### Cliente y backend

Eliminar:

- `src/shared/lib/hooks/useTextImprovement.ts`
- `server/api/routes/improve.ts`
- `server/api/services/textImprovement.ts`

Desmontar la ruta `/api/improve-text` desde:

- `server/index.ts`
- `server/api/index.ts`

No editar manualmente `api/index.js`; se debe regenerar con el build.

### Proveedores y configuración

Eliminar del código y documentación la configuración exclusiva de mejora:

- `TEXT_IMPROVEMENT_GEMINI_MODEL`
- `TEXT_IMPROVEMENT_PROVIDER`
- `TEXT_IMPROVEMENT_AI_MODEL`

Eliminar también las funciones y constantes específicas de mejora en:

- `server/api/services/gemini.ts`
- `server/api/services/openrouter.ts`

Conservar `GEMINI_API_KEY`, `LEGAL_DRAFT_MODEL` y `OPENROUTER_API_KEY` si
continúan siendo utilizados por documentos, auditoría o asesoría legal.

Actualizar:

- `.env.example`
- `docs/DEPLOY.md`
- `docs/DESARROLLO.md`
- `docs/architecture/backend.md`
- `docs/architecture/02-backend.md`

## Secuencia de implementación

1. Confirmar el estado previo y separar mentalmente los cambios no relacionados.
2. Reemplazar los usos de `ImproveTextarea` por campos de texto normales.
3. Retirar la mejora del `AiAdvisor`, sin alterar `/api/advisor-chat`.
4. Eliminar hook, endpoint, servicio de mejora y montajes de ruta.
5. Limpiar las funciones y variables exclusivas de mejora en proveedores.
6. Eliminar las pruebas específicas del endpoint y del proveedor de mejora.
7. Actualizar `.env.example` y la documentación.
8. Ejecutar el build para regenerar `api/index.js`.
9. Revisar que el bundle no conserve `/api/improve-text` ni los imports retirados.

## Criterios de aceptación

```powershell
rg -n -i --glob '!node_modules/**' --glob '!package-lock.json' `
  "ImproveTextarea|useTextImprovement|improve-text|TEXT_IMPROVEMENT" `
  src server api .env.example docs
```

El comando no debe encontrar referencias funcionales. Las menciones históricas
en este runbook pueden permanecer.

Validar que:

- ningún formulario muestra el botón **Mejorar**;
- los textos se pueden escribir, editar y guardar normalmente;
- el Asesor Legal permite escribir y enviar consultas;
- `/api/advisor-chat` continúa registrado;
- no existe `/api/improve-text` en el bundle generado;
- no se modificaron migraciones ni tablas Supabase;
- los cambios no relacionados siguen presentes y fuera del commit.

## Validación técnica

```powershell
npm run typecheck
npm run test
npm run build
npm run check:bundle
git diff --check
```

Si `npm run test` falla en una prueba preexistente no relacionada, registrar el
nombre exacto y separar esa falla del resultado del retiro.

## Validación manual mínima

Probar con un usuario autenticado:

1. Crear una causa y guardar el relato.
2. Editar observaciones de una causa.
3. Registrar un hito y una entrada de bitácora.
4. Abrir el cierre forzado y comprobar el campo de motivo.
5. Abrir el Asesor Legal, escribir una consulta y enviarla.
6. Confirmar que no se realizan solicitudes a `/api/improve-text` en la pestaña
   Network del navegador.

## Publicación

Antes de hacer commit, revisar únicamente los archivos intencionados:

```powershell
git status --short
git diff --stat
git diff --check
```

Agregar archivos explícitamente. No usar `git add -A` porque el árbol contiene
cambios y artefactos no relacionados.

Después del commit y push:

```powershell
git rev-parse HEAD
git ls-remote origin refs/heads/master
```

Esperar que Vercel quede en estado `READY`, verificar el alias de producción y
comprobar `/api/health`. La publicación solo se considera completa cuando el
SHA remoto, el deployment y la salud de producción coinciden.

## Rollback

Si el retiro rompe el guardado de formularios o el Asesor Legal:

1. Detener la promoción del deployment nuevo.
2. Volver al deployment anterior conocido como `READY`.
3. No revertir los cambios no relacionados del árbol de trabajo.
4. Revisar el diff del retiro y corregir únicamente el flujo afectado.

El rollback no requiere restaurar datos ni ejecutar SQL.
