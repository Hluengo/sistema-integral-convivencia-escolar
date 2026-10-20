/** @license SPDX-License-Identifier: Apache-2.0 */
// Comparación solo-lectura entre el piloto 1MA y Supabase.
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configuredTenantId = process.env.DEFAULT_TENANT_ID;
if (!url || !key) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
}

const pilotPath =
  process.argv[2] ??
  "C:/Users/heae2/AppData/Local/Temp/opencode/pilot-1ma.json";
const outPath =
  process.argv[3] ??
  "C:/Users/heae2/AppData/Local/Temp/opencode/compare-1ma.json";
const pilot = JSON.parse(readFileSync(pilotPath, "utf8"));
const supabase = createClient(url, key, { auth: { persistSession: false } });

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const nameKey = (value) => normalize(value).split(" ").sort().join(" ");

const { data: allTenants, error: tenantsError } = configuredTenantId
  ? { data: null, error: null }
  : await supabase.from("tenants").select("id,name").order("name");
if (tenantsError) throw tenantsError;
const tenantIds = configuredTenantId
  ? [configuredTenantId]
  : (allTenants ?? []).map((tenant) => tenant.id);

const { data: courses, error: coursesError } = await supabase
  .from("courses")
  .select("id,name,level,tenant_id")
  .in("tenant_id", tenantIds);
if (coursesError) throw coursesError;

const courseCandidates = (courses ?? []).filter((row) => {
  const name = normalize(row.name);
  return /^1 medio a$/.test(name);
});
const course = courseCandidates.length === 1 ? courseCandidates[0] : null;
if (!course) {
  const tenantNames = new Map(
    (allTenants ?? []).map((tenant) => [tenant.id, tenant.name]),
  );
  throw new Error(
    courseCandidates.length > 1
      ? `Hay varios cursos 1A: ${courseCandidates.map((row) => `${row.name} (${tenantNames.get(row.tenant_id) ?? row.tenant_id})`).join(", ")}. Configura DEFAULT_TENANT_ID.`
      : `No se encontró el curso 1A. Cursos disponibles: ${(courses ?? []).map((row) => row.name).join(", ")}`,
  );
}

const { data: students, error: studentsError } = await supabase
  .from("students")
  .select("id,full_name,rut,course_id,tenant_id")
  .eq("tenant_id", course.tenant_id)
  .eq("course_id", course.id)
  .order("full_name");
if (studentsError) throw studentsError;

const dbByName = new Map();
for (const student of students ?? []) {
  const key = nameKey(student.full_name);
  const values = dbByName.get(key) ?? [];
  values.push(student);
  dbByName.set(key, values);
}

const matches = [];
const missingInSupabase = [];
const ambiguous = [];
for (const source of pilot.students) {
  const candidates = dbByName.get(nameKey(source.nombre)) ?? [];
  const row = {
    pdf_nombre: source.nombre,
    pdf_curso: source.curso,
    anotaciones_pdf: source.anotaciones_unicas,
    supabase_id: candidates.length === 1 ? candidates[0].id : null,
    supabase_nombre: candidates.length === 1 ? candidates[0].full_name : null,
    rut: candidates.length === 1 ? candidates[0].rut : null,
    estado:
      candidates.length === 1
        ? "match"
        : candidates.length > 1
          ? "ambiguo"
          : "sin_match",
  };
  if (candidates.length === 1) matches.push(row);
  else if (candidates.length > 1)
    ambiguous.push({ ...row, candidatos: candidates });
  else missingInSupabase.push(row);
}

const result = {
  curso: { id: course.id, name: course.name, level: course.level },
  resumen: {
    estudiantes_pdf: pilot.students.length,
    anotaciones_pdf: pilot.totals.unicas,
    estudiantes_supabase: students?.length ?? 0,
    matches: matches.length,
    sin_match: missingInSupabase.length,
    ambiguos: ambiguous.length,
    anotaciones_potenciales: matches.reduce(
      (sum, row) => sum + row.anotaciones_pdf,
      0,
    ),
  },
  matches,
  missingInSupabase,
  ambiguous,
  supabase_students_not_in_pdf: (students ?? [])
    .filter((student) => !dbByName.has(nameKey(student.full_name)))
    .map(({ id, full_name, rut }) => ({ id, full_name, rut })),
};

const matchedIds = matches.map((row) => row.supabase_id);
const { data: existingAnnotations, error: annotationsError } = await supabase
  .from("inspectorate_records")
  .select("student_id,type,date_time,observation")
  .eq("tenant_id", course.tenant_id)
  .in("student_id", matchedIds);
if (annotationsError) throw annotationsError;
const existingByStudent = new Map();
for (const annotation of existingAnnotations ?? []) {
  const current = existingByStudent.get(annotation.student_id) ?? {
    total: 0,
    por_tipo: {},
  };
  current.total += 1;
  current.por_tipo[annotation.type] =
    (current.por_tipo[annotation.type] ?? 0) + 1;
  existingByStudent.set(annotation.student_id, current);
}
const sourceByStudent = new Map(
  pilot.students.map((student) => [
    matches.find((row) => row.pdf_nombre === student.nombre)?.supabase_id,
    student,
  ]),
);
let exactMatches = 0;
for (const row of matches) {
  const source = sourceByStudent.get(row.supabase_id);
  const existing = (existingAnnotations ?? []).filter(
    (annotation) => annotation.student_id === row.supabase_id,
  );
  const existingKeys = new Set(
    existing.map((annotation) =>
      [
        annotation.date_time?.slice(0, 10),
        annotation.type,
        normalize(annotation.observation),
      ].join("|"),
    ),
  );
  row.anotaciones_exactas_encontradas = (source?.anotaciones ?? []).filter(
    (annotation) =>
      existingKeys.has(
        [
          annotation.fecha_iso,
          annotation.tipo,
          normalize(annotation.texto),
        ].join("|"),
      ),
  ).length;
  exactMatches += row.anotaciones_exactas_encontradas;
}
result.resumen.anotaciones_existentes = existingAnnotations?.length ?? 0;
result.resumen.coincidencias_exactas_fecha_tipo_texto = exactMatches;
result.resumen.anotaciones_faltantes_potenciales = matches.reduce(
  (sum, row) =>
    sum +
    row.anotaciones_pdf -
    (existingByStudent.get(row.supabase_id)?.total ?? 0),
  0,
);
for (const row of matches) {
  row.anotaciones_existentes =
    existingByStudent.get(row.supabase_id)?.total ?? 0;
  row.diferencia_potencial = row.anotaciones_pdf - row.anotaciones_existentes;
}

writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
console.log(
  JSON.stringify({ curso: result.curso, resumen: result.resumen }, null, 2),
);
console.log(`\nReporte completo: ${outPath}`);
if (missingInSupabase.length) {
  console.log("\nSin match:");
  for (const row of missingInSupabase) console.log(`- ${row.pdf_nombre}`);
}
