/** @license SPDX-License-Identifier: Apache-2.0 */
// Importación incremental protegida del piloto 1MA. Requiere --confirm.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  bulkCourseKey,
  bulkNameKey,
  parseBulkDisciplinaryPdf,
  selectNewBulkAnnotations,
} from "../server/lib/bulkDisciplinaryPdf.ts";
import { syncBulkPendingCartas } from "../server/lib/bulkCartaWorkflow.ts";

dotenv.config({ path: ".env.local" });

if (!process.argv.includes("--confirm")) {
  throw new Error("La escritura requiere ejecutar este script con --confirm.");
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error("Faltan credenciales administrativas de Supabase.");

const expectedCourseId = "cee5f485-b4f8-4020-bda8-fe9ca3140e4f";
const pdfPath = "Archivos/1MA.pdf";
const supabase = createClient(url, key, { auth: { persistSession: false } });
const parsed = await parseBulkDisciplinaryPdf(readFileSync(pdfPath));

const { data: course, error: courseError } = await supabase
  .from("courses")
  .select("id,name,tenant_id")
  .eq("id", expectedCourseId)
  .maybeSingle();
if (courseError) throw courseError;
if (!course || bulkCourseKey(course.name) !== "1 medio a") {
  throw new Error("El curso destino no coincide con 1° Medio A.");
}
const { data: actor, error: actorError } = await supabase
  .from("profiles")
  .select("user_id")
  .eq("tenant_id", course.tenant_id)
  .eq("is_active", true)
  .in("role", ["superadmin", "admin", "direccion"])
  .limit(1)
  .maybeSingle();
if (actorError) throw actorError;
if (!actor?.user_id) {
  throw new Error(
    "No existe un administrador activo para registrar la auditoría.",
  );
}

const { data: students, error: studentsError } = await supabase
  .from("students")
  .select("id,full_name,course_id")
  .eq("tenant_id", course.tenant_id)
  .eq("course_id", course.id);
if (studentsError) throw studentsError;

const studentsByName = new Map();
for (const student of students ?? []) {
  const key = bulkNameKey(student.full_name);
  studentsByName.set(key, [...(studentsByName.get(key) ?? []), student]);
}

const matches = parsed.estudiantes.map((source) => ({
  source,
  candidates: studentsByName.get(bulkNameKey(source.nombre)) ?? [],
}));
const unresolved = matches.filter(({ candidates }) => candidates.length !== 1);
if (unresolved.length) {
  throw new Error(
    `Se detuvo la importación: ${unresolved.length} estudiantes sin match único: ${unresolved.map(({ source }) => source.nombre).join("; ")}`,
  );
}
if (matches.length !== 38) {
  throw new Error(
    `Se esperaba 38 estudiantes y se encontraron ${matches.length}.`,
  );
}

const studentIds = matches.map(({ candidates }) => candidates[0].id);
const { data: existingRecords, error: existingError } = await supabase
  .from("inspectorate_records")
  .select("student_id,type,date_time,observation")
  .eq("tenant_id", course.tenant_id)
  .in("student_id", studentIds);
if (existingError) throw existingError;

const existingByStudent = new Map();
for (const record of existingRecords ?? []) {
  const rows = existingByStudent.get(record.student_id) ?? [];
  rows.push(record);
  existingByStudent.set(record.student_id, rows);
}

const newAnnotations = matches.flatMap(({ source, candidates }) => {
  const student = candidates[0];
  return selectNewBulkAnnotations(
    source.anotaciones.map((annotation) => ({
      ...annotation,
      page_number: annotation.page_number ?? null,
    })),
    existingByStudent.get(student.id) ?? [],
  ).map((annotation) => ({ annotation, student }));
});

const bulkPath = `bulk-pdf/${course.tenant_id}/${course.id}/${parsed.file_hash}`;
const { count: alreadyImported, error: pathError } = await supabase
  .from("inspectorate_records")
  .select("id", { count: "exact", head: true })
  .eq("tenant_id", course.tenant_id)
  .eq("pdf_file_path", bulkPath);
if (pathError) throw pathError;
if ((alreadyImported ?? 0) > 0) {
  throw new Error("Este PDF ya fue aplicado para 1° Medio A; no se duplicará.");
}

const rows = newAnnotations.map(({ annotation, student }) => ({
  student_id: student.id,
  date_time: `${annotation.fecha_iso}T12:00:00.000Z`,
  observation: `[${annotation.categoria}] ${annotation.texto}`,
  type: annotation.tipo,
  severity: "Leve",
  registered_by: annotation.profesor?.trim() || "PDF Importación Masiva",
  created_by: actor.user_id,
  tenant_id: course.tenant_id,
  pdf_file_path: bulkPath,
}));

if (rows.length) {
  const { error: insertError } = await supabase
    .from("inspectorate_records")
    .insert(rows);
  if (insertError) throw insertError;
}
const pendingCartas = await syncBulkPendingCartas({
  supabase,
  tenantId: course.tenant_id,
  studentIds,
  actorUserId: actor.user_id,
  sourceHash: parsed.file_hash,
});

const { error: auditError } = await supabase.from("audit_events").insert({
  tenant_id: course.tenant_id,
  actor_user_id: actor.user_id,
  action: "annotations_bulk_imported",
  entity_type: "annotation_bulk_import",
  entity_id: course.id,
  previous_values: { existing_records: existingRecords?.length ?? 0 },
  new_values: {
    file_hash: parsed.file_hash,
    course_id: course.id,
    annotations_detected: parsed.estudiantes.reduce(
      (total, student) => total + student.anotaciones.length,
      0,
    ),
    annotations_imported: rows.length,
  },
});
if (auditError) throw auditError;

console.log(
  JSON.stringify(
    {
      curso: course.name,
      estudiantes: matches.length,
      anotaciones_existentes: existingRecords?.length ?? 0,
      anotaciones_detectadas: parsed.estudiantes.reduce(
        (total, student) => total + student.anotaciones.length,
        0,
      ),
      anotaciones_importadas: rows.length,
      cartas_pendientes_creadas: pendingCartas,
      hash: parsed.file_hash,
    },
    null,
    2,
  ),
);
