# Runbook: mejoras con proyectos open source (tests de componente y RLS)

**Fecha:** 2026-11-13
**Base:** `8e380541` (árbol limpio, sin cambios locales)
**Alcance:** cerrar el hueco de tests de componente (0 archivos `.tsx` de test sobre 110) y formalizar las pruebas de RLS con pgTAP. Opcional y diferido: piezas puntuales de shadcn/ui.
**Estado:** no ejecutado. Este documento es el plan; los lotes se ejecutan uno por commit.
**Audiencia:** cualquier modelo o persona. Cada paso indica archivo exacto, comando y criterio para avanzar.

---

## 0. Protocolo para el ejecutor

1. Lee el runbook completo antes de tocar nada. No ejecutes pasos fuera de orden.
2. **Un lote = un commit.** No mezcles L1, L2 y L3.
3. Usa los comandos tal como están escritos. Si un comando no existe en este repo, **detente** y regístralo; no inventes uno equivalente.
4. No declares un gate aprobado sin pegar la salida real del comando.
5. Si un gate falla dos veces seguidas, detente y registra el error. No improvises una corrección estructural.
6. Todo lo marcado **REQUIERE DECISIÓN** se pregunta al humano antes de ejecutar.
7. Si `git status --porcelain` no está vacío al empezar, detente.
8. No toques `.env.local`, Supabase remoto, migraciones, Vercel ni secretos. No imprimas valores de entorno.
9. No cambies de runner de tests (nada de Vitest), no agregues `jest-dom`, no migres componentes existentes a shadcn.
10. No reformatees archivos completos ni cambies estilo. Solo las líneas indicadas.
11. Si un test existente falla, no "arregles" la aserción para que pase: primero decide si el test o el código están mal y regístralo.

---

## 1. Objetivo y límites

**Objetivo:** que los formularios y componentes críticos tengan al menos una prueba de comportamiento real, y que el aislamiento por tenant esté cubierto por aserciones SQL estándar.

**Dentro del alcance:**

- L1: `@testing-library/react` + `global-jsdom` sobre el runner `node:test` existente, con un test piloto de `FormField`.
- L2: un archivo pgTAP para RLS de `causas` entre dos tenants ficticios.
- L3: decisión documentada sobre shadcn/ui (por defecto: no hacer nada).

**Fuera del alcance:**

- Migrar a Vitest, Storybook, TanStack Table, Recharts, Biome o MSW.
- Reemplazar los 110 tests existentes.
- Cambiar UI, permisos, esquema o datos.
- Cualquier escritura remota.

**Riesgo por lote:**

| Lote | Riesgo | Cambia comportamiento |
| ---- | ------ | --------------------- |
| L1   | Bajo   | No                    |
| L2   | Medio  | No (solo pruebas)     |
| L3   | Bajo   | Solo si se aprueba    |

---

## 2. Evidencia de partida

Ejecuta y anota la salida real (no copies cifras de este documento):

```bash
git rev-parse HEAD
npm run lint
npm run test
npm run build
```

Esperado: `lint` y `build` en 0, `test` en 0 con la cifra real de tests. Anota esa cifra en el Paso 7.

Estado conocido del repositorio al escribir este runbook:

| Señal                | Valor                                                               |
| -------------------- | ------------------------------------------------------------------- |
| Archivos de test     | 110 `*.test.ts`, 0 `*.test.tsx`                                     |
| Runner               | `node:test` con `tsx`, `--test-concurrency=1`                       |
| Glob de tests        | solo `*.test.ts` (un `.tsx` no se ejecuta hoy)                      |
| `tsconfig`           | `jsx: react-jsx`, `strict: true`, `noEmit: true`                    |
| Playwright           | `testDir: "./tests"` (no recoge tests dentro de `src/`)             |
| Tests SQL existentes | `supabase/tests/*.sql` con `DO $$ ... raise exception`              |
| Stack de UI          | React 19, Radix, Tailwind 4, componentes propios en `src/shared/ui` |

---

## 3. Preparación

```bash
git status --porcelain          # debe estar vacío
git checkout -b chore/mejoras-oss-2026-11-13
npm ci
npm run lint
npm run test
npm run build
```

