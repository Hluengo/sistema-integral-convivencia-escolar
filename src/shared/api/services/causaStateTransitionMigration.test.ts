/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    "supabase/migrations/20260924100000_enforce_causa_state_transitions.sql",
  ),
  "utf8",
);

describe("causa state transition migration", () => {
  it("crea un trigger server-side para expedientes versión 2", () => {
    assert.match(
      migration,
      /create or replace function public\.enforce_causa_state_transition/,
    );
    assert.match(migration, /create trigger causas_enforce_state_transition/);
    assert.match(migration, /new\.procedural_model_version <> 2/);
    assert.match(migration, /next_phase > previous_phase \+ 1/);
  });

  it("mantiene intactos los expedientes versión 1", () => {
    assert.match(
      migration,
      /old\.procedural_model_version <> 2\s+or\s+new\.procedural_model_version <> 2/,
    );
    assert.match(migration, /security invoker/);
    assert.match(
      migration,
      /revoke all on function public\.enforce_causa_state_transition\(\) from public/,
    );
    assert.match(
      migration,
      /grant execute on function public\.enforce_causa_state_transition\(\) to authenticated, service_role/,
    );
  });
});
