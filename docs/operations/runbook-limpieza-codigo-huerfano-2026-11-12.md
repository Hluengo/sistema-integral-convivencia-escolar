# Runbook: limpieza de código huérfano y cierre de hallazgos

**Fecha:** 2026-11-12
**Base:** `0dd73417` (árbol limpio, sin cambios locales)
**Alcance:** eliminar código de producción sin llamadores, exports sin uso y configuración obsoleta detectados en la auditoría del 2026-11-12.
**Estado:** L1–L4 ejecutados y verificados; L5–L9 pendientes de decisión/autorización humana.
**Audiencia:** cualquier modelo o persona. Cada paso indica archivos exactos, comando de verificación y criterio para avanzar.

---

## 0. Reglas duras para el ejecutor

1. Ejecuta **un lote por commit**. No mezcles lotes.
2. Antes de borrar cualquier símbolo, confirma que nadie lo usa:
   `git grep -n "<simbolo>" -- src server` (incluye tests).
3. No toques base de datos, migraciones, Supabase remoto, Vercel ni variables de entorno reales.
4. No imprimas ni escribas secretos. No leas `.env.local` para copiar valores.
5. No edites `api/index.js` a mano: es generado por `npm run build`.
6. No reformatees archivos completos ni cambies estilo. Solo las líneas indicadas.
7. No agregues dependencias.
8. No borres archivos fuera del inventario de este documento.
9. Si un gate falla dos veces seguidas, **detente** y registra el error. No improvises una corrección estructural.
10. Si el árbol tiene cambios sin commitear al empezar, detente y pide instrucciones.
11. Todo lo que diga **REQUIERE DECISIÓN** se pregunta al humano antes de ejecutar.

---

## 1. Objetivo y límites

**Objetivo:** dejar el repositorio sin código muerto verificable, sin cambiar comportamiento visible para usuarios.

**Dentro del alcance:**

- Exports y tipos sin uso (Knip).
- Helpers cuyos consumidores fueron borrados en `76f935a8` y `ab02acdc`.
- Endpoints sin cliente en `src/` ni llamadas históricas.
- Configuración de Knip obsoleta.

**Fuera del alcance:**

- Refactors de arquitectura, renombres, cambios de UI.
- Migraciones SQL y datos.
- Cambios de comportamiento en producción (ver Paso 8).
- Archivos de datos personales en la raíz (ver Paso 9).

---

## 2. Evidencia de partida

Comandos que produjeron el inventario (repetirlos al iniciar):

```bash
git rev-parse HEAD
npm run knip
npm run knip:ci
npx tsc --noEmit
npx eslint .
```

Salida esperada en `0dd73417`:

| Señal     | Resultado esperado                                              |
| --------- | --------------------------------------------------------------- |
| `knip`    | 12 exports sin uso, 5 tipos sin uso, 3+2 hints de configuración |
| `knip:ci` | 0 archivos y 0 dependencias sin uso, 5 hints                    |
| `tsc`     | sin errores                                                     |
| `eslint`  | sin errores                                                     |

Inventario a eliminar:

| Lote | Qué                                                                                                                                              | Evidencia                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| L1   | `DetailModalSkeleton` + `BULK_QUERY_MAX_ROWS` + `StudentCandidate` + `sanitizeForAI`; se conservan los re-exports públicos del barrel de schemas | Salida de Knip + contract test del barrel                              |
| L2   | `decisionFundada.ts` (102), `semaforo.ts` (76), `seguimientoPlazo.ts` (17), `expedienteBuilders.ts` (315) y sus tests                            | Grafo de imports: 0 importadores vivos; paneles borrados en `76f935a8` |
| L3   | `/pilot/membership-check` (26), `/usage/events` (~67)                                                                                            | `git log -S` sobre `src/`: nunca tuvieron cliente                      |
| L4   | `/notificaciones/citacion` (~91)                                                                                                                 | Cliente eliminado en `ab02acdc`                                        |
| L5   | `/audit-due-process` (253)                                                                                                                       | Panel eliminado en `76f935a8`; solo lo llaman tests                    |
| L6   | Pipeline `/draft-document` (`draft.ts` 509, `gemini.ts` 88, `draftDocument.schema.ts` 50)                                                        | Panel `DraftPanel.tsx` eliminado en `76f935a8`                         |
| L7   | 5 hints de configuración en `package.json`                                                                                                       | Salida de `npm run knip:ci`                                            |

---

## 3. Preparación

```bash
git status --porcelain          # debe estar vacío
git checkout -b chore/limpieza-huerfanos-2026-11-12
npm ci
npm run lint                    # baseline: debe pasar
npm run test                    # anotar cantidad de tests y resultado
npm run build                   # baseline: debe pasar
```

