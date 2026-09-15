/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
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
  const [showForm, setShowForm] = useState(hechos.length === 0);

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
    setShowForm(false);
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

  const audit = auditarExpediente(causa, hechos, vinculos);

  return (
    <div className="space-y-4">
      {/* Auditoría — colapsable */}
      <details className="group rounded-xl border border-slate-200 bg-white shadow-xs">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
          <span className="flex items-center gap-2 font-semibold text-sm text-slate-900">
            <Shield className="size-4 text-brand-600" />
            Auditoría {audit.verificadas}/{audit.total}
            {!audit.puedeCerrar && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-10px font-bold text-amber-800">
                Revisar
              </span>
            )}
            {audit.puedeCerrar && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-10px font-bold text-green-700">
                Al día
              </span>
            )}
          </span>
          <ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 p-3">
          <AuditoriaPanel causa={causa} hechos={hechos} vinculos={vinculos} />
        </div>
      </details>

      {/* IA auditora — solo si bloquea */}
      {!audit.puedeCerrar && audit.bloqueantes > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
          <p className="font-semibold">Asistente de revisión</p>
          <p className="mt-1 text-slate-300">{audit.advertencias[0]}</p>
          <p className="mt-1 text-11px text-slate-400">
            La IA audita el debido proceso, no sanciona.
          </p>
        </div>
      )}

      {/* Nuevo hecho — colapsable */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex w-full items-center justify-between gap-2 p-3 text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-sm text-slate-900">
            <FileStack className="size-4 text-brand-600" /> Nuevo hecho
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            {showForm ? "Ocultar" : "Agregar"}
            <ChevronDown
              className={`size-4 transition ${showForm ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        {showForm && (
          <div className="border-t border-slate-100 p-3">
            <p className="text-xs text-slate-500">
              Registra el hecho denunciado. Luego acredita y vincula
              evidencia/RICE.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label
                  className="text-xs font-medium text-slate-700"
                  htmlFor="hecho-titulo"
                >
                  Título *
                </label>
                <input
                  id="hecho-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Agresión física en patio"
                  aria-label="Título del hecho"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium text-slate-700"
                  htmlFor="hecho-rice"
                >
                  Artículo RICE
                </label>
                <input
                  id="hecho-rice"
                  value={rice}
                  onChange={(e) => setRice(e.target.value)}
                  placeholder="Art. 18.c — Agresión física"
                  aria-label="Artículo RICE"
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
                  placeholder="Breve relato, fecha/lugar"
                  aria-label="Descripción del hecho"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
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
        )}
      </div>

      {/* Lista hechos — compacta */}
      <div className="space-y-3">
        {hechosQuery.isLoading && (
          <p className="text-xs text-slate-500">Cargando hechos…</p>
        )}
        {hechos.length === 0 && !hechosQuery.isLoading && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            Sin hechos. Agrega el primero para iniciar la trazabilidad.
          </p>
        )}
        {hechos.map((hecho) => {
          const evidenciasDeHecho = vinculos.filter(
            (v) => v.hecho_id === hecho.id,
          );
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
            <details
              key={hecho.id}
              className="group rounded-xl border border-slate-200 bg-white shadow-xs open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <h4 className="truncate font-semibold text-sm text-slate-900">
                    {hecho.titulo}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-10px font-semibold ${estadoTone[hecho.estado]}`}
                    >
                      {estadoLabel[hecho.estado]}
                    </span>
                    {hecho.rice_articulo && (
                      <span className="text-10px text-slate-500">
                        RICE: {hecho.rice_articulo}
                      </span>
                    )}
                    {evidenciasDeHecho.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-10px text-slate-500">
                        <Link2 className="size-3" /> {evidenciasDeHecho.length}{" "}
                        evid.
                      </span>
                    )}
                  </div>
                </div>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDelete(hecho.id);
                    }}
                    className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" />
                </span>
              </summary>

              <div className="border-t border-slate-100 p-3">
                {hecho.descripcion && (
                  <p className="text-xs text-slate-600">{hecho.descripcion}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={hecho.estado}
                    onChange={(e) =>
                      void handleUpdateEstado(
                        hecho,
                        e.target.value as HechoEstado,
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    aria-label="Estado"
                  >
                    {Object.entries(estadoLabel).map(([val, lab]) => (
                      <option key={val} value={val}>
                        {lab}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-11px">
                    <input
                      type="checkbox"
                      checked={hecho.participacion_acreditada}
                      onChange={() => void handleToggleParticipacion(hecho)}
                      className="size-3"
                      aria-label="Participación"
                    />
                    Participación
                  </label>
                </div>

                {/* Evidencias — resumido */}
                <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60">
                  <summary className="cursor-pointer list-none p-2.5 text-xs font-semibold text-slate-700">
                    Evidencias ({evidenciasDeHecho.length}) —{" "}
                    {evidenciasDeHecho.length ? "vinculadas" : "sin vincular"}
                  </summary>
                  <div className="border-t border-slate-200 bg-white p-2.5">
                    {evidenciasDeHecho.length > 0 ? (
                      <ul className="space-y-1">
                        {evidenciasDeHecho.map((ev) => (
                          <li
                            key={ev.id}
                            className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                          >
                            <span className="truncate">
                              {ev.evidencia_nombre || ev.evidencia_path}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleUnlink(ev.id)}
                              className="flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                              aria-label="Desvincular"
                            >
                              <Unlink className="size-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Sin evidencias vinculadas.
                      </p>
                    )}
                    {anexos.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        <select
                          id={`ev-select-${hecho.id}`}
                          defaultValue=""
                          className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                          aria-label="Anexo"
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
                            if (sel?.value)
                              void handleLink(hecho.id, sel.value);
                          }}
                          className="shrink-0 rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                        >
                          Vincular
                        </Button>
                      </div>
                    )}
                  </div>
                </details>

                {/* Proporcionalidad — colapsado */}
                <details className="mt-3 rounded-lg border border-brand-100 bg-brand-50/40">
                  <summary className="cursor-pointer list-none p-2.5 text-xs font-semibold text-brand-800">
                    Proporcionalidad —{" "}
                    {result.medidasPermitidas.length
                      ? `${result.medidasPermitidas.length} medidas`
                      : "sin medidas"}
                  </summary>
                  <div className="border-t border-brand-100 bg-white p-2.5">
                    {hecho.estado !== "acreditado" ? (
                      <p className="text-xs text-slate-500">
                        Acredita el hecho y la participación para ver medidas.
                      </p>
                    ) : (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <p className="text-10px font-semibold uppercase tracking-wide text-slate-500">
                              Agravantes
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {AGRAVANTES.map((a) => (
                                <label
                                  key={a.id}
                                  className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-11px ${agravantes.includes(a.id as AgravanteId) ? "border-amber-300 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}
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
                            <p className="text-10px font-semibold uppercase tracking-wide text-slate-500">
                              Atenuantes
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {ATENUANTES.map((a) => (
                                <label
                                  key={a.id}
                                  className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-11px ${atenuantes.includes(a.id as AtenuanteId) ? "border-green-300 bg-green-100 text-green-800" : "border-slate-200 bg-white text-slate-600"}`}
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
                        <div className="mt-2 rounded border border-slate-200 bg-white p-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Medidas permitidas
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {result.medidasPermitidas.map((m) => (
                              <span
                                key={m}
                                className={`rounded-full border px-2 py-0.5 text-11px ${m === result.recomendada ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
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
                </details>
              </div>
            </details>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-10px text-slate-400">
        <Scale className="size-3" /> Caso colectivo: una evidencia puede
        vincularse a varios hechos vía incidente.
      </p>
    </div>
  );
}