**Gate de preparación:** si `lint`, `test` o `build` fallan antes de tocar nada, detente.

---

## 4. Lotes

### L1 — Test de componente con Testing Library y jsdom

**Riesgo:** bajo. No cambia producción.

**Por qué:** los tests de accesibilidad actuales leen el `.tsx` como texto (`src/features/causas/editCausaFormAccessibility.test.ts`). Un formulario puede estar roto y el test pasa.

#### Paso 1 — Instalar dependencias de desarrollo

```bash
npm i -D @testing-library/react @testing-library/dom global-jsdom
```

No instales `jsdom` por separado (lo trae `global-jsdom`) ni `@testing-library/jest-dom` (usa `node:assert`). Agrega `@testing-library/user-event` solo cuando un test simule teclado o clic: mientras no se importe, Knip lo marca como dependencia sin uso.

#### Paso 2 — Permitir tests `.tsx`

En `package.json`, cambia solo el glob de estos dos scripts:

```json
"test": "node --experimental-test-module-mocks --test-concurrency=1 --import tsx --test \"src/**/*.test.ts\" \"src/**/*.test.tsx\" \"server/**/*.test.ts\"",
"test:coverage": "node --experimental-test-coverage --test-coverage-exclude=api/index.js --test-coverage-lines=80 --experimental-test-module-mocks --import tsx --test \"src/**/*.test.ts\" \"src/**/*.test.tsx\" \"server/**/*.test.ts\"",
```

Además, Knip 6 no reconoce `*.test.tsx` como entry y reporta el archivo y sus dependencias como sin uso. Agrega la entrada al bloque `knip` de `package.json`:

```json
"knip": {
  "entry": ["src/**/*.test.tsx"],
  "ignore": [
```

Verifica que no aparezcan hallazgos nuevos:

```bash
npm run knip:ci
```

Esperado: exit 0, con las dos excepciones justificadas ya conocidas (`database.types.ts` y `gitleaks`).

#### Paso 3 — Crear el test piloto

Archivo nuevo: `src/shared/ui/FormField.test.tsx`

```tsx
/** @license SPDX-License-Identifier: Apache-2.0 */

// Primero: define document antes de importar Testing Library.
import "global-jsdom/register";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import FormField from "./FormField";
import Input from "./Input";

// node:test no expone un afterEach global, así que RTL no limpia solo.
afterEach(cleanup);

describe("FormField", () => {
  it("asocia label, input y error para lectores de pantalla", () => {
    render(
      <FormField
        label="Observaciones"
        htmlFor="edit-obs"
        error="Campo obligatorio"
      >
        <Input id="edit-obs" />
      </FormField>,
    );

    const input = screen.getByLabelText("Observaciones");
    assert.equal(input.id, "edit-obs");

    const alert = screen.getByRole("alert");
    assert.equal(alert.textContent, "Campo obligatorio");
    assert.equal(alert.id, "edit-obs-error");
  });
});
```

#### Paso 4 — Retirar la aserción reemplazada

En `src/features/causas/editCausaFormAccessibility.test.ts`, elimina **solo** el tercer `it` ("el error de FormField conserva id para aria-describedby", líneas 40–45). Los dos primeros se conservan: verifican el uso de componentes compartidos y los nombres accesibles del flujo E2E.

#### Paso 5 — Verificar

```bash
node --experimental-test-module-mocks --test-concurrency=1 --import tsx --test "src/shared/ui/FormField.test.tsx"
npm run test
npm run lint
npm run build
npm run check:bundle
```

Esperado:

- El test nuevo pasa con 1 test.
- `npm run test` termina en 0. La cifra total se mantiene si se retiró la aserción reemplazada (1 test nuevo, 1 retirado); el número de suites sube 1.
- `lint`, `build` y `check:bundle` en 0 y sin cambios de presupuesto (el test no entra al bundle).

**Gate L1:** si el test nuevo falla por `document is not defined`, el import de `global-jsdom/register` no quedó primero. Corrige el orden, no cambies de librería.

**Commit sugerido:** `test(ui): probar FormField con Testing Library y jsdom`

---

