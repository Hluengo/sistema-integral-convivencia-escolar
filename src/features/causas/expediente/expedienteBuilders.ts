/** @license SPDX-License-Identifier: Apache-2.0 */

import type { ExpedienteCompleto } from "@/shared/api/services/expediente.service";
import { normalizeDocumentPath } from "@/shared/api/services/storage.service";
import type {
  BitacoraEntry,
  Causa,
  ExpedienteDocument,
} from "@/shared/lib/types";

/** Anexo rastreable hasta su origen en el expediente. */
export interface ExpedienteAnexo {
  origen: "checklist" | "bitacora" | "expediente";
  refId: string;
  refTitulo: string;
  nombre: string;
  path: string;
}

/** Resultado de la descarga de un anexo para el manifiesto. */
export interface AnexoFetchOutcome {
  nombre: string;
  estado: "incluido" | "faltante";
  detalle?: string;
}

export function sanitizeFileName(value: string): string {
  const clean = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean.slice(0, 80) || "anexo";
}

export function expedienteBaseName(causaId: string, dateStr: string): string {
  return `Expediente_${sanitizeFileName(causaId)}_${dateStr.replaceAll("-", "")}`;
}

/**
 * Todos los documentos subidos sobre la causa, deduplicados por path.
 * Los paths ya vienen normalizados por fetchCausaDetails; se re-normalizan
 * por seguridad porque bitácora/checklist pueden traer URLs firmadas legacy.
 */
export function listExpedienteAnexos(
  causa: Causa,
  documentos: ExpedienteDocument[] = [],
): ExpedienteAnexo[] {
  const seen = new Set<string>();
  const anexos: ExpedienteAnexo[] = [];
  for (const item of causa.checklistDebidoProceso) {
    if (!item.documentoUrl) continue;
    const path = normalizeDocumentPath(item.documentoUrl);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    anexos.push({
      origen: "checklist",
      refId: item.id,
      refTitulo: item.label,
      nombre: item.documentoNombre || path.split("/").pop() || "documento",
      path,
    });
  }
  for (const document of documentos) {
    const path = normalizeDocumentPath(document.storage_path);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    anexos.push({
      origen: "expediente",
      refId: document.id,
      refTitulo: document.display_name || document.original_name,
      nombre: document.display_name || document.original_name,
      path,
    });
  }
  for (const entry of causa.bitacora) {
    if (!entry.documentoAdjunto) continue;
    const path = normalizeDocumentPath(entry.documentoAdjunto);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    anexos.push({
      origen: "bitacora",
      refId: entry.id,
      refTitulo: entry.titulo,
      nombre: path.split("/").pop() || "documento",
      path,
    });
  }
  return anexos;
}

function displayName(causa: Causa, privacyMode: boolean): string {
  return privacyMode ? causa.nnaProtectedName : causa.estudianteNombre;
}

