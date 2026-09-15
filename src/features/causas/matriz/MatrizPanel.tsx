/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileStack,
  Link2,
  Scale,
  Shield,
  Trash2,
  Unlink,
} from "lucide-react";
import type { Causa } from "@/shared/lib/types";
import Button from "@/shared/ui/Button";
import {
  createHecho,
  deleteHecho,
  fetchHechoEvidencias,
  fetchHechos,
  linkEvidencia,
  unlinkEvidencia,
  updateHecho,
  type HechoEstado,
  type HechoRow,
} from "@/shared/api/services/hechos.service";
import { useAuthStore } from "@/shared/lib/stores/authStore";
import { listExpedienteAnexos } from "../expediente/expedienteBuilders";
import {
  AGRAVANTES,
  ATENUANTES,
  calcularMedidasPermitidas,
  type AgravanteId,
  type AtenuanteId,
} from "@/shared/lib/proporcionalidad";
import AuditoriaPanel from "./AuditoriaPanel";
import { auditarExpediente } from "@/shared/lib/auditoria";

const estadoLabel: Record<HechoEstado, string> = {
  denunciado: "Denunciado",
  acreditado: "Acreditado",
  parcial: "Parcial",
  no_acreditado: "No acreditado",
};

const estadoTone: Record<HechoEstado, string> = {
  denunciado: "bg-slate-100 text-slate-700 border-slate-200",
  acreditado: "bg-green-100 text-green-800 border-green-200",
  parcial: "bg-amber-100 text-amber-800 border-amber-200",
  no_acreditado: "bg-red-100 text-red-800 border-red-200",
};

