/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Trash2,
  User,
} from "lucide-react";
import type { Causa } from "@/shared/lib/types";
import Button from "@/shared/ui/Button";
import {
  createSeguimiento,
  deleteSeguimiento,
  fetchSeguimiento,
  updateSeguimiento,
  type SeguimientoEstado,
  type SeguimientoRow,
} from "@/shared/api/services/seguimiento.service";
import { getSeguimientoPlazo } from "@/shared/api/services/seguimientoPlazo";
import { useAuthStore } from "@/shared/lib/stores/authStore";

const estadoTone: Record<SeguimientoEstado, string> = {
  pendiente: "bg-slate-100 text-slate-700 border-slate-200",
  en_curso: "bg-sky-100 text-sky-700 border-sky-200",
  cumplido: "bg-green-100 text-green-700 border-green-200",
  incumplido: "bg-red-100 text-red-700 border-red-200",
  evaluado: "bg-purple-100 text-purple-700 border-purple-200",
};

const estadoLabel: Record<SeguimientoEstado, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cumplido: "Cumplido",
  incumplido: "Incumplido",
  evaluado: "Evaluado",
};

const plazoTone = {
  sin_plazo: "bg-slate-100 text-slate-600 border-slate-200",
  vigente: "bg-green-50 text-green-700 border-green-200",
  proximo: "bg-amber-50 text-amber-700 border-amber-200",
  vencido: "bg-red-50 text-red-700 border-red-200",
  cerrado: "bg-purple-50 text-purple-700 border-purple-200",
} as const;

const plazoLabel = {
  sin_plazo: "Sin fecha límite",
  vigente: "En plazo",
  proximo: "Vence pronto",
  vencido: "Plazo vencido",
  cerrado: "Cerrado",
} as const;