function bitacoraAsc(bitacora: BitacoraEntry[]): BitacoraEntry[] {
  return [...bitacora].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Markdown estructurado para NotebookLM/Gemini: cronología + tablas.
 * Nunca inventa hechos: solo vuelca lo registrado en el expediente.
 */
export function buildExpedienteMarkdown(
  causa: Causa,
  privacyMode: boolean,
  opts: {
    generatedAt: string;
    generatedBy: string;
    expediente?: Pick<
      ExpedienteCompleto,
      | "actuaciones"
      | "avances"
      | "hechos"
      | "vinculosHechoEvidencia"
      | "documentos"
      | "reconsideraciones"
      | "seguimientos"
    >;
  },
): string {
  const nombre = displayName(causa, privacyMode);
  const lines: string[] = [
    `# Expediente ${causa.id} — paquete para informe de cierre`,
    ``,
    `Generado: ${opts.generatedAt} por ${opts.generatedBy}.`,
    privacyMode
      ? `Modo privacidad activado: se usa nombre protegido, sin RUN.`
      : `Modo privacidad desactivado: expediente nominal completo.`,
    ``,
    `## 1. Carátula`,
    ``,
    `- Estudiante: ${nombre} (${causa.estudianteCurso})`,
    `- Apertura: ${causa.fechaApertura} | Estado: ${causa.estadoActual}`,
    `- Tipo infracción: ${causa.tipoInfraccion} | Responsable: ${causa.responsable}`,
    `- Conducta RICE: ${causa.conductaRiceId ?? "No registrada"}`,
    `- Medidas en ejecución: ${(causa.medidasEjecutadas ?? []).join("; ") || "Ninguna registrada"}`,
    ``,
    `## 2. Hechos registrados`,
    ``,
    causa.observaciones.trim() || "(Sin relato registrado)",
    ``,
    `## 3. Checklist debido proceso`,
    ``,
    `| Hito | Estado | Fecha | Registrado por | Documento |`,
    `|---|---|---|---|---|`,
  ];
  for (const item of causa.checklistDebidoProceso) {
    lines.push(
      `| ${item.label} | ${item.completado ? "Completado" : "Pendiente"} | ${item.fechaCompletado ?? "—"} | ${item.registradoPor ?? "—"} | ${item.documentoNombre ?? (item.documentoUrl ? "adjunto" : "—")} |`,
    );
  }
  lines.push(``, `## 4. Bitácora cronológica`, ``);
  const entries = bitacoraAsc(causa.bitacora);
  if (entries.length === 0) lines.push("(Sin entradas de bitácora)");
  for (const entry of entries) {
    lines.push(
      `### ${entry.fecha} — ${entry.titulo} [${entry.tipo}]`,
      ``,
      entry.descripcion,
      ``,
      `- Participantes: ${entry.participantes.join(", ") || "—"}`,
      `- Adjunto: ${entry.documentoAdjunto ? "sí (ver 03_Anexos)" : "no"}`,
      ``,
    );
  }
  if (opts.expediente) {
    const {
      actuaciones,
      avances,
      hechos,
      vinculosHechoEvidencia,
      reconsideraciones,
      seguimientos,
    } = opts.expediente;
    lines.push(
      `## 5. Hechos y evidencias`,
      ``,
      ...hechos.map(
        (hecho) =>
          `- ${hecho.titulo}: ${hecho.estado}; participación=${hecho.participacion_acreditada ? "determinada" : "pendiente"}; evidencia=${vinculosHechoEvidencia.filter((vinculo) => vinculo.hecho_id === hecho.id).length}; RICE=${hecho.rice_articulo ?? "—"}`,
      ),
      hechos.length === 0 ? "(Sin hechos estructurados registrados)" : "",
      ``,
      `## 6. Actuaciones y avances persistidos`,
      ``,
      `- Actuaciones: ${actuaciones.length}`,
      `- Avances: ${avances.length}`,
      `- Documentos: ${opts.expediente.documentos.length}`,
      `- Reconsideraciones: ${reconsideraciones.length}`,
      `- Seguimientos: ${seguimientos.length}`,
      ``,
    );
  }
  lines.push(`## 7. Brechas para el informe de cierre`, ``);
  const brechas: string[] = [];
  if (!causa.conductaRiceId)
    brechas.push("- Falta tipificación de conducta RICE.");
  if (!causa.apoderadoEmail)
    brechas.push("- Falta correo de apoderado para notificación.");
  if (entries.length === 0)
    brechas.push(
      "- Bitácora vacía: no hay evidencia ni entrevistas registradas.",
    );
  lines.push(...(brechas.length > 0 ? brechas : ["- Sin brechas evidentes."]));
  lines.push(``);
  return lines.join("\n");
}

/** JSON canónico del expediente para consumo de IA. */
export function buildExpedienteJson(
  causa: Causa,
  privacyMode: boolean,
  opts: {
    generatedAt: string;
    generatedBy: string;
    expediente?: Pick<
      ExpedienteCompleto,
      | "actuaciones"
      | "avances"
      | "hechos"
      | "vinculosHechoEvidencia"
      | "documentos"
      | "reconsideraciones"
      | "seguimientos"
    >;
  },
): Record<string, unknown> {
  return {
    expedienteId: causa.id,
    generado: opts.generatedAt,
    generadoPor: opts.generatedBy,
    privacidad: privacyMode ? "nombre_protegido" : "nominal",
    estudiante: privacyMode ? causa.nnaProtectedName : causa.estudianteNombre,
    curso: causa.estudianteCurso,
    fechaApertura: causa.fechaApertura,
    estadoActual: causa.estadoActual,
    tipoInfraccion: causa.tipoInfraccion,
    responsable: causa.responsable,
    conductaRiceId: causa.conductaRiceId ?? null,
    medidasEjecutadas: causa.medidasEjecutadas ?? [],
    observaciones: causa.observaciones,
    checklist: causa.checklistDebidoProceso.map((item) => ({
      id: item.id,
      label: item.label,
      completado: item.completado,
      fechaCompletado: item.fechaCompletado ?? null,
      registradoPor: item.registradoPor ?? null,
      documentoNombre: item.documentoNombre ?? null,
      tieneDocumento: Boolean(item.documentoUrl),
    })),
    bitacora: bitacoraAsc(causa.bitacora).map((entry) => ({
      id: entry.id,
      fecha: entry.fecha,
      tipo: entry.tipo,
      titulo: entry.titulo,
      descripcion: entry.descripcion,
      participantes: entry.participantes,
      tieneAdjunto: Boolean(entry.documentoAdjunto),
    })),
    actuaciones: opts.expediente?.actuaciones ?? [],
    avances: opts.expediente?.avances ?? [],
    hechos: opts.expediente?.hechos ?? [],
    evidencias: opts.expediente?.vinculosHechoEvidencia ?? [],
    documentos: opts.expediente?.documentos ?? [],
    reconsideraciones: opts.expediente?.reconsideraciones ?? [],
    seguimientos: opts.expediente?.seguimientos ?? [],
    anexos: listExpedienteAnexos(causa, opts.expediente?.documentos).map(
      (a) => ({
        origen: a.origen,
        refId: a.refId,
        nombre: a.nombre,
      }),
    ),
  };
}

export function buildExpedienteIndice(
  causa: Causa,
  privacyMode: boolean,
  anexos: ExpedienteAnexo[],
): string {
  const nombre = displayName(causa, privacyMode);
  const lines = [
    `# Índice — Expediente ${causa.id} (${nombre})`,
    ``,
    `- 01_CARATULA_Y_DATOS_GENERALES/ — datos generales del expediente.`,
    `- 02_CRONOLOGIA_COMPLETA/ — cronología y actuaciones registradas.`,
    `- 03_RUTA_DEL_DEBIDO_PROCESO/ — hitos y garantías del procedimiento.`,
    `- 15_ANEXOS_ORIGINALES/ — ${anexos.length} documento(s) original(es) tal cual se subieron.`,
    `- 16_DATOS_ESTRUCTURADOS_JSON/ — contenido canónico para NotebookLM/Gemini.`,
    `- 17_MANIFIESTO_DE_ARCHIVOS/ — trazabilidad de anexos incluidos/faltantes.`,
    ``,
    `## Anexos`,
    ``,
  ];
  anexos.forEach((a, i) => {
    lines.push(
      `${i + 1}. [${a.origen}:${a.refId}] ${a.refTitulo} → 15_ANEXOS_ORIGINALES/${a.nombre}`,
    );
  });
  if (anexos.length === 0) lines.push("(Sin anexos subidos en esta causa)");
  lines.push(``);
  return lines.join("\n");
}

export function buildExpedienteManifiesto(
  causaId: string,
  generatedAt: string,
  outcomes: AnexoFetchOutcome[],
): string {
  const incluidos = outcomes.filter((o) => o.estado === "incluido").length;
  const lines = [
    `MANIFIESTO — Expediente ${causaId}`,
    `Generado: ${generatedAt}`,
    `Anexos incluidos: ${incluidos}/${outcomes.length}`,
    ``,
  ];
  for (const o of outcomes) {
    lines.push(
      `- [${o.estado}] ${o.nombre}${o.detalle ? ` (${o.detalle})` : ""}`,
    );
  }
  lines.push(``);
  return lines.join("\n");
}