### L2 — pgTAP para aislamiento por tenant

**Riesgo:** medio. Solo pruebas; no modifica esquema ni datos remotos.

**Por qué:** el aislamiento entre colegios es el riesgo legal central (ADR-0009) y hoy se prueba con scripts propios que lanzan excepciones. pgTAP es el estándar que usa `supabase test db`.

#### Paso 1 — Confirmar que el stack es local

```bash
npx supabase status
```

**Gate L2.0:** si el comando apunta a un proyecto remoto (`*.supabase.co`) o no hay stack local, **detente**. No uses `--db-url` ni `db push` contra remoto.

#### Paso 2 — Crear el archivo de prueba

Archivo nuevo: `supabase/tests/pgtap/rls_tenant_isolation.sql`

```sql
-- RLS: un usuario del tenant A no ve ni escribe datos del tenant B.
-- Fixtures ficticios, ejecutados en transacción con rollback.
begin;
create extension if not exists pgtap;
select plan(3);

-- Fixtures: reutiliza el patrón de supabase/tests/causa_role_matrix.sql
-- (tenants ficticios, usuario de A, causa de B). Mantén todo ficticio.
-- Inserta aquí: tenant A, tenant B, usuario A en app_memberships, causa en B.

set local role authenticated;
select set_config('request.jwt.claim.sub', '<uuid-usuario-A>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::int from public.causas where id = '<causa-tenant-B>'),
  0,
  'RLS: un usuario de A no ve causas de B'
);

select is(
  (select count(*)::int from public.causas where id = '<causa-tenant-A>'),
  1,
  'RLS: un usuario de A sí ve las causas de A'
);

select throws_ok(
  $$ insert into public.causas (id, tenant_id) values ('x', '<tenant-B>') $$,
  '42501',
  null,
  'RLS: no se puede escribir en otro tenant'
);

reset role;
select * from finish();
rollback;
```

Reemplaza los tres `<...>` por los UUID ficticios de tus fixtures. No inventes UUIDs nuevos si los existentes en `supabase/tests/fixtures/` sirven.

#### Paso 3 — Ejecutar solo ese archivo

```bash
npx supabase test db --local supabase/tests/pgtap/rls_tenant_isolation.sql
```

`--local` es obligatorio: fuerza el stack local. Nunca uses `--linked` ni `--db-url`.

Esperado: `1..3`, tres `ok`, y `finish` sin errores.

**Gate L2.1:** si el CLI ignora la ruta y ejecuta también `profile_privileges.sql` (que aborta fuera de una base `runbook_audit_%`), **detente**. Fallback documentado: mueve el archivo a `supabase/tests-pgtap/` y ejecútalo con `psql` contra la base aislada que usa `npm run test:db:runbook`. No modifiques los tres archivos SQL existentes.

**Gate L2.2:** si `create extension pgtap` falla, registra el error y detente; no instales extensiones en remoto.

#### Paso 4 — Verificar que no hubo escrituras

```bash
git status --porcelain
```

Solo debe aparecer el archivo nuevo y el runbook. Cualquier cambio en `supabase/migrations/` es un error: revierte.

**Commit sugerido:** `test(db): cubrir aislamiento por tenant con pgTAP`

---

### L3 — shadcn/ui selectivo (diferido)

**REQUIERE DECISIÓN.** No ejecutar sin autorización explícita.

**Regla dura:** no ejecutes `npx shadcn init`. Reescribe tokens y CSS global de un proyecto Tailwind 4 que ya tiene diseño propio.

**Opción A (recomendada, costo cero):** no hacer nada. Los selectores actuales son pequeños (`src/shared/ui/Select.tsx`, 27 líneas) y no hay evidencia de que fallen.

**Opción B (solo si una pantalla concreta lo necesita):**

1. `npm i cmdk` (sin `init`).
2. Crear `src/shared/ui/Combobox.tsx` usando los tokens existentes (`border-neutral-200`, `brand-500`), sin tocar CSS global.
3. Usarlo en **un solo** selector con más de 20 opciones.
4. Agregar su test `.tsx` en el mismo commit (reutiliza el patrón de L1).

