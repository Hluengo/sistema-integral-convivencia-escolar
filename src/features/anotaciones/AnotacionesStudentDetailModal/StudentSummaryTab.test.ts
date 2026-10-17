/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Annotation } from "@/shared/lib/types";
import type { DetectedAnnotationRecord } from "@/shared/api/services/cartas.service";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY ??= "anon-key-for-unit-tests";

const { default: StudentSummaryTab } = await import("./StudentSummaryTab");

function annotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "annotation-test",
    student_id: "student-test",
    text: "[COMPORTAMIENTO] Registro disciplinario",
    date: "2026-10-07T12:00:00Z",
    severity: "Leve",
    registered_by: "DOCENTE DE PRUEBA",
    type: "Negativa",
    ...overrides,
  };
}

const detected: DetectedAnnotationRecord = {
  id: "detected-test",
  process_id: "process-test",
  student_id: "student-test",
  annotation_type: "Negativa",
  annotation_text: "Registro disciplinario",
  category: "COMPORTAMIENTO",
  teacher_name: "DOCENTE ANTERIOR",
  annotation_date: "2026-10-07",
  detected_at: "2026-10-07T12:00:00Z",
};

function renderSummary(
  annotations: Annotation[],
  detectedAnnotations: DetectedAnnotationRecord[] = [],
) {
  const html = renderToStaticMarkup(
    createElement(StudentSummaryTab, {
      annotations,
      detectedAnnotations,
      counts: { negativas: annotations.length, positivas: 0, informativas: 0 },
      currentCarta: null,
      lastAnalysis: null,
    }),
  );
  return html.slice(html.indexOf("Desglose de registros"));
}

function assertRow(html: string, label: string, count: number) {
  assert.match(
    html,
    new RegExp(label + "</span><span[^>]*>" + count + "</span>"),
  );
}

describe("Desglose de registros del estudiante", () => {
  it("muestra las siete anotaciones registradas sin análisis PDF individual", () => {
    const annotations = Array.from({ length: 7 }, (_, index) =>
      annotation({ id: "annotation-" + index }),
    );
    const breakdown = renderSummary(annotations);
    assertRow(breakdown, "COMPORTAMIENTO", 7);
    assertRow(breakdown, "DOCENTE DE PRUEBA", 7);
    assert.doesNotMatch(
      breakdown,
      /Sin categorías detectadas|Sin docente detectado/,
    );
  });

  it("recupera categoría y profesor del texto del PDF usando los parsers existentes", () => {
    const breakdown = renderSummary([
      annotation({
        text: "07/10/2026 Tipo: Negativa Categoria: RESPONSABILIDAD Anotación: No trae materiales. Profesor: DOCENTE DEL PDF",
        registered_by: "PDF Convivencia Escolar",
      }),
    ]);
    assertRow(breakdown, "RESPONSABILIDAD", 1);
    assertRow(breakdown, "DOCENTE DEL PDF", 1);
    assert.doesNotMatch(breakdown, /PDF Convivencia Escolar/);
  });

  it("prioriza los registros corregidos sin sumar las detecciones del mismo PDF", () => {
    const breakdown = renderSummary(
      [annotation({ text: "[RESPONSABILIDAD] Registro corregido" })],
      [detected],
    );
    assertRow(breakdown, "RESPONSABILIDAD", 1);
    assertRow(breakdown, "DOCENTE DE PRUEBA", 1);
    assert.doesNotMatch(breakdown, /COMPORTAMIENTO|DOCENTE ANTERIOR/);
  });

  it("no presenta el importador como docente ni inventa una categoría", () => {
    const breakdown = renderSummary([
      annotation({
        text: "Sin metadatos",
        registered_by: "PDF Importación Masiva",
      }),
    ]);
    assertRow(breakdown, "SIN CATEGORÍA", 1);
    assert.match(breakdown, /Sin docente detectado/);
    assert.doesNotMatch(breakdown, /PDF Importación Masiva/);
  });

  it("mantiene las detecciones deduplicadas como respaldo si no hay registros", () => {
    const breakdown = renderSummary(
      [],
      [detected, { ...detected, id: "duplicate" }],
    );
    assertRow(breakdown, "COMPORTAMIENTO", 1);
    assertRow(breakdown, "DOCENTE ANTERIOR", 1);
    assert.doesNotMatch(breakdown, /No hay anotaciones disponibles/);
  });

  it("mantiene el estado vacío cuando no existe ninguna de las dos fuentes", () => {
    const breakdown = renderSummary([]);
    assert.match(breakdown, /No hay anotaciones disponibles/);
    assert.match(breakdown, /Sin categorías detectadas/);
    assert.match(breakdown, /Sin docente detectado/);
  });
});
