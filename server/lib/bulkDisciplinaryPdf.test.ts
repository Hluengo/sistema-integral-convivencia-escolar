/** @license SPDX-License-Identifier: Apache-2.0 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  bulkCourseKey,
  bulkNameKey,
  chunkQueryIds,
  extractFullAnnotationText,
  selectNewBulkAnnotations,
  bulkSuggestedLetterType,
  stripTrailingStudentName,
  cutTrailingFields,
  parseBulkDisciplinaryPdf,
} from "./bulkDisciplinaryPdf.js";

test("normaliza nombres aunque PDF y base usen órdenes distintos", () => {
  assert.equal(
    bulkNameKey("ACUÑA CHRISTIANSEN CARLOS ALONSO"),
    bulkNameKey("CARLOS ALONSO ACUÑA CHRISTIANSEN"),
  );
});

test("normaliza etiquetas de curso del PDF y la base", () => {
  assert.equal(bulkCourseKey("1A MEDIO"), bulkCourseKey("1° Medio A"));
  assert.equal(bulkCourseKey("7B BASICO"), bulkCourseKey("7° Básico B"));
});

test("agrega solo diferencias y reconoce registros PDF individuales previos", () => {
  const annotations = [
    {
      fecha_iso: "2026-03-10",
      tipo: "Negativa" as const,
      categoria: "COMPORTAMIENTO",
      profesor: null,
      texto: "Interrumpe la clase",
      page_number: null,
    },
    {
      fecha_iso: "2026-03-11",
      tipo: "Positiva" as const,
      categoria: "RESPONSABILIDAD",
      profesor: null,
      texto: "Ayuda a sus compañeros",
      page_number: null,
    },
  ];

  const fresh = selectNewBulkAnnotations(annotations, [
    {
      type: "Negativa",
      date_time: "2026-03-10T12:00:00.000Z",
      observation: "[COMPORTAMIENTO] Interrumpe la clase",
    },
  ]);

  assert.deepEqual(fresh, [annotations[1]]);
});

test("recorta el nombre del estudiante pegado tras el profesor", () => {
  assert.equal(
    stripTrailingStudentName(
      "MARITZA FERNANDA CARRASCO PALMA MERINO FERNÁNDEZ NICOLÁS IGNACIO",
      "NICOLÁS IGNACIO MERINO FERNÁNDEZ",
    ),
    "MARITZA FERNANDA CARRASCO PALMA",
  );
  assert.equal(
    stripTrailingStudentName(
      "FERNANDA ESCOBAR TOLEDO ALVEAL PINTO MATEO NICOLAS",
      ["ACUÑA CHRISTIANSEN CARLOS ALONSO", "ALVEAL PINTO MATEO NICOLAS"],
    ),
    "FERNANDA ESCOBAR TOLEDO",
  );
  assert.equal(
    stripTrailingStudentName(
      "MANUEL JESÚS FLORES FUENTES GUTIÉRREZ TRONCOSO AGUSTINA PAZ",
      "AGUSTINA PAZ GUTIÉRREZ TRONCOSO",
    ),
    "MANUEL JESÚS FLORES FUENTES",
  );
  assert.equal(
    stripTrailingStudentName(
      "GRACIELA MONICA DEL CARMEN LOPEZ ROJAS",
      "NICOLÁS IGNACIO MERINO FERNÁNDEZ",
    ),
    "GRACIELA MONICA DEL CARMEN LOPEZ ROJAS",
  );
  assert.equal(stripTrailingStudentName(null, "JUAN PÉREZ"), null);
});

test("recorta campos arrastrados tras el nombre del profesor", () => {
  assert.equal(
    cutTrailingFields(
      "MARITZA FERNANDA CARRASCO PALMA Anotación: AUSENTE A EVALUACIÓN .",
    ),
    "MARITZA FERNANDA CARRASCO PALMA",
  );
  assert.equal(
    cutTrailingFields(
      "MARIA EUGENIA MUÑOZ JARA Categoria: RESPONSABILIDAD Anotación: NO REGISTRA APUNTES.",
    ),
    "MARIA EUGENIA MUÑOZ JARA",
  );
  assert.equal(cutTrailingFields("JUAN PÉREZ SOTO"), "JUAN PÉREZ SOTO");
  assert.equal(cutTrailingFields(null), null);
});

function buildMinimalPdf(): Uint8Array {
  const stream =
    "BT /F1 24 Tf 100 700 Td (FICHA PERSONAL DE CONVIVENCIA ESCOLAR) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let index = 1; index <= 5; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

test("el hash del PDF corresponde al contenido del archivo", async () => {
  const { createHash } = await import("node:crypto");
  const bytes = buildMinimalPdf();
  const parsed = await parseBulkDisciplinaryPdf(bytes);
  assert.equal(
    parsed.file_hash,
    createHash("sha256").update(bytes).digest("hex"),
  );
  assert.notEqual(
    parsed.file_hash,
    createHash("sha256").update("").digest("hex"),
  );
});

test("parte los lotes de consulta en tramos acotados", () => {
  assert.deepEqual(chunkQueryIds([]), []);
  assert.deepEqual(chunkQueryIds(["a", "b"]), [["a", "b"]]);
  const ids = Array.from({ length: 45 }, (_, index) => `id-${index}`);
  const chunks = chunkQueryIds(ids);
  assert.equal(chunks.length, 3);
  assert.deepEqual(
    chunks.map((chunk) => chunk.length),
    [20, 20, 5],
  );
  assert.deepEqual(chunks.flat(), ids);
});

test("conserva la redacción completa cuando el PDF repite encabezados", () => {
  const block = [
    "04/09/2026 Tipo: Negativa Categoria: RESPONSABILIDAD",
    "Anotación: ESTUDIANTE NO REALIZA ACTIVIDAD EN EL TRANSCURSO DE LA CLASE Y",
    "Tipo: Negativa Categoria: RESPONSABILIDAD",
    "Anotación: ESTUDIANTE NO REALIZA ACTIVIDAD EN EL TRANSCURSO DE LA CLASE Y SE LE DA LA POSIBILIDAD DE FINALIZAR.",
    "Profesor: VICENTE ALONSO BURGOS ESTRADA",
  ].join(" ");
  assert.equal(
    extractFullAnnotationText(block),
    "ESTUDIANTE NO REALIZA ACTIVIDAD EN EL TRANSCURSO DE LA CLASE Y SE LE DA LA POSIBILIDAD DE FINALIZAR.",
  );
  assert.equal(
    extractFullAnnotationText(
      "04/09/2026 Tipo: Negativa Anotación: LLEGA TARDE. Profesor: X",
    ),
    "LLEGA TARDE.",
  );
  assert.equal(extractFullAnnotationText("Sin marcador de anotación"), "");
});

test("reconoce el registro previo aunque el bloque repita encabezados sin profesor", () => {
  const parsed = [
    {
      fecha_iso: "2026-03-13",
      tipo: "Negativa" as const,
      categoria: "COMPORTAMIENTO",
      profesor: "MARÍA ISABEL MATUS RETAMAL",
      texto: "EN CLASES HAY UN INTERCAMBIO DE PAPELES CON MARTINA HERNÁNDEZ",
      page_number: null,
    },
  ];
  const fresh = selectNewBulkAnnotations(parsed, [
    {
      type: "Negativa",
      date_time: "2026-03-13T12:00:00.000Z",
      observation:
        "13/03/2026 Tipo: Negativa Categoria: COMPORTAMIENTO Anotación: EN CLASES HAY UN INTERCAMBIO DE PAPELES CON MARTINA HERNÁNDEZ Tipo: Negativa Categoria: COMPORTAMIENTO Anotación: EN CLASES HAY UN INTERCAMBIO DE PAPELES",
    },
  ]);
  assert.deepEqual(fresh, []);
});

test("solo cambia la carta cuando la progresión sube de etapa", () => {
  assert.equal(bulkSuggestedLetterType(5, null), "Amonestación Escrita");
  assert.equal(
    bulkSuggestedLetterType(10, "Amonestación Escrita"),
    "Carta de Compromiso Conductual",
  );
  assert.equal(
    bulkSuggestedLetterType(10, "Carta de Compromiso Conductual"),
    null,
  );
  assert.equal(bulkSuggestedLetterType(12, "Ficha de Derivación"), null);
});