export default function SeguimientoPanel({ causa }: { causa: Causa }) {
  const tenantId = useAuthStore((s) => s.tenantId);
  const qc = useQueryClient();
  const key = useMemo(
    () => ["seguimiento", causa.id, tenantId] as const,
    [causa.id, tenantId],
  );
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchSeguimiento(causa.id),
    enabled: Boolean(causa.id),
  });
  const planes = q.data ?? [];

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = useCallback(
    () => void qc.invalidateQueries({ queryKey: key }),
    [qc, key],
  );

  const handleCreate = useCallback(async () => {
    if (titulo.trim().length < 4) {
      setError("Título mínimo 4 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    const row = await createSeguimiento({
      causaId: causa.id,
      incidenteId: causa.incidenteId ?? null,
      titulo,
      descripcion,
      responsable,
      fechaFin: fechaFin || null,
    });
    setBusy(false);
    if (!row) {
      setError("No se pudo crear. Verifica sesión.");
      return;
    }
    setTitulo("");
    setDescripcion("");
    setResponsable("");
    setFechaFin("");
    invalidate();
  }, [
    causa.id,
    causa.incidenteId,
    descripcion,
    fechaFin,
    invalidate,
    responsable,
    titulo,
  ]);

  const handleUpdate = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<SeguimientoRow, "estado" | "cumplimiento" | "evaluacion">
      >,
    ) => {
      const ok = await updateSeguimiento(id, patch);
      if (ok) invalidate();
    },
    [invalidate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteSeguimiento(id);
      if (ok) invalidate();
    },
    [invalidate],
  );

  const enSeguimiento =
    causa.estadoActual.includes("Seguimiento") ||
    causa.estadoActual === "Causa Cerrada";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="flex items-center gap-2 font-semibold text-sm text-slate-900">
          <ClipboardList className="size-4 text-brand-600" /> Programa de
          intervención post-cierre
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Define medidas formativas, responsable, plazo y registra cumplimiento
          y evaluación. Queda trazado en el expediente
          {causa.incidenteId ? " y incidente grupal" : ""}.
        </p>
        {!enSeguimiento && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            El expediente aún no está en Seguimiento. Puedes anticipar el plan;
            se activará al cerrar.
          </p>
        )}

        <div className="mt-3 grid gap-3">
          <div>
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor="seg-titulo"
            >
              Título / objetivo *
            </label>
            <input
              id="seg-titulo"
              aria-label="Título u objetivo del programa"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Acompañamiento socioemocional quincenal"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor="seg-desc"
            >
              Acciones / medidas
            </label>
            <textarea
              id="seg-desc"
              aria-label="Acciones o medidas del programa"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Medidas formativas, frecuencia, apoyos"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="text-xs font-medium text-slate-700"
                htmlFor="seg-resp"
              >
                Responsable
              </label>
              <input
                id="seg-resp"
                aria-label="Responsable del programa"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Ej: Orientadora"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label
                className="text-xs font-medium text-slate-700"
                htmlFor="seg-fin"
              >
                Fecha límite
              </label>
              <input
                id="seg-fin"
                type="date"
                aria-label="Fecha límite del programa"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button
            onClick={() => void handleCreate()}
            disabled={busy}
            variant="custom"
            className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Agregar al plan"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {q.isLoading && (
          <p className="text-xs text-slate-500">Cargando seguimiento…</p>
        )}
        {planes.length === 0 && !q.isLoading && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            Sin plan post-cierre. Crea el primer programa de intervención.
          </p>
        )}
        {planes.map((p) => {
          const cumplimientoId = `seg-cumplimiento-${p.id}`;
          const plazo = getSeguimientoPlazo(p.fecha_fin, p.estado);
          const evaluacionId = `seg-evaluacion-${p.id}`;

          return (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900">
                    {p.titulo}
                  </h4>
                  {p.descripcion && (
                    <p className="mt-1 text-xs text-slate-600">
                      {p.descripcion}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {p.responsable && (
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3.5" /> {p.responsable}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5" /> {p.fecha_inicio}
                      {p.fecha_fin ? ` → ${p.fecha_fin}` : ""}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(p.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar programa"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoTone[p.estado]}`}
                >
                  {estadoLabel[p.estado]}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${plazoTone[plazo]}`}
                >
                  {plazoLabel[plazo]}
                </span>
                <select
                  value={p.estado}
                  onChange={(e) =>
                    void handleUpdate(p.id, {
                      estado: e.target.value as SeguimientoEstado,
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  aria-label="Cambiar estado"
                >
                  {Object.entries(estadoLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="font-semibold text-neutral-700 text-xs"
                    htmlFor={cumplimientoId}
                  >
                    Cumplimiento
                  </label>
                  <textarea
                    id={cumplimientoId}
                    aria-label="Cumplimiento del programa"
                    defaultValue={p.cumplimiento}
                    onBlur={(e) => {
                      if (e.target.value !== p.cumplimiento)
                        void handleUpdate(p.id, {
                          cumplimiento: e.target.value,
                        });
                    }}
                    rows={2}
                    placeholder="Avances, asistencia, evidencias"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label
                    className="font-semibold text-neutral-700 text-xs"
                    htmlFor={evaluacionId}
                  >
                    Evaluación
                  </label>
                  <textarea
                    id={evaluacionId}
                    aria-label="Evaluación del programa"
                    defaultValue={p.evaluacion}
                    onBlur={(e) => {
                      if (e.target.value !== p.evaluacion)
                        void handleUpdate(p.id, { evaluacion: e.target.value });
                    }}
                    rows={2}
                    placeholder="Logros, ajustes, cierre"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              {plazo === "vencido" && (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-11px text-red-700">
                  El plazo del plan venció. Registra el cumplimiento, ajusta la
                  fecha o marca el incumplimiento.
                </p>
              )}
              {plazo === "proximo" && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-11px text-amber-700">
                  Este plan vence dentro de 3 días.
                </p>
              )}
              {p.estado === "cumplido" && !p.evaluacion && (
                <p className="mt-2 flex items-center gap-1 text-11px text-amber-700">
                  <CheckCircle2 className="size-3.5" /> Cumplido sin evaluación
                  — registra evaluación para cerrar el ciclo.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
