/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createDraftCausa } from "../src/lib/causaFactory";

// Destino local fijo: no lee URLs ni credenciales del entorno de producción.
const container = "supabase_db_sistema-integral-convivencia-escolar";
const database = "runbook_audit_20261022_v3";
assert.match(database, /^runbook_audit_\d{8}_v\d+$/);
const args = [
  "exec",
  "-i",
  container,
  "psql",
  "-X",
  "-U",
  "supabase_admin",
  "-d",
  database,
  "-v",
  "ON_ERROR_STOP=1",
  "-q",
];
const read = (name: string) =>
  readFileSync(new URL(`../supabase/tests/${name}`, import.meta.url), "utf8");
const fixture = read("fixtures/convivencia-roles.sql");
const draft = createDraftCausa({
  counter: 1,
  estudianteNombre: "Estudiante ficticio",
  estudianteCurso: "8 A",
  runEstudiante: "",
  tipoInfraccion: "Grave",
  comprometeAulaSegura: false,
  observaciones: "Hechos ficticios de prueba",
  responsable: "Inspectoría ficticia",
});
const defaults = JSON.stringify({
  fechaApertura: draft.fechaApertura,
  fechaInicioInvestigacion: draft.fechaInicioInvestigacion,
  plazoInvestigacionDias: draft.plazoInvestigacionDias,
  fechaLimiteInvestigacion: draft.fechaLimiteInvestigacion,
});
const initialData = `create temporary table fixture_initial (defaults jsonb, checklist jsonb); insert into fixture_initial values ('${defaults.replaceAll("'", "''")}','${JSON.stringify(draft.checklistDebidoProceso).replaceAll("'", "''")}'); grant select on fixture_initial to authenticated;`;

function runSql(sql: string) {
  const result = spawnSync("docker", args, {
    input: sql,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  return result.stdout;
}

for (const name of [
  "profile_privileges.sql",
  "causa_role_matrix.sql",
  "incident_atomicity.sql",
]) {
  const sql =
    name === "profile_privileges.sql"
      ? read(name)
      : `begin;\n${fixture}\n${initialData}\n${read(name)}\nrollback;`;
  runSql(sql);
  console.log(`${name}: aprobado; fixtures revertidos.`);
}

// Las conexiones de una carrera necesitan fixtures confirmados, siempre en esta copia vacía.
runSql(`begin; do $$ begin
  if exists (select 1 from auth.users) or exists (select 1 from public.tenants) or exists (select 1 from public.applications) then
    raise exception 'La base de carreras no está vacía; no se sobrescribirá trabajo existente';
  end if;
end $$; ${fixture} commit;`);
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const request = JSON.stringify({
  courseId: "50000000-0000-4000-8000-000000000001",
  studentIds: [
    "60000000-0000-4000-8000-000000000001",
    "60000000-0000-4000-8000-000000000002",
  ],
  fechaHora: "2026-04-15T12:30:00Z",
  lugar: "Patio ficticio",
  tipo: "Art. 25 N° 1 · Grave",
  descripcion: "Hechos ficticios para probar concurrencia.",
  responsable: "Inspectoría ficticia",
  conductaRiceId: "G1",
  tipoInfraccion: "Grave",
  comprometeAulaSegura: false,
});
function concurrentRequest(
  key: string,
): Promise<{ incidente: { id: string }; causaIds: string[] }> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [...args, "-t", "-A"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        assert.equal(code, 0, stderr);
        const line = stdout.split(/\r?\n/).find((line) => line.startsWith("{"));
        assert.ok(line, "Falta la respuesta JSON de la RPC");
        resolve(JSON.parse(line));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(`begin; set local role authenticated;
      select set_config('request.jwt.claim.role','authenticated',true);
      select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
      select public.create_incidente_with_causas(${literal(key)},${literal(request)}::jsonb,${literal(defaults)}::jsonb,${literal(JSON.stringify(draft.checklistDebidoProceso))}::jsonb);
      select pg_sleep(0.2); commit;`);
  });
}
try {
  const settleRace = async (keys: string[]) =>
    (await Promise.allSettled(keys.map(concurrentRequest))).map((result) => {
      assert.ok(
        result.status === "fulfilled",
        result.status === "rejected" ? String(result.reason) : "",
      );
      return result.value;
    });
  const same = await settleRace([
    "70000000-0000-4000-8000-000000000100",
    "70000000-0000-4000-8000-000000000100",
  ]);
  assert.deepEqual(
    same[0],
    same[1],
    "La carrera con la misma clave duplicó el alta",
  );
  const different = await settleRace([
    "70000000-0000-4000-8000-000000000101",
    "70000000-0000-4000-8000-000000000102",
  ]);
  assert.notEqual(different[0].incidente.id, different[1].incidente.id);
  assert.equal(new Set(different.flatMap((result) => result.causaIds)).size, 4);
  runSql(`do $$ begin
    assert (select count(*) = 3 from public.incidentes);
    assert (select count(*) = 6 from public.causas);
    assert (select count(*) = 3 from public.incidente_creation_requests);
  end $$;`);
  console.log(
    "Carreras reales: misma clave sin duplicados y claves distintas sin colisiones de correlativo.",
  );
} finally {
  runSql(`begin;
    delete from public.incidente_creation_requests where tenant_id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
    delete from public.bitacora_entries where tenant_id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
    delete from public.checklist_items where tenant_id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
    delete from public.causas where tenant_id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
    delete from public.incidentes where tenant_id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
    delete from public.students where id in ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003');
    delete from public.courses where id in ('50000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002');
    delete from public.app_memberships where user_id in (select user_id from public.profiles where tenant_id = '30000000-0000-4000-8000-000000000001');
    delete from auth.users where id in (select ('40000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid from generate_series(1,13) n);
    delete from public.tenants where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
    delete from public.applications where code in ('convivencia','inasistencias');
    commit;`);
  console.log(
    "Limpieza acotada: eliminados solo los fixtures creados para las carreras.",
  );
}