Registra en la tabla del Paso 10: SHA base, cantidad de tests, resultado de cada comando.

**Gate de preparación:** no continúes si `lint`, `test` o `build` fallan antes de tocar nada.

---

## 4. Lotes

### L1 — Exports y tipos sin uso

**Riesgo:** mínimo. No cambia comportamiento.

**Archivos y acciones:**

1. `src/shared/Skeleton.tsx`: elimina la función `DetailModalSkeleton` completa (~25 líneas).
2. `src/shared/lib/schemas/index.ts`: conserva todos sus re-exports. El contract test del barril los exige aunque Knip los marque como no usados por importación directa.
   No eliminar los valores ni tipos de este barrel.
3. `server/api/validators/sanitizers.ts`: elimina `sanitizeForAI` de la lista de re-export.
4. `server/lib/bulkDisciplinaryPdf.ts`: elimina la línea `export const BULK_QUERY_MAX_ROWS = 1000;`.
5. `src/features/anotaciones/disciplinaryDraft.ts`: elimina el tipo `StudentCandidate` (la constante `studentCandidateSchema` se conserva porque se usa en el objeto de la línea 31).

**Antes de editar:**

```bash
git grep -n "DetailModalSkeleton\|BULK_QUERY_MAX_ROWS\|StudentCandidate\|sanitizeForAI" -- src server
```

Cada coincidencia debe estar en el archivo de definición, en el barrel que vas a editar o en un test que también vas a ajustar. Si aparece un consumidor vivo, **no borres**: registra el hallazgo y pasa al siguiente ítem.

**Verificación:**

```bash
npm run lint && npm run test && npm run build && npm run knip
```

**Avance:** `knip` ya no lista esos símbolos; todo lo demás sigue verde.

---

### L2 — Helpers huérfanos de la auditoría de octubre

**Archivos a borrar:**

```text
src/shared/lib/decisionFundada.ts
src/shared/lib/decisionFundada.test.ts
src/shared/lib/semaforo.ts
src/shared/lib/semaforo.test.ts
src/shared/api/services/seguimientoPlazo.ts
src/features/causas/expediente/expedienteBuilders.ts
src/features/causas/expediente/expedienteBuilders.test.ts
```

**Antes de borrar:**

```bash
git grep -n "decisionFundada\|semaforo\|seguimientoPlazo\|expedienteBuilders" -- src server scripts tests
```

Solo deben aparecer el propio archivo, su test y este runbook. Cualquier otro importador cancela el lote y se registra.

**Verificación:** la misma de L1.

**Avance:** `npm run test` baja en la cantidad de tests de esos 4 archivos; `build` sigue verde.

---

### L3 — Endpoints que nunca tuvieron cliente

**Archivos:**

1. Borra `server/api/routes/pilot.ts`.
2. Borra `server/api/routes/__tests__/pilot.test.ts`.
3. En `server/api/routes/usage.ts`, elimina el bloque `router.post("/usage/events", ...)` completo (desde la línea del `router.post` hasta su cierre, antes de `router.get("/usage/stats"`). Conserva `/usage/stats`.
4. Elimina de `usage.ts` los helpers que queden sin uso (`EVENT_NAME_RE`, `hasSafeProperties` y sus tipos). Verifícalo con:

```bash
git grep -n "EVENT_NAME_RE\|hasSafeProperties" -- server
```

5. Quita el import y el `app.use("/api", pilotRoutes)` de **ambos** entrypoints:
   - `server/index.ts`
   - `server/api/index.ts`

**Verificación:** la misma de L1.

**Avance:** el build no debe mencionar `pilotRoutes`; `/api/usage/stats` sigue respondiendo en los tests existentes.

---

### L4 — Endpoint de citación

**Archivo:** `server/api/routes/notificaciones.ts`.

1. Elimina el handler `router.post("/notificaciones/citacion", ...)` (líneas 94–184 en `0dd73417`).
2. Conserva `router.post("/notificaciones/documento", ...)`.
3. Revisa si `isValidCitacionEmail` y `getCitacionEmailDomain` quedan sin uso:

```bash
git grep -n "isValidCitacionEmail\|getCitacionEmailDomain" -- src server
```

Si solo los usan tests, bórralos junto con sus casos en `server/api/routes/notificaciones.test.ts`.

4. Actualiza `src/lib/api.test.ts`, bloque `describe("POST /api/notificaciones")`:
   - elimina las aserciones contra `/api/notificaciones/citacion`;
   - conserva las de `/api/notificaciones/documento`.

**Verificación:** L1 + `git grep -n "notificaciones/citacion" -- src server tests`.

**Avance:** solo quedan referencias en documentación histórica o ninguna.

---

### L5 — Endpoint de auditoría de debido proceso