**Criterio de aborto:** si el componente exige modificar `src/index.css`, variables de tema o `tailwind` config, revierte y quédate en Opción A.

**Commit sugerido (solo Opción B):** `feat(ui): combobox accesible para listas largas`

---

## 5. Decisiones humanas requeridas

| Punto | Pregunta exacta                                            | Estado    |
| ----- | ---------------------------------------------------------- | --------- |
| L1    | ¿Se aprueba agregar 4 devDependencies y un test piloto?    | Pendiente |
| L2    | ¿Se aprueba ejecutar pgTAP **solo** contra el stack local? | Pendiente |
| L3    | ¿Opción A (no hacer nada) u Opción B (cmdk + un Combobox)? | Pendiente |

---

## 6. Verificación final

```bash
npm run lint
npm run test
npm run build
npm run knip:ci
npm run check:bundle
git status --porcelain
```

Esperado:

- `lint`, `test`, `build`, `knip:ci`, `check:bundle`: exit 0.
- `knip:ci` no debe marcar las dependencias nuevas como sin uso (se usan en `FormField.test.tsx`).
- `npm run knip` (sin `:ci`) sigue mostrando el baseline conocido de 10 exports y 4 tipos sin uso; no es un fallo de este runbook.
- `git status`: limpio tras el commit documental.

Playwright no se ejecuta en L1/L2: no se modifica UI ni flujos navegables. Si se ejecuta L3 Opción B, sí corresponde:

```bash
npx playwright test tests/accessibility.spec.ts --workers=1
```

---

## 7. Registro de ejecución

Completar por lote con salida real:

| Lote        | Commit     | Archivos | Tests antes | Tests después | lint | test | build | knip             | Notas                                                                                                                                                                  |
| ----------- | ---------- | -------- | ----------- | ------------- | ---- | ---- | ----- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preparación | `439686ae` | 0        | —           | 1.014/1.014   | ✅   | ✅   | ✅    | base             | Árbol limpio; baseline verificado.                                                                                                                                     |
| L1          | `3e7097fa` | 4        | 1.014/1.014 | 1.014/1.014   | ✅   | ✅   | ✅    | `knip:ci` exit 0 | Se agregó `FormField.test.tsx`, se retiró la aserción de texto reemplazada y se configuró `entry` de Knip para `.test.tsx`. `user-event` se descartó por no tener uso. |
| L2          |            |          |             |               |      |      |       |                  |                                                                                                                                                                        |
| L3          |            |          |             |               |      |      |       |                  |                                                                                                                                                                        |

---

## 8. Reversión

- Lote con commit: `git revert <sha>`.
- Lote sin commit: `git restore <archivos>`; para archivos nuevos, bórralos solo si están en el inventario de este runbook.
- Nunca uses `git reset --hard` con trabajo local sin commitear.
- Si L1 deja tests colgados por DOM no limpiado: agrega `afterEach(cleanup)`, no desactives el test.

---

## 9. Criterios de cierre

1. Existe al menos un `*.test.tsx` ejecutado por `npm run test` (no solo por comando manual).
2. La aserción de texto reemplazada fue eliminada; no hay dos fuentes de verdad para el mismo comportamiento.
3. `lint`, `test`, `build`, `knip:ci` y `check:bundle` verdes.
4. L2 dejó evidencia de `1..3` con tres `ok`, sin escrituras ni cambios en `supabase/migrations/`.
5. L3 tiene decisión registrada (A o B), no queda en ambigüedad.
6. Sin cambios en base de datos remota, secretos ni entorno de producción.

---

## 10. Anti-patrones (no hacer)

- Migrar a Vitest "porque es más cómodo": duplica configuración y no aporta al problema.
- Instalar `@testing-library/jest-dom`: mezcla matchers de Jest con `node:test`.
- Testear clases CSS o estructura interna: testea roles, labels y texto visible.
- Mockear Supabase en L1: el piloto es un componente puro.
- Ejecutar `supabase db reset`, `db push` o `test db --db-url` contra remoto.
- Instalar TanStack Table, Recharts, Storybook, Biome o MSW: no resuelven un problema actual de este repo.
- Reescribir los 110 tests existentes de una vez.
