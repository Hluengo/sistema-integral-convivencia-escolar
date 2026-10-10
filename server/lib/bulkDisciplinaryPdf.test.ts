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
  matchTeacherName,
  resolveTeacherAndContinuation,
  textsOverlap,
  parseBlock,
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
      "ESTER NOEMI CONTRERAS ESPINOZA Anotación: ALUMNA QUE LLEGA TARDE .-",
    ),
    "ESTER NOEMI CONTRERAS ESPINOZA",
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

test("parseBlock no arrastra etiquetas con acento descompuesto al profesor", () => {
  const parsed = parseBlock(
    "13-08-2026 Tipo: Negativa Categoria: RESPONSABILIDAD Anotación: ALUMNA QUE LLEGA TARDE .- Profesor: ESTER NOEMI CONTRERAS ESPINOZA Anotación: ALUMNA QUE LLEGA TARDE .-",
    null,
    "BENJAMÍN IGNACIO CARRASCO SOTO",
  );
  assert.equal(parsed?.profesor, "ESTER NOEMI CONTRERAS ESPINOZA");
});

test("parseBlock detiene al profesor antes del encabezado de la ficha siguiente", () => {
  const parsed = parseBlock(
    "01-10-2026 Tipo: Negativa Categoria: COMPORTAMIENTO Anotación: TOMA DEL CUELLO. Profesor: CESAR MANUEL AVILES MUÑOZ GUTIÉRREZ AGUILAR JORGE ALONSO FICHA PERSONAL DE CONVIVENCIA ESCOLAR",
    null,
    "VICENTE IGNACIO GUAJARDO CAMPOS",
  );
  assert.ok(
    !(parsed?.profesor ?? "").includes("FICHA PERSONAL"),
    `profesor contaminado: ${parsed?.profesor}`,
  );
});

test("matchTeacherName prefiere la coincidencia más larga sin acentos", () => {
  const roster = [
    "MARÍA ISABEL MATUS RETAMAL",
    "MARITZA FERNANDA CARRASCO PALMA",
  ];
  assert.equal(
    matchTeacherName("maria isabel matus retamal arancibia vidal", roster),
    "MARÍA ISABEL MATUS RETAMAL",
  );
  assert.equal(matchTeacherName("DOCENTE DESCONOCIDO", roster), null);
  assert.equal(matchTeacherName(null, roster), null);
  assert.equal(matchTeacherName("MARÍA ISABEL MATUS RETAMAL", []), null);
});

test("parseBlock reconoce al docente de la nómina aunque venga con cola", () => {
  const parsed = parseBlock(
    "01-10-2026 Tipo: Negativa Categoria: COMPORTAMIENTO Anotación: TOMA DEL CUELLO. Profesor: CESAR MANUEL AVILES MUÑOZ GUTIÉRREZ AGUILAR JORGE ALONSO 25-09-2026",
    null,
    "VICENTE IGNACIO GUAJARDO CAMPOS",
    ["CESAR MANUEL AVILES MUÑOZ", "MARÍA ISABEL MATUS RETAMAL"],
  );
  assert.equal(parsed?.profesorReconocido, true);
  // La canonización ocurre en la segunda pasada (requiere todos los nombres).
  const resolved = resolveTeacherAndContinuation(
    parsed?.profesor ?? null,
    parsed?.texto ?? "",
    ["CESAR MANUEL AVILES MUÑOZ", "MARÍA ISABEL MATUS RETAMAL"],
    ["VICENTE IGNACIO GUAJARDO CAMPOS"],
  );
  assert.equal(resolved.profesor, "CESAR MANUEL AVILES MUÑOZ");
});

test("parseBlock marca no reconocido cuando nadie de la nómina calza", () => {
  const parsed = parseBlock(
    "01-10-2026 Tipo: Negativa Categoria: COMPORTAMIENTO Anotación: X. Profesor: DOCENTE DESCONOCIDO",
    null,
    "VICENTE IGNACIO GUAJARDO CAMPOS",
    ["CESAR MANUEL AVILES MUÑOZ"],
  );
  assert.equal(parsed?.profesor, "DOCENTE DESCONOCIDO");
  assert.equal(parsed?.profesorReconocido, false);
});

test("parseBlock omite el indicador cuando no hay nómina cargada", () => {
  const parsed = parseBlock(
    "01-10-2026 Tipo: Negativa Categoria: COMPORTAMIENTO Anotación: X. Profesor: DOCENTE DESCONOCIDO",
    null,
    "VICENTE IGNACIO GUAJARDO CAMPOS",
  );
  assert.equal(parsed?.profesor, "DOCENTE DESCONOCIDO");
  assert.equal(parsed?.profesorReconocido, undefined);
});

