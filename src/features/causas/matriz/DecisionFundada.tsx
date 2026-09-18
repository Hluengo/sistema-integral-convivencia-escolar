/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from "react";
import { Check, Circle, Gavel } from "lucide-react";
import type { HechoRow } from "@/shared/api/services/hechos.service";
import { updateHecho } from "@/shared/api/services/hechos.service";
import { getDecisionSteps } from "@/shared/lib/decisionFundada";
import Button from "@/shared/ui/Button";

interface DecisionFundadaProps {
  hecho: HechoRow;
  evidenciasCount: number;
  medidasPermitidas: string[];
  calificacionPresente: boolean;
  annotationsCount: number;
  onSaved: () => void;
}

export default function DecisionFundada({
  hecho,
  evidenciasCount,
  medidasPermitidas,
  calificacionPresente,
  annotationsCount,
  onSaved,
}: DecisionFundadaProps) {
  const steps = getDecisionSteps({
    hecho,
    evidenciasCount,
    medidasPermitidasCount: medidasPermitidas.length,
    calificacionPresente,
  });
  const completadas = steps.filter((s) => s.completa).length;

  const [medida, setMedida] = useState(hecho.medida_seleccionada ?? "");
  const [analisis, setAnalisis] = useState(hecho.analisis_proporcionalidad);
  const [decision, setDecision] = useState(hecho.decision_fundada);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const puedeGuardar =
    hecho.estado === "acreditado" && hecho.participacion_acreditada;

  const handleSave = async () => {
    if (decision.trim() && !medida) {
      setError("Selecciona la medida antes de guardar la decisión.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    const ok = await updateHecho(hecho.id, {
      medida_seleccionada: medida || null,
      analisis_proporcionalidad: analisis.trim(),
      decision_fundada: decision.trim(),
    });
    setBusy(false);
    if (!ok) {
      setError("No se pudo guardar. Verifica tu sesión.");
      return;
    }
    setSaved(true);
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-semibold text-xs text-slate-700">
          <Gavel className="size-3.5 text-brand-600" aria-hidden="true" />
          Decisión fundada {completadas}/{steps.length}
        </p>
      </div>

      <ol className="grid gap-1 sm:grid-cols-2">
        {steps.map((s) => (
          <li
            key={s.id}
            className={`flex items-center gap-1.5 text-11px ${
              s.completa ? "text-slate-700" : "text-slate-400"
            }`}
          >
            {s.completa ? (
              <Check
                className="size-3.5 shrink-0 text-green-600"
                aria-hidden="true"
              />
            ) : (
              <Circle
                className="size-3.5 shrink-0 text-slate-300"
                aria-hidden="true"
              />
            )}
            <span className={s.completa ? "font-medium" : undefined}>
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-11px text-slate-600">
        Hoja de vida pertinente: {annotationsCount} anotacione(s). Se usa solo
        para fundar la medida, no acredita el hecho investigado.
      </p>

      {!puedeGuardar ? (
        <p className="text-xs text-slate-500">
          Acredita el hecho y la participación para registrar la decisión.
        </p>
      ) : (
        <div className="space-y-2.5">
          <div>
            <label
              htmlFor={`medida-${hecho.id}`}
              className="font-semibold text-xs text-slate-700"
            >
              Medida seleccionada
            </label>
            <select
              id={`medida-${hecho.id}`}
              value={medida}
              onChange={(e) => setMedida(e.target.value)}
              disabled={medidasPermitidas.length === 0}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-50"
            >
              <option value="">Seleccionar medida…</option>
              {medidasPermitidas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor={`analisis-${hecho.id}`}
              className="font-semibold text-xs text-slate-700"
            >
              Análisis de proporcionalidad
            </label>
            <textarea
              id={`analisis-${hecho.id}`}
              aria-label="Análisis de proporcionalidad"
              value={analisis}
              onChange={(e) => setAnalisis(e.target.value)}
              rows={2}
              placeholder="Cómo se ponderaron gravedad, participación, hoja de vida, atenuantes, agravantes y descargos"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs placeholder:text-slate-400"
            />
          </div>
          <div>
            <label
              htmlFor={`decision-${hecho.id}`}
              className="font-semibold text-xs text-slate-700"
            >
              Decisión fundada
            </label>
            <textarea
              id={`decision-${hecho.id}`}
              aria-label="Decisión fundada"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              rows={2}
              placeholder="Decisión y su fundamento en hechos acreditados y norma RICE"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs placeholder:text-slate-400"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-xs text-green-700">
              Decisión guardada en el expediente.
            </p>
          )}
          <Button
            variant="custom"
            onClick={() => void handleSave()}
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 font-semibold text-white text-xs hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar decisión"}
          </Button>
        </div>
      )}
    </div>
  );
}