**REQUIERE DECISIÓN:** confirmar que no se expondrá como API pública ni se reconectará a la UI.

**Archivos:**

1. Borra `server/api/routes/audit.ts`.
2. Quita import y `app.use("/api", auditRoutes)` de `server/index.ts` y `server/api/index.ts`.
3. Actualiza:
   - `src/lib/api.test.ts`: elimina `describe("POST /api/audit-due-process")` (líneas 210–237).
   - `server/api/routes/aiPrivacy.integration.test.ts`: elimina el caso que llama `post("/audit-due-process", ...)`.
   - `tests/backend-e2e-review.spec.ts`: elimina la entrada `"/api/audit-due-process"` de `protectedRequests`.
4. `server/api/services/gemini.ts` **no se borra aquí**: todavía lo usa `draft.ts` (L6).
5. `server/api/services/legalSources.ts` se conserva: lo usa `advisor.ts`.

**Verificación:** L1 + `npm run test:e2e -- tests/backend-e2e-review.spec.ts` si el entorno permite levantar el servidor; si no, registrar que no se ejecutó.

---

### L6 — Pipeline de borradores con Gemini

**REQUIERE DECISIÓN:** elegir una opción y registrarla.

- **Opción A (recomendada si no hay fecha para reconectar):** borrar.
- **Opción B:** conservar y documentar en el runbook A10 como trabajo pendiente. Si eliges B, no ejecutes este lote y pasa a L7.

**Si eliges A:**

1. Borra:

```text
server/api/routes/draft.ts
server/api/routes/draft.test.ts
server/api/services/gemini.ts
server/api/services/gemini.test.ts
server/api/validators/draftDocument.schema.ts
server/api/validators/draftDocument.schema.test.ts
```

2. Quita import y `app.use("/api", draftRoutes)` de `server/index.ts` y `server/api/index.ts`.
3. Actualiza:
   - `src/lib/api.test.ts`: elimina `describe("POST /api/draft-document")` (líneas 239–272).
   - `server/api/routes/aiPrivacy.integration.test.ts`: elimina el caso que llama `post("/draft-document", ...)`.
   - `tests/backend-e2e-review.spec.ts`: elimina la entrada `"/api/draft-document"` de `protectedRequests`.
   - `src/features/causas/causasListLayout.test.ts`: elimina el bloque que lee `server/api/routes/draft.ts` y sus asserts (alrededor de las líneas 360–372).
4. Elimina de `.env.example` las líneas `GEMINI_API_KEY` y `LEGAL_DRAFT_MODEL`.
5. Ejecuta `npm run knip` y elimina solo lo que quede huérfano por este lote (por ejemplo, exports de `cache.ts` o `legalSources.ts` que ya no se usen). No borres `legalSources.ts` si `advisor.ts` lo importa.

**Verificación:** L1 + `git grep -n "gemini\|draft-document\|LEGAL_DRAFT_MODEL" -- src server .env.example`.

**Avance:** el advisor sigue funcionando y sus tests pasan.

---

### L7 — Configuración de Knip

**Archivo:** `package.json`.

Quita de `knip.ignore` las entradas que ya no corresponden y de `knip.ignoreDependencies`/`ignoreBinaries` las que Knip marque como hint:

- `committed-lf.js`
- `rebuilt-lf.js`
- `src/shared/api/lib/database.types.ts`
- `@lhci/cli` (si `npm run knip:ci` deja de marcarlo)
- `gitleaks`

**Verificación:**

```bash
npm run knip:ci
```

**Avance:** `knip:ci` termina sin hints. Si un ignore sigue siendo necesario, restáuralo y anota el motivo.

---

### L8 — Rate limit en producción

**REQUIERE DECISIÓN Y AUTORIZACIÓN.** Cambia comportamiento de arranque.

**Archivo:** `server/config/runtime.ts`.

Hoy `ensureRuntimeConfig()` solo advierte si falta `UPSTASH_REDIS_REST_URL`. En Vercel cada instancia tiene su propio `Map`, así que el límite no se comparte.

**Acción propuesta:** agregar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a `missing` cuando `NODE_ENV === "production"`, igual que ya se hace con `SUPABASE_SERVICE_ROLE_KEY`.

**Verificación:** `npm run lint && npm run test && npm run build`. Confirmar en Vercel que ambas variables existen **antes** de desplegar.

**Si no hay autorización:** no ejecutes el lote; deja el hallazgo abierto.

---

### L9 — Archivos de datos personales en la raíz

**REQUIERE DECISIÓN.** No es código.

Archivos presentes y ya ignorados por git (verificado: nunca fueron comiteados):

```text
Profesores.xlsx
listado_estudiantes_4_medio_sin_exclusiones.xlsx
Derivacion_pendientes.xlsx
Informes_conductuales_pedagogicos_2026.docx
correos_citacion.json
envio_citaciones_20261029.json
```

