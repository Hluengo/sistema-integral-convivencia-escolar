/** @license SPDX-License-Identifier: Apache-2.0 */
// Piloto solo-lectura: extrae fichas de Archivos/1MA.pdf, sin escribir a Supabase.
// Uso: node scripts/pilot-fichas-1ma.mjs [ruta-pdf] [salida-json]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pdfPath = resolve(process.argv[2] ?? `${here}/../Archivos/1MA.pdf`);
const outPath =
  process.argv[3] ??
  "C:/Users/heae2/AppData/Local/Temp/opencode/pilot-1ma.json";

if (typeof globalThis.navigator === "undefined") {
  globalThis.navigator = { userAgent: "node" };
}

const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
globalThis.pdfjsWorker = {
  WorkerMessageHandler: workerModule.WorkerMessageHandler,
};
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const buf = readFileSync(pdfPath);
const pdf = await pdfjs.getDocument({
  data: new Uint8Array(buf),
  useWorkerFetch: false,
  isEvalSupported: false,
}).promise;

const pages = [];
for (let n = 1; n <= pdf.numPages; n += 1) {
  const page = await pdf.getPage(n);
  const content = await page.getTextContent();
  pages.push(
    content.items
      .map((it) => (it.str ?? "") + (it.hasEOL ? "\n" : " "))
      .join("")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim(),
  );
}
const fullText = pages.join("\n\x0c\n");

// Cada ficha arranca con "NOMBRE\nFICHA PERSONAL DE CONVIVENCIA ESCOLAR"
const parts = fullText.split(/FICHA PERSONAL DE CONVIVENCIA ESCOLAR/i);
const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toIso = (d) => {
  const m = d?.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

const students = [];
for (let i = 1; i < parts.length; i += 1) {
  const head = parts[i - 1]
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const name = (head[head.length - 1] ?? `SIN_NOMBRE_${i}`).toUpperCase();
  const body = parts[i];
  const courseM =
    body.match(/(\d\s*[A-Z]\s*(?:MEDIO|BASICO|BASICA))/i) ??
    body.match(/((?:MEDIO|BASICO|BASICA)\s*\d?\s*[A-Z]?)/i);
  const course = (courseM?.[1] ?? "").replace(/\s+/g, " ").trim().toUpperCase();

  // Bloques por fecha; fragmentos sin fecha se anexan al anterior
  const withBreaks = body.replace(
    /\s+(?=\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/g,
    "\n",
  );
  const lines = withBreaks
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const raw = [];
  let cur = null;
  for (const line of lines) {
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(line)) {
      if (cur) raw.push(cur);
      cur = line;
    } else if (cur) {
      cur += ` ${line}`;
    }
  }
  if (cur) raw.push(cur);

  const seen = new Set();
  const annotations = [];
  let dupes = 0;
  let headerSkip = 0;
  for (const b of raw) {
    // Solo bloques con Tipo: son anotaciones reales; el resto es
    // rango de fechas, encabezado del colegio o fragmentos huérfanos
    if (!/Tipo\s*:/i.test(b)) {
      headerSkip += 1;
      continue;
    }
    const fecha = b.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/)?.[1] ?? null;
    const tipo =
      b.match(/Tipo\s*:\s*(Negativa|Positiva|Informaci[óo]n)/i)?.[1] ?? null;
    const categoria =
      b
        .match(
          /Categoria\s*:\s*(RESPONSABILIDAD\s+Y\s+COMPORTAMIENTO|RESPONSABILIDAD|COMPORTAMIENTO|INFORMACI[ÓOÒ]N|ENTREVISTA)/i,
        )?.[1]
        ?.trim()
        .toUpperCase() ?? null;
    const profesor =
      b
        .match(
          /Profesor\s*:\s*([^|]{3,80}?)(?=\s*\d{1,2}[/-]\d{1,2}|\s*$)/i,
        )?.[1]
        ?.trim() ??
      b.match(/Profesor\s*:\s*(.+)$/i)?.[1]?.trim() ??
      null;
    let texto =
      b
        .match(/Anotaci[óo]n\s*:\s*(.+?)(?=\s*Profesor\s*:|$)/is)?.[1]
        ?.replace(/\s+/g, " ")
        .trim() ?? b.replace(/\s+/g, " ").trim().slice(0, 2000);
    // La copia duplicada del PDF suele venir pegada sin fecha dentro del
    // mismo bloque: cortar en la segunda ocurrencia de "Tipo:".
    texto = texto.split(/\s*Tipo\s*:/i)[0].trim();
    const key = [fecha, norm(tipo), norm(texto).slice(0, 120)].join("|");
    if (seen.has(key)) {
      dupes += 1;
      continue;
    }
    seen.add(key);
    annotations.push({
      fecha,
      fecha_iso: toIso(fecha),
      tipo,
      categoria,
      profesor,
      texto,
    });
  }
  students.push({
    nombre: name,
    curso: course,
    raw_bloques: raw.length,
    encabezado_ignorado: headerSkip,
    duplicados_eliminados: dupes,
    anotaciones_unicas: annotations.length,
    anotaciones: annotations,
  });
}

const totals = {
  archivo: pdfPath,
  paginas: pages.length,
  estudiantes: students.length,
  bloques_raw: students.reduce((a, s) => a + s.raw_bloques, 0),
  encabezados_ignorados: students.reduce(
    (a, s) => a + (s.encabezado_ignorado ?? 0),
    0,
  ),
  duplicados: students.reduce((a, s) => a + s.duplicados_eliminados, 0),
  unicas: students.reduce((a, s) => a + s.anotaciones_unicas, 0),
  por_tipo: {},
  sin_fecha_o_tipo: students.flatMap((s) =>
    s.anotaciones
      .filter((a) => !a.fecha || !a.tipo)
      .map((a) => ({ estudiante: s.nombre, ...a })),
  ).length,
};
for (const s of students)
  for (const a of s.anotaciones)
    totals.por_tipo[a.tipo ?? "SIN_TIPO"] =
      (totals.por_tipo[a.tipo ?? "SIN_TIPO"] ?? 0) + 1;

writeFileSync(outPath, JSON.stringify({ totals, students }, null, 2), "utf8");
console.log(JSON.stringify(totals, null, 2));
console.log(`\nPrimeros 3 estudiantes con 2 anotaciones c/u:`);
for (const s of students.slice(0, 3)) {
  console.log(
    `\n== ${s.nombre} (${s.curso}) unicas=${s.anotaciones_unicas} dupes=${s.duplicados_eliminados}`,
  );
  for (const a of s.anotaciones.slice(0, 2))
    console.log(
      ` - ${a.fecha} | ${a.tipo} | ${a.categoria} | ${a.profesor} | ${a.texto.slice(0, 90)}`,
    );
}
console.log(`\nJSON completo: ${outPath}`);
