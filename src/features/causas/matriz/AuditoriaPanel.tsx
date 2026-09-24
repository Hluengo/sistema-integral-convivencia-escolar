/** @license SPDX-License-Identifier: Apache-2.0 */

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, ShieldAlert } from "lucide-react";
import type { Causa } from "@/shared/lib/types";
import type {
  HechoRow,
  HechoEvidenciaRow,
} from "@/shared/api/services/hechos.service";
import { fetchReconsideraciones } from "@/shared/api/services/reconsideracion.service";
import { fetchSeguimiento } from "@/shared/api/services/seguimiento.service";
import { auditarExpediente } from "@/shared/lib/auditoria";

export default function AuditoriaPanel({
  causa,
  hechos,
  vinculos,
}: {
  causa: Causa;
  hechos: HechoRow[];
  vinculos: HechoEvidenciaRow[];
}) {
  const reconsideracionesQuery = useQuery({
    queryKey: ["reconsideraciones", causa.id, "auditoria"],
    queryFn: () => fetchReconsideraciones(causa.id),
  });
  const seguimientoQuery = useQuery({
    queryKey: ["seguimiento", causa.id, "auditoria"],
    queryFn: () => fetchSeguimiento(causa.id),
  });
  const audit = auditarExpediente(causa, hechos, vinculos, {
    reconsideraciones: reconsideracionesQuery.data ?? [],
    seguimientos: (seguimientoQuery.data ?? []).map((record) => ({
      id: record.id,
      estado: record.estado,
      fecha: record.fecha_inicio,
      descripcion: record.descripcion,
      titulo: record.titulo,
      responsable: record.responsable,
      fechaFin: record.fecha_fin,
      cumplimiento: record.cumplimiento,
      evaluacion: record.evaluacion,
    })),
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-sm text-slate-900">
          <ShieldAlert className="size-4 text-brand-600" /> Estado
          jurídico-procedimental
        </h3>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${audit.puedeCerrar ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
        >
          Auditoría: {audit.verificadas}/{audit.total}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {audit.checks.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
              c.estado === "verificada"
                ? "border-green-200 bg-green-50 text-green-800"
                : c.estado === "bloqueante"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : c.estado === "no_aplica"
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
            title={c.detalle}
          >
            {c.estado === "verificada" ? (
              <CheckCircle2 className="size-3.5 shrink-0" />
            ) : c.estado === "bloqueante" ? (
              <AlertTriangle className="size-3.5 shrink-0" />
            ) : (
              <Circle className="size-3.5 shrink-0" />
            )}
            <span className="truncate font-medium">{c.label}</span>
            <span className="ml-auto truncate text-11px text-current">
              {c.detalle}
            </span>
          </div>
        ))}
      </div>

      {audit.advertencias.length > 0 && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
        >
          <ul className="list-disc pl-4">
            {audit.advertencias.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {!audit.puedeCerrar && (
        <p className="mt-2 text-11px font-semibold text-red-700">
          ⚠️ No cerrar todavía — complete garantías bloqueantes.
        </p>
      )}
    </div>
  );
}