**Acción:** moverlos fuera del repositorio (por ejemplo, a una carpeta privada del usuario). **No borrarlos** sin confirmación.

**Verificación:** `git status --porcelain` sigue vacío y los archivos ya no están en la raíz.

---

## 5. Decisiones que requieren humano (parar y preguntar)

| Punto | Pregunta exacta                                                         |
| ----- | ----------------------------------------------------------------------- |
| L5    | ¿`/audit-due-process` se reconectará a la UI o se elimina?              |
| L6    | ¿El pipeline de borradores se elimina o se conserva como pendiente A10? |
| L8    | ¿Se exige Upstash en producción y se aborta el arranque si falta?       |
| L9    | ¿Se mueven los archivos de datos personales fuera del repo?             |

Sin respuesta, el ejecutor se detiene en ese lote y continúa con los siguientes solo si son independientes.

---

## 6. Verificación final

```bash
npm run lint
npm run test
npm run build
npm run knip
npm run knip:ci
npm run check:bundle
git status --porcelain
```

Esperado:

- `lint`, `test`, `build`: exit 0.
- `knip`: sin exports ni tipos sin uso.
- `knip:ci`: sin archivos ni dependencias sin uso; quedan 9 re-exports/4 tipos públicos intencionales y 3 hints de configuración documentados.
- `check:bundle`: dentro de 650 KiB por archivo y 3 MiB total.
- `git status`: solo los archivos modificados en los lotes ejecutados.

Si no se ejecutó una validación (por ejemplo Playwright), se registra el motivo y **no** se presenta como aprobada.

---

## 7. Registro de ejecución

Completar por lote:

| Lote        | Commit     | Archivos | Tests antes | Tests después | lint | test | build | knip                              | Notas                                                                                                                                               |
| ----------- | ---------- | -------- | ----------- | ------------- | ---- | ---- | ----- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preparación | `0dd73417` | 0        | —           | 1.066/1.066   | ✅   | ✅   | ✅    | base                              | Árbol limpio confirmado; no se modificó producción.                                                                                                 |
| L1          | `89a6daab` | 4        | 1.066/1.066 | 1.066/1.066   | ✅   | ✅   | ✅    | 9 exports + 4 tipos intencionales | Se retiraron `DetailModalSkeleton`, `BULK_QUERY_MAX_ROWS`, `StudentCandidate` y `sanitizeForAI`; se conservaron los re-exports públicos del barrel. |
| L2          | `058e7f74` | 8        | 1.066/1.066 | 1.040/1.040   | ✅   | ✅   | ✅    | sin hallazgos nuevos              | Se retiraron helpers huérfanos y sus tests; el test de `seguimientoPlazo` fue incluido tras detectar su único importador.                           |
| L3          | `defca497` | 7        | 1.040/1.040 | 1.037/1.037   | ✅   | ✅   | ✅    | sin hallazgos nuevos              | Se retiraron `/pilot/membership-check` y `/usage/events`, ajustando registros y tests.                                                              |
| L4          | `54d153c2` | 4        | 1.037/1.037 | 1.037/1.037   | ✅   | ✅   | ✅    | sin hallazgos nuevos              | Se retiró `/notificaciones/citacion`; se conservaron validadores/transporte compartidos por `/notificaciones/documento`.                            |
| L5          |            |          |             |               |      |      |       |                                   |                                                                                                                                                     |
| L6          |            |          |             |               |      |      |       |                                   |                                                                                                                                                     |
| L7          |            |          |             |               |      |      |       |                                   |                                                                                                                                                     |
| L8          |            |          |             |               |      |      |       |                                   |                                                                                                                                                     |
| L9          |            |          |             |               |      |      |       |                                   |                                                                                                                                                     |

Formato de commit sugerido: `chore(limpieza): <lote> - <qué se elimina>`.

---

## 8. Reversión

- Un lote con commit: `git revert <sha>`.
- Un lote sin commit: `git restore <archivos>` o `git checkout -- <archivos>`.
- Nunca uses `git reset --hard` si hay trabajo local sin commitear.
- Si se ejecutó L8 y el arranque falla por variables faltantes: revertir el commit y verificar el entorno antes de reintentar.

---

## 9. Criterios de cierre

1. `knip` y `knip:ci` sin hallazgos.
2. `lint`, `test` y `build` verdes en el último lote.
3. Ningún archivo del inventario queda sin decisión registrada (ejecutado o conservado con motivo).
4. `git grep` de cada símbolo borrado no devuelve consumidores.
5. Documentación afectada actualizada (`.env.example`, este runbook, runbook A10 si aplica).
6. Sin cambios en base de datos, secretos ni entorno remoto.
