/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260923130000_add_reconsideraciones.sql",
  "utf8",
);

describe("migración de reconsideraciones", () => {
  it("persiste solicitudes y resoluciones con vínculo de tenant", () => {
    assert.match(
      migration,
      /create table if not exists public\.reconsideraciones/,
    );
    assert.match(migration, /causa_id text not null references public\.causas/);
    assert.match(
      migration,
      /tipo text not null check \(tipo in \('reconsideracion', 'apelacion'\)/,
    );
    assert.match(migration, /estado text not null default 'pendiente'/);
    assert.match(migration, /solicitud text not null/);
    assert.match(migration, /resolucion text not null/);
  });

  it("mantiene RLS por tenant y no concede borrado al cliente", () => {
    assert.match(
      migration,
      /alter table public\.reconsideraciones enable row level security/,
    );
    assert.match(migration, /reconsideraciones_tenant_select/);
    assert.match(migration, /reconsideraciones_tenant_insert/);
    assert.match(migration, /reconsideraciones_tenant_update/);
    assert.doesNotMatch(migration, /grant .*delete .*reconsideraciones/i);
    assert.match(migration, /ensure_reconsideracion_same_tenant/);
  });
});
