/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  File,
  Trash2,
} from "lucide-react";
import Button from "@/shared/ui/Button";
import {
  createPlanGestion,
  deletePlanGestion,
  fetchPlanGestion,
  updatePlanGestion,
  type PlanGestionEstado,
  type PlanGestionRow,
} from "@/shared/api/services/planGestion.service";
import { useAuthStore } from "@/shared/lib/stores/authStore";

const estadoTone: Record<PlanGestionEstado, string> = {
  pendiente: "bg-slate-100 text-slate-700 border-slate-200",
  en_curso: "bg-sky-100 text-sky-700 border-sky-200",
  cumplido: "bg-green-100 text-green-700 border-green-200",
  evaluado: "bg-purple-100 text-purple-700 border-purple-200",
  atrasado: "bg-red-100 text-red-700 border-red-200",
};

const estadoLabel: Record<PlanGestionEstado, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cumplido: "Cumplido",
  evaluado: "Evaluado",
  atrasado: "Atrasado",
};

export default function PlanGestionView() {
  const tenantId = useAuthStore((s) => s.tenantId);
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);

  const key = useMemo(
    () => ["plan_gestion", tenantId, ano] as const,
    [tenantId, ano],
  );
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchPlanGestion(ano),
    enabled: Boolean(tenantId),
  });
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const [objetivo, setObjetivo] = useState("");
  const [accion, setAccion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [indicador, setIndicador] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const byEstado = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.estado] = (acc[r.estado] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: rows.length,
      cumplidos: byEstado["cumplido"] ?? 0,
      enCurso: byEstado["en_curso"] ?? 0,
      pendientes: byEstado["pendiente"] ?? 0,
    };
  }, [rows]);

  const invalidate = useCallback(
    () => void qc.invalidateQueries({ queryKey: key }),
    [qc, key],
  );

  const handleCreate = useCallback(async () => {
    if (objetivo.trim().length < 4 || accion.trim().length < 4) {
      setError("Objetivo y acción mínimo 4 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    const row = await createPlanGestion({
      ano,
      objetivo,
      accion,
      responsable,
      fechaFin: fechaFin || null,
      indicador,
    });
    setBusy(false);
    if (!row) {
      setError(
        "No se pudo crear. Verifica permisos (requiere admin/direccion/convivencia).",
      );
      return;
    }
    setObjetivo("");
    setAccion("");
    setResponsable("");
    setIndicador("");
    setFechaFin("");
    invalidate();
  }, [ano, objetivo, accion, responsable, fechaFin, indicador, invalidate]);

  const handleUpdate = useCallback(
    async (
      id: string,
      patch: Partial<Pick<PlanGestionRow, "estado" | "indicador">>,
    ) => {
      const ok = await updatePlanGestion(id, patch);
      if (ok) invalidate();
    },
    [invalidate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deletePlanGestion(id);
      if (ok) invalidate();
    },
    [invalidate],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <ClipboardCheck className="size-5 text-brand-600" /> Plan de
              Gestión de Convivencia
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Objetivos, acciones preventivas, responsables, plazos, indicadores
              y evidencias del año. Cumple Circular 482 y sustenta la gestión
              anual del establecimiento.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label
              className="text-xs font-semibold text-slate-600"
              htmlFor="plan-ano"
            >
              Año
            </label>
            <select
              id="plan-ano"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          <strong className="text-slate-900">{stats.total}</strong> acciones ·{" "}
          {stats.enCurso} en curso · {stats.cumplidos} cumplidas ·{" "}
          {stats.pendientes} pendientes
        </p>

        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60">
          <summary className="cursor-pointer list-none p-4 font-semibold text-sm text-slate-900">
            Nueva acción preventiva
          </summary>
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="mt-3 grid gap-3">
              <div>
                <label
                  className="text-xs font-medium text-slate-700"
                  htmlFor="plan-objetivo"
                >
                  Objetivo *
                </label>
                <input
                  id="plan-objetivo"
                  aria-label="Objetivo del plan"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Ej: Prevenir violencia en recreos"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium text-slate-700"
                  htmlFor="plan-accion"
                >
                  Acción *
                </label>
                <textarea
                  id="plan-accion"
                  aria-label="Acción preventiva"
                  value={accion}
                  onChange={(e) => setAccion(e.target.value)}
                  rows={2}
                  placeholder="Talleres, turnos, campañas, protocolos"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    className="text-xs font-medium text-slate-700"
                    htmlFor="plan-resp"
                  >
                    Responsable
                  </label>
                  <input
                    id="plan-resp"
                    aria-label="Responsable"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    placeholder="Convivencia / Inspectoría"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium text-slate-700"
                    htmlFor="plan-find"
                  >
                    Fecha límite
                  </label>
                  <input
                    id="plan-find"
                    aria-label="Fecha límite"
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium text-slate-700"
                    htmlFor="plan-ind"
                  >
                    Indicador
                  </label>
                  <input
                    id="plan-ind"
                    aria-label="Indicador"
                    value={indicador}
                    onChange={(e) => setIndicador(e.target.value)}
                    placeholder="Ej: % asistencia talleres"
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
        </details>
      </div>

      <div className="space-y-3">
        {q.isLoading && (
          <p className="text-xs text-slate-500">Cargando plan {ano}…</p>
        )}
        {rows.length === 0 && !q.isLoading && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Sin acciones para {ano}. Agrega la primera acción del Plan de
            Gestión.
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-slate-900">
                  {r.objetivo}
                </h4>
                <p className="mt-1 text-xs text-slate-600">{r.accion}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {r.responsable && <span>{r.responsable}</span>}
                  {r.fecha_fin && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5" /> {r.fecha_fin}
                    </span>
                  )}
                  {r.indicador && <span>Indicador: {r.indicador}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(r.id)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar acción"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoTone[r.estado]}`}
              >
                {estadoLabel[r.estado]}
              </span>
              <select
                value={r.estado}
                onChange={(e) =>
                  void handleUpdate(r.id, {
                    estado: e.target.value as PlanGestionEstado,
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
              {r.evidencia_nombre && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-11px text-sky-700">
                  <File className="size-3" /> {r.evidencia_nombre}
                </span>
              )}
            </div>
            {r.estado === "cumplido" && !r.indicador && (
              <p className="mt-2 flex items-center gap-1 text-11px text-amber-700">
                <CheckCircle2 className="size-3.5" /> Cumplido — registra
                evidencia para cerrar el ciclo.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