test("textsOverlap detecta la versión truncada junto a la completa", () => {
  assert.equal(
    textsOverlap(
      "CONVERSA CONSTANTEMENTE CON JAVIER LILLO . NO TRAE SU LIBRO Y",
      "CONVERSA CONSTANTEMENTE CON JAVIER LILLO . NO TRAE SU LIBRO Y NO PONE ATENCIÓN.",
    ),
    true,
  );
  assert.equal(textsOverlap("ALUMNO GRITA.", "ALUMNA GRITA."), false);
  assert.equal(textsOverlap("CORTO.", "CORTO Y ALGO MÁS."), false);
});

test("selectNewBulkAnnotations reconoce el prefijo guardado al confirmar", () => {
  const kept = selectNewBulkAnnotations(
    [
      {
        fecha_iso: "2026-03-31",
        tipo: "Positiva",
        categoria: "RESPONSABILIDAD",
        profesor: "VALENTINA ANDREA ALBORNOZ TOLOZA",
        texto:
          "LEE EN VOZ ALTA PARA SUS COMPAÑEROS Y PARTICIPA ENTREGANDO SUS INTERPRETACIONES EN CLASE.",
        page_number: 1,
      },
    ],
    [
      {
        type: "Positiva",
        date_time: "2026-03-31",
        observation:
          "[RESPONSABILIDAD] LEE EN VOZ ALTA PARA SUS COMPAÑEROS Y PARTICIPA ENTREGANDO SUS INTERPRETACIONES EN CLASE.",
      },
    ],
  );
  assert.equal(kept.length, 0);
});

test("selectNewBulkAnnotations omite el truncado ya registrado", () => {
  const full =
    "CONVERSA CONSTANTEMENTE CON JAVIER LILLO . NO TRAE SU LIBRO Y NO PONE ATENCIÓN.";
  const kept = selectNewBulkAnnotations(
    [
      {
        fecha_iso: "2026-07-24",
        tipo: "Negativa",
        categoria: "RESPONSABILIDAD Y COMPORTAMIENTO",
        profesor: "VALENTINA ANDREA ALBORNOZ TOLOZA",
        texto: full,
        page_number: 1,
      },
    ],
    [
      {
        type: "Negativa",
        date_time: "2026-07-24",
        observation:
          "CONVERSA CONSTANTEMENTE CON JAVIER LILLO . NO TRAE SU LIBRO Y",
      },
    ],
  );
  assert.equal(kept.length, 0);
});

test("resolveTeacherAndContinuation recupera texto tras salto de página", () => {
  const roster = ["SILVANA LORETO PINCHEIRA RODRÍGUEZ"];
  const students = ["MILLA AGUAYO MAGDALENA PAZ"];
  const out = resolveTeacherAndContinuation(
    "SILVANA LORETO PINCHEIRA RODRÍGUEZ LA ASIGNATURA. MILLA AGUAYO MAGDALENA PAZ",
    "NO DESARROLLA ACTIVIDADES DE LA CLASE . ADEMÁS NO TRAE LIBRO DE",
    roster,
    students,
  );
  assert.equal(out.profesor, "SILVANA LORETO PINCHEIRA RODRÍGUEZ");
  assert.equal(
    out.texto,
    "NO DESARROLLA ACTIVIDADES DE LA CLASE . ADEMÁS NO TRAE LIBRO DE LA ASIGNATURA.",
  );
});

test("resolveTeacherAndContinuation no pega colas si el texto está completo", () => {
  const out = resolveTeacherAndContinuation(
    "SILVANA LORETO PINCHEIRA RODRÍGUEZ LA ASIGNATURA.",
    "TEXTO COMPLETO.",
    ["SILVANA LORETO PINCHEIRA RODRÍGUEZ"],
    [],
  );
  assert.equal(out.profesor, "SILVANA LORETO PINCHEIRA RODRÍGUEZ");
  assert.equal(out.texto, "TEXTO COMPLETO.");
});

test("resolveTeacherAndContinuation sin nómina solo recorta al estudiante", () => {
  const out = resolveTeacherAndContinuation(
    "DOCENTE DESCONOCIDO MILLA AGUAYO MAGDALENA PAZ",
    "TEXTO.",
    [],
    ["MILLA AGUAYO MAGDALENA PAZ"],
  );
  assert.equal(out.profesor, "DOCENTE DESCONOCIDO");
  assert.equal(out.texto, "TEXTO.");
});

test("parseBlock une Profesor partido por salto de página", () => {
  const parsed = parseBlock(
    "14/04/2026 Tipo: Información Categoria: INFORMACIÓN Anotación: SE REGISTRA DEC DE ESTUDIANTE Profes or: VANNIA ANDREA RETAMAL SALGADO",
    null,
    "PEPITO PRUEBA",
  );
  assert.equal(parsed?.profesor, "VANNIA ANDREA RETAMAL SALGADO");
  assert.equal(parsed?.texto, "SE REGISTRA DEC DE ESTUDIANTE");
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
