import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const migration = [
  "20261017221534_audit_events_hash_chain.sql",
  "20261017221547_restrict_audit_hash_functions.sql",
]
  .map((file) => readFileSync(resolve(migrationsDir, file), "utf8"))
  .join("\n");

test("cadena de hash de audit_events", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS previous_hash text/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS event_hash text/i);
  assert.match(migration, /digest\(canonical_payload, 'sha256'\)/i);
  assert.match(migration, /ORDER BY occurred_at DESC, id DESC/i);
  assert.match(migration, /BEFORE INSERT ON public\.audit_events/i);
  assert.match(migration, /verify_audit_event_chain\(p_tenant_id uuid\)/i);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.verify_audit_event_chain/i,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.verify_audit_event_chain/i,
  );
  assert.doesNotMatch(migration, /BEFORE UPDATE ON public\.audit_events/i);
  assert.doesNotMatch(migration, /BEFORE DELETE ON public\.audit_events/i);
});
