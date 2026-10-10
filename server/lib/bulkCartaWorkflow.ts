/** @license SPDX-License-Identifier: Apache-2.0 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bulkSuggestedLetterType,
  BULK_QUERY_MAX_ROWS,
  chunkQueryIds,
} from "./bulkDisciplinaryPdf.js";

interface BulkCartaWorkflowInput {
  supabase: SupabaseClient;
  tenantId: string;
  studentIds: string[];
  actorUserId: string;
  sourceHash: string;
}

// La vista previa y la confirmación comparten la misma decisión de progresión.
export async function previewBulkCartas(
  {
    supabase,
    tenantId,
    studentIds,
  }: Pick<BulkCartaWorkflowInput, "supabase" | "tenantId" | "studentIds">,
  additionalNegatives: Map<string, number> = new Map(),
) {
  if (!studentIds.length) return [];

  const studentPages = await Promise.all(
    chunkQueryIds(studentIds).map(async (chunk) => {
      const { data, error } = await supabase
        .from("students")
        .select("id,full_name,course_id,apoderado_nombre")
        .eq("tenant_id", tenantId)
        .in("id", chunk)
        .limit(BULK_QUERY_MAX_ROWS);
      if (error) throw error;
      return data ?? [];
    }),
  );
  const students = studentPages.flat();

  const courseIds = [
    ...new Set(students.map((student) => student.course_id).filter(Boolean)),
  ];
  const coursePages = await Promise.all(
    chunkQueryIds(courseIds).map(async (chunk) => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .in("id", chunk)
        .limit(BULK_QUERY_MAX_ROWS);
      if (error) throw error;
      return data ?? [];
    }),
  );
  const courseNames = new Map(
    coursePages.flat().map((course) => [course.id, course.name]),
  );

  const recordPages = await Promise.all(
    chunkQueryIds(studentIds).map(async (chunk) => {
      const { data, error } = await supabase
        .from("inspectorate_records")
        .select("student_id,type")
        .eq("tenant_id", tenantId)
        .in("student_id", chunk)
        .limit(BULK_QUERY_MAX_ROWS);
      if (error) throw error;
      return data ?? [];
    }),
  );
  const records = recordPages.flat();

  const cartaPages = await Promise.all(
    chunkQueryIds(studentIds).map(async (chunk) => {
      const { data, error } = await supabase
        .from("cartas_disciplinarias")
        .select("id,student_id,letter_type,emission_date,created_at,status")
        .eq("tenant_id", tenantId)
        .in("student_id", chunk)
        .limit(BULK_QUERY_MAX_ROWS);
      if (error) throw error;
      return data ?? [];
    }),
  );
  const cartas = cartaPages
    .flat()
    .sort(
      (a, b) =>
        (b.emission_date ?? "").localeCompare(a.emission_date ?? "") ||
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );

  const cartaIds = [...new Set(cartas.map((carta) => carta.id))];
  const eventPages = await Promise.all(
    chunkQueryIds(cartaIds).map(async (chunk) => {
      const { data, error } = await supabase
        .from("carta_events")
        .select("carta_id,event_type,created_at")
        .eq("tenant_id", tenantId)
        .in("carta_id", chunk)
        .limit(BULK_QUERY_MAX_ROWS);
      if (error) throw error;
      return data ?? [];
    }),
  );
  const events = eventPages
    .flat()
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const latestEvent = new Map<string, string>();
  for (const event of events ?? []) {
    if (!latestEvent.has(event.carta_id))
      latestEvent.set(event.carta_id, event.event_type);
  }

  const activeCartaByStudent = new Map<string, (typeof cartas)[number]>();
  for (const carta of cartas ?? []) {
    if (carta.status === "Anulada" || latestEvent.get(carta.id) === "annulled")
      continue;
    if (!activeCartaByStudent.has(carta.student_id))
      activeCartaByStudent.set(carta.student_id, carta);
  }

  const negativeCounts = new Map<string, number>();
  for (const record of records ?? []) {
    if (record.type === "Negativa") {
      negativeCounts.set(
        record.student_id,
        (negativeCounts.get(record.student_id) ?? 0) + 1,
      );
    }
  }

  return (students ?? []).map((student) => {
    const current = activeCartaByStudent.get(student.id);
    const negativeCount =
      (negativeCounts.get(student.id) ?? 0) +
      (additionalNegatives.get(student.id) ?? 0);
    return {
      student,
      course: courseNames.get(student.course_id) ?? student.course_id,
      negativeCount,
      current_letter: current?.letter_type ?? null,
      pending_letter: bulkSuggestedLetterType(
        negativeCount,
        current?.letter_type ?? null,
      ),
    };
  });
}

export async function syncBulkPendingCartas(
  input: BulkCartaWorkflowInput,
): Promise<number> {
  const { supabase, tenantId, actorUserId, sourceHash } = input;
  const plan = await previewBulkCartas(input);
  let created = 0;
  for (const {
    student,
    course,
    negativeCount,
    pending_letter: letterType,
  } of plan) {
    if (!letterType) continue;

    const { data: carta, error: insertError } = await supabase
      .from("cartas_disciplinarias")
      .insert({
        student_id: student.id,
        tenant_id: tenantId,
        letter_type: letterType,
        emission_date: new Date().toISOString().slice(0, 10),
        status: "Vigente",
        emitted_by: "Inspectoría",
        supervisor_name: null,
        apoderado_name: student.apoderado_nombre?.trim() || "Pendiente",
        annotations_count: negativeCount,
        student_name: student.full_name,
        course,
        regulation_basis: "RICE 2026 - Progresión disciplinaria",
        observations: `Carta pendiente sugerida por importación PDF masiva (${sourceHash}).`,
      })
      .select("id,student_id")
      .single();
    if (insertError || !carta)
      throw insertError ?? new Error("No se pudo crear la carta pendiente.");

    const { error: eventError } = await supabase.from("carta_events").insert({
      carta_id: carta.id,
      student_id: student.id,
      tenant_id: tenantId,
      event_type: "suggested",
      event_detail:
        "Carta sugerida por progresión desde importación PDF masiva",
      created_by: actorUserId,
      metadata: {
        source: "bulk_pdf",
        sourceHash,
        negativeCount: negativeCount,
      },
    });
    if (eventError) throw eventError;
    created += 1;
  }

  return created;
}
