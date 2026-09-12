/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Archive, FileDown, FileText, Printer } from "lucide-react";
import { supabase } from "@/shared/api/lib/supabase";
import { saveBitacora } from "@/shared/api/services/bitacora.service";
import { STORAGE_BUCKET } from "@/shared/api/services/storage.service";
import { nowIso } from "@/shared/lib/dateUtils";
import { getCurrentDateStr } from "@/shared/lib/anotacionesUtils";
import { useTimelineContext } from "@/shared/lib/useTimelineContext";
import type { BitacoraEntry, Causa } from "@/shared/lib/types";
import { CARTA_PAGE_STYLE } from "@/shared/ui/printStyles";
import Button from "@/shared/ui/Button";
import {
  buildExpedienteIndice,
  buildExpedienteJson,
  buildExpedienteManifiesto,
  buildExpedienteMarkdown,
  expedienteBaseName,
  listExpedienteAnexos,
  sanitizeFileName,
  type AnexoFetchOutcome,
} from "./expedienteBuilders";

interface ExpedienteExportPanelProps {
  causa: Causa;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Descarga del expediente completo: PDF imprimible + MD/JSON para IA
 * (NotebookLM) + ZIP con anexos reales. Registra auditoría en bitácora.
 */
export default function ExpedienteExportPanel({
  causa,
}: ExpedienteExportPanelProps) {
  const { privacyMode, currentRole, onUpdateCausa } = useTimelineContext();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  const dateStr = getCurrentDateStr();
  const base = useMemo(
    () => expedienteBaseName(causa.id, dateStr),
    [causa.id, dateStr],
  );
  const anexos = useMemo(() => listExpedienteAnexos(causa), [causa]);
  const studentName = privacyMode
    ? causa.nnaProtectedName
    : causa.estudianteNombre;

  const printRef = useRef<HTMLDivElement>(null);
  const generatedBy = `equipo de convivencia (rol ${currentRole})`;

  const auditDownload = useCallback(
    async (formato: string, anexosIncluidos: number) => {
      const entry: BitacoraEntry = {
        id: `b_exp_${crypto.randomUUID()}`,
        fecha: nowIso(),
        tipo: "Otro",
        titulo: `Expediente completo descargado (${formato})`,
        descripcion: `Se descargó el paquete de cierre en formato ${formato} con ${anexosIncluidos}/${anexos.length} anexos incluidos.`,
        participantes: [generatedBy],
      };
      try {
        const next = [entry, ...causa.bitacora];
        const saved = await saveBitacora(causa.id, next, causa.bitacora);
        if (saved) onUpdateCausa({ ...causa, bitacora: next });
      } catch {
        // La descarga ya ocurrió; la auditoría no la bloquea.
      }
    },
    [anexos.length, causa, generatedBy, onUpdateCausa],
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${base}_01_Expediente`,
    pageStyle: CARTA_PAGE_STYLE,
    onAfterPrint: () => {
      setMessage({
        text: "Impresión finalizada. Se registró la descarga en la bitácora.",
        error: false,
      });
      void auditDownload("PDF", 0);
    },
    onPrintError: (_location, error: Error) => {
      setMessage({ text: `Error al imprimir: ${error.message}`, error: true });
    },
  });

  const handleDownloadMarkdown = useCallback(() => {
    setIsBusy(true);
    try {
      const md = buildExpedienteMarkdown(causa, privacyMode, {
        generatedAt: dateStr,
        generatedBy,
      });
      downloadBlob(
        new Blob([md], { type: "text/markdown;charset=utf-8" }),
        `${base}_02_Expediente_para_IA.md`,
      );
      setMessage({
        text: "Markdown descargado. Súbelo a NotebookLM junto a los anexos.",
        error: false,
      });
      void auditDownload("MD", 0);
    } finally {
      setIsBusy(false);
    }
  }, [auditDownload, base, causa, dateStr, generatedBy, privacyMode]);

  const handleDownloadZip = useCallback(async () => {
    setIsBusy(true);
    setMessage(null);
    try {
      const { zipSync, strToU8 } = await import("fflate");
      const generatedAt = nowIso();
      const md = buildExpedienteMarkdown(causa, privacyMode, {
        generatedAt,
        generatedBy,
      });
      const json = JSON.stringify(
        buildExpedienteJson(causa, privacyMode, { generatedAt, generatedBy }),
        null,
        2,
      );
      const files: Record<string, Uint8Array> = {
        "00_INDICE.md": strToU8(
          buildExpedienteIndice(causa, privacyMode, anexos),
        ),
        "02_Expediente_para_IA.md": strToU8(md),
        "02_datos.json": strToU8(json),
      };
      const outcomes: AnexoFetchOutcome[] = [];
      const usedNames = new Set<string>();
      for (let i = 0; i < anexos.length; i += 1) {
        const anexo = anexos[i]!;
        const safeBase = sanitizeFileName(anexo.nombre);
        let fileName = `${String(i + 1).padStart(2, "0")}_${safeBase}`;
        let suffix = 1;
        while (usedNames.has(fileName)) {
          suffix += 1;
          fileName = `${String(i + 1).padStart(2, "0")}_${suffix}_${safeBase}`;
        }
        usedNames.add(fileName);
        try {
          const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(anexo.path, 300);
          if (error || !data?.signedUrl)
            throw new Error(error?.message || "sin URL firmada");
          const res = await fetch(data.signedUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          files[`03_Anexos/${fileName}`] = new Uint8Array(
            await res.arrayBuffer(),
          );
          outcomes.push({ nombre: fileName, estado: "incluido" });
        } catch (error) {
          outcomes.push({
            nombre: fileName,
            estado: "faltante",
            detalle: error instanceof Error ? error.message : "desconocido",
          });
        }
      }
      files["MANIFIESTO.txt"] = strToU8(
        buildExpedienteManifiesto(causa.id, generatedAt, outcomes),
      );
      const zipBytes = zipSync(files, { level: 6 });
      // ponytail: ZIP sin compresión máxima para no bloquear el hilo principal en equipos lentos
      downloadBlob(
        new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/zip" }),
        `${base}.zip`,
      );
      const incluidos = outcomes.filter((o) => o.estado === "incluido").length;
      setMessage({
        text: `ZIP descargado con ${incluidos}/${anexos.length} anexos. Revisa MANIFIESTO.txt por faltantes.`,
        error: false,
      });
      void auditDownload("ZIP", incluidos);
    } catch (error) {
      setMessage({
        text: `No se pudo generar el ZIP: ${error instanceof Error ? error.message : "desconocido"}`,
        error: true,
      });
    } finally {
      setIsBusy(false);
    }
  }, [anexos, auditDownload, base, causa, generatedBy, privacyMode]);

  return (
    <div className="space-y-3">
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            message.error
              ? "bg-gravisima-50 text-gravisima-700"
              : "bg-leve-50 text-leve-700"
          }`}
        >
          {message.text}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="custom"
          onClick={() => handlePrint()}
          disabled={isBusy}
          className="rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-white shadow-xs hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </Button>
        <Button
          variant="secondary"
          onClick={handleDownloadMarkdown}
          disabled={isBusy}
          className="rounded-xl px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" /> MD para IA
        </Button>
        <Button
          variant="custom"
          onClick={() => void handleDownloadZip()}
          disabled={isBusy}
          className="rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white shadow-xs hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Archive className="h-4 w-4" />{" "}
          {isBusy ? "Generando…" : `ZIP completo (${anexos.length})`}
        </Button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-neutral-500">
        <FileDown className="h-3.5 w-3.5" />
        Incluye carátula, checklist, bitácora y {anexos.length} anexo(s). El PDF
        se genera por impresión; el ZIP trae MD + JSON + anexos reales para
        NotebookLM.
      </p>

      {/* Contenido imprimible: solo visible para react-to-print */}
      <div className="hidden print:block">
        <div
          ref={printRef}
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "11pt",
            color: "#111",
          }}
        >
          <h1 style={{ fontSize: "14pt" }}>
            Expediente {causa.id} — {studentName}
          </h1>
          <p>
            {causa.estudianteCurso} | Apertura {causa.fechaApertura} | Estado{" "}
            {causa.estadoActual} | Falta {causa.tipoInfraccion} | Responsable{" "}
            {causa.responsable}
          </p>
          <h2>Hechos registrados</h2>
          <p>{causa.observaciones || "(Sin relato registrado)"}</p>
          <h2>Checklist debido proceso</h2>
          <ul>
            {causa.checklistDebidoProceso.map((item) => (
              <li key={item.id}>
                [{item.completado ? "X" : " "}] {item.label} —{" "}
                {item.fechaCompletado ?? "pendiente"}
                {item.documentoNombre
                  ? ` (adjunto: ${item.documentoNombre})`
                  : ""}
              </li>
            ))}
          </ul>
          <h2>Bitácora cronológica</h2>
          {[...causa.bitacora]
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map((entry) => (
              <div key={entry.id}>
                <h3>
                  {entry.fecha} — {entry.titulo} [{entry.tipo}]
                </h3>
                <p>{entry.descripcion}</p>
                <p>Participantes: {entry.participantes.join(", ") || "—"}</p>
              </div>
            ))}
          <h2>Anexos ({anexos.length})</h2>
          <ul>
            {anexos.map((a) => (
              <li key={`${a.origen}:${a.refId}`}>
                [{a.origen}] {a.refTitulo} → {a.nombre}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