export default function MatrizPanel({ causa }: { causa: Causa }) {
  const tenantId = useAuthStore((s) => s.tenantId);
  const queryClient = useQueryClient();
  const hechosKey = useMemo(
    () => ["hechos", causa.id, tenantId] as const,
    [causa.id, tenantId],
  );
  const evidenciasKey = useMemo(
    () => ["hecho_evidencias", causa.id, tenantId] as const,
    [causa.id, tenantId],
  );

  const hechosQuery = useQuery({
    queryKey: hechosKey,
    queryFn: () => fetchHechos(causa.id),
    enabled: Boolean(causa.id),
  });

  const evidenciasQuery = useQuery({
    queryKey: evidenciasKey,
    queryFn: () => fetchHechoEvidencias(causa.id),
    enabled: Boolean(causa.id),
  });

  const hechos = hechosQuery.data ?? [];
  const vinculos = evidenciasQuery.data ?? [];
  const anexos = useMemo(() => listExpedienteAnexos(causa), [causa]);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [rice, setRice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: hechosKey });
    void queryClient.invalidateQueries({ queryKey: evidenciasKey });
  }, [evidenciasKey, hechosKey, queryClient]);

  const handleCreate = useCallback(async () => {
    if (titulo.trim().length < 4) {
      setError("El título debe tener al menos 4 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    const row = await createHecho({
      causaId: causa.id,
      incidenteId: causa.incidenteId ?? null,
      titulo,
      descripcion,
      riceArticulo: rice || null,
    });
    setBusy(false);
    if (!row) {
      setError("No se pudo crear el hecho. Verifica tu sesión.");
      return;
    }
    setTitulo("");
    setDescripcion("");
    setRice("");
    invalidate();
  }, [causa.id, causa.incidenteId, descripcion, invalidate, rice, titulo]);

  const handleUpdateEstado = useCallback(
    async (hecho: HechoRow, estado: HechoEstado) => {
      const ok = await updateHecho(hecho.id, { estado });
      if (ok) invalidate();
    },
    [invalidate],
  );

  const handleToggleParticipacion = useCallback(
    async (hecho: HechoRow) => {
      const ok = await updateHecho(hecho.id, {
        participacion_acreditada: !hecho.participacion_acreditada,
      });
      if (ok) invalidate();
    },
    [invalidate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteHecho(id);
      if (ok) invalidate();
    },
    [invalidate],
  );

  const handleLink = useCallback(
    async (hechoId: string, path: string) => {
      if (!path) return;
      const nombre = path.split("/").pop() ?? path;
      const ok = await linkEvidencia({
        hechoId,
        causaId: causa.id,
        evidenciaPath: path,
        evidenciaNombre: nombre,
      });
      if (ok) invalidate();
    },
    [causa.id, invalidate],
  );

  const handleUnlink = useCallback(
    async (id: string) => {
      const ok = await unlinkEvidencia(id);
      if (ok) invalidate();
    },
    [invalidate],
  );

  const toggleAgravante = useCallback(
    async (hecho: HechoRow, id: AgravanteId) => {
      const current = (hecho.agravantes ?? []) as AgravanteId[];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      const ok = await updateHecho(hecho.id, {
        agravantes: next as unknown as string[],
      });
      if (ok) invalidate();
    },
    [invalidate],
  );

  const toggleAtenuante = useCallback(
    async (hecho: HechoRow, id: AtenuanteId) => {
      const current = (hecho.atenuantes ?? []) as AtenuanteId[];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      const ok = await updateHecho(hecho.id, {
        atenuantes: next as unknown as string[],
      });
      if (ok) invalidate();
    },
    [invalidate],
  );

  // Auditoría mínima
  const sinEvidencia = hechos.filter(
    (h) =>
      h.estado === "acreditado" && !vinculos.some((v) => v.hecho_id === h.id),
  );
  const sinRice = hechos.filter(
    (h) => h.estado === "acreditado" && !h.rice_articulo,
  );
  const denunciadoSinResolver = hechos.filter((h) => h.estado === "denunciado");

  return (
    <div className="space-y-4">
      <AuditoriaPanel causa={causa} hechos={hechos} vinculos={vinculos} />
      {(() => {
        const a = auditarExpediente(causa, hechos, vinculos);
        if (a.puedeCerrar || a.bloqueantes === 0) return null;
        return (
          <div className="rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
            <p className="font-semibold">Asistente de revisión (IA auditora)</p>
            <p className="mt-1 text-slate-300">
              La medida seleccionada requiere fundamentación adicional.{" "}
              {a.advertencias[0] ?? "Complete la trazabilidad antes de cerrar."}
            </p>
            <p className="mt-1 text-11px text-slate-400">
              La IA no sanciona — audita el debido proceso.
            </p>
          </div>
        );
      })()}

      {/* Auditoría rápida matriz (compat) */}
      {(sinEvidencia.length > 0 ||
        sinRice.length > 0 ||
        denunciadoSinResolver.length > 0) && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-4" /> Revisión de matriz
          </p>
          <ul className="mt-1 list-disc pl-5">
            {sinEvidencia.length > 0 && (
              <li>
                {sinEvidencia.length} hecho(s) acreditado(s) sin evidencia
                vinculada.
              </li>
            )}
            {sinRice.length > 0 && (
              <li>
                {sinRice.length} hecho(s) acreditado(s) sin artículo RICE.
              </li>
            )}
            {denunciadoSinResolver.length > 0 && (
              <li>
                {denunciadoSinResolver.length} hecho(s) aún denunciado(s) por
                calificar.
              </li>
            )}
          </ul>
          <p className="mt-1 text-11px text-amber-700">
            No se debe cerrar el expediente si quedan hechos sin trazabilidad
            completa.
          </p>
        </div>
      )}

      {/* Form nuevo hecho */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="flex items-center gap-2 font-semibold text-sm text-slate-900">
          <FileStack className="size-4 text-brand-600" /> Nuevo hecho
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Registra cada hecho denunciado. Luego acredita, vincula evidencia y
          artículo RICE.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor="hecho-titulo"
            >
              Título del hecho *
            </label>
            <input
              id="hecho-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Agresión física en patio durante recreo"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor="hecho-desc"
            >
              Descripción
            </label>
            <textarea
              id="hecho-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Relato breve, fecha/hora/lugar si aplica"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor="hecho-rice"
            >
              Artículo RICE (opcional)
            </label>
            <input
              id="hecho-rice"
              value={rice}
              onChange={(e) => setRice(e.target.value)}
              placeholder="Ej: Art. 18.c — Agresión física"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <Button
            onClick={() => void handleCreate()}
            disabled={busy}
            variant="custom"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Agregar hecho"}
          </Button>
        </div>
      </div>

      {/* Lista hechos */}
      <div className="space-y-3">
        {hechosQuery.isLoading && (
          <p className="text-xs text-slate-500">Cargando hechos…</p>
        )}
        {hechos.length === 0 && !hechosQuery.isLoading && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            Aún no hay hechos. Agrega el primero para iniciar la trazabilidad.
          </p>
        )}
        {hechos.map((hecho) => {
          const evidenciasDeHecho = vinculos.filter(
            (v) => v.hecho_id === hecho.id,
          );
          return (
            <div
              key={hecho.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900">
                    {hecho.titulo}
                  </h4>
                  {hecho.descripcion && (
                    <p className="mt-1 text-xs text-slate-600">
                      {hecho.descripcion}
                    </p>
                  )}
                  {hecho.rice_articulo && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                      <Scale className="size-3.5 text-slate-500" /> RICE:{" "}
                      {hecho.rice_articulo}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(hecho.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar hecho"
                  title="Eliminar hecho"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoTone[hecho.estado]}`}
                >
                  <CheckCircle2 className="size-3" />{" "}
                  {estadoLabel[hecho.estado]}
                </span>
                <label className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={hecho.participacion_acreditada}
                    onChange={() => void handleToggleParticipacion(hecho)}
                    className="size-3 rounded border-slate-300"
                  />
                  Participación acreditada
                </label>
                <select
                  value={hecho.estado}
                  onChange={(e) =>
                    void handleUpdateEstado(
                      hecho,
                      e.target.value as HechoEstado,
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  aria-label="Cambiar estado del hecho"
                >
                  {Object.entries(estadoLabel).map(([val, lab]) => (
                    <option key={val} value={val}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>

              {/* Evidencias vinculadas */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Link2 className="size-3.5" /> Evidencias (
                  {evidenciasDeHecho.length})
                </p>
                {evidenciasDeHecho.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {evidenciasDeHecho.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        <span className="truncate">
                          {ev.evidencia_nombre || ev.evidencia_path}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleUnlink(ev.id)}
                          className="flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Desvincular evidencia"
                        >
                          <Unlink className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Sin evidencias vinculadas.
                  </p>
                )}

                {/* Selector anexo */}
                {anexos.length > 0 ? (
                  <div className="mt-2 flex gap-2">
                    <select
                      id={`ev-select-${hecho.id}`}
                      defaultValue=""
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                      aria-label="Seleccionar evidencia"
                    >
                      <option value="" disabled>
                        Seleccionar anexo…
                      </option>
                      {anexos.map((a) => (
                        <option
                          key={`${a.origen}:${a.refId}:${a.path}`}
                          value={a.path}
                        >
                          [{a.origen}] {a.nombre}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="custom"
                      onClick={() => {
                        const sel = document.getElementById(
                          `ev-select-${hecho.id}`,
                        ) as HTMLSelectElement | null;
                        if (sel?.value) void handleLink(hecho.id, sel.value);
                      }}
                      className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50"
                    >
                      Vincular
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-11px text-slate-500">
                    No hay anexos en checklist/bitácora para vincular. Sube un
                    documento primero.
                  </p>
                )}
              </div>

              {/* Motor proporcionalidad */}
              {(() => {
                const agravantes = (hecho.agravantes ?? []) as AgravanteId[];
                const atenuantes = (hecho.atenuantes ?? []) as AtenuanteId[];
                const result = calcularMedidasPermitidas({
                  tipoInfraccion: causa.tipoInfraccion,
                  estado: hecho.estado,
                  participacionAcreditada: hecho.participacion_acreditada,
                  agravantes,
                  atenuantes,
                  annotationsCount:
                    (causa as unknown as { annotations_count?: number })
                      .annotations_count ?? 0,
                  comprometeAulaSegura: causa.comprometeAulaSegura,
                });
                return (
                  <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
                      <Shield className="size-3.5" /> Proporcionalidad — medidas
                      posibles
                    </p>
                    {hecho.estado !== "acreditado" ? (
                      <p className="mt-1 text-xs text-slate-600">
                        Acredita el hecho y la participación para habilitar el
                        motor.
                      </p>
                    ) : (
                      <>
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-11px font-semibold uppercase tracking-wide text-slate-500">
                              Agravantes
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {AGRAVANTES.map((a) => (
                                <label
                                  key={a.id}
                                  className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-11px ${agravantes.includes(a.id as AgravanteId) ? "border-amber-300 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={agravantes.includes(
                                      a.id as AgravanteId,
                                    )}
                                    onChange={() =>
                                      void toggleAgravante(
                                        hecho,
                                        a.id as AgravanteId,
                                      )
                                    }
                                    className="size-3"
                                    aria-label={a.label}
                                  />
                                  {a.label}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-11px font-semibold uppercase tracking-wide text-slate-500">
                              Atenuantes
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {ATENUANTES.map((a) => (
                                <label
                                  key={a.id}
                                  className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-11px ${atenuantes.includes(a.id as AtenuanteId) ? "border-green-300 bg-green-100 text-green-800" : "border-slate-200 bg-white text-slate-600"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={atenuantes.includes(
                                      a.id as AtenuanteId,
                                    )}
                                    onChange={() =>
                                      void toggleAtenuante(
                                        hecho,
                                        a.id as AtenuanteId,
                                      )
                                    }
                                    className="size-3"
                                    aria-label={a.label}
                                  />
                                  {a.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
                          <p className="text-xs font-semibold text-slate-700">
                            Medidas permitidas por RICE (
                            {result.medidasPermitidas.length})
                          </p>
                          {result.medidasPermitidas.length === 0 ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Sin medidas — revisa estado y participación.
                            </p>
                          ) : (
                            <ul className="mt-1 flex flex-wrap gap-1.5">
                              {result.medidasPermitidas.map((m) => (
                                <li
                                  key={m}
                                  className={`rounded-full border px-2 py-0.5 text-xs ${m === result.recomendada ? "border-brand-600 bg-brand-600 text-white font-semibold" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                                >
                                  {m}
                                </li>
                              ))}
                            </ul>
                          )}
                          {result.recomendada && (
                            <p className="mt-1 text-11px text-brand-700">
                              Sugerida: <strong>{result.recomendada}</strong> —{" "}
                              {result.fundamento}
                            </p>
                          )}
                          {result.advertencias.length > 0 && (
                            <ul className="mt-1 list-disc pl-4 text-11px text-amber-700">
                              {result.advertencias.map((w) => (
                                <li key={w}>{w}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-11px text-slate-500">
        <Scale className="size-3.5" /> Caso colectivo: una misma evidencia puede
        vincularse a hechos de varios estudiantes vía `incidente_id` compartido.
      </p>
    </div>
  );
}
