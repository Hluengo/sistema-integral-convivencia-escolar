# Auditoría de skills, plugins y MCP

**Fecha:** 2026-09-07
**Proyecto:** `sistema-integral-convivencia-escolar`

## Inventario

Se encontraron **244 archivos físicos `SKILL.md`**:

| Capa              | Ubicación                       | Cantidad | Estado                                                  |
| ----------------- | ------------------------------- | -------: | ------------------------------------------------------- |
| Codex global      | `C:\Users\heae2\.codex\skills`  |       54 | Útiles según tarea; revisar duplicados del sistema      |
| Gortex global     | `C:\Users\heae2\.agents\skills` |       21 | Conservar; operaciones graph-first distintas            |
| Gortex del repo   | `.agents/skills`                |       34 | Conservar proceso; depurar áreas superpuestas           |
| Copias Gortex     | `.github/skills`                |       20 | Duplicadas funcionalmente de `.agents/skills`           |
| OpenCode local    | `skills/`                       |        5 | Conservar; contienen patrones del proyecto              |
| Plugins cacheados | `.codex/plugins/cache`          |      110 | Capacidades de plugins; no contar adaptadores repetidos |

Los 20 skills comunes entre `.agents/skills` y `.github/skills` son copias funcionales bilingües: mismo nombre, alcance y métricas, con diferencias principalmente de idioma.

## Conservar

- Skills locales: `arquitectura-claude`, `optimizacion-tokens`, `react-supabase`, `verificacion` y `memoria-contexto`.
- Skills de proceso del repo: `archify`, `code-review`, `composio`, `diagnosing-bugs`, `frontend-design`, `grill-with-docs`, `implement`, `improve-codebase-architecture`, `od-data-report`, `od-design-review`, `setup-matt-pocock-skills`, `tdd`, `to-spec` y `to-tickets`.
- Las 21 skills globales de Gortex. Pares como `gortex-debug`/`gortex-incident-investigation`, `gortex-explore`/`gortex-onboarding`, `gortex-pr-review`/`gortex-pr-review-agent` y `gortex-impact`/`gortex-safe-edit` son complementarios, no duplicados exactos.
- Integraciones explícitas: Gmail, Google Calendar, Google Drive, OpenAI Templates, Deep Research, Indeed y LinkedIn.

## Duplicados

| Grupo                                                | Diagnóstico                                     | Acción recomendada                                        |
| ---------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| `.agents/skills` ↔ `.github/skills`                  | 20 copias funcionales bilingües                 | Elegir una ubicación canónica y conservar una sola fuente |
| `connect` ↔ `connect-apps`                           | Misma finalidad: conectar apps con Composio CLI | Conservar `connect` y retirar la copia redundante         |
| `skill-creator` global ↔ `.system/skill-creator`     | Misma finalidad                                 | Preferir la versión `.system`                             |
| `skill-installer` global ↔ `.system/skill-installer` | Misma finalidad                                 | Preferir la versión `.system`                             |
| Ponytail en adaptadores                              | Un plugin con manifestos para varios runtimes   | Contarlo como un solo plugin                              |

## Solapamientos que requieren revisión

Las skills Gortex generadas cubren áreas anidadas:

- `gortex-features-timeline-22-dirs` / `gortex-features-timeline-28-dirs`.
- `gortex-api-services-fn` / `gortex-api-services-11-dirs` / `gortex-api-services-22-dirs`.
- `gortex-lib-hooks-7-dirs-usenewcausamodalcontroller` / `gortex-lib-hooks-8-dirs`.
- `gortex-11-dirs` / `gortex-8-dirs` frente a skills específicas.

Se recomienda conservar la versión amplia y solo mantener las estrechas que tengan uso demostrado o contexto superior. Antes de retirar una se deben revisar referencias por nombre y qué runtime la carga.

`code-review`, `gh-address-comments`, `gh-fix-ci`, `pr-review-ci-fix`, `gortex-pr-review` y `ponytail-review` comparten tema, pero no función exacta. Igual ocurre con `create-plan`, `to-spec`, `to-tickets`, `implement` y `tdd`, que forman una cadena de trabajo.

## MCP y plugins

### Codex

`C:\Users\heae2\.codex\config.toml` configura `gortex` y `notebooklm`. Son complementarios.

### OpenCode

[`opencode.json`](../opencode.json) declara 10 servidores:

- Habilitados: `contexto-docs`, `gortex`, `playwright`, `supabase`.
- Deshabilitados por duplicación o fallo: `fetch`, `github`, `markitdown`, `chrome-devtools`, `sistema-archivos` y `dbx`.

La configuración actual ya evita procesos y herramientas redundantes. No se recomienda reactivar esos seis sin una necesidad concreta.

Los plugins cacheados con capacidad propia son Airtable, Deep Research, Figma, Google Drive, OpenAI Templates, Plugin Management, Supabase, Vercel y Ponytail. GitHub está disponible en cache, pero el repo usa `gh` CLI y el MCP de GitHub está deshabilitado.

## Plan de limpieza

1. Elegir `.agents/skills` o `.github/skills` como fuente única para los 20 skills Gortex comunes.
2. Consolidar `skill-creator`, `skill-installer` y `connect`/`connect-apps` tras revisar referencias.
3. Reducir las skills Gortex generadas solo después de comprobar carga y uso real.
4. Mantener deshabilitados `fetch`, `github`, `markitdown`, `chrome-devtools`, `sistema-archivos` y `dbx`.
5. Preservar Gmail, Calendar, Drive, Templates, Deep Research, Indeed y LinkedIn.
6. Después de cualquier limpieza, listar skills cargadas por cada runtime y ejecutar la verificación del repositorio.

## Criterio de aceptación

Una limpieza posterior estará correcta cuando cada skill duplicada tenga una sola fuente, los nombres referenciados sigan resolviendo, los MCP deshabilitados permanezcan apagados y las integraciones explícitas continúen disponibles. Este informe no elimina ni desactiva archivos por sí mismo.
